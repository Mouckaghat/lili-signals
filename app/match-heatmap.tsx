import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MatchHeatmap from '../components/MatchHeatmap';
import { useLiveStats } from '../lib/useLiveStats';

const D = {
  bg:      '#050810',
  surface: '#0B1426',
  border:  'rgba(80,140,255,0.10)',
  blue:    '#4A9EFF',
  red:     '#FF5A4D',
  text1:   '#EEF2FF',
  text2:   '#7A90B8',
};

export default function MatchHeatmapScreen() {
  const insets = useSafeAreaInsets();
  const matches = useLiveStats();

  // LIVE first, then by date desc.
  const ordered = useMemo(() =>
    [...matches].sort((a, b) =>
      (a.status === 'LIVE' ? -1 : 0) - (b.status === 'LIVE' ? -1 : 0) || b.date.localeCompare(a.date)),
  [matches]);

  const [selected, setSelected] = useState<string | null>(null);
  const active = ordered.find((m) => m.fixtureId === selected) ?? ordered[0];

  if (!active) {
    return (
      <View style={[styles.screen, styles.empty]}>
        <Text style={styles.emptyText}>No match stats yet. Heatmaps appear once a game kicks off.</Text>
      </View>
    );
  }

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

      <MatchHeatmap match={active} />

      <Text style={styles.legendTitle}>How to read it</Text>
      <Text style={styles.legend}>
        Brighter = where that team spent time and created danger, modelled from possession, shot
        locations and xG. Each team attacks toward the highlighted box. A bright patch on the
        opponent box with low overall heat = a team living off counters (see Australia v Türkiye).
      </Text>
    </ScrollView>
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
