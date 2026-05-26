// World Signals — localisation strings for all algorithmically generated text.
// Placeholders use {name} syntax. Replace before display.

import type { LangCode } from './i18n';

export interface WorldSignalsI18n {
  // Pulse state labels
  states: {
    BURDEN: string; INTENSITY: string; PRESSURE: string;
    MOMENTUM: string; SURGE: string; CALM: string; UNDERDOG: string;
  };
  // Signal intercept type badges
  types: {
    'UPSET ALERT': string; HOST: string; MARQUEE: string; DERBY: string; WATCH: string;
  };
  // Relative time templates — {n} = number
  time: {
    inDays: string; inHours: string;
    daysAgo: string; hoursAgo: string; minsAgo: string;
  };
  // Narrative arc titles
  arcTitles: {
    underdogs: string; host: string; golden: string; redemption: string; darkHorse: string;
  };
  // Narrative arc description templates
  // underdogs: {count}
  // golden: {n}
  arcDescs: {
    underdogs: string; host: string; golden: string; redemption: string; darkHorse: string;
  };
  // Intercept text templates
  // upsetAlert: {weaker} {diff} {stronger} {pct}
  // host: {host}
  // marquee: {combined}
  // derby: {fed}
  // watch: {diff}
  intercepts: {
    upsetAlert: string; host: string; marquee: string; derby: string; watch: string;
  };
  // Region labels (shown under confed abbreviation)
  regionLabels: {
    UEFA: string; CONMEBOL: string; CAF: string; AFC: string; CONCACAF: string; OFC: string;
  };
}

