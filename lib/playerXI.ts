// The Lili XI — 4-3-3 formation.
// 11 intelligence systems, each with a position, jersey number, and personality.
// This is the single source of truth for the home screen formation,
// feature intro pages, and any XI-wide UI.

export type Position = 'GK' | 'RB' | 'CB' | 'LB' | 'CM' | 'CAM' | 'RW' | 'ST' | 'LW';

export interface PlayerXI {
  number:       number;   // jersey number 1–11
  position:     Position;
  positionFull: string;   // "Goalkeeper", "Right Back", …
  name:         string;   // module display name
  path:         string;   // expo-router path
  icon:         string;   // emoji
  accentColor:  string;
  description:  string;   // 2–3 sentences shown on intro page
  features:     string[]; // 3–4 bullet points
  liliSays:     string;   // one-liner quote
}

// ─── Formation rows (top = attack, bottom = GK) ───────────────────────────────

export const PLAYERS: PlayerXI[] = [
  // ── Goalkeeper ──────────────────────────────────────────────────────────────
  {
    number:       1,
    position:     'GK',
    positionFull: 'Goalkeeper',
    name:         'World Signals',
    path:         '/world-signals',
    icon:         '🌍',
    accentColor:  '#00E5A0',
    description:
      'The last line of intelligence. World Signals watches the full 48-team field simultaneously, surfacing the signals that matter before they become obvious — climate stress, momentum shifts, structural danger.',
    features: [
      'Multi-dimensional signal aggregation across all groups',
      'Danger zone classification and momentum detection',
      'Environmental and logistical pressure scoring',
      'Cross-confederation pattern recognition engine',
    ],
    liliSays: 'I watch everything so you only need to watch what counts.',
  },

  // ── Right Back ──────────────────────────────────────────────────────────────
  {
    number:       2,
    position:     'RB',
    positionFull: 'Right Back',
    name:         'Stadium Intelligence',
    path:         '/stadium-intelligence',
    icon:         '🏟️',
    accentColor:  '#4A9EFF',
    description:
      'Tactical, precise, positioned exactly where the battle is fought. Stadium Intelligence maps all 16 WC 2026 venues with environmental, logistical, and competitive data — every pitch is a different game.',
    features: [
      '16-venue ecosystem profiles across 3 countries',
      'Altitude, heat, and humidity performance indices',
      'Travel stress modelling per venue stop',
      'Tournament pressure coefficient per stadium',
    ],
    liliSays: 'Every pitch is a different game. I know them all.',
  },

  // ── Center Back (left) ──────────────────────────────────────────────────────
  {
    number:       3,
    position:     'CB',
    positionFull: 'Center Back',
    name:         '48-Team World Table',
    path:         '/worldcup-table',
    icon:         '📊',
    accentColor:  '#4A9EFF',
    description:
      'The data bedrock. Nothing gets past it. The World Table tracks all 12 groups and 48 teams simultaneously — qualification mathematics, form indicators, and points projections in one clean view.',
    features: [
      'All 12 groups, 48 teams tracked in real time',
      'Win / draw / loss form dots per team',
      'Live qualification probability overlay',
      'Group tiebreaker scenario analysis',
    ],
    liliSays: 'In the data, the truth. Always.',
  },

  // ── Center Back (right) ─────────────────────────────────────────────────────
  {
    number:       4,
    position:     'CB',
    positionFull: 'Center Back',
    name:         'Confederations',
    path:         '/confederations',
    icon:         '🌐',
    accentColor:  '#2563EB',
    description:
      'Power and authority at the structural level. Confederations maps the global football power landscape — who dominates, who surprises, and where the title will most likely come from.',
    features: [
      '6-confederation power and simulation analysis',
      'Monte Carlo WC winner probability by region',
      'Tournament survival race by stage',
      'Confederation clash probability matrix',
    ],
    liliSays: 'Europe defends. South America attacks. The rest is chaos — and I love chaos.',
  },

  // ── Left Back ───────────────────────────────────────────────────────────────
  {
    number:       5,
    position:     'LB',
    positionFull: 'Left Back',
    name:         'Lili Route Intelligence',
    path:         '/lili-route-intelligence',
    icon:         '🗺️',
    accentColor:  '#00C8FF',
    description:
      'Disciplined, methodical, covers every meter of terrain. Route Intelligence is the environmental engine — mapping how travel distances, altitude shifts, and climate transitions stack up to fatigue the field.',
    features: [
      'Danger zone classification: Death Corridor → Safe',
      'Climate transition fatigue scoring per campaign',
      'Altitude and heat exposure per team route',
      'Full 48-team difficulty ranking with briefings',
    ],
    liliSays: 'The hardest match is sometimes the one before the match.',
  },

  // ── Central Midfielder (left) ────────────────────────────────────────────────
  {
    number:       6,
    position:     'CM',
    positionFull: 'Central Midfielder',
    name:         'Group Drama Index',
    path:         '/group-drama',
    icon:         '🎭',
    accentColor:  '#D4A520',
    description:
      'Reads tension before anyone else does. The Drama Index runs 729 group-stage outcome scenarios per group, using Shannon entropy to score how mathematically unpredictable each group really is.',
    features: [
      '729-scenario analytical engine per group',
      'Shannon entropy drama score 0–100',
      'CALM / BUILDING / TENSION / CHAOS classification',
      'Dark horse callouts and qualifying-pair probabilities',
    ],
    liliSays: 'Every group tells a story. Some are thrillers.',
  },

  // ── Attacking Midfielder ─────────────────────────────────────────────────────
  {
    number:       7,
    position:     'CAM',
    positionFull: 'Attacking Midfielder',
    name:         'Alternate Timeline',
    path:         '/alternate-timeline',
    icon:         '⚡',
    accentColor:  '#C060FF',
    description:
      'The creative playmaker. Alternate Timeline is the counterfactual engine — shift any team\'s effective strength and watch how the group re-draws itself, match by match, qualification by qualification.',
    features: [
      'Strength delta override from −20 to +20',
      'Per-match probability comparison: BASE vs ALT',
      'Qualification shift and expected-points analysis',
      'Group ripple effect on all 3 rivals simultaneously',
    ],
    liliSays: 'What if Argentina were weaker? What if Morocco were stronger? I answer both.',
  },

  // ── Central Midfielder (right) ────────────────────────────────────────────────
  {
    number:       8,
    position:     'CM',
    positionFull: 'Central Midfielder',
    name:         'Cumulative Journey Graph',
    path:         '/cumulative-graph',
    icon:         '📈',
    accentColor:  '#4A9EFF',
    description:
      'Endurance and range. The Cumulative Graph tracks how teams\' expected tournament momentum builds or collapses across the full group stage — fixture by fixture, day by day.',
    features: [
      'Expected-points trajectory per team over 3 matchdays',
      'Multi-team comparison overlay in the same group',
      'Momentum shift detection at the midpoint',
      'Visual divergence from pre-tournament projections',
    ],
    liliSays: "It's not where you start. It's where you're going.",
  },

  // ── Right Winger ─────────────────────────────────────────────────────────────
  {
    number:       9,
    position:     'RW',
    positionFull: 'Right Winger',
    name:         'Team Route',
    path:         '/team-route',
    icon:         '✈️',
    accentColor:  '#FF7B35',
    description:
      'Fast, direct, attacks the space. Team Route maps the full geographic and environmental journey any team will make through the WC 2026 venues — with venue-by-venue intelligence at every stop.',
    features: [
      'Full campaign route mapped by matchday',
      'Venue environmental profile per stop',
      'Climate and altitude transition notes between venues',
      'Total travel distance and estimated flight hours',
    ],
    liliSays: 'Before the ball is kicked, the journey has already begun.',
  },

  // ── Striker (the #10) ────────────────────────────────────────────────────────
  {
    number:       10,
    position:     'ST',
    positionFull: 'Striker',
    name:         'Play Against Lili',
    path:         '/lili-simulation',
    icon:         '⚔️',
    accentColor:  '#FF3B30',
    description:
      'The duel. Pure competitive instinct. Select any WC 2026 team and Lili generates a full prediction profile — then runs a Monte Carlo tournament simulation across up to 10,000 scenarios.',
    features: [
      'Match-by-match group stage prediction profile',
      'Monte Carlo tournament simulation (1 to 10,000 runs)',
      'Win probability per knockout round',
      'Lili reasoning, danger signals, and key opponent analysis',
    ],
    liliSays: "Pick your team. I'll tell you what happens.",
  },

  // ── Left Winger (#11) ────────────────────────────────────────────────────────
  {
    number:       11,
    position:     'LW',
    positionFull: 'Left Winger',
    name:         'Favourite Team Journey',
    path:         '/journey',
    icon:         '💫',
    accentColor:  '#FF9F0A',
    description:
      'Passionate, personal, always moving forward. Choose your team and follow their projected path through the entire tournament — from the first group-stage whistle to the final.',
    features: [
      'Projected knockout path from group stage to final',
      'Win / draw / loss probability per group fixture',
      'Round-by-round survival odds through the bracket',
      'Lili tactical insight and risk note per fixture',
    ],
    liliSays: 'Every fan deserves to know the truth about their team\'s chances.',
  },
];

// ─── Formation rows (top = attack, bottom = GK) ───────────────────────────────

export const FORMATION_ROWS: Position[][] = [
  ['LW', 'ST', 'RW'],
  ['CM', 'CAM', 'CM'],
  ['LB', 'CB', 'CB', 'RB'],
  ['GK'],
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function playerByPath(path: string): PlayerXI | undefined {
  return PLAYERS.find(p => p.path === path);
}

export function playerByNumber(n: number): PlayerXI | undefined {
  return PLAYERS.find(p => p.number === n);
}

// Returns players in formation order (top row first), matching FORMATION_ROWS
export function playersInFormationOrder(): PlayerXI[][] {
  const byPos: Map<Position, PlayerXI[]> = new Map();
  for (const p of PLAYERS) {
    const list = byPos.get(p.position) ?? [];
    list.push(p);
    byPos.set(p.position, list);
  }

  return FORMATION_ROWS.map(row =>
    row.map(pos => {
      const list = byPos.get(pos)!;
      // For duplicate positions (2×CB, 2×CM), consume from the list in order
      return list.shift()!;
    })
  );
}
