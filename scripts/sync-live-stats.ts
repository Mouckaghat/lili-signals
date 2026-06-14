/**
 * scripts/sync-live-stats.ts
 *
 * Fetches WC 2026 match statistics (possession, shots, xG, corners…) from
 * api-football and regenerates lib/matchStatsData.ts — the feed for the
 * territory/pressure heatmap (lib/heatmap.ts + components/MatchHeatmap.tsx).
 *
 * These stats update live during a match, so this bot is meant to run on a
 * tight cadence during match windows; the heatmap then evolves in near real
 * time without any video.
 *
 * Safety: on fetch failure or empty response, the existing file is left
 * untouched (never blank curated data).
 *
 * Usage:
 *   npx tsx scripts/sync-live-stats.ts              # live write
 *   DRY_RUN=true npx tsx scripts/sync-live-stats.ts # preview only
 *   ASCII=true DRY_RUN=true npx tsx scripts/sync-live-stats.ts  # + print pitches
 *
 * Called by: .github/workflows/sync-live-stats.yml (tight cadence in windows)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { WC_FIXTURES } from '../lib/wcData.js';
import { buildHeatGrid, renderAscii, type TeamMatchStats } from '../lib/heatmap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_KEY   = process.env.API_FOOTBALL_KEY ?? process.env.API_KEY;
const DRY_RUN   = process.env.DRY_RUN === 'true';
const ASCII     = process.env.ASCII === 'true';
const LEAGUE_ID = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1);
const SEASON    = Number(process.env.API_FOOTBALL_SEASON ?? 2026);
const OUT_PATH  = path.resolve(__dirname, '..', 'lib', 'matchStatsData.ts');
const API_BASE  = 'https://v3.football.api-sports.io';

const TEAM_NAME_MAP: Record<string, string> = {
  'Korea Republic': 'South Korea', 'IR Iran': 'Iran', "Côte d'Ivoire": 'Ivory Coast',
  'Cape Verde': 'Cape Verde Islands', 'DR Congo': 'Congo DR', 'United States': 'USA',
  'Curacao': 'Curaçao', 'Turkey': 'Türkiye', 'Czechia': 'Czech Republic',
  'Bosnia': 'Bosnia & Herzegovina', 'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
};
const normTeam = (n: string) => TEAM_NAME_MAP[n] ?? n;

const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const DONE = new Set(['FT', 'AET', 'PEN']);

interface ApiFixture {
  fixture: { id: number; status: { short: string; elapsed: number | null }; date: string };
  teams:   { home: { name: string }; away: { name: string } };
}
interface ApiStatItem { type: string; value: number | string | null }
interface ApiTeamStats { team: { name: string }; statistics: ApiStatItem[] }

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

function num(items: ApiStatItem[], type: string): number {
  const raw = items.find((s) => s.type === type)?.value;
  if (raw === null || raw === undefined) return 0;
  const n = parseFloat(String(raw).replace('%', ''));
  return Number.isFinite(n) ? n : 0;
}
function pct(items: ApiStatItem[], type: string): number {
  return num(items, type) / 100;
}

function parseTeam(raw: ApiTeamStats): TeamMatchStats {
  const s = raw.statistics ?? [];
  return {
    team:            normTeam(raw.team.name),
    possession:      pct(s, 'Ball Possession'),
    totalShots:      num(s, 'Total Shots'),
    shotsInsideBox:  num(s, 'Shots insidebox'),
    shotsOutsideBox: num(s, 'Shots outsidebox'),
    shotsOnGoal:     num(s, 'Shots on Goal'),
    corners:         num(s, 'Corner Kicks'),
    xg:              num(s, 'expected_goals'),
    passAccuracy:    pct(s, 'Passes %'),
  };
}

interface MatchStats {
  fixtureId: string; home: string; away: string; date: string;
  status: 'LIVE' | 'FINISHED'; elapsed: number | null;
  home_: TeamMatchStats; away_: TeamMatchStats;
}

function entryBlock(m: MatchStats): string {
  const t = (s: TeamMatchStats) =>
    `{ team: ${JSON.stringify(s.team)}, possession: ${s.possession}, totalShots: ${s.totalShots}, ` +
    `shotsInsideBox: ${s.shotsInsideBox}, shotsOutsideBox: ${s.shotsOutsideBox}, ` +
    `shotsOnGoal: ${s.shotsOnGoal}, corners: ${s.corners}, xg: ${s.xg}, passAccuracy: ${s.passAccuracy} }`;
  return `  {
    fixtureId: ${JSON.stringify(m.fixtureId)},
    home: ${JSON.stringify(m.home)}, away: ${JSON.stringify(m.away)}, date: ${JSON.stringify(m.date)},
    status: ${JSON.stringify(m.status)}, elapsed: ${m.elapsed ?? 'null'},
    homeStats: ${t(m.home_)},
    awayStats: ${t(m.away_)},
  },`;
}

function generateFile(entries: MatchStats[], updatedAt: string): string {
  return `// Auto-generated by scripts/sync-live-stats.ts — do not edit manually.
// Live match statistics feeding the territory/pressure heatmap (lib/heatmap.ts).

export interface TeamMatchStats {
  team: string;
  possession: number;      // 0..1
  totalShots: number;
  shotsInsideBox: number;
  shotsOutsideBox: number;
  shotsOnGoal: number;
  corners: number;
  xg: number;
  passAccuracy: number;    // 0..1
}

export interface MatchStats {
  fixtureId: string; // matches WCFixture.id
  home: string;
  away: string;
  date: string;
  status: 'LIVE' | 'FINISHED';
  elapsed: number | null;  // live minute, null when finished
  homeStats: TeamMatchStats;
  awayStats: TeamMatchStats;
}

export const MATCH_STATS: MatchStats[] = [
${entries.map(entryBlock).join('\n')}
];

export const MATCH_STATS_LAST_UPDATED = '${updatedAt}';
`;
}

async function main() {
  console.log(`\n📊  Syncing WC 2026 match stats (league=${LEAGUE_ID}, season=${SEASON})…`);

  let fixtures: ApiFixture[];
  try {
    fixtures = await apiGet<ApiFixture>(`fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
    console.log(`  ✓  ${fixtures.length} fixtures received`);
  } catch (err) {
    console.warn(`  ⚠️  Fetch failed: ${err}. Leaving lib/matchStatsData.ts untouched.`);
    return;
  }

  const wcByKey = new Map(WC_FIXTURES.map((f) => [`${f.home}|${f.away}`, f]));
  const order   = new Map(WC_FIXTURES.map((f, i) => [f.id, i]));

  const played = fixtures
    .map((f) => ({
      apiId: f.fixture.id, short: f.fixture.status.short, elapsed: f.fixture.status.elapsed,
      wc: wcByKey.get(`${normTeam(f.teams.home.name)}|${normTeam(f.teams.away.name)}`),
    }))
    .filter((x) => x.wc && (LIVE.has(x.short) || DONE.has(x.short)));

  console.log(`  ✓  ${played.length} live/finished fixtures`);

  const entries: MatchStats[] = [];
  for (const p of played) {
    try {
      const raw = await apiGet<ApiTeamStats>(`fixtures/statistics?fixture=${p.apiId}`);
      const homeRaw = raw.find((r) => normTeam(r.team.name) === p.wc!.home);
      const awayRaw = raw.find((r) => normTeam(r.team.name) === p.wc!.away);
      if (!homeRaw || !awayRaw || !homeRaw.statistics?.length) continue;
      entries.push({
        fixtureId: p.wc!.id, home: p.wc!.home, away: p.wc!.away, date: p.wc!.date.slice(0, 10),
        status: DONE.has(p.short) ? 'FINISHED' : 'LIVE',
        elapsed: DONE.has(p.short) ? null : p.elapsed,
        home_: parseTeam(homeRaw), away_: parseTeam(awayRaw),
      });
    } catch (err) {
      console.warn(`  ⚠️  stats for ${p.wc!.id} failed: ${err}`);
    }
    await sleep(250);
  }

  entries.sort((a, b) => (order.get(a.fixtureId) ?? 0) - (order.get(b.fixtureId) ?? 0));

  if (entries.length === 0) {
    console.warn('  ⚠️  No stats built — leaving lib/matchStatsData.ts untouched.');
    return;
  }
  console.log(`  ✓  ${entries.length} matches with stats`);

  if (ASCII) {
    for (const m of entries) {
      console.log(`\n  ${m.home} ${Math.round(m.home_.possession*100)}%  vs  ${Math.round(m.away_.possession*100)}% ${m.away}`);
      console.log(renderAscii(buildHeatGrid(m.home_, 'ltr')));
    }
  }

  if (DRY_RUN) { console.log('\n  DRY RUN — no file written.\n'); return; }

  const now = new Date().toISOString();
  fs.writeFileSync(OUT_PATH, generateFile(entries, now), 'utf8');
  console.log(`\n  ✓  Written to lib/matchStatsData.ts (${now})\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
