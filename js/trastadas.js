/*
 * Geolite - LAS TRASTADAS DEL CRUPIER Y DE COMODIN (bloque D). Sorpresas que rompen la cuarta pared, como las de la salida: todo en pixel art
 * a escala entera (un pixel de arte = K pixeles reales, el mismo grano para todas) en una capa por encima del juego y por debajo del crupier y del
 * gato (ninguna luz ni destello pasa por delante de el: crupier-delante-de-la-luz).
 * LA PARTIDA ES SAGRADA (revision del 22-oct): mientras contestas o lees el ticket no sale nada que la pise, ni siquiera su sello. Solo pasan
 * entre medias:
 *   cartas   Lluvia de cartas (el veredicto de la ronda, si la cerraste con una racha de 5 o mas): le saltan las cartas del abanico
 *   telon    El telon del jefe (al empezar cada jefe): se cierra un telon de terciopelo y, al abrirse, esta el en primer plano
 *   moneda   La moneda del duelo (al empezar un Duelo contra la banca): lanza su moneda al aire; suena al caer
 *   siesta   La siesta de la mesa (la portada, si no tocas nada): bosteza, se le cierran los ojos y el gato se duerme tambien
 *   desfile  El desfile (la tienda, al comprar): se lo pone y hace un pase de modelo con su halo detras
 * Solo desde la mesa del crupier (el autor, a mano; nunca solas): sello (el «¡Diana!» gigante), mapa (Comodin se pasea por el mapa), apagon (solo
 * brillan sus ojos), ventana (la ventana de mentira), guante (su guante en tu puntero) y ticket (el gato tira tu ticket).
 * REGLAS: como mucho una por ronda (A.trastadas.ronda()), nunca con el tutorial ni con la mesa del autor en directo; con Movimiento en Minimo,
 * sin temblor ni cartas que vuelan (lo mismo, quieto).
 *   A.trastadas.puede(id, ctx)  .lanza(id, ctx)  (con reglas)   .run(id, ctx) (sin reglas: la mesa del crupier)   .ronda(n)   .veredicto()
 *   A.trastadas.fx.{sello, cartas, apagon, guante, ventana, telon, moneda, ficha, zetas, halo, tiembla}
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const reduced = () => document.documentElement.classList.contains("reduce-motion");
  const noShake = () => reduced() || document.documentElement.classList.contains("no-shake");
  const sfx = (k, ...a) => { try { A.sfx && A.sfx[k] && A.sfx[k](...a); } catch (e) { /* audio aun no listo */ } };
  const T6 = s => (A.pick6 ? A.pick6(s) : s.split("|")[0]);
  const DPR = () => window.devicePixelRatio || 1;
  /* el grano de pixel de la capa: el del crupier si lo hay en pantalla; si no, la pantalla a 480 pixeles de arte de ancho */
  const K = () => { const k = A.dealer && A.dealer.k && A.dealer.k(); return Math.max(2, k || Math.round(innerWidth * DPR() / 480)); };

  /* ---------------------------------------------------------------- la capa de pixel (un lienzo a pantalla completa, solo mientras hay algo) */
  let cv = null, g = null, k = 3, AW = 0, AH = 0, raf = 0, last = 0;
  const live = [];
  function layer() {
    if (!cv) { cv = document.createElement("canvas"); cv.id = "trFx"; cv.setAttribute("aria-hidden", "true"); document.body.appendChild(cv); g = cv.getContext("2d"); }
    if (!cv.isConnected) document.body.appendChild(cv);
    const nk = K(), dw = Math.ceil(innerWidth * DPR()), dh = Math.ceil(innerHeight * DPR()), aw = Math.ceil(dw / nk), ah = Math.ceil(dh / nk);
    if (nk !== k || aw !== AW || ah !== AH) { k = nk; AW = aw; AH = ah; cv.width = AW; cv.height = AH; cv.style.width = AW * k / DPR() + "px"; cv.style.height = AH * k / DPR() + "px"; g.imageSmoothingEnabled = false; }
  }
  const toArt = (x, y) => [Math.round(x * DPR() / k), Math.round(y * DPR() / k)];
  function add(fx) { layer(); fx.t = 0; live.push(fx); if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } return fx; }
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    g.clearRect(0, 0, AW, AH);
    for (let i = live.length - 1; i >= 0; i--) {
      const f = live[i]; f.t += dt;
      if (f.up) f.up(f, dt);
      if (f.t >= f.d) { live.splice(i, 1); if (f.end) f.end(f); continue; }
      g.save(); f.draw(f); g.restore();
    }
    raf = live.length ? requestAnimationFrame(tick) : 0;
    if (!raf) g.clearRect(0, 0, AW, AH);
  }
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

  /* sprites de pixel hechos una vez (en la paleta de la casa) */
  const SP = {};
  function sprite(name, w, h, paint) {
    if (SP[name]) return SP[name];
    const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); paint(x); return (SP[name] = c);
  }
  const CARD = () => sprite("card", 10, 14, x => { x.fillStyle = "#1d0a3d"; x.fillRect(0, 0, 10, 14); x.fillStyle = "#f3f0fa"; x.fillRect(1, 1, 8, 12); x.fillStyle = "#c9cde0"; x.fillRect(1, 12, 8, 1); x.fillStyle = "#e8283a"; x.fillRect(4, 5, 2, 2); x.fillRect(3, 6, 4, 1); x.fillRect(2, 2, 1, 2); x.fillRect(7, 10, 1, 2); });
  const CARD_EDGE = () => sprite("cardE", 2, 14, x => { x.fillStyle = "#1d0a3d"; x.fillRect(0, 0, 2, 14); x.fillStyle = "#c9cde0"; x.fillRect(1, 1, 1, 12); });
  const CARD_BACK = () => sprite("cardB", 10, 14, x => { x.fillStyle = "#1d0a3d"; x.fillRect(0, 0, 10, 14); x.fillStyle = "#a8142e"; x.fillRect(1, 1, 8, 12); x.fillStyle = "#e8283a"; for (let yy = 2; yy < 12; yy += 2) for (let xx = 2 + (yy / 2) % 2; xx < 8; xx += 2) x.fillRect(xx, yy, 1, 1); });
  const CHIP = () => sprite("chip", 12, 12, x => { const P = ["....oooo....", "..oorrrroo..", ".orrwrrwrro.", ".orrrrrrrro.", "orwrrkkrrwro", "orrrkrrkrrro", "orrrkrrkrrro", "orwrrkkrrwro", ".orrrrrrrro.", ".orrwrrwrro.", "..oorrrroo..", "....oooo...."], C = { o: "#1d0a3d", r: "#e8283a", w: "#f3f0fa", k: "#a8142e" };
    P.forEach((row, yy) => [...row].forEach((ch, xx) => { if (C[ch]) { x.fillStyle = C[ch]; x.fillRect(xx, yy, 1, 1); } })); });

  /* texto de pixel: la letra de la casa a su tamano de diseno, sin suavizado (alfa a 0 o 255), y luego girado al pixel */
  function pixText(text, size, col, ink) {
    const key = "t|" + text + "|" + size + "|" + col; if (SP[key]) return SP[key];
    const m = document.createElement("canvas").getContext("2d"); m.font = `${size}px "Jersey 15", "Silkscreen", monospace`;
    const w = Math.ceil(m.measureText(text).width) + 4, h = Math.ceil(size * 1.25) + 4;
    const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
    x.font = m.font; x.textBaseline = "top"; x.fillStyle = col; x.fillText(text, 2, 2);
    const d = x.getImageData(0, 0, w, h), a = d.data, [r, gg, b] = [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16));
    for (let i = 0; i < a.length; i += 4) { const on = a[i + 3] > 110; a[i] = r; a[i + 1] = gg; a[i + 2] = b; a[i + 3] = on ? 255 : 0; }
    x.putImageData(d, 0, 0);
    return (SP[key] = c);
  }
  /* giro al pixel (vecino mas cercano, sin mezclar colores) */
  function rotPix(src, ang) {
    const ca = Math.cos(ang), sa = Math.sin(ang), w = src.width, h = src.height, W2 = Math.ceil(Math.abs(w * ca) + Math.abs(h * sa)) + 2, H2 = Math.ceil(Math.abs(w * sa) + Math.abs(h * ca)) + 2;
    const sd = src.getContext("2d").getImageData(0, 0, w, h).data, o = document.createElement("canvas"); o.width = W2; o.height = H2;
    const ox = o.getContext("2d"), od = ox.createImageData(W2, H2), dd = od.data;
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const dx = x - W2 / 2 + 0.5, dy = y - H2 / 2 + 0.5, sx = Math.round(ca * dx + sa * dy + w / 2 - 0.5), sy = Math.round(-sa * dx + ca * dy + h / 2 - 0.5);
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue; const si = (sy * w + sx) * 4, di = (y * W2 + x) * 4;
      dd[di] = sd[si]; dd[di + 1] = sd[si + 1]; dd[di + 2] = sd[si + 2]; dd[di + 3] = sd[si + 3];
    }
    ox.putImageData(od, 0, 0); return o;
  }

  /* ---------------------------------------------------------------- los efectos */
  const FX = {};
  /* temblor de la pantalla: corto, a pixel de arte entero; nunca con Movimiento en Minimo ni con Vibracion = No */
  FX.tiembla = (ms = 260, amp = 2) => {
    if (noShake()) return; const app = document.getElementById("app"); if (!app || !app.animate) return;
    const p = amp * k / DPR(), kf = []; for (let i = 0; i < 6; i++) kf.push({ transform: `translate(${(i % 2 ? -1 : 1) * p}px, ${(i % 3 - 1) * p}px)` }); kf.push({ transform: "none" });
    app.animate(kf, { duration: ms, easing: "steps(7, end)" });
  };
  /* SELLO GIGANTE: el sello rojo cae de grande a su tamano con un golpe seco, se queda y se desvanece */
  FX.sello = (text) => {
    const t = text || (A.t ? A.t("res.t1") : "¡Diana!");
    layer(); const txt = pixText(t, 30, "#e8283a"), pad = 6, w = txt.width + pad * 2, h = txt.height + pad * 2;
    const box = document.createElement("canvas"); box.width = w + 6; box.height = h + 6; const bx = box.getContext("2d");
    bx.fillStyle = "#e8283a"; bx.fillRect(3, 3, w, 3); bx.fillRect(3, 3 + h - 3, w, 3); bx.fillRect(3, 3, 3, h); bx.fillRect(3 + w - 3, 3, 3, h);
    bx.fillStyle = "#a8142e"; bx.fillRect(6, 6, w - 6, 1); bx.drawImage(txt, 3 + pad, 3 + pad);
    const img = rotPix(box, -0.17);
    add({ d: 1.9, draw(f) {
      const s = reduced() ? 1 : Math.max(1, Math.round((2.4 - f.t * 9) * 4) / 4), a = Math.min(1, (f.d - f.t) * 2.5);
      g.globalAlpha = a; const W2 = Math.round(img.width * s), H2 = Math.round(img.height * s);
      g.drawImage(img, Math.round(AW / 2 - W2 / 2), Math.round(AH * 0.44 - H2 / 2), W2, H2);
    }, up(f) { if (!f.hit && f.t > 0.16) { f.hit = 1; sfx("trapStamp"); FX.tiembla(220, 2); } } });
  };
  /* LLUVIA DE CARTAS: saltan del abanico (x, y en px de pantalla) y caen dando vueltas (de frente, de canto, de espaldas) */
  FX.cartas = (x, y, n = 26) => {
    layer(); const [ax, ay] = toArt(x != null ? x : innerWidth * 0.75, y != null ? y : innerHeight * 0.45);
    const ps = Array.from({ length: n }, () => ({ x: ax, y: ay, vx: rnd(-150, 40), vy: rnd(-130, -40), sp: rnd(4, 9), ph: rnd(0, 6) }));
    sfx("puzzleDeal");
    add({ d: reduced() ? 1.6 : 3.2, draw(f) {
      for (const p of ps) { const c = Math.cos(p.ph + f.t * p.sp), im = Math.abs(c) < 0.3 ? CARD_EDGE() : c > 0 ? CARD() : CARD_BACK(); g.drawImage(im, Math.round(p.x - im.width / 2), Math.round(p.y - 7)); }
    }, up(f, dt) { if (reduced()) return; for (const p of ps) { p.vy += 170 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } } });
  };
  /* APAGON CON OJOS: la sala a oscuras; el crupier en silueta con los ojos encendidos (su cara "dark") y Comodin igual */
  let darkEl = null;
  FX.apagon = (ms = 3400) => {
    if (!darkEl) { darkEl = document.createElement("div"); darkEl.id = "trDark"; darkEl.setAttribute("aria-hidden", "true"); }
    (document.getElementById("app") || document.body).appendChild(darkEl); void darkEl.offsetWidth; darkEl.classList.add("on");   // en #app, como el crupier y el gato: ellos quedan por delante
    sfx("powerdown"); if (A.dealer && A.dealer.face) A.dealer.face("dark"); if (A.comodin && A.comodin.dark) A.comodin.dark(true);
    setTimeout(() => { darkEl.classList.remove("on"); sfx("restore"); if (A.dealer && A.dealer.restFace) A.dealer.restFace(); if (A.comodin && A.comodin.dark) A.comodin.dark(false); setTimeout(() => darkEl.remove(), 400); }, ms);
  };
  /* EL GUANTE EN TU PUNTERO: su guante blanco (el del retrato, tal cual) entra por la derecha, da dos toquecitos junto al puntero y se va */
  let gloveImg = null;
  function glove() {
    if (gloveImg) return gloveImg;
    const d = A.crupier && A.crupier.data && A.crupier.data("sly"); if (!d) return null;
    const c = document.createElement("canvas"); c.width = 30; c.height = 28; const x = c.getContext("2d"); const id = x.createImageData(30, 28);
    const W0 = 96, s = d.data, key = (yy, xx) => { const si = ((84 + yy) * W0 + 14 + xx) * 4; return s[si + 3] ? `${s[si]},${s[si + 1]},${s[si + 2]}` : ""; };
    const GLOVE = new Set(["243,240,250", "201,205,224", "138,143,168"]), INK = "29,10,61";
    const isG = (yy, xx) => yy >= 0 && yy < 28 && xx >= 0 && xx < 30 && GLOVE.has(key(yy, xx));
    for (let yy = 0; yy < 28; yy++) for (let xx = 0; xx < 30; xx++) {
      const k = key(yy, xx), ink = k === INK && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([a, b]) => isG(yy + a, xx + b));   // la tinta, solo la que bordea el guante
      if (!GLOVE.has(k) && !ink) continue;
      const si = ((84 + yy) * W0 + 14 + xx) * 4, di = (yy * 30 + xx) * 4; id.data[di] = s[si]; id.data[di + 1] = s[si + 1]; id.data[di + 2] = s[si + 2]; id.data[di + 3] = 255;
    }
    x.putImageData(id, 0, 0); return (gloveImg = c);
  }
  FX.guante = (x, y) => {
    layer(); const im = glove(); if (!im) return;
    const [tx, ty] = toArt(x, y);
    add({ d: 2.3, draw(f) {
      const p = f.t < 0.6 ? f.t / 0.6 : f.t < 1.7 ? 1 : Math.max(0, 1 - (f.t - 1.7) / 0.6), e = 1 - (1 - p) * (1 - p);
      const tap = f.t > 0.7 && f.t < 1.6 ? (Math.floor((f.t - 0.7) / 0.18) % 2 ? 2 : 0) : 0;
      const X = Math.round(AW + 4 - (AW + 4 - tx - 3) * e) + tap; g.save(); g.translate(X + im.width, 0); g.scale(-1, 1); g.drawImage(im, 0, Math.round(ty - 4)); g.restore();
    }, up(f) { if (!f.b1 && f.t > 0.78) { f.b1 = 1; sfx("knock"); } if (!f.b2 && f.t > 1.14) { f.b2 = 1; sfx("knock"); } } });
  };
  /* LA VENTANA DE MENTIRA: una ventana del sistema que no es del sistema */
  const VT = {
    q: "¿Seguro que es ahí?|Are you sure it's there?|Tu es sûr que c'est là ?|Tem certeza de que é aí?|Bist du sicher, dass es da ist?|Sei sicuro che sia lì?||你确定是那里吗？|정말 거기 맞아?|本当にそこで合ってる？|Ты уверен, что это там?|Na pewno tutaj?",
    si: "Sí|Yes|Oui|Sim|Ja|Sì||是|응|はい|Да|Tak",
    seguro: "Sí, seguro|Yes, sure|Oui, sûr|Sim, tenho certeza|Ja, sicher|Sì, sicuro||是，确定|응, 확실해|はい、確かです|Да, уверен|Tak, na pewno",
  };
  FX.ventana = (done) => {
    const box = document.createElement("div"); box.className = "tr-win"; box.setAttribute("aria-hidden", "false");
    const el = document.createElement("div"); el.className = "chx-win"; el.setAttribute("role", "alertdialog");
    el.innerHTML = `<div class="cw-bar"><i class="cw-app" aria-hidden="true"></i><b>Geolite</b><button type="button" class="cw-x" data-a="1" aria-label="${T6(VT.si)}">✕</button></div>
      <div class="cw-body"><i class="cw-sign" aria-hidden="true">?</i><p>${T6(VT.q)}</p></div>
      <div class="cw-foot"><button type="button" class="cw-b" data-a="1">${T6(VT.si)}</button><button type="button" class="cw-b cw-def" data-a="2">${T6(VT.seguro)}</button></div>`;
    box.appendChild(el); document.body.appendChild(box); sfx("ding");
    const w = Math.min(340, innerWidth - 24); Object.assign(el.style, { left: Math.round(innerWidth / 2 - w / 2) + "px", top: Math.round(innerHeight * 0.36) + "px", width: w + "px" });
    let gone = false; const close = how => { if (gone) return; gone = true; el.classList.add("bye"); sfx("flip", false); setTimeout(() => box.remove(), 160); if (done) done(how); };
    el.addEventListener("click", e => { const b = e.target.closest("[data-a]"); if (b) { e.stopPropagation(); close(b.dataset.a); } });
    setTimeout(() => close("auto"), 5000);
    const def = el.querySelector(".cw-def"); if (def) setTimeout(() => def.focus({ preventScroll: true }), 30);
  };
  /* EL TELON DEL JEFE: dos panos de terciopelo se cierran desde los lados, se abren y alli esta el (after: al cerrarse del todo, cambia la escena) */
  FX.telon = (after) => {
    layer(); sfx("bossRise");
    add({ d: 2.3, draw(f) {
      const p = f.t < 0.35 ? f.t / 0.35 : f.t < 1.0 ? 1 : Math.max(0, 1 - (f.t - 1.0) / 1.15), w = Math.round(AW / 2 * (1 - (1 - p) * (1 - p)));
      for (const [X, side] of [[0, 1], [AW - w, -1]]) {
        R(X, 0, w, AH, "#6b0d1f");
        for (let i = 3; i < w; i += 14) R(side > 0 ? X + w - i - 5 : X + i, 0, 5, AH, "#8f1328");
        R(side > 0 ? X + w - 1 : X, 0, 1, AH, "#3c0712");
      }
      R(0, 0, AW, 10, "#3c240a"); R(0, 10, AW, 2, "#6e3414");
    }, up(f) { if (!f.fired && f.t > 0.95) { f.fired = 1; sfx("spot"); if (after) after(); } } });
  };
  /* LA MONEDA DEL DUELO: el doblon sube en arco desde su mano dando vueltas y cae; suena al caer (desde: x, y en px de pantalla) */
  FX.moneda = (x, y, done) => {
    layer(); const [sx, sy] = toArt(x != null ? x : innerWidth * 0.55, y != null ? y : innerHeight * 0.4); sfx("coinToss");
    add({ d: reduced() ? 0.6 : 1.7, draw(f) {
      const p = Math.min(1, f.t / 1.2), X = sx - p * 150, Y = sy - Math.sin(p * Math.PI) * 90 + p * 40, wv = reduced() ? 7 : Math.round(Math.abs(Math.cos(f.t * 16)) * 7) + 1;
      R(X - wv - 1, Y - 8, wv * 2 + 2, 16, "#3c240a"); R(X - wv, Y - 7, wv * 2, 14, "#f5a623"); R(X - wv, Y - 7, wv * 2, 3, "#fdd742"); if (wv > 3) R(X - wv + 2, Y - 4, 2, 6, "#fff3b0");
    }, up(f) { if (!f.b && f.t > 1.2) { f.b = 1; sfx("coinLand"); } }, end() { if (done) done(); } });
  };
  /* LA FICHA AL SUELO: una ficha cae dando vueltas desde (x, y) */
  FX.ficha = (x, y) => {
    layer(); const [sx, sy] = toArt(x, y), im = CHIP();
    add({ d: 1.5, draw(f) {
      const yy = sy + f.t * f.t * 260, c = Math.cos(f.t * 9);
      const w = Math.max(2, Math.round(Math.abs(c) * 12)); g.drawImage(im, 0, 0, 12, 12, Math.round(sx - f.t * 30 - w / 2), Math.round(yy - 6), w, 12);
    }, up(f) { if (!f.b && f.t > 0.95) { f.b = 1; sfx("chip", 1); sfx("coinTink"); } } });
  };
  /* ZETAS de la siesta, que suben desde (x, y) */
  FX.zetas = (x, y, s = 4) => {
    layer(); const [sx, sy] = toArt(x, y), zs = [pixText("z", 16, "#f3f0fa"), pixText("z", 22, "#f3f0fa"), pixText("Z", 26, "#f3f0fa")];
    add({ d: s, draw(f) { for (let i = 0; i < 3; i++) { const tt = (f.t + i * 0.6) % 1.8; g.globalAlpha = Math.max(0, 1 - tt / 1.8); g.drawImage(zs[i], Math.round(sx + tt * 12 + i * 4), Math.round(sy - tt * 22)); } } });
  };
  /* HALO detras del crupier (el foco del desfile): nunca delante de el */
  FX.halo = (ms = 3000) => { const el = A.dealer && A.dealer.el && A.dealer.el(); if (!el) return; el.classList.add("tr-halo"); setTimeout(() => el.classList.remove("tr-halo"), ms); };

  /* ---------------------------------------------------------------- reglas */
  const S = { round: -1, used: false, ses: {}, at: {} };
  const tour = () => !!(A.tour && A.tour.active && A.tour.active());
  const vivo = () => !!(A.vivoQuiet && A.vivoQuiet());
  const LIM = { siesta: 2, cartas: 3 };                                                         // como mucho por sesion
  function puede(id, ctx = {}) {
    if (tour() || vivo()) return false;
    if (ctx.ronda != null && S.round === ctx.ronda && S.used) return false;                    // una por ronda
    if (ctx.left != null && ctx.left < 5000) return false;                                    // nunca en los ultimos 5 s
    if (LIM[id] && (S.ses[id] || 0) >= LIM[id]) return false;
    if (Date.now() - (S.at[id] || 0) < 45000) return false;                                    // la misma, no dos veces seguidas
    return true;
  }
  function apunta(id, ctx = {}) { if (ctx.ronda != null) { S.round = ctx.ronda; S.used = true; } S.ses[id] = (S.ses[id] || 0) + 1; S.at[id] = Date.now(); }
  const HOOK = {};                                                                             // cada pantalla registra como se hace la suya (con su contexto)
  A.trastadas = {
    fx: FX,
    ronda: n => { if (n !== S.round) { S.round = n; S.used = false; } },
    puede,
    /* con reglas: devuelve si salio */
    lanza(id, ctx = {}) { if (!puede(id, ctx) || !HOOK[id]) return false; if (HOOK[id](ctx) === false) return false; apunta(id, ctx); return true; },
    /* sin reglas (la mesa del crupier): si su pantalla no esta, lo que se pueda sin ella */
    run(id, ctx = {}) {
      if (HOOK[id] && HOOK[id](Object.assign({ forzada: true }, ctx)) !== false) return true;
      const r = A.dealer && A.dealer.faceRect && A.dealer.faceRect();
      const cx = r ? r.left + r.width * 0.7 : innerWidth * 0.75, cy = r ? r.top + r.height * 0.35 : innerHeight * 0.45;
      if (id === "sello") FX.sello(); else if (id === "cartas") FX.cartas(cx, cy); else if (id === "apagon") FX.apagon(); else if (id === "ventana") FX.ventana();
      else if (id === "guante") FX.guante(innerWidth / 2, innerHeight / 2); else if (id === "telon") FX.telon(); else if (id === "moneda") FX.moneda(cx, cy);
      else if (id === "siesta") FX.zetas(cx, cy); else if (id === "desfile") FX.halo(); else return false;
      return true;
    },
    registra(id, fn) { HOOK[id] = fn; },
    ids: ["cartas", "telon", "moneda", "siesta", "desfile", "sello", "mapa", "apagon", "ventana", "guante", "ticket"],
    solas: ["cartas", "telon", "moneda", "siesta", "desfile"],          // las que salen solas; el resto, solo desde la mesa
  };

  /* ================================================================ EL DIRECTOR DE LA PARTIDA (la pregunta y el revelado)
     Mira el estado del juego (A.core.S) y, con las reglas de arriba, decide si toca una sorpresa. Las de pantallas propias (telon, moneda, ficha,
     desfile) las registran sus pantallas. Una por ronda (las 5 preguntas de una ronda), nunca en los ultimos 5 s */
  const PTR = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener("pointermove", e => { PTR.x = e.clientX; PTR.y = e.clientY; }, { passive: true });
  const D = () => A.dealer || {};
  const GS = () => (A.core && A.core.S) || {};
  const here = () => { const d = D(); return d.faceRect && d.faceRect(); };
  const hand = () => { const r = here(); return r ? [r.left + r.width * 0.74, r.top + r.height * 0.36] : [innerWidth * 0.85, innerHeight * 0.75]; };
  const rk = () => { const r = GS().run; return r ? r.act + ":" + r.round + ":" + (r.attempt || 0) : null; };
  const left = () => { const s = GS(); return s.limit - (performance.now() - s.t0 - (s.pausedAcc || 0)) / 1000; };
  const say = (k, o) => { const d = D(); return d.sayKey ? d.sayKey(k, o) : false; };
  const laugh = () => { const d = D(); if (d.faceSet) { d.faceSet("laugh"); sfx("laugh"); setTimeout(() => d.restFace && d.restFace(), 1600); } };

  /* COMODIN SE PASEA POR EL MAPA: entra andando por la derecha, se tumba encima de un trozo del mapa (4 s como mucho); si lo pulsas, se va */
  let mapHost = null;
  A.trastadas.registra("mapa", ctx => {
    if (!A.comodin || !A.COMODIN_DATA || reduced()) return false;
    const app = document.getElementById("app"); if (!app) return false;
    if (!mapHost || !mapHost.isConnected) { mapHost = document.createElement("div"); mapHost.className = "cm-host"; app.appendChild(mapHost); }
    const floor = Math.round(innerHeight * 0.66); mapHost.style.top = "0"; mapHost.style.height = floor + "px";
    const k = () => Math.max(2, (D().k && D().k()) || 2), x0 = innerWidth + 90, tx = Math.round(innerWidth * (0.5 + Math.random() * 0.18));
    let gone = false, t4 = 0;
    const bye = () => { if (gone) return; gone = true; clearTimeout(t4); A.comodin.walkTo(innerWidth + 120, () => A.comodin.hide()); };
    const C = A.comodin.show({ host: mapHost, k, floor: 0, x: x0, mode: "still", dir: -1, onPet: () => setTimeout(bye, 500) });
    if (!C) return false;
    A.comodin.walkTo(tx, () => { if (gone) return; A.comodin.act("duerme"); say("catSlow"); });
    t4 = setTimeout(() => { if (!gone && A.comodin.state() === "sleep") A.comodin.pet(); else bye(); }, 4000 + Math.abs(x0 - tx) / 46 / (k() / (DPR())) * 1000 + 900);
    return true;
  });
  /* APAGON CON OJOS */
  A.trastadas.registra("apagon", () => { FX.apagon(3200); say("tantrumBlackout", { mood: "sly" }); return true; });
  /* EL GUANTE EN TU PUNTERO */
  A.trastadas.registra("guante", () => { if (reduced()) return false; FX.guante(PTR.x, PTR.y); setTimeout(() => { if (GS().phase === "asking") say("runIdle"); }, 1700); return true; });
  /* LA VENTANA DE MENTIRA: al contestar; contestes lo que contestes, se rie */
  A.trastadas.registra("ventana", () => { FX.ventana(() => laugh()); return true; });
  /* SELLO GIGANTE: en el revelado, con diana: el gesto de sellar y el sello */
  A.trastadas.registra("sello", () => { FX.sello(); return true; });
  /* LLUVIA DE CARTAS: racha de 5 */
  A.trastadas.registra("cartas", () => { if (reduced()) return false; const d = D(); if (d.body) d.body("e_cascada"); setTimeout(() => { const [x, y] = hand(); FX.cartas(x, y); }, 650); return true; });
  /* EL GATO Y TU TICKET: Comodin salta junto al ticket y lo tira de un zarpazo; el crupier lo regana y te lo devuelve con el truco de la carta */
  A.trastadas.registra("ticket", () => {
    const tk = document.getElementById("tkSlot"); if (!tk || !A.comodin || !A.COMODIN_DATA || reduced()) return false;
    const r = tk.getBoundingClientRect(); if (r.width < 40) return false;
    const app = document.getElementById("app"); if (!mapHost || !mapHost.isConnected) { mapHost = document.createElement("div"); mapHost.className = "cm-host"; app.appendChild(mapHost); }
    const floor = Math.round(Math.min(innerHeight - 8, r.bottom)); mapHost.style.top = "0"; mapHost.style.height = floor + "px";
    const k = () => Math.max(2, (D().k && D().k()) || 2), x = Math.round(r.left - 40);
    A.comodin.show({ host: mapHost, k, floor: 0, x, mode: "still", dir: 1 });
    A.comodin.play("salta", { after: () => A.comodin.play("zarpa", { after: () => A.comodin.play("regana", { after: () => setTimeout(() => A.comodin.walkTo(-140, () => A.comodin.hide()), 600) }) }) });
    setTimeout(() => {                                                                 // el zarpazo: el ticket sale volando
      if (tk.animate) tk.animate([{ transform: "none" }, { transform: `translate(${Math.round(innerWidth * 0.08)}px, ${Math.round(innerHeight * 0.9)}px) rotate(38deg)` }], { duration: 520, easing: "cubic-bezier(.4,0,.8,.6)", fill: "forwards" });
      sfx("swish"); sfx("flip", true);
      const d = D(); if (d.say) say("catScold", { mood: "angry", gesture: "finger_wag" });
    }, 1000);
    setTimeout(() => {                                                                 // el truco: vuelve a su sitio
      const d = D(); if (d.body) d.body("e_truco");
      setTimeout(() => { if (tk.animate) { tk.getAnimations().forEach(a => a.cancel()); tk.animate([{ transform: "translate(0, 24px) rotate(-6deg)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.2,1.4,.4,1)" }); } sfx("card"); }, 1500);
    }, 3200);
    return true;
  });

  /* LA SIESTA DE LA MESA (la portada, un minuto sin tocar nada): la hace js/dealer.js (startDoze); la mesa la pide ya */
  A.trastadas.registra("siesta", () => !!(D().siesta && D().siesta()));
  /* el director: lleva la cuenta de la ronda (una por ronda). Nada sale solo mientras contestas: la partida es sagrada */
  function dirTick() {
    try { const s = GS(), d = D(); if (d.on && s.run && A.trastadas) { const ronda = rk(); if (ronda) A.trastadas.ronda(ronda); } } catch (e) { /* aun sin juego */ }
    setTimeout(dirTick, 1000);
  }
  setTimeout(dirTick, 2000);
  /* js/adventure.js (afterQuestion): lo que ha pasado en la respuesta */
  let racha = 0;
  A.trastadas.respuesta = (res) => {
    const ronda = rk(); if (!ronda || !res) return;
    racha = Math.max(racha, res.streak || 0);                                                  // la lluvia de cartas espera al veredicto de la ronda (el sello de la diana ya no: la partida es sagrada)
  };
  /* js/adventure.js: el veredicto de la ronda, con el crupier ya en su hueco. Si la cerraste con una racha de 5 o mas, la lluvia de cartas */
  A.trastadas.veredicto = () => { const r = racha; racha = 0; if (r >= 5) setTimeout(() => A.trastadas.lanza("cartas", {}), 900); };
})(window.AIQ);
