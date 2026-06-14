/**
 * scripts/sync-squads.ts
 *
 * Pre-builds the FULL player database for all 48 World Cup squads BEFORE kickoff,
 * so live scoring needs nothing but the goal + minute — every scorer's profile is
 * already on hand (no live lookup, no delay, no broken immersion).
 *
 * Primary source : Wikipedia "2026 FIFA World Cup squads" (caps, dob, club) — the
 *                  official pre-tournament squad lists, all 48 teams on one page.
 * Enrichment     : club-country → leagueFlag + league name.
 *                  (clubRank stays optional; api-football can layer it later.)
 *
 * Output: regenerates lib/playerProfilesData.ts with ~1,250 players.
 * Safety: if the fetch/parse yields far fewer players than expected, the existing
 * file is left untouched (never blank the store).
 *
 * Usage:
 *   npx tsx scripts/sync-squads.ts              # live write
 *   DRY_RUN=true npx tsx scripts/sync-squads.ts # preview counts only
 *
 * Called by: .github/workflows/sync-squads.yml (daily + manual; squads are static
 * pre-tournament, refreshed for late call-ups).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WC_TEAMS } from '../lib/wcData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY_RUN  = process.env.DRY_RUN === 'true';
const OUT_PATH = path.resolve(__dirname, '..', 'lib', 'playerProfilesData.ts');
const WIKI_URL = 'https://en.wikipedia.org/w/api.php?action=parse&page=2026_FIFA_World_Cup_squads&format=json&prop=wikitext&formatversion=2';
const AS_OF    = new Date('2026-06-11'); // tournament start — age reference
const MIN_PLAYERS = 1000;               // safety floor

// ─── Wikipedia nation header → wcData team name ─────────────────────────────────
const NATION_MAP: Record<string, string> = {
  'Turkey':                 'Türkiye',
  'United States':          'USA',
  'Cape Verde':             'Cape Verde Islands',
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'DR Congo':               'Congo DR',
  'Congo DR':               'Congo DR',
};

// ─── Club-country code → { flag, league } ───────────────────────────────────────
const ENG = '🏴󠁧󠁢󠁥󠁮󠁧󠁿', SCO = '🏴󠁧󠁢󠁳󠁣󠁴󠁿', WAL = '🏴󠁧󠁢󠁷󠁬󠁳󠁿';
const CLUBNAT: Record<string, { flag: string; league?: string }> = {
  ENG: { flag: ENG, league: 'Premier League' },     GER: { flag: '🇩🇪', league: 'Bundesliga' },
  ESP: { flag: '🇪🇸', league: 'La Liga' },           FRA: { flag: '🇫🇷', league: 'Ligue 1' },
  ITA: { flag: '🇮🇹', league: 'Serie A' },           KSA: { flag: '🇸🇦', league: 'Saudi Pro League' },
  TUR: { flag: '🇹🇷', league: 'Süper Lig' },         USA: { flag: '🇺🇸', league: 'MLS' },
  NED: { flag: '🇳🇱', league: 'Eredivisie' },        BRA: { flag: '🇧🇷', league: 'Série A' },
  POR: { flag: '🇵🇹', league: 'Primeira Liga' },     BEL: { flag: '🇧🇪', league: 'Pro League' },
  QAT: { flag: '🇶🇦', league: 'Qatar Stars League' }, MEX: { flag: '🇲🇽', league: 'Liga MX' },
  IRN: { flag: '🇮🇷', league: 'Persian Gulf Pro League' }, CZE: { flag: '🇨🇿', league: 'Czech First League' },
  SCO: { flag: SCO, league: 'Scottish Premiership' }, EGY: { flag: '🇪🇬', league: 'Egyptian Premier League' },
  RSA: { flag: '🇿🇦', league: 'Betway Premiership' }, ARG: { flag: '🇦🇷', league: 'Primera División' },
  UZB: { flag: '🇺🇿', league: 'Uzbekistan Super League' }, UAE: { flag: '🇦🇪', league: 'UAE Pro League' },
  IRQ: { flag: '🇮🇶', league: 'Iraq Stars League' }, DEN: { flag: '🇩🇰', league: 'Danish Superliga' },
  GRE: { flag: '🇬🇷', league: 'Super League Greece' }, RUS: { flag: '🇷🇺', league: 'Russian Premier League' },
  SUI: { flag: '🇨🇭', league: 'Swiss Super League' }, JOR: { flag: '🇯🇴', league: 'Jordanian Pro League' },
  CYP: { flag: '🇨🇾', league: 'Cypriot First Division' }, KOR: { flag: '🇰🇷', league: 'K League 1' },
  AUT: { flag: '🇦🇹', league: 'Austrian Bundesliga' }, NZL: { flag: '🇳🇿' },
  NOR: { flag: '🇳🇴', league: 'Eliteserien' },        JPN: { flag: '🇯🇵', league: 'J1 League' },
  AUS: { flag: '🇦🇺', league: 'A-League' },           TUN: { flag: '🇹🇳', league: 'Ligue Professionnelle 1' },
  CRO: { flag: '🇭🇷', league: 'HNL' },                CAN: { flag: '🇨🇦', league: 'Canadian Premier League' },
  WAL: { flag: WAL },                                 POL: { flag: '🇵🇱', league: 'Ekstraklasa' },
  ECU: { flag: '🇪🇨', league: 'Serie A' },            ISR: { flag: '🇮🇱', league: 'Israeli Premier League' },
  SWE: { flag: '🇸🇪', league: 'Allsvenskan' },        HUN: { flag: '🇭🇺', league: 'NB I' },
  MAR: { flag: '🇲🇦', league: 'Botola' },             PAR: { flag: '🇵🇾', league: 'Primera División' },
  MAS: { flag: '🇲🇾', league: 'Malaysia Super League' }, ALG: { flag: '🇩🇿', league: 'Ligue 1' },
  SRB: { flag: '🇷🇸', league: 'Serbian SuperLiga' },  ROU: { flag: '🇷🇴', league: 'Liga I' },
  SVK: { flag: '🇸🇰', league: 'Slovak First League' }, SVN: { flag: '🇸🇮', league: 'PrvaLiga' },
  IRL: { flag: '🇮🇪', league: 'League of Ireland' },  BUL: { flag: '🇧🇬', league: 'First League' },
  CRC: { flag: '🇨🇷', league: 'Liga FPD' },           VEN: { flag: '🇻🇪', league: 'Primera División' },
  PAN: { flag: '🇵🇦', league: 'LPF' },                CHI: { flag: '🇨🇱', league: 'Primera División' },
  CHN: { flag: '🇨🇳', league: 'Chinese Super League' }, BIH: { flag: '🇧🇦', league: 'Premijer Liga' },
  KAZ: { flag: '🇰🇿', league: 'Kazakhstan Premier League' }, HAI: { flag: '🇭🇹' },
  FIN: { flag: '🇫🇮', league: 'Veikkausliiga' },      THA: { flag: '🇹🇭', league: 'Thai League 1' },
  IDN: { flag: '🇮🇩', league: 'Liga 1' },             COL: { flag: '🇨🇴', league: 'Categoría Primera A' },
  ARM: { flag: '🇦🇲', league: 'Armenian Premier League' }, GHA: { flag: '🇬🇭', league: 'Ghana Premier League' },
  URU: { flag: '🇺🇾', league: 'Primera División' },   HON: { flag: '🇭🇳', league: 'Liga Nacional' },
  AZE: { flag: '🇦🇿', league: 'Azerbaijan Premier League' },
};

// ─── Profile shape (mirrors lib/playerProfilesData.ts) ──────────────────────────
interface PlayerProfile {
  name: string;
  nation: string;
  dob: string;
  age: number;
  club: string;
  league: string;
  leagueFlag: string;
  clubRank?: number;
  wcCount?: number;
  caps: number;
}

// ─── Wikitext helpers ───────────────────────────────────────────────────────────

// "[[Page|Display]]" → "Display"; "[[Name]]" → "Name"; plain text returned as-is.
function unlink(raw: string): string {
  const m = raw.match(/\[\[([^\]]*)\]\]/);
  const inner = m ? m[1] : raw;
  const disp = inner.includes('|') ? inner.split('|').pop()! : inner;
  return disp.replace(/'{2,}/g, '').trim();
}

function ageFrom(dob: string): number {
  const d = new Date(dob);
  let a = AS_OF.getFullYear() - d.getFullYear();
  const before = AS_OF.getMonth() < d.getMonth() || (AS_OF.getMonth() === d.getMonth() && AS_OF.getDate() < d.getDate());
  if (before) a--;
  return a;
}

function parseDob(ageField: string): string | null {
  // {{birth date and age2|2026|6|11|YYYY|M|D}}  → last 3 numbers are the birth date
  // {{birth date and age|YYYY|M|D|...}}          → first 3 numbers are the birth date
  const isAge2 = /birth date and age2/i.test(ageField);
  // Strip the template name first — "age2" otherwise leaks a stray "2" digit.
  const params = ageField.replace(/\{\{\s*birth date and age2?\s*/i, '').replace(/\}\}/g, '');
  const nums = (params.match(/\d+/g) ?? []).map(Number);
  const trip = isAge2 ? nums.slice(3, 6) : nums.slice(0, 3);
  if (trip.length < 3) return null;
  const [y, m, d] = trip;
  if (!y || !m || !d || y < 1900 || m > 12 || d > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parsePlayer(line: string, nation: string): PlayerProfile | null {
  const nameRaw = line.match(/\|name=(\[\[[^\]]*\]\]|[^|]+?)(?=\|)/)?.[1];
  if (!nameRaw) return null;
  const name = unlink(nameRaw);
  if (!name) return null;

  const ageField = line.match(/\|age=(\{\{[^}]*\}\})/)?.[1] ?? '';
  const dob = parseDob(ageField);
  if (!dob) return null;

  const caps    = Number(line.match(/\|caps=(\d+)/)?.[1] ?? '0');
  const clubRaw = line.match(/\|club=(\[\[[^\]]*\]\]|[^|]+?)(?=\|clubnat=)/)?.[1] ?? '';
  const club    = unlink(clubRaw);
  const code    = line.match(/\|clubnat=([A-Za-z]{2,3})/)?.[1] ?? '';
  const cn      = CLUBNAT[code];

  return {
    name, nation, dob, age: ageFrom(dob), club,
    league:     cn?.league ?? '',
    leagueFlag: cn?.flag ?? '🏳',
    caps,
  };
}

