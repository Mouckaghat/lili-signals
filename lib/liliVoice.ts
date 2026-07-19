// Lili's match narrative — a multi-beat, evolving read of a game that reads like
// someone who has watched hundreds of matches, not a one-line stat dump.
//
// Every beat is derived from REAL signals (the score, xG, the control index,
// each team's actual tournament goals-for / goals-against coming into the game,
// and the goal timeline) and every interpretive leap is LABELLED as Lili's
// theory. A theory is an honest read of real evidence — never a fabricated fact.
// We never invent a number: if a signal isn't there, its beat simply doesn't
// fire, and the narrative grows as the match develops.
//
// Prose is EN + FR (the app's primary languages, matching lib/routeDispatch.ts);
// other languages fall back to EN until a native pass. Kept out of the
// 11-language HEATMAP_I18N record on purpose so the narrative can be rich
// without a blocking all-eleven translation.

export type BeatTone = 'read' | 'theory' | 'swing' | 'verdict' | 'story';
export interface LiliBeat { tag: string; tone: BeatTone; text: string }

export type VoiceLang = 'EN' | 'FR';

export interface LiliVoiceInput {
  home: string; away: string;
  homeScore: number | null; awayScore: number | null;
  status: 'FINAL' | 'LIVE' | 'UPCOMING';
  elapsed: number | null;
  controlHome: number;               // 0..100 (control index for the home side)
  xgHome: number; xgAway: number;
  strengthHome: number; strengthAway: number;
  // Tournament profile coming INTO this match (this fixture excluded).
  homeGF: number; homeGA: number; homeGames: number;
  awayGF: number; awayGA: number; awayGames: number;
  goals: { minute: number; side: 'home' | 'away' }[];
  topDriver?: string;                // the single biggest real match driver
  heroName?: string;                 // man-of-the-match, if known
  roundLabel?: string;               // 'Final', 'Semi-final', 'Group A'…
}

// ── tiny localisation helper ────────────────────────────────────────────────
type Str = Record<VoiceLang, string>;
const pick = (s: Str, lang: VoiceLang) => s[lang] ?? s.EN;
const one = (n: number, sing: Str, plur: Str, lang: VoiceLang) => pick(n === 1 ? sing : plur, lang);

const TAG = {
  read:    { EN: 'THE READ',        FR: 'LA LECTURE' } as Str,
  theory:  { EN: "SOMETHING'S OFF", FR: 'QUELQUE CHOSE CLOCHE' } as Str,
  swing:   { EN: 'THE SWING',       FR: 'LE TOURNANT' } as Str,
  verdict: { EN: 'THE VERDICT',     FR: 'LE VERDICT' } as Str,
  story:   { EN: 'THE STORY',       FR: "L'HISTOIRE" } as Str,
};

const perGame = (gf: number, games: number) => (games > 0 ? gf / games : null);

/**
 * Build Lili's running read of a match — an ordered list of beats. Beats are
 * emitted only when their real trigger fires, so an upcoming game shows just the
 * pre-match read while a live comeback grows a "something's off" → "the swing"
 * arc in real time (this recomputes from live score/xG/events upstream).
 */
