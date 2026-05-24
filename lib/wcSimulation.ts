// Monte Carlo simulation engine for World Cup 2026
// Runs entirely locally — no API calls during simulation.

import { getGroupTeams, getTeam, getTeamFixtures, WC_TEAMS, type WCTeam } from './wcData';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchPrediction {
  opponent: string;
  opponentFederation: string;
  matchday: 1 | 2 | 3;
  winProb: number;
  drawProb: number;
  lossProb: number;
  expectedPoints: number;
}

export interface WCSimResult {
  team: string;
  runs: number;
  matchPredictions: MatchPrediction[];   // group stage — one per match
  qualificationRate: number;
  round16Rate: number;
  quarterFinalRate: number;
  semiFinalRate: number;
  finalRate: number;
  winnerRate: number;
  mostCommonElimination: string;
  mostDangerousOpponent: string;
  liliReasoning: string;
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Returns [winProb, drawProb, lossProb] for team A.
 * Uses a sigmoid on the strength difference — symmetric, bounded.
 */
function matchProbs(sA: number, sB: number): [number, number, number] {
  const diff = (sA - sB) / 25;
  const rawWin = sigmoid(diff);

  // Draw probability peaks at 0.28 when evenly matched, tapers off
  const absDiff = Math.abs(sA - sB);
  const draw = Math.max(0.08, 0.28 - absDiff * 0.003);

  const adj = 1 - draw;
  const win = rawWin * adj;
  const loss = adj - win;
  return [win, draw, loss];
}

/** Knockout match (no draw): returns true if team A wins. */
function knockoutWin(sA: number, sB: number): boolean {
  const [winProb] = matchProbs(sA, sB);
  // Normalise to a 2-outcome race (no draw possible)
  const p = winProb / (winProb + (1 - winProb - matchProbs(sA, sB)[1]));
  return Math.random() < p;
}

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Draw a knockout opponent from all teams outside the selected group.
 * Weighted by strength² → stronger teams more likely to appear.
 */
function drawKnockoutOpponent(excludeGroup: string, excludeTeam: string): WCTeam {
  const pool = WC_TEAMS.filter(
    (t) => t.group !== excludeGroup && t.name !== excludeTeam
  );
  const totalW = pool.reduce((s, t) => s + t.strength * t.strength, 0);
  let r = Math.random() * totalW;
  for (const t of pool) {
    r -= t.strength * t.strength;
    if (r <= 0) return t;
  }
  return pool[pool.length - 1];
}

// ─── Qualification probability from group-stage points ────────────────────────
// Reflects the 48-team format: top-2 qualify, + 8 best 3rd-place teams.

function qualifyProb(pts: number): number {
  if (pts >= 7) return 0.99;
  if (pts === 6) return 0.85;
  if (pts === 5) return 0.52;
  if (pts === 4) return 0.18;
  if (pts === 3) return 0.05;
  return 0.01;
}

// ─── Lili reasoning generator ─────────────────────────────────────────────────

function buildReasoning(
  team: string,
  preds: MatchPrediction[],
  result: Omit<WCSimResult, 'liliReasoning' | 'matchPredictions'>
): string {
  const topMatch = [...preds].sort((a, b) => b.winProb - a.winProb)[0];
  const toughMatch = [...preds].sort((a, b) => a.winProb - b.winProb)[0];
  const qPct = Math.round(result.qualificationRate * 100);
  const wPct = (result.winnerRate * 100).toFixed(1);
  const danger = result.mostDangerousOpponent;

  return (
    `${team} qualifies in ${qPct}% of runs. ` +
    `Strongest opportunity: ${topMatch.opponent} (${Math.round(topMatch.winProb * 100)}% win). ` +
    `Biggest test: ${toughMatch.opponent} (${Math.round(toughMatch.winProb * 100)}% win). ` +
    `Most dangerous knockout threat: ${danger}. ` +
    `Tournament winner in ${wPct}% of simulations.`
  );
}

// ─── Main simulation ──────────────────────────────────────────────────────────

export function buildMatchPredictions(teamName: string): MatchPrediction[] {
  const team = getTeam(teamName);
  if (!team) return [];

  const fixtures = getTeamFixtures(teamName);
  return fixtures.map((f) => {
    const opponentName = f.home === teamName ? f.away : f.home;
    const opponent = getTeam(opponentName);
    const [w, d, l] = opponent
      ? matchProbs(team.strength, opponent.strength)
      : [0.33, 0.34, 0.33];

    return {
      opponent: opponentName,
      opponentFederation: opponent?.federation ?? '?',
      matchday: f.matchday,
      winProb: w,
      drawProb: d,
      lossProb: l,
      expectedPoints: w * 3 + d * 1,
    };
  });
}

export function runWCSimulation(teamName: string, N: number): WCSimResult {
  const team = getTeam(teamName);
  if (!team) throw new Error(`Unknown team: ${teamName}`);

  const preds = buildMatchPredictions(teamName);

  let qualified = 0;
  let r16 = 0;
  let qf = 0;
  let sf = 0;
  let final = 0;
  let winner = 0;

  const elimRound: Record<string, number> = {};
  const elimOpponent: Record<string, number> = {};

  function bump(d: Record<string, number>, k: string) {
    d[k] = (d[k] ?? 0) + 1;
  }

  for (let i = 0; i < N; i++) {
    // ── Group stage ──────────────────────────────────────────────
    let pts = 0;
    for (const p of preds) {
      const r = Math.random();
      if (r < p.winProb) pts += 3;
      else if (r < p.winProb + p.drawProb) pts += 1;
    }

    if (Math.random() > qualifyProb(pts)) {
      bump(elimRound, 'Group stage');
      continue;
    }
    qualified++;

    // ── Knockout rounds ──────────────────────────────────────────
    const rounds = ['Round of 16', 'Quarter-final', 'Semi-final', 'Final'] as const;
    let stillIn = true;

    for (const round of rounds) {
      const opp = drawKnockoutOpponent(team.group, teamName);
      if (!knockoutWin(team.strength, opp.strength)) {
        bump(elimRound, round);
        bump(elimOpponent, opp.name);
        stillIn = false;
        break;
      }
      // Passed this round
      if (round === 'Round of 16') r16++;
      if (round === 'Quarter-final') qf++;
      if (round === 'Semi-final') sf++;
      if (round === 'Final') final++;
    }
    if (stillIn) winner++;
  }

  const mostCommonElim =
    Object.entries(elimRound).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Group stage';
  const mostDangerousOpp =
    Object.entries(elimOpponent).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';

  const partial: Omit<WCSimResult, 'liliReasoning' | 'matchPredictions'> = {
    team: teamName,
    runs: N,
    qualificationRate: qualified / N,
    round16Rate: r16 / N,
    quarterFinalRate: qf / N,
    semiFinalRate: sf / N,
    finalRate: final / N,
    winnerRate: winner / N,
    mostCommonElimination: mostCommonElim,
    mostDangerousOpponent: mostDangerousOpp,
  };

  return {
    ...partial,
    matchPredictions: preds,
    liliReasoning: buildReasoning(teamName, preds, partial),
  };
}
