/*
 * Geolite - EL CLUB DE LA CASA (entrega 1): experiencia, nivel de socio y fichas de oro.
 *
 * La experiencia sale de saber: cada pregunta da hasta 10 puntos segun tu precision (la misma que puntua: 1 = clavada, 0 = muy lejos o sin
 * respuesta), en la Aventura, el Clasico y el Duelo. Terminar suma un poco: ronda o nivel superado +5, partida ganada +15, duelo ganado +10.
 * Lo ganado se guarda al momento (P.club.pend) y se cobra en el ticket del veredicto: alli la barra se llena, se cruzan niveles y la casa paga.
 * v2 (El camino del socio): nivel L -> L+1 cuesta 50 + 20 (L-1) de experiencia y el 100 es el tope. Cada nivel trae su carta (js/socio.js), fichas
 * de oro (15 a 60), un titulo cada 10 (5, 15, 25…), un cofre cada 10 y el material de una serie nueva (11, 21…); pasado el 100, el cofre de la Leyenda.
 * La primera partida de cada dia cobra el doble. El camino de los 100 niveles y la carta que sale del mazo al subir: js/camino.js.
 * Las categorias del crupier (js/dealer.js) salen del nivel: una escala social de 15 (RANKS), «de la puerta al despacho», de Miron a Leyenda de la
 * casa, cada una con su sitio, su trato y su frase de ascenso (RANKX). Nadie baja: el crupier conserva la que ya te habia dado.
 * Al estrenarse en un perfil con historia, la casa le reconoce lo jugado (experiencia por sus preguntas acertadas) y le paga sus niveles.
 *
 * Estado en el perfil: P.club = { v: 2, xp, f (fichas de oro), pend, pq, fSeen (fichas que ya viste contar en la tarjeta), lc (cofres de la
 *   Leyenda cobrados), day (dia de la ultima partida doble), carta / fondo / mat / ic / tt / mc (lo que viste tu carta: js/socio.js) }.
 *   A.club.q(ratio)         una pregunta respondida (0-1)        A.club.bonus(n)       experiencia por terminar
 *   A.club.cash()           cobra lo pendiente -> { gain, from, to, fichas, ups } o null
 *   A.club.strip(res)       el bloque del ticket (HTML)          A.club.play(res, el)  su animacion: barra, sello de nivel, premio y fichas
 *   A.club.card()           el sitio de la carta del socio (js/socio.js)   A.club.wire()   la pinta, su cuenta de fichas y su clic
 *   A.club.level()  A.club.fichas()  A.club.tierOf(nivel)  A.club.need(nivel)  A.club.give(n) (lo que pagan los retos, js/club-retos.js)
 */
