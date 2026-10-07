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
 * FORMATO DE LOS TEXTOS: ["espanol", "english"]. Los otros 10 idiomas caen al ingles; si algun dia se traduce uno, se pasa un objeto
 * { es, en, fr, pt, de, it, "es-419", zh, ko, ja, ru, pl } en lugar del par. Una cadena suelta vale para todos los idiomas.
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

  A.PATCHES = [
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
