// Players / World Cup intelligence model — "which players are driving this
// World Cup?" Pure + offline: built from committed data only.
//   goals/cards  → lib/matchEventsData (curated, canonical for goals)
//   per-player   → lib/playerStatsData (assists, saves, rating, shots, tackles…)
//   clean sheets → derived: GK in lib/lineupData + team conceded 0 in results
//   enrichment   → lib/playerProfilesData (club/age)
// Players are keyed by surname+team to reconcile the three feeds' name formats.

import { MATCH_EVENTS } from './matchEventsData';
import { MATCH_LINEUPS, type LineupPlayer } from './lineupData';
import { PLAYER_MATCH_STATS, type PlayerMatchStat } from './playerStatsData';
import { PLAYER_PROFILES } from './playerProfilesData';
import { FIXTURE_RESULTS, type FixtureResult } from './fixtureResultsData';
import { WC_FIXTURES, WC_TEAMS } from './wcData';
import { HEATMAP_I18N, hmT, type HeatmapI18n } from './heatmapI18n';

const flagOf = (team: string) => WC_TEAMS.find((t) => t.name === team)?.flag ?? '🏳';
const profileOf = (name: string) => PLAYER_PROFILES.find((p) => p.name === name);
const surname = (n: string) =>
  n.trim().split(/\s+/).pop()!.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
const keyOf = (name: string, team: string) => `${surname(name)}|${team}`;

export interface ScorerRow { name: string; team: string; flag: string; goals: number; club?: string; age?: number }
export interface AssistRow { name: string; team: string; flag: string; assists: number; club?: string }
export interface DefenderRow { name: string; team: string; flag: string; actions: number; tackles: number; interceptions: number }
export interface GkRow { name: string; team: string; flag: string; cleanSheets: number; saves: number }
export interface ImpactRow {
  name: string; team: string; flag: string;
  goals: number; assists: number; cleanSheets: number; saves: number; yellows: number; reds: number;
  impact: number; club?: string; age?: number;
}
export type MatchHero = {
  name: string; team: string; flag: string; pos?: string;
  goals: number; assists: number; shots: number; passAccPct: number; rating: number | null; cleanSheet: boolean;
} | null;
export interface XIPlayer { name: string; pos: LineupPlayer['pos']; number: number; team: string; goals: number; assists: number; rating: number | null; influence: number }

export interface PlayerLeaders {
  topScorers: ScorerRow[];
  topAssists: AssistRow[];
  defenders: DefenderRow[];
  goalkeepers: GkRow[];
  impact: ImpactRow[];
  spotlight: { row: ImpactRow; reason: string } | null;
}

const IMPACT = (goals: number, assists: number, cs: number, saves: number, y: number, r: number) =>
  Math.max(0, Math.min(99, goals * 16 + assists * 9 + cs * 14 + saves * 1 - y * 2 - r * 8));

// ── per-match stat index ───────────────────────────────────────────────────────
const statsByFixture = new Map<string, PlayerMatchStat[]>();
for (const r of PLAYER_MATCH_STATS) {
  const arr = statsByFixture.get(r.fixtureId) ?? [];
  arr.push(r); statsByFixture.set(r.fixtureId, arr);
}
function fxStat(fixtureId: string, name: string, team: string, livePlayers?: PlayerMatchStat[]): PlayerMatchStat | undefined {
  const rows = livePlayers ? livePlayers.filter((r) => r.fixtureId === fixtureId) : statsByFixture.get(fixtureId);
  if (!rows) return undefined;
  return rows.find((r) => r.team === team && (r.name === name || surname(r.name) === surname(name)));
}

const gkOf = (players: LineupPlayer[]) => players.find((p) => p.pos === 'GK' && p.starter) ?? players.find((p) => p.pos === 'GK');
const lineupFor = (key: string) => MATCH_LINEUPS.find((l) => l.fixtureKey === key);

interface Acc {
  name: string; team: string;
  goals: number; assists: number; cleanSheets: number; saves: number;
  yellows: number; reds: number; tackles: number; interceptions: number;
}

