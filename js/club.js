/*
 * Geolite - EL CLUB DE LA CASA (entrega 1): experiencia, nivel de socio y fichas de oro.
 *
 * La experiencia sale de saber: cada pregunta da hasta 10 puntos segun tu precision (la misma que puntua: 1 = clavada, 0 = muy lejos o sin
 * respuesta), en la Aventura, el Clasico y el Duelo. Terminar suma un poco: ronda o nivel superado +5, partida ganada +15, duelo ganado +10.
 * Lo ganado se guarda al momento (P.club.pend) y se cobra en el ticket del veredicto: alli la barra se llena, se cruzan niveles y la casa paga.
 * Nivel L -> L+1 cuesta min(400 + 20 (L-1), 1200) de experiencia; cada nivel paga 10 fichas de oro y cada 10 niveles, un cofre de 30 mas.
 * Las categorias del crupier (js/dealer.js) salen del nivel: una escalera de 15 (RANKS), de Turista a Leyenda de la casa, con frase y sello de
 * ascenso cada una. Nadie baja: el crupier conserva la que ya te habia dado. El color de la tarjeta va por tramos (papel, plata, oro, negra, leyenda).
 * Al estrenarse en un perfil con historia, la casa le reconoce lo jugado (experiencia por sus preguntas acertadas) y le paga sus niveles.
 *
 * Estado en el perfil: P.club = { v, xp, f (fichas de oro), pend, pq, fSeen (fichas que ya viste contar en la tarjeta) }.
 *   A.club.q(ratio)         una pregunta respondida (0-1)        A.club.bonus(n)       experiencia por terminar
 *   A.club.cash()           cobra lo pendiente -> { gain, from, to, fichas, ups } o null
 *   A.club.strip(res)       el bloque del ticket (HTML)          A.club.play(res, el)  su animacion: barra, sello de nivel, premio y fichas
 *   A.club.card()           la tarjeta de socio de la portada     A.club.wire()         su cuenta de fichas y su clic
 *   A.club.level()  A.club.fichas()  A.club.tierOf(nivel)  A.club.need(nivel)
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const CFG = { xpQ: 10, bonus: { ok: 5, win: 15, duel: 10 }, perLevel: 10, chest: 30, chestEvery: 10 };
  /* la escalera de categorias: [nombre en 12 idiomas, nivel minimo, tarjeta (0 papel, 1 plata, 2 oro, 3 negra, 4 leyenda)] */
  const RANKS = [
    ["Turista|Tourist|Touriste|Turista|Tourist|Turista||游客|관광객|観光客|Турист|Turysta", 1, 0],
    ["Mirón|Railbird|Badaud|Curioso|Kiebitz|Curioso||看客|구경꾼|見物人|Зевака|Gap", 3, 0],
    ["Habitual|Regular|Habitué|Frequentador|Stammgast|Habitué||常客|단골|常連|Завсегдатай|Bywalec", 5, 1],
    ["Apostador|Punter|Parieur|Apostador|Zocker|Scommettitore||赌客|도박사|勝負師|Игрок|Gracz", 8, 1],
    ["Trotamundos|Globetrotter|Globe-trotter|Andarilho|Weltenbummler|Giramondo||环球旅人|세계 여행자|旅人|Путешественник|Obieżyświat", 12, 1],
    ["Cartógrafo|Cartographer|Cartographe|Cartógrafo|Kartograf|Cartografo||制图师|지도 제작자|地図職人|Картограф|Kartograf", 16, 1],
    ["Rival|Rival|Rival|Rival|Rivale|Rivale||对手|라이벌|ライバル|Соперник|Rywal", 20, 2],
    ["Contador de cartas|Card counter|Compteur de cartes|Contador de cartas|Kartenzähler|Contatore di carte||算牌高手|카드 카운터|カードカウンター|Счётчик карт|Liczący karty", 25, 2],
    ["Geógrafo|Geographer|Géographe|Geógrafo|Geograf|Geografo||地理学家|지리학자|地理学者|Географ|Geograf", 30, 2],
    ["Gran apostador|High roller|Flambeur|Grande apostador|High Roller|Giocatore d'alto bordo||豪赌客|하이 롤러|ハイローラー|Хайроллер|Gruba ryba", 36, 2],
    ["Almirante|Admiral|Amiral|Almirante|Admiral|Ammiraglio||海军上将|제독|提督|Адмирал|Admirał", 43, 2],
    ["Socio|Member|Membre|Sócio|Mitglied|Socio||会员|회원|会員|Член клуба|Wspólnik", 50, 3],
    ["Embajador|Ambassador|Ambassadeur|Embaixador|Botschafter|Ambasciatore||大使|대사|大使|Посол|Ambasador", 60, 3],
    ["Crupier honorario|Honorary dealer|Croupier d'honneur|Crupiê honorário|Ehrencroupier|Croupier onorario||荣誉荷官|명예 딜러|名誉ディーラー|Почётный крупье|Honorowy krupier", 75, 3],
    ["Leyenda de la casa|House legend|Légende de la maison|Lenda da casa|Legende des Hauses|Leggenda della casa||赌场传奇|하우스의 전설|ハウスの伝説|Легенда заведения|Legenda kasyna", 100, 4],
  ];
  const need = L => Math.min(400 + 20 * (L - 1), 1200);
  const prof = () => A.profile.get();
  const save = () => A.profile.save();
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const P6 = s => A.pick6(s);

  const TX = {
    shop: "La boutique|The boutique|La boutique|A boutique|Die Boutique|La boutique||精品店|부티크|ブティック|Бутик|Butik",
    club: "Club de la casa|The House Club|Le Club de la maison|Clube da casa|Club des Hauses|Club della casa||赌场俱乐部|하우스 클럽|ハウスクラブ|Клуб заведения|Klub kasyna",
    card: "Tarjeta de socio|Member card|Carte de membre|Cartão de sócio|Mitgliedskarte|Tessera socio||会员卡|회원 카드|会員カード|Клубная карта|Karta członkowska",
    no: "N.º|No.|N°|Nº|Nr.|N.||No.|No.|No.|№|Nr",
    anon: "Anónimo|Anonymous|Anonyme|Anônimo|Anonym|Anonimo||匿名|익명|匿名|Аноним|Anonim",
    lv: "Nivel {n}|Level {n}|Niveau {n}|Nível {n}|Stufe {n}|Livello {n}||等级 {n}|레벨 {n}|レベル{n}|Уровень {n}|Poziom {n}",
    lvS: "Nv {n}|Lv {n}|Niv. {n}|Nv {n}|St. {n}|Liv. {n}||{n} 级|Lv {n}|Lv {n}|Ур. {n}|Poz. {n}",
    up: "¡Nivel {n}!|Level {n}!|Niveau {n} !|Nível {n}!|Stufe {n}!|Livello {n}!||等级 {n}！|레벨 {n}!|レベル{n}！|Уровень {n}!|Poziom {n}!",
    xp: "exp|XP|XP|XP|EP|PE||经验|EXP|EXP|опыт|PD",
    fichas: "Fichas de oro|Gold chips|Jetons d'or|Fichas de ouro|Goldchips|Fiche d'oro||金筹码|골드 칩|金のチップ|Золотые фишки|Złote żetony",
    chest: "Cofre de la casa|House chest|Coffre de la maison|Baú da casa|Truhe des Hauses|Forziere della casa||赌场宝箱|하우스 금고|ハウスの宝箱|Сундук заведения|Skrzynia kasyna",
    left: "Faltan {n} para el nivel {m}|{n} to level {m}|Encore {n} pour le niveau {m}|Faltam {n} para o nível {m}|Noch {n} bis Stufe {m}|Mancano {n} al livello {m}||距 {m} 级还差 {n}|레벨 {m}까지 {n}|レベル{m}まであと{n}|До уровня {m}: {n}|Do poziomu {m}: {n}",
    tip: "Tu tarjeta de socio. Cada pregunta te da experiencia según lo cerca que claves; cada nivel te paga fichas de oro.|Your member card. Every question gives you experience for how close you pin; every level pays you gold chips.|Ta carte de membre. Chaque question te donne de l'expérience selon ta précision ; chaque niveau te paie en jetons d'or.|Seu cartão de sócio. Cada pergunta dá experiência conforme o quão perto você crava; cada nível paga fichas de ouro.|Deine Mitgliedskarte. Jede Frage bringt Erfahrung, je näher du triffst; jede Stufe zahlt dir Goldchips.|La tua tessera socio. Ogni domanda ti dà esperienza in base a quanto ti avvicini; ogni livello ti paga in fiche d'oro.||你的会员卡。每道题按你点得多准给经验；每升一级都付你金筹码。|회원 카드예요. 문제마다 얼마나 가깝게 찍었는지에 따라 경험치를 얻고, 레벨마다 골드 칩을 받아요.|会員カード。問題ごとに正確さに応じて経験値が入り、レベルが上がるたびに金のチップがもらえる。|Твоя клубная карта. Каждый вопрос даёт опыт за точность, каждый уровень платит золотыми фишками.|Twoja karta członkowska. Każde pytanie daje doświadczenie za celność, a każdy poziom płaci złotymi żetonami.",
  };
  /* lo que dice el crupier al subirte de nivel: nunca la misma dos veces seguidas */
  const UP = [
    "Nivel {n}. La casa toma nota… y te paga. Qué remedio.|Level {n}. The house takes note… and pays up. No choice.|Niveau {n}. La maison prend note… et paie. Pas le choix.|Nível {n}. A casa anota… e paga. Fazer o quê.|Stufe {n}. Das Haus notiert es… und zahlt. Was bleibt mir übrig.|Livello {n}. La casa prende nota… e paga. Pazienza.||等级 {n}。赌场记下了……也付钱了。没办法。|레벨 {n}. 하우스가 기록했어… 그리고 지불하지. 어쩔 수 없잖아.|レベル{n}。ハウスは記録した…そして払う。仕方ない。|Уровень {n}. Заведение записало… и платит. Куда деваться.|Poziom {n}. Kasyno notuje… i płaci. Nie ma wyjścia.",
    "Sube, sube. Cada nivel tuyo me cuesta fichas de oro, ¿sabes?|Up you go. Every level of yours costs me gold chips, you know?|Monte, monte. Chacun de tes niveaux me coûte des jetons d'or, tu sais ?|Sobe, sobe. Cada nível seu me custa fichas de ouro, sabia?|Hoch mit dir. Jede deiner Stufen kostet mich Goldchips, weißt du?|Sali, sali. Ogni tuo livello mi costa fiche d'oro, sai?||升吧升吧。你每升一级都要花我金筹码，知道吗？|올라가, 올라가. 네 레벨 하나하나가 내 골드 칩이야, 알아?|上がれ上がれ。君のレベルが上がるたび、こっちは金のチップを払うんだぞ。|Растёшь, растёшь. Каждый твой уровень стоит мне золотых фишек, знаешь ли.|Rośniesz, rośniesz. Każdy twój poziom kosztuje mnie złote żetony, wiesz?",
    "Nivel {n}. Te lo apunto en la libreta, con mi mejor letra.|Level {n}. I'll write it in my book, in my best handwriting.|Niveau {n}. Je le note dans mon carnet, avec ma plus belle écriture.|Nível {n}. Anoto na minha caderneta, com minha melhor letra.|Stufe {n}. Ich trag's in mein Buch ein, in Schönschrift.|Livello {n}. Lo segno sul taccuino, con la mia calligrafia migliore.||等级 {n}。我用最漂亮的字记进小本子。|레벨 {n}. 수첩에 제일 예쁜 글씨로 적어둘게.|レベル{n}。手帳に一番きれいな字で書いておく。|Уровень {n}. Запишу в книжечку, лучшим почерком.|Poziom {n}. Wpiszę to do notesu, najładniejszym pismem.",
    "Otro nivel. A este paso me vas a pedir las llaves del casino.|Another level. At this rate you'll ask me for the casino keys.|Encore un niveau. À ce rythme, tu vas me demander les clés du casino.|Mais um nível. Desse jeito você vai me pedir as chaves do cassino.|Noch eine Stufe. So wie du loslegst, willst du bald die Casinoschlüssel.|Un altro livello. Di questo passo mi chiederai le chiavi del casinò.||又升一级。照这样下去，你要找我要赌场钥匙了。|또 레벨업이야. 이러다 카지노 열쇠까지 달라고 하겠어.|また一つ上がった。この調子じゃカジノの鍵までせがまれそうだ。|Ещё уровень. Так ты скоро ключи от казино попросишь.|Kolejny poziom. W tym tempie poprosisz mnie o klucze do kasyna.",
    "Nivel {n}. Ahí tienes tus fichas de oro. Cuéntalas delante de mí.|Level {n}. There are your gold chips. Count them in front of me.|Niveau {n}. Voilà tes jetons d'or. Compte-les devant moi.|Nível {n}. Aí estão suas fichas de ouro. Conta na minha frente.|Stufe {n}. Da sind deine Goldchips. Zähl sie vor meinen Augen.|Livello {n}. Ecco le tue fiche d'oro. Contale davanti a me.||等级 {n}。你的金筹码在这儿。当着我的面数。|레벨 {n}. 네 골드 칩이야. 내 앞에서 세어 봐.|レベル{n}。金のチップだ。目の前で数えてくれ。|Уровень {n}. Вот твои золотые фишки. Пересчитай при мне.|Poziom {n}. Oto twoje złote żetony. Policz je przy mnie.",
    "Me alegro por ti. Por mis fichas, no tanto.|I'm happy for you. For my chips, less so.|Je suis content pour toi. Pour mes jetons, moins.|Fico feliz por você. Pelas minhas fichas, nem tanto.|Ich freu mich für dich. Für meine Chips weniger.|Sono contento per te. Per le mie fiche, meno.||我替你高兴。替我的筹码，就没那么高兴了。|너 때문에 기뻐. 내 칩 때문엔 별로지만.|君のためには嬉しい。俺のチップのためには、そうでもない。|Рад за тебя. За мои фишки — не очень.|Cieszę się za ciebie. Za moje żetony — mniej.",
  ];
  const CHEST = "¡Nivel {n}! Cofre de la casa. Esto no lo abro para cualquiera.|Level {n}! House chest. I don't open this for just anyone.|Niveau {n} ! Coffre de la maison. Je ne l'ouvre pas pour n'importe qui.|Nível {n}! Baú da casa. Não abro isso pra qualquer um.|Stufe {n}! Truhe des Hauses. Die öffne ich nicht für jeden.|Livello {n}! Forziere della casa. Non lo apro per chiunque.||等级 {n}！赌场宝箱。这可不是谁都给开的。|레벨 {n}! 하우스 금고야. 아무한테나 안 열어줘.|レベル{n}！ハウスの宝箱だ。誰にでも開けるわけじゃない。|Уровень {n}! Сундук заведения. Его я открываю не каждому.|Poziom {n}! Skrzynia kasyna. Nie otwieram jej byle komu.";

  /* ------------------------------------------------------------------ el estado */
  function levelOf(xp) { let L = 1, left = Math.max(0, xp | 0); while (left >= need(L)) { left -= need(L); L++; } return { lvl: L, into: left, need: need(L) }; }
  function fichasFor(a, b) { let f = 0; for (let L = a + 1; L <= b; L++) f += CFG.perLevel + (L % CFG.chestEvery === 0 ? CFG.chest : 0); return f; }
  /* lo jugado antes del Club: experiencia por las preguntas del perfil (los aciertos pesan mas) y por las Aventuras ganadas */
  function retro(P) {
    const s = P.stats || {}, q = s.questions || 0; if (!q) return 0;
    const hit = Math.min(1, (s.hits || 0) / q);
    return Math.round(q * (0.15 + 0.65 * hit) * CFG.xpQ) + CFG.bonus.win * ((P.adv && P.adv.wins) || 0);
  }
  function st() {
    const P = prof();
    if (!P.club || typeof P.club !== "object" || typeof P.club.xp !== "number") {
      const xp = retro(P), L = levelOf(xp).lvl, f = fichasFor(1, L);
      P.club = { v: 1, xp, f, pend: 0, pq: 0, fSeen: f, lvSeen: L };
      save();
    }
    return P.club;
  }
  const tierOf = L => { let i = 0; RANKS.forEach((r, k) => { if (L >= r[1]) i = k; }); return i; };     // la categoria de un nivel
  const groupOf = i => RANKS[Math.max(0, Math.min(RANKS.length - 1, i | 0))][2];                           // su tarjeta

  /* ------------------------------------------------------------------ ganar */
  function q(ratio) { const c = st(); const r = Math.max(0, Math.min(1, +ratio || 0)); c.pend += r * CFG.xpQ; c.pq++; }
  function bonus(n) { const c = st(); c.pend += Math.max(0, +n || 0); }
  function cash() {
    const c = st(), gain = Math.round(c.pend || 0); if (gain <= 0) { c.pend = 0; c.pq = 0; return null; }
    const from = levelOf(c.xp); c.xp += gain; c.pend = 0; const pq = c.pq; c.pq = 0;
    const to = levelOf(c.xp), fichas = fichasFor(from.lvl, to.lvl); c.f += fichas; save();
    return { gain, pq, from, to, fichas, ups: to.lvl - from.lvl };
  }

  /* ------------------------------------------------------------------ el ticket: Club de la casa, +exp, la barra y lo que paga */
  const pct = (into, n) => Math.max(0, Math.min(100, (100 * into) / Math.max(1, n)));
  const fi = cls => `<img class="ck-fi${cls ? " " + cls : ""}" src="assets/icons/ficha_oro.webp" alt="" draggable="false">`;
  function strip(res) {
    if (!res) return "";
    const f0 = res.ups ? pct(res.from.into, res.from.need) : pct(res.from.into, res.from.need), lvTo = res.to.lvl;
    return `<div class="club-tk" data-ck>
      <div class="ck-h"><span class="ck-t">${fi()}${esc(P6(TX.club))}</span><b class="ck-g">+<span class="ck-gn">0</span> ${esc(P6(TX.xp))}</b></div>
      <div class="ck-row"><span class="ck-lv" data-lv>${esc(P6(TX.lvS).replace("{n}", res.from.lvl))}</span><span class="ck-bar"><i style="width:${f0}%"></i></span><span class="ck-lv nx" data-nx>${esc(P6(TX.lvS).replace("{n}", res.from.lvl + 1))}</span></div>
      <div class="ck-pay" hidden><span class="ck-up" data-up></span><b class="ck-f">+<span data-f>0</span>${fi("sm")}</b></div>
    </div>`;
  }
  /* la animacion: cuenta la experiencia, llena la barra y, en cada nivel que cruza, el sello, el premio (1, 2 o 3 golpes de la casa) y las fichas */
  function play(res, root, delay = 1500) {
    if (!res || !root) return;
    const el = root.querySelector("[data-ck]"); if (!el) return;
    const S = A.core && A.core.S, reduce = !!(S && S.reduce), bar = el.querySelector(".ck-bar i"), gn = el.querySelector(".ck-gn"), lvEl = el.querySelector("[data-lv]"), nxEl = el.querySelector("[data-nx]");
    const pay = el.querySelector(".ck-pay"), upEl = el.querySelector("[data-up]"), fEl = el.querySelector("[data-f]");
    const alive = () => el.isConnected;
    /* contador del recibo: de a a b en ms, con frenada al final; tick = el clic de la caja subiendo de tono (A.sfx.count(0-1)) */
    const count = (node, a, b, ms, tick) => {
      if (reduce || ms <= 0) { node.textContent = A.fmt(b); return; }
      const t0 = performance.now(), n = Math.max(2, Math.min(14, Math.round(ms / 90))); let k = -1;
      const f = now => { if (!node.isConnected) return; const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        node.textContent = A.fmt(Math.round(a + (b - a) * e));
        const kk = Math.floor(p * (n - 1)); if (tick && kk > k && A.sfx && A.sfx.count) { k = kk; A.sfx.count(kk / (n - 1)); }
        if (p < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    };
    const steps = []; let L = res.from.lvl, into = res.from.into, left = res.gain;
    while (left > 0) { const n = need(L), take = Math.min(left, n - into); steps.push({ L, a: into, b: into + take, n, cross: into + take >= n }); left -= take; into += take; if (into >= n) { L++; into = 0; } }
    const T = (fn, ms) => setTimeout(() => { if (alive()) fn(); }, ms);
    T(() => count(gn, 0, res.gain, Math.min(1400, 500 + res.gain), true), delay);              // la cuenta de la experiencia, tic a tic
    let t = delay + 250, fichas = 0, said = false;
    steps.forEach((s, i) => {
      const ms = reduce ? 0 : Math.max(380, Math.min(1100, ((s.b - s.a) / s.n) * 1400));
      T(() => { bar.style.transition = reduce ? "none" : `width ${ms}ms cubic-bezier(.3, .7, .4, 1)`; bar.style.width = pct(s.b, s.n) + "%"; }, t);
      t += ms;
      if (s.cross) {
        const nl = s.L + 1, k = nl % CFG.chestEvery === 0 ? 3 : nl % 5 === 0 ? 2 : 1, got = CFG.perLevel + (k === 3 ? CFG.chest : 0);
        T(() => {
          const f0 = fichas; fichas += got;
          el.classList.remove("hit"); if (A.restyle) A.restyle(el); el.classList.add("hit");
          pay.hidden = false; upEl.textContent = P6(k === 3 ? TX.chest : TX.up).replace("{n}", nl) + (k === 3 ? " · " + P6(TX.lvS).replace("{n}", nl) : "");
          count(fEl, f0, fichas, 600, false);
          lvEl.textContent = P6(TX.lvS).replace("{n}", nl); nxEl.textContent = P6(TX.lvS).replace("{n}", nl + 1);
          if (A.casa && A.casa.premio) A.casa.premio(k); else if (A.sfx && A.sfx.jackpot) A.sfx.jackpot(k);
          if (A.sfx && A.sfx.coin) setTimeout(() => A.sfx.coin(), 260);
          if (!said && A.dealer && A.dealer.on && A.dealer.say) { said = true; const pool = k === 3 ? [CHEST] : UP, c = st(); let i2 = Math.floor(Math.random() * pool.length); if (pool.length > 1 && i2 === c.lastLine) i2 = (i2 + 1) % pool.length; c.lastLine = i2; A.dealer.say(P6(pool[i2]).replace("{n}", nl), { mood: "sly", hold: 3200 }); }
        }, t);
        t += reduce ? 0 : 520 + 180 * k;
        T(() => { bar.style.transition = "none"; bar.style.width = "0%"; }, t - 1);
      }
    });
  }

  /* ------------------------------------------------------------------ la tarjeta de socio de la portada */
  const memberNo = () => { const P = prof(); return String((A.rank && A.rank.hash ? A.rank.hash(P.id + ":socio") : 421) % 10000).padStart(4, "0"); };
  const dealerTier = () => (A.dealer && A.dealer.tier ? A.dealer.tier() : 0);
  function tierNow() { return Math.max(tierOf(levelOf(st().xp).lvl), dealerTier()); }
  function card() {
    const c = st(), P = prof(), L = levelOf(c.xp), t = tierNow();
    const tt = A.ttAttr ? A.ttAttr(P6(TX.card), P6(TX.tip)) : "";
    return `<span class="hh-socio-w"><button type="button" class="hh-socio t${groupOf(t)}" id="socioBtn" ${tt}>
      <span class="sc-h">${A.icon ? A.icon("chip_r") : ""}<b>${esc(P6(TX.card))}</b></span>
      <span class="sc-nm"><span class="sc-n">${esc(P.name || P6(TX.anon))}</span><em>${esc(P6(TX.no))} ${memberNo()}</em></span>
      <span class="sc-c"><b>${esc(P6(RANKS[t][0]))}</b><i>${esc(P6(TX.lv).replace("{n}", L.lvl))}</i></span>
      <span class="sc-bar" aria-label="${esc(P6(TX.left).replace("{n}", A.fmt(L.need - L.into)).replace("{m}", L.lvl + 1))}"><i style="width:${pct(L.into, L.need)}%"></i></span>
      <span class="sc-f">${fi("sc")}<b id="socioF">${A.fmt(c.fSeen == null ? c.f : c.fSeen)}</b></span>
    </button>${A.boutique ? `<button type="button" class="hh-bq" id="bqBtn">${A.icon ? A.icon("purse") : ""}<span>${esc(P6(TX.shop))}</span></button>` : ""}</span>`;
  }
  /* al volver a la portada con fichas nuevas, la tarjeta las cuenta delante de ti (moneda a moneda), con su brillo */
  function wire(onOpen) {
    const b = document.getElementById("socioBtn"); if (!b) return;
    if (onOpen) b.onclick = () => { if (A.sfx && A.sfx.card) A.sfx.card(); onOpen(); };
    const c = st(), from = c.fSeen == null ? c.f : c.fSeen, to = c.f;
    if (to > from) {
      const el = document.getElementById("socioF"), S = A.core && A.core.S, reduce = !!(S && S.reduce);
      setTimeout(() => {
        if (!el.isConnected) return;
        b.classList.add("gain");
        const n = Math.min(12, to - from), step = reduce ? 0 : 1100 / n;
        for (let i = 1; i <= n; i++) setTimeout(() => { if (!el.isConnected) return; el.textContent = A.fmt(Math.round(from + ((to - from) * i) / n)); if (A.sfx && A.sfx.coin) A.sfx.coin(); }, i * step);
        setTimeout(() => { b.classList.remove("gain"); }, 1400);
      }, 900);
      c.fSeen = to; save();
    } else if (c.fSeen !== to) { c.fSeen = to; save(); }
  }

  A.club = {
    CFG, RANKS, need, levelOf, tierOf, groupOf, q, bonus, cash, strip, play, card, wire, tierNow,
    level: () => levelOf(st().xp).lvl, xp: () => st().xp, fichas: () => st().f,
    /* v0.3.132: gastar fichas de oro (la boutique). La tarjeta no las cuenta hacia arriba: lo gastado ya se ha visto irse */
    spend(n) { const c = st(); n = Math.max(0, Math.round(n)); if (!(c.f >= n)) return false; c.f -= n; c.fSeen = Math.min(c.fSeen == null ? c.f : c.fSeen, c.f); save(); return true; },
    bonusFor: kind => (kind === "win" ? CFG.bonus.win : kind === "ok" ? CFG.bonus.ok : kind === "duel" ? CFG.bonus.duel : 0),
    tx: TX, tierName: t => P6(RANKS[Math.max(0, Math.min(RANKS.length - 1, t | 0))][0]),
  };
})(window.AIQ);
