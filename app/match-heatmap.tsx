import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MatchStats } from '../lib/matchStatsData';
import { useLiveStats } from '../lib/useLiveStats';
import { useLiveResults } from '../lib/useLiveResults';
import { WC_FIXTURES, WC_TEAMS } from '../lib/wcData';
import { WC_KNOCKOUT } from '../lib/knockoutData';
import HomeEdgeModule from '../components/HomeEdgeModule';
import PlayersModule from '../components/PlayersModule';
import AttackZonesModule from '../components/AttackZonesModule';
import OverviewModule, { TournamentImpactPanel } from '../components/OverviewModule';
import PassMapModule from '../components/PassMapModule';
import ShotsModule from '../components/ShotsModule';
import DashboardModule from '../components/DashboardModule';
import { useProfile } from '../contexts/ProfileContext';
import Brand from '../components/Brand';
import { AttackZonesPanel, ShotsMapPanel, PassMapPanel } from '../components/MatchDashboard';

// ─── Tokens ──────────────────────────────────────────────────────────────────
const D = {
  bg:      '#04060D',
  panel:   '#0A1322',
  panel2:  '#0F1C33',
  border:  'rgba(86,140,224,0.16)',
  blue:    '#2E7CFF',
  red:     '#FF3B47',
  purple:  '#9A52FF',
  text1:   '#F1F5FF',
  text2:   '#8DA2C8',
  text3:   '#52668C',
};

const flagOf = (name: string) => WC_TEAMS.find((t) => t.name === name)?.flag ?? '🏳';
function fmtDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const DASHBOARD = '📈 Dashboard';
const OVERVIEW = '📊 Overview';
const HOME_EDGE = '🏟 Home Edge';
const PLAYERS = '👤 Players';
const ATTACK = '⚔️ Attack Zones';
const PASSMAP = '🕸 Pass Map';
const SHOTS = '🎯 Shots';
const TABS = [DASHBOARD, OVERVIEW, ATTACK, SHOTS, PASSMAP, PLAYERS, HOME_EDGE];

