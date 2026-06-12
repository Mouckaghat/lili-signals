// Lili-curated player profiles — updated before the tournament and during the group stage.
// Source of truth for scorer enrichment in Tournament Intelligence.
// Add a new entry here whenever a new scorer appears in MATCH_EVENTS.

export interface PlayerProfile {
  name: string;         // must match scorer name in MATCH_EVENTS exactly
  age: number;          // as of June 2026
  club: string;
  league: string;
  clubStanding?: string; // end of most recent completed season; omit if unknown
  wcCount: number;      // number of World Cups including 2026 (1 = debut)
  caps: number;
}

export const PLAYER_PROFILES: PlayerProfile[] = [
  // ── Mexico ────────────────────────────────────────────────────────────────────
  {
    name: 'Julián Quiñones',
    age: 29,
    club: 'Al-Qadsiah',
    league: 'Saudi Pro League',
    clubStanding: '4th',
    wcCount: 1,
    caps: 22,
  },
  {
    name: 'Raúl Jiménez',
    age: 35,
    club: 'Fulham',
    league: 'Premier League',
    clubStanding: '11th',
    wcCount: 4,
    caps: 126,
  },
  // ── Czech Republic ────────────────────────────────────────────────────────────
  {
    name: 'Ladislav Krejčí',
    age: 27,
    club: 'Wolverhampton',
    league: 'Championship',
    // clubStanding omitted — Wolves' 2025-26 Championship final position unconfirmed
    wcCount: 1,
    caps: 27,
  },
  // ── South Korea ───────────────────────────────────────────────────────────────
  {
    name: 'Hwang In-beom',
    age: 29,
    club: 'Feyenoord',
    league: 'Eredivisie',
    clubStanding: '2nd',
    wcCount: 2,
    caps: 73,
  },
  {
    name: 'Oh Hyeon-gyu',
    age: 25,
    club: 'Beşiktaş',
    league: 'Süper Lig',
    clubStanding: '4th',
    wcCount: 1,
    caps: 27,
  },
];

export const PLAYER_PROFILES_LAST_UPDATED = '2026-06-12';
