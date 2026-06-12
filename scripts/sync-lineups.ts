/**
 * scripts/sync-lineups.ts
 *
 * Fetches team lineups and formations for WC 2026 matches and regenerates
 * lib/lineupData.ts. Goes online to hunt formation and lineup data; does
 * NOT wait for api-football which does not provide this reliably.
 *
 * Sources (in priority order):
 *   1. SofaScore public API (no key required)
 *      → Predicted lineups 24–48h before kickoff, confirmed ~75 min before
 *   2. Fotmob public API (no key required)
 *      → Independent source; cross-validates SofaScore predicted XIs
 *   3. Baseline fallback (lib/teamFormationsBaseline.ts)
 *      → Web-researched habitual formation per team; always available
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
import { TEAM_FORMATIONS_BASELINE } from '../lib/teamFormationsBaseline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const DRY_RUN  = process.env.DRY_RUN === 'true';
const OUT_PATH = path.resolve(__dirname, '..', 'lib', 'lineupData.ts');

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
  source:     'sofascore' | 'fotmob' | 'baseline';
  updatedAt:  string;
}

// ─── Name normalisation ───────────────────────────────────────────────────────

const NAME_MAP: Record<string, string> = {
  'USA':                      'USA',
  'United States':            'USA',
  'Korea Republic':           'South Korea',
  "Côte d'Ivoire":            'Ivory Coast',
  'Ivory Coast':              'Ivory Coast',
  'Cape Verde':               'Cape Verde Islands',
  'DR Congo':                 'Congo DR',
  'IR Iran':                  'Iran',
  'Curacao':                  'Curaçao',
  'Turkey':                   'Türkiye',
  'Czechia':                  'Czech Republic',
  'Bosnia':                   'Bosnia & Herzegovina',
  'Bosnia and Herzegovina':   'Bosnia & Herzegovina',
  'Bosnia-Herzegovina':       'Bosnia & Herzegovina',
  // Fotmob variants
  'Korea Republic':           'South Korea',
  'Côte d\'Ivoire':           'Ivory Coast',
  'Cape Verde Islands':       'Cape Verde Islands',
  'Congo DR':                 'Congo DR',
  'Türkiye':                  'Türkiye',
};

function normalise(name: string): string {
  return NAME_MAP[name] ?? name;
}

function normalisePos(raw: string): Position {
  const r = raw.toLowerCase();
  if (r.includes('goal') || r === 'g') return 'GK';
  if (r.includes('defend') || r === 'd') return 'DF';
  if (r.includes('mid') || r === 'm') return 'MF';
  if (r.includes('forward') || r.includes('attack') || r.includes('striker') || r.includes('winger') || r === 'f') return 'FW';
  return 'MF';
}

// ─── SofaScore ────────────────────────────────────────────────────────────────

const SOFA_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':         'https://www.sofascore.com/',
  'Origin':          'https://www.sofascore.com',
};

async function sofaFetch<T>(endpoint: string): Promise<T | null> {
  const url = `https://api.sofascore.com/api/v1${endpoint}`;
  try {
    const res = await fetch(url, { headers: SOFA_HEADERS });
    if (!res.ok) {
      if (res.status !== 404) console.warn(`  ⚠️  SofaScore ${endpoint} → HTTP ${res.status}`);
      return null;
    }
    return await res.json() as T;
  } catch (err) {
    console.warn(`  ⚠️  SofaScore fetch error:`, err);
    return null;
  }
}

interface SofaEvent {
  id: number;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  tournament: { name: string };
  status: { type: string };
}

function isWcEvent(e: SofaEvent): boolean {
  const n = e.tournament?.name?.toLowerCase() ?? '';
  return n.includes('world cup') || n.includes('coupe du monde') || n.includes('copa mundial');
}

async function sofaEventsForDate(date: string): Promise<SofaEvent[]> {
  const data = await sofaFetch<{ events?: SofaEvent[] }>(`/sport/football/scheduled-events/${date}`);
  return (data?.events ?? []).filter(isWcEvent);
}

interface SofaLineupPlayer {
  player:        { name: string };
  jerseyNumber?: string | number;
  positionName?: string;
  position?:     string;
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

function parseSofaTeam(raw: SofaTeamLineup): TeamLineup {
  const players: LineupPlayer[] = (raw.players ?? []).map((p) => ({
    name:    p.player.name,
    number:  Number(p.jerseyNumber ?? 0),
    pos:     normalisePos(p.positionName ?? p.position ?? 'M'),
    starter: !(p.substitute ?? false),
  }));
  const coach = raw.supportStaff?.find((s) => s.role === 'manager')?.staff.name;
  return { formation: raw.formation ?? '?', players, ...(coach ? { coach } : {}) };
}

async function fetchSofaLineup(eventId: number): Promise<SofaLineupResponse | null> {
  return sofaFetch<SofaLineupResponse>(`/event/${eventId}/lineups`);
}

// ─── Fotmob ───────────────────────────────────────────────────────────────────

const FOTMOB_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':     'application/json',
};

// Fotmob uses a World Cup tournament ID. WC 2026 Fotmob ID — try 77 (WC default) and 614 (WC 2026).
const FOTMOB_WC_IDS = [614, 77];

async function fotmobFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: FOTMOB_HEADERS });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

interface FotmobMatch {
  id:       number | string;
  home:     { name: string; shortName?: string };
  away:     { name: string; shortName?: string };
  status:   { started?: boolean; finished?: boolean };
  tournamentId?: number;
}

interface FotmobLineupPlayer {
  name:         string;
  shirt?:       number;
  positionId?:  string;
  isCaptain?:   boolean;
  isSubstitute?: boolean;
}

interface FotmobTeamLineup {
  lineup?:    FotmobLineupPlayer[][];
  bench?:     FotmobLineupPlayer[];
  formation?: string;
  coachName?: string;
}

interface FotmobMatchDetails {
  lineup?: {
    homeTeam?: FotmobTeamLineup;
    awayTeam?: FotmobTeamLineup;
    confirmed?: boolean;
  };
}

function parseFotmobPos(posId?: string): Position {
  if (!posId) return 'MF';
  const p = posId.toLowerCase();
  if (p.includes('gk') || p === '1') return 'GK';
  if (p.includes('cb') || p.includes('lb') || p.includes('rb') || p.includes('def')) return 'DF';
  if (p.includes('fw') || p.includes('cf') || p.includes('ss') || p.includes('am')) return 'FW';
  return 'MF';
}

function parseFotmobTeam(raw: FotmobTeamLineup, formation: string): TeamLineup {
  const starters: LineupPlayer[] = (raw.lineup ?? []).flat().map((p) => ({
    name:    p.name,
    number:  p.shirt ?? 0,
    pos:     parseFotmobPos(p.positionId),
    starter: true,
  }));
  const bench: LineupPlayer[] = (raw.bench ?? []).map((p) => ({
    name:    p.name,
    number:  p.shirt ?? 0,
    pos:     parseFotmobPos(p.positionId),
    starter: false,
  }));
  return {
    formation,
    players: [...starters, ...bench],
    ...(raw.coachName ? { coach: raw.coachName } : {}),
  };
}

async function fetchFotmobLineup(matchId: string | number): Promise<{ home: TeamLineup; away: TeamLineup; confirmed: boolean } | null> {
  const data = await fotmobFetch<FotmobMatchDetails>(`https://www.fotmob.com/api/matchDetails?matchId=${matchId}`);
  const lu = data?.lineup;
  if (!lu?.homeTeam?.formation || !lu?.awayTeam?.formation) return null;
  return {
    home:      parseFotmobTeam(lu.homeTeam, lu.homeTeam.formation),
    away:      parseFotmobTeam(lu.awayTeam, lu.awayTeam.formation),
    confirmed: lu.confirmed ?? false,
  };
}

async function getFotmobMatchId(homeNorm: string, awayNorm: string, dateStr: string): Promise<string | null> {
  for (const tid of FOTMOB_WC_IDS) {
    const url  = `https://www.fotmob.com/api/matches?date=${dateStr.replace(/-/g, '')}&timezone=UTC`;
    const data = await fotmobFetch<{ leagues?: Array<{ id: number; matches?: FotmobMatch[] }> }>(url);
    if (!data?.leagues) continue;
    for (const league of data.leagues) {
      if (!FOTMOB_WC_IDS.includes(league.id)) continue;
      const match = (league.matches ?? []).find((m) => {
        const h = normalise(m.home?.name ?? '');
        const a = normalise(m.away?.name ?? '');
        return h === homeNorm && a === awayNorm;
      });
      if (match) return String(match.id);
    }
  }
  return null;
}

// ─── Baseline seeding ─────────────────────────────────────────────────────────
// Every WC fixture gets a baseline entry so formations are always available,
// even before match-day lineup announcements.

function makeBaselineEntry(home: string, away: string): MatchLineup {
  const hFormation = TEAM_FORMATIONS_BASELINE[home] ?? '4-3-3';
  const aFormation = TEAM_FORMATIONS_BASELINE[away] ?? '4-3-3';
  return {
    fixtureKey: `${home}|${away}`,
    home:       { formation: hFormation, players: [] },
    away:       { formation: aFormation, players: [] },
    confirmed:  false,
    source:     'baseline',
    updatedAt:  new Date().toISOString(),
  };
}

// ─── Relevant fixture window ──────────────────────────────────────────────────
// For web sources we look ±72h; baseline covers every fixture regardless.

function getRelevantDates(): string[] {
  const now   = Date.now();
  const dates = new Set<string>();
  for (const f of WC_FIXTURES) {
    const diff = new Date(f.date).getTime() - now;
    if (diff > -72 * 3_600_000 && diff < 72 * 3_600_000) {
      dates.add(f.date.slice(0, 10));
    }
  }
  return [...dates].sort();
}

// ─── Load existing data ───────────────────────────────────────────────────────

function loadExisting(): Map<string, MatchLineup> {
  const map = new Map<string, MatchLineup>();
  try {
    const content = fs.readFileSync(OUT_PATH, 'utf8');
    const match   = content.match(/MATCH_LINEUPS: MatchLineup\[\] = (\[[\s\S]*?\]);/);
    if (match?.[1]) {
      const arr = JSON.parse(match[1]) as MatchLineup[];
      for (const item of arr) map.set(item.fixtureKey, item);
    }
  } catch { /* start fresh */ }
  return map;
}

