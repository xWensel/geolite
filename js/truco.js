/*
 * Geolite - EL TRUCO DE PRUEBAS (solo en las versiones previas a Steam): en la portada, 7 veces la tecla 7 seguidas = TODO DESBLOQUEADO.
 *   Los 100 logros, la Enciclopedia entera (las tres medallas de cada lugar, vista), las 56 mesas (sin estreno), todo el vestuario, el Club al
 *   nivel 100 con fichas de oro de sobra (sin la ceremonia de la categoria), las 12 campanas del Clasico con todos sus niveles y la Ascension V.
 *   Otra vez 7 x 7 y todo vuelve a como estaba antes del truco (se guarda una copia de la partida al activarlo).
 * Nada sale del ordenador: los logros NO se envian a Steam (P.truco: js/profile.js no los manda ni al ganarlos ni al arrancar) y no se toca
 * nada de las clasificaciones. Tampoco suena ni salta nada por cada cosa: se escribe directamente y se avisa una vez.
 * ON: el interruptor. APAGARLO (false) ANTES DE PUBLICAR EN STEAM: tools/steam-pack.mjs avisa si sigue encendido.
 * Va justo despues de js/support.js: al volver a como estaba, la copia se escribe ANTES de que el perfil, el crupier y la Enciclopedia lean
 * sus datos (si se escribiera antes de recargar, el pagehide del crupier la pisaria).
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const ON = true;
  const KEYS = ["atlasiq.profile.v1", "atlasiq.v2", "atlasiq.codex.v1", "atlasiq.dealer.v1"];   // lo que el truco cambia
  const COPIA = "atlasiq.truco.copia", VOLVER = "atlasiq.truco.volver", AVISO = "atlasiq.truco.aviso";
  A.truco = { on: ON };
  if (!ON) return;

  /* ---------------------------------------------------------------- volver a como estaba (al arrancar, antes que nadie) */
  try {
    const v = localStorage.getItem(VOLVER);
    if (v) {
      const bak = JSON.parse(v);
      KEYS.forEach(k => { if (!(k in bak)) return; if (bak[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, bak[k]); });
      localStorage.removeItem(VOLVER); localStorage.removeItem(COPIA);
      sessionStorage.setItem(AVISO, "off");
    }
  } catch (e) { /* sin almacenamiento */ }

  const P6 = s => A.pick6(s), $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const TX = {
    eyb: "Truco de pruebas · 7 × 7|Test cheat · 7 × 7|Astuce de test · 7 × 7|Truque de teste · 7 × 7|Test-Cheat · 7 × 7|Trucco di prova · 7 × 7||测试秘籍 · 7 × 7|테스트 치트 · 7 × 7|テスト用チート · 7 × 7|Тестовый чит · 7 × 7|Kod testowy · 7 × 7",
    on: "Todo desbloqueado|Everything unlocked|Tout débloqué|Tudo desbloqueado|Alles freigeschaltet|Tutto sbloccato||全部解锁|모두 해금|すべて解放|Всё открыто|Wszystko odblokowane",
    off: "Todo como antes|Back to normal|Tout comme avant|Tudo como antes|Alles wie vorher|Tutto come prima||恢复原样|모두 원래대로|すべて元どおり|Всё как было|Wszystko jak dawniej",
    ach: "{n} logros|{n} achievements|{n} succès|{n} conquistas|{n} Erfolge|{n} obiettivi||{n} 个成就|업적 {n}개|実績 {n}個|Достижений: {n}|Osiągnięcia: {n}",
    codex: "{n} tarjetas de la Enciclopedia|{n} Encyclopedia cards|{n} cartes de l'Encyclopédie|{n} cartas da Enciclopédia|{n} Lexikonkarten|{n} carte dell'Enciclopedia||{n} 张百科卡片|백과사전 카드 {n}장|百科事典のカード {n}枚|Карточек энциклопедии: {n}|Karty encyklopedii: {n}",
    mesas: "{n} mesas del mapa|{n} map tables|{n} tables de carte|{n} mesas do mapa|{n} Kartentische|{n} tavoli della mappa||{n} 张地图牌桌|지도 테이블 {n}개|マップのテーブル {n}種|Столов для карты: {n}|Stoły mapy: {n}",
    vest: "{n} prendas del vestuario|{n} wardrobe items|{n} pièces de garde-robe|{n} peças do guarda-roupa|{n} Garderobenstücke|{n} capi del guardaroba||{n} 件衣橱单品|의상 {n}점|衣装 {n}点|Вещей гардероба: {n}|Rzeczy z garderoby: {n}",
    club: "Nivel {n} del Club|Club level {n}|Niveau {n} du Club|Nível {n} do Clube|Club-Stufe {n}|Livello {n} del Club||俱乐部 {n} 级|클럽 레벨 {n}|クラブ レベル{n}|Уровень клуба {n}|Poziom klubu {n}",
    fichas: "{n} fichas de oro|{n} gold chips|{n} jetons d'or|{n} fichas de ouro|{n} Goldchips|{n} fiche d'oro||{n} 金筹码|골드 칩 {n}개|金のチップ {n}枚|Золотых фишек: {n}|Złote żetony: {n}",
    clasico: "Las {n} campañas del Clásico, con todos sus niveles|All {n} Classic campaigns, every level|Les {n} campagnes du Classique, tous les niveaux|As {n} campanhas do Clássico, todos os níveis|Alle {n} Klassik-Kampagnen, jede Stufe|Tutte le {n} campagne del Classico, ogni livello||经典模式全部 {n} 个战役，所有关卡|클래식 캠페인 {n}개 전부, 모든 레벨|クラシックの全{n}キャンペーン、全レベル|Все кампании классики ({n}), все уровни|Wszystkie kampanie klasyczne ({n}), każdy poziom",
    asc: "Ascensión V|Ascension V|Ascension V|Ascensão V|Aufstieg V|Ascensione V||进阶五|어센션 5|アセンション5|Восхождение V|Wniebowstąpienie V",
    footOn: "Solo en las versiones de prueba: estos logros no se envían a Steam. Otra vez 7 × 7 y todo vuelve a como estaba.|Test builds only: these achievements are not sent to Steam. 7 × 7 again and everything goes back to how it was.|Versions de test uniquement : ces succès ne sont pas envoyés à Steam. Encore 7 × 7 et tout redevient comme avant.|Só nas versões de teste: estas conquistas não são enviadas à Steam. 7 × 7 de novo e tudo volta a ser como antes.|Nur in Testversionen: Diese Erfolge werden nicht an Steam gesendet. Noch einmal 7 × 7 und alles ist wie vorher.|Solo nelle versioni di prova: questi obiettivi non vengono inviati a Steam. Di nuovo 7 × 7 e tutto torna com'era.||仅限测试版本：这些成就不会发送到 Steam。再按一次 7 × 7，一切恢复原样。|테스트 버전 전용: 이 업적은 Steam에 전송되지 않아요. 다시 7 × 7을 누르면 모두 원래대로 돌아가요.|テスト版のみ：これらの実績は Steam に送られない。もう一度 7 × 7 で元どおりに。|Только в тестовых версиях: эти достижения не отправляются в Steam. Ещё раз 7 × 7 — и всё вернётся как было.|Tylko w wersjach testowych: te osiągnięcia nie trafiają do Steam. Jeszcze raz 7 × 7 i wszystko wraca do stanu sprzed.",
    footOff: "Tu partida está como antes del truco.|Your save is as it was before the cheat.|Ta sauvegarde est comme avant l'astuce.|Seu progresso está como antes do truque.|Dein Spielstand ist wie vor dem Cheat.|I tuoi progressi sono come prima del trucco.||你的存档已恢复到使用秘籍之前。|세이브가 치트 사용 전으로 돌아갔어요.|セーブデータはチート前の状態に戻った。|Сохранение такое же, как до чита.|Twój zapis jest taki jak przed kodem.",
    tecla: "Pulsa cualquier tecla|Press any key|Appuie sur une touche|Aperte qualquer tecla|Beliebige Taste drücken|Premi un tasto qualsiasi||按任意键|아무 키나 누르세요|何かキーを押す|Нажми любую клавишу|Naciśnij dowolny klawisz",
  };
  const fill = (k, n) => P6(TX[k]).replace("{n}", A.fmt ? A.fmt(n) : n);

  /* ---------------------------------------------------------------- desbloquear todo */
  function todo() {
    const P = A.profile.get(), C = A.core, now = Date.now();
    const bak = {}; KEYS.forEach(k => { bak[k] = localStorage.getItem(k); });
    try { localStorage.setItem(COPIA, JSON.stringify(bak)); } catch (e) { return null; }                // sin copia, no se toca nada
    P.truco = { t: now };                                                                               // desde ya, nada de esta partida va a Steam
    A.ACH.forEach(a => { if (!P.ach[a.id]) P.ach[a.id] = now; });                                       // los logros, sin aviso ni sonido (no pasan por A.ach.emit)
    const nCodex = A.codex && A.codex._todo ? A.codex._todo() : 0;                                     // la Enciclopedia (sin el monton de tarjetas ni los logros)
    /* el Club: nivel 100 (Leyenda de la casa) y fichas de sobra; la tarjeta no las cuenta y el crupier ya la tiene sellada */
    let lvl = 0, f = 0;
    if (A.club) {
      A.club.level(); const c = P.club; let xp = 0; for (let L = 1; L < 100; L++) xp += A.club.need(L);
      c.xp = Math.max(c.xp || 0, xp); c.f = Math.max(c.f || 0, 5000); c.fSeen = c.f; c.pend = 0; c.pq = 0;
      lvl = A.club.level(); f = c.f; c.lvSeen = lvl;
      if (A.dealer && A.dealer._sello) A.dealer._sello(A.club.tierOf(lvl));
    }
    /* las mesas: las de la tienda, tuyas; todas vistas (sin estreno en la portada). Las ganadas salen solas de los logros y la Ascension */
    const ms = P.mesas = P.mesas || {}; ms.own = ms.own || {}; ms.seen = ms.seen || {};
    (A.MESAS || []).forEach(m => { if (!ms.seen[m.id]) ms.seen[m.id] = now; });
    if (A.mesas && A.mesas.shop) A.mesas.shop().forEach(m => { if (!ms.own[m.id]) ms.own[m.id] = now; });
    /* el vestuario, entero (sin ponerse nada) */
    const vs = P.vest = P.vest && typeof P.vest === "object" ? P.vest : { own: {}, wear: {} }; vs.own = vs.own || {}; vs.wear = vs.wear || {};
    if (A.vestuario) A.vestuario.items.forEach(it => { if (!it.casa && !vs.own[it.id]) vs.own[it.id] = now; });
    if (A.punteros && A.punteros._todo) A.punteros._todo();
    if (A.socio && A.socio._todo) A.socio._todo();                                                    // los iconos y titulos de la tienda (los de logros salen de los logros)                                            // los punteros de la tienda (sin ponerse nada)
    /* el Clasico: todos los niveles de las 12 campanas */
    const camps = A.CAMPAIGNS || [];
    if (C && C.prog) { camps.forEach(cp => { const p = C.prog(cp.id); p.unlocked = Math.max(p.unlocked || 1, cp.levels.length); }); C.save(); }
    /* la Aventura: Ascension V */
    if (P.adv) P.adv.asc = Math.max(P.adv.asc || 0, 5);
    A.profile.save();
    return { ach: A.ACH.length, codex: nCodex || (A.codex && A.codex.total ? A.codex.total() : 0), mesas: (A.MESAS || []).length, vest: A.vestuario ? A.vestuario.items.length : 0, club: lvl, fichas: f, clasico: camps.length };
  }
  /* volver: la copia se escribe al arrancar (arriba), antes de que nadie lea sus datos */
  function volver() {
    const raw = localStorage.getItem(COPIA); if (!raw) return false;
    try { localStorage.setItem(VOLVER, raw); } catch (e) { return false; }
    if (A.sfx && A.sfx.card) A.sfx.card();
    setTimeout(() => location.reload(), 120);
    return true;
  }

  /* ---------------------------------------------------------------- el aviso */
  function aviso(on, r) {
    const old = $("truco"); if (old) old.remove();
    const el = document.createElement("div"); el.id = "truco"; el.className = "tq-veil"; el.setAttribute("role", "status");
    const lines = on && r ? [fill("ach", r.ach), fill("codex", r.codex), fill("mesas", r.mesas), fill("vest", r.vest), fill("club", r.club) + " · " + fill("fichas", r.fichas), fill("clasico", r.clasico), P6(TX.asc)] : [];
    el.innerHTML = `<div class="tq-card gx-paper${on ? "" : " off"}">
      <span class="gx-eyb tq-eyb">${esc(P6(TX.eyb))}</span>
      <b class="tq-plate">${esc(P6(on ? TX.on : TX.off))}</b>
      ${lines.length ? `<ul class="tq-list">${lines.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      <p class="tq-foot">${esc(P6(on ? TX.footOn : TX.footOff))}</p>
      <span class="tq-key">${esc(P6(TX.tecla))}</span></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("in"));
    const t0 = performance.now();
    const close = e => {
      if (performance.now() - t0 < 900) return;                                                       // el ultimo 7 no lo cierra
      if (e) { e.preventDefault(); e.stopImmediatePropagation(); }
      removeEventListener("keydown", close, true); removeEventListener("pointerdown", close, true); clearTimeout(tm);
      el.classList.remove("in"); setTimeout(() => el.remove(), 260);
    };
    addEventListener("keydown", close, true); addEventListener("pointerdown", close, true);
    const tm = setTimeout(() => close(), on ? 9000 : 5000);
  }

  /* ---------------------------------------------------------------- 7 veces 7 en la portada */
  const enPortada = () => { const C = A.core, S = C && C.S; return !!S && !S.booting && S.phase === "title" && S.hub === "home" && !S.settingsOpen && !$("truco"); };
  let n = 0, last = 0;
  addEventListener("keydown", e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key !== "7" || !enPortada()) { n = 0; return; }
    const now = performance.now(); n = now - last < 1600 ? n + 1 : 1; last = now;
    if (n < 7) return;
    n = 0;
    const P = A.profile && A.profile.get();
    if (P && P.truco) { volver(); return; }
    const r = todo(); if (!r) return;
    if (A.casa && A.casa.premio) A.casa.premio(3); else if (A.sfx && A.sfx.jackpot) A.sfx.jackpot(3);
    if (A.haptic) A.haptic([40, 60, 40, 60, 80]);
    if (A.hub && A.hub.screen) A.hub.screen("home");                                                // la portada, ya con el Club al 100 y todo
    aviso(true, r);
  });
  /* despues de volver: el aviso, en cuanto la portada esta delante */
  try {
    if (sessionStorage.getItem(AVISO) === "off") {
      const wait = setInterval(() => { if (enPortada()) { clearInterval(wait); sessionStorage.removeItem(AVISO); aviso(false); } }, 400);   // se borra al verse (si se recarga antes, sigue pendiente)
    }
  } catch (e) { /* sin almacenamiento */ }
  A.truco = { on: ON, activo: () => !!(A.profile && A.profile.get().truco), todo, volver };
})(window.AIQ);
