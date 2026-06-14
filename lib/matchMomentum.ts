// Modelled match momentum — a believable territory-swing curve over time.
//
// We have NO per-minute history for finished games (the stats feed is
// cumulative), so this is a *model*, not a recording — consistent with the
// heatmap. It is anchored to the real final possession split and nudged by the
// real goal/card timeline, with deterministic noise (seeded by fixtureId) so a
// given match always renders the same curve. Positive = home momentum, negative
// = away. Pure + dependency-free.

export interface MomentumPoint { minute: number; value: number } // value in −1..1

export interface MomentumEvent { minute: number; side: 'home' | 'away'; kind: 'goal' | 'red' }

const clamp = (lo: number, hi: number, n: number) => (n < lo ? lo : n > hi ? hi : n);

// Tiny deterministic PRNG (mulberry32) seeded from the fixture id.
function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a momentum series from minute 0 to `endMinute` (90, or the live
 * elapsed). `homePossession` is 0..1. Events shift the curve toward the side
 * that scored / away from a side reduced to ten men.
 */
export function buildMomentum(
  fixtureId: string,
  homePossession: number,
  endMinute: number,
  events: MomentumEvent[],
): MomentumPoint[] {
  const end  = Math.max(10, Math.min(120, Math.round(endMinute)));
  const bias = clamp(-1, 1, (homePossession - 0.5) * 2 * 0.7); // overall tilt from possession
  const rnd  = mulberry32(seedFrom(fixtureId));
  // two seeded sine waves for an organic wobble
  const ph1 = rnd() * Math.PI * 2, ph2 = rnd() * Math.PI * 2;
  const f1  = 0.06 + rnd() * 0.05, f2 = 0.16 + rnd() * 0.08;

  // persistent shift from red cards (a sending-off tilts the rest of the game)
  const reds = events.filter((e) => e.kind === 'red');

  const points: MomentumPoint[] = [];
  for (let m = 0; m <= end; m++) {
    let v = bias;
    v += 0.30 * Math.sin(m * f1 + ph1) + 0.16 * Math.sin(m * f2 + ph2);
    v += (rnd() - 0.5) * 0.12; // fine jitter

    // Goal impulse: a quick swing toward the scorer that decays over ~14 min,
    // plus a small building pressure in the ~6 min before the goal.
    for (const e of events) {
      if (e.kind !== 'goal') continue;
      const dir = e.side === 'home' ? 1 : -1;
      const dt  = m - e.minute;
      if (dt >= 0 && dt <= 14)      v += dir * 0.45 * Math.exp(-dt / 7);
      else if (dt < 0 && dt >= -6)  v += dir * 0.18 * (1 + dt / 6);
    }
    // Red card: lasting tilt away from the penalised side.
    for (const e of reds) {
      if (m >= e.minute) v += (e.side === 'home' ? -1 : 1) * 0.22;
    }

    points.push({ minute: m, value: clamp(-1, 1, v) });
  }
  return points;
}
