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
      id: "0.3.6",
      name: ["Banderas en la ruleta", "Flags on the wheel"],
      date: "2026-10-08",
      summary: ["Las rondas de banderas estrenan ilustración y las nubes del Reto diario son iguales para todos.", "Flag rounds get their own artwork and the Daily Challenge clouds are the same for everyone."],
      chapters: [
        { id: "ban", kicker: ["Aventura", "Adventure"], title: ["Retoques", "Touch-ups"],
          intro: ["Dos detalles que faltaban.", "Two missing details."],
          entries: [
            E(["Rondas de banderas", "Flag rounds"], "new", "0.3.6", [
              ["Las rondas 3 y 8 (Banderas I y el jefe de Banderas II) tienen escena propia: **una ruleta con las casillas pintadas de banderas**. Antes reutilizaban la de Países.", "Rounds 3 and 8 (Flags I and the Flags II boss) have their own scene: **a roulette wheel with flag-painted pockets**. They used to borrow the Countries one."],
            ]),
            E(["Nubes del Reto diario", "Daily Challenge clouds"], "fix", "0.3.6", [
              ["Con el reto de las nubes, los claros salen **en el mismo sitio para todos** en el Reto diario, como ya pasaba con las grietas, las huellas y las ventanas.", "With the clouds challenge, the gaps now appear **in the same place for everyone** in the Daily Challenge, as cracks, prints and windows already did."],
            ]) ] },
      ],
    },
    {
      id: "0.3.5",
      name: ["Dedicatoria", "Dedication"],
      date: "2026-10-08",
      summary: ["Los créditos finales terminan con la dedicatoria del autor.", "The end credits now close with the author's dedication."],
      chapters: [
        { id: "ded", kicker: ["Créditos finales", "End credits"], title: ["Al final de todo", "At the very end"],
          intro: ["Lo último que se lee antes de que vuelva Don Crupier.", "The last thing you read before the dealer comes back."],
          entries: [
            E(["Dedicatoria", "Dedication"], "new", "0.3.5", [
              ["Después de «Gracias por jugar», el rodillo se detiene con la dedicatoria: **para Alejandra y Alicia (A³)**, y una dedicatoria especial a **Hugiitop**, el incansable beta tester del juego.", "After “Thanks for playing”, the credits stop on the dedication: **to Alejandra and Alicia (A³)**, plus a special dedication to **Hugiitop**, the game's tireless beta tester."],
            ]) ] },
      ],
    },
    {
      id: "0.3.4",
      name: ["La jubilación", "The retirement"],
      date: "2026-10-08",
      summary: ["Gana la Ascensión V y Don Crupier se jubila: despedida bajo el foco, créditos finales y el juego se cierra. Al volver, te espera una sorpresa.",
        "Win Ascension V and the dealer retires: a farewell under the spotlight, the end credits and the game closes. When you come back, there's a surprise."],
      chapters: [
        { id: "fin", kicker: ["Ascensión V", "Ascension V"], title: ["El final del juego", "The end of the game"],
          intro: ["La primera vez que ganas una expedición en Ascensión V, Geolite tiene su final.",
            "The first time you win an expedition on Ascension V, Geolite gets its ending."],
          entries: [
            E(["La despedida", "The farewell"], "new", "0.3.4", [
              ["La sala se apaga y Don Crupier se queda solo bajo el foco: recuerda el día en que os conocisteis, tus expediciones y tus horas en su mesa (tus datos reales), y anuncia que **se jubila**. Chasquea los dedos, el foco se apaga y la pantalla se apaga como una tele vieja.", "The room goes dark and the dealer stands alone under the spotlight: he remembers the day you met, your expeditions and your hours at his table (your real numbers), and announces he's **retiring**. He snaps his fingers, the spotlight dies and the screen switches off like an old TV."],
            ]),
            E(["Los créditos", "The credits"], "new", "0.3.4", [
              ["Se abren las cortinas y suben los **créditos finales** con un vals de la banda sonora: el estudio, la banda sonora original de **Álvaro Cano**, el reparto, tu **hoja de servicios** en un ticket de caja y las licencias (Wikipedia, Wikimedia Commons, tipografías, mapa). Mantén pulsado para acelerar; **Esc** salta al final.", "The curtains open and the **end credits** roll to a waltz from the soundtrack: the studio, the original soundtrack by **Álvaro Cano**, the cast, your **service record** on a till receipt, and the licenses (Wikipedia, Wikimedia Commons, fonts, map). Hold to speed up; **Esc** skips to the end."],
              ["Al final, Don Crupier vuelve bajo su foco con su placa de jubilado, se despide y cae el **FIN**. Al pulsar, se cierran las cortinas y **el juego se cierra**. Los textos de los créditos aún pueden cambiar.", "At the end, the dealer returns under his spotlight with his retirement plaque, says goodbye and **THE END** lands. Press and the curtains close and **the game shuts down**. The credits text may still change."],
            ]),
            E(["La vuelta", "The comeback"], "new", "0.3.4", [
              ["La próxima vez que abras el juego, la portada estará a oscuras con un cartel de **«Cerrado por jubilación»**. Llaman a la puerta tres veces... y vuelve: te cuenta cuánto le ha durado la jubilación (el tiempo real que has estado fuera) y por qué no piensa irse. Al final le da la vuelta al cartel: **ABIERTO**.", "Next time you open the game, the main menu is dark with a **Closed for retirement** sign. Three knocks on the door... and he's back: he tells you how long his retirement lasted (the real time you were away) and why he's not going anywhere. Then he flips the sign: **OPEN**."],
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
