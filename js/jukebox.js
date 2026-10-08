/* Geolite · jukebox: navegador de canciones. Un aviso discreto aparece al cambiar de cancion (con flechas para ir a la anterior o a la siguiente)
 * y el mismo control vive en Ajustes > Sonido. Con la musica desactivada no aparece nunca. Teclas: <- / -> mientras el aviso esta visible. */
(() => {
  "use strict";
  const A = window.AIQ = window.AIQ || {};
  let el = null, tm = 0, hover = false;
  const S = () => (A.core && A.core.S) || {};
  const musicOn = () => A.audio && A.audio.musicOn;

  function build() {
    el = document.createElement("div"); el.id = "np"; el.className = "np"; el.setAttribute("role", "group");
    el.innerHTML = `<button type="button" class="np-b" data-d="-1" data-tf="songprev"><i class="np-tri l"></i></button>
      <span class="np-t"><i class="np-note">♪</i><b id="npT"></b><em id="npN"></em></span>
      <button type="button" class="np-b" data-d="1" data-tf="songnext"><i class="np-tri r"></i></button>`;
    document.body.appendChild(el); if (A.ariaSync) A.ariaSync();                  // nombre accesible de las flechas, en el idioma del juego
    el.addEventListener("click", e => { const b = e.target.closest(".np-b"); if (b) step(+b.dataset.d); });
    el.addEventListener("pointerenter", () => { hover = true; clearTimeout(tm); });
    el.addEventListener("pointerleave", () => { hover = false; arm(1600); });
  }
  function step(d) {
    if (!musicOn()) return; A.audio.unlock(); if (A.sfx && A.sfx.ui) A.sfx.ui();
    if (d < 0) A.music.prev(); else A.music.next();
  }
  function arm(ms) { clearTimeout(tm); tm = setTimeout(() => { if (!hover) el.classList.remove("show"); }, ms); }
  function fill(box) {
    const n = A.music.count(), i = A.music.index();
    const t = box.querySelector("[data-np-t], #npT"), c = box.querySelector("[data-np-n], #npN");
    if (t) t.textContent = A.music.title(); if (c) c.textContent = i >= 0 ? (i + 1) + "/" + n : "";
  }
  function show() {
    if (!musicOn() || S().songToast === false || S().settingsOpen || A.music.index() < 0) return;
    if (!el) build(); fill(el); el.classList.remove("show"); A.restyle(el); el.classList.add("show"); arm(4600);
  }
  /* control equivalente dentro de Ajustes */
  function sync() {
    const box = document.getElementById("setSong"); if (!box) return;
    box.classList.toggle("off", !musicOn()); box.querySelectorAll(".np-b").forEach(b => (b.disabled = !musicOn())); fill(box);
    if (musicOn() && A.music.index() < 0) { const t = box.querySelector("[data-np-t]"); if (t) t.textContent = "—"; }
  }
  A.jukebox = { show, sync, hide: () => { if (el) el.classList.remove("show"); } };
  A.music.onChange = () => { if (el && !musicOn()) el.classList.remove("show"); show(); sync(); };

  document.addEventListener("click", e => { const b = e.target.closest("#setSong .np-b"); if (b && !b.disabled) step(+b.dataset.d); });
  document.addEventListener("keydown", e => {
    if (!el || !el.classList.contains("show") || e.target.tagName === "INPUT" || e.ctrlKey || e.metaKey || e.altKey || (A.codex && A.codex.isOpen && A.codex.isOpen()) || document.getElementById("ptLb")) return;   // en la Enciclopedia y en el visor de capturas las flechas son suyas
    const sa = A.keys ? (A.keys.match("songPrev", e) ? -1 : A.keys.match("songNext", e) ? 1 : 0) : (e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0);   // v0.3.2: teclas de Ajustes > Controles
    if (sa) { e.preventDefault(); e.stopPropagation(); step(sa); }
  }, true);
})();
