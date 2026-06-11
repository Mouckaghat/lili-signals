import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { computeWorldSignals, type SignalIntercept, type PulseTeam, type NarrativeArc, type RegionSignal } from '../lib/worldSignals';
import { WORLD_SIGNALS_I18N } from '../lib/worldSignalsI18n';
import { INJURED_PLAYERS, INJURY_LAST_UPDATED } from '../lib/injuryData';
import { GROUP_STANDINGS } from '../lib/standingsData';
import { WC_TEAMS } from '../lib/wcData';
import FeatureIntro from '../components/FeatureIntro';
import { playerByPath } from '../lib/playerXI';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Design tokens ────────────────────────────────────────────────────────────

const D = {
  bg:      '#040C10',
  surface: '#081520',
  card:    '#0C1C2C',
  border:  'rgba(0,200,255,0.09)',
  blue:    '#4A9EFF',
  cyan:    '#00C8FF',
  orange:  '#FF7B35',
  green:   '#34D399',
  signal:  '#00E5A0',
  gold:    '#D4A520',
  red:     '#FF5B5B',
  purple:  '#C060FF',
  text1:   '#EEF2FF',
  text2:   '#7A90B8',
  text3:   '#374F7A',
  sep:     'rgba(0,200,255,0.09)',
};


// ─── Radar node ───────────────────────────────────────────────────────────────

function RadarNode() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) => {
      setTimeout(() => {
        const go = () => {
          anim.setValue(0);
          Animated.timing(anim, { toValue: 1, duration: 2400, useNativeDriver: true }).start(() => go());
        };
        go();
      }, delay);
    };
    pulse(ring1, 0);
    pulse(ring2, 1200);
  }, [ring1, ring2]);

  const ringStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.6, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.6] }) }],
  });

  return (
    <View style={rn.wrap}>
      <Animated.View style={[rn.ring, ringStyle(ring1)]} />
      <Animated.View style={[rn.ring, ringStyle(ring2)]} />
      <View style={rn.core} />
    </View>
  );
}

const rn = StyleSheet.create({
  wrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1.5,
    borderColor: D.cyan,
  },
  core: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: D.cyan },
});

// ─── Pulsing live dot ─────────────────────────────────────────────────────────

function LiveDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.8, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [scale]);
  return (
    <View style={{ width: 7, height: 7, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 7, height: 7, borderRadius: 3.5, backgroundColor: D.cyan, opacity: 0.3, transform: [{ scale }] }} />
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: D.cyan }} />
    </View>
  );
}

// ─── Signal intercept card ────────────────────────────────────────────────────

function InterceptCard({ item, index }: { item: SignalIntercept; index: number }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 360, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 300, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateX, index]);

  return (
    <Animated.View style={[ic.card, { borderLeftColor: item.color, opacity, transform: [{ translateX }] }]}>
      <View style={ic.header}>
        <Text style={ic.flag}>{item.flag}</Text>
        <Text style={ic.team}>{item.team}</Text>
        <View style={[ic.typeBadge, { backgroundColor: `${item.color}10`, borderColor: `${item.color}28` }]}>
          <Text style={[ic.typeText, { color: item.color }]}>{item.type}</Text>
        </View>
        <Text style={ic.ago}>{item.timing}</Text>
      </View>
      <Text style={ic.text}>{item.text}</Text>
    </Animated.View>
  );
}

const ic = StyleSheet.create({
  card: {
    backgroundColor: D.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    borderLeftWidth: 3,
    padding: 12,
    gap: 8,
  },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 7 },
  flag:      { fontSize: 16 },
  team:      { fontSize: 12, fontWeight: '700', color: D.text1, flex: 1 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  typeText:  { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  ago:       { fontSize: 9, color: D.text3 },
  text:      { fontSize: 11, color: D.text2, lineHeight: 17 },
});

// ─── Emotional pulse row ──────────────────────────────────────────────────────

function PulseRow({ team, index }: { team: PulseTeam; index: number }) {
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: team.value,
      duration: 700,
      delay: 200 + index * 60,
      useNativeDriver: false,
    }).start();
  }, [barWidth, team.value, index]);

  return (
    <View style={pr.row}>
      <Text style={pr.flag}>{team.flag}</Text>
      <Text style={pr.name}>{team.team}</Text>
      <View style={[pr.stateBadge, { borderColor: `${team.color}28`, backgroundColor: `${team.color}08` }]}>
        <Text style={[pr.stateText, { color: team.color }]}>{team.state}</Text>
      </View>
      <View style={pr.barWrap}>
        <Animated.View
          style={[
            pr.barFill,
            {
              backgroundColor: team.color,
              width: barWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
      <Text style={[pr.pct, { color: team.color }]}>{team.value}</Text>
    </View>
  );
}

const pr = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flag:       { fontSize: 15 },
  name:       { fontSize: 11, fontWeight: '700', color: D.text2, width: 72 },
  stateBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, borderWidth: 1, width: 80, alignItems: 'center' },
  stateText:  { fontSize: 7, fontWeight: '800', letterSpacing: 0.8 },
  barWrap:    { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  barFill:    { height: 4, borderRadius: 2 },
  pct:        { fontSize: 10, fontWeight: '700', width: 24, textAlign: 'right' },
});

