import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkApiHealth, type ApiStatus } from '../lib/apiClient';
import { PLAYERS, type PlayerXI } from '../lib/playerXI';
import { useLanguage } from '../contexts/LanguageContext';
import { I18N, LANGUAGES, type LangCode } from '../lib/i18n';

// Maps player jersey number (1–11) to i18n.modules array index.
// Computed once at module load from EN titles vs PLAYERS.name.
const PLAYER_MODULE_IDX: Partial<Record<number, number>> = Object.fromEntries(
  I18N['EN'].modules
    .map((m, idx) => {
      const p = PLAYERS.find(pl => pl.name === m.title);
      return p ? ([p.number, idx] as [number, number]) : null;
    })
    .filter((x): x is [number, number] => x !== null)
);

// ─── Design tokens ────────────────────────────────────────────────────────────

const D = {
  bg:           '#05080F',
  surface:      '#0A1020',
  card:         '#0D1830',
  border:       'rgba(80,140,255,0.12)',
  borderGold:   'rgba(212,165,32,0.30)',
  blue:         '#4A9EFF',
  blueDim:      'rgba(74,158,255,0.12)',
  gold:         '#D4A520',
  goldDim:      'rgba(212,165,32,0.10)',
  orange:       '#FF7B35',
  text1:        '#EEF2FF',
  text2:        '#7A90B8',
  text3:        '#374F7A',
  green:        '#34D399',
  separator:    'rgba(80,140,255,0.15)',
  signalGreen:  '#00e5a0',
};

const GLOW = {
  connected: {
    base:   '#00e5a0',
    halo08: 'rgba(0,229,160,0.13)',
    halo16: 'rgba(0,229,160,0.24)',
    border: 'rgba(0,229,160,0.50)',
    label:  'rgba(0,229,160,0.55)',
  },
  checking: {
    base:   '#f59e0b',
    halo08: 'rgba(245,158,11,0.08)',
    halo16: 'rgba(245,158,11,0.16)',
    border: 'rgba(245,158,11,0.35)',
    label:  'rgba(245,158,11,0.55)',
  },
  error: {
    base:   '#ef4444',
    halo08: 'rgba(239,68,68,0.08)',
    halo16: 'rgba(239,68,68,0.16)',
    border: 'rgba(239,68,68,0.35)',
    label:  'rgba(239,68,68,0.55)',
  },
} as const;

// Capsules always stay signal-green (language = connect action)
const SIGNAL_GREEN_08  = 'rgba(0,229,160,0.08)';
const SIGNAL_GREEN_16  = 'rgba(0,229,160,0.16)';
const SIGNAL_GREEN_35  = 'rgba(0,229,160,0.35)';
const SIGNAL_GREEN_55  = 'rgba(0,229,160,0.55)';

// WC 2026 Final: MetLife Stadium, July 19 2026 at 22:00 UTC
const WC_KICKOFF = new Date('2026-07-19T22:00:00Z');

// ─── Countdown logic ──────────────────────────────────────────────────────────

