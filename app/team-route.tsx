import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FutureScrubber, { type ScrubberStage } from '../components/FutureScrubber';
import { getProjectedKnockoutPath, type ProjectedMatch } from '../lib/journeyProjection';
import {
  computeCampaignStats,
  difficultyColor,
  getTransitionNote,
  STADIUM_ENV,
  travelDistanceKm,
} from '../lib/routeIntelligence';
import { ATMOSPHERE_COLOR, FIXTURE_STADIUM_ID, getStadium } from '../lib/stadiumData';
import { getTravelNote } from '../lib/travelNoteI18n';
import {
  FED_COLOR,
  getOpponent,
  getTeamFixtures,
  WC_TEAMS,
  type WCFixture,
  type WCTeam,
} from '../lib/wcData';
import { FIXTURE_RESULTS } from '../lib/fixtureResultsData';
import FeatureIntro from '../components/FeatureIntro';
import { playerByPath } from '../lib/playerXI';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Live result overlay ──────────────────────────────────────────────────────

function withResult(fixture: WCFixture): WCFixture {
  const r = FIXTURE_RESULTS[`${fixture.home}|${fixture.away}`];
  if (!r) return fixture;
  return { ...fixture, status: r.status, homeScore: r.homeScore ?? undefined, awayScore: r.awayScore ?? undefined };
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const D = {
  bg:          '#070B14',
  surface:     '#0C1428',
  card:        '#0F1C38',
  cardBorder:  'rgba(80,140,255,0.11)',
  blue:        '#4A9EFF',
  blueDim:     'rgba(74,158,255,0.18)',
  orange:      '#FF7B35',
  orangeGlow:  'rgba(255,123,53,0.22)',
  text1:       '#EEF2FF',
  text2:       '#7A90B8',
  text3:       '#374F7A',
  green:       '#34D399',
  red:         '#FF5B5B',
  separator:   'rgba(80,140,255,0.18)',
  gold:        '#D4A520',
};

// ─── Stage definitions ────────────────────────────────────────────────────────

const STAGES: ScrubberStage[] = [
  { key: 'MD1',   label: 'MD 1'  },
  { key: 'MD2',   label: 'MD 2'  },
  { key: 'MD3',   label: 'MD 3'  },
  { key: 'R16',   label: 'R16'   },
  { key: 'QF',    label: 'QF'    },
  { key: 'SF',    label: 'SF'    },
  { key: 'Final', label: 'Final' },
];
const GROUP_COUNT = 3;

// ─── Projected knockout venue assignments ─────────────────────────────────────
// Approximate real-tournament venue allocation for KO rounds

const KO_VENUES: Record<string, { stadiumName: string; city: string; stadiumId: string }> = {
  R16:   { stadiumName: 'AT&T Stadium',    city: 'Arlington, TX',        stadiumId: 'att'     },
  QF:    { stadiumName: 'SoFi Stadium',    city: 'Inglewood, CA',        stadiumId: 'sofi'    },
  SF:    { stadiumName: 'Hard Rock Stadium', city: 'Miami Gardens, FL',  stadiumId: 'hardrock'},
  Final: { stadiumName: 'MetLife Stadium', city: 'East Rutherford, NJ',  stadiumId: 'metlife' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pressureLabel(n: number, i18n: { pressureExtreme: string; pressureHigh: string; pressureMedium: string; pressureLow: string }): string {
  if (n >= 9) return i18n.pressureExtreme;
  if (n >= 7) return i18n.pressureHigh;
  if (n >= 5) return i18n.pressureMedium;
  return i18n.pressureLow;
}
function pressureColor(n: number): string {
  if (n >= 9) return D.red;
  if (n >= 7) return D.orange;
  if (n >= 5) return '#FFD60A';
  return D.green;
}
function countryFlag(c: string): string {
  if (c === 'USA') return '🇺🇸';
  if (c === 'Canada') return '🇨🇦';
  return '🇲🇽';
}
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDateTime(dateStr: string): string {
  // KO dates are approximate text e.g. '~July 1–4, 2026'
  if (!dateStr.match(/^\d{4}-/)) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  // Avoid all toLocale* APIs — unreliable on Hermes (React Native JS engine)
  const day   = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year  = d.getFullYear();
  const h     = String(d.getHours()).padStart(2, '0');
  const mn    = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}  ${h}:${mn}`;
}
function altLabel(m: number): string | null {
  if (m >= 2000) return `⬆ ${m.toLocaleString()}m altitude`;
  if (m >= 1200) return `⬆ ${m.toLocaleString()}m`;
  if (m >= 500)  return `↑ ${m}m`;
  return null;
}
function humidityIcon(h: string): string {
  if (h === 'Very High') return '💧💧';
  if (h === 'High')      return '💧';
  if (h === 'Moderate')  return '·';
  return '';
}

// ─── Pulse animation ──────────────────────────────────────────────────────────

function usePulse() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return anim;
}

// ─── Enriched stop type ───────────────────────────────────────────────────────

interface EnrichedStop {
  key: string;
  label: string;
  stadiumName: string;
  city: string;
  country: string;
  stadiumId: string;
  opponentFlag: string;
  opponentName: string;
  matchDate: string;
  isProjected: boolean;
  // Route intelligence
  altitudeM: number;
  avgTemp: number;
  humidityLabel: string;
  climateChallenge: number;
  altitudeChallenge: number;
  travelDistFromPrev: number;
  transitionNote: string;
  cumulativeFatigue: number;
  // Live result (undefined = not yet played)
  teamScore?: number;
  oppScore?:  number;
  winner?:    string | null;
}

// ─── Campaign Intelligence Card ───────────────────────────────────────────────

function CampaignCard({ stats, fedColor }: { stats: ReturnType<typeof computeCampaignStats>; fedColor: string }) {
  const { i18n } = useLanguage();
  const dc = difficultyColor(stats.difficultyLabel);
  const diffMap: Record<string, string> = {
    Comfortable: i18n.difficultyLabels.comfortable,
    Moderate:    i18n.difficultyLabels.moderate,
    Demanding:   i18n.difficultyLabels.demanding,
    Gruelling:   i18n.difficultyLabels.gruelling,
    Maximum:     i18n.difficultyLabels.maximum,
  };
  return (
    <View style={[cc.card, { borderColor: `${dc}25`, shadowColor: dc }]}>
      <View style={cc.headerRow}>
        <Text style={cc.cardTitle}>{i18n.campaignIntelligence}</Text>
        <View style={[cc.diffBadge, { borderColor: `${dc}50`, backgroundColor: `${dc}12` }]}>
          <Text style={[cc.diffLabel, { color: dc }]}>{(diffMap[stats.difficultyLabel] ?? stats.difficultyLabel).toUpperCase()}</Text>
        </View>
      </View>

      <View style={cc.metricsRow}>
        <View style={cc.metric}>
          <Text style={[cc.metricValue, { color: fedColor }]}>
            {stats.totalDistanceKm.toLocaleString()}
          </Text>
          <Text style={cc.metricLabel}>{i18n.kmTotal}</Text>
        </View>
        <View style={cc.metricDivider} />
        <View style={cc.metric}>
          <Text style={[cc.metricValue, { color: stats.maxAltitudeM > 1000 ? D.orange : D.text2 }]}>
            {stats.maxAltitudeM.toLocaleString()}
          </Text>
          <Text style={cc.metricLabel}>{i18n.maxAltM}</Text>
        </View>
        <View style={cc.metricDivider} />
        <View style={cc.metric}>
          <Text style={[cc.metricValue, { color: stats.climateTransitions > 2 ? D.orange : D.text2 }]}>
            {stats.climateTransitions}
          </Text>
          <Text style={cc.metricLabel}>{i18n.climateShifts}</Text>
        </View>
        <View style={cc.metricDivider} />
        <View style={cc.metric}>
          <Text style={[cc.metricValue, { color: dc }]}>{stats.cumulativeFatigue}</Text>
          <Text style={cc.metricLabel}>{i18n.fatigueLoad}</Text>
        </View>
      </View>

      {/* Difficulty bar */}
      <View style={cc.barSection}>
        <View style={cc.barTrack}>
          <View style={[cc.barFill, { width: `${stats.difficultyScore}%` as any, backgroundColor: dc }]} />
        </View>
        <Text style={[cc.barScore, { color: dc }]}>{stats.difficultyScore}/100</Text>
      </View>
    </View>
  );
}

const cc = StyleSheet.create({
  card: {
    backgroundColor: D.card,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
    gap: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 9, fontWeight: '700', color: D.text3, letterSpacing: 1.2 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  diffLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  metricsRow: { flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricDivider: { width: 1, height: 28, backgroundColor: D.separator },
  metricValue: { fontSize: 15, fontWeight: '700' },
  metricLabel: { fontSize: 7, color: D.text3, letterSpacing: 0.8, fontWeight: '600' },
  barSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2 },
  barScore: { fontSize: 10, fontWeight: '700', width: 38, textAlign: 'right' },
});

// ─── Stop dot ─────────────────────────────────────────────────────────────────

function StopDot({ active, past, isProjected, fedColor }: {
  active: boolean; past: boolean; isProjected: boolean; fedColor: string;
}) {
  const pulse = usePulse();
  if (active) {
    return (
      <View style={sr.dotWrapper}>
        <Animated.View style={[sr.dotRing, { borderColor: D.orange, transform: [{ scale: pulse }] }]} />
        <View style={[sr.dot, { backgroundColor: D.orange, shadowColor: D.orange }]} />
      </View>
    );
  }
  if (past) {
    return (
      <View style={sr.dotWrapper}>
        <View style={[sr.dot, { backgroundColor: fedColor, shadowColor: fedColor }]} />
      </View>
    );
  }
  return (
    <View style={sr.dotWrapper}>
      <View style={[sr.dot, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: isProjected ? D.text3 : D.separator }]} />
    </View>
  );
}

// ─── Transition strip (between stops) ────────────────────────────────────────

function TransitionStrip({ distKm, note }: { distKm: number; note: string }) {
  if (distKm === 0) return null;
  return (
    <View style={sr.transitionRow}>
      <View style={sr.transLineLeft} />
      <View style={sr.transContent}>
        <Text style={sr.transDistance}>✈ {distKm.toLocaleString()} km</Text>
        <Text style={sr.transNote} numberOfLines={2}>{note}</Text>
      </View>
      <View style={sr.transLineRight} />
    </View>
  );
}

// ─── Route stop card ──────────────────────────────────────────────────────────

function RouteStop({ stop, isFirst, isLast, active, past, fedColor, onPress }: {
  stop: EnrichedStop;
  isFirst: boolean;
  isLast: boolean;
  active: boolean;
  past: boolean;
  fedColor: string;
  onPress: () => void;
}) {
  const { i18n, lang } = useLanguage();
  const stadId = FIXTURE_STADIUM_ID[stop.stadiumName] ?? stop.stadiumId;
  const stad   = stadId ? getStadium(stadId) : undefined;
  const pi     = stad?.pressureIndex ?? stop.climateChallenge;
  const env    = STADIUM_ENV[stop.stadiumId];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={sr.stopRow}>
      {/* ── Line + dot column ── */}
      <View style={sr.lineCol}>
        <View style={[sr.lineSegment, isFirst && { opacity: 0 }]} />
        <StopDot active={active} past={past} isProjected={stop.isProjected} fedColor={fedColor} />
        <View style={[sr.lineSegment, isLast && { opacity: 0 }]} />
      </View>

      {/* ── Card ── */}
      <View style={[
        sr.stopCard,
        active       && { borderColor: D.orange,     shadowColor: D.orange,  shadowOpacity: 0.3 },
        past && !active && { borderColor: `${fedColor}28` },
        stop.isProjected && !active && { borderStyle: 'dashed' },
      ]}>
        {/* Stage + date row */}
        <View style={sr.cardTopRow}>
          <View style={[sr.stagePill, active && { backgroundColor: D.orangeGlow, borderColor: D.orange }]}>
            <Text style={[sr.stagePillText, active && { color: D.orange }]}>{stop.label}</Text>
          </View>
          {stop.isProjected && (
            <View style={sr.projBadge}>
              <Text style={sr.projBadgeText}>{i18n.projectedBadge}</Text>
            </View>
          )}
          <Text style={sr.stopDate}>{stop.matchDate}</Text>
        </View>

        {/* Stadium */}
        <Text style={[sr.stadiumName, active && { color: D.text1 }]}>{stop.stadiumName}</Text>
        <Text style={sr.stadiumCity}>{countryFlag(stop.country)} {stop.city}</Text>

        {/* Opponent */}
        <View style={sr.opponentRow}>
          <Text style={sr.vsText}>vs</Text>
          <Text style={sr.oppFlag}>{stop.opponentFlag}</Text>
          <Text style={[sr.oppName, active && { color: D.text1 }]}>{stop.opponentName}</Text>
        </View>

        {/* Pressure */}
        {stad && (
          <View style={sr.presSection}>
            <View style={sr.presRow}>
              <Text style={sr.presTitle}>{i18n.atmosphereTags[stad.atmosphereTag]} {i18n.atmosphereLabel}</Text>
              <View style={sr.presTrack}>
                <View style={[sr.presFill, { width: `${pi * 10}%` as any, backgroundColor: pressureColor(pi) }]} />
              </View>
              <Text style={[sr.presLabel, { color: pressureColor(pi) }]}>{pressureLabel(pi, i18n)}</Text>
            </View>
          </View>
        )}

        {/* ── Environmental intelligence ── */}
        {env && (
          <View style={sr.envSection}>
            <View style={sr.envRow}>
              {/* Temperature */}
              <View style={sr.envCell}>
                <Text style={sr.envIcon}>🌡</Text>
                <Text style={[sr.envValue, env.climateChallenge >= 7 && { color: D.orange }]}>
                  {env.avgTempJune}°C
                </Text>
              </View>
              {/* Humidity */}
              <View style={sr.envCell}>
                <Text style={sr.envIcon}>💧</Text>
                <Text style={[sr.envValue, env.humidityLabel === 'Very High' && { color: D.orange }]}>
                  {i18n.humidityValues[env.humidityLabel]}
                </Text>
              </View>
              {/* Altitude — only if significant */}
              {env.altitudeM >= 400 && (
                <View style={sr.envCell}>
                  <Text style={sr.envIcon}>⬆</Text>
                  <Text style={[sr.envValue, env.altitudeChallenge >= 6 && { color: D.orange }]}>
                    {env.altitudeM.toLocaleString()}m
                  </Text>
                </View>
              )}
              {/* Climate challenge badge */}
              {env.climateChallenge >= 7 && (
                <View style={[sr.envAlert, { borderColor: `${D.orange}40`, backgroundColor: `${D.orange}10` }]}>
                  <Text style={[sr.envAlertText, { color: D.orange }]}>
                    {env.altitudeChallenge >= 7 ? i18n.altitudeRisk : i18n.heatRisk}
                  </Text>
                </View>
              )}
            </View>

            {/* Venue intelligence note — shown when active */}
            {active && env.travelNote ? (
              <Text style={sr.envNote}>{getTravelNote(env.id, lang)}</Text>
            ) : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const sr = StyleSheet.create({
  // Stop row
  stopRow: { flexDirection: 'row', minHeight: 130 },
  lineCol: { width: 44, alignItems: 'center' },
  lineSegment: { flex: 1, width: 2, backgroundColor: D.separator },
  dotWrapper: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  dotRing: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 1.5 },
  dot: { width: 12, height: 12, borderRadius: 6, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 8, elevation: 6 },

  // Card
  stopCard: {
    flex: 1,
    backgroundColor: D.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: D.cardBorder,
    padding: 14,
    marginVertical: 8,
    marginRight: 4,
    shadowColor: D.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 6,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stagePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: D.separator, backgroundColor: D.surface },
  stagePillText: { fontSize: 10, fontWeight: '700', color: D.text2, letterSpacing: 0.5 },
  projBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(74,158,255,0.12)', borderWidth: 1, borderColor: 'rgba(74,158,255,0.25)' },
  projBadgeText: { fontSize: 8, fontWeight: '700', color: D.blue, letterSpacing: 0.8 },
  stopDate: { marginLeft: 'auto' as any, fontSize: 11, color: D.text3 },
  stadiumName: { fontSize: 15, fontWeight: '700', color: D.text2 },
  stadiumCity: { fontSize: 12, color: D.text3 },
  opponentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vsText: { fontSize: 11, color: D.text3 },
  oppFlag: { fontSize: 16 },
  oppName: { fontSize: 14, fontWeight: '600', color: D.text2 },

  // Pressure
  presSection: { marginTop: 2 },
  presRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  presTitle: { fontSize: 9, color: D.text3, letterSpacing: 0.4, fontWeight: '600', width: 90 },
  presTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  presFill: { height: 3, borderRadius: 2 },
  presLabel: { fontSize: 10, fontWeight: '700', width: 46, textAlign: 'right' },

  // Environment
  envSection: { borderTopWidth: 1, borderTopColor: 'rgba(80,140,255,0.08)', paddingTop: 8, gap: 6 },
  envRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  envCell: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  envIcon: { fontSize: 11 },
  envValue: { fontSize: 11, color: D.text3, fontWeight: '500' },
  envAlert: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  envAlertText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  envNote: { fontSize: 12, color: D.text2, lineHeight: 18, fontStyle: 'italic' },

  // Transition
  transitionRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, gap: 10 },
  transLineLeft: { width: 1, height: '100%' as any, backgroundColor: D.separator, marginTop: 6, marginLeft: 20 },
  transContent: { flex: 1, gap: 2 },
  transLineRight: { display: 'none' },
  transDistance: { fontSize: 10, color: D.blue, fontWeight: '700', letterSpacing: 0.3 },
  transNote: { fontSize: 11, color: D.text3, lineHeight: 16 },
});

// ─── Team chip ────────────────────────────────────────────────────────────────

function TeamChip({ team, active, onPress }: { team: WCTeam; active: boolean; onPress: () => void }) {
  const fedColor = FED_COLOR[team.federation];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[tc.chip, active && { borderColor: fedColor, backgroundColor: `${fedColor}22` }]}
    >
      <Text style={tc.chipFlag}>{team.flag}</Text>
      <Text style={[tc.chipName, active && { color: D.text1, fontWeight: '600' }]}>{team.name}</Text>
    </TouchableOpacity>
  );
}

const tc = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: D.cardBorder, backgroundColor: D.surface },
  chipFlag: { fontSize: 14 },
  chipName: { fontSize: 12, color: D.text2 },
});

function LiliInsightBlock({ team, stageKey, stats }: {
  team: WCTeam;
  stageKey: string;
  stats: ReturnType<typeof computeCampaignStats>;
}) {
  const { i18n } = useLanguage();
  const fedColor = FED_COLOR[team.federation];
  const template = (i18n.routeStageInsights as Record<string, string>)[stageKey]
    ?? i18n.routeStageInsights.MD1;
  const insight  = template.replace('{team}', team.name);
  const dc = difficultyColor(stats.difficultyLabel);
  const diffMap: Record<string, string> = {
    Comfortable: i18n.difficultyLabels.comfortable,
    Moderate:    i18n.difficultyLabels.moderate,
    Demanding:   i18n.difficultyLabels.demanding,
    Gruelling:   i18n.difficultyLabels.gruelling,
    Maximum:     i18n.difficultyLabels.maximum,
  };

  return (
    <View style={[li.box, { borderLeftColor: fedColor }]}>
      <View style={li.header}>
        <View style={li.logoClip}>
          <Image source={require('../assets/blue_lobster.png')} style={li.logo} resizeMode="contain" />
        </View>
        <View>
          <Text style={li.title}>{i18n.liliRouteIntelTitle}</Text>
          <Text style={li.subtitle}>{team.flag}  {team.name} · {team.group} {i18n.group}</Text>
        </View>
      </View>

      <Text style={li.text}>{insight}</Text>

      <View style={li.diffRow}>
        <Text style={li.diffPrefix}>{i18n.campaignDifficultyPrefix}</Text>
        <Text style={[li.diffValue, { color: dc }]}>{diffMap[stats.difficultyLabel] ?? stats.difficultyLabel}</Text>
        <Text style={[li.diffScore, { color: dc }]}> ({stats.difficultyScore}/100)</Text>
      </View>
    </View>
  );
}

const li = StyleSheet.create({
  box: { marginTop: 16, marginBottom: 8, backgroundColor: D.surface, borderRadius: 14, borderWidth: 1, borderColor: D.cardBorder, borderLeftWidth: 3, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoClip: { width: 30, height: 30, borderRadius: 15, overflow: 'hidden' },
  logo: { width: 30, height: 30 },
  title: { fontSize: 12, fontWeight: '700', color: D.text2, letterSpacing: 0.3 },
  subtitle: { fontSize: 11, color: D.text3, marginTop: 1 },
  text: { fontSize: 13, color: D.text2, lineHeight: 20 },
  diffRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  diffPrefix: { fontSize: 11, color: D.text3 },
  diffValue: { fontSize: 11, fontWeight: '700' },
  diffScore: { fontSize: 11 },
});

// ─── Lili Prediction Block ───────────────────────────────────────────────────

function LiliPredictionBlock({ team, stop }: { team: WCTeam; stop: EnrichedStop }) {
  const { i18n } = useLanguage();
  const fedColor = FED_COLOR[team.federation];
  const opponent = WC_TEAMS.find((t) => t.name === stop.opponentName);
  const diff     = team.strength - (opponent?.strength ?? 65);
  const absDiff  = Math.abs(diff);

  // Probabilities
  const drawPct  = Math.max(Math.round(28 - absDiff * 0.6), 8);
  const remaining = 100 - drawPct;
  const favFrac  = Math.min(Math.max(0.5 + absDiff * 0.008, 0.3), 0.88);
  const favPct   = Math.round(remaining * favFrac);
  const underPct = remaining - favPct;
  const winPct   = diff >= 0 ? favPct  : underPct;
  const lossPct  = diff >= 0 ? underPct : favPct;

  // Predicted score
  const predFor     = diff > 15 ? 2 : diff > 5 ? 2 : diff > 0 ? 1 : diff >= -5 ? 1 : 0;
  const predAgainst = diff > 15 ? 0 : diff > 5 ? 1 : diff > 0 ? 0 : diff >= -5 ? 1 : diff > -15 ? 1 : 2;

  const signalLabel = diff > 15 ? i18n.signalStrongWin : diff > 5 ? i18n.signalWinProbable : diff >= -5 ? i18n.signalBalanced : i18n.signalUnderdog;
  const signalColor = diff > 5 ? D.green : diff >= -5 ? '#C8962A' : D.red;

  const probs = [
    { label: 'WIN',  pct: winPct,  color: D.green   },
    { label: 'DRAW', pct: drawPct, color: '#C8962A'  },
    { label: 'LOSS', pct: lossPct, color: D.red      },
  ];

  return (
    <View style={[lp.box, { borderLeftColor: fedColor }]}>
      <View style={lp.header}>
        <View style={lp.logoClip}>
          <Image source={require('../assets/blue_lobster.png')} style={lp.logo} resizeMode="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={lp.title}>Lili Prediction</Text>
          <Text style={lp.subtitle}>{stop.label} · {team.flag} vs {stop.opponentFlag}</Text>
        </View>
        <View style={lp.scorePred}>
          <Text style={[lp.scorePredNum, { color: fedColor }]}>{predFor}–{predAgainst}</Text>
          <Text style={lp.scorePredLabel}>predicted</Text>
        </View>
      </View>

      <View style={[lp.signalBadge, { borderColor: `${signalColor}40`, backgroundColor: `${signalColor}12` }]}>
        <Text style={[lp.signalText, { color: signalColor }]}>{signalLabel}</Text>
      </View>

      <View style={lp.probSection}>
        {probs.map(({ label, pct, color }) => (
          <View key={label} style={lp.probRow}>
            <Text style={lp.probLabel}>{label}</Text>
            <View style={lp.probTrack}>
              <View style={[lp.probFill, { width: `${pct}%` as any, backgroundColor: color }]} />
            </View>
            <Text style={[lp.probPct, { color }]}>{pct}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const lp = StyleSheet.create({
  box: { marginBottom: 12, backgroundColor: D.surface, borderRadius: 14, borderWidth: 1, borderColor: D.cardBorder, borderLeftWidth: 3, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoClip: { width: 30, height: 30, borderRadius: 15, overflow: 'hidden' },
  logo: { width: 30, height: 30 },
  title: { fontSize: 12, fontWeight: '700', color: D.text2, letterSpacing: 0.3 },
  subtitle: { fontSize: 11, color: D.text3, marginTop: 1 },
  scorePred: { alignItems: 'center' },
  scorePredNum: { fontSize: 22, fontWeight: '800' },
  scorePredLabel: { fontSize: 8, color: D.text3, letterSpacing: 0.6 },
  signalBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  signalText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  probSection: { gap: 8 },
  probRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  probLabel: { fontSize: 9, fontWeight: '700', color: D.text3, letterSpacing: 0.8, width: 36 },
  probTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  probFill: { height: 4, borderRadius: 2 },
  probPct: { fontSize: 10, fontWeight: '700', width: 30, textAlign: 'right' },
});

// ─── Selected match card ──────────────────────────────────────────────────────

function SelectedMatchCard({ stop, fedColor, teamFlag, teamName }: {
  stop: EnrichedStop;
  fedColor: string;
  teamFlag: string;
  teamName: string;
}) {
  return (
    <View style={[sm.card, { borderColor: `${fedColor}30`, shadowColor: fedColor }]}>
      {/* Stage pill + date/time on the same row */}
      <View style={sm.topRow}>
        <View style={[sm.stagePill, { borderColor: `${fedColor}60`, backgroundColor: `${fedColor}18` }]}>
          <Text style={[sm.stageText, { color: fedColor }]}>{stop.label}</Text>
        </View>
        {stop.isProjected && (
          <View style={sm.projBadge}>
            <Text style={sm.projText}>PROJECTED</Text>
          </View>
        )}
        <Text style={sm.dateTimeText}>{fmtDateTime(stop.matchDate)}</Text>
      </View>

      {/* Stadium + city */}
      <Text style={sm.stadiumName}>{stop.stadiumName}</Text>
      <Text style={sm.cityText}>{countryFlag(stop.country)} {stop.city}</Text>

      {/* Scoreboard */}
      <View style={sm.matchRow}>
        <View style={sm.teamSide}>
          <Text style={sm.matchFlag}>{teamFlag}</Text>
          <Text style={[sm.matchTeam, { color: fedColor }]}>{teamName}</Text>
        </View>
        <View style={sm.scoreBox}>
          <Text style={sm.scoreNum}>{stop.teamScore ?? 0}</Text>
          <Text style={sm.scoreSep}>–</Text>
          <Text style={sm.scoreNum}>{stop.oppScore ?? 0}</Text>
        </View>
        <View style={sm.oppSide}>
          <Text style={sm.matchFlag}>{stop.opponentFlag}</Text>
          <Text style={sm.matchOpp}>{stop.opponentName}</Text>
        </View>
      </View>

      {stop.travelDistFromPrev > 0 && (
        <View style={sm.travelRow}>
          <Text style={sm.travelText}>✈ {stop.travelDistFromPrev.toLocaleString()} km from previous venue</Text>
        </View>
      )}
    </View>
  );
}

const sm = StyleSheet.create({
  card: {
    backgroundColor: D.card,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
    gap: 8,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stagePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  stageText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  projBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(74,158,255,0.12)', borderWidth: 1, borderColor: 'rgba(74,158,255,0.25)' },
  projText: { fontSize: 8, fontWeight: '700', color: D.blue, letterSpacing: 0.8 },
  stadiumName: { fontSize: 18, fontWeight: '700', color: D.text1 },
  cityText: { fontSize: 13, color: D.text3 },
  dateTimeText: { marginLeft: 'auto' as any, fontSize: 11, color: D.text2, fontWeight: '500', textAlign: 'right' },
  matchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  teamSide: { flex: 1, alignItems: 'flex-start', gap: 4 },
  oppSide: { flex: 1, alignItems: 'flex-end', gap: 4 },
  matchFlag: { fontSize: 30 },
  matchTeam: { fontSize: 13, fontWeight: '700' },
  matchOpp: { fontSize: 13, fontWeight: '600', color: D.text2, textAlign: 'right' },
  scoreBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  scoreNum: { fontSize: 34, fontWeight: '800', color: D.text1 },
  scoreSep: { fontSize: 22, fontWeight: '300', color: D.text3 },
  travelRow: { paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(80,140,255,0.08)', marginTop: 4 },
  travelText: { fontSize: 11, color: D.blue, fontWeight: '600' },
});

// ─── Stadium detail card ───────────────────────────────────────────────────────

function StadiumDetailCard({ stop }: { stop: EnrichedStop }) {
  const { i18n, lang } = useLanguage();
  const stadId = FIXTURE_STADIUM_ID[stop.stadiumName] ?? stop.stadiumId;
  const stad   = stadId ? getStadium(stadId) : undefined;
  const pi     = stad?.pressureIndex ?? stop.climateChallenge;
  const env    = STADIUM_ENV[stop.stadiumId];

  return (
    <View style={sd.card}>
      <Text style={sd.title}>{i18n.stadiumDetails}</Text>

      {stad && (
        <View style={sd.presRow}>
          <Text style={sd.presTitle}>{i18n.atmosphereTags[stad.atmosphereTag]} {i18n.atmosphereLabel}</Text>
          <View style={sd.presTrack}>
            <View style={[sd.presFill, { width: `${pi * 10}%` as any, backgroundColor: pressureColor(pi) }]} />
          </View>
          <Text style={[sd.presLabel, { color: pressureColor(pi) }]}>{pressureLabel(pi, i18n)}</Text>
        </View>
      )}

      {env && (
        <>
          <View style={sd.envRow}>
            <View style={sd.envCell}>
              <Text style={sd.envIcon}>🌡</Text>
              <Text style={[sd.envValue, env.climateChallenge >= 7 && { color: D.orange }]}>
                {env.avgTempJune}°C
              </Text>
              <Text style={sd.envLabel}>{i18n.juneTemp}</Text>
            </View>
            <View style={sd.envCell}>
              <Text style={sd.envIcon}>💧</Text>
              <Text style={[sd.envValue, env.humidityLabel === 'Very High' && { color: D.orange }]}>
                {i18n.humidityValues[env.humidityLabel]}
              </Text>
              <Text style={sd.envLabel}>{i18n.humidityLabel}</Text>
            </View>
            {stad?.capacity && (
              <View style={sd.envCell}>
                <Text style={sd.envIcon}>🏟️</Text>
                <Text style={sd.envValue}>
                  {stad.capacity >= 1000
                    ? `${Math.round(stad.capacity / 1000)}k`
                    : String(stad.capacity)}
                </Text>
                <Text style={sd.envLabel}>{i18n.capacityLabel}</Text>
              </View>
            )}
            {env.altitudeM >= 400 && (
              <View style={sd.envCell}>
                <Text style={sd.envIcon}>⬆</Text>
                <Text style={[sd.envValue, env.altitudeChallenge >= 6 && { color: D.orange }]}>
                  {env.altitudeM.toLocaleString()}m
                </Text>
                <Text style={sd.envLabel}>{i18n.altitudeLabel}</Text>
              </View>
            )}
            {env.climateChallenge >= 7 && (
              <View style={[sd.alertBadge, { borderColor: `${D.orange}40`, backgroundColor: `${D.orange}10` }]}>
                <Text style={[sd.alertText, { color: D.orange }]}>
                  {env.altitudeChallenge >= 7 ? i18n.altitudeRisk : i18n.heatRisk}
                </Text>
              </View>
            )}
          </View>
          {env.travelNote ? <Text style={sd.venueNote}>{getTravelNote(env.id, lang)}</Text> : null}
        </>
      )}

      {stop.travelDistFromPrev > 0 && (
        <View style={sd.distRow}>
          <Text style={sd.distLabel}>{i18n.distFromPrev}</Text>
          <Text style={sd.distValue}>✈ {stop.travelDistFromPrev.toLocaleString()} km</Text>
        </View>
      )}

      {stop.transitionNote ? <Text style={sd.transNote}>{stop.transitionNote}</Text> : null}
    </View>
  );
}

const sd = StyleSheet.create({
  card: {
    backgroundColor: D.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: D.cardBorder,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  title: { fontSize: 9, fontWeight: '700', color: D.text3, letterSpacing: 1.2 },
  presRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  presTitle: { fontSize: 9, color: D.text3, letterSpacing: 0.4, fontWeight: '600', width: 90 },
  presTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  presFill: { height: 3, borderRadius: 2 },
  presLabel: { fontSize: 10, fontWeight: '700', width: 46, textAlign: 'right' },
  envRow: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 },
  envCell: { alignItems: 'center', gap: 2, minWidth: 64 },
  envIcon: { fontSize: 18 },
  envValue: { fontSize: 13, fontWeight: '600', color: D.text2 },
  envLabel: { fontSize: 9, color: D.text3, letterSpacing: 0.4 },
  alertBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, alignSelf: 'center' },
  alertText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  venueNote: { fontSize: 12, color: D.text2, lineHeight: 18, fontStyle: 'italic' },
  distRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(80,140,255,0.08)' },
  distLabel: { fontSize: 11, color: D.text3 },
  distValue: { fontSize: 11, color: D.blue, fontWeight: '700' },
  transNote: { fontSize: 11, color: D.text3, lineHeight: 17 },
});

// ─── Geographic strip ─────────────────────────────────────────────────────────

function GeoStrip({ stops, activeIdx }: { stops: EnrichedStop[]; activeIdx: number }) {
  const regions = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const s of stops) {
      if (!seen.has(s.country)) { seen.add(s.country); order.push(s.country); }
    }
    return order;
  }, [stops]);

  const activeCountry = stops[activeIdx]?.country;

  const GEO_LABEL: Record<string, string> = { Mexico: '🇲🇽 Mexico', Canada: '🇨🇦 Canada', USA: '🇺🇸 USA' };

  return (
    <View style={gs.strip}>
      {regions.map((r, i) => (
        <View key={r} style={gs.region}>
          {i > 0 && <View style={gs.line} />}
          <View style={[gs.node, activeCountry === r && gs.nodeActive]}>
            <Text style={gs.label}>{GEO_LABEL[r] ?? r}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const gs = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  region: { flexDirection: 'row', alignItems: 'center' },
  line: { width: 28, height: 1, backgroundColor: D.separator },
  node: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: D.cardBorder, backgroundColor: D.surface },
  nodeActive: { borderColor: D.orange, backgroundColor: D.orangeGlow },
  label: { fontSize: 11, color: D.text2, fontWeight: '500' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TeamRouteScreen() {
  const { i18n } = useLanguage();
  const [launched, setLaunched] = useState(false);
  const insets = useSafeAreaInsets();

  const [selectedTeam, setSelectedTeam] = useState<WCTeam>(
    WC_TEAMS.find((t) => t.name === 'France') ?? WC_TEAMS[0]
  );
  const [stageIndex, setStageIndex] = useState(0);

  const fedColor = FED_COLOR[selectedTeam.federation];

  // Group fixtures
  const groupFixtures = useMemo(
    () => getTeamFixtures(selectedTeam.name).map(withResult),
    [selectedTeam]
  );

  // Projected knockout
  const projectedPath = useMemo(
    () => getProjectedKnockoutPath(selectedTeam),
    [selectedTeam]
  );

  // Build enriched stops
  const stops = useMemo<EnrichedStop[]>(() => {
    const gs: EnrichedStop[] = groupFixtures.map((f, i) => {
      const sid    = FIXTURE_STADIUM_ID[f.stadium] ?? '';
      const env    = STADIUM_ENV[sid];
      const isHome = f.home === selectedTeam.name;
      const teamScore = f.homeScore !== undefined
        ? (isHome ? f.homeScore : f.awayScore!)
        : undefined;
      const oppScore = f.homeScore !== undefined
        ? (isHome ? f.awayScore! : f.homeScore)
        : undefined;
      return {
        key:          `md${i + 1}`,
        label:        `MD ${i + 1}`,
        stadiumName:  f.stadium,
        city:         f.city,
        country:      f.country,
        stadiumId:    sid,
        opponentFlag: WC_TEAMS.find((t) => t.name === getOpponent(f, selectedTeam.name))?.flag ?? '🏳',
        opponentName: getOpponent(f, selectedTeam.name),
        matchDate:    f.date,
        isProjected:  false,
        altitudeM:        env?.altitudeM       ?? 0,
        avgTemp:          env?.avgTempJune     ?? 22,
        humidityLabel:    env?.humidityLabel   ?? 'Moderate',
        climateChallenge: env?.climateChallenge  ?? 4,
        altitudeChallenge:env?.altitudeChallenge ?? 1,
        travelDistFromPrev: 0,
        transitionNote: '',
        cumulativeFatigue: 0,
        teamScore,
        oppScore,
        winner: FIXTURE_RESULTS[`${f.home}|${f.away}`]?.winner ?? null,
      };
    });

    const ko: EnrichedStop[] = projectedPath.map((p) => {
      const venue = KO_VENUES[p.round] ?? KO_VENUES.Final;
      const sid   = venue.stadiumId;
      const env   = STADIUM_ENV[sid];
      return {
        key:          p.round,
        label:        p.roundLabel,
        stadiumName:  venue.stadiumName,
        city:         venue.city,
        country:      'USA',
        stadiumId:    sid,
        opponentFlag: p.opponent.flag,
        opponentName: p.opponent.name,
        matchDate:    p.approxDate,
        isProjected:  true,
        altitudeM:        env?.altitudeM       ?? 0,
        avgTemp:          env?.avgTempJune     ?? 22,
        humidityLabel:    env?.humidityLabel   ?? 'Moderate',
        climateChallenge: env?.climateChallenge  ?? 4,
        altitudeChallenge:env?.altitudeChallenge ?? 1,
        travelDistFromPrev: 0,
        transitionNote: '',
        cumulativeFatigue: 0,
      };
    });

    const all = [...gs, ...ko];

    // Enrich with travel distances and transition notes
    let cumFatigue = 0;
    return all.map((stop, i) => {
      if (i === 0) return { ...stop, cumulativeFatigue: 0 };
      const prevId = all[i - 1].stadiumId;
      const dist   = travelDistanceKm(prevId, stop.stadiumId);
      const note   = getTransitionNote(prevId, stop.stadiumId, dist, i18n);
      cumFatigue  += Math.round(dist / 500 + stop.climateChallenge * 0.5 + stop.altitudeChallenge * 0.8);
      return { ...stop, travelDistFromPrev: dist, transitionNote: note, cumulativeFatigue: Math.min(cumFatigue, 100) };
    });
  }, [groupFixtures, projectedPath, selectedTeam, i18n]);

  // Campaign stats
  const campaignStats = useMemo(
    () => computeCampaignStats(stops.map((s) => s.stadiumId)),
    [stops]
  );

  const activeStageKey = STAGES[stageIndex]?.key ?? 'MD1';

  const handleStageChange = useCallback((idx: number) => setStageIndex(idx), []);

  if (!launched) return <FeatureIntro player={playerByPath('/team-route')!} onLaunch={() => setLaunched(true)} />;

  return (
    <View style={[ms.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={ms.header}>
        <View style={ms.headerLeft}>
          <Text style={ms.headerTitle}>{i18n.titleTeamRoute}</Text>
          <Text style={ms.headerSub}>World Cup 2026 · Stadium Expedition</Text>
        </View>
        <View style={[ms.fedBadge, { borderColor: `${fedColor}50`, backgroundColor: `${fedColor}18` }]}>
          <Text style={[ms.fedBadgeName, { color: fedColor }]}>{selectedTeam.federation}</Text>
        </View>
      </View>

      {/* ── Team selector ── */}
      <View style={ms.selectorWrap}>
        <Text style={ms.selectorLabel}>{i18n.selectTeam.toUpperCase()}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={ms.selectorScroll}
        >
          {WC_TEAMS.map((team) => (
            <TeamChip
              key={team.name}
              team={team}
              active={team.name === selectedTeam.name}
              onPress={() => { setSelectedTeam(team); setStageIndex(0); }}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Geographic strip ── */}
      <GeoStrip stops={stops} activeIdx={stageIndex} />

      {/* ── Stage scrubber ── */}
      <View style={ms.scrubberWrap}>
        <FutureScrubber
          stages={STAGES}
          activeIndex={stageIndex}
          onIndexChange={handleStageChange}
          futureStartIndex={GROUP_COUNT}
          color={fedColor}
        />
      </View>

      {/* ── Route timeline ── */}
      <ScrollView
        style={ms.scroll}
        contentContainerStyle={[ms.scrollContent, { paddingBottom: insets.bottom + 64 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Selected stage match info */}
        <SelectedMatchCard
          stop={stops[stageIndex] ?? stops[0]}
          fedColor={fedColor}
          teamFlag={selectedTeam.flag}
          teamName={selectedTeam.name}
        />

        {/* 2. Lili Prediction */}
        <LiliPredictionBlock team={selectedTeam} stop={stops[stageIndex] ?? stops[0]} />

        {/* 3. Lili Route Intelligence */}
        <LiliInsightBlock
          team={selectedTeam}
          stageKey={activeStageKey}
          stats={campaignStats}
        />

        {/* 4. Stadium Details */}
        <StadiumDetailCard stop={stops[stageIndex] ?? stops[0]} />

        {/* 5. Campaign Intelligence */}
        <CampaignCard stats={campaignStats} fedColor={fedColor} />
      </ScrollView>
    </View>
  );
}

// ─── Main screen styles ───────────────────────────────────────────────────────

const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerLeft: { gap: 2 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: D.text1, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: D.text2, letterSpacing: 0.2 },
  fedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  fedBadgeFlag: { fontSize: 18 },
  fedBadgeName: { fontSize: 13, fontWeight: '600' },
  selectorWrap: { paddingTop: 4, paddingBottom: 2 },
  selectorLabel: { fontSize: 9, fontWeight: '700', color: D.text3, letterSpacing: 1.2, marginLeft: 20, marginBottom: 6 },
  selectorScroll: { paddingHorizontal: 16, gap: 6 },
  scrubberWrap: { marginHorizontal: 20, marginBottom: 8, backgroundColor: D.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: D.cardBorder },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
});
