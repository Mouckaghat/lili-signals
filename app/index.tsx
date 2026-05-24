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

// WC 2026 Opening Match: Azteca, June 11 2026 at approx 22:00 UTC
const WC_KICKOFF = new Date('2026-06-11T22:00:00Z');

type LangCode = 'EN' | 'FR' | 'IT' | 'DE' | 'ES' | 'RU' | 'CN';
const LANGUAGES: LangCode[] = ['EN', 'FR', 'IT', 'DE', 'ES', 'RU', 'CN'];

type LangT = {
  tagline: string; brandSub: string;
  kickoffIn: string; live: string;
  days: string; hrs: string; min: string; sec: string;
  chooseLang: string; enterSystem: string; footerSub: string;
  modules: { title: string; desc: string }[];
};

const T: Record<LangCode, LangT> = {
  EN: {
    tagline: 'One World  ·  Forty-Eight Dreams',
    brandSub: 'Your World Cup Companion',
    kickoffIn: 'KICKOFF IN', live: 'Tournament is LIVE',
    days: 'DAYS', hrs: 'HRS', min: 'MIN', sec: 'SEC',
    chooseLang: 'Choose your language',
    enterSystem: 'ENTER THE SYSTEM',
    footerSub: 'under the Jura Technology umbrella',
    modules: [
      { title: 'Team Route',               desc: 'Tournament expedition tracker'   },
      { title: 'Stadium Intelligence',     desc: 'Venue ecosystem intelligence'    },
      { title: 'Confederations',           desc: 'Global power structure'          },
      { title: 'Play Against Lili',        desc: 'Simulation battles'             },
      { title: 'Favourite Team Journey',   desc: 'Personal campaign tracking'      },
      { title: 'Lili Route Intelligence',  desc: 'AI route analysis engine'        },
      { title: '48-Team World Table',      desc: 'Global standings system'         },
      { title: 'Cumulative Journey Graph', desc: 'Tournament momentum analytics'   },
      { title: 'World Signals',            desc: 'Global tournament intelligence'  },
    ],
  },
  FR: {
    tagline: 'Un Monde  ·  48 Rêves',
    brandSub: 'Votre Compagnon de Coupe du Monde',
    kickoffIn: "COUP D'ENVOI DANS", live: 'Tournoi EN DIRECT',
    days: 'JOURS', hrs: 'HRS', min: 'MIN', sec: 'SEC',
    chooseLang: 'Choisissez votre langue',
    enterSystem: 'ENTRER DANS LE SYSTÈME',
    footerSub: "sous l'égide de Jura Technology",
    modules: [
      { title: "Parcours d'Équipe",       desc: "Suivi de l'expédition"         },
      { title: 'Intelligence des Stades', desc: 'Analyse des enceintes'          },
      { title: 'Confédérations',          desc: 'Structure de pouvoir mondial'   },
      { title: 'Jouer Contre Lili',       desc: 'Batailles de simulation'        },
      { title: 'Voyage de Mon Équipe',       desc: 'Suivi de campagne personnelle'  },
      { title: 'Intelligence de Route Lili', desc: "Moteur d'analyse de route"     },
      { title: 'Tableau Mondial 48',         desc: 'Classement mondial'             },
      { title: 'Graphe Cumulatif',        desc: 'Analyse du momentum'            },
      { title: 'Signaux Mondiaux',        desc: 'Intelligence mondiale'          },
    ],
  },
  IT: {
    tagline: 'Un Mondo  ·  48 Sogni',
    brandSub: 'Il Tuo Compagno di Coppa del Mondo',
    kickoffIn: "CALCIO D'INIZIO IN", live: 'Torneo IN DIRETTA',
    days: 'GIORNI', hrs: 'ORE', min: 'MIN', sec: 'SEC',
    chooseLang: 'Scegli la tua lingua',
    enterSystem: 'ENTRA NEL SISTEMA',
    footerSub: 'sotto il marchio Jura Technology',
    modules: [
      { title: 'Percorso Squadra',          desc: 'Tracker spedizione torneo'    },
      { title: 'Intelligence Stadio', desc: 'Analisi degli impianti'      },
      { title: 'Confederazioni',      desc: 'Struttura di potere globale' },
      { title: 'Gioca Contro Lili',         desc: 'Battaglie di simulazione'     },
      { title: 'Viaggio Squadra Preferita',  desc: 'Tracking campagna personale' },
      { title: 'Intelligenza Percorso Lili', desc: 'Analisi percorsi AI'         },
      { title: 'Tabella Mondiale 48',        desc: 'Sistema classifiche'         },
      { title: 'Grafico Cumulativo',        desc: 'Analisi del momentum'         },
      { title: 'Segnali Mondiali',          desc: 'Intelligence mondiale'        },
    ],
  },
  DE: {
    tagline: 'Eine Welt  ·  48 Träume',
    brandSub: 'Dein WM-Begleiter',
    kickoffIn: 'ANPFIFF IN', live: 'Turnier LIVE',
    days: 'TAGE', hrs: 'STD', min: 'MIN', sec: 'SEK',
    chooseLang: 'Sprache wählen',
    enterSystem: 'SYSTEM BETRETEN',
    footerSub: 'unter dem Dach von Jura Technology',
    modules: [
      { title: 'Team-Route',          desc: 'Expeditions-Tracker'            },
      { title: 'Stadion-Intelligenz', desc: 'Venue-Intelligence'     },
      { title: 'Konföderationen',     desc: 'Globale Machtstruktur'  },
      { title: 'Gegen Lili spielen',  desc: 'Simulations-Kämpfe'              },
      { title: 'Lieblingsreise',          desc: 'Persönliche Kampagne' },
      { title: 'Lili Routen-Intelligenz', desc: 'KI-Routenanalyse'    },
      { title: '48-Team-Tabelle',         desc: 'Globale Rangliste'    },
      { title: 'Kumulativer Graph',   desc: 'Dynamik-Analyse'                 },
      { title: 'Weltsignale',         desc: 'Globale Tournament-Intelligence' },
    ],
  },
  ES: {
    tagline: 'Un Mundo  ·  48 Sueños',
    brandSub: 'Tu Compañero de Copa del Mundo',
    kickoffIn: 'INICIO EN', live: 'Torneo EN VIVO',
    days: 'DÍAS', hrs: 'HRS', min: 'MIN', sec: 'SEG',
    chooseLang: 'Elige tu idioma',
    enterSystem: 'ENTRAR AL SISTEMA',
    footerSub: 'bajo el paraguas de Jura Technology',
    modules: [
      { title: 'Ruta del Equipo',           desc: 'Rastreador de expedición'    },
      { title: 'Inteligencia del Estadio', desc: 'Análisis del estadio'       },
      { title: 'Confederaciones',          desc: 'Estructura de poder global' },
      { title: 'Jugar Contra Lili',         desc: 'Batallas de simulación'      },
      { title: 'Viaje del Equipo',          desc: 'Seguimiento personal'   },
      { title: 'Inteligencia de Ruta Lili', desc: 'Análisis de ruta IA'   },
      { title: 'Tabla Mundial 48',          desc: 'Clasificación global'   },
      { title: 'Gráfico Acumulativo',       desc: 'Análisis de impulso'         },
      { title: 'Señales Mundiales',         desc: 'Inteligencia global'         },
    ],
  },
  RU: {
    tagline: 'Один Мир  ·  48 Мечт',
    brandSub: 'Ваш Гид по Чемпионату Мира',
    kickoffIn: 'НАЧАЛО ЧЕРЕЗ', live: 'Турнир LIVE',
    days: 'ДНЕЙ', hrs: 'ЧАС', min: 'МИН', sec: 'СЕК',
    chooseLang: 'Выберите язык',
    enterSystem: 'ВОЙТИ В СИСТЕМУ',
    footerSub: 'бренд Jura Technology',
    modules: [
      { title: 'Маршрут Команды',     desc: 'Трекер экспедиции'  },
      { title: 'Интеллект Стадиона', desc: 'Анализ площадок'     },
      { title: 'Конфедерации',       desc: 'Глобальная структура' },
      { title: 'Против Лили',         desc: 'Симуляционные бои'  },
      { title: 'Путь Команды',              desc: 'Личное отслеживание'  },
      { title: 'Маршрутный Интеллект Лили', desc: 'Анализ маршрутов ИИ'  },
      { title: 'Таблица 48 Команд',         desc: 'Глобальный рейтинг'   },
      { title: 'Кумулятивный График', desc: 'Анализ динамики'    },
      { title: 'Мировые Сигналы',     desc: 'Глобальная разведка'},
    ],
  },
  CN: {
    tagline: '一个世界  ·  48个梦想',
    brandSub: '您的世界杯伴侣',
    kickoffIn: '开球倒计时', live: '赛事直播中',
    days: '天', hrs: '时', min: '分', sec: '秒',
    chooseLang: '选择语言',
    enterSystem: '进入系统',
    footerSub: '归属 Jura Technology',
    modules: [
      { title: '队伍路线',     desc: '赛事追踪'  },
      { title: '球场智能', desc: '场馆分析' },
      { title: '联合会',   desc: '全球架构' },
      { title: '对战莉莉',     desc: '模拟对战'  },
      { title: '最爱队伍之旅', desc: '个人追踪'   },
      { title: '莉莉路线情报', desc: 'AI路线分析' },
      { title: '48队世界榜',   desc: '全球积分'   },
      { title: '累计旅程图',   desc: '动势分析'  },
      { title: '世界信号',     desc: '全球情报'  },
    ],
  },
};

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
  const tx = T[lang];

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
        Estadio Azteca · Mexico City · June 11, 2026
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

      <Animated.Text style={[ls.signalLabel, { color: g.label, opacity: labelPulse }]}>{T[lang].chooseLang}</Animated.Text>

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

