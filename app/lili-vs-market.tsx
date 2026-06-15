import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildComparisons, type MatchComparison, type Outcome, type ProbRow } from '../lib/marketComparison';
import { WC_TEAMS } from '../lib/wcData';
import { useLanguage } from '../contexts/LanguageContext';
import { MARKET_I18N, mktT } from '../lib/marketI18n';

// ─── Design tokens (match the dark intel screens) ──────────────────────────────
const D = {
  bg:      '#040C10',
  card:    '#0C1C2C',
  border:  'rgba(0,200,255,0.10)',
  blue:    '#4A9EFF',   // home
  grey:    '#5C6B86',   // draw
  red:     '#FF6B6B',   // away
  green:   '#34D399',
  orange:  '#FF9F45',
  text1:   '#EEF2FF',
  text2:   '#8298BE',
  text3:   '#4A6088',
};

const FLAG = new Map(WC_TEAMS.map((t) => [t.name, t.flag]));
const flag = (name: string) => FLAG.get(name) ?? '🏳️';
const pc = (n: number) => `${Math.round(n * 100)}`;

// A stacked home|draw|away probability bar with the three percentages.
function ProbBar({ label, row, fav, accent }: { label: string; row: ProbRow; fav: Outcome; accent: string }) {
  const seg = (o: Outcome, color: string) => (
    <View style={{ flex: Math.max(row[o], 0.001), backgroundColor: color }} />
  );
  const num = (o: Outcome, color: string) => (
    <Text style={[s.barNum, { color }, fav === o && s.barNumFav]}>{pc(row[o])}</Text>
  );
  return (
    <View style={s.probRow}>
      <Text style={[s.srcLabel, { color: accent }]} numberOfLines={1}>{label}</Text>
      <View style={s.barWrap}>
        <View style={s.bar}>
          {seg('home', D.blue)}
          {seg('draw', D.grey)}
          {seg('away', D.red)}
        </View>
        <View style={s.barNums}>
          {num('home', D.blue)}
          {num('draw', D.text2)}
          {num('away', D.red)}
        </View>
      </View>
    </View>
  );
}

function MatchCard({ c, t, groupLabel }: { c: MatchComparison; t: typeof MARKET_I18N['EN']; groupLabel: string }) {
  const d = new Date(c.date);
  const when = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <View style={s.card}>
      {/* Fixture header */}
      <View style={s.cardHead}>
        <Text style={s.team} numberOfLines={1}>{flag(c.home)} {c.home}</Text>
        <Text style={s.vs}>v</Text>
        <Text style={[s.team, s.teamRight]} numberOfLines={1}>{c.away} {flag(c.away)}</Text>
      </View>
      <Text style={s.meta}>{groupLabel} {c.group} · {when}</Text>

      {/* Probability rows */}
      <View style={s.bars}>
        <ProbBar label={t.lili} row={c.lili} fav={c.liliFav} accent={D.green} />
        {c.market && <ProbBar label={t.market} row={c.market} fav={c.marketFav!} accent={D.text1} />}
        {c.model
          ? <ProbBar label={t.model} row={c.model} fav={(['home', 'draw', 'away'] as Outcome[]).reduce((b, o) => (c.model![o] > c.model![b] ? o : b), 'home' as Outcome)} accent={D.orange} />
          : <Text style={s.noModel}>{t.model}: {t.noModel}</Text>}
      </View>

      {/* Bookmaker count + verdict */}
      <View style={s.footRow}>
        {c.bookmakers > 0 && <Text style={s.books}>{mktT(t.books, { n: c.bookmakers })}</Text>}
        {c.agree !== null && (
          <View style={[s.verdict, { backgroundColor: c.agree ? 'rgba(52,211,153,0.12)' : 'rgba(255,159,69,0.12)', borderColor: c.agree ? `${D.green}40` : `${D.orange}40` }]}>
            <Text style={[s.verdictText, { color: c.agree ? D.green : D.orange }]}>{c.agree ? t.agree : t.differ}</Text>
          </View>
        )}
      </View>

      {/* api-football advice (verbatim) */}
      {c.advice && <Text style={s.advice}>💡 {t.tip}: {c.advice}</Text>}
    </View>
  );
}

export default function LiliVsMarketScreen() {
  const { lang, i18n } = useLanguage();
  const t = MARKET_I18N[lang] ?? MARKET_I18N.EN;
  const comparisons = useMemo(() => buildComparisons(), []);

  return (
    <>
      <Stack.Screen options={{ title: t.title, headerShown: true }} />
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.intro}>{t.intro}</Text>

          {comparisons.length === 0
            ? <Text style={s.empty}>{t.empty}</Text>
            : comparisons.map((c) => <MatchCard key={c.fixtureId} c={c} t={t} groupLabel={i18n.group} />)}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: D.bg },
  content:  { padding: 14, paddingBottom: 40, gap: 12 },
  intro:    { fontSize: 12.5, lineHeight: 18, color: D.text2, marginBottom: 2 },
  empty:    { fontSize: 13, color: D.text3, textAlign: 'center', marginTop: 40 },

  card:     { backgroundColor: D.card, borderRadius: 14, borderWidth: 1, borderColor: D.border, padding: 14, gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center' },
  team:     { flex: 1, fontSize: 14, fontWeight: '700', color: D.text1 },
  teamRight:{ textAlign: 'right' },
  vs:       { fontSize: 11, color: D.text3, paddingHorizontal: 8 },
  meta:     { fontSize: 11, color: D.text3, marginTop: -2 },

  bars:     { gap: 7, marginTop: 4 },
  probRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  srcLabel: { width: 52, fontSize: 11.5, fontWeight: '700' },
  barWrap:  { flex: 1, gap: 3 },
  bar:      { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)' },
  barNums:  { flexDirection: 'row', justifyContent: 'space-between' },
  barNum:   { fontSize: 10.5, fontWeight: '600' },
  barNumFav:{ fontWeight: '800' },
  noModel:  { fontSize: 11, color: D.text3, fontStyle: 'italic', paddingLeft: 62 },

  footRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  books:    { fontSize: 10.5, color: D.text3 },
  verdict:  { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  verdictText: { fontSize: 10.5, fontWeight: '700' },
  advice:   { fontSize: 11.5, color: D.text2, marginTop: 2, lineHeight: 16 },
});
