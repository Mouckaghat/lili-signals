/**
 * scripts/sync-standings.ts
 *
 * Fetches WC 2026 group standings from api-football.com and regenerates
 * lib/standingsData.ts so that World Signals can filter eliminated teams.
 *
 * Usage:
 *   npx tsx scripts/sync-standings.ts          # live write
 *   DRY_RUN=true npx tsx scripts/sync-standings.ts  # preview only
 *
 * Called by: .github/workflows/sync-standings.yml (every 4 h during tournament)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { WC_TEAMS } from '../lib/wcData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const API_KEY   = process.env.API_FOOTBALL_KEY;
const DRY_RUN   = process.env.DRY_RUN === 'true';
const LEAGUE_ID = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1);
const SEASON    = Number(process.env.API_FOOTBALL_SEASON ?? 2026);
const OUT_PATH  = path.resolve(__dirname, '..', 'lib', 'standingsData.ts');

// ─── API types ────────────────────────────────────────────────────────────────

interface ApiStandingEntry {
  rank: number;
  team: { id: number; name: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

// ─── Team name normalisation ──────────────────────────────────────────────────
// Maps api-football names → wcData.ts names.

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

// ─── Status derivation ────────────────────────────────────────────────────────
// WC 2026: 12 groups of 4. Top 2 from each group (24) + 8 best 3rd-place = 32 advance.
// We don't compute the 8 best 3rds here — rank-3 teams are ALIVE/AT-RISK until
// the group stage is over, never ELIMINATED unless maxPts < 3.

type StandingStatus = 'QUALIFIED' | 'ALIVE' | 'AT-RISK' | 'ELIMINATED' | 'UPCOMING';

function deriveStatus(rank: number, pts: number, played: number): StandingStatus {
  if (played === 0) return 'UPCOMING';

  const maxPts = pts + (3 - played) * 3;

  if (rank <= 2) {
    return pts >= 4 ? 'QUALIFIED' : 'ALIVE';
  }
  if (rank === 3) {
    if (maxPts < 3) return 'ELIMINATED';
    return pts >= 4 ? 'ALIVE' : 'AT-RISK';
  }
  // rank 4
  if (maxPts < 4) return 'ELIMINATED';
  return 'AT-RISK';
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchStandings(): Promise<ApiStandingEntry[][]> {
  if (!API_KEY) throw new Error('API_FOOTBALL_KEY not set');

  const url = `https://v3.football.api-sports.io/standings?league=${LEAGUE_ID}&season=${SEASON}`;
  const res = await fetch(url, {
    headers: {
      'x-apisports-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!res.ok) throw new Error(`API HTTP ${res.status}`);

  const data = await res.json() as { errors?: unknown; response: { league: { standings: ApiStandingEntry[][] } }[] };

  if (data.errors && Object.keys(data.errors as object).length > 0) {
    throw new Error(`api-football error: ${JSON.stringify(data.errors)}`);
  }

  return data.response?.[0]?.league?.standings ?? [];
}

// ─── Build entries ────────────────────────────────────────────────────────────

interface StandingEntry {
  group:  string;
  team:   string;
  rank:   number;
  played: number;
  won:    number;
  drawn:  number;
  lost:   number;
  gf:     number;
  ga:     number;
  gd:     number;
  pts:    number;
  status: StandingStatus;
}

function buildEntries(rawGroups: ApiStandingEntry[][]): StandingEntry[] {
  const wcTeamNames = new Set(WC_TEAMS.map((t) => t.name));
  const entries: StandingEntry[] = [];

  for (const group of rawGroups) {
    if (!Array.isArray(group)) continue;
    for (const e of group) {
      const team = normalise(e.team.name);
      if (!wcTeamNames.has(team)) {
        console.warn(`  ⚠️  Unknown team from API: "${e.team.name}" (normalised → "${team}") — skipped`);
        continue;
      }
      const groupLetter = e.group.replace(/^Group\s*/i, '').trim();
      entries.push({
        group:  groupLetter,
        team,
        rank:   e.rank,
        played: e.all.played,
        won:    e.all.win,
        drawn:  e.all.draw,
        lost:   e.all.lose,
        gf:     e.all.goals.for,
        ga:     e.all.goals.against,
        gd:     e.goalsDiff,
        pts:    e.points,
        status: deriveStatus(e.rank, e.points, e.all.played),
      });
    }
  }

  return entries;
}

// ─── Code generation ──────────────────────────────────────────────────────────

function generateFile(entries: StandingEntry[], updatedAt: string): string {
  const rows = entries.map((e) =>
    `  { group: ${JSON.stringify(e.group)}, team: ${JSON.stringify(e.team)}, ` +
    `rank: ${e.rank}, played: ${e.played}, won: ${e.won}, drawn: ${e.drawn}, lost: ${e.lost}, ` +
    `gf: ${e.gf}, ga: ${e.ga}, gd: ${e.gd}, pts: ${e.pts}, status: '${e.status}' },`
  ).join('\n');

  return `// Auto-generated by scripts/sync-standings.ts — do not edit manually.
// Refreshed every 4 hours during the tournament via GitHub Actions.

export type StandingStatus = 'QUALIFIED' | 'ALIVE' | 'AT-RISK' | 'ELIMINATED' | 'UPCOMING';

export interface GroupStanding {
  group:  string;
  team:   string;
  rank:   number;
  played: number;
  won:    number;
  drawn:  number;
  lost:   number;
  gf:     number;
  ga:     number;
  gd:     number;
  pts:    number;
  status: StandingStatus;
}

// All 12 groups (A–L), populated once the tournament starts.
export const GROUP_STANDINGS: GroupStanding[] = [
${rows}
];

export const STANDINGS_LAST_UPDATED = '${updatedAt}';
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📊  Syncing WC 2026 standings (league=${LEAGUE_ID}, season=${SEASON})…`);

  let rawGroups: ApiStandingEntry[][] = [];
  try {
    rawGroups = await fetchStandings();
    console.log(`  ✓  ${rawGroups.length} groups received from API`);
  } catch (err) {
    console.warn(`  ⚠️  Fetch failed: ${err}. Writing empty standings file.`);
  }

  if (rawGroups.length === 0) {
    console.warn('  ⚠️  No groups returned — aborting write to protect existing data.');
    process.exit(0);
  }

  const entries = buildEntries(rawGroups);

  // Preview
  const byStatus: Record<StandingStatus, number> = { QUALIFIED: 0, ALIVE: 0, 'AT-RISK': 0, ELIMINATED: 0, UPCOMING: 0 };
  for (const e of entries) byStatus[e.status]++;
  console.log(`  ✓  ${entries.length} teams mapped`);
  for (const [s, n] of Object.entries(byStatus)) {
    if (n > 0) console.log(`     ${s.padEnd(11)} ${n}`);
  }

  if (DRY_RUN) {
    console.log('\n  DRY RUN — no file written.\n');
    return;
  }

  const now = new Date().toISOString();
  const content = generateFile(entries, now);
  fs.writeFileSync(OUT_PATH, content, 'utf8');
  console.log(`\n  ✓  Written to lib/standingsData.ts (${now})\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
