/*
 * Geolite - PUNTERO (v0.10). El puntero es la HERRAMIENTA del jugador: un retículo de pixel art que reacciona al mapa (mar / tierra), a la
 * herramienta activa (sonar, brújula) y a las reliquias: linterna (haz de luz), lupa (fronteras verdaderas), coordenadas, guías, mira telescópica...
 * Todo va en DOM/canvas pequeño; las capas de retos (js/challenges.js) leen su posicion en --px / --py.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id);
  const P = A.pointer = { st: { tool: null, fx: {}, noCountry: false, windFn: null, distFn: null }, x: -99, y: -99, rx: -99, ry: -99, m: null, on: false, press: 0 };
  let lastDraw = 0, sx = 0, sy = 0, jx = 0, jy = 0, tj = 0, lastNow = 0, hotCol = null, hotAt = 0, hotKm = 1e9;
  let hx = 0, hy = 0, lagT = 0, wox = 0, woy = 0, wlx = null, wly = null, beatN = -1;   // tanda 8: retraso a saltos, oposicion del viento y latidos del Pulso
  /* Pulso (tanda 8): el temblor va al ritmo de un corazon, dos latidos cada 0,82 s; entre latido y latido la mano se calma */
  const BEAT = 820, beat = now => { const ph = now % BEAT; return Math.exp(-ph / 70) + (ph >= 190 ? 0.75 * Math.exp(-(ph - 190) / 70) : 0); };
  let aimEl = null, cvL = 0, cvT = 0, vis = true;   // carta de la mano bajo el RETICULO (no bajo el raton), origen del lienzo en pantalla y si el reticulo se ve (Cursor fantasma)
  let map = null, root, cv, c, tag, windEl, mag, mctx, guideX, guideY, ghost, raf = 0, mask = null, lastLL = null, lastLand = null, lastTick = 0, lastHov = 0, lastName = "", pulse = 0;

  /* mascara de tierra (equirrectangular, 720x360) para saber si el puntero esta sobre mar o tierra sin coste */
  function buildMask() {
    if (mask || !map || !map.world) return;
    const w = 720, h = 360, cn = document.createElement("canvas"); cn.width = w; cn.height = h; const g = cn.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff";
    for (const f of map.world.features) for (const poly of f.polys) for (const sh of [0, -360, 360]) {
      g.beginPath(); for (const ring of poly.rings) { ring.forEach(([lo, la], i) => { const x = (lo + sh + 180) * 2, y = (90 - la) * 2; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); } g.fill("evenodd");
    }
    const d = g.getImageData(0, 0, w, h).data; mask = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) mask[i] = d[i * 4] > 127 ? 1 : 0;
  }
  const landAt = (lon, lat) => { if (!mask) return false; const x = Math.floor((((lon + 180) % 360) + 360) % 360 * 2), y = Math.floor(clampN((90 - lat) * 2, 0, 359)); return mask[y * 720 + Math.min(719, x)] === 1; };
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

  /* nombres de pais traducidos (clave: nombre Natural Earth en ingles) */
  let CN = null;
  /* v0.2.15: territorios del mapa que no son pais de ninguna pregunta (antes salian en ingles: "Tu chincheta: Somaliland", "Greenland") */
  const TERR = {
    "W. Sahara": "Sáhara Occidental|Western Sahara|Sahara occidental|Saara Ocidental|Westsahara|Sahara Occidentale||西撒哈拉|서사하라|西サハラ|Западная Сахара|Sahara Zachodnia",
    "Somaliland": "Somalilandia|Somaliland|Somaliland|Somalilândia|Somaliland|Somaliland||索马里兰|소말릴란드|ソマリランド|Сомалиленд|Somaliland",
    "Antarctica": "Antártida|Antarctica|Antarctique|Antártida|Antarktis|Antartide||南极洲|남극|南極大陸|Антарктида|Antarktyda",
    "N. Cyprus": "Chipre del Norte|Northern Cyprus|Chypre du Nord|Chipre do Norte|Nordzypern|Cipro del Nord||北塞浦路斯|북키프로스|北キプロス|Северный Кипр|Cypr Północny",
    "Puerto Rico": "Puerto Rico|Puerto Rico|Porto Rico|Porto Rico|Puerto Rico|Porto Rico||波多黎各|푸에르토리코|プエルトリコ|Пуэрто-Рико|Portoryko",
    "Falkland Is.": "Islas Malvinas|Falkland Islands|Îles Malouines|Ilhas Malvinas|Falklandinseln|Isole Falkland||福克兰群岛|포클랜드 제도|フォークランド諸島|Фолклендские острова|Falklandy",
    "New Caledonia": "Nueva Caledonia|New Caledonia|Nouvelle-Calédonie|Nova Caledônia|Neukaledonien|Nuova Caledonia||新喀里多尼亚|누벨칼레도니|ニューカレドニア|Новая Каледония|Nowa Kaledonia",
    "Fr. Polynesia": "Polinesia Francesa|French Polynesia|Polynésie française|Polinésia Francesa|Französisch-Polynesien|Polinesia francese||法属波利尼西亚|프랑스령 폴리네시아|フランス領ポリネシア|Французская Полинезия|Polinezja Francuska",
    "Hong Kong": "Hong Kong|Hong Kong|Hong Kong|Hong Kong|Hongkong|Hong Kong||香港|홍콩|香港|Гонконг|Hongkong",
    "Macao": "Macao|Macau|Macao|Macau|Macau|Macao||澳门|마카오|マカオ|Макао|Makau",
    "Faeroe Is.": "Islas Feroe|Faroe Islands|Îles Féroé|Ilhas Faroé|Färöer|Isole Fær Øer||法罗群岛|페로 제도|フェロー諸島|Фарерские острова|Wyspy Owcze",
    "Fr. S. Antarctic Lands": "Tierras Australes Francesas|French Southern Lands|Terres australes françaises|Terras Austrais Francesas|Französische Süd-Gebiete|Terre australi francesi||法属南部领地|프랑스령 남방 지역|フランス領南方地域|Французские Южные территории|Francuskie Terytoria Południowe",
    "S. Geo. and the Is.": "Georgia del Sur|South Georgia|Géorgie du Sud|Geórgia do Sul|Südgeorgien|Georgia del Sud||南乔治亚|사우스조지아|サウスジョージア|Южная Георгия|Georgia Południowa",
  };
  const PC_EN = { Greenland: "Greenland", "Curaçao": "Curaçao", Aruba: "Aruba", "Cook Is.": "Cook Islands" };   // estos si vienen en A.PCOUNTRY (por su nombre ingles)
  const countryName = f => {
    if (!CN) { CN = {}; (A.PLACES || []).forEach(r => { if (r[1] === "country") CN[r[0].slice(2)] = r[6]; }); for (const ne in PC_EN) { const n = Object.values(A.PCOUNTRY || {}).find(x => x && x.en === PC_EN[ne]); if (n) CN[ne] = n; } }
    const n = CN[f.name]; return n ? A.tx(n) : TERR[f.name] ? A.pick6(TERR[f.name]) : f.name;
  };
  const countryAt = (lon, lat) => { for (const f of map.world.features) { const b = f.polys; let near = false; for (const p of b) if (lon >= p.bbox[0] - 1 && lon <= p.bbox[2] + 1 && lat >= p.bbox[1] - 1 && lat <= p.bbox[3] + 1) { near = true; break; } if (near && A.geo.inFeature(lon, lat, f)) return f; } return null; };

  /* ---------------------------------------------------------------- dibujo del reticulo (64x64, pixel a pixel) */
  const INK = "#16241c", GOLD = "#f8b449", GOLD2 = "#ffe08a", TEAL = "#5fd6b8", RED = "#fe5f55", WHITE = "#fff7e6", CYAN = "#7fe3ff";
  const px = (x, y, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); };
  function circle(cx, cy, r, col) { let x = r, y = 0, e = 1 - r; while (x >= y) { for (const [a, b] of [[x, y], [y, x], [-x, y], [-y, x], [x, -y], [y, -x], [-x, -y], [-y, -x]]) px(cx + a, cy + b, col); y++; if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; } } }
  function arc(cx, cy, r, a0, a1, col) { for (let a = a0; a < a1; a += 0.04) px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, col); }
  /* v0.2.53: marcas de perk en el anillo exterior y senal de los controles invertidos (hasta ahora el unico reto de puntero sin dibujo) */
  function marks(t, cx, cy, Ri, o) {
    if (o.halo) for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6 + t * 0.2; for (let d = Ri + 8; d <= Ri + 10; d++) px(cx + Math.cos(a) * d, cy + Math.sin(a) * d, GOLD2); }   // Foco: rayos de luz
    if (o.scope) for (let k = 0; k < 24; k++) { if (k % 6 === 0) continue; const a = (k * Math.PI) / 12, l = k % 3 === 0 ? 3 : 2; for (let d = Ri - 3; d > Ri - 3 - l; d--) px(cx + Math.cos(a) * d, cy + Math.sin(a) * d, WHITE); }   // Catalejo: graduacion de telemetro
    if (o.guard) { arc(cx, cy, Ri + 7, Math.PI * 1.1, Math.PI * 1.9, CYAN); arc(cx, cy, Ri + 8, Math.PI * 1.1, Math.PI * 1.9, "rgba(127,227,255,.45)"); for (const a of [1.1, 1.5, 1.9]) for (let d = Ri + 5; d <= Ri + 10; d++) px(cx + Math.cos(a * Math.PI) * d, cy + Math.sin(a * Math.PI) * d, CYAN); }   // Protector: escudo
    if (o.shades) { for (let k = 0; k < 6; k++) { px(cx - 9 + k, cy - 11 + k, WHITE); px(cx - 6 + k, cy - 13 + k, "rgba(255,247,230,.6)"); } arc(cx, cy, Ri - 3, Math.PI * 1.05, Math.PI * 1.45, CYAN); }   // Gafas de sol: destello en la lente
    if (o.anchor) {                                                                                      // Ancla: base gruesa y ancla bajo la chincheta
      for (let a = Math.PI * 0.3; a < Math.PI * 0.7; a += 0.03) for (let d = Ri; d <= Ri + 3; d++) px(cx + Math.cos(a) * d, cy + Math.sin(a) * d, GOLD);
      const ay = cy + Ri + 6; for (let k = 0; k < 6; k++) px(cx, ay - 3 + k, GOLD2); px(cx - 2, ay - 1, GOLD2); px(cx + 2, ay - 1, GOLD2); for (let k = -3; k <= 3; k++) px(cx + k, ay + 3 - (Math.abs(k) > 1 ? 1 : 0), GOLD2);
    }
    if (o.mirror) {                                                                                      // Controles invertidos: flechas que se miran de frente (izquierda y derecha) y/o de arriba abajo
      const sh = Math.round(Math.abs(Math.sin(t * 2)) * 3), arrow = (x, y, dx, dy) => { for (let k = 0; k < 5; k++) px(x + dx * k, y + dy * k, RED); for (const s of [-1, 1]) for (let k = 1; k <= 2; k++) px(x + dx * (5 - k) + dy * s * k, y + dy * (5 - k) + dx * s * k, RED); };
      if (o.mirror.x) { arrow(cx - Ri - 11 + sh, cy, 1, 0); arrow(cx + Ri + 11 - sh, cy, -1, 0); }
      if (o.mirror.y) { arrow(cx, cy - Ri - 11 + sh, 0, 1); arrow(cx, cy + Ri + 11 - sh, 0, -1); }
    }
  }
  function draw(now) {
    const t = now / 1000, st = P.st, land = lastLand, tool = st.tool, cx = 32, cy = 32;
    /* v0.2.53: el reticulo ensena lo que llevas. Perks = metal en el aro (oro/turquesa); retos = rojo. Cada esquina de la mira se enciende por su eje */
    const ids = (st.fx && st.fx.ids) || [], has = id => ids.includes(id), mm = P.m || {};
    const steady = has("steadyhand"), halo = has("miner"), anchor = has("plates"), shades = has("divingmask"), guard = has("protector"), scope = has("glass");
    c.clearRect(0, 0, 64, 64);
    const shrink = P.m && P.m.tinyDark ? 0.55 : 1;
    const R = (19 - (P.press > 0 ? 3 * Math.min(1, P.press / 100) : 0) + (tool ? Math.sin(t * 6) * 0.6 : 0)) * shrink;
    const ring = hotCol || (tool === "sonar" || tool === "compass" ? CYAN : land ? GOLD : TEAL);
    circle(cx, cy, Math.round(R) + 1, INK); circle(cx, cy, Math.round(R) - 2, INK);                     // borde oscuro
    circle(cx, cy, Math.round(R), ring); circle(cx, cy, Math.round(R) - 1, ring);
    if (steady) {                                                                                       // Mano firme: cuatro cierres fijos (el pulso ya no baila) y un segundo aro dorado
      circle(cx, cy, Math.round(R) + 2, GOLD2);
      for (let k = 0; k < 4; k++) { const a0 = Math.PI / 4 + (k * Math.PI) / 2 - 0.3; arc(cx, cy, Math.round(R), a0, a0 + 0.6, GOLD2); arc(cx, cy, Math.round(R) - 1, a0, a0 + 0.6, GOLD2); arc(cx, cy, Math.round(R) + 2, a0, a0 + 0.6, WHITE); }
    } else for (let k = 0; k < 3; k++) { const a0 = t * 0.9 + (k * Math.PI * 2) / 3; arc(cx, cy, Math.round(R), a0, a0 + 0.5, WHITE); arc(cx, cy, Math.round(R) - 1, a0, a0 + 0.5, WHITE); }   // segmentos que giran
    for (let k = 0; k < 4; k++) {                                                                        // muescas cardinales
      const a = (k * Math.PI) / 2, dx = Math.cos(a), dy = Math.sin(a);
      for (let d = -7; d <= 1; d++) { px(cx + dx * (R + d) + dy, cy + dy * (R + d) + dx, INK); px(cx + dx * (R + d) - dy, cy + dy * (R + d) - dx, INK); }
      for (let d = -6; d <= 0; d++) px(cx + dx * (R + d), cy + dy * (R + d), ring);
    }
    if (tool === "sonar") { const p = (t * 1.2) % 1, rr = 4 + p * (R - 6); circle(cx, cy, Math.round(rr), `rgba(127,227,255,${(1 - p).toFixed(2)})`); }
    if (tool === "compass") { const a = t * 1.4; for (let d = 3; d < 13; d++) { px(cx + Math.cos(a) * d, cy + Math.sin(a) * d, d > 9 ? RED : WHITE); } px(cx, cy - 15, WHITE); }
    // esquinas de "mira": rojas si un reto toca ese eje, turquesa si un perk lo cubre (TL pulso, TR vista, BR luz, BL controles)
    { const B = Math.round(R) + 5 + (P.press > 0 ? -2 : 0), open = tool ? 3 : 0;
      const bad = [mm.tremble || mm.dizzy, mm.cblur || mm.lag || mm.ghost, mm.blink || mm.tinyDark, mm.cmirror], good = [steady || halo, scope || guard, anchor, shades];
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], q) => {
        const col = bad[q] ? RED : good[q] ? TEAL : ring;
        for (let k = 0; k < 6; k++) {
          px(cx + sx * (B - open) - sx * k, cy + sy * (B - open), INK); px(cx + sx * (B - open), cy + sy * (B - open) - sy * k, INK);
          px(cx + sx * (B - open) - sx * k, cy + sy * (B - open), col); px(cx + sx * (B - open), cy + sy * (B - open) - sy * k, col);
        } });
      marks(t, cx, cy, Math.round(R), { halo, scope, guard, shades, anchor, mirror: mm.cmirror }); }
    if (!tool) { const a = t * 2.4; for (let d = 4; d < Math.round(R) - 2; d++) px(cx + Math.cos(a) * d, cy + Math.sin(a) * d, `rgba(255,224,138,${(0.55 * d / R).toFixed(2)})`); }
    // chincheta central
    const pin = [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
    for (const [a, b] of pin) for (const [oa, ob] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(cx + a + oa, cy + b + ob, INK);
    for (const [a, b] of pin) px(cx + a, cy + b, RED); px(cx - 1, cy - 1, WHITE); px(cx, cy - 1, "#ffb0a8");
    if (P.press > 0) { const k = 1 - P.press / 100; circle(cx, cy, Math.round(R + 2 + k * 8), `rgba(255,247,230,${(1 - k).toFixed(2)})`); }
    if (P.m && P.m.dizzy) for (let k = 0; k < 3; k++) {                                                 // Mareo: estrellitas que dan vueltas
      const a = t * 3.1 + (k * Math.PI * 2) / 3, sx = Math.round(cx + Math.cos(a) * (R + 9)), sy = Math.round(cy + Math.sin(a) * (R + 9) * 0.45 - 4), col = k === 1 ? WHITE : GOLD2;
      for (const [a2, b2] of [[0, -2], [0, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [0, 1], [0, 2]]) px(sx + a2, sy + b2, col);
    }
    if (P.m && P.m.tremble) { const hb = Math.min(1, beat(now)); if (hb > 0.2) { const k = steady ? 0.35 : 1; circle(cx, cy, Math.round(R) + 3, `rgba(254,95,85,${(hb * 0.9 * k).toFixed(2)})`); circle(cx, cy, Math.round(R) + 4, `rgba(254,95,85,${(hb * 0.45 * k).toFixed(2)})`); } }   // el latido se ve en el reticulo
    if (P.st.calm) { circle(cx, cy, Math.round(R) + 3, "rgba(150,230,255,.9)"); for (let k = 0; k < 4; k++) { const a = t * 0.4 + (k * Math.PI) / 2, sx = cx + Math.cos(a) * (R + 3), sy = cy + Math.sin(a) * (R + 3); for (const [a2, b2] of [[0, -2], [0, 2], [-2, 0], [2, 0], [0, 0], [-1, -1], [1, 1], [1, -1], [-1, 1]]) px(sx + a2, sy + b2, k % 2 ? WHITE : CYAN); } }   // Sangre fria (tanda 9): halo de escarcha
    if (P.m && P.m.cblur) defocus(P.m.cblur.px, t);
  }
  /* Cursor borroso: desenfoque optico de verdad (vision doble con aberracion cromatica), no una mancha */
  let tmp = null, tctx = null, tin = null, tinx = null;
  const tint = col => { tinx.globalCompositeOperation = "source-over"; tinx.clearRect(0, 0, 64, 64); tinx.drawImage(tmp, 0, 0); tinx.globalCompositeOperation = "source-in"; tinx.fillStyle = col; tinx.fillRect(0, 0, 64, 64); return tin; };
  function defocus(k, t) {
    if (!tmp) { tmp = document.createElement("canvas"); tmp.width = tmp.height = 64; tctx = tmp.getContext("2d"); tin = document.createElement("canvas"); tin.width = tin.height = 64; tinx = tin.getContext("2d"); }
    tctx.clearRect(0, 0, 64, 64); tctx.drawImage(cv, 0, 0); c.clearRect(0, 0, 64, 64);
    const b = (k * 0.2).toFixed(2), o = Math.min(6, k * 0.6) * (1 + Math.sin(t * 2.3) * 0.2);   // px del lienzo (x2 en pantalla)
    c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.62; c.filter = `blur(${b}px)`;
    c.drawImage(tint("#ff3d6e"), -o, -o * 0.15); c.drawImage(tint("#3de4ff"), o, o * 0.15);
    c.globalCompositeOperation = "source-over"; c.globalAlpha = 0.9; c.filter = `blur(${(k * 0.14).toFixed(2)}px)`; c.drawImage(tmp, 0, 0);
    c.restore();
  }
  /* Cursor parpadeante: tubo de neon moribundo (tramos irregulares y tartamudeo al encenderse; de media sigue apagado lo mismo) */
  const hash1 = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  function neonOn(now, b) { const u = now / 1000 / b.period, n = Math.floor(u), ph = u - n, duty = b.duty + 0.02 + (hash1(n) - 0.5) * 0.3; if (ph >= duty) return false; return ph > 0.08 || Math.floor(now / 25) % 2 === 0; }
  let ghostWas = true;

  /* "Lo que ves es lo que pulsas": con un reto que separa el reticulo del raton (invertido, mareo, retraso, viento...), las cartas de la mano de abajo se
     pulsan con el raton de verdad, y el jugador lleva el RETICULO a la carta. Si el reticulo esta encima de una carta, esa carta se ilumina y el clic la usa
     (js/map.js _tap) en vez de poner la chincheta debajo, que respondia la pregunta. Con el reticulo invisible (Cursor fantasma) no cuenta */
  const uiAt = () => { if (!P.on || !vis) return null; const el = document.elementFromPoint(cvL + P.x, cvT + P.y); return el && el.closest ? el.closest("#toolBar .tool") : null; };
  P.uiAt = uiAt;
  const markAim = el => { if (el === aimEl) return; if (aimEl) aimEl.classList.remove("aim"); if (el) el.classList.add("aim"); aimEl = el; };
  /* ---------------------------------------------------------------- bucle */
  function frame(now) {
    raf = requestAnimationFrame(frame); if (!P.on) return;
    if (P.press > 0) P.press = Math.max(0, P.press - 16);
    eff(now); apply(now); if (now - lastDraw > 30 || P.press > 0) { lastDraw = now; draw(now); }
    const fx = P.st.fx || {};
    // lat/lon bajo el puntero (a ~30 Hz) -> tierra/mar, coordenadas, pais
    if (now - lastHov > 33) {
      lastHov = now; if (aimEl && !aimEl.isConnected) aimEl = null; markAim(P.m || P.st.windFn ? uiAt() : null);
      const ll = map.screenToLonLat(P.x, P.y); lastLL = ll; const l = landAt(ll[0], ll[1]);
      if (fx.thermo && P.st.distFn) { const km = P.st.distFn(ll[0], ll[1]); if (km != null) { const col = hotColor(km); if (col !== hotCol && now - hotAt > 260) { hotCol = col; hotAt = now; } } } else hotCol = null;
      if (lastLand !== null && l !== lastLand && now - lastTick > 120) { lastTick = now; A.sfx.ptrEdge && A.sfx.ptrEdge(l); }
      lastLand = l;
      let txt = "";
      if (fx.coords) txt += `${Math.abs(ll[1]).toFixed(1)}°${ll[1] >= 0 ? "N" : "S"} ${Math.abs(ll[0]).toFixed(1)}°${ll[0] >= 0 ? "E" : "W"}`;
      if (fx.country && !P.st.noCountry && l) { const f = countryAt(ll[0], ll[1]); const nm = f ? countryName(f) : ""; if (nm) txt += (txt ? "\n" : "") + nm; }
      if (txt !== lastName) { lastName = txt; tag.textContent = txt; tag.classList.toggle("on", !!txt); }
    }
    // linea de guias
    if (fx.guides) { guideX.style.transform = `translateX(${P.x}px)`; guideY.style.transform = `translateY(${P.y}px)`; }
    // mira telescopica
    if (fx.mag && mag.classList.contains("on")) {
      const f = map.cv.width / map.W, S = 168, z = 2.4, sw = (S / z) * f; mctx.imageSmoothingEnabled = false;
      mctx.drawImage(map.cv, P.x * f - sw / 2, P.y * f - sw / 2, sw, sw, 0, 0, S, S);
      mctx.strokeStyle = "rgba(22,36,28,.9)"; mctx.lineWidth = 3; mctx.beginPath(); mctx.moveTo(S / 2 - 9, S / 2); mctx.lineTo(S / 2 + 9, S / 2); mctx.moveTo(S / 2, S / 2 - 9); mctx.lineTo(S / 2, S / 2 + 9); mctx.stroke();
      mctx.strokeStyle = "#f8b449"; mctx.lineWidth = 1.2; mctx.stroke();
      const mx = P.x + 84 + S > innerWidth ? P.x - 84 - S : P.x + 84, my = Math.max(8, P.y - 84 - S / 2);
      mag.style.transform = `translate(${mx}px,${my}px)`;
    }
    // fantasma del viento: donde caera realmente el pin
    if (P.wind && (P.wind[0] || P.wind[1])) { windEl.classList.add("on"); windEl.style.transform = `rotate(${Math.atan2(P.wind[1], P.wind[0])}rad)`; } else windEl.classList.remove("on");
    if (fx.windPreview && P.st.windFn) { const o = P.st.windFn(P.x, P.y); if (o) { ghost.style.transform = `translate(${o[0] - 9}px,${o[1] - 9}px)`; ghost.classList.add("on"); } else ghost.classList.remove("on"); } else ghost.classList.remove("on");
  }

  function show(on) {
    if (on === P.on) return; P.on = on; root.classList.toggle("on", on); document.body.classList.toggle("ptr-on", on);
    const fx = P.st.fx || {}; mag.classList.toggle("on", on && !!fx.mag); guideX.classList.toggle("on", on && !!fx.guides); guideY.classList.toggle("on", on && !!fx.guides);
    if (!on) { markAim(null); const app = $("app"); if (app) { /* deja la ultima posicion */ } if (map) map.setLens && map.setLens(null); }
  }
  /* posicion EFECTIVA del puntero: la del raton mas los retos (temblor, retraso, invertido, mareo). El clic usa esta misma posicion. */
  function eff(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - (lastNow || now)) / 1000)); lastNow = now;
    let x = P.rx, y = P.ry; const m = P.m, W = map.W, H = map.H;
    const rdx = wlx == null ? 0 : P.rx - wlx, rdy = wly == null ? 0 : P.ry - wly; wlx = P.rx; wly = P.ry;   // lo que se ha movido el raton (para el Vendaval)
    if (m && m.cmirror) { if (m.cmirror.x) x = W - x; if (m.cmirror.y) y = H - y; }   // tanda 6: izquierda y derecha, arriba y abajo o los dos
    P.pre = [x, y];                                                    // donde esta de verdad (la goma del Cursor con retraso sale de aqui)
    if (m && m.lag) {
      const a = 1 - Math.exp(-dt * 1000 / Math.max(1, m.lag.tau)); sx += (x - sx) * a; sy += (y - sy) * a;
      if (m.lag.step) { if (now - lagT >= m.lag.step) { lagT = now; hx = sx; hy = sy; } x = hx; y = hy; } else { x = sx; y = sy; }   // a saltos, como una conexion mala
    } else { sx = x; sy = y; hx = x; hy = y; }
    if (m && m.dizzy) { const t = now / 1000; x += Math.cos(t * 3.4) * m.dizzy.r; y += Math.sin(t * 3.4) * m.dizzy.r; }
    if (m && m.tremble) {
      const hb = Math.min(1, beat(now)), amp = m.tremble.px * (0.4 + 1.25 * hb);
      if (now - tj > (hb > 0.3 ? 25 : 45)) { tj = now; jx = (Math.random() - 0.5) * 2 * amp; jy = (Math.random() - 0.5) * 2 * amp; } x += jx; y += jy;
      const bn = Math.floor(now / BEAT); if (bn !== beatN) { beatN = bn; if (P.on && m.tremble.px >= 5 && A.sfx.heart) A.sfx.heart(); }   // un latido flojito (desde el nivel 2)
    }
    P.wind = null;
    if (P.st.windFn) {                                                 // Vendaval: el viento empuja el puntero
      const w = P.st.windFn(clampN(x, 0, W), clampN(y, 0, H));
      if (w) {
        /* tanda 8: y hace OPOSICION: contra el viento el raton rinde la mitad y a favor un cuarto mas; lo perdido se recupera despacio */
        const L = Math.hypot(w[0], w[1]) || 1, ux = w[0] / L, uy = w[1] / L, al = rdx * ux + rdy * uy;
        if (al < 0) { wox -= al * 0.5 * ux; woy -= al * 0.5 * uy; } else { wox += al * 0.25 * ux; woy += al * 0.25 * uy; }
        wox += ux * 26 * dt; woy += uy * 26 * dt;                        // y te arrastra: quieto, el reticulo se queda ~30 px a favor del viento
        const f = Math.exp(-dt / 1.1), wl = Math.hypot(wox, woy); wox *= f; woy *= f; if (wl > 170) { wox *= 170 / wl; woy *= 170 / wl; }
        x += w[0] + wox; y += w[1] + woy; P.wind = w;
      }
    } else { wox = woy = 0; }
    P.x = clampN(x, 0, W); P.y = clampN(y, 0, H);
  }
  function apply(now) {
    const x = P.x, y = P.y, fx = P.st.fx || {}, m = P.m; root.style.transform = `translate(${x}px,${y}px)`;
    if (A.chal && A.chal.pointer) A.chal.pointer(x, y);
    if (map && A.chal) { const r = A.chal.lensRadius ? A.chal.lensRadius() : 0; map.setLens(r > 0 ? { x, y, r } : null); }
    let a = 1, sc = 1, neon = false;
    if (m) {
      if (m.blink && !fx.noBlink) { a = neonOn(now, m.blink) ? 1 : 0; neon = a === 1; }
      if (m.ghost) {                                                   // Cursor fantasma: se disuelve en una voluta y reaparece con un destello
        const cyc = m.ghost.every + m.ghost.off, ph = (now / 1000) % cyc, gone = ph > m.ghost.every;
        if (gone) a = 0; else if (ph > m.ghost.every - 0.18) { const q = (m.ghost.every - ph) / 0.18; a = Math.min(a, q); sc = 1 + (1 - q) * 0.45; } else if (ph < 0.15) { a = Math.min(a, ph / 0.15); sc = 1.25 - (ph / 0.15) * 0.25; }
        if (gone && !ghostWas && A.chfx && A.chfx.puff) A.chfx.puff(x, y);
        ghostWas = gone;
      }
      if (m.lag && A.chfx && A.chfx.trail) { A.chfx.trail(x, y); if (A.chfx.tether && P.pre) A.chfx.tether(P.pre[0], P.pre[1], x, y); }   // Cursor con retraso: estela y goma hasta donde esta el raton
    }
    if (a === 0 && fx.beacon) a = 0.28;
    vis = a > 0.05; cv.style.opacity = a; tag.style.opacity = a;
    cv.style.transform = sc !== 1 ? `scale(${sc.toFixed(3)})` : "";
    cv.classList.toggle("neon", neon);
  }
  P.mods = () => { P.m = A.chal && A.chal.ptrMods ? A.chal.ptrMods() : null; };
  P.effective = () => (P.on ? [P.x, P.y] : null);
  /* donde ancla el zoom: con un reto que separa el reticulo del raton (espejo), bajo el RETICULO (lo que ves); si no, bajo el raton */
  P.zoomAt = (x, y) => (P.on && P.m && P.m.cmirror ? [P.x, P.y] : [x, y]);
  /* para el crupier (js/dealer.js): lon/lat bajo el reticulo (lo que ya se calcula a ~30 Hz) y el pais de un punto */
  P.ll = () => (P.on ? lastLL : null);
  P.featureAt = (lon, lat) => {                                                     // en la costa el mapa simplificado deja fuera muchas ciudades: el pais mas cercano a menos de 40 km
    if (!map || !map.world) return null; let f = countryAt(lon, lat);
    if (!f) { let best = 40; for (const g of map.world.features) { if (!g.polys.some(p => lon >= p.bbox[0] - 1 && lon <= p.bbox[2] + 1 && lat >= p.bbox[1] - 1 && lat <= p.bbox[3] + 1)) continue; const d = A.geo.distToFeature(lon, lat, g); if (d < best) { best = d; f = g; } } }
    return f;
  };
  P.nameOf = f => (f ? countryName(f) : "");
  P.countryAt = (lon, lat) => P.nameOf(P.featureAt(lon, lat));
  /* termometro: azul (lejos) -> rojo (cerca), por franjas */
  const HOT = [[6000, "#3b6bff"], [3000, "#35a7ff"], [1500, "#3fe0c8"], [700, "#7be04a"], [350, "#f2e03a"], [150, "#ffa53a"], [0, "#ff3b3b"]];
  const hotColor = km => { for (const [k, c] of HOT) if (km >= k) return c; return HOT[HOT.length - 1][1]; };

  P.init = m => {
    if (!m.screenToLonLat) return;                                   // respaldo 2D sin WebGL: se queda el cursor normal
    map = m; map.hideReticle = true; buildMask();
    root = document.createElement("div"); root.id = "ptr";
    root.innerHTML = `<canvas class="ptr-cv" width="64" height="64"></canvas><div class="ptr-tag"></div><i class="ptr-ghost"></i><i class="ptr-wind"><svg viewBox="0 0 64 16" aria-hidden="true"><path class="w1" d="M6 8H50"/><path class="w2" d="M42 2 L56 8 L42 14"/></svg></i>`;
    mag = document.createElement("canvas"); mag.id = "ptrMag"; mag.width = mag.height = 168;
    guideX = document.createElement("i"); guideX.className = "ptr-gx"; guideY = document.createElement("i"); guideY.className = "ptr-gy";
    const app = $("app"); app.append(guideX, guideY, mag, root);
    cv = root.querySelector(".ptr-cv"); c = cv.getContext("2d"); tag = root.querySelector(".ptr-tag"); ghost = root.querySelector(".ptr-ghost"); windEl = root.querySelector(".ptr-wind"); mctx = mag.getContext("2d");
    /* el reticulo entra en el lienzo (con el raton en (x, y) del lienzo): el filtro de retraso y el viento parten de donde esta el reticulo, no del raton */
    const enter = (x, y) => {
      const r = map.cv.getBoundingClientRect(); cvL = r.left; cvT = r.top; P.rx = x; P.ry = y;
      if (!P.on) { const m = P.m; sx = hx = m && m.cmirror && m.cmirror.x ? map.W - x : x; sy = hy = m && m.cmirror && m.cmirror.y ? map.H - y : y; wlx = wly = null; }
      show(true); const t = performance.now(); eff(t); apply(t);
    };
    const touchAt = e => {                                               // en tactil solo se mueven las capas (linterna, lupa); la lupa de fronteras tambien (antes solo se movia con el raton)
      if (!map.pickEnabled || e.target !== map.cv) return;
      const r = map.cv.getBoundingClientRect(); P.rx = e.clientX - r.left; P.ry = e.clientY - r.top; P.x = P.rx; P.y = P.ry;
      if (A.chal) { if (A.chal.pointer) A.chal.pointer(P.x, P.y); const lr = A.chal.lensRadius ? A.chal.lensRadius() : 0; map.setLens(lr > 0 ? { x: P.x, y: P.y, r: lr } : null); }
    };
    const move = e => {
      if (e.pointerType === "touch") { touchAt(e); return show(false); }
      const ok = map.pickEnabled && e.target === map.cv; if (!ok) return show(false);
      const r = map.cv.getBoundingClientRect(); enter(e.clientX - r.left, e.clientY - r.top);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", e => { if (e.pointerType === "mouse") move(e); }, { passive: true });   // el raton ya estaba sobre el mapa cuando se activo (pregunta nueva, fin de la pausa): sin esto no hay ni reticulo ni cursor hasta moverlo
    window.addEventListener("pointerdown", e => { if (e.pointerType === "touch") touchAt(e); }, true);   // un toque sin arrastre tambien mueve linterna y lupa (antes se quedaban donde estaban)
    window.addEventListener("pointerdown", e => { if (P.on && e.target === map.cv && e.button === 0) P.press = 100; }, true);   // solo el boton principal (el mapa ignora el derecho)
    document.addEventListener("pointerleave", () => show(false));
    const mo = new MutationObserver(() => { if (!map.pickEnabled) show(false); else if (!P.on && map.mouse) enter(map.mouse.x, map.mouse.y); }), watch = () => mo.observe(map.cv, { attributes: true, attributeFilter: ["class"] });
    watch(); document.addEventListener("aiq:mapcanvas", () => { mo.disconnect(); watch(); });   // el mapa recreo su lienzo (la GPU se reinicio)
    raf = requestAnimationFrame(frame);
  };
  /* estado desde la Aventura: herramienta activa, efectos de reliquias, pregunta de paises... */
  P.set = o => {
    Object.assign(P.st, o); const fx = P.st.fx || {};
    if (mag) { mag.classList.toggle("on", P.on && !!fx.mag); guideX.classList.toggle("on", P.on && !!fx.guides); guideY.classList.toggle("on", P.on && !!fx.guides); tag.classList.toggle("on", !!lastName); }
  };
})(window.AIQ);
