// Live per-player feed: returns per-player match stats (minutes, rating, goals,
// assists, saves, shots, passes, tackles…) for any in-progress (or just-finished)
// WC fixture, keyed by "Home|Away". The app overlays this on the committed
// lib/playerStatsData.ts so the Pass Map nodes and the Players tab (Man of the
// Match, Contributors) update live during a game — without it those come from
// the deploy-gated baked file and freeze mid-match. Mirrors api/match-stats.ts
// and the parsing in scripts/sync-player-stats.ts.

const TEAM_NAME_MAP: Record<string, string> = {
  'Korea Republic': 'South Korea', "Côte d'Ivoire": 'Ivory Coast', 'United States': 'USA',
  'IR Iran': 'Iran', 'DR Congo': 'Congo DR', 'Cape Verde': 'Cape Verde Islands',
  'Curacao': 'Curaçao', 'Turkey': 'Türkiye', 'Czechia': 'Czech Republic',
  'Bosnia': 'Bosnia & Herzegovina', 'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
};
const normalise = (n: string) => TEAM_NAME_MAP[n] ?? n;

const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const DONE = new Set(['FT', 'AET', 'PEN']);
const POS: Record<string, string> = { G: 'GK', D: 'DF', M: 'MF', F: 'FW' };

// UTC today + yesterday (YYYY-MM-DD) — the window we treat as "recently finished".
// A game leaves api-football's live=all feed a few minutes after full time, so we
// re-pull finished fixtures by date to keep serving them across the live→finished
// handoff (the baked per-player rows are deploy-gated via [skip ci]).
function recentDates(): string[] {
  const now = Date.now();
  return [0, 1].map((d) => new Date(now - d * 86_400_000).toISOString().slice(0, 10));
}
const n0 = (v: unknown) => (v == null ? 0 : Number(v) || 0);

interface ApiLine {
  games?:  { minutes?: number | null; position?: string | null; rating?: string | null };
  shots?:  { total?: number | null; on?: number | null };
  goals?:  { total?: number | null; assists?: number | null; saves?: number | null };
  passes?: { total?: number | null; accuracy?: number | string | null };
  tackles?:{ total?: number | null; interceptions?: number | null };
}
interface ApiPlayerEntry { player: { name: string }; statistics: ApiLine[] }
interface ApiTeamPlayers { team: { name: string }; players: ApiPlayerEntry[] }

// Mirrors scripts/sync-player-stats.ts parseLine (minus fixtureId — the row is
// keyed by team here; the client attaches the canonical fixture id).
function parseLine(team: string, name: string, st: ApiLine) {
  const total = n0(st.passes?.total);
  const accRaw = st.passes?.accuracy;
  const accNum = accRaw == null ? 0 : Number(accRaw) || 0;
  const passAccPct = total > 0
    ? (accNum <= total ? Math.round((accNum / total) * 100) : Math.min(100, Math.round(accNum)))
    : Math.min(100, Math.round(accNum));
  return {
    team, name,
    pos: POS[(st.games?.position ?? '').charAt(0)] ?? 'MF',
    minutes: n0(st.games?.minutes),
    rating: st.games?.rating ? Number(st.games.rating) || null : null,
    goals: n0(st.goals?.total), assists: n0(st.goals?.assists), saves: n0(st.goals?.saves),
    shots: n0(st.shots?.total), shotsOn: n0(st.shots?.on),
    passes: total, passAccPct,
    tackles: n0(st.tackles?.total), interceptions: n0(st.tackles?.interceptions),
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 15s edge cache, aligned with /api/match-stats. Shared by web + native, so
  // upstream volume is bounded by miss-rate × regions × live fixtures.
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

    const fixtures = (data.response ?? []).filter((f) => LIVE.has(f.fixture.status.short) || DONE.has(f.fixture.status.short));

    // Also serve recently-finished games that have already aged out of live=all,
    // so the Pass Map nodes and Players tab don't freeze at full time (the baked
    // per-player rows are deploy-gated and won't reach the client until a deploy).
    const seen = new Set<number>(fixtures.map((f) => f.fixture.id));
    for (const date of recentDates()) {
      const dres = await fetch(`${BASE}/fixtures?league=${LEAGUE_ID}&season=2026&date=${date}`, { headers });
      if (!dres.ok) continue;
      const ddata = await dres.json() as { response: any[] };
      for (const f of ddata.response ?? []) {
        if (DONE.has(f.fixture.status.short) && !seen.has(f.fixture.id)) { seen.add(f.fixture.id); fixtures.push(f); }
      }
    }

    const players: Record<string, any> = {};
    for (const f of fixtures) {
      const home = normalise(f.teams.home.name);
      const away = normalise(f.teams.away.name);
      const pres = await fetch(`${BASE}/fixtures/players?fixture=${f.fixture.id}`, { headers });
      if (!pres.ok) continue;
      const pdata = await pres.json() as { response: ApiTeamPlayers[] };
      const rows: any[] = [];
      for (const t of pdata.response ?? []) {
        const team = normalise(t.team.name);
        for (const pe of t.players ?? []) {
          const st = pe.statistics?.[0];
          if (!st) continue;
          const row = parseLine(team, pe.player.name, st);
          if (row.minutes > 0 || row.goals || row.assists || row.saves) rows.push(row);
        }
      }
      if (!rows.length) continue;
      players[`${home}|${away}`] = {
        status:  DONE.has(f.fixture.status.short) ? 'FINISHED' : 'LIVE',
        elapsed: f.fixture.status.elapsed ?? null,
        rows,
      };
    }

    return res.status(200).json({ players, updatedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
