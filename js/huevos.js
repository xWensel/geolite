/*
 * Geolite - LOS HUEVOS DE LA CASA (v0.4.13, maqueta votada el 31-oct): cosas que solo pasan si PROVOCAS a la casa a proposito. Rompen la cuarta pared
 * en sitios donde hoy no habla nadie. Tres tipos:
 *   A  el crupier reacciona a un gesto tuyo (sacudir el raton, atajos de oficina, machacar, arrastrar, tocar su pajarita...)
 *   B  un objeto de la casa se rebela, sin el (el reverso de tu carta, el ticket, el cartel de Esc, la Enciclopedia)
 *   C  la casa lee algo real (la hora redonda, el otro lado del mundo, tu nombre)
 * REGLAS (las de siempre): LA PARTIDA ES SAGRADA (ninguno de A ni de C sale mientras contestas o lees el ticket: A.dealer.call/homeShown lo cuidan);
 * el crupier es un regalo (como mucho un huevo cada 2 minutos y cada uno con su pausa); nunca dan nada (ni fichas ni logros: el premio es la frase);
 * con Movimiento: Minimo no hay temblor ni caidas, solo la frase. Cada uno que descubres se apunta en su libreta del Perfil (A.huevos.found).
 * Los textos, en js/huevos-textos.js (12 idiomas). Las frases del crupier se funden en sus bolsas (A.dealer.lines).
 *   A.huevos.found(id)  apunta un descubrimiento     A.huevos.n(id)  veces     A.huevos.list  [{id, t}] en orden de libreta
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const H = A.huevos = {};
  const KEY = "atlasiq.huevos";
  let st = { f: {} };
  try { const d = JSON.parse(localStorage.getItem(KEY) || "null"); if (d && d.f) st = d; } catch (e) { /* sin almacenamiento */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* sin almacenamiento */ } };
  /* el orden y el tipo de cada uno (la libreta los muestra en silueta hasta que los encuentras) */
  H.list = [
    ["letras", "A"], ["parche", "A"], ["placas", "A"], ["reverso", "B"], ["sacudida", "A"], ["propina", "A"], ["traje", "A"], ["gato", "A"], ["hora", "C"],
    ["oficina", "A"], ["machacar", "A"],
    ["ticket", "B"], ["antipoda", "C"], ["esc", "B"],
    ["nombres", "C"], ["nomina", "A"], ["busquedas", "B"]
  ].map(([id, t]) => ({ id, t }));
  H.n = id => st.f[id] || 0;
  H.count = () => H.list.filter(h => st.f[h.id]).length;
  H.found = id => { st.f[id] = (st.f[id] || 0) + 1; save(); if (A.profile && A.profile.touch) try { A.profile.touch(); } catch (e) { /* aun no */ } return st.f[id]; };
  H._reset = () => { st = { f: {} }; save(); lastAt = 0; sesion = {}; };

  /* ------------------------------------------------------------------ utilidades */
  const D = () => A.dealer;
  const reduced = () => document.documentElement.classList.contains("reduce-motion");
  const noShake = () => reduced() || document.documentElement.classList.contains("no-shake");
  const T = s => A.pick6(s);
  const typing = e => { const t = e && e.target; return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))); };
  const hold = t => 4200 + (t ? t.length : 60) * 24;
  /* el presupuesto: un huevo con crupier cada 2 minutos como mucho (D2 votada: «asi») */
  let lastAt = 0, sesion = {};
  const GAP = 120000;
  const libre = () => Date.now() - lastAt >= GAP;
  /* lo mete en sus bolsas el dia que carga el juego (las cadenas son de huevos-textos.js) */
  const fundir = () => { const L = D() && D().lines; if (!L || !A.HV) return false; for (const k in A.HV.line) if (!L[k]) L[k] = A.HV.line[k].map(A.L6); return true; };
  /* dice una frase suya por la portada: id = el huevo, key = su bolsa, o = {i: una concreta, d: datos, mood, gap, done, say}. true si ha salido */
  function dice(id, key, o = {}) {
    if (!D() || !D().call || !fundir() || !D().homeShown() || (!o.libre && !libre())) return false;
    const line = o.i != null ? D().nth(key, o.i, o.d) : undefined;
    const ok = D().call(key, { line, again: o.again, mood: o.mood || "sly", gap: o.gap || 20000, exact: true, done: o.done, say: o.say });
    if (ok) { lastAt = Date.now(); H.found(id); }
    return ok;
  }
  /* varias frases seguidas (cada una a su turno: nunca se le corta ni se le quita su segundo de mas) */
  function cadena(id, key, n, o = {}) {
    const paso = i => () => {
      if (i >= n || !D().homeShown()) return;
      const t = D().nth(key, i, o.d); if (!t) return;
      D().say(t, { mood: (o.moods && o.moods[i]) || "sly", hold: hold(t), done: paso(i + 1) });
    };
    return dice(id, key, { i: 0, d: o.d, mood: (o.moods && o.moods[0]) || "sly", gap: o.gap, done: paso(1) });
  }

  /* ================================================================== A · TERREMOTO DE RATON: agitar el raton por la portada */
  (function () {
    let lastX = null, dir = 0, ch = 0, t0 = 0, cool = 0;
    addEventListener("pointermove", e => {
      if (e.pointerType === "touch" || !D() || !D().homeShown || !D().homeShown()) { lastX = null; return; }
      if (lastX == null) { lastX = e.clientX; return; }
      const dx = e.clientX - lastX; if (Math.abs(dx) < 10) return; lastX = e.clientX;
      const now = performance.now(); if (now - t0 > 1000) { ch = 0; t0 = now; }
      const d = Math.sign(dx); if (d !== dir) { dir = d; ch++; }
      if (ch < 8 || Date.now() - cool < 240000) return;
      ch = 0;
      const jolt = !noShake();
      if (dice("sacudida", "hvSacudida", { mood: "angry", gap: 60000, say: jolt ? { gesture: "hat_pop" } : undefined })) {
        cool = Date.now();
        if (jolt) { const hh = document.querySelector(".hh"); if (hh) { hh.classList.remove("hv-quake"); void hh.offsetWidth; hh.classList.add("hv-quake"); setTimeout(() => hh.classList.remove("hv-quake"), 1100); } }
      }
    }, { passive: true });
  })();

  /* ================================================================== A · ATAJOS DE OFICINA: Ctrl+S, F, A, P, V en la portada */
  addEventListener("keydown", e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || !e.key || typing(e) || !D() || !D().homeShown || !D().homeShown()) return;
    const i = { s: 0, f: 1, a: 2, p: 3, v: 4 }[e.key.toLowerCase()]; if (i == null) return;
    e.preventDefault();
    dice("oficina", "hvOficina", { i, mood: i === 2 ? "laugh" : "sly", gap: 30000 });
  }, true);

  /* ================================================================== A · MACHACAR BOTONES: 14 pulsaciones en 2 s en la portada (teclado o mando) */
  (function () {
    let n = 0, t0 = 0, hecho = false;
    const hit = () => {
      if (hecho || !D() || !D().homeShown || !D().homeShown()) return;
      const now = performance.now(); if (now - t0 > 2000) { n = 0; t0 = now; }
      if (++n < 14) return; n = 0;
      if (dice("machacar", "hvMachacar", { mood: "shock", gap: 600000 })) hecho = true;
    };
    addEventListener("keydown", e => { if (e.repeat || typing(e)) return; hit(); }, true);
    addEventListener("gamepadbuttonpress", hit);                                    // por si el mando lo emite como evento (js/mando.js)
    H._machaca = hit;
  })();

  /* ================================================================== C · HORA REDONDA: 11:11, 12:34, 22:22 o 3:33 en tu reloj */
  (function () {
    const tick = () => {
      if (sesion.hora || !D() || !D().homeShown || !D().homeShown()) return;
      const d = new Date(), h = d.getHours(), m = d.getMinutes();
      const i = m === 11 && h % 12 === 11 ? 0 : m === 34 && h % 12 === 0 ? 1 : m === 22 && h === 22 ? 2 : m === 33 && h === 3 ? 3 : -1;
      if (i < 0) return;
      if (dice("hora", "hvHora", { i, mood: i === 3 ? "shock" : "laugh", gap: 600000 })) sesion.hora = 1;
    };
    setInterval(tick, 8000);
    H._hora = i => { const L = ["11:11", "12:34", "22:22", "3:33"]; return dice("hora", "hvHora", { i, mood: "laugh", gap: 1, libre: true }) && L[i]; };
  })();

  /* ================================================================== A · LEE EL PARCHE: 7 clics en la version de la portada */
  (function () {
    let n = 0, t = 0;
    addEventListener("click", e => {
      if (!e.target || !e.target.closest || !e.target.closest(".hh-ver") || !D() || !D().homeShown || !D().homeShown()) return;
      clearTimeout(t); t = setTimeout(() => { n = 0; }, 4000);
      if (++n < 7) return; n = 0;
      cadena("parche", "hvParche", 3, { d: { v: A.VERSION }, moods: ["sly", "laugh", "sly"], gap: 90000 });
    }, true);
  })();

  /* ================================================================== B · LA PAUSA QUE NO HAY: Esc una y otra vez en plena pregunta cambia el cartel «El reloj sigue» */
  (function () {
    let n = 0, t = 0;
    addEventListener("keydown", e => {
      if (e.key !== "Escape" || e.repeat) return;
      const S = A.core && A.core.S; if (!S || S.phase !== "asking") return;
      clearTimeout(t); t = setTimeout(() => { n = 0; }, 25000); n++;
      if (n < 2) return;
      setTimeout(() => {                                                           // cuando el juego ya ha abierto (o cerrado) su cartel
        const ti = document.getElementById("pvTitle"); if (!ti || !document.getElementById("lvTime") || !A.HV) return;
        const k = [2, 4, 6, 8, 12, 16].reduce((r, v, i) => (n >= v ? i : r), -1); if (k < 0) return;
        ti.textContent = T(A.HV.tx.esc[k]); H.found("esc");
      }, 80);
    }, true);
  })();

  /* ================================================================== B · TICKET INTERMINABLE: 5 clics en el TOTAL y el papel sigue saliendo (una cinta que cuelga del ticket, sin tocar su maquetacion) */
  (function () {
    let n = 0, t = 0, busy = false;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    addEventListener("click", e => {
      const tot = e.target && e.target.closest && e.target.closest(".tk-total"); if (!tot || busy || !A.HV) return;
      clearTimeout(t); t = setTimeout(() => { n = 0; }, 3500);
      if (++n < 5) return; n = 0;
      const tk = tot.closest(".ticket") || tot.parentElement, r = tk.getBoundingClientRect(), tr = tot.getBoundingClientRect();
      const w = Math.round(Math.min(r.width, r.left - 14)), top = Math.round(Math.max(8, tr.top - 150)), room = innerHeight - top - 10;
      if (w < 120 || room < 80) return;                                              // no cabe a su lado: no sale
      busy = true; H.found("ticket");
      const box = document.createElement("div"); box.className = "hv-cinta";          // el papel sale por una ranura del costado: cuelga a la izquierda del ticket, tapado un poco por el
      box.style.cssText = `left:${Math.round(r.left - w + 6)}px;top:${top}px;width:${w}px;max-height:${Math.round(room)}px`;
      document.body.appendChild(box);
      const items = A.HV.tx.cinta; let i = 0;
      const step = () => {
        if (!box.isConnected || !tk.isConnected) { box.remove(); busy = false; return; }          // pasaste de pregunta: se la lleva
        if (i >= items.length) { setTimeout(() => { box.classList.add("out"); setTimeout(() => { box.remove(); busy = false; }, reduced() ? 0 : 260); }, 1200 + 1000); return; }
        const it = items[i++], row = document.createElement("div");
        row.innerHTML = `<span>${esc(T(it[0]))}</span><b>${it[1] ? esc(T(it[1])) : ""}</b>`; box.appendChild(row);
        box.scrollTop = box.scrollHeight;
        if (A.sfx && A.sfx.chip) A.sfx.chip(Math.min(4, i));
        setTimeout(step, reduced() ? 60 : 340);
      };
      step();
    }, true);
  })();

  /* ================================================================== B · BUSQUEDAS IMPOSIBLES: la Enciclopedia contesta con retintin (js/codex.js llama aqui cuando no hay resultados) */
  H.busqueda = q => {
    if (!A.HV || !q) return null;
    const n = String(q).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    for (const [re, tx] of A.HV.busq) if (re.test(n)) { H.found("busquedas"); return T(tx); }
    return null;
  };

  /* ================================================================== C · NOMBRES CON HISTORIA: al darle tu nombre (js/nombre.js llama aqui), lo comenta en la portada */
  (function () {
    let pend = null;
    H.nombre = name => {
      if (!A.HV) return; const n = String(name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
      const m = A.HV.nombres.find(x => x[0].test(n)); pend = m ? m[1] : null;
    };
    setInterval(() => { if (pend && D() && D().homeShown && D().homeShown() && dice("nombres", pend, { mood: "sly", gap: 1000, libre: true })) pend = null; }, 3000);
  })();

  /* ================================================================== A · NOMINA DEL CRUPIER: 5 clics en su linea de los creditos (js/creditos.js la pone). No sale el: te deja una nota con su retrato */
  H.nota = (host, textos, o = {}) => {
    if (!host || host.querySelector(".hv-nota")) return;
    const nota = document.createElement("div"); nota.className = "hv-nota";
    const im = document.createElement("img"); im.alt = ""; im.dataset.cart = "dealer_mini"; im.dataset.cdef = "assets/icons/dealer_mini.webp";
    im.src = A.crupierArt ? A.crupierArt("dealer_mini", "assets/icons/dealer_mini.webp") : "assets/icons/dealer_mini.webp";
    const p = document.createElement("p"); nota.append(im, p); host.appendChild(nota);
    requestAnimationFrame(() => nota.classList.add("in"));
    let i = 0;
    const paso = () => {
      if (!nota.isConnected) return;
      if (i >= textos.length) { nota.classList.remove("in"); setTimeout(() => nota.remove(), reduced() ? 0 : 260); return; }
      const t = T(textos[i++]); p.textContent = t; setTimeout(paso, hold(t) + 1000);     // y su segundo de mas, como siempre
    };
    paso();
  };
  H.creditos = sec => {
    if (!A.HV || sec.querySelector(".hv-don")) return;
    const p = document.createElement("p"); p.className = "hv-don";
    const b = document.createElement("b"), s = document.createElement("span"); b.textContent = T(A.HV.tx.donL); s.textContent = T(A.HV.tx.donR); p.append(b, " — ", s);
    sec.appendChild(p);
    let n = 0, t = 0;
    p.addEventListener("click", () => {
      clearTimeout(t); t = setTimeout(() => { n = 0; }, 4000);
      if (++n < 5) return; n = 0;
      H.found("nomina"); H.nota(document.getElementById("crSh") || document.body, A.HV.line.hvNomina);
    });
  };

  /* ================================================================== arrastrar con umbral (placas y propina): solo con raton; el clic de despues se lo traga */
  function arrastre(selector, o) {
    document.addEventListener("pointerdown", e => {
      if (e.pointerType !== "mouse" || e.button !== 0 || !D() || !D().homeShown || !D().homeShown()) return;
      const el = e.target && e.target.closest && e.target.closest(selector); if (!el || (o.puede && !o.puede(el))) return;
      const sx = e.clientX, sy = e.clientY; let ghost = null;
      const mv = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!ghost) { if (Math.hypot(dx, dy) < 14) return; ghost = o.crea(el); if (!ghost) return up(); }
        ghost.style.translate = `${dx}px ${dy}px`; ghost._d = [dx, dy]; ghost._p = [ev.clientX, ev.clientY];
      };
      const up = ev => {
        removeEventListener("pointermove", mv, true); removeEventListener("pointerup", up, true); removeEventListener("pointercancel", up, true);
        if (!ghost) return;
        const tragaClic = c => { c.stopPropagation(); c.preventDefault(); }; addEventListener("click", tragaClic, { capture: true, once: true }); setTimeout(() => removeEventListener("click", tragaClic, true), 120);
        o.suelta(el, ghost, ghost._p || [sx, sy]);
      };
      addEventListener("pointermove", mv, true); addEventListener("pointerup", up, true); addEventListener("pointercancel", up, true);
    }, true);
  }
  const vuelve = (ghost, fin) => { const d = ghost._d || [0, 0]; if (reduced()) { ghost.remove(); fin && fin(); return; } const a = ghost.animate([{ translate: `${d[0]}px ${d[1]}px` }, { translate: "0px 0px" }], { duration: 220, easing: "ease-out" }); a.onfinish = () => { ghost.remove(); fin && fin(); }; };

  /* ================================================================== A · PLACAS SUELTAS: arrastrar una placa de abajo y soltarla fuera de la fila */
  (function () {
    let nth = 0, busy = false;
    arrastre(".hh-deck .plq", {
      puede: () => !busy,
      crea: el => {
        const r = el.getBoundingClientRect(), g = el.cloneNode(true); g.removeAttribute("id"); g.classList.add("hv-ghost"); g.tabIndex = -1;
        g.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;z-index:3000;pointer-events:none`;
        document.body.appendChild(g); el.style.visibility = "hidden"; return g;
      },
      suelta: (el, g) => {
        const deck = el.closest(".hh-deck"), dr = deck.getBoundingClientRect(), d = g._d || [0, 0];
        if (g.getBoundingClientRect().bottom > dr.top + 40) return vuelve(g, () => { el.style.visibility = ""; });      // no la sacaste: vuelve a su sitio
        busy = true; nth++; H.found("placas");
        const caer = () => { g.remove(); deck.classList.add("hv-gap"); el.style.display = "none"; el.style.visibility = ""; };
        if (reduced()) caer(); else { const a = g.animate([{ translate: `${d[0]}px ${d[1]}px`, rotate: "0deg" }, { translate: `${d[0] + 40}px ${innerHeight}px`, rotate: "26deg" }], { duration: 650, easing: "cubic-bezier(.5,0,1,.6)" }); a.onfinish = caer; }
        if (nth === 1) dice("placas", "hvPlaca", { mood: "shock", gap: 30000 });
        setTimeout(() => {                                                          // vuelve sola, de un salto
          deck.classList.remove("hv-gap"); el.style.display = "";
          if (!reduced()) el.animate([{ translate: "0 60px", opacity: 0 }, { translate: "0 -10px", opacity: 1, offset: .7 }, { translate: "0 0" }], { duration: 380 });
          busy = false;
        }, 3000);
      }
    });
  })();

  /* ================================================================== A · PROPINA: arrastrar tu ficha de oro (el contador del Club) hasta el crupier de visita. Nunca se gasta */
  (function () {
    let n = 0;
    arrastre("#hhWal", {
      puede: () => !!(D() && D().el && D().el() && D().el().classList.contains("in")),
      crea: el => {
        const ic = el.querySelector("canvas, img"); if (!ic) return null; const r = ic.getBoundingClientRect(), g = ic.cloneNode(true);
        if (g.getContext && ic.getContext) { g.width = ic.width; g.height = ic.height; g.getContext("2d").drawImage(ic, 0, 0); }
        g.classList.add("hv-ghost"); g.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;z-index:3000;pointer-events:none;image-rendering:pixelated`;
        document.body.appendChild(g); return g;
      },
      suelta: (el, g, p) => {
        const dl = D().el(), r = dl && dl.getBoundingClientRect();
        if (!r || p[0] < r.left || p[0] > r.right || p[1] < r.top || p[1] > r.bottom) return vuelve(g);
        g.remove(); n++;
        dice("propina", "hvPropina", { i: Math.min(n - 1, 4), mood: n > 2 ? "shock" : "laugh", gap: 1000, libre: true });
      }
    });
  })();

  /* ================================================================== B · EL REVERSO DE TU CARTA: mantenerla pulsada 0,9 s la da la vuelta (se dibuja por codigo, a escala entera) */
  (function () {
    let t = 0, vuelta = null, n = 0;
    const fecha = () => { const P = A.profile && A.profile.get && A.profile.get(); const ts = (P && (P.created || P.since || P.first)) || Date.now(); try { return new Date(ts).toLocaleDateString(A.lang === "es-419" ? "es" : A.lang, { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } };
    const numero = () => { const P = A.profile && A.profile.get && A.profile.get(); return String(((A.rank && A.rank.hash && P) ? A.rank.hash(P.id + ":socio") : 421) % 10000).padStart(4, "0"); };
    function da(card) {
      if (vuelta || !A.HV) return; const cv = card.querySelector(".sc-cv"); const rect = card.getBoundingClientRect(); if (!rect.width) return;
      const back = document.createElement("div"); back.className = "hv-rev"; const d = parseFloat(card.style.getPropertyValue("--sd")) || 2;
      back.style.cssText = `--d:${d}px`;
      back.innerHTML = `<b>${T(A.HV.tx.socioDesde).replace("{d}", fecha())}</b><i>${T(A.HV.tx.socioNum).replace("{n}", numero())}</i><span>${T(A.HV.tx.socioLetra)}</span>`;
      const flip = f => { if (reduced()) return f(); card.style.transition = "scale .12s steps(3)"; card.style.scale = "0 1"; setTimeout(() => { f(); card.style.scale = "1 1"; }, 130); };
      flip(() => card.appendChild(back)); vuelta = { card, back, flip }; H.found("reverso"); n++;
      if (n === 5) dice("reverso", "hvReverso", { mood: "laugh", gap: 1000, libre: true });
    }
    function quita() { if (!vuelta) return; const v = vuelta; vuelta = null; v.flip(() => v.back.remove()); }
    document.addEventListener("pointerdown", e => {
      if (e.button !== 0 || !D() || !D().homeShown || !D().homeShown()) return;
      const card = e.target && e.target.closest && e.target.closest(".hh .sc-card"); if (!card) return;
      clearTimeout(t); t = setTimeout(() => { da(card); const traga = c => { c.stopPropagation(); c.preventDefault(); }; addEventListener("click", traga, { capture: true, once: true }); setTimeout(() => removeEventListener("click", traga, true), 800); }, 900);
    }, true);
    addEventListener("pointerup", () => { clearTimeout(t); quita(); }, true);
    document.addEventListener("pointerleave", () => { clearTimeout(t); quita(); }, true);
  })();

  /* ================================================================== A · COMODIN Y LA MONEDA: una moneda sobre la primera placa; mirarla 3 s con el cursor llama al gato, que la tira */
  (function () {
    let coin = null, busy = false, usada = false, t = 0;
    const quita = () => { if (coin) { coin.remove(); coin = null; } };
    function pon() {
      const ok = D() && D().homeShown && D().homeShown() && !usada && !busy && A.moneda && A.COMODIN_DATA && !(D().presence && D().presence().host);
      if (!ok) return busy ? null : quita();
      const pl = document.querySelector(".hh-deck .plq"); if (!pl) return quita(); const r = pl.getBoundingClientRect(); if (r.width < 80) return quita();
      if (!coin || !coin.isConnected) {
        coin = document.createElement("span"); coin.className = "hv-coin"; coin.innerHTML = A.moneda.html("coin", 2); document.body.appendChild(coin);
        coin.addEventListener("pointerenter", () => { clearTimeout(t); t = setTimeout(ve, 3000); }); coin.addEventListener("pointerleave", () => clearTimeout(t));
      }
      const w = coin.offsetWidth || 32, h = coin.offsetHeight || 36;
      coin.style.left = Math.round(r.right - w - 28) + "px"; coin.style.top = Math.round(r.top - h + 5) + "px";
    }
    async function ve() {
      if (busy || !coin || !D().catVisit(30000, "moneda")) return;
      busy = true;
      const espera = async f => { for (let i = 0; i < 40 && !f(); i++) await new Promise(r => setTimeout(r, 250)); return f(); };
      if (!(await espera(() => A.comodin.on() && !A.comodin.busy()))) { busy = false; return; }
      const cx = coin.getBoundingClientRect(); A.comodin.walkTo(cx.left + cx.width / 2);
      await espera(() => !A.comodin.busy()); await new Promise(r => setTimeout(r, 500));
      A.comodin.play("zarpa"); await new Promise(r => setTimeout(r, 900));
      H.found("gato"); usada = true;
      if (coin) { const c = coin; coin = null; if (reduced()) c.remove(); else c.animate([{ translate: "0 0", rotate: "0deg" }, { translate: `22px ${innerHeight}px`, rotate: "540deg" }], { duration: 900, easing: "cubic-bezier(.5,0,1,.6)" }).onfinish = () => c.remove(); }
      setTimeout(() => dice("gato", "hvGato", { mood: "angry", gap: 1000, libre: true }), 700);
      busy = false;
    }
    setInterval(pon, 1500); addEventListener("resize", pon);
  })();

  /* ================================================================== A · CADA RINCON DE EL: clic en su pajarita, su bigote, su antifaz o su mano de cartas (el crupier de visita) */
  (function () {
    const ZONAS = [                                                                  // fracciones de su figura (el lado de su hueco): [x0, x1, y0, y1, bolsa, cuantas]
      ["cartas", .64, .96, .15, .42, "hvCartas", 2], ["antifaz", .27, .57, .40, .52, "hvAntifaz", 2], ["bigote", .30, .52, .53, .62, "hvBigote", 3], ["pajarita", .30, .54, .63, .74, "hvPajarita", 3]
    ];
    const cuenta = {};
    H._zonas = ZONAS;
    document.addEventListener("pointerdown", e => {
      if (e.button !== 0 || !D() || !D().el || !D().homeShown || !D().homeShown()) return;
      const el = D().el(); if (!el || !el.classList.contains("in") || !el.classList.contains("home")) return;
      const r = el.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      const z = ZONAS.find(q => fx >= q[1] && fx <= q[2] && fy >= q[3] && fy <= q[4]); if (!z) return;
      e.stopPropagation(); e.preventDefault();
      const n = cuenta[z[0]] || 0;
      const cad = z[0] === "cartas";
      const ok = dice("traje", z[5], { i: cad ? 0 : Math.min(n, z[6] - 1), mood: z[0] === "bigote" ? "angry" : cad ? "sly" : "laugh", gap: 1500, libre: true,
        done: cad ? () => { const t = D().nth(z[5], 1); if (t && D().homeShown()) D().say(t, { mood: "laugh", hold: hold(t) }); } : undefined });
      if (ok) cuenta[z[0]] = n + 1;
    }, true);
  })();

  /* ================================================================== A · GEOLITE SE CAE: 5 clics seguidos en las letras del titulo. Las piezas (sacadas del rotulo, con su contorno) se sueltan una a una,
     caen y rebotan a saltos de pixel entero sobre las cartas; el crupier sube, las coloca de una en una y el rotulo queda como nuevo (js/geologo.js: quita) */
  (function () {
    const CAJAS = [[16, 27, 102, 127, 0], [122, 27, 84, 127, 102], [344, 27, 79, 128, 186], [425, 27, 40, 128, 265], [467, 27, 94, 128, 305], [563, 27, 86, 128, 399]];   // x, y, ancho, alto, x en la hoja (assets/logo/letras.png)
    const ROT_Y = 17;                                                               // donde pinta geologo.js el rotulo dentro de su caja de 664 x 206
    let data = null, busy = false, n = 0, clics = 0, tc = 0;
    const carga = () => data ? Promise.resolve(data) : Promise.all(["rotulo_vacio", "letras"].map(f => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = "assets/logo/" + f + ".png"; })))
      .then(([v, h]) => (v && h ? (data = { vacio: v, hoja: h, cajas: CAJAS }) : null));
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const sfx = (k, ...a) => { try { A.sfx && A.sfx[k] && A.sfx[k](...a); } catch (e) { /* audio aun no listo */ } };
    const aLetra = (cv, e) => {                                                     // el clic cae sobre una letra del rotulo (la chistera sigue siendo del crupier)
      const r = cv.getBoundingClientRect(), u = r.width / 664, x = (e.clientX - r.left) / u, y = (e.clientY - r.top) / u - ROT_Y;
      return CAJAS.some(b => x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3]);
    };
    document.addEventListener("click", e => {
      if (busy || !D() || !D().homeShown || !D().homeShown()) return;
      const box = e.target && e.target.closest && e.target.closest(".hh .hh-logo"); if (!box) return;
      const cv = A.geoLogo && A.geoLogo.vivo && A.geoLogo.vivo(); if (!cv || !aLetra(cv, e)) return;
      clearTimeout(tc); tc = setTimeout(() => { clics = 0; }, 3000);
      if (++clics < 5) return; clics = 0; n++;
      if (n > 2) return;                                                             // la tercera vez en la sesion, nada: ya se sabe
      cae(cv).catch(() => { if (A.geoLogo) A.geoLogo.quita(new Set()); });
    }, true);

    async function cae(cv) {
      const d = await carga(); if (!d || !A.geoLogo) return; busy = true; H.found("letras");
      const r = cv.getBoundingClientRect(), u = r.width / 664, quieto = reduced();
      const cards = [...document.querySelectorAll(".hh .mcard")].map(c => c.getBoundingClientRect().top).filter(t => t > r.top + 40);
      const suelo = (cards.length ? Math.min(...cards) : r.bottom + 60 * u) - 6;       // el borde de arriba de las cartas
      const cap = document.createElement("div"); cap.className = "hv-letras"; document.body.appendChild(cap);
      const L = CAJAS.map((b, i) => {
        const w = Math.round(b[2] * u), h = Math.round(b[3] * u), c = document.createElement("canvas"); c.width = w; c.height = h; c.className = "hv-letra";
        const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(d.hoja, b[4], 0, b[2], b[3], 0, 0, w, h);
        const x0 = Math.round(r.left + b[0] * u), y0 = Math.round(r.top + (ROT_Y + b[1]) * u);
        c.style.cssText = `left:${x0}px;top:${y0}px;width:${w}px;height:${h}px`; cap.appendChild(c);
        return { c, i, x0, y0, x: x0, y: y0, h, dx: (i % 2 ? 1 : -1) * Math.round((3 + i * 1.5) * u), vy: 0, est: 0 };
      });
      const resto = new Set([0, 1, 2, 3, 4, 5]); A.geoLogo.quita(resto, d);              // las letras salen del rotulo y pasan a ser estas piezas, en el mismo sitio
      const pos = l => { l.c.style.left = Math.round(l.x) + "px"; l.c.style.top = Math.round(l.y) + "px"; };
      /* la caida: gravedad con dos rebotes, siempre a saltos de pixel entero de arte (u) */
      const G = 2600 * u, paso = v => Math.round(v / u) * u;
      const caida = () => new Promise(res => {
        if (quieto) { L.forEach(l => { l.x = l.x0 + l.dx; l.y = suelo - l.h; pos(l); }); return res(); }
        let t0 = performance.now(), last = t0, fin = 0;
        L.forEach(l => { l.t = t0 + l.i * 110; });
        const tick = now => {
          const dt = Math.min(.04, (now - last) / 1000); last = now;
          L.forEach(l => {
            if (now < l.t || l.est === 2) return;
            l.vy += G * dt; l.y += l.vy * dt; l.x = l.x0 + l.dx * Math.min(1, (l.y - l.y0) / Math.max(1, suelo - l.h - l.y0));
            if (l.y >= suelo - l.h) { l.y = suelo - l.h; if (l.est === 0) { l.vy = -l.vy * .38; l.est = 1; sfx("chip", l.i % 4); } else if (Math.abs(l.vy) > 90 * u) { l.vy = -l.vy * .3; sfx("chip", 1); } else { l.vy = 0; l.est = 2; fin++; } }
            l.c.style.left = Math.round(paso(l.x)) + "px"; l.c.style.top = Math.round(paso(l.y)) + "px";
          });
          if (fin >= L.length || now - t0 > 4000) { L.forEach(l => { l.y = suelo - l.h; l.x = l.x0 + l.dx; pos(l); }); return res(); }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      /* la vuelta: cada letra sube a su sitio en un arco, a saltos de pixel, y al llegar vuelve al rotulo */
      const vuelve = l => new Promise(res => {
        const fx = l.x, fy = l.y, dur = quieto ? 1 : 460, t0 = performance.now(), alto = 70 * u;
        const tick = now => {
          const k = Math.min(1, (now - t0) / dur), e = k * k * (3 - 2 * k);
          l.x = fx + (l.x0 - fx) * e; l.y = fy + (l.y0 - fy) * e - Math.sin(Math.PI * e) * alto;
          l.c.style.left = Math.round(paso(l.x)) + "px"; l.c.style.top = Math.round(paso(l.y)) + "px";
          if (k < 1) return requestAnimationFrame(tick);
          resto.delete(l.i); A.geoLogo.quita(resto); l.c.remove(); sfx("chip", 3); res();
        };
        requestAnimationFrame(tick);
      });
      const recoge = async () => { for (const l of L) { if (!cap.isConnected) break; await vuelve(l); await wait(quieto ? 0 : 140); } };
      const limpia = () => { cap.remove(); if (A.geoLogo) A.geoLogo.quita(new Set()); busy = false; };
      const guardia = setTimeout(limpia, 20000);                                         // pase lo que pase, el titulo vuelve entero
      try {
        await caida();
        if (n === 1) {
          await new Promise(res => {
            const ok = dice("letras", "hvLetras", { i: 0, mood: "shock", gap: 1000, libre: true, done: () => {
              const t = D().nth("hvLetras", 1); if (!t || !D().homeShown()) return res();
              D().say(t, { mood: "angry", hold: hold(t), done: () => res() });
            } });
            if (!ok) res();
          });
          await recoge();
          const t2 = D().homeShown() ? D().nth("hvLetras", 2) : null; if (t2) await new Promise(res => D().say(t2, { mood: "laugh", hold: hold(t2), done: res }));
        } else {
          await wait(1200); const ok = dice("letras", "hvLetras", { i: 3, mood: "angry", gap: 1000, libre: true }); await wait(ok ? 800 : 200); await recoge();
        }
      } finally { clearTimeout(guardia); limpia(); }
    }
    H._cae = () => { const cv = A.geoLogo.vivo(); return cv && cae(cv); };
  })();

  /* ================================================================== SU LIBRETA (Perfil > Records): una fila mas con una casilla por huevo. Las encontradas se rellenan (por tipo); las demas, en silueta, sin decir como */
  H.libreta = () => {
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const nombre = T("Libreta del crupier|The dealer's notebook|Le carnet du croupier|O caderno do crupiê|Das Notizbuch des Croupiers|Il taccuino del croupier||荷官的笔记本|딜러의 수첩|ディーラーの手帳|Блокнот крупье|Notes krupiera");
    const lab = T("Descubiertos|Found|Trouvés|Descobertos|Gefunden|Scoperti||已发现|발견|発見|Найдено|Odkryto");
    const cas = H.list.map(h => st.f[h.id] ? `<i class="hv-cas t${h.t}"></i>` : `<i class="hv-cas"></i>`).join("");
    return `<li class="pf-rc hv-lib"><span class="pf-rci" data-ins="m_patch" data-kmax="1"></span><span class="pf-kv"><b class="pf-rcn">${esc(nombre)}</b><i>${esc(lab)}: ${H.count()} / ${H.list.length}</i></span><div class="hv-cass" aria-hidden="true">${cas}</div></li>`;
  };

  /* ------------------------------------------------------------------ sus frases entran en las bolsas en cuanto carga el crupier */
  addEventListener("load", () => { const t = setInterval(() => { if (fundir()) clearInterval(t); }, 300); setTimeout(() => clearInterval(t), 20000); });
})(window.AIQ);