function useCountdown() {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, live: false });

  useEffect(() => {
    const update = () => {
      const diff = WC_KICKOFF.getTime() - Date.now();
      if (diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0, live: true });
        return;
      }
      setTime({
        days:    Math.floor(diff / 86_400_000),
        hours:   Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1000),
        live:    false,
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

// ─── Countdown block ──────────────────────────────────────────────────────────

function CountdownBlock({ lang }: { lang: LangCode }) {
  const { days, hours, minutes, seconds, live } = useCountdown();
  const tx = I18N[lang];

  if (live) {
    return (
      <View style={ls.countdownCard}>
        <Text style={ls.countdownLive}>{tx.live}</Text>
        <Text style={ls.countdownSub}>USA · Canada · Mexico</Text>
      </View>
    );
  }

  const cells = [
    { value: days,    label: tx.days },
    { value: hours,   label: tx.hrs  },
    { value: minutes, label: tx.min  },
    { value: seconds, label: tx.sec  },
  ];

  return (
    <View style={ls.countdownCard}>
      <Text style={ls.countdownTitle}>{tx.kickoffIn}</Text>
      <View style={ls.countdownRow}>
        {cells.map(({ value, label }, i) => (
          <View key={String(i)} style={ls.countdownCell}>
            <Text style={ls.countdownValue}>{String(value).padStart(2, '0')}</Text>
            <Text style={ls.countdownLabel}>{label}</Text>
            {i < cells.length - 1 && <Text style={ls.countdownColon}>:</Text>}
          </View>
        ))}
      </View>
      <Text style={ls.countdownSub}>
        MetLife Stadium · New York/New Jersey · July 19, 2026
      </Text>
    </View>
  );
}

// ─── Lobster signal node ──────────────────────────────────────────────────────

function LobsterSignalNode({
  lang,
  onSelectLang,
  apiStatus,
}: {
  lang: LangCode;
  onSelectLang: (l: LangCode) => void;
  apiStatus: ApiStatus;
}) {
  const [open, setOpen] = useState(false);

  const breathe        = useRef(new Animated.Value(0.35)).current;
  const rippleScale    = useRef(new Animated.Value(1)).current;
  const rippleOpacity  = useRef(new Animated.Value(0)).current;
  const capsuleOpacity = useRef(new Animated.Value(0)).current;
  const capsuleY       = useRef(new Animated.Value(10)).current;
  const labelPulse     = useRef(new Animated.Value(0.45)).current;

  // Breathing glow loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1,    duration: 2200, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.32, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, [breathe]);

  // Label pulse — one full cycle = 3 seconds
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(labelPulse, { toValue: 1,    duration: 1500, useNativeDriver: true }),
        Animated.timing(labelPulse, { toValue: 0.45, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [labelPulse]);

  function openCapsules() {
    setOpen(true);
    Animated.parallel([
      Animated.timing(capsuleOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(capsuleY,       { toValue: 0, useNativeDriver: true, tension: 200, friction: 18 }),
    ]).start();
  }

  function closeCapsules(cb?: () => void) {
    Animated.parallel([
      Animated.timing(capsuleOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(capsuleY,       { toValue: 10, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setOpen(false);
      cb?.();
    });
  }

  function handleNodePress() {
    open ? closeCapsules() : openCapsules();
  }

  const g = apiStatus === 'connected' ? GLOW.connected
           : apiStatus === 'checking'  ? GLOW.checking
           : GLOW.error;

  function selectLanguage(code: LangCode) {
    // Node intensification burst
    Animated.sequence([
      Animated.timing(breathe,       { toValue: 1,    duration: 80,   useNativeDriver: true }),
      Animated.timing(breathe,       { toValue: 0.35, duration: 2500, useNativeDriver: true }),
    ]).start();
    // Ripple expands outward slowly
    Animated.sequence([
      Animated.timing(rippleScale,   { toValue: 1,   duration: 0,    useNativeDriver: true }),
      Animated.timing(rippleScale,   { toValue: 3.4, duration: 1600, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(rippleOpacity, { toValue: 0.85, duration: 80,   useNativeDriver: true }),
      Animated.timing(rippleOpacity, { toValue: 0,    duration: 1520, useNativeDriver: true }),
    ]).start();

    closeCapsules(() => onSelectLang(code));
  }

  return (
    <View style={ls.signalSection}>
      <TouchableOpacity
        onPress={handleNodePress}
        activeOpacity={0.85}
        style={ls.signalTouch}
      >
        {/* Atmospheric halos — color driven by API status */}
        <Animated.View style={[ls.signalHaloOuter, { opacity: breathe, backgroundColor: g.halo08 }]} />
        <Animated.View style={[ls.signalHaloMid,   { opacity: breathe, backgroundColor: g.halo16 }]} />
        {/* Outward ripple on selection */}
        <Animated.View
          style={[
            ls.signalRipple,
            { opacity: rippleOpacity, transform: [{ scale: rippleScale }], borderColor: g.base },
          ]}
        />
        {/* Logo ring — border + shadow reflect API status */}
        <View style={[ls.logoGlowRing, { borderColor: g.border, shadowColor: g.base }]}>
          <Image
            source={require('../assets/blue_lobster.png')}
            style={ls.logoImg}
            resizeMode="contain"
          />
        </View>
      </TouchableOpacity>

      <Animated.Text style={[ls.signalLabel, { color: g.label, opacity: labelPulse }]}>{I18N[lang].chooseLang}</Animated.Text>

      {open && (
        <Animated.View
          style={[
            ls.capsuleRow,
            { opacity: capsuleOpacity, transform: [{ translateY: capsuleY }] },
          ]}
        >
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => selectLanguage(l)}
              activeOpacity={0.7}
              style={[ls.capsule, l === lang && ls.capsuleActive]}
            >
              <Text style={[ls.capsuleText, l === lang && ls.capsuleTextActive]}>
                {l}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

// ─── Pitch formation ──────────────────────────────────────────────────────────

const DEFAULT_FORMATION: number[][] = [
  [11, 10, 9],     // attack
  [6,  7,  8],     // midfield
  [5,  3,  4,  2], // defense
  [1],             // GK (always locked)
];

// Formation label: read rows bottom-up, skip GK
function formationLabel(f: number[][]): string {
  return [...f].reverse().slice(1).map(r => r.length).join(' · ');
}

// Same row → swap. Different rows → insert mover before target (row sizes change).
function movePlayer(f: number[][], moverNum: number, targetNum: number): number[][] {
  let mR = -1, mC = -1, tR = -1, tC = -1;
  for (let r = 0; r < f.length; r++) {
    for (let c = 0; c < f[r].length; c++) {
      if (f[r][c] === moverNum) { mR = r; mC = c; }
      if (f[r][c] === targetNum) { tR = r; tC = c; }
    }
  }
  if (mR === -1 || tR === -1) return f;
  const next = f.map(row => [...row]);
  if (mR === tR) {
    // Same row: swap
    [next[mR][mC], next[tR][tC]] = [next[tR][tC], next[mR][mC]];
  } else {
    // Cross-row: remove from source, insert before target
    if (next[mR].length <= 1) return f; // keep at least one player per row
    next[mR].splice(mC, 1);
    const newTC = next[tR].indexOf(targetNum);
    next[tR].splice(newTC, 0, moverNum);
  }
  return next;
}

function PitchPlayerCard({
  player, lang, flash, isSelected, isTarget, onPress, onLongPress,
}: {
  player:      PlayerXI;
  lang:        LangCode;
  flash:       Animated.Value;
  isSelected:  boolean;
  isTarget:    boolean;
  onPress:     () => void;
  onLongPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: isSelected ? 1.07 : 1, useNativeDriver: true, friction: 7 }).start();
  }, [isSelected, scale]);

  const moduleIdx  = PLAYER_MODULE_IDX[player.number];
  const displayName = moduleIdx !== undefined ? I18N[lang].modules[moduleIdx].title : player.name;
  const borderColor = isSelected ? '#D4A520' : isTarget ? `${player.accentColor}70` : `${player.accentColor}35`;

  return (
    <Animated.View style={[pp.wrap, { opacity: flash, transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[
          pp.card,
          { borderColor },
          isSelected && pp.cardSelected,
          isTarget   && pp.cardTarget,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        activeOpacity={0.7}
      >
        <View style={[pp.posBadge, { backgroundColor: `${player.accentColor}15` }]}>
          <Text style={[pp.pos, { color: player.accentColor }]}>{player.position}</Text>
          <Text style={pp.num}>#{player.number}</Text>
        </View>
        <Text style={pp.icon}>{player.icon}</Text>
        <Text style={pp.name} numberOfLines={2}>{displayName}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const pp = StyleSheet.create({
  wrap: { flex: 1 },
  card: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: 10, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.025)',
    paddingVertical: 8, paddingHorizontal: 4,
    minHeight: 82,
  },
  cardSelected: { backgroundColor: 'rgba(212,165,32,0.10)' },
  cardTarget:   { backgroundColor: 'rgba(80,140,255,0.05)' },
  posBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  pos:  { fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  num:  { fontSize: 7, fontWeight: '600', color: 'rgba(238,242,255,0.35)' },
  icon: { fontSize: 20 },
  name: { fontSize: 8, fontWeight: '700', color: 'rgba(238,242,255,0.75)', textAlign: 'center', lineHeight: 11, letterSpacing: 0.2 },
});

function PitchFormation({ cardFlashes, cardLangs }: { cardFlashes: Animated.Value[]; cardLangs: LangCode[] }) {
  const [formation, setFormation] = useState<number[][]>(DEFAULT_FORMATION);
  const [selected, setSelected]   = useState<number | null>(null);
  const { i18n } = useLanguage();

  const formLabel  = formationLabel(formation);
  const isDefault  = JSON.stringify(formation) === JSON.stringify(DEFAULT_FORMATION);

  function handlePress(num: number) {
    if (selected === null) {
      router.push(PLAYERS.find(p => p.number === num)!.path as any);
    } else if (selected === num) {
      setSelected(null);
    } else {
      setFormation(prev => movePlayer(prev, selected, num));
      setSelected(null);
    }
  }

  function handleLongPress(num: number) {
    if (num === 1) return; // GK stays
    setSelected(prev => (prev === num ? null : num));
  }

  return (
    <View style={pf.section}>
      <View style={pf.sectionHeader}>
        <Text style={pf.sectionLabel}>{i18n.liliXILabel.toUpperCase()}</Text>
        <View style={pf.pillRow}>
          {!isDefault && (
            <TouchableOpacity
              style={pf.resetBtn}
              onPress={() => { setFormation(DEFAULT_FORMATION); setSelected(null); }}
              activeOpacity={0.7}
            >
              <Text style={pf.resetText}>↩</Text>
            </TouchableOpacity>
          )}
          <View style={pf.formationPill}>
            <Text style={pf.formationText}>{formLabel}</Text>
          </View>
        </View>
      </View>

      <View style={pf.pitch}>
        {/* Pitch decorations */}
        <View pointerEvents="none" style={pf.decorLayer}>
          <View style={pf.halfLine} />
          <View style={pf.centerCircle} />
        </View>

        {/* Formation rows */}
        {formation.map((row, rowIdx) => (
          <View key={rowIdx} style={[pf.row, rowIdx === 1 && pf.rowMidAfter]}>
            {row.map(num => {
              const player = PLAYERS.find(p => p.number === num)!;
              return (
                <PitchPlayerCard
                  key={num}
                  player={player}
                  lang={cardLangs[num - 1]}
                  flash={cardFlashes[num - 1]}
                  isSelected={selected === num}
                  isTarget={selected !== null && selected !== num}
                  onPress={() => handlePress(num)}
                  onLongPress={() => handleLongPress(num)}
                />
              );
            })}
          </View>
        ))}
      </View>

      <Text style={pf.tapHint}>
        {selected !== null ? i18n.tapHintSelected : i18n.tapHintDefault}
      </Text>
    </View>
  );
}

const pf = StyleSheet.create({
  section: { marginBottom: 24 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(238,242,255,0.30)', letterSpacing: 2 },

  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resetBtn: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7,
    backgroundColor: 'rgba(212,165,32,0.10)',
    borderWidth: 1, borderColor: 'rgba(212,165,32,0.25)',
  },
  resetText: { fontSize: 11, color: 'rgba(212,165,32,0.70)' },

  formationPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    backgroundColor: 'rgba(74,158,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(74,158,255,0.15)',
  },
  formationText: { fontSize: 9, fontWeight: '800', color: 'rgba(74,158,255,0.7)', letterSpacing: 1.5 },

  pitch: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(80,140,255,0.12)',
    backgroundColor: 'rgba(8,16,40,0.7)',
    overflow: 'hidden',
    padding: 10,
    gap: 8,
  },

  decorLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  halfLine: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: 'rgba(80,140,255,0.07)',
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(80,140,255,0.07)',
    marginTop: -24,
  },

  row:         { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  rowMidAfter: { marginTop: 4 },

  tapHint: {
    textAlign: 'center', marginTop: 8,
    fontSize: 9, color: 'rgba(238,242,255,0.18)', letterSpacing: 0.5,
  },
});

// ─── Landing screen ───────────────────────────────────────────────────────────

export default function LandingScreen() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 640;
  const screenDiag = Math.sqrt(width * width + height * height);

  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');

  // Language — persisted globally via context; local staggered copies drive the wave animation
  const { lang, setLang } = useLanguage();

  // Per-section display languages — updated staggered by the wave
  const [topLang,       setTopLang]       = useState<LangCode>('EN');
  const [countdownLang, setCountdownLang] = useState<LangCode>('EN');
  const [cardLangs,     setCardLangs]     = useState<LangCode[]>(Array(11).fill('EN') as LangCode[]);
  const [footerLang,    setFooterLang]    = useState<LangCode>('EN');

  // Flash animations (opacity: 1 → 0.1 → 1 at update moment)
  const topFlash    = useRef(new Animated.Value(1)).current;
  const countFlash  = useRef(new Animated.Value(1)).current;
  const footerFlash = useRef(new Animated.Value(1)).current;
  const cardFlashes = useRef(Array.from({ length: 11 }, () => new Animated.Value(1))).current;

  // Full-screen wave ring (scale 0→1, opacity fades out)
  const waveScale   = useRef(new Animated.Value(0)).current;
  const waveOpacity = useRef(new Animated.Value(0)).current;

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 1100, delay: 200, useNativeDriver: true }).start();
  }, [fadeIn]);

  const glowPulse = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.55, duration: 3200, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.2,  duration: 3200, useNativeDriver: true }),
      ])
    ).start();
  }, [glowPulse]);

  useEffect(() => {
    let mounted = true;
    checkApiHealth()
      .then((s) => { if (mounted) setApiStatus(s); })
      .catch(() => { if (mounted) setApiStatus('unavailable'); });
    return () => { mounted = false; };
  }, []);

  function flashSection(anim: Animated.Value, delay: number, onMidpoint: () => void) {
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.08, duration: 200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ]).start();
      setTimeout(onMidpoint, 200);
    }, delay);
  }

  function activateLanguage(code: LangCode) {
    if (code === lang) return;

    // Signal node label updates immediately
    setLang(code);

    // Wave burst
    waveScale.setValue(0);
    waveOpacity.setValue(0.6);
    Animated.parallel([
      Animated.timing(waveScale,   { toValue: 1, duration: 2200,             useNativeDriver: true }),
      Animated.timing(waveOpacity, { toValue: 0, duration: 1900, delay: 300, useNativeDriver: true }),
    ]).start();

    // Module cards cascade — 90ms between each card
    for (let i = 0; i < 11; i++) {
      const delay = 250 + i * 90;
      flashSection(cardFlashes[i], delay, () =>
        setCardLangs(prev => { const n = [...prev] as LangCode[]; n[i] = code; return n; })
      );
    }

    // Countdown — above node, reached shortly after first cards
    flashSection(countFlash, 380, () => setCountdownLang(code));

    // Hero tagline + brandSub — further up from node
    flashSection(topFlash, 850, () => setTopLang(code));

    // Footer — furthest below node
    flashSection(footerFlash, 1100, () => setFooterLang(code));
  }

  return (
    <View style={ls.root}>

      {/* Full-screen sync wave — pre-sized to screenDiag, scaled from 0→1 */}
      <Animated.View
        pointerEvents="none"
        style={[
          ls.waveRing,
          {
            width:        screenDiag * 2,
            height:       screenDiag * 2,
            borderRadius: screenDiag,
            left:         width  / 2 - screenDiag,
            top:          height * 0.54 - screenDiag,
            opacity:      waveOpacity,
            transform:    [{ scale: waveScale }],
          },
        ]}
      />

      {/* Atmospheric centre glow */}
      <View style={ls.atmosphereLayer} pointerEvents="none">
        <Animated.View style={[ls.glowOrb, { opacity: glowPulse }]} />
      </View>

      <SafeAreaView style={ls.safe} edges={['top', 'bottom']}>
        <ScrollView
          style={ls.scroll}
          contentContainerStyle={ls.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeIn }}>

            {/* ── Hero ── */}
            <Animated.View style={{ opacity: topFlash }}>
              <View style={ls.heroArea}>
                <Text style={ls.brand}>WORLDCUPILOU</Text>
                <View style={ls.heroSep} />
                <Text style={ls.tagline}>{I18N[topLang].tagline}</Text>
                <View style={ls.taglineDivider} />
                <Text style={ls.tournamentLine}>USA  ·  Canada  ·  Mexico</Text>
                <Text style={ls.tournamentDates}>June 11 – July 19, 2026</Text>
              </View>
            </Animated.View>

            {/* ── Countdown ── */}
            <Animated.View style={{ opacity: countFlash }}>
              <CountdownBlock lang={countdownLang} />
            </Animated.View>

            {/* ── Lobster signal node ── */}
            <LobsterSignalNode lang={lang} onSelectLang={activateLanguage} apiStatus={apiStatus} />

            {/* ── The Lili XI — pitch formation ── */}
            <PitchFormation cardFlashes={cardFlashes} cardLangs={cardLangs} />

            {/* ── Footer ── */}
            <Animated.View style={[ls.footer, { opacity: footerFlash }]}>
              <Text style={ls.footerPrimary}>Worldcupilou by Lobster Inc.</Text>
              <Text style={ls.footerSecondary}>{I18N[footerLang].footerSub}</Text>
            </Animated.View>

          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ls = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 80 },

  // ── Sync wave ring (pre-sized, animated via scale)
  waveRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: D.signalGreen,
    pointerEvents: 'none',
  } as any,

  // ── Atmosphere
  atmosphereLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  } as any,
  glowOrb: {
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(74,158,255,0.035)',
    shadowColor: '#4A9EFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 80,
    elevation: 0,
  },

  // ── Hero
  heroArea: {
    paddingTop: 20,
    marginBottom: 24,
    gap: 6,
  },
  brand: {
    fontSize: 30,
    fontWeight: '900',
    color: D.text1,
    letterSpacing: 6,
    textAlign: 'center',
  },
  brandSub: {
    fontSize: 12,
    color: D.text2,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  heroSep: {
    width: 28,
    height: 1,
    backgroundColor: D.text3,
    opacity: 0.5,
    marginVertical: 8,
    alignSelf: 'center',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '300',
    color: D.text1,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  taglineDivider: {
    width: 40,
    height: 1,
    backgroundColor: D.gold,
    opacity: 0.5,
    marginVertical: 4,
    alignSelf: 'center',
  },
  tournamentLine: {
    fontSize: 12,
    color: D.text2,
    letterSpacing: 1.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  tournamentDates: {
    fontSize: 11,
    color: D.text3,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // ── Countdown
  countdownCard: {
    backgroundColor: D.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: D.border,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 28,
    alignItems: 'center',
    gap: 8,
  },
  countdownTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: D.text3,
    letterSpacing: 2,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownCell: {
    alignItems: 'center',
    position: 'relative',
  },
  countdownValue: {
    fontSize: 36,
    fontWeight: '200',
    color: D.text1,
    letterSpacing: -1,
    minWidth: 56,
    textAlign: 'center',
    ...(Platform.OS === 'web' ? { fontVariant: ['tabular-nums'] } : {}),
  } as any,
  countdownLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: D.text3,
    letterSpacing: 1.2,
  },
  countdownColon: {
    position: 'absolute',
    right: -8,
    top: 4,
    fontSize: 28,
    fontWeight: '200',
    color: D.text3,
  },
  countdownSub: {
    fontSize: 10,
    color: D.text3,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  countdownLive: {
    fontSize: 20,
    fontWeight: '700',
    color: D.green,
    letterSpacing: 0.5,
  },

  // ── Signal node
  signalSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(80,140,255,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(80,140,255,0.08)',
    marginBottom: 28,
  },
  signalTouch: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  signalHaloOuter: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: SIGNAL_GREEN_08,
  },
  signalHaloMid: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: SIGNAL_GREEN_16,
  },
  signalRipple: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: D.signalGreen,
  },
  logoGlowRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: D.surface,
  },
  logoImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  signalLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: SIGNAL_GREEN_55,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  capsuleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  capsule: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.2)',
    backgroundColor: SIGNAL_GREEN_08,
  },
  capsuleActive: {
    borderColor: D.signalGreen,
    backgroundColor: SIGNAL_GREEN_16,
  },
  capsuleText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(0,229,160,0.5)',
    letterSpacing: 1,
  },
  capsuleTextActive: {
    color: D.signalGreen,
  },

  // ── Features grid
  featuresSection: { marginBottom: 20, gap: 10 },
  featuresSectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: D.text3,
    letterSpacing: 1.5,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featuresGridWide: { flexWrap: 'nowrap' },
  // ── Full card (wide / tablet)
  featureCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: D.card,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  featureCardInner: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  // ── Compact card (mobile 2-column)
  featureCardCompact: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: D.card,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  featureCardCompactInner: {
    padding: 10,
    gap: 5,
  },
  featureIconWrapCompact: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLobsterClipCompact: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.4)',
  },
  featureLobsterImgCompact: { width: 22, height: 22 },
  featureIconCompact: { fontSize: 16 },
  featureTitleCompact: {
    fontSize: 11,
    fontWeight: '700',
    color: D.text1,
  },
  featureDescCompact: {
    fontSize: 9,
    color: D.text2,
    lineHeight: 13,
  },
  featureCardWide: { minWidth: 0, flex: 1 },
  featureCardSoon: { opacity: 0.55 },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: { fontSize: 20 },
  featureLobsterClip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.4)',
  },
  featureLobsterImg: { width: 28, height: 28 },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: D.text1,
  },
  featureTitleDim: { color: D.text2 },
  featureDesc: {
    fontSize: 11,
    color: D.text2,
    lineHeight: 16,
  },
  soonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  soonText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // ── Footer
  footer: {
    alignItems: 'center',
    gap: 5,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(80,140,255,0.06)',
  },
  footerPrimary: {
    fontSize: 11,
    color: 'rgba(238,242,255,0.18)',
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  footerSecondary: {
    fontSize: 9,
    color: 'rgba(238,242,255,0.09)',
    letterSpacing: 0.2,
  },
});
