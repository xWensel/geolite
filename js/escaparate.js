/*
 * Geolite - EL ESCAPARATE DE LA TIENDA (maqueta «El camino del socio», entrega 2, 23-oct-2026): lo que cambia cada dia en la tienda.
 *
 *   Escaparate de hoy  6 piezas que aun no tienes: una mesa, una prenda del crupier, un icono, un titulo, un marco y una sorpresa (de cualquier
 *                      seccion, punteros incluidos). Una de ellas es la GANGA del dia, a -40 %. Se renueva a medianoche, hora del jugador.
 *   Lote               3 piezas de secciones distintas a -25 % juntas; dura 3 dias. Si ya tienes alguna, el lote baja de precio (pagas las otras).
 *   Regalo de la casa  unas fichas gratis cada dia (10 a 25). Se guardan 3 dias: si no vienes, te esperan.
 *   Lista de deseos    el corazon de cada pieza. Si algo que quieres sale en el escaparate, en el lote o en la oferta de la semana, la placa
 *                      de La tienda de la portada lo avisa con un punto.
 *   El catalogo entero sigue siempre a la venta: nada desaparece, solo cambia lo que se pone delante y su precio.
 *
 * Claves de pieza: "m:<mesa>", "v:<prenda>", "p:<hueco>:<puntero>", "i:<icono>", "t:<titulo>", "k:<marco>".
 * Estado en el perfil: P.esc = { v, d (dia), s (las 6 claves), g (la ganga), lb (bloque de 3 dias), lote (3 claves), gifts [{ d, n, got }], wish {} }.
 *   A.escaparate.today()  { slots, ganga, lote, gifts, until }     .off(clave) el descuento de hoy (0,4 la ganga)     .price(clave) / .full(clave)
 *   .buy(clave)  .buyLote()  .claim()  .wish(clave) / .wished(clave)  .alerts()  .name(clave)  .kindOf(clave)  .owned(clave)
 * Los precios con descuento los aplica cada seccion (js/skins.js, js/vestuario.js, js/punteros.js, js/socio.js) con A.escaparate.off.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const GANGA = 0.4, LOTE = 0.25, GIFT_DAYS = 3;
  const prof = () => A.profile.get(), save = () => A.profile.save(), P6 = s => A.pick6(s);
  const dayNo = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5); };   // el dia del jugador (medianoche local)
  const hash = s => { if (A.rank && A.rank.hash) return A.rank.hash(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------------------------------------------------------------- las piezas a la venta de cada seccion */
  const M = () => A.mesas, V = () => A.vestuario, PU = () => A.punteros, SO = () => A.socio;
  const kindOf = k => String(k || "").split(":")[0];
  const pools = () => ({
    m: M() ? M().shop().map(m => "m:" + m.id) : [],
    v: V() ? V().items.filter(i => !i.casa && V().full(i.id) > 0).map(i => "v:" + i.id) : [],
    p: PU() ? PU().SLOTS.flatMap(s => PU().list(s).filter(id => id !== "casa" && PU().full(s, id) > 0).map(id => "p:" + s + ":" + id)) : [],
    i: SO() ? SO().icons("tienda").map(x => "i:" + x.id) : [],
    t: SO() ? SO().titles().filter(x => x.kind === "tienda").map(x => "t:" + x.id) : [],
    k: SO() ? SO().marcos().filter(x => x.kind === "tienda").map(x => "k:" + x.id) : [],
  });
  function owned(k) {
    const [w, a, b] = k.split(":");
    try {
      if (w === "m") return M().owned(a);
      if (w === "v") return V().owned(a);
      if (w === "p") return PU().owned(a, b);
      if (w === "i") return SO().iconOwned(a);
      if (w === "t") return SO().titleOwned(a);
      if (w === "k") return SO().marcoOwned(a);
    } catch (e) { /* una pieza que ya no existe */ }
    return true;
  }
  /* el precio de catalogo (sin el descuento de hoy) */
  function full(k) {
    const [w, a, b] = k.split(":");
    if (w === "m") return M().full(a);
    if (w === "v") return V().full(a);
    if (w === "p") return PU().full(a, b);
    if (w === "i") return SO().iconFull(a);
    if (w === "t") return SO().titleFull(a);
    if (w === "k") return SO().marcoFull(a);
    return 0;
  }
  function name(k) {
    const [w, a, b] = k.split(":");
    if (w === "m") return M().name(a);
    if (w === "v") return V().name(a);
    if (w === "p") return PU().name(a, b);
    if (w === "i") return SO().iconName(a);
    if (w === "t") return SO().titleName(a);
    if (w === "k") return SO().marcoName(a);
    return "";
  }
  /* comprar una pieza suelta: la compra de su seccion (cobra el precio de hoy y te la pone, como siempre) */
  function buy(k) {
    const [w, a, b] = k.split(":");
    if (w === "m") return M().buy(a);
    if (w === "v") return V().buy(a);
    if (w === "p") return PU().buy(a, b);
    if (w === "i") return SO().buyIcon(a);
    if (w === "t") return SO().buyTitle(a);
    if (w === "k") return SO().buyMarco(a);
    return false;
  }
  /* darla sin cobrar ni ponerla (el lote) */
  function give(k) {
    const [w, a, b] = k.split(":");
    if (w === "m") return M().give(a);
    if (w === "v") return V().give(a);
    if (w === "p") return PU().give(a, b);
    return SO().give(w, a);
  }

  /* ---------------------------------------------------------------- el sorteo del dia y del lote */
  function st() {
    const P = prof(); if (!P.esc || typeof P.esc !== "object") P.esc = { v: 1, wish: {}, gifts: [] };
    const e = P.esc; e.wish = e.wish && typeof e.wish === "object" ? e.wish : {}; e.gifts = Array.isArray(e.gifts) ? e.gifts : [];
    return e;
  }
  const seedOf = tag => hash((prof().id || "anon") + ":esc:" + tag);
  function draw(e, d) {
    /* lo que ya va en el lote no sale tambien en el escaparate (el lote se sortea antes, en ensure) */
    const ban = new Set(e.lote || []), r = rng(seedOf("d" + d)), pl = pools(), left = {}; Object.keys(pl).forEach(w => { left[w] = pl[w].filter(k => !owned(k) && !ban.has(k)); });
    const take = w => { const L = left[w]; if (!L || !L.length) return null; const k = L.splice(Math.floor(r() * L.length), 1)[0]; return k; };
    const order = ["m", "v", "i", "t", "k"], out = [];
    order.forEach(w => { const k = take(w) || take(["p", "v", "m", "i", "t", "k"].find(x => left[x] && left[x].length) || "p"); if (k) out.push(k); });
    const any = () => { const ws = Object.keys(left).filter(w => left[w].length); return ws.length ? take(ws[Math.floor(r() * ws.length)]) : null; };
    const s6 = any(); if (s6) out.push(s6);                                   // la sorpresa: de cualquier seccion
    while (out.length < 6) { const k = any(); if (!k) break; out.push(k); }
    e.d = d; e.s = out; e.g = out.length ? out[Math.floor(r() * out.length)] : "";
  }
  function drawLote(e, b) {
    const r = rng(seedOf("l" + b)), pl = pools(), ws = ["v", "i", "t", "k", "p", "m"].filter(w => pl[w].some(k => !owned(k)));
    const pick = []; while (pick.length < 3 && ws.length) { const w = ws.splice(Math.floor(r() * ws.length), 1)[0]; const L = pl[w].filter(k => !owned(k)); pick.push(L[Math.floor(r() * L.length)]); }
    e.lb = b; e.lote = pick;
  }
  function ensure() {
    const e = st(), d = dayNo(), b = Math.floor(d / 3);
    let ch = false;
    if (e.lb !== b || !Array.isArray(e.lote)) { drawLote(e, b); ch = true; }   // primero el lote: el escaparate del dia no repite sus piezas
    if (e.d !== d || !Array.isArray(e.s)) { draw(e, d); ch = true; }
    if (!e.gifts.some(x => x.d === d)) { const r = rng(seedOf("g" + d)); e.gifts.push({ d, n: 10 + 5 * Math.floor(r() * 4), got: 0 }); ch = true; }
    const keep = e.gifts.filter(x => x.d > d - GIFT_DAYS); if (keep.length !== e.gifts.length) { e.gifts = keep; ch = true; }
    if (ch) save();
    return e;
  }
  const until = () => { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); return m - n; };
  function today() {
    const e = ensure();
    const pend = e.gifts.filter(x => !x.got);
    return { slots: e.s.slice(), ganga: e.g, lote: e.lote.slice(), gift: pend.reduce((a, x) => a + x.n, 0), giftDays: pend.length, until: until(), loteUntil: ((e.lb + 1) * 3 - dayNo()) };
  }
  /* el descuento de hoy de una pieza (la ganga); lo consultan los precios de cada seccion */
  function off(k) { const P = prof(); const e = P && P.esc; if (!e || e.d !== dayNo()) return 0; return e.g === k ? GANGA : 0; }
  const round10 = v => Math.round(v / 10) * 10;
  const price = k => { const f = full(k), o = off(k); return o ? round10(f * (1 - o)) : f; };
  /* el lote: lo que te falta de sus tres piezas, a -25 % */
  function lotePrice() { const L = ensure().lote.filter(k => !owned(k)); return { left: L, full: L.reduce((a, k) => a + full(k), 0), price: round10(L.reduce((a, k) => a + full(k), 0) * (1 - LOTE)) }; }
  function buyLote() {
    const lp = lotePrice(); if (!lp.left.length || !A.club || !A.club.spend || !A.club.spend(lp.price)) return false;
    lp.left.forEach(give); save(); return true;
  }
  function claim() {
    const e = ensure(), pend = e.gifts.filter(x => !x.got), n = pend.reduce((a, x) => a + x.n, 0); if (!n) return 0;
    pend.forEach(x => { x.got = 1; }); if (A.club && A.club.give) A.club.give(n); save(); return n;
  }
  /* la lista de deseos */
  const wished = k => !!st().wish[k];
  function wish(k) { const e = st(); if (e.wish[k]) delete e.wish[k]; else e.wish[k] = Date.now(); save(); return !!e.wish[k]; }
  /* lo que quieres y hoy esta delante (escaparate, lote u oferta de la semana) y aun no tienes */
  function alerts() {
    const e = ensure(), w = Object.keys(e.wish).filter(k => !owned(k)); if (!w.length) return [];
    const o = M() && M().offer ? M().offer() : null, here = new Set(e.s.concat(e.lote, o ? ["m:" + o.id] : []));
    return w.filter(k => here.has(k));
  }
  const giftWaiting = () => ensure().gifts.some(x => !x.got);

  A.escaparate = { today, off, price, full, name, owned, kindOf, buy, buyLote, lotePrice, claim, wish, wished, alerts, giftWaiting, GANGA, LOTE, _dayNo: dayNo,
    _reset: () => { const e = st(); delete e.d; delete e.lb; save(); } };
})(window.AIQ);
