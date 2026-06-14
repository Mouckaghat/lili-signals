// Territory / pressure heatmap model.
//
// We do NOT have optical tracking data (no x-y player positions). What we DO
// have, live, is api-football match statistics: possession, shots in/outside
// the box, shots on goal, corners and xG (see lib/matchStatsData.ts). This
// module turns those aggregates into a believable territory heatmap per team:
// where a side spent its time and generated threat. It is a *model*, not
// measured positions — honest, and it updates as the live stats update.
//
// Pure + dependency-free so it runs in the app, in tests, and in the CLI
// (renderAscii lets the sync bot print a pitch for spot-checking).

export interface TeamMatchStats {
  team:            string;
  possession:      number; // 0..1
  totalShots:      number;
  shotsInsideBox:  number;
  shotsOutsideBox: number;
  shotsOnGoal:     number;
  corners:         number;
  xg:              number;
  passAccuracy:    number; // 0..1
}

export interface HeatGrid {
  cols:      number;
  rows:      number;
  cells:     number[];          // row-major, length cols*rows, normalised 0..1
  share:     number;            // 0..1 cross-team weight (how active this side was)
  attackDir: 'ltr' | 'rtl';     // direction this team attacks (for labelling)
}

export const HEAT_COLS = 18;
export const HEAT_ROWS = 11;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
// 1-D gaussian kernel
const g = (d: number, sigma: number) => Math.exp(-(d * d) / (2 * sigma * sigma));

/**
 * Build a normalised territory grid for one team.
 * Coordinates are computed in "attacking" space (x=1 is the opponent goal),
 * then mapped to absolute pitch orientation so home (ltr) and away (rtl) can
 * be drawn on the same pitch.
 */
export function buildHeatGrid(
  s: TeamMatchStats,
  attackDir: 'ltr' | 'rtl',
  cols = HEAT_COLS,
  rows = HEAT_ROWS,
): HeatGrid {
  const possession = clamp01(s.possession || 0);
  const shots      = Math.max(1, s.totalShots || 0);
  const outsideRat = clamp01((s.shotsOutsideBox || 0) / shots);

  // Centre of gravity along the pitch length: more possession ⇒ camped higher.
  const muX  = 0.30 + 0.60 * possession;          // ~0.47 (deep) … ~0.78 (dominant)
  const sigX = 0.24;

  // Threat hotspot just outside the opponent box, sized by box shots + xG.
  const threat  = (s.shotsInsideBox || 0) * 0.6 + (s.xg || 0) * 2.0 + (s.shotsOnGoal || 0) * 0.4;
  const boxAmp  = Math.min(threat / 6, 1.3);
  const xBox    = 0.86;
  const sigBoxX = 0.07;
  const sigBoxY = 0.13 + 0.07 * outsideRat;        // wider band if shooting from distance

  // Corners feed both flanks near the byline.
  const cornerW = Math.min((s.corners || 0) / 10, 1) * 0.5;

  const raw = new Array(cols * rows).fill(0);
  let max = 0;

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const ax = (cx + 0.5) / cols; // attacking x: 0 own goal → 1 opp goal
      const ay = (cy + 0.5) / rows;

      const territory = (0.45 + 0.55 * possession) * g(ax - muX, sigX) * g(ay - 0.5, 0.30);
      const box       = boxAmp * g(ax - xBox, sigBoxX) * g(ay - 0.5, sigBoxY);
      const flanks    = cornerW * (g(ax - 0.90, 0.06) * g(ay - 0.15, 0.10)
                                 + g(ax - 0.90, 0.06) * g(ay - 0.85, 0.10));
      const v = territory + 0.9 * box + flanks;

      const absCx = attackDir === 'ltr' ? cx : cols - 1 - cx;
      raw[cy * cols + absCx] = v;
      if (v > max) max = v;
    }
  }

  const cells = max > 0 ? raw.map((v) => v / max) : raw;
  // Cross-team weight: blend possession with shot volume so a dominant side
  // genuinely renders hotter than a parked-bus opponent.
  const share = clamp01(0.5 * possession + 0.5 * Math.min(shots / 25, 1));

  return { cols, rows, cells, share, attackDir };
}

const ASCII_RAMP = ' ·░▒▓█';

/** Render a grid as monospace pitch rows (for CLI spot-checks). */
export function renderAscii(grid: HeatGrid): string {
  const lines: string[] = [];
  for (let cy = 0; cy < grid.rows; cy++) {
    let line = '';
    for (let cx = 0; cx < grid.cols; cx++) {
      const v = grid.cells[cy * grid.cols + cx];
      const i = Math.min(ASCII_RAMP.length - 1, Math.round(v * (ASCII_RAMP.length - 1)));
      line += ASCII_RAMP[i] + ASCII_RAMP[i]; // double-width for aspect ratio
    }
    lines.push(line);
  }
  return lines.join('\n');
}
