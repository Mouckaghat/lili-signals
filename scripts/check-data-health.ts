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
import { MATCH_STATS, MATCH_STATS_LAST_UPDATED } from '../lib/matchStatsData.js';
import { MATCH_LINEUPS } from '../lib/lineupData.js';
import { FIXTURE_RESULTS } from '../lib/fixtureResultsData.js';

const MIN = 60_000;
const LIVE_WINDOW_MS = 150 * MIN; // kickoff → ~2.5 h later: match is in progress
const STATS_STALE_MS = 20 * MIN;  // live stats should refresh within ~20 min
const LINEUP_LEAD_MS = 40 * MIN;  // official XI posts ~40 min before kickoff

const NOW = process.env.HEALTH_NOW ? Date.parse(process.env.HEALTH_NOW) : Date.now();
const statsUpdated = Date.parse(MATCH_STATS_LAST_UPDATED);
const statsAgeMin = Math.round((NOW - statsUpdated) / MIN);

type Feed = 'stats' | 'lineups' | 'results';
interface Issue { severity: 'CRITICAL' | 'warning'; fixture: string; msg: string; heal: Feed }

const issues: Issue[] = [];
const add = (severity: Issue['severity'], fixture: string, msg: string, heal: Feed) =>
  issues.push({ severity, fixture, msg, heal });

for (const f of WC_FIXTURES) {
  const key   = `${f.home}|${f.away}`;
  const label = `${f.home} v ${f.away}`;
  const ko    = Date.parse(f.date);
  if (Number.isNaN(ko)) continue;
  const since = NOW - ko; // >0 = after kickoff

  const stats  = MATCH_STATS.find((m) => m.fixtureId === f.id);
  const result = FIXTURE_RESULTS[key];
  const lineup = MATCH_LINEUPS.find((l) => l.fixtureKey === key);
  const hasXI  = !!lineup && (lineup.home.players.length > 0 || lineup.away.players.length > 0);

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
  } else if (since < 0 && since > -LINEUP_LEAD_MS) {
    // ── Within ~40 min before kickoff ──────────────────────────────────────────
    if (!hasXI) add('warning', label, `kickoff in ${Math.round(-since / MIN)}m but no starting XI posted`, 'lineups');
  }
}

// ─── Report ───────────────────────────────────────────────────────────────────
const criticals = issues.filter((i) => i.severity === 'CRITICAL');
const warnings  = issues.filter((i) => i.severity === 'warning');
const heals     = [...new Set(issues.map((i) => i.heal))];

console.log(`\n🩺  Data health @ ${new Date(NOW).toISOString()}`);
console.log(`    Match stats last refreshed ${statsAgeMin}m ago (${MATCH_STATS_LAST_UPDATED})`);
console.log(`    ${WC_FIXTURES.length} fixtures checked · ${criticals.length} critical · ${warnings.length} warning\n`);

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
