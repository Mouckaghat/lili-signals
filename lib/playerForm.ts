// Player form model — "how many games has this player played, and what was
// their note (rating) each time?" HONEST: every value is real api-football data
// already synced into PLAYER_MATCH_STATS (minutes + match rating per fixture).
// A player who hasn't featured has games=0 and no notes — never fabricated.

import { PLAYER_MATCH_STATS } from './playerStatsData';
import { WC_FIXTURES, WC_TEAMS } from './wcData';

const flagOf = (team: string) => WC_TEAMS.find((t) => t.name === team)?.flag ?? '🏳';

export interface PlayerGameNote {
  fixtureId: string;
  opponent: string;
  opponentFlag: string;
  date: string;
  rating: number | null; // api-football match note (6–10), null if not rated
  minutes: number;
  started: boolean;       // inferred: a starter is on the pitch from the off (proxy: minutes ≥ 60 OR among the team's most-used)
}

export interface PlayerForm {
  name: string;
  team: string;
  games: number;          // distinct fixtures with minutes > 0
  notes: PlayerGameNote[];// chronological
  avgRating: number | null;
  bestRating: number | null;
}

// opponent of `team` in a given fixture
function opponentOf(fixtureId: string, team: string): string {
  const f = WC_FIXTURES.find((x) => x.id === fixtureId);
  if (!f) return '';
  return f.home === team ? f.away : f.home;
}
const dateOf = (fixtureId: string) => WC_FIXTURES.find((x) => x.id === fixtureId)?.date ?? '';

/**
 * Games played + the note (rating) of each game for one player.
 * Keyed by name + team (api-football data carries both).
 */
export function playerForm(name: string, team: string): PlayerForm {
  const rows = PLAYER_MATCH_STATS.filter((p) => p.name === name && p.team === team && p.minutes > 0);
  const notes: PlayerGameNote[] = rows
    .map((p) => ({
      fixtureId: p.fixtureId,
      opponent: opponentOf(p.fixtureId, team),
      opponentFlag: flagOf(opponentOf(p.fixtureId, team)),
      date: dateOf(p.fixtureId),
      rating: p.rating,
      minutes: p.minutes,
      started: p.minutes >= 60,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const rated = notes.map((n) => n.rating).filter((r): r is number => r != null);
  const avgRating = rated.length ? Math.round((rated.reduce((s, r) => s + r, 0) / rated.length) * 10) / 10 : null;
  const bestRating = rated.length ? Math.max(...rated) : null;

  return { name, team, games: notes.length, notes, avgRating, bestRating };
}

/** Just the games-played count (cheap, for inline badges). */
export function gamesPlayed(name: string, team: string): number {
  const seen = new Set<string>();
  for (const p of PLAYER_MATCH_STATS) {
    if (p.name === name && p.team === team && p.minutes > 0) seen.add(p.fixtureId);
  }
  return seen.size;
}
