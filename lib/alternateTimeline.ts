// Alternate Timeline Engine — counterfactual group-stage probability analysis.
// Models how overriding a team's effective strength shifts match outcomes,
// qualification probability, and group rivals' expected performance.

import { getGroupTeams, getTeam, getTeamFixtures } from './wcData';
import { matchProbs } from './wcSimulation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchTimeline {
  opponent:     string;
  opponentFlag: string;
  matchday:     number;
  base: { win: number; draw: number; loss: number; expectedPts: number };
  alt:  { win: number; draw: number; loss: number; expectedPts: number };
}

export interface GroupRipple {
  name:            string;
  flag:            string;
  strength:        number;
  baseExpectedPts: number;
  altExpectedPts:  number;
}

export interface TimelineComparison {
  teamName:        string;
  teamFlag:        string;
  group:           string;
  baseStrength:    number;
  altStrength:     number;
  matches:         MatchTimeline[];
  baseExpectedPts: number;
  altExpectedPts:  number;
  baseQualProb:    number;
  altQualProb:     number;
  groupRipple:     GroupRipple[];
  divergenceIndex: number; // 0–100
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function xpts(win: number, draw: number): number {
  return win * 3 + draw;
}

// Smooth interpolation of qualification probability over continuous expected pts.
// The step-function in wcSimulation is designed for integer points from a single run;
// this version gives a meaningful gradient for real-valued expected-pts comparisons.
function qualProbContinuous(pts: number): number {
  const table: [number, number][] = [
    [0, 0.01], [1, 0.01], [2, 0.02], [3, 0.05],
    [4, 0.18], [5, 0.52], [6, 0.85], [7, 0.99],
    [8, 0.99], [9, 0.99],
  ];
  const clamped = Math.max(0, Math.min(9, pts));
  const lo = Math.floor(clamped);
  const hi = Math.min(9, Math.ceil(clamped));
  if (lo === hi) return table[lo][1];
  const t = clamped - lo;
  return table[lo][1] * (1 - t) + table[hi][1] * t;
}

// ─── Core computation ─────────────────────────────────────────────────────────

export const STRENGTH_MIN   = -20;
export const STRENGTH_MAX   = +20;
export const STRENGTH_STEP  = 1;

export function computeTimelineComparison(
  teamName: string,
  strengthDelta: number,
): TimelineComparison | null {
  const team = getTeam(teamName);
  if (!team) return null;

  const altStrength = Math.max(30, Math.min(99, team.strength + strengthDelta));
  const fixtures = getTeamFixtures(teamName);

  // ── Per-match probability comparison
  const matches: MatchTimeline[] = fixtures.map(f => {
    const oppName = f.home === teamName ? f.away : f.home;
    const opp     = getTeam(oppName);
    const oppStr  = opp?.strength ?? 65;

    const [bw, bd, bl] = matchProbs(team.strength, oppStr);
    const [aw, ad, al] = matchProbs(altStrength,    oppStr);

    return {
      opponent:     oppName,
      opponentFlag: opp?.flag ?? '?',
      matchday:     f.matchday,
      base: { win: bw, draw: bd, loss: bl, expectedPts: xpts(bw, bd) },
      alt:  { win: aw, draw: ad, loss: al, expectedPts: xpts(aw, ad) },
    };
  });

  const baseExpPts = matches.reduce((s, m) => s + m.base.expectedPts, 0);
  const altExpPts  = matches.reduce((s, m) => s + m.alt.expectedPts, 0);

  // ── Group ripple: rivals' expected pts shift because one opponent changed strength
  const rivals = getGroupTeams(team.group).filter(r => r.name !== teamName);

  const groupRipple: GroupRipple[] = rivals.map(rival => {
    const rivFixtures = getTeamFixtures(rival.name);
    let baseRivPts = 0;
    let altRivPts  = 0;

    for (const f of rivFixtures) {
      const oppName = f.home === rival.name ? f.away : f.home;
      const opp     = getTeam(oppName);
      const oppStr  = opp?.strength ?? 65;

      if (oppName === teamName) {
        const [bw, bd] = matchProbs(rival.strength, team.strength);
        const [aw, ad] = matchProbs(rival.strength, altStrength);
        baseRivPts += xpts(bw, bd);
        altRivPts  += xpts(aw, ad);
      } else {
        const [w, d] = matchProbs(rival.strength, oppStr);
        const pts = xpts(w, d);
        baseRivPts += pts;
        altRivPts  += pts;
      }
    }

    return {
      name:            rival.name,
      flag:            rival.flag,
      strength:        rival.strength,
      baseExpectedPts: baseRivPts,
      altExpectedPts:  altRivPts,
    };
  });

  // ── Divergence: avg absolute win-probability shift × 200 → 0–100
  const n = Math.max(matches.length, 1);
  const totalWinDelta = matches.reduce((s, m) => s + Math.abs(m.alt.win - m.base.win), 0);
  const divergenceIndex = Math.min(100, Math.round((totalWinDelta / n) * 200));

  return {
    teamName,
    teamFlag:        team.flag,
    group:           team.group,
    baseStrength:    team.strength,
    altStrength,
    matches,
    baseExpectedPts: baseExpPts,
    altExpectedPts:  altExpPts,
    baseQualProb:    qualProbContinuous(baseExpPts),
    altQualProb:     qualProbContinuous(altExpPts),
    groupRipple,
    divergenceIndex,
  };
}
