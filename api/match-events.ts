// Live match-events feed: returns goals + yellow/red cards for any in-progress
// (or just-finished) WC fixture, keyed by "Home|Away". The app overlays this on
// the committed lib/matchEventsData.ts so the Momentum wave's goal/card markers
// update live during a game — without it, those markers come from the
// deploy-gated baked file and freeze mid-match. Mirrors api/match-stats.ts.
//
// Honest scope: the events feed gives goals and cards only. There is NO reliable
// WC injury feed, so we surface goals + yellow + red — never a fabricated injury.

const TEAM_NAME_MAP: Record<string, string> = {
  'Korea Republic': 'South Korea', "Côte d'Ivoire": 'Ivory Coast', 'United States': 'USA',
  'IR Iran': 'Iran', 'DR Congo': 'Congo DR', 'Cape Verde': 'Cape Verde Islands',
  'Curacao': 'Curaçao', 'Turkey': 'Türkiye', 'Czechia': 'Czech Republic',
  'Bosnia': 'Bosnia & Herzegovina', 'Bosnia-Herzegovina': 'Bosnia & Herzegovina',
};
const normalise = (n: string) => TEAM_NAME_MAP[n] ?? n;

const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']);
const DONE = new Set(['FT', 'AET', 'PEN']);

type EventType = 'goal' | 'own-goal' | 'penalty';
interface GoalEvent { player: string; team: string; minute: number; minuteStoppage?: number; type: EventType }
interface CardEvent { player: string; team: string; minute?: number; reason?: string }

interface ApiEvent {
  time:   { elapsed: number | null; extra: number | null };
  team:   { name: string };
  player: { name: string | null };
  type:   string;   // 'Goal' | 'Card' | 'subst' | 'Var'
  detail: string;   // 'Normal Goal' | 'Own Goal' | 'Penalty' | 'Missed Penalty' | 'Yellow Card' | 'Red Card' | 'Second Yellow card'
  comments: string | null;
}

// Build the goals + cards for one fixture from its raw event list. Mirrors
// scripts/sync-match-events.ts buildEntry (own-goal credited to the opponent),
// minus the squad-name resolution — the live marker only displays a surname, and
// the feed's spelling (possibly abbreviated, e.g. "I. Saibari") is honest as-is.
function buildEntry(home: string, away: string, events: ApiEvent[]) {
  const goals: GoalEvent[] = [];
  const yellowCards: CardEvent[] = [];
  const redCards: CardEvent[] = [];
  const opponentOf = (t: string) => (t === home ? away : home);

  for (const e of events) {
    // Penalty-shootout kicks come through as type:'Goal'/'Penalty' at elapsed≥120
    // but are NOT match goals (the score stays level). Skip them so the momentum
    // wave and events strip never show phantom shootout "goals".
    if (e.comments === 'Penalty Shootout') continue;
    const minute  = e.time?.elapsed ?? undefined;
    const apiTeam = normalise(e.team?.name ?? '');
    const player  = e.player?.name ?? '';
    if (!player) continue;

    if (e.type === 'Goal') {
      if (e.detail === 'Missed Penalty') continue;
      const type: EventType = e.detail === 'Own Goal' ? 'own-goal' : e.detail === 'Penalty' ? 'penalty' : 'goal';
      const team = type === 'own-goal' ? opponentOf(apiTeam) : apiTeam;
      const g: GoalEvent = { player, team, minute: minute ?? 0, type };
      if (e.time?.extra) g.minuteStoppage = e.time.extra;
      goals.push(g);
    } else if (e.type === 'Card') {
      const card: CardEvent = { player, team: apiTeam };
      if (minute !== undefined) card.minute = minute;
      if (e.comments) card.reason = e.comments;
      if (e.detail === 'Yellow Card') yellowCards.push(card);
      else { if (!card.reason) card.reason = e.detail; redCards.push(card); }
    }
  }

  const byMin = (a: { minute?: number }, b: { minute?: number }) => (a.minute ?? 0) - (b.minute ?? 0);
  goals.sort((a, b) => (a.minute - b.minute) || (a.minuteStoppage ?? 0) - (b.minuteStoppage ?? 0));
  yellowCards.sort(byMin);
  redCards.sort(byMin);
  return { goals, yellowCards, redCards };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // 15s edge cache, aligned with /api/match-stats: goals/cards arrive minute-to-
  // minute, and all clients (web + native) share this edge cache so upstream
  // api-football volume is bounded by miss-rate × regions × live fixtures.
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

    const events: Record<string, any> = {};
    for (const f of live) {
      const home = normalise(f.teams.home.name);
      const away = normalise(f.teams.away.name);
      const eres = await fetch(`${BASE}/fixtures/events?fixture=${f.fixture.id}`, { headers });
      if (!eres.ok) continue;
      const edata = await eres.json() as { response: ApiEvent[] };
      const entry = buildEntry(home, away, edata.response ?? []);
      events[`${home}|${away}`] = {
        status:  DONE.has(f.fixture.status.short) ? 'FINISHED' : 'LIVE',
        elapsed: f.fixture.status.elapsed ?? null,
        ...entry,
      };
    }

    return res.status(200).json({ events, updatedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
