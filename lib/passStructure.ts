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

export function styleOf(s: TeamMatchStats): TeamStyle {
  const poss = s.possession || 0, pa = s.passAccuracy || 0, corners = s.corners || 0;
  if (poss >= 0.58 && pa >= 0.85) return { label: 'Possession Web', desc: 'patient, high-retention build-up' };
  if (corners >= 8)               return { label: 'Wing Dominant', desc: 'lots of wide deliveries and crosses' };
  if (poss <= 0.42)               return { label: 'Counter Attack Network', desc: 'direct, low-possession transitions' };
  if (pa >= 0.85)                 return { label: 'Central Engine', desc: 'controlled passing through the middle' };
  return { label: 'Balanced Structure', desc: 'a mix of build-up and directness' };
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
export function passStructure(fixtureId: string, team: string, liveStats?: TeamMatchStats): PassStructure | null {
  const s = teamMatchStats(fixtureId, team) ?? liveStats ?? null;
  if (!s) return null;
  const rows = PLAYER_MATCH_STATS.filter((p) => p.fixtureId === fixtureId && p.team === team && (p.minutes > 0 || p.passes > 0));
  const maxP = Math.max(1, ...rows.map((p) => p.passes));
  const players: PassNode[] = rows.map((p) => ({ name: p.name, pos: p.pos, passes: p.passes, passAccPct: p.passAccPct, involvement: p.passes / maxP }));
  const topPassers = [...players].sort((a, b) => b.passes - a.passes).slice(0, 4);
  const style = styleOf(s);
  const connectivity = connectivityOf(s);

  const t1 = topPassers[0], t2 = topPassers[1];
  const lili = t1
    ? `${t1.name} was ${team}'s main distributor (${t1.passes} passes${t1.passAccPct ? `, ${t1.passAccPct}% accurate` : ''})${t2 ? `, with ${t2.name} also heavily involved` : ''}. ${team} played a ${style.label} — ${style.desc} — completing ${Math.round((s.passAccuracy || 0) * 100)}% of passes on ${Math.round((s.possession || 0) * 100)}% possession.`
    : `${team} played a ${style.label} (${style.desc}).`;

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
