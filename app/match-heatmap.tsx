import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildHeatGrid, type HeatGrid, type TeamMatchStats } from '../lib/heatmap';
import { buildMomentum, type MomentumEvent } from '../lib/matchMomentum';
import type { MatchStats } from '../lib/matchStatsData';
import { useLiveStats } from '../lib/useLiveStats';
import { useLiveResults } from '../lib/useLiveResults';
import { useLineups } from '../lib/useLineups';
import { MATCH_EVENTS } from '../lib/matchEventsData';
import { WC_FIXTURES, WC_TEAMS } from '../lib/wcData';
import HomeEdgeModule from '../components/HomeEdgeModule';

// ─── Tokens ──────────────────────────────────────────────────────────────────
const D = {
  bg:      '#04060D',
  panel:   '#0A1322',
  panel2:  '#0F1C33',
  border:  'rgba(86,140,224,0.16)',
  blue:    '#2E7CFF',
  red:     '#FF3B47',
  purple:  '#9A52FF',
  pitch:   '#07181E',
  line:    'rgba(255,255,255,0.62)',
  lineSoft:'rgba(255,255,255,0.34)',
  text1:   '#F1F5FF',
  text2:   '#8DA2C8',
  text3:   '#52668C',
};
const PITCH_COLS = 48, PITCH_ROWS = 29;

function hexRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}
// linear blend between two hex colours → "r,g,b"
function mix(c1: string, c2: string, t: number): string {
  const a = hexRgb(c1), b = hexRgb(c2);
  return `${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)}`;
}
const flagOf = (name: string) => WC_TEAMS.find((t) => t.name === name)?.flag ?? '🏳';
const surname = (full: string) => { const p = full.trim().split(' '); return p.length > 1 ? p[p.length - 1] : full; };
function fmtDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Subtle grass mowing-stripes so the field reads as a pitch under the heat.
function Stripes() {
  const bands = [];
  for (let i = 0; i < 16; i++) {
    bands.push(<View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'transparent' }} />);
  }
  return <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]} pointerEvents="none">{bands}</View>;
}

// Territory overlay: only meaningful zones glow; low activity stays transparent
// so the pitch shows through. Continuous alpha + a web blur → smooth gradients
// (Opta/StatsBomb feel) rather than visible blocks.
const HEAT_THRESH = 0.25;   // below this → transparent (most of the pitch)
const HEAT_MAXA   = 0.70;   // hottest team zone opacity (field still visible under it)
function HeatField({ homeGrid, awayGrid }: { homeGrid: HeatGrid; awayGrid: HeatGrid }) {
  // Weight by ABSOLUTE activity (share), hard, so a dominant side fills its
  // attacking third while a weak side collapses to a few isolated zones rather
  // than flooding its half (each grid is normalised to its own max otherwise).
  const W = (s: number) => Math.min(0.95, 0.05 + 1.12 * s);
  const hW = W(homeGrid.share), aW = W(awayGrid.share);
  const rows = [];
  for (let cy = 0; cy < homeGrid.rows; cy++) {
    const cells = [];
    for (let cx = 0; cx < homeGrid.cols; cx++) {
      const i = cy * homeGrid.cols + cx;
      const Hw = homeGrid.cells[i] * hW;
      const Aw = awayGrid.cells[i] * aW;
      const total = Hw + Aw;
      let bg: string | undefined;
      if (total > HEAT_THRESH) {
        const ratio = Hw / total; // 1 = all home (blue), 0 = all away (red)
        const norm  = (total - HEAT_THRESH) / (1 - HEAT_THRESH);
        // one-sidedness: 0 = perfectly contested, 1 = a team clearly owns it.
        const dom   = Math.abs(ratio - 0.5) * 2;
        // contested midfield fades; clearly-owned zones stay strong.
        const alpha = Math.min(HEAT_MAXA, 0.05 + Math.pow(norm, 1.4) * HEAT_MAXA) * (0.5 + 0.5 * dom);
        // steepen colour commitment so cells reach blue/red fast → narrow purple band.
        const t     = Math.max(0, Math.min(1, 0.5 + (ratio - 0.5) * 1.8));
        const rgb   = t >= 0.5 ? mix(D.purple, D.blue, (t - 0.5) * 2) : mix(D.red, D.purple, t * 2);
        bg = `rgba(${rgb},${alpha.toFixed(3)})`;
      }
      cells.push(<View key={cx} style={[hp.cell, bg ? { backgroundColor: bg } : null]} />);
    }
    rows.push(<View key={cy} style={hp.row}>{cells}</View>);
  }
  return <View style={StyleSheet.absoluteFill}>{rows}</View>;
}

