/*
 * Geolite - "Otro dia" del Reto diario (v0.3.19). Un calendario de casino con los dias pasados (los que jugaste, con su ficha y tu puntuacion) y una
 * casilla para escribir el codigo de una semilla ("K7Q-2XD", el que se ve en el Reto diario): te dice de que dia es y lo marca. Elegir un dia pasado
 * reparte su mano en la pantalla del Reto diario como PRACTICA (js/hub.js, A.adv.beginPractice): sin clasificacion, logros ni records.
 * Uso: A.otroDia.open({ sel: "daily-AAAAMMDD", from: boton, pick: board => ... }).
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id), P6 = s => A.pick6(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DY = () => A.rank.daily, BACK = 730;                         // dos anos hacia atras: el calendario y la busqueda de codigos
  const loc = () => ((A.LANGS || []).find(l => l.code === A.lang) || { loc: A.lang || "es" }).loc;
  const TITLE = () => P6("Otro día|Another day|Un autre jour|Outro dia|Anderer Tag|Altro giorno||其他日期|다른 날|別の日|Другой день|Inny dzień");
  const SUB = () => P6("Juega la mano de un día pasado como práctica: no cuenta para la clasificación.|Play a past day's hand as practice: it doesn't count for the leaderboard.|Joue la main d'un jour passé en entraînement : ça ne compte pas pour le classement.|Jogue a mão de um dia passado como treino: não conta para o placar.|Spiel das Blatt eines vergangenen Tages als Training: Es zählt nicht für die Rangliste.|Gioca la mano di un giorno passato come allenamento: non conta per la classifica.||以练习方式玩过去某天的手牌：不计入排行榜。|지난 날의 패를 연습으로 플레이해요. 리더보드에는 반영되지 않아요.|過去の日の手札を練習として遊ぶ。ランキングには反映されない。|Сыграй раздачу прошедшего дня как тренировку: в таблицу не идёт.|Zagraj rozdanie z minionego dnia jako trening: nie liczy się do rankingu.");
  const midnight = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const cap = s => (s ? s.charAt(0).toLocaleUpperCase(loc()) + s.slice(1) : s);
  const fmtD = (d, o) => { try { return d.toLocaleDateString(loc(), o); } catch (e) { return d.toDateString(); } };
  const compact = n => { try { return new Intl.NumberFormat(loc(), { notation: "compact", maximumFractionDigits: 0 }).format(n); } catch (e) { return A.fmt(n); } };
  /* primer dia de la semana segun el idioma (lunes en Europa, domingo en ingles, japones, coreano, chino y portugues de Brasil) */
  const firstDay = () => { try { const L = new Intl.Locale(loc()), w = (L.getWeekInfo && L.getWeekInfo()) || L.weekInfo; if (w && w.firstDay) return w.firstDay % 7; } catch (e) { /* sin weekInfo */ } return /^(en|ja|ko|zh|pt)/.test(A.lang) ? 0 : 1; };
  let o = null;                                                      // { sel, y, m, pick, back }

  const earliest = () => { const d = midnight(); d.setDate(d.getDate() - BACK); return d; };
  const boardOf = d => DY().board(d);
  function open({ sel, pick, from } = {}) {
    const layer = $("layer"); if (!layer || $("odWrap")) return;
    const s = sel ? DY().date(sel) : midnight();
    o = { sel: boardOf(s), y: s.getFullYear(), m: s.getMonth(), pick, back: from || document.activeElement };
    const close6 = A.t("codex.close");
    const wk = (() => { const f = firstDay(), base = new Date(2024, 0, 7); return [0, 1, 2, 3, 4, 5, 6].map(i => { const d = new Date(base); d.setDate(7 + ((f + i) % 7)); return `<span>${esc(fmtD(d, { weekday: "narrow" }))}</span>`; }).join(""); })();   // 7-1-2024 fue domingo
    layer.insertAdjacentHTML("beforeend", `<div class="od-wrap" id="odWrap"><div class="od-veil" id="odVeil" role="button" aria-label="${esc(close6)}"></div>
      <section class="od" id="od" role="dialog" aria-modal="true" aria-labelledby="odH" tabindex="-1">
        <header class="od-head"><span class="od-ic">${A.icon("almanac")}</span><div class="od-ht"><h3 id="odH">${TITLE()}</h3><p>${SUB()}</p></div><button type="button" class="pd-x" id="odX" aria-label="${esc(close6)}">${A.icon("u_close")}</button></header>
        <div class="od-body">
          <div class="od-cal">
            <div class="od-nav"><button type="button" class="pd-pg prev" id="odPrev" aria-label="${esc(P6("Mes anterior|Previous month|Mois précédent|Mês anterior|Vorheriger Monat|Mese precedente||上个月|이전 달|前の月|Предыдущий месяц|Poprzedni miesiąc"))}">${A.icon("u_next")}</button><b id="odMonth"></b><button type="button" class="pd-pg next" id="odNext" aria-label="${esc(P6("Mes siguiente|Next month|Mois suivant|Próximo mês|Nächster Monat|Mese successivo||下个月|다음 달|次の月|Следующий месяц|Następny miesiąc"))}">${A.icon("u_next")}</button></div>
            <div class="od-wk" aria-hidden="true">${wk}</div>
            <div class="od-grid" id="odGrid" role="grid"></div>
          </div>
          <aside class="od-side">
            <div class="od-day" id="odDay" aria-live="polite"></div>
            <form class="od-code" id="odForm" autocomplete="off">
              <label for="odIn">${P6("Código de semilla|Seed code|Code de graine|Código da semente|Seed-Code|Codice del seme||种子代码|시드 코드|シードコード|Код зерна|Kod ziarna")}</label>
              <div class="od-row"><span class="od-in">${A.icon("dice", "sm")}<input id="odIn" maxlength="8" spellcheck="false" autocapitalize="characters" placeholder="ABC-123"></span><button type="submit" class="btn-line" id="odFind">${P6("Buscar|Find|Chercher|Buscar|Suchen|Cerca||查找|찾기|探す|Найти|Szukaj")}</button></div>
              <p class="od-msg" id="odMsg"></p>
            </form>
          </aside>
        </div>
      </section></div>`);
    $("odVeil").onclick = () => close(); $("odX").onclick = () => close();
    $("odPrev").onclick = () => month(-1); $("odNext").onclick = () => month(1);
    $("odForm").onsubmit = e => { e.preventDefault(); find(); };
    $("odIn").oninput = e => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); e.target.value = v.length > 3 ? v.slice(0, 3) + "-" + v.slice(3) : v; $("odMsg").textContent = ""; $("odMsg").className = "od-msg"; };
    render(); A.sfx.card();
    const p = $("od"); p.style.zoom = innerWidth >= 900 && innerHeight >= 520 ? A.uiK() : 1;
    const sb = p.querySelector(".od-c.sel"); (sb || p).focus({ preventScroll: true });
  }
  function close(silent) {
    const w = $("odWrap"); if (!w) return;
    ["odWrap", "od", "odVeil"].forEach(id => { const el = $(id); if (el) el.removeAttribute("id"); });
    w.classList.add("out"); setTimeout(() => w.remove(), 220);
    if (!silent) A.sfx.ui();
    const b = o && o.back; o = null; if (b && b.isConnected && b.focus) b.focus({ preventScroll: true });
  }
  /* cambia de mes sin salirse de los dos anos (ni pasar del mes actual) */
  function month(d) {
    if (!o) return;
    const t = new Date(o.y, o.m + d, 1), lo = earliest(), now = midnight();
    if (t < new Date(lo.getFullYear(), lo.getMonth(), 1) || t > new Date(now.getFullYear(), now.getMonth(), 1)) return;
    o.y = t.getFullYear(); o.m = t.getMonth(); A.sfx.chip(d > 0 ? 2 : 0); render(d);
  }
  function render(dir = 0) {
    if (!o || !$("odGrid")) return;
    const now = midnight(), lo = earliest(), first = new Date(o.y, o.m, 1), days = new Date(o.y, o.m + 1, 0).getDate(), lead = (first.getDay() - firstDay() + 7) % 7;
    $("odMonth").textContent = cap(fmtD(first, { month: "long", year: "numeric" }));
    $("odPrev").disabled = new Date(o.y, o.m, 0) < lo; $("odNext").disabled = o.y === now.getFullYear() && o.m === now.getMonth();
    let h = ""; for (let i = 0; i < lead; i++) h += `<span class="od-c pad"></span>`;
    for (let n = 1; n <= days; n++) {
      const d = new Date(o.y, o.m, n), b = boardOf(d), fut = d > now, old = d < lo, st = !fut && !old ? DY().get(b) : null, today = +d === +now;
      const cls = ["od-c", fut || old ? "off" : "", today ? "today" : "", st && st.done ? "played" : "", b === o.sel ? "sel" : ""].filter(Boolean).join(" ");
      h += `<button type="button" class="${cls}" data-b="${b}" ${fut || old ? "disabled" : ""} aria-label="${esc(cap(fmtD(d, { weekday: "long", day: "numeric", month: "long" })))}" aria-pressed="${b === o.sel}" style="--i:${lead + n - 1}"><b>${n}</b>${st && st.done ? `<i>${compact(st.total)}</i>` : today ? `<i>${P6("Hoy|Today|Auj.|Hoje|Heute|Oggi||今天|오늘|今日|Сегодня|Dziś")}</i>` : ""}</button>`;
    }
    const g = $("odGrid"); g.innerHTML = h; g.style.setProperty("--dx", dir * 18 + "px"); g.classList.toggle("turn", !!dir);
    g.querySelectorAll(".od-c[data-b]:not(:disabled)").forEach(c => (c.onclick = () => select(c.dataset.b)));
    side();
  }
  function select(b, quiet) {
    if (!o) return;
    o.sel = b; const d = DY().date(b);
    if (d.getFullYear() !== o.y || d.getMonth() !== o.m) { o.y = d.getFullYear(); o.m = d.getMonth(); render(); }
    else { $("odGrid").querySelectorAll(".od-c").forEach(c => { const on = c.dataset.b === b; c.classList.toggle("sel", on); if (c.dataset.b) c.setAttribute("aria-pressed", on); }); side(); }
    if (!quiet) A.sfx.ui();
  }
  /* la ficha del dia elegido: fecha, semilla, su mano (baraja, Ascension y regalo) y lo que hiciste; el boton reparte esa mano */
  function side() {
    const el = $("odDay"); if (!el || !o) return;
    const b = o.sel, d = DY().date(b), today = b === DY().board(), st = DY().get(b), h = DY().hand(b), deck = A.ADV.DECKS[h.deck], gift = h.gift && A.RELICS[h.gift];
    const tries = [0, 1, 2].map(i => { const t = st.tries[i]; return `<span class="${t && !t.live ? "on" : ""}">${t && !t.live ? A.fmt(t.s || 0) : "—"}</span>`; }).join("");
    el.innerHTML = `<p class="od-date">${esc(cap(fmtD(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" })))}</p>
      <p class="od-seed">${A.icon("dice", "sm")}<b>${DY().code(b)}</b></p>
      <div class="od-hand"><span ${A.ttAttr(A.tx(deck.n), A.tx(deck.d))}>${A.icon(deck.ico)}</span>${gift ? `<span ${A.ttAttr(A.tx(gift.n), A.tx(gift.d))}>${A.icon(h.gift)}</span>` : ""}<em>${A.tx(deck.n)}${h.asc ? ` · ${A.T("Ascensión", "Ascension")} ${h.asc}` : ""}</em></div>
      <div class="od-res"><i>${today ? P6("Hoy llevas|So far today|Aujourd'hui|Hoje você tem|Heute bisher|Oggi finora||今天目前|오늘 지금까지|今日の合計|Сегодня пока|Dziś masz") : P6("Tu puntuación ese día|Your score that day|Ton score ce jour-là|Sua pontuação naquele dia|Deine Punkte an dem Tag|Il tuo punteggio quel giorno||你那天的得分|그날의 점수|その日のスコア|Твой счёт в тот день|Twój wynik tego dnia")}</i>
        ${st.done ? `<b>${A.fmt(st.total)}</b><span class="od-tries">${tries}</span>` : `<b class="none">${today ? P6("Aún no has jugado|Not played yet|Pas encore joué|Ainda não jogou|Noch nicht gespielt|Non ancora giocato||还没玩|아직 안 했어요|まだプレイしていない|Ещё не сыграно|Jeszcze nie grano") : P6("No lo jugaste|You didn't play it|Tu ne l'as pas joué|Você não jogou|Nicht gespielt|Non l'hai giocato||你没玩过|플레이하지 않았어요|プレイしていない|Не сыграно|Nie zagrano")}</b>`}</div>
      <button type="button" class="btn-ink od-go" id="odGo"><span>${today ? P6("Ir al reto de hoy|Go to today's challenge|Aller au défi du jour|Ir ao desafio de hoje|Zur heutigen Herausforderung|Vai alla sfida di oggi||前往今日挑战|오늘의 도전으로|今日のチャレンジへ|К испытанию дня|Do dzisiejszego wyzwania") : P6("Practicar este día|Practice this day|S'entraîner sur ce jour|Treinar este dia|Diesen Tag trainieren|Allenati su questo giorno||练习这一天|이 날 연습하기|この日を練習|Тренировать этот день|Trenuj ten dzień")}</span><span class="ar">${A.icon("u_next", "sm")}</span></button>`;
    $("odGo").onclick = () => { const pick = o.pick; close(true); if (pick) pick(b); };
  }
  /* el codigo de una semilla -> su dia (se prueban los dos ultimos anos; el codigo sale de la semilla, no al reves) */
  function find() {
    const raw = ($("odIn").value || "").toUpperCase().replace(/[^A-Z0-9]/g, ""), msg = $("odMsg");
    if (raw.length !== 6) { msg.className = "od-msg bad"; msg.textContent = P6("El código tiene 6 caracteres, como ABC-123|The code has 6 characters, like ABC-123|Le code a 6 caractères, comme ABC-123|O código tem 6 caracteres, como ABC-123|Der Code hat 6 Zeichen, z. B. ABC-123|Il codice ha 6 caratteri, come ABC-123||代码有 6 个字符，例如 ABC-123|코드는 ABC-123처럼 6자예요|コードは ABC-123 のような6文字|В коде 6 символов, например ABC-123|Kod ma 6 znaków, np. ABC-123"); A.sfx.deny(); return; }
    const code = raw.slice(0, 3) + "-" + raw.slice(3), d = midnight();
    for (let i = 0; i <= BACK; i++, d.setDate(d.getDate() - 1)) {
      const b = boardOf(d); if (DY().code(b) !== code) continue;
      select(b, true); A.sfx.coin(1);
      msg.className = "od-msg ok"; msg.textContent = i === 0 ? P6("Es la semilla de hoy|That's today's seed|C'est la graine du jour|É a semente de hoje|Das ist der Seed von heute|È il seme di oggi||这是今天的种子|오늘의 시드예요|今日のシードだ|Это зерно сегодняшнего дня|To dzisiejsze ziarno")
        : P6("Semilla del {d}|Seed from {d}|Graine du {d}|Semente de {d}|Seed vom {d}|Seme del {d}||{d} 的种子|{d}의 시드|{d}のシード|Зерно за {d}|Ziarno z {d}").replace("{d}", fmtD(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
      return;
    }
    msg.className = "od-msg bad"; A.sfx.deny();
    msg.textContent = P6("Ningún día de los dos últimos años tiene esa semilla|No day in the last two years has that seed|Aucun jour des deux dernières années n'a cette graine|Nenhum dia dos últimos dois anos tem essa semente|Kein Tag der letzten zwei Jahre hat diesen Seed|Nessun giorno degli ultimi due anni ha questo seme||过去两年里没有哪天是这个种子|지난 2년 동안 그 시드를 쓴 날이 없어요|過去2年間にそのシードの日はない|Ни у одного дня за последние два года нет такого зерна|Żaden dzień z ostatnich dwóch lat nie ma tego ziarna");
  }
  /* teclado: Esc cierra; con el calendario abierto nada llega al juego de debajo (escribir el codigo no dispara atajos). Flechas: dia a dia */
  document.addEventListener("keydown", e => {
    if (!$("odWrap") || e.ctrlKey || e.metaKey || e.altKey) return;
    e.stopPropagation();
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    const c = e.target.closest && e.target.closest(".od-c[data-b]"), step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (c && step) {
      e.preventDefault();
      const d = DY().date(c.dataset.b); d.setDate(d.getDate() + step);
      if (d > midnight() || d < earliest()) return;
      select(boardOf(d)); const n = $("odGrid").querySelector(`.od-c[data-b="${boardOf(d)}"]`); if (n) n.focus({ preventScroll: true });
    }
  }, true);

  A.otroDia = { open, close, SUB, isOpen: () => !!$("odWrap") };
})(window.AIQ);
