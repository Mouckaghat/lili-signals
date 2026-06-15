// "Lili vs The Market" — localisation strings (app/lili-vs-market.tsx).
// Templates use {n} syntax; replace via mktT before display.

import type { LangCode } from './i18n';

export interface MarketI18n {
  title: string;
  intro: string;
  lili: string;
  market: string;
  model: string;
  drawShort: string;   // mid-column label
  books: string;       // "{n} bookmakers"
  agree: string;       // verdict: Lili & market favour the same outcome
  differ: string;      // verdict: they disagree on the favourite
  noModel: string;     // shown when api-football has no model line
  empty: string;       // no priced fixtures at all
  tip: string;         // label before api-football's advice
  track: string;       // track-record card title
  finished: string;    // "{n} finished"
  sharp: string;       // "Lili's sharpest call" label
  marketBacked: string;// "market backed {team}"
}

export const MARKET_I18N: Record<LangCode, MarketI18n> = {
  EN: { title: 'Lili vs The Market', intro: "How Lili's model compares with the bookmakers and the data model, for upcoming matches.", lili: 'Lili', market: 'Market', model: 'Model', drawShort: 'Draw', books: '{n} bookmakers', agree: 'Lili agrees with the market', differ: 'Lili sees it differently', noModel: 'No data-model line for this match yet', empty: 'No upcoming odds published yet.', tip: 'Tip', track: "Who's called it?", finished: '{n} finished', sharp: "Lili's sharpest call", marketBacked: 'market backed {team}' },
  FR: { title: 'Lili face au marché', intro: "Comment le modèle de Lili se compare aux bookmakers et au modèle de données, pour les matchs à venir.", lili: 'Lili', market: 'Marché', model: 'Modèle', drawShort: 'Nul', books: '{n} bookmakers', agree: "Lili est d'accord avec le marché", differ: 'Lili voit les choses autrement', noModel: 'Pas encore de ligne modèle pour ce match', empty: 'Aucune cote à venir publiée.', tip: 'Conseil', track: 'Qui a vu juste ?', finished: '{n} terminés', sharp: 'Le meilleur pronostic de Lili', marketBacked: 'le marché misait sur {team}' },
  IT: { title: 'Lili contro il mercato', intro: 'Come il modello di Lili si confronta con i bookmaker e il modello dati, per le partite in arrivo.', lili: 'Lili', market: 'Mercato', model: 'Modello', drawShort: 'Pari', books: '{n} bookmaker', agree: "Lili è d'accordo col mercato", differ: 'Lili la vede diversamente', noModel: 'Nessuna linea modello per questa partita', empty: 'Nessuna quota futura pubblicata.', tip: 'Consiglio', track: 'Chi ci ha preso?', finished: '{n} concluse', sharp: 'La giocata migliore di Lili', marketBacked: 'il mercato puntava su {team}' },
  DE: { title: 'Lili gegen den Markt', intro: 'Wie Lilis Modell im Vergleich zu den Buchmachern und dem Datenmodell abschneidet – für kommende Spiele.', lili: 'Lili', market: 'Markt', model: 'Modell', drawShort: 'Remis', books: '{n} Buchmacher', agree: 'Lili stimmt mit dem Markt überein', differ: 'Lili sieht es anders', noModel: 'Noch keine Modell-Linie für dieses Spiel', empty: 'Noch keine kommenden Quoten veröffentlicht.', tip: 'Tipp', track: 'Wer lag richtig?', finished: '{n} beendet', sharp: 'Lilis bester Tipp', marketBacked: 'der Markt setzte auf {team}' },
  ES: { title: 'Lili contra el mercado', intro: 'Cómo se compara el modelo de Lili con las casas de apuestas y el modelo de datos, para los próximos partidos.', lili: 'Lili', market: 'Mercado', model: 'Modelo', drawShort: 'Empate', books: '{n} casas', agree: 'Lili coincide con el mercado', differ: 'Lili lo ve diferente', noModel: 'Aún no hay línea de modelo para este partido', empty: 'No hay cuotas próximas publicadas.', tip: 'Consejo', track: '¿Quién acertó?', finished: '{n} jugados', sharp: 'El mejor acierto de Lili', marketBacked: 'el mercado apostaba por {team}' },
  RU: { title: 'Лили против рынка', intro: 'Как модель Лили соотносится с букмекерами и моделью данных — для предстоящих матчей.', lili: 'Лили', market: 'Рынок', model: 'Модель', drawShort: 'Ничья', books: '{n} БК', agree: 'Лили согласна с рынком', differ: 'Лили видит иначе', noModel: 'Пока нет линии модели для этого матча', empty: 'Предстоящие коэффициенты ещё не опубликованы.', tip: 'Совет', track: 'Кто угадал?', finished: '{n} сыграно', sharp: 'Лучший прогноз Лили', marketBacked: 'рынок ставил на {team}' },
  CN: { title: '莉莉 vs 市场', intro: '莉莉的模型与博彩公司和数据模型的对比 —— 针对即将到来的比赛。', lili: '莉莉', market: '市场', model: '模型', drawShort: '平局', books: '{n} 家博彩', agree: '莉莉与市场一致', differ: '莉莉看法不同', noModel: '该场比赛暂无数据模型', empty: '尚无即将开赛的赔率。', tip: '提示', track: '谁猜对了？', finished: '{n} 场已赛', sharp: '莉莉最准的一击', marketBacked: '市场看好 {team}' },
  JP: { title: 'リリ vs マーケット', intro: 'リリのモデルがブックメーカーやデータモデルとどう比べるか — 今後の試合について。', lili: 'リリ', market: 'マーケット', model: 'モデル', drawShort: '引分', books: '{n} ブックメーカー', agree: 'リリは市場と一致', differ: 'リリは見方が違う', noModel: 'この試合のモデル予測はまだありません', empty: '今後のオッズはまだ公開されていません。', tip: 'ヒント', track: '誰が当てた？', finished: '{n} 試合終了', sharp: 'リリの一番の的中', marketBacked: '市場は{team}支持' },
  KR: { title: '릴리 vs 마켓', intro: '릴리의 모델이 북메이커 및 데이터 모델과 어떻게 비교되는지 — 다가오는 경기 기준.', lili: '릴리', market: '마켓', model: '모델', drawShort: '무승부', books: '{n} 북메이커', agree: '릴리가 마켓과 일치', differ: '릴리는 다르게 봅니다', noModel: '이 경기의 모델 예측이 아직 없습니다', empty: '예정된 배당이 아직 없습니다.', tip: '팁', track: '누가 맞혔나?', finished: '{n} 경기 종료', sharp: '릴리의 최고 예측', marketBacked: '마켓은 {team} 지지' },
  PT: { title: 'Lili contra o mercado', intro: 'Como o modelo da Lili se compara às casas de apostas e ao modelo de dados, para os próximos jogos.', lili: 'Lili', market: 'Mercado', model: 'Modelo', drawShort: 'Empate', books: '{n} casas', agree: 'Lili concorda com o mercado', differ: 'Lili vê de forma diferente', noModel: 'Ainda sem linha de modelo para este jogo', empty: 'Nenhuma odd futura publicada.', tip: 'Dica', track: 'Quem acertou?', finished: '{n} jogados', sharp: 'O melhor palpite da Lili', marketBacked: 'o mercado apostava em {team}' },
  AR: { title: 'ليلي ضد السوق', intro: 'كيف يقارَن نموذج ليلي بمكاتب الرهان ونموذج البيانات، للمباريات القادمة.', lili: 'ليلي', market: 'السوق', model: 'النموذج', drawShort: 'تعادل', books: '{n} مكتب رهان', agree: 'ليلي تتفق مع السوق', differ: 'ليلي ترى الأمر مختلفًا', noModel: 'لا يوجد خط نموذج لهذه المباراة بعد', empty: 'لم تُنشر أي احتمالات قادمة بعد.', tip: 'نصيحة', track: 'من أصاب؟', finished: '{n} مكتملة', sharp: 'أفضل توقّع لليلي', marketBacked: 'السوق دعم {team}' },
};

export function mktT(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
