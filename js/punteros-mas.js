/*
 * Geolite - LOS PUNTEROS NUEVOS (maqueta «La tienda, más llena», votada el 2026-11-05): 22 piezas en seis familias que se venden sueltas
 * (la familia solo las agrupa a la vista). Se cargan ANTES que js/punteros.js, que las recibe con su caja de herramientas (A.punterosMas) y las
 * mete en el catálogo detrás de las de siempre.
 *   La ruleta   retículo ruleta, chincheta bola, línea casillas, diana pleno
 *   Comodín     retículo orejas, chincheta pata, línea huellas, diana zarpazo
 *   El tesoro   retículo timón, chincheta doblón, (línea tesoro, la de antes), diana equis
 *   Neón        (retículo neón, el de antes), chincheta neonpin, línea tubo, diana rótulo
 *   El hielo    retículo copo, chincheta carámbano, línea escarcha, diana helada
 *   El oro      retículo laurel, chincheta ficha de oro, línea cadena, diana Midas
 * Todo PIXEL ART simétrico al píxel, con el contorno de tinta de siempre y escala entera. REGLA: nada salta, vuela ni flota; las dianas viven pegadas
 * al lugar (el mapa se rasga, se hiela, se dora, se tuesta) y las que lo rodean llevan ring: 1 (en la tienda se ven centradas, como la onda de oro).
 * Precios con las bandas de siempre: retículo 200, chincheta 120, línea 120-150, diana 250-300.
 * Y los retoques votados (v0.4.60): la chincheta y la línea de la casa, al píxel (con la tinta y el papel de la mesa: KIT.casa), y la lluvia de
 * fichas y los naipes al aire, que ya no lanzan nada al aire (se apilan y se abren en abanico sobre el lugar).
 */
