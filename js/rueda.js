/*
 * Geolite - LA RUEDA DEL DIA Y LA RACHA (maqueta «Rueda y rachas», votada el 14-nov-2026; v0.4.81).
 *
 *   La rueda del dia   una tirada gratis al dia que gira el crupier: la misma rueda que la Ruleta de premios de la Aventura (A.adv.wheel), con
 *                      12 cunas iguales (1 de 12 cada una) y ninguna mala. Sustituye al Regalo de la casa de La tienda (js/escaparate.js).
 *                      Las tiradas se guardan hasta 3 dias: si no vienes, te esperan (la del dia lleva la racha; las guardadas, solo la rueda).
 *   La racha           cuenta los dias en que tiras la rueda (el dia cambia a medianoche, tu hora). Cada dia seguido suma fichas al premio: dia 2 +5,
 *                      dia 3 +10... hasta +25 el dia 6. El dia 7, la rueda de oro; al dia siguiente la semana vuelve a empezar y el numero sigue.
 *   Seguro de racha    (el paraguas del Seguro de la Aventura) un dia perdido cada 7 no rompe la racha: «Te guarde el sitio». Si faltas dos, vuelve a 1.
 *                      Nunca se pierde nada de lo ganado. La racha que el crupier ya contaba (atlasiq.dealer.v1) se hereda la primera vez.
 *   El sello           en tu carta de socio, un lacre con los dias seguidos (de oro desde la primera semana completa).
 *
 * El premio se decide (con semilla: perfil + dia de la tirada) y se cobra ANTES de girar; la rueda solo lo ensena. Sin dinero real: no se compran tiradas.
 * Estado en el perfil: P.rueda = { v, since (primer dia), used [dias de tirada ya gastados], sd (ultimo dia en que tiraste la del dia), n (racha),
 *   best, wk (semanas completas), sh (dia en que se uso el seguro), spins, last { d, w, oro } }.
 *   A.rueda.box()  la caja de la portada (va en A.club.card)        A.rueda.wire(after)  su clic, su sitio y el sello de la carta
 *   A.rueda.open(after)  abre la rueda      A.rueda.ready()  tiradas por gastar      A.rueda.streak()  la racha viva      A.rueda.state()  lo que ensena la caja
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const KEEP = 3, SH_DAYS = 7, BONUS = 5;
  const P6 = s => A.pick6(s), prof = () => A.profile.get(), save = () => A.profile.save(), $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const dayNo = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5); };   // el dia del jugador (como el escaparate)
  const I = n => `assets/icons/${n}.webp`;
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* ---------------------------------------------------------------- textos (12 idiomas, docs/glosario) */
  const T = {
    name: "La rueda del día|The daily wheel|La roue du jour|A roda do dia|Das Tagesrad|La ruota del giorno||每日转盘|오늘의 룰렛|今日のルーレット|Колесо дня|Koło dnia",
    oro: "La rueda de oro|The golden wheel|La roue d'or|A roda de ouro|Das goldene Rad|La ruota d'oro||黄金转盘|황금 룰렛|黄金のルーレット|Золотое колесо|Złote koło",
    oroT: "¡Rueda de oro!|Golden wheel!|Roue d'or !|Roda de ouro!|Goldenes Rad!|Ruota d'oro!||黄金转盘！|황금 룰렛!|黄金のルーレット！|Золотое колесо!|Złote koło!",
    free1: "1 tirada · gratis|1 spin · free|1 tour · gratuit|1 giro · grátis|1 Dreh · gratis|1 giro · gratis||1 次 · 免费|1회 · 무료|1回 · 無料|1 вращение · даром|1 obrót · gratis",
    freeN: "{n} tiradas · gratis|{n} spins · free|{n} tours · gratuits|{n} giros · grátis|{n} Drehs · gratis|{n} giri · gratis||{n} 次 · 免费|{n}회 · 무료|{n}回 · 無料|Вращений: {n} · даром|Obroty: {n} · gratis",
    week: "Semana completa|Full week|Semaine complète|Semana completa|Volle Woche|Settimana completa||整整一周|일주일 완성|1週間達成|Полная неделя|Pełny tydzień",
    kept: "Te guardé el sitio|I saved your seat|Ta place est gardée|Guardei seu lugar|Platz freigehalten|Posto tenuto||给你留了位子|자리 맡아 뒀어|席は確保済み|Место за тобой|Miejsce zajęte",
    tomorrow: "Mañana, otra|Another tomorrow|Une autre demain|Amanhã tem outra|Morgen die nächste|Domani un'altra||明天再来|내일 또 돌려요|また明日|Завтра ещё|Jutro kolejny",
    left: "Faltan {t}|{t} to go|Encore {t}|Faltam {t}|Noch {t}|Mancano {t}||还剩 {t}|{t} 남음|あと{t}|Осталось {t}|Zostało {t}",
    streak1: "Racha: 1 día|Streak: 1 day|Série : 1 jour|Sequência: 1 dia|Serie: 1 Tag|Serie: 1 giorno||连续 1 天|연속 1일|連続1日|Серия: 1 день|Seria: 1 dzień",
    streakN: "Racha: {n} días|Streak: {n} days|Série : {n} jours|Sequência: {n} dias|Serie: {n} Tage|Serie: {n} giorni||连续 {n} 天|연속 {n}일|連続{n}日|Серия: {n} дн.|Seria: {n} dni",
    start: "Empieza tu racha|Start your streak|Lance ta série|Comece sua sequência|Starte deine Serie|Inizia la serie||开始连续记录|연속 기록 시작|連続記録を始めよう|Начни серию|Zacznij serię",
    dayN: "Día {n} de racha|Streak day {n}|Jour {n} de la série|Dia {n} da sequência|Serientag {n}|Giorno {n} della serie||连续第 {n} 天|연속 {n}일째|連続{n}日目|День серии: {n}|Dzień serii: {n}",
    today: "Tu tirada de hoy|Today's spin|Ton tour du jour|Seu giro de hoje|Dein Dreh für heute|Il tuo giro di oggi||今天的转盘|오늘의 회전|今日の1回|Вращение на сегодня|Twój obrót na dziś",
    saved: "Tirada guardada|Saved spin|Tour gardé|Giro guardado|Aufgehobener Dreh|Giro conservato||保留的一次|모아 둔 회전|取っておいた1回|Сохранённое вращение|Zachowany obrót",
    spin: "Girar · gratis|Spin · free|Tourner · gratuit|Girar · grátis|Drehen · gratis|Gira · gratis||转动 · 免费|돌리기 · 무료|回す · 無料|Крутить · даром|Kręć · gratis",
    chips: "Fichas de oro|Gold chips|Jetons d'or|Fichas de ouro|Goldchips|Fiche d'oro||金筹码|골드 칩|金のチップ|Золотые фишки|Złote żetony",
    gordo: "¡El gordo!|Jackpot!|Le gros lot !|A sorte grande!|Der Jackpot!|Il jackpot!||头奖！|잭팟!|大当たり！|Джекпот!|Główna wygrana!",
    bonus: "+{b} de racha|+{b} streak bonus|+{b} de série|+{b} da sequência|+{b} Serienbonus|+{b} di serie||连续奖励 +{b}|연속 보너스 +{b}|連続ボーナス+{b}|+{b} за серию|+{b} za serię",
    expL: "Exp|XP|XP|XP|EP|PE||经验|EXP|EXP|Опыт|PD",
    expP: "+{n} exp|+{n} XP|+{n} XP|+{n} XP|+{n} EP|+{n} PE||+{n} 经验|+{n} EXP|+{n} EXP|+{n} опыта|+{n} PD",
    expD: "Se cobra al acabar tu próxima partida|Paid when your next game ends|Encaissé à la fin de ta prochaine partie|Recebe ao fim da sua próxima partida|Gibt's am Ende deiner nächsten Partie|Si incassa alla fine della prossima partita||下一局结束时到账|다음 게임이 끝나면 받아요|次のゲームの終わりに受け取れます|Начислится в конце следующей партии|Wpadnie po następnej grze",
    cupD: "En la pieza que elijas de la tienda, 3 días|On one piece of your choice in the shop, for 3 days|Sur la pièce de ton choix en boutique, 3 jours|Na peça que quiser da loja, por 3 dias|Auf ein Teil deiner Wahl im Laden, 3 Tage|Su un pezzo a scelta del negozio, per 3 giorni||商店任选一件，限 3 天|상점에서 고른 아이템 하나, 3일간|ショップの好きなアイテム1つに、3日間|На одну вещь в магазине, 3 дня|Na jeden wybrany przedmiot w sklepie, 3 dni",
    cupOn: "Cupón −50 % hasta el {d}|−50 % coupon until {d}|Bon −50 % jusqu'au {d}|Cupom −50 % até {d}|Gutschein −50 % bis {d}|Buono −50 % fino al {d}||−50% 优惠券，至 {d}|−50% 쿠폰, {d}까지|−50%クーポン、{d}まで|Купон −50 % до {d}|Kupon −50% do {d}",
    piece: "Pieza|Piece|Pièce|Peça|Teil|Pezzo||物品|아이템|アイテム|Вещь|Przedmiot",
    pieceD: "{name} · ya es tuya|{name} · it's yours|{name} · elle est à toi|{name} · agora é sua|{name} · gehört dir|{name} · ora è tuo||{name} · 归你了|{name} · 이제 네 거야|{name} · あなたのものです|{name} · теперь твоё|{name} · jest twój",
    allOwned: "Ya lo tienes todo: +{n} fichas de oro|You already own everything: +{n} gold chips|Tu as déjà tout : +{n} jetons d'or|Você já tem tudo: +{n} fichas de ouro|Du hast schon alles: +{n} Goldchips|Hai già tutto: +{n} fiche d'oro||你已全部拥有：+{n} 金筹码|이미 다 가졌어요: 골드 칩 +{n}|もう全部持っています：金のチップ+{n}|У тебя уже всё есть: +{n} золотых фишек|Masz już wszystko: +{n} złotych żetonów",
    chestL: "Cofre|Chest|Coffre|Baú|Truhe|Forziere||宝箱|금고|宝箱|Сундук|Skrzynia",
    shield: "Seguro de racha|Streak insurance|Assurance série|Seguro de sequência|Serienversicherung|Assicurazione serie||连续保险|연속 보험|連続保険|Страховка серии|Ubezpieczenie serii",
    tip: "Una tirada gratis al día; se guardan hasta 3. Cada día seguido suma fichas al premio y el día 7 sale la rueda de oro. Si faltas un día, el Seguro de racha te guarda el sitio (uno por semana).|One free spin a day; up to 3 are kept for you. Each day in a row adds chips to the prize, and on day 7 the golden wheel comes out. Miss a day and the Streak insurance saves your seat (one per week).|Un tour gratuit par jour ; jusqu'à 3 sont gardés. Chaque jour d'affilée ajoute des jetons au gain, et le 7e jour sort la roue d'or. Si tu manques un jour, l'Assurance série te garde ta place (une par semaine).|Um giro grátis por dia; até 3 ficam guardados. Cada dia seguido soma fichas ao prêmio e no 7º dia sai a roda de ouro. Se faltar um dia, o Seguro de sequência guarda seu lugar (um por semana).|Ein Gratis-Dreh pro Tag; bis zu 3 werden aufgehoben. Jeder Tag am Stück legt Goldchips auf den Gewinn, und am 7. Tag kommt das goldene Rad. Fehlst du einen Tag, hält dir die Serienversicherung den Platz frei (eine pro Woche).|Un giro gratis al giorno; se ne conservano fino a 3. Ogni giorno di fila aggiunge fiche al premio e il 7º giorno arriva la ruota d'oro. Se salti un giorno, l'Assicurazione serie ti tiene il posto (una a settimana).||每天免费转一次，最多保留 3 次。每连续一天，奖励多加筹码；第 7 天会出现黄金转盘。漏掉一天时，连续保险会帮你保住位子（每周一次）。|하루에 한 번 무료로 돌려요. 최대 3번까지 모아 둘 수 있어요. 연속으로 올 때마다 보상에 칩이 더해지고, 7일째에는 황금 룰렛이 나와요. 하루를 빠지면 연속 보험이 자리를 지켜 줘요(주 1회).|1日1回、無料で回せます。最大3回まで取っておけます。連続で来るたびに賞品にチップが加わり、7日目には黄金のルーレットが登場。1日休んでも、連続保険が席を守ります（週に1回）。|Одно бесплатное вращение в день; копится до 3. Каждый день подряд добавляет фишки к призу, а на 7-й день выходит золотое колесо. Пропустишь день — страховка серии сохранит тебе место (одна в неделю).|Jeden darmowy obrót dziennie; do 3 czeka na ciebie. Każdy kolejny dzień dokłada żetony do nagrody, a 7. dnia pojawia się złote koło. Opuścisz dzień — ubezpieczenie serii zachowa ci miejsce (jedno na tydzień).",
  };
  /* el crupier: al abrir la rueda y al ensenar el premio */
  const SAY = {
    open: ["Hoy la rueda la giro yo. Tú solo pulsa.|Today I spin the wheel. You just press.|Aujourd'hui, c'est moi qui tourne la roue. Toi, appuie.|Hoje quem gira a roda sou eu. Você só aperta.|Heute drehe ich das Rad. Du drückst nur.|Oggi la ruota la giro io. Tu premi e basta.||今天我来转。你只管按。|오늘은 내가 돌린다. 넌 누르기만 해.|今日は私が回します。あなたは押すだけ。|Сегодня колесо кручу я. Ты только нажми.|Dziś kołem kręcę ja. Ty tylko naciśnij."],
    oro: ["Siete días seguidos. Hoy, la rueda de oro.|Seven days in a row. Today, the golden wheel.|Sept jours d'affilée. Aujourd'hui, la roue d'or.|Sete dias seguidos. Hoje, a roda de ouro.|Sieben Tage am Stück. Heute: das goldene Rad.|Sette giorni di fila. Oggi, la ruota d'oro.||连续七天。今天，黄金转盘。|7일 연속이야. 오늘은 황금 룰렛.|7日連続です。今日は黄金のルーレット。|Семь дней подряд. Сегодня — золотое колесо.|Siedem dni z rzędu. Dziś złote koło."],
    kept: ["Ayer, ni rastro de ti. Te guardé el sitio, pero solo una vez por semana.|Yesterday, not a trace of you. I saved your seat, but only once a week.|Hier, personne. Je t'ai gardé ta place, mais une seule fois par semaine.|Ontem, nem sinal de você. Guardei seu lugar, mas só uma vez por semana.|Gestern keine Spur von dir. Ich hab dir den Platz freigehalten, aber nur einmal pro Woche.|Ieri, nessuna traccia di te. Ti ho tenuto il posto, ma solo una volta a settimana.||昨天你没影儿。我给你留了位子，但每周只一次。|어제는 코빼기도 안 보이더라. 자리 맡아 뒀어, 근데 일주일에 한 번뿐이야.|昨日は姿が見えませんでしたね。席は取っておきました。ただし週に1回だけです。|Вчера тебя не было. Я придержал место, но только раз в неделю.|Wczoraj ani śladu po tobie. Zająłem ci miejsce, ale tylko raz w tygodniu."],
    broken: ["Se acabó la racha. Empezamos otra, que la casa no se cansa.|The streak's over. We start another; the house never gets tired.|La série est finie. On en commence une autre, la maison ne se lasse pas.|A sequência acabou. Começamos outra, a casa não cansa.|Die Serie ist vorbei. Wir fangen eine neue an, das Haus wird nie müde.|La serie è finita. Ne iniziamo un'altra, la casa non si stanca.||连续断了。再来一轮，本店从不嫌累。|연속 기록 끝. 다시 시작하자, 하우스는 지치지 않아.|連続記録は途切れました。また始めましょう、ハウスは疲れ知らずです。|Серия закончилась. Начнём новую — заведение не устаёт.|Seria się skończyła. Zaczynamy nową, kasyno się nie męczy."],
    win: ["Para ti. Y mañana, otra.|For you. And another one tomorrow.|Pour toi. Et une autre demain.|Para você. E amanhã tem outra.|Für dich. Und morgen gibt's die nächste.|Per te. E domani un'altra.||给你的。明天再来一次。|네 거야. 내일 또 돌려.|あなたにです。また明日。|Это тебе. А завтра ещё.|Dla ciebie. A jutro kolejny.",
      "La casa regala. No te acostumbres.|The house gives. Don't get used to it.|La maison offre. Ne t'y habitue pas.|A casa dá. Não se acostume.|Das Haus schenkt. Gewöhn dich nicht dran.|La casa regala. Non abituarti.||本店请客。别习惯了。|하우스가 쏜다. 익숙해지지 마.|ハウスからの贈り物です。慣れないでくださいね。|Заведение угощает. Не привыкай.|Kasyno stawia. Nie przyzwyczajaj się."],
    gordo: ["¡El gordo! Hoy la casa pierde y yo sonrío.|Jackpot! Today the house loses and I smile.|Le gros lot ! Aujourd'hui la maison perd et je souris.|A sorte grande! Hoje a casa perde e eu sorrio.|Jackpot! Heute verliert das Haus, und ich lächle.|Il jackpot! Oggi la casa perde e io sorrido.||头奖！今天本店输了，我却在笑。|잭팟! 오늘은 하우스가 지고 나는 웃는다.|大当たり！今日はハウスの負け、でも私は笑顔です。|Джекпот! Сегодня заведение проигрывает, а я улыбаюсь.|Główna wygrana! Dziś kasyno przegrywa, a ja się uśmiecham."],
    exp: ["Experiencia. Eso no se compra en la tienda.|Experience. You can't buy that in the shop.|De l'expérience. Ça ne s'achète pas en boutique.|Experiência. Isso não se compra na loja.|Erfahrung. Die gibt's in keinem Laden.|Esperienza. Quella non si compra in negozio.||经验。这个商店里可买不到。|경험치. 그건 상점에서 못 사.|経験です。これはショップでは買えません。|Опыт. Его в магазине не купишь.|Doświadczenie. Tego nie kupisz w sklepie."],
    cup: ["Medio precio en lo que elijas. Tres días, ni uno más.|Half price on whatever you pick. Three days, not one more.|Moitié prix sur ce que tu choisis. Trois jours, pas un de plus.|Metade do preço no que escolher. Três dias, nem um a mais.|Halber Preis auf was du willst. Drei Tage, keinen mehr.|Metà prezzo su ciò che scegli. Tre giorni, non uno di più.||任选一件半价。三天，一天都不多。|고르는 거 하나 반값. 사흘, 하루도 더는 없어.|好きなものを半額で。3日間、1日も延ばしません。|Полцены на что выберешь. Три дня, ни днём больше.|Pół ceny na co wybierzesz. Trzy dni, ani dnia dłużej."],
    piece: ["Una pieza de la tienda, gratis. Póntela, que te queda bien.|A piece from the shop, free. Wear it, it suits you.|Une pièce de la boutique, gratuite. Porte-la, elle te va bien.|Uma peça da loja, de graça. Use, combina com você.|Ein Teil aus dem Laden, gratis. Zieh's an, steht dir.|Un pezzo del negozio, gratis. Mettilo, ti sta bene.||商店里的一件，免费。用上吧，挺适合你。|상점 아이템 하나, 공짜야. 써 봐, 잘 어울려.|ショップのアイテムを1つ、無料で。どうぞ、お似合いですよ。|Вещь из магазина, бесплатно. Носи, тебе идёт.|Przedmiot ze sklepu, za darmo. Noś, pasuje ci."],
    chest: ["El cofre de la casa. Esto no lo abro para cualquiera.|The house chest. I don't open this for just anyone.|Le coffre de la maison. Je ne l'ouvre pas pour n'importe qui.|O baú da casa. Não abro isso para qualquer um.|Die Truhe des Hauses. Die öffne ich nicht für jeden.|Il forziere della casa. Non lo apro per chiunque.||本店宝箱。我可不是为谁都打开的。|하우스 금고야. 아무한테나 안 열어 줘.|ハウスの宝箱です。誰にでも開けるわけではありません。|Сундук заведения. Не для каждого открываю.|Skrzynia kasyna. Nie otwieram jej dla byle kogo."],
  };

  /* ---------------------------------------------------------------- las dos ruedas: 12 cunas iguales, en el orden en que giran */
  const DIA = [{ f: 10 }, { f: 15 }, { x: 100 }, { f: 20 }, { f: 10 }, { f: 30 }, { cup: 1 }, { f: 15 }, { f: 10 }, { f: 20 }, { f: 15 }, { f: 50, g: 1 }];
  const ORO = [{ f: 60 }, { pz: 1 }, { f: 80 }, { f: 100 }, { f: 60 }, { chest: 1 }, { f: 80 }, { f: 150, g: 1 }, { f: 60 }, { pz: 1 }, { f: 80 }, { f: 100 }];
  const ALL_OWNED = 300;
  const shopIc = () => I("purse");
  function wedges(oro) {
    const L = oro ? ORO : DIA, two = oro ? ["#f2b63d", "#23252e"] : ["#f2b63d", "#1f9a58"];
    return L.map((P, i) => ({
      col: P.x || P.cup || P.pz || P.chest ? "#6b3fa6" : P.g ? (oro ? "#c9362c" : "#c98a1d") : two[i % 2],
      src: P.x ? I("u_star") : P.cup ? I("bet_offer") : P.pz ? shopIc() : P.chest ? I("chest") : P.g ? I("pz_gordo") : I("ficha_oro"),
      lab: P.x ? P6(T.expL) : P.cup ? "−50 %" : P.pz ? P6(T.piece) : P.chest ? P6(T.chestL) : "+" + P.f,
    }));
  }

  /* ---------------------------------------------------------------- el estado */
  function dealerStreak(d) {                                            // la racha que el crupier ya contaba (dias seguidos abriendo el juego)
    try {
      const D = JSON.parse(localStorage.getItem("atlasiq.dealer.v1") || "{}"), key = x => x.getFullYear() + "-" + (x.getMonth() + 1) + "-" + x.getDate();
      const now = new Date(), today = key(now), yest = key(new Date(now.getTime() - 864e5));
      if (!D.streak || (D.day !== today && D.day !== yest)) return null;
      const n = D.day === today ? D.streak - 1 : D.streak;              // hoy ya contaba como dia: la tirada de hoy lo vuelve a sumar
      return n > 0 ? { n, sd: d - 1 } : null;
    } catch (e) { return null; }
  }
  function st() {
    const P = prof(); let r = P.rueda;
    if (!r || typeof r !== "object" || r.v !== 1) {
      const d = dayNo(); r = P.rueda = { v: 1, since: d, used: [], sd: 0, n: 0, best: 0, wk: 0, sh: -99, spins: 0, last: null };
      const h = dealerStreak(d); if (h) { r.n = h.n; r.sd = h.sd; r.best = h.n; }
      save();
    }
    if (!Array.isArray(r.used)) r.used = [];
    return r;
  }
  const shieldOk = (r, d) => d - (r.sh == null ? -99 : r.sh) >= SH_DAYS;
  /* las tiradas por gastar: hoy y hasta 2 dias antes (desde el primer dia), las que no se han gastado */
  function avail(r, d) { const out = []; for (let k = d; k > d - KEEP; k--) if (k >= r.since && !r.used.includes(k)) out.push(k); return out; }
  /* que pasa con la racha si tiras hoy la del dia */
  function plan(r, d) {
    if (r.sd === d) return { n: r.n, alive: true, spun: true };
    if (r.sd === d - 1) return { n: r.n + 1, alive: true };
    if (r.sd === d - 2 && r.n > 0 && shieldOk(r, d)) return { n: r.n + 1, alive: true, kept: true };
    return { n: 1, alive: false, broken: r.n > 0 };
  }
  const dow = n => ((n - 1) % 7) + 1;                                   // el dia de la semana de la racha (1..7)
  function state() {
    const r = st(), d = dayNo(), av = avail(r, d), p = plan(r, d), todayFree = av.includes(d);
    const shown = p.spun ? r.n : p.alive ? r.n : 0;                      // la racha que se ensena: la viva (sin contar hoy si aun no has tirado)
    const done = p.spun ? dow(r.n) : p.alive ? r.n % 7 : 0, next = p.spun ? 0 : done + 1;
    return { av: av.length, todayFree, oro: todayFree && dow(p.n) === 7, kept: todayFree && !!p.kept, broken: !!p.broken && todayFree, n: shown, done, next,
      shield: shieldOk(r, d) ? 1 : 0, sello: shown >= 2 ? shown : 0, selloOro: shown >= 7, best: r.best, wk: r.wk };
  }

  /* ---------------------------------------------------------------- tirar: decidir, cobrar y luego ensenar */
  function spin() {
    const r = st(), d = dayNo(), av = avail(r, d); if (!av.length) return null;
    const day = av.includes(d) ? d : av[av.length - 1], daily = day === d;   // primero la de hoy (lleva la racha); luego, la guardada mas antigua
    let n = r.n, kept = false, broken = false, oro = false, bonus = 0;
    if (daily) {
      const p = plan(r, d); n = p.n; kept = !!p.kept; broken = !!p.broken;
      r.n = n; r.sd = d; if (kept) r.sh = d; r.best = Math.max(r.best || 0, n);
      const w7 = dow(n); oro = w7 === 7; if (oro) r.wk = (r.wk || 0) + 1;
      bonus = !oro && w7 >= 2 ? BONUS * (w7 - 1) : 0;
    }
    const L = oro ? ORO : DIA, seed = `${prof().id || "anon"}:rueda:${day}:${oro ? "o" : "d"}`, w = Math.floor(A.rng(seed)() * L.length), P = L[w];
    const info = { tone: "good", jp: 1, name: "", detail: "", say: "win" };
    const add = [];
    let chips = bonus;
    if (P.f) { chips += P.f; info.name = "+" + A.fmt(chips); add.push(P6(P.g ? T.gordo : T.chips)); if (P.g) { info.jp = 3; info.say = "gordo"; } }
    else if (P.x) { if (A.club && A.club.bonus) A.club.bonus(P.x); info.name = P6(T.expP).replace("{n}", P.x); add.push(P6(T.expD)); info.say = "exp"; }
    else if (P.cup) { if (A.escaparate && A.escaparate.giveCup) A.escaparate.giveCup(3); info.name = "−50 %"; add.push(P6(T.cupD)); info.say = "cup"; }
    else if (P.pz) {
      const k = A.escaparate && A.escaparate.freePiece ? A.escaparate.freePiece(seed) : null;
      if (k) { info.name = P6(T.piece); add.push(P6(T.pieceD).replace("{name}", A.escaparate.name(k))); info.say = "piece"; info.piece = k; }
      else { chips += ALL_OWNED; info.name = "+" + A.fmt(chips); add.push(P6(T.allOwned).replace("{n}", A.fmt(ALL_OWNED))); }
      info.jp = 3;
    }
    else if (P.chest) {
      const lv = A.club ? A.club.level() : 1, ten = Math.min(100, (Math.floor(lv / 10) + 1) * 10), v = A.club && A.club.chestOf ? A.club.chestOf(ten) : 50;
      chips += v; info.name = "+" + A.fmt(chips); add.push(P6(A.club && A.club.tx ? A.club.tx.chest : T.chestL)); info.say = "chest"; info.jp = 3;
    }
    if (bonus) add.push(P6(T.bonus).replace("{b}", bonus));
    if (chips && A.club && A.club.give) A.club.give(chips);
    info.detail = add.join(" · ");
    r.used.push(day); r.used = r.used.filter(x => x > d - 7); r.spins = (r.spins || 0) + 1; r.last = { d: day, w, oro, at: Date.now() };
    save();
    return { w, info, oro, daily, kept, broken, n, seed, day, chips };
  }

  /* ---------------------------------------------------------------- abrir la rueda */
  let busy = false;
  function open(after) {
    if (busy || !A.adv || !A.adv.wheel || (A.adv.wheelOpen && A.adv.wheelOpen())) return false;
    const R = spin(); if (!R) { if (A.sfx && A.sfx.deny) A.sfx.deny(); return false; }
    busy = true;
    if (A.ach && A.ach.emit) try { A.ach.emit("rueda"); } catch (e) { /* sin logros de la rueda */ }
    const say = (k, o) => { try { A.dealer.say(P6(pick(SAY[k])), Object.assign({ table: true, hold: 2600 }, o || {})); } catch (e) { /* sin crupier */ } };
    A.adv.wheel({
      list: wedges(R.oro), w: R.w, info: R.info, seed: R.seed, free: true, hold: 3600,
      cls: R.oro ? "rd-oro" : "rd-dia", hub: I(R.oro ? "chest" : "ficha_oro"),
      no: P6(R.daily ? T.today : T.saved), k: R.daily ? P6(T.dayN).replace("{n}", R.n) : P6(T.saved), n: P6(R.oro ? T.oro : T.name), go: P6(T.spin),
      onGo: () => {},
      onReveal: (ov, info) => { try { A.casa.premio(info.jp || 1); } catch (e) { /* sin casa */ } say(info.say || "win", { mood: info.jp === 3 ? "shock" : "sly", gesture: "r_gana_casino" }); },
    }, () => { busy = false; if (after) after(R); else refresh(); });
    setTimeout(() => say(R.oro ? "oro" : R.kept ? "kept" : R.broken ? "broken" : "open", { mood: R.oro || R.kept ? "laugh" : "sly", hold: 3200 }), 380);
    return true;
  }
  /* despues de la rueda: la portada se vuelve a pintar (la caja de fichas cuenta las nuevas) */
  function refresh() { try { const dlg = document.querySelector("#dlg.home"); if (dlg && A.core && A.core.showHub) A.core.showHub("home"); } catch (e) { /* nada */ } }

  /* ---------------------------------------------------------------- la caja de la portada y el sello de la carta */
  const hhmm = () => { const n = new Date(), m = new Date(n); m.setHours(24, 0, 0, 0); const s = Math.max(0, Math.floor((m - n) / 6e4)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
  function box() {
    const s = state(), used = !s.av;
    const title = s.oro ? P6(T.oroT) : used ? P6(T.tomorrow) : P6(T.name);
    const sub = used ? P6(T.left).replace("{t}", hhmm()) : s.kept ? P6(T.kept) : s.oro ? P6(T.week) : s.av > 1 ? P6(T.freeN).replace("{n}", s.av) : P6(T.free1);
    const rk = s.n ? P6(s.n === 1 ? T.streak1 : T.streakN).replace("{n}", s.n) : P6(T.start);
    const pips = Array.from({ length: 7 }, (_, i) => { const d = i + 1; return `<span class="rq-p${d <= s.done ? " on" : ""}${d === s.next && s.av ? " hoy" : ""}${d === 7 ? " gd" : ""}"><img src="${I(d === 7 ? "chest" : "ficha_oro")}" alt="" draggable="false"></span>`; }).join("");
    const tt = A.ttAttr ? A.ttAttr(P6(s.oro ? T.oro : T.name), P6(T.tip)) : "";
    const cup = A.escaparate && A.escaparate.cupOn && A.escaparate.cupOn();
    return `<button type="button" class="hh-rueda${used ? " used" : ""}${s.oro ? " oro" : ""}" id="ruedaBtn" ${tt} aria-label="${esc(title + " · " + sub + " · " + rk)}">${used ? "" : '<i class="rq-dot" aria-hidden="true"></i>'}
      <span class="rq-t"><img src="${I("bet_wheel")}" alt="" draggable="false"><span><b>${esc(title)}</b><i>${esc(sub)}</i></span></span>
      <span class="rq-r"><img src="${I("a_flame")}" alt="" draggable="false"><span>${esc(rk)}</span><u title="${esc(P6(T.shield))}"><img src="${I("sup_seguro")}" alt="" draggable="false">${s.shield}</u></span>
      <span class="rq-d" aria-hidden="true">${pips}</span>${cup ? `<span class="rq-cup">${esc(P6(T.cupOn).replace("{d}", cupDate()))}</span>` : ""}</button>`;
  }
  function cupDate() {
    const u = A.escaparate.cupUntil(); if (!u) return "";
    const dt = new Date(u * 864e5 + new Date().getTimezoneOffset() * 6e4 + 12 * 36e5);
    try { const L = (A.LANGS || []).find(l => l.code === A.lang); return dt.toLocaleDateString(L ? L.loc : undefined, { day: "numeric", month: "short" }); } catch (e) { return dt.getDate() + "/" + (dt.getMonth() + 1); }
  }
  /* su sitio: bajo «Siguiente: nivel…» (la columna del socio); y el sello de lacre en la esquina de la carta */
  function place() {
    const w = document.querySelector("#dlg .hh-socio-w"), b = $("ruedaBtn"); if (!w || !b) return;
    const nx = w.querySelector(".hh-socio-nx");
    if (innerWidth > 900 && nx) b.style.top = (nx.offsetTop + nx.offsetHeight + 12) + "px"; else b.style.removeProperty("top");
    const s = state(), card = w.querySelector("#socioCard");
    let sel = w.querySelector(".rq-sello");
    if (!s.sello || !card) { if (sel) sel.remove(); return; }
    if (!sel) { sel = document.createElement("i"); sel.setAttribute("aria-hidden", "true"); w.appendChild(sel); }
    sel.className = "rq-sello" + (s.selloOro ? " oro" : "");
    sel.innerHTML = `<img src="${I("a_flame")}" alt="" draggable="false"><b>${s.sello}</b>`;
    sel.style.left = (card.offsetLeft + card.offsetWidth - 38) + "px"; sel.style.top = (card.offsetTop + card.offsetHeight - 38) + "px";
  }
  let obs = null;
  function wire(after) {
    const b = $("ruedaBtn"); if (!b) return;
    b.onclick = () => { if (A.sfx && A.sfx.card) A.sfx.card(); open(after); };
    place(); requestAnimationFrame(place);
    const card = document.querySelector("#dlg .hh-socio-w #socioCard");
    if (card && window.ResizeObserver) { if (obs) obs.disconnect(); obs = new ResizeObserver(() => requestAnimationFrame(place)); obs.observe(card); }
  }

  A.rueda = { box, wire, place, open, state, cupText: () => P6(T.cupOn).replace("{d}", cupDate()), ready: () => state().av, streak: () => state().n, tx: T, DIA, ORO,
    _st: st, _reset: () => { delete prof().rueda; save(); }, _dayNo: dayNo };
})(window.AIQ);
