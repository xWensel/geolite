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
     Capas: casquillo de tinta y cristal apagado (fijos) y tres tandas encendidas, cada una en su propio svg: solo cambia su opacidad, asi el
     compositor las enciende sin repintar nada. v0.3.52 (la casa): persecucion de tres pasos con un solo reloj para todas las bombillas del juego
     (A.casa.MQ_P); --mq-s las pone en fase con el reloj del documento al nacer. Tamano, margen y densidad por CSS (--mqi, --mqb, --mqr) */
  A.bulbs = () => { const P = (A.casa && A.casa.MQ_P) || 1140, now = performance.now(), s = -Math.round(now % P), r = k => `<rect class="${k}" pathLength="144"/>`;
    return `<span class="mqw" aria-hidden="true" style="--mq-s:${s}ms;--mq-j:${-Math.round(now % 1000)}ms"><svg class="mqb mq-base">${r("mqb-sk")}${r("mqb-off")}</svg>${[1, 2, 3].map(k => `<svg class="mqb mq-lit l${k}">${r("mqb-on mqb-h2")}${r("mqb-on mqb-h1")}${r("mqb-on")}${r("mqb-on mqb-c")}</svg>`).join("")}</span>`; };
  A.art = () => "";
})(window.AIQ);
