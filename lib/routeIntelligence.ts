// Route Intelligence — climate, altitude, travel, and campaign difficulty analysis
// Provides the environmental and logistical layer for Team Route visualisation.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StadiumEnvironment {
  id: string;
  coords: { lat: number; lng: number };
  altitudeM: number;
  avgTempJune: number;      // °C daytime average
  avgTempJuly: number;
  humidityLabel: 'Low' | 'Moderate' | 'High' | 'Very High';
  climateChallenge: number;  // 1–10: physiological stress for unadapted teams
  altitudeChallenge: number; // 1–10: altitude impact (significant above 500m)
  travelNote: string;        // Lili's atmospheric intelligence note
}

export interface CampaignStats {
  totalDistanceKm: number;
  estimatedFlightHours: number;
  maxAltitudeM: number;
  climateTransitions: number;   // significant temp/altitude changes between stops
  cumulativeFatigue: number;    // 0–100
  difficultyScore: number;      // 0–100
  difficultyLabel: 'Comfortable' | 'Moderate' | 'Demanding' | 'Gruelling' | 'Maximum';
}

// ─── Stadium environments ─────────────────────────────────────────────────────

export const STADIUM_ENV: Record<string, StadiumEnvironment> = {
  metlife: {
    id: 'metlife',
    coords: { lat: 40.81, lng: -74.07 },
    altitudeM: 8,
    avgTempJune: 22,
    avgTempJuly: 27,
    humidityLabel: 'Moderate',
    climateChallenge: 4,
    altitudeChallenge: 1,
    travelNote:
      "East Coast summer warmth with manageable humidity. MetLife's open bowl allows natural ventilation. Conditions are neutral — pressure here comes from narrative, not climate.",
  },
  att: {
    id: 'att',
    coords: { lat: 32.75, lng: -97.09 },
    altitudeM: 185,
    avgTempJune: 31,
    avgTempJuly: 34,
    humidityLabel: 'High',
    climateChallenge: 8,
    altitudeChallenge: 1,
    travelNote:
      "Texas in June is physiologically demanding — ambient temperatures exceed 30°C with compounding humidity. Teams without heat-acclimatisation protocols statistically concede more second-half goals here than at any other USA venue.",
  },
  azteca: {
    id: 'azteca',
    coords: { lat: 19.30, lng: -99.15 },
    altitudeM: 2240,
    avgTempJune: 19,
    avgTempJuly: 18,
    humidityLabel: 'Low',
    climateChallenge: 4,
    altitudeChallenge: 9,
    travelNote:
      "Altitude 2,240m — the single most physiologically demanding environment in the tournament. Every sea-level team loses 8–12% aerobic capacity here. Temperature is mild, but altitude changes everything. Full adaptation requires 7–14 days.",
  },
  arrowhead: {
    id: 'arrowhead',
    coords: { lat: 39.05, lng: -94.48 },
    altitudeM: 270,
    avgTempJune: 27,
    avgTempJuly: 30,
    humidityLabel: 'Moderate',
    climateChallenge: 5,
    altitudeChallenge: 1,
    travelNote:
      "Kansas City sits at the continental interior. June warmth and moderate humidity produce consistent conditions. The acoustic architecture of Arrowhead is the primary environmental variable — not climate.",
  },
  mercedes: {
    id: 'mercedes',
    coords: { lat: 33.76, lng: -84.40 },
    altitudeM: 315,
    avgTempJune: 28,
    avgTempJuly: 30,
    humidityLabel: 'High',
    climateChallenge: 6,
    altitudeChallenge: 1,
    travelNote:
      "Atlanta's subtropical summer combines heat and humidity in a compound that disproportionately affects European squads. The retractable roof provides partial climate control — a rare structural advantage in the southern corridor.",
  },
  sofi: {
    id: 'sofi',
    coords: { lat: 33.95, lng: -118.34 },
    altitudeM: 28,
    avgTempJune: 22,
    avgTempJuly: 24,
    humidityLabel: 'Low',
    climateChallenge: 2,
    altitudeChallenge: 1,
    travelNote:
      "Southern California's Mediterranean climate is the most forgiving environment of all 15 venues. Cool Pacific air, minimal humidity, sea-level altitude. Teams arriving from Mexico or the American South experience a genuine physiological reset.",
  },
  lumen: {
    id: 'lumen',
    coords: { lat: 47.60, lng: -122.33 },
    altitudeM: 10,
    avgTempJune: 18,
    avgTempJuly: 22,
    humidityLabel: 'Moderate',
    climateChallenge: 2,
    altitudeChallenge: 1,
    travelNote:
      "Seattle's mild, cool climate is the tournament's most temperate. Teams arriving from Miami or Dallas experience extreme climate disruption — the psychological adjustment to cooler, quieter conditions can paradoxically unsettle established match rhythm.",
  },
  lincoln: {
    id: 'lincoln',
    coords: { lat: 39.90, lng: -75.17 },
    altitudeM: 12,
    avgTempJune: 25,
    avgTempJuly: 27,
    humidityLabel: 'Moderate',
    climateChallenge: 4,
    altitudeChallenge: 1,
    travelNote:
      "Philadelphia's East Coast summer is warm with moderate humidity — conditions broadly similar to MetLife. The primary variable here is crowd psychology rather than climate physiology.",
  },
  levis: {
    id: 'levis',
    coords: { lat: 37.40, lng: -121.97 },
    altitudeM: 12,
    avgTempJune: 21,
    avgTempJuly: 23,
    humidityLabel: 'Low',
    climateChallenge: 2,
    altitudeChallenge: 1,
    travelNote:
      "The Bay Area's climate is one of the tournament's most neutral variables. Moderate temperatures, low humidity, sea-level altitude. Silicon Valley in June represents one of the most physiologically comfortable environments in the competition.",
  },
  hardrock: {
    id: 'hardrock',
    coords: { lat: 25.96, lng: -80.24 },
    altitudeM: 4,
    avgTempJune: 30,
    avgTempJuly: 31,
    humidityLabel: 'Very High',
    climateChallenge: 9,
    altitudeChallenge: 1,
    travelNote:
      "Miami in June is the tournament's most extreme climate environment outside altitude. 30°C+ ambient temperature combined with very high humidity creates conditions that fundamentally test squad depth. CONMEBOL teams adapt; European squads without protocols carry a real physiological deficit.",
  },
  gillette: {
    id: 'gillette',
    coords: { lat: 42.09, lng: -71.26 },
    altitudeM: 18,
    avgTempJune: 21,
    avgTempJuly: 24,
    humidityLabel: 'Moderate',
    climateChallenge: 3,
    altitudeChallenge: 1,
    travelNote:
      "New England's summer climate is the most moderate of the East Coast venues. Foxborough can be breezy and cooler than anticipated — a variable that affects tempo-dependent tactical systems disproportionately.",
  },
  bc: {
    id: 'bc',
    coords: { lat: 49.28, lng: -123.11 },
    altitudeM: 10,
    avgTempJune: 17,
    avgTempJuly: 22,
    humidityLabel: 'Moderate',
    climateChallenge: 2,
    altitudeChallenge: 1,
    travelNote:
      "Vancouver's Pacific Northwest climate offers the tournament's most comfortable conditions of the Canadian venues. Cool, clean air and minimal humidity — a physiological advantage for any team arriving from the southern heat corridor.",
  },
  bmo: {
    id: 'bmo',
    coords: { lat: 43.63, lng: -79.42 },
    altitudeM: 76,
    avgTempJune: 22,
    avgTempJuly: 25,
    humidityLabel: 'Moderate',
    climateChallenge: 3,
    altitudeChallenge: 1,
    travelNote:
      "Toronto's Great Lakes climate brings warm summers with moderate humidity. The smallest venue in the tournament creates a different kind of pressure — intimacy amplifies intensity. Climate is a secondary variable here.",
  },
  bbva: {
    id: 'bbva',
    coords: { lat: 25.67, lng: -100.25 },
    altitudeM: 537,
    avgTempJune: 29,
    avgTempJuly: 29,
    humidityLabel: 'Moderate',
    climateChallenge: 7,
    altitudeChallenge: 3,
    travelNote:
      "Monterrey sits at 537m with a desert continental climate. Persistent heat exceeding 28°C combines with dry air to create dehydration risk. Altitude compounds the thermal load — a compound variable Lili weights carefully in conditioning models.",
  },
  akron: {
    id: 'akron',
    coords: { lat: 20.68, lng: -103.47 },
    altitudeM: 1561,
    avgTempJune: 24,
    avgTempJuly: 22,
    humidityLabel: 'Moderate',
    climateChallenge: 5,
    altitudeChallenge: 7,
    travelNote:
      "Guadalajara at 1,561m is the tournament's second most demanding altitude environment. Temperature is mild due to elevation, but aerobic capacity reduction remains significant — approximately 6–8% below sea level. Teams arriving directly from sea-level venues carry an unadapted physiological gradient.",
  },
};

