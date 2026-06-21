import { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { shotsMatch, shotFuture, type ShotsMatch, type ShotTeam, type GkLine } from '../lib/shotsModel';
import type { MatchStats } from '../lib/matchStatsData';
import { useLiveResults } from '../lib/useLiveResults';
import { WC_TEAMS } from '../lib/wcData';
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
  pitch:  '#07181E',
  line:   'rgba(255,255,255,0.45)',
  text1:  '#F1F5FF',
  text2:  '#8DA2C8',
  text3:  '#52668C',
};
const flagOf = (t: string) => WC_TEAMS.find((x) => x.name === t)?.flag ?? '🏳';

export default function ShotsModule({ match }: { match: MatchStats }) {
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const results = useLiveResults();
  const { lang } = useLanguage();
  const m: ShotsMatch | null = useMemo(() => shotsMatch(match.fixtureId, results, HEATMAP_I18N[lang] ?? HEATMAP_I18N.EN), [match.fixtureId, results, lang]);
  const fut = useMemo(() => shotFuture(match.home, results), [match.home, results]);

  if (!m) return <View style={s.wrap}><Text style={s.empty}>No shot data for this match yet.</Text></View>;
  const { home: h, away: a, gkHome, gkAway } = m;

  const Summary = (
    <View style={s.card}>
      <Text style={s.cardTitle}>📋 SHOT SUMMARY</Text>
      <Cmp label="Shots" h={h.shots} a={a.shots} bold />
      <Cmp label="On Target" h={`🎯 ${h.sot}`} a={`${a.sot} 🎯`} />
      <Cmp label="Off Target" h={`⚪ ${h.off}`} a={`${a.off} ⚪`} />
      <Cmp label="Goals" h={`⚽ ${h.goals}`} a={`${a.goals} ⚽`} />
      <Cmp label="Conversion" h={`${h.conversionPct}%`} a={`${a.conversionPct}%`} />
    </View>
  );

  const Zones = (
    <View style={s.card}>
      <Text style={s.cardTitle}>📍 SHOT ZONES</Text>
      <Cmp label="Inside Box" h={h.inside} a={a.inside} bold />
      <Cmp label="Outside Box" h={h.outside} a={a.outside} />
      <Text style={s.note}>Most goals come from inside the box — a higher inside share means better chances.</Text>
    </View>
  );

  const Danger = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🔥 DANGER INDEX</Text>
      <View style={s.dRow}>
        <Text style={[s.dNum, { color: D.blue }]}>{h.danger}</Text>
        <View style={s.dBar}>
          <View style={{ width: `${(h.danger / (h.danger + a.danger || 1)) * 100}%`, backgroundColor: D.blue }} />
          <View style={{ width: `${(a.danger / (h.danger + a.danger || 1)) * 100}%`, backgroundColor: D.red }} />
        </View>
        <Text style={[s.dNum, { color: D.red }]}>{a.danger}</Text>
      </View>
      <Text style={s.note}>From shots · on target · goals · xG. xG: {h.xg.toFixed(1)} vs {a.xg.toFixed(1)} (Δ {(h.xg - a.xg >= 0 ? '+' : '')}{(h.xg - a.xg).toFixed(1)}).</Text>
    </View>
  );

  const Finishing = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🎯 FINISHING EFFICIENCY</Text>
      <FinRow t={h} color={D.blue} /><FinRow t={a} color={D.red} />
    </View>
  );

  const Gk = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🧤 GOALKEEPER IMPACT</Text>
      <GkRow team={h.team} flag={h.flag} g={gkHome} color={D.blue} />
      <GkRow team={a.team} flag={a.flag} g={gkAway} color={D.red} />
    </View>
  );

  const Lili = (
    <View style={[s.card, { borderColor: 'rgba(242,194,75,0.3)' }]}>
      <Text style={[s.cardTitle, { color: D.gold }]}>🦞 LILI SHOT ANALYSIS</Text>
      <Text style={s.liliTxt}>{m.lili}</Text>
    </View>
  );

  const Future = fut && (
    <View style={s.card}>
      <Text style={s.cardTitle}>🔮 NEXT MATCH · {match.home} v {fut.opponent}</Text>
      <FutRow team={match.home} flag={flagOf(match.home)} t={fut.team} color={D.blue} />
      <FutRow team={fut.opponent} flag={fut.opponentFlag} t={fut.opp} color={D.red} />
    </View>
  );

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>🎯 SHOTS</Text>
      <Text style={s.h1sub}>Who created the better chances — and did the score reflect them?</Text>
      <View style={wide ? s.cols : undefined}>
        <View style={wide ? s.left : undefined}>{Summary}{Zones}</View>
        <View style={wide ? s.right : undefined}>{Danger}{Finishing}{Gk}{Lili}{Future}</View>
      </View>
      <Text style={s.foot}>Real shot data (in/out box, on target, xG) + per-player saves. Danger Index & efficiency are Lili models. No exact shot coordinates in the feed.</Text>
    </View>
  );
}

