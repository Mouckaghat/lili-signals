import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MatchHeatmap from '../components/MatchHeatmap';
import { useLiveStats } from '../lib/useLiveStats';
import { useLineups } from '../lib/useLineups';
import type { MatchStats, TeamMatchStats } from '../lib/matchStatsData';

const D = {
  bg:      '#050810',
  surface: '#0B1426',
  border:  'rgba(80,140,255,0.10)',
  blue:    '#4A9EFF',
  red:     '#FF5A4D',
  text1:   '#EEF2FF',
  text2:   '#7A90B8',
};

// One captured moment of a match's stats, used to scrub the heatmap's evolution.
interface Snapshot {
  status:    'LIVE' | 'FINISHED';
  elapsed:   number | null;
  homeStats: TeamMatchStats;
  awayStats: TeamMatchStats;
}

// Cheap signature so we only append a snapshot when something actually moved.
const sig = (m: MatchStats) =>
  `${m.status}|${m.elapsed}|${m.homeStats.possession}|${m.homeStats.totalShots}|${m.homeStats.xg}|${m.awayStats.possession}|${m.awayStats.totalShots}|${m.awayStats.xg}`;

export default function MatchHeatmapScreen() {
  const insets   = useSafeAreaInsets();
  const matches  = useLiveStats();
  const lineups  = useLineups();

  // ── Time-series capture ──────────────────────────────────────────────────
  // The API only gives the *current* cumulative stats, so we accumulate a
  // history here (per fixture) as the screen polls. The cursor scrubs it; a
  // live game auto-advances to the newest snapshot.
  const [history, setHistory] = useState<Record<string, Snapshot[]>>({});
  const sigRef = useRef<Record<string, string>>({});
  useEffect(() => {
    setHistory((prev) => {
      let touched = false;
      const next = { ...prev };
      for (const m of matches) {
        const s = sig(m);
        if (sigRef.current[m.fixtureId] === s) continue; // unchanged → skip
        sigRef.current[m.fixtureId] = s;
        const arr = next[m.fixtureId] ?? [];
        next[m.fixtureId] = [...arr, { status: m.status, elapsed: m.elapsed, homeStats: m.homeStats, awayStats: m.awayStats }];
        touched = true;
      }
      return touched ? next : prev;
    });
  }, [matches]);

  // LIVE first, then by date desc.
  const ordered = useMemo(() =>
    [...matches].sort((a, b) =>
      (a.status === 'LIVE' ? -1 : 0) - (b.status === 'LIVE' ? -1 : 0) || b.date.localeCompare(a.date)),
  [matches]);

  // Optional ?fixtureId=... preselects a game; tapping a tab then overrides it.
  const { fixtureId } = useLocalSearchParams<{ fixtureId?: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const active = ordered.find((m) => m.fixtureId === (selected ?? fixtureId)) ?? ordered[0];

  // ── Cursor: null = follow live (latest); a number pins a snapshot index ────
  const [cursorByFixture, setCursorByFixture] = useState<Record<string, number | null>>({});

  if (!active) {
    return (
      <View style={[styles.screen, styles.empty]}>
        <Text style={styles.emptyText}>No match stats yet. Heatmaps appear once a game kicks off.</Text>
      </View>
    );
  }

  const series   = history[active.fixtureId] ?? [];
  const cursor   = cursorByFixture[active.fixtureId] ?? null; // null ⇒ follow live
  const lastIdx  = Math.max(0, series.length - 1);
  const idx      = cursor === null ? lastIdx : Math.min(cursor, lastIdx);
  const snap     = series[idx];
  // Render the snapshot at the cursor; fall back to the live object if we have
  // no captured history yet (first frame after kickoff).
  const shown: MatchStats = snap
    ? { ...active, status: snap.status, elapsed: snap.elapsed, homeStats: snap.homeStats, awayStats: snap.awayStats }
    : active;

  const lineup        = lineups.find((l) => l.fixtureKey === `${active.home}|${active.away}`);
  const homeFormation = lineup?.home.formation && lineup.home.formation !== '?' ? lineup.home.formation : undefined;
  const awayFormation = lineup?.away.formation && lineup.away.formation !== '?' ? lineup.away.formation : undefined;

  const following = cursor === null;
  const canScrub  = series.length > 1;
  const setCursor = (v: number | null) => setCursorByFixture((m) => ({ ...m, [active.fixtureId]: v }));
  const scrubLabel = snap
    ? (snap.status === 'FINISHED' && idx === lastIdx ? 'Full time' : `${snap.elapsed ?? 0}'`)
    : '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}>
      <Text style={styles.h1}>Match Heatmaps</Text>
      <Text style={styles.sub}>Watch the game as territory — no video needed.</Text>

      {/* match picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{ gap: 8 }}>
        {ordered.map((m) => {
          const on = m.fixtureId === active.fixtureId;
          return (
            <Pressable key={m.fixtureId} onPress={() => setSelected(m.fixtureId)} style={[styles.tab, on && styles.tabOn]}>
              {m.status === 'LIVE' && <View style={styles.liveDot} />}
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{m.home} v {m.away}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <MatchHeatmap match={shown} homeFormation={homeFormation} awayFormation={awayFormation} />

      {/* time cursor — scrub how the heatmap built up over the match */}
      {canScrub && (
        <Scrubber
          idx={idx}
          lastIdx={lastIdx}
          label={scrubLabel}
          following={following}
          isLive={active.status === 'LIVE'}
          onPrev={() => setCursor(Math.max(0, idx - 1))}
          onNext={() => { const n = Math.min(lastIdx, idx + 1); setCursor(n >= lastIdx ? null : n); }}
          onSeek={(i) => setCursor(i >= lastIdx ? null : i)}
          onLive={() => setCursor(null)}
        />
      )}

      <Text style={styles.legendTitle}>How to read it</Text>
      <Text style={styles.legend}>
        Brighter = where that team spent time and created danger, modelled from possession, shot
        locations and xG, with the starting formation shaping its line height and width. Each team
        attacks toward the highlighted box. Drag the cursor to replay how territory built up;
        for a live game it follows the latest minute automatically.
      </Text>
    </ScrollView>
  );
}

