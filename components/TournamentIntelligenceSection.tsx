import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTournamentIntelligence, type GoalDetail, type ScorerEntry, type TeamRankEntry } from '../lib/useTournamentIntelligence';
import { useLineups } from '../lib/useLineups';
import type { MatchLineup } from '../lib/lineupData';
import { TEAM_FORMATIONS_BASELINE } from '../lib/teamFormationsBaseline';
import { FIXTURE_RESULTS } from '../lib/fixtureResultsData';
import type { FixtureResult } from '../lib/fixtureResultsData';
import { WC_TEAMS, TEAM_COACHES } from '../lib/wcData';
import { useLanguage } from '../contexts/LanguageContext';
import type { I18n } from '../lib/i18n';

// ─── Design tokens (matches lili-route-intelligence palette) ─────────────────

const D = {
  bg:      '#050810',
  surface: '#0B1426',
  card:    '#0E1933',
  border:  'rgba(80,140,255,0.10)',
  blue:    '#4A9EFF',
  cyan:    '#00C8FF',
  orange:  '#FF7B35',
  green:   '#34D399',
  signal:  '#00E5A0',
  gold:    '#D4A520',
  red:     '#FF5B5B',
  yellow:  '#FBBF24',
  text1:   '#EEF2FF',
  text2:   '#7A90B8',
  text3:   '#374F7A',
  sep:     'rgba(80,140,255,0.12)',
};

// ─── Tabs config ──────────────────────────────────────────────────────────────

type TabKey = 'scorers' | 'performance' | 'cards' | 'danger' | 'surprise' | 'tactics';

function getTabs(i18n: I18n): Array<{ key: TabKey; label: string; icon: string; color: string }> {
  return [
    { key: 'scorers',     label: i18n.tabScorers, icon: '⚽',  color: D.blue   },
    { key: 'performance', label: 'PERF',           icon: '📊',  color: D.orange },
    { key: 'cards',       label: i18n.tabCards,    icon: '🟨🟥', color: D.yellow },
    { key: 'danger',      label: i18n.tabDanger,   icon: '💀',  color: D.red    },
    { key: 'surprise',    label: i18n.tabLili,     icon: '✨',  color: D.signal },
    { key: 'tactics',     label: i18n.tabTactics,  icon: '🧩',  color: D.green  },
  ];
}

// ─── Team → most-used formation map ──────────────────────────────────────────

function buildTeamFormationMap(lineups: MatchLineup[]): Map<string, string> {
  // Start from web-researched baseline so every team always has a formation.
  const map = new Map<string, string>(Object.entries(TEAM_FORMATIONS_BASELINE));

  // Override with live/confirmed data when available (confirmed lineups weighted 2x).
  const counts: Record<string, Record<string, number>> = {};
  for (const lineup of lineups) {
    const [home, away] = lineup.fixtureKey.split('|');
    const w = lineup.confirmed ? 2 : 1;
    const add = (team: string, f: string) => {
      if (!f || f === '?' || f === 'baseline') return;
      counts[team] ??= {};
      counts[team][f] = (counts[team][f] ?? 0) + w;
    };
    add(home, lineup.home.formation);
    add(away, lineup.away.formation);
  }
  for (const [team, formations] of Object.entries(counts)) {
    const best = Object.entries(formations).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (best) map.set(team, best);
  }
  return map;
}

function buildTeamCoachMap(lineups: MatchLineup[]): Map<string, string> {
  // Start from curated static data; confirmed lineup sources override.
  const map = new Map<string, string>(Object.entries(TEAM_COACHES));
  for (const lineup of lineups) {
    if (!lineup.confirmed) continue;
    const [home, away] = lineup.fixtureKey.split('|');
    if (lineup.home.coach) map.set(home, lineup.home.coach);
    if (lineup.away.coach) map.set(away, lineup.away.coach);
  }
  return map;
}

// ─── Tactics helpers ──────────────────────────────────────────────────────────

interface FormationStats {
  formation: string;
  games:     number;
  wins:      number;
  draws:     number;
  losses:    number;
  gf:        number;
  ga:        number;
  teamFlags: string;
  teamNames: string[];
}

