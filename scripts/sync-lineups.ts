/**
 * scripts/sync-lineups.ts
 *
 * Fetches team lineups, formations and coaches for WC 2026 matches and
 * regenerates lib/lineupData.ts.
 *
 * Source: api-football.com `/fixtures/lineups` — the same feed that powers
 * results and match events. It returns formation, startXI, substitutes and
 * the coach for every played fixture (and predicted XIs shortly before
 * kickoff). The previous SofaScore/Fotmob path was abandoned: both now return
 * HTTP 403 from CI/dev, so they produced zero real lineups.
 *
 * Priority per fixture:
 *   1. api-football lineup (formation + XI + coach)   ← real data
 *   2. Baseline fallback (lib/teamFormationsBaseline.ts) ← formation only, always present
 *
 * Usage:
 *   npx tsx scripts/sync-lineups.ts          # live write
 *   DRY_RUN=true npx tsx scripts/sync-lineups.ts  # preview only, no file write
 *
 * Called by: .github/workflows/sync-lineups.yml (every 30 min during tournament)
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { WC_FIXTURES } from '../lib/wcData.js';
import { TEAM_FORMATIONS_BASELINE } from '../lib/teamFormationsBaseline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// CI sets API_FOOTBALL_KEY (secret); locally the key lives in .env as API_KEY.
const API_KEY   = process.env.API_FOOTBALL_KEY ?? process.env.API_KEY;
const DRY_RUN   = process.env.DRY_RUN === 'true';
const LEAGUE_ID = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1);
const SEASON    = Number(process.env.API_FOOTBALL_SEASON ?? 2026);
const OUT_PATH  = path.resolve(__dirname, '..', 'lib', 'lineupData.ts');
const API_BASE  = 'https://v3.football.api-sports.io';

// ─── Types ────────────────────────────────────────────────────────────────────

type Position    = 'GK' | 'DF' | 'MF' | 'FW';
type LineupSource = 'api-football' | 'baseline';

interface LineupPlayer {
  name:    string;
  number:  number;
  pos:     Position;
  starter: boolean;
}

interface TeamLineup {
  formation: string;
  players:   LineupPlayer[];
  coach?:    string;
}

interface MatchLineup {
  fixtureKey: string;
  home:       TeamLineup;
  away:       TeamLineup;
  confirmed:  boolean;
  source:     LineupSource;
  updatedAt:  string;
}

// ─── Team name normalisation (api-football → wcData.ts) ─────────────────────────

const NAME_MAP: Record<string, string> = {
  'United States':            'USA',
  'Korea Republic':           'South Korea',
  "Côte d'Ivoire":            'Ivory Coast',
  'Cape Verde':               'Cape Verde Islands',
  'DR Congo':                 'Congo DR',
  'IR Iran':                  'Iran',
  'Curacao':                  'Curaçao',
  'Turkey':                   'Türkiye',
  'Czechia':                  'Czech Republic',
  'Bosnia':                   'Bosnia & Herzegovina',
  'Bosnia and Herzegovina':   'Bosnia & Herzegovina',
  'Bosnia-Herzegovina':       'Bosnia & Herzegovina',
};

function normalise(name: string): string {
  return NAME_MAP[name] ?? name;
}

function normalisePos(raw: string): Position {
  const r = raw.toLowerCase();
  if (r.includes('goal') || r === 'g') return 'GK';
  if (r.includes('defend') || r === 'd') return 'DF';
  if (r.includes('mid') || r === 'm') return 'MF';
  if (r.includes('forward') || r.includes('attack') || r.includes('striker') || r.includes('winger') || r === 'f') return 'FW';
  return 'MF';
}

// ─── api-football ───────────────────────────────────────────────────────────────

async function apiGet<T>(query: string): Promise<T[]> {
  if (!API_KEY) throw new Error('API_FOOTBALL_KEY (or API_KEY) not set');
  const res = await fetch(`${API_BASE}/${query}`, {
    headers: { 'x-apisports-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' },
  });
  if (!res.ok) throw new Error(`API HTTP ${res.status} for ${query}`);
  const data = await res.json() as { errors?: unknown; response: T[] };
  if (data.errors && Object.keys(data.errors as object).length > 0) {
    throw new Error(`api-football error: ${JSON.stringify(data.errors)}`);
  }
  return data.response ?? [];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ApiFixtureLite {
  fixture: { id: number; status: { short: string }; date: string };
  teams:   { home: { name: string }; away: { name: string } };
}

interface ApiLineupPlayer {
  player: { id: number; name: string; number: number | null; pos: string | null };
}

interface ApiLineup {
  team:        { id: number; name: string };
  formation:   string | null;
  startXI:     ApiLineupPlayer[];
  substitutes: ApiLineupPlayer[];
  coach:       { id: number | null; name: string | null };
}

// Statuses for which a lineup is worth fetching: live/finished always have one,
// and api-football publishes predicted XIs ~40 min before kickoff (NS within window).
const PLAYED = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE', 'FT', 'AET', 'PEN']);
const LOOKAHEAD_MS = 18 * 3_600_000;

function shouldFetch(status: string, kickoff: string): boolean {
  if (PLAYED.has(status)) return true;
  const diff = new Date(kickoff).getTime() - Date.now();
  return diff > -6 * 3_600_000 && diff < LOOKAHEAD_MS; // about to start
}

function parseApiTeam(raw: ApiLineup, teamName: string): TeamLineup {
  const map = (p: ApiLineupPlayer, starter: boolean): LineupPlayer => ({
    name:    p.player.name,
    number:  p.player.number ?? 0,
    pos:     normalisePos(p.player.pos ?? 'M'),
    starter,
  });
  const players = [
    ...(raw.startXI ?? []).map((p) => map(p, true)),
    ...(raw.substitutes ?? []).map((p) => map(p, false)),
  ];
  const formation = raw.formation ?? TEAM_FORMATIONS_BASELINE[teamName] ?? '4-3-3';
  const coach = raw.coach?.name ?? undefined;
  return { formation, players, ...(coach ? { coach } : {}) };
}

// ─── Baseline seeding ─────────────────────────────────────────────────────────
// Every WC fixture gets a baseline entry so formations are always available,
// even before match-day lineup announcements.

function makeBaselineEntry(home: string, away: string): MatchLineup {
  const hFormation = TEAM_FORMATIONS_BASELINE[home] ?? '4-3-3';
  const aFormation = TEAM_FORMATIONS_BASELINE[away] ?? '4-3-3';
  return {
    fixtureKey: `${home}|${away}`,
    home:       { formation: hFormation, players: [] },
    away:       { formation: aFormation, players: [] },
    confirmed:  false,
    source:     'baseline',
    updatedAt:  new Date().toISOString(),
  };
}

// ─── Load existing data ───────────────────────────────────────────────────────

function loadExisting(): Map<string, MatchLineup> {
  const map = new Map<string, MatchLineup>();
  try {
    const content = fs.readFileSync(OUT_PATH, 'utf8');
    const match   = content.match(/MATCH_LINEUPS: MatchLineup\[\] = (\[[\s\S]*?\]);/);
    if (match?.[1]) {
      const arr = JSON.parse(match[1]) as MatchLineup[];
      for (const item of arr) map.set(item.fixtureKey, item);
    }
  } catch { /* start fresh */ }
  return map;
}

