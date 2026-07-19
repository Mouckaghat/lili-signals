import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildDiamonds, type TeamDiamond, type PlayerDiamond } from '../lib/diamondsModel';
import { useLiveResults } from '../lib/useLiveResults';
import { useLanguage } from '../contexts/LanguageContext';
import Brand from '../components/Brand';

const D = {
  bg:     '#04060D',
  panel:  '#0A1322',
  panel2: '#0F1C33',
  border: 'rgba(86,140,224,0.16)',
  blue:   '#2E7CFF',
  gold:   '#F2C24B',
  green:  '#33C26B',
  purple: '#9A52FF',
  cyan:   '#38E1D6',
  text1:  '#F1F5FF',
  text2:  '#8DA2C8',
  text3:  '#52668C',
};

// Localised chrome (EN + FR to match the diamond prose; others fall back to EN).
const T = {
  EN: {
    title: 'DIAMONDS OF THE TOURNAMENT',
    intro: "Data is a snapshot — but a World Cup is a story. These are the players and teams this tournament discovered: the breakouts, the smaller nations who refused their seeding, the names a whole planet now knows. I've watched hundreds of these games, and these are the ones I'll remember.",
    players: 'THE BREAKOUTS · PLAYERS THE TOURNAMENT MADE',
    teams: 'THE OVERACHIEVERS · TEAMS WHO REFUSED THEIR SEED',
    playersEmpty: 'The breakout stars will appear here as the tournament unfolds.',
    teamsEmpty: 'Overachieving teams will appear here as the knockouts unfold.',
    seed: 'Pre-tournament seed', reached: 'Reached', foot: 'Every diamond derived from real data — a team\'s strength seed vs its result, a player\'s real goals, assists and age. Lili\'s storytelling, never fabricated.',
  },
  FR: {
    title: 'LES DIAMANTS DU TOURNOI',
    intro: "La data est un instantané — mais une Coupe du monde, c'est une histoire. Voici les joueurs et les équipes que ce tournoi a révélés : les révélations, les nations modestes qui ont refusé leur classement, les noms que la planète entière connaît désormais. J'ai regardé des centaines de ces matchs, et voici ceux que je retiendrai.",
    players: 'LES RÉVÉLATIONS · LES JOUEURS RÉVÉLÉS PAR LE TOURNOI',
    teams: 'LES SURPRISES · LES ÉQUIPES QUI ONT REFUSÉ LEUR RANG',
    playersEmpty: 'Les révélations apparaîtront ici au fil du tournoi.',
    teamsEmpty: 'Les équipes surprises apparaîtront ici au fil des phases finales.',
    seed: 'Classement pré-tournoi', reached: 'A atteint', foot: 'Chaque diamant vient de données réelles — le rang de force d\'une équipe vs son résultat, les vrais buts, passes et l\'âge d\'un joueur. Le récit de Lili, jamais inventé.',
  },
};

const roundLabelEN: Record<string, { EN: string; FR: string }> = {
  R32: { EN: 'Round of 32', FR: '16es de finale' },
  R16: { EN: 'Round of 16', FR: '8es de finale' },
  QF:  { EN: 'Quarter-finals', FR: 'Quarts de finale' },
  SF:  { EN: 'Semi-finals', FR: 'Demi-finales' },
  '3RD': { EN: 'Third place', FR: '3e place' },
  F:   { EN: 'Final', FR: 'Finale' },
};

export default function DiamondsScreen() {
  const insets = useSafeAreaInsets();
  const results = useLiveResults();
  const { lang } = useLanguage();
  const voice = lang === 'FR' ? 'FR' : 'EN';
  const tx = T[voice];
  const { teams, players } = useMemo(() => buildDiamonds(results, voice), [results, voice]);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
      {/* Hero */}
      <View style={s.hero}>
        <Text style={s.heroKicker}>💎  WORLDCUPILOU</Text>
        <Text style={s.heroTitle}>{tx.title}</Text>
        <Text style={s.heroIntro}>🦞  {tx.intro}</Text>
      </View>

      {/* Players */}
      <Text style={s.sectionTitle}>{tx.players}</Text>
      {players.length > 0 ? players.map((p, i) => <PlayerCard key={p.name + p.team} p={p} rank={i + 1} />)
        : <Text style={s.empty}>{tx.playersEmpty}</Text>}

      {/* Teams */}
      <Text style={[s.sectionTitle, { marginTop: 18 }]}>{tx.teams}</Text>
      {teams.length > 0 ? teams.map((t, i) => <TeamCard key={t.team} t={t} rank={i + 1} tx={tx} voice={voice} />)
        : <Text style={s.empty}>{tx.teamsEmpty}</Text>}

      <View style={s.footer}>
        <Brand tone="dim" />
        <Text style={s.foot}>{tx.foot}</Text>
      </View>
    </ScrollView>
  );
}

