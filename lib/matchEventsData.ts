// Curated match events — goals, yellow cards, red cards.
// Updated by Lili after each match day. Source of truth for tournament intelligence.

export type EventType = 'goal' | 'own-goal' | 'penalty';

export interface GoalEvent {
  player: string;
  team:   string;
  minute: number;
  type:   EventType;
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
];

export const MATCH_EVENTS_LAST_UPDATED = '2026-06-12';
