/*
 * Geolite - NOTAS DEL PARCHE: los datos (js/parche.js los pinta; css/parche.css los viste).
 *
 * El numero del parche es el de la version del juego (0.3.0, 0.3.1...). El jugador los ve desde el icono del cuaderno, en la esquina
 * inferior izquierda de la portada, y navega por los anteriores en la lista de la izquierda.
 *
 * REGLA: un parche PUBLICADO queda CERRADO. Todo cambio posterior (aunque sea pequeno) va a un parche NUEVO, nunca como edicion de uno anterior.
 *
 * COMO ANADIR UN PARCHE NUEVO
 *   1. Si lleva capturas del juego real (webp, ~1100 px de ancho), ponlas en assets/parche/ y anade su tamano real a `SZ` (ancho, alto).
 *   2. Anade UN objeto al PRINCIPIO de `A.PATCHES` (el mas nuevo va primero; la lista y el punto rojo de "nuevo" salen solos):
 *        { id: "0.3.1", name: ["Nombre", "Name"], date: "2026-11-01",
 *          summary: ["Resumen de un parrafo.", "One-paragraph summary."],
 *          chapters: [ { id: "x", kicker: [..], title: [..], intro: [..],
 *                        cards:   [ { name: [..], text: [..] } ],                 // opcional: tarjetas de "Lo mas destacado"
 *                        entries: [ E(nombre, etiqueta, "version del juego", [lineas], [imagenes]) ] } ] }
 *   3. La version del juego se sube aparte (CLAUDE.md).
 *
 * FORMATO DE LOS TEXTOS: desde la 0.3.4, TODO texto nuevo va en los 12 idiomas con L("es", "en", "fr", "pt", "de", "it", "es-419", "zh", "ko",
 * "ja", "ru", "pl") (es-419 vacio = el espanol). Los parches antiguos con el par ["espanol", "english"] caen al ingles en los otros 10.
 * Una cadena suelta vale para todos los idiomas.
 * Dentro de un texto, **asi** pone negrita (nada de HTML: se escapa todo).
 * ETIQUETAS: new (Nuevo) change (Cambio) buff (Mejora) nerf (Ajuste) fix (Arreglo) out (Sale) merge (Fusion).
 * IMAGENES: I("archivo-sin-extension", ["pie es", "caption en"], "wide" | "half" | "third" | "tall").
 */
