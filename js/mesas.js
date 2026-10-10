/*
 * Geolite - EL ESTRENO DE UNA MESA (v0.3.62). El catalogo y lo que es tuyo viven en js/skins.js (A.mesas); se eligen en Perfil > Mesas (js/hub.js).
 * Cuando has ganado una mesa y vuelves a la portada, la casa la estrena: la portada se aparta, la sala baja la luz, un haz cruza la mesa de lado
 * a lado y el pano nuevo aparece debajo; el crupier la presenta y tu decides si te la quedas puesta. Quien ya habia ganado antes de esta version
 * recibe las suyas al entrar: se estrena la mejor y las demas se nombran en el cartel.
 *
 * Como esta hecho (nada por fotograma): se hace una foto del mapa con la mesa vieja (map.snap), se cambia el estilo del mapa debajo y la foto se
 * retira con el haz. La foto va en una caja inclinada que se desplaza (transform) y dentro lleva el desplazamiento contrario, asi que la imagen
 * no se mueve: solo avanza su borde. Caja, contenido, haz y velo se animan con transform y opacity (los mueve el compositor).
 * Sin WebGL o con "Reducir movimiento": sin haz; la mesa cambia con la sala a oscuras.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduced = () => document.documentElement.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TX = {
    eyb: "Mesa nueva|New table|Nouvelle table|Mesa nova|Neuer Tisch|Nuovo tavolo||新牌桌|새 테이블|新しいテーブル|Новый стол|Nowy stół",
    casa: "La casa te abre una mesa nueva.|The house opens a new table for you.|La maison t'ouvre une nouvelle table.|A casa abre uma mesa nova para você.|Das Haus öffnet dir einen neuen Tisch.|La casa ti apre un nuovo tavolo.||赌场为你开了一张新牌桌。|하우스가 새 테이블을 열어 줍니다.|ハウスがあなたに新しいテーブルを開きます。|Казино открывает для тебя новый стол.|Kasyno otwiera dla ciebie nowy stół.",
    mas: "También tienes ya: {l}.|You also now have: {l}.|Tu as aussi : {l}.|Você também já tem: {l}.|Außerdem hast du jetzt: {l}.|Hai anche: {l}.||你还拥有：{l}。|함께 얻은 테이블: {l}.|ほかにも手に入りました：{l}。|Ещё у тебя теперь есть: {l}.|Masz też już: {l}.",
    keep: "Quedármela|Keep it|La garder|Ficar com ela|Behalten|Tenerlo||就用它|이걸로 하기|これにする|Оставить|Zostawiam",
    back: "Seguir con la de antes|Stay with the old one|Garder l'ancienne|Continuar com a de antes|Beim alten bleiben|Restare con quello di prima||还是用原来的|원래 테이블 유지|前のテーブルのまま|Вернуть прежний|Zostaję przy starym",
    note: "Se cambian en Perfil › Mesas.|Change them in Profile › Tables.|Elles se changent dans Profil › Tables.|Troque em Perfil › Mesas.|Wechseln unter Profil › Tische.|Si cambiano in Profilo › Tavoli.||可在“个人资料 › 牌桌”中更换。|프로필 › 테이블에서 바꿀 수 있습니다.|プロフィール › テーブルで変更できます。|Меняются в разделе «Профиль › Столы».|Zmienisz je w Profil › Stoły.",
  };
  const t = k => A.pick6(TX[k]);
  let live = null, tm = 0, tries = 0, due = false;                       // due: hay un estreno esperando su momento en la portada (el crupier no empieza otra frase: js/dealer.js, homeTick)

  /* la portada esta quieta y a la vista: ni la puerta, ni Ajustes, ni la Enciclopedia, ni otra capa encima, ni el crupier a media frase */
  function quiet() {
    const S = A.core && A.core.S, dlg = $("dlg"), lay = $("layer");
    if (!S || S.booting || S.phase !== "title" || S.hub !== "home" || S.settingsOpen || document.hidden) return false;
    if (!dlg || !dlg.classList.contains("home") || !lay || lay.classList.contains("hidden") || document.body.classList.contains("cx-on")) return false;
    if (A.dealer && (A.dealer.busy || A.dealer.host)) return false;
    if (A.tour && A.tour.active && A.tour.active()) return false;
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);          // lo que hay en el centro es la portada (o el mapa entre sus cartas)
    return !!el && (el.id === "map" || !!el.closest("#dlg.home"));
  }
  const onHome = () => { const S = A.core && A.core.S; return !!S && S.phase === "title" && S.hub === "home"; };
  /* lo llama la portada cada vez que se pinta (js/hub.js, home) */
  function check() {
    clearTimeout(tm); if (live) return; due = false; if (!A.mesas || !A.mesas.fresh().length) return;
    tries = 0; due = true; tm = setTimeout(attempt, 1500);
  }
  function attempt() {
    if (live) return; if (!onHome()) { due = false; return; }
    const ids = A.mesas.fresh(); if (!ids.length) { due = false; return; }
    if (!quiet()) { if (++tries < 60) tm = setTimeout(attempt, 700); else due = false; return; }
    due = false;
    try { run(ids); } catch (e) { console.error("Estreno:", e); cancel(); }             // si algo falla, la mesa queda sin estrenar: se intenta en la proxima vuelta a la portada
  }

  function run(ids) {
    const map = A.core.map, M = A.mesas, id = ids[ids.length - 1], prev = M.current(), others = ids.slice(0, -1), red = reduced();
    const app = $("app"), W = app.clientWidth, H = app.clientHeight;
    live = { id, ids, prev, timers: [], anims: [] };
    const later = (fn, ms) => live.timers.push(setTimeout(() => { if (live) fn(); }, ms));
    document.body.classList.add("ms-on");                                            // la portada se aparta y, con ella, la luz de la sala (vive dentro de #layer): la mesa se ve entera
    if (map.stopDrift) map.stopDrift();
    const shot = !red && map.snap && !map.lost ? map.snap() : null;
    const el = document.createElement("div"); el.className = "ms-est"; el.id = "msEst"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "msEstT");
    const more = others.length ? `<p class="ms-more">${esc(t("mas").replace("{l}", others.map(M.name).join(", ")))}</p>` : "";
    el.innerHTML = `<div class="ms-old"><div class="ms-old-in"></div></div><i class="ms-veil"></i><i class="ms-beam"></i>
      <div class="gx-stage"><div class="ms-plw"><div class="gx-sh"><section class="gx-paper ms-plac">
        <span class="gx-eyb">${esc(t("eyb"))}</span><h2 class="gx-t-l" id="msEstT">${esc(M.name(id))}</h2>
        <p class="ms-how">${esc(M.won(id))} ${esc(t("casa"))}</p>${more}
        <div class="gx-acts"><button type="button" class="gx-btn pri" id="msKeep" data-primary><span>${esc(t("keep"))}</span>${A.gala.keyHint("Enter", "a")}</button><button type="button" class="gx-btn" id="msBack"><span>${esc(t("back"))}</span>${A.gala.keyHint("Esc", "b")}</button></div>
        <p class="gx-note">${esc(t("note"))}</p></section></div></div></div>`;
    live.el = el;
    const old = el.querySelector(".ms-old"), oldIn = el.querySelector(".ms-old-in"), veil = el.querySelector(".ms-veil"), beam = el.querySelector(".ms-beam");
    const top = -0.1 * H, tall = 1.2 * H, bw = 0.46 * W;
    if (shot) {
      old.style.cssText = `top:${top}px;width:${3 * W}px;height:${tall}px`; oldIn.style.cssText = `width:${3 * W}px;height:${tall}px`;
      shot.className = "ms-shot"; shot.style.cssText = `top:${-top}px;width:${W}px;height:${H}px`; oldIn.appendChild(shot);
      beam.style.cssText = `top:${top}px;width:${bw}px;height:${tall}px`;
    } else old.remove();
    app.appendChild(el);
    if (A.restyle) A.restyle(el);
    if (A.music && A.music.duck) A.music.duck(0.4, 2600);
    const SW0 = 520, SW = 1100, PLAC = shot ? 1780 : 1150;
    if (shot) {
      map.setStyle(A.MAPSTYLES[id]);                                                 // la mesa nueva ya esta debajo de la foto
      const X0 = -0.47 * W, X1 = 1.53 * W, o = { duration: SW, delay: SW0, easing: "cubic-bezier(.4, 0, .6, 1)", fill: "both" };
      live.anims.push(old.animate([{ transform: `translateX(${X0}px) skewX(-24deg)` }, { transform: `translateX(${X1}px) skewX(-24deg)` }], o),
        oldIn.animate([{ transform: `skewX(24deg) translateX(${-X0}px)` }, { transform: `skewX(24deg) translateX(${-X1}px)` }], o),
        beam.animate([{ transform: `translateX(${X0 - bw / 2}px) skewX(-24deg)`, opacity: 0 }, { opacity: 0.9, offset: 0.18 }, { opacity: 0.9, offset: 0.78 }, { transform: `translateX(${X1 - bw / 2}px) skewX(-24deg)`, opacity: 0 }], o),
        veil.animate([{ opacity: 0 }, { opacity: 0.5, offset: 0.15 }, { opacity: 0.5, offset: 0.64 }, { opacity: 0 }], { duration: 2300, easing: "linear", fill: "both" }));
      later(() => { if (A.sfx && A.sfx.barrido) A.sfx.barrido(); }, SW0);
      later(() => old.remove(), SW0 + SW + 80);                                      // la foto ya no hace falta
    } else {
      live.anims.push(veil.animate([{ opacity: 0 }, { opacity: 0.86, offset: 0.35 }, { opacity: 0.86, offset: 0.55 }, { opacity: 0 }], { duration: red ? 900 : 1500, easing: "linear", fill: "both" }));
      later(() => map.setStyle(A.MAPSTYLES[id]), red ? 380 : 620);                   // cambia con la sala a oscuras
    }
    later(() => {
      el.classList.add("plac"); live.gala = A.gala.enter(el, { noRestore: true });
      if (A.sfx && A.sfx.stamp) A.sfx.stamp(); if (A.haptic) A.haptic([18, 40, 30]);
      later(() => { if (A.amb && A.amb.applause) A.amb.applause(0.8); }, 380);
      later(() => { if (A.dealer && A.dealer.mesa) A.dealer.mesa(M.name(id)); }, 520);
    }, PLAC);
    el.querySelector("#msKeep").onclick = () => { if (!live || !live.gala) return; A.sfx.ui && A.sfx.ui(); end(true); };
    el.querySelector("#msBack").onclick = () => { if (!live || !live.gala) return; A.sfx.ui && A.sfx.ui(); end(false); };
    addEventListener("keydown", onKey, true);
  }
  /* mientras dura el estreno las teclas son suyas: Esc = la de antes; Tab y las flechas pasan de un boton al otro; Intro pulsa el que tiene el foco */
  function onKey(e) {
    if (!live) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.stopImmediatePropagation();                                                    // ni los atajos del juego (Esc abriria Salir, C la Enciclopedia) ni nadie mas
    const k = live.el && live.el.querySelector("#msKeep"), b = live.el && live.el.querySelector("#msBack");
    if (!live.gala || !k || !b) { e.preventDefault(); return; }                       // aun no ha salido el cartel
    if (e.key === "Escape") { e.preventDefault(); b.click(); }
    else if (e.key === "Tab" || e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); (document.activeElement === k ? b : k).focus({ preventScroll: true }); }
    else if (e.key === "Enter" || e.key === " ") { if (document.activeElement !== k && document.activeElement !== b) { e.preventDefault(); k.click(); } }
    else e.preventDefault();
  }
  /* se cierra: keep = te la quedas puesta; si no, vuelve la de antes. En los dos casos quedan estrenadas */
  function end(keep) {
    const L = live; if (!L) { document.body.classList.remove("ms-on"); return; }
    live = null; removeEventListener("keydown", onKey, true); L.timers.forEach(clearTimeout);
    const map = A.core && A.core.map, M = A.mesas;
    try { M.seen(L.ids); if (keep) M.use(L.id); else if (map) map.setStyle(M.style()); } catch (e) { console.error("Estreno:", e); }
    const done = () => { L.anims.forEach(a => { try { a.cancel(); } catch (e) { /* ya acabo */ } }); if (L.el) L.el.remove(); };
    document.body.classList.add("ms-off"); document.body.classList.remove("ms-on"); setTimeout(() => document.body.classList.remove("ms-off"), 400);
    if (L.gala) L.gala.close(done); else done();
    const S = A.core && A.core.S; if (map && map.startDrift && S && S.phase === "title") map.startDrift();
  }
  /* si la portada se va con el estreno a medias (no deberia: la capa lo tapa todo), se deja para la proxima vez */
  function cancel() { clearTimeout(tm); due = false; if (!live) return; const L = live; live = null; removeEventListener("keydown", onKey, true); L.timers.forEach(clearTimeout); if (L.el) L.el.remove(); document.body.classList.remove("ms-on"); const map = A.core && A.core.map; if (map) map.setStyle(A.mesas.style()); }

  A.mesas.check = check; A.mesas.cancel = cancel;
  Object.defineProperty(A.mesas, "live", { get: () => !!live });
  Object.defineProperty(A.mesas, "busy", { get: () => !!live || due });
})(window.AIQ);
