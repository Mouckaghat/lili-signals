// Fast live score scraper — ESPN public scoreboard, no API key required.
// Called by one dedicated client-side bot per live game every 30 s.
// 5 s server cache absorbs simultaneous bot requests without duplicate ESPN calls.

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

// ESPN display names → our internal team names
const ESPN_NAME: Record<string, string> = {
  'Bosnia and Herzegovina': 'Bosnia & Herzegovina',
  'Korea Republic':         'South Korea',
  'United States':          'USA',
  "Côte d'Ivoire":          'Ivory Coast',
  'DR Congo':               'Congo DR',
  'IR Iran':                'Iran',
  'Czechia':                'Czech Republic',
};

function norm(name: string): string {
  return ESPN_NAME[name] ?? name;
}

type LiveScore = {
  status:    'LIVE' | 'FINISHED';
  homeScore: number;
  awayScore: number;
  clock?:    string; // e.g. "67'"
};

let cache: { data: Record<string, LiveScore>; ts: number } | null = null;
const CACHE_MS = 5_000;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  // 5 s in-process cache so parallel bots share one ESPN fetch
  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return res.status(200).json({ scores: cache.data, ts: cache.ts });
  }

  try {
    const r = await fetch(ESPN_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!r.ok) throw new Error(`ESPN ${r.status}`);
    const raw = await r.json() as { events?: any[] };

    const scores: Record<string, LiveScore> = {};

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

      const homeName = norm(home.team?.displayName ?? '');
      const awayName = norm(away.team?.displayName ?? '');
      const key      = `${homeName}|${awayName}`;

      scores[key] = {
        status:    isLive ? 'LIVE' : 'FINISHED',
        homeScore: parseInt(home.score ?? '0', 10),
        awayScore: parseInt(away.score ?? '0', 10),
        clock:     ev.status?.displayClock,
      };
    }

    cache = { data: scores, ts: Date.now() };
    return res.status(200).json({ scores, ts: cache.ts });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
