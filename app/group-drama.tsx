import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  computeAllGroupDrama,
  type GroupDrama,
  type DramaLabel,
  type QualifyingPair,
  type TeamDramaStats,
} from '../lib/groupDrama';

// ─── Design tokens ────────────────────────────────────────────────────────────

const D = {
  bg:      '#050810',
  surface: '#0B1426',
  card:    '#0E1933',
  border:  'rgba(80,140,255,0.10)',
  gold:    '#D4A520',
  amber:   '#FF9F0A',
  red:     '#FF5B5B',
  orange:  '#FF7B35',
  yellow:  '#FFD60A',
  green:   '#34D399',
  blue:    '#4A9EFF',
  text1:   '#EEF2FF',
  text2:   '#7A90B8',
  text3:   '#374F7A',
  sep:     'rgba(80,140,255,0.12)',
};

type SortMode = 'drama' | 'alpha';

// ─── Pulse dot ────────────────────────────────────────────────────────────────

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

// ─── Drama badge ──────────────────────────────────────────────────────────────

function DramaBadge({ label, color, index }: { label: DramaLabel; color: string; index: number }) {
  return (
    <View style={[db.wrap, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
      <PulseDot color={color} />
      <Text style={[db.label, { color }]}>{label}</Text>
      <Text style={[db.index, { color }]}>{index}</Text>
    </View>
  );
}

const db = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  label: { fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  index: { fontSize: 11, fontWeight: '700' },
});

// ─── Drama bar ────────────────────────────────────────────────────────────────

function DramaBar({ index, color }: { index: number; color: string }) {
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${index}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const bar = StyleSheet.create({
  track: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  fill:  { height: 3, borderRadius: 2 },
});

// ─── Qual prob bar ────────────────────────────────────────────────────────────

function QualBar({ prob, color }: { prob: number; color: string }) {
  const pct = Math.round(prob * 100);
  return (
    <View style={qb.wrap}>
      <View style={qb.track}>
        <View style={[qb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[qb.pct, { color: pct >= 50 ? color : D.text3 }]}>{pct}%</Text>
    </View>
  );
}

const qb = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  track: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  fill:  { height: 3, borderRadius: 2 },
  pct:   { width: 28, fontSize: 9, fontWeight: '700', textAlign: 'right' },
});

// ─── Team row ─────────────────────────────────────────────────────────────────

function TeamRow({
  team,
  color,
  rank,
}: {
  team: TeamDramaStats;
  color: string;
  rank: number;
}) {
  const qualColor = team.qualProb >= 0.5 ? color : D.text3;
  return (
    <View style={tr.row}>
      <Text style={tr.rank}>{rank}</Text>
      <Text style={tr.flag}>{team.flag}</Text>
      <View style={tr.nameBlock}>
        <Text style={tr.name} numberOfLines={1}>{team.name}</Text>
        <Text style={tr.str}>STR {team.strength}  ·  XP {team.expectedPts.toFixed(1)}</Text>
      </View>
      <QualBar prob={team.qualProb} color={qualColor} />
    </View>
  );
}

const tr = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  rank:      { width: 12, fontSize: 9, fontWeight: '700', color: D.text3, textAlign: 'center' },
  flag:      { fontSize: 18 },
  nameBlock: { width: 110, gap: 1 },
  name:      { fontSize: 12, fontWeight: '600', color: D.text1 },
  str:       { fontSize: 8, color: D.text3, letterSpacing: 0.3 },
});

// ─── Pair row ─────────────────────────────────────────────────────────────────

function PairRow({ pair, rank, color }: { pair: QualifyingPair; rank: number; color: string }) {
  const pct = Math.round(pair.prob * 100);
  return (
    <View style={pr.row}>
      <Text style={[pr.rank, { color: rank === 1 ? color : D.text3 }]}>#{rank}</Text>
      <Text style={pr.pair}>
        {pair.t0f} {pair.t0}  +  {pair.t1f} {pair.t1}
      </Text>
      <Text style={[pr.prob, { color: rank === 1 ? color : D.text2 }]}>{pct}%</Text>
    </View>
  );
}

const pr = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: D.sep },
  rank: { width: 20, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  pair: { flex: 1, fontSize: 11, color: D.text2 },
  prob: { fontSize: 11, fontWeight: '700' },
});

// ─── Group card ───────────────────────────────────────────────────────────────

