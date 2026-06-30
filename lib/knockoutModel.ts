// Road to the Final — the model behind the knockout bracket screen.
// Every number is real or an explicitly-labeled model output (no fabrication):
//   • teams/flags/strength      ← lib/wcData (WC_TEAMS)
//   • points + form "so far"    ← lib/standingsData (GROUP_STANDINGS, real group results)
//   • Lili's call record/team   ← lib/trackRecord (her pre-match favourite vs actual)
//   • venue                     ← lib/stadiumData (curated; null → "venue TBC", never invented)
//   • Lili's pick + win prob    ← lib/wcSimulation matchProbs(strength, strength)
//   • Lili's predicted score    ← a deterministic expected-goals read of the strengths,
//                                 shown as "Lili predicts" — a model output, not a fact.
// Live status/score is layered on top from the /api/fixture-results overlay.

import { WC_KNOCKOUT, KNOCKOUT_ORDER, type KnockoutFixture, type KnockoutRound } from './knockoutData';
import { WC_TEAMS } from './wcData';
import { GROUP_STANDINGS } from './standingsData';
import { getStadium, type StadiumInfo } from './stadiumData';
import { liliProbs } from './marketComparison';
import { buildTrackRecord } from './trackRecord';

export type Side = 'home' | 'away';

export interface TeamForm {
  name: string;
  flag: string;
  strength: number;
  pts: number | null;       // group-stage points (null if not found — e.g. a placeholder seed)
  played: number;
  gd: number;
  liliCorrect: number;      // Lili's correct calls on this team's finished games
  liliTotal: number;
}

export interface KnockoutTie {
  fixture: KnockoutFixture;
  home: TeamForm | null;    // null when the slot is still a placeholder ("Winner …")
  away: TeamForm | null;
  stadium: StadiumInfo | null;
  venueName: string | null; // raw feed name fallback when stadium is null
  city: string | null;
  homeProb: number;         // Lili: P(home advances), draw folded into the favourite
  liliFav: Side;
  liliScore: { home: number; away: number };  // Lili's predicted scoreline
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  result: { home: number; away: number } | null;
  penalties: { home: number; away: number } | null;  // shootout score when the tie went to spot-kicks
  winner: Side | null;      // actual winner once decided
  liliRight: boolean | null;
}

export interface RoundGroup {
  round: KnockoutRound;
  label: string;
  ties: KnockoutTie[];
}

// All six rounds in order, so the "road" always shows the full path to the final
// — future rounds render as locked rails until the feed seeds them.
const ALL_ROUNDS: { round: KnockoutRound; label: string }[] = [
  { round: 'R32', label: 'Round of 32' },
  { round: 'R16', label: 'Round of 16' },
  { round: 'QF',  label: 'Quarter-finals' },
  { round: 'SF',  label: 'Semi-finals' },
  { round: '3RD', label: 'Third-place play-off' },
  { round: 'F',   label: 'Final' },
];

const teamOf = (name: string) => WC_TEAMS.find((t) => t.name === name);
const standingOf = (name: string) => GROUP_STANDINGS.find((s) => s.team === name);

// Deterministic expected-goals read from the strength gap — a model "prediction",
// never presented as a measured score. Symmetric and stable for a given matchup.
function predictScore(sH: number, sA: number): { home: number; away: number } {
  const base = 1.25;
  const k = 0.022;
  const home = Math.max(0, Math.round(base + (sH - sA) * k));
  const away = Math.max(0, Math.round(base + (sA - sH) * k));
  return { home, away };
}

function buildTeamForm(name: string, liliRec: Map<string, { c: number; t: number }>): TeamForm | null {
  const t = teamOf(name);
  if (!t) return null; // unknown / placeholder seed → caller renders a "to be decided" slot
  const st = standingOf(name);
  const rec = liliRec.get(name) ?? { c: 0, t: 0 };
  return {
    name: t.name,
    flag: t.flag,
    strength: t.strength,
    pts: st?.pts ?? null,
    played: st?.played ?? 0,
    gd: st?.gd ?? 0,
    liliCorrect: rec.c,
    liliTotal: rec.t,
  };
}

