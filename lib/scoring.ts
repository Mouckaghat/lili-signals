export interface PredictionResult {
  exactScore: boolean;
  correctResult: boolean;
  points: number;
}

const POINTS_EXACT = 3;
const POINTS_RESULT = 1;

type Outcome = 'H' | 'D' | 'A';

function outcome(home: number, away: number): Outcome {
  if (home > away) return 'H';
  if (home < away) return 'A';
  return 'D';
}

export function scorePrediction(
  predicted: { home: number; away: number },
  actual: { home: number; away: number }
): PredictionResult {
  const exactScore =
    predicted.home === actual.home && predicted.away === actual.away;
  const correctResult =
    outcome(predicted.home, predicted.away) === outcome(actual.home, actual.away);

  let points = 0;
  if (exactScore) points = POINTS_EXACT;
  else if (correctResult) points = POINTS_RESULT;

  return { exactScore, correctResult, points };
}

export function totalScore(results: PredictionResult[]): number {
  return results.reduce((sum, r) => sum + r.points, 0);
}

export function accuracy(results: PredictionResult[]): {
  exactRate: number;
  resultRate: number;
} {
  if (results.length === 0) return { exactRate: 0, resultRate: 0 };
  const exactCount = results.filter((r) => r.exactScore).length;
  const resultCount = results.filter((r) => r.correctResult).length;
  return {
    exactRate: exactCount / results.length,
    resultRate: resultCount / results.length,
  };
}
