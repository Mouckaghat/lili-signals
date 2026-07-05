import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { buildStageInsight } from '../lib/journeyProjection';
import { buildMatchPredictions } from '../lib/wcSimulation';
import { buildFullBracket, type SlotSide } from '../lib/bracketModel';
import { SLOT_BY_MATCH, nextSlotForWinner } from '../lib/bracketStructure';
import type { KnockoutTie } from '../lib/knockoutModel';
import { liliProbs } from '../lib/marketComparison';
import { useLiveResults } from '../lib/useLiveResults';
import type { FixtureResult } from '../lib/fixtureResultsData';
import { KNOCKOUT_I18N, koT } from '../lib/knockoutI18n';
import type { StadiumInfo } from '../lib/stadiumData';
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
import FeatureIntro from '../components/FeatureIntro';
import { playerByPath } from '../lib/playerXI';
import { useLanguage } from '../contexts/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { fmtDate, fmtTime } from '../lib/fmt';

// ─── Scrubber stages ──────────────────────────────────────────────────────────

// 2026 has a Round of 32 as the first knockout round — the path now shows it so
// it's truthful (e.g. France really played Sweden in R32 before the R16).
const JOURNEY_STAGES: ScrubberStage[] = [
  { key: 'MD1',   label: 'MD 1'  },
  { key: 'MD2',   label: 'MD 2'  },
  { key: 'MD3',   label: 'MD 3'  },
  { key: 'R32',   label: 'R32'   },
  { key: 'R16',   label: 'R16'   },
  { key: 'QF',    label: 'QF'    },
  { key: 'SF',    label: 'SF'    },
  { key: 'Final', label: 'Final' },
];

const GROUP_STAGE_COUNT = 3; // MD1–MD3 are real group fixtures; index 3+ is the real knockout bracket

// ─── Real knockout path (replaces the old simulated projection) ────────────────
// The road past MD3 is now the REAL bracket, resolved live from buildFullBracket:
// actual opponents + results, never a name-hash simulation.

type KoRound = 'R32' | 'R16' | 'QF' | 'SF' | 'F';
type Outcome = 'W' | 'D' | 'L';
type KoState = 'won' | 'out' | 'live' | 'next' | 'unreached';

const KO_ROUNDS: KoRound[] = ['R32', 'R16', 'QF', 'SF', 'F'];
const KO_STAGE: Record<KoRound, number> = { R32: 3, R16: 4, QF: 5, SF: 6, F: 7 };

interface KoStep {
  round:      KoRound;
  stageIndex: number;            // 3..7 — lines up with JOURNEY_STAGES
  opponent:   SlotSide | null;   // resolved team / "A or B" / "Winner of Match X"; null once unreached
  outcome:    Outcome | null;    // the match result (dot colour) — only once finished
  state:      KoState;
  eliminated: boolean;           // this is where the journey ended (red cross)
  winPct:     number | null;     // Lili win probability vs a known opponent (0..1)
  matchNo:    number | null;
  stadium:    StadiumInfo | null;
  date:       string | null;
}

interface TeamRoad {
  steps:           KoStep[];        // always 5 (R32..F), padded with 'unreached'
  qualified:       boolean;         // reached the Round of 32 at all
  eliminatedStage: number | null;   // stageIndex where the cross sits (knockout exit)
}

function emptyRoad(): KoStep[] {
  return KO_ROUNDS.map((r) => ({
    round: r, stageIndex: KO_STAGE[r], opponent: null, outcome: null,
    state: 'unreached' as KoState, eliminated: false, winPct: null,
    matchNo: null, stadium: null, date: null,
  }));
}