export function computePlayerLeaders(results: Record<string, FixtureResult> = FIXTURE_RESULTS, L: HeatmapI18n = HEATMAP_I18N.EN): PlayerLeaders {
  const map = new Map<string, Acc>();
  const get = (name: string, team: string): Acc => {
    const k = keyOf(name, team);
    let a = map.get(k);
    if (!a) { a = { name, team, goals: 0, assists: 0, cleanSheets: 0, saves: 0, yellows: 0, reds: 0, tackles: 0, interceptions: 0 }; map.set(k, a); }
    // prefer the most complete display name across feeds
    if (name.length > a.name.length) a.name = name;
    return a;
  };

  // goals & cards (curated events are canonical for goals)
  for (const e of MATCH_EVENTS) {
    for (const g of e.goals) if (g.type !== 'own-goal') get(g.player, g.team).goals++;
    for (const c of e.yellowCards) get(c.player, c.team).yellows++;
    for (const c of e.redCards) get(c.player, c.team).reds++;
  }

  // per-player stats (assists, saves, defensive)
  for (const r of PLAYER_MATCH_STATS) {
    const a = get(r.name, r.team);
    a.assists += r.assists; a.saves += r.saves;
    a.tackles += r.tackles; a.interceptions += r.interceptions;
  }

  // clean sheets: GK of the side that conceded 0
  for (const f of WC_FIXTURES) {
    const r = results[`${f.home}|${f.away}`];
    if (!r || r.status !== 'FINISHED' || r.homeScore == null || r.awayScore == null) continue;
    const lu = lineupFor(`${f.home}|${f.away}`);
    if (!lu) continue;
    if (r.awayScore === 0) { const gk = gkOf(lu.home.players); if (gk) get(gk.name, f.home).cleanSheets++; }
    if (r.homeScore === 0) { const gk = gkOf(lu.away.players); if (gk) get(gk.name, f.away).cleanSheets++; }
  }

  const all = [...map.values()];
  const enrich = (a: Acc) => { const p = profileOf(a.name); return { club: p?.club, age: p?.age }; };

  const topScorers: ScorerRow[] = all.filter((a) => a.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
    .map((a) => ({ name: a.name, team: a.team, flag: flagOf(a.team), goals: a.goals, ...enrich(a) }));

  const topAssists: AssistRow[] = all.filter((a) => a.assists > 0)
    .sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name))
    .map((a) => ({ name: a.name, team: a.team, flag: flagOf(a.team), assists: a.assists, club: profileOf(a.name)?.club }));

  const defenders: DefenderRow[] = all.map((a) => ({ ...a, actions: a.tackles + a.interceptions }))
    .filter((a) => a.actions > 0)
    .sort((a, b) => b.actions - a.actions || a.name.localeCompare(b.name))
    .slice(0, 8)
    .map((a) => ({ name: a.name, team: a.team, flag: flagOf(a.team), actions: a.actions, tackles: a.tackles, interceptions: a.interceptions }));

  const goalkeepers: GkRow[] = all.filter((a) => a.cleanSheets > 0 || a.saves > 0)
    .sort((a, b) => b.cleanSheets - a.cleanSheets || b.saves - a.saves)
    .map((a) => ({ name: a.name, team: a.team, flag: flagOf(a.team), cleanSheets: a.cleanSheets, saves: a.saves }));

  const impact: ImpactRow[] = all
    .map((a) => ({ name: a.name, team: a.team, flag: flagOf(a.team), goals: a.goals, assists: a.assists, cleanSheets: a.cleanSheets, saves: a.saves, yellows: a.yellows, reds: a.reds, impact: IMPACT(a.goals, a.assists, a.cleanSheets, a.saves, a.yellows, a.reds), ...enrich(a) }))
    .filter((r) => r.impact > 0)
    .sort((a, b) => b.impact - a.impact || b.goals - a.goals || a.name.localeCompare(b.name));

  let spotlight: PlayerLeaders['spotlight'] = null;
  if (impact.length) {
    const r = impact[0];
    const bits: string[] = [];
    if (r.goals) bits.push(hmT(L.plGoals, { n: r.goals }));
    if (r.assists) bits.push(hmT(L.plAssists, { n: r.assists }));
    if (r.cleanSheets) bits.push(hmT(L.plCleanSheets, { n: r.cleanSheets }));
    const contrib = bits.length ? bits.join(', ') : L.plConsistent;
    spotlight = { row: r, reason: hmT(L.plSpotlight, { name: r.name, contrib }) };
  }

  return { topScorers, topAssists, defenders, goalkeepers, impact, spotlight };
}

