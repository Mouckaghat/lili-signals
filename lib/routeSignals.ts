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
import { type I18n } from './i18n';

// ─── Template filler ──────────────────────────────────────────────────────────

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

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
  label:        string; // internal English ID (used for selection state)
  displayLabel: string; // translated display label
  color:        string;
  desc:         string;
  score:        number; // 0–10 display scale
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

const ZONE_DEFS = [
  { label: 'DEATH CORRIDOR',  color: '#FF5B5B' },
  { label: 'HIGH TURBULENCE', color: '#FF7B35' },
  { label: 'COLLAPSE RISK',   color: '#FFD60A' },
  { label: 'SAFE CORRIDOR',   color: '#34D399' },
];

function getZoneDisplayLabel(label: string, i18n: I18n): string {
  switch (label) {
    case 'DEATH CORRIDOR':  return i18n.deathCorridor.toUpperCase();
    case 'HIGH TURBULENCE': return i18n.highTurbulence.toUpperCase();
    case 'COLLAPSE RISK':   return i18n.collapseRisk.toUpperCase();
    case 'SAFE CORRIDOR':   return i18n.safeCorridor.toUpperCase();
    default: return label;
  }
}

function zoneDesc(tier: TeamCampaign[], label: string, i18n: I18n): string {
  const top = tier[0];
  if (!top) return '';
  const rb = i18n.routeBriefings;

  if (label === 'DEATH CORRIDOR') {
    const parts: string[] = [];
    if (top.stats.maxAltitudeM > 1000)
      parts.push(fill(rb.zoneDeathAlt, { alt: top.stats.maxAltitudeM.toLocaleString() }));
    if (top.stats.climateTransitions > 0) {
      if (top.stats.climateTransitions === 1) {
        parts.push(rb.zoneDeathTransition1);
      } else {
        parts.push(fill(rb.zoneDeathTransitionN, { n: String(top.stats.climateTransitions) }));
      }
    }
    parts.push(fill(rb.zoneDeathDistance, { km: top.stats.totalDistanceKm.toLocaleString() }));
    return parts.join(' · ');
  }

  if (label === 'HIGH TURBULENCE') {
    const avgFatigue = Math.round(
      tier.reduce((s, c) => s + c.stats.cumulativeFatigue, 0) / tier.length,
    );
    return fill(rb.zoneDescTurbulence, { fatigue: String(avgFatigue) });
  }

  if (label === 'COLLAPSE RISK') {
    const avgHours = Math.round(
      tier.reduce((s, c) => s + c.stats.estimatedFlightHours, 0) / tier.length,
    );
    return fill(rb.zoneDescCollapse, { hours: String(avgHours) });
  }

  return rb.zoneDescSafe;
}

export function computeDangerZones(i18n: I18n, activeTeamNames?: Set<string>): RouteDangerZone[] {
  const all = computeAllCampaigns(activeTeamNames);
  if (all.length === 0) return [];
  const q = Math.ceil(all.length / 4);

  return ZONE_DEFS
    .map((z, i) => {
      const tier = all.slice(i * q, Math.min((i + 1) * q, all.length));
      if (tier.length === 0) return null;
      const avgScore = tier.reduce((s, c) => s + c.stats.difficultyScore, 0) / tier.length;
      return {
        label:        z.label,
        displayLabel: getZoneDisplayLabel(z.label, i18n),
        color:        z.color,
        desc:         zoneDesc(tier, z.label, i18n),
        score:        parseFloat((avgScore / 10).toFixed(1)),
        teams:        tier.slice(0, 4).map(c => ({ flag: c.flag, name: c.name })),
      };
    })
    .filter((z): z is RouteDangerZone => z !== null);
}

// ─── Intelligence briefings ───────────────────────────────────────────────────

