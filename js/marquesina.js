/* Geolite - LA MARQUESINA DE LA CARGA (paquete «Portada» del Probador, voto del autor: «Cargas con bombillas», en Extrema).
 * La pantalla negra mientras arranca el juego (#splash) es la marquesina de la casa: un cartel de pixel art a escala entera con el rotulo de
 * siempre (assets/logo.png, el arte aprobado) y una fila de bombillas alrededor. Las encendidas son lo que lleva cargado; por ellas corre una ola.
 * Al terminar, una carrera de luz (0,7 s) y la marquesina se funde sobre la intro del estudio, que ya ha empezado debajo: nunca anade tiempo.
 *  - Corre ANTES que el resto del juego (script normal, no defer, justo despues de #splash): no usa nada de window.AIQ salvo para colgarse.
 *  - El progreso: scripts del juego descargados (tramos rapidos y paradas de verdad), luego su ejecucion y por ultimo las letras.
 *  - Si la carga dura menos de 0,4 s no sale (se queda el negro de siempre). Movimiento Minimo (ajuste del juego): sin ola ni carrera.
 *  - Todo en un lienzo 2D: los sprites de bombilla se hornean una vez por estado; cada fotograma solo se colocan (52 drawImage).
 * game.js llama a A.marquesina.fin() donde antes quitaba #splash.
 */