// Walk the followed team through the resolved bracket: real opponent + result at
// every round it actually reached, then stop at its real next fixture. Nothing is
// projected — an unplayed round with a known opponent shows that opponent; a round
// whose opponent isn't decided yet shows "A or B" / "Winner of Match X".
function buildTeamRoad(teamName: string, live: Record<string, FixtureResult>): TeamRoad {
  const { r32, nodes } = buildFullBracket(live);
  const nodeByMatch = new Map(nodes.map((n) => [n.match, n]));
  const steps = emptyRoad();

  const r32tie = r32.find((t) => t.home?.name === teamName || t.away?.name === teamName) ?? null;
  if (!r32tie || r32tie.matchNo == null) return { steps, qualified: false, eliminatedStage: null };

  let match: number | null = r32tie.matchNo;
  let prevMatch: number | null = null;
  let eliminatedStage: number | null = null;

  for (let i = 0; i < KO_ROUNDS.length && match != null; i++) {
    const step = steps[i];
    step.matchNo = match;

    let tie: KnockoutTie | null;
    if (i === 0) {
      tie = r32tie;
      const teamIsHome = r32tie.home?.name === teamName;
      const oppForm = teamIsHome ? r32tie.away : r32tie.home;
      step.opponent = oppForm ? { kind: 'team', team: oppForm } : { kind: 'winner', fromMatch: match, round: 'R32' };
      step.stadium  = r32tie.stadium;
      step.date     = r32tie.fixture.date;
    } else {
      const slot = SLOT_BY_MATCH.get(match)!;
      const node = nodeByMatch.get(match) ?? null;
      tie = node?.tie ?? null;
      step.opponent = slot.feeds[0] === prevMatch ? node?.sideB ?? null : node?.sideA ?? null;
      step.stadium  = node?.stadium ?? null;
      step.date     = slot.date;
    }

    if (step.opponent?.kind === 'team') {
      step.winPct = liliProbs(teamName, step.opponent.team.name).home;
    }

    // Result + advancement.
    const teamIsHome = tie ? tie.home?.name === teamName : false;
    if (tie && tie.status === 'FINISHED' && tie.result) {
      const my = teamIsHome ? tie.result.home : tie.result.away;
      const op = teamIsHome ? tie.result.away : tie.result.home;
      step.outcome = my > op ? 'W' : my < op ? 'L' : 'D';   // dot = the match result (level = draw)
      const wonTie = tie.winner === (teamIsHome ? 'home' : 'away');  // advancement incl. ET/pens
      if (wonTie) {
        step.state = 'won';
        prevMatch = match;
        const nx = nextSlotForWinner(match);
        match = nx ? nx.match : null;
        continue;
      }
      step.state = 'out';
      step.eliminated = true;
      eliminatedStage = step.stageIndex;   // red cross here
      break;
    }

    // Not finished: this is the team's real next fixture (or a live one). Stop —
    // everything past the next real game stays honestly "unreached".
    step.state = tie && tie.status === 'LIVE' ? 'live' : 'next';
    break;
  }

  return { steps, qualified: true, eliminatedStage };
}

// The two possible teams / "Winner of Match X" for a still-undecided opponent.
function sideDisplay(
  side: SlotSide | null,
  kt: typeof KNOCKOUT_I18N['EN'],
): { flag: string; name: string; tbd: boolean } {
  if (!side) return { flag: '❓', name: kt.toBeDecided, tbd: true };
  if (side.kind === 'team') return { flag: side.team.flag, name: side.team.name, tbd: false };
  if (side.kind === 'pair') {
    const { a, b } = side;
    const name = a && b ? `${a.name} ${kt.orWord} ${b.name}` : (a?.name ?? b?.name ?? kt.toBeDecided);
    return { flag: `${a?.flag ?? '🏳'}${b ? '/' + b.flag : ''}`, name, tbd: true };
  }
  return { flag: '🏆', name: koT(kt.winnerOfMatch, { n: side.fromMatch }), tbd: true };
}

