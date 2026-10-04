/*
 * Geolite - JEFES CON IDENTIDAD (tanda 16). Lo que los jefes ponen FUERA del mapa. El plan de cada jefe y sus efectos por pregunta viven en js/challenges.js
 * (BX: cada pregunta sube de tono); aqui, lo que se ve y se oye alrededor:
 *   - la barra de escalada (5 muescas que se encienden) y el pulso rojo del borde al subir de tono
 *   - La siesta del crupier: duerme en su esquina; el ruido (zoom, arrastre, herramientas y segundos de duda) lo despierta y salta el Apagon
 *   - Rompe la cuarta pared: el Salvapantallas (el primer clic solo lo despierta) y el Pantallazo azul falso (el tiempo se devuelve)
 *   - El coleccionista: su album, con un golpe de sello en cada bandera
 *   - Rueda de la fortuna: gira antes de cada pregunta (el tiempo se devuelve) y cae en una familia de retos
 * Respeta "reducir movimiento" (sin temblores ni destellos) y el ajuste Vibracion. Todo lo que gira o se mueve va con transform/opacity.
 *
 *   A.jefes.begin()  A.jefes.question(o, qi)  A.jefes.reveal()  A.jefes.end()  A.jefes.riseHtml()  A.jefes.noise(n)
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const J = A.jefes = {};
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const CS = () => A.chal.state, game = () => (A.core && A.core.S) || {}, mapOf = () => A.core && A.core.map;
  const tl = k => A.tx(A.chal.tl(k));
  const say = (k, ...a) => { try { A.sfx[k] && A.sfx[k](...a); } catch (e) { /* audio no listo */ } };
  const reduce = () => document.documentElement.classList.contains("reduce-motion") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const phaseOk = () => { const g = game(); return g.phase === "asking" && !g.paused; };
  const elapsed = () => { const g = game(); return g.t0 ? (performance.now() - g.t0 - (g.pausedAcc || 0)) / 1000 : 0; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const has = id => !!A.chal.get(id);
  let timers = [], polls = [];
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const poll = (fn, ms) => { const t = setInterval(fn, ms); polls.push(t); return t; };
  const stopAll = () => { timers.forEach(clearTimeout); timers = []; polls.forEach(clearInterval); polls = []; };
  const gone = el => { if (el) { el.classList.add("bye"); setTimeout(() => el.remove(), 220); } };
  /* un golpe seco de la pantalla (nunca con reducir movimiento ni con Vibracion apagada) */
  const punch = () => { const app = $("app"); if (!app || reduce() || (A.haptic && A.haptic.on === false)) return; app.classList.remove("chx-punch"); A.restyle && A.restyle(app); app.classList.add("chx-punch"); later(() => app.classList.remove("chx-punch"), 260); };

  /* ------------------------------------------------------------------ barra de escalada (5 muescas) y medidor de ruido */
  const smallWin = () => innerWidth <= 900 || innerHeight <= 560;
  J.riseHtml = () => {
    const s = CS(); if (!s.on || !s.bk) return ""; const q = clamp(s.q | 0, 0, 4);
    const pips = [0, 1, 2, 3, 4].map(i => `<i class="${i < q ? "on" : i === q ? "cur" : ""}" style="--h:${i}"></i>`).join("");
    const noise = Nap.on || Nap.woke ? `<div class="ab-noise${Nap.woke ? " woke" : ""}"><b>${esc(tl("ui_noise"))}</b><span><i style="width:${Math.round(clamp(Nap.noise / Math.max(1, Nap.thr), 0, 1) * 100)}%"></i></span></div>` : "";
    return `<div class="ab-rise" data-q="${q}" title="${esc(tl("ui_rise"))}">${pips}</div>${noise}`;
  };
  function riseKick(qi) {
    if (qi > 0) say("bossRise", qi);
    later(() => { const el = document.querySelector("#advBar .ab-rise .cur"); if (el) el.classList.add("pop"); document.querySelectorAll("#advBar .ch-chip.tw").forEach(c => c.classList.add("tw-in")); }, 40);
    if (qi > 0 && !reduce()) {
      let e = $("bossPulse"); if (!e) { e = document.createElement("div"); e.id = "bossPulse"; document.body.appendChild(e); }
      e.style.setProperty("--q", qi); e.classList.remove("on"); void e.offsetWidth; e.classList.add("on");
    }
  }

  /* ------------------------------------------------------------------ LA SIESTA DEL CRUPIER */
  const Nap = { on: false, woke: false, noise: 0, thr: 100, lvl: -1, last: 0, s: 1, cx: 0, cy: 0, zoomMoving: false, settle: 0, h: 0, idle: 3, wheelAt: 0 };
  J._nap = Nap; J._bsod = () => bsodShow();   // pruebas
  function napMeter() { const i = document.querySelector("#advBar .ab-noise i"); if (i) i.style.width = Math.round(clamp(Nap.noise / Math.max(1, Nap.thr), 0, 1) * 100) + "%"; }
  function napAdd(x) {
    if (!Nap.on || Nap.woke || x <= 0) return; Nap.noise = Math.min(Nap.thr, Nap.noise + x); const z = Nap.noise / Nap.thr, lvl = z < 0.4 ? 0 : z < 0.75 ? 1 : 2;
    napMeter(); if (A.dealer.napLevel) A.dealer.napLevel(lvl, z);
    if (lvl !== Nap.lvl) { if (Nap.lvl >= 0 && lvl > Nap.lvl) say("napStir", lvl); Nap.lvl = lvl; }
    if (Nap.noise >= Nap.thr) napWake();
  }
  J.noise = n => { if (Nap.on) napAdd(n); };
  function napWheel() { const now = performance.now(); if (Nap.on && !Nap.woke && now - Nap.t0 > 1700 && now - Nap.wheelAt > 160) napAdd(20); Nap.wheelAt = now; }   // cada vuelta de rueda: +20 (como mucho una cada 160 ms)
  function napStart(e) {
    const m = mapOf(), v = m && m.view; Object.assign(Nap, { on: true, woke: false, noise: 0, thr: e.thr || 100, lvl: 0, last: performance.now(), s: v ? v.s : 1, cx: v ? v.cx : 0, cy: v ? v.cy : 0, idle: 3, wheelAt: 0, t0: performance.now() });
    if (m && m.cv) { Nap.cv = m.cv; m.cv.addEventListener("wheel", napWheel, { passive: true }); }
    A.dealer.enable(true); A.dealer.nap(true); if (A.dealer.napLevel) A.dealer.napLevel(0, 0); say("napOn");
    Nap.h = poll(() => {
      const now = performance.now(), dt = Math.min(0.25, (now - Nap.last) / 1000); Nap.last = now; if (!Nap.on || Nap.woke) return;
      const g = game(); if (!phaseOk()) return; const mm = mapOf(), vv = mm && mm.view, el = elapsed();
      if (vv) {
        if (el < 1.7) { Nap.s = vv.s; Nap.cx = vv.cx; Nap.cy = vv.cy; }                      // el mapa que se coloca al empezar no cuenta
        else {
          const moving = Math.abs(Math.log(vv.s / Nap.s)) > 0.003; Nap.s = vv.s;               // un zoom: la escala se pone en marcha tras estar quieta (ruedas aparte, ver napWheel)
          if (moving) { if (Nap.idle >= 2 && now - Nap.wheelAt > 450) napAdd(20); Nap.idle = 0; } else Nap.idle++;
          const dragging = ((mm.pointers && mm.pointers.size > 0) || now - (mm.padPanAt || 0) < 200) && !moving, d = Math.hypot(vv.cx - Nap.cx, vv.cy - Nap.cy) * vv.s; Nap.cx = vv.cx; Nap.cy = vv.cy;   // arrastrar: +10 por segundo
          if (dragging && d > 0.4) napAdd(10 * dt);
        }
      }
      if (el > 6) napAdd(12 * dt);                                                              // y cada segundo de duda pasado el sexto
    }, 100);
  }
  function napWake() {
    if (Nap.woke) return; Nap.woke = true; Nap.on = false; polls.forEach(clearInterval); polls = []; if (Nap.cv) { Nap.cv.removeEventListener("wheel", napWheel); Nap.cv = null; }
    const D = A.dealer; D.nap(false); say("napWake"); punch();
    A.chal.inject([{ id: "dark", lv: 3, of: "siesta", slam: 1, tw: 1 }]);                       // se despierta de golpe: esa pregunta sigue con Apagon a nivel 3
    D.enable(true); D.say(A.L6(A.chal.T16.ui_siestaWake), { mood: "furious", hold: 1800 });
  }
  document.addEventListener("aiq:mapcanvas", () => { if (!Nap.cv) return; Nap.cv.removeEventListener("wheel", napWheel); const m = mapOf(); Nap.cv = (m && m.cv) || null; if (Nap.cv) Nap.cv.addEventListener("wheel", napWheel, { passive: true }); });   // el mapa recreo su lienzo
  function napStop() { if (Nap.cv) { Nap.cv.removeEventListener("wheel", napWheel); Nap.cv = null; } Nap.on = false; Nap.woke = false; Nap.noise = 0; if (A.dealer.nap) A.dealer.nap(false); }
  (function wrapTool() { const t0 = setInterval(() => { if (A.adv && A.adv.useTool) { clearInterval(t0); const u = A.adv.useTool; A.adv.useTool = function (...a) { if (Nap.on) J.noise(40); return u.apply(this, a); }; } }, 500); })();   // cada herramienta: +40

  /* ------------------------------------------------------------------ SALVAPANTALLAS y PANTALLAZO AZUL */
  let SS = null, BS = null;
  const half = () => (CS().fx || {}).glassMul < 0.9;                                           // el Protector las deja a medias
  function ssShow() {
    if (SS) return; const el = document.createElement("div"); el.id = "ssFx"; if (half()) el.classList.add("half");
    el.innerHTML = `<canvas width="320" height="180"></canvas><img class="ss-logo" alt="" src="assets/icons/boss_hat.webp"><p class="ss-hint">${esc(tl("ui_ssHint"))}</p>`; document.body.appendChild(el);
    const cv = el.querySelector("canvas"), g = cv.getContext("2d"), logo = el.querySelector(".ss-logo"), stars = Array.from({ length: 70 }, () => ({ x: Math.random() * 320 - 160, y: Math.random() * 180 - 90, z: Math.random() * 3 + 0.3 }));
    const S0 = { x: 40 + Math.random() * 300, y: 40 + Math.random() * 200, vx: (Math.random() < 0.5 ? -1 : 1) * 150, vy: (Math.random() < 0.5 ? -1 : 1) * 110, hue: 0, last: performance.now(), t0: performance.now(), mx: 0, my: 0, acc: 0 };
    SS = { el, raf: 0 }; say("ssOn");
    const frame = now => {
      if (!SS || SS.el !== el) return; SS.raf = requestAnimationFrame(frame); const dt = Math.min(0.05, (now - S0.last) / 1000); S0.last = now;
      g.fillStyle = "rgba(2,4,12,.45)"; g.fillRect(0, 0, 320, 180);
      for (const s of stars) { s.z -= dt * 1.1; if (s.z <= 0.15) { s.x = Math.random() * 320 - 160; s.y = Math.random() * 180 - 90; s.z = 3.3; } const k = 1 / s.z, x = 160 + s.x * k, y = 90 + s.y * k, a = Math.min(1, k * 0.5); g.fillStyle = `rgba(${s.z < 1 ? "255,230,160" : "170,190,255"},${a.toFixed(2)})`; g.fillRect(x | 0, y | 0, k > 2.4 ? 2 : 1, k > 2.4 ? 2 : 1); }
      const W = innerWidth, H = innerHeight, sz = 96; S0.x += S0.vx * dt; S0.y += S0.vy * dt;
      let hit = false; if (S0.x < 0) { S0.x = 0; S0.vx = Math.abs(S0.vx); hit = true; } else if (S0.x > W - sz) { S0.x = W - sz; S0.vx = -Math.abs(S0.vx); hit = true; } if (S0.y < 0) { S0.y = 0; S0.vy = Math.abs(S0.vy); hit = true; } else if (S0.y > H - sz) { S0.y = H - sz; S0.vy = -Math.abs(S0.vy); hit = true; }
      if (hit) { S0.hue = (S0.hue + 70) % 360; logo.style.filter = `hue-rotate(${S0.hue}deg)`; say("ssBounce"); }
      logo.style.transform = `translate(${S0.x.toFixed(1)}px,${S0.y.toFixed(1)}px)`;
    };
    SS.raf = requestAnimationFrame(frame);
    const need = half() ? 24 : 70, wake = () => { if (!SS || SS.el !== el) return; cancelAnimationFrame(SS.raf); SS = null; gone(el); say("ssWake"); };
    el.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); if (performance.now() - S0.t0 > 450) wake(); }, true);   // el primer clic solo la despierta (y no llega al mapa)
    el.addEventListener("click", e => { e.stopPropagation(); }, true);
    el.addEventListener("pointermove", e => { if (S0.mx || S0.my) S0.acc += Math.hypot(e.clientX - S0.mx, e.clientY - S0.my); S0.mx = e.clientX; S0.my = e.clientY; if (S0.acc > need && performance.now() - S0.t0 > 700) wake(); }, true);
    el.addEventListener("wheel", e => e.stopPropagation(), true);
  }
  function bsodShow() {
    if (BS) return; const dur = half() ? 900 : 1500, el = document.createElement("div"); el.id = "bsodFx";
    el.innerHTML = `<div class="bs-in"><b class="bs-sad">:(</b><p>${esc(tl("ui_bsodMsg"))}</p><p class="bs-c"><span class="bs-pct">0</span>% — ${esc(tl("ui_bsodCollect"))}</p><div class="bs-row"><i class="bs-qr"></i><span>${esc(tl("ui_bsodStop"))}: GEOGRAPHY_CRITICAL_ERROR</span></div></div>`;
    document.body.appendChild(el); BS = { el }; say("bsodOn"); const g = game(); if (g.limit != null) g.limit += (dur + 220) / 1000;   // el tiempo se devuelve (tambien los 0,22 s en que se va)
    const t0 = performance.now(), pct = el.querySelector(".bs-pct"), iv = setInterval(() => { pct.textContent = String(Math.min(100, Math.round(((performance.now() - t0) / dur) * 100))); }, 60);
    for (const ev of ["pointerdown", "click", "pointermove", "wheel"]) el.addEventListener(ev, e => e.stopPropagation(), true);
    BS.iv = iv; setTimeout(() => { clearInterval(iv); if (BS && BS.el === el) { BS = null; gone(el); say("restore"); } }, dur);
  }
  function armAfter(lo, hi, fn) {
    const lim = game().limit || 20, at = lim * (lo + Math.random() * (hi - lo)); let fired = false;
    poll(() => { if (fired || !phaseOk()) return; if (elapsed() >= at) { fired = true; fn(); } }, 120);
  }

  /* ------------------------------------------------------------------ EL COLECCIONISTA: el album y el golpe de sello */
  function albumShow(qi, e) {
    const st = CS(), order = st.pub.filter(c => c.wh != null).sort((a, b) => a.wh - b.wh), D = A.CHAL; let box = $("albumFx"); if (box) box.remove();
    box = document.createElement("div"); box.id = "albumFx";
    const slot = c => c.wh < qi ? `<span class="al-s done">${A.icon(D[c.id].ico, "sm")}</span>` : c.wh === qi ? `<span class="al-s cur">${A.icon(D[c.id].ico)}</span>` : `<span class="al-s back">${A.icon("boss_hat", "sm")}</span>`;
    box.innerHTML = `<h4>${esc(tl("ui_album"))} ${qi + 1}/5</h4><div class="al-row">${order.map(slot).join("")}</div><p class="al-n">${esc(A.tx(D[e.of || e.id].n))}</p>`;
    document.body.appendChild(box); say("albumStamp", qi); later(() => gone(box), 2800);
  }

  /* ------------------------------------------------------------------ RUEDA DE LA FORTUNA */
  const WF = ["letras", "saber", "luz", "tormenta", "vista", "sitio", "puntero", "pantalla", "mentiras"], WI = { letras: "ch_shaky", saber: "ch_riddle", luz: "ch_dark", tormenta: "ch_lightning", vista: "ch_blur", sitio: "ch_spread", puntero: "ch_tremble", pantalla: "ch_crack", mentiras: "ch_wrongborders" };
  const WC = ["#c9a3ff", "#ffd95a", "#4a4d72", "#4cb4ff", "#4ee3c1", "#ff9f4a", "#ff6bb5", "#a8ecff", "#ff5a55"];
  function wheelShow(e) {
    const fam = A.CHAL[e.of || e.id] && A.CHAL[e.of || e.id].fam, idx = Math.max(0, WF.indexOf(fam)), SL = 360 / WF.length, dur = reduce() ? 500 : 1200; let el = $("wheelFx"); if (el) el.remove();
    el = document.createElement("div"); el.id = "wheelFx";
    const grad = WF.map((f, i) => `${WC[i]} ${i * SL}deg ${(i + 1) * SL}deg`).join(","), ics = WF.map((f, i) => `<img class="wh-i" alt="" src="assets/icons/${WI[f]}.webp" style="transform:rotate(${(i + 0.5) * SL}deg) translateY(-92px) rotate(${-(i + 0.5) * SL}deg)">`).join("");
    el.innerHTML = `<div class="wh-wrap"><div class="wh-pt"></div><div class="wh-disc" style="background:conic-gradient(${grad})">${ics}<i class="wh-hub"></i></div><p class="wh-t">${esc(tl("ui_wheelSpin"))}</p></div>`; document.body.appendChild(el);
    for (const ev of ["pointerdown", "click", "wheel"]) el.addEventListener(ev, ev2 => ev2.stopPropagation(), true);
    const disc = el.querySelector(".wh-disc"), rot = 360 * 3 + (360 - (idx + 0.5) * SL) + (Math.random() - 0.5) * SL * 0.5, g = game(); if (g.limit != null) g.limit += (dur + 1120) / 1000;   // el tiempo se devuelve entero: tapa los clics hasta que se va (giro, 0,9 s y 0,22 s de salida)
    void disc.offsetWidth; disc.style.transition = `transform ${dur}ms cubic-bezier(.12,.7,.18,1)`; disc.style.transform = `rotate(${rot}deg)`;
    const ease = t => 1 - Math.pow(1 - t, 3.2); let n = 0, last = 0; for (let k = 1; k <= 3 * WF.length + idx + 1; k++) { const a = k * SL / rot; if (a > 1) break; const tt = 1 - Math.pow(1 - a, 1 / 3.2); later(() => say("wheelTick", a), tt * dur); n++; last = tt; }
    later(() => { say("wheelLand"); el.classList.add("land"); el.querySelector(".wh-t").textContent = A.tx(A.chal.tl("fam_" + WF[idx])); }, dur + 40);
    later(() => gone(el), dur + 900);
  }

  /* ------------------------------------------------------------------ enganches con js/challenges.js */
  J.begin = () => { cleanup(); };
  J.question = (o, qi) => {
    cleanup(); const st = CS(); if (!st.on || !st.bk) return; riseKick(qi);
    const sz = A.chal.get("siesta"); if (sz) napStart(sz);
    if (A.chal.get("screensaver")) armAfter(0.3, 0.55, ssShow);
    if (A.chal.get("bsod")) armAfter(0.28, 0.45, bsodShow);
    const tw = (st.bl || []).find(c => c.tw);
    if (st.bk === "collector" && tw) later(() => albumShow(qi, tw), qi ? 250 : 900);
    if (st.bk === "wheel" && tw) wheelShow(tw);
  };
  function cleanup() {
    stopAll(); napStop(); if (SS) { cancelAnimationFrame(SS.raf); SS.el.remove(); SS = null; } if (BS) { clearInterval(BS.iv); BS.el.remove(); BS = null; }
    for (const id of ["albumFx", "wheelFx"]) { const e = $(id); if (e) e.remove(); }
  }
  J.reveal = () => { const was = Nap.on; cleanup(); if (was && A.dealer.release) A.dealer.release(); };
  J.end = () => { const was = Nap.on; cleanup(); if (was && A.dealer.release) A.dealer.release(); const e = $("bossPulse"); if (e) e.remove(); };
})(window.AIQ);
