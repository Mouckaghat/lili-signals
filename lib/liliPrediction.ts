import type { Match } from './demoData';

export interface Prediction {
  matchId: string;
  predictedHome: number;
  predictedAway: number;
  confidence: number; // 0–1
  reasoning?: string;
  generatedAt: string;
}

export type PredictionPair = {
  match: Match;
  userPrediction: Prediction;
  liliPrediction: Prediction;
};

// Placeholder — returns a balanced 1-1 until the model is connected.
export function generateLiliPrediction(match: Match): Prediction {
  return {
    matchId: match.id,
    predictedHome: 1,
    predictedAway: 1,
    confidence: 0.4,
    reasoning: 'Balanced prediction — model not yet connected',
    generatedAt: new Date().toISOString(),
  };
}

export function generateUserPrediction(
  matchId: string,
  home: number,
  away: number
): Prediction {
  return {
    matchId,
    predictedHome: home,
    predictedAway: away,
    confidence: 1.0,
    generatedAt: new Date().toISOString(),
  };
}