// ─── Code generation ──────────────────────────────────────────────────────────

function generateFile(lineups: MatchLineup[], updatedAt: string): string {
  const serialised = JSON.stringify(lineups, null, 2);
  return `// Auto-generated by scripts/sync-lineups.ts — do not edit manually.
// Refreshed every 30 min during the tournament via GitHub Actions.
// Source: api-football /fixtures/lineups (formation + XI + coach) → baseline fallback.

export type Position = 'GK' | 'DF' | 'MF' | 'FW';

export interface LineupPlayer {
  name: string;
  number: number;
  pos: Position;
  starter: boolean;
}

export interface TeamLineup {
  formation: string;
  players: LineupPlayer[];
  coach?: string;
}

export interface MatchLineup {
  fixtureKey: string;
  home: TeamLineup;
  away: TeamLineup;
  confirmed: boolean;
  source: 'api-football' | 'baseline';
  updatedAt: string;
}

export const MATCH_LINEUPS: MatchLineup[] = ${serialised};

export const LINEUPS_LAST_UPDATED = '${updatedAt}';
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎯  Syncing WC 2026 lineups [${DRY_RUN ? 'DRY RUN' : 'LIVE'}] (league=${LEAGUE_ID}, season=${SEASON})\n`);

  const existing = loadExisting();
  const updated  = new Map<string, MatchLineup>(existing);

  // ── Step 0: Seed every fixture from baseline if not already present ────────
  console.log('  📋  Step 0: Baseline seed…');
  let seeded = 0;
  for (const f of WC_FIXTURES) {
    const key = `${f.home}|${f.away}`;
    if (!updated.has(key)) {
      updated.set(key, makeBaselineEntry(f.home, f.away));
      seeded++;
    }
  }
  console.log(`     Seeded ${seeded} new fixtures from baseline (${updated.size} total)\n`);

  // ── Step 1: api-football — real lineups (formation + XI + coach) ───────────
  console.log('  ⚽  Step 1: api-football fixtures…');
  let apiFixtures: ApiFixtureLite[];
  try {
    apiFixtures = await apiGet<ApiFixtureLite>(`fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
    console.log(`     ${apiFixtures.length} fixtures received`);
  } catch (err) {
    console.warn(`  ⚠️  Fixture fetch failed: ${err}`);
    console.warn('     Leaving real lineups untouched; writing baseline-seeded file only.\n');
    apiFixtures = [];
  }

  const wcByKey = new Map(WC_FIXTURES.map((f) => [`${f.home}|${f.away}`, f]));

  const targets = apiFixtures
    .map((af) => ({
      apiId:   af.fixture.id,
      status:  af.fixture.status.short,
      kickoff: af.fixture.date,
      key:     `${normalise(af.teams.home.name)}|${normalise(af.teams.away.name)}`,
    }))
    .filter((x) => wcByKey.has(x.key) && shouldFetch(x.status, x.kickoff));

  console.log(`     ${targets.length} fixture(s) eligible for a lineup pull\n`);

  let hits = 0;
  for (const t of targets) {
    const wc = wcByKey.get(t.key)!;
    try {
      const raw = await apiGet<ApiLineup>(`fixtures/lineups?fixture=${t.apiId}`);
      const homeRaw = raw.find((r) => normalise(r.team.name) === wc.home);
      const awayRaw = raw.find((r) => normalise(r.team.name) === wc.away);
      if (!homeRaw || !awayRaw || !homeRaw.startXI?.length || !awayRaw.startXI?.length) {
        console.log(`     ·  ${t.key}: no lineup posted yet`);
        await sleep(250);
        continue;
      }
      const home = parseApiTeam(homeRaw, wc.home);
      const away = parseApiTeam(awayRaw, wc.away);
      updated.set(t.key, {
        fixtureKey: t.key,
        home,
        away,
        confirmed:  PLAYED.has(t.status), // posted lineups for played games are final
        source:     'api-football',
        updatedAt:  new Date().toISOString(),
      });
      hits++;
      console.log(`     ✓  ${t.key}: ${home.formation} (${home.coach ?? 'coach?'}) vs ${away.formation} (${away.coach ?? 'coach?'})`);
    } catch (err) {
      console.warn(`     ⚠️  ${t.key}: ${err}`);
    }
    await sleep(250); // be gentle on the rate limit
  }

  // ── Write ─────────────────────────────────────────────────────────────────
  const lineups = [...updated.values()].sort((a, b) => a.fixtureKey.localeCompare(b.fixtureKey));
  console.log(`\n  📦  Total: ${lineups.length} fixtures — ${hits} from api-football, rest baseline`);

  if (DRY_RUN) { console.log('  DRY RUN — no file written.\n'); return; }

  const now = new Date().toISOString();
  fs.writeFileSync(OUT_PATH, generateFile(lineups, now), 'utf8');
  console.log(`  ✓  Written to lib/lineupData.ts (${now})\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
