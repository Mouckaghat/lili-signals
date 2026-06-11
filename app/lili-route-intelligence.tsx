import { useEffect, useMemo, useRef, useState } from 'react';
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
import { computeRouteSignals, type RouteDangerZone, type RouteBriefing } from '../lib/routeSignals';
import FeatureIntro from '../components/FeatureIntro';
import TournamentIntelligenceSection from '../components/TournamentIntelligenceSection';
import { playerByPath } from '../lib/playerXI';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Design tokens ────────────────────────────────────────────────────────────

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
  text1:   '#EEF2FF',
  text2:   '#7A90B8',
  text3:   '#374F7A',
  sep:     'rgba(80,140,255,0.12)',
};

// ─── Tournament pulse ─────────────────────────────────────────────────────────

const FINAL_MS   = new Date('2026-07-19T18:00:00Z').getTime();
const KICKOFF_MS = new Date('2026-06-11T22:00:00Z').getTime();

function daysUntil(targetMs: number) {
  return Math.max(0, Math.round((targetMs - Date.now()) / 86_400_000));
}

// ─── Pulsing status dot ───────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.9, duration: 950, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 950, useNativeDriver: true }),
      ])
    ).start();
  }, [scale]);
  return (
    <View style={{ width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute',
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: color,
        opacity: 0.3,
        transform: [{ scale }],
      }} />
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
    </View>
  );
}

// ─── Briefing entry ───────────────────────────────────────────────────────────