function Cmp({ label, h, a, bold }: { label: string; h: string | number; a: string | number; bold?: boolean }) {
  return <View style={s.cmp}>
    <Text style={[s.cmpV, { color: D.blue, textAlign: 'left' }, bold && s.cmpBold]}>{h}</Text>
    <Text style={s.cmpL}>{label}</Text>
    <Text style={[s.cmpV, { color: D.red, textAlign: 'right' }, bold && s.cmpBold]}>{a}</Text>
  </View>;
}
function FinRow({ t, color }: { t: ShotTeam; color: string }) {
  return <View style={s.finRow}>
    <Text style={[s.finTeam, { color }]} numberOfLines={1}>{t.flag} {t.team}</Text>
    <Text style={s.finNums}>{t.goals} G vs {t.xg.toFixed(1)} xG</Text>
    <Text style={[s.finTag, { color: t.effIcon === '🔥' ? D.green : t.effIcon === '❄' ? D.red : D.text2 }]}>{t.effIcon} {t.effPct >= 0 ? '+' : ''}{t.effPct}%</Text>
  </View>;
}
function GkRow({ team, flag, g, color }: { team: string; flag: string; g: GkLine; color: string }) {
  return <View style={s.gkRow}>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={[s.gkTeam, { color }]} numberOfLines={1}>{flag} {team} {g.icon}</Text>
      <Text style={s.gkSub}>{g.saves} saves · {g.conceded} conceded vs {g.xga.toFixed(1)} xGA · {g.label}</Text>
    </View>
    <Text style={s.gkIndex}>{g.index}</Text>
  </View>;
}
function FutRow({ team, flag, t, color }: { team: string; flag: string; t: { danger: number; effPct: number; gkIndex: number } | null; color: string }) {
  return <View style={s.futRow}>
    <Text style={[s.futTeam, { color }]} numberOfLines={1}>{flag} {team}</Text>
    <Text style={s.futVal}>{t ? `DGR ${t.danger} · FIN ${t.effPct >= 0 ? '+' : ''}${t.effPct}% · GK ${t.gkIndex}` : 'no data'}</Text>
  </View>;
}

const s = StyleSheet.create({
  wrap:  { padding: 14, gap: 10 },
  h1:    { color: D.text1, fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  h1sub: { color: D.text2, fontSize: 12, marginTop: -4, marginBottom: 4 },
  empty: { color: D.text2, fontSize: 12, padding: 20, textAlign: 'center' },
  cols:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  left:  { flex: 1.3, minWidth: 0, gap: 10 },
  right: { width: 330, gap: 10 },

  card:      { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12 },
  cardTitle: { color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },

  cmp:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  cmpV:   { flex: 1, fontSize: 14, fontWeight: '700' },
  cmpBold:{ fontSize: 17, fontWeight: '900' },
  cmpL:   { flex: 1.5, color: D.text2, fontSize: 11, textAlign: 'center' },
  note:   { color: D.text3, fontSize: 9, marginTop: 6, fontStyle: 'italic' },

  dRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dNum:  { fontSize: 24, fontWeight: '900', width: 40, textAlign: 'center' },
  dBar:  { flex: 1, flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: D.panel2 },

  finRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  finTeam: { fontSize: 12, fontWeight: '800', flex: 1 },
  finNums: { color: D.text2, fontSize: 11, width: 110, textAlign: 'right' },
  finTag:  { fontSize: 12, fontWeight: '800', width: 64, textAlign: 'right' },

  gkRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  gkTeam: { fontSize: 12, fontWeight: '800' },
  gkSub:  { color: D.text2, fontSize: 10, marginTop: 1 },
  gkIndex:{ color: D.text1, fontSize: 18, fontWeight: '900' },

  liliTxt:{ color: D.text1, fontSize: 12, lineHeight: 18 },

  futRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border, gap: 8 },
  futTeam: { fontSize: 12, fontWeight: '800', flexShrink: 0 },
  futVal:  { color: D.text2, fontSize: 10, textAlign: 'right' },

  foot:    { color: D.text3, fontSize: 9, textAlign: 'center', fontStyle: 'italic', marginTop: 2 },
});