function Pitch({ home, away, homeName, awayName, homeFormation, awayFormation, fill }: {
  home: TeamMatchStats; away: TeamMatchStats; homeName: string; awayName: string;
  homeFormation?: string; awayFormation?: string; fill: boolean;
}) {
  const homeGrid = useMemo(() => buildHeatGrid(home, 'ltr', PITCH_COLS, PITCH_ROWS, homeFormation), [home, homeFormation]);
  const awayGrid = useMemo(() => buildHeatGrid(away, 'rtl', PITCH_COLS, PITCH_ROWS, awayFormation), [away, awayFormation]);
  // Smooth the heat on web (markings render after, so they stay sharp).
  const blur = Platform.OS === 'web' ? ({ filter: 'blur(6px)' } as any) : null;
  return (
    <View style={[fill ? { flex: 1 } : null, { minHeight: 0 }]}>
      <View style={hp.attackRow}>
        <Text style={[hp.attackLabel, { color: D.blue }]}>{homeName.toUpperCase()} ATTACK →</Text>
        <Text style={[hp.attackLabel, { color: D.red }]}>← {awayName.toUpperCase()} ATTACK</Text>
      </View>
      <View style={[hp.pitch, fill ? { flex: 1 } : { aspectRatio: 16 / 9 }]}>
        <Stripes />
        <View style={[StyleSheet.absoluteFill, blur]} pointerEvents="none">
          <HeatField homeGrid={homeGrid} awayGrid={awayGrid} />
        </View>
        {/* markings — sharp & bright, above the heat */}
        <View style={hp.halfway} />
        <View style={hp.centerCircle} />
        <View style={hp.spot} />
        <View style={[hp.box, hp.boxL]} /><View style={[hp.box, hp.boxR]} />
        <View style={[hp.sixBox, hp.sixL]} /><View style={[hp.sixBox, hp.sixR]} />
        <View style={[hp.penSpot, { left: '9.5%' }]} /><View style={[hp.penSpot, { right: '9.5%' }]} />
        <View style={[hp.corner, { top: -7, left: -7 }]} /><View style={[hp.corner, { top: -7, right: -7 }]} />
        <View style={[hp.corner, { bottom: -7, left: -7 }]} /><View style={[hp.corner, { bottom: -7, right: -7 }]} />
      </View>
    </View>
  );
}