// ─── Narrative arc card ───────────────────────────────────────────────────────

function NarrativeCard({ arc }: { arc: NarrativeArc }) {
  return (
    <View style={[na.card, { borderColor: `${arc.color}22` }]}>
      <View style={na.header}>
        <Text style={[na.title, { color: arc.color }]}>{arc.title.toUpperCase()}</Text>
        <View style={na.intensityBlock}>
          <Text style={[na.intensityValue, { color: arc.color }]}>{arc.intensity}</Text>
          <Text style={na.intensityLabel}>SIGNAL</Text>
        </View>
      </View>
      <View style={na.teamsRow}>
        {arc.teams.map((t) => (
          <View key={t} style={[na.teamChip, { borderColor: `${arc.color}25`, backgroundColor: `${arc.color}08` }]}>
            <Text style={[na.teamText, { color: arc.color }]}>{t}</Text>
          </View>
        ))}
      </View>
      <Text style={na.desc}>{arc.desc}</Text>
      <View style={na.barTrack}>
        <View style={[na.barFill, { width: `${arc.intensity}%` as any, backgroundColor: arc.color }]} />
      </View>
    </View>
  );
}

const na = StyleSheet.create({
  card: {
    backgroundColor: D.card,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:          { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  intensityBlock: { alignItems: 'flex-end', gap: 1 },
  intensityValue: { fontSize: 18, fontWeight: '700' },
  intensityLabel: { fontSize: 6, fontWeight: '700', color: D.text3, letterSpacing: 1 },
  teamsRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  teamChip:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  teamText:       { fontSize: 10, fontWeight: '600' },
  desc:           { fontSize: 11, color: D.text3, lineHeight: 16 },
  barTrack:       { height: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' },
  barFill:        { height: 2, borderRadius: 1 },
});

// ─── Regional energy row ──────────────────────────────────────────────────────

function RegionRow({ region }: { region: RegionSignal }) {
  return (
    <View style={re.row}>
      <View style={re.left}>
        <Text style={re.confed}>{region.confed}</Text>
        <Text style={re.label}>{region.label}</Text>
      </View>
      <View style={[re.trendBadge, {
        borderColor: region.up ? 'rgba(52,211,153,0.25)' : 'rgba(255,123,53,0.25)',
        backgroundColor: region.up ? 'rgba(52,211,153,0.07)' : 'rgba(255,123,53,0.07)',
      }]}>
        <Text style={[re.trend, { color: region.up ? D.green : D.orange }]}>
          {region.up ? '▲' : '▼'} {region.trend}
        </Text>
      </View>
      <View style={re.barWrap}>
        <View style={[re.barFill, { width: `${region.energy}%` as any, backgroundColor: region.color }]} />
      </View>
      <Text style={[re.pct, { color: region.color }]}>{region.energy}</Text>
    </View>
  );
}

const re = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  left:       { width: 70, gap: 1 },
  confed:     { fontSize: 10, fontWeight: '800', color: D.text2 },
  label:      { fontSize: 8, color: D.text3 },
  trendBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  trend:      { fontSize: 8, fontWeight: '700' },
  barWrap:    { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  barFill:    { height: 4, borderRadius: 2 },
  pct:        { fontSize: 10, fontWeight: '700', width: 22, textAlign: 'right' },
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

// ─── Injury bulletin ─────────────────────────────────────────────────────────

const SEVERITY_COLOR = { OUT: '#FF5B5B', DOUBTFUL: '#FF9F0A', SUSPENDED: '#D4A520' } as const;

function InjuryBulletin() {
  const { i18n } = useLanguage();
  const injuredTeams = WC_TEAMS.filter((t) => (INJURED_PLAYERS[t.name]?.length ?? 0) > 0);

  const severityLabel = (s: 'OUT' | 'DOUBTFUL' | 'SUSPENDED') =>
    ({ OUT: i18n.injuryOut, DOUBTFUL: i18n.injuryDoubtful, SUSPENDED: i18n.injurySuspended }[s]);

  return (
    <View style={ij.card}>
      {injuredTeams.length === 0 ? (
        <View style={ij.clean}>
          <Text style={ij.cleanIcon}>✓</Text>
          <Text style={ij.cleanText}>{i18n.injuryClean}</Text>
        </View>
      ) : (
        injuredTeams.map((team) => {
          const players = INJURED_PLAYERS[team.name]!;
          return (
            <View key={team.name} style={ij.teamBlock}>
              <View style={ij.teamHeader}>
                <Text style={ij.teamFlag}>{team.flag}</Text>
                <Text style={ij.teamName}>{team.name}</Text>
              </View>
              {players.map((p, idx) => (
                <View key={idx} style={ij.playerRow}>
                  <View style={ij.playerLeft}>
                    <Text style={ij.playerName}>{p.name}</Text>
                    <Text style={ij.playerReason}>{p.reason}</Text>
                  </View>
                  <View style={ij.playerRight}>
                    <View style={[ij.badge, { backgroundColor: `${SEVERITY_COLOR[p.severity]}20` }]}>
                      <Text style={[ij.badgeText, { color: SEVERITY_COLOR[p.severity] }]}>
                        {severityLabel(p.severity)}
                      </Text>
                    </View>
                    <Text style={ij.returnText}>
                      {p.returnDate
                        ? i18n.injuryReturn.replace('{date}', p.returnDate)
                        : i18n.injuryNoReturn}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })
      )}
      {Boolean(INJURY_LAST_UPDATED) && (
        <Text style={ij.updated}>↻ {INJURY_LAST_UPDATED}</Text>
      )}
    </View>
  );
}

const ij = StyleSheet.create({
  card:       { backgroundColor: D.card, borderRadius: 14, borderWidth: 1, borderColor: `${D.red}25`, overflow: 'hidden' },
  clean:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  cleanIcon:  { fontSize: 18, color: D.green },
  cleanText:  { fontSize: 13, color: D.green, fontWeight: '600' },
  teamBlock:  { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  teamHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  teamFlag:   { fontSize: 20 },
  teamName:   { fontSize: 13, fontWeight: '700', color: D.text1 },
  playerRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: D.border },
  playerLeft: { flex: 1, gap: 2 },
  playerName: { fontSize: 12, fontWeight: '600', color: D.text1 },
  playerReason:{ fontSize: 11, color: D.text2 },
  playerRight:{ alignItems: 'flex-end', gap: 4 },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  returnText: { fontSize: 10, color: D.text3 },
  updated:    { fontSize: 10, color: D.text3, textAlign: 'right', padding: 10 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WorldSignalsScreen() {
  const [launched, setLaunched] = useState(false);
  const { i18n, lang } = useLanguage();
  const insets  = useSafeAreaInsets();
  const fadeIn  = useRef(new Animated.Value(0)).current;

  // Derive active teams from live standings. Falls back to undefined (all 48) pre-tournament.
  const activeTeamNames = useMemo(() => {
    if (GROUP_STANDINGS.length === 0) return undefined;
    return new Set(
      GROUP_STANDINGS.filter((s) => s.status !== 'ELIMINATED').map((s) => s.team)
    );
  }, []);

  const signals = useMemo(
    () => computeWorldSignals(activeTeamNames, WORLD_SIGNALS_I18N[lang] ?? WORLD_SIGNALS_I18N.EN),
    [activeTeamNames, lang]
  );

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [fadeIn]);

  if (!launched) return <FeatureIntro player={playerByPath('/world-signals')!} onLaunch={() => setLaunched(true)} />;

  return (
    <View style={ms.root}>

      {/* ── Atmospheric glow ── */}
      <View pointerEvents="none" style={ms.glowOrb} />

      {/* ── Fixed header ── */}
      <View style={[ms.header, { paddingTop: insets.top + 12 }]}>

        {/* Identity row */}
        <View style={ms.identityRow}>
          <RadarNode />
          <View style={ms.titleBlock}>
            <Text style={ms.eyebrow}>WORLD</Text>
            <Text style={ms.title}>{i18n.titleWorldSignals}</Text>
            <Text style={ms.tagline}>Global football atmosphere · Live radar</Text>
          </View>
          <View style={ms.liveChip}>
            <LiveDot />
            <Text style={ms.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Signal summary strip */}
        <View style={ms.strip}>
          <View style={ms.stripCell}>
            <Text style={ms.stripValue}>48</Text>
            <Text style={ms.stripLabel}>TEAMS</Text>
          </View>
          <View style={ms.stripSep} />
          <View style={ms.stripCell}>
            <Text style={[ms.stripValue, { color: D.cyan }]}>{signals.activeCount}</Text>
            <Text style={ms.stripLabel}>ACTIVE TEAMS</Text>
          </View>
          <View style={ms.stripSep} />
          <View style={ms.stripCell}>
            <Text style={[ms.stripValue, { color: D.signal }]}>{signals.narrativeCount}</Text>
            <Text style={ms.stripLabel}>NARRATIVES</Text>
          </View>
          <View style={ms.stripSep} />
          <View style={ms.stripCell}>
            <Text style={[ms.stripValue, { color: D.purple }]}>{signals.regionCount}</Text>
            <Text style={ms.stripLabel}>REGIONS</Text>
          </View>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <Animated.ScrollView
        style={[ms.scroll, { opacity: fadeIn }]}
        contentContainerStyle={[ms.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Signal Intercepts */}
        <View style={ms.section}>
          <SectionHeader
            title={i18n.signalIntercepts}
            sub={i18n.signalInterceptsSub}
          />
          <View style={ms.gap8}>
            {signals.intercepts.map((item, i) => (
              <InterceptCard key={`${item.team}-${i}`} item={item} index={i} />
            ))}
          </View>
        </View>

        {/* Emotional Pulse */}
        <View style={ms.section}>
          <SectionHeader
            title={i18n.emotionalPulse}
            sub={i18n.emotionalPulseSub}
          />
          <View style={ms.pulseCard}>
            <View style={ms.pulseLegend}>
              <Text style={ms.legendLeft}>TEAM</Text>
              <Text style={ms.legendRight}>STATE · INTENSITY</Text>
            </View>
            <View style={ms.sep} />
            <View style={ms.gap10}>
              {signals.pulse.map((t, i) => (
                <PulseRow key={t.team} team={t} index={i} />
              ))}
            </View>
          </View>
        </View>

        {/* Narrative Arcs */}
        <View style={ms.section}>
          <SectionHeader
            title={i18n.narrativeArcs}
            sub={i18n.narrativeArcsSub}
          />
          <View style={ms.gap8}>
            {signals.narratives.map((arc) => (
              <NarrativeCard key={arc.title} arc={arc} />
            ))}
          </View>
        </View>

        {/* Continental Energy */}
        <View style={ms.section}>
          <SectionHeader
            title={i18n.continentalEnergy}
            sub={i18n.continentalEnergySub}
          />
          <View style={ms.regionCard}>
            <View style={ms.gap12}>
              {signals.regions.map((r) => (
                <RegionRow key={r.confed} region={r} />
              ))}
            </View>
          </View>
        </View>

        {/* Injury Bulletin */}
        <View style={ms.section}>
          <SectionHeader
            title={i18n.injuryBulletin.toUpperCase()}
            sub={i18n.injuryBulletin}
          />
          <InjuryBulletin />
        </View>

        {/* Footer */}
        <View style={ms.footer}>
          <Text style={ms.footerPrimary}>World Signals</Text>
          <Text style={ms.footerSub}>Worldcupilou by Lobster Inc. · Jura Technology</Text>
        </View>

      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },

  glowOrb: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0,200,255,0.03)',
    shadowColor: '#00C8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 80,
  },

  // ── Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: D.sep,
    gap: 14,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleBlock:  { flex: 1, gap: 1 },
  eyebrow:     { fontSize: 9, fontWeight: '800', color: D.cyan, letterSpacing: 3 },
  title:       { fontSize: 22, fontWeight: '800', color: D.text1, letterSpacing: -0.4 },
  tagline:     { fontSize: 10, color: D.text3, letterSpacing: 0.2 },

  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.22)',
    backgroundColor: 'rgba(0,200,255,0.06)',
  },
  liveText: { fontSize: 7, fontWeight: '800', color: D.cyan, letterSpacing: 1.5 },

  // ── Strip
  strip: {
    flexDirection: 'row',
    backgroundColor: D.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    paddingVertical: 10,
  },
  stripCell:  { flex: 1, alignItems: 'center', gap: 2 },
  stripSep:   { width: 1, backgroundColor: D.sep },
  stripValue: { fontSize: 14, fontWeight: '700', color: D.blue },
  stripLabel: { fontSize: 6, fontWeight: '700', color: D.text3, letterSpacing: 0.8, textAlign: 'center' },

  // ── Scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // ── Sections
  section: { marginBottom: 24 },
  gap8:    { gap: 8 },
  gap10:   { gap: 10 },
  gap12:   { gap: 12 },
  sep:     { height: 1, backgroundColor: D.sep },

  // ── Pulse card
  pulseCard: {
    backgroundColor: D.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: D.border,
    padding: 16,
    gap: 12,
  },
  pulseLegend:  { flexDirection: 'row', justifyContent: 'space-between' },
  legendLeft:   { fontSize: 7, fontWeight: '700', color: D.text3, letterSpacing: 1 },
  legendRight:  { fontSize: 7, fontWeight: '700', color: D.text3, letterSpacing: 1 },

  // ── Region card
  regionCard: {
    backgroundColor: D.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: D.border,
    padding: 16,
  },

  // ── Footer
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: D.sep,
  },
  footerPrimary: { fontSize: 10, color: 'rgba(238,242,255,0.18)', fontWeight: '600', letterSpacing: 0.3 },
  footerSub:     { fontSize: 8,  color: 'rgba(238,242,255,0.09)', letterSpacing: 0.2 },
});
