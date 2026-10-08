/*
 * Geolite - TECLAS Y RATON (v0.3.2): Ajustes > Controles > Teclado y raton.
 * Cada accion tiene dos casillas (tecla y alternativa). Una casilla es "c:<code>" (tecla fisica: e.code, asi W A S D siguen en su sitio con AZERTY)
 * o "k:<key>" (un caracter: "+" esta en teclas distintas segun el teclado). Esc no se puede cambiar: siempre abre la pausa.
 * Raton: que boton marca en el mapa y cual lo arrastra (0 izquierdo, 1 rueda, 2 derecho, 3 y 4 laterales), rueda invertida y zoom hacia el puntero o el centro.
 * Se guarda en atlasiq.keys. Lo leen js/game.js (atajos y mover el mapa), js/map.js y js/map2d.js (botones y rueda), js/pointer.js, js/codex.js,
 * js/jukebox.js y js/adventure.js; la pantalla de Ajustes es js/controles.js.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const STORE = "atlasiq.keys";
  /* acciones en el orden de la tabla (dos columnas) */
  const DEF = {
    ok: ["c:Enter", "c:Space"], pause: ["c:KeyP", null], fs: ["c:KeyF", "c:F11"], sfx: ["c:KeyM", null], mus: ["c:KeyN", null], codex: ["c:KeyC", null],
    zin: ["k:+", "k:="], zout: ["k:-", null], home: ["k:0", null], alt: ["c:Tab", null], songPrev: ["c:ArrowLeft", null],
    up: ["c:KeyW", null], down: ["c:KeyS", null], left: ["c:KeyA", null], right: ["c:KeyD", null],
    t1: ["c:Digit1", "c:Numpad1"], t2: ["c:Digit2", "c:Numpad2"], t3: ["c:Digit3", "c:Numpad3"], t4: ["c:Digit4", "c:Numpad4"], songNext: ["c:ArrowRight", null],
  };
  const ORDER = Object.keys(DEF);
  const MDEF = { pick: 0, drag: 0, invWheel: false, zoomMid: false };
  const K = A.keys = { ORDER, map: {}, mouse: Object.assign({}, MDEF) };
  const clone = o => JSON.parse(JSON.stringify(o));
  function load() {
    K.map = clone(DEF); Object.assign(K.mouse, MDEF);
    try { const d = JSON.parse(localStorage.getItem(STORE) || "{}");
      if (d.map) for (const a of ORDER) if (Array.isArray(d.map[a])) K.map[a] = [0, 1].map(i => (typeof d.map[a][i] === "string" && /^[ck]:./.test(d.map[a][i]) ? d.map[a][i] : null));
      if (d.mouse) for (const k in MDEF) if (typeof d.mouse[k] === typeof MDEF[k]) K.mouse[k] = d.mouse[k];
      for (const k of ["pick", "drag"]) if (![0, 1, 2, 3, 4].includes(K.mouse[k])) K.mouse[k] = 0;
    } catch (e) { /* sin almacenamiento o JSON roto: los de fabrica */ }
  }
  K.save = () => { try { localStorage.setItem(STORE, JSON.stringify({ map: K.map, mouse: K.mouse })); } catch (e) { /* sin almacenamiento */ } };
  K.reset = () => { K.map = clone(DEF); Object.assign(K.mouse, MDEF); K.save(); fire(); };
  K.isDefault = () => JSON.stringify(K.map) === JSON.stringify(DEF) && JSON.stringify(K.mouse) === JSON.stringify(MDEF);
  const subs = []; K.onChange = f => subs.push(f); const fire = () => subs.forEach(f => { try { f(); } catch (e) { /* un oyente que falla no corta a los demas */ } });
  K.changed = () => { K.save(); fire(); };
  load();

  /* ---------- coincidencias ---------- */
  const hit = (b, e) => {
    if (!b) return false;
    if (b[0] === "k") return e.key === b.slice(2);
    const c = b.slice(2); return e.code === c || (c === "Enter" && e.code === "NumpadEnter");
  };
  K.match = (action, e) => { const m = K.map[action]; return !!m && (hit(m[0], e) || hit(m[1], e)); };
  /* la accion que hace esta tecla (o null) */
  K.which = e => { for (const a of ORDER) if (K.match(a, e)) return a; return null; };
  K.ok = e => K.match("ok", e);
  K.tool = e => { for (let i = 1; i <= 4; i++) if (K.match("t" + i, e)) return i - 1; return -1; };
  /* las teclas de una casilla que pisarian a la que se esta grabando: [accion, casilla] */
  K.clash = (e, skipA, skipI) => { for (const a of ORDER) for (let i = 0; i < 2; i++) if (!(a === skipA && i === skipI) && hit(K.map[a][i], e)) return [a, i]; return null; };
  K.fromEvent = e => "c:" + e.code;
  /* teclas que no se pueden asignar: Esc (siempre abre la pausa) y las que el sistema se queda */
  K.reserved = e => e.key === "Escape" || /^(Meta|OS|ContextMenu|PrintScreen|Unidentified|Dead|Process)/.test(e.key) || !e.code;

  /* ---------- nombres para la pantalla: la letra que lleva esa tecla en TU teclado ---------- */
  let layout = null;
  const readLayout = () => { try { if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { layout = m; fire(); }).catch(() => {}); } catch (e) { /* sin API: letras de QWERTY */ } };
  readLayout(); addEventListener("focus", readLayout);
  const ARW = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓" };
  const NAMED = { Enter: "kn.enter", NumpadEnter: "kn.enter", Space: "kn.space", Backspace: "kn.back", Delete: "kn.del", Insert: "kn.ins", Home: "kn.home", End: "kn.end", PageUp: "kn.pgup", PageDown: "kn.pgdn", CapsLock: "kn.caps", ShiftLeft: "kn.shift", ShiftRight: "kn.shift" };
  K.label = b => {
    if (!b) return "";
    const v = b.slice(2); if (b[0] === "k") return v.toUpperCase();
    if (ARW[v]) return ARW[v];
    if (NAMED[v]) return A.t(NAMED[v]);
    const l = layout && layout.get(v); if (l && l.trim()) return l.toUpperCase();
    let m; if ((m = /^Key([A-Z])$/.exec(v))) return m[1]; if ((m = /^Digit(\d)$/.exec(v))) return m[1];
    if ((m = /^Numpad(.+)$/.exec(v))) return "Num " + ({ Add: "+", Subtract: "-", Multiply: "*", Divide: "/", Decimal: ".", Enter: "↵" }[m[1]] || m[1]);
    if (/^(Control|Alt)(Left|Right)$/.test(v)) return v.replace(/(Left|Right)$/, "").replace("Control", "Ctrl");
    return v;
  };
  K.labelOf = action => { const m = K.map[action]; return m ? (m[0] ? K.label(m[0]) : m[1] ? K.label(m[1]) : "") : ""; };

  /* ---------- raton ---------- */
  const BIT = [1, 4, 2, 8, 16];                                          // MouseEvent.buttons de cada boton (0 izq, 1 rueda, 2 der, 3 atras, 4 adelante)
  K.bit = b => BIT[b] || 1;
  /* un pointerdown sintetico (el mando, js/mando.js) siempre cuenta como el boton de marcar */
  K.isPick = e => !e.isTrusted || e.pointerType !== "mouse" || e.button === K.mouse.pick;
  K.isDrag = e => !e.isTrusted || e.pointerType !== "mouse" || e.button === K.mouse.drag;
  K.mouseName = b => A.t("mbn." + (["left", "mid", "right", "b4", "b5"][b] || "left"));
  /* la rueda: sentido (invertida) y donde acerca (puntero o centro del mapa) */
  K.wheel = dy => (K.mouse.invWheel ? -dy : dy);
  /* el boton de la rueda abre el desplazamiento automatico en Windows y los laterales van atras/adelante: con el mapa asignado a ellos, se anulan */
  addEventListener("mousedown", e => { if (e.button && (e.button === K.mouse.pick || e.button === K.mouse.drag) && e.target && e.target.tagName === "CANVAS") e.preventDefault(); }, true);
  addEventListener("mouseup", e => { if (e.button >= 3 && (e.button === K.mouse.pick || e.button === K.mouse.drag) && e.target && e.target.tagName === "CANVAS") e.preventDefault(); }, true);
  addEventListener("auxclick", e => { if (e.target && e.target.tagName === "CANVAS") e.preventDefault(); }, true);
})(window.AIQ);
