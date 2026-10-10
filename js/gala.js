/* Geolite - NAIPE DE GALA (v0.3.35): la fisica comun de capas y modales del sistema nuevo (css/gala.css).
   Una sola manera de entrar y de salir: entra con clase .gx-in (Foco con movimiento mixto) y sale con .gx-out en 0,18 s; el foco del teclado
   y del mando empieza en la accion segura ([data-primary] o .gx-safe), Tab no se escapa de la capa y, al cerrarla, vuelve a donde estaba.
   Las pantallas se pasan al sistema una a una: hoy lo usa la pausa (js/game.js, veilMenu). */
window.AIQ = window.AIQ || {};
(function (A) {
  const OUT_MS = 180;
  const reduced = () => document.documentElement.classList.contains("reduce-motion");
  const focusables = root => [...root.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])")].filter(el => el.offsetParent !== null || el === document.activeElement);

  /* abre una capa ya montada: anima la entrada, coloca el foco y atrapa Tab. Devuelve un objeto para cerrarla */
  function enter(layer, opts = {}) {
    const back = document.activeElement;
    layer.classList.remove("gx-out"); layer.classList.add("gx-layer");
    A.restyle ? (layer.classList.remove("gx-in"), A.restyle(layer), layer.classList.add("gx-in")) : layer.classList.add("gx-in");
    const first = opts.focus || layer.querySelector("[data-primary]") || layer.querySelector(".gx-safe") || focusables(layer)[0];
    if (first) setTimeout(() => { if (layer.isConnected && !layer.classList.contains("gx-out")) first.focus({ preventScroll: true }); }, 60);
    const onKey = e => {
      if (e.key !== "Tab") return;
      const f = focusables(layer); if (!f.length) return;
      const i = f.indexOf(document.activeElement), n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i < 0 || i >= f.length - 1 ? 0 : i + 1);
      e.preventDefault(); f[n].focus({ preventScroll: true });
    };
    layer.addEventListener("keydown", onKey);
    let closed = false;
    return {
      /* sale en 0,18 s (al momento con Reducir movimiento) y luego llama a done(); el foco vuelve a donde estaba si sigue en pantalla */
      close(done) {
        if (closed) return; closed = true; layer.removeEventListener("keydown", onKey);
        const fin = () => { layer.classList.remove("gx-in", "gx-out"); if (done) done(); if (back && back.isConnected && back.focus && !opts.noRestore) try { back.focus({ preventScroll: true }); } catch (e) { /* nada */ } };
        if (reduced()) return fin();
        layer.classList.remove("gx-in"); layer.classList.add("gx-out"); setTimeout(fin, OUT_MS);
      },
    };
  }
  /* precalentamiento (v0.3.35): la primera vez que la GPU pinta estas superficies y su entrada compila sus shaders (~80 ms, un tiron en la
     primera pausa de una instalacion nueva; luego quedan en la cache del disco). Se pinta una muestra animada, casi invisible, una vez,
     cuando la pantalla esta quieta (la puerta de entrada) */
  let warmed = false;
  function warm() {
    if (warmed || reduced()) return; warmed = true;
    const w = document.createElement("div"); w.setAttribute("aria-hidden", "true"); w.inert = true;
    w.style.cssText = "position:fixed;inset:0;opacity:.02;pointer-events:none;z-index:2147483000";
    const abc = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnÑñOoPpQqRrSsTtUuVvWwXxYyZz ÁáÉéÍíÓóÚúÜü¿?¡!·/.,:%+-0123456789";   // los glifos tambien se rasterizan la primera vez, a cada tamano
    w.innerHTML = `<div class="gx-pause gx-layer gx-in"><div class="gx-veil"></div><div class="gx-spot"></div><div class="gx-stage"><div class="gx-grid"><div class="gx-sh gx-railw gx-from-left"><section class="gx-pnl gx-rail">
      <div class="gx-head"><span class="gx-eyb">${abc}</span><h2 class="gx-t-l">${abc}</h2><p class="gx-lead">${abc}</p></div><div class="gx-paper"><div class="gx-lead-row"><span>${abc}</span><s></s><b>0 <small>/ 1</small></b></div><div class="gx-bar"><i style="width:40%"></i></div></div>
      <div class="gx-acts col"><button class="gx-btn pri wide" tabindex="-1">${abc} <span class="gx-k"><kbd class="k-kb">Esc</kbd></span></button><button class="gx-btn wide" tabindex="-1">${abc}</button></div>
      <div class="gx-foot"><div class="gx-hr"></div><div class="gx-acts"><button class="gx-btn gho sm" tabindex="-1">${abc}</button></div><p class="gx-note">${abc}</p></div></section></div></div></div></div>`;
    document.body.appendChild(w); setTimeout(() => w.remove(), 900 + 5 * 400);
    /* v0.3.41: cada pieza en su propio momento (las tres a la vez paraban el fundido de la puerta): el Perfil (fichas, papel grande y su sombra)
       a los 400 ms, Ajustes a los 800 y el Reto diario a los 1.200: cada una en su momento, sin juntar sus parones */
    setTimeout(() => { try { if (w.isConnected && A.hub && A.hub.profileHtml) w.insertAdjacentHTML("beforeend", `<div style="position:absolute;inset:0">${A.hub.profileHtml()}</div>`); } catch (e) { /* sin perfil aun */ } }, 400);
    /* v0.3.45: y el Reto diario de hoy (sus esquinas de pixel se recortan la primera vez a su medida: su primera apertura perdia ~24 fotogramas) */
    setTimeout(() => { try { if (w.isConnected && A.hub && A.hub.dailyHtml) w.insertAdjacentHTML("beforeend", `<div style="position:absolute;inset:0">${A.hub.dailyHtml()}</div>`); } catch (e) { /* sin reto aun */ } }, 1200);
    setTimeout(() => { try { if (w.isConnected && A.hub && A.hub.classicHtml) w.insertAdjacentHTML("beforeend", `<div style="position:absolute;inset:0">${A.hub.classicHtml()}</div>`); } catch (e) { /* sin clasico aun */ } }, 1600);   // v0.3.46: y el Clasico
    setTimeout(() => { try { if (w.isConnected && A.hub && A.hub.adventureHtml) w.insertAdjacentHTML("beforeend", `<div style="position:absolute;inset:0">${A.hub.adventureHtml()}</div>`); } catch (e) { /* sin aventura aun */ } }, 2000);   // v0.3.47: y la Aventura
    /* v0.3.38: Ajustes tambien (su primera apertura daba 11 fotogramas perdidos): se pinta el de verdad, casi invisible y sin recibir clics */
    const sh = document.getElementById("setSh");
    if (sh && sh.classList.contains("hidden")) setTimeout(() => {
      if (!sh.classList.contains("hidden")) return;
      sh.style.opacity = ".02"; sh.style.pointerEvents = "none"; sh.classList.remove("hidden");
      setTimeout(() => { sh.style.opacity = ""; sh.style.pointerEvents = ""; if (!(A.core && A.core.S.settingsOpen)) sh.classList.add("hidden"); }, 900);
    }, 800);
  }
  /* v0.3.43: pasar pagina en una lista (Clasificacion, Reto diario). La lista vieja sale hacia un lado y la nueva entra del otro A LA VEZ, solo con
     transform y opacity (la GPU las mueve sin rehacer la pagina) y una curva continua: nada de steps(), que daba saltos de unas 11 imagenes por
     segundo. La copia vieja se pone encima en su sitio exacto (el padre tiene que ser su offsetParent) y se quita al terminar */
  let turnOld = null;
  function turn(list, html, dir) {
    if (turnOld) { turnOld.getAnimations().forEach(a => a.finish()); }                       // pasar rapido: la anterior termina ya
    list.getAnimations().forEach(a => a.cancel());
    const host = list.offsetParent;
    if (reduced() || !list.animate || !host || !list.children.length) { list.innerHTML = html; return; }
    const old = list.cloneNode(true); old.removeAttribute("id"); old.setAttribute("aria-hidden", "true"); old.inert = true; old.classList.add("turned");   // sin la entrada de sus filas (la copia no debe reaparecer)
    old.style.cssText += `;position:absolute;left:${list.offsetLeft}px;top:${list.offsetTop}px;width:${list.offsetWidth}px;height:${list.offsetHeight}px;margin:0;pointer-events:none;z-index:1`;
    host.appendChild(old); turnOld = old;
    list.innerHTML = html; list.classList.add("turned");
    const dx = 56 * dir;
    /* casi en relevo: la vieja ya se ha desvanecido cuando entra la nueva (si se cruzan a media opacidad, los nombres se pisan) */
    old.animate([{ transform: "translateX(0)", opacity: 1 }, { opacity: 0, offset: .5 }, { transform: `translateX(${-dx}px)`, opacity: 0 }], { duration: 170, easing: "cubic-bezier(.5, 0, .9, .5)", fill: "forwards" })
      .onfinish = () => { old.remove(); if (turnOld === old) turnOld = null; };
    list.animate([{ transform: `translateX(${dx}px)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], { duration: 280, delay: 100, easing: "cubic-bezier(.16, .84, .3, 1)", fill: "backwards" });
  }
  /* glifo de la accion: tecla con teclado y boton con mando (css/mando.css decide cual se ve) */
  const keyHint = (kb, pad) => `<span class="gx-k"><kbd class="k-kb">${kb}</kbd>${pad ? `<i class="gl" data-gl="${pad}"></i>` : ""}</span>`;

  A.gala = { enter, keyHint, warm, turn, OUT_MS, get warmed() { return warmed; } };
})(window.AIQ);
