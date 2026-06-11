import { WC_TEAMS } from '../lib/wcData';

// ─── Team name normalisation (api-football → wcData names) ─────────────────

const TEAM_NAME_MAP: Record<string, string> = {
  'Korea Republic':   'South Korea',
  "Côte d'Ivoire":    'Ivory Coast',
  'United States':    'USA',
  'IR Iran':          'Iran',
  'DR Congo':         'Congo DR',
  'Congo DR':         'Congo DR',
  'Türkiye':          'Türkiye',
  'Turkey':           'Türkiye',
  'Bosnia':           'Bosnia & Herzegovina',
  'New Zealand':      'New Zealand',
};

function normalise(name: string): string {
  return TEAM_NAME_MAP[name] ?? name;
}

function getTeam(name: string) {
  return WC_TEAMS.find((t) => t.name === name);
}

// ─── Lili Surprise Index ───────────────────────────────────────────────────
// Measures how much a team is over/under-performing relative to their strength.
// Formula: (actual_pts_pct - expected_pts_pct) × 10 + goals_diff_bonus
// Expected performance is normalised from the team's strength (50–92 scale).

function liliSurprise(
  teamName: string,
  played: number,
  pts: number,
  gf: number,
  ga: number,
): number {
  if (played === 0) return 0;
  const strength   = getTeam(teamName)?.strength ?? 65;
  const actualPct  = pts / (played * 3);
  const expectedPct = (strength - 50) / (92 - 50); // normalise 50-92 → 0-1
  const ptsDelta   = (actualPct - expectedPct) * 10;
  const gdBonus    = ((gf - ga) / played) * 0.4;
  return Math.max(0, Math.round((ptsDelta + gdBonus) * 10) / 10);
}

// ─── Danger score ──────────────────────────────────────────────────────────
// How threatening a team is: goals scored weighted by conversion (goals/game)
// plus a bonus for winning margin.

function dangerScore(played: number, gf: number, ga: number, pts: number): number {
  if (played === 0) return 0;
  const goalRate   = gf / played;
  const winRate    = pts / (played * 3);
  const margin     = Math.max(0, (gf - ga) / played);
  return Math.round((goalRate * 3 + winRate * 2 + margin * 1.5) * 10) / 10;
}

// ─── API fetcher ───────────────────────────────────────────────────────────

async function apiFetch(path: string, apiKey: string): Promise<any> {
  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: {
      'x-apisports-key': apiKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });
  if (!res.ok) throw new Error(`upstream ${res.status} for ${path}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`api-football: ${JSON.stringify(data.errors)}`);
  }
  return data.response ?? [];
}

// ─── Handler ───────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=180');

  const API_KEY   = process.env.API_FOOTBALL_KEY;
  const LEAGUE_ID = process.env.API_FOOTBALL_LEAGUE_ID ?? '1';

  if (!API_KEY) {
    return res.status(500).json({ error: 'API_FOOTBALL_KEY not configured' });
  }

  try {
    const base = `?league=${LEAGUE_ID}&season=2026`;

    const [scorers, yellows, reds, standings] = await Promise.all([
      apiFetch(`/players/topscorers${base}`, API_KEY),
      apiFetch(`/players/topyellowcards${base}`, API_KEY),
      apiFetch(`/players/topredcards${base}`, API_KEY),
      apiFetch(`/standings${base}`, API_KEY),
    ]);

    // ── Top scorers (player level) ─────────────────────────────────────────
    const topScorers = (scorers as any[]).slice(0, 10).map((entry: any) => ({
      name:     entry.player?.name ?? '—',
      team:     normalise(entry.statistics?.[0]?.team?.name ?? ''),
      teamFlag: getTeam(normalise(entry.statistics?.[0]?.team?.name ?? ''))?.flag ?? '🏳',
      goals:    entry.statistics?.[0]?.goals?.total ?? 0,
    }));

    // ── Team cards (aggregate from player data) ────────────────────────────
    const teamYellows: Record<string, number> = {};
    const teamReds:    Record<string, number> = {};

    for (const entry of (yellows as any[])) {
      const team = normalise(entry.statistics?.[0]?.team?.name ?? '');
      if (!team) continue;
      const count = entry.statistics?.[0]?.cards?.yellow ?? 0;
      teamYellows[team] = (teamYellows[team] ?? 0) + count;
    }
    for (const entry of (reds as any[])) {
      const team = normalise(entry.statistics?.[0]?.team?.name ?? '');
      if (!team) continue;
      const count = entry.statistics?.[0]?.cards?.red ?? 0;
      teamReds[team] = (teamReds[team] ?? 0) + count;
    }

    // ── Flatten standings (array of groups) ───────────────────────────────
    const groupArrays: any[][] = standings?.[0]?.league?.standings ?? standings ?? [];
    const allTeams: any[] = Array.isArray(groupArrays[0])
      ? (groupArrays as any[][]).flat()
      : (groupArrays as any[]);

    interface TeamStat {
      name: string;
      flag: string;
      played: number;
      gf: number;
      ga: number;
      pts: number;
      yellows: number;
      reds: number;
    }

    const teamStats: TeamStat[] = allTeams
      .map((t: any) => {
        const name = normalise(t.team?.name ?? '');
        const team = getTeam(name);
        if (!team) return null;
        return {
          name,
          flag:    team.flag,
          played:  t.all?.played ?? t.played ?? 0,
          gf:      t.all?.goals?.for  ?? t.goals?.for  ?? 0,
          ga:      t.all?.goals?.against ?? t.goals?.against ?? 0,
          pts:     t.points ?? 0,
          yellows: teamYellows[name] ?? 0,
          reds:    teamReds[name]    ?? 0,
        };
      })
      .filter((t): t is TeamStat => t !== null && t.played > 0);

    // ── Build ranked lists ─────────────────────────────────────────────────
    const rank = (arr: TeamStat[], fn: (t: TeamStat) => number, ascending = false) =>
      [...arr]
        .sort((a, b) => ascending ? fn(a) - fn(b) : fn(b) - fn(a))
        .slice(0, 7)
        .map((t) => ({ name: t.name, flag: t.flag, value: fn(t) }));

    const bestAttack   = rank(teamStats, (t) => t.gf);
    const bestDefence  = rank(teamStats, (t) => parseFloat((t.ga / t.played).toFixed(2)), true);
    const mostYellows  = rank(teamStats, (t) => t.yellows);
    const mostReds     = rank(teamStats, (t) => t.reds);

    const disciplineRank = [...teamStats]
      .sort((a, b) => {
        const scoreA = a.yellows + a.reds * 3;
        const scoreB = b.yellows + b.reds * 3;
        return scoreA - scoreB; // lower = better discipline
      })
      .slice(0, 7)
      .map((t) => ({
        name:    t.name,
        flag:    t.flag,
        value:   t.yellows + t.reds * 3,
        yellows: t.yellows,
        reds:    t.reds,
      }));

    const mostDangerous = [...teamStats]
      .map((t) => ({ name: t.name, flag: t.flag, value: dangerScore(t.played, t.gf, t.ga, t.pts) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);

    const liliSurpriseRank = [...teamStats]
      .map((t) => ({
        name:  t.name,
        flag:  t.flag,
        value: liliSurprise(t.name, t.played, t.pts, t.gf, t.ga),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);

    return res.status(200).json({
      topScorers,
      bestAttack,
      bestDefence,
      mostYellows,
      mostReds,
      disciplineRank,
      mostDangerous,
      liliSurpriseRank,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
