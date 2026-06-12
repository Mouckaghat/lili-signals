/**
 * scripts/sync-live-scores.ts
 *
 * Fetches live WC 2026 fixture results and standings from api-football.com
 * and writes them to the Worldcupilou Google Sheet.
 *
 * Usage:
 *   npx tsx scripts/sync-live-scores.ts          # live write
 *   DRY_RUN=true npx tsx scripts/sync-live-scores.ts  # preview only, no write
 *
 * Called by: .github/workflows/sync-live-scores.yml (cron)
 * Also works locally if .env.local has API_FOOTBALL_KEY set.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { WC_FIXTURES, WC_TEAMS } from '../lib/wcData';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

// ─── Config ───────────────────────────────────────────────────────────────────

const SPREADSHEET_ID      = process.env.SHEETS_SPREADSHEET_ID;
const API_KEY             = process.env.API_FOOTBALL_KEY;
const CREDENTIALS_PATH    = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const SA_JSON             = process.env.GOOGLE_SERVICE_ACCOUNT_JSON; // CI: full JSON string
const DRY_RUN             = process.env.DRY_RUN === 'true';

// ⚠️  Verify this ID in your api-football.com dashboard:
//    Competitions → search "FIFA World Cup" → note the league id for season 2026
//    WC 2022 was id=1. WC 2026 will be the same or a new id.
const WC_LEAGUE_ID = process.env.API_FOOTBALL_LEAGUE_ID
  ? Number(process.env.API_FOOTBALL_LEAGUE_ID)
  : 1;

// Override with API_FOOTBALL_SEASON=2022 to test the pipeline before 2026 is unlocked.
const WC_SEASON = process.env.API_FOOTBALL_SEASON
  ? Number(process.env.API_FOOTBALL_SEASON)
  : 2026;

const API_BASE = 'https://v3.football.api-sports.io';

if (!SPREADSHEET_ID) { console.error('❌  SHEETS_SPREADSHEET_ID missing'); process.exit(1); }
if (!API_KEY)         { console.error('❌  API_FOOTBALL_KEY missing');       process.exit(1); }
if (!CREDENTIALS_PATH && !SA_JSON) {
  console.error('❌  Set GOOGLE_APPLICATION_CREDENTIALS (local) or GOOGLE_SERVICE_ACCOUNT_JSON (CI)');
  process.exit(1);
}

// ─── Google Auth ──────────────────────────────────────────────────────────────

const auth = new google.auth.GoogleAuth({
  // In CI, the full JSON is passed as an env var string.
  // Locally, a file path is used.
  ...(SA_JSON
    ? { credentials: JSON.parse(SA_JSON) }
    : { keyFile: path.resolve(__dirname, '..', CREDENTIALS_PATH!) }),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ─── api-football.com fetch ───────────────────────────────────────────────────

async function apiFetch<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'x-apisports-key': API_KEY!,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!res.ok) {
    throw new Error(`api-football ${endpoint} → HTTP ${res.status}`);
  }

  const data = await res.json() as { errors?: unknown; response: T };

  if (data.errors && Object.keys(data.errors as object).length > 0) {
    throw new Error(`api-football error: ${JSON.stringify(data.errors)}`);
  }

  return data.response;
}

// ─── Team name normalisation ──────────────────────────────────────────────────
// api-football uses different names for some teams.
// Keys = api-football name, Values = our wcData.ts name.

const TEAM_NAME_MAP: Record<string, string> = {
  // AFC
  'Korea Republic':       'South Korea',
  'IR Iran':              'Iran',
  // CAF
  "Côte d'Ivoire":        'Ivory Coast',
  'Cape Verde':           'Cape Verde Islands',
  'DR Congo':             'Congo DR',
  // CONCACAF
  'United States':        'USA',
  'Curacao':              'Curaçao',
  // UEFA
  'Turkey':               'Türkiye',
  'Czechia':              'Czech Republic',
  'Bosnia':               'Bosnia & Herzegovina',
  'Bosnia-Herzegovina':   'Bosnia & Herzegovina',
};

function normalise(name: string): string {
  return TEAM_NAME_MAP[name] ?? name;
}

// ─── Status mapping ───────────────────────────────────────────────────────────

const LIVE_STATUSES   = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const DONE_STATUSES   = new Set(['FT', 'AET', 'PEN']);
const CANCEL_STATUSES = new Set(['PST', 'CANC', 'ABD', 'AWD', 'WO']);

function mapStatus(short: string): string {
  if (LIVE_STATUSES.has(short))   return 'LIVE';
  if (DONE_STATUSES.has(short))   return 'FINISHED';
  if (CANCEL_STATUSES.has(short)) return 'POSTPONED';
  return 'UPCOMING';
}

// ─── Types from api-football ──────────────────────────────────────────────────

interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string };
  };
  league: { round: string };
  teams: {
    home: { id: number; name: string; winner: boolean | null };
    away: { id: number; name: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

interface ApiStandingEntry {
  rank: number;
  team: { id: number; name: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

// ─── Sheet write helpers ──────────────────────────────────────────────────────

type CellValue = string | number | null;

async function writeRange(range: string, rows: CellValue[][]): Promise<void> {
  if (DRY_RUN) {
    console.log(`  [dry-run] would write ${rows.length} rows to ${range}`);
    return;
  }
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID!, range });
  if (rows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID!,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });
  }
}

// ─── Fixtures sync ────────────────────────────────────────────────────────────

async function syncFixtures(apiFixtures: ApiFixture[]): Promise<void> {
  // Build lookup: "HomeTeam|AwayTeam" → our WCFixture
  const byTeams = new Map(
    WC_FIXTURES.map((f) => [`${f.home}|${f.away}`, f])
  );

  // Track which rows we update (keyed by row index in the sheet, 1-based, row 2 = data start)
  const rowUpdates = new Map<number, CellValue[]>();

  let matched = 0;
  let skipped = 0;

  for (const af of apiFixtures) {
    const homeNorm = normalise(af.teams.home.name);
    const awayNorm = normalise(af.teams.away.name);
    const key = `${homeNorm}|${awayNorm}`;

    const ourFixture = byTeams.get(key);
    if (!ourFixture) {
      // Could be a knockout fixture (not in our group-stage data yet) — skip silently
      skipped++;
      continue;
    }

    // Find the 1-based row index of this fixture in the sheet (row 2 = first data row)
    const sheetRowIndex = WC_FIXTURES.indexOf(ourFixture) + 2;

    const status  = mapStatus(af.fixture.status.short);
    const homeScore = af.goals.home;
    const awayScore = af.goals.away;

    let winner: string | null = null;
    if (af.teams.home.winner === true)  winner = ourFixture.home;
    if (af.teams.away.winner === true)  winner = ourFixture.away;
    if (af.teams.home.winner === false && af.teams.away.winner === false) winner = 'Draw';

    // Columns: matchId(A) date(B) time(C) stage(D) group(E) homeTeam(F) awayTeam(G)
    //          venue(H) city(I) status(J) homeScore(K) awayScore(L) winner(M)
    // We only update columns J, K, L, M (status + results).
    // Use a sparse update keyed by row — store only the cells that change.
    rowUpdates.set(sheetRowIndex, [status, homeScore ?? null, awayScore ?? null, winner]);
    matched++;
  }

  if (matched === 0) {
    console.log('  ⚠️   No fixtures matched — check WC_LEAGUE_ID or team name mapping');
    return;
  }

  // Build a batchUpdate to write only columns J:M for each updated row.
  // Grouping into a single batchUpdate is more efficient than one call per row.
  if (!DRY_RUN) {
    const data = Array.from(rowUpdates.entries()).map(([row, values]) => ({
      range: `fixtures!J${row}:M${row}`,
      values: [values],
    }));

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID!,
      requestBody: { valueInputOption: 'USER_ENTERED', data },
    });
  } else {
    for (const [row, values] of rowUpdates) {
      console.log(`  [dry-run] fixtures!J${row}:M${row} →`, values);
    }
  }

  console.log(`  ✓  fixtures: ${matched} rows updated (${skipped} unmatched — team names differ from wcData.ts)`);
}

// ─── Standings sync ───────────────────────────────────────────────────────────

async function syncStandings(rawStandings: ApiStandingEntry[][]): Promise<void> {
  // rawStandings is an array of groups, each group is an array of standing entries.
  // We flatten and rebuild the full standings tab.

  const STANDINGS_HEADERS = [
    'group', 'team', 'flag', 'federation',
    'played', 'won', 'drawn', 'lost',
    'gf', 'ga', 'gd', 'pts', 'status',
  ];

  // Build a flag + federation lookup from our data
  const teamMeta = new Map(WC_TEAMS.map((t) => [t.name, { flag: t.flag, federation: t.federation }]));

  const rows: CellValue[][] = [];

  for (const group of rawStandings) {
    if (!Array.isArray(group)) continue; // API may return non-array entries before tournament starts
    for (const entry of group) {
      const teamName  = normalise(entry.team.name);
      const meta      = teamMeta.get(teamName);
      const groupLetter = entry.group.replace('Group ', '').trim();

      // Derive qualification status from rank + points
      let status = 'UPCOMING';
      if (entry.all.played > 0) {
        if (entry.rank <= 2 && entry.points >= 4)              status = 'QUALIFIED';
        else if (entry.rank <= 2)                              status = 'ALIVE';
        else if (entry.rank === 3 && entry.points >= 4)        status = 'ALIVE';
        else if (entry.rank === 3)                             status = 'AT-RISK';
        else if ((3 - entry.all.played) * 3 + entry.points < 4) status = 'ELIMINATED';
        else                                                   status = 'AT-RISK';
      }

      rows.push([
        groupLetter,
        teamName,
        meta?.flag    ?? '',
        meta?.federation ?? '',
        entry.all.played,
        entry.all.win,
        entry.all.draw,
        entry.all.lose,
        entry.all.goals.for,
        entry.all.goals.against,
        entry.goalsDiff,
        entry.points,
        status,
      ]);
    }
  }

  // Clear from row 2 and rewrite (row 1 is the header)
  await writeRange('standings!A2:Z', []);

  if (!DRY_RUN && rows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID!,
      range: 'standings!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [STANDINGS_HEADERS, ...rows] },
    });
  } else if (DRY_RUN) {
    console.log(`  [dry-run] standings: would write ${rows.length} rows`);
  }

  console.log(`  ✓  standings: ${rows.length} rows written`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const tag = DRY_RUN ? ' [DRY RUN]' : '';
  console.log(`\n⚡  Worldcupilou live sync${tag}\n`);
  console.log(`    League ID : ${WC_LEAGUE_ID} (season ${WC_SEASON})`);
  console.log(`    Sheet     : ${SPREADSHEET_ID}`);
  console.log(`    Time      : ${new Date().toISOString()}\n`);

  try {
    // ── Fixtures ──────────────────────────────────────────────
    console.log('Fetching fixtures from api-football.com...');
    const apiFixtures = await apiFetch<ApiFixture[]>(
      `/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`
    );
    console.log(`  → ${apiFixtures.length} fixtures received`);
    await syncFixtures(apiFixtures);

    // ── Standings ─────────────────────────────────────────────
    console.log('\nFetching standings from api-football.com...');
    const rawStandings = await apiFetch<ApiStandingEntry[][]>(
      `/standings?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`
    );
    const groupCount = rawStandings.length;
    console.log(`  → ${groupCount} groups received`);

    if (groupCount > 0) {
      await syncStandings(rawStandings);
    } else {
      console.log('  ⚠️   Standings not yet available (tournament not started)');
    }

    console.log('\n✅  Live sync complete.\n');
  } catch (err: unknown) {
    const e = err as { message?: string; code?: number };
    console.error('\n❌  Sync failed:', e.message ?? err);
    if (e.code === 403) {
      console.error('   → Service account needs Editor access to the spreadsheet.');
    }
    process.exit(1);
  }
}

main();