// ─── Haversine distance ───────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function travelDistanceKm(fromId: string, toId: string): number {
  const from = STADIUM_ENV[fromId];
  const to   = STADIUM_ENV[toId];
  if (!from || !to || fromId === toId) return 0;
  return haversineKm(from.coords.lat, from.coords.lng, to.coords.lat, to.coords.lng);
}

// ─── Transition intelligence note ────────────────────────────────────────────

export function getTransitionNote(fromId: string, toId: string, distKm: number): string {
  const from = STADIUM_ENV[fromId];
  const to   = STADIUM_ENV[toId];
  if (!from || !to) return '';

  const altGain = to.altitudeM - from.altitudeM;
  const tempShift = to.avgTempJune - from.avgTempJune;

  if (to.altitudeM > 1400 && from.altitudeM < 500) {
    return `Major altitude gain — sea level to ${to.altitudeM.toLocaleString()}m. This is one of the most demanding environmental transitions in the tournament. Aerobic capacity contracts 6–12% without prior acclimatisation.`;
  }
  if (from.altitudeM > 1400 && to.altitudeM < 500) {
    return `Descending to sea level after high-altitude exposure. Elevated red blood cell count typically provides a transient performance advantage in the 48–72 hours following altitude.`;
  }
  if (to.climateChallenge >= 8 && from.climateChallenge <= 3) {
    return `Sharp climate transition — entering ${to.humidityLabel.toLowerCase()}-humidity heat conditions. Squads without specific heat-training protocols statistically underperform here relative to pre-match probability.`;
  }
  if (from.climateChallenge >= 8 && to.climateChallenge <= 3) {
    return `Climate relief — transitioning from extreme conditions to a temperate environment. Recovery window is extended. Match preparation benefits.`;
  }
  if (distKm > 3500) {
    return `Cross-continental transfer of ${distKm.toLocaleString()}km. Travel fatigue, timezone compression, and disrupted sleep cycles become performance variables. This is where tournament management separates contenders.`;
  }
  if (distKm > 1800) {
    return `${distKm.toLocaleString()}km transfer. Significant logistical movement — squad recovery protocols and arrival timing determine competitive readiness for the next fixture.`;
  }
  return `${distKm.toLocaleString()}km transfer. Standard intra-tournament travel.`;
}

