// Dashboard — the tournament-level command centre. "What is happening across the
// World Cup right now?" Tournament-wide only (no match picker, no match widgets):
//   • World Cup Leaders   → player leaders (lib/playerImpact)
//   • Team Rankings        → team leaders (lib/shotsModel)
//   • Lili Spotlight / World Cup Impact / Player Details → tournament player explorer
//   • Lili XI              → Team of the Tournament Watch (lib/dashboardModel)
// favTeam (optional) softly highlights the user's followed team. TODO: there is
// no global favourite-team store yet (journey screen keeps it in local state) —
// wire one and pass it here to light up Canada/Switzerland/Brazil/etc.
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { computePlayerLeaders, type ImpactRow } from '../lib/playerImpact';
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
  red:    '#FF3B47',
  green:  '#33C26B',
  gold:   '#F2C24B',
  purple: '#9A52FF',
  text1:  '#F1F5FF',
  text2:  '#8DA2C8',
  text3:  '#52668C',
};

interface Sel { name: string; team: string; flag: string }

export default function DashboardModule({ favTeam }: { favTeam?: string }) {
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const results = useLiveResults();
  const { lang } = useLanguage();
  const L = HEATMAP_I18N[lang] ?? HEATMAP_I18N.EN;
  const leaders = useMemo(() => computePlayerLeaders(results, L), [results, lang]);
  const teams = useMemo(() => shotRankings(results), [results]);
  const xi = useMemo(() => buildLiliXI(results, L), [results, lang]);

  const [sel, setSel] = useState<Sel | null>(null);
  const selected: Sel | null = sel ?? (leaders.spotlight ? { name: leaders.spotlight.row.name, team: leaders.spotlight.row.team, flag: leaders.spotlight.row.flag } : null);
  const selRow: ImpactRow | undefined = selected ? leaders.impact.find((r) => r.name === selected.name && r.team === selected.team) : undefined;
  const topImpact = leaders.impact[0]?.impact || 1;
  const pick = (name: string, team: string, flag: string) => setSel({ name, team, flag });

  // ── Column 1 — World Cup Leaders (players) ──
  const Leaders = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🏆 WORLD CUP LEADERS</Text>

      <Text style={s.subhead}>⚽ Top Scorers</Text>
      {leaders.topScorers.slice(0, 5).map((r, i) => <PRow key={'g' + r.name + r.team} i={i} flag={r.flag} name={r.name} val={r.goals} unit="G" fav={r.team === favTeam} onPress={() => pick(r.name, r.team, r.flag)} />)}
      {!leaders.topScorers.length && <Text style={s.empty}>No goals yet.</Text>}

      <Text style={[s.subhead, s.mt]}>🎯 Top Assists</Text>
      {leaders.topAssists.slice(0, 4).map((r, i) => <PRow key={'a' + r.name + r.team} i={i} flag={r.flag} name={r.name} val={r.assists} unit="A" color={D.blue} fav={r.team === favTeam} onPress={() => pick(r.name, r.team, r.flag)} />)}
      {!leaders.topAssists.length && <Text style={s.empty}>No assists yet.</Text>}

      <Text style={[s.subhead, s.mt]}>🛡 Defensive Leaders</Text>
      {leaders.defenders.slice(0, 4).map((r, i) => <PRow key={'d' + r.name + r.team} i={i} flag={r.flag} name={r.name} val={r.actions} unit="T+I" color={D.green} fav={r.team === favTeam} onPress={() => pick(r.name, r.team, r.flag)} />)}
      {!leaders.defenders.length && <Text style={s.empty}>No data yet.</Text>}

      <Text style={[s.subhead, s.mt]}>🧤 Goalkeepers</Text>
      {leaders.goalkeepers.slice(0, 4).map((r, i) => (
        <Pressable key={'k' + r.name + r.team} onPress={() => pick(r.name, r.team, r.flag)} style={[s.row, r.team === favTeam && s.rowFav]}>
          <Text style={s.rank}>{i + 1}</Text>
          <Text style={s.pName} numberOfLines={1}>{r.flag} {r.name}</Text>
          <Text style={[s.pVal, { color: D.green }]}>{r.cleanSheets}<Text style={s.pUnit}> CS</Text></Text>
          <Text style={[s.pVal, { width: 44, color: D.text2 }]}>{r.saves}<Text style={s.pUnit}> SV</Text></Text>
        </Pressable>
      ))}
      {!leaders.goalkeepers.length && <Text style={s.empty}>No clean sheets yet.</Text>}
    </View>
  );

  // ── Column 2 — Team Rankings ──
  const Teams = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🌍 TEAM RANKINGS</Text>
      <TeamList title="⚽ Most Goals" rows={teams.mostGoals} favTeam={favTeam} />
      <TeamList title="🎯 Most On Target" rows={teams.mostSot} favTeam={favTeam} />
      <TeamList title="🔥 Highest Danger" rows={teams.highestDanger} favTeam={favTeam} />
      <TeamList title="🧤 Toughest Keeper" rows={teams.toughestGk} favTeam={favTeam} showSub />
    </View>
  );

  // ── Column 3 — player explorer ──
  const Spotlight = leaders.spotlight && (
    <View style={[s.card, { borderColor: D.purple }]}>
      <Text style={[s.cardTitle, { color: D.purple }]}>🔥 LILI SPOTLIGHT</Text>
      <Text style={s.spotName}>{leaders.spotlight.row.flag} {leaders.spotlight.row.name}</Text>
      <View style={s.spotImpactRow}>
        <Text style={s.spotImpactLabel}>Tournament Impact</Text>
        <Text style={s.spotImpactVal}>{leaders.spotlight.row.impact}</Text>
      </View>
      <Text style={s.spotReason}>{leaders.spotlight.reason}</Text>
    </View>
  );

  const Impact = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🌍 WORLD CUP IMPACT</Text>
      {leaders.impact.slice(0, 6).map((r, i) => (
        <Pressable key={r.name + r.team} onPress={() => pick(r.name, r.team, r.flag)} style={[s.row, r.team === favTeam && s.rowFav]}>
          <Text style={s.rank}>{i + 1}</Text>
          <Text style={s.pName} numberOfLines={1}>{r.flag} {r.name}</Text>
          <View style={s.impactBarTrack}><View style={[s.impactBarFill, { width: `${(r.impact / topImpact) * 100}%` }]} /></View>
          <Text style={[s.pVal, { width: 28 }]}>{r.impact}</Text>
        </Pressable>
      ))}
      {!leaders.impact.length && <Text style={s.empty}>No data yet.</Text>}
    </View>
  );

  const Details = (
    <View style={s.card}>
      <Text style={s.cardTitle}>👤 PLAYER DETAILS</Text>
      {selected ? (
        <>
          <Text style={s.detName}>{selected.flag} {selected.name}</Text>
          <Text style={s.detTeam}>{selected.team}{selRow?.club ? ` · ${selRow.club}` : ''}{selRow?.age ? ` · ${selRow.age}y` : ''}</Text>
          <View style={s.detGrid}>
            <DStat label="Goals" value={selRow?.goals ?? 0} color={D.gold} />
            <DStat label="Assists" value={selRow?.assists ?? 0} color={D.blue} />
            <DStat label="Impact" value={selRow?.impact ?? 0} color={D.purple} />
          </View>
          <View style={s.detGrid}>
            <DStat label="Clean Sheets" value={selRow?.cleanSheets ?? 0} color={D.green} />
            <DStat label="Saves" value={selRow?.saves ?? 0} color={D.text2} />
            <DStat label="Cards" value={(selRow?.yellows ?? 0) + (selRow?.reds ?? 0)} color={D.red} />
          </View>
        </>
      ) : <Text style={s.empty}>Tap any player to see details.</Text>}
    </View>
  );

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>📈 Dashboard</Text>
      <Text style={s.h1sub}>Tournament intelligence by Lili Signals.</Text>

      <View style={wide ? s.cols : s.stack}>
        <View style={wide ? s.col : undefined}>{Leaders}</View>
        <View style={wide ? s.col : undefined}>{Teams}</View>
        <View style={wide ? s.col : s.stack}>{Spotlight}{Impact}{Details}</View>
      </View>

      <LiliXI xi={xi} favTeam={favTeam} />

      <Text style={s.note}>More tournament modules coming: Home Edge Tracker · Attack, Defence & Passing rankings.</Text>
    </View>
  );
}

