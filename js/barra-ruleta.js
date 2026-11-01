/* Geolite - LA RULETA de La Barra de la casa (v0.4.46): ruleta europea de 37 casillas que NUNCA PARA. Cada 45 s gira (28 s de apuestas, 10 de giro, 7 de pago), haya alguien sentado o no;
   el reloj es el del sistema y la bola cae donde dice la semilla de la partida (`${seed}:ruleta:${giro}`), asi que al sentarte ves el giro por donde va y el marcador ya trae los ultimos numeros.
   Maqueta aprobada («La ruleta de la Barra»): el tapete completo y TODAS las apuestas (pleno, caballo, calle, trio, esquina, cuatro primeros, seisena, columna, docena, rojo/negro, par/impar,
   falta/pasa); eliges la ficha y pulsas donde quieras; el 0 se lo queda todo la casa (97,30 %). Una JUGADA de la Barra es cada giro en el que apuestas (varias fichas = una jugada).
   Solo vive en La Barra de la casa (js/barra.js la monta como mesa «rule»): `A.barraRuleta.open(host, done)`. El host (barra.js) pone el monedero y recibe cada giro con apuesta en `onSpin`.
   Las fichas se cobran al cerrarse las apuestas (no antes: si cierras el juego a medias no pierdes nada) y el giro es siempre el del reloj: si te levantas con el giro ya cerrado, se paga al salir.
   Sonidos propios (js/audio.js, rul*): ficha que sube de tono con cada ficha, cuenta atras, rodadura y clics de casilla que frenan, rebotes, caida, cuenta del premio que sube, racha, casi-fallo. */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const TX = A.ruleTx, L6 = A.L6; if (!TX || !L6) return;
  const tr = o => A.tx(o), U = {}, LN = {}, LAST = {};
  for (const k in TX.ui) U[k] = L6(TX.ui[k]);
  for (const k in TX.lines) LN[k] = TX.lines[k].map(s => L6(s));
  const BET = { n: L6(TX.bet.n), d: L6(TX.bet.d), s: L6(TX.bet.s), ico: "bet_red" };
  const f = (o, v) => tr(o).replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? v[k] : m));
  const fmt = n => Math.round(n).toLocaleString(A.lang === "en" ? "en-US" : A.lang || "es");
  const line = key => { const a = LN[key]; let i = Math.floor(Math.random() * a.length); if (a.length > 1 && i === LAST[key]) i = (i + 1) % a.length; LAST[key] = i; return tr(a[i]); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, x) => a + (b - a) * x, sm = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const IDX = {}; ORDER.forEach((n, i) => (IDX[n] = i));
  const CYCLE = 45, T_BET = 28, T_SPIN = 10, T_END = 38, STEP = Math.PI * 2 / 37, TAU = Math.PI * 2;
  const col = n => (n === 0 ? "g" : RED.has(n) ? "r" : "b");
  const VALS = [1, 5, 25, 100, 250, 1000], CHIP = ["g", "b", "r", "k", "p", "o"];     // las fichas del globo de siempre (assets/icons/chip_*.webp, 64 px de arte), una por valor
  const tierOf = v => { let i = 0; VALS.forEach((x, j) => { if (v >= x) i = j; }); return i; };
  const breakdown = a => { const o = []; for (let i = 5; i >= 0; i--) while (a >= VALS[i] && o.length < 60) { o.push(i); a -= VALS[i]; } return o; };
  const chipImg = (i, st) => `<img class="ru-ci" alt="" draggable="false" src="assets/icons/chip_${CHIP[i]}.webp"${st ? ` style="${st}"` : ""}>`;
  const short = v => (v >= 10000 ? Math.round(v / 1000) + "k" : v >= 1000 ? (v % 1000 === 0 ? v / 1000 : (v / 1000).toFixed(1).replace(".", ",")) + "k" : String(v));
  let OFF = 0;                                                                   // solo para el boton «cerrar apuestas ya»: adelanta el reloj de la mesa
  const nowS = () => Date.now() / 1000 + OFF;
  const clk = () => { const n = nowS(), k = Math.floor(n / CYCLE); return { k, t: n - k * CYCLE, now: n }; };
  const CACHE = {};
  const resOf = (seed, k) => { const key = seed + ":" + k; if (!(key in CACHE)) { if (Object.keys(CACHE).length > 600) for (const x in CACHE) delete CACHE[x]; CACHE[key] = Math.floor(A.rng(`${seed}:ruleta:${k}`)() * 37); } return CACHE[key]; };
  const lastRevealed = (c) => (c.t >= T_END ? c.k : c.k - 1);
  const disc = n => `<i class="ru-d ${col(n)}">${n}</i>`;
  const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const sfx = (name, ...a) => { try { if (A.sfx && A.sfx[name]) A.sfx[name](...a); } catch (e) { /* sin sonido */ } };

  /* ---------- la rueda (pixel art por pixel, 160x160; la bola va por una espiral hacia su casilla) ---------- */
  const F35 = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
  function Wheel(cv) {
    const S = 160, C = 80; cv.width = S; cv.height = S; const ctx = cv.getContext("2d"), img = ctx.createImageData(S, S), d = img.data, N = S * S;
    const R = new Float32Array(N), Ag = new Float32Array(N);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = x + 0.5 - C, dy = y + 0.5 - C; R[y * S + x] = Math.hypot(dx, dy); Ag[y * S + x] = Math.atan2(dy, dx); }
    const px = (i, r, g, b, a) => { const j = i * 4; d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = a; };
    const digit = (n, cx, cy) => { const s = String(n), w = s.length * 4 - 1, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - 2.5); ctx.fillStyle = "#efe5cf";
      for (let c = 0; c < s.length; c++) { const g = F35[+s[c]]; for (let q = 0; q < 15; q++) if (g[q] === "1") ctx.fillRect(x0 + c * 4 + (q % 3), y0 + Math.floor(q / 3), 1, 1); } };
    return function draw(phi, ballRel, ballR, win) {
      for (let i = 0; i < N; i++) {
        const r = R[i]; if (r > 78) { px(i, 0, 0, 0, 0); continue; } const a = Ag[i];
        if (r > 72) { const sh = 0.75 + 0.25 * Math.cos(a + 2.2); if (r > 75) px(i, 209 * sh, 169 * sh, 84 * sh, 255); else px(i, 74 * sh, 42 * sh, 26 * sh, 255); continue; }
        if (r > 62) { const s2 = r > 66 && r < 67.5 ? 1.35 : 1; px(i, 28 * s2, 22 * s2, 26 * s2, 255); continue; }
        if (r > 46) {
          if (r < 48) { px(i, 209, 169, 84, 255); continue; }
          const rel = ((a - phi) % TAU + TAU) % TAU, q = rel / STEP, id = Math.floor(q), fr = q - id;
          if (fr < 0.07 || fr > 0.93) { px(i, 160, 128, 60, 255); continue; }
          const n = ORDER[id]; let cr, cg, cb;
          if (n === 0) { cr = 31; cg = 138; cb = 82; } else if (RED.has(n)) { cr = 184; cg = 39; cb = 47; } else { cr = 22; cg = 22; cb = 28; }
          if (id === win) { cr = Math.min(255, cr + 70); cg = Math.min(255, cg + 70); cb = Math.min(255, cb + 40); }
          if (r > 60) { cr *= 0.78; cg *= 0.78; cb *= 0.78; } px(i, cr, cg, cb, 255); continue;
        }
        if (r > 9) { const rl = a - phi; if (r < 36 && Math.abs(Math.sin(2 * rl)) * r / 2 < 1.7) { px(i, 220, 185, 100, 255); continue; }
          const ff = 0.55 + 0.45 * ((r - 9) / 37), w = Math.floor(rl / (Math.PI / 8)) & 1 ? 1 : 0.86; px(i, 98 * ff * w, 60 * ff * w, 36 * ff * w, 255); continue; }
        if (r > 5) px(i, 209, 169, 84, 255); else if (r > 2) px(i, 240, 222, 160, 255); else px(i, 255, 250, 230, 255);
      }
      ctx.putImageData(img, 0, 0);
      for (let j = 0; j < 37; j++) { const an = phi + (j + 0.5) * STEP; digit(ORDER[j], C + 54 * Math.cos(an), C + 54 * Math.sin(an)); }
      if (ballR != null) { const bx = C + ballR * Math.cos(ballRel + phi), by = C + ballR * Math.sin(ballRel + phi);
        ctx.fillStyle = "rgba(0,0,0,.45)"; for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (xx * xx + yy * yy <= 6) ctx.fillRect(Math.round(bx + xx + 1), Math.round(by + yy + 1), 1, 1);
        ctx.fillStyle = "#fff8e6"; for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (xx * xx + yy * yy <= 5) ctx.fillRect(Math.round(bx + xx), Math.round(by + yy), 1, 1); }
    };
  }
  /* la bola en el instante t del giro k: en reposo en la casilla del giro anterior, sale a la pista, gira en contra de la rueda, baja y rebota hasta su casilla */
  function ballAt(seed, k, t) {
    const ti = IDX[resOf(seed, k)], pi = IDX[resOf(seed, k - 1)], tg = (ti + 0.5) * STEP, pg = (pi + 0.5) * STEP;
    if (t < T_BET) return { rel: pg, r: 55, u: 0, win: -1 };
    const u = clamp((t - T_BET) / T_SPIN, 0, 1), fr = (((tg - pg) / TAU) % 1 + 1) % 1, nrev = 5 + Math.floor((((k * 2654435761) >>> 8) % 3)) + fr;
    let rel = tg - nrev * TAU * Math.pow(1 - u, 2.4), r;
    if (u < 0.07) r = lerp(55, 67, sm(u / 0.07)); else if (u < 0.55) r = 67; else if (u < 0.85) r = lerp(67, 57, sm((u - 0.55) / 0.3)); else r = lerp(57, 55, sm((u - 0.85) / 0.15));
    const v = clamp((u - 0.78) / 0.22, 0, 1);
    if (v > 0 && v < 1) { rel += Math.pow(1 - v, 2) * Math.cos(v * 16) * STEP * 2.2; r += 5 * Math.pow(1 - v, 2) * Math.abs(Math.sin(v * 14)); }
    return { rel, r, u, v, win: t >= T_END ? ti : -1 };
  }

  /* ---------- el marcador vivo de la carta del pasillo ---------- */
  let liveIv = 0, liveMiss = 0;
  function liveTick() {
    const els = document.querySelectorAll(".rul-live"); if (!els.length) { if (++liveMiss > 3) { clearInterval(liveIv); liveIv = 0; liveMiss = 0; } return; } liveMiss = 0;
    const c = clk(), last = lastRevealed(c), ph = c.t < T_BET ? "bet" : c.t < T_END ? "spin" : "pay";
    els.forEach(el => { const seed = el.dataset.seed, h = []; for (let i = 0; i < 8; i++) h.push(resOf(seed, last - i));
      const st = ph === "bet" ? U.open : ph === "spin" ? U.closed : null;
      el.innerHTML = `<span class="ru-ld">${h.map(disc).join("")}</span><span class="ru-lt ${ph}">${esc(st ? tr(st) : f(U.out, { n: resOf(seed, c.k) }))} · ${mmss(ph === "bet" ? T_BET - c.t : ph === "spin" ? T_END - c.t : CYCLE - c.t)}</span>`; });
  }
  function liveHtml(seed) { if (!liveIv) liveIv = setInterval(liveTick, 1000); setTimeout(liveTick, 0); return `<span class="rul-live" data-seed="${esc(seed)}"></span>`; }

  /* ---------- la pantalla ---------- */
  function open(host, done) {
    const K = A.adv && A.adv.casino && A.adv.casino.core && A.adv.casino.core.CX; if (!K || !K.rouShell) { done(); return; }
    const seed = host.seed, MIN = host.min || 1;
    const html = `<div class="ru-stage"><div class="ru-bg"></div>
      <div class="ru-hud"><div class="ru-t">${esc(tr(BET.n))}</div><div class="ru-s" data-r="play"></div><div class="ru-pips" data-r="pips"></div><div class="ru-sal">${A.icon ? A.icon("chip_r") : ""}<div><b data-r="bal"></b><small>${esc(tr(U.staked))} <span data-r="tot"></span></small></div></div></div>
      <div class="ru-ph"><span class="ru-phase" data-r="phase"></span><span class="ru-clock" data-r="clock"></span><div class="ru-cyc"><b class="s1"></b><b class="s2"></b><b class="s3"></b><i data-r="mark"></i></div></div>
      <div class="ru-left"><div class="ru-wheel"><canvas data-r="wheel"></canvas><div class="ru-res" data-r="res"></div></div><aside class="ru-board" data-r="board"></aside></div>
      <div class="ru-feltwrap"><div class="ru-felt" data-r="felt"></div></div>
      <div class="ru-info" data-r="info"></div>
      <div class="ru-tray"><div class="ru-trin" data-r="chips"></div></div>
      <div class="ru-acts"><button type="button" class="gb" data-a="undo">${esc(tr(U.undo))}</button><button type="button" class="gb" data-a="clear">${esc(tr(U.clear))}</button><button type="button" class="gb" data-a="again">${esc(tr(U.again))}</button><button type="button" class="gb" data-a="dbl">${esc(tr(U.dbl))}</button><button type="button" class="gb alt" data-a="skip">${esc(tr(U.skip))}</button><button type="button" class="gb out" data-a="stand">${esc(tr(U.stand))}</button></div>
      <div class="ru-say"><span class="ru-av">${A.icon ? A.icon("dealer_mini_s") : ""}</span><span class="ru-sayt" data-r="say"></span></div>
      <div class="ru-pay" data-r="pay"></div><div class="ru-streak" data-r="streak"></div><div class="ru-flash" data-r="flash"></div></div>`;
    let sh = null, dead = false, raf = 0, onResize = null;
    sh = K.rouShell("ruleta", html, {}, () => { dead = true; if (onResize) removeEventListener("resize", onResize); cancelAnimationFrame(raf); try { A.dealer.hold(false); } catch (e) { /* sin crupier */ } done(); });
    if (!sh) return;
    try { A.dealer.hold(true); } catch (e) { /* sin crupier */ }
    const ov = sh.ov, stage = ov.querySelector(".ru-stage"), Q = n => ov.querySelector(`[data-r="${n}"]`); ov.classList.remove("spin"); sh.waiting(true);
    const fit = () => { const W = ov.clientWidth || innerWidth, H = ov.clientHeight || innerHeight; const kk = A.casFit(ov, W, H);
      stage.style.transform = `translate(${Math.round((W - 1920 * kk) / 2)}px,${Math.round((H - 1080 * kk) / 2)}px) scale(${kk})`; };
    onResize = () => { if (ov.isConnected) fit(); }; fit(); addEventListener("resize", onResize);
    const draw = Wheel(Q("wheel")), felt = Q("felt"), infoEl = Q("info"), sayEl = Q("say");

    /* ---- el tapete: casillas, apuestas y su geometria (stage de 1920: W = 84) ---- */
    const INS = parseFloat(ov.style.getPropertyValue("--ins")) || 0, W = INS > 0 ? 76 : 84, H = 96, Z = Math.round(W * 1.25), HD = 76, T = { straight: 35, split: 17, street: 11, trio: 11, corner: 8, basket: 8, line: 5, column: 2, dozen: 2, even: 1 };
    const n3 = (c, rt) => 3 * c + 3 - rt, hotspots = [], outs = [], cells = {};
    const mk = (type, nums, label, cx, cy) => ({ type, nums, label, odds: T[type], cx, cy, key: type + ":" + nums.join("-") + ":" + label });
    (function geometry() {
      for (let rt = 0; rt < 3; rt++) hotspots.push(mk("split", [0, n3(0, rt)], tr(U.split) + " 0·" + n3(0, rt), Z, (rt + 0.5) * H));
      hotspots.push(mk("trio", [0, 2, 3], tr(U.trio) + " 0·2·3", Z, H)); hotspots.push(mk("trio", [0, 1, 2], tr(U.trio) + " 0·1·2", Z, 2 * H)); hotspots.push(mk("basket", [0, 1, 2, 3], tr(U.basket) + " 0·1·2·3", Z, 3 * H));
      for (let c = 0; c < 12; c++) {
        for (let rt = 0; rt < 3; rt++) {
          if (c < 11) { const a = n3(c, rt), b = n3(c + 1, rt); hotspots.push(mk("split", [a, b], tr(U.split) + " " + a + "·" + b, Z + (c + 1) * W, (rt + 0.5) * H)); }
          if (rt < 2) { const a = n3(c, rt), b = n3(c, rt + 1); hotspots.push(mk("split", [b, a], tr(U.split) + " " + b + "·" + a, Z + (c + 0.5) * W, (rt + 1) * H)); }
          if (c < 11 && rt < 2) { const q = [n3(c, rt + 1), n3(c + 1, rt + 1), n3(c, rt), n3(c + 1, rt)]; hotspots.push(mk("corner", q, tr(U.corner) + " " + q.join("·"), Z + (c + 1) * W, (rt + 1) * H)); }
        }
        const st = [3 * c + 1, 3 * c + 2, 3 * c + 3]; hotspots.push(mk("street", st, tr(U.street) + " " + st.join("·"), Z + (c + 0.5) * W, 3 * H));
        if (c < 11) { const six = [3 * c + 1, 3 * c + 2, 3 * c + 3, 3 * c + 4, 3 * c + 5, 3 * c + 6]; hotspots.push(mk("line", six, tr(U.line) + " " + six[0] + "-" + six[5], Z + (c + 1) * W, 3 * H)); }
      }
      const cm = [0, 2, 1];
      for (let rt = 0; rt < 3; rt++) { const ns = []; for (let n = 1; n <= 36; n++) if (n % 3 === cm[rt]) ns.push(n); const o = mk("column", ns, f(U.column, { n: rt === 0 ? 3 : rt === 1 ? 2 : 1 }), Z + 12 * W + W / 2, (rt + 0.5) * H); o.rect = [Z + 12 * W, rt * H, W, H]; o.txt = "2:1"; outs.push(o); }
      for (let i = 0; i < 3; i++) { const dn = []; for (let c = 1; c <= 12; c++) dn.push(12 * i + c); const o = mk("dozen", dn, f(U.dozen, { a: dn[0], b: dn[11] }), Z + (4 * i + 2) * W, 3 * H + HD / 2); o.rect = [Z + 4 * i * W, 3 * H, 4 * W, HD]; o.txt = dn[0] + "-" + dn[11]; outs.push(o); }
      const ev = [[U.low, n => n >= 1 && n <= 18, "1-18"], [U.even, n => n > 0 && n % 2 === 0, tr(U.even)], [U.red, n => RED.has(n), "r"], [U.black, n => n > 0 && !RED.has(n), "b"], [U.odd, n => n % 2 === 1, tr(U.odd)], [U.high, n => n >= 19, "19-36"]];
      ev.forEach((e, i) => { const ns = []; for (let n = 1; n <= 36; n++) if (e[1](n)) ns.push(n); const o = mk("even", ns, tr(e[0]), Z + (2 * i + 1) * W, 3 * H + HD + HD / 2); o.rect = [Z + 2 * i * W, 3 * H + HD, 2 * W, HD]; o.txt = e[2]; outs.push(o); });
    })();
    { const L = Math.max(40, INS), fw = INS > 0 ? Z + 13 * W + 24 : 1240, fl = INS > 0 ? L + 550 : 640; stage.style.setProperty("--L", L + "px"); stage.style.setProperty("--fl", fl + "px"); stage.style.setProperty("--fw", fw + "px"); }   // margen de seguridad (Deck): tapete mas estrecho y todo dentro de lo que se ve
    felt.style.width = Z + 13 * W + "px"; felt.style.height = 3 * H + 2 * HD + "px";
    const box = (cls, x, y, w, h, inner) => { const e = document.createElement("div"); e.className = "ru-c " + cls; e.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`; e.innerHTML = inner || ""; felt.appendChild(e); return e; };
    cells[0] = box("zero", 0, 0, Z, 3 * H, "0");
    for (let c = 0; c < 12; c++) for (let rt = 0; rt < 3; rt++) { const n = n3(c, rt); cells[n] = box(col(n), Z + c * W, rt * H, W, H, `<span class="t">${n}</span>`); }
    outs.forEach(o => { const inner = o.txt === "r" ? '<span class="dia" style="background:#b8272f"></span>' : o.txt === "b" ? '<span class="dia" style="background:#15151b;outline:1px solid rgba(209,169,84,.45)"></span>' : esc(o.txt); o.el = box("out", o.rect[0], o.rect[1], o.rect[2], o.rect[3], inner); });
    const ghost = document.createElement("img"); ghost.className = "ru-ghost"; ghost.alt = ""; ghost.style.display = "none"; felt.appendChild(ghost);
    const chipLayer = document.createElement("div"); chipLayer.className = "ru-chiplayer"; felt.appendChild(chipLayer);
    const nova = document.createElement("div"); nova.className = "ru-nova"; nova.textContent = tr(U.closed); felt.appendChild(nova);
    const straight = n => (n === 0 ? mk("straight", [0], tr(U.straight) + " 0", Z / 2, 1.5 * H) : mk("straight", [n], tr(U.straight) + " " + n, 0, 0));
    function betAt(x, y) {
      if (x < 0 || y < 0) return null;
      for (const o of outs) { const r = o.rect; if (x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3]) return o; }
      if (y >= 3 * H || x >= Z + 12 * W) return null;
      const c = Math.floor((x - Z) / W), rt = Math.floor(y / H);
      if (x >= Z) { const cx = Z + (c + 0.5) * W, cy = (rt + 0.5) * H; if (Math.abs(x - cx) < 0.27 * W && Math.abs(y - cy) < 0.27 * H) { const s = straight(n3(c, rt)); s.cx = cx; s.cy = cy; return s; } }
      let best = null, bd = 0.42; for (const h of hotspots) { const dd = Math.hypot((x - h.cx) / W, (y - h.cy) / H); if (dd < bd) { bd = dd; best = h; } }
      if (best) return best; if (x < Z) return straight(0); const s2 = straight(n3(c, rt)); s2.cx = Z + (c + 0.5) * W; s2.cy = (rt + 0.5) * H; return s2;
    }
    const describe = b => `${b.label} · ${f(U.cover, { n: b.nums.length })} · ${f(U.pays, { n: b.odds })}`;

    /* ---- estado de la mesa ---- */
    let amount = 25, bets = {}, stack = [], lastBets = null, coinsBefore = 0, locked = false, resolvedK = null, betsK = null, streak = 0, curK = null, lastPh = null, lastSec = -1, lateSaid = false, hoverB = null;
    const total = () => { let s = 0; for (const k in bets) s += bets[k].amount; return s; };
    const avail = () => (locked ? host.coins() : host.coins() - total());
    { const c0 = host.coins(); amount = c0 >= 100 ? 25 : c0 >= 25 ? 5 : 1; }
    const chipsEl = Q("chips");
    let drag = null;
    const syncChips = () => chipsEl.querySelectorAll(".ru-pile").forEach(b => b.classList.toggle("on", +b.dataset.v === amount));
    const inFelt = p => p[0] >= 0 && p[1] >= 0 && p[0] < felt.offsetWidth && p[1] < felt.offsetHeight;
    VALS.forEach((v, i) => { const b = document.createElement("div"); b.className = "ru-pile"; b.dataset.v = v; b.setAttribute("role", "button"); b.setAttribute("aria-label", f(U.chipLbl, { n: v })); b.tabIndex = 0;
      let st = ""; for (let k = 0; k < 5; k++) st += chipImg(i, `top:${(4 - k) * 8}px`);
      b.innerHTML = `<i class="ru-ar"></i><div class="ru-pc">${st}</div><span class="ru-pl">${fmt(v)}</span>`;
      b.addEventListener("pointerdown", e => {                                    // pulsar elige la pila; arrastrar saca una ficha y la deja donde sueltes
        e.preventDefault(); if (e.button) return; amount = v; syncChips(); sfx("rulPick", i); const sx = e.clientX, sy = e.clientY; let moved = false;
        const mv = ev => { if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return; if (!moved) { moved = true; drag = document.createElement("img"); drag.className = "ru-drag"; drag.src = `assets/icons/chip_${CHIP[i]}.webp`; drag.alt = ""; stage.appendChild(drag); ghost.style.display = "none"; }
          const r = stage.getBoundingClientRect(), k = r.width / 1920; drag.style.left = (ev.clientX - r.left) / k - 32 + "px"; drag.style.top = (ev.clientY - r.top) / k - 32 + "px"; const p = local(ev); hover(inFelt(p) ? betAt(p[0], p[1]) : null, true); };
        const up = ev => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); if (!moved) return; const p = local(ev), bb = inFelt(p) ? betAt(p[0], p[1]) : null; if (bb) place(bb, 1, v); else sfx("rulOff"); if (drag) drag.remove(); drag = null; hover(null); };
        addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up); });
      b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { amount = v; syncChips(); sfx("rulPick", i); } });
      chipsEl.appendChild(b); });
    { const b = document.createElement("button"); b.type = "button"; b.className = "gb ru-all"; b.textContent = tr(U.all); b.onclick = () => { amount = Math.max(MIN, avail()); syncChips(); sfx("rulPick", 5); infoEl.textContent = f(U.inHand, { n: fmt(amount) }); }; chipsEl.appendChild(b); }
    syncChips();
    const say = (text, ms) => { sayEl.textContent = text; sayEl.classList.remove("pop"); void sayEl.offsetWidth; sayEl.classList.add("pop"); };
    const hud = () => { Q("bal").textContent = fmt(avail()); Q("tot").textContent = fmt(total()); Q("play").textContent = f(U.play, { n: Math.min(host.play(), host.plays), m: host.plays }) + (host.bote() ? " · " + tr(U.bote) : "");
      const pg = Q("pips"), np = host.plays, cur = Math.min(host.play(), np); let h = ""; for (let i = 1; i <= np; i++) h += `<i class="${i < cur ? "on" : i === cur ? "now" : ""}"></i>`; if (pg.dataset.k !== h) { pg.dataset.k = h; pg.innerHTML = h; } };
    const stackHtml = b => { const d = breakdown(b.amount).slice(0, 5).reverse(), n = d.length, hh = 64 + (n - 1) * 6; let h = `<div class="ru-stk${b.st === 1 ? " win" : b.st === 0 ? " lose" : ""}" style="left:${b.cx - 32}px;top:${b.cy - 32 - (n - 1) * 6}px;height:${hh}px">`;
      d.forEach((di, i) => { h += chipImg(di, `top:${(n - 1 - i) * 6}px`); }); return h + `<em style="top:${hh - 4}px">${fmt(b.amount)}</em></div>`; };
    function drawChips() { chipLayer.innerHTML = Object.keys(bets).map(k => stackHtml(bets[k])).join(""); hud(); if (!hoverB) infoEl.textContent = idleInfo(); }
    function idleInfo() {                                                         // sin apuesta bajo el cursor: la cobertura de lo apostado (cuantos numeros cubres y lo maximo que cobrarias)
      const ks = Object.keys(bets); if (!ks.length) return tr(U.hint); let best = 0, cov = 0;
      for (let n = 0; n < 37; n++) { let t = 0; ks.forEach(k => { if (bets[k].nums.indexOf(n) >= 0) t += bets[k].amount * (bets[k].odds + 1); }); if (t) cov++; best = Math.max(best, t); }
      return f(U.covAll, { n: cov, m: fmt(best) }); }
    function hover(b, dragging) {
      hoverB = b; for (const n in cells) cells[n].classList.remove("hl");
      if (!b) { ghost.style.display = "none"; infoEl.textContent = idleInfo(); return; }
      b.nums.forEach(n => cells[n].classList.add("hl")); if (!dragging) { ghost.src = `assets/icons/chip_${CHIP[tierOf(amount)]}.webp`; ghost.style.cssText = `display:block;left:${b.cx - 32}px;top:${b.cy - 32}px`; } else ghost.style.display = "none";
      infoEl.textContent = `${describe(b)} · ${fmt(amount)} → ${fmt(amount * (b.odds + 1))}` + (bets[b.key] ? ` · ${fmt(bets[b.key].amount)}` : "");
    }
    function place(b, sign, a0) {
      if (locked || phNow() !== "bet") return;
      if (sign < 0) { const e = bets[b.key]; if (!e) return; const a = Math.min(a0 || amount, e.amount); e.amount -= a; if (e.amount <= 0) delete bets[b.key]; sfx("rulOff"); drawChips(); return; }
      const a = a0 || amount; if (a < MIN) return; if (a > avail()) { infoEl.textContent = tr(U.noChips); sfx("deny"); return; }
      if (bets[b.key]) bets[b.key].amount += a; else bets[b.key] = { type: b.type, nums: b.nums, odds: b.odds, cx: b.cx, cy: b.cy, label: b.label, amount: a };
      stack.push({ key: b.key, a }); sfx("rulChip", tierOf(a), stack.length); if (A.haptic) A.haptic([6]); drawChips();
    }
    const local = e => { const r = felt.getBoundingClientRect(), s = r.width / felt.offsetWidth || 1; return [(e.clientX - r.left) / s, (e.clientY - r.top) / s]; };
    felt.addEventListener("pointermove", e => { const p = local(e); hover(betAt(p[0], p[1])); });
    felt.addEventListener("pointerleave", () => hover(null));
    felt.addEventListener("click", e => { const p = local(e), b = betAt(p[0], p[1]); if (!b) return; place(b, e.shiftKey ? -1 : 1); hover(b); });
    felt.addEventListener("contextmenu", e => { e.preventDefault(); const p = local(e), b = betAt(p[0], p[1]); if (b) place(b, -1); });
    ov.querySelectorAll("[data-a]").forEach(btn => (btn.onclick = () => {
      const a = btn.dataset.a, bet = phNow() === "bet" && !locked;
      if (a === "stand") { sfx("rulOff"); leave(); return; }
      if (a === "skip") { const c = clk(); if (c.t < T_BET) OFF += T_BET - c.t + 0.05; return; }
      if (!bet) { sfx("deny"); return; }
      if (a === "undo") { const s = stack.pop(); if (!s) return; const b = bets[s.key]; if (!b) return; b.amount -= s.a; if (b.amount <= 0) delete bets[s.key]; sfx("rulOff"); drawChips(); }
      else if (a === "clear") { if (!Object.keys(bets).length) return; bets = {}; stack = []; sfx("rulOff"); drawChips(); }
      else if (a === "again") { if (!lastBets) return; let need = 0; for (const k in lastBets) need += lastBets[k].amount; if (need > avail()) { infoEl.textContent = tr(U.noChips); sfx("deny"); return; }
        let i = 0; for (const k in lastBets) { const l = lastBets[k]; if (bets[k]) bets[k].amount += l.amount; else bets[k] = JSON.parse(JSON.stringify(l)); delete bets[k].st; stack.push({ key: k, a: l.amount }); sfx("rulChip", tierOf(l.amount), ++i); } drawChips(); }
      else if (a === "dbl") { const t = total(); if (!t) return; if (t > avail()) { infoEl.textContent = tr(U.noChips); sfx("deny"); return; } let i = 0; for (const k in bets) { stack.push({ key: k, a: bets[k].amount }); sfx("rulChip", tierOf(bets[k].amount), ++i); bets[k].amount *= 2; } drawChips(); }
    }));

    /* ---- marcador ---- */
    let sigBoard = "";
    function drawBoard(c) {
      const last = lastRevealed(c), sig = last + ":" + (c.t >= T_END); if (sig === sigBoard) return; sigBoard = sig;
      const h = []; for (let i = 0; i < 60; i++) h.push(resOf(seed, last - i)); const cnt = { r: 0, b: 0, g: 0 }, fq = {}; h.forEach(n => { cnt[col(n)]++; fq[n] = (fq[n] || 0) + 1; });
      const all = []; for (let n = 0; n < 37; n++) all.push([n, fq[n] || 0]); const hotN = all.slice().sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3), coldN = all.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0]).slice(0, 3), pct = x => Math.round(x / h.length * 100) + " %";
      Q("board").innerHTML = `<div class="ru-lbl">${esc(tr(U.board))}</div><div class="ru-last"><i class="ru-d big ${col(h[0])}">${h[0]}</i><div><div class="ru-lbl">${esc(tr(U.last))}</div></div></div><div class="ru-hist">${h.slice(1, 11).map(disc).join("")}</div>
        <div class="ru-hc"><span class="ru-lbl">${esc(tr(U.hot))}</span>${hotN.map(x => disc(x[0])).join("")}<span class="ru-lbl">${esc(tr(U.cold))}</span>${coldN.map(x => disc(x[0])).join("")}</div>`;
    }

    /* ---- el ciclo: apuestas, cierre, giro, pago ---- */
    const phOf = t => (t < T_BET ? "bet" : t < T_END ? "spin" : "pay"), phNow = () => phOf(clk().t);
    function lock(k) {                                                           // se cierran las apuestas: aqui se cobran las fichas
      if (locked) return; locked = true; coinsBefore = host.coins(); const st = total(); felt.classList.add("locked");
      if (st > 0) { host.add(-st); hover(null); }
      hud(); say(line("ruNoMore")); sfx("rouNoMore"); sfx("rulLaunch"); if (A.haptic) A.haptic([14, 20]);
      setTimeout(() => { if (!dead && phNow() === "spin") say(line("ruRoll")); }, 2600);
    }
    function payFor(res) { let pay = 0; for (const k in bets) { const b = bets[k]; b.st = b.nums.indexOf(res) >= 0 ? 1 : 0; if (b.st) pay += b.amount * (b.odds + 1); } return pay; }
    function nearMiss(res) {                                                     // casi: una casilla vecina (en la rueda) de un numero apostado
      const i = IDX[res], nb = [ORDER[(i + 36) % 37], ORDER[(i + 1) % 37]]; for (const k in bets) { const b = bets[k]; if (b.nums.length <= 2 && b.nums.some(n => nb.includes(n))) return b; } return null;
    }
    function resolve(k, live) {                                                  // el numero ya esta decidido: se paga, se anima (live) y se avisa a la Barra
      if (resolvedK === k) return; resolvedK = k; const res = resOf(seed, k), stake = total();
      if (!locked && stake > 0) { locked = true; coinsBefore = host.coins(); host.add(-stake); }
      const pay = payFor(res), before = coinsBefore, net = pay - stake, mult = stake ? pay / stake : 0, lvl = pay <= 0 ? 0 : mult >= 10 ? 3 : mult >= 3 ? 2 : 1;
      if (live) {
        const rs = Q("res"); rs.innerHTML = `<i class="ru-d huge ${col(res)}">${res}</i>`; rs.classList.remove("on"); void rs.offsetWidth; rs.classList.add("on"); sfx("rulReveal", res === 0 ? 2 : col(res) === "r" ? 0 : 1);
        for (const n in cells) cells[n].classList.toggle("won", +n === res);
        if (res === 0) { sfx("rouZero"); A.publico && A.publico("rota", 300); }
      }
      drawChips();
      if (stake > 0) {
        if (pay > 0) host.add(pay); streak = pay > 0 ? streak + 1 : 0;
        const near = pay <= 0 && live ? nearMiss(res) : null;
        if (live) celebrate(lvl, pay, net, stake, res, near);
        host.onSpin(stake, pay, before);                                          // la Barra anota la jugada (racha, bote, ficha dorada, fin de partida)
        setTimeout(() => hud(), 50);
        if (host.over()) setTimeout(() => !dead && sh.close(), live ? 3600 : 0);
      } else if (live) { say(res === 0 ? line("ruZero") : line("ruNoBet")); }
      if (Object.keys(bets).length) lastBets = JSON.parse(JSON.stringify(bets)); stack = [];
    }
    function celebrate(lvl, pay, net, stake, res, near) {
      const pe = Q("pay"), flash = Q("flash");
      const cnt = (to, ms, up) => { const t0 = performance.now(); let i = 0, lastTick = -1; pe.className = "ru-pay on " + (up ? "up" : "down"); pe.style.color = up ? "#ffcf5a" : "#ff8a7a";
        const step = () => { if (dead) return; const p = clamp((performance.now() - t0) / ms, 0, 1), v = Math.round(to * (1 - Math.pow(1 - p, 2.4))); pe.textContent = (up ? "+" : "−") + fmt(v);
          const ti = Math.floor(p * Math.min(24, 6 + to / Math.max(1, stake) * 1.2)); if (up && ti !== lastTick) { lastTick = ti; sfx("rulCount", i++, lvl); } if (p < 1) requestAnimationFrame(step); else { pe.classList.add("end"); setTimeout(() => !dead && pe.classList.remove("on", "end"), 2200); } }; step(); };
      if (pay > 0) {
        const dur = [0, 900, 1500, 2400][lvl];
        sfx("rulWin", lvl); if (lvl >= 2) { try { A.core.jpShake && A.core.jpShake(lvl); } catch (e) { /* sin temblor */ } } if (A.haptic) A.haptic(lvl >= 3 ? [30, 40, 60] : [20, 30]);
        if (lvl === 3) { A.publico && A.publico("jackpot", 200); flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on"); } else if (lvl === 2) A.publico && A.publico("diana", 200);
        if (streak >= 2) { setTimeout(() => !dead && streakBadge(), 700); }
        setTimeout(() => !dead && cnt(net > 0 ? pay : pay, dur, true), 380); flyChips(); setTimeout(() => !dead && bump(), 380 + dur);
        say(res === 0 && lvl > 0 ? line("ruBig") : lvl >= 3 ? line("ruStraight") : lvl === 2 ? line("ruBig") : streak >= 2 ? line("ruStreak") : line("ruWin"));
      } else {
        sfx("rulLose"); chipsFade(); setTimeout(() => !dead && cnt(stake, 700, false), 300);
        if (near) { setTimeout(() => { if (dead) return; sfx("rulNear"); A.publico && A.publico("porpoco"); nearFx(near); }, 700); say(line("ruNear")); } else say(res === 0 ? line("ruZero") : line("ruLose"));
      }
    }
    function streakBadge() { const el = Q("streak"); el.textContent = f(U.streak, { n: streak }); el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); sfx("rulStreak", streak); }
    function nearFx(b) { b.nums.forEach(n => { const c = cells[n]; if (c) { c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); } }); }
    function chipsFade() { /* las fichas perdidas se apagan (clase lose en drawChips) */ }
    function flyChips() {
      const target = Q("bal").getBoundingClientRect(), sc = stage.getBoundingClientRect().width / 1920 || 1;
      chipLayer.querySelectorAll(".ru-stk.win").forEach((el, i) => { const r = el.getBoundingClientRect(), dx = (target.left + target.width / 2 - (r.left + r.width / 2)) / sc, dy = (target.top + target.height / 2 - (r.top + r.height / 2)) / sc;
        setTimeout(() => { if (dead) return; el.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 60}px) scale(1.25)`, opacity: 1, offset: 0.4 }, { transform: `translate(${dx}px,${dy}px) scale(.45)`, opacity: 0.1 }], { duration: 820, easing: "cubic-bezier(.5,0,.7,.4)", fill: "forwards" }); sfx("rulCoin", i); }, 1500 + i * 90); });
    }
    function bump() { const b = Q("bal"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }

    /* ---- el bucle: rueda, bola, reloj, sonidos de cada tramo ---- */
    let pocketPrev = -1, rollNext = 0, bounceN = -1, lastRel = 0, lastT = 0;
    const phaseText = { bet: () => tr(U.open), spin: () => tr(U.closed), pay: k => f(U.out, { n: resOf(seed, k) }) };
    function frame() {
      if (dead || !ov.isConnected) return; raf = requestAnimationFrame(frame);
      const c = clk(), k = c.k, t = c.t, ph = phOf(t);
      if (curK !== k) {                                                          // giro nuevo: las apuestas del anterior ya se pagaron
        if (curK != null && resolvedK !== curK && (locked || total() > 0)) resolve(curK, false);
        if (Object.keys(bets).length && !locked) { /* apuestas sin cerrar de un giro que paso: se devuelven (no se cobraron) */ }
        bets = {}; stack = []; locked = false; curK = k; lateSaid = false; lastSec = -1; felt.classList.remove("locked"); for (const n in cells) cells[n].classList.remove("won");
        if (resolvedK !== k && ph !== "bet") resolvedK = k;                       // te sientas con el giro a medias: nada que pagar
        Q("res").classList.remove("on"); drawChips(); if (lastPh != null) { say(line("ruOpen")); sfx("rulGo"); }
      }
      if (ph !== lastPh) {
        if (ph === "spin") { if (lastPh === "bet") lock(k); else { locked = true; felt.classList.add("locked"); } }
        else if (ph === "pay") { if (lastPh === "spin") resolve(k, true); else { resolvedK = k; Q("res").innerHTML = `<i class="ru-d huge ${col(resOf(seed, k))}">${resOf(seed, k)}</i>`; Q("res").classList.add("on"); for (const n in cells) cells[n].classList.toggle("won", +n === resOf(seed, k)); } }
        if (lastPh == null) say(line("ruHello"));
        lastPh = ph; pocketPrev = -1; bounceN = -1;
      }
      if (ph === "bet") {
        const left = T_BET - t, s = Math.ceil(left); if (!lateSaid && left <= 6) { lateSaid = true; say(line("ruLate")); }
        if (left <= 5 && s !== lastSec) { lastSec = s; if (s >= 1) sfx("rulTick", 6 - s); }
      }
      const b = ballAt(seed, k, t), phi = c.now * 0.42; draw(phi, b.rel, b.r, b.win);
      /* los clics de la bola: rodadura sobre la pista, y cada casilla que cruza al caer (mas lentos al frenar) */
      if (ph === "spin") {
        const nowMs = performance.now(), speed = Math.abs(b.rel - lastRel) / Math.max(0.001, (nowMs - lastT) / 1000);
        if (b.u > 0.01 && b.u < 0.6 && nowMs > rollNext) { rollNext = nowMs + 90; sfx("rulRoll", clamp(1 - b.u / 0.6, 0, 1)); }
        if (b.u >= 0.5 && b.r < 62.5) { const pk = Math.floor((((b.rel % TAU) + TAU) % TAU) / STEP); if (pocketPrev !== -1 && pk !== pocketPrev) sfx("rulClick", clamp(speed / 40, 0, 1)); pocketPrev = pk; }
        if (b.v > 0 && b.v < 1) { const bn = Math.floor(b.v * 14 / Math.PI); if (bounceN !== -1 && bn > bounceN) sfx("rulBounce", bn); bounceN = bn; }
        if (b.u >= 1 && !Q("res").classList.contains("on")) { /* la bola ya esta quieta */ }
        lastRel = b.rel; lastT = nowMs;
      } else { lastRel = b.rel; lastT = performance.now(); }
      felt.classList.toggle("pay", ph === "pay");
      const label = phaseText[ph](k), pe = Q("phase"); if (pe.textContent !== label) pe.textContent = label; pe.className = "ru-phase " + ph;
      Q("clock").textContent = mmss(ph === "bet" ? T_BET - t : ph === "spin" ? T_END - t : CYCLE - t); Q("mark").style.left = t / CYCLE * 100 + "%";
      drawBoard(c);
    }
    function leave() {                                                           // levantarse: con el giro cerrado y sin pagar, se paga ya (la bola ya estaba decidida)
      if (dead) return; const c = clk(); if (locked && resolvedK !== c.k && total() > 0) resolve(c.k, false); sh.close();
    }
    sh.hooks.skip = null; sh.hooks.leave = leave; sh.hooks.leaveBtn = false;                    // Esc / B: levantarse de la mesa (el boton ya es «Levantarse»)
    hover(null); drawBoard(clk()); hud(); frame();
    return { close: () => sh.close() };
  }
  A.barraRuleta = { open, liveHtml, bet: BET, tx: U, resOf, nowS, CYCLE, T_BET, T_END, _off: v => { OFF = v; } };
})(window.AIQ);