// W / D / L for a finished group fixture, from the followed team's perspective.
function groupOutcome(fixture: WCFixture, teamName: string, live: Record<string, FixtureResult>): Outcome | null {
  const r = live[`${fixture.home}|${fixture.away}`];
  if (!r || r.status !== 'FINISHED' || r.homeScore == null || r.awayScore == null) return null;
  if (r.homeScore === r.awayScore) return 'D';
  const teamIsHome = fixture.home === teamName;
  const my = teamIsHome ? r.homeScore : r.awayScore;
  const op = teamIsHome ? r.awayScore : r.homeScore;
  return my > op ? 'W' : 'L';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countryFlag(country: 'USA' | 'Canada' | 'Mexico') {
  if (country === 'USA') return '🇺🇸';
  if (country === 'Canada') return '🇨🇦';
  return '🇲🇽';
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
  i18n,
}: {
  fixture: WCFixture;
  teamName: string;
  win: number;
  draw: number;
  loss: number;
  i18n: ReturnType<typeof useLanguage>['i18n'];
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
          <Text style={s.homeAwayLabel}>{homeGame ? i18n.homeMatch : i18n.awayMatch}</Text>
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
        <Text style={s.predLabel}>{i18n.liliPrediction}</Text>
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

// ─── Active Knockout Card (real bracket) ──────────────────────────────────────

// Small win-probability bar (knockouts advance, so there's no draw segment).
function WinBar({ win }: { win: number }) {
  return (
    <View style={s.probBarRow}>
      <View style={[s.probSeg, { flex: win, backgroundColor: '#34C759' }]} />
      <View style={[s.probSeg, { flex: 1 - win, backgroundColor: 'rgba(255,255,255,0.10)' }]} />
    </View>
  );
}

const KO_BADGE: Record<KoState, { txt: (kt: typeof KNOCKOUT_I18N['EN']) => string; bg: string; fg: string }> = {
  won:       { txt: (kt) => kt.stateThrough,   bg: 'rgba(52,199,89,0.16)',  fg: '#34C759' },
  out:       { txt: (kt) => kt.stateOut,       bg: 'rgba(255,59,48,0.16)',  fg: '#FF3B30' },
  live:      { txt: (kt) => kt.live,           bg: 'rgba(255,59,48,0.16)',  fg: '#FF6B60' },
  next:      { txt: (kt) => kt.stateNext,      bg: 'rgba(74,158,255,0.16)', fg: '#4A9EFF' },
  unreached: { txt: (kt) => kt.statePotential, bg: 'rgba(122,144,184,0.14)', fg: '#7A90B8' },
};

function KnockoutStageCard({
  step, team, kt, i18n,
}: {
  step: KoStep;
  team: WCTeam;
  kt: typeof KNOCKOUT_I18N['EN'];
  i18n: ReturnType<typeof useLanguage>['i18n'];
}) {
  const opp     = sideDisplay(step.opponent, kt);
  const badge   = KO_BADGE[step.state];
  const roundLbl = kt.rounds[step.round];
  const showBar = step.winPct != null && (step.state === 'next' || step.state === 'live');

  return (
    <View style={[s.activeCard, step.state === 'unreached' && s.projectedCard]}>
      {/* Header */}
      <View style={s.activeCardHeader}>
        <View style={[s.mdBadge, s.projectedBadge]}>
          <Text style={s.projectedBadgeText}>{roundLbl.toUpperCase()}</Text>
        </View>
        <Text style={s.activeCardDate}>{step.date ? fmtDate(step.date) : ''}</Text>
        <View style={[s.koStateBadge, { backgroundColor: badge.bg }]}>
          <Text style={[s.koStateText, { color: badge.fg }]}>{badge.txt(kt)}</Text>
        </View>
      </View>

      {/* Match */}
      <View style={s.matchRow}>
        <View style={s.teamBlock}>
          <Text style={s.teamFlagLarge}>{team.flag}</Text>
          <Text style={s.teamNameLarge} numberOfLines={1}>{team.name}</Text>
          {step.outcome ? (
            <View style={[s.resultDot, s.resultDotLg, dotStyle(step.outcome)]} />
          ) : (
            <Text style={s.homeAwayLabel}>{i18n.neutralMatch}</Text>
          )}
        </View>

        <Text style={s.vsText}>vs</Text>

        <View style={[s.teamBlock, s.teamBlockRight]}>
          <Text style={[s.teamFlagLarge, opp.tbd && s.teamFlagTbd]}>{opp.flag}</Text>
          <Text style={[s.teamNameLarge, opp.tbd && s.tbdName]} numberOfLines={2}>{opp.name}</Text>
        </View>
      </View>

      {/* Lili win probability (only for an upcoming/live game vs a known opponent) */}
      {showBar ? (
        <View style={s.predSection}>
          <Text style={s.predLabel}>{i18n.liliPrediction}</Text>
          <WinBar win={step.winPct!} />
          <Text style={[s.probLabel, { color: '#34C759', marginTop: 6 }]}>W {pct(step.winPct!)}</Text>
        </View>
      ) : null}

      {/* Venue */}
      {step.stadium ? (
        <View style={s.venueRow}>
          <Text style={s.venueFlag}>{step.stadium.flag}</Text>
          <View>
            <Text style={s.stadiumText}>{step.stadium.name}</Text>
            <Text style={s.cityText}>{step.stadium.city} · {step.stadium.country}</Text>
          </View>
        </View>
      ) : null}

      {/* Honest note for a not-yet-reached round */}
      {step.state === 'unreached' ? (
        <Text style={s.projectedNote}>{kt.statePotential}</Text>
      ) : null}
    </View>
  );
}

// ─── Lili Insight Box ─────────────────────────────────────────────────────────

function LiliInsightBox({ text, label }: { text: string; label: string }) {
  return (
    <View style={s.insightBox}>
      <View style={s.insightHeader}>
        <Text style={s.insightBadge}>{label}</Text>
        <Text style={s.insightRobot}>🤖</Text>
      </View>
      <Text style={s.insightText}>{text}</Text>
    </View>
  );
}

// ─── Full Path (real bracket, full-width aligned grid) ─────────────────────────

// One node of the whole road: the group nodes (MD1–MD3) and the knockout nodes
// (R32→Final) share the same 8-column grid so the row lines up exactly under the
// World Cup Path above it.
interface PathNode {
  stageIndex: number;
  label:      string;         // MD1 / R32 / QF …
  flag:       string;         // opponent flag, or '?' when undecided
  tbd:        boolean;
  winPct:     number | null;  // Lili win probability (0..1) or null
  outcome:    Outcome | null; // W/D/L dot once played
  live:       boolean;
  dead:       boolean;        // after elimination / never reached
  eliminated: boolean;        // this node carries the red cross
}

function dotStyle(o: Outcome | null) {
  if (o === 'W') return s.dotW;
  if (o === 'D') return s.dotD;
  if (o === 'L') return s.dotL;
  return s.dotPending;
}

function FullPathCell({
  node, isActive, onPress, color,
}: {
  node: PathNode;
  isActive: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <TouchableOpacity
      style={[
        s.fpCell,
        node.stageIndex >= GROUP_STAGE_COUNT && s.fpCellKnock,
        isActive && { borderColor: color, backgroundColor: `${color}18` },
        node.dead && s.fpCellDead,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {node.eliminated ? <Text style={s.fpCross}>✗</Text> : null}
      <Text style={[s.fpRound, isActive && { color }]}>{node.label}</Text>
      <Text style={[s.fpFlag, node.tbd && s.fpFlagTbd]}>{node.flag}</Text>
      <Text style={[s.fpPct, isActive && { color }]}>
        {node.winPct != null ? `W${Math.round(node.winPct * 100)}%` : '—'}
      </Text>
      {node.live
        ? <View style={[s.resultDot, s.dotLive]} />
        : <View style={[s.resultDot, dotStyle(node.outcome)]} />}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function JourneyScreen() {
  const [launched, setLaunched] = useState(false);
  const { i18n, lang } = useLanguage();
  const kt = KNOCKOUT_I18N[lang] ?? KNOCKOUT_I18N.EN;
  const liveResults = useLiveResults();
  const { favTeam, setFavTeam, ready } = useProfile();
  const [team, setTeam]           = useState<WCTeam | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  // Hydrate the journey from the saved favourite team once storage has loaded,
  // so the followed team persists across app restarts (and stays in sync with
  // the Dashboard / Team Rankings highlight). Only seeds when nothing's picked.
  useEffect(() => {
    if (ready && !team && favTeam) {
      const t = getTeam(favTeam);
      if (t) setTeam(t);
    }
  }, [ready, favTeam]);

  // Derive all journey data when team changes
  const groupFixtures = useMemo(
    () => (team ? getTeamFixtures(team.name) : []),
    [team]
  );
  const groupPredictions = useMemo(
    () => (team ? buildMatchPredictions(team.name) : []),
    [team]
  );
  // The REAL knockout road (opponents + results, live-resolved from the bracket).
  const road = useMemo(
    () => (team ? buildTeamRoad(team.name, liveResults) : null),
    [team, liveResults]
  );
  // Group W/D/L for the dots.
  const groupOutcomes = useMemo(
    () => (team ? groupFixtures.map((f) => groupOutcome(f, team.name, liveResults)) : []),
    [team, groupFixtures, liveResults]
  );
  // The active knockout step for the selected stage (3..7 → R32..Final).
  const activeStep = stageIndex >= GROUP_STAGE_COUNT ? road?.steps[stageIndex - GROUP_STAGE_COUNT] ?? null : null;

  const handleTeamSelect = (t: WCTeam) => {
    setTeam(t);
    setStageIndex(0);
    setFavTeam(t.name); // persist as the global favourite so it lights up elsewhere
  };

  // Lili insight — group stage only (the knockout card carries its own real read).
  const liliInsight = useMemo(() => {
    if (!team || stageIndex >= GROUP_STAGE_COUNT) return '';
    const fixture = groupFixtures[stageIndex];
    const pred    = groupPredictions[stageIndex];
    if (!fixture || !pred) return '';
    const oppName = getOpponent(fixture, team.name);
    const opp     = getTeam(oppName);
    return buildStageInsight(team, stageIndex, oppName, opp?.strength ?? 65, pred.winProb, false, i18n);
  }, [team, stageIndex, groupFixtures, groupPredictions, i18n]);

  // Whether the whole group stage is done (used to place the "out in the group" cross).
  const groupFinished = groupOutcomes.length > 0 && groupOutcomes.every((o) => o != null);
  const groupExitStage = road && !road.qualified && groupFinished ? GROUP_STAGE_COUNT - 1 : null;

  // Build the full-path nodes: 3 group + 5 knockout, one aligned 8-column row.
  const pathNodes: PathNode[] = useMemo(() => {
    if (!team || !road) return [];
    const nodes: PathNode[] = [];

    groupFixtures.forEach((f, i) => {
      const oppName = getOpponent(f, team.name);
      const opp = getTeam(oppName);
      nodes.push({
        stageIndex: i,
        label: `MD${i + 1}`,
        flag: opp?.flag ?? '🏳',
        tbd: false,
        winPct: groupPredictions[i]?.winProb ?? null,
        outcome: groupOutcomes[i] ?? null,
        live: false,
        dead: false,
        eliminated: groupExitStage === i,
      });
    });

    // Once the team is out (in the group or a knockout), every round it never
    // reached is greyed "dead". While it's still alive, an unreached round is just
    // "future" (rendered normally with a hollow dot + "?").
    const teamOut = groupExitStage != null || road.steps.some((st) => st.state === 'out');
    road.steps.forEach((step) => {
      const side = step.opponent ? sideDisplay(step.opponent, kt) : null;
      const isUnreached = step.state === 'unreached';
      nodes.push({
        stageIndex: step.stageIndex,
        label: step.round,
        flag: isUnreached ? '?' : side?.flag ?? '?',
        tbd: isUnreached || (side?.tbd ?? false),
        winPct: step.winPct,
        outcome: step.outcome,
        live: step.state === 'live',
        dead: isUnreached && teamOut,
        eliminated: step.eliminated,
      });
    });

    return nodes;
  }, [team, road, groupFixtures, groupPredictions, groupOutcomes, groupExitStage, kt]);

  const fedColor = team ? FED_COLOR[team.federation] : '#4A9EFF';

  if (!launched) return (
    <>
      <Stack.Screen options={{ title: i18n.titleJourney, headerShown: false }} />
      <FeatureIntro player={playerByPath('/journey')!} onLaunch={() => setLaunched(true)} />
    </>
  );

  return (
    <>
      <Stack.Screen options={{ title: i18n.titleJourney, headerShown: true }} />
      <SafeAreaView style={s.safe} edges={['bottom']}>
      {/* Team picker trigger */}
      <TeamPickerTrigger
        team={team}
        onPress={() => setPickerOpen(true)}
        placeholder={i18n.selectTeam}
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
          <Text style={s.emptyTitle}>{i18n.chooseNationTitle}</Text>
          <Text style={s.emptySub}>{i18n.chooseNationSub}</Text>
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
                <Text style={s.heroGroup}>{i18n.group} {team.group}</Text>
                <Text style={s.heroStrength}>STR {team.strength}</Text>
              </View>
            </View>
          </View>

          {/* Future scrubber */}
          <View style={s.scrubberCard}>
            <Text style={s.scrubberTitle}>{i18n.worldCupPath}</Text>
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
                i18n={i18n}
              />
            ) : (
              <View style={s.noDataCard}>
                <Text style={s.noDataText}>{i18n.selectTeam}</Text>
              </View>
            )
          ) : (
            activeStep ? (
              <KnockoutStageCard step={activeStep} team={team} kt={kt} i18n={i18n} />
            ) : (
              <View style={s.noDataCard}>
                <Text style={s.noDataText}>{i18n.chooseNationSub}</Text>
              </View>
            )
          )}

          {/* Lili insight */}
          {liliInsight ? <LiliInsightBox text={liliInsight} label={i18n.liliInsightLabel} /> : null}

          {/* Full path — one full-width row aligned to the World Cup Path above */}
          <View style={s.pathSection}>
            <Text style={s.pathSectionLabel}>{i18n.fullPath}</Text>
            <View style={s.fpGrid}>
              {pathNodes.map((node) => (
                <FullPathCell
                  key={node.stageIndex}
                  node={node}
                  isActive={node.stageIndex === stageIndex}
                  onPress={() => setStageIndex(node.stageIndex)}
                  color={fedColor}
                />
              ))}
            </View>
          </View>

          <Text style={s.footNote}>{i18n.groupFixturesFootnote}</Text>
        </ScrollView>
      )}
    </SafeAreaView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050810' },
  content: { paddingHorizontal: 16, paddingBottom: 52 },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#EEF2FF', marginBottom: 10 },
  emptySub: { fontSize: 15, color: '#7A90B8', textAlign: 'center', lineHeight: 22 },

  // Team hero
  teamHero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4, marginBottom: 16 },
  heroFlag: { fontSize: 52 },
  heroText: { flex: 1 },
  heroName: { fontSize: 22, fontWeight: '700', color: '#EEF2FF', marginBottom: 6 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroGroup: { fontSize: 13, color: '#7A90B8', fontWeight: '500' },
  heroStrength: { fontSize: 12, color: '#374F7A', fontWeight: '500' },

  // Scrubber card
  scrubberCard: {
    backgroundColor: '#0E1933',
    borderRadius: 16,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  scrubberTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A90B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 20,
    marginBottom: 4,
  },
  scrubberInner: { paddingHorizontal: 20 },

  // Active card shared
  activeCard: {
    backgroundColor: '#0E1933',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
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
    borderBottomColor: 'rgba(80,140,255,0.10)',
  },
  activeCardDate: { flex: 1, fontSize: 13, color: '#7A90B8', fontWeight: '500' },
  activeCardTime: { fontSize: 12, color: '#374F7A' },

  // Group stage badge
  mdBadge: {
    backgroundColor: '#4A9EFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mdBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  // Projected badge
  projectedCard: { borderWidth: 1.5, borderColor: 'rgba(80,140,255,0.15)', borderStyle: 'dashed' },
  projectedBadge: { backgroundColor: '#374F7A' },
  projectedBadgeText: { fontSize: 10, fontWeight: '700', color: '#EEF2FF', letterSpacing: 0.3 },
  simTag: {
    backgroundColor: '#0B1426',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  simTagText: { fontSize: 9, fontWeight: '700', color: '#374F7A', letterSpacing: 0.5 },
  projectedNote: {
    fontSize: 11,
    color: '#374F7A',
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
  teamNameLarge: { fontSize: 13, fontWeight: '600', color: '#EEF2FF', textAlign: 'center' },
  homeAwayLabel: {
    fontSize: 10,
    color: '#4A9EFF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  vsText: { fontSize: 18, fontWeight: '700', color: '#374F7A', minWidth: 32, textAlign: 'center' },

  // Federation pill
  fedPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  fedPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // Lili prediction
  predSection: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(80,140,255,0.10)',
  },
  predLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#374F7A',
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
    backgroundColor: '#0B1426',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(80,140,255,0.10)',
  },
  venueFlag: { fontSize: 20 },
  stadiumText: { fontSize: 13, fontWeight: '600', color: '#EEF2FF' },
  cityText: { fontSize: 11, color: '#7A90B8', marginTop: 2 },

  // Lili insight
  insightBox: {
    backgroundColor: 'rgba(74,158,255,0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4A9EFF',
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
    color: '#4A9EFF',
    letterSpacing: 0.8,
  },
  insightRobot: { fontSize: 16 },
  insightText: { fontSize: 14, color: '#EEF2FF', lineHeight: 21 },

  // Path overview
  pathSection: { marginBottom: 16 },
  pathSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A90B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  // Full-path grid — 8 equal columns, aligned under the World Cup Path scrubber.
  fpGrid: { flexDirection: 'row', gap: 3 },
  fpCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#0E1933',
    minHeight: 92,
    gap: 4,
  },
  fpCellKnock: { backgroundColor: 'rgba(74,158,255,0.05)' },
  fpCellDead: { opacity: 0.34 },
  fpCross: {
    position: 'absolute', top: 3, right: 4,
    fontSize: 12, fontWeight: '900', color: '#FF3B30',
  },
  fpRound: { fontSize: 8.5, fontWeight: '800', color: '#7A90B8', letterSpacing: 0.2 },
  fpFlag: { fontSize: 19, lineHeight: 22 },
  fpFlagTbd: { fontSize: 12, color: '#374F7A', fontWeight: '800' },
  fpPct: { fontSize: 9.5, fontWeight: '700', color: '#7A90B8', fontVariant: ['tabular-nums'] },

  // Result dots (shared by the grid + the knockout card).
  resultDot: { width: 10, height: 10, borderRadius: 5, marginTop: 1 },
  resultDotLg: { width: 12, height: 12, borderRadius: 6, marginTop: 2 },
  dotW: { backgroundColor: '#34C759' },
  dotD: { backgroundColor: '#FF9F0A' },
  dotL: { backgroundColor: '#FF3B30' },
  dotLive: { backgroundColor: '#FF6B60' },
  dotPending: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#374F7A' },

  // Knockout active-card bits.
  koStateBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  koStateText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  teamFlagTbd: { fontSize: 26 },
  tbdName: { color: '#7A90B8', fontSize: 12 },

  footNote: {
    fontSize: 11,
    color: '#374F7A',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 4,
    fontStyle: 'italic',
  },

  noDataCard: {
    backgroundColor: 'rgba(80,140,255,0.06)',
    borderRadius: 14,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
  },
  noDataText: { fontSize: 13, color: '#374F7A', textAlign: 'center', lineHeight: 20 },
});