window.AIQ = window.AIQ || {};
(function (A) {
  /* ============================================================ RETÍCULOS Y CHINCHETAS ============================================================ */
  (A.punterosMas = A.punterosMas || []).push(T => {
    const { SHAPE, RET, PIN, N, XT, skin, pinArt, needleAt, STEEL, fold, band2, mixC } = T;
    const DEG = 57.29578;
    Object.assign(XT, { Zr: "#e8283a", Zrd: "#a8142e", Zn: "#3a2f58", Znd: "#1d0a3d", Zv: "#3fb54a", Zvd: "#136b3e", Zb: "#f3f0fa", Zbd: "#c9cde0",
      Zp: "#e5408f", Zt: "#e8283a", Ztl: "#ff6b5e", Ztd: "#a8142e" });
    /* plantilla de la mitad derecha a radio 19 (fila j = y0 + j, columna = |x|); a otro radio se lee corrida en el radio */
    const tpl = (rows, y0, map) => (ax, ay, d, y, r) => {
      let sx = ax, sy = y;
      if (r !== 19 && d > 0) { const k = (d + 19 - r) / d; sx = Math.round(ax * k); sy = Math.round(y * k); }
      const row = rows[sy - y0]; if (!row) return 0; const c = row[sx]; return c && c !== "." ? (map[c] || c) : 0;
    };

    /* la ruleta: 12 casillas (el cero verde arriba), trastes de laton entre aros y la bola en la de abajo */
    const FRETS = {};
    const frets = r => FRETS[r] || (FRETS[r] = (() => { const s = new Set(); for (let b = 15; b < 180; b += 30) for (let t = r - 5; t <= r; t += .2) s.add(Math.round(t * Math.sin(b / DEG)) + "," + Math.round(-t * Math.cos(b / DEG))); return s; })());
    SHAPE.ruleta = (ax, ay, d, y, r) => {
      if (d >= r - .5 && d < r + 1.5) return band2(d >= r + .5, y);
      if (d >= r - 5.5 && d < r - 4.5) return "M";
      if (d >= r - 4.5 && d < r - .5) {
        if (frets(r).has(ax + "," + y)) return "M";
        const ph = Math.atan2(ax, -y) * DEG, s = Math.round(ph / 30);
        if (s === 6 && ax <= 1 && ay >= r - 3 && ay <= r - 1) return ax === 1 && ay !== r - 2 ? "Zbd" : "Zb";
        const k = s === 0 ? "Zv" : s % 2 ? "Zr" : "Zn";
        return d < r - 3.5 ? k + "d" : k;
      }
      return 0;
    };
    /* las orejas de Comodin: aro, dos orejas con su piel rosa, bigotes y la pajarita roja */
    SHAPE.orejas = (ax, ay, d, y, r) => {
      if (y > 0) { const by = y - r - 1; if (Math.abs(by) <= 2 && ax <= 4) {
        if (ax === 0) return Math.abs(by) <= 1 ? "Ztd" : 0;
        return Math.abs(by) <= Math.min(2, ax - 1) ? (by < 0 ? "Ztl" : "Zt") : 0; } }
      const sh = r - 19, ex = 12 + Math.round(sh * .5), ey = -25 - Math.round(sh * .87), X = ax - ex, Y = y - ey;
      if (y < 0 && d >= r - 1.5 && X <= 0 && Y >= -X) {
        if (X <= -2 && Y + X >= 2 && d >= r + 1.5) return "Zp";
        return Y + X === 0 ? "L" : "M"; }
      if (d >= r - 1.5 && d < r + .5) return band2(d >= r - .5, y);
      if ((ay === 2 && ax >= r + 2 && ax <= r + 4) || (ay === 3 && ax >= r + 5 && ax <= r + 7)) return "W";
      return 0;
    };
    /* el timon: aro de madera, 8 radios, el cubo y las cabillas por fuera */
    SHAPE.timon = (ax, ay, d, y, r) => {
      const [u, v] = fold(ax, ay), pd = u - v;
      if (d >= r - 2.5 && d < r + .5) return d >= r - .5 ? (y < 0 ? "L" : "M") : d < r - 1.5 ? (y > 0 ? "L" : "M") : "M";
      if (d >= 5.5 && d < 7.5) return d >= 6.5 ? (y < 0 ? "L" : "M") : (y > 0 ? "L" : "M");
      const axis = v <= 1, diag = pd <= 1;
      if (d >= 7.5 && d < r - 2.5 && (axis || diag)) return "D";
      if (axis && u >= r + 1 && u <= r + 5) return u <= r + 2 ? (v === 0 ? "M" : 0) : u === r + 5 && v === 1 ? 0 : v === 0 ? "L" : "M";
      if (!axis && diag && d >= r + .5 && d < r + 6) { if (d < r + 2.5) return pd === 0 ? "M" : 0; return pd === 0 ? "L" : "M"; }
      return 0;
    };
    /* el copo: 8 brazos con sus ramitas, simetrico en los 4 ejes del pixel (octante u >= v); a otro radio se lee corrido en el radio */
    const COPO = new Map(), cp = (u, v, k) => COPO.set(u + "," + v, k);
    for (let u = 6; u <= 21; u++) cp(u, 0, "L");                                   // brazo del eje: 3 px (luz en el centro) y punta de 1
    for (let u = 7; u <= 17; u++) cp(u, 1, "M");
    [[14, 2], [15, 3], [16, 4], [15, 2], [16, 3], [17, 4]].forEach(([u, v]) => cp(u, v, "M"));   // su ramita, de 2 px, hacia fuera
    for (let p = 5; p <= 14; p++) { cp(p, p, "L"); if (p <= 13) cp(p + 1, p, "M"); }   // brazo diagonal: escalera de 3
    [[12, 10], [13, 10], [14, 10], [13, 9], [14, 9], [15, 9]].forEach(([u, v]) => cp(u, v, "M"));   // su ramita
    SHAPE.copo = (ax, ay, d, y, r) => {
      if (r !== 19 && d > 0) { const k = (d + 19 - r) / d; ax = Math.round(ax * k); ay = Math.round(ay * k); }
      const [u, v] = fold(ax, ay); return COPO.get(u + "," + v) || 0; };
    /* el laurel: dibujado a mano (mitad derecha, y de -18 a 22). S tallo, L/M/D hojas (luz arriba), cinta roja: q luz, r, k nudo */
    const LAUREL = [
      ".........L",
      ".........DLL",
      "..........DDL.....L",
      "............D....LM",
      ".............S...MD",
      "..............S..M",
      "...............S.D",
      "...........LLL..S",
      "............DDLLS",
      ".................S",
      "..............L..S....L",
      "..............DLL.S.LLD",
      "...............DDLSLDD",
      ".................DSD",
      "...................S",
      "...................S",
      "...............L...S...L",
      "...............DLL.S.LLD",
      "................DDLSLDD",
      "..................DSD",
      "...................S",
      "...................S",
      "..............L....S..L",
      "..............DLL.S.LLD",
      "...............DDLSLDD",
      ".................DSD",
      "..............L..S",
      ".............LM..S",
      ".............MD.S",
      ".............M..S",
      "........L....D.S",
      ".......LM.....S..LLL",
      ".......MD....S.LLDD",
      ".......M....S",
      ".......D..SS",
      "..qq....SS",
      "krrr.SSS.LLLL",
      "kr..S......DDL",
      ".rr",
      "..rr",
      "...r",
    ];
    SHAPE.laurel = tpl(LAUREL, -18, { S: "D", D: "M", M: "M", r: "Zt", q: "Ztl", k: "Ztd" });

    RET.ruleta = skin("ruleta", "#fdd742", "#5ef2df", 200);
    RET.orejas = skin("orejas", "#f2a07c", "#9c7ce6", 200);
    RET.timon = skin("timon", "#f5a623", "#7ac8ff", 200);
    RET.copo = skin("copo", "#fdd742", "#7ac8ff", 200);
    RET.laurel = skin("laurel", "#f8b449", "#c9cde0", 200);

    /* chinchetas: filas de 16 (columna 8 = eje); se lee la mitad derecha */
    const rows = R => (ax, y) => { const c = (R[y] || "")[8 + ax]; return c && c !== "." ? c : 0; };
    PIN.doblon = { p: 120, draw: pinArt((ax, y) => needleAt(ax, y, 15) || rows([
      "................",
      "......BBBBB.....",
      "....BBCCCCCBB...",
      "...BCCDDDDDCCB..",
      "..BCDDDDEDDDDCB.",
      "..BCDDDEEEDDDCB.",
      "..BCDEEEEEEEDCB.",
      "..DCDCBBBBBCDCD.",
      "..DCDDBBDBBDDCD.",
      "..DCDDCCDCCDDCD.",
      "..DCCDDDDDDDCCD.",
      "..CDCCDDDDDCCDC.",
      "...CCCCCCCCCCC..",
      "....FCFCFCFCF...",
      "......FFFFF.....",
    ])(ax, y), { B: "#ffd95a", C: "#c46a1b", D: "#f5a623", E: "#fff3b0", F: "#6e3414", ...STEEL }) };

    /* la gota de mapa al pixel: medio ancho por fila (y 0-22), cabeza redonda de 13 y cono recto hasta la punta */
    const DROP = [-1, 2, 4, 5, 5, 6, 6, 6, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 1, 0, 0];
    const inDrop = (ax, y) => y >= 0 && y < DROP.length && ax <= DROP[y];
    const dropDist = (() => { const D = {}; for (let y = -2; y < 25; y++) for (let a = 0; a <= 9; a++) D[a + "," + y] = inDrop(a, y) ? 99 : 0;
      for (let k = 1; k < 9; k++) for (let y = 0; y < 23; y++) for (let a = 0; a <= 8; a++) { const q = a + "," + y; if (D[q] !== 99) continue;
        if ([[a + 1, y], [Math.abs(a - 1), y], [a, y - 1], [a, y + 1]].some(([b, z]) => D[b + "," + z] === k - 1)) D[q] = k; }
      return (ax, y) => D[ax + "," + y]; })();
    const outDist = (ax, y) => { if (inDrop(ax, y)) return 0; let m = 9; for (let b = 0; b <= 8; b++) for (let z = 0; z < 23; z++) if (inDrop(b, z)) m = Math.min(m, Math.abs(b - ax) + Math.abs(z - y)); return m; };
    /* la de neon: el contorno de la gota es un tubo (color, nucleo, color) con su halo; dentro, oscuro translucido */
    PIN.neonpin = { p: 120, draw: pinArt((ax, y) => {
      const k = dropDist(ax, y);
      if (!k) { const o = ax <= 7 ? outDist(ax, y) : 9; return o === 1 ? "a" : 0; }
      return k === 1 || k === 3 ? "m" : k === 2 ? "n" : "z"; }, { m: "#ff5fae", n: "#ffcfe7", a: "rgba(255,95,174,.42)", z: "rgba(29,10,61,.45)" }) };
    /* la bola de la ruleta, clavada: blanca, con su brillo arriba y la sombra abajo */
    const BOLA = [
      "......MMMMM.....",
      "....MMMMMMMMM...",
      "...MMMMHHHMMMM..",
      "...MMMHHHHHMMM..",
      "..MMMMMHHHMMMMM.",
      "..MMMMMMMMMMMMM.",
      "..MMMMMMMMMMMMM.",
      "..DMMMMMMMMMMMD.",
      "..DDMMMMMMMMMDD.",
      "...DDMMMMMMMDD..",
      "...KDDMMMMMDDK..",
      "....KKDDDDDKK...",
      "......KKKKK.....",
    ];
    PIN.bola = { p: 120, draw: pinArt((ax, y) => needleAt(ax, y, 13) || rows(BOLA)(ax, y), { H: "#f3f0fa", M: "#c9cde0", D: "#8a8fa8", K: "#6b747d", ...STEEL }) };
    /* la pata de Comodin: cuatro dedos y la almohadilla, clavada */
    PIN.pata = { p: 120, draw: pinArt((ax, y) => needleAt(ax, y, 15) || rows([
      "................",
      "......L...L.....",
      ".....LLL.LLL....",
      ".....MMM.MMM....",
      "...L..D...D..L..",
      "..LLL.......LLL.",
      "..MMM.......MMM.",
      "...D...LLL...D..",
      ".....LLLLLLL....",
      "....MMMMMMMMM...",
      "...MMMMMMMMMMM..",
      "...MMMMMMMMMMM..",
      "...DMMMMMMMMMD..",
      "....DDMMMMMDD...",
      "......DDDDD.....",
    ])(ax, y), { L: "#ffd3b6", M: "#f2a07c", D: "#c4614a", ...STEEL }) };
    /* el carambano: hielo que acaba en punta; la punta (sin contorno, como una aguja) es la aguja */
    const CW = [3, 5, 6, 6, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
    PIN.caramb = { p: 120, draw: pinArt((ax, y) => {
      const w = CW[y]; if (w == null || ax > w) return 0;
      if (y >= 14) return y === 23 ? "k" : ax === 0 && y < 19 ? "i" : "j";
      if (y === 0 || (y === 1 && ax <= 3)) return "W";
      if (ax === 0) return "W";
      return ax === w ? "D" : ax === 1 ? "L" : "M"; }, { W: "#f3f0fa", L: "#c9cde0", M: "#7ac8ff", D: "#1689fb", i: "#f3f0fa", j: "#7ac8ff", k: "#1689fb" }) };
    /* la ficha de oro: la ficha de siempre en oro, con incrustaciones crema y la chistera de la casa en el centro */
    PIN.fichaoro = { p: 120, draw: pinArt((ax, y) => {
      const nd = needleAt(ax, y, 14); if (nd) return nd;
      const hd = Math.hypot(ax, y - 7); if (hd > 6.4) return 0;
      const [u, v] = fold(ax, Math.abs(y - 7));
      if (hd > 4.4) return v <= 1 && u >= 5 ? "W" : "M";
      if (hd > 3.4) return "D";
      if (ax <= 1 && y >= 5 && y <= 7) return y === 5 ? "h" : y === 7 ? "b" : "k";
      if (ax <= 2 && y === 8) return "k";
      return y <= 6 ? "L" : "C"; }, { M: "#f5a623", D: "#c46a1b", W: "#fff7e6", C: "#ffd95a", L: "#fff3b0", k: "#6e3414", h: "#b06a34", b: "#c46a1b", ...STEEL }) };

    /* RETOQUE. LA DE LA CASA, AL PÍXEL: la gota de tinta con su aro y su ojo de papel (antes, vectores). Toma la tinta y el papel de la mesa */
    T.casa.pin = (ink, paper) => pinArt((ax, y) => {
      if (!inDrop(ax, y)) return 0;
      const edge = [-1, 0, 1].some(a => [-1, 0, 1].some(b => !inDrop(Math.abs(ax + a), y + b)));   // aro de 1 px sin huecos (vecinos en diagonal)
      if (edge) return y <= 3 ? "W" : y >= 15 ? "D" : "P";
      const e = Math.abs(y - 7) === 2 ? ax <= 1 : Math.abs(y - 7) < 2 && ax <= 2;
      if (e) return y <= 6 && !(y === 6 && ax === 2) ? "W" : "P";
      return "K"; }, { W: mixC(paper, "#ffffff", .45), P: paper, D: mixC(paper, ink, .22), K: ink });

    N.ruleta = "La ruleta|The roulette wheel|La roulette|A roleta|Das Roulette|La roulette||轮盘|룰렛|ルーレット|Рулетка|Ruletka";
    N.orejas = "Las orejas de Comodín|Comodín's ears|Les oreilles de Joker|As orelhas do Coringa|Comodíns Ohren|Le orecchie di Jolly||Comodín 的耳朵|코모딘의 귀|コモディンの耳|Уши Комодина|Uszy Comodína";
    N.timon = "El timón|The helm|Le gouvernail|O leme|Das Steuerrad|Il timone||舵轮|조타륜|舵輪|Штурвал|Ster";
    N.copo = "El copo|The snowflake|Le flocon|O floco|Die Schneeflocke|Il fiocco||雪花|눈송이|雪の結晶|Снежинка|Płatek śniegu";
    N.laurel = "El laurel|The laurel|Le laurier|O louro|Der Lorbeer|L'alloro||月桂冠|월계관|月桂冠|Лавровый венок|Laur";
    N.doblon = "El doblón|The doubloon|Le doublon|O dobrão|Die Dublone|Il doblone||金币|도블론|ダブロン|Дублон|Dublon";
    N.bola = "La bola|The ball|La bille|A bolinha|Die Kugel|La pallina||小球|구슬|ボール|Шарик|Kulka";
    N.pata = "La pata|The paw|La patte|A pata|Die Pfote|La zampa||猫爪|발자국|肉球|Лапка|Łapka";
    N.neonpin = "La de neón|Neon pin|En néon|A de neon|Neonpin|Quella al neon||霓虹图钉|네온 핀|ネオンのピン|Неоновая|Neonowa";
    N.caramb = "El carámbano|The icicle|Le glaçon|O pingente de gelo|Der Eiszapfen|Il ghiacciolo||冰柱|고드름|つらら|Сосулька|Sopel";
    N.fichaoro = "La ficha de oro|The gold chip|Le jeton d'or|A ficha de ouro|Der Goldchip|La fiche d'oro||金筹码|골드 칩|金のチップ|Золотая фишка|Złoty żeton";
  });

  /* ============================================================ LÍNEAS Y DIANAS ============================================================ */
  (A.punterosMas = A.punterosMas || []).push(T => {
    const { LIN, DIA, N, INK, WHITE, linBegin, diaBegin, fade, mixC, DIA_LEN, artCv, CHIPC, cardSpr } = T;

    /* ------------------------------------------------------------ ayudantes: un conjunto de píxeles de arte con su papel y su contorno */
    const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];
    class PS {
      constructor() { this.m = new Map(); }
      set(x, y, col, ink = 1) { this.m.set(x + "," + y, [x, y, col, ink]); return this; }
      has(x, y) { return this.m.has(x + "," + y); }
      get(x, y) { const v = this.m.get(x + "," + y); return v && v[2]; }
      del(x, y) { this.m.delete(x + "," + y); }
      /* primero la tinta (solo alrededor de lo que la lleva y donde no hay nada), después el color */
      draw(c, put, nb = 8, inkCol = INK) {
        const NB = nb === 8 ? N8 : N4, ink = new Map();
        if (nb) this.m.forEach(([x, y, , i]) => { if (i) for (const [a, b] of NB) { const kk = (x + a) + "," + (y + b); if (!this.m.has(kk)) ink.set(kk, [x + a, y + b]); } });
        c.fillStyle = inkCol; ink.forEach(([x, y]) => put(x, y));
        this.m.forEach(([x, y, col]) => { if (col) { c.fillStyle = col; put(x, y); } });
      }
    }
    /* la recta de pixel art (Bresenham): sin huecos y con los escalones regulares */
    function bres(x0, y0, x1, y1) { const out = []; let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, er = dx + dy;
      for (let g = 0; g < 4000; g++) { out.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * er; if (e2 >= dy) { er += dy; x0 += sx; } if (e2 <= dx) { er += dx; y0 += sy; } } return out; }
    const D8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];      // E, SE, S, SO, O, NO, N, NE (y hacia abajo)
    const dir8 = (ux, uy) => ((Math.round(Math.atan2(uy, ux) / (Math.PI / 4)) % 8) + 8) % 8;
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const easeOut = q => 1 - (1 - q) * (1 - q);
    /* la geometría de una línea en píxeles de arte; put(x, y) pinta el píxel de arte (x, y) */
    function geo(c, a, b, o) {
      const { dp, k } = linBegin(c, o), A0 = [a[0] * dp / k, a[1] * dp / k], B0 = [b[0] * dp / k, b[1] * dp / k], dx = B0[0] - A0[0], dy = B0[1] - A0[1];
      const L = Math.hypot(dx, dy) || 1, Lc = Math.max(Math.abs(dx), Math.abs(dy)) || 1, Ai = A0.map(Math.round), Bi = B0.map(Math.round);
      return { k, A: A0, B: B0, Ai, Bi, dx, dy, L, Lc, ux: dx / L, uy: dy / L, put: (x, y) => c.fillRect(x * k, y * k, k, k) };
    }
    /* el trazo completo de a a b y cuánto se ve (el prefijo no se tuerce mientras crece) */
    const trace = (g, e) => { const pts = bres(g.Ai[0], g.Ai[1], g.Bi[0], g.Bi[1]); return { pts, n: e >= 1 ? pts.length : Math.round(clamp01(e) * (pts.length - 1)) + 1 }; };
    /* en las dianas: put del píxel de arte (gx, gy) respecto al lugar, como la onda de oro */
    const dput = (c, X, Y, k) => (x, y) => c.fillRect(X + x * k - (k >> 1), Y + y * k - (k >> 1), k, k);
    /* las dianas con varias capas se pintan en una hoja aparte y se funden enteras: al desvanecerse no se transparentan unas sobre otras */
    const LAY = {};
    function layer(c, X, Y, k, R, alpha, fn) {
      if (alpha <= 0) return; const S = (2 * R + 1) * k, cv = LAY[S] || (LAY[S] = Object.assign(document.createElement("canvas"), { width: S, height: S })), g = cv.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, S, S); g.imageSmoothingEnabled = false;
      const L0 = R * k + (k >> 1); fn(g, dput(g, L0, L0, k), L0, L0);
      c.globalAlpha = alpha; c.drawImage(cv, X - L0, Y - L0); }
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;

    /* paleta (geolite40 y los colores de los punteros de siempre) */
    const C = {
      rojo: ["#ff6b5e", "#e8283a", "#a8142e"], negro: ["#5c565b", "#0a0a0c", "#0a0a0c"], verde: ["#a6e05a", "#3fb54a", "#136b3e"],
      oro: ["#fff3b0", "#fdd742", "#f5a623", "#c46a1b", "#3c240a"], hielo: ["#f3f0fa", "#c9cde0", "#7ac8ff", "#1689fb", "#0c60d3"],
      neon: "#ff5fae", neonN: mixC("#ff5fae", "#ffffff", .7), papel: "#f2e9d6",
    };
    const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

    /* ============================================================ LÍNEAS ============================================================ */

    /* 1. CASILLAS DE RULETA: una fila de casillas rojas y negras (5 x 5 con su bisel y contorno compartido) y la verde en el lugar.
       Se colocan desde el lugar hacia atrás con paso exacto de 6 en el eje mayor: la verde cae justo en el lugar y el paso es regular */
    LIN.casillas = { p: 120, draw(c, a, b, e, o) {
      const g = geo(c, a, b, o), S = 6, n = Math.floor((g.Lc - 4) / S), ex = g.dx / g.Lc, ey = g.dy / g.Lc, ps = new PS();
      let head = -1; for (let j = 0; j <= n; j++) if (1 - j * S / g.Lc <= e + 1e-6) { head = j; break; }
      if (head >= 0) for (let j = n; j >= head; j--) {
        const cx = Math.round(g.B[0] - j * S * ex), cy = Math.round(g.B[1] - j * S * ey), pal = j === 0 ? C.verde : j % 2 ? C.rojo : C.negro, fresh = e < 1 && j === head;
        for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) ps.set(cx + x, cy + y, fresh ? pal[0] : y === -2 ? pal[0] : y === 2 ? pal[2] : pal[1]);
      }
      ps.draw(c, g.put, 8); c.restore(); } };

    /* 2. LAS HUELLAS DE COMODÍN: pata de gato de 7 x 7 (almohadilla y cuatro dedos), a pasos alternos a los lados del eje. Mira hacia donde
       anda en 8 direcciones: la recta y la diagonal están dibujadas a mano y las demás son giros exactos de 90 grados (nada se emborrona) */
    const PAW_N = ["..#.#..", "#.....#", "..###..", ".#####.", ".#####.", "..###..", "......."];
    const PAW_NE = [".......", ".#.#...", ".......", "###..#.", "####...", "####.#.", ".###..."];
    const pawOff = rows => { const out = []; rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === "#") out.push([x - 3, y - 3]); })); return out; };
    const rot90 = (pts, r) => pts.map(([x, y]) => { for (let i = 0; i < r; i++) [x, y] = [-y, x]; return [x, y]; });
    const PAWS = []; for (let i = 0; i < 8; i++) PAWS[i] = i % 2 ? rot90(pawOff(PAW_NE), (((i - 7) / 2) % 4 + 4) % 4) : rot90(pawOff(PAW_N), (((i - 6) / 2) % 4 + 4) % 4);
    LIN.huellas = { p: 120, draw(c, a, b, e, o) {
      const g = geo(c, a, b, o), n = Math.max(1, Math.round((g.L - 5) / 9)), paw = PAWS[dir8(g.ux, g.uy)], nx = -g.uy, ny = g.ux, ps = new PS();
      for (let j = 1; j <= n; j++) { const u = j / n; if (u > e + 1e-6) break;
        const sd = j % 2 ? 2.2 : -2.2, cx = Math.round(g.A[0] + g.dx * u + nx * sd), cy = Math.round(g.A[1] + g.dy * u + ny * sd);
        paw.forEach(([x, y]) => ps.set(cx + x, cy + y, "#f2a07c"));
      }
      /* contorno solo por fuera: entre los dedos (y entre dedo y almohadilla) se ve el mapa, así cada dedo se lee suelto */
      const ink = new Map(), gap = (x, y) => [[1, 0], [0, 1], [1, 1], [1, -1]].some(([a1, b1]) => ps.has(x + a1, y + b1) && ps.has(x - a1, y - b1));
      ps.m.forEach(([x, y]) => { for (const [a1, b1] of N4) { const X = x + a1, Y = y + b1; if (!ps.has(X, Y) && !gap(X, Y)) ink.set(X + "," + Y, [X, Y]); } });
      c.fillStyle = INK; ink.forEach(([x, y]) => g.put(x, y)); c.fillStyle = "#f2a07c"; ps.m.forEach(([x, y]) => g.put(x, y));
      c.restore(); } };

    /* 3. EL TUBO DE NEÓN: núcleo claro de 1 píxel, tubo rosa de 3 y dos halos (redondos al píxel). Tartamudea entero, como el retículo neón */
    const neonOff = t => Math.sin(t * 9) + Math.sin(t * 13.7) > 1.7;
    LIN.tubo = { p: 150, draw(c, a, b, e, o) {
      const g = geo(c, a, b, o), { pts, n } = trace(g, e), role = new Map(), off = neonOff(now());
      for (let i = 0; i < n; i++) { const [px, py] = pts[i];
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const d2 = dx * dx + dy * dy, r = !dx && !dy ? 3 : Math.max(Math.abs(dx), Math.abs(dy)) <= 1 ? 2 : d2 <= 5 ? 1 : d2 <= 10 ? 0 : -1;
          if (r < 0) continue; const kk = (px + dx) + "," + (py + dy), v = role.get(kk); if (!v || v[2] < r) role.set(kk, [px + dx, py + dy, r]); } }
      const col = off ? [null, null, C.neon, C.neon] : [rgba(C.neon, .16), rgba(C.neon, .42), C.neon, C.neonN];
      for (let r = 0; r <= 3; r++) { if (!col[r]) continue; c.fillStyle = col[r]; role.forEach(([x, y, rr]) => { if (rr === r) g.put(x, y); }); }
      c.restore(); } };

    /* 4. LA ESCARCHA: un tallo de hielo y, cada 4 píxeles, ramitas a 45 grados del tallo (abiertas hacia atrás, como un helecho de escarcha que
       avanza hacia el lugar) de largos irregulares, que crecen cuando pasa el trazo. Van en las 8 direcciones de la rejilla: rectas o diagonales limpias */
    LIN.escarcha = { p: 120, draw(c, a, b, e, o) {
      const g = geo(c, a, b, o), { pts, n } = trace(g, e), q = dir8(g.ux, g.uy), tw = [D8[(q + 3) % 8], D8[(q + 5) % 8]], ps = new PS(), L = pts.length;
      for (let i = 0; i < n; i++) ps.set(pts[i][0], pts[i][1], C.hielo[2]);
      /* largos de cada ramita (izquierda, derecha) en una serie fija que no se repite a la vista: la escarcha no sale en espiga regular */
      const LEN = [[3, 2], [1, 3], [2, 0], [3, 1], [0, 2], [2, 3], [1, 1], [3, 0]];
      for (let i = 4, s = 0; i < Math.min(n, L - 3); i += 4, s++) { const fl = LEN[s % 8], grown = Math.floor((n - 1 - i) / 2);
        if (grown < 1 || !(fl[0] || fl[1])) continue; ps.set(pts[i][0], pts[i][1], C.hielo[0]);
        tw.forEach(([tx, ty], side) => { const full = fl[side], len = Math.min(full, grown);
          for (let j = 1; j <= len; j++) ps.set(pts[i][0] + tx * j, pts[i][1] + ty * j, j === full ? C.hielo[0] : C.hielo[1]); });
      }
      ps.draw(c, g.put, 8); c.restore(); } };

    /* 5. LA CADENA DE ORO: eslabones de frente (un aro ovalado con su hueco, girado a la diagonal más cercana) y de canto (una barra de 2 que
       cruza los huecos siguiendo la línea de verdad). Se pintan en orden, cada uno con su contorno: la barra pasa por encima de un aro y por
       debajo del siguiente, como una cadena enlazada */
    /* los dos eslabones de frente, dibujados a mano: el recto (9 x 5) y el diagonal (10 x 9, simétrico al girar 180 grados); el hueco (o) se
       queda en tinta. Los otros dos son sus espejos exactos. De canto: barra de 1 en recto y de 2 (escalera llena) en diagonal */
    const LINK_H = ["..#####..", ".#######.", "##ooooo##", ".#######.", "..#####.."];
    const LINK_D = ["..##.......", ".####......", "##oo##.....", "##ooo##....", ".##ooo##...", "..##ooo##..", "...##ooo##.", "....##oo##.", ".....####..", "......##..."];
    const LINK = {};
    function linkSpr(q) { if (LINK[q]) return LINK[q];
      const rows = q % 2 ? LINK_D : LINK_H, h = rows.length, w = rows[0].length, set = new Set(), hole = [], out = [];
      rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === ".") return; let X = x - (w >> 1), Y = y - (h >> 1); if (q === 2) [X, Y] = [Y, X]; if (q === 3) X = -X; if (ch === "#") set.add(X + "," + Y); else hole.push([X, Y]); }));
      set.forEach(kk => { const [x, y] = kk.split(",").map(Number), up = !set.has(x + "," + (y - 1)), dn = !set.has(x + "," + (y + 1));
        out.push([x, y, up && y < 0 ? C.oro[0] : dn && y > 0 ? C.oro[3] : up ? C.oro[1] : C.oro[2]]); });
      return (LINK[q] = { px: out, hole }); }
    LIN.cadena = { p: 150, draw(c, a, b, e, o) {
      const g = geo(c, a, b, o), q = dir8(g.ux, g.uy) % 4, m = Math.max(1, Math.round(g.L / (q % 2 ? 16 : 14))), spr = linkSpr(q), sp = g.L / m;
      const at = u => [g.A[0] + g.dx * u, g.A[1] + g.dy * u], up = Math.abs(g.ux) >= Math.abs(g.uy) ? [0, -1] : [g.ux * g.uy > 0 ? 1 : -1, 0];
      /* primero los eslabones de canto (por debajo), que entran 2 píxeles en el hueco de los de frente; luego los de frente, con el hueco abierto:
         por él se ve la punta del de canto, o el mapa */
      const bars = new PS();
      for (let i = 0; i < m; i++) { if ((i + .5) / m > e + 1e-6) break;
        const s0 = at((i + 2 / sp) / m).map(Math.round), s1 = at((i + 1 - 2 / sp) / m).map(Math.round), line = bres(s0[0], s0[1], s1[0], s1[1]);
        if (q % 2) line.forEach(([x, y]) => bars.set(x + up[0], y + up[1], C.oro[0])); line.forEach(([x, y]) => bars.set(x, y, q % 2 ? C.oro[2] : C.oro[1])); }
      bars.draw(c, g.put, 8);
      for (let i = 0; i <= m; i++) { if (i / m > e + 1e-6) break;
        const [fx, fy] = at(i / m).map(Math.round), ring = new PS(); spr.px.forEach(([x, y, col]) => ring.set(fx + x, fy + y, col));
        spr.hole.forEach(([x, y]) => ring.set(fx + x, fy + y, null, 0));                     // el hueco: sin tinta ni color
        ring.draw(c, g.put, 8); }
      c.restore(); } };

    /* RETOQUE. LA DE LA CASA, AL PÍXEL: la misma línea de puntos (un punto cada 5 píxeles de arte = 10 px, como el setLineDash [1, 9]), cada punto
       una pepita de papel con su contorno de tinta redondo (los de la mesa puesta); paso exacto en el eje mayor, así el ritmo no baila */
    T.casa.lin = { draw(c, a, b, e, o) {
      const g = geo(c, a, b, o), ex = g.dx / g.Lc, ey = g.dy / g.Lc, ps = new PS(), paper = (o && o.paper) || "#f2e9d6";
      for (let j = 0; j * 5 <= g.Lc * e + 1e-6; j++) { const x = Math.round(g.A[0] + j * 5 * ex), y = Math.round(g.A[1] + j * 5 * ey); ps.set(x, y, paper); }
      ps.draw(c, g.put, 4, (o && o.ink) || INK); c.restore(); } };

    /* ============================================================ DIANAS ============================================================ */

    /* 6. EL PLENO: un aro de ruleta de 12 casillas alrededor del lugar (radio 14 a 18, trastes de oro). Las casillas se encienden en corro, una tras
       otra y cada vez más deprisa, y la última es la verde de arriba, que destella. Simétrico al píxel (el aro depende de |x| e |y|) */
    const PLENO = (() => { const out = [], R0 = 13.5, R1 = 18.5, F = [15, 45, 75].map(v => v * Math.PI / 180);
      for (let y = -19; y <= 19; y++) for (let x = -19; x <= 19; x++) { const d = Math.hypot(x, y); if (d < R0 || d >= R1) continue;
        const af = Math.atan2(Math.abs(x), Math.abs(y)), fret = F.some(f => d * Math.abs(Math.sin(af - f)) < .5);
        const s = ((Math.round(Math.atan2(x, -y) / (Math.PI / 6)) % 12) + 12) % 12, edge = d >= R1 - 1 ? (y < 0 ? 0 : 1) : d < R0 + 1 ? (y > 0 ? 0 : 1) : 1;
        out.push([x, y, fret ? -1 : s, edge]); }
      return out; })();
    const PLENO_T = (() => { const t = [], ord = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]; let at = .1; ord.forEach((s, j) => { t[s] = at; at += .115 * Math.pow(.84, j); }); return t; })();
    DIA.pleno = { ring: 1, p: 300, draw(c, x, y, t, P, o) { if (t > DIA_LEN) return; const { X, Y, k } = diaBegin(c, x, y, o), ps = new PS();
      const tg = PLENO_T[0], flash = t >= tg && t < tg + .42 && Math.floor((t - tg) / .06) % 2 === 0;
      for (const [gx, gy, s, edge] of PLENO) {
        if (s < 0) { ps.set(gx, gy, t >= tg ? C.oro[1] : C.oro[2]); continue; }
        const pal = s === 0 ? C.verde : s % 2 ? C.rojo : C.negro, on = t >= PLENO_T[s], fresh = on && t < PLENO_T[s] + .07;
        let col = !on ? mixC(pal[1], INK, .6) : fresh ? pal[0] : edge === 0 ? pal[0] : pal[1];
        if (s === 0 && on) col = flash ? WHITE : edge === 0 || t < tg + .42 ? pal[0] : pal[1];
        ps.set(gx, gy, col);
      }
      layer(c, X, Y, k, 21, Math.min(1, t / .08) * fade(t, 1.05, DIA_LEN), (g, put) => ps.draw(g, put, 4)); c.restore(); } };

    /* 7. EL ZARPAZO: tres arañazos de gato en diagonal rasgan el mapa a la derecha del lugar, de golpe (de arriba abajo, casi a la vez). El corte
       es negro (se ve la mesa de debajo) y el papel rasgado asoma en los bordes: fibras blancas arriba, el canto gris claro abajo. Tiembla un instante */
    const ZARPA = (() => { const out = [], cx = 12, cy = -8;
      [[-1, 7, 1], [0, 9, 0], [1, 7, -1]].forEach(([m, h, j0], si) => {
        for (let j = -h; j <= h; j++) { const q = Math.abs(j) / h, w = q < .45 ? 3 : q < .8 ? 2 : 1, x0 = cx + m * 3 + j + j0, y0 = cy + m * 3 - j - j0;
          const lo = w === 3 ? -1 : 0, hi = w >= 2 ? 1 : 0, ord = (h - j) / (2 * h);
          for (let s = lo; s <= hi; s++) out.push([x0 + s, y0, "#0a0a0c", si, ord]);
          const hs = (j * 7 + m * 3 + 21) % 5, hs2 = (j * 3 + m * 5 + 30) % 4;
          if (hs !== 0 || q < .3) out.push([x0 + lo - 1, y0, "#f3f0fa", si, ord]);                      // el borde de arriba: fibras de papel, con algún hueco
          if (hs2 === 0 && hs !== 0 && q < .8) out.push([x0 + lo - 2, y0, "#f3f0fa", si, ord]);                     // y alguna fibra que asoma
          if (q < .92) out.push([x0 + hi + 1, y0, "#c9cde0", si, ord]);              // el de abajo, el canto del papel en sombra
        } });
      return out; })();
    DIA.zarpazo = { ring: 1, p: 250, draw(c, x, y, t, P, o) { if (t > DIA_LEN) return; const { X, Y, k } = diaBegin(c, x, y, o);
      const sh = t > .1 && t < .34 ? [2, -2, 1, -1, 1, 0][Math.floor((t - .1) / .04)] || 0 : 0;
      layer(c, X + sh * k, Y, k, 24, fade(t, 1.0, DIA_LEN), (g, put) => { for (const [gx, gy, col, si, ord] of ZARPA) { if (t < si * .035 + ord * .07) continue; g.fillStyle = col; put(gx, gy); } });
      c.restore(); } };

    /* 8. LA X DEL TESORO: dos brochazos rojos (3 píxeles de ancho, con su luz y su sombra, punta seca al final) pintan la X sobre el lugar, y el
       mapa alrededor se tuesta: un círculo de pergamino quemado de borde irregular (carbón, marrón y el tostado dentro) que se extiende un poco */
    const BURN_N = a => Math.round(1.1 * Math.sin(5 * a + 1) + .8 * Math.sin(9 * a + 2.3) + .5 * Math.sin(14 * a + .7));
    function xStroke(dir, rev) {           // dir 1: «\», -1: «/»; rev: progreso 0-1
      const ps = new PS(), H = 8;
      for (let j = -H; j <= H; j++) { const q = (j + H) / (2 * H); if (q > rev) break;
        const x0 = j, y0 = dir * j, w = q > .86 ? 0 : 1, wl = q > .93 ? 0 : 1;                            // la punta se seca: primero cae un lado, luego el otro
        const sideA = dir > 0 ? [x0 + 1, y0] : [x0 - 1, y0], sideB = dir > 0 ? [x0 - 1, y0] : [x0 + 1, y0]; // A: arriba (luz), B: abajo (sombra)
        ps.set(x0, y0, C.rojo[1]); if (w) ps.set(sideA[0], sideA[1], C.rojo[0]); if (wl) ps.set(sideB[0], sideB[1], C.rojo[2]);
        if (q < .12) { ps.set(x0, y0 + (dir > 0 ? -1 : -1), C.rojo[0]); }                                   // el arranque del pincel, más cargado
      }
      return ps; }
    DIA.equis = { ring: 1, p: 250, draw(c, x, y, t, P, o) { if (t > DIA_LEN) return; const { X, Y, k } = diaBegin(c, x, y, o);
      layer(c, X, Y, k, 22, fade(t, 1.0, DIA_LEN), (g, put) => {
        const qb = clamp01((t - .26) / .5), R = 4 + 13 * easeOut(qb);
        if (qb > 0) { const ps = new PS(), R2 = Math.ceil(R + 3);
          for (let gy = -R2; gy <= R2; gy++) for (let gx = -R2; gx <= R2; gx++) { const d = Math.hypot(gx, gy), r = R + BURN_N(Math.atan2(gy, gx)), dl = r - d; if (dl < 0) continue;
            /* el frente quema en naranja mientras avanza y se enfría a marrón cuando para */
            const col = dl < 1 ? "#0a0a0c" : dl < 2 ? (qb < 1 ? C.oro[3] : "#3c240a") : dl < 3 ? rgba("#6e3414", .85) : dl < 5 ? rgba("#c46a1b", .45) : rgba("#c46a1b", .28);
            ps.set(gx, gy, col, 0); }
          ps.draw(g, put, 0); }
        xStroke(1, clamp01(t / .13)).draw(g, put, 8); if (t > .15) xStroke(-1, clamp01((t - .15) / .13)).draw(g, put, 8); });
      c.restore(); } };

    /* 9. EL RÓTULO DE NEÓN: «¡DIANA!» (res.t1, la letra del juego pasada a píxeles) en tubo rosa con su núcleo y halo, sobre una placa oscura con su
       marco de neón turquesa. Se enciende primero el marco y luego letra a letra, cada una con su parpadeo de arranque. Fijo a la altura del sello */
    const TXT = {};
    function textPix(tx, fam, fs) {                                            // letra a letra, en x entera y con 1 píxel de aire: nada se pega
      const key = tx + "|" + fam + "|" + fs; if (TXT[key]) return TXT[key];
      const cv = document.createElement("canvas"), g = cv.getContext("2d"), font = `${fs}px ${fam}`, chars = [...tx]; g.font = font;
      const adv = chars.map(ch => Math.max(1, Math.round(g.measureText(ch).width)) + 1), W = adv.reduce((s1, v) => s1 + v, 4), H = fs * 2;
      cv.width = W; cv.height = H; g.font = font; g.textBaseline = "alphabetic"; g.fillStyle = "#fff";
      let ax = 2; const own = []; chars.forEach((ch, i) => { g.fillText(ch, ax, Math.round(fs * 1.4)); own.push(ax + adv[i]); ax += adv[i]; });
      const d = g.getImageData(0, 0, W, H).data, pix = []; let x0 = W, x1 = 0, y0 = H, y1 = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 127) { pix.push([x, y]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const cxm = Math.floor((x0 + x1) / 2), cym = Math.floor((y0 + y1) / 2);
      const out = { pix: pix.map(([x, y]) => [x - cxm, y - cym, Math.max(0, own.findIndex(b => x < b))]), w: x1 - x0 + 1, h: y1 - y0 + 1, n: chars.length, x0: x0 - cxm, y0: y0 - cym };
      const ok = !document.fonts || document.fonts.check(font); if (ok) TXT[key] = out; return out;
    }
    const FLICK = [1, 0, 0, 1, 0, 1, 1, 0, 1];                                   // el arranque de un tubo, en pasos de 25 ms
    const lit = (t, t0) => t >= t0 && (t - t0 >= FLICK.length * .025 || FLICK[Math.floor((t - t0) / .025)]);
    DIA.rotulo = { p: 300, draw(c, x, y, t, P, o) { if (t > DIA_LEN) return; const { X, Y, k } = diaBegin(c, x, y, o);
      const fam = (getComputedStyle(document.documentElement).getPropertyValue("--serif") || "").trim() || "'Jersey 15', sans-serif";
      const raw = A.t ? A.t("res.t1") : "¡Diana!", tx = raw.toLocaleUpperCase(), tp = textPix(tx, fam, 15);
      const up = (o && o.up) || 52, cy0 = -up;
      const pw = tp.w + 10 + (tp.w % 2 ? 1 : 0), ph = tp.h + 10 + (tp.h % 2 ? 1 : 0), L0 = -(pw >> 1), T0 = -(ph >> 1), R0 = L0 + pw - 1, B0 = T0 + ph - 1;
      layer(c, X, Y + cy0 * k, k, Math.max(pw, ph) / 2 + 2 | 0, Math.min(1, t / .08) * fade(t, 1.1, DIA_LEN), (c, put) => {
      const plate = new PS(); for (let gy = T0; gy <= B0; gy++) for (let gx = L0; gx <= R0; gx++) { const cr = (gx === L0 || gx === R0) && (gy === T0 || gy === B0); if (!cr) plate.set(gx, gy, "#1d0a3d"); }
      plate.draw(c, put, 4);
      const stut = t > .98 && t < 1.04;                                         // un tartamudeo de todo el rótulo antes de apagarse
      /* el marco: un tubo de 1 píxel a 2 del borde, con su halo hacia dentro */
      const fOn = !stut && lit(t, .04), fr = new PS();
      for (let gx = L0 + 2; gx <= R0 - 2; gx++) for (const gy of [T0 + 2, B0 - 2]) fr.set(gx, gy, 1);
      for (let gy = T0 + 3; gy <= B0 - 3; gy++) for (const gx of [L0 + 2, R0 - 2]) fr.set(gx, gy, 1);
      fr.del(L0 + 2, T0 + 2); fr.del(R0 - 2, T0 + 2); fr.del(L0 + 2, B0 - 2); fr.del(R0 - 2, B0 - 2);
      if (fOn) { c.fillStyle = rgba("#0dbeaf", .35); fr.m.forEach(([gx, gy]) => { for (const [a, b] of N4) if (!fr.has(gx + a, gy + b) && gx + a > L0 + 1 && gx + a < R0 - 1 && gy + b > T0 + 1 && gy + b < B0 - 1) put(gx + a, gy + b); }); }
      c.fillStyle = fOn ? "#5ef2df" : "#08787f"; fr.m.forEach(([gx, gy]) => put(gx, gy));
      /* las letras: cristal apagado hasta que se encienden; encendidas, núcleo claro, borde rosa y halo */
      const on = i => !stut && lit(t, .2 + i * .075), txp = new Map(); tp.pix.forEach(([gx, gy, i]) => txp.set(gx + "," + gy, i));
      const halo = new Map(); tp.pix.forEach(([gx, gy, i]) => { if (!on(i)) return; for (const [a, b] of N4) { const kk = (gx + a) + "," + (gy + b); if (!txp.has(kk)) halo.set(kk, [gx + a, gy + b]); } });
      c.fillStyle = rgba(C.neon, .3); halo.forEach(([gx, gy]) => put(gx, gy));
      tp.pix.forEach(([gx, gy, i]) => { const edge = N4.some(([a, b]) => !txp.has((gx + a) + "," + (gy + b)));
        c.fillStyle = on(i) ? (edge ? C.neon : C.neonN) : (edge ? "#4a1d96" : "#6e40c4"); put(gx, gy); }); });
      c.restore(); } };

    /* 10. LA HELADA: el mapa se hiela alrededor del lugar. Ocho ramas de escarcha (rectas y diagonales, con sus ramitas a 45 grados) crecen desde el
       centro con un velo helado detrás; al llegar, cuaja un aro de hielo con su brillo. Luego se funde: el blanco se vuelve agua azul y se retira */
    const HELADA = (() => { const out = new Map(), put = (x, y, col, g) => { const kk = x + "," + y, v = out.get(kk); if (!v || v[3] > g) out.set(kk, [x, y, col, g]); };
      for (let q = 0; q < 8; q++) { const [dx, dy] = D8[q], diag = dx && dy, L = diag ? 10 : 14, tw = [D8[(q + 1) % 8], D8[(q + 7) % 8]];
        for (let i = 1; i <= L; i++) { const g = diag ? i * 1.41 : i; put(dx * i, dy * i, i >= L - 1 ? C.hielo[0] : C.hielo[1], g);
          const tl = diag ? { 5: 1, 7: 2 }[i] : { 5: 2, 9: 2, 12: 1 }[i];
          if (tl) for (const [tx, ty] of tw) for (let j = 1; j <= tl; j++) put(dx * i + tx * j, dy * i + ty * j, j === tl ? C.hielo[0] : C.hielo[2], g + j); } }
      return [...out.values()]; })();
    DIA.helada = { ring: 1, p: 250, draw(c, x, y, t, P, o) { if (t > DIA_LEN) return; const { X, Y, k } = diaBegin(c, x, y, o);
      const grow = 17 * easeOut(clamp01(t / .5)), melt = clamp01((t - .95) / .4), front = grow - 17 * melt, wet = t > .85;
      layer(c, X, Y, k, 20, 1 - melt * .6, (c, put) => {
      const veil = new PS(), Rv = Math.min(16, front); for (let gy = -16; gy <= 16; gy++) for (let gx = -16; gx <= 16; gx++) { const d = Math.hypot(gx, gy); if (d <= Rv) veil.set(gx, gy, rgba("#7ac8ff", d > Rv - 2 ? .34 : .22), 0); }
      veil.draw(c, put, 0);
      const ps = new PS(); for (const [gx, gy, col, g] of HELADA) if (g <= front) ps.set(gx, gy, wet && col === C.hielo[0] ? C.hielo[1] : wet && col === C.hielo[1] ? C.hielo[2] : col);
      ps.set(0, 0, wet ? C.hielo[2] : C.hielo[0]);
      if (grow >= 15.5 && melt < .5) { const ring = new PS(), sw = clamp01((t - .5) / .35);   // el aro cuaja; un brillo lo recorre de arriba abajo por los dos lados
        for (let gy = -18; gy <= 18; gy++) for (let gx = -18; gx <= 18; gx++) { const d = Math.hypot(gx, gy); if (d < 15.5 || d >= 17.5) continue;
          const a = Math.atan2(Math.abs(gx), -gy) / Math.PI, shine = sw > 0 && sw < 1 && Math.abs(a - sw) < .06;
          ring.set(gx, gy, shine ? WHITE : d >= 16.5 ? (gy < 0 ? C.hielo[0] : C.hielo[2]) : (gy > 0 ? C.hielo[0] : C.hielo[2])); }
        ring.draw(c, put, 4); }
      ps.draw(c, put, 8, C.hielo[4]); });
      c.restore(); } };

    /* 11. TOQUE DE MIDAS: un aro de oro (3 píxeles, luz arriba) se abre desde el lugar y deja el mapa dorado dentro; un brillo barre el disco de arriba
       abajo (y recorre el aro a su paso), y todo se apaga */
    DIA.midas = { ring: 1, p: 300, draw(c, x, y, t, P, o) { if (t > DIA_LEN) return; const { X, Y, k } = diaBegin(c, x, y, o);
      const q = clamp01(t / .45), R = 3 + 14 * (1 - (1 - q) ** 3), sw = clamp01((t - .5) / .4), band = -R - 3 + (2 * R + 6) * sw;
      const tint = new PS(), ring = new PS(), Ri = Math.ceil(R + 1);
      for (let gy = -Ri; gy <= Ri; gy++) for (let gx = -Ri; gx <= Ri; gx++) { const d = Math.hypot(gx, gy), inB = sw > 0 && sw < 1 && gy >= Math.round(band) - 1 && gy <= Math.round(band) + 1;
        if (d < R - 2.5) tint.set(gx, gy, inB ? rgba("#fff3b0", .7) : rgba("#f5a623", .58), 0);
        else if (d < R + .5) ring.set(gx, gy, inB ? WHITE : d >= R - .5 ? (gy < 0 ? C.oro[0] : C.oro[2]) : d >= R - 1.5 ? C.oro[1] : (gy > 0 ? C.oro[0] : C.oro[2])); }
      layer(c, X, Y, k, 20, Math.min(1, t / .05) * fade(t, 1.05, DIA_LEN), (g, put) => { tint.draw(g, put, 0); ring.draw(g, put, 4); });
      c.restore(); } };

    /* RETOQUE. LLUVIA DE FICHAS, SIN NADA QUE VUELE (misma pieza, mismo id): las fichas se apilan de golpe en el lugar, una torre que crece ficha a
       ficha (cada una aparece solo su propio grosor por encima y se asienta), se asienta toda al final con un leve vaivén de las de arriba, y se
       desvanece. Las fichas son las del juego (mismos colores y las incrustaciones blancas de chipSpr), vistas de lado para poder apilarlas */
    const STACK = {};
    const stackSpr = col => STACK[col] || (STACK[col] = artCv(13, 8, (x, y) => {
      const dx = x - 6, top = ((dx) / 5.45) ** 2 + ((y - 2) / 2.2) ** 2 <= 1, side = y >= 2 && y <= 4 && Math.abs(dx) <= 5 && !top, low = ((dx) / 5.45) ** 2 + ((y - 4) / 2.2) ** 2 <= 1 && y > 2;
      if (top) return (dx === 0 && y === 1) || (Math.abs(dx) === 4 && y === 2) ? "W" : y <= 1 ? "L" : "M";
      if (side || low) return Math.abs(dx) === 3 || dx === 0 ? "W" : y >= 5 ? "D" : "M";
      return 0; }, { M: col, L: mixC(col, WHITE, .45), D: mixC(col, INK, .3), W: WHITE }));
    DIA.lluvia.draw = function (c, x, y, t, P, o) { if (t > DIA_LEN) return; const { X, Y, k } = diaBegin(c, x, y, o);
      const n = 6, step = 3;
      const T0 = i => .04 + i * .085 * (1 - i * .06), last = T0(n - 1);
      layer(c, X, Y, k, 24, fade(t, 1.05, DIA_LEN), (c, put, X, Y) => { for (let i = 0; i < n; i++) { const ti = T0(i); if (t < ti) break;
        const drop = t < ti + .035 ? step : 0, wob = i >= n - 3 && t > last + .06 && t < last + .16 ? (t < last + .11 ? 1 : -1) * (i === n - 1 ? 1 : i === n - 2 ? 1 : 0) : 0;
        const cv = stackSpr(CHIPC[i % 4]); c.drawImage(cv, X - (k >> 1) + (wob - 6) * k, Y - (k >> 1) + (-6 - i * step - drop) * k, cv.width * k, cv.height * k); } });
      c.restore(); };

    /* RETOQUE. NAIPES, SIN NADA QUE VUELE (misma pieza, mismo id): un abanico de 9 naipes boca arriba (los de cardSpr) que se abre sobre el lugar,
       carta a carta desde el centro hacia los dos lados a la vez, deslizándose sobre la mesa como cuando el crupier extiende la baraja; los de fuera,
       un poco más bajos. Simétrico: la de en medio queda encima de todas */
    DIA.naipes.draw = function (c, x, y, t, P, o) { if (t > DIA_LEN) return; const { X, Y, k } = diaBegin(c, x, y, o);
      layer(c, X, Y, k, 24, Math.min(1, t / .05) * fade(t, 1.05, DIA_LEN), (c, put, X, Y) => {
        for (let a = 4; a >= 0; a--) for (const sg of a ? [-1, 1] : [1]) {
          const q = easeOut(clamp01((t - .06 - a * .07) / .14)), tx = sg * a * 4 * q, ty = Math.round(a * a * .4) * q;
          const cv = cardSpr(7, 0, a % 2 === 0);
          c.drawImage(cv, X - (k >> 1) + (Math.round(tx) - 4) * k, Y - (k >> 1) + (Math.round(ty) - 5 - 8) * k, cv.width * k, cv.height * k); } });
      c.restore(); };

    /* ------------------------------------------------------------ los nombres (es|en|fr|pt|de|it||zh|ko|ja|ru|pl) */
    Object.assign(N, {
      casillas: "Casillas de ruleta|Roulette squares|Cases de roulette|Casas da roleta|Roulettefelder|Caselle della roulette||轮盘格子|룰렛 칸|ルーレットのマス|Клетки рулетки|Pola ruletki",
      huellas: "Las huellas de Comodín|Comodín's paw prints|Les empreintes de Joker|As pegadas do Coringa|Comodíns Pfotenabdrücke|Le impronte di Jolly||Comodín 的爪印|코모딘의 발자국|コモディンの足あと|Следы Комодина|Ślady Comodína",
      tubo: "El tubo de neón|The neon tube|Le tube néon|O tubo de neon|Die Neonröhre|Il tubo al neon||霓虹灯管|네온관|ネオン管|Неоновая трубка|Neonowa rurka",
      escarcha: "La escarcha|Hoarfrost|Le givre|A escarcha|Der Raureif|La brina||冰霜线|서리 줄기|霜の筋|Иней|Szron",
      cadena: "La cadena de oro|The gold chain|La chaîne en or|A corrente de ouro|Die Goldkette|La catena d'oro||金链|금 사슬|金の鎖|Золотая цепь|Złoty łańcuch",
      pleno: "El pleno|Straight up|Le plein|O pleno|Plein|Il pieno||单号命中|스트레이트|ストレートアップ|Ставка на число|Pojedynczy",
      zarpazo: "El zarpazo|The claw swipe|Le coup de griffe|O arranhão|Der Krallenhieb|La zampata||猫爪一挠|할퀴기|ひっかき|Удар когтями|Drapnięcie",
      equis: "La X del tesoro|X marks the spot|Le X du trésor|O X do tesouro|Das Schatz-X|La X del tesoro||藏宝之X|보물의 X|宝のバツ印|Крестик сокровища|X skarbu",
      rotulo: "El rótulo de neón|The neon sign|L'enseigne néon|O letreiro de neon|Das Neonschild|L'insegna al neon||霓虹招牌|네온 간판|ネオンサイン|Неоновая вывеска|Neonowy szyld",
      helada: "La helada|The big freeze|Le gel|A geada|Der Frost|La gelata||冰封|결빙|凍結|Заморозок|Przymrozek",
      midas: "Toque de Midas|Midas touch|Toucher de Midas|Toque de Midas|Midas-Touch|Tocco di Mida||点石成金|미다스의 손|ミダスの手|Прикосновение Мидаса|Dotyk Midasa",
    });
  });
})(window.AIQ);