function buildFormationStats(lineups: MatchLineup[], teamFlagMap: Map<string, string>): FormationStats[] {
  const map: Record<string, FormationStats> = {};
  const teamsByFormation: Record<string, Set<string>> = {};

  for (const lineup of lineups) {
    const result = FIXTURE_RESULTS[lineup.fixtureKey];
    if (!result || result.status !== 'FINISHED') continue;
    // Once a game is FINISHED, baseline formations are valid historical data

    const [home, away] = lineup.fixtureKey.split('|');
    const hScore = result.homeScore ?? 0;
    const aScore = result.awayScore ?? 0;

    const addResult = (formation: string, teamName: string, gf: number, ga: number) => {
      if (!formation || formation === '?') return;
      if (!map[formation]) map[formation] = { formation, games: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, teamFlags: '', teamNames: [] };
      if (!teamsByFormation[formation]) teamsByFormation[formation] = new Set();
      const s = map[formation];
      s.games++;
      s.gf += gf;
      s.ga += ga;
      if (gf > ga) s.wins++;
      else if (gf === ga) s.draws++;
      else s.losses++;
      teamsByFormation[formation].add(teamName);
    };

    addResult(lineup.home.formation, home, hScore, aScore);
    addResult(lineup.away.formation, away, aScore, hScore);
  }

  for (const [formation, names] of Object.entries(teamsByFormation)) {
    if (map[formation]) {
      const namesArr = Array.from(names);
      map[formation].teamFlags = namesArr.map((n) => teamFlagMap.get(n) ?? '🏳').join('');
      map[formation].teamNames = namesArr;
    }
  }

  return Object.values(map)
    .filter((s) => s.games >= 1)
    .sort((a, b) => {
      const rateA = a.wins / a.games;
      const rateB = b.wins / b.games;
      return rateB !== rateA ? rateB - rateA : b.games - a.games;
    });
}

// ─── Tactics tab UI ───────────────────────────────────────────────────────────

function TacticsTab({ lineups, teamFlagMap, i18n }: { lineups: MatchLineup[]; teamFlagMap: Map<string, string>; i18n: I18n }) {
  const stats = buildFormationStats(lineups, teamFlagMap);
  const [hoveredFormation, setHoveredFormation] = useState<string | null>(null);

  if (stats.length === 0) {
    return (
      <View style={tc.empty}>
        <Text style={tc.emptyIcon}>🧩</Text>
        <Text style={tc.emptyText}>{i18n.tacNoData}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 2 }}>
      {/* Column headers */}
      <View style={tc.headerRow}>
        <Text style={[tc.colRank, tc.colHdr]}>#</Text>
        <Text style={[tc.colFormation, tc.colHdr]}>{i18n.tacFormation}</Text>
        <Text style={[tc.colCountry, tc.colHdr]}>COUNTRY</Text>
        <Text style={[tc.colStat, tc.colHdr]}>G</Text>
        <Text style={[tc.colStat, tc.colHdr, { color: D.green }]}>W</Text>
        <Text style={[tc.colStat, tc.colHdr, { color: D.text2 }]}>D</Text>
        <Text style={[tc.colStat, tc.colHdr, { color: D.red }]}>L</Text>
        <Text style={[tc.colRate, tc.colHdr]}>{i18n.tacWinRate}</Text>
      </View>

      {stats.map((s, i) => {
        const pct = Math.round((s.wins / s.games) * 100);
        const isHovered = hoveredFormation === s.formation;

        return (
          <View key={s.formation} style={tc.row}>
            <Text style={tc.colRankText}>{i + 1}</Text>
            <Text style={tc.formation}>{s.formation}</Text>
            <Pressable
              style={tc.colCountry}
              onHoverIn={() => setHoveredFormation(s.formation)}
              onHoverOut={() => setHoveredFormation(null)}
            >
              <Text style={tc.flags}>{s.teamFlags || '—'}</Text>
              {isHovered && s.teamNames.length > 0 && (
                <View style={tc.tooltip}>
                  <Text style={tc.tooltipText}>{s.teamNames.join(' · ')}</Text>
                </View>
              )}
            </Pressable>
            <Text style={tc.colStat}>{s.games}</Text>
            <Text style={[tc.colStat, { color: D.green, fontWeight: '700' }]}>{s.wins}</Text>
            <Text style={tc.colStat}>{s.draws}</Text>
            <Text style={[tc.colStat, { color: D.red, fontWeight: '700' }]}>{s.losses}</Text>
            <View style={tc.colRate}>
              <View style={tc.barBg}>
                <View style={[tc.barFill, { width: `${pct}%` as any }]} />
              </View>
              <Text style={tc.pct}>{pct}%</Text>
            </View>
          </View>
        );
      })}

      {/* Confirmed / Predicted legend */}
      <View style={tc.legend}>
        {lineups.some((l) => l.confirmed) && (
          <Text style={tc.legendItem}>
            <Text style={{ color: D.green }}>● </Text>
            <Text>{i18n.tacConfirmed}</Text>
          </Text>
        )}
        {lineups.some((l) => !l.confirmed) && (
          <Text style={tc.legendItem}>
            <Text style={{ color: D.text3 }}>● </Text>
            <Text>{i18n.tacPredicted}</Text>
          </Text>
        )}
      </View>
    </View>
  );
}

