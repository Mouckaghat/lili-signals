import * as FileSystem from 'expo-file-system/legacy';

// ─── Constants ────────────────────────────────────────────────────────────────

export const LILI_MODEL_VERSION = 'lili-v1.0';
const SCHEMA_VERSION = '1.0' as const;

const BRAIN_BASE = (FileSystem.documentDirectory ?? '') + 'lili_brain/';

const FOLDERS = {
  predictions: BRAIN_BASE + 'lili_predictions/',
  simulations: BRAIN_BASE + 'lili_simulations/',
  results:     BRAIN_BASE + 'actual_results/',
  analysis:    BRAIN_BASE + 'analysis/',
  config:      BRAIN_BASE + 'config/',
} as const;

// ─── Schema types ─────────────────────────────────────────────────────────────

/**
 * Lili's match prediction.
 * Captures what the model predicted, why, and how confident it was.
 * No personal data — source is always "lili".
 */
export interface LiliPrediction {
  schema_version: '1.0';
  prediction_id: string;
  created_at: string;
  source: 'lili';
  model_version: string;
  match_id: string;
  team_a: string;
  team_b: string;
  federation_a: string;
  federation_b: string;
  predicted_winner: 'team_a' | 'team_b' | 'draw';
  predicted_score: { a: number; b: number };
  confidence: number;        // 0.0 – 1.0
  reasoning_short: string;
  signal_notes: string[];
}

/**
 * Monte Carlo tournament simulation summary for one team.
 * Stores the distribution over N runs, not individual run records.
 * No personal data — source is always "lili".
 */
export interface SimulationSummary {
  schema_version: '1.0';
  simulation_id: string;
  created_at: string;
  source: 'lili';
  model_version: string;
  team: string;
  runs: number;
  qualification_probability: number;
  round_of_16_probability: number;
  quarter_final_probability: number;
  semi_final_probability: number;
  final_probability: number;
  winner_probability: number;
  most_common_elimination: string;
  most_dangerous_opponent: string;
  lili_reasoning: string;
}

/**
 * Anonymous comparison event: human prediction vs Lili, no identity attached.
 * Stored only for aggregate accuracy analysis — no names, devices, or profiles.
 */
export interface AnonymousComparisonEvent {
  schema_version: '1.0';
  event_id: string;
  created_at: string;
  source: 'human_anonymous';
  match_id: string;
  human_predicted_score: { a: number; b: number };
  lili_predicted_score: { a: number; b: number };
  actual_score?: { a: number; b: number };
  human_points?: number;
  lili_points?: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function monthTag(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function ensureFolder(folder: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(folder);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  }
}

async function appendRecord<T>(folder: string, filename: string, record: T): Promise<void> {
  await ensureFolder(folder);
  const path = folder + filename;
  const line = JSON.stringify(record) + '\n';
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    const existing = await FileSystem.readAsStringAsync(path);
    await FileSystem.writeAsStringAsync(path, existing + line);
  } else {
    await FileSystem.writeAsStringAsync(path, line);
  }
}

// ─── Public append helpers ────────────────────────────────────────────────────

export async function appendLiliPrediction(prediction: LiliPrediction): Promise<void> {
  await appendRecord(FOLDERS.predictions, `${monthTag()}.jsonl`, prediction);
}

export async function appendSimulationSummary(summary: SimulationSummary): Promise<void> {
  await appendRecord(FOLDERS.simulations, `${monthTag()}.jsonl`, summary);
}

export async function appendComparisonEvent(event: AnonymousComparisonEvent): Promise<void> {
  await appendRecord(FOLDERS.results, `${monthTag()}.jsonl`, event);
}

// ─── Public read helper ───────────────────────────────────────────────────────

