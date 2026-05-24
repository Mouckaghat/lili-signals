export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  competition: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED';
  score?: { home: number; away: number };
  matchday?: number;
}

export interface Team {
  id: number;
  name: string;
  shortName: string;
}

export interface GroupStanding {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export interface Group {
  group: string;
  teams: GroupStanding[];
}

export const DEMO_MATCHES: Match[] = [
  {
    id: 'demo-001',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    date: '2025-09-14T14:00:00Z',
    competition: 'Premier League',
    status: 'FINISHED',
    score: { home: 2, away: 1 },
    matchday: 5,
  },
  {
    id: 'demo-002',
    homeTeam: 'Barcelona',
    awayTeam: 'Real Madrid',
    date: '2025-10-26T19:00:00Z',
    competition: 'La Liga',
    status: 'FINISHED',
    score: { home: 3, away: 3 },
    matchday: 12,
  },
  {
    id: 'demo-003',
    homeTeam: 'Bayern Munich',
    awayTeam: 'Borussia Dortmund',
    date: '2025-11-01T17:30:00Z',
    competition: 'Bundesliga',
    status: 'FINISHED',
    score: { home: 1, away: 0 },
    matchday: 9,
  },
  {
    id: 'demo-004',
    homeTeam: 'PSG',
    awayTeam: 'Marseille',
    date: '2025-11-08T20:45:00Z',
    competition: 'Ligue 1',
    status: 'SCHEDULED',
    matchday: 13,
  },
  {
    id: 'demo-005',
    homeTeam: 'Manchester City',
    awayTeam: 'Liverpool',
    date: '2025-11-23T16:30:00Z',
    competition: 'Premier League',
    status: 'SCHEDULED',
    matchday: 12,
  },
];

export const DEMO_TEAMS: Team[] = [
  { id: 57, name: 'Arsenal', shortName: 'ARS' },
  { id: 61, name: 'Chelsea', shortName: 'CHE' },
  { id: 65, name: 'Manchester City', shortName: 'MCI' },
  { id: 64, name: 'Liverpool', shortName: 'LIV' },
];

export const DEMO_WORLD_CUP_GROUPS: Group[] = [
  {
    group: 'Group A',
    teams: [
      { name: 'Brazil', played: 3, won: 2, drawn: 1, lost: 0, gf: 6, ga: 2, points: 7 },
      { name: 'Germany', played: 3, won: 2, drawn: 0, lost: 1, gf: 5, ga: 3, points: 6 },
      { name: 'Cameroon', played: 3, won: 1, drawn: 1, lost: 1, gf: 3, ga: 4, points: 4 },
      { name: 'Serbia', played: 3, won: 0, drawn: 0, lost: 3, gf: 1, ga: 6, points: 0 },
    ],
  },
  {
    group: 'Group B',
    teams: [
      { name: 'France', played: 3, won: 3, drawn: 0, lost: 0, gf: 8, ga: 1, points: 9 },
      { name: 'England', played: 3, won: 1, drawn: 1, lost: 1, gf: 4, ga: 4, points: 4 },
      { name: 'Morocco', played: 3, won: 1, drawn: 1, lost: 1, gf: 3, ga: 4, points: 4 },
      { name: 'Ecuador', played: 3, won: 0, drawn: 0, lost: 3, gf: 1, ga: 7, points: 0 },
    ],
  },
  {
    group: 'Group C',
    teams: [
      { name: 'Argentina', played: 3, won: 3, drawn: 0, lost: 0, gf: 7, ga: 2, points: 9 },
      { name: 'Mexico', played: 3, won: 1, drawn: 1, lost: 1, gf: 3, ga: 3, points: 4 },
      { name: 'USA', played: 3, won: 1, drawn: 0, lost: 2, gf: 3, ga: 5, points: 3 },
      { name: 'Poland', played: 3, won: 0, drawn: 1, lost: 2, gf: 2, ga: 5, points: 1 },
    ],
  },
];

const zero = (name: string): GroupStanding => ({
  name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0,
});

export const WORLD_CUP_2026_GROUPS: Group[] = [
  { group: 'Group A', teams: ['France', 'USA', 'Morocco', 'Japan'].map(zero) },
  { group: 'Group B', teams: ['Spain', 'Mexico', 'Nigeria', 'South Korea'].map(zero) },
  { group: 'Group C', teams: ['Germany', 'Canada', 'Senegal', 'Australia'].map(zero) },
  { group: 'Group D', teams: ['England', 'Colombia', 'Egypt', 'Iran'].map(zero) },
  { group: 'Group E', teams: ['Portugal', 'Ecuador', 'Ivory Coast', 'Saudi Arabia'].map(zero) },
  { group: 'Group F', teams: ['Netherlands', 'Chile', 'Ghana', 'Jordan'].map(zero) },
  { group: 'Group G', teams: ['Belgium', 'Panama', 'Cameroon', 'Uzbekistan'].map(zero) },
  { group: 'Group H', teams: ['Italy', 'Uruguay', 'Algeria', 'New Zealand'].map(zero) },
  { group: 'Group I', teams: ['Brazil', 'Costa Rica', 'Tunisia', 'Qatar'].map(zero) },
  { group: 'Group J', teams: ['Argentina', 'Honduras', 'Scotland', 'Turkey'].map(zero) },
  { group: 'Group K', teams: ['Croatia', 'Switzerland', 'Denmark', 'Poland'].map(zero) },
  { group: 'Group L', teams: ['Serbia', 'Austria', 'Albania', 'Ukraine'].map(zero) },
];
