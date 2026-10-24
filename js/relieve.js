/*
 * Geolite - EL RELIEVE: la luz de cada pieza y el tacto (v0.3.199 · Bloque F, pasos 2 y 3, votados el 23-oct).
 *
 *  - Cada pantalla tiene sus lamparas (LUCES): los dos focos y la lampara central en la portada, la lampara sobre el centro del mapa en la
 *    partida, la de la caja en el veredicto, dos en el Campamento y una sobre las pantallas con tapete. Cada pieza esta a una altura sobre el
 *    tapete (PIEZAS, en px a 1080p: avisos 52, cartas 30, carta de socio 26, placas 18, paneles 16, cartas de tienda 14, papel 10) y su sombra
 *    cae LEJOS de la lampara, mas larga cuanto mas alta y mas lejos, con canto (el grosor de la pieza en su tono) y penumbra a bandas.
 *  - La pieza recibe la luz: su superficie, mas clara y calida del lado de la lampara y mas fria del otro, con un filo de luz en el borde que
 *    la mira (una capa .lz-sup DEBAJO de lo que lleva encima: dibujos, letras y el crupier nunca se tocan).
 *  - Es un calculo por pantalla, en un hueco libre del hilo principal (lo pide js/casa.js al mirar la sala): escribe unas variables en cada
 *    pieza y css/relieve.css hace el resto. Por fotograma no cuesta nada.
 *  - EL TACTO (paso 3): al pasar, la pieza sube hacia la lampara (su sombra se alarga y se aleja) y se inclina un poco hacia el puntero
 *    (4 grados el naipe, 2,5 el laton); al pulsar, el laton se hunde y el naipe se asienta. En reposo, todo recto y a escala entera.
 *    Las pantallas del menu se reparten como naipes desde la pieza que pulsas y vuelven a ella al salir. Las fichas giran al tocarlas.
 *  - Movimiento minimo (Ajustes): nada se inclina ni viaja; solo cambian la luz y la sombra, y las pantallas entran con un fundido corto.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const $ = id => document.getElementById(id);
  const quieto = () => document.documentElement.classList.contains("reduce-motion");
  /* el ritmo votado (x1): pasar 180 ms, pulsar 80, entrar 320, salir 220, aviso 420 (tambien en css/relieve.css) */
  const T = { pasar: 180, pulsar: 80, entrar: 320, salir: 220, aviso: 420 };

  /* ================================================================ las lamparas de cada pantalla
     x, y: donde cuelga (fraccion de la pantalla); h: a que altura sobre la mesa (px a 1080p); w: cuanto pesa en la sombra */
  const LUCES = {
    home: [{ x: 0.16, y: -0.08, h: 700, w: 1 }, { x: 0.84, y: -0.08, h: 700, w: 1 }, { x: 0.5, y: -0.12, h: 760, w: 0.8 }],
    play: [{ x: 0.5, y: 0.42, h: 700, w: 1 }],
    vd: [{ x: 0.5, y: -0.05, h: 640, w: 1 }],
    camp: [{ x: 0.36, y: -0.1, h: 700, w: 1 }, { x: 0.82, y: -0.1, h: 700, w: 0.6 }],
    mesa: [{ x: 0.5, y: -0.12, h: 720, w: 1 }],
    intro: [{ x: 0.17, y: 0.1, h: 600, w: 1 }, { x: 0.71, y: 0.08, h: 600, w: 1 }],
  };
  /* las piezas: [selector, altura (px a 1080p), material, canto, donde recibe la luz ("self" | "child" | null), recorte de esa superficie, margen, como]
     Material: naipe (sube, se inclina 4 grados, se asienta), laton (sube poco, 2,5 grados, se hunde), papel y laca (quietos), boton (la fila de
     botones de accion: sombra sin canto, cada boton ya lleva su labio), aire (los avisos: sin canto y sombra mas suave).
     Como: "a", la sombra va en su propia capa (::after) y el canto en otra (.lz-k): al pasar y pulsar solo se mueven capas, sin repintar nada
     (las piezas que se tocan en la portada); "f", la sombra es un filtro fijo que sigue la silueta (paneles, papel, avisos, la carta de socio) */
  const PIEZAS = [
    ["#achToast.free", 52, "aire", null, null, null, null, "f"],
    [".hh-cards > .mcard", 30, "naipe", "#a8956c", "self", "var(--px2)", "-3px", "a"],
    ["#socioCard", 26, "naipe", "#a8956c", null, null, null, "f"],
    [".hh-deck > .plq", 18, "laton", "#6e4c17", "self", "var(--gx-notch)", "-4px", "a"],
    [".hh-resume", 14, "laton", "#6e4c17", null, "var(--gx-notch)", "0px", "a"],
    [".gx-vd-mid", 10, "papel", "#b39f76", null, null, null, "f"],
    [".gx-camp .offer.pc:not(.sold)", 14, "naipe", "#a8956c", "self", null, null, "f"],
    [".gx-acts", 12, "boton", null, null, null, null, "f"],
    [".sh, .gx-sh", 16, "laca", null, "child", null, null, "f"],
  ];
  const SUBE = { naipe: 18, laton: 8 }, HUNDE = { naipe: 6, laton: 12 }, INCL = { naipe: 4, laton: 2.5 };
  const MUEVE = { naipe: 1, laton: 1 };                                 // los que responden al raton (los demas solo reciben la luz)

  /* en que pantalla estamos (la misma lectura que la luz de la sala) */
  function cual() {
    const k = A.casa && A.casa.kind ? A.casa.kind() : "play";
    if (k === "codex") return null;
    return k === "home" ? "home" : k === "vd" ? "vd" : k === "camp" ? "camp" : k.startsWith("intro") ? "intro" : k === "play" ? "play" : "mesa";
  }
  const zoomDe = (el, r) => (el.offsetWidth ? r.width / el.offsetWidth : 1) || 1;     // la escala de su pantalla (zoom de .hh, .scr, .gx-stage...)

  /* ================================================================ la luz de cada pieza */
  let sigPrev = "";
  function pinta(forzar) {
    const e = cual(); if (!e) return;
    const W = innerWidth, H = innerHeight; if (!W || !H) return;
    const k = Math.min(W / 1920, H / 1080), L = LUCES[e].map(l => ({ x: l.x * W, y: l.y * H, h: l.h * k, w: l.w })), px = Math.max(1, Math.round(2 * k));
    const vistos = new Set(), lista = [];
    for (const P of PIEZAS) for (const el of document.querySelectorAll(P[0])) {
      if (vistos.has(el) || el.closest(".lz-ghost")) continue;
      let dentro = false; for (let p = el.parentElement; p; p = p.parentElement) if (vistos.has(p)) { dentro = true; break; }
      if (dentro && P[2] !== "naipe") continue;                         // un panel dentro de otro ya pintado no repite sombra; un naipe si (la carta sobre el tapete)
      const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;
      vistos.add(el); lista.push([el, r, P, mide(el, r, P)]);
    }
    const sig = e + "|" + W + "x" + H + "|" + lista.map(([el, r]) => (el.id || el.className) + Math.round(r.left / 8) + "," + Math.round(r.top / 8) + "," + Math.round(r.width / 8)).join(";");
    if (!forzar && sig === sigPrev && lista.every(([el]) => el.hasAttribute("data-lz") && supOk(el))) return;
    sigPrev = sig;
    for (const [el, r, P, m] of lista) una(el, r, P, L, k, px, W, H, m);
  }
  /* lo que hay que medir de cada pieza, todo antes de escribir nada (si no, cada escritura obligaria a recalcular la pagina para la siguiente medida) */
  function mide(el, r, P) {
    const tgt = P[4] === "child" ? el.firstElementChild : P[4] ? el : null;
    return { z: zoomDe(el, r), sup: !!tgt && tgt.getBoundingClientRect().width >= 40 };
  }
  /* la capa de luz sigue donde se puso (una pantalla repintada se la lleva por delante) */
  const supOk = el => [el._lzSup, el._lzK].every(s => !s || s.isConnected);
  function una(el, r, P, L, k, px, W, H, m) {
    m = m || mide(el, r, P);
    const [, alto, mat, canto, sup, clip, ins0, modo] = P, z = m.z;
    const ins = el.classList.contains("plq") && !(innerWidth >= 900 && innerHeight >= 520) ? "0px" : ins0;   // el filo de laton de las placas solo en escritorio y Deck
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    /* la sombra a una altura h (px de pantalla): lejos de cada lampara, en proporcion a lo alta que esta la pieza y lo lejos que cae la luz */
    const sombra = h => {
      let sx = 0, sy = 0, sw = 0;
      for (const l of L) { sx += l.w * h * (cx - l.x) / l.h; sy += l.w * h * (cy - l.y) / l.h; sw += l.w; }
      sx /= sw; sy = sy / sw + h * 0.18;
      const m = Math.hypot(sx, sy), cap = 34 * k * (h / (alto * k)); if (m > cap) { sx *= cap / m; sy *= cap / m; }
      return [sx, sy];
    };
    const q = v => Math.round(v / px) * px, css = v => (v / z).toFixed(3) + "px";   // a bandas de pixel de pantalla, escritas en px de su escala
    const s = el.style, pon = (n, h) => {
      const [sx, sy] = sombra(h), c = canto ? Math.max(px, Math.round(h / 6 / px) * px) : 0;
      s.setProperty("--lz-x" + n, css(q(sx))); s.setProperty("--lz-y" + n, css(q(sy))); s.setProperty("--lz-c" + n, css(c));
      if (modo === "a") { s.setProperty("--lz-px" + n, css(q(sx * 1.75) - q(sx))); s.setProperty("--lz-py" + n, css(q(sy * 1.75) - q(sy))); }   // la penumbra, desde la sombra
      else { s.setProperty("--lz-xx" + n, css(q(sx * 1.75))); s.setProperty("--lz-yy" + n, css(q(sy * 1.75))); }
    };
    pon(0, alto * k);
    if (MUEVE[mat]) {
      el.setAttribute("data-lz-t", mat); el._lzR = r;
      if (modo === "a") { pon(1, (alto + SUBE[mat]) * k); pon(2, Math.max(2, alto - HUNDE[mat]) * k); } else { pon(1, alto * k); pon(2, alto * k); }   // con filtro, la sombra no cambia (seria repintar)
    }
    el.setAttribute("data-lz-s", modo);
    if (modo === "a") {
      s.setProperty("--lz-ins", ins || "0px");
      /* el canto: la misma forma que la cara, asomando por debajo en su tono (se aplasta al pulsar) */
      let kk = el._lzK;
      if (canto) {
        if (!kk || !kk.isConnected || kk.parentElement !== el) { if (kk) kk.remove(); kk = document.createElement("i"); kk.className = "lz-k"; kk.setAttribute("aria-hidden", "true"); el.insertBefore(kk, el.firstChild); el._lzK = kk; }
        const ks = kk.style; ks.inset = ins || "0px"; ks.clipPath = clip || ""; ks.background = canto;
      } else if (kk) { kk.remove(); el._lzK = null; }
    }
    /* mas luz cerca de la lampara, menos lejos (un punto: lo que se lee no cambia) */
    let dmin = 1e9, ux = 0, uy = 0;
    for (const l of L) { const dx = cx - l.x, dy = cy - l.y, dd = Math.hypot(dx, dy) || 1; dmin = Math.min(dmin, dd); ux += l.w * dx / dd / (1 + dd / (900 * k)); uy += l.w * dy / dd / (1 + dd / (900 * k)); }
    const dn = Math.min(1, dmin / (0.7 * Math.hypot(W, H))), um = Math.hypot(ux, uy) || 1; ux /= um; uy /= um;
    s.setProperty("--lz-k", canto || "transparent");
    el.setAttribute("data-lz", mat);
    /* la superficie recibe la luz: bandas calidas del lado de la lampara y frias del otro, y un filo de luz en el borde que la mira */
    if (!sup) return;
    const tgt = sup === "child" ? el.firstElementChild : el; if (!tgt || !m.sup) return;
    let ov = el._lzSup; if (!ov || !ov.isConnected || ov.parentElement !== tgt) { if (ov) ov.remove(); ov = document.createElement("i"); ov.className = "lz-sup"; ov.setAttribute("aria-hidden", "true"); tgt.insertBefore(ov, tgt.firstChild); el._lzSup = ov; }
    const ang = Math.round(Math.atan2(ux, -uy) * 180 / Math.PI), near = (0.30 + 0.12 * (1 - dn)).toFixed(3), near2 = (0.165 + 0.066 * (1 - dn)).toFixed(3), far = (0.22 + 0.12 * dn), e2 = 2;
    const st = ov.style; st.inset = ins || "0"; st.clipPath = clip || "";
    st.background = `linear-gradient(${ang}deg, rgba(255,226,170,${near}) 0 16%, rgba(255,226,170,${near2}) 16% 34%, rgba(0,0,0,0) 34% 62%, rgba(10,30,40,${(far * 0.6).toFixed(3)}) 62% 82%, rgba(10,30,40,${far.toFixed(3)}) 82%)`;
    st.boxShadow = `inset ${Math.round(-ux * e2)}px ${Math.round(-uy * e2)}px 0 rgba(255,246,220,.55), inset ${Math.round(ux * e2)}px ${Math.round(uy * e2)}px 0 rgba(0,10,8,.45)`;
  }
  /* una pieza suelta que acaba de aparecer (el aviso de logro): solo ella */
  function pieza(el) {
    const e = cual(); if (!e || !el) return;
    const W = innerWidth, H = innerHeight, k = Math.min(W / 1920, H / 1080), L = LUCES[e].map(l => ({ x: l.x * W, y: l.y * H, h: l.h * k, w: l.w })), px = Math.max(1, Math.round(2 * k));
    const P = PIEZAS.find(p => el.matches(p[0])); if (!P) { el.removeAttribute("data-lz"); return; }
    const r = el.getBoundingClientRect(); if (r.width) una(el, r, P, L, k, px, W, H);
  }

  /* ================================================================ el tacto: se inclina hacia el puntero mientras lo tocas */
  let cur = null, raf = 0, ev = null;
  const suelta = el => { if (el) { el.style.removeProperty("--lz-rx"); el.style.removeProperty("--lz-ry"); } };
  document.addEventListener("pointermove", e => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const el = e.target && e.target.closest ? e.target.closest("[data-lz-t]") : null;
    if (el !== cur) { suelta(cur); cur = el; }
    if (!el || quieto()) return;
    ev = e; if (!raf) raf = requestAnimationFrame(() => {
      raf = 0; if (!cur || !ev) return; const R = cur._lzR; if (!R) return;
      const g = INCL[cur.getAttribute("data-lz-t")] || 0, x = Math.max(0, Math.min(1, (ev.clientX - R.left) / R.width)), y = Math.max(0, Math.min(1, (ev.clientY - R.top) / R.height));
      cur.style.setProperty("--lz-rx", ((0.5 - y) * 2 * g).toFixed(2) + "deg"); cur.style.setProperty("--lz-ry", ((x - 0.5) * 2 * g).toFixed(2) + "deg");
    });
  }, { passive: true });
  document.addEventListener("pointerleave", () => { suelta(cur); cur = null; }, true);

  /* las fichas de oro de la tienda giran al tocarlas: una vuelta entera y vuelven a su sitio (el doblon del Campamento juega a cara o cruz: js/juguetes.js) */
  const FICHAS = ".bq-wal > .ic, .bq-wal > svg";
  document.addEventListener("pointerdown", e => {
    const box = e.target && e.target.closest ? e.target.closest(".bq-wal") : null; if (!box || quieto()) return;
    const f = box.querySelector(FICHAS); if (!f || f._lzGira) return;
    f._lzGira = f.animate([{ transform: "perspective(400px) translateY(0) rotateY(0deg)" }, { transform: "perspective(400px) translateY(-4px) rotateY(180deg)", offset: 0.5 }, { transform: "perspective(400px) translateY(0) rotateY(360deg)" }], { duration: Math.round(T.entrar * 1.6), easing: "cubic-bezier(.2, .8, .3, 1)" });
    f._lzGira.finished.then(() => { f._lzGira = null; }, () => { f._lzGira = null; });
    if (A.sfx && A.sfx.coin) A.sfx.coin(0.5);
  }, true);

  /* ================================================================ alineacion de la portada: las cartas laterales sobre las columnas de sus placas */
  function alinea() {
    const cards = [...document.querySelectorAll("#dlg .hh-cards > .mcard")], deck = document.querySelector("#dlg .hh-deck.five");
    cards.forEach(c => c.style.removeProperty("translate"));
    if (cards.length !== 3 || !deck || innerWidth < 900) return;
    const pl = [...deck.querySelectorAll(":scope > .plq, :scope > *")].filter(x => x.getBoundingClientRect().width > 40); if (pl.length !== 5) return;
    const mid = e => { const r = e.getBoundingClientRect(); return r.left + r.width / 2; }, z = zoomDe(cards[0], cards[0].getBoundingClientRect());
    /* en px enteros de pantalla (el dibujo de la carta no cae entre dos pixeles), escritos en px de su escala */
    /* nunca a costa de la Aventura: en Media y Compacta las placas quedan mas cerca del centro que las cartas y, sin tope, las laterales se le montaban encima.
       La separacion que ya tenian (menos 12 px) es lo maximo que pueden acercarse, igual en las dos para que sigan en espejo */
    const hr = cards[1].getBoundingClientRect(), r0 = cards[0].getBoundingClientRect(), r2 = cards[2].getBoundingClientRect();
    const room = Math.max(0, Math.min(hr.left - r0.right, r2.left - hr.right) - 12 * z);
    [[cards[0], pl[1], 1], [cards[2], pl[3], -1]].forEach(([c, p, dir]) => {
      let d = Math.round(mid(p) - mid(c)); if (d * dir > 0) d = dir * Math.min(Math.abs(d), Math.floor(room));   // hacia el centro, con tope
      if (d && Math.abs(d) < 120 * z) c.style.translate = (d / z).toFixed(4) + "px 0";
    });
  }

  /* ================================================================ las pantallas, como naipes sobre la mesa */
  /* la pieza de la portada de cada pantalla: de ahi sale al abrirla y ahi vuelve al cerrarla */
  const PIEZA_DE = { boutique: "#bqBtn", retos: "#clubRtBtn", profile: "#profBtn", camino: "#socioCard", patch: "#patchBtn", classic: '.mcard[data-mode="classic"]', adventure: '.mcard[data-mode="adventure"]', duelo: '.mcard[data-mode="duelo"]', daily: '.mcard[data-mode="daily"]' };
  let pulsada = null, vivo = null;
  document.addEventListener("pointerdown", e => {
    const p = e.target && e.target.closest ? e.target.closest("#dlg .plq, #dlg .mcard, #dlg .hh-socio, #dlg .menu-patch, #dlg .hh-cont") : null;
    if (p) pulsada = { r: p.getBoundingClientRect(), t: performance.now() };
  }, true);
  const cierra = () => { if (!vivo) return; const v = vivo; vivo = null; v.anims.forEach(a => { try { a.cancel(); } catch (e) { /* ya acabo */ } }); v.g.remove(); if (v.sh) v.sh.remove(); const d = $("dlg"); if (d) d.classList.remove("lz-deal"); };
  /* antes de pintar la pantalla nueva: lo que habia se aparta a una copia (sus nodos tal cual, quietos e inertes), debajo si entras y encima si sales */
  function antes(id, de) {
    cierra();
    const lay = $("layer"), d = $("dlg"); if (!lay || !d || lay.classList.contains("hidden") || !d.firstElementChild) return null;
    const enHome = d.classList.contains("home"), entra = enHome && id !== "home", sale = !enHome && id === "home" && !!PIEZA_DE[de];
    if (!entra && !sale) return null;
    let r = null;
    if (entra) { if (pulsada && performance.now() - pulsada.t < 1500) r = pulsada.r; else { const p = d.querySelector(PIEZA_DE[id] || "#none"); if (p) r = p.getBoundingClientRect(); } }
    pulsada = null;
    const g = document.createElement("div"); g.className = "lz-ghost " + (entra ? "bajo" : "sobre"); g.setAttribute("inert", ""); g.setAttribute("aria-hidden", "true");
    g.style.cssText = d.style.cssText; while (d.firstChild) g.appendChild(d.firstChild);
    d.after(g);                                                          // detras de #dlg en el documento: getElementById sigue encontrando antes lo de la pantalla nueva
    return { entra, de, r, g };
  }
  /* despues: la pantalla nueva se reparte desde la pieza (o la vieja vuelve a ella). Algunas se pintan un momento despues (la tienda espera al
     vestuario): se espera a que llegue, con lo de antes quieto debajo; si no llega, todo vuelve a estar como estaba */
  function despues(o, id) {
    if (!o) return;
    const d = $("dlg");
    if (d && !d.firstElementChild) {
      const v = vivo = { g: o.g, anims: [], sh: null };
      const mo = new MutationObserver(() => { if (d.firstElementChild) { mo.disconnect(); clearTimeout(v.tm); if (vivo === v) { vivo = null; reparte(o, d); } } });
      mo.observe(d, { childList: true });
      v.tm = setTimeout(() => { mo.disconnect(); if (vivo !== v) return; vivo = null; if (!d.firstElementChild) while (o.g.firstChild) d.appendChild(o.g.firstChild); o.g.remove(); }, 2500);
      v.anims.push({ cancel: () => { mo.disconnect(); clearTimeout(v.tm); } });
      return;
    }
    if (d) reparte(o, d);
  }
  function reparte(o, d) {
    const W = innerWidth, H = innerHeight, k = Math.min(W / 1920, H / 1080);
    if (!o.entra) { const p = d.querySelector(PIEZA_DE[o.de]); o.r = p ? p.getBoundingClientRect() : null; }
    /* la luz de la pantalla nueva se calcula ya, quieta y antes de moverla: asi no cae en mitad del reparto (y mide donde de verdad va a estar) */
    try { pinta(true); if (d.classList.contains("home")) alinea(); } catch (e) { /* sin luz no se para nada */ }
    const r = o.r, sx = r ? r.left + r.width / 2 - W / 2 : 0, sy = r ? r.top + r.height / 2 - H / 2 : H * 0.3, dir = sx < -4 ? -1 : 1;
    const v = vivo = { g: o.g, anims: [], sh: null };
    const fin = () => { if (vivo === v) cierra(); };
    if (quieto() || !r) {                                                // Movimiento minimo: un fundido corto
      if (o.entra) { v.anims.push(d.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: "ease-out" })); setTimeout(fin, 150); }
      else { const a = o.g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "ease-in", fill: "forwards" }); v.anims.push(a); a.finished.then(fin, fin); }
      return;
    }
    /* la sombra de la pantalla en el aire: un rectangulo oscuro que va con ella y se encoge hasta el contacto (solo transform y opacity) */
    const sh = v.sh = document.createElement("i"); sh.className = "lz-deal-sh " + (o.entra ? "bajo" : "sobre"); sh.setAttribute("aria-hidden", "true"); o.g.before(sh);
    const tr = (x, y, rot, sc) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(rot * dir).toFixed(2)}deg)${sc != null ? ` scale(${sc})` : ""}`;
    const sombra = (h, x, y, rot, sc) => tr(x + 0.35 * h * k, y + 0.7 * h * k, rot, sc);
    if (o.entra) {
      d.classList.add("lz-deal");
      d.querySelectorAll(".bq-screen > .gx-grid, .pf-screen > .gx-grid").forEach(g => { g.style.animation = "none"; });   // la entrada de lado (Bloque J): el reparto la sustituye
      const K = [[sx, sy, 7, 0.32, 80, 0.45, 0], [sx * 0.12, sy * 0.08 - 26 * k, 1.4, 0.98, 46, 0.4, 0.72], [0, 3 * k, -0.3, null, 4, 0.3, 0.9], [0, 0, 0, null, 0, 0, 1]];
      const opt = { duration: T.entrar, easing: "cubic-bezier(.22, .8, .3, 1)" };
      v.anims.push(d.animate(K.map(([x, y, rot, sc, , , off]) => ({ opacity: 1, transform: off === 1 ? "none" : tr(x, y, rot, sc), offset: off })), opt));
      v.anims.push(sh.animate(K.map(([x, y, rot, sc, h, a, off]) => ({ opacity: a, transform: sombra(h, x, y, rot, sc), offset: off })), opt));
      setTimeout(() => { if (A.sfx && A.sfx.ui) A.sfx.ui(); }, Math.round(T.entrar * 0.86));   // se posa
      setTimeout(fin, T.entrar + 30);
    } else {
      const K = [[0, 0, 0, null, 0, 0, 1, 0], [0, -18 * k, -0.6, null, 22, 0.4, 1, 0.25], [sx, sy, 6, 0.32, 52, 0.4, 0, 1]];
      const opt = { duration: T.salir, easing: "cubic-bezier(.5, 0, .75, .3)", fill: "forwards" };
      const a = o.g.animate(K.map(([x, y, rot, sc, , , op, off]) => ({ opacity: op, transform: off === 0 ? "none" : tr(x, y, rot, sc), offset: off })), opt);
      v.anims.push(a, sh.animate(K.map(([x, y, rot, sc, h, al, op, off]) => ({ opacity: al * op, transform: sombra(h, x, y, rot, sc), offset: off })), opt));
      a.finished.then(fin, fin);
    }
  }

  /* ================================================================ arranque */
  document.documentElement.classList.add("lz");
  addEventListener("resize", () => { sigPrev = ""; alinea(); });
  A.relieve = { pinta, pieza, alinea, antes, despues, T, LUCES, get vivo() { return !!vivo; } };
})(window.AIQ);
