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
  passes?:         number; // total passes attempted
  fouls?:          number;
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
const clamp = (lo: number, hi: number, n: number) => (n < lo ? lo : n > hi ? hi : n);
// 1-D gaussian kernel
const g = (d: number, sigma: number) => Math.exp(-(d * d) / (2 * sigma * sigma));

/**
 * Positional prior from the starting formation (e.g. "4-3-3", "5-4-1").
 * We have no tracking data, so the formation is the only honest signal of a
 * side's *shape*: how high its line sits and how wide it plays. Returns neutral
 * (0,0) for missing/unparseable input so the model is unchanged without it.
 *   push  : −1 (deep block) … +1 (high line), from forwards-minus-defenders
 *   width : 0 (back-four, normal) … 1 (back-three/five ⇒ wing-backs ⇒ wider)
 */
export function formationShape(formation?: string): { push: number; width: number } {
  if (!formation) return { push: 0, width: 0 };
  const bands = formation.split(/[^0-9]+/).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  const total = bands.reduce((a, b) => a + b, 0);
  if (bands.length < 2 || total < 7 || total > 10) return { push: 0, width: 0 };
  const def = bands[0];
  const fwd = bands[bands.length - 1];
  const push  = clamp(-1, 1, ((fwd - def) / total) * 2.5);
  const width = def <= 3 ? 1 : 0;
  return { push, width };
}

/**
 * Build a normalised THREAT grid for one team (the "where was danger created?"
 * model — not a possession cloud).
 *
 * Design (premium match-centre, Opta/StatsBomb style):
 *  • Heat lives in football ZONES, not radial blobs: five lateral channels
 *    (wing / half-space / centre / half-space / wing) crossed with a strong
 *    attacking-third gate so the midfield and own half stay cold.
 *  • A fixed DANGER HIERARCHY sets the ceiling per zone — penalty area >
 *    half-spaces > wide channels > midfield — modulated by what the side
 *    actually did (box shots & xG → central penetration; corners & a back-3
 *    width → wide; shots from distance → top-of-box half-space).
 *  • HONEST LATERALITY: we have no x-y tracking, so we cannot know whether a
 *    side attacked down the left or the right. The field is therefore MIRROR-
 *    SYMMETRIC about the centre line (Left Wing == Right Wing, Left Half-Space
 *    == Right Half-Space). We model central-vs-wide, never left-vs-right.
 *
 * Coordinates are computed in "attacking" space (ax=1 is the opponent goal),
 * then mapped to absolute orientation so home (ltr) and away (rtl) share a pitch.
 */
export function buildHeatGrid(
  s: TeamMatchStats,
  attackDir: 'ltr' | 'rtl',
  cols = HEAT_COLS,
  rows = HEAT_ROWS,
  formation?: string,
): HeatGrid {
  const possession = clamp01(s.possession || 0);
  const shots   = Math.max(0, s.totalShots || 0);
  const inBox   = Math.max(0, s.shotsInsideBox || 0);
  const outBox  = Math.max(0, s.shotsOutsideBox || 0);
  const onGoal  = Math.max(0, s.shotsOnGoal || 0);
  const corners = Math.max(0, s.corners || 0);
  const xg      = Math.max(0, s.xg || 0);
  const { push, width } = formationShape(formation);

  // What KIND of threat this side generated (all symmetric — central vs wide).
  const central  = inBox * 0.6 + xg * 2.0 + onGoal * 0.5; // box penetration
  const distance = outBox * 0.5;                           // from the top of the box / half-space
  const wideness = corners * 0.5 + width * 1.5;            // crosses / wing-back width

  // How high up the pitch the side camped (centre of gravity along the length).
  const muX = clamp01(0.36 + 0.46 * possession + 0.07 * push); // ~0.5 (deep) … ~0.86 (dominant)

  // DANGER HIERARCHY — the per-zone ceilings (penalty area ≫ half-space > wide > midfield).
  const boxAmp  = Math.min(0.55 + central * 0.50, 3.0);                              // penalty area — 1st
  const hsAmp   = Math.min(0.45 + central * 0.22 + distance * 0.45 + 0.20 * possession, 2.2); // half-spaces — 2nd
  const wideAmp = Math.min(0.28 + wideness * 0.55 + 0.12 * possession, 1.6);         // wide channels — 3rd
  const midAmp  = Math.min(0.20 + 0.40 * possession, 0.65);                          // midfield — lowest, capped

  const raw = new Array(cols * rows).fill(0);
  let max = 0;

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const ax  = (cx + 0.5) / cols; // 0 own goal → 1 opp goal
      const ay  = (cy + 0.5) / rows;
      const ady = Math.abs(ay - 0.5); // 0 centre … 0.5 touchline

      // PENALTY AREA: central + deep. The hottest zone by design.
      const box  = boxAmp  * g(ax - 0.88, 0.075) * g(ady - 0.00, 0.11);
      // HALF-SPACES: two lanes ±0.17 off centre, just outside the box.
      const hs   = hsAmp   * g(ax - 0.79, 0.115) * g(ady - 0.17, 0.075);
      // WIDE CHANNELS: touchline lanes pushing toward the byline.
      const wide = wideAmp * g(ax - 0.83, 0.105) * g(ady - 0.40, 0.075);
      // MIDFIELD: central, middle third, scaled by where the side camps. Capped low.
      const mid  = midAmp  * g(ax - muX, 0.15)   * g(ax - 0.52, 0.17) * g(ady - 0.00, 0.32);

      let v = box * 1.30 + hs * 1.0 + wide * 0.95 + mid * 0.55;

      // Hard gate behind the halfway-ish line: nothing glows in the own half,
      // so the map can never read as "this whole half belonged to this team".
      v *= clamp01((ax - 0.34) / 0.20); // 0 at ax≤0.34 → full by ax≥0.54

      const absCx = attackDir === 'ltr' ? cx : cols - 1 - cx;
      raw[cy * cols + absCx] = v;
      if (v > max) max = v;
    }
  }

  const cells = max > 0 ? raw.map((v) => v / max) : raw;
  // Cross-team weight: blend possession with shot volume so a dominant side
  // genuinely renders hotter than a parked-bus opponent.
  const share = clamp01(0.45 * possession + 0.55 * Math.min(shots / 22, 1));

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
