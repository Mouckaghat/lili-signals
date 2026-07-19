// Diamonds of the Tournament — the players and teams this World Cup discovered.
//
// This is Worldcupilou's celebration layer: not "what's the next fixture" but
// "who lit this tournament up, and why it mattered." Every diamond is derived
// from REAL data — a team's actual strength seed vs how far it actually went, a
// player's actual goals/assists/impact and real age/club — and Lili tells each
// story. Nothing is invented: an "overachiever" is a measurable gap between seed
// and result; a "breakout" is real output, with youth (a real profile age) as
// the honest signal of an emerging talent. No fabricated hype.
//
// Prose is EN + FR (matching lib/liliVoice.ts); other languages fall back to EN.

import { WC_TEAMS } from './wcData';
import { WC_KNOCKOUT, KNOCKOUT_ORDER, type KnockoutRound } from './knockoutData';
import { GROUP_STANDINGS } from './standingsData';
import { computePlayerLeaders } from './playerImpact';
import { FIXTURE_RESULTS, type FixtureResult } from './fixtureResultsData';
import { HEATMAP_I18N } from './heatmapI18n';
import type { VoiceLang } from './liliVoice';

const flagOf = (t: string) => WC_TEAMS.find((x) => x.name === t)?.flag ?? '🏳';
const strengthOf = (t: string) => WC_TEAMS.find((x) => x.name === t)?.strength ?? 65;
const fedOf = (t: string) => WC_TEAMS.find((x) => x.name === t)?.federation ?? '';

const pick = <T>(s: Record<VoiceLang, T>, lang: VoiceLang) => s[lang] ?? s.EN;
const plural = (n: number, sing: Record<VoiceLang, string>, plur: Record<VoiceLang, string>, lang: VoiceLang) =>
  `${n} ${n === 1 ? pick(sing, lang) : pick(plur, lang)}`;
const GOALS = (n: number, lang: VoiceLang) => plural(n, { EN: 'goal', FR: 'but' }, { EN: 'goals', FR: 'buts' }, lang);
const ASSISTS = (n: number, lang: VoiceLang) => plural(n, { EN: 'assist', FR: 'passe décisive' }, { EN: 'assists', FR: 'passes décisives' }, lang);

// How far a round is (0..5) and its celebratory label.
const ROUND_SCORE: Record<KnockoutRound, number> = { R32: 1, R16: 2, QF: 3, SF: 4, '3RD': 4, F: 5 };
const ROUND_LABEL: Record<KnockoutRound, Record<VoiceLang, string>> = {
  R32:   { EN: 'Round of 32',          FR: 'seizièmes de finale' },
  R16:   { EN: 'Round of 16',          FR: 'huitièmes de finale' },
  QF:    { EN: 'quarter-finals',       FR: 'quarts de finale' },
  SF:    { EN: 'semi-finals',          FR: 'demi-finales' },
  '3RD': { EN: 'third-place play-off', FR: 'match pour la 3e place' },
  F:     { EN: 'Final',                FR: 'finale' },
};

export interface TeamDiamond {
  team: string; flag: string; federation: string;
  strength: number; strengthRank: number; // 1 = strongest of 48
  reached: KnockoutRound | null; champion: boolean;
  gf: number; ga: number;
  overIndex: number;
  story: string;
}
export interface PlayerDiamond {
  name: string; team: string; flag: string;
  goals: number; assists: number; age?: number; club?: string; impact: number;
  young: boolean;
  story: string;
}
export interface Diamonds { teams: TeamDiamond[]; players: PlayerDiamond[] }

// A team's furthest round reached + whether it lifted the trophy.
function furthestRound(team: string): { reached: KnockoutRound | null; champion: boolean } {
  let reached: KnockoutRound | null = null;
  let champion = false;
  for (const k of WC_KNOCKOUT) {
    if (k.home !== team && k.away !== team) continue;
    if (reached == null || KNOCKOUT_ORDER[k.round] > KNOCKOUT_ORDER[reached]) reached = k.round;
    if (k.round === 'F' && k.status === 'FINISHED' && k.winner &&
        ((k.winner === 'home' && k.home === team) || (k.winner === 'away' && k.away === team))) {
      champion = true;
    }
  }
  return { reached, champion };
}

