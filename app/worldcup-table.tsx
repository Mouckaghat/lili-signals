import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FED_BG, FED_COLOR, getGroupTeams, getTeamFixtures, WC_FIXTURES, WC_TEAMS, type WCFixture, type WCTeam } from '../lib/wcData';
import { type FixtureResult } from '../lib/fixtureResultsData';
import { useLiveResults } from '../lib/useLiveResults';
import { GROUP_STANDINGS } from '../lib/standingsData';
import FeatureIntro from '../components/FeatureIntro';
import MatchTimelineSection from '../components/MatchTimelineSection';
import { playerByPath } from '../lib/playerXI';
import { useLanguage } from '../contexts/LanguageContext';
import { MARKET_I18N } from '../lib/marketI18n';
import { KNOCKOUT_I18N } from '../lib/knockoutI18n';
import { WC_KNOCKOUT } from '../lib/knockoutData';

// ─── Live result overlay ──────────────────────────────────────────────────────

type LiveResults = Record<string, FixtureResult>;

function withResult(fixture: WCFixture, results: LiveResults): WCFixture {
  const r = results[`${fixture.home}|${fixture.away}`];
  if (!r) return fixture;
  return {
    ...fixture,
    status:    r.status,
    homeScore: r.homeScore ?? undefined,
    awayScore: r.awayScore ?? undefined,
  };
}

// ─── Status logic ─────────────────────────────────────────────────────────────

type Status = 'qualified' | 'alive' | 'at-risk' | 'eliminated';

const STATUS_COLOR: Record<Status, string> = {
  qualified: '#34C759',
  alive:     '#4A9EFF',
  'at-risk': '#FF9F0A',
  eliminated:'#FF3B30',
};
const STATUS_BG: Record<Status, string> = {
  qualified: 'rgba(52,199,89,0.12)',
  alive:     'rgba(74,158,255,0.10)',
  'at-risk': 'rgba(255,159,10,0.12)',
  eliminated:'rgba(255,59,48,0.12)',
};
const STATUS_LABEL: Record<Status, string> = {
  qualified: 'Qualified',
  alive:     'Still Alive',
  'at-risk': 'At Risk',
  eliminated:'Eliminated',
};

function deriveStatus(rank: number, pts: number, played: number, maxPts: number): Status {
  if (played === 0) return 'alive';
  if (rank <= 2) return pts >= 4 ? 'qualified' : 'alive';
  if (rank === 3) return pts >= 4 ? 'alive' : 'at-risk';
  if (maxPts < 3) return 'eliminated';
  return 'at-risk';
}

// ─── Form dots ────────────────────────────────────────────────────────────────

type FormChar = 'W' | 'D' | 'L' | '–';

function FormDots({ team, groupTeams, liveResults }: { team: WCTeam; groupTeams: WCTeam[]; liveResults: LiveResults }) {
  const fixtures = getTeamFixtures(team.name).map((f) => withResult(f, liveResults)).filter((f) => f.status === 'FINISHED');
  const results: FormChar[] = fixtures.map((f) => {
    const isHome = f.home === team.name;
    const my = isHome ? f.homeScore! : f.awayScore!;
    const opp = isHome ? f.awayScore! : f.homeScore!;
    if (my > opp) return 'W';
    if (my < opp) return 'L';
    return 'D';
  });

  // Pad to 3 slots
  while (results.length < 3) results.push('–');

  return (
    <View style={f.row}>
      {results.map((r, i) => (
        <View
          key={i}
          style={[
            f.dot,
            r === 'W' && f.win,
            r === 'D' && f.draw,
            r === 'L' && f.loss,
            r === '–' && f.empty,
          ]}
        >
          <Text style={[f.dotText, r === '–' && { color: '#C7C7CC' }]}>{r}</Text>
        </View>
      ))}
    </View>
  );
}

const f = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  win: { backgroundColor: '#34C759' },
  draw: { backgroundColor: '#FF9F0A' },
  loss: { backgroundColor: '#FF3B30' },
  empty: { backgroundColor: '#0B1426' },
  dotText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },
});

// ─── Standing row ─────────────────────────────────────────────────────────────

interface StandingEntry {
  team: WCTeam;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  rank: number;
  status: Status;
}

