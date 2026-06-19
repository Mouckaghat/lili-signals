// Passing Structure model — "how does this team move the ball and control the
// game?" HONEST: built only from real data we have — per-player passes & pass
// accuracy + team possession. We have NO pass-pair (who→whom) or position data,
// so there are NO fabricated connection lines; involvement = real pass volume,
// laid out by formation role.

import { MATCH_STATS, type TeamMatchStats } from './matchStatsData';
import { PLAYER_MATCH_STATS } from './playerStatsData';
import { FIXTURE_RESULTS, type FixtureResult } from './fixtureResultsData';
import { WC_TEAMS } from './wcData';
import { nextOpponent } from './attackZones';
import { HEATMAP_I18N, hmT, type HeatmapI18n } from './heatmapI18n';

const flagOf = (t: string) => WC_TEAMS.find((x) => x.name === t)?.flag ?? '🏳';

export interface PassNode { name: string; pos: string; passes: number; passAccPct: number; involvement: number }
export interface TeamStyle { label: string; desc: string }
export interface PassStructure {
  team: string; flag: string;
  players: PassNode[];
  connectivity: number;
  passAccuracy: number;
  possession: number;
  totalPasses: number;
  style: TeamStyle;
  topPassers: PassNode[];
  lili: string;
}

export function connectivityOf(s: TeamMatchStats): number {
  const passAcc = s.passAccuracy || 0;
  const poss = s.possession || 0;
  const passes = s.passes ?? 0;
  return Math.round((0.45 * passAcc + 0.30 * poss + 0.25 * Math.min(passes / 600, 1)) * 100);
}

export function styleOf(s: TeamMatchStats, L: HeatmapI18n = HEATMAP_I18N.EN): TeamStyle {
  const poss = s.possession || 0, pa = s.passAccuracy || 0, corners = s.corners || 0;
  if (poss >= 0.58 && pa >= 0.85) return { label: L.styleWeb, desc: L.styleWebD };
  if (corners >= 8)               return { label: L.styleWing, desc: L.styleWingD };
  if (poss <= 0.42)               return { label: L.styleCounter, desc: L.styleCounterD };
  if (pa >= 0.85)                 return { label: L.styleCentral, desc: L.styleCentralD };
  return { label: L.styleBalanced, desc: L.styleBalancedD };
}

function teamMatchStats(fixtureId: string, team: string): TeamMatchStats | null {
  const m = MATCH_STATS.find((x) => x.fixtureId === fixtureId);
  if (!m) return null;
  return m.home === team ? m.homeStats : m.away === team ? m.awayStats : null;
}

// `liveStats` is the team's stats from the live `MatchStats` object the screen
// already holds. We use it as a fallback so a LIVE game that isn't baked into
// the static MATCH_STATS yet (e.g. a matchday-1 game still in progress) still
// renders its team-level passing structure instead of going blank. Per-player
// nodes still come only from PLAYER_MATCH_STATS — no per-player live feed — so
// they appear once the match is finalised and synced.
export function passStructure(fixtureId: string, team: string, liveStats?: TeamMatchStats, L: HeatmapI18n = HEATMAP_I18N.EN): PassStructure | null {
  const s = teamMatchStats(fixtureId, team) ?? liveStats ?? null;
  if (!s) return null;
  const rows = PLAYER_MATCH_STATS.filter((p) => p.fixtureId === fixtureId && p.team === team && (p.minutes > 0 || p.passes > 0));
  const maxP = Math.max(1, ...rows.map((p) => p.passes));
  const players: PassNode[] = rows.map((p) => ({ name: p.name, pos: p.pos, passes: p.passes, passAccPct: p.passAccPct, involvement: p.passes / maxP }));
  const topPassers = [...players].sort((a, b) => b.passes - a.passes).slice(0, 4);
  const style = styleOf(s, L);
  const connectivity = connectivityOf(s);

  const t1 = topPassers[0], t2 = topPassers[1];
  const lili = t1
    ? hmT(L.pmLili, {
        t1: t1.name, team, passes: t1.passes,
        acc: t1.passAccPct ? hmT(L.pmAcc, { pct: t1.passAccPct }) : '',
        t2: t2 ? hmT(L.pmT2, { t2: t2.name }) : '',
        style: style.label, desc: style.desc,
        pa: Math.round((s.passAccuracy || 0) * 100), poss: Math.round((s.possession || 0) * 100),
      })
    : hmT(L.pmSimple, { team, style: style.label, desc: style.desc });

  return {
    team, flag: flagOf(team), players, connectivity,
    passAccuracy: s.passAccuracy || 0, possession: s.possession || 0, totalPasses: s.passes ?? 0,
    style, topPassers, lili,
  };
}

// ── Tournament ranking ───────────────────────────────────────────────────────
export interface PassRankRow { team: string; flag: string; connectivity: number; passAccPct: number; passes: number }

function teamAggStats(team: string): TeamMatchStats | null {
  let n = 0, poss = 0, pa = 0, passes = 0;
  for (const m of MATCH_STATS) {
    const s = m.home === team ? m.homeStats : m.away === team ? m.awayStats : null;
    if (!s) continue;
    n++; poss += s.possession || 0; pa += s.passAccuracy || 0; passes += s.passes ?? 0;
  }
  if (!n) return null;
  return { team, possession: poss / n, passAccuracy: pa / n, passes: Math.round(passes / n), totalShots: 0, shotsInsideBox: 0, shotsOutsideBox: 0, shotsOnGoal: 0, corners: 0, xg: 0 };
}

export function passRanking(): PassRankRow[] {
  const teams = new Set<string>();
  for (const m of MATCH_STATS) { teams.add(m.home); teams.add(m.away); }
  return [...teams].map((t) => {
    const agg = teamAggStats(t)!;
    return { team: t, flag: flagOf(t), connectivity: connectivityOf(agg), passAccPct: Math.round(agg.passAccuracy * 100), passes: agg.passes ?? 0 };
  }).sort((a, b) => b.connectivity - a.connectivity || b.passAccPct - a.passAccPct).slice(0, 10);
}

export interface PassClash { opponent: string; opponentFlag: string; teamConn: number; oppConn: number | null }
export function passClash(team: string, results: Record<string, FixtureResult> = FIXTURE_RESULTS): PassClash | null {
  const next = nextOpponent(team, results);
  if (!next) return null;
  const teamAgg = teamAggStats(team), oppAgg = teamAggStats(next.opponent);
  return {
    opponent: next.opponent, opponentFlag: next.opponentFlag,
    teamConn: teamAgg ? connectivityOf(teamAgg) : 0,
    oppConn: oppAgg ? connectivityOf(oppAgg) : null,
  };
}
