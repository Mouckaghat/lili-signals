/**
 * scripts/sync-match-events.ts
 *
 * Fetches WC 2026 match events (goals + cards) from api-football.com and
 * regenerates lib/matchEventsData.ts — the source of truth for Tournament
 * Intelligence (top scorers, cards).
 *
 * Player PROFILES are NOT generated here — they stay hand-curated in
 * lib/playerProfilesData.ts (dob, club, league, caps, World Cups). This script
 * only writes the goal/card events. Per the Scorer Quality Standard, it WARNS
 * about any scorer that has no profile yet, so a human can add one.
 *
 * Safety: if the API fetch fails or returns no usable events, the existing
 * lib/matchEventsData.ts is left untouched (we never blank curated history).
 *
 * Usage:
 *   npx tsx scripts/sync-match-events.ts              # live write
 *   DRY_RUN=true npx tsx scripts/sync-match-events.ts # preview only
 *
 * Called by: .github/workflows/sync-match-events.yml (every 5 min during match windows)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { WC_FIXTURES } from '../lib/wcData.js';
import { PLAYER_PROFILES } from '../lib/playerProfilesData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const API_KEY   = process.env.API_FOOTBALL_KEY;
const DRY_RUN   = process.env.DRY_RUN === 'true';
const LEAGUE_ID = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1);
const SEASON    = Number(process.env.API_FOOTBALL_SEASON ?? 2026);
const OUT_PATH  = path.resolve(__dirname, '..', 'lib', 'matchEventsData.ts');
const API_BASE  = 'https://v3.football.api-sports.io';

// ─── Team name normalisation (api-football → wcData.ts) ─────────────────────────

const TEAM_NAME_MAP: Record<string, string> = {
  'Korea Republic':     'South Korea',
  'IR Iran':            'Iran',
  "Côte d'Ivoire":      'Ivory Coast',
  'Cape Verde':         'Cape Verde Islands',
  'DR Congo':           'Congo DR',
  'United States':      'USA',
  'Curacao':            'Curaçao',
  'Turkey':             'Türkiye',
  'Czechia':            'Czech Republic',
  'Bosnia':             'Bosnia & Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
};
const normTeam = (n: string) => TEAM_NAME_MAP[n] ?? n;

// ─── Player name normalisation (api-football → curated profile names) ───────────
// Profiles are pre-built from the Wikipedia squad lists (sync-squads.ts), so the
// canonical spelling is the Wikipedia one. The api-football spelling must map to
// it exactly for enrichment to join. Add a bridge here whenever a scorer's
// api-football name differs from the squad-list spelling.
const PLAYER_NAME_MAP: Record<string, string> = {
  'Vinicius Junior': 'Vinícius Júnior',
  'Ismaël Saïbari':  'Ismael Saibari',
};
const normPlayer = (n: string) => PLAYER_NAME_MAP[n] ?? n;

// ─── League-country → flag emoji (for auto-drafted profiles) ────────────────────
const COUNTRY_FLAG: Record<string, string> = {
  'Spain': '🇪🇸', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Italy': '🇮🇹', 'Germany': '🇩🇪', 'France': '🇫🇷',
  'Netherlands': '🇳🇱', 'Portugal': '🇵🇹', 'Belgium': '🇧🇪', 'Turkey': '🇹🇷', 'Türkiye': '🇹🇷',
  'Saudi Arabia': '🇸🇦', 'Saudi-Arabia': '🇸🇦', 'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'USA': '🇺🇸',
  'USA-MLS': '🇺🇸', 'Mexico': '🇲🇽', 'Croatia': '🇭🇷', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Switzerland': '🇨🇭',
  'Austria': '🇦🇹', 'Greece': '🇬🇷', 'Japan': '🇯🇵', 'Qatar': '🇶🇦', 'Egypt': '🇪🇬',
};
const countryFlag = (c: string) => COUNTRY_FLAG[c] ?? '🏳';

// ─── api-football types ─────────────────────────────────────────────────────────

interface ApiFixtureLite {
  fixture: { id: number; status: { short: string } };
  teams:   { home: { name: string }; away: { name: string } };
}

interface ApiEvent {
  time:   { elapsed: number | null; extra: number | null };
  team:   { name: string };
  player: { id: number | null; name: string | null };
  type:   string;   // 'Goal' | 'Card' | 'subst' | 'Var'
  detail: string;   // 'Normal Goal' | 'Own Goal' | 'Penalty' | 'Missed Penalty' | 'Yellow Card' | 'Red Card' | 'Second Yellow card'
  comments: string | null;
}

interface ApiPlayer {
  player: { birth: { date: string | null }; age: number | null };
  statistics: { team: { id: number; name: string }; league: { id: number; name: string; country: string } }[];
}

interface ApiStandings {
  league: { standings: { rank: number; team: { id: number } }[][] };
}

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const DONE_STATUSES = new Set(['FT', 'AET', 'PEN']);
const isPlayed = (short: string) => LIVE_STATUSES.has(short) || DONE_STATUSES.has(short);

// ─── Generated data shape (mirrors lib/matchEventsData.ts) ──────────────────────

type EventType = 'goal' | 'own-goal' | 'penalty';
interface GoalEvent { player: string; team: string; minute: number; minuteStoppage?: number; type: EventType; }
interface CardEvent { player: string; team: string; minute?: number; reason?: string; }
interface MatchEvents {
  fixtureId: string; home: string; away: string; date: string;
  goals: GoalEvent[]; yellowCards: CardEvent[]; redCards: CardEvent[];
}

// ─── Fetch helpers ──────────────────────────────────────────────────────────────

async function apiGet<T>(query: string): Promise<T[]> {
  if (!API_KEY) throw new Error('API_FOOTBALL_KEY not set');
  const res = await fetch(`${API_BASE}/${query}`, {
    headers: { 'x-apisports-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' },
  });
  if (!res.ok) throw new Error(`API HTTP ${res.status} for ${query}`);
  const data = await res.json() as { errors?: unknown; response: T[] };
  if (data.errors && Object.keys(data.errors as object).length > 0) {
    throw new Error(`api-football error: ${JSON.stringify(data.errors)}`);
  }
  return data.response ?? [];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Build events for one fixture ───────────────────────────────────────────────

function buildEntry(
  fixture: { id: string; home: string; away: string; date: string },
  events: ApiEvent[],
): MatchEvents {
  const goals: GoalEvent[]   = [];
  const yellows: CardEvent[] = [];
  const reds: CardEvent[]    = [];

  for (const e of events) {
    const minute = e.time?.elapsed ?? undefined;
    const team   = normTeam(e.team?.name ?? '');
    const player = normPlayer(e.player?.name ?? '');
    if (!player) continue;

    if (e.type === 'Goal') {
      if (e.detail === 'Missed Penalty') continue; // not a goal
      const type: EventType = e.detail === 'Own Goal' ? 'own-goal'
        : e.detail === 'Penalty' ? 'penalty' : 'goal';
      // For own goals, api-football reports the conceding player's own team here,
      // which matches how lib/api credits the opponent (it flips team for own-goal).
      const g: GoalEvent = { player, team, minute: minute ?? 0, type };
      if (e.time?.extra) g.minuteStoppage = e.time.extra;
      goals.push(g);
    } else if (e.type === 'Card') {
      const card: CardEvent = { player, team };
      if (minute !== undefined) card.minute = minute;
      if (e.comments) card.reason = e.comments;
      if (e.detail === 'Yellow Card') yellows.push(card);
      else /* Red Card | Second Yellow card */ {
        if (!card.reason) card.reason = e.detail;
        reds.push(card);
      }
    }
  }

  const byMinute = (a: { minute?: number }, b: { minute?: number }) => (a.minute ?? 0) - (b.minute ?? 0);
  goals.sort((a, b) => (a.minute - b.minute) || (a.minuteStoppage ?? 0) - (b.minuteStoppage ?? 0));
  yellows.sort(byMinute);
  reds.sort(byMinute);

  return { fixtureId: fixture.id, home: fixture.home, away: fixture.away, date: fixture.date, goals, yellowCards: yellows, redCards: reds };
}

