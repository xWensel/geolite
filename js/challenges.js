/*
 * Geolite - RETOS de la Aventura (v0.11). El crupier "toca la mesa": cada ronda trae retos que cambian
 *   - el NOMBRE del lugar (letras que tiemblan, faltan, se cambian, runas, anagramas, otro idioma, adivinanza...),
 *   - el MAPA (borroso, apagon, fronteras falsas, Pangea, Big bang, continentes torcidos, del reves, terremoto, deriva, lluvia, rayos...),
 *   - el PUNTERO (tiembla, parpadea, desaparece, se emborrona, va con retraso, se mueve al reves, marea...) y
 *   - las REGLAS (viento, tormenta, silencio).
 * No tocan la puntuacion: solo hacen mas dificil encontrar el sitio. Los perks los mitigan (ver `fx` en js/relics.js).
 *
 *   A.chal.plan(seed, roundNo, asc, topic, cjk) -> { list:[{id,lv}], boss, combo }   (determinista: la tienda anuncia la ronda siguiente)
 *   A.chal.begin(list, fx, ctx)       A.chal.question(o, qi)   A.chal.reveal()   A.chal.suspend()   A.chal.end()
 *   A.chal.ptrMods()                  -> parametros del puntero para js/pointer.js
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id);
  const L6 = A.L6;
  /* Torre de Babel: el nombre sale en uno de los 6 idiomas originales; los nuevos (zh, ko, ja, ru) no entran salvo que el jugador
     juegue en ellos, y el idioma del jugador (y su base: es-419 -> es) nunca se elige */
  const BABEL_BASE = ["es", "en", "fr", "pt", "de", "it"];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /*T16-BEGIN*/
  const T16 = {"n_siesta":"La siesta del crupier|The dealer's nap|La sieste du croupier|A soneca do crupiê|Das Nickerchen des Croupiers|Il pisolino del croupier||荷官的午睡|딜러의 낮잠|ディーラーの昼寝|Сиеста крупье|Drzemka krupiera","n_coll":"El coleccionista|The collector|Le collectionneur|O colecionador|Der Sammler|Il collezionista||收藏家|수집가|コレクター|Коллекционер|Kolekcjoner","n_wheel":"Rueda de la fortuna|Wheel of fortune|Roue de la fortune|Roda da fortuna|Glücksrad|Ruota della fortuna||命运之轮|운명의 수레바퀴|運命の輪|Колесо фортуны|Koło fortuny","n_duel":"Duelo con la banca|Showdown with the bank|Duel avec la banque|Duelo com a banca|Duell mit der Bank|Duello con il banco||对决庄家|뱅크와의 대결|バンクとの決闘|Дуэль с банком|Pojedynek z bankiem","n_dirty":"Juego sucio|Dirty play|Jeu déloyal|Jogo sujo|Falsches Spiel|Gioco sporco||脏招|반칙 플레이|汚い手|Грязная игра|Brudna gra","ch_siesta_n":"Siesta|Nap|Sieste|Soneca|Nickerchen|Pisolino||午睡|낮잠|昼寝|Сиеста|Drzemka","ch_siesta_d":"El crupier duerme. Cada zoom, arrastre, herramienta y segundo de duda hace ruido: si lo despiertas, apaga las luces.|The dealer is asleep. Every zoom, drag, tool and second of doubt makes noise: wake him up and he turns the lights out.|Le croupier dort. Chaque zoom, glissement, outil et seconde d'hésitation fait du bruit : réveille-le et il éteint les lumières.|O crupiê está dormindo. Cada zoom, arrasto, ferramenta e segundo de dúvida faz barulho: se você o acordar, ele apaga as luzes.|Der Croupier schläft. Jeder Zoom, jedes Ziehen, jedes Werkzeug und jede Sekunde Zögern macht Lärm: Weckst du ihn auf, macht er das Licht aus.|Il croupier dorme. Ogni zoom, trascinamento, strumento e secondo di dubbio fa rumore: se lo svegli, spegne le luci.||荷官正在睡觉。每次缩放、拖动、使用道具，乃至每一秒犹豫都会发出声响：把他吵醒，他就关灯。|딜러가 잠들었습니다. 확대, 드래그, 도구 사용, 망설이는 1초까지 모두 소리가 납니다. 깨우면 불을 꺼버립니다.|ディーラーは眠っている。ズーム、ドラッグ、道具、迷う1秒ごとに物音がする。起こすと照明を消される。|Крупье спит. Каждый зум, перетаскивание, инструмент и секунда сомнений шумят: разбудишь его — он выключит свет.|Krupier śpi. Każde przybliżenie, przeciągnięcie, narzędzie i sekunda wahania robi hałas: obudzisz go, a zgasi światła.","d_blackout":"El foco se cierra con cada pregunta. Desde la tercera, las luces parpadean.|The spotlight closes in with every question. From the third, the lights flicker.|Le projecteur se resserre à chaque question. À partir de la troisième, les lumières clignotent.|O foco vai se fechando a cada pergunta. A partir da terceira, as luzes piscam.|Der Scheinwerfer wird mit jeder Frage enger. Ab der dritten flackert das Licht.|Il faro si stringe a ogni domanda. Dalla terza, le luci diventano intermittenti.||聚光灯每答一题就收紧一点。从第三题起，灯光开始闪烁。|스포트라이트가 문제마다 좁아집니다. 세 번째 문제부터 조명이 깜빡입니다.|スポットライトは問題ごとに狭まる。3問目からは照明が点滅する。|Прожектор сужается с каждым вопросом. С третьего свет начинает мигать.|Reflektor zawęża się z każdym pytaniem. Od trzeciego światła migają.","d_dizzy":"El pulso se acelera pregunta a pregunta y las letras no están quietas.|Your pulse races a bit more each question and the letters won't sit still.|Ton pouls s'accélère à chaque question et les lettres ne tiennent pas en place.|Seu pulso acelera a cada pergunta e as letras não ficam paradas.|Dein Puls rast mit jeder Frage mehr und die Buchstaben bleiben nicht still.|Il battito accelera a ogni domanda e le lettere non stanno ferme.||脉搏每题加快一点，字母也静不下来。|문제마다 맥박이 빨라지고 글자도 가만있지 않습니다.|問題ごとに脈が速くなり、文字もじっとしていない。|Пульс учащается с каждым вопросом, а буквы не стоят на месте.|Puls przyspiesza z każdym pytaniem, a litery nie chcą stać w miejscu.","d_onecont":"Los continentes se acercan un poco más en cada pregunta, hasta fundirse en uno.|The continents draw closer with every question, until they melt into one.|Les continents se rapprochent à chaque question, jusqu'à fusionner en un seul.|Os continentes se aproximam a cada pergunta, até se fundirem em um só.|Die Kontinente rücken mit jeder Frage näher zusammen, bis sie zu einem verschmelzen.|I continenti si avvicinano a ogni domanda, fino a fondersi in uno solo.||大洲每题靠近一点，直到融为一体。|대륙들이 문제마다 가까워지다가 결국 하나로 합쳐집니다.|問題ごとに大陸が近づき、最後にはひとつに溶け合う。|Материки сближаются с каждым вопросом, пока не сольются в один.|Kontynenty zbliżają się z każdym pytaniem, aż zleją się w jeden.","d_blind":"El mapa se desenfoca más en cada pregunta y la tinta se va borrando.|The map gets blurrier with every question and the ink fades.|La carte devient plus floue à chaque question et l'encre s'efface.|O mapa fica mais desfocado a cada pergunta e a tinta vai apagando.|Die Karte wird mit jeder Frage verschwommener und die Tinte verblasst.|La mappa si sfoca a ogni domanda e l'inchiostro sbiadisce.||地图每题更模糊一点，墨水也在褪色。|지도가 문제마다 더 흐려지고 잉크도 바랩니다.|問題ごとに地図がぼやけ、インクもかすれていく。|Карта размывается с каждым вопросом, а чернила выцветают.|Mapa rozmywa się z każdym pytaniem, a atrament blaknie.","d_nightfall":"Cae la noche: solo ves el mapa cuando cae un rayo, y las letras tiemblan.|Night falls: you only see the map when lightning strikes, and the letters shake.|La nuit tombe : tu ne vois la carte que quand l'éclair frappe, et les lettres tremblent.|A noite cai: você só vê o mapa quando cai um raio, e as letras tremem.|Die Nacht bricht an: Die Karte siehst du nur, wenn ein Blitz einschlägt, und die Buchstaben zittern.|Cala la notte: vedi la mappa solo quando cade un fulmine, e le lettere tremano.||夜幕降临：只有闪电划过时才看得见地图，字母也在颤抖。|밤이 내립니다. 번개가 칠 때만 지도가 보이고, 글자는 떨립니다.|夜が訪れる。地図が見えるのは稲妻が走る瞬間だけ、文字も震える。|Наступает ночь: карту видно только при вспышке молнии, а буквы дрожат.|Zapada noc: mapę widać tylko podczas błyskawicy, a litery drżą.","d_siesta":"El crupier duerme. Cada zoom, arrastre, herramienta y segundo de duda hace ruido.|The dealer is asleep. Every zoom, drag, tool and second of doubt makes noise.|Le croupier dort. Chaque zoom, glissement, outil et seconde d'hésitation fait du bruit.|O crupiê está dormindo. Cada zoom, arrasto, ferramenta e segundo de dúvida faz barulho.|Der Croupier schläft. Jeder Zoom, jedes Ziehen, jedes Werkzeug und jede Sekunde Zögern macht Lärm.|Il croupier dorme. Ogni zoom, trascinamento, strumento e secondo di dubbio fa rumore.||荷官正在睡觉。每次缩放、拖动、使用道具，乃至每一秒犹豫都会发出声响。|딜러가 잠들었습니다. 확대, 드래그, 도구 사용, 망설이는 1초까지 모두 소리가 납니다.|ディーラーは眠っている。ズーム、ドラッグ、道具、迷う1秒ごとに物音がする。|Крупье спит. Каждый зум, перетаскивание, инструмент и секунда сомнений шумят.|Krupier śpi. Każde przybliżenie, przeciągnięcie, narzędzie i sekunda wahania robi hałas.","d_flagfog":"La niebla se espesa y la bandera se oscurece en cada pregunta.|The fog thickens and the flag dims with every question.|Le brouillard s'épaissit et le drapeau s'assombrit à chaque question.|A névoa engrossa e a bandeira escurece a cada pergunta.|Der Nebel wird dichter und die Flagge dunkler, mit jeder Frage.|La nebbia si infittisce e la bandiera si oscura a ogni domanda.||雾越来越浓，国旗每题更暗一点。|안개가 짙어지고 국기는 문제마다 어두워집니다.|霧は濃くなり、国旗も問題ごとに暗くなっていく。|Туман сгущается, а флаг темнеет с каждым вопросом.|Mgła gęstnieje, a flaga ciemnieje z każdym pytaniem.","d_flagworld":"Bandera y mundo se dan la vuelta, y cada pregunta de una manera distinta.|Flag and world flip over, a different way every question.|Drapeau et monde se retournent, d'une façon différente à chaque question.|Bandeira e mundo viram do avesso, de um jeito diferente a cada pergunta.|Flagge und Welt drehen sich um, bei jeder Frage anders.|Bandiera e mondo si capovolgono, in modo diverso a ogni domanda.||国旗和世界一起翻转，每题的翻法都不同。|국기와 세계가 뒤집히는데, 문제마다 방식이 다릅니다.|国旗と世界がひっくり返る。問題ごとに違う返り方で。|Флаг и мир переворачиваются, и каждый вопрос по-новому.|Flaga i świat odwracają się, za każdym pytaniem inaczej.","d_flagneon":"El neón gira más rápido en cada pregunta y las fronteras mienten.|The neon spins faster every question and the borders lie.|Le néon tourne plus vite à chaque question et les frontières mentent.|O neon gira mais rápido a cada pergunta e as fronteiras mentem.|Das Neon dreht sich mit jeder Frage schneller und die Grenzen lügen.|Il neon gira più veloce a ogni domanda e i confini mentono.||霓虹每题转得更快，边界也在撒谎。|네온이 문제마다 더 빨리 돌고 국경은 거짓말을 합니다.|ネオンは問題ごとに速く回り、国境は嘘をつく。|Неон крутится быстрее с каждым вопросом, а границы лгут.|Neon kręci się szybciej z każdym pytaniem, a granice kłamią.","d_flagpix":"La bandera se emborrona y el mapa se hace de píxeles gordos, cada vez más.|The flag blurs and the map turns chunky, more with every question.|Le drapeau se brouille et la carte se pixellise en gros blocs, de plus en plus à chaque question.|A bandeira borra e o mapa vira pixels gordos, cada vez mais a cada pergunta.|Die Flagge verschwimmt und die Karte wird grobpixelig, mit jeder Frage mehr.|La bandiera si sfoca e la mappa diventa a pixel giganti, sempre di più a ogni domanda.||国旗逐渐模糊，地图变成粗大像素，每题愈发严重。|국기는 번지고 지도는 큼직한 픽셀로 변하며, 문제마다 더 심해집니다.|国旗はぼやけ、地図は粗いピクセルになる。問題ごとにひどくなっていく。|Флаг расплывается, а карта превращается в крупные пиксели — всё сильнее с каждым вопросом.|Flaga się rozmazuje, a mapa zamienia się w grube piksele, coraz bardziej z każdym pytaniem.","d_flagmute":"Cine mudo: la bandera pierde el color y el mapa las fronteras, cada vez más.|Silent movie: the flag loses its colour and the map its borders, more each question.|Cinéma muet : le drapeau perd ses couleurs et la carte ses frontières, de plus en plus à chaque question.|Cinema mudo: a bandeira perde a cor e o mapa as fronteiras, cada vez mais a cada pergunta.|Stummfilm: Die Flagge verliert ihre Farbe und die Karte ihre Grenzen, mit jeder Frage mehr.|Cinema muto: la bandiera perde il colore e la mappa i confini, sempre di più a ogni domanda.||默片：国旗失去颜色，地图失去边界，每题更甚。|무성 영화: 국기는 색을, 지도는 국경을 잃으며 문제마다 더 심해집니다.|サイレント映画。国旗は色を、地図は国境を失い、問題ごとに進んでいく。|Немое кино: флаг теряет цвет, а карта — границы, всё сильнее с каждым вопросом.|Kino nieme: flaga traci kolor, a mapa granice, coraz bardziej z każdym pytaniem.","d_falsealarm":"Los continentes se acercan y acaban barajados, y las fronteras mienten cada vez más.|The continents drift together and end up shuffled, and the borders lie more each time.|Les continents se rapprochent et finissent mélangés, et les frontières mentent de plus en plus.|Os continentes se aproximam e acabam embaralhados, e as fronteiras mentem cada vez mais.|Die Kontinente driften zusammen und landen durchgemischt, und die Grenzen lügen immer mehr.|I continenti si avvicinano e finiscono mescolati, e i confini mentono sempre di più.||大洲相互靠拢，最后被洗乱，边界也越来越会撒谎。|대륙들이 서로 다가오다 결국 뒤섞이고, 국경은 갈수록 거짓말을 합니다.|大陸は寄り集まってやがてシャッフルされ、国境の嘘もひどくなっていく。|Материки сближаются и в итоге перетасовываются, а границы лгут всё сильнее.|Kontynenty zbliżają się i w końcu się mieszają, a granice kłamią coraz bardziej.","d_quakehall":"La sala tiembla más fuerte en cada pregunta y las chinchetas llueven sin parar.|The hall shakes harder every question and decoy pins keep raining down.|La salle tremble plus fort à chaque question et les épingles leurres pleuvent sans arrêt.|O salão treme mais forte a cada pergunta e os pinos falsos chovem sem parar.|Der Saal bebt mit jeder Frage stärker und Lockvogel-Pins regnen unaufhörlich herab.|La sala trema più forte a ogni domanda e i pin esca piovono senza sosta.|La sala tiembla más fuerte en cada pregunta y las chinches llueven sin parar.|大厅每题震得更凶，诱饵图钉不停地往下掉。|홀이 문제마다 더 세게 흔들리고 가짜 핀이 끝없이 쏟아집니다.|ホールは問題ごとに激しく揺れ、おとりピンが降り止まない。|Зал трясёт всё сильнее с каждым вопросом, а ложные булавки сыплются без конца.|Sala trzęsie się coraz mocniej z każdym pytaniem, a fałszywe pinezki wciąż sypią się z góry.","d_fourthwall":"El crupier se sale de la pantalla: una cosa distinta en cada pregunta.|The dealer steps out of the screen: something different every question.|Le croupier sort de l'écran : une surprise différente à chaque question.|O crupiê sai da tela: algo diferente a cada pergunta.|Der Croupier steigt aus dem Bildschirm: jede Frage etwas anderes.|Il croupier esce dallo schermo: una cosa diversa a ogni domanda.||荷官走出了屏幕：每题都有新花样。|딜러가 화면 밖으로 나옵니다. 문제마다 다른 일이 벌어집니다.|ディーラーが画面から飛び出す。問題ごとに違うことが起こる。|Крупье выходит за пределы экрана: на каждый вопрос что-то новое.|Krupier wychodzi poza ekran: z każdym pytaniem coś innego.","d_collector":"El crupier enseña su álbum: cada bandera trae un truco distinto, anunciado con un golpe de sello.|The dealer shows off his album: every flag brings a different trick, announced with a stamp.|Le croupier exhibe son album : chaque drapeau apporte un tour différent, annoncé d'un coup de tampon.|O crupiê exibe seu álbum: cada bandeira traz um truque diferente, anunciado com uma carimbada.|Der Croupier zeigt sein Album: Jede Flagge bringt einen anderen Trick, angekündigt mit einem Stempelschlag.|Il croupier mostra il suo album: ogni bandiera porta un trucco diverso, annunciato da un colpo di timbro.||荷官亮出了他的收藏册：每面国旗都带来不同的把戏，并以一记盖章宣告。|딜러가 자신의 앨범을 자랑합니다. 국기마다 다른 속임수가 도장 소리와 함께 예고됩니다.|ディーラーが自慢のアルバムを披露する。国旗ごとに違う仕掛けが、スタンプの音とともに告げられる。|Крупье хвастается своим альбомом: у каждого флага свой трюк, о котором объявляет удар штампа.|Krupier chwali się swoim albumem: każda flaga niesie inny trik, zapowiedziany uderzeniem pieczątki.","d_mirror":"Mapa y controles se dan la vuelta, y cada pregunta de una manera distinta.|Map and controls flip over, a different way every question.|Carte et commandes se retournent, d'une façon différente à chaque question.|Mapa e controles se invertem, de um jeito diferente a cada pergunta.|Karte und Steuerung drehen sich um, bei jeder Frage anders.|Mappa e comandi si capovolgono, in modo diverso a ogni domanda.||地图和操作一起翻转，每题的翻法都不同。|지도와 조작이 뒤집히는데, 문제마다 방식이 다릅니다.|地図と操作がひっくり返る。問題ごとに違う返り方で。|Карта и управление переворачиваются, и каждый вопрос по-новому.|Mapa i sterowanie odwracają się, za każdym pytaniem inaczej.","d_shuffled":"Los continentes se reparten otra vez en cada pregunta, con luces que fallan y tinta que se borra.|The continents are dealt again every question, with failing lights and fading ink.|Les continents sont redistribués à chaque question, avec des lumières qui lâchent et de l'encre qui s'efface.|Os continentes são redistribuídos a cada pergunta, com luzes falhando e tinta apagando.|Die Kontinente werden jede Frage neu ausgeteilt, mit ausfallendem Licht und verblassender Tinte.|I continenti vengono distribuiti di nuovo a ogni domanda, con luci che cedono e inchiostro che sbiadisce.||大洲每题都重新发牌，灯光失灵，墨水褪色。|대륙이 문제마다 다시 배치되고, 조명은 나가고 잉크는 바랩니다.|大陸は問題ごとに配り直され、照明は落ち、インクはかすれていく。|Материки раздаются заново на каждый вопрос, свет сбоит, а чернила выцветают.|Kontynenty są rozdawane od nowa z każdym pytaniem, światła zawodzą, a atrament blaknie.","d_dirty":"Aquí se juega sucio: fronteras falsas, luces que fallan, el reloj en contra y una zancadilla distinta en cada pregunta.|Dirty play: false borders, failing lights, the clock against you and a different trip-up every question.|Jeu déloyal : fausses frontières, lumières qui lâchent, le chrono contre toi et un croche-pied différent à chaque question.|Jogo sujo: fronteiras falsas, luzes falhando, o relógio contra você e uma rasteira diferente a cada pergunta.|Falsches Spiel: falsche Grenzen, ausfallendes Licht, die Uhr gegen dich und jede Frage ein neues Beinstellen.|Gioco sporco: confini falsi, luci che cedono, l'orologio contro di te e uno sgambetto diverso a ogni domanda.||脏招尽出：虚假边界、灯光失灵、时间紧逼，每题还有不同的绊子。|반칙 천지: 가짜 국경, 나가는 조명, 시간과의 싸움, 그리고 문제마다 다른 발목 잡기.|汚い手のオンパレード。偽の国境、落ちる照明、迫る時計、そして問題ごとに違う足払い。|Грязная игра: ложные границы, сбоящий свет, время против тебя и новая подножка на каждый вопрос.|Brudna gra: fałszywe granice, zawodzące światła, zegar przeciw tobie i inna podstawiona noga w każdym pytaniu.","d_perfect":"Empieza lloviendo; luego llegan los rayos y por último la noche.|It starts raining; then the lightning arrives, and finally the night.|Il commence par pleuvoir ; puis arrivent les éclairs, et enfin la nuit.|Começa chovendo; depois chegam os raios e, por fim, a noite.|Erst regnet es, dann kommen die Blitze und zuletzt die Nacht.|Inizia a piovere; poi arrivano i fulmini e infine la notte.||先是下雨，接着电闪雷鸣，最后夜幕降临。|비가 내리기 시작하고, 이어서 번개가 치고, 마지막에는 밤이 찾아옵니다.|まず雨が降り、次に稲妻が走り、最後に夜が来る。|Сначала дождь, затем молнии, а в конце — ночь.|Najpierw pada deszcz, potem przychodzą błyskawice, a na końcu noc.","d_crash":"Una sola batería para toda la ronda: del 100 al 5 %.|A single battery for the whole round: from 100 down to 5 %.|Une seule batterie pour toute la manche : de 100 à 5 %.|Uma única bateria para a rodada inteira: de 100 a 5 %.|Ein einziger Akku für die ganze Runde: von 100 auf 5 %.|Una sola batteria per tutto il round: dal 100 al 5 %.||整轮只有一块电池：从 100 降到 5 %。|한 라운드 내내 배터리는 하나뿐입니다. 100에서 5 %까지.|ラウンド全体でバッテリーはひとつだけ。100から5 %まで。|Одна батарея на весь раунд: от 100 до 5 %.|Jedna bateria na całą rundę: od 100 do 5 %.","d_nopass":"Cada pregunta, un truco distinto con el nombre, y los píxeles gordos no se van.|A different trick with the name every question, and the chunky pixels never leave.|Un tour différent avec le nom à chaque question, et les gros pixels ne partent jamais.|Um truque diferente com o nome a cada pergunta, e os pixels gordos nunca saem.|Jede Frage ein anderer Trick mit dem Namen, und die groben Pixel bleiben immer.|Un trucco diverso col nome a ogni domanda, e i pixel giganti non se ne vanno mai.||每题名字都有不同的把戏，粗大像素也始终不会消失。|문제마다 이름에 다른 속임수가 걸리고, 큼직한 픽셀은 절대 사라지지 않습니다.|問題ごとに名前へ違う仕掛けがかかり、粗いピクセルは決して消えない。|На каждый вопрос новый трюк с названием, а крупные пиксели не исчезают никогда.|Z każdym pytaniem inny trik z nazwą, a grube piksele nigdy nie znikają.","d_wheel":"Antes de cada pregunta gira la rueda: cae una familia de retos, a tope.|Before every question the wheel spins: a family of challenges lands, at full blast.|Avant chaque question, la roue tourne : une famille de défis tombe, à fond.|Antes de cada pergunta a roda gira: cai uma família de desafios, com força total.|Vor jeder Frage dreht sich das Rad: Eine Herausforderungsfamilie fällt, volle Kraft.|Prima di ogni domanda gira la ruota: esce una famiglia di sfide, al massimo.||每题之前轮盘都会转动：落下一类挑战，火力全开。|문제마다 앞서 바퀴가 돌아가고, 도전 한 계열이 최대 강도로 걸립니다.|問題の前にホイールが回り、チャレンジの系統がひとつ、全開で選ばれる。|Перед каждым вопросом крутится колесо: выпадает семейство испытаний, на полную мощность.|Przed każdym pytaniem kręci się koło: wypada rodzina wyzwań, na pełnej mocy.","d_duel":"Tu objetivo es la banca: su puntuación sube pregunta a pregunta.|Your target is the bank: its score climbs question by question.|Ta cible, c'est la banque : son score grimpe de question en question.|Sua meta é a banca: a pontuação dela sobe pergunta a pergunta.|Dein Ziel ist die Bank: Ihre Punktzahl steigt Frage für Frage.|Il tuo obiettivo è il banco: il suo punteggio sale domanda dopo domanda.||你的目标是庄家：它的分数一题接一题地攀升。|목표는 뱅크입니다. 뱅크의 점수는 문제마다 올라갑니다.|目標はバンク。そのスコアは問題ごとに上がっていく。|Твоя цель — банк: его счёт растёт с каждым вопросом.|Twoim celem jest bank: jego wynik rośnie z pytania na pytanie.","l_blackout":"Voy a ir apagando la sala poco a poco. Tú sigue buscando.|I'll dim the room bit by bit. You keep searching.|Je vais éteindre la salle petit à petit. Toi, continue de chercher.|Vou apagando a sala aos poucos. Você continua procurando.|Ich dimme den Saal Stück für Stück. Du suchst einfach weiter.|Spegnerò la sala a poco a poco. Tu continua a cercare.||我会一点一点把大厅的灯调暗。你继续找就好。|홀을 조금씩 어둡게 할게요. 당신은 계속 찾아보세요.|会場を少しずつ暗くしていくよ。君は探し続けて。|Буду понемногу гасить свет в зале. А ты продолжай искать.|Będę po trochu gasił światła w sali. Ty szukaj dalej.","l_dizzy":"¿Notas el corazón? Tranquilo: cada pregunta late un poco más fuerte.|Feel that heartbeat? Relax: it beats a little harder every question.|Tu sens ton cœur ? Du calme : il bat un peu plus fort à chaque question.|Sentiu o coração? Calma: ele bate um pouco mais forte a cada pergunta.|Spürst du dein Herz? Ganz ruhig: Es schlägt mit jeder Frage ein bisschen härter.|Senti il cuore? Tranquillo: batte un po' più forte a ogni domanda.||感觉到心跳了吗？别慌：每一题它都跳得更猛一点。|심장 뛰는 거 느껴져요? 진정하세요. 문제마다 조금씩 더 세게 뜁니다.|心臓の音、聞こえる？落ち着いて。問題ごとに少しずつ強くなるだけさ。|Слышишь, как стучит сердце? Спокойно: с каждым вопросом оно бьётся чуть сильнее.|Czujesz to serce? Spokojnie: z każdym pytaniem bije trochę mocniej.","l_onecont":"Hoy el mundo se junta. Un poquito más en cada pregunta, como el que no quiere la cosa.|Today the world comes together. A little more every question, nice and casual.|Aujourd'hui, le monde se rassemble. Un peu plus à chaque question, l'air de rien.|Hoje o mundo se junta. Um pouquinho mais a cada pergunta, sem fazer alarde.|Heute rückt die Welt zusammen. Mit jeder Frage ein Stück mehr, ganz beiläufig.|Oggi il mondo si unisce. Un pochino di più a ogni domanda, come se niente fosse.||今天世界要合体了。每一题多靠近一点，装作若无其事。|오늘은 세상이 하나로 모입니다. 문제마다 조금씩, 아무렇지 않은 듯이.|今日は世界がひとつになる。問題ごとにちょっとずつ、何食わぬ顔でね。|Сегодня мир собирается воедино. С каждым вопросом чуть ближе, как бы между делом.|Dziś świat się łączy. Z każdym pytaniem trochę bardziej, jakby nigdy nic.","l_blind":"Se me ha empañado el cristal. Cada pregunta, un poco más. Perdón. Bueno, no.|My glass has fogged up. A little more each question. Sorry. Well, not really.|Ma vitre s'est embuée. Un peu plus à chaque question. Désolé. Enfin, pas vraiment.|Meu vidro embaçou. Um pouco mais a cada pergunta. Desculpe. Bom, nem tanto.|Mein Glas ist beschlagen. Mit jeder Frage ein bisschen mehr. Tut mir leid. Na ja, eigentlich nicht.|Mi si è appannato il vetro. Un po' di più a ogni domanda. Scusa. Beh, mica tanto.||我的玻璃起雾了。每一题多一点。抱歉。嗯，其实不抱歉。|유리가 뿌옇게 됐네요. 문제마다 조금씩 더. 미안해요. 아, 사실 안 미안해요.|ガラスが曇っちゃった。問題ごとに少しずつ。ごめんね。いや、全然。|Моё стекло запотело. С каждым вопросом чуть сильнее. Прости. Ну, на самом деле нет.|Szyba mi zaparowała. Z każdym pytaniem trochę bardziej. Przepraszam. No, właściwie nie.","l_nightfall":"Se acabó la luz. Si quieres ver el mapa, reza por un rayo.|The lights are gone. If you want to see the map, pray for lightning.|Plus de lumière. Si tu veux voir la carte, prie pour un éclair.|Acabou a luz. Se quer ver o mapa, reze por um raio.|Das Licht ist weg. Wenn du die Karte sehen willst, bete um einen Blitz.|La luce è finita. Se vuoi vedere la mappa, prega per un fulmine.||灯全灭了。想看地图的话，祈祷来道闪电吧。|불이 다 나갔어요. 지도를 보고 싶다면 번개가 치길 빌어요.|明かりは消えたよ。地図を見たいなら、稲妻に祈るんだね。|Свет погас. Хочешь увидеть карту — молись о молнии.|Światła zgasły. Jeśli chcesz zobaczyć mapę, módl się o błyskawicę.","l_siesta":"Chsss. Me echo una siesta. Si me despiertas, apago las luces.|Shhh. I'm taking a nap. Wake me up and I turn the lights out.|Chut. Je fais une sieste. Si tu me réveilles, j'éteins les lumières.|Shhh. Vou tirar uma soneca. Se me acordar, apago as luzes.|Pssst. Ich mach ein Nickerchen. Weckst du mich, mach ich das Licht aus.|Shhh. Mi faccio un pisolino. Se mi svegli, spengo le luci.||嘘——我要睡个午觉。吵醒我的话，我就关灯。|쉿. 낮잠 좀 잘게요. 깨우면 불 꺼버릴 거예요.|しーっ。昼寝するよ。起こしたら、照明を消しちゃうからね。|Тсс. Я вздремну. Разбудишь — выключу свет.|Ciii. Ucinam sobie drzemkę. Obudzisz mnie, to zgaszę światła.","l_flagfog":"Niebla en la sala y la bandera cada vez más a oscuras. Ya me dirás qué ves.|Fog in the room and the flag growing darker. Do tell me what you see.|Du brouillard dans la salle et le drapeau de plus en plus sombre. Dis-moi donc ce que tu vois.|Névoa na sala e a bandeira cada vez mais escura. Depois me conta o que você vê.|Nebel im Saal und die Flagge wird immer dunkler. Sag mir doch, was du siehst.|Nebbia in sala e la bandiera sempre più buia. Dimmi un po' cosa vedi.||大厅起雾了，国旗越来越暗。你倒是说说看，能看见什么？|홀에 안개가 끼고 국기는 점점 어두워지네요. 뭐가 보이는지 어디 말해 봐요.|会場に霧が立ちこめて、国旗はどんどん暗くなる。何が見えるのか、ぜひ教えてほしいな。|В зале туман, а флаг всё темнее. Ну-ка скажи, что ты видишь.|Mgła w sali, a flaga coraz ciemniejsza. No powiedz, co widzisz.","l_flagworld":"La bandera de espaldas y el mundo del revés. Cada pregunta, de otra forma.|The flag from behind and the world upside down. A different way every question.|Le drapeau vu de dos et le monde à l'envers. D'une façon différente à chaque question.|A bandeira de costas e o mundo de cabeça para baixo. De um jeito diferente a cada pergunta.|Die Flagge von hinten und die Welt auf dem Kopf. Jede Frage anders.|La bandiera di spalle e il mondo sottosopra. In modo diverso a ogni domanda.||国旗翻到背面，世界颠倒过来。每一题花样都不一样。|국기는 뒷면, 세계는 거꾸로. 문제마다 방식이 달라요.|国旗は裏側、世界は逆さま。問題ごとに違うやり方でね。|Флаг с изнанки и мир вверх ногами. И каждый вопрос по-новому.|Flaga od tyłu i świat do góry nogami. Za każdym pytaniem inaczej.","l_flagneon":"Neón y fronteras que mienten. Ojo con lo que brilla.|Neon and borders that lie. Watch out for whatever glitters.|Du néon et des frontières qui mentent. Méfie-toi de tout ce qui brille.|Neon e fronteiras que mentem. Cuidado com tudo que brilha.|Neon und Grenzen, die lügen. Vorsicht bei allem, was glitzert.|Neon e confini che mentono. Occhio a tutto ciò che luccica.||霓虹加上会撒谎的边界。小心一切发亮的东西。|네온과 거짓말하는 국경. 반짝이는 건 뭐든 조심해요.|ネオンと、嘘をつく国境。光るものには気をつけてね。|Неон и границы, которые лгут. Осторожно со всем, что блестит.|Neon i granice, które kłamią. Uważaj na wszystko, co się świeci.","l_flagpix":"Esta bandera viene en baja resolución. Y el mapa, también.|This flag comes in low resolution. So does the map.|Ce drapeau est en basse résolution. La carte aussi.|Esta bandeira vem em baixa resolução. O mapa também.|Diese Flagge kommt in niedriger Auflösung. Die Karte auch.|Questa bandiera è a bassa risoluzione. E anche la mappa.||这面国旗是低分辨率的。地图也是。|이 국기는 저해상도로 나왔어요. 지도도 마찬가지고요.|この国旗は低解像度だよ。地図もね。|Этот флаг в низком разрешении. Карта тоже.|Ta flaga jest w niskiej rozdzielczości. Mapa też.","l_flagmute":"Cine mudo: sin color y sin fronteras. Aquí solo se aplaude al final.|Silent movie: no colour and no borders. Applause is only allowed at the end.|Cinéma muet : sans couleur et sans frontières. On n'applaudit qu'à la fin.|Cinema mudo: sem cor e sem fronteiras. Aplausos só no final.|Stummfilm: keine Farben, keine Grenzen. Applaus gibt es erst am Ende.|Cinema muto: niente colore e niente confini. Gli applausi solo alla fine.||默片时间：没有颜色，没有边界。掌声只留到最后。|무성 영화입니다. 색도 국경도 없어요. 박수는 마지막에만 허용됩니다.|サイレント映画だよ。色も国境もなし。拍手は最後だけ。|Немое кино: ни цвета, ни границ. Аплодировать можно только в конце.|Kino nieme: bez koloru i bez granic. Brawa wyłącznie na końcu.","l_falsealarm":"¡Alarma! Los continentes se mueven... Falsa alarma. Bueno, casi.|Alarm! The continents are moving... False alarm. Well, almost.|Alerte ! Les continents bougent... Fausse alerte. Enfin, presque.|Alarme! Os continentes estão se movendo... Falso alarme. Bom, quase.|Alarm! Die Kontinente bewegen sich ... Fehlalarm. Na ja, fast.|Allarme! I continenti si muovono... Falso allarme. Beh, quasi.||警报！大洲在移动……虚惊一场。嗯，差不多吧。|경보! 대륙이 움직이고 있어요... 거짓 경보였네요. 아, 거의요.|警報！大陸が動いてる……誤報だよ。まあ、ほぼね。|Тревога! Материки движутся... Ложная тревога. Ну, почти.|Alarm! Kontynenty się ruszają... Fałszywy alarm. No, prawie.","l_quakehall":"Sujétate a lo que puedas: el suelo y las chinchetas se vienen conmigo.|Hold on to whatever you can: the floor and the pins are coming with me.|Accroche-toi à ce que tu peux : le sol et les épingles viennent avec moi.|Agarre-se no que puder: o chão e os pinos vêm comigo.|Halt dich fest, woran du kannst: Der Boden und die Pins kommen mit mir.|Aggrappati a quello che puoi: il pavimento e i pin vengono con me.|Sujétate a lo que puedas: el suelo y las chinches se vienen conmigo.|能抓什么就抓什么：地板和图钉都要跟我一起走了。|잡을 수 있는 건 뭐든 잡아요. 바닥도 핀도 저랑 같이 갑니다.|つかまれるものにつかまって。床もピンも、私と一緒に動くからね。|Держись за что можешь: пол и булавки отправляются со мной.|Trzymaj się czego możesz: podłoga i pinezki jadą ze mną.","l_fourthwall":"Voy a salirme de la pantalla. Cinco veces, de cinco maneras distintas.|I'm going to step out of the screen. Five times, in five different ways.|Je vais sortir de l'écran. Cinq fois, de cinq façons différentes.|Vou sair da tela. Cinco vezes, de cinco jeitos diferentes.|Ich steige gleich aus dem Bildschirm. Fünfmal, auf fünf verschiedene Arten.|Sto per uscire dallo schermo. Cinque volte, in cinque modi diversi.||我要走出屏幕了。五次，五种不同的方式。|화면 밖으로 나갈 거예요. 다섯 번, 다섯 가지 방법으로.|画面から飛び出すよ。5回、5通りのやり方でね。|Сейчас я выйду из экрана. Пять раз, пятью разными способами.|Zaraz wyjdę poza ekran. Pięć razy, na pięć różnych sposobów.","l_collector":"Permíteme enseñarte mi álbum de banderas. Cada página trae su sorpresa.|Allow me to show you my flag album. Every page has its own surprise.|Permets-moi de te montrer mon album de drapeaux. Chaque page a sa surprise.|Permita-me mostrar meu álbum de bandeiras. Cada página tem a sua surpresa.|Erlaube mir, dir mein Flaggenalbum zu zeigen. Jede Seite hat ihre eigene Überraschung.|Permettimi di mostrarti il mio album di bandiere. Ogni pagina ha la sua sorpresa.||容我给你看看我的国旗收藏册。每一页都有各自的惊喜。|제 국기 앨범을 보여 드릴게요. 페이지마다 저마다의 서프라이즈가 있답니다.|私の国旗アルバムをお見せしよう。どのページにも、それぞれ驚きがあるよ。|Позволь показать тебе мой альбом флагов. На каждой странице свой сюрприз.|Pozwól, że pokażę ci mój album flag. Każda strona ma swoją niespodziankę.","l_mirror":"Espejito, espejito... ¿qué pasa si te lo pongo todo del revés?|Mirror, mirror... what happens if I turn everything backwards?|Miroir, mon beau miroir... que se passe-t-il si je mets tout à l'envers ?|Espelho, espelho meu... o que acontece se eu virar tudo do avesso?|Spieglein, Spieglein ... was passiert, wenn ich alles verkehrt herum mache?|Specchio, specchio delle mie brame... che succede se metto tutto al contrario?||魔镜啊魔镜……要是我把一切都反过来，会怎样呢？|거울아, 거울아... 전부 거꾸로 만들면 어떻게 될까요?|鏡よ鏡……全部ひっくり返したらどうなるかな？|Свет мой, зеркальце... а что будет, если я переверну всё наоборот?|Lustereczko, powiedz przecie... co będzie, jak odwrócę wszystko na drugą stronę?","l_shuffled":"Barajo, reparto y vuelvo a barajar. Tú busca el país, que yo me ocupo del resto.|I shuffle, I deal, I shuffle again. You find the place; I'll take care of the rest.|Je mélange, je distribue, je mélange encore. Toi, trouve le pays ; je m'occupe du reste.|Eu embaralho, distribuo, embaralho de novo. Você acha o país; do resto cuido eu.|Ich mische, ich teile aus, ich mische wieder. Du findest das Land, den Rest erledige ich.|Mischio, distribuisco, rimischio. Tu trova il paese, al resto penso io.||我洗牌，我发牌，再洗一遍。你负责找国家，剩下的交给我。|섞고, 나누고, 다시 섞고. 당신은 나라만 찾아요. 나머지는 제가 맡을게요.|切って、配って、また切る。君は国を探して。あとは私に任せて。|Тасую, раздаю, тасую снова. Ты ищи страну, а остальное — на мне.|Tasuję, rozdaję, znowu tasuję. Ty znajdź kraj, resztą zajmę się ja.","l_dirty":"Hoy no pienso jugar limpio. Y esta vez no es un farol.|Today I'm not playing fair. And this time it's no bluff.|Aujourd'hui, je ne joue pas franc jeu. Et cette fois, ce n'est pas du bluff.|Hoje não vou jogar limpo. E desta vez não é blefe.|Heute spiele ich nicht fair. Und diesmal ist es kein Bluff.|Oggi non gioco pulito. E stavolta non è un bluff.||今天我不打算公平地玩。而且这回可不是虚张声势。|오늘은 정정당당하게 안 할 거예요. 이번엔 허세도 아니에요.|今日はフェアに遊ぶつもりはないよ。しかも今回はハッタリじゃない。|Сегодня я играю нечестно. И на этот раз это не блеф.|Dziś nie gram fair. I tym razem to nie blef.","l_perfect":"Primero la lluvia, luego los rayos, luego la noche. Ponte el abrigo.|First the rain, then the lightning, then the night. Put your coat on.|D'abord la pluie, puis les éclairs, puis la nuit. Mets ton manteau.|Primeiro a chuva, depois os raios, depois a noite. Vista o casaco.|Erst der Regen, dann die Blitze, dann die Nacht. Zieh dir den Mantel an.|Prima la pioggia, poi i fulmini, poi la notte. Mettiti il cappotto.||先是雨，再是闪电，然后是夜。把外套穿上。|먼저 비, 그다음 번개, 그다음 밤. 코트 챙겨 입어요.|まず雨、次に稲妻、それから夜。コートを着ておいで。|Сначала дождь, потом молнии, потом ночь. Надень пальто.|Najpierw deszcz, potem błyskawice, potem noc. Włóż płaszcz.","l_crash":"Tengo una sola batería para toda la ronda. Calcula bien, que se acaba.|I have a single battery for the whole round. Plan well, it runs out.|Je n'ai qu'une seule batterie pour toute la manche. Calcule bien, elle s'épuise.|Tenho uma única bateria para a rodada inteira. Calcule bem, ela acaba.|Ich habe nur einen Akku für die ganze Runde. Plane gut, er geht zur Neige.|Ho una sola batteria per tutto il round. Calcola bene, si esaurisce.||整轮我只有一块电池。算清楚点，它会耗尽的。|한 라운드 내내 배터리는 하나뿐이에요. 잘 계산해요, 닳거든요.|ラウンド全体でバッテリーはひとつだけ。よく考えてね、切れるから。|У меня одна батарея на весь раунд. Рассчитывай хорошо — она садится.|Mam jedną baterię na całą rundę. Dobrze planuj, bo się kończy.","l_nopass":"Sin pasaporte no se pasa. Y yo te lo cambio en cada pregunta.|No passport, no entry. And I change it every question.|Pas de passeport, pas d'entrée. Et je te le change à chaque question.|Sem passaporte, não se entra. E eu troco o seu a cada pergunta.|Ohne Pass kein Eintritt. Und ich tausche ihn dir bei jeder Frage aus.|Senza passaporto non si passa. E io te lo cambio a ogni domanda.||没有护照，不得入境。而且我每一题都给你换一个。|여권 없이는 못 지나가요. 그리고 문제마다 바꿔 드릴게요.|パスポートがなければ通れないよ。しかも問題ごとに取り替えるからね。|Без паспорта не пройдёшь. А я меняю его на каждый вопрос.|Bez paszportu nie przejdziesz. A ja podmieniam go co pytanie.","l_wheel":"¡Hagan juego! Que la rueda decida lo que te toca en cada pregunta.|Place your bets! Let the wheel decide what you get on every question.|Faites vos jeux ! Que la roue décide de ce qui t'attend à chaque question.|Façam suas apostas! Que a roda decida o que cai para você em cada pergunta.|Machen Sie Ihr Spiel! Das Rad entscheidet, was dich bei jeder Frage erwartet.|Fate il vostro gioco! Che la ruota decida cosa ti tocca a ogni domanda.||请下注！让轮盘决定你每一题抽到什么。|베팅하세요! 문제마다 뭐가 걸릴지는 바퀴가 정합니다.|さあ、賭けてください！問題ごとに何が出るかは、ホイールが決める。|Делайте ставки! Пусть колесо решает, что достанется тебе на каждом вопросе.|Obstawiajcie! Niech koło zdecyduje, co przypadnie ci w każdym pytaniu.","l_duel":"Hoy no juegas contra una meta. Juegas contra mí. Mira cómo puntúo.|Today you're not playing against a target. You're playing against me. Watch me score.|Aujourd'hui, tu ne joues pas contre un objectif. Tu joues contre moi. Regarde comme je marque.|Hoje você não joga contra uma meta. Joga contra mim. Veja como eu pontuo.|Heute spielst du nicht gegen ein Ziel. Du spielst gegen mich. Sieh zu, wie ich punkte.|Oggi non giochi contro un obiettivo. Giochi contro di me. Guarda come segno.||今天你对阵的不是目标分，而是我。看我怎么得分。|오늘은 목표 점수와 싸우는 게 아니에요. 저와 싸우는 겁니다. 제 점수나 구경해요.|今日の相手は目標じゃない。私だよ。私の点の入り方、見ててごらん。|Сегодня ты играешь не против цели. Ты играешь против меня. Смотри, как я набираю очки.|Dziś nie grasz z celem. Grasz ze mną. Patrz, jak punktuję.","ui_rise":"El jefe sube de tono en cada pregunta.|The boss steps it up every question.|Le boss monte d'un cran à chaque question.|O chefe sobe o nível a cada pergunta.|Der Boss legt mit jeder Frage nach.|Il boss alza il livello a ogni domanda.||每答一题，头目就加码一次。|보스가 문제마다 한 단계씩 올라갑니다.|ボスは問題ごとにギアを上げてくる。|Босс усиливается с каждым вопросом.|Boss podkręca tempo z każdym pytaniem.","ui_noise":"Ruido|Noise|Bruit|Barulho|Lärm|Rumore||噪音|소음|騒音|Шум|Hałas","ui_siestaWake":"¡¿Quién ha hecho ruido?! ¡Estaba durmiendo! Pues ahora, a oscuras.|Who made that noise?! I was sleeping! Fine, now it's lights out.|Qui a fait du bruit ?! Je dormais ! Eh bien, maintenant, extinction des feux.|Quem fez barulho?! Eu estava dormindo! Pois agora, luz apagada.|Wer war das?! Ich hab geschlafen! Na schön, jetzt wird's dunkel.|Chi ha fatto rumore?! Stavo dormendo! Bene, ora luci spente.||谁在吵？！我在睡觉！好，那现在就关灯。|누가 시끄럽게 했어요?! 자고 있었는데! 좋아요, 이제 불 끌 거예요.|誰だ、うるさいのは！寝てたのに！いいよ、じゃあ消灯だ。|Кто шумел?! Я спал! Ну всё, теперь свет гаснет.|Kto narobił hałasu?! Spałem! No dobra, to teraz gasną światła.","ui_ssHint":"Mueve el ratón para despertar la pantalla|Move the mouse to wake the screen|Bouge la souris pour réveiller l'écran|Mova o mouse para acordar a tela|Bewege die Maus, um den Bildschirm zu wecken|Muovi il mouse per riattivare lo schermo|Mueve el mouse para despertar la pantalla|移动鼠标唤醒屏幕|마우스를 움직여 화면을 깨우세요|マウスを動かして画面を起こす|Подвигай мышью, чтобы разбудить экран|Poruszaj myszą, by obudzić ekran","ui_bsodMsg":"Tu mapa ha tenido un problema y debe reiniciarse.|Your map ran into a problem and needs to restart.|Un problème est survenu sur votre carte et elle doit redémarrer.|Seu mapa encontrou um problema e precisa ser reiniciado.|Auf Ihrer Karte ist ein Problem aufgetreten. Sie muss neu gestartet werden.|Si è verificato un problema con la mappa ed è necessario riavviarla.||你的地图遇到问题，需要重新启动。|지도에 문제가 발생하여 다시 시작해야 합니다.|マップで問題が発生したため、再起動する必要があります。|На вашей карте возникла проблема, и её необходимо перезапустить.|Na Twojej mapie wystąpił problem i należy ją ponownie uruchomić.","ui_bsodCollect":"Recopilando información del error|Collecting error information|Collecte des informations sur l'erreur|Coletando informações do erro|Fehlerinformationen werden gesammelt|Raccolta delle informazioni sull'errore||正在收集错误信息|오류 정보 수집 중|エラー情報を収集しています|Сбор информации об ошибке|Zbieranie informacji o błędzie","ui_bsodStop":"Código de detención|Stop code|Code d'arrêt|Código de parada|Stoppcode|Codice di arresto||停止代码|중지 코드|停止コード|Код остановки|Kod zatrzymania","ui_wheelSpin":"La rueda gira…|The wheel spins…|La roue tourne…|A roda gira…|Das Rad dreht sich…|La ruota gira…||轮盘转动中……|바퀴가 돌아갑니다…|ホイールが回る…|Колесо вращается…|Koło się kręci…","ui_faceDown":"Carta boca abajo|Face-down card|Carte face cachée|Carta virada para baixo|Verdeckte Karte|Carta coperta||扣着的牌|뒤집힌 카드|伏せられたカード|Карта рубашкой вверх|Karta zakryta","ui_faceDownWheel":"La rueda del crupier decide cuál sale.|The dealer's wheel decides which one comes out.|La roue du croupier décide laquelle sort.|A roda do crupiê decide qual sai.|Das Rad des Croupiers entscheidet, welche herauskommt.|La ruota del croupier decide quale esce.||由荷官的轮盘决定抽出哪一张。|딜러의 바퀴가 어떤 것이 나올지 정합니다.|どれが出るかはディーラーのホイールが決める。|Колесо крупье решает, какая выпадет.|Koło krupiera decyduje, która wypadnie.","ui_faceDownColl":"El crupier no enseña esa página del álbum hasta que juegas.|The dealer won't show that album page until you play.|Le croupier ne montre pas cette page de l'album avant que tu joues.|O crupiê não mostra essa página do álbum até você jogar.|Der Croupier zeigt diese Albumseite erst, wenn du spielst.|Il croupier non mostra quella pagina dell'album finché non giochi.||你出手之前，荷官不会翻开那一页收藏册。|딜러는 당신이 플레이하기 전까지 그 앨범 페이지를 보여 주지 않습니다.|プレイするまで、ディーラーはそのアルバムのページを見せてくれない。|Крупье не покажет эту страницу альбома, пока ты не сыграешь.|Krupier nie pokaże tej strony albumu, dopóki nie zagrasz.","ui_album":"Álbum|Album|Album|Álbum|Album|Album||收藏册|앨범|アルバム|Альбом|Album","ui_you":"Tú|You|Toi|Você|Du|Tu||你|당신|あなた|Ты|Ty","ui_bank":"Banca|Bank|Banque|Banca|Bank|Banco||庄家|뱅크|バンク|Банк|Bank","ui_duelHud":"Banca {b}|Bank {b}|Banque {b}|Banca {b}|Bank {b}|Banco {b}||庄家 {b}|뱅크 {b}|バンク {b}|Банк {b}|Bank {b}","ui_duelLose":"La banca gana este pulso.|The bank takes this hand.|La banque remporte cette main.|A banca leva esta mão.|Die Bank gewinnt diese Hand.|Il banco vince questa mano.||这一手庄家赢了。|이번 판은 뱅크가 가져갑니다.|このハンドはバンクの勝ち。|Эту раздачу выигрывает банк.|To rozdanie wygrywa bank.","fam_letras":"Letras|Letters|Lettres|Letras|Buchstaben|Lettere||文字|글자|文字|Буквы|Litery","fam_saber":"Saber|Knowledge|Savoir|Saber|Wissen|Sapere||知识|지식|知識|Знания|Wiedza","fam_luz":"Luz|Light|Lumière|Luz|Licht|Luce||光线|빛|光|Свет|Światło","fam_tormenta":"Tormenta|Storm|Tempête|Tempestade|Sturm|Tempesta||风暴|폭풍|嵐|Буря|Burza","fam_vista":"Vista|Sight|Vue|Visão|Sicht|Vista||视觉|시야|視界|Зрение|Wzrok","fam_sitio":"Sitio|Place|Lieu|Lugar|Ort|Luogo||地点|장소|場所|Место|Miejsce","fam_puntero":"Puntero|Pointer|Curseur|Cursor|Zeiger|Cursore||光标|커서|カーソル|Курсор|Kursor","fam_pantalla":"Pantalla|Screen|Écran|Tela|Bildschirm|Schermo||屏幕|화면|画面|Экран|Ekran","fam_mentiras":"Mentiras|Lies|Mensonges|Mentiras|Lügen|Bugie||谎言|거짓|嘘|Ложь|Kłamstwa","fam_reglas":"Reglas|Rules|Règles|Regras|Regeln|Regole||规则|규칙|ルール|Правила|Zasady","ch_ss_n":"Salvapantallas|Screensaver|Écran de veille|Protetor de tela|Bildschirmschoner|Salvaschermo||屏保|화면 보호기|スクリーンセーバー|Заставка|Wygaszacz ekranu","ch_ss_d":"La pantalla entra en reposo cuando menos lo esperas: tu primer clic solo la despierta.|The screen goes to sleep when you least expect it: your first click only wakes it up.|L'écran se met en veille quand tu t'y attends le moins : ton premier clic ne fait que le réveiller.|A tela entra em repouso quando você menos espera: seu primeiro clique só serve para acordá-la.|Der Bildschirm geht in den Ruhemodus, wenn du es am wenigsten erwartest: Dein erster Klick weckt ihn nur auf.|Lo schermo va in standby quando meno te lo aspetti: il tuo primo clic serve solo a svegliarlo.||屏幕会在你最意想不到的时候进入休眠：你的第一次点击只会把它唤醒。|화면이 가장 예상치 못한 순간에 절전 모드로 들어갑니다. 첫 클릭은 화면을 깨우기만 합니다.|画面は思いもよらないタイミングでスリープに入る。最初のクリックは画面を起こすだけ。|Экран засыпает, когда ты меньше всего ждёшь: первый клик его только разбудит.|Ekran zasypia, gdy najmniej się tego spodziewasz: pierwsze kliknięcie tylko go obudzi.","ch_bsod_n":"Pantallazo azul|Blue screen|Écran bleu|Tela azul|Blauer Bildschirm|Schermata blu||蓝屏|블루스크린|ブルースクリーン|Синий экран|Niebieski ekran","ch_bsod_d":"Un pantallazo azul falso tapa el mapa un instante (el tiempo se devuelve).|A fake blue screen covers the map for a moment (the time is given back).|Un faux écran bleu recouvre la carte un instant (le temps est restitué).|Uma falsa tela azul cobre o mapa por um instante (o tempo é devolvido).|Ein falscher blauer Bildschirm verdeckt kurz die Karte (die Zeit wird zurückgegeben).|Una finta schermata blu copre la mappa per un istante (il tempo viene restituito).||一个假的蓝屏会短暂遮住地图（时间会补还给你）。|가짜 블루스크린이 잠깐 지도를 가립니다(시간은 돌려받습니다).|偽のブルースクリーンが一瞬だけ地図を覆う（時間は返される）。|Фальшивый синий экран на миг закрывает карту (время возвращается).|Fałszywy niebieski ekran na chwilę zasłania mapę (czas zostaje zwrócony).","tl_siesta":"Cada zoom y cada arrastre se oyen. Y yo tengo el sueño ligero.|Every zoom and every drag can be heard. And I'm a light sleeper.|Chaque zoom et chaque glissement s'entendent. Et moi, j'ai le sommeil léger.|Cada zoom e cada arrastada se ouvem. E eu tenho o sono leve.|Jeder Zoom und jedes Ziehen ist zu hören. Und ich habe einen leichten Schlaf.|Ogni zoom e ogni trascinamento si sentono. E io ho il sonno leggero.||每一次缩放、每一次拖动，我都听得见。而我睡得很浅。|확대할 때도, 끌 때도 다 들려요. 그리고 저는 잠귀가 밝거든요.|ズームもドラッグも、全部聞こえてるよ。それに私は眠りが浅いんだ。|Каждый зум и каждое перетаскивание слышно. А у меня чуткий сон.|Każdy zoom i każde przeciągnięcie słychać. A ja mam lekki sen.","tl_ss":"A veces la pantalla se me queda en reposo. Tu primer clic solo la despierta.|Sometimes my screen drifts into standby. Your first click only wakes it.|Parfois mon écran se met en veille. Ton premier clic ne fait que le réveiller.|Às vezes minha tela entra em repouso. Seu primeiro clique só serve para acordá-la.|Manchmal fällt mein Bildschirm in den Standby. Dein erster Klick weckt ihn nur auf.|A volte il mio schermo va in standby. Il tuo primo clic serve solo a svegliarlo.||有时候我的屏幕会进入待机。你的第一次点击只会把它唤醒。|가끔 제 화면이 대기 모드로 들어가요. 첫 클릭은 화면을 깨우기만 해요.|たまに私の画面はスタンバイになるんだ。最初のクリックは起こすだけだよ。|Иногда мой экран уходит в спящий режим. Первый клик его только разбудит.|Czasem mój ekran przechodzi w tryb czuwania. Pierwsze kliknięcie tylko go obudzi.","tl_bsod":"Y para acabar, un pantallazo azul. Falso, claro. Casi.|And to finish, a blue screen. A fake one, of course. Almost.|Et pour finir, un écran bleu. Un faux, bien sûr. Presque.|E para terminar, uma tela azul. Falsa, claro. Quase.|Und zum Schluss ein blauer Bildschirm. Ein falscher, natürlich. Fast.|E per finire, una schermata blu. Finta, ovviamente. Quasi.||最后来个蓝屏。当然是假的。差不多吧。|마지막으로 블루스크린이에요. 물론 가짜죠. 거의요.|最後はブルースクリーン。もちろん偽物だよ。たぶんね。|И напоследок — синий экран. Фальшивый, конечно. Почти.|A na koniec niebieski ekran. Fałszywy, oczywiście. Prawie."};
  /*T16-END*/

  /* ------------------------------------------------------------------ catalogo */
  const D = {};
  const def = (id, kind, ico, n, d, counters) => { D[id] = { id, kind, ico, n: L6(n), d: L6(d), counters: counters || [] }; };
  /* --- nombre del lugar --- */
  def("shaky", "text", "ch_shaky", "Letras temblorosas|Shaky letters|Lettres tremblantes|Letras trêmulas|Zitternde Buchstaben|Lettere tremanti||颤抖的字母|떨리는 글자|震える文字|Дрожащие буквы|Drżące litery", "El nombre baila y tiembla: cuesta leerlo.|The name dances and shakes: hard to read.|Le nom danse et tremble : difficile à lire.|O nome dança e treme: difícil de ler.|Der Name tanzt und zittert: schwer zu lesen.|Il nome balla e trema: difficile da leggere.||名字又跳又抖，很难看清。|이름이 춤추고 떨려서 읽기 어렵습니다.|名前が踊って震え、読みにくい。|Название пляшет и дрожит: его трудно прочесть.|Nazwa tańczy i drży: trudno ją przeczytać.", ["steadyhand", "spectacles"]);
  def("missing", "text", "ch_missing", "Tinta borrada|Faded ink|Encre effacée|Tinta apagada|Verblasste Tinte|Inchiostro sbiadito||褪色的墨水|바랜 잉크|かすれたインク|Выцветшие чернила|Wyblakły atrament", "Se borran letras del nombre; a más nivel, todas las vocales.|Letters fade from the name; at higher levels, every vowel.|Des lettres s'effacent du nom ; plus haut, toutes les voyelles.|Letras do nome se apagam; nos níveis altos, todas as vogais.|Buchstaben im Namen verblassen; auf höheren Stufen alle Vokale.|Lettere del nome svaniscono; ai livelli alti, tutte le vocali.||名字里的字会褪掉；等级越高，消失得越多。|이름의 글자가 지워지고, 높은 단계에서는 더 많이 사라집니다.|名前の文字が消えていく。レベルが上がるほど多く消える。|Буквы названия стираются; на высоких уровнях — все гласные.|Litery nazwy znikają; na wyższych poziomach wszystkie samogłoski.", ["dictionary", "spectacles"]);
  def("swap", "text", "ch_swap", "Letras cambiadas|Swapped letters|Lettres échangées|Letras trocadas|Vertauschte Buchstaben|Lettere scambiate||错位的字母|뒤바뀐 글자|入れ替わった文字|Переставленные буквы|Zamienione litery", "Algunas letras están intercambiadas.|Some letters are swapped around.|Certaines lettres sont échangées.|Algumas letras estão trocadas.|Manche Buchstaben sind vertauscht.|Alcune lettere sono scambiate.||有些字母互换了位置。|일부 글자의 위치가 바뀌어 있습니다.|いくつかの文字が入れ替わっている。|Некоторые буквы поменялись местами.|Niektóre litery zamieniły się miejscami.", ["spectacles", "dictionary"]);
  def("mirror", "text", "ch_mirror", "Nombre girado|Flipped name|Nom retourné|Nome virado|Gedrehter Name|Nome capovolto||翻转的名字|뒤집힌 이름|ひっくり返った名前|Перевёрнутое название|Odwrócona nazwa", "El nombre sale en espejo, boca abajo o cada palabra a su manera.|The name shows mirrored, upside down or each word its own way.|Le nom apparaît en miroir, à l'envers ou chaque mot à sa façon.|O nome aparece espelhado, de cabeça para baixo ou cada palavra do seu jeito.|Der Name erscheint gespiegelt, kopfüber oder jedes Wort anders.|Il nome appare a specchio, capovolto o ogni parola a modo suo.||名字会镜像、倒置，或者每个词各转各的。|이름이 거울처럼, 거꾸로, 또는 단어마다 제멋대로 뒤집힙니다.|名前が鏡文字、逆さま、または単語ごとにバラバラに回転する。|Название зеркальное, вверх ногами или каждое слово по-своему.|Nazwa jest w lustrze, do góry nogami albo każde słowo inaczej.", ["handmirror"]);
  def("memory", "text", "ch_memory", "Memoria de pez|Goldfish memory|Mémoire de poisson|Memória de peixe|Fischgedächtnis|Memoria di pesce||金鱼记忆|금붕어 기억력|金魚の記憶力|Память как у рыбки|Pamięć złotej rybki", "El nombre se desvanece: recuérdalo.|The name fades away: remember it.|Le nom s'efface : retiens-le.|O nome desaparece: memorize-o.|Der Name verblasst: merk ihn dir.|Il nome svanisce: ricordalo.||名字会渐渐消失：记住它。|이름이 사라집니다: 기억해두세요.|名前が消えていく：覚えておこう。|Название исчезает: запомни его.|Nazwa znika: zapamiętaj ją.", ["spectacles"]);
  def("upside", "text", "ch_upside", "Boca abajo|Upside down|La tête en bas|De cabeça para baixo|Kopfüber|Sottosopra||倒过来|거꾸로|逆さま|Вверх ногами|Do góry nogami", "El nombre está del revés.|The name is upside down.|Le nom est à l'envers.|O nome está de cabeça para baixo.|Der Name steht auf dem Kopf.|Il nome è capovolto.||名字是倒过来的。|이름이 뒤집혀 있습니다.|名前が逆さまになっている。|Название перевёрнуто.|Nazwa jest odwrócona do góry nogami.", ["handmirror"]);
  def("runes", "text", "ch_runes", "Runas|Runes|Runes|Runas|Runen|Rune||符文|룬 문자|ルーン文字|Руны|Runy", "Letras sustituidas por símbolos parecidos.|Letters swapped for look-alike symbols.|Lettres remplacées par des symboles qui leur ressemblent.|Letras trocadas por símbolos parecidos.|Buchstaben durch ähnliche Symbole ersetzt.|Lettere sostituite da simboli simili.||字母被换成了形似的符号。|글자가 비슷하게 생긴 기호로 바뀌었습니다.|文字が似た形の記号に置き換えられている。|Буквы заменены похожими символами.|Litery zastąpiono podobnymi symbolami.", ["spectacles"]);
  def("scroll", "text", "ch_scroll", "Marquesina|Ticker sign|Enseigne défilante|Letreiro|Laufschrift|Insegna scorrevole||滚动字幕|전광판|電光掲示板|Бегущая строка|Świetlna reklama", "El nombre pasa como un letrero luminoso.|The name scrolls by like a neon sign.|Le nom défile comme une enseigne lumineuse.|O nome passa como um letreiro luminoso.|Der Name läuft wie eine Leuchtschrift vorbei.|Il nome scorre come un'insegna luminosa.||名字像霓虹灯招牌一样滚动而过。|이름이 네온사인처럼 흘러갑니다.|名前がネオンサインのように流れていく。|Название проплывает, как неоновая вывеска.|Nazwa przesuwa się jak neon.", ["steadyhand"]);
  def("novowels", "text", "ch_novowels", "Sin vocales|No vowels|Sans voyelles|Sem vogais|Ohne Vokale|Senza vocali||没有元音|모음 없음|母音なし|Без гласных|Bez samogłosek", "Las vocales han desaparecido.|The vowels are gone.|Les voyelles ont disparu.|As vogais sumiram.|Die Vokale sind verschwunden.|Le vocali sono sparite.||元音全都消失了。|모음이 사라졌습니다.|母音が消えてしまった。|Гласные исчезли.|Samogłoski zniknęły.", ["dictionary"]);
  def("anagram", "text", "ch_anagram", "Letras revueltas|Scrambled letters|Lettres en vrac|Letras embaralhadas|Wirre Buchstaben|Lettere rimescolate||打乱的字母|뒤섞인 글자|ごちゃまぜの文字|Перепутанные буквы|Pomieszane litery", "Las letras del nombre cambian de sitio.|The name's letters swap places.|Les lettres du nom changent de place.|As letras do nome trocam de lugar.|Die Buchstaben des Namens tauschen die Plätze.|Le lettere del nome cambiano posto.||名字里的字母换了位置。|이름의 글자들이 자리를 바꿉니다.|名前の文字が入れ替わる。|Буквы названия меняются местами.|Litery nazwy zamieniają się miejscami.", ["dictionary"]);
  def("dance", "text", "ch_dance", "Baile de letras|Dancing letters|Lettres qui dansent|Letras dançantes|Tanzende Buchstaben|Lettere che ballano||跳舞的字母|춤추는 글자|踊る文字|Танцующие буквы|Tańczące litery", "Las letras saltan arriba y abajo.|The letters bounce up and down.|Les lettres sautent de haut en bas.|As letras pulam para cima e para baixo.|Die Buchstaben hüpfen auf und ab.|Le lettere saltellano su e giù.||字母上下跳动。|글자들이 위아래로 튑니다.|文字が上下に跳ねる。|Буквы прыгают вверх и вниз.|Litery podskakują w górę i w dół.", ["steadyhand", "spectacles"]);
  def("riddle", "text", "ch_riddle", "Adivinanza|Riddle|Devinette|Adivinha|Rätsel|Indovinello||谜语|수수께끼|なぞなぞ|Загадка|Zagadka", "En vez del nombre, una pista con el nombre tapado.|A clue with the name blanked out replaces the name.|Un indice au nom masqué remplace le nom.|Uma pista com o nome tapado substitui o nome.|Statt des Namens ein Hinweis mit verdecktem Namen.|Al posto del nome, un indizio con il nome coperto.||名字被替换成一条遮住名字的线索。|이름 대신 이름이 가려진 단서가 나옵니다.|名前の代わりに、名前を伏せたヒントが表示される。|Вместо названия — подсказка, где название скрыто.|Zamiast nazwy pojawia się wskazówka z zakrytą nazwą.", ["almanac"]);
  def("babel", "text", "ch_babel", "Torre de Babel|Tower of Babel|Tour de Babel|Torre de Babel|Turmbau zu Babel|Torre di Babele||巴别塔|바벨탑|バベルの塔|Вавилонская башня|Wieża Babel", "El nombre aparece en otro idioma.|The name appears in another language.|Le nom apparaît dans une autre langue.|O nome aparece em outro idioma.|Der Name erscheint in einer anderen Sprache.|Il nome appare in un'altra lingua.||名字以另一种语言显示。|이름이 다른 언어로 나타납니다.|名前が別の言語で表示される。|Название появляется на другом языке.|Nazwa pojawia się w innym języku.", ["dictionary"]);
  def("nocountry", "text", "t_country", "Sin país|No country|Sans pays|Sem país|Ohne Land|Senza paese||没有国家|국가 없음|国なし|Без страны|Bez kraju", "El país del lugar desaparece: solo te queda el nombre.|The place's country disappears: only the name is left.|Le pays du lieu disparaît : il ne reste que le nom.|O país do lugar desaparece: só resta o nome.|Das Land des Ortes verschwindet: nur der Name bleibt.|Il paese del luogo sparisce: resta solo il nome.||地点所属的国家消失了：只剩下名字。|장소의 국가가 사라지고 이름만 남습니다.|場所の国が消え、名前だけが残る。|Страна места исчезает: остаётся только название.|Kraj miejsca znika: zostaje tylko nazwa.", ["atlasbook"]);
  def("fakepass", "text", "ch_fakepass", "Pasaporte falso|Fake passport|Faux passeport|Passaporte falso|Gefälschter Pass|Passaporto falso||假护照|가짜 여권|偽造パスポート|Поддельный паспорт|Fałszywy paszport", "El país de debajo a veces miente: es un vecino.|The country below sometimes lies: it's a neighbor.|Le pays en dessous ment parfois : c'est un voisin.|O país de baixo às vezes mente: é um vizinho.|Das Land darunter lügt manchmal: Es ist ein Nachbar.|Il paese sotto a volte mente: è un vicino.||下面的国家有时会撒谎：其实是邻国。|아래의 국가가 가끔 거짓말을 합니다. 이웃 나라예요.|下の国名はときどき嘘をつく。隣の国だ。|Страна под названием иногда врёт: это сосед.|Kraj pod nazwą czasem kłamie: to sąsiad.", []);   // tanda 14: el pais de debajo a veces es un vecino
  def("ticker", "text", "ch_ticker", "Panel de salidas|Departures board|Tableau des départs|Painel de partidas|Abflugtafel|Tabellone delle partenze||出发航班牌|출발 전광판|出発案内板|Табло вылетов|Tablica odlotów", "Las letras del nombre giran como en un aeropuerto hasta que se fijan.|The name's letters spin like an airport board until they lock in.|Les lettres du nom tournent comme dans un aéroport jusqu'à se figer.|As letras do nome giram como num aeroporto até se fixarem.|Die Buchstaben des Namens rattern wie auf einer Flughafentafel, bis sie einrasten.|Le lettere del nome girano come in un aeroporto finché non si fermano.||名字的字母像机场信息板一样翻动，直到定格。|이름의 글자가 공항 전광판처럼 돌아가다가 하나씩 멈춥니다.|名前の文字が空港の案内板のように回り、1つずつ止まる。|Буквы названия крутятся, как на табло в аэропорту, пока не встанут на место.|Litery nazwy obracają się jak na tablicy lotniska, aż się zatrzymają.", []);   // tanda 14: panel de salidas (sustituye a la Marquesina)
  def("ctrlz", "wall", "ch_ctrlz", "Ctrl+Z|Ctrl+Z|Ctrl+Z|Ctrl+Z|Strg+Z|Ctrl+Z||Ctrl+Z|Ctrl+Z|Ctrl+Z|Ctrl+Z|Ctrl+Z", "El crupier deshace tu zoom: el mapa vuelve a la vista inicial.|The dealer undoes your zoom: the map snaps back to the starting view.|Le croupier annule ton zoom : la carte revient à la vue de départ.|O crupiê desfaz o seu zoom: o mapa volta à vista inicial.|Der Croupier macht deinen Zoom rückgängig: Die Karte springt zur Startansicht zurück.|Il croupier annulla il tuo zoom: la mappa torna alla vista iniziale.||荷官撤销了你的缩放：地图会跳回初始视角。|딜러가 확대를 취소해요. 지도가 처음 시점으로 돌아갑니다.|ディーラーがズームを取り消す：地図が最初の視点に戻る。|Крупье отменяет твой зум: карта возвращается к исходному виду.|Krupier cofa twój zoom: mapa wraca do widoku początkowego.");
  def("stormnight", "map", "ch_stormnight", "Noche de tormenta|Stormy night|Nuit d'orage|Noite de tempestade|Gewitternacht|Notte di tempesta||暴风雨之夜|폭풍우 치는 밤|嵐の夜|Грозовая ночь|Burzowa noc", "El mapa está a oscuras: solo lo ves entero cuando cae un rayo.|The map is dark: you only see it whole when lightning strikes.|La carte est dans le noir : tu ne la vois en entier que lorsque la foudre tombe.|O mapa fica às escuras: você só o vê inteiro quando cai um raio.|Die Karte liegt im Dunkeln: Nur wenn ein Blitz einschlägt, siehst du sie ganz.|La mappa è al buio: la vedi intera solo quando cade un fulmine.||地图一片漆黑：只有闪电落下时才能看清全貌。|지도가 어둠 속에 잠겨 있어요. 번개가 칠 때만 전체가 보입니다.|地図は真っ暗：雷が落ちたときだけ全体が見える。|Карта в темноте: целиком её видно только при ударе молнии.|Mapa tonie w ciemności: całą widać tylko, gdy uderza piorun.");
  def("trap", "rule", "ch_trap", "Pregunta trampa|Trick question|Question piège|Pergunta-armadilha|Fangfrage|Domanda trabocchetto||陷阱题|함정 문제|ひっかけ問題|Вопрос-ловушка|Podchwytliwe pytanie", "Una pregunta fácil se cambia por otra más dura, con el sello TRAMPA.|An easy question is swapped for a tougher one, stamped TRAP.|Une question facile est remplacée par une plus dure, tamponnée PIÈGE.|Uma pergunta fácil é trocada por outra mais difícil, com o selo ARMADILHA.|Eine leichte Frage wird gegen eine schwerere getauscht, mit dem Stempel FALLE.|Una domanda facile viene sostituita da una più dura, col timbro TRAPPOLA.||一道简单题会换成更难的题，并盖上「陷阱」印章。|쉬운 문제 하나가 더 어려운 문제로 바뀌고 '함정' 도장이 찍힙니다.|易しい問題が難しい問題にすり替わり、「ワナ」のスタンプが押される。|Лёгкий вопрос меняется на более трудный с печатью «ЛОВУШКА».|Łatwe pytanie zamienia się na trudniejsze z pieczęcią PUŁAPKA.");
  def("giants", "map", "ch_giants", "Gigantes y enanos|Giants and dwarfs|Géants et nains|Gigantes e anões|Riesen und Zwerge|Giganti e nani||巨人与矮人|거인과 난쟁이|巨人と小人|Гиганты и карлики|Giganci i karły", "Unos continentes se agigantan y otros se encogen: hay que hacer zoom.|Some continents swell and others shrink: you'll have to zoom.|Certains continents grossissent, d'autres rétrécissent : il faudra zoomer.|Alguns continentes crescem e outros encolhem: será preciso dar zoom.|Manche Kontinente werden riesig, andere winzig: Du musst zoomen.|Alcuni continenti si ingigantiscono e altri si rimpiccioliscono: dovrai fare zoom.||有些大洲变得巨大，有些缩得很小：你得缩放地图。|어떤 대륙은 거대해지고 어떤 대륙은 작아져요. 확대·축소가 필요합니다.|巨大化する大陸と縮む大陸がある：ズームが必要だ。|Одни континенты разрастаются, другие сжимаются: придётся менять масштаб.|Jedne kontynenty rosną, inne maleją: trzeba będzie zoomować.");
  /* --- mapa --- */
  def("blur", "map", "ch_blur", "Mapa borroso|Blurry map|Carte floue|Mapa desfocado|Verschwommene Karte|Mappa sfocata||模糊的地图|흐릿한 지도|ぼやけた地図|Размытая карта|Rozmyta mapa", "El mapa está desenfocado.|The map is out of focus.|La carte est floue.|O mapa está fora de foco.|Die Karte ist unscharf.|La mappa è sfocata.||地图失焦了。|지도의 초점이 맞지 않습니다.|地図のピントが合っていない。|Карта не в фокусе.|Mapa jest nieostra.", ["lens", "divingmask"]);
  def("dark", "map", "ch_dark", "Apagón|Blackout|Panne de courant|Apagão|Stromausfall|Blackout||停电|정전|停電|Отключение света|Awaria prądu", "El casino se queda a oscuras: solo ves cerca del puntero.|The casino goes dark: you only see near your pointer.|Le casino s'éteint : tu ne vois qu'autour du pointeur.|O cassino fica às escuras: só se vê perto do ponteiro.|Das Casino wird dunkel: du siehst nur um den Zeiger.|Il casinò si spegne: vedi solo vicino al puntatore.||赌场一片漆黑：你只能看到指针附近。|카지노가 어두워집니다: 포인터 주변만 보입니다.|カジノが暗くなる：ポインターの周りしか見えない。|В казино гаснет свет: видно только возле курсора.|W kasynie gaśnie światło: widzisz tylko wokół kursora.", ["miner"]);
  def("flicker", "map", "ch_flicker", "Luces parpadeantes|Flickering lights|Lumières clignotantes|Luzes piscando|Flackerndes Licht|Luci intermittenti||闪烁的灯光|깜빡이는 조명|点滅する照明|Мигающий свет|Migające światła", "Las luces se van cuando menos te lo esperas.|The lights go out when you least expect it.|Les lumières s'éteignent quand tu t'y attends le moins.|As luzes apagam quando você menos espera.|Das Licht geht aus, wenn du es am wenigsten erwartest.|Le luci si spengono quando meno te lo aspetti.||灯光总在你最意想不到的时候熄灭。|불이 가장 예상치 못한 순간에 꺼집니다.|一番油断したときに明かりが消える。|Свет гаснет, когда меньше всего ждёшь.|Światła gasną, kiedy najmniej się tego spodziewasz.", ["miner"]);
  def("wrongborders", "map", "ch_wrongborders", "Fronteras falsas|False borders|Fausses frontières|Fronteiras falsas|Falsche Grenzen|Confini falsi||虚假边界|가짜 국경|偽の国境|Ложные границы|Fałszywe granice", "Las fronteras dibujadas mienten.|The drawn borders are lying.|Les frontières dessinées mentent.|As fronteiras desenhadas mentem.|Die gezeichneten Grenzen lügen.|I confini disegnati mentono.||画出的边界是假的。|그려진 국경이 거짓말을 합니다.|描かれた国境はウソだ。|Нарисованные границы лгут.|Narysowane granice kłamią.", ["customs"]);
  def("noborders", "map", "ch_noborders", "Mapa mudo|Blank map|Carte muette|Mapa mudo|Stumme Karte|Mappa muta||空白地图|빈 지도|白地図|Немая карта|Niema mapa", "Sin fronteras ni colores de país; a tope, en negativo.|No borders or country colors; at full power, in negative.|Ni frontières ni couleurs de pays ; à fond, en négatif.|Sem fronteiras nem cores de país; no máximo, em negativo.|Keine Grenzen, keine Länderfarben; voll aufgedreht als Negativ.|Niente confini né colori dei paesi; al massimo, in negativo.||没有边界，也没有国家的颜色；最高等级时变成负片。|국경도 국가 색도 없고, 최고 단계에선 네거티브가 됩니다.|国境も国の色もない。最高レベルではネガになる。|Ни границ, ни цветов стран; на максимуме — негатив.|Bez granic i kolorów krajów; na maksa w negatywie.", ["customs"]);
  def("pangea", "map", "ch_pangea", "Pangea|Pangaea|Pangée|Pangeia|Pangaea|Pangea||盘古大陆|판게아|パンゲア|Пангея|Pangea", "Los continentes se han unido en un solo supercontinente, como hace 250 millones de años.|The continents have merged into one supercontinent, like 250 million years ago.|Les continents se sont réunis en un seul supercontinent, comme il y a 250 millions d'années.|Os continentes se uniram num único supercontinente, como há 250 milhões de anos.|Die Kontinente sind zu einem Superkontinent verschmolzen, wie vor 250 Millionen Jahren.|I continenti si sono uniti in un unico supercontinente, come 250 milioni di anni fa.||各大洲合并成了一个超大陆，就像 2.5 亿年前那样。|2억 5천만 년 전처럼 대륙들이 하나의 초대륙으로 합쳐졌습니다.|2億5千万年前のように、大陸が一つの超大陸に合体した。|Континенты слились в один суперконтинент, как 250 миллионов лет назад.|Kontynenty połączyły się w jeden superkontynent, jak 250 milionów lat temu.", ["plates"]);
  def("deal", "map", "ch_deal", "Continentes barajados|Shuffled continents|Continents mélangés|Continentes embaralhados|Gemischte Kontinente|Continenti mescolati||洗乱的大洲|섞인 대륙|シャッフルされた大陸|Перетасованные континенты|Potasowane kontynenty", "El crupier ha barajado los continentes y los ha repartido sobre la mesa.|The dealer has shuffled the continents and dealt them across the table.|Le croupier a mélangé les continents et les a distribués sur la table.|O crupiê embaralhou os continentes e os distribuiu pela mesa.|Der Croupier hat die Kontinente gemischt und auf dem Tisch ausgeteilt.|Il croupier ha mescolato i continenti e li ha distribuiti sul tavolo.||荷官把各大洲洗乱，再发到了牌桌上。|딜러가 대륙들을 섞어서 테이블 위에 나눠 놓았습니다.|ディーラーが大陸をシャッフルして、テーブルに配った。|Крупье перетасовал континенты и разложил их по столу.|Krupier potasował kontynenty i rozłożył je na stole.", ["plates"]);
  def("spread", "map", "ch_spread", "Big bang|Big bang|Big bang|Big bang|Urknall|Big bang||大爆炸|빅뱅|ビッグバン|Большой взрыв|Wielki wybuch", "Los continentes se separan, se juntan en uno o se barajan.|The continents drift apart, merge into one or get shuffled.|Les continents s'écartent, fusionnent en un seul ou se mélangent.|Os continentes se afastam, se juntam num só ou se embaralham.|Die Kontinente driften auseinander, verschmelzen zu einem oder werden gemischt.|I continenti si allontanano, si fondono in uno o si mescolano.||各大洲会分开、合成一块，或者被洗乱。|대륙들이 흩어지거나, 하나로 합쳐지거나, 뒤섞입니다.|大陸が離れたり、ひとつに合体したり、シャッフルされたりする。|Континенты расходятся, сливаются в один или перемешиваются.|Kontynenty rozjeżdżają się, łączą w jeden albo się tasują.", ["plates"]);
  def("tilt", "map", "ch_tilt", "Continentes torcidos|Crooked continents|Continents de travers|Continentes tortos|Schiefe Kontinente|Continenti storti||歪斜的大洲|비뚤어진 대륙|傾いた大陸|Кривые континенты|Krzywe kontynenty", "Cada continente está girado.|Every continent is turned.|Chaque continent est tourné.|Cada continente está girado.|Jeder Kontinent ist gedreht.|Ogni continente è ruotato.||每个大洲都被旋转了。|모든 대륙이 회전되어 있습니다.|すべての大陸が回転している。|Каждый континент повёрнут.|Każdy kontynent jest obrócony.", ["plates"]);
  def("flip", "map", "ch_flip", "Mundo del revés|Upside-down world|Monde à l'envers|Mundo de cabeça para baixo|Welt auf dem Kopf|Mondo capovolto||颠倒的世界|뒤집힌 세계|逆さまの世界|Мир вверх ногами|Świat do góry nogami", "El mapa se da la vuelta: el Sur arriba, en espejo o las dos cosas.|The map turns over: South up, mirrored or both.|La carte se retourne : le Sud en haut, en miroir ou les deux.|O mapa vira: o Sul em cima, espelhado ou as duas coisas.|Die Karte dreht sich: Süden oben, gespiegelt oder beides.|La mappa si ribalta: il Sud in alto, a specchio o tutte e due.||地图翻了过来：南方朝上、左右镜像，或者两者都有。|지도가 뒤집힙니다: 남쪽이 위로, 거울처럼, 또는 둘 다.|地図がひっくり返る。南が上、鏡写し、またはその両方。|Карта переворачивается: юг наверху, зеркально или и то и другое.|Mapa się odwraca: południe na górze, w lustrze albo jedno i drugie.", ["handmirror"]);
  def("mirrorx", "map", "ch_mirrorx", "Espejo del mapa|Mirror map|Carte miroir|Mapa espelhado|Spiegelkarte|Mappa a specchio||镜像地图|거울 지도|鏡の地図|Зеркальная карта|Lustrzana mapa", "Este y Oeste están intercambiados.|East and West are swapped.|L'Est et l'Ouest sont échangés.|Leste e Oeste estão trocados.|Ost und West sind vertauscht.|Est e Ovest sono scambiati.||东西颠倒了。|동쪽과 서쪽이 바뀌었습니다.|東と西が入れ替わっている。|Восток и запад поменялись местами.|Wschód i zachód zamieniły się miejscami.", ["handmirror"]);
  def("spin", "map", "ch_spin", "Ruleta|Roulette|Roulette|Roleta|Roulette|Roulette||轮盘|룰렛|ルーレット|Рулетка|Ruletka", "El mapa gira despacio.|The map slowly spins.|La carte tourne lentement.|O mapa gira devagar.|Die Karte dreht sich langsam.|La mappa gira lentamente.||地图在缓慢旋转。|지도가 천천히 회전합니다.|地図がゆっくり回転する。|Карта медленно вращается.|Mapa powoli się kręci.", ["shockabsorber"]);
  def("clouds", "map", "ch_clouds", "Humo de sala|Smoky room|Salle enfumée|Sala esfumaçada|Verrauchter Saal|Sala fumosa||烟雾弥漫的房间|연기 자욱한 방|煙だらけの部屋|Прокуренный зал|Zadymiona sala", "El humo tapa el mapa: apártalo con el ratón.|Smoke covers the map: sweep it away with your mouse.|La fumée cache la carte : chasse-la avec ta souris.|A fumaça cobre o mapa: afaste-a com o mouse.|Rauch verdeckt die Karte: Wisch ihn mit der Maus weg.|Il fumo copre la mappa: scaccialo con il mouse.||烟雾遮住了地图：用鼠标把它拨开。|연기가 지도를 가립니다: 마우스로 걷어내세요.|煙が地図を覆う。マウスで払いのけよう。|Дым закрывает карту: разгони его мышью.|Dym zasłania mapę: rozgoń go myszą.", ["umbrella"]);
  def("rain", "map", "ch_rain", "Lluvia|Rain|Pluie|Chuva|Regen|Pioggia||雨|비|雨|Дождь|Deszcz", "La lluvia empaña el mapa: agita el ratón para limpiarla.|Rain fogs up the map: shake your mouse to wipe it.|La pluie embue la carte : secoue ta souris pour l'essuyer.|A chuva embaça o mapa: sacuda o mouse para limpar.|Regen beschlägt die Karte: Schüttel die Maus, um sie abzuwischen.|La pioggia appanna la mappa: scuoti il mouse per pulirla.||雨水让地图变得模糊：晃动鼠标把它擦干净。|비가 지도를 흐리게 합니다: 마우스를 흔들어 닦아내세요.|雨で地図が曇る。マウスを振って拭き取ろう。|Дождь заливает карту: встряхни мышь, чтобы протереть её.|Deszcz zamazuje mapę: potrząśnij myszą, by ją przetrzeć.", ["umbrella"]);
  def("myopia", "map", "ch_myopia", "Miopía|Nearsighted|Myopie|Miopia|Kurzsichtig|Miopia||近视|근시|近視|Близорукость|Krótkowzroczność", "Todo se ve nítido menos donde apuntas.|Everything is sharp except where you aim.|Tout est net sauf là où tu vises.|Tudo fica nítido menos onde você mira.|Alles ist scharf, außer wo du zielst.|Tutto è nitido tranne dove miri.||除了你瞄准的地方，其他都很清晰。|조준하는 곳만 빼고 모든 것이 선명합니다.|狙っている場所以外はすべてくっきり見える。|Всё чётко, кроме того места, куда ты целишься.|Wszystko jest ostre oprócz miejsca, w które celujesz.", ["divingmask"]);
  def("blindspot", "map", "ch_blindspot", "Punto ciego|Blind spot|Angle mort|Ponto cego|Blinder Fleck|Punto cieco||盲点|사각지대|死角|Слепое пятно|Martwe pole", "Un círculo negro tapa donde apuntas.|A black circle hides where you aim.|Un cercle noir cache ta visée.|Um círculo preto esconde onde você mira.|Ein schwarzer Kreis verdeckt dein Ziel.|Un cerchio nero copre dove miri.||一个黑圈遮住了你瞄准的地方。|검은 원이 조준하는 곳을 가립니다.|黒い円が狙っている場所を隠す。|Чёрный круг закрывает место прицела.|Czarne koło zasłania miejsce, w które celujesz.", ["divingmask"]);
  def("mosaic", "map", "ch_mosaic", "Píxeles gordos|Chunky pixels|Gros pixels|Pixels gordos|Grobe Pixel|Pixel giganti||粗大像素|큼직한 픽셀|粗いピクセル|Крупные пиксели|Grube piksele", "El mapa se ve a muy baja resolución.|The map is shown in very low resolution.|La carte est en très basse résolution.|O mapa aparece em baixíssima resolução.|Die Karte hat eine sehr niedrige Auflösung.|La mappa è a bassissima risoluzione.||地图以极低的分辨率显示。|지도가 매우 낮은 해상도로 표시됩니다.|地図がとても低い解像度で表示される。|Карта показана в очень низком разрешении.|Mapa jest w bardzo niskiej rozdzielczości.", ["lens"]);
  def("negative", "map", "ch_negative", "Negativo|Negative|Négatif|Negativo|Negativ|Negativo||负片|네거티브|ネガ|Негатив|Negatyw", "Los colores están invertidos.|The colors are inverted.|Les couleurs sont inversées.|As cores estão invertidas.|Die Farben sind invertiert.|I colori sono invertiti.||颜色被反转了。|색이 반전되어 있습니다.|色が反転している。|Цвета инвертированы.|Kolory są odwrócone.", ["customs"]);
  def("quake", "map", "ch_quake", "Terremoto|Earthquake|Tremblement de terre|Terremoto|Erdbeben|Terremoto||地震|지진|地震|Землетрясение|Trzęsienie ziemi", "El mapa se desliza solo y tiembla.|The map slides on its own and shakes.|La carte glisse toute seule et tremble.|O mapa desliza sozinho e treme.|Die Karte gleitet von allein und bebt.|La mappa scivola da sola e trema.||地图会自己滑动，还会摇晃。|지도가 저절로 미끄러지고 흔들립니다.|地図がひとりでに滑り、揺れる。|Карта сама сползает и трясётся.|Mapa sama się przesuwa i trzęsie.", ["shockabsorber"]);
  def("drift", "map", "ch_drift", "Deriva|Drift|Dérive|Deriva|Abdrift|Deriva||漂移|표류|漂流|Дрейф|Dryf", "El mapa se desliza solo.|The map slides on its own.|La carte glisse toute seule.|O mapa desliza sozinho.|Die Karte gleitet von allein.|La mappa scivola da sola.||地图会自己滑动。|지도가 저절로 미끄러집니다.|地図がひとりでに滑っていく。|Карта сама сползает.|Mapa sama się przesuwa.", ["shockabsorber"]);
  def("decoys", "map", "ch_decoys", "Chinchetas trampa|Decoy pins|Épingles leurres|Pinos falsos|Lockvogel-Pins|Pin esca|Chinches trampa|诱饵图钉|가짜 핀|おとりピン|Ложные булавки|Fałszywe pinezki", "Llueven chinchetas falsas por todo el mapa.|Fake pins rain down all over the map.|De fausses épingles pleuvent sur toute la carte.|Chovem pinos falsos por todo o mapa.|Falsche Pins regnen über die ganze Karte.|Piovono pin falsi su tutta la mappa.|Llueven chinches falsas por todo el mapa.|假图钉像雨点一样落满地图。|가짜 핀이 지도 곳곳에 비처럼 쏟아집니다.|偽のピンが地図じゅうに降ってくる。|По всей карте сыплются фальшивые булавки.|Na całą mapę spadają fałszywe pinezki.", ["customs"]);
  def("lightning", "map", "ch_lightning", "Rayos|Lightning|Éclairs|Raios|Blitze|Fulmini||闪电|번개|稲妻|Молния|Błyskawica", "Rayos que ciegan y dejan una sombra donde caen.|Lightning that blinds and leaves a shadow where it strikes.|Des éclairs qui aveuglent et laissent une ombre là où ils tombent.|Raios que cegam e deixam uma sombra onde caem.|Blitze, die blenden und einen Schatten hinterlassen, wo sie einschlagen.|Fulmini che accecano e lasciano un'ombra dove cadono.||闪电让人目眩，还会在落点留下一片阴影。|번개가 눈을 멀게 하고 떨어진 자리에 그림자를 남깁니다.|目をくらませる稲妻。落ちた場所に影が残る。|Молнии слепят и оставляют тень там, куда ударили.|Błyskawice oślepiają i zostawiają cień tam, gdzie uderzą.", ["umbrella"]);
  /* --- puntero --- */
  def("tremble", "ptr", "ch_tremble", "Pulso|Shaky hand|Main tremblante|Mão trêmula|Zittrige Hand|Mano tremante||手抖|떨리는 손|震える手|Дрожащая рука|Drżąca ręka", "Tu puntero tiembla y da vueltas, y el clic también.|Your pointer shakes and circles, and so does your click.|Ton pointeur tremble et tourne, et ton clic aussi.|Seu ponteiro treme e gira, e o clique também.|Dein Zeiger zittert und kreist, und dein Klick auch.|Il puntatore trema e gira, e anche il clic.||你的指针又抖又转，点击也一样。|포인터가 떨리고 빙글빙글 돌고, 클릭도 그렇습니다.|ポインターが震えて回り、クリックもぶれる。|Курсор дрожит и кружит, а с ним и клик.|Kursor drży i krąży, a z nim twoje kliknięcie.", ["steadyhand"]);
  def("blink", "ptr", "ch_blink", "Cursor parpadeante|Blinking cursor|Curseur clignotant|Cursor piscante|Blinkender Zeiger|Cursore lampeggiante||闪烁的光标|깜빡이는 커서|点滅するカーソル|Мигающий курсор|Migający kursor", "El puntero parpadea y se apaga a ratos.|The pointer blinks on and off.|Le pointeur clignote.|O ponteiro pisca e apaga.|Der Zeiger blinkt.|Il puntatore lampeggia.||指针时隐时现。|포인터가 깜빡입니다.|ポインターが点いたり消えたりする。|Курсор то появляется, то пропадает.|Kursor miga.", ["gamer"]);
  def("ghost", "ptr", "ch_ghost", "Cursor fantasma|Ghost cursor|Curseur fantôme|Cursor fantasma|Geisterzeiger|Cursore fantasma||幽灵光标|유령 커서|幽霊カーソル|Курсор-призрак|Kursor widmo", "El puntero desaparece y parpadea como un neón.|The pointer vanishes and flickers like neon.|Le pointeur disparaît et clignote comme un néon.|O ponteiro some e pisca como um neon.|Der Zeiger verschwindet und flackert wie Neon.|Il puntatore sparisce e lampeggia come un neon.||指针会消失，还会像霓虹灯一样闪烁。|포인터가 사라지고 네온처럼 깜빡입니다.|ポインターが消え、ネオンのように点滅する。|Курсор исчезает и мигает, как неон.|Kursor znika i miga jak neon.", ["spareeye"]);
  def("cblur", "ptr", "ch_cblur", "Cursor borroso|Blurry cursor|Curseur flou|Cursor borrado|Verschwommener Zeiger|Cursore sfocato||模糊的光标|흐릿한 커서|ぼやけたカーソル|Размытый курсор|Rozmyty kursor", "El puntero se ve desenfocado.|The pointer looks out of focus.|Le pointeur est flou.|O ponteiro fica desfocado.|Der Zeiger ist unscharf.|Il puntatore è sfocato.||指针看起来失焦了。|포인터가 초점이 맞지 않아 보입니다.|ポインターのピントがずれている。|Курсор выглядит размытым.|Kursor jest nieostry.", ["divingmask"]);
  def("lag", "ptr", "ch_lag", "Cursor con retraso|Laggy cursor|Curseur en retard|Cursor com atraso|Verzögerter Zeiger|Cursore in ritardo||延迟的光标|느린 커서|遅れるカーソル|Запаздывающий курсор|Spóźniony kursor", "El puntero va con retraso.|The pointer lags behind.|Le pointeur est en retard.|O ponteiro anda atrasado.|Der Zeiger hinkt hinterher.|Il puntatore è in ritardo.||指针跟不上你的动作。|포인터가 뒤처집니다.|ポインターが遅れてついてくる。|Курсор отстаёт.|Kursor nie nadąża.", ["gamer"]);
  def("cmirror", "ptr", "ch_cmirror", "Controles invertidos|Reversed controls|Commandes inversées|Controles invertidos|Umgekehrte Steuerung|Comandi invertiti||反向操作|반전된 조작|逆操作|Обратное управление|Odwrócone sterowanie", "El puntero se mueve al revés.|The pointer moves the opposite way.|Le pointeur bouge à l'envers.|O ponteiro se move ao contrário.|Der Zeiger bewegt sich verkehrt herum.|Il puntatore si muove al contrario.||指针朝相反方向移动。|포인터가 반대 방향으로 움직입니다.|ポインターが逆方向に動く。|Курсор движется в обратную сторону.|Kursor porusza się w przeciwną stronę.", ["handmirror"]);
  def("dizzy", "ptr", "ch_dizzy", "Mareo|Dizzy|Vertige|Tontura|Schwindel|Capogiro||眩晕|어지러움|めまい|Головокружение|Zawrót głowy", "El puntero da vueltas a tu alrededor.|The pointer circles around you.|Le pointeur tourne autour de toi.|O ponteiro gira ao seu redor.|Der Zeiger kreist um dich.|Il puntatore ti gira intorno.||指针绕着你打转。|포인터가 빙글빙글 돕니다.|ポインターがぐるぐる回る。|Курсор кружит вокруг тебя.|Kursor krąży wokół ciebie.", ["steadyhand"]);
  /* --- reglas --- */
  def("wind", "rule", "wind", "Vendaval|Gale|Rafale|Vendaval|Sturm|Bufera||狂风|질풍|疾風|Шквал|Wichura", "El viento desvía tu pin.|The wind pushes your pin.|Le vent dévie ton épingle.|O vento desvia seu pino.|Der Wind lenkt deinen Pin ab.|Il vento sposta il tuo pin.||风会推动你的图钉。|바람이 핀을 밀어냅니다.|風がピンを押し流す。|Ветер сдувает твою булавку.|Wiatr spycha twoją pinezkę.", ["weathervane"]);
  def("storm", "rule", "storm", "Contrarreloj|Against the clock|Contre la montre|Contra o relógio|Gegen die Uhr|Contro il tempo||争分夺秒|시간과의 싸움|時間との勝負|Наперегонки со временем|Wyścig z czasem", "Tienes menos tiempo en cada pregunta.|You get less time for every question.|Tu as moins de temps à chaque question.|Você tem menos tempo em cada pergunta.|Du hast für jede Frage weniger Zeit.|Hai meno tempo per ogni domanda.||每道题的时间都变少了。|문제마다 시간이 줄어듭니다.|各問の時間が短くなる。|На каждый вопрос меньше времени.|Na każde pytanie masz mniej czasu.", ["earplugs"]);
  def("silence", "rule", "silence", "Silencio|Silence|Silence|Silêncio|Stille|Silenzio||沉默|침묵|静寂|Тишина|Cisza", "Tus herramientas no funcionan.|Your tools don't work.|Tes outils ne marchent pas.|Suas ferramentas não funcionam.|Deine Werkzeuge funktionieren nicht.|I tuoi strumenti non funzionano.||你的工具无法使用。|도구를 사용할 수 없습니다.|道具が使えない。|Твои инструменты не работают.|Twoje narzędzia nie działają.", ["earplugs"]);
  /* --- cuarta pared: el crupier sale del juego y se mete en TU pantalla (v0.33) --- */
  def("crack", "wall", "ch_crack", "Cristal roto|Cracked screen|Écran fissuré|Tela rachada|Gesprungener Bildschirm|Schermo incrinato||屏幕碎裂|깨진 화면|割れた画面|Треснувший экран|Pęknięty ekran", "El crupier golpea y pringa tu pantalla: mueve o acerca el mapa para ver bajo las grietas.|The dealer punches and smears your screen: move or zoom the map to see under the cracks.|Le croupier frappe et graisse ton écran : déplace ou zoome la carte pour voir sous les fissures.|O crupiê soca e lambuza a sua tela: mova ou aproxime o mapa para ver sob as rachaduras.|Der Croupier schlägt und verschmiert deinen Bildschirm: Verschieb oder zoom die Karte, um unter die Risse zu sehen.|Il croupier colpisce e unge il tuo schermo: sposta o ingrandisci la mappa per vedere sotto le crepe.||荷官砸裂又弄脏了你的屏幕：移动或缩放地图，看看裂缝下面。|딜러가 화면을 내리치고 더럽힙니다: 지도를 움직이거나 확대해 금 아래를 보세요.|ディーラーが画面を殴って汚す。地図を動かしたり拡大したりして、ひびの下を見よう。|Крупье бьёт и пачкает твой экран: двигай или приближай карту, чтобы заглянуть под трещины.|Krupier uderza i brudzi twój ekran: przesuń lub przybliż mapę, by zajrzeć pod pęknięcia.", ["protector"]);
  def("smudge", "wall", "ch_smudge", "Pantalla sucia|Greasy screen|Écran gras|Tela engordurada|Fettiger Bildschirm|Schermo unto||油腻的屏幕|기름 묻은 화면|脂っぽい画面|Жирный экран|Tłusty ekran", "Huellas de dedos grasientos emborronan zonas del mapa.|Greasy fingerprints smear parts of the map.|Des traces de doigts gras brouillent des zones de la carte.|Marcas de dedos engordurados borram partes do mapa.|Fettige Fingerabdrücke verschmieren Teile der Karte.|Impronte di dita unte offuscano zone della mappa.||油腻的指纹把地图的部分区域弄模糊了。|기름진 지문이 지도 일부를 번지게 합니다.|脂ぎった指紋が地図のあちこちをにじませる。|Жирные отпечатки пальцев размазывают части карты.|Tłuste odciski palców rozmazują fragmenty mapy.", ["protector", "divingmask"]);
  def("hang", "wall", "ch_hang", "No responde|Not responding|Ne répond pas|Não está respondendo|Reagiert nicht|Non risponde||无响应|응답 없음|応答なし|Не отвечает|Nie odpowiada", "Ventanas de error falsas tapan el mapa: ciérralas para seguir.|Fake error windows cover the map: close them to carry on.|De fausses fenêtres d'erreur cachent la carte : ferme-les pour continuer.|Janelas de erro falsas cobrem o mapa: feche-as para continuar.|Falsche Fehlerfenster verdecken die Karte: Schließ sie, um weiterzumachen.|Finte finestre di errore coprono la mappa: chiudile per continuare.||虚假的错误窗口挡住了地图：关掉它们才能继续。|가짜 오류 창이 지도를 가립니다: 닫아야 계속할 수 있습니다.|偽のエラーウィンドウが地図を隠す：閉じて先へ進もう。|Фальшивые окна ошибок закрывают карту: закрой их, чтобы продолжить.|Fałszywe okna błędów zasłaniają mapę: zamknij je, by grać dalej.", ["taskmgr"]);
  def("battery", "wall", "ch_battery", "Batería baja|Low battery|Batterie faible|Bateria fraca|Akku schwach|Batteria scarica||电量不足|배터리 부족|バッテリー残量低下|Низкий заряд|Słaba bateria", "Tu pantalla se queda sin batería mientras piensas.|Your screen runs out of battery while you think.|Ton écran tombe à court de batterie pendant que tu réfléchis.|Sua tela fica sem bateria enquanto você pensa.|Deinem Bildschirm geht der Akku aus, während du nachdenkst.|Il tuo schermo resta senza batteria mentre pensi.||你思考的时候，屏幕电量正在耗尽。|생각하는 동안 화면 배터리가 바닥납니다.|考えている間に画面のバッテリーが切れていく。|Пока ты думаешь, у экрана садится батарея.|Gdy się zastanawiasz, ekranowi kończy się bateria.", ["powerbank"]);
  /* --- banderas (solo en la ronda de banderas) --- */
  def("flaginvert", "flag", "ch_negative", "Colores invertidos|Inverted colors|Couleurs inversées|Cores invertidas|Invertierte Farben|Colori invertiti||反色|색 반전|色反転|Инвертированные цвета|Odwrócone kolory", "La bandera se ve en negativo.|The flag looks like a photo negative.|Le drapeau apparaît en négatif.|A bandeira aparece em negativo.|Die Flagge erscheint als Negativ.|La bandiera appare in negativo.||国旗看起来像照片底片。|국기가 사진 필름처럼 보입니다.|国旗が写真のネガのように見える。|Флаг выглядит как фотонегатив.|Flaga wygląda jak negatyw zdjęcia.", ["customs"]);
  def("flaghue", "flag", "ch_flaghue", "Luces de neón|Neon lights|Néons|Luzes neon|Neonlicht|Luci al neon||霓虹灯|네온 조명|ネオンライト|Неоновые огни|Neony", "Las luces del casino cambian los colores de la bandera.|The casino lights shift the flag's colors.|Les néons du casino changent les couleurs du drapeau.|As luzes do cassino mudam as cores da bandeira.|Die Casino-Lichter verändern die Farben der Flagge.|Le luci del casinò cambiano i colori della bandiera.||赌场的灯光改变了国旗的颜色。|카지노 조명이 국기의 색을 바꿉니다.|カジノの照明が国旗の色を変えてしまう。|Огни казино искажают цвета флага.|Światła kasyna zmieniają kolory flagi.", ["lens"]);
  def("flagblur", "flag", "ch_blur", "Bandera borrosa|Blurry flag|Drapeau flou|Bandeira desfocada|Unscharfe Flagge|Bandiera sfocata||模糊的国旗|흐릿한 국기|ぼやけた国旗|Размытый флаг|Rozmyta flaga", "La bandera está desenfocada.|The flag is out of focus.|Le drapeau est flou.|A bandeira está desfocada.|Die Flagge ist unscharf.|La bandiera è sfocata.||国旗失焦了。|국기의 초점이 맞지 않습니다.|国旗のピントが合っていない。|Флаг не в фокусе.|Flaga jest nieostra.", ["divingmask"]);
  def("flagdark", "flag", "ch_dark", "Bandera a oscuras|Flag in the dark|Drapeau dans le noir|Bandeira no escuro|Flagge im Dunkeln|Bandiera al buio||黑暗中的国旗|어둠 속의 국기|暗闇の国旗|Флаг в темноте|Flaga w ciemności", "La bandera casi no se distingue en la penumbra.|The flag is barely visible in the dim light.|Le drapeau se distingue à peine dans la pénombre.|A bandeira quase não se distingue na penumbra.|Die Flagge ist im Dämmerlicht kaum zu erkennen.|La bandiera si distingue a malapena nella penombra.||昏暗中几乎看不清国旗。|어두운 조명 속에서 국기가 거의 보이지 않습니다.|薄明かりの中で国旗がほとんど見えない。|В тусклом свете флаг едва виден.|W półmroku flagę ledwo widać.", ["miner"]);
  def("flaggray", "flag", "ch_flaggray", "Bandera desteñida|Faded flag|Drapeau délavé|Bandeira desbotada|Verblasste Flagge|Bandiera sbiadita||褪色的国旗|바랜 국기|色あせた国旗|Выцветший флаг|Wyblakła flaga", "La bandera pierde sus colores; a tope, en negativo.|The flag loses its colors; at full power, in negative.|Le drapeau perd ses couleurs ; à fond, en négatif.|A bandeira perde as cores; no máximo, em negativo.|Die Flagge verliert ihre Farben; voll aufgedreht als Negativ.|La bandiera perde i colori; al massimo, in negativo.||国旗失去了颜色；最高等级时变成负片。|국기가 색을 잃고, 최고 단계에선 네거티브가 됩니다.|国旗の色が抜ける。最高レベルではネガになる。|Флаг теряет цвета; на максимуме — негатив.|Flaga traci kolory; na maksa w negatywie.", ["lens"]);
  def("flagback", "flag", "ch_flagback", "Bandera de espaldas|Flag from behind|Drapeau vu de dos|Bandeira de costas|Flagge von hinten|Bandiera di spalle||背面的旗帜|뒷면의 국기|裏返しの国旗|Флаг с изнанки|Flaga od tyłu", "La bandera se ve por detrás; un sello dice cómo está girada.|You see the flag from behind; a stamp tells how it's turned.|On voit le drapeau de dos ; un tampon dit comment il est tourné.|A bandeira aparece de trás; um selo diz como está girada.|Die Flagge ist von hinten zu sehen; ein Stempel zeigt, wie sie gedreht ist.|La bandiera si vede da dietro; un timbro dice come è girata.||旗帜是从背面看的；印章会告诉你它是怎么转的。|국기를 뒤에서 본 모습이에요. 도장이 어떻게 돌았는지 알려줍니다.|国旗を裏から見ている。スタンプが向きを教えてくれる。|Флаг виден с обратной стороны; печать показывает, как он повёрнут.|Flaga widoczna od tyłu; pieczątka mówi, jak jest obrócona.", []);   // tanda 14
  def("flagpuzzle", "flag", "ch_flagpuzzle", "Bandera a trozos|Flag puzzle|Drapeau en puzzle|Bandeira em pedaços|Flaggen-Puzzle|Bandiera a pezzi||拼图国旗|조각난 국기|バラバラの国旗|Флаг-пазл|Flaga w kawałkach", "La bandera está troceada y desordenada. Cada 3 s, un trozo vuelve a su sitio.|The flag is cut up and shuffled. Every 3 s, a piece goes back.|Le drapeau est découpé et mélangé. Toutes les 3 s, un morceau revient.|A bandeira está cortada e embaralhada. A cada 3 s, um pedaço volta ao lugar.|Die Flagge ist zerschnitten und vertauscht. Alle 3 s kehrt ein Teil zurück.|La bandiera è tagliata e mescolata. Ogni 3 s un pezzo torna al suo posto.||旗帜被切开并打乱。每 3 秒，一块会回到原位。|국기가 조각나 섞여 있어요. 3초마다 한 조각이 제자리로 돌아옵니다.|国旗がバラバラに切られて混ざっている。3秒ごとに1枚が元の位置に戻る。|Флаг разрезан и перемешан. Каждые 3 с один кусочек встаёт на место.|Flaga jest pocięta i pomieszana. Co 3 s jeden kawałek wraca na miejsce.", []);
  def("flagwind", "flag", "ch_flagwind", "Bandera al viento|Flag in the wind|Drapeau au vent|Bandeira ao vento|Flagge im Wind|Bandiera al vento||迎风的旗帜|바람에 날리는 국기|風になびく国旗|Флаг на ветру|Flaga na wietrze", "La bandera ondea con el viento y los pliegues la esconden a ratos.|The flag flaps in the wind, and its folds hide parts of it.|Le drapeau flotte au vent et ses plis en cachent des parties.|A bandeira ondula ao vento e as dobras escondem partes dela.|Die Flagge flattert im Wind, und Falten verdecken Teile.|La bandiera sventola al vento e le pieghe ne nascondono delle parti.||旗帜在风中飘动，褶皱会遮住一部分。|국기가 바람에 펄럭이며 주름이 일부를 가립니다.|国旗が風にはためき、しわが一部を隠す。|Флаг развевается на ветру, а складки скрывают его части.|Flaga powiewa na wietrze, a fałdy zasłaniają jej części.", []);
  /* --- tanda 16: retos que solo existen dentro de un jefe (siesta, salvapantallas y pantallazo azul): no salen en el sorteo --- */
  def("siesta", "wall", "ch_siesta", T16.ch_siesta_n, T16.ch_siesta_d);
  def("screensaver", "wall", "ch_screensaver", T16.ch_ss_n, T16.ch_ss_d);
  def("bsod", "wall", "ch_bsod", T16.ch_bsod_n, T16.ch_bsod_d);
  D.siesta.boss = D.screensaver.boss = D.bsod.boss = true;
  A.CHAL = D;
  /* tanda 3: FAMILIAS de sensacion (lo que contesta un amuleto). Lo que estorba se conjura: LETRAS, LUZ, VISTA, SITIO, PUNTERO y PANTALLA tienen
     un amuleto cada una. Lo que miente o calla se vence sabiendo (SABER, MENTIRAS), la tormenta se sufre (TORMENTA) y las reglas de la casa se
     sobornan o se aguantan (REGLAS). counters (tienda, intro y aviso de contra) sale de aqui, y desde la tanda 6b tambien el sorteo (famOf) */
  const FAMC = {
    shaky: "letras", missing: "letras", anagram: "letras", runes: "letras", mirror: "letras", memory: "letras", flagpuzzle: "letras",
    riddle: "saber", nocountry: "saber", babel: "saber", ticker: "saber",
    dark: "luz", battery: "luz", flagdark: "luz", siesta: "luz",
    flicker: "tormenta", lightning: "tormenta", stormnight: "tormenta",
    blur: "vista", myopia: "vista", mosaic: "vista", clouds: "vista", rain: "vista", flagblur: "vista", flagwind: "vista",
    spread: "sitio", tilt: "sitio", flip: "sitio", spin: "sitio", quake: "sitio", flagback: "sitio", giants: "sitio",
    tremble: "puntero", ghost: "puntero", lag: "puntero", cmirror: "puntero",
    crack: "pantalla", hang: "pantalla", ctrlz: "pantalla", screensaver: "pantalla", bsod: "pantalla",
    wrongborders: "mentiras", noborders: "mentiras", decoys: "mentiras", flaghue: "mentiras", flaggray: "mentiras", fakepass: "mentiras",
    wind: "reglas", storm: "reglas", silence: "reglas", trap: "reglas",
  };
  const AMULET = { letras: "dictionary", luz: "miner", vista: "divingmask", sitio: "plates", puntero: "steadyhand", pantalla: "protector" };
  /* tanda 6: FUSIONES. Los retos gemelos se funden en uno con tres niveles que se notan; los absorbidos (SUB) quedan como efectos internos: ya no
     salen en el sorteo ni tienen ficha. EXPAND dice que efectos de verdad pone cada reto en cada nivel (a veces los de sus gemelos de antes) */
  const SUB = { dance: "shaky", novowels: "missing", swap: "anagram", upside: "mirror", negative: "noborders", mirrorx: "flip", blindspot: "myopia", drift: "quake", dizzy: "tremble", blink: "ghost", cblur: "ghost", smudge: "crack", flaginvert: "flaggray", pangea: "spread", deal: "spread", scroll: "shaky" };
  for (const id in SUB) D[id].sub = SUB[id];
  for (const id in D) { D[id].fam = FAMC[id] || FAMC[SUB[id]] || "reglas"; D[id].counters = AMULET[D[id].fam] ? [AMULET[D[id].fam]] : []; }
  const EXPAND = {
    shaky: [[["dance", 3], ["shaky", 1]], [["shaky", 2], ["dance", 1]], [["shaky", 3], ["dance", 3]]],   // tanda 8: bailan y tiemblan desde el nivel 1; a tope, se dispersan y vuelven
    missing: [[["missing", 1]], [["novowels", 1]], [["novowels", 1], ["missing", 1]]],           // 1/3 de las letras / sin vocales / sin vocales y sin 1/3 de las consonantes
    anagram: [[["swap", 2]], [["anagram", 2]], [["anagram", 3]]],                               // 2 parejas / el interior barajado / todo salvo la 1.a, tambien en palabras de 3
    mirror: [[["mirror", 1]], [["upside", 1]], [["mirror", 3]]],                                // espejo / boca abajo / cada palabra a su manera
    noborders: [[["noborders", 1]], [["noborders", 2]], [["noborders", 3], ["negative", 1]]],    // sin fronteras / y de un color / y en negativo
    flaggray: [[["flaggray", 1]], [["flaggray", 2]], [["flaggray", 3], ["flaginvert", 1]]],      // casi gris / gris / negativo en gris
    myopia: [[["myopia", 1]], [["myopia", 2]], [["myopia", 3], ["blindspot", 2]]],               // 120 / 150 / 190 px con el punto negro
    flip: [[["flip", 1]], [["mirrorx", 1]], [["flip", 3]]],                                     // el Sur arriba / espejo / las dos cosas
    quake: [[["drift", 2]], [["quake", 2]], [["quake", 3], ["drift", 1]]],                       // se desliza / sacudidas / sacudidas y deriva
    tremble: [[["dizzy", 1]], [["tremble", 2]], [["tremble", 3], ["dizzy", 2]]],                 // gira 12 px / salta 10 / salta 12 y gira 14
    ghost: [[["ghost", 1]], [["blink", 2]], [["blink", 2], ["ghost", 3], ["cblur", 2]]],         // 1 s de cada 5 / neon / neon, desapariciones y vision doble
    crack: [[["crack", 1], ["smudge", 1]], [["crack", 2], ["smudge", 1]], [["crack", 3], ["smudge", 2]]],   // tanda 7: golpes desde el nivel 1 (1 / 2 / 3), con huellas
    spread: [[["spread", 2]], [["pangea", 2]], [["deal", 3]]],                                  // Big bang: se separan / Pangea / barajados
  };
  const MISSING_CJK = [[["missing", 1]], [["missing", 2]], [["missing", 3]]];                    // en chino, japones y coreano no hay vocales: la mitad y dos tercios
  const lvOf = c => clamp(c.lv || 1, 1, 3);
  const expand = list => list.flatMap(c => { const e = c.id === "missing" && NOLATIN() ? MISSING_CJK : EXPAND[c.id]; return e ? e[lvOf(c) - 1].map(([id, lv]) => ({ id, lv, of: c.id })) : [c]; });
  /* partidas guardadas y combinaciones de jefe con ids de antes: el reto que los absorbe (con su forma si la combinacion vive de ella) */
  const FORCE = { pangea: 2, deal: 3, mirrorx: 2, negative: 3, flaginvert: 3 };
  const canon = c => (D[c.id] && D[c.id].sub ? { ...c, id: D[c.id].sub, lv: FORCE[c.id] || c.lv } : c);
  /* la frase del crupier de cada forma (Big bang a nivel 2 es Pangea): el primer efecto, si es de un gemelo de antes */
  const formOf = c => { const e = expand([canon(c)])[0]; return e && e.id !== c.id && D[e.id] && D[e.id].sub ? e.id : null; };

  const KIND = k => Object.keys(D).filter(id => D[id].kind === k && !D[id].sub && !D[id].boss);   // tanda 6: los absorbidos no salen en el sorteo
  const TEXT = KIND("text"), MAPC = KIND("map"), PTR = KIND("ptr"), RULE = KIND("rule"), FLAG = KIND("flag"), WALL = KIND("wall");
  /* v0.29: "Continentes barajados" ocupa en el sorteo el sitio exacto del antiguo "Continentes cambiados" (tras Pangea): cada semilla vuelve a sacar
     los retos de siempre y donde salia aquel sale este (entre la v0.23 y la v0.28 esas rondas sorteaban otro) */
  const MAPD = [...MAPC, ...WALL];
  /* en una misma ronda no se juntan retos "de la misma familia" */
  /* tanda 6b: en una ronda no se juntan dos retos de la misma familia (las de js/challenges.js FAMC: letras, saber, luz, tormenta, vista, sitio,
     puntero, pantalla, mentiras y reglas) */
  const famOf = id => (D[id] && D[id].fam) || id;
  const NOLATIN = () => /^(zh|ja|ko)/.test(A.lang || "");                     // runas y sin vocales no tienen sentido con nombres en chino, japones o coreano
  /* tanda 6b: la LISTA SUAVE de R1-R3 (a nivel 1): estorban sin desorientar. Fuera: Controles invertidos, Mundo del reves, las reglas, lo que
     calla la placa y el Apagon (que solo sale una vez, en R5, R6, R9, R10 u R11). En la ronda de banderas, un reto de bandera */
  const SOFT = ["shaky", "missing", "noborders", "flicker", "decoys", "blur", "clouds", "rain", "spread", "lag", "crack", "flaghue", "flagblur", "flagdark", "flaggray", "flagback", "flagpuzzle", "flagwind", "ticker"];
  /* retos por ronda fuera de los jefes en A0 (27 por expedicion con los de los jefes: R4 2, R8 3, R12 3). R1 sin reto en tu primera expedicion */
  const COUNT = [1, 1, 1, 0, 2, 2, 3, 0, 3, 3, 3, 0];
  /* parejas que no se juntan en una ronda: las ventanas de No responde y la Bateria baja te hacen perder el nombre de Memoria de pez sin culpa tuya */
  const CLASH = { memory: ["hang", "battery"], hang: ["memory"], battery: ["memory"] };
  const clashes = (id, ids) => (CLASH[id] || []).some(x => ids.includes(x));
  /* reglas: salen de una bolsa por expedicion (las tres barajadas; ninguna se repite hasta que han salido todas, ni en el cambio de bolsa) */
  const ruleBag = (seed, i) => { let bag = null, prev = null; for (let j = 0; j <= Math.floor(i / RULE.length); j++) { bag = A.rng(`${seed}:rules:${j}`).shuffle(RULE); if (bag[0] === prev) [bag[0], bag[1]] = [bag[1], bag[0]]; prev = bag[RULE.length - 1]; } return bag[i % RULE.length]; };
  /* jefes por acto. Acto II: solo combinaciones sin retos de texto (su jefe es la ronda de banderas, donde el texto no hace nada: Mala vision, Noche
     cerrada y Sin pasaporte no salian nunca en la Aventura; en el Reto diario, que baraja la ruta, si podian salir). Acto III: "Sin pasaporte"
     (antes Torre de Babel, que se llamaba igual que su reto y traia runas, que no hacen nada en chino, japones y coreano).
     v0.52: Baraja revuelta trae Luces parpadeantes en vez del Apagon (el Apagon sale una vez por expedicion) */
  const BOSS = [
    [["El Apagón|The Blackout|La panne|O Apagão|Der Stromausfall|Il Blackout||大停电|대정전|大停電|Великое затмение|Wielka ciemność", ["dark","flicker"], "blackout"], ["Mareo de casino|Casino dizziness|Vertige de casino|Tontura de cassino|Casino-Schwindel|Capogiro da casinò||赌场眩晕|카지노 현기증|カジノのめまい|Казино-головокружение|Kasynowy zawrót głowy", ["dizzy","shaky"], "dizzy"], ["Un solo continente|One continent|Un seul continent|Um só continente|Ein Kontinent|Un solo continente||一块大陆|하나의 대륙|ひとつの大陸|Один континент|Jeden kontynent", ["pangea","swap"], "onecont"], ["Ronda ciega|Blind round|Manche aveugle|Rodada cega|Blinde Runde|Round cieco||盲眼回合|블라인드 라운드|ブラインドラウンド|Слепой раунд|Runda na ślepo", ["blur","missing"], "blind"],
     ["Noche cerrada|Dead of night|Nuit noire|Noite fechada|Tiefste Nacht|Notte fonda||深夜|한밤중|真夜中|Глухая ночь|Głucha noc", ["stormnight","shaky"], "nightfall"], [T16.n_siesta, ["siesta"], "siesta"]],
    [["Falsa alarma|False alarm|Fausse alerte|Falso alarme|Fehlalarm|Falso allarme||虚惊一场|거짓 경보|誤報|Ложная тревога|Fałszywy alarm", ["spread","wrongborders"], "falsealarm"], ["Terremoto en la sala|Quake in the hall|Séisme dans la salle|Terremoto no salão|Beben im Saal|Terremoto in sala||大厅地震|홀의 지진|ホールの地震|Землетрясение в зале|Trzęsienie na sali", ["quake","decoys"], "quakehall"], ["Rompe la cuarta pared|Breaking the fourth wall|Briser le quatrième mur|Quebrando a quarta parede|Die vierte Wand durchbrechen|Rompere la quarta parete||打破第四面墙|제4의 벽 깨기|第四の壁を破れ|Ломая четвёртую стену|Przełamując czwartą ścianę", ["crack","hang"], "fourthwall"]],
    [["El gran espejo|The great mirror|Le grand miroir|O grande espelho|Der große Spiegel|Il grande specchio||巨镜|거대한 거울|大いなる鏡|Великое зеркало|Wielkie lustro", ["flip","cmirror","blur"], "mirror"], ["Baraja revuelta|Shuffled deck|Jeu mélangé|Baralho embaralhado|Gemischtes Deck|Mazzo mescolato||洗乱的牌组|섞인 덱|シャッフルされたデッキ|Перетасованная колода|Potasowana talia", ["deal","flicker","missing"], "shuffled"], [T16.n_dirty, ["wrongborders","flicker","storm"], "dirty"], ["Tormenta perfecta|Perfect storm|Tempête parfaite|Tempestade perfeita|Perfekter Sturm|Tempesta perfetta||完美风暴|퍼펙트 스톰|パーフェクト・ストーム|Идеальный шторм|Sztorm doskonały", ["rain","lightning","stormnight"], "perfect"],
     ["Pantallazo|System crash|Plantage total|Pane geral|Systemabsturz|Crash di sistema||系统崩溃|시스템 다운|システムクラッシュ|Системный сбой|Awaria systemu", ["battery","hang","flicker"], "crash"], ["Sin pasaporte|No passport|Sans passeport|Sem passaporte|Ohne Pass|Senza passaporto||没有护照|여권 없음|パスポートなし|Без паспорта|Bez paszportu", ["babel","nocountry","mosaic"], "nopass"], [T16.n_duel, [], "duel"]],
  ].map(a => a.map(c => ({ n: L6(c[0]), ids: c[1], k: c[2], d: L6(T16["d_" + c[2]] || "") })));
  /* jefe de la ronda de banderas: la bandera trae su propio filtro y el mapa se lia por su cuenta (tanda 16: Bandera al reves del mundo ya no invierte colores; El coleccionista) */
  const FLAG_BOSS = [["Bandera en la niebla|Flag in the fog|Drapeau dans le brouillard|Bandeira na neblina|Flagge im Nebel|Bandiera nella nebbia||雾中的国旗|안개 속의 국기|霧の中の国旗|Флаг в тумане|Flaga we mgle", ["flagdark","clouds"], "flagfog"], ["Bandera al revés del mundo|Upside-down world flag|Drapeau à l'envers du monde|Bandeira do mundo ao contrário|Flagge der verkehrten Welt|Bandiera del mondo capovolto||颠倒世界的国旗|뒤집힌 세계의 국기|逆さま世界の国旗|Флаг перевёрнутого мира|Flaga świata do góry nogami", ["flagback","flip"], "flagworld"], ["Neón de fronteras falsas|Neon false borders|Néons aux fausses frontières|Neon de fronteiras falsas|Neon an falschen Grenzen|Neon a confini falsi||霓虹假边界|네온 가짜 국경|ネオンの偽国境|Неоновые ложные границы|Neonowe fałszywe granice", ["flaghue","wrongborders"], "flagneon"], ["Bandera pixelada|Pixelated flag|Drapeau pixelisé|Bandeira pixelada|Verpixelte Flagge|Bandiera pixelata||像素化的国旗|픽셀화된 국기|ピクセル化した国旗|Пиксельный флаг|Spikselowana flaga", ["flagblur","mosaic"], "flagpix"], ["Cine mudo|Silent movie|Cinéma muet|Cinema mudo|Stummfilm|Cinema muto||默片|무성 영화|サイレント映画|Немое кино|Kino nieme", ["flaggray","noborders"], "flagmute"]].map(c => ({ n: L6(c[0]), ids: c[1], k: c[2], d: L6(T16["d_" + c[2]] || "") }));
  /* tanda 17: PERILLAS de medicion (dev/bot.js las cambia con CFG.knobs). Fijadas con el bot: ruleSwap = la regla de A2 ocupa el sitio de un reto (no se suma), provAt = la Ascension desde la que se pierde una provision (la 4, no la 3). Probadas y no aplicadas: Acto III +5 %, Guardarrachas a 1 fallo, Segunda bola a 1 tiro, +1 provision y R5-R6 suaves en la primera expedicion */
  A.KN = Object.assign({ ruleSwap: 1, provAt: 4 }, A.KN || {});
  const A2R = [4, 6, 8, 10];                                          // tanda 3: la regla de Ascension 2 sale en R5, R7, R9 y R11 (sin Tapones, ya no tiene contra)
  /* tanda 6b: sorteo con peso. Familia: 1/(1 + veces que ya ha salido en la expedicion), LUZ a la mitad (el Apagon obligatorio cuenta como suya);
     reto: 1/(1 + veces que ha salido ese reto). Las veces salen del plan BASE (la semilla de la expedicion, sin barajar ni nada comprado) */
  const wpick = (rr, items, w) => { const ws = items.map(w), t = ws.reduce((a, b) => a + b, 0); let x = rr() * t; for (let k = 0; k < items.length; k++) { x -= ws[k]; if (x <= 0) return items[k]; } return items[items.length - 1]; };
  const famW = (H, f) => (f === "luz" ? 0.5 : 1) / (1 + (H.fam[f] || 0));
  const draw = (rr, pool, H) => { const fams = [...new Set(pool.map(famOf))], f = wpick(rr, fams, x => famW(H, x)); return wpick(rr, pool.filter(x => famOf(x) === f), x => 1 / (1 + (H.id[x] || 0))); };
  const darkRound = base => A.rng(`${base}:dark`).pick([4, 5, 8, 9, 10]);
  const tally = lists => { const fam = {}, id = {}; lists.forEach(l => l.forEach(c => { const f = famOf(c.id); fam[f] = (fam[f] || 0) + 1; id[c.id] = (id[c.id] || 0) + 1; })); return { fam, id }; };
  /* historial del plan base (memo por semilla, Ascension, idioma, temas de la ruta y primera expedicion) */
  const HIST = new Map();
  function baseHist(base, asc, cjk, topics, first, r) {
    const T = Array.from({ length: Math.max(12, r + 1) }, (_, x) => { try { return topics(x); } catch (e) { return undefined; } }), key = [base, asc, cjk ? 1 : 0, first ? 1 : 0, T.join(",")].join("|");
    let h = HIST.get(key); if (!h) { h = []; HIST.set(key, h); if (HIST.size > 8) HIST.delete(HIST.keys().next().value); }
    while (h.length < r) h.push(planCore(base, h.length, asc, T[h.length], cjk, { base, first, H: tally(h) }).list);
    return tally(h.slice(0, r));
  }
  /* ------------------------------------------------------------------ plan (determinista por semilla y ronda) */

  /* el plan de una ronda (determinista por semilla y ronda); ctx.H: lo que ya ha salido en las rondas de antes del plan base */
  /* tanda 16: la Rueda de la fortuna (un reto fijo a nivel 2 y cinco familias distintas a nivel 3, una por pregunta, que la rueda va sacando) y El
     coleccionista (Fronteras falsas fijas y los cinco trucos de bandera en orden sorteado). Entradas con wh = la pregunta en la que salen; hid = boca abajo en el Campamento */
  const WHEEL_FAMS = ["letras", "saber", "luz", "tormenta", "vista", "sitio", "puntero", "pantalla", "mentiras"], NOWHEEL = ["trap", "storm", "wind", "silence"];
  function wheelList(seed, act, lv, noop, flagRound, H) {
    const rr = A.rng(`${seed}:wheel:${act}`), cand = f => Object.keys(D).filter(id => D[id].fam === f && !D[id].sub && !D[id].boss && !NOWHEEL.includes(id) && !noop(id) && (D[id].kind === "flag" ? flagRound : true) && !(D[id].kind === "text" && flagRound));
    const w1 = x => 1 / (1 + ((H && H.id && H.id[x]) || 0)), plain = id => ["map", "ptr", "wall"].includes(D[id].kind), fams = rr.shuffle(WHEEL_FAMS.filter(f => cand(f).length));
    const fixedF = fams.find(f => cand(f).some(plain)), rest = fams.filter(f => f !== fixedF).slice(0, 5), out = []; let fixed = null;
    if (fixedF) { fixed = wpick(rr, cand(fixedF).filter(plain), w1); out.push({ id: fixed, lv: Math.min(lv, 2), lv0: Math.min(lv, 2) }); }
    rest.forEach((f, i) => { const ok = cand(f).filter(id => !(fixed && (clashes(id, [fixed]) || clashes(fixed, [id])))); out.push({ id: wpick(rr, ok.length ? ok : cand(f), w1), lv, lv0: lv, bx: 1, wh: i, hid: 1 }); });
    return out;
  }
  function collectorList(seed, act, lv) {
    const rr = A.rng(`${seed}:coll:${act}`), order = rr.shuffle(["flaggray", "flagback", "flagpuzzle", "flagwind", "flagdark"]);
    return [{ id: "wrongborders", lv, lv0: lv, bx: 1 }].concat(order.map((id, i) => ({ id, lv, lv0: lv, bx: 1, wh: i, hid: 1 })));
  }
  function planCore(seed, r, asc, topic, cjk, ctx) {
    const flagRound = topic === "flag";
    const act = Math.floor(r / 4), pos = r % 4, boss = pos === 3, a = Math.min(act, 2);
    const lv = clamp(a + 1 + (asc >= 3 ? 1 : 0), 1, 3);
    let list = [], combo = null;
    /* trucos que en esta ronda no harian nada (texto en la de banderas, Sin pais o Adivinanza sin pais ni nota debajo, runas y sin vocales en zh/ja/ko):
       si el sorteo cae en uno, se sortea otro. Lo que ya salia bien no cambia (partidas guardadas y sobornos intactos). v0.52: tambien en los jefes
       y en el poder extra de la Ascension 4. Babel donde el nombre no cambia se resuelve pregunta a pregunta (ver babelAlt) */
    const useless = id => (flagRound && !!D[id] && D[id].kind === "text") || ((topic === "country" || topic === "clue") && id === "nocountry") || (topic === "clue" && id === "riddle");
    const noop = id => useless(id) || (cjk && (id === "runes" || id === "novowels" || id === "ticker")) || ((topic === "country" || topic === "clue") && id === "fakepass") || (topic === "clue" && id === "ticker") || (id === "fakepass" && asc >= 5 && act >= 2);
    if (boss) {
      /* v0.7.1: el jefe de una ronda de banderas (la 8 de la Aventura) ya no es siempre de banderas: la semilla sortea entre los de banderas y los
         del acto que sirven en esa ronda (sin trucos de texto: la bandera manda), cada combinacion con la misma probabilidad. Los jefes que no
         cambian de ronda salen igual que antes (misma semilla y misma lista), y si sale uno de banderas es el mismo de siempre.
         v0.2.43 (usuario): toda ronda de banderas lleva su reto de bandera. La mezcla solo se hace en el acto II, donde el jefe trae un tercer reto y
         ese es SIEMPRE de bandera si la combinacion no lo es; en otro acto (la ruta barajada del Reto diario) el jefe de banderas es de banderas.
         La Rueda de la fortuna y El coleccionista (un reto sorteado por pregunta, con su ruleta y su album) ya no salen en el sorteo: sus piezas
         (wheelList, collectorList, BX.wheel, BX.collector y lo de js/jefes.js) siguen ahi por si se quieren recuperar */
      const normal = BOSS[a].filter(c => !c.ids.some(noop)), flags = FLAG_BOSS.filter(c => !c.ids.some(noop)), rb = A.rng(`${seed}:boss:${act}`);
      if (flagRound) combo = act === 1 && normal.length && A.rng(`${seed}:bossmix:${act}`)() < normal.length / (flags.length + normal.length) ? rb.pick(normal) : rb.pick(flags);
      else combo = rb.pick(normal.length ? normal : BOSS[a]);
      if (ctx.force) combo = [...BOSS[a], ...FLAG_BOSS].find(c => c.k === ctx.force) || combo;   // pruebas: A.adv._forceBoss
      list = combo.ids.map((id, i) => { const c = canon({ id, lv: clamp(lv + (i === 0 ? 1 : 0), 1, 3) }); return { ...c, lv0: c.lv, bx: 1 }; }).filter(c => !noop(c.id));
      if (combo.k === "wheel") list = wheelList(seed, act, lv, noop, flagRound, ctx.H); else if (combo.k === "collector") list = collectorList(seed, act, lv);
      else if (combo.k === "duel") { const rr = A.rng(`${seed}:duel:${act}`), ids = [], fams = new Set(), POOLD = [...TEXT, ...MAPD, ...PTR, ...FLAG].filter(id => id !== "dark" && !noop(id)); list = []; let flagN = 0; while (list.length < 2) { const needFlag = flagRound && !flagN, pool = POOLD.filter(id => !clashes(id, ids) && !fams.has(famOf(id)) && (D[id].kind === "flag" ? needFlag : !needFlag) && !(D[id].kind === "text" && flagRound)); if (!pool.length) break; const id = draw(rr, pool, ctx.H); list.push(canon({ id, lv: 3, lv0: 3 })); ids.push(id); fams.add(famOf(id)); if (D[id].kind === "flag") flagN++; } }   // Duelo con la banca: dos retos a nivel 3 del sorteo de siempre
        // tanda 6: Un solo continente es Big bang a nivel 2 (Pangea), Baraja revuelta a nivel 3...   // por si ninguna combinacion sirve: nunca un reto que no hace nada
      if (act === 1 && combo.k !== "collector") {                                                            // tanda 6b: el jefe de R8 trae tres ingredientes (su combinacion y uno mas)
          const fs = new Set(list.map(c => famOf(c.id))), ids = list.map(c => c.id), flagIn = list.some(c => D[c.id].kind === "flag"), txt = list.some(c => D[c.id].kind === "text");
          const needFlag = flagRound && !flagIn;                                                              // v0.2.43: en la ronda de banderas, si la combinacion no trae reto de bandera, el tercero lo es
          const pool = [...TEXT, ...MAPD, ...PTR, ...FLAG].filter(id => id !== "dark" && !noop(id) && !fs.has(famOf(id)) && !clashes(id, ids) && (D[id].kind === "flag" ? needFlag : !needFlag) && !(D[id].kind === "text" && (flagRound || txt)));
          if (pool.length) list.push({ id: draw(A.rng(`${seed}:boss3:${act}`), pool, ctx.H), lv });
        }
        if (act >= 3) { const rr = A.rng(`${seed}:legend:${r}`), all = rr.shuffle([...TEXT, ...MAPD, ...PTR, ...RULE]).filter(id => !noop(id)); combo = { n: L6("La apuesta final|The final bet|La mise finale|A aposta final|Der letzte Einsatz|La puntata finale||最后的赌注|마지막 베팅|最後の賭け|Последняя ставка|Ostatni zakład"), ids: [] }; list = []; const fam = new Set(); for (const id of all) { const f = famOf(id); if (fam.has(f)) continue; fam.add(f); list.push({ id, lv: 3 }); combo.ids.push(id); if (list.length === 4) break; } }
      if (asc >= 4 && act < 3) {                                                  // Ascension 4: el jefe trae un poder extra de otra familia (ni el Apagon ni una pareja que choque)
        const fam = new Set(list.map(x => famOf(x.id))), ids = list.map(x => x.id), pool = [...TEXT, ...MAPD, ...PTR].filter(id => !fam.has(famOf(id))), bad = x => noop(x) || x === "dark" || clashes(x, ids) || (D[x].kind === "text" && list.some(c => D[c.id].kind === "text"));
        if (pool.length) { const rb = A.rng(`${seed}:boss2:${act}`); let id = rb.pick(pool); if (bad(id)) { const ok = pool.filter(x => !bad(x)); if (ok.length) id = rb.pick(ok); } list.push({ id, lv, x4: 1 }); }   // x4: el reto extra de Ascension 4 (cede ante los sellados: nunca mas de 5, ver chalFor)
      }
      return { list, boss, combo };
    }
      const H = ctx.H, POOL = [...TEXT, ...MAPD, ...PTR, ...RULE, ...FLAG], soft = act === 0, a2 = asc >= 2 && A2R.includes(r);
      const ids = [], fams = new Set(); let placa = false, flagN = 0;
      const put = id => { list.push({ id, lv: soft ? clamp(1 + (asc >= 3 ? 1 : 0), 1, 3) : lv }); ids.push(id); fams.add(famOf(id)); if (D[id].kind === "text") placa = true; if (D[id].kind === "flag") flagN++; };
      /* el Apagon, una vez por expedicion (asi el Foco siempre tiene su momento); si barajas esa ronda, el crupier saca otra cosa (pagaste por ello) */
      if (seed === ctx.base && r === darkRound(ctx.base)) put("dark");
      const KN = A.KN || {};   // PERILLAS de medicion (tanda 17): A.KN la rellena dev/bot.js (CFG.knobs); sin ella, el juego normal
      const n = Math.max(0, (ctx.first && r === 0 ? 0 : COUNT[r] != null ? COUNT[r] : 3) - (a2 && KN.ruleSwap ? 1 : 0));   // A2: la regla ocupa el sitio de un reto
      const rr = A.rng(`${seed}:fam:${r}`);
      while (list.length < n) {
        const needFlag = flagRound && !flagN;                          // ronda de banderas: su primer reto va sobre la bandera
        const pool = POOL.filter(id => id !== "dark" && !noop(id) && !clashes(id, ids) && !fams.has(famOf(id)) && (!soft || SOFT.includes(id))
          && (D[id].kind === "flag" ? needFlag : !needFlag) && !(D[id].kind === "text" && (flagRound || placa)) && !(D[id].kind === "rule" && a2));
        if (!pool.length) break;
        put(draw(rr, pool, H));
      }
      if (a2) { let ruleN = 0; for (let x = 0; x < r; x++) if (A2R.includes(x)) ruleN++; put(ruleBag(ctx.base || seed, ruleN)); }   // Ascension 2: la regla de la bolsa (de la semilla de la expedicion: barajar no la cambia ni repite una)
      return { list, boss, combo };
    }
  A.chal = {
    DEFS: D, TEXT, MAPC, PTR, RULE, FLAG, WALL, noLatin: NOLATIN, FAMC, AMULET, SUB, EXPAND, expand, canon, formOf,
    /* cjk: sin runas ni sin vocales. v0.4.1: la expedicion lo fija al empezar (run.cjk); con el idioma de cada momento, cambiarlo a media
       expedicion cambiaba el truco de texto de la ronda y el soborno ya pagado dejaba de coincidir con nada */
    /* tanda 6b: opt = { base: semilla de la expedicion sin barajar, topics: x -> tema de la ronda x, first: primera expedicion (R1 sin reto) } */
    plan(seed, r, asc = 0, topic, cjk = NOLATIN(), opt = {}) {
      const base = opt.base || seed, first = !!opt.first, H = baseHist(base, asc, cjk, opt.topics || (() => undefined), first, r);
      return planCore(seed, r, asc, topic, cjk, { base, first, H, force: opt.force });
    },
    info: id => D[id],
    /* v0.35: la ficha ya no dice que perk frena el reto (ni brilla por ello): el jugador tiene que leer y atar cabos */
    /* v0.52: durante una pregunta en la que la Torre de Babel no puede cambiar el nombre, su ficha ensena el reto que sale en su lugar (y por que) */
    NEW_TAG: L6("Nuevo|New|Nouveau|Novo|Neu|Nuovo||初登场|첫 등장|初登場|Новинка|Nowość"),
    chip(c, small) { if (c.hid && !c.up && !S.on) return `<span class="ch-chip k-rule ch-hid${small ? " sm" : ""}" data-tt="${A.tx(L6(T16.ui_faceDown))}">${A.icon("boss_hat", "sm")}<b>?</b></span>`; const sub = S.on && S.qsub && S.qsub.of === c.id ? S.qsub : null, s = sub || c, d = D[s.id]; if (!d) return ""; return `<span class="ch-chip k-${d.kind}${small ? " sm" : ""}${sub ? " ch-sub" : ""}${c.calm ? " ch-calm" : ""}${c.sealed ? " ch-sealed" + (c.sealBy ? " seal-" + c.sealBy : "") : ""}${c.tw ? " tw" : ""}" data-ch="${s.id}" data-of="${c.id}" data-tt="${(A.tx(d.n) + " — " + A.tx(d.d) + (sub ? "\n" + A.tx(BABEL_NOTE) : "")).replace(/"/g, "&quot;")}">${A.icon(d.ico, "sm")}<b>${A.tx(d.n)}</b>${c.isNew ? `<span class="ch-new">${A.tx(A.chal.NEW_TAG)}</span>` : ""}<i class="ch-lv">${"●".repeat(s.lv || 1)}</i>${c.amu ? `<i class="ch-amu${c.amuWait ? " wait" : ""}" data-amu="${c.amu}">${A.icon(c.amuIco, "sm")}</i>` : ""}</span>`; },
  };

  /* ------------------------------------------------------------------ mitigaciones (suma de los `fx` de las reliquias) */
  A.chal.fx = perks => {
    const fx = { textShakeMul: 1, ptrShakeMul: 1, ptrBlurMul: 1, glassBlurMul: 1, batteryMul: 1, unmirrorText: false, unmirrorMap: false, unmirrorPtr: false, shakeMul: 1, textMul: 1, colorMul: 1, blurMul: 1, plateMul: 1, blackoutMul: 1, cloudMul: 1, focusMul: 1, lagMul: 1, quakeMul: 1, mosaicMul: 1, rainMul: 1, ghostMul: 1, darkR: 1, darkDim: 0, lensR: 0, trueR: 0, peekR: 0, missingRate: 0, unswapMs: 0, decodeMs: 0, riddleMs: 0, unmirror: false, keepName: false, halo: false, flickerWarn: false, windPreview: false, windMul: 1, coords: false, guides: false, mag: false, country: false, thermo: false, beacon: false, noBabel: false, noMarquee: false, noNegative: false, noFlash: false, trapGhost: false, cloudClear: 0, glassMul: 1, hangAuto: 0, ids: perks.map(p => p.id) };
    for (const p of perks) {
      const f = p.fx; if (!f) continue;
      for (const k in f) {
        if (/Mul$/.test(k)) fx[k] *= f[k];
        else if (k === "missingRate") fx[k] += f[k];
        else if (k === "unswapMs" || k === "decodeMs" || k === "riddleMs") fx[k] = fx[k] ? Math.min(fx[k], f[k]) : f[k];
        else if (typeof f[k] === "number") fx[k] = Math.max(fx[k], f[k]);
        else fx[k] = fx[k] || f[k];
      }
    }
    fx.ids = perks.map(p => p.id);                                   // tus reliquias: el aviso de contra (counterFx) las busca aqui (sin esto no sonaba nunca)
    return fx;
  };

  /* ------------------------------------------------------------------ estado y capas */
  const S = A.chal.state = { list: [], pub: [], fx: A.chal.fx([]), halve: 1, on: false, suspended: false, timers: [], ov: null, map: null, px: { x: innerWidth / 2, y: innerHeight / 2 } };
  const say = (k, ...a) => { try { A.sfx[k] && A.sfx[k](...a); } catch (e) { /* audio no listo */ } };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); S.timers.push(t); return t; };
  const clearTimers = () => { S.timers.forEach(clearTimeout); S.timers = []; };
  const phaseOk = () => { const g = A.core && A.core.S; return g && g.phase === "asking" && !g.paused; };
  const lvi = c => clamp((c.lv || 1) - 1, 0, 2);
  /* tanda 6: niveles reales (los de los retos fundidos salen de EXPAND: cada efecto con su nivel) */
  /* tanda 16: V(tabla, i) = el valor del nivel i (0 = nivel 1) con i fraccionario: interpola entre niveles (los jefes suben de tono pregunta a pregunta) */
  const V = (arr, i) => { const n = arr.length - 1, x = Math.max(0, Math.min(n, i)), k = Math.floor(x), f = x - k; if (!f) return arr[k]; const p = arr[k], q = arr[Math.min(n, k + 1)]; return Array.isArray(p) ? p.map((v, z) => v + (q[z] - v) * f) : typeof p === "number" ? p + (q - p) * f : f < 0.5 ? p : q; };
  const par0 = c => { const i = lvi(c), h = S.halve, fx = S.fx; switch (c.id) {
    case "shaky": return { amp: V([2.4, 4.4, 6.2], i) * Math.max(0.1, fx.textShakeMul * fx.textMul) * h };            // Mano de crupier: 75 % menos de verdad (antes el suelo 0,35 lo dejaba en 65 %)
    case "dance": return { amp: V([0.18, 0.3, 0.42], i) * Math.max(0.1, fx.textShakeMul * fx.textMul) * h };
    case "missing": return { frac: V([0.34, 0.5, 0.65], i) * fx.textMul * h };
    case "swap": return { pairs: V([1, 2, 3], i) * fx.textMul * h };                                       // con decimales: la Visera deja media pareja de media (antes redondeaba 0,5 a 1 y en nivel 1 no hacia nada)
    case "runes": return { frac: V([0.55, 0.75, 0.95], i) * fx.textMul * h };   // tanda 8: mas letras cambiadas
    case "memory": return { ms: V([3000, 2000, 1400], i) / Math.max(0.3, fx.textMul * h) };
    case "blur": return { px: V([4.5, 7, 10], i) * fx.blurMul * h };
    case "dark": return { r: V([230, 170, 120], i) * fx.darkR / Math.max(0.5, h), a: V([0.975, 0.988, 0.997], i) * (1 - fx.darkDim) };
    case "flicker": return { iv: V([[4, 6], [2.5, 4], [1.5, 3]], i), len: V([250, 450, 700], i) * fx.blackoutMul * h };   // tanda 6: mas cortes
    case "lightning": return { iv: V([[3.5, 4.5], [2.2, 2.8], [1.3, 1.7]], i), shade: V([800, 1100, 1400], i) };   // tanda 6: un rayo cada 4 / 2,5 / 1,5 s
    case "wrongborders": return { amp: V([0.014, 0.024, 0.038], i) * h };
    case "pangea": return { k: V([0.6, 0.8, 1], i) * fx.plateMul * h };                    // v0.48: antes 0,9/0,95/1 y los niveles 2 y 3 salian casi iguales
    case "deal": return { k: V([0.6, 0.85, 1], i) * fx.plateMul * h };                      // < 0,7: una pareja; < 0,95: cuatro; si no, los seis en la mesa (el Nivel de crupier deja una pareja)
    case "spread": return { k: V([0.5, 0.8, 1], i) * fx.plateMul * h };
    case "tilt": return { k: V([0.4, 0.65, 0.9], i) * fx.plateMul * h };
    case "clouds": return { cover: V([0.3, 0.42, 0.55], i) * fx.cloudMul * h };   // tanda 7: mas humo (y se barre con el raton)
    case "rain": return { dens: V([0.45, 0.75, 1], i) * fx.rainMul * fx.cloudMul * h };
    case "myopia": return { r: V([120, 150, 190], i) * fx.focusMul * h };
    case "blindspot": return { r: V([60, 85, 115], i) * fx.focusMul * h };
    case "mosaic": return { res: clamp(V([0.11, 0.08, 0.06], i) + (1 - fx.mosaicMul) * 0.16, 0.05, 0.4) };
    case "quake": return { px: V([3, 6, 8], i) * fx.quakeMul * h };
    case "drift": return { px: V([22, 36, 54], i) * fx.quakeMul * h };
    case "spin": return { amp: V([0.28, 0.45, 0.7], i) * fx.quakeMul * h };
    case "decoys": return { n: V([30, 52, 80], i) };   // tanda 7: llueven del cielo (v0.2.16: muchas mas, antes 8 / 14 / 22)
    case "tremble": return { px: V([7, 10, 12], i) * fx.ptrShakeMul * h };
    case "blink": return { period: V([0.55, 0.42, 0.3], i), duty: 0.45 };
    case "ghost": return { every: V([5, 4.2, 4], i), off: V([1, 1.4, 1.5], i) * fx.ghostMul };
    case "cblur": return { px: V([3, 5, 8], i) * fx.ptrBlurMul * h };
    case "lag": return { tau: V([140, 240, 320], i) * fx.lagMul * h, step: fx.lagMul < 0.5 ? 0 : V([0, 60, 100], i) };   // tanda 8: a nivel 2 y 3 el reticulo va a saltos (como una conexion mala)
    case "cmirror": return { x: (c.lv || 1) !== 2, y: (c.lv || 1) >= 2 };   // izquierda y derecha / arriba y abajo / los dos ejes
    case "dizzy": return { r: V([12, 14, 32], i) * fx.ptrShakeMul * h };
    case "flaghue": return { deg: V([70, 130, 200], i) * fx.colorMul, spd: 3.4 };                    // Lupa del tasador: el neon apenas cambia los colores
    case "flagblur": return { px: V([3, 6, 10], i) * fx.blurMul * h };
    case "flagdark": return { b: 1 - (1 - V([0.55, 0.35, 0.18], i)) * (fx.darkR > 1 ? 0.35 : 1) };   // el Foco del vigilante alumbra la bandera
    case "flaggray": return { amt: V([0.8, 1, 1], i) * fx.colorMul };                   // Lupa del tasador: casi todo el color vuelve
    case "crack": return { n: Math.max(1, Math.round(V([1, 2, 3], i) * h)) };
    case "smudge": return { n: Math.max(1, Math.round(V([2, 3, 5], i) * h)), px: V([3, 4.5, 6], i) * fx.glassBlurMul * h };
    case "hang": return { n: Math.max(1, Math.round(V([1, 2, 3], i) * h)) };
    case "battery": return { dim: Math.min(0.85, V([0.55, 0.68, 0.8], i) * h * fx.batteryMul) };   // el Foco la deja casi en nada
    /* tanda 14 */
    case "ticker": return { gap: V([100, 150, 215], i), cap: V([2300, 3300, 5200], i), lead: V([450, 650, 900], i), cover: i >= 1, rnd: i >= 2, churn: i >= 2 };   // ms entre una letra y la siguiente; el pais tapado hasta que acaba; a tope: en desorden y se sueltan
    case "fakepass": return { n: i + 1 };
    case "flagpuzzle": return { cols: V([2, 3, 4], i), rows: V([2, 2, 3], i), pair: i === 0, gray: i === 2 ? 2 : 0 };
    case "flagwind": return { amp: V([3, 5, 7], i), T: V([1.9, 1.3, 1.1], i), sh: V([0.2, 0.55, 0.62], i), gust: i === 2 };
    case "flagback": return {};
    /* tanda 15 */
    case "ctrlz": return { every: V([6, 4, 0], i), after: V([0, 0, 1.5], i), half: fx.glassMul < 0.9 };   // cada 6 s / cada 4 s / 1,5 s despues de cada zoom; el Protector la deja a la mitad
    case "stormnight": return { iv: V([1.5, 2.2, 3], i), glow: 900 };                      // un rayo cada 1,5 / 2,2 / 3 s, con un resplandor de 0,9 s
    case "trap": return { med: V([1, 0, 1], i), hard: V([0, 1, 1], i) };                      // 2/2/1 (una facil pasa a media), 2/1/2 (una facil pasa a dificil), 1/2/2 (las dos)
    case "giants": return { g: V([1, 1, 1], i), d: V([1, 2, 3], i), big: V([1.5, 1.8, 2.1], i), small: V([0.5, 0.35, 0.25], i), base: V([0.9, 0.85, 0.85], i) };   // cuantos crecen, cuantos se encogen y cuanto; base: lo que se encogen los demas para dejar sitio (medido: gigante 1,3 / 1,6 / 1,8 reales)
    default: return {};
  } };
  const par = c => { const p = par0(c); if (c.m) for (const k in c.m) if (typeof p[k] === "number") p[k] *= c.m[k]; return p; };   // m: ratio sobre el nominal (jefes: valor exacto, con los amuletos multiplicando encima)
  const cur = () => S.qlist || S.bl || S.list;                                  // los retos de ESTA pregunta (la ronda, con el suplente de Babel si toca)
  const has = id => cur().some(c => c.id === id);
  const get = id => cur().find(c => c.id === id);
  const kindOn = k => cur().filter(c => D[c.id].kind === k);

  /* capas del mapa (DOM/CSS con mascaras que siguen al puntero) */
  function ensureOverlay(map) {
    if (S.ov && S.ov.isConnected) return S.ov;
    const ov = document.createElement("div"); ov.id = "chOv";
    ov.innerHTML = `<div class="ch-blur"></div><div class="ch-myopia2"></div><div class="ch-myopia"></div><div class="ch-dark"></div><div class="ch-halo"></div><div class="ch-spot"></div><canvas class="ch-clouds" width="256" height="144"></canvas><div class="ch-night"></div><div class="ch-flash"></div><div class="ch-flick"></div>`;
    (map && map.fx ? map.fx : $("map")).after(ov); S.ov = ov; if (A.chfx) A.chfx.attach(ov); return ov;
  }
  const layer = c => (S.ov ? S.ov.querySelector(".ch-" + c) : null);

  /* ------------------------------------------------------------------ humo y lluvia (canvas de pocos pixeles, escalado sin suavizar) */
  const Smoke = { raf: 0, puffs: [], drops: [], t: 0, mode: "" };
  function fxStart(mode, amount) {
    const cv = layer("clouds"); if (!cv) return; const c = cv.getContext("2d"); Smoke.t = 0; Smoke.mode = mode; cancelAnimationFrame(Smoke.raf);
    if (mode === "smoke") { const n = Math.round(6 + amount * 34); Smoke.puffs = Array.from({ length: n }, () => ({ x: Math.random() * 256, y: 10 + Math.random() * 124, r: 14 + Math.random() * 26, vx: (0.6 + Math.random() * 1.2) * (Math.random() < 0.5 ? 1 : -1), ph: Math.random() * 6 })); }
    else Smoke.drops = Array.from({ length: Math.round(60 + amount * 190) }, () => ({ x: Math.random() * 280, y: Math.random() * 144, v: 2.4 + Math.random() * 3.2, l: 4 + Math.random() * 7 }));
    cv.classList.add("on");
    const loop = now => {
      Smoke.raf = requestAnimationFrame(loop); if (now - Smoke.t < 50) return; Smoke.t = now; c.clearRect(0, 0, 256, 144);
      const px = S.px, hole = S.fx.cloudClear ? { x: (px.x / innerWidth) * 256, y: (px.y / innerHeight) * 144, r: S.fx.cloudClear / innerWidth * 256 } : null;
      if (Smoke.mode === "smoke") {
        for (const p of Smoke.puffs) { p.x += p.vx * 0.55; if (p.x < -40) p.x = 296; if (p.x > 296) p.x = -40;
          for (let k = 0; k < 5; k++) { const a = p.ph + k * 1.26 + now / 4000 * (k % 2 ? 1 : -1), rx = p.x + Math.cos(a) * p.r * 0.5, ry = p.y + Math.sin(a) * p.r * 0.3, rr = p.r * (0.5 + 0.12 * k); c.fillStyle = k % 2 ? "rgba(214,196,235,.55)" : "rgba(160,132,190,.6)"; c.beginPath(); c.arc(Math.round(rx), Math.round(ry), rr, 0, 6.3); c.fill(); } }
      } else {
        c.strokeStyle = "rgba(190,225,255,.75)"; c.lineWidth = 1;
        for (const d of Smoke.drops) { d.y += d.v; d.x -= d.v * 0.35; if (d.y > 150) { d.y = -8; d.x = Math.random() * 290; } c.beginPath(); c.moveTo(Math.round(d.x), Math.round(d.y)); c.lineTo(Math.round(d.x + d.l * 0.35), Math.round(d.y - d.l)); c.stroke(); }
      }
      if (hole) { c.save(); c.globalCompositeOperation = "destination-out"; const g = c.createRadialGradient(hole.x, hole.y, 2, hole.x, hole.y, hole.r); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, 0, 256, 144); c.restore(); }
    };
    Smoke.raf = requestAnimationFrame(loop);
  }
  function fxStop() { cancelAnimationFrame(Smoke.raf); const cv = layer("clouds"); if (cv) { cv.classList.remove("on"); cv.getContext("2d").clearRect(0, 0, 256, 144); } }

  A.chal.pointer = (x, y) => {                                        // solo si cambia, y solo dentro de #chOv (no fuerza recalcular estilos de toda la app)
    const ov = $("chOv"); if (S.px.x === x && S.px.y === y && (!ov || ov._pxSet)) return;
    S.px.x = x; S.px.y = y; S.moveAt = performance.now(); if (!ov) return; ov._pxSet = true; ov.style.setProperty("--px", x + "px"); ov.style.setProperty("--py", y + "px");
  };

  /* ------------------------------------------------------------------ texto del nombre */
  const isLetter = ch => /\p{L}/u.test(ch);
  /* runas: parecidos que SI existen en las fuentes del juego (Latin-1 de Jersey 15 y cirilico de Pixelify Sans): antes eran letras
     griegas que caian a otra tipografia y delataban cuales estaban cambiadas. Con nombres en ruso, el truco va al reves (cirilico -> latin) */
  const LOOK = { a: "д", b: "б", c: "¢", d: "ð", e: "є", h: "ћ", i: "ї", k: "ќ", m: "м", n: "п", o: "ø", p: "þ", r: "г", s: "§", t: "т", u: "µ", w: "ш", x: "×", y: "ў" };
  const LOOK_UP = { A: "Д", B: "ß", C: "©", D: "Ð", E: "€", H: "Ћ", I: "Ї", K: "Ќ", L: "£", M: "М", N: "И", O: "Ø", P: "Þ", R: "Я", S: "§", T: "†", U: "Ц", W: "Ш", X: "Ж", Y: "¥" };
  const LOOK_RU = { а: "a", б: "6", в: "ß", г: "r", д: "ð", е: "є", ж: "×", з: "3", и: "u", к: "ќ", м: "m", н: "h", о: "ø", п: "n", р: "þ", с: "¢", т: "†", у: "ў", х: "x", ц: "µ", ч: "4", ш: "w", ь: "b", я: "R" };
  const lookOf = ch => LOOK_UP[ch] || LOOK[ch] || (LOOK_RU[ch.toLowerCase()] && (ch !== ch.toLowerCase() ? LOOK_RU[ch.toLowerCase()].toUpperCase() : LOOK_RU[ch]));
  const VOWELS = /[aeiouáéíóúàèìòùâêîôûäëïöüãõåæœAEIOUÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÃÕÅаеёиоуыэюяАЕЁИОУЫЭЮЯ]/;
  function riddleText(o) {
    let t = ""; try { t = (A.tx(o.fact) || (A.factOf && A.factOf(o)) || "").trim(); } catch (e) { t = ""; }
    if (!t || t.length < 12) return null;
    return maskName(o, t);
  }
  /* tapa el nombre del lugar (en todos sus idiomas) dentro de un texto: la pista de la placa y la nota del pie. Un hueco por letra, sin recortar
     el texto. Compara sin acentos ni marcas (el ruso de Wikipedia trae el acento de entonacion: "Дака́р") y recompone el hangul (partido en jamo,
     el coreano no se tapaba). En chino, japones y coreano no espera espacios alrededor ("廷布", "브라질리아는"), salta los espacios de dentro
     ("샌 재신토") y tapa tambien los trozos del nombre: partido por ・, ＝, ·, の, 之 y los numeros, sin su cola generica ("安卡拉之战" -> "安卡拉",
     "西安市" -> "西安", "アポロ11号" -> "アポロ"), su principio ("华盛顿" en "华盛顿特区", salvo si es el del pais) y la lectura entre parentesis
     que lo sigue ("東京都（とうきょうと、...）"). En coreano, un nombre de una sola silaba ("빈", "칸") cuando va suelto o con su particula.
     En ruso, polaco, aleman, italiano y portugues, tambien el nombre declinado o derivado: su raiz y hasta 5 letras de cola ("Херонеи",
     "Байленская", "Londynie", "Haifas"). Y el nombre entero con su apostrofo o guion ("Xi'an", que partido se queda en dos palabras de 2 letras) */
  const CJK = /[\u1100-\u11ff\u3040-\u30ff\u3130-\u318f\u3400-\u9fff\uac00-\ud7af]/, MARK = /^\p{M}+$/u, isW = c => !!c && /[\p{L}\p{N}]/u.test(c);
  const foldOf = s => String(s).normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC").toLowerCase().replace(/[’ʼ]/g, "'");
  const CJK_TAIL = new RegExp("(" + ["之战", "战役", "会战", "海战", "战争", "之围", "围城战", "包围战", "事件", "事变", "惨案", "大屠杀", "大地震", "地震", "大火", "火灾", "起义", "暴动", "革命", "维新", "运动", "进军", "攻势",
    "会谈", "会议", "条约", "宣言", "危机", "兄弟", "特区", "特别行政区", "の戦い", "の戦", "戦い", "戦争", "会戦", "海戦", "の包囲戦", "包囲戦", "事変", "の虐殺", "虐殺", "大火", "の噴火", "噴火", "維新",
    "運動", "行進", "攻勢", "略奪", "会談", "会議", "条約", "危機", "兄弟", "전투", "전쟁", "해전", "공방전", "사건", "학살", "대지진", "지진", "대화재", "혁명", "유신", "행진", "공세", "회담", "회의",
    "조약", "위기", "형제", "市", "州", "省", "县", "縣", "区", "區", "都", "府", "岛", "島", "群岛", "群島", "半岛", "半島", "山", "山脉", "山脈", "火山", "湖", "河", "江", "川", "寺", "寺院", "宫", "宫殿",
    "宮", "宮殿", "塔", "城", "城堡", "桥", "大桥", "橋", "大橋", "港", "湾", "灣", "运河", "運河", "瀑布", "滝", "沙漠", "砂漠", "广场", "広場", "公园", "公園", "国家公园", "国立公園", "大教堂",
    "教堂", "大聖堂", "神社", "시", "주", "도", "섬", "산", "강", "호", "궁", "궁전", "탑", "성", "다리", "공원", "광장", "대성당", "성당", "폭포", "사막", "산맥", "화산", "신사"].join("|") + ")$");
  const DECL = /^(ru|pl|de|it|pt)/, KANA = /^[\u3040-\u30ff]/, HANGUL1 = /^[\uac00-\ud7af]$/;
  const SPLIT = /[\s,()'\-・＝·«»"“”„]+/, READING = /^[\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Latin}ー・\s'./／-]+$/u;
  const PARTICLE = new Set(["", "은", "는", "이", "가", "을", "를", "의", "에", "에서", "에서는", "에는", "으로", "로", "과", "와", "도", "만", "까지", "부터", "이다", "이며", "이자", "이고"]);
  const cutTail = s => s.replace(/^\d+年/, "").replace(CJK_TAIL, "").replace(/[の之]$/, "");
  const pieces = w => {                                               // una palabra del nombre en chino, japones o coreano: entera, sin su cola y partida por の, 之 y los numeros
    const out = new Set([w]), core = cutTail(w); if ([...core].length >= 2) out.add(core);
    core.split(/[の之\d]+/).forEach(p => { const c = cutTail(p); if ([...p].length >= 2 && c) out.add(p); if ([...c].length >= 2) out.add(c); });
    return [...out];
  };
  function maskName(o, t) {
    const chars = [...t], F = [], at = [], hide = new Set(), words = new Set(), roots = [], one = new Set(), country = [];   // F: el texto plegado (sin marcas, en minusculas), letra a letra; at: de que caracter sale cada una
    chars.forEach((ch, i) => { for (const c of foldOf(ch)) { F.push(c); at.push(i); } });
    const add = (k, min) => { if ([...k].length >= min) words.add(k); };
    Object.values(o.name || {}).forEach(n => {
      const whole = foldOf(n).trim(); if (/['-]/.test(whole)) add(whole, 3);
      whole.split(SPLIT).forEach(k => { if (!CJK.test(k)) add(k, 3); else if (HANGUL1.test(k)) one.add(k); else if (k.replace(CJK_TAIL, "")) pieces(k).forEach(p => add(p, 2)); });
    });
    if (DECL.test(A.lang || "") && o.name) foldOf(o.name[A.lang] || "").split(SPLIT).forEach(k => { const n = [...k].length; if (n >= 5 && !CJK.test(k)) roots.push(k.slice(0, Math.max(4, n - 2))); });
    Object.values(o.sub || {}).forEach(s => String(s).split(" · ").forEach(c => { const k = foldOf(c).trim(); if (CJK.test(k)) country.push([...k]); }));
    const ofCountry = (W, m) => country.some(c => c.length >= m && W.slice(0, m).every((x, j) => c[j] === x));   // ese principio del nombre es el del pais ("メキシコ" de "メキシコシティ")
    for (const w of [...words].sort((a, b) => b.length - a.length)) {
      const W = [...w], cjk = CJK.test(w), part = KANA.test(w) ? 4 : 3;   // el principio que se tapa: 3 caracteres (4 en kana: "ニュー" o "サンフ" no dicen nada)
      for (let k = 0; k < F.length; k++) {
        let m = 0, p = k, end = k; while (m < W.length && p < F.length) { if (F[p] === W[m]) { m++; end = ++p; } else if (cjk && m && F[p] === " ") p++; else break; }
        if (m === W.length ? cjk || (!isW(F[k - 1]) && !isW(F[end])) : cjk && m >= part && !ofCountry(W, m)) for (let j = k; j < end; j++) hide.add(at[j]);
      }
    }
    if (one.size) for (let k = 0; k < F.length; k++) {                // coreano de una silaba: suelto o con su particula
      if (!one.has(F[k]) || isW(F[k - 1])) continue;
      let e = k + 1; while (e < F.length && isW(F[e])) e++;
      if (PARTICLE.has(F.slice(k + 1, e).join(""))) hide.add(at[k]);
    }
    if (roots.length) for (let k = 0; k < F.length;) {                // el nombre declinado: cada palabra del texto que empieza por su raiz
      if (!isW(F[k])) { k++; continue; }
      let e = k; while (e < F.length && isW(F[e])) e++;
      const tw = F.slice(k, e).join("");
      if (roots.some(r => tw.startsWith(r) && tw.length <= r.length + 5)) for (let j = k; j < e; j++) hide.add(at[j]);
      k = e;
    }
    if (CJK.test(t)) chars.forEach((ch, i) => {                         // la lectura entre parentesis que sigue al nombre tapado (hasta la primera coma o los dos puntos)
      if (!hide.has(i) || hide.has(i + 1)) return;
      let j = i + 1; while (chars[j] === " ") j++;
      if (chars[j] !== "（" && chars[j] !== "(") return;
      let e = j + 1; while (e < chars.length && e - j < 60 && !"）)、，,；;：:".includes(chars[e])) e++;
      const seg = chars.slice(j + 1, e).join(""), fs = foldOf(seg);
      if (chars[e] && "）)、，,；;：:".includes(chars[e]) && seg.trim() && READING.test(seg) && !country.some(c => fs.includes(c.join("")))) for (let x = j + 1; x < e; x++) if (isW(chars[x])) hide.add(x);
    });
    let prev = false;                                                  // las marcas sueltas de una letra tapada se van con ella
    return chars.map((ch, i) => { if (MARK.test(ch)) return prev ? "" : ch; prev = hide.has(i); return prev ? "▮" : ch; }).join("");
  }
  /* Torre de Babel (v0.52): de los 6 idiomas originales (nunca el tuyo ni su base: es-419 -> es), el que mas aleja el nombre del tuyo (distancia
     de edicion sin acentos ni mayusculas, relativa a su largo; empate: al azar con la semilla). null si el nombre es el mismo en todos */
  const lev = (a, b) => { const A1 = [...a], B1 = [...b]; let row = B1.map((_, j) => j + 1); for (let i = 0; i < A1.length; i++) { let prev = i, nx = [i + 1]; for (let j = 0; j < B1.length; j++) { const v = Math.min(row[j] + 1, nx[j] + 1, prev + (A1[i] === B1[j] ? 0 : 1)); prev = row[j]; nx.push(v); } row = nx.slice(1); } return A1.length ? (B1.length ? row[B1.length - 1] : A1.length) : B1.length; };
  function babelAlt(o, key) {
    const me = foldOf(A.tx(o.name)), best = []; let bd = 0;
    for (const l of BABEL_BASE) {
      if (l === A.lang || l === A.wlang() || !o.name || !o.name[l]) continue;
      const f = foldOf(o.name[l]); if (f === me) continue;
      const d = lev(f, me) / Math.max([...f].length, [...me].length, 1);
      if (d > bd + 1e-9) { bd = d; best.length = 0; best.push(l); } else if (Math.abs(d - bd) <= 1e-9) best.push(l);
    }
    return best.length ? best[Math.floor(A.rng(key)() * best.length)] : null;
  }
  /* si el nombre no cambia en ningun idioma (54 % de las ciudades, 30 % de las capitales), esa pregunta trae otro reto de letras en su lugar: uno de los
     que frena el mismo Diccionario (asi la tienda y los sobornos siguen cuadrando), que no este ya en la ronda. Su ficha lo ensena mientras dura */
  const BABEL_SUB = ["missing", "anagram"];
  const BABEL_NOTE = L6("En lugar de la Torre de Babel: este nombre es igual en todos sus idiomas.|Instead of the Tower of Babel: this name is the same in every language.|À la place de la Tour de Babel : ce nom est le même dans toutes ses langues.|No lugar da Torre de Babel: este nome é igual em todos os idiomas.|Statt Turmbau zu Babel: Dieser Name ist in allen Sprachen gleich.|Al posto della Torre di Babele: questo nome è uguale in tutte le lingue.||代替巴别塔：这个名字在所有语言里都一样。|바벨탑 대신: 이 이름은 모든 언어에서 똑같습니다.|バベルの塔の代わり：この名前はどの言語でも同じ。|Вместо Вавилонской башни: это название одинаково на всех языках.|Zamiast Wieży Babel: ta nazwa brzmi tak samo w każdym języku.");
  function babelSwap(o) {
    const b = S.pub.find(c => c.id === "babel"), pool = BABEL_SUB.filter(id => !S.pub.some(c => c.id === id)); if (!b || !pool.length) return;
    S.qsub = { of: "babel", id: A.rng(`${S.seed}:bsub:${S.round}:${S.q}:${A.tx(o.name)}`).pick(pool), lv: b.lv };
    S.qlist = (S.bl || S.list).filter(c => c.id !== "babel").concat(expand([{ id: S.qsub.id, lv: b.lv }]));
  }
  /* la ficha de Babel en la barra de la Aventura: la del suplente mientras dura la pregunta (renderBars ya la pinta asi; esto cubre el cambio) */
  const syncChips = () => { const b = S.pub.find(c => c.id === "babel"); if (!b) return; document.querySelectorAll('#advBar .ch-chip[data-of="babel"]').forEach(el => { const want = S.qsub ? S.qsub.id : "babel"; if (el.dataset.ch !== want) el.outerHTML = A.chal.chip(b, el.classList.contains("sm")); }); };
  /* el nombre y el pais de debajo sufren los mismos retos de texto (el pais tambien tiembla, se borra, se cambia...) */
  function decorate(o) {
    const el = $("askName"), sub = $("askSub"); if (!el || !o) return; clearText();
    const hadSub = !!S.qsub; S.qsub = null; S.qlist = null;
    if (o.t === "c" && A.adv && A.adv.isFlagRound && A.adv.isFlagRound()) { if (sub) sub.textContent = ""; if (A.adv.renderFlag) A.adv.renderFlag(o); flagClass(el, o); if (hadSub) syncChips(); return; }   // ronda de banderas: la bandera manda, nunca el texto
    const nameTxt = A.tx(o.name), subTxt = A.tx(o.sub);
    let alt = null;                                                   // Torre de Babel: los dos textos salen en el mismo otro idioma
    if (!S.suspended && (S.bl || S.list).some(c => c.id === "babel") && !S.fx.noBabel) { alt = babelAlt(o, `${S.seed}:t:${S.q}:${nameTxt}`); if (!alt) babelSwap(o); }
    if (hadSub || S.qsub) syncChips();
    const tx = cur().filter(c => D[c.id].kind === "text");
    if (S.suspended || !tx.length) { el.textContent = nameTxt; if (sub) A.renderBlanks(sub, subTxt); return; }
    deco(el, o, o.name, alt, false);
    if (sub) {
      if (has("nocountry") && subTxt && !o.clue) { sub.innerHTML = '<span class="ch-redact">▮▮▮▮▮▮</span>'; sub.classList.add("ch-nocountry"); }
      else if (subTxt) deco(sub, o, o.sub, alt, true); else sub.textContent = "";
    }
    if (has("ticker") && !has("riddle")) boardStart(el, sub, o, alt && o.name[alt] ? o.name[alt] : nameTxt, get("ticker"));   // tanda 14
    if (has("fakepass")) passStart(sub, o);
  }
  function deco(el, o, obj, alt, isSub) {
    const fx = S.fx;
    let text = A.tx(obj);
    const rnd = A.rng(`${S.seed}:t${isSub ? "s" : ""}:${S.q}:${text}`);
    let riddle = false;
    if (!isSub && !o.clue && has("riddle")) { const r = riddleText(o); if (r) { text = r; riddle = true; } }
    if (alt && !riddle && obj[alt]) text = obj[alt];
    let chars = [...text]; const orig = chars.slice(), isL = i => isLetter(chars[i] || " ");
    const letters = chars.map((c, i) => (isLetter(c) ? i : -1)).filter(i => i >= 0), fixed = new Set(), hidden = new Set(), dots = new Set(), runes = new Map();
    if (!riddle) {
      const an = get("anagram"), full = !!an && an.lv >= 3;            // a tope: todo menos la 1.a letra, tambien en palabras de 3
      if (an && letters.length >= (full ? 3 : 4)) {
        let i = 0; while (i < chars.length) { if (!isL(i)) { i++; continue; } let j = i; while (j < chars.length && isL(j)) j++; if (j - i >= (full ? 3 : 4)) { const e = full ? j : j - 1, was = chars.slice(i + 1, e); let mid = rnd.shuffle(was); if (mid.join("") === was.join("") && new Set(mid).size > 1) mid.push(mid.shift()); for (let k = 0; k < mid.length; k++) { chars[i + 1 + k] = mid[k]; fixed.add(i + 1 + k); } } i = j; }
      }
      const sw = get("swap");
      if (sw && letters.length >= 3) { const pk = par(sw).pairs, want = Math.floor(pk) + (pk % 1 && rnd() < pk % 1 ? 1 : 0); let done = 0, tries = 0; while (done < want && tries++ < 20) { const k = letters[Math.floor(rnd() * (letters.length - 1))]; if (isL(k + 1) && chars[k] !== chars[k + 1] && !fixed.has(k)) { [chars[k], chars[k + 1]] = [chars[k + 1], chars[k]]; fixed.add(k); fixed.add(k + 1); done++; } } }
      const rn = get("runes");
      if (rn) { const p = par(rn), pool = letters.filter(i => lookOf(chars[i])); rnd.shuffle(pool).slice(0, Math.max(2, Math.round(letters.length * p.frac))).forEach(i => { runes.set(i, chars[i]); chars[i] = lookOf(chars[i]); }); }
      if (get("novowels")) letters.forEach(i => { if (VOWELS.test(orig[i]) && i > 0) dots.add(i); });
      const ms = get("missing");
      const ml = dots.size ? letters.filter(i => !dots.has(i)) : letters;   // tanda 6: sin vocales y ademas tinta borrada: se borran consonantes
      if (ms && ml.length >= 3) { const p = par(ms), n = clamp(Math.round(ml.length * p.frac), 2, Math.max(2, Math.floor(ml.length * 0.7))), pool = rnd.shuffle ? rnd.shuffle(ml.slice()) : ml.slice(); for (const k of pool) { if (hidden.size >= n) break; hidden.add(k); } }
    }
    const sh = get("shaky"), amp = sh ? par(sh).amp : 0, dn = get("dance"), damp = dn ? par(dn).amp : 0, memOn = !!get("memory"), crazy = !!(sh && dn && sh.lv >= 3 && amp > 3);   // tanda 8: a tope, las letras se dispersan y vuelven
    const parts = chars.map((ch, i) => {                              // data-n (no data-i: cambiar de idioma reescribe todo [data-i] con A.t)
      if (ch === " ") return chars[i - 1] === "▮" && chars[i + 1] === "▮" ? '<i class="wg"></i>' : " ";
      const c = ["lt"]; let glyph = ch; if (ch === "▮") c.push("blk");
      if (hidden.has(i)) c.push("gap", "sv" + Math.floor(rnd() * 3)); else if (dots.has(i)) { c.push("dot"); glyph = "·"; } else if (get("missing") && rnd() < 0.5) c.push("faint");
      if (runes.has(i)) c.push("rune");
      const dur = (0.07 + rnd() * 0.09).toFixed(3), del = (-rnd() * 0.3).toFixed(3), ax = ((rnd() - 0.5) * 2 * amp).toFixed(2), ay = ((rnd() - 0.5) * 2 * amp).toFixed(2), ar = ((rnd() - 0.5) * amp * 1.6).toFixed(2);
      let cz = ""; if (crazy) { const sa = rnd() * Math.PI * 2, sd = 0.7 + rnd() * 0.9; cz = `--sx:${(Math.cos(sa) * sd * 1.4).toFixed(2)}em;--sy:${(Math.sin(sa) * sd).toFixed(2)}em;--sr:${((rnd() - 0.5) * 320).toFixed(0)}deg;`; }
      const st = (amp ? `--dur:${dur}s;--del:${del}s;--ax:${ax}px;--ay:${ay}px;--ar:${ar}deg;` : "") + (damp ? `--dy:${(damp * (0.6 + rnd() * 0.8)).toFixed(2)}em;--di:${i};` : "") + (memOn ? `--fd:${(rnd() * 0.6).toFixed(2)}s;` : "") + cz;
      return `<b class="${c.join(" ")}" data-n="${i}" data-g="${runes.has(i) ? runes.get(i) : ch}" style="${st}"${amp ? ' data-sh="1"' : ""}${damp ? ' data-dn="1"' : ""}${crazy ? ' data-cz="1"' : ""}>${glyph}</b>`;
    });
    let html = "", word = "";                                        // cada palabra en un bloque que no se parte (si no, las letras sueltas saltan de linea)
    /* Adivinanza en chino o japones: sin espacios, el texto entero era un solo bloque y se salia de la placa (hasta 2.000 px). Ahi se puede cortar
       entre dos caracteres, salvo antes de la puntuacion de cierre y de las kana pequenas (。、ーッェ...) y despues de la de apertura (（「...) */
    const cut = i => riddle && (HZ.test(chars[i]) || HZ.test(chars[i - 1] || "")) && !HZ_CLOSE.test(chars[i]) && !HZ_OPEN.test(chars[i - 1] || "");
    parts.forEach((pt, i) => { if (pt === " " || pt.startsWith("<i")) { html += (word ? `<span class="wd">${word}</span>` : "") + pt; word = ""; } else { if (word && cut(i)) { html += `<span class="wd">${word}</span>`; word = ""; } word += pt; } });
    el.innerHTML = html + (word ? `<span class="wd">${word}</span>` : "");
    if (amp) el.classList.add("ch-shaky");
    if (crazy) el.classList.add("ch-crazy"); else if (damp) el.classList.add("ch-dance");
    const mr = get("mirror");
    if (mr && !fx.unmirrorText) {
      if (mr.lv >= 3) { const ws = el.querySelectorAll(".wd"), T = ["w-m", "w-u", "w-v"], s0 = Math.floor(rnd() * 3); ws.forEach((w, k) => w.classList.add(ws.length === 1 ? "w-v" : T[(s0 + k) % 3])); }   // a tope, cada palabra a su manera (una sola: del reves de arriba abajo)
      else el.classList.add("ch-mirror");
    }
    if (has("upside") && !fx.unmirrorText) el.classList.add("ch-upside");
    if (riddle) { el.classList.add("ch-riddle"); if (text.length > 190) el.classList.add("ch-long"); fitRiddle(el); }
    if (has("scroll") && !fx.noMarquee) { el.innerHTML = `<span class="ch-marq">${el.innerHTML}</span>`; el.classList.add("ch-scroll"); }
    const restore = (b, g) => { b.classList.remove("gap", "dot", "faint", "rune"); b.classList.add("fix"); b.textContent = g; };
    const hid = [...hidden, ...dots];
    if (hid.length && fx.missingRate > 0) hid.forEach((k, j) => later(() => { const b = el.querySelector(`.lt[data-n="${k}"]`); if (b) { restore(b, b.dataset.g); say("chip", 1 + j * 0.2); } }, 900 + (j * 1000) / fx.missingRate));
    const unfix = new Set([...(fx.unswapMs ? fixed : []), ...(fx.decodeMs ? runes : [])]);   // la Chuleta devuelve las cambiadas o mezcladas, no las runas (eso no lo dice su carta)
    if (unfix.size) later(() => { el.querySelectorAll(".lt").forEach(b => { const i = +b.dataset.n; if (unfix.has(i) && b.textContent !== orig[i] && !b.classList.contains("gap")) restore(b, orig[i]); }); say("chip", 2); }, Math.min(fx.unswapMs || 1e9, fx.decodeMs || 1e9));
    if (riddle && fx.riddleMs) later(() => { el.classList.remove("ch-riddle"); el.textContent = A.tx(obj); el.classList.add("fixed"); say("chip", 2); }, fx.riddleMs);
    const mem = get("memory");
    if (mem) later(() => { el.classList.add(fx.keepName ? "ch-dim" : "ch-fade"); }, par(mem).ms);
  }
  /* adivinanza: la pista se encoge hasta caber en la placa (antes una nota larga se salia por debajo del crupier), tambien a lo ancho */
  const HZ = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/, HZ_CLOSE = /[、。，．！？：；）」』】〕〉》”’ー・…％ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ]/, HZ_OPEN = /[（「『【〔〈《“‘]/;
  const fitRiddle = el => requestAnimationFrame(() => { if (!el.classList.contains("ch-riddle")) return; let f = parseFloat(getComputedStyle(el).fontSize) || 16, n = 0; const max = Math.max(96, innerHeight * 0.22); while ((el.scrollHeight > max || el.scrollWidth > el.clientWidth + 2) && f > 11 && n++ < 18) { f -= 1; el.style.fontSize = f + "px"; } });
  function clearText() { for (const id of ["askName", "askSub"]) { const el = $(id); if (el) el.style.fontSize = ""; if (el) el.classList.remove("ch-shaky", "ch-mirror", "ch-upside", "ch-fade", "ch-dim", "ch-dance", "ch-crazy", "ch-riddle", "ch-long", "ch-scroll", "ch-nocountry", "fixed", "ch-board", "ch-pass", "ch-covered", "sf-pop"); } S.fb = S.fz = S.fw = S.fp = null; boardStop(); }

  /* ------------------------------------------------------------------ mapa: deformaciones */
  /* la colocacion de continentes (19-76 ms de calculo) sale igual en todas las preguntas de la ronda (misma semilla, mismo reto): se calcula una vez
     y se reutiliza. Antes se repetia al empezar cada pregunta, justo cuando los continentes echan a andar */
  const LAYM = new Map();
  /* lo que tapa el HUD durante la pregunta (px de pantalla: el HUD no escala con la ventana; medido de 1280x720 a 2000x1125, con holgura): marcador,
     barra de la Aventura, puntos, zoom, botones, placa del nivel y herramientas. Fijo (sin leer el DOM): la colocacion se calcula en la intro, con el
     marcador todavia oculto */
  const hudPx = (W, H) => [[0, 0, 450, 245], [0, 0, 395, 400], [W - 245, 0, W, 155], [W - 72, H * 0.46 - 115, W, H * 0.46 + 115], [0, H - 72, 165, H], [W / 2 - 355, H - 92, W / 2 + 355, H], [W / 2 - 180, H - 215, W / 2 + 180, H - 92]];
  /* ori: el giro del mapa (Mundo del reves, Espejo del mapa): el HUD tapa la parte del mapa que queda debajo DESPUES de girarlo */
  const hudZones = (map, ori) => {
    const v = map._clamp({ ...map.home() }), W = map.W, H = map.H, X = px => v.cx + (px - W / 2) / v.s, Y = py => v.cy - (py - H / 2) / v.s;
    const fy = !!(ori && ori.rot), fx = fy !== !!(ori && ori.mx);   // del reves: gira media vuelta (x e y); espejo: solo x; del reves con espejo: solo y
    const rects = hudPx(W, H).map(([a, b, c, d]) => [fx ? W - c : a, fy ? H - d : b, fx ? W - a : c, fy ? H - b : d]);
    return { view: [X(0), Y(H), X(W), Y(0)], rects: rects.map(([a, b, c, d]) => [X(a), Y(d), X(c), Y(b)]), key: [W, H].map(Math.round).join("x") + (fx ? "x" : "") + (fy ? "y" : "") };
  };
  A.chal.hudZones = hudZones;                                          // para dev/maptest.js
  /* las preguntas de la ronda, con el continente con el que se mueve cada una: la mesa de Continentes barajados las deja todas a la vista. Si la Carta de
     cambio trae otra, la mesa se reparte de nuevo para ella (cada pregunta empieza con el reparto, asi que no se nota) */
  let RPTS = { key: null, pts: null };
  const roundPts = map => {
    const alt = A.adv && A.adv.splitAlt ? A.adv.splitAlt() : null, list = ((A.core && A.core.S && A.core.S.qs) || []).concat(alt ? [alt] : []).filter(Boolean), key = S.seed + "|" + S.round + "|" + list.map(q => (q.cid ? q.cid[0] : q.key)).join(","); if (RPTS.key === key) return RPTS.pts;
    const pts = [];
    for (const q of list) {
      if (q.t === "c") { const f = map.world.byName[q.key]; if (!f) continue; const big = f.polys.reduce((a, b) => ((b.bbox[2] - b.bbox[0]) * (b.bbox[3] - b.bbox[1]) > (a.bbox[2] - a.bbox[0]) * (a.bbox[3] - a.bbox[1]) ? b : a)); pts.push([(big.bbox[0] + big.bbox[2]) / 2, (big.bbox[1] + big.bbox[3]) / 2, big.ct]); }
      else if (q.lat != null) pts.push([q.lon, q.lat, map._ctOf(q.lon, q.lat)]);
    }
    RPTS = { key, pts }; pts.key = key; return pts;
  };
  const layoutMemo = (map, key, fn) => { let L = LAYM.get(key); if (!L) { L = fn(); LAYM.set(key, L); if (LAYM.size > 8) LAYM.delete(LAYM.keys().next().value); } return { ...L, shift: L.shift.map(p => p.slice()), scale: L.scale.slice() }; };
  function mapSpec(map, o, L0, qi) {
    const L = L0 || cur(), get = id => L.find(c => c.id === id), has = id => L.some(c => c.id === id), qks = S.bk && BX[S.bk] && qi != null ? ":" + qi : "";   // tanda 16: los efectos de ESTA pregunta (y su colocacion, aparte en cada una)
    const spec = { shift: [0, 1, 2, 3, 4, 5, 6].map(() => [0, 0]), rot: [0, 0, 0, 0, 0, 0, 0], wob: 0, lineA: 1, orient: null, ct: 6 }; let any = false;
    const rr = A.rng(`${S.seed}:m:${S.round}${qks}`), fl0 = get("flip");
    const ori = has("mirrorx") && !S.fx.unmirrorMap ? { rot: 0, mx: 1 } : fl0 && !S.fx.unmirrorMap ? { rot: Math.PI, mx: fl0.lv >= 3 ? 1 : 0 } : null;   // el mismo giro que se pone mas abajo
    const lay = ["pangea", "spread", "deal"].map(id => get(id)).find(Boolean);
    const gi = get("giants"), scl = gi ? giantScales(gi.lv || 1, `${S.seed}:gd:${S.round}`) : null;
    const tl = get("tilt"); if (tl) { const k = par(tl).k; for (let c = 0; c < 6; c++) spec.rot[c] = (rr() < 0.5 ? -1 : 1) * (0.3 + rr() * 0.45) * k; any = true; }
    if (lay || tl || gi) {                                                                                // motor de encaje con mascaras reales: los continentes nunca se pisan, tambien en Pangea
      const kind = lay ? (lay.id === "deal" ? "mix" : lay.id) : gi ? "giants" : "hold", k = lay ? par(lay).k : 1;
      const Z = hudZones(map, ori); if (kind === "mix") { Z.pts = roundPts(map); spec.rot = [0, 0, 0, 0, 0, 0, 0]; }
      const L = layoutMemo(map, [S.seed, S.round + (kind === "mix" ? "" : qks), kind, k, spec.rot.join(), Z.key, Z.pts ? Z.pts.key : "", scl ? scl.join() : ""].join("|"), () => map.layout(kind, k, rr, spec.rot, Z, scl)); spec.shift = L.shift; spec.scale = L.scale; any = true;
      if (!L.ok) spec.rot = [0, 0, 0, 0, 0, 0, 0];                    // no hubo sitio: se quedan en su sitio y sin girar (girados a tamano completo se pisarian)
      if (lay && lay.id === "pangea") { spec.smooth = true; spec.ms = 2600; }
      if (gi) { spec.smooth = true; spec.ms = 1500; }                                  // tanda 15: crecen y se encogen sin rebote
      if (kind === "mix") { spec.smooth = true; spec.ms = 1800; spec.deal = true; }   // como cartas: se encogen en su sitio y aparecen en el nuevo (sin cruzarse ni pasarse de largo)
    }
    const wb = get("wrongborders"); if (wb) { spec.wob = par(wb).amp; any = true; }
    const nb = get("noborders"); if (nb) { spec.lineA = 0; spec.flat = [0.55, 1, 1][lvi(nb)]; any = true; }   // tanda 6: a nivel 1 aun se adivinan los colores de cada pais
    const fl = get("flip"); if (fl && !S.fx.unmirrorMap) { spec.orient = { rot: Math.PI, mx: fl.lv >= 3 ? 1 : 0 }; any = true; }   // el Espejo del ilusionista tambien endereza el Sur arriba
    if (has("mirrorx") && !S.fx.unmirrorMap) { spec.orient = { rot: 0, mx: 1 }; any = true; }
    const sp = get("spin"); if (sp) { spec.spin = { amp: par(sp).amp, speed: 0.55 }; any = true; }
    const mo = get("mosaic"); if (mo) { spec.mosaic = par(mo).res; any = true; }
    const qk = get("quake"); if (qk) { spec.quake = par(qk).px; any = true; }
    const dr = get("drift"); if (dr) { const px = par(dr).px; spec.pan = { vx: px, vy: px * 0.6 }; any = true; }
    if (o) { const f = o.t === "c" ? map.world.byName[o.key] : null; spec.ct = f ? f.ct : map._ctOf(o.lon, o.lat); }
    return any ? spec : null;
  }
  /* Chinchetas trampa (v0.52): estorban y no senalan nada. Antes rodeaban el objetivo a 250-2.050 km con rumbo al azar y su centro caia a 340-566 km
     del sitio (clicar ahi daba 750-800 puntos sin saber nada). Ahora se reparten por todo el mapa visible (tierra y mar) sin mirar el objetivo:
     candidatos al azar con la semilla de la pregunta, uniformes en la vista de inicio (de -180 a 180 y hasta 60 S), en tierra o en mar y separados
     entre si. La lista de candidatos no depende de la ventana; de ella se saltan los que caerian debajo del HUD o fuera de la pantalla (en otra
     ventana solo cambian esos). Del objetivo no se mira nada, ni para apartarse de el: un hueco alrededor del sitio tambien seria una pista */
  function decoyList(map, o, n) {
    if (!o || !map || !map.world || !map._clamp) return [];
    const rr = A.rng(`${S.seed}:d:${S.round}:${S.q}`), P = A.geo.project, TAU = Math.PI * 2;
    const fl = get("flip"), ori = has("mirrorx") && !S.fx.unmirrorMap ? { rot: 0, mx: 1 } : fl && !S.fx.unmirrorMap ? { rot: Math.PI, mx: fl.lv >= 3 ? 1 : 0 } : null;   // el mismo giro que mapSpec
    const fy = !!(ori && ori.rot), fx = fy !== !!(ori && ori.mx), v = map._clamp({ ...map.home() }), W = map.W, H = map.H, HUD = hudPx(W, H);
    const toPx = (x, y) => { const sx = W / 2 + (x - v.cx) * v.s, sy = H / 2 - (y - v.cy) * v.s; return [fx ? W - sx : sx, fy ? H - sy : sy]; };
    const y0 = P(0, -60)[1], y1 = 2.1, out = [], pts = [];
    /* v0.2.16: tambien caen en el mar (si todas cayeran en tierra, "chincheta = pais" seria una pista y el mar quedaria siempre limpio) y son muchas mas:
       primero bien repartidas y luego apretadas, hasta que el mapa se llene */
    for (let k = 0; k < 3000 && out.length < n; k++) {
      const x = -Math.PI + rr() * TAU, y = y0 + rr() * (y1 - y0), [px, py] = toPx(x, y);   // siempre dos numeros por candidato: la lista no cambia con la ventana
      if (px < 16 || px > W - 16 || py < 44 || py > H - 6) continue;                  // la chincheta entera a la vista (cabeza 39 px por encima de la punta)
      if (HUD.some(([a, b, c, d]) => px + 14 > a && px - 14 < c && py + 4 > b && py - 40 < d)) continue;
      if (pts.some(q => Math.hypot(q[0] - x, q[1] - y) < (k < 1000 ? 0.22 : 0.13))) continue;
      const [lon, lat] = A.geo.unproject(x, y);
      pts.push([x, y]); out.push({ lat, lon, a: S.fx.trapGhost ? 0.28 : 0.95 });
    }
    return out;
  }

  /* ------------------------------------------------------------------ apagon, rayos */
  /* tanda 7: Luces parpadeantes PICARAS. Ademas de su ritmo, se van cuando te pillan apuntando (el raton quieto sobre el mapa) y cada corte es
     distinto: normal, tartamudo, amago o largo, con chispas de la lampara */
  const CUTS = [["normal", 0.35], ["stutter", 0.25], ["tease", 0.2], ["long", 0.2]];
  function flickerLoop() {
    const fl = get("flicker"); if (!fl || S.suspended || !S.on) return; const p = par(fl), el = layer("flick"); if (!el) return;
    const wait = (p.iv[0] + Math.random() * (p.iv[1] - p.iv[0])) * 1000, t0 = performance.now(), gap = p.iv[0] * 550;
    later(function poll() {
      if (!phaseOk()) return later(poll, 400);
      const now = performance.now(), still = now - (S.moveAt || 0), sly = now - t0 > gap && still > 260 && still < 2400 && Math.random() < 0.16;
      if (now - t0 < wait && !sly) return later(poll, 110);
      fire();
    }, 110);
    function fire() {
      const dim = S.fx.blackoutMul < 0.9; let x = Math.random(), pat = "normal"; for (const [k, w] of CUTS) { if ((x -= w) <= 0) { pat = k; break; } }
      if (A.chfx && A.chfx.ok()) { const run = () => A.chfx.cut(p.len, dim, () => { if (S.on && !S.suspended) flickerLoop(); }, pat); if (S.fx.flickerWarn) { say("warn"); later(run, 420); } else run(); return; }
      const on = dim ? 0.6 : 0.98, sf = !!(A.softFlash && A.softFlash()), seq = sf ? [[on, p.len + 230]] : [[on, 70], [0, 90], [on, 60], [0, 110], [on, p.len]];   // Destellos suaves: un fundido (css)
      el.classList.toggle("soft", sf);
      const go = i => { if (i >= seq.length || !S.on) { el.style.opacity = 0; say("restore"); return flickerLoop(); } el.style.opacity = seq[i][0]; if (seq[i][0]) say(sf ? "powerdown" : "buzz", i); later(() => go(i + 1), seq[i][1]); };
      if (S.fx.flickerWarn) { const h = layer("halo"); if (h) { h.classList.add("warn"); later(() => h.classList.remove("warn"), 420); } say("warn"); later(() => go(0), 420); } else go(0);
    }
  }
  /* tanda 8: Terremoto con SACUDIDAS: cada pocos segundos un temblor fuerte que mueve el mapa de sitio (hay que volver a buscar), retumba y hace
     temblar la pantalla. El Ancla las deja en casi nada */
  function quakeLoop() {
    const q = S.bl ? get("quake") : S.pub.find(c => c.id === "quake"); if (!q || S.suspended || !S.on) return;
    const lv = clamp(q.lv || 1, 1, 3), P = V([[5.5, 8], [3.8, 5.5], [2.4, 3.8]], lv - 1), wait = (P[0] + Math.random() * (P[1] - P[0])) * 1000;
    later(function fire() {
      if (!phaseOk()) return later(fire, 600);
      const m = S.map, k = S.fx.quakeMul; if (m && m.quakeKick) m.quakeKick(V([10, 16, 24], lv - 1) * k, V([30, 55, 85], lv - 1) * k);
      say("rumble", lv);
      const app = $("app"); if (app && k > 0.5 && !document.documentElement.classList.contains("reduce-motion")) { app.classList.remove("ch-quaking"); A.restyle(app); app.classList.add("ch-quaking"); later(() => app.classList.remove("ch-quaking"), 700); }
      quakeLoop();
    }, wait);
  }
  function lightningLoop() {
    const lg = get("lightning"); if (!lg || S.suspended || !S.on || S.fx.noFlash) return; const p = par(lg), el = layer("flash"); if (!el) return;
    const wait = (p.iv[0] + Math.random() * (p.iv[1] - p.iv[0])) * 1000;
    later(function fire() {
      if (!phaseOk()) return later(fire, 800);
      if (A.chfx && A.chfx.ok()) { A.chfx.strike({ near: 0.65, shade: p.shade }); return later(lightningLoop, 240); }   // tanda 7: cae cerca de donde miras y deja su sombra
      const sf = !!(A.softFlash && A.softFlash()), seq = sf ? [[0.62, 170], [0, 0]] : [[1, 60], [0.15, 70], [0.9, 90], [0, 0]];   // Destellos suaves: un solo fundido (css)
      el.classList.toggle("soft", sf);
      const go = i => { if (i >= seq.length || !S.on) { el.style.opacity = 0; el.classList.remove("up"); return lightningLoop(); } el.classList.toggle("up", sf && i === 0); el.style.opacity = seq[i][0]; if (i === 0) say("thunder"); later(() => go(i + 1), seq[i][1]); };
      go(0);
    }, wait);
  }

  /* ================================================================== tanda 15: retos nuevos II
     Ctrl+Z (pantalla: el crupier deshace tu zoom), Noche de tormenta (tormenta: el mapa a oscuras, solo se ve entero cuando cae un rayo),
     Pregunta trampa (reglas: aqui solo el sello; el cambio de reparto esta en adventure.js, applyTrap) y Gigantes y enanos (sitio: mapSpec) */
  const TRAP_TXT = L6("TRAMPA|TRAP|PIÈGE|ARMADILHA|FALLE|TRAPPOLA||陷阱|함정|ワナ|ЛОВУШКА|PUŁAPKA");
  /* el raton de verdad (el reticulo puede temblar o ir con retraso por otros retos: eso no cuenta como mover) */
  addEventListener("pointermove", e => { if (e.pointerType !== "touch") S.mvAt = performance.now(); }, { passive: true });
  /* --- Ctrl+Z: cada 6 s (nv1), cada 4 s (nv2) o 1,5 s despues de cada zoom (nv3), el mapa vuelve a la vista inicial en 300 ms.
     Juego limpio: nunca con un boton pulsado ni en los 400 ms siguientes a mover el raton, durante los 300 ms no se aceptan clics (y se devuelven al reloj),
     no actua durante el reparto de Continentes barajados ni con una sonda en curso, y solo mueve la camara */
  const zzView = map => map.tv || (map.anim ? map.anim.to : map.view);
  function zzClear() { const el = document.getElementById("zzFx"); if (el) el.remove(); S.zz = null; if (S.map) S.map.zzUntil = 0; }
  function zzKey() {
    const old = document.getElementById("zzFx"); if (old) old.remove();
    const el = document.createElement("div"); el.id = "zzFx"; el.setAttribute("aria-hidden", "true");
    el.style.setProperty("--zr", ((Math.random() - 0.5) * 14).toFixed(1) + "deg"); el.style.setProperty("--zx", Math.round((Math.random() - 0.5) * 260) + "px"); el.style.setProperty("--zy", Math.round((Math.random() - 0.5) * 90) + "px");
    el.innerHTML = '<i class="zz-scan"></i><span class="zz-cap"><b class="zz-k">Ctrl</b><u>+</u><b class="zz-k zz-z">Z</b></span>';
    document.body.appendChild(el); setTimeout(() => { if (el.isConnected) el.remove(); }, 1000);
  }
  const zzSafe = (map, now) => {
    const d = map.dist;
    return phaseOk() && !(map.pointers && map.pointers.size) && now - (S.mvAt || 0) > 400 && !(d && d.spec && d.spec.deal && d.k < 0.999) && !(map.probes || []).some(p => now - (p.t0 || 0) < 800) && now >= (map.zzUntil || 0);
  };
  function ctrlzFire(map, p, z, now) {
    z.pend = false; z.nextAt = now + p.every * 1000 * (0.85 + Math.random() * 0.3); z.zoomAt = 0; z.n++;
    if (p.half && z.n % 2 === 0) return;                                           // Protector: actua la mitad de las veces
    const g = A.core && A.core.S, ms = calmMo() ? 0 : 300;
    zzKey(); say("zUndo");
    if (ms) { map.zzUntil = now + ms + 40; if (g) g.limit += ms / 1000; }           // durante los 300 ms no se aceptan clics: ese tiempo se devuelve
    map.animateTo(map.home(), ms);
  }
  function ctrlzLoop() {
    const c = get("ctrlz"), map = S.map; if (!c || S.suspended || !S.on || !map || !map.animateTo || !map.home) return;
    const p = par(c), z = S.zz = { n: 0, s0: zzView(map).s, zoomAt: 0, pend: false, nextAt: performance.now() + (p.every || 0) * 1000 * (0.85 + Math.random() * 0.3) };
    const zoomed = () => zzView(map).s > map.home().s * 1.2;
    later(function tick() {
      if (S.zz !== z || !S.on || S.suspended) return;
      const now = performance.now(), s = zzView(map).s;
      if (Math.abs(s - z.s0) > z.s0 * 0.003) { z.s0 = s; z.zoomAt = now; }
      if (phaseOk()) {
        let due = false;
        if (p.after) due = zoomed() && z.zoomAt > 0 && now - z.zoomAt >= p.after * 1000;
        else { if (now >= z.nextAt) z.pend = true; if (z.pend && !zoomed()) { z.pend = false; z.nextAt = now + p.every * 1000 * (0.85 + Math.random() * 0.3); } due = z.pend && now - z.zoomAt > 380; }
        if (due && zzSafe(map, now)) ctrlzFire(map, p, z, now);
      }
      later(tick, 100);
    }, 100);
  }
  /* --- Noche de tormenta: el mapa a oscuras (costas al 10 %) y solo se ve entero mientras dura el resplandor de un rayo. Cada rayo es de su manera
     (normal, relampago lejano que solo medio alumbra, o doble); el primero cae enseguida. Con Destellos suaves, la luz entra y sale en un fundido */
  function nightLoop() {
    const sn = get("stormnight"); if (!sn || S.suspended || !S.on) return; const p = par(sn), CX = A.chfx, PX = !!(CX && CX.ok()), el = layer("night"), n = S.nt = { id: Math.random() };
    if (!PX) { if (el) el.classList.add("on"); say("rain", 0.3); }
    const up = kind => {
      if (PX) return CX.night({ kind, ms: p.glow });
      const sf = !!(A.softFlash && A.softFlash()), ms = kind === "sheet" ? p.glow * 0.7 : p.glow; if (!el) return;
      el.classList.toggle("soft", sf); el.classList.remove("on"); say("nightBang", kind, sf); later(() => { if (S.nt === n && S.on) el.classList.add("on"); }, ms);
    };
    later(function beat() {
      if (S.nt !== n || !S.on || S.suspended) return;
      if (!phaseOk()) return later(beat, 400);
      const r = Math.random(), kind = r < 0.68 ? "strike" : r < 0.88 ? "sheet" : "double";
      up(kind); later(beat, p.iv * 1000 * (0.75 + Math.random() * 0.5) + (kind === "double" ? 260 : 0));
    }, 380 + Math.random() * 260);
  }
  /* --- Pregunta trampa: la esquina roja y el sello (adventure.js marca o.trap en las preguntas cambiadas) */
  function trapClear() { const pl = $("plate"); if (!pl) return; pl.classList.remove("trap"); const m = pl.querySelector(".trap-mark"); if (m) m.remove(); }
  function trapMark(o) {
    trapClear(); if (!S.on || S.suspended || !has("trap") || !o || !o.trap) return;
    const pl = $("plate"); if (!pl) return; pl.classList.add("trap");
    pl.insertAdjacentHTML("beforeend", `<span class="trap-mark" aria-hidden="true"><i class="trap-corner"></i><b class="trap-stamp">${A.tx(TRAP_TXT)}</b></span>`); say("trapStamp");
  }
  /* --- Gigantes y enanos: algunos continentes crecen y otros se encogen (cuantos y cuanto, segun el nivel). Los que caben menos crecen menos */
  const GIANT_CAP = [1, 0.9, 1, 0.7, 1.15, 1.15];                                // af, na, sa, as, eu, oc: cuanto de su "grandeza" admite cada uno sin comerse el mapa
  function giantScales(lv, seed) {
    const p = par({ id: "giants", lv }), ord = A.rng(seed).shuffle([0, 1, 2, 3, 4, 5]), sc = [p.base, p.base, p.base, p.base, p.base, p.base, 1];   // los demas, algo encogidos para dejar sitio a los gigantes
    ord.slice(0, p.g).forEach(c => { sc[c] = +(1 + (p.big - 1) * GIANT_CAP[c]).toFixed(3); });
    ord.slice(p.g, p.g + p.d).forEach(c => { sc[c] = p.small; });
    return sc.map((v, c) => (c < 6 ? +(1 + (v - 1) * S.fx.plateMul).toFixed(3) : v));   // el Ancla los deja casi en su sitio y a su tamano
  }
  A.chal.giantScales = giantScales;


  /* ================================================================== tanda 16: JEFES CON IDENTIDAD
     Cada jefe es el examen de una familia que SUBE DE TONO pregunta a pregunta (acto I de nv1 a nv2, acto II de nv2 a nv3, acto III nv3 fijo con un giro
     distinto en cada una). El plan (A.chal.plan) no cambia: sigue dando los ingredientes de siempre, marcados con bx (los que dirige el jefe) y su nivel
     de partida lv0; aqui, BX[clave](q, t) devuelve los EFECTOS de la pregunta q (t = q/4): retos con nivel fraccionario (V interpola los parametros de
     par) y, cuando hace falta un valor exacto, m = ratio sobre el nominal (asi los amuletos siguen multiplicando encima). Un ingrediente sobornado,
     inmune o gastado (ingr() == undefined) no pone sus efectos; lo que no es del jefe (el tercer reto del acto II, el poder de la Ascension 4,
     lo sellado) pasa tal cual. S.bl = los efectos de la pregunta actual; cur() lo lee. jefes.js pone lo que hay fuera del mapa (siesta, salvapantallas,
     pantallazo, album, rueda, banca, barra de escalada) */
  const NEUT = { fx: null }, neutralFx = () => NEUT.fx || (NEUT.fx = A.chal.fx([]));
  const nom = (id, lv) => { const f0 = S.fx, h0 = S.halve; S.fx = neutralFx(); S.halve = 1; try { return par0({ id, lv }); } finally { S.fx = f0; S.halve = h0; } };
  const ingr = id => S.pub.find(c => c.id === id && c.bx);
  const capLv = (c, lv) => clamp(c.lv0 != null && c.lv < c.lv0 ? Math.min(lv, c.lv) : lv, 1, 3);
  const SH = () => (S.asc >= 3 ? 1 : 0);
  /* efecto de la pregunta: id con nivel lv (puede ser fraccionario); tgt = {parametro: valor exacto} (ratio sobre el nominal, sin tocar los multiplicadores de los amuletos) */
  const EF = (c, id, lv, tgt, extra) => {
    const want = clamp(lv + SH(), 1, 3), L = capLv(c, want), e = { id, lv: L, of: c.id, ...extra };
    if (tgt && L >= want - 1e-6) { const n = nom(id, L), m = {}; for (const k in tgt) if (n[k]) m[k] = tgt[k] / n[k]; e.m = m; }   // si el reto se estrena (nivel 1), sin valores forzados
    return e;
  };
  const XE = (c, lv) => expand([{ id: c.id, lv: Math.round(capLv(c, lv + SH())) }]);   // los efectos de los niveles de siempre (EXPAND)
  const TW = e => ({ ...e, tw: 1 });
  const BX = {
    /* ---- ACTO I */
    blackout(q, t) { const o = [], dk = ingr("dark"), fl = ingr("flicker"); if (dk) o.push(EF(dk, "dark", 1 + t, { r: 300 - 180 * t })); if (fl && q >= 2) o.push(EF(fl, "flicker", q === 2 ? 1 : 2, null, { tw: q === 2 })); return o; },
    dizzy(q) { const o = [], tr = ingr("tremble"), sk = ingr("shaky"); if (tr) { o.push(EF(tr, "dizzy", 1, { r: [8, 8, 10, 12, 14][q] })); o.push(EF(tr, "tremble", 2, { px: [4, 6, 8, 10.5, 12.5][q] })); } if (sk) o.push(...XE(sk, q < 2 ? 1 : 2)); return o; },
    onecont(q, t) { const o = [], sp = ingr("spread"), an = ingr("anagram"); if (sp) o.push(EF(sp, "pangea", 2, { k: 0.45 + 0.55 * t })); if (an) o.push(...XE(an, q < 2 ? 1 : 2)); return o; },
    blind(q, t) { const o = [], bl = ingr("blur"), ms = ingr("missing"); if (bl) o.push(EF(bl, "blur", 1 + t, { px: 4 + 5.5 * t })); if (ms) o.push(...XE(ms, q < 2 ? 1 : 2)); return o; },
    nightfall(q, t) { const o = [], sn = ingr("stormnight"), sk = ingr("shaky"); if (sn) o.push(EF(sn, "stormnight", 1 + t)); if (sk) o.push(...XE(sk, q < 2 ? 1 : 2)); return o; },
    siesta(q) { const z = ingr("siesta"); return z ? [{ id: "siesta", lv: capLv(z, 2), of: "siesta", thr: 100 - 10 * q }] : []; },
    /* ---- ACTO II */
    flagfog(q, t) { const o = [], fd = ingr("flagdark"), cl = ingr("clouds"); if (fd) o.push(EF(fd, "flagdark", 2 + t)); if (cl) o.push(EF(cl, "clouds", 2 + t, { cover: 0.3 + 0.33 * t })); return o; },
    flagworld(q) {
      const o = [], fb = ingr("flagback"), fl = ingr("flip"), K = ["m", "f", "r", "m", "r"][q], M = [["mirrorx", 1], ["flip", 1], ["mirrorx", 1], ["flip", 3], ["flip", 3]][q];   // 5 parejas distintas (bandera, mapa)
      if (fb) o.push(TW({ id: "flagback", lv: capLv(fb, 2 + SH()), of: "flagback", fb: K })); if (fl) o.push(TW({ id: M[0], lv: capLv(fl, M[1]), of: "flip" })); return o;
    },
    flagneon(q, t) { const o = [], fh = ingr("flaghue"), wb = ingr("wrongborders"); if (fh) o.push(EF(fh, "flaghue", 2 + t, { spd: 3.4 - 2.4 * t })); if (wb) o.push(EF(wb, "wrongborders", 2 + t)); return o; },
    flagpix(q, t) { const o = [], fb = ingr("flagblur"), mo = ingr("mosaic"); if (fb) o.push(EF(fb, "flagblur", 2.5 + 0.5 * t)); if (mo) o.push(EF(mo, "mosaic", 2 + t)); return o; },
    flagmute(q) { const o = [], fg = ingr("flaggray"), nb = ingr("noborders"), hi = q >= 3 ? 3 : 2; if (fg) o.push(...XE(fg, hi)); if (nb) o.push(...XE(nb, hi)); return o; },
    falsealarm(q, t) { const o = [], sp = ingr("spread"), wb = ingr("wrongborders"); if (sp) o.push(q < 2 ? EF(sp, "pangea", 2, { k: 0.8 + 0.1 * q }) : EF(sp, "deal", 3, { k: [0.85, 0.92, 1][q - 2] })); if (wb) o.push(EF(wb, "wrongborders", 2 + t)); return o; },
    quakehall(q, t) { const o = [], qk = ingr("quake"), dc = ingr("decoys"); if (qk) o.push(EF(qk, "quake", 2 + t)); if (dc) o.push(EF(dc, "decoys", 2 + t)); return o; },
    fourthwall(q) {
      const E = [["crack", "crack", 1], ["hang", "hang", 1], ["crack", "screensaver", 2], ["hang", "ctrlz", 2], ["crack", "bsod", 3]][q], c = ingr(E[0]); return c ? [TW({ id: E[1], lv: capLv(c, E[2]) })] : [];   // un golpe, una ventana, el salvapantallas, Ctrl+Z y un pantallazo azul falso
    },
    collector(q) { const o = [], wb = ingr("wrongborders"), w = S.pub.find(c => c.bx && c.wh === q); if (wb) o.push(EF(wb, "wrongborders", 2)); if (w) o.push(...XE(w, 2).map(TW)); return o; },
    /* ---- ACTO III (nv3 fijo, un giro por pregunta) */
    mirror(q) {
      const o = [], fl = ingr("flip"), cm = ingr("cmirror"), bl = ingr("blur"), M = [["flip", 1, 1], ["mirrorx", 1, 2], ["flip", 3, 3], ["mirrorx", 1, 3], ["flip", 1, 2]][q];   // 5 (mapa, controles) distintos
      if (fl) o.push(TW({ id: M[0], lv: capLv(fl, M[1]), of: "flip" })); if (cm) o.push(TW({ id: "cmirror", lv: M[2], of: "cmirror" })); if (bl) o.push(EF(bl, "blur", 3)); return o;
    },
    shuffled(q) { const o = [], sp = ingr("spread"), fl = ingr("flicker"), ms = ingr("missing"); if (sp) o.push({ id: "deal", lv: capLv(sp, 3), of: "spread", k: 1 }); if (fl) o.push(EF(fl, "flicker", 3)); if (ms) o.push(...XE(ms, 3)); return o; },
    dirty(q) {
      const o = [], wb = ingr("wrongborders"), fl = ingr("flicker"), st = ingr("storm"), TWI = [["decoys", 3], ["lag", 3], ["tremble", 2], ["blink", 2], ["cmirror", 3]][q];
      if (wb) o.push(EF(wb, "wrongborders", 3)); if (fl) o.push(EF(fl, "flicker", 3)); if (st) o.push({ id: "storm", lv: capLv(st, 3), of: "storm" });
      if (wb || fl || st) o.push(TW({ id: TWI[0], lv: TWI[1] })); return o;   // la zancadilla de cada pregunta: pins, retraso, pulso, parpadeo y controles al reves
    },
    perfect(q) { const o = [], rn = ingr("rain"), lg = ingr("lightning"), sn = ingr("stormnight"); if (rn) o.push(EF(rn, "rain", 3)); if (lg && q >= 1) o.push(TW(EF(lg, "lightning", q === 1 ? 2 : 3))); if (sn && q >= 3) o.push(TW(EF(sn, "stormnight", q === 3 ? 1 : 3))); return o; },
    crash(q) { const o = [], bt = ingr("battery"), hg = ingr("hang"), fl = ingr("flicker"); if (bt) o.push({ id: "battery", lv: capLv(bt, 3), of: "battery", p0: 100 - 19 * q, p1: 100 - 19 * (q + 1) }); if (hg) o.push(EF(hg, "hang", 3)); if (fl) o.push(EF(fl, "flicker", 3)); return o; },
    nopass(q) {
      const o = [], ba = ingr("babel"), nc = ingr("nocountry"), mo = ingr("mosaic"), noFp = S.topic === "country" || S.topic === "clue" || (S.asc >= 5 && Math.floor(S.round / 4) >= 2), alt = S.cjk ? "babel" : "ticker";
      if (mo) o.push(EF(mo, "mosaic", 3));
      const T = [[nc, ["nocountry"]], [ba, ["babel"]], [ba, ["riddle"]], [nc, [noFp ? alt : "fakepass"]], [nc, ["riddle", "nocountry"]]][q];   // sin pais, Babel, adivinanza, pasaporte falso y adivinanza sin pais
      if (T[0]) T[1].forEach(id => o.push(TW({ id, lv: 3, of: T[0].id }))); return o;
    },
    wheel(q) { const w = S.pub.find(c => c.bx && c.wh === q); return w ? XE(w, 3).map(TW) : []; },
  };
  /* los efectos de la pregunta q: lo del jefe y, detras, lo que no es suyo (el tercero del acto II, el poder de la Ascension 4, lo sellado...) */
  function bossQ(qi) {
    const f = BX[S.bk]; if (!f) return null; const q = Math.max(0, Math.min(qi, 4));
    const rest = S.pub.filter(c => !c.bx).flatMap(c => expand([c]).map(e => ({ ...e, sealed: c.sealed, sealBy: c.sealBy, isNew: c.isNew })));
    return (f(q, q / 4) || []).concat(rest);
  }
  /* las fichas de la barra de la Aventura: con jefe, las de lo que ESTA pregunta lleva de verdad (el giro, destacado) */
  A.chal.barList = base => {
    if (!S.on || !S.bl) return base; const seen = new Set(), out = [];
    for (const e of S.bl) {
      const id = e.of || e.id; if (!D[id] || seen.has(id)) continue; seen.add(id);
      const all = S.bl.filter(x => (x.of || x.id) === id), src = S.pub.find(p => p.id === id);
      out.push({ id, lv: Math.round(Math.max(...all.map(x => x.lv || 1))), tw: all.some(x => x.tw), isNew: src && src.isNew, sealed: src && src.sealed, sealBy: src && src.sealBy });
    }
    return out;
  };
  /* pone un efecto en mitad de la pregunta (la siesta que acaba en Apagon) */
  function inject(effs) {
    if (!S.on || S.suspended) return; S.bl = (S.bl || S.list).concat(effs); if (S.qlist) S.qlist = S.qlist.concat(S.calm ? effs.filter(c => !S.calm.includes(D[c.id].fam)) : effs); const dk = get("dark");
    if (dk) {
      say("dark");
      if (A.chfx && A.chfx.ok()) A.chfx.set(cur(), par, S.fx);
      else { const p = par(dk), app = $("app"); app.style.setProperty("--dr", p.r + "px"); app.style.setProperty("--da", p.a.toFixed(3)); const K = layer("dark"), H = layer("halo"); if (K) K.classList.add("on"); if (H) H.classList.add("on"); }
    }
    if (A.pointer && A.pointer.mods) A.pointer.mods(); if (A.adv && A.adv.refresh) A.adv.refresh();
  }

  /* ------------------------------------------------------------------ perks que contrarrestan retos activos: al empezar la ronda suena la "contra"
     (v0.35: sin marcar que ficha ni con que perk antes de comprarlo. 0.2.5: el amuleto YA comprado si se luce: su sello en la ficha que frena) */
  const counterOf = id => { const ids = (S.on && S.fx && S.fx.ids) || []; return (D[id].counters || []).find(p => ids.includes(p)); };
  function counterFx(qi) {
    const all = S.bk && BX[S.bk] ? [0, 1, 2, 3, 4].flatMap(bossQ) : S.list, hit = all.filter(c => counterOf(c.id)); if (!hit.length || qi !== 0) return;
    /* tanda 2: la reliquia que ya es tuya se luce (su icono salta en la barra) con el sonido de contra; la ficha del reto no cambia */
    const ids = [...new Set(hit.map(c => counterOf(c.id)))];
    later(() => ids.forEach((id, i) => (A.adv && A.adv.flash ? A.adv.flash(id, 0, "", () => { say("counter", i); if (A.adv.amuSlam) A.adv.amuSlam(id); }) : later(() => say("counter", i), i * 140))), 650);   // 0.2.5: el amuleto salta y su sello cae sobre la ficha del reto
  }

  /* ------------------------------------------------------------------ puntero: parametros para js/pointer.js */
  A.chal.ptrMods = () => {
    if (S.suspended || !S.on) return null;
    const m = {}; for (const c of kindOn("ptr")) { const p = par(c); if (c.id === "cmirror" && S.fx.unmirrorPtr) continue; m[c.id] = p; }
    if (get("dark") && !S.fx.halo) m.tinyDark = true;                   // sin linterna, el puntero se ve mas pequeño en el apagon
    return Object.keys(m).length ? m : null;
  };

  /* ================================================================== tanda 14: retos nuevos de bandera y de placa
     Bandera de espaldas (flagback: espejo, boca abajo o girada, con su sello), Bandera a trozos (flagpuzzle: un puzle que se va recomponiendo),
     Bandera al viento (flagwind: tiras que ondean, solo transform) | Pasaporte falso (fakepass: a veces el pais de debajo es un vecino) y
     Panel de salidas (ticker: fichas de aeropuerto que giran y se van fijando en las letras del nombre). Todo cuelga de decorate() / flagClass()
     y se apaga en reveal() (el sello FALSO, la bandera que se endereza, el puzle que se cierra, el panel que acaba de repente) */
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const calmMo = () => document.documentElement.classList.contains("reduce-motion") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const FP_FALSE = L6("FALSO|FAKE|FAUX|FALSO|FALSCH|FALSO||假|가짜|偽|ЛОЖЬ|FAŁSZ");
  /* --- banderas simetricas (medido sobre las 199 del juego: menos del 5 % de pixeles distintos al girarlas): si lo son, el giro no se ve y se usa el siguiente */
  const FB_SYM = { m: new Set(["Albania","Antigua and Barbuda","Argentina","Armenia","Austria","Azerbaijan","Barbados","Belize","Bolivia","Botswana","Brazil","Bulgaria","Burkina Faso","Burundi","Cape Verde","Cambodia","Canada","Central African Republic","Colombia","Costa Rica","Croatia","Ecuador","Estonia","Egypt","El Salvador","Ethiopia","Gabon","The Gambia","Georgia","Ghana","Germany","Grenada","Guatemala","Haiti","Honduras","Hungary","India","Indonesia","Iran","Iraq","Israel","Jamaica","Japan","Kenya","Kiribati","Kosovo","Kyrgyzstan","Laos","Latvia","Lesotho","Libya","Lithuania","Luxembourg","North Macedonia","Malawi","Maldives","Mauritania","Mauritius","Federated States of Micronesia","Monaco","Montenegro","Morocco","Myanmar","Netherlands","Nicaragua","Niger","Nigeria","Paraguay","Peru","Poland","Russia","Saint Lucia","San Marino","Sierra Leone","Somalia","South Korea","Suriname","Switzerland","Syria","Tajikistan","Thailand","Uganda","Ukraine","Uzbekistan","Venezuela","Vietnam","Yemen","Curaçao","Aruba"]), f: new Set(["Algeria","Argentina","Austria","The Bahamas","Bahrain","Bangladesh","Belgium","Botswana","Brazil","Burundi","Cameroon","Chad","Costa Rica","Cuba","Ivory Coast","Denmark","El Salvador","Finland","France","Georgia","Grenada","Guatemala","Guinea","Guyana","Honduras","Iceland","Republic of Ireland","Israel","Italy","Jamaica","Japan","Kyrgyzstan","Laos","Latvia","North Macedonia","Maldives","Mali","Malta","Federated States of Micronesia","Nicaragua","Nigeria","North Korea","Norway","Palau","Peru","Portugal","Qatar","Romania","Senegal","Somalia","Suriname","Sweden","Switzerland","São Tomé and Príncipe","Thailand","Timor-Leste","Tunisia","Turkey","Zimbabwe"]), r: new Set(["Switzerland"]) };
  const FB_ORDER = [["m", "f", "r"], ["f", "r", "m"], ["r", "m", "f"]];             // nivel 1: espejo (↔) / nivel 2: boca abajo (↕) / nivel 3: girada 90 grados
  const fbKind = (name, lv, pref) => { const o = pref ? [pref, ...["m", "f", "r"].filter(x => x !== pref)] : FB_ORDER[clamp(lv || 1, 1, 3) - 1]; return o.find(k => !FB_SYM[k].has(name)) || o[0]; };
  const FB_BITS = { m: ["...#.....#...", "..##.....##..", ".###.....###.", "#############", ".###.....###.", "..##.....##..", "...#.....#..."] };
  FB_BITS.f = FB_BITS.m[0].split("").map((_, x) => FB_BITS.m.map(r => r[x]).join(""));
  const bitsSvg = rows => { let d = ""; rows.forEach((r, y) => { let x = 0; while (x < r.length) { if (r[x] !== "#") { x++; continue; } let e = x; while (e < r.length && r[e] === "#") e++; d += `M${x} ${y}h${e - x}v1h-${e - x}z`; x = e; } }); return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" width="${rows[0].length * 2}" height="${rows.length * 2}" shape-rendering="crispEdges" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`; };
  const sealHtml = k => `<span class="fb-seal fb-seal-${k}">${k === "r" ? "<b>90°</b>" : bitsSvg(FB_BITS[k])}</span>`;
  /* la bandera tal como la pinta .ask-flag (max 220 x 140 px y 60 vw, con su proporcion): los trozos y las tiras se montan sobre esa caja */
  function flagBox(o) {
    const rec = A.FLAGS && o.name && A.FLAGS[o.name.en], r0 = rec ? rec[1] / rec[2] : 1.5, W0 = Math.min(Math.min(220, 0.6 * innerWidth), 140 * r0);
    return { r: r0, W: W0, H: W0 / r0, src: `assets/flags/${A.mediaKey(o.name.en)}.svg` };
  }
  function flagWrap(el, o) {
    const img = el.querySelector(".ask-flag"); if (!img) return null; const bx = flagBox(o); img.style.width = Math.round(bx.W) + "px"; img.style.height = Math.round(bx.H) + "px";   // el SVG no trae tamano propio: sin esto se encoge a 4 px dentro del envoltorio
    const wrap = document.createElement("span"), stage = document.createElement("span"); wrap.className = "fl-wrap"; stage.className = "fl-stage";
    img.replaceWith(wrap); wrap.appendChild(stage); stage.appendChild(img);
    if (img.style.filter) stage.style.filter = img.style.filter;                    // por si la bandera trae ademas un filtro de color
    return { wrap, stage, img };
  }
  /* ------------------------------------------------------------------ Bandera de espaldas */
  function flagBack(F, c, o) {
    if (S.fx.unmirrorMap) return;                                                  // el Ancla: la bandera sale derecha
    const k = fbKind(o.name.en, c.lv, c.fb), b = flagBox(o), kr = Math.min(1, 138 / b.W).toFixed(3);
    const T = { m: "perspective(700px) rotateY(180deg)", f: "perspective(700px) rotateX(180deg)", r: `rotate(90deg) scale(${kr})` };
    F.stage.style.transform = T[k]; F.stage.dataset.fb = k; S.fb = { stage: F.stage, wrap: F.wrap, k };
    if (calmMo() || !F.stage.animate) { F.wrap.insertAdjacentHTML("beforeend", sealHtml(k)); return; }
    /* se entra girando desde de canto (nunca se ve la bandera de frente) y se posa con un rebote */
    const from = { m: "perspective(700px) rotateY(90deg)", f: "perspective(700px) rotateX(90deg)", r: "rotate(450deg) scale(0)" }[k], over = { m: "perspective(700px) rotateY(194deg)", f: "perspective(700px) rotateX(194deg)", r: `rotate(80deg) scale(${(kr * 1.04).toFixed(3)})` }[k];
    F.stage.animate([{ transform: from, opacity: 0.2 }, { transform: over, opacity: 1, offset: 0.72 }, { transform: T[k], opacity: 1 }], { duration: 780, easing: "cubic-bezier(.25,.8,.3,1)" });
    say("flagFlip", k); later(() => { if (!S.fb || S.fb.stage !== F.stage) return; F.wrap.insertAdjacentHTML("beforeend", sealHtml(k)); say("sealPop"); }, 600);
  }
  /* al responder la bandera se endereza (y el sello se va) */
  function fbReveal() {
    const f = S.fb; S.fb = null; if (!f || !f.stage.isConnected) return;
    const s = f.wrap.querySelector(".fb-seal"); if (s) s.remove();
    if (calmMo() || !f.stage.animate) { f.stage.style.transform = ""; return; }
    const id = { m: "perspective(700px) rotateY(0deg)", f: "perspective(700px) rotateX(0deg)", r: "rotate(0deg) scale(1)" }[f.k], from = f.stage.style.transform;
    f.stage.style.transform = id; f.stage.animate([{ transform: from }, { transform: id }], { duration: 480, easing: "cubic-bezier(.3,1.35,.5,1)" }); say("flagFlip", f.k);
  }
  /* Dividir: la bandera pequena de la otra carta, con el mismo giro (sin animacion) */
  A.chal.flagAlt = (img, q) => { if (!img || !S.on || S.suspended || S.fx.unmirrorMap) return; const c = get("flagback"); if (!c || !q || !q.name) return; const k = fbKind(q.name.en, c.lv, c.fb); img.style.transform = { m: "scaleX(-1)", f: "scaleY(-1)", r: "rotate(90deg) scale(.62)" }[k]; };
  /* ------------------------------------------------------------------ Bandera a trozos */
  function flagPuzzle(F, c, o) {
    const p = par(c), b = flagBox(o), cols = p.cols, rows = p.rows, N = cols * rows, pw = Math.max(8, Math.floor(b.W / cols)), ph = Math.max(8, Math.floor(b.H / rows)), W = pw * cols, H = ph * rows;
    const rr = A.rng(`${S.seed}:fz:${S.round}:${S.q}:${o.name.en}`);
    let pos = Array.from({ length: N }, (_, i) => i);                                // pos[pieza] = casilla en la que esta (la suya es la i)
    if (p.pair) { const a = Math.floor(rr() * N); let d = Math.floor(rr() * (N - 1)); if (d >= a) d++; [pos[a], pos[d]] = [pos[d], pos[a]]; }
    else { for (let t = 0; t < 60; t++) { pos = rr.shuffle(pos); if (pos.every((s, i) => s !== i)) break; } if (pos.some((s, i) => s === i)) pos = pos.map((s, i) => (i + 1) % N); }
    const gray = new Set(p.gray ? rr.shuffle(pos.map((_, i) => i)).slice(0, p.gray) : []), at = i => `translate(${(pos[i] % cols) * pw}px,${Math.floor(pos[i] / cols) * ph}px)`;
    const bg = `background-image:url(${b.src});background-size:${W}px ${H}px;`;
    F.stage.innerHTML = `<span class="fz-board${S.fx.unswapMs ? " gold" : ""}" style="width:${W}px;height:${H}px">${pos.map((_, i) => `<i class="fz-p${gray.has(i) ? " gr" : ""}" style="width:${pw}px;height:${ph}px;${bg}background-position:${-(i % cols) * pw}px ${-Math.floor(i / cols) * ph}px;transform:${at(i)};--d:${Math.floor(rr() * 260)}ms"></i>`).join("")}</span>`;
    const board = F.stage.firstChild, els = [...board.children];
    S.fz = { board, els, pos, cols, pw, ph, N, at, rr, gray, done: false, every: S.fx.unswapMs ? 1000 : 3000 };
    say("puzzleDeal"); if (!calmMo()) board.classList.add("deal");
    const z = S.fz; later(function tick() { if (S.fz !== z || z.done) return; if (!phaseOk()) return later(tick, 300); fzReturn(); if (!z.done) later(tick, z.every); }, z.every);
  }
  function fzPlace(z, i) { z.els[i].style.transform = z.at(i); }
  function fzReturn() {
    const z = S.fz; if (!z || z.done) return; const dis = z.pos.map((s, i) => (s !== i ? i : -1)).filter(i => i >= 0);
    if (!dis.length) { z.done = true; return; }
    const i = dis[Math.floor(z.rr() * dis.length)], occ = z.pos.indexOf(i), old = z.pos[i]; z.pos[i] = i; z.pos[occ] = old;
    z.els[i].classList.remove("gr"); fzPlace(z, i); fzPlace(z, occ);
    for (const j of [i, occ]) if (z.els[j].animate && !calmMo()) z.els[j].animate([{ filter: "brightness(1.9)" }, { filter: "brightness(1)" }], { duration: 380, easing: "ease-out" });
    say("puzzleSnap", dis.length); if (z.pos.every((s, k) => s === k)) { z.done = true; z.board.classList.add("whole"); }
  }
  function fzSolve() {
    const z = S.fz; if (!z || !z.board.isConnected) return; z.done = true; z.board.classList.add("whole", "end");
    for (let i = 0; i < z.pos.length; i++) z.pos[i] = i; z.els.forEach((e, i) => { e.classList.remove("gr"); fzPlace(z, i); });
  }
  /* ------------------------------------------------------------------ Bandera al viento: 8 tiras, cada una con su desfase; solo transform y opacity (compositor) */
  function flagWind(F, c, o) {
    const p = par(c), calm = S.fx.blurMul < 0.5, b = flagBox(o), n = 8, sw = Math.max(6, Math.floor(b.W / n)), W = sw * n, H = Math.round(b.H), a = calm ? 2 : p.amp, T = calm ? 1.7 : p.T;
    const bg = `background-image:url(${b.src});background-size:${W}px ${H}px;`;
    F.stage.innerHTML = `<span class="fw-board" style="width:${W}px;height:${H}px;--a:${a}px;--sn:${a};--T:${T}s;--ph:${(T / 7).toFixed(3)}s;--sh:${calm ? 0.14 : p.sh}">${Array.from({ length: n }, (_, k) => `<i class="fw-s" style="--i:${k};left:${k * sw}px;width:${sw + 1}px;height:${H}px"><b style="${bg}background-position:${-k * sw}px 0"></b></i>`).join("")}<em class="fw-clip"><s class="fw-ln" style="--y:22%;--t:1.5s"></s><s class="fw-ln" style="--y:58%;--t:1.9s;--w:60px"></s><s class="fw-ln" style="--y:84%;--t:1.3s"></s></em></span>`;
    F.wrap.classList.add("fw-wrap"); const w = S.fw = { board: F.stage.firstChild, gust: !calm && p.gust }; say("gust");
    if (w.gust) later(function g() { if (S.fw !== w) return; if (!phaseOk()) return later(g, 400); w.board.classList.add("gust"); say("gust"); later(() => w.board.classList.remove("gust"), 1300); later(g, 2700 + Math.random() * 2200); }, 1700 + Math.random() * 1400);
  }
  const fwStill = () => { const w = S.fw; S.fw = null; if (w && w.board.isConnected) w.board.classList.add("still"); };
  /* un solo punto de entrada desde flagClass(): la bandera se mete en su envoltorio y cada reto la transforma */
  function flagNew(el, o) {
    S.fb = S.fz = S.fw = null; const ids = kindOn("flag").map(c => c.id).filter(id => id === "flagback" || id === "flagpuzzle" || id === "flagwind"); if (!ids.length || !o || !o.name) return;
    const F = flagWrap(el, o); if (!F) return;
    if (has("flagpuzzle")) flagPuzzle(F, get("flagpuzzle"), o); else if (has("flagwind")) flagWind(F, get("flagwind"), o);
    if (has("flagback")) flagBack(F, get("flagback"), o);
  }
  /* ------------------------------------------------------------------ Pasaporte falso */
  const FP_NEIGH = {zimbabwe:"zambia southafrica mozambique botswana",zambia:"zimbabwe tanzania namibia mozambique malawi democraticrepublicofthecongo angola",yemen:"saudiarabia oman",vietnam:"laos china cambodia",venezuela:"guyana colombia brazil",vaticancity:"italy",vanuatu:"solomonislands",uzbekistan:"turkmenistan tajikistan kyrgyzstan kazakhstan afghanistan",uruguay:"brazil argentina",federatedstatesofmicronesia:"palau",marshallislands:"kiribati",unitedstates:"mexico canada",unitedkingdom:"ireland",unitedarabemirates:"saudiarabia oman",ukraine:"slovakia russia romania poland moldova hungary belarus",uganda:"tanzania southsudan rwanda kenya democraticrepublicofthecongo",turkmenistan:"uzbekistan kazakhstan iran afghanistan",turkey:"syria iraq iran greece georgia bulgaria azerbaijan armenia",tunisia:"libya algeria",trinidadandtobago:"venezuela",tonga:"fiji",togo:"ghana burkinafaso benin",timorleste:"indonesia",thailand:"malaysia laos cambodia myanmar",tanzania:"zambia uganda rwanda mozambique malawi kenya democraticrepublicofthecongo burundi",tajikistan:"uzbekistan kyrgyzstan china afghanistan",syria:"turkey lebanon jordan israel iraq",switzerland:"liechtenstein italy germany france austria",sweden:"norway finland",eswatini:"southafrica mozambique",suriname:"guyana france brazil",southsudan:"uganda sudan kenya ethiopia democraticrepublicofthecongo centralafricanrepublic",sudan:"southsudan libya ethiopia eritrea egypt chad centralafricanrepublic",srilanka:"india",spain:"portugal france andorra",southkorea:"northkorea",southafrica:"zimbabwe eswatini namibia mozambique lesotho botswana",somalia:"kenya ethiopia",solomonislands:"papuanewguinea",slovakia:"ukraine poland hungary czechrepublic austria",slovenia:"italy hungary croatia austria",singapore:"malaysia",sierraleone:"liberia guinea",seychelles:"madagascar",serbia:"romania montenegro northmacedonia hungary croatia bulgaria bosniaandherzegovina",senegal:"mauritania mali guineabissau guinea thegambia",saudiarabia:"yemen unitedarabemirates qatar oman kuwait jordan iraq",saotomeandprincipe:"equatorialguinea",sanmarino:"italy",samoa:"tonga",saintvincentandthegrenadines:"saintlucia",saintlucia:"saintvincentandthegrenadines",saintkittsandnevis:"antiguaandbarbuda",rwanda:"uganda tanzania democraticrepublicofthecongo burundi",russia:"ukraine poland norway northkorea mongolia lithuania latvia kazakhstan georgia finland estonia china belarus azerbaijan",romania:"ukraine serbia moldova hungary bulgaria",qatar:"saudiarabia",portugal:"spain",poland:"ukraine slovakia russia lithuania germany czechrepublic belarus",philippines:"malaysia",peru:"ecuador colombia chile brazil bolivia",paraguay:"brazil bolivia argentina",papuanewguinea:"indonesia",panama:"costarica colombia",palau:"philippines",pakistan:"iran india china afghanistan",oman:"yemen unitedarabemirates saudiarabia",norway:"sweden russia finland",northkorea:"southkorea russia china",nigeria:"niger chad cameroon benin",niger:"nigeria mali libya chad burkinafaso benin algeria",nicaragua:"honduras costarica",newzealand:"australia",cookislands:"kiribati",netherlands:"germany belgium",aruba:"venezuela",curacao:"netherlands",nepal:"india china",nauru:"kiribati",namibia:"zambia southafrica botswana angola",mozambique:"zimbabwe zambia tanzania eswatini southafrica malawi",morocco:"algeria",montenegro:"serbia croatia bosniaandherzegovina albania",mongolia:"russia china",moldova:"ukraine romania",monaco:"france",mexico:"unitedstates guatemala belize",mauritius:"madagascar",mauritania:"senegal mali algeria",malta:"italy",mali:"senegal niger mauritania guinea ivorycoast burkinafaso algeria",maldives:"india",malaysia:"thailand indonesia brunei",malawi:"zambia tanzania mozambique",madagascar:"mozambique",northmacedonia:"serbia greece bulgaria albania",luxembourg:"germany france belgium",lithuania:"russia poland latvia belarus",liechtenstein:"switzerland austria",libya:"tunisia sudan niger egypt chad algeria",liberia:"sierraleone guinea ivorycoast",lesotho:"southafrica",lebanon:"syria israel",latvia:"russia lithuania estonia belarus",laos:"vietnam thailand china cambodia myanmar",kyrgyzstan:"uzbekistan tajikistan kazakhstan china",kuwait:"saudiarabia iraq",kiribati:"nauru",kenya:"uganda tanzania southsudan somalia ethiopia",kazakhstan:"uzbekistan turkmenistan russia kyrgyzstan china",jordan:"syria saudiarabia israel iraq",japan:"russia",jamaica:"cuba",italy:"vaticancity switzerland slovenia sanmarino france austria",israel:"syria lebanon jordan egypt",ireland:"unitedkingdom",iraq:"turkey syria saudiarabia kuwait jordan iran",iran:"turkmenistan turkey pakistan iraq azerbaijan armenia afghanistan",indonesia:"timorleste papuanewguinea malaysia",india:"pakistan nepal china myanmar bhutan bangladesh",iceland:"greenland",hungary:"ukraine slovakia slovenia serbia romania croatia austria",honduras:"nicaragua guatemala elsalvador",haiti:"dominicanrepublic",guyana:"venezuela suriname brazil",guineabissau:"senegal guinea",guinea:"sierraleone senegal mali liberia guineabissau ivorycoast",guatemala:"mexico honduras elsalvador belize",grenada:"saintvincentandthegrenadines",greece:"turkey northmacedonia bulgaria albania",ghana:"togo ivorycoast burkinafaso",germany:"switzerland poland netherlands luxembourg france denmark czechrepublic belgium austria",georgia:"turkey russia azerbaijan armenia",thegambia:"senegal",gabon:"equatorialguinea republicofthecongo cameroon",france:"switzerland spain monaco luxembourg italy germany belgium andorra",finland:"sweden russia norway",fiji:"tonga",ethiopia:"southsudan sudan somalia kenya eritrea djibouti",estonia:"russia latvia",eritrea:"sudan ethiopia djibouti",equatorialguinea:"gabon cameroon",elsalvador:"honduras guatemala",egypt:"sudan libya israel",ecuador:"peru colombia",dominicanrepublic:"haiti",dominica:"antiguaandbarbuda",djibouti:"ethiopia eritrea",greenland:"canada",denmark:"germany",czechrepublic:"slovakia poland germany austria",cyprus:"turkey",cuba:"haiti",croatia:"slovenia serbia montenegro hungary bosniaandherzegovina",ivorycoast:"mali liberia guinea ghana burkinafaso",costarica:"panama nicaragua",democraticrepublicofthecongo:"zambia uganda tanzania southsudan rwanda republicofthecongo centralafricanrepublic burundi angola",republicofthecongo:"gabon democraticrepublicofthecongo centralafricanrepublic cameroon angola",comoros:"madagascar",colombia:"venezuela peru panama ecuador brazil",china:"vietnam tajikistan russia pakistan northkorea nepal mongolia laos kyrgyzstan kazakhstan india myanmar bhutan afghanistan",chile:"peru bolivia argentina",chad:"sudan nigeria niger libya centralafricanrepublic cameroon",centralafricanrepublic:"southsudan sudan democraticrepublicofthecongo republicofthecongo chad cameroon",capeverde:"senegal",canada:"unitedstates",cameroon:"nigeria gabon equatorialguinea republicofthecongo chad centralafricanrepublic",cambodia:"vietnam thailand laos",myanmar:"thailand laos india china bangladesh",burundi:"tanzania rwanda democraticrepublicofthecongo",burkinafaso:"togo niger mali ghana ivorycoast benin",bulgaria:"turkey serbia romania northmacedonia greece",brunei:"malaysia",brazil:"venezuela uruguay suriname peru paraguay guyana colombia bolivia argentina",botswana:"zimbabwe southafrica namibia",bosniaandherzegovina:"serbia montenegro croatia",bolivia:"peru paraguay chile brazil argentina",bhutan:"india china",benin:"togo nigeria niger burkinafaso",belize:"mexico guatemala",belgium:"netherlands luxembourg germany france",belarus:"ukraine russia poland lithuania latvia",barbados:"saintlucia",bangladesh:"india myanmar",bahrain:"saudiarabia",thebahamas:"cuba",azerbaijan:"turkey russia iran georgia armenia",austria:"switzerland slovakia slovenia liechtenstein italy hungary germany czechrepublic",australia:"indonesia",armenia:"turkey iran georgia azerbaijan",argentina:"uruguay paraguay chile brazil bolivia",antiguaandbarbuda:"saintkittsandnevis",angola:"zambia namibia democraticrepublicofthecongo republicofthecongo",andorra:"spain france",algeria:"tunisia niger morocco mauritania mali libya",albania:"montenegro northmacedonia greece",afghanistan:"uzbekistan turkmenistan tajikistan pakistan iran china"};
  const FP_CEN = {zimbabwe:[29.1,-19],zambia:[27.8,-13.1],yemen:[47.9,15.8],vietnam:[105.8,16],venezuela:[-66.6,6.4],vaticancity:[12.4,41.9],vanuatu:[166.9,-15.1],uzbekistan:[64.6,41.4],uruguay:[-55.8,-32.5],federatedstatesofmicronesia:[158.2,6.9],marshallislands:[171.2,7.1],unitedstates:[-95.8,37.3],unitedkingdom:[-2.2,54.3],unitedarabemirates:[54,24.3],ukraine:[31.1,48.4],uganda:[32.3,1.4],turkmenistan:[59.6,39],turkey:[35.5,38.9],tunisia:[9.5,33.8],trinidadandtobago:[-61.4,10.5],tonga:[-175.2,-21.2],togo:[0.8,8.6],timorleste:[126.1,-8.9],thailand:[101.5,13],tanzania:[34.9,-6.4],tajikistan:[71.2,38.9],syria:[39.1,34.8],switzerland:[8.2,46.8],sweden:[17.7,62.2],eswatini:[31.4,-26.5],suriname:[-56,3.9],southsudan:[29.7,7.9],sudan:[30.2,15.4],srilanka:[80.8,7.9],spain:[-3,39.9],southkorea:[127.9,36.5],southafrica:[24.7,-28.5],somalia:[46.2,5.1],solomonislands:[159.2,-8.1],slovakia:[19.7,48.7],slovenia:[14.9,46.1],singapore:[103.8,1.4],sierraleone:[-11.8,8.5],seychelles:[55.5,-4.7],serbia:[20.9,44.2],senegal:[-14.5,14.5],saudiarabia:[45.1,24.2],saotomeandprincipe:[6.6,0.2],sanmarino:[12.5,43.9],samoa:[-172.5,-13.6],saintvincentandthegrenadines:[-61.2,13.3],saintlucia:[-61,13.9],saintkittsandnevis:[-62.7,17.3],rwanda:[29.9,-1.9],russia:[-0.1,59.5],romania:[25,46],qatar:[51.2,25.4],portugal:[-7.8,39.6],poland:[19.1,51.9],philippines:[122,15.6],peru:[-75,-9.2],paraguay:[-58.4,-23.4],papuanewguinea:[145.9,-6.6],panama:[-80.1,8.4],palau:[134.6,7.5],pakistan:[68.9,30.4],oman:[55.9,20.8],norway:[17.9,64.6],northkorea:[127.5,40.4],nigeria:[8.7,9.1],niger:[8.1,17.6],nicaragua:[-85.4,12.9],newzealand:[170.4,-43.6],cookislands:[-159.8,-21.2],netherlands:[5.3,52.1],aruba:[-70,12.5],curacao:[-69,12.2],nepal:[84.1,28.4],nauru:[166.9,-0.5],namibia:[18.5,-23],mozambique:[35.5,-18.7],morocco:[-9,28.7],montenegro:[19.4,42.7],mongolia:[103.8,46.9],moldova:[28.4,47],monaco:[7.4,43.8],mexico:[-102,23.6],mauritius:[57.6,-20.3],mauritania:[-10.9,21],malta:[14.5,35.9],mali:[-4,17.6],maldives:[73.5,4.2],malaysia:[114.4,3.9],malawi:[34.3,-13.3],madagascar:[46.9,-18.8],northmacedonia:[21.7,41.6],luxembourg:[6.1,49.8],lithuania:[23.9,55.2],liechtenstein:[9.5,47.2],libya:[17.2,26.3],liberia:[-9.5,6.4],lesotho:[28.2,-29.6],lebanon:[35.8,33.9],latvia:[24.6,56.9],laos:[103.9,18.2],kyrgyzstan:[74.7,41.2],kuwait:[47.5,29.3],kiribati:[-157.4,1.9],kenya:[37.9,0.4],kazakhstan:[67,48],jordan:[37.1,31.3],japan:[136.4,37.5],jamaica:[-77.3,18.1],italy:[12.6,42.5],israel:[35.1,31.5],ireland:[-8.2,53.4],iraq:[43.7,33.2],iran:[53.7,32.4],indonesia:[100.6,-0.1],india:[82.8,21.8],iceland:[-19,65],hungary:[19.5,47.2],honduras:[-86.3,14.5],haiti:[-73.1,19],guyana:[-58.9,4.9],guineabissau:[-15.2,11.8],guinea:[-11.4,9.9],guatemala:[-90.2,15.8],grenada:[-61.7,12.1],greece:[23.3,39.1],ghana:[-1,8],germany:[10.4,51.1],georgia:[43.3,42.3],thegambia:[-15.3,13.4],gabon:[11.6,-0.8],france:[1.7,46.7],finland:[26.1,64.9],fiji:[0,-16.5],ethiopia:[40.5,9.2],estonia:[25.8,58.6],eritrea:[39.8,15.2],equatorialguinea:[10.4,1.6],elsalvador:[-88.9,13.8],egypt:[30.8,26.8],ecuador:[-78.1,-1.8],dominicanrepublic:[-70.2,18.8],dominica:[-61.4,15.4],djibouti:[42.6,11.8],greenland:[-42.1,71.7],denmark:[9.5,56.3],czechrepublic:[15.5,49.8],cyprus:[33.2,34.9],cuba:[-79.5,21.5],croatia:[16.5,44.7],ivorycoast:[-5.6,7.5],costarica:[-84.2,9.6],democraticrepublicofthecongo:[21.7,-4.1],republicofthecongo:[14.9,-0.7],comoros:[43.4,-11.6],colombia:[-73,4.1],china:[104.2,36.9],chile:[-71.4,-35.7],chad:[18.7,15.5],centralafricanrepublic:[20.9,6.6],capeverde:[-23.6,15.1],canada:[-98.3,56.8],cameroon:[12.4,7.4],cambodia:[105,12.6],myanmar:[96.7,19.3],burundi:[29.9,-3.4],burkinafaso:[-1.6,12.3],bulgaria:[25.5,42.7],brunei:[114.6,4.5],brazil:[-54.4,-14.2],botswana:[24.7,-22.3],bosniaandherzegovina:[17.7,43.9],bolivia:[-63.6,-16.3],bhutan:[90.4,27.5],benin:[2.3,9.3],belize:[-88.7,17.2],belgium:[4.4,50.5],belarus:[27.9,53.7],barbados:[-59.5,13.2],bangladesh:[90.3,23.7],bahrain:[50.5,26],thebahamas:[-77.5,26.4],azerbaijan:[47.7,40.1],austria:[13.3,47.7],australia:[133.4,-24.9],armenia:[45,40.1],argentina:[-63.6,-37.1],antiguaandbarbuda:[-61.8,17.1],angola:[17.9,-11.9],andorra:[1.6,42.5],algeria:[1.6,28],albania:[20.2,41.1],afghanistan:[67.7,33.9]};   // el centro de cada pais [lon, lat]: de los vecinos, miente uno de los 3 mas cercanos al lugar (Hong Kong no dice Kazajistan)
  let FP_BY = null;
  const ckey = e => { const k = String(e || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, ""); return k === "republicofireland" ? "ireland" : k; };
  const fpBy = () => { if (!FP_BY) { FP_BY = {}; const PC = A.PCOUNTRY || {}; for (const q in PC) FP_BY[ckey(PC[q].en)] = PC[q]; } return FP_BY; };
  const fpOk = q => !!q && q.t === "p" && !q.clue && !!q.sub && Array.isArray(q.cEn) && q.cEn.length === 1 && !!FP_NEIGH[ckey(q.cEn[0])] && !!fpBy()[ckey(q.cEn[0])];
  /* que preguntas de la ronda mienten: n (1, 2 o 3 segun el nivel) de las 5, a la suerte con la semilla; las que no tienen vecino (mares, pistas, paises) no cuentan */
  function fpSet() {
    if (S.fpSet) return S.fpSet; const qs = (A.core && A.core.S && A.core.S.qs) || [], fp = get("fakepass"), n = fp ? par(fp).n : 1;
    return (S.fpSet = new Set(A.rng(`${S.seed}:fp:${S.round}`).shuffle(qs.map((q, i) => (fpOk(q) ? i : -1)).filter(i => i >= 0)).slice(0, n)));
  }
  function fpLie(o, qi) {
    if (!fpOk(o) || !fpSet().has(qi)) return null; const ks = FP_NEIGH[ckey(o.cEn[0])].split(" ").filter(k => fpBy()[k]);
    if (o.lat != null && o.lon != null) ks.sort((a, b) => (FP_CEN[a] ? A.geo.haversine(o.lat, o.lon, FP_CEN[a][1], FP_CEN[a][0]) : 1e9) - (FP_CEN[b] ? A.geo.haversine(o.lat, o.lon, FP_CEN[b][1], FP_CEN[b][0]) : 1e9));
    return ks.length ? fpBy()[A.rng(`${S.seed}:fpn:${S.round}:${qi}:${o.name.en}`).pick(ks.slice(0, 3))] : null;
  }
  /* el pais de debajo se estampa como en un pasaporte (en TODAS las preguntas de la ronda, mientan o no) */
  function passStart(sub, o) {
    S.fp = null; if (!sub || !o.sub || o.clue || has("nocountry")) return;
    const lie = fpLie(o, S.q), real = A.tx(o.sub), shown = lie ? A.tx(lie) : real; S.fp = { lie: lie ? shown : null, real };
    sub.innerHTML = `<span class="fp-stamp">${esc(shown)}</span>`; sub.classList.add("ch-pass"); say("passStamp");
  }
  function passReveal() {
    const sub = $("askSub"), fp = S.fp; if (!sub || !fp) return; sub.classList.remove("ch-pass");
    if (fp.lie) { sub.innerHTML = `<span class="fp-fake"><s>${esc(fp.lie)}</s><b class="fp-sello">${esc(A.tx(FP_FALSE))}</b></span><i class="fp-arr"></i><span class="fp-real">${esc(fp.real)}</span>`; say("passFalse"); }
    else sub.innerHTML = `<span class="fp-ok">${esc(fp.real)}</span>`;
  }
  /* ------------------------------------------------------------------ Panel de salidas (split-flap) */
  const SF_LAT = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", SF_CYR = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ", SF = { t: 0, tiles: [], el: 0, on: false, led: null, sub: null, done: false, idle: 0 };
  const sfPut = (t, ch) => { t.cur = ch; t.u.textContent = t.l.textContent = t.fu.textContent = t.fl.textContent = ch; };
  function sfFlip(t, ch, fast) {
    if (t.cur === ch) return; const old = t.cur;
    if (calmMo() || !t.fuE.animate) { sfPut(t, ch); return; }
    if (t.a2) { t.a1.cancel(); t.a2.cancel(); t.l.textContent = old; }               // el giro anterior no acabo: se da por aterrizado
    t.u.textContent = ch; t.fu.textContent = old; t.fl.textContent = ch; t.cur = ch; const d = fast ? 28 : 36;
    t.a1 = t.fuE.animate([{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }], { duration: d, easing: "ease-in", fill: "forwards" });
    t.a2 = t.flE.animate([{ transform: "rotateX(90deg)" }, { transform: "rotateX(0deg)" }], { duration: d, delay: d, easing: "ease-out", fill: "both" });
    t.a2.onfinish = () => { t.l.textContent = ch; t.fu.textContent = ch; if (t.a1) t.a1.cancel(); if (t.a2) t.a2.cancel(); t.a1 = t.a2 = null; };
  }
  function boardStop() { clearTimeout(SF.t); SF.on = false; SF.tiles.forEach(t => { if (t.a1) { t.a1.cancel(); t.a2.cancel(); t.a1 = t.a2 = null; } }); }
  function boardEnd(quiet) {                                                         // todas fijas: el piloto en verde, el pais a la vista y el timbre
    SF.done = true; SF.on = false; clearTimeout(SF.t); if (SF.led) SF.led.classList.add("ok");
    if (SF.sub && SF.sub.isConnected) { const o = A.core && A.core.S.qs[A.core.S.qi]; if (o && o.sub) { A.renderBlanks(SF.sub, A.tx(o.sub)); SF.sub.classList.remove("ch-covered"); if (!quiet && !calmMo()) SF.sub.classList.add("sf-pop"); } }
    if (!quiet) say("boardDone");
  }
  function boardFinal() { if (!SF.tiles.length) return; boardStop(); SF.tiles.forEach(t => sfPut(t, t.fin)); boardEnd(true); SF.tiles = []; }
  function boardStart(el, sub, o, text, c) {
    boardStop(); SF.tiles = []; SF.done = false;
    const chars = [...text], letters = chars.filter(ch => /\p{L}/u.test(ch)).length; if (letters < 2 || letters > 28 || o.clue || CJK.test(text)) return false;
    const p = par(c), cyr = /[Ѐ-ӿ]/.test(text), POOL = [...(cyr ? SF_CYR : SF_LAT)], words = text.split(/\s+/).filter(Boolean);
    const up = ch => { const u = ch.toLocaleUpperCase(); return [...u].length === 1 ? u : ch; };
    const fs0 = parseFloat(getComputedStyle(el).fontSize) || 40, Wp = Math.max(240, (el.clientWidth || 520) - 70), nT = chars.length - words.length + 1;
    const f1 = (Wp - 2 * nT) / (0.64 * nT + 0.55 * (words.length - 1) + 0.9), f = Math.round(Math.max(14, Math.min(fs0, f1 >= 22 ? f1 : Math.min(f1 * 1.8, 30))));
    const rr = A.rng(`${S.seed}:sf:${S.round}:${S.q}:${text}`), tileHtml = ch => `<b class="sf-t"><i class="sf-u"><u>${esc(ch)}</u></i><i class="sf-l"><u>${esc(ch)}</u></i><i class="sf-fu"><u>${esc(ch)}</u></i><i class="sf-fl"><u>${esc(ch)}</u></i></b>`;
    const rnd = () => POOL[Math.floor(rr() * POOL.length)];
    let html = "", idx = 0; const meta = [];
    words.forEach(w => { html += '<span class="sf-w">'; for (const ch of w) { if (/\p{L}/u.test(ch)) { const st = rnd(); html += tileHtml(st); meta.push({ fin: up(ch), st }); idx++; } else html += `<b class="sf-x">${esc(ch)}</b>`; } html += "</span>"; });
    el.innerHTML = `<span class="sf-board" style="--sf:${f}px"><i class="sf-led"></i><span class="sf-in">${html}</span></span>`; el.classList.add("ch-board");
    const tl = [...el.querySelectorAll(".sf-t")], n = tl.length, order = p.rnd ? rr.shuffle(tl.map((_, i) => i)) : tl.map((_, i) => i), gap = Math.min(p.gap, p.cap / Math.max(1, n - 1));
    tl.forEach((b, i) => { const h = b.children, m = meta[i], t = { b, fuE: h[2], flE: h[3], u: h[0].firstChild, l: h[1].firstChild, fu: h[2].firstChild, fl: h[3].firstChild, cur: m.st, fin: m.fin, at: 0, nt: 0, set: false, slip: 0 }; t.at = p.lead + order.indexOf(i) * gap * (0.85 + rr() * 0.3); t.nt = Math.floor(rr() * 90); SF.tiles.push(t); });
    SF.led = el.querySelector(".sf-led"); SF.sub = null; SF.el = 0; SF.on = true; const last = Math.max(...SF.tiles.map(t => t.at));
    if (p.cover && sub && o.sub) { sub.innerHTML = '<span class="ch-redact">▮▮▮▮▮▮</span>'; sub.classList.add("ch-covered"); SF.sub = sub; }
    let prev = performance.now(), lastRoll = 0, nextSlip = 1500 + rr() * 900;
    SF.t = setTimeout(function tick() {
      if (!SF.on) return; const now = performance.now(), dt = Math.min(120, now - prev); prev = now; SF.t = setTimeout(tick, 34);
      if (!phaseOk()) { const g = A.core && A.core.S; if (g && g.phase !== "asking" && ++SF.idle > 240) boardStop(); return; }   // pausa: espera; fuera de la pregunta (se abandono la partida): se apaga
      SF.idle = 0; SF.el += dt; const e = SF.el; let flips = 0, sets = 0, open = 0;
      if (p.churn && e > nextSlip && e < last + 200) {                              // a nivel 3, de vez en cuando una ya fija se suelta y vuelve a girar
        const fixed = SF.tiles.filter(t => t.set); if (fixed.length) { const t = fixed[Math.floor(Math.random() * fixed.length)]; t.set = false; t.at = e + 350 + Math.random() * 350; t.nt = e; } nextSlip = e + 700 + Math.random() * 700;
      }
      for (const t of SF.tiles) {
        if (t.set) continue; open++;
        if (e >= t.at) { sfFlip(t, t.fin); t.set = true; sets++; open--; continue; }
        if (e >= t.nt) { let ch = rnd(); if (ch === t.cur) ch = rnd(); sfFlip(t, ch, true); flips++; t.nt = e + (p.churn ? 42 + Math.random() * 38 : 62 + Math.random() * 50); }
      }
      if (flips && e - lastRoll > 70) { lastRoll = e; say("flapRoll", flips); }
      if (sets) say("flapSet", sets);
      if (!open && e >= last) boardEnd(false);
    }, 34);
    return true;
  }

  /* ------------------------------------------------------------------ bandera: filtro CSS para js/adventure.js (renderFlag) */
  A.chal.flagFx = () => {
    if (S.suspended || !S.on) return null;
    const f = kindOn("flag").map(c => {
      const p = par(c);
      switch (c.id) {
        case "flaginvert": return S.fx.noNegative ? null : "invert(1)";              // el Sello de la casa le devuelve sus colores
        case "flaghue": return `hue-rotate(${p.deg}deg)`;
        case "flagblur": return `blur(${p.px}px)`;
        case "flagdark": return `brightness(${p.b})`;
        case "flaggray": return `grayscale(${p.amt})`;
        default: return null;
      }
    }).filter(Boolean);
    return f.length ? f.join(" ") : null;
  };

  function flagClass(el, o) {
    const img = el && el.querySelector(".ask-flag"); if (!img || S.suspended || !S.on) return;
    kindOn("flag").forEach(c => {
      const p = par(c); img.classList.add("fx-" + c.id);
      if (c.id === "flaghue") { img.style.setProperty("--fh0", (p.deg * 0.6) + "deg"); img.style.setProperty("--fh1", (p.deg * 1.4) + "deg"); img.style.setProperty("--fns", (p.spd || 3.4) + "s"); }
      if (c.id === "flagdark") img.style.setProperty("--fb", p.b);
    });
    flagNew(el, o);   // tanda 14: la bandera de espaldas, a trozos o al viento
  }

  /* ------------------------------------------------------------------ API */
  Object.assign(A.chal, {
    begin(list, fx, ctx = {}) {
      this.end(); S.pub = list.map(canon); S.list = expand(S.pub); S.qlist = null; S.qsub = null; S.fx = fx || A.chal.fx([]); S.halve = ctx.halve || 1; S.seed = ctx.seed || "s"; S.round = ctx.round || 0; S.on = true; S.suspended = false; S.q = 0; S.fpSet = null; S.bk = ctx.boss || null; S.asc = ctx.asc || 0; S.topic = ctx.topic || null; S.cjk = !!ctx.cjk; S.bl = null; if (A.chfx && A.chfx.reset) A.chfx.reset(); if (A.jefes) A.jefes.begin();   // tanda 6: S.pub, los retos de la ronda; S.list, sus efectos
      S.map = A.core && A.core.map; if (S.map) ensureOverlay(S.map);
      /* retos que mueven continentes: su colocacion se deja calculada mientras se presenta la ronda (con el mapa ya quieto), no al empezar la pregunta */
      const LAYIDS = ["pangea", "spread", "tilt", "deal", "giants"], Ls = S.bk && BX[S.bk] ? [0, 1, 2, 3, 4].map(qi => [qi, bossQ(qi)]).filter(([, l]) => l.some(c => LAYIDS.includes(c.id))) : null;   // un jefe: la colocacion de CADA pregunta se deja calculada en la intro
      if (S.map && S.map.layout && (Ls ? Ls.length : S.list.some(c => LAYIDS.includes(c.id)))) {
        const idle = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 0));
        /* Continentes barajados: primero los objetivos de la ronda y la preparacion de la mesa, cada cosa en su hueco libre (juntas pasaban de 60 ms) */
        const hasDeal = Ls ? Ls.some(([, l]) => l.some(c => c.id === "deal")) : has("deal"), steps = (hasDeal ? [() => roundPts(S.map), () => S.map.warmMix && S.map.warmMix()] : []).concat(Ls ? Ls.map(([qi, l]) => () => mapSpec(S.map, null, l, qi)) : [() => mapSpec(S.map, null)]);
        const next = () => { const f = steps.shift(); if (f) idle(() => { if (S.on && S.map) try { f(); } catch (e) { /* ya se calculara en la pregunta */ } next(); }); };
        clearTimeout(S.preT); S.preT = setTimeout(next, 1300);       // fuera de S.timers: si saltas la intro, la pregunta no lo cancela (se calculaba todo de golpe al empezarla)
      }
    },
    active: () => S.pub.slice(),
    has,
    lensRadius: () => (S.suspended ? 0 : has("wrongborders") ? S.fx.trueR : has("noborders") ? S.fx.peekR : 0),
    question(o, qi = 0, opt = {}) {
      const map = S.map = (A.core && A.core.map) || S.map; if (!map || !S.on) return; S.q = qi; S.suspended = false; clearTimers(); ensureOverlay(map); S.bl = S.bk ? bossQ(qi) : null;
      decorate(o); trapMark(o);
      S.calm = opt.calm || null; if (S.calm) S.qlist = cur().filter(c => !S.calm.includes(D[c.id].fam));   // tanda 9: Sangre fria apaga en esta pregunta los retos de puntero y pantalla
      const spec = map.setDistort ? mapSpec(map, o, null, qi) : null, app = $("app");
      if (spec) { map.setDistort(spec, spec.ms || 900); say("chal"); } else if (map.clearDistort) map.clearDistort(300);
      if (spec && spec.deal && A.core && A.core.S) A.core.S.limit += spec.ms / 1000;   // mientras se reparten las cartas no se puede responder: ese tiempo se devuelve
      if (cur().some(c => D[c.id].kind === "map")) { app.classList.remove("ch-glitch"); A.restyle(app); app.classList.add("ch-glitch"); later(() => app.classList.remove("ch-glitch"), 600); }
      app.classList.toggle("ch-negative", has("negative") && !S.fx.noNegative);
      ensureOverlay(map).classList.add("on");
      const bl = get("blur"), dk = get("dark"), cl = get("clouds"), rn = get("rain"), my = get("myopia"), bs = get("blindspot"), dc = get("decoys");
      const L = layer("blur"), M = layer("myopia"), M2 = layer("myopia2"), K = layer("dark"), H = layer("halo"), Sp = layer("spot"), CX = A.chfx, PX = !!(CX && CX.ok());
      if (bl) { const p = par(bl); L.style.setProperty("--bl", p.px.toFixed(1) + "px"); L.style.setProperty("--lr", (S.fx.lensR ? S.fx.lensR : -60) + "px"); L.classList.add("on"); } else L.classList.remove("on");
      if (my) { const p = par(my); for (const m of [M, M2]) { m.style.setProperty("--mr", p.r + "px"); m.classList.add("on"); } } else { M.classList.remove("on"); M2.classList.remove("on"); }
      if (bs && !PX) { const p = par(bs); Sp.style.setProperty("--sr", p.r + "px"); Sp.classList.add("on"); } else Sp.classList.remove("on");
      if (dk && !PX) { const p = par(dk); app.style.setProperty("--dr", p.r + "px"); app.style.setProperty("--da", p.a.toFixed(3)); K.classList.add("on"); H.classList.add("on"); H.classList.toggle("warm", !!S.fx.halo); } else { K.classList.remove("on"); H.classList.remove("on"); }
      if (dk) say("dark");
      if (cl && !PX) fxStart("smoke", par(cl).cover); else if (rn && !CX) fxStart("rain", par(rn).dens); else fxStop();
      if (CX) { CX.clear(); CX.set(cur(), par, S.fx); }
      /* tanda 7: las Chinchetas trampa llueven durante la primera mitad larga de la pregunta, una tras otra, por todo el mapa */
      if (map.setDecoys) { if (dc) { const L = decoyList(map, o, par(dc).n), lim = ((A.core && A.core.S && A.core.S.limit) || 20) * 1000, t0 = performance.now() + 450, gap = (lim * 0.55) / Math.max(1, L.length), rr = A.rng(`${S.seed}:dr:${S.round}:${S.q}`); L.forEach((d, k) => { d.t0 = t0 + k * gap + rr() * gap * 0.6; later(() => say("pinFall", k, L.length), Math.max(0, d.t0 + 620 - performance.now())); /* suena al clavarse: la caida dura 620 ms */ }); map.setDecoys(L); } else map.setDecoys([]); }
      layer("flick").style.opacity = 0; layer("flash").style.opacity = 0; layer("night").classList.remove("on"); flickerLoop(); lightningLoop(); quakeLoop(); ctrlzLoop(); nightLoop();
      if (A.pointer && A.pointer.mods) A.pointer.mods();
      counterFx(qi);
      if (S.bk) { if (A.jefes) A.jefes.question(o, qi); if (A.adv && A.adv.refresh) A.adv.refresh(); }   // tanda 16: la escalada del jefe (barra, sonido y lo suyo)
    },
    reveal(ms = 750) {
      const map = S.map; clearTimers(); fxStop(); zzClear(); S.nt = null; if (A.jefes) A.jefes.reveal(); if (A.chfx) A.chfx.clear();
      if (S.suspended) boardStop(); else { boardFinal(); passReveal(); fzSolve(); fwStill(); fbReveal(); }   // tanda 14
      if (map && map.clearDistort) { map.clearDistort(ms); if (map.setDecoys) map.setDecoys([]); }
      $("app").classList.remove("ch-negative");
      if (S.ov) { S.ov.classList.remove("on"); for (const c of ["blur", "myopia", "myopia2", "dark", "halo", "spot", "night"]) layer(c).classList.remove("on"); layer("flick").style.opacity = 0; layer("flash").style.opacity = 0; }
      for (const id of ["askName", "askSub"]) { const el = $(id); if (el) { el.classList.remove("ch-fade", "ch-dim", "ch-riddle", "ch-nocountry"); el.querySelectorAll(".gap,.dot,.rune,.faint").forEach(b => { b.classList.remove("gap", "dot", "rune", "faint"); b.textContent = b.dataset.g || b.textContent; }); } }
      const o = A.core && A.core.S.qs[A.core.S.qi], sb = $("askSub"); if (o && sb && o.sub && !o.clue && sb.textContent.includes("▮")) A.renderBlanks(sb, A.tx(o.sub));       // al responder, el pais vuelve
    },
    suspend() { S.suspended = true; this.reveal(500); const o = A.core && A.core.S.qs[A.core.S.qi]; if (o) decorate(o); if (A.pointer && A.pointer.mods) A.pointer.mods(); },
    upright() { const map = S.map; if (map && map.setOrient) map.setOrient(false, 900); },
    end() {
      clearTimers(); clearTimeout(S.preT); fxStop(); zzClear(); trapClear(); S.bk = null; S.bl = null; if (A.jefes) A.jefes.end(); S.nt = null; if (A.chfx) A.chfx.clear(); boardStop(); S.on = false; S.list = []; S.pub = []; S.qlist = null; S.qsub = null; const map = S.map || (A.core && A.core.map);
      if (map && map.clearDistort) { map.clearDistort(300); map.setLens && map.setLens(null); map.setDecoys && map.setDecoys([]); }
      const app = $("app"); if (app) app.classList.remove("ch-negative");
      if (S.ov) { S.ov.classList.remove("on"); for (const c of ["blur", "myopia", "myopia2", "dark", "halo", "spot"]) layer(c).classList.remove("on"); layer("flick").style.opacity = 0; layer("flash").style.opacity = 0; layer("night").classList.remove("on"); }
      clearText(); if (A.pointer && A.pointer.set) A.pointer.set({ tool: null, fx: {}, calm: false, windFn: null, distFn: null, noCountry: false }); if (A.pointer && A.pointer.mods) A.pointer.mods();
    },
    /* Dividir (tanda 12b): el lugar alternativo bajo la placa, con los mismos retos de texto (ninguna de las dos se lee limpia) */
    decoAlt: (el, o) => { if (!S.on || S.suspended || !cur().some(c => D[c.id].kind === "text")) { el.textContent = A.tx(o.name); return; } deco(el, o, o.name, null, true); },
    decorate, par, get, bossQ, inject, T16, tl: k => L6(T16[k]), hasBX: k => !!BX[k], fxNow: () => S.fx, suspended: () => S.suspended, cjkTail: CJK_TAIL, babelAlt,   // babelAlt y decoys: tambien para las pruebas
    decoys: (o, n) => decoyList(S.map || (A.core && A.core.map), o, n),
    /* nota del pie (Libro de la casa, Nota del crupier): con la Adivinanza en la placa, la nota sale tapada igual (si no, la resolvia al instante) */
    noteMask: (o, txt) => (txt && o && S.on && !S.suspended && has("riddle") && !o.clue && riddleText(o) ? maskName(o, txt) : txt),
  });
})(window.AIQ);
