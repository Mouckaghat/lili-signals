// Smooth momentum wave — premium dashboard look (replaces the old bar/step
// histogram). Catmull-Rom → cubic-Bézier smoothing of the modelled momentum
// series: blue filled area ABOVE the neutral baseline (home), red BELOW (away),
// with a soft glow. Event markers are anchored to their exact minute and carry
// an interactive tooltip (icon · minute · player · team · type). No fabricated
// data — player/team come straight from matchEventsData; unknown → "Player unknown".

import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop, Line as SvgLine } from 'react-native-svg';
import type { MomentumPoint } from '../lib/matchMomentum';

const D = {
  blue: '#2E7CFF', red: '#FF3B47', purple: '#9A52FF',
  card: '#0F1C33', border: 'rgba(86,140,224,0.22)',
  text1: '#F1F5FF', text2: '#8DA2C8', text3: '#52668C', baseline: 'rgba(160,190,240,0.30)',
};

export interface MomentumMarker {
  minute: number;
  side: 'home' | 'away';
  kind: 'goal' | 'yellow' | 'red';
  player?: string;
  team: string;
}

const W = 1000, H = 220, MID = H / 2, TOP = 14, BOT = H - 14;
const ICON = { goal: '⚽', yellow: '🟨', red: '🟥' } as const;
const KIND_LABEL = { goal: 'Goal', yellow: 'Yellow card', red: 'Red card' } as const;

// Catmull-Rom spline through pts → smooth cubic-Bézier `C` segments (no leading M).
function curveSegments(pts: { x: number; y: number }[]): string {
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export default function MomentumWave({
  points, span, markers,
}: { points: MomentumPoint[]; span: number; markers: MomentumMarker[] }) {
  const [active, setActive] = useState<number | null>(null);

  const pts = points.map((p) => ({
    x: (p.minute / span) * W,
    y: MID - p.value * (MID - TOP), // value 1 → TOP, −1 → BOT
  }));
  const seg = curveSegments(pts);
  const open = pts.length ? `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}${seg}` : '';
  const area = pts.length
    ? `M ${pts[0].x.toFixed(2)} ${MID} L ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}${seg} L ${pts[pts.length - 1].x.toFixed(2)} ${MID} Z`
    : '';

  const axis = [0, 15, 30, 45, 60, 75, 90].filter((m) => m <= span);

  return (
    <View style={s.wrap}>
      {/* event cards (anchored to the timeline minute, staggered to avoid overlap) */}
      <View style={s.markerLayer} pointerEvents="box-none">
        {markers.map((m, i) => {
          const leftPct = (m.minute / span) * 100;
          const high = i % 2 === 0; // stagger rows
          const color = m.side === 'home' ? D.blue : D.red;
          const isOn = active === i;
          return (
            <View key={i} style={[s.markerSlot, { left: `${leftPct}%`, top: high ? 0 : 30 }]} pointerEvents="box-none">
              <Pressable
                onPress={() => setActive(isOn ? null : i)}
                {...(Platform.OS === 'web' ? { onHoverIn: () => setActive(i), onHoverOut: () => setActive(null) } : {})}
                style={[s.card, isOn && s.cardOn]}
              >
                <Text style={s.cardHead}>{ICON[m.kind]} <Text style={{ color }}>{m.minute}'</Text></Text>
                <Text style={s.cardPlayer} numberOfLines={1}>{m.player || 'Player unknown'}</Text>
                <Text style={[s.cardTeam, { color }]} numberOfLines={1}>{m.team}</Text>
              </Pressable>
              <View style={[s.connector, { backgroundColor: color }]} />
              {isOn && (
                <View style={s.tooltip} pointerEvents="none">
                  <Text style={s.tipHead}>{ICON[m.kind]} {m.minute}'</Text>
                  <Text style={s.tipPlayer}>{m.player || 'Player unknown'}</Text>
                  <Text style={[s.tipTeam, { color }]}>{m.team}</Text>
                  <Text style={s.tipKind}>{KIND_LABEL[m.kind]}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Svg width="100%" height={150} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="momBlue" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={D.blue} stopOpacity="0.85" />
            <Stop offset="1" stopColor={D.blue} stopOpacity="0.12" />
          </LinearGradient>
          <LinearGradient id="momRed" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={D.red} stopOpacity="0.85" />
            <Stop offset="1" stopColor={D.red} stopOpacity="0.12" />
          </LinearGradient>
          <ClipPath id="above"><Rect x={0} y={0} width={W} height={MID} /></ClipPath>
          <ClipPath id="below"><Rect x={0} y={MID} width={W} height={MID} /></ClipPath>
        </Defs>
        {/* baseline */}
        <SvgLine x1={0} y1={MID} x2={W} y2={MID} stroke={D.baseline} strokeWidth={1} />
        {/* glow (thick, faint) then crisp fills, split at the baseline */}
        <G clipPath="url(#above)">
          <Path d={area} fill="url(#momBlue)" />
          <Path d={open} fill="none" stroke={D.blue} strokeWidth={6} strokeOpacity={0.18} />
          <Path d={open} fill="none" stroke={D.blue} strokeWidth={2} strokeOpacity={0.95} strokeLinecap="round" strokeLinejoin="round" />
        </G>
        <G clipPath="url(#below)">
          <Path d={area} fill="url(#momRed)" />
          <Path d={open} fill="none" stroke={D.red} strokeWidth={6} strokeOpacity={0.18} />
          <Path d={open} fill="none" stroke={D.red} strokeWidth={2} strokeOpacity={0.95} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      </Svg>

      <View style={s.axis}>
        {axis.map((m) => (
          <Text key={m} style={[s.axisLabel, { left: `${(m / span) * 100}%` }]}>{m}'</Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%' },
  markerLayer: { height: 76, marginBottom: 2, position: 'relative' },
  markerSlot: { position: 'absolute', width: 96, marginLeft: -48, alignItems: 'center' },
  card: { backgroundColor: D.card, borderWidth: 1, borderColor: D.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center', minWidth: 78 },
  cardOn: { borderColor: 'rgba(160,190,240,0.6)' },
  cardHead: { color: D.text1, fontSize: 10, fontWeight: '800' },
  cardPlayer: { color: D.text1, fontSize: 10, fontWeight: '700' },
  cardTeam: { fontSize: 9, fontWeight: '700' },
  connector: { width: 1.5, height: 14, opacity: 0.7 },
  tooltip: { position: 'absolute', top: -4, backgroundColor: '#060B16', borderWidth: 1, borderColor: 'rgba(160,190,240,0.5)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, alignItems: 'center', minWidth: 92, zIndex: 30 },
  tipHead: { color: D.text1, fontSize: 12, fontWeight: '900' },
  tipPlayer: { color: D.text1, fontSize: 11, fontWeight: '700', marginTop: 1 },
  tipTeam: { fontSize: 10, fontWeight: '800' },
  tipKind: { color: D.text3, fontSize: 9, fontWeight: '700', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  axis: { height: 14, marginTop: 2, position: 'relative' },
  axisLabel: { position: 'absolute', color: D.text3, fontSize: 9, marginLeft: -7 },
});