const tc = StyleSheet.create({
  empty:        { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyIcon:    { fontSize: 28 },
  emptyText:    { fontSize: 12, color: D.text3, textAlign: 'center' },
  headerRow:    { flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: D.border, marginBottom: 4 },
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(80,140,255,0.04)' },
  colHdr:       { fontSize: 8, fontWeight: '800', color: D.text3, letterSpacing: 0.8 },
  colRank:      { width: 20, textAlign: 'center' },
  colRankText:  { width: 20, textAlign: 'center', fontSize: 12, color: D.text2, fontWeight: '600' },
  colFormation: { flex: 3, paddingRight: 12 },
  colCountry:   { flex: 2, position: 'relative' },
  colStat:      { flex: 1, textAlign: 'center', fontSize: 12, color: D.text2 },
  colRate:      { flex: 3, flexDirection: 'row', alignItems: 'center', gap: 6 },
  formation:    { flex: 3, fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: D.text1, paddingRight: 12 },
  flags:        { fontSize: 15 },
  tooltip: {
    position: 'absolute',
    bottom: 26,
    left: 0,
    backgroundColor: D.surface,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: D.border,
    zIndex: 100,
    minWidth: 90,
  },
  tooltipText:  { fontSize: 10, color: D.text1, fontWeight: '600' },
  barBg:        { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(80,140,255,0.10)', overflow: 'hidden' },
  barFill:      { height: 5, borderRadius: 3, backgroundColor: D.blue },
  pct:          { fontSize: 10, fontWeight: '700', width: 30, textAlign: 'right', color: D.text2 },
  legend:       { flexDirection: 'row', gap: 12, paddingTop: 10, justifyContent: 'flex-end' },
  legendItem:   { fontSize: 9, color: D.text3 },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={sh.wrap}>
      <Text style={sh.title}>{title}</Text>
      <Text style={sh.sub}>{sub}</Text>
    </View>
  );
}

const sh = StyleSheet.create({
  wrap:  { marginBottom: 12, gap: 2 },
  title: { fontSize: 9, fontWeight: '800', color: D.text3, letterSpacing: 1.8 },
  sub:   { fontSize: 11, color: D.text2 },
});

// ─── Scorer row ───────────────────────────────────────────────────────────────

function isBirthday(dob?: string): boolean {
  if (!dob) return false;
  const today = new Date();
  const [, mm, dd] = dob.split('-');
  return today.getMonth() + 1 === parseInt(mm, 10) && today.getDate() === parseInt(dd, 10);
}

function fmtDate(dateStr: string): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [, mm, dd] = dateStr.split('-');
  return `${parseInt(dd, 10)} ${months[parseInt(mm, 10) - 1]}`;
}

function usePulse(count = 3, delay = 0) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 650, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0,  duration: 650, useNativeDriver: true }),
      ]),
      { iterations: count }
    );
    const t = setTimeout(() => a.start(), delay);
    return () => { clearTimeout(t); a.stop(); };
  }, []);
  return scale;
}

function fmtDob(dob: string, months: string[]): string {
  const [, mm, dd] = dob.split('-');
  return `${parseInt(dd, 10)} ${months[parseInt(mm, 10) - 1]} ${dob.slice(0, 4)}`;
}

