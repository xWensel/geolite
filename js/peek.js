/* Geolite · peek: la carta ampliada de lo que ya llevas (reliquias, amuletos, herramientas).
 *  Al pasar el raton por una carta pequena se abre su carta grande encima, para leerla bien; un clic la deja fija (tactil y teclado tambien).
 *  Lo que se puede hacer con la carta (vender, dejarla a cambio de otra...) va DENTRO de la carta grande.
 *  Uso: A.peek.on(selector, el => ({ key, cls, html, wire(card, close) })) una sola vez; delegacion en document, asi que sobrevive a los
 *  repintados de la mochila y de la barra. La carta va en body, fuera de cualquier zoom: su tamano sigue el --k de la carta pequena. */
(() => {
  "use strict";
  const A = window.AIQ = window.AIQ || {};
  const regs = [];
  let box = null, cur = null, pinned = false, tOpen = 0, tClose = 0, anim = null;
  const still = () => document.documentElement.classList.contains("reduce-motion");
  const SPRING = "cubic-bezier(.3, 1.45, .55, 1)";
  const find = t => { if (!t || !t.closest) return null; for (const r of regs) { const el = t.closest(r.sel); if (el) return { el, r }; } return null; };
  const inBox = t => !!(box && t && box.contains(t));

  function host() {
    if (box) return box;
    box = document.createElement("div"); box.className = "pk"; box.hidden = true; box.setAttribute("role", "dialog");
    box.innerHTML = `<div class="pk-zoom"><div class="pk-card"></div></div>`;
    document.body.appendChild(box);
    return box;
  }
  /* encima de la carta pequena; si no cabe, debajo; si tampoco, a su derecha. Siempre dentro de la ventana, con la punta hacia la carta */
  function place(el) {
    const z = box.firstChild, card = z.firstChild, k = parseFloat(getComputedStyle(el).getPropertyValue("--k")) || 1;
    z.style.zoom = k;
    const r = el.getBoundingClientRect(), c = card.getBoundingClientRect(), W = innerWidth, H = innerHeight, m = 8, g = 14 * k;
    let side = "up", x = r.left + r.width / 2 - c.width / 2, y = r.top - c.height - g;
    if (y < m) { side = "down"; y = r.bottom + g; }
    if (y + c.height > H - m) { side = "right"; x = r.right + g; y = Math.max(m, Math.min(H - m - c.height, r.top + r.height / 2 - c.height / 2)); }
    x = Math.max(m, Math.min(W - m - c.width, x));
    const nx = side === "right" ? 0 : Math.max(22 * k, Math.min(c.width - 22 * k, r.left + r.width / 2 - x)), ny = side === "right" ? Math.max(22 * k, Math.min(c.height - 22 * k, r.top + r.height / 2 - y)) : 0;
    box.dataset.side = side;
    box.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    card.style.setProperty("--nx", (nx / k).toFixed(1) + "px"); card.style.setProperty("--ny", (ny / k).toFixed(1) + "px");
    card.style.transformOrigin = side === "up" ? `${(nx / k).toFixed(1)}px 100%` : side === "down" ? `${(nx / k).toFixed(1)}px 0` : `0 ${(ny / k).toFixed(1)}px`;
  }
  function show(el, r, how) {
    const d = r.make(el); if (!d) return;
    const b = host(), card = b.firstChild.firstChild, open = !b.hidden, same = open && cur && cur.key === d.key;
    clearTimeout(tClose); clearTimeout(tOpen);
    if (cur && cur.el !== el) cur.el.classList.remove("pk-on");
    cur = { el, r, key: d.key }; el.classList.add("pk-on");
    if (!same) {
      card.className = "pk-card " + (d.cls || ""); card.innerHTML = d.html; if (d.wire) d.wire(card, close);
      b.classList.toggle("pinned", pinned);
    }
    b.hidden = false; place(el);
    if (same || still()) return;
    if (anim) anim.cancel();
    const side = b.dataset.side, dy = side === "up" ? 18 : side === "down" ? -18 : 0, dx = side === "right" ? -18 : 0;
    anim = open
      ? card.animate([{ transform: "scale(.94) rotate(-1deg)", filter: "brightness(1.18)" }, { transform: "none", filter: "none" }], { duration: 170, easing: SPRING })   // de una carta a la de al lado: un golpe corto
      : card.animate([{ opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.42) rotate(-6deg)` }, { opacity: 1, offset: .35 }, { opacity: 1, transform: "none" }], { duration: 300, easing: SPRING });
    if (how !== "focus" && A.sfx) (open ? A.sfx.hover : A.sfx.card)();
  }
  function close(now) {
    clearTimeout(tOpen); clearTimeout(tClose);
    if (cur) cur.el.classList.remove("pk-on");
    cur = null; pinned = false; if (!box || box.hidden) return;
    box.classList.remove("pinned");
    const card = box.firstChild.firstChild;
    if (anim) anim.cancel(); anim = null;
    if (now === true || still()) { box.hidden = true; return; }
    const a = card.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.86) translateY(6px)" }], { duration: 110, easing: "ease-in" });
    anim = a; a.onfinish = () => { if (anim === a) { box.hidden = true; anim = null; } };
  }
  const later = () => { clearTimeout(tOpen); clearTimeout(tClose); tClose = setTimeout(close, 150); };

  /* raton: abre con un respiro (barrer la mochila no abre nada) y, si ya hay una abierta, salta a la nueva al momento.
     Pasar de la carta pequena a la grande no la cierra: ahi estan sus botones */
  document.addEventListener("pointerover", e => {
    if (inBox(e.target)) { clearTimeout(tClose); return; }
    const f = find(e.target);
    if (f && e.pointerType !== "touch") {
      if (cur && cur.el === f.el) { clearTimeout(tClose); return; }
      if (pinned && cur && !cur.el.isConnected) pinned = false;
      if (pinned) return;
      clearTimeout(tOpen); clearTimeout(tClose);
      if (box && !box.hidden) show(f.el, f.r); else tOpen = setTimeout(() => { const g = find(document.elementFromPoint(px, py)); if (g) show(g.el, g.r); }, 80);   // la barra de la ronda se repinta: se busca lo que hay bajo el puntero
      return;
    }
    if (!pinned) { clearTimeout(tOpen); if (box && !box.hidden) later(); }
  }, true);
  let px = -1, py = -1; document.addEventListener("pointermove", e => { px = e.clientX; py = e.clientY; }, { capture: true, passive: true });
  document.addEventListener("pointerdown", e => { if (box && !box.hidden && !inBox(e.target) && !find(e.target)) close(); }, true);
  /* teclado: al enfocar la carta pequena (Tab), se abre; Esc la cierra sin abrir el menu */
  document.addEventListener("focusin", e => { const f = find(e.target); if (f && e.target.matches(":focus-visible")) show(f.el, f.r, "focus"); else if (!inBox(e.target) && box && !box.hidden && !pinned) later(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && box && !box.hidden) { e.stopImmediatePropagation(); e.preventDefault(); close(); } }, true);
  addEventListener("resize", () => close(true));
  addEventListener("blur", () => { if (!pinned) close(true); });

  A.peek = {
    on: (sel, make) => regs.push({ sel, make }),
    /* clic en la carta pequena: la deja fija (otro clic, la suelta). Para el tactil, el unico modo de abrirla */
    toggle: el => { const f = find(el); if (!f) return; if (pinned && cur && cur.el === f.el) return close(); pinned = true; show(f.el, f.r, "pin"); if (box) box.classList.add("pinned"); },
    close,
    isOpen: () => !!(box && !box.hidden),
  };
})();