type LiveResult = { status: 'SCHEDULED' | 'LIVE' | 'FINISHED'; homeScore: number | null; awayScore: number | null; winner?: string | null };

export function buildRoadToFinal(liveResults: Record<string, LiveResult> = {}): RoundGroup[] {
  // Lili's per-team call record, derived once from the finished-game track record.
  const liliRec = new Map<string, { c: number; t: number }>();
  for (const g of buildTrackRecord().games) {
    for (const side of [g.home, g.away]) {
      const r = liliRec.get(side) ?? { c: 0, t: 0 };
      r.t += 1;
      if (g.liliRight) r.c += 1;
      liliRec.set(side, r);
    }
  }

  const byRound = new Map<KnockoutRound, KnockoutTie[]>();

  for (const fx of [...WC_KNOCKOUT].sort((a, b) =>
    KNOCKOUT_ORDER[a.round] - KNOCKOUT_ORDER[b.round] ||
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )) {
    const home = buildTeamForm(fx.home, liliRec);
    const away = buildTeamForm(fx.away, liliRec);

    // Lili's read — fold the draw into whichever side she favours (knockouts decide).
    const sH = home?.strength ?? 70;
    const sA = away?.strength ?? 70;
    const p = liliProbs(fx.home, fx.away);
    const homeProb = p.home + p.draw / 2;
    const liliFav: Side = homeProb >= 0.5 ? 'home' : 'away';
    const liliScore = predictScore(sH, sA);

    // Live overlay wins over the baked snapshot.
    const live = liveResults[`${fx.home}|${fx.away}`];
    const status = live?.status ?? fx.status;
    const hs = live?.homeScore ?? fx.homeScore;
    const as = live?.awayScore ?? fx.awayScore;
    const hasScore = hs != null && as != null;
    const result = hasScore ? { home: hs as number, away: as as number } : null;
    // Penalty-shootout score (baked from the feed; null unless the tie went to spot-kicks).
    const penalties = fx.penHome != null && fx.penAway != null
      ? { home: fx.penHome, away: fx.penAway } : null;

    let winner: Side | null = null;
    let liliRight: boolean | null = null;
    if (status === 'FINISHED' && result) {
      if (result.home !== result.away) {
        // Decided in normal/extra time — the scoreline names the winner.
        winner = result.home > result.away ? 'home' : 'away';
      } else {
        // Level scoreline → decided on penalties. Use the REAL winner, never a
        // guess: the live overlay's winning-team name (freshest, ~20s after the
        // whistle), then the baked feed flag (sync-knockout, ET/penalty aware).
        const liveWinner = live?.winner;
        if (liveWinner && liveWinner !== 'Draw') {
          winner = liveWinner === fx.home ? 'home' : liveWinner === fx.away ? 'away' : null;
        }
        if (winner == null && fx.winner) winner = fx.winner;
      }
      if (winner != null) liliRight = winner === liliFav;
    }

    const tie: KnockoutTie = {
      fixture: fx,
      home, away,
      stadium: fx.stadiumId ? getStadium(fx.stadiumId) ?? null : null,
      venueName: fx.venueName,
      city: fx.city,
      homeProb,
      liliFav,
      liliScore,
      status,
      result,
      penalties,
      winner,
      liliRight,
    };

    const bucket = byRound.get(fx.round) ?? [];
    bucket.push(tie);
    byRound.set(fx.round, bucket);
  }

  return ALL_ROUNDS.map(({ round, label }) => ({
    round,
    label,
    ties: byRound.get(round) ?? [],
  }));
}

// Convenience for a one-line scoreboard header: how is Lili doing in the knockouts?
export function liliKnockoutRecord(rounds: RoundGroup[]): { correct: number; total: number } {
  let correct = 0, total = 0;
  for (const r of rounds) for (const t of r.ties) {
    if (t.liliRight !== null) { total += 1; if (t.liliRight) correct += 1; }
  }
  return { correct, total };
}
