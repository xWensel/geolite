/* Geolite - marcador y ticket en una sola pieza (v0.36).
 * En escritorio el ticket de cada respuesta ya no es una ventana aparte que pisaba el marcador: sale del propio marcador,
 * que se ensancha y se despliega hacia abajo como una maquina que imprime. Los puntos del ticket suben al marcador
 * (fichas que vuelan, cifras que ruedan al compas del total, barra que se llena) y, al pasar de pregunta, el ticket se
 * arranca y cae. Si ese cobro alcanza el objetivo (o, en la Aventura, un escalon de botin), la barra lo celebra con sello,
 * la firma sonora del juego y vibracion. En movil/tablet el ticket sigue siendo la hoja inferior, pero el cobro es igual.
 *   A.marcador.docked()  .show(html)  .close(instant)  .cashIn(datos)  .primary()  .isOpen()
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id);
  const M = A.marcador = {};
  const still = () => document.documentElement.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const buzz = p => { if (A.haptic) A.haptic(p); };
  /* escritorio: el ticket va pegado al marcador. Movil, tablet y movil en horizontal (<= 520 px de alto): hoja inferior (#dlg) */
  M.docked = () => innerWidth > 900 && innerHeight > 520;

  let slot = null, isOpen = false, gen = 0, widthT = 0;
  const later = (fn, ms) => { const g = gen; setTimeout(() => { if (g === gen) fn(); }, ms); };
  const shell = () => $("ledgerSh");
  function paper() {
    if (!slot) { slot = document.createElement("div"); slot.id = "tkSlot"; slot.className = "mc-slot"; slot.innerHTML = '<div class="mc-in"></div>'; shell().appendChild(slot); }
    return slot.firstElementChild;
  }
  M.isOpen = () => isOpen;
  M.primary = () => (isOpen ? paper().querySelector("[data-primary]") : null);

  /* ancho animado: el marcador pasa de su ancho natural al del ticket y vuelve. Con "auto" no hay transicion: se fija en px mientras dura */
  function widthTo(open) {
    const sh = shell(); clearTimeout(widthT);
    const from = sh.getBoundingClientRect().width;
    sh.style.width = ""; sh.classList.toggle("mc-open", open);
    const to = sh.getBoundingClientRect().width;
    if (still() || Math.abs(to - from) < 1) return;
    sh.style.transition = "none"; sh.style.width = from + "px"; A.restyle(sh); sh.style.transition = "";
    sh.style.width = to + "px";
    widthT = setTimeout(() => { sh.style.width = ""; }, 460);
  }

  /* ---------------------------------------------------------------- abrir: el ticket sale del marcador */
  M.show = html => {
    const sh = shell(), p = paper(), was = isOpen;
    gen++; clearFx();
    p.innerHTML = html; p.style.removeProperty("--mc-z");
    isOpen = true; document.body.classList.add("tk-on", "mc-on");
    if (!was) {
      sh.classList.remove("mc-live"); A.restyle(sh);
      sh.classList.add("mc-live"); A.restyle(sh);          // hueco montado a alto 0: la transicion arranca desde ahi
      widthTo(true);
      if (!still() && A.sfx.feed) setTimeout(A.sfx.feed, 70);
    }
    fit(); requestAnimationFrame(() => { fit(); if (innerWidth < 1240 && A.dealer && A.dealer.refit) A.dealer.refit(); });   // la nota de campo cambia justo despues: se vuelve a medir antes de pintar. Si el crupier ya hablaba, se aparta del ticket (solo en ventanas en las que su globo llega hasta el)
    later(() => { const b = M.primary(); if (b) b.focus({ preventScroll: true }); }, 60);
  };

  /* ---------------------------------------------------------------- cerrar: el ticket se arranca y cae (instant: sin animacion) */
  M.close = instant => {
    gen++; clearFx();
    if (!isOpen) return;
    const sh = shell(), p = paper(), r = p.getBoundingClientRect(), app = $("app");
    isOpen = false; document.body.classList.remove("tk-on", "mc-on");
    if (!instant && !still() && r.height > 40 && app) {
      /* copia suelta del ticket (con su compactacion) que cae mientras el marcador vuelve a su tamano */
      const ar = app.getBoundingClientRect(), g = document.createElement("div"), c = p.cloneNode(true);
      c.querySelectorAll("[id]").forEach(e => e.removeAttribute("id"));
      c.className = ["mc-in", "mc-ghost", ...[...sh.classList].filter(k => /^mc-c\d$/.test(k))].join(" ");
      g.className = "mc-drop"; g.appendChild(c);                  // la sombra va en el envoltorio: la mascara dentada la cortaria
      Object.assign(g.style, { left: r.left - ar.left + "px", top: r.top - ar.top + "px", width: r.width + "px", height: r.height + "px" });
      app.appendChild(g);
      const s = Math.random() < 0.5 ? -1 : 1, dx = s * (10 + Math.random() * 16), rot = s * (4 + Math.random() * 3);
      /* tiron seco (se arranca) y luego cae con gravedad, girando un poco hacia un lado */
      const an = g.animate([
        { transform: "translate(0, 0) rotate(0deg)", opacity: 1, easing: "cubic-bezier(.2, .8, .3, 1)" },
        { transform: `translate(${dx * 0.1}px, 9px) rotate(${rot * 0.22}deg)`, opacity: 1, offset: 0.16, easing: "cubic-bezier(.5, 0, .9, .45)" },
        { transform: `translate(${dx * 0.6}px, 70px) rotate(${rot * 0.7}deg)`, opacity: 0.85, offset: 0.7 },
        { transform: `translate(${dx}px, 130px) rotate(${rot}deg)`, opacity: 0 },
      ], { duration: 520, fill: "forwards" });
      an.onfinish = () => g.remove(); setTimeout(() => g.remove(), 900);
      if (A.sfx.tear) A.sfx.tear();
    }
    p.innerHTML = ""; p.style.removeProperty("--mc-z");
    sh.classList.remove("mc-live", "mc-c1", "mc-c2");
    widthTo(false);
  };

  /* ---------------------------------------------------------------- que quepa entero: nada de desplazarse ni de pisar la nota de campo */
  const mcW = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--mc-w")) || 352;
  function limit(sh) {
    let lim = innerHeight - 12;
    const n = $("noteSh"), right = sh.getBoundingClientRect().right, left = right - mcW();
    if (n && !n.classList.contains("hidden")) { const r = n.getBoundingClientRect(); if (r.height && r.left < right && r.right > left + 1) lim = Math.min(lim, r.top - 10); }   // solo si de verdad comparten columna (a 1440 px quedan a 4 px)
    return lim;
  }
  function fit() {
    if (!isOpen || !M.docked()) return;
    const sh = shell(), p = paper(), led = $("ledger"); if (!p.firstElementChild) return;
    sh.classList.remove("mc-c1", "mc-c2"); p.style.removeProperty("--mc-z");
    const lim = limit(sh), top = sh.getBoundingClientRect().top;
    const hold = () => { const l = $("scLoot"); return l && l.classList.contains("mc-hold") ? l.scrollHeight + 5 : 0; };   // botin que aparecera al llegar a la meta
    const need = () => top + led.offsetHeight + hold() + p.scrollHeight + 3;
    if (need() <= lim) return;
    sh.classList.add("mc-c1"); if (need() <= lim) return;
    sh.classList.add("mc-c2"); if (need() <= lim) return;
    const room = lim - top - led.offsetHeight - hold() - 3, k = Math.max(0.55, Math.min(1, room / Math.max(1, p.scrollHeight)));
    p.style.setProperty("--mc-z", k.toFixed(3));
  }
  M.fit = fit;
  /* v0.2.15: la hoja del ticket (ventana estrecha o baja: #dlg.side, sin marcador al lado). Cabe entera sin desplazarse (antes se recortaba por
     dentro y dejaba fuera el total y el boton): primero se aprieta (sc1, sc2) y, si aun no cabe, se encoge. sheetRect: su sitio sin la animacion de
     entrada, para que el encuadre del mapa y el crupier no la pisen */
  M.sheetRect = () => {
    const d = $("dlg"); if (M.docked() || !d || !d.classList.contains("side") || !document.body.classList.contains("tk-on") || !d.offsetWidth) return null;
    const pr = (d.offsetParent || document.body).getBoundingClientRect(), left = pr.left + d.offsetLeft, top = pr.top + d.offsetTop;
    return { left, top, right: left + d.offsetWidth, bottom: top + d.offsetHeight, width: d.offsetWidth, height: d.offsetHeight };
  };
  /* lo que el crupier no debe pisar: el ticket pegado al marcador (escritorio) o la hoja (ventana estrecha) */
  M.avoidRect = () => (M.docked() ? (isOpen ? M.finalRect() : null) : M.sheetRect());
  M.fitSheet = () => {
    const d = $("dlg"), t = d && d.firstElementChild; if (M.docked() || !t || !d.classList.contains("side") || !t.classList.contains("ticket")) return;
    d.classList.remove("sc1", "sc2"); t.style.removeProperty("zoom");
    const fits = () => d.scrollHeight <= d.clientHeight + 1;
    if (!fits()) d.classList.add("sc1");
    if (!fits()) d.classList.add("sc2");
    if (!fits()) { let k = Math.max(0.55, d.clientHeight / d.scrollHeight); for (let i = 0; i < 4; i++) { t.style.zoom = k.toFixed(3); if (fits() || k <= 0.55) break; k = Math.max(0.55, k * 0.97); } }
    if (A.dealer && A.dealer.refit) A.dealer.refit();                        // el crupier se recoloca a su lado (js/dealer.js)
  };
  addEventListener("resize", () => { if (!M.docked()) M.fitSheet(); });
  /* v0.2.15: rectangulo FINAL del marcador con el ticket desplegado (el encuadre del mapa lo esquiva aunque el ticket aun este saliendo de la ranura) */
  M.finalRect = () => {
    const sh = shell(); if (!sh) return null; const r = sh.getBoundingClientRect();
    if (!isOpen || !M.docked()) return r;
    const h = $("ledger").offsetHeight + paper().scrollHeight + 3, w = mcW();
    return { left: r.right - w, right: r.right, top: r.top, bottom: r.top + h, width: w, height: h };
  };
  /* la ventana pasa de escritorio a movil con el ticket abierto: se lleva a la hoja inferior de siempre (y al reves solo se reajusta) */
  addEventListener("resize", () => {
    if (!isOpen) return;
    if (M.docked()) return fit();
    const sheet = paper().firstElementChild, d = $("dlg"), sh = shell(); if (!sheet) return M.close(true);
    isOpen = false; gen++; document.body.classList.remove("mc-on");
    d.className = "side in"; d.replaceChildren(sheet); $("layer").classList.remove("hidden"); document.body.classList.add("tk-on");
    sh.classList.remove("mc-live", "mc-c1", "mc-c2", "mc-open"); sh.style.width = ""; paper().style.removeProperty("--mc-z");
    sheet.style.removeProperty("zoom"); M.fitSheet();                         // ya en la hoja: que quepa entera
  });
  { const n = $("note"); if (n && window.ResizeObserver) new ResizeObserver(() => { if (isOpen) fit(); }).observe(n); }

  /* ---------------------------------------------------------------- el cobro: los puntos del ticket suben al marcador */
  function clearFx() {
    document.querySelectorAll(".mc-chip, .mc-plus, .mc-stamp").forEach(e => e.remove());   // (el ticket que cae, .mc-drop, se va solo)
    const l = $("scLoot"); if (l) l.classList.remove("mc-hold");
  }
  /* inversa de la curva de la barra (cubic-bezier .2,.8,.2,1): en que momento de su recorrido pasa por la fraccion f */
  const bez = (p1, p2) => t => 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  const BX = bez(0.2, 0.2), BY = bez(0.8, 1);
  const tAt = f => { if (f <= 0) return 0; if (f >= 1) return 1; let a = 0, b = 1; for (let i = 0; i < 22; i++) { const m = (a + b) / 2; BY(m) < f ? (a = m) : (b = m); } return BX((a + b) / 2); };

  /* fichas de pixel que salen del TOTAL del ticket y caen en las cifras del marcador; cada una le da un toque */
  function chips(n, t0, span) {
    const app = $("app"); if (!app) return;
    for (let k = 0; k < n; k++) later(() => {
      const f = $("totNum"), g = $("scLevel"); if (!f || !g) return;
      const ar = app.getBoundingClientRect(), a = f.getBoundingClientRect(), b = g.getBoundingClientRect(); if (!a.width || !b.width) return;
      const x0 = a.left + a.width * (0.2 + Math.random() * 0.75) - ar.left, y0 = a.top + a.height * 0.5 - ar.top;
      const x1 = b.left + b.width * (0.25 + Math.random() * 0.55) - ar.left, y1 = b.top + b.height * 0.55 - ar.top;
      const c = document.createElement("i"); c.className = "mc-chip" + (k % 4 === 3 ? " g" : "");
      c.style.left = Math.round(x0) + "px"; c.style.top = Math.round(y0) + "px"; app.appendChild(c);
      const dx = x1 - x0, dy = y1 - y0, bow = (Math.random() - 0.5) * 80;
      const an = c.animate([
        { transform: "translate(0, 0) scale(.4)", opacity: 0 },
        { transform: `translate(${dx * 0.18 + bow}px, ${dy * 0.3}px) scale(1.2)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${dx}px, ${dy}px) scale(.7)`, opacity: 1 },
      ], { duration: 440, easing: "cubic-bezier(.5, 0, .75, .6)", fill: "forwards" });
      an.onfinish = () => { c.remove(); const s = $("scLevel"); if (s) s.animate([{ transform: "scale(1.08)" }, { transform: "none" }], { duration: 150, easing: "ease-out" }); };
      setTimeout(() => c.remove(), 1000);
    }, t0 + (span * k) / Math.max(1, n - 1));
  }

  /* datos (desde reveal en game.js): { from, to, total, advance, runTotal, delay, ms, gauge, lootOn }
     delay/ms: cuando empieza y cuanto dura el rodar del TOTAL del ticket (las cifras del marcador van al mismo compas); gauge: lo que tarda la barra */
  M.cashIn = o => {
    const { from, to, total, advance, runTotal = 0, delay = 700, ms = 1100, gauge = 450, lootOn = false } = o;
    if (!(to > from)) return;
    const led = $("ledger"), num = $("scLevel"), bar = $("scBar"), mark = $("scMark"), tot = $("scTotal"), loot = $("scLoot"), moving = !still();
    /* el TOTAL de la partida sube cuando llega el dinero, no antes */
    if (tot) { const fin = tot.textContent; tot.textContent = A.fmt(runTotal + from); later(() => { tot.textContent = fin; if (moving) tot.animate([{ transform: "translateY(-3px)", color: "#2f7bf5" }, { transform: "none" }], { duration: 380, easing: "ease-out" }); }, delay + ms); }
    if (moving && led && num) {
      /* "+1.473" que asoma junto a las cifras */
      later(() => {
        const pl = document.createElement("b"); pl.className = "mc-plus"; pl.textContent = "+" + A.fmt(total);
        pl.style.left = num.offsetLeft + num.offsetWidth + 10 + "px"; pl.style.top = num.offsetTop + Math.round(num.offsetHeight * 0.12) + "px";
        led.appendChild(pl); setTimeout(() => pl.remove(), 1400);
      }, delay);
      chips(Math.max(3, Math.min(14, Math.round(total / 140))), delay + 40, Math.min(620, ms * 0.55));
      /* golpe final cuando las cifras terminan de rodar */
      later(() => num.animate([{ transform: "scale(1)" }, { transform: "scale(1.16)", color: "#2f7bf5", offset: 0.3 }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.3, 1.5, .5, 1)" }), delay + ms);
    }

    /* meta y escalones de botin que cruza este cobro: cada uno con su golpe y en orden, en cuanto la barra llega */
    const ev = [], lootOk = lootOn && A.adv && A.adv.loot && advance > 1;
    if (advance > 1 && from < advance && to >= advance) ev.push({ goal: true });
    if (lootOk) { const m0 = A.adv.loot(from, advance).margin, m1 = A.adv.loot(to, advance).margin; for (let k = m0 + 1; k <= m1; k++) ev.push({ step: k }); }
    if (!ev.length) return;
    const goal = !!ev[0].goal;
    if (goal) {
      if (bar) bar.classList.remove("done");                     // se pone verde cuando la barra toca la marca, no antes
      if (loot && !loot.classList.contains("hidden")) { loot.classList.add("mc-hold"); fit(); }
    }
    const at0 = delay + (goal ? gauge : Math.round(gauge * tAt((A.adv.loot(from, advance).next - from) / Math.max(1, to - from))));
    ev.forEach((e, i) => later(() => {
      if (e.goal) {
        if (bar) { bar.classList.add("done"); if (moving) bar.animate([{ filter: "brightness(1.9)" }, { filter: "none" }], { duration: 520, easing: "ease-out" }); }
        if (mark && moving) mark.animate([{ transform: "none" }, { transform: "scale(2.2, 1.9)", background: "#4bc292", offset: 0.35 }, { transform: "none" }], { duration: 480, easing: "ease-out" });
        if (led) { const st = document.createElement("b"); st.className = "mc-stamp"; st.textContent = A.pick6("¡META!|TARGET HIT!|OBJECTIF !|META!|ZIEL!|TRAGUARDO!||达标！|목표 달성!|目標達成！|ЦЕЛЬ ВЗЯТА!|CEL!"); led.appendChild(st); }
        if (loot) loot.classList.remove("mc-hold");
        if (A.sfx.goal) A.sfx.goal(); buzz([40, 50, 40, 50, 110]);   // la firma del juego (sol-do-re) y tres pulsos, el ultimo largo
      } else {
        const b = loot && loot.querySelector("b");
        if (b && moving) b.animate([{ transform: "scale(1)" }, { transform: "scale(1.5)", color: "#b3322a", offset: 0.35 }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.3, 1.6, .5, 1)" });
        if (A.sfx.lootStep) A.sfx.lootStep(e.step); buzz(25 + Math.min(4, e.step) * 18);   // un pulso por escalon, cada uno mas largo
      }
    }, at0 + i * 150));
  };
})(window.AIQ);