export const WORLD_SIGNALS_I18N: Record<LangCode, WorldSignalsI18n> = {
  EN: {
    states: {
      BURDEN: 'BURDEN', INTENSITY: 'INTENSITY', PRESSURE: 'PRESSURE',
      MOMENTUM: 'MOMENTUM', SURGE: 'SURGE', CALM: 'CALM', UNDERDOG: 'UNDERDOG',
    },
    types: {
      'UPSET ALERT': 'UPSET ALERT', HOST: 'HOST', MARQUEE: 'MARQUEE', DERBY: 'DERBY', WATCH: 'WATCH',
    },
    time: {
      inDays: 'in {n}d', inHours: 'in {n}h',
      daysAgo: '{n}d ago', hoursAgo: '{n}h ago', minsAgo: '{n}m ago',
    },
    arcTitles: {
      underdogs: 'The Underdog Arc', host: 'Host Nation Destiny',
      golden: 'Golden Generation Pressure', redemption: 'Redemption Campaign', darkHorse: 'Dark Horse Surge',
    },
    arcDescs: {
      underdogs: '{count} low-ranked entries face statistically dominant opposition. Lili\'s upset probability model assigns these fixtures the highest surprise coefficient in the group stage.',
      host: 'Three co-hosts generate simultaneous atmospheric pressure. Home soil signals — crowd familiarity, reduced travel, and officiating familiarity — compound across all three nations.',
      golden: '{n} elite nations entering with peak-or-declining squad cycles. Legacy pressure compresses variance and amplifies expectation weight across all signal channels simultaneously.',
      redemption: 'Defending champions and maximum-expectation sides carrying fractured momentum into unfamiliar continental territory. Narrative pressure index at maximum threshold.',
      darkHorse: 'Mid-tier entries with structural group-stage advantages. Low expectation creates signal amplification when results overperform — disproportionate global attention follows.',
    },
    intercepts: {
      upsetAlert: '{weaker} faces a {diff}-point strength deficit against {stronger}. Lili assigns {pct}% upset probability — elevated signal for an outlier outcome.',
      host: '{host} on home soil activates a compound signal. Crowd familiarity, reduced travel fatigue, and atmospheric intensity all weight simultaneously in Lili\'s model.',
      marquee: 'Combined strength index of {combined}. Two elite sides in direct collision — maximum narrative weight and global attention signal concentrated in one fixture.',
      derby: '{fed} internal contest — tactical familiarity compresses variance. Lili tracks elevated psychological volatility in same-confederation group fixtures.',
      watch: 'Strength differential of {diff} points. Group-stage dynamics give both sides a credible path. Lili identifies signal balance across this fixture.',
    },
    regionLabels: {
      UEFA: 'Europe', CONMEBOL: 'S. America', CAF: 'Africa',
      AFC: 'Asia', CONCACAF: 'N. America', OFC: 'Oceania',
    },
  },

  FR: {
    states: {
      BURDEN: 'FARDEAU', INTENSITY: 'INTENSITÉ', PRESSURE: 'PRESSION',
      MOMENTUM: 'ÉLAN', SURGE: 'POUSSÉE', CALM: 'CALME', UNDERDOG: 'OUTSIDER',
    },
    types: {
      'UPSET ALERT': 'ALERTE SURPRISE', HOST: 'ACCUEILLE', MARQUEE: 'VEDETTE', DERBY: 'DERBY', WATCH: 'SURVEILLER',
    },
    time: {
      inDays: 'dans {n}j', inHours: 'dans {n}h',
      daysAgo: 'il y a {n}j', hoursAgo: 'il y a {n}h', minsAgo: 'il y a {n}min',
    },
    arcTitles: {
      underdogs: "L'Arc des Outsiders", host: 'Destin des Nations Hôtes',
      golden: 'Pression de la Génération Dorée', redemption: 'Campagne de Rédemption', darkHorse: "Poussée de l'Outsider",
    },
    arcDescs: {
      underdogs: "{count} équipes faiblement classées affrontent une opposition statistiquement dominante. Le modèle de probabilité de surprise de Lili attribue à ces matchs le coefficient d'upset le plus élevé de la phase de groupes.",
      host: 'Trois co-organisateurs génèrent une pression atmosphérique simultanée. Les signaux du terrain à domicile — familiarité du public, déplacements réduits et familiarité arbitrale — se cumulent sur les trois nations.',
      golden: "{n} nations d'élite entrant avec des cycles de joueurs à leur apogée ou en déclin. La pression du palmarès compresse la variance et amplifie le poids des attentes sur tous les canaux de signal simultanément.",
      redemption: "Les champions en titre et les équipes à attentes maximales portent un élan fracturé en territoire continental inconnu. Indice de pression narrative au seuil maximum.",
      darkHorse: "Équipes de milieu de tableau avec des avantages structurels en phase de groupes. De faibles attentes créent une amplification du signal lorsque les résultats surpassent les prévisions — une attention mondiale disproportionnée s'ensuit.",
    },
    intercepts: {
      upsetAlert: '{weaker} fait face à un déficit de force de {diff} points contre {stronger}. Lili attribue {pct}% de probabilité de surprise — signal élevé pour un résultat inattendu.',
      host: '{host} sur son sol natal active un signal composé. La familiarité du public, la fatigue de voyage réduite et l\'intensité atmosphérique pèsent simultanément dans le modèle de Lili.',
      marquee: 'Indice de force combiné de {combined}. Deux équipes d\'élite en collision directe — poids narratif maximum et signal d\'attention mondiale concentrés en un seul match.',
      derby: 'Confrontation interne {fed} — la familiarité tactique compresse la variance. Lili suit la volatilité psychologique élevée dans les matchs de groupe de la même confédération.',
      watch: 'Différentiel de force de {diff} points. La dynamique de la phase de groupes offre aux deux équipes une voie crédible. Lili identifie un équilibre des signaux sur ce match.',
    },
    regionLabels: {
      UEFA: 'Europe', CONMEBOL: 'Amérique S.', CAF: 'Afrique',
      AFC: 'Asie', CONCACAF: 'Am. du Nord', OFC: 'Océanie',
    },
  },

  IT: {
    states: {
      BURDEN: 'ONERE', INTENSITY: 'INTENSITÀ', PRESSURE: 'PRESSIONE',
      MOMENTUM: 'SLANCIO', SURGE: 'IMPETO', CALM: 'CALMO', UNDERDOG: 'OUTSIDER',
    },
    types: {
      'UPSET ALERT': 'ALLERTA SORPRESA', HOST: 'OSPITA', MARQUEE: 'MARQUEE', DERBY: 'DERBY', WATCH: 'DA SEGUIRE',
    },
    time: {
      inDays: 'tra {n}g', inHours: 'tra {n}h',
      daysAgo: '{n}g fa', hoursAgo: '{n}h fa', minsAgo: '{n}min fa',
    },
    arcTitles: {
      underdogs: "L'Arco degli Outsider", host: 'Il Destino delle Nazioni Ospitanti',
      golden: "Pressione della Generazione d'Oro", redemption: 'Campagna di Redenzione', darkHorse: 'Slancio del Cavallo Nero',
    },
    arcDescs: {
      underdogs: '{count} squadre di bassa classifica affrontano un\'opposizione statisticamente dominante. Il modello di probabilità di sorpresa di Lili assegna a queste gare il coefficiente di sorpresa più alto della fase a gironi.',
      host: 'Tre co-organizzatori generano pressione atmosferica simultanea. I segnali del campo di casa — familiarità del pubblico, viaggi ridotti e familiarità arbitrale — si sommano nelle tre nazioni.',
      golden: '{n} nazioni d\'élite che entrano con cicli di squadra al picco o in declino. La pressione dell\'eredità comprime la varianza e amplifica il peso delle aspettative su tutti i canali di segnale simultaneamente.',
      redemption: 'I campioni in carica e le squadre con aspettative massime portano uno slancio fratturato in territorio continentale sconosciuto. Indice di pressione narrativa al livello massimo.',
      darkHorse: 'Squadre di medio livello con vantaggi strutturali nella fase a gironi. Le basse aspettative creano un\'amplificazione del segnale quando i risultati superano le previsioni — l\'attenzione globale sproporzionata ne consegue.',
    },
    intercepts: {
      upsetAlert: '{weaker} affronta un deficit di forza di {diff} punti contro {stronger}. Lili assegna il {pct}% di probabilità di sorpresa — segnale elevato per un risultato anomalo.',
      host: '{host} sul proprio terreno attiva un segnale composto. La familiarità del pubblico, la ridotta fatica da viaggio e l\'intensità atmosferica pesano contemporaneamente nel modello di Lili.',
      marquee: 'Indice di forza combinato di {combined}. Due squadre d\'élite in collisione diretta — massimo peso narrativo e segnale di attenzione globale concentrati in una sola gara.',
      derby: 'Scontro interno {fed} — la familiarità tattica comprime la varianza. Lili monitora l\'elevata volatilità psicologica nelle gare di girone della stessa confederazione.',
      watch: 'Differenziale di forza di {diff} punti. Le dinamiche della fase a gironi danno a entrambe le squadre un percorso credibile. Lili identifica un equilibrio dei segnali in questa gara.',
    },
    regionLabels: {
      UEFA: 'Europa', CONMEBOL: 'S. America', CAF: 'Africa',
      AFC: 'Asia', CONCACAF: 'N. America', OFC: 'Oceania',
    },
  },

  DE: {
    states: {
      BURDEN: 'BÜRDE', INTENSITY: 'INTENSITÄT', PRESSURE: 'DRUCK',
      MOMENTUM: 'SCHWUNG', SURGE: 'AUFSCHWUNG', CALM: 'RUHIG', UNDERDOG: 'AUSSENSEITER',
    },
    types: {
      'UPSET ALERT': 'ÜBERRASCHUNGSALARM', HOST: 'GASTGEBER', MARQUEE: 'MARQUEE', DERBY: 'DERBY', WATCH: 'BEOBACHTEN',
    },
    time: {
      inDays: 'in {n}T', inHours: 'in {n}h',
      daysAgo: 'vor {n}T', hoursAgo: 'vor {n}h', minsAgo: 'vor {n}m',
    },
    arcTitles: {
      underdogs: 'Der Außenseiter-Bogen', host: 'Gastgeber-Schicksal',
      golden: 'Goldene-Generation-Druck', redemption: 'Erlösungs-Kampagne', darkHorse: 'Außenseiter-Aufschwung',
    },
    arcDescs: {
      underdogs: '{count} schwach gesetzte Teams treffen auf statistisch überlegene Gegner. Lilis Überraschungs-Wahrscheinlichkeitsmodell weist diesen Begegnungen den höchsten Überraschungskoeffizienten der Gruppenphase zu.',
      host: 'Drei Co-Gastgeber erzeugen gleichzeitigen atmosphärischen Druck. Heimvorteil-Signale — Vertrautheit mit dem Publikum, reduzierte Reisen und Vertrautheit mit dem Schiedsrichter — verstärken sich in allen drei Nationen.',
      golden: '{n} Elitenationen treten mit Kaderzyklen auf dem Höhepunkt oder im Niedergang an. Erbschaftsdruck komprimiert die Varianz und amplified das Erwartungsgewicht auf allen Signalkanälen gleichzeitig.',
      redemption: 'Titelverteidiger und Mannschaften mit maximalen Erwartungen tragen gebrochenes Momentum in unbekanntes kontinentales Terrain. Narrativer Druckindex auf maximalem Niveau.',
      darkHorse: 'Mittelklasse-Teams mit strukturellen Vorteilen in der Gruppenphase. Geringe Erwartungen erzeugen Signalverstärkung, wenn Ergebnisse übertreffen — unverhältnismäßige globale Aufmerksamkeit folgt.',
    },
    intercepts: {
      upsetAlert: '{weaker} steht einem {diff}-Punkte-Stärkedefizit gegenüber {stronger} gegenüber. Lili weist {pct}% Überraschungswahrscheinlichkeit zu — erhöhtes Signal für ein Außenseiterergebnis.',
      host: '{host} auf heimischem Boden aktiviert ein zusammengesetztes Signal. Vertrautheit mit dem Publikum, reduzierte Reiseermüdung und atmosphärische Intensität wirken gleichzeitig in Lilis Modell.',
      marquee: 'Kombinierter Stärkeindex von {combined}. Zwei Elitenmannschaften in direkter Kollision — maximales Gewicht der Erzählung und globales Aufmerksamkeitssignal in einem Spiel konzentriert.',
      derby: '{fed}-interne Auseinandersetzung — taktische Vertrautheit komprimiert die Varianz. Lili verfolgt erhöhte psychologische Volatilität bei Gruppenspielen derselben Konföderation.',
      watch: 'Stärkedifferenz von {diff} Punkten. Die Dynamik der Gruppenphase bietet beiden Seiten einen glaubwürdigen Weg. Lili identifiziert Signalgleichgewicht in dieser Begegnung.',
    },
    regionLabels: {
      UEFA: 'Europa', CONMEBOL: 'S. Amerika', CAF: 'Afrika',
      AFC: 'Asien', CONCACAF: 'N. Amerika', OFC: 'Ozeanien',
    },
  },

  ES: {
    states: {
      BURDEN: 'CARGA', INTENSITY: 'INTENSIDAD', PRESSURE: 'PRESIÓN',
      MOMENTUM: 'IMPULSO', SURGE: 'ARRANQUE', CALM: 'CALMA', UNDERDOG: 'SORPRESA',
    },
    types: {
      'UPSET ALERT': 'ALERTA SORPRESA', HOST: 'ANFITRIÓN', MARQUEE: 'MARQUEE', DERBY: 'DERBY', WATCH: 'VIGILAR',
    },
    time: {
      inDays: 'en {n}d', inHours: 'en {n}h',
      daysAgo: 'hace {n}d', hoursAgo: 'hace {n}h', minsAgo: 'hace {n}min',
    },
    arcTitles: {
      underdogs: 'El Arco del Sorprendente', host: 'Destino del País Anfitrión',
      golden: 'Presión de la Generación Dorada', redemption: 'Campaña de Redención', darkHorse: 'Impulso del Caballo Negro',
    },
    arcDescs: {
      underdogs: '{count} equipos de bajo rango se enfrentan a oposición estadísticamente dominante. El modelo de probabilidad de sorpresa de Lili asigna a estos partidos el coeficiente de sorpresa más alto de la fase de grupos.',
      host: 'Tres co-anfitriones generan presión atmosférica simultánea. Las señales del terreno local — familiaridad del público, viajes reducidos y familiaridad arbitral — se acumulan en las tres naciones.',
      golden: '{n} naciones de élite que ingresan con ciclos de plantilla en su punto álgido o en declive. La presión del legado comprime la varianza y amplifica el peso de las expectativas en todos los canales de señal simultáneamente.',
      redemption: 'Los campeones defensores y los equipos de máxima expectativa llevan un impulso fracturado hacia territorio continental desconocido. Índice de presión narrativa en el umbral máximo.',
      darkHorse: 'Equipos de nivel medio con ventajas estructurales en la fase de grupos. La baja expectativa crea amplificación de señal cuando los resultados superan lo previsto — atención global desproporcionada sigue.',
    },
    intercepts: {
      upsetAlert: '{weaker} enfrenta un déficit de fuerza de {diff} puntos contra {stronger}. Lili asigna {pct}% de probabilidad de sorpresa — señal elevada para un resultado atípico.',
      host: '{host} en suelo propio activa una señal compuesta. La familiaridad con el público, la reducción de fatiga por viaje y la intensidad atmosférica pesan simultáneamente en el modelo de Lili.',
      marquee: 'Índice de fuerza combinado de {combined}. Dos equipos de élite en colisión directa — peso narrativo máximo y señal de atención global concentrada en un solo partido.',
      derby: 'Enfrentamiento interno {fed} — la familiaridad táctica comprime la varianza. Lili rastrea la volatilidad psicológica elevada en los partidos de grupo de la misma confederación.',
      watch: 'Diferencial de fuerza de {diff} puntos. La dinámica de la fase de grupos da a ambos equipos una ruta creíble. Lili identifica equilibrio de señales en este partido.',
    },
    regionLabels: {
      UEFA: 'Europa', CONMEBOL: 'S. América', CAF: 'África',
      AFC: 'Asia', CONCACAF: 'N. América', OFC: 'Oceanía',
    },
  },

  RU: {
    states: {
      BURDEN: 'БРЕМЯ', INTENSITY: 'ИНТЕНСИВНОСТЬ', PRESSURE: 'ДАВЛЕНИЕ',
      MOMENTUM: 'ИМПУЛЬС', SURGE: 'ВЗЛЁТ', CALM: 'СПОКОЙСТВИЕ', UNDERDOG: 'АУТСАЙДЕР',
    },
    types: {
      'UPSET ALERT': 'СИГНАЛ СЕНСАЦИИ', HOST: 'ХОЗЯИН', MARQUEE: 'ТОПОВЫЙ', DERBY: 'ДЕРБИ', WATCH: 'СЛЕЖЕНИЕ',
    },
    time: {
      inDays: 'через {n}д', inHours: 'через {n}ч',
      daysAgo: '{n}д назад', hoursAgo: '{n}ч назад', minsAgo: '{n}мин назад',
    },
    arcTitles: {
      underdogs: 'Дуга Аутсайдеров', host: 'Судьба Хозяев',
      golden: 'Давление Золотого Поколения', redemption: 'Кампания Искупления', darkHorse: 'Взлёт Тёмной Лошадки',
    },
    arcDescs: {
      underdogs: '{count} низкорейтинговых команд сталкиваются со статистически доминирующими соперниками. Модель вероятности сенсации Лили присваивает этим матчам наибольший коэффициент неожиданности в групповом этапе.',
      host: 'Три со-хозяина одновременно создают атмосферное давление. Сигналы домашнего поля — знакомость болельщиков, сокращение переездов и знакомость с судейством — усиливаются во всех трёх нациях.',
      golden: '{n} элитных наций вступают с пиком или спадом цикла состава. Давление наследия сжимает дисперсию и усиливает вес ожиданий по всем сигнальным каналам одновременно.',
      redemption: 'Действующие чемпионы и команды с максимальными ожиданиями несут сломленный импульс на незнакомую континентальную территорию. Индекс нарративного давления на максимальном пороге.',
      darkHorse: 'Команды среднего уровня со структурными преимуществами в групповой фазе. Низкие ожидания создают усиление сигнала, когда результаты превышают прогнозы — следует непропорциональное глобальное внимание.',
    },
    intercepts: {
      upsetAlert: '{weaker} сталкивается с дефицитом силы {diff} очков против {stronger}. Лили присваивает {pct}% вероятность сенсации — повышенный сигнал для неожиданного результата.',
      host: '{host} на родной земле активирует составной сигнал. Знакомость болельщиков, сниженная усталость от дороги и атмосферная интенсивность одновременно учитываются в модели Лили.',
      marquee: 'Совокупный индекс силы {combined}. Две элитные команды в прямом столкновении — максимальный нарративный вес и глобальный сигнал внимания сосредоточены в одном матче.',
      derby: 'Внутренний конфликт {fed} — тактическая близость сжимает дисперсию. Лили отслеживает повышенную психологическую волатильность в матчах группового этапа одной конфедерации.',
      watch: 'Разница сил {diff} очков. Динамика группового этапа даёт обеим командам реальный путь. Лили определяет баланс сигналов в этом матче.',
    },
    regionLabels: {
      UEFA: 'Европа', CONMEBOL: 'Ю. Америка', CAF: 'Африка',
      AFC: 'Азия', CONCACAF: 'С. Америка', OFC: 'Океания',
    },
  },

  CN: {
    states: {
      BURDEN: '重压', INTENSITY: '强度', PRESSURE: '压力',
      MOMENTUM: '势头', SURGE: '激增', CALM: '平静', UNDERDOG: '黑马',
    },
    types: {
      'UPSET ALERT': '爆冷警报', HOST: '东道主', MARQUEE: '焦点战', DERBY: '同联对决', WATCH: '关注',
    },
    time: {
      inDays: '还有{n}天', inHours: '还有{n}小时',
      daysAgo: '{n}天前', hoursAgo: '{n}小时前', minsAgo: '{n}分前',
    },
    arcTitles: {
      underdogs: '黑马之弧', host: '东道主命运',
      golden: '黄金一代压力', redemption: '救赎征程', darkHorse: '黑马崛起',
    },
    arcDescs: {
      underdogs: '{count}支低排名球队面对统计上占主导地位的对手。Lili的爆冷概率模型为这些比赛在小组赛阶段赋予了最高的惊喜系数。',
      host: '三个联合主办国同时产生大气压力。主场信号——观众熟悉度、减少差旅和裁判熟悉度——在三个国家叠加。',
      golden: '{n}个精英国家以顶峰或衰退的球队周期参赛。历史遗产的压力压缩了方差，同时放大了所有信号渠道上的期望权重。',
      redemption: '卫冕冠军和最高期望球队带着断裂的势头进入陌生的大陆领地。叙事压力指数达到最高阈值。',
      darkHorse: '中等水平球队在小组赛阶段具有结构性优势。当结果超出预期时，低期望会产生信号放大效应——不成比例的全球关注随之而来。',
    },
    intercepts: {
      upsetAlert: '{weaker}面对比{stronger}低{diff}分的实力差距。Lili给出{pct}%的爆冷概率——异常结果的高预警信号。',
      host: '{host}在本土激活了复合信号。观众熟悉度、减少旅途疲劳和大气强度在Lili的模型中同时发挥作用。',
      marquee: '综合实力指数{combined}。两支精英队伍直接碰撞——最大叙事权重和全球关注信号集中于一场比赛。',
      derby: '{fed}内部对决——战术熟悉度压缩了方差。Lili追踪同联合会小组赛中升高的心理波动性。',
      watch: '实力差距{diff}分。小组赛动态为双方提供了可信的晋级路径。Lili在这场比赛中识别出信号平衡。',
    },
    regionLabels: {
      UEFA: '欧洲', CONMEBOL: '南美洲', CAF: '非洲',
      AFC: '亚洲', CONCACAF: '北美洲', OFC: '大洋洲',
    },
  },

  JP: {
    states: {
      BURDEN: '重荷', INTENSITY: '強度', PRESSURE: 'プレッシャー',
      MOMENTUM: '勢い', SURGE: 'サージ', CALM: '冷静', UNDERDOG: 'アンダードッグ',
    },
    types: {
      'UPSET ALERT': '番狂わせアラート', HOST: 'ホスト', MARQUEE: 'マーキー', DERBY: 'ダービー', WATCH: 'ウォッチ',
    },
    time: {
      inDays: '{n}日後', inHours: '{n}時間後',
      daysAgo: '{n}日前', hoursAgo: '{n}時間前', minsAgo: '{n}分前',
    },
    arcTitles: {
      underdogs: 'アンダードッグアーク', host: '開催国の宿命',
      golden: '黄金世代のプレッシャー', redemption: 'リデンプションキャンペーン', darkHorse: 'ダークホースの台頭',
    },
    arcDescs: {
      underdogs: '{count}の低ランクチームが統計的に圧倒的な相手と対戦。Liliのアップセット確率モデルは、これらの試合にグループステージで最高のサプライズ係数を割り当てています。',
      host: '3つの共同開催国が同時に大気圧を生成。主催地シグナル — 観客との親しみ、移動削減、審判との親しみ — が3カ国すべてで複合的に作用。',
      golden: '{n}のエリート国がピークまたは衰退期のスカッドサイクルで参入。レガシー圧力が分散を圧縮し、すべてのシグナルチャンネルで同時に期待の重みを増幅。',
      redemption: 'ディフェンディングチャンピオンと最大期待チームが、砕けた勢いを抱えて未知の大陸の地へ。ナラティブ圧力指数が最高閾値に。',
      darkHorse: '構造的なグループステージの優位性を持つ中堅チーム。結果が期待を上回る時、低期待がシグナル増幅を生み出す — 不均衡なグローバルな注目が続く。',
    },
    intercepts: {
      upsetAlert: '{weaker}は{stronger}に対して{diff}ポイントの実力差に直面。Liliは{pct}%のアップセット確率を付与 — 外れ値結果の高シグナル。',
      host: '{host}のホームでの活動が複合シグナルを活性化。観客の親しみ、移動疲労の軽減、大気の強度がLiliのモデルで同時に機能。',
      marquee: '総合強度指数{combined}。二つのエリートチームの直接衝突 — 最大のナラティブウェイトとグローバルアテンションシグナルが一つの試合に集中。',
      derby: '{fed}内部対決 — 戦術的な慣れが分散を圧縮。Liliは同連盟グループ戦での高い心理的変動性を追跡。',
      watch: '強度差{diff}ポイント。グループステージのダイナミクスにより両チームに信頼できる道が提供。Liliはこの試合でシグナルバランスを特定。',
    },
    regionLabels: {
      UEFA: 'ヨーロッパ', CONMEBOL: '南アメリカ', CAF: 'アフリカ',
      AFC: 'アジア', CONCACAF: '北アメリカ', OFC: 'オセアニア',
    },
  },

  KR: {
    states: {
      BURDEN: '부담', INTENSITY: '강도', PRESSURE: '압박',
      MOMENTUM: '모멘텀', SURGE: '급상승', CALM: '침착', UNDERDOG: '언더독',
    },
    types: {
      'UPSET ALERT': '이변 경보', HOST: '개최국', MARQUEE: '빅매치', DERBY: '더비', WATCH: '주목',
    },
    time: {
      inDays: '{n}일 후', inHours: '{n}시간 후',
      daysAgo: '{n}일 전', hoursAgo: '{n}시간 전', minsAgo: '{n}분 전',
    },
    arcTitles: {
      underdogs: '언더독 아크', host: '개최국의 운명',
      golden: '황금세대의 압박', redemption: '구원의 캠페인', darkHorse: '다크호스 급부상',
    },
    arcDescs: {
      underdogs: '{count}개 하위 팀이 통계적으로 우세한 상대와 맞붙습니다. Lili의 이변 확률 모델은 이 경기들에 조별 리그에서 가장 높은 이변 계수를 부여합니다.',
      host: '세 공동 개최국이 동시에 대기압을 생성합니다. 홈 그라운드 신호 — 관중 친숙도, 이동 감소, 심판 친숙도 — 가 세 나라 전체에서 복합적으로 작용합니다.',
      golden: '{n}개 엘리트 국가가 최전성기 또는 쇠퇴 중인 선수 사이클로 참가합니다. 레거시 압박이 분산을 압축하고 모든 신호 채널에서 동시에 기대 무게를 증폭시킵니다.',
      redemption: '디펜딩 챔피언과 최고 기대 팀이 깨진 모멘텀을 안고 낯선 대륙 영역으로. 내러티브 압박 지수가 최고 임계값에 도달.',
      darkHorse: '조별 리그에서 구조적 이점을 가진 중위 팀들. 결과가 기대를 초과할 때 낮은 기대가 신호 증폭을 만들어냄 — 불균형한 전 세계적 주목이 따릅니다.',
    },
    intercepts: {
      upsetAlert: '{weaker}는 {stronger}에 비해 {diff}포인트 전력 열세에 처해 있습니다. Lili는 {pct}% 이변 확률을 부여합니다 — 이변 가능성의 높은 신호.',
      host: '{host}의 홈 그라운드가 복합 신호를 활성화합니다. 관중 친숙도, 이동 피로 감소, 대기 강도가 Lili의 모델에서 동시에 작용합니다.',
      marquee: '합산 강도 지수 {combined}. 두 엘리트 팀의 직접 충돌 — 최대 내러티브 가중치와 글로벌 주목 신호가 한 경기에 집중.',
      derby: '{fed} 내부 경쟁 — 전술적 친숙도가 분산을 압축합니다. Lili는 같은 연맹의 조별 경기에서 높아진 심리적 변동성을 추적합니다.',
      watch: '{diff}포인트의 전력 차이. 조별 리그 역학이 양 팀 모두에게 합리적인 경로를 제공합니다. Lili는 이 경기에서 신호 균형을 파악합니다.',
    },
    regionLabels: {
      UEFA: '유럽', CONMEBOL: '남미', CAF: '아프리카',
      AFC: '아시아', CONCACAF: '북미', OFC: '오세아니아',
    },
  },

  PT: {
    states: {
      BURDEN: 'FARDO', INTENSITY: 'INTENSIDADE', PRESSURE: 'PRESSÃO',
      MOMENTUM: 'MOMENTUM', SURGE: 'IMPULSO', CALM: 'CALMO', UNDERDOG: 'AZARÃO',
    },
    types: {
      'UPSET ALERT': 'ALERTA SURPRESA', HOST: 'ANFITRIÃO', MARQUEE: 'MARQUEE', DERBY: 'DERBY', WATCH: 'A SEGUIR',
    },
    time: {
      inDays: 'em {n}d', inHours: 'em {n}h',
      daysAgo: 'há {n}d', hoursAgo: 'há {n}h', minsAgo: 'há {n}min',
    },
    arcTitles: {
      underdogs: 'O Arco dos Azarões', host: 'Destino das Nações Sede',
      golden: 'Pressão da Geração Dourada', redemption: 'Campanha de Redenção', darkHorse: 'Impulso do Azarão',
    },
    arcDescs: {
      underdogs: '{count} entradas de baixo ranking enfrentam oposição estatisticamente dominante. O modelo de probabilidade de surpresa de Lili atribui a estes jogos o mais alto coeficiente de surpresa na fase de grupos.',
      host: 'Três co-anfitriões geram pressão atmosférica simultânea. Sinais de terreno doméstico — familiaridade do público, viagens reduzidas e familiaridade arbitral — compõem-se nas três nações.',
      golden: '{n} nações de elite que entram com ciclos de plantel no auge ou em declínio. A pressão do legado comprime a variância e amplifica o peso das expectativas em todos os canais de sinal simultaneamente.',
      redemption: 'Campeões em exercício e equipas de máxima expectativa carregando momentum fraturado para território continental desconhecido. Índice de pressão narrativa no limiar máximo.',
      darkHorse: 'Entradas de nível médio com vantagens estruturais na fase de grupos. Baixa expectativa cria amplificação de sinal quando os resultados superam — atenção global desproporcionada segue.',
    },
    intercepts: {
      upsetAlert: '{weaker} enfrenta um défice de força de {diff} pontos contra {stronger}. Lili atribui {pct}% de probabilidade de surpresa — sinal elevado para um resultado improvável.',
      host: '{host} em solo doméstico activa um sinal composto. A familiaridade do público, a fadiga de viagem reduzida e a intensidade atmosférica pesam simultaneamente no modelo de Lili.',
      marquee: 'Índice de força combinado de {combined}. Dois lados de elite em colisão direta — peso narrativo máximo e sinal de atenção global concentrado numa só partida.',
      derby: 'Confronto interno {fed} — a familiaridade tática comprime a variância. Lili rastreia elevada volatilidade psicológica em partidas de grupo da mesma confederação.',
      watch: 'Diferencial de força de {diff} pontos. As dinâmicas da fase de grupos dão a ambas as partes um caminho credível. Lili identifica equilíbrio de sinais nesta partida.',
    },
    regionLabels: {
      UEFA: 'Europa', CONMEBOL: 'A. do Sul', CAF: 'África',
      AFC: 'Ásia', CONCACAF: 'Am. do Norte', OFC: 'Oceânia',
    },
  },

  AR: {
    states: {
      BURDEN: 'عبء', INTENSITY: 'كثافة', PRESSURE: 'ضغط',
      MOMENTUM: 'زخم', SURGE: 'اندفاع', CALM: 'هدوء', UNDERDOG: 'الحصان الأسود',
    },
    types: {
      'UPSET ALERT': 'تحذير مفاجأة', HOST: 'مضيف', MARQUEE: 'مباراة الصدارة', DERBY: 'ديربي', WATCH: 'مراقبة',
    },
    time: {
      inDays: 'بعد {n}أيام', inHours: 'بعد {n}س',
      daysAgo: 'منذ {n}أيام', hoursAgo: 'منذ {n}س', minsAgo: 'منذ {n}دق',
    },
    arcTitles: {
      underdogs: 'قوس الحصان الأسود', host: 'مصير الدول المضيفة',
      golden: 'ضغط الجيل الذهبي', redemption: 'حملة الفداء', darkHorse: 'صعود الحصان الأسود',
    },
    arcDescs: {
      underdogs: '{count} فرق منخفضة الترتيب تواجه معارضة مسيطرة إحصائياً. يمنح نموذج احتمالية المفاجأة لدى ليلي هذه المباريات أعلى معامل مفاجأة في دور المجموعات.',
      host: 'ثلاثة دول مضيفة مشتركة تولد ضغطاً جوياً متزامناً. إشارات الأرض الخاصة — ألفة الجمهور، تقليل التنقل وألفة التحكيم — تتراكم عبر الدول الثلاث.',
      golden: '{n} دولة من النخبة تدخل مع دورات تشكيلة في الذروة أو الانحدار. ضغط الإرث يضغط التباين ويضخم وزن التوقعات عبر جميع قنوات الإشارة في آن واحد.',
      redemption: 'الأبطال الحاليون والفرق ذات التوقعات القصوى يحملون زخماً متصدعاً إلى أرض قارية غير مألوفة. مؤشر ضغط السرد عند الحد الأقصى.',
      darkHorse: 'فرق الدرجة المتوسطة ذات المزايا الهيكلية في دور المجموعات. التوقعات المنخفضة تخلق تضخيماً للإشارة عندما تتجاوز النتائج التوقعات — يتبع الاهتمام العالمي غير المتناسب.',
    },
    intercepts: {
      upsetAlert: '{weaker} يواجه عجزاً في القوة بـ{diff} نقطة مقابل {stronger}. تمنح ليلي {pct}% احتمالية مفاجأة — إشارة مرتفعة لنتيجة استثنائية.',
      host: '{host} على الأرض الخاصة يفعّل إشارة مركّبة. ألفة الجمهور وتقليل إجهاد السفر وحدة الأجواء تعمل في آنٍ واحد في نموذج ليلي.',
      marquee: 'مؤشر القوة المجمّع {combined}. فريقان من النخبة في صدام مباشر — أقصى ثقل سردي وإشارة الاهتمام العالمي مركّزة في مباراة واحدة.',
      derby: 'مواجهة داخلية لـ{fed} — الألفة التكتيكية تضغط التباين. ليلي تتتبع التقلب النفسي المرتفع في مباريات المجموعات من نفس الاتحاد.',
      watch: 'فارق القوة {diff} نقطة. ديناميكيات دور المجموعات تمنح كلا الفريقين مسارًا موثوقًا. ليلي تحدد توازن الإشارات في هذه المباراة.',
    },
    regionLabels: {
      UEFA: 'أوروبا', CONMEBOL: 'أمريكا الجنوبية', CAF: 'أفريقيا',
      AFC: 'آسيا', CONCACAF: 'أمريكا الشمالية', OFC: 'أوقيانوسيا',
    },
  },
};

// Helper: replace {placeholder} tokens in a template string
export function wsT(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    template,
  );
}