// Brace-balanced: each {{nat fs g player ...}} is single-line, but be defensive.
function* playerLines(wikitext: string): Generator<{ nation: string; line: string }> {
  let nation: string | null = null;
  for (const line of wikitext.split('\n')) {
    const h = line.match(/^===\s*([^=].*?)\s*===\s*$/);
    if (h) { nation = NATION_MAP[h[1]] ?? h[1]; continue; }
    if (line.includes('{{nat fs g player') && nation) yield { nation, line };
  }
}

// ─── Code generation ────────────────────────────────────────────────────────────

function profileBlock(p: PlayerProfile): string {
  const lines = [
    `    name: ${JSON.stringify(p.name)},`,
    `    nation: ${JSON.stringify(p.nation)},`,
    `    dob: ${JSON.stringify(p.dob)},`,
    `    age: ${p.age},`,
    `    club: ${JSON.stringify(p.club)},`,
    `    league: ${JSON.stringify(p.league)},`,
    `    leagueFlag: ${JSON.stringify(p.leagueFlag)},`,
    ...(p.clubRank !== undefined ? [`    clubRank: ${p.clubRank},`] : []),
    ...(p.wcCount !== undefined ? [`    wcCount: ${p.wcCount},`] : []),
    `    caps: ${p.caps},`,
  ];
  return `  {\n${lines.join('\n')}\n  },`;
}

