/*
 * Geolite - COSAS CON LAS QUE JUGAR (v0.3.202 · Bloque F, paso 5, votado el 23-oct). Se descubren solas: sin flechas ni avisos.
 *
 *  - EL SELLO, EN SU SITIO (veredicto): un clic en el sello del ticket lo vuelve a golpear en el mismo sitio: mas tinta y un leve doble borde,
 *    el ticket da un respingo. Secreto: el sexto golpe sale sin tinta y el crupier se rie.
 *  - CARA O CRUZ (Campamento): un clic en el doblon del contador lo hace bailar sobre la mesa; se frena y cae de cara (el crupier) o de cruz.
 *    Secreto: 1 de cada 60 veces se queda de canto.
 *  Las lamparas que se mecen estan en js/escena.js (mece) y las caricias a Comodin en js/comodin.js.
 *  Con Movimiento minimo: el sello sin respingo y el doblon cae enseguida, sin bailar.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const quieto = () => document.documentElement.classList.contains("reduce-motion");
  const t6 = s => (A.pick6 ? A.pick6(s) : s.split("|")[0]);
  const habla = (txt, face, ms) => { if (A.dealer && A.dealer.say && !(A.dealer.sacred && A.dealer.sacred())) A.dealer.say(t6(txt), { mood: face, face, hold: ms }); };   // por la cola de siempre: si ya no esta en su pantalla, no sale
  const secreto = () => { if (A.sfx && A.sfx.lootStep) A.sfx.lootStep(2); };

  /* ================================================================ el sello, en su sitio */
  const SIN_TINTA = {
    win: "Se acabó la tinta. Ya está más que superada.|Out of ink. It's more than cleared already.|Plus d'encre. Elle est plus que réussie.|Acabou a tinta. Já está mais que superada.|Die Tinte ist alle. Mehr als geschafft.|Inchiostro finito. È più che superata.||墨水用完了。早就过关了。|잉크 다 떨어졌어. 이미 통과하고도 남았어.|インク切れだ。もう十分すぎるほどクリアだよ。|Чернила кончились. Раунд пройден с лихвой.|Skończył się tusz. Runda jest aż nadto zaliczona.",
    lose: "Se acabó la tinta. Y no por sellarla más se arregla.|Out of ink. Stamping it again won't fix it.|Plus d'encre. Tamponner encore n'y changera rien.|Acabou a tinta. Carimbar de novo não resolve.|Die Tinte ist alle. Nochmal stempeln ändert nichts.|Inchiostro finito. Timbrarla ancora non la aggiusta.||墨水用完了。再盖也救不回来。|잉크 다 떨어졌어. 더 찍는다고 달라지진 않아.|インク切れだ。何度押しても結果は変わらないぞ。|Чернила кончились. Сколько ни штампуй, не поможет.|Skończył się tusz. Kolejne pieczątki nic nie zmienią.",
  };
  let sellos = 0, deQuien = null;
  document.addEventListener("pointerdown", e => {
    const st = e.target && e.target.closest ? e.target.closest(".gx-vd .gx-vd-stamp:not(.re)") : null; if (!st || e.button > 0) return;
    e.preventDefault(); sella(st);
  }, true);
  function sella(st) {
    const vd = st.closest(".gx-vd"); if (vd !== deQuien) { deQuien = vd; sellos = 0; }
    sellos++; const r = st.getBoundingClientRect(), x = r.left + r.width / 2, tk = st.closest(".gx-vd-ticket") || st.parentElement, full = !quieto();
    const salto = (px, ms) => { if (full && tk) tk.animate([{ transform: `translateY(${px}px)` }, { transform: "none" }], { duration: ms, easing: "steps(2, end)" }); };
    if (sellos > 5) {                                                   // sin tinta: el golpe en seco, mas grave
      if (A.juguete) A.juguete("sello", { x, db: -9, rate: 0.85 }); salto(2, 90);
      if (sellos === 6) { secreto(); habla(st.classList.contains("no") ? SIN_TINTA.lose : SIN_TINTA.win, "laugh", 3600); }
      return;
    }
    if (A.juguete) A.juguete("sello", { x }); salto(3, 110);
    /* el mismo sello, golpeado otra vez: casi en su sitio, mas tinta y un leve doble borde */
    const host = st.offsetParent || st.parentElement, c = st.cloneNode(true), dx = (Math.random() - 0.5) * 7, dy = (Math.random() - 0.5) * 6, rot = (Math.random() - 0.5) * 3;
    const op = [0.42, 0.34, 0.28, 0.22, 0.18][sellos - 1], base = getComputedStyle(st).transform, tr = `${base === "none" ? "" : base} translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
    c.classList.add("re"); c.removeAttribute("id"); c.setAttribute("aria-hidden", "true");
    Object.assign(c.style, { position: "absolute", left: st.offsetLeft + "px", top: st.offsetTop + "px", width: st.offsetWidth + "px", height: st.offsetHeight + "px", margin: "0", boxSizing: "border-box", opacity: String(op), transform: tr });
    host.appendChild(c);
    if (full) c.animate([{ transform: tr + " scale(1.5)", opacity: 0 }, { transform: tr + " scale(.95)", opacity: op, offset: 0.6 }, { transform: tr, opacity: op }], { duration: 160, easing: "steps(3, end)" });
  }

  /* ================================================================ cara o cruz con el doblon del Campamento */
  let lanzando = false;
  document.addEventListener("pointerdown", e => {
    const b = e.target && e.target.closest ? e.target.closest(".gx-camp .tb-coins") : null; if (!b || e.button > 0) return;
    lanza(b);
  }, true);
  function lanza(box) {
    if (lanzando) return; const ic = box.querySelector(".ic, svg, img"); if (!ic) return; lanzando = true;
    const r = ic.getBoundingClientRect(), cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2), full = !quieto();
    const k = Math.min(innerWidth / 1280, innerHeight / 720), s = Math.max(1, Math.round(k * 2 / 3)), S = 96 * s;   // el doblon de 24 fotogramas, a su escala entera (x1 en 1080p)
    const deCanto = Math.random() < 1 / 60, cruz = Math.random() < 0.5;
    const fx = document.createElement("i"); fx.className = "dob-fx"; fx.setAttribute("aria-hidden", "true");
    Object.assign(fx.style, { left: cx - S / 2 + "px", top: cy - S / 2 + "px", width: S + "px", height: S + "px", backgroundSize: 24 * S + "px " + S + "px" });
    document.body.appendChild(fx); ic.style.visibility = "hidden";
    if (A.juguete) { A.juguete("moneda_lanza", { x: cx, db: -4 }); A.juguete("moneda_ping", { x: cx, db: -10, delay: 120 }); }
    const dur = full ? 1800 : 260, t0 = performance.now(), vueltas = full ? 7 + Math.floor(Math.random() * 3) : 0, F = vueltas * 24 + (deCanto ? 6 : cruz ? 12 : 0);
    const acaba = () => { fx.remove(); ic.style.visibility = ""; lanzando = false; };
    const paso = now => {
      if (!fx.isConnected) { ic.style.visibility = ""; lanzando = false; return; }
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 2.2), frame = Math.floor(e * F) % 24;
      fx.style.backgroundPosition = -frame * S + "px 0";
      if (p < 1) { requestAnimationFrame(paso); return; }
      if (A.juguete) A.juguete("moneda_cae", { x: cx });
      if (deCanto) {                                                     // secreto: de canto
        fx.classList.add("canto"); Object.assign(fx.style, { left: cx - 12 * s + "px", width: 24 * s + "px", backgroundSize: 24 * s + "px " + S + "px", backgroundPosition: "0 0" });
        if (A.juguete) A.juguete("moneda_ping", { x: cx }); secreto();
        setTimeout(() => { if (!fx.isConnected) return; fx.classList.remove("canto"); Object.assign(fx.style, { left: cx - S / 2 + "px", width: S + "px", backgroundSize: 24 * S + "px " + S + "px", backgroundPosition: "0 0" }); if (A.juguete) A.juguete("moneda_cae", { x: cx, db: -6 }); setTimeout(acaba, 500); }, 2600);
      } else setTimeout(acaba, 900);
    };
    requestAnimationFrame(paso);
  }
  /* si el Campamento se va con el doblon en el aire, se va con el */
  new MutationObserver(() => { if (!document.querySelector(".gx-camp")) document.querySelectorAll(".dob-fx").forEach(e => e.remove()); }).observe(document.getElementById("layer") || document.body, { childList: true, subtree: false });

  A.juguetes = { sella: () => { const st = document.querySelector(".gx-vd .gx-vd-stamp:not(.re)"); if (st) sella(st); }, lanza: () => { const b = document.querySelector(".gx-camp .tb-coins"); if (b) lanza(b); } };
})(window.AIQ);
