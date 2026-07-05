// Progressive bracket model — "Road to the Final 2.0".
//
// Resolves the curated official tree (lib/bracketStructure) against the live
// Round-of-32 results: as soon as a team wins, it advances into its next slot,
// with the still-unknown opponent shown honestly as "A or B" (the two teams of
// an undecided R32 tie) or "Winner of Match X" (a deeper, not-yet-played slot).
// Nothing here is fabricated — future matchups are real structural facts, and
// every Lili read is our own labelled win-probability model.

import { buildRoadToFinal, type KnockoutTie, type Side, type TeamForm } from './knockoutModel';
import { BRACKET_SLOTS, SLOT_BY_MATCH, nextSlotForWinner, r32MatchOf } from './bracketStructure';
import { getStadium, type StadiumInfo } from './stadiumData';
import { liliProbs } from './marketComparison';
import type { KnockoutRound } from './knockoutData';

type LiveResult = { status: 'SCHEDULED' | 'LIVE' | 'FINISHED'; homeScore: number | null; awayScore: number | null; winner?: string | null };

// A resolved side of a slot: a known qualifier, an undecided R32 pair ("A or B"),
// or a deeper unknown ("Winner of Match X").
export type SlotSide =
  | { kind: 'team'; team: TeamForm }
  | { kind: 'pair'; a: TeamForm | null; b: TeamForm | null; fromMatch: number }
  | { kind: 'winner'; fromMatch: number; round: KnockoutRound };

// A node in the full bracket (a future slot 89–104).
export interface BracketNode {
  match: number;
  round: KnockoutRound;
  date: string;
  stadium: StadiumInfo | null;
  sideA: SlotSide;
  sideB: SlotSide;
  // The resolved tie for this slot once BOTH its feeders are decided — real (baked)
  // or synthesized from the live overlay. When set, the UI renders a full result
  // card (score/winner/heatmap); when null it stays a matchup preview (A or B / TBD).
  tie: KnockoutTie | null;
}

// Lili's honest read of a still-undecided opponent: her advance-probability for
// the followed team against each possible side (from the win-prob model only).
export interface LiliOption { team: TeamForm; advancePct: number }

// One step on a followed team's road to the final.
export interface PathStep {
  match: number;
  round: KnockoutRound;
  date: string;
  stadium: StadiumInfo | null;
  state: 'won' | 'eliminated' | 'live' | 'next' | 'potential';
  tie?: KnockoutTie;       // the real R32 tie (set only for the R32 step)
  mySide?: Side;           // which side the followed team is on (R32 step)
  opponent: SlotSide;      // resolved team / "A or B" / "Winner of Match X"
  lili?: LiliOption[];     // advance-% vs each possible opponent (when not yet resolved)
}

export interface TeamPath {
  team: TeamForm;
  steps: PathStep[];
  status: 'alive' | 'eliminated' | 'champion';
}

// ── R32 helpers ────────────────────────────────────────────────────────────────
function r32ByMatch(ties: KnockoutTie[]): Map<number, KnockoutTie> {
  const m = new Map<number, KnockoutTie>();
  for (const t of ties) {
    const num = r32MatchOf(t.fixture.home, t.fixture.away);
    if (num != null) m.set(num, t);
  }
  return m;
}

// Resolve one feeding match into a slot side. Winners propagate from ANY round
// (not just R32), so a QF/SF/Final side resolves to a real team the moment its
// feeder round finishes — not "Winner of Match 89" forever.
function resolveSide(
  match: number,
  r32: Map<number, KnockoutTie>,
  winners: Map<number, TeamForm>,
): SlotSide {
  const w = winners.get(match);
  if (w) return { kind: 'team', team: w };
  const tie = r32.get(match);
  if (tie) return { kind: 'pair', a: tie.home, b: tie.away, fromMatch: match };
  const slot = SLOT_BY_MATCH.get(match);
  return { kind: 'winner', fromMatch: match, round: slot?.round ?? 'R16' };
}

