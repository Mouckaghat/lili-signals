/**
 * Lili Bot — Live Scores
 *
 * Runs inside GitHub Actions every 5 min during match windows.
 * Loops internally every 30 s for the full 5-minute window so the
 * app always gets near-real-time data without relying on any paid API.
 *
 * Data source : ESPN public scoreboard (no key required)
 * Data target : Upstash Redis  →  key "live:scores"
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

function espnUrl(): string {
  const d = new Date();
  const date = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${date}`;
}

const TEAM: Record<string, string> = {
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Korea Republic':         'South Korea',
  'United States':          'USA',
  "Côte d'Ivoire":          'Ivory Coast',
  'DR Congo':               'Congo DR',
  'IR Iran':                'Iran',
  'Czechia':                'Czech Republic',
};
const norm = (n: string) => TEAM[n] ?? n;

type Score = {
  status:    'LIVE' | 'FINISHED';
  homeScore: number;
  awayScore: number;
  clock?:    string;
};

async function scrape(): Promise<Record<string, Score>> {
  const url = espnUrl();
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`ESPN ${r.status}`);
  const raw = await r.json() as { events?: any[] };

  console.log(`  ESPN URL: ${url}`);
  console.log(`  Events returned: ${raw.events?.length ?? 0}`);
  for (const ev of raw.events ?? []) {
    const comp = ev.competitions?.[0];
    const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
    console.log(`  → ${home?.team?.displayName} vs ${away?.team?.displayName} [${ev.status?.type?.name}]`);
  }

  const scores: Record<string, Score> = {};
  for (const ev of raw.events ?? []) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
    if (!home || !away) continue;

    const typeName: string = ev.status?.type?.name ?? '';
    const isLive     = typeName === 'STATUS_IN_PROGRESS' || typeName === 'STATUS_HALFTIME';
    const isFinished = typeName === 'STATUS_FINAL';
    if (!isLive && !isFinished) continue;

    const key = `${norm(home.team?.displayName)}|${norm(away.team?.displayName)}`;
    scores[key] = {
      status:    isLive ? 'LIVE' : 'FINISHED',
      homeScore: parseInt(home.score ?? '0', 10),
      awayScore: parseInt(away.score ?? '0', 10),
      clock:     ev.status?.displayClock,
    };
  }
  return scores;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const LOOP_DURATION_MS = 4.5 * 60 * 1000; // 4.5 min — safely within the 5-min cron window
  const TICK_MS          = 30_000;
  const start            = Date.now();
  let   ticks            = 0;

  console.log(`🤖 Lili live-scores bot started at ${new Date().toISOString()}`);

  while (Date.now() - start < LOOP_DURATION_MS) {
    ticks++;
    try {
      const scores = await scrape();
      const liveCount = Object.values(scores).filter((s) => s.status === 'LIVE').length;

      if (Object.keys(scores).length === 0) {
        console.log(`[tick ${ticks}] No live or finished games — standing by`);
      } else {
        await redis.set('live:scores', scores, { ex: 3600 }); // expires after 1h
        console.log(`[tick ${ticks}] ✅ Wrote ${Object.keys(scores).length} scores (${liveCount} live) → Redis`);
        for (const [key, s] of Object.entries(scores)) {
          console.log(`  ${key}: ${s.homeScore}–${s.awayScore} [${s.status}${s.clock ? ' ' + s.clock : ''}]`);
        }
      }
    } catch (err) {
      console.error(`[tick ${ticks}] ❌ ${err}`);
    }

    const elapsed = Date.now() - start;
    if (elapsed + TICK_MS < LOOP_DURATION_MS) {
      await sleep(TICK_MS);
    } else {
      break;
    }
  }

  console.log(`🏁 Bot finished after ${ticks} ticks`);
}

main().catch((err) => { console.error(err); process.exit(1); });
