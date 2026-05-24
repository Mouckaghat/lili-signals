import type { Match } from './demoData';
import type { Prediction } from './liliPrediction';
import { scorePrediction } from './scoring';

export interface SimulationRound {
  match: Match;
  userPrediction: Prediction;
  liliPrediction: Prediction;
  userPoints: number;
  liliPoints: number;
}

export interface SimulationSummary {
  rounds: SimulationRound[];
  userTotal: number;
  liliTotal: number;
  winner: 'user' | 'lili' | 'draw';
}

export function simulateRound(
  match: Match,
  userPrediction: Prediction,
  liliPrediction: Prediction
): SimulationRound | null {
  if (!match.score) return null;

  const actual = match.score;
  const userResult = scorePrediction(
    { home: userPrediction.predictedHome, away: userPrediction.predictedAway },
    actual
  );
  const liliResult = scorePrediction(
    { home: liliPrediction.predictedHome, away: liliPrediction.predictedAway },
    actual
  );

  return {
    match,
    userPrediction,
    liliPrediction,
    userPoints: userResult.points,
    liliPoints: liliResult.points,
  };
}

export function buildSummary(rounds: SimulationRound[]): SimulationSummary {
  const userTotal = rounds.reduce((s, r) => s + r.userPoints, 0);
  const liliTotal = rounds.reduce((s, r) => s + r.liliPoints, 0);
  const winner =
    userTotal > liliTotal ? 'user' : userTotal < liliTotal ? 'lili' : 'draw';
  return { rounds, userTotal, liliTotal, winner };
}

export function cumulativeScores(rounds: SimulationRound[]): {
  user: number[];
  lili: number[];
} {
  let userAcc = 0;
  let liliAcc = 0;
  const user: number[] = [];
  const lili: number[] = [];

  for (const r of rounds) {
    userAcc += r.userPoints;
    liliAcc += r.liliPoints;
    user.push(userAcc);
    lili.push(liliAcc);
  }

  return { user, lili };
}
