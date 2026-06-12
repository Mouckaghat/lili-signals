/**
 * scripts/sync-injuries.ts
 *
 * Fetches current player injury & suspension data from api-football.com
 * for WC 2026 and regenerates lib/injuryData.ts.
 *
 * Usage:
 *   npx tsx scripts/sync-injuries.ts          # live write
 *   DRY_RUN=true npx tsx scripts/sync-injuries.ts  # preview only
 *
 * Called by: .github/workflows/sync-injuries.yml (every 4 h during tournament)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { WC_TEAMS } from '../lib/wcData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const API_KEY    = process.env.API_FOOTBALL_KEY;
const DRY_RUN    = process.env.DRY_RUN === 'true';
const LEAGUE_ID  = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1);
const SEASON     = 2026;
const OUT_PATH   = path.resolve(__dirname, '..', 'lib', 'injuryData.ts');

// ─── API types ────────────────────────────────────────────────────────────────

interface ApiPlayer {
  id: number;
  name: string;
}
interface ApiTeam {
  id: number;
  name: string;
}
interface ApiInjury {
  player: ApiPlayer;
  team: ApiTeam;
  fixture: { date: string };
  player_injury: { type: string; reason: string };
}

// ─── Team name normalisation ──────────────────────────────────────────────────
// Maps api-football team names → WC_TEAMS names (add entries as needed).

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

function normalise(apiName: string): string {
  return TEAM_NAME_MAP[apiName] ?? apiName;
}

// ─── Severity detection ───────────────────────────────────────────────────────

type Severity = 'OUT' | 'DOUBTFUL' | 'SUSPENDED';

function deriveSeverity(type: string, reason: string): Severity {
  const t = type.toLowerCase();
  const r = reason.toLowerCase();
  if (t.includes('suspension') || r.includes('suspen') || r.includes('red card')) return 'SUSPENDED';
  if (r.includes('doubtful') || r.includes('knock') || r.includes('minor')) return 'DOUBTFUL';
  return 'OUT';
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchInjuries(): Promise<ApiInjury[]> {
  if (!API_KEY) throw new Error('API_FOOTBALL_KEY not set');

  const url = `https://v3.football.api-sports.io/injuries?league=${LEAGUE_ID}&season=${SEASON}`;
  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY },
  });

  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const json = await res.json() as { response: ApiInjury[]; errors: unknown };

  if (json.errors && Object.keys(json.errors as object).length > 0) {
    console.warn('  ⚠️  API returned errors:', json.errors);
  }
  return json.response ?? [];
}

// ─── Build map ────────────────────────────────────────────────────────────────

interface InjuredEntry {
  name: string;
  reason: string;
  severity: Severity;
  returnDate?: string;
}

function buildMap(raw: ApiInjury[]): Record<string, InjuredEntry[]> {
  const wcTeamNames = new Set(WC_TEAMS.map((t) => t.name));
  const map: Record<string, InjuredEntry[]> = {};

  for (const item of raw) {
    const teamName = normalise(item.team.name);
    if (!wcTeamNames.has(teamName)) continue;

    const severity = deriveSeverity(
      item.player_injury?.type ?? '',
      item.player_injury?.reason ?? '',
    );

    const entry: InjuredEntry = {
      name:     item.player.name,
      reason:   item.player_injury?.reason ?? item.player_injury?.type ?? 'Unknown',
      severity,
    };

    // returnDate: use fixture date as rough proxy if available
    if (item.fixture?.date) entry.returnDate = item.fixture.date.slice(0, 10);

    if (!map[teamName]) map[teamName] = [];
    // Avoid duplicates (same player can appear across multiple fixtures)
    if (!map[teamName].some((e) => e.name === entry.name)) {
      map[teamName].push(entry);
    }
  }

  return map;
}

// ─── Code generation ──────────────────────────────────────────────────────────

function generateFile(map: Record<string, InjuredEntry[]>, updatedAt: string): string {
  const entries = Object.entries(map)
    .filter(([, players]) => players.length > 0)
    .map(([team, players]) => {
      const rows = players.map((p) => {
        const ret = p.returnDate ? `, returnDate: '${p.returnDate}'` : '';
        return `    { name: ${JSON.stringify(p.name)}, reason: ${JSON.stringify(p.reason)}, severity: '${p.severity}'${ret} },`;
      }).join('\n');
      return `  ${JSON.stringify(team)}: [\n${rows}\n  ],`;
    })
    .join('\n');

  return `// Auto-generated by scripts/sync-injuries.ts — do not edit manually.
// Refreshed every 4 hours during the tournament via GitHub Actions.

import type { InjuredPlayer } from './wcData';

// Keyed by team name (matches WC_TEAMS[].name exactly).
export const INJURED_PLAYERS: Record<string, InjuredPlayer[]> = {
${entries}
};

export const INJURY_LAST_UPDATED = '${updatedAt}';
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏥  Syncing WC 2026 injury data (league=${LEAGUE_ID}, season=${SEASON})…`);

  let raw: ApiInjury[] = [];
  try {
    raw = await fetchInjuries();
    console.log(`  ✓  ${raw.length} injury records received from API`);
  } catch (err) {
    console.warn(`  ⚠️  Fetch failed: ${err}. Writing empty injury file.`);
  }

  const map = buildMap(raw);
  const teamCount = Object.keys(map).length;
  const playerCount = Object.values(map).reduce((s, p) => s + p.length, 0);
  console.log(`  ✓  ${playerCount} players across ${teamCount} WC teams`);

  // Preview
  for (const [team, players] of Object.entries(map)) {
    for (const p of players) {
      console.log(`     ${p.severity.padEnd(10)} ${team} — ${p.name} (${p.reason})`);
    }
  }

  if (DRY_RUN) {
    console.log('\n  DRY RUN — no file written.\n');
    return;
  }

  const now = new Date().toISOString();
  const content = generateFile(map, now);
  fs.writeFileSync(OUT_PATH, content, 'utf8');
  console.log(`\n  ✓  Written to lib/injuryData.ts (${now})\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
