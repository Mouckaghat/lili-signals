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
import { WC_TEAMS } from '../lib/wcData';
import {
  computeTimelineComparison,
  STRENGTH_MAX,
  STRENGTH_MIN,
  STRENGTH_STEP,
  type MatchTimeline,
  type GroupRipple,
  type TimelineComparison,
} from '../lib/alternateTimeline';

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
  purple:  '#C060FF',
  text1:   '#EEF2FF',
  text2:   '#7A90B8',
  text3:   '#374F7A',
  sep:     'rgba(80,140,255,0.12)',
};

const DEFAULT_TEAM = 'Argentina';

// ─── Pulsing status dot ───────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.9, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [scale]);
  return (
    <View style={{ width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute', width: 8, height: 8, borderRadius: 4,
        backgroundColor: color, opacity: 0.3, transform: [{ scale }],
      }} />
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
    </View>
  );
}

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

// ─── Delta label ──────────────────────────────────────────────────────────────

function Delta({ value, format = 'pct' }: { value: number; format?: 'pct' | 'pts' }) {
  const positive = value > 0;
  const zero     = Math.abs(value) < 0.001;
  const color    = zero ? D.text3 : positive ? D.green : D.red;
  const arrow    = zero ? '—' : positive ? '↑' : '↓';
  const display  = format === 'pts'
    ? `${positive ? '+' : ''}${value.toFixed(2)}`
    : `${positive ? '+' : ''}${Math.round(value * 100)}%`;
  return (
    <Text style={[dlt.text, { color }]}>{arrow} {display}</Text>
  );
}

const dlt = StyleSheet.create({
  text: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
});

// ─── Match card ───────────────────────────────────────────────────────────────

function MatchCard({ match, index }: { match: MatchTimeline; index: number }) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 360, delay: index * 80, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY, index]);

  const rows = [
    { label: 'WIN',  base: match.base.win,  alt: match.alt.win  },
    { label: 'DRW',  base: match.base.draw, alt: match.alt.draw },
    { label: 'LSS',  base: match.base.loss, alt: match.alt.loss },
  ];

  const ptsDelta = match.alt.expectedPts - match.base.expectedPts;

  return (
    <Animated.View style={[mc.card, { opacity, transform: [{ translateY }] }]}>

      {/* Opponent header */}
      <View style={mc.header}>
        <Text style={mc.flag}>{match.opponentFlag}</Text>
        <View style={mc.oppInfo}>
          <Text style={mc.oppName}>{match.opponent}</Text>
          <Text style={mc.meta}>Matchday {match.matchday}</Text>
        </View>
        <View style={mc.xptsBlock}>
          <Text style={mc.xptsLabel}>XPTS</Text>
          <Delta value={ptsDelta} format="pts" />
        </View>
      </View>

      {/* Column labels */}
      <View style={mc.colRow}>
        <View style={{ width: 30 }} />
        <Text style={[mc.colLabel, { flex: 1, textAlign: 'center' }]}>BASE</Text>
        <Text style={[mc.colLabel, { flex: 1, textAlign: 'center' }]}>ALT</Text>
        <Text style={[mc.colLabel, { flex: 1, textAlign: 'center' }]}>Δ</Text>
      </View>

      {/* Probability rows */}
      {rows.map(row => {
        const delta = row.alt - row.base;
        const color = Math.abs(delta) < 0.001 ? D.text3 : delta > 0 ? D.green : D.red;
        return (
          <View key={row.label} style={mc.probRow}>
            <Text style={mc.rowLabel}>{row.label}</Text>
            <Text style={[mc.probVal, { flex: 1, textAlign: 'center' }]}>
              {Math.round(row.base * 100)}%
            </Text>
            <Text style={[mc.probVal, { flex: 1, textAlign: 'center', color: D.text1 }]}>
              {Math.round(row.alt * 100)}%
            </Text>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Delta value={delta} />
            </View>
          </View>
        );
      })}

      {/* Bar comparison (win probability only) */}
      <View style={mc.barSection}>
        <View style={mc.barRow}>
          <Text style={mc.barLabel}>BASE WIN</Text>
          <View style={mc.barTrack}>
            <View style={[mc.barFill, { width: `${Math.round(match.base.win * 100)}%` as any, backgroundColor: D.blue }]} />
          </View>
          <Text style={mc.barPct}>{Math.round(match.base.win * 100)}%</Text>
        </View>
        <View style={mc.barRow}>
          <Text style={mc.barLabel}>ALT WIN</Text>
          <View style={mc.barTrack}>
            <View style={[mc.barFill, { width: `${Math.round(match.alt.win * 100)}%` as any, backgroundColor: D.purple }]} />
          </View>
          <Text style={mc.barPct}>{Math.round(match.alt.win * 100)}%</Text>
        </View>
      </View>

    </Animated.View>
  );
}