function ScorerRow({ entry, rank, color, i18n }: { entry: ScorerEntry; rank: number; color: string; i18n: I18n }) {
  const [open, setOpen] = useState<'profile' | 'goals' | null>(null);
  const nameScale  = usePulse(3, 0);
  const badgeScale = usePulse(3, 350);

  const toggle = (type: 'profile' | 'goals') =>
    setOpen(prev => prev === type ? null : type);

  const hasBirthday = isBirthday(entry.dob);
  const wcLabel     = entry.wcCount != null ? i18n.tiWcLabels[(entry.wcCount ?? 1) - 1] : null;
  const staticInfo  = [entry.team, wcLabel, entry.caps != null && `${entry.caps} ${i18n.tiCaps}`]
    .filter(Boolean).join(' · ');

  return (
    <View style={[rw.card, rank === 1 && rw.cardTop]}>
      <View style={rw.rowInner}>
        <Text style={[rw.rank, { color: rank <= 3 ? color : D.text3 }]}>
          {rank <= 3 ? ['①', '②', '③'][rank - 1] : `${rank}`}
        </Text>
        <Text style={rw.flag}>{entry.teamFlag}</Text>
        <View style={rw.nameBlock}>
          <TouchableOpacity onPress={() => toggle('profile')} activeOpacity={0.8}>
            <Animated.View style={{ transform: [{ scale: nameScale }] }}>
              <Text style={rw.name}>
                {entry.name}{hasBirthday ? ' 🎂' : ''}{' '}
                <Text style={rw.expandHint}>{open === 'profile' ? '▲' : '▼'}</Text>
              </Text>
            </Animated.View>
          </TouchableOpacity>
          <Text style={rw.detail}>{staticInfo}</Text>
        </View>
        <TouchableOpacity onPress={() => toggle('goals')} activeOpacity={0.8}>
          <Animated.View style={[rw.badge, { borderColor: `${color}30`, backgroundColor: `${color}10`, transform: [{ scale: badgeScale }] }]}>
            <Text style={[rw.badgeVal, { color }]}>{entry.goals}</Text>
            <Text style={rw.badgeLbl}>{i18n.tiGoals}</Text>
            <Text style={rw.expandHint}>{open === 'goals' ? '▲' : '▼'}</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {open === 'profile' && (
        <View style={rw.expand}>
          {entry.dob && (
            <View style={rw.expandLine}>
              <Text style={rw.expandLabel}>{i18n.tiExpandBorn}</Text>
              <Text style={rw.expandVal}>{fmtDob(entry.dob, i18n.monthsShort)} · {entry.age} {i18n.tiYearsOld}</Text>
            </View>
          )}
          {entry.club && (
            <View style={rw.expandLine}>
              <Text style={rw.expandLabel}>{i18n.tiClub}</Text>
              <Text style={rw.expandVal}>
                {[entry.club, entry.leagueFlag ? `${entry.leagueFlag} ${entry.league}` : entry.league, entry.clubRank != null && `#${entry.clubRank}`].filter(Boolean).join(' · ')}
              </Text>
            </View>
          )}
        </View>
      )}

      {open === 'goals' && entry.goalMinutes && (
        <View style={rw.expand}>
          {(entry.goalMinutes as GoalDetail[]).map((g, i) => (
            <View key={i} style={rw.expandLine}>
              <Text style={rw.expandLabel}>{fmtDate(g.date)}</Text>
              <Text style={rw.expandVal}>{i18n.tiExpandVs} {g.opponent} · </Text>
              <Text style={rw.minutes}>{g.minute}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Team row ─────────────────────────────────────────────────────────────────

function TeamRow({
  entry, rank, color, label, formation, breakdownType, i18n,
}: {
  entry: TeamRankEntry;
  rank: number;
  color: string;
  label: string;
  formation?: string;
  breakdownType?: 'danger' | 'lili';
  i18n: I18n;
}) {
  const [open, setOpen] = useState(false);
  const badgeScale = usePulse(breakdownType ? 3 : 0);
  const bd = entry.breakdown;
  const canExpand = !!breakdownType && !!bd;

  const badge = (
    <Animated.View style={[rw.badge, { borderColor: `${color}30`, backgroundColor: `${color}10`, transform: [{ scale: badgeScale }] }]}>
      <Text style={[rw.badgeVal, { color }]}>{entry.value}</Text>
      <Text style={rw.badgeLbl}>{label}</Text>
      {canExpand && <Text style={rw.expandHint}>{open ? '▲' : '▼'}</Text>}
    </Animated.View>
  );

  return (
    <View style={[rw.card, rank === 1 && rw.cardTop]}>
      <View style={rw.rowInner}>
        <Text style={[rw.rank, { color: rank <= 3 ? color : D.text3 }]}>
          {rank <= 3 ? ['①', '②', '③'][rank - 1] : `${rank}`}
        </Text>
        <Text style={rw.flag}>{entry.flag}</Text>
        <View style={rw.nameBlock}>
          <Text style={rw.name}>{entry.name}</Text>
          {formation && <Text style={rw.formationTag}>{formation}</Text>}
        </View>
        {canExpand
          ? <TouchableOpacity onPress={() => setOpen(o => !o)} activeOpacity={0.8}>{badge}</TouchableOpacity>
          : badge}
      </View>

      {open && canExpand && breakdownType === 'danger' && bd && (
        <View style={rw.expand}>
          <Text style={rw.expandFormula}>{i18n.tiDangerFormula}</Text>
          <View style={rw.expandLine}>
            <Text style={rw.expandLabel}>{i18n.tiDangerGoalsGame}</Text>
            <Text style={rw.expandVal}>{bd.goalRate} {i18n.tiDangerAvg}  ×  w3  = <Text style={{ color: D.red, fontWeight: '700' }}>{bd.goalRateContrib}</Text></Text>
          </View>
          <View style={rw.expandLine}>
            <Text style={rw.expandLabel}>{i18n.tiDangerWinRate}</Text>
            <Text style={rw.expandVal}>{bd.winRate}% {i18n.tiDangerOfPts}  ×  w2  = <Text style={{ color: D.green, fontWeight: '700' }}>{bd.winRateContrib}</Text></Text>
          </View>
          <View style={rw.expandLine}>
            <Text style={rw.expandLabel}>{i18n.tiDangerMargin}</Text>
            <Text style={rw.expandVal}>{bd.margin} {i18n.tiDangerGdGame}  ×  w1.5  = <Text style={{ color: D.blue, fontWeight: '700' }}>{bd.marginContrib}</Text></Text>
          </View>
          <View style={[rw.expandLine, rw.expandSep]}>
            <Text style={rw.expandLabel}>{i18n.tiDangerIndex}</Text>
            <Text style={[rw.expandTotal, { color }]}>{entry.value}</Text>
          </View>
        </View>
      )}

      {open && canExpand && breakdownType === 'lili' && bd && (
        <View style={rw.expand}>
          <View style={rw.expandLine}>
            <Text style={rw.expandLabel}>{i18n.tiLiliStrength}</Text>
            <Text style={rw.expandVal}>{i18n.tiLiliPreRating}: <Text style={{ fontWeight: '700' }}>{bd.strength}</Text></Text>
          </View>
          <View style={rw.expandLine}>
            <Text style={rw.expandLabel}>{i18n.tiLiliExpected}</Text>
            <Text style={rw.expandVal}>{bd.expectedPct}{i18n.tiLiliPtsRate}</Text>
          </View>
          <View style={rw.expandLine}>
            <Text style={rw.expandLabel}>{i18n.tiLiliActual}</Text>
            <Text style={rw.expandVal}>{bd.actualPct}{i18n.tiLiliPtsRate}</Text>
          </View>
          <View style={rw.expandLine}>
            <Text style={rw.expandLabel}>{i18n.tiLiliSurprise}</Text>
            <Text style={[rw.expandVal, { color: D.signal, fontWeight: '700' }]}>+{bd.ptsDelta}</Text>
          </View>
          <View style={rw.expandLine}>
            <Text style={rw.expandLabel}>{i18n.tiLiliGdBonus}</Text>
            <Text style={[rw.expandVal, { color: D.cyan, fontWeight: '700' }]}>+{bd.gdBonus}</Text>
          </View>
          <View style={[rw.expandLine, rw.expandSep]}>
            <Text style={rw.expandLabel}>{i18n.tiLiliIndex}</Text>
            <Text style={[rw.expandTotal, { color }]}>{entry.value}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const rw = StyleSheet.create({
  // Legacy — used by CardRow only
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(80,140,255,0.06)',
  },
  rowFirst: { paddingTop: 0 },
  // Card layout — used by Scorer, Team, Performance rows
  card:     { borderBottomWidth: 1, borderBottomColor: 'rgba(80,140,255,0.06)', paddingVertical: 9 },
  cardTop:  { paddingTop: 0 },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Expand area (aligns with nameBlock start: rank22 + gap10 + flag24 + gap10 = 66)
  expand:      { marginTop: 8, paddingLeft: 66, gap: 5 },
  expandLine:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  expandLabel: { fontSize: 9, fontWeight: '700', color: D.text3, minWidth: 80, marginRight: 6 },
  expandVal:   { fontSize: 10, color: D.text2 },
  expandSep:   { marginTop: 4, paddingTop: 5, borderTopWidth: 1, borderTopColor: D.border },
  expandTotal: { fontSize: 12, fontWeight: '800' },
  expandHint:    { fontSize: 8, color: D.text3 },
  expandFormula: { fontSize: 8, color: D.text3, fontStyle: 'italic', marginBottom: 4 },
  //
  rank:  { fontSize: 14, fontWeight: '800', width: 22, textAlign: 'center' },
  flag:  { fontSize: 18, width: 24 },
  nameBlock: { flex: 1, gap: 1 },
  infoBlock: { flex: 1, gap: 1 },
  name:  { fontSize: 12, fontWeight: '700', color: D.text1 },
  formationTag: { fontSize: 9, fontWeight: '600', color: D.text3, letterSpacing: 0.5 },
  detail:{ fontSize: 10, color: D.text3 },
  profile: { fontSize: 10, color: D.text3, lineHeight: 15, marginTop: 2 },
  minutes: { fontSize: 9, color: D.cyan, fontWeight: '600', letterSpacing: 0.3 },
  badge: {
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 54,
    gap: 1,
  },
  badgeVal: { fontSize: 14, fontWeight: '800' },
  badgeLbl: { fontSize: 6, fontWeight: '700', color: D.text3, letterSpacing: 1 },
});

// ─── Performance tab ──────────────────────────────────────────────────────────

interface PerfEntry {
  name:        string;
  flag:        string;
  games:       number;
  wins:        number;
  draws:       number;
  gf:          number;
  ga:          number;
  cleanSheets: number;
  pts:         number;
}

function buildPerformanceRanking(
  results: Record<string, FixtureResult>,
  flagMap: Map<string, string>,
): PerfEntry[] {
  const map: Record<string, PerfEntry> = {};

  const get = (name: string): PerfEntry =>
    (map[name] ??= { name, flag: flagMap.get(name) ?? '🏳', games: 0, wins: 0, draws: 0, gf: 0, ga: 0, cleanSheets: 0, pts: 0 });

  for (const [key, result] of Object.entries(results)) {
    if (result.status !== 'FINISHED') continue;
    const [home, away] = key.split('|');
    const hg = result.homeScore ?? 0;
    const ag = result.awayScore ?? 0;

    const h = get(home);
    h.games++; h.gf += hg; h.ga += ag;
    if (hg > ag) h.wins++;
    else if (hg === ag) h.draws++;
    if (ag === 0) h.cleanSheets++;

    const a = get(away);
    a.games++; a.gf += ag; a.ga += hg;
    if (ag > hg) a.wins++;
    else if (hg === ag) a.draws++;
    if (hg === 0) a.cleanSheets++;
  }

  for (const e of Object.values(map)) {
    e.pts = e.wins * 3 + e.draws + e.cleanSheets;
  }

  return Object.values(map)
    .filter((e) => e.games > 0)
    .sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : (b.gf - b.ga) - (a.gf - a.ga));
}

function PerformanceRow({ entry, rank, formation, coach, i18n }: { entry: PerfEntry; rank: number; formation?: string; coach?: string; i18n: I18n }) {
  const [open, setOpen] = useState(false);
  const badgeScale = usePulse(3);
  const medal     = rank <= 3 ? ['①', '②', '③'][rank - 1] : `${rank}`;
  const rankColor = rank === 1 ? D.gold : rank === 2 ? D.text2 : rank === 3 ? '#CD7F32' : D.text3;

  const staticInfo = [
    formation,
    coach && `${i18n.tiPerfCoach}: ${coach}`,
    `${entry.gf} scored · ${entry.ga} conceded`,
  ].filter(Boolean).join(' · ');

  return (
    <View style={[rw.card, rank === 1 && rw.cardTop]}>
      <View style={rw.rowInner}>
        <Text style={[rw.rank, { color: rankColor }]}>{medal}</Text>
        <Text style={rw.flag}>{entry.flag}</Text>
        <View style={rw.nameBlock}>
          <Text style={rw.name}>{entry.name}</Text>
          <Text style={rw.detail} numberOfLines={1}>{staticInfo}</Text>
        </View>
        <TouchableOpacity onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
          <Animated.View style={[rw.badge, { borderColor: `${D.gold}30`, backgroundColor: `${D.gold}10`, transform: [{ scale: badgeScale }] }]}>
            <Text style={[rw.badgeVal, { color: D.gold }]}>{entry.pts}</Text>
            <Text style={rw.badgeLbl}>PTS</Text>
            <Text style={rw.expandHint}>{open ? '▲' : '▼'}</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>

      {open && (
        <View style={rw.expand}>
          <View style={rw.expandLine}>
            <Text style={rw.expandLabel}>{i18n.tiPerfWins}</Text>
            <Text style={rw.expandVal}>{entry.wins} × 3 = <Text style={{ color: D.green, fontWeight: '700' }}>{entry.wins * 3} {i18n.tiPerfPts}</Text></Text>
          </View>
          <View style={rw.expandLine}>
            <Text style={rw.expandLabel}>{i18n.tiPerfDraws}</Text>
            <Text style={rw.expandVal}>{entry.draws} × 1 = <Text style={{ fontWeight: '700' }}>{entry.draws} {i18n.tiPerfPts}</Text></Text>
          </View>
          <View style={rw.expandLine}>
            <Text style={rw.expandLabel}>{i18n.tiPerfClean}</Text>
            <Text style={rw.expandVal}>{entry.cleanSheets} × 1 = <Text style={{ color: D.cyan, fontWeight: '700' }}>{entry.cleanSheets} {i18n.tiPerfPts}</Text></Text>
          </View>
          <View style={[rw.expandLine, rw.expandSep]}>
            <Text style={rw.expandLabel}>{i18n.tiPerfTotal}</Text>
            <Text style={[rw.expandTotal, { color: D.gold }]}>{entry.pts} {i18n.tiPerfPts}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Cards tab ────────────────────────────────────────────────────────────────

function CardRow({ entry, rank, icon, label, color, formation }: {
  entry: TeamRankEntry;
  rank: number;
  icon: string;
  label: string;
  color: string;
  formation?: string;
}) {
  const medal = rank <= 3 ? ['①', '②', '③'][rank - 1] : `${rank}`;
  const rankColor = rank <= 3 ? color : D.text3;
  return (
    <View style={[rw.row, rank === 1 && rw.rowFirst]}>
      <Text style={[rw.rank, { color: rankColor }]}>{medal}</Text>
      <Text style={[rw.profile, { flex: 1 }]} numberOfLines={1}>
        <Text style={rw.name}>{entry.flag} {entry.name}</Text>
        {formation ? <Text style={{ color: D.text3, fontSize: 10 }}>{' '}{formation}</Text> : null}
        <Text style={{ color: D.text3 }}>{' - '}</Text>
        <Text style={{ color, fontWeight: '700' }}>{entry.value}</Text>
        <Text style={{ color: D.text3 }}>{' '}{icon}{' '}{label}</Text>
      </Text>
    </View>
  );
}

function CardsTab({ yellows, reds, discipline, teamFormation, i18n }: {
  yellows: TeamRankEntry[];
  reds: TeamRankEntry[];
  discipline: TeamRankEntry[];
  teamFormation: Map<string, string>;
  i18n: I18n;
}) {
  const [sub, setSub] = useState<'yellow' | 'red' | 'discipline'>('yellow');
  return (
    <View style={{ gap: 12 }}>
      {/* Sub-tabs */}
      <View style={ct.subRow}>
        {(['yellow', 'red', 'discipline'] as const).map((k) => (
          <TouchableOpacity
            key={k}
            style={[ct.subTab, sub === k && ct.subTabActive]}
            onPress={() => setSub(k)}
          >
            <Text style={[ct.subLabel, sub === k && ct.subLabelActive]}>
              {k === 'yellow' ? i18n.tiSubYellow : k === 'red' ? i18n.tiSubRed : i18n.tiSubFairPlay}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sub === 'yellow' && (() => {
        const active = yellows.filter((e) => e.value > 0);
        return active.length === 0
          ? <Text style={ct.empty}>{i18n.tiNoReds}</Text>
          : active.map((e, i) => (
              <CardRow key={e.name} entry={e} rank={i + 1} icon="🟨" label="yellow cards" color={D.yellow} formation={teamFormation.get(e.name)} />
            ));
      })()}
      {sub === 'red' && (() => {
        const active = reds.filter((e) => e.value > 0);
        return active.length === 0
          ? <Text style={ct.empty}>{i18n.tiNoReds}</Text>
          : active.map((e, i) => (
              <CardRow key={e.name} entry={e} rank={i + 1} icon="🟥" label="red cards" color={D.red} formation={teamFormation.get(e.name)} />
            ));
      })()}
      {sub === 'discipline' && discipline.map((e, i) => (
        <CardRow key={e.name} entry={e} rank={i + 1} icon="⚖️" label={i18n.tiScore} color={D.signal} formation={teamFormation.get(e.name)} />
      ))}
    </View>
  );
}

const ct = StyleSheet.create({
  subRow:      { flexDirection: 'row', gap: 6 },
  subTab:      {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: D.border,
    backgroundColor: D.surface,
    alignItems: 'center',
  },
  subTabActive: { borderColor: 'rgba(80,140,255,0.35)', backgroundColor: 'rgba(80,140,255,0.08)' },
  subLabel:     { fontSize: 8, fontWeight: '800', color: D.text3, letterSpacing: 0.8 },
  subLabelActive: { color: D.blue },
  empty: { fontSize: 12, color: D.text3, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
});

// ─── Empty state ──────────────────────────────────────────────────────────────

function NoData({ i18n }: { i18n: I18n }) {
  return (
    <View style={nd.wrap}>
      <Text style={nd.icon}>📡</Text>
      <Text style={nd.text}>{i18n.tiWaiting}</Text>
      <Text style={nd.sub}>{i18n.tiWaitingSub}</Text>
    </View>
  );
}

const nd = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  icon: { fontSize: 28 },
  text: { fontSize: 13, fontWeight: '700', color: D.text2 },
  sub:  { fontSize: 10, color: D.text3 },
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function TournamentIntelligenceSection() {
  const { data, loading } = useTournamentIntelligence();
  const { i18n }          = useLanguage();
  const lineups           = useLineups();
  const teamFormation     = buildTeamFormationMap(lineups);
  const teamCoach         = buildTeamCoachMap(lineups);
  const [activeTab, setActiveTab] = useState<TabKey>('scorers');

  const teamFlagMap = new Map(WC_TEAMS.map((t) => [t.name, t.flag]));
  const perfRanking = buildPerformanceRanking(FIXTURE_RESULTS, teamFlagMap);

  const TABS = getTabs(i18n);
  const activeConfig = TABS.find((t) => t.key === activeTab)!;

  return (
    <View style={ms.section}>
      <SectionHeader
        title={i18n.tournamentIntelTitle}
        sub={i18n.tournamentIntelSub}
      />

      {/* ── Tab row ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={ms.tabScroll}
        contentContainerStyle={ms.tabContent}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[ms.tab, active && { borderColor: `${tab.color}50`, backgroundColor: `${tab.color}0F` }]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={ms.tabIcon}>{tab.icon}</Text>
              <Text style={[ms.tabLabel, { color: active ? tab.color : D.text3 }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Content card ── */}
      <View style={ms.card}>
        {loading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={D.blue} />
          </View>
        ) : (
          <>
            {activeTab === 'scorers' && (
              data.topScorers.length === 0
                ? <NoData i18n={i18n} />
                : data.topScorers.map((e, i) => (
                    <ScorerRow key={e.name + i} entry={e} rank={i + 1} color={activeConfig.color} i18n={i18n} />
                  ))
            )}

            {activeTab === 'performance' && (
              perfRanking.length === 0
                ? <NoData i18n={i18n} />
                : perfRanking.map((e, i) => (
                    <PerformanceRow key={e.name} entry={e} rank={i + 1} formation={teamFormation.get(e.name)} coach={teamCoach.get(e.name)} i18n={i18n} />
                  ))
            )}

            {activeTab === 'cards' && (
              <CardsTab
                yellows={data.mostYellows}
                reds={data.mostReds}
                discipline={data.disciplineRank}
                teamFormation={teamFormation}
                i18n={i18n}
              />
            )}

            {activeTab === 'danger' && (
              data.mostDangerous.length === 0
                ? <NoData i18n={i18n} />
                : data.mostDangerous.map((e, i) => (
                    <TeamRow key={e.name} entry={e} rank={i + 1} color={activeConfig.color} label={i18n.tiScore} formation={teamFormation.get(e.name)} breakdownType="danger" i18n={i18n} />
                  ))
            )}

            {activeTab === 'surprise' && (
              <>
                <View style={ms.surpriseHint}>
                  <Text style={ms.surpriseHintText}>
                    {i18n.tiSurpriseHint}
                  </Text>
                </View>
                {data.liliSurpriseRank.length === 0
                  ? <NoData i18n={i18n} />
                  : data.liliSurpriseRank.map((e, i) => (
                      <TeamRow key={e.name} entry={e} rank={i + 1} color={activeConfig.color} label="INDEX" formation={teamFormation.get(e.name)} breakdownType="lili" i18n={i18n} />
                    ))
                }
              </>
            )}

            {activeTab === 'tactics' && (
              <TacticsTab lineups={lineups} teamFlagMap={teamFlagMap} i18n={i18n} />
            )}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ms = StyleSheet.create({
  section: { marginBottom: 24 },

  tabScroll:   { marginBottom: 12 },
  tabContent:  { gap: 7, paddingRight: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(80,140,255,0.14)',
    backgroundColor: '#0E1933',
  },
  tabIcon:  { fontSize: 13 },
  tabLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },

  card: {
    backgroundColor: '#0E1933',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(80,140,255,0.10)',
    padding: 14,
  },

  surpriseHint: {
    backgroundColor: 'rgba(0,229,160,0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.14)',
    padding: 10,
    marginBottom: 12,
  },
  surpriseHintText: { fontSize: 10, color: 'rgba(0,229,160,0.7)', lineHeight: 15 },
});
