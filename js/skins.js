/*
 * Geolite - skins. Cada uno cambia TODO: mapa (shader), paleta de interfaz, tipografia, formas, sonido.
 * Solo queda el aspecto Casino (el de Expedicion se retiro en v0.9).
 *   casino      mesa de cartas + monitor CRT (estilo "Balatro") Pixelify Sans + Silkscreen
 * v0.3.62: las MESAS del mapa (A.MESAS, A.mesas): el aspecto del mapa se gana y se elige aparte del skin.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  A.MAPSTYLES = A.MAPSTYLES || {};

  A.MAPSTYLES.casino = {
    style: 1, animated: true,
    oceanTop: "#1f5a52", oceanBot: "#0d2c33", shallow: "#39a58c", swirl: ["#0f3b3a", "#1f7a63", "#6b2740"],
    land: ["#f6e6c8", "#ffd9a8", "#ffc4c4", "#c9e8c1", "#bfe0ff", "#f3d6ff", "#fff7e6"],
    line: [0.1, 0.07, 0.16, 0.95], lineW: 2.3, lineOff: [0, 0], lineOffCol: [0, 0, 0, 0], shadow: { off: [3, -4], col: [0.04, 0.02, 0.08, 0.5] },
    grid: "#9fd6c8", gridA: 0.1, tropic: "#ffd98a", ao: 0.1, grain: 0.02, vignette: 0.5, postGrain: 0.045, tint: [1, 1, 1], crt: true,
    ink: "#16241c", paper: "#f3eddc", red: "#fe5f55", brass: "#f8b449", hl: "#fe5f55",
  };

  /* ---------------------------------------------------------------- v0.3.62: LAS MESAS DEL MAPA
     El jugador gana mesas nuevas y elige sobre cual juega (Perfil > Mesas, js/hub.js). Una mesa solo cambia el ASPECTO del mapa: fronteras, nombres,
     reglas y puntuacion son los mismos, asi que vale en todos los modos. "Casino" es la de siempre (remolino y pantalla de tubo). Las de pano
     (style 2 en js/map.js) son lisas y quietas: sin remolino, sin tubo y sin grano animado, y el mapa deja de repintarse en reposo.
     felt = [pelo del fieltro, sombra de contacto de las piezas, luz de costa, lampara]. land = siete tonos de una misma familia: los vecinos se
     separan por el tono y por la tinta de la frontera (comprobarlo de cerca en Europa si se toca). La Enciclopedia es un aparato con su propia
     pantalla: mientras esta abierta el mapa vuelve a "casino" (js/codex.js). */
  const PANO = { style: 2, animated: false, crt: false, felt: [0.07, 0.22, 0.22, 0.05], lineW: 2.2, lineOff: [0, 0], lineOffCol: [0, 0, 0, 0], gridA: 0.2, tropic: "#ffd98a",
    ao: 0.1, grain: 0.012, vignette: 0.34, postGrain: 0, tint: [1, 1, 1], ink: "#16241c", paper: "#f3eddc", red: "#fe5f55", brass: "#f8b449", hl: "#fe5f55" };
  A.MAPSTYLES.mesa = { ...PANO, oceanTop: "#245a41", oceanBot: "#123324", shallow: "#2f7a56", land: ["#f7eed6", "#e3cc98", "#f2d3c0", "#d3dfbd", "#d9d4c8", "#efdca8", "#fcf7ea"],
    line: [0.06, 0.1, 0.08, 0.95], shadow: { off: [3, -4], col: [0.01, 0.05, 0.03, 0.55] }, grid: "#d4a04a" };
  A.MAPSTYLES.granate = { ...PANO, oceanTop: "#6d2230", oceanBot: "#3a1018", shallow: "#8a2c39", land: ["#f7eed6", "#e3cc98", "#f4d2c4", "#dcdcb8", "#dbd3ca", "#efdca8", "#fcf7ea"],
    line: [0.12, 0.04, 0.06, 0.95], shadow: { off: [3, -4], col: [0.08, 0.01, 0.02, 0.55] }, grid: "#e2b25a" };
  A.MAPSTYLES.medianoche = { ...PANO, oceanTop: "#1a2c5a", oceanBot: "#0a1230", shallow: "#27407a", land: ["#e8ecf5", "#b4c2de", "#e2d6ee", "#c4dfe4", "#cfd3df", "#98abd0", "#f5f7fc"],
    line: [0.05, 0.07, 0.18, 0.95], shadow: { off: [3, -4], col: [0.01, 0.02, 0.1, 0.55] }, grid: "#a9c4ff", gridA: 0.18, tropic: "#dfe8ff" };
  A.MAPSTYLES.banca = { ...PANO, oceanTop: "#232326", oceanBot: "#0c0c0e", shallow: "#2e2b25", land: ["#f3cf6c", "#cf9630", "#f9e2a0", "#b98328", "#e6b84c", "#fbeec4", "#ffe9b0"],
    line: [0.12, 0.07, 0.01, 0.95], shadow: { off: [3, -4], col: [0, 0, 0, 0.6] }, grid: "#f8b449", gridA: 0.16, tropic: "#fff0b8" };
  /* el atlas de papel con el que nacio el juego (su estilo base sigue en js/map.js): como mesa, la tinta de las fronteras un punto mas firme (que se lean
     igual que en las demas) y sin el grano que se movia */
  A.MAPSTYLES.expedicion = { ...A.MAPSTYLES.expedicion, animated: false, crt: false, line: [0.15, 0.2, 0.23, 0.72], lineW: 1.4, postGrain: 0 };

  /* el catalogo, en orden. own(P): cuando es tuya (del perfil: los logros y, por si el perfil es anterior a algun logro, lo que guardan las
     Ascensiones). Los textos, en los 12 idiomas: es|en|fr|pt|de|it|es-419|zh|ko|ja|ru|pl */
  const ASC_HOW = "Gana la Aventura en Ascensión {n}.|Win the Adventure at Ascension {n}.|Gagne l'Aventure en Ascension {n}.|Vença a Aventura na Ascensão {n}.|Gewinne das Abenteuer auf Aufstieg {n}.|Vinci l'Avventura all'Ascensione {n}.||在进阶 {n} 赢下冒险。|어센션 {n}에서 모험을 승리하세요.|アセンション{n}でアドベンチャーに勝利する。|Выиграй Приключение на Восхождении {n}.|Wygraj Przygodę na Wniebowstąpieniu {n}.";
  const ASC_WON = "Has ganado la Aventura en Ascensión {n}.|You've won the Adventure at Ascension {n}.|Tu as gagné l'Aventure en Ascension {n}.|Você venceu a Aventura na Ascensão {n}.|Du hast das Abenteuer auf Aufstieg {n} gewonnen.|Hai vinto l'Avventura all'Ascensione {n}.||你在进阶 {n} 赢下了冒险。|어센션 {n}에서 모험을 승리했습니다.|アセンション{n}でアドベンチャーに勝利しました。|Приключение на Восхождении {n} выиграно.|Przygoda na Wniebowstąpieniu {n} wygrana.";
  const classic = () => (A.CAMPAIGNS || []).filter(c => c.mode === "classic");
  A.MESAS = [
    { id: "casino", own: () => true,
      n: "Casino|Casino|Casino|Cassino|Casino|Casinò||赌场|카지노|カジノ|Казино|Kasyno",
      d: "El remolino y la pantalla de tubo: la de siempre.|The swirl and the tube screen: the usual one.|Le tourbillon et l'écran à tube : celle de toujours.|O redemoinho e a tela de tubo: a de sempre.|Der Wirbel und der Röhrenbildschirm: der gewohnte.|Il vortice e lo schermo a tubo: quello di sempre.||漩涡与显像管屏幕：一直以来的那张。|소용돌이와 브라운관 화면, 늘 쓰던 그 테이블.|渦とブラウン管の画面。いつものテーブル。|Вихрь и кинескоп: тот самый, привычный.|Wir i ekran kineskopowy: ten co zawsze.",
      how: "Desde el principio.|From the start.|Dès le début.|Desde o início.|Von Anfang an.|Dall'inizio.||一开始就有。|처음부터.|最初から。|С самого начала.|Od początku.", won: "" },
    { id: "mesa", own: P => !!P.ach.adv_win || P.adv.asc >= 1,
      n: "La mesa|The table|La table|A mesa|Der Tisch|Il tavolo||绿呢牌桌|그린 테이블|グリーンテーブル|Стол|Stół",
      d: "Paño verde, piezas de marfil y líneas de oro.|Green baize, ivory pieces and gold lines.|Tapis vert, pièces d'ivoire et lignes d'or.|Pano verde, peças de marfim e linhas de ouro.|Grünes Tuch, Elfenbeinsteine und goldene Linien.|Panno verde, pezzi d'avorio e linee d'oro.||绿色台呢、象牙棋子和金线。|초록 펠트, 상아 말, 금빛 선.|緑のフェルト、象牙の駒、金のライン。|Зелёное сукно, фигуры из слоновой кости и золотые линии.|Zielone sukno, figury z kości słoniowej i złote linie.",
      how: "Gana tu primera Aventura.|Win your first Adventure.|Gagne ta première Aventure.|Vença sua primeira Aventura.|Gewinne dein erstes Abenteuer.|Vinci la tua prima Avventura.||赢下你的第一次冒险。|첫 모험에서 승리하세요.|最初のアドベンチャーに勝利する。|Выиграй своё первое Приключение.|Wygraj swoją pierwszą Przygodę.",
      won: "Has ganado tu primera Aventura.|You've won your first Adventure.|Tu as gagné ta première Aventure.|Você venceu sua primeira Aventura.|Du hast dein erstes Abenteuer gewonnen.|Hai vinto la tua prima Avventura.||你赢下了第一次冒险。|첫 모험에서 승리했습니다.|最初のアドベンチャーに勝利しました。|Первое Приключение выиграно.|Pierwsza Przygoda wygrana." },
    { id: "granate", asc: 2, own: P => !!P.ach.adv_asc2 || P.adv.asc >= 3,
      n: "Sala privada|Private room|Salon privé|Sala privada|Privatsalon|Sala privata||贵宾厅|프라이빗 룸|プライベートルーム|Приватный зал|Sala prywatna",
      d: "Paño granate, como las mesas de bacará.|Burgundy baize, like the baccarat tables.|Tapis grenat, comme aux tables de baccara.|Pano grená, como as mesas de bacará.|Weinrotes Tuch, wie an den Baccara-Tischen.|Panno granata, come ai tavoli del baccarà.||酒红色台呢，就像百家乐的牌桌。|바카라 테이블 같은 와인빛 펠트.|バカラのテーブルのような深紅のフェルト。|Бордовое сукно, как на столах баккара.|Bordowe sukno, jak przy stołach do bakarata." },
    { id: "medianoche", asc: 4, own: P => !!P.ach.adv_asc4 || P.adv.asc >= 5,
      n: "Medianoche|Midnight|Minuit|Meia-noite|Mitternacht|Mezzanotte||午夜|미드나이트|ミッドナイト|Полночь|Północ",
      d: "Paño azul noche y piezas de plata.|Midnight-blue baize and silver pieces.|Tapis bleu nuit et pièces d'argent.|Pano azul-noite e peças de prata.|Nachtblaues Tuch und silberne Steine.|Panno blu notte e pezzi d'argento.||午夜蓝台呢与银色棋子。|한밤의 푸른 펠트와 은빛 말.|夜の青のフェルトと銀の駒。|Сукно цвета ночи и серебряные фигуры.|Granatowe sukno i srebrne figury." },
    { id: "banca", asc: 5, own: P => !!P.ach.adv_ascmax,
      n: "La banca|The bank|La banque|A banca|Die Bank|Il banco||庄家|뱅크|胴元|Банк|Bank",
      d: "Paño negro y piezas de oro: la de quien ha podido con la casa.|Black baize and gold pieces: for those who beat the house.|Tapis noir et pièces d'or : pour qui a battu la maison.|Pano preto e peças de ouro: para quem venceu a casa.|Schwarzes Tuch und goldene Steine: für alle, die das Haus bezwungen haben.|Panno nero e pezzi d'oro: per chi ha battuto il banco.||黑色台呢与金色棋子：属于战胜赌场的人。|검은 펠트와 금빛 말. 하우스를 이긴 사람의 테이블.|黒のフェルトと金の駒。ハウスに勝った者のテーブル。|Чёрное сукно и золотые фигуры: для тех, кто одолел казино.|Czarne sukno i złote figury: dla tych, którzy pokonali kasyno." },
    { id: "expedicion", own: P => !!P.ach.classic_all || (cl => cl.length > 0 && cl.every(c => !!P.records["classic:" + c.id + ":win"]))(classic()),
      n: "Expedición|Expedition|Expédition|Expedição|Expedition|Spedizione||远征|원정|遠征|Экспедиция|Wyprawa",
      d: "El atlas de papel con el que nació el juego.|The paper atlas the game was born with.|L'atlas de papier avec lequel le jeu est né.|O atlas de papel com que o jogo nasceu.|Der Papieratlas, mit dem das Spiel begann.|L'atlante di carta con cui è nato il gioco.||游戏诞生之初的纸质地图集。|이 게임이 처음 태어났을 때의 종이 지도책.|このゲームが生まれたときの紙の地図帳。|Бумажный атлас, с которого началась игра.|Papierowy atlas, od którego zaczęła się gra.",
      how: "Completa las {n} campañas del Clásico.|Finish all {n} Classic campaigns.|Termine les {n} campagnes du Classique.|Complete as {n} campanhas do Clássico.|Schließe alle {n} Klassik-Kampagnen ab.|Completa le {n} campagne del Classico.||完成经典模式的全部 {n} 场战役。|클래식의 캠페인 {n}개를 모두 완료하세요.|クラシックの{n}個のキャンペーンをすべてクリアする。|Пройди все кампании Классики ({n}).|Ukończ wszystkie kampanie trybu Klasycznego ({n}).",
      won: "Has completado todas las campañas del Clásico.|You've finished every Classic campaign.|Tu as terminé toutes les campagnes du Classique.|Você completou todas as campanhas do Clássico.|Du hast alle Klassik-Kampagnen abgeschlossen.|Hai completato tutte le campagne del Classico.||你完成了经典模式的全部战役。|클래식의 모든 캠페인을 완료했습니다.|クラシックのすべてのキャンペーンをクリアしました。|Все кампании Классики пройдены.|Wszystkie kampanie trybu Klasycznego ukończone." },
  ];
  const prof = () => A.profile.get();
  const mem = () => { const P = prof(); if (!P.mesas || typeof P.mesas !== "object" || Array.isArray(P.mesas)) P.mesas = { use: "casino", seen: {} }; if (!P.mesas.seen || typeof P.mesas.seen !== "object") P.mesas.seen = {}; return P.mesas; };
  const fill = (s, n) => A.pick6(s).replace("{n}", n);
  A.mesas = {
    list: A.MESAS,
    get: id => A.MESAS.find(m => m.id === id) || A.MESAS[0],
    owned: id => { const m = A.MESAS.find(x => x.id === id); if (!m) return false; try { return !!m.own(prof()); } catch (e) { return m.id === "casino"; } },
    count: () => A.MESAS.filter(m => A.mesas.owned(m.id)).length,
    /* la que llevas puesta (si dejo de ser tuya, por ejemplo al reiniciar el perfil, vuelve la de siempre) */
    current: () => { const u = mem().use; return u && A.MAPSTYLES[u] && A.mesas.owned(u) ? u : "casino"; },
    style: () => A.MAPSTYLES[A.mesas.current()] || A.MAPSTYLES.casino,
    use(id) { if (!A.MAPSTYLES[id] || !A.mesas.owned(id)) return false; mem().use = id; A.profile.save(); const map = A.core && A.core.map; if (map && map.setStyle && !(A.codex && A.codex.isOpen && A.codex.isOpen())) map.setStyle(A.mesas.style()); return true; },
    /* ganadas y aun sin estrenar (js/mesas.js) */
    fresh: () => A.MESAS.filter(m => m.id !== "casino" && A.mesas.owned(m.id) && !mem().seen[m.id]).map(m => m.id),
    seen(ids) { const s = mem().seen, t = Date.now(); ids.forEach(id => { s[id] = t; }); A.profile.save(); },
    name: id => A.pick6(A.mesas.get(id).n),
    desc: id => A.pick6(A.mesas.get(id).d),
    how: id => { const m = A.mesas.get(id); return m.asc ? fill(ASC_HOW, m.asc) : fill(m.how, classic().length); },
    won: id => { const m = A.mesas.get(id); return m.asc ? fill(ASC_WON, m.asc) : A.pick6(m.won || ""); },
  };

  const N = (es, en, fr, pt, de, it) => ({ es, en, fr, pt, de, it });
  A.SKINS = {
    casino: { name: N("Casino", "Casino", "Casino", "Cassino", "Casino", "Casinò"), swatch: ["#1f7a63", "#fe5f55", "#f8b449"], theme: "#0f3b3a", music: { bpm: 92, sw: 0.34, shift: 0, mod: 1, idx: 2.6 } },
  };
  A.SKIN_ORDER = ["casino"];
  A.skin = "casino";

  /* aplica un skin a toda la aplicacion */
  A.applySkin = (id, map) => {
    if (!A.SKINS[id]) id = "casino";
    A.skin = id;
    document.documentElement.dataset.skin = id;
    const mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.content = A.SKINS[id].theme;
    if (map && map.setStyle) map.setStyle(A.mesas.style());            // v0.3.62: el mapa lleva la mesa que hayas elegido (Perfil > Mesas)
    if (A.audio && A.audio.setSkin) A.audio.setSkin(A.SKINS[id].music);
  };
})(window.AIQ);