const mc = StyleSheet.create({
  card: {
    backgroundColor: D.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.border,
    padding: 14,
    gap: 10,
  },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flag:     { fontSize: 24 },
  oppInfo:  { flex: 1, gap: 1 },
  oppName:  { fontSize: 13, fontWeight: '700', color: D.text1 },
  meta:     { fontSize: 9, color: D.text3, letterSpacing: 0.5 },
  xptsBlock:{ alignItems: 'flex-end', gap: 2 },
  xptsLabel:{ fontSize: 7, fontWeight: '700', color: D.text3, letterSpacing: 1 },

  colRow:   { flexDirection: 'row', alignItems: 'center', paddingBottom: 2 },
  colLabel: { fontSize: 7, fontWeight: '800', color: D.text3, letterSpacing: 1.2 },

  probRow:  { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { width: 30, fontSize: 8, fontWeight: '700', color: D.text3, letterSpacing: 1 },
  probVal:  { fontSize: 12, fontWeight: '600', color: D.text2 },

  barSection:{ gap: 5, paddingTop: 4, borderTopWidth: 1, borderTopColor: `${D.border}` },
  barRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 50, fontSize: 7, fontWeight: '700', color: D.text3, letterSpacing: 0.8 },
  barTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  barFill:  { height: 4, borderRadius: 2 },
  barPct:   { width: 28, fontSize: 9, fontWeight: '600', color: D.text2, textAlign: 'right' },
});

// ─── Ripple row ───────────────────────────────────────────────────────────────

function RippleRow({ ripple }: { ripple: GroupRipple }) {
  const delta = ripple.altExpectedPts - ripple.baseExpectedPts;
  const color = Math.abs(delta) < 0.001 ? D.text3 : delta > 0 ? D.green : D.red;

  return (
    <View style={rr.row}>
      <Text style={rr.flag}>{ripple.flag}</Text>
      <View style={rr.nameBlock}>
        <Text style={rr.name}>{ripple.name}</Text>
        <Text style={rr.str}>STR {ripple.strength}</Text>
      </View>
      <View style={rr.ptsBlock}>
        <Text style={rr.pts}>{ripple.baseExpectedPts.toFixed(2)}</Text>
        <Text style={rr.arrow}>→</Text>
        <Text style={[rr.pts, { color: D.text1 }]}>{ripple.altExpectedPts.toFixed(2)}</Text>
      </View>
      <Delta value={delta} format="pts" />
    </View>
  );
}

const rr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: D.sep },
  flag:     { fontSize: 20 },
  nameBlock:{ flex: 1, gap: 1 },
  name:     { fontSize: 12, fontWeight: '600', color: D.text1 },
  str:      { fontSize: 8, color: D.text3, letterSpacing: 0.5 },
  ptsBlock: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pts:      { fontSize: 12, fontWeight: '600', color: D.text2 },
  arrow:    { fontSize: 10, color: D.text3 },
});

// ─── Qualification comparison ─────────────────────────────────────────────────