function BriefingEntry({ entry, index }: { entry: RouteBriefing; index: number }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 380, delay: index * 70, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY, index]);

  return (
    <Animated.View
      style={[
        bi.entry,
        { borderLeftColor: entry.color, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[bi.typeBadge, { backgroundColor: `${entry.color}10`, borderColor: `${entry.color}28` }]}>
        <Text style={[bi.typeText, { color: entry.color }]}>{entry.type}</Text>
      </View>
      <Text style={bi.entryText}>{entry.text}</Text>
    </Animated.View>
  );
}

const bi = StyleSheet.create({
  entry: {
    backgroundColor: D.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    borderLeftWidth: 3,
    padding: 12,
    gap: 8,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  typeText:  { fontSize: 8, fontWeight: '800', letterSpacing: 1.2 },
  entryText: { fontSize: 12, color: D.text2, lineHeight: 18 },
});

// ─── Danger zone card ─────────────────────────────────────────────────────────

function DangerZoneCard({
  zone,
  isSelected,
  onPress,
  dangerIndexLabel,
  routeExposureLabel,
}: {
  zone: RouteDangerZone;
  isSelected: boolean;
  onPress: () => void;
  dangerIndexLabel: string;
  routeExposureLabel: string;
}) {
  return (
    <TouchableOpacity
      style={[
        dz.card,
        { borderColor: `${zone.color}${isSelected ? '40' : '20'}` },
        isSelected && { shadowColor: zone.color, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Header row */}
      <View style={dz.row}>
        <View style={[dz.badge, { backgroundColor: `${zone.color}10`, borderColor: `${zone.color}30` }]}>
          <Text style={[dz.badgeText, { color: zone.color }]}>{zone.displayLabel}</Text>
        </View>
        <View style={dz.rightCol}>
          <View style={dz.scoreBlock}>
            <Text style={[dz.score, { color: zone.color }]}>
              {zone.score.toFixed(1)}<Text style={dz.scoreUnit}> /10</Text>
            </Text>
            <Text style={dz.scoreLabel}>{dangerIndexLabel}</Text>
          </View>
          <Text style={[dz.chevron, { color: zone.color }]}>{isSelected ? '▴' : '▾'}</Text>
        </View>
      </View>

      {/* Description + bar */}
      <Text style={dz.desc}>{zone.desc}</Text>
      <View style={dz.barTrack}>
        <View
          style={[
            dz.barFill,
            { width: `${Math.round(zone.score * 10)}%` as any, backgroundColor: zone.color },
          ]}
        />
      </View>

      {/* Expanded: affected teams */}
      {isSelected && (
        <View style={[dz.expanded, { borderTopColor: `${zone.color}20` }]}>
          <Text style={dz.teamsLabel}>{routeExposureLabel}</Text>
          <View style={dz.teamsRow}>
            {zone.teams.map((t) => (
              <View
                key={t.name}
                style={[dz.teamChip, { borderColor: `${zone.color}28`, backgroundColor: `${zone.color}08` }]}
              >
                <Text style={dz.teamFlag}>{t.flag}</Text>
                <Text style={[dz.teamName, { color: zone.color }]}>{t.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const dz = StyleSheet.create({
  card: {
    backgroundColor: D.card,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText:  { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  rightCol:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreBlock: { alignItems: 'flex-end', gap: 1 },
  score:      { fontSize: 22, fontWeight: '700' },
  scoreUnit:  { fontSize: 13, fontWeight: '400' },
  scoreLabel: { fontSize: 7, fontWeight: '700', color: D.text3, letterSpacing: 1 },
  chevron:    { fontSize: 10, fontWeight: '700' },
  desc:       { fontSize: 11, color: D.text3, lineHeight: 16 },
  barTrack:   { height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  barFill:    { height: 3, borderRadius: 2 },
  // Expanded
  expanded:   { borderTopWidth: 1, paddingTop: 12, gap: 10 },
  teamsLabel: { fontSize: 7, fontWeight: '800', color: D.text3, letterSpacing: 1.5 },
  teamsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teamChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  teamFlag:   { fontSize: 16 },
  teamName:   { fontSize: 12, fontWeight: '600' },
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LiliRouteIntelligenceScreen() {
  const [launched, setLaunched] = useState(false);
  const insets = useSafeAreaInsets();

  const breathe = useRef(new Animated.Value(0.25)).current;
  const fadeIn  = useRef(new Animated.Value(0)).current;

  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 0.85, duration: 3000, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.25, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, [breathe, fadeIn]);

  const { i18n } = useLanguage();
  const { zones, briefings } = useMemo(() => computeRouteSignals(i18n, undefined), [i18n]);
  const daysToFinal   = daysUntil(FINAL_MS);
  const daysToKickoff = daysUntil(KICKOFF_MS);
  const isLive        = daysToKickoff === 0;

  if (!launched) return <FeatureIntro player={playerByPath('/lili-route-intelligence')!} onLaunch={() => setLaunched(true)} />;

  return (
    <View style={ms.root}>

      {/* ── Atmospheric background glow ── */}
      <Animated.View pointerEvents="none" style={[ms.glowOrb, { opacity: breathe }]} />

      {/* ── Fixed header ── */}
      <View style={[ms.header, { paddingTop: insets.top + 12 }]}>

        {/* Identity row */}
        <View style={ms.identityRow}>
          <Animated.View style={{ opacity: breathe }}>
            <View style={ms.logoRing}>
              <Image
                source={require('../assets/blue_lobster.png')}
                style={ms.logo}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          <View style={ms.titleBlock}>
            <Text style={ms.eyebrow}>LILI</Text>
            <Text style={ms.title}>{i18n.titleRouteIntel}</Text>
            <Text style={ms.tagline}>{i18n.tagline}</Text>
          </View>

          <View style={ms.statusChip}>
            <PulseDot color={D.signal} />
            <Text style={ms.statusText}>{i18n.routeActive}</Text>
          </View>
        </View>

        {/* Tournament pulse strip */}
        <View style={ms.pulseStrip}>
          <View style={ms.pulseCell}>
            <Text style={[ms.pulseValue, isLive && { color: D.signal }]}>
              {isLive ? i18n.liveLabel : daysToKickoff}
            </Text>
            <Text style={ms.pulseLabel}>{isLive ? i18n.liveLabel : i18n.daysToKickoff}</Text>
          </View>
          <View style={ms.pulseSep} />
          <View style={ms.pulseCell}>
            <Text style={ms.pulseValue}>{daysToFinal}</Text>
            <Text style={ms.pulseLabel}>{i18n.routeToFinal}</Text>
          </View>
          <View style={ms.pulseSep} />
          <View style={ms.pulseCell}>
            <Text style={ms.pulseValue}>15</Text>
            <Text style={ms.pulseLabel}>{i18n.routeVenues}</Text>
          </View>
          <View style={ms.pulseSep} />
          <View style={ms.pulseCell}>
            <Text style={ms.pulseValue}>48</Text>
            <Text style={ms.pulseLabel}>{i18n.routeTeams}</Text>
          </View>
          <View style={ms.pulseSep} />
          <View style={ms.pulseCell}>
            <Text style={ms.pulseValue}>12</Text>
            <Text style={ms.pulseLabel}>{i18n.groups}</Text>
          </View>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <Animated.ScrollView
        style={[ms.scroll, { opacity: fadeIn }]}
        contentContainerStyle={[ms.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Intelligence Briefing */}
        <View style={ms.section}>
          <SectionHeader
            title={i18n.intelligenceBriefingTitle}
            sub={i18n.intelligenceBriefingSub}
          />
          <View style={ms.gap8}>
            {briefings.map((b, i) => (
              <BriefingEntry key={i} entry={b} index={i} />
            ))}
          </View>
        </View>

        {/* Route Danger Matrix */}
        <View style={ms.section}>
          <SectionHeader
            title={i18n.routeDangerMatrixTitle}
            sub={i18n.routeDangerMatrixSub}
          />
          <View style={ms.gap8}>
            {zones.map((z) => (
              <DangerZoneCard
                key={z.label}
                zone={z}
                isSelected={selectedZone === z.label}
                onPress={() => setSelectedZone((prev) => prev === z.label ? null : z.label)}
                dangerIndexLabel={i18n.dangerIndex}
                routeExposureLabel={i18n.routeExposure}
              />
            ))}
          </View>
        </View>

        {/* Tournament Intelligence */}
        <TournamentIntelligenceSection />

        {/* Footer */}
        <View style={ms.footer}>
          <Image
            source={require('../assets/blue_lobster.png')}
            style={ms.footerLogo}
            resizeMode="contain"
          />
          <Text style={ms.footerPrimary}>Lili Route Intelligence</Text>
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
    top: -80,
    left: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(74,158,255,0.04)',
    shadowColor: '#4A9EFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 90,
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
  logoRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(74,158,255,0.35)',
    backgroundColor: 'rgba(74,158,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A9EFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  logo:       { width: 44, height: 44, borderRadius: 22 },
  titleBlock: { flex: 1, gap: 1 },
  eyebrow:    { fontSize: 9, fontWeight: '800', color: D.blue, letterSpacing: 3 },
  title:      { fontSize: 20, fontWeight: '800', color: D.text1, letterSpacing: -0.3 },
  tagline:    { fontSize: 10, color: D.text3, letterSpacing: 0.2 },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.22)',
    backgroundColor: 'rgba(0,229,160,0.06)',
  },
  statusText: { fontSize: 7, fontWeight: '800', color: '#00E5A0', letterSpacing: 1.5 },

  // ── Pulse strip
  pulseStrip: {
    flexDirection: 'row',
    backgroundColor: D.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    paddingVertical: 10,
  },
  pulseCell:  { flex: 1, alignItems: 'center', gap: 2 },
  pulseSep:   { width: 1, backgroundColor: D.sep },
  pulseValue: { fontSize: 14, fontWeight: '700', color: D.blue },
  pulseLabel: { fontSize: 6, fontWeight: '700', color: D.text3, letterSpacing: 0.8, textAlign: 'center' },

  // ── Scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // ── Sections
  section: { marginBottom: 24 },
  gap8:    { gap: 8 },

  // ── Footer
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: D.sep,
  },
  footerLogo:    { width: 26, height: 26, borderRadius: 13, opacity: 0.35 },
  footerPrimary: { fontSize: 10, color: 'rgba(238,242,255,0.18)', fontWeight: '600', letterSpacing: 0.3 },
  footerSub:     { fontSize: 8,  color: 'rgba(238,242,255,0.09)', letterSpacing: 0.2 },
});
