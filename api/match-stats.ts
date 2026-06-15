// Live territory-heatmap feed: returns per-team match statistics for any
// in-progress (or just-finished) WC fixture, keyed by "Home|Away". The app
// merges this over the committed lib/matchStatsData.ts so the heatmap updates
// live without video. Mirrors api/fixture-results.ts.

const TEAM_NAME_MAP: Record<string, string> = {
  'Korea Republic': 'South Korea', "Côte d'Ivoire": 'Ivory Coast', 'United States': 'USA',
  'IR Iran': 'Iran', 'DR Congo': 'Congo DR', 'Cape Verde': 'Cape Verde Islands',
  'Curacao': 'Curaçao', 'Turkey': 'Türkiye', 'Czechia': 'Czech Republic', 'Bosnia': 'Bosnia & Herzegovina',
};
const normalise = (n: string) => TEAM_NAME_MAP[n] ?? n;

const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const DONE = new Set(['FT', 'AET', 'PEN']);

function num(items: any[], type: string): number {
  const raw = items?.find((s) => s.type === type)?.value;
  if (raw === null || raw === undefined) return 0;
  const n = parseFloat(String(raw).replace('%', ''));
  return Number.isFinite(n) ? n : 0;
}

function parseTeam(raw: any) {
  const s = raw.statistics ?? [];
  return {
    team:            normalise(raw.team.name),
    possession:      num(s, 'Ball Possession') / 100,
    totalShots:      num(s, 'Total Shots'),
    shotsInsideBox:  num(s, 'Shots insidebox'),
    shotsOutsideBox: num(s, 'Shots outsidebox'),
    shotsOnGoal:     num(s, 'Shots on Goal'),
    corners:         num(s, 'Corner Kicks'),
    xg:              num(s, 'expected_goals'),
    passAccuracy:    num(s, 'Passes %') / 100,
    passes:          num(s, 'Total passes'),
    fouls:           num(s, 'Fouls'),
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 15s edge cache: live possession/shots/xG move minute-to-minute, so a tight
  // TTL keeps the heatmap fresh. All clients (web + native) share this edge
  // cache, so upstream api-football volume is bounded by miss-rate × regions ×
  // live fixtures — not by user count.
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');

  const API_KEY   = process.env.API_FOOTBALL_KEY ?? process.env.API_KEY;
  const LEAGUE_ID = process.env.API_FOOTBALL_LEAGUE_ID ?? '1';
  const BASE      = 'https://v3.football.api-sports.io';
  const headers   = { 'x-apisports-key': API_KEY ?? '', 'x-rapidapi-host': 'v3.football.api-sports.io' };

  if (!API_KEY) return res.status(500).json({ error: 'API_FOOTBALL_KEY not configured' });

  try {
    const up = await fetch(`${BASE}/fixtures?league=${LEAGUE_ID}&season=2026&live=all`, { headers });
    if (!up.ok) throw new Error(`upstream ${up.status}`);
    const data = await up.json() as { response: any[] };

    const live = (data.response ?? []).filter((f) => LIVE.has(f.fixture.status.short) || DONE.has(f.fixture.status.short));

    const stats: Record<string, any> = {};
    for (const f of live) {
      const home = normalise(f.teams.home.name);
      const away = normalise(f.teams.away.name);
      const sres = await fetch(`${BASE}/fixtures/statistics?fixture=${f.fixture.id}`, { headers });
      if (!sres.ok) continue;
      const sdata = await sres.json() as { response: any[] };
      const hRaw = sdata.response?.find((t) => normalise(t.team.name) === home);
      const aRaw = sdata.response?.find((t) => normalise(t.team.name) === away);
      if (!hRaw || !aRaw || !hRaw.statistics?.length) continue;
      stats[`${home}|${away}`] = {
        status:  DONE.has(f.fixture.status.short) ? 'FINISHED' : 'LIVE',
        elapsed: f.fixture.status.elapsed ?? null,
        homeStats: parseTeam(hRaw),
        awayStats: parseTeam(aRaw),
      };
    }

    return res.status(200).json({ stats, updatedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
