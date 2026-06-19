// Attack / Danger Zones model — "where does this team create danger?"
// HONEST: built only from real shot data we have (api-football team stats). We
// have NO positional/zonal (left/right) event data, so this models danger by the
// bands we actually know — inside the box, from distance, and wide (corners) —
// never an invented left-wing/right-wing split.

import { MATCH_STATS, type TeamMatchStats } from './matchStatsData';
import { FIXTURE_RESULTS, type FixtureResult } from './fixtureResultsData';
import { WC_FIXTURES, WC_TEAMS } from './wcData';
import { HEATMAP_I18N, hmT, type HeatmapI18n } from './heatmapI18n';

const flagOf = (team: string) => WC_TEAMS.find((t) => t.name === team)?.flag ?? '🏳';

export type Band = 'box' | 'range' | 'wide';
export interface DangerProfile {
  inside: number;     // shots inside the box (central danger)
  outside: number;    // shots from distance
  wide: number;       // corners — wide / set-piece threat proxy
  sot: number;        // shots on target
  xg: number;
  total: number;
  dangerous: number;  // proxy: box shots + shots on target + xG weight
  boxShare: number;   // 0..1
  primary: Band;
}

export function dangerProfile(s: TeamMatchStats): DangerProfile {
  const inside = s.shotsInsideBox || 0;
  const outside = s.shotsOutsideBox || 0;
  const wide = s.corners || 0;
  const sot = s.shotsOnGoal || 0;
  const xg = s.xg || 0;
  const total = Math.max(s.totalShots || inside + outside, 1);
  const dangerous = inside + sot + Math.round(xg * 2);
  // primary danger source — weight box higher (it's the most dangerous)
  const wBox = inside * 1.4, wRange = outside, wWide = wide * 0.8;
  const primary: Band = wBox >= wRange && wBox >= wWide ? 'box' : wWide >= wRange ? 'wide' : 'range';
  return { inside, outside, wide, sot, xg, total, dangerous, boxShare: inside / total, primary };
}

const bandLabel = (b: Band, L: HeatmapI18n): string => (b === 'box' ? L.bandBox : b === 'range' ? L.bandRange : L.bandWide);

export function liliSummary(home: string, away: string, h: DangerProfile, a: DangerProfile, L: HeatmapI18n = HEATMAP_I18N.EN): string {
  const [dom, sub, dp, sp] = h.dangerous >= a.dangerous ? [home, away, h, a] : [away, home, a, h];
  return hmT(L.azLili, {
    dom, dDanger: dp.dangerous, sDanger: sp.dangerous,
    band: bandLabel(dp.primary, L), boxPct: Math.round(dp.boxShare * 100), sub,
  });
}

// ── Tournament aggregate ─────────────────────────────────────────────────────
export interface TeamAttack {
  team: string; flag: string;
  goals: number; xg: number; inside: number; corners: number; sot: number; shots: number; matches: number;
}
export interface AttackRanking {
  teams: TeamAttack[];
  bestAttack: TeamAttack | null;      // most goals
  mostDangerous: TeamAttack | null;   // most xG
  mostBoxShots: TeamAttack | null;    // most inside-box shots
  mostWingThreat: TeamAttack | null;  // most corners
}

export function teamAggregate(team: string): TeamAttack {
  const agg: TeamAttack = { team, flag: flagOf(team), goals: 0, xg: 0, inside: 0, corners: 0, sot: 0, shots: 0, matches: 0 };
  for (const m of MATCH_STATS) {
    const s = m.home === team ? m.homeStats : m.away === team ? m.awayStats : null;
    if (!s) continue;
    agg.matches++; agg.xg += s.xg || 0; agg.inside += s.shotsInsideBox || 0;
    agg.corners += s.corners || 0; agg.sot += s.shotsOnGoal || 0; agg.shots += s.totalShots || 0;
  }
  return agg;
}

export function tournamentAttack(results: Record<string, FixtureResult> = FIXTURE_RESULTS): AttackRanking {
  const seen = new Set<string>();
  for (const m of MATCH_STATS) { seen.add(m.home); seen.add(m.away); }
  const goalsFor = new Map<string, number>();
  for (const f of WC_FIXTURES) {
    const r = results[`${f.home}|${f.away}`];
    if (!r || r.status !== 'FINISHED' || r.homeScore == null || r.awayScore == null) continue;
    goalsFor.set(f.home, (goalsFor.get(f.home) ?? 0) + r.homeScore);
    goalsFor.set(f.away, (goalsFor.get(f.away) ?? 0) + r.awayScore);
  }
  const teams = [...seen].map((t) => { const a = teamAggregate(t); a.goals = goalsFor.get(t) ?? 0; return a; });
  const top = (sel: (t: TeamAttack) => number) => teams.length ? [...teams].sort((x, y) => sel(y) - sel(x))[0] : null;
  return {
    teams: [...teams].sort((x, y) => y.goals - x.goals || y.xg - x.xg),
    bestAttack: top((t) => t.goals * 100 + t.xg),
    mostDangerous: top((t) => t.xg),
    mostBoxShots: top((t) => t.inside),
    mostWingThreat: top((t) => t.corners),
  };
}

// ── Next opponent (future-match intelligence) ────────────────────────────────
export interface NextMatch { opponent: string; opponentFlag: string; isHome: boolean; date: string }
export function nextOpponent(team: string, results: Record<string, FixtureResult> = FIXTURE_RESULTS): NextMatch | null {
  const upcoming = WC_FIXTURES
    .filter((f) => (f.home === team || f.away === team))
    .filter((f) => {
      const r = results[`${f.home}|${f.away}`];
      return !(r && r.status === 'FINISHED');
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const f = upcoming[0];
  if (!f) return null;
  const opponent = f.home === team ? f.away : f.home;
  return { opponent, opponentFlag: flagOf(opponent), isHome: f.home === team, date: f.date };
}
