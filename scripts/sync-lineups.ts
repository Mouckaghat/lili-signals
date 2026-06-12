/**
 * scripts/sync-lineups.ts
 *
 * Fetches team lineups and formations for WC 2026 matches and regenerates
 * lib/lineupData.ts. Designed to reduce dependency on api-football.
 *
 * Primary source:   SofaScore public API (no key required)
 *   → Publishes predicted lineups days before, confirmed ~1h before kickoff
 *   → Covers pre-match, live, and finished matches
 *
 * Fallback source:  api-football.com /fixtures/lineups
 *   → Used for finished matches where SofaScore data is absent
 *   → Requires API_FOOTBALL_KEY env var
 *
 * Usage:
 *   npx tsx scripts/sync-lineups.ts          # live write
 *   DRY_RUN=true npx tsx scripts/sync-lineups.ts  # preview only, no file write
 *
 * Called by: .github/workflows/sync-lineups.yml (every 30 min during tournament)
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { WC_FIXTURES } from '../lib/wcData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const API_KEY   = process.env.API_FOOTBALL_KEY;
const LEAGUE_ID = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1);
const SEASON    = 2026;
const DRY_RUN   = process.env.DRY_RUN === 'true';
const OUT_PATH  = path.resolve(__dirname, '..', 'lib', 'lineupData.ts');

// ─── Types ────────────────────────────────────────────────────────────────────

type Position = 'GK' | 'DF' | 'MF' | 'FW';

interface LineupPlayer {
  name:    string;
  number:  number;
  pos:     Position;
  starter: boolean;
}

interface TeamLineup {
  formation: string;
  players:   LineupPlayer[];
  coach?:    string;
}

interface MatchLineup {
  fixtureKey: string;
  home:       TeamLineup;
  away:       TeamLineup;
  confirmed:  boolean;
  source:     'sofascore' | 'api-football';
  updatedAt:  string;
}

// ─── Team name normalisation ──────────────────────────────────────────────────
// SofaScore and api-football use different names for some teams.

const SOFASCORE_NAME_MAP: Record<string, string> = {
  'USA':                      'USA',
  'United States':            'USA',
  'Korea Republic':           'South Korea',
  "Côte d'Ivoire":            'Ivory Coast',
  "Ivory Coast":              'Ivory Coast',
  'Cape Verde':               'Cape Verde Islands',
  'DR Congo':                 'Congo DR',
  'IR Iran':                  'Iran',
  'Curacao':                  'Curaçao',
  'Turkey':                   'Türkiye',
  'Czechia':                  'Czech Republic',
  'Bosnia':                   'Bosnia & Herzegovina',
  'Bosnia and Herzegovina':   'Bosnia & Herzegovina',
  'Bosnia-Herzegovina':       'Bosnia & Herzegovina',
};

function normalise(name: string): string {
  return SOFASCORE_NAME_MAP[name] ?? name;
}

// ─── Position normalisation ───────────────────────────────────────────────────

function normalisePos(raw: string): Position {
  const r = raw.toLowerCase();
  if (r.includes('goal'))    return 'GK';
  if (r.includes('defend'))  return 'DF';
  if (r.includes('mid'))     return 'MF';
  if (r.includes('forward') || r.includes('attack') || r.includes('striker') || r.includes('winger')) return 'FW';
  // SofaScore position codes: G, D, M, F
  if (r === 'g') return 'GK';
  if (r === 'd') return 'DF';
  if (r === 'm') return 'MF';
  if (r === 'f') return 'FW';
  return 'MF'; // safe fallback
}

// ─── SofaScore fetcher ────────────────────────────────────────────────────────

const SOFASCORE_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':         'https://www.sofascore.com/',
  'Origin':          'https://www.sofascore.com',
};

async function sofascoreFetch<T>(endpoint: string): Promise<T | null> {
  const url = `https://api.sofascore.com/api/v1${endpoint}`;
  try {
    const res = await fetch(url, { headers: SOFASCORE_HEADERS });
    if (!res.ok) {
      if (res.status !== 404) console.warn(`  ⚠️  SofaScore ${endpoint} → HTTP ${res.status}`);
      return null;
    }
    return await res.json() as T;
  } catch (err) {
    console.warn(`  ⚠️  SofaScore fetch error ${endpoint}:`, err);
    return null;
  }
}

interface SofaEvent {
  id: number;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  tournament: { name: string; uniqueTournament?: { id: number } };
  status: { type: string; short?: string };
}

interface SofaScheduledResponse {
  events?: SofaEvent[];
}

interface SofaLineupPlayer {
  player:        { name: string; id: number };
  jerseyNumber?: string | number;
  position?:     string;
  positionName?: string;
  substitute?:   boolean;
}

interface SofaTeamLineup {
  formation?: string;
  players?:   SofaLineupPlayer[];
  supportStaff?: Array<{ staff: { name: string }; role: string }>;
}

interface SofaLineupResponse {
  home?:      SofaTeamLineup;
  away?:      SofaTeamLineup;
  confirmed?: boolean;
}

function isWcEvent(event: SofaEvent): boolean {
  const name = event.tournament?.name?.toLowerCase() ?? '';
  return name.includes('world cup') || name.includes('coupe du monde') || name.includes('copa mundial');
}

async function getSofaEventsForDate(dateStr: string): Promise<SofaEvent[]> {
  const data = await sofascoreFetch<SofaScheduledResponse>(`/sport/football/scheduled-events/${dateStr}`);
  return (data?.events ?? []).filter(isWcEvent);
}

function parseSofaTeam(raw: SofaTeamLineup): TeamLineup {
  const players: LineupPlayer[] = (raw.players ?? []).map((p) => ({
    name:    p.player.name,
    number:  Number(p.jerseyNumber ?? 0),
    pos:     normalisePos(p.positionName ?? p.position ?? 'M'),
    starter: !(p.substitute ?? false),
  }));

  const coach = raw.supportStaff?.find((s) => s.role === 'manager')?.staff.name;

  return {
    formation: raw.formation ?? '?',
    players,
    ...(coach ? { coach } : {}),
  };
}

async function fetchSofaLineup(eventId: number): Promise<SofaLineupResponse | null> {
  return sofascoreFetch<SofaLineupResponse>(`/event/${eventId}/lineups`);
}

// ─── api-football fixture ID resolver ────────────────────────────────────────

interface ApiFixture {
  fixture: { id: number };
  teams:   { home: { name: string }; away: { name: string } };
}

interface ApiLineupEntry {
  team:        { name: string };
  formation?:  string;
  startXI?:    Array<{ player: { name: string; number: number; pos: string } }>;
  substitutes?: Array<{ player: { name: string; number: number; pos: string } }>;
  coach?:      { name: string };
}

async function apiFetch<T>(endpoint: string): Promise<T | null> {
  if (!API_KEY) return null;
  const url = `https://v3.football.api-sports.io${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { 'x-apisports-key': API_KEY },
    });
    if (!res.ok) { console.warn(`  ⚠️  api-football ${endpoint} → HTTP ${res.status}`); return null; }
    const json = await res.json() as { response: T; errors?: unknown };
    if (json.errors && Object.keys(json.errors as object).length > 0) {
      console.warn(`  ⚠️  api-football error:`, json.errors);
    }
    return json.response;
  } catch (err) {
    console.warn(`  ⚠️  api-football fetch error ${endpoint}:`, err);
    return null;
  }
}

async function getApiFootballFixtureIds(): Promise<Map<string, number>> {
  const fixtures = await apiFetch<ApiFixture[]>(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
  if (!fixtures) return new Map();
  const map = new Map<string, number>();
  for (const f of fixtures) {
    const home = normalise(f.teams.home.name);
    const away = normalise(f.teams.away.name);
    map.set(`${home}|${away}`, f.fixture.id);
  }
  return map;
}

function parseApiTeam(raw: ApiLineupEntry): TeamLineup {
  const starters: LineupPlayer[] = (raw.startXI ?? []).map((e) => ({
    name:    e.player.name,
    number:  e.player.number,
    pos:     normalisePos(e.player.pos),
    starter: true,
  }));
  const bench: LineupPlayer[] = (raw.substitutes ?? []).map((e) => ({
    name:    e.player.name,
    number:  e.player.number,
    pos:     normalisePos(e.player.pos),
    starter: false,
  }));
  return {
    formation: raw.formation ?? '?',
    players:   [...starters, ...bench],
    ...(raw.coach?.name ? { coach: raw.coach.name } : {}),
  };
}

async function fetchApiFootballLineup(fixtureId: number): Promise<{ home: TeamLineup; away: TeamLineup } | null> {
  const entries = await apiFetch<ApiLineupEntry[]>(`/fixtures/lineups?fixture=${fixtureId}`);
  if (!entries || entries.length < 2) return null;
  const homeEntry = entries[0];
  const awayEntry = entries[1];
  if (!homeEntry?.formation || !awayEntry?.formation) return null;
  return { home: parseApiTeam(homeEntry), away: parseApiTeam(awayEntry) };
}

// ─── Relevant fixture window ──────────────────────────────────────────────────
// Sync: lineups for matches in the past 48h and next 48h.
// Confirmed past lineups don't need re-fetching, but we re-fetch anyway to
// catch late corrections. The script is fast enough for this window size.

function getRelevantDates(): string[] {
  const now = Date.now();
  const dates = new Set<string>();
  for (const f of WC_FIXTURES) {
    const kickoff = new Date(f.date).getTime();
    const diff    = kickoff - now;
    // Within 48h future or 48h past
    if (diff > -48 * 3_600_000 && diff < 48 * 3_600_000) {
      dates.add(f.date.slice(0, 10));
    }
  }
  return [...dates].sort();
}

// ─── Load existing data ───────────────────────────────────────────────────────

function loadExistingLineups(): Map<string, MatchLineup> {
  const map = new Map<string, MatchLineup>();
  try {
    const content = fs.readFileSync(OUT_PATH, 'utf8');
    // Quick parse: extract the JSON array from the TS file.
    const match = content.match(/MATCH_LINEUPS: MatchLineup\[\] = (\[[\s\S]*?\]);/);
    if (match?.[1]) {
      const arr = JSON.parse(match[1]) as MatchLineup[];
      for (const item of arr) map.set(item.fixtureKey, item);
    }
  } catch {
    // File doesn't exist or is empty — start fresh
  }
  return map;
}

// ─── Code generation ──────────────────────────────────────────────────────────

function generateFile(lineups: MatchLineup[], updatedAt: string): string {
  const serialised = JSON.stringify(lineups, null, 2)
    .split('\n')
    .join('\n');

  return `// Auto-generated by scripts/sync-lineups.ts — do not edit manually.
// Refreshed every 30 min during the tournament via GitHub Actions.
// Primary source: SofaScore (pre-match, ~1h before kickoff).
// Fallback: api-football (post-match confirmed).

export type Position = 'GK' | 'DF' | 'MF' | 'FW';

export interface LineupPlayer {
  name: string;
  number: number;
  pos: Position;
  starter: boolean;
}

export interface TeamLineup {
  formation: string;
  players: LineupPlayer[];
  coach?: string;
}

export interface MatchLineup {
  fixtureKey: string;
  home: TeamLineup;
  away: TeamLineup;
  confirmed: boolean;
  source: 'sofascore' | 'api-football';
  updatedAt: string;
}

export const MATCH_LINEUPS: MatchLineup[] = ${serialised};

export const LINEUPS_LAST_UPDATED = '${updatedAt}';
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎯  Syncing WC 2026 lineups [${DRY_RUN ? 'DRY RUN' : 'LIVE'}]\n`);

  const existing  = loadExistingLineups();
  const dates     = getRelevantDates();
  const updated   = new Map<string, MatchLineup>(existing);

  console.log(`  📅  Relevant dates: ${dates.join(', ') || '(none in window)'}\n`);

  // ── Phase 1: SofaScore ────────────────────────────────────────────────────
  console.log('  🌐  Phase 1: SofaScore…');

  // Build fixture key lookup for fast matching
  const fixtureByKey = new Map(WC_FIXTURES.map((f) => [`${f.home}|${f.away}`, f]));

  let sofaHits = 0;
  for (const date of dates) {
    const events = await getSofaEventsForDate(date);
    console.log(`     ${date}: ${events.length} WC event(s) on SofaScore`);

    for (const event of events) {
      const homeNorm = normalise(event.homeTeam.name);
      const awayNorm = normalise(event.awayTeam.name);
      const key      = `${homeNorm}|${awayNorm}`;

      if (!fixtureByKey.has(key)) {
        console.log(`     ⚠️  No fixture match for: ${event.homeTeam.name} vs ${event.awayTeam.name} (key: ${key})`);
        continue;
      }

      const lineup = await fetchSofaLineup(event.id);
      if (!lineup?.home?.players?.length || !lineup?.away?.players?.length) {
        console.log(`     ·  ${key}: no lineup yet`);
        continue;
      }

      const home = parseSofaTeam(lineup.home);
      const away = parseSofaTeam(lineup.away);

      if (home.formation === '?' && away.formation === '?') continue;

      const entry: MatchLineup = {
        fixtureKey: key,
        home,
        away,
        confirmed:  lineup.confirmed ?? false,
        source:     'sofascore',
        updatedAt:  new Date().toISOString(),
      };

      updated.set(key, entry);
      sofaHits++;
      const status = entry.confirmed ? '✅ confirmed' : '🔮 predicted';
      console.log(`     ✓  ${key}: ${home.formation} vs ${away.formation} (${status})`);
    }
  }

  // ── Phase 2: api-football fallback ────────────────────────────────────────
  // For finished matches that SofaScore missed, try api-football.
  if (API_KEY) {
    console.log('\n  🔌  Phase 2: api-football fallback…');

    const now    = Date.now();
    const missed = WC_FIXTURES.filter((f) => {
      const key     = `${f.home}|${f.away}`;
      const kickoff = new Date(f.date).getTime();
      const elapsed = (now - kickoff) / 3_600_000;
      // Finished (>2.5h ago) and not yet confirmed from SofaScore
      return elapsed > 2.5 && (!updated.has(key) || !updated.get(key)!.confirmed);
    });

    if (missed.length > 0) {
      const idMap = await getApiFootballFixtureIds();

      for (const f of missed) {
        const key       = `${f.home}|${f.away}`;
        const fixtureId = idMap.get(key);
        if (!fixtureId) continue;

        const lineup = await fetchApiFootballLineup(fixtureId);
        if (!lineup) continue;

        const entry: MatchLineup = {
          fixtureKey: key,
          home:       lineup.home,
          away:       lineup.away,
          confirmed:  true,
          source:     'api-football',
          updatedAt:  new Date().toISOString(),
        };

        updated.set(key, entry);
        console.log(`     ✓  ${key}: ${lineup.home.formation} vs ${lineup.away.formation} (api-football)`);
      }
    } else {
      console.log('     · No missed matches needing fallback');
    }
  }

  // ── Write ─────────────────────────────────────────────────────────────────
  const lineups = [...updated.values()].sort((a, b) => a.fixtureKey.localeCompare(b.fixtureKey));
  console.log(`\n  📦  Total lineups: ${lineups.length} (${sofaHits} new/updated from SofaScore)`);

  if (DRY_RUN) {
    console.log('  DRY RUN — no file written.\n');
    return;
  }

  const now  = new Date().toISOString();
  const code = generateFile(lineups, now);
  fs.writeFileSync(OUT_PATH, code, 'utf8');
  console.log(`  ✓  Written to lib/lineupData.ts (${now})\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
