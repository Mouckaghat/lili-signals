import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type PlayerXI } from '../lib/playerXI';
import { useLanguage } from '../contexts/LanguageContext';
import { PLAYER_I18N } from '../lib/playerI18n';

// ─── Design tokens ────────────────────────────────────────────────────────────

const D = {
  bg:      '#050810',
  surface: '#0B1426',
  card:    '#0E1933',
  border:  'rgba(80,140,255,0.10)',
  text1:   '#EEF2FF',
  text2:   '#7A90B8',
  text3:   '#374F7A',
  sep:     'rgba(80,140,255,0.12)',
};

// ─── Pulse animation dot ──────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 2.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [scale]);
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute', width: 10, height: 10, borderRadius: 5,
        backgroundColor: color, opacity: 0.25, transform: [{ scale }],
      }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

// ─── Feature bullet ───────────────────────────────────────────────────────────

function FeatureBullet({ text, color }: { text: string; color: string }) {
  return (
    <View style={fb.row}>
      <View style={[fb.dot, { backgroundColor: color }]} />
      <Text style={fb.text}>{text}</Text>
    </View>
  );
}

const fb = StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  dot:  { width: 4, height: 4, borderRadius: 2, marginTop: 7 },
  text: { flex: 1, fontSize: 13, color: D.text2, lineHeight: 20 },
});

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  player:   PlayerXI;
  onLaunch: () => void;
}

export default function FeatureIntro({ player, onLaunch }: Props) {
  const { i18n, lang } = useLanguage();
  const insets    = useSafeAreaInsets();
  const fadeIn    = useRef(new Animated.Value(0)).current;
  const slideUp   = useRef(new Animated.Value(24)).current;
  const breathe   = useRef(new Animated.Value(0.3)).current;
  const btnScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 0.9, duration: 2800, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.3, duration: 2800, useNativeDriver: true }),
      ])
    ).start();
  }, [fadeIn, slideUp, breathe]);

  const onPressIn  = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start();

  const { accentColor, icon, number, position, name } = player;
  const p = PLAYER_I18N[lang].players[number - 1];
  const { positionFull, description, features, liliSays } = p;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Accent glow */}
      <Animated.View
        pointerEvents="none"
        style={[s.glow, { backgroundColor: `${accentColor}08`, shadowColor: accentColor, opacity: breathe }]}
      />

      {/* Navigation row */}
      <View style={s.navRow}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
          <Text style={s.backLabel}>{i18n.homeBtn}</Text>
        </TouchableOpacity>

        <View style={[s.xiBadge, { borderColor: `${accentColor}30`, backgroundColor: `${accentColor}08` }]}>
          <PulseDot color={accentColor} />
          <Text style={[s.xiText, { color: accentColor }]}>{`Lili's XI · #${number}`}</Text>
        </View>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ translateY: slideUp }] }}>

          {/* Hero block */}
          <View style={s.hero}>
            <Animated.View style={[s.logoRing, {
              borderColor: `${accentColor}50`,
              backgroundColor: `${accentColor}10`,
              shadowColor: accentColor,
              opacity: breathe,
            }]}>
              <Image
                source={require('../assets/blue_lobster.png')}
                style={s.logo}
                resizeMode="contain"
              />
            </Animated.View>

            <Text style={s.heroIcon}>{icon}</Text>

            <View style={[s.positionBadge, { borderColor: `${accentColor}40`, backgroundColor: `${accentColor}12` }]}>
              <Text style={[s.positionPos, { color: accentColor }]}>{position}</Text>
              <Text style={s.positionSep}>·</Text>
              <Text style={[s.positionFull, { color: accentColor }]}>{positionFull.toUpperCase()}</Text>
            </View>

            <Text style={s.heroName}>{name}</Text>
            <Text style={s.heroSub}>{i18n.formationLine} #{number}</Text>
          </View>

          {/* About */}
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: accentColor }]}>{i18n.about}</Text>
            <Text style={s.descText}>{description}</Text>
          </View>

          {/* Key intelligence */}
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: accentColor }]}>{i18n.keyIntel}</Text>
            <View style={s.bulletList}>
              {features.map((f, i) => (
                <FeatureBullet key={i} text={f} color={accentColor} />
              ))}
            </View>
          </View>

          {/* Lili says */}
          <View style={[s.quoteCard, { borderColor: `${accentColor}25`, borderLeftColor: accentColor }]}>
            <Text style={[s.quoteLabel, { color: accentColor }]}>{i18n.liliSays}</Text>
            <Text style={s.quoteText}>"{liliSays}"</Text>
          </View>

          {/* Launch button */}
          <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 28 }}>
            <TouchableOpacity
              style={[s.launchBtn, { backgroundColor: accentColor }]}
              onPress={onLaunch}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              activeOpacity={0.9}
            >
              <Text style={s.launchText}>{i18n.enterPitch}</Text>
              <Text style={s.launchArrow}>→</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Formation footer */}
          <View style={s.formationFooter}>
            <Image
              source={require('../assets/blue_lobster.png')}
              style={s.footerLogo}
              resizeMode="contain"
            />
            <Text style={s.footerText}>Worldcupilou by Lobster Inc. · Jura Technology</Text>
          </View>

        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },

  glow: {
    position: 'absolute', top: -100, left: -100,
    width: 500, height: 500, borderRadius: 250,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 120,
  },

  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: D.sep,
  },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backArrow: { fontSize: 18, color: D.text2, fontWeight: '300' },
  backLabel: { fontSize: 8, fontWeight: '800', color: D.text3, letterSpacing: 1.5 },
  xiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  xiText: { fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },

  scroll: { paddingHorizontal: 20 },

  hero:       { alignItems: 'center', paddingTop: 28, paddingBottom: 24, gap: 12 },
  logoRing: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16,
    elevation: 8, overflow: 'hidden',
  },
  logo:          { width: 52, height: 52, borderRadius: 26 },
  heroIcon:      { fontSize: 44 },
  positionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  positionPos:   { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  positionSep:   { fontSize: 8, color: D.text3 },
  positionFull:  { fontSize: 8, fontWeight: '800', letterSpacing: 1.2 },
  heroName:      { fontSize: 26, fontWeight: '800', color: D.text1, letterSpacing: -0.5, textAlign: 'center' },
  heroSub:       { fontSize: 10, color: D.text3, letterSpacing: 0.3, textAlign: 'center' },

  section:      { marginBottom: 20 },
  sectionLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1.8, marginBottom: 10 },
  descText:     { fontSize: 15, color: D.text2, lineHeight: 24 },
  bulletList:   { gap: 2 },

  quoteCard: {
    backgroundColor: D.card, borderRadius: 12, borderWidth: 1,
    borderLeftWidth: 3, padding: 16, gap: 8,
  },
  quoteLabel: { fontSize: 7, fontWeight: '800', letterSpacing: 1.5 },
  quoteText:  { fontSize: 15, color: D.text1, lineHeight: 24, fontStyle: 'italic' },

  launchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, paddingVertical: 16,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  launchText:  { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2 },
  launchArrow: { fontSize: 18, color: '#FFFFFF', fontWeight: '300' },

  formationFooter: { alignItems: 'center', paddingTop: 28, gap: 8, borderTopWidth: 1, borderTopColor: D.sep, marginTop: 28 },
  footerLogo:      { width: 22, height: 22, borderRadius: 11, opacity: 0.3 },
  footerText:      { fontSize: 8, color: 'rgba(238,242,255,0.12)', letterSpacing: 0.3, textAlign: 'center' },
});