// ─── Code generation ──────────────────────────────────────────────────────────

function generateFile(lineups: MatchLineup[], updatedAt: string): string {
  const serialised = JSON.stringify(lineups, null, 2);
  return `// Auto-generated by scripts/sync-lineups.ts — do not edit manually.
// Refreshed every 30 min during the tournament via GitHub Actions.
// Sources: SofaScore (primary) → Fotmob (secondary) → baseline (always present).

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
  source: 'sofascore' | 'fotmob' | 'baseline';
  updatedAt: string;
}

export const MATCH_LINEUPS: MatchLineup[] = ${serialised};

export const LINEUPS_LAST_UPDATED = '${updatedAt}';
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎯  Syncing WC 2026 lineups [${DRY_RUN ? 'DRY RUN' : 'LIVE'}]\n`);

  const existing = loadExisting();
  const updated  = new Map<string, MatchLineup>(existing);

  // ── Step 0: Seed every fixture from baseline if not already present ────────
  console.log('  📋  Step 0: Baseline seed…');
  let seeded = 0;
  for (const f of WC_FIXTURES) {
    const key = `${f.home}|${f.away}`;
    if (!updated.has(key)) {
      updated.set(key, makeBaselineEntry(f.home, f.away));
      seeded++;
    }
  }
  console.log(`     Seeded ${seeded} new fixtures from baseline (${updated.size} total)\n`);

  // ── Step 1: SofaScore — confirmed/predicted lineups near match time ────────
  const dates = getRelevantDates();
  console.log(`  🌐  Step 1: SofaScore — dates: ${dates.join(', ') || '(none in ±72h window)'}`);
  const fixtureByKey = new Map(WC_FIXTURES.map((f) => [`${f.home}|${f.away}`, f]));

  let sofaHits = 0;
  for (const date of dates) {
    const events = await sofaEventsForDate(date);
    console.log(`     ${date}: ${events.length} WC event(s)`);

    for (const event of events) {
      const home = normalise(event.homeTeam.name);
      const away = normalise(event.awayTeam.name);
      const key  = `${home}|${away}`;

      if (!fixtureByKey.has(key)) {
        console.log(`     ⚠️  Unknown fixture: ${event.homeTeam.name} vs ${event.awayTeam.name}`);
        continue;
      }

      const raw = await fetchSofaLineup(event.id);
      if (!raw?.home?.players?.length || !raw?.away?.players?.length) {
        console.log(`     ·  ${key}: no players yet`);
        continue;
      }

      const homeLineup = parseSofaTeam(raw.home);
      const awayLineup = parseSofaTeam(raw.away);
      if (homeLineup.formation === '?' && awayLineup.formation === '?') continue;

      // If formation is missing from SofaScore, fall back to baseline.
      if (homeLineup.formation === '?') homeLineup.formation = TEAM_FORMATIONS_BASELINE[home] ?? '4-3-3';
      if (awayLineup.formation === '?') awayLineup.formation = TEAM_FORMATIONS_BASELINE[away] ?? '4-3-3';

      updated.set(key, {
        fixtureKey: key,
        home:       homeLineup,
        away:       awayLineup,
        confirmed:  raw.confirmed ?? false,
        source:     'sofascore',
        updatedAt:  new Date().toISOString(),
      });
      sofaHits++;
      console.log(`     ✓  ${key}: ${homeLineup.formation} vs ${awayLineup.formation} (${raw.confirmed ? 'confirmed' : 'predicted'})`);
    }
  }

  // ── Step 2: Fotmob — cross-validate / fill gaps for near-match fixtures ───
  console.log(`\n  📡  Step 2: Fotmob cross-check…`);
  let fotmobHits = 0;

  for (const date of dates) {
    for (const f of WC_FIXTURES.filter((x) => x.date.startsWith(date))) {
      const key     = `${f.home}|${f.away}`;
      const current = updated.get(key);

      // Skip if already confirmed from SofaScore.
      if (current?.source === 'sofascore' && current.confirmed) continue;

      const matchId = await getFotmobMatchId(f.home, f.away, date);
      if (!matchId) continue;

      const lu = await fetchFotmobLineup(matchId);
      if (!lu) continue;

      // Prefer Fotmob if it provides a confirmed lineup over a predicted SofaScore one.
      const prefer = !current || current.source === 'baseline' || (lu.confirmed && !current.confirmed);
      if (!prefer) continue;

      // Fill missing formation from baseline.
      if (!lu.home.formation || lu.home.formation === '?') lu.home.formation = TEAM_FORMATIONS_BASELINE[f.home] ?? '4-3-3';
      if (!lu.away.formation || lu.away.formation === '?') lu.away.formation = TEAM_FORMATIONS_BASELINE[f.away] ?? '4-3-3';

      updated.set(key, {
        fixtureKey: key,
        home:       lu.home,
        away:       lu.away,
        confirmed:  lu.confirmed,
        source:     'fotmob',
        updatedAt:  new Date().toISOString(),
      });
      fotmobHits++;
      console.log(`     ✓  ${key}: ${lu.home.formation} vs ${lu.away.formation} (Fotmob${lu.confirmed ? ' confirmed' : ''})`);
    }
  }

  // ── Write ─────────────────────────────────────────────────────────────────
  const lineups = [...updated.values()].sort((a, b) => a.fixtureKey.localeCompare(b.fixtureKey));
  console.log(`\n  📦  Total: ${lineups.length} fixtures — ${sofaHits} SofaScore, ${fotmobHits} Fotmob, rest baseline`);

  if (DRY_RUN) { console.log('  DRY RUN — no file written.\n'); return; }

  const now  = new Date().toISOString();
  fs.writeFileSync(OUT_PATH, generateFile(lineups, now), 'utf8');
  console.log(`  ✓  Written to lib/lineupData.ts (${now})\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
