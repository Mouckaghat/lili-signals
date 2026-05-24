import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FutureScrubber, { type ScrubberStage } from '../components/FutureScrubber';
import TeamPickerModal, { TeamPickerTrigger } from '../components/TeamPickerModal';
import {
  buildStageInsight,
  getProjectedKnockoutPath,
  type ProjectedMatch,
} from '../lib/journeyProjection';
import { buildMatchPredictions } from '../lib/wcSimulation';
import {
  FED_BG,
  FED_COLOR,
  getOpponent,
  getTeam,
  getTeamFixtures,
  isHomeTeam,
  type WCFixture,
  type WCTeam,
} from '../lib/wcData';

// ─── Scrubber stages ──────────────────────────────────────────────────────────

const JOURNEY_STAGES: ScrubberStage[] = [
  { key: 'MD1',   label: 'MD 1'  },
  { key: 'MD2',   label: 'MD 2'  },
  { key: 'MD3',   label: 'MD 3'  },
  { key: 'R16',   label: 'R16'   },
  { key: 'QF',    label: 'QF'    },
  { key: 'SF',    label: 'SF'    },
  { key: 'Final', label: 'Final' },
];

const GROUP_STAGE_COUNT = 3; // MD1–MD3 are real fixtures, index 3+ are projected

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countryFlag(country: 'USA' | 'Canada' | 'Mexico') {
  if (country === 'USA') return '🇺🇸';
  if (country === 'Canada') return '🇨🇦';
  return '🇲🇽';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' local';
}

function pct(n: number) { return `${Math.round(n * 100)}%`; }

// ─── Probability Bar ──────────────────────────────────────────────────────────

function ProbRow({ win, draw, loss }: { win: number; draw: number; loss: number }) {
  return (
    <View style={s.probContainer}>
      <View style={s.probBarRow}>
        <View style={[s.probSeg, { flex: win,  backgroundColor: '#34C759' }]} />
        <View style={[s.probSeg, { flex: draw, backgroundColor: '#FF9F0A' }]} />
        <View style={[s.probSeg, { flex: loss, backgroundColor: '#FF3B30' }]} />
      </View>
      <View style={s.probLabels}>
        <Text style={[s.probLabel, { color: '#34C759' }]}>W {pct(win)}</Text>
        <Text style={[s.probLabel, { color: '#FF9F0A' }]}>D {pct(draw)}</Text>
        <Text style={[s.probLabel, { color: '#FF3B30' }]}>L {pct(loss)}</Text>
      </View>
    </View>
  );
}

// ─── Active Group Stage Card ──────────────────────────────────────────────────

