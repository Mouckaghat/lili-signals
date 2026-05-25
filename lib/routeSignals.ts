// Route Signals — algorithmic layer connecting team fixtures to the route intelligence engine.
// Derives danger zones and intelligence briefings from STADIUM_ENV, WC_FIXTURES, and CampaignStats.

import { WC_TEAMS, WC_FIXTURES } from './wcData';
import {
  STADIUM_ENV,
  computeCampaignStats,
  travelDistanceKm,
  getTransitionNote,
  type CampaignStats,
} from './routeIntelligence';

// ─── Stadium name → STADIUM_ENV key ──────────────────────────────────────────

const STADIUM_TO_KEY: Record<string, string> = {
  'MetLife Stadium':         'metlife',
  'SoFi Stadium':            'sofi',
  'AT&T Stadium':            'att',
  'Arrowhead Stadium':       'arrowhead',
  'Lumen Field':             'lumen',
  'Lincoln Financial Field': 'lincoln',
  'Mercedes-Benz Stadium':   'mercedes',
  "Levi's Stadium":          'levis',
  'Hard Rock Stadium':       'hardrock',
  'Gillette Stadium':        'gillette',
  'NRG Stadium':             'nrg',
  'BC Place':                'bc',
  'BMO Field':               'bmo',
  'Estadio Azteca':          'azteca',
  'Estadio BBVA':            'bbva',
  'Estadio Akron':           'akron',
};

// ─── Exported types ───────────────────────────────────────────────────────────

export interface TeamCampaign {
  flag:  string;
  name:  string;
  stops: string[];
  stats: CampaignStats;
}

export interface RouteDangerZone {
  label: string;
  color: string;
  desc:  string;
  score: number; // 0–10 display scale
  teams: Array<{ flag: string; name: string }>;
}

export interface RouteBriefing {
  type:  string;
  color: string;
  text:  string;
}

export interface RouteSignals {
  zones:     RouteDangerZone[];
  briefings: RouteBriefing[];
}

// ─── Core helpers ─────────────────────────────────────────────────────────────

function teamVenueKeys(teamName: string): string[] {
  return WC_FIXTURES
    .filter(f => f.home === teamName || f.away === teamName)
    .sort((a, b) => a.matchday - b.matchday)
    .map(f => STADIUM_TO_KEY[f.stadium])
    .filter((k): k is string => !!k && k in STADIUM_ENV);
}

export function computeAllCampaigns(activeTeamNames?: Set<string>): TeamCampaign[] {
  return WC_TEAMS
    .filter(t => !activeTeamNames || activeTeamNames.has(t.name))
    .map(t => {
      const stops = teamVenueKeys(t.name);
      return { flag: t.flag, name: t.name, stops, stats: computeCampaignStats(stops) };
    })
    .sort((a, b) => b.stats.difficultyScore - a.stats.difficultyScore);
}

// ─── Danger zones ─────────────────────────────────────────────────────────────
// Divide sorted campaign list into four quartile tiers.
// Each tier becomes a zone with a computed score and description.

const ZONE_DEFS = [
  { label: 'DEATH CORRIDOR',  color: '#FF5B5B' },
  { label: 'HIGH TURBULENCE', color: '#FF7B35' },
  { label: 'COLLAPSE RISK',   color: '#FFD60A' },
  { label: 'SAFE CORRIDOR',   color: '#34D399' },
];

function zoneDesc(tier: TeamCampaign[], label: string): string {
  const top = tier[0];
  if (!top) return '';

  if (label === 'DEATH CORRIDOR') {
    const parts: string[] = [];
    if (top.stats.maxAltitudeM > 1000) parts.push(`altitude peak ${top.stats.maxAltitudeM.toLocaleString()}m`);
    if (top.stats.climateTransitions > 0)
      parts.push(`${top.stats.climateTransitions} climate transition${top.stats.climateTransitions !== 1 ? 's' : ''}`);
    parts.push(`${top.stats.totalDistanceKm.toLocaleString()}km travel chain`);
    return parts.join(' · ');
  }

  if (label === 'HIGH TURBULENCE') {
    const avgFatigue = Math.round(
      tier.reduce((s, c) => s + c.stats.cumulativeFatigue, 0) / tier.length,
    );
    return `Elevated climate load · ${avgFatigue}% avg fatigue index · compound environmental exposure`;
  }

  if (label === 'COLLAPSE RISK') {
    const avgHours = Math.round(
      tier.reduce((s, c) => s + c.stats.estimatedFlightHours, 0) / tier.length,
    );
    return `Moderate environmental variance · ${avgHours}h avg flight time · psychological pressure over physical stress`;
  }

  return 'Stable climate · manageable travel distances · low cumulative fatigue projection';
}

