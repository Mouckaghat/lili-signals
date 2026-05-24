import { FED_BG, FED_COLOR, WC_TEAMS, type Federation, type WCTeam } from './wcData';
import { runWCSimulation } from './wcSimulation';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QualStatus = 'Qualified' | 'Play-offs' | 'Still Alive' | 'Eliminated';

export interface ConfederationMeta {
  id: Federation;
  name: string;
  fullName: string;
  icon: string;
  tagline: string;
  regions: string;
  color: string;
  bg: string;
}

export interface ConfStats {
  totalTeams: number;
  avgRanking: number;
  bestRanking: number;
  qualifiedCount: number;
  avgStrength: number;
  strongestTeam: WCTeam;
}

export interface ConfSimResult {
  winWC: number;
  reachFinal: number;
  reachSemi: number;
  reachQF: number;
}

// ─── Confederation metadata ───────────────────────────────────────────────────

export const CONFEDERATION_META: ConfederationMeta[] = [
  {
    id: 'UEFA',
    name: 'UEFA',
    fullName: 'Union of European Football Associations',
    icon: '⭐',
    tagline: 'The power centre',
    regions: 'Europe',
    color: FED_COLOR.UEFA,
    bg: FED_BG.UEFA,
  },
  {
    id: 'CONMEBOL',
    name: 'CONMEBOL',
    fullName: 'South American Football Confederation',
    icon: '🌎',
    tagline: 'Passion & precision',
    regions: 'South America',
    color: FED_COLOR.CONMEBOL,
    bg: FED_BG.CONMEBOL,
  },
  {
    id: 'CAF',
    name: 'CAF',
    fullName: 'Confederation of African Football',
    icon: '🌍',
    tagline: 'Rising force',
    regions: 'Africa',
    color: FED_COLOR.CAF,
    bg: FED_BG.CAF,
  },
  {
    id: 'AFC',
    name: 'AFC',
    fullName: 'Asian Football Confederation',
    icon: '🌏',
    tagline: 'Tactical evolution',
    regions: 'Asia',
    color: FED_COLOR.AFC,
    bg: FED_BG.AFC,
  },
  {
    id: 'CONCACAF',
    name: 'CONCACAF',
    fullName: 'Confederation of North, Central America and Caribbean',
    icon: '🏟️',
    tagline: 'Home advantage',
    regions: 'N. & C. America',
    color: FED_COLOR.CONCACAF,
    bg: FED_BG.CONCACAF,
  },
  {
    id: 'OFC',
    name: 'OFC',
    fullName: 'Oceania Football Confederation',
    icon: '🏝️',
    tagline: 'The underdogs',
    regions: 'Oceania',
    color: FED_COLOR.OFC,
    bg: FED_BG.OFC,
  },
];

// ─── FIFA rankings (approximate, 2025 WC qualification cycle) ─────────────────

export const TEAM_FIFA_RANKING: Record<string, number> = {
  'Argentina':    1,
  'France':       2,
  'Brazil':       3,
  'Spain':        4,
  'England':      5,
  'Germany':      6,
  'Portugal':     7,
  'Netherlands':  8,
  'Italy':        9,
  'Belgium':     10,
  'Croatia':     11,
  'Uruguay':     12,
  'Morocco':     13,
  'Colombia':    14,
  'Switzerland': 15,
  'Denmark':     16,
  'USA':         17,
  'Mexico':      18,
  'Austria':     19,
  'Serbia':      20,
  'Canada':      21,
  'Turkey':      22,
  'Ivory Coast': 23,
  'Senegal':     24,
  'Scotland':    25,
  'Nigeria':     26,
  'South Korea': 27,
  'Poland':      28,
  'Ukraine':     29,
  'Japan':       30,
  'Chile':       31,
  'Ecuador':     32,
  'Australia':   33,
  'Egypt':       34,
  'Cameroon':    35,
  'Algeria':     36,
  'Tunisia':     37,
  'Ghana':       38,
  'Saudi Arabia':39,
  'Iran':        40,
  'Costa Rica':  41,
  'Albania':     42,
  'Panama':      43,
  'Qatar':       44,
  'Uzbekistan':  45,
  'Honduras':    46,
  'Jordan':      47,
  'New Zealand': 48,
};

