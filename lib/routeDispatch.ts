// World Cup Dispatch — Lili's off-pitch intelligence ledger
// ─────────────────────────────────────────────────────────────────────────────
// The circumstances around the tournament that the DATA never captures: entry
// denials, refereeing storms, disciplinary politics, off-pitch controversy.
//
// HONESTY CONTRACT (this file is curated journalism, not a model):
//   • Every event is CURATED and cross-verified against ≥2 reputable outlets.
//     Serious claims about named people carry their real sources — never invent.
//   • `status` classifies the truth-level of each item and MUST be respected:
//       CONFIRMED — a verifiable fact (an entry denial, a red card, a ruling).
//       DISPUTED  — a claim/allegation not fully established (present both sides).
//       OPINION   — a critique/reaction (attribute to the voices who said it;
//                   Lili does NOT assert it as fact).
//   • Ordering is by COVERAGE, not chronology: coverageScore() is derived from
//     REAL signals (distinct outlets tracked + factual escalation tiers) — it is
//     NOT a fabricated "view count". Displayed honestly as "N outlets".
//   • Bodies are curated EN + FR. Chips (type/status/escalation) are localized
//     ×11 in DISPATCH_I18N.
//
// The `sync-dispatch` bot refreshes coverage counts + detects candidates via
// GDELT; it does NOT auto-publish new accusations — those stay human-approved.

import type { LangCode } from './i18n';

export type DispatchType =
  | 'ENTRY'      // visas / border / entry denials
  | 'REFEREE'    // refereeing decisions & storms
  | 'DISCIPLINE' // cards, bans, appeals
  | 'POLITICS'   // geopolitics around the tournament
  | 'LOGISTICS'  // basing, travel, staffing
  | 'DOPING';    // anti-doping

export type DispatchStatus = 'CONFIRMED' | 'DISPUTED' | 'OPINION';
export type Escalation = 'FIFA' | 'GOVERNMENT' | 'LEGAL';

export interface DispatchSource { outlet: string; url: string; }

export interface DispatchEvent {
  id: string;
  date: string;              // ISO yyyy-mm-dd (event date, for reference only)
  type: DispatchType;
  status: DispatchStatus;
  escalation: Escalation[];  // factual: did FIFA / a government / a court act on it
  flags: string;             // emoji of the parties involved
  titleEN: string; titleFR: string;
  bodyEN: string;  bodyFR: string;
  sources: DispatchSource[]; // ≥2 for any claim about a named person
}

// ─── The ledger ───────────────────────────────────────────────────────────────
// Curated + verified 2026-07-07. coverage = sources.length (a real floor the bot
// grows). Ordering is computed, so declaration order here does not matter.

