// Journey projection engine
// Derives a team's simulated World Cup path beyond the group stage.
// All computation is synchronous and deterministic (deterministic per team name hash).

import { WC_TEAMS, type WCTeam } from './wcData';
import { type I18n } from './i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

export type KnockoutRound = 'R16' | 'QF' | 'SF' | 'Final';

export interface ProjectedMatch {
  round: KnockoutRound;
  roundLabel: string;
  opponent: WCTeam;
  winProb: number;
  drawProb: number;
  lossProb: number;
  approxDate: string;
  isProjected: true;
}

export interface GroupMatchProbs {
  winProb: number;
  drawProb: number;
  lossProb: number;
  expectedPoints: number;
}

// ─── Approximate WC 2026 knockout dates ───────────────────────────────────────

const KNOCKOUT_DATES: Record<KnockoutRound, string> = {
  R16:   '~July 1–4, 2026',
  QF:    '~July 5–8, 2026',
  SF:    '~July 14–15, 2026',
  Final: 'July 19, 2026',
};

const ROUND_LABELS: Record<KnockoutRound, string> = {
  R16:   'Round of 16',
  QF:    'Quarter-final',
  SF:    'Semi-final',
  Final: 'Final',
};

const KNOCKOUT_ORDER: KnockoutRound[] = ['R16', 'QF', 'SF', 'Final'];

// ─── Math helpers ─────────────────────────────────────────────────────────────

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function matchProbs(sA: number, sB: number): [number, number, number] {
  const diff    = (sA - sB) / 25;
  const rawWin  = sigmoid(diff);
  const absDiff = Math.abs(sA - sB);
  const draw    = Math.max(0.08, 0.28 - absDiff * 0.003);
  const adj     = 1 - draw;
  const win     = rawWin * adj;
  const loss    = adj - win;
  return [win, draw, loss];
}

// ─── Deterministic pseudo-random seeded on team name ─────────────────────────
// Produces consistent "projected" opponents across renders for the same team.

function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededRandom(seed: number, idx: number): number {
  const x = Math.sin(seed + idx * 9301) * 43758.5453123;
  return x - Math.floor(x);
}

// ─── Projected knockout path ──────────────────────────────────────────────────

export function getProjectedKnockoutPath(team: WCTeam): ProjectedMatch[] {
  const seed = nameHash(team.name);

  // Pool: all teams outside team's own group, sorted by strength descending
  const pool = WC_TEAMS
    .filter((t) => t.group !== team.group && t.name !== team.name)
    .sort((a, b) => b.strength - a.strength);

  // Pick 4 opponents from 4 different groups for R16/QF/SF/Final.
  // Bias toward strong opponents (tournament realism) but add seed variance.
  const usedGroups = new Set<string>([team.group]);
  const opponents: WCTeam[] = [];

  // Weighted selection: top 60% of pool with some seed-based shuffle
  const eligible = pool.slice(0, Math.ceil(pool.length * 0.7));
  const shuffled = [...eligible].sort((a, b) => {
    const ra = seededRandom(seed, eligible.indexOf(a));
    const rb = seededRandom(seed, eligible.indexOf(b));
    // Blend strength rank with random: 70% strength, 30% seed
    return (b.strength * 0.7 + rb * 30) - (a.strength * 0.7 + ra * 30);
  });

  for (const candidate of shuffled) {
    if (!usedGroups.has(candidate.group)) {
      opponents.push(candidate);
      usedGroups.add(candidate.group);
    }
    if (opponents.length === 4) break;
  }

  // Fallback if not enough unique groups
  for (const t of pool) {
    if (opponents.length === 4) break;
    if (!opponents.includes(t)) opponents.push(t);
  }

  return KNOCKOUT_ORDER.map((round, i) => {
    const opponent = opponents[i] ?? pool[pool.length - 1 - i];
    const [winProb, drawProb, lossProb] = matchProbs(team.strength, opponent.strength);
    return {
      round,
      roundLabel: ROUND_LABELS[round],
      opponent,
      winProb,
      drawProb,
      lossProb,
      approxDate: KNOCKOUT_DATES[round],
      isProjected: true as const,
    };
  });
}

// ─── Lili stage insight generator ────────────────────────────────────────────

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export function buildStageInsight(
  team: WCTeam,
  stageIndex: number,
  opponentName: string,
  _opponentStrength: number,
  winProb: number,
  isProjected: boolean,
  i18n: I18n,
): string {
  const t = i18n.journeyInsights;
  const v = { team: team.name, opp: opponentName, wPct: String(Math.round(winProb * 100)) };

  if (!isProjected) {
    if (stageIndex === 0) {
      if (winProb > 0.68) return fill(t.md1High, v);
      if (winProb > 0.48) return fill(t.md1Mid,  v);
      return fill(t.md1Low, v);
    } else if (stageIndex === 1) {
      if (winProb > 0.60) return fill(t.md2High, v);
      if (winProb > 0.42) return fill(t.md2Mid,  v);
      return fill(t.md2Low, v);
    } else {
      if (winProb > 0.60) return fill(t.md3High, v);
      if (winProb > 0.42) return fill(t.md3Mid,  v);
      return fill(t.md3Low, v);
    }
  } else {
    const roundI18n: Record<string, string> = {
      R16:   i18n.roundOf16,
      QF:    i18n.quarterFinal,
      SF:    i18n.semiFinal,
      Final: i18n.final,
    };
    const round = roundI18n[KNOCKOUT_ORDER[stageIndex - 3]] ?? KNOCKOUT_ORDER[stageIndex - 3];
    const vr = { ...v, round };
    if (stageIndex === 3) {
      if (winProb > 0.55) return fill(t.r16High, vr);
      if (winProb > 0.40) return fill(t.r16Mid,  vr);
      return fill(t.r16Low, vr);
    } else if (stageIndex === 4) {
      return fill(t.qf, vr);
    } else if (stageIndex === 5) {
      return fill(t.sf, vr);
    } else {
      return fill(t.final, vr);
    }
  }
}
