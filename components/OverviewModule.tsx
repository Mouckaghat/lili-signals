import { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { computeOverview, type Overview } from '../lib/matchOverview';
import type { MatchStats } from '../lib/matchStatsData';
import { useLiveResults } from '../lib/useLiveResults';
import { useLanguage } from '../contexts/LanguageContext';
import { HEATMAP_I18N } from '../lib/heatmapI18n';

const D = {
  panel:  '#0A1322',
  panel2: '#0F1C33',
  border: 'rgba(86,140,224,0.16)',
  blue:   '#2E7CFF',
  red:    '#FF3B47',
  gold:   '#F2C24B',
  green:  '#33C26B',
  text1:  '#F1F5FF',
  text2:  '#8DA2C8',
  text3:  '#52668C',
};

export default function OverviewModule({ match }: { match: MatchStats }) {
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const results = useLiveResults();
  const { lang } = useLanguage();
  const o: Overview = useMemo(() => computeOverview(match, results, HEATMAP_I18N[lang] ?? HEATMAP_I18N.EN), [match, results, lang]);

  const statusColor = o.status === 'LIVE' ? D.red : o.status === 'FINAL' ? D.text2 : D.blue;

  const Summary = (
    <View style={s.card}>
      <View style={s.scoreRow}>
        <Text style={[s.team, { textAlign: 'right' }]} numberOfLines={1}>{o.home} {o.homeFlag}</Text>
        <Text style={s.score}>{o.homeScore ?? '–'} - {o.awayScore ?? '–'}</Text>
        <Text style={[s.team, { textAlign: 'left' }]} numberOfLines={1}>{o.awayFlag} {o.away}</Text>
      </View>
      <View style={s.metaRow}>
        <View style={[s.statusBadge, { borderColor: statusColor }]}><Text style={[s.statusTxt, { color: statusColor }]}>{o.status}</Text></View>
        <Text style={s.meta}>Group {o.group} · {o.venue}{o.city ? `, ${o.city}` : ''} · {o.dateStr}{o.capacity ? ` · 🏟 ${o.capacity.toLocaleString()}` : ''}</Text>
      </View>
    </View>
  );

  const Verdict = (
    <View style={s.verdict}>
      <Text style={s.verdictTxt}>{o.verdict.icon}  {o.verdict.text}</Text>
    </View>
  );

  const Control = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🎛 LILI MATCH CONTROL INDEX</Text>
      <View style={s.ctrlRow}>
        <Text style={[s.ctrlNum, { color: D.blue }]}>{o.controlHome}</Text>
        <View style={s.ctrlBar}>
          <View style={{ width: `${o.controlHome}%`, backgroundColor: D.blue }} />
          <View style={{ width: `${o.controlAway}%`, backgroundColor: D.red }} />
        </View>
        <Text style={[s.ctrlNum, { color: D.red }]}>{o.controlAway}</Text>
      </View>
      <Text style={s.ctrlNote}>Possession · shots · dangerous attacks · territory · xG → out of 100</Text>
    </View>
  );

  const Stats = (
    <View style={s.card}>
      <Text style={s.cardTitle}>📊 KEY STATISTICS</Text>
      {o.stats.map((st) => (
        <View key={st.label} style={s.statRow}>
          <Text style={[s.statV, { color: D.blue, textAlign: 'left' }]}>{st.home}</Text>
          <View style={s.statMid}>
            <Text style={s.statL}>{st.label}</Text>
            <View style={s.statBar}>
              <View style={{ width: `${Math.round(st.hShare * 100)}%`, backgroundColor: D.blue }} />
              <View style={{ width: `${Math.round((1 - st.hShare) * 100)}%`, backgroundColor: D.red }} />
            </View>
          </View>
          <Text style={[s.statV, { color: D.red, textAlign: 'right' }]}>{st.away}</Text>
        </View>
      ))}
    </View>
  );

  const Drivers = o.drivers.length > 0 && (
    <View style={s.card}>
      <Text style={s.cardTitle}>🔑 MATCH DRIVERS</Text>
      {o.drivers.map((d, i) => (
        <View key={i} style={s.driver}><Text style={s.driverNum}>{i + 1}</Text><Text style={s.driverTxt}>{d}</Text></View>
      ))}
    </View>
  );

  const Lili = (
    <View style={[s.card, { borderColor: 'rgba(242,194,75,0.3)' }]}>
      <Text style={[s.cardTitle, { color: D.gold }]}>🦞 LILI MATCH INTELLIGENCE</Text>
      <Text style={s.liliTxt}>{o.lili}</Text>
    </View>
  );

  const Momentum = o.events.length > 0 && (
    <View style={s.card}>
      <Text style={s.cardTitle}>⏱ MATCH MOMENTUM</Text>
      <View style={s.events}>
        {o.events.map((e, i) => (
          <View key={i} style={[s.chip, { borderColor: e.side === 'home' ? D.blue : D.red }]}>
            <Text style={s.chipTxt}>{e.icon} {e.minute}'</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={s.wrap}>
      {Summary}{Verdict}
      <View style={wide ? s.cols : undefined}>
        <View style={wide ? s.left : undefined}>{Control}{Stats}</View>
        <View style={wide ? s.right : undefined}>{Drivers}{Lili}{Momentum}</View>
      </View>
      <Text style={s.foot}>Match intelligence from live stats, events & standings · attendance shown as stadium capacity · Lili storytelling.</Text>
    </View>
  );
}

// Tournament Impact — standings/qualification effect of this match. Rendered as
// its own panel in the Overview tab (below Key Stats), not inside the module.
export function TournamentImpactPanel({ match }: { match: MatchStats }) {
  const results = useLiveResults();
  const { lang } = useLanguage();
  const o: Overview = useMemo(() => computeOverview(match, results, HEATMAP_I18N[lang] ?? HEATMAP_I18N.EN), [match, results, lang]);
  return (
    <View style={s.soloWrap}>
      <View style={s.card}>
        <Text style={s.cardTitle}>🌍 TOURNAMENT IMPACT</Text>
        <View style={s.impRow}>
          <ImpactCard team={o.home} flag={o.homeFlag} d={o.impactHome} color={D.blue} />
          <ImpactCard team={o.away} flag={o.awayFlag} d={o.impactAway} color={D.red} />
        </View>
      </View>
    </View>
  );
}

function ImpactCard({ team, flag, d, color }: { team: string; flag: string; d: Overview['impactHome']; color: string }) {
  return (
    <View style={s.impCard}>
      <Text style={[s.impTeam, { color }]} numberOfLines={1}>{flag} {team}</Text>
      {d ? (
        <View style={s.impGrid}>
          <Imp k="Position" v={`${d.rank}${d.rank === 1 ? 'st' : d.rank === 2 ? 'nd' : d.rank === 3 ? 'rd' : 'th'}`} />
          <Imp k="Points" v={`${d.points}`} />
          <Imp k="GD" v={`${d.gd > 0 ? '+' : ''}${d.gd}`} />
          <Imp k="Qualify" v={`${d.qualPct}%`} />
        </View>
      ) : <Text style={s.impNone}>No standings yet.</Text>}
    </View>
  );
}
function Imp({ k, v }: { k: string; v: string }) {
  return <View style={s.imp}><Text style={s.impV} numberOfLines={1}>{v}</Text><Text style={s.impK} numberOfLines={1}>{k}</Text></View>;
}

const s = StyleSheet.create({
  wrap:  { padding: 14, gap: 10 },
  soloWrap: { paddingHorizontal: 14 },
  cols:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  left:  { flex: 1.1, minWidth: 0, gap: 10 },
  right: { width: 330, gap: 10 },

  card:      { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12 },
  cardTitle: { color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },

  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  team:     { color: D.text1, fontSize: 16, fontWeight: '800', flex: 1 },
  score:    { color: D.text1, fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  statusBadge:{ borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusTxt:{ fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  meta:     { color: D.text2, fontSize: 11 },

  verdict:   { backgroundColor: D.panel2, borderRadius: 12, borderWidth: 1, borderColor: D.border, paddingVertical: 14, alignItems: 'center' },
  verdictTxt:{ color: D.text1, fontSize: 20, fontWeight: '900' },

  ctrlRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctrlNum:  { fontSize: 24, fontWeight: '900', width: 40, textAlign: 'center' },
  ctrlBar:  { flex: 1, flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: D.panel2 },
  ctrlNote: { color: D.text3, fontSize: 9, marginTop: 6, textAlign: 'center' },

  statRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  statV:    { width: 50, fontSize: 14, fontWeight: '800' },
  statMid:  { flex: 1 },
  statL:    { color: D.text2, fontSize: 10, textAlign: 'center', marginBottom: 3 },
  statBar:  { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: D.panel2 },

  driver:   { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 4 },
  driverNum:{ color: D.gold, fontSize: 12, fontWeight: '900', width: 16 },
  driverTxt:{ color: D.text1, fontSize: 12, lineHeight: 17, flex: 1 },

  liliTxt:  { color: D.text1, fontSize: 12, lineHeight: 18 },

  events:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:     { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  chipTxt:  { color: D.text1, fontSize: 11, fontWeight: '700' },

  impRow:   { flexDirection: 'row', gap: 8 },
  impCard:  { flex: 1, backgroundColor: D.panel2, borderRadius: 10, padding: 10 },
  impTeam:  { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  impGrid:  { flexDirection: 'row', gap: 6 },
  imp:      { flex: 1, minWidth: 0 },
  impV:     { color: D.text1, fontSize: 14, fontWeight: '900' },
  impK:     { color: D.text2, fontSize: 8.5 },
  impNone:  { color: D.text3, fontSize: 11 },

  foot:     { color: D.text3, fontSize: 9, textAlign: 'center', fontStyle: 'italic', marginTop: 2 },
});