// ─── Campaign difficulty ──────────────────────────────────────────────────────

export function computeCampaignStats(stopIds: string[]): CampaignStats {
  let totalDistanceKm  = 0;
  let totalClimateLoad = 0;
  let maxAltitudeM     = 0;
  let climateTransitions = 0;

  for (let i = 0; i < stopIds.length; i++) {
    const env = STADIUM_ENV[stopIds[i]];
    if (!env) continue;

    totalClimateLoad += env.climateChallenge + env.altitudeChallenge;
    maxAltitudeM = Math.max(maxAltitudeM, env.altitudeM);

    if (i > 0) {
      const dist = travelDistanceKm(stopIds[i - 1], stopIds[i]);
      totalDistanceKm += dist;

      const prev = STADIUM_ENV[stopIds[i - 1]];
      if (prev) {
        const tempDiff = Math.abs(env.avgTempJune - prev.avgTempJune);
        const altDiff  = Math.abs(env.altitudeM - prev.altitudeM);
        if (tempDiff > 7 || altDiff > 600) climateTransitions++;
      }
    }
  }

  const n = stopIds.length || 1;
  // Sub-scores (each capped and weighted):
  const travelScore     = Math.min(totalDistanceKm / 300, 30);          // max 30
  const climateScore    = Math.min((totalClimateLoad / (n * 20)) * 30, 30); // max 30
  const altitudeScore   = Math.min((maxAltitudeM / 2240) * 25, 25);     // max 25
  const transitionScore = Math.min(climateTransitions * 5, 15);          // max 15
  const difficultyScore = Math.round(Math.min(travelScore + climateScore + altitudeScore + transitionScore, 100));

  let difficultyLabel: CampaignStats['difficultyLabel'];
  if (difficultyScore < 20)      difficultyLabel = 'Comfortable';
  else if (difficultyScore < 40) difficultyLabel = 'Moderate';
  else if (difficultyScore < 60) difficultyLabel = 'Demanding';
  else if (difficultyScore < 78) difficultyLabel = 'Gruelling';
  else                           difficultyLabel = 'Maximum';

  const avgLoad         = totalClimateLoad / n;
  const cumulativeFatigue = Math.round(
    Math.min((totalDistanceKm / 8000) * 40 + (avgLoad / 20) * 40 + climateTransitions * 5, 100)
  );

  return {
    totalDistanceKm,
    estimatedFlightHours: Math.round(totalDistanceKm / 800),
    maxAltitudeM,
    climateTransitions,
    cumulativeFatigue,
    difficultyScore,
    difficultyLabel,
  };
}

// ─── Difficulty colour ────────────────────────────────────────────────────────

export function difficultyColor(label: CampaignStats['difficultyLabel']): string {
  const MAP: Record<CampaignStats['difficultyLabel'], string> = {
    Comfortable: '#34D399',
    Moderate:    '#60A5FA',
    Demanding:   '#FBBF24',
    Gruelling:   '#F97316',
    Maximum:     '#EF4444',
  };
  return MAP[label];
}
