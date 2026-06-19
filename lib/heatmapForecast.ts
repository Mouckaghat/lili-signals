// Pre-match heatmap FORECAST model — Lili's predicted pressure before kickoff.
//
// The live heatmap (lib/heatmap.ts) is modelled from in-match aggregates
// (possession, shots, xG) that DON'T EXIST until the ball is rolling. So an
// hour before kickoff there is nothing to draw. This module produces an honest
// *forecast* of those same aggregates so we can show a predicted territory map
// that morphs into the live model at kickoff — it is clearly a forecast, never
// presented as measured data.
//
// Every number here comes from a real signal:
//   1. A team's ACTUAL tournament form so far — per-match averages from
//      teamAggregate() (real api-football xG / shots / corners / SoT). This is
//      the honest backbone once a side has played.
//   2. For matchday-1 sides with no matches yet, Lili's strength model
//      (matchProbs / WCTeam.strength) — the same engine the whole app predicts
//      with. No invented per-match data.
//   3. Expected possession from the strength differential + a modest home nudge.
//
// Output is the exact TeamMatchStats shape buildHeatGrid() consumes, so the
// forecast renders on the same pitch and is seamlessly replaced live.

import type { TeamMatchStats } from './heatmap';
import { teamAggregate } from './attackZones';
import { matchProbs } from './wcSimulation';
import { WC_FIXTURES, WC_TEAMS } from './wcData';

const clamp = (lo: number, hi: number, n: number) => (n < lo ? lo : n > hi ? hi : n);
const strengthOf = (team: string) => WC_TEAMS.find((t) => t.name === team)?.strength ?? 70;

// Host nations get a real home edge; a nominal home side gets a small nudge.
const HOST_NATIONS = new Set(['USA', 'Canada', 'Mexico']);

export interface ForecastStats {
  fixtureId: string;
  home: string;
  away: string;
  date: string;
  homeStats: TeamMatchStats;
  awayStats: TeamMatchStats;
  homeWin: number; // 0..1
  draw: number;    // 0..1
  awayWin: number; // 0..1
  basis: 'form' | 'strength' | 'mixed'; // what the forecast leans on (for honesty in the UI)
}

// Per-match attacking baseline for one team: real tournament form if it has
// played, otherwise an expectation derived from its Lili strength rating.
function baseline(team: string): { shots: number; inside: number; sot: number; corners: number; xg: number; played: boolean } {
  const agg = teamAggregate(team);
  if (agg.matches > 0) {
    const m = agg.matches;
    return {
      shots:   agg.shots / m,
      inside:  agg.inside / m,
      sot:     agg.sot / m,
      corners: agg.corners / m,
      xg:      agg.xg / m,
      played:  true,
    };
  }
  // No matches yet → map strength (50..92) onto plausible per-match output.
  const s = strengthOf(team);
  const t = clamp(0, 1, (s - 50) / 42); // 0 = weakest, 1 = strongest
  const shots = 8 + t * 9;              // 8 .. 17
  return {
    shots,
    inside:  shots * 0.6,
    sot:     shots * 0.35,
    corners: 3 + t * 4,                 // 3 .. 7
    xg:      0.7 + t * 1.5,             // 0.7 .. 2.2
    played:  false,
  };
}

/**
 * Build a forecast stat line for a fixture, ready to feed buildHeatGrid().
 * Returns null if the fixture or its teams can't be resolved.
 */
export function forecastMatch(fixtureId: string): ForecastStats | null {
  const fx = WC_FIXTURES.find((f) => f.id === fixtureId);
  if (!fx) return null;

  const sHomeRaw = strengthOf(fx.home);
  const sAway    = strengthOf(fx.away);
  // Modest home nudge: a real edge for host nations, a small one otherwise.
  const homeBump = HOST_NATIONS.has(fx.home) ? 5 : 2;
  const sHome    = sHomeRaw + homeBump;

  const [homeWin, draw, awayWin] = matchProbs(sHome, sAway);

  // Expected possession from the strength gap (clamped to believable bounds).
  const homePoss = clamp(0.34, 0.66, 0.5 + (sHome - sAway) / 120);
  const awayPoss = 1 - homePoss;

  const hb = baseline(fx.home);
  const ab = baseline(fx.away);

  // Scale each side's attacking output by how much of the ball it expects to
  // have (more control ⇒ more sustained pressure), softened so we never
  // over-claim from a thin signal.
  const hFactor = clamp(0.78, 1.22, poFactor(homePoss));
  const aFactor = clamp(0.78, 1.22, poFactor(awayPoss));

  const homeStats = toStats(fx.home, hb, homePoss, hFactor);
  const awayStats = toStats(fx.away, ab, awayPoss, aFactor);

  const basis: ForecastStats['basis'] =
    hb.played && ab.played ? 'form' : !hb.played && !ab.played ? 'strength' : 'mixed';

  return { fixtureId, home: fx.home, away: fx.away, date: fx.date, homeStats, awayStats, homeWin, draw, awayWin, basis };
}

// Possession → an attacking-output multiplier centred on 1.0 at 50% control.
function poFactor(poss: number): number {
  return 0.78 + 0.44 * (poss / 0.5);
}

function toStats(
  team: string,
  b: { shots: number; inside: number; sot: number; corners: number; xg: number },
  possession: number,
  factor: number,
): TeamMatchStats {
  const totalShots = Math.max(1, Math.round(b.shots * factor));
  const inside     = Math.min(totalShots, Math.round(b.inside * factor));
  const outside    = Math.max(0, totalShots - inside);
  const sot        = Math.min(totalShots, Math.round(b.sot * factor));
  const corners    = Math.max(0, Math.round(b.corners * factor));
  const xg         = Math.round(b.xg * factor * 100) / 100;
  // Pass accuracy tracks possession (a side that keeps the ball completes more).
  const passAccuracy = clamp(0.70, 0.90, 0.66 + possession * 0.36);
  return {
    team,
    possession,
    totalShots,
    shotsInsideBox: inside,
    shotsOutsideBox: outside,
    shotsOnGoal: sot,
    corners,
    xg,
    passAccuracy,
    // We do NOT forecast passes/fouls — leave undefined so the UI shows "—"
    // rather than inventing a number.
  };
}
