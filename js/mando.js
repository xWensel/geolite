/*
 * Geolite - MANDO (v0.2.28). Un solo cursor para el mando, que entra por el MISMO camino que el raton:
 *  - stick izquierdo: mueve el cursor libre (curva suave, aceleracion a fondo, LB = precision). Sobre el mapa el cursor es la mira de
 *    js/pointer.js, asi que los retos de puntero (espejo, viento, temblor, retraso...) le afectan igual que al raton;
 *  - cruceta: salta al boton o carta mas cercano en esa direccion (menus, Campamento, HUD), con repeticion al mantener;
 *  - stick derecho: desplaza el mapa (o el contenido con scroll fuera de el); gatillos: zoom anclado en el cursor (LT aleja, RT acerca);
 *  - A: pulsa lo que hay bajo el cursor (en el mapa, clava la chincheta); B: lo mismo que Esc; Menu: pausa o Ajustes; Y: cambiar de pregunta
 *    (Tab); RB: vista inicial (0).
 * El "pasar por encima" se emula con eventos pointer/mouse sinteticos (globos de ayuda, carta grande, crupier) y una copia de las reglas
 * CSS :hover con la clase .pad-hov. html[data-input] dice que se usa (mouse | pad | touch); el raton de verdad devuelve el control al raton.
 * Coste: sin mando conectado no hay bucle; con mando, una lectura por fotograma y solo se toca el DOM cuando el cursor se mueve.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const root = document.documentElement, $ = id => document.getElementById(id);
  const DZ = 0.15, TDZ = 0.08, CURVE = 2.2, REP0 = 380, REP = 90;
  const M = A.mando = { on: false, x: innerWidth / 2, y: innerHeight / 2 };
  let raf = 0, lastT = 0, padIdx = -1, padAt = {}, prevB = [], repAt = {}, fastT = 0, hit = null, hovChain = [], cur = null, moved = true, snap = null, primSeen = null, primPend = null, primT = 0;

  /* ---------- modo de entrada ---------- */
  const setMode = m => {
    if (root.dataset.input === m) return; root.dataset.input = m; M.on = m === "pad";
    watchDom(M.on);
    if (!M.on) { setHover(null); if (cur) cur.hidden = true; } else { if (!M.used) { M.used = true; M.x = innerWidth / 2; M.y = innerHeight / 2; } sweepHover(); ensureCur(); moved = true; }
  };
  root.dataset.input = "mouse";
  addEventListener("pointermove", e => { if (e.isTrusted && M.on && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) setMode(e.pointerType === "touch" ? "touch" : "mouse"); }, { capture: true, passive: true });
  addEventListener("pointerdown", e => { if (e.isTrusted && M.on) setMode(e.pointerType === "touch" ? "touch" : "mouse"); }, { capture: true, passive: true });

  /* ---------- :hover para el cursor del mando: cada regla con :hover se copia con .pad-hov (una vez) ---------- */
  let swept = false;
  function sweepHover() {
    if (swept) return; swept = true;
    const fix = list => {
      for (let i = list.cssRules.length - 1; i >= 0; i--) {
        const r = list.cssRules[i];
        if (r.cssRules && !r.selectorText) { try { fix(r); } catch (e) { /* regla de grupo no editable */ } continue; }
        if (!r.selectorText || r.selectorText.indexOf(":hover") < 0) continue;
        const sel = r.selectorText.split(",").filter(s => s.indexOf(":hover") >= 0).map(s => s.replace(/:hover/g, ".pad-hov")).join(",");
        try { list.insertRule(sel + "{" + r.style.cssText + "}", i + 1); } catch (e) { /* selector que el navegador no acepta */ }
      }
    };
    for (const sh of document.styleSheets) { try { fix(sh); } catch (e) { /* hoja externa (fuentes) */ } }
  }

  /* ---------- cursor dibujado (el mismo pixel art del puntero de casino) ---------- */
  let curKind = "";
  function ensureCur() {
    if (!cur) { cur = document.createElement("div"); cur.id = "padCur"; cur.setAttribute("aria-hidden", "true"); document.body.appendChild(cur); }
    cur.hidden = false; place();
  }
  function curSprite(k) {
    if (curKind === k || !cur) return; curKind = k;
    const s = A.cursor && A.cursor.sprite ? A.cursor.sprite(k) : null; if (!s) return;
    cur.style.backgroundImage = `url("${s.url}")`; cur.style.width = s.w + "px"; cur.style.height = s.h + "px"; cur.style.marginLeft = -s.hx + "px"; cur.style.marginTop = -s.hy + "px";
  }
  const place = () => { if (cur) cur.style.transform = `translate(${Math.round(M.x)}px,${Math.round(M.y)}px)`; };

  /* ---------- eventos sinteticos: lo que haria el navegador con un raton en (x, y) ---------- */
  const ev = (type, t, o) => { const P = type.startsWith("pointer"), E = P ? PointerEvent : MouseEvent;
    t.dispatchEvent(new E(type, Object.assign({ bubbles: !/enter|leave/.test(type), cancelable: true, composed: true, clientX: M.x, clientY: M.y, view: window, button: 0, buttons: 0 }, P ? { pointerId: 1, pointerType: "mouse", isPrimary: true } : {}, o || {}))); };
  const chainOf = el => { const c = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) c.push(e); return c; };
  function setHover(el) {
    const old = hit; if (old === el) return; hit = el;
    const nc = el ? chainOf(el) : [];
    if (old && old.isConnected) { ev("pointerout", old, { relatedTarget: el }); ev("mouseout", old, { relatedTarget: el }); for (const e of hovChain) if (!nc.includes(e)) { ev("pointerleave", e, { relatedTarget: el }); ev("mouseleave", e, { relatedTarget: el }); } }
    for (const e of hovChain) if (!nc.includes(e)) e.classList.remove("pad-hov");
    if (el) { ev("pointerover", el, { relatedTarget: old }); ev("mouseover", el, { relatedTarget: old }); for (const e of nc.slice().reverse()) if (!hovChain.includes(e)) { ev("pointerenter", e, { relatedTarget: old }); ev("mouseenter", e, { relatedTarget: old }); } }
    for (const e of nc) e.classList.add("pad-hov");
    hovChain = nc; if (cache) mo.takeRecords();
    if (cur) { const map = A.core && A.core.map; const onMap = !!(el && map && el === map.cv); cur.classList.toggle("off", onMap && !!map.pickEnabled); curSprite(el && clickable(el) ? "ptr" : "def"); }
  }
  /* se llama cuando el cursor se ha movido: nuevo elemento bajo el cursor + movimiento */
  function track(still) {
    const el = document.elementFromPoint(M.x, M.y);                     // #padCur no cuenta (pointer-events: none)
    setHover(el); if (el && !still) { ev("pointermove", el); ev("mousemove", el); }   // quieto: solo se mira que hay debajo (sin "movimiento": hay retos que lo vigilan)
  }

  /* ---------- que es "pulsable": lo que el puntero de casino marca con la mano (cursor: pointer). Con el mando el cursor del sistema va
     oculto (cursor: none en todo), asi que se lee un instante sin ese ocultado (.pad-scan) y se recuerda (clk) para la mano del cursor ---------- */
  const ptrCur = cs => /pointer\s*$/.test(cs.cursor);
  const INTER = "button, a[href], input, select, textarea, summary, label, [role=button], [role=switch], [role=tab], [role=checkbox], [role=radio], [role=option], [role=menuitem], [tabindex]:not([tabindex='-1'])";
  let clk = new WeakSet(), cache = null;
  /* la mano o la flecha del cursor: con la ultima lectura si sigue valida; si no, por el tipo de elemento (sin leer estilos mientras te mueves) */
  function clickable(el) {
    for (let e = el; e && e !== document.body; e = e.parentElement) { if (e.disabled) return false; if (cache ? clk.has(e) : e.matches(INTER + ", [data-tt], [data-tip], [data-tf], [onclick]")) return true; }
    return false;
  }
  /* la lectura (5-10 ms con 2.000 elementos) se guarda hasta que la pantalla cambia: mantener la cruceta no la repite en cada salto */
  const mo = new MutationObserver(() => { cache = null; });
  const watchDom = on => { mo.disconnect(); cache = null; if (on) mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden", "disabled", "aria-hidden"] }); };
  addEventListener("scroll", () => { cache = null; }, { capture: true, passive: true });
  function targets() {
    if (cache) return cache;
    root.classList.add("pad-scan");
    try { cache = scan(); } finally { root.classList.remove("pad-scan"); }
    mo.takeRecords();                                                   // el propio .pad-scan no invalida lo que se acaba de leer
    return cache;
  }
  function scan() {
    const out = [], inside = new Set(); clk = new WeakSet();
    for (const el of document.body.querySelectorAll("*")) {
      if (el.parentElement && inside.has(el.parentElement) && !el.matches(INTER)) { inside.add(el); continue; }   // lo de dentro de un boton cuenta como el boton (salvo otro control: el interruptor dentro del aviso)
      if (el.id === "padCur" || el.disabled) continue;
      const cs = getComputedStyle(el); if (!ptrCur(cs) || cs.visibility === "hidden" || cs.pointerEvents === "none") continue;
      inside.add(el); clk.add(el);
      const r = el.getBoundingClientRect(); if (r.width < 6 || r.height < 6 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
      if (r.width * r.height > innerWidth * innerHeight * 0.45) continue;   // fondos pulsables (cerrar al pulsar fuera, "pulsa para entrar"): A ya los pulsa, la cruceta no se para en ellos
      /* que se vea de verdad: el centro (o alguna esquina) responde a este elemento y no a otra capa encima */
      const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 4, r.top + 4], [r.right - 4, r.bottom - 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.top + 4]];
      if (!pts.some(([x, y]) => { if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false; const h = document.elementFromPoint(x, y); return h && (h === el || el.contains(h)); })) continue;
      out.push({ el, r });
    }
    return out;
  }
  /* cruceta: el destino mas cercano en esa direccion (huecos y desvio lateral pesan; lo alineado gana) */
  function step(dx, dy) {
    const list = targets();
    const base = hit && list.find(t => t.el === hit || t.el.contains(hit));
    const o = base ? base.r : { left: M.x, right: M.x, top: M.y, bottom: M.y, width: 0, height: 0 };
    const ox = (o.left + o.right) / 2, oy = (o.top + o.bottom) / 2;
    let best = null, bs = Infinity;
    for (const t of list) {
      if (base && t === base) continue; const r = t.r, cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      const along = dx ? (cx - ox) * dx : (cy - oy) * dy; if (along <= 4) continue;
      const gap = dx ? Math.max(0, dx > 0 ? r.left - o.right : o.left - r.right) : Math.max(0, dy > 0 ? r.top - o.bottom : o.top - r.bottom);
      const ortho = dx ? Math.max(0, r.top - o.bottom, o.top - r.bottom) : Math.max(0, r.left - o.right, o.left - r.right);
      const off = dx ? Math.abs(cy - oy) : Math.abs(cx - ox);
      const s = gap + ortho * 3 + off * 0.15 + along * 0.05;
      if (s < bs) { bs = s; best = t; }
    }
    if (!best) { const sc = scroller(hit); if (sc) { sc.scrollBy({ top: dy * sc.clientHeight * 0.6, left: dx * sc.clientWidth * 0.6, behavior: "smooth" }); setTimeout(() => step(dx, dy), 260); } else bump(dx, dy); return; }
    if (!best.el.isConnected) { cache = null; return step(dx, dy); }
    goTo(best.el);
  }
  function goTo(el, r) {
    r = r || el.getBoundingClientRect();
    snap = { x0: M.x, y0: M.y, x1: r.left + r.width / 2, y1: r.top + r.height / 2, t0: performance.now(), ms: 90 };
  }
  function bump(dx, dy) { snap = { x0: M.x, y0: M.y, x1: M.x + dx * 6, y1: M.y + dy * 6, t0: performance.now(), ms: 70, back: true }; }
  /* contenedor con scroll mas cercano (Logros, notas del parche, listas) */
  function scroller(el) { for (let e = el; e && e !== document.body; e = e.parentElement) { if (e.scrollHeight > e.clientHeight + 4) { const o = getComputedStyle(e).overflowY; if (o === "auto" || o === "scroll") return e; } } return null; }

  /* ---------- A, B y compania ---------- */
  function press() {
    const map = A.core && A.core.map; track();
    const el = hit; if (!el) return;
    if (map && el === map.cv) {                                         // mapa: clavar la chincheta donde esta la mira (la mira ya lleva los retos)
      if (!map.pickEnabled) return; const r = map.cv.getBoundingClientRect();
      if (A.pointer) A.pointer.press = 100; map.tapAt(M.x - r.left, M.y - r.top); return;
    }
    if (el.matches("input[type=range]")) return;
    if (!clickable(el)) { key("Enter"); return; }                      // nada pulsable debajo: A hace lo de Intro (entrar, boton principal del dialogo)
    ev("pointerdown", el, { buttons: 1 }); ev("mousedown", el, { buttons: 1 });
    const f = el.closest("input, textarea, select, button, a[href], [tabindex]"); if (f && f.focus) f.focus({ preventScroll: true });
    ev("pointerup", el); ev("mouseup", el);
    const c = el.closest("button, a, input, label, select, summary, [role]") || el; c.click();
  }
  const key = (k, code) => { const t = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body; t.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: code || k, bubbles: true, cancelable: true })); t.dispatchEvent(new KeyboardEvent("keyup", { key: k, code: code || k, bubbles: true })); };
  function menuBtn() {
    const C = A.core; if (!C) return; const S = C.S;
    if (S.settingsOpen) return C.openSettings(false);
    if (S.phase === "title" || S.phase === "intro" || !(S.run || S.camp)) return C.openSettings(true);
    C.runMenu();
  }
  function range(el, d) { const i = el.closest("input[type=range]"); if (!i) return false; const st = +i.step || 1; i.value = Math.min(+i.max, Math.max(+i.min, +i.value + d * st * (st < 5 ? 5 : 1))); i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); return true; }

  /* ---------- vibracion: la escalera de premios de A.haptic tambien en el mando (mismo ajuste Vibracion) ---------- */
  const haptic0 = A.haptic;
  A.haptic = p => {
    if (haptic0) haptic0(p);
    if (!M.on || A.haptic.on === false) return;
    try { const gp = pad(), va = gp && gp.vibrationActuator; if (!va) return;
      const arr = Array.isArray(p) ? p : [p], on = arr.filter((v, i) => i % 2 === 0).reduce((a, b) => a + b, 0), big = Math.max(...arr);
      const k = big <= 15 ? [0.12, 0.3] : big <= 40 ? [0.4, 0.55] : [0.75, 0.9], j = 0.9 + Math.random() * 0.2;   // nunca exactamente igual
      va.playEffect("dual-rumble", { duration: Math.min(600, on * 1.6), strongMagnitude: Math.min(1, k[0] * j), weakMagnitude: Math.min(1, k[1] * j) }).catch(() => {});
    } catch (e) { /* mando sin vibracion */ }
  };
  if (haptic0) A.haptic.on = haptic0.on;
  Object.defineProperty(A.haptic, "on", { get: () => haptic0 ? haptic0.on : true, set: v => { if (haptic0) haptic0.on = v; } });

  /* ---------- lectura del mando ---------- */
  function pad() {
    const list = navigator.getGamepads ? navigator.getGamepads() : []; let best = null;
    for (const g of list) { if (!g || !g.connected) continue; if (!best || (padAt[g.index] || 0) > (padAt[best.index] || 0)) best = g; }   // el ultimo que se toco (Steam Input puede dar dos)
    return best;
  }
  const stick = (x, y) => { const m = Math.hypot(x, y); if (m < DZ) return [0, 0, 0]; const k = Math.pow(Math.min(1, (m - DZ) / (1 - DZ)), CURVE); return [x / m * k, y / m * k, k]; };
  const trig = b => { const v = b ? (typeof b === "object" ? b.value : b) : 0; return v < TDZ ? 0 : (v - TDZ) / (1 - TDZ); };
  const down = (gp, i) => { const b = gp.buttons[i]; return !!b && (b.pressed || b.value > 0.5); };

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016; lastT = t;
    if (!document.hasFocus() || document.hidden) { prevB = []; return; }
    const all = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of all) if (g && g.connected && (g.buttons.some(b => b.pressed) || g.axes.some(a => Math.abs(a) > DZ + 0.1))) padAt[g.index] = t;
    const gp = pad(); if (!gp) return;
    const [lx, ly, lm] = stick(gp.axes[0] || 0, gp.axes[1] || 0), [rx, ry, rm] = stick(gp.axes[2] || 0, gp.axes[3] || 0), lt = trig(gp.buttons[6]), rt = trig(gp.buttons[7]);
    const btn = gp.buttons.map((b, i) => down(gp, i)), active = lm || rm || lt || rt || btn.some(Boolean);
    if (active && !M.on) { setMode("pad"); if (A.audio && A.audio.unlock) A.audio.unlock(); }
    if (!M.on) { prevB = btn; return; }
    const map = A.core && A.core.map, S = A.core && A.core.S, W = innerWidth, H = innerHeight;
    const onMap = !!(map && hit === map.cv && (map.pickEnabled || (S && S.phase !== "title")));

    /* stick izquierdo: cursor libre */
    if (lm) {
      snap = null; fastT = lm > 0.9 ? fastT + dt : 0;
      const sp = H * 0.95 * (1 + Math.min(0.6, Math.max(0, fastT - 0.35) * 1.5)) * (btn[4] ? 0.35 : 1);
      let nx = M.x + lx * sp * dt, ny = M.y + ly * sp * dt;
      if (onMap) { const ex = nx < 0 ? nx : nx > W - 1 ? nx - (W - 1) : 0, ey = ny < 0 ? ny : ny > H - 1 ? ny - (H - 1) : 0; if (ex || ey) map.nudge(ex, ey); }   // en el borde, el puntero empuja el mapa
      M.x = Math.max(0, Math.min(W - 1, nx)); M.y = Math.max(0, Math.min(H - 1, ny)); moved = true;
    } else fastT = 0;
    /* salto de la cruceta, animado */
    if (snap) {
      const k = Math.min(1, (t - snap.t0) / snap.ms), e = snap.back ? Math.sin(Math.PI * k) : 1 - Math.pow(1 - k, 3);
      M.x = snap.back ? snap.x0 + (snap.x1 - snap.x0) * e : snap.x0 + (snap.x1 - snap.x0) * e; M.y = snap.back ? snap.y0 + (snap.y1 - snap.y0) * e : snap.y0 + (snap.y1 - snap.y0) * e;
      moved = true; if (k >= 1) snap = null;
    }
    /* stick derecho y gatillos: el mapa bajo el cursor, o el contenido con scroll */
    if (rm) {
      if (onMap) map.nudge(rx * W * 1.15 * dt, ry * W * 1.15 * dt);
      else { const sc = scroller(hit); if (sc) sc.scrollBy(rx * H * 1.4 * dt, ry * H * 1.4 * dt); }
    }
    if ((lt || rt) && onMap) {
      const z = Math.pow(rt, 1.5) - Math.pow(lt, 1.5);
      if (z) { const r = map.cv.getBoundingClientRect(), span = Math.log(map.maxS / map.minS) || 6; map.zoomBy(Math.exp(z * span / 1.6 * dt), M.x - r.left, M.y - r.top, false); }
    }
    if (moved) { moved = false; place(); track(); }
    else if (hit && !hit.isConnected) track(true);

    /* botones: flanco de bajada; la cruceta repite al mantener */
    const pr = i => btn[i] && !prevB[i];
    if (pr(0)) press();
    if (pr(1)) key("Escape");
    if (pr(9)) menuBtn();
    if (pr(3)) key("Tab");
    if (pr(5)) { const h = $("zoomHome"); if (h && h.offsetParent) h.click(); }
    for (const [i, dx, dy] of [[12, 0, -1], [13, 0, 1], [14, -1, 0], [15, 1, 0]]) {
      if (!btn[i]) { repAt[i] = 0; continue; }
      if (!prevB[i]) repAt[i] = t + REP0; else if (t < repAt[i]) continue; else repAt[i] = t + REP;
      if (dx && hit && range(hit, dx)) continue;                     // deslizadores de Ajustes: izquierda y derecha cambian el valor
      step(dx, dy);
    }
    prevB = btn;

    /* cada 1/4 s con el cursor quieto: lo que tiene debajo puede haber cambiado (un panel que entra deslizandose); y un dialogo nuevo con boton
       principal (veredicto, ticket, pausa) se lleva el cursor, cuando el boton ya ha llegado a su sitio (dos lecturas iguales) */
    if (t - primT > 250) {
      primT = t; if (!snap) track(true);
      const p = document.querySelector("#veil:not(.hidden) [data-primary]") || document.querySelector("#layer:not(.hidden) [data-primary]") || (A.marcador && A.marcador.primary && A.marcador.primary());
      if (p !== primSeen) {
        const r = p && p.isConnected && p.offsetParent ? p.getBoundingClientRect() : null, k = r && [Math.round(r.left), Math.round(r.top), Math.round(r.width)].join();
        if (!p) primSeen = null; else if (r && primPend && primPend.p === p && primPend.k === k) { primSeen = p; primPend = null; goTo(p, r); } else primPend = r ? { p, k } : null;
      }
    }
  }
  M.step = step; M.targets = targets;                                   // para las pruebas (dev/)
  const start = () => { if (!raf) { lastT = 0; raf = requestAnimationFrame(loop); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  addEventListener("gamepadconnected", e => { padAt[e.gamepad.index] = performance.now(); start(); });
  addEventListener("gamepaddisconnected", () => {
    const left = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(g => g && g.connected);
    if (M.on) { const S = A.core && A.core.S; if (S && S.phase === "asking" && !S.paused && A.core.runMenu) A.core.runMenu(); setMode("mouse"); }   // se va el mando a mitad de pregunta: pausa
    if (!left) stop();
  });
  /* el menu de Steam u otra ventana encima: los sticks se sueltan y, si estabas respondiendo con el mando, la pregunta se pausa */
  addEventListener("blur", () => { prevB = []; snap = null; const S = A.core && A.core.S; if (M.on && S && S.phase === "asking" && !S.paused && A.core.runMenu) A.core.runMenu(); });
  addEventListener("resize", () => { cache = null; M.x = Math.min(M.x, innerWidth - 1); M.y = Math.min(M.y, innerHeight - 1); moved = true; });
  if (navigator.getGamepads && [...navigator.getGamepads()].some(g => g && g.connected)) start();
})(window.AIQ);
