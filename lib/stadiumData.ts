// WC 2026 Stadium Intelligence — data layer
// Aligned with venue keys in lib/wcData.ts

export interface StadiumInfo {
  id: string;            // matches V key in wcData.ts
  name: string;
  shortName: string;
  city: string;
  state: string;
  country: 'USA' | 'Canada' | 'Mexico';
  flag: string;
  capacity: number;
  opened: number;
  surface: 'Grass' | 'FieldTurf';
  identity: string;      // Lili's atmospheric analysis
  atmosphereTag: 'Electric' | 'Historic' | 'Modern' | 'Fortress' | 'Intimate';
  pressureIndex: number; // 1–10
  groups: string[];
  specialMatch?: 'Opening' | 'Final';
  coords: [number, number]; // [lat, lon]
}

// ─── 15 WC 2026 Venues ────────────────────────────────────────────────────────

export const STADIUMS: StadiumInfo[] = [
  {
    id: 'metlife',
    name: 'MetLife Stadium',
    shortName: 'MetLife',
    city: 'East Rutherford',
    state: 'New Jersey',
    country: 'USA',
    flag: '🇺🇸',
    capacity: 82_500,
    opened: 2010,
    surface: 'FieldTurf',
    atmosphereTag: 'Electric',
    pressureIndex: 10,
    groups: ['A', 'C', 'D', 'E', 'F', 'H', 'I', 'J'],
    specialMatch: 'Final',
    coords: [40.8135, -74.0745],
    identity:
      "The Final stage. MetLife carries the weight of the entire tournament's closing chapter — the largest purpose-built NFL stadium on the East Coast becomes a global amphitheatre. Eight group-stage matches. One Final. Every major confederation passes through here. The New York market brings a media density and cultural intensity that amplifies every fixture held within these walls.",
  },
  {
    id: 'att',
    name: 'AT&T Stadium',
    shortName: 'AT&T',
    city: 'Arlington',
    state: 'Texas',
    country: 'USA',
    flag: '🇺🇸',
    capacity: 80_000,
    opened: 2009,
    surface: 'Grass',
    atmosphereTag: 'Electric',
    pressureIndex: 9,
    groups: ['A', 'B', 'C', 'D', 'G', 'I', 'J', 'K'],
    coords: [32.7480, -97.0930],
    identity:
      "The Lone Star Cathedral. AT&T Stadium's retractable roof and its colossal suspended video screen create a sensory environment unlike any other venue in world football. In Texas, all football is religion — and this structure was built for ceremony. Lili consistently assigns elevated pressure coefficients to every team that arrives in Arlington.",
  },
  {
    id: 'azteca',
    name: 'Estadio Azteca',
    shortName: 'Azteca',
    city: 'Mexico City',
    state: 'CDMX',
    country: 'Mexico',
    flag: '🇲🇽',
    capacity: 87_523,
    opened: 1966,
    surface: 'Grass',
    atmosphereTag: 'Historic',
    pressureIndex: 10,
    groups: ['B', 'F', 'H'],
    specialMatch: 'Opening',
    coords: [19.3030, -99.1506],
    identity:
      "The most storied football cathedral in the Western Hemisphere. Azteca has witnessed Pelé's brilliance and Maradona's genius. At 2,240 metres altitude, with 87,000 voices compressed into a bowl that has never been silent, it applies a pressure coefficient no other venue in this tournament can replicate. The Opening match begins here — where history always begins.",
  },
  {
    id: 'arrowhead',
    name: 'Arrowhead Stadium',
    shortName: 'Arrowhead',
    city: 'Kansas City',
    state: 'Missouri',
    country: 'USA',
    flag: '🇺🇸',
    capacity: 76_416,
    opened: 1972,
    surface: 'Grass',
    atmosphereTag: 'Fortress',
    pressureIndex: 8,
    groups: ['C', 'D', 'G', 'H'],
    coords: [39.0490, -94.4840],
    identity:
      "Consistently ranked the loudest NFL stadium on the continent. Arrowhead's bowl design traps and amplifies crowd noise to physiologically disorienting levels — recorded peaks exceed 140 dB. For visiting teams unaccustomed to this atmospheric compression, Kansas City represents one of the tournament's most underestimated psychological tests.",
  },
  {
    id: 'mercedes',
    name: 'Mercedes-Benz Stadium',
    shortName: 'Mercedes-Benz',
    city: 'Atlanta',
    state: 'Georgia',
    country: 'USA',
    flag: '🇺🇸',
    capacity: 71_000,
    opened: 2017,
    surface: 'FieldTurf',
    atmosphereTag: 'Modern',
    pressureIndex: 7,
    groups: ['B', 'E', 'F', 'I', 'K'],
    coords: [33.7553, -84.4006],
    identity:
      "Atlanta's retractable-roof arena is architecturally singular — a halo roof with eight moving petals designed to resemble a camera aperture opening. The interior creates a theatre of controlled atmosphere. Lili rates it for its visual intensity and contained crowd energy — a stadium that rewards technical football with a dramatic frame.",
  },
  {
    id: 'sofi',
    name: 'SoFi Stadium',
    shortName: 'SoFi',
    city: 'Inglewood',
    state: 'California',
    country: 'USA',
    flag: '🇺🇸',
    capacity: 70_240,
    opened: 2020,
    surface: 'Grass',
    atmosphereTag: 'Modern',
    pressureIndex: 8,
    groups: ['A', 'B', 'D', 'G', 'H', 'K', 'L'],
    coords: [33.9535, -118.3392],
    identity:
      "The most expensive stadium ever constructed. SoFi's translucent canopy and sunken field create a venue that feels simultaneously open and intimate. Los Angeles brings global media density and genuine football diaspora — the CA fanbase generates atmospheric pressure that surprises visiting teams. The Hollywood effect is real.",
  },
  {
    id: 'lumen',
    name: 'Lumen Field',
    shortName: 'Lumen',
    city: 'Seattle',
    state: 'Washington',
    country: 'USA',
    flag: '🇺🇸',
    capacity: 68_740,
    opened: 2002,
    surface: 'FieldTurf',
    atmosphereTag: 'Fortress',
    pressureIndex: 8,
    groups: ['A', 'C', 'K', 'L'],
    coords: [47.5952, -122.3316],
    identity:
      "Seattle's enclosed stadium generates its own acoustic weather system. The partial roof creates a noise trap that once recorded 137.6 dB — at the time a world record for crowd noise. For visiting teams unaccustomed to this compression, Lumen Field is a disorienting environment. Lili flags it consistently as an upset-probability multiplier.",
  },
  {
    id: 'lincoln',
    name: 'Lincoln Financial Field',
    shortName: 'Lincoln',
    city: 'Philadelphia',
    state: 'Pennsylvania',
    country: 'USA',
    flag: '🇺🇸',
    capacity: 69_328,
    opened: 2003,
    surface: 'Grass',
    atmosphereTag: 'Fortress',
    pressureIndex: 7,
    groups: ['E', 'F', 'J', 'L'],
    coords: [39.9009, -75.1674],
    identity:
      "Philadelphia carries an edge that transfers to every major event held here. Lincoln Financial's compact bowl and the city's uncompromising fan culture create a particular atmosphere for European and South American teams unused to crowd hostility from a non-home fixture. Lili notes this as a venue where expected scorelines compress.",
  },
  {
    id: 'levis',
    name: "Levi's Stadium",
    shortName: "Levi's",
    city: 'Santa Clara',
    state: 'California',
    country: 'USA',
    flag: '🇺🇸',
    capacity: 68_500,
    opened: 2014,
    surface: 'Grass',
    atmosphereTag: 'Modern',
    pressureIndex: 6,
    groups: ['B', 'G', 'I', 'J'],
    coords: [37.4033, -121.9694],
    identity:
      "Silicon Valley's stadium sits within walking distance of Apple Park. Levi's brings the Bay Area's cosmopolitan diversity — a genuinely global crowd that creates a festival atmosphere rather than pure football tribalism. Lili rates it moderately on pressure but highly on spectacle. The stadium that believes technology and football belong together.",
  },
  {
    id: 'hardrock',
    name: 'Hard Rock Stadium',
    shortName: 'Hard Rock',
    city: 'Miami Gardens',
    state: 'Florida',
    country: 'USA',
    flag: '🇺🇸',
    capacity: 65_326,
    opened: 1987,
    surface: 'Grass',
    atmosphereTag: 'Electric',
    pressureIndex: 8,
    groups: ['A', 'D', 'F', 'H', 'K', 'L'],
    coords: [25.9580, -80.2389],
    identity:
      "Miami's heat, its Latin pulse, its football diaspora. Hard Rock carries the energy of a city that contains multitudes — Caribbean passion, South American intensity, European expectation. For CONMEBOL teams especially, playing in Miami approaches a home fixture. Lili weights this crowd-advantage variable carefully in its probability engine.",
  },
  {
    id: 'gillette',
    name: 'Gillette Stadium',
    shortName: 'Gillette',
    city: 'Foxborough',
    state: 'Massachusetts',
    country: 'USA',
    flag: '🇺🇸',
    capacity: 65_878,
    opened: 2002,
    surface: 'FieldTurf',
    atmosphereTag: 'Fortress',
    pressureIndex: 7,
    groups: ['B', 'D', 'H', 'J', 'K', 'L'],
    coords: [42.0909, -71.2643],
    identity:
      "New England's sporting cathedral carries the weight of multiple dynasties. Gillette's compact bowl and the potential for cold-weather conditions create variables that fundamentally alter match dynamics. Lili identifies it as one of the tournament's most tactically demanding environments — preparation matters more here than at any other USA venue.",
  },
  {
    id: 'bc',
    name: 'BC Place',
    shortName: 'BC Place',
    city: 'Vancouver',
    state: 'British Columbia',
    country: 'Canada',
    flag: '🇨🇦',
    capacity: 54_500,
    opened: 1983,
    surface: 'FieldTurf',
    atmosphereTag: 'Intimate',
    pressureIndex: 6,
    groups: ['C', 'G', 'I', 'L'],
    coords: [49.2767, -123.1116],
    identity:
      "Vancouver's covered arena brings a unique sonic character — the retractable roof can either open to Pacific air or seal in crowd sound. As Canada's westernmost venue, BC Place carries a frontier energy. The city's multicultural football community creates unexpectedly intense atmospheres for global fixtures. A quiet surprise in the tournament roster.",
  },
  {
    id: 'bmo',
    name: 'BMO Field',
    shortName: 'BMO',
    city: 'Toronto',
    state: 'Ontario',
    country: 'Canada',
    flag: '🇨🇦',
    capacity: 45_736,
    opened: 2007,
    surface: 'Grass',
    atmosphereTag: 'Intimate',
    pressureIndex: 5,
    groups: ['C'],
    coords: [43.6333, -79.4184],
    identity:
      "The tournament's most intimate venue — but Toronto's density and football passion punch well above BMO's 45,000 capacity. Canada's largest city carries MLS heritage, global diaspora communities, and a newly emerged national football identity. Lili identifies BMO as a venue where upset potential is structurally underestimated by pre-match models.",
  },
  {
    id: 'bbva',
    name: 'Estadio BBVA',
    shortName: 'BBVA',
    city: 'Monterrey',
    state: 'Nuevo León',
    country: 'Mexico',
    flag: '🇲🇽',
    capacity: 51_348,
    opened: 2015,
    surface: 'Grass',
    atmosphereTag: 'Historic',
    pressureIndex: 7,
    groups: ['E', 'G', 'I'],
    coords: [25.6691, -100.2396],
    identity:
      "Estadio BBVA is architecturally framed by Cerro de la Silla — the mountain becomes part of the backdrop, creating a stadium with no visual parallel in the tournament. Monterrey's industrial intensity translates directly into crowd character. Lili rates BBVA as one of the most underestimated atmospheric venues in the competition.",
  },
  {
    id: 'akron',
    name: 'Estadio Akron',
    shortName: 'Akron',
    city: 'Guadalajara',
    state: 'Jalisco',
    country: 'Mexico',
    flag: '🇲🇽',
    capacity: 49_850,
    opened: 2010,
    surface: 'Grass',
    atmosphereTag: 'Intimate',
    pressureIndex: 7,
    groups: ['E', 'F', 'J'],
    coords: [20.6765, -103.3920],
    identity:
      "Mexico's second city carries a football identity distinct from Mexico City's Azteca gravity. Guadalajara's culture is fierce, local, and proudly Jalisco. Estadio Akron's compact bowl concentrates that intensity. For European teams playing their first Mexican venue — the combination of altitude, heat and crowd creates a compound variable Lili weights significantly.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getStadium(id: string): StadiumInfo | undefined {
  return STADIUMS.find((s) => s.id === id);
}

export function getStadiumsByCountry(country: 'USA' | 'Canada' | 'Mexico'): StadiumInfo[] {
  return STADIUMS.filter((s) => s.country === country);
}

// Maps the exact stadium name string (from WC_FIXTURES) → StadiumInfo id
export const FIXTURE_STADIUM_ID: Record<string, string> = {
  'MetLife Stadium':        'metlife',
  'SoFi Stadium':           'sofi',
  'AT&T Stadium':           'att',
  'Arrowhead Stadium':      'arrowhead',
  'Lumen Field':            'lumen',
  'Lincoln Financial Field':'lincoln',
  'Mercedes-Benz Stadium':  'mercedes',
  "Levi's Stadium":         'levis',
  'Hard Rock Stadium':      'hardrock',
  'Gillette Stadium':       'gillette',
  'BC Place':               'bc',
  'BMO Field':              'bmo',
  'Estadio Azteca':         'azteca',
  'Estadio BBVA':           'bbva',
  'Estadio Akron':          'akron',
};

export const ATMOSPHERE_COLOR: Record<StadiumInfo['atmosphereTag'], string> = {
  Electric: '#FF7B35',
  Historic:  '#C8962A',
  Modern:    '#4A9EFF',
  Fortress:  '#FF5B5B',
  Intimate:  '#34D399',
};
