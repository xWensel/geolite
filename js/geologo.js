/*
 * Geolite - EL LOGO (v0.3.130): rotulo de marquesina, la Tierra girando (56 fotogramas, empieza en Espana-Africa),
 * la carta con la ficha y la chistera siempre encima. Lo usan la portada (.hh-logo) y la pantalla de entrada (#gateLogo).
 *
 * Arte: assets/logo/ (capas sacadas de geolite-art-tools/pixellab/logo/capas; el fijo, assets/logo.png, es el fotograma 0).
 * Se pinta en un lienzo a la resolucion real de la pantalla: a escala ENTERA si cabe (pixel nitido) y, si no cabe, reducido
 * con suavizado de calidad (nunca un estirado borroso). El hueco lo pone la caja (.geo-logo) con su CSS; el lienzo va dentro.
 * Con Movimiento: Minimo (clase reduce-motion) la Tierra se queda quieta. Sin pantalla a la vista no se pinta nada.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const W = 679, H = 232;                                    // el logo entero (caja comun de todas las capas)
  const CAPAS = { rot: ["assets/logo/rotulo.png", 0, 47], tierra: ["assets/logo/tierra.png", 212, 61], carta: ["assets/logo/carta.png", 304, 20], chis: ["assets/logo/chistera.png", 206, 0] };
  const N = 56, FS = 144;                                    // fotogramas de la Tierra (tira de 144x144)
  const DUR = i => (i >= 1 && i <= 15 ? 90 : 70);            // el tramo Espana -> Pacifico va un poco mas lento (mismos tiempos que la prueba aprobada)
  const img = {}; let ready = null;
  const load = () => ready || (ready = Promise.all(Object.entries(CAPAS).map(([k, [src]]) => new Promise(res => {
    const im = new Image(); im.onload = () => { img[k] = im; res(); }; im.onerror = () => res(); im.src = src;
  }))));
  const quieto = () => document.documentElement.classList.contains("reduce-motion");
  const vivos = new Set();                                   // lienzos montados
  let f = 0, acc = 0, last = 0, raf = 0;

  /* la resolucion del lienzo sale de la caja a la vista (incluye el zoom de la portada) y de los pixeles reales de la pantalla */
  function ajusta(cv) {
    const box = cv.parentElement; if (!box) return;
    const r = box.getBoundingClientRect(); if (!r.width || !box.offsetWidth) return;
    const k = r.width / box.offsetWidth, dpr = window.devicePixelRatio || 1;
    const s = (Math.min(r.width, r.height * W / H) * dpr) / W;
    const sc = s >= 1 ? Math.floor(s) : s;                   // entero si cabe; si no, reduccion suave
    const bw = Math.max(1, Math.round(W * sc)), bh = Math.max(1, Math.round(H * sc));
    cv.width = bw; cv.height = bh; cv._sc = bw / W;
    cv.style.width = bw / dpr / k + "px"; cv.style.height = bh / dpr / k + "px";
    cv.style.imageRendering = sc >= 1 ? "pixelated" : "auto";
    // capas fijas ya escaladas: detras (rotulo) y delante (carta y chistera)
    const capa = keys => { const o = document.createElement("canvas"); o.width = bw; o.height = bh; const c = o.getContext("2d");
      c.imageSmoothingEnabled = sc < 1; c.imageSmoothingQuality = "high";
      for (const kk of keys) { const im = img[kk]; if (im) c.drawImage(im, Math.round(CAPAS[kk][1] * cv._sc), Math.round(CAPAS[kk][2] * cv._sc), Math.round(im.width * cv._sc), Math.round(im.height * cv._sc)); }
      return o; };
    cv._back = capa(["rot"]); cv._front = capa(["carta", "chis"]); cv._f = -1;
  }

  function pinta(cv) {
    if (cv._f === f || !cv._back) return; cv._f = f;
    const c = cv.getContext("2d"), s = cv._sc, t = img.tierra;
    c.clearRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = s < 1; c.imageSmoothingQuality = "high";
    c.drawImage(cv._back, 0, 0);
    if (t) c.drawImage(t, f * FS, 0, FS, FS, Math.round(CAPAS.tierra[1] * s), Math.round(CAPAS.tierra[2] * s), Math.round(FS * s), Math.round(FS * s));
    c.drawImage(cv._front, 0, 0);
  }

  function tick(now) {
    raf = 0;
    for (const cv of vivos) if (!cv.isConnected) vivos.delete(cv);
    if (!vivos.size) return;
    if (quieto()) { f = 0; acc = 0; vivos.forEach(pinta); return; }          // quieta en Espana-Africa; vuelve a girar al cambiar el ajuste
    const dt = last ? Math.min(250, now - last) : 0; last = now; acc += dt;
    while (acc >= DUR(f)) { acc -= DUR(f); f = (f + 1) % N; }
    vivos.forEach(pinta);
    if (!document.hidden) raf = requestAnimationFrame(tick);
  }
  const arranca = () => { if (!raf && vivos.size) { last = 0; raf = requestAnimationFrame(tick); } };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) arranca(); });
  new MutationObserver(arranca).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  let rt = 0; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => vivos.forEach(cv => { ajusta(cv); pinta(cv); }), 120); });

  /* monta el logo dentro de una caja (.geo-logo). Lo que hubiera dentro (la imagen fija) se queda hasta que el lienzo esta listo */
  function mount(box) {
    if (!box) return;
    load().then(() => requestAnimationFrame(() => {
      if (!box.isConnected) return;
      const cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true");
      box.replaceChildren(cv); ajusta(cv); pinta(cv); vivos.add(cv); arranca();
      /* la entrada del logo (logo-in) lo gira y lo desplaza: medido a mitad saldria mas grande de lo que es. Al acabar, se vuelve a medir */
      const anim = box.getAnimations ? box.getAnimations().filter(a => a.playState === "running" && a.effect && a.effect.getTiming().iterations !== Infinity) : [];
      if (anim.length) Promise.all(anim.map(a => a.finished.catch(() => 0))).then(() => { if (cv.isConnected) { ajusta(cv); pinta(cv); } });
      /* la caja puede estar oculta al montar (la entrada sale despues de la intro) o cambiar de tamano: se reajusta al verse o crecer.
         El lienzo va dentro y no mueve la caja (su medida es la del CSS), asi que esto no se realimenta */
      if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (!cv.isConnected) { ro.disconnect(); return; } ajusta(cv); pinta(cv); }); ro.observe(box); }
      /* la portada se escala con zoom (--k, A.fitK): eso no cambia la medida CSS de la caja, asi que se mira el estilo de quien lleva la k */
      const zk = box.closest(".hh"); if (zk) { const mo = new MutationObserver(() => { if (!cv.isConnected) { mo.disconnect(); return; } ajusta(cv); pinta(cv); }); mo.observe(zk, { attributes: true, attributeFilter: ["style"] }); }
    }));
  }
  A.geoLogo = { mount, load };

  /* la pantalla de entrada: su imagen fija pasa a ser el logo vivo en cuanto cargan las capas */
  const gate = () => {
    const g = document.getElementById("gateLogo"), im = g && g.querySelector(":scope > img"); if (!im) return;
    const box = document.createElement("div"); box.className = "geo-logo"; box.setAttribute("role", "img"); box.setAttribute("aria-label", "Geolite");
    im.alt = ""; im.replaceWith(box); box.appendChild(im); mount(box);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", gate); else gate();
})(window.AIQ);