function QualRow({ base, alt }: { base: number; alt: number }) {
  const delta = alt - base;
  const barColor = delta > 0 ? D.green : delta < 0 ? D.red : D.blue;
  return (
    <View style={qr.wrap}>
      <View style={qr.topRow}>
        <View style={qr.block}>
          <Text style={qr.label}>BASE</Text>
          <Text style={qr.value}>{Math.round(base * 100)}%</Text>
        </View>
        <Text style={qr.arrow}>—</Text>
        <View style={[qr.block, { alignItems: 'flex-end' }]}>
          <Text style={qr.label}>ALTERNATE</Text>
          <Text style={[qr.value, { color: barColor }]}>{Math.round(alt * 100)}%</Text>
        </View>
        <View style={[qr.deltaBadge, { backgroundColor: `${barColor}12`, borderColor: `${barColor}30` }]}>
          <Delta value={delta} />
        </View>
      </View>
      <View style={qr.tracks}>
        <View style={qr.track}>
          <View style={[qr.fill, { width: `${Math.round(base * 100)}%` as any, backgroundColor: D.blue }]} />
        </View>
        <View style={qr.track}>
          <View style={[qr.fill, { width: `${Math.round(alt * 100)}%` as any, backgroundColor: barColor }]} />
        </View>
      </View>
    </View>
  );
}

