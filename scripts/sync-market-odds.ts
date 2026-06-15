/**
 * scripts/sync-market-odds.ts
 *
 * Fetches pre-match bookmaker odds (/odds) and api-football's own model
 * prediction (/predictions) for every upcoming/live WC 2026 fixture and
 * regenerates lib/marketOddsData.ts. This powers the "Lili vs The Market"
 * screen (app/lili-vs-market.tsx), which compares three honest signals:
 *   - Lili     → our own model (wcSimulation.matchProbs from team strengths)
 *   - Market   → consensus of all bookmakers, de-vigged to implied probabilities
 *   - Model    → api-football's /predictions percentages + advice
 *
 * The market consensus is the average of each bookmaker's de-vigged Match-Winner
 * probabilities (1/odd, normalised so home+draw+away = 1, which removes the
 * overround/vig). No fabrication: a fixture with no published odds gets
 * market: null, and one with no prediction gets model: null.
 *
 * Safety: on fetch failure or empty response, the existing file is left
 * untouched (copy of the sync-player-stats.ts defensive pattern).
 *
 * Usage:
 *   npx tsx scripts/sync-market-odds.ts
 *   DRY_RUN=true npx tsx scripts/sync-market-odds.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { WC_FIXTURES } from '../lib/wcData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const API_KEY   = process.env.API_FOOTBALL_KEY ?? process.env.API_KEY;
const DRY_RUN   = process.env.DRY_RUN === 'true';
const LEAGUE_ID = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? 1);
const SEASON    = Number(process.env.API_FOOTBALL_SEASON ?? 2026);
const OUT_PATH  = path.resolve(__dirname, '..', 'lib', 'marketOddsData.ts');
const API_BASE  = 'https://v3.football.api-sports.io';

const TEAM_NAME_MAP: Record<string, string> = {
  'Korea Republic': 'South Korea', 'IR Iran': 'Iran', "Côte d'Ivoire": 'Ivory Coast',
  'Cape Verde': 'Cape Verde Islands', 'DR Congo': 'Congo DR', 'United States': 'USA',
  'Curacao': 'Curaçao', 'Turkey': 'Türkiye', 'Czechia': 'Czech Republic',
  'Bosnia': 'Bosnia & Herzegovina', 'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
};
const normTeam = (n: string) => TEAM_NAME_MAP[n] ?? n;
// Odds/predictions are pre-match signals; we want anything not yet finished.
const DONE = new Set(['FT', 'AET', 'PEN']);

interface ApiFixture { fixture: { id: number; status: { short: string } }; teams: { home: { name: string }; away: { name: string } } }
interface OddsValue { value: string; odd: string }
interface ApiOdds { bookmakers: { bets: { name: string; values: OddsValue[] }[] }[] }
interface ApiPrediction { predictions: { percent?: { home?: string; draw?: string; away?: string }; advice?: string } }

async function apiGet<T>(query: string): Promise<T[]> {
  if (!API_KEY) throw new Error('API_FOOTBALL_KEY (or API_KEY) not set');
  const res = await fetch(`${API_BASE}/${query}`, {
    headers: { 'x-apisports-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' },
  });
  if (!res.ok) throw new Error(`API HTTP ${res.status} for ${query}`);
  const data = await res.json() as { errors?: unknown; response: T[] };
  if (data.errors && Object.keys(data.errors as object).length > 0) throw new Error(`api error: ${JSON.stringify(data.errors)}`);
  return data.response ?? [];
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pct = (s?: string) => (s == null ? NaN : Number(String(s).replace('%', '')));

interface Triple { home: number; draw: number; away: number }

export interface MarketOdds {
  fixtureId: string;
  home: string;
  away: string;
  market: Triple | null;     // consensus implied probabilities (0..1), de-vigged
  model: Triple | null;      // api-football /predictions percentages (0..1)
  advice: string | null;
  bookmakers: number;        // how many books contributed to the consensus
}

// One bookmaker's Match-Winner odds → de-vigged probabilities (sum to 1).
function deVig(values: OddsValue[]): Triple | null {
  const byName = (v: string) => values.find((x) => x.value === v)?.odd;
  const h = Number(byName('Home')), d = Number(byName('Draw')), a = Number(byName('Away'));
  if (!(h > 0) || !(d > 0) || !(a > 0)) return null;
  const ih = 1 / h, id = 1 / d, ia = 1 / a;
  const s = ih + id + ia;           // > 1 by the overround
  return { home: ih / s, draw: id / s, away: ia / s };
}

// Consensus = average of every bookmaker's de-vigged Match-Winner probabilities.
function marketConsensus(odds: ApiOdds): { probs: Triple | null; count: number } {
  const triples: Triple[] = [];
  for (const bk of odds.bookmakers ?? []) {
    const mw = bk.bets?.find((b) => b.name === 'Match Winner');
    if (!mw) continue;
    const t = deVig(mw.values);
    if (t) triples.push(t);
  }
  if (triples.length === 0) return { probs: null, count: 0 };
  const sum = triples.reduce((acc, t) => ({ home: acc.home + t.home, draw: acc.draw + t.draw, away: acc.away + t.away }), { home: 0, draw: 0, away: 0 });
  const n = triples.length;
  return { probs: { home: sum.home / n, draw: sum.draw / n, away: sum.away / n }, count: n };
}

// api-football returns a degenerate 33/33/33 + advice "No predictions available"
// when it has no real model for a fixture. Treat that sentinel as "no model".
const NO_MODEL_ADVICE = 'No predictions available';

function modelProbs(p: ApiPrediction): Triple | null {
  if ((p.predictions?.advice ?? '') === NO_MODEL_ADVICE) return null;
  const h = pct(p.predictions?.percent?.home), d = pct(p.predictions?.percent?.draw), a = pct(p.predictions?.percent?.away);
  if (![h, d, a].every(Number.isFinite)) return null;
  const s = h + d + a;
  if (s <= 0) return null;
  if (h === d && d === a) return null;   // all-equal = no signal, don't show it
  return { home: h / s, draw: d / s, away: a / s };
}

const tri = (t: Triple | null) => (t === null ? 'null' : `{ home: ${t.home.toFixed(4)}, draw: ${t.draw.toFixed(4)}, away: ${t.away.toFixed(4)} }`);

function line(m: MarketOdds): string {
  return `  { fixtureId: ${JSON.stringify(m.fixtureId)}, home: ${JSON.stringify(m.home)}, away: ${JSON.stringify(m.away)}, ` +
    `market: ${tri(m.market)}, model: ${tri(m.model)}, advice: ${m.advice === null ? 'null' : JSON.stringify(m.advice)}, bookmakers: ${m.bookmakers} },`;
}

function fileContent(rows: MarketOdds[], updatedAt: string): string {
  return `// Auto-generated by scripts/sync-market-odds.ts — do not edit manually.
// Pre-match bookmaker consensus (de-vigged) + api-football model prediction per
// fixture, powering the "Lili vs The Market" screen (app/lili-vs-market.tsx).

export interface MarketTriple { home: number; draw: number; away: number }

export interface MarketOdds {
  fixtureId: string;
  home: string;
  away: string;
  market: MarketTriple | null;  // bookmaker consensus, de-vigged (probs sum to 1)
  model: MarketTriple | null;   // api-football /predictions percentages (0..1)
  advice: string | null;        // api-football betting advice, verbatim
  bookmakers: number;           // books contributing to the consensus
}

export const MARKET_ODDS: MarketOdds[] = [
${rows.map(line).join('\n')}
];

export const MARKET_ODDS_LAST_UPDATED = '${updatedAt}';
`;
}

async function main() {
  console.log(`\n💰  Syncing WC 2026 market odds + predictions (league=${LEAGUE_ID}, season=${SEASON})…`);
  let fixtures: ApiFixture[];
  try {
    fixtures = await apiGet<ApiFixture>(`fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
    console.log(`  ✓  ${fixtures.length} fixtures received`);
  } catch (err) {
    console.warn(`  ⚠️  Fetch failed: ${err}. Leaving lib/marketOddsData.ts untouched.`);
    return;
  }

  const wcByKey = new Map(WC_FIXTURES.map((f) => [`${f.home}|${f.away}`, f]));
  const order   = new Map(WC_FIXTURES.map((f, i) => [f.id, i]));

  // Upcoming/live only — odds and predictions are pre-match signals.
  const targets = fixtures
    .map((f) => ({ apiId: f.fixture.id, short: f.fixture.status.short, wc: wcByKey.get(`${normTeam(f.teams.home.name)}|${normTeam(f.teams.away.name)}`) }))
    .filter((x) => x.wc && !DONE.has(x.short));
  console.log(`  ✓  ${targets.length} upcoming/live fixtures to price`);

  const rows: MarketOdds[] = [];
  for (const t of targets) {
    let market: Triple | null = null, books = 0, model: Triple | null = null, advice: string | null = null;
    try {
      const odds = await apiGet<ApiOdds>(`odds?fixture=${t.apiId}`);
      if (odds[0]) { const c = marketConsensus(odds[0]); market = c.probs; books = c.count; }
    } catch (err) { console.warn(`  ⚠️  odds for ${t.wc!.id} failed: ${err}`); }
    await sleep(200);
    try {
      const preds = await apiGet<ApiPrediction>(`predictions?fixture=${t.apiId}`);
      if (preds[0]) {
        model = modelProbs(preds[0]);
        const adv = preds[0].predictions?.advice ?? null;
        advice = adv === NO_MODEL_ADVICE ? null : adv;   // don't surface the no-data sentinel
      }
    } catch (err) { console.warn(`  ⚠️  prediction for ${t.wc!.id} failed: ${err}`); }
    await sleep(200);

    // Keep a row only if we got at least one real signal — never fabricate.
    if (market || model) rows.push({ fixtureId: t.wc!.id, home: t.wc!.home, away: t.wc!.away, market, model, advice, bookmakers: books });
  }

  rows.sort((a, b) => (order.get(a.fixtureId) ?? 0) - (order.get(b.fixtureId) ?? 0));

  if (rows.length === 0) { console.warn('  ⚠️  No priced fixtures built — leaving file untouched.'); return; }
  console.log(`  ✓  ${rows.length} priced fixtures (${rows.filter((r) => r.market).length} with odds, ${rows.filter((r) => r.model).length} with model)`);

  if (DRY_RUN) {
    for (const r of rows.slice(0, 5)) {
      const m = r.market ? `mkt ${(r.market.home * 100).toFixed(0)}/${(r.market.draw * 100).toFixed(0)}/${(r.market.away * 100).toFixed(0)}` : 'mkt —';
      console.log(`     ${r.home} v ${r.away}: ${m} (${r.bookmakers} books) · ${r.advice ?? 'no advice'}`);
    }
    console.log('\n  DRY RUN — no file written.\n'); return;
  }
  const now = new Date().toISOString();
  fs.writeFileSync(OUT_PATH, fileContent(rows, now), 'utf8');
  console.log(`\n  ✓  Written to lib/marketOddsData.ts (${now})\n`);
}

main();
