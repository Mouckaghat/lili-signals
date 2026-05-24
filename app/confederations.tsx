import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FutureScrubber, { type ScrubberStage } from '../components/FutureScrubber';
import {
  CONFEDERATION_META,
  CONF_RACE_STAGE_INSIGHTS,
  CONF_STAGE_SURVIVAL,
  LILI_INSIGHTS,
  TEAM_FIFA_RANKING,
  TEAM_QUAL_STATUS,
  getConfStats,
  getTopTeamsByStrength,
  runConfedSimulation,
  type ConfSimResult,
  type ConfStats,
  type QualStatus,
} from '../lib/confederationData';
import { FED_BG, FED_COLOR, WC_TEAMS, type Federation, type WCTeam } from '../lib/wcData';

// ─── Shared primitives ────────────────────────────────────────────────────────

const QUAL_COLORS: Record<QualStatus, { text: string; bg: string }> = {
  Qualified:   { text: '#1A7A3C', bg: '#E3F5EC' },
  'Play-offs': { text: '#B45309', bg: '#FEF3C7' },
  'Still Alive': { text: '#0369A1', bg: '#E0F2FE' },
  Eliminated:  { text: '#B91C1C', bg: '#FEE2E2' },
};

function StatusPill({ status }: { status: QualStatus }) {
  const c = QUAL_COLORS[status];
  return (
    <View style={[pill.root, { backgroundColor: c.bg }]}>
      <Text style={[pill.text, { color: c.text }]}>{status}</Text>
    </View>
  );
}
const pill = StyleSheet.create({
  root: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  text: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
});

function ProbBar({ label, value, color, labelWidth = 130 }: {
  label: string; value: number; color: string; labelWidth?: number;
}) {
  return (
    <View style={pb.row}>
      <Text style={[pb.label, { width: labelWidth }]}>{label}</Text>
      <View style={pb.track}>
        <View style={[pb.fill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[pb.pct, { color }]}>{Math.round(value * 100)}%</Text>
    </View>
  );
}
const pb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  label: { fontSize: 12, color: '#6E6E73', fontWeight: '500' },
  track: { flex: 1, height: 8, backgroundColor: '#F0F0F5', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  pct: { width: 38, fontSize: 13, fontWeight: '700', textAlign: 'right' },
});

// ─── Screen Header ────────────────────────────────────────────────────────────

function ScreenHeader() {
  return (
    <View style={s.header}>
      <Image
        source={require('../assets/blue_lobster.png')}
        style={s.headerLogo}
        resizeMode="contain"
      />
      <View style={s.headerText}>
        <Text style={s.headerTitle}>Confederations</Text>
        <Text style={s.headerSubtitle}>Explore teams by football confederation</Text>
      </View>
    </View>
  );
}

// ─── Confederation Cards ──────────────────────────────────────────────────────

