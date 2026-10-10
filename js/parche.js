/*
 * Geolite - NOTAS DEL PARCHE (la interfaz; los datos viven en js/parche-data.js, el estilo en css/parche.css).
 *
 * Como las notas de LoL, vistas desde dentro del juego: un icono pequeno (un cuaderno con el parche cosido) en la esquina inferior IZQUIERDA de la
 * portada, espejo de la version (abajo a la derecha), con un punto rojo mientras haya un parche sin leer (P.patchSeen en el perfil). Abre una
 * pantalla del hub (A.hub.screen("patch"), como el Perfil): a la izquierda la lista de parches y el indice del elegido, a la derecha las notas con
 * scroll propio (rueda, teclado, tactil; barra pixel art), cabecera, capitulos, entradas con etiqueta, version del juego y capturas que se amplian.
 *
 *   A.parche.button()  A.parche.wire()   -> la portada (js/hub.js)       A.parche.open(id?)   A.parche.hasNew()
 *
 * Fluidez: nada de medir en el desplazamiento (solo scrollTop; las medidas se cachean con ResizeObserver y la barra se mueve con transform),
 * imagenes con carga diferida y hueco reservado (aspect-ratio), y A.squeeze no recorre las notas (data-nosq).
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), C = () => A.core;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* textos de la interfaz: es | en | fr | pt | de | it | es-419 | zh | ko | ja | ru | pl (es-419 vacio = igual que es) */
  const TX = {
    title: "Notas del parche|Patch notes|Notes de patch|Notas do patch|Patchnotes|Note della patch||更新说明|패치 노트|パッチノート|Список изменений|Lista zmian",
    tipd: "Qué trae cada parche, con capturas.|What each patch brings, with screenshots.|Ce que chaque patch apporte, avec des captures.|O que cada patch traz, com capturas.|Was jeder Patch bringt, mit Screenshots.|Cosa porta ogni patch, con schermate.||每个补丁的内容，附截图。|패치마다 달라진 점과 스크린샷.|各パッチの内容をスクリーンショット付きで。|Что нового в каждом патче, со скриншотами.|Co wnosi każdy patch, ze zrzutami ekranu.",
    unread: "Hay un parche nuevo|A new patch is out|Un nouveau patch est sorti|Há um patch novo|Ein neuer Patch ist da|C'è una patch nuova||有新补丁|새 패치가 나왔어요|新しいパッチがあります|Вышел новый патч|Jest nowy patch",
    patch: "Parche|Patch|Patch|Patch|Patch|Patch||补丁|패치|パッチ|Патч|Patch",
    patches: "Parches|Patches|Patchs|Patches|Patches|Patch||补丁|패치|パッチ|Патчи|Patche",
    inpatch: "En este parche|In this patch|Dans ce patch|Neste patch|In diesem Patch|In questa patch||本补丁内容|이 패치 내용|このパッチの内容|В этом патче|W tym patchu",
    latest: "Último|Latest|Dernier|Mais recente|Neuester|Ultima||最新|최신|最新|Последний|Najnowszy",
    new: "Nuevo|New|Nouveau|Novo|Neu|Nuovo||新|새 글|新着|Новое|Nowe",
    games: "Compilaciones {a} a {b}|Builds {a} to {b}|Versions {a} à {b}|Compilações {a} a {b}|Builds {a} bis {b}|Build da {a} a {b}||构建 {a} 至 {b}|빌드 {a} ~ {b}|ビルド {a}〜{b}|Сборки {a}–{b}|Wersje od {a} do {b}",
    bld: "comp.|build|vers.|comp.|Build|build||构建|빌드|ビルド|сборка|wersja",
    top: "Subir|Back to top|Haut de page|Voltar ao topo|Nach oben|Torna su||回到顶部|맨 위로|先頭へ|Наверх|Do góry",
    close: "Cerrar|Close|Fermer|Fechar|Schließen|Chiudi||关闭|닫기|閉じる|Закрыть|Zamknij",
    prev: "Anterior|Previous|Précédent|Anterior|Zurück|Precedente||上一张|이전|前へ|Назад|Poprzedni",
    next: "Siguiente|Next|Suivant|Próxima|Weiter|Successivo||下一张|다음|次へ|Далее|Następny",
    zoom: "Ampliar|Enlarge|Agrandir|Ampliar|Vergrößern|Ingrandisci||放大|확대|拡大|Увеличить|Powiększ",
    hist: "Historial|History|Historique|Histórico|Verlauf|Cronologia||历史|기록|履歴|История|Historia",
    allv: "Todas las versiones|All versions|Toutes les versions|Todas as versões|Alle Versionen|Tutte le versioni||所有版本|모든 버전|すべてのバージョン|Все версии|Wszystkie wersje",
    foot: "Cada entrada lleva la versión del juego en la que llegó. Las capturas son del juego real.|Each entry shows the game version it arrived in. Screenshots are from the real game.|Chaque entrée indique la version du jeu où elle est arrivée. Les captures viennent du vrai jeu.|Cada entrada indica a versão do jogo em que chegou. As capturas são do jogo real.|Jeder Eintrag nennt die Spielversion, in der er erschien. Die Screenshots stammen aus dem echten Spiel.|Ogni voce indica la versione del gioco in cui è arrivata. Le schermate sono del gioco vero.||每条记录都标有它加入的游戏版本。截图均来自真实游戏。|각 항목에는 추가된 게임 버전이 적혀 있습니다. 스크린샷은 실제 게임 화면입니다.|各項目には追加されたゲームのバージョンを記載。スクリーンショットは実際のゲームのものです。|У каждой записи указана версия игры, в которой она появилась. Скриншоты — из настоящей игры.|Każdy wpis podaje wersję gry, w której się pojawił. Zrzuty ekranu pochodzą z prawdziwej gry.",
    count: "{n} parches · último v{v}|{n} patches · latest v{v}|{n} patchs · dernier v{v}|{n} patches · mais recente v{v}|{n} Patches · neuester v{v}|{n} patch · ultima v{v}||共 {n} 个补丁 · 最新 v{v}|패치 {n}개 · 최신 v{v}|パッチ {n} 件 · 最新 v{v}|Патчей: {n} · последний v{v}|Patche: {n} · najnowszy v{v}",
    only: "Estas notas solo están en español e inglés.|These notes are only in Spanish and English.|Ces notes sont uniquement en espagnol et en anglais.|Estas notas só existem em espanhol e inglês.|Diese Notizen gibt es nur auf Spanisch und Englisch.|Queste note sono solo in spagnolo e inglese.||这些说明仅提供西班牙语和英语版本。|이 노트는 스페인어와 영어로만 제공됩니다.|このノートはスペイン語と英語のみです。|Эти заметки есть только на испанском и английском.|Te notatki są tylko po hiszpańsku i angielsku.",
    /* etiquetas de las entradas */
    new_: "Nuevo|New|Nouveau|Novo|Neu|Nuovo||新增|신규|新規|Новое|Nowe",
    change: "Cambio|Change|Changement|Mudança|Änderung|Modifica||调整|변경|変更|Изменение|Zmiana",
    buff: "Mejora|Improved|Amélioré|Melhorado|Verbessert|Migliorato||加强|개선|強化|Улучшено|Ulepszenie",
    nerf: "Ajuste|Adjusted|Ajusté|Ajustado|Angepasst|Ritoccato||下调|조정|調整|Подправлено|Korekta",
    fix: "Arreglo|Fix|Correctif|Correção|Fehlerbehebung|Correzione||修复|수정|修正|Исправлено|Poprawka",
    out: "Sale|Removed|Retiré|Removido|Entfernt|Rimosso||移除|제거|削除|Убрано|Usunięto",
    merge: "Fusión|Merged|Fusionné|Mesclado|Zusammengelegt|Unito||合并|통합|統合|Объединено|Połączono",
  };
  const t = k => A.pick6(TX[k]);
  const tagName = g => t(g === "new" ? "new_" : g);
  /* los textos de los datos: ["es", "en"] | {es, en, ...} | cadena. Se pintan con **negrita** y nada mas (todo lo demas se escapa) */
  /* idioma propio -> es-419 usa es -> es en espanol -> el resto, ingles. Sin la memoria de traducciones del juego (A.TR): una frase corta como "Act I" casaria con otra cosa y saldria mal */
  const tx = v => { const o = Array.isArray(v) ? { es: v[0], en: v[1] } : v && typeof v === "object" ? v : { es: v, en: v }, l = A.lang; return o[l] || (l === "es-419" || l === "es" ? o.es : o.en) || o.en || o.es || ""; };
  const rich = v => esc(tx(v)).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

  /* ------------------------------------------------------------------ lo leido (en el perfil, como el resto del juego) */
  const list = () => A.PATCHES || [];
  const seenMap = () => { const P = A.profile.get(); if (!P.patchSeen || typeof P.patchSeen !== "object") P.patchSeen = {}; return P.patchSeen; };
  const isNew = p => !seenMap()[p.id];
  const hasNew = () => list().some(isNew);
  const markSeen = id => { const m = seenMap(); if (!m[id]) { m[id] = 1; A.profile.save(); } };

  /* ------------------------------------------------------------------ el icono de la portada */
  const button = () => {
    if (!list().length) return "";
    const n = hasNew(), lbl = t("title") + (n ? " · " + t("unread") : "");
    return `<button class="menu-gear menu-patch${n ? " has-new" : ""}" id="patchBtn" type="button" aria-label="${esc(lbl)}" ${A.ttAttr(t("title"), n ? t("unread") + ". " + t("tipd") : t("tipd"))}>${A.icon("m_patch")}${n ? `<i class="pt-dot" aria-hidden="true"></i>` : ""}</button>`;
  };
  const wire = () => { const b = $("patchBtn"); if (b) b.onclick = () => { A.sfx.card(); A.hub.screen("patch"); }; };

  /* ------------------------------------------------------------------ pintar un parche */
  const LOC = () => ({ pt: "pt-BR", zh: "zh-CN" }[A.lang] || A.lang || "es");
  const day = s => { try { return new Intl.DateTimeFormat(LOC(), { day: "numeric", month: "long", year: "numeric" }).format(new Date(s + "T12:00:00")); } catch (e) { return s; } };
  const gamesTxt = p => p.games ? t("games").replace("{a}", p.games[0]).replace("{b}", p.games[1]) : "";
  const verTxt = v => (+String(v).split(".")[1] < 50 ? "v" + v : t("bld") + " " + v);  /* 0.2.N y 0.3.N = version del juego (v); 0.50-0.79 = compilacion antigua (antes las 0.3.N salian como "comp.") */
  const dayShort = s => { try { return new Intl.DateTimeFormat(LOC(), { day: "numeric", month: "long" }).format(new Date(s + "T12:00:00")); } catch (e) { return s; } };
  /* el aviso "solo en espanol e ingles", solo si ESTE parche no esta en tu idioma (desde la 0.3.4 todos van en los 12) */
  const noLang = p => { const l = A.lang === "es-419" ? "es" : A.lang; if (l === "es" || l === "en") return false; const o = p.name; return !(o && typeof o === "object" && !Array.isArray(o) && o[A.lang]); };
  let pidNow = "";                                                       // el parche que se esta pintando: sus entradas no repiten su propia version

  const shots = imgs => !imgs || !imgs.length ? "" : `<div class="pt-shots">${imgs.map(m => {
    const cap = tx(m.cap || ""), src = "assets/parche/" + m.src + ".webp";
    return `<figure class="pt-shot s-${m.size || "wide"}"><button type="button" class="pt-zoom" data-src="${src}" style="--ar:${m.w} / ${m.h}" aria-label="${esc(cap)} · ${esc(t("zoom"))}"><img src="${src}" width="${m.w}" height="${m.h}" alt="${esc(cap)}" loading="lazy" decoding="async" draggable="false"></button>${cap ? `<figcaption>${esc(cap)}</figcaption>` : ""}</figure>`;
  }).join("")}</div>`;
  const entry = e => `<article class="pt-en t-${e.tag}"><header><h3>${esc(tx(e.name))}</h3><span class="pt-tag">${esc(tagName(e.tag))}</span>${e.ver && e.ver !== pidNow ? `<span class="pt-ver">${esc(verTxt(e.ver))}</span>` : ""}</header>
    <ul>${e.items.map(i => `<li>${rich(i)}</li>`).join("")}</ul>${shots(e.imgs)}</article>`;
  const chapter = c => `<section class="pt-ch" id="ptc-${esc(c.id)}" data-ch="${esc(c.id)}"><header class="pt-chh"><span class="pt-ck">${esc(tx(c.kicker))}</span><h2>${esc(tx(c.title))}</h2></header>
    ${c.intro ? `<p class="pt-lead">${rich(c.intro)}</p>` : ""}
    ${c.cards ? `<div class="pt-cards">${c.cards.map(k => `<div class="pt-card"><b>${esc(tx(k.name))}</b><p>${rich(k.text)}</p></div>`).join("")}</div>` : ""}
    ${(c.entries || []).map(entry).join("")}</section>`;
  const timeline = p => !p.timeline || !p.timeline.length ? "" : `<section class="pt-ch" id="ptc-versiones" data-ch="versiones"><header class="pt-chh"><span class="pt-ck">${esc(t("hist"))}</span><h2>${esc(t("allv"))}</h2></header>
    <ol class="pt-tl">${p.timeline.map(r => `<li><b>${esc(verTxt(r[0]))}</b><span>${esc(tx(r[1]))}</span></li>`).join("")}</ol></section>`;
  /* v0.3.51 (mesa de diseno, Notas del parche A): el parche impreso en papel, como un boletin; nombre en grande, fecha, resumen */
  const hero = p => `<header class="pt-hero"><span class="gx-eyb pt-k">${esc(t("patch"))} v${esc(p.id)} · ${esc(day(p.date))}${p.games ? " · " + esc(gamesTxt(p)) : ""}</span><h1>${esc(tx(p.name))}</h1>
    <p class="pt-sum">${rich(p.summary)}</p>${noLang(p) ? `<p class="pt-lang">${esc(t("only"))}</p>` : ""}</header>`;
  /* el parche se pinta por trozos (cabecera y primer capitulo ya; el resto, uno por fotograma, por debajo de la vista): maquetar de golpe las ~100 entradas costaba un fotograma largo con CPU lenta */
  const parts = p => (pidNow = p.id, [hero(p) + (p.chapters[0] ? chapter(p.chapters[0]) : ""), ...p.chapters.slice(1).map(chapter), timeline(p) + `<p class="pt-foot">${esc(t("foot"))}</p>`]);
  const tocOf = p => [...p.chapters.map(c => [c.id, tx(c.kicker)]), ...(p.timeline && p.timeline.length ? [["versiones", t("allv")]] : [])];

  /* ------------------------------------------------------------------ la pantalla */
  let cur = "", fresh = new Set(), ui = null;
  const find = id => list().find(p => p.id === id) || list()[0];

  function open(id) {
    const ps = list(); if (!ps.length) return A.hub.screen("home");
    const c = C();
    /* la primera vez que se abren, solo el ultimo es "nuevo" (antes los 51); despues, los que salgan desde tu ultima visita */
    { const m = seenMap(); if (!Object.keys(m).length) { ps.slice(1).forEach(p => (m[p.id] = 1)); A.profile.save(); } }
    fresh = new Set(ps.filter(isNew).map(p => p.id));                            // los puntos "nuevo" de esta visita (al salir ya estan leidos)
    cur = (find(id || cur || (ps.find(isNew) || ps[0]).id) || ps[0]).id;
    /* v0.3.51 (mesa de diseno, Notas del parche A): 12 columnas. A la izquierda (1-4), el fieltro con todos los parches en filas finas agrupadas por dia
       (version y nombre; un punto rojo en los que no has leido; el abierto, en laton). A la derecha (5-12), el parche impreso en papel, como un boletin */
    let dd = "", items = "";
    ps.forEach(p => { if (p.date !== dd) { dd = p.date; items += `<span class="gx-eyb pt-day">${esc(dayShort(p.date))}</span>`; }
      items += `<button type="button" class="pt-item" data-id="${esc(p.id)}"><b>v${esc(p.id)}</b><span>${esc(tx(p.name))}</span>${fresh.has(p.id) ? `<i class="pt-nw" ${A.ttAttr(t("new"))}></i>` : ""}</button>`; });
    c.dialog(`<div class="gx-veil"></div><section class="pt-screen gx-stage" aria-labelledby="ptH">
      <div class="gx-grid pt-grid pt" data-nosq>
        <header class="pt-head"><button type="button" class="gx-btn sm" id="hubBack">${A.icon("u_back")}<span>${esc(t("close"))}</span>${A.gala.keyHint("Esc", "b")}</button>
          <h2 class="gx-t-l pt-h" id="ptH"><span class="pt-hic">${A.icon("m_patch")}</span>${esc(t("title"))}</h2>
          <span class="pt-cnt">${esc(t("count").replace("{n}", A.fmt(ps.length)).replace("{v}", ps[0].id))}</span>${A.hub.tools()}</header>
        <div class="gx-sh pt-left"><nav class="gx-pnl pt-rail" aria-label="${esc(t("patches"))}"><div class="pt-items">${items}</div>
          <div class="pt-tocw"><h3 class="gx-eyb pt-rh">${esc(t("inpatch"))}</h3><ol class="pt-toc"></ol></div></nav></div>
        <div class="gx-sh pt-right"><section class="gx-paper pt-main"><div class="pt-scroll" tabindex="0" role="region"><div class="pt-in"></div></div>
          <div class="pt-bar" aria-hidden="true"><i></i></div><button type="button" class="pt-top off" aria-label="${esc(t("top"))}">${A.icon("u_next")}</button></section></div>
      </div></section>`, "tablewrap");
    A.hub.wireTools(); $("hubBack").onclick = () => A.hub.screen("home");
    if (A.coverMap) A.coverMap("patch", true, () => !!document.querySelector("#dlg .pt-screen") && !$("layer").classList.contains("hidden"));   // fieltro opaco: el mapa de detras deja de dibujarse
    const root = document.querySelector("#dlg .pt"); if (!root) return;
    ui = { root, scroll: root.querySelector(".pt-scroll"), inner: root.querySelector(".pt-in"), toc: root.querySelector(".pt-toc"), bar: root.querySelector(".pt-bar"), thumb: root.querySelector(".pt-bar i"), top: root.querySelector(".pt-top"),
      M: { sh: 0, ch: 0, tr: 0, th: 40 }, ro: null, io: null, act: "", lock: 0, raf: 0 };
    wire2();
    select(cur, true);
    setTimeout(() => { if (ui && ui.scroll && ui.scroll.isConnected) try { ui.scroll.focus({ preventScroll: true }); } catch (e) { ui.scroll.focus(); } }, 120);
  }

  /* pone el parche p en el panel derecho (y su indice a la izquierda) */
  function select(id, first) {
    const p = find(id), u = ui; if (!p || !u || !u.root.isConnected) return;
    cur = p.id; markSeen(p.id);
    u.root.querySelectorAll(".pt-item").forEach(b => { const on = b.dataset.id === p.id; b.classList.toggle("on", on); if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
    const toc = tocOf(p);
    u.toc.innerHTML = toc.map(([cid, name], i) => `<li><button type="button" data-ch="${esc(cid)}"><span class="pt-n">${i + 1}</span><span class="pt-t">${esc(name)}</span></button></li>`).join("");
    u.root.querySelector(".pt-tocw").hidden = toc.length < 2;                       // "En este parche" solo si hay mas de un capitulo
    { const on = u.root.querySelector(".pt-item.on"); if (on) on.scrollIntoView({ block: "nearest" }); }   // a la vista aunque el indice de abajo encoja la lista
    u.scroll.setAttribute("aria-label", t("title") + " v" + p.id + " · " + tx(p.name));
    const ps = parts(p); u.inner.innerHTML = ps[0]; u.pending = ps.slice(1); u.gen = (u.gen || 0) + 1;
    u.scroll.scrollTo({ top: 0, behavior: "instant" });
    u.act = ""; observe(); register(); measure(); sync(); pump(u.gen);
    if (!first) A.sfx.flip(true);
  }

  /* ------------------------------------------------------------------ desplazamiento: barra propia, indice vivo, volver arriba */
  function measure() {
    const u = ui; if (!u || !u.scroll.isConnected) return;
    const M = u.M; M.sh = u.scroll.scrollHeight; M.ch = u.scroll.clientHeight; M.tr = u.bar.clientHeight;
    M.th = Math.max(36, M.tr * (M.sh > 0 ? M.ch / M.sh : 1)); if (M.th > M.tr) M.th = M.tr;
    u.thumb.style.height = M.th + "px"; u.bar.classList.toggle("off", M.sh <= M.ch + 1); sync();
  }
  function sync() {
    const u = ui; if (!u) return; const M = u.M, st = u.scroll.scrollTop, max = M.sh - M.ch, r = max > 0 ? Math.min(1, Math.max(0, st / max)) : 0;
    u.thumb.style.transform = `translateY(${(r * (M.tr - M.th)).toFixed(1)}px)`;
    u.top.classList.toggle("off", st < 320);
    if (max > 0 && st >= max - 4 && u.last) setActive(u.last);                      // al final del todo, el ultimo capitulo aunque sea corto
  }
  function setActive(cid) {
    const u = ui; if (!u || u.act === cid) return; u.act = cid;
    u.toc.querySelectorAll("button").forEach(b => { const on = b.dataset.ch === cid; b.classList.toggle("on", on); if (on) { b.setAttribute("aria-current", "true"); if (u.toc.scrollHeight > u.toc.clientHeight + 2) b.scrollIntoView({ block: "nearest" }); } else b.removeAttribute("aria-current"); });
  }
  /* capitulo activo: el que cruza la franja de arriba del panel (sin medir nada: IntersectionObserver) */
  function observe() {
    const u = ui; if (!u) return; if (u.io) u.io.disconnect(); if (u.ro) u.ro.disconnect();
    u.secs = []; u.seen = new WeakSet(); u.last = ""; const hit = new Set();
    if ("IntersectionObserver" in window) {
      u.io = new IntersectionObserver(es => {
        es.forEach(e => (e.isIntersecting ? hit.add(e.target) : hit.delete(e.target)));
        if (performance.now() < u.lock) return;
        const on = u.secs.filter(s => hit.has(s)).pop(); if (on) setActive(on.dataset.ch);
      }, { root: u.scroll, rootMargin: "-6% 0px -80% 0px" });
    }
    if ("ResizeObserver" in window) { u.ro = new ResizeObserver(() => { if (u.raf) return; u.raf = requestAnimationFrame(() => { u.raf = 0; measure(); }); }); u.ro.observe(u.scroll); u.ro.observe(u.inner); }
  }
  /* da de alta los capitulos que aun no estaban (llegan por trozos) */
  function register() {
    const u = ui; if (!u) return;
    u.inner.querySelectorAll(".pt-ch").forEach(s => { if (u.seen.has(s)) return; u.seen.add(s); u.secs.push(s); u.last = s.dataset.ch; if (u.io) u.io.observe(s); });
  }
  function pump(gen) {
    requestAnimationFrame(() => {
      const u = ui; if (!u || u.gen !== gen || !u.root.isConnected || !u.pending.length) return;
      u.inner.insertAdjacentHTML("beforeend", u.pending.shift()); register();
      if (u.pending.length) pump(gen);
    });
  }
  function flush() { const u = ui; if (!u || !u.pending.length) return; u.inner.insertAdjacentHTML("beforeend", u.pending.splice(0).join("")); register(); }   // por si se salta a un capitulo que aun no ha llegado
  function jump(cid) {
    const u = ui; if (!u) return; flush(); const el = u.inner.querySelector(`[data-ch="${cid}"]`); if (!el) return;
    A.sfx.ui(); u.lock = performance.now() + 900; setActive(cid);
    el.scrollIntoView({ block: "start" });                                            // suave por CSS (scroll-behavior), seco con Reducir movimiento
  }

  /* ------------------------------------------------------------------ eventos de la pantalla */
  function wire2() {
    const u = ui;
    u.root.querySelector(".pt-items").addEventListener("click", e => { const b = e.target.closest(".pt-item"); if (b && b.dataset.id !== cur) select(b.dataset.id); });
    u.toc.addEventListener("click", e => { const b = e.target.closest("button[data-ch]"); if (b) jump(b.dataset.ch); });
    u.top.onclick = () => { A.sfx.ui(); u.scroll.scrollTo({ top: 0 }); };
    u.inner.addEventListener("click", e => { const z = e.target.closest(".pt-zoom"); if (z) openLb(z); });
    u.scroll.addEventListener("scroll", () => { if (u.raf2) return; u.raf2 = requestAnimationFrame(() => { u.raf2 = 0; sync(); }); }, { passive: true });
    /* barra: arrastrar el asa o pulsar el carril (pagina a pagina). Todo con proporciones: vale con cualquier zoom de la interfaz */
    let drag = null;
    u.bar.addEventListener("pointerdown", e => {
      if (e.button) return; e.preventDefault(); flush(); measure(); const M = u.M, tb = u.thumb.getBoundingClientRect(), hh = u.bar.getBoundingClientRect();
      if (e.target === u.thumb) { drag = { y: e.clientY, st: u.scroll.scrollTop, k: (M.sh - M.ch) / Math.max(1, hh.height - tb.height) }; u.bar.classList.add("drag"); u.bar.setPointerCapture(e.pointerId); u.scroll.style.scrollBehavior = "auto"; }
      else u.scroll.scrollBy({ top: (e.clientY < tb.top ? -1 : 1) * M.ch * 0.9 });
    });
    u.bar.addEventListener("pointermove", e => { if (drag) u.scroll.scrollTop = drag.st + (e.clientY - drag.y) * drag.k; });
    const end = () => { if (!drag) return; drag = null; u.bar.classList.remove("drag"); u.scroll.style.scrollBehavior = ""; };
    u.bar.addEventListener("pointerup", end); u.bar.addEventListener("pointercancel", end); u.bar.addEventListener("lostpointercapture", end);
    /* sonido flojito al pasar por lo pulsable de la pantalla (el resto de botones ya lo hace game.js) */
    let last = null;
    u.root.addEventListener("mouseover", e => { const el = e.target.closest(".pt-item, .pt-toc button, .pt-zoom, .pt-top"); if (el && el !== last) A.sfx.hover(); last = el; });
    /* las filas de la lista: cada parche en su sitio y con flechas arriba y abajo cuando el foco esta en la lista */
    u.root.querySelector(".pt-items").addEventListener("keydown", e => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return; const b = e.target.closest(".pt-item"); if (!b) return;
      const all = [...u.root.querySelectorAll(".pt-item")], k = all.indexOf(b) + (e.key === "ArrowDown" ? 1 : -1); if (k < 0 || k >= all.length) return;
      e.preventDefault(); e.stopPropagation(); all[k].focus(); all[k].scrollIntoView({ block: "nearest" }); select(all[k].dataset.id);
    });
  }

  /* ------------------------------------------------------------------ visor de capturas */
  function openLb(btn) {
    const u = ui; if (!u || $("ptLb")) return;
    const all = [...u.inner.querySelectorAll(".pt-zoom")]; let k = Math.max(0, all.indexOf(btn));
    const lb = document.createElement("div"); lb.id = "ptLb"; lb.className = "pt-lb" + (all.length < 2 ? " one" : ""); lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
    lb.innerHTML = `<img alt="" draggable="false"><p></p><button type="button" class="lb-x" aria-label="${esc(t("close"))}">${A.icon("u_close")}</button><button type="button" class="lb-p" aria-label="${esc(t("prev"))}">${A.icon("u_next")}</button><button type="button" class="lb-n" aria-label="${esc(t("next"))}">${A.icon("u_next")}</button>`;
    const im = lb.querySelector("img"), cp = lb.querySelector("p");
    const show = () => { const b = all[k], fig = b.closest("figure"), c = fig && fig.querySelector("figcaption"); im.src = b.dataset.src; im.alt = c ? c.textContent : ""; cp.textContent = c ? c.textContent : ""; };
    const go = d => { k = (k + d + all.length) % all.length; A.sfx.hover(); show(); };
    const close = () => { lb.classList.remove("in"); document.removeEventListener("keydown", key, true); setTimeout(() => lb.remove(), 220); A.sfx.ui(); try { btn.focus({ preventScroll: true }); } catch (e) { /* nada */ } };
    /* mientras esta abierto el teclado es suyo (en captura: Esc cierra solo el visor, no la pantalla) */
    const key = e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); if (all.length > 1) go(e.key === "ArrowLeft" ? -1 : 1); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); if (document.activeElement && document.activeElement.tagName === "BUTTON") document.activeElement.click(); else close(); }
      else if (e.key === "Tab") { e.stopPropagation(); }
      else e.stopPropagation();
    };
    document.addEventListener("keydown", key, true);
    lb.addEventListener("click", e => { const b = e.target.closest("button"); if (b && b.classList.contains("lb-p")) go(-1); else if (b && b.classList.contains("lb-n")) go(1); else if (e.target !== im) close(); });
    lb.addEventListener("pointerdown", e => e.stopPropagation());
    show(); document.body.appendChild(lb); A.sfx.card();
    requestAnimationFrame(() => { lb.classList.add("in"); const x = lb.querySelector(".lb-x"); try { x.focus({ preventScroll: true }); } catch (e) { /* nada */ } });
  }

  /* teclado de la pantalla: flechas, AvPag/RePag, Inicio/Fin y Espacio desplazan las notas aunque el foco este en la lista */
  addEventListener("keydown", e => {
    const u = ui; if (!u || !u.root.isConnected || $("ptLb") || (A.core && A.core.S.settingsOpen) || (A.creditos && A.creditos.on) || e.ctrlKey || e.metaKey || e.altKey || (e.target && e.target.tagName === "INPUT")) return;
    const ae = document.activeElement, onBtn = ae && ae.tagName === "BUTTON", s = u.scroll, M = u.M;
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && ae && ae.classList && ae.classList.contains("pt-item")) return;   // en la lista, las flechas cambian de parche
    let dy = null, abs = null;
    if (e.key === "ArrowDown") dy = 90; else if (e.key === "ArrowUp") dy = -90;
    else if (e.key === "PageDown" || (e.key === " " && !onBtn && !e.shiftKey)) dy = M.ch * 0.88; else if (e.key === "PageUp" || (e.key === " " && !onBtn && e.shiftKey)) dy = -M.ch * 0.88;
    else if (e.key === "Home") abs = 0; else if (e.key === "End") abs = M.sh;
    if (dy == null && abs == null) return;
    e.preventDefault(); e.stopPropagation();
    if (abs != null) { flush(); s.scrollTo({ top: abs === 0 ? 0 : s.scrollHeight }); } else s.scrollBy({ top: dy });
  }, true);

  A.parche = { button, wire, open, hasNew, markSeen, _state: () => ({ cur, fresh: [...fresh], ui }) };
})(window.AIQ);
