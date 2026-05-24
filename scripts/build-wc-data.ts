/**
 * scripts/build-wc-data.ts
 *
 * Fetches the real WC 2026 fixture list from api-football.com, detects the
 * 12 groups via graph connectivity, and generates a complete replacement for
 * the WC_TEAMS and WC_FIXTURES sections of lib/wcData.ts.
 *
 * Usage:
 *   npx tsx scripts/build-wc-data.ts
 *
 * Output:
 *   - Console: detected groups A–L with teams
 *   - File: scripts/wc-data-generated.ts (review, then merge into lib/wcData.ts)
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const API_KEY   = process.env.API_FOOTBALL_KEY;
const LEAGUE_ID = process.env.API_FOOTBALL_LEAGUE_ID ?? '1';
const SEASON    = process.env.API_FOOTBALL_SEASON ?? '2026';
const API_BASE  = 'https://v3.football.api-sports.io';

if (!API_KEY) { console.error('❌  API_FOOTBALL_KEY missing in .env.local'); process.exit(1); }

// ─── Federation map ───────────────────────────────────────────────────────────

const FEDERATION: Record<string, string> = {
  // UEFA — Europe
  'France': 'UEFA', 'Spain': 'UEFA', 'Germany': 'UEFA', 'England': 'UEFA',
  'Portugal': 'UEFA', 'Netherlands': 'UEFA', 'Belgium': 'UEFA', 'Italy': 'UEFA',
  'Croatia': 'UEFA', 'Switzerland': 'UEFA', 'Denmark': 'UEFA', 'Poland': 'UEFA',
  'Serbia': 'UEFA', 'Austria': 'UEFA', 'Albania': 'UEFA', 'Ukraine': 'UEFA',
  'Scotland': 'UEFA', 'Turkey': 'UEFA', 'Türkiye': 'UEFA', 'Czech Republic': 'UEFA',
  'Bosnia & Herzegovina': 'UEFA', 'Slovakia': 'UEFA', 'Romania': 'UEFA',
  'Hungary': 'UEFA', 'Greece': 'UEFA', 'Norway': 'UEFA', 'Sweden': 'UEFA',
  'Wales': 'UEFA', 'Slovenia': 'UEFA', 'Bulgaria': 'UEFA', 'Ireland': 'UEFA',
  'Iceland': 'UEFA', 'Finland': 'UEFA', 'Northern Ireland': 'UEFA',
  'North Macedonia': 'UEFA', 'Montenegro': 'UEFA', 'Kosovo': 'UEFA',
  'Georgia': 'UEFA', 'Armenia': 'UEFA', 'Azerbaijan': 'UEFA',

  // CONMEBOL — South America
  'Brazil': 'CONMEBOL', 'Argentina': 'CONMEBOL', 'Colombia': 'CONMEBOL',
  'Uruguay': 'CONMEBOL', 'Ecuador': 'CONMEBOL', 'Chile': 'CONMEBOL',
  'Paraguay': 'CONMEBOL', 'Peru': 'CONMEBOL', 'Venezuela': 'CONMEBOL',
  'Bolivia': 'CONMEBOL',

  // CONCACAF — North/Central America & Caribbean
  'USA': 'CONCACAF', 'Mexico': 'CONCACAF', 'Canada': 'CONCACAF',
  'Costa Rica': 'CONCACAF', 'Panama': 'CONCACAF', 'Honduras': 'CONCACAF',
  'Jamaica': 'CONCACAF', 'Haiti': 'CONCACAF', 'El Salvador': 'CONCACAF',
  'Guatemala': 'CONCACAF', 'Cuba': 'CONCACAF', 'Trinidad & Tobago': 'CONCACAF',
  'Curacao': 'CONCACAF', 'Curaçao': 'CONCACAF',

  // CAF — Africa
  'Morocco': 'CAF', 'Nigeria': 'CAF', 'Senegal': 'CAF', 'Egypt': 'CAF',
  'Ivory Coast': 'CAF', "Côte d'Ivoire": 'CAF', 'Ghana': 'CAF',
  'Cameroon': 'CAF', 'Algeria': 'CAF', 'Tunisia': 'CAF', 'South Africa': 'CAF',
  'Mali': 'CAF', 'Burkina Faso': 'CAF', 'Guinea': 'CAF', 'Tanzania': 'CAF',
  'Zambia': 'CAF', 'Cape Verde': 'CAF', 'Cape Verde Islands': 'CAF',
  'DR Congo': 'CAF', 'Congo DR': 'CAF',
  'Ethiopia': 'CAF', 'Benin': 'CAF', 'Kenya': 'CAF', 'Mozambique': 'CAF',
  'Angola': 'CAF', 'Uganda': 'CAF', 'Zimbabwe': 'CAF', 'Equatorial Guinea': 'CAF',
  'Gabon': 'CAF', 'Comoros': 'CAF',

  // AFC — Asia
  'South Korea': 'AFC', 'Japan': 'AFC', 'Australia': 'AFC', 'Iran': 'AFC',
  'IR Iran': 'AFC', 'Saudi Arabia': 'AFC', 'Qatar': 'AFC', 'Jordan': 'AFC',
  'Uzbekistan': 'AFC', 'Iraq': 'AFC', 'Indonesia': 'AFC', 'China': 'AFC',
  'Thailand': 'AFC', 'Vietnam': 'AFC', 'Bahrain': 'AFC', 'Oman': 'AFC',
  'Kuwait': 'AFC', 'UAE': 'AFC', 'United Arab Emirates': 'AFC',
  'Tajikistan': 'AFC', 'Kyrgyzstan': 'AFC', 'India': 'AFC',

  // OFC — Oceania
  'New Zealand': 'OFC',
};

// ─── Flag map ─────────────────────────────────────────────────────────────────

const FLAG: Record<string, string> = {
  'France': '🇫🇷', 'Spain': '🇪🇸', 'Germany': '🇩🇪', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Portugal': '🇵🇹', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪', 'Italy': '🇮🇹',
  'Croatia': '🇭🇷', 'Switzerland': '🇨🇭', 'Denmark': '🇩🇰', 'Poland': '🇵🇱',
  'Serbia': '🇷🇸', 'Austria': '🇦🇹', 'Albania': '🇦🇱', 'Ukraine': '🇺🇦',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Turkey': '🇹🇷', 'Türkiye': '🇹🇷', 'Czech Republic': '🇨🇿',
  'Bosnia & Herzegovina': '🇧🇦', 'Slovakia': '🇸🇰', 'Romania': '🇷🇴',
  'Hungary': '🇭🇺', 'Greece': '🇬🇷', 'Norway': '🇳🇴', 'Sweden': '🇸🇪',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Slovenia': '🇸🇮', 'Bulgaria': '🇧🇬', 'Ireland': '🇮🇪',
  'Iceland': '🇮🇸', 'Finland': '🇫🇮', 'Georgia': '🇬🇪',
  'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'Colombia': '🇨🇴', 'Uruguay': '🇺🇾',
  'Ecuador': '🇪🇨', 'Chile': '🇨🇱', 'Paraguay': '🇵🇾', 'Peru': '🇵🇪',
  'Venezuela': '🇻🇪', 'Bolivia': '🇧🇴',
  'USA': '🇺🇸', 'Mexico': '🇲🇽', 'Canada': '🇨🇦', 'Costa Rica': '🇨🇷',
  'Panama': '🇵🇦', 'Honduras': '🇭🇳', 'Jamaica': '🇯🇲', 'Haiti': '🇭🇹',
  'El Salvador': '🇸🇻', 'Guatemala': '🇬🇹',
  'Curacao': '🇨🇼', 'Curaçao': '🇨🇼',
  'Morocco': '🇲🇦', 'Nigeria': '🇳🇬', 'Senegal': '🇸🇳', 'Egypt': '🇪🇬',
  'Ivory Coast': '🇨🇮', "Côte d'Ivoire": '🇨🇮', 'Ghana': '🇬🇭',
  'Cameroon': '🇨🇲', 'Algeria': '🇩🇿', 'Tunisia': '🇹🇳', 'South Africa': '🇿🇦',
  'Mali': '🇲🇱', 'Burkina Faso': '🇧🇫', 'Guinea': '🇬🇳', 'Tanzania': '🇹🇿',
  'Cape Verde': '🇨🇻', 'Cape Verde Islands': '🇨🇻',
  'DR Congo': '🇨🇩', 'Congo DR': '🇨🇩',
  'Benin': '🇧🇯', 'Angola': '🇦🇴', 'Uganda': '🇺🇬',
  'South Korea': '🇰🇷', 'Japan': '🇯🇵', 'Australia': '🇦🇺', 'Iran': '🇮🇷',
  'IR Iran': '🇮🇷', 'Saudi Arabia': '🇸🇦', 'Qatar': '🇶🇦', 'Jordan': '🇯🇴',
  'Uzbekistan': '🇺🇿', 'Iraq': '🇮🇶', 'Indonesia': '🇮🇩', 'China': '🇨🇳',
  'Bahrain': '🇧🇭', 'Oman': '🇴🇲', 'UAE': '🇦🇪',
  'New Zealand': '🇳🇿',
};

// ─── Strength estimates ───────────────────────────────────────────────────────

const STRENGTH: Record<string, number> = {
  'Argentina': 90, 'Brazil': 87, 'France': 88, 'Spain': 85, 'England': 85,
  'Germany': 83, 'Portugal': 81, 'Netherlands': 80, 'Italy': 78, 'Belgium': 77,
  'Croatia': 76, 'Colombia': 73, 'Morocco': 73, 'Switzerland': 73,
  'Uruguay': 75, 'Mexico': 69, 'Denmark': 72, 'USA': 72, 'South Korea': 66,
  'Ecuador': 65, 'Senegal': 68, 'Japan': 67, 'Poland': 67,
  'Turkey': 68, 'Türkiye': 68,
  'Australia': 64, 'Canada': 69, 'Egypt': 64, 'Iran': 60, 'IR Iran': 60,
  'Chile': 67, 'Saudi Arabia': 61, 'Cameroon': 64,
  'Ivory Coast': 68, "Côte d'Ivoire": 68,
  'Serbia': 69, 'Austria': 69, 'Ukraine': 67, 'Algeria': 63, 'Tunisia': 63,
  'Ghana': 62, 'Costa Rica': 60, 'Qatar': 57, 'Albania': 59, 'Uzbekistan': 56,
  'Scotland': 66, 'Panama': 58, 'New Zealand': 53, 'Jordan': 54,
  'Paraguay': 63, 'South Africa': 62, 'Czech Republic': 67,
  'Bosnia & Herzegovina': 64, 'Norway': 66, 'Sweden': 68,
  'Iraq': 62, 'Haiti': 53, 'Congo DR': 61,
  'Curaçao': 54, 'Curacao': 54,
  'Cape Verde Islands': 60, 'Cape Verde': 60,
};
const DEFAULT_STRENGTH = 58;

// ─── Venue name → our key + country ──────────────────────────────────────────

interface VenueInfo { key: string; city: string; country: 'USA' | 'Canada' | 'Mexico'; utcOffset: string }

const VENUE_MAP: Record<string, VenueInfo> = {
  'MetLife Stadium':        { key: 'metlife',   city: 'East Rutherford, NJ', country: 'USA',    utcOffset: '-04:00' },
  'SoFi Stadium':           { key: 'sofi',      city: 'Inglewood, CA',       country: 'USA',    utcOffset: '-07:00' },
  'AT&T Stadium':           { key: 'att',       city: 'Arlington, TX',       country: 'USA',    utcOffset: '-05:00' },
  'Arrowhead Stadium':      { key: 'arrowhead', city: 'Kansas City, MO',     country: 'USA',    utcOffset: '-05:00' },
  'Lumen Field':            { key: 'lumen',     city: 'Seattle, WA',         country: 'USA',    utcOffset: '-07:00' },
  'Lincoln Financial Field':{ key: 'lincoln',   city: 'Philadelphia, PA',    country: 'USA',    utcOffset: '-04:00' },
  'Mercedes-Benz Stadium':  { key: 'mercedes',  city: 'Atlanta, GA',         country: 'USA',    utcOffset: '-04:00' },
  "Levi's Stadium":         { key: 'levis',     city: 'Santa Clara, CA',     country: 'USA',    utcOffset: '-07:00' },
  'Hard Rock Stadium':      { key: 'hardrock',  city: 'Miami Gardens, FL',   country: 'USA',    utcOffset: '-04:00' },
  'Gillette Stadium':       { key: 'gillette',  city: 'Foxborough, MA',      country: 'USA',    utcOffset: '-04:00' },
  'BC Place':               { key: 'bc',        city: 'Vancouver, BC',       country: 'Canada', utcOffset: '-07:00' },
  'BMO Field':              { key: 'bmo',       city: 'Toronto, ON',         country: 'Canada', utcOffset: '-04:00' },
  'Estadio Azteca':         { key: 'azteca',    city: 'Mexico City',         country: 'Mexico', utcOffset: '-05:00' },
  'Estadio BBVA':           { key: 'bbva',      city: 'Monterrey',           country: 'Mexico', utcOffset: '-05:00' },
  'Estadio Akron':          { key: 'akron',     city: 'Guadalajara',         country: 'Mexico', utcOffset: '-05:00' },
  'NRG Stadium':            { key: 'nrg',       city: 'Houston, TX',         country: 'USA',    utcOffset: '-05:00' },
};

// ─── API types ────────────────────────────────────────────────────────────────

interface ApiFixture {
  fixture: { id: number; date: string; venue: { name: string | null; city: string | null } };
  league: { round: string };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
}

// ─── API fetch ────────────────────────────────────────────────────────────────

async function fetchFixtures(): Promise<ApiFixture[]> {
  const res = await fetch(
    `${API_BASE}/fixtures?league=${LEAGUE_ID}&season=${SEASON}`,
    { headers: { 'x-apisports-key': API_KEY!, 'x-rapidapi-host': 'v3.football.api-sports.io' } }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { errors?: unknown; response: ApiFixture[] };
  if (data.errors && Object.keys(data.errors as object).length > 0) {
    throw new Error(JSON.stringify(data.errors));
  }
  return data.response;
}

// ─── Group detection ──────────────────────────────────────────────────────────

function detectGroups(fixtures: ApiFixture[]): Map<string, string[]> {
  const adj = new Map<string, Set<string>>();
  for (const f of fixtures) {
    const h = f.teams.home.name, a = f.teams.away.name;
    if (!adj.has(h)) adj.set(h, new Set());
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(h)!.add(a);
    adj.get(a)!.add(h);
  }

  const visited = new Set<string>();
  const components: string[][] = [];
  for (const team of adj.keys()) {
    if (visited.has(team)) continue;
    const component: string[] = [];
    const queue = [team];
    while (queue.length > 0) {
      const t = queue.shift()!;
      if (visited.has(t)) continue;
      visited.add(t); component.push(t);
      for (const n of adj.get(t) ?? []) { if (!visited.has(n)) queue.push(n); }
    }
    components.push(component.sort());
  }

  const earliestDate = (teams: string[]) => {
    const s = new Set(teams);
    return Math.min(...fixtures
      .filter(f => s.has(f.teams.home.name) || s.has(f.teams.away.name))
      .map(f => new Date(f.fixture.date).getTime()));
  };
  components.sort((a, b) => earliestDate(a) - earliestDate(b));

  const groups = new Map<string, string[]>();
  'ABCDEFGHIJKL'.split('').forEach((l, i) => {
    if (components[i]) groups.set(l, components[i]);
  });
  return groups;
}

// ─── Parse matchday from round string ────────────────────────────────────────

function parseMatchday(round: string): 1 | 2 | 3 {
  const m = round.match(/(\d+)$/);
  const n = m ? Number(m[1]) : 1;
  return (n >= 1 && n <= 3 ? n : 1) as 1 | 2 | 3;
}

// ─── Build fixture id ─────────────────────────────────────────────────────────

function fixtureId(group: string, md: number, home: string, away: string): string {
  const h = home.replace(/[^A-Za-z]/g, '_').replace(/_+/g, '_');
  const a = away.replace(/[^A-Za-z]/g, '_').replace(/_+/g, '_');
  return `${group}${md}_${h}_v_${a}`;
}

// ─── Generate TypeScript output ───────────────────────────────────────────────

function generate(groups: Map<string, string[]>, fixtures: ApiFixture[]): string {
  // Team → group letter lookup
  const teamGroup = new Map<string, string>();
  for (const [letter, teams] of groups) {
    for (const t of teams) teamGroup.set(t, letter);
  }

  // ── WC_TEAMS ────────────────────────────────────────────────────────────────
  const teamLines: string[] = ['export const WC_TEAMS: WCTeam[] = ['];
  for (const [letter, teams] of groups) {
    teamLines.push(`  // Group ${letter}`);
    for (const name of teams) {
      const flag = FLAG[name] ?? '🏳';
      const fed  = FEDERATION[name] ?? 'UEFA';
      const str  = STRENGTH[name]   ?? DEFAULT_STRENGTH;
      const warn = (!FLAG[name] ? ' // ⚠️ add flag' : '') + (!FEDERATION[name] ? ' // ⚠️ verify federation' : '');
      teamLines.push(`  { name: '${name}', flag: '${flag}', group: '${letter}', federation: '${fed}', strength: ${str} },${warn}`);
    }
  }
  teamLines.push('];', '');

  // ── WC_FIXTURES ─────────────────────────────────────────────────────────────
  // Filter to group-stage only and sort by date
  const groupFixtures = fixtures
    .filter(f => f.league.round.startsWith('Group Stage'))
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());

  const fixtureLines: string[] = ['export const WC_FIXTURES: WCFixture[] = ['];
  const venueWarnings: string[] = [];

  for (const f of groupFixtures) {
    const home  = f.teams.home.name;
    const away  = f.teams.away.name;
    const group = teamGroup.get(home) ?? '?';
    const md    = parseMatchday(f.league.round);
    const id    = fixtureId(group, md, home, away);

    // Venue resolution
    const rawVenue   = f.fixture.venue.name ?? '';
    const venueInfo  = VENUE_MAP[rawVenue];
    if (!venueInfo && rawVenue) venueWarnings.push(rawVenue);
    const stadium = venueInfo?.key   ? `V.${venueInfo.key}.stadium` : `'${rawVenue || 'TBD'}'`;
    const city    = venueInfo?.city  ? `V.${venueInfo.key}.city`    : `'${f.fixture.venue.city ?? 'TBD'}'`;
    const country = venueInfo?.country ?? 'USA';

    // Date: API returns UTC, append venue UTC offset to preserve local time
    // e.g. "2026-06-11T19:00:00+00:00" + utcOffset "-05:00" is stored as local time
    const utcDate    = new Date(f.fixture.date);
    const utcOffset  = venueInfo?.utcOffset ?? '+00:00';
    // Strip original timezone, append venue offset so display is in local kickoff time
    const localIso   = f.fixture.date.replace(/[+-]\d{2}:\d{2}$/, '').replace('Z', '') + utcOffset;

    fixtureLines.push(
      `  { id: '${id}', group: '${group}', matchday: ${md}, home: '${home}', away: '${away}',`,
      `    date: '${localIso}', stadium: ${stadium}, city: ${city},`,
      `    country: '${country}', status: 'SCHEDULED' },`,
    );
  }
  fixtureLines.push('];');

  if (venueWarnings.length > 0) {
    fixtureLines.push('');
    fixtureLines.push(`// ⚠️  Unrecognised venue names from API (add to VENUE_MAP in build script):`);
    [...new Set(venueWarnings)].forEach(v => fixtureLines.push(`//   '${v}'`));
  }

  return [...teamLines, ...fixtureLines].join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔨  Building WC ${SEASON} team + fixture data from api-football.com\n`);

  const fixtures = await fetchFixtures();
  console.log(`✓  ${fixtures.length} fixtures fetched\n`);

  const groups = detectGroups(fixtures);
  if (groups.size !== 12) {
    console.warn(`⚠️  Expected 12 groups, got ${groups.size}`);
  }

  const unknownTeams: string[] = [];
  console.log('Detected groups:\n');
  for (const [letter, teams] of groups) {
    const teamStr = teams.map(t => {
      if (!FEDERATION[t]) unknownTeams.push(t);
      return `${FLAG[t] ?? '🏳'} ${t}${FEDERATION[t] ? '' : ' ⚠️'}`;
    }).join('  ·  ');
    console.log(`  Group ${letter}: ${teamStr}`);
  }

  if (unknownTeams.length > 0) {
    console.log(`\n⚠️  Still unknown (add to maps): ${unknownTeams.join(', ')}`);
  } else {
    console.log('\n✓  All 48 teams resolved\n');
  }

  const ts = [
    '// AUTO-GENERATED by scripts/build-wc-data.ts',
    `// Source: api-football.com League ${LEAGUE_ID}, Season ${SEASON}`,
    `// Generated: ${new Date().toISOString()}`,
    '//',
    '// HOW TO USE:',
    '//   1. Review group assignments and strength ratings below',
    '//   2. Replace the WC_TEAMS array in lib/wcData.ts with the one below',
    '//   3. Replace the WC_FIXTURES export in lib/wcData.ts with the one below',
    '//      (remove FIXTURE_SCHEMA, V object, and buildFixtures() — no longer needed)',
    '//   4. Run: npm run sync:sheets  to push updated data to Google Sheets',
    '',
    generate(groups, fixtures),
  ].join('\n');

  const outPath = path.resolve(__dirname, 'wc-data-generated.ts');
  fs.writeFileSync(outPath, ts);

  const groupCount = fixtures.filter(f => f.league.round.startsWith('Group Stage')).length;
  console.log(`📄  Generated: scripts/wc-data-generated.ts`);
  console.log(`    ${groups.size} groups · 48 teams · ${groupCount} group-stage fixtures\n`);
  console.log('Next: review the file, then update lib/wcData.ts\n');
}

main().catch(err => { console.error('❌', err.message ?? err); process.exit(1); });