window.AIQ = window.AIQ || {};
(function (A) {
  /* ancho y alto reales de cada imagen de assets/parche/ */
  const SZ = {};
  const I = (src, cap, size) => ({ src, cap, size: size || "wide", w: (SZ[src] || [1100, 618])[0], h: (SZ[src] || [1100, 618])[1] });
  const E = (name, tag, ver, items, imgs) => ({ name, tag, ver, items, imgs: imgs || [] });
  /* un texto en los 12 idiomas, en el orden de siempre (es-419 vacio = el espanol) */
  const L = (es, en, fr, pt, de, it, es419, zh, ko, ja, ru, pl) => ({ es, en, fr, pt, de, it, "es-419": es419 || es, zh, ko, ja, ru, pl });

  A.PATCHES = [
    {
      id: "0.3.15",
      name: L("Detalles de oro", "Golden details", "Détails dorés", "Detalhes de ouro", "Goldene Details", "Dettagli d'oro", "", "金色细节", "황금빛 디테일", "金のディテール", "Золотые детали", "Złote detale"),
      date: "2026-10-08",
      summary: L("Logros, niveles del Perfil, el icono de Países y la bandera del español de Latinoamérica, pulidos.", "Achievements, Profile tiers, the Countries icon and the Latin American Spanish flag, polished.", "Succès, niveaux du Profil, icône des pays et drapeau de l'espagnol d'Amérique latine, peaufinés.", "Conquistas, níveis do Perfil, o ícone de países e a bandeira do espanhol da América Latina, polidos.", "Erfolge, Profilstufen, das Länder-Symbol und die Flagge für lateinamerikanisches Spanisch, poliert.", "Obiettivi, livelli del Profilo, l'icona dei Paesi e la bandiera dello spagnolo latinoamericano, rifiniti.", "", "成就、个人资料等级、国家图标和拉美西班牙语旗帜都经过打磨。", "업적, 프로필 등급, 국가 아이콘, 중남미 스페인어 깃발을 다듬었습니다.", "実績、プロフィールの段階、国のアイコン、中南米スペイン語の旗を磨き上げました。", "Достижения, уровни профиля, значок стран и флаг латиноамериканского испанского отполированы.", "Osiągnięcia, poziomy profilu, ikona krajów i flaga hiszpańskiego latynoamerykańskiego zostały dopracowane."),
      chapters: [
        { id: "detalles", kicker: L("Arte", "Art", "Graphismes", "Arte", "Grafik", "Grafica", "", "美术", "아트", "アート", "Графика", "Grafika"),
          title: L("Pulido final", "Final polish", "Finitions", "Polimento final", "Letzter Schliff", "Rifinitura finale", "", "最后的打磨", "마지막 손질", "最後の仕上げ", "Последние штрихи", "Ostatnie szlify"),
          intro: L("Lo pequeño también cuenta.", "The little things count too.", "Les petites choses comptent aussi.", "As pequenas coisas também contam.", "Auch Kleinigkeiten zählen.", "Anche le piccole cose contano.", "", "小细节也很重要。", "작은 것도 중요합니다.", "小さなことも大切。", "Мелочи тоже важны.", "Drobiazgi też się liczą."),
          entries: [
            E(L("Logros nuevos", "New achievement art", "Nouveaux succès", "Conquistas novas", "Neue Erfolgsbilder", "Nuovi obiettivi", "", "新的成就插画", "새 업적 그림", "新しい実績イラスト", "Новые достижения", "Nowe osiągnięcia"), "change", "0.3.15", [
              L("Los seis logros de continente de la Enciclopedia muestran su silueta real con relieve y un vecino ilustre: elefante, linterna, torre Eiffel, águila, canguro y tucán. **De canto** y **Al otro lado del mundo** también se redibujan.",
                "The six Encyclopedia continent achievements show their real outline with depth and a famous local: elephant, lantern, Eiffel Tower, eagle, kangaroo and toucan. **On its edge** and **Other side of the world** are redrawn too.",
                "Les six succès de continent de l'Encyclopédie montrent leur vraie silhouette en relief et un voisin célèbre : éléphant, lanterne, tour Eiffel, aigle, kangourou et toucan. **Sur la tranche** et **À l'autre bout du monde** sont aussi redessinés.",
                "As seis conquistas de continente da Enciclopédia mostram a silhueta real com relevo e um vizinho ilustre: elefante, lanterna, Torre Eiffel, águia, canguru e tucano. **Em pé** e **Do outro lado do mundo** também foram redesenhadas.",
                "Die sechs Kontinent-Erfolge der Enzyklopädie zeigen ihren echten Umriss mit Tiefe und einen berühmten Bewohner: Elefant, Laterne, Eiffelturm, Adler, Känguru und Tukan. **Auf der Kante** und **Am anderen Ende der Welt** wurden ebenfalls neu gezeichnet.",
                "I sei obiettivi dei continenti dell'Enciclopedia mostrano la loro vera sagoma in rilievo e un vicino illustre: elefante, lanterna, Torre Eiffel, aquila, canguro e tucano. Anche **Di taglio** e **Dall'altra parte del mondo** sono stati ridisegnati.",
                "",
                "百科全书的六个大洲成就展示了真实的立体轮廓和一位知名居民：大象、灯笼、埃菲尔铁塔、雄鹰、袋鼠和巨嘴鸟。**立起来了** 和 **地球另一端** 也重新绘制。",
                "백과사전의 대륙 업적 6개가 입체감 있는 실제 윤곽과 유명한 주민을 보여 줍니다. 코끼리, 등불, 에펠탑, 독수리, 캥거루, 큰부리새. **세로로 섰다**와 **지구 반대편**도 다시 그렸습니다.",
                "百科事典の大陸の実績6つが、立体感のある本当の形と有名な住人を描きます。ゾウ、ちょうちん、エッフェル塔、ワシ、カンガルー、オオハシ。**縦に立った**と**地球の裏側**も描き直しました。",
                "Шесть достижений за континенты в Энциклопедии показывают настоящий объёмный контур и знаменитого жителя: слона, фонарик, Эйфелеву башню, орла, кенгуру и тукана. **На ребро** и **На другом конце света** тоже перерисованы.",
                "Sześć osiągnięć kontynentów w Encyklopedii pokazuje prawdziwy kontur z głębią i słynnego mieszkańca: słonia, lampion, wieżę Eiffla, orła, kangura i tukana. **Na kancie** i **Na drugim końcu świata** też narysowano od nowa."),
            ]),
            E(L("Perfil y Enciclopedia", "Profile and Encyclopedia", "Profil et Encyclopédie", "Perfil e Enciclopédia", "Profil und Enzyklopädie", "Profilo ed Enciclopedia", "", "个人资料与百科全书", "프로필과 백과사전", "プロフィールと百科事典", "Профиль и Энциклопедия", "Profil i Encyklopedia"), "change", "0.3.15", [
              L("Los niveles de logros del Perfil son monedas de oro con su número grabado, y **Secretos** es una moneda morada con cerradura.",
                "Profile achievement tiers are gold coins with their number engraved, and **Secrets** is a purple coin with a keyhole.",
                "Les niveaux de succès du Profil sont des pièces d'or au numéro gravé, et **Secrets** est une pièce violette avec une serrure.",
                "Os níveis de conquistas do Perfil são moedas de ouro com o número gravado, e **Segredos** é uma moeda roxa com fechadura.",
                "Die Erfolgsstufen im Profil sind Goldmünzen mit eingravierter Zahl, und **Geheimnisse** ist eine violette Münze mit Schlüsselloch.",
                "I livelli degli obiettivi nel Profilo sono monete d'oro con il numero inciso, e **Segreti** è una moneta viola con serratura.",
                "",
                "个人资料中的成就等级变成刻有数字的金币，**秘密** 则是一枚带锁孔的紫色硬币。",
                "프로필의 업적 등급은 숫자가 새겨진 금화가 되었고, **비밀**은 열쇠 구멍이 있는 보라색 동전입니다.",
                "プロフィールの実績の段階は数字を刻んだ金貨に、**シークレット**は鍵穴のある紫のコインになりました。",
                "Уровни достижений в профиле — золотые монеты с выгравированным номером, а **Секреты** — фиолетовая монета с замочной скважиной.",
                "Poziomy osiągnięć w profilu to złote monety z wygrawerowanym numerem, a **Sekrety** to fioletowa moneta z dziurką od klucza."),
              L("El icono de **Países** de la Enciclopedia es ahora una bandera de la casa con el mundo, y el **español de Latinoamérica** usa la bandera de México.",
                "The Encyclopedia **Countries** icon is now a house flag with the world on it, and **Latin American Spanish** uses the flag of Mexico.",
                "L'icône des **pays** de l'Encyclopédie est désormais un drapeau maison orné du monde, et l'**espagnol d'Amérique latine** utilise le drapeau du Mexique.",
                "O ícone de **países** da Enciclopédia agora é uma bandeira da casa com o mundo, e o **espanhol da América Latina** usa a bandeira do México.",
                "Das **Länder**-Symbol der Enzyklopädie ist jetzt eine Hausflagge mit der Welt, und **lateinamerikanisches Spanisch** nutzt die Flagge Mexikos.",
                "L'icona dei **Paesi** dell'Enciclopedia ora è una bandiera della casa con il mondo, e lo **spagnolo latinoamericano** usa la bandiera del Messico.",
                "",
                "百科全书的 **国家** 图标现在是一面印有世界的自家旗帜，**拉美西班牙语** 使用墨西哥国旗。",
                "백과사전의 **국가** 아이콘은 이제 세계가 그려진 자체 깃발이고, **중남미 스페인어**는 멕시코 국기를 씁니다.",
                "百科事典の**国**のアイコンは世界を描いたオリジナルの旗に、**中南米スペイン語**はメキシコの国旗になりました。",
                "Значок **стран** в Энциклопедии — теперь фирменный флаг с миром, а **латиноамериканский испанский** использует флаг Мексики.",
                "Ikona **krajów** w Encyklopedii to teraz flaga domu z globem, a **hiszpański latynoamerykański** używa flagi Meksyku."),
            ]) ] },
      ],
    },
    {
      id: "0.3.14",
      name: L("Portadas centradas", "Centred covers", "Couvertures centrées", "Capas centradas", "Zentrierte Titelbilder", "Copertine centrate", "", "封面居中", "가운데 정렬된 표지", "表紙を中央に", "Обложки по центру", "Wyśrodkowane okładki"),
      date: "2026-10-08",
      summary: L("Las portadas del Clásico ya salen centradas en cualquier tamaño de ventana.", "Classic covers are now centred at any window size.", "Les couvertures du Classique sont désormais centrées, quelle que soit la taille de la fenêtre.", "As capas do Clássico agora ficam centradas em qualquer tamanho de janela.", "Die Titelbilder von Klassisch sind jetzt bei jeder Fenstergröße zentriert.", "Le copertine del Classico ora sono centrate con qualsiasi dimensione della finestra.", "", "经典模式的封面现在在任何窗口大小下都居中。", "이제 클래식 표지가 창 크기와 관계없이 가운데에 놓입니다.", "クラシックの表紙が、どのウィンドウサイズでも中央に表示されるようになりました。", "Обложки «Классики» теперь по центру при любом размере окна.", "Okładki Klasyki są teraz wyśrodkowane przy każdym rozmiarze okna."),
      chapters: [
        { id: "fix", kicker: L("Clásico", "Classic", "Classique", "Clássico", "Klassisch", "Classico", "", "经典", "클래식", "クラシック", "Классика", "Klasyka"),
          title: L("Arreglo", "Fix", "Correctif", "Correção", "Korrektur", "Correzione", "", "修复", "수정", "修正", "Исправление", "Poprawka"),
          intro: L("Cada cosa en su sitio.", "Everything in its place.", "Chaque chose à sa place.", "Cada coisa no seu lugar.", "Alles an seinem Platz.", "Ogni cosa al suo posto.", "", "各归其位。", "모든 것이 제자리에.", "すべてをあるべき場所に。", "Всё на своих местах.", "Wszystko na swoim miejscu."),
          entries: [
            E(L("Portadas centradas", "Centred covers", "Couvertures centrées", "Capas centradas", "Zentrierte Titelbilder", "Copertine centrate", "", "封面居中", "가운데 정렬된 표지", "表紙を中央に", "Обложки по центру", "Wyśrodkowane okładki"), "fix", "0.3.14", [
              L("El dibujo de cada portada del Clásico queda en el centro y ya no se recorta cuando la ventana es estrecha o muy ancha.", "Each Classic cover's picture sits in the centre and is no longer cropped in narrow or very wide windows.", "Le dessin de chaque couverture du Classique est au centre et n'est plus rogné dans les fenêtres étroites ou très larges.", "O desenho de cada capa do Clássico fica no centro e já não é cortado em janelas estreitas ou muito largas.", "Das Bild jedes Klassisch-Titelbilds sitzt in der Mitte und wird in schmalen oder sehr breiten Fenstern nicht mehr abgeschnitten.", "Il disegno di ogni copertina del Classico sta al centro e non viene più tagliato nelle finestre strette o molto larghe.", "", "经典模式每张封面的图案都位于中央，窗口很窄或很宽时也不再被裁切。", "클래식 표지마다 그림이 가운데에 놓이고, 창이 좁거나 아주 넓어도 더 이상 잘리지 않습니다.", "クラシックの各表紙の絵が中央に収まり、ウィンドウが狭くても広くても切れなくなりました。", "Рисунок каждой обложки «Классики» стоит по центру и больше не обрезается в узком или очень широком окне.", "Rysunek każdej okładki Klasyki jest na środku i nie jest już przycinany w wąskim ani bardzo szerokim oknie."),
            ]) ] },
      ],
    },
    {
      id: "0.3.13",
      name: L("Portadas del Clásico", "Classic covers", "Couvertures du Classique", "Capas do Clássico", "Titelbilder für Klassisch", "Copertine del Classico", "", "经典模式封面", "클래식 표지", "クラシックの表紙", "Обложки «Классики»", "Okładki Klasyki"),
      date: "2026-10-08",
      summary: L("Cada campaña del Clásico tiene su portada y los continentes ganan relieve.", "Every Classic campaign has its own cover and the continents gain depth.", "Chaque campagne du Classique a sa couverture et les continents prennent du relief.", "Cada campanha do Clássico tem a sua capa e os continentes ganham relevo.", "Jede Klassisch-Kampagne hat ihr eigenes Titelbild, und die Kontinente bekommen Tiefe.", "Ogni campagna del Classico ha la sua copertina e i continenti prendono rilievo.", "", "经典模式的每个战役都有了自己的封面，大洲也更有立体感。", "클래식의 캠페인마다 표지가 생기고 대륙에 입체감이 더해졌습니다.", "クラシックの各キャンペーンに表紙がつき、大陸に立体感が出ました。", "У каждой кампании «Классики» своя обложка, а континенты стали объёмными.", "Każda kampania Klasyki ma własną okładkę, a kontynenty zyskały głębię."),
      chapters: [
        { id: "portadas", kicker: L("Clásico", "Classic", "Classique", "Clássico", "Klassisch", "Classico", "", "经典", "클래식", "クラシック", "Классика", "Klasyka"),
          title: L("Una portada por campaña", "One cover per campaign", "Une couverture par campagne", "Uma capa por campanha", "Ein Titelbild pro Kampagne", "Una copertina per campagna", "", "每个战役一张封面", "캠페인마다 표지 하나", "キャンペーンごとに表紙を", "Своя обложка у каждой кампании", "Jedna okładka na kampanię"),
          intro: L("Se reconocen de un vistazo.", "Recognisable at a glance.", "Reconnaissables au premier coup d'œil.", "Reconhecíveis num relance.", "Auf einen Blick erkennbar.", "Riconoscibili a colpo d'occhio.", "", "一眼就能认出来。", "한눈에 알아볼 수 있습니다.", "ひと目でわかります。", "Узнаются с первого взгляда.", "Rozpoznasz je od razu."),
          entries: [
            E(L("Portadas nuevas", "New covers", "Nouvelles couvertures", "Capas novas", "Neue Titelbilder", "Nuove copertine", "", "新封面", "새 표지", "新しい表紙", "Новые обложки", "Nowe okładki"), "change", "0.3.13", [
              L("Las 12 campañas del Clásico cambian el mapa en miniatura por una portada: su continente para las regionales, un **detective con lupa** para **Pistas**, **dados del mundo** para **Mezcla** y el dibujo de su logro para las demás.", "The 12 Classic campaigns swap the mini map for a cover: their continent for the regional ones, a **detective with a magnifying glass** for **Clues**, **world dice** for **Mixed Bag** and their achievement art for the rest.", "Les 12 campagnes du Classique remplacent la mini-carte par une couverture : leur continent pour les régionales, un **détective à la loupe** pour **Indices**, des **dés du monde** pour **Mélange** et le dessin de leur succès pour les autres.", "As 12 campanhas do Clássico trocam o minimapa por uma capa: o seu continente nas regionais, um **detetive com lupa** em **Pistas**, **dados do mundo** em **Mistura** e o desenho da sua conquista nas demais.", "Die 12 Klassisch-Kampagnen ersetzen die Minikarte durch ein Titelbild: ihren Kontinent bei den regionalen, einen **Detektiv mit Lupe** bei **Hinweise**, **Weltwürfel** bei **Gemischt** und das Bild ihres Erfolgs bei den übrigen.", "Le 12 campagne del Classico sostituiscono la minimappa con una copertina: il loro continente per quelle regionali, un **detective con la lente** per **Indizi**, i **dadi del mondo** per **Miscuglio** e il disegno del loro obiettivo per le altre.", "", "经典模式的 12 个战役用封面取代了小地图：地区战役是各自的大洲，**线索** 是 **拿放大镜的侦探**，**大杂烩** 是 **世界骰子**，其余是各自成就的插画。", "클래식 캠페인 12개가 미니맵 대신 표지를 씁니다. 지역 캠페인은 대륙, **단서**는 **돋보기를 든 탐정**, **믹스**는 **세계 주사위**, 나머지는 업적 그림입니다.", "クラシックの12のキャンペーンは、ミニマップの代わりに表紙を使います。地域ものは大陸、**ヒント**は**虫めがねの探偵**、**ミックス**は**世界のサイコロ**、残りは実績のイラストです。", "12 кампаний «Классики» вместо мини-карты получили обложки: региональные — свой континент, **Подсказки** — **сыщика с лупой**, **Всё вперемешку** — **кубики мира**, остальные — рисунок своего достижения.", "12 kampanii Klasyki zamiast minimapy ma okładki: regionalne swój kontynent, **Wskazówki** — **detektywa z lupą**, **Mieszanka** — **kostki świata**, a pozostałe rysunek swojego osiągnięcia."),
              L("Los continentes de la **Enciclopedia** tienen ahora relieve, con el mismo color de siempre.", "The **Encyclopedia** continents now have depth, in the same colours as before.", "Les continents de l'**Encyclopédie** ont désormais du relief, avec les mêmes couleurs.", "Os continentes da **Enciclopédia** agora têm relevo, com as mesmas cores de sempre.", "Die Kontinente der **Enzyklopädie** haben jetzt Tiefe, in den gewohnten Farben.", "I continenti dell'**Enciclopedia** ora hanno rilievo, con gli stessi colori di sempre.", "", "**百科全书** 里的大洲现在有了立体感，颜色不变。", "**백과사전**의 대륙에 이제 입체감이 있습니다. 색은 그대로입니다.", "**百科事典**の大陸に立体感がつきました。色はそのままです。", "Континенты в **Энциклопедии** стали объёмными, цвета прежние.", "Kontynenty w **Encyklopedii** mają teraz głębię, w tych samych kolorach."),
            ]) ] },
      ],
    },
    {
      id: "0.3.12",
      name: L("Retos con cara nueva", "Challenges with a new face", "Des défis tout neufs", "Desafios de cara nova", "Herausforderungen mit neuem Gesicht", "Sfide con un volto nuovo", "", "挑战焕然一新", "새 얼굴의 도전", "新しい顔の試練", "Испытания в новом облике", "Wyzwania w nowej odsłonie"),
      date: "2026-10-08",
      summary: L("48 retos estrenan ilustración y las cartas de Clásico y Reto diario se pulen.", "48 challenges get new art and the Classic and Daily challenge cards are polished.", "48 défis ont une nouvelle illustration et les cartes Classique et Défi du jour sont peaufinées.", "48 desafios ganham ilustração nova e as cartas do Clássico e do Desafio diário foram polidas.", "48 Herausforderungen bekommen neue Bilder, und die Karten für Klassisch und Tägliche Herausforderung wurden poliert.", "48 sfide hanno una nuova illustrazione e le carte di Classico e Sfida del giorno sono state rifinite.", "", "48 个挑战换上新插画，经典和每日挑战的卡牌也经过打磨。", "도전 48개에 새 그림이 생기고 클래식과 일일 도전 카드가 다듬어졌습니다.", "48の試練に新しいイラスト。クラシックとデイリーチャレンジのカードも磨き上げました。", "48 испытаний получили новые иллюстрации, а карты «Классики» и «Испытания дня» отполированы.", "48 wyzwań ma nowe ilustracje, a karty Klasyki i Wyzwania dnia zostały dopracowane."),
      chapters: [
        { id: "arte", kicker: L("Arte", "Art", "Graphismes", "Arte", "Grafik", "Grafica", "", "美术", "아트", "アート", "Графика", "Grafika"),
          title: L("Más pulido", "More polish", "Plus de finition", "Mais polimento", "Mehr Feinschliff", "Più rifinitura", "", "更加精致", "더 정교하게", "さらに磨きを", "Больше лоска", "Więcej szlifu"),
          intro: L("Cada reto, su dibujo.", "Every challenge, its own picture.", "Chaque défi a son dessin.", "Cada desafio, o seu desenho.", "Jede Herausforderung, ihr eigenes Bild.", "Ogni sfida, il suo disegno.", "", "每个挑战，都有自己的画。", "도전마다 저마다의 그림.", "試練ごとに、その絵を。", "У каждого испытания — свой рисунок.", "Każde wyzwanie ma swój obrazek."),
          entries: [
            E(L("Retos ilustrados", "Illustrated challenges", "Défis illustrés", "Desafios ilustrados", "Illustrierte Herausforderungen", "Sfide illustrate", "", "插画挑战", "그림이 있는 도전", "イラスト付きの試練", "Иллюстрированные испытания", "Ilustrowane wyzwania"), "change", "0.3.12", [
              L("Los 48 retos más antiguos del crupier (letras, mapa, puntero, pantalla y bandera) tienen ilustración nueva con el mismo acabado que los logros: la pecera de **Memoria de pez**, el caracol de **Cursor con retraso**, la torre de **Torre de Babel**...", "The Dealer's 48 oldest challenges (letters, map, pointer, screen and flag) have new art with the same finish as the achievements: the fishbowl of **Goldfish memory**, the snail of **Laggy cursor**, the tower of **Tower of Babel**...", "Les 48 plus anciens défis du croupier (lettres, carte, pointeur, écran et drapeau) ont une nouvelle illustration, avec la même finition que les succès : le bocal de **Mémoire de poisson**, l'escargot du **Curseur en retard**, la tour de **Tour de Babel**...", "Os 48 desafios mais antigos do crupiê (letras, mapa, ponteiro, tela e bandeira) têm ilustração nova com o mesmo acabamento das conquistas: o aquário de **Memória de peixe**, o caracol do **Cursor com atraso**, a torre da **Torre de Babel**...", "Die 48 ältesten Herausforderungen des Croupiers (Buchstaben, Karte, Zeiger, Bildschirm und Flagge) haben neue Bilder im Stil der Erfolge: das Goldfischglas von **Fischgedächtnis**, die Schnecke vom **Verzögerten Zeiger**, der Turm von **Turmbau zu Babel** ...", "Le 48 sfide più antiche del croupier (lettere, mappa, puntatore, schermo e bandiera) hanno una nuova illustrazione con la stessa rifinitura degli obiettivi: la boccia di **Memoria da pesce rosso**, la lumaca del **Puntatore in ritardo**, la torre della **Torre di Babele**...", "", "荷官最早的 48 个挑战（字母、地图、指针、屏幕和旗帜）换上了与成就同样精致的新插画：**金鱼记忆** 的鱼缸、**延迟的光标** 的蜗牛、**巴别塔** 的高塔……", "딜러의 가장 오래된 도전 48개(글자, 지도, 포인터, 화면, 깃발)에 업적과 같은 마감의 새 그림이 생겼습니다. **금붕어 기억력**의 어항, **느린 커서**의 달팽이, **바벨탑**의 탑...", "ディーラーの最も古い48の試練（文字、地図、ポインター、画面、国旗）に、実績と同じ仕上げの新しいイラスト。**金魚の記憶力**の金魚鉢、**遅れるカーソル**のカタツムリ、**バベルの塔**の塔……", "48 самых старых испытаний крупье (буквы, карта, указатель, экран и флаг) получили новые иллюстрации в стиле достижений: аквариум **Памяти как у рыбки**, улитка **Запаздывающего курсора**, башня **Вавилонской башни**...", "48 najstarszych wyzwań krupiera (litery, mapa, kursor, ekran i flaga) ma nowe ilustracje z tym samym wykończeniem co osiągnięcia: akwarium **Pamięci złotej rybki**, ślimak **Spóźnionego kursora**, wieża **Wieży Babel**..."),
              L("El globo de **Clásico** y la copa de **Reto diario** se han redibujado simétricos y a la misma escala que Don Crupier.", "The **Classic** globe and the **Daily challenge** trophy have been redrawn symmetrical and at the same scale as the Dealer.", "Le globe de **Classique** et le trophée du **Défi du jour** ont été redessinés symétriques et à la même échelle que Don Croupier.", "O globo do **Clássico** e o troféu do **Desafio diário** foram redesenhados simétricos e na mesma escala do Dom Crupiê.", "Der Globus von **Klassisch** und der Pokal der **Täglichen Herausforderung** wurden symmetrisch und im selben Maßstab wie Don Croupier neu gezeichnet.", "Il mappamondo di **Classico** e il trofeo della **Sfida del giorno** sono stati ridisegnati simmetrici e alla stessa scala di Don Croupier.", "", "**经典** 的地球仪和 **每日挑战** 的奖杯已重新绘制，左右对称，与荷官先生比例一致。", "**클래식**의 지구본과 **일일 도전**의 트로피를 좌우 대칭으로, 딜러 나리와 같은 크기로 다시 그렸습니다.", "**クラシック**の地球儀と**デイリーチャレンジ**のトロフィーを、左右対称に、ドン・ディーラーと同じ縮尺で描き直しました。", "Глобус «**Классики**» и кубок «**Испытания дня**» перерисованы симметрично и в том же масштабе, что и Дон Крупье.", "Globus **Klasyki** i puchar **Wyzwania dnia** narysowano od nowa, symetrycznie i w tej samej skali co Don Krupier."),
            ]) ] },
      ],
    },
    {
      id: "0.3.11",
      name: L("Ensayo general", "Dress rehearsal", "Répétition générale", "Ensaio geral", "Generalprobe", "Prova generale", "", "彩排", "리허설", "リハーサル", "Генеральная репетиция", "Próba generalna"),
      date: "2026-10-08",
      summary: L("Lo que el crupier te dice en directo, ensayado antes de salir.", "What the Dealer says to you live, rehearsed before it goes out.", "Ce que le croupier te dit en direct, répété avant d'être envoyé.", "O que o crupiê diz ao vivo, ensaiado antes de sair.", "Was der Croupier dir live sagt, wird vorher geprobt.", "Ciò che il croupier ti dice in diretta, provato prima di uscire.", "", "荷官的直播台词，发出前先彩排。", "딜러가 생방송으로 하는 말, 나가기 전에 리허설합니다.", "ディーラーの生放送のセリフは、送る前にリハーサル。", "То, что крупье говорит в эфире, сначала репетируется.", "To, co krupier mówi na żywo, jest najpierw próbowane."),
      chapters: [
        { id: "ens", kicker: L("Don Crupier", "The Dealer", "Don Croupier", "Dom Crupiê", "Don Croupier", "Don Croupier", "", "荷官先生", "딜러 나리", "ドン・ディーラー", "Дон Крупье", "Don Krupier"),
          title: L("En directo", "Live", "En direct", "Ao vivo", "Live", "In diretta", "En vivo", "直播", "생방송", "生放送", "В эфире", "Na żywo"),
          intro: L("Entre bastidores.", "Behind the scenes.", "En coulisses.", "Nos bastidores.", "Hinter den Kulissen.", "Dietro le quinte.", "", "幕后。", "무대 뒤.", "舞台裏。", "За кулисами.", "Za kulisami."),
          entries: [
            E(L("Ensayo", "Rehearsal", "Répétition", "Ensaio", "Probe", "Prova", "", "彩排", "리허설", "リハーサル", "Репетиция", "Próba"), "new", "0.3.11", [
              L("Antes de hablarte en directo, el crupier ensaya la escena entera: la cara, el gesto y la frase letra a letra, tal como la vas a ver.", "Before speaking to you live, the Dealer rehearses the whole scene: the face, the gesture and the line letter by letter, just as you'll see it.", "Avant de te parler en direct, le croupier répète toute la scène : le visage, le geste et la phrase lettre par lettre, exactement comme tu la verras.", "Antes de falar com você ao vivo, o crupiê ensaia a cena inteira: o rosto, o gesto e a frase letra por letra, do jeito que você vai ver.", "Bevor der Croupier live mit dir spricht, probt er die ganze Szene: Gesicht, Geste und den Satz Buchstabe für Buchstabe, genau wie du ihn sehen wirst.", "Prima di parlarti in diretta, il croupier prova tutta la scena: la faccia, il gesto e la frase lettera per lettera, proprio come la vedrai.", "Antes de hablarte en vivo, el crupier ensaya la escena entera: la cara, el gesto y la frase letra por letra, tal como la vas a ver.", "在直播对你说话之前，荷官会先彩排整场戏：表情、手势和逐字出现的台词，和你看到的一模一样。", "생방송으로 말을 걸기 전에 딜러는 장면 전체를 리허설합니다. 표정, 몸짓, 한 글자씩 나오는 대사까지 당신이 보게 될 그대로.", "生放送で話しかける前に、ディーラーは場面をまるごとリハーサルする。表情、しぐさ、一文字ずつのセリフまで、あなたが見るそのままに。", "Прежде чем заговорить с тобой в эфире, крупье репетирует всю сцену: лицо, жест и фразу по буквам, ровно так, как ты её увидишь.", "Zanim krupier odezwie się do ciebie na żywo, próbuje całą scenę: minę, gest i zdanie litera po literze, dokładnie tak, jak je zobaczysz."),
            ]) ] },
      ],
    },
    {
      id: "0.3.10",
      name: L("Cartas nuevas en la portada", "New cards on the title screen", "Nouvelles cartes sur l'écran titre", "Cartas novas na tela inicial", "Neue Karten im Hauptmenü", "Nuove carte nella schermata iniziale", "Cartas nuevas en la pantalla de inicio", "主界面的新卡牌", "타이틀 화면의 새 카드", "タイトル画面の新しいカード", "Новые карты на главном экране", "Nowe karty na ekranie tytułowym"),
      date: "2026-10-08",
      summary: L("Clásico, Aventura y Reto diario estrenan carta: un solo protagonista y mucha luz.", "Classic, Adventure and Daily challenge get new cards: a single star and plenty of light.", "Classique, Aventure et Défi du jour ont de nouvelles cartes : une seule vedette et beaucoup de lumière.", "Clássico, Aventura e Desafio diário ganham cartas novas: um só protagonista e muita luz.", "Klassisch, Abenteuer und Tägliche Herausforderung bekommen neue Karten: ein einziger Star und viel Licht.", "Classico, Avventura e Sfida del giorno hanno nuove carte: un solo protagonista e tanta luce.", "", "经典、冒险和每日挑战换上新卡牌：只有一个主角，满满的光。", "클래식, 모험, 일일 도전에 새 카드가 생겼습니다. 주인공 하나와 넉넉한 조명.", "クラシック、アドベンチャー、デイリーチャレンジに新しいカード。主役はひとつ、光はたっぷり。", "У «Классики», «Приключения» и «Испытания дня» новые карты: один герой и много света.", "Klasyka, Przygoda i Wyzwanie dnia mają nowe karty: jeden bohater i dużo światła."),
      chapters: [
        { id: "cartas", kicker: L("Portada", "Title screen", "Écran titre", "Tela inicial", "Hauptmenü", "Schermata iniziale", "Pantalla de inicio", "主界面", "타이틀 화면", "タイトル画面", "Главный экран", "Ekran tytułowy"),
          title: L("Cartas de modo", "Mode cards", "Cartes de mode", "Cartas de modo", "Moduskarten", "Carte delle modalità", "", "模式卡牌", "모드 카드", "モードカード", "Карты режимов", "Karty trybów"),
          intro: L("Menos es más.", "Less is more.", "Moins, c'est plus.", "Menos é mais.", "Weniger ist mehr.", "Meno è meglio.", "", "少即是多。", "적을수록 좋습니다.", "少ないほど豊か。", "Меньше значит больше.", "Mniej znaczy więcej."),
          entries: [
            E(L("Un protagonista por carta", "One star per card", "Une vedette par carte", "Um protagonista por carta", "Ein Star pro Karte", "Un protagonista per carta", "", "每张卡一个主角", "카드마다 주인공 하나", "1枚にひとりの主役", "Один герой на карту", "Jeden bohater na kartę"), "change", "0.3.10", [
              L("**Clásico** es un globo terráqueo, **Aventura** es Don Crupier en persona y **Reto diario** es un trofeo, cada uno bajo un foco del color de su modo.", "**Classic** is a world globe, **Adventure** is the Dealer himself and **Daily challenge** is a trophy, each under a spotlight in its mode's colour.", "**Classique** est un globe terrestre, **Aventure** est Don Croupier en personne et **Défi du jour** est un trophée, chacun sous un projecteur à la couleur de son mode.", "**Clássico** é um globo terrestre, **Aventura** é o próprio Dom Crupiê e **Desafio diário** é um troféu, cada um sob um holofote da cor do seu modo.", "**Klassisch** ist ein Globus, **Abenteuer** ist Don Croupier persönlich und **Tägliche Herausforderung** ein Pokal, jeweils unter einem Scheinwerfer in der Farbe des Modus.", "**Classico** è un mappamondo, **Avventura** è Don Croupier in persona e **Sfida del giorno** è un trofeo, ognuno sotto un riflettore del colore della sua modalità.", "", "**经典** 是一个地球仪，**冒险** 是荷官先生本人，**每日挑战** 是一座奖杯，各自沐浴在本模式颜色的聚光灯下。", "**클래식**은 지구본, **모험**은 딜러 나리 본인, **일일 도전**은 트로피입니다. 각자 모드 색깔의 조명 아래에 있습니다.", "**クラシック**は地球儀、**アドベンチャー**はドン・ディーラー本人、**デイリーチャレンジ**はトロフィー。それぞれのモードの色のスポットライトの下に。", "**Классика** — это глобус, **Приключение** — сам Дон Крупье, а **Испытание дня** — кубок, каждый под прожектором цвета своего режима.", "**Klasyka** to globus, **Przygoda** to sam Don Krupier, a **Wyzwanie dnia** to puchar, każdy w świetle reflektora w kolorze swojego trybu."),
            ]) ] },
      ],
    },
    {
      id: "0.3.9",
      name: L("Botones de oro", "Golden buttons", "Boutons dorés", "Botões de ouro", "Goldene Knöpfe", "Pulsanti d'oro", "", "金色按钮", "황금 버튼", "金のボタン", "Золотые кнопки", "Złote przyciski"),
      date: "2026-10-08",
      summary: L("Los iconos de los botones estrenan pixel art, todos de la misma familia.", "The button icons get new pixel art, all from the same family.", "Les icônes des boutons ont un nouveau pixel art, toutes de la même famille.", "Os ícones dos botões ganham pixel art novo, todos da mesma família.", "Die Knopfsymbole bekommen neue Pixelkunst, alle aus einer Familie.", "Le icone dei pulsanti hanno una nuova pixel art, tutte della stessa famiglia.", "", "按钮图标换上了全新的像素画，风格统一。", "버튼 아이콘이 같은 계열의 새 픽셀 아트로 바뀌었습니다.", "ボタンのアイコンが、統一感のある新しいドット絵になりました。", "Значки кнопок получили новый пиксель-арт в едином стиле.", "Ikony przycisków mają nowy pixel art, wszystkie z jednej rodziny."),
      chapters: [
        { id: "ui", kicker: L("Interfaz", "Interface", "Interface", "Interface", "Oberfläche", "Interfaccia", "", "界面", "인터페이스", "インターフェース", "Интерфейс", "Interfejs"),
          title: L("Iconos nuevos", "New icons", "Nouvelles icônes", "Ícones novos", "Neue Symbole", "Nuove icone", "", "新图标", "새 아이콘", "新しいアイコン", "Новые значки", "Nowe ikony"),
          intro: L("Lo que más pulsas, a la altura del resto del juego.", "What you press the most, up to the standard of the rest of the game.", "Ce que tu touches le plus, au niveau du reste du jeu.", "O que você mais toca, à altura do resto do jogo.", "Was du am häufigsten drückst, auf dem Niveau des restlichen Spiels.", "Ciò che premi di più, all'altezza del resto del gioco.", "", "你最常点的东西，如今与游戏其他部分同样精致。", "가장 자주 누르는 것들이 이제 게임의 다른 부분만큼 다듬어졌습니다.", "いちばんよく押す部分を、ゲームのほかの部分と同じ水準に。", "То, что ты нажимаешь чаще всего, теперь на уровне остальной игры.", "To, co klikasz najczęściej, na poziomie reszty gry."),
          entries: [
            E(L("Botones de oro", "Golden buttons", "Boutons dorés", "Botões de ouro", "Goldene Knöpfe", "Pulsanti d'oro", "", "金色按钮", "황금 버튼", "金のボタン", "Золотые кнопки", "Złote przyciski"), "change", "0.3.9", [
              L("Los 12 iconos de los botones (ajustes, pausa, pantalla completa, salir, volver, cerrar, zoom, estrella...) se han redibujado a mano en oro, con el mismo acabado que los iconos de la Barra.", "The 12 button icons (settings, pause, fullscreen, quit, back, close, zoom, star...) have been redrawn by hand in gold, with the same finish as the Bar icons.", "Les 12 icônes des boutons (paramètres, pause, plein écran, quitter, retour, fermer, zoom, étoile...) ont été redessinées à la main en or, avec la même finition que les icônes du Bar.", "Os 12 ícones dos botões (ajustes, pausa, tela cheia, sair, voltar, fechar, zoom, estrela...) foram redesenhados à mão em ouro, com o mesmo acabamento dos ícones do Bar.", "Die 12 Knopfsymbole (Einstellungen, Pause, Vollbild, Beenden, Zurück, Schließen, Zoom, Stern ...) wurden von Hand in Gold neu gezeichnet, im selben Stil wie die Symbole der Bar.", "Le 12 icone dei pulsanti (impostazioni, pausa, schermo intero, esci, indietro, chiudi, zoom, stella...) sono state ridisegnate a mano in oro, con la stessa rifinitura delle icone del Bar.", "", "12 个按钮图标（设置、暂停、全屏、退出、返回、关闭、缩放、星星……）都以金色手工重绘，与吧台图标的质感一致。", "버튼 아이콘 12개(설정, 일시정지, 전체 화면, 종료, 뒤로, 닫기, 확대/축소, 별...)를 바 아이콘과 같은 마감으로 금빛으로 직접 다시 그렸습니다.", "ボタンのアイコン12個（設定、一時停止、全画面、終了、戻る、閉じる、ズーム、星など）を、バーのアイコンと同じ仕上げの金色で手描きし直しました。", "12 значков кнопок (настройки, пауза, полный экран, выход, назад, закрыть, масштаб, звезда...) перерисованы вручную в золоте, в том же стиле, что и значки Бара.", "12 ikon przycisków (ustawienia, pauza, pełny ekran, wyjście, powrót, zamknij, zoom, gwiazdka...) narysowano od nowa ręcznie w złocie, z tym samym wykończeniem co ikony Baru."),
            ]),
            E(L("Ajustes en 1280×720", "Settings at 1280×720", "Paramètres en 1280×720", "Ajustes em 1280×720", "Einstellungen bei 1280×720", "Impostazioni a 1280×720", "", "1280×720 下的设置", "1280×720 설정 화면", "1280×720 の設定画面", "Настройки при 1280×720", "Ustawienia w 1280×720"), "fix", "0.3.9", [
              L("En **Ajustes › General**, el texto del tutorial guiado y de las ayudas emergentes ya no se aprieta en una columna estrecha.", "In **Settings › General**, the guided tutorial and tooltips text no longer gets squeezed into a narrow column.", "Dans **Paramètres › Général**, le texte du tutoriel guidé et des bulles d'aide n'est plus écrasé dans une colonne étroite.", "Em **Ajustes › Geral**, o texto do tutorial guiado e das dicas não fica mais espremido numa coluna estreita.", "In **Einstellungen › Allgemein** wird der Text zum geführten Tutorial und zu den Tooltips nicht mehr in eine schmale Spalte gequetscht.", "In **Impostazioni › Generale**, il testo del tutorial guidato e dei suggerimenti non è più schiacciato in una colonna stretta.", "", "在 **设置 › 通用** 中，引导教程和提示的文字不再挤成窄窄的一列。", "**설정 › 일반**에서 가이드 튜토리얼과 툴팁 설명이 더 이상 좁은 칸에 끼지 않습니다.", "**設定 › 一般** で、ガイド付きチュートリアルとツールチップの説明文が細い列に詰め込まれなくなりました。", "В **Настройки › Общие** текст обучения и подсказок больше не сжимается в узкую колонку.", "W **Ustawienia › Ogólne** tekst samouczka i podpowiedzi nie jest już ściśnięty w wąskiej kolumnie."),
            ]) ] },
      ],
    },
    {
      id: "0.3.8",
      name: L("Don Crupier, en directo", "The Dealer, live", "Don Croupier, en direct", "Dom Crupiê, ao vivo", "Don Croupier, live", "Don Croupier, in diretta", "Don Crupier, en vivo", "荷官先生，直播中", "딜러 나리, 생방송", "ドン・ディーラー、生放送", "Дон Крупье в прямом эфире", "Don Krupier na żywo"),
      date: "2026-10-08",
      summary: L("A veces quien te habla no es el crupier: es el autor del juego, en directo.", "Sometimes it isn't the Dealer talking to you: it's the game's author, live.", "Parfois, ce n'est pas le croupier qui te parle : c'est l'auteur du jeu, en direct.", "Às vezes quem fala com você não é o crupiê: é o autor do jogo, ao vivo.", "Manchmal spricht nicht der Croupier mit dir, sondern der Entwickler des Spiels, live.", "A volte a parlarti non è il croupier: è l'autore del gioco, in diretta.", "A veces quien te habla no es el crupier: es el autor del juego, en vivo.", "有时跟你说话的不是荷官，而是游戏作者本人，正在直播。", "가끔 말을 거는 건 딜러가 아니라 게임 제작자입니다. 생방송으로요.", "ときどき話しかけてくるのはディーラーではなく、ゲームの作者本人。生放送で。", "Иногда с тобой говорит не крупье, а автор игры, в прямом эфире.", "Czasem nie mówi do ciebie krupier, tylko autor gry, na żywo."),
      chapters: [
        { id: "vivo", kicker: L("Don Crupier", "The Dealer", "Don Croupier", "Dom Crupiê", "Don Croupier", "Don Croupier", "", "荷官先生", "딜러 나리", "ドン・ディーラー", "Дон Крупье", "Don Krupier"),
          title: L("En directo", "Live", "En direct", "Ao vivo", "Live", "In diretta", "En vivo", "直播", "생방송", "生放送", "В эфире", "Na żywo"),
          intro: L("La cuarta pared, un poco más fina.", "The fourth wall, a little thinner.", "Le quatrième mur, un peu plus fin.", "A quarta parede, um pouco mais fina.", "Die vierte Wand, ein bisschen dünner.", "La quarta parete, un po' più sottile.", "", "第四面墙，又薄了一点。", "제4의 벽이 조금 더 얇아졌습니다.", "第四の壁が、少し薄くなった。", "Четвёртая стена стала чуть тоньше.", "Czwarta ściana, odrobinę cieńsza."),
          entries: [
            E(L("El crupier de verdad", "The real Dealer", "Le vrai croupier", "O crupiê de verdade", "Der echte Croupier", "Il vero croupier", "", "真正的荷官", "진짜 딜러", "本物のディーラー", "Настоящий крупье", "Prawdziwy krupier"), "new", "0.3.8", [
              L("Si el autor del juego está mirando tu partida, puede hablarte por boca del crupier. Lo sabrás por el piloto rojo de **EN DIRECTO** en su bocadillo.", "If the game's author is watching your game, they can talk to you through the Dealer. You'll know by the red **LIVE** light on the Dealer's speech bubble.", "Si l'auteur du jeu regarde ta partie, le croupier peut te parler à sa place. Tu le sauras grâce au voyant rouge **EN DIRECT** sur sa bulle.", "Se o autor do jogo estiver olhando sua partida, pode falar com você pela boca do crupiê. Você vai saber pela luz vermelha de **AO VIVO** no balão dele.", "Wenn der Entwickler deine Partie beobachtet, kann er durch den Croupier mit dir sprechen. Du erkennst es am roten **LIVE**-Licht in seiner Sprechblase.", "Se l'autore del gioco sta guardando la tua partita, può parlarti per bocca del croupier. Lo capirai dalla spia rossa **IN DIRETTA** sul suo fumetto.", "Si el autor del juego está mirando tu partida, puede hablarte por boca del crupier. Lo sabrás por la luz roja de **EN VIVO** en su globo.", "如果游戏作者正在看你的对局，就能借荷官之口跟你说话。气泡上亮起红色的**直播中**时，说话的就是作者本人。", "게임 제작자가 당신의 게임을 보고 있다면 딜러의 입을 빌려 말을 걸 수 있습니다. 말풍선에 빨간 **생방송** 표시가 뜨면 그 사람입니다.", "ゲームの作者があなたのプレイを見ていれば、ディーラーの口を借りて話しかけてきます。吹き出しに赤い**生放送**のランプが点いたら本人です。", "Если автор игры смотрит твою партию, крупье может заговорить с тобой словами автора. Узнаешь по красному огоньку **В ЭФИРЕ** на его реплике.", "Jeśli autor gry ogląda twoją rozgrywkę, może mówić do ciebie ustami krupiera. Poznasz to po czerwonej lampce **NA ŻYWO** w jego dymku."),
              L("Solo se envían tu nombre, tu idioma y por dónde vas. Se apaga en **Ajustes › Datos**.", "Only your name, language and progress are sent. Turn it off in **Settings › Data**.", "Seuls ton nom, ta langue et ta progression sont envoyés. Désactivable dans **Paramètres › Données**.", "Só são enviados seu nome, idioma e progresso. Dá para desligar em **Ajustes › Dados**.", "Gesendet werden nur dein Name, deine Sprache und dein Spielstand. Abschalten unter **Einstellungen › Daten**.", "Si inviano solo il tuo nome, la tua lingua e a che punto sei. Si disattiva in **Impostazioni › Dati**.", "Solo se envían tu nombre, tu idioma y en qué parte vas. Se apaga en **Ajustes › Datos**.", "只发送你的名字、语言和进度。可在**设置 › 数据**中关闭。", "이름, 언어, 진행 상황만 전송됩니다. **설정 › 데이터**에서 끌 수 있습니다.", "送られるのは名前、言語、進み具合だけ。**設定 › データ**でオフにできます。", "Отправляются только имя, язык и прогресс. Отключается в **Настройки › Данные**.", "Wysyłane są tylko imię, język i postęp. Wyłączysz to w **Ustawienia › Dane**."),
            ]) ] },
      ],
    },
    {
      id: "0.3.7",
      name: L("El final, en doce idiomas", "The ending, in twelve languages", "La fin, en douze langues", "O final, em doze idiomas", "Das Ende in zwölf Sprachen", "Il finale, in dodici lingue", "", "结局，十二种语言", "엔딩, 12개 언어로", "エンディングを12言語で", "Финал на двенадцати языках", "Zakończenie w dwunastu językach"),
      date: "2026-10-08",
      summary: L("Las notas de los últimos parches ya se leen en los 12 idiomas.", "The notes for the latest patches can now be read in all 12 languages.", "Les notes des dernières mises à jour se lisent désormais dans les 12 langues.", "As notas dos últimos patches agora podem ser lidas nos 12 idiomas.", "Die Notizen der letzten Patches gibt es jetzt in allen 12 Sprachen.", "Le note delle ultime patch ora si leggono in tutte le 12 lingue.", "", "最近几次更新的说明现已提供全部 12 种语言。", "최근 패치 노트를 이제 12개 언어로 읽을 수 있습니다.", "最近のパッチノートが、12言語すべてで読めるようになった。", "Заметки к последним обновлениям теперь доступны на всех 12 языках.", "Notatki do ostatnich aktualizacji można teraz czytać we wszystkich 12 językach."),
      chapters: [
        { id: "i18n", kicker: L("Notas del parche", "Patch notes", "Notes de mise à jour", "Notas do patch", "Patchnotes", "Note della patch", "", "更新说明", "패치 노트", "パッチノート", "Список изменений", "Informacje o aktualizacji"),
          title: L("Doce idiomas", "Twelve languages", "Douze langues", "Doze idiomas", "Zwölf Sprachen", "Dodici lingue", "", "十二种语言", "12개 언어", "12の言語", "Двенадцать языков", "Dwanaście języków"),
          intro: L("Todo lo nuevo, en todos los idiomas.", "Everything new, in every language.", "Tout ce qui est nouveau, dans toutes les langues.", "Tudo o que é novo, em todos os idiomas.", "Alles Neue, in jeder Sprache.", "Tutto ciò che è nuovo, in ogni lingua.", "", "所有新内容，每种语言都有。", "새로운 모든 것을 모든 언어로.", "新しいものはすべて、すべての言語で。", "Всё новое — на всех языках.", "Wszystko, co nowe, w każdym języku."),
          entries: [
            E(L("Notas traducidas", "Translated notes", "Notes traduites", "Notas traduzidas", "Übersetzte Notizen", "Note tradotte", "", "说明已翻译", "번역된 노트", "翻訳されたノート", "Переведённые заметки", "Przetłumaczone notatki"), "change", "0.3.7", [
              L("Las notas de **La jubilación** (0.3.4), la **Dedicatoria** (0.3.5) y **Banderas en la ruleta** (0.3.6) estaban solo en español e inglés; ahora están en los 12 idiomas, como el resto del juego.", "The notes for **The retirement** (0.3.4), the **Dedication** (0.3.5) and **Flags on the wheel** (0.3.6) were only in Spanish and English; they're now in all 12 languages, like the rest of the game.", "Les notes de **La retraite** (0.3.4), de la **Dédicace** (0.3.5) et de **Des drapeaux sur la roulette** (0.3.6) n'existaient qu'en espagnol et en anglais ; elles sont maintenant dans les 12 langues, comme le reste du jeu.", "As notas de **A aposentadoria** (0.3.4), da **Dedicatória** (0.3.5) e de **Bandeiras na roleta** (0.3.6) estavam só em espanhol e inglês; agora estão nos 12 idiomas, como o resto do jogo.", "Die Notizen zu **Der Ruhestand** (0.3.4), zur **Widmung** (0.3.5) und zu **Flaggen auf dem Roulette** (0.3.6) gab es nur auf Spanisch und Englisch; jetzt sind sie in allen 12 Sprachen, wie der Rest des Spiels.", "Le note de **La pensione** (0.3.4), della **Dedica** (0.3.5) e di **Bandiere sulla roulette** (0.3.6) erano solo in spagnolo e in inglese; ora sono in tutte le 12 lingue, come il resto del gioco.", "", "**退休**（0.3.4）、**献词**（0.3.5）和**轮盘上的旗帜**（0.3.6）的说明之前只有西班牙语和英语，现在和游戏的其他内容一样，提供全部 12 种语言。", "**은퇴**(0.3.4), **헌사**(0.3.5), **룰렛 위의 깃발**(0.3.6) 노트는 스페인어와 영어로만 있었지만, 이제 게임의 다른 부분처럼 12개 언어로 제공됩니다.", "**引退**（0.3.4）、**献辞**（0.3.5）、**ルーレットに国旗**（0.3.6）のノートはスペイン語と英語だけだったが、ゲームのほかの部分と同じく12言語すべてに対応した。", "Заметки к обновлениям **Пенсия** (0.3.4), **Посвящение** (0.3.5) и **Флаги на рулетке** (0.3.6) были только на испанском и английском; теперь они, как и вся игра, на всех 12 языках.", "Notatki do **Emerytury** (0.3.4), **Dedykacji** (0.3.5) i **Flag na ruletce** (0.3.6) były tylko po hiszpańsku i angielsku; teraz są we wszystkich 12 językach, jak reszta gry."),
            ]) ] },
      ],
    },
    {
      id: "0.3.6",
      name: L("Banderas en la ruleta", "Flags on the wheel", "Des drapeaux sur la roulette", "Bandeiras na roleta", "Flaggen auf dem Roulette", "Bandiere sulla roulette", "", "轮盘上的旗帜", "룰렛 위의 깃발", "ルーレットに国旗", "Флаги на рулетке", "Flagi na ruletce"),
      date: "2026-10-08",
      summary: L("Las rondas de banderas estrenan ilustración y las nubes del Reto diario son iguales para todos.", "Flag rounds get their own artwork and the Daily Challenge clouds are the same for everyone.", "Les manches de drapeaux ont leur propre illustration et les nuages du Défi quotidien sont les mêmes pour tous.", "As rodadas de bandeiras ganham ilustração própria e as nuvens do Desafio diário são iguais para todos.", "Flaggenrunden bekommen ein eigenes Bild, und die Wolken der Tagesherausforderung sind für alle gleich.", "I round delle bandiere hanno la loro illustrazione e le nuvole della Sfida giornaliera sono uguali per tutti.", "", "旗帜回合有了专属插画，每日挑战的云层对所有人都一样。", "깃발 라운드에 전용 일러스트가 생겼고, 일일 도전의 구름은 모두에게 똑같습니다.", "国旗ラウンドに専用イラストが付き、デイリーチャレンジの雲は全員同じになった。", "У раундов с флагами появилась своя иллюстрация, а облака в Испытании дня теперь у всех одинаковые.", "Rundy z flagami mają własną ilustrację, a chmury w Wyzwaniu dnia są takie same dla wszystkich."),
      chapters: [
        { id: "ban", kicker: L("Aventura", "Adventure", "Aventure", "Aventura", "Abenteuer", "Avventura", "", "冒险", "모험", "アドベンチャー", "Приключение", "Przygoda"), title: L("Retoques", "Touch-ups", "Retouches", "Retoques", "Feinschliff", "Ritocchi", "", "细节打磨", "다듬기", "手直し", "Доработки", "Poprawki"),
          intro: L("Dos detalles que faltaban.", "Two missing details.", "Deux détails qui manquaient.", "Dois detalhes que faltavam.", "Zwei fehlende Details.", "Due dettagli che mancavano.", "", "补上两个缺失的细节。", "빠져 있던 두 가지 디테일.", "足りなかった2つの細部。", "Две недостающие детали.", "Dwa brakujące szczegóły."),
          entries: [
            E(L("Rondas de banderas", "Flag rounds", "Manches de drapeaux", "Rodadas de bandeiras", "Flaggenrunden", "Round delle bandiere", "", "旗帜回合", "깃발 라운드", "国旗ラウンド", "Раунды с флагами", "Rundy z flagami"), "new", "0.3.6", [
              L("Las rondas 3 y 8 (Banderas I y el jefe de Banderas II) tienen escena propia: **una ruleta con las casillas pintadas de banderas**. Antes reutilizaban la de Países.", "Rounds 3 and 8 (Flags I and the Flags II boss) have their own scene: **a roulette wheel with flag-painted pockets**. They used to borrow the Countries one.", "Les manches 3 et 8 (Drapeaux I et le boss de Drapeaux II) ont leur propre scène : **une roulette aux cases peintes de drapeaux**. Avant, elles reprenaient celle des Pays.", "As rodadas 3 e 8 (Bandeiras I e o chefe de Bandeiras II) têm cena própria: **uma roleta com as casas pintadas de bandeiras**. Antes reaproveitavam a de Países.", "Die Runden 3 und 8 (Flaggen I und der Boss von Flaggen II) haben eine eigene Szene: **ein Roulette mit Fächern in Flaggenfarben**. Vorher nutzten sie die der Länder.", "I round 3 e 8 (Bandiere I e il boss di Bandiere II) hanno una scena tutta loro: **una roulette con le caselle dipinte di bandiere**. Prima riutilizzavano quella dei Paesi.", "", "第 3 和第 8 回合（旗帜 I 和旗帜 II 的首领战）有了专属场景：**格子涂满旗帜的轮盘**。之前它们沿用的是国家回合的场景。", "3라운드와 8라운드(깃발 I, 깃발 II 보스)에 전용 장면이 생겼습니다. **칸마다 깃발이 그려진 룰렛**입니다. 전에는 국가 라운드 장면을 빌려 썼습니다.", "ラウンド3と8（国旗Iと国旗IIのボス）に専用シーンが付いた。**マスに国旗が描かれたルーレット**だ。以前は国ラウンドのものを流用していた。", "У раундов 3 и 8 («Флаги I» и босс «Флагов II») теперь своя сцена: **рулетка с ячейками, раскрашенными флагами**. Раньше они брали сцену «Стран».", "Rundy 3 i 8 (Flagi I i boss Flag II) mają własną scenę: **ruletkę z polami pomalowanymi w flagi**. Wcześniej korzystały ze sceny Krajów."),
            ]),
            E(L("Nubes del Reto diario", "Daily Challenge clouds", "Nuages du Défi quotidien", "Nuvens do Desafio diário", "Wolken der Tagesherausforderung", "Nuvole della Sfida giornaliera", "", "每日挑战的云层", "일일 도전의 구름", "デイリーチャレンジの雲", "Облака в Испытании дня", "Chmury w Wyzwaniu dnia"), "fix", "0.3.6", [
              L("Con el reto de las nubes, los claros salen **en el mismo sitio para todos** en el Reto diario, como ya pasaba con las grietas, las huellas y las ventanas.", "With the clouds challenge, the gaps now appear **in the same place for everyone** in the Daily Challenge, as cracks, prints and windows already did.", "Avec le défi des nuages, les éclaircies apparaissent désormais **au même endroit pour tout le monde** dans le Défi quotidien, comme c'était déjà le cas pour les fissures, les empreintes et les fenêtres.", "Com o desafio das nuvens, as aberturas agora aparecem **no mesmo lugar para todos** no Desafio diário, como já acontecia com as rachaduras, as pegadas e as janelas.", "Bei der Wolken-Herausforderung erscheinen die Lücken in der Tagesherausforderung jetzt **für alle an derselben Stelle**, wie schon bei Rissen, Spuren und Fenstern.", "Con la sfida delle nuvole, gli squarci ora compaiono **nello stesso punto per tutti** nella Sfida giornaliera, come già succedeva con crepe, impronte e finestre.", "", "在每日挑战中遇到云层挑战时，云缝现在**对所有人都出现在同一位置**，就像裂缝、脚印和窗口一样。", "구름 도전에서 이제 일일 도전의 틈이 **모두에게 같은 자리에** 생깁니다. 균열, 발자국, 창문이 이미 그랬던 것처럼요.", "雲のチャレンジでは、デイリーチャレンジの晴れ間が**全員同じ場所に**出るようになった。ひび、足跡、窓と同じだ。", "С испытанием облаков просветы в Испытании дня теперь появляются **у всех в одном и том же месте**, как уже было с трещинами, следами и окнами.", "W wyzwaniu z chmurami prześwity w Wyzwaniu dnia pojawiają się teraz **w tym samym miejscu dla wszystkich**, tak jak już było z pęknięciami, śladami i oknami."),
            ]) ] },
      ],
    },
    {
      id: "0.3.5",
      name: L("Dedicatoria", "Dedication", "Dédicace", "Dedicatória", "Widmung", "Dedica", "", "献词", "헌사", "献辞", "Посвящение", "Dedykacja"),
      date: "2026-10-08",
      summary: L("Los créditos finales terminan con la dedicatoria del autor.", "The end credits now close with the author's dedication.", "Le générique de fin se termine désormais par la dédicace de l'auteur.", "Os créditos finais agora terminam com a dedicatória do autor.", "Der Abspann endet jetzt mit der Widmung des Autors.", "I titoli di coda ora si chiudono con la dedica dell'autore.", "", "片尾字幕现在以作者的献词收尾。", "엔딩 크레딧이 이제 제작자의 헌사로 마무리됩니다.", "エンドロールの最後に、作者の献辞が加わった。", "Финальные титры теперь завершаются посвящением автора.", "Napisy końcowe kończą się teraz dedykacją autora."),
      chapters: [
        { id: "ded", kicker: L("Créditos finales", "End credits", "Générique de fin", "Créditos finais", "Abspann", "Titoli di coda", "", "片尾字幕", "엔딩 크레딧", "エンドロール", "Финальные титры", "Napisy końcowe"),
          title: L("Al final de todo", "At the very end", "Tout à la fin", "Bem no final", "Ganz am Ende", "Proprio alla fine", "", "在最后的最后", "맨 마지막에", "最後の最後に", "В самом конце", "Na samym końcu"),
          intro: L("Lo último que se lee antes de que vuelva Don Crupier.", "The last thing you read before the dealer comes back.", "La dernière chose que tu lis avant le retour du croupier.", "A última coisa que você lê antes de o crupiê voltar.", "Das Letzte, was du liest, bevor der Croupier zurückkommt.", "L'ultima cosa che leggi prima che torni il croupier.", "", "荷官回来之前，你读到的最后一段文字。", "딜러가 돌아오기 전에 마지막으로 읽게 되는 글.", "ディーラーが戻ってくる前に、最後に目にする言葉。", "Последнее, что ты прочтёшь перед возвращением крупье.", "Ostatnie, co przeczytasz, zanim wróci krupier."),
          entries: [
            E(L("Dedicatoria", "Dedication", "Dédicace", "Dedicatória", "Widmung", "Dedica", "", "献词", "헌사", "献辞", "Посвящение", "Dedykacja"), "new", "0.3.5", [
              L("Después de «Gracias por jugar», el rodillo se detiene con la dedicatoria: **para Alejandra y Alicia (A³)**, y una dedicatoria especial a **Hugiitop**, el incansable beta tester del juego.", "After “Thanks for playing”, the credits stop on the dedication: **to Alejandra and Alicia (A³)**, plus a special dedication to **Hugiitop**, the game's tireless beta tester.", "Après « Merci d'avoir joué », le générique s'arrête sur la dédicace : **à Alejandra et Alicia (A³)**, et une dédicace spéciale à **Hugiitop**, l'infatigable bêta-testeur du jeu.", "Depois de “Obrigado por jogar”, os créditos param na dedicatória: **para Alejandra e Alicia (A³)**, e uma dedicatória especial a **Hugiitop**, o incansável beta tester do jogo.", "Nach „Danke fürs Spielen“ hält der Abspann bei der Widmung an: **für Alejandra und Alicia (A³)** und eine besondere Widmung an **Hugiitop**, den unermüdlichen Betatester des Spiels.", "Dopo «Grazie per aver giocato», i titoli si fermano sulla dedica: **ad Alejandra e Alicia (A³)**, e una dedica speciale a **Hugiitop**, l'instancabile beta tester del gioco.", "", "在“感谢游玩”之后，字幕停在献词上：**献给 Alejandra 和 Alicia（A³）**，并特别献给游戏不知疲倦的测试员 **Hugiitop**。", "'플레이해 줘서 고마워' 다음에 크레딧이 헌사에서 멈춥니다. **Alejandra와 Alicia에게 (A³)**, 그리고 지칠 줄 모르는 베타 테스터 **Hugiitop**에게 바치는 특별한 헌사.", "「遊んでくれてありがとう」のあと、エンドロールは献辞で止まる。**Alejandra と Alicia へ（A³）**、そして疲れ知らずのベータテスター **Hugiitop** への特別な献辞。", "После «Спасибо за игру» титры останавливаются на посвящении: **Alejandra и Alicia (A³)**, а также особое посвящение **Hugiitop**, неутомимому бета-тестеру игры.", "Po „Dzięki za grę” napisy zatrzymują się na dedykacji: **Alejandra i Alicia (A³)**, oraz na specjalnej dedykacji dla **Hugiitop**, niestrudzonego beta testera gry."),
            ]) ] },
      ],
    },
    {
      id: "0.3.4",
      name: L("La jubilación", "The retirement", "La retraite", "A aposentadoria", "Der Ruhestand", "La pensione", "", "退休", "은퇴", "引退", "Пенсия", "Emerytura"),
      date: "2026-10-08",
      summary: L("Gana la Ascensión V y Don Crupier se jubila: despedida bajo el foco, créditos finales y el juego se cierra. Al volver, te espera una sorpresa.",
        "Win Ascension V and the dealer retires: a farewell under the spotlight, the end credits and the game closes. When you come back, there's a surprise.",
        "Gagne l'Ascension V et le croupier prend sa retraite : adieux sous le projecteur, générique de fin, puis le jeu se ferme. À ton retour, une surprise t'attend.",
        "Vença a Ascensão V e o crupiê se aposenta: despedida sob o holofote, créditos finais e o jogo se fecha. Quando você voltar, há uma surpresa.",
        "Gewinne Aufstieg V und der Croupier geht in Rente: Abschied im Scheinwerferlicht, Abspann, und das Spiel schließt sich. Wenn du zurückkommst, wartet eine Überraschung.",
        "Vinci l'Ascensione V e il croupier va in pensione: addio sotto il riflettore, titoli di coda e il gioco si chiude. Quando torni, ti aspetta una sorpresa.",
        "Gana la Ascensión V y Don Crupier se jubila: despedida bajo el reflector, créditos finales y el juego se cierra. Al volver, te espera una sorpresa.",
        "通关进阶五，荷官就会退休：聚光灯下的告别、片尾字幕，然后游戏关闭。等你回来时，有个惊喜在等你。",
        "어센션 5를 클리어하면 딜러가 은퇴합니다. 스포트라이트 아래의 작별, 엔딩 크레딧, 그리고 게임이 종료됩니다. 다시 돌아오면 깜짝 선물이 기다립니다.",
        "アセンション5を制覇すると、ディーラーが引退する。スポットライトの下での別れ、エンドロール、そしてゲームが終了。戻ってくると、サプライズが待っている。",
        "Пройди Восхождение V, и крупье уйдёт на пенсию: прощание в луче прожектора, финальные титры, и игра закроется. Когда вернёшься, тебя ждёт сюрприз.",
        "Wygraj Wniebowstąpienie V, a krupier przejdzie na emeryturę: pożegnanie w świetle reflektora, napisy końcowe i gra się zamyka. Po powrocie czeka niespodzianka."),
      chapters: [
        { id: "fin", kicker: L("Ascensión V", "Ascension V", "Ascension V", "Ascensão V", "Aufstieg V", "Ascensione V", "", "进阶五", "어센션 5", "アセンション5", "Восхождение V", "Wniebowstąpienie V"),
          title: L("El final del juego", "The end of the game", "La fin du jeu", "O fim do jogo", "Das Ende des Spiels", "La fine del gioco", "", "游戏的结局", "게임의 엔딩", "ゲームのエンディング", "Финал игры", "Zakończenie gry"),
          intro: L("La primera vez que ganas una expedición en Ascensión V, Geolite tiene su final.", "The first time you win an expedition on Ascension V, Geolite gets its ending.", "La première fois que tu gagnes une expédition en Ascension V, Geolite a sa fin.", "Na primeira vez que você vence uma expedição na Ascensão V, Geolite ganha seu final.", "Wenn du zum ersten Mal eine Expedition auf Aufstieg V gewinnst, bekommt Geolite sein Ende.", "La prima volta che vinci una spedizione in Ascensione V, Geolite ha il suo finale.", "", "你第一次在进阶五中赢下远征时，Geolite 迎来它的结局。", "어센션 5에서 처음으로 원정에 승리하면 Geolite의 엔딩이 펼쳐집니다.", "アセンション5で初めて遠征に勝つと、Geolite のエンディングが訪れる。", "Когда ты впервые выиграешь экспедицию на Восхождении V, у Geolite наступит финал.", "Gdy pierwszy raz wygrasz wyprawę na Wniebowstąpieniu V, Geolite dostaje swoje zakończenie."),
          entries: [
            E(L("La despedida", "The farewell", "Les adieux", "A despedida", "Der Abschied", "L'addio", "", "告别", "작별", "別れ", "Прощание", "Pożegnanie"), "new", "0.3.4", [
              L("La sala se apaga y Don Crupier se queda solo bajo el foco: recuerda el día en que os conocisteis, tus expediciones y tus horas en su mesa (tus datos reales), y anuncia que **se jubila**. Chasquea los dedos, el foco se apaga y la pantalla se apaga como una tele vieja.",
                "The room goes dark and the dealer stands alone under the spotlight: he remembers the day you met, your expeditions and your hours at his table (your real numbers), and announces he's **retiring**. He snaps his fingers, the spotlight dies and the screen switches off like an old TV.",
                "La salle s'éteint et le croupier reste seul sous le projecteur : il se souvient du jour de votre rencontre, de tes expéditions et de tes heures à sa table (tes vrais chiffres), et annonce qu'il **prend sa retraite**. Il claque des doigts, le projecteur s'éteint et l'écran s'éteint comme une vieille télé.",
                "A sala se apaga e o crupiê fica sozinho sob o holofote: lembra o dia em que vocês se conheceram, suas expedições e suas horas na mesa dele (seus números reais), e anuncia que **vai se aposentar**. Ele estala os dedos, o holofote se apaga e a tela desliga como uma TV antiga.",
                "Der Saal wird dunkel, und der Croupier steht allein im Scheinwerferlicht: Er erinnert sich an den Tag, an dem ihr euch kennengelernt habt, an deine Expeditionen und deine Stunden an seinem Tisch (deine echten Zahlen), und verkündet, dass er **in Rente geht**. Er schnippt mit den Fingern, der Scheinwerfer erlischt und der Bildschirm geht aus wie ein alter Fernseher.",
                "La sala si spegne e il croupier resta solo sotto il riflettore: ricorda il giorno in cui vi siete conosciuti, le tue spedizioni e le tue ore al suo tavolo (i tuoi numeri reali), e annuncia che **va in pensione**. Schiocca le dita, il riflettore si spegne e lo schermo si spegne come una vecchia TV.",
                "La sala se apaga y Don Crupier se queda solo bajo el reflector: recuerda el día en que se conocieron, tus expediciones y tus horas en su mesa (tus datos reales), y anuncia que **se jubila**. Chasquea los dedos, el reflector se apaga y la pantalla se apaga como una tele vieja.",
                "大厅暗下来，荷官独自站在聚光灯下：他回忆你们相识的那天、你的远征和你在他牌桌前度过的时光（全是你的真实数据），然后宣布他**要退休了**。他打个响指，聚光灯熄灭，屏幕像老电视一样关掉。",
                "홀이 어두워지고 딜러가 스포트라이트 아래 홀로 섭니다. 처음 만난 날, 원정 기록, 그의 테이블에서 보낸 시간(실제 데이터)을 떠올리고는 **은퇴**를 선언하죠. 손가락을 튕기면 스포트라이트가 꺼지고, 화면이 옛날 TV처럼 꺼집니다.",
                "ホールが暗くなり、ディーラーがスポットライトの下にひとり立つ。出会った日、君の遠征、彼のテーブルで過ごした時間（実際のデータ）を振り返り、**引退**を宣言する。指を鳴らすとスポットライトが消え、画面が古いテレビのように消える。",
                "Зал гаснет, и крупье остаётся один в луче прожектора: он вспоминает день вашего знакомства, твои экспедиции и часы за его столом (твои реальные цифры) и объявляет, что **уходит на пенсию**. Он щёлкает пальцами, прожектор гаснет, а экран выключается, как старый телевизор.",
                "Sala gaśnie, a krupier zostaje sam w świetle reflektora: wspomina dzień, w którym się poznaliście, twoje wyprawy i godziny przy jego stole (twoje prawdziwe dane), i ogłasza, że **przechodzi na emeryturę**. Pstryka palcami, reflektor gaśnie, a ekran wyłącza się jak stary telewizor."),
            ]),
            E(L("Los créditos", "The credits", "Le générique", "Os créditos", "Der Abspann", "I titoli di coda", "", "片尾字幕", "엔딩 크레딧", "エンドロール", "Титры", "Napisy końcowe"), "new", "0.3.4", [
              L("Se abren las cortinas y suben los **créditos finales** con un vals de la banda sonora: el estudio, la banda sonora original de **Álvaro Cano**, el reparto, tu **hoja de servicios** en un ticket de caja y las licencias (Wikipedia, Wikimedia Commons, tipografías, mapa). Mantén pulsado para acelerar; **Esc** salta al final.",
                "The curtains open and the **end credits** roll to a waltz from the soundtrack: the studio, the original soundtrack by **Álvaro Cano**, the cast, your **service record** on a till receipt, and the licenses (Wikipedia, Wikimedia Commons, fonts, map). Hold to speed up; **Esc** skips to the end.",
                "Les rideaux s'ouvrent et le **générique de fin** défile sur une valse de la bande originale : le studio, la bande originale d'**Álvaro Cano**, la distribution, tes **états de service** sur un ticket de caisse et les licences (Wikipédia, Wikimedia Commons, polices, carte). Maintiens pour accélérer ; **Échap** passe à la fin.",
                "As cortinas se abrem e os **créditos finais** sobem ao som de uma valsa da trilha sonora: o estúdio, a trilha sonora original de **Álvaro Cano**, o elenco, sua **folha de serviço** num cupom de caixa e as licenças (Wikipédia, Wikimedia Commons, fontes, mapa). Segure para acelerar; **Esc** pula para o fim.",
                "Der Vorhang öffnet sich und der **Abspann** läuft zu einem Walzer aus dem Soundtrack: das Studio, der Original-Soundtrack von **Álvaro Cano**, die Besetzung, deine **Dienstakte** auf einem Kassenbon und die Lizenzen (Wikipedia, Wikimedia Commons, Schriften, Karte). Halten zum Vorspulen; **Esc** springt zum Ende.",
                "Il sipario si apre e scorrono i **titoli di coda** su un valzer della colonna sonora: lo studio, la colonna sonora originale di **Álvaro Cano**, il cast, il tuo **stato di servizio** su uno scontrino e le licenze (Wikipedia, Wikimedia Commons, caratteri, mappa). Tieni premuto per accelerare; **Esc** salta alla fine.",
                "",
                "幕布拉开，**片尾字幕**伴着原声中的一首圆舞曲缓缓升起：工作室、**Álvaro Cano** 创作的原声音乐、演员表、印在收银小票上的**服务记录**，以及各项许可（维基百科、维基共享资源、字体、地图）。按住可加速，**Esc** 直接跳到结尾。",
                "커튼이 열리고 사운드트랙의 왈츠와 함께 **엔딩 크레딧**이 올라갑니다. 스튜디오, **Álvaro Cano**의 오리지널 사운드트랙, 출연진, 영수증에 찍힌 **근무 기록**, 그리고 라이선스(위키백과, 위키미디어 공용, 글꼴, 지도)까지. 길게 누르면 빨리 감기, **Esc**는 끝으로 건너뜁니다.",
                "幕が開き、サウンドトラックのワルツに乗せて**エンドロール**が流れる。スタジオ、**Álvaro Cano** によるオリジナルサウンドトラック、キャスト、レシートに印字された**勤務記録**、そしてライセンス（ウィキペディア、ウィキメディア・コモンズ、フォント、地図）。長押しで早送り、**Esc** で最後までスキップ。",
                "Занавес открывается, и под вальс из саундтрека идут **финальные титры**: студия, оригинальный саундтрек **Álvaro Cano**, актёры, твой **послужной список** на кассовом чеке и лицензии (Википедия, Викисклад, шрифты, карта). Удерживай, чтобы ускорить; **Esc** — сразу к концу.",
                "Kurtyna się rozsuwa i przy walcu ze ścieżki dźwiękowej płyną **napisy końcowe**: studio, oryginalna ścieżka dźwiękowa **Álvaro Cano**, obsada, twój **przebieg służby** na paragonie i licencje (Wikipedia, Wikimedia Commons, kroje pisma, mapa). Przytrzymaj, aby przyspieszyć; **Esc** przeskakuje na koniec."),
              L("Al final, Don Crupier vuelve bajo su foco con su placa de jubilado, se despide y cae el **FIN**. Al pulsar, se cierran las cortinas y **el juego se cierra**. Los textos de los créditos aún pueden cambiar.",
                "At the end, the dealer returns under his spotlight with his retirement plaque, says goodbye and **THE END** lands. Press and the curtains close and **the game shuts down**. The credits text may still change.",
                "À la fin, le croupier revient sous son projecteur avec sa plaque de retraité, fait ses adieux et le **FIN** tombe. Appuie : les rideaux se ferment et **le jeu se ferme**. Les textes du générique peuvent encore changer.",
                "No final, o crupiê volta sob o holofote com a placa de aposentado, se despede e cai o **FIM**. Toque: as cortinas se fecham e **o jogo se fecha**. Os textos dos créditos ainda podem mudar.",
                "Am Ende kehrt der Croupier mit seiner Rentnerplakette ins Scheinwerferlicht zurück, verabschiedet sich, und das **ENDE** schlägt ein. Drücke, und der Vorhang schließt sich und **das Spiel beendet sich**. Die Texte des Abspanns können sich noch ändern.",
                "Alla fine il croupier torna sotto il riflettore con la sua targa da pensionato, saluta e arriva la **FINE**. Premi: il sipario si chiude e **il gioco si chiude**. I testi dei titoli di coda possono ancora cambiare.",
                "Al final, Don Crupier vuelve bajo su reflector con su placa de jubilado, se despide y cae el **FIN**. Al presionar, se cierran las cortinas y **el juego se cierra**. Los textos de los créditos aún pueden cambiar.",
                "最后，荷官带着他的退休铭牌回到聚光灯下，道别之后**剧终**落下。按下按键，幕布合上，**游戏随之关闭**。片尾字幕的文字以后可能还会调整。",
                "마지막에는 딜러가 은퇴 명판과 함께 스포트라이트 아래로 돌아와 작별을 고하고, **끝**이 쾅 찍힙니다. 버튼을 누르면 커튼이 닫히고 **게임이 종료됩니다**. 크레딧 문구는 바뀔 수 있습니다.",
                "最後にディーラーが引退の銘板とともにスポットライトの下へ戻り、別れを告げると**完**の文字が落ちてくる。押すと幕が閉じ、**ゲームが終了する**。エンドロールの文言は今後変わる可能性がある。",
                "В конце крупье возвращается в луч прожектора с табличкой пенсионера, прощается, и падает **КОНЕЦ**. Нажми — занавес закроется, и **игра закроется**. Тексты титров ещё могут измениться.",
                "Na koniec krupier wraca w światło reflektora ze swoją tabliczką emeryta, żegna się i spada **KONIEC**. Naciśnij, a kurtyna się zasunie i **gra się zamknie**. Teksty napisów mogą się jeszcze zmienić."),
            ]),
            E(L("La vuelta", "The comeback", "Le retour", "A volta", "Die Rückkehr", "Il ritorno", "", "回归", "귀환", "復帰", "Возвращение", "Powrót"), "new", "0.3.4", [
              L("La próxima vez que abras el juego, la portada estará a oscuras con un cartel de **«Cerrado por jubilación»**. Llaman a la puerta tres veces... y vuelve: te cuenta cuánto le ha durado la jubilación (el tiempo real que has estado fuera) y por qué no piensa irse. Al final le da la vuelta al cartel: **ABIERTO**.",
                "Next time you open the game, the main menu is dark with a **Closed for retirement** sign. Three knocks on the door... and he's back: he tells you how long his retirement lasted (the real time you were away) and why he's not going anywhere. Then he flips the sign: **OPEN**.",
                "La prochaine fois que tu ouvres le jeu, l'écran d'accueil est plongé dans le noir avec une pancarte **« Fermé pour retraite »**. On frappe trois fois à la porte… et il revient : il te raconte combien de temps a duré sa retraite (le temps réel de ton absence) et pourquoi il ne compte pas partir. Puis il retourne la pancarte : **OUVERT**.",
                "Na próxima vez que você abrir o jogo, a tela inicial estará no escuro com uma placa de **“Fechado por aposentadoria”**. Batem três vezes na porta… e ele volta: conta quanto durou a aposentadoria (o tempo real que você ficou fora) e por que não pretende ir embora. Então vira a placa: **ABERTO**.",
                "Wenn du das Spiel das nächste Mal öffnest, ist das Hauptmenü dunkel und ein Schild hängt dort: **„Geschlossen wegen Ruhestand“**. Es klopft dreimal an der Tür … und er ist zurück: Er erzählt dir, wie lange seine Rente gedauert hat (die echte Zeit, die du weg warst), und warum er nicht vorhat zu gehen. Dann dreht er das Schild um: **GEÖFFNET**.",
                "La prossima volta che apri il gioco, il menu principale è al buio con un cartello **«Chiuso per pensione»**. Bussano tre volte alla porta… ed eccolo di ritorno: ti racconta quanto è durata la sua pensione (il tempo reale della tua assenza) e perché non ha intenzione di andarsene. Poi gira il cartello: **APERTO**.",
                "La próxima vez que abras el juego, la pantalla principal estará a oscuras con un letrero de **«Cerrado por jubilación»**. Tocan tres veces a la puerta... y vuelve: te cuenta cuánto le duró la jubilación (el tiempo real que estuviste fuera) y por qué no piensa irse. Al final le da la vuelta al letrero: **ABIERTO**.",
                "下次打开游戏时，主菜单一片漆黑，挂着一块**“荷官退休，暂停营业”**的牌子。门被敲了三下……他回来了：他会告诉你他的退休生活持续了多久（就是你离开的真实时长），以及他为什么不打算走。最后，他把牌子翻过来：**营业中**。",
                "다음에 게임을 켜면 메인 화면이 어둠에 잠겨 있고 **'은퇴로 인해 영업 종료'** 팻말이 걸려 있습니다. 문을 세 번 두드리는 소리… 그리고 그가 돌아옵니다. 은퇴 생활이 얼마나 갔는지(실제로 자리를 비운 시간)와 왜 떠날 생각이 없는지 이야기하고, 팻말을 뒤집습니다: **영업 중**.",
                "次にゲームを開くと、メニュー画面は真っ暗で、**「引退につき閉店」**の札が掛かっている。ドアを3回ノックする音……そして彼が戻ってくる。引退がどれだけ続いたか（君が離れていた実際の時間）と、なぜ辞めるつもりがないのかを語り、最後に札をひっくり返す。**営業中**。",
                "Когда ты в следующий раз откроешь игру, главное меню будет погружено во тьму, а на нём будет висеть табличка **«Закрыто по случаю пенсии»**. Три стука в дверь… и он возвращается: рассказывает, сколько продлилась его пенсия (реальное время твоего отсутствия) и почему уходить не собирается. А потом переворачивает табличку: **ОТКРЫТО**.",
                "Gdy następnym razem otworzysz grę, menu główne będzie pogrążone w ciemności, a na nim zawiśnie tabliczka **„Zamknięte z powodu emerytury”**. Trzy pukania do drzwi… i wraca: opowiada, ile trwała jego emerytura (prawdziwy czas twojej nieobecności) i dlaczego nie zamierza odchodzić. Potem odwraca tabliczkę: **OTWARTE**."),
            ]) ] },
      ],
    },
    {
      id: "0.3.3",
      name: ["Ajustes nuevos", "New settings"],
      date: "2026-10-08",
      summary: ["Ajustes rehechos de arriba abajo: pestaña nueva de Controles para cambiar cualquier tecla, botón del ratón o del mando, pestaña de Accesibilidad, y ningún ajuste bloqueado ni repetido.",
        "Settings rebuilt top to bottom: a new Controls tab to change any key, mouse button or controller button, an Accessibility tab, and no more locked or duplicated settings."],
      chapters: [
        { id: "ctl", kicker: ["Controles", "Controls"], title: ["Todo se puede cambiar", "Change anything"],
          intro: ["La pestaña Mando pasa a llamarse Controles y tiene tres vistas: Teclado, Ratón y Mando.",
            "The Controller tab is now Controls, with three views: Keyboard, Mouse and Controller."],
          entries: [
            E(["Teclas a tu gusto", "Your own keys"], "new", "0.3.3", [
              ["Cada acción tiene **tecla y alternativa**. Pulsas la casilla, el crupier te pide la tecla nueva y, si ya la usa otra acción, te ofrece **intercambiarlas**. **Esc** siempre abre la pausa, para que nunca te quedes sin salida.", "Every action has a **key and an alternate**. Click the slot, the dealer asks for the new key and, if another action already uses it, offers to **swap them**. **Esc** always opens the pause menu, so you're never stuck."],
              ["El mapa se mueve también con el teclado: **W A S D** de fábrica.", "The map now moves with the keyboard too: **W A S D** by default."],
            ]),
            E(["Arrastrar el mapa, con el botón que quieras", "Drag the map with any button"], "new", "0.3.3", [
              ["Elige qué botón del ratón **marca** en el mapa y cuál lo **arrastra**: izquierdo, derecho, rueda o los laterales. El dibujo del ratón te enseña cuál hace qué y se ilumina al pulsarlo.", "Pick which mouse button **pins** on the map and which one **drags** it: left, right, wheel or the side buttons. The mouse drawing shows which does what and lights up when you press it."],
              ["Además: **ratón para zurdos**, **rueda invertida**, zoom hacia el **puntero o el centro** y un **puntero de casino grande**.", "Also: **left-handed mouse**, **inverted wheel**, zoom toward the **pointer or the center** and a **large casino pointer**."],
            ]),
            E(["Mando a medida", "A controller that fits you"], "new", "0.3.3", [
              ["Un dibujo de tu mando que **se ilumina** con cada botón, perfiles **Estándar** y **Zurdo**, y cambiar el botón de cada acción pulsándolo o eligiéndolo en la lista.", "A drawing of your controller that **lights up** with every button, **Standard** and **Left-handed** profiles, and a new button for any action by pressing it or picking it from the list."],
              ["**Zona muerta** de cada stick con un visor en vivo (si tu mando se mueve solo, lo ves y lo corriges), **curva de respuesta**, **imán** que asienta el puntero en los botones de los menús (nunca en el mapa) e **intensidad de la vibración** con botón Probar.", "A **dead zone** for each stick with a live view (if your controller drifts, you see it and fix it), a **response curve**, a **magnet** that settles the pointer on menu buttons (never on the map) and **vibration strength** with a Test button."],
            ]) ] },
        { id: "fix", kicker: ["Accesibilidad y arreglos", "Accessibility and fixes"], title: ["Nada bloqueado", "Nothing locked"],
          intro: ["Revisamos cada ajuste: los que no hacían lo que decían, ahora sí.", "We went through every setting: the ones that didn't do what they said now do."],
          entries: [
            E(["Tamaño del texto", "Text size"], "fix", "0.3.3", [
              ["Antes solo agrandaba la placa de la pregunta. Ahora agranda también las pistas, el bocadillo del crupier, la carta grande y las ayudas, con vista previa.", "It used to enlarge only the question plate. Now it also enlarges clues, the dealer's speech bubble, the big card and tooltips, with a preview."],
            ]),
            E(["Movimiento en tres niveles", "Three motion levels"], "merge", "0.3.3", [
              ["**Reducir movimiento** y **Destellos suaves** (que se quedaba bloqueado) se juntan en **Completo / Suave / Mínimo**.", "**Reduce motion** and **Soft flashes** (which could get locked) become **Full / Soft / Minimal**."],
            ]),
            E(["Temblor y vibración, por separado", "Shake and vibration, apart"], "fix", "0.3.3", [
              ["**Vibración** hacía dos cosas a la vez y el mando necesitaba dos interruptores. Ahora el **Temblor de pantalla** está en Accesibilidad y la **vibración del mando** en Controles.", "**Vibration** did two things at once and the controller needed two switches. Now **Screen shake** lives in Accessibility and **controller vibration** in Controls."],
            ]),
            E(["Interfaz y pantalla completa", "Interface and fullscreen"], "fix", "0.3.3", [
              ["**Interfaz** solo podía encoger y su botón de agrandar estaba siempre apagado. Ahora es **Grande / Media / Compacta** y solo sale cuando tu ventana deja elegir. En pantalla completa, la resolución se muestra como dato, sin flechas muertas.", "**Interface** could only shrink and its enlarge button was always off. Now it's **Large / Medium / Compact** and only shows when your window allows a choice. In fullscreen, the resolution is shown as information, with no dead arrows."],
            ]),
            E(["Más cosas", "More"], "new", "0.3.3", [
              ["**Sonar en segundo plano**: apágalo y el juego calla al irte a otra ventana. En Datos, **Tus partidas** dice si tu progreso está en la nube de Steam. El tutorial se puede **repetir** desde General.", "**Play in background**: turn it off and the game goes quiet when you switch windows. In Data, **Your saves** tells you whether your progress is in Steam Cloud. The tutorial can be **replayed** from General."],
            ]) ] },
      ],
    },
    {
      id: "0.3.2",
      name: ["Acelerar y saltar", "Speed up & skip"],
      date: "2026-10-08",
      summary: ["Los juegos del casino se pueden acelerar o saltar hasta el resultado, sin recortarlos.",
        "The casino games can be sped up or skipped straight to the result, without cutting them short."],
      chapters: [
        { id: "ctl", kicker: ["La Barra", "The Bar"], title: ["Dos botones nuevos", "Two new buttons"],
          intro: ["Algunos juegos del centro de la Barra son largos y están pensados así. Ahora, si ya los conoces, puedes ir más rápido.",
            "Some games in the middle of the Bar run long, on purpose. Now, if you know them already, you can go faster."],
          entries: [
            E(["Mantén pulsado: ×2", "Hold: ×2"], "new", "0.3.2", [
              ["Abajo a la derecha de cada juego del casino hay un botón **×2**: mientras lo mantienes pulsado, **todo va al doble** (la animación, el crupier, los globos de texto y los efectos). Al soltarlo, todo vuelve a su ritmo. También con **Mayús**. Con mando, un toque lo fija y otro lo suelta.", "Bottom right of every casino game there is a **×2** button: while you hold it, **everything runs at double speed** (animation, dealer, speech bubbles and effects). Let go and it returns to normal. Also with **Shift**. With a gamepad, one tap locks it and another releases it."],
            ]),
            E(["Saltar", "Skip"], "new", "0.3.2", [
              ["El botón **Saltar** (o **Esc**) acelera la escena sin sonido y se detiene en el **resultado**, que se ve entero y a su ritmo. Lo que pagas no cambia: el resultado ya estaba decidido y cobrado antes de empezar.", "The **Skip** button (or **Esc**) fast-forwards the scene without sound and stops at the **result**, which you see in full at normal speed. What you win doesn't change: the result was already decided and paid before it started."],
              ["Los botones se esconden cuando el juego espera algo de ti (agitar los dados, elegir un cubilete, soltar la ficha, despegar o cobrar el globo, rascar) y vuelven en cuanto el juego sigue solo. Están en los ocho juegos y desaparecen con Reducir movimiento, donde las escenas ya son cortas.", "The buttons hide whenever the game is waiting for you (shaking the dice, picking a cup, dropping the chip, taking off or cashing out the balloon, scratching) and return as soon as it carries on by itself. They are in all eight games and disappear with Reduce motion, where the scenes are already short."],
            ]) ] },
        { id: "linux", kicker: ["Steam Deck y Linux", "Steam Deck and Linux"], title: ["Sin pantalla negra", "No black screen"],
          intro: ["Arreglo de arranque para Linux y Steam Deck.", "A startup fix for Linux and Steam Deck."],
          entries: [
            E(["Arranque en X11", "Starts on X11"], "fix", "0.3.2", [
              ["En Linux y Steam Deck el juego arranca siempre en X11: con Wayland la ventana podía quedarse en negro. Deja además un registro **geolite-log.txt** junto al juego por si hay que diagnosticar algo, y **Geolite-seguro** arranca sin aceleración gráfica si el negro viene del driver.", "On Linux and Steam Deck the game now always starts on X11: under Wayland the window could stay black. It also leaves a **geolite-log.txt** log next to the game in case something needs diagnosing, and **Geolite-seguro** starts without graphics acceleration if the black screen comes from the driver."]
            ]) ] },
      ],
    },
    {
      id: "0.3.1",
      name: { es: "Doce idiomas de verdad", en: "Twelve real languages", fr: "Douze vraies langues", pt: "Doze idiomas de verdade", de: "Zwölf echte Sprachen", it: "Dodici lingue vere", "es-419": "Doce idiomas de verdad", zh: "十二种地道语言", ko: "진짜 12개 언어", ja: "本物の12言語", ru: "Двенадцать настоящих языков", pl: "Dwanaście prawdziwych języków" },
      date: "2026-10-08",
      summary: {
        es: "Revisión nativa de todos los textos del juego en los 12 idiomas: menús, retos, cartas, casino, Clásico, pistas y, sobre todo, el crupier, que ahora bromea como uno más en cada idioma.",
        en: "A native review of every text in the game across all 12 languages: menus, challenges, cards, casino, Classic, clues and, above all, the dealer, who now jokes like a local in every language.",
        fr: "Relecture native de tous les textes du jeu dans les 12 langues : menus, défis, cartes, casino, Classique, indices et surtout le croupier, qui plaisante désormais comme un local dans chaque langue.",
        pt: "Revisão nativa de todos os textos do jogo nos 12 idiomas: menus, desafios, cartas, cassino, Clássico, pistas e, acima de tudo, o crupiê, que agora faz piada como um local em cada idioma.",
        de: "Muttersprachliche Überarbeitung aller Texte des Spiels in allen 12 Sprachen: Menüs, Herausforderungen, Karten, Casino, Klassik, Hinweise und vor allem der Croupier, der jetzt in jeder Sprache scherzt wie ein Einheimischer.",
        it: "Revisione madrelingua di tutti i testi del gioco nelle 12 lingue: menu, sfide, carte, casinò, Classico, indizi e soprattutto il croupier, che ora scherza come uno del posto in ogni lingua.",
        "es-419": "Revisión nativa de todos los textos del juego en los 12 idiomas: menús, retos, cartas, casino, Clásico, pistas y, sobre todo, el crupier, que ahora bromea como uno más en cada idioma.",
        zh: "对游戏全部 12 种语言的所有文本进行了母语级审校：菜单、挑战、卡牌、赌场、经典模式、线索，尤其是荷官——他现在在每种语言里都能像本地人一样开玩笑。",
        ko: "게임의 모든 텍스트를 12개 언어 전부 원어민 수준으로 다듬었습니다. 메뉴, 도전, 카드, 카지노, 클래식, 힌트, 그리고 무엇보다 이제 각 언어에서 현지인처럼 농담하는 딜러까지.",
        ja: "ゲーム内のすべてのテキストを12言語すべてでネイティブが見直しました。メニュー、チャレンジ、カード、カジノ、クラシック、ヒント、そして何よりディーラー。どの言語でも地元っ子のように冗談を飛ばします。",
        ru: "Носители языка вычитали все тексты игры на всех 12 языках: меню, испытания, карты, казино, «Классику», подсказки и прежде всего крупье — теперь он шутит на каждом языке как свой.",
        pl: "Natywna korekta wszystkich tekstów gry we wszystkich 12 językach: menu, wyzwania, karty, kasyno, tryb klasyczny, wskazówki i przede wszystkim krupier, który teraz w każdym języku żartuje jak swój."
      },
      chapters: [
        { id: "idiomas", kicker: ["Idiomas", "Languages"], title: ["Traducción premium", "Premium localization"],
          intro: ["Cada idioma lo han repasado de principio a fin revisores nativos, con una segunda pasada de coherencia.", "Native reviewers went through every language from start to finish, followed by a second pass for consistency."],
          entries: [
            E(["Casi 2.900 textos corregidos", "Almost 2,900 texts fixed"], "fix", "0.3.1", [
              ["Erratas, calcos, frases que decían otra cosa que el original, registro y tuteo coherentes, y nombres de cartas, retos y minijuegos unificados en todo el juego.", "Typos, literal translations, lines that said something other than the original, a consistent tone and form of address, and card, challenge and minigame names unified across the whole game."],
              ["Los 15 logros que llegaron en la 0.2.56 ya no salen en inglés en los otros 10 idiomas.", "The 15 achievements added in 0.2.56 no longer show up in English in the other 10 languages."],
              ["El inglés pasa a inglés de EE. UU. en todo el juego; el portugués es de Brasil de verdad (topónimos incluidos) y el español latinoamericano tiene su propia voz donde el de España chirría.", "English is now US English throughout; Portuguese is truly Brazilian (place names included), and Latin American Spanish gets its own voice wherever Spain's would grate."]
            ]),
            E(["El crupier, con gracia local", "The dealer, with local wit"], "change", "0.3.1", [
              ["En cada idioma, unas treinta frases suyas usan refranes, juegos de palabras y guiños propios de ese público, sin cambiar la situación ni las reglas.", "In every language, about thirty of his lines now use that audience's own sayings, puns and nods, without changing the situation or the rules."]
            ])
          ] }
      ]
    },
    {
      id: "0.3.0",
      name: ["Build limpia", "A clean build"],
      date: "2026-10-07",
      summary: ["Geolite se queda solo con lo que es hoy. Cada tarjeta de la Enciclopedia enseña la foto de su lugar, el aviso de tarjeta nueva trae foto grande e información, y la numeración pasa a 0.3.N.",
        "Geolite keeps only what it is today. Every Encyclopedia card shows the photo of its place, the new-card notice comes with a large photo and information, and numbering moves to 0.3.N."],
      chapters: [
        { id: "enciclopedia", kicker: ["Enciclopedia", "Encyclopedia"], title: ["Una foto en cada tarjeta", "A photo on every card"],
          intro: ["Cada lugar es una carta con tres niveles (bronce, plata y oro) y los tres comparten su foto.",
            "Each place is one card with three levels (bronze, silver and gold) and all three share its photo."],
          entries: [
            E(["Aviso de tarjeta nueva", "New card notice"], "change", "0.3.0", [
              ["Al acertar un lugar, el aviso enseña su **foto** en grande con el nombre, el país y una línea de descripción. Espera a que la foto cargue en vez de enseñar un icono.", "When you nail a place, the notice shows its **photo** large, with its name, country and a one-line description. It waits for the photo to load instead of showing an icon."]
            ]),
            E(["Catorce lugares con foto nueva", "Fourteen places with a new photo"], "fix", "0.3.0", [
              ["Batalla de Zama, Chrysler Building, Cuevas de Ellora, Asedio de Sarajevo, Tratado de Roma, Desastre aéreo de Múnich, Sejong el Grande, Apartheid, Reforma, Bollywood, K-pop, Holi, Qumrán y Níger no tenían foto. Todas son libres para uso comercial y llevan su autor y licencia en los créditos.", "Battle of Zama, Chrysler Building, Ellora Caves, Siege of Sarajevo, Treaty of Rome, Munich air disaster, Sejong the Great, Apartheid, Reformation, Bollywood, K-pop, Holi, Qumran and Niger had no photo. All are free for commercial use and credit their author and licence."]
            ]),
            E(["Sin ilustración de relleno", "No filler artwork"], "out", "0.3.0", [
              ["La ficha de cada tarjeta ya no se tapa con una ilustración por tipo: manda la foto.", "A card's page no longer sits under a filler illustration: the photo comes first."]
            ])
          ] },
        { id: "rendimiento", kicker: ["Rendimiento", "Performance"], title: ["Medir antes de tocar", "Measure before touching"],
          intro: ["Pulsa **F3** para ver los fotogramas por segundo, la memoria y el motor del mapa. No cambia cómo se juega.",
            "Press **F3** to see frames per second, memory and the map engine. It does not change how the game plays."],
          entries: [
            E(["Panel de rendimiento", "Performance panel"], "new", "0.3.0", [
              ["**F3** lo enseña u oculta, y guarda un informe por pantalla (`geolite-perf.txt`) para enviarlo si algo va a tirones. En Steam Deck también se activa con `GEOLITE_PERF=1`.", "**F3** shows or hides it, and saves a per-screen report (`geolite-perf.txt`) you can send if something stutters. On Steam Deck it also turns on with `GEOLITE_PERF=1`."]
            ])
          ] },
        { id: "limpieza", kicker: ["Limpieza", "Clean-up"], title: ["Solo lo que hay hoy", "Only what is here today"],
          intro: ["Esta versión retira lo heredado para que el juego sea exactamente lo que se ve.",
            "This version removes what was left over so the game is exactly what you see."],
          entries: [
            E(["Menos peso muerto", "Less dead weight"], "out", "0.3.0", [
              ["Salen **48 iconos** y **24 escenas** que ningún juego usaba, las notas de parches anteriores y el código que adaptaba partidas guardadas de versiones antiguas.", "Out go **48 icons** and **24 scenes** nothing used, the notes from earlier patches and the code that adapted saves from older versions."]
            ]),
            E(["Nueva numeración", "New numbering"], "change", "0.3.0", [
              ["La versión es **0.3.0**: el 0 inicial es de preproducción, el 3 es el hito en el que estamos y la tercera cifra sube con cada entrega.", "The version is **0.3.0**: the leading 0 means pre-release, 3 is the current milestone and the third digit goes up with every release."]
            ])
          ] }
      ]
    }
  ];
})(window.AIQ);