// ─── Code generation ────────────────────────────────────────────────────────────

function goalLine(g: GoalEvent): string {
  const parts = [
    `player: ${JSON.stringify(g.player)}`,
    `team: ${JSON.stringify(g.team)}`,
    `minute: ${g.minute}`,
    ...(g.minuteStoppage ? [`minuteStoppage: ${g.minuteStoppage}`] : []),
    `type: ${JSON.stringify(g.type)}`,
  ];
  return `      { ${parts.join(', ')} },`;
}

function cardLine(c: CardEvent): string {
  const parts = [
    `player: ${JSON.stringify(c.player)}`,
    `team: ${JSON.stringify(c.team)}`,
    ...(c.minute !== undefined ? [`minute: ${c.minute}`] : []),
    ...(c.reason ? [`reason: ${JSON.stringify(c.reason)}`] : []),
  ];
  return `      { ${parts.join(', ')} },`;
}

function entryBlock(m: MatchEvents): string {
  const goals = m.goals.length ? `\n${m.goals.map(goalLine).join('\n')}\n    ` : '';
  const yel   = m.yellowCards.length ? `\n${m.yellowCards.map(cardLine).join('\n')}\n    ` : '';
  const red   = m.redCards.length ? `\n${m.redCards.map(cardLine).join('\n')}\n    ` : '';
  return `  {
    fixtureId: ${JSON.stringify(m.fixtureId)},
    home: ${JSON.stringify(m.home)}, away: ${JSON.stringify(m.away)}, date: ${JSON.stringify(m.date)},
    goals: [${goals}],
    yellowCards: [${yel}],
    redCards: [${red}],
  },`;
}

