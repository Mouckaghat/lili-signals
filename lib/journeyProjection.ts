// Journey projection engine
// Derives a team's simulated World Cup path beyond the group stage.
// All computation is synchronous and deterministic (deterministic per team name hash).

import { WC_TEAMS, type WCTeam } from './wcData';

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

const GROUP_STAGE_LABELS = ['MD 1', 'MD 2', 'MD 3'];

function roundLabel(stageIndex: number): string {
  if (stageIndex < 3) return GROUP_STAGE_LABELS[stageIndex];
  return ROUND_LABELS[KNOCKOUT_ORDER[stageIndex - 3]];
}

export function buildStageInsight(
  team: WCTeam,
  stageIndex: number,
  opponentName: string,
  opponentStrength: number,
  winProb: number,
  isProjected: boolean,
): string {
  const tName = team.name;
  const oName = opponentName;
  const stageLabel = roundLabel(stageIndex);
  const wPct = Math.round(winProb * 100);

  if (!isProjected) {
    // Group stage — real fixture
    if (stageIndex === 0) {
      // MD1
      if (winProb > 0.68) {
        return `${tName} opens from a position of structural advantage. Lili reads ${oName}'s defensive transition as the primary vulnerability — a weakness ${tName} is equipped to exploit in the first twenty minutes. The risk is tactical complacency after an early lead.`;
      } else if (winProb > 0.48) {
        return `A genuinely contested opening fixture. ${tName} and ${oName} carry comparable pressing efficiency into this game. The team that controls midfield transition density in the opening forty minutes will likely define the result.`;
      } else {
        return `${oName} enters this fixture as the stronger signal according to Lili. ${tName}'s qualification campaign depends on resilience here — a point would recalibrate the group arithmetic significantly before Matchday 2.`;
      }
    } else if (stageIndex === 1) {
      // MD2
      if (winProb > 0.60) {
        return `Matchday 2 carries full qualification weight. A ${tName} win here creates a mathematically comfortable path to the round of sixteen. ${oName}'s defensive block showed cracks in their opener — Lili flags this as a moment of tournament acceleration.`;
      } else if (winProb > 0.42) {
        return `This is the pressure-defining fixture of the group stage. Both ${tName} and ${oName} need points, which tends to open tactical space. Lili tracks second-half intensity spikes as the key narrative variable in closely matched Matchday 2 games.`;
      } else {
        return `${oName} arrives with ${wPct < 35 ? 'a meaningful strength advantage' : 'momentum and purpose'}. ${tName}'s pathway to the knockout rounds likely requires either a surprise here or a defining Matchday 3 performance. These are the games that build tournament character.`;
      }
    } else {
      // MD3
      if (winProb > 0.60) {
        return `${tName} enters Matchday 3 in a commanding position. A win confirms group standing. Lili reads the ${oName} matchup as one where defensive structure outweighs individual quality — ${tName}'s depth becomes the differentiating variable.`;
      } else if (winProb > 0.42) {
        return `Matchday 3 unfolds in full calculation mode. Both teams enter knowing the arithmetic — draws, wins, other results — and the tactical footprint will reflect that awareness. ${tName} must balance aggression with qualification arithmetic.`;
      } else {
        return `A difficult final group game. ${oName} carries the stronger signal, but Lili notes that Matchday 3 outcomes are historically the least predictable in the group stage — circumstance creates opportunity for lower-probability results.`;
      }
    }
  } else {
    // Projected knockout stage
    const round = ROUND_LABELS[KNOCKOUT_ORDER[stageIndex - 3]];
    if (stageIndex === 3) {
      // R16
      if (winProb > 0.55) {
        return `Projected ${round}: Lili's simulation most frequently positions ${oName} as ${tName}'s first knockout test — a ${oName.toLowerCase().includes('brazil') || oName.toLowerCase().includes('argentina') ? 'continental heavyweight' : 'technically strong side'} with their own deep-tournament ambitions. ${tName} holds a marginal strength advantage, but momentum from the group stage will define the atmosphere.`;
      } else if (winProb > 0.40) {
        return `Projected ${round}: ${oName} emerges as the most common simulation opponent for ${tName} at this stage — a genuinely balanced matchup. The ${round} tests whether group-stage performances translate under single-elimination pressure. Lili reads this as the tournament's first major inflection point.`;
      } else {
        return `Projected ${round}: ${oName} represents a demanding first knockout barrier. Lili's simulation places ${tName}'s win probability here at ${wPct}% — competitive, but requiring near-optimal defensive organisation and transition efficiency to convert.`;
      }
    } else if (stageIndex === 4) {
      // QF
      return `Projected ${round}: At simulation depth, ${oName} appears most frequently as ${tName}'s quarter-final challenge — a stage where tactical setup and squad depth carry more weight than individual quality. Lili notes that QF results across historical tournaments show the highest variance of any knockout round. ${tName} arrives here having already cleared two elimination barriers.`;
    } else if (stageIndex === 5) {
      // SF
      return `Projected ${round}: The semi-final projection surfaces ${oName} as ${tName}'s most probable opponent at this stage. At the four-team level, tournament psychology becomes the dominant signal — rest cycles, defensive organisation, and set-piece efficiency converge. Lili reads ${tName}'s ${winProb > 0.5 ? 'controlled pressing pattern' : 'transition exposure'} as the key variable in this branch.`;
    } else {
      // Final
      return `Projected Final: The simulation's most common championship encounter for ${tName} is against ${oName}. Reaching the final represents the convergence of preparation, tournament health, and bracket luck — three signals Lili weights equally at this stage. This is what football intelligence exists to anticipate.`;
    }
  }
}
