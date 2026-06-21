// Territory map — the Heatmap tab's pitch view. A smooth left↔right control
// gradient on the shared (realistic-dimension) PitchSvg: RED where the away
// side controlled play (their attacking end, left), BLUE where the home side
// did (their end, right), PURPLE contested in between. The contested band shifts
// with territory share (a dominant side pushes purple into the weaker half).
//
// Honest model: driven by the same possession/shots/xG territory share shown in
// the rail — not player tracking. Laterally symmetric (no fabricated up/down or
// left/right-wing bias). Smooth SVG gradient (no blobs); markings render on top.

import { StyleSheet, Text, View } from 'react-native';
import { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import PitchSvg, { PITCH_W, PITCH_H } from './PitchSvg';

const C = { blue: '#2E7CFF', red: '#FF3B47', purple: '#9A52FF', text2: '#8DA2C8' };

const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (c1: string, c2: string, t: number) => {
  const a = hexRgb(c1), b = hexRgb(c2);
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
};

// Build the horizontal gradient stops. homeFrac 0..1 = home territory share.
// Home attacks RIGHT (control → +1 = blue), away attacks LEFT (control → −1 = red).
function buildStops(homeFrac: number) {
  const xCross = 1 - Math.max(0.08, Math.min(0.92, homeFrac)); // boundary; shifts toward the weaker side
  const WBAND = 0.20;                                          // transition half-width (contested band)
  const N = 14;
  const out: { off: number; color: string; alpha: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const x = i / N;
    const c = Math.max(-1, Math.min(1, (x - xCross) / WBAND)); // −1 away … +1 home
    const color = c >= 0 ? mix(C.purple, C.blue, c) : mix(C.purple, C.red, -c);
    const alpha = 0.18 + 0.46 * Math.pow(Math.abs(c), 1.1);    // faint contested middle → strong ends
    out.push({ off: x, color, alpha });
  }
  return out;
}

// showLegend defaults true (phone). On desktop the "How To Read" rail panel
// already explains the gradient, so the screen passes showLegend={false} to drop
// the redundant under-pitch legend.
export default function TerritoryPitch({ homeName, awayName, homeFrac, showLegend = true }: { homeName: string; awayName: string; homeFrac: number; showLegend?: boolean }) {
  const stops = buildStops(Number.isFinite(homeFrac) ? homeFrac : 0.5);
  return (
    <View>
      <View style={s.attackRow}>
        <Text style={[s.attackLabel, { color: C.blue }]}>{homeName.toUpperCase()} ATTACK →</Text>
        <Text style={[s.attackLabel, { color: C.red }]}>← {awayName.toUpperCase()} ATTACK</Text>
      </View>
      <PitchSvg>
        <Defs>
          <LinearGradient id="terrH" x1="0" y1="0" x2={PITCH_W} y2="0" gradientUnits="userSpaceOnUse">
            {stops.map((st, i) => <Stop key={i} offset={st.off} stopColor={st.color} stopOpacity={st.alpha} />)}
          </LinearGradient>
          <LinearGradient id="terrV" x1="0" y1="0" x2="0" y2={PITCH_H} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#04060D" stopOpacity="0.34" />
            <Stop offset="0.5" stopColor="#04060D" stopOpacity="0" />
            <Stop offset="1" stopColor="#04060D" stopOpacity="0.34" />
          </LinearGradient>
        </Defs>
        {/* territory tint, then a soft top/bottom vignette for depth */}
        <Rect x={0} y={0} width={PITCH_W} height={PITCH_H} fill="url(#terrH)" />
        <Rect x={0} y={0} width={PITCH_W} height={PITCH_H} fill="url(#terrV)" />
      </PitchSvg>
      {showLegend && (
        <View style={s.legend}>
          <Lg color={C.red} label={`${awayName} territory`} />
          <Lg color={C.purple} label="Contested" />
          <Lg color={C.blue} label={`${homeName} territory`} />
        </View>
      )}
    </View>
  );
}

function Lg({ color, label }: { color: string; label: string }) {
  return <View style={s.lg}><View style={[s.lgDot, { backgroundColor: color }]} /><Text style={s.lgTxt} numberOfLines={1}>{label}</Text></View>;
}

const s = StyleSheet.create({
  attackRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  attackLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, marginTop: 8 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lgDot: { width: 9, height: 9, borderRadius: 5 },
  lgTxt: { color: C.text2, fontSize: 10, fontWeight: '600' },
});