function generateFile(entries: MatchEvents[], updatedAt: string): string {
  return `// Auto-generated by scripts/sync-match-events.ts — do not edit manually.
// Refreshed every 5 minutes during match windows via GitHub Actions.
// Source of truth for tournament intelligence (top scorers, cards).
// Player PROFILES stay hand-curated in lib/playerProfilesData.ts.

export type EventType = 'goal' | 'own-goal' | 'penalty';

export interface GoalEvent {
  player:           string;
  team:             string;
  minute:           number;
  minuteStoppage?:  number; // e.g. 5 for "45+5'"
  type:             EventType;
}

export interface CardEvent {
  player:  string;
  team:    string;
  minute?: number;
  reason?: string;
}

export interface MatchEvents {
  fixtureId:   string; // matches WCFixture.id
  home:        string;
  away:        string;
  date:        string; // YYYY-MM-DD
  goals:       GoalEvent[];
  yellowCards: CardEvent[];
  redCards:    CardEvent[];
}

export const MATCH_EVENTS: MatchEvents[] = [
${entries.map(entryBlock).join('\n')}
];

export const MATCH_EVENTS_LAST_UPDATED = '${updatedAt}';
`;
}

// ─── Auto-drafted profiles for scorers missing from playerProfilesData.ts ───────
// Objective fields (dob/age/club/league/leagueFlag/clubRank) come from
// api-football; caps + wcCount are left as TODO for a human to confirm, so the
// Scorer Quality Standard is never silently bent.

