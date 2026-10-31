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
  let sh = null, body = null, loaded = false, back = null, ixEl = null, cur = 0, groups = [];
  /* J9 (Bloque J): cabecera estandar (Cerrar con Esc y titulo), indice de secciones a la izquierda y papel a la derecha. SOLO la piel y la estructura:
     el contenido es el de credits.html (el texto definitivo es de otro bloque). Textos del indice: es | en | fr | pt | de | it | es-419 | zh | ko | ja | ru | pl */
  const IX = [
    "Juego|Game|Jeu|Jogo|Spiel|Gioco||游戏|게임|ゲーム|Игра|Gra",
    "Banda sonora|Soundtrack|Bande originale|Trilha sonora|Soundtrack|Colonna sonora||原声音乐|사운드트랙|サウンドトラック|Саундтрек|Ścieżka dźwiękowa",
    "Efectos de sonido|Sound effects|Effets sonores|Efeitos sonoros|Soundeffekte|Effetti sonori||音效|효과음|効果音|Звуковые эффекты|Efekty dźwiękowe",
    "Fotos|Photos|Photos|Fotos|Fotos|Foto||照片|사진|写真|Фото|Zdjęcia",
    "Mapas y datos|Maps and data|Cartes et données|Mapas e dados|Karten und Daten|Mappe e dati||地图与数据|지도와 데이터|地図とデータ|Карты и данные|Mapy i dane",
    "Letras|Fonts|Polices|Fontes|Schriften|Caratteri||字体|글꼴|フォント|Шрифты|Czcionki",
    "Licencias|Licenses|Licences|Licenças|Lizenzen|Licenze||许可|라이선스|ライセンス|Лицензии|Licencje",
  ];
  /* a que entrada del indice va cada seccion de credits.html (por su titulo): Texto de la Enciclopedia = Licencias (CC BY-SA), banderas = Fotos */
  const GROUP = [[/^game/i, 0], [/^soundtrack/i, 1], [/^sound effects/i, 2], [/^photos|^flags/i, 3], [/^map data/i, 4], [/^fonts/i, 5], [/^encyclopedia/i, 6]];
  const ixName = i => A.pick6(IX[i]);
  function build() {
    sh = document.createElement("div"); sh.id = "crSh"; sh.className = "cr-sh"; sh.hidden = true; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true");
    sh.innerHTML = `<div class="gx-veil cr-veil"></div><section class="gx-stage cr-stage"><div class="gx-grid cr-grid">
      <header class="cr-top"><button type="button" class="gx-btn sm cr-back">${A.icon("u_back")}<span></span>${A.gala.keyHint("Esc", "b")}</button>
        <h1 class="gx-t-l cr-title"></h1><label class="cr-q">${A.icon ? A.icon("lens", "sm") : ""}<input type="search" id="crQ" autocomplete="off" spellcheck="false"></label></header>
      <nav class="cr-ix" id="crIx"></nav>
      <div class="gx-sh cr-pw"><div class="gx-paper cr-paper"><div class="cr-body" tabindex="-1"><div class="cr-in"></div></div></div></div>
    </div></section>`;
    document.body.appendChild(sh); body = sh.querySelector(".cr-body"); ixEl = sh.querySelector("#crIx");
    sh.querySelector(".cr-back").onclick = () => C.close();
    ixEl.addEventListener("click", e => { const b = e.target.closest(".pf-ix"); if (b) pick(+b.dataset.i); });
    /* lo que se pulsa aqui es de los creditos: Ajustes (debajo) no lo toma por un clic fuera */
    addEventListener("pointerdown", e => { if (C.on && e.target.closest && e.target.closest("#crSh, #osk")) e.stopPropagation(); }, true);
    addEventListener("keydown", e => { if (C.on && e.key === "Escape" && !(A.teclado && A.teclado.on)) { e.preventDefault(); e.stopImmediatePropagation(); C.close(); } }, true);
    sh.querySelector("#crQ").addEventListener("input", e => {
      const v = e.target.value.trim().toLowerCase();
      sh.querySelectorAll(".cr-in tbody tr").forEach(r => { r.hidden = !!v && !r.textContent.toLowerCase().includes(v); });
      if (v && cur !== 3 && groups[3]) pick(3);                                       // buscar es buscar en las fotos y las banderas
    });
  }
  /* el indice: una entrada por seccion (Fotos lleva su cifra) */
  function drawIx() {
    if (!ixEl) return;
    ixEl.innerHTML = IX.map((_, i) => `<button type="button" class="pf-ix${i === cur ? " on" : ""}" data-i="${i}"><span>${ixName(i)}</span>${groups[i] && groups[i].n ? `<i>${A.fmt ? A.fmt(groups[i].n) : groups[i].n}</i>` : ""}</button>`).join("");
  }
  function pick(i) {
    cur = i; ixEl.querySelectorAll(".pf-ix").forEach((b, k) => b.classList.toggle("on", k === i)); sh.querySelectorAll(".cr-sec").forEach(e => { e.hidden = +e.dataset.i !== i; }); body.scrollTop = 0;
    if (A.sfx && A.sfx.ui) A.sfx.ui();
  }
  /* la banda sonora en columna: "01. Titulo (genero, 1:30)" -> numero y titulo a la izquierda, genero y duracion alineados a la derecha */
  function songs(ul) {
    const rows = [...ul.children].map(li => { const m = /^(\d+)\.\s+(.+?)\s+\(([^()]*?),\s*([\d:]+)\)\s*$/.exec(li.textContent.trim()); return m ? `<div class="gx-lead-row"><span>${m[1]} · ${esc(m[2])}</span><s></s><b>${esc(m[3])} · ${m[4]}</b></div>` : null; });
    if (rows.length && rows.every(Boolean)) { const d = document.createElement("div"); d.className = "cr-songs"; d.innerHTML = rows.join(""); ul.replaceWith(d); }
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  async function load() {
    if (loaded) return; loaded = true;
    const inn = sh.querySelector(".cr-in");
    try {
      const resp = await fetch("credits.html", { cache: "no-cache" }); if (!resp.ok) throw new Error("credits.html " + resp.status);
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, "text/html"), main = doc.querySelector("main") || doc.body;
      main.querySelectorAll("script, #q, h1").forEach(e => e.remove());
      { const p0 = main.querySelector("p"); if (p0 && /Credits and licenses/i.test(p0.textContent)) p0.remove(); }   // la cabecera del panel ya lo dice
      main.querySelectorAll("table").forEach(t => { t.setAttribute("data-pad-skip", ""); t.classList.add("cr-table"); });
      main.querySelectorAll("a[href]").forEach(a => {
        if (DECK) { const s = doc.createElement("span"); s.className = "cr-a"; s.textContent = a.textContent; a.replaceWith(s); }   // en la Deck no hay a donde ir
        else { a.target = "_blank"; a.rel = "noopener noreferrer"; }                  // en el PC: el navegador del sistema (main.js)
      });
      /* secciones: cada h2 abre la suya; las que no encajan en ninguna entrada se unen a la anterior */
      groups = IX.map(() => ({ el: null, n: 0 })); let g = 0;
      for (const n of [...main.childNodes]) {
        if (n.nodeName === "H2") { const h = GROUP.find(([re]) => re.test(n.textContent.trim())); if (h) g = h[1]; const c = n.querySelector(".n"), m = c && /\d+/.exec(c.textContent); if (m && g === 3 && /^photos/i.test(n.textContent.trim())) groups[3].n = +m[0]; }
        if (!groups[g].el) { const e = doc.createElement("div"); e.className = "cr-sec"; e.dataset.i = g; e.hidden = g !== cur; groups[g].el = e; }
        groups[g].el.appendChild(n);
      }
      groups.forEach(x => { if (x.el) x.el.querySelectorAll("ul").forEach(songs); });
      if (A.huevos && A.huevos.creditos && groups[0] && groups[0].el) A.huevos.creditos(groups[0].el);   // huevo: la linea de Don Crupier
      inn.replaceChildren(...groups.filter(x => x.el).map(x => x.el)); drawIx();
    } catch (e) { inn.textContent = "credits.html"; loaded = false; }
  }
  C.open = () => {
    if (!sh) build();
    sh.querySelector(".cr-back span").textContent = A.t("set.close"); sh.querySelector(".cr-title").textContent = A.t("set.credits"); drawIx();
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