// ── Match Hero: highest-rated player of the selected match ───────────────────────
export function matchHero(fixtureId: string, results: Record<string, FixtureResult> = FIXTURE_RESULTS, livePlayers?: PlayerMatchStat[]): MatchHero {
  const f = WC_FIXTURES.find((x) => x.id === fixtureId);
  if (!f) return null;
  const rows = (livePlayers ? livePlayers.filter((r) => r.fixtureId === fixtureId) : statsByFixture.get(fixtureId)) ?? [];
  const r = results[`${f.home}|${f.away}`];

  const rated = rows.filter((x) => x.rating != null).sort((a, b) => (b.rating! - a.rating!));
  const top = rated[0];
  if (!top) {
    // fallback: top scorer from events
    const ev = MATCH_EVENTS.find((e) => e.fixtureId === fixtureId);
    const g = ev?.goals.find((x) => x.type !== 'own-goal');
    if (!g) return null;
    return { name: g.player, team: g.team, flag: flagOf(g.team), goals: 1, assists: 0, shots: 0, passAccPct: 0, rating: null, cleanSheet: false };
  }
  const conceded = top.team === f.home ? r?.awayScore : r?.homeScore;
  const cleanSheet = top.pos === 'GK' && conceded === 0;
  return {
    name: top.name, team: top.team, flag: flagOf(top.team), pos: top.pos,
    goals: top.goals, assists: top.assists, shots: top.shots, passAccPct: top.passAccPct,
    rating: top.rating, cleanSheet,
  };
}

// ── Starting XI of the selected match, with goals/assists/rating ─────────────────
export function startingXI(fixtureId: string, livePlayers?: PlayerMatchStat[]): { home: XIPlayer[]; away: XIPlayer[]; homeTeam: string; awayTeam: string } | null {
  const f = WC_FIXTURES.find((x) => x.id === fixtureId);
  if (!f) return null;
  const lu = lineupFor(`${f.home}|${f.away}`);
  if (!lu || (!lu.home.players.length && !lu.away.players.length)) return null;

  const build = (players: LineupPlayer[], team: string): XIPlayer[] =>
    players.filter((p) => p.starter).map((p) => {
      const st = fxStat(fixtureId, p.name, team, livePlayers);
      const goals = st?.goals ?? 0, assists = st?.assists ?? 0, rating = st?.rating ?? null;
      const influence = rating != null ? Math.max(0, (rating - 5.5) / 4.5) : Math.min(1, (goals * 0.5 + assists * 0.3));
      return { name: p.name, pos: p.pos, number: p.number, team, goals, assists, rating, influence };
    });

  return { home: build(lu.home.players, f.home), away: build(lu.away.players, f.away), homeTeam: f.home, awayTeam: f.away };
}

// ── Pre-match squad fallback ─────────────────────────────────────────────────────
// Honest names-before-kickoff: the real committed squad (lib/playerProfilesData),
// ranked by caps. We have NO positions in profiles and no posted XI yet, so this
// is explicitly the squad pool — NOT a predicted starting XI. The confirmed XI
// (startingXI) takes over once api-football posts it (~40 min before kickoff).
export interface SquadMember { name: string; team: string; flag: string; club?: string; caps: number }
export function matchSquads(fixtureId: string): { home: SquadMember[]; away: SquadMember[]; homeTeam: string; awayTeam: string } | null {
  const f = WC_FIXTURES.find((x) => x.id === fixtureId);
  if (!f) return null;
  const squadOf = (team: string): SquadMember[] =>
    PLAYER_PROFILES
      .filter((p) => p.nation === team)
      .sort((a, b) => b.caps - a.caps)
      .map((p) => ({ name: p.name, team, flag: flagOf(team), club: p.club, caps: p.caps }));
  const home = squadOf(f.home), away = squadOf(f.away);
  if (!home.length && !away.length) return null;
  return { home, away, homeTeam: f.home, awayTeam: f.away };
}
