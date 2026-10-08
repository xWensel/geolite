/* Geolite · uikit: puntero de casino para TODA la aplicacion + tooltips propios (sustituyen al `title` de Windows).
 *  - Puntero: sprites pixel-art generados en un canvas y aplicados como `cursor: url(...)`. Se reescriben las hojas de estilo para
 *    que grab/pointer/not-allowed... usen la version de casino. Solo en dispositivos con raton (pointer:fine).
 *  - Tooltips: cualquier elemento con `data-tt="Titulo\nDescripcion"` (o `data-th="<html>"`, o el viejo `title`) muestra una tarjeta
 *    pixel-art que sigue al puntero. `A.ttAttr(titulo, descripcion)` devuelve el atributo ya escapado para plantillas. */
(() => {
  "use strict";
  const A = window.AIQ = window.AIQ || {};
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  A.esc = A.esc || esc;
  A.ttAttr = (t, d) => `data-tt="${esc(d ? t + "\n" + d : t)}"`;

  /* ------------------------------------------------------------------ puntero de casino */
  const PAL = { w: "#fff3cf", g: "#f8b449", r: "#ff5a4d", b: "#69c7ff", k: "#16241c" };
  let CELL = 2;                                                         // 3 con el puntero Grande (Ajustes > Controles > Raton)
  const ARROW = [
    "w..........", "ww.........", "www........", "wwww.......", "wwwww......", "wwwwww.....", "wwwwwww....", "wwwwwwww...", "wwwwwwwww..", "wwwwwwwwww.",
    "wwwwww.....", "ww.ww......", "w..www.....", "....ww.....", ".....ww....", ".....ww....",
  ];
  const HAND = [
    "....ww.......", "...wwww......", "...wwww......", "...wwww......", "...wwww......", "...wwwwwwww..", "...wwwwkwwkw.", ".wwwwwwkwwkww", "wwwwwwwwwwwww", "wwwwwwwwwwwww",
    ".wwwwwwwwwwww", ".wwwwwwwwwww.", "..wwwwwwwwww.", "..wwwwwwwww..", "...wwwwwwww..", "...wwwwwwww..",
  ];
  const GRAB = [
    "...w.w.w.....", "..wwwwwwww...", "..wwwwwwwwww.", ".wwwwwwwwwwww", "wwwwwwwwwwwww", "wwwwwwwwwwwww", ".wwwwwwwwwwww", ".wwwwwwwwwww.", "..wwwwwwwwww.", "...wwwwwwww..", "...wwwwwwww..",
  ];
  const FIST = [
    ".............", "..w.w.w.w....", ".wwwwwwwwww..", ".wwwwwwwwwww.", ".wwwwwwwwwww.", ".wwwwwwwwwww.", "..wwwwwwwww..", "...wwwwwww...", "...wwwwwww...",
  ];
  const IBEAM = ["wwwww", "..w..", "..w..", "..w..", "..w..", "..w..", "..w..", "..w..", "..w..", "..w..", "..w..", "wwwww"];
  const HOURGLASS = [
    "wwwwwwwww", ".w.....w.", ".wgggggw.", "..wgggw..", "...wgw...", "....w....", "...w.w...", "..w.g.w..", ".w.ggg.w.", "wwwwwwwww",
  ];
  const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill("."));
  const rows = g => g.map(r => r.join(""));
  function ring(g, cx, cy, r0, r1, c) { for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) { const d = Math.hypot(x - cx, y - cy); if (d >= r0 && d <= r1) g[y][x] = c; } }
  function noEntry() { const g = grid(15, 15); ring(g, 7, 7, 5.2, 7, "r"); for (let i = 2; i <= 12; i++) { g[i][i] = "r"; g[i][i + 1 > 14 ? 14 : i + 1] = "r"; } return rows(g); }
  function cross() { const g = grid(15, 15); for (let i = 0; i < 15; i++) if (i < 5 || i > 9) { g[7][i] = "w"; g[i][7] = "w"; } g[7][7] = "g"; return rows(g); }
  function zoom(plus) { const g = grid(15, 15); ring(g, 5, 5, 3.6, 5.2, "w"); for (let i = 9; i <= 13; i++) { g[i][i] = "g"; g[i][i + 1 > 14 ? 14 : i + 1] = "g"; } for (let x = 3; x <= 7; x++) g[5][x] = "b"; if (plus) for (let y = 3; y <= 7; y++) g[y][5] = "b"; return rows(g); }
  function help() { const a = ARROW.map(r => r.padEnd(17, ".").split("")), q = ["..gggg.", ".gg..gg", ".....gg", "....gg.", "...gg..", "...gg..", ".......", "...gg.."]; q.forEach((r, y) => r.split("").forEach((c, x) => { if (c !== ".") a[y][x + 10] = c; })); return a.map(r => r.join("")); }
  /* nombre -> [filas, hotspot x, hotspot y] en celdas (sin contar el contorno) */
  const SPR = {
    def: [ARROW, 0, 0], ptr: [HAND, 4, 0], txt: [IBEAM, 2, 5], grab: [GRAB, 6, 5], grabbing: [FIST, 6, 4], no: [noEntry(), 7, 7], wait: [HOURGLASS, 4, 4],
    cross: [cross(), 7, 7], zin: [zoom(true), 5, 5], zout: [zoom(false), 5, 5], help: [help(), 0, 0],
  };
  function sprite(name) {
    const [src, hx, hy] = SPR[name], H = src.length, W = Math.max(...src.map(r => r.length)), gw = W + 2, gh = H + 2, g = grid(gw, gh);
    src.forEach((r, y) => r.split("").forEach((c, x) => { if (c !== ".") g[y + 1][x + 1] = c; }));
    const out = g.map(r => r.slice());
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (g[y][x] === ".") { const n = (g[y - 1] || [])[x] || ".", s = (g[y + 1] || [])[x] || ".", e = g[y][x + 1] || ".", w = g[y][x - 1] || "."; if (n !== "." || s !== "." || e !== "." || w !== ".") out[y][x] = "k"; }
    const cv = document.createElement("canvas"); cv.width = gw * CELL; cv.height = gh * CELL; const c = cv.getContext("2d");
    out.forEach((r, y) => r.forEach((ch, x) => { if (ch !== ".") { c.fillStyle = PAL[ch]; c.fillRect(x * CELL, y * CELL, CELL, CELL); } }));
    return `url("${cv.toDataURL("image/png")}") ${(hx + 1) * CELL} ${(hy + 1) * CELL}`;
  }
  const KEY = { auto: "def", default: "def", pointer: "ptr", text: "txt", grab: "grab", grabbing: "grabbing", "not-allowed": "no", wait: "wait", progress: "wait", help: "help", crosshair: "cross", "zoom-in": "zin", "zoom-out": "zout", move: "grab", "all-scroll": "grab" };
  A.cursor = { on: false, available: false, set() {} };
  /* el cursor del mando (js/mando.js) dibuja estos mismos sprites aunque el puntero de casino del raton este apagado */
  const sprMemo = {};
  A.cursor.sprite = name => {
    if (!SPR[name]) return null; if (sprMemo[name]) return sprMemo[name];
    const m = /url\("([^"]+)"\) (\d+) (\d+)/.exec(sprite(name)), [src] = SPR[name], w = (Math.max(...src.map(r => r.length)) + 2) * CELL, h = (src.length + 2) * CELL;
    return (sprMemo[name] = m ? { url: m[1], hx: +m[2], hy: +m[3], w, h } : null);
  };

  function initCursor() {
    let fine = false, off = false;
    try { fine = matchMedia("(pointer:fine)").matches && matchMedia("(hover:hover)").matches; } catch (e) { /* sin matchMedia */ }
    if (!fine) return;
    const root = document.documentElement, fb = { def: "default", ptr: "pointer", txt: "text", grab: "grab", grabbing: "grabbing", no: "not-allowed", wait: "wait", cross: "crosshair", zin: "zoom-in", zout: "zoom-out", help: "help" };
    const sp = {}; Object.keys(SPR).forEach(k => { sp[k] = `${sprite(k)}, ${fb[k]}`; });
    A.cursor.available = true;
    A.cursor.set = on => { A.cursor.on = !!on; Object.keys(SPR).forEach(k => root.style.setProperty("--c-" + k, on ? sp[k] : fb[k])); };
    A.cursor.set(true);
    A.cursor.setSize = big => { const c = big ? 3 : 2; if (c === CELL) return; CELL = c; Object.keys(SPR).forEach(k => { sp[k] = `${sprite(k)}, ${fb[k]}`; }); for (const k in sprMemo) delete sprMemo[k]; A.cursor.set(A.cursor.on); if (A.mando && A.mando.cursorChanged) A.mando.cursorChanged(); };
    const st = document.createElement("style"); st.id = "gcurCss";
    st.textContent = `html.gcur { cursor: var(--c-def); }
:where(html.gcur) :where(a[href], button, summary, select, label[for], [role=button], [role=switch], input[type=button], input[type=submit], input[type=checkbox], input[type=radio], input[type=range], input[type=color], input[type=file]) { cursor: var(--c-ptr); }
:where(html.gcur) :where(input:not([type]), input[type=text], input[type=search], input[type=email], input[type=number], input[type=password], input[type=url], textarea) { cursor: var(--c-txt); }
:where(html.gcur) :where(:disabled, [aria-disabled=true]) { cursor: var(--c-no); }`;
    document.head.appendChild(st);
    /* las hojas propias declaran cursor: pointer/grab/...: se reescriben para que usen la version de casino */
    const fix = rules => {
      for (const r of rules) {
        if (r.cssRules && r.cssRules.length) fix(r.cssRules);
        if (!r.style || !r.style.cursor) continue;
        const k = KEY[r.style.cursor.trim()]; if (k) r.style.setProperty("cursor", `var(--c-${k})`);
      }
    };
    const sweep = () => { for (const sh of document.styleSheets) { try { if (sh.ownerNode && sh.ownerNode.id === "gcurCss") continue; fix(sh.cssRules); } catch (e) { /* hoja externa */ } } };
    sweep(); window.addEventListener("load", sweep); setTimeout(sweep, 1200);
    root.classList.add("gcur");
    /* destello pixel-art al pulsar (no sobre el mapa: ahi ya esta la mira) */
    document.addEventListener("pointerdown", e => {
      if (!A.cursor.on || e.pointerType !== "mouse" || e.button !== 0 || (e.target && e.target.tagName === "CANVAS")) return;
      const b = document.createElement("div"); b.className = "gc-burst"; b.style.left = e.clientX + "px"; b.style.top = e.clientY + "px";
      for (let i = 0; i < 6; i++) { const p = document.createElement("i"), a = (i / 6) * Math.PI * 2 + Math.random() * 0.5; p.style.setProperty("--dx", Math.cos(a) * 18 + "px"); p.style.setProperty("--dy", Math.sin(a) * 18 + "px"); p.className = i % 2 ? "g" : ""; b.appendChild(p); }
      document.body.appendChild(b); setTimeout(() => b.remove(), 520);
    }, true);
  }

  /* ------------------------------------------------------------------ tooltips */
  let tipsOn = true, tip, cur = null, timer = 0, shown = false, mx = 0, my = 0, lastHide = 0;
  const find = t => {
    for (let e = t; e && e.nodeType === 1 && e !== document.documentElement; e = e.parentElement) {
      if (e.hasAttribute("data-th") || e.hasAttribute("data-tt") || e.hasAttribute("data-tip") || e.hasAttribute("data-tf")) return e;
      const ti = e.getAttribute("title"); if (ti) { e.setAttribute("data-tt", ti.indexOf(String.fromCharCode(10)) < 0 ? ti.replace(" — ", String.fromCharCode(10)) : ti); e.removeAttribute("title"); return e; }
    }
    return null;
  };
  const html = el => {
    const h = el.getAttribute("data-th"); if (h) return h;
    const k = el.getAttribute("data-tip"); if (k && !el.hasAttribute("data-tt")) { const pb = PADKEY[el.dataset.key]; return `<b>${esc(A.t ? A.t(k) : k)}${el.dataset.key ? `<span class="tt-k k-kb">${esc(el.dataset.key)}</span>` : ""}${pb ? `<i class="gl tt-gl" data-gl="${pb}"></i>` : ""}</b>`; }
    let raw = el.getAttribute("data-tt"); const f = el.getAttribute("data-tf");
    if (raw == null && f && A.tips[f]) { try { raw = A.tips[f](el); } catch (e) { raw = ""; } }     // tips por funcion: se calculan al pasar el puntero (idioma y numeros al dia)
    const [t, ...r] = String(raw || "").split("\n"); if (!t) return "";
    return `<b>${esc(t)}</b>${r.length ? `<span>${esc(r.join("\n"))}</span>` : ""}`;
  };
  function place() {
    const r = tip.getBoundingClientRect(); let x = mx + 16, y = my + 22;
    if (x + r.width > innerWidth - 8) x = Math.max(8, mx - r.width - 14);
    if (y + r.height > innerHeight - 8) y = Math.max(8, my - r.height - 14);
    tip.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
  }
  function hide() { clearTimeout(timer); if (shown) { shown = false; lastHide = Date.now(); tip.classList.remove("on"); } }
  function show() {
    if (!tipsOn || !cur || !cur.isConnected) return; const h = html(cur); if (!h) return;
    tip.innerHTML = h; shown = true; tip.classList.add("on"); place();
  }
  function arm(el) {
    hide(); cur = el; if (!el) return;
    timer = setTimeout(show, Date.now() - lastHide < 350 ? 0 : 340);
  }
  /* la tecla de cada globo y su boton del mando (js/mando.js); las que no tienen boton (F, M, N) no se ensenan con mando */
  const PADKEY = { "+": "rt", "−": "lt", "-": "lt", "0": "rb", "P": "menu", "Esc": "b" };
  A.tips = A.tips || {};
  A.tt = { enable: on => { tipsOn = !!on; if (!tipsOn) hide(); }, hide, refresh: () => { if (cur && shown) show(); } };

  function initTips() {
    tip = document.createElement("div"); tip.id = "tt"; tip.className = "tt"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip);
    document.addEventListener("pointerover", e => { if (e.pointerType === "touch") return; const el = find(e.target); if (el !== cur) arm(el); }, true);
    /* los controles desactivados no lanzan eventos: se buscan a mano (p. ej. "logro bloqueado" en una baraja) */
    let lastDis = 0;
    const disabledAt = () => { for (const d of document.querySelectorAll(":disabled[data-tt], :disabled[data-th], :disabled[data-tip]")) { const r = d.getBoundingClientRect(); if (mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom) return d; } return null; };
    document.addEventListener("pointermove", e => {
      if (e.pointerType === "touch") return; mx = e.clientX; my = e.clientY; if (shown) place();
      const now = performance.now(); if (now - lastDis < 60) return; lastDis = now;
      const d = disabledAt(); if (d) { if (d !== cur) arm(d); } else if (cur && cur.disabled) arm(null);
    }, { capture: true, passive: true });
    ["pointerdown", "wheel", "keydown", "blur", "scroll"].forEach(k => window.addEventListener(k, hide, true));
    document.addEventListener("pointerout", e => { if (!e.relatedTarget) { hide(); cur = null; } }, true);
    setInterval(() => { if (cur && !cur.isConnected) { hide(); cur = null; } }, 400);
  }

  /* reinicia una animacion o transicion CSS (quitar la clase, A.restyle, volver a ponerla): basta con recalcular el estilo. El clasico
     `void el.offsetWidth` maquetaba ademas la pagina entera cada vez (en cada respuesta, racha, aviso de logro...) */
  A.restyle = el => { if (el) void getComputedStyle(el).opacity; };

  /* ------------------------------------------------------------------ textos sin "huerfanos"
     Si un texto necesita una linea mas solo por unas pocas letras (la ultima linea es muy corta), se aprieta un poco
     (primero el interletrado, luego como mucho un 8 % de tamano) para que quepa en una linea menos. Si ni asi cabe, se deja
     como estaba y `text-wrap: pretty` (CSS) reparte las lineas para que no quede una palabra sola. Lo llama A.fitK (menus,
     Campamento, veredicto) y la presentacion de ronda. La placa de la pregunta no se toca nunca. */
  const SQ_SKIP = "#plate, [data-nosq], .ch-marq, .tt, .dealer, svg, input, textarea";   // el crupier no: lo encogia a medio escribir (y su globo ya reparte las lineas con text-wrap: pretty)
  function lineBoxes(el) {
    const rg = document.createRange(); rg.selectNodeContents(el);
    const rs = [...rg.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5).sort((a, b) => a.top - b.top), lines = [];
    for (const r of rs) { const l = lines[lines.length - 1]; if (l && r.top < l.bottom - Math.min(r.height, l.bottom - l.top) * 0.5) { l.left = Math.min(l.left, r.left); l.right = Math.max(l.right, r.right); l.bottom = Math.max(l.bottom, r.bottom); } else lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }); }
    return lines;
  }
  /* primero se LEE todo y luego se prueba cada paso en todos los textos a la vez: un solo recalculo de la pagina por paso. Antes cada texto
     escribia y medía por su cuenta (cientos de recalculos: el Perfil, con sus 100 logros, congelaba el mapa de fondo mas de un segundo) */
  function squeezePlan(el) {
    const cs = getComputedStyle(el); if (cs.display === "inline" || cs.display === "none" || /nowrap|pre/.test(cs.whiteSpace)) return null;
    const lines = lineBoxes(el); if (lines.length < 2 || lines.length > 6) return null;
    const box = el.getBoundingClientRect(), sc = el.offsetWidth ? box.width / el.offsetWidth : 1;
    const w = box.width - (parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) * sc, last = lines[lines.length - 1];
    if (!(w > 0) || last.right - last.left > w * 0.25) return null;                  // la ultima linea ya es "de verdad": no se toca
    const fs = parseFloat(cs.fontSize), ls = parseFloat(cs.letterSpacing) || 0, keep = { ls: el.style.letterSpacing, fs: el.style.fontSize };
    const tries = []; if (ls > 0.4) tries.push([ls * 0.5, 1], [0, 1]); [0.96, 0.92].forEach(k => tries.push([ls > 0.4 ? 0 : ls, k]));
    return { el, n: lines.length, fs, keep, tries };
  }
  /* textos con algo de texto propio (no solo hijos), fuera de SQ_SKIP y visibles: se recorren los nodos de texto (antes, todos los elementos con closest) */
  function sqTargets(root) {
    const out = new Set(), tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) { const p = n.parentElement; if (p && !out.has(p) && n.nodeValue.trim().length > 1) out.add(p); }
    return [...out].filter(el => !el.closest(SQ_SKIP) && el.getClientRects().length);
  }
  A.squeeze = root => {                                                          // un elemento o una lista (p. ej. las cartas recien anadidas a una rejilla)
    const roots = (Array.isArray(root) ? root : [root]).filter(r => r && r.isConnected); if (!roots.length) return;
    roots.forEach(r => r.querySelectorAll("[data-sq]").forEach(el => { try { const k = JSON.parse(el.dataset.sq); el.style.letterSpacing = k.ls; el.style.fontSize = k.fs; } catch (e) { /* nada */ } delete el.dataset.sq; }));
    roots.forEach(r => r.classList.add("sq-measure"));                           // se mide con el reparto normal de lineas (sin `pretty`)
    let todo = roots.flatMap(sqTargets).map(squeezePlan).filter(Boolean);
    for (let i = 0; todo.length; i++) {
      const next = [];
      todo.forEach(p => { const t = p.tries[i]; if (t) { p.el.style.letterSpacing = t[0] + "px"; p.el.style.fontSize = (p.fs * t[1]).toFixed(2) + "px"; } });   // escribe
      todo.forEach(p => {                                                        // y lee
        if (!p.tries[i]) { p.el.style.letterSpacing = p.keep.ls; p.el.style.fontSize = p.keep.fs; return; }    // ni asi cabe: como estaba
        if (lineBoxes(p.el).length < p.n) p.el.dataset.sq = JSON.stringify(p.keep); else next.push(p);
      });
      todo = next;
    }
    roots.forEach(r => r.classList.remove("sq-measure"));
    /* etiquetas de una sola linea (.sq-fit): si no caben, primero se quita el prefijo prescindible (.sq-pre, si lo hay) y luego se aprietan como arriba;
       ultimo recurso: dos lineas (y un poco mas pequena si una palabra sola no cabe), nunca cortado. Tambien por pasos, todas a la vez */
    const over = el => el.scrollWidth > el.clientWidth + 1;
    const FIT = [
      el => { el.classList.remove("sq-short", "sq-wrap"); el.style.letterSpacing = el.style.fontSize = ""; },
      el => el.classList.add("sq-short"),
      ...[1, 0.95, 0.9, 0.86].map(k => (el, fs) => { el.style.letterSpacing = "0px"; el.style.fontSize = (fs * k).toFixed(2) + "px"; }),
      ...[1, 0.9, 0.8].map((k, i) => (el, fs) => { if (!i) el.classList.add("sq-wrap"); el.style.fontSize = (fs * k).toFixed(2) + "px"; }),
    ];
    let fit = roots.flatMap(r => [...r.querySelectorAll(".sq-fit")]).map(el => ({ el, fs: 0 }));
    for (let i = 0; i < FIT.length && fit.length; i++) {
      fit.forEach(f => FIT[i](f.el, f.fs));
      fit = fit.filter(f => over(f.el));
      if (i === 1) fit.forEach(f => (f.fs = parseFloat(getComputedStyle(f.el).fontSize)));   // su tamano, ya sin el prefijo
    }
  };

  /* etiquetas accesibles en el idioma del juego (index.html solo trae las de espanol): los botones con data-tip usan su texto, los interruptores
     y deslizadores de Ajustes el nombre de su fila, y las flechas de cancion el de su tooltip. Se rehacen cada vez que cambia <html lang> */
  A.ariaSync = () => {
    document.querySelectorAll("button[data-tip][aria-label]").forEach(el => { const s = A.t ? A.t(el.dataset.tip) : ""; if (s && s !== el.dataset.tip) el.setAttribute("aria-label", s); });
    document.querySelectorAll(".row-sw .sw[aria-label], .fader .sw[aria-label], .fader input[aria-label]").forEach(el => { const l = el.closest(".row-sw, .fader").querySelector("label"), s = l && l.textContent.trim(); if (s) el.setAttribute("aria-label", s); });
    document.querySelectorAll(".np-b[data-tf]").forEach(el => { const f = A.tips[el.dataset.tf]; if (f) el.setAttribute("aria-label", String(f(el) || "").split("\n")[0]); });
    const mp = document.getElementById("map"); if (mp && A.pick6) mp.setAttribute("aria-label", A.pick6("Mapa del mundo|World map|Carte du monde|Mapa-múndi|Weltkarte|Mappa del mondo|Mapa del mundo|世界地图|세계 지도|世界地図|Карта мира|Mapa świata"));
  };
  const boot = () => {
    initCursor(); initTips();
    if (window.MutationObserver) new MutationObserver(() => A.ariaSync()).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    /* presentacion de ronda y pie de pagina: se ajustan cada vez que cambia su contenido (el Campamento y los menus los ajusta A.fitK) */
    ["intro", "note"].forEach(id => {
      const el = document.getElementById(id); let t = 0; if (!el || !window.MutationObserver) return;
      new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => requestAnimationFrame(() => A.squeeze(el)), 40); }).observe(el, { childList: true, subtree: true, characterData: true });
    });
    addEventListener("resize", () => ["intro", "note"].forEach(id => A.squeeze(document.getElementById(id))));
  };
  if (document.body) boot(); else document.addEventListener("DOMContentLoaded", boot);
})();
