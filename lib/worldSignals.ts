// World Signals — algorithmic intelligence layer
// All values are computed from WC_TEAMS, WC_FIXTURES, and match probability math.
// No hardcoded signal data. Pass activeTeamNames to filter eliminated teams.

import { WC_TEAMS, WC_FIXTURES, FED_COLOR, type WCTeam, type Federation } from './wcData';
import { buildMatchPredictions } from './wcSimulation';

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

function relativeTime(isoDate: string): string {
  const diffMs = new Date(isoDate).getTime() - Date.now();
  if (diffMs > 0) {
    const days = Math.floor(diffMs / 86_400_000);
    const hours = Math.floor(diffMs / 3_600_000);
    return days > 0 ? `in ${days}d` : `in ${hours}h`;
  }
  const ago = -diffMs;
  const days = Math.floor(ago / 86_400_000);
  const hours = Math.floor(ago / 3_600_000);
  const mins = Math.floor(ago / 60_000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
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
): { state: string; color: string } {
  if (isDefChamp)                       return { state: 'BURDEN',    color: C.red    };
  if (value >= 75)                      return { state: 'BURDEN',    color: C.red    };
  if (isHost && value >= 50)            return { state: 'INTENSITY', color: C.gold   };
  if (value >= 62 && avgOppStr > 70)    return { state: 'PRESSURE',  color: C.orange };
  if (value >= 58)                      return { state: 'MOMENTUM',  color: C.blue   };
  if (value >= 46 && avgOppStr > 67)    return { state: 'SURGE',     color: C.cyan   };
  if (value >= 40)                      return { state: 'CALM',      color: C.text3  };
  return                                       { state: 'UNDERDOG',  color: C.purple };
}

export function computePulse(activeTeamNames?: Set<string>): PulseTeam[] {
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
): { type: string; color: string; featured: WCTeam } {
  const diff   = Math.abs(home.strength - away.strength);
  const isHost = HOST_NATIONS.has(home.name) || HOST_NATIONS.has(away.name);
  const avgStr = (home.strength + away.strength) / 2;
  const weaker = home.strength <= away.strength ? home : away;
  const host   = HOST_NATIONS.has(home.name) ? home : away;

  if (diff >= 20)    return { type: 'UPSET ALERT', color: C.red,    featured: weaker };
  if (isHost)        return { type: 'HOST',        color: C.gold,   featured: host   };
  if (avgStr >= 82)  return { type: 'MARQUEE',     color: C.cyan,   featured: home   };
  if (home.federation === away.federation) return { type: 'DERBY',  color: C.purple, featured: home };
  return                                          { type: 'WATCH',   color: C.blue,   featured: home };
}

function interceptText(home: WCTeam, away: WCTeam, type: string, homeWinProb: number): string {
  const diff     = Math.abs(home.strength - away.strength);
  const stronger = home.strength >= away.strength ? home : away;
  const weaker   = home.strength >= away.strength ? away : home;
  const upsetPct = Math.round((home.strength < away.strength ? homeWinProb : 1 - homeWinProb - 0.2) * 100);

  switch (type) {
    case 'UPSET ALERT':
      return `${weaker.name} faces a ${diff}-point strength deficit against ${stronger.name}. Lili assigns ${Math.max(5, upsetPct)}% upset probability — elevated signal for an outlier outcome.`;
    case 'HOST':
      const host = HOST_NATIONS.has(home.name) ? home : away;
      return `${host.name} on home soil activates a compound signal. Crowd familiarity, reduced travel fatigue, and atmospheric intensity all weight simultaneously in Lili's model.`;
    case 'MARQUEE':
      return `Combined strength index of ${home.strength + away.strength}. Two elite sides in direct collision — maximum narrative weight and global attention signal concentrated in one fixture.`;
    case 'DERBY':
      return `${home.federation} internal contest — tactical familiarity compresses variance. Lili tracks elevated psychological volatility in same-confederation group fixtures.`;
    default:
      return `Strength differential of ${diff} points. Group-stage dynamics give both sides a credible path. Lili identifies signal balance across this fixture.`;
  }
}

export function computeIntercepts(activeTeamNames?: Set<string>): SignalIntercept[] {
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
      const { type, color, featured } = interceptMeta(home, away);
      const pred = buildMatchPredictions(home.name).find(p => p.opponent === away.name);
      return {
        flag:   featured.flag,
        team:   featured.name,
        type,
        color,
        text:   interceptText(home, away, type, pred?.winProb ?? 0.33),
        timing: relativeTime(f.date),
      };
    });
}

