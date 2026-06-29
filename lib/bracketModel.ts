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

type LiveResult = { status: 'SCHEDULED' | 'LIVE' | 'FINISHED'; homeScore: number | null; awayScore: number | null };

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

const winnerForm = (tie: KnockoutTie): TeamForm | null =>
  tie.winner == null ? null : tie.winner === 'home' ? tie.home : tie.away;

// Resolve one feeding match into a slot side.
function resolveSide(match: number, r32: Map<number, KnockoutTie>): SlotSide {
  const tie = r32.get(match);
  if (tie) {
    const w = winnerForm(tie);
    if (w) return { kind: 'team', team: w };
    return { kind: 'pair', a: tie.home, b: tie.away, fromMatch: match };
  }
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
  const nodes = BRACKET_SLOTS.map((slot) => ({
    match: slot.match,
    round: slot.round,
    date: slot.date,
    stadium: getStadium(slot.stadiumId) ?? null,
    sideA: resolveSide(slot.feeds[0], r32map),
    sideB: resolveSide(slot.feeds[1], r32map),
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
      // Future slot — the opponent is the other feeder; the team itself sits on
      // whichever side its previous win flows into.
      const myFeederWonInto = slot.feeds.find((f) => onPathTo(f, startMatch, r32map));
      const oppFeeder = slot.feeds.find((f) => f !== myFeederWonInto) ?? slot.feeds[1];
      const opponent = resolveSide(oppFeeder, r32map);
      const state: PathStep['state'] = reachedHere ? 'next' : 'potential';
      const lili = opponentOptions(teamForm.name, opponent);
      steps.push({
        match: cur, round: slot.round, date: slot.date,
        stadium: getStadium(slot.stadiumId) ?? null,
        state, opponent, lili,
      });
      reachedHere = false;          // beyond the real next match, every slot is hypothetical
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