function ConfederationCards({
  selected,
  onSelect,
}: {
  selected: Federation;
  onSelect: (f: Federation) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.cardsContainer}
      style={s.cardsScroll}
    >
      {CONFEDERATION_META.map((conf) => {
        const active = selected === conf.id;
        const count = WC_TEAMS.filter((t) => t.federation === conf.id).length;
        return (
          <TouchableOpacity
            key={conf.id}
            style={[
              s.confCard,
              active && {
                borderColor: conf.color,
                borderWidth: 2,
                backgroundColor: conf.bg,
              },
            ]}
            onPress={() => onSelect(conf.id)}
            activeOpacity={0.72}
          >
            <Text style={s.confIcon}>{conf.icon}</Text>
            <Text style={[s.confName, active && { color: conf.color }]}>{conf.name}</Text>
            <Text style={s.confTagline}>{conf.tagline}</Text>
            <Text style={s.confCount}>{count} teams</Text>
            {active && (
              <View style={[s.confActiveDot, { backgroundColor: conf.color }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Teams Table ──────────────────────────────────────────────────────────────

function TeamRow({ team, index }: { team: WCTeam; index: number }) {
  const rank = TEAM_FIFA_RANKING[team.name] ?? 99;
  const status = TEAM_QUAL_STATUS[team.name] ?? 'Qualified';
  return (
    <View style={[s.teamRow, index > 0 && s.teamRowBorder]}>
      <Text style={s.teamRank}>#{rank}</Text>
      <Text style={s.teamFlag}>{team.flag}</Text>
      <Text style={s.teamName} numberOfLines={1}>{team.name}</Text>
      <Text style={s.teamGroup}>{team.group}</Text>
      <StatusPill status={status} />
    </View>
  );
}

function TeamsTableCard({
  teams,
  search,
  onSearch,
  sortBy,
  onSort,
  confColor,
}: {
  teams: WCTeam[];
  search: string;
  onSearch: (s: string) => void;
  sortBy: 'ranking' | 'name';
  onSort: (s: 'ranking' | 'name') => void;
  confColor: string;
}) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Federation Teams</Text>

      {/* Controls */}
      <View style={s.tableControls}>
        <View style={s.searchBar}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search teams…"
            placeholderTextColor="#AEAEB2"
            value={search}
            onChangeText={onSearch}
            clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {Platform.OS !== 'ios' && search.length > 0 && (
            <TouchableOpacity onPress={() => onSearch('')}>
              <Text style={s.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={s.sortBtns}>
          {(['ranking', 'name'] as const).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[s.sortBtn, sortBy === opt && { backgroundColor: confColor }]}
              onPress={() => onSort(opt)}
            >
              <Text style={[s.sortBtnText, sortBy === opt && { color: '#FFF' }]}>
                {opt === 'ranking' ? 'Rank' : 'A–Z'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Column headers */}
      <View style={s.tableHeader}>
        <Text style={[s.thCell, { width: 40 }]}>RANK</Text>
        <Text style={[s.thCell, { flex: 1 }]}>TEAM</Text>
        <Text style={[s.thCell, { width: 34 }]}>GRP</Text>
        <Text style={[s.thCell, { width: 82 }]}>STATUS</Text>
      </View>

      {/* Rows */}
      {teams.length === 0 ? (
        <Text style={s.emptyTable}>No teams match your search</Text>
      ) : (
        teams.map((team, i) => <TeamRow key={team.name} team={team} index={i} />)
      )}
    </View>
  );
}

// ─── Overview Card ────────────────────────────────────────────────────────────

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.statTile}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function OverviewCard({ stats, confColor }: { stats: ConfStats; confColor: string }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Federation Overview</Text>
      <View style={s.statGrid}>
        <StatTile label="Teams in WC" value={String(stats.totalTeams)} color={confColor} />
        <StatTile label="Avg Ranking" value={`#${stats.avgRanking}`} color={confColor} />
        <StatTile label="Best Ranked" value={`#${stats.bestRanking}`} color="#1A7A3C" />
        <StatTile label="Strength Idx" value={String(stats.avgStrength)} color={confColor} />
      </View>
      <View style={[s.strongestRow, { borderLeftColor: confColor }]}>
        <Text style={s.strongestLabel}>Strongest team</Text>
        <Text style={s.strongestValue}>
          {stats.strongestTeam.flag}{'  '}{stats.strongestTeam.name}
        </Text>
      </View>
    </View>
  );
}

// ─── Simulation Card ──────────────────────────────────────────────────────────

function SimulationCard({
  result,
  loading,
  onRun,
  confColor,
}: {
  result: ConfSimResult | null;
  loading: boolean;
  onRun: () => void;
  confColor: string;
}) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Lili Confederation Simulation</Text>
      <Text style={s.cardSubtitle}>300 Monte Carlo runs per team</Text>

      <TouchableOpacity
        style={[s.runBtn, { backgroundColor: confColor, shadowColor: confColor }, loading && s.runBtnBusy]}
        onPress={onRun}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={s.runBtnText}>{result ? '↺  Run Again' : '▶  Run Simulation'}</Text>
        )}
      </TouchableOpacity>

      {result ? (
        <View style={s.simBars}>
          <ProbBar label="Win World Cup"       value={result.winWC}      color={confColor} />
          <ProbBar label="Reach Final"         value={result.reachFinal} color={confColor} />
          <ProbBar label="Reach Semi-final"    value={result.reachSemi}  color={confColor} />
          <ProbBar label="Reach Quarter-final" value={result.reachQF}    color={confColor} />
        </View>
      ) : !loading ? (
        <Text style={s.simHint}>
          Run Lili's simulation to see confederation-level tournament probabilities across 300 runs per team.
        </Text>
      ) : null}
    </View>
  );
}

// ─── Top Teams Card ───────────────────────────────────────────────────────────

function TopTeamRow({ team, rank, confColor }: { team: WCTeam; rank: number; confColor: string }) {
  const qualProb = Math.min(0.99, (team.strength - 40) / 55);
  return (
    <View style={s.topRow}>
      <Text style={s.topRankNum}>{rank}</Text>
      <Text style={s.topFlag}>{team.flag}</Text>
      <Text style={s.topName} numberOfLines={1}>{team.name}</Text>
      <View style={pb.track}>
        <View style={[pb.fill, { width: `${Math.round(qualProb * 100)}%`, backgroundColor: confColor }]} />
      </View>
      <Text style={[s.topPct, { color: confColor }]}>{Math.round(qualProb * 100)}%</Text>
    </View>
  );
}

function TopTeamsCard({ teams, confColor }: { teams: WCTeam[]; confColor: string }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Top Teams by Lili</Text>
      <Text style={s.cardSubtitle}>Qualification confidence</Text>
      {teams.map((team, i) => (
        <TopTeamRow key={team.name} team={team} rank={i + 1} confColor={confColor} />
      ))}
    </View>
  );
}

// ─── Lili Insight Card ────────────────────────────────────────────────────────

function LiliInsightCard({ confId }: { confId: Federation }) {
  return (
    <View style={s.insightCard}>
      <View style={s.insightHeader}>
        <Text style={s.insightBadge}>LILI INSIGHT</Text>
        <Text style={s.insightRobot}>🤖</Text>
      </View>
      <Text style={s.insightText}>{LILI_INSIGHTS[confId]}</Text>
      <Text style={s.insightMeta}>lili-v1.0 · momentum analysis · 2026 WC cycle</Text>
    </View>
  );
}

// ─── Tournament Race Card ─────────────────────────────────────────────────────

const RACE_STAGES: ScrubberStage[] = [
  { key: 'MD1',   label: 'MD 1'  },
  { key: 'MD2',   label: 'MD 2'  },
  { key: 'MD3',   label: 'MD 3'  },
  { key: 'R16',   label: 'R16'   },
  { key: 'QF',    label: 'QF'    },
  { key: 'SF',    label: 'SF'    },
  { key: 'Final', label: 'Final' },
];

function RaceSurvivalBar({
  conf,
  stageIndex,
  isSelected,
}: {
  conf: typeof CONFEDERATION_META[0];
  stageIndex: number;
  isSelected: boolean;
}) {
  const survival = CONF_STAGE_SURVIVAL[conf.id][stageIndex];
  const pct = Math.round(survival * 100);
  return (
    <View style={[tr.raceRow, isSelected && { backgroundColor: `${conf.color}0A`, borderRadius: 8 }]}>
      <Text style={[tr.raceConfName, isSelected && { color: conf.color, fontWeight: '700' }]}>
        {conf.name}
      </Text>
      <View style={pb.track}>
        <View style={[pb.fill, { width: `${pct}%`, backgroundColor: conf.color, opacity: pct === 0 ? 0 : 1 }]} />
      </View>
      <Text style={[tr.racePct, { color: pct > 0 ? conf.color : '#D1D1D6' }]}>
        {pct > 0 ? `${pct}%` : '—'}
      </Text>
    </View>
  );
}

function TournamentRaceCard({
  stageIndex,
  onStageChange,
  selectedConf,
}: {
  stageIndex: number;
  onStageChange: (i: number) => void;
  selectedConf: Federation;
}) {
  const insight = CONF_RACE_STAGE_INSIGHTS[stageIndex] ?? '';
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Confederation Race</Text>
      <Text style={s.cardSubtitle}>Survival probability at each tournament stage</Text>

      <FutureScrubber
        stages={RACE_STAGES}
        activeIndex={stageIndex}
        onIndexChange={onStageChange}
        futureStartIndex={3}
        color="#005F8E"
        style={tr.scrubber}
      />

      <View style={tr.barsSection}>
        {CONFEDERATION_META.map((conf) => (
          <RaceSurvivalBar
            key={conf.id}
            conf={conf}
            stageIndex={stageIndex}
            isSelected={conf.id === selectedConf}
          />
        ))}
      </View>

      <View style={tr.insightBox}>
        <View style={tr.insightHeader}>
          <Text style={tr.insightBadge}>LILI RACE INSIGHT</Text>
          <Text style={tr.insightRobot}>🤖</Text>
        </View>
        <Text style={tr.insightText}>{insight}</Text>
      </View>
    </View>
  );
}

const tr = StyleSheet.create({
  scrubber: { paddingHorizontal: 0, marginBottom: 16 },
  barsSection: { gap: 10, marginBottom: 16 },
  raceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  raceConfName: { width: 80, fontSize: 12, fontWeight: '600', color: '#6E6E73' },
  racePct: { width: 34, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  insightBox: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#005F8E',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  insightBadge: { fontSize: 9, fontWeight: '700', color: '#005F8E', letterSpacing: 0.7 },
  insightRobot: { fontSize: 16 },
  insightText: { fontSize: 13, color: '#1D1D1F', lineHeight: 20 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ConfederationsScreen() {
  const [selectedConf, setSelectedConf] = useState<Federation>('UEFA');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'ranking' | 'name'>('ranking');
  const [simResult, setSimResult] = useState<ConfSimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [raceStageIndex, setRaceStageIndex] = useState(0);
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const confTeams = useMemo(
    () => WC_TEAMS.filter((t) => t.federation === selectedConf),
    [selectedConf]
  );

  const filteredTeams = useMemo(() => {
    let teams = search
      ? confTeams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
      : [...confTeams];
    if (sortBy === 'ranking') {
      teams.sort((a, b) => (TEAM_FIFA_RANKING[a.name] ?? 99) - (TEAM_FIFA_RANKING[b.name] ?? 99));
    } else {
      teams.sort((a, b) => a.name.localeCompare(b.name));
    }
    return teams;
  }, [confTeams, search, sortBy]);

  const confStats = useMemo(() => getConfStats(selectedConf), [selectedConf]);
  const topTeams = useMemo(() => getTopTeamsByStrength(selectedConf, 3), [selectedConf]);
  const confColor = FED_COLOR[selectedConf];

  const handleSelectConf = (conf: Federation) => {
    setSelectedConf(conf);
    setSimResult(null);
    setSearch('');
  };

  const handleRunSim = async () => {
    setSimLoading(true);
    setSimResult(null);
    await new Promise((r) => setTimeout(r, 60));
    const result = runConfedSimulation(selectedConf, 300);
    setSimResult(result);
    setSimLoading(false);
  };

  const rightPanel = (
    <>
      <OverviewCard stats={confStats} confColor={confColor} />
      <SimulationCard
        result={simResult}
        loading={simLoading}
        onRun={handleRunSim}
        confColor={confColor}
      />
      <TopTeamsCard teams={topTeams} confColor={confColor} />
      <LiliInsightCard confId={selectedConf} />
      <TournamentRaceCard
        stageIndex={raceStageIndex}
        onStageChange={setRaceStageIndex}
        selectedConf={selectedConf}
      />
    </>
  );

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader />
        <ConfederationCards selected={selectedConf} onSelect={handleSelectConf} />

        {isWide ? (
          <View style={s.twoCol}>
            <View style={s.leftCol}>
              <TeamsTableCard
                teams={filteredTeams}
                search={search}
                onSearch={setSearch}
                sortBy={sortBy}
                onSort={setSortBy}
                confColor={confColor}
              />
            </View>
            <View style={s.rightCol}>{rightPanel}</View>
          </View>
        ) : (
          <View style={s.singleCol}>
            <TeamsTableCard
              teams={filteredTeams}
              search={search}
              onSearch={setSearch}
              sortBy={sortBy}
              onSort={setSortBy}
              confColor={confColor}
            />
            {rightPanel}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  scrollContent: { paddingBottom: 52 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 14,
  },
  headerLogo: { width: 46, height: 46 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#1D1D1F', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#6E6E73', marginTop: 2 },

  // Confederation cards
  cardsScroll: { marginBottom: 6 },
  cardsContainer: { paddingHorizontal: 16, gap: 10, paddingBottom: 16 },
  confCard: {
    width: 116,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  confIcon: { fontSize: 22, marginBottom: 6 },
  confName: { fontSize: 12, fontWeight: '700', color: '#1D1D1F', marginBottom: 2 },
  confTagline: { fontSize: 10, color: '#AEAEB2', fontWeight: '500', textAlign: 'center', marginBottom: 4 },
  confCount: { fontSize: 11, color: '#8E8E93', fontWeight: '500' },
  confActiveDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },

  // Layout
  singleCol: { paddingHorizontal: 16 },
  twoCol: { flexDirection: 'row', paddingHorizontal: 16, gap: 14 },
  leftCol: { flex: 1.55 },
  rightCol: { flex: 1 },

  // Card shell (no horizontal margin — parent handles padding)
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1D1D1F', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#8E8E93', marginBottom: 14 },

  // Teams table controls
  tableControls: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  searchIcon: { fontSize: 13 },
  searchInput: { flex: 1, fontSize: 13, color: '#1D1D1F' },
  clearBtn: { fontSize: 14, color: '#AEAEB2', paddingHorizontal: 4 },
  sortBtns: { flexDirection: 'row', gap: 6 },
  sortBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F0F0F5',
  },
  sortBtnText: { fontSize: 12, fontWeight: '600', color: '#6E6E73' },

  // Table header
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    marginBottom: 2,
  },
  thCell: { fontSize: 9, fontWeight: '700', color: '#AEAEB2', letterSpacing: 0.5 },

  // Team row
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 6 },
  teamRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F5F5F7',
  },
  teamRank: { width: 34, fontSize: 11, color: '#AEAEB2', fontWeight: '600' },
  teamFlag: { fontSize: 17, width: 24 },
  teamName: { flex: 1, fontSize: 13, fontWeight: '500', color: '#1D1D1F' },
  teamGroup: { width: 28, fontSize: 12, color: '#8E8E93', fontWeight: '600', textAlign: 'center' },
  emptyTable: { fontSize: 13, color: '#AEAEB2', textAlign: 'center', paddingVertical: 20 },

  // Overview stats grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, marginBottom: 12 },
  statTile: { width: '50%', paddingVertical: 8, paddingRight: 8 },
  statValue: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  statLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  strongestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingLeft: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0F0F5',
    borderLeftWidth: 3,
  },
  strongestLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  strongestValue: { fontSize: 14, fontWeight: '600', color: '#1D1D1F' },

  // Simulation
  runBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  runBtnBusy: { opacity: 0.65 },
  runBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  simBars: { paddingTop: 2 },
  simHint: {
    fontSize: 13,
    color: '#AEAEB2',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },

  // Top teams
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  topRankNum: { width: 16, fontSize: 11, color: '#AEAEB2', fontWeight: '700' },
  topFlag: { fontSize: 17 },
  topName: { width: 88, fontSize: 13, fontWeight: '500', color: '#1D1D1F' },
  topPct: { width: 38, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  // Lili Insight
  insightCard: {
    backgroundColor: '#EEF4FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#005F8E',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  insightBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#005F8E',
    letterSpacing: 0.8,
  },
  insightRobot: { fontSize: 18 },
  insightText: { fontSize: 14, color: '#1D1D1F', lineHeight: 22 },
  insightMeta: { fontSize: 11, color: '#8E8E93', marginTop: 10, fontStyle: 'italic' },
});