async function draftProfile(name: string, playerId: number): Promise<string> {
  let dob = '', age: number | '' = '', club = '', league = '', country = '';
  let clubRank: number | undefined;

  try {
    const [pl] = await apiGet<ApiPlayer>(`players?id=${playerId}&season=${SEASON}`);
    if (pl) {
      dob     = pl.player?.birth?.date ?? '';
      age     = pl.player?.age ?? '';
      const st = pl.statistics?.[0];
      club    = st?.team?.name ?? '';
      league  = st?.league?.name ?? '';
      country = st?.league?.country ?? '';
      const leagueId = st?.league?.id, teamId = st?.team?.id;
      if (leagueId && teamId) {
        try {
          const [stand] = await apiGet<ApiStandings>(`standings?league=${leagueId}&season=${SEASON}`);
          const row = (stand?.league?.standings?.[0] ?? []).find((r) => r.team?.id === teamId);
          if (row) clubRank = row.rank;
        } catch { /* clubRank is optional */ }
      }
    }
  } catch (err) {
    console.warn(`   ⚠️  profile lookup failed for ${name}: ${err}`);
  }

  const rankLine = clubRank !== undefined
    ? `    clubRank: ${clubRank},\n`
    : `    // clubRank: ?, // optional — add if known\n`;

  return `  {
    name: '${name}',
    dob: '${dob}',
    age: ${age || 0},
    club: '${club}',
    league: '${league}',
    leagueFlag: '${countryFlag(country)}',
${rankLine}    wcCount: 0, // TODO: confirm number of World Cups (1 = debut)
    caps: 0,    // TODO: confirm total international caps
  },`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n⚽  Syncing WC 2026 match events (league=${LEAGUE_ID}, season=${SEASON})…`);

  // 1. Fixtures → api ids for the matches we know about
  let apiFixtures: ApiFixtureLite[] = [];
  try {
    apiFixtures = await apiGet<ApiFixtureLite>(`fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
    console.log(`  ✓  ${apiFixtures.length} fixtures received`);
  } catch (err) {
    console.warn(`  ⚠️  Fetch failed: ${err}. Leaving lib/matchEventsData.ts untouched.`);
    return; // SAFETY: never blank the curated file on failure
  }

  const wcByKey = new Map(WC_FIXTURES.map((f) => [`${f.home}|${f.away}`, f]));

  const played = apiFixtures
    .map((af) => ({
      apiId:  af.fixture.id,
      status: af.fixture.status.short,
      wc:     wcByKey.get(`${normTeam(af.teams.home.name)}|${normTeam(af.teams.away.name)}`),
    }))
    .filter((x) => x.wc && isPlayed(x.status));

  console.log(`  ✓  ${played.length} known fixtures are live/finished`);

  // 2. Events per fixture (preserve WC_FIXTURES order in output)
  const entries: MatchEvents[] = [];
  const order = new Map(WC_FIXTURES.map((f, i) => [f.id, i]));
  const scorerIds = new Map<string, number>(); // curated name → api-football player id

  for (const p of played) {
    try {
      const events = await apiGet<ApiEvent>(`fixtures/events?fixture=${p.apiId}`);
      for (const e of events) {
        if (e.type === 'Goal' && e.detail !== 'Own Goal' && e.detail !== 'Missed Penalty' && e.player?.id && e.player?.name) {
          scorerIds.set(normPlayer(e.player.name), e.player.id);
        }
      }
      const entry  = buildEntry(
        { id: p.wc!.id, home: p.wc!.home, away: p.wc!.away, date: p.wc!.date.slice(0, 10) },
        events,
      );
      if (entry.goals.length || entry.yellowCards.length || entry.redCards.length) {
        entries.push(entry);
      }
    } catch (err) {
      console.warn(`  ⚠️  events for ${p.wc!.id} failed: ${err}`);
    }
    await sleep(250); // be gentle on the rate limit
  }

  entries.sort((a, b) => (order.get(a.fixtureId) ?? 0) - (order.get(b.fixtureId) ?? 0));

  if (entries.length === 0) {
    console.warn('  ⚠️  No events built — leaving lib/matchEventsData.ts untouched.');
    return; // SAFETY
  }

  // 3. Quality check: scorers without a curated profile → auto-draft + flag
  const profileNames = new Set(PLAYER_PROFILES.map((p) => p.name));
  const missing: string[] = [];
  for (const m of entries) {
    for (const g of m.goals) {
      if (g.type !== 'own-goal' && !profileNames.has(g.player) && !missing.includes(g.player)) {
        missing.push(g.player);
      }
    }
  }

  if (missing.length) {
    console.warn(`\n  ⚠️  ${missing.length} scorer(s) missing a profile in playerProfilesData.ts:`);
    for (const n of missing) console.warn(`       • ${n}`);

    const drafts: string[] = [];
    for (const name of missing) {
      const id = scorerIds.get(name);
      drafts.push(id ? await draftProfile(name, id)
                     : `  // ${name} — no api-football id found; add this profile by hand`);
    }
    const body = `### 🎯 Scorer profile not matched

The match-events bot saw **${missing.length} scorer(s)** whose name didn't match any squad profile in \`lib/playerProfilesData.ts\` (pre-built from the Wikipedia squad lists by \`sync-squads\`).

**Almost always this is a spelling mismatch** between api-football and the squad list — fix it by adding a bridge to \`PLAYER_NAME_MAP\` in \`scripts/sync-match-events.ts\`:
\`\`\`ts
'<api-football spelling>': '<squad-list spelling>',
\`\`\`

If the player genuinely isn't in the parsed squad, here is an api-football draft to add to \`playerProfilesData.ts\` (confirm the \`TODO\` fields):
\`\`\`ts
${drafts.join('\n')}
\`\`\`
_Auto-updated by sync-match-events. Closes automatically once every scorer matches a profile._
`;
    const draftPath = process.env.MISSING_PROFILES_PATH ?? path.resolve(__dirname, '..', '.missing-profiles.md');
    fs.writeFileSync(draftPath, body, 'utf8');
    console.warn(`     → draft profiles written to ${draftPath}\n`);
  }

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `missing=${missing.length}\n`);
  }

  const totalGoals = entries.reduce((s, m) => s + m.goals.length, 0);
  console.log(`  ✓  ${entries.length} matches, ${totalGoals} goals`);

  if (DRY_RUN) {
    for (const m of entries) {
      console.log(`     ${m.fixtureId.padEnd(34)} ${m.goals.length}G ${m.yellowCards.length}Y ${m.redCards.length}R`);
    }
    console.log('\n  DRY RUN — no file written.\n');
    return;
  }

  const now = new Date().toISOString();
  fs.writeFileSync(OUT_PATH, generateFile(entries, now), 'utf8');
  console.log(`\n  ✓  Written to lib/matchEventsData.ts (${now})\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