function generateFile(profiles: PlayerProfile[], updatedAt: string): string {
  // Group by nation for readability, preserving WC_TEAMS order.
  const teamOrder = new Map(WC_TEAMS.map((t, i) => [t.name, i]));
  const byNation = new Map<string, PlayerProfile[]>();
  for (const p of profiles) {
    if (!byNation.has(p.nation)) byNation.set(p.nation, []);
    byNation.get(p.nation)!.push(p);
  }
  const nations = [...byNation.keys()].sort((a, b) => (teamOrder.get(a) ?? 99) - (teamOrder.get(b) ?? 99));

  const body = nations.map((n) => {
    const header = `  // ── ${n} ${'─'.repeat(Math.max(2, 76 - n.length))}`;
    return `${header}\n${byNation.get(n)!.map(profileBlock).join('\n')}`;
  }).join('\n');

  return `// Auto-generated by scripts/sync-squads.ts — do not edit manually.
// Pre-built from the Wikipedia "2026 FIFA World Cup squads" lists (caps, dob, club)
// so every selected player's profile is ready before kickoff. Refreshed daily.
//
// clubRank + wcCount are optional and intentionally omitted here (not in the squad
// source); they can be layered on by api-football enrichment / an editorial pass.

export interface PlayerProfile {
  name: string;         // must match scorer name in MATCH_EVENTS exactly
  nation?: string;      // national team (squad source)
  dob: string;          // YYYY-MM-DD
  age: number;          // as of June 2026
  club: string;
  league: string;
  leagueFlag: string;   // country flag emoji for the league
  clubRank?: number;    // final league table position (omit if unknown)
  wcCount?: number;     // number of World Cups including 2026 (1 = debut)
  caps: number;
}

export const PLAYER_PROFILES: PlayerProfile[] = [
${body}
];

export const PLAYER_PROFILES_LAST_UPDATED = '${updatedAt}';
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n👥  Building WC 2026 squad profiles from Wikipedia…');

  let wikitext = '';
  try {
    const res = await fetch(WIKI_URL, { headers: { 'User-Agent': 'LiliSignals/1.0 (squad sync)' } });
    if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
    const json = await res.json() as { parse?: { wikitext?: string }; error?: { code: string } };
    if (json.error) throw new Error(`Wikipedia API: ${json.error.code}`);
    wikitext = json.parse?.wikitext ?? '';
  } catch (err) {
    console.warn(`  ⚠️  Fetch failed: ${err}. Leaving lib/playerProfilesData.ts untouched.`);
    return; // SAFETY
  }

  const knownTeams = new Set(WC_TEAMS.map((t) => t.name));
  const profiles: PlayerProfile[] = [];
  const seen = new Set<string>();
  let dropped = 0;

  for (const { nation, line } of playerLines(wikitext)) {
    if (!knownTeams.has(nation)) { dropped++; continue; }
    const p = parsePlayer(line, nation);
    if (!p) { dropped++; continue; }
    const key = `${p.name}|${p.nation}`;
    if (seen.has(key)) continue;
    seen.add(key);
    profiles.push(p);
  }

  const teamsCovered = new Set(profiles.map((p) => p.nation));
  console.log(`  ✓  ${profiles.length} players across ${teamsCovered.size}/48 teams (${dropped} skipped)`);
  for (const t of WC_TEAMS) {
    if (!teamsCovered.has(t.name)) console.warn(`  ⚠️  no squad parsed for ${t.name}`);
  }
  const noLeague = profiles.filter((p) => !p.league).length;
  if (noLeague) console.warn(`  ⚠️  ${noLeague} players have an unmapped league (leagueFlag still set)`);

  if (profiles.length < MIN_PLAYERS) {
    console.warn(`  ⚠️  Only ${profiles.length} players parsed (< ${MIN_PLAYERS}). Leaving file untouched.`);
    return; // SAFETY
  }

  if (DRY_RUN) {
    console.log('\n  DRY RUN — no file written.\n');
    return;
  }

  const now = new Date().toISOString();
  fs.writeFileSync(OUT_PATH, generateFile(profiles, now), 'utf8');
  console.log(`\n  ✓  Written ${profiles.length} profiles to lib/playerProfilesData.ts (${now})\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
