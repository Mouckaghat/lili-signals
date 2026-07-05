/**
 * scripts/check-data-health.ts
 *
 * Data-health watchdog — answers one question: "do we have the right data at
 * the right time?" It compares the real schedule (lib/wcData WC_FIXTURES)
 * against the committed data feeds and flags anything that should be present
 * but isn't, or is stale:
 *
 *   • A LIVE match (kicked off, not yet final) must have a MATCH_STATS entry,
 *     and MATCH_STATS_LAST_UPDATED must be recent (live stats feed the heatmap).
 *   • A FINISHED match must have a MATCH_STATS entry (heatmap) and a recorded
 *     result.
 *   • Within ~40 min of kickoff, the official XI should be posted (warning only —
 *     lineups legitimately post late).
 *
 * Exit code: 1 if any CRITICAL issue (→ fails the workflow → GitHub emails the
 * owner). 0 otherwise. Either way it writes the set of feeds that need healing
 * to $GITHUB_OUTPUT (`heal=stats,lineups,results`) so the watchdog workflow can
 * self-heal before alerting.
 *
 * Run by: .github/workflows/data-health.yml (every ~10 min during the tournament).
 * Local:  npx tsx scripts/check-data-health.ts
 *         HEALTH_NOW=2026-06-15T18:00:00Z npx tsx scripts/check-data-health.ts  # simulate a time
 */

import fs from 'node:fs';
import { WC_FIXTURES } from '../lib/wcData.js';
import { WC_KNOCKOUT } from '../lib/knockoutData.js';
import { MATCH_STATS, KNOCKOUT_MATCH_STATS, MATCH_STATS_LAST_UPDATED } from '../lib/matchStatsData.js';
import { MATCH_LINEUPS } from '../lib/lineupData.js';
import { FIXTURE_RESULTS } from '../lib/fixtureResultsData.js';
import { MATCH_EVENTS, MATCH_EVENTS_LAST_UPDATED } from '../lib/matchEventsData.js';
import { PLAYER_MATCH_STATS, PLAYER_STATS_LAST_UPDATED } from '../lib/playerStatsData.js';

const MIN = 60_000;
const LIVE_WINDOW_MS = 150 * MIN; // kickoff → ~2.5 h later: match is in progress
const STATS_STALE_MS = 20 * MIN;  // live stats should refresh within ~20 min
const FEED_STALE_MS  = 45 * MIN;  // events/player feeds should refresh within ~45 min
const LINEUP_LEAD_MS = 40 * MIN;  // official XI posts ~40 min before kickoff

const NOW = process.env.HEALTH_NOW ? Date.parse(process.env.HEALTH_NOW) : Date.now();
const statsUpdated = Date.parse(MATCH_STATS_LAST_UPDATED);
const eventsUpdated = Date.parse(MATCH_EVENTS_LAST_UPDATED);
const playersUpdated = Date.parse(PLAYER_STATS_LAST_UPDATED);
const statsAgeMin = Math.round((NOW - statsUpdated) / MIN);
const eventsAgeMin = Math.round((NOW - eventsUpdated) / MIN);
const playersAgeMin = Math.round((NOW - playersUpdated) / MIN);

type Feed = 'stats' | 'lineups' | 'results' | 'events' | 'players';
interface Issue { severity: 'CRITICAL' | 'warning'; fixture: string; msg: string; heal: Feed }

const issues: Issue[] = [];
const add = (severity: Issue['severity'], fixture: string, msg: string, heal: Feed) =>
  issues.push({ severity, fixture, msg, heal });

const allFixtures = [...WC_FIXTURES, ...WC_KNOCKOUT];
const allStats = [...MATCH_STATS, ...KNOCKOUT_MATCH_STATS];
const eventFixtureIds = new Set(MATCH_EVENTS.map((m) => m.fixtureId));
const playerFixtureIds = new Set(PLAYER_MATCH_STATS.map((p) => p.fixtureId));