// ─── Time cursor ───────────────────────────────────────────────────────────────

function Scrubber({
  idx, lastIdx, label, following, isLive, onPrev, onNext, onSeek, onLive,
}: {
  idx: number; lastIdx: number; label: string; following: boolean; isLive: boolean;
  onPrev: () => void; onNext: () => void; onSeek: (i: number) => void; onLive: () => void;
}) {
  const widthRef = useRef(0);
  const onLayout = (e: LayoutChangeEvent) => { widthRef.current = e.nativeEvent.layout.width; };
  const onTrackPress = (e: any) => {
    const w = widthRef.current;
    if (!w) return;
    const x = e.nativeEvent.locationX ?? 0;
    onSeek(Math.round((x / w) * lastIdx));
  };
  const pct = lastIdx > 0 ? (idx / lastIdx) * 100 : 0;

  return (
    <View style={sc.wrap}>
      <View style={sc.controls}>
        <Pressable onPress={onPrev} hitSlop={8} style={sc.btn}><Text style={sc.btnText}>◀</Text></Pressable>
        <Text style={sc.minute}>{label}</Text>
        <Pressable onPress={onNext} hitSlop={8} style={sc.btn}><Text style={sc.btnText}>▶</Text></Pressable>

        <View style={{ flex: 1 }} />

        {isLive && (
          <Pressable onPress={onLive} hitSlop={8} style={[sc.live, following && sc.liveOn]}>
            <View style={[sc.liveDot, following && sc.liveDotOn]} />
            <Text style={[sc.liveText, following && sc.liveTextOn]}>LIVE</Text>
          </Pressable>
        )}
      </View>

      <Pressable onLayout={onLayout} onPress={onTrackPress} style={sc.track} hitSlop={10}>
        <View style={sc.base} />
        <View style={[sc.fill, { width: `${pct}%` }]} />
        <View style={[sc.thumb, { left: `${pct}%` }]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: D.bg },
  empty:     { alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: D.text2, textAlign: 'center' },
  h1:        { color: D.text1, fontSize: 24, fontWeight: '800' },
  sub:       { color: D.text2, fontSize: 13, marginTop: 2, marginBottom: 12 },
  tabs:      { marginBottom: 14 },
  tab:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: D.surface,
               borderWidth: 1, borderColor: D.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  tabOn:     { borderColor: D.blue, backgroundColor: 'rgba(74,158,255,0.12)' },
  tabText:   { color: D.text2, fontSize: 12, fontWeight: '600' },
  tabTextOn: { color: D.text1 },
  liveDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: D.red },
  legendTitle: { color: D.text1, fontSize: 14, fontWeight: '700', marginTop: 18 },
  legend:    { color: D.text2, fontSize: 12, lineHeight: 18, marginTop: 4 },
});

const sc = StyleSheet.create({
  wrap:     { marginTop: 12, backgroundColor: D.surface, borderRadius: 14, borderWidth: 1, borderColor: D.border, padding: 12, gap: 10 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn:      { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(74,158,255,0.10)', borderWidth: 1, borderColor: D.border },
  btnText:  { color: D.blue, fontSize: 13, fontWeight: '700' },
  minute:   { color: D.text1, fontSize: 14, fontWeight: '800', minWidth: 64, textAlign: 'center' },
  live:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6,
              borderRadius: 999, borderWidth: 1, borderColor: D.border },
  liveOn:   { borderColor: D.red, backgroundColor: 'rgba(255,90,77,0.12)' },
  liveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: D.text2 },
  liveDotOn:{ backgroundColor: D.red },
  liveText: { color: D.text2, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  liveTextOn:{ color: D.red },
  track:    { height: 22, justifyContent: 'center' },
  base:     { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: 'rgba(80,140,255,0.18)' },
  fill:     { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: D.blue },
  thumb:    { position: 'absolute', width: 14, height: 14, borderRadius: 7, marginLeft: -7,
              backgroundColor: D.text1, borderWidth: 2, borderColor: D.blue },
});
