/*
 * Geolite - CREDITOS DENTRO DEL JUEGO (v0.2.33). Antes, Ajustes > Datos > Creditos y licencias abria credits.html en el navegador del sistema:
 * en la Steam Deck (Modo Juego) eso te sacaba del juego. Ahora se lee aqui, en un panel como Ajustes: buscador, secciones y la tabla de fotos.
 * El contenido es el mismo credits.html (tools/build-credits.mjs), cargado solo al abrir. Los enlaces se abren fuera en el PC; en la Deck
 * se quedan como texto (no hay navegador al que salir). B / Esc cierra. La tabla lleva data-pad-skip: la cruceta no recorre sus 2.700 filas.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const C = A.creditos = { on: false };
  const DECK = document.documentElement.dataset.dev === "deck";
  let sh = null, body = null, loaded = false, back = null;
  function build() {
    sh = document.createElement("div"); sh.id = "crSh"; sh.className = "cr-sh"; sh.hidden = true; sh.setAttribute("role", "dialog");
    sh.innerHTML = `<header class="cr-top"><button type="button" class="set-back cr-back"><i class="uic" data-ic="u_back"></i><span></span></button>
      <div class="cr-title"><h1></h1></div><label class="cr-q">${A.icon ? A.icon("lens", "sm") : ""}<input type="search" id="crQ" autocomplete="off" spellcheck="false"></label></header>
      <div class="cr-body" tabindex="-1"><div class="cr-in"></div></div>`;
    document.body.appendChild(sh); body = sh.querySelector(".cr-body");
    if (A.iconize) A.iconize(sh);
    sh.querySelector(".cr-back").onclick = () => C.close();
    /* lo que se pulsa aqui es de los creditos: Ajustes (debajo) no lo toma por un clic fuera */
    addEventListener("pointerdown", e => { if (C.on && e.target.closest && e.target.closest("#crSh, #osk")) e.stopPropagation(); }, true);
    addEventListener("keydown", e => { if (C.on && e.key === "Escape" && !(A.teclado && A.teclado.on)) { e.preventDefault(); e.stopImmediatePropagation(); C.close(); } }, true);
    sh.querySelector("#crQ").addEventListener("input", e => {
      const v = e.target.value.trim().toLowerCase();
      sh.querySelectorAll(".cr-in tbody tr").forEach(r => { r.hidden = !!v && !r.textContent.toLowerCase().includes(v); });
    });
  }
  async function load() {
    if (loaded) return; loaded = true;
    const inn = sh.querySelector(".cr-in");
    try {
      const html = await (await fetch("credits.html", { cache: "no-cache" })).text();
      const doc = new DOMParser().parseFromString(html, "text/html"), main = doc.querySelector("main") || doc.body;
      main.querySelectorAll("script, #q, h1").forEach(e => e.remove());
      { const p0 = main.querySelector("p"); if (p0 && /Credits and licenses/i.test(p0.textContent)) p0.remove(); }   // la cabecera del panel ya lo dice
      main.querySelectorAll("table").forEach(t => { t.setAttribute("data-pad-skip", ""); t.classList.add("cr-table"); });
      main.querySelectorAll("a[href]").forEach(a => {
        if (DECK) { const s = doc.createElement("span"); s.className = "cr-a"; s.textContent = a.textContent; a.replaceWith(s); }   // en la Deck no hay a donde ir
        else { a.target = "_blank"; a.rel = "noopener noreferrer"; }                  // en el PC: el navegador del sistema (main.js)
      });
      inn.replaceChildren(...main.childNodes);
    } catch (e) { inn.textContent = "credits.html"; loaded = false; }
  }
  C.open = () => {
    if (!sh) build();
    sh.querySelector(".cr-back span").textContent = A.t("set.close"); sh.querySelector(".cr-title h1").textContent = A.t("set.credits");
    sh.querySelector("#crQ").placeholder = A.t("codex.search");
    back = document.activeElement; sh.hidden = false; A.restyle(sh); sh.classList.add("on"); C.on = true; body.scrollTop = 0; load();
    if (A.mando && A.mando.on && A.mando.goTo) A.mando.goTo(sh.querySelector(".cr-back"));
  };
  C.close = () => {
    if (!sh || !C.on) return; C.on = false; sh.classList.remove("on"); if (A.sfx && A.sfx.ui) A.sfx.ui();
    setTimeout(() => { if (!C.on) sh.hidden = true; }, 180);
    if (back && back.isConnected && back.focus) back.focus({ preventScroll: true });
  };
})(window.AIQ);