// ─── Feature entry cards ──────────────────────────────────────────────────────

interface FeatureCardData {
  icon: string;
  isLobster?: boolean;
  title: string;
  description: string;
  path: string | null;
  accentColor: string;
}

const FEATURES: FeatureCardData[] = [
  {
    icon: '📍',
    title: 'Team Route',
    description: 'Tournament expedition tracker',
    path: '/team-route',
    accentColor: D.orange,
  },
  {
    icon: '🏟️',
    title: 'Stadium Intelligence',
    description: 'Venue ecosystem intelligence',
    path: '/stadium-intelligence',
    accentColor: D.blue,
  },
  {
    icon: '🌐',
    title: 'Confederations',
    description: 'Global power structure',
    path: '/confederations',
    accentColor: '#34D399',
  },
  {
    isLobster: true,
    icon: '',
    title: 'Play Against Lili',
    description: 'Simulation battles',
    path: '/lili-simulation',
    accentColor: D.blue,
  },
  {
    icon: '⭐',
    title: 'Favourite Team Journey',
    description: 'Personal campaign tracking',
    path: '/journey',
    accentColor: D.gold,
  },
  {
    icon: '🧠',
    title: 'Lili Route Intelligence',
    description: 'AI route analysis engine',
    path: '/lili-route-intelligence',
    accentColor: D.signalGreen,
  },
  {
    icon: '🏆',
    title: '48-Team World Table',
    description: 'Global standings system',
    path: '/worldcup-table',
    accentColor: D.gold,
  },
  {
    icon: '📈',
    title: 'Cumulative Journey Graph',
    description: 'Tournament momentum analytics',
    path: '/cumulative-graph',
    accentColor: D.blue,
  },
  {
    icon: '🌍',
    title: 'World Signals',
    description: 'Global tournament intelligence',
    path: '/world-signals',
    accentColor: D.signalGreen,
  },
];

