// Match Overview model — "why did this team win, and what does it mean for the
// World Cup?" Pure + real data: match stats, events, standings.

import type { MatchStats, TeamMatchStats } from './matchStatsData';
import { FIXTURE_RESULTS, type FixtureResult } from './fixtureResultsData';
import { WC_FIXTURES, WC_TEAMS } from './wcData';
import { FIXTURE_STADIUM_ID, getStadium } from './stadiumData';
import { MATCH_EVENTS } from './matchEventsData';
import { GROUP_STANDINGS } from './standingsData';
import { buildHeatGrid } from './heatmap';
import { HEATMAP_I18N, hmT, type HeatmapI18n } from './heatmapI18n';

const flagOf = (t: string) => WC_TEAMS.find((x) => x.name === t)?.flag ?? '🏳';
const share = (h: number, a: number) => (h + a > 0 ? h / (h + a) : 0.5);

export interface StatPair { label: string; home: string; away: string; hShare: number }
export interface OverviewEvent { icon: string; minute: number; side: 'home' | 'away' }
export interface TeamImpact { rank: number; points: number; gd: number; qualPct: number }
export interface Overview {
  home: string; away: string; homeFlag: string; awayFlag: string;
  homeScore: number | null; awayScore: number | null;
  status: 'FINAL' | 'LIVE' | 'UPCOMING';
  group: string; venue: string; city: string; capacity: number; dateStr: string;
  totalGoals: number | null;
  stats: StatPair[];
  controlHome: number; controlAway: number;
  verdict: { icon: string; text: string };
  matchProfile: { icon: string; text: string };
  headline: string;
  drivers: string[];
  lili: string;
  events: OverviewEvent[];
  impactHome: TeamImpact | null; impactAway: TeamImpact | null;
}

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(iso: string) { const d = new Date(iso); return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`; }

const dangerous = (s: TeamMatchStats) => (s.shotsInsideBox || 0) + (s.shotsOnGoal || 0) + Math.round((s.xg || 0) * 2);

// rough qualification probability from projected final points
function qualPct(pts: number, played: number): number {
  const proj = played > 0 ? pts + (3 - played) * (pts / played) : pts;
  const p = proj >= 7 ? 0.97 : proj >= 6 ? 0.85 : proj >= 5 ? 0.6 : proj >= 4 ? 0.32 : proj >= 3 ? 0.12 : 0.03;
  return Math.round(p * 100);
}
function impactFor(team: string): TeamImpact | null {
  const s = GROUP_STANDINGS.find((x) => x.team === team);
  if (!s) return null;
  return { rank: s.rank, points: s.pts, gd: s.gd, qualPct: qualPct(s.pts, s.played) };
}

export function computeOverview(match: MatchStats, results: Record<string, FixtureResult> = FIXTURE_RESULTS, t: HeatmapI18n = HEATMAP_I18N.EN): Overview {
  const f = WC_FIXTURES.find((x) => x.id === match.fixtureId);
  const r = results[`${match.home}|${match.away}`];
  const stadium = f ? getStadium(FIXTURE_STADIUM_ID[f.stadium] ?? '') : undefined;
  const h = match.homeStats, a = match.awayStats;

  const status: Overview['status'] = match.status === 'LIVE' ? 'LIVE' : r?.status === 'FINISHED' || match.status === 'FINISHED' ? 'FINAL' : 'UPCOMING';

  const stats: StatPair[] = [
    { label: t.statPossession, home: `${Math.round(h.possession * 100)}%`, away: `${Math.round(a.possession * 100)}%`, hShare: h.possession },
    { label: t.statShots,      home: `${h.totalShots}`,  away: `${a.totalShots}`,  hShare: share(h.totalShots, a.totalShots) },
    { label: t.statSoT,        home: `${h.shotsOnGoal}`, away: `${a.shotsOnGoal}`, hShare: share(h.shotsOnGoal, a.shotsOnGoal) },
    { label: t.statCorners,    home: `${h.corners}`,     away: `${a.corners}`,     hShare: share(h.corners, a.corners) },
    { label: t.statPasses,     home: `${h.passes ?? '—'}`, away: `${a.passes ?? '—'}`, hShare: share(h.passes ?? 0, a.passes ?? 0) },
    { label: t.statPassAcc,    home: `${Math.round(h.passAccuracy * 100)}%`, away: `${Math.round(a.passAccuracy * 100)}%`, hShare: share(h.passAccuracy, a.passAccuracy) },
    { label: t.statXg,         home: h.xg.toFixed(1),    away: a.xg.toFixed(1),    hShare: share(h.xg, a.xg) },
  ];

  // Control index
  const tShare = (() => {
    const hg = buildHeatGrid(h, 'ltr').share, ag = buildHeatGrid(a, 'rtl').share;
    return share(hg, ag);
  })();
  const c01 = 0.18 * h.possession + 0.18 * share(h.totalShots, a.totalShots) + 0.14 * share(h.shotsOnGoal, a.shotsOnGoal)
    + 0.20 * share(h.xg, a.xg) + 0.15 * tShare + 0.15 * share(dangerous(h), dangerous(a));
  const controlHome = Math.round(c01 * 100);
  const controlAway = 100 - controlHome;

  const winnerIsHome = controlHome >= 50;
  const winner = winnerIsHome ? match.home : match.away;
  const loser = winnerIsHome ? match.away : match.home;
  const diff = Math.abs(controlHome - 50);

  // Score-derived facts (only when the match is final / has a recorded score).
  const homeScore = r?.homeScore ?? null;
  const awayScore = r?.awayScore ?? null;
  const totalGoals = homeScore != null && awayScore != null ? homeScore + awayScore : null;
  const scoreWinner = homeScore != null && awayScore != null
    ? (homeScore > awayScore ? match.home : awayScore > homeScore ? match.away : null) // null = draw
    : null;
  const winnerGoals = scoreWinner ? (scoreWinner === match.home ? homeScore! : awayScore!) : null;
  const winnerXg = scoreWinner ? (scoreWinner === match.home ? h.xg : a.xg) : null;

  // Premium verdict badge — strictly from real signals (control margin + score +
  // goals vs xG). Ordered by specificity; no exaggeration beyond the data.
  let verdict: { icon: string; text: string };
  if (scoreWinner && scoreWinner !== winner && diff >= 10) {
    verdict = { icon: '🎭', text: t.vbSurprise };                                   // scoreboard contradicts control
  } else if (diff >= 22) {
    verdict = { icon: '🌪', text: t.vbOneWay };                                     // territorial domination
  } else if (scoreWinner && scoreWinner === winner && diff >= 14) {
    verdict = { icon: '🔥', text: t.vbStatement };                                  // controlled and won
  } else if (scoreWinner && winnerGoals != null && winnerXg != null && winnerGoals >= Math.ceil(winnerXg) && diff < 14) {
    verdict = { icon: '⚡', text: t.vbClinical };                                   // efficient finishing
  } else if (totalGoals != null && totalGoals <= 1 && diff < 14) {
    verdict = { icon: '🧱', text: t.vbDefensive };                                  // low-scoring, tight
  } else {
    verdict = { icon: '⚖', text: t.vbBalanced };
  }

  // Match profile (stadium block) — from goals scored + control margin only.
  const matchProfile = totalGoals != null && totalGoals >= 3 ? { icon: '⚡', text: t.mpGoalFriendly }
    : totalGoals != null && totalGoals <= 1 ? { icon: '🧱', text: t.mpDefensiveNight }
    : diff >= 20 ? { icon: '🔥', text: t.mpHighControl }
    : { icon: '🎭', text: t.mpBalanced };

  // Drivers — pick the largest real gaps
  const cand: { gap: number; text: string }[] = [];
  const sH = winnerIsHome ? h : a, sL = winnerIsHome ? a : h;
  const ratio = (sL.totalShots || 1) > 0 ? sH.totalShots / Math.max(sL.totalShots, 1) : 1;
  if (ratio >= 1.8) cand.push({ gap: ratio, text: hmT(t.drvShots, { winner, ratio: ratio.toFixed(ratio >= 3 ? 0 : 1), hi: sH.totalShots, lo: sL.totalShots }) });
  if (Math.abs(h.possession - 0.5) >= 0.12) cand.push({ gap: Math.abs(h.possession - 0.5) * 10, text: hmT(t.drvPossession, { team: winnerIsHome ? match.home : match.away, pct: Math.round((winnerIsHome ? h.possession : a.possession) * 100) }) });
  if (sH.shotsOnGoal - sL.shotsOnGoal >= 3) cand.push({ gap: sH.shotsOnGoal - sL.shotsOnGoal, text: hmT(t.drvSoT, { winner, hi: sH.shotsOnGoal, lo: sL.shotsOnGoal }) });
  if (sL.shotsInsideBox <= 4) cand.push({ gap: 5 - sL.shotsInsideBox, text: hmT(t.drvFewBox, { loser, n: sL.shotsInsideBox }) });
  if (sH.xg - sL.xg >= 1) cand.push({ gap: sH.xg - sL.xg, text: hmT(t.drvXg, { winner, hi: sH.xg.toFixed(1), lo: sL.xg.toFixed(1) }) });
  const drivers = cand.sort((x, y) => y.gap - x.gap).slice(0, 3).map((c) => c.text);

  // Lili
  const sc = r && r.homeScore != null ? `${r.homeScore}-${r.awayScore}` : '';
  const lili = diff >= 22
    ? hmT(t.liliDominated, { winner, loser, tail: sc ? hmT(t.deservedScore, { sc }) : t.deservedResult })
    : diff >= 10
    ? hmT(t.liliEdged, { winner, loser, control: winnerIsHome ? controlHome : controlAway })
    : t.liliEven;

  // Punchy headline = the first sentence of Lili's (already-localised) analysis.
  // Reuses translated prose, so it adds emotion with zero fabrication and no new
  // per-language strings. Handles Latin (. ! ?) and CJK (。！？) sentence stops.
  const headMatch = lili.match(/^[\s\S]*?[.!?。！？]/);
  const headline = headMatch ? headMatch[0].trim() : lili;

  // Events
  const ev = MATCH_EVENTS.find((e) => e.fixtureId === match.fixtureId);
  const events: OverviewEvent[] = ev ? [
    ...ev.goals.map((g) => ({ icon: '⚽', minute: g.minute, side: (g.team === match.home ? 'home' : 'away') as 'home' | 'away' })),
    ...ev.yellowCards.map((c) => ({ icon: '🟨', minute: c.minute ?? 0, side: (c.team === match.home ? 'home' : 'away') as 'home' | 'away' })),
    ...ev.redCards.map((c) => ({ icon: '🟥', minute: c.minute ?? 0, side: (c.team === match.home ? 'home' : 'away') as 'home' | 'away' })),
  ].sort((x, y) => x.minute - y.minute) : [];

  return {
    home: match.home, away: match.away, homeFlag: flagOf(match.home), awayFlag: flagOf(match.away),
    homeScore: r?.homeScore ?? null, awayScore: r?.awayScore ?? null, status,
    group: f?.group ?? '?', venue: stadium?.shortName ?? f?.stadium ?? '', city: f?.city ?? '',
    capacity: stadium?.capacity ?? 0, dateStr: f ? fmtDate(f.date) : '',
    totalGoals,
    stats, controlHome, controlAway, verdict, matchProfile, headline, drivers, lili, events,
    impactHome: impactFor(match.home), impactAway: impactFor(match.away),
  };
}
