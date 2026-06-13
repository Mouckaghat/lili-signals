// Curated match events — goals, yellow cards, red cards.
// Updated by Lili after each match day. Source of truth for tournament intelligence.

export type EventType = 'goal' | 'own-goal' | 'penalty';

export interface GoalEvent {
  player:           string;
  team:             string;
  minute:           number;
  minuteStoppage?:  number; // e.g. 5 for "45+5'"
  type:             EventType;
}

export interface CardEvent {
  player:  string;
  team:    string;
  minute?: number;
  reason?: string;
}

export interface MatchEvents {
  fixtureId:   string; // matches WCFixture.id
  home:        string;
  away:        string;
  date:        string; // YYYY-MM-DD
  goals:       GoalEvent[];
  yellowCards: CardEvent[];
  redCards:    CardEvent[];
}

export const MATCH_EVENTS: MatchEvents[] = [
  // ── GROUP A — Matchday 1 ─────────────────────────────────────────────────
  {
    fixtureId: 'A1_Mexico_v_South_Africa',
    home: 'Mexico', away: 'South Africa', date: '2026-06-11',
    goals: [
      { player: 'Julián Quiñones', team: 'Mexico',       minute: 9,  type: 'goal' },
      { player: 'Raúl Jiménez',    team: 'Mexico',       minute: 67, type: 'goal' },
    ],
    yellowCards: [],
    redCards: [
      { player: 'Sphephelo Sithole', team: 'South Africa', minute: 49, reason: 'DOGSO' },
      { player: 'Themba Zwane',      team: 'South Africa', minute: 84, reason: 'Violent conduct' },
      { player: 'César Montes',      team: 'Mexico',       minute: 92, reason: 'DOGSO' },
    ],
  },
  {
    fixtureId: 'A1_South_Korea_v_Czech_Republic',
    home: 'South Korea', away: 'Czech Republic', date: '2026-06-12',
    goals: [
      { player: 'Ladislav Krejčí', team: 'Czech Republic', minute: 59, type: 'goal' },
      { player: 'Hwang In-beom',   team: 'South Korea',    minute: 67, type: 'goal' },
      { player: 'Oh Hyeon-gyu',    team: 'South Korea',    minute: 80, type: 'goal' },
    ],
    yellowCards: [
      { player: 'Lee Gi-hyuk', team: 'South Korea' },
    ],
    redCards: [],
  },
  // ── GROUP B — Matchday 1 ─────────────────────────────────────────────────
  {
    fixtureId: 'B1_Canada_v_Bosnia_Herzegovina',
    home: 'Canada', away: 'Bosnia & Herzegovina', date: '2026-06-12',
    goals: [
      { player: 'Jovo Lukić',  team: 'Bosnia & Herzegovina', minute: 21, type: 'goal' },
      { player: 'Cyle Larin',  team: 'Canada',               minute: 78, type: 'goal' },
    ],
    yellowCards: [],
    redCards: [],
  },
  // ── GROUP D — Matchday 1 ─────────────────────────────────────────────────
  {
    fixtureId: 'C1_USA_v_Paraguay',
    home: 'USA', away: 'Paraguay', date: '2026-06-12',
    goals: [
      { player: 'Damián Bobadilla', team: 'Paraguay', minute: 7,  type: 'own-goal' },
      { player: 'Folarin Balogun',  team: 'USA',      minute: 31,                    type: 'goal' },
      { player: 'Folarin Balogun',  team: 'USA',      minute: 45, minuteStoppage: 5, type: 'goal' },
      { player: 'Maurício',         team: 'Paraguay', minute: 73,                    type: 'goal' },
      { player: 'Giovanni Reyna',   team: 'USA',      minute: 90, minuteStoppage: 8, type: 'goal' },
    ],
    yellowCards: [],
    redCards: [],
  },
  // ── GROUP C — Matchday 1 ─────────────────────────────────────────────────
  // LIVE (2nd half) — partial, goals through ~kickoff+45'; refresh at full-time.
  {
    fixtureId: 'D1_Brazil_v_Morocco',
    home: 'Brazil', away: 'Morocco', date: '2026-06-13',
    goals: [
      { player: 'Ismaël Saïbari',  team: 'Morocco', minute: 21, type: 'goal' },
      { player: 'Vinícius Júnior', team: 'Brazil',  minute: 32, type: 'goal' },
    ],
    yellowCards: [],
    redCards: [],
  },
];

export const MATCH_EVENTS_LAST_UPDATED = '2026-06-13';
