/**
 * scripts/sync-player-stats.ts
 *
 * Fetches per-player match statistics (goals, assists, shots, saves, rating,
 * tackles, interceptions, passes) from api-football /fixtures/players for every
 * live/finished WC 2026 fixture and regenerates lib/playerStatsData.ts.
 *
 * Stored PER MATCH so the Players tab can both aggregate tournament leaderboards
 * (assists, defensive actions, ratings) and show per-match Hero / XI stats.
 *
 * Safety: on fetch failure or empty response, the existing file is left untouched.
 *
 * Usage:
 *   npx tsx scripts/sync-player-stats.ts
 *   DRY_RUN=true npx tsx scripts/sync-player-stats.ts
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
const OUT_PATH  = path.resolve(__dirname, '..', 'lib', 'playerStatsData.ts');
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
const POS: Record<string, string> = { G: 'GK', D: 'DF', M: 'MF', F: 'FW' };

interface ApiFixture { fixture: { id: number; status: { short: string } }; teams: { home: { name: string }; away: { name: string } } }
interface ApiLine {
  games?:  { minutes?: number | null; position?: string | null; rating?: string | null };
  shots?:  { total?: number | null; on?: number | null };
  goals?:  { total?: number | null; assists?: number | null; saves?: number | null };
  passes?: { total?: number | null; accuracy?: number | string | null };
  tackles?:{ total?: number | null; interceptions?: number | null };
}
interface ApiPlayerEntry { player: { name: string }; statistics: ApiLine[] }
interface ApiTeamPlayers { team: { name: string }; players: ApiPlayerEntry[] }

async function apiGet<T>(query: string): Promise<T[]> {
  if (!API_KEY) throw new Error('API_FOOTBALL_KEY (or API_KEY) not set');
  const res = await fetch(`${API_BASE}/${query}`, {
    headers: { 'x-apisports-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' },
  });
  if (!res.ok) throw new Error(`API HTTP ${res.status} for ${query}`);
  const data = await res.json() as { errors?: unknown; response: T[] };
  if (data.errors && Object.keys(data.errors as object).length > 0) throw new Error(`api error: ${JSON.stringify(data.errors)}`);
  return data.response ?? [];
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const n0 = (v: unknown) => (v == null ? 0 : Number(v) || 0);

export interface PlayerMatchStat {
  fixtureId: string; team: string; name: string; pos: string;
  minutes: number; rating: number | null;
  goals: number; assists: number; saves: number;
  shots: number; shotsOn: number;
  passes: number; passAccPct: number;
  tackles: number; interceptions: number;
}

function parseLine(fixtureId: string, team: string, name: string, st: ApiLine): PlayerMatchStat {
  const total = n0(st.passes?.total);
  const accRaw = st.passes?.accuracy;
  const accNum = accRaw == null ? 0 : Number(accRaw) || 0;
  // api-football gives player passes.accuracy as a COUNT of accurate passes when
  // it's ≤ total; otherwise it's already a percentage.
  const passAccPct = total > 0
    ? (accNum <= total ? Math.round((accNum / total) * 100) : Math.min(100, Math.round(accNum)))
    : Math.min(100, Math.round(accNum));
  return {
    fixtureId, team, name,
    pos: POS[(st.games?.position ?? '').charAt(0)] ?? 'MF',
    minutes: n0(st.games?.minutes),
    rating: st.games?.rating ? Number(st.games.rating) || null : null,
    goals: n0(st.goals?.total), assists: n0(st.goals?.assists), saves: n0(st.goals?.saves),
    shots: n0(st.shots?.total), shotsOn: n0(st.shots?.on),
    passes: total, passAccPct,
    tackles: n0(st.tackles?.total), interceptions: n0(st.tackles?.interceptions),
  };
}

function line(p: PlayerMatchStat): string {
  return `  { fixtureId: ${JSON.stringify(p.fixtureId)}, team: ${JSON.stringify(p.team)}, name: ${JSON.stringify(p.name)}, ` +
    `pos: ${JSON.stringify(p.pos)}, minutes: ${p.minutes}, rating: ${p.rating ?? 'null'}, ` +
    `goals: ${p.goals}, assists: ${p.assists}, saves: ${p.saves}, shots: ${p.shots}, shotsOn: ${p.shotsOn}, ` +
    `passes: ${p.passes}, passAccPct: ${p.passAccPct}, tackles: ${p.tackles}, interceptions: ${p.interceptions} },`;
}

function fileContent(rows: PlayerMatchStat[], updatedAt: string): string {
  return `// Auto-generated by scripts/sync-player-stats.ts — do not edit manually.
// Per-player, per-match statistics powering the Players tab (components/PlayersModule.tsx).

export interface PlayerMatchStat {
  fixtureId: string;
  team: string;
  name: string;
  pos: string;          // GK | DF | MF | FW
  minutes: number;
  rating: number | null;
  goals: number;
  assists: number;
  saves: number;
  shots: number;
  shotsOn: number;
  passes: number;
  passAccPct: number;   // 0..100
  tackles: number;
  interceptions: number;
}

export const PLAYER_MATCH_STATS: PlayerMatchStat[] = [
${rows.map(line).join('\n')}
];

export const PLAYER_STATS_LAST_UPDATED = '${updatedAt}';
`;
}

async function main() {
  console.log(`\n👤  Syncing WC 2026 player stats (league=${LEAGUE_ID}, season=${SEASON})…`);
  let fixtures: ApiFixture[];
  try {
    fixtures = await apiGet<ApiFixture>(`fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
    console.log(`  ✓  ${fixtures.length} fixtures received`);
  } catch (err) {
    console.warn(`  ⚠️  Fetch failed: ${err}. Leaving lib/playerStatsData.ts untouched.`);
    return;
  }

  const wcByKey = new Map(WC_FIXTURES.map((f) => [`${f.home}|${f.away}`, f]));
  const order   = new Map(WC_FIXTURES.map((f, i) => [f.id, i]));

  const played = fixtures
    .map((f) => ({ apiId: f.fixture.id, short: f.fixture.status.short, wc: wcByKey.get(`${normTeam(f.teams.home.name)}|${normTeam(f.teams.away.name)}`) }))
    .filter((x) => x.wc && (LIVE.has(x.short) || DONE.has(x.short)));
  console.log(`  ✓  ${played.length} live/finished fixtures`);

  const rows: PlayerMatchStat[] = [];
  for (const p of played) {
    try {
      const teams = await apiGet<ApiTeamPlayers>(`fixtures/players?fixture=${p.apiId}`);
      for (const t of teams) {
        const team = normTeam(t.team.name);
        for (const pe of t.players ?? []) {
          const st = pe.statistics?.[0];
          if (!st) continue;
          const row = parseLine(p.wc!.id, team, pe.player.name, st);
          if (row.minutes > 0 || row.goals || row.assists || row.saves) rows.push(row);
        }
      }
    } catch (err) {
      console.warn(`  ⚠️  players for ${p.wc!.id} failed: ${err}`);
    }
    await sleep(250);
  }

  rows.sort((a, b) => (order.get(a.fixtureId) ?? 0) - (order.get(b.fixtureId) ?? 0) || b.goals - a.goals);

  if (rows.length === 0) { console.warn('  ⚠️  No player rows built — leaving file untouched.'); return; }
  console.log(`  ✓  ${rows.length} player-match rows`);

  if (DRY_RUN) {
    const top = [...rows].sort((a, b) => b.assists - a.assists).slice(0, 5);
    console.log('  Top assists:', top.map((r) => `${r.name}(${r.assists})`).join(', '));
    console.log('\n  DRY RUN — no file written.\n'); return;
  }
  const now = new Date().toISOString();
  fs.writeFileSync(OUT_PATH, fileContent(rows, now), 'utf8');
  console.log(`\n  ✓  Written to lib/playerStatsData.ts (${now})\n`);
}

main();
