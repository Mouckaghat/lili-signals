import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { computeHomeEdge, type HomeEdge, type HomeEdgeMatch } from '../lib/homeEdge';
import { useLiveResults } from '../lib/useLiveResults';
import { WC_TEAMS } from '../lib/wcData';

const D = {
  panel:  '#0A1322',
  panel2: '#0F1C33',
  border: 'rgba(86,140,224,0.16)',
  blue:   '#2E7CFF',
  red:    '#FF3B47',
  amber:  '#F2A53B',
  green:  '#33C26B',
  text1:  '#F1F5FF',
  text2:  '#8DA2C8',
  text3:  '#52668C',
};
const flagOf = (n: string) => WC_TEAMS.find((t) => t.name === n)?.flag ?? '🏳';
const shortDate = (iso: string) => {
  const d = new Date(iso); const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${m[d.getMonth()]}`;
};
const RATING = {
  weak:     { icon: '🔴', label: 'Weak',     color: D.red },
  moderate: { icon: '🟠', label: 'Moderate', color: D.amber },
  strong:   { icon: '🟢', label: 'Strong',   color: D.green },
} as const;
const resultColor = (r: HomeEdgeMatch['result']) => (r === 'Home Win' ? D.blue : r === 'Away Win' ? D.red : D.text2);

export default function HomeEdgeModule() {
  const results = useLiveResults();
  const edge: HomeEdge = useMemo(() => computeHomeEdge(results), [results]);
  const [drillId, setDrillId] = useState<string | null>(null);
  const drill = edge.matches.find((m) => m.fixtureId === drillId);
  const rating = RATING[edge.rating];

  const maxMd = Math.max(1, ...edge.byMatchday.map((d) => d.home + d.away + d.draw));

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>HOME EDGE TRACKER</Text>
      <Text style={s.h1sub}>Does playing at home matter in this World Cup?</Text>

      {/* Summary */}
      <View style={s.card}>
        <Text style={s.cardTitle}>TOURNAMENT SUMMARY</Text>
        <View style={s.tiles}>
          <Tile label="Home Wins" value={edge.homeWins} color={D.blue} />
          <Tile label="Away Wins" value={edge.awayWins} color={D.red} />
          <Tile label="Draws"     value={edge.draws}    color={D.text2} />
        </View>
        <View style={s.rateRow}>
          <Text style={s.rateLabel}>Home Win Rate</Text>
          <Text style={s.ratePct}>{Math.round(edge.homeWinRate * 100)}%</Text>
        </View>
        {/* W/A/D bar */}
        <View style={s.wadBar}>
          {edge.completed > 0 && <>
            <View style={{ flex: edge.homeWins || 0.0001, backgroundColor: D.blue }} />
            <View style={{ flex: edge.draws || 0.0001, backgroundColor: D.text3 }} />
            <View style={{ flex: edge.awayWins || 0.0001, backgroundColor: D.red }} />
          </>}
        </View>

        <View style={s.ratingRow}>
          <Text style={s.ratingLabel}>Home Edge Rating</Text>
          <View style={[s.ratingBadge, { borderColor: rating.color }]}>
            <Text style={[s.ratingText, { color: rating.color }]}>{rating.icon} {rating.label}</Text>
          </View>
        </View>

        <View style={s.lili}>
          <Text style={s.liliTag}>🦞 LILI</Text>
          <Text style={s.liliText}>{edge.commentary}</Text>
        </View>

        <Text style={s.edgeNote}>
          Applied to predictions: <Text style={{ color: D.blue, fontWeight: '800' }}>+{edge.edgePoints}</Text> strength to the home team (capped +5 — closes tight matches, never creates upsets).
        </Text>
      </View>

      {/* Matchday trend */}
      {edge.byMatchday.length > 0 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>HOME EDGE TREND</Text>
          <View style={s.trendRow}>
            {edge.byMatchday.map((d) => {
              const tot = d.home + d.away + d.draw;
              return (
                <View key={d.matchday} style={s.trendCol}>
                  <Text style={s.trendPct}>{Math.round(d.homeWinRate * 100)}%</Text>
                  <View style={[s.trendBarWrap, { height: 70 }]}>
                    <View style={{ height: `${(tot / maxMd) * 100}%`, width: '100%', justifyContent: 'flex-end' }}>
                      <View style={{ flexDirection: 'column-reverse', flex: 1 }}>
                        <View style={{ flex: d.home || 0.0001, backgroundColor: D.blue }} />
                        <View style={{ flex: d.draw || 0.0001, backgroundColor: D.text3 }} />
                        <View style={{ flex: d.away || 0.0001, backgroundColor: D.red }} />
                      </View>
                    </View>
                  </View>
                  <Text style={s.trendMd}>MD{d.matchday}</Text>
                </View>
              );
            })}
            <View style={s.trendLegend}>
              <Lg color={D.blue} t="Home" /><Lg color={D.text3} t="Draw" /><Lg color={D.red} t="Away" />
            </View>
          </View>
        </View>
      )}

      {/* Match table */}
      <View style={s.card}>
        <Text style={s.cardTitle}>MATCH BREAKDOWN</Text>
        <View style={s.thead}>
          <Text style={[s.th, s.cDate]}>Date</Text>
          <Text style={[s.th, s.cTeam]}>Home</Text>
          <Text style={[s.th, s.cScore]}>Score</Text>
          <Text style={[s.th, s.cTeam]}>Away</Text>
          <Text style={[s.th, s.cRes]}>Result</Text>
        </View>
        {edge.matches.length === 0 && <Text style={s.empty}>No completed matches yet.</Text>}
        {edge.matches.map((m) => {
          const on = m.fixtureId === drillId;
          return (
            <View key={m.fixtureId}>
              <Pressable onPress={() => setDrillId(on ? null : m.fixtureId)} style={[s.tr, on && s.trOn]}>
                <Text style={[s.td, s.cDate]}>{shortDate(m.date)}</Text>
                <Text style={[s.td, s.cTeam]} numberOfLines={1}>{flagOf(m.home)} {m.home}</Text>
                <Text style={[s.td, s.cScore, { fontWeight: '800', color: D.text1 }]}>{m.homeScore}-{m.awayScore}</Text>
                <Text style={[s.td, s.cTeam]} numberOfLines={1}>{flagOf(m.away)} {m.away}</Text>
                <Text style={[s.td, s.cRes, { color: resultColor(m.result), fontWeight: '700' }]}>{m.result}</Text>
              </Pressable>
              {on && (
                <View style={s.drill}>
                  <Text style={s.drillTitle}>{m.home} vs {m.away}</Text>
                  <View style={s.drillGrid}>
                    <Drow k="Home Team" v={`${flagOf(m.home)} ${m.home}`} />
                    <Drow k="Away Team" v={`${flagOf(m.away)} ${m.away}`} />
                    <Drow k="Venue" v={`${m.venue}, ${m.city}`} />
                    <Drow k="Capacity" v={m.capacity ? m.capacity.toLocaleString() : '—'} />
                    <Drow k="Result" v={`${m.homeScore}-${m.awayScore} (${m.result})`} />
                  </View>
                  <View style={s.impactRow}>
                    <Text style={s.impactLabel}>Home Edge Impact</Text>
                    <Text style={[s.impactVal, { color: m.edgeImpactPct >= 0 ? D.blue : D.red }]}>
                      {m.edgeImpactPct >= 0 ? '+' : ''}{m.edgeImpactPct}%
                    </Text>
                  </View>
                  <Text style={s.drillLili}>
                    🦞 {m.result === 'Home Win'
                      ? `${m.home} benefited from home support, but team strength remained the dominant factor.`
                      : m.result === 'Away Win'
                      ? `${m.away} overcame the home factor — strength outweighed any home edge here.`
                      : 'An even contest; the home factor was not decisive.'}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Text style={s.foot}>Capacity shown in place of attendance (no live attendance feed). Home Edge is modelled from results · Lili Signals</Text>
    </View>
  );
}

function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.tile}>
      <Text style={[s.tileVal, { color }]}>{value}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  );
}
function Lg({ color, t }: { color: string; t: string }) {
  return <View style={s.lg}><View style={[s.lgDot, { backgroundColor: color }]} /><Text style={s.lgTxt}>{t}</Text></View>;
}
function Drow({ k, v }: { k: string; v: string }) {
  return <View style={s.drow}><Text style={s.dk}>{k}</Text><Text style={s.dv} numberOfLines={1}>{v}</Text></View>;
}

const s = StyleSheet.create({
  wrap:    { padding: 14, gap: 12 },
  h1:      { color: D.text1, fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  h1sub:   { color: D.text2, fontSize: 12, marginTop: -4 },

  card:    { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12 },
  cardTitle:{ color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },

  tiles:   { flexDirection: 'row', gap: 10 },
  tile:    { flex: 1, backgroundColor: D.panel2, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  tileVal: { fontSize: 26, fontWeight: '900' },
  tileLabel:{ color: D.text2, fontSize: 11, marginTop: 2 },

  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  rateLabel:{ color: D.text2, fontSize: 13, fontWeight: '600' },
  ratePct: { color: D.text1, fontSize: 22, fontWeight: '900' },
  wadBar:  { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: D.panel2, marginTop: 8 },

  ratingRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  ratingLabel:{ color: D.text2, fontSize: 13, fontWeight: '600' },
  ratingBadge:{ borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  ratingText:{ fontSize: 13, fontWeight: '800' },

  lili:    { marginTop: 14, backgroundColor: D.panel2, borderRadius: 10, padding: 10 },
  liliTag: { color: D.amber, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 3 },
  liliText:{ color: D.text1, fontSize: 13, lineHeight: 18 },
  edgeNote:{ color: D.text2, fontSize: 11, lineHeight: 16, marginTop: 10 },

  trendRow:{ flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  trendCol:{ alignItems: 'center', width: 54 },
  trendPct:{ color: D.text1, fontSize: 12, fontWeight: '800', marginBottom: 4 },
  trendBarWrap:{ width: 30, backgroundColor: D.panel2, borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' },
  trendMd: { color: D.text2, fontSize: 10, marginTop: 4, fontWeight: '700' },
  trendLegend:{ marginLeft: 'auto', gap: 4 },
  lg:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lgDot:   { width: 8, height: 8, borderRadius: 4 },
  lgTxt:   { color: D.text2, fontSize: 11 },

  thead:   { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: D.border },
  th:      { color: D.text3, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  tr:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  trOn:    { backgroundColor: 'rgba(46,124,255,0.08)' },
  td:      { color: D.text1, fontSize: 12 },
  cDate:   { width: 52 },
  cTeam:   { flex: 1 },
  cScore:  { width: 46, textAlign: 'center' },
  cRes:    { width: 78, textAlign: 'right' },
  empty:   { color: D.text2, fontSize: 12, paddingVertical: 12, textAlign: 'center' },

  drill:   { backgroundColor: D.panel2, borderRadius: 10, padding: 12, marginVertical: 6 },
  drillTitle:{ color: D.text1, fontSize: 14, fontWeight: '800', marginBottom: 8 },
  drillGrid:{ gap: 4 },
  drow:    { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  dk:      { color: D.text2, fontSize: 12 },
  dv:      { color: D.text1, fontSize: 12, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  impactRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10,
              paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: D.border },
  impactLabel:{ color: D.text2, fontSize: 12, fontWeight: '700' },
  impactVal:{ fontSize: 18, fontWeight: '900' },
  drillLili:{ color: D.text2, fontSize: 11, lineHeight: 16, marginTop: 8, fontStyle: 'italic' },

  foot:    { color: D.text3, fontSize: 10, textAlign: 'center', fontStyle: 'italic', marginTop: 2 },
});