const qr = StyleSheet.create({
  wrap:    { gap: 10 },
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  block:   { flex: 1, gap: 2 },
  label:   { fontSize: 7, fontWeight: '800', color: D.text3, letterSpacing: 1.2 },
  value:   { fontSize: 24, fontWeight: '700', color: D.text1 },
  arrow:   { fontSize: 14, color: D.text3 },
  deltaBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  tracks:  { gap: 5 },
  track:   { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  fill:    { height: 4, borderRadius: 2 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AlternateTimelineScreen() {
  const insets = useSafeAreaInsets();

  const breathe = useRef(new Animated.Value(0.25)).current;
  const fadeIn  = useRef(new Animated.Value(0)).current;

  const [selectedTeam,  setSelectedTeam]  = useState(DEFAULT_TEAM);
  const [strengthDelta, setStrengthDelta] = useState(0);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 0.85, duration: 3000, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.25, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, [breathe, fadeIn]);

  // Reset delta when team changes
  const selectTeam = (name: string) => {
    setSelectedTeam(name);
    setStrengthDelta(0);
  };

  const comparison = useMemo(
    () => computeTimelineComparison(selectedTeam, strengthDelta),
    [selectedTeam, strengthDelta],
  );

  const teamObj = WC_TEAMS.find(t => t.name === selectedTeam);

  const adjustDelta = (dir: 1 | -1) => {
    setStrengthDelta(prev => {
      const next = prev + dir * STRENGTH_STEP;
      return Math.max(STRENGTH_MIN, Math.min(STRENGTH_MAX, next));
    });
  };

  const divergenceColor = !comparison ? D.blue
    : comparison.divergenceIndex >= 65 ? D.red
    : comparison.divergenceIndex >= 35 ? D.orange
    : D.blue;

  return (
    <View style={ms.root}>

      {/* Atmospheric glow */}
      <Animated.View pointerEvents="none" style={[ms.glowOrb, { opacity: breathe }]} />

      {/* Fixed header */}
      <View style={[ms.header, { paddingTop: insets.top + 12 }]}>

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
            <Text style={ms.title}>Alternate Timeline</Text>
            <Text style={ms.tagline}>What if this team were different?</Text>
          </View>

          <View style={ms.statusChip}>
            <PulseDot color={D.purple} />
            <Text style={ms.statusText}>ACTIVE</Text>
          </View>
        </View>

        {/* Pulse strip */}
        <View style={ms.pulseStrip}>
          <View style={ms.pulseCell}>
            <Text style={ms.pulseValue}>{teamObj?.flag ?? '?'}</Text>
            <Text style={ms.pulseLabel}>NATION</Text>
          </View>
          <View style={ms.pulseSep} />
          <View style={ms.pulseCell}>
            <Text style={ms.pulseValue}>{comparison?.baseStrength ?? '—'}</Text>
            <Text style={ms.pulseLabel}>BASE STR</Text>
          </View>
          <View style={ms.pulseSep} />
          <View style={ms.pulseCell}>
            <Text style={[ms.pulseValue, { color: strengthDelta === 0 ? D.blue : strengthDelta > 0 ? D.green : D.red }]}>
              {strengthDelta > 0 ? `+${strengthDelta}` : strengthDelta === 0 ? '0' : `${strengthDelta}`}
            </Text>
            <Text style={ms.pulseLabel}>DELTA</Text>
          </View>
          <View style={ms.pulseSep} />
          <View style={ms.pulseCell}>
            <Text style={[ms.pulseValue, { color: divergenceColor }]}>
              {comparison?.divergenceIndex ?? 0}
            </Text>
            <Text style={ms.pulseLabel}>DIVERG.</Text>
          </View>
          <View style={ms.pulseSep} />
          <View style={ms.pulseCell}>
            <Text style={ms.pulseValue}>{comparison?.group ?? '—'}</Text>
            <Text style={ms.pulseLabel}>GROUP</Text>
          </View>
        </View>
      </View>

      {/* Scrollable content */}
      <Animated.ScrollView
        style={[ms.scroll, { opacity: fadeIn }]}
        contentContainerStyle={[ms.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Team selector ── */}
        <View style={ms.section}>
          <SectionHeader
            title="SELECT NATION"
            sub="Choose the team to diverge from base timeline"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ts.row}
          >
            {WC_TEAMS.map(t => {
              const active = t.name === selectedTeam;
              return (
                <TouchableOpacity
                  key={t.name}
                  style={[
                    ts.chip,
                    active && { borderColor: `${D.purple}60`, backgroundColor: `${D.purple}12` },
                  ]}
                  onPress={() => selectTeam(t.name)}
                  activeOpacity={0.7}
                >
                  <Text style={ts.chipFlag}>{t.flag}</Text>
                  {active && <View style={ts.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {teamObj && (
            <View style={ts.selectedInfo}>
              <Text style={ts.selectedFlag}>{teamObj.flag}</Text>
              <View style={ts.selectedText}>
                <Text style={ts.selectedName}>{teamObj.name}</Text>
                <Text style={ts.selectedMeta}>{teamObj.federation}  ·  Group {teamObj.group}  ·  Strength {teamObj.strength}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Strength override control ── */}
        <View style={ms.section}>
          <SectionHeader
            title="STRENGTH OVERRIDE"
            sub="Shift this team's effective strength and observe the divergence"
          />
          <View style={ctrl.card}>

            {/* Main control row */}
            <View style={ctrl.controlRow}>
              <TouchableOpacity
                style={[ctrl.btn, strengthDelta <= STRENGTH_MIN && ctrl.btnDisabled]}
                onPress={() => adjustDelta(-1)}
                activeOpacity={0.7}
                disabled={strengthDelta <= STRENGTH_MIN}
              >
                <Text style={ctrl.btnText}>−</Text>
              </TouchableOpacity>

              <View style={ctrl.displayBlock}>
                <View style={ctrl.strRow}>
                  <View style={ctrl.strCol}>
                    <Text style={ctrl.strLabel}>BASE</Text>
                    <Text style={ctrl.strValue}>{comparison?.baseStrength ?? '—'}</Text>
                  </View>
                  <Text style={ctrl.strArrow}>→</Text>
                  <View style={ctrl.strCol}>
                    <Text style={ctrl.strLabel}>ALTERNATE</Text>
                    <Text style={[ctrl.strValue, {
                      color: strengthDelta === 0 ? D.text1 : strengthDelta > 0 ? D.green : D.red
                    }]}>
                      {comparison?.altStrength ?? '—'}
                    </Text>
                  </View>
                </View>
                <View style={ctrl.deltaBadge}>
                  <Text style={[ctrl.deltaText, {
                    color: strengthDelta === 0 ? D.text3 : strengthDelta > 0 ? D.green : D.red
                  }]}>
                    {strengthDelta > 0 ? `+${strengthDelta}` : strengthDelta === 0 ? 'BASE TIMELINE' : `${strengthDelta}`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[ctrl.btn, strengthDelta >= STRENGTH_MAX && ctrl.btnDisabled]}
                onPress={() => adjustDelta(1)}
                activeOpacity={0.7}
                disabled={strengthDelta >= STRENGTH_MAX}
              >
                <Text style={ctrl.btnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Divergence bar */}
            <View style={ctrl.divSection}>
              <View style={ctrl.divRow}>
                <Text style={ctrl.divLabel}>DIVERGENCE INDEX</Text>
                <Text style={[ctrl.divValue, { color: divergenceColor }]}>
                  {comparison?.divergenceIndex ?? 0}
                </Text>
              </View>
              <View style={ctrl.divTrack}>
                <View style={[ctrl.divFill, {
                  width: `${comparison?.divergenceIndex ?? 0}%` as any,
                  backgroundColor: divergenceColor,
                }]} />
              </View>
              <Text style={ctrl.divNote}>
                {(comparison?.divergenceIndex ?? 0) === 0
                  ? 'No divergence — base timeline active'
                  : (comparison?.divergenceIndex ?? 0) < 35
                  ? 'Low divergence — minor probability shifts'
                  : (comparison?.divergenceIndex ?? 0) < 65
                  ? 'Significant divergence — group dynamics altered'
                  : 'Maximum divergence — this timeline is radically different'}
              </Text>
            </View>

          </View>
        </View>

        {/* ── Match analysis ── */}
        {comparison && comparison.matches.length > 0 && (
          <View style={ms.section}>
            <SectionHeader
              title="MATCH ANALYSIS"
              sub={`${comparison.matches.length} group-stage fixtures  ·  base vs alternate probabilities`}
            />
            <View style={ms.gap8}>
              {comparison.matches.map((m, i) => (
                <MatchCard key={m.opponent} match={m} index={i} />
              ))}
            </View>
          </View>
        )}

        {/* ── Qualification shift ── */}
        {comparison && (
          <View style={ms.section}>
            <SectionHeader
              title="QUALIFICATION SHIFT"
              sub="Group-stage qualification probability — base vs alternate"
            />
            <View style={qs.card}>
              <QualRow base={comparison.baseQualProb} alt={comparison.altQualProb} />
              <View style={qs.ptsRow}>
                <View style={qs.ptsBlock}>
                  <Text style={qs.ptsLabel}>BASE XP</Text>
                  <Text style={qs.ptsValue}>{comparison.baseExpectedPts.toFixed(2)}</Text>
                </View>
                <Text style={qs.ptsArrow}>→</Text>
                <View style={qs.ptsBlock}>
                  <Text style={qs.ptsLabel}>ALT XP</Text>
                  <Text style={[qs.ptsValue, {
                    color: comparison.altExpectedPts > comparison.baseExpectedPts ? D.green
                         : comparison.altExpectedPts < comparison.baseExpectedPts ? D.red
                         : D.text1
                  }]}>{comparison.altExpectedPts.toFixed(2)}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Delta value={comparison.altExpectedPts - comparison.baseExpectedPts} format="pts" />
              </View>
            </View>
          </View>
        )}

        {/* ── Group ripple ── */}
        {comparison && comparison.groupRipple.length > 0 && (
          <View style={ms.section}>
            <SectionHeader
              title={`GROUP ${comparison.group} — RIPPLE EFFECT`}
              sub="How rivals' expected group-stage points shift in this timeline"
            />
            <View style={ms.cardWrap}>
              {comparison.groupRipple.map(r => (
                <RippleRow key={r.name} ripple={r} />
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={ms.footer}>
          <Image
            source={require('../assets/blue_lobster.png')}
            style={ms.footerLogo}
            resizeMode="contain"
          />
          <Text style={ms.footerPrimary}>Lili Alternate Timeline</Text>
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
    position: 'absolute', top: -80, left: -60,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(192,96,255,0.03)',
    shadowColor: '#C060FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 90,
  },

  header: {
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: D.sep, gap: 14,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1.5, borderColor: 'rgba(192,96,255,0.35)',
    backgroundColor: 'rgba(192,96,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#C060FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 6, overflow: 'hidden',
  },
  logo:       { width: 44, height: 44, borderRadius: 22 },
  titleBlock: { flex: 1, gap: 1 },
  eyebrow:    { fontSize: 9, fontWeight: '800', color: D.purple, letterSpacing: 3 },
  title:      { fontSize: 20, fontWeight: '800', color: D.text1, letterSpacing: -0.3 },
  tagline:    { fontSize: 10, color: D.text3, letterSpacing: 0.2 },

  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(192,96,255,0.22)',
    backgroundColor: 'rgba(192,96,255,0.06)',
  },
  statusText: { fontSize: 7, fontWeight: '800', color: D.purple, letterSpacing: 1.5 },

  pulseStrip: {
    flexDirection: 'row', backgroundColor: D.surface,
    borderRadius: 12, borderWidth: 1, borderColor: D.border, paddingVertical: 10,
  },
  pulseCell:  { flex: 1, alignItems: 'center', gap: 2 },
  pulseSep:   { width: 1, backgroundColor: D.sep },
  pulseValue: { fontSize: 14, fontWeight: '700', color: D.blue },
  pulseLabel: { fontSize: 6, fontWeight: '700', color: D.text3, letterSpacing: 0.8, textAlign: 'center' },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  section:       { marginBottom: 24 },
  gap8:          { gap: 8 },
  cardWrap:      { backgroundColor: D.card, borderRadius: 12, borderWidth: 1, borderColor: D.border, paddingHorizontal: 14, paddingTop: 4 },

  footer: {
    alignItems: 'center', paddingTop: 24, gap: 8,
    borderTopWidth: 1, borderTopColor: D.sep,
  },
  footerLogo:    { width: 26, height: 26, borderRadius: 13, opacity: 0.35 },
  footerPrimary: { fontSize: 10, color: 'rgba(238,242,255,0.18)', fontWeight: '600', letterSpacing: 0.3 },
  footerSub:     { fontSize: 8,  color: 'rgba(238,242,255,0.09)', letterSpacing: 0.2 },
});

const ts = StyleSheet.create({
  row:          { flexDirection: 'row', gap: 8, paddingHorizontal: 2, paddingBottom: 2 },
  chip: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.surface, borderWidth: 1, borderColor: D.border,
  },
  chipFlag:    { fontSize: 22 },
  activeDot:   { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: D.purple },
  selectedInfo:{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: D.sep },
  selectedFlag:{ fontSize: 32 },
  selectedText:{ flex: 1, gap: 2 },
  selectedName:{ fontSize: 16, fontWeight: '700', color: D.text1 },
  selectedMeta:{ fontSize: 10, color: D.text3, letterSpacing: 0.3 },
});

const ctrl = StyleSheet.create({
  card:       { backgroundColor: D.card, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 16, gap: 16 },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.surface, borderWidth: 1, borderColor: `${D.purple}30`,
  },
  btnDisabled:{ opacity: 0.3 },
  btnText:    { fontSize: 22, fontWeight: '300', color: D.purple },
  displayBlock:{ flex: 1, gap: 8 },
  strRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  strCol:     { alignItems: 'center', gap: 3 },
  strLabel:   { fontSize: 7, fontWeight: '800', color: D.text3, letterSpacing: 1.2 },
  strValue:   { fontSize: 28, fontWeight: '700', color: D.text1 },
  strArrow:   { fontSize: 14, color: D.text3 },
  deltaBadge: { alignItems: 'center' },
  deltaText:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  divSection: { gap: 8, paddingTop: 4 },
  divRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divLabel:   { fontSize: 7, fontWeight: '800', color: D.text3, letterSpacing: 1.2 },
  divValue:   { fontSize: 14, fontWeight: '700' },
  divTrack:   { height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  divFill:    { height: 5, borderRadius: 3 },
  divNote:    { fontSize: 10, color: D.text3, lineHeight: 15 },
});

const qs = StyleSheet.create({
  card:    { backgroundColor: D.card, borderRadius: 12, borderWidth: 1, borderColor: D.border, padding: 16, gap: 14 },
  ptsRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: D.sep },
  ptsBlock:{ gap: 2 },
  ptsLabel:{ fontSize: 7, fontWeight: '800', color: D.text3, letterSpacing: 1.2 },
  ptsValue:{ fontSize: 16, fontWeight: '700', color: D.text1 },
  ptsArrow:{ fontSize: 12, color: D.text3 },
});