function PRow({ i, flag, name, val, unit, color, fav, onPress }: { i: number; flag: string; name: string; val: number; unit: string; color?: string; fav?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.row, fav && s.rowFav]}>
      <Text style={s.rank}>{i + 1}</Text>
      <Text style={s.pName} numberOfLines={1}>{flag} {name}</Text>
      <Text style={[s.pVal, color ? { color } : null]}>{val}<Text style={s.pUnit}> {unit}</Text></Text>
    </Pressable>
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

function DStat({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={s.dstat}><Text style={[s.dstatVal, { color }]}>{value}</Text><Text style={s.dstatLabel}>{label}</Text></View>;
}

const s = StyleSheet.create({
  wrap:  { padding: 14, gap: 10 },
  h1:    { color: D.text1, fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  h1sub: { color: D.text2, fontSize: 12, marginTop: -4, marginBottom: 4 },
  cols:  { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  col:   { flex: 1, minWidth: 0, gap: 10 },
  stack: { gap: 10 },

  card:      { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 11 },
  cardTitle: { color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },
  subhead:   { color: D.text2, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  mt:        { marginTop: 10 },
  empty:     { color: D.text3, fontSize: 11, paddingVertical: 4 },

  row:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  rowFav: { backgroundColor: 'rgba(242,194,75,0.10)' },
  rank:   { color: D.text3, fontSize: 11, fontWeight: '800', width: 13 },
  pName:  { color: D.text1, fontSize: 11.5, fontWeight: '600', flex: 1 },
  pVal:   { color: D.text1, fontSize: 12.5, fontWeight: '800', textAlign: 'right' },
  pUnit:  { color: D.text3, fontSize: 9, fontWeight: '700' },

  tl:      { marginBottom: 8 },
  tlTitle: { color: D.text2, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  tlRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2, paddingHorizontal: 4, borderRadius: 6 },

  spotName:     { color: D.text1, fontSize: 16, fontWeight: '900', marginBottom: 6 },
  spotImpactRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: D.panel2, borderRadius: 8, padding: 8, marginBottom: 8 },
  spotImpactLabel:{ color: D.text2, fontSize: 11, fontWeight: '600' },
  spotImpactVal:{ color: D.purple, fontSize: 20, fontWeight: '900' },
  spotReason:   { color: D.text2, fontSize: 11, lineHeight: 16 },

  impactBarTrack:{ flex: 1, height: 6, backgroundColor: D.panel2, borderRadius: 3, overflow: 'hidden' },
  impactBarFill: { height: 6, backgroundColor: D.purple, borderRadius: 3 },

  detName:  { color: D.text1, fontSize: 15, fontWeight: '900' },
  detTeam:  { color: D.text2, fontSize: 11, marginTop: 1, marginBottom: 8 },
  detGrid:  { flexDirection: 'row', gap: 6, marginBottom: 6 },
  dstat:    { flex: 1, backgroundColor: D.panel2, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  dstatVal: { fontSize: 17, fontWeight: '900' },
  dstatLabel:{ color: D.text2, fontSize: 8.5, marginTop: 2 },

  note:    { color: D.text3, fontSize: 9, fontStyle: 'italic', textAlign: 'center', marginTop: 2 },
});
