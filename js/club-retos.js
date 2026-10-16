/*
 * Geolite - LOS RETOS DEL CLUB DE LA CASA (entrega 3 del Club): retos de hoy, de la semana y encargos de la casa, pagados en fichas de oro.
 *
 *   Hoy          3 retos cada dia (+5 cada uno). La casa los guarda hasta 3 dias: si un dia no vienes, siguen ahi (pestanas Hoy / Ayer / Anteayer).
 *   Esta semana  3 retos (+20 cada uno) que se renuevan el lunes; lo avanzado no se pierde hasta entonces.
 *   Encargos     3 cartas lacradas sin fecha (+25 a +40). Al cumplir una, el crupier trae otra.
 * Tiran de la geografia y de todos los modos (dianas, capitales, banderas, mares, la Enciclopedia, el Clasico, la Aventura y el Duelo).
 * Nunca piden gastar ni jugar mas rapido. Un reto del dia que solo sale en un modo va, como mucho, uno por dia.
 * Lo cumplido se paga al momento (A.club.give: la tarjeta de la portada lo cuenta al volver) y se tacha en el recibo del Club del veredicto
 * siguiente (A.club.cash -> res.retos, js/club.js). La pantalla es del hub: A.hub.screen("retos"), desde la placa de la izquierda de la portada.
 *
 * Estado en el perfil: P.club.r = { v, since (primer dia), d: { "AAAA-MM-DD": [reto x3] }, gone: [dias ya cumplidos], w: { k (lunes), list },
 *   e: { seq, list }, pend: [cumplidos por ensenar] };  reto = { k (tipo), n (meta), c (continente), p (progreso), done, pay (encargos), fresh }.
 * Avisos:  A.clubRetos.q({ hit, bull, ratio, streak, cont, cap, flag, water, ctry })   una respuesta (no en la practica ni en los duelos automaticos)
 *          A.clubRetos.ev(t, datos)    t = duel {win} | lvl {perfect} | camp | round {n, boss} | advWin;   las tarjetas nuevas llegan solas (A.codex.onUnlock)
 *          A.clubRetos.take()  los cumplidos por ensenar (y se vacian)          A.clubRetos.open()  la pantalla (placa de la portada en js/hub.js)
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const PAY = { d: 5, w: 20 }, KEEP = 3;
  const prof = () => A.profile.get(), save = () => A.profile.save(), P6 = s => A.pick6(s), $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const CONTS = ["eu", "as", "af", "na", "sa", "oc"], CW = { eu: 3, as: 3, af: 2, na: 2, sa: 2, oc: 1 };
  /* el continente dentro de la frase: el nombre de siempre (i18n cont.*) y, en ruso y polaco, sus casos (en / de) */
  const CIN = { ru: { eu: "в Европе", as: "в Азии", af: "в Африке", na: "в Северной Америке", sa: "в Южной Америке", oc: "в Океании" },
    pl: { eu: "w Europie", as: "w Azji", af: "w Afryce", na: "w Ameryce Północnej", sa: "w Ameryce Południowej", oc: "w Oceanii" } };
  const CFR = { ru: { eu: "из Европы", as: "из Азии", af: "из Африки", na: "из Северной Америки", sa: "из Южной Америки", oc: "из Океании" },
    pl: { eu: "z Europy", as: "z Azji", af: "z Afryki", na: "z Ameryki Północnej", sa: "z Ameryki Południowej", oc: "z Oceanii" } };

  /* ------------------------------------------------------------------ el catalogo
     tx: la frase en 12 idiomas; {n} la meta, {c} el continente, {cin} / {cfr} sus casos en ruso y polaco; {p:una/varias} (ruso y polaco: {p:1/2-4/5+})
     d / w / e: la meta en un reto de hoy, de la semana o un encargo ([min, max], o nada si no sale ahi);  pay: lo que paga como encargo
     mode: el modo que hace falta (0 = cualquiera);  c: lleva continente;  ic: su icono (los de los logros) */
  const CAT = [
    { k: "bull", ic: "ach_bull_25", d: [3, 5], w: [15, 25], e: [40, 60], pay: 30,
      tx: "Consigue {n} {p:diana/dianas}|Land {n} {p:bullseye/bullseyes}|Mets dans le mille {n} fois|Acerte {n} {p:tiro/tiros} na mosca|Erziele {n} Volltreffer|Fai {n} {p:centro/centri}||正中靶心 {n} 次|{n}번 명중하기|{n}回命中させる|Попади в яблочко {n} {p:раз/раза/раз}|Traf w dziesiątkę {n} {p:raz/razy/razy}" },
    { k: "hitC", ic: c => "k_" + c + "_48", c: true, d: [4, 6], w: [20, 30], e: [50, 70], pay: 30,
      tx: "Acierta {n} {p:lugar/lugares} de {c}|Get {n} {p:place/places} right in {c}|Trouve {n} {p:lieu/lieux} en {c}|Acerte {n} {p:lugar/lugares} da {c}|Triff {n} {p:Ort/Orte} in {c}|Indovina {n} {p:luogo/luoghi} in {c}||答对 {n} 个{c}的地点|{c}의 장소 {n}곳 맞히기|{c}の場所を{n}か所当てる|Угадай {n} {p:место/места/мест} {cin}|Traf {n} {p:miejsce/miejsca/miejsc} {cin}" },
    { k: "cap", ic: "ach_codex_capitals", d: [3, 4], w: [12, 16], e: [30, 40], pay: 30,
      tx: "Acierta {n} {p:capital/capitales}|Get {n} {p:capital/capitals} right|Trouve {n} {p:capitale/capitales}|Acerte {n} {p:capital/capitais}|Triff {n} {p:Hauptstadt/Hauptstädte}|Indovina {n} {p:capitale/capitali}||答对 {n} 个首都|수도 {n}곳 맞히기|首都を{n}問正解する|Угадай {n} {p:столицу/столицы/столиц}|Traf {n} {p:stolicę/stolice/stolic}" },
    { k: "capC", ic: "ach_codex_capitals", c: true, w: [6, 10], e: [15, 25], pay: 35,
      tx: "Acierta {n} {p:capital/capitales} de {c}|Get {n} {p:capital/capitals} right in {c}|Trouve {n} {p:capitale/capitales} d'{c}|Acerte {n} {p:capital/capitais} da {c}|Triff {n} {p:Hauptstadt/Hauptstädte} in {c}|Indovina {n} {p:capitale/capitali} in {c}||答对 {n} 个{c}的首都|{c}의 수도 {n}곳 맞히기|{c}の首都を{n}問正解する|Угадай {n} {p:столицу/столицы/столиц} {cin}|Traf {n} {p:stolicę/stolice/stolic} {cin}" },
    { k: "flag", ic: "ach_classic_flags", d: [3, 4], w: [12, 16], e: [30, 40], pay: 30,
      tx: "Acierta {n} {p:bandera/banderas}|Get {n} {p:flag/flags} right|Trouve {n} {p:drapeau/drapeaux}|Acerte {n} {p:bandeira/bandeiras}|Triff {n} {p:Flagge/Flaggen}|Indovina {n} {p:bandiera/bandiere}||答对 {n} 面国旗|국기 {n}개 맞히기|国旗を{n}問正解する|Угадай {n} {p:флаг/флага/флагов}|Rozpoznaj {n} {p:flagę/flagi/flag}" },
    { k: "water", ic: "ach_codex_water", d: [2, 3], w: [8, 12], e: [20, 30], pay: 25,
      tx: "Acierta {n} {p:mar u océano/mares u océanos}|Get {n} {p:sea or ocean/seas or oceans} right|Trouve {n} {p:mer ou océan/mers ou océans}|Acerte {n} {p:mar ou oceano/mares ou oceanos}|Triff {n} {p:Meer oder Ozean/Meere oder Ozeane}|Indovina {n} {p:mare o oceano/mari o oceani}||答对 {n} 片海洋|바다나 대양 {n}곳 맞히기|海・大洋を{n}問正解する|Угадай {n} {p:море или океан/моря или океана/морей или океанов}|Traf {n} {p:morze lub ocean/morza lub oceany/mórz lub oceanów}" },
    { k: "ctry", ic: "ach_codex_country", d: [4, 6], w: [20, 30], e: [40, 60], pay: 25,
      tx: "Acierta {n} {p:país/países}|Get {n} {p:country/countries} right|Trouve {n} pays|Acerte {n} {p:país/países}|Triff {n} {p:Land/Länder}|Indovina {n} {p:paese/paesi}||答对 {n} 个国家|국가 {n}곳 맞히기|国を{n}問正解する|Угадай {n} {p:страну/страны/стран}|Traf {n} {p:kraj/kraje/krajów}" },
    { k: "streak", ic: "ach_streak_5", d: [4, 6], w: [8, 12], e: [13, 16], pay: 35, max: true,
      tx: "Llega a una racha de {n}|Reach a streak of {n}|Atteins une série de {n}|Chegue a uma sequência de {n}|Erreiche eine Serie von {n}|Raggiungi una serie di {n}||达成 {n} 连击|{n}연속 기록 달성하기|{n}連続正解を達成する|Набери серию из {n}|Osiągnij serię {n}" },
    { k: "sharp", ic: "a_target", d: [4, 6], w: [20, 30], e: [50, 80], pay: 30,
      tx: "Saca un 90 % o más en {n} {p:pregunta/preguntas}|Score 90 % or more on {n} {p:question/questions}|Fais 90 % ou plus sur {n} {p:question/questions}|Tire 90 % ou mais em {n} {p:pergunta/perguntas}|Hol 90 % oder mehr bei {n} {p:Frage/Fragen}|Fai il 90 % o più in {n} {p:domanda/domande}||在 {n} 道题中拿到 90% 以上|문제 {n}개에서 90% 이상 받기|{n}問で90%以上を出す|Набери 90 % или больше в {n} {p:вопросе/вопросах/вопросах}|Zdobądź 90 % lub więcej w {n} {p:pytaniu/pytaniach/pytaniach}" },
    { k: "cards", ic: "ach_codex_10", d: [5, 8], w: [25, 40], e: [60, 100], pay: 30, ok: n => locked() >= 3 * n,
      tx: "Descubre {n} {p:tarjeta/tarjetas} de la Enciclopedia|Unlock {n} Encyclopedia {p:card/cards}|Débloque {n} {p:carte/cartes} de l'Encyclopédie|Desbloqueie {n} {p:carta/cartas} da Enciclopédia|Schalte {n} {p:Karte/Karten} der Enzyklopädie frei|Sblocca {n} {p:carta/carte} dell'Enciclopedia||解锁 {n} 张百科全书卡片|도감 카드 {n}장 열기|図鑑のカードを{n}枚手に入れる|Открой {n} {p:карточку/карточки/карточек} энциклопедии|Odblokuj {n} {p:kartę/karty/kart} encyklopedii" },
    { k: "cardsC", ic: c => "ach_codex_" + c, c: true, w: [10, 15], e: [25, 40], pay: 30, ok: (n, c) => locked(c) >= 3 * n,
      tx: "Descubre {n} {p:tarjeta/tarjetas} de {c}|Unlock {n} {p:card/cards} from {c}|Débloque {n} {p:carte/cartes} d'{c}|Desbloqueie {n} {p:carta/cartas} da {c}|Schalte {n} {p:Karte/Karten} aus {c} frei|Sblocca {n} {p:carta/carte} di luoghi in {c}||解锁 {n} 张{c}的卡片|{c} 카드 {n}장 열기|{c}のカードを{n}枚手に入れる|Открой {n} {p:карточку/карточки/карточек} {cfr}|Odblokuj {n} {p:kartę/karty/kart} {cfr}" },
    { k: "duel", ic: "chips", mode: "duel", d: [1, 1], w: [3, 5],
      tx: "Juega {n} {p:duelo/duelos}|Play {n} {p:duel/duels}|Joue {n} {p:duel/duels}|Jogue {n} {p:duelo/duelos}|Spiel {n} {p:Duell/Duelle}|Gioca {n} {p:duello/duelli}||进行 {n} 场对决|대결 {n}판 하기|チップ勝負を{n}回遊ぶ|Сыграй {n} {p:дуэль/дуэли/дуэлей}|Zagraj {n} {p:pojedynek/pojedynki/pojedynków}" },
    { k: "duelW", ic: "crown", mode: "duel", w: [2, 3], e: [5, 8], pay: 35,
      tx: "Gana {n} {p:duelo/duelos}|Win {n} {p:duel/duels}|Gagne {n} {p:duel/duels}|Vença {n} {p:duelo/duelos}|Gewinne {n} {p:Duell/Duelle}|Vinci {n} {p:duello/duelli}||赢下 {n} 场对决|대결 {n}판 이기기|チップ勝負で{n}回勝つ|Выиграй {n} {p:дуэль/дуэли/дуэлей}|Wygraj {n} {p:pojedynek/pojedynki/pojedynków}" },
    { k: "lvl", ic: "ach_classic_world", mode: "classic", d: [1, 2], w: [4, 6],
      tx: "Supera {n} {p:nivel/niveles} del Clásico|Clear {n} Classic {p:level/levels}|Réussis {n} {p:niveau/niveaux} du Classique|Supere {n} {p:nível/níveis} do Clássico|Schaff {n} Klassik-Level|Supera {n} {p:livello/livelli} del Classico||通过经典模式 {n} 关|클래식 레벨 {n}개 클리어하기|クラシックで{n}レベルクリアする|Пройди {n} {p:уровень/уровня/уровней} в «Классике»|Ukończ {n} {p:poziom/poziomy/poziomów} w trybie klasycznym" },
    { k: "lvlP", ic: "ach_perfect", mode: "classic", w: [1, 1], e: [2, 3], pay: 35,
      tx: "Supera {n} {p:nivel/niveles} del Clásico sin fallar ninguna|Clear {n} Classic {p:level/levels} without a miss|Réussis {n} {p:niveau/niveaux} du Classique sans faute|Supere {n} {p:nível/níveis} do Clássico sem errar|Schaff {n} Klassik-Level ohne Fehler|Supera {n} {p:livello/livelli} del Classico senza errori||无失误通过经典模式 {n} 关|실수 없이 클래식 레벨 {n}개 클리어하기|ノーミスでクラシックを{n}レベルクリアする|Пройди {n} {p:уровень/уровня/уровней} в «Классике» без ошибок|Ukończ {n} {p:poziom/poziomy/poziomów} w trybie klasycznym bez błędu" },
    { k: "camp", ic: "ach_classic_gold1", mode: "classic", e: [1, 1], pay: 40,
      tx: "Termina {n} {p:campaña/campañas} del Clásico|Finish {n} Classic {p:campaign/campaigns}|Termine {n} {p:campagne/campagnes} du Classique|Termine {n} {p:campanha/campanhas} do Clássico|Schließ {n} Klassik-{p:Kampagne/Kampagnen} ab|Completa {n} {p:campagna/campagne} del Classico||完成 {n} 个经典模式战役|클래식 캠페인 {n}개 끝내기|クラシックのキャンペーンを{n}つ終える|Заверши {n} {p:кампанию/кампании/кампаний} в «Классике»|Ukończ {n} {p:kampanię/kampanie/kampanii} w trybie klasycznym" },
    { k: "round", ic: "ach_adv_clear1", mode: "adv", d: [3, 4], w: [10, 15],
      tx: "Supera {n} {p:ronda/rondas} de la Aventura|Clear {n} Adventure {p:round/rounds}|Réussis {n} {p:manche/manches} de l'Aventure|Supere {n} {p:rodada/rodadas} da Aventura|Schaff {n} {p:Runde/Runden} im Abenteuer|Supera {n} round dell'Avventura||通过冒险模式 {n} 个回合|모험 라운드 {n}개 클리어하기|アドベンチャーで{n}ラウンドクリアする|Пройди {n} {p:раунд/раунда/раундов} в «Приключении»|Zalicz {n} {p:rundę/rundy/rund} Przygody" },
    { k: "reach", ic: "ach_adv_act1", mode: "adv", w: [5, 7], e: [9, 12], pay: 40, max: true,
      tx: "Supera la ronda {n} de la Aventura|Clear round {n} of the Adventure|Réussis la manche {n} de l'Aventure|Supere a rodada {n} da Aventura|Schaff Runde {n} im Abenteuer|Supera il round {n} dell'Avventura||通过冒险模式第 {n} 回合|모험 {n}라운드 클리어하기|アドベンチャーの第{n}ラウンドをクリアする|Пройди {n}-й раунд «Приключения»|Zalicz {n}. rundę Przygody" },
    { k: "boss", ic: "ach_adv_boss", mode: "adv", w: [1, 2], e: [3, 5], pay: 35,
      tx: "Derrota a {n} {p:jefe/jefes} de la Aventura|Defeat {n} Adventure {p:boss/bosses}|Bats {n} boss de l'Aventure|Derrote {n} {p:chefe/chefes} da Aventura|Besiege {n} {p:Boss/Bosse} im Abenteuer|Sconfiggi {n} boss dell'Avventura||击败冒险模式 {n} 个首领|모험 보스 {n}명 처치하기|アドベンチャーのボスを{n}体倒す|Победи боссов в «Приключении»: {n}|Pokonaj bossów w Przygodzie: {n}" },
    { k: "advWin", ic: "ach_adv_win", mode: "adv", e: [1, 1], pay: 40,
      tx: "Gana {n} {p:Aventura/Aventuras}|Win {n} {p:Adventure/Adventures}|Gagne {n} {p:Aventure/Aventures}|Vença {n} {p:Aventura/Aventuras}|Gewinne {n} Abenteuer|Vinci {n} {p:Avventura/Avventure}||赢下 {n} 次冒险|모험 {n}번 승리하기|アドベンチャーで{n}回勝利する|Победи в «Приключении» {n} {p:раз/раза/раз}|Wygraj Przygodę {n} {p:raz/razy/razy}" },
  ];
  const BY = {}; CAT.forEach(t => { BY[t.k] = t; });

  /* como cuenta cada tipo un aviso: un numero (lo que suma), true (+1) o { max } (la mejor marca, para las rachas y las rondas) */
  const MATCH = {
    bull: e => e.t === "q" && e.bull,
    hitC: (e, r) => e.t === "q" && e.hit && e.cont === r.c,
    cap: e => e.t === "q" && e.hit && e.cap,
    capC: (e, r) => e.t === "q" && e.hit && e.cap && e.cont === r.c,
    flag: e => e.t === "q" && e.hit && e.flag,
    water: e => e.t === "q" && e.hit && e.water,
    ctry: e => e.t === "q" && e.hit && e.ctry,
    streak: e => (e.t === "q" ? { max: e.streak | 0 } : 0),
    sharp: e => e.t === "q" && e.ratio >= 0.9,
    cards: e => (e.t === "cards" ? e.ids.length : 0),
    cardsC: (e, r) => (e.t === "cards" ? e.conts[r.c] || 0 : 0),
    duel: e => e.t === "duel",
    duelW: e => e.t === "duel" && e.win,
    lvl: e => e.t === "lvl",
    lvlP: e => e.t === "lvl" && e.perfect,
    camp: e => e.t === "camp",
    round: e => e.t === "round",
    reach: e => (e.t === "round" ? { max: e.n | 0 } : 0),
    boss: e => e.t === "round" && e.boss,
    advWin: e => e.t === "advWin",
  };

  /* ------------------------------------------------------------------ textos de la pantalla y del recibo */
  const TX = {
    tab: "Retos|Challenges|Défis|Desafios|Aufgaben|Sfide||挑战|도전|挑戦|Задания|Wyzwania",
    title: "Retos de la casa|House challenges|Défis de la maison|Desafios da casa|Aufgaben des Hauses|Sfide della casa||本店挑战|하우스 도전|ハウスの挑戦|Задания заведения|Wyzwania kasyna",
    tip: "Retos de hoy, de la semana y encargos de la casa: cada uno te paga fichas de oro.|Today's challenges, this week's and the house's commissions: each one pays you gold chips.|Défis du jour, de la semaine et commandes de la maison : chacun te paie en jetons d'or.|Desafios de hoje, da semana e encomendas da casa: cada um paga fichas de ouro.|Tagesaufgaben, Wochenaufgaben und Aufträge des Hauses: Jede zahlt dir Goldchips.|Sfide di oggi, della settimana e incarichi della casa: ognuna ti paga in fiche d'oro.||今日挑战、本周挑战和本店委托：每完成一个都会给你金筹码。|오늘의 도전, 주간 도전, 하우스 의뢰: 하나마다 골드 칩을 줘요.|今日の挑戦、今週の挑戦、ハウスの依頼。どれも金のチップがもらえる。|Задания дня, недели и поручения заведения: за каждое платят золотыми фишками.|Wyzwania dnia, tygodnia i zlecenia kasyna: każde płaci złotymi żetonami.",
    today: "Hoy|Today|Aujourd'hui|Hoje|Heute|Oggi||今天|오늘|今日|Сегодня|Dziś",
    yday: "Ayer|Yesterday|Hier|Ontem|Gestern|Ieri||昨天|어제|昨日|Вчера|Wczoraj",
    yday2: "Anteayer|2 days ago|Avant-hier|Anteontem|Vorgestern|L'altro ieri||前天|그저께|一昨日|Позавчера|Przedwczoraj",
    week: "Esta semana|This week|Cette semaine|Esta semana|Diese Woche|Questa settimana||本周|이번 주|今週|На этой неделе|W tym tygodniu",
    jobs: "Encargos|Commissions|Commandes|Encomendas|Aufträge|Incarichi||委托|의뢰|依頼|Поручения|Zlecenia",
    each: "+{n} cada uno|+{n} each|+{n} chacun|+{n} cada|je +{n}|+{n} ciascuna||每个 +{n}|각 +{n}|各+{n}|+{n} за каждое|+{n} za każde",
    nodate: "Sin fecha|No deadline|Sans date|Sem prazo|Ohne Frist|Senza scadenza||无期限|기한 없음|期限なし|Без срока|Bez terminu",
    ftD: "¿Un día sin venir? La casa te guarda los retos hasta 3 días.|A day away? The house keeps your challenges for up to 3 days.|Un jour sans venir ? La maison te garde tes défis jusqu'à 3 jours.|Um dia sem vir? A casa guarda seus desafios por até 3 dias.|Einen Tag nicht da? Das Haus hebt deine Aufgaben bis zu 3 Tage auf.|Un giorno senza venire? La casa ti tiene le sfide fino a 3 giorni.||一天没来？本店会替你保留挑战，最多 3 天。|하루 못 왔나요? 하우스가 도전을 최대 3일까지 맡아 둬요.|来られない日があっても、挑戦は最大3日間取っておく。|Пропустил день? Заведение хранит задания до 3 дней.|Dzień przerwy? Kasyno trzyma wyzwania do 3 dni.",
    ftW: "Se renuevan el lunes. Lo que hayas avanzado no se pierde hasta entonces.|They renew on Monday. Your progress stays until then.|Ils se renouvellent le lundi. Ta progression reste jusque-là.|Renovam na segunda. Seu progresso fica até lá.|Sie erneuern sich am Montag. Dein Fortschritt bleibt bis dahin.|Si rinnovano il lunedì. I tuoi progressi restano fino ad allora.||每周一刷新，在那之前进度不会丢失。|월요일에 바뀌어요. 그때까지 진행도는 그대로예요.|月曜に入れ替わる。それまで進み具合は消えない。|Обновляются в понедельник. До тех пор прогресс сохраняется.|Odnawiają się w poniedziałek. Do tego czasu postęp zostaje.",
    ftE: "No caducan. Al cumplir uno, el crupier te trae otra carta lacrada.|They never expire. Complete one and the dealer brings you another sealed letter.|Elles n'expirent jamais. Remplis-en une et le croupier t'apporte une autre lettre scellée.|Não expiram. Cumpra uma e o crupiê traz outra carta lacrada.|Sie verfallen nie. Erfüllst du einen, bringt dir der Croupier einen neuen versiegelten Brief.|Non scadono. Completane uno e il croupier ti porta un'altra lettera sigillata.||不会过期。完成一个，荷官就会再送来一封封蜡信。|만료되지 않아요. 하나를 끝내면 딜러가 봉인된 편지를 하나 더 가져와요.|期限はない。ひとつ果たすと、ディーラーが封蝋の手紙をもう一通持ってくる。|Не сгорают. Выполнишь одно — крупье принесёт новое запечатанное письмо.|Nie wygasają. Wykonaj jedno, a krupier przyniesie kolejny zalakowany list.",
    newD: "Nuevos en {t}|New in {t}|Nouveaux dans {t}|Novos em {t}|Neue in {t}|Nuove tra {t}||{t}后刷新|{t} 후 새로 나와요|あと{t}で更新|Новые через {t}|Nowe za {t}",
    done: "Hecho|Done|Fait|Feito|Erledigt|Fatto||已完成|완료|達成|Готово|Gotowe",
    fresh: "Nuevo|New|Nouveau|Novo|Neu|Nuovo||新|새 의뢰|新着|Новое|Nowe",
    allD: "¡Los tres, hechos! Mañana, más.|All three done! More tomorrow.|Les trois, c'est fait ! Demain, d'autres.|Os três, feitos! Amanhã tem mais.|Alle drei erledigt! Morgen gibt's neue.|Tutte e tre fatte! Domani, altre.||三个全部完成！明天还有。|세 개 모두 완료! 내일 또 와요.|3つとも達成！ 明日もある。|Все три готовы! Завтра — новые.|Wszystkie trzy gotowe! Jutro kolejne.",
    gD: "Reto del día|Daily challenge|Défi du jour|Desafio do dia|Tagesaufgabe|Sfida del giorno||每日挑战|일일 도전|デイリー挑戦|Задание дня|Wyzwanie dnia",
    gW: "Reto de la semana|Weekly challenge|Défi de la semaine|Desafio da semana|Wochenaufgabe|Sfida della settimana||本周挑战|주간 도전|今週の挑戦|Задание недели|Wyzwanie tygodnia",
    gE: "Encargo|Commission|Commande|Encomenda|Auftrag|Incarico||委托|의뢰|依頼|Поручение|Zlecenie",
    more: "Y {n} más|And {n} more|Et {n} de plus|E mais {n}|Und {n} weitere|E altre {n}||还有 {n} 个|외 {n}개|ほか{n}件|И ещё {n}|I jeszcze {n}",
  };
  /* horas y minutos para la cuenta atras */
  const UNIT = { d: "d|d|j|d|T|g||天|일|日|д|d", h: "h|h|h|h|Std.|h||小时|시간|時間|ч|godz.", m: "min|min|min|min|Min.|min||分钟|분|分|мин|min" };
  const left = ms => { const m = Math.max(1, Math.ceil(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60, U = k => P6(UNIT[k]);
    const cjk = /^(zh|ko|ja)/.test(A.lang), j = (n, k) => (cjk ? `${n}${U(k)}` : `${n} ${U(k)}`);
    return d ? j(d, "d") + " " + j(h, "h") : h ? j(h, "h") + " " + j(mm, "m") : j(mm, "m"); };

  /* ------------------------------------------------------------------ frases: plurales y continente */
  const base = () => (A.lang === "es-419" ? "es" : A.lang);
  const plural = (n, forms) => {
    const f = forms.split("/"), L = base();
    if (L === "ru" || L === "pl") {
      const m10 = n % 10, m100 = n % 100;
      if (L === "ru") return f[m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2] || f[f.length - 1];
      return f[n === 1 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2] || f[f.length - 1];
    }
    return f[(L === "fr" ? n <= 1 : n === 1) ? 0 : 1] || f[0];
  };
  function text(r) {
    const t = BY[r.k]; if (!t) return "";
    const L = base(), c = r.c ? A.t("cont." + r.c) : "";
    return P6(t.tx).replace(/\{p:([^}]*)\}/g, (_, f) => plural(r.n, f)).replace(/\{n\}/g, A.fmt(r.n)).replace(/\{cin\}/g, (CIN[L] && CIN[L][r.c]) || c).replace(/\{cfr\}/g, (CFR[L] && CFR[L][r.c]) || c).replace(/\{c\}/g, c);
  }
  const iconOf = r => { const t = BY[r.k], i = t && t.ic; return typeof i === "function" ? i(r.c) : i || "journal"; };

  /* ------------------------------------------------------------------ las tarjetas que quedan por descubrir (por continente), para no pedir imposibles */
  let LK = null, LKat = 0;
  function locked(c) {
    if (!A.codex || !A.codex.ids) return 1e9;
    if (!LK || performance.now() - LKat > 60000) {
      LK = { all: 0 }; CONTS.forEach(k => { LK[k] = 0; });
      for (const id of A.codex.ids()) { if (A.codex.isUnlocked(id)) continue; LK.all++; const e = A.codex.entry(id); if (e && e.lat != null) { const k = A.continent(e.lat, e.lon); if (LK[k] != null) LK[k]++; } }
      LKat = performance.now();
    }
    return c ? LK[c] || 0 : LK.all;
  }

  /* ------------------------------------------------------------------ el reparto (con semilla: el mismo dia da los mismos retos) */
  const pad = n => String(n).padStart(2, "0");
  const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayAdd = (d, k) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + k);
  const monday = d => dayAdd(d, -((d.getDay() + 6) % 7));
  const pickCont = rng => { let x = rng() * 13; for (const k of CONTS) { x -= CW[k]; if (x < 0) return k; } return "eu"; };
  /* un reto de un tipo: meta al azar en su tramo (en Oceania, algo menos: tiene pocos lugares) */
  function make(t, g, rng) {
    const span = t[g]; if (!span) return null;
    const c = t.c ? pickCont(rng) : undefined;
    let n = span[0] + Math.floor(rng() * (span[1] - span[0] + 1));
    if (c === "oc" && !t.max) n = Math.max(1, Math.round(n * 0.7));
    if (t.ok && !t.ok(n, c)) return null;
    const r = { k: t.k, n, p: 0, done: 0 }; if (c) r.c = c; if (g === "e") r.pay = t.pay || 25;
    return r;
  }
  function drawFrom(pool, g, rng, avoid) {
    const L = rng.shuffle ? rng.shuffle(pool) : pool;
    for (const t of L) { if (avoid.has(t.k) || (t.k === "capC" && avoid.has("cap")) || (t.k === "cap" && avoid.has("capC"))) continue; const r = make(t, g, rng); if (r) { avoid.add(t.k); return r; } }
    return null;
  }
  const geo = g => CAT.filter(t => t[g] && !t.mode), modal = g => CAT.filter(t => t[g] && t.mode);
  /* hoy: dos de geografia (valen en cualquier modo) y el tercero, la mitad de las veces, de un modo concreto */
  function genDay(key) {
    const rng = A.rng(prof().id + ":club-d:" + key), avoid = new Set(), out = [];
    out.push(drawFrom(geo("d"), "d", rng, avoid)); out.push(drawFrom(geo("d"), "d", rng, avoid));
    out.push(drawFrom(rng() < 0.5 ? modal("d") : geo("d"), "d", rng, avoid) || drawFrom(geo("d"), "d", rng, avoid));
    return out.filter(Boolean);
  }
  /* la semana: uno de geografia, uno de un modo y uno de geografia o de la Enciclopedia */
  function genWeek(key) {
    const rng = A.rng(prof().id + ":club-w:" + key), avoid = new Set(), out = [];
    out.push(drawFrom(geo("w"), "w", rng, avoid)); out.push(drawFrom(modal("w"), "w", rng, avoid)); out.push(drawFrom(geo("w"), "w", rng, avoid));
    return out.filter(Boolean);
  }
  function genJob(seq, avoid) { const rng = A.rng(prof().id + ":club-e:" + seq); return drawFrom(CAT.filter(t => t.e), "e", rng, avoid); }

  /* ------------------------------------------------------------------ el estado: guarda los dias, cambia la semana y repone los encargos */
  function state() {
    if (!A.club) return null;
    A.club.xp(); const c = prof().club, now = new Date(), tk = dayKey(now);
    let r = c.r; if (!r || r.v !== 1) r = c.r = { v: 1, since: tk, d: {}, gone: [], w: null, e: { seq: 0, list: [] }, pend: [] };
    const keep = []; for (let i = 0; i < KEEP; i++) { const k = dayKey(dayAdd(now, -i)); if (k < r.since) break; keep.push(k); }
    let ch = false;
    for (const k of Object.keys(r.d)) {
      const all = r.d[k].length && r.d[k].every(x => x.done);
      if (!keep.includes(k) || (k !== tk && all)) { if (all && !r.gone.includes(k)) r.gone.push(k); delete r.d[k]; ch = true; }
    }
    r.gone = r.gone.filter(k => keep.includes(k));
    keep.forEach(k => { if (!r.d[k] && !r.gone.includes(k)) { r.d[k] = genDay(k); ch = true; } });
    const wk = dayKey(monday(now)); if (!r.w || r.w.k !== wk) { r.w = { k: wk, list: genWeek(wk) }; ch = true; }
    if (r.e.list.length < 3) {
      const avoid = new Set(r.e.list.map(x => x.k));
      while (r.e.list.length < 3) { const j = genJob(++r.e.seq, avoid); if (!j) break; if (r.e.seq > 3) j.fresh = 1; r.e.list.push(j); }   // las tres primeras ya estaban: no son «nuevas»
      ch = true;
    }
    if (ch) save();
    return r;
  }
  const days = r => Object.keys(r.d).sort().reverse();                          // hoy primero

  /* ------------------------------------------------------------------ los avisos */
  function ev(t, data) {
    const r = state(); if (!r) return;
    const e = Object.assign({ t }, data || {}), paid = [];
    const each = (list, g) => (list || []).forEach(x => {
      if (x.done || !MATCH[x.k]) return; const v = MATCH[x.k](e, x); if (!v) return;
      if (typeof v === "object") { if (v.max > x.p) x.p = v.max; else return; } else x.p += v === true ? 1 : v;
      if (x.p >= x.n) { x.p = x.n; x.done = Date.now(); paid.push([g, x]); }
    });
    days(r).forEach(k => each(r.d[k], "d")); each(r.w && r.w.list, "w"); each(r.e.list, "e");
    if (paid.length) {
      paid.forEach(([g, x]) => { const n = g === "e" ? x.pay || 25 : PAY[g]; if (A.club.give) A.club.give(n); r.pend.push({ g, k: x.k, n: x.n, c: x.c, pay: n }); });
      if (r.pend.length > 12) r.pend = r.pend.slice(-12);
      if (paid.some(p => p[0] === "e")) { r.e.list = r.e.list.filter(x => !x.done); state(); }   // carta cumplida: se va y llega otra lacrada
    }
    if (paid.length || t !== "q") save();                                      // el avance de cada respuesta lo guarda la propia partida (sin escribir dos veces por pregunta)
  }
  const q = info => ev("q", info);
  /* las tarjetas nuevas de la Enciclopedia: cuantas y de que continente */
  function cards(ids) {
    if (!ids || !ids.length) return; const conts = {};
    ids.forEach(id => { const e = A.codex.entry(id); if (e && e.lat != null) { const k = A.continent(e.lat, e.lon); conts[k] = (conts[k] || 0) + 1; } });
    LK = null; ev("cards", { ids, conts });
  }
  /* lo cumplido desde el ultimo recibo (para tacharlo en el del veredicto) */
  function take() { const r = state(); if (!r || !r.pend.length) return []; const out = r.pend.map(x => Object.assign({}, x, { ic: iconOf(x), tx: text(x), g: P6(x.g === "d" ? TX.gD : x.g === "w" ? TX.gW : TX.gE) })); r.pend = []; save(); return out; }
  const todayDone = () => { const r = state(); if (!r) return [0, 0]; const L = r.d[dayKey(new Date())] || []; return [L.filter(x => x.done).length, L.length]; };

  /* ------------------------------------------------------------------ la pantalla: Hoy, Esta semana y Encargos */
  const fi = cls => `<img class="ck-fi${cls ? " " + cls : ""}" src="assets/icons/ficha_oro.webp" alt="" draggable="false">`;
  const UI = { day: 0 };
  function row(x, g) {
    const pct = Math.max(0, Math.min(100, (100 * x.p) / Math.max(1, x.n))), done = !!x.done;
    const right = done ? `<span class="rt-ok">${esc(P6(TX.done))}</span>` : `<b class="rt-pr">${A.fmt(x.p)}/${A.fmt(x.n)}</b>`;
    const tag = g === "e" ? `<b class="rt-tag">+${x.pay}${fi("rt")}</b>` : "";                       // el encargo lleva su pago en el lacre, bajo el icono
    return `<div class="rt-row g-${g}${done ? " done" : ""}${x.fresh ? " fresh" : ""}"><span class="rt-ic">${A.icon(iconOf(x))}${tag}</span><span class="rt-tx">${esc(text(x))}${x.fresh ? `<i class="rt-new">${esc(P6(TX.fresh))}</i>` : ""}</span><span class="rt-bar"><i style="width:${pct}%"></i></span>${right}</div>`;
  }
  const head = (t, sub) => `<div class="rt-ch"><span class="gx-eyb rt-each">${sub}</span><h3 class="gx-t-m">${esc(P6(t))}</h3></div>`;
  function colD(r) {
    const ks = days(r), tk = dayKey(new Date()); if (UI.day >= ks.length) UI.day = 0;
    const k = ks[UI.day], list = (k && r.d[k]) || [], lab = kk => { const i = Math.round((new Date(tk) - new Date(kk)) / 864e5); return P6(i <= 0 ? TX.today : i === 1 ? TX.yday : TX.yday2); };
    const tabs = ks.length > 1 ? `<nav class="rt-days">${ks.map((kk, i) => `<button type="button" class="rt-day${i === UI.day ? " on" : ""}" data-day="${i}" aria-pressed="${i === UI.day}">${esc(lab(kk))}${r.d[kk].some(x => !x.done) ? "" : " ✓"}</button>`).join("")}</nav>` : "";
    const nxt = dayAdd(new Date(), 1) - Date.now(), all = list.length && list.every(x => x.done) && k === tk;
    return `${head(TX.today, esc(P6(TX.each).replace("{n}", PAY.d)) + fi("rt"))}${tabs}
      <div class="rt-list">${list.map(x => row(x, "d")).join("")}</div>
      <p class="rt-ft">${all ? `<b>${esc(P6(TX.allD))}</b> ` : ""}${esc(P6(TX.ftD))}<span class="rt-when">${esc(P6(TX.newD).replace("{t}", left(nxt)))}</span></p>`;
  }
  function colW(r) {
    const nxt = dayAdd(monday(new Date()), 7) - Date.now();
    return `${head(TX.week, esc(P6(TX.each).replace("{n}", PAY.w)) + fi("rt"))}
      <div class="rt-list">${(r.w ? r.w.list : []).map(x => row(x, "w")).join("")}</div>
      <p class="rt-ft">${esc(P6(TX.ftW))}<span class="rt-when">${esc(P6(TX.newD).replace("{t}", left(nxt)))}</span></p>`;
  }
  function colE(r) {
    return `${head(TX.jobs, esc(P6(TX.nodate)))}
      <div class="rt-list">${r.e.list.map(x => row(x, "e")).join("")}</div>
      <p class="rt-ft">${esc(P6(TX.ftE))}</p>`;
  }
  function html(r) {
    const have = A.club ? A.club.fichas() : 0, lv = A.club ? P6(A.club.tx.lv).replace("{n}", A.club.level()) : "";
    return `<div class="gx-veil bq-veil"></div><section class="rt-screen gx-stage" aria-labelledby="rtH" data-nosq>
      <div class="gx-grid rt-grid">
        <header class="bq-head rt-head"><button type="button" class="gx-btn sm" id="hubBack">${A.icon("u_back")}<span>${A.t("set.close")}</span>${A.gala.keyHint("Esc", "b")}</button>
          <h2 class="gx-t-l bq-h" id="rtH"><span class="bq-hic">${A.icon("journal")}</span><span><span class="gx-eyb">${esc(A.club ? P6(A.club.tx.club) : "")}${lv ? " · " + esc(lv) : ""}</span>${esc(P6(TX.title))}</span></h2>
          <span class="bq-wal" aria-label="${esc(A.club ? P6(A.club.tx.fichas) : "")}">${fi("bq-fi")}<b>${A.fmt(have)}</b></span>${A.hub.tools()}</header>
        <div class="gx-sh rt-col"><div class="gx-paper rt-pp" id="rtD">${colD(r)}</div></div>
        <div class="gx-sh rt-col"><div class="gx-paper rt-pp">${colW(r)}</div></div>
        <div class="gx-sh rt-col"><div class="gx-paper rt-pp rt-lac">${colE(r)}</div></div>
      </div></section>`;
  }
  function wireDays() {
    document.querySelectorAll("#rtD [data-day]").forEach(b => { b.onclick = () => { if (A.sfx && A.sfx.ui) A.sfx.ui(); UI.day = +b.dataset.day; const r = state(), el = $("rtD"); el.innerHTML = colD(r); wireDays(); const f = el.querySelector(`[data-day="${UI.day}"]`); if (f) f.focus({ preventScroll: true }); }; });
  }
  function open() {
    const c = A.core; if (!c) return;
    const r = state(); if (!r) return; UI.day = 0;
    if (r.pend.length) { r.pend = []; save(); }                                   // vistos aqui: el recibo ya no los repite
    c.dialog(html(r), "tablewrap");
    A.hub.wireTools(); $("hubBack").onclick = () => { if (A.sfx && A.sfx.ui) A.sfx.ui(); A.hub.screen("home"); };
    wireDays();
    const fresh = r.e.list.filter(x => x.fresh);
    if (fresh.length) { setTimeout(() => { if (A.sfx && A.sfx.sealPop) A.sfx.sealPop(); }, 520); fresh.forEach(x => { delete x.fresh; }); save(); }   // la carta nueva entra con su lacre (una vez)
    setTimeout(() => { const f = document.querySelector("#dlg .rt-day") || $("hubBack"); if (f) f.focus({ preventScroll: true }); }, 80);
  }

  if (A.codex && A.codex.onUnlock) A.codex.onUnlock(cards);
  A.clubRetos = { q, ev, take, open, state, text, iconOf, todayDone, CAT, tx: TX };
})(window.AIQ);
