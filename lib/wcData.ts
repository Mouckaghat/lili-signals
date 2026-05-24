// World Cup 2026 — static reference data
// USA · Canada · Mexico | June 11 – July 19, 2026
// WC_TEAMS and WC_FIXTURES sourced from api-football.com (see scripts/build-wc-data.ts)

export type Federation = 'UEFA' | 'CONMEBOL' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC';

export const FED_COLOR: Record<Federation, string> = {
  UEFA:     '#2563EB',  // blue   — Europe
  CONMEBOL: '#D4A520',  // gold   — South America
  CAF:      '#16A34A',  // green  — Africa
  AFC:      '#DC2626',  // red    — Asia
  CONCACAF: '#F97316',  // orange — North/Central America & Caribbean
  OFC:      '#0891B2',  // teal   — Oceania
};

export const FED_BG: Record<Federation, string> = {
  UEFA:     '#EBF1FD',
  CONMEBOL: '#FBF3DC',
  CAF:      '#E3F5EC',
  AFC:      '#FDEAEA',
  CONCACAF: '#FEF0E6',
  OFC:      '#E0F5FA',
};

export interface WCTeam {
  name: string;
  flag: string;
  group: string;
  federation: Federation;
  strength: number; // 50–92 (used by simulation engine)
}

export interface WCFixture {
  id: string;
  group: string;
  matchday: 1 | 2 | 3;
  home: string;
  away: string;
  date: string; // ISO 8601
  stadium: string;
  city: string;
  country: 'USA' | 'Canada' | 'Mexico';
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  homeScore?: number;
  awayScore?: number;
}

// ─── 48 Teams ─────────────────────────────────────────────────────────────────

