// Honest scoreboard: for every FINISHED fixture we hold a closing market line +
// (sometimes) an api-football model line, and Lili's own model is always
// computable. This scores each source's pre-match favourite against the actual
// result — no hindsight, no fabrication. A source is only tallied on games where
// it actually had a line (Lili: always; market: closing odds; model: when real).

import { MARKET_ODDS, type MarketTriple } from './marketOddsData';
import { FIXTURE_RESULTS } from './fixtureResultsData';
import { liliProbs, favourite, type Outcome, type ProbRow } from './marketComparison';

export interface SourceRecord { correct: number; total: number }

export interface GamePick {
  fixtureId: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  actual: Outcome;
  liliPick: Outcome;          liliRight: boolean;
  marketPick: Outcome | null; marketRight: boolean | null;
  modelPick: Outcome | null;  modelRight: boolean | null;
}

export interface TrackRecord {
  lili: SourceRecord;
  market: SourceRecord;
  model: SourceRecord;
  games: GamePick[];
  highlight: GamePick | null;  // best "Lili called it, the market didn't"
}

const outcomeOf = (hs: number, as: number): Outcome => (hs > as ? 'home' : as > hs ? 'away' : 'draw');
const asRow = (t: MarketTriple): ProbRow => ({ home: t.home, draw: t.draw, away: t.away });

export function buildTrackRecord(): TrackRecord {
  const lili: SourceRecord   = { correct: 0, total: 0 };
  const market: SourceRecord = { correct: 0, total: 0 };
  const model: SourceRecord  = { correct: 0, total: 0 };
  const games: GamePick[] = [];

  for (const o of MARKET_ODDS) {
    const res = FIXTURE_RESULTS[`${o.home}|${o.away}`];
    if (!res || res.status !== 'FINISHED' || res.homeScore == null || res.awayScore == null) continue;

    const actual = outcomeOf(res.homeScore, res.awayScore);

    const liliPick = favourite(liliProbs(o.home, o.away));
    const liliRight = liliPick === actual;
    lili.total += 1; if (liliRight) lili.correct += 1;

    let marketPick: Outcome | null = null, marketRight: boolean | null = null;
    if (o.market) {
      marketPick = favourite(asRow(o.market));
      marketRight = marketPick === actual;
      market.total += 1; if (marketRight) market.correct += 1;
    }

    let modelPick: Outcome | null = null, modelRight: boolean | null = null;
    if (o.model) {
      modelPick = favourite(asRow(o.model));
      modelRight = modelPick === actual;
      model.total += 1; if (modelRight) model.correct += 1;
    }

    games.push({
      fixtureId: o.fixtureId, home: o.home, away: o.away,
      homeScore: res.homeScore, awayScore: res.awayScore, actual,
      liliPick, liliRight, marketPick, marketRight, modelPick, modelRight,
    });
  }

  // Highlight: a game Lili called right while the market called it wrong, ranked
  // by how strongly the market backed the losing side (the bigger the upset Lili
  // saw and the market missed, the better the story).
  const highlight = games
    .filter((g) => g.liliRight && g.marketRight === false && g.marketPick)
    .sort((a, b) => {
      const oddsRow = MARKET_ODDS.find((m) => m.fixtureId === b.fixtureId)?.market;
      const aRow = MARKET_ODDS.find((m) => m.fixtureId === a.fixtureId)?.market;
      const bConf = oddsRow ? oddsRow[b.marketPick!] : 0;
      const aConf = aRow ? aRow[a.marketPick!] : 0;
      return bConf - aConf;
    })[0] ?? null;

  return { lili, market, model, games, highlight };
}
