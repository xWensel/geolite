/* Geolite · jukebox: navegador de canciones. Un aviso discreto aparece al cambiar de cancion (con flechas para ir a la anterior o a la siguiente)
 * y el mismo control vive en Ajustes > Sonido. Con la musica desactivada no aparece nunca. Teclas: <- / -> mientras el aviso esta visible.
 * Bloque J: el aviso es el mismo papel que el de logro y sale en las mismas zonas (A.ach.zone, js/profile.js): sobre el lema en la portada, en el
 * centro de la cabecera de cada pantalla, bajo la placa en partida. Si hay un logro a la vista, espera a que se recoja. */
(() => {
  "use strict";
  const A = window.AIQ = window.AIQ || {};
  let el = null, tm = 0, hover = false, wait = 0, waits = 0;
  const SONG = "Canción|Song|Chanson|Música|Song|Brano||歌曲|곡|曲|Песня|Utwór";
  const S = () => (A.core && A.core.S) || {};
  const musicOn = () => A.audio && A.audio.musicOn;

  function build() {
    el = document.createElement("div"); el.id = "np"; el.className = "np"; el.setAttribute("role", "group");
    el.innerHTML = `<button type="button" class="np-b" data-d="-1" data-tf="songprev"><i class="np-tri l"></i></button>
      <span class="np-t"><em class="np-eb"><i class="np-note">♪</i><span id="npL"></span><span id="npN"></span></em><b id="npT"></b></span>
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
  function arm(ms) { clearTimeout(tm); tm = setTimeout(() => { if (!hover) hide(); }, ms); }
  function hide() { if (el) el.classList.remove("show"); if (!(A.ach && A.ach.busy && A.ach.busy())) document.body.classList.remove("ach-title"); }
  /* a su zona de avisos, en px de pantalla */
  function slot() {
    const z = A.ach && A.ach.zone ? A.ach.zone() : null, st = el.style; if (!z) return;
    el.dataset.zone = z.sig; st.right = st.bottom = "auto"; st.width = Math.round(z.w) + "px";
    document.body.classList.toggle("ach-title", z.sig === "camp");                // en el Campamento ocupa el sitio del titulo, que se aparta mientras dura
    let y = z.y;
    if (z.cy != null) y = z.cy - el.offsetHeight / 2;
    else if (z.run) { const pl = document.getElementById("plate"); y = pl ? pl.getBoundingClientRect().bottom + 10 : z.y; }
    st.left = Math.round(z.x) + "px"; st.top = Math.round(y) + "px";
  }
  function fill(box) {
    const n = A.music.count(), i = A.music.index();
    const t = box.querySelector("[data-np-t], #npT"), c = box.querySelector("[data-np-n], #npN"), l = box.querySelector("#npL");
    if (t) t.textContent = A.music.title(); if (c) c.textContent = i >= 0 ? (box === el ? " · " : "") + (i + 1) + (box === el ? " / " : "/") + n : ""; if (l) l.textContent = A.pick6(SONG);
  }
  function show() {
    if (!musicOn() || S().songToast === false || S().settingsOpen || A.music.index() < 0) return;
    if (A.ach && A.ach.busy && A.ach.busy()) { clearTimeout(wait); if (++waits < 30) wait = setTimeout(show, 500); return; }       // un logro a la vista: la cancion espera a que se recoja
    waits = 0; clearTimeout(wait);
    if (!el) build(); fill(el); el.classList.remove("show"); A.restyle(el); slot(); el.classList.add("show"); arm(4600);
  }
  /* control equivalente dentro de Ajustes */
  function sync() {
    const box = document.getElementById("setSong"); if (!box) return;
    box.classList.toggle("off", !musicOn()); box.querySelectorAll(".np-b").forEach(b => (b.disabled = !musicOn())); fill(box);
    if (musicOn() && A.music.index() < 0) { const t = box.querySelector("[data-np-t]"); if (t) t.textContent = "—"; }
  }
  A.jukebox = { show, sync, hide };
  A.music.onChange = () => { if (el && !musicOn()) hide(); waits = 0; show(); sync(); };

  document.addEventListener("click", e => { const b = e.target.closest("#setSong .np-b"); if (b && !b.disabled) step(+b.dataset.d); });
  document.addEventListener("keydown", e => {
    if (!el || !el.classList.contains("show") || e.target.tagName === "INPUT" || e.ctrlKey || e.metaKey || e.altKey || (A.codex && A.codex.isOpen && A.codex.isOpen()) || document.getElementById("ptLb")) return;   // en la Enciclopedia y en el visor de capturas las flechas son suyas
    const sa = A.keys ? (A.keys.match("songPrev", e) ? -1 : A.keys.match("songNext", e) ? 1 : 0) : (e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0);   // v0.3.2: teclas de Ajustes > Controles
    if (sa) { e.preventDefault(); e.stopPropagation(); step(sa); }
  }, true);
})();
