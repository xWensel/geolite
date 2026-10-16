/*
 * Geolite - LOS PUNTEROS DE LA CASA (maqueta «Punteros de la casa», 2026-10-16): cuatro piezas sueltas que se compran en la tienda (seccion
 * Punteros) con fichas de oro y se combinan como el vestuario del crupier.
 *   Reticulo   el que mueves por el mapa (js/pointer.js). Cambia la forma y el adorno; los avisos se conservan SIEMPRE: tierra en su color calido y
 *              mar en el frio, esquinas rojas con un reto y turquesas con una ventaja, herramientas y la chincheta del centro.
 *   Chincheta  la tuya al responder (js/map.js), al pixel: 16 x 24 a x2 con la punta en el sitio. La roja del lugar no cambia nunca.
 *   Linea      de tu chincheta al lugar (js/map.js).
 *   Diana      al clavar el lugar SUSTITUYE a los anillos que laten en el objetivo: a su misma distancia (unos 60 px) y con su mismo compas.
 *   En el Duelo con un amigo, tu chincheta sustituye a tu ficha y tu rival la ve: la sala guarda tu estilo (api/duelo.js, campo «c»).
 * Estado: P.ptr = { own: { "ret:ficha": 1, ... }, wear: { ret, pin, lin, dia } }. Lo «de la casa» es gratis y siempre tuyo.
 *   A.punteros.ret()                      el reticulo puesto (tambien el de la casa); .corners() y .centerPin() son los de js/pointer.js
 *   A.punteros.pinCanvas(id) / line(...) / diana(...)   dibujos para el mapa
 *   A.punteros.code() / parse(code)       el estilo en una cadena corta («oro.hilo.onda»), para el Duelo
 *   A.punteros.thumb(cv, slot, id, t)     la miniatura animada de la tienda
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const INK = "#16241c", GOLD = "#f8b449", GOLD2 = "#ffe08a", TEAL = "#5fd6b8", RED = "#fe5f55", WHITE = "#fff7e6", PAPER = "#f2e9d6";
  const P6 = s => A.pick6(s);
  const SLOTS = ["ret", "pin", "lin", "dia"];
  const TX = {
    ret: "Retículo|Reticle|Réticule|Retícula|Fadenkreuz|Mirino||准星|조준선|照準|Прицел|Celownik",
    pin: "Chincheta|Pin|Punaise|Alfinete|Pin|Puntina||图钉|핀|ピン|Булавка|Pinezka",
    lin: "Línea|Line|Ligne|Linha|Linie|Linea||连线|선|ライン|Линия|Linia",
    dia: "Diana|Bullseye|Dans le mille|Na mosca|Volltreffer|Centro||正中靶心|명중|命中|В яблочко|Dziesiątka",
    retP: "Retículos|Reticles|Réticules|Retículas|Fadenkreuze|Mirini||准星|조준선|照準|Прицелы|Celowniki",
    pinP: "Chinchetas|Pins|Punaises|Alfinetes|Pins|Puntine||图钉|핀|ピン|Булавки|Pinezki",
    linP: "Líneas|Lines|Lignes|Linhas|Linien|Linee||连线|선|ライン|Линии|Linie",
    diaP: "Dianas|Bullseyes|Dans le mille|Na mosca|Volltreffer|Centri||靶心特效|명중 효과|命中エフェクト|Яблочко|Dziesiątki",
    retD: "El retículo que mueves por el mapa. Conserva sus avisos: color cálido sobre tierra, frío sobre el mar, esquinas rojas con un reto y turquesas con una ventaja.|The reticle you move across the map. It keeps its signals: a warm colour over land, a cool one over sea, red corners with a challenge and teal ones with an advantage.|Le réticule que tu déplaces sur la carte. Il garde ses signaux : couleur chaude sur terre, froide sur la mer, coins rouges avec un défi et turquoise avec un avantage.|A retícula que você move pelo mapa. Mantém seus avisos: cor quente sobre a terra, fria sobre o mar, cantos vermelhos com um desafio e turquesa com uma vantagem.|Das Fadenkreuz, das du über die Karte bewegst. Seine Signale bleiben: warme Farbe über Land, kühle über dem Meer, rote Ecken bei einer Herausforderung, türkise bei einem Vorteil.|Il mirino che muovi sulla mappa. Mantiene i suoi segnali: colore caldo sulla terra, freddo sul mare, angoli rossi con una sfida e turchesi con un vantaggio.||你在地图上移动的准星。提示保持不变：陆地上暖色、海上冷色，有挑战时角落为红色，有加成时为青绿色。|지도 위를 움직이는 조준선. 신호는 그대로예요. 땅 위에선 따뜻한 색, 바다 위에선 차가운 색, 도전이 있으면 모서리가 빨강, 이점이 있으면 청록.|マップ上で動かす照準。合図はそのまま：陸では暖色、海では寒色、挑戦中は角が赤、有利な効果は青緑。|Прицел, который ты водишь по карте. Сигналы остаются: тёплый цвет над сушей, холодный над морем, красные углы при испытании и бирюзовые при преимуществе.|Celownik, który przesuwasz po mapie. Sygnały zostają: ciepły kolor nad lądem, zimny nad morzem, czerwone rogi przy wyzwaniu i turkusowe przy przewadze.",
    pinD: "Tu chincheta al responder. La del lugar sigue siendo roja.|Your pin when you answer. The one marking the place stays red.|Ta punaise quand tu réponds. Celle du lieu reste rouge.|Seu alfinete ao responder. O do lugar continua vermelho.|Dein Pin beim Antworten. Der Pin des Ortes bleibt rot.|La tua puntina quando rispondi. Quella del luogo resta rossa.||你作答时的图钉。地点的图钉仍是红色。|답할 때 꽂는 내 핀. 장소 핀은 그대로 빨강이에요.|答えるときのきみのピン。場所のピンは赤いまま。|Твоя булавка при ответе. Булавка места остаётся красной.|Twoja pinezka przy odpowiedzi. Pinezka miejsca zostaje czerwona.",
    linD: "La línea que va de tu chincheta al lugar.|The line from your pin to the place.|La ligne de ta punaise jusqu'au lieu.|A linha do seu alfinete até o lugar.|Die Linie von deinem Pin zum Ort.|La linea dalla tua puntina al luogo.||从你的图钉连到地点的线。|내 핀에서 장소까지 이어지는 선.|きみのピンから場所までの線。|Линия от твоей булавки до места.|Linia od twojej pinezki do miejsca.",
    diaD: "Lo que salta cuando clavas el lugar, en vez de los anillos.|What bursts out when you nail the place, instead of the rings.|Ce qui jaillit quand tu vises juste, à la place des anneaux.|O que salta quando você crava o lugar, no lugar dos anéis.|Was hervorspringt, wenn du den Ort genau triffst – statt der Ringe.|Ciò che esplode quando fai centro sul luogo, al posto degli anelli.||精准命中地点时迸发的特效，取代原本的光环。|장소를 정확히 맞혔을 때 고리 대신 터지는 효과.|場所を当てたとき、輪の代わりに弾ける演出。|То, что вспыхивает, когда попадаешь точно в место, вместо колец.|To, co wyskakuje, gdy trafisz dokładnie w miejsce, zamiast pierścieni.",
  };
  const N = {
    casa: "De la casa|House|De la maison|Da casa|Hausmarke|Della casa||本店原装|하우스|定番|Фирменный|Firmowy",
    ficha: "La ficha|The chip|Le jeton|A ficha|Der Chip|La fiche||筹码|칩|チップ|Фишка|Żeton",
    brujula: "La brújula|The compass|La boussole|A bússola|Der Kompass|La bussola||罗盘|나침반|コンパス|Компас|Kompas",
    rombo: "El rombo|The diamond|Le carreau|O losango|Die Raute|Il rombo||方块|다이아|ダイヤ|Ромб|Romb",
    mira: "La mira|The scope|La lunette|A mira|Das Zielfernrohr|Il cannocchiale||瞄准镜|스코프|スコープ|Оптика|Luneta",
    neon: "Neón|Neon|Néon|Neon|Neon|Neon||霓虹|네온|ネオン|Неон|Neon",
    dado: "El dado|The die|Le dé|O dado|Der Würfel|Il dado||骰子|주사위|サイコロ|Кубик|Kostka",
    oro: "La de oro|Gold pin|La dorée|A dourada|Goldpin|Quella d'oro||金图钉|골드 핀|金のピン|Золотая|Złota",
    laton: "La de latón|Brass pin|En laiton|A de latão|Messingpin|Quella d'ottone||黄铜图钉|황동 핀|真鍮のピン|Латунная|Mosiężna",
    hilo: "El hilo rojo|The red thread|Le fil rouge|O fio vermelho|Der rote Faden|Il filo rosso||红线|빨간 실|赤い糸|Красная нить|Czerwona nić",
    tesoro: "El mapa del tesoro|Treasure map|La carte au trésor|O mapa do tesouro|Die Schatzkarte|La mappa del tesoro||藏宝图|보물 지도|宝の地図|Карта сокровищ|Mapa skarbów",
    fichas: "Rastro de fichas|Chip trail|Traînée de jetons|Rastro de fichas|Chipspur|Scia di fiche||筹码轨迹|칩 자국|チップの跡|Дорожка из фишек|Ślad żetonów",
    rayo: "El rayo|Lightning|L'éclair|O raio|Der Blitz|Il fulmine||闪电|번개|稲妻|Молния|Błyskawica",
    lluvia: "Lluvia de fichas|Chip shower|Pluie de jetons|Chuva de fichas|Chipregen|Pioggia di fiche||筹码雨|칩 소나기|チップの雨|Дождь фишек|Deszcz żetonów",
    naipes: "Naipes al aire|Cards in the air|Cartes en l'air|Cartas no ar|Karten in der Luft|Carte in aria||纸牌飞舞|날아가는 카드|舞うトランプ|Карты в воздухе|Karty w powietrzu",
    onda: "La onda de oro|Golden wave|L'onde d'or|A onda de ouro|Goldene Welle|L'onda d'oro||金色波纹|황금 파동|金の波紋|Золотая волна|Złota fala",
    sello: "El sello|The stamp|Le tampon|O carimbo|Der Stempel|Il timbro||印章|도장|スタンプ|Штамп|Pieczątka",
  };

  /* ---------------------------------------------------------------- pixel art: circulos y discos como los del reticulo de siempre */
  function circ(px, cx, cy, r, col) { let x = r, y = 0, e = 1 - r; while (x >= y) { for (const [a, b] of [[x, y], [y, x], [-x, y], [-y, x], [x, -y], [y, -x], [-x, -y], [-y, -x]]) px(cx + a, cy + b, col); y++; if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; } } }
  function disc(px, cx, cy, r, col) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * .8) px(cx + x, cy + y, col); }
  function arcp(px, cx, cy, r, a0, a1, col) { for (let a = a0; a < a1; a += .04) px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, col); }

  /* ---------------------------------------------------------------- LOS RETICULOS: lo mas premium del juego, SIMETRICOS AL PIXEL.
     Cada forma depende solo de |x| e |y| respecto al centro (el pixel 32, 32), asi que sale igual a izquierda y derecha, arriba y abajo. La forma
     reparte papeles y al pintar se vuelven colores con el color de tierra o de mar de ese momento:
       con contorno (MAYUSCULA): M color, L luz, D sombra, W blanco, R y Q la punta norte de la brujula, V el lomo de las otras
       sin contorno (minuscula): m tubo, n nucleo, a y b halos del neon; f cara del dado; k sus pepitas
     El contorno (tinta) se pone solo alrededor de lo que lo lleva. La luz viene de arriba (brilla la cara de fuera del aro arriba y la de dentro
     abajo) y el destello baja por los dos lados a la vez: nada gira, nada se tuerce. Las rejillas se guardan por forma y radio */
  const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const isHex = h => /^#[0-9a-f]{6}$/i.test(h);
  const mixC = (a, b, k) => { if (!isHex(a)) return a; const A1 = hexRGB(a), B1 = hexRGB(b); return "#" + A1.map((v, i) => Math.round(v + (B1[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
  const alphaC = (a, k) => { if (!isHex(a)) return a; const A1 = hexRGB(a); return `rgba(${A1[0]},${A1[1]},${A1[2]},${k})`; };
  const TONES = {};
  const tones = col => TONES[col] || (TONES[col] = { M: col, L: mixC(col, WHITE, .5), D: mixC(col, INK, .3), W: WHITE, R: "#ff4f45", Q: "#ff9d90", V: "#e3d2ae", O: INK,
    m: col, n: mixC(col, "#ffffff", .7), a: alphaC(col, .42), b: alphaC(col, .16), f: alphaC(col, .22), k: INK, G: GOLD2, S: mixC(col, "#ffffff", .8) });
  const fold = (ax, ay) => (ax >= ay ? [ax, ay] : [ay, ax]);           // al octante: u >= v
  const band2 = (out, y) => (out ? (y < 0 ? "L" : "M") : (y > 0 ? "L" : "M"));   // banda de 2 px con la luz de arriba
  const SHAPE = {
    /* el de siempre: aro de 2 px y cuatro muescas hacia dentro */
    casa(ax, ay, d, y, r) { const [u, v] = fold(ax, ay);
      if (v === 0 && u >= r - 6 && u <= r) return "M";
      return d >= r - 1.5 && d < r + .5 ? band2(d >= r - .5, y) : 0; },
    /* la ficha: canto de 6 px con 8 incrustaciones blancas (4 en los ejes y 4 en las diagonales) y el filete de dentro */
    ficha(ax, ay, d, y, r) { const [u, v] = fold(ax, ay), ph = Math.atan2(v, u) * 57.29578;
      if (d >= r - 4.5 && d < r + 1.5) return ph < 7.6 || ph > 37.4 ? "W" : (d >= r + .5 && y < 0) || (d < r - 3.5 && y > 0) ? "L" : "M";
      return d >= r - 6.5 && d < r - 5.5 ? "L" : 0; },
    /* la brujula: cuatro puntas largas (la del norte roja, con su lomo), cuatro cortas en las diagonales y el aro */
    brujula(ax, ay, d, y, r) { const [u, v] = fold(ax, ay), Lc = r + 8;
      if (u >= 4 && u <= Lc) { const w = u <= 7 ? Math.round((u - 4) * 2 / 3) + 1 : Math.round(3 * (Lc - u) / (Lc - 7));
        if (v <= w) { const north = y < 0 && ay > ax; return v === 0 ? (north ? "Q" : "V") : north ? "R" : "W"; } }
      const sd = (u + v) / Math.SQRT2, pd = (u - v) / Math.SQRT2, Ld = r - 3;
      if (sd >= 4.2 && sd <= Ld && pd <= (sd <= 6.5 ? 1.25 : 2.3 * (Ld - sd) / (Ld - 6.5) + .3)) return "M";
      return d >= r - 1.5 && d < r + .5 ? band2(d >= r - .5, y) : 0; },
    /* el rombo: banda de tres diagonales (la de fuera brilla arriba, la de dentro abajo) y el rombo pequeno de dentro */
    rombo(ax, ay, d, y, r) { const sm = ax + ay, D = r + 3;
      if (sm >= D - 2 && sm <= D) return sm === D ? (y < 0 ? "L" : "M") : sm === D - 2 && y > 0 ? "L" : "M";
      return sm >= 7 && sm <= 9 ? "W" : 0; },
    /* la mira: aro fino, hilos finos con dos marcas de telemetro y postes gruesos fuera del aro */
    mira(ax, ay, d, y, r) { const [u, v] = fold(ax, ay), R2 = r + 1;
      if (v <= 1 && u >= R2 + 2 && u <= R2 + 8) return "M";
      if (v <= 1 && (u === 11 || u === 15) && u < R2 - 2) return "W";
      if (v === 0 && u >= 7 && u <= R2 - 2) return "M";
      return d >= R2 - .5 && d < R2 + .5 ? "M" : 0; },
    /* el neon: tubo de 3 px con su nucleo encendido y dos halos */
    neon(ax, ay, d, y, r) { r -= 1;
      if (d >= r - 1.5 && d < r - .5) return "n";
      if (d >= r - 2.5 && d < r + .5) return "m";
      if (d >= r - 4.5 && d < r + 2.5) return "a";
      return d >= r - 6 && d < r + 4 ? "b" : 0; },
    /* el dado: canto de 3 px con esquinas redondas (luz arriba, sombra abajo), cara translucida y cuatro pepitas (la quinta es la chincheta roja) */
    dado(ax, ay, d, y, r) { const H = r - 1, rc = 5, inS = q => { const c0 = q - rc; return ax <= q && ay <= q && (ax <= c0 || ay <= c0 || Math.hypot(ax - c0, ay - c0) <= rc + .35); };
      if (!inS(H)) return 0;
      if (!inS(H - 3)) return inS(H - 1) || ax >= ay ? "M" : y < 0 ? "L" : "D";
      return Math.hypot(ax - 8, ay - 8) <= 2.4 ? "k" : "f"; },
    /* las esquinas de la mira (brazos de 6) y el segundo aro de la Mano firme */
    _esq(ax, ay, d, y, B) { return (ax === B && ay >= B - 5 && ay <= B) || (ay === B && ax >= B - 5 && ax <= B) ? "M" : 0; },
    _firme(ax, ay, d, y, r) { return d >= r + 2.5 && d < r + 3.5 ? "G" : 0; },
    _onda3(ax, ay, d, y, r) { return d >= r - 2.5 && d < r + .5 ? (d >= r - .5 ? "M" : "L") : 0; },
    _onda2(ax, ay, d, y, r) { return d >= r - 1.5 && d < r + .5 ? "M" : 0; },
  };
  const GRIDS = {}, NB = [[1, 0], [-1, 0], [0, 1], [0, -1]], KEY = (x, y) => (x + 40) * 100 + y + 40;
  function grid(id, r) {
    const gk = id + r; if (GRIDS[gk]) return GRIDS[gk];
    const f = SHAPE[id], E = 31, at = new Map();
    for (let y = -E; y <= E; y++) for (let x = -E; x <= E; x++) { const v = f(Math.abs(x), Math.abs(y), Math.hypot(x, y), y, r); if (v) at.set(KEY(x, y), v); }
    const ink = [];
    for (let y = -E; y <= E; y++) for (let x = -E; x <= E; x++) if (!at.has(KEY(x, y)) && NB.some(([a, b]) => { const v = at.get(KEY(x + a, y + b)); return v && v < "a"; })) ink.push(KEY(x, y));
    ink.forEach(k => at.set(k, "O"));
    const out = []; at.forEach((v, k) => { const x = Math.floor(k / 100) - 40, y = (k % 100) - 40; out.push([x, y, v, Math.atan2(Math.abs(x), -y) / Math.PI]); });
    return (GRIDS[gk] = out);
  }
  const SHINE = new Set(["M", "L", "W", "V", "m", "n"]);
  function paint(id, px, t, cx, cy, R, col, o) {
    const r = Math.max(6, Math.round(R)), T = tones(col), ph = (t % 3.4) / 1.3, g = ph < 1 ? -.1 + ph * 1.2 : null;   // el destello baja cada 3,4 s
    const off = id === "neon" && Math.sin(t * 9) + Math.sin(t * 13.7) > 1.7;                                     // el neon tartamudea entero
    for (const [x, y, v, a] of grid(id, r)) {
      let c = T[v];
      if (off && (v === "n" || v === "a" || v === "b")) c = v === "n" ? T.m : null;
      if (c && g !== null && SHINE.has(v) && Math.abs(a - g) < .055) c = T.S;
      if (c) px(cx + x, cy + y, c);
    }
    if (o && o.steady) for (const [x, y, v] of grid("_firme", r)) px(cx + x, cy + y, v === "O" ? INK : GOLD2);
  }
  const skin = (id, land, sea, p) => ({ id, p, land, sea, ring: (px, t, cx, cy, R, col, o) => paint(id, px, t, cx, cy, R, col, o) });
  const RET = {
    ficha: skin("ficha", "#e8a43a", "#3fb8a0", 200),
    brujula: skin("brujula", GOLD, TEAL, 200),
    rombo: skin("rombo", "#f0605a", "#4fb8e8", 200),
    mira: skin("mira", GOLD2, "#9ff0ff", 200),
    neon: skin("neon", "#ff5fae", "#56f0ff", 300),
    dado: skin("dado", "#fff3d6", "#cfe9ff", 200),
  };
  const CASA = skin("casa", GOLD, TEAL, 0);                            // el de siempre, con el mismo dibujo limpio
  /* las esquinas: rojas con un reto en su eje, turquesas con una ventaja; cols = un color o [arriba-izq, arriba-dcha, abajo-dcha, abajo-izq] */
  function corners(px, cx, cy, B, cols) {
    const q = Array.isArray(cols) ? cols : [cols, cols, cols, cols];
    for (const [x, y, v] of grid("_esq", B)) px(cx + x, cy + y, v === "O" ? INK : q[y < 0 ? (x < 0 ? 0 : 1) : x < 0 ? 3 : 2]);
  }
  /* la chincheta del centro: rombo rojo con su contorno y el brillo en el eje (simetrico) */
  const PINPX = [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
  function centerPin(px, cx, cy) { for (const [a, b] of PINPX) for (const [oa, ob] of NB) px(cx + a + oa, cy + b + ob, INK); for (const [a, b] of PINPX) px(cx + a, cy + b, RED); px(cx, cy - 1, "#ffc2b8"); }

  /* ---------------------------------------------------------------- LAS CHINCHETAS: 16 x 24, simetricas sobre la columna 8, la de la punta (que cae
     en el pixel 8, 23). El mismo sistema que los reticulos: la forma da papeles en |x - 8| e y, el contorno se pone solo alrededor de lo que lo lleva
     (MAYUSCULA) y la luz viene de arriba. La aguja (minuscula) va sin contorno */
  function pinArt(f, pal) {
    const at = {}, K = (x, y) => x + "," + y;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 16; x++) { const v = f(Math.abs(x - 8), y); if (v) at[K(x, y)] = v; }
    const ink = [];
    for (let y = 0; y < 24; y++) for (let x = 0; x < 16; x++) if (!at[K(x, y)] && NB.some(([a1, b1]) => { const v = at[K(x + a1, y + b1)]; return v && v < "a"; })) ink.push(K(x, y));
    ink.forEach(k => { at[k] = "O"; });
    return px => { for (const k in at) { const [x, y] = k.split(",").map(Number); px(x, y, at[k] === "O" ? INK : pal[at[k]]); } };
  }
  const STEEL = { n: "#eef1f8", s: "#8a90a4" };
  const needleAt = (ax, y, y0) => (y >= y0 && y <= 22 && ax <= 1 ? (ax === 0 ? "n" : "s") : y === 23 && ax === 0 ? "n" : 0);
  const PIN = {
    /* la de oro: gota de mapa con su ojo blanco, brillo arriba y sombra hacia la punta */
    oro: { p: 120, draw: pinArt((ax, y) => {
      const hd = Math.hypot(ax, y - 7), cone = y >= 7 && y <= 22 && ax <= 6.3 * (1 - (y - 7) / 15) + .2;
      if (hd > 6.3 && !cone) return 0;
      if (hd <= 2.3) return "w";
      if (hd <= 3.2) return "k";
      if (y <= 3 && ax <= 2) return "L";
      return y >= 15 ? "D" : "M"; }, { M: "#f5a623", L: "#ffd98a", D: "#c9760f", k: "#6b3410", w: "#fff7e6" }) },
    /* la ficha: una ficha de casino clavada, con su canto de cuatro incrustaciones blancas y el centro crema */
    ficha: { p: 120, draw: pinArt((ax, y) => {
      const nd = needleAt(ax, y, 14); if (nd) return nd;
      const hd = Math.hypot(ax, y - 7); if (hd > 6.4) return 0;
      const [u, v] = fold(ax, Math.abs(y - 7)), ph = Math.atan2(v, u) * 57.29578;
      if (hd > 4.4) return v <= 1 && u >= 5 ? "W" : "M";
      if (hd > 3.4) return "D";
      return y <= 6 ? "L" : "C"; }, { M: "#d8283f", D: "#8f1426", W: WHITE, C: "#ffd98a", L: "#fff0c2", ...STEEL }) },
    /* la de laton: alfiler de cabeza de bola, con su brillo arriba, su sombra abajo y el cuello */
    laton: { p: 120, draw: pinArt((ax, y) => {
      const nd = needleAt(ax, y, 13); if (nd) return nd;
      if (y === 12 && ax <= 1) return "D";
      const hd = Math.hypot(ax, y - 6.5); if (hd > 5.6) return 0;
      if (y === 3 && ax === 0) return "W";
      if (y <= 5 && hd <= 4.2) return "L";
      return y >= 8 && hd > 3.4 ? "D" : "M"; }, { M: "#f2b33d", L: "#ffe08a", D: "#b8741a", W: "#fff7e6", ...STEEL }) },
  };
  const pinCache = {};
  function pinCanvas(id) {
    if (!PIN[id]) return null;
    if (!pinCache[id]) { const cv = document.createElement("canvas"); cv.width = 16; cv.height = 24; const c = cv.getContext("2d"); PIN[id].draw((x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); }); pinCache[id] = cv; }
    return pinCache[id];
  }

  /* ---------------------------------------------------------------- LAS LINEAS: de a (tu chincheta) a b (el lugar), e = cuanto se ha trazado (0-1).
     PIXEL ART como el resto: el trazo se recorre en pixeles de arte de k pixeles reales (2 a 100 %), alineados a la rejilla, y cada punto lleva su
     contorno (primero toda la tinta, despues el color): una escalera nitida, sin suavizado */
  const seg = (c, a, b, e) => { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e); c.stroke(); };   // la de la casa (vector, la de siempre)
  const CHIPC = ["#d8283f", "#3f86e8", "#22a85a", "#f5a623"];
  function linBegin(c, o) { const dp = o && o.k ? 1 : (o && o.dpr) || 1, k = (o && o.k) || Math.max(2, Math.round(2 * dp)); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; return { dp, k }; }
  /* los puntos de arte (enteros, sin repetir) de un camino f(u) -> [x, y] en pixeles del contexto, u de 0 a e */
  function artPath(f, e, dp, k, L) { const out = [], n = Math.max(2, Math.ceil(L * dp / k * 2)); let last = "";
    for (let i = 0; i <= n * e; i++) { const q = f(i / n), x = Math.round(q[0] * dp / k), y = Math.round(q[1] * dp / k), key = x + "," + y; if (key !== last) { out.push([x, y]); last = key; } }
    return out; }
  function strokeArt(c, pts, k, col, on) { c.fillStyle = INK; pts.forEach((q, i) => { if (!on || on(i)) c.fillRect((q[0] - 1) * k, (q[1] - 1) * k, 3 * k, 3 * k); }); c.fillStyle = col; pts.forEach((q, i) => { if (!on || on(i)) c.fillRect(q[0] * k, q[1] * k, k, k); }); }
  const LIN = {
    /* el hilo rojo: cuelga en curva, como un hilo de verdad */
    hilo: { p: 100, draw(c, a, b, e, o) { const { dp, k } = linBegin(c, o), L = Math.hypot(b[0] - a[0], b[1] - a[1]), mx = (a[0] + b[0]) / 2, my = Math.max(a[1], b[1]) + L * .12;
      strokeArt(c, artPath(u => [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * mx + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * my + u * u * b[1]], e, dp, k, L * 1.1), k, "#e0303f"); c.restore(); } },
    /* el mapa del tesoro: a trazos, y la X roja en el lugar */
    tesoro: { p: 100, draw(c, a, b, e, o) { const { dp, k } = linBegin(c, o), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      strokeArt(c, artPath(u => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], e, dp, k, L), k, "#c47a2c", i => i % 11 < 7);
      if (e >= 1) { const X = Math.round(b[0] * dp / k), Y = Math.round(b[1] * dp / k), x = []; for (let d = -3; d <= 3; d++) x.push([X + d, Y + d], [X + d, Y - d]); strokeArt(c, x, k, "#e0303f"); }
      c.restore(); } },
    /* el rastro de fichas: fichas de frente, cada 12 pixeles de arte */
    fichas: { p: 120, draw(c, a, b, e, o) { const { dp, k } = linBegin(c, o), L = Math.hypot(b[0] - a[0], b[1] - a[1]) * dp / k, n = Math.max(2, Math.floor(L / 12));
      for (let i = 1; i < n * e; i++) { const u = i / n, X = Math.round((a[0] + (b[0] - a[0]) * u) * dp / k), Y = Math.round((a[1] + (b[1] - a[1]) * u) * dp / k); c.drawImage(chipSpr(CHIPC[i % 4], 4), (X - 5) * k, (Y - 5) * k, 11 * k, 11 * k); }
      c.restore(); } },
    /* el rayo: zigzag amarillo con su contorno */
    rayo: { p: 150, draw(c, a, b, e, o) { const { dp, k } = linBegin(c, o), L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, n = Math.max(4, Math.floor(L * dp / k / 13)), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
      const P = []; for (let i = 0; i <= n; i++) { const t = i / n, w = (i === 0 || i === n ? 0 : i % 2 ? 7 : -7) * k / dp; P.push([a[0] + (b[0] - a[0]) * t + nx * w, a[1] + (b[1] - a[1]) * t + ny * w]); }
      const f = u => { const x = u * n, i = Math.min(n - 1, Math.floor(x)), r = x - i; return [P[i][0] + (P[i + 1][0] - P[i][0]) * r, P[i][1] + (P[i + 1][1] - P[i][1]) * r]; };
      strokeArt(c, artPath(f, e, dp, k, L * 1.3), k, "#ffd95a"); c.restore(); } },
  };

  /* ---------------------------------------------------------------- LAS DIANAS: t = segundos desde que empieza (dura ~1,2 s), sin pasar de ~60 px
     del lugar (la distancia de los anillos). parts: las piezas que saltan, con semilla (las mismas en cada fotograma) */
  const rnd = s => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  /* en parejas en espejo (izquierda y derecha a la vez, mismo color, giro contrario): el estallido sale simetrico */
  function parts(seed) { const r = rnd(seed || 7), out = [];
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + .12 + r() * 1.18, p = { vx: Math.cos(a) * (.5 + r() * .5), vy: Math.sin(a) * (.6 + r() * .4), c: CHIPC[i % 4], r: r() * 1.4, s: 1 + r() * 4, red: i % 2 }; out.push(p, { ...p, vx: -p.vx, r: -p.r, s: -p.s }); }
    return out; }
  /* Las dianas son PIXEL ART, como el reticulo y la chincheta: piezas con su contorno a escala entera de la pantalla (k pixeles reales por pixel de arte,
     3 en el mapa a 100 %), en posiciones de pixel entero, que saltan desde el lugar. Nada se rota ni se emborrona: la ficha GIRA por fotogramas
     (se estrecha y se ensancha) y el naipe se DA LA VUELTA (cara, canto, dorso). Las piezas van en parejas en espejo. Duran DIA_LEN segundos */
  const DIA_LEN = 1.4;
  function artCv(w, h, f, pal) {                                       // f(x, y) -> papel; MAYUSCULA = con contorno (el lienzo trae un pixel de margen)
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d"), at = {};
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f(x, y); if (v) at[x + "," + y] = v; }
    for (const key in at) { const [x, y] = key.split(",").map(Number); g.fillStyle = pal[at[key]]; g.fillRect(x, y, 1, 1); }
    g.fillStyle = INK;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!at[x + "," + y] && NB.some(([a1, b1]) => { const v = at[(x + a1) + "," + (y + b1)]; return v && v < "a"; })) g.fillRect(x, y, 1, 1);
    return cv;
  }
  const SPR = {};
  /* la ficha de frente (rx 4) y girando (3, 2, 1 = de canto): 11 x 11 con el centro en (5, 5) */
  const chipSpr = (col, rx) => SPR["c" + col + rx] || (SPR["c" + col + rx] = artCv(11, 11, (x, y) => {
    const dx = x - 5, dy = y - 5; if ((dx / (rx + .45)) ** 2 + (dy / 4.45) ** 2 > 1) return 0;
    if ((dx === 0 && Math.abs(dy) === 4) || (rx >= 3 && Math.abs(dx) === rx && dy === 0)) return "W";
    return rx === 4 && dx * dx + dy * dy <= 5 ? "L" : "M"; }, { M: col, L: mixC(col, WHITE, .45), W: WHITE }));
  const CHIP_SPIN = [4, 3, 2, 1, 2, 3];
  /* el naipe: 9 x 11 con el centro en (4, 5); w = ancho (7 de frente, 1 de canto); cara crema con su pinta, dorso rojo con su filete */
  const cardSpr = (w, back, red) => { const key = "n" + w + back + red; return SPR[key] || (SPR[key] = artCv(9, 11, (x, y) => {
    const dx = Math.abs(x - 4), hw = (w - 1) / 2; if (dx > hw || y < 1 || y > 9) return 0;
    if (back) return w >= 5 && (dx === hw - 1 || y === 2 || y === 8) && dx <= hw - 1 && y >= 2 && y <= 8 ? "Q" : "R";
    return w >= 5 && dx + Math.abs(y - 5) <= 1 ? "P" : "C"; }, { C: "#fffaec", P: red ? "#d8283f" : INK, R: "#c8323f", Q: "#ff9a8c" })); };
  const CARD_FLIP = [[7, 0], [5, 0], [3, 0], [1, 0], [3, 1], [5, 1], [7, 1], [5, 1], [3, 1], [1, 1], [3, 0], [5, 0]];
  const fade = (t, a, b) => (t < a ? 1 : Math.max(0, 1 - (t - a) / (b - a)));
  /* el salto de una pieza: sale con velocidad u (segun su p.vy), cae con g y al tocar el suelo se queda alli (down = posada) */
  function hop(p, t, S, U, g) { const u = U * (.6 + .4 * Math.abs(p.vy)), tl = u / g, tt = Math.min(t, tl); return [p.vx * S * tt, -u * tt + g * tt * tt, t >= tl]; }
  /* donde dibujar: el contexto viene del mapa (transformado por su dpr) o de la tienda (ya en pixeles reales, con su k) */
  function diaBegin(c, x, y, o) { const dp = o && o.k ? 1 : (o && o.dpr) || 1, k = (o && o.k) || Math.max(2, Math.round(3 * dp)); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; return { X: Math.round(x * dp), Y: Math.round(y * dp), k }; }
  const blit = (c, cv, X, Y, k, ax, ay, cx, cy) => c.drawImage(cv, X - (k >> 1) + (Math.round(ax) - cx) * k, Y - (k >> 1) + (Math.round(ay) - cy) * k, cv.width * k, cv.height * k);   // el pixel (cx, cy) centrado en el punto
  const DIA = {
    /* lluvia de fichas: saltan en abanico a los dos lados (no hacia arriba, donde va el nombre del lugar), girando, y se posan alrededor */
    lluvia: { p: 250, draw(c, x, y, t, P, o) { if (t > DIA_LEN) return; const { X, Y, k } = diaBegin(c, x, y, o);
      c.globalAlpha = fade(t, 1.0, DIA_LEN); const f = Math.floor(t * 1000 / 70), wd = (o && o.wide) || 1;
      P.forEach(p => { const [ax, ay, down] = hop(p, t, 62 * wd, 112, 140), spin = down ? 4 : CHIP_SPIN[(f + Math.round(Math.abs(p.r) * 4)) % 6]; blit(c, chipSpr(p.c, spin), X, Y, k, ax, ay - 4, 5, 5); });
      c.restore(); } },
    /* naipes al aire: flotan mas, se dan la vuelta y caen boca arriba */
    naipes: { p: 250, draw(c, x, y, t, P, o) { if (t > DIA_LEN) return; const { X, Y, k } = diaBegin(c, x, y, o);
      c.globalAlpha = fade(t, 1.05, DIA_LEN); const f = Math.floor(t * 1000 / 65), wd = (o && o.wide) || 1;
      P.slice(0, 10).forEach(p => { const [ax, ay, down] = hop(p, t, 58 * wd, 96, 110), fr = down ? [7, 0] : CARD_FLIP[(f + Math.round(Math.abs(p.r) * 5)) % 12]; blit(c, cardSpr(fr[0], fr[1], p.red), X, Y, k, ax, ay - 5, 4, 5); });
      c.restore(); } },
    /* la onda de oro: dos aros al pixel (con su contorno) que se abren desde el lugar */
    onda: { p: 250, draw(c, x, y, t, P, o) { if (t > DIA_LEN) return; const { X, Y, k } = diaBegin(c, x, y, o);
      for (const [d0, th] of [[0, 3], [.22, 2], [.44, 2]]) { const q = (t - d0) / .9; if (q <= 0 || q >= 1) continue; const r = Math.round(4 + 24 * (1 - (1 - q) ** 3));
        c.globalAlpha = q < .7 ? 1 : 1 - (q - .7) / .3;
        for (const [gx, gy, v] of grid("_onda" + th, r)) { c.fillStyle = v === "O" ? INK : v === "L" ? "#fff3b0" : "#ffcf3f"; c.fillRect(X + gx * k - (k >> 1), Y + gy * k - (k >> 1), k, k); } }
      c.restore(); } },
    /* el sello: cae de golpe encima del lugar, con su marco doble, y se queda un momento */
    sello: { p: 300, draw(c, x, y, t, P, o) { if (t > DIA_LEN) return; const { X, Y, k } = diaBegin(c, x, y, o);
      const tx = A.t ? A.t("res.t1") : "¡Diana!", fs = 10 * k, sl = t < .12 ? 1.5 - 4.2 * t : 1, shake = t > .12 && t < .3 ? (Math.floor(t * 60) % 2 ? k : -k) : 0;
      c.globalAlpha = Math.min(1, t / .06) * fade(t, 1.05, DIA_LEN);
      const fam = getComputedStyle(document.documentElement).getPropertyValue("--serif") || "'Jersey 15', sans-serif";
      c.font = `${Math.round(fs * sl)}px ${fam}`; c.textAlign = "center"; c.textBaseline = "middle";
      const w = Math.round((c.measureText(tx).width / k + 10) / 2) * 2 * k, h = Math.round(17 * sl) * k, bx = X - w / 2 + shake, by = Y - ((o && o.up) || 52) * k - h / 2;   // en el mapa, por encima del nombre del lugar
      const rect = (x0, y0, w0, h0, col) => { c.fillStyle = col; c.fillRect(x0, y0, w0, k); c.fillRect(x0, y0 + h0 - k, w0, k); c.fillRect(x0, y0, k, h0); c.fillRect(x0 + w0 - k, y0, k, h0); };
      c.fillStyle = "rgba(255,247,230,.9)"; c.fillRect(bx, by, w, h);
      rect(bx - k, by - k, w + 2 * k, h + 2 * k, INK); rect(bx, by, w, h, "#c8323f"); rect(bx + 2 * k, by + 2 * k, w - 4 * k, h - 4 * k, "#c8323f");
      c.fillStyle = "#c8323f"; c.fillText(tx, X + shake, by + h / 2 + k / 2, w - 6 * k);
      c.restore(); } },
  };
  const DIA_MS = 1900;                                                   // el compas de los anillos de siempre (js/map.js)

  /* ---------------------------------------------------------------- el catalogo y el estado */
  const CATS = { ret: ["casa", ...Object.keys(RET)], pin: ["casa", ...Object.keys(PIN)], lin: ["casa", ...Object.keys(LIN)], dia: ["casa", ...Object.keys(DIA)] };
  const DEF = { ret: RET, pin: PIN, lin: LIN, dia: DIA };
  const prof = () => A.profile.get();
  const st = () => { const P = prof(); if (!P.ptr || typeof P.ptr !== "object") P.ptr = { own: {}, wear: {} }; P.ptr.own = P.ptr.own || {}; P.ptr.wear = P.ptr.wear || {}; return P.ptr; };
  const has = (s, id) => CATS[s] && CATS[s].includes(id);
  const owned = (s, id) => id === "casa" || !!st().own[s + ":" + id];
  let TRY = null;                                                         // «Probar en el mapa» (la tienda): la pieza se ve aunque aun no sea tuya
  const current = s => { if (TRY && TRY.s === s) return TRY.id; const w = st().wear[s]; return has(s, w) && owned(s, w) ? w : "casa"; };
  const price = (s, id) => (id === "casa" ? 0 : (DEF[s][id] || {}).p || 0);
  function wear(s, id) { if (!has(s, id) || !owned(s, id)) return false; st().wear[s] = id; A.profile.save(); return true; }
  function buy(s, id) { if (!has(s, id) || owned(s, id) || !A.club || !A.club.spend) return false; if (!A.club.spend(price(s, id))) return false; const p = st(); p.own[s + ":" + id] = Date.now(); p.wear[s] = id; A.profile.save(); return true; }
  const name = (s, id) => P6(N[id] || N.casa);
  /* el estilo para el Duelo: chincheta.linea.diana (solo lo que no es de la casa se ve distinto) */
  const code = () => [current("pin"), current("lin"), current("dia")].join(".");
  const parse = s => { const a = String(s || "").split("."); return { pin: has("pin", a[0]) ? a[0] : "casa", lin: has("lin", a[1]) ? a[1] : "casa", dia: has("dia", a[2]) ? a[2] : "casa" }; };

  /* ---------------------------------------------------------------- miniaturas de la tienda. El lienzo mide lo mismo que en la pantalla (pixeles reales:
     la tienda lo ajusta), asi que el pixel art va a escala ENTERA y centrado al pixel: ningun pixel sale mas gordo que otro. El reticulo y la chincheta
     van sobre una isla de tierra centrada bajo ellos (su color de tierra, sobre tierra); la linea y la diana, como en el mapa */
  const thumbG = {};
  function thumb(cv, s, id, t, big) {
    const W = cv.width, H = cv.height, c = cv.getContext("2d"), sc = W / (big ? 320 : 160);
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false; c.clearRect(0, 0, W, H);
    c.fillStyle = "#245a41"; c.fillRect(0, 0, W, H);
    const isle = (x, y, rx, ry, rot) => { c.fillStyle = "#f6e6c0"; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fill(); c.strokeStyle = "rgba(22,36,28,.55)"; c.lineWidth = Math.max(2, Math.round(2 * sc)); c.stroke(); };
    if (s === "ret") {
      const k = Math.max(1, Math.floor(H / (big ? 68 : 60)));             // la misma escala para todos (cabe hasta la mira, de 59 pixeles)
      isle(W / 2, H / 2, 30 * k, 27 * k, 0);
      const g = thumbG.ret || (thumbG.ret = Object.assign(document.createElement("canvas"), { width: 64, height: 64 })), x = g.getContext("2d");
      const px = (a1, b1, col) => { x.fillStyle = col; x.fillRect(a1, b1, 1, 1); };
      x.clearRect(0, 0, 64, 64);
      const sk = RET[id] || CASA, col = sk.land; sk.ring(px, t, 32, 32, 19, col); corners(px, 32, 32, 24, col); centerPin(px, 32, 32);
      c.drawImage(g, Math.round(W / 2 - 32.5 * k), Math.round(H / 2 - 32.5 * k), 64 * k, 64 * k);
    } else if (s === "pin") {
      const k = Math.max(1, Math.floor((H * .66) / 24)), tipY = Math.round(H / 2 + 12 * k), x0 = Math.round(W / 2);
      isle(x0, tipY - k, 15 * k, 6 * k, 0);
      c.fillStyle = "rgba(0,0,0,.32)"; c.beginPath(); c.ellipse(x0, tipY, 4.5 * k, 1.8 * k, 0, 0, 7); c.fill();
      const pc = pinCanvas(id);
      if (pc) c.drawImage(pc, Math.round(x0 - 8.5 * k), tipY - 24 * k, 16 * k, 24 * k);
      else vecPin(c, x0, tipY, INK, PAPER, k / 2);
    } else if (s === "lin") {
      const k = Math.max(1, Math.floor(H / 60)), a1 = [Math.round(W * .18), Math.round(H * .78)], b1 = [Math.round(W * .82), Math.round(H * .3)], e = Math.min(1, ((t * 1000) % 2600) / 1200);
      isle(W * .68, H * .66, W * .44, H * .42, .3);
      if (LIN[id]) LIN[id].draw(c, a1, b1, e, { k }); else { c.save(); c.setTransform(sc, 0, 0, sc, 0, 0); c.setLineDash([1, 9]); c.lineCap = "round"; c.lineWidth = 4; c.strokeStyle = "rgba(22,36,28,.9)"; seg(c, a1.map(v => v / sc), b1.map(v => v / sc), e); c.lineWidth = 1.5; c.strokeStyle = "rgba(242,233,214,.7)"; c.lineDashOffset = 5; seg(c, a1.map(v => v / sc), b1.map(v => v / sc), e); c.restore(); }
      vecPin(c, b1[0], b1[1], "#e8283a", PAPER, k * .3);
    } else {
      /* la diana sale del lugar (abajo): las piezas a escala entera; las pequenas casi no paran y van desfasadas (si no, la tienda se queda vacia a la vez) */
      const ring = id === "onda" || id === "casa", k = Math.max(1, Math.floor((H * (big ? .6 : .72)) / 38)), X = Math.round(W / 2), Y = Math.round(H * (ring ? .56 : .8));   // los aros, centrados
      const cyc = (DIA_LEN + (big ? .5 : .25)) * 1000, off = big ? 0 : (CATS.dia.indexOf(id) * 397) % cyc, tt = ((t * 1000 + off) % cyc) / 1000;
      isle(X, Y, 27 * k, 9 * k, 0);
      vecPin(c, X, Y, "#e8283a", PAPER, k * .3);
      if (DIA[id]) DIA[id].draw(c, X, Y, tt, cv._parts || (cv._parts = parts(13)), { k, wide: .55, up: 30 });
      else { const q = tt / (cyc / 1000), z = k / 3; c.strokeStyle = `rgba(242,233,214,${.85 * (1 - q)})`; c.lineWidth = 2.5 * z; c.beginPath(); c.arc(X, Y, (10 + q * 48) * z, 0, 7); c.stroke(); c.strokeStyle = `rgba(254,95,85,${.6 * (1 - q)})`; c.lineWidth = 2 * z; c.beginPath(); c.arc(X, Y, (8 + q * 30) * z, 0, 7); c.stroke(); }
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
  /* la chincheta de siempre (la misma forma que js/map.js _pin) para las miniaturas */
  function vecPin(c, x, y, fill, ring, s) { c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-4, -10, -13, -15, -13, -26); c.arc(0, -26, 13, Math.PI, 0); c.bezierCurveTo(13, -15, 4, -10, 0, 0); c.closePath(); c.fillStyle = fill; c.fill(); c.lineWidth = 2.5; c.strokeStyle = ring; c.stroke(); c.beginPath(); c.arc(0, -26, 4.6, 0, Math.PI * 2); c.fillStyle = ring; c.fill(); c.restore(); }

  A.punteros = {
    SLOTS, CATS, TX, slotName: s => P6(TX[s]), slotPlural: s => P6(TX[s + "P"]), slotDesc: s => P6(TX[s + "D"]), name, price, owned, current, wear, buy, code, parse,
    ret: () => RET[current("ret")] || CASA, corners, centerPin, _shape: SHAPE, _grid: grid,
    pinCanvas, drawLine: (c, a, b, e, id, o) => { const L = LIN[id]; if (!L) return false; L.draw(c, a, b, e, o); return true; },
    diana: (c, x, y, t, id, P, o) => { const D = DIA[id]; if (!D) return false; D.draw(c, x, y, t, P, o); return true; }, parts, DIA_MS,
    thumb, list: s => CATS[s].slice(),
    tryOn: (s, id) => { TRY = has(s, id) ? { s, id } : null; }, tryOff: () => { TRY = null; },
    /* el truco de pruebas (js/truco.js): todo tuyo */
    _todo: () => { const p = st(); SLOTS.forEach(s => CATS[s].forEach(id => { if (id !== "casa") p.own[s + ":" + id] = p.own[s + ":" + id] || Date.now(); })); A.profile.save(); },
  };
})(window.AIQ);
