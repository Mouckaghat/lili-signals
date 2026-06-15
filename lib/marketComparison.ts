// Honest model: joins three real signals per upcoming fixture so the
// "Lili vs The Market" screen can compare them side by side. No fabrication —
// every number traces to a real source:
//   - lili   → our own model, wcSimulation.matchProbs(strengthHome, strengthAway)
//   - market → bookmaker consensus, de-vigged (lib/marketOddsData.ts ← /odds)
//   - model  → api-football's /predictions percentages (null when they have none)
//
// "Favourite" is just the argmax outcome of a probability row; "agree" compares
// Lili's favourite to the market's. Nothing here invents data it wasn't given.

import { MARKET_ODDS, type MarketTriple } from './marketOddsData';
import { WC_FIXTURES, WC_TEAMS } from './wcData';
import { matchProbs } from './wcSimulation';

export type Outcome = 'home' | 'draw' | 'away';
export type ProbRow = { home: number; draw: number; away: number };

export interface MatchComparison {
  fixtureId: string;
  home: string;
  away: string;
  date: string;
  group: string;
  lili: ProbRow;                 // always present — we always have team strengths
  market: ProbRow | null;
  model: ProbRow | null;
  bookmakers: number;
  advice: string | null;
  liliFav: Outcome;
  marketFav: Outcome | null;
  agree: boolean | null;         // Lili's favourite === market's favourite
  boldness: number | null;       // (Lili − market) on the market's favourite, in prob points
}

const strengthOf = (name: string) => WC_TEAMS.find((t) => t.name === name)?.strength ?? 70;

// Lili's win/draw/loss for the HOME team → home/draw/away probabilities.
export function liliProbs(home: string, away: string): ProbRow {
  const [win, draw, loss] = matchProbs(strengthOf(home), strengthOf(away));
  return { home: win, draw, away: loss };
}

export function favourite(p: ProbRow): Outcome {
  if (p.home >= p.draw && p.home >= p.away) return 'home';
  if (p.away >= p.draw && p.away >= p.home) return 'away';
  return 'draw';
}

const asRow = (t: MarketTriple | null): ProbRow | null =>
  t === null ? null : { home: t.home, draw: t.draw, away: t.away };

export function buildComparisons(): MatchComparison[] {
  const fixtureById = new Map(WC_FIXTURES.map((f) => [f.id, f]));

  const rows: MatchComparison[] = [];
  for (const o of MARKET_ODDS) {
    const fx = fixtureById.get(o.fixtureId);
    if (!fx) continue;                       // odds for a fixture we don't track — skip

    const lili = liliProbs(o.home, o.away);
    const market = asRow(o.market);
    const liliFav = favourite(lili);
    const marketFav = market ? favourite(market) : null;

    rows.push({
      fixtureId: o.fixtureId,
      home: o.home,
      away: o.away,
      date: fx.date,
      group: fx.group,
      lili,
      market,
      model: asRow(o.model),
      bookmakers: o.bookmakers,
      advice: o.advice,
      liliFav,
      marketFav,
      agree: marketFav ? liliFav === marketFav : null,
      boldness: market ? lili[marketFav!] - market[marketFav!] : null,
    });
  }

  // Soonest kickoff first.
  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return rows;
}
