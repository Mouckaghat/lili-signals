// api-football names → wcData.ts names (WC_FIXTURES home/away). MUST stay in
// sync with scripts/sync-fixture-results.ts — a name missing here means the live
// overlay is keyed under the api-football name (e.g. "Czechia") and never
// matches the app's fixture key ("Czech Republic"), so the stale baked score
// shows instead of the live one. (Bug: Czechia 1-1 SA showed as 1-0, 2026-06-18.)
const TEAM_NAME_MAP: Record<string, string> = {
  'Korea Republic':     'South Korea',
  'IR Iran':            'Iran',
  "Côte d'Ivoire":      'Ivory Coast',
  'Cape Verde':         'Cape Verde Islands',
  'DR Congo':           'Congo DR',
  'Congo DR':           'Congo DR',
  'United States':      'USA',
  'Curacao':            'Curaçao',
  'Turkey':             'Türkiye',
  'Czechia':            'Czech Republic',
  'Bosnia':             'Bosnia & Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
};

function normalise(name: string): string {
  return TEAM_NAME_MAP[name] ?? name;
}

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const DONE_STATUSES = new Set(['FT', 'AET', 'PEN']);

function mapStatus(short: string): 'SCHEDULED' | 'LIVE' | 'FINISHED' {
  if (LIVE_STATUSES.has(short)) return 'LIVE';
  if (DONE_STATUSES.has(short)) return 'FINISHED';
  return 'SCHEDULED';
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 15s edge cache: this is the api-football-backed live score source, so a
  // tight TTL surfaces goals fast. One upstream call per miss (all fixtures in
  // one request), shared across all clients via the edge cache.
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');

  const API_KEY   = process.env.API_FOOTBALL_KEY ?? process.env.API_KEY;
  const LEAGUE_ID = process.env.API_FOOTBALL_LEAGUE_ID ?? '1';

  if (!API_KEY) {
    return res.status(500).json({ error: 'API_FOOTBALL_KEY not configured' });
  }

  try {
    const url = `https://v3.football.api-sports.io/fixtures?league=${LEAGUE_ID}&season=2026`;
    const upstream = await fetch(url, {
      headers: {
        'x-apisports-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);

    const data = await upstream.json() as { errors?: unknown; response: any[] };

    if (data.errors && Object.keys(data.errors as object).length > 0) {
      throw new Error(`api-football: ${JSON.stringify(data.errors)}`);
    }

    const results: Record<string, {
      status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
      homeScore: number | null;
      awayScore: number | null;
      winner: string | null;
    }> = {};

    for (const af of data.response ?? []) {
      const home   = normalise(af.teams.home.name);
      const away   = normalise(af.teams.away.name);
      const key    = `${home}|${away}`;
      const status = mapStatus(af.fixture.status.short);

      if (status === 'SCHEDULED') continue;

      let winner: string | null = null;
      if (af.teams.home.winner === true)       winner = home;
      else if (af.teams.away.winner === true)  winner = away;
      else if (af.teams.home.winner === false && af.teams.away.winner === false) winner = 'Draw';

      results[key] = {
        status,
        homeScore: af.goals.home,
        awayScore: af.goals.away,
        winner,
      };
    }

    return res.status(200).json({ results, updatedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
