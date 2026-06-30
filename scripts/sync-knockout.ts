/**
 * scripts/sync-knockout.ts
 *
 * Fetches the WC 2026 KNOCKOUT fixtures (Round of 32 → Final) from
 * api-football.com and regenerates lib/knockoutData.ts.
 *
 * The knockout bracket is a SEPARATE array (WC_KNOCKOUT) from the group-stage
 * WC_FIXTURES on purpose: every tournament model (homeEdge, simulation,
 * standings, attack zones…) iterates WC_FIXTURES, and knockout games must not
 * silently skew those group-stage aggregates. Only the timeline, the bracket
 * view and the prediction game read WC_KNOCKOUT.
 *
 * Ties seed progressively: Round of 32 exists once the groups finish, then
 * R16/QF/SF/Final appear as winners are decided — this bot picks each up the
 * moment the feed publishes it. Live scores still flow through the existing
 * /api/fixture-results overlay (keyed home|away), so this file is the fixture
 * list + a baked status snapshot, not the live source of truth.
 *
 * Usage:
 *   npx tsx scripts/sync-knockout.ts              # live write
 *   DRY_RUN=true npx tsx scripts/sync-knockout.ts # preview only
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { FIXTURE_STADIUM_ID } from '../lib/stadiumData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_KEY   = process.env.API_FOOTBALL_KEY ?? process.env.API_KEY;
const DRY_RUN   = process.env.DRY_RUN === 'true';
const LEAGUE_ID = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1);
const SEASON    = Number(process.env.API_FOOTBALL_SEASON ?? 2026);
const OUT_PATH  = path.resolve(__dirname, '..', 'lib', 'knockoutData.ts');

// ─── API types ────────────────────────────────────────────────────────────────

interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
    venue: { name: string | null; city: string | null };
  };
  league: { round: string };
  teams: {
    home: { name: string; winner: boolean | null };
    away: { name: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

// ─── Team name normalisation (mirror sync-fixture-results.ts) ────────────────────

const TEAM_NAME_MAP: Record<string, string> = {
  'Korea Republic':       'South Korea',
  'IR Iran':              'Iran',
  "Côte d'Ivoire":        'Ivory Coast',
  'Cape Verde':           'Cape Verde Islands',
  'DR Congo':             'Congo DR',
  'United States':        'USA',
  'Curacao':              'Curaçao',
  'Turkey':               'Türkiye',
  'Czechia':              'Czech Republic',
  'Bosnia':               'Bosnia & Herzegovina',
  'Bosnia-Herzegovina':   'Bosnia & Herzegovina',
};

function normalise(apiName: string): string {
  return TEAM_NAME_MAP[apiName] ?? apiName;
}

// ─── Venue normalisation ────────────────────────────────────────────────────────
// Map the feed's venue name → our curated stadium id. The feed uses Azteca's
// 2026 sponsor name; alias it back so we keep the curated capacity/altitude/temp.
const VENUE_ALIAS: Record<string, string> = {
  'Estadio Banorte': 'Estadio Azteca',
};

function venueId(name: string | null): string | null {
  if (!name) return null;
  const canonical = VENUE_ALIAS[name] ?? name;
  return FIXTURE_STADIUM_ID[canonical] ?? null;
}

// ─── Round mapping ──────────────────────────────────────────────────────────────

type KnockoutRound = 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'F';

// Order matters: "Quarter-finals" contains "finals", so test specific labels
// before the bare "Final".
function parseRound(round: string): { round: KnockoutRound; label: string } | null {
  const r = round.toLowerCase();
  if (r.includes('round of 32'))  return { round: 'R32', label: 'Round of 32' };
  if (r.includes('round of 16'))  return { round: 'R16', label: 'Round of 16' };
  if (r.includes('quarter'))      return { round: 'QF',  label: 'Quarter-final' };
  if (r.includes('semi'))         return { round: 'SF',  label: 'Semi-final' };
  if (r.includes('3rd place') || r.includes('third place')) return { round: '3RD', label: 'Third-place play-off' };
  if (r.includes('final'))        return { round: 'F',   label: 'Final' };
  return null; // Group Stage and anything unexpected
}

const ROUND_ORDER: Record<KnockoutRound, number> = { R32: 0, R16: 1, QF: 2, SF: 3, '3RD': 4, F: 5 };

// ─── Status mapping ─────────────────────────────────────────────────────────────

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const DONE_STATUSES = new Set(['FT', 'AET', 'PEN']);
type FixtureStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED';

function mapStatus(short: string): FixtureStatus {
  if (LIVE_STATUSES.has(short)) return 'LIVE';
  if (DONE_STATUSES.has(short)) return 'FINISHED';
  return 'SCHEDULED';
}

// ─── Fetch ──────────────────────────────────────────────────────────────────────

async function fetchFixtures(): Promise<ApiFixture[]> {
  if (!API_KEY) throw new Error('API_FOOTBALL_KEY not set');
  const url = `https://v3.football.api-sports.io/fixtures?league=${LEAGUE_ID}&season=${SEASON}`;
  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' },
  });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const data = await res.json() as { errors?: unknown; response: ApiFixture[] };
  if (data.errors && Object.keys(data.errors as object).length > 0) {
    throw new Error(`api-football error: ${JSON.stringify(data.errors)}`);
  }
  return data.response ?? [];
}

// ─── Build ────────────────────────────────────────────────────────────────────

interface KOEntry {
  id: string;
  round: KnockoutRound;
  roundLabel: string;
  home: string;
  away: string;
  date: string;
  stadiumId: string | null;
  venueName: string | null;
  city: string | null;
  status: FixtureStatus;
  homeScore: number | null;
  awayScore: number | null;
  winner: 'home' | 'away' | null;
}

function build(apiFixtures: ApiFixture[]): KOEntry[] {
  const out: KOEntry[] = [];
  for (const af of apiFixtures) {
    const parsed = parseRound(af.league.round);
    if (!parsed) continue; // skip Group Stage
    out.push({
      id:        String(af.fixture.id),
      round:     parsed.round,
      roundLabel: parsed.label,
      home:      normalise(af.teams.home.name),
      away:      normalise(af.teams.away.name),
      date:      af.fixture.date,
      stadiumId: venueId(af.fixture.venue.name),
      venueName: af.fixture.venue.name,
      city:      af.fixture.venue.city,
      status:    mapStatus(af.fixture.status.short),
      homeScore: af.goals.home,
      awayScore: af.goals.away,
      // api-football flags the overall winner incl. extra-time/penalties — the
      // one signal a level 90-min scoreline can't give us. Capture it so a
      // penalty-decided tie advances the right team (e.g. Germany 1-1 Paraguay
      // → Paraguay) instead of looking forever "undecided".
      winner:    af.teams.home.winner === true ? 'home'
               : af.teams.away.winner === true ? 'away' : null,
    });
  }
  out.sort((a, b) =>
    ROUND_ORDER[a.round] - ROUND_ORDER[b.round] ||
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  return out;
}

// ─── Codegen ────────────────────────────────────────────────────────────────────

function s(v: string | null): string { return v === null ? 'null' : `'${v.replace(/'/g, "\\'")}'`; }
function n(v: number | null): string { return v === null ? 'null' : String(v); }

function generateFile(rows: KOEntry[], updatedAt: string): string {
  const body = rows.map((r) =>
    `  { id: '${r.id}', round: '${r.round}', roundLabel: '${r.roundLabel}', ` +
    `home: ${s(r.home)}, away: ${s(r.away)}, date: '${r.date}', ` +
    `stadiumId: ${s(r.stadiumId)}, venueName: ${s(r.venueName)}, city: ${s(r.city)}, ` +
    `status: '${r.status}', homeScore: ${n(r.homeScore)}, awayScore: ${n(r.awayScore)}, ` +
    `winner: ${r.winner === null ? 'null' : `'${r.winner}'`} },`
  ).join('\n');

  return `// Auto-generated by scripts/sync-knockout.ts — do not edit manually.
// The WC 2026 knockout bracket (Round of 32 → Final), kept SEPARATE from the
// group-stage WC_FIXTURES so it never skews group-stage aggregates.
// Live scores come from the /api/fixture-results overlay (keyed home|away);
// this file is the fixture list + a baked status snapshot.

export type KnockoutRound = 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'F';

export interface KnockoutFixture {
  id:         string;
  round:      KnockoutRound;
  roundLabel: string;
  home:       string;          // canonical app team name (may be a placeholder until a tie is decided)
  away:       string;
  date:       string;          // ISO 8601
  stadiumId:  string | null;   // curated stadium id (lib/stadiumData), or null when the feed gives no/unknown venue
  venueName:  string | null;   // raw feed venue name (fallback display when stadiumId is null)
  city:       string | null;
  status:     'SCHEDULED' | 'LIVE' | 'FINISHED';
  homeScore:  number | null;
  awayScore:  number | null;
  winner:     'home' | 'away' | null;  // overall winner incl. ET/penalties (null until decided)
}

// Display order for the six knockout rounds.
export const KNOCKOUT_ORDER: Record<KnockoutRound, number> = { R32: 0, R16: 1, QF: 2, SF: 3, '3RD': 4, F: 5 };

export const WC_KNOCKOUT: KnockoutFixture[] = [
${body}
];

export const WC_KNOCKOUT_LAST_UPDATED = '${updatedAt}';
`;
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏆  Syncing WC 2026 knockout bracket (league=${LEAGUE_ID}, season=${SEASON})…`);

  let apiFixtures: ApiFixture[] = [];
  try {
    apiFixtures = await fetchFixtures();
    console.log(`  ✓  ${apiFixtures.length} fixtures received from API`);
  } catch (err) {
    console.warn(`  ⚠️  Fetch failed: ${err}. Leaving lib/knockoutData.ts untouched.`);
    return;
  }

  const rows = build(apiFixtures);
  const byRound = rows.reduce<Record<string, number>>((m, r) => { m[r.roundLabel] = (m[r.roundLabel] ?? 0) + 1; return m; }, {});
  console.log(`  ✓  ${rows.length} knockout fixtures parsed:`, byRound);

  if (DRY_RUN) {
    for (const r of rows) {
      console.log(`     [${r.roundLabel}] ${r.home} v ${r.away}  ${r.status}  ${r.stadiumId ?? r.venueName ?? 'venue TBC'}`);
    }
    console.log('\n  DRY RUN — no file written.\n');
    return;
  }

  // Never wipe a real bracket with an empty file (transient 200 with no rows, or
  // a pre-knockout window). Leave the committed file untouched.
  if (rows.length === 0) {
    console.warn('  ⚠️  No knockout fixtures yet — leaving lib/knockoutData.ts untouched.');
    return;
  }

  const now = new Date().toISOString();
  fs.writeFileSync(OUT_PATH, generateFile(rows, now), 'utf8');
  console.log(`\n  ✓  Written to lib/knockoutData.ts (${now})\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
