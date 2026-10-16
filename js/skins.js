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

  /* ---------------------------------------------------------------- v0.3.132: LAS MESAS DE LA BOUTIQUE (Club de la casa, entrega 2)
     Materiales, no colores (js/map.js: u_mat 1-27 en tierra y mar, fx2 en el posproceso). mat: 1 madera, 2 marmol, 3 tiza, 4 neon, 5 pergamino
     con rumbos, 6 bandas de profundidad, 8 cianotipo, 9 laton cepillado, 10 hielo, 11 moqueta, 14 halo de oro o de lava. mc1/mc2 = colores del
     material, mp = sus parametros, lmat = tratamiento de la frontera (1 tiza, 2 neon), coast = luz de la costa, wide = desenfoque ancho (bandas).
     Regla del usuario: el MAR LIMPIO (nada de grietas, vetas ni rayas que se confundan con islas). Las raras son quietas; las legendarias, vivas. */
  const MS = o => ({ ...A.MAPSTYLES.mesa, grain: 0, ...o });
  A.MAPSTYLES.ruleta = MS({ mat: 1, oceanTop: "#6e3420", oceanBot: "#3e190d", shallow: "#8a4a2a", mc1: "#230b04", mc2: "#b0663c", mp: [26, 150, 0.16, 2], felt: [0, 0.3, 0.1, 0.07],
    land: ["#f4e6c4", "#e2c48e", "#efd2b0", "#d9cfa6", "#e8dcc4", "#f0d898", "#fbf3e0"], line: [0.16, 0.07, 0.03, 0.95], shadow: { off: [3, -4], col: [0.05, 0.01, 0, 0.6] }, grid: "#e0a85a", gridA: 0.12 });
  A.MAPSTYLES.tablero = MS({ mat: 1, oceanTop: "#c08a52", oceanBot: "#8a5a2e", shallow: "#cf9a62", mc1: "#5a3416", mc2: "#e0b07a", mp: [34, 190, 0.1, 2], felt: [0, 0.22, 0.1, 0.05],
    land: ["#2f5d4a", "#8a3a2c", "#2c4a6e", "#a0782a", "#5a3a5e", "#3d6b6b", "#6e5a2e"], line: [0.98, 0.9, 0.7, 0.92], shadow: { off: [3, -4], col: [0.15, 0.07, 0.02, 0.55] }, grid: "#5a3416", gridA: 0.16, tropic: "#5a3416", ink: "#2a1a0c" });
  A.MAPSTYLES.carrara = MS({ mat: 2, oceanTop: "#eeeae2", oceanBot: "#d2ccc1", shallow: "#e4dfd6", mc1: "#77736f", mc2: "#b4ada3", mp: [0.03, 1, 0, 2], felt: [0, 0.12, 0, 0.04],
    land: ["#c9a46a", "#a65f46", "#6f8a6a", "#8a6f9e", "#b98a52", "#5f7f93", "#c48f7a"], line: [0.14, 0.1, 0.08, 0.9], shadow: { off: [2, -3], col: [0.2, 0.17, 0.13, 0.18] }, grid: "#8a847c", gridA: 0.14, tropic: "#a0703a" });
  A.MAPSTYLES.nero = MS({ mat: 2, oceanTop: "#1f1e21", oceanBot: "#0b0b0d", shallow: "#2a2826", mc1: "#d8b469", mc2: "#5a5650", mp: [0.03, 1.4, 0, 2], felt: [0, 0.25, 0, 0.05],
    land: ["#f1e6cf", "#dccaa0", "#efd9c4", "#d6d1bb", "#e4dccb", "#ead7a2", "#faf4e6"], line: [0.1, 0.08, 0.05, 0.95], shadow: { off: [3, -4], col: [0, 0, 0, 0.6] }, grid: "#d8b469", gridA: 0, tropic: "#f0d890" });
  A.MAPSTYLES.pizarra = MS({ mat: 3, oceanTop: "#2f3d37", oceanBot: "#1c2622", shallow: "#34443d", mc1: "#e8efe9", mc2: "#26322e", mp: [0.09, 0, 0, 2], felt: [0, 0, 0, 0.04], lmat: 1,
    land: ["#f2efe6", "#f6d9a0", "#f4b9b0", "#bfe3c4", "#b9d4f2", "#e5c6f0", "#fff6c9"], line: [0.95, 0.96, 0.93, 0.92], lineW: 2.0, shadow: null, grid: "#e8efe9", gridA: 0.1, tropic: "#f6d9a0" });
  A.MAPSTYLES.vegas = MS({ mat: 4, oceanTop: "#140b28", oceanBot: "#05030c", shallow: "#140b28", mc1: "#22d8ff", mp: [0.4, 0, 0, 1], felt: [0, 0, 0, 0.05], lmat: 2, coast: [0.2, 0.9, 1, 1],
    land: ["#1f1338", "#26133c", "#16223e", "#2c1132", "#1a1c36", "#22163a", "#2c1c44"], line: [1, 0.25, 0.68, 1], lineW: 2.2, shadow: null, grid: "#7a3cff", gridA: 0.2, tropic: "#ffd84a", hl: "#ffd84a" });
  A.MAPSTYLES.nautica = MS({ mat: 5, wide: true, oceanTop: "#e2cf9f", oceanBot: "#cdb27c", shallow: "#e8d8ae", mc1: "#5a3a1e", mc2: "#a8783e", mp: [9, 0, 0, 2], felt: [0, 0, 0.25, 0.03],
    land: ["#f6ebcc", "#f2d9b0", "#e9e0b6", "#f3cfbb", "#e3e4bf", "#f7e3a8", "#fbf2dc"], line: [0.32, 0.19, 0.08, 0.92], lineW: 1.8, shadow: { off: [2, -3], col: [0.35, 0.22, 0.08, 0.25] }, grid: "#6a4a26", gridA: 0.22, tropic: "#a8452a" });
  A.MAPSTYLES.fondo = MS({ mat: 6, wide: true, oceanTop: "#0f2c4e", oceanBot: "#071830", shallow: "#8fd0da", mc1: "#5fb1c8", mc2: "#c8f0f4", mp: [2.0, 0, 0, 1], felt: [0, 0.1, 0.12, 0.04],
    land: ["#e9dcb0", "#cfd9a4", "#e3c99a", "#d8e2b8", "#efe2c0", "#c9d6a0", "#f4ead0"], line: [0.12, 0.15, 0.1, 0.85], shadow: { off: [3, -4], col: [0.01, 0.04, 0.1, 0.5] }, grid: "#a9dde6", gridA: 0.12, tropic: "#ffe2a0" });
  A.MAPSTYLES.cianotipo = MS({ mat: 8, oceanTop: "#1f528e", oceanBot: "#123a6e", shallow: "#25609e", mc1: "#dbe8ff", mp: [0, 0, 0, 2], felt: [0, 0, 0, 0.04],
    land: ["#3e74b4", "#3568a6", "#4880bf", "#2f5f9a", "#5289c6", "#3a6eae", "#5c93cf"], line: [0.92, 0.95, 1, 0.95], lineW: 1.8, shadow: null, grid: "#dbe8ff", gridA: 0.2, tropic: "#dbe8ff", ink: "#0f2a4e", paper: "#f4f8ff" });
  A.MAPSTYLES.laton = MS({ mat: 9, oceanTop: "#b8862e", oceanBot: "#77511a", shallow: "#c4943a", mc1: "#3e2a0c", mc2: "#f2d38a", mp: [150, 0, 0, 2], felt: [0, 0.3, 0.05, 0],
    land: ["#2a2420", "#3a2a22", "#24302c", "#352a30", "#2c2c26", "#3a3224", "#433a30"], line: [0.95, 0.78, 0.4, 0.95], shadow: { off: [3, -4], col: [0.15, 0.08, 0, 0.6] }, grid: "#3e2a0c", gridA: 0.18, tropic: "#3e2a0c" });
  A.MAPSTYLES.moqueta = MS({ mat: 11, oceanTop: "#6a1424", oceanBot: "#3e0a14", shallow: "#7a1c2c", mc1: "#1f5a52", mc2: "#e0b25a", mp: [30, 0, 0, 2], felt: [0, 0.32, 0.05, 0.06],
    land: ["#f7eed6", "#e3cc98", "#f2d3c0", "#d3dfbd", "#d9d4c8", "#efdca8", "#fcf7ea"], line: [0.14, 0.03, 0.05, 0.95], shadow: { off: [3, -4], col: [0.08, 0, 0.02, 0.6] }, grid: "#e0b25a", gridA: 0.0 });
  A.MAPSTYLES.hielo = MS({ mat: 10, oceanTop: "#2d5f86", oceanBot: "#163a5c", shallow: "#a8d6ee", mc1: "#d8f0ff", mc2: "#6aa6cc", mp: [0.015, 0, 0, 2], felt: [0, 0.12, 0.3, 0.05],
    land: ["#f4f8fb", "#dcebf5", "#ece9f8", "#d9efe6", "#f6efe2", "#e2eafa", "#fbfdff"], line: [0.1, 0.18, 0.3, 0.9], shadow: { off: [3, -4], col: [0.02, 0.08, 0.16, 0.5] }, grid: "#d8f0ff", gridA: 0.14, tropic: "#ffe9b0" });
  A.MAPSTYLES.tele = { ...A.MAPSTYLES.casino, animated: true, crt: true, swirl: ["#23262b", "#4d535b", "#8c939c"], shallow: "#7a8088", fx2: [1, 0.045, 1, 0], postGrain: 0.02, vignette: 0.62,
    land: ["#ececec", "#c9c9c9", "#dadada", "#b6b6b6", "#f4f4f4", "#c0c0c0", "#e2e2e2"], line: [0.06, 0.06, 0.07, 0.95], grid: "#c9c9c9", gridA: 0.1, tropic: "#ececec" };
  A.MAPSTYLES.cine = MS({ animated: true, oceanTop: "#6a645a", oceanBot: "#3a362f", shallow: "#7a7366", felt: [0, 0.22, 0.12, 0.08], fx2: [2, 0.035, 1, 0], vignette: 0.78,
    land: ["#e9e2d0", "#d4cab2", "#e2d8c0", "#c8bea6", "#efe8d8", "#d9cfb8", "#f4eee0"], line: [0.1, 0.08, 0.06, 0.95], shadow: { off: [3, -4], col: [0.05, 0.04, 0.02, 0.55] }, grid: "#e9e2d0", gridA: 0.1, tropic: "#e9e2d0" });
  A.MAPSTYLES.laca = MS({ mat: 14, animated: true, oceanTop: "#1b1a1f", oceanBot: "#08080a", shallow: "#1b1a1f", mc1: "#8a6424", mc2: "#f2c867", mp: [0.55, 0, 0.16, 1], felt: [0, 0.2, 0, 0.05],
    land: ["#f3efe6", "#e4dccb", "#efe2d6", "#dfe0d2", "#e9e6dc", "#efe0bc", "#fbf8f1"], line: [0.08, 0.08, 0.1, 0.95], coast: [0.85, 0.64, 0.26, 1], shadow: { off: [3, -4], col: [0, 0, 0, 0.6] }, grid: "#d9a441", gridA: 0 });
  A.MAPSTYLES.brasas = MS({ mat: 14, animated: true, oceanTop: "#1c1412", oceanBot: "#070505", shallow: "#1c1412", mc1: "#e04a1c", mc2: "#ffc04a", mp: [1.25, 0.5, 0, 1], felt: [0, 0, 0, 0.03],
    land: ["#cfc6b8", "#b8ab98", "#d8cdb6", "#a99d8c", "#c6b9a2", "#ddd2bf", "#e8e0d0"], line: [0.1, 0.05, 0.03, 0.95], shadow: { off: [3, -4], col: [0, 0, 0, 0.65] }, grid: "#ff5a1f", gridA: 0 });

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
    /* v0.3.132: las de la boutique (js/boutique.js): se compran con fichas de oro. shop: r = rara (quieta) o l = legendaria (viva) */
    ...[
      ["ruleta", "r", "Caoba|Mahogany|Acajou|Mogno|Mahagoni|Mogano||桃花心木|마호가니|マホガニー|Красное дерево|Mahoń",
        "Madera de caoba, como el borde de una ruleta, y piezas de marfil.|Mahogany, like the rim of a roulette wheel, and ivory pieces.|Du bois d'acajou, comme le bord d'une roulette, et des pièces d'ivoire.|Madeira de mogno, como a borda de uma roleta, e peças de marfim.|Mahagoni wie der Rand eines Roulettekessels und Elfenbeinsteine.|Legno di mogano, come il bordo di una roulette, e pezzi d'avorio.||桃花心木，像轮盘的边框，配象牙棋子。|룰렛 테두리 같은 마호가니 원목과 상아 말.|ルーレットの縁のようなマホガニー材と象牙の駒。|Красное дерево, как бортик рулетки, и фигуры из слоновой кости.|Mahoń jak obręcz ruletki i figury z kości słoniowej."],
      ["tablero", "r", "Tablero|Game board|Plateau de jeu|Tabuleiro|Spielbrett|Tavoliere||棋盘|게임판|盤面|Игровая доска|Plansza",
        "Madera clara de tablero y países lacados en colores.|The light wood of a game board and countries lacquered in colour.|Le bois clair d'un plateau de jeu et des pays laqués en couleurs.|Madeira clara de tabuleiro e países laqueados em cores.|Helles Holz wie ein Spielbrett und farbig lackierte Länder.|Legno chiaro da tavoliere e paesi laccati a colori.||浅色的棋盘木，各国刷着彩色亮漆。|밝은 게임판 원목과 색색으로 칠한 나라들.|明るい木の盤面と、色とりどりの漆塗りの国々。|Светлое дерево игровой доски и страны под цветным лаком.|Jasne drewno planszy i kraje lakierowane na kolorowo."],
      ["carrara", "r", "Carrara|Carrara|Carrare|Carrara|Carrara|Carrara||卡拉拉|카라라|カラーラ|Каррара|Carrara",
        "Mármol blanco de Carrara y piezas de piedra de colores.|White Carrara marble and coloured stone pieces.|Marbre blanc de Carrare et pièces de pierre colorée.|Mármore branco de Carrara e peças de pedra colorida.|Weißer Carrara-Marmor und Steine aus farbigem Gestein.|Marmo bianco di Carrara e pezzi di pietra colorata.||白色卡拉拉大理石，配彩色石头棋子。|흰 카라라 대리석과 색색의 돌 말.|白いカラーラ大理石と色石の駒。|Белый каррарский мрамор и фигуры из цветного камня.|Biały marmur z Carrary i figury z kolorowego kamienia."],
      ["nero", "r", "Mármol negro|Black marble|Marbre noir|Mármore negro|Schwarzer Marmor|Marmo nero||黑色大理石|흑대리석|黒大理石|Чёрный мрамор|Czarny marmur",
        "Mármol negro pulido y piezas de marfil.|Polished black marble and ivory pieces.|Marbre noir poli et pièces d'ivoire.|Mármore negro polido e peças de marfim.|Polierter schwarzer Marmor und Elfenbeinsteine.|Marmo nero lucidato e pezzi d'avorio.||抛光的黑色大理石，配象牙棋子。|윤이 나는 흑대리석과 상아 말.|磨き上げた黒大理石と象牙の駒。|Полированный чёрный мрамор и фигуры из слоновой кости.|Polerowany czarny marmur i figury z kości słoniowej."],
      ["pizarra", "r", "Pizarra|Chalkboard|Tableau noir|Lousa|Schiefertafel|Lavagna||黑板|칠판|黒板|Школьная доска|Tablica",
        "La pizarra del aula: fronteras de tiza y países de colores.|The classroom chalkboard: chalk borders and coloured countries.|Le tableau de la classe : frontières à la craie et pays en couleurs.|A lousa da sala de aula: fronteiras de giz e países coloridos.|Die Tafel im Klassenzimmer: Kreidegrenzen und bunte Länder.|La lavagna dell'aula: confini di gesso e paesi colorati.||教室里的黑板：粉笔画的边界，彩色的国家。|교실 칠판: 분필 국경선과 색색의 나라들.|教室の黒板。チョークの国境線と色とりどりの国。|Школьная доска: границы мелом и цветные страны.|Szkolna tablica: granice kredą i kolorowe kraje."],
      ["vegas", "r", "Las Vegas|Las Vegas|Las Vegas|Las Vegas|Las Vegas|Las Vegas||拉斯维加斯|라스베이거스|ラスベガス|Лас-Вегас|Las Vegas",
        "Neón de noche: costas cian y fronteras rosas sobre negro.|Neon at night: cyan coasts and pink borders on black.|Néon de nuit : côtes cyan et frontières roses sur fond noir.|Neon à noite: costas ciano e fronteiras rosa sobre o preto.|Neon bei Nacht: cyanfarbene Küsten und rosa Grenzen auf Schwarz.|Neon di notte: coste ciano e confini rosa sul nero.||夜晚的霓虹：黑底上的青色海岸和粉色边界。|밤의 네온: 검은 바탕에 청록 해안선과 분홍 국경선.|夜のネオン。黒地にシアンの海岸線とピンクの国境線。|Неон в ночи: бирюзовые берега и розовые границы на чёрном.|Neon nocą: błękitne wybrzeża i różowe granice na czerni."],
      ["nautica", "r", "Carta náutica|Nautical chart|Carte marine|Carta náutica|Seekarte|Carta nautica||航海图|해도|海図|Морская карта|Mapa morska",
        "Pergamino de capitán, con los rumbos de los navegantes.|A captain's parchment, with the navigators' rhumb lines.|Parchemin de capitaine, avec les routes des navigateurs.|Pergaminho de capitão, com os rumos dos navegadores.|Kapitänspergament mit den Kurslinien der Seefahrer.|Pergamena da capitano, con le rotte dei navigatori.||船长的羊皮纸，画着航海家的航向线。|선장의 양피지에 항해사들의 항로선이 그려져 있다.|船長の羊皮紙。航海者たちの航路線入り。|Капитанский пергамент с линиями румбов.|Kapitański pergamin z liniami kursów żeglarzy."],
      ["fondo", "r", "Fondo marino|Seabed|Fonds marins|Fundo do mar|Meeresgrund|Fondale marino||海底|해저|海底|Морское дно|Dno morskie",
        "El mar por capas de profundidad, de la orilla a la fosa.|The sea in layers of depth, from the shore to the trench.|La mer par couches de profondeur, du rivage à la fosse.|O mar em camadas de profundidade, da praia à fossa.|Das Meer in Tiefenschichten, vom Ufer bis zum Graben.|Il mare a strati di profondità, dalla riva alla fossa.||按深度分层的海洋，从岸边一直到海沟。|해안에서 해구까지, 깊이별로 층을 이룬 바다.|岸から海溝まで、深さごとに層になった海。|Море слоями глубины — от берега до впадины.|Morze warstwami głębokości, od brzegu po rów."],
      ["cianotipo", "r", "Plano|Blueprint|Plan d'architecte|Planta|Blaupause|Cianografia||蓝图|청사진|青図|Чертёж|Plan",
        "Papel de cianotipo, como el plano de un arquitecto.|Blueprint paper, like an architect's plan.|Papier cyanotype, comme le plan d'un architecte.|Papel de cianotipia, como a planta de um arquiteto.|Blaupausenpapier wie der Plan eines Architekten.|Carta cianografica, come il progetto di un architetto.||蓝晒纸，像建筑师的图纸。|건축가의 도면 같은 청사진 종이.|建築家の図面のような青焼きの紙。|Синька, как чертёж архитектора.|Papier cyjanotypowy, jak plan architekta."],
      ["laton", "r", "Cámara acorazada|Vault|Chambre forte|Cofre-forte|Tresorraum|Caveau||金库|금고|金庫室|Хранилище|Skarbiec",
        "Latón de caja fuerte y países de ébano.|Safe brass and ebony countries.|Laiton de coffre-fort et pays d'ébène.|Latão de cofre e países de ébano.|Tresormessing und Länder aus Ebenholz.|Ottone da cassaforte e paesi d'ebano.||保险箱的黄铜，乌木色的国家。|금고의 황동과 흑단 나라들.|金庫の真鍮と黒檀の国々。|Латунь сейфа и страны из чёрного дерева.|Mosiądz sejfu i kraje z hebanu."],
      ["moqueta", "r", "Moqueta|Casino carpet|Moquette|Carpete|Casinoteppich|Moquette||赌场地毯|카지노 카펫|カジノの絨毯|Ковёр казино|Wykładzina",
        "La moqueta granate de los casinos, con su dibujo de siempre.|The burgundy casino carpet, with its classic pattern.|La moquette grenat des casinos, avec son motif de toujours.|O carpete grená dos cassinos, com a estampa de sempre.|Der weinrote Casinoteppich mit seinem klassischen Muster.|La moquette granata dei casinò, con il suo motivo di sempre.||赌场的酒红色地毯，带着经典的花纹。|카지노의 와인빛 카펫, 늘 보던 그 무늬.|カジノでおなじみの深紅の絨毯と、あの模様。|Бордовый ковёр казино с тем самым узором.|Bordowa kasynowa wykładzina z klasycznym wzorem."],
      ["hielo", "r", "Banquisa|Pack ice|Banquise|Banquisa|Packeis|Banchisa||浮冰|유빙|流氷|Паковый лёд|Pak lodowy",
        "Hielo del Ártico: placas blancas sobre agua fría.|Arctic ice: white floes on cold water.|Glace arctique : plaques blanches sur une eau froide.|Gelo do Ártico: placas brancas sobre água fria.|Arktisches Eis: weiße Schollen auf kaltem Wasser.|Ghiaccio artico: lastre bianche sull'acqua fredda.||北极的冰：冰冷海水上的白色浮冰。|북극의 얼음: 차가운 물 위의 하얀 얼음판.|北極の氷。冷たい海に浮かぶ白い氷盤。|Арктический лёд: белые льдины на холодной воде.|Arktyczny lód: białe kry na zimnej wodzie."],
      ["tele", "l", "Tele de tubo|Tube TV|Télé cathodique|TV de tubo|Röhrenfernseher|TV a tubo||显像管电视|브라운관 TV|ブラウン管テレビ|Ламповый телевизор|Telewizor kineskopowy",
        "Blanco y negro, con su remolino y la pantalla de tubo encendida.|Black and white, with its swirl and the tube screen switched on.|Noir et blanc, avec son tourbillon et l'écran cathodique allumé.|Preto e branco, com seu redemoinho e a tela de tubo ligada.|Schwarzweiß, mit Wirbel und eingeschaltetem Röhrenbildschirm.|In bianco e nero, con il suo vortice e lo schermo a tubo acceso.||黑白画面，漩涡转动，显像管屏幕亮着。|흑백 화면에 소용돌이, 켜진 브라운관.|白黒の画面に渦、点いたままのブラウン管。|Чёрно-белое, с вихрем и включённым кинескопом.|Czarno-biały, z wirem i włączonym ekranem kineskopowym."],
      ["cine", "l", "Noticiario|Newsreel|Actualités|Cinejornal|Wochenschau|Cinegiornale||新闻片|뉴스릴|ニュース映画|Кинохроника|Kronika filmowa",
        "Película antigua en sepia: parpadeo, rayas y motas de polvo.|Old sepia film: flicker, scratches and specks of dust.|Vieux film sépia : scintillement, rayures et poussières.|Filme antigo em sépia: cintilação, riscos e grãos de poeira.|Alter Sepiafilm: Flackern, Kratzer und Staubkörner.|Vecchia pellicola seppia: sfarfallio, graffi e granelli di polvere.||老式棕褐色胶片：闪烁、划痕和灰尘斑点。|오래된 세피아 필름: 깜빡임, 긁힘, 먼지 얼룩.|古いセピアのフィルム。ちらつき、傷、ほこり。|Старая плёнка в сепии: мерцание, царапины и пылинки.|Stary film w sepii: migotanie, rysy i drobinki kurzu."],
      ["laca", "l", "Laca de oro|Gold lacquer|Laque d'or|Laca de ouro|Goldlack|Lacca d'oro||金漆|금칠|金蒔絵|Золотой лак|Złoty lakier",
        "Laca negra: el oro rodea cada costa y un reflejo la recorre.|Black lacquer: gold rims every coast and a gleam sweeps across it.|Laque noire : l'or borde chaque côte et un reflet la parcourt.|Laca preta: o ouro contorna cada costa e um reflexo a percorre.|Schwarzer Lack: Gold säumt jede Küste, ein Glanz gleitet darüber.|Lacca nera: l'oro orla ogni costa e un riflesso la percorre.||黑漆：金色勾勒每一道海岸，一道光泽从上面扫过。|검은 옻칠: 해안선마다 금빛이 두르고 광택이 지나간다.|黒漆。海岸線を金が縁取り、光沢が走る。|Чёрный лак: золото обводит каждый берег, и по нему скользит блик.|Czarny lakier: złoto obrysowuje każde wybrzeże, a po nim przesuwa się połysk."],
      ["brasas", "l", "Brasas|Embers|Braises|Brasas|Glut|Brace||余烬|잉걸불|熾火|Угли|Żar",
        "Ceniza y brasas: la lava respira bajo cada costa.|Ash and embers: lava breathes under every coast.|Cendres et braises : la lave respire sous chaque côte.|Cinzas e brasas: a lava respira sob cada costa.|Asche und Glut: Lava atmet unter jeder Küste.|Cenere e brace: la lava respira sotto ogni costa.||灰烬与余火：熔岩在每一道海岸下呼吸。|재와 잉걸불: 해안선마다 용암이 숨 쉰다.|灰と熾火。海岸線の下で溶岩が息づく。|Пепел и угли: лава дышит под каждым берегом.|Popiół i żar: lawa oddycha pod każdym wybrzeżem."],
    ].map(([id, r, n, d]) => ({ id, shop: r, n, d, own: P => !!(P.mesas && P.mesas.own && P.mesas.own[id]) })),
  ];
  const prof = () => A.profile.get();
  const mem = () => { const P = prof(); if (!P.mesas || typeof P.mesas !== "object" || Array.isArray(P.mesas)) P.mesas = { use: "casino", seen: {} }; if (!P.mesas.seen || typeof P.mesas.seen !== "object") P.mesas.seen = {};
    if (!P.mesas.own || typeof P.mesas.own !== "object") P.mesas.own = {}; return P.mesas; };
  const fill = (s, n) => A.pick6(s).replace("{n}", n);
  /* la boutique: precio en fichas de oro (rara 150, legendaria 400) y la oferta de la casa: una mesa que aun no tienes, -30 %, que cambia cada lunes */
  const PRICE = { r: 150, l: 400 }, OFF = 0.3;
  const SHOP_HOW = "En la tienda del Club: {n} fichas de oro.|In the Club boutique: {n} gold chips.|À la boutique du Club : {n} jetons d'or.|Na boutique do Clube: {n} fichas de ouro.|In der Club-Boutique: {n} Goldchips.|Nella boutique del Club: {n} fiche d'oro.||在俱乐部精品店：{n} 金筹码。|클럽 부티크에서: 골드 칩 {n}개.|クラブのブティックで金のチップ{n}枚。|В бутике клуба: {n} золотых фишек.|W butiku klubu: {n} złotych żetonów.";
  const SHOP_WON = "Comprada en la tienda del Club.|Bought in the Club boutique.|Achetée à la boutique du Club.|Comprada na boutique do Clube.|In der Club-Boutique gekauft.|Comprata nella boutique del Club.||在俱乐部精品店购得。|클럽 부티크에서 구입했어요.|クラブのブティックで購入。|Куплен в бутике клуба.|Kupiony w butiku klubu.";
  const weekNo = (t = Date.now()) => Math.floor((t / 864e5 + 3) / 7);       // semanas que empiezan en lunes (el 1-1-1970 fue jueves)
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
    how: id => { const m = A.mesas.get(id); return m.shop ? fill(SHOP_HOW, A.fmt ? A.fmt(A.mesas.price(id)) : A.mesas.price(id)) : m.asc ? fill(ASC_HOW, m.asc) : fill(m.how, classic().length); },
    won: id => { const m = A.mesas.get(id); return m.shop ? A.pick6(SHOP_WON) : m.asc ? fill(ASC_WON, m.asc) : A.pick6(m.won || ""); },
    /* ---- la boutique (js/boutique.js) */
    shop: () => A.MESAS.filter(m => m.shop),
    tier: id => A.mesas.get(id).shop || "",
    full: id => PRICE[A.mesas.get(id).shop] || 0,
    price: id => { const f = A.mesas.full(id), o = A.mesas.offer(); return o && o.id === id && !A.mesas.owned(id) ? Math.round(f * (1 - OFF) / 10) * 10 : f; },
    /* la oferta de la semana: se elige el lunes entre las que aun no tienes y se queda toda la semana (si la compras, la semana sigue con ella) */
    offer() {
      const s = mem(), w = weekNo();
      if (!s.offer || s.offer.w !== w || !A.MAPSTYLES[s.offer.id]) {
        const left = A.mesas.shop().filter(m => !A.mesas.owned(m.id));
        if (!left.length) return null;
        const h = A.rank && A.rank.hash ? A.rank.hash(prof().id + ":oferta:" + w) : w * 7919;
        s.offer = { w, id: left[h % left.length].id }; A.profile.save();
      }
      return { id: s.offer.id, off: OFF, until: (w + 1) * 7 * 864e5 - 3 * 864e5 };
    },
    /* compra: cobra las fichas de oro (A.club.spend) y la mesa es tuya; el estreno lo hace la portada al volver (A.mesas.fresh) */
    buy(id) {
      const m = A.mesas.get(id); if (!m.shop || A.mesas.owned(id) || !A.club || !A.club.spend) return false;
      if (!A.club.spend(A.mesas.price(id))) return false;
      mem().own[id] = Date.now(); A.profile.save(); return true;
    },
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