// ─── Narratives computation ───────────────────────────────────────────────────

export function computeNarratives(activeTeamNames?: Set<string>): NarrativeArc[] {
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
      title: 'The Underdog Arc',
      color: C.cyan,
      intensity: Math.min(99, Math.round(58 + avgGap)),
      teams: underdogs.map(({ team }) => `${team.flag} ${team.name}`),
      desc: `${underdogs.length} low-ranked entries face statistically dominant opposition. Lili's upset probability model assigns these fixtures the highest surprise coefficient in the group stage.`,
    });
  }

  // 2 — Host Nation Destiny
  const hosts = active.filter(t => HOST_NATIONS.has(t.name));
  if (hosts.length > 0) {
    const avgPts = hosts.reduce((s, t) => s + expectedGroupPts(t.name), 0) / hosts.length;
    arcs.push({
      title: 'Host Nation Destiny',
      color: C.gold,
      intensity: Math.round(50 + (avgPts / 9) * 45),
      teams: hosts.map(t => `${t.flag} ${t.name}`),
      desc: `Three co-hosts generate simultaneous atmospheric pressure. Home soil signals — crowd familiarity, reduced travel, and officiating familiarity — compound across all three nations.`,
    });
  }

  // 3 — Golden Generation Pressure: elite squads (strength ≥ 80)
  const golden = active.filter(t => t.strength >= 80).sort((a, b) => b.strength - a.strength);
  if (golden.length > 0) {
    const avgPts = golden.reduce((s, t) => s + expectedGroupPts(t.name), 0) / golden.length;
    arcs.push({
      title: 'Golden Generation Pressure',
      color: C.orange,
      intensity: Math.round(55 + (avgPts / 9) * 40),
      teams: golden.slice(0, 4).map(t => `${t.flag} ${t.name}`),
      desc: `${golden.length} elite nations entering with peak-or-declining squad cycles. Legacy pressure compresses variance and amplifies expectation weight across all signal channels simultaneously.`,
    });
  }

  // 4 — Redemption Campaign: defending champion + maximum-burden sides
  const defChamp = active.find(t => t.name === DEFENDING_CHAMPION);
  const highBurden = active.filter(t => t.strength >= 85 && t.name !== DEFENDING_CHAMPION).slice(0, 2);
  const redemptionTeams = [defChamp, ...highBurden].filter((t): t is WCTeam => !!t);
  if (redemptionTeams.length > 0) {
    arcs.push({
      title: 'Redemption Campaign',
      color: C.purple,
      intensity: Math.round(redemptionTeams.reduce((s, t) => s + t.strength, 0) / redemptionTeams.length),
      teams: redemptionTeams.map(t => `${t.flag} ${t.name}`),
      desc: `Defending champions and maximum-expectation sides carrying fractured momentum into unfamiliar continental territory. Narrative pressure index at maximum threshold.`,
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
      title: 'Dark Horse Surge',
      color: C.signal,
      intensity: Math.round((avgPts / 9) * 100),
      teams: darkHorses.map(({ team }) => `${team.flag} ${team.name}`),
      desc: `Mid-tier entries with structural group-stage advantages. Low expectation creates signal amplification when results overperform — disproportionate global attention follows.`,
    });
  }

  return arcs;
}

// ─── Regions computation ──────────────────────────────────────────────────────
// Energy = avg expected group-stage points for active conf teams, scaled 0-100.
// Trend = deviation from the global average (3.0 pts = perfectly balanced draw).

const CONFED_LABELS: Partial<Record<Federation, string>> = {
  UEFA: 'Europe', CONMEBOL: 'S. America', CAF: 'Africa',
  AFC: 'Asia', CONCACAF: 'N. America', OFC: 'Oceania',
};

export function computeRegions(activeTeamNames?: Set<string>): RegionSignal[] {
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
      label:  CONFED_LABELS[fed] ?? fed,
      energy,
      trend,
      up,
      color,
      desc: `${teams.length} active ${teams.length === 1 ? 'nation' : 'nations'}. Avg strength ${Math.round(teams.reduce((s, t) => s + t.strength, 0) / teams.length)}. ${strongest.name} leads the continental signal.`,
    }];
  });
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function computeWorldSignals(activeTeamNames?: Set<string>): WorldSignals {
  const pulse      = computePulse(activeTeamNames);
  const intercepts = computeIntercepts(activeTeamNames);
  const narratives = computeNarratives(activeTeamNames);
  const regions    = computeRegions(activeTeamNames);

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
