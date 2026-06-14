import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

// ─── Tokens ──────────────────────────────────────────────────────────────────
const D = {
  bg:      '#05070F',
  panel:   '#0B1426',
  panel2:  '#0E1A33',
  border:  'rgba(80,140,255,0.12)',
  blue:    '#3D8BFF',
  red:     '#FF4D4D',
  purple:  '#9B6BFF',
  pitch:   '#0A1A12',
  line:    'rgba(255,255,255,0.13)',
  text1:   '#EEF2FF',
  text2:   '#8499BE',
  text3:   '#4A5E84',
};
const PITCH_COLS = 34, PITCH_ROWS = 21;

function rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}
const flagOf = (name: string) => WC_TEAMS.find((t) => t.name === name)?.flag ?? '🏳';
const surname = (full: string) => { const p = full.trim().split(' '); return p.length > 1 ? `${p[0][0]}. ${p[p.length - 1]}` : full; };
function fmtDate(iso: string): string {
  const d = new Date(iso);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Heat overlay ──────────────────────────────────────────────────────────────
function HeatLayer({ grid, color }: { grid: HeatGrid; color: string }) {
  const rows = [];
  for (let cy = 0; cy < grid.rows; cy++) {
    const cells = [];
    for (let cx = 0; cx < grid.cols; cx++) {
      const v = grid.cells[cy * grid.cols + cx];
      const alpha = Math.pow(v, 0.85) * (0.30 + 0.70 * grid.share);
      cells.push(<View key={cx} style={[hp.cell, alpha > 0.015 ? { backgroundColor: rgba(color, alpha) } : null]} />);
    }
    rows.push(<View key={cy} style={hp.row}>{cells}</View>);
  }
  return <View style={StyleSheet.absoluteFill}>{rows}</View>;
}

function CombinedPitch({ home, away, homeName, awayName, homeFormation, awayFormation }: {
  home: TeamMatchStats; away: TeamMatchStats; homeName: string; awayName: string; homeFormation?: string; awayFormation?: string;
}) {
  const homeGrid = useMemo(() => buildHeatGrid(home, 'ltr', PITCH_COLS, PITCH_ROWS, homeFormation), [home, homeFormation]);
  const awayGrid = useMemo(() => buildHeatGrid(away, 'rtl', PITCH_COLS, PITCH_ROWS, awayFormation), [away, awayFormation]);
  return (
    <View>
      <View style={hp.attackRow}>
        <Text style={[hp.attackLabel, { color: D.blue }]}>{homeName.toUpperCase()} ATTACK →</Text>
        <Text style={[hp.attackLabel, { color: D.red }]}>← {awayName.toUpperCase()} ATTACK</Text>
      </View>
      <View style={hp.pitch}>
        <HeatLayer grid={homeGrid} color={D.blue} />
        <HeatLayer grid={awayGrid} color={D.red} />
        {/* markings */}
        <View style={hp.halfway} />
        <View style={hp.centerCircle} />
        <View style={hp.centerSpot} />
        <View style={[hp.box, hp.boxL]} /><View style={[hp.box, hp.boxR]} />
        <View style={[hp.sixBox, hp.sixL]} /><View style={[hp.sixBox, hp.sixR]} />
        <View style={[hp.penSpot, { left: '9%' }]} /><View style={[hp.penSpot, { right: '9%' }]} />
      </View>
    </View>
  );
}

// ─── Right-rail panels ───────────────────────────────────────────────────────
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={rp.panel}>
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

// ─── Momentum timeline ─────────────────────────────────────────────────────────
function MomentumChart({ match, events }: { match: MatchStats; events: MatchEventMarker[] }) {
  const end = match.status === 'LIVE' && match.elapsed ? Math.max(match.elapsed, 1) : 90;
  const momEvents: MomentumEvent[] = events
    .filter((e) => e.kind === 'goal' || e.kind === 'red')
    .map((e) => ({ minute: e.minute, side: e.side, kind: e.kind === 'goal' ? 'goal' : 'red' }));
  const points = useMemo(
    () => buildMomentum(match.fixtureId, match.homeStats.possession, end, momEvents),
    [match.fixtureId, match.homeStats.possession, end, JSON.stringify(momEvents)]);
  const axis = [0, 15, 30, 45, 60, 75, 90].filter((m) => m <= Math.max(end, 90));

  return (
    <View style={mc.wrap}>
      <View style={mc.legendRow}>
        <Text style={mc.title}>MOMENTUM & TIMELINE</Text>
        <View style={mc.legends}>
          <Legend color={D.blue} label={match.home} />
          <Legend color={D.red} label={match.away} />
          <Legend color={D.purple} label="Key events" />
        </View>
      </View>

      {/* event markers */}
      <View style={mc.markerLayer}>
        {events.map((e, i) => (
          <View key={i} style={[mc.marker, { left: `${(e.minute / Math.max(end, 90)) * 100}%` }]}>
            <Text style={mc.markerIcon}>{e.icon}</Text>
            <Text style={[mc.markerMin, { color: e.side === 'home' ? D.blue : D.red }]}>{e.minute}'</Text>
            {e.label ? <Text style={mc.markerName} numberOfLines={1}>{e.label}</Text> : null}
          </View>
        ))}
      </View>

      {/* bars from center baseline: home up (blue), away down (red) */}
      <View style={mc.chart}>
        {points.map((p, i) => (
          <View key={i} style={mc.col}>
            <View style={mc.halfTop}>
              {p.value > 0 && <View style={{ height: `${Math.min(100, p.value * 100)}%`, width: '100%', backgroundColor: rgba(D.blue, 0.85), borderTopLeftRadius: 1, borderTopRightRadius: 1 }} />}
            </View>
            <View style={mc.center} />
            <View style={mc.halfBot}>
              {p.value < 0 && <View style={{ height: `${Math.min(100, -p.value * 100)}%`, width: '100%', backgroundColor: rgba(D.red, 0.85) }} />}
            </View>
          </View>
        ))}
      </View>

      <View style={mc.axis}>
        {axis.map((m) => (
          <Text key={m} style={[mc.axisLabel, { left: `${(m / Math.max(end, 90)) * 100}%` }]}>{m}'</Text>
        ))}
      </View>
    </View>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={mc.legendItem}>
      <View style={[mc.legendDot, { backgroundColor: color }]} />
      <Text style={mc.legendText}>{label}</Text>
    </View>
  );
}

interface MatchEventMarker { minute: number; side: 'home' | 'away'; kind: 'goal' | 'yellow' | 'red'; icon: string; label?: string }

const TABS = ['Overview', 'Heatmap', 'Attack Zones', 'Shots', 'Pass Map', 'Players'];

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function MatchHeatmapScreen() {
  const insets   = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide     = width >= 820;
  const matches  = useLiveStats();
  const results  = useLiveResults();
  const lineups  = useLineups();
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
  // territory share from the heat model
  const hShare = buildHeatGrid(h, 'ltr', PITCH_COLS, PITCH_ROWS, homeFormation).share;
  const aShare = buildHeatGrid(a, 'rtl', PITCH_COLS, PITCH_ROWS, awayFormation).share;
  const hTerr  = Math.round((hShare / (hShare + aShare || 1)) * 100);
  const aTerr  = 100 - hTerr;

  // events for markers
  const ev = MATCH_EVENTS.find((e) => e.fixtureId === active.fixtureId);
  const markers: MatchEventMarker[] = ev ? [
    ...ev.goals.map((g) => ({ minute: g.minute, side: (g.team === active.home ? 'home' : 'away') as 'home' | 'away', kind: 'goal' as const, icon: g.type === 'own-goal' ? '⚽' : '⚽', label: surname(g.player) })),
    ...ev.redCards.map((c) => ({ minute: c.minute ?? 0, side: (c.team === active.home ? 'home' : 'away') as 'home' | 'away', kind: 'red' as const, icon: '🟥' })),
    ...ev.yellowCards.map((c) => ({ minute: c.minute ?? 0, side: (c.team === active.home ? 'home' : 'away') as 'home' | 'away', kind: 'yellow' as const, icon: '🟨' })),
  ].sort((x, y) => x.minute - y.minute) : [];

  const statusLine = active.status === 'LIVE' ? `LIVE ${active.elapsed ?? ''}'` : 'FULL TIME';
  const res = results[`${active.home}|${active.away}`];
  const scoreText = res && res.homeScore != null && res.awayScore != null ? `${res.homeScore} – ${res.awayScore}` : 'vs';

  // Lili insight (templated from the data)
  const dom = hTerr >= aTerr ? active.home : active.away;
  const sub = hTerr >= aTerr ? active.away : active.home;
  const domShots = hTerr >= aTerr ? h.totalShots : a.totalShots;
  const subShots = hTerr >= aTerr ? a.totalShots : h.totalShots;
  const insight = `${dom} controlled territory (${Math.max(hTerr, aTerr)}%) and out-shot ${sub} ${domShots}–${subShots}. ${sub} struggled to progress beyond the middle third.`;

  const Rail = (
    <View style={[st.rail, wide ? { width: 300 } : { width: '100%' }]}>
      <Panel title="TERRITORY SHARE">
        <View style={rp.shareRow}><View style={[rp.dot, { backgroundColor: D.blue }]} /><Text style={rp.shareTeam}>{active.home}</Text><Text style={[rp.sharePct, { color: D.blue }]}>{hTerr}%</Text></View>
        <View style={rp.shareRow}><View style={[rp.dot, { backgroundColor: D.red }]} /><Text style={rp.shareTeam}>{active.away}</Text><Text style={[rp.sharePct, { color: D.red }]}>{aTerr}%</Text></View>
      </Panel>

      <Panel title="BALL POSSESSION">
        <View style={rp.possBar}>
          <View style={{ width: `${Math.round(h.possession * 100)}%`, backgroundColor: D.blue }} />
          <View style={{ width: `${Math.round(a.possession * 100)}%`, backgroundColor: D.red }} />
        </View>
        <View style={rp.possLabels}>
          <Text style={[rp.sharePct, { color: D.blue }]}>{Math.round(h.possession * 100)}%</Text>
          <Text style={[rp.sharePct, { color: D.red }]}>{Math.round(a.possession * 100)}%</Text>
        </View>
      </Panel>

      <Panel title="TEAM STATS">
        <StatRow label="Total Shots"     h={h.totalShots} a={a.totalShots} />
        <StatRow label="Shots on Target" h={h.shotsOnGoal} a={a.shotsOnGoal} />
        <StatRow label="Possession"      h={`${Math.round(h.possession * 100)}%`} a={`${Math.round(a.possession * 100)}%`} />
        <StatRow label="Passes"          h={h.passes ?? '—'} a={a.passes ?? '—'} />
        <StatRow label="Pass Accuracy"   h={`${Math.round(h.passAccuracy * 100)}%`} a={`${Math.round(a.passAccuracy * 100)}%`} />
        <StatRow label="Corners"         h={h.corners} a={a.corners} />
        <StatRow label="Fouls"           h={h.fouls ?? '—'} a={a.fouls ?? '—'} />
      </Panel>

      <Panel title="HOW TO READ">
        <View style={rp.gradient}>
          <View style={{ flex: 1, backgroundColor: D.blue }} />
          <View style={{ flex: 1, backgroundColor: D.purple }} />
          <View style={{ flex: 1, backgroundColor: D.red }} />
        </View>
        <View style={rp.gradLabels}>
          <Text style={rp.gradText}>More {active.home}</Text>
          <Text style={rp.gradText}>Contested</Text>
          <Text style={rp.gradText}>More {active.away}</Text>
        </View>
      </Panel>

      <Panel title="🦞  LILI INSIGHT">
        <Text style={rp.insight}>{insight}</Text>
      </Panel>
    </View>
  );

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
      {/* Header */}
      <View style={st.header}>
        <View style={st.headSide}>
          <Text style={st.headTitle}>TERRITORY HEATMAP</Text>
          {fixture && <Text style={st.headSub}>Group {fixture.group} – Matchday {fixture.matchday}</Text>}
        </View>
        <View style={st.headCenter}>
          <View style={st.scoreRow}>
            <Text style={st.teamName} numberOfLines={1}>{flagOf(active.home)} {active.home.toUpperCase()}</Text>
            <Text style={st.score}>{scoreText}</Text>
            <Text style={st.teamName} numberOfLines={1}>{active.away.toUpperCase()} {flagOf(active.away)}</Text>
          </View>
          <Text style={[st.statusMini, active.status === 'LIVE' && { color: D.red }]}>{statusLine}</Text>
          {fixture && <Text style={st.venue}>{fmtDate(active.date)} – {fixture.stadium}, {fixture.city}</Text>}
        </View>
        <View style={[st.headSide, { alignItems: 'flex-end' }]}>
          <Text style={st.brand}>Worldcupilou</Text>
          <Text style={st.brandSub}>by Lili Signals 🦞</Text>
        </View>
      </View>

      {/* match picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.picker}>
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

      {/* tabs */}
      <View style={st.tabBar}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[st.tab, tab === t && st.tabOn]}>
            <Text style={[st.tabText, tab === t && st.tabTextOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab !== 'Heatmap' ? (
        <View style={st.soon}><Text style={st.soonText}>🔧  {tab} — on the roadmap, coming soon.</Text></View>
      ) : (
        <View style={[st.body, wide ? st.bodyRow : st.bodyCol]}>
          <View style={st.pitchWrap}>
            <CombinedPitch home={h} away={a} homeName={active.home} awayName={active.away} homeFormation={homeFormation} awayFormation={awayFormation} />
            <MomentumChart match={active} events={markers} />
          </View>
          {Rail}
        </View>
      )}

      <Text style={st.foot}>Heatmap & momentum are modelled from possession, shots and xG — not player tracking.  ·  Data by Lili Signals Intelligence</Text>
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const hp = StyleSheet.create({
  attackRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  attackLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  pitch:       { width: '100%', aspectRatio: PITCH_COLS / PITCH_ROWS, backgroundColor: D.pitch,
                 borderRadius: 8, borderWidth: 1, borderColor: D.line, overflow: 'hidden' },
  row:         { flex: 1, flexDirection: 'row' },
  cell:        { flex: 1 },
  halfway:     { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: D.line },
  centerCircle:{ position: 'absolute', left: '50%', top: '50%', width: '16%', aspectRatio: 1, marginLeft: '-8%',
                 marginTop: '-12.7%', borderRadius: 999, borderWidth: 1, borderColor: D.line },
  centerSpot:  { position: 'absolute', left: '50%', top: '50%', width: 3, height: 3, borderRadius: 2, marginLeft: -1.5, marginTop: -1.5, backgroundColor: D.line },
  box:         { position: 'absolute', top: '22%', bottom: '22%', width: '15%', borderWidth: 1, borderColor: D.line },
  boxL:        { left: 0, borderLeftWidth: 0 },
  boxR:        { right: 0, borderRightWidth: 0 },
  sixBox:      { position: 'absolute', top: '37%', bottom: '37%', width: '6%', borderWidth: 1, borderColor: D.line },
  sixL:        { left: 0, borderLeftWidth: 0 },
  sixR:        { right: 0, borderRightWidth: 0 },
  penSpot:     { position: 'absolute', top: '50%', width: 3, height: 3, borderRadius: 2, marginTop: -1.5, backgroundColor: D.line },
});

const rp = StyleSheet.create({
  panel:      { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12, marginBottom: 10 },
  panelTitle: { color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  shareRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  shareTeam:  { color: D.text1, fontSize: 13, fontWeight: '600', flex: 1 },
  sharePct:   { fontSize: 15, fontWeight: '800' },
  possBar:    { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: D.panel2 },
  possLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  statRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  statVal:    { flex: 1, fontSize: 14, fontWeight: '800' },
  statLabel:  { flex: 2, color: D.text2, fontSize: 11, textAlign: 'center' },
  gradient:   { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  gradLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  gradText:   { color: D.text3, fontSize: 9, fontWeight: '600' },
  insight:    { color: D.text2, fontSize: 12, lineHeight: 18 },
});

const mc = StyleSheet.create({
  wrap:       { marginTop: 14, backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12 },
  legendRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  title:      { color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  legends:    { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: D.text2, fontSize: 11 },
  markerLayer:{ height: 30, marginBottom: 2 },
  marker:     { position: 'absolute', alignItems: 'center', marginLeft: -18, width: 36 },
  markerIcon: { fontSize: 10 },
  markerMin:  { fontSize: 9, fontWeight: '800' },
  markerName: { color: D.text3, fontSize: 8 },
  chart:      { flexDirection: 'row', height: 84, alignItems: 'stretch' },
  col:        { flex: 1, justifyContent: 'center' },
  halfTop:    { flex: 1, justifyContent: 'flex-end' },
  center:     { height: 1, backgroundColor: D.border },
  halfBot:    { flex: 1, justifyContent: 'flex-start' },
  axis:       { height: 16, marginTop: 4 },
  axisLabel:  { position: 'absolute', color: D.text3, fontSize: 9, marginLeft: -8 },
});

const st = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: D.bg },
  empty:     { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: D.text2, textAlign: 'center' },

  header:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
               backgroundColor: D.panel, borderBottomWidth: 1, borderBottomColor: D.border, flexWrap: 'wrap' },
  headSide:  { flex: 1, minWidth: 110 },
  headTitle: { color: D.text1, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  headSub:   { color: D.text2, fontSize: 11, marginTop: 2 },
  headCenter:{ alignItems: 'center', minWidth: 200 },
  scoreRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  teamName:  { color: D.text1, fontSize: 15, fontWeight: '800' },
  score:     { color: D.text1, fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  statusMini:{ color: D.text2, fontSize: 11, fontWeight: '700', marginTop: 2 },
  venue:     { color: D.text3, fontSize: 10, marginTop: 3 },
  brand:     { color: D.purple, fontSize: 14, fontWeight: '800' },
  brandSub:  { color: D.text2, fontSize: 10 },

  picker:    { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  pick:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: D.panel, borderWidth: 1, borderColor: D.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pickOn:    { borderColor: D.blue, backgroundColor: 'rgba(61,139,255,0.12)' },
  pickText:  { color: D.text2, fontSize: 11, fontWeight: '600' },
  pickTextOn:{ color: D.text1 },
  liveDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: D.red },

  tabBar:    { flexDirection: 'row', gap: 4, paddingHorizontal: 12, flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: D.border },
  tab:       { paddingHorizontal: 10, paddingVertical: 9 },
  tabOn:     { borderBottomWidth: 2, borderBottomColor: D.purple },
  tabText:   { color: D.text3, fontSize: 12, fontWeight: '600' },
  tabTextOn: { color: D.text1, fontWeight: '800' },

  body:      { padding: 16, gap: 14 },
  bodyRow:   { flexDirection: 'row', alignItems: 'flex-start' },
  bodyCol:   { flexDirection: 'column' },
  pitchWrap: { flex: 1, minWidth: 0 },
  rail:      {},

  soon:      { padding: 40, alignItems: 'center' },
  soonText:  { color: D.text2, fontSize: 14 },

  foot:      { color: D.text3, fontSize: 10, textAlign: 'center', paddingHorizontal: 16, paddingTop: 6, fontStyle: 'italic' },
});