export const WC_TEAMS: WCTeam[] = [
  // Group A
  { name: 'Czech Republic', flag: '🇨🇿', group: 'A', federation: 'UEFA', strength: 67 },
  { name: 'Mexico', flag: '🇲🇽', group: 'A', federation: 'CONCACAF', strength: 69 },
  { name: 'South Africa', flag: '🇿🇦', group: 'A', federation: 'CAF', strength: 62 },
  { name: 'South Korea', flag: '🇰🇷', group: 'A', federation: 'AFC', strength: 66 },
  // Group B
  { name: 'Bosnia & Herzegovina', flag: '🇧🇦', group: 'B', federation: 'UEFA', strength: 64 },
  { name: 'Canada', flag: '🇨🇦', group: 'B', federation: 'CONCACAF', strength: 69 },
  { name: 'Qatar', flag: '🇶🇦', group: 'B', federation: 'AFC', strength: 57 },
  { name: 'Switzerland', flag: '🇨🇭', group: 'B', federation: 'UEFA', strength: 73 },
  // Group C
  { name: 'Australia', flag: '🇦🇺', group: 'C', federation: 'AFC', strength: 64 },
  { name: 'Paraguay', flag: '🇵🇾', group: 'C', federation: 'CONMEBOL', strength: 63 },
  { name: 'Türkiye', flag: '🇹🇷', group: 'C', federation: 'UEFA', strength: 68 },
  { name: 'USA', flag: '🇺🇸', group: 'C', federation: 'CONCACAF', strength: 72 },
  // Group D
  { name: 'Brazil', flag: '🇧🇷', group: 'D', federation: 'CONMEBOL', strength: 87 },
  { name: 'Haiti', flag: '🇭🇹', group: 'D', federation: 'CONCACAF', strength: 53 },
  { name: 'Morocco', flag: '🇲🇦', group: 'D', federation: 'CAF', strength: 73 },
  { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'D', federation: 'UEFA', strength: 66 },
  // Group E
  { name: 'Curaçao', flag: '🇨🇼', group: 'E', federation: 'CONCACAF', strength: 54 },
  { name: 'Ecuador', flag: '🇪🇨', group: 'E', federation: 'CONMEBOL', strength: 65 },
  { name: 'Germany', flag: '🇩🇪', group: 'E', federation: 'UEFA', strength: 83 },
  { name: 'Ivory Coast', flag: '🇨🇮', group: 'E', federation: 'CAF', strength: 68 },
  // Group F
  { name: 'Japan', flag: '🇯🇵', group: 'F', federation: 'AFC', strength: 67 },
  { name: 'Netherlands', flag: '🇳🇱', group: 'F', federation: 'UEFA', strength: 80 },
  { name: 'Sweden', flag: '🇸🇪', group: 'F', federation: 'UEFA', strength: 68 },
  { name: 'Tunisia', flag: '🇹🇳', group: 'F', federation: 'CAF', strength: 63 },
  // Group G
  { name: 'Cape Verde Islands', flag: '🇨🇻', group: 'G', federation: 'CAF', strength: 60 },
  { name: 'Saudi Arabia', flag: '🇸🇦', group: 'G', federation: 'AFC', strength: 61 },
  { name: 'Spain', flag: '🇪🇸', group: 'G', federation: 'UEFA', strength: 85 },
  { name: 'Uruguay', flag: '🇺🇾', group: 'G', federation: 'CONMEBOL', strength: 75 },
  // Group H
  { name: 'Belgium', flag: '🇧🇪', group: 'H', federation: 'UEFA', strength: 77 },
  { name: 'Egypt', flag: '🇪🇬', group: 'H', federation: 'CAF', strength: 64 },
  { name: 'Iran', flag: '🇮🇷', group: 'H', federation: 'AFC', strength: 60 },
  { name: 'New Zealand', flag: '🇳🇿', group: 'H', federation: 'OFC', strength: 53 },
  // Group I
  { name: 'France', flag: '🇫🇷', group: 'I', federation: 'UEFA', strength: 88 },
  { name: 'Iraq', flag: '🇮🇶', group: 'I', federation: 'AFC', strength: 62 },
  { name: 'Norway', flag: '🇳🇴', group: 'I', federation: 'UEFA', strength: 66 },
  { name: 'Senegal', flag: '🇸🇳', group: 'I', federation: 'CAF', strength: 68 },
  // Group J
  { name: 'Algeria', flag: '🇩🇿', group: 'J', federation: 'CAF', strength: 63 },
  { name: 'Argentina', flag: '🇦🇷', group: 'J', federation: 'CONMEBOL', strength: 90 },
  { name: 'Austria', flag: '🇦🇹', group: 'J', federation: 'UEFA', strength: 69 },
  { name: 'Jordan', flag: '🇯🇴', group: 'J', federation: 'AFC', strength: 54 },
  // Group K
  { name: 'Colombia', flag: '🇨🇴', group: 'K', federation: 'CONMEBOL', strength: 73 },
  { name: 'Congo DR', flag: '🇨🇩', group: 'K', federation: 'CAF', strength: 61 },
  { name: 'Portugal', flag: '🇵🇹', group: 'K', federation: 'UEFA', strength: 81 },
  { name: 'Uzbekistan', flag: '🇺🇿', group: 'K', federation: 'AFC', strength: 56 },
  // Group L
  { name: 'Croatia', flag: '🇭🇷', group: 'L', federation: 'UEFA', strength: 76 },
  { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L', federation: 'UEFA', strength: 85 },
  { name: 'Ghana', flag: '🇬🇭', group: 'L', federation: 'CAF', strength: 62 },
  { name: 'Panama', flag: '🇵🇦', group: 'L', federation: 'CONCACAF', strength: 58 },
];

// ─── Venues ───────────────────────────────────────────────────────────────────

const V = {
  // utcOffset = DST offset in June 2026
  metlife:   { stadium: 'MetLife Stadium',         city: 'East Rutherford, NJ', country: 'USA',    utcOffset: '-04:00' }, // EDT
  sofi:      { stadium: 'SoFi Stadium',             city: 'Inglewood, CA',       country: 'USA',    utcOffset: '-07:00' }, // PDT
  att:       { stadium: 'AT&T Stadium',             city: 'Arlington, TX',       country: 'USA',    utcOffset: '-05:00' }, // CDT
  arrowhead: { stadium: 'Arrowhead Stadium',        city: 'Kansas City, MO',     country: 'USA',    utcOffset: '-05:00' }, // CDT
  lumen:     { stadium: 'Lumen Field',              city: 'Seattle, WA',         country: 'USA',    utcOffset: '-07:00' }, // PDT
  lincoln:   { stadium: 'Lincoln Financial Field',  city: 'Philadelphia, PA',    country: 'USA',    utcOffset: '-04:00' }, // EDT
  mercedes:  { stadium: 'Mercedes-Benz Stadium',    city: 'Atlanta, GA',         country: 'USA',    utcOffset: '-04:00' }, // EDT
  levis:     { stadium: "Levi's Stadium",           city: 'Santa Clara, CA',     country: 'USA',    utcOffset: '-07:00' }, // PDT
  hardrock:  { stadium: 'Hard Rock Stadium',        city: 'Miami Gardens, FL',   country: 'USA',    utcOffset: '-04:00' }, // EDT
  gillette:  { stadium: 'Gillette Stadium',         city: 'Foxborough, MA',      country: 'USA',    utcOffset: '-04:00' }, // EDT
  nrg:       { stadium: 'NRG Stadium',              city: 'Houston, TX',         country: 'USA',    utcOffset: '-05:00' }, // CDT
  bc:        { stadium: 'BC Place',                 city: 'Vancouver, BC',       country: 'Canada', utcOffset: '-07:00' }, // PDT
  bmo:       { stadium: 'BMO Field',                city: 'Toronto, ON',         country: 'Canada', utcOffset: '-04:00' }, // EDT
  azteca:    { stadium: 'Estadio Azteca',           city: 'Mexico City',         country: 'Mexico', utcOffset: '-05:00' }, // CDT
  bbva:      { stadium: 'Estadio BBVA',             city: 'Monterrey',           country: 'Mexico', utcOffset: '-05:00' }, // CDT
  akron:     { stadium: 'Estadio Akron',            city: 'Guadalajara',         country: 'Mexico', utcOffset: '-05:00' }, // CDT
} as const;

// ─── 72 Group-Stage Fixtures ──────────────────────────────────────────────────

export const WC_FIXTURES: WCFixture[] = [
  { id: 'A1_Mexico_v_South_Africa', group: 'A', matchday: 1, home: 'Mexico', away: 'South Africa',
    date: '2026-06-11T19:00:00-05:00', stadium: V.azteca.stadium, city: V.azteca.city,
    country: 'Mexico', status: 'SCHEDULED' },
  { id: 'A1_South_Korea_v_Czech_Republic', group: 'A', matchday: 1, home: 'South Korea', away: 'Czech Republic',
    date: '2026-06-12T02:00:00-05:00', stadium: V.akron.stadium, city: V.akron.city,
    country: 'Mexico', status: 'SCHEDULED' },
  { id: 'B1_Canada_v_Bosnia_Herzegovina', group: 'B', matchday: 1, home: 'Canada', away: 'Bosnia & Herzegovina',
    date: '2026-06-12T19:00:00-04:00', stadium: V.bmo.stadium, city: V.bmo.city,
    country: 'Canada', status: 'SCHEDULED' },
  { id: 'C1_USA_v_Paraguay', group: 'C', matchday: 1, home: 'USA', away: 'Paraguay',
    date: '2026-06-13T01:00:00-07:00', stadium: V.sofi.stadium, city: V.sofi.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'B1_Qatar_v_Switzerland', group: 'B', matchday: 1, home: 'Qatar', away: 'Switzerland',
    date: '2026-06-13T19:00:00+00:00', stadium: 'TBD', city: 'TBD',
    country: 'USA', status: 'SCHEDULED' },
  { id: 'D1_Brazil_v_Morocco', group: 'D', matchday: 1, home: 'Brazil', away: 'Morocco',
    date: '2026-06-13T22:00:00-04:00', stadium: V.metlife.stadium, city: V.metlife.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'D1_Haiti_v_Scotland', group: 'D', matchday: 1, home: 'Haiti', away: 'Scotland',
    date: '2026-06-14T01:00:00-04:00', stadium: V.gillette.stadium, city: V.gillette.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'C1_Australia_v_T_rkiye', group: 'C', matchday: 1, home: 'Australia', away: 'Türkiye',
    date: '2026-06-14T04:00:00-07:00', stadium: V.bc.stadium, city: V.bc.city,
    country: 'Canada', status: 'SCHEDULED' },
  { id: 'E1_Germany_v_Cura_ao', group: 'E', matchday: 1, home: 'Germany', away: 'Curaçao',
    date: '2026-06-14T17:00:00-05:00', stadium: V.nrg.stadium, city: V.nrg.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'F1_Netherlands_v_Japan', group: 'F', matchday: 1, home: 'Netherlands', away: 'Japan',
    date: '2026-06-14T20:00:00+00:00', stadium: 'TBD', city: 'TBD',
    country: 'USA', status: 'SCHEDULED' },
  { id: 'E1_Ivory_Coast_v_Ecuador', group: 'E', matchday: 1, home: 'Ivory Coast', away: 'Ecuador',
    date: '2026-06-14T23:00:00-04:00', stadium: V.lincoln.stadium, city: V.lincoln.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'F1_Sweden_v_Tunisia', group: 'F', matchday: 1, home: 'Sweden', away: 'Tunisia',
    date: '2026-06-15T02:00:00-05:00', stadium: V.bbva.stadium, city: V.bbva.city,
    country: 'Mexico', status: 'SCHEDULED' },
  { id: 'G1_Spain_v_Cape_Verde_Islands', group: 'G', matchday: 1, home: 'Spain', away: 'Cape Verde Islands',
    date: '2026-06-15T16:00:00-04:00', stadium: V.mercedes.stadium, city: V.mercedes.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'H1_Belgium_v_Egypt', group: 'H', matchday: 1, home: 'Belgium', away: 'Egypt',
    date: '2026-06-15T19:00:00-07:00', stadium: V.lumen.stadium, city: V.lumen.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'G1_Saudi_Arabia_v_Uruguay', group: 'G', matchday: 1, home: 'Saudi Arabia', away: 'Uruguay',
    date: '2026-06-15T22:00:00-04:00', stadium: V.hardrock.stadium, city: V.hardrock.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'H1_Iran_v_New_Zealand', group: 'H', matchday: 1, home: 'Iran', away: 'New Zealand',
    date: '2026-06-16T01:00:00-07:00', stadium: V.sofi.stadium, city: V.sofi.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'I1_France_v_Senegal', group: 'I', matchday: 1, home: 'France', away: 'Senegal',
    date: '2026-06-16T19:00:00-04:00', stadium: V.metlife.stadium, city: V.metlife.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'I1_Iraq_v_Norway', group: 'I', matchday: 1, home: 'Iraq', away: 'Norway',
    date: '2026-06-16T22:00:00-04:00', stadium: V.gillette.stadium, city: V.gillette.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'J1_Argentina_v_Algeria', group: 'J', matchday: 1, home: 'Argentina', away: 'Algeria',
    date: '2026-06-17T01:00:00-05:00', stadium: V.arrowhead.stadium, city: V.arrowhead.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'J1_Austria_v_Jordan', group: 'J', matchday: 1, home: 'Austria', away: 'Jordan',
    date: '2026-06-17T04:00:00+00:00', stadium: 'TBD', city: 'TBD',
    country: 'USA', status: 'SCHEDULED' },
  { id: 'K1_Portugal_v_Congo_DR', group: 'K', matchday: 1, home: 'Portugal', away: 'Congo DR',
    date: '2026-06-17T17:00:00-05:00', stadium: V.nrg.stadium, city: V.nrg.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'L1_England_v_Croatia', group: 'L', matchday: 1, home: 'England', away: 'Croatia',
    date: '2026-06-17T20:00:00+00:00', stadium: 'TBD', city: 'TBD',
    country: 'USA', status: 'SCHEDULED' },
  { id: 'L1_Ghana_v_Panama', group: 'L', matchday: 1, home: 'Ghana', away: 'Panama',
    date: '2026-06-17T23:00:00-04:00', stadium: V.bmo.stadium, city: V.bmo.city,
    country: 'Canada', status: 'SCHEDULED' },
  { id: 'K1_Uzbekistan_v_Colombia', group: 'K', matchday: 1, home: 'Uzbekistan', away: 'Colombia',
    date: '2026-06-18T02:00:00-05:00', stadium: V.azteca.stadium, city: V.azteca.city,
    country: 'Mexico', status: 'SCHEDULED' },
  { id: 'A2_Czech_Republic_v_South_Africa', group: 'A', matchday: 2, home: 'Czech Republic', away: 'South Africa',
    date: '2026-06-18T16:00:00-04:00', stadium: V.mercedes.stadium, city: V.mercedes.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'B2_Switzerland_v_Bosnia_Herzegovina', group: 'B', matchday: 2, home: 'Switzerland', away: 'Bosnia & Herzegovina',
    date: '2026-06-18T19:00:00-07:00', stadium: V.sofi.stadium, city: V.sofi.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'B2_Canada_v_Qatar', group: 'B', matchday: 2, home: 'Canada', away: 'Qatar',
    date: '2026-06-18T22:00:00-07:00', stadium: V.bc.stadium, city: V.bc.city,
    country: 'Canada', status: 'SCHEDULED' },
  { id: 'A2_Mexico_v_South_Korea', group: 'A', matchday: 2, home: 'Mexico', away: 'South Korea',
    date: '2026-06-19T01:00:00-05:00', stadium: V.akron.stadium, city: V.akron.city,
    country: 'Mexico', status: 'SCHEDULED' },
  { id: 'C2_USA_v_Australia', group: 'C', matchday: 2, home: 'USA', away: 'Australia',
    date: '2026-06-19T19:00:00-07:00', stadium: V.lumen.stadium, city: V.lumen.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'D2_Scotland_v_Morocco', group: 'D', matchday: 2, home: 'Scotland', away: 'Morocco',
    date: '2026-06-19T22:00:00-04:00', stadium: V.gillette.stadium, city: V.gillette.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'D2_Brazil_v_Haiti', group: 'D', matchday: 2, home: 'Brazil', away: 'Haiti',
    date: '2026-06-20T00:30:00-04:00', stadium: V.lincoln.stadium, city: V.lincoln.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'C2_T_rkiye_v_Paraguay', group: 'C', matchday: 2, home: 'Türkiye', away: 'Paraguay',
    date: '2026-06-20T03:00:00+00:00', stadium: 'TBD', city: 'TBD',
    country: 'USA', status: 'SCHEDULED' },
  { id: 'F2_Netherlands_v_Sweden', group: 'F', matchday: 2, home: 'Netherlands', away: 'Sweden',
    date: '2026-06-20T17:00:00-05:00', stadium: V.nrg.stadium, city: V.nrg.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'E2_Germany_v_Ivory_Coast', group: 'E', matchday: 2, home: 'Germany', away: 'Ivory Coast',
    date: '2026-06-20T20:00:00-04:00', stadium: V.bmo.stadium, city: V.bmo.city,
    country: 'Canada', status: 'SCHEDULED' },
  { id: 'E2_Ecuador_v_Cura_ao', group: 'E', matchday: 2, home: 'Ecuador', away: 'Curaçao',
    date: '2026-06-21T00:00:00-05:00', stadium: V.arrowhead.stadium, city: V.arrowhead.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'F2_Tunisia_v_Japan', group: 'F', matchday: 2, home: 'Tunisia', away: 'Japan',
    date: '2026-06-21T04:00:00-05:00', stadium: V.bbva.stadium, city: V.bbva.city,
    country: 'Mexico', status: 'SCHEDULED' },
  { id: 'G2_Spain_v_Saudi_Arabia', group: 'G', matchday: 2, home: 'Spain', away: 'Saudi Arabia',
    date: '2026-06-21T16:00:00-04:00', stadium: V.mercedes.stadium, city: V.mercedes.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'H2_Belgium_v_Iran', group: 'H', matchday: 2, home: 'Belgium', away: 'Iran',
    date: '2026-06-21T19:00:00-07:00', stadium: V.sofi.stadium, city: V.sofi.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'G2_Uruguay_v_Cape_Verde_Islands', group: 'G', matchday: 2, home: 'Uruguay', away: 'Cape Verde Islands',
    date: '2026-06-21T22:00:00-04:00', stadium: V.hardrock.stadium, city: V.hardrock.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'H2_New_Zealand_v_Egypt', group: 'H', matchday: 2, home: 'New Zealand', away: 'Egypt',
    date: '2026-06-22T01:00:00-07:00', stadium: V.bc.stadium, city: V.bc.city,
    country: 'Canada', status: 'SCHEDULED' },
  { id: 'J2_Argentina_v_Austria', group: 'J', matchday: 2, home: 'Argentina', away: 'Austria',
    date: '2026-06-22T17:00:00+00:00', stadium: 'TBD', city: 'TBD',
    country: 'USA', status: 'SCHEDULED' },
  { id: 'I2_France_v_Iraq', group: 'I', matchday: 2, home: 'France', away: 'Iraq',
    date: '2026-06-22T21:00:00-04:00', stadium: V.lincoln.stadium, city: V.lincoln.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'I2_Norway_v_Senegal', group: 'I', matchday: 2, home: 'Norway', away: 'Senegal',
    date: '2026-06-23T00:00:00-04:00', stadium: V.metlife.stadium, city: V.metlife.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'J2_Jordan_v_Algeria', group: 'J', matchday: 2, home: 'Jordan', away: 'Algeria',
    date: '2026-06-23T03:00:00+00:00', stadium: 'TBD', city: 'TBD',
    country: 'USA', status: 'SCHEDULED' },
  { id: 'K2_Portugal_v_Uzbekistan', group: 'K', matchday: 2, home: 'Portugal', away: 'Uzbekistan',
    date: '2026-06-23T17:00:00-05:00', stadium: V.nrg.stadium, city: V.nrg.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'L2_England_v_Ghana', group: 'L', matchday: 2, home: 'England', away: 'Ghana',
    date: '2026-06-23T20:00:00-04:00', stadium: V.gillette.stadium, city: V.gillette.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'L2_Panama_v_Croatia', group: 'L', matchday: 2, home: 'Panama', away: 'Croatia',
    date: '2026-06-23T23:00:00-04:00', stadium: V.bmo.stadium, city: V.bmo.city,
    country: 'Canada', status: 'SCHEDULED' },
  { id: 'K2_Colombia_v_Congo_DR', group: 'K', matchday: 2, home: 'Colombia', away: 'Congo DR',
    date: '2026-06-24T02:00:00-05:00', stadium: V.akron.stadium, city: V.akron.city,
    country: 'Mexico', status: 'SCHEDULED' },
  { id: 'B3_Switzerland_v_Canada', group: 'B', matchday: 3, home: 'Switzerland', away: 'Canada',
    date: '2026-06-24T19:00:00-07:00', stadium: V.bc.stadium, city: V.bc.city,
    country: 'Canada', status: 'SCHEDULED' },
  { id: 'B3_Bosnia_Herzegovina_v_Qatar', group: 'B', matchday: 3, home: 'Bosnia & Herzegovina', away: 'Qatar',
    date: '2026-06-24T19:00:00-07:00', stadium: V.lumen.stadium, city: V.lumen.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'D3_Morocco_v_Haiti', group: 'D', matchday: 3, home: 'Morocco', away: 'Haiti',
    date: '2026-06-24T22:00:00-04:00', stadium: V.mercedes.stadium, city: V.mercedes.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'D3_Scotland_v_Brazil', group: 'D', matchday: 3, home: 'Scotland', away: 'Brazil',
    date: '2026-06-24T22:00:00-04:00', stadium: V.hardrock.stadium, city: V.hardrock.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'A3_Czech_Republic_v_Mexico', group: 'A', matchday: 3, home: 'Czech Republic', away: 'Mexico',
    date: '2026-06-25T01:00:00-05:00', stadium: V.azteca.stadium, city: V.azteca.city,
    country: 'Mexico', status: 'SCHEDULED' },
  { id: 'A3_South_Africa_v_South_Korea', group: 'A', matchday: 3, home: 'South Africa', away: 'South Korea',
    date: '2026-06-25T01:00:00-05:00', stadium: V.bbva.stadium, city: V.bbva.city,
    country: 'Mexico', status: 'SCHEDULED' },
  { id: 'E3_Ecuador_v_Germany', group: 'E', matchday: 3, home: 'Ecuador', away: 'Germany',
    date: '2026-06-25T20:00:00-04:00', stadium: V.metlife.stadium, city: V.metlife.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'E3_Cura_ao_v_Ivory_Coast', group: 'E', matchday: 3, home: 'Curaçao', away: 'Ivory Coast',
    date: '2026-06-25T20:00:00-04:00', stadium: V.lincoln.stadium, city: V.lincoln.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'F3_Japan_v_Sweden', group: 'F', matchday: 3, home: 'Japan', away: 'Sweden',
    date: '2026-06-25T23:00:00+00:00', stadium: 'TBD', city: 'TBD',
    country: 'USA', status: 'SCHEDULED' },
  { id: 'F3_Tunisia_v_Netherlands', group: 'F', matchday: 3, home: 'Tunisia', away: 'Netherlands',
    date: '2026-06-25T23:00:00-05:00', stadium: V.arrowhead.stadium, city: V.arrowhead.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'C3_T_rkiye_v_USA', group: 'C', matchday: 3, home: 'Türkiye', away: 'USA',
    date: '2026-06-26T02:00:00-07:00', stadium: V.sofi.stadium, city: V.sofi.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'C3_Paraguay_v_Australia', group: 'C', matchday: 3, home: 'Paraguay', away: 'Australia',
    date: '2026-06-26T02:00:00+00:00', stadium: 'TBD', city: 'TBD',
    country: 'USA', status: 'SCHEDULED' },
  { id: 'I3_Senegal_v_Iraq', group: 'I', matchday: 3, home: 'Senegal', away: 'Iraq',
    date: '2026-06-26T19:00:00-04:00', stadium: V.bmo.stadium, city: V.bmo.city,
    country: 'Canada', status: 'SCHEDULED' },
  { id: 'I3_Norway_v_France', group: 'I', matchday: 3, home: 'Norway', away: 'France',
    date: '2026-06-26T19:00:00-04:00', stadium: V.gillette.stadium, city: V.gillette.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'G3_Uruguay_v_Spain', group: 'G', matchday: 3, home: 'Uruguay', away: 'Spain',
    date: '2026-06-27T00:00:00-05:00', stadium: V.akron.stadium, city: V.akron.city,
    country: 'Mexico', status: 'SCHEDULED' },
  { id: 'G3_Cape_Verde_Islands_v_Saudi_Arabia', group: 'G', matchday: 3, home: 'Cape Verde Islands', away: 'Saudi Arabia',
    date: '2026-06-27T00:00:00-05:00', stadium: V.nrg.stadium, city: V.nrg.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'H3_Egypt_v_Iran', group: 'H', matchday: 3, home: 'Egypt', away: 'Iran',
    date: '2026-06-27T03:00:00-07:00', stadium: V.lumen.stadium, city: V.lumen.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'H3_New_Zealand_v_Belgium', group: 'H', matchday: 3, home: 'New Zealand', away: 'Belgium',
    date: '2026-06-27T03:00:00-07:00', stadium: V.bc.stadium, city: V.bc.city,
    country: 'Canada', status: 'SCHEDULED' },
  { id: 'L3_Croatia_v_Ghana', group: 'L', matchday: 3, home: 'Croatia', away: 'Ghana',
    date: '2026-06-27T21:00:00-04:00', stadium: V.lincoln.stadium, city: V.lincoln.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'L3_Panama_v_England', group: 'L', matchday: 3, home: 'Panama', away: 'England',
    date: '2026-06-27T21:00:00-04:00', stadium: V.metlife.stadium, city: V.metlife.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'K3_Colombia_v_Portugal', group: 'K', matchday: 3, home: 'Colombia', away: 'Portugal',
    date: '2026-06-27T23:30:00-04:00', stadium: V.hardrock.stadium, city: V.hardrock.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'K3_Congo_DR_v_Uzbekistan', group: 'K', matchday: 3, home: 'Congo DR', away: 'Uzbekistan',
    date: '2026-06-27T23:30:00-04:00', stadium: V.mercedes.stadium, city: V.mercedes.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'J3_Algeria_v_Austria', group: 'J', matchday: 3, home: 'Algeria', away: 'Austria',
    date: '2026-06-28T02:00:00-05:00', stadium: V.arrowhead.stadium, city: V.arrowhead.city,
    country: 'USA', status: 'SCHEDULED' },
  { id: 'J3_Jordan_v_Argentina', group: 'J', matchday: 3, home: 'Jordan', away: 'Argentina',
    date: '2026-06-28T02:00:00+00:00', stadium: 'TBD', city: 'TBD',
    country: 'USA', status: 'SCHEDULED' },
];

// ─── Query helpers ─────────────────────────────────────────────────────────────

export function getTeam(name: string): WCTeam | undefined {
  return WC_TEAMS.find((t) => t.name === name);
}

export function getGroupTeams(group: string): WCTeam[] {
  return WC_TEAMS.filter((t) => t.group === group);
}

export function getTeamFixtures(teamName: string): WCFixture[] {
  return WC_FIXTURES
    .filter((f) => f.home === teamName || f.away === teamName)
    .sort((a, b) => a.matchday - b.matchday);
}

export function getOpponent(fixture: WCFixture, teamName: string): string {
  return fixture.home === teamName ? fixture.away : fixture.home;
}

export function isHomeTeam(fixture: WCFixture, teamName: string): boolean {
  return fixture.home === teamName;
}
