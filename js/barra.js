/*
 * Geolite - LA BARRA DE LA CASA (modulo aparte, 31-oct-2026). Un modo solo de casino con los juegos de la Barra del Campamento:
 *   entras con 50 fichas de oro (o con la partida gratis de cada dia), recibes 1.000 fichas de la casa y juegas 20 jugadas eligiendo cualquier mesa; apuesta libre
 *   (minimo 25, sin tope), semilla propia por partida, sin levantarte antes. Las fichas finales dan tickets (1 por cada 10) para el canje.
 *   Jugada 10 y 20: BOTE (la ganancia paga doble). Tras 3 aciertos seguidos, el crupier puede regalar una ficha dorada (el siguiente pago, doble).
 * Es un MODULO: se activa y se quita con A.barra.setOn(false) (localStorage atlasiq.barra.on); sin el, la portada no muestra la placa y los juegos siguen en la Aventura.
 * EL ADAPTADOR: los juegos de js/casino-*.js se escriben contra un `cx` (monedero, semilla, pantalla). Aqui se les da un cx propio (`mkCx`): run = el monedero de la partida,
 *   r = el numero de jugada (la semilla), coinCost = la apuesta libre, rouShell = el de la Aventura avisando al cerrarse. Los cuatro juegos de adventure.js (Rojo o negro,
 *   Moneda, Ruleta de premios, Trile) ensenan sus pantallas con A.adv.casino.core y aqui solo se decide el resultado y el pago.
 * Diseno cerrado en la maqueta «La Barra de la casa» (decisiones D1-D17): salon con planta, mesas sin crear ocultas, apuesta libre sin tope, tickets que se guardan.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const L6 = A.L6, C = () => A.core, $ = id => document.getElementById(id), esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const FEE = 50, START = 1000, PLAYS = 20, MIN = 25, TK = 10;
  const BOTE = new Set([10, 20]);                                   // las jugadas de BOTE (la ganancia paga doble)
  const T = {
    title: L6("La Barra de la casa|The House Bar|Le Bar de la maison|O Bar da casa|Die Bar des Hauses|Il Bar della casa||赌场吧台|하우스 바|ハウスのバー|Бар заведения|Bar kasyna"),
    plaque: L6("La Barra|The Bar|Le Bar|O Bar|Die Bar|Il Bar||吧台|바|バー|Бар|Bar"),
    sub: L6("Entrada {n} · fichas de oro|Entry {n} · gold chips|Entrée {n} · jetons d'or|Entrada {n} · fichas de ouro|Eintritt {n} · Goldchips|Ingresso {n} · fiche d'oro||入场 {n} · 金筹码|입장 {n} · 골드 칩|入場 {n} · 金チップ|Вход {n} · золотые фишки|Wstęp {n} · złote żetony"),
    play: L6("Jugada {n} de {m}|Play {n} of {m}|Jeu {n} sur {m}|Jogada {n} de {m}|Spiel {n} von {m}|Giocata {n} di {m}||第 {n} 局，共 {m} 局|{n} / {m}번째 판|{n} / {m} プレイ目|Ход {n} из {m}|Gra {n} z {m}"),
    chips: L6("fichas|chips|jetons|fichas|Chips|fiches||筹码|칩|チップ|фишки|żetony"),
    bet: L6("Apuesta|Bet|Mise|Aposta|Einsatz|Puntata||下注|베팅|賭け|Ставка|Zakład"),
    min: L6("Mín.|Min|Min.|Mín.|Min.|Min.||最小|최소|最小|Мин.|Min."),
    all: L6("Todo|All in|Tout|Tudo|Alles|Tutto||全部|올인|全部|Всё|Wszystko"),
    pick: L6("Elige una mesa.|Pick a table.|Choisis une table.|Escolha uma mesa.|Wähl einen Tisch.|Scegli un tavolo.||选一张桌子。|테이블을 고르세요.|テーブルを選んで。|Выбери стол.|Wybierz stół."),
    intro: L6("20 jugadas con 1.000 fichas. Lo que tengas al final se rankea y se cambia por tickets.|20 plays with 1,000 chips. What you have left is ranked and exchanged for tickets.|20 jeux avec 1 000 jetons. Ce qu'il te reste est classé et échangé contre des tickets.|20 jogadas com 1.000 fichas. O que sobrar entra no ranking e vira tickets.|20 Spiele mit 1.000 Chips. Was du am Ende hast, kommt ins Ranking und wird zu Tickets.|20 giocate con 1.000 fiches. Quello che hai alla fine va in classifica e diventa ticket.||20 局，1,000 筹码。最后剩下的会进入排名并兑换成票券。|1,000칩으로 20판. 마지막에 남은 칩은 순위에 오르고 티켓으로 교환됩니다.|1,000チップで20プレイ。最後に残った分がランキングに載り、チケットに交換されます。|20 ходов с 1 000 фишек. Что останется, попадёт в рейтинг и обменяется на билеты.|20 gier z 1000 żetonów. To, co zostanie, trafia do rankingu i zamienia się w bilety."),
    free: L6("Partida gratis de hoy|Today's free game|Partie gratuite du jour|Partida grátis de hoje|Gratisspiel von heute|Partita gratis di oggi||今日免费局|오늘의 무료 판|今日の無料プレイ|Бесплатная игра на сегодня|Dzisiejsza darmowa gra"),
    pay: L6("Entrar con {n} fichas de oro|Enter with {n} gold chips|Entrer avec {n} jetons d'or|Entrar com {n} fichas de ouro|Mit {n} Goldchips eintreten|Entra con {n} fiche d'oro||用 {n} 金筹码入场|골드 칩 {n}개로 입장|金のチップ{n}枚で入場|Войти за {n} золотых фишек|Wejdź za {n} złotych żetonów"),
    poor: L6("Te faltan fichas de oro|Not enough gold chips|Pas assez de jetons d'or|Fichas de ouro insuficientes|Nicht genug Goldchips|Fiche d'oro insufficienti||金筹码不足|골드 칩이 부족해요|金のチップが足りない|Не хватает золотых фишек|Za mało złotych żetonów"),
    best: L6("Tu récord|Your best|Ton record|Seu recorde|Dein Rekord|Il tuo record||你的纪录|내 최고 기록|自己ベスト|Твой рекорд|Twój rekord"),
    end: L6("¡Fin de la partida!|Game over!|Fin de la partie !|Fim da partida!|Spielende!|Fine della partita!||游戏结束！|게임 종료!|ゲーム終了！|Игра окончена!|Koniec gry!"),
    broke: L6("Te quedas sin fichas|You're out of chips|Plus de jetons|Ficou sem fichas|Keine Chips mehr|Hai finito le fiches||筹码用完了|칩이 바닥났어요|チップがなくなった|Фишки кончились|Skończyły ci się żetony"),
    final: L6("fichas finales|final chips|jetons finaux|fichas finais|Endchips|fiches finali||最终筹码|최종 칩|最終チップ|итоговые фишки|końcowe żetony"),
    tickets: L6("Tickets ganados|Tickets won|Tickets gagnés|Tickets ganhos|Gewonnene Tickets|Ticket vinti||获得票券|획득 티켓|獲得チケット|Выигранные билеты|Zdobyte bilety"),
    bigp: L6("Mejor jugada|Best play|Meilleur coup|Melhor jogada|Beste Runde|Giocata migliore||最佳一局|최고의 판|ベストプレイ|Лучший ход|Najlepsza gra"),
    leave: L6("Salir|Leave|Quitter|Sair|Verlassen|Esci||离开|나가기|出る|Выйти|Wyjdź"),
    again: L6("Jugar otra|Play again|Rejouer|Jogar outra|Nochmal|Gioca ancora||再来一局|한 번 더|もう一回|Ещё раз|Jeszcze raz"),
    back: L6("Menú|Menu|Menu|Menu|Menü|Menu||菜单|메뉴|メニュー|Меню|Menu"),
    bote: L6("¡Jugada de BOTE: paga doble!|BONUS play: pays double!|Jeu BONUS : paie double !|Jogada BÔNUS: paga em dobro!|BONUS-Spiel: zahlt doppelt!|Giocata BONUS: paga doppio!||奖池局：赔付翻倍！|보너스 판: 두 배 지급!|ボーナスプレイ：配当2倍！|Бонусный ход: двойная выплата!|Gra BONUS: podwójna wygrana!"),
    gold: L6("Ficha dorada: tu próximo pago ×2|Gold chip: your next payout ×2|Jeton doré : ton prochain gain ×2|Ficha dourada: seu próximo ganho ×2|Goldchip: dein nächster Gewinn ×2|Fiche dorata: la prossima vincita ×2||金筹码：下次赔付 ×2|금 칩: 다음 지급 ×2|金チップ：次の配当×2|Золотая фишка: следующий выигрыш ×2|Złoty żeton: następna wygrana ×2"),
    streak: L6("RACHA ×{n}|STREAK ×{n}|SÉRIE ×{n}|SEQUÊNCIA ×{n}|SERIE ×{n}|SERIE ×{n}||连击 ×{n}|연속 ×{n}|連続 ×{n}|СЕРИЯ ×{n}|SERIA ×{n}"),
    boteWin: L6("¡BOTE! +{n}|JACKPOT! +{n}|BONUS ! +{n}|BÔNUS! +{n}|BONUS! +{n}|BONUS! +{n}||奖池！+{n}|보너스! +{n}|ボーナス！+{n}|БОНУС! +{n}|BONUS! +{n}"),
    goldWin: L6("¡Ficha dorada! +{n}|Gold chip! +{n}|Jeton doré ! +{n}|Ficha dourada! +{n}|Goldchip! +{n}|Fiche dorata! +{n}||金筹码！+{n}|금 칩! +{n}|金チップ！+{n}|Золотая фишка! +{n}|Złoty żeton! +{n}"),
    close: L6("Cerrar|Close|Fermer|Fechar|Schließen|Chiudi||关闭|닫기|閉じる|Закрыть|Zamknij"),
    soon: L6("Mesas que irán llegando|Tables on the way|Des tables à venir|Mesas a caminho|Weitere Tische folgen|Altri tavoli in arrivo||更多桌子即将到来|곧 오는 테이블|近日追加のテーブル|Новые столы скоро|Kolejne stoły wkrótce"),
  };
  const f = (t, o) => A.tx(t).replace(/\{(\w)\}/g, (m, k) => (o && o[k] != null ? o[k] : m));
  const fmt = n => Math.round(n).toLocaleString(A.lang === "en" ? "en-US" : A.lang || "es");
  /* ---------- el modulo: activo o no ---------- */
  const KEYON = "atlasiq.barra.on";
  const isOn = () => { try { return localStorage.getItem(KEYON) !== "0"; } catch (e) { return true; } };
  const prof = () => { const P = A.profile.get(); const b = (P.barra = P.barra && typeof P.barra === "object" ? P.barra : {}); b.tickets = b.tickets | 0; b.best = b.best | 0; b.runs = b.runs | 0; b.free = b.free || ""; b.hist = Array.isArray(b.hist) ? b.hist : []; return b; };
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const saveP = () => { try { A.profile.save(); } catch (e) { /* sin almacenamiento */ } };
  /* ---------- las mesas (las que existen; las demas no se ven hasta que existan) ---------- */
  const TABLES = [
    { id: "red", n: "bet:red", ico: "bet_red", c: ["#2f8a5c", "#0f3b28"], at: [150, 235], core: 1 },
    { id: "coin", n: "bet:coin", ico: "bet_coin", c: ["#2d62b8", "#0f2548"], at: [350, 235], core: 1 },
    { id: "wheel", n: "bet:wheel", ico: "bet_wheel", c: ["#8a3a9a", "#2d0f38"], at: [150, 415], core: 1 },
    { id: "cups", n: "bet:cups", ico: "bet_cups", c: ["#a02a4a", "#3a0c1a"], at: [350, 415], core: 1 },
    { id: "dice", n: "bet:dice", ico: "bet_dados", c: ["#14797f", "#08303a"], at: [930, 235] },
    { id: "plk", n: "bet:plk", ico: "bet_plinko", c: ["#13808f", "#08323a"], at: [1130, 235] },
    { id: "globo", n: "bet:globo", ico: "bet_globo", c: ["#c86a5a", "#4a2a6a"], at: [930, 415] },
    { id: "rasca", n: "bet:rasca", ico: "bet_rasca", c: ["#e6cf94", "#8a6a2a"], at: [1130, 415] }];
  const tables = () => TABLES.filter(t => t.core ? !!(A.adv && A.adv.casino && A.adv.casino.core) : !!(A.adv && A.adv.casino && A.adv.casino.def && A.adv.casino.def(t.id)));
  const betName = id => { const B = A.adv.casino.core.BETS[id]; return B ? A.tx(B.n) : id; };
  /* ---------- la partida ---------- */
  let R = null, RUN = null, root = null, busy = false, restoreRun = null, prevCoins = 0;
  const mkRun = seed => ({ coins: START, reds: {}, seed, attempt: 0, stats: { coinsEarned: 0 }, asc: 0, act: 0, round: 0, lives: 3, maxLives: 3, stock: [], perks: [], sup: {}, bets: {} });
  const newRunState = (paid) => { const seed = "barra:" + Date.now().toString(36) + ":" + Math.random().toString(36).slice(2, 8); return { seed, play: 0, streak: 0, stake: MIN, gold: false, log: [], over: false, paid, tk: 0, started: Date.now() }; };
  const savedRun = () => { const b = prof(); return b.run && b.run.seed ? b.run : null; };
  const persistRun = () => { if (!R || R.over) return; const b = prof(); b.run = Object.assign({}, R, { coins: RUN.coins }); saveP(); };
  const stakeNow = () => Math.max(MIN, Math.min(R.stake, Math.floor(RUN.coins / MIN) * MIN || RUN.coins));
  /* el cx de un juego de casino: monedero y semilla de la partida, apuesta libre, pantalla propia */
  function mkCx(r) {
    const base = A.adv.casino.core.CX, cx = Object.create(base);
    const own = (k, v) => Object.defineProperty(cx, k, { value: v, writable: true, configurable: true, enumerable: true });
    Object.defineProperty(cx, "run", { get: () => RUN, configurable: true });
    own("r", r); own("round", () => r); own("persist", persistRun); own("plS", () => ""); own("casOf", rr => RUN.reds[rr] || null);
    own("coinCost", () => stakeNow()); own("STAKES", [0]);
    own("refresh", () => hud()); own("coins", () => hud());
    own("rouShell", (cls, html, vars, done) => base.rouShell(cls, html, vars, () => { try { done && done(); } finally { closed(); } }));
    own("att", 0); own("b", null);
    return cx;
  }
  const headFor = id => { const B = A.adv.casino.core.BETS[id], ic = A.adv.casino.core.ic; return `<span class="sp-ic">${ic(B.ico)}</span><span class="sp-t" data-tt="${esc(A.tx(B.d))}"><b>${esc(A.tx(B.n))}</b><i>${esc(A.tx(B.s))}</i></span>`; };
  const CNb = () => A.icon("chip_r", "cn");
  const stakePill = () => `<em class="sp-p bt-stake">${CNb()}${stakeNow()}</em>`;
  /* ---------- las cuatro mesas de adventure.js: carta y resultado propios, pantallas de la Aventura ---------- */
  const COREC = {
    red: {
      card: () => { const BT = A.adv.casino.core.BT, BT2 = A.adv.casino.core.BT2; return `<div class="sup bet cas bt-red" data-bet="red">${headFor("red")}<span class="bt-pick"><button class="bt-c bt-cr" type="button" data-pick="red">${A.tx(BT.red)}</button><button class="bt-c bt-cb" type="button" data-pick="black">${A.tx(BT.black)}</button><button class="bt-c bt-cg" type="button" data-pick="green">${A.tx(BT2.green)}</button>${stakePill()}</span></div>`; },
      wire: (el, r) => el.querySelectorAll("[data-pick]").forEach(b => (b.onclick = e => { e.stopPropagation(); const K = A.adv.casino.core, st = stakeNow(); if (busy || RUN.coins < st) return; const pick = b.dataset.pick;
        const n = Math.floor(A.rng(`${RUN.seed}:rojo:${r}`)() * 37), out = K.colorOf(n), win = pick === out, pay = win ? st * (out === "green" ? 36 : 2) : 0;
        RUN.coins -= st; RUN.coins += pay; RUN.reds[r] = { id: "red", pick, out, n, win, stake: st, pay }; busy = true; begin(r);
        A.sfx.rouBet(pick === "green" ? 2 : pick === "red" ? 0 : 1); K.spinRoulette({ pick, n, skip: null, last: false, extra: false, stake: st, purse: RUN.coins - pay + st }, closed); })) },
    coin: {
      card: () => { const BT = A.adv.casino.core.BT, CT = A.adv.casino.core.CT; return `<div class="sup bet cas bt-coin" data-bet="coin">${headFor("coin")}<span class="bt-pick"><button class="bt-c bt-ch" type="button" data-side="heads">${A.tx(CT.heads)}</button><button class="bt-c bt-ct" type="button" data-side="tails">${A.tx(CT.tails)}</button>${stakePill()}</span></div>`; },
      wire: (el, r) => el.querySelectorAll("[data-side]").forEach(b => (b.onclick = e => { e.stopPropagation(); const K = A.adv.casino.core, st = stakeNow(); if (busy || RUN.coins < st) return; const pick = b.dataset.side;
        const u = A.rng(`${RUN.seed}:moneda:${r}`)(), out = u < 1 / 64 ? "edge" : (u - 1 / 64) / (63 / 64) < 0.5 ? "heads" : "tails", win = out === pick, pay = out === "edge" || win ? st * 2 : 0;
        RUN.coins += pay - st; RUN.reds[r] = { id: "coin", pick, out, win: win || out === "edge", stake: st, pay }; busy = true; begin(r);
        A.sfx.rouBet(pick === "heads" ? 0 : 1); K.spinCoin({ pick, out, win, pay, stake: st, purse: RUN.coins - pay + st }, closed); })) },
    wheel: {
      card: () => { const CT = A.adv.casino.core.CT; return `<div class="sup bet cas bt-wheel" data-bet="wheel">${headFor("wheel")}<span class="bt-pick"><button class="bt-c bt-cs" type="button" data-spin="1">${A.tx(CT.spin)}</button>${stakePill()}</span></div>`; },
      wire: (el, r) => { const b = el.querySelector("[data-spin]"); b.onclick = e => { e.stopPropagation(); const K = A.adv.casino.core, st = stakeNow(); if (busy || RUN.coins < st) return;
        const w = Math.floor(A.rng(`${RUN.seed}:premios:${r}`)() * K.PRIZES.length), P = K.PRIZES[w], mult = WMUL[P.k] || 0, pay = Math.round(st * mult), WT = K.WT, v = n => "+" + fmt(n);
        const info = pay > 0 ? { name: A.tx(WT[P.k]), detail: v(pay), tone: "good", jp: P.k === "jack" ? 3 : P.k === "coin" || P.k === "life" || P.k === "seguro" ? 1 : 1 } : { name: A.tx(WT[P.k]), detail: A.tx(WT[P.k + "D"] || WT.noneD), tone: P.t === "bad" ? "bad" : "none", jp: 0 };
        RUN.coins += pay - st; RUN.reds[r] = { id: "wheel", w, stake: st, pay }; busy = true; begin(r); A.sfx.rouBet(2);
        A.adv._wedge = Q => { const m = WMUL[Q.k] || 0; return m ? "×" + (m % 1 ? m.toFixed(1).replace(".", ",") : m) : Q.k === "steal" ? "−" : ""; };
        const undo = K.useRun(mkWheelRun()); K.spinWheel({ w, info, stake: st, purse: RUN.coins - pay + st }, () => { A.adv._wedge = null; undo(); closed(); }); }; } },
    cups: {
      card: () => { const TRL = A.adv.casino.core.TRL; return `<div class="sup bet cas bt-cups" data-bet="cups">${headFor("cups")}<span class="bt-pick"><button class="bt-c bt-cu" type="button" data-play="1">${A.tx(TRL.play)}</button>${stakePill()}</span></div>`; },
      wire: (el, r) => { const b = el.querySelector("[data-play]"); b.onclick = e => { e.stopPropagation(); const K = A.adv.casino.core, st = stakeNow(); if (busy || RUN.coins < st) return;
        const tier = st >= 250 ? 2 : st >= 100 ? 1 : 0, u = A.rng(`${RUN.seed}:trile:${r}`), coinId = Math.floor(u() * 3), joke = u() < 1 / 50;
        RUN.coins -= st; const rec = (RUN.reds[r] = { id: "cups", stake: st, coin: coinId, joke, pick: null, win: false, pay: 0 }); busy = true; begin(r); A.sfx.rouBet(1); if (K.cupsPreload) K.cupsPreload();
        K.spinCups({ stake: st, purse: RUN.coins + st, tier, coinId, joke, seq: K.cupsMoves(`${RUN.seed}:trile:baile:${r}`, tier),
          onPick(id) { rec.pick = id; rec.win = !joke && id === coinId; rec.pay = rec.win ? Math.round(st * 2.85) : 0; RUN.coins += rec.pay; hud(); return rec; },
          onError() { if (rec.pick == null) { RUN.coins += st; delete RUN.reds[r]; hud(); } } }, closed); }; } } };
  const WMUL = { coin: 1.5, jack: 3.5, cafe: 0.5, seguro: 1.5, streak: 1, life: 1.5 };   // la Ruleta de premios en la Barra: todo se paga en fichas (los demas premios, nada)
  const mkWheelRun = () => ({ asc: 0, act: 0, round: 0, coins: RUN.coins, lives: 3, maxLives: 3, stats: { coinsEarned: 0 }, sup: {}, bets: {}, reds: {}, perks: [], stock: [], seed: RUN.seed });
  /* ---------- salon ---------- */
  const hudHtml = () => `<div class="brr-hud"><div class="brr-ttl"><b id="bH">${esc(A.tx(T.title))}</b><i>${esc(f(T.sub, { n: FEE }))}</i></div><div class="brr-mid"><div class="brr-pips">${Array.from({ length: PLAYS }, (_, i) => `<i class="${i < R.play ? "on" : i === R.play ? "now" : ""}"></i>`).join("")}</div><span>${esc(f(T.play, { n: Math.min(R.play + 1, PLAYS), m: PLAYS }))}</span><div class="brr-streak">${R.streak >= 2 ? esc(f(T.streak, { n: R.streak })) : ""}</div></div><div class="brr-stk" id="brStk">${A.icon("chip_r")}<div><b>${fmt(RUN.coins)}</b><small>${esc(A.tx(T.chips))}</small></div></div></div>`;
  const tableHtml = t => `<button type="button" class="brr-tbl" data-g="${t.id}" style="left:${t.at[0]}px;top:${t.at[1]}px;--c1:${t.c[0]};--c2:${t.c[1]}"><i class="brr-felt">${A.icon(t.ico)}</i><b class="brr-plq">${esc(betName(t.id))}</b></button>`;
  function paint(msg) {
    if (!root) return;
    const ts = tables(), stk = stakeNow(), max = Math.max(MIN, Math.floor(RUN.coins / MIN) * MIN);
    root.innerHTML = `<div class="gx-veil"></div><section class="barra-screen gx-stage gx-camp" data-nosq aria-labelledby="bH"><div class="brr-board">
      <button type="button" class="hub-back brr-back" id="brBack">${A.icon("u_back", "sm")}${esc(A.tx(T.back))}</button>${hudHtml()}
      <div class="brr-floor">${ts.map(tableHtml).join("")}<div class="brr-counter"><img src="assets/icons/dealer_neutral.webp" alt="" data-cart="dealer_neutral" data-cdef="assets/icons/dealer_neutral.webp"></div></div>
      <div class="brr-stakes"><span>${esc(A.tx(T.bet))}</span><input id="brStk2" type="range" min="${MIN}" max="${max}" step="${MIN}" value="${Math.min(stk, max)}" ${max <= MIN ? "disabled" : ""} aria-label="${esc(A.tx(T.bet))}"><b id="brStkv">${fmt(Math.min(stk, max))}</b><button type="button" data-q="min">${esc(A.tx(T.min))}</button><button type="button" data-q="half">50 %</button><button type="button" data-q="all">${esc(A.tx(T.all))}</button><span class="brr-note">${R.gold ? esc(A.tx(T.gold)) : BOTE.has(R.play + 1) ? esc(A.tx(T.bote)) : ""}</span></div>
      <div class="brr-say" id="brSay">${esc(msg || A.tx(T.pick))}</div></div></section>`;
    wire(); dealerOff();
    if (A.fitK) A.fitK();
  }
  function wire() {
    $("brBack").onclick = () => leave();
    const s = $("brStk2"), v = $("brStkv"); s.oninput = () => { R.stake = +s.value; v.textContent = fmt(R.stake); const p = root.querySelector(".brr-pop .bt-stake"); if (p) p.innerHTML = CNb() + stakeNow(); A.sfx.tick && A.sfx.tick(1); };
    root.querySelectorAll(".brr-stakes [data-q]").forEach(b => (b.onclick = () => { const max = Math.max(MIN, Math.floor(RUN.coins / MIN) * MIN); R.stake = b.dataset.q === "min" ? MIN : b.dataset.q === "all" ? max : Math.max(MIN, Math.round(RUN.coins / 2 / MIN) * MIN); s.value = Math.min(R.stake, max); v.textContent = fmt(+s.value); R.stake = +s.value; const p = root.querySelector(".brr-pop .bt-stake"); if (p) p.innerHTML = CNb() + stakeNow(); A.sfx.chip && A.sfx.chip(0.4); }));
    root.querySelectorAll(".brr-tbl").forEach(t => (t.onclick = () => open(t.dataset.g, t)));
    root.addEventListener("keydown", e => { if (e.key === "Escape" && root.querySelector(".brr-pop")) { closePop(); e.stopPropagation(); } });
  }
  const dealerOff = () => { try { A.dealer.casino(true); } catch (e) { /* sin crupier */ } };   // el crupier de la esquina no sale en el salon (las pantallas de casino lo vuelven a llamar al cerrarse)
  function closePop() { root.querySelectorAll(".brr-pop").forEach(p => p.remove()); }
  function open(id, tbl) {
    if (busy || R.over) return; closePop(); prevCoins = RUN.coins; const t = TABLES.find(x => x.id === id), r = R.play + 1, pop = document.createElement("div"); pop.className = "brr-pop";
    pop.innerHTML = `<button type="button" class="brr-x" aria-label="${esc(A.tx(T.close))}">×</button><div class="tb-sup">${t.core ? COREC[id].card() : cardOf(id, r)}</div>`;
    const x = parseFloat(tbl.style.left), y = parseFloat(tbl.style.top); pop.style.left = Math.max(16, Math.min(1280 - 273, x > 640 ? x - 270 : x + 80)) + "px"; pop.style.top = Math.max(120, Math.min(720 - 200, y - 70)) + "px";
    root.querySelector(".brr-board").appendChild(pop); pop.querySelector(".brr-x").onclick = closePop;
    const el = pop.querySelector(".sup.bet"); if (t.core) COREC[id].wire(el, r); else wireExt(id, el, r);
    const first = el.querySelector("button"); if (first) first.focus({ preventScroll: true });
  }
  const cardOf = (id, r) => { const cx = mkCx(r), d = A.adv.casino.def(id); cx.head = headFor(id); return d.card(cx); };
  function wireExt(id, el, r) { A.adv.casino.def(id).wire(el, mkCx(r)); }
  /* una jugada empieza cuando el juego cobra (deja su registro en RUN.reds[r]) y termina al cerrarse su pantalla */
  function begin(r) { busy = true; closePop(); }
  function closed() {
    if (!R || !root) return; busy = false; const r = R.play + 1;
    if (!RUN.reds[r]) { hud(); return; }                              // la pantalla se abrio y se cerro sin jugar (nada cobrado)
    settle(r);
  }
  function settle(r) {
    const st = RUN.reds[r].stake || 0, gain0 = RUN.coins - prevCoins; let msg = "", gain = gain0, bonus = 0;
    const win = gain0 > 0, mult = (BOTE.has(r) ? 2 : 1) * (R.gold ? 2 : 1);
    if (win && mult > 1) { bonus = gain0 * (mult - 1); RUN.coins += bonus; gain += bonus; msg = BOTE.has(r) ? f(T.boteWin, { n: fmt(bonus) }) : f(T.goldWin, { n: fmt(bonus) }); }
    if (win && R.gold) R.gold = false;
    R.streak = win ? R.streak + 1 : 0; if (win && R.streak >= 3 && !R.gold && Math.random() < 0.35) R.gold = true;
    R.play = r; R.log.push({ g: RUN.reds[r].id, net: gain });
    const m = st ? (gain0 + st) / st : 0, lvl = !win ? 0 : m >= 10 ? 3 : m >= 3 ? 2 : 1;
    if (lvl >= 1) { try { A.sfx.jackpot(lvl); C().jpShake && C().jpShake(lvl); if (A.haptic) A.haptic([20, 30]); } catch (e) { /* sin sonido */ } }
    if (RUN.coins <= 0) { RUN.coins = 0; R.over = true; } if (R.play >= PLAYS) R.over = true;
    persistRun(); paint(msg || (win ? "+" + fmt(gain) : "−" + fmt(Math.abs(gain)))); const e = $("brStk"); if (e) e.classList.add(win ? "up" : "down");
    if (R.over) endScreen();
  }
  function hud() { const e = $("brStk"); if (e && RUN) e.querySelector("b").textContent = fmt(RUN.coins); }
  /* ---------- entrada y final ---------- */
  function entry() {
    const b = prof(), freeOk = b.free !== today(), poor = !freeOk && !(A.club && A.club.fichas() >= FEE), o = document.createElement("div"); o.className = "brr-over";
    o.innerHTML = `<div class="brr-tk"><h4>${esc(A.tx(T.title))}</h4><p>${esc(A.tx(T.intro))}</p>${b.best ? `<p class="brr-rec">${esc(A.tx(T.best))}: <b>${fmt(b.best)}</b></p>` : ""}${freeOk ? `<button type="button" id="brFree" data-primary>${esc(A.tx(T.free))}</button>` : ""}<button type="button" id="brPay" ${freeOk ? 'class="alt"' : "data-primary"} ${poor ? "disabled" : ""}>${esc(f(T.pay, { n: FEE }))}</button>${poor ? `<p class="brr-poor">${esc(A.tx(T.poor))}</p>` : ""}<button type="button" id="brOut" class="ghost">${esc(A.tx(T.leave))}</button></div>`;
    root.querySelector(".brr-board").appendChild(o);
    const go = paid => { if (paid === "fee") { if (!(A.club && A.club.spend(FEE))) return; } else b.free = today(); b.runs++; saveP(); R = newRunState(paid); RUN = mkRun(R.seed); persistRun(); o.remove(); paint(); };
    if (freeOk) $("brFree").onclick = () => go("free"); $("brPay").onclick = () => go("fee"); $("brOut").onclick = () => leave(true);
  }
  function endScreen() {
    const final = Math.max(0, RUN.coins), tk = Math.floor(final / TK), b = prof(); R.tk = tk; b.tickets += tk; if (final > b.best) b.best = final; b.hist.unshift({ at: Date.now(), final, tk }); b.hist.length = Math.min(b.hist.length, 30); delete b.run; saveP();
    const bestP = R.log.reduce((m, x) => (x.net > m.net ? x : m), { net: 0, g: "" }), o = document.createElement("div"); o.className = "brr-over";
    o.innerHTML = `<div class="brr-tk"><h4>${esc(A.tx(final <= 0 ? T.broke : T.end))}</h4><div class="brr-big">${fmt(final)}</div><div class="brr-lab">${esc(A.tx(T.final))}</div><div class="brr-row"><span>${esc(A.tx(T.bigp))}</span><b>${bestP.net > 0 ? esc(betName(bestP.g)) + " +" + fmt(bestP.net) : "—"}</b></div><div class="brr-row"><span>${esc(A.tx(T.tickets))}</span><b>${fmt(tk)}</b></div><div class="brr-row"><span>${esc(A.tx(T.best))}</span><b>${fmt(b.best)}</b></div><button type="button" id="brAgain" data-primary>${esc(A.tx(T.again))}</button><button type="button" id="brOut2" class="ghost">${esc(A.tx(T.leave))}</button></div>`;
    setTimeout(() => { if (!root) return; closePop(); root.querySelector(".brr-board").appendChild(o); $("brAgain").onclick = () => { o.remove(); entry(); }; $("brOut2").onclick = () => leave(true); }, 700);
  }
  function leave(done) { closePop(); if (RUN && R && !R.over) persistRun(); if (restoreRun) { restoreRun(); restoreRun = null; } A.adv._barra = false; try { A.dealer.casino(false); } catch (e) { /* sin crupier */ } root = null; R = null; RUN = null; A.hub.screen("home"); }
  /* ---------- abrir ---------- */
  function open_() {
    if (!A.adv || !A.adv.casino || !A.adv.casino.core) return A.hub.screen("home");
    A.adv._barra = true;                                              // la moneda de las pantallas de casino pasa a ser la ficha de la casa
    C().dialog("", "tablewrap"); root = $("dlg");
    const sv = savedRun(); if (sv) { R = Object.assign(newRunState("free"), sv); RUN = mkRun(R.seed); RUN.coins = sv.coins != null ? sv.coins : START; R.over = false; paint(); } else { R = newRunState(null); RUN = mkRun(R.seed); paint(); entry(); }
  }
  /* la placa de la portada (arriba a la derecha, junto a las fichas de oro) */
  const button = () => isOn() ? `<button type="button" class="brr-plate" id="barraBtn" aria-label="${esc(A.tx(T.title))}">${A.icon("bet_red")}<b>${esc(A.tx(T.plaque))}</b></button>` : "";
  const wireButton = () => { const b = $("barraBtn"); if (b) b.onclick = () => { A.sfx.card && A.sfx.card(); A.hub.screen("barra"); }; };
  A.barra = { open: open_, button, wireButton, on: isOn, setOn: v => { try { localStorage.setItem(KEYON, v ? "1" : "0"); } catch (e) { /* sin almacenamiento */ } }, tx: T, FEE, START, PLAYS, MIN, state: () => ({ R, RUN }), _leave: leave };
})(window.AIQ);