// ── Full bracket (All Teams mode) ───────────────────────────────────────────────
// R32 = the real ties (from buildRoadToFinal); 89–104 = progressively resolved.
export function buildFullBracket(liveResults: Record<string, LiveResult> = {}): {
  r32: KnockoutTie[];
  nodes: BracketNode[];
} {
  const rounds = buildRoadToFinal(liveResults);
  const r32 = rounds.find((r) => r.round === 'R32')?.ties ?? [];
  const r32map = r32ByMatch(r32);

  // Every resolved tie (R32 + progressively-synthesized future rounds), keyed by
  // official match number, and the winner (as a TeamForm) of each decided match —
  // so a slot can both carry its own result and resolve its feeder sides.
  const tieByMatch = new Map<number, KnockoutTie>();
  const winners = new Map<number, TeamForm>();
  for (const rg of rounds) {
    for (const ti of rg.ties) {
      if (ti.matchNo == null) continue;
      tieByMatch.set(ti.matchNo, ti);
      if (ti.winner) {
        const w = ti.winner === 'home' ? ti.home : ti.away;
        if (w) winners.set(ti.matchNo, w);
      }
    }
  }

  const nodes: BracketNode[] = BRACKET_SLOTS.map((slot) => ({
    match: slot.match,
    round: slot.round,
    date: slot.date,
    stadium: getStadium(slot.stadiumId) ?? null,
    sideA: resolveSide(slot.feeds[0], r32map, winners),
    sideB: resolveSide(slot.feeds[1], r32map, winners),
    tie: tieByMatch.get(slot.match) ?? null,
  }));
  return { r32, nodes };
}