// Group-stage goals for/against (real, from the standings).
function groupGoals(team: string): { gf: number; ga: number } {
  const s = GROUP_STANDINGS.find((x) => x.team === team);
  let gf = s?.gf ?? 0, ga = s?.ga ?? 0;
  for (const k of WC_KNOCKOUT) {
    if (k.status !== 'FINISHED' || k.homeScore == null || k.awayScore == null) continue;
    if (k.home === team)      { gf += k.homeScore; ga += k.awayScore; }
    else if (k.away === team) { gf += k.awayScore; ga += k.homeScore; }
  }
  return { gf, ga };
}

// Expected "how far" score from a strength seed rank (1 = strongest).
function expectedScore(rank: number): number {
  return rank <= 2 ? 5 : rank <= 4 ? 4.3 : rank <= 8 ? 3.6 : rank <= 16 ? 2.6 : rank <= 24 ? 1.6 : rank <= 32 ? 1 : 0.4;
}

export function buildDiamonds(results: Record<string, FixtureResult> = FIXTURE_RESULTS, lang: VoiceLang = 'EN'): Diamonds {
  // ── Team diamonds — biggest gap between strength seed and result ────────────
  const ranked = [...WC_TEAMS].sort((a, b) => b.strength - a.strength);
  const rankOf = new Map(ranked.map((t, i) => [t.name, i + 1]));

  const teams: TeamDiamond[] = WC_TEAMS.map((t) => {
    const { reached, champion } = furthestRound(t.name);
    const roundScore = champion ? 6 : reached ? ROUND_SCORE[reached] : 0;
    const rank = rankOf.get(t.name) ?? 48;
    const overIndex = roundScore - expectedScore(rank);
    const { gf, ga } = groupGoals(t.name);
    return {
      team: t.name, flag: t.flag, federation: t.federation,
      strength: t.strength, strengthRank: rank, reached, champion, gf, ga,
      overIndex, story: '',
    };
  })
    .filter((d) => {
      const deep = d.champion || d.reached === 'QF' || d.reached === 'SF' || d.reached === '3RD' || d.reached === 'F';
      // A deep run from outside the elite seeds, a late run from a mid seed, or a
      // clear seed-vs-result gap — all real, measurable overachievement.
      return (deep && d.strengthRank > 6)
        || (d.reached === 'R16' && d.strengthRank > 16)
        || (d.reached === 'R32' && d.strengthRank > 30)
        || d.overIndex >= 1.6;
    })
    .sort((a, b) => b.overIndex - a.overIndex || a.strengthRank - b.strengthRank)
    .slice(0, 6);

  for (const d of teams) {
    const roundTxt = d.champion
      ? pick({ EN: 'went all the way and lifted the trophy', FR: 'est allé au bout et a soulevé le trophée' }, lang)
      : d.reached
      ? pick({ EN: `reached the ${pick(ROUND_LABEL[d.reached], lang)}`, FR: `a atteint les ${pick(ROUND_LABEL[d.reached], lang)}` }, lang)
      : pick({ EN: 'punched above its weight', FR: 'a joué au-dessus de son rang' }, lang);
    const defence = d.ga <= 4
      ? pick({ EN: ` A back line that conceded just ${d.ga} carried them.`, FR: ` Une défense qui n'a encaissé que ${d.ga} les a portés.` }, lang)
      : d.gf >= 10
      ? pick({ EN: ` ${d.gf} goals says they did it with a smile.`, FR: ` ${d.gf} buts : ils l'ont fait le sourire aux lèvres.` }, lang)
      : '';
    d.story = pick({
      EN: `Seeded around #${d.strengthRank} of 48 on pre-tournament strength, ${d.team} ${roundTxt}. This is exactly the kind of run I live for — ${d.federation} had every right to be proud.${defence}`,
      FR: `Classé aux environs de la ${d.strengthRank}e force sur 48 avant le tournoi, ${d.team} ${roundTxt}. C'est exactement le genre de parcours que j'adore — la ${d.federation} pouvait être fière.${defence}`,
    }, lang);
  }

  // ── Player diamonds — real output, youth as the honest "emerging" signal ────
  const L = computePlayerLeaders(results, HEATMAP_I18N.EN);
  const scored = new Map(L.topScorers.map((s) => [`${s.name}|${s.team}`, s]));
  // A "diamond" is a DISCOVERY, not a household name: weight youth and smaller
  // footballing nations heavily so an emerging talent or a small-nation star
  // outranks an established superstar from a powerhouse. Real signals only —
  // age from the player profile, team strength from WC_TEAMS.
  // A diamond is a DISCOVERY: an emerging player (≤23) OR a star from a smaller
  // footballing nation (strength ≤ 70). Established superstars from the
  // powerhouses (Mbappé, Messi, Kane…) are deliberately NOT here — they already
  // headline the Dashboard Leaders. Within the discoveries, rank by real output.
  const cand = L.impact
    .map((r) => {
      const s = scored.get(`${r.name}|${r.team}`);
      const goals = s?.goals ?? r.goals;
      const age = r.age ?? s?.age;
      const young = age != null && age <= 23;
      const str = strengthOf(r.team);
      const smallNation = str <= 70;
      const output = goals * 1.6 + r.assists * 0.9;
      // Youth adds a small tie-breaking lift so an emerging talent edges an
      // equally-productive veteran, but output leads.
      const rankScore = output + (young ? 1.5 : 0);
      return { name: r.name, team: r.team, flag: r.flag, goals, assists: r.assists, age, club: r.club, impact: r.impact, young, smallNation, output, rankScore };
    })
    .filter((r) => (r.goals > 0 || r.assists > 0) && (r.young || r.smallNation) && r.output >= 1.6)
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 6);

  const players: PlayerDiamond[] = cand.map((r) => {
    const line = r.goals && r.assists
      ? `${GOALS(r.goals, lang)}, ${ASSISTS(r.assists, lang)}`
      : r.goals ? GOALS(r.goals, lang) : ASSISTS(r.assists, lang);
    const clubTail = r.club ? pick({ EN: ` of ${r.club}`, FR: ` (${r.club})` }, lang) : '';
    const story = r.young
      ? pick({
          EN: `At ${r.age}, ${r.name}${clubTail} announced themselves to the world — ${line} for ${r.team}. Remember the name; this is a tournament making a star in real time.`,
          FR: `À ${r.age} ans, ${r.name}${clubTail} s'est révélé au monde — ${line} pour ${r.team}. Retenez le nom ; c'est un tournoi qui fabrique une star en direct.`,
        }, lang)
      : r.smallNation
      ? pick({
          EN: `${r.name}${clubTail} put ${r.team} on the map — ${line}. This is the tournament doing what it does best: handing a smaller nation a hero.`,
          FR: `${r.name}${clubTail} a mis ${r.team} sur la carte — ${line}. C'est le tournoi dans ce qu'il fait de mieux : offrir un héros à une nation plus modeste.`,
        }, lang)
      : pick({
          EN: `${r.name}${clubTail} was the heartbeat of ${r.team} — ${line}. The kind of player a whole nation ends up singing about.`,
          FR: `${r.name}${clubTail} a été le cœur de ${r.team} — ${line}. Le genre de joueur qu'une nation entière finit par chanter.`,
        }, lang);
    return { name: r.name, team: r.team, flag: r.flag, goals: r.goals, assists: r.assists, age: r.age, club: r.club, impact: r.impact, young: r.young, story };
  });

  return { teams, players };
}