function GroupStageCard({
  fixture,
  teamName,
  win,
  draw,
  loss,
}: {
  fixture: WCFixture;
  teamName: string;
  win: number;
  draw: number;
  loss: number;
}) {
  const opponentName = getOpponent(fixture, teamName);
  const opponent     = getTeam(opponentName);
  const myTeam       = getTeam(teamName)!;
  const homeGame     = isHomeTeam(fixture, teamName);

  return (
    <View style={s.activeCard}>
      {/* Header */}
      <View style={s.activeCardHeader}>
        <View style={s.mdBadge}>
          <Text style={s.mdBadgeText}>MD{fixture.matchday}</Text>
        </View>
        <Text style={s.activeCardDate}>{fmtDate(fixture.date)}</Text>
        <Text style={s.activeCardTime}>{fmtTime(fixture.date)}</Text>
      </View>

      {/* Match */}
      <View style={s.matchRow}>
        <View style={s.teamBlock}>
          <Text style={s.teamFlagLarge}>{myTeam.flag}</Text>
          <Text style={s.teamNameLarge} numberOfLines={1}>{teamName}</Text>
          <Text style={s.homeAwayLabel}>{homeGame ? 'Home' : 'Away'}</Text>
        </View>

        <Text style={s.vsText}>vs</Text>

        <View style={[s.teamBlock, s.teamBlockRight]}>
          <Text style={s.teamFlagLarge}>{opponent?.flag ?? '🏳'}</Text>
          <Text style={s.teamNameLarge} numberOfLines={1}>{opponentName}</Text>
          <View style={[s.fedPill, { backgroundColor: FED_BG[opponent?.federation ?? 'UEFA'] }]}>
            <Text style={[s.fedPillText, { color: FED_COLOR[opponent?.federation ?? 'UEFA'] }]}>
              {opponent?.federation ?? '?'}
            </Text>
          </View>
        </View>
      </View>

      {/* Lili prediction */}
      <View style={s.predSection}>
        <Text style={s.predLabel}>LILI PREDICTION</Text>
        <ProbRow win={win} draw={draw} loss={loss} />
      </View>

      {/* Venue */}
      <View style={s.venueRow}>
        <Text style={s.venueFlag}>{countryFlag(fixture.country)}</Text>
        <View>
          <Text style={s.stadiumText}>{fixture.stadium}</Text>
          <Text style={s.cityText}>{fixture.city} · {fixture.country}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Active Projected Card ────────────────────────────────────────────────────

function ProjectedCard({
  projected,
  teamName,
}: {
  projected: ProjectedMatch;
  teamName: string;
}) {
  return (
    <View style={[s.activeCard, s.projectedCard]}>
      {/* Header */}
      <View style={s.activeCardHeader}>
        <View style={[s.mdBadge, s.projectedBadge]}>
          <Text style={s.projectedBadgeText}>{projected.roundLabel.toUpperCase()}</Text>
        </View>
        <Text style={s.activeCardDate}>{projected.approxDate}</Text>
        <View style={s.simTag}>
          <Text style={s.simTagText}>SIMULATION</Text>
        </View>
      </View>

      {/* Match */}
      <View style={s.matchRow}>
        <View style={s.teamBlock}>
          <Text style={s.teamFlagLarge}>{'🏳'}</Text>
          <Text style={s.teamNameLarge} numberOfLines={1}>{teamName}</Text>
          <Text style={s.homeAwayLabel}>Neutral</Text>
        </View>

        <Text style={s.vsText}>vs</Text>

        <View style={[s.teamBlock, s.teamBlockRight]}>
          <Text style={s.teamFlagLarge}>{projected.opponent.flag}</Text>
          <Text style={s.teamNameLarge} numberOfLines={1}>{projected.opponent.name}</Text>
          <View style={[s.fedPill, { backgroundColor: FED_BG[projected.opponent.federation] }]}>
            <Text style={[s.fedPillText, { color: FED_COLOR[projected.opponent.federation] }]}>
              {projected.opponent.federation}
            </Text>
          </View>
        </View>
      </View>

      {/* Lili prediction */}
      <View style={s.predSection}>
        <Text style={s.predLabel}>LILI PROJECTION</Text>
        <ProbRow win={projected.winProb} draw={projected.drawProb} loss={projected.lossProb} />
      </View>

      <Text style={s.projectedNote}>
        Based on Monte Carlo simulation · opponent projection, not confirmed
      </Text>
    </View>
  );
}

// ─── Lili Insight Box ─────────────────────────────────────────────────────────

function LiliInsightBox({ text }: { text: string }) {
  return (
    <View style={s.insightBox}>
      <View style={s.insightHeader}>
        <Text style={s.insightBadge}>LILI INSIGHT</Text>
        <Text style={s.insightRobot}>🤖</Text>
      </View>
      <Text style={s.insightText}>{text}</Text>
    </View>
  );
}

// ─── Path Overview chips ──────────────────────────────────────────────────────

interface PathChipData {
  stageIndex: number;
  label: string;
  opponentFlag: string;
  winProb: number;
  isProjected: boolean;
}

function PathChip({
  chip,
  isActive,
  onPress,
  color,
}: {
  chip: PathChipData;
  isActive: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <TouchableOpacity
      style={[
        s.pathChip,
        isActive && { borderColor: color, backgroundColor: `${color}12` },
        chip.isProjected && s.pathChipProjected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.pathChipStage, isActive && { color }]}>{chip.label}</Text>
      <Text style={s.pathChipFlag}>{chip.opponentFlag}</Text>
      <Text style={[s.pathChipProb, { color: isActive ? color : '#8E8E93' }]}>
        W{Math.round(chip.winProb * 100)}%
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function JourneyScreen() {
  const [team, setTeam]           = useState<WCTeam | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  // Derive all journey data when team changes
  const groupFixtures = useMemo(
    () => (team ? getTeamFixtures(team.name) : []),
    [team]
  );
  const groupPredictions = useMemo(
    () => (team ? buildMatchPredictions(team.name) : []),
    [team]
  );
  const projectedPath = useMemo(
    () => (team ? getProjectedKnockoutPath(team) : []),
    [team]
  );

  const handleTeamSelect = (t: WCTeam) => {
    setTeam(t);
    setStageIndex(0);
  };

  // Compute Lili insight for current stage
  const liliInsight = useMemo(() => {
    if (!team) return '';
    if (stageIndex < GROUP_STAGE_COUNT) {
      const fixture    = groupFixtures[stageIndex];
      const pred       = groupPredictions[stageIndex];
      if (!fixture || !pred) return '';
      const oppName = getOpponent(fixture, team.name);
      const opp     = getTeam(oppName);
      return buildStageInsight(
        team, stageIndex, oppName, opp?.strength ?? 65, pred.winProb, false
      );
    } else {
      const proj = projectedPath[stageIndex - GROUP_STAGE_COUNT];
      if (!proj) return '';
      return buildStageInsight(
        team, stageIndex, proj.opponent.name, proj.opponent.strength, proj.winProb, true
      );
    }
  }, [team, stageIndex, groupFixtures, groupPredictions, projectedPath]);

  // Build path chips for the overview row
  const pathChips: PathChipData[] = useMemo(() => {
    if (!team) return [];
    const chips: PathChipData[] = [];

    groupFixtures.forEach((f, i) => {
      const pred = groupPredictions[i];
      const oppName = getOpponent(f, team.name);
      const opp = getTeam(oppName);
      chips.push({
        stageIndex: i,
        label: `MD${i + 1}`,
        opponentFlag: opp?.flag ?? '🏳',
        winProb: pred?.winProb ?? 0.5,
        isProjected: false,
      });
    });

    projectedPath.forEach((proj, i) => {
      chips.push({
        stageIndex: GROUP_STAGE_COUNT + i,
        label: proj.round,
        opponentFlag: proj.opponent.flag,
        winProb: proj.winProb,
        isProjected: true,
      });
    });

    return chips;
  }, [team, groupFixtures, groupPredictions, projectedPath]);

  const fedColor = team ? FED_COLOR[team.federation] : '#005F8E';

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Team picker trigger */}
      <TeamPickerTrigger
        team={team}
        onPress={() => setPickerOpen(true)}
        placeholder="Choose a team to follow"
      />
      <TeamPickerModal
        visible={pickerOpen}
        selected={team}
        onSelect={handleTeamSelect}
        onClose={() => setPickerOpen(false)}
      />

      {!team ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🌍</Text>
          <Text style={s.emptyTitle}>Your World Cup Path</Text>
          <Text style={s.emptySub}>
            Choose a nation. Lili maps their real group fixtures{'\n'}
            and simulates the full knockout journey ahead.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Team hero */}
          <View style={s.teamHero}>
            <Text style={s.heroFlag}>{team.flag}</Text>
            <View style={s.heroText}>
              <Text style={s.heroName}>{team.name}</Text>
              <View style={s.heroMeta}>
                <View style={[s.fedPill, { backgroundColor: FED_BG[team.federation] }]}>
                  <Text style={[s.fedPillText, { color: FED_COLOR[team.federation] }]}>
                    {team.federation}
                  </Text>
                </View>
                <Text style={s.heroGroup}>Group {team.group}</Text>
                <Text style={s.heroStrength}>STR {team.strength}</Text>
              </View>
            </View>
          </View>

          {/* Future scrubber */}
          <View style={s.scrubberCard}>
            <Text style={s.scrubberTitle}>World Cup Path</Text>
            <FutureScrubber
              stages={JOURNEY_STAGES}
              activeIndex={stageIndex}
              onIndexChange={setStageIndex}
              futureStartIndex={GROUP_STAGE_COUNT}
              color={fedColor}
              style={s.scrubberInner}
            />
          </View>

          {/* Active stage card */}
          {stageIndex < GROUP_STAGE_COUNT ? (
            groupFixtures[stageIndex] && groupPredictions[stageIndex] ? (
              <GroupStageCard
                fixture={groupFixtures[stageIndex]}
                teamName={team.name}
                win={groupPredictions[stageIndex].winProb}
                draw={groupPredictions[stageIndex].drawProb}
                loss={groupPredictions[stageIndex].lossProb}
              />
            ) : null
          ) : (
            projectedPath[stageIndex - GROUP_STAGE_COUNT] ? (
              <ProjectedCard
                projected={projectedPath[stageIndex - GROUP_STAGE_COUNT]}
                teamName={team.name}
              />
            ) : null
          )}

          {/* Lili insight */}
          {liliInsight ? <LiliInsightBox text={liliInsight} /> : null}

          {/* Path overview */}
          <View style={s.pathSection}>
            <Text style={s.pathSectionLabel}>Full Path</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.pathChipsRow}
            >
              {pathChips.map((chip) => {
                if (chip.stageIndex === GROUP_STAGE_COUNT && chip.isProjected) {
                  // Insert separator before projected section
                  return (
                    <View key={chip.label} style={s.pathChipWithSep}>
                      <View style={s.pathSep}>
                        <View style={s.pathSepLine} />
                        <Text style={s.pathSepLabel}>projected</Text>
                        <View style={s.pathSepLine} />
                      </View>
                      <PathChip
                        chip={chip}
                        isActive={chip.stageIndex === stageIndex}
                        onPress={() => setStageIndex(chip.stageIndex)}
                        color={fedColor}
                      />
                    </View>
                  );
                }
                return (
                  <PathChip
                    key={chip.label}
                    chip={chip}
                    isActive={chip.stageIndex === stageIndex}
                    onPress={() => setStageIndex(chip.stageIndex)}
                    color={fedColor}
                  />
                );
              })}
            </ScrollView>
          </View>

          <Text style={s.footNote}>
            Group fixtures: FIFA 2026 official schedule (approximate).{'\n'}
            Knockout projection: Lili simulation · not confirmed opponents.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  content: { paddingHorizontal: 16, paddingBottom: 52 },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1D1D1F', marginBottom: 10 },
  emptySub: { fontSize: 15, color: '#8E8E93', textAlign: 'center', lineHeight: 22 },

  // Team hero
  teamHero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4, marginBottom: 16 },
  heroFlag: { fontSize: 52 },
  heroText: { flex: 1 },
  heroName: { fontSize: 22, fontWeight: '700', color: '#1D1D1F', marginBottom: 6 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroGroup: { fontSize: 13, color: '#6E6E73', fontWeight: '500' },
  heroStrength: { fontSize: 12, color: '#AEAEB2', fontWeight: '500' },

  // Scrubber card
  scrubberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  scrubberTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 20,
    marginBottom: 4,
  },
  scrubberInner: { paddingHorizontal: 20 },

  // Active card shared
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
  },
  activeCardDate: { flex: 1, fontSize: 13, color: '#6E6E73', fontWeight: '500' },
  activeCardTime: { fontSize: 12, color: '#AEAEB2' },

  // Group stage badge
  mdBadge: {
    backgroundColor: '#005F8E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mdBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  // Projected badge
  projectedCard: { borderWidth: 1.5, borderColor: '#E5E5EA', borderStyle: 'dashed' },
  projectedBadge: { backgroundColor: '#8E8E93' },
  projectedBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF', letterSpacing: 0.3 },
  simTag: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  simTagText: { fontSize: 9, fontWeight: '700', color: '#AEAEB2', letterSpacing: 0.5 },
  projectedNote: {
    fontSize: 11,
    color: '#AEAEB2',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingBottom: 14,
    marginTop: -4,
  },

  // Match layout
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 8,
  },
  teamBlock: { flex: 1, alignItems: 'center', gap: 5 },
  teamBlockRight: {},
  teamFlagLarge: { fontSize: 40 },
  teamNameLarge: { fontSize: 13, fontWeight: '600', color: '#1D1D1F', textAlign: 'center' },
  homeAwayLabel: {
    fontSize: 10,
    color: '#005F8E',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  vsText: { fontSize: 18, fontWeight: '700', color: '#C7C7CC', minWidth: 32, textAlign: 'center' },

  // Federation pill
  fedPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  fedPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // Lili prediction
  predSection: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F2F2F7',
  },
  predLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#AEAEB2',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 10,
  },
  probContainer: {},
  probBarRow: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  probSeg: { height: '100%' },
  probLabels: { flexDirection: 'row', gap: 14 },
  probLabel: { fontSize: 12, fontWeight: '600' },

  // Venue
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9F9FB',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F2F2F7',
  },
  venueFlag: { fontSize: 20 },
  stadiumText: { fontSize: 13, fontWeight: '600', color: '#1D1D1F' },
  cityText: { fontSize: 11, color: '#8E8E93', marginTop: 2 },

  // Lili insight
  insightBox: {
    backgroundColor: '#EEF4FA',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#005F8E',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  insightBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#005F8E',
    letterSpacing: 0.8,
  },
  insightRobot: { fontSize: 16 },
  insightText: { fontSize: 14, color: '#1D1D1F', lineHeight: 21 },

  // Path overview
  pathSection: { marginBottom: 16 },
  pathSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  pathChipsRow: { gap: 8, paddingBottom: 4 },
  pathChip: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    minWidth: 56,
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  pathChipProjected: { borderStyle: 'dashed', opacity: 0.85 },
  pathChipStage: { fontSize: 10, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.2 },
  pathChipFlag: { fontSize: 20 },
  pathChipProb: { fontSize: 10, fontWeight: '600' },
  pathChipWithSep: { alignItems: 'center', gap: 4 },
  pathSep: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  pathSepLine: { width: 12, height: 1, backgroundColor: '#E5E5EA' },
  pathSepLabel: { fontSize: 8, fontWeight: '600', color: '#C7C7CC', letterSpacing: 0.4 },

  footNote: {
    fontSize: 11,
    color: '#AEAEB2',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
