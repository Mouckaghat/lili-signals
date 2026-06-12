// Lili-curated player profiles — updated before the tournament and during the group stage.
// Source of truth for scorer enrichment in Tournament Intelligence.
// Add a new entry here whenever a new scorer appears in MATCH_EVENTS.

export interface PlayerProfile {
  name: string;         // must match scorer name in MATCH_EVENTS exactly
  dob: string;          // YYYY-MM-DD
  age: number;          // as of June 2026
  club: string;
  league: string;
  leagueFlag: string;   // country flag emoji for the league
  clubRank?: number;    // final league table position (omit if unknown)
  wcCount: number;      // number of World Cups including 2026 (1 = debut)
  caps: number;
}

export const PLAYER_PROFILES: PlayerProfile[] = [
  // ── Mexico ────────────────────────────────────────────────────────────────────
  {
    name: 'Julián Quiñones',
    dob: '1997-03-24',
    age: 29,
    club: 'Al-Qadsiah',
    league: 'Saudi Pro League',
    leagueFlag: '🇸🇦',
    clubRank: 4,
    wcCount: 1,
    caps: 22,
  },
  {
    name: 'Raúl Jiménez',
    dob: '1991-05-05',
    age: 35,
    club: 'Fulham',
    league: 'Premier League',
    leagueFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    clubRank: 11,
    wcCount: 4,
    caps: 126,
  },
  // ── Czech Republic ────────────────────────────────────────────────────────────
  {
    name: 'Ladislav Krejčí',
    dob: '1999-04-20',
    age: 27,
    club: 'Wolverhampton',
    league: 'Championship',
    leagueFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    // clubRank omitted — 2025-26 Championship final position unconfirmed
    wcCount: 1,
    caps: 27,
  },
  // ── South Korea ───────────────────────────────────────────────────────────────
  {
    name: 'Hwang In-beom',
    dob: '1996-09-20',
    age: 29,
    club: 'Feyenoord',
    league: 'Eredivisie',
    leagueFlag: '🇳🇱',
    clubRank: 2,
    wcCount: 2,
    caps: 73,
  },
  {
    name: 'Oh Hyeon-gyu',
    dob: '2001-04-12',
    age: 25,
    club: 'Beşiktaş',
    league: 'Süper Lig',
    leagueFlag: '🇹🇷',
    clubRank: 4,
    wcCount: 1,
    caps: 27,
  },
];

export const PLAYER_PROFILES_LAST_UPDATED = '2026-06-12';
