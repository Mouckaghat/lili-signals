// Home Edge Tracker — does being the HOME team in a fixture confer an edge in
// THIS tournament? (Not about the three host nations.) Pure + dependency-free
// of the simulation so the prediction engine can consume it without a cycle.
//
// Honest model: the per-match impact mirrors wcSimulation.matchProbs exactly
// (sigmoid on strength-diff/25), so "Home Edge Impact %" is the real change in
// the home team's win probability that the +points bonus produces.

import { FIXTURE_RESULTS, type FixtureResult } from './fixtureResultsData';
import { WC_FIXTURES, WC_TEAMS } from './wcData';
import { FIXTURE_STADIUM_ID, getStadium } from './stadiumData';

const clamp = (lo: number, hi: number, n: number) => (n < lo ? lo : n > hi ? hi : n);

export type HomeEdgeRating = 'weak' | 'moderate' | 'strong';
export type HomeEdgeResult = 'Home Win' | 'Away Win' | 'Neutral';

export interface HomeEdgeMatch {
  fixtureId: string;
  date: string;
  matchday: number;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  winner: string | null;
  venue: string;
  city: string;
  capacity: number;
  result: HomeEdgeResult;
  edgeImpactPct: number; // modelled bump to home win probability (percentage points)
}

export interface MatchdayTrend { matchday: number; home: number; away: number; draw: number; homeWinRate: number }

export interface HomeEdge {
  completed: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  homeWinRate: number;     // 0..1
  rating: HomeEdgeRating;
  edgePoints: number;      // 0..5 — strength bonus applied to the HOME team in predictions
  commentary: string;
  matches: HomeEdgeMatch[];
  byMatchday: MatchdayTrend[];
}

const strengthOf = (name: string) => WC_TEAMS.find((t) => t.name === name)?.strength ?? 70;

// Home win probability — identical formula to wcSimulation.matchProbs (kept local
// to avoid a circular import; both must stay in sync).
function homeWinProb(sHome: number, sAway: number): number {
  const raw     = 1 / (1 + Math.exp(-(sHome - sAway) / 25));
  const drawAdj = 1 - Math.max(0.08, 0.28 - Math.abs(sHome - sAway) * 0.003);
  return raw * drawAdj;
}

function rate2Rating(rate: number): HomeEdgeRating {
  if (rate > 0.55) return 'strong';
  if (rate >= 0.45) return 'moderate';
  return 'weak';
}

/**
 * Strength bonus (0..5) applied to the home team in predictions. Grows with the
 * observed home-win rate AND with sample size (confidence ramps over the first
 * ~12 completed matches), and is hard-capped at +5 so it can never dominate.
 */
export function homeEdgePoints(results: Record<string, FixtureResult> = FIXTURE_RESULTS): number {
  let homeWins = 0, completed = 0;
  for (const f of WC_FIXTURES) {
    const r = results[`${f.home}|${f.away}`];
    if (!r || r.status !== 'FINISHED') continue;
    completed++;
    if (r.winner === f.home) homeWins++;
  }
  if (completed === 0) return 0;
  const rate = homeWins / completed;
  const confidence = Math.min(1, completed / 12);
  return Math.round(clamp(0, 5, (rate - 0.45) * 17) * confidence * 10) / 10;
}

export function computeHomeEdge(results: Record<string, FixtureResult> = FIXTURE_RESULTS): HomeEdge {
  const edgePoints = homeEdgePoints(results);
  let homeWins = 0, awayWins = 0, draws = 0;
  const matches: HomeEdgeMatch[] = [];
  const md: Record<number, { home: number; away: number; draw: number }> = {};

  for (const f of WC_FIXTURES) {
    const r = results[`${f.home}|${f.away}`];
    if (!r || r.status !== 'FINISHED') continue;

    let result: HomeEdgeResult;
    if (r.winner === f.home)      { homeWins++; result = 'Home Win'; }
    else if (r.winner === f.away) { awayWins++; result = 'Away Win'; }
    else                          { draws++;    result = 'Neutral';  }

    md[f.matchday] ??= { home: 0, away: 0, draw: 0 };
    if (result === 'Home Win') md[f.matchday].home++;
    else if (result === 'Away Win') md[f.matchday].away++;
    else md[f.matchday].draw++;

    const stadium = getStadium(FIXTURE_STADIUM_ID[f.stadium] ?? '');
    const sHome = strengthOf(f.home), sAway = strengthOf(f.away);
    const impact = (homeWinProb(sHome + edgePoints, sAway) - homeWinProb(sHome, sAway)) * 100;

    matches.push({
      fixtureId: f.id, date: f.date, matchday: f.matchday,
      home: f.home, away: f.away,
      homeScore: r.homeScore ?? null, awayScore: r.awayScore ?? null,
      winner: r.winner ?? null,
      venue: stadium?.shortName ?? f.stadium, city: f.city,
      capacity: stadium?.capacity ?? 0,
      result,
      edgeImpactPct: Math.round(impact * 10) / 10,
    });
  }

  const completed = homeWins + awayWins + draws;
  const homeWinRate = completed > 0 ? homeWins / completed : 0;
  const rating = rate2Rating(homeWinRate);
  const pct = Math.round(homeWinRate * 100);

  const tail = completed < 6
    ? 'Too few matches to call it yet.'
    : rating === 'strong'   ? 'A measurable Home Edge is emerging.'
    : rating === 'moderate' ? 'A mild home effect is visible.'
    : 'No clear home advantage so far.';
  const commentary = `Home teams currently win ${pct}% of matches. ${tail}`;

  const byMatchday: MatchdayTrend[] = Object.keys(md)
    .map(Number).sort((a, b) => a - b)
    .map((m) => {
      const c = md[m]; const tot = c.home + c.away + c.draw;
      return { matchday: m, home: c.home, away: c.away, draw: c.draw, homeWinRate: tot ? c.home / tot : 0 };
    });

  return { completed, homeWins, awayWins, draws, homeWinRate, rating, edgePoints, commentary, matches, byMatchday };
}