function FeatureCard({
  data, wide, compact, cardWidth, flashOpacity,
}: {
  data: FeatureCardData;
  wide: boolean;
  compact?: boolean;
  flashOpacity?: Animated.Value;
}) {
  const live = data.path !== null;

  if (compact) {
    return (
      <Animated.View
        style={[
          ls.featureCardCompact,
          { borderColor: `${data.accentColor}22`, shadowColor: data.accentColor },
          !live && ls.featureCardSoon,
          flashOpacity !== undefined ? { opacity: flashOpacity } : null,
        ]}
      >
        <TouchableOpacity
          onPress={() => { if (data.path) router.push(data.path as any); }}
          activeOpacity={live ? 0.75 : 1}
          style={ls.featureCardCompactInner}
        >
          <View style={[ls.featureIconWrapCompact, { backgroundColor: `${data.accentColor}12` }]}>
            {data.isLobster ? (
              <View style={ls.featureLobsterClipCompact}>
                <Image
                  source={require('../assets/blue_lobster.png')}
                  style={ls.featureLobsterImgCompact}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <Text style={ls.featureIconCompact}>{data.icon}</Text>
            )}
          </View>
          <Text style={[ls.featureTitleCompact, !live && ls.featureTitleDim]} numberOfLines={2}>
            {data.title}
          </Text>
          <Text style={ls.featureDescCompact} numberOfLines={1}>{data.description}</Text>
          {!live && (
            <View style={ls.soonBadge}>
              <Text style={ls.soonText}>SOON</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        ls.featureCard,
        wide && ls.featureCardWide,
        { borderColor: `${data.accentColor}22`, shadowColor: data.accentColor },
        !live && ls.featureCardSoon,
        flashOpacity !== undefined ? { opacity: flashOpacity } : null,
      ]}
    >
      <TouchableOpacity
        onPress={() => { if (data.path) router.push(data.path as any); }}
        activeOpacity={live ? 0.75 : 1}
        style={ls.featureCardInner}
      >
        <View style={[ls.featureIconWrap, { backgroundColor: `${data.accentColor}12` }]}>
          {data.isLobster ? (
            <View style={ls.featureLobsterClip}>
              <Image
                source={require('../assets/blue_lobster.png')}
                style={ls.featureLobsterImg}
                resizeMode="cover"
              />
            </View>
          ) : (
            <Text style={ls.featureIcon}>{data.icon}</Text>
          )}
        </View>
        <Text style={[ls.featureTitle, !live && ls.featureTitleDim]}>{data.title}</Text>
        <Text style={ls.featureDesc}>{data.description}</Text>
        {!live && (
          <View style={ls.soonBadge}>
            <Text style={ls.soonText}>SOON</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Landing screen ───────────────────────────────────────────────────────────

export default function LandingScreen() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 640;
  const screenDiag = Math.sqrt(width * width + height * height);

  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');

  // Signal node language (updates immediately — it's the wave origin)
  const [lang, setLang] = useState<LangCode>('EN');

  // Per-section display languages — updated staggered by the wave
  const [topLang,       setTopLang]       = useState<LangCode>('EN');
  const [countdownLang, setCountdownLang] = useState<LangCode>('EN');
  const [cardLangs,     setCardLangs]     = useState<LangCode[]>(Array(9).fill('EN') as LangCode[]);
  const [footerLang,    setFooterLang]    = useState<LangCode>('EN');

  // Flash animations (opacity: 1 → 0.1 → 1 at update moment)
  const topFlash    = useRef(new Animated.Value(1)).current;
  const countFlash  = useRef(new Animated.Value(1)).current;
  const footerFlash = useRef(new Animated.Value(1)).current;
  const cardFlashes = useRef(Array.from({ length: 9 }, () => new Animated.Value(1))).current;

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
    for (let i = 0; i < 9; i++) {
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
                <Text style={ls.brandSub}>{T[topLang].brandSub}</Text>
                <View style={ls.heroSep} />
                <Text style={ls.tagline}>{T[topLang].tagline}</Text>
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

            {/* ── 8 module cards ── */}
            <View style={ls.featuresSection}>
              <Text style={ls.featuresSectionLabel}>{T[cardLangs[0]].enterSystem}</Text>
              <View style={[ls.featuresGrid, isWide && ls.featuresGridWide]}>
                {FEATURES.map((f, i) => (
                  <FeatureCard
                    key={f.title}
                    data={{ ...f, title: T[cardLangs[i]].modules[i].title, description: T[cardLangs[i]].modules[i].desc }}
                    wide={isWide}
                    compact={!isWide}
                    flashOpacity={cardFlashes[i]}
                  />
                ))}
              </View>
            </View>

            {/* ── Footer ── */}
            <Animated.View style={[ls.footer, { opacity: footerFlash }]}>
              <Text style={ls.footerPrimary}>Worldcupilou by Lobster Inc.</Text>
              <Text style={ls.footerSecondary}>{T[footerLang].footerSub}</Text>
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
    fontSize: 22,
    fontWeight: '800',
    color: D.text1,
    letterSpacing: 4,
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
