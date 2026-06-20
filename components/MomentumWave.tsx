// Smooth momentum wave — premium dashboard look (replaces the old bar/step
// histogram). Catmull-Rom → cubic-Bézier smoothing of the modelled momentum
// series: blue filled area ABOVE the neutral baseline (home), red BELOW (away),
// with a soft glow.
//
// Event markers: HOME events sit above the line, AWAY events below. Each card is
// linked by a leader-line to a dot at its EXACT minute on the baseline, so the
// card itself can be nudged sideways — to dodge a neighbour (no overlap at the
// same minute) or to stay inside the canvas (no overflow at 90') — while the
// arrow still points at the true minute. Interactive tooltip on hover/tap.
// No fabricated data — player/team come from matchEventsData; unknown → "Player unknown".

import { useState } from 'react';
import { type LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop, Line as SvgLine } from 'react-native-svg';
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

const ICON = { goal: '⚽', yellow: '🟨', red: '🟥' } as const;
const KIND_LABEL = { goal: 'Goal', yellow: 'Yellow card', red: 'Red card' } as const;

// vertical layout (px) — kept compact so the wave + the pitch both fit one screen
const HOME_BAND = 56, WAVE_H = 84, AWAY_BAND = 56;
const TOTAL = HOME_BAND + WAVE_H + AWAY_BAND; // 196
const BASE_Y = HOME_BAND + WAVE_H / 2;        // baseline (the line) at 98
const AMP = WAVE_H / 2 - 8;                    // wave amplitude (34)
const HOME_EDGE_Y = HOME_BAND - 2;             // where a home leader-line meets the card
const AWAY_EDGE_Y = HOME_BAND + WAVE_H + 2;    // …and an away card
const CARD_W = 86, GAP = 6, HALF = CARD_W / 2; // card footprint for spreading/clamping

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

interface Placed { m: MomentumMarker; key: string; side: 'home' | 'away'; anchorX: number; cardX: number }

// Spread overlapping cards apart and keep them inside [HALF, w-HALF]: a left→right
// push, a right→left pull off the right edge, then a left→right pull off the left.
function placeSide(list: MomentumMarker[], side: 'home' | 'away', span: number, w: number): Placed[] {
  const p: Placed[] = list.map((m, i) => {
    const x = (m.minute / span) * w;
    return { m, key: `${side}-${i}`, side, anchorX: x, cardX: x };
  });
  const min = HALF, max = w - HALF, step = CARD_W + GAP;
  for (let i = 1; i < p.length; i++) if (p[i].cardX - p[i - 1].cardX < step) p[i].cardX = p[i - 1].cardX + step;
  for (let i = p.length - 1; i >= 0; i--) {
    if (p[i].cardX > max) p[i].cardX = max;
    if (i < p.length - 1 && p[i + 1].cardX - p[i].cardX < step) p[i].cardX = p[i + 1].cardX - step;
  }
  for (let i = 0; i < p.length; i++) {
    if (p[i].cardX < min) p[i].cardX = min;
    if (i > 0 && p[i].cardX - p[i - 1].cardX < step) p[i].cardX = p[i - 1].cardX + step;
  }
  return p;
}

