// Players / World Cup intelligence model — "which players are driving this
// World Cup?" Pure + offline: built from committed data only.
//   goals/cards  → lib/matchEventsData (MATCH_EVENTS)
//   clean sheets → derived: GK in lib/lineupData + team conceded 0 in results
//   enrichment   → lib/playerProfilesData (Lili-curated)
// NOT modelled here (no data): assists, recoveries, saves, numeric ratings.

import { MATCH_EVENTS } from './matchEventsData';
import { MATCH_LINEUPS, type LineupPlayer } from './lineupData';
import { PLAYER_PROFILES } from './playerProfilesData';
import { FIXTURE_RESULTS, type FixtureResult } from './fixtureResultsData';
import { WC_FIXTURES, WC_TEAMS } from './wcData';

const flagOf = (team: string) => WC_TEAMS.find((t) => t.name === team)?.flag ?? '🏳';
const profileOf = (name: string) => PLAYER_PROFILES.find((p) => p.name === name);
// last name, lowercased & de-accented — lets event names ("Julián Quiñones")
// match abbreviated lineup names ("J. Quiñones") across feeds.
const surname = (n: string) =>
  n.trim().split(/\s+/).pop()!.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export interface ScorerRow { name: string; team: string; flag: string; goals: number; club?: string; age?: number; league?: string }
export interface GkRow { name: string; team: string; flag: string; cleanSheets: number }
export interface ImpactRow {
  name: string; team: string; flag: string;
  goals: number; cleanSheets: number; yellows: number; reds: number;
  impact: number; club?: string; age?: number;
}
export interface XIPlayer { name: string; pos: LineupPlayer['pos']; number: number; team: string; goals: number; impact: number }
export type MatchHero = { name: string; team: string; flag: string; pos?: string; goals: number; cleanSheet: boolean } | null;

export interface PlayerLeaders {
  topScorers: ScorerRow[];
  goalkeepers: GkRow[];
  impact: ImpactRow[];
  spotlight: { row: ImpactRow; reason: string } | null;
}

// Impact: goals dominate, clean sheets reward keepers, discipline costs. Capped.
const IMPACT = (goals: number, cs: number, yellows: number, reds: number) =>
  Math.max(0, Math.min(99, goals * 18 + cs * 14 - yellows * 2 - reds * 8));

const gkOf = (players: LineupPlayer[]): LineupPlayer | undefined =>
  players.find((p) => p.pos === 'GK' && p.starter) ?? players.find((p) => p.pos === 'GK');

function lineupFor(fixtureKey: string) {
  return MATCH_LINEUPS.find((l) => l.fixtureKey === fixtureKey);
}

export function computePlayerLeaders(results: Record<string, FixtureResult> = FIXTURE_RESULTS): PlayerLeaders {
  // ── goals & cards per player ──────────────────────────────────────────────
  const goals = new Map<string, { name: string; team: string; goals: number }>();
  const yellow = new Map<string, number>();
  const red = new Map<string, number>();
  for (const e of MATCH_EVENTS) {
    for (const g of e.goals) {
      if (g.type === 'own-goal') continue;            // own goals don't credit the scorer
      const k = `${g.player}|${g.team}`;
      const cur = goals.get(k) ?? { name: g.player, team: g.team, goals: 0 };
      cur.goals++; goals.set(k, cur);
    }
    for (const c of e.yellowCards) yellow.set(`${c.player}|${c.team}`, (yellow.get(`${c.player}|${c.team}`) ?? 0) + 1);
    for (const c of e.redCards)    red.set(`${c.player}|${c.team}`,    (red.get(`${c.player}|${c.team}`) ?? 0) + 1);
  }

  // ── clean sheets: GK of the side that conceded 0 in a finished match ───────
  const clean = new Map<string, { name: string; team: string; cleanSheets: number }>();
  for (const f of WC_FIXTURES) {
    const r = results[`${f.home}|${f.away}`];
    if (!r || r.status !== 'FINISHED' || r.homeScore == null || r.awayScore == null) continue;
    const lu = lineupFor(`${f.home}|${f.away}`);
    if (!lu) continue;
    const award = (side: 'home' | 'away', team: string) => {
      const gk = gkOf(lu[side].players);
      if (!gk) return;
      const k = `${gk.name}|${team}`;
      const cur = clean.get(k) ?? { name: gk.name, team, cleanSheets: 0 };
      cur.cleanSheets++; clean.set(k, cur);
    };
    if (r.awayScore === 0) award('home', f.home);
    if (r.homeScore === 0) award('away', f.away);
  }

  // ── leaderboards ──────────────────────────────────────────────────────────
  const topScorers: ScorerRow[] = [...goals.values()]
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
    .map((g) => { const p = profileOf(g.name); return { name: g.name, team: g.team, flag: flagOf(g.team), goals: g.goals, club: p?.club, age: p?.age, league: p?.league }; });

  const goalkeepers: GkRow[] = [...clean.values()]
    .sort((a, b) => b.cleanSheets - a.cleanSheets || a.name.localeCompare(b.name))
    .map((g) => ({ name: g.name, team: g.team, flag: flagOf(g.team), cleanSheets: g.cleanSheets }));

  // ── impact board: union of scorers + keepers ──────────────────────────────
  const keys = new Set<string>([...goals.keys(), ...clean.keys()]);
  const impact: ImpactRow[] = [...keys].map((k) => {
    const [name, team] = k.split('|');
    const g = goals.get(k)?.goals ?? 0;
    const cs = clean.get(k)?.cleanSheets ?? 0;
    const y = yellow.get(k) ?? 0;
    const rd = red.get(k) ?? 0;
    const p = profileOf(name);
    return { name, team, flag: flagOf(team), goals: g, cleanSheets: cs, yellows: y, reds: rd, impact: IMPACT(g, cs, y, rd), club: p?.club, age: p?.age };
  }).sort((a, b) => b.impact - a.impact || b.goals - a.goals || a.name.localeCompare(b.name));

  let spotlight: PlayerLeaders['spotlight'] = null;
  if (impact.length) {
    const r = impact[0];
    const bits: string[] = [];
    if (r.goals) bits.push(`${r.goals} goal${r.goals > 1 ? 's' : ''}`);
    if (r.cleanSheets) bits.push(`${r.cleanSheets} clean sheet${r.cleanSheets > 1 ? 's' : ''}`);
    const contrib = bits.length ? bits.join(' and ') : 'consistent involvement';
    spotlight = { row: r, reason: `${r.name} has contributed ${contrib} — one of the most influential players in the tournament so far.` };
  }

  return { topScorers, goalkeepers, impact, spotlight };
}