// ─── Screen ────────────────────────────────────────────────────────────────────
// The in-app match-intelligence hub. One tournament-level tab (Dashboard) plus
// the per-match tabs. The old territory-Heatmap tab + pre-kickoff forecast pitch
// were retired (recon #46) — momentum now lives only inside Overview.
export default function MatchHeatmapScreen() {
  const insets  = useSafeAreaInsets();
  const matches = useLiveStats();
  const results = useLiveResults();
  const { favTeam } = useProfile();
  // Land on Overview (real match content); Dashboard is an empty placeholder
  // until the tournament command centre is built.
  const [tab, setTab] = useState(OVERVIEW);

  // A match's authoritative live/finished status comes from the results feed
  // (refreshed every ~20s, flips to FINISHED the moment a game ends), NOT from
  // the baked MATCH_STATS.status: the /api/match-stats overlay only ever ADDS
  // currently-live games, so once a match ends and drops out of `live=all` the
  // baked `LIVE` status would otherwise stick until a redeploy. Derive it from
  // the live object the screen already holds. (See CLAUDE.md 2026-06-18.)
  const statusOf = (m: { home: string; away: string; status: 'LIVE' | 'FINISHED' }) =>
    results[`${m.home}|${m.away}`]?.status ?? m.status;

  const ordered = useMemo(() =>
    [...matches].sort((a, b) => (statusOf(a) === 'LIVE' ? -1 : 0) - (statusOf(b) === 'LIVE' ? -1 : 0) || b.date.localeCompare(a.date)),
  [matches, results]);

  const { fixtureId } = useLocalSearchParams<{ fixtureId?: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const requestedId = selected ?? fixtureId;
  const liveActive = ordered.find((m) => m.fixtureId === requestedId);

  // If a specific fixture was requested (deep-link from the timeline), anchor to
  // it. Only when NO fixture was requested do we default to the most relevant
  // live/recent game. A requested fixture with no stats yet → empty state.
  const active: MatchStats | null = liveActive ?? (requestedId ? null : ordered[0] ?? null);

  if (!active) {
    // Group fixture first, then a knockout tie (deep-linked from Road to the Final)
    // — so a just-kicked-off LIVE knockout game shows the right "warming up" copy.
    const name = requestedId
      ? (WC_FIXTURES.find((f) => f.id === requestedId) ?? WC_KNOCKOUT.find((f) => f.id === requestedId))
      : undefined;
    // The detailed stats overlay (useLiveStats) lags kickoff: api-football posts
    // /fixtures/statistics a minute or two after the match starts. Until then the
    // honest LIVE signal is the results feed (set the instant a game kicks off).
    // Use it so we never tell the user a live match "hasn't kicked off yet".
    const liveResult = name ? results[`${name.home}|${name.away}`] : undefined;
    // Treat "scheduled kickoff reached and not yet finished" as warming up — not
    // just an explicit LIVE status. The results poll (~20s) and api-football both
    // lag the whistle, so a fixture can be genuinely under way before its status
    // flips; without this, a tap from the timeline's warming pill would wrongly
    // read "hasn't kicked off yet" for a game that has.
    const kickedOff = name ? Date.now() >= new Date(name.date).getTime() : false;
    const warming   = !!name && liveResult?.status !== 'FINISHED' && (liveResult?.status === 'LIVE' || kickedOff);
    const liveScore = liveResult && liveResult.homeScore != null ? `${liveResult.homeScore}–${liveResult.awayScore ?? 0}` : '';
    return (
      <View style={[st.screen, st.empty]}>
        <Text style={st.emptyText}>
          {name && warming
            ? `🔴 ${name.home} ${liveScore || 'v'} ${name.away} — match intelligence is warming up and appears within a few minutes of kickoff.`
            : name
              ? `${name.home} v ${name.away} hasn't kicked off yet — match intelligence appears at kickoff.`
              : 'No match stats yet. Match intelligence appears once a game kicks off.'}
        </Text>
      </View>
    );
  }

  const fixture = WC_FIXTURES.find((f) => f.id === active.fixtureId);
  // Knockout ties aren't in WC_FIXTURES — fall back to WC_KNOCKOUT so a KO game
  // opened via "Relive the match" still shows its round + venue in the header.
  const koFixture = !fixture ? WC_KNOCKOUT.find((f) => f.id === active.fixtureId) : undefined;
  const activeStatus = statusOf(active);
  const statusLine = activeStatus === 'LIVE' ? `LIVE ${active.elapsed ?? ''}'` : 'FULL TIME';
  const res = results[`${active.home}|${active.away}`];
  const scoreText = res && res.homeScore != null && res.awayScore != null ? `${res.homeScore} – ${res.awayScore}` : 'vs';

  const Header = (
    <View style={st.header}>
      <View style={st.headSide}>
        <Text style={st.headTitle}>MATCH INTELLIGENCE</Text>
        {fixture
          ? <Text style={st.headSub}>Group {fixture.group} · Matchday {fixture.matchday}</Text>
          : koFixture ? <Text style={st.headSub}>{koFixture.roundLabel}</Text> : null}
      </View>
      <View style={st.headCenter}>
        <View style={st.scoreRow}>
          <Text style={st.teamName} numberOfLines={1}>{flagOf(active.home)} {active.home.toUpperCase()}</Text>
          <Text style={st.score}>{scoreText}</Text>
          <Text style={st.teamName} numberOfLines={1}>{active.away.toUpperCase()} {flagOf(active.away)}</Text>
        </View>
        <Text style={[st.statusMini, activeStatus === 'LIVE' && { color: D.red }]}>
          {statusLine}{fixture
            ? `  ·  ${fmtDate(active.date)} · ${fixture.stadium}`
            : koFixture ? `  ·  ${fmtDate(active.date)}${koFixture.venueName ? ' · ' + koFixture.venueName : ''}` : ''}
        </Text>
      </View>
      <View style={[st.headSide, { alignItems: 'flex-end' }]}>
        <Brand tone="chrome" align="flex-end" />
      </View>
    </View>
  );

  const Picker = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.pickerScroll} contentContainerStyle={st.picker}>
      {ordered.map((m) => {
        const on = m.fixtureId === active.fixtureId;
        return (
          <Pressable key={m.fixtureId} onPress={() => setSelected(m.fixtureId)} style={[st.pick, on && st.pickOn]}>
            {statusOf(m) === 'LIVE' && <View style={st.liveDot} />}
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
      {TABS.map((tb) => (
        <Pressable key={tb} onPress={() => setTab(tb)} style={[st.tab, tab === tb && st.tabOn]}>
          <Text style={[st.tabText, tab === tb && st.tabTextOn]}>{tb}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const Footer = <Text style={st.foot}>Match intelligence modelled from live stats, events & standings — not player tracking · Data by Lili Signals 🦞</Text>;
  // Dashboard gets its own footer — it's tournament-wide (no single match), and
  // the Lili XI is an evolving, non-official selection.
  const DashFooter = <Text style={st.foot}>Tournament-wide intelligence from committed World Cup data · Lili XI is an evolving, non-official selection · Data by Lili Signals 🦞</Text>;

  // Dashboard — the TOURNAMENT-level command centre. Tournament-level only, so NO
  // match picker and NO match-level widgets. Modules: World Cup Leaders, Team
  // Rankings, Lili XI (Team of the Tournament Watch).
  if (tab === DASHBOARD) {
    return (
      <ScrollView style={st.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        {Header}{Tabs}
        {/* TODO: pass favTeam once a global favourite/journey-team store exists. */}
        <DashboardModule favTeam={favTeam ?? undefined} />
        {DashFooter}
      </ScrollView>
    );
  }

  // Home Edge is a tournament-wide module (not per-match) → no match picker.
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
  // → keep the picker.
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

  // Defensive fallback — every tab in TABS has an explicit branch above.
  return null;
}

// ─── Styles ────────────────────────────────────────────────────────────────────
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

  foot:      { color: D.text3, fontSize: 9, textAlign: 'center', paddingHorizontal: 16, paddingVertical: 5, fontStyle: 'italic' },
});
