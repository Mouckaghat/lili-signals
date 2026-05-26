import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Route definitions ────────────────────────────────────────────────────────

type RouteItem =
  | { key: string; path: string; icon: string; image?: never; label: string }
  | { key: string; path: string; icon?: never; image: any;   label: string };

const ROUTES: RouteItem[] = [
  { key: 'home',    path: '/',                        icon: '🏠',  label: 'Home'    },
  { key: 'intel',   path: '/lili-route-intelligence', icon: '🧠',  label: 'Intel'   },
  { key: 'signals', path: '/world-signals',           icon: '📡',  label: 'Signals' },
  { key: 'route',   path: '/team-route',              icon: '📍',  label: 'Route'   },
  { key: 'lili',    path: '/lili-simulation',
    image: require('../assets/blue_lobster.png'),                   label: 'Lili'    },
] as const;

const HIDE_DELAY    = 2600;
const SHOW_DURATION = 220;
const HIDE_DURATION = 300;
const TRIGGER_ZONE  = 80;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isActive(routePath: string, pathname: string): boolean {
  if (routePath === '/') {
    return pathname === '/' || pathname === '' || pathname === '/index';
  }
  return pathname === routePath || pathname.startsWith(routePath + '/');
}

// ─── Lobster icon ─────────────────────────────────────────────────────────────

function LobsterIcon({ active }: { active: boolean }) {
  return (
    <View
      style={[
        s.lobsterWrapper,
        active && {
          shadowColor: '#4A9EFF',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 10,
          elevation: 8,
        },
      ]}
    >
      <View style={[s.lobsterClip, active && s.lobsterClipActive]}>
        <Image
          source={require('../assets/blue_lobster.png')}
          style={s.lobsterImg}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BottomNavigationDock() {
  const router   = useRouter();
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();
  const { i18n } = useLanguage();

  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(16)).current;
  const handleFade = useRef(new Animated.Value(1)).current;

  const visibleRef = useRef(false);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [interactive, setInteractive] = useState(false);

  // ── show / hide / schedule ────────────────────────────────────────────────

  const hide = useCallback(() => {
    if (!visibleRef.current) return;
    visibleRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);

    Animated.parallel([
      Animated.timing(fadeAnim,   { toValue: 0,  duration: HIDE_DURATION, useNativeDriver: true }),
      Animated.timing(slideAnim,  { toValue: 16, duration: HIDE_DURATION, useNativeDriver: true }),
      Animated.timing(handleFade, { toValue: 1,  duration: HIDE_DURATION, useNativeDriver: true }),
    ]).start(() => setInteractive(false));
  }, [fadeAnim, slideAnim, handleFade]);

  const schedule = useCallback((delay = HIDE_DELAY) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(hide, delay);
  }, [hide]);

  const show = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!visibleRef.current) {
      visibleRef.current = true;
      setInteractive(true);

      Animated.parallel([
        Animated.timing(fadeAnim,   { toValue: 1, duration: SHOW_DURATION, useNativeDriver: true }),
        Animated.spring(slideAnim,  { toValue: 0, useNativeDriver: true, tension: 280, friction: 22 }),
        Animated.timing(handleFade, { toValue: 0, duration: SHOW_DURATION, useNativeDriver: true }),
      ]).start();
    }

    schedule();
  }, [fadeAnim, slideAnim, handleFade, schedule]);

  // ── Keep showRef current for event listeners ──────────────────────────────

  const showRef = useRef(show);
  useEffect(() => { showRef.current = show; }, [show]);

  // ── Web: proximity detection ──────────────────────────────────────────────

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const onMove = (e: Event) => {
      const me = e as MouseEvent;
      if (window.innerHeight - me.clientY <= TRIGGER_ZONE) {
        showRef.current();
      }
    };

    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // ── Navigation ────────────────────────────────────────────────────────────

  const navigate = useCallback((path: string) => {
    schedule(700);
    if (!isActive(path, pathname)) {
      router.push(path as any);
    }
  }, [pathname, router, schedule]);

  // ── Render ────────────────────────────────────────────────────────────────

  const dockBottom   = insets.bottom + 10;
  const handleBottom = insets.bottom + 5;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">

      {/* ── Handle indicator ── */}
      <Animated.View
        style={[s.handleWrapper, { bottom: handleBottom, opacity: handleFade }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={s.handleTouchArea}
          onPress={show}
          activeOpacity={0.35}
        >
          <View style={s.handlePill} />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Navigation dock ── */}
      <Animated.View
        style={[
          s.dock,
          {
            bottom:    dockBottom,
            opacity:   fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        pointerEvents={interactive ? 'auto' : 'none'}
      >
        {ROUTES.map((route) => {
          const active = isActive(route.path, pathname);
          return (
            <TouchableOpacity
              key={route.key}
              style={s.item}
              onPress={() => navigate(route.path)}
              onPressIn={() => schedule()}
              activeOpacity={0.6}
            >
              {route.image ? (
                <LobsterIcon active={active} />
              ) : (
                <Text style={[s.icon, active && { opacity: 1 }]}>{route.icon}</Text>
              )}
              <Text style={[s.label, active && s.labelActive]}>
                {(i18n.navLabels as Record<string, string>)[route.key] ?? route.label}
              </Text>
              {active && <View style={s.dot} />}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Handle
  handleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  handleTouchArea: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    alignItems: 'center',
  },
  handlePill: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#8E8E93',
    opacity: 0.28,
  },

  // ── Dock card
  dock: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 28,
    elevation: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    zIndex: 100,
  },

  // ── Nav items
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  icon: {
    fontSize: 20,
    opacity: 0.72,
  },
  label: {
    fontSize: 9,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: 0.15,
    textAlign: 'center',
  },
  labelActive: {
    color: '#005F8E',
    fontWeight: '700',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#005F8E',
    marginTop: 1,
  },

  // ── Lobster icon
  lobsterWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lobsterClip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.3)',
  },
  lobsterClipActive: {
    borderColor: '#4A9EFF',
    borderWidth: 1.5,
  },
  lobsterImg: {
    width: 22,
    height: 22,
  },
});
