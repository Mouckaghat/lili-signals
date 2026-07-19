// Shots / Danger model — "who created the better chances, and did the score
// reflect them?" Real data: team shot splits (in/out box, on target, xG) +
// per-player saves + results. We have NO shot coordinates, so the map plots by
// AREA (box vs outside), never fake pixel-exact locations.

import { MATCH_STATS, type TeamMatchStats, type MatchStats } from './matchStatsData';
import { PLAYER_MATCH_STATS } from './playerStatsData';
import { FIXTURE_RESULTS, type FixtureResult } from './fixtureResultsData';
import { WC_TEAMS } from './wcData';
import { nextOpponent } from './attackZones';
import { HEATMAP_I18N, hmT, type HeatmapI18n } from './heatmapI18n';

const flagOf = (t: string) => WC_TEAMS.find((x) => x.name === t)?.flag ?? '🏳';
const clamp = (lo: number, hi: number, n: number) => (n < lo ? lo : n > hi ? hi : n);

export interface ShotTeam {
  team: string; flag: string;
  shots: number; sot: number; off: number; goals: number;
  conversionPct: number; xg: number; inside: number; outside: number;
  danger: number;
  effPct: number; effLabel: string; effIcon: string;
}
export interface GkLine { saves: number; xga: number; conceded: number; prevented: number; index: number; label: string; icon: string }
export interface ShotsMatch { home: ShotTeam; away: ShotTeam; gkHome: GkLine; gkAway: GkLine; lili: string }

export function dangerIndex(s: TeamMatchStats, goals: number): number {
  return Math.min(99, Math.round(((s.totalShots || 0) + (s.shotsOnGoal || 0) * 2 + goals * 5 + (s.xg || 0) * 8) * 0.8));
}
function finishing(goals: number, xg: number) {
  const pct = Math.round(((goals - xg) / Math.max(xg, 0.3)) * 100);
  if (pct >= 30) return { effPct: pct, effLabel: 'Clinical Finishing', effIcon: '🔥' };
  if (pct <= -30) return { effPct: pct, effLabel: 'Wasteful Finishing', effIcon: '❄' };
  return { effPct: pct, effLabel: 'As Expected', effIcon: '⚖' };
}
function gkSaves(fixtureId: string, team: string): number {
  return PLAYER_MATCH_STATS.filter((p) => p.fixtureId === fixtureId && p.team === team && p.pos === 'GK')
    .reduce((n, p) => n + (p.saves || 0), 0);
}
function gkLine(saves: number, xga: number, conceded: number, L: HeatmapI18n): GkLine {
  const prevented = +(xga - conceded).toFixed(1);
  const index = Math.round(clamp(35, 99, 58 + prevented * 12 + saves * 1.5));
  const out = prevented >= 1.5 ? { label: L.gkHeroics, icon: '🧤' }
    : prevented <= -1 ? { label: L.gkBeaten, icon: '🩹' }
    : { label: L.gkSolid, icon: '🧱' };
  return { saves, xga, conceded, prevented, index, ...out };
}

function teamLine(team: string, s: TeamMatchStats, goals: number): ShotTeam {
  const shots = s.totalShots || 0, sot = s.shotsOnGoal || 0;
  const fin = finishing(goals, s.xg || 0);
  return {
    team, flag: flagOf(team), shots, sot, off: Math.max(0, shots - sot), goals,
    conversionPct: shots ? Math.round((goals / shots) * 100) : 0,
    xg: s.xg || 0, inside: s.shotsInsideBox || 0, outside: s.shotsOutsideBox || 0,
    danger: dangerIndex(s, goals), ...fin,
  };
}

// Takes the LIVE match object the screen already holds (MatchStats from
// useLiveStats) — NOT a re-lookup from the baked MATCH_STATS by id. A live or
// knockout game isn't in the baked array (knockouts live in a separate export,
// live games only in the runtime overlay), so re-fetching by id returned null
// and the shots map showed "no data" exactly when it mattered. Use the object
// we're handed (the recurring lesson) so it also refreshes as shots increment.
export function shotsMatch(match: MatchStats, results: Record<string, FixtureResult> = FIXTURE_RESULTS, L: HeatmapI18n = HEATMAP_I18N.EN): ShotsMatch | null {
  const m = match;
  if (!m || !m.homeStats || !m.awayStats) return null;
  const r = results[`${m.home}|${m.away}`];
  const hg = r?.homeScore ?? 0, ag = r?.awayScore ?? 0;
  const home = teamLine(m.home, m.homeStats, hg);
  const away = teamLine(m.away, m.awayStats, ag);
  const gkHome = gkLine(gkSaves(m.fixtureId, m.home), m.awayStats.xg || 0, ag, L); // home GK faces away xG, concedes away goals
  const gkAway = gkLine(gkSaves(m.fixtureId, m.away), m.homeStats.xg || 0, hg, L);

  const [dom, sub] = home.danger >= away.danger ? [home, away] : [away, home];
  const finClause = dom.effIcon === '🔥' ? hmT(L.shClinical, { dom: dom.team })
    : dom.effIcon === '❄' ? hmT(L.shWasteful, { dom: dom.team })
    : L.shMatched;
  const scoreSentence = dom.goals > sub.goals ? hmT(L.shScoreEdge, { dom: dom.team }) : L.shScoreFlattered;
  const lili = hmT(L.shLili, {
    dom: dom.team, shots: dom.shots, sot: dom.sot, xg: dom.xg.toFixed(1), sub: sub.shots,
    inside: dom.inside, finClause, scoreSentence,
  });

  return { home, away, gkHome, gkAway, lili };
}

