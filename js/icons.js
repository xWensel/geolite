/*
 * Geolite - iconos (v0.15): ilustraciones pixel art casino generadas con un unico libro de estilo (tools/gen_art.py) en assets/icons/.
 * Uso: A.icon("sonar") -> <img class="ic">.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  A.blind = (kind, inner) => `<span class="ic blindchip">${A.icon("blank_" + kind, "bc-base")}${A.icon(inner, "bc-in")}</span>`;
  /* Los iconos son ilustraciones pixel-art generadas con un unico libro de estilo (tools/gen_art.py) en assets/icons/.
     Si falta alguno, simplemente no se pinta. */
  const ALIAS = {};
  const VISTE = { dealer_mini: 1, dealer_mini_s: 1 };   // la cabeza del crupier: con la ropa que lleve (js/vestuario.js)
  A.icon = (id, cls = "") => {
    id = ALIAS[id] || id;
    const fx = A.ficha ? A.ficha.attr(id) : "";   // ficha lisa: se dibuja al pixel real de la pantalla (js/ficha.js)
    if (fx) A.ficha.soon();
    const def = `assets/icons/${id}.webp`, viste = VISTE[id] && A.crupierArt;
    return `<img class="ic ic-${id} ${fx ? "ic-fx " : ""}${cls}" src="${viste ? A.crupierArt(id, def) : def}"${VISTE[id] ? ` data-cart="${id}" data-cdef="${def}"` : ""} alt="" draggable="false" decoding="${fx ? "sync" : "async"}"${fx}>`;
  };
  A._icErr = im => { im.style.visibility = "hidden"; };
  /* v0.3.235: sin onerror="..." en el HTML (la Content-Security-Policy no deja manejadores en linea): un solo oyente en captura (error y load de
     <img> no burbujean, pero si pasan por la fase de captura) para todos los iconos, los de ahora y los que se inserten despues */
  document.addEventListener("error", e => { const im = e.target; if (im && im.tagName === "IMG" && im.classList.contains("ic")) A._icErr(im); }, true);
  document.addEventListener("load", e => { const im = e.target; if (im && im.tagName === "IMG" && im.classList.contains("ic-fx") && A.ficha && A.ficha.see) A.ficha.see(im); }, true);   // la ficha lisa se dibuja al pixel real (js/ficha.js; antes onload="")

  /* pinta los iconos declarados en el HTML: <i data-ic="u_plus"></i> */
  A.iconize = (root = document) => root.querySelectorAll("[data-ic]").forEach(el => { if (!el.firstChild) el.innerHTML = A.icon(el.dataset.ic); });
  /* logro -> ilustracion: cada logro tiene la suya (assets/icons/ach_<id>.webp, tools/gen_art.py): Steam pide un icono por logro.
     Aqui solo irian excepciones; sin entrada se usa ach_<id>. */
  A.ACH_ICON = {};
  A.achIcon = id => A.ACH_ICON[id] || "ach_" + id;
  /* insignia de logro: ficha del color de su modo (rojo preguntas, azul Clasico, turquesa Enciclopedia, naranja Aventura, oro Reto diario)
     + la ilustracion encima, un poco mas grande que el hueco de la ficha (igual que el icono de Steam: tools/steam_icons.py) */
  A.ACH_FRAME = { q: "blank_boss", level: "blank_boss", classic: "blank_small", codex: "blank_teal", adv: "blank_big", daily: "blank_gold", casino: "blank_green", dealer: "blank_boss" };
  A.badge = (achId, cls = "") => {
    const a = A.ACH.find(x => x.id === achId);
    return `<span class="ic badge ${cls}">${A.icon(A.ACH_FRAME[a && a.ev] || "blank_boss", "bd-base")}${A.icon(A.achIcon(achId), "bd-in")}</span>`;
  };
  /* iconos como imagen CSS (--ic-nombre) para decorar con ::before/::after */
  A.iconVars = () => {};
  A.iconVars(); A.iconize();
})(window.AIQ);
