import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { passStructure, passRanking, passClash, type PassNode } from '../lib/passStructure';
import type { MatchStats } from '../lib/matchStatsData';
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
  line:   'rgba(255,255,255,0.4)',
  text1:  '#F1F5FF',
  text2:  '#8DA2C8',
  text3:  '#52668C',
};
const flagOf = (t: string) => WC_TEAMS.find((x) => x.name === t)?.flag ?? '🏳';
const surname = (n: string) => n.trim().split(/\s+/).pop()!;
const ORDER = ['GK', 'DF', 'MF', 'FW'];

export default function PassMapModule({ match }: { match: MatchStats }) {
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const [side, setSide] = useState<'home' | 'away'>('home');
  const team = side === 'home' ? match.home : match.away;
  const accent = side === 'home' ? D.blue : D.red;

  const liveStats = side === 'home' ? match.homeStats : match.awayStats;
  const { lang } = useLanguage();
  const ps = useMemo(() => passStructure(match.fixtureId, team, liveStats, HEATMAP_I18N[lang] ?? HEATMAP_I18N.EN), [match.fixtureId, team, liveStats, lang]);
  const ranking = useMemo(() => passRanking(), []);
  const clash = useMemo(() => passClash(team), [team]);

  const lines = useMemo(() => {
    const by: Record<string, PassNode[]> = { GK: [], DF: [], MF: [], FW: [] };
    (ps?.players ?? []).forEach((p) => { (by[p.pos] ?? by.MF).push(p); });
    for (const k of ORDER) by[k].sort((a, b) => b.passes - a.passes);
    return by;
  }, [ps]);

  const Toggle = (
    <View style={s.toggle}>
      {(['home', 'away'] as const).map((k) => {
        const t = k === 'home' ? match.home : match.away;
        const on = side === k;
        return (
          <Pressable key={k} onPress={() => setSide(k)} style={[s.tBtn, on && { borderColor: k === 'home' ? D.blue : D.red, backgroundColor: k === 'home' ? 'rgba(46,124,255,0.12)' : 'rgba(255,59,71,0.12)' }]}>
            <Text style={[s.tTxt, on && { color: D.text1 }]}>{flagOf(t)} {t}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const hasNodes = (ps?.players.length ?? 0) > 0;

  const Map = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🕸 PASSING STRUCTURE · involvement by pass volume</Text>
      <View style={s.pitch}>
        <View style={s.halfway} /><View style={s.circle} />
        {!hasNodes && (
          <Text style={s.pitchEmpty}>Per-player passing map appears once the match is finalised. Team-level structure shown below.</Text>
        )}
        <View style={s.formation}>
          {ORDER.map((pos) => (
            <View key={pos} style={s.col}>
              {lines[pos].map((p) => {
                const size = 18 + p.involvement * 30;
                return (
                  <View key={p.name} style={s.node}>
                    <View style={[s.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: `rgba(${accent === D.blue ? '46,124,255' : '255,59,71'},${(0.25 + 0.6 * p.involvement).toFixed(2)})`, borderColor: accent }]}>
                      <Text style={s.dotNum}>{p.passes}</Text>
                    </View>
                    <Text style={s.nodeName} numberOfLines={1}>{surname(p.name)}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <Text style={s.pitchNote}>Circle size = passes played (involvement). Laid out by formation role. No pass-by-pass link data in the feed.</Text>
    </View>
  );

  const ScoreCard = ps && (
    <View style={s.card}>
      <Text style={s.cardTitle}>🧮 CONNECTIVITY</Text>
      <View style={s.connRow}>
        <Text style={[s.connNum, { color: accent }]}>{ps.connectivity}</Text>
        <View style={{ flex: 1 }}>
          <View style={s.connBarTrack}><View style={[s.connBarFill, { width: `${ps.connectivity}%`, backgroundColor: accent }]} /></View>
          <Text style={s.connSub}>{Math.round(ps.passAccuracy * 100)}% pass acc · {Math.round(ps.possession * 100)}% poss · {ps.totalPasses} passes</Text>
        </View>
      </View>
      <View style={[s.styleBadge, { borderColor: accent }]}>
        <Text style={[s.styleLabel, { color: accent }]}>{ps.style.label}</Text>
        <Text style={s.styleDesc}>{ps.style.desc}</Text>
      </View>
    </View>
  );

  const TopPassers = ps && (
    <View style={s.card}>
      <Text style={s.cardTitle}>🎯 TOP DISTRIBUTORS</Text>
      {ps.topPassers.map((p, i) => (
        <View key={p.name} style={s.row}>
          <Text style={s.rank}>{i + 1}</Text>
          <Text style={s.pName} numberOfLines={1}>{surname(p.name)} <Text style={s.pPos}>{p.pos}</Text></Text>
          <Text style={s.pVal}>{p.passes}<Text style={s.pUnit}> P</Text></Text>
          <Text style={[s.pVal, { width: 44, color: D.text2 }]}>{p.passAccPct}<Text style={s.pUnit}>%</Text></Text>
        </View>
      ))}
    </View>
  );

  const Lili = ps && (
    <View style={[s.card, { borderColor: 'rgba(242,194,75,0.3)' }]}>
      <Text style={[s.cardTitle, { color: D.gold }]}>🦞 LILI CONNECTION INSIGHT</Text>
      <Text style={s.liliTxt}>{ps.lili}</Text>
    </View>
  );

  const Ranking = (
    <View style={s.card}>
      <Text style={s.cardTitle}>🌍 BEST PASSING TEAMS</Text>
      {ranking.map((r, i) => (
        <View key={r.team} style={[s.row, r.team === team && { backgroundColor: 'rgba(46,124,255,0.08)' }]}>
          <Text style={s.rank}>{i + 1}</Text>
          <Text style={s.pName} numberOfLines={1}>{r.flag} {r.team}</Text>
          <Text style={[s.pVal, { width: 34 }]}>{r.connectivity}</Text>
          <Text style={[s.pVal, { width: 40, color: D.text2 }]}>{r.passAccPct}%</Text>
        </View>
      ))}
    </View>
  );

  const Future = clash && (
    <View style={s.card}>
      <Text style={s.cardTitle}>🔮 NEXT MATCH · {team} v {clash.opponent}</Text>
      <View style={s.futRow}><Text style={s.futTeam}>{flagOf(team)} {team}</Text><Text style={[s.futVal, { color: accent }]}>{clash.teamConn}</Text></View>
      <View style={s.futRow}><Text style={s.futTeam}>{clash.opponentFlag} {clash.opponent}</Text><Text style={s.futVal}>{clash.oppConn ?? '—'}</Text></View>
      <Text style={s.futLili}>🦞 {clash.oppConn != null && clash.teamConn >= clash.oppConn
        ? `${team} have the stronger passing structure so far — likely to see more of the ball.`
        : clash.oppConn != null ? `${clash.opponent} have controlled possession better so far — ${team} may have to play on the counter.`
        : `${clash.opponent} have no data yet.`}</Text>
    </View>
  );

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>🕸 PASS MAP</Text>
      <Text style={s.h1sub}>How does this team move the ball and control the game?</Text>
      {Toggle}
      {ps ? (
        <View style={wide ? s.cols : undefined}>
          <View style={wide ? s.left : undefined}>{Map}{ScoreCard}</View>
          <View style={wide ? s.right : undefined}>{TopPassers}{Lili}{Ranking}{Future}</View>
        </View>
      ) : <Text style={s.empty}>No passing data for this match yet.</Text>}
      <Text style={s.foot}>Involvement & connectivity from real per-player passes + team possession. No pass-pair/position feed, so no fabricated connection lines.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:  { padding: 14, gap: 10 },
  h1:    { color: D.text1, fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  h1sub: { color: D.text2, fontSize: 12, marginTop: -4, marginBottom: 2 },
  empty: { color: D.text2, fontSize: 12, padding: 20, textAlign: 'center' },
  cols:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  left:  { flex: 1.25, minWidth: 0, gap: 10 },
  right: { width: 320, gap: 10 },

  toggle:{ flexDirection: 'row', gap: 8 },
  tBtn:  { flex: 1, borderWidth: 1, borderColor: D.border, borderRadius: 10, paddingVertical: 8, alignItems: 'center', backgroundColor: D.panel },
  tTxt:  { color: D.text2, fontSize: 12, fontWeight: '700' },

  card:      { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12 },
  cardTitle: { color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8 },

  pitch:    { width: '100%', aspectRatio: 16 / 10, backgroundColor: D.pitch, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(120,180,255,0.4)', overflow: 'hidden', justifyContent: 'center' },
  halfway:  { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1.5, marginLeft: -0.75, backgroundColor: D.line },
  circle:   { position: 'absolute', left: '50%', top: '50%', width: '16%', aspectRatio: 1, marginLeft: '-8%', marginTop: '-12.8%', borderRadius: 999, borderWidth: 1.5, borderColor: D.line },
  formation:{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'stretch', paddingVertical: 6 },
  col:      { flex: 1, justifyContent: 'space-around', alignItems: 'center' },
  node:     { alignItems: 'center', marginVertical: 2 },
  dot:      { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dotNum:   { color: '#fff', fontSize: 9, fontWeight: '800' },
  nodeName: { color: D.text2, fontSize: 8, marginTop: 1, maxWidth: 60, textAlign: 'center' },
  pitchNote:{ color: D.text3, fontSize: 9, marginTop: 6, fontStyle: 'italic' },
  pitchEmpty:{ position: 'absolute', alignSelf: 'center', top: '50%', marginTop: -14, paddingHorizontal: 24, color: D.text2, fontSize: 11, textAlign: 'center', zIndex: 2 },

  connRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  connNum:  { fontSize: 30, fontWeight: '900', width: 56, textAlign: 'center' },
  connBarTrack:{ height: 8, backgroundColor: D.panel2, borderRadius: 4, overflow: 'hidden' },
  connBarFill:{ height: 8, borderRadius: 4 },
  connSub:  { color: D.text2, fontSize: 10, marginTop: 5 },
  styleBadge:{ borderWidth: 1, borderRadius: 10, padding: 8, marginTop: 10, alignItems: 'center' },
  styleLabel:{ fontSize: 14, fontWeight: '900' },
  styleDesc:{ color: D.text2, fontSize: 10, marginTop: 1 },

  row:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border, borderRadius: 4 },
  rank:   { color: D.text3, fontSize: 11, fontWeight: '800', width: 14 },
  pName:  { color: D.text1, fontSize: 12, fontWeight: '600', flex: 1 },
  pPos:   { color: D.text3, fontSize: 9, fontWeight: '700' },
  pVal:   { color: D.text1, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  pUnit:  { color: D.text3, fontSize: 9, fontWeight: '700' },

  liliTxt:{ color: D.text1, fontSize: 12, lineHeight: 18 },

  futRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  futTeam:{ color: D.text1, fontSize: 13, fontWeight: '700' },
  futVal: { color: D.text1, fontSize: 18, fontWeight: '900' },
  futLili:{ color: D.text2, fontSize: 11, lineHeight: 16, marginTop: 8, fontStyle: 'italic' },

  foot:   { color: D.text3, fontSize: 9, textAlign: 'center', fontStyle: 'italic', marginTop: 2 },
});