export function computeRouteBriefings(i18n: I18n, activeTeamNames?: Set<string>): RouteBriefing[] {
  const all  = computeAllCampaigns(activeTeamNames);
  const rb   = i18n.routeBriefings;
  const items: RouteBriefing[] = [];

  const diffMap: Record<string, string> = {
    'Comfortable': i18n.difficultyLabels.comfortable,
    'Moderate':    i18n.difficultyLabels.moderate,
    'Demanding':   i18n.difficultyLabels.demanding,
    'Gruelling':   i18n.difficultyLabels.gruelling,
    'Maximum':     i18n.difficultyLabels.maximum,
  };

  // 1 — Hardest campaign
  if (all.length > 0) {
    const t = all[0];
    items.push({
      type:  i18n.briefingTypeRoute,
      color: '#FF7B35',
      text:  fill(rb.hardestCampaign, {
        team:  t.name,
        diff:  diffMap[t.stats.difficultyLabel] ?? t.stats.difficultyLabel,
        km:    t.stats.totalDistanceKm.toLocaleString(),
        alt:   t.stats.maxAltitudeM.toLocaleString(),
        stops: String(t.stops.length),
      }),
    });
  }

  // 2 — Azteca altitude note
  items.push({ type: i18n.briefingTypeAltitude, color: '#C060FF', text: rb.venueAzteca });

  // 3 — Extreme heat/humidity note (hardrock)
  items.push({ type: i18n.briefingTypeClimate, color: '#34D399', text: rb.venueHardRock });

  // 4 — Second hardest campaign
  if (all.length > 1) {
    const t = all[1];
    const transitionsPhrase = t.stats.climateTransitions === 1
      ? rb.transitionPhrase1
      : fill(rb.transitionPhraseN, { n: String(t.stats.climateTransitions) });
    items.push({
      type:  i18n.briefingTypeRoute,
      color: '#FF7B35',
      text:  fill(rb.secondHardest, {
        team:             t.name,
        transitionsPhrase,
        hours:            String(t.stats.estimatedFlightHours),
      }),
    });
  }

  // 5 — Most extreme venue-to-venue transition
  let worstNote   = '';
  let worstSignal = 0;
  for (const c of all) {
    for (let i = 1; i < c.stops.length; i++) {
      const from = STADIUM_ENV[c.stops[i - 1]];
      const to   = STADIUM_ENV[c.stops[i]];
      if (!from || !to) continue;
      const dist    = travelDistanceKm(c.stops[i - 1], c.stops[i]);
      const altDiff = Math.abs(to.altitudeM - from.altitudeM);
      const tmpDiff = Math.abs(to.avgTempJune - from.avgTempJune);
      const signal  = altDiff * 0.08 + tmpDiff * 2 + dist * 0.001;
      if (signal > worstSignal) {
        worstSignal = signal;
        worstNote   = getTransitionNote(c.stops[i - 1], c.stops[i], dist, i18n);
      }
    }
  }
  if (worstNote) {
    items.push({ type: i18n.briefingTypeTransition, color: '#00C8FF', text: worstNote });
  }

  // 6 — MetLife pressure note
  items.push({ type: i18n.briefingTypePressure, color: '#FF7B35', text: rb.venueMetLife });

  // 7 — Texas heat chain note
  items.push({ type: i18n.briefingTypeClimate, color: '#34D399', text: rb.venueATT });

  // 8 — Easiest route
  if (all.length > 0) {
    const t = all[all.length - 1];
    items.push({
      type:  i18n.briefingTypeRoute,
      color: '#4A9EFF',
      text:  fill(rb.easiestRoute, {
        team: t.name,
        diff: diffMap[t.stats.difficultyLabel] ?? t.stats.difficultyLabel,
        km:   t.stats.totalDistanceKm.toLocaleString(),
      }),
    });
  }

  return items;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function computeRouteSignals(i18n: I18n, activeTeamNames?: Set<string>): RouteSignals {
  return {
    zones:     computeDangerZones(i18n, activeTeamNames),
    briefings: computeRouteBriefings(i18n, activeTeamNames),
  };
}
