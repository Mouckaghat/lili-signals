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
import { BRACKET_SLOTS, r32MatchOf } from './bracketStructure';

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
  matchNo: number | null;   // official FIFA match number (R32 = 73–88, R16 = 89–96, … Final = 104)
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

  // Official match number → winning team name, filled progressively as we walk the
  // rounds in order (R32 first). Lets a feed R16+ tie find its slot number by
  // matching its two teams to the winners of the slot's feeder matches.
  const winnerByMatch = new Map<number, string>();

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

    // Official match number: R32 maps directly by team pair; an R16+ tie matches
    // the slot of its round whose two feeder matches were won by these two teams.
    let matchNo: number | null = null;
    if (fx.round === 'R32') {
      matchNo = r32MatchOf(fx.home, fx.away);
    } else {
      for (const slot of BRACKET_SLOTS) {
        if (slot.round !== fx.round) continue;
        const a = winnerByMatch.get(slot.feeds[0]);
        const b = winnerByMatch.get(slot.feeds[1]);
        if (a && b && (a === fx.home || a === fx.away) && (b === fx.home || b === fx.away)) {
          matchNo = slot.match;
          break;
        }
      }
    }
    // Record this tie's winner under its match number so later rounds can resolve.
    if (matchNo != null && winner != null) {
      winnerByMatch.set(matchNo, winner === 'home' ? fx.home : fx.away);
    }

    const tie: KnockoutTie = {
      fixture: fx,
      matchNo,
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

  // ── Phase 2: progressive future rounds (deploy-independent) ────────────────────
  // The feed only ever carries the CURRENT round's fixtures, and even once a deeper
  // round is baked into WC_KNOCKOUT it's deploy-gated. So for any bracket slot whose
  // BOTH feeder winners are already known, synthesize its tie here — teams resolved
  // from the winners we just computed, and any live/final score pulled straight from
  // the /api/fixture-results overlay by team name. This means a new round appears —
  // real matchup + live score + winner — the instant the previous round finishes,
  // with NO redeploy. Walk in match-number order so a synthesized winner feeds the
  // next slot (feeds are always lower-numbered matches).
  const labelOf = new Map(ALL_ROUNDS.map((r) => [r.round, r.label]));
  const haveMatch = new Set<number>();
  for (const list of byRound.values()) for (const ti of list) if (ti.matchNo != null) haveMatch.add(ti.matchNo);

  for (const slot of [...BRACKET_SLOTS].sort((a, b) => a.match - b.match)) {
    if (haveMatch.has(slot.match)) continue;   // already a real (baked) tie
    if (slot.thirdPlace) continue;             // 3rd place uses LOSERS — not tracked here
    const hName = winnerByMatch.get(slot.feeds[0]);
    const aName = winnerByMatch.get(slot.feeds[1]);
    if (!hName || !aName) continue;            // both sides not yet decided → leave as a preview slot

    const home = buildTeamForm(hName, liliRec);
    const away = buildTeamForm(aName, liliRec);
    const sH = home?.strength ?? 70;
    const sA = away?.strength ?? 70;
    const p = liliProbs(hName, aName);
    const homeProb = p.home + p.draw / 2;
    const liliFav: Side = homeProb >= 0.5 ? 'home' : 'away';
    const liliScore = predictScore(sH, sA);

    // Live overlay by team name. The feed's home/away order isn't known ahead of the
    // draw, so try both orders and swap the scores if it's keyed the other way round.
    let live = liveResults[`${hName}|${aName}`];
    let swapped = false;
    if (!live) { const r = liveResults[`${aName}|${hName}`]; if (r) { live = r; swapped = true; } }
    const status = live?.status ?? 'SCHEDULED';
    const rawH = live?.homeScore ?? null;
    const rawA = live?.awayScore ?? null;
    const hs = swapped ? rawA : rawH;
    const as = swapped ? rawH : rawA;
    const result = hs != null && as != null ? { home: hs, away: as } : null;

    let winner: Side | null = null;
    let liliRight: boolean | null = null;
    if (status === 'FINISHED' && result) {
      if (result.home !== result.away) winner = result.home > result.away ? 'home' : 'away';
      else {
        const lw = live?.winner;
        if (lw && lw !== 'Draw') winner = lw === hName ? 'home' : lw === aName ? 'away' : null;
      }
      if (winner != null) liliRight = winner === liliFav;
    }
    if (winner != null) winnerByMatch.set(slot.match, winner === 'home' ? hName : aName);

    const stadium = getStadium(slot.stadiumId) ?? null;
    // A synthetic fixture id (prefix "slot-") marks a not-yet-baked tie: the bracket
    // suppresses the heatmap CTA for it (no match-intelligence data under a real id yet).
    const synthFixture: KnockoutFixture = {
      id: `slot-${slot.match}`,
      round: slot.round,
      roundLabel: labelOf.get(slot.round) ?? '',
      home: hName, away: aName,
      date: slot.date,
      stadiumId: slot.stadiumId,
      venueName: stadium?.shortName ?? null,
      city: stadium?.city ?? null,
      status, homeScore: hs, awayScore: as, winner,
      penHome: null, penAway: null,
    };
    const tie: KnockoutTie = {
      fixture: synthFixture,
      matchNo: slot.match,
      home, away,
      stadium,
      venueName: synthFixture.venueName,
      city: synthFixture.city,
      homeProb, liliFav, liliScore,
      status, result, penalties: null, winner, liliRight,
    };
    const bucket = byRound.get(slot.round) ?? [];
    bucket.push(tie);
    byRound.set(slot.round, bucket);
    haveMatch.add(slot.match);
  }

  return ALL_ROUNDS.map(({ round, label }) => ({
    round,
    label,
    // Stable order: by kickoff, then official match number (baked + synthesized mix).
    ties: (byRound.get(round) ?? []).sort((a, b) =>
      new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime() ||
      (a.matchNo ?? 0) - (b.matchNo ?? 0)),
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