(function () {
  "use strict";
  var sp = document.getElementById("splash"); if (!sp || !window.requestAnimationFrame) return;
  var A = (window.AIQ = window.AIQ || {});
  var t0 = performance.now(), D = 0.4;                                      // sale a los 0,4 s (antes, negro como siempre)
  var reduce = false, lang = "es";
  try { var st = JSON.parse(localStorage.getItem("atlasiq.v2") || "{}"); reduce = st.motion === "min" || (!st.motion && !!st.reduce); if (st.lang) lang = st.lang; } catch (e) { /* sin almacenamiento */ }
  if (!lang || lang === "es") { try { var nl = String(navigator.language || "es").toLowerCase(); if (!localStorage.getItem("atlasiq.v2")) lang = nl.slice(0, 2); } catch (e) { /* nada */ } }
  /* «Cargando la casa» en los 12 idiomas (el mismo orden que A.LANGS) */
  var TX = { es: "Cargando la casa", "es-419": "Cargando la casa", en: "Opening the house", fr: "La maison s'allume", pt: "Abrindo a casa", de: "Das Haus öffnet", it: "La casa si accende",
    zh: "赌场正在开门", ko: "하우스를 여는 중", ja: "ハウスを開けています", ru: "Казино открывается", pl: "Dom się otwiera" };
  /* bombilla de 7x7 pixeles de arte: contorno, cristal, nucleo (paleta geolite40) */
  var BULB = ["..ooo..", ".occco.", "occxcco", "ocxxxco", "occxcco", ".occco.", "..ooo.."];
  var EST = [
    { o: "#1d0a3d", c: "#3c240a", x: "#3c240a", h: null },                 // apagada
    { o: "#1d0a3d", c: "#6e3414", x: "#c46a1b", h: null },                 // tenue
    { o: "#3c240a", c: "#f5a623", x: "#fdd742", h: "#3c240a" },            // encendida
    { o: "#6e3414", c: "#fdd742", x: "#fff3b0", h: "#6e3414" },            // viva
  ];
  var OLA = 0.9, LARGO = 6;                                                 // Extrema: la ola deprisa y corta
  var cv = document.createElement("canvas"), g = cv.getContext("2d");
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:pixelated;opacity:0";
  var cap = document.createElement("p");
  cap.style.cssText = "position:absolute;left:0;right:0;margin:0;text-align:center;font-family:var(--mono, monospace);letter-spacing:.08em;text-transform:uppercase;color:#8a8fa8;opacity:0;white-space:nowrap";
  cap.textContent = TX[lang] || TX[lang.slice(0, 2)] || TX.en;
  sp.appendChild(cv); sp.appendChild(cap);
  var logo = new Image(); logo.src = "assets/logo.png";                    // precargado en <head>: es el rotulo de la portada
  logo.onload = function () { lay = null; };

  var lay = null;
  function layout() {
    var W = innerWidth, H = innerHeight, dpr = window.devicePixelRatio || 1;
    var k = Math.max(W >= 900 && H >= 500 ? 4 : 2, Math.round(4 * H / 1080));   // pixel de arte en px de CSS (4 a 1080; el rotulo cabe a 1:1)
    var K = Math.max(1, Math.round(k * dpr));                              // y en px reales: siempre entero
    var aw = 192, ah = 82;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var bx = Math.round((cv.width - aw * K) / 2 / K) * K, by = Math.round((cv.height - ah * K) / 2 / K) * K - 2 * K;
    var pos = [], i, j;                                                     // el perimetro, en el sentido del reloj desde arriba a la izquierda
    for (i = 0; i < 19; i++) pos.push([6 + 10 * i, 6]);
    for (j = 1; j < 7; j++) pos.push([186, 6 + 10 * j]);
    for (i = 18; i >= 0; i--) pos.push([6 + 10 * i, ah - 6]);
    for (j = 6; j >= 1; j--) pos.push([6, 6 + 10 * j]);
    var spr = EST.map(function (e) {
      var c = document.createElement("canvas"); c.width = c.height = 9 * K; var q = c.getContext("2d"), x, y;
      if (e.h) { q.fillStyle = e.h; for (y = 0; y < 9; y++) for (x = 0; x < 9; x++) { var d = Math.hypot(x - 4, y - 4); if (d >= 3.4 && d < 4.5) q.fillRect(x * K, y * K, K, K); } }   // su luz sobre el cartel: un aro de un pixel
      BULB.forEach(function (row, yy) { for (var xx = 0; xx < row.length; xx++) { var ch = row[xx]; if (ch === ".") continue; q.fillStyle = ch === "o" ? e.o : ch === "c" ? e.c : e.x; q.fillRect((xx + 1) * K, (yy + 1) * K, K, K); } });
      return c;
    });
    /* el cartel: contorno, marco de ciruela con bisel (luz arriba y a la izquierda), panel oscuro y el rotulo */
    var board = document.createElement("canvas"); board.width = aw * K; board.height = ah * K;
    var b = board.getContext("2d");
    var R = function (x, y, w, h, c) { b.fillStyle = c; b.fillRect(x * K, y * K, w * K, h * K); };
    R(1, 0, aw - 2, ah, "#1d0a3d"); R(0, 1, aw, ah - 2, "#1d0a3d");
    R(1, 1, aw - 2, ah - 2, "#301252");
    R(2, 1, aw - 4, 1, "#4a1d96"); R(1, 2, 1, ah - 4, "#4a1d96");
    R(2, ah - 2, aw - 4, 1, "#1d0a3d"); R(aw - 2, 2, 1, ah - 4, "#1d0a3d");
    R(11, 11, aw - 22, ah - 22, "#1d0a3d");
    R(12, 12, aw - 24, ah - 24, "#0a0a0c");
    R(12, 12, aw - 24, 1, "#05050a");
    if (logo.complete && logo.naturalWidth) {
      /* a escala entera si cabe; si no, reducido con suavizado de calidad (como js/geologo.js) */
      var iw = (aw - 26) * K, ih = (ah - 26) * K, s = Math.min(iw / logo.naturalWidth, ih / logo.naturalHeight), sc = s >= 1 ? Math.floor(s) : s;
      var lw = Math.round(logo.naturalWidth * sc), lh = Math.round(logo.naturalHeight * sc);
      b.imageSmoothingEnabled = sc < 1; b.imageSmoothingQuality = "high";
      b.drawImage(logo, Math.round((aw * K - lw) / 2), Math.round((ah * K - lh) / 2), lw, lh);
    }
    cap.style.fontSize = Math.max(14, Math.round(4 * k)) + "px";
    cap.style.top = Math.round((by + (ah + 8) * K) / dpr) + "px";
    lay = { W: W, H: H, K: K, bx: bx, by: by, pos: pos, spr: spr, board: board };
  }

  /* progreso de verdad: scripts del juego descargados; luego ejecutados (DOMContentLoaded); luego las letras (fin) */
  var target = 0, prog = 0, parsed = false;
  document.addEventListener("DOMContentLoaded", function () { parsed = true; });
  function measure() {
    var tot = document.querySelectorAll("script[src]").length || 1, n = 0;
    try { var es = performance.getEntriesByType("resource"); for (var i = 0; i < es.length; i++) if (es[i].initiatorType === "script") n++; } catch (e) { /* sin Resource Timing */ }
    var p = Math.min(1, n / tot) * 0.75;
    if (!parsed) p = Math.min(p, 0.6); else p = Math.max(p, 0.86);
    if (p > target) target = p;
  }
  var fin = -1, out = 0, done = false, last = t0, raf = 0, shown = false, finCb = null;
  function frame(now) {
    raf = 0; if (done) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var el = (now - t0) / 1000;
    if (fin < 0) measure();
    /* el progreso se acerca al de verdad a tramos: avanza deprisa y se para donde la carga se para */
    prog += Math.max(0, target - prog) * Math.min(1, dt * 6);
    if (fin >= 0) { fin += dt; if (fin > 0.7) out = Math.min(1, out + dt / 0.35); }
    if (el >= D) {
      if (!shown) { shown = true; cv.style.opacity = "1"; cap.style.opacity = "1"; }
      if (!lay || lay.W !== innerWidth || lay.H !== innerHeight) layout();
      draw(el);
    }
    if (out >= 1) return end();
    raf = requestAnimationFrame(frame);
  }
  function draw(el) {
    var L = lay, NB = L.pos.length, K = L.K;
    g.clearRect(0, 0, cv.width, cv.height);
    var a = 1 - out * out;
    cv.style.opacity = String(a); cap.style.opacity = String(a);
    g.drawImage(L.board, L.bx, L.by);
    var lit = Math.floor((fin >= 0 ? 1 : prog) * NB + 1e-6);
    for (var i = 0; i < NB; i++) {
      var s;
      if (fin >= 0) {
        var f = fin / 0.7;
        if (f < 1 && !reduce) { var head = (f * 2 * NB) % NB, dd = (head - i + NB) % NB; s = dd < 2 ? 3 : dd < 6 ? 2 : 1; }
        else s = 3;
      } else if (i >= lit) s = 0;
      else if (reduce) s = 2;
      else { var ph = (((el * OLA * NB - i) % LARGO) + LARGO) % LARGO / LARGO; s = ph < 0.18 ? 3 : ph < 0.55 ? 2 : 1; }   // la ola: viva, encendida, tenue
      g.drawImage(L.spr[s], L.bx + (L.pos[i][0] - 4) * K, L.by + (L.pos[i][1] - 4) * K);
    }
  }
  function end() {
    done = true; if (raf) cancelAnimationFrame(raf);
    if (sp.parentNode) sp.parentNode.removeChild(sp);
    if (finCb) { var c = finCb; finCb = null; c(); }
  }
  raf = requestAnimationFrame(frame);

  /* game.js: la carga ha terminado. Si la marquesina no llego a salir (menos de 0,4 s), se quita como siempre (fundido de .45 s);
     si salio, carrera de luz de 0,7 s con todas encendidas y fundido de 0,35 s, mientras la intro del estudio ya empieza debajo */
  A.marquesina = {
    fin: function (cb) {
      finCb = cb || null;
      if (done) return end();
      if (!shown || reduce) {
        done = true; if (raf) cancelAnimationFrame(raf);
        sp.classList.add("out"); setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); if (finCb) { var c = finCb; finCb = null; c(); } }, shown ? 200 : 500);
        if (shown) { sp.style.transitionDuration = ".2s"; }
        return;
      }
      if (fin < 0) { fin = 0; target = prog = 1; try { if (A.sfx && A.sfx.lampara) A.sfx.lampara(0); } catch (e) { /* sin sonido aun */ } }
    },
  };
})();
