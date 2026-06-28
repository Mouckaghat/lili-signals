// Localized strings for the "Road to the Final" knockout bracket screen.
// Per-domain i18n file (like marketI18n / heatmapI18n). Latin languages are
// proper; non-Latin (RU/CN/JP/KR/AR) are good-faith standard football terms —
// native-speaker review owed before a marketing push (see project policy).

import type { LangCode } from './i18n';
import type { KnockoutRound } from './knockoutData';

export interface KnockoutI18n {
  title: string;
  intro: string;
  pickPrompt: string;
  yourPick: string;
  liliPicks: string;     // {team}
  liliPredicts: string;
  venueTBC: string;
  ptsShort: string;      // {n}
  liliCall: string;      // {c} {t}
  toBeDecided: string;
  locked: string;
  live: string;
  ft: string;
  youGotIt: string;
  youMissed: string;
  liliGotIt: string;
  liliMissed: string;
  advances: string;      // {team}
  awaiting: string;
  record: string;        // {c} {t}
  rounds: Record<KnockoutRound, string>;
}

export const KNOCKOUT_I18N: Record<LangCode, KnockoutI18n> = {
  EN: { title: 'Road to the Final', intro: 'The bracket, one round at a time. Call who goes through — Lili calls it too.', pickPrompt: 'Who goes through?', yourPick: 'Your pick', liliPicks: 'Lili backs {team}', liliPredicts: 'Lili predicts', venueTBC: 'Venue TBC', ptsShort: '{n} pts', liliCall: 'Lili {c}/{t}', toBeDecided: 'To be decided', locked: 'Seeds once the previous round is decided', live: 'LIVE', ft: 'Full time', youGotIt: 'You nailed it', youMissed: 'You missed', liliGotIt: 'Lili nailed it', liliMissed: 'Lili missed', advances: '{team} advance', awaiting: 'Awaiting qualifiers', record: 'Lili {c}/{t} in the knockouts', rounds: { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', '3RD': 'Third place', F: 'Final' } },
  FR: { title: 'La route vers la finale', intro: 'Le tableau, round par round. Désigne qui passe — Lili aussi.', pickPrompt: 'Qui se qualifie ?', yourPick: 'Ton choix', liliPicks: 'Lili mise sur {team}', liliPredicts: 'Lili prédit', venueTBC: 'Stade à confirmer', ptsShort: '{n} pts', liliCall: 'Lili {c}/{t}', toBeDecided: 'À déterminer', locked: 'Se remplit une fois le tour précédent joué', live: 'EN DIRECT', ft: 'Terminé', youGotIt: 'Bien vu', youMissed: 'Raté', liliGotIt: 'Lili a vu juste', liliMissed: "Lili s'est trompée", advances: '{team} se qualifie', awaiting: 'En attente des qualifiés', record: 'Lili {c}/{t} en phase finale', rounds: { R32: 'Seizièmes de finale', R16: 'Huitièmes de finale', QF: 'Quarts de finale', SF: 'Demi-finales', '3RD': 'Petite finale', F: 'Finale' } },
  IT: { title: 'La strada per la finale', intro: 'Il tabellone, turno per turno. Indica chi passa — anche Lili lo fa.', pickPrompt: 'Chi passa il turno?', yourPick: 'La tua scelta', liliPicks: 'Lili punta su {team}', liliPredicts: 'Lili prevede', venueTBC: 'Stadio da confermare', ptsShort: '{n} pti', liliCall: 'Lili {c}/{t}', toBeDecided: 'Da definire', locked: 'Si popola al termine del turno precedente', live: 'LIVE', ft: 'Finale', youGotIt: 'Indovinato', youMissed: 'Sbagliato', liliGotIt: 'Lili ci ha preso', liliMissed: 'Lili ha sbagliato', advances: '{team} passa', awaiting: 'In attesa delle qualificate', record: 'Lili {c}/{t} nella fase finale', rounds: { R32: 'Sedicesimi', R16: 'Ottavi', QF: 'Quarti', SF: 'Semifinali', '3RD': 'Finale 3º posto', F: 'Finale' } },
  DE: { title: 'Der Weg ins Finale', intro: 'Der Spielbaum, Runde für Runde. Tippe, wer weiterkommt — Lili tippt mit.', pickPrompt: 'Wer kommt weiter?', yourPick: 'Dein Tipp', liliPicks: 'Lili setzt auf {team}', liliPredicts: 'Lili tippt', venueTBC: 'Stadion offen', ptsShort: '{n} Pkt', liliCall: 'Lili {c}/{t}', toBeDecided: 'Noch offen', locked: 'Wird nach der vorigen Runde gefüllt', live: 'LIVE', ft: 'Schluss', youGotIt: 'Richtig getippt', youMissed: 'Daneben', liliGotIt: 'Lili lag richtig', liliMissed: 'Lili lag daneben', advances: '{team} kommt weiter', awaiting: 'Warten auf die Qualifizierten', record: 'Lili {c}/{t} in der K.-o.-Phase', rounds: { R32: 'Sechzehntelfinale', R16: 'Achtelfinale', QF: 'Viertelfinale', SF: 'Halbfinale', '3RD': 'Spiel um Platz 3', F: 'Finale' } },
  ES: { title: 'Camino a la final', intro: 'El cuadro, ronda a ronda. Elige quién pasa — Lili también.', pickPrompt: '¿Quién pasa?', yourPick: 'Tu elección', liliPicks: 'Lili apuesta por {team}', liliPredicts: 'Lili predice', venueTBC: 'Sede por confirmar', ptsShort: '{n} pts', liliCall: 'Lili {c}/{t}', toBeDecided: 'Por definir', locked: 'Se completa al terminar la ronda anterior', live: 'EN VIVO', ft: 'Final', youGotIt: 'Acertaste', youMissed: 'Fallaste', liliGotIt: 'Lili acertó', liliMissed: 'Lili falló', advances: '{team} avanza', awaiting: 'A la espera de los clasificados', record: 'Lili {c}/{t} en las eliminatorias', rounds: { R32: 'Dieciseisavos', R16: 'Octavos', QF: 'Cuartos', SF: 'Semifinales', '3RD': 'Tercer puesto', F: 'Final' } },
  PT: { title: 'Caminho até a final', intro: 'O chaveamento, rodada a rodada. Escolha quem avança — a Lili também.', pickPrompt: 'Quem avança?', yourPick: 'Sua escolha', liliPicks: 'Lili aposta em {team}', liliPredicts: 'Lili prevê', venueTBC: 'Sede a confirmar', ptsShort: '{n} pts', liliCall: 'Lili {c}/{t}', toBeDecided: 'A definir', locked: 'Preenche quando a fase anterior terminar', live: 'AO VIVO', ft: 'Fim de jogo', youGotIt: 'Acertou', youMissed: 'Errou', liliGotIt: 'A Lili acertou', liliMissed: 'A Lili errou', advances: '{team} avança', awaiting: 'Aguardando os classificados', record: 'Lili {c}/{t} no mata-mata', rounds: { R32: 'Décimo-sextos', R16: 'Oitavas', QF: 'Quartas', SF: 'Semifinais', '3RD': 'Disputa do 3º lugar', F: 'Final' } },
  RU: { title: 'Путь к финалу', intro: 'Сетка, раунд за раундом. Выбери, кто пройдёт — Лили тоже выбирает.', pickPrompt: 'Кто пройдёт дальше?', yourPick: 'Твой выбор', liliPicks: 'Лили ставит на {team}', liliPredicts: 'Лили прогнозирует', venueTBC: 'Стадион уточняется', ptsShort: '{n} очк.', liliCall: 'Лили {c}/{t}', toBeDecided: 'Будет определено', locked: 'Заполнится после предыдущего раунда', live: 'В ЭФИРЕ', ft: 'Матч окончен', youGotIt: 'Ты угадал', youMissed: 'Мимо', liliGotIt: 'Лили угадала', liliMissed: 'Лили ошиблась', advances: '{team} проходит', awaiting: 'Ожидание участников', record: 'Лили {c}/{t} в плей-офф', rounds: { R32: '1/16 финала', R16: '1/8 финала', QF: '1/4 финала', SF: '1/2 финала', '3RD': 'За 3-е место', F: 'Финал' } },
  CN: { title: '通往决赛之路', intro: '一轮一轮看对阵。选出晋级者——莉莉也会选。', pickPrompt: '谁能晋级？', yourPick: '你的选择', liliPicks: '莉莉看好 {team}', liliPredicts: '莉莉预测', venueTBC: '球场待定', ptsShort: '{n} 分', liliCall: '莉莉 {c}/{t}', toBeDecided: '待定', locked: '上一轮结束后生成', live: '直播', ft: '全场结束', youGotIt: '你猜对了', youMissed: '你猜错了', liliGotIt: '莉莉猜对了', liliMissed: '莉莉猜错了', advances: '{team} 晋级', awaiting: '等待晋级球队', record: '莉莉淘汰赛 {c}/{t}', rounds: { R32: '32强', R16: '16强', QF: '八强', SF: '四强', '3RD': '季军赛', F: '决赛' } },
  JP: { title: '決勝への道', intro: 'トーナメントを1ラウンドずつ。勝ち上がりを予想——リリも予想します。', pickPrompt: 'どっちが勝ち上がる？', yourPick: 'あなたの予想', liliPicks: 'リリは {team} を推す', liliPredicts: 'リリの予想', venueTBC: '会場未定', ptsShort: '{n} 点', liliCall: 'リリ {c}/{t}', toBeDecided: '未定', locked: '前のラウンド終了後に表示', live: 'ライブ', ft: '試合終了', youGotIt: '的中', youMissed: '不的中', liliGotIt: 'リリ的中', liliMissed: 'リリ不的中', advances: '{team} が勝ち上がり', awaiting: '勝ち上がり待ち', record: 'リリ 決勝T {c}/{t}', rounds: { R32: 'ラウンド32', R16: 'ラウンド16', QF: '準々決勝', SF: '準決勝', '3RD': '3位決定戦', F: '決勝' } },
  KR: { title: '결승으로 가는 길', intro: '대진표를 라운드별로. 누가 올라갈지 골라보세요 — 릴리도 고릅니다.', pickPrompt: '누가 올라갈까요?', yourPick: '내 선택', liliPicks: '릴리는 {team} 선택', liliPredicts: '릴리 예측', venueTBC: '경기장 미정', ptsShort: '{n}점', liliCall: '릴리 {c}/{t}', toBeDecided: '미정', locked: '이전 라운드가 끝나면 채워집니다', live: '라이브', ft: '경기 종료', youGotIt: '정답', youMissed: '오답', liliGotIt: '릴리 정답', liliMissed: '릴리 오답', advances: '{team} 진출', awaiting: '진출 팀 대기 중', record: '릴리 토너먼트 {c}/{t}', rounds: { R32: '32강', R16: '16강', QF: '8강', SF: '4강', '3RD': '3·4위전', F: '결승' } },
  AR: { title: 'الطريق إلى النهائي', intro: 'جدول الأدوار، دورًا بدور. اختر من يتأهل — وليلي تختار أيضًا.', pickPrompt: 'من يتأهل؟', yourPick: 'اختيارك', liliPicks: 'ليلي تختار {team}', liliPredicts: 'توقع ليلي', venueTBC: 'الملعب لم يُحدد', ptsShort: '{n} نقطة', liliCall: 'ليلي {c}/{t}', toBeDecided: 'يُحدد لاحقًا', locked: 'يُملأ بعد انتهاء الدور السابق', live: 'مباشر', ft: 'انتهت المباراة', youGotIt: 'أصبت', youMissed: 'أخطأت', liliGotIt: 'ليلي أصابت', liliMissed: 'ليلي أخطأت', advances: 'تأهل {team}', awaiting: 'بانتظار المتأهلين', record: 'ليلي {c}/{t} في الأدوار الإقصائية', rounds: { R32: 'دور الـ32', R16: 'دور الـ16', QF: 'ربع النهائي', SF: 'نصف النهائي', '3RD': 'تحديد المركز الثالث', F: 'النهائي' } },
};

export function koT(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