function PlayerCard({ p, rank }: { p: PlayerDiamond; rank: number }) {
  return (
    <View style={[s.card, { borderLeftColor: p.young ? D.cyan : D.gold, borderLeftWidth: 3 }]}>
      <View style={s.cardHead}>
        <Text style={s.cardFlag}>{p.flag}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.cardName} numberOfLines={1}>{p.name}</Text>
          <Text style={s.cardSub} numberOfLines={1}>
            {p.team}{p.club ? ` · ${p.club}` : ''}{p.age != null ? ` · ${p.age}y` : ''}
          </Text>
        </View>
        <View style={s.statPills}>
          {p.goals > 0 && <Text style={[s.pill, { color: D.gold }]}>⚽ {p.goals}</Text>}
          {p.assists > 0 && <Text style={[s.pill, { color: D.blue }]}>🅰 {p.assists}</Text>}
          {p.young && <Text style={[s.pill, { color: D.cyan }]}>💎</Text>}
        </View>
      </View>
      <Text style={s.cardStory}>{p.story}</Text>
    </View>
  );
}

function TeamCard({ t, rank, tx, voice }: { t: TeamDiamond; rank: number; tx: typeof T['EN']; voice: 'EN' | 'FR' }) {
  const reached = t.champion
    ? (voice === 'FR' ? 'Champion' : 'Champions')
    : t.reached ? (roundLabelEN[t.reached]?.[voice] ?? t.reached) : '—';
  return (
    <View style={[s.card, { borderLeftColor: D.green, borderLeftWidth: 3 }]}>
      <View style={s.cardHead}>
        <Text style={s.cardFlag}>{t.flag}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.cardName} numberOfLines={1}>{t.team}</Text>
          <Text style={s.cardSub} numberOfLines={1}>{t.federation}</Text>
        </View>
        <View style={s.teamMeta}>
          <Text style={s.teamSeed}>#{t.strengthRank}<Text style={s.teamSeedUnit}> {voice === 'FR' ? 'rang' : 'seed'}</Text></Text>
          <Text style={[s.teamReached, t.champion && { color: D.gold }]}>{reached}</Text>
        </View>
      </View>
      <Text style={s.cardStory}>{t.story}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: D.bg },

  hero: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  heroKicker: { color: D.gold, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  heroTitle: { color: D.text1, fontSize: 26, fontWeight: '900', letterSpacing: 0.5, marginTop: 6, lineHeight: 30 },
  heroIntro: { color: D.text2, fontSize: 13, lineHeight: 20, marginTop: 12, fontStyle: 'italic' },

  sectionTitle: { color: D.text3, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginHorizontal: 16, marginTop: 14, marginBottom: 8 },

  card: { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 12, marginHorizontal: 14, marginBottom: 9 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardFlag: { fontSize: 30 },
  cardName: { color: D.text1, fontSize: 16, fontWeight: '900' },
  cardSub: { color: D.text2, fontSize: 11, marginTop: 1 },
  cardStory: { color: D.text1, fontSize: 13, lineHeight: 19 },

  statPills: { alignItems: 'flex-end', gap: 3 },
  pill: { fontSize: 12, fontWeight: '800' },

  teamMeta: { alignItems: 'flex-end' },
  teamSeed: { color: D.text2, fontSize: 15, fontWeight: '900' },
  teamSeedUnit: { color: D.text3, fontSize: 9, fontWeight: '700' },
  teamReached: { color: D.green, fontSize: 11, fontWeight: '800', marginTop: 2 },

  empty: { color: D.text3, fontSize: 12, marginHorizontal: 16, marginVertical: 6, fontStyle: 'italic' },

  footer: { alignItems: 'center', marginTop: 18, paddingHorizontal: 16, gap: 6 },
  foot: { color: D.text3, fontSize: 9, textAlign: 'center', fontStyle: 'italic', lineHeight: 13 },
});
