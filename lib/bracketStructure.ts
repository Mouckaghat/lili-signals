// The official, FIXED 2026 World Cup knockout bracket tree.
//
// WHY THIS IS CURATED (not from the feed): api-football only carries the 16
// Round-of-32 ties — it has NO R16/QF/SF/F fixtures and NO bracket linkage
// ("winner of match X plays winner of match Y"). That structure is published and
// fixed by FIFA, so it's REAL sourced data (like lib/stadiumData), not a
// projection. Sourced 2026-06-29 from Wikipedia "2026 FIFA World Cup knockout
// stage" + kickoffadventures.com, cross-checked. Official match numbers 73–104.
//
// The live R32 teams + results still come from WC_KNOCKOUT / the results overlay;
// this file only supplies the *tree* (which match feeds which slot + venue/date),
// which we fill progressively as teams win.

import type { KnockoutRound } from './knockoutData';

// Round-of-32 match number → the two teams (canonical app names), so each live
// WC_KNOCKOUT tie maps to its official match number by unordered team pair.
export const R32_TEAMS_BY_MATCH: Record<number, [string, string]> = {
  73: ['South Africa', 'Canada'],
  74: ['Germany', 'Paraguay'],
  75: ['Netherlands', 'Morocco'],
  76: ['Brazil', 'Japan'],
  77: ['France', 'Sweden'],
  78: ['Ivory Coast', 'Norway'],
  79: ['Mexico', 'Ecuador'],
  80: ['England', 'Congo DR'],
  81: ['USA', 'Bosnia & Herzegovina'],
  82: ['Belgium', 'Senegal'],
  83: ['Portugal', 'Croatia'],
  84: ['Spain', 'Austria'],
  85: ['Switzerland', 'Algeria'],
  86: ['Argentina', 'Cape Verde Islands'],
  87: ['Colombia', 'Ghana'],
  88: ['Australia', 'Egypt'],
};

export interface BracketSlot {
  match: number;            // official match number
  round: KnockoutRound;     // R16 | QF | SF | '3RD' | F
  feeds: [number, number];  // winners of these two matches meet here…
  thirdPlace?: boolean;     // …except the 3rd-place play-off, which uses the LOSERS
  date: string;             // ISO 8601 kickoff (curated from the official schedule, UTC)
  stadiumId: string;        // lib/stadiumData id
}

// R16 (89–96) → QF (97–100) → SF (101–102) → 3rd-place (103) + Final (104).
// `feeds` reference the match numbers whose winners (or losers, for 3rd place) meet.
export const BRACKET_SLOTS: BracketSlot[] = [
  // ── Round of 16 ──
  { match: 89, round: 'R16', feeds: [74, 77], date: '2026-07-04T21:00:00+00:00', stadiumId: 'lincoln' },
  { match: 90, round: 'R16', feeds: [73, 75], date: '2026-07-04T17:00:00+00:00', stadiumId: 'nrg' },
  { match: 91, round: 'R16', feeds: [76, 78], date: '2026-07-05T20:00:00+00:00', stadiumId: 'metlife' },
  { match: 92, round: 'R16', feeds: [79, 80], date: '2026-07-06T00:00:00+00:00', stadiumId: 'azteca' },
  { match: 93, round: 'R16', feeds: [83, 84], date: '2026-07-06T19:00:00+00:00', stadiumId: 'att' },
  { match: 94, round: 'R16', feeds: [81, 82], date: '2026-07-07T00:00:00+00:00', stadiumId: 'lumen' },
  { match: 95, round: 'R16', feeds: [86, 88], date: '2026-07-07T16:00:00+00:00', stadiumId: 'mercedes' },
  { match: 96, round: 'R16', feeds: [85, 87], date: '2026-07-07T20:00:00+00:00', stadiumId: 'bc' },
  // ── Quarter-finals ──
  { match: 97,  round: 'QF', feeds: [89, 90], date: '2026-07-09T20:00:00+00:00', stadiumId: 'gillette' },
  { match: 98,  round: 'QF', feeds: [93, 94], date: '2026-07-10T19:00:00+00:00', stadiumId: 'sofi' },
  { match: 99,  round: 'QF', feeds: [91, 92], date: '2026-07-11T21:00:00+00:00', stadiumId: 'hardrock' },
  { match: 100, round: 'QF', feeds: [95, 96], date: '2026-07-12T01:00:00+00:00', stadiumId: 'arrowhead' },
  // ── Semi-finals ──
  { match: 101, round: 'SF', feeds: [97, 98],  date: '2026-07-14T19:00:00+00:00', stadiumId: 'att' },
  { match: 102, round: 'SF', feeds: [99, 100], date: '2026-07-15T19:00:00+00:00', stadiumId: 'mercedes' },
  // ── 3rd-place play-off (losers of the semis) ──
  { match: 103, round: '3RD', feeds: [101, 102], thirdPlace: true, date: '2026-07-18T19:00:00+00:00', stadiumId: 'hardrock' },
  // ── Final ──
  { match: 104, round: 'F', feeds: [101, 102], date: '2026-07-19T19:00:00+00:00', stadiumId: 'metlife' },
];

// Quick lookups.
export const SLOT_BY_MATCH = new Map<number, BracketSlot>(BRACKET_SLOTS.map((s) => [s.match, s]));

// For a given match number, which slot does its WINNER advance into? (null = Final
// has no onward slot; the 3rd-place play-off is a side branch, never "advance to".)
export function nextSlotForWinner(match: number): BracketSlot | null {
  for (const s of BRACKET_SLOTS) {
    if (s.thirdPlace) continue;            // winners never go to the 3rd-place game
    if (s.feeds.includes(match)) return s;
  }
  return null;
}

// Map an unordered team pair to its R32 match number (or null if not an R32 tie).
const R32_MATCH_BY_PAIR = new Map<string, number>(
  Object.entries(R32_TEAMS_BY_MATCH).map(([m, [a, b]]) => [[a, b].sort().join('|'), Number(m)]),
);
export function r32MatchOf(home: string, away: string): number | null {
  return R32_MATCH_BY_PAIR.get([home, away].sort().join('|')) ?? null;
}
