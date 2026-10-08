/*
 * Geolite - ilustraciones (v0.15): las escenas grandes (jefes, actos, campamento, cofre, finales, temas) son pixel art casino
 * generado (tools/gen_art.py) en assets/gen/. Ya no hay versiones vectoriales de respaldo: mientras carga, se ve el marco oscuro.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  A.GEN = new Set();
  A.genReady = fetch("assets/manifest.json").then(r => (r.ok ? r.json() : { gen: [] })).then(m => { A.GEN = new Set(m.gen || []); }).catch(() => {});
  /* En algunos equipos (visto en Electron) el navegador no repinta la capa
   * cuando el src se asigna por JS despues de insertar el <img>: la imagen
   * queda decodificada (complete=true, opacity:1 por CSS) pero invisible
   * hasta el siguiente repintado "de verdad". Forzar un reflow y esperar a
   * decode() + dos rAF antes de tocar el DOM evita que quede huerfana. */
  /* Por tandas: las imagenes que terminan de cargar antes del mismo fotograma
   * comparten los reflows (antes, dos reflows de la pagina entera POR imagen:
   * la Enciclopedia y los menus con muchas ilustraciones iban a tirones). */
  let revQ = null;
  const revFlush = () => {
    const q = revQ; revQ = null;
    void document.body.offsetHeight;
    q.forEach(([im]) => (im.style.transform = "")); void document.body.offsetHeight;
    requestAnimationFrame(() => q.forEach(([, cb]) => cb()));
  };
  A.revealImg = (im, cb) => {
    let done = false;
    const run = () => {
      if (done) return; done = true;
      /* nudge de capa: nada de lo de arriba (decode + reflow + rAF) basta solo
       * en algunos equipos; forzar una promocion/despromocion de capa via
       * transform suele destrabar el pintado "fantasma" que se queda atras. */
      im.style.transform = "translateZ(0)";
      if (!revQ) { revQ = []; requestAnimationFrame(revFlush); }
      revQ.push([im, cb]);
    };
    (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(run);
    im.onload = run;
  };
  A.genFill = (root = document) => A.genReady.then(() => root.querySelectorAll("img[data-gen]:not([src])").forEach(im => {
    if (!A.GEN.has(im.dataset.gen)) return;
    im.src = "assets/gen/" + im.dataset.gen + ".webp";
    A.revealImg(im, () => { im.classList.add("on"); if (im.parentElement) im.parentElement.classList.add("has-gen"); });
  }));
  A.pic = (id, cls = "") => { setTimeout(() => A.genFill(), 0); return `<span class="pic ${cls}"><img class="pic-img" alt="" data-gen="${id}" decoding="async"><i class="pic-frame"></i>${A.bulbs()}</span>`; };
  /* bombillas de marquesina (las de la carta de la Aventura): puntos redondos a lo largo de un rectangulo redondeado. pathLength fijo, asi que
     siempre salen enteras y repartidas por igual, tambien en las esquinas (las antiguas, un fondo de lunares a 20 px, se cortaban en los bordes).
     Capas: casquillo de tinta, cristal apagado y dos tandas encendidas que se turnan. Tamano, margen y densidad por CSS (--mqi, --mqb, --mqd, --mqr) */
  A.bulbs = () => `<svg class="mqb" aria-hidden="true">${["mqb-sk", "mqb-off", "mqb-a", "mqb-a mqb-c", "mqb-b", "mqb-b mqb-c"].map(k => `<rect class="${k}" pathLength="144"/>`).join("")}</svg>`;
  A.art = () => "";
})(window.AIQ);