export function liliNarrative(v: LiliVoiceInput, lang: VoiceLang = 'EN'): LiliBeat[] {
  const beats: LiliBeat[] = [];
  const hs = v.homeScore, as = v.awayScore;
  const hasScore = hs != null && as != null;
  const lead = hasScore ? Math.abs(hs! - as!) : 0;
  const homeLeads = hasScore && hs! > as!;
  const leader = hasScore ? (homeLeads ? v.home : v.away) : null;
  const trailer = hasScore ? (homeLeads ? v.away : v.home) : null;

  // Leader/trailer tournament profiles + xG for this game.
  const leadGF = homeLeads ? v.homeGF : v.awayGF;
  const trailGA = homeLeads ? v.awayGA : v.homeGA;
  const trailGames = homeLeads ? v.awayGames : v.homeGames;
  const leadGames = homeLeads ? v.homeGames : v.awayGames;
  const leadGoalsNow = homeLeads ? hs! : as!;
  const trailConcNow = leadGoalsNow;
  const leadXg = homeLeads ? v.xgHome : v.xgAway;
  const leadControl = homeLeads ? v.controlHome : 100 - v.controlHome;

  const leadAvgScore = perGame(leadGF, leadGames);
  const trailAvgConc = perGame(trailGA, trailGames);

  // Reconstruct the running score from the goal timeline to find the biggest
  // lead one side held, and whether the other side has since clawed it back.
  let rh = 0, ra = 0, maxLead = 0, maxLeadSide: 'home' | 'away' | null = null;
  for (const g of [...v.goals].sort((a, b) => a.minute - b.minute)) {
    if (g.side === 'home') rh++; else ra++;
    const l = Math.abs(rh - ra);
    if (l > maxLead) { maxLead = l; maxLeadSide = rh > ra ? 'home' : 'away'; }
  }
  const curLeadSide: 'home' | 'away' | null = hasScore ? (hs! > as! ? 'home' : as! > hs! ? 'away' : null) : null;
  // A comeback = a side that was ≥2 down has pulled the deficit back by ≥2.
  const comebackOn = maxLead >= 2 && maxLeadSide != null && (lead < maxLead) && (maxLead - lead >= 2 || lead === 0);
  const comebackTeam = comebackOn ? (maxLeadSide === 'home' ? v.away : v.home) : null;
  const comebackHome = maxLeadSide === 'home' ? false : true;
  const clawedBack = maxLead - lead;

  const nf = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

  // ── Beat 1 · The pre-match / opening read ─────────────────────────────────
  // Fires before kickoff and in the opening exchanges (no decisive lead yet).
  if (v.status === 'UPCOMING' || (v.status === 'LIVE' && lead < 2 && (v.elapsed ?? 0) < 25)) {
    const meanGA = (t: 'home' | 'away') => {
      const ga = t === 'home' ? v.homeGA : v.awayGA, g = t === 'home' ? v.homeGames : v.awayGames;
      return g > 0 ? ga / g : null;
    };
    const meanGF = (t: 'home' | 'away') => {
      const gf = t === 'home' ? v.homeGF : v.awayGF, g = t === 'home' ? v.homeGames : v.awayGames;
      return g > 0 ? gf / g : null;
    };
    const hGA = meanGA('home'), aGF = meanGF('away'), aGA = meanGA('away'), hGF = meanGF('home');
    const sDiff = v.strengthHome - v.strengthAway;
    const lean = Math.abs(sDiff) < 4 ? null : sDiff > 0 ? v.home : v.away;
    const stage = v.roundLabel ? pick({ EN: `This ${v.roundLabel}`, FR: `Ce ${v.roundLabel}` }, lang) : pick({ EN: 'This one', FR: 'Ce match' }, lang);

    const en =
      `${stage} pits ${v.home} against ${v.away}, and I've been circling it for a while. ` +
      (v.homeGames > 0 && v.awayGames > 0
        ? `${v.home} have leaked just ${v.homeGA} in ${v.homeGames}${one(v.homeGames,{EN:' game',FR:''} as Str,{EN:' games',FR:''} as Str,lang)}; ${v.away} have scored ${v.awayGF}. `
        : '') +
      (lean
        ? `On the balance of what I've watched, I lean ${lean} — but finals have their own gravity.`
        : `I genuinely can't separate them, and that's the fun of it.`);
    const fr =
      `${stage} oppose ${v.home} à ${v.away}, et je tourne autour depuis un moment. ` +
      (v.homeGames > 0 && v.awayGames > 0
        ? `${v.home} n'a encaissé que ${v.homeGA} en ${v.homeGames} match(s) ; ${v.away} en a mis ${v.awayGF}. `
        : '') +
      (lean
        ? `Au vu de tout ce que j'ai regardé, je penche pour ${lean} — mais une finale a sa propre gravité.`
        : `Honnêtement je n'arrive pas à les départager, et c'est là tout le sel.`);
    beats.push({ tag: pick(TAG.read, lang), tone: 'read', text: pick({ EN: en, FR: fr }, lang) });
  }

  // ── Beat 2 · Something's off (the "strange game" detector) ─────────────────
  // Fires when a real lead contradicts either the run of play (control), the
  // finishing (goals >> xG), or the two teams' whole-tournament profiles.
  if (hasScore && lead >= 2 && leader && trailer) {
    const controlDivergence = leadControl < 45;                       // scoring against the play
    const xgDivergence = leadGoalsNow >= Math.ceil(leadXg) + 1;       // finishing hot
    const profileDivergence =
      (trailAvgConc != null && trailConcNow >= trailAvgConc * 2 && trailAvgConc < 1.6) ||
      (leadAvgScore != null && leadGoalsNow >= leadAvgScore * 2 && leadAvgScore < 2);

    if (controlDivergence || xgDivergence || profileDivergence) {
      const enParts: string[] = [`Something doesn't add up here.`];
      const frParts: string[] = [`Il y a quelque chose qui cloche.`];
      if (trailAvgConc != null && trailGames > 0) {
        enParts.push(`${trailer} had conceded just ${trailGA} across ${trailGames} game${trailGames === 1 ? '' : 's'} — and they're ${lead} down.`);
        frParts.push(`${trailer} n'avait encaissé que ${trailGA} en ${trailGames} match(s) — et les voilà menés de ${lead}.`);
      }
      if (leadAvgScore != null && leadGoalsNow >= leadAvgScore * 1.7) {
        enParts.push(`${leader} hadn't been this ruthless all tournament.`);
        frParts.push(`${leader} n'avait jamais été aussi tranchant du tournoi.`);
      }
      // The theory — chosen from the strongest live signal, always labelled.
      let enTheory: string, frTheory: string;
      if (xgDivergence) {
        enTheory = `My theory: ${leader} are finishing everything — ${leadGoalsNow} goals from about ${nf(leadXg)} expected. That runs hot, and hot rarely lasts ninety minutes.`;
        frTheory = `Ma théorie : ${leader} met tout au fond — ${leadGoalsNow} buts pour environ ${nf(leadXg)} attendus. Ça surchauffe, et ça tient rarement quatre-vingt-dix minutes.`;
      } else if (controlDivergence) {
        enTheory = `My theory: ${leader} are scoring against the run of play — ${trailer} have carried the ball but keep getting caught the moment they commit men forward.`;
        frTheory = `Ma théorie : ${leader} marque contre le cours du jeu — ${trailer} a le ballon mais se fait punir dès qu'il monte.`;
      } else {
        enTheory = `My theory: an early goal cracked this open and ${trailer}'s shape never reset — once the plan breaks, the numbers stop meaning what they did.`;
        frTheory = `Ma théorie : un but précoce a fait sauter le verrou et ${trailer} n'a jamais retrouvé sa structure — quand le plan casse, les stats ne veulent plus rien dire.`;
      }
      enParts.push(enTheory); frParts.push(frTheory);
      beats.push({ tag: pick(TAG.theory, lang), tone: 'theory', text: pick({ EN: enParts.join(' '), FR: frParts.join(' ') }, lang) });
    }
  }

  // ── Beat 3 · The swing (a comeback in progress or completed) ───────────────
  if (comebackOn && comebackTeam) {
    const strength = comebackHome ? v.strengthHome : v.strengthAway;
    const oppStrength = comebackHome ? v.strengthAway : v.strengthHome;
    const alive = lead === 0
      ? pick({ EN: `all square`, FR: `à égalité` }, lang)
      : pick({ EN: `${clawedBack} back`, FR: `${clawedBack} de recollés` }, lang);
    const finished = v.status === 'FINAL';
    const en = finished
      ? `And there was the swing — ${comebackTeam} clawed it ${alive} before the end. I keep saying it: a side with a real strike force is never truly buried.`
      : `And here's the swing. ${comebackTeam} are ${alive} and pushing — the crowd can feel it too. On strike power alone I wouldn't call this over: ${comebackTeam} carry the firepower to finish it${strength >= oppStrength ? ', and the better squad on paper' : ''}.`;
    const fr = finished
      ? `Et voilà le tournant — ${comebackTeam} est revenu ${alive} avant la fin. Je le répète : une équipe avec une vraie force de frappe n'est jamais vraiment enterrée.`
      : `Et voilà le tournant. ${comebackTeam} est ${alive} et pousse — le public le sent aussi. Sur la seule puissance offensive, je ne l'enterre pas : ${comebackTeam} a le feu pour finir le travail${strength >= oppStrength ? ', et le meilleur effectif sur le papier' : ''}.`;
    beats.push({ tag: pick(TAG.swing, lang), tone: 'swing', text: pick({ EN: en, FR: fr }, lang) });
  }

  // ── Beat 4 · The verdict (full time only) ─────────────────────────────────
  if (v.status === 'FINAL' && hasScore) {
    const sc = `${hs}-${as}`;
    if (lead === 0) {
      const en = `Full time, ${sc}, and honestly a draw felt right — neither blinked. The details will decide who travels on.`;
      const fr = `Coup de sifflet final, ${sc}, et franchement le nul était juste — personne n'a cédé. Les détails trancheront pour la suite.`;
      beats.push({ tag: pick(TAG.verdict, lang), tone: 'verdict', text: pick({ EN: en, FR: fr }, lang) });
    } else {
      const en = `Full time: ${leader} take it ${sc}. ${v.topDriver ? `The thread running through it — ${lowerFirst(v.topDriver)} ` : ''}That's the read I'll keep.`;
      const fr = `Fin du match : ${leader} l'emporte ${sc}. ${v.topDriver ? `Le fil rouge — ${lowerFirst(v.topDriver)} ` : ''}C'est la lecture que je retiens.`;
      beats.push({ tag: pick(TAG.verdict, lang), tone: 'verdict', text: pick({ EN: en, FR: fr }, lang) });
    }
  }

  // ── Beat 5 · The story (a diamond worth remembering) ──────────────────────
  // Light, honest tournament-context note. Only when we have a real standout.
  if (v.heroName && (v.status === 'FINAL' || v.status === 'LIVE')) {
    const en = `And remember this name: ${v.heroName}. Nights like this are how a tournament makes a player — the kind of story Worldcupilou exists to tell.`;
    const fr = `Et retenez ce nom : ${v.heroName}. C'est dans ces soirs-là qu'un tournoi révèle un joueur — exactement le genre d'histoire pour laquelle Worldcupilou existe.`;
    beats.push({ tag: pick(TAG.story, lang), tone: 'story', text: pick({ EN: en, FR: fr }, lang) });
  }

  return beats;
}

function lowerFirst(s: string) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
