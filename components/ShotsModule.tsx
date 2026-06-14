import { useMemo } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { shotsMatch, shotRankings, shotFuture, type ShotsMatch, type ShotTeam, type GkLine } from '../lib/shotsModel';
import type { MatchStats } from '../lib/matchStatsData';
import { useLiveResults } from '../lib/useLiveResults';
import { WC_TEAMS } from '../lib/wcData';

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
const rgba = (hex: string, n: number) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${n.toFixed(2)})`;
};

function ZoneGlow({ color, norm, pos }: { color: string; norm: number; pos: any }) {
  if (norm <= 0.02) return null;
  const size = 22 + norm * 26;
  const blur = Platform.OS === 'web' ? ({ filter: `blur(${5 + norm * 7}px)` } as any) : null;
  return <View pointerEvents="none" style={[{ position: 'absolute', width: `${size}%`, aspectRatio: 1, borderRadius: 999, backgroundColor: rgba(color, 0.18 + 0.4 * norm) }, pos, blur]} />;
}

export default function ShotsModule({ match }: { match: MatchStats }) {
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const results = useLiveResults();
  const m: ShotsMatch | null = useMemo(() => shotsMatch(match.fixtureId, results), [match.fixtureId, results]);
  const rank = useMemo(() => shotRankings(results), [results]);
  const fut = useMemo(() => shotFuture(match.home, results), [match.home, results]);

  if (!m) return <View style={s.wrap}><Text style={s.empty}>No shot data for this match yet.</Text></View>;
  const { home: h, away: a, gkHome, gkAway } = m;
  const mx = (x: number, y: number) => Math.max(x, y, 1);

  const Map = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🎯 SHOT MAP · by area</Text>
      <View style={s.pitch}>
        <ZoneGlow color={D.blue} norm={h.outside / mx(h.outside, a.outside)} pos={{ right: '22%', top: '30%' }} />
        <ZoneGlow color={D.blue} norm={h.inside / mx(h.inside, a.inside)} pos={{ right: '5%', top: '30%' }} />
        <ZoneGlow color={D.red} norm={a.outside / mx(h.outside, a.outside)} pos={{ left: '22%', top: '30%' }} />
        <ZoneGlow color={D.red} norm={a.inside / mx(h.inside, a.inside)} pos={{ left: '5%', top: '30%' }} />
        <View style={s.halfway} /><View style={s.circle} />
        <View style={[s.box, s.boxL]} /><View style={[s.box, s.boxR]} />
        <Text style={[s.goalBadge, { right: '7%', color: D.blue }]}>⚽ {h.goals}</Text>
        <Text style={[s.goalBadge, { left: '7%', color: D.red }]}>⚽ {a.goals}</Text>
      </View>
      <View style={s.legendRow}>
        <Text style={s.legend}>⚽ Goal   🎯 On Target   ⚪ Off Target</Text>
      </View>
      <Text style={s.pitchNote}>Glow size = shots from that area (box vs outside). Exact shot coordinates aren't in the feed.</Text>
    </View>
  );

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

  const Rankings = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🌍 WORLD CUP RANKINGS</Text>
      <RankList title="⚽ Most Goals" rows={rank.mostGoals} unit="" />
      <RankList title="🎯 Most On Target" rows={rank.mostSot} unit="" />
      <RankList title="🔥 Highest Danger" rows={rank.highestDanger} unit="" />
      <RankList title="🧤 Toughest Keeper" rows={rank.toughestGk} unit="" showSub />
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
        <View style={wide ? s.left : undefined}>{Map}{Summary}{Zones}{Rankings}</View>
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
function RankList({ title, rows, showSub }: { title: string; rows: { team: string; flag: string; value: number; sub?: string }[]; unit: string; showSub?: boolean }) {
  return <View style={s.rl}>
    <Text style={s.rlTitle}>{title}</Text>
    {rows.slice(0, 3).map((r, i) => (
      <View key={r.team} style={s.rlRow}>
        <Text style={s.rlRank}>{i + 1}</Text>
        <Text style={s.rlName} numberOfLines={1}>{r.flag} {r.team}</Text>
        <Text style={s.rlVal}>{showSub && r.sub ? r.sub : r.value}</Text>
      </View>
    ))}
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

  pitch:    { width: '100%', aspectRatio: 16 / 9, backgroundColor: D.pitch, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(120,180,255,0.4)', overflow: 'hidden', justifyContent: 'center' },
  halfway:  { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1.5, marginLeft: -0.75, backgroundColor: D.line },
  circle:   { position: 'absolute', left: '50%', top: '50%', width: '15%', aspectRatio: 1, marginLeft: '-7.5%', marginTop: '-13%', borderRadius: 999, borderWidth: 1.5, borderColor: D.line },
  box:      { position: 'absolute', top: '22%', bottom: '22%', width: '15%', borderWidth: 1.5, borderColor: D.line },
  boxL:     { left: 0, borderLeftWidth: 0 }, boxR: { right: 0, borderRightWidth: 0 },
  goalBadge:{ position: 'absolute', top: '6%', fontSize: 13, fontWeight: '900' },
  legendRow:{ marginTop: 6 },
  legend:   { color: D.text2, fontSize: 10 },
  pitchNote:{ color: D.text3, fontSize: 9, marginTop: 3, fontStyle: 'italic' },

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

  rl:      { marginBottom: 8 },
  rlTitle: { color: D.text2, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  rlRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  rlRank:  { color: D.text3, fontSize: 10, fontWeight: '800', width: 12 },
  rlName:  { color: D.text1, fontSize: 11, fontWeight: '600', flex: 1 },
  rlVal:   { color: D.text1, fontSize: 12, fontWeight: '800' },

  futRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border, gap: 8 },
  futTeam: { fontSize: 12, fontWeight: '800', flexShrink: 0 },
  futVal:  { color: D.text2, fontSize: 10, textAlign: 'right' },

  foot:    { color: D.text3, fontSize: 9, textAlign: 'center', fontStyle: 'italic', marginTop: 2 },
});
