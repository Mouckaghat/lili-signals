/**
 * scripts/sync-fixture-results.ts
 *
 * Fetches WC 2026 fixture results (status, scores, winner) from api-football.com
 * and regenerates lib/fixtureResultsData.ts.
 *
 * Only non-SCHEDULED fixtures are written to the map — SCHEDULED entries
 * are omitted so the app falls back to WC_FIXTURES for those.
 *
 * Usage:
 *   npx tsx scripts/sync-fixture-results.ts          # live write
 *   DRY_RUN=true npx tsx scripts/sync-fixture-results.ts  # preview only
 *
 * Called by: .github/workflows/sync-fixture-results.yml (every 10 min during match windows)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { WC_FIXTURES } from '../lib/wcData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_KEY   = process.env.API_FOOTBALL_KEY ?? process.env.API_KEY;
const DRY_RUN   = process.env.DRY_RUN === 'true';
const LEAGUE_ID = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1);
const SEASON    = Number(process.env.API_FOOTBALL_SEASON ?? 2026);
const OUT_PATH  = path.resolve(__dirname, '..', 'lib', 'fixtureResultsData.ts');

// ─── API types ────────────────────────────────────────────────────────────────

interface ApiFixture {
  fixture: {
    id: number;
    status: { short: string };
  };
  teams: {
    home: { name: string; winner: boolean | null };
    away: { name: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

// ─── Team name normalisation ──────────────────────────────────────────────────
// Maps api-football names → wcData.ts names (WC_FIXTURES home/away).

const TEAM_NAME_MAP: Record<string, string> = {
  // AFC
  'Korea Republic':       'South Korea',
  'IR Iran':              'Iran',
  // CAF
  "Côte d'Ivoire":        'Ivory Coast',
  'Cape Verde':           'Cape Verde Islands',
  'DR Congo':             'Congo DR',
  // CONCACAF
  'United States':        'USA',
  'Curacao':              'Curaçao',
  // UEFA
  'Turkey':               'Türkiye',
  'Czechia':              'Czech Republic',
  'Bosnia':               'Bosnia & Herzegovina',
  'Bosnia-Herzegovina':   'Bosnia & Herzegovina',
};

function normalise(apiName: string): string {
  return TEAM_NAME_MAP[apiName] ?? apiName;
}

// ─── Status mapping ───────────────────────────────────────────────────────────

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const DONE_STATUSES = new Set(['FT', 'AET', 'PEN']);

type FixtureStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED';

function mapStatus(short: string): FixtureStatus {
  if (LIVE_STATUSES.has(short)) return 'LIVE';
  if (DONE_STATUSES.has(short)) return 'FINISHED';
  return 'SCHEDULED';
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchFixtures(): Promise<ApiFixture[]> {
  if (!API_KEY) throw new Error('API_FOOTBALL_KEY not set');

  const url = `https://v3.football.api-sports.io/fixtures?league=${LEAGUE_ID}&season=${SEASON}`;
  const res = await fetch(url, {
    headers: {
      'x-apisports-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!res.ok) throw new Error(`API HTTP ${res.status}`);

  const data = await res.json() as { errors?: unknown; response: ApiFixture[] };

  if (data.errors && Object.keys(data.errors as object).length > 0) {
    throw new Error(`api-football error: ${JSON.stringify(data.errors)}`);
  }

  return data.response ?? [];
}

// ─── Build result map ─────────────────────────────────────────────────────────

interface ResultEntry {
  status:    FixtureStatus;
  homeScore: number | null;
  awayScore: number | null;
  winner:    string | null;
}

function buildMap(apiFixtures: ApiFixture[]): Map<string, ResultEntry> {
  // Build lookup: "HomeTeam|AwayTeam" → WCFixture  (our canonical key)
  const knownKeys = new Set(WC_FIXTURES.map((f) => `${f.home}|${f.away}`));

  const results = new Map<string, ResultEntry>();

  for (const af of apiFixtures) {
    const home   = normalise(af.teams.home.name);
    const away   = normalise(af.teams.away.name);
    const key    = `${home}|${away}`;
    const status = mapStatus(af.fixture.status.short);

    // Only track fixtures we know about and that have progressed
    if (!knownKeys.has(key)) continue;
    if (status === 'SCHEDULED') continue;

    let winner: string | null = null;
    if (status === 'FINISHED' || status === 'LIVE') {
      if (af.teams.home.winner === true)  winner = home;
      if (af.teams.away.winner === true)  winner = away;
      if (af.teams.home.winner === false && af.teams.away.winner === false) winner = 'Draw';
    }

    // Never downgrade a FINISHED result to LIVE (API may return duplicate entries in different order)
    const existing = results.get(key);
    if (existing?.status === 'FINISHED' && status !== 'FINISHED') continue;

    results.set(key, {
      status,
      homeScore: af.goals.home,
      awayScore: af.goals.away,
      winner,
    });
  }

  return results;
}

// ─── Code generation ──────────────────────────────────────────────────────────

function q(v: string | null): string {
  return v === null ? 'null' : `'${v}'`;
}

function generateFile(results: Map<string, ResultEntry>, updatedAt: string): string {
  const entries = Array.from(results.entries())
    .map(([key, r]) => {
      const hs = r.homeScore === null ? 'null' : String(r.homeScore);
      const as = r.awayScore === null ? 'null' : String(r.awayScore);
      return `  ${JSON.stringify(key)}: { status: '${r.status}', homeScore: ${hs}, awayScore: ${as}, winner: ${q(r.winner)} },`;
    })
    .join('\n');

  return `// Auto-generated by scripts/sync-fixture-results.ts — do not edit manually.
// Refreshed every 10 minutes during match windows via GitHub Actions.

export type FixtureStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED';

export interface FixtureResult {
  status:    FixtureStatus;
  homeScore: number | null;
  awayScore: number | null;
  winner:    string | null; // winning team name, 'Draw', or null
}

// Keyed by "HomeTeam|AwayTeam" — matches WC_FIXTURES home|away exactly.
// Only contains entries for fixtures that are LIVE or FINISHED.
export const FIXTURE_RESULTS: Record<string, FixtureResult> = {
${entries}
};

export const FIXTURE_RESULTS_LAST_UPDATED = '${updatedAt}';
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n⚽  Syncing WC 2026 fixture results (league=${LEAGUE_ID}, season=${SEASON})…`);

  let apiFixtures: ApiFixture[] = [];
  try {
    apiFixtures = await fetchFixtures();
    console.log(`  ✓  ${apiFixtures.length} fixtures received from API`);
  } catch (err) {
    console.warn(`  ⚠️  Fetch failed: ${err}. Leaving lib/fixtureResultsData.ts untouched.`);
    return;
  }

  const results = buildMap(apiFixtures);

  const finished = [...results.values()].filter((r) => r.status === 'FINISHED').length;
  const live     = [...results.values()].filter((r) => r.status === 'LIVE').length;
  console.log(`  ✓  ${results.size} non-scheduled fixtures mapped (${finished} finished, ${live} live)`);

  if (DRY_RUN) {
    for (const [key, r] of results) {
      console.log(`     ${r.status.padEnd(10)} ${key.padEnd(40)} ${r.homeScore ?? '?'} – ${r.awayScore ?? '?'}  ${r.winner ?? ''}`);
    }
    console.log('\n  DRY RUN — no file written.\n');
    return;
  }

  // Never overwrite curated results with an empty map (e.g. transient API hiccup
  // that still returned 200 but no rows) — leave the committed file untouched.
  if (results.size === 0) {
    console.warn('  ⚠️  No results built — leaving lib/fixtureResultsData.ts untouched.');
    return;
  }

  const now     = new Date().toISOString();
  const content = generateFile(results, now);
  fs.writeFileSync(OUT_PATH, content, 'utf8');
  console.log(`\n  ✓  Written to lib/fixtureResultsData.ts (${now})\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
