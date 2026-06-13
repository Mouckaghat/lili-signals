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
    league: 'Premier League',
    leagueFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    clubRank: 20, // relegated — finished 20th (last) in 2025-26 PL
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
  // ── Bosnia & Herzegovina ──────────────────────────────────────────────────────
  {
    name: 'Jovo Lukić',
    dob: '1998-11-28',
    age: 27,
    club: 'Universitatea Cluj',
    league: 'Liga I',
    leagueFlag: '🇷🇴',
    clubRank: 3,
    wcCount: 1,
    caps: 4,
  },
  // ── Canada ────────────────────────────────────────────────────────────────────
  {
    name: 'Cyle Larin',
    dob: '1995-04-17',
    age: 31,
    club: 'Mallorca',
    league: 'La Liga',
    leagueFlag: '🇪🇸',
    clubRank: 18,
    wcCount: 2,
    caps: 91,
  },
  // ── USA ───────────────────────────────────────────────────────────────────────
  {
    name: 'Folarin Balogun',
    dob: '2001-07-03',
    age: 24,
    club: 'AS Monaco',
    league: 'Ligue 1',
    leagueFlag: '🇫🇷',
    clubRank: 7,
    wcCount: 1,
    caps: 28,
  },
  {
    name: 'Giovanni Reyna',
    dob: '2002-11-13',
    age: 23,
    club: 'Borussia Mönchengladbach',
    league: 'Bundesliga',
    leagueFlag: '🇩🇪',
    clubRank: 12,
    wcCount: 2,
    caps: 39,
  },
  // ── Paraguay ──────────────────────────────────────────────────────────────────
  {
    name: 'Damián Bobadilla',
    dob: '2001-07-11',
    age: 24,
    club: 'São Paulo',
    league: 'Série A',
    leagueFlag: '🇧🇷',
    clubRank: 8,
    wcCount: 1,
    caps: 19,
  },
  {
    name: 'Maurício',
    dob: '2001-06-22',
    age: 24,
    club: 'Palmeiras',
    league: 'Série A',
    leagueFlag: '🇧🇷',
    clubRank: 1,
    wcCount: 1,
    caps: 4,
  },
];

export const PLAYER_PROFILES_LAST_UPDATED = '2026-06-13';
