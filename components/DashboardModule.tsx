// Dashboard — the tournament-level command centre. "What is happening across the
// World Cup right now?" Tournament-wide only (no match picker, no match widgets):
//   • World Cup Leaders   → player leaders (lib/playerImpact)
//   • Team Rankings        → team leaders (lib/shotsModel)
//   • Lili XI              → Team of the Tournament Watch (lib/dashboardModel)
// favTeam (optional) softly highlights the user's followed team. TODO: there is
// no global favourite-team store yet (journey screen keeps it in local state) —
// wire one and pass it here to light up Canada/Switzerland/Brazil/etc.
import { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { computePlayerLeaders } from '../lib/playerImpact';
import { shotRankings, type ShotRank } from '../lib/shotsModel';
import { buildLiliXI } from '../lib/dashboardModel';
import { useLiveResults } from '../lib/useLiveResults';
import { useLanguage } from '../contexts/LanguageContext';
import { HEATMAP_I18N } from '../lib/heatmapI18n';
import LiliXI from './LiliXI';

const D = {
  panel:  '#0A1322',
  panel2: '#0F1C33',
  border: 'rgba(86,140,224,0.16)',
  blue:   '#2E7CFF',
  green:  '#33C26B',
  gold:   '#F2C24B',
  text1:  '#F1F5FF',
  text2:  '#8DA2C8',
  text3:  '#52668C',
};

export default function DashboardModule({ favTeam }: { favTeam?: string }) {
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const results = useLiveResults();
  const { lang } = useLanguage();
  const L = HEATMAP_I18N[lang] ?? HEATMAP_I18N.EN;
  const leaders = useMemo(() => computePlayerLeaders(results, L), [results, lang]);
  const teams = useMemo(() => shotRankings(results), [results]);
  const xi = useMemo(() => buildLiliXI(results, L), [results, lang]);

  const Leaders = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🏆 WORLD CUP LEADERS</Text>

      <Text style={s.subhead}>⚽ Top Scorers</Text>
      {leaders.topScorers.slice(0, 5).map((r, i) => <PRow key={'g' + r.name + r.team} i={i} flag={r.flag} name={r.name} val={r.goals} unit="G" fav={r.team === favTeam} />)}
      {!leaders.topScorers.length && <Text style={s.empty}>No goals yet.</Text>}

      <Text style={[s.subhead, s.mt]}>🎯 Top Assists</Text>
      {leaders.topAssists.slice(0, 5).map((r, i) => <PRow key={'a' + r.name + r.team} i={i} flag={r.flag} name={r.name} val={r.assists} unit="A" color={D.blue} fav={r.team === favTeam} />)}
      {!leaders.topAssists.length && <Text style={s.empty}>No assists yet.</Text>}

      <Text style={[s.subhead, s.mt]}>🛡 Defensive Leaders</Text>
      {leaders.defenders.slice(0, 5).map((r, i) => <PRow key={'d' + r.name + r.team} i={i} flag={r.flag} name={r.name} val={r.actions} unit="T+I" color={D.green} fav={r.team === favTeam} />)}
      {!leaders.defenders.length && <Text style={s.empty}>No data yet.</Text>}

      <Text style={[s.subhead, s.mt]}>🧤 Goalkeepers</Text>
      {leaders.goalkeepers.slice(0, 5).map((r, i) => (
        <View key={'k' + r.name + r.team} style={[s.row, r.team === favTeam && s.rowFav]}>
          <Text style={s.rank}>{i + 1}</Text>
          <Text style={s.pName} numberOfLines={1}>{r.flag} {r.name}</Text>
          <Text style={[s.pVal, { color: D.green }]}>{r.cleanSheets}<Text style={s.pUnit}> CS</Text></Text>
          <Text style={[s.pVal, { width: 46, color: D.text2 }]}>{r.saves}<Text style={s.pUnit}> SV</Text></Text>
        </View>
      ))}
      {!leaders.goalkeepers.length && <Text style={s.empty}>No clean sheets yet.</Text>}
    </View>
  );

  const Teams = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🌍 TEAM RANKINGS</Text>
      <TeamList title="⚽ Most Goals" rows={teams.mostGoals} favTeam={favTeam} />
      <TeamList title="🎯 Most On Target" rows={teams.mostSot} favTeam={favTeam} />
      <TeamList title="🔥 Highest Danger" rows={teams.highestDanger} favTeam={favTeam} />
      <TeamList title="🧤 Toughest Keeper" rows={teams.toughestGk} favTeam={favTeam} showSub />
    </View>
  );

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>📈 Dashboard</Text>
      <Text style={s.h1sub}>Tournament intelligence by Lili Signals.</Text>

      <View style={wide ? s.cols : undefined}>
        <View style={wide ? s.colL : undefined}>{Leaders}</View>
        <View style={wide ? s.colR : undefined}>{Teams}</View>
      </View>

      <LiliXI xi={xi} favTeam={favTeam} />

      <Text style={s.note}>More tournament modules coming: Home Edge Tracker · Attack, Defence & Passing rankings · Lili Spotlight.</Text>
    </View>
  );
}

function PRow({ i, flag, name, val, unit, color, fav }: { i: number; flag: string; name: string; val: number; unit: string; color?: string; fav?: boolean }) {
  return (
    <View style={[s.row, fav && s.rowFav]}>
      <Text style={s.rank}>{i + 1}</Text>
      <Text style={s.pName} numberOfLines={1}>{flag} {name}</Text>
      <Text style={[s.pVal, color ? { color } : null]}>{val}<Text style={s.pUnit}> {unit}</Text></Text>
    </View>
  );
}

function TeamList({ title, rows, favTeam, showSub }: { title: string; rows: ShotRank[]; favTeam?: string; showSub?: boolean }) {
  return (
    <View style={s.tl}>
      <Text style={s.tlTitle}>{title}</Text>
      {rows.slice(0, 3).map((r, i) => (
        <View key={r.team} style={[s.tlRow, r.team === favTeam && s.rowFav]}>
          <Text style={s.rank}>{i + 1}</Text>
          <Text style={s.pName} numberOfLines={1}>{r.flag} {r.team}</Text>
          <Text style={s.pVal}>{showSub && r.sub ? r.sub : r.value}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { padding: 14, gap: 10 },
  h1:    { color: D.text1, fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  h1sub: { color: D.text2, fontSize: 12, marginTop: -4, marginBottom: 4 },
  cols:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  colL:  { flex: 1, minWidth: 0 },
  colR:  { flex: 1, minWidth: 0 },

  card:      { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12 },
  cardTitle: { color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
  subhead:   { color: D.text2, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  mt:        { marginTop: 10 },
  empty:     { color: D.text3, fontSize: 11, paddingVertical: 4 },

  row:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  rowFav: { backgroundColor: 'rgba(242,194,75,0.10)' },
  rank:   { color: D.text3, fontSize: 11, fontWeight: '800', width: 14 },
  pName:  { color: D.text1, fontSize: 12, fontWeight: '600', flex: 1 },
  pVal:   { color: D.text1, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  pUnit:  { color: D.text3, fontSize: 9, fontWeight: '700' },

  tl:      { marginBottom: 8 },
  tlTitle: { color: D.text2, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  tlRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2, paddingHorizontal: 4, borderRadius: 6 },

  note:    { color: D.text3, fontSize: 9, fontStyle: 'italic', textAlign: 'center', marginTop: 2 },
});
