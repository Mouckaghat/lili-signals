import { WC_TEAMS } from '../lib/wcData';
import { GROUP_STANDINGS } from '../lib/standingsData';
import { MATCH_EVENTS } from '../lib/matchEventsData';

function getTeam(name: string) {
  return WC_TEAMS.find((t) => t.name === name);
}

// ─── Lili Surprise Index ───────────────────────────────────────────────────
function liliSurprise(teamName: string, played: number, pts: number, gf: number, ga: number): number {
  if (played === 0) return 0;
  const strength    = getTeam(teamName)?.strength ?? 65;
  const actualPct   = pts / (played * 3);
  const expectedPct = (strength - 50) / (92 - 50);
  const ptsDelta    = (actualPct - expectedPct) * 10;
  const gdBonus     = ((gf - ga) / played) * 0.4;
  return Math.max(0, Math.round((ptsDelta + gdBonus) * 10) / 10);
}

// ─── Danger score ──────────────────────────────────────────────────────────
function dangerScore(played: number, gf: number, ga: number, pts: number): number {
  if (played === 0) return 0;
  const goalRate = gf / played;
  const winRate  = pts / (played * 3);
  const margin   = Math.max(0, (gf - ga) / played);
  return Math.round((goalRate * 3 + winRate * 2 + margin * 1.5) * 10) / 10;
}

// ─── Handler ───────────────────────────────────────────────────────────────

export default async function handler(_req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=180');

  // ── Top scorers from curated match events ────────────────────────────────
  const scorerMap: Record<string, { team: string; goals: number }> = {};
  for (const match of MATCH_EVENTS) {
    for (const g of match.goals) {
      const team = g.type === 'own-goal'
        ? (g.team === match.home ? match.away : match.home)
        : g.team;
      if (!scorerMap[g.player]) scorerMap[g.player] = { team, goals: 0 };
      scorerMap[g.player].goals++;
    }
  }
  const topScorers = Object.entries(scorerMap)
    .map(([name, { team, goals }]) => ({
      name,
      team,
      teamFlag: getTeam(team)?.flag ?? '🏳',
      goals,
    }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 10);

  // ── Cards from curated match events ─────────────────────────────────────
  const teamYellows: Record<string, number> = {};
  const teamReds:    Record<string, number> = {};
  for (const match of MATCH_EVENTS) {
    for (const c of match.yellowCards) {
      teamYellows[c.team] = (teamYellows[c.team] ?? 0) + 1;
    }
    for (const c of match.redCards) {
      teamReds[c.team] = (teamReds[c.team] ?? 0) + 1;
    }
  }

  // ── Team stats from standings ────────────────────────────────────────────
  interface TeamStat {
    name:    string;
    flag:    string;
    played:  number;
    gf:      number;
    ga:      number;
    pts:     number;
    yellows: number;
    reds:    number;
  }

  const teamStats: TeamStat[] = GROUP_STANDINGS
    .filter((s) => s.played > 0)
    .map((s) => ({
      name:    s.team,
      flag:    getTeam(s.team)?.flag ?? '🏳',
      played:  s.played,
      gf:      s.gf,
      ga:      s.ga,
      pts:     s.pts,
      yellows: teamYellows[s.team] ?? 0,
      reds:    teamReds[s.team]    ?? 0,
    }));

  // ── Ranked lists ─────────────────────────────────────────────────────────
  const rank = (arr: TeamStat[], fn: (t: TeamStat) => number, ascending = false) =>
    [...arr]
      .sort((a, b) => ascending ? fn(a) - fn(b) : fn(b) - fn(a))
      .slice(0, 7)
      .map((t) => ({ name: t.name, flag: t.flag, value: fn(t) }));

  const bestAttack  = rank(teamStats, (t) => t.gf);
  const bestDefence = rank(teamStats, (t) => parseFloat((t.ga / t.played).toFixed(2)), true);
  const mostYellows = rank(teamStats, (t) => t.yellows);
  const mostReds    = rank(teamStats, (t) => t.reds);

  const disciplineRank = [...teamStats]
    .sort((a, b) => (a.yellows + a.reds * 3) - (b.yellows + b.reds * 3))
    .slice(0, 7)
    .map((t) => ({ name: t.name, flag: t.flag, value: t.yellows + t.reds * 3, yellows: t.yellows, reds: t.reds }));

  const mostDangerous = [...teamStats]
    .map((t) => ({ name: t.name, flag: t.flag, value: dangerScore(t.played, t.gf, t.ga, t.pts) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const liliSurpriseRank = [...teamStats]
    .map((t) => ({ name: t.name, flag: t.flag, value: liliSurprise(t.name, t.played, t.pts, t.gf, t.ga) }))
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
}
