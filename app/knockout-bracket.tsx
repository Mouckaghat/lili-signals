import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildRoadToFinal, liliKnockoutRecord, type KnockoutTie, type RoundGroup, type Side, type TeamForm } from '../lib/knockoutModel';
import type { KnockoutRound } from '../lib/knockoutData';
import { useLiveResults } from '../lib/useLiveResults';
import { useKnockoutPicks } from '../contexts/KnockoutPicksContext';
import { useProfile } from '../contexts/ProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import { KNOCKOUT_I18N, koT } from '../lib/knockoutI18n';

// ─── Design tokens (match the dark intel screens) ──────────────────────────────
const D = {
  bg:     '#040C10',
  card:   '#0C1C2C',
  cardHi: '#102539',
  border: 'rgba(0,200,255,0.10)',
  text1:  '#EEF2FF',
  text2:  '#8298BE',
  text3:  '#4A6088',
  blue:   '#4A9EFF',
  green:  '#34D399',
  red:    '#FF6B6B',
  gold:   '#F5C451',
};

// Each round gets its own accent, warming toward gold at the Final — the "road"
// visibly heats up as you descend.
const ROUND_COLOR: Record<KnockoutRound, string> = {
  R32: '#4A9EFF', R16: '#22D3EE', QF: '#34D399', SF: '#FF9F45', '3RD': '#8298BE', F: '#F5C451',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon} · ${hh}:${mm}`;
}

// ─── One team row inside a tie card ─────────────────────────────────────────────
function TeamRow({
  team, side, tie, picked, isFav, t, accent,
}: {
  team: TeamForm | null;
  side: Side;
  tie: KnockoutTie;
  picked: boolean;
  isFav: boolean;       // user's favourite team
  t: typeof KNOCKOUT_I18N['EN'];
  accent: string;
}) {
  const liliBacks = tie.liliFav === side;
  const goals = tie.result ? tie.result[side] : null;
  const isWinner = tie.winner === side;
  const dim = tie.winner != null && !isWinner;

  return (
    <View style={[bx.teamRow, picked && { backgroundColor: 'rgba(74,158,255,0.10)' }]}>
      <Text style={[bx.flag, dim && bx.dim]}>{team?.flag ?? '🏳️'}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[bx.teamName, dim && bx.dim, isFav && { color: D.gold }]} numberOfLines={1}>
          {team?.name ?? t.toBeDecided}
          {liliBacks && <Text style={bx.liliDot}>{'  '}🤖</Text>}
        </Text>
        {team && (
          <Text style={bx.formLine} numberOfLines={1}>
            {team.pts != null ? koT(t.ptsShort, { n: team.pts }) : '—'}
            {team.liliTotal > 0 && <Text>{'  ·  '}{koT(t.liliCall, { c: team.liliCorrect, t: team.liliTotal })}</Text>}
            <Text style={bx.strength}>{'  ·  '}⚡{team.strength}</Text>
          </Text>
        )}
      </View>
      {goals != null && (
        <Text style={[bx.goals, isWinner ? { color: accent } : bx.dim]}>{goals}</Text>
      )}
    </View>
  );
}

// ─── A single knockout tie card ─────────────────────────────────────────────────
function TieCard({ tie, accent, t }: { tie: KnockoutTie; accent: string; t: typeof KNOCKOUT_I18N['EN'] }) {
  const { picks, setPick } = useKnockoutPicks();
  const { favTeam } = useProfile();
  const myPick = picks[tie.fixture.id];
  const locked = tie.status !== 'SCHEDULED';            // lock at kickoff — picks are predictions
  const finished = tie.status === 'FINISHED' && tie.winner != null;

  const venue = tie.stadium
    ? `🏟 ${tie.stadium.shortName}${tie.stadium.city ? ', ' + tie.stadium.city : ''}`
    : tie.venueName
      ? `🏟 ${tie.venueName}${tie.city ? ', ' + tie.city : ''}`
      : `🏟 ${t.venueTBC}`;

  const favName = (side: Side) => (side === 'home' ? tie.home?.name : tie.away?.name) ?? '';
  const isFav = (side: Side) => !!favTeam && favName(side) === favTeam;

  const myRight = finished && myPick ? (myPick === tie.winner) : null;
  const homePct = Math.round(tie.homeProb * 100);
  const liliPct = tie.liliFav === 'home' ? homePct : 100 - homePct;

  const PickBtn = ({ side }: { side: Side }) => {
    const selected = myPick === side;
    return (
      <Pressable
        disabled={locked}
        onPress={() => setPick(tie.fixture.id, side)}
        style={[bx.pickBtn, selected && { borderColor: accent, backgroundColor: 'rgba(74,158,255,0.16)' }, locked && bx.pickBtnLocked]}
      >
        <Text style={[bx.pickBtnText, selected && { color: D.text1 }]} numberOfLines={1}>
          {(side === 'home' ? tie.home?.flag : tie.away?.flag) ?? '🏳️'} {favName(side) || t.toBeDecided}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[bx.card, { borderLeftColor: accent }, (isFav('home') || isFav('away')) && { borderColor: 'rgba(245,196,81,0.45)' }]}>
      {/* meta */}
      <View style={bx.metaRow}>
        <Text style={bx.meta} numberOfLines={1}>{fmtDate(tie.fixture.date)}  ·  {venue}</Text>
        {tie.status === 'LIVE' && <Text style={[bx.chip, { color: D.red }]}>🔴 {t.live}</Text>}
        {finished && <Text style={[bx.chip, { color: D.text3 }]}>{t.ft}</Text>}
      </View>

      {/* teams */}
      <TeamRow team={tie.home} side="home" tie={tie} picked={myPick === 'home'} isFav={isFav('home')} t={t} accent={accent} />
      <TeamRow team={tie.away} side="away" tie={tie} picked={myPick === 'away'} isFav={isFav('away')} t={t} accent={accent} />

      {/* Lili's read */}
      <View style={bx.liliRow}>
        <Text style={bx.liliText} numberOfLines={1}>
          🤖 {t.liliPredicts} <Text style={bx.liliScore}>{tie.liliScore.home}–{tie.liliScore.away}</Text>
          {'   ·   '}{koT(t.liliPicks, { team: favName(tie.liliFav) })} <Text style={{ color: accent }}>{liliPct}%</Text>
        </Text>
        {finished && (
          <Text style={[bx.verdict, { color: tie.liliRight ? D.green : D.red }]}>
            {tie.liliRight ? '✓' : '✗'}
          </Text>
        )}
      </View>

      {/* your pick / the game */}
      {tie.home && tie.away ? (
        finished ? (
          <View style={bx.resultRow}>
            <Text style={[bx.resultText, { color: myRight == null ? D.text3 : myRight ? D.green : D.red }]}>
              {myPick ? (myRight ? '✅ ' + t.youGotIt : '❌ ' + t.youMissed) : '— ' + t.yourPick}
            </Text>
            <Text style={bx.advances}>{koT(t.advances, { team: favName(tie.winner!) })}</Text>
          </View>
        ) : (
          <View>
            <Text style={bx.pickPrompt}>{locked ? t.yourPick : t.pickPrompt}</Text>
            <View style={bx.pickRow}>
              <PickBtn side="home" />
              <PickBtn side="away" />
            </View>
          </View>
        )
      ) : null}
    </View>
  );
}

// ─── A round section (spine node + its ties, or a locked rail) ───────────────────
function RoundSection({ group, t }: { group: RoundGroup; t: typeof KNOCKOUT_I18N['EN'] }) {
  const accent = ROUND_COLOR[group.round];
  const label = t.rounds[group.round];
  const empty = group.ties.length === 0;

  return (
    <View style={bx.section}>
      <View style={bx.spineRow}>
        <View style={[bx.node, { borderColor: accent, backgroundColor: empty ? 'transparent' : accent }]} />
        <Text style={[bx.roundLabel, { color: accent }]}>{label}</Text>
        {!empty && <Text style={bx.roundCount}>{group.ties.length}</Text>}
      </View>

      <View style={bx.sectionBody}>
        <View style={[bx.spine, { backgroundColor: accent + '33' }]} />
        <View style={{ flex: 1, gap: 10 }}>
          {empty ? (
            <View style={bx.locked}>
              <Text style={bx.lockedText}>🔒 {t.locked}</Text>
            </View>
          ) : (
            group.ties.map((tie) => <TieCard key={tie.fixture.id} tie={tie} accent={accent} t={t} />)
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────────
export default function KnockoutBracketScreen() {
  const { lang } = useLanguage();
  const t = KNOCKOUT_I18N[lang] ?? KNOCKOUT_I18N.EN;
  const liveResults = useLiveResults();
  const rounds = useMemo(() => buildRoadToFinal(liveResults), [liveResults]);
  const rec = liliKnockoutRecord(rounds);

  return (
    <SafeAreaView style={bx.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: t.title }} />
      <ScrollView contentContainerStyle={bx.scroll} showsVerticalScrollIndicator={false}>
        <Text style={bx.title}>🏆 {t.title}</Text>
        <Text style={bx.intro}>{t.intro}</Text>
        {rec.total > 0 && (
          <Text style={bx.record}>🤖 {koT(t.record, { c: rec.correct, t: rec.total })}</Text>
        )}

        <View style={{ marginTop: 14 }}>
          {rounds.map((g) => <RoundSection key={g.round} group={g} t={t} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const bx = StyleSheet.create({
  screen: { flex: 1, backgroundColor: D.bg },
  scroll: { padding: 14, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '900', color: D.text1, letterSpacing: 0.3 },
  intro: { fontSize: 13, color: D.text2, marginTop: 4, lineHeight: 18 },
  record: { fontSize: 12, color: D.gold, fontWeight: '700', marginTop: 8 },

  section: { marginBottom: 6 },
  spineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 6 },
  node: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginLeft: 3 },
  roundLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  roundCount: { fontSize: 11, color: D.text3, fontWeight: '700' },
  sectionBody: { flexDirection: 'row' },
  spine: { width: 2, marginLeft: 9, marginRight: 13, borderRadius: 1 },

  locked: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: D.border, borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.02)' },
  lockedText: { fontSize: 12, color: D.text3, fontStyle: 'italic' },

  card: { backgroundColor: D.card, borderRadius: 14, borderWidth: 1, borderColor: D.border, borderLeftWidth: 3, padding: 12, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meta: { flex: 1, fontSize: 10.5, color: D.text3, fontWeight: '600' },
  chip: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },

  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 8 },
  flag: { fontSize: 22 },
  teamName: { fontSize: 15, fontWeight: '800', color: D.text1 },
  liliDot: { fontSize: 11 },
  formLine: { fontSize: 10.5, color: D.text2, marginTop: 1 },
  strength: { color: D.text3 },
  goals: { fontSize: 20, fontWeight: '900', minWidth: 22, textAlign: 'center' },
  dim: { color: D.text3, opacity: 0.6 },

  liliRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: D.border, paddingTop: 8 },
  liliText: { flex: 1, fontSize: 11.5, color: D.text2 },
  liliScore: { color: D.text1, fontWeight: '800' },
  verdict: { fontSize: 14, fontWeight: '900' },

  pickPrompt: { fontSize: 10.5, color: D.text3, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  pickRow: { flexDirection: 'row', gap: 8 },
  pickBtn: { flex: 1, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: D.border, backgroundColor: D.cardHi, alignItems: 'center' },
  pickBtnLocked: { opacity: 0.85 },
  pickBtnText: { fontSize: 12.5, fontWeight: '700', color: D.text2 },

  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultText: { fontSize: 12.5, fontWeight: '800' },
  advances: { fontSize: 11, color: D.text3, fontWeight: '600' },
});
