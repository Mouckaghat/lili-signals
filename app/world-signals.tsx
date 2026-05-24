import { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

// ─── Signal data ──────────────────────────────────────────────────────────────

interface Intercept {
  flag: string;
  team: string;
  type: string;
  color: string;
  text: string;
  ago: string;
}

const INTERCEPTS: Intercept[] = [
  {
    flag: '🇯🇵', team: 'Japan',
    type: 'SURGE', color: D.cyan,
    text: 'Global attention spiking. Tactical discipline narrative spreading across international signal channels at accelerating rate.',
    ago: '4m',
  },
  {
    flag: '🇲🇦', team: 'Morocco',
    type: 'RISE', color: D.green,
    text: 'Dual momentum detected across African and European channels simultaneously. Historical resonance amplifying signal strength.',
    ago: '11m',
  },
  {
    flag: '🇧🇷', team: 'Brazil',
    type: 'CONCERN', color: D.orange,
    text: 'Fan anxiety increasing following injury reports. Confidence trajectory showing measurable downward pressure across all regions.',
    ago: '19m',
  },
  {
    flag: '🇺🇸', team: 'USA',
    type: 'HYPE', color: D.blue,
    text: 'Host nation atmospheric pressure building. Domestic signal intensity entering high-output zone ahead of opening fixture.',
    ago: '27m',
  },
  {
    flag: '🇦🇷', team: 'Argentina',
    type: 'BURDEN', color: D.red,
    text: 'Defending champion weight detectable across all signal channels. Narrative pressure index at maximum threshold.',
    ago: '35m',
  },
  {
    flag: '🇲🇽', team: 'Mexico',
    type: 'INTENSITY', color: D.gold,
    text: 'Quinto partido mythology activating early. Host nation expectation cluster generating dense signal concentration.',
    ago: '48m',
  },
  {
    flag: '🇫🇷', team: 'France',
    type: 'INSTABILITY', color: D.orange,
    text: 'Media fragmentation detected. Internal camp signal divergence emerging. Cohesion index weakening.',
    ago: '1h',
  },
  {
    flag: '🇩🇪', team: 'Germany',
    type: 'CALM', color: D.text3,
    text: 'Minimal signal volatility. Methodical preparation narrative holding. Emotional baseline stable across regions.',
    ago: '1h 12m',
  },
];

interface PulseTeam {
  flag: string;
  team: string;
  state: string;
  value: number;
  color: string;
}

const PULSE_TEAMS: PulseTeam[] = [
  { flag: '🇦🇷', team: 'Argentina', state: 'BURDEN',      value: 91, color: D.red    },
  { flag: '🇯🇵', team: 'Japan',     state: 'SURGE',       value: 88, color: D.cyan   },
  { flag: '🇲🇦', team: 'Morocco',   state: 'MOMENTUM',    value: 84, color: D.green  },
  { flag: '🇧🇷', team: 'Brazil',    state: 'ANXIETY',     value: 79, color: D.orange },
  { flag: '🇫🇷', team: 'France',    state: 'INSTABILITY', value: 75, color: D.orange },
  { flag: '🇲🇽', team: 'Mexico',    state: 'INTENSITY',   value: 74, color: D.gold   },
  { flag: '🇺🇸', team: 'USA',       state: 'HYPE',        value: 68, color: D.blue   },
  { flag: '🇩🇪', team: 'Germany',   state: 'CALM',        value: 31, color: D.text3  },
];

interface NarrativeArc {
  title: string;
  color: string;
  intensity: number;
  teams: string[];
  desc: string;
}

const NARRATIVES: NarrativeArc[] = [
  {
    title: 'The Underdog Arc',
    color: D.cyan,
    intensity: 94,
    teams: ['🇯🇵 Japan', '🇲🇦 Morocco', '🇺🇸 USA'],
    desc: 'Global fascination with outsider disruption. Upset victories generate disproportionate emotional signal versus established powers.',
  },
  {
    title: 'Golden Generation Pressure',
    color: D.orange,
    intensity: 88,
    teams: ['🇧🇪 Belgium', '🇵🇹 Portugal', '🇫🇷 France'],
    desc: 'Legacy-defining tournament for squads at peak or past it. Expectation weight measurable across all signal channels at once.',
  },
  {
    title: 'Host Nation Destiny',
    color: D.gold,
    intensity: 82,
    teams: ['🇺🇸 USA', '🇲🇽 Mexico', '🇨🇦 Canada'],
    desc: 'Three-nation co-hosting creates layered identity pressure. Home soil advantage meets once-in-a-generation opportunity.',
  },
  {
    title: 'Redemption Campaign',
    color: D.purple,
    intensity: 79,
    teams: ['🇦🇷 Argentina', '🇧🇷 Brazil'],
    desc: 'Defending champions and eternal rivals both carrying fractured momentum into unfamiliar continental territory.',
  },
  {
    title: 'Dark Horse Surge',
    color: D.signal,
    intensity: 71,
    teams: ['🇯🇵 Japan', '🇲🇦 Morocco', '🇸🇳 Senegal'],
    desc: 'Low-expectation entries with structural advantages. Narrative alignment accelerates global attention disproportionately.',
  },
];

interface Region {
  confed: string;
  label: string;
  energy: number;
  trend: string;
  up: boolean;
  color: string;
  desc: string;
}

const REGIONS: Region[] = [
  { confed: 'UEFA',     label: 'Europe',      energy: 88, trend: '+2', up: true,  color: D.blue,   desc: 'Dominant signal volume. Multiple high-expectation nations active.' },
  { confed: 'CONMEBOL', label: 'S. America',  energy: 83, trend: '-4', up: false, color: D.gold,   desc: 'Emotional volatility rising. Brazil + Argentina tension compounding.' },
  { confed: 'AFC',      label: 'Asia',        energy: 73, trend: '+9', up: true,  color: D.cyan,   desc: 'Breakthrough momentum. Japan driving continental signal surge.' },
  { confed: 'CAF',      label: 'Africa',      energy: 68, trend: '+6', up: true,  color: D.purple, desc: 'Morocco narrative amplifying. Historical upset probability activating.' },
  { confed: 'CONCACAF', label: 'N. America',  energy: 65, trend: '+5', up: true,  color: D.orange, desc: 'Host advantage generating unprecedented regional momentum signal.' },
];

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

function InterceptCard({ item, index }: { item: Intercept; index: number }) {
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
        <Text style={ic.ago}>{item.ago} ago</Text>
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

function RegionRow({ region }: { region: Region }) {
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

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WorldSignalsScreen() {
  const insets = useSafeAreaInsets();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [fadeIn]);

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
            <Text style={ms.title}>Signals</Text>
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
            <Text style={[ms.stripValue, { color: D.cyan }]}>24</Text>
            <Text style={ms.stripLabel}>ACTIVE SIGNALS</Text>
          </View>
          <View style={ms.stripSep} />
          <View style={ms.stripCell}>
            <Text style={[ms.stripValue, { color: D.signal }]}>5</Text>
            <Text style={ms.stripLabel}>NARRATIVES</Text>
          </View>
          <View style={ms.stripSep} />
          <View style={ms.stripCell}>
            <Text style={[ms.stripValue, { color: D.purple }]}>6</Text>
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
            title="SIGNAL INTERCEPTS"
            sub="Live intelligence feed"
          />
          <View style={ms.gap8}>
            {INTERCEPTS.map((item, i) => (
              <InterceptCard key={item.team} item={item} index={i} />
            ))}
          </View>
        </View>

        {/* Emotional Pulse */}
        <View style={ms.section}>
          <SectionHeader
            title="EMOTIONAL PULSE"
            sub="Lili-estimated team atmosphere index"
          />
          <View style={ms.pulseCard}>
            <View style={ms.pulseLegend}>
              <Text style={ms.legendLeft}>TEAM</Text>
              <Text style={ms.legendRight}>STATE · INTENSITY</Text>
            </View>
            <View style={ms.sep} />
            <View style={ms.gap10}>
              {PULSE_TEAMS.map((t, i) => (
                <PulseRow key={t.team} team={t} index={i} />
              ))}
            </View>
          </View>
        </View>

        {/* Narrative Arcs */}
        <View style={ms.section}>
          <SectionHeader
            title="NARRATIVE ARCS"
            sub="Active tournament story lines"
          />
          <View style={ms.gap8}>
            {NARRATIVES.map((arc) => (
              <NarrativeCard key={arc.title} arc={arc} />
            ))}
          </View>
        </View>

        {/* Continental Energy */}
        <View style={ms.section}>
          <SectionHeader
            title="CONTINENTAL ENERGY"
            sub="Regional signal momentum · trend vs previous cycle"
          />
          <View style={ms.regionCard}>
            <View style={ms.gap12}>
              {REGIONS.map((r) => (
                <RegionRow key={r.confed} region={r} />
              ))}
            </View>
          </View>
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
