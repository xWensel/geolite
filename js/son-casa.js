/*
 * Geolite - el paquete «Sonido, vibracion y el crupier» del Probador (v0.3.24x, aprobado en EXTREMA). Las voces viven en js/audio.js
 * (A.sfx.gesto, A.sfx.mat, la familia «confirmar», los escalones x1,4) y la escalera de vibracion en js/mando.js (A.haptic.pat / A.haptic.esc);
 * aqui se enganchan al juego:
 *  - FAMILIAS: cada familia de la interfaz tiene su patron de mando (Extrema: tambien pasar): tocar un toque agudo de 12 ms, confirmar uno de 26 ms
 *    y el «no se puede» dos golpes graves que caen.
 *  - LOS GESTOS DEL CRUPIER SUENAN en el fotograma del contacto (js/crupier.js llama a A.crupier.onFrame): barajar, repartir, la moneda, sellar,
 *    chasquear y su aplauso lento, cada uno con su micro pulso de mando. En el casino no: cada juego de la Barra pone los suyos.
 *  - FOLEY DE LA CASA (solo con el estilo «Lounge dorado»; «Clasicos» suena como siempre): en la portada cada materia suena al pasar y al pulsar
 *    y sustituye al sonido de interfaz de esa pieza: laton (placas, botones redondos, Continuar, la caja de fichas), papel (las cartas de modo y la
 *    tarjeta de socio), cristal (el rotulo de bombillas) y fieltro (el tapete: al volver a el y al pulsarlo).
 * Nada de esto toca la partida mientras contestas: el crupier no sale ahi y la portada no esta.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const hp = (pat, o) => { try { if (A.haptic && A.haptic.pat) A.haptic.pat(pat, o); } catch (e) { /* sin vibracion */ } };
  const lounge = () => !A.audio || A.audio.sonidos !== "clasico";
  const now = () => performance.now();

  /* ---------------------------------------------------------------- 1) familias: su patron de mando (solo el mando: en el movil no se nota) */
  const FAM = { tocar: [{ t: 0, d: 12, lo: 0, hi: 0.07 }], confirmar: [{ t: 0, d: 26, lo: 0, hi: 0.22 }], no: [{ t: 0, d: 55, lo: 0.28, hi: 0 }, { t: 95, d: 70, lo: 0.2, hi: 0 }] };
  /* el foley de la portada sustituye al sonido de interfaz de la misma pieza: mientras «sup», ese sonido calla (el foley ya ha sonado) */
  const sup = { hov: 0, clk: 0 };
  const wrap = (k, fam, cuando) => {
    const f = A.sfx && A.sfx[k]; if (!f || f._son) return;
    const g = (...a) => { if (now() < sup[cuando]) return; hp(FAM[fam], { movil: false, k: 1 }); return f(...a); };
    g._son = true; A.sfx[k] = g;
  };
  function familias() {
    wrap("hover", "tocar", "hov"); wrap("menuHover", "tocar", "hov");
    wrap("ui", "confirmar", "clk"); wrap("card", "confirmar", "clk"); wrap("felt", "confirmar", "clk"); wrap("toggle", "confirmar", "clk");
    wrap("deny", "no", "none");
    /* el sello de la casa: el del gesto del crupier no se le monta encima */
    const st = A.sfx && A.sfx.stamp; if (st && !st._son) { A.sfx.stamp = (...a) => { if (A.audio.selloAt) A.audio.selloAt(); return st(...a); }; A.sfx.stamp._son = true; }
  }

  /* ---------------------------------------------------------------- 2) los gestos del crupier: [fotograma del contacto, sonido, opciones, pulso de mando] */
  const PUL = {
    barajar: () => { const p = []; for (let i = 0; i < 7; i++) p.push({ t: 80 + i * 70, d: 10, lo: 0, hi: 0.08 }); p.push({ t: 790, d: 30, lo: 0.25, hi: 0 }, { t: 880, d: 24, lo: 0.18, hi: 0 }); return p; },
    puente: () => [{ t: 0, d: 10, lo: 0, hi: 0.08 }, { t: 120, d: 10, lo: 0, hi: 0.08 }, { t: 240, d: 10, lo: 0, hi: 0.08 }, { t: 420, d: 30, lo: 0.22, hi: 0 }],
    naipe: () => [{ t: 0, d: 16, lo: 0.06, hi: 0.14 }],
    moneda: o => [{ t: 0, d: 10, lo: 0, hi: 0.16 }, { t: Math.round((o.hasta || 0.6) * 1000) + 40, d: 40, lo: 0.32, hi: 0.05 }],
    palma: () => [{ t: 0, d: 30, lo: 0.24, hi: 0.04 }],
    sellar: o => [{ t: 0, d: 40 + 30 * (o.peso || 2), lo: 0.2 + 0.15 * (o.peso || 2), hi: 0.05 }],
    chasquear: () => [{ t: 0, d: 12, lo: 0, hi: 0.26 }],
    palmada: () => [{ t: 0, d: 20, lo: 0.12, hi: 0.18 }],
  };
  /* gesto (sin la cara: «shuffle@sly» es «shuffle») -> fotograma -> [sonido, opciones]. Mirados al pixel en el atlas: el pulgar suelta la moneda
     en el 4 y la recoge en el 10; el naipe sale del mazo en el 7 del reparto; el sello toca el papel en el 1 (el 7 en la escena); el chasquido,
     en el 6; la palmada del aplauso lento, en el 3 */
  const GSON = {
    shuffle: { 2: ["barajar"] }, e_cascada: { 9: ["puente"] },
    deal_card: { 3: ["naipe"] }, e_reparte: { 7: ["naipe", { vuela: true }] },
    coin_toss: { 4: ["moneda", { hastaF: 10 }] }, e_moneda: { 3: ["palma"], 17: ["palma"] },
    stamp: { 1: ["sellar", { peso: 2 }] }, e_sella: { 7: ["sellar", { peso: 3 }] },
    snap: { 6: ["chasquear"] }, slow_clap: { 3: ["palmada"] },
  };
  const ultimo = {};                                                   // los bucles de espera (barajar) no suenan mas de una vez cada 5 s
  function onFrame(spr, G, i) {
    const base = String(G.id).split("@")[0], map = GSON[base]; if (!map || G.hit) return;   // con alToque, quien lo pidio pone su sonido
    const f = G.x.frames[i][0], hit = map[f]; if (!hit) return;
    (G._son = G._son || {}); if (G._son[f]) return; G._son[f] = 1;     // ida y vuelta: una vez por gesto
    if (document.hidden || !spr.cv || (spr.host && spr.host.closest && spr.host.closest("#rouOv"))) return;   // en el casino cada juego pone sus sonidos
    const r = spr.cv.getBoundingClientRect(); if (!r.width || !r.height) return;
    const [k, o0] = hit, o = Object.assign({}, o0 || {}, { x: r.left + r.width / 2 });
    if (o.hastaF != null) { let ms = 0; for (let j = i; j < G.x.frames.length && G.x.frames[j][0] !== o.hastaF; j++) ms += G.x.frames[j][1]; o.hasta = Math.max(0.3, Math.min(1, ms / 1000 - 0.04)); }
    if (k === "barajar" && now() - (ultimo[k] || -1e9) < 5000) return; ultimo[k] = now();
    if (A.sfx && A.sfx.gesto) A.sfx.gesto(k, o);
    if (PUL[k]) hp(PUL[k](o), { movil: false, k: 1 });
  }

  /* ---------------------------------------------------------------- 3) foley de la portada */
  const MAT_SEL = [["laton", ".plq, .menu-gear, .hh-cont, .hh-wal"], ["papel", ".mcard, .hh-socio"], ["cristal", ".hh-logo"]];
  const MAT_PUL = {
    laton: { pasar: [{ t: 0, d: 14, lo: 0, hi: 0.16 }], pulsar: [{ t: 0, d: 22, lo: 0.12, hi: 0.3 }, { t: 60, d: 14, lo: 0, hi: 0.12 }] },
    papel: { pasar: [{ t: 0, d: 8, lo: 0, hi: 0.08 }], pulsar: [{ t: 0, d: 8, lo: 0, hi: 0.14 }, { t: 26, d: 8, lo: 0, hi: 0.1 }, { t: 50, d: 20, lo: 0.1, hi: 0 }] },
    cristal: { pasar: [{ t: 0, d: 6, lo: 0, hi: 0.1 }], pulsar: [{ t: 0, d: 6, lo: 0, hi: 0.16 }, { t: 50, d: 6, lo: 0, hi: 0.08 }] },
    fieltro: { pasar: [{ t: 0, d: 20, lo: 0.1, hi: 0 }], pulsar: [{ t: 0, d: 40, lo: 0.3, hi: 0 }] },
  };
  const portada = () => { const S = A.core && A.core.S; return !!(S && S.phase === "title" && (S.hub == null || S.hub === "home") && !S.settingsOpen && document.querySelector("#dlg .hh")); };
  /* que materia hay bajo el puntero: una pieza (el elemento) o el tapete; null = nada que suene (otros controles, el crupier, el gato) */
  function materia(t) {
    if (!t || !t.closest || !portada()) return null;
    if (t.closest("#dealer, .dealer, .comodin, [id^=cmd], #setSh, .tt, #uiTip")) return null;
    for (const [m, sel] of MAT_SEL) { const el = t.closest(sel); if (el && el.closest("#dlg")) return { m, el }; }
    if (t.closest("button, a[href], input, select, label, [role=button], .hh-ver")) return null;
    return { m: "fieltro", el: null };
  }
  let hovEl = undefined, ptr = "mouse";
  function pasar(e) {
    if (ptr !== "mouse" || !lounge()) return;
    const mt = materia(e.target), key = mt ? mt.el || "tapete" : null;
    if (key === hovEl) { if (mt) sup.hov = now() + 60; return; }
    hovEl = key; if (!mt) return;
    sup.hov = now() + 60;                                               // el sonido de interfaz de esta pieza (menuHover, hover) se calla: suena su materia
    if (A.sfx && A.sfx.mat) A.sfx.mat(mt.m, "pasar", e.clientX);
    hp(MAT_PUL[mt.m].pasar, { movil: false, k: 1 });
  }
  function pulsar(e) {
    if (!lounge() || (e.button != null && e.button !== 0)) return;
    const mt = materia(e.target); if (!mt) return;
    sup.clk = now() + 700;                                              // y al pulsar, su golpe sustituye a la ficha (ui/card) o al tapete de siempre (felt)
    if (A.sfx && A.sfx.mat) A.sfx.mat(mt.m, "pulsar", e.clientX);
    hp(MAT_PUL[mt.m].pulsar, { movil: false, k: 1 });
  }
  /* en la ventana y en captura: antes que los oyentes de la interfaz (js/game.js escucha en el documento) */
  addEventListener("pointerover", e => { ptr = e.pointerType || "mouse"; }, true);
  addEventListener("mouseover", pasar, true);
  addEventListener("pointerdown", pulsar, true);

  function monta() { familias(); if (A.crupier) A.crupier.onFrame = onFrame; }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", monta); else monta();
})(window.AIQ);