function GroupCard({ data, index }: { data: GroupDrama; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 340, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY, index]);

  // Sort teams by expected pts descending for display
  const sortedTeams = [...data.teams].sort((a, b) => b.expectedPts - a.expectedPts);

  return (
    <Animated.View style={[gc.wrap, { opacity, transform: [{ translateY }] }]}>
      <Pressable onPress={() => setExpanded(v => !v)} style={gc.inner}>

        {/* Card header */}
        <View style={gc.header}>
          <View style={[gc.groupBadge, { borderColor: `${data.dramaColor}40` }]}>
            <Text style={[gc.groupLetter, { color: data.dramaColor }]}>G{data.group}</Text>
          </View>

          <View style={gc.headerMid}>
            <DramaBadge label={data.dramaLabel} color={data.dramaColor} index={data.dramaIndex} />
            <DramaBar index={data.dramaIndex} color={data.dramaColor} />
          </View>

          <Text style={[gc.chevron, { color: D.text3 }]}>{expanded ? '↑' : '↓'}</Text>
        </View>

        {/* Team list */}
        <View style={gc.teamList}>
          {sortedTeams.map((t, i) => (
            <TeamRow key={t.name} team={t} color={data.dramaColor} rank={i + 1} />
          ))}
        </View>

        {/* Expanded detail */}
        {expanded && (
          <View style={gc.detail}>

            {/* Top qualifying pairs */}
            <View style={gc.detailSection}>
              <Text style={gc.detailTitle}>MOST LIKELY QUALIFIERS</Text>
              {data.topPairs.map((p, i) => (
                <PairRow key={`${p.t0}-${p.t1}`} pair={p} rank={i + 1} color={data.dramaColor} />
              ))}
            </View>

            {/* Dark horse + tightness */}
            <View style={gc.detailRow}>
              {data.darkHorse && (
                <View style={[gc.callout, { borderColor: `${data.dramaColor}30`, backgroundColor: `${data.dramaColor}08` }]}>
                  <Text style={[gc.calloutLabel, { color: data.dramaColor }]}>DARK HORSE</Text>
                  <Text style={gc.calloutValue}>{data.darkHorseFlag} {data.darkHorse}</Text>
                  <Text style={gc.calloutSub}>
                    {Math.round((data.teams.find(t => t.name === data.darkHorse)?.qualProb ?? 0) * 100)}% qual prob
                  </Text>
                </View>
              )}
              <View style={[gc.callout, { borderColor: 'rgba(80,140,255,0.20)', backgroundColor: 'rgba(80,140,255,0.06)' }]}>
                <Text style={[gc.calloutLabel, { color: D.blue }]}>TIGHTNESS</Text>
                <Text style={gc.calloutValue}>{data.tightnessPts.toFixed(2)} pts</Text>
                <Text style={gc.calloutSub}>2nd–3rd gap (xPts)</Text>
              </View>
            </View>

          </View>
        )}

      </Pressable>
    </Animated.View>
  );
}

