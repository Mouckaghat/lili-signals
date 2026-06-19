// Match Heatmap hub — localisation for Lili's *commentary* (the dynamically
// composed sentences: verdicts, match drivers, narrative). Static screen labels
// stay in the screen; this file is only the model-generated prose so it can be
// read in every language.
//
// Templates use {placeholder} syntax — interpolate with hmT() before display.
// Non-Latin scripts (RU/CN/JP/KR/AR) are good-faith translations of standard
// football terms; native-speaker review is owed before any marketing push.

import type { LangCode } from './i18n';

export interface HeatmapI18n {
  // ── Overview tab — stat labels ──
  statPossession: string;
  statShots: string;
  statSoT: string;
  statCorners: string;
  statPasses: string;
  statPassAcc: string;
  statXg: string;
  // ── Overview tab — verdict ──
  verdictDominated: string;   // {winner}
  verdictInControl: string;   // {winner}
  verdictEven: string;
  // ── Overview tab — drivers ──
  drvShots: string;     // {winner} {ratio} {hi} {lo}
  drvPossession: string;// {team} {pct}
  drvSoT: string;       // {winner} {hi} {lo}
  drvFewBox: string;    // {loser} {n}
  drvXg: string;        // {winner} {hi} {lo}
  // ── Overview tab — Lili narrative ──
  liliDominated: string; // {winner} {loser} {tail}
  liliEdged: string;     // {winner} {loser} {control}
  liliEven: string;
  deservedScore: string; // {sc}
  deservedResult: string;
  // ── Heatmap tab — Lili Insight (live) ──
  insHeadDom: string;     // {dom}
  insHeadEdge: string;    // {dom}
  insHeadEven: string;
  insExplain: string;     // {pct} {hi} {lo}
  insConseqEdge: string;  // {sub}
  insConseqEven: string;
  // ── Heatmap tab — pre-match forecast ──
  fcHeadTight: string;
  fcHeadFav: string;      // {fav}
  fcOdds: string;         // {home} {hw} {dw} {away} {aw}
  fcConseq: string;       // {dom} {pct}
  fcBannerTitle: string;
  fcBasisForm: string;
  fcBasisMixed: string;
  fcBasisStrength: string;
  fcBannerTail: string;
  fcNote: string;
}