export async function readJsonlFile<T>(
  folder: keyof typeof FOLDERS,
  filename: string
): Promise<T[]> {
  await ensureFolder(FOLDERS[folder]);
  const path = FOLDERS[folder] + filename;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return [];
  const content = await FileSystem.readAsStringAsync(path);
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

/** Convenience: read all Lili predictions for the current month. */
export async function readThisMonthPredictions(): Promise<LiliPrediction[]> {
  return readJsonlFile<LiliPrediction>('predictions', `${monthTag()}.jsonl`);
}

/** Convenience: read all simulation summaries for the current month. */
export async function readThisMonthSimulations(): Promise<SimulationSummary[]> {
  return readJsonlFile<SimulationSummary>('simulations', `${monthTag()}.jsonl`);
}

// ─── Factory helpers (fill boilerplate, caller provides content) ──────────────

export function makeLiliPrediction(
  fields: Omit<LiliPrediction, 'schema_version' | 'prediction_id' | 'created_at' | 'source' | 'model_version'>
): LiliPrediction {
  return {
    schema_version: SCHEMA_VERSION,
    prediction_id: uid('pred'),
    created_at: new Date().toISOString(),
    source: 'lili',
    model_version: LILI_MODEL_VERSION,
    ...fields,
  };
}

export function makeSimulationSummary(
  fields: Omit<SimulationSummary, 'schema_version' | 'simulation_id' | 'created_at' | 'source' | 'model_version'>
): SimulationSummary {
  return {
    schema_version: SCHEMA_VERSION,
    simulation_id: uid('sim'),
    created_at: new Date().toISOString(),
    source: 'lili',
    model_version: LILI_MODEL_VERSION,
    ...fields,
  };
}

export function makeComparisonEvent(
  fields: Omit<AnonymousComparisonEvent, 'schema_version' | 'event_id' | 'created_at' | 'source'>
): AnonymousComparisonEvent {
  return {
    schema_version: SCHEMA_VERSION,
    event_id: uid('cmp'),
    created_at: new Date().toISOString(),
    source: 'human_anonymous',
    ...fields,
  };
}

// ─── Dev / test ───────────────────────────────────────────────────────────────

export interface SampleWriteResult {
  predictionId: string;
  simulationId: string;
  predPath: string;
  simPath: string;
  predCount: number;
  simCount: number;
}

/**
 * Writes one sample Lili prediction and one sample simulation summary.
 * Returns the file paths and record counts so the caller can display feedback.
 */
export async function writeSampleData(): Promise<SampleWriteResult> {
  const tag = monthTag();

  const prediction = makeLiliPrediction({
    match_id: 'wc2026_group_A_01',
    team_a: 'France',
    team_b: 'USA',
    federation_a: 'UEFA',
    federation_b: 'CONCACAF',
    predicted_winner: 'team_a',
    predicted_score: { a: 2, b: 0 },
    confidence: 0.72,
    reasoning_short:
      'France top-ranked with strong tournament form. USA defence exposed in CONCACAF qualifier phase.',
    signal_notes: [
      'France FIFA rank 2 vs USA rank 11',
      'France 8W-1D in last 9 competitive fixtures',
      'USA conceded 1.4 xGA per game in qualifiers',
      'Mbappé fit and on form — key variance factor',
    ],
  });

  const simulation = makeSimulationSummary({
    team: 'France',
    runs: 10_000,
    qualification_probability: 0.96,
    round_of_16_probability: 0.94,
    quarter_final_probability: 0.76,
    semi_final_probability: 0.52,
    final_probability: 0.34,
    winner_probability: 0.19,
    most_common_elimination: 'Quarter-final (32 % of eliminations)',
    most_dangerous_opponent: 'Brazil (met in 41 % of simulated QF matchups)',
    lili_reasoning:
      'France reaches QF in most runs. Main bottleneck is a potential Brazil or Spain crossover in the bracket. Mbappé availability is the single highest-variance factor — his absence shifts winner_probability to 0.09.',
  });

  await appendLiliPrediction(prediction);
  await appendSimulationSummary(simulation);

  const predsAfter = await readThisMonthPredictions();
  const simsAfter = await readThisMonthSimulations();

  return {
    predictionId: prediction.prediction_id,
    simulationId: simulation.simulation_id,
    predPath: FOLDERS.predictions + tag + '.jsonl',
    simPath: FOLDERS.simulations + tag + '.jsonl',
    predCount: predsAfter.length,
    simCount: simsAfter.length,
  };
}
