/**
 * scripts/sync-to-sheets.ts
 *
 * Syncs Worldcupilou WC 2026 static data → Google Sheets.
 * Reads directly from lib/wcData.ts and lib/stadiumData.ts — single source of truth.
 *
 * Usage:
 *   npx tsx scripts/sync-to-sheets.ts
 *
 * Tabs written:
 *   fixtures  — 72 group-stage rows (headers preserved, data replaced)
 *   teams     — 48 teams (headers + data rewritten)
 *   venues    — 15 venues (headers + data rewritten)
 *   groups    — 12 groups (headers + data rewritten)
 *   standings — 48 teams at 0 pts (headers + data rewritten)
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { WC_TEAMS, WC_FIXTURES } from '../lib/wcData';
import { STADIUMS } from '../lib/stadiumData';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

// ─── Config ───────────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.SHEETS_SPREADSHEET_ID;
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!SPREADSHEET_ID) {
  console.error('❌  SHEETS_SPREADSHEET_ID is not set in .env.local');
  process.exit(1);
}
if (!CREDENTIALS_PATH) {
  console.error('❌  GOOGLE_APPLICATION_CREDENTIALS is not set in .env.local');
  process.exit(1);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(__dirname, '..', CREDENTIALS_PATH),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ─── Helpers ──────────────────────────────────────────────────────────────────

type CellValue = string | number | null;

/**
 * Extracts local kickoff date + time from a fixture ISO string.
 * e.g. "2026-06-12T14:00:00-04:00" → date="2026-06-12", time="14:00"
 * The local time is the official kickoff time as published by FIFA.
 */
function parseFixtureDateTime(iso: string): { date: string; timeLocal: string } {
  const date = iso.substring(0, 10);
  const localMatch = iso.match(/T(\d{2}:\d{2})/);
  const timeLocal = localMatch ? localMatch[1] : '';
  return { date, timeLocal };
}

/** Map wcData internal status → Sheet allowed values */
function mapStatus(status: string): string {
  if (status === 'SCHEDULED') return 'UPCOMING';
  return status; // LIVE, FINISHED, POSTPONED pass through as-is
}

/**
 * Clears rows 2+ of a tab (preserving the header row) and writes new rows.
 * Use this for the `fixtures` tab where headers are already configured with
 * data validation in the sheet.
 */
async function writeTabKeepHeader(tabName: string, rows: CellValue[][]): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${tabName}!A2:Z`,
  });

  if (rows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID!,
      range: `${tabName}!A2`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });
  }

  console.log(`  ✓  ${tabName}: ${rows.length} rows written (header preserved)`);
}

/**
 * Clears the entire tab from A1 and writes header + data rows.
 * Use this for tabs that don't have pre-configured headers yet.
 */
async function writeTabWithHeader(
  tabName: string,
  headers: string[],
  rows: CellValue[][]
): Promise<void> {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${tabName}!A1:Z`,
  });

  const allRows: CellValue[][] = [headers, ...rows];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${tabName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: allRows },
  });

  console.log(`  ✓  ${tabName}: ${rows.length} rows written (+ header)`);
}

// ─── Data builders ────────────────────────────────────────────────────────────

/**
 * fixtures tab — matches the existing header:
 * matchId | date | time | stage | group | homeTeam | awayTeam | venue | city
 *         | status | homeScore | awayScore | winner
 */
function buildFixtureRows(): CellValue[][] {
  return WC_FIXTURES.map((f) => {
    const { date, timeLocal } = parseFixtureDateTime(f.date);
    return [
      f.id,
      date,
      timeLocal,                       // local venue kickoff time (official FIFA time)
      `Group Stage MD${f.matchday}`,
      f.group,
      f.home,
      f.away,
      f.stadium,
      f.city,
      mapStatus(f.status),
      f.homeScore ?? null,             // blank if no result
      f.awayScore ?? null,
      null,                            // winner — blank until result confirmed
    ];
  });
}

/**
 * teams tab
 * name | flag | group | federation | strength
 */
function buildTeamRows(): CellValue[][] {
  return WC_TEAMS.map((t) => [t.name, t.flag, t.group, t.federation, t.strength]);
}

const TEAM_HEADERS = ['name', 'flag', 'group', 'federation', 'strength'];