export const DISPATCH_EVENTS: DispatchEvent[] = [
  {
    id: 'balogun-redcard-lifted',
    date: '2026-07-02',
    type: 'DISCIPLINE',
    status: 'CONFIRMED',
    escalation: ['FIFA', 'GOVERNMENT'],
    flags: '🇺🇸',
    titleEN: "USA's Balogun red card overturned after a Trump call to FIFA",
    titleFR: "Le carton rouge de Balogun (USA) annulé après un appel de Trump à la FIFA",
    bodyEN:
      "Folarin Balogun was sent off for the USA and hit with the automatic one-match ban. FIFA's disciplinary committee then suspended the ban (Art. 27 FDC, one-year probation) — after President Trump phoned FIFA president Gianni Infantino — making him eligible for the last-16 tie. Norway's coach called it a \"big mistake\"; it is only about the second known time FIFA has lifted a World Cup red-card suspension.",
    bodyFR:
      "Folarin Balogun a été expulsé avec les USA et frappé de la suspension automatique d'un match. La commission de discipline de la FIFA a ensuite suspendu la sanction (art. 27 CDF, un an de probation) — après un appel du président Trump au président de la FIFA Gianni Infantino — le rendant qualifié pour les 8es. Le sélectionneur norvégien a parlé d'une « grosse erreur » ; ce n'est qu'environ la 2e fois que la FIFA lève une suspension de carton rouge en Coupe du monde.",
    sources: [
      { outlet: 'Sky Sports', url: 'https://www.skysports.com/football/news/12098/13560770/world-cup-2026-fifa-step-in-to-allow-banned-folarin-balogun-to-play-usa-last-16-tie-a-move-praised-by-president-donald-trump' },
      { outlet: 'CBS News', url: 'https://www.cbsnews.com/news/folarin-balogun-red-card-world-cup-us-mens-team-belgium/' },
      { outlet: 'CBS Sports', url: 'https://www.cbssports.com/soccer/news/folarin-balogun-usmnt-world-cup-belgium-fifa-lifts-suspension/' },
      { outlet: 'Yahoo Sports', url: 'https://sports.yahoo.com/articles/norway-boss-tears-fifa-over-001009114.html' },
    ],
  },
  {
    id: 'italy-replace-iran',
    date: '2026-04-23',
    type: 'POLITICS',
    status: 'CONFIRMED',
    escalation: ['GOVERNMENT', 'FIFA'],
    flags: '🇮🇹🇮🇷',
    titleEN: 'US envoy floated Italy replacing Iran — rejected as "shameful"',
    titleFR: "Un émissaire US propose de remplacer l'Iran par l'Italie — jugé « honteux »",
    bodyEN:
      "US special envoy Paolo Zampolli confirmed he floated the idea of Italy stepping in for Iran to Trump and to FIFA's Infantino, as a contingency. Italian ministers rejected it flatly — Sports Minister Abodi called it \"not appropriate\", Finance Minister Giorgetti \"shameful\" — and FIFA said Iran was coming. It was a floated-and-rejected proposal, never an actual plan.",
    bodyFR:
      "L'émissaire spécial américain Paolo Zampolli a confirmé avoir proposé à Trump et à Infantino (FIFA) que l'Italie remplace l'Iran, comme plan de secours. Les ministres italiens l'ont catégoriquement rejeté — le ministre des Sports Abodi l'a jugé « pas approprié », celui des Finances Giorgetti « honteux » — et la FIFA a affirmé que l'Iran viendrait. Une idée lancée puis rejetée, jamais un vrai projet.",
    sources: [
      { outlet: 'ESPN', url: 'https://www.espn.com/soccer/story/_/id/48571163/italy-replacing-iran-world-cup-not-appropriate-sports-minister' },
      { outlet: 'Al Jazeera', url: 'https://www.aljazeera.com/sports/2026/4/23/italy-officials-say-replacing-iran-at-world-cup-2026-would-be-shameful' },
      { outlet: 'Euronews', url: 'https://www.euronews.com/2026/04/23/trump-envoy-calls-on-fifa-to-replace-iran-with-italy-at-world-cup' },
      { outlet: 'TIME', url: 'https://time.com/article/2026/04/23/iran-italy-world-cup-us-war-soccer-diplomacy/' },
    ],
  },
  {
    id: 'iran-based-in-mexico',
    date: '2026-06-19',
    type: 'LOGISTICS',
    status: 'CONFIRMED',
    escalation: ['FIFA', 'GOVERNMENT'],
    flags: '🇮🇷🇲🇽',
    titleEN: 'Iran forced to sleep in Mexico, enter the US only on match days',
    titleFR: "L'Iran contraint de loger au Mexique, n'entrant aux USA que les jours de match",
    bodyEN:
      "US authorities did not want Iran staying in the country despite three Group G matches there, so the squad based in Tijuana and could enter the US only within 24 hours of a match. Its training base moved from Tucson to Mexico and staff visas were denied. Iran lodged a formal complaint with FIFA; coach Ghalenoei said the disruption hurt his team's 2-2 draw with New Zealand.",
    bodyFR:
      "Les autorités américaines refusaient que l'Iran séjourne dans le pays malgré trois matchs du groupe G, l'équipe a donc logé à Tijuana et ne pouvait entrer aux USA que dans les 24 h avant un match. Son camp de base a été déplacé de Tucson au Mexique et des visas du staff refusés. L'Iran a déposé une plainte formelle à la FIFA ; le sélectionneur Ghalenoei a estimé que ces perturbations ont pesé sur le nul 2-2 face à la Nouvelle-Zélande.",
    sources: [
      { outlet: 'CNN', url: 'https://www.cnn.com/2026/05/25/sport/iran-mexico-fifa-world-cup-2026-intl-hnk' },
      { outlet: 'Al Jazeera', url: 'https://www.aljazeera.com/sports/2026/6/19/iran-to-lodge-complaint-with-fifa-over-world-cup-2026-travel-restrictions' },
      { outlet: 'NBC News', url: 'https://www.nbcnews.com/world/iran/iran-lodge-fifa-complaint-world-cup-travel-restrictions-rcna350844' },
      { outlet: 'CNBC', url: 'https://www.cnbc.com/amp/2026/06/20/iran-to-lodge-fifa-complaint-over-world-cup-travel-restrictions.html' },
    ],
  },
  {
    id: 'artan-entry-denied',
    date: '2026-06-06',
    type: 'ENTRY',
    status: 'CONFIRMED',
    escalation: ['GOVERNMENT'],
    flags: '🇸🇴',
    titleEN: 'Somali referee denied US entry despite a valid visa',
    titleFR: "Un arbitre somalien refoulé des USA malgré un visa valide",
    bodyEN:
      "Omar Abdulkadir Artan, set to be the first Somali to officiate a World Cup, was denied entry at Miami despite a valid visa and diplomatic passport. US Customs cited \"vetting concerns\" and alleged links to suspected terror organisations; Artan strongly denies any links. FIFA confirmed the case; he received his full World Cup salary despite being unable to officiate.",
    bodyFR:
      "Omar Abdulkadir Artan, qui devait être le premier Somalien à arbitrer une Coupe du monde, s'est vu refuser l'entrée à Miami malgré un visa valide et un passeport diplomatique. Les douanes américaines ont invoqué des « préoccupations de sécurité » et de supposés liens avec des organisations terroristes ; Artan dément fermement tout lien. La FIFA a confirmé l'affaire ; il a perçu son plein salaire de Coupe du monde sans pouvoir officier.",
    sources: [
      { outlet: 'ABC News', url: 'https://abcnews.com/International/world-cup-referee-somalia-denied-entry-us-due/story?id=133692969' },
      { outlet: 'Al Jazeera', url: 'https://www.aljazeera.com/news/2026/6/8/us-confirms-denying-entry-to-somali-referee-set-to-take-part-in-world-cup' },
      { outlet: 'TIME', url: 'https://time.com/article/2026/06/09/fifa-world-cup-somalia-referee-entry-block-customs-border-protection/' },
      { outlet: 'ESPN', url: 'https://www.espn.com/soccer/story/_/id/49002985/somali-referee-world-cup-denied-entry-united-states' },
    ],
  },
  {
    id: 'partey-canada-denied',
    date: '2026-06-12',
    type: 'ENTRY',
    status: 'CONFIRMED',
    escalation: ['LEGAL'],
    flags: '🇬🇭🇨🇦',
    titleEN: "Ghana's Partey denied entry to Canada, missed the opener",
    titleFR: "Le Ghanéen Partey refusé au Canada, forfait pour le match d'ouverture",
    bodyEN:
      "Thomas Partey was refused entry to Canada and missed Ghana's opener against Panama in Toronto. Canada deemed him inadmissible; he has been charged in London with seven counts of rape and one of sexual assault, has pleaded not guilty, and awaits trial (now 2027). A Federal Court in Ottawa dismissed his emergency appeal.",
    bodyFR:
      "Thomas Partey s'est vu refuser l'entrée au Canada et a manqué le match d'ouverture du Ghana face au Panama à Toronto. Le Canada l'a jugé interdit de territoire ; il est inculpé à Londres de sept viols et d'une agression sexuelle, plaide non coupable et attend son procès (désormais en 2027). La Cour fédérale d'Ottawa a rejeté son appel en urgence.",
    sources: [
      { outlet: 'ESPN', url: 'https://www.espn.com/soccer/story/_/id/49041808/thomas-partey-ghana-opener-2026-world-cup-denied-entry-canada' },
      { outlet: 'Al Jazeera', url: 'https://www.aljazeera.com/sports/2026/6/16/ghanas-partey-loses-appeal-to-overturn-canadian-visa-refusal-for-world-cup' },
      { outlet: 'Sky Sports', url: 'https://www.skysports.com/football/news/17243/13553454/world-cup-2026-thomas-partey-refused-entry-to-canada-ahead-of-ghana-match-with-panama' },
      { outlet: 'CBC News', url: 'https://www.cbc.ca/news/canada/ghana-partey-canada-fifa-ruling-9.7237678' },
    ],
  },
  {
    id: 'iran-flag-ban',
    date: '2026-06-15',
    type: 'POLITICS',
    status: 'CONFIRMED',
    escalation: ['FIFA', 'LEGAL'],
    flags: '🇮🇷',
    titleEN: 'FIFA banned Iran\'s pre-1979 flag — a court upheld it, fans defied it',
    titleFR: "La FIFA bannit le drapeau iranien d'avant 1979 — validé en justice, bravé par les fans",
    bodyEN:
      "FIFA barred the pre-revolutionary Lion-and-Sun flag from stadiums; a Los Angeles judge upheld the ban hours before Iran's opener. Fans defied it anyway — Lion-and-Sun flags filled SoFi Stadium and a wave of boos met the Islamic Republic's anthem. The ban drew backlash from the Iranian diaspora and opposition.",
    bodyFR:
      "La FIFA a interdit dans les stades le drapeau pré-révolutionnaire au Lion et Soleil ; un juge de Los Angeles a validé l'interdiction quelques heures avant le premier match iranien. Les supporters l'ont bravée — les drapeaux au Lion et Soleil ont envahi le SoFi Stadium et une vague de huées a accueilli l'hymne de la République islamique. L'interdiction a suscité la colère de la diaspora et de l'opposition iraniennes.",
    sources: [
      { outlet: 'RFE/RL', url: 'https://www.rferl.org/a/iran-fifa-lion-sun-flag-ban-world-cup/33761122.html' },
      { outlet: 'Fox News', url: 'https://www.foxnews.com/sports/judge-upholds-fifas-ban-irans-old-flag-world-cup-games-emergency-hearing-los-angeles' },
      { outlet: 'Yahoo Sports', url: 'https://sports.yahoo.com/soccer/article/at-irans-world-cup-opener-a-banned-flag-became-a-flashpoint-at-the-stadium-gates-033114890.html' },
      { outlet: 'Iran International', url: 'https://www.iranintl.com/en/202606250848' },
    ],
  },
  {
    id: 'tunisia-clenbuterol',
    date: '2026-07-03',
    type: 'DOPING',
    status: 'DISPUTED',
    escalation: ['FIFA'],
    flags: '🇹🇳',
    titleEN: 'Eight Tunisia players tested positive for clenbuterol',
    titleFR: 'Huit joueurs tunisiens contrôlés positifs au clenbutérol',
    bodyEN:
      "Eight Tunisia squad members returned traces of clenbuterol in routine tests. Officials classed them as \"atypical findings\" — the concentrations were extremely low and consistent with contaminated meat eaten in Mexico (echoing the 2011 U-17 World Cup, where 109 of 208 tested positive). No players are expected to be sanctioned pending the food investigation.",
    bodyFR:
      "Huit membres de la sélection tunisienne ont présenté des traces de clenbutérol lors de contrôles de routine. Les officiels les ont classées comme « résultats atypiques » — concentrations très faibles, compatibles avec de la viande contaminée consommée au Mexique (comme au Mondial U-17 2011, où 109 des 208 testés étaient positifs). Aucune sanction n'est attendue dans l'attente de l'enquête alimentaire.",
    sources: [
      { outlet: 'Business Standard', url: 'https://www.business-standard.com/amp/sports/fifa-world-cup/world-cup-rocked-by-tunisia-doping-controversy-as-8-players-test-positive-126070400016_1.html' },
      { outlet: 'Africa Soccer', url: 'https://africasoccer.com/world-cup-eight-tunisian-players-positive-doping/' },
      { outlet: 'Elbotola', url: 'https://m.elbotola.com/en/article/2026-07-03-15-17-416.html' },
    ],
  },
  {
    id: 'iraq-stranded-travel',
    date: '2026-03-16',
    type: 'LOGISTICS',
    status: 'CONFIRMED',
    escalation: ['FIFA', 'GOVERNMENT'],
    flags: '🇮🇶',
    titleEN: 'Iraq stranded by airspace closure — FIFA chartered a jet to the playoff',
    titleFR: "L'Irak bloqué par la fermeture de l'espace aérien — la FIFA affrète un jet pour le barrage",
    bodyEN:
      "Regional conflict closed Iraqi airspace and left 60%+ of the domestic squad stranded in Baghdad; coach Graham Arnold ran the team remotely from the UAE. FIFA denied a postponement and first proposed an overland route through Turkey — rejected on safety grounds — before chartering a private jet. The team bussed via Jordan (stuck ~24h under missile threat) and reached Monterrey; Iraq won the bracket to qualify.",
    bodyFR:
      "Le conflit régional a fermé l'espace aérien irakien, laissant plus de 60 % de l'effectif local bloqué à Bagdad ; le sélectionneur Graham Arnold a dirigé l'équipe à distance depuis les Émirats. La FIFA a refusé un report et proposé d'abord une route terrestre par la Turquie — rejetée pour raisons de sécurité — avant d'affréter un jet privé. L'équipe a rejoint la Jordanie en bus (bloquée ~24 h sous menace de missiles) puis Monterrey ; l'Irak a remporté son barrage et s'est qualifié.",
    sources: [
      { outlet: 'The National', url: 'https://www.thenationalnews.com/sport/football/2026/03/30/iraq-one-step-from-first-world-cup-in-40-years-after-overcoming-travel-problems/' },
      { outlet: 'Al Jazeera', url: 'https://www.aljazeera.com/sports/2026/4/6/world-cup-qualification-earns-iraq-coach-arnold-a-heros-welcome-in-sydney' },
      { outlet: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/List_of_2026_FIFA_World_Cup_controversies' },
    ],
  },
  {
    id: 'messi-mandi-no-card',
    date: '2026-06-16',
    type: 'REFEREE',
    status: 'OPINION',
    escalation: [],
    flags: '🇦🇷🇩🇿',
    titleEN: 'Pundits: Messi\'s studs-up challenge on Mandi should have been red',
    titleFR: "Les experts : le tacle semelle de Messi sur Mandi méritait le rouge",
    bodyEN:
      "Against Algeria, Messi raked his studs down Aïssa Mandi's calf; a foul was given but no card. Analysts said he got preferential treatment — ESPN's Ale Moreno called it \"100% a red\" and ex-referee Patrick Ittrich said \"by the letter of the law, that is a red.\" This is a refereeing critique attributed to those voices, not an established fact — the contrast with Balogun's straight red fuelled the debate.",
    bodyFR:
      "Face à l'Algérie, Messi a raclé sa semelle sur le mollet d'Aïssa Mandi ; faute sifflée mais pas de carton. Des analystes ont dénoncé un traitement de faveur — Ale Moreno (ESPN) a parlé d'« un rouge à 100 % » et l'ex-arbitre Patrick Ittrich de « selon la lettre de la loi, c'est un rouge ». C'est une critique arbitrale attribuée à ces voix, pas un fait établi — le contraste avec le rouge direct de Balogun a nourri le débat.",
    sources: [
      { outlet: 'ESPN', url: 'https://www.espn.com/soccer/story/_/id/49252206/messi-balogun-why-two-tackles-sparked-world-cup-outrage' },
      { outlet: 'NewsNation', url: 'https://www.newsnationnow.com/us-news/sports/world-cup/messi-world-cup-preferential-treatment/' },
      { outlet: 'Local 10', url: 'https://www.local10.com/sports/local/2026/06/17/fifa-world-cup-referees-treatment-of-messi-raises-red-card-question/' },
    ],
  },
  {
    id: 'france-paraguay-ref',
    date: '2026-07-04',
    type: 'REFEREE',
    status: 'OPINION',
    escalation: [],
    flags: '🇫🇷🇵🇾',
    titleEN: "France's referee slammed for a chaotic France 1-0 Paraguay",
    titleFR: "L'arbitre de France - Paraguay (1-0) critiqué pour un match chaotique",
    bodyEN:
      "France reached the quarter-finals past Paraguay, but Uzbek referee Ilgiz Tantashev drew heavy criticism for letting too many fierce challenges go and losing control of the game's intensity — Paraguay finished with 0 bookings to France's 3. This is media/pundit criticism of the performance, not a formal ruling.",
    bodyFR:
      "La France a atteint les quarts face au Paraguay, mais l'arbitre ouzbek Ilgiz Tantashev a été très critiqué pour avoir laissé passer trop de tacles rugueux et perdu le contrôle de l'intensité — le Paraguay a fini avec 0 carton contre 3 à la France. Il s'agit de critiques médiatiques de sa prestation, pas d'une décision officielle.",
    sources: [
      { outlet: 'Foot Africa', url: 'https://foot-africa.com/en/news/world-cup-referee-of-franceparaguay-match-faces-heavy-criticism-1268995/' },
      { outlet: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/List_of_2026_FIFA_World_Cup_controversies' },
    ],
  },
  {
    id: 'chilavert-africa-remark',
    date: '2026-07-03',
    type: 'POLITICS',
    status: 'CONFIRMED',
    escalation: [],
    flags: '🇵🇾🇫🇷',
    titleEN: 'Chilavert\'s "a squad from Africa" jab at France condemned as racist',
    titleFR: "La pique « une équipe d'Afrique » de Chilavert envers la France jugée raciste",
    bodyEN:
      "Ahead of Paraguay v France, former Paraguay goalkeeper José Luis Chilavert referred to France as \"a squad from Africa.\" French Football Federation president Philippe Diallo strongly condemned the remark as racist.",
    bodyFR:
      "Avant Paraguay - France, l'ancien gardien paraguayen José Luis Chilavert a qualifié la France d'« équipe d'Afrique ». Le président de la Fédération française de football Philippe Diallo a fermement condamné ces propos comme racistes.",
    sources: [
      { outlet: 'Foot Africa', url: 'https://foot-africa.com/en/news/world-cup-referee-of-franceparaguay-match-faces-heavy-criticism-1268995/' },
      { outlet: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/List_of_2026_FIFA_World_Cup_controversies' },
    ],
  },
  {
    id: 'egypt-iran-pride-match',
    date: '2026-06-26',
    type: 'POLITICS',
    status: 'CONFIRMED',
    escalation: ['FIFA'],
    flags: '🇪🇬🇮🇷🏳️‍🌈',
    titleEN: 'Seattle\'s "Pride Match" branding for Egypt v Iran sparked a row',
    titleFR: "Le label « Pride Match » de Seattle pour Égypte - Iran provoque la polémique",
    bodyEN:
      "Seattle's organising committee promoted the June 26 Egypt v Iran game as a \"Pride Match\" — then the draw paired two countries where homosexuality is criminalised. Both federations objected; Iran formally asked FIFA to bar pride flags and ceremonies. FIFA rejected the ban; LGBTQ supporters and Iranian opposition demonstrators both gathered.",
    bodyFR:
      "Le comité d'organisation de Seattle a promu le match Égypte - Iran du 26 juin comme un « Pride Match » — puis le tirage a réuni deux pays où l'homosexualité est criminalisée. Les deux fédérations ont protesté ; l'Iran a officiellement demandé à la FIFA d'interdire drapeaux et cérémonies pride. La FIFA a refusé l'interdiction ; supporters LGBTQ et opposants iraniens se sont rassemblés.",
    sources: [
      { outlet: 'Iran International', url: 'https://www.iranintl.com/en/202606250848' },
      { outlet: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/List_of_2026_FIFA_World_Cup_controversies' },
    ],
  },
];

// ─── Chip localisation (×11) ────────────────────────────────────────────────
// Bodies stay EN/FR; only the short chips are localised. Latin languages proper;
// non-Latin (RU/CN/JP/KR/AR) good-faith standard terms — native review owed.

export interface DispatchI18n {
  sectionTitle: string;
  sectionSub: string;
  coverage: string;     // {n} — e.g. "{n} outlets"
  tracking: string;     // {n} — e.g. "Lili is tracking {n} stories"
  sources: string;
  readMore: string;
  types: Record<DispatchType, string>;
  statuses: Record<DispatchStatus, string>;
  escalations: Record<Escalation, string>;
}

export const DISPATCH_I18N: Record<LangCode, DispatchI18n> = {
  EN: {
    sectionTitle: 'BEYOND THE DATA · WORLD CUP DISPATCH',
    sectionSub: 'The circumstances the numbers never capture — verified, sourced, ranked by coverage.',
    coverage: '{n} outlets', tracking: 'Lili is tracking {n} off-pitch stories', sources: 'Sources', readMore: 'Read the sources',
    types: { ENTRY: 'ENTRY & VISAS', REFEREE: 'REFEREEING', DISCIPLINE: 'DISCIPLINE', POLITICS: 'POLITICS', LOGISTICS: 'LOGISTICS', DOPING: 'ANTI-DOPING' },
    statuses: { CONFIRMED: 'CONFIRMED', DISPUTED: 'DISPUTED', OPINION: 'OPINION' },
    escalations: { FIFA: 'FIFA ACTED', GOVERNMENT: 'GOVERNMENT', LEGAL: 'IN COURT' },
  },
  FR: {
    sectionTitle: 'AU-DELÀ DES DONNÉES · DISPATCH COUPE DU MONDE',
    sectionSub: 'Les circonstances que les chiffres ne captent pas — vérifiées, sourcées, classées par couverture.',
    coverage: '{n} médias', tracking: 'Lili suit {n} affaires en dehors du terrain', sources: 'Sources', readMore: 'Lire les sources',
    types: { ENTRY: 'VISAS & ENTRÉE', REFEREE: 'ARBITRAGE', DISCIPLINE: 'DISCIPLINE', POLITICS: 'POLITIQUE', LOGISTICS: 'LOGISTIQUE', DOPING: 'ANTIDOPAGE' },
    statuses: { CONFIRMED: 'CONFIRMÉ', DISPUTED: 'CONTESTÉ', OPINION: 'OPINION' },
    escalations: { FIFA: 'LA FIFA A AGI', GOVERNMENT: 'GOUVERNEMENT', LEGAL: 'EN JUSTICE' },
  },
  IT: {
    sectionTitle: 'OLTRE I DATI · DISPACCIO MONDIALE',
    sectionSub: 'Le circostanze che i numeri non colgono — verificate, con fonti, ordinate per copertura.',
    coverage: '{n} testate', tracking: 'Lili segue {n} storie fuori dal campo', sources: 'Fonti', readMore: 'Leggi le fonti',
    types: { ENTRY: 'VISTI & INGRESSO', REFEREE: 'ARBITRAGGIO', DISCIPLINE: 'DISCIPLINA', POLITICS: 'POLITICA', LOGISTICS: 'LOGISTICA', DOPING: 'ANTIDOPING' },
    statuses: { CONFIRMED: 'CONFERMATO', DISPUTED: 'CONTESTATO', OPINION: 'OPINIONE' },
    escalations: { FIFA: 'FIFA È INTERVENUTA', GOVERNMENT: 'GOVERNO', LEGAL: 'IN TRIBUNALE' },
  },
  DE: {
    sectionTitle: 'JENSEITS DER DATEN · WM-DEPESCHE',
    sectionSub: 'Die Umstände, die Zahlen nie erfassen — geprüft, belegt, nach Berichterstattung sortiert.',
    coverage: '{n} Medien', tracking: 'Lili verfolgt {n} Geschichten abseits des Platzes', sources: 'Quellen', readMore: 'Quellen lesen',
    types: { ENTRY: 'VISA & EINREISE', REFEREE: 'SCHIEDSRICHTER', DISCIPLINE: 'DISZIPLIN', POLITICS: 'POLITIK', LOGISTICS: 'LOGISTIK', DOPING: 'ANTI-DOPING' },
    statuses: { CONFIRMED: 'BESTÄTIGT', DISPUTED: 'UMSTRITTEN', OPINION: 'MEINUNG' },
    escalations: { FIFA: 'FIFA HANDELTE', GOVERNMENT: 'REGIERUNG', LEGAL: 'VOR GERICHT' },
  },
  ES: {
    sectionTitle: 'MÁS ALLÁ DE LOS DATOS · DESPACHO MUNDIAL',
    sectionSub: 'Las circunstancias que los números no captan — verificadas, con fuentes, ordenadas por cobertura.',
    coverage: '{n} medios', tracking: 'Lili sigue {n} historias fuera del campo', sources: 'Fuentes', readMore: 'Leer las fuentes',
    types: { ENTRY: 'VISADOS & ENTRADA', REFEREE: 'ARBITRAJE', DISCIPLINE: 'DISCIPLINA', POLITICS: 'POLÍTICA', LOGISTICS: 'LOGÍSTICA', DOPING: 'ANTIDOPAJE' },
    statuses: { CONFIRMED: 'CONFIRMADO', DISPUTED: 'EN DISPUTA', OPINION: 'OPINIÓN' },
    escalations: { FIFA: 'LA FIFA ACTUÓ', GOVERNMENT: 'GOBIERNO', LEGAL: 'EN LOS TRIBUNALES' },
  },
  PT: {
    sectionTitle: 'ALÉM DOS DADOS · DESPACHO DO MUNDIAL',
    sectionSub: 'As circunstâncias que os números não captam — verificadas, com fontes, ordenadas por cobertura.',
    coverage: '{n} veículos', tracking: 'Lili acompanha {n} histórias fora de campo', sources: 'Fontes', readMore: 'Ler as fontes',
    types: { ENTRY: 'VISTOS & ENTRADA', REFEREE: 'ARBITRAGEM', DISCIPLINE: 'DISCIPLINA', POLITICS: 'POLÍTICA', LOGISTICS: 'LOGÍSTICA', DOPING: 'ANTIDOPAGEM' },
    statuses: { CONFIRMED: 'CONFIRMADO', DISPUTED: 'CONTESTADO', OPINION: 'OPINIÃO' },
    escalations: { FIFA: 'A FIFA AGIU', GOVERNMENT: 'GOVERNO', LEGAL: 'NA JUSTIÇA' },
  },
  RU: {
    sectionTitle: 'ЗА ПРЕДЕЛАМИ ДАННЫХ · СВОДКА ЧМ',
    sectionSub: 'Обстоятельства, которые не отражают цифры — проверено, со ссылками, по охвату.',
    coverage: '{n} СМИ', tracking: 'Лили следит за {n} историями вне поля', sources: 'Источники', readMore: 'Читать источники',
    types: { ENTRY: 'ВИЗЫ И ВЪЕЗД', REFEREE: 'СУДЕЙСТВО', DISCIPLINE: 'ДИСЦИПЛИНА', POLITICS: 'ПОЛИТИКА', LOGISTICS: 'ЛОГИСТИКА', DOPING: 'АНТИДОПИНГ' },
    statuses: { CONFIRMED: 'ПОДТВЕРЖДЕНО', DISPUTED: 'ОСПАРИВАЕТСЯ', OPINION: 'МНЕНИЕ' },
    escalations: { FIFA: 'ФИФА ВМЕШАЛАСЬ', GOVERNMENT: 'ПРАВИТЕЛЬСТВО', LEGAL: 'В СУДЕ' },
  },
  CN: {
    sectionTitle: '数据之外 · 世界杯快讯',
    sectionSub: '数字无法捕捉的背景——经核实、附来源、按报道量排序。',
    coverage: '{n} 家媒体', tracking: '莉莉正在追踪 {n} 则场外事件', sources: '来源', readMore: '查看来源',
    types: { ENTRY: '签证与入境', REFEREE: '裁判', DISCIPLINE: '纪律', POLITICS: '政治', LOGISTICS: '后勤', DOPING: '反兴奋剂' },
    statuses: { CONFIRMED: '已证实', DISPUTED: '有争议', OPINION: '评论' },
    escalations: { FIFA: '国际足联介入', GOVERNMENT: '政府', LEGAL: '进入司法' },
  },
  JP: {
    sectionTitle: 'データの先へ · ワールドカップ・ディスパッチ',
    sectionSub: '数字が捉えない状況——検証済み・出典付き・報道量順。',
    coverage: '{n} 媒体', tracking: 'リリがピッチ外の {n} 件を追跡中', sources: '出典', readMore: '出典を読む',
    types: { ENTRY: 'ビザ・入国', REFEREE: '審判', DISCIPLINE: '規律', POLITICS: '政治', LOGISTICS: 'ロジ', DOPING: 'アンチドーピング' },
    statuses: { CONFIRMED: '確認済み', DISPUTED: '係争中', OPINION: '見解' },
    escalations: { FIFA: 'FIFAが対応', GOVERNMENT: '政府', LEGAL: '訴訟中' },
  },
  KR: {
    sectionTitle: '데이터 너머 · 월드컵 디스패치',
    sectionSub: '숫자가 담지 못한 정황 — 검증·출처·보도량 순.',
    coverage: '{n}개 매체', tracking: '릴리가 그라운드 밖 {n}건을 추적 중', sources: '출처', readMore: '출처 보기',
    types: { ENTRY: '비자·입국', REFEREE: '심판', DISCIPLINE: '징계', POLITICS: '정치', LOGISTICS: '이동·숙소', DOPING: '도핑' },
    statuses: { CONFIRMED: '확인됨', DISPUTED: '논쟁 중', OPINION: '견해' },
    escalations: { FIFA: 'FIFA 조치', GOVERNMENT: '정부', LEGAL: '법정' },
  },
  AR: {
    sectionTitle: 'ما وراء البيانات · نشرة كأس العالم',
    sectionSub: 'الظروف التي لا تلتقطها الأرقام — موثّقة ومصدرها معلوم ومرتّبة حسب التغطية.',
    coverage: '{n} وسيلة', tracking: 'ليلي تتابع {n} قصة خارج الملعب', sources: 'المصادر', readMore: 'اقرأ المصادر',
    types: { ENTRY: 'التأشيرات والدخول', REFEREE: 'التحكيم', DISCIPLINE: 'الانضباط', POLITICS: 'السياسة', LOGISTICS: 'اللوجستيات', DOPING: 'مكافحة المنشطات' },
    statuses: { CONFIRMED: 'مؤكد', DISPUTED: 'متنازع عليه', OPINION: 'رأي' },
    escalations: { FIFA: 'الفيفا تدخّل', GOVERNMENT: 'الحكومة', LEGAL: 'أمام القضاء' },
  },
};

// ─── Ordering: real Coverage Index, never a fabricated view count ─────────────
// coverageScore = distinct outlets tracked + factual escalation weight. This is
// a transparent, sourceable proxy for prominence (NOT views/impressions).

export function coverageScore(e: DispatchEvent): number {
  return e.sources.length * 10 + e.escalation.length * 6;
}

export interface ResolvedDispatch {
  id: string;
  date: string;
  type: DispatchType;
  status: DispatchStatus;
  escalation: Escalation[];
  flags: string;
  title: string;
  body: string;
  sources: DispatchSource[];
  outlets: number;   // real count, shown as coverage
}

// Events ranked by coverage (desc), with EN/FR body resolved for the language.
export function getDispatch(lang: LangCode): ResolvedDispatch[] {
  const fr = lang === 'FR';
  return [...DISPATCH_EVENTS]
    .sort((a, b) => coverageScore(b) - coverageScore(a) || b.date.localeCompare(a.date))
    .map((e) => ({
      id: e.id,
      date: e.date,
      type: e.type,
      status: e.status,
      escalation: e.escalation,
      flags: e.flags,
      title: fr ? e.titleFR : e.titleEN,
      body: fr ? e.bodyFR : e.bodyEN,
      sources: e.sources,
      outlets: e.sources.length,
    }));
}