// ─── Rail panels ────────────────────────────────────────────────────────────
function Panel({ title, children, style }: { title: string; children: React.ReactNode; style?: any }) {
  return (
    <View style={[rp.panel, style]}>
      <Text style={rp.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}
function StatRow({ label, h, a }: { label: string; h: string | number; a: string | number }) {
  return (
    <View style={rp.statRow}>
      <Text style={[rp.statVal, { color: D.blue, textAlign: 'left' }]}>{h}</Text>
      <Text style={rp.statLabel}>{label}</Text>
      <Text style={[rp.statVal, { color: D.red, textAlign: 'right' }]}>{a}</Text>
    </View>
  );
}

// ─── Momentum (compact) ─────────────────────────────────────────────────────
interface MatchEventMarker { minute: number; side: 'home' | 'away'; kind: 'goal' | 'yellow' | 'red'; icon: string; label?: string }

function Momentum({ match, events }: { match: MatchStats; events: MatchEventMarker[] }) {
  const end = match.status === 'LIVE' && match.elapsed ? Math.max(match.elapsed, 1) : 90;
  const span = Math.max(end, 90);
  const momEvents: MomentumEvent[] = events
    .filter((e) => e.kind === 'goal' || e.kind === 'red')
    .map((e) => ({ minute: e.minute, side: e.side, kind: e.kind === 'goal' ? 'goal' : 'red' }));
  const points = useMemo(
    () => buildMomentum(match.fixtureId, match.homeStats.possession, end, momEvents),
    [match.fixtureId, match.homeStats.possession, end, JSON.stringify(momEvents)]);
  const axis = [0, 15, 30, 45, 60, 75, 90].filter((m) => m <= span);

  return (
    <View style={mc.wrap}>
      <View style={mc.head}>
        <Text style={mc.title}>MOMENTUM</Text>
        <View style={mc.legends}>
          <Lg color={D.blue} label={match.home} /><Lg color={D.red} label={match.away} /><Lg color={D.purple} label="Events" />
        </View>
      </View>
      <View style={mc.markerLayer}>
        {events.map((e, i) => (
          <View key={i} style={[mc.marker, { left: `${(e.minute / span) * 100}%` }]}>
            <Text style={mc.markerTxt}>{e.icon}<Text style={{ color: e.side === 'home' ? D.blue : D.red }}> {e.minute}'</Text></Text>
          </View>
        ))}
      </View>
      <View style={mc.chart}>
        {points.map((p, i) => (
          <View key={i} style={mc.col}>
            <View style={mc.halfTop}>{p.value > 0 && <View style={{ height: `${Math.min(100, p.value * 100)}%`, width: '100%', backgroundColor: rgba(D.blue, 0.9) }} />}</View>
            <View style={mc.mid} />
            <View style={mc.halfBot}>{p.value < 0 && <View style={{ height: `${Math.min(100, -p.value * 100)}%`, width: '100%', backgroundColor: rgba(D.red, 0.9) }} />}</View>
          </View>
        ))}
      </View>
      <View style={mc.axis}>{axis.map((m) => <Text key={m} style={[mc.axisLabel, { left: `${(m / span) * 100}%` }]}>{m}'</Text>)}</View>
    </View>
  );
}
function Lg({ color, label }: { color: string; label: string }) {
  return <View style={mc.lg}><View style={[mc.lgDot, { backgroundColor: color }]} /><Text style={mc.lgTxt}>{label}</Text></View>;
}

const HOME_EDGE = '🏟 Home Edge';
const TABS = ['Overview', 'Heatmap', HOME_EDGE, 'Attack Zones', 'Shots', 'Pass Map', 'Players'];

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function MatchHeatmapScreen() {
  const insets    = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide      = width >= 860;
  const matches   = useLiveStats();
  const results   = useLiveResults();
  const lineups   = useLineups();
  const [tab, setTab] = useState('Heatmap');

  const ordered = useMemo(() =>
    [...matches].sort((a, b) => (a.status === 'LIVE' ? -1 : 0) - (b.status === 'LIVE' ? -1 : 0) || b.date.localeCompare(a.date)),
  [matches]);

  const { fixtureId } = useLocalSearchParams<{ fixtureId?: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const active = ordered.find((m) => m.fixtureId === (selected ?? fixtureId)) ?? ordered[0];

  if (!active) {
    return <View style={[st.screen, st.empty]}><Text style={st.emptyText}>No match stats yet. Heatmaps appear once a game kicks off.</Text></View>;
  }

  const fixture = WC_FIXTURES.find((f) => f.id === active.fixtureId);
  const lineup  = lineups.find((l) => l.fixtureKey === `${active.home}|${active.away}`);
  const homeFormation = lineup?.home.formation && lineup.home.formation !== '?' ? lineup.home.formation : undefined;
  const awayFormation = lineup?.away.formation && lineup.away.formation !== '?' ? lineup.away.formation : undefined;

  const h = active.homeStats, a = active.awayStats;
  const hShare = buildHeatGrid(h, 'ltr', PITCH_COLS, PITCH_ROWS, homeFormation).share;
  const aShare = buildHeatGrid(a, 'rtl', PITCH_COLS, PITCH_ROWS, awayFormation).share;
  const hTerr  = Math.round((hShare / (hShare + aShare || 1)) * 100);
  const aTerr  = 100 - hTerr;

  const ev = MATCH_EVENTS.find((e) => e.fixtureId === active.fixtureId);
  const markers: MatchEventMarker[] = ev ? [
    ...ev.goals.map((g) => ({ minute: g.minute, side: (g.team === active.home ? 'home' : 'away') as 'home' | 'away', kind: 'goal' as const, icon: '⚽', label: surname(g.player) })),
    ...ev.redCards.map((c) => ({ minute: c.minute ?? 0, side: (c.team === active.home ? 'home' : 'away') as 'home' | 'away', kind: 'red' as const, icon: '🟥' })),
    ...ev.yellowCards.map((c) => ({ minute: c.minute ?? 0, side: (c.team === active.home ? 'home' : 'away') as 'home' | 'away', kind: 'yellow' as const, icon: '🟨' })),
  ].sort((x, y) => x.minute - y.minute) : [];

  const statusLine = active.status === 'LIVE' ? `LIVE ${active.elapsed ?? ''}'` : 'FULL TIME';
  const res = results[`${active.home}|${active.away}`];
  const scoreText = res && res.homeScore != null && res.awayScore != null ? `${res.homeScore} – ${res.awayScore}` : 'vs';

  // Lili insight: headline · explanation · consequence
  const dom = hTerr >= aTerr ? active.home : active.away;
  const sub = hTerr >= aTerr ? active.away : active.home;
  const domShots = hTerr >= aTerr ? h.totalShots : a.totalShots;
  const subShots = hTerr >= aTerr ? a.totalShots : h.totalShots;
  const domPoss  = Math.round((hTerr >= aTerr ? h.possession : a.possession) * 100);
  const margin   = Math.abs(hTerr - aTerr);
  const headline = margin >= 24 ? `${dom} dominated` : margin >= 10 ? `${dom} edged it` : 'Even territorial battle';
  const explain  = `${domPoss}% of the ball and ${domShots} shots to ${subShots}.`;
  const conseq   = margin >= 10 ? `${sub} rarely progressed beyond the middle third.` : 'Both sides traded control across the pitch.';

  const Header = (
    <View style={st.header}>
      <View style={st.headSide}>
        <Text style={st.headTitle}>TERRITORY HEATMAP</Text>
        {fixture && <Text style={st.headSub}>Group {fixture.group} · Matchday {fixture.matchday}</Text>}
      </View>
      <View style={st.headCenter}>
        <View style={st.scoreRow}>
          <Text style={st.teamName} numberOfLines={1}>{flagOf(active.home)} {active.home.toUpperCase()}</Text>
          <Text style={st.score}>{scoreText}</Text>
          <Text style={st.teamName} numberOfLines={1}>{active.away.toUpperCase()} {flagOf(active.away)}</Text>
        </View>
        <Text style={[st.statusMini, active.status === 'LIVE' && { color: D.red }]}>
          {statusLine}{fixture ? `  ·  ${fmtDate(active.date)} · ${fixture.stadium}` : ''}
        </Text>
      </View>
      <View style={[st.headSide, { alignItems: 'flex-end' }]}>
        <Text style={st.brand}>Worldcupilou</Text>
        <Text style={st.brandSub}>by Lili Signals 🦞</Text>
      </View>
    </View>
  );

  const Picker = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.pickerScroll} contentContainerStyle={st.picker}>
      {ordered.map((m) => {
        const on = m.fixtureId === active.fixtureId;
        return (
          <Pressable key={m.fixtureId} onPress={() => setSelected(m.fixtureId)} style={[st.pick, on && st.pickOn]}>
            {m.status === 'LIVE' && <View style={st.liveDot} />}
            <Text style={[st.pickText, on && st.pickTextOn]}>{m.home} v {m.away}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const Tabs = (
    <View style={st.tabBar}>
      {TABS.map((t) => (
        <Pressable key={t} onPress={() => setTab(t)} style={[st.tab, tab === t && st.tabOn]}>
          <Text style={[st.tabText, tab === t && st.tabTextOn]}>{t}</Text>
        </Pressable>
      ))}
    </View>
  );

  const RailContent = (
    <>
      <Panel title="TERRITORY SHARE" style={rp.tight}>
        <View style={rp.shareRow}><View style={[rp.dot, { backgroundColor: D.blue }]} /><Text style={rp.shareTeam}>{active.home}</Text><Text style={[rp.sharePct, { color: D.blue }]}>{hTerr}%</Text></View>
        <View style={rp.shareRow}><View style={[rp.dot, { backgroundColor: D.red }]} /><Text style={rp.shareTeam}>{active.away}</Text><Text style={[rp.sharePct, { color: D.red }]}>{aTerr}%</Text></View>
        <View style={rp.possBar}>
          <View style={{ width: `${Math.round(h.possession * 100)}%`, backgroundColor: D.blue }} />
          <View style={{ width: `${Math.round(a.possession * 100)}%`, backgroundColor: D.red }} />
        </View>
      </Panel>

      <Panel title="TEAM STATS" style={rp.tight}>
        <StatRow label="Shots"      h={h.totalShots} a={a.totalShots} />
        <StatRow label="On Target"  h={h.shotsOnGoal} a={a.shotsOnGoal} />
        <StatRow label="Possession" h={`${Math.round(h.possession * 100)}%`} a={`${Math.round(a.possession * 100)}%`} />
        <StatRow label="Passes"     h={h.passes ?? '—'} a={a.passes ?? '—'} />
        <StatRow label="Pass Acc"   h={`${Math.round(h.passAccuracy * 100)}%`} a={`${Math.round(a.passAccuracy * 100)}%`} />
        <StatRow label="Corners"    h={h.corners} a={a.corners} />
        <StatRow label="Fouls"      h={h.fouls ?? '—'} a={a.fouls ?? '—'} />
      </Panel>

      <Panel title="HOW TO READ" style={rp.tight}>
        <View style={rp.gradient}>
          <View style={{ flex: 1, backgroundColor: D.blue }} /><View style={{ flex: 1, backgroundColor: D.purple }} /><View style={{ flex: 1, backgroundColor: D.red }} />
        </View>
        <View style={rp.gradLabels}><Text style={rp.gradText}>{active.home}</Text><Text style={rp.gradText}>Contested</Text><Text style={rp.gradText}>{active.away}</Text></View>
      </Panel>

      <Panel title="🦞 LILI INSIGHT" style={rp.tight}>
        <Text style={rp.insHead}>{headline}</Text>
        <Text style={rp.insBody}>{explain}</Text>
        <Text style={rp.insConseq}>{conseq}</Text>
      </Panel>
    </>
  );

  const Footer = <Text style={st.foot}>Heatmap & momentum modelled from possession, shots & xG — not player tracking · Data by Lili Signals</Text>;

  const Main = tab !== 'Heatmap' ? (
    <View style={st.soon}><Text style={st.soonText}>🔧  {tab} — on the roadmap, coming soon.</Text></View>
  ) : wide ? (
    <View style={st.mainRow}>
      <View style={st.leftCol}>
        <Pitch home={h} away={a} homeName={active.home} awayName={active.away} homeFormation={homeFormation} awayFormation={awayFormation} fill />
        <Momentum match={active} events={markers} />
      </View>
      <ScrollView style={st.rail} contentContainerStyle={{ paddingBottom: 4 }} showsVerticalScrollIndicator={false}>{RailContent}</ScrollView>
    </View>
  ) : (
    <View>
      <Pitch home={h} away={a} homeName={active.home} awayName={active.away} homeFormation={homeFormation} awayFormation={awayFormation} fill={false} />
      <Momentum match={active} events={markers} />
      <View style={{ marginTop: 12 }}>{RailContent}</View>
    </View>
  );

  // Home Edge is a tournament-wide module (not per-match) → its own scrollable
  // view, no match picker, no pitch.
  if (tab === HOME_EDGE) {
    return (
      <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        {Header}{Tabs}
        <HomeEdgeModule />
        {Footer}
      </ScrollView>
    );
  }

  // Desktop: fixed one-viewport layout, no page scroll. Mobile: stacked scroll.
  if (wide) {
    return (
      <View style={[st.screen, { height }]}>
        {Header}{Picker}{Tabs}
        <View style={st.wideBody}>{Main}</View>
        {Footer}
      </View>
    );
  }
  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
      {Header}{Picker}{Tabs}
      <View style={st.narrowBody}>{Main}</View>
      {Footer}
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const hp = StyleSheet.create({
  attackRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  attackLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  pitch:       { width: '100%', backgroundColor: D.pitch, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(120,180,255,0.45)',
                 overflow: 'hidden', shadowColor: D.blue, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
  row:         { flex: 1, flexDirection: 'row' },
  cell:        { flex: 1 },
  halfway:     { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1.5, marginLeft: -0.75, backgroundColor: D.line },
  centerCircle:{ position: 'absolute', left: '50%', top: '50%', width: '15%', aspectRatio: 1, marginLeft: '-7.5%',
                 marginTop: '-12%', borderRadius: 999, borderWidth: 1.5, borderColor: D.line },
  spot:        { position: 'absolute', left: '50%', top: '50%', width: 4, height: 4, borderRadius: 2, marginLeft: -2, marginTop: -2, backgroundColor: D.line },
  box:         { position: 'absolute', top: '20%', bottom: '20%', width: '15%', borderWidth: 1.5, borderColor: D.line },
  boxL:        { left: 0, borderLeftWidth: 0 },
  boxR:        { right: 0, borderRightWidth: 0 },
  sixBox:      { position: 'absolute', top: '36%', bottom: '36%', width: '6%', borderWidth: 1.5, borderColor: D.line },
  sixL:        { left: 0, borderLeftWidth: 0 },
  sixR:        { right: 0, borderRightWidth: 0 },
  penSpot:     { position: 'absolute', top: '50%', width: 3, height: 3, borderRadius: 2, marginTop: -1.5, backgroundColor: D.line },
  corner:      { position: 'absolute', width: 14, height: 14, borderRadius: 999, borderWidth: 1.5, borderColor: D.lineSoft },
});

const rp = StyleSheet.create({
  panel:      { backgroundColor: D.panel, borderRadius: 10, borderWidth: 1, borderColor: D.border, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  tight:      {},
  panelTitle: { color: D.text3, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6 },
  shareRow:   { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 2 },
  dot:        { width: 7, height: 7, borderRadius: 4 },
  shareTeam:  { color: D.text1, fontSize: 12, fontWeight: '600', flex: 1 },
  sharePct:   { fontSize: 13, fontWeight: '800' },
  possBar:    { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: D.panel2, marginTop: 6 },
  statRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  statVal:    { flex: 1, fontSize: 13, fontWeight: '800' },
  statLabel:  { flex: 2, color: D.text2, fontSize: 10, textAlign: 'center' },
  gradient:   { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  gradLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  gradText:   { color: D.text3, fontSize: 8, fontWeight: '700' },
  insHead:    { color: D.text1, fontSize: 13, fontWeight: '800', marginBottom: 3 },
  insBody:    { color: D.text2, fontSize: 11, lineHeight: 15 },
  insConseq:  { color: D.purple, fontSize: 11, lineHeight: 15, marginTop: 3, fontWeight: '600' },
});

const mc = StyleSheet.create({
  wrap:       { marginTop: 8, backgroundColor: D.panel, borderRadius: 10, borderWidth: 1, borderColor: D.border, paddingHorizontal: 10, paddingVertical: 6 },
  head:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  title:      { color: D.text3, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  legends:    { flexDirection: 'row', gap: 10 },
  lg:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lgDot:      { width: 7, height: 7, borderRadius: 4 },
  lgTxt:      { color: D.text2, fontSize: 10 },
  markerLayer:{ height: 16 },
  marker:     { position: 'absolute', marginLeft: -14, width: 28, alignItems: 'center' },
  markerTxt:  { fontSize: 9, fontWeight: '800' },
  chart:      { flexDirection: 'row', height: 46, alignItems: 'stretch' },
  col:        { flex: 1, justifyContent: 'center' },
  halfTop:    { flex: 1, justifyContent: 'flex-end' },
  mid:        { height: 1, backgroundColor: D.border },
  halfBot:    { flex: 1, justifyContent: 'flex-start' },
  axis:       { height: 12, marginTop: 2 },
  axisLabel:  { position: 'absolute', color: D.text3, fontSize: 8, marginLeft: -7 },
});

const st = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: D.bg },
  empty:     { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: D.text2, textAlign: 'center' },

  header:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8,
               backgroundColor: D.panel, borderBottomWidth: 1, borderBottomColor: D.border, flexWrap: 'wrap' },
  headSide:  { flex: 1, minWidth: 100 },
  headTitle: { color: D.text1, fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },
  headSub:   { color: D.text2, fontSize: 10, marginTop: 1 },
  headCenter:{ alignItems: 'center', minWidth: 220 },
  scoreRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  teamName:  { color: D.text1, fontSize: 13, fontWeight: '800' },
  score:     { color: D.text1, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  statusMini:{ color: D.text2, fontSize: 9, fontWeight: '700', marginTop: 1 },
  brand:     { color: D.purple, fontSize: 13, fontWeight: '800' },
  brandSub:  { color: D.text2, fontSize: 9 },

  pickerScroll:{ flexGrow: 0 },
  picker:    { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingVertical: 6 },
  pick:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: D.panel, borderWidth: 1, borderColor: D.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pickOn:    { borderColor: D.blue, backgroundColor: 'rgba(46,124,255,0.14)' },
  pickText:  { color: D.text2, fontSize: 10, fontWeight: '600' },
  pickTextOn:{ color: D.text1 },
  liveDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: D.red },

  tabBar:    { flexDirection: 'row', gap: 2, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: D.border },
  tab:       { paddingHorizontal: 9, paddingVertical: 7 },
  tabOn:     { borderBottomWidth: 2, borderBottomColor: D.purple },
  tabText:   { color: D.text3, fontSize: 11, fontWeight: '600' },
  tabTextOn: { color: D.text1, fontWeight: '800' },

  wideBody:  { flex: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, minHeight: 0 },
  narrowBody:{ paddingHorizontal: 14, paddingTop: 10 },
  mainRow:   { flex: 1, flexDirection: 'row', gap: 12, minHeight: 0 },
  leftCol:   { flex: 1, minWidth: 0, minHeight: 0 },
  rail:      { width: 290, flexGrow: 0 },

  soon:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  soonText:  { color: D.text2, fontSize: 14 },

  foot:      { color: D.text3, fontSize: 9, textAlign: 'center', paddingHorizontal: 16, paddingVertical: 5, fontStyle: 'italic' },
});