export function computeDangerZones(activeTeamNames?: Set<string>): RouteDangerZone[] {
  const all = computeAllCampaigns(activeTeamNames);
  if (all.length === 0) return [];
  const q = Math.ceil(all.length / 4);

  return ZONE_DEFS
    .map((z, i) => {
      const tier = all.slice(i * q, Math.min((i + 1) * q, all.length));
      if (tier.length === 0) return null;
      const avgScore = tier.reduce((s, c) => s + c.stats.difficultyScore, 0) / tier.length;
      return {
        label: z.label,
        color: z.color,
        desc:  zoneDesc(tier, z.label),
        score: parseFloat((avgScore / 10).toFixed(1)),
        teams: tier.slice(0, 4).map(c => ({ flag: c.flag, name: c.name })),
      };
    })
    .filter((z): z is RouteDangerZone => z !== null);
}

// ─── Intelligence briefings ───────────────────────────────────────────────────
// Eight notes derived from STADIUM_ENV travel notes and computed campaign extremes.

export function computeRouteBriefings(activeTeamNames?: Set<string>): RouteBriefing[] {
  const all   = computeAllCampaigns(activeTeamNames);
  const items: RouteBriefing[] = [];

  // 1 — Hardest campaign
  if (all.length > 0) {
    const t = all[0];
    items.push({
      type:  'ROUTE',
      color: '#FF7B35',
      text:  `${t.name} carries the tournament's heaviest group-stage load — ${t.stats.difficultyLabel.toLowerCase()} difficulty, ${t.stats.totalDistanceKm.toLocaleString()}km travel, altitude peak ${t.stats.maxAltitudeM.toLocaleString()}m across ${t.stops.length} venues.`,
    });
  }

  // 2 — Azteca altitude note
  items.push({
    type:  'ALTITUDE',
    color: '#C060FF',
    text:  STADIUM_ENV.azteca.travelNote,
  });

  // 3 — Extreme heat/humidity note (hardrock)
  items.push({
    type:  'CLIMATE',
    color: '#34D399',
    text:  STADIUM_ENV.hardrock.travelNote,
  });

  // 4 — Second hardest campaign
  if (all.length > 1) {
    const t = all[1];
    items.push({
      type:  'ROUTE',
      color: '#FF7B35',
      text:  `${t.name} draws ${t.stats.climateTransitions} climate transition${t.stats.climateTransitions !== 1 ? 's' : ''} and ${t.stats.estimatedFlightHours}h estimated flight time — compound logistical stress that Lili's route engine tracks across the full group phase.`,
    });
  }

  // 5 — Most extreme venue-to-venue transition in the active campaign set
  let worstNote   = '';
  let worstSignal = 0;
  for (const c of all) {
    for (let i = 1; i < c.stops.length; i++) {
      const from = STADIUM_ENV[c.stops[i - 1]];
      const to   = STADIUM_ENV[c.stops[i]];
      if (!from || !to) continue;
      const dist     = travelDistanceKm(c.stops[i - 1], c.stops[i]);
      const altDiff  = Math.abs(to.altitudeM - from.altitudeM);
      const tempDiff = Math.abs(to.avgTempJune - from.avgTempJune);
      const signal   = altDiff * 0.08 + tempDiff * 2 + dist * 0.001;
      if (signal > worstSignal) {
        worstSignal = signal;
        worstNote   = getTransitionNote(c.stops[i - 1], c.stops[i], dist);
      }
    }
  }
  if (worstNote) {
    items.push({ type: 'TRANSITION', color: '#00C8FF', text: worstNote });
  }

  // 6 — MetLife pressure note
  items.push({
    type:  'PRESSURE',
    color: '#FF7B35',
    text:  STADIUM_ENV.metlife.travelNote,
  });

  // 7 — Texas heat chain note
  items.push({
    type:  'CLIMATE',
    color: '#34D399',
    text:  STADIUM_ENV.att.travelNote,
  });

  // 8 — Easiest route
  if (all.length > 0) {
    const t = all[all.length - 1];
    items.push({
      type:  'ROUTE',
      color: '#4A9EFF',
      text:  `${t.name} draws the cleanest group-stage path in Lili's matrix — ${t.stats.difficultyLabel.toLowerCase()} difficulty, ${t.stats.totalDistanceKm.toLocaleString()}km total travel, minimal environmental variance across all venues.`,
    });
  }

  return items;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function computeRouteSignals(activeTeamNames?: Set<string>): RouteSignals {
  return {
    zones:     computeDangerZones(activeTeamNames),
    briefings: computeRouteBriefings(activeTeamNames),
  };
}
