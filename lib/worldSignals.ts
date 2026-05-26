// World Signals — algorithmic intelligence layer
// All values are computed from WC_TEAMS, WC_FIXTURES, and match probability math.
// No hardcoded signal data. Pass activeTeamNames to filter eliminated teams.

import { WC_TEAMS, WC_FIXTURES, FED_COLOR, type WCTeam, type Federation } from './wcData';
import { buildMatchPredictions } from './wcSimulation';
import { WORLD_SIGNALS_I18N, wsT, type WorldSignalsI18n } from './worldSignalsI18n';

// ─── Exported types ───────────────────────────────────────────────────────────

export interface SignalIntercept {
  flag: string;
  team: string;
  type: string;
  color: string;
  text: string;
  timing: string; // "in 17d", "3h ago", etc — full string, no suffix needed
}

export interface PulseTeam {
  flag: string;
  team: string;
  state: string;
  value: number; // 0–100
  color: string;
}

export interface NarrativeArc {
  title: string;
  color: string;
  intensity: number; // 0–100
  teams: string[];
  desc: string;
}

export interface RegionSignal {
  confed: string;
  label: string;
  energy: number; // 0–100
  trend: string;
  up: boolean;
  color: string;
  desc: string;
}

export interface WorldSignals {
  intercepts: SignalIntercept[];
  pulse: PulseTeam[];
  narratives: NarrativeArc[];
  regions: RegionSignal[];
  activeCount: number;
  narrativeCount: number;
  regionCount: number;
}

// ─── Colour palette (must match D tokens in world-signals.tsx) ────────────────

const C = {
  blue:   '#4A9EFF',
  cyan:   '#00C8FF',
  orange: '#FF7B35',
  green:  '#34D399',
  signal: '#00E5A0',
  gold:   '#D4A520',
  red:    '#FF5B5B',
  purple: '#C060FF',
  text3:  '#374F7A',
};

const HOST_NATIONS = new Set(['USA', 'Mexico', 'Canada']);
const DEFENDING_CHAMPION = 'Argentina';

// ─── Core helpers ─────────────────────────────────────────────────────────────

function expectedGroupPts(teamName: string): number {
  return buildMatchPredictions(teamName).reduce((s, p) => s + p.expectedPoints, 0);
}

function avgOpponentStrength(team: WCTeam): number {
  const opps = WC_TEAMS.filter(t => t.group === team.group && t.name !== team.name);
  return opps.reduce((s, t) => s + t.strength, 0) / opps.length;
}

function relativeTime(isoDate: string, ws: WorldSignalsI18n): string {
  const diffMs = new Date(isoDate).getTime() - Date.now();
  if (diffMs > 0) {
    const days = Math.floor(diffMs / 86_400_000);
    const hours = Math.floor(diffMs / 3_600_000);
    return days > 0
      ? wsT(ws.time.inDays, { n: days })
      : wsT(ws.time.inHours, { n: hours });
  }
  const ago = -diffMs;
  const days = Math.floor(ago / 86_400_000);
  const hours = Math.floor(ago / 3_600_000);
  const mins = Math.floor(ago / 60_000);
  if (days > 0) return wsT(ws.time.daysAgo, { n: days });
  if (hours > 0) return wsT(ws.time.hoursAgo, { n: hours });
  return wsT(ws.time.minsAgo, { n: mins });
}

// Normalises raw expected group points (range ≈ 1.5–8.0) to 0–100 for display.
// Anchors: weakest realistic scenario → ~5, strongest → ~95.
function normalisePts(pts: number): number {
  return Math.round(Math.min(95, Math.max(5, ((pts - 1.5) / 6.5) * 100)));
}

// ─── Pulse computation ────────────────────────────────────────────────────────
// Value = normalised expected group-stage points (0-100).
// State inferred from value + group context.