/**
 * venues tab
 * id | name | city | state | country | capacity | surface | opened
 *    | pressureIndex | atmosphereTag | lat | lon | groups | specialMatch
 */
function buildVenueRows(): CellValue[][] {
  return STADIUMS.map((s) => [
    s.id,
    s.name,
    s.city,
    s.state,
    s.country,
    s.capacity,
    s.surface,
    s.opened,
    s.pressureIndex,
    s.atmosphereTag,
    s.coords[0],
    s.coords[1],
    s.groups.join(', '),
    s.specialMatch ?? null,
  ]);
}

const VENUE_HEADERS = [
  'id', 'name', 'city', 'state', 'country', 'capacity', 'surface', 'opened',
  'pressureIndex', 'atmosphereTag', 'lat', 'lon', 'groups', 'specialMatch',
];

/**
 * groups tab — one row per group, 4 teams side by side
 * group | team1 | flag1 | fed1 | team2 | flag2 | fed2 | team3 | flag3 | fed3 | team4 | flag4 | fed4
 */
function buildGroupRows(): CellValue[][] {
  return 'ABCDEFGHIJKL'.split('').map((g) => {
    const teams = WC_TEAMS.filter((t) => t.group === g);
    const row: CellValue[] = [g];
    teams.forEach((t) => row.push(t.name, t.flag, t.federation));
    return row;
  });
}

const GROUP_HEADERS = [
  'group',
  'team1', 'flag1', 'fed1',
  'team2', 'flag2', 'fed2',
  'team3', 'flag3', 'fed3',
  'team4', 'flag4', 'fed4',
];

/**
 * standings tab — all 48 teams at zero points (pre-tournament baseline)
 * group | team | flag | federation | played | won | drawn | lost | gf | ga | gd | pts | status
 */
function buildStandingsRows(): CellValue[][] {
  return WC_TEAMS.map((t) => [
    t.group,
    t.name,
    t.flag,
    t.federation,
    0, 0, 0, 0,   // played, won, drawn, lost
    0, 0, 0,      // gf, ga, gd
    0,            // pts
    'UPCOMING',   // status — updated manually or via live sync
  ]);
}

const STANDINGS_HEADERS = [
  'group', 'team', 'flag', 'federation',
  'played', 'won', 'drawn', 'lost',
  'gf', 'ga', 'gd', 'pts', 'status',
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌍  Worldcupilou → Google Sheets sync\n');
  console.log(`📋  Spreadsheet: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
  console.log(`📁  Credentials: ${CREDENTIALS_PATH}\n`);
  console.log(`📊  Source data: ${WC_FIXTURES.length} fixtures · ${WC_TEAMS.length} teams · ${STADIUMS.length} venues\n`);
  console.log('Writing tabs...\n');

  try {
    // fixtures: preserve header row (has data validation), write data from row 2
    await writeTabKeepHeader('fixtures', buildFixtureRows());

    // other tabs: write headers + data from row 1
    await writeTabWithHeader('teams',     TEAM_HEADERS,     buildTeamRows());
    await writeTabWithHeader('venues',    VENUE_HEADERS,    buildVenueRows());
    await writeTabWithHeader('groups',    GROUP_HEADERS,    buildGroupRows());
    await writeTabWithHeader('standings', STANDINGS_HEADERS, buildStandingsRows());

    console.log('\n✅  Sync complete.\n');
    console.log('Next steps:');
    console.log('  1. Open the spreadsheet and verify each tab.');
    console.log('  2. During the tournament, update status/score/winner in the fixtures tab.');
    console.log('  3. To publish for the app: File → Share → "Anyone with the link" → Viewer.');
    console.log('  4. Fetch in the app with:');
    console.log(`     GET https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=fixtures\n`);
  } catch (err: unknown) {
    const e = err as { message?: string; code?: number; errors?: unknown[] };
    console.error('\n❌  Sync failed:', e.message ?? err);
    if (e.code === 403) {
      console.error('\n   → The service account does not have Editor access.');
      console.error('     Share the spreadsheet with your service account email (Editor role).\n');
    }
    if (e.code === 404) {
      console.error('\n   → Spreadsheet not found. Check SHEETS_SPREADSHEET_ID in .env.local.\n');
    }
    process.exit(1);
  }
}

main();
