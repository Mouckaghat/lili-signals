// Shared premium pitch — the single source of truth for every analytics panel
// (Attack Zones, Shots Map, Pass Map). Renders an SVG pitch in a 100×64 unit
// coordinate space so overlays can position in the same space; pitch markings
// are drawn LAST (above any overlay children) so the field always reads first.
//
// Usage:
//   <PitchSvg>{/* svg overlay nodes in 0..100 × 0..64 coords */}</PitchSvg>
//
// Markings: outer border, halfway line, centre circle + spot, both penalty
// areas, six-yard boxes, penalty spots, penalty arcs, goals, plus subtle
// mowing stripes. Matches the redesigned Heatmap pitch quality.

import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

// ── Pitch geometry in 100 (length) × 64 (width) units ──────────────────────
export const PITCH_W = 100;
export const PITCH_H = 64;
const MID_Y   = PITCH_H / 2;                 // 32
const BOX_W   = 15.7;                         // penalty area depth
const BOX_H   = 37.9;                         // penalty area width
const SIX_W   = 5.24;                         // six-yard depth
const SIX_H   = 17.2;                         // six-yard width
const PEN_X   = 10.5;                         // penalty spot from goal line
const ARC_R   = 8.7;                          // penalty arc radius
const CIRCLE_R = 8.7;                         // centre circle radius

const LINE   = 'rgba(229,239,255,0.92)';      // bright markings
const LINEW  = 0.42;
const GRASS  = '#07181E';
const STRIPE = 'rgba(255,255,255,0.022)';

// Penalty-arc endpoints where the circle crosses the box edge (left side).
const arcDy = Math.sqrt(ARC_R * ARC_R - (BOX_W - PEN_X) * (BOX_W - PEN_X)); // ≈6.97
const L_ARC = `M ${BOX_W} ${MID_Y - arcDy} A ${ARC_R} ${ARC_R} 0 0 1 ${BOX_W} ${MID_Y + arcDy}`;
const R_ARC = `M ${PITCH_W - BOX_W} ${MID_Y - arcDy} A ${ARC_R} ${ARC_R} 0 0 0 ${PITCH_W - BOX_W} ${MID_Y + arcDy}`;

function Markings() {
  return (
    <G fill="none" stroke={LINE} strokeWidth={LINEW}>
      {/* outer boundary */}
      <Rect x={0.6} y={0.6} width={PITCH_W - 1.2} height={PITCH_H - 1.2} rx={1.2} />
      {/* halfway line + centre circle + spot */}
      <Line x1={PITCH_W / 2} y1={0.6} x2={PITCH_W / 2} y2={PITCH_H - 0.6} />
      <Circle cx={PITCH_W / 2} cy={MID_Y} r={CIRCLE_R} />
      <Circle cx={PITCH_W / 2} cy={MID_Y} r={0.55} fill={LINE} />
      {/* left penalty + six-yard boxes, spot, arc */}
      <Rect x={0.6} y={MID_Y - BOX_H / 2} width={BOX_W} height={BOX_H} />
      <Rect x={0.6} y={MID_Y - SIX_H / 2} width={SIX_W} height={SIX_H} />
      <Circle cx={PEN_X} cy={MID_Y} r={0.5} fill={LINE} />
      <Path d={L_ARC} />
      {/* right penalty + six-yard boxes, spot, arc */}
      <Rect x={PITCH_W - 0.6 - BOX_W} y={MID_Y - BOX_H / 2} width={BOX_W} height={BOX_H} />
      <Rect x={PITCH_W - 0.6 - SIX_W} y={MID_Y - SIX_H / 2} width={SIX_W} height={SIX_H} />
      <Circle cx={PITCH_W - PEN_X} cy={MID_Y} r={0.5} fill={LINE} />
      <Path d={R_ARC} />
      {/* goals */}
      <Rect x={-1.1} y={MID_Y - 4} width={1.7} height={8} />
      <Rect x={PITCH_W - 0.6} y={MID_Y - 4} width={1.7} height={8} />
    </G>
  );
}

function Stripes() {
  const n = 10;
  const w = PITCH_W / n;
  const bands = [];
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) continue;
    bands.push(<Rect key={i} x={i * w} y={0} width={w} height={PITCH_H} fill={STRIPE} />);
  }
  return <G>{bands}</G>;
}

export default function PitchSvg({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[p.frame, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${PITCH_W} ${PITCH_H}`} preserveAspectRatio="xMidYMid meet">
        {/* grass + mowing stripes (bottom) */}
        <Rect x={0} y={0} width={PITCH_W} height={PITCH_H} fill={GRASS} />
        <Stripes />
        {/* overlays (heat / shots / passes) sit here, BELOW the markings */}
        {children}
        {/* markings always on top */}
        <Markings />
      </Svg>
    </View>
  );
}

const p = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: PITCH_W / PITCH_H,
    backgroundColor: GRASS,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(120,180,255,0.45)',
    overflow: 'hidden',
    shadowColor: '#2E7CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 5,
  },
});