function deriveState(
  value: number,
  isHost: boolean,
  isDefChamp: boolean,
  avgOppStr: number,
  ws: WorldSignalsI18n,
): { state: string; color: string } {
  if (isDefChamp)                       return { state: ws.states.BURDEN,    color: C.red    };
  if (value >= 75)                      return { state: ws.states.BURDEN,    color: C.red    };
  if (isHost && value >= 50)            return { state: ws.states.INTENSITY, color: C.gold   };
  if (value >= 62 && avgOppStr > 70)    return { state: ws.states.PRESSURE,  color: C.orange };
  if (value >= 58)                      return { state: ws.states.MOMENTUM,  color: C.blue   };
  if (value >= 46 && avgOppStr > 67)    return { state: ws.states.SURGE,     color: C.cyan   };
  if (value >= 40)                      return { state: ws.states.CALM,      color: C.text3  };
  return                                       { state: ws.states.UNDERDOG,  color: C.purple };
}

export function computePulse(activeTeamNames?: Set<string>, ws: WorldSignalsI18n = WORLD_SIGNALS_I18N.EN): PulseTeam[] {
  return WC_TEAMS
    .filter(t => !activeTeamNames || activeTeamNames.has(t.name))
    .map(team => {
      const pts   = expectedGroupPts(team.name);
      const value = normalisePts(pts);
      const { state, color } = deriveState(
        value,
        HOST_NATIONS.has(team.name),
        team.name === DEFENDING_CHAMPION,
        avgOpponentStrength(team),
        ws,
      );
      return { flag: team.flag, team: team.name, state, value, color };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

// ─── Intercepts computation ───────────────────────────────────────────────────
// Surface the 8 fixtures with the highest narrative weight:
//   upset potential + marquee quality + host-nation bonus.

function narrativeScore(home: WCTeam, away: WCTeam): number {
  const diff = Math.abs(home.strength - away.strength);
  const avg  = (home.strength + away.strength) / 2;
  const host = HOST_NATIONS.has(home.name) || HOST_NATIONS.has(away.name) ? 15 : 0;
  return diff * 0.6 + avg * 0.3 + host;
}

function interceptMeta(
  home: WCTeam,
  away: WCTeam,
  ws: WorldSignalsI18n,
): { type: string; typeKey: string; color: string; featured: WCTeam } {
  const diff   = Math.abs(home.strength - away.strength);
  const isHost = HOST_NATIONS.has(home.name) || HOST_NATIONS.has(away.name);
  const avgStr = (home.strength + away.strength) / 2;
  const weaker = home.strength <= away.strength ? home : away;
  const host   = HOST_NATIONS.has(home.name) ? home : away;

  if (diff >= 20)    return { type: ws.types['UPSET ALERT'], typeKey: 'UPSET ALERT', color: C.red,    featured: weaker };
  if (isHost)        return { type: ws.types.HOST,           typeKey: 'HOST',        color: C.gold,   featured: host   };
  if (avgStr >= 82)  return { type: ws.types.MARQUEE,        typeKey: 'MARQUEE',     color: C.cyan,   featured: home   };
  if (home.federation === away.federation) return { type: ws.types.DERBY, typeKey: 'DERBY', color: C.purple, featured: home };
  return                                          { type: ws.types.WATCH,  typeKey: 'WATCH', color: C.blue,   featured: home };
}

function interceptText(home: WCTeam, away: WCTeam, typeKey: string, homeWinProb: number, ws: WorldSignalsI18n): string {
  const diff     = Math.abs(home.strength - away.strength);
  const stronger = home.strength >= away.strength ? home : away;
  const weaker   = home.strength >= away.strength ? away : home;
  const upsetPct = Math.max(5, Math.round((home.strength < away.strength ? homeWinProb : 1 - homeWinProb - 0.2) * 100));
  const host     = HOST_NATIONS.has(home.name) ? home : away;

  switch (typeKey) {
    case 'UPSET ALERT':
      return wsT(ws.intercepts.upsetAlert, { weaker: weaker.name, diff, stronger: stronger.name, pct: upsetPct });
    case 'HOST':
      return wsT(ws.intercepts.host, { host: host.name });
    case 'MARQUEE':
      return wsT(ws.intercepts.marquee, { combined: home.strength + away.strength });
    case 'DERBY':
      return wsT(ws.intercepts.derby, { fed: home.federation });
    default:
      return wsT(ws.intercepts.watch, { diff });
  }
}

export function computeIntercepts(activeTeamNames?: Set<string>, ws: WorldSignalsI18n = WORLD_SIGNALS_I18N.EN): SignalIntercept[] {
  const teamMap = new Map(WC_TEAMS.map(t => [t.name, t]));

  return WC_FIXTURES
    .filter(f => !activeTeamNames || (activeTeamNames.has(f.home) && activeTeamNames.has(f.away)))
    .map(f => {
      const home = teamMap.get(f.home)!;
      const away = teamMap.get(f.away)!;
      return { f, home, away, score: narrativeScore(home, away) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ f, home, away }) => {
      const { type, typeKey, color, featured } = interceptMeta(home, away, ws);
      const pred = buildMatchPredictions(home.name).find(p => p.opponent === away.name);
      return {
        flag:   featured.flag,
        team:   featured.name,
        type,
        color,
        text:   interceptText(home, away, typeKey, pred?.winProb ?? 0.33, ws),
        timing: relativeTime(f.date, ws),
      };
    });
}

// ─── Narratives computation ───────────────────────────────────────────────────

export function computeNarratives(activeTeamNames?: Set<string>, ws: WorldSignalsI18n = WORLD_SIGNALS_I18N.EN): NarrativeArc[] {
  const active = WC_TEAMS.filter(t => !activeTeamNames || activeTeamNames.has(t.name));
  const arcs: NarrativeArc[] = [];

  // 1 — The Underdog Arc: low-strength teams facing tough groups
  const underdogs = active
    .filter(t => t.strength < 65)
    .map(t => ({ team: t, avgOpp: avgOpponentStrength(t) }))
    .filter(({ avgOpp }) => avgOpp > 70)
    .sort((a, b) => b.avgOpp - a.avgOpp)
    .slice(0, 4);

  if (underdogs.length > 0) {
    const avgGap = underdogs.reduce((s, { team, avgOpp }) => s + (avgOpp - team.strength), 0) / underdogs.length;
    arcs.push({
      title: ws.arcTitles.underdogs,
      color: C.cyan,
      intensity: Math.min(99, Math.round(58 + avgGap)),
      teams: underdogs.map(({ team }) => `${team.flag} ${team.name}`),
      desc: wsT(ws.arcDescs.underdogs, { count: underdogs.length }),
    });
  }

  // 2 — Host Nation Destiny
  const hosts = active.filter(t => HOST_NATIONS.has(t.name));
  if (hosts.length > 0) {
    const avgPts = hosts.reduce((s, t) => s + expectedGroupPts(t.name), 0) / hosts.length;
    arcs.push({
      title: ws.arcTitles.host,
      color: C.gold,
      intensity: Math.round(50 + (avgPts / 9) * 45),
      teams: hosts.map(t => `${t.flag} ${t.name}`),
      desc: ws.arcDescs.host,
    });
  }

  // 3 — Golden Generation Pressure: elite squads (strength ≥ 80)
  const golden = active.filter(t => t.strength >= 80).sort((a, b) => b.strength - a.strength);
  if (golden.length > 0) {
    const avgPts = golden.reduce((s, t) => s + expectedGroupPts(t.name), 0) / golden.length;
    arcs.push({
      title: ws.arcTitles.golden,
      color: C.orange,
      intensity: Math.round(55 + (avgPts / 9) * 40),
      teams: golden.slice(0, 4).map(t => `${t.flag} ${t.name}`),
      desc: wsT(ws.arcDescs.golden, { n: golden.length }),
    });
  }

  // 4 — Redemption Campaign: defending champion + maximum-burden sides
  const defChamp = active.find(t => t.name === DEFENDING_CHAMPION);
  const highBurden = active.filter(t => t.strength >= 85 && t.name !== DEFENDING_CHAMPION).slice(0, 2);
  const redemptionTeams = [defChamp, ...highBurden].filter((t): t is WCTeam => !!t);
  if (redemptionTeams.length > 0) {
    arcs.push({
      title: ws.arcTitles.redemption,
      color: C.purple,
      intensity: Math.round(redemptionTeams.reduce((s, t) => s + t.strength, 0) / redemptionTeams.length),
      teams: redemptionTeams.map(t => `${t.flag} ${t.name}`),
      desc: ws.arcDescs.redemption,
    });
  }

  // 5 — Dark Horse Surge: mid-strength teams with best group-stage expected points relative to their strength
  const darkHorses = active
    .filter(t => t.strength >= 60 && t.strength < 72)
    .map(t => ({ team: t, pts: expectedGroupPts(t.name) }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3);

  if (darkHorses.length > 0) {
    const avgPts = darkHorses.reduce((s, { pts }) => s + pts, 0) / darkHorses.length;
    arcs.push({
      title: ws.arcTitles.darkHorse,
      color: C.signal,
      intensity: Math.round((avgPts / 9) * 100),
      teams: darkHorses.map(({ team }) => `${team.flag} ${team.name}`),
      desc: ws.arcDescs.darkHorse,
    });
  }

  return arcs;
}

// ─── Regions computation ──────────────────────────────────────────────────────
// Energy = avg expected group-stage points for active conf teams, scaled 0-100.
// Trend = deviation from the global average (3.0 pts = perfectly balanced draw).

export function computeRegions(activeTeamNames?: Set<string>, ws: WorldSignalsI18n = WORLD_SIGNALS_I18N.EN): RegionSignal[] {
  const federations: Federation[] = ['UEFA', 'CONMEBOL', 'CAF', 'AFC', 'CONCACAF', 'OFC'];
  // Global average expected pts across all 48 teams — computed once for trend baseline
  const globalAvgPts = WC_TEAMS.reduce((s, t) => s + expectedGroupPts(t.name), 0) / WC_TEAMS.length;

  return federations.flatMap(fed => {
    const teams = WC_TEAMS.filter(t => t.federation === fed && (!activeTeamNames || activeTeamNames.has(t.name)));
    if (teams.length === 0) return [];

    const avgPts  = teams.reduce((s, t) => s + expectedGroupPts(t.name), 0) / teams.length;
    const energy  = normalisePts(avgPts);
    // Trend = how much above/below the global avg this confederation sits (scaled for readability)
    const trendRaw = Math.round((avgPts - globalAvgPts) * 10);
    const up    = trendRaw >= 0;
    const trend = up ? `+${trendRaw}` : `${trendRaw}`;
    const strongest = [...teams].sort((a, b) => b.strength - a.strength)[0];
    const color = FED_COLOR[fed];

    return [{
      confed: fed,
      label:  ws.regionLabels[fed] ?? fed,
      energy,
      trend,
      up,
      color,
      desc: `${teams.length} · ${strongest.name}`,
    }];
  });
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function computeWorldSignals(activeTeamNames?: Set<string>, ws: WorldSignalsI18n = WORLD_SIGNALS_I18N.EN): WorldSignals {
  const pulse      = computePulse(activeTeamNames, ws);
  const intercepts = computeIntercepts(activeTeamNames, ws);
  const narratives = computeNarratives(activeTeamNames, ws);
  const regions    = computeRegions(activeTeamNames, ws);

  return {
    pulse,
    intercepts,
    narratives,
    regions,
    activeCount:    activeTeamNames ? activeTeamNames.size : WC_TEAMS.length,
    narrativeCount: narratives.length,
    regionCount:    regions.length,
  };
}
