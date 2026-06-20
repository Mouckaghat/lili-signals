import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildHeatGrid, type HeatGrid, type TeamMatchStats } from '../lib/heatmap';
import { forecastMatch } from '../lib/heatmapForecast';
import { HEATMAP_I18N, hmT } from '../lib/heatmapI18n';
import { useLanguage } from '../contexts/LanguageContext';
import type { MatchStats } from '../lib/matchStatsData';
import { useLiveStats } from '../lib/useLiveStats';
import { useLiveResults } from '../lib/useLiveResults';
import { useLineups } from '../lib/useLineups';
import { WC_FIXTURES, WC_TEAMS } from '../lib/wcData';
import HomeEdgeModule from '../components/HomeEdgeModule';
import PlayersModule from '../components/PlayersModule';
import AttackZonesModule from '../components/AttackZonesModule';
import OverviewModule, { TournamentImpactPanel } from '../components/OverviewModule';
import PassMapModule from '../components/PassMapModule';
import ShotsModule from '../components/ShotsModule';
import { MomentumPanel, AttackZonesPanel, ShotsMapPanel, PassMapPanel } from '../components/MatchDashboard';
import TerritoryPitch from '../components/TerritoryPitch';

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
  line:    'rgba(229,239,255,0.92)',   // pitch markings — bright, must read above heat
  lineSoft:'rgba(229,239,255,0.55)',   // secondary markings (corners, arcs)
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
function fmtDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
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

// Momentum now renders via the shared smooth-wave MomentumPanel (components/MatchDashboard).