// ── Match-specific (selected fixture) ────────────────────────────────────────
export function matchHero(fixtureId: string, results: Record<string, FixtureResult> = FIXTURE_RESULTS): MatchHero {
  const f = WC_FIXTURES.find((x) => x.id === fixtureId);
  if (!f) return null;
  const ev = MATCH_EVENTS.find((e) => e.fixtureId === fixtureId);
  const r = results[`${f.home}|${f.away}`];

  // top scorer in this match
  const tally = new Map<string, { name: string; team: string; goals: number }>();
  for (const g of ev?.goals ?? []) {
    if (g.type === 'own-goal') continue;
    const cur = tally.get(g.player) ?? { name: g.player, team: g.team, goals: 0 };
    cur.goals++; tally.set(g.player, cur);
  }
  const top = [...tally.values()].sort((a, b) => b.goals - a.goals)[0];
  const lu = lineupFor(`${f.home}|${f.away}`);
  const posOf = (name: string, team: string) => {
    const side = team === f.home ? 'home' : 'away';
    return lu?.[side].players.find((p) => p.name === name || surname(p.name) === surname(name))?.pos;
  };

  if (top) return { name: top.name, team: top.team, flag: flagOf(top.team), pos: posOf(top.name, top.team), goals: top.goals, cleanSheet: false };

  // no scorer (0-0): a keeper who kept a clean sheet
  if (r && lu && r.homeScore === 0 && r.awayScore === 0) {
    const gk = gkOf(lu.home.players);
    if (gk) return { name: gk.name, team: f.home, flag: flagOf(f.home), pos: 'GK', goals: 0, cleanSheet: true };
  }
  return null;
}

export function startingXI(fixtureId: string): { home: XIPlayer[]; away: XIPlayer[]; homeTeam: string; awayTeam: string } | null {
  const f = WC_FIXTURES.find((x) => x.id === fixtureId);
  if (!f) return null;
  const lu = lineupFor(`${f.home}|${f.away}`);
  const ev = MATCH_EVENTS.find((e) => e.fixtureId === fixtureId);
  const goalsBySurname = new Map<string, number>();
  for (const g of ev?.goals ?? []) if (g.type !== 'own-goal') goalsBySurname.set(surname(g.player), (goalsBySurname.get(surname(g.player)) ?? 0) + 1);

  const build = (players: LineupPlayer[], team: string): XIPlayer[] =>
    players.filter((p) => p.starter).map((p) => {
      const g = goalsBySurname.get(surname(p.name)) ?? 0;
      return { name: p.name, pos: p.pos, number: p.number, team, goals: g, impact: g * 18 };
    });

  if (!lu || (!lu.home.players.length && !lu.away.players.length)) return null;
  return { home: build(lu.home.players, f.home), away: build(lu.away.players, f.away), homeTeam: f.home, awayTeam: f.away };
}
