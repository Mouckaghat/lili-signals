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
  const [active, setActive] = useState<string | null>(null);

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

  // Markers sit on the side of the line that belongs to their team: HOME above,
  // AWAY below. Within a side, events close in time alternate rows so the cards
  // don't overlap.
  const homeMarkers = markers.filter((m) => m.side === 'home');
  const awayMarkers = markers.filter((m) => m.side === 'away');
  const staggerRows = (list: MomentumMarker[]) => {
    const out: number[] = [];
    let lastMin = -999, lastRow = 1;
    list.forEach((m) => {
      const close = (m.minute - lastMin) / span < 0.085;
      const row = close ? (lastRow === 0 ? 1 : 0) : 0;
      out.push(row); lastMin = m.minute; lastRow = row;
    });
    return out;
  };
  const homeRows = staggerRows(homeMarkers);
  const awayRows = staggerRows(awayMarkers);

  const renderMarker = (m: MomentumMarker, key: string, side: 'home' | 'away', row: number) => {
    const leftPct = (m.minute / span) * 100;
    const c = side === 'home' ? D.blue : D.red;
    const isOn = active === key;
    const pos = side === 'home' ? { bottom: row * 38 } : { top: row * 38 };
    const card = (
      <Pressable
        onPress={() => setActive(isOn ? null : key)}
        {...(Platform.OS === 'web' ? { onHoverIn: () => setActive(key), onHoverOut: () => setActive(null) } : {})}
        style={[s.card, isOn && s.cardOn]}
      >
        <Text style={s.cardHead}>{ICON[m.kind]} <Text style={{ color: c }}>{m.minute}'</Text></Text>
        <Text style={s.cardPlayer} numberOfLines={1}>{m.player || 'Player unknown'}</Text>
        <Text style={[s.cardTeam, { color: c }]} numberOfLines={1}>{m.team}</Text>
      </Pressable>
    );
    const conn = <View style={[s.connector, { backgroundColor: c }]} />;
    const tip = isOn ? (
      <View style={[s.tooltip, side === 'home' ? s.tipAbove : s.tipBelow]} pointerEvents="none">
        <Text style={s.tipHead}>{ICON[m.kind]} {m.minute}'</Text>
        <Text style={s.tipPlayer}>{m.player || 'Player unknown'}</Text>
        <Text style={[s.tipTeam, { color: c }]}>{m.team}</Text>
        <Text style={s.tipKind}>{KIND_LABEL[m.kind]}</Text>
      </View>
    ) : null;
    return (
      <View key={key} style={[s.slot, pos, { left: `${leftPct}%` }]} pointerEvents="box-none">
        {side === 'home' ? (<>{card}{conn}{tip}</>) : (<>{conn}{card}{tip}</>)}
      </View>
    );
  };

  return (
    <View style={s.wrap}>
      {/* HOME events — above the line */}
      <View style={s.homeLayer} pointerEvents="box-none">
        {homeMarkers.map((m, i) => renderMarker(m, `home-${i}`, 'home', homeRows[i]))}
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

      {/* AWAY events — below the line */}
      <View style={s.awayLayer} pointerEvents="box-none">
        {awayMarkers.map((m, i) => renderMarker(m, `away-${i}`, 'away', awayRows[i]))}
      </View>

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
  homeLayer: { height: 94, position: 'relative' },
  awayLayer: { height: 94, position: 'relative' },
  slot: { position: 'absolute', width: 96, marginLeft: -48, alignItems: 'center' },
  card: { backgroundColor: D.card, borderWidth: 1, borderColor: D.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center', minWidth: 78 },
  cardOn: { borderColor: 'rgba(160,190,240,0.6)' },
  cardHead: { color: D.text1, fontSize: 10, fontWeight: '800' },
  cardPlayer: { color: D.text1, fontSize: 10, fontWeight: '700' },
  cardTeam: { fontSize: 9, fontWeight: '700' },
  connector: { width: 1.5, height: 16, opacity: 0.7 },
  tooltip: { position: 'absolute', left: '50%', marginLeft: -46, backgroundColor: '#060B16', borderWidth: 1, borderColor: 'rgba(160,190,240,0.5)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, alignItems: 'center', minWidth: 92, zIndex: 30 },
  tipAbove: { bottom: '108%' },
  tipBelow: { top: '108%' },
  tipHead: { color: D.text1, fontSize: 12, fontWeight: '900' },
  tipPlayer: { color: D.text1, fontSize: 11, fontWeight: '700', marginTop: 1 },
  tipTeam: { fontSize: 10, fontWeight: '800' },
  tipKind: { color: D.text3, fontSize: 9, fontWeight: '700', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  axis: { height: 14, marginTop: 2, position: 'relative' },
  axisLabel: { position: 'absolute', color: D.text3, fontSize: 9, marginLeft: -7 },
});
