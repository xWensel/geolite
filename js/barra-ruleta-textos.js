/* Geolite - La ruleta de La Barra de la casa: textos en los 12 idiomas (es|en|fr|pt|de|it||zh|ko|ja|ru|pl; el hueco vacio es es-419) y las frases del crupier por situacion.
   js/barra-ruleta.js las convierte con A.L6 y elige sin repetir la ultima. El crupier nunca abre con trivia: aqui habla de la propia mesa. */
window.AIQ = window.AIQ || {};
(function (A) {
  A.ruleTx = {
    bet: {
      n: "Ruleta europea|European roulette|Roulette européenne|Roleta europeia|Europäisches Roulette|Roulette europea||欧式轮盘|유러피안 룰렛|ヨーロピアン・ルーレット|Европейская рулетка|Ruletka europejska",
      d: "Una mesa que nunca para: gira cada 45 segundos, haya alguien sentado o no. Elige una ficha y pulsa donde quieras del tapete: números, líneas, esquinas, columnas, docenas, colores. Cada giro en el que apuestas es una jugada.|A table that never stops: it spins every 45 seconds, whether anyone is seated or not. Pick a chip and tap anywhere on the layout: numbers, lines, corners, columns, dozens, colors. Every spin you bet on is one play.|Une table qui ne s'arrête jamais : elle tourne toutes les 45 secondes, qu'il y ait quelqu'un d'assis ou non. Choisis un jeton et touche où tu veux sur le tapis : numéros, lignes, angles, colonnes, douzaines, couleurs. Chaque tour où tu mises compte pour un jeu.|Uma mesa que nunca para: gira a cada 45 segundos, haja alguém sentado ou não. Escolha uma ficha e toque onde quiser no tapete: números, linhas, cantos, colunas, dúzias, cores. Cada giro em que você aposta é uma jogada.|Ein Tisch, der nie anhält: Er dreht sich alle 45 Sekunden, ob jemand sitzt oder nicht. Wähl einen Chip und tipp irgendwo aufs Tableau: Zahlen, Linien, Ecken, Kolonnen, Dutzende, Farben. Jeder Dreh, auf den du setzt, zählt als ein Spiel.|Un tavolo che non si ferma mai: gira ogni 45 secondi, che ci sia qualcuno seduto o no. Scegli una fiche e tocca dove vuoi sul tappeto: numeri, linee, angoli, colonne, dozzine, colori. Ogni giro su cui punti è una giocata.||一张永不停歇的桌子：不管有没有人坐，每 45 秒转一次。选一枚筹码，点桌布上任意位置：数字、线、角、列、打、颜色。你下注的每一转算一局。|멈추지 않는 테이블: 앉은 사람이 있든 없든 45초마다 돌아갑니다. 칩을 고르고 판 위 어디든 누르세요: 숫자, 선, 모서리, 열, 더즌, 색. 베팅한 한 번의 회전이 한 판입니다.|止まらないテーブル：誰が座っていても、いなくても45秒ごとに回ります。チップを選んで、盤面のどこでもタップ。数字、ライン、コーナー、コラム、ダズン、色。賭けた1回転が1プレイです。|Стол, который никогда не останавливается: крутится каждые 45 секунд, сидит за ним кто-то или нет. Выбери фишку и жми в любое место сукна: числа, линии, углы, колонки, дюжины, цвета. Каждый кон со ставкой — один ход.|Stół, który nigdy się nie zatrzymuje: kręci się co 45 sekund, niezależnie od tego, czy ktoś siedzi. Wybierz żeton i stuknij gdziekolwiek na suknie: liczby, linie, rogi, kolumny, tuziny, kolory. Każdy obrót, na który stawiasz, to jedna gra.",
      s: "Gira cada 45 s: tú pones las fichas.|Spins every 45 s: you place the chips.|Tourne toutes les 45 s : tu poses les jetons.|Gira a cada 45 s: você põe as fichas.|Dreht alle 45 s: du setzt die Chips.|Gira ogni 45 s: le fiches le metti tu.||每 45 秒转一次，筹码由你来放。|45초마다 회전, 칩은 직접 놓으세요.|45秒ごとに回る。チップは自分で置く。|Крутится каждые 45 с, фишки ставишь ты.|Kręci się co 45 s, żetony stawiasz ty.",
    },
    ui: {
      sit: "Sentarse|Sit down|S'asseoir|Sentar|Hinsetzen|Siediti||坐下|앉기|座る|Сесть|Usiądź",
      stand: "Levantarse|Stand up|Se lever|Levantar|Aufstehen|Alzati||起身|일어나기|席を立つ|Встать|Wstań",
      open: "Apuestas abiertas|Bets open|Mises ouvertes|Apostas abertas|Einsätze offen|Puntate aperte||开始下注|베팅 오픈|ベット受付中|Ставки открыты|Zakłady otwarte",
      closed: "No va más|No more bets|Rien ne va plus|Não vai mais|Nichts geht mehr|Nulla va più||停止下注|베팅 마감|ベット締切|Ставок больше нет|Koniec zakładów",
      out: "Sale el {n}|{n} comes up|Le {n} sort|Sai o {n}|Die {n} fällt|Esce il {n}||开出 {n}|{n} 나왔다|{n} が出た|Выпало {n}|Wypadło {n}",
      bal: "Saldo|Balance|Solde|Saldo|Guthaben|Saldo||余额|잔액|残高|Баланс|Saldo",
      staked: "Apostado|Staked|Misé|Apostado|Einsatz|Puntato||已下注|베팅액|賭け額|Ставка|Postawione",
      play: "Jugada {n} de {m}|Play {n} of {m}|Jeu {n} sur {m}|Jogada {n} de {m}|Spiel {n} von {m}|Giocata {n} di {m}||第 {n} 局，共 {m} 局|{n} / {m}번째 판|{n} / {m} プレイ目|Ход {n} из {m}|Gra {n} z {m}",
      undo: "Deshacer|Undo|Annuler|Desfazer|Zurück|Annulla||撤销|되돌리기|元に戻す|Отмена|Cofnij",
      clear: "Borrar|Clear|Effacer|Limpar|Löschen|Cancella||清除|지우기|消去|Сбросить|Wyczyść",
      again: "Repetir|Repeat|Répéter|Repetir|Wiederholen|Ripeti||重复|반복|繰り返す|Повтор|Powtórz",
      dbl: "x2|x2|x2|x2|x2|x2||x2|x2|x2|x2|x2",
      all: "Todo|All in|Tout|Tudo|Alles|Tutto||全部|올인|全部|Всё|Wszystko",
      skip: "Cerrar apuestas ya|Close bets now|Clôturer les mises|Fechar apostas já|Einsätze jetzt schließen|Chiudi le puntate||立即停止下注|지금 마감|今すぐ締切|Закрыть ставки сейчас|Zamknij zakłady teraz",
      chipLbl: "Ficha de {n}|Chip of {n}|Jeton de {n}|Ficha de {n}|Chip {n}|Fiche da {n}||{n} 筹码|{n} 칩|{n} チップ|Фишка {n}|Żeton {n}",
      board: "Marcador de la mesa|Table board|Tableau de la table|Placar da mesa|Tischanzeige|Tabellone del tavolo||牌桌记录|테이블 기록|テーブルの記録|Табло стола|Tablica stołu",
      last: "Último número|Last number|Dernier numéro|Último número|Letzte Zahl|Ultimo numero||上一个号码|마지막 번호|直前の番号|Последнее число|Ostatni numer",
      hot: "Calientes|Hot|Chauds|Quentes|Heiß|Caldi||热门|핫|ホット|Горячие|Gorące",
      cold: "Fríos|Cold|Froids|Frios|Kalt|Freddi||冷门|콜드|コールド|Холодные|Zimne",
      red: "Rojo|Red|Rouge|Vermelho|Rot|Rosso||红|빨강|赤|Красное|Czerwone",
      black: "Negro|Black|Noir|Preto|Schwarz|Nero||黑|검정|黒|Чёрное|Czarne",
      zero: "Cero|Zero|Zéro|Zero|Null|Zero||零|제로|ゼロ|Зеро|Zero",
      even: "Par|Even|Pair|Par|Gerade|Pari||双|짝|偶数|Чёт|Parz.",
      odd: "Impar|Odd|Impair|Ímpar|Ungerade|Dispari||单|홀|奇数|Нечет|Nieparz.",
      low: "Falta 1-18|Low 1-18|Manque 1-18|Falta 1-18|Niedrig 1-18|Manque 1-18||小 1-18|낮음 1-18|ロー 1-18|Малые 1-18|Niskie 1-18",
      high: "Pasa 19-36|High 19-36|Passe 19-36|Passa 19-36|Hoch 19-36|Passe 19-36||大 19-36|높음 19-36|ハイ 19-36|Большие 19-36|Wysokie 19-36",
      dozen: "Docena {a}-{b}|Dozen {a}-{b}|Douzaine {a}-{b}|Dúzia {a}-{b}|Dutzend {a}-{b}|Dozzina {a}-{b}||第 {a}-{b} 打|더즌 {a}-{b}|ダズン {a}-{b}|Дюжина {a}-{b}|Tuzin {a}-{b}",
      column: "Columna {n}|Column {n}|Colonne {n}|Coluna {n}|Kolonne {n}|Colonna {n}||第 {n} 列|{n}열|{n}列目|Колонка {n}|Kolumna {n}",
      straight: "Pleno|Straight up|Plein|Pleno|Plein|Pieno||单号|스트레이트|ストレート|Одно число|Pojedynczy",
      split: "Caballo|Split|Cheval|Cavalo|Cheval|Cavallo||双号|스플릿|スプリット|Сплит|Split",
      street: "Calle|Street|Transversale|Rua|Transversale|Terzina||三号|스트리트|ストリート|Стрит|Street",
      trio: "Trío|Trio|Trio|Trio|Trio|Trio||三号|트리오|トリオ|Трио|Trio",
      corner: "Esquina|Corner|Carré|Esquina|Carré|Quadrato||四号|코너|コーナー|Угол|Narożnik",
      basket: "Cuatro primeros|First four|Les quatre premiers|Quatro primeiros|Erste Vier|Primi quattro||前四号|첫 넷|最初の4つ|Первая четвёрка|Pierwsza czwórka",
      line: "Seisena|Six line|Sixain|Seisena|Sixain|Sestina||六号|식스 라인|シックスライン|Сикс-лайн|Szóstka",
      cover: "cubre {n}|covers {n}|couvre {n}|cobre {n}|deckt {n}|copre {n}||覆盖 {n}|{n}칸|{n}個|покрывает {n}|obejmuje {n}",
      pays: "paga {n} a 1|pays {n} to 1|paie {n} contre 1|paga {n} para 1|zahlt {n} zu 1|paga {n} a 1||赔率 {n} 比 1|{n}배 지급|配当 {n} 倍|платит {n} к 1|płaci {n} do 1",
      hint: "Elige ficha y pulsa donde quieras: en el centro de un número, pleno; en las líneas, caballo; en las esquinas, cuatro números; abajo, columnas, docenas y a la par.|Pick a chip and tap anywhere: the middle of a number is a straight up; lines are splits; corners cover four numbers; below are columns, dozens and even money.|Choisis un jeton et touche où tu veux : le centre d'un numéro est un plein, les lignes des chevaux, les angles quatre numéros ; en bas, colonnes, douzaines et chances simples.|Escolha uma ficha e toque onde quiser: o centro de um número é pleno, as linhas são cavalos, os cantos cobrem quatro números; embaixo, colunas, dúzias e pares.|Wähl einen Chip und tipp irgendwohin: die Mitte einer Zahl ist Plein, Linien sind Cheval, Ecken decken vier Zahlen; unten Kolonnen, Dutzende und einfache Chancen.|Scegli una fiche e tocca dove vuoi: il centro di un numero è pieno, le linee sono cavalli, gli angoli coprono quattro numeri; sotto colonne, dozzine e chances semplici.||选一枚筹码，点任意位置：数字中央为单号，线为双号，角为四号；下方是列、打和对半注。|칩을 고르고 아무 곳이나 누르세요: 숫자 가운데는 스트레이트, 선은 스플릿, 모서리는 4칸, 아래는 열·더즌·짝홀 등입니다.|チップを選んで好きな所をタップ：数字の中央はストレート、線はスプリット、角は4数字、下はコラム・ダズン・偶奇など。|Выбери фишку и жми куда хочешь: центр числа — одно число, линии — сплит, углы — четыре числа, снизу колонки, дюжины и простые шансы.|Wybierz żeton i stuknij gdziekolwiek: środek liczby to pojedynczy numer, linie to split, rogi obejmują cztery liczby; niżej kolumny, tuziny i szanse proste.",
      noChips: "No te llegan las fichas.|Not enough chips.|Pas assez de jetons.|Fichas insuficientes.|Nicht genug Chips.|Fiche insufficienti.||筹码不够。|칩이 부족해요.|チップが足りない。|Не хватает фишек.|Za mało żetonów.",
      win: "Ganas {n}|You win {n}|Tu gagnes {n}|Você ganha {n}|Du gewinnst {n}|Vinci {n}||你赢了 {n}|{n} 획득|{n} 獲得|Выигрыш {n}|Wygrywasz {n}",
      lose: "Pierdes {n}|You lose {n}|Tu perds {n}|Você perde {n}|Du verlierst {n}|Perdi {n}||你输了 {n}|{n} 잃음|{n} 失う|Проигрыш {n}|Przegrywasz {n}",
      streak: "RACHA ×{n}|STREAK ×{n}|SÉRIE ×{n}|SEQUÊNCIA ×{n}|SERIE ×{n}|SERIE ×{n}||连击 ×{n}|연속 ×{n}|連続 ×{n}|СЕРИЯ ×{n}|SERIA ×{n}",
      near: "¡Por una casilla!|One pocket away!|À une case près !|Por uma casa!|Eine Tasche daneben!|A una casella!||只差一格！|한 칸 차이!|あと1マス！|На одну ячейку!|O jedną kieszeń!",
      bote: "¡Jugada de BOTE: paga doble!|BONUS play: pays double!|Jeu BONUS : paie double !|Jogada BÔNUS: paga em dobro!|BONUS-Spiel: zahlt doppelt!|Giocata BONUS: paga doppio!||奖池局：赔付翻倍！|보너스 판: 두 배 지급!|ボーナスプレイ：配当2倍！|Бонусный ход: двойная выплата!|Gra BONUS: podwójna wygrana!",
      live: "Mesa en marcha|Table running|Table en marche|Mesa em andamento|Tisch läuft|Tavolo in corso||牌桌进行中|테이블 진행 중|テーブル稼働中|Стол работает|Stół działa",
    },
    /* clave: [cara, gesto, frases...] */
    lines: {
      ruHello: [
        "Siéntate cuando quieras. La rueda gira sola, con o sin ti.|Sit whenever you like. The wheel spins on its own, with or without you.|Assieds-toi quand tu veux. La roue tourne seule, avec ou sans toi.|Sente quando quiser. A roda gira sozinha, com ou sem você.|Setz dich, wann du willst. Das Rad dreht sich allein, mit dir oder ohne.|Siediti quando vuoi. La ruota gira da sola, con o senza di te.||想坐就坐。轮盘自己转，有你没你都一样。|언제든 앉으세요. 룰렛은 당신이 있든 없든 돕니다.|いつでもどうぞ。ホイールは君がいてもいなくても回る。|Садись когда хочешь. Колесо крутится само, с тобой или без.|Siadaj, kiedy chcesz. Koło kręci się samo, z tobą czy bez.",
        "Hagan juego. O no. A la bola le da igual.|Place your bets. Or don't. The ball doesn't mind.|Faites vos jeux. Ou pas. La bille s'en fiche.|Façam suas apostas. Ou não. A bola não liga.|Machen Sie Ihr Spiel. Oder nicht. Der Kugel ist das egal.|Fate il vostro gioco. O no. Alla pallina non importa.||请下注。不下也行。小球无所谓。|베팅하세요. 안 해도 됩니다. 공은 신경 안 써요.|賭けてください。賭けなくても。玉は気にしません。|Делайте ставки. Или нет. Шарику всё равно.|Proszę stawiać. Albo nie. Kulce to obojętne.",
      ],
      ruOpen: [
        "Hagan juego.|Place your bets.|Faites vos jeux.|Façam suas apostas.|Machen Sie Ihr Spiel.|Fate il vostro gioco.||请下注。|베팅하세요.|賭けてください。|Делайте ставки.|Proszę stawiać.",
        "La mesa está abierta, señores.|The table is open, ladies and gentlemen.|La table est ouverte, mesdames et messieurs.|A mesa está aberta, senhoras e senhores.|Der Tisch ist eröffnet, meine Damen und Herren.|Il tavolo è aperto, signori.||牌桌开了，各位。|테이블이 열렸습니다, 여러분.|テーブルは開いています、皆さん。|Стол открыт, господа.|Stół otwarty, państwo.",
        "Nueva ronda. La suerte no se cansa.|New round. Luck never tires.|Nouveau tour. La chance ne se fatigue pas.|Nova rodada. A sorte não cansa.|Neue Runde. Das Glück wird nie müde.|Nuovo giro. La fortuna non si stanca.||新一轮。运气从不累。|새 라운드. 행운은 지치지 않아요.|新ラウンド。運は疲れない。|Новый кон. Удача не устаёт.|Nowa runda. Szczęście się nie męczy.",
      ],
      ruLate: [
        "Últimas apuestas.|Last bets.|Dernières mises.|Últimas apostas.|Letzte Einsätze.|Ultime puntate.||最后下注。|마지막 베팅.|最後のベット。|Последние ставки.|Ostatnie zakłady.",
        "Les quedan unos segundos. Decídanse.|A few seconds left. Make up your minds.|Il reste quelques secondes. Décidez-vous.|Restam poucos segundos. Decidam-se.|Noch ein paar Sekunden. Entscheiden Sie sich.|Restano pochi secondi. Decidetevi.||只剩几秒，快决定。|몇 초 남았습니다. 결정하세요.|あと数秒。決めてください。|Остались секунды. Решайтесь.|Zostało kilka sekund. Decydujcie.",
      ],
      ruNoMore: [
        "No va más.|No more bets.|Rien ne va plus.|Não vai mais.|Nichts geht mehr.|Nulla va più.||停止下注。|베팅 마감.|ベット締切。|Ставок больше нет.|Koniec zakładów.",
        "Ya no se toca. La bola manda.|Hands off. The ball decides.|On ne touche plus. La bille décide.|Ninguém toca mais. A bola decide.|Hände weg. Die Kugel entscheidet.|Non si tocca più. Decide la pallina.||别碰了，小球说了算。|손대지 마세요. 공이 정합니다.|もう触れない。玉が決める。|Руки прочь. Решает шарик.|Nie dotykamy. Decyduje kulka.",
      ],
      ruRoll: [
        "Ahí va…|Here she goes…|C'est parti…|Lá vai…|Da geht sie…|Eccola…||转起来了……|간다…|いくぞ…|Пошла…|Leci…",
        "Respiren. Es lo único que pueden hacer.|Breathe. It's all you can do.|Respirez. C'est tout ce que vous pouvez faire.|Respirem. É tudo o que podem fazer.|Atmen. Mehr können Sie nicht tun.|Respirate. È tutto ciò che potete fare.||深呼吸，你们只能这样了。|숨 쉬세요. 할 수 있는 건 그것뿐.|息をして。できるのはそれだけ。|Дышите. Больше ничего не сделаешь.|Oddychajcie. Tylko tyle możecie.",
      ],
      ruWin: [
        "Cobre, cobre. La casa lo permite.|Collect. The house allows it.|Encaissez. La maison le permet.|Cobre. A casa permite.|Kassieren Sie. Das Haus erlaubt es.|Incassi. La casa lo permette.||收钱吧，庄家允许。|받아 가세요. 하우스가 허락합니다.|受け取って。店が許す。|Забирайте. Заведение разрешает.|Proszę odebrać. Dom pozwala.",
        "Eso sí que es saber.|Now that's knowing.|Voilà qui s'appelle savoir.|Isso sim é saber.|Das nenne ich Wissen.|Questo sì che è saper fare.||这才叫本事。|이게 바로 실력이죠.|それが腕ってやつだ。|Вот это называется уметь.|To się nazywa umieć.",
      ],
      ruBig: [
        "¡Eso es un pellizco de los grandes!|That's a big pinch!|Quel gros pactole !|Que belo pedaço!|Das ist ein fetter Happen!|Che bel colpo!||好大一笔！|엄청 크게 먹었네요!|これは大きい！|Вот это куш!|Ale kąsek!",
        "La sala entera ha dejado de respirar.|The whole room stopped breathing.|Toute la salle a cessé de respirer.|O salão inteiro parou de respirar.|Der ganze Saal hält den Atem an.|Tutta la sala ha smesso di respirare.||全场都屏住了呼吸。|온 홀이 숨을 멈췄습니다.|会場中が息を止めた。|Весь зал перестал дышать.|Cała sala wstrzymała oddech.",
      ],
      ruStraight: [
        "¡PLENO! Que alguien cierre la puerta.|STRAIGHT UP! Somebody lock the door.|PLEIN ! Que quelqu'un ferme la porte.|PLENO! Alguém tranque a porta.|PLEIN! Schließt mal jemand die Tür.|PIENO! Qualcuno chiuda la porta.||单号命中！快把门关上。|스트레이트! 누가 문 좀 잠가요.|ストレート！誰か扉を閉めて。|ПЛЕН! Кто-нибудь, закройте дверь.|TRAFIONY NUMER! Niech ktoś zamknie drzwi.",
        "Un número entre treinta y siete. Y era el tuyo.|One number in thirty-seven. And it was yours.|Un numéro sur trente-sept. Et c'était le tien.|Um número entre trinta e sete. E era o seu.|Eine Zahl aus siebenunddreißig. Und es war deine.|Un numero su trentasette. Ed era il tuo.||三十七个号码里的一个，正是你的。|37개 중 하나, 그게 당신 거였네요.|37個のうちの1つ。それが君の番号だった。|Одно число из тридцати семи. И оно твоё.|Jedna liczba z trzydziestu siedmiu. I to twoja.",
      ],
      ruLose: [
        "La casa agradece su generosidad.|The house thanks you for your generosity.|La maison vous remercie de votre générosité.|A casa agradece sua generosidade.|Das Haus dankt für Ihre Großzügigkeit.|La casa ringrazia per la generosità.||庄家感谢你的慷慨。|하우스가 호의에 감사드립니다.|店は君の寛大さに感謝する。|Заведение благодарит за щедрость.|Dom dziękuje za hojność.",
        "Otra vez será. La rueda no guarda rencor.|Next time. The wheel holds no grudges.|La prochaine fois. La roue ne garde pas rancune.|Fica para a próxima. A roda não guarda rancor.|Nächstes Mal. Das Rad trägt nichts nach.|Sarà per la prossima. La ruota non serba rancore.||下次吧，轮盘不记仇。|다음에요. 룰렛은 앙심을 품지 않아요.|次があるさ。ホイールは根に持たない。|В другой раз. Колесо зла не держит.|Następnym razem. Koło nie chowa urazy.",
      ],
      ruZero: [
        "Cero. La casa se lo queda todo.|Zero. The house keeps it all.|Zéro. La maison garde tout.|Zero. A casa fica com tudo.|Null. Das Haus behält alles.|Zero. Il banco si prende tutto.||零。庄家通吃。|제로. 하우스가 다 가져갑니다.|ゼロ。店が総取り。|Зеро. Заведение забирает всё.|Zero. Dom zabiera wszystko.",
        "El verde. Siempre el verde.|The green. Always the green.|Le vert. Toujours le vert.|O verde. Sempre o verde.|Das Grün. Immer das Grün.|Il verde. Sempre il verde.||绿色。永远是绿色。|초록색. 언제나 초록색.|緑。いつだって緑。|Зелёное. Всегда зелёное.|Zielone. Zawsze zielone.",
      ],
      ruNear: [
        "Por una casilla. La bola se ha reído de ti.|One pocket off. The ball laughed at you.|À une case près. La bille s'est moquée de toi.|Por uma casa. A bola riu de você.|Eine Tasche daneben. Die Kugel hat dich ausgelacht.|A una casella. La pallina ti ha riso in faccia.||只差一格，小球在笑你。|한 칸 차이. 공이 비웃었네요.|あと1マス。玉が笑ってた。|На одну ячейку. Шарик над тобой посмеялся.|O jedną kieszeń. Kulka się śmiała.",
        "Tan cerca que casi se oye el dinero.|So close you could almost hear the money.|Si près qu'on entendait presque l'argent.|Tão perto que quase dava para ouvir o dinheiro.|So nah, dass man das Geld fast hörte.|Così vicino che si sentiva quasi il denaro.||近得几乎听到钱响了。|돈 소리가 들릴 만큼 가까웠어요.|お金の音が聞こえそうなほど近かった。|Так близко, что почти слышно деньги.|Tak blisko, że prawie słychać pieniądze.",
      ],
      ruNoBet: [
        "Mirar también es una forma de jugar. La barata.|Watching is also a way to play. The cheap one.|Regarder, c'est aussi une façon de jouer. La pas chère.|Olhar também é um jeito de jogar. O barato.|Zuschauen ist auch eine Art zu spielen. Die billige.|Guardare è un modo di giocare. Quello economico.||看着也是一种玩法，最便宜的那种。|구경도 하나의 플레이죠. 가장 싼 쪽.|見ているのも遊び方の1つ。安上がりなやつ。|Смотреть тоже способ играть. Дешёвый.|Patrzenie to też sposób grania. Tani.",
      ],
      ruStreak: [
        "Dos seguidas. La rueda empieza a preocuparse.|Two in a row. The wheel is getting worried.|Deux de suite. La roue commence à s'inquiéter.|Duas seguidas. A roda começa a se preocupar.|Zwei in Folge. Das Rad wird nervös.|Due di fila. La ruota comincia a preoccuparsi.||连赢两把，轮盘开始担心了。|연속 두 번. 룰렛이 불안해합니다.|2連続。ホイールが心配し始めた。|Две подряд. Колесо начинает волноваться.|Dwa z rzędu. Koło zaczyna się martwić.",
      ],
    },
  };
})(window.AIQ);