// ── Followed team's path (My Team mode) ─────────────────────────────────────────
export function buildTeamPath(
  favTeam: string,
  liveResults: Record<string, LiveResult> = {},
): TeamPath | null {
  const rounds = buildRoadToFinal(liveResults);
  const r32 = rounds.find((r) => r.round === 'R32')?.ties ?? [];
  const r32map = r32ByMatch(r32);

  // Winners across ALL rounds, so a future opponent resolves once its feeder round
  // finishes (not only from R32).
  const winners = new Map<number, TeamForm>();
  for (const rg of rounds) for (const ti of rg.ties) {
    if (ti.matchNo != null && ti.winner) {
      const w = ti.winner === 'home' ? ti.home : ti.away;
      if (w) winners.set(ti.matchNo, w);
    }
  }

  // Every resolved tie (R32 + Phase-2 synthesized R16→Final), keyed by official
  // match number. This is the SAME source All-Teams mode reads, so a future slot the
  // followed team actually reached shows its REAL result (score/winner/heatmap) —
  // not a stale "next" preview. Without this, My-Team mode under-reports every round
  // past R32 for every team (the R16-vs-Paraguay-not-updating bug).
  const tieByMatch = new Map<number, KnockoutTie>();
  for (const rg of rounds) for (const ti of rg.ties) {
    if (ti.matchNo != null) tieByMatch.set(ti.matchNo, ti);
  }

  // Find the followed team's R32 tie.
  let startMatch: number | null = null;
  let teamForm: TeamForm | null = null;
  for (const [num, tie] of r32map) {
    if (tie.fixture.home === favTeam) { startMatch = num; teamForm = tie.home; break; }
    if (tie.fixture.away === favTeam) { startMatch = num; teamForm = tie.away; break; }
  }
  if (startMatch == null || !teamForm) return null; // team isn't in the R32

  const steps: PathStep[] = [];
  let status: TeamPath['status'] = 'alive';
  let cur: number | null = startMatch;
  let reachedHere = true;   // has the team actually arrived at `cur`?

  while (cur != null) {
    const tie = r32map.get(cur);
    const slot = SLOT_BY_MATCH.get(cur);

    if (tie) {
      // Real R32 step.
      const mySide: Side = tie.fixture.home === favTeam ? 'home' : 'away';
      const oppForm = mySide === 'home' ? tie.away : tie.home;
      const won = tie.winner === mySide;
      const lost = tie.winner != null && !won;
      const state: PathStep['state'] = lost ? 'eliminated' : won ? 'won' : tie.status === 'LIVE' ? 'live' : 'next';
      steps.push({
        match: cur, round: 'R32', date: tie.fixture.date,
        stadium: tie.stadium, state, tie, mySide,
        opponent: oppForm ? { kind: 'team', team: oppForm } : { kind: 'winner', fromMatch: cur, round: 'R32' },
      });
      if (lost) { status = 'eliminated'; break; }
      reachedHere = won;            // only advance as "reached" if the team actually won
    } else if (slot) {
      // Future slot (R16→Final). The opponent is the other feeder; the team sits on
      // whichever side its previous win flows into.
      const myFeederWonInto = slot.feeds.find((f) => onPathTo(f, startMatch, r32map));
      const oppFeeder = slot.feeds.find((f) => f !== myFeederWonInto) ?? slot.feeds[1];

      const resolved = tieByMatch.get(cur);
      if (resolved && (resolved.fixture.home === favTeam || resolved.fixture.away === favTeam)) {
        // The followed team actually reached this slot and it's now a real tie
        // (played, live, or scheduled with both sides known) — render the true result,
        // exactly like All-Teams mode, so both modes agree for any team.
        const mySide: Side = resolved.fixture.home === favTeam ? 'home' : 'away';
        const oppForm = mySide === 'home' ? resolved.away : resolved.home;
        const won = resolved.winner === mySide;
        const lost = resolved.winner != null && !won;
        const state: PathStep['state'] = lost ? 'eliminated' : won ? 'won' : resolved.status === 'LIVE' ? 'live' : 'next';
        steps.push({
          match: cur, round: slot.round, date: resolved.fixture.date,
          stadium: resolved.stadium ?? getStadium(slot.stadiumId) ?? null,
          state, tie: resolved, mySide,
          opponent: oppForm ? { kind: 'team', team: oppForm } : resolveSide(oppFeeder, r32map, winners),
        });
        if (lost) { status = 'eliminated'; break; }
        reachedHere = won;          // only keep advancing as "reached" if the team won
      } else {
        // Not yet a resolved tie for this team — honest "next / potential opponent" preview.
        const opponent = resolveSide(oppFeeder, r32map, winners);
        const state: PathStep['state'] = reachedHere ? 'next' : 'potential';
        const lili = opponentOptions(teamForm.name, opponent);
        steps.push({
          match: cur, round: slot.round, date: slot.date,
          stadium: getStadium(slot.stadiumId) ?? null,
          state, opponent, lili,
        });
        reachedHere = false;        // beyond the real next match, every slot is hypothetical
      }
    }

    const next = nextSlotForWinner(cur);
    cur = next ? next.match : null;
  }

  if (steps.length > 0 && steps[steps.length - 1].round === 'F' && steps[steps.length - 1].state === 'won') {
    status = 'champion';
  }
  return { team: teamForm, steps, status };
}

// Does match `feed` sit on the followed team's branch (i.e. is `start` reachable
// down-tree from `feed`)? Walks winners upward from the team's R32 match.
function onPathTo(feed: number, start: number, r32: Map<number, KnockoutTie>): boolean {
  let cur: number | null = start;
  while (cur != null) {
    if (cur === feed) return true;
    const next = nextSlotForWinner(cur);
    cur = next ? next.match : null;
  }
  return false;
}

// Lili's labelled advance-% for the followed team against each possible opponent
// (only when the opponent is still an undecided R32 pair — "A or B").
function opponentOptions(team: string, opp: SlotSide): LiliOption[] | undefined {
  if (opp.kind !== 'pair') return undefined;
  const out: LiliOption[] = [];
  for (const cand of [opp.a, opp.b]) {
    if (!cand) continue;
    const p = liliProbs(team, cand.name);
    out.push({ team: cand, advancePct: Math.round((p.home + p.draw / 2) * 100) });
  }
  return out.length ? out : undefined;
}