function computeStandings(group: string, liveResults: LiveResults): StandingEntry[] {
  const teams = getGroupTeams(group);
  const fixtures = teams.flatMap((t) => getTeamFixtures(t.name).map((f) => withResult(f, liveResults)).filter((f) => f.status === 'FINISHED'));
  const seen = new Set<string>();
  const uniq = fixtures.filter((f) => { if (seen.has(f.id)) return false; seen.add(f.id); return true; });

  const stats: Record<string, Omit<StandingEntry, 'rank' | 'status'>> = {};
  teams.forEach((t) => {
    stats[t.name] = { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  });

  uniq.forEach((f) => {
    if (f.homeScore === undefined) return;
    const hg = f.homeScore, ag = f.awayScore!;
    const hs = stats[f.home], as_ = stats[f.away];
    if (!hs || !as_) return;
    hs.played++; as_.played++;
    hs.gf += hg; hs.ga += ag; hs.gd += hg - ag;
    as_.gf += ag; as_.ga += hg; as_.gd += ag - hg;
    if (hg > ag) { hs.won++; hs.pts += 3; as_.lost++; }
    else if (hg < ag) { as_.won++; as_.pts += 3; hs.lost++; }
    else { hs.drawn++; hs.pts++; as_.drawn++; as_.pts++; }
  });

  const sorted = Object.values(stats).sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name)
  );

  return sorted.map((s, i) => {
    const rank = i + 1;
    const remaining = (3 - s.played) * 3;
    return { ...s, rank, status: deriveStatus(rank, s.pts, s.played, s.pts + remaining) };
  });
}

// ─── API standings (preferred when live data is available) ────────────────────

const STATUS_MAP: Record<string, Status> = {
  QUALIFIED:  'qualified',
  ALIVE:      'alive',
  'AT-RISK':  'at-risk',
  ELIMINATED: 'eliminated',
  UPCOMING:   'alive',
};

function getApiStandings(group: string): StandingEntry[] {
  // Defensive de-dupe by team: if the baked feed ever carries duplicate rows
  // (api-football's /standings has repeated group sub-arrays — see
  // sync-standings.ts), keep one row per team so the table can never render a
  // side twice, and so the played-count selector below isn't inflated.
  const seen = new Set<string>();
  return GROUP_STANDINGS
    .filter((s) => s.group === group || s.group.endsWith(group))
    .filter((s) => { if (seen.has(s.team)) return false; seen.add(s.team); return true; })
    .sort((a, b) => a.rank - b.rank)
    .map((s) => {
      const team = WC_TEAMS.find((t) => t.name === s.team);
      if (!team) return null;
      return {
        team,
        played: s.played,
        won:    s.won,
        drawn:  s.drawn,
        lost:   s.lost,
        gf:     s.gf,
        ga:     s.ga,
        gd:     s.gd,
        pts:    s.pts,
        rank:   s.rank,
        status: STATUS_MAP[s.status] ?? 'alive',
      };
    })
    .filter((s): s is StandingEntry => s !== null);
}