const DASHBOARD = '📈 Dashboard';
const OVERVIEW = '📊 Overview';
const HOME_EDGE = '🏟 Home Edge';
const PLAYERS = '👤 Players';
const ATTACK = '⚔️ Attack Zones';
const PASSMAP = '🕸 Pass Map';
const SHOTS = '🎯 Shots';
const TABS = [DASHBOARD, OVERVIEW, 'Heatmap', HOME_EDGE, ATTACK, SHOTS, PASSMAP, PLAYERS];

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function MatchHeatmapScreen() {
  const insets    = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide      = width >= 860;
  const matches   = useLiveStats();
  const results   = useLiveResults();
  const lineups   = useLineups();
  const { lang }  = useLanguage();
  const t         = HEATMAP_I18N[lang] ?? HEATMAP_I18N.EN;
  // Land on Overview (real match content); Dashboard is an empty placeholder
  // until the tournament command centre is built.
  const [tab, setTab] = useState(OVERVIEW);

  const ordered = useMemo(() =>
    [...matches].sort((a, b) => (a.status === 'LIVE' ? -1 : 0) - (b.status === 'LIVE' ? -1 : 0) || b.date.localeCompare(a.date)),
  [matches]);

  const { fixtureId } = useLocalSearchParams<{ fixtureId?: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const requestedId = selected ?? fixtureId;
  const liveActive = ordered.find((m) => m.fixtureId === requestedId);

  // Pre-kickoff: the requested fixture has no live stats yet. If it's a real
  // upcoming fixture, show Lili's FORECAST heatmap (predicted pressure) rather
  // than a dead end — it morphs into the live model the moment the game starts.
  const forecast = useMemo(
    () => (requestedId && !liveActive ? forecastMatch(requestedId) : null),
    [requestedId, liveActive],
  );

  // Resolve which match to show. If a specific fixture was requested (deep-link
  // from the timeline), ALWAYS anchor to it — live stats if available, else its
  // forecast. Only when NO fixture was requested do we default to the most
  // relevant live/recent game. This is the fix for the screen silently showing
  // an unrelated game (e.g. "Mexico v South Korea") when the tapped fixture
  // isn't in the live feed yet.
  const forecastActive: MatchStats | null = forecast ? {
    fixtureId: forecast.fixtureId, home: forecast.home, away: forecast.away,
    date: forecast.date, status: 'LIVE', elapsed: null,
    homeStats: forecast.homeStats, awayStats: forecast.awayStats,
  } : null;
  const active: MatchStats | null = liveActive
    ?? forecastActive
    ?? (requestedId ? null : ordered[0] ?? null);

  if (!active) {
    const name = requestedId ? WC_FIXTURES.find((f) => f.id === requestedId) : undefined;
    return (
      <View style={[st.screen, st.empty]}>
        <Text style={st.emptyText}>
          {name ? `${name.home} v ${name.away} hasn't kicked off yet — the heatmap appears at kickoff.`
                : 'No match stats yet. Heatmaps appear once a game kicks off.'}
        </Text>
      </View>
    );
  }
  const isForecast = !!forecast && active.fixtureId === forecast.fixtureId;

  const fixture = WC_FIXTURES.find((f) => f.id === active.fixtureId);
  const lineup  = lineups.find((l) => l.fixtureKey === `${active.home}|${active.away}`);
  const homeFormation = lineup?.home.formation && lineup.home.formation !== '?' ? lineup.home.formation : undefined;
  const awayFormation = lineup?.away.formation && lineup.away.formation !== '?' ? lineup.away.formation : undefined;

  const h = active.homeStats, a = active.awayStats;
  const hShare = buildHeatGrid(h, 'ltr', PITCH_COLS, PITCH_ROWS, homeFormation).share;
  const aShare = buildHeatGrid(a, 'rtl', PITCH_COLS, PITCH_ROWS, awayFormation).share;
  const hTerr  = Math.round((hShare / (hShare + aShare || 1)) * 100);
  const aTerr  = 100 - hTerr;

  const statusLine = isForecast ? 'FORECAST' : active.status === 'LIVE' ? `LIVE ${active.elapsed ?? ''}'` : 'FULL TIME';
  const res = results[`${active.home}|${active.away}`];
  const scoreText = res && res.homeScore != null && res.awayScore != null ? `${res.homeScore} – ${res.awayScore}` : 'vs';

  // Lili insight: headline · explanation · consequence
  const dom = hTerr >= aTerr ? active.home : active.away;
  const sub = hTerr >= aTerr ? active.away : active.home;
  const domShots = hTerr >= aTerr ? h.totalShots : a.totalShots;
  const subShots = hTerr >= aTerr ? a.totalShots : h.totalShots;
  const domPoss  = Math.round((hTerr >= aTerr ? h.possession : a.possession) * 100);
  const margin   = Math.abs(hTerr - aTerr);
  let headline = margin >= 24 ? hmT(t.insHeadDom, { dom }) : margin >= 10 ? hmT(t.insHeadEdge, { dom }) : t.insHeadEven;
  let explain  = hmT(t.insExplain, { pct: domPoss, hi: domShots, lo: subShots });
  let conseq   = margin >= 10 ? hmT(t.insConseqEdge, { sub }) : t.insConseqEven;

  // Forecast wording — predicted, not past tense; led by Lili's win probability.
  if (isForecast && forecast) {
    const hw = Math.round(forecast.homeWin * 100);
    const dw = Math.round(forecast.draw * 100);
    const aw = Math.round(forecast.awayWin * 100);
    const tight = Math.abs(forecast.homeWin - forecast.awayWin) < 0.08;
    const fav = forecast.homeWin >= forecast.awayWin ? active.home : active.away;
    headline = tight ? t.fcHeadTight : hmT(t.fcHeadFav, { fav });
    explain  = hmT(t.fcOdds, { home: active.home, hw, dw, away: active.away, aw });
    conseq   = hmT(t.fcConseq, { dom, pct: domPoss });
  }

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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={st.tabBarScroll}
      contentContainerStyle={st.tabBar}
    >
      {TABS.map((t) => (
        <Pressable key={t} onPress={() => setTab(t)} style={[st.tab, tab === t && st.tabOn]}>
          <Text style={[st.tabText, tab === t && st.tabTextOn]}>{t}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const RailContent = (
    <>
      <Panel title="🦞 LILI INSIGHT" style={rp.tight}>
        <Text style={rp.insHead}>{headline}</Text>
        <Text style={rp.insBody}>{explain}</Text>
        <Text style={rp.insConseq}>{conseq}</Text>
      </Panel>

      <Panel title="HOW TO READ" style={rp.tight}>
        <View style={rp.gradient}>
          <View style={{ flex: 1, backgroundColor: D.red }} /><View style={{ flex: 1, backgroundColor: D.purple }} /><View style={{ flex: 1, backgroundColor: D.blue }} />
        </View>
        <View style={rp.gradLabels}><Text style={rp.gradText}>{active.away}</Text><Text style={rp.gradText}>Contested</Text><Text style={rp.gradText}>{active.home}</Text></View>
      </Panel>

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
    </>
  );

  const Footer = <Text style={st.foot}>Heatmap & momentum modelled from possession, shots & xG — not player tracking · Data by Lili Signals</Text>;

  // Pre-kickoff forecast view: predicted pressure on the same pitch, clearly
  // labelled as a forecast. No momentum/score yet — those begin at kickoff.
  if (isForecast && forecast) {
    const basisLine =
      forecast.basis === 'form'     ? t.fcBasisForm
      : forecast.basis === 'mixed'  ? t.fcBasisMixed
      :                               t.fcBasisStrength;
    return (
      <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        {Header}
        <View style={st.fcBanner}>
          <Text style={st.fcBannerTitle}>{t.fcBannerTitle}</Text>
          <Text style={st.fcBannerSub}>{basisLine}. {t.fcBannerTail}</Text>
        </View>
        <View style={[st.narrowBody, wide && st.heatBody]}>
          <TerritoryPitch homeName={active.home} awayName={active.away} homeFrac={hTerr / 100} />
          <View style={st.fcNote}>
            <Text style={st.fcNoteText}>{t.fcNote}</Text>
          </View>
          <View style={{ marginTop: 12 }}>{RailContent}</View>
        </View>
        {Footer}
      </ScrollView>
    );
  }

  // Phone is the source of truth: one scrollable column (pitch → momentum →
  // cards). On laptop/desktop the SAME pieces are arranged as a two-column
  // workstation — LEFT (pitch + momentum directly below it), RIGHT (the four
  // cards stacked). Still inside the page ScrollView (no fixed 100vh, no nested
  // rail scroll), centred + width-bounded so the pitch stays bounded and tidy.
  const Main = tab !== 'Heatmap' ? (
    <View style={st.soon}><Text style={st.soonText}>🔧  {tab} — on the roadmap, coming soon.</Text></View>
  ) : wide ? (
    <View style={st.heatRow}>
      <View style={st.heatLeft}>
        <TerritoryPitch homeName={active.home} awayName={active.away} homeFrac={hTerr / 100} />
        <MomentumPanel match={active} />
      </View>
      <View style={st.heatRight}>{RailContent}</View>
    </View>
  ) : (
    <View>
      <TerritoryPitch homeName={active.home} awayName={active.away} homeFrac={hTerr / 100} />
      <MomentumPanel match={active} />
      <View style={{ marginTop: 12 }}>{RailContent}</View>
    </View>
  );

  // Dashboard — reserved for the future TOURNAMENT-level command centre
  // (rankings, Home Edge, team highlights, Lili signals). Tournament-level, so
  // no match picker. Match analytics now live in their own per-match tabs.
  if (tab === DASHBOARD) {
    return (
      <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        {Header}{Tabs}
        <View style={st.placeholder}>
          <Text style={st.placeholderTitle}>📈 Dashboard</Text>
          <Text style={st.placeholderBody}>Dashboard command centre coming soon.</Text>
          <Text style={st.placeholderSub}>Tournament rankings, Home Edge, team highlights and Lili signals will live here.</Text>
        </View>
        {Footer}
      </ScrollView>
    );
  }

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

  // Players is tournament-wide but uses the selected match for Hero/Contributors
  // → keep the picker; own scrollable view.
  if (tab === PLAYERS) {
    return (
      <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        {Header}{Picker}{Tabs}
        <PlayersModule match={active} />
        {Footer}
      </ScrollView>
    );
  }

  if (tab === ATTACK) {
    return (
      <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        {Header}{Picker}{Tabs}
        <AttackZonesPanel match={active} />
        <AttackZonesModule match={active} />
        {Footer}
      </ScrollView>
    );
  }

  if (tab === OVERVIEW) {
    return (
      <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        {Header}{Picker}{Tabs}
        <OverviewModule match={active} />
        <TournamentImpactPanel match={active} />
        {Footer}
      </ScrollView>
    );
  }

  if (tab === PASSMAP) {
    return (
      <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        {Header}{Picker}{Tabs}
        <PassMapPanel match={active} />
        <PassMapModule match={active} />
        {Footer}
      </ScrollView>
    );
  }

  if (tab === SHOTS) {
    return (
      <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        {Header}{Picker}{Tabs}
        <ShotsMapPanel match={active} />
        <ShotsModule match={active} />
        {Footer}
      </ScrollView>
    );
  }

  // One scrolling model for every width (phone is the reference). The page —
  // not a nested container — scrolls, so the pitch shows first and momentum,
  // stats & Lili insight are always reachable below it.
  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
      {Header}{Picker}{Tabs}
      <View style={st.narrowBody}>{Main}</View>
      {Footer}
    </ScrollView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
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

  tabBarScroll:{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: D.border },
  tabBar:    { flexDirection: 'row', gap: 2, paddingHorizontal: 12 },
  tab:       { paddingHorizontal: 9, paddingVertical: 7 },
  tabOn:     { borderBottomWidth: 2, borderBottomColor: D.purple },
  tabText:   { color: D.text3, fontSize: 11, fontWeight: '600' },
  tabTextOn: { color: D.text1, fontWeight: '800' },

  narrowBody:{ paddingHorizontal: 14, paddingTop: 10 },
  // Heatmap on laptop/desktop: same scrolling column as phone, just centred and
  // width-bounded so the pitch stays beautiful but never fills the viewport.
  heatBody:  { width: '100%', maxWidth: 760, alignSelf: 'center' },
  // Two-column workstation (wide only): pitch + momentum left, cards right.
  heatRow:   { flexDirection: 'row', gap: 16, alignItems: 'flex-start', width: '100%', maxWidth: 1080, alignSelf: 'center' },
  heatLeft:  { flex: 1, minWidth: 0 },
  heatRight: { width: 320 },

  soon:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  soonText:  { color: D.text2, fontSize: 14 },
  placeholder:      { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 64, gap: 8 },
  placeholderTitle: { color: D.text1, fontSize: 22, fontWeight: '900', letterSpacing: 0.4 },
  placeholderBody:  { color: D.text2, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  placeholderSub:   { color: D.text3, fontSize: 12, textAlign: 'center', maxWidth: 360 },

  fcBanner:      { marginHorizontal: 14, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                   borderWidth: 1, borderColor: 'rgba(154,82,255,0.45)', backgroundColor: 'rgba(154,82,255,0.12)' },
  fcBannerTitle: { color: D.purple, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  fcBannerSub:   { color: D.text2, fontSize: 10, marginTop: 2, lineHeight: 14 },
  fcNote:        { marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: D.panel, borderWidth: 1, borderColor: D.border },
  fcNoteText:    { color: D.text3, fontSize: 10, lineHeight: 14, fontStyle: 'italic' },

  foot:      { color: D.text3, fontSize: 9, textAlign: 'center', paddingHorizontal: 16, paddingVertical: 5, fontStyle: 'italic' },
});
