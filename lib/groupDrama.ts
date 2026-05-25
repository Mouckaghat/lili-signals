// Group Stage Drama Index — mathematical tension analysis.
// Enumerates all 3^6 = 729 group-stage outcome scenarios analytically per group.
// Uses Shannon entropy of qualifying-pair probabilities as the drama index.
// Pure on-device computation. No backend, no API.

import { getGroupTeams } from './wcData';
import { matchProbs } from './wcSimulation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamDramaStats {
  name:        string;
  flag:        string;
  strength:    number;
  expectedPts: number; // E[pts] across 3 group-stage fixtures
  qualProb:    number; // probability of finishing top-2 in group
}

export type DramaLabel = 'CALM' | 'BUILDING' | 'TENSION' | 'CHAOS';

export interface QualifyingPair {
  t0:   string; // team name
  t0f:  string; // flag
  t1:   string;
  t1f:  string;
  prob: number;
}

export interface GroupDrama {
  group:         string;
  dramaIndex:    number;      // 0–100
  dramaLabel:    DramaLabel;
  dramaColor:    string;
  teams:         TeamDramaStats[];
  favorite:      string;      // team name with highest qual prob
  favoriteFlag:  string;
  darkHorse:     string | null; // weakest team with qual prob > 25%
  darkHorseFlag: string | null;
  tightnessPts:  number;      // expected pts gap between 2nd and 3rd
  topPairs:      QualifyingPair[]; // top-3 most likely qualifying pairs
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ALL_GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'] as const;

// Ordered pairings for a 4-team group [i,j] where i < j
const PAIRINGS: [number, number][] = [
  [0, 1], [0, 2], [0, 3],
  [1, 2], [1, 3],
  [2, 3],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Returns all k-element subsets of arr
function choose(arr: number[], k: number): number[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...tail] = arr;
  return [
    ...choose(tail, k - 1).map(c => [head, ...c]),
    ...choose(tail, k),
  ];
}

function labelFor(index: number): DramaLabel {
  if (index >= 75) return 'CHAOS';
  if (index >= 50) return 'TENSION';
  if (index >= 25) return 'BUILDING';
  return 'CALM';
}

function colorFor(label: DramaLabel): string {
  switch (label) {
    case 'CHAOS':    return '#FF5B5B';
    case 'TENSION':  return '#FF7B35';
    case 'BUILDING': return '#FFD60A';
    case 'CALM':     return '#34D399';
  }
}

// ─── Core computation ─────────────────────────────────────────────────────────

export function computeGroupDrama(group: string): GroupDrama {
  const teams = getGroupTeams(group); // ordered by wcData insertion, 4 teams

  // Pre-compute [winProb_i, drawProb, lossProb_i] for each of the 6 pairings
  const fixProbs = PAIRINGS.map(([i, j]) =>
    matchProbs(teams[i].strength, teams[j].strength)
  );

  // Expected points per team across their 3 fixtures
  const expectedPts = [0, 0, 0, 0];
  for (let f = 0; f < 6; f++) {
    const [i, j] = PAIRINGS[f];
    const [wp, dp] = fixProbs[f];
    expectedPts[i] += wp * 3 + dp;               // team i: win + draw
    expectedPts[j] += (1 - wp - dp) * 3 + dp;    // team j: their win = i's loss
  }

  // Accumulate qual probs across all 3^6 = 729 scenarios
  const teamQualProb = [0, 0, 0, 0];
  // pairQualProb[i][j] for i < j (team indices)
  const pairQualProb: number[][] = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];

  for (let mask = 0; mask < 729; mask++) {
    const pts = [0, 0, 0, 0];
    let prob = 1;
    let tmp = mask;

    for (let f = 0; f < 6; f++) {
      const o = tmp % 3; tmp = Math.floor(tmp / 3);
      const [i, j] = PAIRINGS[f];
      const [wp, dp, lp] = fixProbs[f];
      if (o === 0)      { pts[i] += 3; prob *= wp; }
      else if (o === 1) { pts[i] += 1; pts[j] += 1; prob *= dp; }
      else              { pts[j] += 3; prob *= lp; }
    }

    // Resolve who qualifies (top-2), splitting probability for ties
    const sorted = [0, 1, 2, 3].sort((a, b) => pts[b] - pts[a]);
    const boundaryPts = pts[sorted[1]];
    const clearQuals  = sorted.filter(k => pts[k] > boundaryPts);
    const tied        = sorted.filter(k => pts[k] === boundaryPts);
    const spotsLeft   = 2 - clearQuals.length;

    const combos = choose(tied, spotsLeft);
    const w = prob / combos.length;

    for (const combo of combos) {
      const qualifiers = [...clearQuals, ...combo].sort((a, b) => a - b);
      for (const q of qualifiers) teamQualProb[q] += w;
      pairQualProb[qualifiers[0]][qualifiers[1]] += w;
    }
  }

  // Shannon entropy of the 6 pair-probability values → drama index
  const pairProbs: number[] = [];
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 4; j++)
      pairProbs.push(pairQualProb[i][j]);

  const H = pairProbs.reduce((s, p) => (p > 0 ? s - p * Math.log2(p) : s), 0);
  const Hmax = Math.log2(6); // max entropy when all 6 pairs equally likely
  const dramaIndex = Math.min(100, Math.round((H / Hmax) * 100));

  // Team stats
  const teamStats: TeamDramaStats[] = teams.map((t, k) => ({
    name:        t.name,
    flag:        t.flag,
    strength:    t.strength,
    expectedPts: parseFloat(expectedPts[k].toFixed(2)),
    qualProb:    teamQualProb[k],
  }));

  // Favorite: highest qual prob
  const favIdx = teamQualProb.indexOf(Math.max(...teamQualProb));

  // Dark horse: weakest team (by strength) with qual prob > 25%
  const byStrengthAsc = [...teamStats].sort((a, b) => a.strength - b.strength);
  const darkHorseEntry = byStrengthAsc.find(t => t.qualProb > 0.25) ?? null;

  // Tightness: expected pts gap between 2nd and 3rd
  const sortedByXPts = [...teamStats].sort((a, b) => b.expectedPts - a.expectedPts);
  const tightnessPts = parseFloat(
    (sortedByXPts[1].expectedPts - sortedByXPts[2].expectedPts).toFixed(2)
  );

  // Top-3 qualifying pairs by probability
  const allPairs: QualifyingPair[] = [];
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 4; j++)
      allPairs.push({
        t0: teams[i].name, t0f: teams[i].flag,
        t1: teams[j].name, t1f: teams[j].flag,
        prob: pairQualProb[i][j],
      });

  const topPairs = allPairs
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 3);

  const label = labelFor(dramaIndex);

  return {
    group,
    dramaIndex,
    dramaLabel: label,
    dramaColor: colorFor(label),
    teams: teamStats,
    favorite:      teams[favIdx].name,
    favoriteFlag:  teams[favIdx].flag,
    darkHorse:     darkHorseEntry?.name ?? null,
    darkHorseFlag: darkHorseEntry?.flag ?? null,
    tightnessPts,
    topPairs,
  };
}

export function computeAllGroupDrama(): GroupDrama[] {
  return ALL_GROUPS.map(g => computeGroupDrama(g));
}
