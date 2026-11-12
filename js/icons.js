/*
 * Geolite - iconos (v0.15): ilustraciones pixel art casino generadas con un unico libro de estilo (tools/gen_art.py) en assets/icons/.
 * Uso: A.icon("sonar") -> <img class="ic">.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  A.blind = (kind, inner) => `<span class="ic blindchip">${A.icon("blank_" + kind, "bc-base")}${A.icon(inner, "bc-in")}</span>`;
  /* Los iconos son ilustraciones pixel-art generadas con un unico libro de estilo (tools/gen_art.py) en assets/icons/.
     Si falta alguno, simplemente no se pinta. */
  const ALIAS = {};
  const VISTE = { dealer_mini: 1, dealer_mini_s: 1 };   // la cabeza del crupier: con la ropa que lleve (js/vestuario.js)
  /* Tallas (Bloque G, css/tallas.css): algunos iconos tienen versiones dibujadas a mano a otra rejilla (assets/icons/<id>_<n>.webp), la MISMA pieza
     redibujada a 16, 24, 32 o 48 px. TALLA: id -> [rejilla del original, tallas dibujadas]. Con la clase t16/t24/t32/t48/t64 el icono sale ya en esa talla;
     despues A.icFit (abajo) elige la version y el tamano que mejor caben en su hueco a escala entera de pixeles reales */
  const TALLA = {};   // sin versiones redibujadas: se usan los dibujos originales y A.icFit solo los dimensiona y centra

  A.TALLA = TALLA;
  /* lo que un icono puede pasarse de su hueco, en pixeles reales: 2 (uno por lado: 32 en un hueco de 30,6, los botones en 1080p) o el 5 % en los
     grandes (un objeto de 48 a x2 en el hueco de 91,8 del Campamento en 1080p): el dibujo lleva margen transparente y el hueco va dentro de su caja */
  const slack = r => Math.max(2, r * 0.05);
  const kNow = () => parseFloat(document.documentElement.style.getPropertyValue("--k")) || 1;   // la escala que puso setK (js/game.js), sin recalcular estilos
  /* la talla que mas llena un hueco de r pixeles reales a escala entera (puede pasarse un poco: slack) */
  const pick = (T, r) => { let b = T[0], bp = 0; for (const n of [T[0]].concat(T[1])) { const m = Math.floor((r + slack(r)) / n + 1e-6); if (m >= 1 && (n * m > bp || (n * m === bp && n > b))) { b = n; bp = n * m; } } return bp ? b : T[1][0]; };
  A.icon = (id, cls = "") => {
    id = ALIAS[id] || id;
    let file = id;
    { const t = /(?:^|\s)t(16|24|32|48|64)(?:\s|$)/.exec(cls); if (t && TALLA[id]) { const n = pick(TALLA[id], +t[1] * kNow() * (devicePixelRatio || 1)); if (n !== TALLA[id][0]) file = id + "_" + n; } }
    const fx = A.ficha ? A.ficha.attr(id) : "";   // ficha lisa: se dibuja al pixel real de la pantalla (js/ficha.js)
    if (fx) A.ficha.soon();
    const def = `assets/icons/${file}.webp`, viste = VISTE[id] && A.crupierArt;
    return `<img class="ic ic-${id} ${fx ? "ic-fx " : ""}${cls}" src="${viste ? A.crupierArt(id, def) : def}"${VISTE[id] ? ` data-cart="${id}" data-cdef="${def}"` : ""} alt="" draggable="false" decoding="${fx ? "sync" : "async"}"${fx}>`;
  };

  /* A.icFit (Bloque G, camino 2): con la escala de serie («Original», no entera: x1,275 en 1920x1080) o un hueco que no es multiplo del dibujo, cada
     icono se pone al mayor multiplo ENTERO de su rejilla que cabe en su hueco, en pixeles REALES (zoom de su pantalla x densidad), centrado en el
     hueco, que no cambia de tamano (lo de alrededor no se mueve). Si el icono tiene versiones dibujadas (TALLA), elige la que mas llena el hueco
     (puede pasarse un poco: slack). Si nada cabe, lo deja como estaba.
     Cuando: un ResizeObserver en pixeles reales por icono (salta al mostrarse, al cambiar la escala, el zoom de la pantalla o el monitor), y todo se
     lee y escribe por tandas en un fotograma (sin medir y escribir intercalado). No toca: las fichas lisas (js/ficha.js), los lienzos de js/moneda.js,
     los juegos del casino (.rou: los mide el propio juego), las fichas con icono encima (.blindchip), la cabeza vestida del crupier ni un icono
     al que otro codigo ya le ha puesto medida en linea. Las insignias de logro (.badge: ficha + dibujo) se ajustan enteras, a la rejilla del dibujo */
  const GRID = { bet_coin: 96, dealer_angry: 96, dealer_laugh: 96, dealer_neutral: 96, dealer_shock: 96, dealer_mini: 52, dealer_mini_s: 32 };
  const FITSEL = "img.ic, img.bq-fi, img.ck-fi, .bq-gi > img, .bq-hgift > img, span.ic.badge";   // las fichas de oro del regalo de la tienda van sin clase
  const VAR = /icons\/([a-z0-9_-]+?)(?:_(16|24|32|48|64))?\.webp(?:[?#].*)?$/;
  const PROPS = ["width", "height", "margin-top", "margin-bottom", "margin-left", "margin-right", "max-width", "max-height", "min-width", "min-height", "content"];
  const skip = el => el.classList.contains("ic-fx") || el.hasAttribute("data-cart") || el.closest(".rou, .blindchip") || (el.tagName === "IMG" && el.closest(".badge")) || (!el._icOv && (el.style.width || el.style.height));
  /* que es: [id base, rejilla ancho, rejilla alto, tallas dibujadas] */
  function what(el, src) {
    if (el.tagName !== "IMG") { const im = el.querySelector(".bd-in"); if (!im || !im.naturalWidth) return null; el = im; src = im.getAttribute("src") || ""; }   // insignia: la ficha (js/ficha.js) y el dibujo se ajustan juntos, a la rejilla del dibujo
    const m = VAR.exec(src); if (!m) return null;
    let id = m[1], n = m[2] ? +m[2] : 0;
    if (n && !(TALLA[id] && TALLA[id][1].includes(n))) { id = id + "_" + n; n = 0; }   // k_af_32 y similares: iconos propios, no tallas
    if (TALLA[id]) return [id, TALLA[id][0], TALLA[id][0], TALLA[id][1]];
    if (/^flag_/.test(id)) return [id, 52, 36, []];
    const nw = el.naturalWidth, nh = el.naturalHeight; if (!nw || !nh) return null;
    const g = GRID[id] || (nw >= 128 && nw % 8 === 0 ? nw / 8 : nw);
    return [id, g, Math.round(g * nh / nw), []];
  }
  const queue = new Set(); let raf = 0;
  const soon = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; const l = [...queue]; queue.clear(); fitList(l); }); };
  const ro = window.ResizeObserver ? new ResizeObserver(es => { for (const e of es) { const el = e.target, d = e.devicePixelContentBoxSize && e.devicePixelContentBoxSize[0];
    if (!el.isConnected) { ro.unobserve(el); el._icRo = 0; continue; } if (!d || d.inlineSize < 2) continue;
    if (el._icOv && Math.abs(d.inlineSize - el._icOv[0]) < 1.5 && Math.abs(d.blockSize - el._icOv[1]) < 1.5) continue;   // es la medida que le puso icFit
    queue.add(el); } if (queue.size) soon(); }) : null;
  function unset(el) {
    if (!el._icOv) return; const keep = el._icKeep || {};
    for (const p of PROPS) { if (keep[p]) el.style.setProperty(p, keep[p]); else el.style.removeProperty(p); }
    el._icOv = null;
  }
  function fitList(list) {
    list = list.filter(el => el.isConnected && !skip(el));
    list.forEach(unset);                                                                   // 1) fuera lo puesto antes: se mide el hueco de verdad
    const plan = list.map(el => {                                                          // 2) leer todo
      const cs = getComputedStyle(el); if (cs.display === "none") return null;
      const cu = el.tagName === "IMG" && /^url\("?([^")]+)"?\)$/.exec(cs.content || ""), src = cu ? cu[1] : el.getAttribute("src") || "";   // css/tallas.css puede cambiar la imagen con content: url()
      const w = what(el, src); if (!w) return null;
      const cw = parseFloat(cs.width), ch = parseFloat(cs.height); if (!(cw > 1 && ch > 1)) return null;
      if (el.tagName !== "IMG") { const iw = parseFloat(getComputedStyle(el.querySelector(".bd-in")).width), f = cw / iw; if (!(f >= 1 && f < 2)) return null; w[1] = Math.round(w[1] * f); w[2] = Math.round(w[2] * f); }   // la insignia mide el dibujo / su parte (75 %): 48 -> 64
      const z = (el.currentCSSZoom || 1) * (devicePixelRatio || 1), rw = cw * z, rh = ch * z;
      let best = null;
      for (const n of [w[1]].concat(w[3])) {
        const gw = n, gh = n === w[1] ? w[2] : n, m = Math.floor(Math.min((rw + slack(rw)) / gw, (rh + slack(rh)) / gh) + 1e-6); if (m < 1) continue;
        const pw = gw * m, ph = gh * m; if (!best || pw > best.pw || (pw === best.pw && n > best.n)) best = { n, pw, ph };
      }
      if (!best) return null;
      const file = best.n === w[1] ? w[0] : w[0] + "_" + best.n;
      if (Math.abs(best.pw - rw) < 0.05 && Math.abs(best.ph - rh) < 0.05 && src.includes("/" + file + ".webp")) return null;   // ya esta bien
      return { el, z, cw, ch, best, file, src, cu: !!cu, mt: parseFloat(cs.marginTop) || 0, mb: parseFloat(cs.marginBottom) || 0, ml: parseFloat(cs.marginLeft) || 0, mr: parseFloat(cs.marginRight) || 0 };
    });
    for (const p of plan) {                                                                // 3) escribir todo
      if (!p) continue; const { el, z, cw, ch, best, file, src } = p;
      const w = best.pw / z, h = best.ph / z, dx = (cw - w) / 2, dy = (ch - h) / 2, st = el.style;
      if (!el._icKeep) { el._icKeep = {}; for (const q of PROPS) { const v = st.getPropertyValue(q); if (v) el._icKeep[q] = v; } }
      const set = (q, v) => st.setProperty(q, v, "important");
      set("width", w.toFixed(4) + "px"); set("height", h.toFixed(4) + "px"); set("max-width", "none"); set("max-height", "none"); set("min-width", "0"); set("min-height", "0");
      set("margin-left", (p.ml + dx).toFixed(4) + "px"); set("margin-right", (p.mr + dx).toFixed(4) + "px"); set("margin-top", (p.mt + dy).toFixed(4) + "px"); set("margin-bottom", (p.mb + dy).toFixed(4) + "px");
      el._icOv = [best.pw, best.ph];
      if (el.tagName !== "IMG" || src.includes("/" + file + ".webp")) continue;
      if (p.cu) set("content", `url("assets/icons/${file}.webp")`); else el.setAttribute("src", src.replace(VAR, () => "icons/" + file + ".webp"));
    }
  }
  const watch = el => { if (ro && !el._icRo) { el._icRo = 1; ro.observe(el, { box: "device-pixel-content-box" }); } };
  A.icFit = (root = document) => { root.querySelectorAll(FITSEL).forEach(el => { watch(el); queue.add(el); }); soon(); };
  A._icErr = im => { im.style.visibility = "hidden"; };
  /* v0.3.235: sin onerror="..." en el HTML (la Content-Security-Policy no deja manejadores en linea): un solo oyente en captura (error y load de
     <img> no burbujean, pero si pasan por la fase de captura) para todos los iconos, los de ahora y los que se inserten despues */
  document.addEventListener("error", e => { const im = e.target; if (im && im.tagName === "IMG" && im.classList.contains("ic")) A._icErr(im); }, true);
  document.addEventListener("load", e => { const im = e.target; if (!im || im.tagName !== "IMG") return; if (im.classList.contains("ic-fx") && A.ficha && A.ficha.see) A.ficha.see(im);
    else if (im.classList.contains("bd-in")) { const b = im.closest(".badge"); if (b) { watch(b); queue.add(b); soon(); } }
    else if (im.matches(FITSEL)) watch(im); }, true);   // Bloque G: cada icono, al pixel real en su hueco (A.icFit; el primer aviso del ResizeObserver lo coloca)   // la ficha lisa se dibuja al pixel real (js/ficha.js; antes onload="")

  /* pinta los iconos declarados en el HTML: <i data-ic="u_plus"></i> */
  A.iconize = (root = document) => root.querySelectorAll("[data-ic]").forEach(el => { if (!el.firstChild) el.innerHTML = A.icon(el.dataset.ic, el.dataset.t ? "t" + el.dataset.t : ""); });
  /* logro -> ilustracion: cada logro tiene la suya (assets/icons/ach_<id>.webp, tools/gen_art.py): Steam pide un icono por logro.
     Aqui solo irian excepciones; sin entrada se usa ach_<id>. */
  A.ACH_ICON = {};
  A.achIcon = id => A.ACH_ICON[id] || "ach_" + id;
  /* insignia de logro: ficha del color de su modo (rojo preguntas, azul Clasico, turquesa Enciclopedia, naranja Aventura, oro Reto diario)
     + la ilustracion encima, un poco mas grande que el hueco de la ficha (igual que el icono de Steam: tools/steam_icons.py) */
  A.ACH_FRAME = { q: "blank_boss", level: "blank_boss", classic: "blank_small", codex: "blank_teal", adv: "blank_big", daily: "blank_gold", casino: "blank_green", dealer: "blank_boss", casa: "blank_green", club: "blank_gold" };
  A.badge = (achId, cls = "") => {
    const a = A.ACH.find(x => x.id === achId);
    return `<span class="ic badge ${cls}">${A.icon(A.ACH_FRAME[a && a.ev] || "blank_boss", "bd-base")}${A.icon(A.achIcon(achId), "bd-in")}</span>`;
  };
  /* iconos como imagen CSS (--ic-nombre) para decorar con ::before/::after */
  A.iconVars = () => {};
  A.iconVars(); A.iconize();
})(window.AIQ);
