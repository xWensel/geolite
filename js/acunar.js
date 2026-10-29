/*
 * Geolite - ACUÑAR: el Club, la tienda, la Enciclopedia y el Duelo con peso (paquete «club» del Probador, votado sí en Extrema el 29-oct).
 * Una sola familia de golpes en toda la casa: la PRENSA vista desde arriba (troquel de acero con collar de latón que baja, su sombra se cierra
 * antes del golpe) y el papel de la caja con su sello. Todo a rejilla nativa y escala entera de pixeles reales; nada salta ni flota.
 *   medalla(o, done)   ganas una campaña del Clásico: la prensa golpea el disco liso, el odómetro de latón corre y, al pasar el 70 % y el 85 %,
 *                      vuelve a golpear y la medalla cambia de metal. La medalla es la pieza del juego (assets/icons/medal_*.webp) como rejilla.
 *   nivel(r, o)        subes de nivel del Club (js/camino.js reveal): la carta sale del mazo boca abajo, se voltea y la prensa la sella con un lacre
 *                      con el número del nivel (1 golpe; 2 los de título; 3 los de cofre, con lacre de oro).
 *   ticket(o)          comprar en la tienda imprime un ticket de caja con la pieza tal cual, el precio y el saldo; cae el sello PAGADO.
 *   anillo(host, o)    Enciclopedia: si te quedaste a menos del 15 % de la medalla siguiente, su aro casi se cierra y se agrieta en el hueco que
 *                      falta (sin oro: el aro es de plata para las dos medallas). Una vez por mejora; después, quieto.
 *   ko(o, done)        Duelo por KO: la chapa del que cae se raja como cristal y su pila se viene abajo; las fichas caen y SE QUEDAN.
 * Movimiento Mínimo: cada momento es su versión quieta y completa (sin prensa, sin temblor). Un clic, Intro o A salta al final; otro, cierra.
 * Sin WebGL: todo es 2D. El crupier va siempre delante (su capa está por encima de esta escena).
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const HC = () => document.documentElement.classList;
  const quieto = () => HC().contains("reduce-motion");
  const P6 = s => A.pick6(s);
  const dpr = () => devicePixelRatio || 1;
  const kk = () => Math.max(0.3, Math.min(innerWidth / 1920, innerHeight / 1080));
  const son = (k, ...a) => { try { if (A.sfx && A.sfx[k]) A.sfx[k](...a); } catch (e) { /* audio no listo */ } };
  const tiembla = n => { if (n > 0 && A.core && A.core.jpShake) A.core.jpShake(Math.min(3, n)); };
  const vibra = (lo, hi, ms) => { try { if (A.haptic && A.haptic.dual) A.haptic.dual(lo, hi, ms); else if (A.haptic) A.haptic([ms]); } catch (e) { /* sin mando */ } };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  /* ================================================================ textos (es|en|fr|pt|de|it|es-419|zh|ko|ja|ru|pl) */
  const TX = {
    camp: "Campaña {c} · superada|Campaign {c} · cleared|Campagne {c} · réussie|Campanha {c} · concluída|Kampagne {c} · geschafft|Campagna {c} · superata||{c} 战役 · 通关|{c} 캠페인 · 클리어|{c} キャンペーン・クリア|Кампания «{c}» · пройдена|Kampania {c} · ukończona",
    m1: "Bronce|Bronze|Bronze|Bronze|Bronze|Bronzo||铜|동|銅|Бронза|Brąz",
    m2: "Plata|Silver|Argent|Prata|Silber|Argento||银|은|銀|Серебро|Srebro",
    m3: "Oro|Gold|Or|Ouro|Gold|Oro||金|금|金|Золото|Złoto",
    med1: "Medalla de bronce|Bronze medal|Médaille de bronze|Medalha de bronze|Bronzemedaille|Medaglia di bronzo||铜牌|동메달|銅メダル|Бронзовая медаль|Brązowy medal",
    med2: "Medalla de plata|Silver medal|Médaille d'argent|Medalha de prata|Silbermedaille|Medaglia d'argento||银牌|은메달|銀メダル|Серебряная медаль|Srebrny medal",
    med3: "Medalla de oro|Gold medal|Médaille d'or|Medalha de ouro|Goldmedaille|Medaglia d'oro||金牌|금메달|金メダル|Золотая медаль|Złoty medal",
    shop: "Geolite · la tienda|Geolite · the boutique|Geolite · la boutique|Geolite · a boutique|Geolite · die Boutique|Geolite · la boutique||Geolite · 精品店|Geolite · 부티크|Geolite・ブティック|Geolite · бутик|Geolite · butik",
    club: "Club de la casa · {l}|House club · {l}|Club de la maison · {l}|Clube da casa · {l}|Club des Hauses · {l}|Club della casa · {l}||赌场俱乐部 · {l}|하우스 클럽 · {l}|ハウスのクラブ・{l}|Клуб заведения · {l}|Klub kasyna · {l}",
    price: "Precio|Price|Prix|Preço|Preis|Prezzo||价格|가격|価格|Цена|Cena",
    offer: "Oferta de la casa −{p} %|House offer −{p}%|Offre de la maison −{p} %|Oferta da casa −{p}%|Angebot des Hauses −{p} %|Offerta della casa −{p}%||赌场优惠 −{p}%|하우스 할인 −{p}%|ハウスの特価 −{p}%|Скидка заведения −{p} %|Oferta kasyna −{p}%",
    tip: "Propina del crupier|Dealer's tip|Pourboire du croupier|Gorjeta do crupiê|Trinkgeld für den Croupier|Mancia al croupier||荷官小费|딜러 팁|ディーラーへのチップ|Чаевые крупье|Napiwek dla krupiera",
    total: "Total|Total|Total|Total|Summe|Totale||合计|합계|合計|Итого|Razem",
    saldo: "Saldo|Balance|Solde|Saldo|Guthaben|Saldo||余额|잔액|残高|Остаток|Saldo",
    thanks: "Gracias por su compra|Thank you for your purchase|Merci de votre achat|Obrigado pela compra|Danke für Ihren Einkauf|Grazie per l'acquisto||感谢惠顾|구매해 주셔서 감사합니다|お買い上げありがとうございます|Спасибо за покупку|Dziękujemy za zakup",
    paid: "PAGADO|PAID|PAYÉ|PAGO|BEZAHLT|PAGATO||已付|결제 완료|支払済|ОПЛАЧЕНО|ZAPŁACONO",
    falta: "Te faltan {km}|{km} to go|Plus que {km}|Faltam {km}|Noch {km}|Mancano {km}||还差 {km}|{km} 남았어요|あと {km}|Осталось {km}|Brakuje {km}",
    cero: "0 fichas|0 chips|0 jeton|0 fichas|0 Chips|0 fiche||0 筹码|칩 0개|チップ 0 枚|0 фишек|0 żetonów",
  };

  /* ================================================================ base: color, rejilla nativa, discos (los de js/ficha.js), letras 5x7 */
  const hx = h => { h = String(h).replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const U32 = new Map();
  const col = h => { let v = U32.get(h); if (v === undefined) { const [r, g, b] = hx(h); v = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; U32.set(h, v); } return v; };
  const INKH = "1d0a3d";
  class Spr {
    constructor(w, h) { this.w = w; this.h = h; this.cv = document.createElement("canvas"); this.cv.width = w; this.cv.height = h; this.g = this.cv.getContext("2d"); this.im = this.g.createImageData(w, h); this.u = new Uint32Array(this.im.data.buffer); }
    clear() { this.u.fill(0); return this; }
    set(x, y, h) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.u[y * this.w + x] = typeof h === "number" ? h : col(h); }
    outline(h = INKH) { const w = this.w, H = this.h, u = this.u, o = []; for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) { if (u[y * w + x]) continue; if ((x > 0 && u[y * w + x - 1]) || (x < w - 1 && u[y * w + x + 1]) || (y > 0 && u[(y - 1) * w + x]) || (y < H - 1 && u[(y + 1) * w + x])) o.push(y * w + x); } const c = col(h); o.forEach(i => (u[i] = c)); return this; }
    flush() { this.g.putImageData(this.im, 0, 0); return this.cv; }
  }
  const disc = (N, d) => A.ficha.disc(N, d);
  const erode = (N, m, sq) => { const o = new Uint8Array(N * N); for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const p = y * N + x; if (!m[p] || !m[p - 1] || !m[p + 1] || !m[p - N] || !m[p + N]) continue; if (sq && (!m[p - N - 1] || !m[p - N + 1] || !m[p + N - 1] || !m[p + N + 1])) continue; o[p] = 1; } return o; };
  const par = (N, v) => { v = Math.round(v); return (v - N) % 2 ? v + 1 : v; };
  const GLY = {
    0: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"], 1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"], 3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"], 5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"], 7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"], 9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  };
  const glyph = (spr, ch, x, y, h, clip) => { const g = GLY[ch]; if (!g) return; for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (g[j][i] === "1") { const Y = y + j; if (clip && (Y < clip[0] || Y > clip[1])) continue; spr.set(x + i, Y, h); } };
  const E = { out3: t => 1 - Math.pow(1 - t, 3), in2: t => t * t, inout: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), cl: t => Math.max(0, Math.min(1, t)) };
  const hh = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const RAMP = { laton: ["3c240a", "6e3414", "c46a1b", "f5a623", "fdd742"] };

  /* ---------- el troquel de la prensa visto desde arriba (diámetro nativo D, en caché): acero con collar de latón, 8 pernos, luz a bandas ---------- */
  const prensas = new Map();
  function prensa(D) {
    let s = prensas.get(D); if (s) return s;
    const STEEL = ["3a2f58", "6b747d", "8a8fa8", "c9cde0", "f3f0fa"].map(col), BR = RAMP.laton.map(col), INK = col(INKH);
    const N = D, o = new Spr(N, N), full = disc(N, D), f1 = erode(N, full), f2 = erode(N, f1);
    const r = D / 2, collar = disc(N, par(N, D * 0.8)), c1 = erode(N, collar), boss = disc(N, par(N, D * 0.3)), b1 = erode(N, boss), nb = 8, br = r * 0.87;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const p = y * N + x; if (!full[p]) continue;
      if (!f1[p]) { o.u[p] = INK; continue; }
      const X = x + 0.5 - r, Y = y + 0.5 - r, rho = Math.hypot(X, Y) || 1e-3, lit = (-Y * 0.8 - X * 0.6) / rho;
      let c;
      if (!collar[p]) {
        let t = !f2[p] ? (lit > 0.3 ? 4 : lit < -0.3 ? 1 : 3) : (lit > 0.55 ? 3 : lit < -0.55 ? 1 : 2);
        c = BR[t];
        for (let k = 0; k < nb; k++) { const a = (k / nb) * Math.PI * 2 + Math.PI / nb, bx = Math.cos(a) * br, by = Math.sin(a) * br; if (Math.abs(X - bx) < 1 && Math.abs(Y - by) < 1) c = X - bx < 0 && Y - by < 0 ? BR[4] : BR[0]; }
      } else if (!c1[p]) c = INK;
      else if (!boss[p]) { const v = lit * (rho / (r * 0.8)); let t = v > 0.42 ? 2 : v < -0.42 ? 0 : 1; if (lit > 0.82 && rho > r * 0.44 && rho < r * 0.6) t = 3; c = STEEL[t]; }
      else if (!b1[p]) c = INK;
      else c = STEEL[lit > 0.2 ? 3 : 2];
      o.u[p] = c;
    }
    o.flush(); s = o.cv; prensas.set(D, s); return s;
  }
  /* el troquel baja (encoge al pixel nativo, sin reescalar el arte), golpea y sube; su sombra se cierra antes del golpe.
     a = s desde que empieza a bajar; (cx, cy) centro del golpe en pixeles reales; S pixeles reales por pixel de arte; DI diámetro del golpe */
  const TQ = { AP: 0.2, HO: 0.1, RI: 0.26 };
  function troquel(g, a, cx, cy, S, DI, D0, sdK, soK) {
    if (a < 0 || a > TQ.AP + TQ.HO + TQ.RI) return;
    let D, al;
    if (a < TQ.AP) { const q = E.in2(a / TQ.AP); D = Math.round(D0 + (DI - D0) * q); al = E.cl(a / (TQ.AP * 0.35)); }
    else if (a < TQ.AP + TQ.HO) { D = DI; al = 1; }
    else { const q = E.out3((a - TQ.AP - TQ.HO) / TQ.RI); D = Math.round(DI + (D0 * 0.8 - DI) * q); al = 1 - E.cl((q - 0.35) / 0.65); }
    if ((D - DI) % 2) D++;
    const lift = (D - DI) / (D0 - DI), sd = Math.round(DI + 4 + lift * (sdK != null ? sdK : DI * 0.7)), so = Math.round(lift * (soK != null ? soK : DI * 0.43));
    g.globalAlpha = al * (0.62 - lift * 0.42); g.fillStyle = "#0a0414";
    g.beginPath(); g.arc(cx, cy + so * S, (sd / 2) * S, 0, Math.PI * 2); g.fill();
    g.globalAlpha = al; g.drawImage(prensa(D), Math.round(cx - (D / 2) * S), Math.round(cy - (D / 2) * S), D * S, D * S);
    g.globalAlpha = 1;
  }

  /* ---------- la penumbra de la sala con el charco de la lámpara (horneada una vez por tamaño) y la onda del golpe sobre ella ---------- */
  /* el ruido del tramado: 64 x 64, la mitad de los pixeles suma un nivel (se pinta con «lighter»: nada de leer pixeles) */
  let RUIDO = null;
  const ruido = () => { if (RUIDO) return RUIDO; const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"), im = x.createImageData(64, 64); for (let i = 0; i < 4096; i++) if (hh(i, 77) < 0.5) { im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = 255; im.data[i * 4 + 3] = 1; } x.putImageData(im, 0, 0); return (RUIDO = c); };
  const PEN = new Map();
  function penumbra(W, H, cx, cy, rx, ry, dim) {
    const key = [W, H, Math.round(cx), Math.round(cy), Math.round(rx), Math.round(ry), dim].join(","); if (PEN.has(key)) return PEN.get(key);
    if (PEN.size > 3) PEN.clear();
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
    const out = 0.88 * dim, mid = 1 - (1 - out) * (1 + 0.35 * dim);   // la de la maqueta: fuera queda el 1-0,88·luz del fondo; en el charco, un 35 % más
    g.fillStyle = `rgba(4,2,10,${out})`; g.fillRect(0, 0, W, H);
    g.save(); g.translate(cx, cy); g.scale(1, ry / rx); g.globalCompositeOperation = "destination-out";
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx * 1.6);
    [[0, 1], [0.25, 0.9], [0.45, 0.66], [0.62, 0.36], [0.8, 0.12], [1, 0]].forEach(([p, a]) => gr.addColorStop(p, `rgba(0,0,0,${(1 - mid / out) * a})`));
    g.fillStyle = gr; g.fillRect(-rx * 2, -rx * 2, rx * 4, rx * 4);
    g.globalCompositeOperation = "lighter";
    const gw = g.createRadialGradient(0, 0, 0, 0, 0, rx * 1.3);
    [[0, 0.22], [0.4, 0.13], [0.75, 0.04], [1, 0]].forEach(([p, a]) => gw.addColorStop(p, `rgba(52,36,14,${a * dim})`));
    g.fillStyle = gw; g.fillRect(-rx * 2, -rx * 2, rx * 4, rx * 4);
    g.restore();
    /* tramado de 1 px casi invisible contra las bandas de 8 bits del degradado: solo en el charco, que es donde hay degradado (se hornea una vez) */
    const x0 = Math.max(0, Math.floor(cx - rx * 1.6)), y0 = Math.max(0, Math.floor(cy - ry * 1.6)), x1 = Math.min(W, Math.ceil(cx + rx * 1.6)), y1 = Math.min(H, Math.ceil(cy + ry * 1.6));
    if (x1 > x0 && y1 > y0) { g.globalCompositeOperation = "lighter"; g.fillStyle = g.createPattern(ruido(), "repeat"); g.fillRect(x0, y0, x1 - x0, y1 - y0); g.globalCompositeOperation = "source-over"; }
    PEN.set(key, cv); return cv;
  }
  /* la onda del golpe: el frente de presión coge un poco de la luz de la lámpara y deja una sombra detrás (t en s desde el golpe) */
  function onda(g, cx, cy, t, amp, k) {
    if (t < 0 || t > 1.2 || amp <= 0) return;
    const R = (40 + t * 520) * k, w = 34 * k, a = Math.exp(-t * 3.2) * amp;
    g.save(); g.globalCompositeOperation = "lighter"; g.strokeStyle = `rgba(255,226,170,${0.07 * a})`; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.globalCompositeOperation = "source-over"; g.strokeStyle = `rgba(0,0,0,${0.16 * a})`; g.lineWidth = w * 0.7; g.beginPath(); g.arc(cx, cy, Math.max(1, R - w * 0.9), 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  /* ================================================================ la escena: un lienzo a pixeles reales encima de todo (menos el crupier) y una
     capa de letras del juego. Lleva el reloj (E, en s), el salto con clic/Intro/A, el cierre y el Movimiento Mínimo */
  let cur = null;
  function escena(o) {
    if (cur) cur.cierra(true);
    const root = document.createElement("div"); root.className = "acu " + (o.cls || ""); root.setAttribute("role", "status");
    const cv = document.createElement("canvas"); cv.className = "acu-cv"; root.appendChild(cv);
    const tx = document.createElement("div"); tx.className = "acu-tx"; root.appendChild(tx);
    (document.getElementById("app") || document.body).appendChild(root);
    const g = cv.getContext("2d");
    const S = { root, cv, g, tx, W: 0, H: 0, E: 0, red: quieto(), hecho: false, fin: o.fin || 3, hold: o.hold || 1.6, fired: new Set() };
    const mide = () => { const d = dpr(), W = Math.round(innerWidth * d), H = Math.round(innerHeight * d); if (W !== S.W || H !== S.H) { S.W = cv.width = W; S.H = cv.height = H; if (o.resize) o.resize(S); } };
    let last = performance.now(), raf = 0, out = -1;
    const loop = now => {
      raf = 0; if (S.hecho) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!S.red) S.E += dt;
      mide();
      if (typeof window.__acuE === "number") S.E = window.__acuE;                // pruebas: congelar un instante
      const Ev = S.red ? 99 : S.E;
      o.frame(S, Ev, dt);
      if (out < 0 && !S.red && S.E > S.fin + S.hold && !o.manual) cierra();
      if (out >= 0) { const q = E.cl((now - out) / 320); root.style.opacity = String(1 - q); if (q >= 1) { fin(); return; } }
      raf = requestAnimationFrame(loop);
    };
    const salta = () => { if (S.red || S.E >= S.fin) cierra(); else { S.E = S.fin; if (o.salta) o.salta(S); } };
    const onKey = e => { if (e.repeat) return; e.preventDefault(); e.stopPropagation(); salta(); };
    const onDown = e => { e.preventDefault(); e.stopPropagation(); salta(); };
    root.addEventListener("pointerdown", onDown);
    const kT = setTimeout(() => addEventListener("keydown", onKey, true), 250);
    function fin() { if (S.hecho) return; S.hecho = true; clearTimeout(kT); removeEventListener("keydown", onKey, true); if (raf) cancelAnimationFrame(raf); root.remove(); if (cur === S) cur = null; if (o.done) try { o.done(); } catch (e) { console.error(e); } }
    function cierra(ya) { if (S.hecho) return; if (ya || S.red) { fin(); return; } if (out < 0) out = performance.now(); }
    S.cierra = cierra;
    mide(); if (o.init) o.init(S);
    if (S.red) { o.frame(S, 99, 0); if (!o.manual) setTimeout(() => cierra(), (o.holdRed || 2.6) * 1000); }
    raf = requestAnimationFrame(loop);
    cur = S; return S;
  }
  /* una línea de letras del juego en la capa de textos, en pixeles CSS */
  function rotulo(S, key, cls, html) {
    let el = S.tx.querySelector(`[data-k="${key}"]`);
    if (!el) { el = document.createElement("div"); el.dataset.k = key; el.className = "acu-l " + cls; S.tx.appendChild(el); }
    if (el._h !== html) { el._h = html; el.innerHTML = html; }
    return el;
  }
  const at = (el, x, y, show = true) => { if (!el) return; const d = dpr(), t = `translate(${Math.round(x / d)}px, ${Math.round(y / d)}px)`; if (el._t !== t) { el._t = t; el.style.transform = t; } el.classList.toggle("on", !!show); };

  /* ================================================================ 1. LA MEDALLA SE ACUÑA (Clásico) */
  const GRID = [
    "................................................................", "............kkkkkkkkkkkkkkk...........kkkkkkkkkkkkkkk...........", "...........kWWWWWWWWWWWWWWBk.........kppppppppppppppRk..........", "...........knbbbbbbbbbbbbbNk.........kRrrrrrrrrrrrddDk..........",
    "............kBbbbbbbbbbbbbnBk.......kprrrrrrrrrrrrdDk...........", "............knbbbbbbbbbbbbbNk.......kRrrrrrrrrrrrddDk...........", ".............kBbbbbbbbbbbbbnBk.....kprrrrrrrrrrrrdDk............", ".............knbbbbbbbbbbbbbNk.....kRrrrrrrrrrrrddDk............",
    "..............kBbbbbbbbbbbbbnBk...kprrrrrrrrrrrrdDk.............", "..............knbbbbbbbbbbbbnNk...kRrrrrrrrrrrrddDk.............", "...............kBbbbbbbbbbbbbNk...kRrrrrrrrrrrrdDk..............", "...............kBbbbbbbbbbbbbnBk.kprrrrrrrrrrrrdDk..............",
    "...............knbbbbbbbbbbbbbNk.kRrrrrrrrrrrrddDk..............", "................kBbbbbbbbbbbbbnBkprrrrrrrrrrrrdDk...............", "................knbbbbbbbbbbbbbNkRrrrrrrrrrrrddDk...............", ".................kBbbbbbbbbbbbbkprrrrrrrrrrrrdDk................",
    ".................knbbbbbbbbbbbbkRrrrrrrrrrrrddDk................", "..................kBbbbbbbbbbbbkRrrrrrrrrrrrdDk.................", "..................kBbbbbbbbbbbkprrrrrrrrrrrrdDk.................", "..................knbbbbbbbbbbkRrrrrrrrrrrrddDk.................",
    "...................kBbbbbbbbbkprrrrrrrrrrrrdDk..................", "...................knbbbbbbbbkRrrrrrrrrrrrddDk..................", "....................kBbbbbbbkkkkkkkkrrrrrrdDk...................", "....................knbbbkkk44333333kkkrrddDk...................",
    ".....................kBkk44444433333322kkdDk....................", ".....................kk444444443333332222kkk....................", "....................k4444444444433333322221k....................", "...................k444444444443333333222211k...................",
    "..................k44444444444433333332222211k..................", ".................k4444444444444333333322222110k.................", "................k444444444444443333332222221100k................", "...............k4444444444444433k333322222211000k...............",
    "...............k444444444444433k3k33322222111000k...............", "..............k4444444444444433k3k332222221110000k..............", "..............k444444444444433k423k32222221110000k..............", ".............k4444444444444333k321k222222111100000k.............",
    ".............k444444444444333k4321k222222111100000k.............", ".............k444444444433333k3321k222221111000000k.............", "............k34444444kkkkkkkk433323kkkkkkkk10000000k............", "............k3334444k1444444433332344444443k0000000k............",
    "............k33333333k12333333333233333311k00000000k............", "............k333333333k112233333333331111k000000000k............", "............k3333333333kk12223333331111kk0000000000k............", "............k333333333333k122222311111k110000000000k............",
    "............k3333333333332k3333312111k1100000000000k............", "............k2233333333222k3333112111k1000000000000k............", ".............k22222222222k433311122113k00000000000k.............", ".............k22222222222k333111112211k00000000000k.............",
    ".............k22222222222k33311kkk1221k00000000000k.............", "..............k2222222222k331kk111k111k0000000000k..............", "..............k122222222k411k111100kk13k000000000k..............", "...............k11111111k1kk111000000k1k00000000k...............",
    "...............k111111111k111000000000k000000000k...............", "................k111111111100000000000000000000k................", ".................k0000000000000000000000000000k.................", "..................k00000000000000000000000000k..................",
    "...................k000000000000000000000000k...................", "....................k0000000000000000000000k....................", ".....................kk000000000000000000kk.....................", ".......................kk00000000000000kk.......................",
    ".........................kkk00000000kkk.........................", "............................kkkkkkkk............................", "................................................................", "................................................................",
  ];
  /* el disco liso (antes del primer golpe): las mismas rampas sin la estrella */
  const LISO = {
    31: "...............k44444444444444333333322222211000k...............", 32: "...............k44444444444443333333322222111000k...............", 33: "..............k4444444444444433333332222221110000k..............",
    34: "..............k4444444444444333333332222221110000k..............", 35: ".............k444444444444433333332222222111100000k.............", 36: ".............k444444444444333333322222222111100000k.............",
    37: ".............k444444444433333333222222221111000000k.............", 38: "............k34444444443333333322222222111110000000k............", 39: "............k33344444333333333222222221111100000000k............",
    40: "............k33333333333333322222222211111000000000k............", 41: "............k33333333333333222222222111110000000000k............", 42: "............k33333333333333222222221111110000000000k............",
    43: "............k33333333333332222222211111110000000000k............", 44: "............k33333333333322222222111111100000000000k............", 45: "............k22333333332222222211111111000000000000k............",
    46: ".............k222222222222222211111111000000000000k.............", 47: ".............k222222222222222111111110000000000000k.............", 48: ".............k222222222222221111111100000000000000k.............",
    49: "..............k2222222222221111111000000000000000k..............", 50: "..............k1222222222111111110000000000000000k..............", 51: "...............k11111111111111100000000000000000k...............",
    52: "...............k11111111111110000000000000000000k...............",
  };
  const BLANK = GRID.map((r, i) => LISO[i] || r);
  const METAL = { bronce: ["4a2126", "73352a", "a45530", "d07f45", "f2b27a"], plata: ["3a3b58", "5f6480", "9095ab", "c8cbd8", "f4f4f8"], oro: ["7f3a1a", "c46a1b", "f5a623", "ffd95a", "fff6c8"] };
  const FIX = { k: "1d0a3d", b: "2a78e4", B: "4cb4ff", n: "1f4bb0", W: "a8ecff", N: "1d2a6e", r: "d8283f", d: "9c1a3f", p: "ffa08f", D: "5e1238", R: "ff5a55" };
  const nDe = m => (m === "oro" ? 3 : m === "plata" ? 2 : 1);
  const XM = { escala: 6, ritmo: 0.85, temblor: 3, onda: 0.9, luz: 0.95 };   // EXTREMA, como la votó el autor

  function medalla(o, done) {
    const f = Math.max(0, Math.min(100, Math.floor(o.pct))), fin = o.metal || (f >= 85 ? "oro" : f >= 70 ? "plata" : "bronce"), r = XM.ritmo;
    /* guion: golpes (bronce; plata al pasar el 70; oro al pasar el 85), tramos de la cuenta, cinta y brillo */
    const ev = [], seg = []; let t = 0.3 * r, v = Math.min(50, f);
    t += 0.2 * r; ev.push({ t, m: "bronce", n: 1 }); t += 0.3 * r;
    for (const [u, m, n] of [[70, "plata", 2], [85, "oro", 3]]) {
      if (nDe(fin) < n) break;
      const d = (0.25 + (u - v) * 0.033) * r; seg.push({ t0: t, t1: t + d, v0: v, v1: u, slow: true }); t += d;
      t += 0.2 * r; ev.push({ t, m, n }); t += 0.3 * r; v = u;
    }
    if (f > v) { const d = (0.25 + (f - v) * 0.03) * r; seg.push({ t0: t, t1: t + d, v0: v, v1: f }); t += d; }
    const tCinta = t + 0.08, tBrillo = tCinta + 0.3, tFin = tBrillo + 0.6;
    /* rejillas */
    const cx0 = 31.5, cy0 = 41.5, inD = (x, y) => (x - cx0) ** 2 + (y - cy0) ** 2 <= 20.6 * 20.6;
    const isDisc = (x, y, ch) => y >= 22 && inD(x, y) && (ch === "k" || "01234".includes(ch));
    const spr = new Spr(64, 80), sh = new Spr(64, 80);
    function pinta(metal, liso, cintaDy, banda, conCinta) {
      spr.clear(); const ramp = METAL[metal].map(col), gr = liso ? BLANK : GRID;
      if (conCinta) for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const ch = GRID[y][x]; if (ch === "." || isDisc(x, y, ch)) continue; spr.set(x, y + 16 + cintaDy, FIX[ch] ? col(FIX[ch]) : ramp[2]); }
      for (let y = 22; y < 64; y++) for (let x = 0; x < 64; x++) {
        const ch = gr[y][x]; if (ch === "." || !isDisc(x, y, ch)) continue;
        if (ch === "k") { spr.set(x, y + 16, col(FIX.k)); continue; }
        let i = +ch; if (banda != null) { const d = Math.abs(x + y * 0.8 - banda); if (d < 1.2) i += 2; else if (d < 3.6) i += 1; }
        spr.set(x, y + 16, ramp[Math.min(4, i)]);
      }
      spr.flush(); sh.clear(); const ink = col("0a0a0c"); for (let i = 0; i < spr.u.length; i++) if (spr.u[i]) sh.u[i] = ink; sh.flush();
    }
    const BR = RAMP.laton.map(col), INK = col(INKH), DR = col("0a0a0c"), DG = col("fff3b0"), DG2 = col("c6b497");
    const odo = new Spr(50, 17), bar = new Spr(102, 7), ZT = { bronce: METAL.bronce.map(col), plata: METAL.plata.map(col), oro: METAL.oro.map(col) };
    function pintaOdo(vv) {
      odo.clear(); const u = odo.u, w = 50, h = 17;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1, rim = x === 1 || y === 1 || x === w - 2 || y === h - 2; u[y * w + x] = edge ? INK : rim ? (y === 1 || x === 1 ? BR[4] : BR[1]) : BR[2]; }
      for (let x = 2; x < w - 2; x++) u[2 * w + x] = BR[3];
      const vi = Math.max(0, Math.min(100, vv)), drums = [Math.floor(vi / 100), Math.floor(vi / 10) % 10, Math.floor(vi) % 10], fr = vi - Math.floor(vi), units = Math.floor(vi) % 10;
      const roll = [units === 9 && Math.floor(vi / 10) % 10 === 9 ? fr : 0, units === 9 ? fr : 0, fr];
      for (let d = 0; d < 3; d++) {
        const x0 = 4 + d * 10, y0 = 3;
        for (let y = 0; y < 11; y++) for (let x = 0; x < 8; x++) u[(y0 + y) * w + x0 + x] = INK;
        for (let y = 1; y < 10; y++) for (let x = 1; x < 7; x++) u[(y0 + y) * w + x0 + x] = DR;
        const dv = Math.floor(drums[d]) % 10, off = Math.round(roll[d] * 10), clip = [y0 + 1, y0 + 9];
        glyph(odo, String(dv), x0 + 1, y0 + 2 - off, d === 0 && vi < 100 ? DG2 : DG, clip);
        if (off) glyph(odo, String((dv + 1) % 10), x0 + 1, y0 + 2 - off + 10, DG, clip);
        for (let x = 1; x < 7; x++) { const q = (y0 + 1) * w + x0 + x; if (u[q] === DR) u[q] = col("3a2f58"); }
      }
      glyph(odo, "%", 37, 5, INK); odo.flush();
    }
    function pintaBar(vv) {
      bar.clear(); const u = bar.u, w = 102;
      for (let y = 0; y < 7; y++) for (let x = 0; x < w; x++) {
        if (x === 0 || y === 0 || x === w - 1 || y === 6) { u[y * w + x] = INK; continue; }
        const pct = 50 + ((x - 1) / 100) * 50, z = pct + 0.01 >= 85 ? "oro" : pct + 0.01 >= 70 ? "plata" : "bronce", rp = ZT[z], on = pct < vv;
        u[y * w + x] = on ? (y === 1 ? rp[4] : y === 5 ? rp[1] : rp[3]) : y === 1 ? DR : rp[0];
      }
      for (const tt of [70, 85]) { const x = 1 + Math.round(((tt - 50) / 50) * 100); for (let y = 0; y < 7; y++) u[y * w + x] = INK; }
      bar.flush();
    }
    let pen = null, otImp = 9, ampImp = 0, lastV = -1, lastTick = 0;
    const nombre = esc(o.camp || "");
    return escena({
      cls: "acu-med", fin: tFin, hold: 1.8, done,
      resize(S) { pen = null; },
      init(S) { if (S.red) son("acPrensa", nDe(fin)); },
      salta(S) { son("acPrensa", nDe(fin), 0.6); },
      frame(S, Ev, dt) {
        const g = S.g, W = S.W, H = S.H, d = dpr(), k = kk(), Sx = Math.max(2, Math.round(XM.escala * k * d)), red = S.red;
        let metal = "bronce", liso = true; for (const e of ev) if (Ev >= e.t) { metal = e.m; liso = false; }
        let vv = Math.min(50, f);
        for (const s of seg) { if (Ev >= s.t1) vv = s.v1; else if (Ev > s.t0) { let q = (Ev - s.t0) / (s.t1 - s.t0); q = s.slow ? E.inout(q) : E.out3(q); vv = s.v0 + (s.v1 - s.v0) * q; break; } }
        if (red || Ev >= tFin) vv = f;
        if (!red) {
          for (const e of ev) if (Ev >= e.t && !S.fired.has(e)) { S.fired.add(e); if (Ev - e.t < 0.2) { son("acPrensa", e.n); tiembla(Math.min(XM.temblor, e.n)); vibra(0.3 + 0.22 * e.n, 0.12 + 0.25 * (e.n - 1), 110 + 70 * e.n); otImp = 0; ampImp = XM.onda * (0.55 + 0.25 * e.n); } }
          const vi = Math.floor(vv), now = performance.now(); if (vi !== lastV && lastV >= 0 && now - lastTick > 34 && Ev < tFin) { son("acRodillo", (vi - 50) / 50); lastTick = now; } lastV = vi;
          if (Ev >= tCinta && !S.fired.has("c")) { S.fired.add("c"); son("card"); }
          if (Ev >= tBrillo && !S.fired.has("b")) { S.fired.add("b"); son("acBrillo", nDe(fin)); }
        }
        otImp += dt;
        const conCinta = red || Ev >= tCinta, cintaDy = conCinta && !red ? Math.round(-14 * (1 - E.out3(E.cl((Ev - tCinta) / 0.24)))) : 0;
        const banda = !red && Ev >= tBrillo && Ev < tBrillo + 0.6 ? -14 + ((Ev - tBrillo) / 0.6) * 130 : null;
        pinta(metal, liso && !red, cintaDy, banda, conCinta);
        if (red) pinta(fin, false, 0, null, true);
        const mcx = Math.round(W / 2), mcy = Math.round(H * 0.4), ox = mcx - 32 * Sx, oy = Math.round(mcy - (cy0 + 16 + 0.5) * Sx);
        if (!pen) pen = penumbra(W, H, mcx, mcy, (300 * Sx) / 5, ((300 * Sx) / 5) * 0.82, XM.luz);
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = false;
        g.globalAlpha = red ? 1 : E.cl(Ev / 0.25); g.drawImage(pen, 0, 0); g.globalAlpha = 1;
        if (!red) onda(g, mcx, mcy, otImp, ampImp, k * d);
        g.globalAlpha = 0.5; g.drawImage(sh.cv, ox + Sx, oy + 2 * Sx, 64 * Sx, 80 * Sx); g.globalAlpha = 1;
        g.drawImage(spr.cv, ox, oy, 64 * Sx, 80 * Sx);
        if (!red) for (const e of ev) troquel(g, Ev - (e.t - TQ.AP), ox + 32 * Sx, oy + (cy0 + 16 + 0.5) * Sx, Sx, 42, 128, 30, 18);
        const OS = Math.max(2, Sx - 1);
        pintaOdo(vv); pintaBar(vv);
        const oyy = Math.round(oy + 80 * Sx + 18 * k * d), bx = Math.round(mcx - 51 * OS), by = oyy + 17 * OS + Math.round(22 * k * d);
        g.drawImage(odo.cv, Math.round(mcx - 25 * OS), oyy, 50 * OS, 17 * OS);
        g.drawImage(bar.cv, bx, by, 102 * OS, 7 * OS);
        /* letras del juego */
        const ly = by + 7 * OS + Math.round(8 * k * d);
        at(rotulo(S, "t", "acu-ey", esc(P6(TX.camp).replace("{c}", "\u0001")).replace("\u0001", nombre)), mcx, Math.round(oy + 6 * Sx - 46 * k * d));
        at(rotulo(S, "b", "acu-lab m1" + (vv >= 0 ? " on2" : ""), esc(P6(TX.m1))), bx + 21 * OS, ly);
        at(rotulo(S, "p", "acu-lab m2" + (vv >= 70 ? " on2" : ""), esc(P6(TX.m2))), bx + 56 * OS, ly);
        at(rotulo(S, "o", "acu-lab m3" + (vv >= 85 ? " on2" : ""), esc(P6(TX.m3))), bx + 86 * OS, ly);
        at(rotulo(S, "m", "acu-big " + fin, esc(P6(TX["med" + nDe(fin)]))), mcx, ly + Math.round(34 * k * d), red || Ev >= tBrillo);
      },
    });
  }

  /* ================================================================ 2. LA CARTA NUEVA, SELLADA (camino del socio) */
  const RR = { rojo: ["5e1238", "9c1a3f", "d8283f", "ff5a55", "ffa08f"], oro: ["7f3a1a", "c46a1b", "f5a623", "ffd95a", "fff6c8"] };
  const lacres = new Map();
  function lacre(n, aro, oro) {
    const key = n + "_" + aro + "_" + oro; if (lacres.has(key)) return lacres.get(key);
    const N = 26, s = new Spr(N, N), d = disc(N, 22), e1 = erode(N, d), e2 = erode(N, e1), e3 = erode(N, e2), rp = (oro ? RR.oro : RR.rojo).map(col), blob = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const X = x + 0.5 - 13, Y = y + 0.5 - 13, a = Math.atan2(Y, X), r = Math.hypot(X, Y); const rr = 10.6 + 2.2 * Math.pow(Math.max(0, Math.sin(a * 7 + 0.7)), 3) + 1.2 * Math.max(0, Math.sin(a * 3 - 0.4)); if (r <= rr) blob[y * N + x] = 1; }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const p = y * N + x; if (!blob[p] && !d[p]) continue;
      const X = x + 0.5 - 13, Y = y + 0.5 - 13, r = Math.hypot(X, Y) || 1e-3, lit = (-Y * 0.75 - X * 0.65) / r;
      let t = 2;
      if (!d[p]) t = lit > 0.2 ? 2 : 1; else if (!e1[p]) t = lit > 0.3 ? 3 : lit < -0.3 ? 1 : 2; else if (!e2[p]) t = aro ? 0 : 2; else if (!e3[p]) t = aro ? (lit > 0 ? 4 : 3) : lit > 0.3 ? 3 : 2; else t = lit * (r / 8) > 0.45 ? 3 : 2;
      if (aro && !oro && e1[p] && !e2[p]) s.set(x, y, "f5a623"); else s.set(x, y, rp[t]);
    }
    s.outline(INKH);
    const txt = String(n), w = txt.length * 6 - 1, x0 = Math.round(13 - w / 2), y0 = 9;
    for (let i = 0; i < txt.length; i++) { glyph(s, txt[i], x0 + i * 6 + 1, y0 + 1, rp[4]); glyph(s, txt[i], x0 + i * 6, y0, rp[0]); }
    const cv = s.flush(); lacres.set(key, cv); return cv;
  }
  const XN = { ritmo: 0.85, temblor: 3, luz: 0.95, escala: 4 };
  /* el tamaño de la carta en pixeles CSS para que socio.mount la dibuje a escala entera de la Extrema (x4 a 1080) */
  const nivelW = () => { const d = dpr(), S = Math.max(2, Math.round(XN.escala * kk() * d)); return (96 * S) / d; };
  /* r: el #cmRv de js/camino.js ya montado (carta en #cmRvCard, dorso en #cmRvBack). o: { L nivel, k 1-3, chips: [elementos], fin(): cerrar } */
  function nivel(r, o) {
    const red = quieto(), k = Math.max(1, Math.min(3, o.k || 1)), rr = XN.ritmo;
    const st = r.querySelector(".cm-rv-st"), flip = r.querySelector(".cm-rv-flip"), fr = r.querySelector(".cm-rv-f.fr"), bk = r.querySelector(".cm-rv-f.bk"), backCv = r.querySelector("#cmRvBack");
    const cvB = document.createElement("canvas"); cvB.className = "acu-cv acu-nv-bg"; r.insertBefore(cvB, r.firstChild);
    const cvF = document.createElement("canvas"); cvF.className = "acu-cv acu-nv-fx"; r.appendChild(cvF);
    const gB = cvB.getContext("2d"), gF = cvF.getContext("2d");
    const tSlide = 0.25 * rr, dSlide = 0.32 * rr, tFlip = tSlide + dSlide + 0.06 * rr, dFlip = 0.3 * rr;
    const tG = [], g0 = tFlip + dFlip + 0.2 * rr + TQ.AP; for (let i = 0; i < k; i++) tG.push(g0 + i * 0.42 * rr);
    const tLoot = tG[tG.length - 1] + 0.3 * rr;
    const fired = new Set(); let W = 0, H = 0, pen = null, base = null, mazo = null, otImp = 9, amp = 0, E0 = performance.now(), raf = 0, dead = false, skip = 0;
    r.classList.add("acu-nv"); if (red) r.classList.add("up");
    const mide = () => { const d = dpr(), w = Math.round(innerWidth * d), h = Math.round(innerHeight * d); if (w !== W || h !== H) { W = cvB.width = cvF.width = w; H = cvB.height = cvF.height = h; pen = null; mazo = null; base = null; } };
    const loop = now => {
      raf = 0; if (dead || !r.isConnected) return;
      mide();
      const d = dpr(), kz = kk();
      let Ev = red ? 99 : (now - E0) / 1000 + skip; if (typeof window.__acuE === "number") Ev = window.__acuE;
      /* la carta en su sitio de reposo (medido sin transformar) */
      if (!base) { flip.style.transform = "none"; const b = st.getBoundingClientRect(); base = { x: (b.left + b.width / 2) * d, y: (b.top + b.height / 2) * d }; }
      const bw = parseFloat(backCv.style.width) || backCv.offsetWidth || 288, Sd = Math.max(1, Math.round((bw * d) / 96));   // sin la vuelta (scaleX) aplicada
      const cx = base.x, cy = base.y, dx = Math.round(cx - Math.max((360 + (XN.escala - 3) * 60) * kz * d, 104 * Sd)), dy = cy;   // el mazo, a la izquierda, siempre con hueco
      if (!pen) pen = penumbra(W, H, cx, cy, 330 * kz * d * 1.3, 330 * kz * d, XN.luz);
      mazo = !red && backCv.width > 0;
      /* sonidos, golpes */
      if (!red) {
        if (Ev >= tSlide && !fired.has("s")) { fired.add("s"); son("card"); }
        if (Ev >= tFlip + dFlip / 2 && !fired.has("f")) { fired.add("f"); son("card"); }
        tG.forEach((tg, i) => { if (Ev >= tg && !fired.has(tg)) { fired.add(tg); if (Ev - tg < 0.2) { const n = Math.min(3, i + 1 + (k - tG.length)); son("acSello", k === 3 && i === k - 1 ? 3 : n); tiembla(k === 1 ? 0 : Math.min(XN.temblor, i === k - 1 ? k : i)); vibra(0.2 + 0.15 * k, 0.1 + 0.2 * i, 80 + 50 * k); otImp = 0; amp = 0.35 + 0.2 * i; } } });
        if (Ev >= tLoot && !fired.has("l")) { fired.add("l"); if (k === 3) son("jackpot", 2); }
      }
      otImp += 1 / 60;
      /* posición, vuelta y altura */
      let px = cx, py = cy, fl = 1, up = true, lift = 0;
      if (!red) {
        const qs = E.out3(E.cl((Ev - tSlide) / dSlide)); px = Math.round(dx + (cx - dx) * qs); py = Math.round(dy + (cy - dy) * qs);
        const qf = E.cl((Ev - tFlip) / dFlip); fl = Math.abs(Math.cos(qf * Math.PI)); up = qf >= 0.5; lift = Math.sin(qf * Math.PI) + (qs > 0 && qs < 1 ? 0.4 * Math.sin(qs * Math.PI) : 0);
      }
      r.classList.toggle("up", up);
      const ww = Math.max(Sd, Math.round((96 * Sd * fl) / Sd) * Sd), lf = Math.round((lift * 6 * Sd) / 3);
      flip.style.transform = `translate(${(px - cx) / d}px, ${(py - cy - lf) / d}px) scaleX(${ww / (96 * Sd)})`;
      /* fondo: penumbra, mazo y la sombra de la carta (se separa al levantarse) */
      gB.setTransform(1, 0, 0, 1, 0, 0); gB.clearRect(0, 0, W, H); gB.imageSmoothingEnabled = false;
      gB.globalAlpha = red ? 1 : E.cl(Ev / 0.25); gB.drawImage(pen, 0, 0); gB.globalAlpha = 1;
      if (!red) onda(gB, cx, cy, otImp, amp, kz * d);
      if (mazo) for (let i = 7; i >= 0; i--) {                         // el mazo de la casa: 8 dorsos, cada uno un pixel de arte más abajo y a la izquierda; los de debajo, en sombra
        const ox = Math.round(dx - 48 * Sd - i * Sd), oy = Math.round(dy - 64 * Sd + i * Sd);
        if (i === 7) { gB.fillStyle = "rgba(10,4,20,.45)"; gB.fillRect(ox + 3 * Sd, oy + 4 * Sd, 96 * Sd, 128 * Sd); }
        gB.drawImage(backCv, ox, oy, 96 * Sd, 128 * Sd); if (i) { gB.fillStyle = "rgba(29,10,61,.35)"; gB.fillRect(ox, oy, 96 * Sd, 128 * Sd); }
      }
      const fh = (up ? fr : bk).getBoundingClientRect().height * d || 128 * Sd, shd = Math.round(((3 + lift * 14) * Sd) / 3);
      gB.fillStyle = `rgba(10,4,20,${0.42 - lift * 0.12})`; gB.fillRect(Math.round(px - ww / 2 + shd), Math.round(py - fh / 2 + shd * 1.3), ww, Math.round(fh));
      /* el lacre en la esquina de abajo a la derecha (sobre el marco, nunca sobre el nombre) y la prensa */
      gF.setTransform(1, 0, 0, 1, 0, 0); gF.clearRect(0, 0, W, H); gF.imageSmoothingEnabled = false;
      const lx = Math.round(px + (48 - 6) * Sd), ly = Math.round(py + fh / 2 - 8 * Sd), nG = red ? k : tG.filter(tg => Ev >= tg).length;
      if (up && fl > 0.99 && nG > 0) {
        const L = lacre(o.L, k >= 2 && nG >= 2, k === 3 && nG >= 3);
        gF.globalAlpha = 0.5; gF.fillStyle = "#0a0414"; gF.beginPath(); gF.arc(lx + Sd, ly + 2 * Sd, 11 * Sd, 0, Math.PI * 2); gF.fill(); gF.globalAlpha = 1;
        gF.drawImage(L, lx - 13 * Sd, ly - 13 * Sd, 26 * Sd, 26 * Sd);
      }
      if (!red) tG.forEach(tg => troquel(gF, Ev - (tg - TQ.AP), lx, ly, Sd, 28, 96));
      if ((red || Ev >= tLoot) && !fired.has("chips")) { fired.add("chips"); if (o.loot) o.loot(); }
      raf = requestAnimationFrame(loop);                                // quieto (Mínimo) también se repinta: la carta puede cambiar de tamaño al cargar las letras
    };
    raf = requestAnimationFrame(loop);
    if (red) son("acSello", k);
    return { dur: tLoot, saltar: () => { const Ev = (performance.now() - E0) / 1000 + skip; if (!red && Ev < tLoot) { skip += tLoot + 0.05 - Ev; son("acSello", k); return true; } return false; }, stop: () => { dead = true; if (raf) cancelAnimationFrame(raf); } };
  }

  /* ================================================================ 3. EL TICKET DE COMPRA (la tienda) */
  const PAPER = "#f7eedb", PAPER2 = "#efe3c8", TINK = "#16241c", TINK2 = "#56665a", ORANGE = "#b06a34", SRED = "#c41f33";
  const fam = (base) => { let cjk = ""; try { cjk = getComputedStyle(document.documentElement).getPropertyValue("--cjk").trim(); } catch (e) { /* nada */ } return `${base}, "Pixelify Sans", ${cjk || "system-ui"}, sans-serif`; };
  const fichaOro = new Image(); fichaOro.decoding = "async";
  let tk = null;
  function quitaTicket(ya) { if (!tk) return; const t = tk; tk = null; t.dead = true; if (t.raf) cancelAnimationFrame(t.raf); removeEventListener("pointerdown", t.off, true); removeEventListener("keydown", t.off, true); if (ya || quieto()) t.el.remove(); else { t.el.classList.add("out"); setTimeout(() => t.el.remove(), 260); } }
  /* o: { name, kind, price, full, from, to, lvl, pieza (img o canvas), host (el panel de la pieza), slot (elemento bajo el que sale) } */
  /* la pieza del panel puede ser una imagen recién puesta (sin decodificar): dibujarla ya forzaría la decodificación en este fotograma (un tirón).
     Se espera a su decode() (como mucho 250 ms) y el ticket se monta en el fotograma siguiente */
  function ticket(o) {
    quitaTicket(true);
    const pz = o.pieza, tok = (ticket.tok = (ticket.tok || 0) + 1);
    const ya = () => requestAnimationFrame(() => { if (ticket.tok === tok) ticket0(o); });
    if (pz && pz.decode && pz.tagName === "IMG") Promise.race([pz.decode().catch(() => {}), new Promise(r => setTimeout(r, 250))]).then(ya); else ya();
  }
  function ticket0(o) {
    quitaTicket(true);
    if (!fichaOro.src) fichaOro.src = "assets/icons/ficha_oro.webp";
    const red = quieto(), host = o.host; if (!host || !host.isConnected) return;
    /* nunca por debajo de 1:1 (la letra mínima de la Deck: 16 px Silkscreen, 18 px Jersey); en pantallas grandes crece con ellas */
    const p = Math.max(0, o.price | 0), T = p < 200 ? 1 : p < 500 ? 2 : 3, d = dpr(), zc = Math.max(1, kk()), z = zc * d;
    const box = host.getBoundingClientRect(), wDes = [300, 340, 380][T - 1], w = Math.max(280, Math.min(wDes, Math.floor((box.width - 16) / zc)));
    const budget = Math.floor((innerHeight - box.top - 22) / zc) - 7;           // lo que cabe hasta abajo de la ventana (en pixeles de diseño)
    /* ---------- el papel, a pixeles reales (z = pixeles reales por pixel de diseño) ---------- */
    const lines = [], L = (h, fn, tag) => lines.push({ h, fn, tag });
    const cv = document.createElement("canvas"), g = cv.getContext("2d");
    const F = (px, base) => `${Math.round(px)}px ${fam(base)}`;
    const center = (txt, y, font, c) => { g.font = font; g.fillStyle = c; g.textAlign = "center"; g.fillText(txt, w / 2, y, w - 30); g.textAlign = "start"; };
    const fila = (a, b, y, font, c, coin) => {
      g.font = font; g.fillStyle = c; const rx = w - 22 - (coin ? 38 : 0), bw = g.measureText(b).width; g.fillText(b, rx - bw, y);
      g.fillText(a, 22, y, Math.max(40, rx - bw - 40)); const aw = Math.min(g.measureText(a).width, rx - bw - 40); g.fillStyle = TINK2;
      for (let x = 22 + aw + 8; x < rx - bw - 8; x += 6) g.fillRect(Math.round(x), Math.round(y - 6), 2, 2);
      if (coin && fichaOro.complete && fichaOro.naturalWidth) { const q = Math.round(32 * z) / z; g.imageSmoothingEnabled = false; g.drawImage(fichaOro, Math.round((w - 22 - q) * z) / z, Math.round((y - 12 - q / 2) * z) / z, q, q); g.imageSmoothingEnabled = true; }   // la ficha de oro, como la pinta el juego (32 px)
    };
    const rule = y => { g.fillStyle = TINK2; for (let x = 18; x < w - 18; x += 8) g.fillRect(x, y, 4, 2); };
    const full = o.full && o.full > p ? o.full : p, desc = full - p, offP = full > p ? Math.round((desc / full) * 100) : 0;
    L(18, () => {});
    L(24, y => center(P6(TX.shop).toUpperCase(), y + 17, F(16, '"Silkscreen"'), ORANGE));
    L(26, y => center(P6(TX.club).replace("{l}", o.lvl || ""), y + 20, F(24, '"Jersey 15"'), TINK2));
    L(16, y => rule(y + 7));
    const pw = w - 44; let ph = Math.round(pw * 0.4); const pz = o.pieza && (o.pieza.naturalWidth || o.pieza.width) ? o.pieza : null;
    if (pz) L(ph + 14, y => {
      const iw = pz.naturalWidth || pz.width, ih = pz.naturalHeight || pz.height, pix = pz.tagName === "CANVAS" || /\.webp|\.png/.test(pz.currentSrc || pz.src || "");
      g.fillStyle = TINK; g.fillRect(20, y + 2, pw + 4, ph + 4); g.fillStyle = "#0e1712"; g.fillRect(22, y + 4, pw, ph);
      let s = Math.min((pw * z) / iw, (ph * z) / ih); if (pix && s >= 1) s = Math.floor(s); s /= z;
      const dw = iw * s, dh = ih * s; g.imageSmoothingEnabled = !(pix && s * z >= 1);
      g.drawImage(pz, Math.round((22 + (pw - dw) / 2) * z) / z, Math.round((y + 4 + (ph - dh) / 2) * z) / z, dw, dh); g.imageSmoothingEnabled = true;
    }, "img");
    L(40, y => center(o.name || "", y + 32, F(40, '"Jersey 15"'), TINK));
    if (o.kind) L(24, y => center(String(o.kind).toUpperCase(), y + 16, F(16, '"Silkscreen"'), ORANGE));
    L(16, y => rule(y + 7));
    L(30, y => fila(P6(TX.price), A.fmt(full), y + 22, F(24, '"Jersey 15"'), TINK, false));
    if (desc > 0) L(30, y => fila(P6(TX.offer).replace("{p}", offP), "−" + A.fmt(desc), y + 22, F(24, '"Jersey 15"'), TINK, false));
    if (T >= 3) L(30, y => fila(P6(TX.tip), "0", y + 22, F(24, '"Jersey 15"'), TINK2, false), "tip");
    L(16, y => rule(y + 7));
    L(46, y => fila(P6(TX.total).toUpperCase(), A.fmt(p), y + 36, F(40, '"Jersey 15"'), TINK, true));
    if (o.from != null && o.to != null) L(28, y => fila(P6(TX.saldo), A.fmt(o.from) + " → " + A.fmt(o.to), y + 20, F(24, '"Jersey 15"'), TINK2, false));
    if (T >= 2) L(54, y => { let x = 30; const n = (p * 7919 + (o.name || "").length * 131) >>> 0; g.fillStyle = TINK; for (let i = 0; x < w - 30; i++) { const bw = 1 + ((hh(n, i) * 3) | 0); if (i % 2 === 0) g.fillRect(x, y + 10, bw, 34); x += bw + 1; } }, "bar");
    const zs = [74, 88, 104][T - 1]; let selloY = 0; L(zs, y => { selloY = y + zs / 2; });
    L(28, y => center(P6(TX.thanks).toUpperCase(), y + 18, F(16, '"Silkscreen"'), TINK2));
    L(22, () => {});
    /* si no cabe hasta abajo: fuera el código de barras, la foto más baja (nunca menos de 56) y, si aún no, fuera la propina */
    const sum = () => lines.reduce((a, l) => a + l.h, 0), drop = tag => { const i = lines.findIndex(l => l.tag === tag); if (i >= 0) lines.splice(i, 1); };
    if (sum() > budget) drop("bar");
    if (sum() > budget) { const im = lines.find(l => l.tag === "img"); if (im) { const cut = Math.min(ph - 56, sum() - budget); ph -= cut; im.h -= cut; } }
    if (sum() > budget) drop("tip");
    let Ht = 0; lines.forEach(l => { l.y = Ht; Ht += l.h; });
    const tooth = 7; cv.width = Math.round(w * z); cv.height = Math.round((Ht + tooth) * z); g.scale(z, z);
    const gr = g.createLinearGradient(0, 0, 0, Ht); gr.addColorStop(0, PAPER); gr.addColorStop(1, PAPER2);
    g.fillStyle = gr; g.fillRect(0, 0, w, Ht);
    g.beginPath(); g.moveTo(0, Ht); for (let x = 0; x <= w; x += tooth * 2) { g.lineTo(x + tooth, Ht + tooth); g.lineTo(Math.min(w, x + tooth * 2), Ht); } g.closePath(); g.fill();
    g.fillStyle = "rgba(29,10,61,.10)"; g.fillRect(0, 0, w, 3);
    lines.forEach(l => l.fn(l.y));
    /* ---------- el sello PAGADO: tinta con poro de 1-2 px (nunca grueso) ---------- */
    let s0 = null;                                                      // se hornea aparte (otro fotograma): el papel y el sello no cuestan en el mismo
    const horneaSello = () => { if (s0) return;
    const fz = [44, 56, 70][T - 1], giro = (-11 * Math.PI) / 180, sc0 = document.createElement("canvas"), g0 = sc0.getContext("2d");
    g0.font = F(fz * z, '"Jersey 15"'); const twd = Math.ceil(g0.measureText(P6(TX.paid)).width / z);
    const pad = Math.round(fz * 0.32), bw = twd + pad * 2, bh = Math.round(fz * 1.05) + pad, lw = Math.max(4, Math.round(fz / 11)), diag = Math.ceil(Math.hypot(bw, bh)) + 8;
    sc0.width = sc0.height = Math.round(diag * z); g0.scale(z, z); g0.translate(diag / 2, diag / 2); g0.rotate(giro);
    g0.strokeStyle = SRED; g0.lineWidth = lw; g0.strokeRect(-bw / 2 + lw / 2, -bh / 2 + lw / 2, bw - lw, bh - lw);
    g0.lineWidth = Math.max(2, lw >> 1); g0.strokeRect(-bw / 2 + lw * 2, -bh / 2 + lw * 2, bw - lw * 4, bh - lw * 4);
    g0.fillStyle = SRED; g0.font = F(fz, '"Jersey 15"'); g0.textAlign = "center"; g0.textBaseline = "middle"; g0.fillText(P6(TX.paid), 0, fz * 0.04, bw - lw * 5);
    { const D = sc0.width, im = g0.getImageData(0, 0, D, D), a = im.data, seed = (Math.random() * 100) | 0, sc = 1 / z;
      const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, h = (i, j) => hh(i + 1013, j + 7 + seed); const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
      for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) { const i = (y * D + x) * 4; if (!a[i + 3]) continue; const X = x * sc, Y = y * sc, n = vn(X / 1.6, Y / 1.6) * 0.55 + vn(X / 7, Y / 7) * 0.3 + hh(X | 0, Y | 0) * 0.15; a[i + 3] = Math.round(a[i + 3] * Math.min(1, Math.max(0, n * 3.2)) * 0.92); }
      g0.putImageData(im, 0, 0); }
    s0 = sc0; };
    /* ---------- en pantalla: un lienzo bajo la ranura (arriba del panel de la pieza), que no bloquea nada ---------- */
    const el = document.createElement("div"); el.className = "acu-tk"; const c2 = document.createElement("canvas"); el.appendChild(c2); document.body.appendChild(el);
    const slotX = w * zc > box.width - 16 ? box.right - 8 - (w * zc) / 2 : box.left + box.width / 2, slotY = box.top + 10, CW = Math.round((w + 24) * z), CH = Math.round((Ht + tooth + 40) * z);
    c2.width = CW; c2.height = CH; c2.style.width = CW / d + "px"; c2.style.height = CH / d + "px";
    el.style.left = Math.round(slotX * d - CW / 2) / d + "px"; el.style.top = Math.round((slotY - 8) * d) / d + "px"; el.style.width = CW / d + "px"; el.style.height = CH / d + "px";
    const x2 = c2.getContext("2d");
    const perLine = (0.075 - 0.008 * T) / 0.8, tP0 = 0.12 / 0.8, tP1 = tP0 + lines.length * perLine, tCut = tP1 + 0.05, tDrop = tCut + 0.06, tS0 = tDrop + 0.22 / 0.8, tS = tS0 + 0.16;
    const me = { el, dead: false, raf: 0, off: e => { if (me.el.contains(e.target)) return; quitaTicket(); } };
    tk = me; const t0 = performance.now(); let lastLine = -1; const fired = new Set();
    if (red) horneaSello(); else setTimeout(() => { if (!me.dead) horneaSello(); }, 140);
    setTimeout(() => { if (tk === me) { addEventListener("pointerdown", me.off, true); addEventListener("keydown", me.off, true); } }, red ? 300 : (tS + 0.4) * 1000);
    const frame = now => {
      me.raf = 0; if (me.dead) return;
      let Ev = red ? 99 : (now - t0) / 1000; if (typeof window.__acuE === "number") Ev = window.__acuE;
      if (!red) {
        if (!fired.has("caja")) { fired.add("caja"); son("acCaja", T); vibra(0.12, 0.2, 80); }
        const li = Math.min(lines.length - 1, Math.floor((Ev - tP0) / perLine)); if (li > lastLine && Ev >= tP0) { lastLine = li; son("acTic"); }
        if (Ev >= tCut && !fired.has("corte")) { fired.add("corte"); son("acCorte"); }
        if (Ev >= tS && !fired.has("sello")) { fired.add("sello"); son("acSello", T); tiembla(T === 1 ? 0 : T - 1 + (T === 3 ? 1 : 0)); vibra(0.25 + 0.2 * T, 0.15 + 0.2 * (T - 1), 90 + 70 * T); }
      } else if (!fired.has("r")) { fired.add("r"); son("acSello", T); }
      const nL = red ? lines.length : Math.max(0, Math.min(lines.length, Math.floor((Ev - tP0) / perLine) + 1));
      const shown = red ? Ht + tooth : nL >= lines.length ? Ht + (Ev >= tCut ? tooth : 0) : lines[nL] ? lines[nL].y : Ht;
      x2.setTransform(1, 0, 0, 1, 0, 0); x2.clearRect(0, 0, CW, CH);
      if (shown > 0) {
        const drop = red ? 6 : Ev >= tDrop ? Math.round(6 * E.out3(E.cl((Ev - tDrop) / 0.12))) : 0, jolt = !red && Ev >= tS && Ev < tS + 0.1 ? Math.round((1 - (Ev - tS) / 0.1) * (1 + T)) : 0;
        const X = Math.round(12 * z), Y = Math.round((8 + drop + jolt) * z), sh = Math.round(shown * z);
        x2.fillStyle = "rgba(10,4,20,.32)"; x2.fillRect(X + Math.round(7 * z), Y + Math.round(9 * z), cv.width, Math.min(sh, Math.round(Ht * z)));   // sombra dura: el papel se separa del panel
        x2.drawImage(cv, 0, 0, cv.width, sh, X, Y, cv.width, sh);
        if (Ev >= tS0 && !s0) horneaSello();
        if (Ev >= tS0) {
          const q = red ? 1 : E.in2(E.cl((Ev - tS0) / (tS - tS0))), sc = 1 + (1 - q) * 0.7, scx = X + cv.width / 2, scy = Y + selloY * z, s = s0.width * sc;
          if (scy - s / 2 < Y + sh) {
            if (q < 1) { x2.filter = "brightness(0)"; x2.globalAlpha = 0.3 * q; x2.drawImage(s0, scx - s / 2 + (1 - q) * 30 * z, scy - s / 2 + (1 - q) * 46 * z, s, s); x2.filter = "none"; x2.globalAlpha = 0.35 + 0.65 * q; }
            x2.globalCompositeOperation = q >= 1 ? "multiply" : "source-over"; x2.drawImage(s0, Math.round(scx - s / 2), Math.round(scy - s / 2), s, s);
            x2.globalCompositeOperation = "source-over"; x2.globalAlpha = 1; x2.filter = "none";
          }
        }
      }
      /* la ranura: una tapa de latón oscuro encima del borde de salida */
      x2.fillStyle = "#1d0a3d"; x2.fillRect(Math.round(4 * z), Math.round(3 * z), Math.round((w + 16) * z), Math.round(6 * z));
      x2.fillStyle = "#6e3414"; x2.fillRect(Math.round(6 * z), Math.round(5 * z), Math.round((w + 12) * z), Math.round(2 * z));
      if (!red && Ev < tS + 0.2) me.raf = requestAnimationFrame(frame);
    };
    me.raf = requestAnimationFrame(frame);
  }

  /* ================================================================ 4. EL ANILLO CASI (Enciclopedia) */
  /* host: la casilla de la medalla que falta (.cx-dmeds > span). o: { best, lim, prev, fresh } (km). Sin oro: aro de plata siempre */
  function anillo(host, o) {
    if (!host || !(o.best > o.lim) || o.best > o.lim * 1.15) return;
    const red = quieto() || !o.fresh, med = host.querySelector(".cx-md") || host;
    const cv = document.createElement("canvas"); cv.className = "acu-ring"; host.classList.add("acu-rh"); host.appendChild(cv);
    const lab = document.createElement("i"); lab.className = "acu-falta"; lab.textContent = P6(TX.falta).replace("{km}", (A.core && A.core.S && A.core.S.units === "mi" ? A.fmtDist(o.best - o.lim) : A.fmt(Math.ceil(o.best - o.lim)) + " km")); host.appendChild(lab);
    const N = 33, spr = new Spr(N, N), PL = ["3a2f58", "6b747d", "8a8fa8", "c9cde0", "f3f0fa"].map(col), INK = col(INKH), TR = col("0a0a0c"), TR2 = col("301252");
    const ring = disc(N, 31), r1 = erode(N, ring), r2 = erode(N, r1), r3 = erode(N, erode(N, r2)), r4 = erode(N, r3);
    const frac = E.cl((o.lim * 1.15 - o.best) / (o.lim * 0.15)), pFull = E.cl((o.prev - o.best) / (o.prev - o.lim)), tier = frac > 0.66 ? 3 : frac > 0.33 ? 2 : 1;
    const X1 = { grieta: 1, tiembla: 4, queda: 0.6 };                       // EXTREMA
    function pinta(pr, crack) {
      spr.clear(); const ramp = PL, c = N / 2, gapA = pr * Math.PI * 2, ca = gapA, cw = 0.16 + 0.1 * frac;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const p = y * N + x; if (!ring[p] || r4[p]) continue;
        const X = x + 0.5 - c, Y = y + 0.5 - c, a = (Math.atan2(-X, Y) + Math.PI * 2) % (Math.PI * 2), lit = -Y / Math.hypot(X, Y);
        let cc;
        if (!r1[p] || (r3[p] && !r4[p])) cc = a <= gapA && r3[p] ? ramp[0] : INK;
        else cc = a <= gapA ? ramp[!r2[p] ? (lit > 0.2 ? 4 : 3) : lit > -0.2 ? 3 : 2] : !r2[p] ? TR2 : TR;
        if (crack > 0) { const da = a - ca, zz = Math.sin(Math.hypot(X, Y) * 2.7) * 0.07 * crack; if (Math.abs(da - zz) < 0.07 * (0.6 + crack)) cc = crack > 0.5 ? ramp[4] : INK; else if (da < 0 && da > -cw * crack && Math.abs(da - zz) < 0.15) cc = ramp[0]; }
        spr.u[p] = cc;
      }
      if (crack > 0.15) {
        const Lg = Math.round(1 + crack * 4);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const p = y * N + x; if (ring[p] && !r4[p]) continue;
          const X = x + 0.5 - c, Y = y + 0.5 - c, r = Math.hypot(X, Y), rr = 15.5; if (r > rr + Lg || r < rr - 4 - Lg * 0.6) continue;
          const a = (Math.atan2(-X, Y) + Math.PI * 2) % (Math.PI * 2), zz = Math.sin(r * 2.7) * 0.09 * crack, dd = Math.abs(a - ca - zz) * r;
          if (dd < 0.55) spr.u[p] = crack > 0.5 ? ramp[4] : ramp[3]; else if (dd < 1.3 && r > rr) spr.u[p] = INK;
        }
      }
      spr.flush();
    }
    const tFill = 0.15, dFill = 0.62, tCrack = tFill + dFill + 0.08, t0 = performance.now(); let raf = 0;
    const draw = now => {
      raf = 0; if (!cv.isConnected) return;
      const d = dpr(), mr = med.getBoundingClientRect(), hr = host.getBoundingClientRect(), z = (hr.width / (host.offsetWidth || hr.width)) || 1, SC = Math.max(1, Math.round((mr.width * d * 1.55) / N));
      const Wd = N * SC; if (cv.width !== Wd) { cv.width = cv.height = Wd; }
      const cxp = mr.left + mr.width / 2 - hr.left, cyp = mr.top + mr.height / 2 - hr.top;
      cv.style.width = cv.style.height = Wd / d / z + "px"; cv.style.left = (Math.round((cxp * d) - Wd / 2) / d) / z + "px"; cv.style.top = (Math.round((cyp * d) - Wd / 2) / d) / z + "px";
      let Ev = red ? 99 : (now - t0) / 1000; if (typeof window.__acuE === "number") Ev = window.__acuE;
      const pr = red ? pFull : pFull * (1 - Math.pow(1 - E.cl((Ev - tFill) / dFill), 4)), ce = Ev - tCrack;
      const crack = red ? X1.queda * X1.grieta : ce < 0 ? 0 : ce < 0.07 ? (ce / 0.07) * X1.grieta : X1.grieta * (X1.queda + (1 - X1.queda) * Math.exp(-(ce - 0.07) * 5));
      if (!red && Ev > tFill && !host._f1) { host._f1 = 1; son("acLlena"); }
      if (!red && ce >= 0 && !host._f2) { host._f2 = 1; son("raja", 0.5 + 0.3 * tier); vibra(0.08 + 0.08 * tier, 0.18 + 0.12 * tier, 80 + 30 * tier); }
      let sx = 0, sy = 0; if (!red && ce >= 0 && ce < 0.35) { const a = Math.round(X1.tiembla * (0.5 + 0.5 * frac) * (1 - ce / 0.35) + 0.4); sx = Math.round((Math.random() * 2 - 1) * a); sy = Math.round((Math.random() * 2 - 1) * a * 0.5); }
      const em = host.querySelector("em"); if (em) em.style.transform = sx || sy ? `translate(${sx}px, ${sy}px)` : "";
      lab.classList.toggle("on", red || ce > 0);
      pinta(pr, crack); const g = cv.getContext("2d"); g.imageSmoothingEnabled = false; g.clearRect(0, 0, Wd, Wd); g.drawImage(spr.cv, 0, 0, Wd, Wd);
      if (!red && Ev < tCrack + 1.2) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    if (o.seen) o.seen();
  }

  /* ================================================================ 5. EL KO DEL DUELO */
  const rgb = a => "#" + a.map(v => v.toString(16).padStart(2, "0")).join("");
  const cantos = new Map();
  /* la ficha vista de tres cuartos: cara elíptica y canto de 3 px con sus franjas (las rampas de js/ficha.js) */
  function canto(rampa) {
    if (cantos.has(rampa)) return cantos.get(rampa);
    const R = A.ficha.R[rampa], w = 30, h = 16, s = new Spr(w, h), cx = 14.5, cy = 5.5, a = 13.6, b = 5.1, inE = (x, y, oy) => ((x + 0.5 - cx) / a) ** 2 + ((y + 0.5 - cy - oy) / b) ** 2 <= 1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const top = inE(x, y, 0), edge = !top && (inE(x, y, 1) || inE(x, y, 2) || inE(x, y, 3));
      if (top) { const X = (x + 0.5 - cx) / a, Y = (y + 0.5 - cy) / b, r = Math.hypot(X, Y), ang = Math.atan2(Y, X); let c = R[2]; if (r > 0.72) { const sp = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 8 + 0.5) % 2 === 0; c = sp ? [255, 244, 220] : Y < 0 ? R[1] : R[2]; } else if (r > 0.6) c = R[3]; else c = Y < -0.1 ? R[1] : R[2]; s.set(x, y, rgb(c)); }
      else if (edge) { const X = (x + 0.5 - cx) / a, st = Math.abs(Math.round(Math.asin(Math.max(-1, Math.min(1, X))) * 2.6)) % 2 === 1; s.set(x, y, rgb(st ? [238, 220, 184] : R[3])); }
    }
    s.outline(INKH); const cv = s.flush(); cantos.set(rampa, cv); return cv;
  }
  const CN = 32;
  /* la chapa: la ficha de la casa al pixel (A.ficha.px) de cada jugador */
  function chapa(id) { const s = new Spr(CN, CN), px = A.ficha.px(CN, id); for (let i = 0; i < CN * CN; i++) if (px[i * 4 + 3]) s.u[i] = ((255 << 24) | (px[i * 4 + 2] << 16) | (px[i * 4 + 1] << 8) | px[i * 4]) >>> 0; return s; }
  function rajada(base, paso, nGr, seed) {
    const s = new Spr(CN, CN); s.u.set(base.u); if (paso <= 0) return s.flush();
    const ix = 11, iy = 10, INK = col(INKH), HI = col("fff6c8"), SH = col("a8ecff"), lines = [];
    for (let i = 0; i < nGr; i++) {
      const a = (i / nGr) * Math.PI * 2 + (hh(seed, i) - 0.5) * 0.9, len = (paso >= 2 ? 1 : 0.55) * (8 + hh(seed + 7, i) * 16);
      let x = ix, y = iy; const pts = [[x, y]];
      for (let st = 0; st < len; st++) { const j = (hh(i * 31 + st, seed) - 0.5) * 0.9; x += Math.cos(a + j); y += Math.sin(a + j); pts.push([Math.round(x), Math.round(y)]); }
      lines.push(pts);
    }
    if (paso >= 2) { const a0 = (1 / nGr) * Math.PI * 2, a1 = (2 / nGr) * Math.PI * 2, cp = new Uint32Array(base.u); for (let y = CN - 1; y >= 0; y--) for (let x = CN - 1; x >= 0; x--) { const An = (Math.atan2(y - iy, x - ix) + Math.PI * 2) % (Math.PI * 2), r = Math.hypot(x - ix, y - iy); if (An > a0 && An < a1 && r > 3 && cp[y * CN + x]) { const X = x + 1, Y = y + 1; if (X < CN && Y < CN && cp[Y * CN + X]) s.u[Y * CN + X] = cp[y * CN + x]; } } }
    for (const Ln of lines) Ln.forEach(([x, y], i) => { if (x < 0 || y < 0 || x >= CN || y >= CN || !s.u[y * CN + x]) return; if (s.u[y * CN + x] === INK && i > 2) return; s.u[y * CN + x] = INK; const hx2 = x - 1, hy = y - 1; if (hx2 >= 0 && hy >= 0 && s.u[hy * CN + hx2] && s.u[hy * CN + hx2] !== INK) s.u[hy * CN + hx2] = i % 3 ? HI : SH; });
    s.u[iy * CN + ix] = HI; s.u[iy * CN + ix + 1] = INK;
    return s.flush();
  }
  const XK = { grieta: 10, empuje: 1.4, temblor: 3, luz: 0.85 };
  /* o: { win (cae la banca), me, foe (nombres), fichas (pilas: me y rv antes del golpe), tamaño 1-3 } */
  function ko(o, done) {
    const tier = Math.max(1, Math.min(3, o.tier || 2)), cae = o.win ? 1 : 0, dir = cae ? 1 : -1, emp = XK.empuje * (cae ? 1 : 0.7), n = [10, 16, 22][tier - 1], seed = (Math.random() * 1000) | 0, ch = [];
    for (let i = 0; i < n; i++) { const hg = i / Math.max(1, n - 1), r1 = hh(i, 11), r2 = hh(i, 23); ch.push({ i, t0: 0.72 + (n - 1 - i) * 0.035, fx: Math.round(dir * (6 + hg * 70 * emp + r1 * 22 * emp) + (r2 - 0.5) * 16), fz: Math.round((r2 - 0.3) * 22 * (0.4 + hg)), dur: 0.16 + 0.24 * Math.sqrt(hg + 0.05) }); }
    const tFin = 0.72 + n * 0.035 + 0.6, CH = { amber: canto("amber"), purple: canto("purple") }, CHA = { me: chapa("chip_o"), rv: chapa("chip_p") }, raj = {};
    let pen = null, otImp = 9, amp = 0;
    return escena({
      cls: "acu-ko", fin: tFin, hold: 1.4, done,
      resize() { pen = null; },
      init(S) { if (S.red) son("glass"); },
      frame(S, Ev, dt) {
        const g = S.g, W = S.W, H = S.H, d = dpr(), k0 = kk(), Sx = Math.max(2, Math.round(3 * k0 * d)), red = S.red;
        if (!red) {
          if (Ev >= 0.3 && !S.fired.has("r")) { S.fired.add("r"); son("glass"); son("acGrave", tier); tiembla(Math.min(XK.temblor, tier)); vibra(0.35 + 0.15 * tier, 0.45, 160 + 60 * tier); otImp = 0; amp = 0.35 + 0.15 * tier; }
          if (Ev >= 0.42 && !S.fired.has("r2")) { S.fired.add("r2"); son("acCorte"); }
          ch.forEach(c => { if (Ev >= c.t0 + c.dur && !S.fired.has(c)) { S.fired.add(c); if (Ev - c.t0 - c.dur < 0.15 && (c.i % 2 === 0 || n < 12)) son("chip", c.i / n); if (c.i === 0) vibra(0.2, 0.3, 120); } });
        }
        otImp += dt;
        const cx = Math.round(W / 2), fy = Math.round(H * 0.62), gap = Math.round(230 * k0 * d);
        if (!pen) pen = penumbra(W, H, cx, Math.round(fy - 80 * k0 * d), 560 * k0 * d * 0.85, 300 * k0 * d * 0.85, XK.luz);
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = false;
        g.globalAlpha = red ? 1 : E.cl(Ev / 0.25); g.drawImage(pen, 0, 0); g.globalAlpha = 1;
        if (!red) onda(g, cx, fy - 80 * k0 * d, otImp, amp, k0 * d);
        const sombra = (x, y, w) => { g.fillStyle = "rgba(6,2,12,.45)"; g.beginPath(); g.ellipse(x, y, w, w * 0.32, 0, 0, Math.PI * 2); g.fill(); };
        [{ x: cx - gap, ram: "amber", ch: "me", nm: o.me }, { x: cx + gap, ram: "purple", ch: "rv", nm: o.foe }].forEach((Ld, li) => {
          const pierde = li === cae, nn = pierde ? n : [12, 18, 24][tier - 1], chip = CH[Ld.ram];
          if (!pierde || Ev < 0.72) { sombra(Ld.x + 2 * Sx, fy + 9 * Sx, 16 * Sx); for (let i = 0; i < nn; i++) g.drawImage(chip, Ld.x - 15 * Sx, fy - i * 3 * Sx, 30 * Sx, 16 * Sx); }
          else {
            const st = ch.map(c => { const q = E.cl((Ev - c.t0) / c.dur), y0 = -(c.i * 3), x = c.fx * E.out3(q), y = y0 + (c.fz - y0) * (q * q); return { x, y, z: q >= 1 ? c.fz : y0 - 100 + c.i, q }; }).sort((a, b) => a.z - b.z);
            st.forEach(s => { if (s.q >= 1) sombra(Ld.x + s.x * Sx + 2 * Sx, fy + (s.y + 9) * Sx, 13 * Sx); });
            st.forEach(s => g.drawImage(chip, Math.round(Ld.x + (s.x - 15) * Sx), Math.round(fy + s.y * Sx), 30 * Sx, 16 * Sx));
          }
          const pasoR = pierde ? (red ? 2 : Ev >= 0.42 ? 2 : Ev >= 0.3 ? 1 : 0) : 0, key = Ld.ch + pasoR;
          const cvc = pasoR ? raj[key] || (raj[key] = rajada(CHA[Ld.ch], pasoR, XK.grieta, seed)) : CHA[Ld.ch].flush();
          const hacia = li === 0 ? 1 : -1, chx = Ld.x + hacia * 22 * Sx, cyy = fy + 20 * Sx - CN * Sx, hund = pierde && (red || Ev >= 0.9) ? Sx : 0;
          sombra(chx + 3 * Sx, fy + 20 * Sx, 15 * Sx);
          g.drawImage(cvc, chx - (CN / 2) * Sx, cyy + hund, CN * Sx, CN * Sx);
          const ly = fy + 26 * Sx;
          at(rotulo(S, "n" + li, "acu-nm", esc(Ld.nm)), Ld.x, ly);
          at(rotulo(S, "z" + li, "acu-zero", esc(P6(TX.cero))), Ld.x, ly + Math.round(Math.max(32, 38 * k0) * d), pierde && (red || Ev >= 0.5));
        });
        at(rotulo(S, "ko", "acu-ko-t " + (cae ? "win" : "lose"), "K.O."), cx, Math.round(fy - 100 * Sx), red || Ev >= 0.3);
      },
    });
  }

  A.acunar = { medalla, nivel, nivelW, ticket, quitaTicket, anillo, ko, tx: TX, cerrar: () => { if (cur) cur.cierra(true); } };
})(window.AIQ);
