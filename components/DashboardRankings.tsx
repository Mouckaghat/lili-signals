// Dashboard — World Cup Rankings. The first tournament-level module of the
// Dashboard command centre. Tournament-wide (no match picker), built from the
// same honest aggregates as the Shots model (lib/shotsModel `shotRankings`):
// most goals, most on target, highest Danger Index, toughest keeper.
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { shotRankings, type ShotRank } from '../lib/shotsModel';
import { useLiveResults } from '../lib/useLiveResults';

const D = {
  panel:  '#0A1322',
  border: 'rgba(86,140,224,0.16)',
  text1:  '#F1F5FF',
  text2:  '#8DA2C8',
  text3:  '#52668C',
};

export default function DashboardRankings() {
  const results = useLiveResults();
  const rank = useMemo(() => shotRankings(results), [results]);
  return (
    <View style={s.wrap}>
      <Text style={s.h1}>📈 Dashboard</Text>
      <Text style={s.h1sub}>Tournament-wide intelligence</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>🌍 WORLD CUP RANKINGS</Text>
        <RankList title="⚽ Most Goals" rows={rank.mostGoals} />
        <RankList title="🎯 Most On Target" rows={rank.mostSot} />
        <RankList title="🔥 Highest Danger" rows={rank.highestDanger} />
        <RankList title="🧤 Toughest Keeper" rows={rank.toughestGk} showSub />
      </View>
      <Text style={s.note}>More tournament modules coming: Home Edge Tracker · Attack, Defence & Passing rankings · Lili Spotlight.</Text>
    </View>
  );
}

function RankList({ title, rows, showSub }: { title: string; rows: ShotRank[]; showSub?: boolean }) {
  return (
    <View style={s.rl}>
      <Text style={s.rlTitle}>{title}</Text>
      {rows.slice(0, 3).map((r, i) => (
        <View key={r.team} style={s.rlRow}>
          <Text style={s.rlRank}>{i + 1}</Text>
          <Text style={s.rlName} numberOfLines={1}>{r.flag} {r.team}</Text>
          <Text style={s.rlVal}>{showSub && r.sub ? r.sub : r.value}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { padding: 14, gap: 10 },
  h1:    { color: D.text1, fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  h1sub: { color: D.text2, fontSize: 12, marginTop: -4, marginBottom: 4 },
  card:      { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12 },
  cardTitle: { color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
  rl:      { marginBottom: 8 },
  rlTitle: { color: D.text2, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  rlRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  rlRank:  { color: D.text3, fontSize: 10, fontWeight: '800', width: 12 },
  rlName:  { color: D.text1, fontSize: 11, fontWeight: '600', flex: 1 },
  rlVal:   { color: D.text1, fontSize: 12, fontWeight: '800' },
  note:    { color: D.text3, fontSize: 9, fontStyle: 'italic', textAlign: 'center', marginTop: 2 },
});