export default function MomentumWave({
  points, span, markers,
}: { points: MomentumPoint[]; span: number; markers: MomentumMarker[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width && Math.abs(width - w) > 1) setW(width);
  };

  const ready = w > 4;
  const pts = points.map((p) => ({ x: (p.minute / span) * w, y: BASE_Y - p.value * AMP }));
  const seg = curveSegments(pts);
  const open = pts.length ? `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}${seg}` : '';
  const area = pts.length
    ? `M ${pts[0].x.toFixed(2)} ${BASE_Y} L ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}${seg} L ${pts[pts.length - 1].x.toFixed(2)} ${BASE_Y} Z`
    : '';

  const home = ready ? placeSide(markers.filter((m) => m.side === 'home'), 'home', span, w) : [];
  const away = ready ? placeSide(markers.filter((m) => m.side === 'away'), 'away', span, w) : [];
  const axis = [0, 15, 30, 45, 60, 75, 90].filter((m) => m <= span);

  const Marker = ({ p }: { p: Placed }) => {
    const c = p.side === 'home' ? D.blue : D.red;
    const isOn = active === p.key;
    const layer = p.side === 'home' ? s.homeLayer : s.awayLayer;
    return (
      <View style={[s.slot, layer, { left: p.cardX - HALF }]} pointerEvents="box-none">
        <Pressable
          onPress={() => setActive(isOn ? null : p.key)}
          {...(Platform.OS === 'web' ? { onHoverIn: () => setActive(p.key), onHoverOut: () => setActive(null) } : {})}
          style={[s.card, isOn && s.cardOn]}
        >
          <Text style={s.cardHead}>{ICON[p.m.kind]} <Text style={{ color: c }}>{p.m.minute}'</Text></Text>
          <Text style={s.cardPlayer} numberOfLines={1}>{p.m.player || 'Player unknown'}</Text>
          <Text style={[s.cardTeam, { color: c }]} numberOfLines={1}>{p.m.team}</Text>
          {isOn && <Text style={s.cardKind}>{KIND_LABEL[p.m.kind]}</Text>}
        </Pressable>
      </View>
    );
  };

  return (
    <View>
      <View style={{ height: TOTAL }} onLayout={onLayout}>
        {ready && (
          <Svg style={StyleSheet.absoluteFill} width="100%" height={TOTAL} viewBox={`0 0 ${w} ${TOTAL}`} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="momBlue" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={D.blue} stopOpacity="0.85" />
                <Stop offset="1" stopColor={D.blue} stopOpacity="0.12" />
              </LinearGradient>
              <LinearGradient id="momRed" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor={D.red} stopOpacity="0.85" />
                <Stop offset="1" stopColor={D.red} stopOpacity="0.12" />
              </LinearGradient>
              <ClipPath id="above"><Rect x={0} y={0} width={w} height={BASE_Y} /></ClipPath>
              <ClipPath id="below"><Rect x={0} y={BASE_Y} width={w} height={TOTAL - BASE_Y} /></ClipPath>
            </Defs>
            {/* leader-lines from each card to a dot at its exact minute (drawn under the wave) */}
            {[...home, ...away].map((p) => {
              const c = p.side === 'home' ? D.blue : D.red;
              const edgeY = p.side === 'home' ? HOME_EDGE_Y : AWAY_EDGE_Y;
              return (
                <G key={p.key}>
                  <SvgLine x1={p.anchorX} y1={BASE_Y} x2={p.cardX} y2={edgeY} stroke={c} strokeWidth={1} strokeOpacity={0.6} vectorEffect="non-scaling-stroke" />
                  <Circle cx={p.anchorX} cy={BASE_Y} r={2.5} fill={c} />
                </G>
              );
            })}
            {/* baseline */}
            <SvgLine x1={0} y1={BASE_Y} x2={w} y2={BASE_Y} stroke={D.baseline} strokeWidth={1} />
            {/* glow then crisp fills, split at the baseline */}
            <G clipPath="url(#above)">
              <Path d={area} fill="url(#momBlue)" />
              <Path d={open} fill="none" stroke={D.blue} strokeWidth={6} strokeOpacity={0.18} vectorEffect="non-scaling-stroke" />
              <Path d={open} fill="none" stroke={D.blue} strokeWidth={2} strokeOpacity={0.95} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </G>
            <G clipPath="url(#below)">
              <Path d={area} fill="url(#momRed)" />
              <Path d={open} fill="none" stroke={D.red} strokeWidth={6} strokeOpacity={0.18} vectorEffect="non-scaling-stroke" />
              <Path d={open} fill="none" stroke={D.red} strokeWidth={2} strokeOpacity={0.95} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </G>
          </Svg>
        )}
        {home.map((p) => <Marker key={p.key} p={p} />)}
        {away.map((p) => <Marker key={p.key} p={p} />)}
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
  homeLayer: { top: 0, height: HOME_BAND, justifyContent: 'flex-end' },
  awayLayer: { top: HOME_BAND + WAVE_H, height: AWAY_BAND, justifyContent: 'flex-start' },
  slot: { position: 'absolute', width: CARD_W, alignItems: 'center' },
  card: { backgroundColor: D.card, borderWidth: 1, borderColor: D.border, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3, alignItems: 'center', width: CARD_W },
  cardOn: { borderColor: 'rgba(160,190,240,0.6)' },
  cardHead: { color: D.text1, fontSize: 10, fontWeight: '800' },
  cardPlayer: { color: D.text1, fontSize: 10, fontWeight: '700' },
  cardTeam: { fontSize: 9, fontWeight: '700' },
  cardKind: { color: D.text3, fontSize: 8, fontWeight: '700', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.4 },
  axis: { height: 14, marginTop: 4, position: 'relative' },
  axisLabel: { position: 'absolute', color: D.text3, fontSize: 9, marginLeft: -7 },
});
