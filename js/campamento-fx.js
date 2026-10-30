/*
 * Geolite - EL CAMPAMENTO SE SIENTE (v0.3.24x · paquete «Campamento y casino» del Probador, votado SI en Extrema). Tres piezas de la tienda:
 *   sobre(tb)        las cartas llegan del mazo boca abajo (el dorso de la casa, pixel art por codigo a celdas de un pixel de arte) y se voltean
 *                    en cadena con giro en perspectiva y una luz que cruza la cara; la de mayor rareza va la ultima, espera un instante y voltea con
 *                    el canto de su color (y, la epica y la legendaria, su luz sobre el tapete). Un clic en las cartas las voltea todas de golpe.
 *   rodillos(el)     el contador de doblones cuenta con tambores de laton grabados (cifras de 7x11 pixeles de arte) que giran una unidad cada vez,
 *                    con su tic, y se asientan pasandose un pelo. La cifra de verdad sigue en el <b> (oculto): quien la escriba, la hace girar.
 *   saldo(tb)        la lampara que cuelga sobre la mesa sigue a tus doblones: pobre, alta y fria (luz pareja, nunca castigo); rica, baja y calida,
 *                    con el laton de los marcos brillando. Al cambiar de altura se mece y la luz la sigue con inercia.
 * Todo vive SOBRE las piezas (nada salta ni flota), sin luces alrededor de los botones, a escala entera. Movimiento minimo: sin reparto ni volteo,
 * la cifra cambia seca y la lampara no se mece (la luz si sigue al saldo). Luces de la sala apagadas: sin lampara del saldo.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const H = () => document.documentElement.classList;
  const quieto = () => H().contains("reduce-motion");
  const son = (k, ...a) => { try { if (A.sfx && A.sfx[k]) A.sfx[k](...a); } catch (e) { /* audio no listo */ } };
  const zoomDe = el => { const r = el.getBoundingClientRect(); return (el.offsetWidth ? r.width / el.offsetWidth : 1) || 1; };
  const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  /* ================================================================ 1. EL SOBRE */
  /* la rareza de cada carta de la mesa: 0 comun (y herramientas y provisiones), 1 rara, 2 epica, 3 legendaria */
  const rarDe = el => { const c = el.classList; if (c.contains("otool") || c.contains("life")) return 0; return c.contains("r3") ? 3 : c.contains("r2") ? 2 : c.contains("r1") ? 1 : 0; };
  /* el color de cada rareza (rampa de geolite40): medio y claro */
  const RC = [null, ["#1689fb", "#7ac8ff"], ["#6e40c4", "#9c7ce6"], ["#f5a623", "#fdd742"]];
  /* el dorso de la casa: fieltro verde a rayas de 45 grados, filo de laton, y en el centro el rombo de laton con la ficha roja de la casa.
     Pintado a la medida exacta en pixeles del dispositivo, con un pixel de arte entero (cel) y simetrico: contado desde el centro */
  const DORSOS = new Map();
  function dorso(w, h, cel) {
    const key = w + "x" + h + ":" + cel; if (DORSOS.has(key)) return DORSOS.get(key);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const g = cv.getContext("2d"), aw = Math.floor(w / cel), ah = Math.floor(h / cel), ox = Math.floor((w - aw * cel) / 2), oy = Math.floor((h - ah * cel) / 2);
    const P = (x, y, c) => { g.fillStyle = "#" + c; g.fillRect(ox + x * cel, oy + y * cel, cel, cel); };
    g.fillStyle = "#1d0a3d"; g.fillRect(0, 0, w, h);
    const cx = (aw - 1) / 2, cy = (ah - 1) / 2;
    for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
      const e = Math.min(x, y, aw - 1 - x, ah - 1 - y); let c;
      if (e === 0) c = "1d0a3d";
      else if (e === 1) c = "c46a1b";
      else if (e === 2) c = y < ah / 2 && x < aw - 3 ? "fdd742" : "f5a623";
      else if (e === 3) c = "6e3414";
      else if (e === 4) c = "1d0a3d";
      else {
        const sx = Math.abs(x - cx), sy = Math.abs(y - cy), s = ((Math.round(sx + sy)) % 5 + 5) % 5;   // rayas en espejo desde el centro
        c = s < 2 ? "136b3e" : "0e4f30";
        if (e === 5) c = "0a3a24";
        if (e === 8 && (x + y) % 2 === 0) c = "c46a1b";
      }
      P(x, y, c);
    }
    const R = Math.min(22, Math.floor(aw / 4.2)), rc = R * 0.66;
    for (let py = 0; py < ah; py++) for (let px = 0; px < aw; px++) {
      const x = px - cx, y = py - cy, d = Math.abs(x) + Math.abs(y);
      if (d > R + 2.5) continue;
      let c;
      if (d > R + 1.5) c = "1d0a3d"; else if (d > R + 0.5) c = y < 0 ? "fdd742" : "c46a1b"; else if (d > R - 0.5) c = "6e3414";
      else {
        const rr = Math.hypot(x, y), ang = Math.atan2(Math.abs(y), Math.abs(x));
        if (rr > rc + 1) c = "0a3a24";
        else if (rr > rc) c = "1d0a3d";
        else if (rr > rc - 2.2) { const seg = ((ang / (Math.PI / 4)) % 1 + 1) % 1; c = Math.abs(seg - 0.5) < 0.22 ? "f3f0fa" : "a8142e"; }
        else if (rr > rc - 3.2) c = "1d0a3d";
        else if (rr > rc - 4.4) c = "e8283a";
        else c = x + y < -rc * 0.5 ? "ff6b5e" : "e8283a";
        if (rr < 3.3) c = rr < 1.6 ? "fff3b0" : "fdd742";
      }
      P(px, py, c);
    }
    for (const [qx, qy] of [[9, 9], [aw - 10, 9], [9, ah - 10], [aw - 10, ah - 10]])
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { const d = Math.abs(x) + Math.abs(y); if (d <= 2) P(qx + x, qy + y, d === 2 ? "1d0a3d" : d === 1 ? "f5a623" : "fff3b0"); }
    const url = cv.toDataURL("image/png");                               // una imagen en cache: crear un lienzo por carta en cada reparto costaba fotogramas
    if (DORSOS.size > 12) DORSOS.delete(DORSOS.keys().next().value);
    DORSOS.set(key, url); return url;
  }
  /* Extrema: 150 ms entre cartas, 420 ms de suspense para la rara, luz que cruza 0,9, canto 1, luz en el tapete 0,9 */
  const SB = { ritmo: 150, suspense: 420, llega: 300, paso: 70, salida: 420, vuelta: 220, vueltaS: 340, luz: 0.9, canto: 1, charco: 0.9 };
  const OUT3 = "cubic-bezier(.33, 1, .68, 1)", IN = "cubic-bezier(.55, 0, .9, .45)", OUTF = "cubic-bezier(.1, .55, .45, 1)", IO = "cubic-bezier(.45, 0, .55, 1)";
  let sobreVivo = null;
  function sobre(tb) {
    if (sobreVivo) sobreVivo.fin();
    if (!tb || quieto()) return;
    const offers = tb.querySelector(".offers"), cards = offers ? [...offers.querySelectorAll(":scope > .offer.pc:not(.sold)")] : [];
    if (cards.length < 1) return;
    const deck = tb.querySelector(".tb-deck .tb-dk") || tb.querySelector(".tb-deck"), d = devicePixelRatio || 1;
    const z = zoomDe(cards[0]), dr = deck ? deck.getBoundingClientRect() : null;
    const rars = cards.map(rarDe), top = Math.max(...rars), star = top >= 1 ? rars.indexOf(top) : -1;
    const order = cards.map((_, i) => i).filter(i => i !== star); if (star >= 0) order.push(star);
    const sus = star >= 0 ? SB.suspense : 0, anims = [], timers = [], extra = [];
    let vivo = true;
    tb.classList.add("sb-on");
    const at = (ms, fn) => timers.push(setTimeout(() => { if (vivo && tb.isConnected) fn(); }, ms));
    const fin = () => {
      if (!vivo) return; vivo = false; sobreVivo = null;
      timers.forEach(clearTimeout); anims.forEach(a => { try { a.cancel(); } catch (e) { /* ya acabo */ } });
      cards.forEach(c => { c.classList.remove("sb-down", "sb-gira"); c.querySelectorAll(":scope > .sb-dorso, :scope > .sb-luz, :scope > .sb-canto").forEach(x => x.remove()); });
      extra.forEach(x => x.remove()); tb.classList.remove("sb-on"); tb.classList.add("sb-fin");   // sb-fin: sin sb-on la animacion cp-deal volvia a aplicarse y las cartas se repartian por segunda vez
      offers.removeEventListener("click", salta, true); offers.removeEventListener("pointerdown", traga, true);
    };
    /* mientras se reparten, el primer clic sobre las cartas las voltea todas (y no compra a ciegas) */
    const salta = e => { e.preventDefault(); e.stopPropagation(); fin(); };
    const traga = e => { e.stopPropagation(); };
    offers.addEventListener("click", salta, true); offers.addEventListener("pointerdown", traga, true);
    const total = SB.salida + (order.length - 1) * SB.ritmo + sus + (star >= 0 ? SB.vueltaS : SB.vuelta) + (star >= 0 ? 1600 : 120);
    at(total, fin);
    sobreVivo = { fin };
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect(), w = c.offsetWidth, h = c.offsetHeight, isS = i === star;
      /* el dorso (y encima la luz y, en la mejor, el canto de su color) */
      const W = Math.max(2, Math.round(w * z * d)), Hh = Math.max(2, Math.round(h * z * d)), cel = Math.max(2, Math.round(2 * z * d));
      const back = document.createElement("i"); back.className = "sb-dorso"; back.setAttribute("aria-hidden", "true");
      back.style.backgroundImage = `url(${dorso(W, Hh, cel)})`;
      const luz = document.createElement("i"); luz.className = "sb-luz"; luz.setAttribute("aria-hidden", "true");
      if (isS && rars[i] >= 1) luz.style.setProperty("--sbc", RC[rars[i]][1]);
      c.append(back, luz); c.classList.add("sb-down");
      /* llega del mazo: de su tamano al de la carta, girada y con un pequeno arco */
      if (dr) {
        const dx = (dr.left + dr.width / 2 - (r.left + r.width / 2)) / z, dy = (dr.top + dr.height / 2 - (r.top + r.height / 2)) / z, s0 = Math.max(0.2, Math.min(1, dr.width / r.width));
        anims.push(c.animate([
          { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(-12.6deg) scale(${s0.toFixed(3)})`, opacity: 0 },
          { opacity: 1, offset: 0.25 },
          { transform: `translate(${(dx * 0.32).toFixed(1)}px, ${(dy * 0.32 - 10).toFixed(1)}px) rotate(-4deg) scale(1.03)`, offset: 0.6 },
          { transform: "none", opacity: 1 }], { duration: SB.llega, delay: i * SB.paso, easing: OUT3, fill: "backwards" }));
        at(i * SB.paso, () => son("card", (r.left / innerWidth) * 2 - 1));
      }
    });
    /* el volteo: media vuelta enseñando el dorso, cambio de cara de canto, y la otra media enseñando la carta; la luz cruza en las dos mitades */
    order.forEach((i, k) => {
      const c = cards[i], isS = i === star, t = SB.salida + k * SB.ritmo + (isS ? sus : 0), dur = isS ? SB.vueltaS : SB.vuelta, half = dur / 2, lift = isS ? 1 : 0.55;
      const P = "perspective(1130px) ";
      at(t, () => {
        c.classList.add("sb-gira");
        son("camVuelta", isS ? 1 : 0, k);
        anims.push(c.animate([{ transform: P + "rotateY(0deg) scale(1)" }, { transform: P + `rotateY(-90deg) scale(${(1 + 0.06 * lift).toFixed(3)})` }], { duration: half, easing: isS ? IO : IN, fill: "forwards" }));
        const L = c.querySelector(":scope > .sb-luz");
        if (L) { anims.push(L.animate([{ opacity: 0 }, { opacity: SB.luz, offset: 0.5 }, { opacity: 0 }], { duration: dur, easing: "linear", fill: "forwards" }));   // la franja cruza con transform (compuesto, sin repintar)
          anims.push(L.animate([{ transform: "translateX(-25%)" }, { transform: "translateX(25%)" }], { duration: dur, easing: "linear", fill: "forwards", pseudoElement: "::before" })); }
      });
      at(t + half, () => {
        c.classList.remove("sb-down"); const b = c.querySelector(":scope > .sb-dorso"); if (b) b.remove();
        anims.push(c.animate([{ transform: P + `rotateY(90deg) scale(${(1 + 0.06 * lift).toFixed(3)})` }, { transform: P + "rotateY(0deg) scale(1)" }], { duration: half, easing: isS ? IO : OUTF, fill: "forwards" }));
      });
      at(t + dur, () => { c.classList.remove("sb-gira"); const L = c.querySelector(":scope > .sb-luz"); if (L) L.remove(); if (!isS) return;
        /* la mejor: su canto se enciende de su color y se apaga en 1,6 s; la epica y la legendaria, con su luz sobre el tapete. Suena su rareza */
        const lv = rars[i], col = RC[lv], ka = SB.canto * (0.6 + 0.4 * (lv / 3));
        const cn = document.createElement("i"); cn.className = "sb-canto"; cn.setAttribute("aria-hidden", "true"); cn.style.setProperty("--sb1", col[0]); cn.style.setProperty("--sb2", col[1]); c.appendChild(cn);
        anims.push(cn.animate([{ opacity: ka }, { opacity: ka * 0.07 }], { duration: 1600, easing: "cubic-bezier(.2, .55, .35, 1)", fill: "forwards" }));
        if (lv >= 2) {
          const ch = document.createElement("i"); ch.className = "sb-charco"; ch.setAttribute("aria-hidden", "true"); ch.style.setProperty("--sb2", col[1]);
          Object.assign(ch.style, { left: c.offsetLeft + "px", top: c.offsetTop + "px", width: c.offsetWidth + "px", height: c.offsetHeight + "px" });
          offers.insertBefore(ch, offers.firstChild); extra.push(ch);
          anims.push(ch.animate([{ opacity: SB.charco }, { opacity: 0 }], { duration: 1600, easing: "cubic-bezier(.2, .55, .35, 1)", fill: "forwards" }));
        }
        son("camRaro", lv); if (lv === 3) son("jackpot", 2);
        if (lv >= 2 && A.casa && A.casa.impacto) A.casa.impacto(lv - 1);
        if (A.haptic && A.haptic.dual) { if (lv === 3) A.haptic.dual(0.55, 0.35, 320); else if (lv === 2) A.haptic.dual(0.25, 0.2, 160); }
      });
    });
  }

  /* ================================================================ 2. LOS RODILLOS DE LATON */
  /* las cifras: 7x11 pixeles de arte, trazo de 2 */
  const DIG = [
    [".#####.", "##...##", "##...##", "##...##", "##...##", "##...##", "##...##", "##...##", "##...##", "##...##", ".#####."],
    ["..##...", ".###...", "####...", "..##...", "..##...", "..##...", "..##...", "..##...", "..##...", "..##...", "######."],
    [".#####.", "##...##", ".....##", ".....##", "....##.", "...##..", "..##...", ".##....", "##.....", "##.....", "#######"],
    [".#####.", "##...##", ".....##", ".....##", "..####.", ".....##", ".....##", ".....##", ".....##", "##...##", ".#####."],
    ["....##.", "...###.", "..####.", ".##.##.", "##..##.", "##..##.", "#######", "....##.", "....##.", "....##.", "....##."],
    ["#######", "##.....", "##.....", "######.", ".....##", ".....##", ".....##", ".....##", ".....##", "##...##", ".#####."],
    [".#####.", "##...##", "##.....", "##.....", "######.", "##...##", "##...##", "##...##", "##...##", "##...##", ".#####."],
    ["#######", ".....##", ".....##", "....##.", "....##.", "...##..", "...##..", "..##...", "..##...", "..##...", "..##..."],
    [".#####.", "##...##", "##...##", "##...##", ".#####.", "##...##", "##...##", "##...##", "##...##", "##...##", ".#####."],
    [".#####.", "##...##", "##...##", "##...##", "##...##", ".######", ".....##", ".....##", ".....##", "##...##", ".#####."],
  ];
  /* la tira: 10 cifras de 16 filas (11 de cifra + 5 de aire), 7 columnas. 1 = trazo, 2 = la luz bajo el grabado */
  const TIRA = (() => {
    const t = new Uint8Array(160 * 7), on = (k, x, y) => y >= 0 && y < 11 && DIG[k][y][x] === "#";
    for (let k = 0; k < 10; k++) for (let y = 0; y < 16; y++) for (let x = 0; x < 7; x++) { const gy = y - 2; t[(k * 16 + y) * 7 + x] = on(k, x, gy) ? 1 : on(k, x, gy - 1) ? 2 : 0; }
    return t;
  })();
  const LAT = ["#3c240a", "#6e3414", "#c46a1b", "#f5a623", "#fdd742"], INK = "#12062a", SOMBRA = "rgba(5, 12, 8, .55)";
  /* Extrema: 110 ms por unidad, tope de 2 s, golpe al asentarse 0,3, tic a 0,9 */
  const RD = { paso: 0.11, total: 2.0, rebote: 0.3, tic: 0.9 };
  const R = { el: null, b: null, cv: null, g: null, mo: null, key: null, shown: 0, from: 0, target: 0, steps: 0, st: 0, dur: 0.08, sign: 1, tics: 0, settle: -1, sdir: 1, glint: 0, raf: 0, last: 0, n: 2, cel: 2, z: 1 };
  const nDig = v => Math.max(2, String(Math.max(0, Math.floor(v))).length);
  /* la posicion de cada tambor (0 = unidades) para un valor continuo: el de arriba solo gira cuando todos los de abajo pasan de 9 a 0 */
  function posDe(v, i) {
    const p = Math.pow(10, i), lower = ((v % p) + p) % p, carry = i === 0 ? v - Math.floor(v) : Math.max(0, lower - (p - 1));
    return ((Math.floor(v / p) % 10) + carry + 10) % 10;
  }
  function pintaRodillos(jolt) {
    const { g, cv, cel, n } = R; if (!g) return;
    const AW = 1 + 10 * n, AH = 18;
    g.clearRect(0, 0, cv.width, cv.height);
    const P = (x, y, c) => { g.fillStyle = c; g.fillRect(x * cel, (y + jolt) * cel, cel, cel); };
    /* la sombra de la pieza, detras y abajo a la derecha (la lampara del Campamento cae de arriba a la izquierda) */
    g.fillStyle = SOMBRA; g.fillRect(cel, (AH + jolt) * cel, AW * cel, cel); g.fillRect(AW * cel, (1 + jolt) * cel, cel, AH * cel);
    const v = R.shown;
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
      const m = x % 10;                                                  // 0 tinta (marco y separador), 1 y 9 bisel, 2..8 tambor
      let c;
      if (y === 0 || y === AH - 1 || m === 0) c = INK;
      else if (y === 1 || y === AH - 2 || m === 1 || m === 9) {
        const hi = (y === 1 && m !== 9) || (m === 1 && y < AH - 2 && y > 1);
        c = y === AH - 2 || m === 9 ? LAT[1] : hi ? LAT[3] : LAT[1];
      } else {
        const di = n - 1 - Math.floor(x / 10), col = m - 2, yy = y - 8.5, Rr = 26, ang = Math.asin(Math.max(-1, Math.min(1, yy / Rr)));
        const row = ((Math.floor(posDe(v, di) * 16 + ang * Rr + 7.5) % 160) + 160) % 160, t = TIRA[row * 7 + col];
        let k = 1.6 + 2.4 * Math.cos(ang * 2.6); if (yy < -5) k -= 0.7;
        let li = Math.max(0, Math.min(4, Math.round(k)));
        if (t === 2) li = Math.min(4, li + 1);
        c = LAT[li];
        if (Math.abs(yy + 2.5) < 0.6 && t !== 1) c = R.glint > 0.45 || li >= 3 ? LAT[4] : LAT[Math.min(4, li + 1)];   // el brillo del laton, una fila, que se aviva al cobrar
        if (t === 1) c = INK;
      }
      P(x, y, c);
    }
  }
  function mideRodillos() {
    const { el, cv } = R; if (!el || !cv) return;
    const z = zoomDe(el), d = devicePixelRatio || 1, cel = Math.max(2, Math.round(2 * z * d)), n = R.n, AW = 1 + 10 * n, AH = 18;
    R.cel = cel; R.z = z;
    const W = (AW + 1) * cel, Hh = (AH + 2) * cel;
    if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; }
    cv.style.width = W / (z * d) + "px"; cv.style.height = Hh / (z * d) + "px";
    pintaRodillos(0); if (saldoOn()) { S.sig = ""; pintaSaldo(); }
  }
  const ticRodillo = i => son("camTic", R.sign, i, RD.tic);
  function bucleRodillos(now) {
    R.raf = 0; if (!R.el || !R.el.isConnected) return;
    const dt = R.last ? Math.min(0.05, (now - R.last) / 1000) : 0.016; R.last = now;
    let jolt = 0, sigue = false;
    if (R.steps > 0) {
      R.st += dt; sigue = true;
      const done = Math.min(R.steps, Math.floor(R.st / R.dur));
      while (R.tics < done) { R.tics++; ticRodillo(R.tics); }
      const fr = Math.min(1, (R.st - done * R.dur) / (R.dur * 0.55)), ef = fr * fr * (3 - 2 * fr);
      R.shown = R.from + R.sign * Math.min(R.steps, done + (done < R.steps ? ef : 0));
      if (done >= R.steps) { R.shown = R.target; R.from = R.target; R.steps = 0; R.settle = 0; R.sdir = R.sign; son("camAsienta"); }
    }
    if (R.settle >= 0) {
      R.settle += dt; sigue = true;
      const k = R.settle / 0.22;
      if (k >= 1) { R.settle = -1; R.shown = R.target; }
      else { R.shown = R.target + R.sdir * RD.rebote * Math.sin(k * Math.PI) * Math.exp(-k * 2.2); jolt = k < 0.35 ? 1 : 0; }
    }
    if (R.glint > 0.01) { R.glint *= Math.pow(0.25, dt); sigue = true; } else R.glint = 0;
    pintaRodillos(jolt);
    if (sigue) R.raf = requestAnimationFrame(bucleRodillos); else R.last = 0;
  }
  function aRodillos(v) {
    if (!isFinite(v)) return; v = Math.max(0, Math.round(v));
    if (saldoOn()) S.goal = v;
    if (v === R.target && !R.steps) { if (R.shown !== v && R.settle < 0) { R.shown = v; pintaRodillos(0); } return; }
    const nn = nDig(Math.max(v, R.shown)); if (nn !== R.n) { R.n = nn; mideRodillos(); }
    if (quieto() || !R.g) { R.target = R.from = R.shown = v; R.steps = 0; R.settle = -1; pintaRodillos(0); saldoTick(); return; }
    const from = R.steps ? Math.round(R.shown) : R.target, n = Math.abs(v - from);
    R.from = from; R.target = v; R.sign = Math.sign(v - from) || 1; R.steps = n; R.st = 0; R.tics = 0; R.settle = -1;
    R.dur = Math.max(0.028, Math.min(RD.paso, RD.total / Math.max(1, n)));
    if (R.sign > 0) R.glint = Math.max(R.glint, Math.min(1, n / 30));
    if (R.sign > 0 && n >= 30 && A.haptic && A.haptic.dual) A.haptic.dual(0.2, 0.35, 500);
    if (!R.raf) R.raf = requestAnimationFrame(bucleRodillos);
    saldoTick();
  }
  /* el contador del Campamento: monta los tambores sobre el <b> de siempre (que sigue ahi, oculto, para quien escriba la cifra y para los lectores
     de pantalla). key: la visita (run.shopKey); en la misma visita, un repintado cuenta desde lo que se veia; en una visita nueva, la cifra ya esta */
  function rodillos(el, key) {
    if (!el) return;
    const b = el.querySelector("b"); if (!b) return;
    const v = parseInt(b.textContent, 10) || 0, same = key != null && key === R.key && R.el;
    if (R.mo) R.mo.disconnect(); if (R.raf) cancelAnimationFrame(R.raf); R.raf = 0; R.last = 0;
    const cv = document.createElement("canvas"); cv.className = "rd-cv"; cv.setAttribute("aria-hidden", "true");
    b.after(cv); el.classList.add("rd-on");
    R.el = el; R.b = b; R.cv = cv; R.g = cv.getContext("2d"); R.key = key;
    if (same) { const s = R.steps ? R.shown : R.target; R.target = R.from = Math.round(s); R.shown = s; R.steps = 0; R.settle = -1; }
    else { R.target = R.from = R.shown = v; R.steps = 0; R.settle = -1; R.glint = 0; }
    R.n = nDig(Math.max(v, R.shown)); mideRodillos();
    R.mo = new MutationObserver(() => aRodillos(parseInt(b.textContent, 10)));
    R.mo.observe(b, { childList: true, characterData: true, subtree: true });
    if (v !== R.target) aRodillos(v);
  }
  const rodillosOn = () => !!(R.el && R.el.isConnected);

  /* ================================================================ 3. LA LAMPARA DEL SALDO */
  /* La luz es la de una lampara puntual (coseno al cubo) a la altura que dicen tus doblones: 0 a 50 doblones, de 2600 a 650 px a 1080p. Se pinta en
     UNA capa encima de la mesa con un degradado radial (sin lienzo: un lienzo encima de todo obligaba a componer la mesa por capas), en mezcla normal: lo que la luz apaga es
     sombra (negro con su transparencia), lo que enciende es luz calida y, con poco dinero, un velo frio. Medido: cualquier modo de mezcla
     (multiplicar, aclarar, pantalla) o un lienzo a pantalla completa costaban 30-60 fotogramas a CPU x4 al entrar. El laton de
     los marcos (mesa, mochila, contador) recibe el brillo a bandas cuando la lampara esta baja; los botones nunca.
     Extrema: brillo del laton 1, charco 1, se mece 0,9 */
  const SL = { brillo: 1, charco: 1, mece: 0.9, lx: 660 / 1920, ly: 430 / 1080 };
  const S = { tb: null, mul: null, rings: [], m: 0, goal: 0, sw: 0, swv: 0, raf: 0, last: 0, sig: "", w: 0, h: 0 };
  const fuerzaLuz = () => { const md = A.casa && A.casa.modo; return md === "off" ? 0 : md === "soft" ? 0.6 : 1; };
  const saldoOn = () => !!(S.tb && S.tb.isConnected);
  function pintaSaldo() {
    const tb = S.tb, f = fuerzaLuz(); if (!tb || !S.mul) return;
    const r = tb.getBoundingClientRect(), W = r.width, Hh = r.height; if (!W || !Hh) return;
    const k = Math.min(innerWidth / 1920, innerHeight / 1080) || 1, x01 = Math.min(1, S.m / 50), e = x01 * x01 * (3 - 2 * x01);
    const Z = (2600 - 1950 * e) * k, lx = (SL.lx * 1920 + S.sw * 30) * k + (innerWidth - 1920 * k) / 2 - r.left, ly = (SL.ly * 1080 + S.sw * 6) * k + (innerHeight - 1080 * k) / 2 - r.top;
    /* el contador de doblones es lo unico que hay que LEER en la esquina mas lejana de la lampara: su laton llegaba al 20 % y los numeros se perdian.
       La capa de luz se aclara en una elipse suave alrededor del contador (sin cantos: una caja encendida seria un cuadrado) */
    const cr = rodillosOn() && R.el.getBoundingClientRect(), ck = cr && cr.width ? [cr.left, cr.top, cr.width, cr.height].map(Math.round).join("x") : "";
    const sig = [Math.round(W), Math.round(Hh), Math.round(lx), Math.round(ly), Math.round(Z), e.toFixed(3), f, ck].join();
    if (sig === S.sig) return; S.sig = sig;
    const base = 0.86 + (0.74 - 0.86) * e, gain = (0.14 + (0.5 - 0.14) * e) * (0.6 + 0.4 * SL.charco), cold = [0.95, 1, 1.07], warm = [1.09, 1, 0.84], zt = zoomDe(tb);
    /* F: cuanto multiplica la luz cada canal (la maqueta); aqui, en mezcla normal: la sombra (1 - F) en negro, lo que pasa de 1 en luz calida y el
       tinte frio de la lampara alta en un velo azulado. La caida es radial: un degradado con su perfil (coseno al cubo) en diez paradas */
    const stops = [0, 0.2, 0.4, 0.6, 0.8, 1, 1.3, 1.7, 2.3, 3.2, 4.5].map(q => {
      const dd = q * Z, I = Math.pow(Z / Math.sqrt(dd * dd + Z * Z), 3), m = base + gain * I;
      let Fm = 0; for (let c = 0; c < 3; c++) { const tint = cold[c] + ((1 + (warm[c] - 1) * (0.4 + 0.6 * I)) - cold[c]) * e; Fm += (1 + (m * tint - 1) * f) / 3; }
      const ad = Math.max(0, 1 - Fm), aw = Math.max(0, Fm - 1) * 0.7, ac = (1 - e) * 0.07 * f, al = Math.min(0.6, ad + aw + ac);
      const rgb = al > 0 ? [(255 * aw + 150 * ac) / al, (214 * aw + 178 * ac) / al, (150 * aw + 225 * ac) / al].map(Math.round) : [0, 0, 0];
      return `rgba(${rgb.join(", ")}, ${al.toFixed(3)}) ${(dd / zt).toFixed(1)}px`;
    });
    const lr = S.mul.getBoundingClientRect(), zl = zoomDe(S.mul) || 1;
    if (ck) {
      const rx = (cr.width / 2 + 70) / zl, ry = (cr.height / 2 + 55) / zl, mx = (cr.left + cr.width / 2 - lr.left) / zl, my = (cr.top + cr.height / 2 - lr.top) / zl;
      S.mul.style.webkitMaskImage = S.mul.style.maskImage = `radial-gradient(ellipse ${rx.toFixed(1)}px ${ry.toFixed(1)}px at ${mx.toFixed(1)}px ${my.toFixed(1)}px, transparent 0, transparent 78%, #000 100%)`;
    } else S.mul.style.webkitMaskImage = S.mul.style.maskImage = "";
    S.mul.style.background = `radial-gradient(circle at ${((lx + r.left - lr.left) / zl).toFixed(1)}px ${((ly + r.top - lr.top) / zl).toFixed(1)}px, ${stops.map(x => x.replace(/([\d.]+)px$/, (m0, v) => (v * zt / zl).toFixed(1) + "px")).join(", ")})`;
    /* el laton de los marcos: bandas de brillo alrededor del punto bajo la lampara (pixel art: cuatro escalones), solo con la lampara baja y calida */
    const kb = SL.brillo * e * f;
    for (const g of S.rings) {
      if (!g.el.isConnected) continue;
      const rr = g.el.getBoundingClientRect(), z = zoomDe(g.host), cx = (lx + r.left - rr.left) / z, cy = (ly + r.top - rr.top) / z;
      if (kb < 0.02) { g.el.style.opacity = "0"; continue; }
      const val = dd => { const cos = Z / Math.sqrt(dd * dd + Z * Z), I = cos * cos * cos, hh = Math.cos(Math.acos(cos) / 2); return [Math.min(1, Math.pow(hh, 18) * I * 1.4), I]; };
      const stops = []; let prev = 0;
      for (const lv of [1, 0.75, 0.5, 0.25]) {
        let lo = 0, hi = 4 * Z; for (let it = 0; it < 18; it++) { const mid = (lo + hi) / 2; if (val(mid)[0] >= lv) lo = mid; else hi = mid; }
        const rad = lo / z, I = val(lo)[1], al = Math.min(0.85, (lv * 0.55 + I * 0.12) * kb);   // luz de laton en mezcla normal: su color con su transparencia
        if (rad > prev) { stops.push(`rgba(255, 226, 140, ${al.toFixed(3)}) ${prev.toFixed(1)}px ${rad.toFixed(1)}px`); prev = rad; }
      }
      const Ib = val(prev * z)[1];
      stops.push(`rgba(255, 200, 110, ${Math.min(0.3, Ib * 0.12 * kb).toFixed(3)}) ${prev.toFixed(1)}px`);
      g.el.style.opacity = "1"; g.el.style.background = `radial-gradient(circle at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, ${stops.join(", ")})`;
    }
  }
  function bucleSaldo(now) {
    S.raf = 0; if (!saldoOn()) return;
    const dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 0.016; S.last = now;
    const goal = Math.max(0, Math.min(60, S.goal)), before = S.m, q = quieto();
    if (q) S.m = goal; else S.m += (goal - S.m) * (1 - Math.pow(0.03, dt));
    /* se mece: un muelle amortiguado que empuja la velocidad del cambio */
    if (!q) { S.swv += ((S.m - before) * 9 * SL.mece - S.sw * 26) * dt * 6; S.swv *= Math.pow(0.12, dt); S.sw += S.swv * dt; } else { S.sw = 0; S.swv = 0; }
    pintaSaldo();
    if (Math.abs(goal - S.m) > 0.02 || Math.abs(S.sw) > 0.002 || Math.abs(S.swv) > 0.002) S.raf = requestAnimationFrame(bucleSaldo);
    else { S.m = goal; S.sw = S.swv = 0; S.last = 0; pintaSaldo(); }
  }
  function saldoTick() { if (saldoOn() && !S.raf) { S.last = 0; S.raf = requestAnimationFrame(bucleSaldo); } }
  /* coins: el saldo; key: la visita (en la misma visita la lampara viene de donde estaba; en una nueva, ya esta en su sitio) */
  function saldo(tb, coins, key) {
    if (!tb) return;
    if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; S.last = 0;
    const same = key != null && key === S.key;
    const mk = cls => { const cv = document.createElement("i"); cv.className = "sl-luz " + cls; cv.setAttribute("aria-hidden", "true"); return cv; };
    /* la capa de luz es UNA y se queda (en #layer, encima de la mesa): la mesa se repinta entera con cada compra y crear la capa otra vez costaba */
    const lay = document.getElementById("layer");
    if (!S.mul || !S.mul.isConnected) { S.mul = mk("sl-mul"); (lay || tb).appendChild(S.mul); }
    S.rings = [];
    tb.querySelectorAll(":scope > .tb-shop, :scope > .tb-tray, .tb-coins").forEach(host => {
      const el = document.createElement("i"); el.className = "sl-laton" + (host.classList.contains("tb-coins") ? " c" : ""); el.setAttribute("aria-hidden", "true"); host.appendChild(el); S.rings.push({ el, host });
    });
    S.tb = tb; S.key = key; S.sig = ""; S.goal = coins;
    if (!same) { S.m = Math.max(0, Math.min(60, coins)); S.sw = S.swv = 0; }
    pintaSaldo(); saldoTick();
  }
  addEventListener("resize", () => { if (rodillosOn()) mideRodillos(); if (saldoOn()) { S.sig = ""; pintaSaldo(); } });

  A.campFx = { sobre, rodillos, rodillosOn, saldo, _R: R, _S: S, get sobreVivo() { return !!sobreVivo; } };
})(window.AIQ);
