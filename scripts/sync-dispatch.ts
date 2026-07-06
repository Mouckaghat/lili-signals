/**
 * scripts/sync-dispatch.ts
 *
 * Captures off-pitch "World Cup Dispatch" candidate stories from GDELT (a free,
 * global news database — no API key) and regenerates lib/dispatchCandidates.ts.
 *
 * RULES-ONLY ENGINE (v1 — a Claude rewrite/judge can be dropped in later):
 *   1. Pull recent WC news via the GDELT DOC API (self-throttled, one call/run).
 *   2. Keep only REPUTABLE domains (allowlist) + football/WC-relevant titles;
 *      drop off-topic noise and any profane/gratuitous headline.
 *   3. Cluster near-duplicate coverage → count distinct reputable outlets.
 *   4. Route each cluster (never auto-reject into view — dropped items vanish):
 *        published  — ≥2 reputable outlets AND no sensitive/defamation keyword.
 *        quarantine — single outlet, OR a sensitive keyword (rape/terror/…) that
 *                     needs a human to check attribution → "Awaiting review".
 *   5. Dedupe against the curated baseline, existing candidates, and the
 *      rejection log (your delete-with-reason entries — the learning loop).
 *
 * HONESTY: with titles only (GDELT gives no body), v1 quotes the outlet's own
 * headline + links the sources — it never paraphrases or invents. Sensitive
 * accusations about named people are FORCED to quarantine, never auto-published.
 *
 * Usage:
 *   npx tsx scripts/sync-dispatch.ts               # live write
 *   DRY_RUN=true npx tsx scripts/sync-dispatch.ts  # preview only
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeGeneratedFile } from './writeGenerated';
import { DISPATCH_EVENTS, type DispatchCandidate, type DispatchType, type DispatchStatus, type Escalation } from '../lib/routeDispatch.js';
import { DISPATCH_CANDIDATES } from '../lib/dispatchCandidates.js';
import { DISPATCH_REJECTIONS, REJECTION_KEYWORDS } from '../lib/dispatchRejections.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH  = path.resolve(__dirname, '..', 'lib', 'dispatchCandidates.ts');
const DRY_RUN   = process.env.DRY_RUN === 'true';
const MAX_KEEP  = 60;   // cap the stored candidate list

// ─── Reputable-domain allowlist (the primary noise cut) ─────────────────────────
const REPUTABLE = new Set([
  'bbc.com', 'bbc.co.uk', 'theguardian.com', 'espn.com', 'reuters.com', 'apnews.com',
  'nytimes.com', 'washingtonpost.com', 'cbsnews.com', 'cbssports.com', 'skysports.com',
  'cnn.com', 'nbcnews.com', 'abcnews.com', 'abc.net.au', 'aljazeera.com', 'metro.co.uk',
  'telegraph.co.uk', 'independent.co.uk', 'thetimes.co.uk', 'mirror.co.uk', 'dailymail.co.uk',
  'jpost.com', 'timesofoman.com', 'dw.com', 'france24.com', 'lemonde.fr', 'lequipe.fr',
  'marca.com', 'as.com', 'ge.globo.com', 'globo.com', 'goal.com', 'theathletic.com',
  'time.com', 'newrepublic.com', 'euronews.com', 'rferl.org', 'yahoo.com', 'sports.yahoo.com',
  'foxnews.com', 'foxsports.com', 'nbcsports.com', 'usatoday.com', 'latimes.com', 'yle.fi',
  'iltalehti.fi', 'cbc.ca', 'thenationalnews.com', 'iranintl.com', 'football-italia.net',
]);

// ─── Relevance / tone / sensitivity vocabularies ───────────────────────────────
const FOOTBALL_TOKENS = ['world cup', 'worldcup', 'mondial', 'fifa', 'referee', ' ref ', 'var ',
  'goal', 'penalty', 'red card', 'yellow card', 'offside', 'match', 'group stage', 'knockout',
  'quarterfinal', 'quarter-final', 'semifinal', 'semi-final', 'final', 'striker', 'midfielder',
  'defender', 'goalkeeper', 'squad', 'kickoff', 'kick-off', 'infantino', 'wc26', '2026 world'];

// Off-topic topics that slip through body-only matches — hard drop.
const OFFTOPIC = ['ebola', 'stock market', 'earnings', 'weather forecast', 'recipe', 'horoscope',
  'cryptocurrency', 'box office', 'election result'];

// Profanity / gratuitous — hard reject.
const TONE_REJECT = ['fuck', 'shit', 'bitch', 'bastard', 'slur'];

// Sensitive → FORCE quarantine (needs a human to verify attribution / avoid libel).
const SENSITIVE = ['rape', 'sexual assault', 'assault', 'terror', 'killed', 'murder', 'dead',
  'death', 'abuse', 'stabb', 'shoot', 'bomb', 'attack ', 'hostage'];

const lc = (s: string) => (s || '').toLowerCase();
const has = (t: string, arr: string[]) => arr.some((k) => t.includes(k));

// Signature: distinctive tokens of a title, sorted+joined — for dedupe & rejection match.
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'at', 'by',
  'with', 'after', 'over', 'his', 'her', 'as', 'is', 'was', 'are', 'be', 'from', 'that', 'this',
  'world', 'cup', 'fifa', '2026', 'says', 'said', 'new']);
function signature(title: string): string {
  return Array.from(new Set(lc(title).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w)))).sort().slice(0, 8).join('-');
}
function tokens(title: string): Set<string> {
  return new Set(lc(title).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)));
}
function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0; a.forEach((w) => { if (b.has(w)) n++; }); return n;
}

// ─── Classifiers (title-based, blunt by design) ────────────────────────────────
function classifyType(t: string): DispatchType {
  if (has(t, ['doping', 'clenbuterol', 'positive test', 'banned substance'])) return 'DOPING';
  if (has(t, ['ban', 'suspend', 'suspension', 'overturn', 'discipline'])) return 'DISCIPLINE';
  if (has(t, ['visa', 'entry', 'deported', 'border', 'denied entry', 'admitted', 'immigration'])) return 'ENTRY';
  if (has(t, ['referee', ' ref ', 'var', 'penalty', 'offside', 'red card', 'disallowed'])) return 'REFEREE';
  if (has(t, ['hotel', 'stranded', 'travel', 'base', 'accommodation', 'flight', 'relocat'])) return 'LOGISTICS';
  return 'POLITICS';
}
function classifyStatus(t: string, outlets: number): DispatchStatus {
  if (has(t, ['slam', 'blast', 'fury', 'outrage', 'criticis', 'critic', 'should have', 'accus', 'preferential'])) return 'OPINION';
  if (outlets < 2 || has(t, ['alleg', 'claim', 'reportedly', 'rumour', 'rumor'])) return 'DISPUTED';
  return 'CONFIRMED';
}
function classifyEscalation(t: string): Escalation[] {
  const e: Escalation[] = [];
  if (has(t, ['fifa', 'infantino'])) e.push('FIFA');
  if (has(t, ['trump', 'minister', 'government', 'homeland', 'white house', 'envoy'])) e.push('GOVERNMENT');
  if (has(t, ['court', 'judge', 'charged', 'lawsuit', 'appeal', 'ruling', 'legal'])) e.push('LEGAL');
  return e;
}

interface GdeltArticle { url: string; title: string; domain: string; seendate: string; language: string; }

async function fetchGdelt(): Promise<GdeltArticle[]> {
  const query = encodeURIComponent('"world cup" (referee OR VAR OR visa OR banned OR denied OR doping OR protest OR suspension OR "red card" OR flag OR controversy)');
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=75&format=json&timespan=2d&sourcelang=english`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Worldcupilou-Dispatch/1.0' } });
  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith('Please') || !text.trimStart().startsWith('{')) {
    throw new Error(`GDELT unavailable (status ${res.status}): ${text.slice(0, 80)}`);
  }
  return (JSON.parse(text).articles || []) as GdeltArticle[];
}

async function main() {
  let articles: GdeltArticle[];
  try {
    articles = await fetchGdelt();
  } catch (err) {
    // DEFENSIVE: never wipe the committed candidates on a fetch failure.
    console.warn(`⚠️  ${err instanceof Error ? err.message : err} — leaving dispatchCandidates.ts untouched.`);
    return;
  }
  console.log(`GDELT returned ${articles.length} articles.`);

  // Baseline block-set: token sets of the curated 12 titles (so we don't re-capture them).
  const baselineTokens = DISPATCH_EVENTS.map((e) => tokens(e.titleEN));
  const rejectedSigs = new Set(DISPATCH_REJECTIONS.map((r) => r.signature));
  const rejKeywords = REJECTION_KEYWORDS.map(lc);

  // 1) filter + 2) cluster
  const clusters = new Map<string, { rep: GdeltArticle; domains: Map<string, string>; t: string }>();
  for (const a of articles) {
    const domain = lc(a.domain);
    if (!REPUTABLE.has(domain)) continue;                    // reputable only
    const t = lc(a.title);
    if (!t || !has(t, FOOTBALL_TOKENS)) continue;            // football-relevant title
    if (has(t, OFFTOPIC) || has(t, TONE_REJECT)) continue;   // drop noise / profanity
    if (rejKeywords.length && has(t, rejKeywords)) continue; // learned rejections
    const sig = signature(a.title);
    if (!sig) continue;
    if (rejectedSigs.has(sig)) continue;                     // human-rejected before
    if (baselineTokens.some((bt) => overlap(bt, tokens(a.title)) >= 2)) continue; // already curated
    const c = clusters.get(sig) ?? { rep: a, domains: new Map(), t };
    c.domains.set(domain, a.url);                            // distinct reputable outlet → url
    clusters.set(sig, c);
  }

  // Existing candidates we keep (drop any the human has since rejected).
  const kept: DispatchCandidate[] = DISPATCH_CANDIDATES.filter((c) => !rejectedSigs.has(c.signature));
  const keptSigs = new Set(kept.map((c) => c.signature));
  const now = new Date().toISOString();
  let added = 0;

  for (const [sig, c] of clusters) {
    if (keptSigs.has(sig)) continue;                         // already captured
    const t = c.t;
    const outletCount = c.domains.size;
    const sensitive = has(t, SENSITIVE);
    const stage: DispatchCandidate['stage'] =
      (outletCount >= 2 && !sensitive) ? 'published' : 'quarantine';
    const sources = Array.from(c.domains.entries()).map(([domain, url]) => ({ outlet: domain, url }));
    const headline = c.rep.title.trim();
    const outletsList = sources.map((s) => s.outlet).join(', ');

    kept.push({
      id: `auto-${sig}`.slice(0, 60),
      date: `${c.rep.seendate.slice(0, 4)}-${c.rep.seendate.slice(4, 6)}-${c.rep.seendate.slice(6, 8)}`,
      type: classifyType(t),
      status: classifyStatus(t, outletCount),
      escalation: classifyEscalation(t),
      flags: '📰',
      titleEN: headline,
      titleFR: headline,                                     // v1: headline verbatim (Claude adds FR rewrite later)
      bodyEN: `Reported by ${outletsList}: "${headline}". Auto-captured — read the sources below.`,
      bodyFR: `Rapporté par ${outletsList} : « ${headline} ». Capturé automatiquement — voir les sources ci-dessous.`,
      sources,
      stage,
      origin: 'auto',
      capturedAt: now,
      signature: sig,
      reputableSources: outletCount,
    });
    added++;
  }

  // SAFETY: only 'published'-stage items go into the committed file, because this
  // file is compiled into the PUBLIC client bundle. Quarantine (grey-zone /
  // sensitive) items must NOT be publicly retrievable — their private review queue
  // is served server-side (Upstash KV + an authed route), built separately. Here
  // we only count them.
  kept.sort((a, b) => (b.capturedAt || '').localeCompare(a.capturedAt || ''));
  const quarCount = kept.filter((c) => c.stage === 'quarantine').length;
  const finalList = kept.filter((c) => c.stage === 'published').slice(0, MAX_KEEP);
  console.log(`Captured ${added} new · publishing ${finalList.length} public · ${quarCount} held for private review (not written to bundle).`);

  const content =
`// GENERATED by scripts/sync-dispatch.ts — do not edit by hand.
// Bot-captured Dispatch candidates (published / quarantine stages). The curated
// baseline lives in routeDispatch.ts; this file only holds machine-captured items.

import type { DispatchCandidate } from './routeDispatch';

export const DISPATCH_CANDIDATES: DispatchCandidate[] = ${JSON.stringify(finalList, null, 2)};

export const DISPATCH_CANDIDATES_LAST_UPDATED = '${now}';
`;

  if (DRY_RUN) {
    console.log('DRY_RUN — not writing. Would publish (public):');
    finalList.slice(0, 8).forEach((c) => console.log('  📰', c.titleEN));
    console.log('Held for private review (not written):');
    kept.filter((c) => c.stage === 'quarantine').slice(0, 8).forEach((c) => console.log('  ⏳', c.titleEN));
    return;
  }
  const wrote = writeGeneratedFile(OUT_PATH, content);
  console.log(wrote ? '✅ dispatchCandidates.ts updated.' : 'No material change — skipped.');
}

main().catch((e) => { console.error(e); process.exit(1); });