const gc = StyleSheet.create({
  wrap:  {
    backgroundColor: D.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: D.border,
    overflow: 'hidden',
    marginBottom: 10,
  },
  inner: { padding: 14, gap: 12 },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupBadge:  { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, backgroundColor: 'rgba(80,140,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  groupLetter: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  headerMid:   { flex: 1, gap: 6 },
  chevron:     { fontSize: 12, fontWeight: '600', width: 16, textAlign: 'center' },

  teamList: { gap: 0, borderTopWidth: 1, borderTopColor: D.sep, paddingTop: 8 },

  detail:        { borderTopWidth: 1, borderTopColor: D.sep, paddingTop: 12, gap: 14 },
  detailSection: { gap: 2 },
  detailTitle:   { fontSize: 7, fontWeight: '800', color: D.text3, letterSpacing: 1.5, marginBottom: 4 },
  detailRow:     { flexDirection: 'row', gap: 8 },

  callout: {
    flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, gap: 3,
  },
  calloutLabel: { fontSize: 7, fontWeight: '800', letterSpacing: 1.2 },
  calloutValue: { fontSize: 13, fontWeight: '700', color: D.text1 },
  calloutSub:   { fontSize: 9, color: D.text3 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GroupDramaScreen() {
  const insets = useSafeAreaInsets();

  const breathe = useRef(new Animated.Value(0.25)).current;
  const fadeIn  = useRef(new Animated.Value(0)).current;

  const [sortMode, setSortMode] = useState<SortMode>('drama');

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 0.85, duration: 3200, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.25, duration: 3200, useNativeDriver: true }),
      ])
    ).start();
  }, [breathe, fadeIn]);

  const allDrama = useMemo(() => computeAllGroupDrama(), []);

  const sorted = useMemo(() => {
    const copy = [...allDrama];
    return sortMode === 'drama'
      ? copy.sort((a, b) => b.dramaIndex - a.dramaIndex)
      : copy.sort((a, b) => a.group.localeCompare(b.group));
  }, [allDrama, sortMode]);

  // Summary stats
  const avgDrama     = Math.round(allDrama.reduce((s, g) => s + g.dramaIndex, 0) / allDrama.length);
  const tensionCount = allDrama.filter(g => g.dramaIndex >= 50).length;
  const topGroup     = [...allDrama].sort((a, b) => b.dramaIndex - a.dramaIndex)[0];

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
            <Text style={ms.title}>Drama Index</Text>
            <Text style={ms.tagline}>Group-stage mathematical tension</Text>
          </View>

          <View style={ms.statusChip}>
            <PulseDot color={D.gold} />
            <Text style={ms.statusText}>LIVE</Text>
          </View>
        </View>

        {/* Summary strip */}
        <View style={ms.pulseStrip}>
          <View style={ms.pulseCell}>
            <Text style={[ms.pulseValue, { color: topGroup.dramaColor }]}>{topGroup.group}</Text>
            <Text style={ms.pulseLabel}>MOST TENSE</Text>
          </View>
          <View style={ms.pulseSep} />
          <View style={ms.pulseCell}>
            <Text style={[ms.pulseValue, { color: D.gold }]}>{avgDrama}</Text>
            <Text style={ms.pulseLabel}>AVG DRAMA</Text>
          </View>
          <View style={ms.pulseSep} />
          <View style={ms.pulseCell}>
            <Text style={[ms.pulseValue, { color: D.orange }]}>{tensionCount}</Text>
            <Text style={ms.pulseLabel}>TENSION+</Text>
          </View>
          <View style={ms.pulseSep} />
          <View style={ms.pulseCell}>
            <Text style={ms.pulseValue}>12</Text>
            <Text style={ms.pulseLabel}>GROUPS</Text>
          </View>
        </View>

        {/* Sort toggle */}
        <View style={ms.sortRow}>
          <TouchableOpacity
            style={[ms.sortBtn, sortMode === 'drama' && ms.sortActive]}
            onPress={() => setSortMode('drama')}
            activeOpacity={0.7}
          >
            <Text style={[ms.sortText, sortMode === 'drama' && { color: D.gold }]}>BY DRAMA</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ms.sortBtn, sortMode === 'alpha' && ms.sortActive]}
            onPress={() => setSortMode('alpha')}
            activeOpacity={0.7}
          >
            <Text style={[ms.sortText, sortMode === 'alpha' && { color: D.gold }]}>A → L</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable group cards */}
      <Animated.ScrollView
        style={[ms.scroll, { opacity: fadeIn }]}
        contentContainerStyle={[ms.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {sorted.map((data, i) => (
          <GroupCard key={data.group} data={data} index={i} />
        ))}

        {/* Footer */}
        <View style={ms.footer}>
          <Image
            source={require('../assets/blue_lobster.png')}
            style={ms.footerLogo}
            resizeMode="contain"
          />
          <Text style={ms.footerPrimary}>Lili Group Drama Index</Text>
          <Text style={ms.footerSub}>729-scenario analytical engine · Worldcupilou by Lobster Inc.</Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },

  glowOrb: {
    position: 'absolute', top: -80, right: -60,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(212,165,32,0.03)',
    shadowColor: '#D4A520', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 90,
  },

  header: {
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: D.sep, gap: 12,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1.5, borderColor: 'rgba(212,165,32,0.35)',
    backgroundColor: 'rgba(212,165,32,0.08)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#D4A520', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 6, overflow: 'hidden',
  },
  logo:       { width: 44, height: 44, borderRadius: 22 },
  titleBlock: { flex: 1, gap: 1 },
  eyebrow:    { fontSize: 9, fontWeight: '800', color: D.gold, letterSpacing: 3 },
  title:      { fontSize: 20, fontWeight: '800', color: D.text1, letterSpacing: -0.3 },
  tagline:    { fontSize: 10, color: D.text3, letterSpacing: 0.2 },

  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(212,165,32,0.22)',
    backgroundColor: 'rgba(212,165,32,0.06)',
  },
  statusText: { fontSize: 7, fontWeight: '800', color: D.gold, letterSpacing: 1.5 },

  pulseStrip: {
    flexDirection: 'row', backgroundColor: D.surface,
    borderRadius: 12, borderWidth: 1, borderColor: D.border, paddingVertical: 10,
  },
  pulseCell:  { flex: 1, alignItems: 'center', gap: 2 },
  pulseSep:   { width: 1, backgroundColor: D.sep },
  pulseValue: { fontSize: 14, fontWeight: '700', color: D.blue },
  pulseLabel: { fontSize: 6, fontWeight: '700', color: D.text3, letterSpacing: 0.8, textAlign: 'center' },

  sortRow:   { flexDirection: 'row', gap: 8 },
  sortBtn:   {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: D.border,
    backgroundColor: D.surface, alignItems: 'center',
  },
  sortActive:{ borderColor: 'rgba(212,165,32,0.35)', backgroundColor: 'rgba(212,165,32,0.08)' },
  sortText:  { fontSize: 9, fontWeight: '800', color: D.text3, letterSpacing: 1.4 },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 12 },

  footer: {
    alignItems: 'center', paddingTop: 24, paddingBottom: 8, gap: 8,
    borderTopWidth: 1, borderTopColor: D.sep,
  },
  footerLogo:    { width: 26, height: 26, borderRadius: 13, opacity: 0.35 },
  footerPrimary: { fontSize: 10, color: 'rgba(238,242,255,0.18)', fontWeight: '600', letterSpacing: 0.3 },
  footerSub:     { fontSize: 8,  color: 'rgba(238,242,255,0.09)', letterSpacing: 0.2, textAlign: 'center' },
});