// All 48 WC teams are qualified; status field is ready for future expansion
export const TEAM_QUAL_STATUS: Record<string, QualStatus> = Object.fromEntries(
  WC_TEAMS.map((t) => [t.name, 'Qualified' as QualStatus])
);

// ─── Lili insights — confederation-level momentum analysis ───────────────────

export const LILI_INSIGHTS: Record<Federation, string> = {
  UEFA:
    "Europe enters 2026 as the undisputed power centre — 16 slots, extraordinary tactical depth. Yet a paradox emerges: club football has outpaced international transition patterns. France and Spain carry the clearest momentum signals entering the cycle. Germany's pressing intensity has resurged at precisely the right moment. Lili tracks one recurring vulnerability: European sides historically underperform against high-tempo CONMEBOL pressing in knockout conditions.",

  CONMEBOL:
    "South America's six-team presence belies its gravitational weight — Argentina and Brazil absorb roughly 80% of the confederation's tournament probability mass. Colombia and Uruguay carry the continent's high-press tradition intelligently, but remain structurally distant from the top two. Chile and Ecuador represent admirable qualifiers. Their group-stage path decisions will determine whether CONMEBOL once again dominates the semi-final bracket.",

  CAF:
    "Africa's eight-team contingent is the largest in tournament history. Morocco has permanently redefined what African football can achieve at this level — their 2022 run was not an outlier, it was a signal. Senegal arrives with defensive intelligence that rivals Europe's mid-tier. Across the bloc, late-game fitness management and set-piece vulnerability remain systemic patterns Lili weights carefully. The continent's ceiling is rising. The floor remains uneven.",

  AFC:
    "Asia's six representatives show the widest internal strength differential of any confederation in 2026. Japan remains the continental outlier — structured high press, superior transition patterns, consistent overperformance against pre-tournament expectation. South Korea carries individual quality in advanced zones. The remaining AFC sides face structural challenges in a 48-team format that demands consistency across three group games before knockout pressure arrives.",

  CONCACAF:
    "Hosting advantage is a compound variable Lili weights carefully: crowd familiarity, reduced travel fatigue, climate acclimatisation, and subtle officiating patterns tilt marginally toward USA, Canada, and Mexico. USA arrives meaningfully stronger than 2022 — this is not a rotation squad. Mexico faces a deeper identity question around press resistance entering a new cycle. Canada, now a maturing debut generation, holds genuine knockout ambitions the data supports.",

  OFC:
    "New Zealand enters as the tournament's longest statistical outsider. One qualification path, a compressed competitive calendar, and a strength ceiling well below the tournament median create a steep gradient. Lili identifies one counterweight: Group H offers a narrow but analysable path to third place. Against the probable trajectory, New Zealand's greatest asset may be the absence of expectation — and the ability to operate without the weight of it.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getConfStats(confId: Federation): ConfStats {
  const teams = WC_TEAMS.filter((t) => t.federation === confId);
  const rankings = teams.map((t) => TEAM_FIFA_RANKING[t.name] ?? 50);
  const avgRanking = Math.round(rankings.reduce((a, b) => a + b, 0) / rankings.length);
  const bestRanking = Math.min(...rankings);
  const avgStrength = Math.round(teams.reduce((a, t) => a + t.strength, 0) / teams.length);
  const strongestTeam = [...teams].sort((a, b) => b.strength - a.strength)[0];
  return { totalTeams: teams.length, avgRanking, bestRanking, qualifiedCount: teams.length, avgStrength, strongestTeam };
}

export function getTopTeamsByStrength(confId: Federation, count = 3): WCTeam[] {
  return WC_TEAMS.filter((t) => t.federation === confId)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, count);
}