window.AIQ = window.AIQ || {};
(function (A) {
  /* v2 (maqueta «El camino del socio», 23-oct-2026): nivel L -> L+1 cuesta 50 + 20 (L-1); tope en el 100. Cada nivel paga 15 fichas (y 5 mas por cada
     decena: 60 en la ultima), cada 10 un cofre (50 x decena; 1.000 al llegar al 100) y, pasado el 100, el cofre de la Leyenda: 100 fichas cada 2.000.
     La primera partida de cada dia cobra el doble de experiencia */
  const CFG = { xpQ: 10, bonus: { ok: 5, win: 15, duel: 10 }, max: 100, ley: 2000, leyPay: 100 };
  /* la escalera de categorias, «De la puerta al despacho»: [nombre en 12 idiomas, nivel minimo, tramo (0 papel, 1 plata, 2 oro, 3 negra, 4 leyenda:
     el tono del crupier)]. Su sitio en la casa, su trato y su etiqueta, en RANKX */
  const RANKS = [
    ["Mirón|Railbird|Badaud|Curioso|Kiebitz|Curioso||看客|구경꾼|見物人|Зевака|Gap", 1, 0],
    ["Turista|Tourist|Touriste|Turista|Tourist|Turista||游客|관광객|観光客|Турист|Turysta", 3, 0],
    ["Invitado|Guest|Invité|Convidado|Gast|Ospite||宾客|초대 손님|招待客|Гость|Gość", 5, 1],
    ["Cliente|Patron|Client|Cliente|Stammkunde|Cliente||熟客|단골손님|お得意さま|Клиент|Klient", 8, 1],
    ["Habitual|Regular|Habitué|Frequentador|Stammgast|Habitué||常客|단골|常連|Завсегдатай|Bywalec", 12, 1],
    ["Trotamundos|Globetrotter|Globe-trotter|Andarilho|Weltenbummler|Giramondo||环球旅人|세계 여행자|旅人|Путешественник|Obieżyświat", 16, 1],
    ["Apostador|Punter|Parieur|Apostador|Zocker|Scommettitore||赌客|도박사|勝負師|Игрок|Gracz", 20, 2],
    ["Contador de cartas|Card counter|Compteur de cartes|Contador de cartas|Kartenzähler|Contatore di carte||算牌高手|카드 카운터|カードカウンター|Счётчик карт|Liczący karty", 25, 2],
    ["Gran apostador|High roller|Flambeur|Grande apostador|High Roller|Giocatore d'alto bordo||豪赌客|하이 롤러|ハイローラー|Хайроллер|Gruba ryba", 30, 2],
    ["Del reservado|VIP|Habitué du salon privé|Do reservado|VIP-Gast|Ospite del privé||贵宾|VIP|VIPルームの客|VIP-гость|Gość VIP", 36, 2],
    ["Socio|Member|Membre|Sócio|Mitglied|Socio||会员|회원|会員|Член клуба|Wspólnik", 43, 2],
    ["Socio de honor|Honorary member|Membre d'honneur|Sócio honorário|Ehrenmitglied|Socio onorario||荣誉会员|명예 회원|名誉会員|Почётный член клуба|Członek honorowy", 50, 3],
    ["Accionista|Shareholder|Actionnaire|Acionista|Teilhaber|Azionista||股东|주주|株主|Совладелец|Udziałowiec", 60, 3],
    ["Crupier honorario|Honorary dealer|Croupier d'honneur|Crupiê honorário|Ehrencroupier|Croupier onorario||荣誉荷官|명예 딜러|名誉ディーラー|Почётный крупье|Honorowy krupier", 75, 3],
    ["Leyenda de la casa|House legend|Légende de la maison|Lenda da casa|Legende des Hauses|Leggenda della casa||赌场传奇|하우스의 전설|ハウスの伝説|Легенда заведения|Legenda kasyna", 100, 4],
  ];
  /* la identidad de cada categoria: [quien eres, tu sitio en la casa, como te trata el crupier] (en el camino y en el Perfil) */
  const RANKX = [
    ["Miras desde la puerta, sin atreverte a entrar.|You watch from the door, not daring to come in.|Tu regardes depuis la porte, sans oser entrer.|Você olha da porta, sem coragem de entrar.|Du schaust von der Tür aus und traust dich nicht rein.|Guardi dalla porta, senza il coraggio di entrare.||你站在门口张望，不敢进来。|문가에서 구경만 하고, 들어올 엄두는 못 내.|入口から眺めるだけで、入る勇気はまだない。|Смотришь от двери и не решаешься войти.|Patrzysz od drzwi i nie odważysz się wejść.",
      "La puerta giratoria|The revolving door|La porte tambour|A porta giratória|Die Drehtür|La porta girevole||旋转门|회전문|回転ドア|Вращающаяся дверь|Drzwi obrotowe",
      "Oye, tú|Hey, you|Hé, toi|Ei, você|He, du|Ehi, tu||喂，你|어이, 너|おい、そこの|Эй, ты|Hej, ty"],
    ["Primera vez dentro, con el mapa en la mano.|First time inside, map in hand.|Première fois à l'intérieur, la carte à la main.|Primeira vez lá dentro, de mapa na mão.|Zum ersten Mal drinnen, die Karte in der Hand.|Prima volta dentro, con la mappa in mano.||第一次进门，手里攥着地图。|처음 들어와서, 손에 지도를 들고 있어.|初めての中、地図を片手に。|Впервые внутри, с картой в руке.|Pierwszy raz w środku, z mapą w ręku.",
      "El vestíbulo|The lobby|Le hall|O saguão|Die Eingangshalle|L'atrio||大堂|로비|ロビー|Вестибюль|Hol",
      "Turista|Tourist|Touriste|Turista|Tourist|Turista||游客|관광객|観光客さん|Турист|Turysto"],
    ["Alguien te ha puesto en la lista.|Someone put you on the list.|Quelqu'un t'a mis sur la liste.|Alguém botou você na lista.|Jemand hat dich auf die Liste gesetzt.|Qualcuno ti ha messo in lista.||有人把你写进了名单。|누군가 너를 명단에 올려 줬어.|誰かがきみを名簿に載せた。|Кто-то внёс тебя в список.|Ktoś wpisał cię na listę.",
      "La barra|The bar|Le bar|O balcão|Die Bar|Il bancone||吧台|바|バーカウンター|Барная стойка|Bar",
      "Invitado|Guest|L'invité|Convidado|Mein Gast|Ospite||客人|손님|お客人|Гость|Gościu"],
    ["Ya pagas tus copas y tus fichas.|You pay for your own drinks and chips now.|Tu paies tes verres et tes jetons.|Você já paga suas bebidas e suas fichas.|Du zahlst deine Drinks und Chips selbst.|Ormai paghi da bere e le fiche.||酒水和筹码都自己掏钱了。|이제 술값도 칩값도 네가 내.|酒代もチップ代も自分で払うようになった。|Ты уже сам платишь за выпивку и фишки.|Sam płacisz już za drinki i żetony.",
      "La mesa de mínimos|The low-stakes table|La table des petites mises|A mesa de apostas mínimas|Der Tisch mit Mindesteinsatz|Il tavolo delle puntate minime||低注桌|최소 베팅 테이블|最低賭け金のテーブル|Стол с минимальными ставками|Stół z minimalnymi stawkami",
      "Por tu nombre, a veces|By your name, sometimes|Par ton prénom, parfois|Pelo nome, às vezes|Mal beim Namen|Per nome, ogni tanto||偶尔叫你名字|가끔 이름으로|ときどき名前で|Иногда по имени|Czasem po imieniu"],
    ["El portero te saluda por tu nombre.|The doorman greets you by name.|Le portier te salue par ton nom.|O porteiro te cumprimenta pelo nome.|Der Türsteher grüßt dich mit Namen.|Il portiere ti saluta per nome.||门卫叫得出你的名字。|문지기가 이름을 불러 인사해.|ドアマンが名前で挨拶してくれる。|Швейцар здоровается с тобой по имени.|Portier wita cię po imieniu.",
      "Tu taburete de siempre|Your usual stool|Ton tabouret habituel|Seu banco de sempre|Dein Stammhocker|Il tuo solito sgabello||你的老位子|늘 앉던 의자|いつものスツール|Твой привычный табурет|Twój stały stołek",
      "Por tu nombre|By your name|Par ton prénom|Pelo nome|Beim Namen|Per nome||叫你名字|이름으로|名前で|По имени|Po imieniu"],
    ["Juegas en salas de medio mundo.|You play in rooms all over the world.|Tu joues dans des salles du monde entier.|Você joga em salões do mundo todo.|Du spielst in Sälen auf der halben Welt.|Giochi in sale di mezzo mondo.||你在半个世界的赌场里玩过。|세계 곳곳의 홀에서 놀아.|世界中のサロンで遊んでいる。|Ты играешь в залах по всему миру.|Grasz w salach na całym świecie.",
      "La mesa de los viajeros|The travellers' table|La table des voyageurs|A mesa dos viajantes|Der Tisch der Reisenden|Il tavolo dei viaggiatori||旅人之桌|여행자의 테이블|旅人のテーブル|Стол путешественников|Stół podróżników",
      "Viajero|Traveler|Voyageur|Viajante|Reisender|Viaggiatore||旅行家|여행자|旅のお方|Путник|Podróżniku"],
    ["Se te nota el pulso firme.|Your steady hand shows.|On voit que tu as la main sûre.|Dá pra ver que sua mão é firme.|Man sieht dir die ruhige Hand an.|Si vede che hai la mano ferma.||一看就知道你手稳。|손이 흔들림 없는 게 보여.|手元がぶれないのがわかる。|Видно, что рука у тебя твёрдая.|Widać, że masz pewną rękę.",
      "La ruleta grande|The big roulette|La grande roulette|A roleta grande|Das große Roulette|La roulette grande||大轮盘|큰 룰렛|大ルーレット|Большая рулетка|Duża ruletka",
      "Apostador|Punter|Parieur|Apostador|Zocker|Scommettitore||赌客|도박사|勝負師|Игрок|Graczu"],
    ["El jefe de sala ya te vigila.|The floor manager is watching you now.|Le chef de salle te surveille déjà.|O gerente do salão já está de olho em você.|Der Saalchef behält dich schon im Auge.|Il capo sala ti tiene già d'occhio.||大堂经理已经盯上你了。|플로어 매니저가 벌써 너를 지켜봐.|フロアマネージャーがもう目をつけている。|Распорядитель зала уже следит за тобой.|Kierownik sali już cię obserwuje.",
      "El blackjack|The blackjack table|La table de blackjack|A mesa de blackjack|Der Blackjack-Tisch|Il tavolo del blackjack||二十一点桌|블랙잭 테이블|ブラックジャックのテーブル|Стол для блэкджека|Stół do blackjacka",
      "Listillo (con cariño)|Smart-aleck (fondly)|Petit malin (avec tendresse)|Espertinho (com carinho)|Schlaumeier (liebevoll)|Furbetto (con affetto)||小机灵鬼（亲昵地）|똑똑이(애정 담아)|切れ者さん（親しみをこめて）|Хитрец (ласково)|Spryciarzu (czule)"],
    ["Te sientas donde se juega fuerte.|You sit where the stakes are high.|Tu t'assois là où ça mise gros.|Você senta onde se joga alto.|Du sitzt da, wo hoch gespielt wird.|Siedi dove si gioca forte.||你坐在下大注的地方。|큰판이 벌어지는 자리에 앉아.|大勝負の席に座っている。|Ты сидишь там, где ставки высоки.|Siedzisz tam, gdzie gra się o duże stawki.",
      "La sala de altas apuestas|The high-stakes room|La salle des grosses mises|O salão de apostas altas|Der Saal für hohe Einsätze|La sala delle puntate alte||高注厅|하이 롤러 룸|高額ルーム|Зал высоких ставок|Sala wysokich stawek",
      "Usted|Sir or madam|Vous|O senhor, a senhora|Sie|Lei||您|손님께서|あなた様|Вы|Pan, pani"],
    ["Te abren el reservado sin preguntar.|They open the private room without asking.|On t'ouvre le salon privé sans poser de questions.|Abrem o reservado sem perguntar.|Man öffnet dir das Séparée ohne Fragen.|Ti aprono il privé senza chiedere.||贵宾室直接为你开门。|묻지도 않고 VIP 룸을 열어 줘.|何も聞かずにVIPルームを開けてくれる。|Тебе без вопросов открывают VIP-зал.|Otwierają ci salon VIP bez pytania.",
      "El reservado|The private room|Le salon privé|O reservado|Das Séparée|Il privé||贵宾室|VIP 룸|VIPルーム|VIP-зал|Salon VIP",
      "Usted, por aquí otra vez|You, here again|Vous, de retour|O senhor de novo por aqui|Sie schon wieder|Lei, di nuovo qui||您又来了|또 오셨군요|またお越しで|Вы снова здесь|Pan, pani znowu tutaj"],
    ["Tienes llave del club.|You have a key to the club.|Tu as la clé du club.|Você tem a chave do clube.|Du hast einen Schlüssel zum Club.|Hai la chiave del club.||你有俱乐部的钥匙。|클럽 열쇠를 가졌어.|クラブの鍵を持っている。|У тебя есть ключ от клуба.|Masz klucz do klubu.",
      "El salón de socios|The members' lounge|Le salon des membres|O salão dos sócios|Die Mitgliederlounge|Il salotto dei soci||会员厅|회원 라운지|会員ラウンジ|Салон для членов клуба|Salon członków",
      "Socio|Member|Cher membre|Sócio|Mitglied|Socio||会员|회원님|会員さん|Член клуба|Wspólniku"],
    ["Tu nombre está en la placa de la entrada.|Your name is on the plaque at the entrance.|Ton nom est sur la plaque de l'entrée.|Seu nome está na placa da entrada.|Dein Name steht auf der Tafel am Eingang.|Il tuo nome è sulla targa all'ingresso.||你的名字刻在了门口的铭牌上。|입구 명판에 네 이름이 있어.|入口のプレートにきみの名前がある。|Твоё имя на табличке у входа.|Twoje nazwisko jest na tablicy przy wejściu.",
      "El palco|The box|La loge|O camarote|Die Loge|Il palco||包厢|특별석|ボックス席|Ложа|Loża",
      "Distinguido socio|Distinguished member|Cher membre d'honneur|Distinto sócio|Verehrtes Mitglied|Illustre socio||尊贵的会员|귀하신 회원님|名誉会員どの|Почтенный член клуба|Szanowny członku"],
    ["Tienes un trozo de la casa.|You own a piece of the house.|Tu possèdes un bout de la maison.|Você tem um pedaço da casa.|Dir gehört ein Stück vom Haus.|Possiedi un pezzo della casa.||赌场有你的一份。|하우스의 지분을 가졌어.|ハウスの一部はきみのものだ。|Тебе принадлежит кусок заведения.|Masz kawałek kasyna.",
      "La mesa de la junta|The boardroom table|La table du conseil|A mesa da diretoria|Der Tisch der Teilhaber|Il tavolo del consiglio||董事会桌|이사회 테이블|役員会のテーブル|Стол совета|Stół zarządu",
      "Jefe|Boss|Patron|Chefe|Chef|Capo||老板|사장님|ボス|Шеф|Szefie"],
    ["El crupier te deja barajar a ti.|The dealer lets you shuffle.|Le croupier te laisse battre les cartes.|O crupiê deixa você embaralhar.|Der Croupier lässt dich mischen.|Il croupier ti lascia mescolare.||荷官让你来洗牌。|딜러가 너한테 카드를 섞게 해.|ディーラーがきみにシャッフルを任せる。|Крупье даёт тебе тасовать колоду.|Krupier pozwala ci tasować.",
      "Detrás de la mesa, a su lado|Behind the table, next to the dealer|Derrière la table, à ses côtés|Atrás da mesa, ao lado dele|Hinter dem Tisch, an seiner Seite|Dietro il tavolo, al suo fianco||桌子后面，荷官身边|테이블 뒤, 딜러 옆|テーブルの内側、ディーラーの隣|За столом, рядом с крупье|Za stołem, obok krupiera",
      "Colega|Colleague|Collègue|Colega|Kollege|Collega||同行|동료|同業者|Коллега|Kolego"],
    ["Tu retrato cuelga en la entrada.|Your portrait hangs at the entrance.|Ton portrait est accroché à l'entrée.|Seu retrato está pendurado na entrada.|Dein Porträt hängt am Eingang.|Il tuo ritratto è appeso all'ingresso.||你的肖像挂在入口。|입구에 네 초상화가 걸려 있어.|入口にきみの肖像画が飾られている。|Твой портрет висит у входа.|Twój portret wisi przy wejściu.",
      "El despacho del dueño|The owner's office|Le bureau du patron|O escritório do dono|Das Büro des Besitzers|L'ufficio del padrone||老板办公室|주인의 집무실|オーナーの書斎|Кабинет владельца|Gabinet właściciela",
      "Maestro|Maestro|Maître|Mestre|Meister|Maestro||大师|마에스트로|マエストロ|Маэстро|Mistrzu"],
  ];
  const need = L => 50 + 20 * (L - 1);
  const need1 = L => Math.min(400 + 20 * (L - 1), 1200);                  // la curva de antes (v1): solo para pasar los perfiles viejos
  const TOT = (() => { let s = 0; for (let L = 1; L < CFG.max; L++) s += need(L); return s; })();   // experiencia para el nivel 100
  const payOf = L => (L < 2 ? 0 : 15 + 5 * Math.floor((L - 1) / 10));
  const chestOf = L => (L % 10 ? 0 : L === CFG.max ? 1000 : 50 * (L / 10));
  const prof = () => A.profile.get();
  const save = () => A.profile.save();
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const P6 = s => A.pick6(s);

  const TX = {
    shop: "La tienda|The boutique|La boutique|A boutique|Die Boutique|La boutique||精品店|부티크|ブティック|Бутик|Butik",
    club: "Club de la casa|The House Club|Le Club de la maison|Clube da casa|Club des Hauses|Club della casa||赌场俱乐部|하우스 클럽|ハウスクラブ|Клуб заведения|Klub kasyna",
    card: "Tarjeta de socio|Member card|Carte de membre|Cartão de sócio|Mitgliedskarte|Tessera socio||会员卡|회원 카드|会員カード|Клубная карта|Karta członkowska",
    no: "N.º|No.|N°|Nº|Nr.|N.||No.|No.|No.|№|Nr",
    anon: "Anónimo|Anonymous|Anonyme|Anônimo|Anonym|Anonimo||匿名|익명|匿名|Аноним|Anonim",
    lv: "Nivel {n}|Level {n}|Niveau {n}|Nível {n}|Stufe {n}|Livello {n}||等级 {n}|레벨 {n}|レベル{n}|Уровень {n}|Poziom {n}",
    lvS: "Nv {n}|Lv {n}|Niv. {n}|Nv {n}|St. {n}|Liv. {n}||{n} 级|Lv {n}|Lv {n}|Ур. {n}|Poz. {n}",
    up: "¡Nivel {n}!|Level {n}!|Niveau {n} !|Nível {n}!|Stufe {n}!|Livello {n}!||等级 {n}！|레벨 {n}!|レベル{n}！|Уровень {n}!|Poziom {n}!",
    xp: "exp|XP|XP|XP|EP|PE||经验|EXP|EXP|опыт|PD",
    daily: "×2 hoy|×2 today|×2 aujourd'hui|×2 hoje|×2 heute|×2 oggi||今日×2|오늘 ×2|今日は×2|×2 сегодня|×2 dziś",
    dailyT: "La primera partida de cada día cobra el doble de experiencia.|Your first game each day earns double experience.|Ta première partie de chaque jour rapporte le double d'expérience.|A primeira partida de cada dia rende o dobro de experiência.|Dein erstes Spiel am Tag bringt doppelte Erfahrung.|La prima partita di ogni giorno vale il doppio di esperienza.||每天第一局获得双倍经验。|매일 첫 판은 경험치가 두 배예요.|毎日最初の1回は経験値が2倍。|Первая игра каждого дня даёт вдвое больше опыта.|Pierwsza gra każdego dnia daje podwójne doświadczenie.",
    leyS: "Cofre|Chest|Coffre|Baú|Truhe|Forziere||宝箱|금고|宝箱|Сундук|Skrzynia",
    ley: "Cofre de la Leyenda|Legend's chest|Coffre de la Légende|Baú da Lenda|Truhe der Legende|Forziere della Leggenda||传奇宝箱|전설의 금고|伝説の宝箱|Сундук Легенды|Skrzynia Legendy",
    nextLey: "Siguiente: cofre de la Leyenda · +{n}|Next: Legend's chest · +{n}|Suivant : coffre de la Légende · +{n}|Próximo: baú da Lenda · +{n}|Als Nächstes: Truhe der Legende · +{n}|Prossimo: forziere della Leggenda · +{n}||下一个：传奇宝箱 · +{n}|다음: 전설의 금고 · +{n}|次：伝説の宝箱 · +{n}|Далее: сундук Легенды · +{n}|Dalej: skrzynia Legendy · +{n}",
    next: "Siguiente: nivel {n}|Next: level {n}|Suivant : niveau {n}|Próximo: nível {n}|Als Nächstes: Stufe {n}|Prossimo: livello {n}||下一级：{n} 级|다음: 레벨 {n}|次：レベル{n}|Далее: уровень {n}|Dalej: poziom {n}",
    newCard: "carta nueva|new card|nouvelle carte|carta nova|neue Karte|carta nuova||新卡牌|새 카드|新しいカード|новая карта|nowa karta",
    max: "Nivel máximo|Max level|Niveau max|Nível máximo|Höchststufe|Livello massimo||最高等级|최고 레벨|最高レベル|Максимальный уровень|Maksymalny poziom",
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
  /* el nivel de una experiencia. En el 100 la barra pasa a ser la del cofre de la Leyenda (2.000) y ley = cofres de la Leyenda que lleva */
  function levelOf(xp) {
    let L = 1, left = Math.max(0, xp | 0);
    while (L < CFG.max && left >= need(L)) { left -= need(L); L++; }
    if (L >= CFG.max) return { lvl: CFG.max, into: left % CFG.ley, need: CFG.ley, max: true, ley: Math.floor(left / CFG.ley) };
    return { lvl: L, into: left, need: need(L) };
  }
  function level1(xp) { let L = 1, left = Math.max(0, xp | 0); while (left >= need1(L)) { left -= need1(L); L++; } return L; }
  function fichasFor(a, b) { let f = 0; for (let L = a + 1; L <= b; L++) f += payOf(L) + chestOf(L); return f; }
  /* lo que da un nivel (el camino, el recibo y la portada): su carta, sus fichas, el cofre (cada 10), un titulo (5, 15, 25…) y el material de una serie nueva (11, 21…) */
  const TITLE_AT = { 5: "billete", 15: "tapete", 25: "rojo", 35: "latitud", 45: "lobo", 55: "ley", 65: "midas", 75: "etiqueta", 85: "neon", 95: "casi" };
  const rewardOf = L => ({ L, f: payOf(L), chest: chestOf(L), tit: TITLE_AT[L] || "", mat: L > 1 && L % 10 === 1 ? (L - 1) / 10 : -1, viva: L % 10 === 0, rank: RANKS.findIndex(r => r[1] === L) });
  const dayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  /* lo jugado antes del Club: experiencia por las preguntas del perfil (los aciertos pesan mas) y por las Aventuras ganadas */
  function retro(P) {
    const s = P.stats || {}, q = s.questions || 0; if (!q) return 0;
    const hit = Math.min(1, (s.hits || 0) / q);
    return Math.round(q * (0.15 + 0.65 * hit) * CFG.xpQ) + CFG.bonus.win * ((P.adv && P.adv.wins) || 0);
  }
  function st() {
    const P = prof();
    if (!P.club || typeof P.club !== "object" || typeof P.club.xp !== "number") {
      const xp = retro(P), lv = levelOf(xp), f = fichasFor(1, lv.lvl);
      P.club = { v: 2, xp, f, pend: 0, pq: 0, fSeen: f, lvSeen: lv.lvl, lc: lv.ley || 0 };
      save();
    } else if (P.club.v !== 2) {
      /* v2: la curva nueva es mas barata en todos los niveles, asi que nadie baja. Los niveles que ganas al pasar se pagan con la tabla nueva (las
         fichas de los de antes ya las cobraste) y, si pasas del 100, sus cofres de la Leyenda. La tarjeta lo cuenta al volver a la portada */
      const c = P.club, was = level1(c.xp), lv = levelOf(c.xp), now = lv.lvl;
      c.f = (c.f || 0) + (now > was ? fichasFor(Math.min(was, now), now) : 0) + (lv.ley || 0) * CFG.leyPay;
      c.lc = lv.ley || 0; c.v = 2; save();
    }
    return P.club;
  }
  const tierOf = L => { let i = 0; RANKS.forEach((r, k) => { if (L >= r[1]) i = k; }); return i; };     // la categoria de un nivel
  const groupOf = i => RANKS[Math.max(0, Math.min(RANKS.length - 1, i | 0))][2];                           // su tarjeta

  /* ------------------------------------------------------------------ ganar */
  function q(ratio) { const c = st(); const r = Math.max(0, Math.min(1, +ratio || 0)); c.pend += r * CFG.xpQ; c.pq++; }
  function bonus(n) { const c = st(); c.pend += Math.max(0, +n || 0); }
  function cash() {
    const c = st(), retos = A.clubRetos ? A.clubRetos.take() : [];   // entrega 3: los retos cumplidos se tachan en el mismo recibo
    let gain = Math.max(0, Math.round(c.pend || 0));
    if (gain <= 0 && !retos.length) { c.pend = 0; c.pq = 0; return null; }
    const today = dayKey(), daily = gain > 0 && c.day !== today;            // la primera partida del dia: el doble
    if (daily) { gain *= 2; c.day = today; }
    const from = levelOf(c.xp); c.xp += gain; c.pend = 0; const pq = c.pq; c.pq = 0;
    const to = levelOf(c.xp), fichas = fichasFor(from.lvl, to.lvl), ley = Math.max(0, (to.ley || 0) - (c.lc || 0)), leyF = ley * CFG.leyPay;
    c.lc = Math.max(c.lc || 0, to.ley || 0); c.f += fichas + leyF; save();
    if (A.ach && A.ach.emit) A.ach.emit("club");                            // v2: los logros del nivel 10 y del 100 (js/profile.js)
    return { gain, pq, from, to, fichas, ley, leyF, daily, ups: to.lvl - from.lvl, retos };
  }

  /* ------------------------------------------------------------------ el ticket: Club de la casa, +exp, la barra y lo que paga */
  const pct = (into, n) => Math.max(0, Math.min(100, (100 * into) / Math.max(1, n)));
  const fi = cls => `<img class="ck-fi${cls ? " " + cls : ""}" src="assets/icons/ficha_oro.webp" alt="" draggable="false">`;
  function strip(res) {
    if (!res) return "";
    const f0 = pct(res.from.into, res.from.need);
    return `<div class="club-tk" data-ck>
      <div class="ck-h"><span class="ck-t">${fi()}${esc(P6(TX.club))}</span>${res.daily ? `<em class="ck-x2" title="${esc(P6(TX.dailyT))}">${esc(P6(TX.daily))}</em>` : ""}<b class="ck-g">+<span class="ck-gn">0</span> ${esc(P6(TX.xp))}</b></div>
      <div class="ck-row"><span class="ck-lv" data-lv>${esc(lvLab(res.from.lvl))}</span><span class="ck-bar"><i style="width:${f0}%"></i></span><span class="ck-lv nx" data-nx>${esc(nxLab(res.from.lvl))}</span></div>
      <div class="ck-pay" hidden><span class="ck-up" data-up></span><b class="ck-f">+<span data-f>0</span>${fi("sm")}</b></div>${retoRows(res.retos)}
      <div class="ck-next" data-nxr>${nextHtml(res.from.lvl)}</div>
    </div>`;
  }
  const lvLab = L => P6(TX.lvS).replace("{n}", L);
  const nxLab = L => (L >= CFG.max ? P6(TX.leyS) : P6(TX.lvS).replace("{n}", L + 1));
  /* «Siguiente: nivel 38 · carta nueva · +20» (el recibo, la portada y el camino) */
  function nextText(L) {
    if (L >= CFG.max) return P6(TX.nextLey).replace("{n}", A.fmt(CFG.leyPay));
    const r = rewardOf(L + 1), bits = [P6(TX.newCard)];
    if (r.tit && A.socio && A.socio.titleName) bits.push("«" + A.socio.titleName(r.tit) + "»");
    if (r.mat >= 0 && A.socio && A.socio.matName) bits.push(A.socio.matName(r.mat));
    if (r.rank > 0) bits.push(P6(RANKS[r.rank][0]));
    bits.push("+" + A.fmt(r.f + r.chest));
    return P6(TX.next).replace("{n}", L + 1) + " · " + bits.join(" · ");
  }
  const nextHtml = L => `${fi("sm")}<span>${esc(nextText(L))}</span>`;
  /* entrega 3: los retos cumplidos en la partida, uno por fila (hasta 3; si hay mas, una fila que los suma). Se tachan en play() */
  function retoRows(list) {
    if (!list || !list.length) return "";
    const shown = list.length > 3 ? list.slice(0, 2) : list, rest = list.slice(shown.length), RT = A.clubRetos.tx;
    const r1 = x => `<div class="ck-rt" data-rt><span class="ck-rti">${A.icon(x.ic)}</span><span class="ck-rtx"><em>${esc(x.g)}</em><span>${esc(x.tx)}</span></span><b class="ck-f">+${x.pay}${fi("sm")}</b></div>`;
    const more = rest.length ? `<div class="ck-rt sum" data-rt><span class="ck-rti">${A.icon("journal")}</span><span class="ck-rtx"><em>${esc(P6(RT.tab))}</em><span>${esc(P6(RT.more).replace("{n}", rest.length))}</span></span><b class="ck-f">+${rest.reduce((a, x) => a + x.pay, 0)}${fi("sm")}</b></div>` : "";
    return `<div class="ck-rts">${shown.map(r1).join("")}${more}</div>`;
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
    const nxr = el.querySelector("[data-nxr]");
    /* los tramos de la barra: en el 100 la barra es la del cofre de la Leyenda (cruzarla paga el cofre y no sube de nivel) */
    const steps = []; let L = res.from.lvl, into = res.from.into, left = res.gain;
    while (left > 0) { const n = L >= CFG.max ? CFG.ley : need(L), take = Math.min(left, n - into); steps.push({ L, a: into, b: into + take, n, cross: into + take >= n, ley: L >= CFG.max }); left -= take; into += take; if (into >= n) { if (L < CFG.max) L++; into = 0; } }
    const T = (fn, ms) => setTimeout(() => { if (alive()) fn(); }, ms);
    T(() => count(gn, 0, res.gain, Math.min(1400, 500 + res.gain), true), delay);              // la cuenta de la experiencia, tic a tic
    let t = delay + 250, fichas = 0, said = false;
    const ups = steps.filter(s => s.cross && !s.ley).map(s => s.L + 1), lastUp = ups[ups.length - 1];
    steps.forEach((s, i) => {
      const ms = reduce ? 0 : Math.max(380, Math.min(1100, ((s.b - s.a) / s.n) * 1400));
      T(() => { bar.style.transition = reduce ? "none" : `width ${ms}ms cubic-bezier(.3, .7, .4, 1)`; bar.style.width = pct(s.b, s.n) + "%"; }, t);
      t += ms;
      if (s.cross) {
        const nl = s.ley ? CFG.max : s.L + 1, k = s.ley ? 2 : nl % 10 === 0 ? 3 : nl % 5 === 0 ? 2 : 1, got = s.ley ? CFG.leyPay : payOf(nl) + chestOf(nl);
        T(() => {
          const f0 = fichas; fichas += got;
          el.classList.remove("hit"); if (A.restyle) A.restyle(el); el.classList.add("hit");
          pay.hidden = false; upEl.textContent = s.ley ? P6(TX.ley) : P6(chestOf(nl) ? TX.chest : TX.up).replace("{n}", nl) + (chestOf(nl) ? " · " + lvLab(nl) : "");
          count(fEl, f0, fichas, 600, false);
          lvEl.textContent = lvLab(nl); nxEl.textContent = nxLab(nl); if (nxr) nxr.innerHTML = nextHtml(nl);
          if (A.casa && A.casa.premio) A.casa.premio(k); else if (A.sfx && A.sfx.jackpot) A.sfx.jackpot(k);
          if (A.sfx && A.sfx.coin) setTimeout(() => A.sfx.coin(), 260);
          /* v2: la carta nueva sale del mazo, se da la vuelta y se sella (js/camino.js), al cruzar el ultimo nivel de la partida */
          if (!s.ley && nl === lastUp && A.camino && A.camino.reveal) A.camino.reveal(ups, { k });
          if (!said && A.dealer && A.dealer.on && A.dealer.say) { said = true; const pool = k === 3 ? [CHEST] : UP, c = st(); let i2 = Math.floor(Math.random() * pool.length); if (pool.length > 1 && i2 === c.lastLine) i2 = (i2 + 1) % pool.length; c.lastLine = i2; A.dealer.say(P6(pool[i2]).replace("{n}", nl), { mood: "sly", hold: 3200 }); }
        }, t);
        t += reduce ? 0 : 520 + 180 * k + (!s.ley && nl === lastUp ? 2200 : 0);
        T(() => { bar.style.transition = "none"; bar.style.width = "0%"; }, t - 1);
      }
    });
    /* entrega 3: los retos cumplidos se tachan uno a uno, con su sello y sus fichas */
    el.querySelectorAll("[data-rt]").forEach((row, i) => T(() => {
      row.classList.add("on");
      if (A.sfx && A.sfx.passStamp) A.sfx.passStamp(); else if (A.sfx && A.sfx.stamp) A.sfx.stamp();
      if (A.sfx && A.sfx.coin) setTimeout(() => A.sfx.coin(i), 180);
    }, t + 250 + i * (reduce ? 0 : 520)));
  }

  /* ------------------------------------------------------------------ la tarjeta de socio de la portada */
  const dealerTier = () => (A.dealer && A.dealer.tier ? A.dealer.tier() : 0);
  function tierNow() { return Math.max(tierOf(levelOf(st().xp).lvl), dealerTier()); }
  /* v0.3.157: la carta del socio (js/socio.js) se pinta al montar la portada (wire); aqui solo su sitio. La tienda y los retos van en la fila de placas */
  function card() {
    const c = st(), P = prof(), L = levelOf(c.xp), t = tierNow();
    const left = L.max ? "" : " " + P6(TX.left).replace("{n}", A.fmt(L.need - L.into)).replace("{m}", L.lvl + 1) + ".";
    const tt = A.ttAttr ? A.ttAttr(P6(TX.card), P6(TX.tip) + left + " " + nextText(L.lvl) + ".") : "", lab = `${P6(TX.card)}: ${P.name || P6(TX.anon)} · ${P6(RANKS[t][0])} · ${P6(TX.lv).replace("{n}", L.lvl)}`;
    /* v2: bajo la carta, lo que te toca en el nivel siguiente (el camino entero, al pulsarla) */
    const nr = L.max ? P6(TX.nextLey).replace("{n}", A.fmt(CFG.leyPay)) : P6(TX.next).replace("{n}", L.lvl + 1) + " · +" + A.fmt(payOf(L.lvl + 1) + chestOf(L.lvl + 1));
    return `<span class="hh-socio-w sc-v2"><button type="button" class="hh-socio sc-v2" id="socioBtn" ${tt} aria-label="${esc(lab)}"><span id="socioCard"></span></button><span class="hh-socio-nx" aria-hidden="true">${fi("sm")}<span>${esc(nr)}</span></span></span>`;
  }
  /* al volver a la portada con fichas nuevas, la tarjeta las cuenta delante de ti (moneda a moneda), con su brillo */
  function wire(onOpen) {
    const b = document.getElementById("socioBtn"); if (!b) return;
    if (A.socio) A.socio.mount(document.getElementById("socioCard"), { w: 192, id: "socioF", hover: b });   // la carta, antes de contar sus fichas
    if (A.ach && A.ach.emit) A.ach.emit("club");                            // v2: quien ya pasaba del 10 o del 100 al llegar la v2
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
    CFG, RANKS, RANKX, need, levelOf, tierOf, groupOf, q, bonus, cash, strip, play, card, wire, tierNow,
    payOf, chestOf, rewardOf, nextText, TOT, TITLE_AT,
    level: () => levelOf(st().xp).lvl, xp: () => st().xp, fichas: () => st().f, now: () => levelOf(st().xp),
    rankX: i => (RANKX[i] || RANKX[0]).map(P6),
    /* v0.3.132: gastar fichas de oro (la boutique). La tarjeta no las cuenta hacia arriba: lo gastado ya se ha visto irse */
    give(n) { const c = st(); n = Math.max(0, Math.round(n)); c.f += n; save(); return c.f; },   // entrega 3: lo que pagan los retos (la tarjeta lo cuenta al volver: fSeen no se toca)
    spend(n) { const c = st(); n = Math.max(0, Math.round(n)); if (!(c.f >= n)) return false; c.f -= n; c.fSeen = Math.min(c.fSeen == null ? c.f : c.fSeen, c.f); save(); return true; },
    bonusFor: kind => (kind === "win" ? CFG.bonus.win : kind === "ok" ? CFG.bonus.ok : kind === "duel" ? CFG.bonus.duel : 0),
    tx: TX, tierName: t => P6(RANKS[Math.max(0, Math.min(RANKS.length - 1, t | 0))][0]),
  };
})(window.AIQ);
