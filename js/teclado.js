/*
 * Geolite - TECLADO EN PANTALLA (v0.2.31). Escribir con mando en las tres casillas de texto (el nombre que pide el crupier, el de Ajustes
 * y el buscador de la Enciclopedia):
 *  1. el teclado de Steam: el flotante (escribe directamente en la casilla) o, si no, el de Big Picture (devuelve el texto);
 *  2. si Steam no puede (PC sin Big Picture o sin Steam): el teclado del crupier, pixel art, que se recorre con la cruceta o el stick.
 *     Letras, tildes y letras de todos los idiomas latinos, y cirilico en ruso. Con mando: X borra, Y espacio, Menu confirma, B cierra.
 * En la Steam Deck se abre solo al enfocar una casilla (no hay teclado fisico). A.teclado.open(input) | close() | ok() | type(c) | back()
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const T = A.teclado = { on: false };
  const host = window.geoliteHost, DECK = !!(host && host.device === "deck");
  const t6 = s => A.pick6(s);
  const TX = {
    space: "espacio|space|espace|espaço|Leertaste|spazio|espacio|空格|스페이스|スペース|пробел|spacja",
    ok: "Listo|Done|OK|Pronto|Fertig|Fatto|Listo|完成|완료|決定|Готово|Gotowe",
    del: "Borrar|Delete|Effacer|Apagar|Löschen|Cancella|Borrar|删除|지우기|消す|Стереть|Usuń",
    close: "Cerrar|Close|Fermer|Fechar|Schließen|Chiudi|Cerrar|关闭|닫기|閉じる|Закрыть|Zamknij",
  };
  const ROWS = {
    abc: ["1234567890", "qwertyuiop", "asdfghjklñ", "zxcvbnm-'."],
    acc: ["1234567890", "áàâäãåéèêë", "íìîïóòôöõø", "úùûüçßæœÿš", "ąćęłńśźżčž"],
    cyr: ["1234567890", "йцукенгшщзх", "фывапролджэ", "ячсмитьбюёъ"],
  };
  let el = null, inp = null, layer = "abc", shift = false, view = null, before = "";

  /* que escribir: respeta el maximo de la casilla y avisa como si hubieras tecleado (la limpieza del nombre y la busqueda lo oyen) */
  function put(v) {
    if (!inp) return; const max = inp.maxLength > 0 ? inp.maxLength : 40;
    inp.value = v.slice(0, max); inp.dispatchEvent(new Event("input", { bubbles: true })); paint();
  }
  T.type = c => {
    if (!inp) return; const cur = inp.value;
    if (cur.length >= (inp.maxLength > 0 ? inp.maxLength : 40)) { if (A.sfx && A.sfx.deny) A.sfx.deny(); return; }
    put(cur + (shift ? c.toLocaleUpperCase() : c)); if (shift) { shift = false; build(); }
    autoShift(); if (A.sfx && A.sfx.ui) A.sfx.ui();
  };
  T.back = () => { if (!inp || !inp.value) return; put(inp.value.slice(0, -1)); autoShift(); if (A.sfx && A.sfx.ui) A.sfx.ui(); };
  /* nombres: mayuscula al empezar y despues de un espacio (como autocapitalize="words") */
  function autoShift() { if (!inp) return; const want = inp.getAttribute("autocapitalize") === "words" && (!inp.value || / $/.test(inp.value)); if (want !== shift) { shift = want; build(); } }
  T.ok = () => {
    const i = inp; if (!i) return; close(false);
    i.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));   // como Intro: el nombre se firma, Ajustes lo guarda
    i.dispatchEvent(new Event("change", { bubbles: true }));
  };
  T.close = () => close(true);
  function close(keepFocus) {
    if (!el) return; T.on = false; el.classList.remove("on"); const i = inp; inp = null;
    setTimeout(() => { if (el && !T.on) el.hidden = true; }, 160);
    if (i && keepFocus && document.activeElement !== i) i.focus({ preventScroll: true });
  }

  function paint() { if (!view || !inp) return; view.querySelector("b").textContent = inp.value || ""; view.classList.toggle("empty", !inp.value); view.querySelector("em").textContent = inp.value ? "" : inp.placeholder || ""; }
  const key = (lab, act, cls) => `<button type="button" class="osk-k${cls ? " " + cls : ""}" data-k="${act}" tabindex="-1">${lab}</button>`;
  function build() {
    if (!el) return;
    const rows = ROWS[layer].map((r, i) => `<div class="osk-row">${[...r].map(c => key(i && shift ? c.toLocaleUpperCase() : c, "c:" + c)).join("")}</div>`).join("");
    const ru = A.lang === "ru" || layer === "cyr";
    el.querySelector(".osk-keys").innerHTML = rows + `<div class="osk-row osk-bot">${key("⇧", "shift", "fn" + (shift ? " on" : ""))}${key(layer === "acc" ? "abc" : "áé", layer === "acc" ? "l:abc" : "l:acc", "fn")}${ru ? key(layer === "cyr" ? "abc" : "абв", layer === "cyr" ? "l:abc" : "l:cyr", "fn") : ""}${key(t6(TX.space), "sp", "wide")}${key("⌫", "del", "fn")}${key(t6(TX.ok), "ok", "ok")}</div>`;
  }
  function ensure() {
    if (el) return;
    el = document.createElement("div"); el.id = "osk"; el.hidden = true; el.setAttribute("role", "dialog");
    el.innerHTML = `<div class="osk-pad"><div class="osk-view"><b></b><i class="osk-caret"></i><em></em></div><div class="osk-keys"></div>
      <div class="osk-legend k-pad"><span><i class="gl" data-gl="x"></i> <em data-t="del"></em></span><span><i class="gl" data-gl="y"></i> <em data-t="space"></em></span><span><i class="gl" data-gl="menu"></i> <em data-t="ok"></em></span><span><i class="gl" data-gl="b"></i> <em data-t="close"></em></span></div></div>`;
    document.body.appendChild(el); view = el.querySelector(".osk-view");
    /* las teclas no se quedan el foco: la casilla sigue activa (y el teclado fisico, si lo hay, sigue escribiendo en ella) */
    /* lo que se pulsa en el teclado es del teclado: Ajustes no lo toma por un clic fuera (se cerraba y se llevaba la casilla) */
    addEventListener("pointerdown", e => { if (!T.on || !e.target.closest || !e.target.closest("#osk")) return; e.stopPropagation(); if (e.target.closest(".osk-k")) e.preventDefault(); }, true);
    el.addEventListener("click", e => {
      const b = e.target.closest(".osk-k"); if (!b) { if (e.target === el) T.close(); return; }
      const k = b.dataset.k;
      if (k.startsWith("c:")) T.type(k.slice(2));
      else if (k === "sp") T.type(" ");
      else if (k === "del") T.back();
      else if (k === "ok") T.ok();
      else if (k === "shift") { shift = !shift; build(); A.sfx.ui(); }
      else if (k.startsWith("l:")) { layer = k.slice(2); build(); A.sfx.ui(); }
      if (inp && document.activeElement !== inp) inp.focus({ preventScroll: true });
    });
    /* Esc cierra el teclado antes que nada (no salta el nombre ni cierra Ajustes) */
    addEventListener("keydown", e => { if (T.on && e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); T.close(); } }, true);
  }
  function show(i) {
    ensure(); inp = i; before = i.value; layer = A.lang === "ru" ? "cyr" : "abc"; shift = false; autoShift(); build();
    el.querySelectorAll("[data-t]").forEach(e => { e.textContent = t6(TX[e.dataset.t]); });
    const r = i.getBoundingClientRect(); el.classList.toggle("top", r.top > innerHeight * 0.55);    // la casilla abajo: el teclado arriba
    el.hidden = false; A.restyle(el); el.classList.add("on"); T.on = true; paint();
    if (A.mando && A.mando.goTo) { const first = el.querySelector('.osk-k[data-k="c:' + ROWS[layer][1][0] + '"]'); if (first) A.mando.goTo(first); }
  }

  /* abrir: primero el teclado de Steam; si no puede, el del crupier */
  let busy = false;
  T.open = async i => {
    if (!i || busy || T.on) return; busy = true;
    try {
      i.focus({ preventScroll: true });
      if (host && host.steamKeyboard) {
        const r = i.getBoundingClientRect(), d = devicePixelRatio || 1;
        const res = await host.steamKeyboard({ x: Math.round(r.left * d), y: Math.round(r.top * d), w: Math.round(r.width * d), h: Math.round(r.height * d), text: i.value, max: i.maxLength > 0 ? i.maxLength : 40, desc: i.placeholder || "" });
        if (res && res.kind === "floating") return;                                       // Steam escribe en la casilla
        if (res && res.kind === "modal") { inp = i; put(String(res.text || "")); inp = null; i.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true })); i.dispatchEvent(new Event("change", { bubbles: true })); return; }
        if (res && res.kind === "cancel") return;
      }
      show(i);
    } finally { busy = false; }
  };
  const textual = t => t && t.tagName === "INPUT" && /^(text|search)$/.test(t.type) && !t.readOnly && !t.disabled;
  T.textual = textual;
  /* Steam Deck: sin teclado fisico, enfocar una casilla ya abre el teclado */
  if (DECK) document.addEventListener("focusin", e => { if (textual(e.target) && !T.on) T.open(e.target); });
  /* la casilla desaparece (se cierra la tarjeta del nombre, la Enciclopedia): el teclado tambien */
  setInterval(() => { if (T.on && (!inp || !inp.isConnected || !inp.offsetParent || inp.readOnly)) close(false); }, 300);
})(window.AIQ);