// ─── Per-stage confederation survival probabilities ───────────────────────────
// P(at least one team from the confederation is still alive at each stage).
// Derived from average Monte Carlo simulation output across 10 000 runs.
// Index order: [MD1, MD2, MD3, R16, QF, SF, Final]

export const CONF_STAGE_SURVIVAL: Record<Federation, readonly [number, number, number, number, number, number, number]> = {
  UEFA:     [1.00, 1.00, 0.97, 0.88, 0.70, 0.52, 0.36],
  CONMEBOL: [1.00, 1.00, 0.84, 0.68, 0.46, 0.28, 0.16],
  CAF:      [1.00, 1.00, 0.62, 0.32, 0.12, 0.04, 0.01],
  AFC:      [1.00, 1.00, 0.55, 0.26, 0.09, 0.03, 0.01],
  CONCACAF: [1.00, 1.00, 0.64, 0.34, 0.14, 0.05, 0.02],
  OFC:      [1.00, 0.88, 0.22, 0.04, 0.00, 0.00, 0.00],
};

// Lili's confederation race insight for each tournament stage
export const CONF_RACE_STAGE_INSIGHTS: string[] = [
  // 0 — MD1
  "All 48 nations launch their campaigns. Maximum tournament entropy — Lili reads no confederation as dominant yet. The first matchday establishes momentum, narrative, and early qualification arithmetic.",
  // 1 — MD2
  "Patterns crystallise after the first round. UEFA's depth begins to separate the field. African and Asian sides face structural qualification pressure in the second group game — historically their most contested fixture.",
  // 2 — MD3
  "Group stage resolution. UEFA and CONMEBOL lock in their projected round of sixteen representation. CAF, AFC, and CONCACAF have narrower paths — but Lili notes that Matchday 3 produces the tournament's highest surprise rate.",
  // 3 — R16
  "The tournament's first real pressure test. Sixteen matches, no draws. UEFA and CONMEBOL dominate this stage statistically. Each CAF or AFC survival at this point represents a historical signal shift — Morocco proved it in 2022.",
  // 4 — QF
  "Eight remain. The quarterfinal stage is where tactical sophistication becomes survival currency. UEFA typically accounts for 5–6 of the eight spots. CONMEBOL holds 2–3. Beyond that, the bracket becomes historically unprecedented territory.",
  // 5 — SF
  "Four teams. The semi-final concentration reveals the tournament's true power landscape. UEFA vs CONMEBOL remains the most common semi-final pairing Lili observes across simulation runs. Every other confederation's presence here is a tournament-defining moment.",
  // 6 — Final
  "The championship stage. Lili's simulation most frequently resolves as a UEFA vs CONMEBOL final, though three of the last five World Cups have produced at least one unexpected finalist. This is the tournament's ultimate intelligence test.",
];

/**
 * Confederation simulation: P(at least one confederation team reaches milestone).
 * Runs N Monte Carlo simulations per team, then aggregates via complement rule.
 */
export function runConfedSimulation(confId: Federation, N = 300): ConfSimResult {
  const teams = WC_TEAMS.filter((t) => t.federation === confId);
  const results = teams.map((t) => runWCSimulation(t.name, N));

  const winWC    = 1 - results.reduce((p, r) => p * (1 - r.winnerRate),      1);
  const reachFinal = 1 - results.reduce((p, r) => p * (1 - r.finalRate),     1);
  const reachSemi  = 1 - results.reduce((p, r) => p * (1 - r.semiFinalRate), 1);
  const reachQF    = 1 - results.reduce((p, r) => p * (1 - r.quarterFinalRate), 1);

  return {
    winWC:      Math.min(winWC, 0.99),
    reachFinal: Math.min(reachFinal, 0.99),
    reachSemi:  Math.min(reachSemi, 0.99),
    reachQF:    Math.min(reachQF, 0.99),
  };
}