function GroupTable({ group, liveResults }: { group: string; liveResults: LiveResults }) {
  const { i18n } = useLanguage();
  // Prefer the table computed from LIVE results — it rides the fresh
  // /api/fixture-results overlay (~15-20s), so Group A moves the instant a
  // result does, with no git-bot commit + Vercel redeploy in the loop. The
  // baked GROUP_STANDINGS (refreshed every ~4h, deploy-gated) is only used when
  // it somehow reflects more played games than the live feed (defensive — e.g.
  // a result api-football has in /standings but not yet in /fixtures).
  const live  = computeStandings(group, liveResults);
  const baked = getApiStandings(group);
  const played = (rows: StandingEntry[]) => rows.reduce((n, e) => n + e.played, 0);
  const entries = played(live) >= played(baked) ? live : baked;
  const groupTeams = getGroupTeams(group);

  return (
    <View style={t.card}>
      {/* Header */}
      <View style={t.groupHeader}>
        <Text style={t.groupTitle}>{i18n.group} {group}</Text>
        <View style={t.groupFeds}>
          {[...new Set(groupTeams.map((t) => t.federation))].map((fed) => (
            <View key={fed} style={[t.fedBadge, { backgroundColor: FED_BG[fed] }]}>
              <Text style={[t.fedText, { color: FED_COLOR[fed] }]}>{fed}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Column headers */}
      <View style={t.colHeader}>
        <Text style={[t.col, t.rankCol]}>#</Text>
        <Text style={[t.col, t.teamCol]}>{i18n.colTeam}</Text>
        <Text style={t.col}>P</Text>
        <Text style={t.col}>W</Text>
        <Text style={t.col}>D</Text>
        <Text style={t.col}>L</Text>
        <Text style={t.col}>GF</Text>
        <Text style={t.col}>GA</Text>
        <Text style={t.col}>GD</Text>
        <Text style={[t.col, t.ptsCol]}>Pts</Text>
        <Text style={[t.col, t.formCol]}>{i18n.colForm}</Text>
      </View>

      {entries.map((e, idx) => {
        const qualLine = idx === 1; // separator after rank 2
        return (
          <View key={e.team.name}>
            {qualLine && (
              <View style={t.qualLine}>
                <Text style={t.qualLineText}>{i18n.autoQualLine}</Text>
              </View>
            )}
            <View style={[t.row, idx % 2 === 1 && t.rowAlt]}>
              <View style={[t.rankDot, { backgroundColor: STATUS_COLOR[e.status] }]}>
                <Text style={t.rankDotText}>{e.rank}</Text>
              </View>
              <View style={t.teamBlock}>
                <Text style={t.flag}>{e.team.flag}</Text>
                <Text style={t.teamName} numberOfLines={1}>{e.team.name}</Text>
              </View>
              <Text style={t.col}>{e.played}</Text>
              <Text style={t.col}>{e.won}</Text>
              <Text style={t.col}>{e.drawn}</Text>
              <Text style={t.col}>{e.lost}</Text>
              <Text style={t.col}>{e.gf}</Text>
              <Text style={t.col}>{e.ga}</Text>
              <Text style={[t.col, e.gd > 0 && t.gdPos, e.gd < 0 && t.gdNeg]}>
                {e.gd > 0 ? `+${e.gd}` : e.gd}
              </Text>
              <Text style={[t.col, t.ptsCol, t.ptsText]}>{e.pts}</Text>
              <View style={[t.col, t.formCol, { alignItems: 'center' }]}>
                <FormDots team={e.team} groupTeams={groupTeams} liveResults={liveResults} />
              </View>
            </View>
          </View>
        );
      })}

      {/* Status row */}
      <View style={t.statusRow}>
        {entries.map((e) => (
          <View key={e.team.name} style={[t.statusBadge, { backgroundColor: STATUS_BG[e.status] }]}>
            <Text style={[t.statusText, { color: STATUS_COLOR[e.status] }]}>
              {{ qualified: i18n.qualified, alive: i18n.stillAlive, 'at-risk': i18n.atRisk, eliminated: i18n.eliminated }[e.status]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Pool Games hero ──────────────────────────────────────────────────────────
// The "story" framing for the group-stage view: a cinematic header that sits
// above all 12 group tables + the group-stage timeline, so the page reads like
// "how teams reached the knockouts" rather than just a table. The progress stat
// is derived from existing committed fixtures + the live results overlay (no new
// data model) — an honest count of FINISHED group-stage games.
function PoolHero({ liveResults }: { liveResults: LiveResults }) {
  const { i18n } = useLanguage();
  const total  = WC_FIXTURES.length;
  const played = WC_FIXTURES.filter((fx) => {
    const r = liveResults[`${fx.home}|${fx.away}`];
    return (r?.status ?? fx.status) === 'FINISHED';
  }).length;
  return (
    <View style={ph.card}>
      <Text style={ph.kicker}>⚽  {i18n.poolGames}</Text>
      <Text style={ph.tagline}>{i18n.poolGamesTagline}</Text>
      <View style={ph.statRow}>
        <Text style={ph.stat}>{played}<Text style={ph.statDim}> / {total}</Text></Text>
        <Text style={ph.statLabel}>{i18n.poolGamesPlayed}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const GROUPS = 'ABCDEFGHIJKL'.split('');
const POOL = 'POOL'; // sentinel for the "Pool Games" pill (not a real group letter)

export default function WorldCupTableScreen() {
  const [launched, setLaunched] = useState(false);
  const { i18n, lang } = useLanguage();
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const liveResults = useLiveResults();

  // "Pool Games" and a single group both render group tables; Pool Games (and the
  // "All" default) show all 12 groups, a specific letter shows just that one.
  const isPool = selectedGroup === POOL;
  const displayGroups = isPool || selectedGroup === null ? GROUPS : [selectedGroup];

  if (!launched) return (
    <>
      <Stack.Screen options={{ title: i18n.titleWorldTable, headerShown: false }} />
      <FeatureIntro player={playerByPath('/worldcup-table')!} onLaunch={() => setLaunched(true)} />
    </>
  );

  return (
    <>
      <Stack.Screen options={{ title: i18n.titleWorldTable, headerShown: true }} />
      <SafeAreaView style={st.safe} edges={['bottom']}>
      {/* Group filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={st.pillScroll}
        contentContainerStyle={st.pillContent}
      >
        <TouchableOpacity
          style={[st.pill, selectedGroup === null && st.pillActive]}
          onPress={() => setSelectedGroup(null)}
        >
          <Text style={[st.pillText, selectedGroup === null && st.pillTextActive]}>{i18n.all}</Text>
        </TouchableOpacity>
        {GROUPS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[st.pill, selectedGroup === g && st.pillActive]}
            onPress={() => setSelectedGroup(selectedGroup === g ? null : g)}
          >
            <Text style={[st.pillText, selectedGroup === g && st.pillTextActive]}>{i18n.group} {g}</Text>
          </TouchableOpacity>
        ))}

        {/* Pool Games — the curated group-stage story (all tables + group-stage
            timeline, no knockouts). Placed right before Road to the Final. */}
        <TouchableOpacity
          style={[st.pill, st.pillPool, isPool && st.pillPoolActive]}
          onPress={() => setSelectedGroup(isPool ? null : POOL)}
        >
          <Text style={[st.pillText, st.pillPoolText, isPool && st.pillTextActive]}>⚽ {i18n.poolGames}</Text>
        </TouchableOpacity>

        {/* Road to the Final — nav shortcut to the knockout bracket (separate
            screen). Only shown once the bracket has seeded. */}
        {WC_KNOCKOUT.length > 0 && (
          <TouchableOpacity
            style={[st.pill, st.pillBracket]}
            onPress={() => router.push('/knockout-bracket' as any)}
          >
            <Text style={[st.pillText, st.pillBracketText]}>🏆 {(KNOCKOUT_I18N[lang] ?? KNOCKOUT_I18N.EN).title}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Banner */}
      <View style={st.banner}>
        <Text style={st.bannerEmoji}>🏆</Text>
        <View>
          <Text style={st.bannerTitle}>{i18n.wcBannerTitle}</Text>
          <Text style={st.bannerSub}>{i18n.wcBannerSub}</Text>
        </View>
      </View>

      {/* Entry point: Lili vs The Market (pre-match odds vs Lili's model) */}
      <TouchableOpacity style={st.marketLink} onPress={() => router.push('/lili-vs-market' as any)} activeOpacity={0.8}>
        <Text style={st.marketLinkText}>📈  {(MARKET_I18N[lang] ?? MARKET_I18N.EN).title}</Text>
        <Text style={st.marketLinkArrow}>→</Text>
      </TouchableOpacity>

      {/* Entry point: Road to the Final — the knockout bracket + pick-the-winner
          game. Only shown once the bracket has seeded (real fixtures exist). */}
      {WC_KNOCKOUT.length > 0 && (
        <TouchableOpacity style={st.bracketLink} onPress={() => router.push('/knockout-bracket' as any)} activeOpacity={0.8}>
          <Text style={st.bracketLinkText}>🏆  {(KNOCKOUT_I18N[lang] ?? KNOCKOUT_I18N.EN).title}</Text>
          <Text style={st.bracketLinkArrow}>→</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={st.scroll} contentContainerStyle={st.content}>
        {isPool && <PoolHero liveResults={liveResults} />}
        {displayGroups.map((g) => (
          <GroupTable key={g} group={g} liveResults={liveResults} />
        ))}
        {/* Pool Games shows the group-stage timeline only (knockouts live in Road
            to the Final). All / single-group keep their existing behaviour. */}
        <MatchTimelineSection group={isPool ? null : selectedGroup} includeKnockouts={!isPool} />
        <Text style={st.footNote}>{i18n.tableFootnote}</Text>
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const t = StyleSheet.create({
  card: {
    backgroundColor: '#0E1933',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(80,140,255,0.10)',
    gap: 10,
  },
  groupTitle: { fontSize: 15, fontWeight: '800', color: '#EEF2FF', flex: 1 },
  groupFeds: { flexDirection: 'row', gap: 6 },
  fedBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  fedText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#0B1426',
  },
  col: {
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    color: '#7A90B8',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rankCol: { flex: 0.5 },
  teamCol: { flex: 3, textAlign: 'left' },
  ptsCol: { flex: 1.2 },
  formCol: { flex: 2.2, textAlign: 'left' },

  qualLine: {
    backgroundColor: 'rgba(52,199,89,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#34C759',
  },
  qualLineText: { fontSize: 9, color: '#34C759', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  rowAlt: { backgroundColor: 'rgba(80,140,255,0.04)' },

  rankDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    flex: 0.5,
  },
  rankDotText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },

  teamBlock: { flex: 3, flexDirection: 'row', alignItems: 'center', gap: 6 },
  flag: { fontSize: 18 },
  teamName: { fontSize: 12, fontWeight: '600', color: '#EEF2FF', flex: 1 },

  gdPos: { color: '#34C759', fontWeight: '700' },
  gdNeg: { color: '#FF3B30', fontWeight: '700' },
  ptsText: { fontWeight: '800', color: '#4A9EFF', fontSize: 13 },

  statusRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(80,140,255,0.10)',
    backgroundColor: '#0B1426',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
});

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050810' },
  pillScroll: { flexGrow: 0 },
  pillContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#0B1426' },
  pillActive: { backgroundColor: '#4A9EFF' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#7A90B8' },
  pillTextActive: { color: '#FFFFFF' },
  // Pool Games pill — blue-tinted, fills solid blue when active.
  pillPool: { backgroundColor: 'rgba(74,158,255,0.10)', borderWidth: 1, borderColor: 'rgba(74,158,255,0.35)' },
  pillPoolActive: { backgroundColor: '#4A9EFF', borderColor: '#4A9EFF' },
  pillPoolText: { color: '#4A9EFF' },
  // Road to the Final pill — gold nav shortcut to the bracket screen.
  pillBracket: { backgroundColor: 'rgba(245,196,81,0.10)', borderWidth: 1, borderColor: 'rgba(245,196,81,0.35)' },
  pillBracketText: { color: '#F5C451' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0E1933',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(80,140,255,0.10)',
  },
  bannerEmoji: { fontSize: 28 },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#EEF2FF' },
  bannerSub: { fontSize: 11, color: '#7A90B8', marginTop: 2 },
  marketLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(52,211,153,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.28)',
  },
  marketLinkText: { fontSize: 13, fontWeight: '700', color: '#34D399' },
  marketLinkArrow: { fontSize: 15, fontWeight: '700', color: '#34D399' },
  bracketLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(245,196,81,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,196,81,0.30)',
  },
  bracketLinkText: { fontSize: 13, fontWeight: '700', color: '#F5C451' },
  bracketLinkArrow: { fontSize: 15, fontWeight: '700', color: '#F5C451' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  footNote: {
    fontSize: 11,
    color: '#374F7A',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

const ph = StyleSheet.create({
  card: {
    backgroundColor: '#0E1933',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.25)',
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4A9EFF',
  },
  kicker: { fontSize: 20, fontWeight: '800', color: '#EEF2FF', letterSpacing: 0.2 },
  tagline: { fontSize: 13, color: '#9DB2D8', marginTop: 6, lineHeight: 19 },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14 },
  stat: { fontSize: 26, fontWeight: '800', color: '#4A9EFF' },
  statDim: { fontSize: 16, fontWeight: '700', color: '#374F7A' },
  statLabel: { fontSize: 11, color: '#7A90B8', textTransform: 'uppercase', letterSpacing: 0.4, flex: 1 },
});
