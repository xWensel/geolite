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
    rank: L6("Clasificación|Leaderboard|Classement|Classificação|Rangliste|Classifica||排行榜|순위|ランキング|Рейтинг|Ranking"),
    norows: L6("Aún no hay partidas. ¡Sé el primero!|No games yet. Be the first!|Pas encore de parties. Sois le premier !|Ainda sem partidas. Seja o primeiro!|Noch keine Spiele. Sei der Erste!|Nessuna partita ancora. Sii il primo!||暂无对局，来当第一个吧！|아직 기록이 없어요. 첫 번째가 되세요!|まだ記録がありません。最初の1人に！|Пока нет игр. Будь первым!|Brak gier. Bądź pierwszy!"),
    you: L6("Tú|You|Toi|Você|Du|Tu||你|나|あなた|Ты|Ty"),
    local: L6("Solo en este equipo|Only on this device|Seulement sur cet appareil|Só neste aparelho|Nur auf diesem Gerät|Solo su questo dispositivo||仅限本机|이 기기만|この端末のみ|Только на этом устройстве|Tylko na tym urządzeniu"),
    place: L6("Puesto|Rank|Rang|Posição|Platz|Posizione||排名|순위|順位|Место|Miejsce"),
    prizes: L6("Canje|Prize counter|Comptoir des prix|Balcão de prêmios|Preisschalter|Banco premi||兑奖处|경품 교환소|景品交換所|Призы|Wymiana nagród"),
    myTk: L6("Tus tickets|Your tickets|Tes tickets|Seus tickets|Deine Tickets|I tuoi ticket||你的票券|내 티켓|あなたのチケット|Твои билеты|Twoje bilety"),
    redeem: L6("Canjear|Redeem|Échanger|Trocar|Einlösen|Riscatta||兑换|교환|交換|Обменять|Wymień"),
    sure: L6("¿Seguro?|Sure?|Sûr ?|Certeza?|Sicher?|Sicuro?||确定吗？|정말요?|本当に？|Точно?|Na pewno?"),
    mine: L6("Tuyo|Yours|À toi|Seu|Deins|Tuo||已拥有|보유|所持|Твой|Twój"),
    wear: L6("Ponerlo|Wear it|Le porter|Usar|Anlegen|Indossa||使用|착용|つける|Надеть|Załóż"),
    worn: L6("Puesto|Worn|Porté|Em uso|Getragen|Indossato||使用中|착용 중|着用中|Надето|Założony"),
    short: L6("Te faltan {n}|You need {n} more|Il t'en manque {n}|Faltam {n}|Dir fehlen {n}|Te ne mancano {n}||还差 {n}|{n}개 부족해요|あと{n}枚足りない|Не хватает {n}|Brakuje {n}"),
    ttl: L6("Título para tu carta|Title for your card|Titre pour ta carte|Título para o seu cartão|Titel für deine Karte|Titolo per la tua carta||卡片称号|카드 칭호|カードの称号|Титул для карты|Tytuł na kartę"),
    unit: L6("tickets|tickets|tickets|tickets|Tickets|ticket||票券|티켓|チケット|билетов|biletów"),
    rRul: L6("Ruletas|Roulettes|Roulettes|Roletas|Roulette|Roulette||轮盘|룰렛|ルーレット|Рулетки|Ruletki"),
    rDad: L6("Dados y cubiletes|Dice and cups|Dés et gobelets|Dados e copos|Würfel und Becher|Dadi e bussolotti||骰子和骰盅|주사위와 컵|サイコロとカップ|Кости и стаканчики|Kości i kubki"),
    rRas: L6("Rascas, fichas y globos|Scratch cards, chips and balloons|Grattage, jetons et ballons|Raspadinhas, fichas e balões|Rubbellose, Chips und Ballons|Gratta e vinci, fiches e palloni||刮刮卡、筹码与气球|스크래치, 칩, 풍선|スクラッチ、チップ、気球|Скретч, фишки и шары|Zdrapki, żetony i balony"),
    hint: L6("Arrastra o usa las flechas|Drag or use the arrow keys|Fais glisser ou utilise les flèches|Arraste ou use as setas|Zieh oder nutze die Pfeile|Trascina o usa le frecce||拖动或使用方向键|드래그하거나 화살표를 쓰세요|ドラッグか矢印キーで|Тяни или жми стрелки|Przeciągnij lub użyj strzałek"),
    aria: L6("Pasillo del casino: flechas izquierda y derecha o arrastra para recorrerlo|Casino hall: left and right arrows or drag to walk it|Couloir du casino : flèches gauche et droite ou glisser pour le parcourir|Corredor do cassino: setas esquerda e direita ou arraste para percorrê-lo|Casino-Flur: Pfeile links und rechts oder ziehen, um ihn zu durchqueren|Corridoio del casinò: frecce sinistra e destra o trascina per percorrerlo||赌场走廊：左右方向键或拖动来行走|카지노 복도: 좌우 화살표나 드래그로 이동|カジノの廊下：左右の矢印かドラッグで移動|Коридор казино: стрелки влево и вправо или перетаскивание|Korytarz kasyna: strzałki lewo/prawo lub przeciąganie"),
    left: L6("Izquierda|Left|Gauche|Esquerda|Links|Sinistra||向左|왼쪽|左|Влево|W lewo"),
    right: L6("Derecha|Right|Droite|Direita|Rechts|Destra||向右|오른쪽|右|Вправо|W prawo"),
    welcome: L6("Camina por el casino y elige una mesa. 20 jugadas con 1.000 fichas.|Walk the casino and pick a table. 20 plays with 1,000 chips.|Parcours le casino et choisis une table. 20 jeux avec 1 000 jetons.|Percorra o cassino e escolha uma mesa. 20 jogadas com 1.000 fichas.|Geh durchs Casino und wähl einen Tisch. 20 Spiele mit 1.000 Chips.|Percorri il casinò e scegli un tavolo. 20 giocate con 1.000 fiches.||走过赌场，选一张桌子。20 局，1,000 筹码。|카지노를 걸으며 테이블을 고르세요. 1,000칩으로 20판.|カジノを歩いてテーブルを選ぼう。1,000チップで20プレイ。|Пройдись по казино и выбери стол. 20 ходов с 1 000 фишек.|Przejdź się po kasynie i wybierz stół. 20 gier z 1000 żetonów."),
    soon: L6("Mesas que irán llegando|Tables on the way|Des tables à venir|Mesas a caminho|Weitere Tische folgen|Altri tavoli in arrivo||更多桌子即将到来|곧 오는 테이블|近日追加のテーブル|Новые столы скоро|Kolejne stoły wkrótce"),
  };
  /* la voz del crupier: dos frases por situacion; nunca la misma dos veces seguidas */
  const V = {
    lose: [L6("Eso ha dolido.|That hurt.|Ça fait mal.|Essa doeu.|Das tat weh.|Questa ha fatto male.||这下疼了。|아프네요.|痛いね。|Больно.|Boli."), L6("La casa se lo queda.|The house keeps it.|La maison garde tout.|A casa fica com tudo.|Das Haus behält's.|Se lo tiene il banco.||庄家收下了。|하우스가 가져갑니다.|店がいただくよ。|Казино забирает.|Kasyno zabiera.")],
    win: [L6("Cobra, cobra.|Collect, collect.|Encaisse, encaisse.|Cobra, cobra.|Kassier ab.|Incassa, incassa.||收钱收钱。|받아 가세요.|受け取って。|Забирай.|Odbieraj."), L6("Eso sí.|Now we're talking.|Voilà qui est mieux.|Isso sim.|Das war gut.|Questo sì.||这才对。|바로 이거죠.|それそれ。|Вот это дело.|O to chodzi.")],
    big: [L6("¡Eso es un pellizco!|That's a nice pinch!|Quel beau pactole !|Que belo pedaço!|Das ist ein Happen!|Che bel colpo!||好大一笔！|꽤 크게 먹었네요!|これは大きい！|Вот это куш!|Ale kąsek!"), L6("La sala entera te mira.|The whole room is watching.|Toute la salle te regarde.|O salão inteiro está olhando.|Der ganze Saal schaut zu.|Tutta la sala ti guarda.||全场都在看你。|온 홀이 쳐다봅니다.|会場中が見ているよ。|Весь зал смотрит на тебя.|Cała sala patrzy.")],
    jack: [L6("¡BOTE!|JACKPOT!|JACKPOT !|JACKPOT!|JACKPOT!|JACKPOT!||大奖！|잭팟!|ジャックポット！|ДЖЕКПОТ!|JACKPOT!"), L6("¡Que alguien cierre la puerta!|Somebody lock the door!|Que quelqu'un ferme la porte !|Alguém tranque a porta!|Schließt mal jemand die Tür!|Qualcuno chiuda la porta!||快把门关上！|누가 문 좀 잠가요!|誰か扉を閉めて！|Кто-нибудь, закройте дверь!|Niech ktoś zamknie drzwi!")],
    gold: [L6("Una ficha dorada, de la casa.|A gold chip, on the house.|Un jeton doré, offert par la maison.|Uma ficha dourada, cortesia da casa.|Ein Goldchip, aufs Haus.|Una fiche dorata, offre la casa.||一枚金筹码，本店赠送。|금 칩 하나, 하우스가 쏩니다.|金のチップ、店のおごりだ。|Золотая фишка, за счёт заведения.|Złoty żeton, na koszt firmy."), L6("Esta va por la casa: ficha dorada.|This one's on the house: gold chip.|Celui-ci, c'est la maison qui l'offre : jeton doré.|Esta é por conta da casa: ficha dourada.|Der geht aufs Haus: Goldchip.|Questa la offre la casa: fiche dorata.||这枚算店里的：金筹码。|이건 서비스예요: 금 칩.|これは店から：金のチップ。|Эта за счёт заведения: золотая фишка.|Ten na koszt firmy: złoty żeton.")],
    start: [L6("Que empiece la función.|Let the show begin.|Que le spectacle commence.|Que comece o espetáculo.|Die Show beginnt.|Che lo spettacolo abbia inizio.||好戏开场。|쇼를 시작하죠.|さあ、開演だ。|Начинаем представление.|Zaczynamy przedstawienie."), L6("Veinte jugadas. Ni una más.|Twenty plays. Not one more.|Vingt jeux. Pas un de plus.|Vinte jogadas. Nenhuma a mais.|Zwanzig Spiele. Kein einziges mehr.|Venti giocate. Neanche una di più.||二十局，一局不多。|스무 판입니다. 한 판도 더는 없어요.|20プレイ。1回も多くはない。|Двадцать ходов. Ни одним больше.|Dwadzieścia gier. Ani jednej więcej.")],
  };
  let lastV = "";
  const say = kind => { const a = V[kind], k = kind + (a.length > 1 && lastV === kind + "0" ? 1 : lastV === kind + "1" ? 0 : Math.floor(Math.random() * a.length)); lastV = k; return A.tx(a[+k.slice(kind.length)]); };
  const f = (t, o) => A.tx(t).replace(/\{(\w)\}/g, (m, k) => (o && o[k] != null ? o[k] : m));
  const fmt = n => Math.round(n).toLocaleString(A.lang === "en" ? "en-US" : A.lang || "es");
  /* ---------- el modulo: activo o no ---------- */
  const KEYON = "atlasiq.barra.on";
  const isOn = () => { try { return localStorage.getItem(KEYON) !== "0"; } catch (e) { return true; } };
  const prof = () => { const P = A.profile.get(); const b = (P.barra = P.barra && typeof P.barra === "object" ? P.barra : {}); b.tickets = b.tickets | 0; b.best = b.best | 0; b.runs = b.runs | 0; b.free = b.free || ""; b.hist = Array.isArray(b.hist) ? b.hist : []; return b; };
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const spendTickets = n => { const b = prof(); n = Math.max(0, Math.round(n)); if (b.tickets < n) return false; b.tickets -= n; saveP(); return true; };
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
  const hudHtml = () => `<div class="brr-hud"><div class="brr-ttl"><b id="bH">${esc(A.tx(T.title))}</b><i>${esc(f(T.sub, { n: FEE }))}</i></div><div class="brr-mid"><div class="brr-pips">${Array.from({ length: PLAYS }, (_, i) => `<i class="${i < R.play ? "on" : i === R.play ? "now" : ""}"></i>`).join("")}</div><span class="brr-pl">${esc(f(T.play, { n: Math.min(R.play + 1, PLAYS), m: PLAYS }))}${R.streak >= 2 ? `<em class="brr-streak"> · ${esc(f(T.streak, { n: R.streak }))}</em>` : ""}</span></div><div class="brr-stk" id="brStk">${A.icon("chip_r")}<div><b>${fmt(RUN.coins)}</b><small>${esc(A.tx(T.chips))}</small></div></div></div>`;
  const tableHtml = t => `<button type="button" class="brr-tbl" data-g="${t.id}" style="left:${t.at[0]}px;top:${t.at[1]}px;--c1:${t.c[0]};--c2:${t.c[1]}"><i class="brr-felt">${A.icon(t.ico)}</i><b class="brr-plq">${esc(betName(t.id))}</b></button>`;
  /* el salon: el pasillo (js/barra-pasillo.js) se monta UNA vez; cada jugada solo refresca el marcador, la apuesta, la carta de la mesa y la frase */
  let hall = null;
  const ROOM_OF = { red: "ruletas", coin: "ruletas", wheel: "ruletas", dice: "dados", cups: "dados", plk: "rascas", globo: "rascas", rasca: "rascas" };
  const maxStake = () => Math.max(MIN, Math.floor(RUN.coins / MIN) * MIN);
  function mkX() {
    const rank = ["ruletas", "dados", "rascas"], list = tables().map(t => ({ id: t.id, n: betName(t.id), ico: t.ico, c: t.c, room: ROOM_OF[t.id], soon: false })).sort((x, y) => rank.indexOf(x.room) - rank.indexOf(y.room));
    return { size: () => ({ w: SZ.w, h: SZ.h }), list, rooms: { ruletas: A.tx(T.rRul), dados: A.tx(T.rDad), rascas: A.tx(T.rRas) }, hint: A.tx(T.hint), aria: A.tx(T.aria), left: A.tx(T.left), right: A.tx(T.right), title: A.tx(T.title).toUpperCase(),
      welcome: `<div class="soonc"><h4>${esc(A.tx(T.title))}</h4><p>${esc(A.tx(T.welcome))}</p></div>`,
      reduce: () => !!(C().S && C().S.reduce), paused: () => busy || !!document.querySelector(".rou"),
      card: g => { const t = TABLES.find(x => x.id === g.id); return `<div class="tb-sup" style="display:block">${t.core ? COREC[g.id].card() : cardOf(g.id, R.play + 1)}</div>`; },
      wire: (el, g) => { prevCoins = RUN.coins; const sup = el.querySelector(".sup.bet"); if (!sup || R.over) return; const t = TABLES.find(x => x.id === g.id), r = R.play + 1; if (t.core) COREC[g.id].wire(sup, r); else wireExt(g.id, sup, r); },
      tick: (now, api) => padTick(api) };
  }
  let padL = false, padR = false;
  function padTick(api) {                                           // mando: cruceta o palanca izquierda recorren el pasillo (el resto lo lleva js/mando.js)
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) { if (!p) continue; const l = (p.buttons[14] && p.buttons[14].pressed) || p.axes[0] < -0.6, r = (p.buttons[15] && p.buttons[15].pressed) || p.axes[0] > 0.6; if (l && !padL) api.goTo(api.stop - 1); if (r && !padR) api.goTo(api.stop + 1); padL = l; padR = r; break; }
  }
  /* el salon llena TODA la ventana: el lienzo mide (ventana / n) pixeles, con n entero (pixel nitido); la pared sube por arriba y el suelo, las mesas y los botones quedan pegados abajo.
     El tablero mide el doble (1 pixel del lienzo = 2 del tablero) y se escala n/(2*dpr): el marcador, la carta y los textos crecen con el. */
  let SZ = { w: 640, h: 360, n: 1, dpr: 1 }, hallKey = "", rzT = 0;
  function measure() {
    const st = root && root.querySelector(".barra-screen"); if (!st) return SZ;
    const dpr = window.devicePixelRatio || 1, W = Math.max(1, st.clientWidth) * dpr, H = Math.max(1, st.clientHeight) * dpr, n = Math.max(1, Math.floor(Math.min(W / 640, H / 360) + 1e-6)), w = Math.ceil(W / n);
    return { w: w + (w & 1), h: Math.max(360, Math.ceil(H / n)), n, dpr };
  }
  function fitBoard() {
    const bd = root && root.querySelector(".brr-board"); if (!bd) return;
    SZ = measure(); const st = bd.style;
    st.width = SZ.w * 2 + "px"; st.height = SZ.h * 2 + "px"; st.margin = -SZ.h + "px 0 0 " + -SZ.w + "px";
    st.setProperty("--bs", String(SZ.n / (2 * SZ.dpr))); st.setProperty("--oy", (SZ.h - 360) * 2 + "px");
    return SZ.w + "x" + SZ.h + "x" + SZ.n;
  }
  function rebuildHall() {                                           // la ventana cambio: se levanta el salon con el tamano nuevo, en la misma mesa
    rzT = 0; const el = root && root.querySelector(".brr-hall"), pas = el && el.__pasillo; if (!pas) return; if (mkX().paused()) { rzT = setTimeout(rebuildHall, 400); return; }
    const k = fitBoard(); if (k === hallKey) return; const stop = pas.stop;
    try { pas.dispose(); } catch (e) { /* ya cerrado */ } el.innerHTML = ""; hallKey = k; const x = mkX(); x.start = stop; A.barraHall(el, x);
  }
  const onResize = () => { fitBoard(); clearTimeout(rzT); rzT = setTimeout(rebuildHall, 160); };
  function build() {
    root.innerHTML = `<div class="gx-veil"></div><section class="barra-screen gx-stage gx-camp" data-nosq aria-labelledby="bH"><div class="brr-board"><div class="brr-hall"></div>
      <button type="button" class="hub-back brr-back" id="brBack">${A.icon("u_back", "sm")}${esc(A.tx(T.back))}</button><div id="brHudBox"></div>
      <div class="brr-stakes"><span>${esc(A.tx(T.bet))}</span><input id="brStk2" type="range" min="${MIN}" max="${MIN}" step="${MIN}" value="${MIN}" aria-label="${esc(A.tx(T.bet))}"><b id="brStkv">${MIN}</b><button type="button" data-q="min">${esc(A.tx(T.min))}</button><button type="button" data-q="half">50 %</button><button type="button" data-q="all">${esc(A.tx(T.all))}</button><span class="brr-note" id="brNote"></span></div>
      <div class="brr-tools"><button type="button" id="brRank">${A.icon("m_rank")}<b>${esc(A.tx(T.rank))}</b></button><button type="button" id="brPrize">${A.icon("crown")}<b>${esc(A.tx(T.prizes))}</b><i id="brTk">0</i></button></div><div class="brr-say" id="brSay"></div></div></section>`;
    wire(); dealerOff(); if (A.fitK) A.fitK(); hallKey = fitBoard(); addEventListener("resize", onResize);
    hall = A.barraHall(root.querySelector(".brr-hall"), mkX());
  }
  const setFill = r => { const mn = +r.min, mx = +r.max; r.style.setProperty("--p", mx > mn ? ((+r.value - mn) / (mx - mn)) * 100 + "%" : "100%"); };   // el relleno amarillo llega siempre hasta el selector
  function update(msg) {
    const max = maxStake(), s = $("brStk2"), v = $("brStkv"); if (!s) return; R.stake = Math.min(Math.max(MIN, R.stake), max);
    $("brHudBox").innerHTML = hudHtml(); s.max = max; s.value = R.stake; s.disabled = max <= MIN; v.textContent = fmt(R.stake); setFill(s);
    $("brNote").textContent = R.gold ? A.tx(T.gold) : BOTE.has(R.play + 1) ? A.tx(T.bote) : ""; $("brTk").textContent = fmt(prof().tickets);
    $("brSay").innerHTML = `${A.icon("dealer_mini_s")}<span>${esc(msg || A.tx(T.pick))}</span>`; dealerOff();
    if (hall) hall.refreshCard();
  }
  function paint(msg) { if (!root) return; if (!root.querySelector(".brr-board")) build(); update(msg); }
  const pill = () => { const p = root.querySelector(".brr-hall .hcard .bt-stake"); if (p) p.innerHTML = CNb() + stakeNow(); };
  function wire() {
    $("brBack").onclick = () => leave(); $("brRank").onclick = () => rankPanel(); $("brPrize").onclick = () => prizePanel();
    const s = $("brStk2"), v = $("brStkv"); s.oninput = () => { R.stake = +s.value; v.textContent = fmt(R.stake); setFill(s); pill(); A.sfx.tick && A.sfx.tick(1); };
    root.querySelectorAll(".brr-stakes [data-q]").forEach(b => (b.onclick = () => { const max = maxStake(); R.stake = b.dataset.q === "min" ? MIN : b.dataset.q === "all" ? max : Math.max(MIN, Math.round(RUN.coins / 2 / MIN) * MIN); s.value = Math.min(R.stake, max); R.stake = +s.value; v.textContent = fmt(R.stake); setFill(s); pill(); A.sfx.chip && A.sfx.chip(0.4); }));
  }
  const dealerOff = () => { try { A.dealer.casino(true); } catch (e) { /* sin crupier */ } };   // el crupier de la esquina no sale en el salon (las pantallas de casino lo vuelven a llamar al cerrarse)
  function closePop() { /* la carta ya no es una ventana: vive en el pasillo */ }
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
    const kind = !win ? "lose" : lvl >= 3 ? "jack" : lvl === 2 ? "big" : "win", amt = (win ? "+" : "−") + fmt(Math.abs(gain));
    persistRun(); paint((R.gold && !msg ? say("gold") : say(kind)) + " " + amt + (msg ? " · " + msg : "")); const e = $("brStk"); if (e) e.classList.add(win ? "up" : "down");
    if (R.over) endScreen();
  }
  function hud() { const e = $("brStk"); if (e && RUN) e.querySelector("b").textContent = fmt(RUN.coins); }
  /* ---------- paneles: clasificacion y canje ---------- */
  function panel(html, wireFn) {
    const board = root.querySelector(".brr-board"); board.querySelectorAll(".brr-panel").forEach(x => x.remove());
    const o = document.createElement("div"); o.className = "brr-over brr-panel"; o.innerHTML = `<div class="brr-tk brr-wide">${html}<button type="button" class="ghost" id="brClose">${esc(A.tx(T.close))}</button></div>`; board.appendChild(o);
    const close = () => o.remove(); $("brClose").onclick = close; o.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); close(); } }); wireFn && wireFn(o, close); const f = $("brClose"); f && f.focus({ preventScroll: true });
    return o;
  }
  function rankPanel() {
    const P = A.profile.get();
    panel(`<h4>${esc(A.tx(T.rank))}</h4><div id="brRows" class="brr-rows"><p>…</p></div><p class="brr-loc" id="brLoc"></p>`);
    (A.rank ? A.rank.top("barra-all", 10) : Promise.resolve({ rows: [], global: false })).then(t => {
      const rows = t.rows || [], me = P.id, box = document.getElementById("brRows"); if (!box) return;
      box.innerHTML = rows.length ? `<table>${rows.map((r, i) => `<tr class="${r.id && r.id === me ? "me" : ""}"><td>${i + 1}</td><td>${esc(r.name)}${r.id && r.id === me ? " · " + esc(A.tx(T.you)) : ""}</td><td>${fmt(r.score)}</td></tr>`).join("")}${t.me && t.me.rank > rows.length ? `<tr class="me"><td>${t.me.rank}</td><td>${esc(A.tx(T.you))}</td><td>${fmt(t.me.score)}</td></tr>` : ""}</table>` : `<p>${esc(A.tx(T.norows))}</p>`;
      const l = document.getElementById("brLoc"); if (l && !t.global) l.textContent = A.tx(T.local);
    });
  }
  function prizePanel(armed) {
    const list = A.socio && A.socio.tkTitles ? A.socio.tkTitles() : [], b = prof(), cur = A.socio.title();
    panel(`<h4>${esc(A.tx(T.prizes))}</h4><p>${esc(A.tx(T.myTk))}: <b>${fmt(b.tickets)}</b></p><div class="brr-prizes">${list.map(t => { const short = t.tk - b.tickets, st = t.owned ? (cur === t.id ? "worn" : "mine") : short > 0 ? "poor" : "buy";
      return `<div class="brr-pz ${t.owned ? "own" : ""}">${A.icon("crown")}<b>${esc(t.name)}</b><i>${esc(A.tx(T.ttl))}</i><span class="brr-pr">${fmt(t.tk)} ${esc(A.tx(T.unit))}</span><button type="button" data-id="${t.id}" data-st="${st}" ${st === "poor" || st === "worn" ? "disabled" : ""}>${esc(st === "worn" ? A.tx(T.worn) : st === "mine" ? A.tx(T.wear) : st === "poor" ? f(T.short, { n: fmt(short) }) : armed === t.id ? A.tx(T.sure) : A.tx(T.redeem))}</button></div>`; }).join("")}</div>`,
      o => o.querySelectorAll(".brr-pz button").forEach(btn => (btn.onclick = () => { const id = btn.dataset.id, st = btn.dataset.st;
        if (st === "mine") { A.socio.setTitle(id); A.sfx.tick && A.sfx.tick(1); return prizePanel(); }
        if (st === "buy") { if (armed !== id) return prizePanel(id); if (A.socio.redeemTitle(id)) { A.sfx.buy && A.sfx.buy(); const t = $("brPrize"); if (t) t.querySelector("i").textContent = fmt(prof().tickets); } prizePanel(); } })));
  }
  /* ---------- entrada y final ---------- */
  function entry() {
    const b = prof(), freeOk = b.free !== today(), poor = !freeOk && !(A.club && A.club.fichas() >= FEE), o = document.createElement("div"); o.className = "brr-over";
    o.innerHTML = `<div class="brr-tk"><h4>${esc(A.tx(T.title))}</h4><p>${esc(A.tx(T.intro))}</p>${b.best ? `<p class="brr-rec">${esc(A.tx(T.best))}: <b>${fmt(b.best)}</b> · ${esc(A.tx(T.myTk))}: <b>${fmt(b.tickets)}</b></p>` : ""}${freeOk ? `<button type="button" id="brFree" data-primary>${esc(A.tx(T.free))}</button>` : ""}<button type="button" id="brPay" ${freeOk ? 'class="alt"' : "data-primary"} ${poor ? "disabled" : ""}>${esc(f(T.pay, { n: FEE }))}</button>${poor ? `<p class="brr-poor">${esc(A.tx(T.poor))}</p>` : ""}<div class="brr-two"><button type="button" id="brRk2" class="ghost">${esc(A.tx(T.rank))}</button><button type="button" id="brPz2" class="ghost">${esc(A.tx(T.prizes))}</button></div><button type="button" id="brOut" class="ghost">${esc(A.tx(T.leave))}</button></div>`;
    root.querySelector(".brr-board").appendChild(o); $("brRk2").onclick = () => rankPanel(); $("brPz2").onclick = () => prizePanel();
    const go = paid => { if (paid === "fee") { if (!(A.club && A.club.spend(FEE))) return; } else b.free = today(); b.runs++; saveP(); R = newRunState(paid); RUN = mkRun(R.seed); persistRun(); o.remove(); paint(say("start")); if (A.rank && A.rank.ticket) A.rank.ticket().then(id => { if (id && R) { R.ticketId = id; persistRun(); } }).catch(() => {}); };
    if (freeOk) $("brFree").onclick = () => go("free"); $("brPay").onclick = () => go("fee"); $("brOut").onclick = () => leave(true);
  }
  /* la partida acabada va al ranking general de La Barra de la casa (barra-all, el de siempre) con su boleto; sin red se queda en la clasificacion de este equipo */
  async function submitScore(final, plays) {
    const rk = A.rank; if (!rk || !rk.submit || final <= 0) return null;
    const pf = R.ticketId ? { run: R.ticketId, x: { p: plays } } : undefined;
    try { await rk.submit("barra-all", { score: final, extra: { p: plays }, ...(pf ? { pf } : {}) }); const t = await rk.top("barra-all", 1); return t && t.me ? t.me.rank : null; } catch (e) { return null; }
  }
  function endScreen() {
    const final = Math.max(0, RUN.coins), tk = Math.floor(final / TK), b = prof(); R.tk = tk; b.tickets += tk; if (final > b.best) b.best = final; b.hist.unshift({ at: Date.now(), final, tk }); b.hist.length = Math.min(b.hist.length, 30); delete b.run; saveP();
    const bestP = R.log.reduce((m, x) => (x.net > m.net ? x : m), { net: 0, g: "" }), o = document.createElement("div"); o.className = "brr-over";
    o.innerHTML = `<div class="brr-tk"><h4>${esc(A.tx(final <= 0 ? T.broke : T.end))}</h4><div class="brr-big">${fmt(final)}</div><div class="brr-lab">${esc(A.tx(T.final))}</div><div class="brr-row"><span>${esc(A.tx(T.bigp))}</span><b>${bestP.net > 0 ? esc(betName(bestP.g)) + " +" + fmt(bestP.net) : "—"}</b></div><div class="brr-row"><span>${esc(A.tx(T.tickets))}</span><b>${fmt(tk)}</b></div><div class="brr-row"><span>${esc(A.tx(T.best))}</span><b>${fmt(b.best)}</b></div><div class="brr-row"><span>${esc(A.tx(T.place))}</span><b id="brRk">…</b></div><button type="button" id="brAgain" data-primary>${esc(A.tx(T.again))}</button><button type="button" id="brOut2" class="ghost">${esc(A.tx(T.leave))}</button></div>`;
    const shown = rk => { const e = document.getElementById("brRk"); if (e) e.textContent = rk ? "#" + rk : "—"; }; let got; submitScore(final, R.play).then(rank => { got = rank || 0; shown(got); });
    setTimeout(() => { if (!root) return; closePop(); root.querySelector(".brr-board").appendChild(o); if (got != null) shown(got); $("brAgain").onclick = () => { o.remove(); entry(); }; $("brOut2").onclick = () => leave(true); }, 700);
  }
  function leave(done) { removeEventListener("resize", onResize); clearTimeout(rzT); if (hall) { try { hall.dispose ? hall.dispose() : root.querySelector(".brr-hall").__pasillo.dispose(); } catch (e) { /* ya cerrado */ } hall = null; } closePop(); if (RUN && R && !R.over) persistRun(); if (restoreRun) { restoreRun(); restoreRun = null; } A.adv._barra = false; try { A.dealer.casino(false); } catch (e) { /* sin crupier */ } root = null; R = null; RUN = null; A.hub.screen("home"); }
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
  A.barra = { open: open_, button, wireButton, on: isOn, setOn: v => { try { localStorage.setItem(KEYON, v ? "1" : "0"); } catch (e) { /* sin almacenamiento */ } }, spendTickets, tickets: () => prof().tickets, tx: T, FEE, START, PLAYS, MIN, state: () => ({ R, RUN }), _leave: leave };
})(window.AIQ);
