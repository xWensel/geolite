/*
 * Geolite - AJUSTES > CONTROLES (v0.3.2). Tres vistas: Teclado | Raton | Mando.
 *  - Teclas: 21 acciones con tecla y alternativa (js/teclas.js); Esc fija. Pulsar una casilla abre la ventana del crupier, que graba la tecla
 *    siguiente; si ya la usa otra accion, ofrece intercambiarlas. Supr deja la casilla vacia.
 *  - Raton: dibujo pixel art del raton con el boton que marca (oro) y el que arrastra (turquesa), que se ilumina al pulsarlo encima. Los dos
 *    botones se graban igual que las teclas (pulsando el boton dentro de la ventana), rueda invertida,
 *    zoom hacia el puntero o el centro, zurdos (marcar y arrastrar con el derecho) y el puntero de casino con su tamano.
 *  - Mando (js/mando.js): dibujo pixel art del mando que ilumina lo que pulsas, perfiles Estandar / Zurdo / Personalizado, cambiar el boton
 *    de cada accion (pulsandolo o eligiendolo en la ventana), visores de los sticks con su zona muerta, curva, invertir ejes y la sensacion.
 * El dibujo y los visores solo se animan con la pestana a la vista (Ajustes abierto, vista Mando).
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), K = A.keys, M = A.mando;
  if (!K || !$("ctlKb")) return;
  const C = A.ctl = {};
  let dev = M && M.on ? "pad" : "kb", padSub = "btns", visible = false, raf = 0;
  const segSet = (sg, v) => { if (!sg) return; const bs = [...sg.querySelectorAll("button")].filter(b => !b.classList.contains("hidden")); const ix = Math.max(0, bs.findIndex(b => b.dataset.v === String(v))); bs.forEach((b, i) => b.classList.toggle("on", i === ix)); sg.style.setProperty("--idx", ix); sg.style.setProperty("--n", bs.length); };
  const ui = () => { if (A.sfx && A.sfx.ui) A.sfx.ui(); };
  const anyPad = () => { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g && g.connected) return g; return null; };
  const FAMN = { xbox: "Xbox", ps: "PlayStation", nin: "Nintendo", deck: "Steam Deck" };

  /* ---------------- teclado ---------------- */
  const COLS = [["ok", "pause", "fs", "sfx", "mus", "codex", "zin", "zout", "home", "alt", "songPrev"], ["up", "down", "left", "right", "t1", "t2", "t3", "t4", "songNext", "back"]];
  function kbRender() {
    const host = $("kbList"); if (!host) return;
    const head = `<div class="kb-h"><span>${A.t("ctl.act")}</span><span>${A.t("ctl.key")}</span><span>${A.t("ctl.alt")}</span></div>`;
    const row = a => {
      if (a === "back") return `<div class="kb-r"><span class="kb-a">${A.t("ka.back")}</span><span class="kslot lock">Esc</span><span class="kslot lock fx">${A.t("ctl.fixed")}</span></div>`;
      const m = K.map[a]; return `<div class="kb-r"><span class="kb-a" data-fit>${A.t("ka." + a)}</span>${[0, 1].map(i => `<button type="button" class="kslot${m[i] ? "" : " empty"}" data-ka="${a}" data-ki="${i}">${m[i] ? esc(K.label(m[i])) : "+"}</button>`).join("")}</div>`;
    };
    host.innerHTML = COLS.map(c => `<div class="kb-col">${head}${c.map(row).join("")}</div>`).join("");
    /* nombre que no cabe (idiomas largos): la ayuda emergente lo muestra entero */
    requestAnimationFrame(() => host.querySelectorAll("[data-fit]").forEach(e => { if (e.scrollWidth > e.clientWidth + 1) e.setAttribute("data-tt", e.textContent); else e.removeAttribute("data-tt"); }));
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function mouseSync() {
    const m = K.mouse;
    document.querySelectorAll("[data-mb]").forEach(b => { b.textContent = K.mouseName(m[b.dataset.mb]); });
    const left = document.querySelector('[data-msw="left"]'); if (left) left.setAttribute("aria-checked", m.pick === 2 && m.drag === 2);
    const inv = document.querySelector('[data-msw="invWheel"]'); if (inv) inv.setAttribute("aria-checked", !!m.invWheel);
    segSet(document.querySelector('[data-mseg="zoomMid"]'), m.zoomMid ? 1 : 0);
    drawMouse();
  }
  /* el raton en pixel art (64x96, x3): cuerpo, botones izquierdo y derecho, rueda y dos laterales. Oro = marca, turquesa = arrastra (los dos: a rayas) */
  let mPress = -1, mPressT = 0;
  function drawMouse() {
    const cv = document.querySelector("#mouseDiag canvas"); if (!cv) return;
    const c = cv.getContext("2d"), W = 64, H = 96, img = c.createImageData(W, H), m = K.mouse;
    const body = (x, y) => { if (x < 9 || x > 54 || y < 5 || y > 91) return false; const cx = 31.5, hw = 22.5, rTop = 21, rBot = 17;
      if (y < 5 + rTop) { const dy = 5 + rTop - y, dx = Math.max(0, Math.abs(x - cx) - (hw - rTop)); return dx * dx + dy * dy <= rTop * rTop; }
      if (y > 91 - rBot) { const dy = y - (91 - rBot), dx = Math.max(0, Math.abs(x - cx) - (hw - rBot)); return dx * dx + dy * dy <= rBot * rBot; } return true; };
    const side = (x, y) => x >= 6 && x <= 9 && y >= 40 && y <= 57 && y !== 48;                     // laterales: adelante (arriba) y atras (abajo)
    const solid = (x, y) => body(x, y) || side(x, y);
    /* zona de cada pixel: 0 izq, 1 rueda, 2 der, 3 atras, 4 adelante; -2 juntura; -1 carcasa */
    const zone = (x, y) => { if (side(x, y) && !body(x, y)) return y < 48 ? 4 : 3; if (!body(x, y)) return -9;
      if (x >= 29 && x <= 34 && y >= 11 && y <= 27) return (x === 29 || x === 34 || y === 11 || y === 27) ? -2 : 1;
      if (y === 36 || ((x === 31 || x === 32) && y < 36)) return -2; if (y < 36) return x < 31 ? 0 : 2; return -1; };
    const put = (x, y, col) => { const i = (y * W + x) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255; };
    const GOLD = [248, 180, 73], TEAL = [73, 194, 189], lit = (col, k) => col.map(v => Math.round(v + (255 - v) * k)), dim = (col, k) => col.map(v => Math.round(v * k));
    const pressed = b => b === mPress && performance.now() - mPressT < 380;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!solid(x, y)) continue;
      if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) { put(x, y, [8, 18, 13]); continue; }
      const z = zone(x, y);
      if (z === -2) { put(x, y, [10, 22, 16]); continue; }
      if (z >= 0) {
        const pk = m.pick === z, dg = m.drag === z;
        let col = pk && dg ? ((x + y) % 6 < 3 ? GOLD : TEAL) : pk ? GOLD : dg ? TEAL : z === 1 ? [40, 60, 50] : [70, 100, 84];
        if (z === 1 && !pk && !dg && (y - 11) % 3 === 0) col = [26, 40, 33];                      // las estrias de la rueda
        if (!solid(x, y - 2) || (z <= 2 && z !== 1 && y < 8)) col = lit(col, 0.25);               // brillo de arriba
        if (z <= 2 && z !== 1 && y > 32) col = dim(col, 0.85);
        if (pressed(z)) col = lit(col, 0.55);
        put(x, y, col); continue;
      }
      put(x, y, y > 80 ? [34, 52, 43] : x > 50 ? [40, 60, 50] : [50, 74, 61]);
    }
    c.putImageData(img, 0, 0);
  }
  /* pie de Ajustes: las teclas que de verdad hacen cada cosa */
  function footSync() { document.querySelectorAll("[data-kk]").forEach(k => { const t = K.labelOf(k.dataset.kk); k.textContent = t || "—"; k.classList.toggle("none", !t); });
    /* la nota de Pantalla nombra la tecla de pantalla completa (F de fabrica): que diga la de verdad */
    const wn = document.querySelector('[data-i="set.win.d"]'), fk = K.labelOf("fs"); if (wn) wn.textContent = fk ? A.t("set.win.d").replace(/(?<![A-Za-z])F(?![A-Za-z])/, fk) : A.t("set.win.d");
  }

  /* ---------------- mando ---------------- */
  const PACT = ["ok", "back", "alt", "zin", "zout", "home", "prec"];
  const POS = { lt: [27, 5], rt: [97, 5], lb: [40, 13], rb: [84, 13], ls: [37, 38], dpad: [49, 55], rs: [75, 55], view: [53, 32], menu: [71, 32], a: [92, 45], b: [100, 37], x: [84, 37], y: [92, 29] };
  const IDX = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, view: 8, menu: 9, ls: 10, rs: 11 };
  let padBuilt = false;
  function padBuild() {
    const d = $("padDiag"); if (!d || padBuilt) return; padBuilt = true;
    d.innerHTML = `<canvas width="124" height="92"></canvas>` + Object.keys(POS).map(k => `<i class="glp" data-glp="${k}" data-pk="${k}" style="left:${POS[k][0] * 3}px;top:${POS[k][1] * 3}px"></i>`).join("");
    drawPad(d.querySelector("canvas"));
  }
  /* el mando en pixel art: siluetas por pixel en una rejilla de 124x92 (x3), sin suavizado */
  function drawPad(cv) {
    const c = cv.getContext("2d"), W = 124, H = 92, img = c.createImageData(W, H);
    const inBody = (x, y) => { y -= 14; const e = (cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
      return (x >= 26 && x <= 98 && y >= 6 && y <= 44 && !(y < 12 && (x < 32 || x > 92))) || e(32, 44, 22, 30) || e(92, 44, 22, 30) || e(38, 14, 14, 9) || e(86, 14, 14, 9); };
    const inTrig = (x, y) => (y >= 1 && y <= 10 && ((x >= 20 && x <= 34) || (x >= 90 && x <= 104))) || (y >= 9 && y <= 17 && ((x >= 30 && x <= 50) || (x >= 74 && x <= 94)));
    const put = (x, y, r, g, b) => { const i = (y * W + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = inBody(x, y) && y < 88, t = !b && inTrig(x, y);
      if (b) { const edge = !inBody(x - 1, y) || !inBody(x + 1, y) || !inBody(x, y - 1) || !inBody(x, y + 1) || y >= 87;
        if (edge) put(x, y, 8, 18, 13); else if (!inBody(x, y - 2)) put(x, y, 92, 120, 104); else if (y > 76) put(x, y, 34, 52, 43); else put(x, y, 47, 70, 58); }
      else if (t) { const edge = !inTrig(x - 1, y) || !inTrig(x + 1, y) || !inTrig(x, y - 1); put(x, y, edge ? 8 : 30, edge ? 18 : 44, edge ? 13 : 37); }
    }
    for (const [cx, cy, r] of [[37, 38, 8], [75, 55, 8], [49, 55, 8], [92, 37, 13]]) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = x * x + y * y; if (d <= r * r) { if (d > (r - 1) * (r - 1)) put(cx + x, cy + y, 22, 36, 29); else if (cx === 92) put(cx + x, cy + y, 40, 61, 50); else put(cx + x, cy + y, 26, 41, 33); } }
    c.putImageData(img, 0, 0);
  }
  const PROF = ["std", "left"];
  function padSync() {
    if (!M || !$("padList")) return;
    const B = M.binds(), GLN = M.GLN, sw = M.sticksSwapped();
    const rows = PACT.map(a => `<div class="pb-r" data-pb="${GLN[B[a]]}"><i class="glp" data-glp="${GLN[B[a]]}"></i><span class="pb-a">${A.t("pa." + a)}</span><button type="button" class="mini-btn" data-pa="${a}">${A.t("ctl.change")}</button></div>`);
    /* los fijos (Menu, sticks y cruceta), en una rejilla compacta debajo */
    const fixed = [["menu", "pa.menu"], [sw ? "rs" : "ls", "pa.ls"], [sw ? "ls" : "rs", "pa.rs"], ["dpad", "pa.dpad"]].map(([g, k]) => `<div class="pb-r fixed" data-pb="${g}"><i class="glp" data-glp="${g}"></i><span class="pb-a">${A.t(k)}</span></div>`);
    $("padList").innerHTML = rows.join("") + `<div class="pb-fx"><em>${A.t("ctl.fixedb")}</em>${fixed.join("")}</div>`;
    const st = $("padProfile"), p = M.settings.profile; st.querySelector(".stp-v").textContent = A.t("pf." + p);
    const [lo, hi] = st.querySelectorAll(".stp-b"), i = PROF.indexOf(p); lo.disabled = i === 0; hi.disabled = i === PROF.length - 1;
    curve();
  }
  C.padSync = padSync;
  function curve() {
    const cv = $("curveCv"); if (!cv || !M) return; const c = cv.getContext("2d"), p = { lin: 1, soft: 2.2, fine: 3.2 }[M.settings.curve] || 2.2, W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H); c.fillStyle = "#0a1610"; c.fillRect(0, 0, W, H); c.fillStyle = "rgba(242,233,214,.12)"; for (let x = 0; x < W; x += 8) c.fillRect(x, 0, 1, H); for (let y = 0; y < H; y += 8) c.fillRect(0, y, W, 1);
    c.fillStyle = "#f8b449"; let py = null; for (let x = 0; x < W; x++) { const y = H - 2 - Math.round(Math.pow(x / (W - 1), p) * (H - 4)); const a = py == null ? y : Math.min(py, y), b = py == null ? y : Math.max(py, y); c.fillRect(x, a, 1, b - a + 1); py = y; }
  }
  /* visor de un stick: el circulo, la zona muerta (lo que se ignora) y la posicion real */
  function viz(cv, x, y, dz, live) {
    const c = cv.getContext("2d"), N = cv.width, h = (N - 1) / 2, R = h - 2;
    c.fillStyle = "#0a1610"; c.fillRect(0, 0, N, N);
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) { const d = Math.hypot(px - h, py - h) / R;
      if (Math.abs(d - 1) < 0.045) { c.fillStyle = "rgba(242,233,214,.38)"; c.fillRect(px, py, 1, 1); }
      else if (d <= dz) { c.fillStyle = Math.abs(d - dz) < 0.06 ? "rgba(248,180,73,.85)" : "rgba(0,0,0,.6)"; c.fillRect(px, py, 1, 1); } }
    c.fillStyle = "rgba(242,233,214,.14)"; c.fillRect(Math.round(h), 3, 1, N - 6); c.fillRect(3, Math.round(h), N - 6, 1);
    if (!live) return; const m = Math.hypot(x, y), on = m > dz, X = Math.round(h + Math.max(-1, Math.min(1, x)) * R) - 2, Y = Math.round(h + Math.max(-1, Math.min(1, y)) * R) - 2;
    c.fillStyle = on ? "#ffe08a" : "#6b7d72"; c.fillRect(X, Y, 5, 5); c.fillStyle = "#08120c"; c.fillRect(X, Y, 5, 1);
  }
  let hlSig = "";
  function tick() {
    raf = 0; if (!visible || dev !== "pad") return;
    const L = M && M.live && performance.now() - M.live.t < 600 ? M.live : null, gp = anyPad();
    const on = new Set(); if (L) L.btn.forEach((d, i) => { if (d) { const k = M.GLN[i] || (i >= 12 && i <= 15 ? "dpad" : null); if (k) on.add(k); } });
    if (L) { if (Math.hypot(L.ax[0], L.ax[1]) > 0.25) on.add(M.sticksSwapped() ? "rs" : "ls"); if (Math.hypot(L.ax[2], L.ax[3]) > 0.25) on.add(M.sticksSwapped() ? "ls" : "rs"); }
    const sig = [...on].join(); if (sig !== hlSig) { hlSig = sig; document.querySelectorAll("#padDiag [data-pk], #padList [data-pb]").forEach(e => e.classList.toggle("hl", on.has(e.dataset.pk || e.dataset.pb))); }
    if (padSub === "sticks") { const s = M.settings; viz($("vizL"), L ? L.ax[0] : 0, L ? L.ax[1] : 0, s.dzL / 100, !!L); viz($("vizR"), L ? L.ax[2] : 0, L ? L.ax[3] : 0, s.dzR / 100, !!L); $("vizNote").classList.toggle("off", !!gp); }
    raf = requestAnimationFrame(tick);
  }
  const loop = () => { if (!raf && visible && dev === "pad") raf = requestAnimationFrame(tick); };

  /* ---------------- vista y sincronizacion ---------------- */
  function show() {
    segSet(document.querySelector('[data-seg="ctldev"]'), dev); segSet(document.querySelector('[data-seg="padsub"]'), padSub);
    $("ctlKb").classList.toggle("hidden", dev !== "kb"); $("ctlMouse").classList.toggle("hidden", dev !== "mouse"); $("ctlPad").classList.toggle("hidden", dev !== "pad");
    for (const [id, k] of [["padBtns", "btns"], ["padSticks", "sticks"], ["padFeel", "feel"]]) $(id).classList.toggle("hidden", padSub !== k);
    const g = anyPad(); $("ctlUse").textContent = g ? A.t("ctl.use.pad", { n: FAMN[M ? M.famName() : "xbox"] || "" }) : A.t("ctl.use.kb"); $("ctlUse").classList.toggle("pad", !!g);
    const r = $("ctlReset"); if (!r.classList.contains("armed")) r.textContent = A.t("ctl.reset." + dev);
    if (M && M.famNow) { $("ctlPad").dataset.padfam = M.famNow(); $("rbOv").dataset.padfam = M.famNow(); }
    if (dev === "pad") { padBuild(); padSync(); } else if (dev === "kb") kbRender(); else mouseSync();
    hlSig = ""; loop();
    if (A.core && A.core.S && A.core.S.settingsOpen) requestAnimationFrame(() => dispatchEvent(new Event("resize")));   // Ajustes vuelve a medir si cabe (fitSet)
  }
  C.sync = () => { footSync(); if (visible) show(); else { kbRender(); mouseSync(); } };
  C.shown = on => { const was = visible; visible = !!on; if (visible && !was) { if (M && M.on) dev = "pad"; show(); } if (!visible) { if (raf) cancelAnimationFrame(raf); raf = 0; } };
  K.onChange(() => { footSync(); if (visible && dev === "kb") kbRender(); if (visible && dev === "mouse") mouseSync(); });
  addEventListener("gamepadconnected", () => { if (visible) show(); }); addEventListener("gamepaddisconnected", () => { if (visible) show(); });

  document.querySelector('[data-seg="ctldev"]').addEventListener("click", e => { const b = e.target.closest("button"); if (!b || b.dataset.v === dev) return; dev = b.dataset.v; ui(); show(); });
  document.querySelector('[data-seg="padsub"]').addEventListener("click", e => { const b = e.target.closest("button"); if (!b || b.dataset.v === padSub) return; padSub = b.dataset.v; ui(); show(); });
  $("padProfile").addEventListener("click", e => { const b = e.target.closest(".stp-b"); if (!b || b.disabled || !M) return; const i = PROF.indexOf(M.settings.profile), j = i < 0 ? (+b.dataset.d > 0 ? 1 : 0) : Math.max(0, Math.min(PROF.length - 1, i + +b.dataset.d)); ui(); M.setProfile(PROF[j]); });
  /* restablecer: dos pulsaciones, como los otros reinicios */
  { const r = $("ctlReset"); let tm = 0;
    r.addEventListener("click", () => {
      if (!r.classList.contains("armed")) { r.classList.add("armed"); r.textContent = A.t("ctl.reset.ask"); ui(); clearTimeout(tm); tm = setTimeout(() => { r.classList.remove("armed"); show(); }, 4000); return; }
      clearTimeout(tm); r.classList.remove("armed");
      if (dev === "kb") { const mm = Object.assign({}, K.mouse); K.reset(); Object.assign(K.mouse, mm); K.changed(); }
      else if (dev === "mouse") { const km = JSON.parse(JSON.stringify(K.map)); K.reset(); K.map = km; K.changed(); const S = A.core.S; S.panSens = 100; S.zoomSens = 100; A.mapSens.pan = 1; A.mapSens.zoom = 1; S.cursor = true; A.cursor.set(true); S.curSize = "n"; if (A.cursor.setSize) A.cursor.setSize(false); A.core.save(); }
      else if (M && M.resetSettings) M.resetSettings();
      if (A.sfx && A.sfx.card) A.sfx.card(); r.textContent = A.t("set.reset.done"); setTimeout(() => show(), 1600); if (A.core.syncSettings) A.core.syncSettings();
    }); }
  /* raton: interruptores y segmentado */
  document.querySelectorAll("[data-msw]").forEach(s => s.addEventListener("click", () => {
    const m = K.mouse; if (s.dataset.msw === "left") { const on = !(m.pick === 2 && m.drag === 2); m.pick = m.drag = on ? 2 : 0; } else m.invWheel = !m.invWheel;
    K.changed(); if (A.sfx && A.sfx.flip) A.sfx.flip(true);
  }));
  document.querySelector('[data-mseg="zoomMid"]').addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const v = b.dataset.v === "1"; if (v === K.mouse.zoomMid) return; K.mouse.zoomMid = v; K.changed(); ui(); });

  /* ---------------- ventana de reasignar (con el crupier) ---------------- */
  const ov = $("rbOv"); let rb = null, rbT = 0;
  const say = t => { $("rbSay").textContent = t; };
  function rbOpen(o) {
    rb = o; ov.classList.remove("hidden"); ov.classList.remove("clash"); if (A.iconize) A.iconize(ov);
    $("rbWhat").textContent = o.label; $("rbYes").classList.add("hidden"); $("rbNo").textContent = A.t("ctl.cancel");
    $("rbZone").classList.toggle("hidden", o.kind !== "mouse"); $("rbGls").classList.toggle("hidden", o.kind !== "pad");
    say(A.t(o.kind === "kb" ? "rb.key" : o.kind === "pad" ? "rb.pad" : "rb.mouse"));
    $("rbHint").textContent = A.t(o.kind === "kb" ? "rb.key.h" : o.kind === "pad" ? "rb.pad.h" : "rb.mouse.h");
    if (o.kind === "mouse") $("rbZone").textContent = A.t("rb.zone");
    if (o.kind === "pad") { $("rbGls").innerHTML = M.FREE.map(i => `<button type="button" data-rbg="${i}" aria-label="${M.GLN[i]}"><i class="glp" data-glp="${M.GLN[i]}"></i></button>`).join(""); M.capture(i => (i < 0 ? rbClose() : padPick(i))); }
    const bar = $("rbBar"); bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = "";   // reinicia la cuenta atras
    clearTimeout(rbT); rbT = setTimeout(() => { if (rb && !rb.clash) rbClose(); }, 10000);
    if (A.dealer && A.dealer.face) try { A.dealer.face("neutral"); } catch (e) { /* sin cara */ }
    requestAnimationFrame(() => { const f = o.kind === "mouse" ? $("rbZone") : $("rbNo"); if (f && f.focus) f.focus({ preventScroll: true }); });
  }
  function rbClose() { if (M && M.cancelCapture) M.cancelCapture(); rb = null; ov.classList.add("hidden"); clearTimeout(rbT); show(); }
  function clash(text, yes) { rb.clash = yes; ov.classList.add("clash"); say(text); $("rbYes").textContent = A.t("rb.swap"); $("rbYes").classList.remove("hidden"); $("rbZone").classList.add("hidden"); $("rbGls").classList.add("hidden"); clearTimeout(rbT); if (M && M.cancelCapture) M.cancelCapture(); if (A.sfx && A.sfx.deny) A.sfx.deny(); requestAnimationFrame(() => $("rbYes").focus({ preventScroll: true })); }
  function done(sel) { rbClose(); if (A.sfx && A.sfx.card) A.sfx.card(); if (sel) requestAnimationFrame(() => { const el = document.querySelector(sel); if (el) { el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 900); } }); }
  function kbPick(e) {
    const { a, i } = rb, c = K.clash(e, a, i), code = K.fromEvent(e);
    if (c) { const [oa, oi] = c; clash(A.t("rb.clash", { k: K.label(code), a: A.t("ka." + oa) }), () => { const prev = K.map[a][i]; K.map[oa][oi] = prev; K.map[a][i] = code; K.changed(); done(`[data-ka="${a}"][data-ki="${i}"]`); }); return; }
    K.map[a][i] = code; K.changed(); done(`[data-ka="${a}"][data-ki="${i}"]`);
  }
  function padPick(i) {
    const { a } = rb, B = M.binds(), other = Object.keys(B).find(k => B[k] === i && k !== a);
    if (B[a] === i) { rbClose(); return; }
    const apply = () => { M.setBind(a, i); done(`#padList [data-pa="${a}"]`); };
    if (other) clash(A.t("rb.clash.pad", { a: A.t("pa." + other) }), apply); else apply();
  }
  addEventListener("keydown", e => {
    if (!rb) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); rbClose(); return; }
    if (rb.clash || rb.kind !== "kb") { if (rb.kind !== "kb" && !rb.clash) e.stopImmediatePropagation(); return; }   // con la pregunta de intercambiar, Intro y Tab llevan el foco a Si / Cancelar
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.repeat) return;
    if (/^(Control|Alt|Meta|AltGraph|OS)$/.test(e.key)) { if (A.sfx && A.sfx.deny) A.sfx.deny(); return; }   // Ctrl y Alt solos: los atajos del juego no se disparan con ellas pulsadas
    if (e.key === "Delete" || e.key === "Backspace") { K.map[rb.a][rb.i] = null; K.changed(); done(); return; }
    if (K.reserved(e)) { if (A.sfx && A.sfx.deny) A.sfx.deny(); return; }
    kbPick(e);
  }, true);
  addEventListener("keyup", e => { if (rb && rb.kind === "kb" && !rb.clash) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  $("rbZone").addEventListener("pointerdown", e => { if (!rb || rb.kind !== "mouse" || !e.isTrusted) return; e.preventDefault(); e.stopPropagation(); K.mouse[rb.which] = e.button; K.changed(); done(`[data-mb="${rb.which}"]`); });
  $("rbZone").addEventListener("contextmenu", e => e.preventDefault());
  $("rbNo").addEventListener("click", () => rbClose());
  $("rbYes").addEventListener("click", () => { const f = rb && rb.clash; if (f) f(); });
  $("rbGls").addEventListener("click", e => { const b = e.target.closest("[data-rbg]"); if (b && rb && rb.kind === "pad" && !rb.clash) padPick(+b.dataset.rbg); });
  ov.addEventListener("pointerdown", e => e.stopPropagation());     // pulsar dentro de la ventana no cierra Ajustes
  /* casillas */
  $("ctlKb").addEventListener("click", e => {
    const k = e.target.closest("[data-ka]"); if (k) { ui(); rbOpen({ kind: "kb", a: k.dataset.ka, i: +k.dataset.ki, label: A.t("ka." + k.dataset.ka) + (k.dataset.ki === "1" ? " · " + A.t("ctl.alt") : "") }); return; }
  });
  $("ctlMouse").addEventListener("click", e => { const m = e.target.closest("[data-mb]"); if (m) { ui(); rbOpen({ kind: "mouse", which: m.dataset.mb, label: A.t(m.dataset.mb === "pick" ? "mb.pickL" : "mb.dragL") }); } });
  /* probar el raton: pulsar encima del dibujo ilumina ese boton */
  { const cv = document.querySelector("#mouseDiag canvas"); cv.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; e.preventDefault(); mPress = e.button; mPressT = performance.now(); drawMouse(); setTimeout(drawMouse, 400); }); cv.addEventListener("contextmenu", e => e.preventDefault()); cv.addEventListener("auxclick", e => e.preventDefault()); }
  $("ctlPad").addEventListener("click", e => { const b = e.target.closest("[data-pa]"); if (b && M) { ui(); rbOpen({ kind: "pad", a: b.dataset.pa, label: A.t("pa." + b.dataset.pa) }); } });
  addEventListener("aiq:lang", () => C.sync());
  C.sync();
})(window.AIQ);