export const HEATMAP_I18N: Record<LangCode, HeatmapI18n> = {
  EN: {
    statPossession: 'Possession', statShots: 'Shots', statSoT: 'Shots on Target', statCorners: 'Corners', statPasses: 'Passes', statPassAcc: 'Pass Accuracy', statXg: 'Expected Goals',
    verdictDominated: '{winner} Dominated', verdictInControl: '{winner} in Control', verdictEven: 'Evenly Matched Contest',
    drvShots: '{winner} generated {ratio}× more shots ({hi} to {lo}).',
    drvPossession: '{team} controlled possession ({pct}%).',
    drvSoT: '{winner} hit {hi} shots on target to {lo}.',
    drvFewBox: '{loser} managed only {n} shots inside the box.',
    drvXg: '{winner} created the better chances ({hi} xG to {lo}).',
    liliDominated: "{winner} controlled both territory and possession throughout. The game was largely played in {loser}'s half, and {winner} converted efficiently while rarely letting {loser} build pressure. {tail}",
    liliEdged: "{winner} edged a competitive match, carrying the greater threat ({control}/100 control). {loser} had moments but couldn't match {winner}'s output in the key areas.",
    liliEven: 'A tight, balanced contest with little between the sides. Neither team established lasting control, and the margins were fine across territory and chances.',
    deservedScore: 'A deserved {sc}.', deservedResult: 'A deserved result.',
    insHeadDom: '{dom} dominated', insHeadEdge: '{dom} edged it', insHeadEven: 'Even territorial battle',
    insExplain: '{pct}% of the ball and {hi} shots to {lo}.',
    insConseqEdge: '{sub} rarely progressed beyond the middle third.', insConseqEven: 'Both sides traded control across the pitch.',
    fcHeadTight: 'Too close to call', fcHeadFav: '{fav} favoured',
    fcOdds: "Lili's odds: {home} {hw}% · draw {dw}% · {away} {aw}%.",
    fcConseq: 'Expecting {dom} to see more of the ball ({pct}% projected) and press higher up the pitch.',
    fcBannerTitle: "🔮 LILI'S FORECAST · PREDICTED PRESSURE",
    fcBasisForm: "Modelled from both teams' tournament form so far",
    fcBasisMixed: "Modelled from current form and Lili's strength ratings",
    fcBasisStrength: "Modelled from Lili's strength ratings (no matches played yet)",
    fcBannerTail: 'The live heatmap takes over the moment the match kicks off.',
    fcNote: "Momentum, score & live stats begin at kickoff. Values shown are Lili's pre-match expectation — a model, not measured data.",
  },
  FR: {
    statPossession: 'Possession', statShots: 'Tirs', statSoT: 'Tirs cadrés', statCorners: 'Corners', statPasses: 'Passes', statPassAcc: 'Précision passes', statXg: 'Buts attendus',
    verdictDominated: '{winner} a dominé', verdictInControl: '{winner} maîtrise', verdictEven: 'Match équilibré',
    drvShots: '{winner} a généré {ratio}× plus de tirs ({hi} à {lo}).',
    drvPossession: '{team} a contrôlé la possession ({pct} %).',
    drvSoT: '{winner} a cadré {hi} tirs contre {lo}.',
    drvFewBox: '{loser} n’a tenté que {n} tirs dans la surface.',
    drvXg: '{winner} s’est créé les meilleures occasions ({hi} xG contre {lo}).',
    liliDominated: "{winner} a contrôlé le territoire et la possession de bout en bout. Le jeu s’est largement déroulé dans le camp de {loser}, et {winner} a converti efficacement sans laisser {loser} mettre la pression. {tail}",
    liliEdged: "{winner} a remporté un match disputé, en portant le plus de danger ({control}/100 de contrôle). {loser} a eu ses moments mais n’a pas égalé {winner} dans les zones clés.",
    liliEven: 'Un match serré et équilibré, avec peu d’écart entre les deux équipes. Aucune n’a pris un contrôle durable, et les marges étaient minces au territoire comme aux occasions.',
    deservedScore: 'Un {sc} mérité.', deservedResult: 'Un résultat mérité.',
    insHeadDom: '{dom} a dominé', insHeadEdge: '{dom} l’a emporté de justesse', insHeadEven: 'Bataille territoriale équilibrée',
    insExplain: '{pct} % du ballon et {hi} tirs contre {lo}.',
    insConseqEdge: '{sub} a rarement dépassé le milieu de terrain.', insConseqEven: 'Les deux équipes se sont disputé le contrôle.',
    fcHeadTight: 'Trop serré pour trancher', fcHeadFav: '{fav} favori',
    fcOdds: 'Cote de Lili : {home} {hw} % · nul {dw} % · {away} {aw} %.',
    fcConseq: 'On s’attend à ce que {dom} ait davantage le ballon ({pct} % projeté) et presse plus haut.',
    fcBannerTitle: '🔮 PRONOSTIC DE LILI · PRESSION ATTENDUE',
    fcBasisForm: 'Modélisé d’après la forme des deux équipes dans le tournoi',
    fcBasisMixed: 'Modélisé d’après la forme actuelle et les notes de force de Lili',
    fcBasisStrength: 'Modélisé d’après les notes de force de Lili (aucun match joué)',
    fcBannerTail: 'La carte en direct prend le relais dès le coup d’envoi.',
    fcNote: 'Le momentum, le score et les stats en direct démarrent au coup d’envoi. Les valeurs affichées sont l’estimation d’avant-match de Lili — un modèle, pas des données mesurées.',
  },
  IT: {
    statPossession: 'Possesso', statShots: 'Tiri', statSoT: 'Tiri in porta', statCorners: 'Calci d’angolo', statPasses: 'Passaggi', statPassAcc: 'Precisione passaggi', statXg: 'Gol attesi',
    verdictDominated: '{winner} ha dominato', verdictInControl: '{winner} in controllo', verdictEven: 'Partita equilibrata',
    drvShots: '{winner} ha prodotto {ratio}× tiri in più ({hi} a {lo}).',
    drvPossession: '{team} ha controllato il possesso ({pct}%).',
    drvSoT: '{winner} ha colpito {hi} tiri in porta contro {lo}.',
    drvFewBox: '{loser} ha tentato solo {n} tiri in area.',
    drvXg: '{winner} ha creato le occasioni migliori ({hi} xG contro {lo}).',
    liliDominated: "{winner} ha controllato territorio e possesso per tutta la gara. Si è giocato in gran parte nella metà campo di {loser}, e {winner} ha concretizzato con efficienza senza lasciar costruire pressione a {loser}. {tail}",
    liliEdged: "{winner} ha avuto la meglio in una gara combattuta, portando più pericolo ({control}/100 di controllo). {loser} ha avuto i suoi momenti ma non ha eguagliato {winner} nelle zone chiave.",
    liliEven: 'Una gara equilibrata e tirata, con poco tra le due squadre. Nessuna ha preso un controllo duraturo, e i margini erano minimi su territorio e occasioni.',
    deservedScore: 'Un {sc} meritato.', deservedResult: 'Un risultato meritato.',
    insHeadDom: '{dom} ha dominato', insHeadEdge: '{dom} l’ha spuntata', insHeadEven: 'Battaglia territoriale equilibrata',
    insExplain: '{pct}% del possesso e {hi} tiri contro {lo}.',
    insConseqEdge: '{sub} ha raramente superato la metà campo.', insConseqEven: 'Le due squadre si sono contese il controllo.',
    fcHeadTight: 'Troppo equilibrata per dirlo', fcHeadFav: '{fav} favorita',
    fcOdds: 'Quota di Lili: {home} {hw}% · pari {dw}% · {away} {aw}%.',
    fcConseq: 'Si prevede che {dom} avrà più palla ({pct}% previsto) e pressi più alta.',
    fcBannerTitle: '🔮 PRONOSTICO DI LILI · PRESSIONE ATTESA',
    fcBasisForm: 'Modellato sulla forma di entrambe le squadre nel torneo',
    fcBasisMixed: 'Modellato su forma attuale e valutazioni di forza di Lili',
    fcBasisStrength: 'Modellato sulle valutazioni di forza di Lili (nessuna partita giocata)',
    fcBannerTail: 'La mappa live prende il posto al fischio d’inizio.',
    fcNote: 'Momentum, punteggio e statistiche live partono al calcio d’inizio. I valori mostrati sono la previsione pre-partita di Lili — un modello, non dati misurati.',
  },
  DE: {
    statPossession: 'Ballbesitz', statShots: 'Schüsse', statSoT: 'Schüsse aufs Tor', statCorners: 'Ecken', statPasses: 'Pässe', statPassAcc: 'Passquote', statXg: 'Erwartete Tore',
    verdictDominated: '{winner} dominierte', verdictInControl: '{winner} hat Kontrolle', verdictEven: 'Ausgeglichenes Spiel',
    drvShots: '{winner} erzeugte {ratio}× mehr Schüsse ({hi} zu {lo}).',
    drvPossession: '{team} kontrollierte den Ballbesitz ({pct} %).',
    drvSoT: '{winner} brachte {hi} Schüsse aufs Tor, {lo} dagegen.',
    drvFewBox: '{loser} kam auf nur {n} Schüsse im Strafraum.',
    drvXg: '{winner} hatte die besseren Chancen ({hi} xG zu {lo}).',
    liliDominated: '{winner} kontrollierte durchweg Raum und Ballbesitz. Das Spiel fand größtenteils in der Hälfte von {loser} statt, und {winner} nutzte die Chancen effizient, ohne {loser} Druck aufbauen zu lassen. {tail}',
    liliEdged: '{winner} entschied ein umkämpftes Spiel knapp für sich und war die größere Gefahr ({control}/100 Kontrolle). {loser} hatte Momente, kam an {winner} in den entscheidenden Zonen aber nicht heran.',
    liliEven: 'Ein enges, ausgeglichenes Spiel mit wenig Unterschied zwischen den Teams. Keine Mannschaft erlangte dauerhafte Kontrolle, und die Abstände bei Raum und Chancen waren gering.',
    deservedScore: 'Ein verdientes {sc}.', deservedResult: 'Ein verdientes Ergebnis.',
    insHeadDom: '{dom} dominierte', insHeadEdge: '{dom} setzte sich knapp durch', insHeadEven: 'Ausgeglichener Territorienkampf',
    insExplain: '{pct} % Ballbesitz und {hi} Schüsse gegen {lo}.',
    insConseqEdge: '{sub} kam selten über die Mittellinie hinaus.', insConseqEven: 'Beide Teams teilten sich die Kontrolle.',
    fcHeadTight: 'Zu knapp für eine Prognose', fcHeadFav: '{fav} favorisiert',
    fcOdds: 'Lilis Quote: {home} {hw} % · Remis {dw} % · {away} {aw} %.',
    fcConseq: 'Erwartet wird, dass {dom} mehr Ball hat ({pct} % erwartet) und höher presst.',
    fcBannerTitle: '🔮 LILIS PROGNOSE · ERWARTETER DRUCK',
    fcBasisForm: 'Modelliert aus der bisherigen Turnierform beider Teams',
    fcBasisMixed: 'Modelliert aus aktueller Form und Lilis Stärkewerten',
    fcBasisStrength: 'Modelliert aus Lilis Stärkewerten (noch kein Spiel gespielt)',
    fcBannerTail: 'Die Live-Heatmap übernimmt mit dem Anpfiff.',
    fcNote: 'Momentum, Ergebnis und Live-Statistiken starten mit dem Anpfiff. Die gezeigten Werte sind Lilis Vorhersage vor dem Spiel — ein Modell, keine gemessenen Daten.',
  },
  ES: {
    statPossession: 'Posesión', statShots: 'Tiros', statSoT: 'Tiros a puerta', statCorners: 'Córners', statPasses: 'Pases', statPassAcc: 'Precisión de pase', statXg: 'Goles esperados',
    verdictDominated: '{winner} dominó', verdictInControl: '{winner} con el control', verdictEven: 'Partido igualado',
    drvShots: '{winner} generó {ratio}× más tiros ({hi} a {lo}).',
    drvPossession: '{team} controló la posesión ({pct} %).',
    drvSoT: '{winner} hizo {hi} tiros a puerta por {lo}.',
    drvFewBox: '{loser} solo intentó {n} tiros dentro del área.',
    drvXg: '{winner} creó las mejores ocasiones ({hi} xG por {lo}).',
    liliDominated: '{winner} controló el territorio y la posesión de principio a fin. El juego se disputó en gran parte en el campo de {loser}, y {winner} fue eficaz sin dejar que {loser} generara presión. {tail}',
    liliEdged: '{winner} se impuso en un partido competido, llevando el mayor peligro ({control}/100 de control). {loser} tuvo sus momentos pero no igualó a {winner} en las zonas clave.',
    liliEven: 'Un partido cerrado e igualado, con poco entre los dos equipos. Ninguno logró un control duradero, y los márgenes fueron mínimos en territorio y ocasiones.',
    deservedScore: 'Un {sc} merecido.', deservedResult: 'Un resultado merecido.',
    insHeadDom: '{dom} dominó', insHeadEdge: '{dom} se impuso por poco', insHeadEven: 'Batalla territorial igualada',
    insExplain: '{pct} % del balón y {hi} tiros por {lo}.',
    insConseqEdge: '{sub} rara vez pasó del medio campo.', insConseqEven: 'Ambos equipos se disputaron el control.',
    fcHeadTight: 'Demasiado parejo', fcHeadFav: '{fav} favorito',
    fcOdds: 'Cuota de Lili: {home} {hw} % · empate {dw} % · {away} {aw} %.',
    fcConseq: 'Se espera que {dom} tenga más el balón ({pct} % proyectado) y presione más arriba.',
    fcBannerTitle: '🔮 PRONÓSTICO DE LILI · PRESIÓN ESPERADA',
    fcBasisForm: 'Modelado a partir de la forma de ambos equipos en el torneo',
    fcBasisMixed: 'Modelado a partir de la forma actual y las valoraciones de Lili',
    fcBasisStrength: 'Modelado a partir de las valoraciones de Lili (sin partidos jugados)',
    fcBannerTail: 'El mapa en vivo toma el relevo en cuanto arranca el partido.',
    fcNote: 'El momentum, el marcador y las estadísticas en vivo empiezan con el saque inicial. Los valores mostrados son la previsión de Lili antes del partido — un modelo, no datos medidos.',
  },
  RU: {
    statPossession: 'Владение', statShots: 'Удары', statSoT: 'Удары в створ', statCorners: 'Угловые', statPasses: 'Передачи', statPassAcc: 'Точность передач', statXg: 'Ожидаемые голы',
    verdictDominated: '{winner} доминировал', verdictInControl: '{winner} контролирует', verdictEven: 'Равная игра',
    drvShots: '{winner} нанёс в {ratio}× больше ударов ({hi} против {lo}).',
    drvPossession: '{team} контролировал мяч ({pct}%).',
    drvSoT: '{winner} нанёс {hi} ударов в створ против {lo}.',
    drvFewBox: '{loser} нанёс лишь {n} ударов из штрафной.',
    drvXg: '{winner} создал моменты опаснее ({hi} xG против {lo}).',
    liliDominated: '{winner} весь матч контролировал территорию и мяч. Игра в основном шла на половине поля {loser}, и {winner} эффективно реализовывал моменты, почти не позволяя {loser} давить. {tail}',
    liliEdged: '{winner} выиграл напряжённый матч, создав больше угрозы ({control}/100 контроля). У {loser} были моменты, но в ключевых зонах он не дотянул до {winner}.',
    liliEven: 'Плотный и равный матч, разница между командами минимальна. Ни одна не взяла длительный контроль, а отрывы по территории и моментам были незначительны.',
    deservedScore: 'Заслуженные {sc}.', deservedResult: 'Заслуженный результат.',
    insHeadDom: '{dom} доминировал', insHeadEdge: '{dom} вырвал победу', insHeadEven: 'Равная территориальная борьба',
    insExplain: '{pct}% владения и {hi} ударов против {lo}.',
    insConseqEdge: '{sub} редко выходил за пределы средней линии.', insConseqEven: 'Обе команды делили контроль.',
    fcHeadTight: 'Слишком близко, чтобы судить', fcHeadFav: '{fav} — фаворит',
    fcOdds: 'Прогноз Лили: {home} {hw}% · ничья {dw}% · {away} {aw}%.',
    fcConseq: 'Ожидается, что {dom} будет больше владеть мячом ({pct}% по прогнозу) и прессинговать выше.',
    fcBannerTitle: '🔮 ПРОГНОЗ ЛИЛИ · ОЖИДАЕМОЕ ДАВЛЕНИЕ',
    fcBasisForm: 'Смоделировано по форме обеих команд на турнире',
    fcBasisMixed: 'Смоделировано по текущей форме и рейтингам силы Лили',
    fcBasisStrength: 'Смоделировано по рейтингам силы Лили (матчей ещё не было)',
    fcBannerTail: 'Живая карта включается сразу после стартового свистка.',
    fcNote: 'Моментум, счёт и статистика в реальном времени стартуют с началом матча. Показанные значения — предматчевый прогноз Лили, модель, а не измеренные данные.',
  },
  CN: {
    statPossession: '控球', statShots: '射门', statSoT: '射正', statCorners: '角球', statPasses: '传球', statPassAcc: '传球成功率', statXg: '预期进球',
    verdictDominated: '{winner} 占据主导', verdictInControl: '{winner} 掌控局面', verdictEven: '势均力敌',
    drvShots: '{winner} 的射门数多出 {ratio}×（{hi} 比 {lo}）。',
    drvPossession: '{team} 掌控了控球（{pct}%）。',
    drvSoT: '{winner} 射正 {hi} 次，对手 {lo} 次。',
    drvFewBox: '{loser} 在禁区内仅有 {n} 次射门。',
    drvXg: '{winner} 创造了更好的机会（{hi} xG 比 {lo}）。',
    liliDominated: '{winner} 全场掌控了区域和控球。比赛大部分时间在 {loser} 半场进行，{winner} 把握机会高效，几乎不让 {loser} 形成压力。{tail}',
    liliEdged: '{winner} 在一场势均力敌的比赛中略胜一筹，威胁更大（控制力 {control}/100）。{loser} 有过机会，但在关键区域未能与 {winner} 抗衡。',
    liliEven: '一场胶着而均衡的比赛，两队差距很小。谁都没有取得持续掌控，在区域和机会上的差距都很微小。',
    deservedScore: '{sc} 实至名归。', deservedResult: '一个应得的结果。',
    insHeadDom: '{dom} 占据主导', insHeadEdge: '{dom} 险胜', insHeadEven: '区域争夺势均力敌',
    insExplain: '{pct}% 的控球，{hi} 次射门对 {lo} 次。',
    insConseqEdge: '{sub} 很少推进过中场。', insConseqEven: '两队反复争夺控制权。',
    fcHeadTight: '难分高下', fcHeadFav: '{fav} 占优',
    fcOdds: '莉莉的预测：{home} {hw}% · 平局 {dw}% · {away} {aw}%。',
    fcConseq: '预计 {dom} 将控球更多（预测 {pct}%）并实施更高位逼抢。',
    fcBannerTitle: '🔮 莉莉的预测 · 预期压制',
    fcBasisForm: '根据两队本届赛事的状态建模',
    fcBasisMixed: '根据当前状态和莉莉的实力评分建模',
    fcBasisStrength: '根据莉莉的实力评分建模（尚未进行比赛）',
    fcBannerTail: '开球后即切换为实时热力图。',
    fcNote: '势头、比分和实时数据将在开球后开始。所示数值为莉莉的赛前预测——一个模型，而非实测数据。',
  },
  JP: {
    statPossession: 'ポゼッション', statShots: 'シュート', statSoT: '枠内シュート', statCorners: 'コーナー', statPasses: 'パス', statPassAcc: 'パス成功率', statXg: '期待値ゴール',
    verdictDominated: '{winner} が圧倒', verdictInControl: '{winner} が主導', verdictEven: '互角の戦い',
    drvShots: '{winner} はシュート数で {ratio}× 上回った（{hi} 対 {lo}）。',
    drvPossession: '{team} がポゼッションを支配（{pct}%）。',
    drvSoT: '{winner} は枠内シュート {hi} 本、相手は {lo} 本。',
    drvFewBox: '{loser} はペナルティエリア内で {n} 本のみ。',
    drvXg: '{winner} がより良いチャンスを創出（{hi} xG 対 {lo}）。',
    liliDominated: '{winner} は終始エリアとポゼッションを支配した。試合の大半は {loser} 陣内で進み、{winner} は効率よく決め、{loser} にほとんど圧力をかけさせなかった。{tail}',
    liliEdged: '{winner} は接戦を制し、より多くの脅威を生み出した（コントロール {control}/100）。{loser} にも見せ場はあったが、重要な局面で {winner} に及ばなかった。',
    liliEven: '拮抗した互角の試合で、両者の差はわずかだった。どちらも持続的な主導権を握れず、エリアでもチャンスでも差は小さかった。',
    deservedScore: '順当な {sc}。', deservedResult: '順当な結果。',
    insHeadDom: '{dom} が圧倒', insHeadEdge: '{dom} が辛勝', insHeadEven: '互角のエリア争い',
    insExplain: 'ボール支配率 {pct}%、シュート {hi} 対 {lo}。',
    insConseqEdge: '{sub} は中盤を越える場面が少なかった。', insConseqEven: '両者が主導権を奪い合った。',
    fcHeadTight: '甲乙つけがたい', fcHeadFav: '{fav} 有利',
    fcOdds: 'リリの予想：{home} {hw}% · 引分 {dw}% · {away} {aw}%。',
    fcConseq: '{dom} がよりボールを保持し（予想 {pct}%）、高い位置から圧力をかけると見込まれる。',
    fcBannerTitle: '🔮 リリの予想 · 予想される圧力',
    fcBasisForm: '両チームのこれまでの大会での調子からモデル化',
    fcBasisMixed: '現在の調子とリリの戦力評価からモデル化',
    fcBasisStrength: 'リリの戦力評価からモデル化（試合未消化）',
    fcBannerTail: 'キックオフと同時にライブのヒートマップに切り替わります。',
    fcNote: '勢い・スコア・ライブ統計はキックオフから始まります。表示値はリリの試合前予想であり、実測データではなくモデルです。',
  },
  KR: {
    statPossession: '점유율', statShots: '슈팅', statSoT: '유효 슈팅', statCorners: '코너킥', statPasses: '패스', statPassAcc: '패스 성공률', statXg: '기대 득점',
    verdictDominated: '{winner} 압도', verdictInControl: '{winner} 주도', verdictEven: '대등한 경기',
    drvShots: '{winner}이(가) 슈팅을 {ratio}× 더 많이 기록({hi} 대 {lo}).',
    drvPossession: '{team}이(가) 점유율을 장악({pct}%).',
    drvSoT: '{winner} 유효 슈팅 {hi}회, 상대 {lo}회.',
    drvFewBox: '{loser}은(는) 박스 안에서 {n}회 슈팅에 그침.',
    drvXg: '{winner}이(가) 더 좋은 기회를 만듦({hi} xG 대 {lo}).',
    liliDominated: '{winner}이(가) 경기 내내 지역과 점유율을 장악했다. 경기는 대부분 {loser} 진영에서 진행됐고, {winner}은(는) 효율적으로 마무리하며 {loser}에게 압박을 거의 허용하지 않았다. {tail}',
    liliEdged: '{winner}이(가) 치열한 경기에서 더 큰 위협으로 앞섰다(컨트롤 {control}/100). {loser}도 기회는 있었지만 핵심 구역에서 {winner}을(를) 따라잡지 못했다.',
    liliEven: '팽팽하고 균형 잡힌 경기로 두 팀 차이가 거의 없었다. 어느 쪽도 지속적인 주도권을 잡지 못했고, 지역과 기회 모두 격차가 작았다.',
    deservedScore: '{sc} 충분히 받을 만한 결과.', deservedResult: '받을 만한 결과.',
    insHeadDom: '{dom} 압도', insHeadEdge: '{dom} 신승', insHeadEven: '대등한 지역 다툼',
    insExplain: '점유율 {pct}%, 슈팅 {hi}대 {lo}.',
    insConseqEdge: '{sub}은(는) 중원을 넘는 경우가 드물었다.', insConseqEven: '두 팀이 주도권을 주고받았다.',
    fcHeadTight: '우열을 가리기 어려움', fcHeadFav: '{fav} 우세',
    fcOdds: '릴리의 예측: {home} {hw}% · 무 {dw}% · {away} {aw}%.',
    fcConseq: '{dom}이(가) 점유율을 더 가져가고(예상 {pct}%) 더 높이 압박할 것으로 예상.',
    fcBannerTitle: '🔮 릴리의 예측 · 예상 압박',
    fcBasisForm: '두 팀의 이번 대회 폼을 바탕으로 모델링',
    fcBasisMixed: '현재 폼과 릴리의 전력 평가를 바탕으로 모델링',
    fcBasisStrength: '릴리의 전력 평가를 바탕으로 모델링(경기 미진행)',
    fcBannerTail: '킥오프와 동시에 라이브 히트맵으로 전환됩니다.',
    fcNote: '모멘텀·스코어·라이브 통계는 킥오프부터 시작됩니다. 표시된 값은 릴리의 경기 전 예측으로, 실측이 아닌 모델입니다.',
  },
  PT: {
    statPossession: 'Posse de bola', statShots: 'Remates', statSoT: 'Remates à baliza', statCorners: 'Cantos', statPasses: 'Passes', statPassAcc: 'Precisão de passe', statXg: 'Golos esperados',
    verdictDominated: '{winner} dominou', verdictInControl: '{winner} no controlo', verdictEven: 'Jogo equilibrado',
    drvShots: '{winner} gerou {ratio}× mais remates ({hi} a {lo}).',
    drvPossession: '{team} controlou a posse ({pct}%).',
    drvSoT: '{winner} acertou {hi} remates à baliza contra {lo}.',
    drvFewBox: '{loser} tentou apenas {n} remates dentro da área.',
    drvXg: '{winner} criou as melhores oportunidades ({hi} xG contra {lo}).',
    liliDominated: '{winner} controlou o território e a posse do início ao fim. O jogo decorreu sobretudo no meio-campo de {loser}, e {winner} concretizou com eficácia sem deixar {loser} pressionar. {tail}',
    liliEdged: '{winner} levou a melhor num jogo disputado, carregando o maior perigo ({control}/100 de controlo). {loser} teve momentos mas não igualou {winner} nas zonas decisivas.',
    liliEven: 'Um jogo renhido e equilibrado, com pouco a separar as equipas. Nenhuma assumiu controlo duradouro, e as margens foram mínimas em território e oportunidades.',
    deservedScore: 'Um {sc} merecido.', deservedResult: 'Um resultado merecido.',
    insHeadDom: '{dom} dominou', insHeadEdge: '{dom} levou a melhor', insHeadEven: 'Disputa territorial equilibrada',
    insExplain: '{pct}% da bola e {hi} remates contra {lo}.',
    insConseqEdge: '{sub} raramente passou do meio-campo.', insConseqEven: 'As duas equipas disputaram o controlo.',
    fcHeadTight: 'Demasiado renhido', fcHeadFav: '{fav} favorito',
    fcOdds: 'Previsão da Lili: {home} {hw}% · empate {dw}% · {away} {aw}%.',
    fcConseq: 'Espera-se que {dom} tenha mais bola ({pct}% projetado) e pressione mais alto.',
    fcBannerTitle: '🔮 PREVISÃO DA LILI · PRESSÃO ESPERADA',
    fcBasisForm: 'Modelado pela forma das duas equipas no torneio',
    fcBasisMixed: 'Modelado pela forma atual e pelas notas de força da Lili',
    fcBasisStrength: 'Modelado pelas notas de força da Lili (sem jogos disputados)',
    fcBannerTail: 'O mapa ao vivo assume no momento do pontapé de saída.',
    fcNote: 'Momentum, resultado e estatísticas ao vivo começam no pontapé de saída. Os valores mostrados são a previsão pré-jogo da Lili — um modelo, não dados medidos.',
  },
  AR: {
    statPossession: 'الاستحواذ', statShots: 'التسديدات', statSoT: 'تسديدات على المرمى', statCorners: 'الركنيات', statPasses: 'التمريرات', statPassAcc: 'دقة التمرير', statXg: 'الأهداف المتوقعة',
    verdictDominated: '{winner} سيطر', verdictInControl: '{winner} يتحكّم', verdictEven: 'مباراة متكافئة',
    drvShots: 'سدّد {winner} {ratio}× أكثر ({hi} مقابل {lo}).',
    drvPossession: 'تحكّم {team} في الاستحواذ ({pct}%).',
    drvSoT: 'سدّد {winner} {hi} على المرمى مقابل {lo}.',
    drvFewBox: 'لم يسدّد {loser} سوى {n} داخل المنطقة.',
    drvXg: 'صنع {winner} الفرص الأفضل ({hi} xG مقابل {lo}).',
    liliDominated: 'سيطر {winner} على المساحة والاستحواذ طوال المباراة. جرى اللعب غالبًا في نصف ملعب {loser}، واستغلّ {winner} الفرص بكفاءة دون أن يسمح لـ {loser} بالضغط. {tail}',
    liliEdged: 'حسم {winner} مباراة متكافئة بأفضلية الخطورة الأكبر (تحكّم {control}/100). كانت لـ {loser} لحظات لكنه لم يضاهِ {winner} في المناطق الحاسمة.',
    liliEven: 'مباراة متقاربة ومتوازنة بفارق ضئيل بين الفريقين. لم يفرض أيٌّ منهما سيطرة دائمة، وكانت الفوارق طفيفة في المساحة والفرص.',
    deservedScore: '{sc} نتيجة مستحقّة.', deservedResult: 'نتيجة مستحقّة.',
    insHeadDom: 'سيطر {dom}', insHeadEdge: 'فاز {dom} بشقّ الأنفس', insHeadEven: 'صراع متكافئ على المساحة',
    insExplain: '{pct}% استحواذ و{hi} تسديدة مقابل {lo}.',
    insConseqEdge: 'نادرًا ما تجاوز {sub} منتصف الملعب.', insConseqEven: 'تبادل الفريقان السيطرة.',
    fcHeadTight: 'متقارب يصعب حسمه', fcHeadFav: '{fav} المرشّح',
    fcOdds: 'توقّع ليلي: {home} {hw}% · تعادل {dw}% · {away} {aw}%.',
    fcConseq: 'يُتوقّع أن يستحوذ {dom} أكثر ({pct}% متوقّع) ويضغط أعلى.',
    fcBannerTitle: '🔮 توقّع ليلي · الضغط المتوقّع',
    fcBasisForm: 'مبني على مستوى الفريقين في البطولة حتى الآن',
    fcBasisMixed: 'مبني على المستوى الحالي وتقييمات قوة ليلي',
    fcBasisStrength: 'مبني على تقييمات قوة ليلي (لم تُلعب مباريات بعد)',
    fcBannerTail: 'تتولّى الخريطة المباشرة فور انطلاق المباراة.',
    fcNote: 'يبدأ الزخم والنتيجة والإحصاءات المباشرة عند انطلاق المباراة. القيم المعروضة هي توقّع ليلي قبل المباراة — نموذج وليست بيانات مقيسة.',
  },
};

/** Interpolate a {placeholder} template. */
export function hmT(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