for (const f of allFixtures) {
  const key   = `${f.home}|${f.away}`;
  const label = `${f.home} v ${f.away}`;
  const ko    = Date.parse(f.date);
  if (Number.isNaN(ko)) continue;
  const since = NOW - ko; // >0 = after kickoff

  const stats  = allStats.find((m) => m.fixtureId === f.id);
  const result = FIXTURE_RESULTS[key];
  const lineup = MATCH_LINEUPS.find((l) => l.fixtureKey === key);
  const hasXI  = !!lineup && (lineup.home.players.length > 0 || lineup.away.players.length > 0);
  const hasEvents = eventFixtureIds.has(f.id);
  const hasPlayers = playerFixtureIds.has(f.id);

  if (since >= 0 && since < LIVE_WINDOW_MS) {
    // ── Match is LIVE ──────────────────────────────────────────────────────────
    if (!stats) {
      add('CRITICAL', label, `live (${Math.round(since / MIN)}m in) but has no match-stats entry → no heatmap`, 'stats');
    } else if (statsAgeMin > STATS_STALE_MS / MIN) {
      add('CRITICAL', label, `live but stats are stale — last refresh ${statsAgeMin}m ago`, 'stats');
    }
  } else if (since >= LIVE_WINDOW_MS) {
    // ── Match is FINISHED ──────────────────────────────────────────────────────
    if (!stats) add('CRITICAL', label, 'finished but missing from match stats → no heatmap', 'stats');
    if (!result || result.status !== 'FINISHED') add('warning', label, 'finished but no recorded result', 'results');
    if (!hasPlayers) add('CRITICAL', label, 'finished but missing from player stats → Players/Pass Map stale', 'players');
    if (!hasEvents) add('warning', label, 'finished but no event row yet (can be legitimate on low-event matches)', 'events');
  } else if (since < 0 && since > -LINEUP_LEAD_MS) {
    // ── Within ~40 min before kickoff ──────────────────────────────────────────
    if (!hasXI) add('warning', label, `kickoff in ${Math.round(-since / MIN)}m but no starting XI posted`, 'lineups');
  }
}

// Freshness guards for feeds that power live intelligence — ONLY meaningful
// while a match is actually in progress. Since recon #73 the sync bots skip
// timestamp-only writes (writeGeneratedFile), so *_LAST_UPDATED advances only on
// a real data change. Between matches the feeds legitimately have nothing new,
// so an old timestamp is the NORMAL healthy state — not a dead bot. Gating on
// `anyLive` keeps these guards catching a genuinely lagging feed during a live
// game, without false-alarming (and self-emailing) every 15 min in the lulls.
const anyLive = allFixtures.some((f) => {
  const since = NOW - Date.parse(f.date);
  return since >= 0 && since < LIVE_WINDOW_MS;
});
if (anyLive) {
  if (statsAgeMin > STATS_STALE_MS / MIN) {
    add('CRITICAL', 'GLOBAL', `match stats feed stale (${statsAgeMin}m since refresh)`, 'stats');
  }
  if (eventsAgeMin > FEED_STALE_MS / MIN) {
    add('CRITICAL', 'GLOBAL', `match events feed stale (${eventsAgeMin}m since refresh)`, 'events');
  }
  if (playersAgeMin > FEED_STALE_MS / MIN) {
    add('CRITICAL', 'GLOBAL', `player stats feed stale (${playersAgeMin}m since refresh)`, 'players');
  }
}

// ─── Report ───────────────────────────────────────────────────────────────────
const criticals = issues.filter((i) => i.severity === 'CRITICAL');
const warnings  = issues.filter((i) => i.severity === 'warning');
const heals     = [...new Set(issues.map((i) => i.heal))];

console.log(`\n🩺  Data health @ ${new Date(NOW).toISOString()}`);
console.log(`    Match stats last refreshed ${statsAgeMin}m ago (${MATCH_STATS_LAST_UPDATED})`);
console.log(`    Match events last refreshed ${eventsAgeMin}m ago (${MATCH_EVENTS_LAST_UPDATED})`);
console.log(`    Player stats last refreshed ${playersAgeMin}m ago (${PLAYER_STATS_LAST_UPDATED})`);
console.log(`    ${allFixtures.length} fixtures checked · ${criticals.length} critical · ${warnings.length} warning\n`);

if (!issues.length) {
  console.log('✅  All data present and fresh for the current schedule.\n');
} else {
  for (const i of criticals) console.log(`  🔴  ${i.fixture}: ${i.msg}`);
  for (const i of warnings)  console.log(`  🟡  ${i.fixture}: ${i.msg}`);
  console.log(`\n    Feeds needing a refresh: ${heals.join(', ') || 'none'}\n`);
}

// Hand the heal list + verdict to the workflow.
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `heal=${heals.join(',')}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `critical=${criticals.length}\n`);
}

process.exit(criticals.length > 0 ? 1 : 0);
