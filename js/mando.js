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
 * Iconos de los botones (v0.2.29): html[data-glyph] = kb | xbox | ps | deck; el dibujo sale de js/glifos-data.js (tools/glifos.py). En la Steam Deck
 * siempre iconos de Deck y modo mando desde el primer fotograma (tocar la pantalla o el trackpad no cambia los iconos: requisito de Verified).
 * Varios mandos y vuelta desde el raton (revision del 2026-10-04): manda el ULTIMO que se movio o pulso (un cambio, no una posicion: un mando con un eje
 * estropeado, un boton atascado o el mando duplicado/congelado de Steam Input no se queda con el control) y cualquier gesto del mando recupera el control
 * al raton, siempre; el cursor sale de donde estaba el raton. No depende de los avisos del navegador: un vigilante mira si hay un mando a la vista.
 * Coste: sin mando conectado solo el vigilante (cada 0,5 s); con mando, una lectura por fotograma y solo se toca el DOM cuando el cursor se mueve.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const root = document.documentElement, $ = id => document.getElementById(id);
  const DZ = 0.15, TDZ = 0.08, CURVE = 2.2, REP0 = 380, REP = 90;
  const M = A.mando = { on: false, x: innerWidth / 2, y: innerHeight / 2 };
  let raf = 0, lastT = 0, padIdx = -1, padAt = {}, seen = {}, prevB = [], repAt = {}, fastT = 0, hit = null, hovChain = [], cur = null, moved = true, snap = null, primSeen = null, primPend = null, primT = 0, precOn = false, lastMouse = null, noPad = 0, bad = 0;

  /* ---------- Ajustes > Mando (v0.2.35): se guardan aparte, en atlasiq.pad ---------- */
  const DEF = { ptr: 100, map: 100, zoom: 100, swapAB: false, swapSticks: false, prec: "hold", invLX: false, invLY: false, invRX: false, invRY: false, rumble: true, glyphs: "auto" };
  const PS = Object.assign({}, DEF); try { Object.assign(PS, JSON.parse(localStorage.getItem("atlasiq.pad") || "{}")); } catch (e) { /* sin almacenamiento */ }
  const savePS = () => { try { localStorage.setItem("atlasiq.pad", JSON.stringify(PS)); } catch (e) { /* sin almacenamiento */ } };
  M.settings = PS;

  /* ---------- iconos de los botones: familia segun el mando (o la Deck, o lo elegido en Ajustes) y una hoja con el dibujo de cada uno ---------- */
  const host = window.geoliteHost, DECK = !!(host && host.device === "deck");
  let fam = DECK ? "deck" : "xbox";
  /* la familia por el fabricante que da el navegador ("... Vendor: 045e Product: 0b12", o "045e-0b12-..." en otros) y, si no, por el nombre. El Xbox One/Series se
     llama "Xbox Wireless Controller" y el DualShock/DualSense "Wireless Controller": el Xbox se mira primero (antes tambien se llevaba los iconos de PlayStation) */
  const famOf = gp => {
    const id = (gp && gp.id) || ""; if (DECK) return "deck";
    const vid = ((id.match(/vendor:\s*([0-9a-f]{4})/i) || id.match(/^([0-9a-f]{4})-[0-9a-f]{4}-/i) || [])[1] || "").toLowerCase();
    if (vid === "045e" || /xbox|xinput|microsoft/i.test(id)) return "xbox";
    if (vid === "054c" || /dualsense|dualshock|playstation|sony|ps[345]\b|wireless controller/i.test(id)) return "ps";
    if (vid === "057e" || /nintendo|pro controller|joy-con/i.test(id)) return "nin";
    return "xbox";
  };
  const famNow = () => (PS.glyphs !== "auto" ? PS.glyphs : fam);
  const setGlyph = () => { const g = M.on || DECK ? famNow() : "kb"; if (root.dataset.glyph !== g) { root.dataset.glyph = g; if (A.tt && A.tt.refresh) A.tt.refresh(); } if (PS.swapAB) root.dataset.swapab = "1"; else delete root.dataset.swapab; };
  { const G = A.GLIFOS || {}; let css = ""; for (const f in G) for (const b in G[f]) { const [u, w, h] = G[f][b]; css += `html[data-glyph="${f}"] .gl[data-gl="${b}"]{background-image:url("${u}");width:${w}px;height:${h}px}\n`; }
    /* confirmar y atras intercambiados: el icono de "confirmar" (data-gl="a") es el boton de la derecha y el de "atras", el de abajo */
    for (const f in G) { const [ua, wa, ha] = G[f].a, [ub, wb, hb] = G[f].b; css += `html[data-glyph="${f}"][data-swapab] .gl[data-gl="a"]{background-image:url("${ub}");width:${wb}px;height:${hb}px}\nhtml[data-glyph="${f}"][data-swapab] .gl[data-gl="b"]{background-image:url("${ua}");width:${wa}px;height:${ha}px}\n`; }
    const st = document.createElement("style"); st.id = "glCss"; st.textContent = css; document.head.appendChild(st); }

  /* ---------- modo de entrada ---------- */
  const setMode = m => {
    if (root.dataset.input === m) return; root.dataset.input = m; M.on = m === "pad";
    console.log("[mando] entrada:", m);
    try { setGlyph(); } catch (e) { /* un icono que falla no puede dejar al mando sin cursor */ }
    watchDom(M.on);
    if (!M.on && leg) { legOn = false; leg.classList.remove("on"); }
    if (!M.on) { setHover(null); if (cur) cur.hidden = true; }
    else {                                                              // el cursor sale de donde estaba el raton; si no lo habias usado, del centro (o de donde lo dejo el mando)
      if (lastMouse) { M.x = Math.max(0, Math.min(innerWidth - 1, lastMouse[0])); M.y = Math.max(0, Math.min(innerHeight - 1, lastMouse[1])); lastMouse = null; M.used = true; }
      else if (!M.used) { M.used = true; M.x = innerWidth / 2; M.y = innerHeight / 2; }
      sweepHover(); ensureCur(); moved = true;
      try { if (A.dealer && A.dealer.noteDevice) A.dealer.noteDevice(DECK ? "deck" : "pad"); } catch (e) { /* el crupier lo comenta (una vez por sesion); si falla, el mando sigue */ }
    }
  };
  root.dataset.input = "mouse"; root.dataset.glyph = DECK ? "deck" : "kb";
  const mouseMode = e => setMode(e.pointerType === "touch" ? "touch" : "mouse");
  addEventListener("pointermove", e => { if (!e.isTrusted) return; lastMouse = [e.clientX, e.clientY]; if (M.on && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) mouseMode(e); }, { capture: true, passive: true });
  addEventListener("pointerdown", e => { if (!e.isTrusted) return; lastMouse = [e.clientX, e.clientY]; if (M.on) mouseMode(e); }, { capture: true, passive: true });

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
    if (!cur) { cur = document.createElement("div"); cur.id = "padCur"; cur.setAttribute("aria-hidden", "true"); }
    if (!cur.isConnected) document.body.appendChild(cur);               // con el mando el cursor del sistema va oculto: si el dibujado desaparece del documento no se veria ninguno
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
    for (const el of document.body.querySelectorAll(":not([data-pad-skip] *)")) {   // data-pad-skip: tablas enormes (creditos) que la cruceta no recorre
      if (el.parentElement && inside.has(el.parentElement) && !el.matches(INTER)) { inside.add(el); continue; }   // lo de dentro de un boton cuenta como el boton (salvo otro control: el interruptor dentro del aviso)
      if (el.id === "padCur" || el.disabled) continue;
      const cs = getComputedStyle(el); if (!(ptrCur(cs) || (A.teclado && A.teclado.textual(el))) || cs.visibility === "hidden" || cs.pointerEvents === "none") continue;   // y las casillas de texto (A abre el teclado)
      inside.add(el); clk.add(el);
      const r = el.getBoundingClientRect(); if (r.width < 6 || r.height < 6 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
      if (r.width * r.height > innerWidth * innerHeight * 0.45) continue;   // fondos pulsables (cerrar al pulsar fuera, "pulsa para entrar"): A ya los pulsa, la cruceta no se para en ellos
      /* que se vea de verdad: el centro (o alguna esquina) responde a este elemento y no a otra capa encima */
      const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 4, r.top + 4], [r.right - 4, r.bottom - 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.top + 4]];
      if (!pts.some(([x, y]) => { if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false; const h = document.elementFromPoint(x, y); return h && (h === el || el.contains(h)); })) continue;
      out.push({ el, r });
    }
    /* la cruceta solo para en lo ACCIONABLE: una tarjeta (o caja) que lleva dentro sus propios botones (Rojo / Negro / Verde, Cara / Cruz) no es un
       destino, lo son los botones; si no, el cursor aterrizaba en el texto de la tarjeta. Los controles de verdad (boton, enlace, casilla...) siempre se quedan */
    return out.filter(t => t.el.matches(INTER) || !out.some(o => o !== t && t.el.contains(o.el)));
  }
  /* cruceta: el destino mas cercano en esa direccion (huecos y desvio lateral pesan; lo alineado gana) */
  function step(dx, dy) {
    const list = targets();
    let base = null;                                                    // el destino mas interior bajo el cursor (el boton, no la tarjeta que lo contiene)
    if (hit) for (const t of list) if ((t.el === hit || t.el.contains(hit)) && (!base || t.r.width * t.r.height < base.r.width * base.r.height)) base = t;
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
      if (A.codex && A.codex.isOpen && A.codex.isOpen()) { ev("pointerdown", el, { buttons: 1 }); ev("pointerup", el); return; }   // atlas: abre el pais bajo el cursor
      if (!map.pickEnabled) return; const r = map.cv.getBoundingClientRect();
      if (A.pointer) A.pointer.press = 100; map.tapAt(M.x - r.left, M.y - r.top); return;
    }
    if (el.matches("input[type=range]")) return;
    { const ti = el.closest("input, label"), inp = ti && (ti.tagName === "INPUT" ? ti : ti.querySelector("input")); if (A.teclado && A.teclado.textual(inp)) { A.teclado.open(inp); return; } }   // casilla de texto: el teclado
    if (!clickable(el)) { key("Enter"); return; }                      // nada pulsable debajo: A hace lo de Intro (entrar, boton principal del dialogo)
    ev("pointerdown", el, { buttons: 1 }); ev("mousedown", el, { buttons: 1 });
    const f = el.closest("input, textarea, select, button, a[href], [tabindex]"); if (f && f.focus && !f.closest("#osk")) f.focus({ preventScroll: true });   // las teclas del teclado no quitan el foco a la casilla
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
    if (!M.on || A.haptic.on === false || !PS.rumble) return;
    try { const gp = pad(), va = gp && gp.vibrationActuator; if (!va) return;
      const arr = Array.isArray(p) ? p : [p], on = arr.filter((v, i) => i % 2 === 0).reduce((a, b) => a + b, 0), big = Math.max(...arr);
      const k = big <= 15 ? [0.12, 0.3] : big <= 40 ? [0.4, 0.55] : [0.75, 0.9], j = 0.9 + Math.random() * 0.2;   // nunca exactamente igual
      va.playEffect("dual-rumble", { duration: Math.min(600, on * 1.6), strongMagnitude: Math.min(1, k[0] * j), weakMagnitude: Math.min(1, k[1] * j) }).catch(() => {});
    } catch (e) { /* mando sin vibracion */ }
  };
  if (haptic0) A.haptic.on = haptic0.on;
  if (haptic0 && haptic0.jackpot) A.haptic.jackpot = haptic0.jackpot;   // la escalera de jackpots (js/audio.js) sigue existiendo: sin ella, cada jackpot (legendaria, medalla) lanzaba un error y cortaba lo de detras
  Object.defineProperty(A.haptic, "on", { get: () => haptic0 ? haptic0.on : true, set: v => { if (haptic0) haptic0.on = v; } });

  /* ---------- lectura del mando ---------- */
  const ACT = 0.05;                                                      // lo que debe cambiar un eje o un gatillo en unos 80 ms para contar como "lo han tocado"
  const anyPad = except => { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g && g.connected && g.index !== except) return true; return false; };
  function pad() {
    const list = navigator.getGamepads ? navigator.getGamepads() : []; let best = null, ba = -1;
    for (const g of list) { if (!g || !g.connected) continue; const a = padAt[g.index] || 0; if (!best || a > ba || (a === ba && g.mapping === "standard" && best.mapping !== "standard")) { best = g; ba = a; } }   // el ultimo que se toco (Steam Input puede dar dos); a igualdad, el de mapa estandar
    return best;
  }
  const stick = (x, y) => { const m = Math.hypot(x, y); if (m < DZ) return [0, 0, 0]; const k = Math.pow(Math.min(1, (m - DZ) / (1 - DZ)), CURVE); return [x / m * k, y / m * k, k]; };
  const trig = b => { const v = b ? (typeof b === "object" ? b.value : b) : 0; return v < TDZ ? 0 : (v - TDZ) / (1 - TDZ); };
  const down = (gp, i) => { const b = gp.buttons[i]; return !!b && (b.pressed || b.value > 0.5); };
  /* "Tocar" un mando es CAMBIAR algo a proposito (pulsar un boton, empujar un eje o un gatillo), no estar en una posicion: un mando con un eje
     estropeado, un boton atascado o un estado congelado (el mando virtual de Steam Input, un controlador a medias) ya no puede quedarse con el
     control ni impedir que el raton lo recupere. La primera vez que se ve un mando cuenta lo que ya tenga pulsado o empujado (el navegador no lo
     ensena hasta el primer gesto y ese gesto ya paso). De CADA mando se guardan los botones del fotograma anterior (flancos). */
  function touched(g, t) {
    let s = seen[g.index]; const first = !s || s.id !== g.id;
    if (first) s = seen[g.index] = { id: g.id, t, b: [], pb: [], a: [], v: [] };
    const old = s.pb; s.pb = s.b; s.b = old;                            // el actual pasa a anterior (se reutilizan los dos arrays)
    let hitIt = false, held = false;
    for (let i = 0; i < g.buttons.length; i++) { const d = down(g, i); s.b[i] = d; if (d) { held = true; if (!s.pb[i]) hitIt = true; } }
    if (first) { if (held || g.axes.some(a => Math.abs(a) > DZ + 0.1)) hitIt = true; }
    else {
      for (let i = 0; i < g.axes.length; i++) { const a = g.axes[i] || 0; if (Math.abs(a) > DZ && Math.abs(a - (s.a[i] || 0)) > ACT) hitIt = true; }
      for (let i = 6; i < 8; i++) { const v = (g.buttons[i] && g.buttons[i].value) || 0; if (v > 0.2 && Math.abs(v - (s.v[i] || 0)) > ACT) hitIt = true; }
    }
    if (first || t - s.t > 80) { s.t = t; for (let i = 0; i < g.axes.length; i++) s.a[i] = g.axes[i] || 0; for (let i = 6; i < 8; i++) s.v[i] = (g.buttons[i] && g.buttons[i].value) || 0; }
    return hitIt;
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    try { frame(t); } catch (e) { if (!(bad++ % 300)) console.warn("[mando] error en el bucle:", e); }   // un fallo en un fotograma no deja al mando sin bucle
  }
  function frame(t) {
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016; lastT = t;
    const all = navigator.getGamepads ? navigator.getGamepads() : []; let woke = false, n = 0;
    for (const g of all) if (g && g.connected) { n++; if (touched(g, t)) { padAt[g.index] = t; woke = true; } }
    if (!n) { if (++noPad > 120) stop(); return; }                      // sin mando: a los 2 s el bucle se para y el vigilante (cada 0,5 s) lo reactiva en cuanto el navegador vuelva a ensenar uno
    noPad = 0;
    if (!document.hasFocus() || document.hidden) return;                // otra ventana encima: los botones se siguen leyendo (lo que ya estaba pulsado al volver no cuenta como nuevo) pero no se hace nada
    const gp = pad(); if (!gp) return;
    /* Ajustes > Mando: sticks intercambiados y ejes invertidos */
    let a0 = gp.axes[0] || 0, a1 = gp.axes[1] || 0, a2 = gp.axes[2] || 0, a3 = gp.axes[3] || 0;
    if (PS.swapSticks) [a0, a1, a2, a3] = [a2, a3, a0, a1];
    if (PS.invLX) a0 = -a0; if (PS.invLY) a1 = -a1; if (PS.invRX) a2 = -a2; if (PS.invRY) a3 = -a3;
    const [lx, ly, lm] = stick(a0, a1), [rx, ry, rm] = stick(a2, a3), lt = trig(gp.buttons[6]), rt = trig(gp.buttons[7]);
    const btn = gp.buttons.map((b, i) => down(gp, i)), sn = seen[gp.index]; prevB = sn ? sn.pb.slice() : [];
    if (PS.swapAB) { [btn[0], btn[1]] = [btn[1], btn[0]]; [prevB[0], prevB[1]] = [prevB[1], prevB[0]]; }   // confirmar con el boton de la derecha (mandos de Nintendo)
    if (PS.prec === "toggle") { if (btn[4] && !prevB[4]) precOn = !precOn; } else precOn = !!btn[4];
    if (woke) { const f = famOf(gp); if (f !== fam) { fam = f; setGlyph(); syncUI(); } }       // otro mando (DualSense despues de un Xbox): sus iconos
    if (woke && !M.on) { setMode("pad"); if (A.audio && A.audio.unlock) A.audio.unlock(); }
    if (!M.on) return;
    const map = A.core && A.core.map, S = A.core && A.core.S, W = innerWidth, H = innerHeight;
    const atlas = !!(A.codex && A.codex.isOpen && A.codex.isOpen());     // el atlas de la Enciclopedia es el mismo mapa (v0.2.36)
    const onMap = !!(map && hit === map.cv && (map.pickEnabled || atlas || (S && S.phase !== "title")));

    /* stick izquierdo: cursor libre */
    if (lm) {
      snap = null; fastT = lm > 0.9 ? fastT + dt : 0;
      const sp = H * 0.95 * (1 + Math.min(0.6, Math.max(0, fastT - 0.35) * 1.5)) * (precOn ? 0.35 : 1) * PS.ptr / 100;
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
      if (onMap) { const k = W * 1.15 * dt * PS.map / 100; map.nudge(rx * k, ry * k); }
      else { const sc = scroller(hit); if (sc) sc.scrollBy(rx * H * 1.4 * dt, ry * H * 1.4 * dt); }
    }
    if ((lt || rt) && onMap) {
      const z = (Math.pow(rt, 1.5) - Math.pow(lt, 1.5)) * ((A.mapSens && A.mapSens.zoom) || 1) * PS.zoom / 100;   // la sensibilidad de zoom de Ajustes, como la rueda
      if (z) { const r = map.cv.getBoundingClientRect(), span = Math.log(map.maxS / map.minS) || 6; map.zoomBy(Math.exp(z * span / 1.6 * dt), M.x - r.left, M.y - r.top, false); }
    }
    if (moved) { moved = false; place(); track(); }
    else if (hit && !hit.isConnected) track(true);

    /* botones: flanco de bajada; la cruceta repite al mantener */
    const pr = i => btn[i] && !prevB[i];
    const osk = A.teclado && A.teclado.on;
    if (pr(0)) press();
    if (pr(1)) osk ? A.teclado.close() : key("Escape");
    if (pr(9)) osk ? A.teclado.ok() : menuBtn();
    if (pr(3)) osk ? A.teclado.type(" ") : key("Tab");
    if (pr(2) && osk) A.teclado.back();
    if (pr(5)) { const h = $("zoomHome"); if (h && h.offsetParent) h.click(); }
    for (const [i, dx, dy] of [[12, 0, -1], [13, 0, 1], [14, -1, 0], [15, 1, 0]]) {
      if (!btn[i]) { repAt[i] = 0; continue; }
      if (!prevB[i]) repAt[i] = t + REP0; else if (t < repAt[i]) continue; else repAt[i] = t + REP;
      if (dx && hit && range(hit, dx)) continue;                     // deslizadores de Ajustes: izquierda y derecha cambian el valor
      step(dx, dy);
    }

    /* cada 1/4 s con el cursor quieto: lo que tiene debajo puede haber cambiado (un panel que entra deslizandose); y un dialogo nuevo con boton
       principal (veredicto, ticket, pausa) se lleva el cursor, cuando el boton ya ha llegado a su sitio (dos lecturas iguales) */
    if (t - primT > 250) {
      primT = t; if (!cur || !cur.isConnected) { curKind = ""; ensureCur(); } if (!snap) track(true); legSync();
      const p = document.querySelector("#veil:not(.hidden) [data-primary]") || document.querySelector("#layer:not(.hidden) [data-primary]") || (A.marcador && A.marcador.primary && A.marcador.primary());
      if (p !== primSeen) {
        const r = p && p.isConnected && p.offsetParent ? p.getBoundingClientRect() : null, k = r && [Math.round(r.left), Math.round(r.top), Math.round(r.width)].join();
        if (!p) primSeen = null; else if (r && primPend && primPend.p === p && primPend.k === k) { primSeen = p; primPend = null; goTo(p, r); } else primPend = r ? { p, k } : null;
      }
    }
  }
  M.step = step; M.targets = targets; M.goTo = el => goTo(el);                                   // para las pruebas (dev/)
  /* ---------- leyenda de botones en partida (v0.2.36): abajo a la derecha, solo con mando y mientras respondes ---------- */
  let leg = null, legOn = false;
  function legend() {
    if (!leg) {
      leg = document.createElement("div"); leg.id = "padLeg"; leg.className = "k-pad"; leg.setAttribute("aria-hidden", "true");
      const row = (gls, k) => `<span><b>${gls.map(g => `<i class="gl" data-gl="${g}"></i>`).join("")}</b><em data-i="${k}"></em></span>`;
      leg.innerHTML = row(["ls"], "leg.aim") + row(["a"], "leg.pin") + row(["lt", "rt"], "pad.sens.zoom") + row(["rs"], "leg.move") + row(["lb"], "leg.prec");
      document.body.appendChild(leg);
    }
    leg.querySelectorAll("[data-i]").forEach(e => { e.textContent = A.t(e.dataset.i); });
  }
  function legSync() {
    const S = A.core && A.core.S, want = !!(M.on && S && S.phase === "asking" && !S.paused && !S.settingsOpen);
    if (want === legOn) return; legOn = want; if (want) legend(); if (leg) leg.classList.toggle("on", want);
  }
  addEventListener("aiq:lang", () => { if (leg) legend(); });

  /* ---------- la pestana Mando de Ajustes ---------- */
  const NAMES = { auto: null, xbox: "Xbox", ps: "PlayStation", nin: "Nintendo", deck: "Steam Deck" }, ORDER = ["auto", "xbox", "ps", "nin", "deck"];
  function syncUI() {
    const pane = document.querySelector('[data-pane="pad"]'); if (!pane) return;
    pane.querySelectorAll("[data-prange]").forEach(f => { const k = f.dataset.prange, v = PS[k], i = f.querySelector("input"); i.value = v; i.style.setProperty("--p", ((v - 50) / 100) * 100 + "%"); f.querySelector("output").textContent = v + "%"; });
    pane.querySelectorAll("[data-psw]").forEach(s => s.setAttribute("aria-checked", !!PS[s.dataset.psw]));
    pane.querySelectorAll("[data-pseg]").forEach(sg => { const bs = [...sg.querySelectorAll("button")], ix = Math.max(0, bs.findIndex(b => b.dataset.v === PS[sg.dataset.pseg])); bs.forEach((b, i) => b.classList.toggle("on", i === ix)); sg.style.setProperty("--idx", ix); });
    const st = $("padIcons"); if (st) { const i = ORDER.indexOf(PS.glyphs), auto = PS.glyphs === "auto"; st.querySelector(".stp-v").textContent = auto ? NAMES[DECK ? "deck" : fam] : NAMES[PS.glyphs]; st.querySelector(".stp-tag").textContent = auto ? A.t("scr.auto") : ""; const [lo, hi] = st.querySelectorAll(".stp-b"); lo.disabled = i <= 0; hi.disabled = i >= ORDER.length - 1; }
  }
  function wireUI() {
    const pane = document.querySelector('[data-pane="pad"]'); if (!pane) return;
    pane.querySelectorAll("[data-prange]").forEach(f => { const i = f.querySelector("input"); i.addEventListener("input", () => { PS[f.dataset.prange] = +i.value; savePS(); syncUI(); }); i.addEventListener("change", () => { if (A.sfx && A.sfx.ui) A.sfx.ui(); }); });
    pane.querySelectorAll("[data-psw]").forEach(s => s.addEventListener("click", () => { const k = s.dataset.psw; PS[k] = !PS[k]; savePS(); setGlyph(); syncUI(); if (A.sfx && A.sfx.ui) A.sfx.ui(); if (k === "rumble" && PS.rumble) A.haptic([24]); }));
    pane.querySelectorAll("[data-pseg]").forEach(sg => sg.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; PS[sg.dataset.pseg] = b.dataset.v; precOn = false; savePS(); syncUI(); if (A.sfx && A.sfx.ui) A.sfx.ui(); }));
    const st = $("padIcons"); if (st) st.addEventListener("click", e => { const b = e.target.closest(".stp-b"); if (!b || b.disabled) return; const i = Math.max(0, Math.min(ORDER.length - 1, ORDER.indexOf(PS.glyphs) + +b.dataset.d)); PS.glyphs = ORDER[i]; savePS(); setGlyph(); syncUI(); if (A.sfx && A.sfx.ui) A.sfx.ui(); });
    syncUI();
  }
  M.resetSettings = () => { Object.assign(PS, DEF); precOn = false; savePS(); setGlyph(); syncUI(); };
  wireUI(); setGlyph();

  const start = () => { if (!raf) { lastT = 0; noPad = 0; raf = requestAnimationFrame(loop); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  /* El mando no depende de los avisos del navegador: Steam Input lo quita y lo pone al cambiar de ventana, un USB se suelta y se vuelve a enchufar,
     el navegador deja ver un mando sin avisar... Si hay un mando a la vista el bucle corre (el aviso solo lo adelanta) y SOLO se vuelve al raton
     cuando no queda ninguno. Antes un aviso de desconexion paraba el bucle y, sin el aviso de conexion, no volvia a arrancar. */
  addEventListener("gamepadconnected", e => { const g = e.gamepad; padAt[g.index] = performance.now(); delete seen[g.index]; console.log("[mando] conectado:", g.index, g.id, g.mapping || "(sin mapa estandar)"); start(); });
  addEventListener("gamepaddisconnected", e => {
    const g = e.gamepad; if (g) { delete seen[g.index]; delete padAt[g.index]; }
    console.log("[mando] desconectado:", g && g.index, g && g.id);
    if (M.on && !anyPad(g && g.index)) { lastMouse = null; const S = A.core && A.core.S; if (S && S.phase === "asking" && !S.paused && A.core.runMenu) A.core.runMenu(); setMode("mouse"); }   // se va el ultimo mando a mitad de pregunta: pausa
  });
  setInterval(() => { if (!raf && anyPad()) start(); }, 500);
  addEventListener("focus", () => { if (!raf && anyPad()) start(); });
  /* el menu de Steam u otra ventana encima: los sticks se sueltan y, si estabas respondiendo con el mando, la pregunta se pausa */
  addEventListener("blur", () => { snap = null; const S = A.core && A.core.S; if (M.on && S && S.phase === "asking" && !S.paused && A.core.runMenu) A.core.runMenu(); });
  addEventListener("resize", () => { cache = null; M.x = Math.min(M.x, innerWidth - 1); M.y = Math.min(M.y, innerHeight - 1); moved = true; });
  M.running = () => !!raf;                                               // para las pruebas (dev/)
  if (anyPad()) start();
  if (DECK) setMode("pad");                                              // Steam Deck: se juega con mando desde el primer fotograma
})(window.AIQ);