// ── Tournament rankings ──────────────────────────────────────────────────────
export interface ShotRank { team: string; flag: string; value: number; sub?: string }
// theWall = "The Wall": the meanest defences — teams that have conceded the
// fewest goals across their FINISHED matches (honest: only counts played games,
// tie-break by fewest-per-game so more games with the same total ranks higher).
export interface ShotRankings { mostGoals: ShotRank[]; mostSot: ShotRank[]; highestDanger: ShotRank[]; toughestGk: ShotRank[]; theWall: ShotRank[] }

export function shotRankings(results: Record<string, FixtureResult> = FIXTURE_RESULTS): ShotRankings {
  const teams = new Set<string>();
  for (const m of MATCH_STATS) { teams.add(m.home); teams.add(m.away); }
  const goalsFor = new Map<string, number>();
  const goalsAgainst = new Map<string, number>();
  const played = new Map<string, number>();
  for (const k in results) {
    const r = results[k]; if (r.status !== 'FINISHED' || r.homeScore == null) continue;
    const [h, a] = k.split('|');
    const ag = r.awayScore ?? 0;
    goalsFor.set(h, (goalsFor.get(h) ?? 0) + r.homeScore); goalsFor.set(a, (goalsFor.get(a) ?? 0) + ag);
    goalsAgainst.set(h, (goalsAgainst.get(h) ?? 0) + ag); goalsAgainst.set(a, (goalsAgainst.get(a) ?? 0) + r.homeScore);
    played.set(h, (played.get(h) ?? 0) + 1); played.set(a, (played.get(a) ?? 0) + 1);
  }
  const agg = [...teams].map((t) => {
    let sot = 0, danger = 0, saves = 0, xga = 0, conceded = 0;
    for (const m of MATCH_STATS) {
      const me = m.home === t ? m.homeStats : m.away === t ? m.awayStats : null;
      if (!me) continue;
      const oppGoals = m.home === t ? (results[`${m.home}|${m.away}`]?.awayScore ?? 0) : (results[`${m.home}|${m.away}`]?.homeScore ?? 0);
      const opp = m.home === t ? m.awayStats : m.homeStats;
      const myGoals = m.home === t ? (results[`${m.home}|${m.away}`]?.homeScore ?? 0) : (results[`${m.home}|${m.away}`]?.awayScore ?? 0);
      sot += me.shotsOnGoal || 0; danger += dangerIndex(me, myGoals);
      saves += gkSaves(m.fixtureId, t); xga += opp.xg || 0; conceded += oppGoals;
    }
    return { team: t, flag: flagOf(t), goals: goalsFor.get(t) ?? 0, sot, danger, saves, prevented: +(xga - conceded).toFixed(1) };
  });
  const top = (sel: (x: typeof agg[number]) => number, sub?: (x: typeof agg[number]) => string) =>
    [...agg].sort((a, b) => sel(b) - sel(a)).slice(0, 5).map((x) => ({ team: x.team, flag: x.flag, value: Math.round(sel(x)), sub: sub?.(x) }));
  // The Wall — fewest goals conceded (ascending). Only teams that have played;
  // tie-break by fewest conceded per game, then by more games played.
  const theWall: ShotRank[] = [...played.keys()]
    .map((t) => { const ga = goalsAgainst.get(t) ?? 0, gp = played.get(t) ?? 1; return { team: t, ga, gp }; })
    .sort((a, b) => (a.ga - b.ga) || (a.ga / a.gp - b.ga / b.gp) || (b.gp - a.gp))
    .slice(0, 5)
    .map((x) => ({ team: x.team, flag: flagOf(x.team), value: x.ga, sub: `${x.ga} in ${x.gp}` }));
  return {
    mostGoals: top((x) => x.goals),
    mostSot: top((x) => x.sot),
    highestDanger: top((x) => x.danger),
    toughestGk: top((x) => x.prevented * 10 + x.saves, (x) => `${x.saves} saves`),
    theWall,
  };
}

// ── Future match ─────────────────────────────────────────────────────────────
export interface ShotFuture { opponent: string; opponentFlag: string; team: TeamAgg; opp: TeamAgg | null }
export interface TeamAgg { danger: number; effPct: number; gkIndex: number }
function teamAgg(team: string, results: Record<string, FixtureResult>): TeamAgg | null {
  let n = 0, danger = 0, goals = 0, xg = 0, saves = 0, xga = 0, conceded = 0;
  for (const m of MATCH_STATS) {
    const me = m.home === team ? m.homeStats : m.away === team ? m.awayStats : null;
    if (!me) continue;
    const r = results[`${m.home}|${m.away}`];
    const myGoals = m.home === team ? (r?.homeScore ?? 0) : (r?.awayScore ?? 0);
    const oppGoals = m.home === team ? (r?.awayScore ?? 0) : (r?.homeScore ?? 0);
    const opp = m.home === team ? m.awayStats : m.homeStats;
    n++; danger += dangerIndex(me, myGoals); goals += myGoals; xg += me.xg || 0;
    saves += gkSaves(m.fixtureId, team); xga += opp.xg || 0; conceded += oppGoals;
  }
  if (!n) return null;
  const effPct = Math.round(((goals - xg) / Math.max(xg, 0.3)) * 100);
  const gkIndex = Math.round(clamp(35, 99, 58 + (xga - conceded) * 12 + (saves / n) * 1.5));
  return { danger: Math.round(danger / n), effPct, gkIndex };
}
export function shotFuture(team: string, results: Record<string, FixtureResult> = FIXTURE_RESULTS): ShotFuture | null {
  const next = nextOpponent(team, results);
  if (!next) return null;
  const t = teamAgg(team, results);
  if (!t) return null;
  return { opponent: next.opponent, opponentFlag: next.opponentFlag, team: t, opp: teamAgg(next.opponent, results) };
}
