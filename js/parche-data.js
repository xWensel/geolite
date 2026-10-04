/*
 * Geolite - NOTAS DEL PARCHE: los datos (js/parche.js los pinta; css/parche.css los viste).
 *
 * Desde la 0.2.3 la version del juego Y el parche llevan el mismo numero (0.2.N); antes eran distintos (el parche 0.2.1 y 0.2.2 agrupan compilaciones 0.50.1 a 0.78.1, mostradas como "comp."). Cada entrega sube el numero y trae su nota (pequena: 1 o 2 lineas).
 * Cada parche junta varias versiones del juego (campo `games`). El jugador los ve desde el icono del cuaderno,
 * en la esquina inferior izquierda de la portada, y navega por los anteriores en la lista de la izquierda.
 *
 * REGLA: un parche PUBLICADO queda CERRADO. Todo cambio posterior (aunque sea pequeno) va a un parche NUEVO (v0.2.2, v0.2.3...), nunca como edicion de uno anterior.
 *
 * COMO ANADIR UN PARCHE NUEVO
 *   1. Pon sus imagenes (capturas del juego real, webp, ~1100 px de ancho) en assets/parche/ y anade su tamano real a `SZ`
 *      (ancho, alto: asi la pagina reserva el hueco y no salta al cargar; sin dato se reserva un 16:9).
 *   2. Anade UN objeto al PRINCIPIO de `A.PATCHES` (el mas nuevo va primero; la lista y el punto rojo de "nuevo" salen solos):
 *        { id: "0.2.2", name: ["Nombre", "Name"], date: "2026-11-01", games: ["0.73.1", "0.75.1"],
 *          summary: ["Resumen de un parrafo.", "One-paragraph summary."],
 *          chapters: [ { id: "x", kicker: [..], title: [..], intro: [..],
 *                        cards:   [ { name: [..], text: [..] } ],                 // opcional: tarjetas de "Lo mas destacado"
 *                        entries: [ E(nombre, etiqueta, "version del juego", [lineas], [imagenes]) ] } ],
 *          timeline: [ ["0.73.1", ["Que trajo", "What it brought"]] ] }            // opcional: "Todas las versiones"
 *   3. La version del juego se sube aparte (CLAUDE.md) y la entrada del README cuenta el parche; el numero del parche vive solo aqui.
 *
 * FORMATO DE LOS TEXTOS: ["espanol", "english"]. Los otros 10 idiomas caen al ingles; si algun dia se traduce uno, se pasa un objeto
 * { es, en, fr, pt, de, it, "es-419", zh, ko, ja, ru, pl } en lugar del par. Una cadena suelta vale para todos los idiomas.
 * Dentro de un texto, **asi** pone negrita (nada de HTML: se escapa todo).
 * ETIQUETAS: new (Nuevo) change (Cambio) buff (Mejora) nerf (Ajuste) fix (Arreglo) out (Sale) merge (Fusion).
 * IMAGENES: I("archivo-sin-extension", ["pie es", "caption en"], "wide" | "half" | "third" | "tall").
 *   wide = todo el ancho (por defecto); half y third se colocan en fila (2 o 3 por fila); tall = captura alta, mas estrecha y centrada.
 * Pasos con numeros: se miden contra el README (las entradas de cada version del juego son la fuente de verdad).
 */
window.AIQ = window.AIQ || {};
(function (A) {
  /* ancho y alto reales de cada imagen de assets/parche/ */
  const SZ = {"teclado-crupier":[640,440],"mando-iconos":[1100,190],"mando-cursor":[1100,430],"pantalla-ajustes":[1100,382],"ticket-bandera":[1100,619],"ticket-dos-banderas":[1100,619],"ticket-encuadre":[1100,619],"ticket-racha":[1100,161],"amuleto-sello":[1100,619],"apuestas-barra":[1100,825],"bandera-destenida":[1100,618],"bandera-viento":[1100,618],"bigbang-1":[1100,618],"bigbang-2":[1100,618],"bigbang-3":[1100,618],"cambiar-por":[1100,618],"dividir":[940,500],"duelo-banca":[1100,618],"escalada-acto3":[1100,928],"escalada-apagon":[1100,618],"etiqueta-nuevo":[1100,618],"galeria-reliquias":[1060,1170],"iconos-herramientas":[840,240],"iconos-t14":[1000,460],"iconos-t15":[1040,440],"iconos-t16":[820,622],"miopia":[1100,618],"mochila-amuletos":[884,260],"nombre-girado":[1100,618],"pacto-oferta":[1100,825],"pared-cinco":[1100,928],"pase-vip":[1100,309],"retos-t14":[1100,618],"retos-t15":[1100,618],"rojo-negro":[1100,412],"rueda-coleccionista":[1100,928],"sangre-fria":[1100,837],"segunda-bola":[1100,618],"siesta":[1100,618],"tanda7":[1100,1237],"tanda8":[1100,548],"tienda-ventajas":[1100,618],"vitrina":[1100,618]};
  const I = (src, cap, size) => ({ src, cap, size: size || "wide", w: (SZ[src] || [1100, 618])[0], h: (SZ[src] || [1100, 618])[1] });
  const E = (name, tag, ver, items, imgs) => ({ name, tag, ver, items, imgs: imgs || [] });

  A.PATCHES = [
    {
      id: "0.2.33",
      name: ["Créditos en casa", "Credits at home"],
      date: "2026-10-04",
      summary: ["Los créditos se leen dentro del juego, y en la Steam Deck la pantalla del Clásico se recoloca para que su letra se lea bien.", "Credits are now read inside the game, and on Steam Deck the Classic screen is rearranged so its text reads well."],
      chapters: [
        { id: "cr", kicker: ["Ajustes", "Settings"], title: ["Créditos y licencias", "Credits and licenses"],
          entries: [
            E(["Dentro del juego", "Inside the game"], "change", "0.2.33", [
              ["**Créditos y licencias** ya no abre el navegador: se leen en un panel del propio juego, con buscador, y se cierran con **B** o **Esc**.", "**Credits and licenses** no longer opens your browser: they're read in the game's own panel, with search, and close with **B** or **Esc**."],
            ]) ] },
        { id: "deck", kicker: ["Steam Deck", "Steam Deck"], title: ["Letra, segunda tanda", "Text, second pass"],
          entries: [
            E(["El Clásico", "Classic"], "change", "0.2.33", [
              ["En la Deck, las campañas del **Clásico** van en tres columnas y a tamaño completo, sin encogerse. Más textos pequeños crecen en Aventura, Reto diario y la Enciclopedia.", "On the Deck, the **Classic** campaigns sit in three columns at full size, without shrinking. More small texts grow in Adventure, Daily challenge and the Encyclopedia."],
            ]) ] },
      ],
    },
    {
      id: "0.2.32",
      name: ["Letra a la medida de la Deck", "Text sized for the Deck"],
      date: "2026-10-04",
      summary: ["En la Steam Deck, la letra pequeña de las etiquetas crece para leerse bien en sus 7 pulgadas. En PC no cambia nada.", "On Steam Deck, the small label text grows so it reads well on its 7-inch screen. Nothing changes on PC."],
      chapters: [
        { id: "deck", kicker: ["Steam Deck", "Steam Deck"], title: ["Legibilidad", "Legibility"],
          entries: [
            E(["Letra mínima", "Minimum text size"], "change", "0.2.32", [
              ["Las etiquetas en mayúsculas de menús, Ajustes, Aventura, Reto diario, Enciclopedia y partida pasan a **16 px** en la Deck, nítidas, y los selectores que no cabían (unidades, modo daltónico) se recolocan.", "Uppercase labels in menus, Settings, Adventure, Daily challenge, Encyclopedia and gameplay grow to **16 px** on the Deck, still crisp, and the selectors that no longer fit (units, colour-blind mode) are rearranged."],
            ]) ] },
      ],
    },
    {
      id: "0.2.31",
      name: ["El teclado del crupier", "The dealer's keyboard"],
      date: "2026-10-04",
      summary: ["Ya puedes escribir tu nombre y buscar en la Enciclopedia con mando: con el teclado de Steam o con el del crupier.", "You can now type your name and search the Encyclopedia with a controller: with Steam's keyboard or the dealer's."],
      chapters: [
        { id: "teclado", kicker: ["Mando", "Controller"], title: ["Escribir con mando", "Typing with a controller"],
          entries: [
            E(["Teclado en pantalla", "On-screen keyboard"], "new", "0.2.31", [
              ["Pulsa **A** en una casilla de texto: sale el teclado de **Steam** y, si no está disponible, el del **crupier**, con tildes de todos los idiomas y cirílico en ruso.", "Press **A** on a text box: **Steam**'s keyboard opens and, if it isn't available, the **dealer**'s, with accents for every language and Cyrillic in Russian."],
              ["Con mando, **X** borra, **Y** pone un espacio, **Menú** confirma y **B** cierra. En la **Steam Deck** se abre solo.", "With a controller, **X** deletes, **Y** adds a space, **Menu** confirms and **B** closes. On **Steam Deck** it opens by itself."],
            ], [I("teclado-crupier", ["El teclado del crupier", "The dealer's keyboard"], "half")]) ] },
      ],
    },
    {
      id: "0.2.30",
      name: ["Hablando tu idioma", "Speaking your language"],
      date: "2026-10-04",
      summary: ["Con mando, el tutorial y los retos explican los controles del mando, y el crupier deja de hablarte de tu ratón.", "With a controller, the tutorial and challenges explain the controller's controls, and the dealer stops talking about your mouse."],
      chapters: [
        { id: "textos", kicker: ["Mando", "Controller"], title: ["Instrucciones a medida", "Tailored instructions"],
          entries: [
            E(["Lo que se lee", "What you read"], "change", "0.2.30", [
              ["Con mando, el tutorial dice **pulsa A** (o **Cruz** en PlayStation) y **mueve la mira con el stick**, y el humo, la lluvia y la pantalla en reposo se explican con el stick y los botones. Con ratón, todo sigue igual.", "With a controller, the tutorial says **press A** (or **Cross** on PlayStation) and **move the crosshair with the stick**, and smoke, rain and the sleeping screen are explained with the stick and buttons. With a mouse, nothing changes."],
            ]),
            E(["El crupier", "The dealer"], "new", "0.2.30", [
              ["Se da cuenta cuando coges un mando o juegas en la **Steam Deck**, y no te habla de tu ratón si no lo estás usando.", "He notices when you pick up a controller or play on **Steam Deck**, and doesn't talk about your mouse if you're not using one."],
            ]),
            E(["Juego limpio", "Fair play"], "fix", "0.2.30", [
              ["En la **Siesta del crupier**, mover el mapa con el stick hace el mismo ruido que arrastrarlo con el ratón, y los gatillos respetan tu sensibilidad de zoom.", "In **The dealer's nap**, moving the map with the stick makes the same noise as dragging it with the mouse, and the triggers follow your zoom sensitivity."],
            ]) ] },
      ],
    },
    {
      id: "0.2.29",
      name: ["Botones a la vista", "Buttons in sight"],
      date: "2026-10-04",
      summary: ["Con mando, el juego enseña sus botones en vez de las teclas, con iconos pixel art para Xbox, PlayStation y Steam Deck.", "With a controller, the game now shows its buttons instead of keys, with pixel-art icons for Xbox, PlayStation and Steam Deck."],
      chapters: [
        { id: "iconos", kicker: ["Mando", "Controller"], title: ["Iconos de botones", "Button icons"],
          entries: [
            E(["Cada mando, los suyos", "Each controller, its own"], "new", "0.2.29", [
              ["En cuanto tocas el mando, las ayudas, la leyenda de **Ajustes**, **Siguiente** y **Cambiar pregunta** enseñan sus botones; con un **DualSense**, cruz, círculo, cuadrado y triángulo. Al volver al ratón vuelven las teclas.", "As soon as you touch the controller, tooltips, the **Settings** legend, **Next** and **Swap question** show its buttons; with a **DualSense**, cross, circle, square and triangle. Back on the mouse, the keys come back."],
              ["En la **Steam Deck** el juego arranca ya con mando y con sus iconos, y tocar la pantalla no los cambia.", "On **Steam Deck** the game starts ready for the controller with its own icons, and touching the screen doesn't switch them."],
            ], [I("mando-iconos", ["La leyenda de Ajustes y el botón Siguiente, con mando de Xbox y de PlayStation", "The Settings legend and the Next button, with Xbox and PlayStation controllers"])]) ] },
      ],
    },
    {
      id: "0.2.28",
      name: ["Con mando", "With a controller"],
      date: "2026-10-04",
      summary: ["Geolite ya se juega con mando: el stick mueve el puntero, la cruceta salta entre botones y cartas, y los gatillos acercan el mapa.", "Geolite now plays with a controller: the stick moves the pointer, the D-pad jumps between buttons and cards, and the triggers zoom the map."],
      chapters: [
        { id: "mando", kicker: ["Mando", "Controller"], title: ["Primera entrega", "First step"],
          entries: [
            E(["En el mapa", "On the map"], "new", "0.2.28", [
              ["**Stick izquierdo**: mueve la mira, con más precisión cuanto más acercas. Mantén **LB** para ir despacio. Al llegar al borde de la pantalla, empuja el mapa.", "**Left stick**: moves the crosshair, more precise the closer you zoom. Hold **LB** to go slow. At the edge of the screen it pushes the map."],
              ["**Stick derecho**: mueve el mapa. **Gatillos**: alejan y acercan donde está la mira. **A**: clava la chincheta. **RB**: vuelve a la vista inicial.", "**Right stick**: moves the map. **Triggers**: zoom out and in where the crosshair is. **A**: drops the pin. **RB**: back to the starting view."],
              ["Los retos que tuercen el puntero le afectan igual que al ratón.", "Challenges that twist the pointer affect it just like the mouse."],
            ], [I("mando-cursor", ["El cursor del mando, ya sobre el botón de seguir", "The controller cursor, already on the next button"])]),
            E(["En los menús", "In menus"], "new", "0.2.28", [
              ["La **cruceta** salta al botón o carta más cercano en cada dirección; **A** pulsa y **B** vuelve atrás. **Menú** abre la pausa o los Ajustes.", "The **D-pad** jumps to the nearest button or card in each direction; **A** presses and **B** goes back. **Menu** opens the pause or Settings."],
              ["Al aparecer un botón principal (Siguiente, Continuar), el cursor va solo a él. Las cartas se abren en grande y el crupier reacciona igual que con el ratón, y el mando vibra con los premios.", "When a main button appears (Next, Continue), the cursor goes straight to it. Cards open big and the dealer reacts just like with the mouse, and the controller rumbles with prizes."],
            ]) ] },
      ],
    },
    {
      id: "0.2.27",
      name: ["Tu pantalla, a tu medida", "Your screen, your size"],
      date: "2026-10-04",
      summary: ["En Ajustes eliges el tamaño exacto de la ventana, el monitor y el tamaño de la interfaz, y cambiar de modo ya nunca recarga el juego.", "In Settings you now pick the exact window size, the monitor and the interface size, and switching modes never reloads the game."],
      chapters: [
        { id: "pantalla", kicker: ["Escritorio", "Desktop"], title: ["Pantalla", "Display"],
          entries: [
            E(["Tamaño y monitor", "Size and monitor"], "new", "0.2.27", [
              ["En **Ajustes > General > Pantalla** eliges el tamaño de la ventana en píxeles reales, de 960 × 600 a 4K; solo salen los que caben en tu monitor. **Auto** es el más grande que deja aire, y si estiras el borde a mano se guarda como **Personalizado**.", "In **Settings > General > Display** you pick the window size in real pixels, from 960 × 600 up to 4K; only the sizes that fit your monitor are listed. **Auto** is the largest one that leaves some room, and if you drag the edge yourself it is kept as **Custom**."],
              ["Con dos o más monitores, las flechas junto a **Pantalla** llevan el juego de uno a otro, en ventana o a pantalla completa.", "With two or more monitors, the arrows next to **Display** move the game from one to another, windowed or fullscreen."],
            ], [I("pantalla-ajustes", ["Pantalla, con el tamaño y el monitor", "Display, with size and monitor"])]),
            E(["Interfaz", "Interface"], "new", "0.2.27", [
              ["En **Imagen**, **Interfaz** hace los menús y el marcador más pequeños o más grandes en pantallas grandes, sin bajar nunca del tamaño de diseño ni pasar de lo que cabe.", "In **Display settings**, **Interface** makes menus and the HUD smaller or larger on big screens, never below their design size and never beyond what fits."],
            ]),
            E(["Ventana", "Window"], "fix", "0.2.27", [
              ["**Sin bordes** pasa a ser la pantalla completa, y cambiar de modo, de tamaño o de monitor ya no recarga el juego ni repite la intro.", "**Borderless** is now the fullscreen mode, and changing mode, size or monitor no longer reloads the game or replays the intro."],
              ["La ventana mide exactamente lo elegido (antes contaba el marco), cabe en portátiles pequeños, recuerda su sitio y vuelve a la pantalla si desconectas un monitor.", "The window is exactly the size you chose (it used to include the frame), fits small laptops, remembers where it was and comes back on screen if you unplug a monitor."],
            ]) ] },
      ],
    },
    {
      id: "0.2.26",
      name: ["El mismo cristal para todos", "Same glass for everyone"],
      date: "2026-10-04",
      summary: ["En el Reto diario, los retos que tapan el mapa salen igual para todo el mundo.", "In the Daily challenge, the challenges that cover the map now play out the same for everyone."],
      chapters: [
        { id: "justo", kicker: ["Reto diario", "Daily challenge"], title: ["Juego limpio", "Fair play"],
          entries: [
            E(["Mismo reparto", "Same layout"], "change", "0.2.26", [
              ["Las grietas de **Cristal roto**, las **huellas**, las ventanas de **No responde** y la **batería** salen en el mismo sitio y en el mismo momento para todos los jugadores del día, como ya pasaba con las Chinchetas trampa. En la Aventura siguen siendo distintas cada vez.", "**Cracked glass**, the **prints**, the **Not responding** windows and the **battery** now appear in the same place and at the same moment for every player of the day, just like the Trap pins. In Adventure they still change every time."]
            ]) ] },
      ],
    },
    {
      id: "0.2.25",
      name: ["El diario, aparte", "The daily, apart"],
      date: "2026-10-04",
      summary: ["El Reto diario ya no desbloquea barajas ni da los logros de victoria y de Ascensión: eso solo se gana en la Aventura.", "The Daily challenge no longer unlocks decks or grants the victory and Ascension achievements: those are earned only in Adventure."],
      chapters: [
        { id: "diario", kicker: ["Reto diario", "Daily challenge"], title: ["Lo que cuenta", "What counts"],
          entries: [
            E(["Logros y barajas", "Achievements and decks"], "change", "0.2.25", [
              ["Ganar un intento del Reto diario ya no da **Terra Incognita** ni los logros de **Ascensión**, así que tampoco desbloquea barajas. Igual que la Ascensión, se ganan en la Aventura.", "Winning a Daily challenge attempt no longer grants **Terra Incognita** or the **Ascension** achievements, so it doesn't unlock decks either. Like Ascension, they're earned in Adventure."]
            ]) ] },
      ],
    },
    {
      id: "0.2.24",
      name: ["Revisión a fondo", "A full sweep"],
      date: "2026-10-04",
      summary: ["Hemos repasado el juego entero, pantalla a pantalla y carta a carta, y arreglado todo lo que fallaba: trampas sin querer en las apuestas y las reliquias, retos que no hacían lo que decían, distancias mal medidas en mares y océanos, el crupier cortado a media frase y varios sustos de la versión de escritorio.",
        "We went through the whole game, screen by screen and card by card, and fixed everything that was off: accidental exploits in bets and relics, challenges that didn't do what they said, wrong distances for seas and oceans, the dealer cut off mid-sentence and a few scares in the desktop version."],
      chapters: [
        { id: "aventura", kicker: ["Aventura", "Adventure"], title: ["Apuestas, reliquias y tiempo", "Bets, relics and time"],
          entries: [
            E(["Apuestas", "Bets"], "fix", "0.2.24", [
              ["**Doble o nada** y **La apuesta final** perdidas ya no salen como activas en el Campamento de la revancha, ni se puede recuperar lo apostado.", "A lost **Double or nothing** or **Final bet** no longer shows as active in the rematch Camp, and you can't take your stake back."],
              ["En el Campamento de la revancha, perder en el casino trae de verdad el reto que anuncia.", "In the rematch Camp, losing at the casino really brings the challenge it announces."],
              ["**Rojo o negro** ya no ofrece el verde en la ronda 12: ya vas directo al jefe final.", "**Red or black** no longer offers green in round 12: you're already heading for the final boss."],
              ["Un doble clic en **Sobornar**, **Barajar** o **Cambiar cartas** ya no cobra dos veces.", "A double click on **Bribe**, **Reshuffle** or **New cards** no longer charges you twice."]
            ]),
            E(["Reliquias", "Relics"], "fix", "0.2.24", [
              ["**Corazón**: al venderlo se lleva también la provisión que te dio. Antes, comprarlo y venderlo regalaba una.", "**Heart**: selling it also takes back the provision it gave. Before, buying and selling it gave you one for free."],
              ["**Segunda bola**: repite el tiro siempre que tu clic no hace racha (más de 300 km), como dice la carta. Desde la 0.2.20, entre 300 y unos 770 km no había segundo tiro.", "**Second ball**: you shoot again whenever your click doesn't make a streak (over 300 km), as the card says. Since 0.2.20 there was no second shot between 300 and about 770 km."],
              ["**Ficha de propina** cobra solo las respuestas que hacen racha, y **Guardarrachas** no se gasta en la 6.ª pregunta de **As en la manga**.", "**Tip chip** only pays answers that make a streak, and **Streak guard** isn't spent on the 6th question of **Ace up the sleeve**."],
              ["Con **Mesa de mínimos**, el botín en vivo anuncia el escalón que cobrarás de verdad.", "With **Low-stakes table**, the live loot shows the tier you'll really get."],
              ["El **Soplo del crupier** se luce como las demás pistas.", "The **Dealer's tip-off** shows off like the other hints."],
              ["Vender una reliquia desde su carta justo al empezar la ronda ya no la cobra y la deja actuar.", "Selling a relic from its card right as the round starts no longer pays you and keeps it working."]
            ]),
            E(["Tiempo y partidas guardadas", "Time and saved runs"], "fix", "0.2.24", [
              ["**Guardar y salir** desde la pausa ya no te devuelve una pregunta agotada al continuar.", "**Save and exit** from the pause menu no longer brings you back to a timed-out question."],
              ["Tras minimizar la ventana, **Descarte** o **Dividir** ya no restan otra vez el tiempo gastado.", "After minimizing the window, **Discard** or **Split** no longer subtract the time spent a second time."],
              ["Reanudar una expedición ya no devuelve los sobornos de una ronda que barajaste.", "Resuming an expedition no longer refunds bribes from a round you reshuffled."],
              ["**Reto diario**: terminar el intento en el modo infinito cuenta también los puntos del infinito.", "**Daily challenge**: ending the attempt in infinite mode also counts the infinite points."],
              ["La intro de las rondas de banderas ya tiene ilustración.", "The intro of flag rounds now has its illustration."]
            ]) ] },
        { id: "retos", kicker: ["Retos y jefes", "Challenges and bosses"], title: ["Que hagan lo que dicen", "Doing what they say"],
          entries: [
            E(["Retos", "Challenges"], "fix", "0.2.24", [
              ["Los retos sellados (Oferta de la casa, Pacto con la casa, casino) ya no sacan retos que solo existen dentro de un jefe y que fuera no hacían nada.", "Sealed challenges (House offer, Pact with the house, casino) no longer draw challenges that only exist inside a boss and did nothing outside it."],
              ["Si Windows reinicia la tarjeta gráfica en mitad de un efecto (Apagón, Humo de sala, Noche de tormenta, Punto ciego), el efecto vuelve en un momento. Antes desaparecía y ya no volvía en toda la sesión.", "If Windows resets the graphics card in the middle of an effect (Blackout, Smoky room, Stormy night, Blind spot), the effect comes back in a moment. Before it vanished for the rest of the session."],
              ["**Runas**: tras responder, el nombre vuelve a leerse bien.", "**Runes**: after answering, the name reads properly again."],
              ["Al salir de una Aventura, el puntero olvida tus reliquias: en el Clásico ya no salen el termómetro, la lupa, las guías ni el nombre del país.", "When you leave an Adventure, the pointer forgets your relics: Classic no longer shows the thermometer, magnifier, guides or country name."]
            ]),
            E(["Jefes", "Bosses"], "fix", "0.2.24", [
              ["**Ascensión 4**: la Rueda de la fortuna y El coleccionista ya traen su reto extra (antes lo perdían siempre), y el poder extra nunca es un segundo reto de la placa.", "**Ascension 4**: the Wheel of fortune and The collector now bring their extra challenge (they always lost it before), and the extra power is never a second plate challenge."],
              ["La **Rueda de la fortuna** devuelve todo el tiempo que tapa la pantalla (se perdía algo más de 1 s por pregunta), y el **Pantallazo azul** también.", "The **Wheel of fortune** gives back all the time it covers the screen (you lost just over 1 s per question), and so does the **Blue screen**."],
              ["**La siesta del crupier**: al despertar en Apagón, el Apagón llega siempre, sin reiniciar a mitad de pregunta el cristal, las huellas, la lluvia, la batería ni las ventanas que ya habías cerrado; y la rueda del ratón sigue haciendo ruido aunque se reinicie la tarjeta gráfica.", "**The dealer's nap**: waking up into Blackout always brings the Blackout, without resetting the glass, prints, rain, battery or the windows you'd closed mid-question; and the mouse wheel keeps making noise even if the graphics card resets."],
              ["**Duelo con la banca**: el mapa ya no se recoloca en cada pregunta; y el álbum de **El coleccionista** cuadra aunque sobornes una carta boca abajo.", "**Showdown with the bank**: the map no longer rearranges on every question; and **The collector**'s album lines up even if you bribe a face-down card."]
            ]) ] },
        { id: "mapa", kicker: ["Mapa", "Map"], title: ["Medir bien", "Measuring right"],
          entries: [
            E(["Mapa y Enciclopedia", "Map and Encyclopedia"], "fix", "0.2.24", [
              ["Mares, océanos y estrechos: la distancia se mide hasta su último borde. Desde el Atlántico, el Índico salía a 1.182 km en vez de 187.", "Seas, oceans and straits: distance is measured up to their last edge. From the Atlantic, the Indian Ocean came out at 1,182 km instead of 187."],
              ["Al revelar el Pacífico, el Ártico o el Austral ya no sale una raya roja en el antimeridiano.", "Revealing the Pacific, Arctic or Southern Ocean no longer draws a red line on the antimeridian."],
              ["Si sueltas el ratón fuera de la ventana mientras arrastras el mapa (Alt+Tab, superposición de Steam), el mapa ya no se queda pegado.", "Releasing the mouse outside the window while dragging the map (Alt+Tab, Steam overlay) no longer leaves the map stuck."],
              ["Sin WebGL2 (mapa de reserva), el Pase VIP y el Duelo con la banca ya no atascan la partida.", "Without WebGL2 (fallback map), the VIP pass and the Showdown with the bank no longer freeze the run."],
              ["**Enciclopedia**: buscar sin letras especiales encuentra Białoruś, Beringstraße o Đà Nẵng, y la carta del **lémur** por fin se desbloquea (con Madagascar).", "**Encyclopedia**: searching without special letters finds Białoruś, Beringstraße or Đà Nẵng, and the **lemur** card can finally be unlocked (with Madagascar)."]
            ]) ] },
        { id: "mesa", kicker: ["Crupier y escritorio", "Dealer and desktop"], title: ["Sin sustos", "No scares"],
          entries: [
            E(["Crupier", "Dealer"], "fix", "0.2.24", [
              ["En **La siesta del crupier** ya no se duerme a media frase: la termina, con su segundo de más.", "In **The dealer's nap** he no longer falls asleep mid-sentence: he finishes it, plus his extra second."],
              ["Su última frase del veredicto ya no reaparece en la portada, y el del tutorial deja de moverse al cerrarlo.", "His last verdict line no longer reappears on the title screen, and the tutorial one stops moving once closed."],
              ["Las flechas ya no cambian de canción mientras pasas fichas en la Enciclopedia o capturas en estas notas.", "The arrow keys no longer change the song while you flip through Encyclopedia cards or screenshots in these notes."]
            ]),
            E(["Versión de escritorio", "Desktop version"], "fix", "0.2.24", [
              ["Fuera el menú oculto: Ctrl+R ya no recarga la partida, Ctrl+W no cierra el juego y Ctrl+− / Ctrl++ no cambian el zoom (el pixel art quedaba borroso).", "No more hidden menu: Ctrl+R no longer reloads your run, Ctrl+W doesn't close the game and Ctrl+− / Ctrl++ don't change the zoom (the pixel art went blurry)."],
              ["**Sin bordes** se abre en el monitor donde está la ventana, y en ese modo la tecla F ya no recarga el juego (se cambia en Ajustes).", "**Borderless** opens on the monitor the window is on, and in that mode the F key no longer reloads the game (change it in Settings)."],
              ["Si Windows tiene reservado el puerto del juego, se usa el siguiente; si no queda ninguno, sale un aviso en vez de quedarse abierto sin ventana.", "If Windows has the game's port reserved, the next one is used; if none is free, you get a message instead of the game hanging without a window."],
              ["Clasificaciones: **Hoy** y **Ayer** ya no reciben partidas de otro día ni tu mejor marca al cambiarte el nombre, y una expedición que no llegó al servidor se reenvía al ver la tabla.", "Leaderboards: **Today** and **Yesterday** no longer get runs from another day or your best ever when you change your name, and an expedition that didn't reach the server is resent when you view the table."]
            ]) ] },
      ],
    },
    {
      id: "0.2.23",
      name: ["Un pacto que cumple", "A pact that delivers"],
      date: "2026-10-04",
      summary: ["El Pacto con la casa ya no ocupa el hueco que te da: ahora sí suma uno.",
        "The Pact with the house no longer takes up the slot it gives you: now it really adds one."],
      chapters: [
        { id: "pacto", kicker: ["Reliquias", "Relics"], title: ["Pacto con la casa", "Pact with the house"],
          entries: [
            E(["No ocupa hueco", "Takes no slot"], "buff", "0.2.23", [
              ["Antes daba +1 hueco pero lo ocupaba él mismo, así que no ganabas nada y cargabas con su reto. Ahora no ocupa sitio: la mochila tiene **6 huecos libres** (5 en Ascensión 5).",
                "Before, it gave +1 slot but took it up itself, so you gained nothing and still carried its challenge. Now it takes no space: the pack has **6 free slots** (5 at Ascension 5)."],
              ["Se ve como un **lacre de cera** junto al contador de Reliquias; al pasar el ratón se abre su carta. Entra aunque lleves la mochila llena.",
                "It shows as a **wax seal** next to the Relics counter; hover it to open its card. It goes in even with a full pack."]
            ]) ] },
      ],
    },
    {
      id: "0.2.22",
      name: ["Lo que vale", "What it's worth"],
      date: "2026-10-04",
      summary: ["Con la mochila llena, tus reliquias enseñan lo que cobras por venderlas, no una flecha de cambio.",
        "With a full pack, your relics show what you get for selling them, not a swap arrow."],
      chapters: [
        { id: "precio", kicker: ["Campamento", "Camp"], title: ["Mochila llena", "Full pack"],
          entries: [
            E(["Precio de venta a la vista", "Sale price in sight"], "change", "0.2.22", [
              ["Al elegir una carta con la mochila llena, cada reliquia lleva una etiqueta roja con su moneda y lo que te dan por venderla (**+N**). Fuera la flecha ⇄, que parecía mandarla a la tienda.",
                "When you pick a card with a full pack, each relic wears a red tag with its coin and what you get for selling it (**+N**). The ⇄ arrow, which looked like it sent it to the shop, is gone."]
            ]) ] },
      ],
    },
    {
      id: "0.2.21",
      name: ["Vender, no cambiar", "Sell, don't swap"],
      date: "2026-10-04",
      summary: ["Con la mochila llena, para hacer sitio a una carta nueva se vende una reliquia: nada de cambiar.",
        "With a full pack, you make room for a new card by selling a relic: no more swapping."],
      chapters: [
        { id: "vender", kicker: ["Campamento", "Camp"], title: ["Mochila llena", "Full pack"],
          entries: [
            E(["Vender para hacer sitio", "Sell to make room"], "change", "0.2.21", [
              ["En el cofre del jefe y en el Campamento, con la mochila llena, la carta dice **vende una…**: eliges qué reliquia vendes, cobras lo que vale y la carta elegida entra en su hueco (gratis en el cofre).",
                "In the boss chest and at the Camp, with a full pack, the card says **sell one…**: you pick which relic to sell, get what it's worth and the chosen card takes its slot (free in the chest)."],
              ["Una Ventaja nueva dice **vende la otra**: la que llevabas se vende.", "A new Edge says **sells your other one**: the one you had gets sold."]
            ]) ] },
      ],
    },
    {
      id: "0.2.20",
      name: ["Las dianas mandan", "Rings rule"],
      date: "2026-10-03",
      summary: ["Acertar y el veredicto de cada respuesta siguen ya los anillos de la Enciclopedia: 300, 150 y 75 km. Además, el zoom de Gigantes y enanos ya no se descuadra.",
        "Landing a hit and each answer's verdict now follow the Encyclopedia rings: 300, 150 and 75 km. Also, the Giants and dwarfs zoom no longer drifts."],
      chapters: [
        { id: "dianas", kicker: ["Puntuación", "Scoring"], title: ["Anillos como regla", "Rings as the rule"],
          entries: [
            E(["Acierto y veredicto", "Hit and verdict"], "change", "0.2.20", [
              ["Acertar (racha, bandera y Guardarrachas) es caer a **300 km** o menos de la respuesta (el doble en mares y naturaleza), igual para todas las rondas. Antes era el 60 % de los puntos, que en las rondas avanzadas pedía menos de 150 km.",
                "A hit (streak, flag and Streak guard) means landing within **300 km** of the answer (double for seas and nature), the same in every round. Before it was 60% of the points, which late on asked for under 150 km."],
              ["El veredicto del ticket sale de los anillos: 75 km, 150 km y 300 km. Los puntos no cambian.",
                "The ticket's verdict comes from the rings: 75 km, 150 km and 300 km. Points are unchanged."]
            ]),
            E(["Encuadre del revelado", "Reveal framing"], "fix", "0.2.20", [
              ["Al responder, el zoom encuadra el mapa tal como queda al deshacerse el reto, así que con Gigantes y enanos ya no enfoca un punto equivocado.",
                "On answering, the zoom frames the map as it ends up once the challenge is undone, so with Giants and dwarfs it no longer aims at the wrong spot."]
            ]) ] },
      ],
    },
    {
      id: "0.2.19",
      name: ["La espera de la ruleta", "The wheel's wait"],
      date: "2026-10-03",
      summary: ["Con Reducir movimiento, las ruletas ya no sueltan el resultado al instante: esperan 2 segundos, sin giro pero con tensión.",
        "With Reduce motion on, the wheels no longer drop the result instantly: they wait 2 seconds, no spin but with tension."],
      chapters: [
        { id: "espera", kicker: ["Campamento", "Camp"], title: ["La Barra", "The Bar"],
          entries: [
            E(["Resultado sin prisas", "No instant results"], "fix", "0.2.19", [
            ["Antes, con **Reducir movimiento** el resultado salía en el acto. Ahora hay 2 segundos de espera tras el «No va más», sin giro pero con el suspense de siempre.", "Before, with **Reduce motion** the result appeared at once. Now there's a 2-second wait after \"No more bets\", no spin but with the usual suspense."]]),
          ] },
      ],
    },
    {
      id: "0.2.18",
      name: ["La ruleta gira siempre", "The wheel always spins"],
      date: "2026-10-03",
      summary: ["Rojo o negro, la Moneda y la Ruleta de premios ya muestran su animación aunque tu sistema tenga las animaciones desactivadas.",
        "Red or black, the Coin and the Prize wheel now show their animation even if your system has animations turned off."],
      chapters: [
        { id: "giro", kicker: ["Campamento", "Camp"], title: ["La Barra", "The Bar"],
          entries: [
            E(["La animación no aparecía", "The animation was missing"], "fix", "0.2.18", [
            ["Con «mostrar animaciones» desactivado en Windows, las ruletas saltaban directas al resultado sin girar. Ahora giran siempre; solo las apaga el ajuste **Reducir movimiento** del propio juego.", "With \"show animations\" turned off in Windows, the wheels jumped straight to the result without spinning. Now they always spin; only the game's own **Reduce motion** setting turns them off."]]),
          ] },
      ],
    },
    {
      id: "0.2.17",
      name: ["Casino para todos", "Casino for everyone"],
      date: "2026-10-03",
      summary: ["El juego de casino del centro de la Barra sale en todos los Campamentos, también en tu primera partida.",
        "The casino game in the middle of the Bar shows up at every Camp, your very first run included."],
      chapters: [
        { id: "casino", kicker: ["Campamento", "Camp"], title: ["La Barra", "The Bar"],
          entries: [
            E(["El casino, desde el primer Campamento", "Casino from the very first Camp"], "fix", "0.2.17", [
            ["Rojo o negro, Moneda al aire y Ruleta de premios aparecían solo después de derrotar a tu primer jefe: quien empezaba de cero veía únicamente los suministros. Ahora el juego del centro sale en **todos** los Campamentos.", "Red or black, Coin flip and the Prize wheel only appeared after you beat your first boss: anyone starting from scratch saw only the supplies. Now the middle game shows up at **every** Camp."],
            ["Lo mismo con las apuestas de la derecha (Oferta de la casa, Doble o nada y Apuesta final): salen desde el primer Campamento, en las rondas que les tocan.", "Same for the side bets on the right (House offer, Double or nothing and Final bet): they show up from the first Camp, in the rounds they belong to."]]),
          ] },
      ],
    },
    {
      id: "0.2.16",
      name: ["Lluvia de chinchetas", "Pin rain"],
      date: "2026-10-03",
      summary: ["El reto Chinchetas trampa por fin engaña: caen muchas más y también en el mar, así que una chincheta ya no te dice dónde hay tierra.",
        "The Decoy pins challenge finally fools you: far more of them fall, and into the sea too, so a pin no longer tells you where land is."],
      chapters: [
        { id: "chinchetas", kicker: ["Retos", "Challenges"], title: ["Chinchetas trampa", "Decoy pins"],
          entries: [
            E(["Muchas más, también en el mar", "Many more, at sea too"], "buff", "0.2.16", [
            ["Caen **30, 52 u 80** chinchetas según el nivel del reto (antes 8, 14 o 22), primero bien repartidas y luego cada vez más juntas, hasta llenar el mapa.", "**30, 52 or 80** pins fall depending on the challenge level (before 8, 14 or 22), well spread at first and then ever closer, until the map is full."],
            ["Ya no caen solo en tierra: antes, «donde hay chincheta hay un país» era una pista y el mar quedaba siempre limpio.", "They no longer land only on land: before, \"where there's a pin there's a country\" was a hint and the sea always stayed clear."],
            ["Cada chincheta suena al clavarse con un tic de kalimba corto y siempre distinto, más bajito cuantas más caen.", "Each pin sounds as it sticks, with a short kalimba tick that is never the same, quieter the more of them fall."]]),
          ] },
      ],
    },
    {
      id: "0.2.15",
      name: ["El ticket nuevo", "The new ticket"],
      date: "2026-10-03",
      summary: ["Cada respuesta se lee como una mano de Balatro: la bandera del sitio si aciertas, cuánto y hacia dónde fallaste, la cuenta PUNTOS × RACHA siempre a la vista y un mapa que encuadra tu chincheta y el objetivo en el hueco libre.",
        "Every answer reads like a Balatro hand: the place's flag when you get it right, how far and which way you missed, the POINTS × STREAK sum always in view, and a map that frames your pin and the target in the free space."],
      chapters: [
        { id: "ticket", kicker: ["Partida", "Gameplay"], title: ["El ticket de cada respuesta", "The ticket for every answer"],
          entries: [
            E(["La bandera del acierto", "The flag for a hit"], "new", "0.2.15", [
            ["Si aciertas (lo mismo que alarga la racha), la chincheta del objetivo se convierte en un mástil y la **bandera pixel** del país sube y ondea en el sitio, con su corneta. En el ticket va junto al nombre del lugar: aprendes banderas en todas las rondas, no solo en las de banderas.", "If you get it right (the same rule that extends your streak), the target pin becomes a flagpole and the country's **pixel flag** rises and waves on the spot, with its own bugle. On the ticket it sits next to the place's name: you learn flags in every round, not just the flag rounds."],
            ["Los lugares de dos países (el K2, el lago Titicaca) izan las dos. Si fallas, el ticket deja el mástil vacío con el hueco punteado de la bandera que había en juego.", "Places shared by two countries (K2, Lake Titicaca) raise both. If you miss, the ticket shows the empty pole with the dotted outline of the flag that was at stake."]],
            [I("ticket-bandera", ["Tokio a 60 km: la bandera de Japón se iza en el mapa y en el ticket, y la racha se enciende.", "Tokyo at 60 km: Japan's flag rises on the map and on the ticket, and the streak lights up."]),
             I("ticket-dos-banderas", ["El K2 iza las banderas de Pakistán y China.", "K2 raises the flags of Pakistan and China."], "half"),
             I("ticket-encuadre", ["Jerusalén a 2.500 km: las dos chinchetas a la vista, el mástil vacío y la racha rota.", "Jerusalem at 2,500 km: both pins in view, the empty pole and the broken streak."], "half")]),
            E(["La cuenta, como en Balatro", "The sum, Balatro-style"], "change", "0.2.15", [
            ["En la Aventura y el Reto diario la cuenta **PUNTOS × RACHA** sale siempre. Sin racha, la caja roja está apagada (×1); con racha se enciende con llamas que crecen con ella; y si pierdes una racha de 2 o más, se agrieta («Racha rota, era ×1,6»).", "In the Adventure and the Daily challenge the **POINTS × STREAK** sum is always shown. With no streak the red box is off (×1); with a streak it lights up with flames that grow with it; and if you lose a streak of 2 or more, it cracks (\"Streak broken, was ×1.6\")."],
            ["El total cuenta en dos tiempos: primero los puntos y, con el golpe de la racha, sube por el multiplicador.", "The total counts in two beats: first the points and then, with the streak's slam, it climbs by the multiplier."],
            ["En el Clásico la racha no multiplica: se cuenta en su propia fila.", "In Classic the streak does not multiply: it is counted in its own row."]],
            [I("ticket-racha", ["Apagada, encendida y rota.", "Off, lit and broken."])]),
            E(["Lo que aprendes al clicar", "What you learn from a click"], "new", "0.2.15", [
            ["Debajo de los km, hacia dónde fallaste («Demasiado al oeste») y en qué país cayó tu chincheta: en verde si es el bueno, en rojo si no.", "Under the km, which way you missed (\"Too far west\") and which country your pin landed in: green if it is the right one, red if not."],
            ["Alrededor del objetivo se dibujan los anillos de la Enciclopedia (300, 150 y 75 km, o los de esa pregunta) y se encienden en bronce, plata y oro al ritmo de sus jackpots.", "Around the target the Encyclopedia rings are drawn (300, 150 and 75 km, or that question's own) and light up in bronze, silver and gold in time with their jackpots."],
            ["Los territorios que no son país de ninguna pregunta (Groenlandia, el Sáhara Occidental, las Malvinas...) ya se nombran en tu idioma.", "Territories that are not a country in any question (Greenland, Western Sahara, the Falklands...) are now named in your language."]]),
            E(["El mapa encuadra tu respuesta", "The map frames your answer"], "fix", "0.2.15", [
            ["Al responder, el mapa centra tu chincheta y el objetivo en el hueco que de verdad queda libre (antes la placa, la nota o el crupier podían taparlos) y se aleja si fallaste por mucho.", "When you answer, the map centres your pin and the target in the space that is actually free (before, the plate, the note or the dealer could cover them) and zooms out if you missed by a lot."],
            ["Junto al antimeridiano (Nueva Zelanda, Fiyi, Samoa) ya no se quedan bajo el ticket, y tu chincheta va por el camino corto.", "Near the antimeridian (New Zealand, Fiji, Samoa) they no longer end up under the ticket, and your pin takes the short way."]]),
            E(["La cinta de la racha", "The streak ribbon"], "fix", "0.2.15", [
            ["Decía «Racha ×3» con el número de aciertos, y parecía un ×3. Ahora dice «Racha 3 · ×1,4»: el multiplicador de verdad.", "It read \"Streak ×3\" with the number of hits, which looked like a ×3. Now it reads \"Streak 3 · ×1.4\": the real multiplier."]]),
            E(["El ticket en ventanas pequeñas", "The ticket in small windows"], "fix", "0.2.15", [
            ["En ventanas de 900 px de ancho o menos (la web y el móvil; la ventana de Steam empieza en 960 × 600), el ticket va a la derecha, entre la placa y la nota, y cabe entero sin desplazarse: ni la nota, ni los avisos de logro o tarjeta, ni el crupier lo tapan.", "In windows 900 px wide or less (the web and mobile; the Steam window starts at 960 × 600), the ticket sits on the right, between the plate and the note, and fits whole without scrolling: neither the note, nor the achievement or card notices, nor the dealer cover it."],
            ["Con la ventana mínima de Steam, el globo del crupier ya no se mete en el ticket.", "At the smallest Steam window, the dealer's speech bubble no longer runs into the ticket."]]),
          ] },
      ],
    },
    {
      id: "0.2.14",
      name: ["Atraco sin trampas", "A fair heist"],
      date: "2026-10-03",
      summary: ["El Atraco de la Ruleta de premios se lleva exactamente la mitad de tus doblones, sin tope.",
        "The Prize wheel's Heist takes exactly half your doubloons, with no cap."],
      chapters: [
        { id: "atraco", kicker: ["Campamento", "Camp"], title: ["La Ruleta de premios", "The Prize wheel"],
          entries: [
            E(["Atraco: la mitad, sin reglas", "Heist: half, no rules"], "change", "0.2.14", [
            ["Pierdes la mitad de lo que lleves, sin tope, redondeada hacia abajo: con 7 doblones pierdes 3.", "You lose half of what you carry, with no cap, rounded down: with 7 doubloons you lose 3."]]),
          ] },
      ],
    },
    {
      id: "0.2.13",
      name: ["Iconos de la mesa, pulidos", "Table icons, polished"],
      date: "2026-10-03",
      summary: ["Los iconos de Rojo o negro, la Moneda al aire, la Ruleta de premios y sus casillas se redibujan a mano, pixel a pixel, con el acabado de los iconos de la Barra.",
        "The icons for Red or black, the Coin flip, the Prize wheel and its slots are redrawn by hand, pixel by pixel, with the finish of the bar icons."],
      chapters: [
        { id: "pulido", kicker: ["Arte", "Art"], title: ["Pixel a pixel", "Pixel by pixel"],
          entries: [
            E(["La mesa de casino, a limpio", "The casino table, clean"], "change", "0.2.13", [
            ["Ruleta con la Tierra de Geolite en el centro, rueda de la fortuna con bombillas y su pie, y en las casillas: pilas de doblones, lingotes, carta de reto con lacre, la bolsa con antifaz, el cronómetro casi agotado y el cofre vacío con su polilla. La moneda del icono es la misma que gira.", "A roulette with the Geolite Earth in the center, a wheel of fortune with bulbs and a stand, and on the slots: stacks of doubloons, gold bars, a sealed challenge card, the masked money bag, the nearly empty stopwatch and the empty chest with its moth. The icon's coin is the same one that spins."]]),
          ] },
      ],
    },
    {
      id: "0.2.12",
      name: ["Arte al nivel de los logros", "Art at achievement level"],
      date: "2026-10-03",
      summary: ["Todos los iconos de la mesa de casino se rehacen con el mismo proceso que los logros.",
        "All the casino table icons are redone with the same process as the achievements."],
      chapters: [
        { id: "arte", kicker: ["Arte", "Art"], title: ["Los dibujos de la mesa", "The table drawings"],
          entries: [
            E(["Ruleta, rueda y casillas", "Roulette, wheel and slots"], "change", "0.2.12", [
            ["Rojo o negro, la Ruleta de premios y sus casillas (doblones, premio gordo, reto extra, atraco, reloj corto y nada) estrenan dibujo, hechos con el mismo estilo y acabado que los logros. «Nada» es ahora un cofre abierto y vacío.", "Red or black, the Prize wheel and its slots (doubloons, jackpot, extra challenge, heist, short clock and nothing) get new drawings, made with the same style and finish as the achievements. «Nothing» is now an open, empty chest."]]),
          ] },
      ],
    },
    {
      id: "0.2.11",
      name: ["La caja vacía", "The empty box"],
      date: "2026-10-03",
      summary: ["La casilla Nada de la Ruleta de premios estrena dibujo: una caja de regalo abierta y vacía.",
        "The Nothing slot of the Prize wheel gets a new picture: an open, empty gift box."],
      chapters: [
        { id: "nada", kicker: ["Arte", "Art"], title: ["Nada", "Nothing"],
          entries: [
            E(["Una caja de regalo vacía", "An empty gift box"], "change", "0.2.11", [
            ["Sustituye a la cartera con telaraña: la caja está abierta, sin nada dentro, con su tapa y su lazo en el suelo.", "It replaces the cobwebbed wallet: the box is open with nothing inside, its lid and bow on the floor."]]),
          ] },
      ],
    },
    {
      id: "0.2.10",
      name: ["Iconos de la mesa", "Table icons"],
      date: "2026-10-03",
      summary: ["Rojo o negro estrena icono con la Tierra de Geolite y la Ruleta de premios, un dibujo claro en cada casilla.",
        "Red or black gets a new icon with the Geolite Earth, and the Prize wheel gets a clear picture on every slot."],
      chapters: [
        { id: "iconos", kicker: ["Arte", "Art"], title: ["Dibujos nuevos", "New drawings"],
          entries: [
            E(["Rojo o negro y las casillas de la rueda", "Red or black and the wheel slots"], "change", "0.2.10", [
            ["La ruleta de Rojo o negro lleva ahora la Tierra de Geolite en el centro. Cada casilla de la Ruleta de premios tiene su propio dibujo: monedas, lingotes, pergamino sellado, antifaz de ladrón, cronómetro agrietado y cartera vacía.", "The Red or black wheel now carries the Geolite Earth at its center. Every Prize wheel slot has its own picture: coins, gold bars, a sealed scroll, a bandit mask, a cracked stopwatch and an empty wallet."]]),
          ] },
      ],
    },
    {
      id: "0.2.9",
      name: ["Juegos de casino", "Casino games"],
      date: "2026-10-03",
      summary: ["El centro de la Barra sortea cada ronda entre tres juegos de casino, cada uno con su propia mesa: Rojo o negro, Moneda al aire y Ruleta de premios.",
        "The middle of the bar draws one of three casino games each round, each with its own table: Red or black, Coin flip and Prize wheel."],
      chapters: [
        { id: "casino", kicker: ["Campamento", "Camp"], title: ["Mesa de casino", "Casino table"],
          entries: [
            E(["Moneda al aire", "Coin flip"], "new", "0.2.9", [
            ["Elige cara o cruz y paga la ficha (2, 5 o 10: se cambia con un clic en el precio). Si aciertas cobras el doble; 1 de cada 64 veces la moneda cae de canto y paga ×6. Se tira en dos segundos, con la moneda de los logros girando.", "Pick heads or tails and pay the chip (2, 5 or 10: click the price to change it). Guess right and you get double; 1 time in 64 the coin lands on its edge and pays ×6. It takes two seconds, with the achievements coin spinning."]]),
            E(["Ruleta de premios", "Prize wheel"], "new", "0.2.9", [
            ["Una rueda circular de 12 casillas, todas con la misma probabilidad. Siete buenas (doblones, premio gordo, racha, Café o Seguro gratis, +1 provisión), una vacía y cuatro malas (un reto más sellado, Atraco y Reloj corto).", "A circular wheel with 12 equally likely slots. Seven good ones (doubloons, jackpot, streak, free espresso or insurance, +1 provision), one empty and four bad ones (one more sealed challenge, a heist and a short clock)."]]),
            E(["Cada juego, su mesa", "Each game, its own table"], "change", "0.2.9", [
            ["A la izquierda, un suministro (el Café doble ahora es color café); en el centro, el juego de casino con luces y su propia cenefa; a la derecha, la apuesta que toque.", "On the left, a supply (the Double espresso is now coffee-colored); in the middle, the casino game with lights and its own border; on the right, the bet of the moment."]]),
          ] },
      ],
    },
    {
      id: "0.2.8",
      name: ["La mesa de tres juegos", "The three-game table"],
      date: "2026-10-03",
      summary: ["La Barra del Campamento pone Rojo o negro siempre en el centro y sortea los dos juegos de los lados en cada ronda.",
        "The Camp bar always puts Red or black in the middle and draws the two side games each round."],
      chapters: [
        { id: "barra", kicker: ["Campamento", "Camp"], title: ["La Barra", "The bar"],
          entries: [
            E(["Rojo o negro, siempre en el centro", "Red or black, always in the middle"], "change", "0.2.8", [
            ["Tres casillas de juego por ronda: Rojo o negro fijo en el centro (también en los jefes) y dos a los lados, sorteadas entre Seguro, Café doble y la apuesta que toque (Oferta de la casa, Doble o nada, La apuesta final).", "Three game slots each round: Red or black fixed in the middle (boss rounds too) and two on the sides, drawn from Insurance, Double espresso and the bet of the moment (House offer, Double or nothing, The final bet)."]]),
          ] },
      ],
    },
    {
      id: "0.2.7",
      name: ["Cartas a la vista", "Cards in plain view"],
      date: "2026-10-03",
      summary: ["Las cartas que llevas se leen en grande: pasa el ratón por la mochila o por la barra de la ronda y se abre la carta entera, con el botón de vender dentro.",
        "The cards you carry can be read in full: hover your pack or the round bar and the whole card opens, with the sell button inside."],
      chapters: [
        { id: "cartas", kicker: ["Interfaz", "Interface"], title: ["La carta grande", "The big card"],
          entries: [
            E(["Tus reliquias, amuletos y herramientas, en grande", "Your relics, charms and tools, up close"], "new", "0.2.7", [
            ["Al pasar el ratón por una carta de la mochila (Campamento y cofre del jefe) o de la barra de reliquias durante la ronda, se abre encima su carta grande, como las de la tienda: rareza, dibujo y el texto entero. Un clic la deja fija; Esc la cierra.", "Hover a card in your pack (Camp and boss chest) or in the relic bar during a round and its big card opens above it, like the shop ones: rarity, art and the full text. Click to pin it; Esc closes it."],
            ["Vender va dentro de la carta, con la ficha de lo que te dan; también «Dejar esta» cuando cambias una carta de la mesa. Fuera el antiguo «clic para levantar y vender».", "Selling lives inside the card, with a chip showing what you get; so does \"Leave this one\" when you swap a table card. The old \"click to lift, then sell\" is gone."]]),
          ] },
      ],
    },
    {
      id: "0.2.6",
      name: ["El agua tiene frontera", "Water has borders"],
      date: "2026-10-03",
      summary: ["Los mares, los océanos y los lagos se aciertan como los países: haces clic dentro de su agua y es acierto pleno.",
        "Seas, oceans and lakes now work like countries: click inside their water and it counts as a perfect hit."],
      chapters: [
        { id: "agua", kicker: ["Preguntas", "Questions"], title: ["Mares, océanos y lagos", "Seas, oceans and lakes"],
          entries: [
            E(["Las masas de agua ocupan su territorio", "Bodies of water take up their territory"], "change", "0.2.6", [
            ["Antes eran un punto en mitad del agua y casi cualquier clic en el océano se castigaba. Ahora cada mar, océano, golfo, estrecho o lago tiene su frontera, invisible mientras respondes: haces clic dentro y es acierto pleno («¡Dentro!»); fuera, cuenta la distancia al borde.", "They used to be a single point in the middle of the water, so almost any click in the ocean was punished. Now every sea, ocean, gulf, strait or lake has its own border, invisible while you answer: click inside and it is a perfect hit (“Inside!”); outside, the distance to the edge counts."],
            ["Son 54 masas: los 5 océanos (con sus mares marginales), el Mediterráneo, el Negro, el Báltico, el Rojo, el Caribe, el golfo de México, los estrechos de Gibraltar, Malaca y Bering, la bahía de Hudson y 22 lagos, entre ellos el Victoria, el Superior, el Baikal y el Titicaca.", "There are 54 of them: the 5 oceans (with their marginal seas), the Mediterranean, the Black Sea, the Baltic, the Red Sea, the Caribbean, the Gulf of Mexico, the straits of Gibraltar, Malacca and Bering, Hudson Bay and 22 lakes, including Victoria, Superior, Baikal and Titicaca."],
            ["Al responder se dibuja su territorio en el mapa. El margen de fallo es el de un país (antes era más generoso), y las pistas que apuntan a una masa de agua puntúan igual.", "When you answer, its territory is drawn on the map. The margin for a miss is that of a country (it used to be more generous), and clues that point to a body of water score the same way."]]),
            E(["Dos lugares corregidos", "Two places fixed"], "fix", "0.2.6", [
            ["La Primera batalla del Marne estaba en la desembocadura del Marne, en París; ahora está hacia Meaux, donde se libró.", "The First Battle of the Marne sat at the mouth of the Marne, in Paris; it is now near Meaux, where it was fought."],
            ["La batalla de Talas ahora lleva Kirguistán · Kazajistán: su punto cae en Kirguistán y el texto decía solo Kazajistán.", "The Battle of Talas now reads Kyrgyzstan · Kazakhstan: its point lies in Kyrgyzstan and the text said only Kazakhstan."]]),
          ] },
      ],
    },
    {
      id: "0.2.5",
      name: ["Amuletos para siempre", "Charms for good"],
      date: "2026-10-03",
      summary: ["Los amuletos dejan de gastarse: actúan siempre que sale su familia de retos y ahora se ve cuándo te protegen.",
        "Charms no longer wear out: they work whenever their family of challenges shows up, and now you can see when they protect you."],
      chapters: [
        { id: "amuletos", kicker: ["Amuletos", "Charms"], title: ["Sin cargas", "No charges"],
          entries: [
            E(["Amuletos fijos", "Permanent charms"], "change", "0.2.5", [
            ["Fuera las cargas: un amuleto ya no se gasta ni se parte. Actúa mientras lo lleves, cada vez que sale un reto de su familia. Sigue ocupando un hueco de la mochila.", "No more charges: a charm no longer wears out or breaks. It works as long as you carry it, every time a challenge from its family shows up. It still takes a backpack slot."],
            ["Contra un reto a **nivel 3** solo lo suaviza: el reto se sigue notando a medias.", "Against a **level 3** challenge it only softens it: you still feel half of it."],
            ["Ya no salen recargas en el Campamento: si llevas un amuleto, su carta no vuelve a aparecer.", "No more refills at the Camp: if you carry a charm, its card won't show up again."]]),
            E(["Se nota cuando te protege", "You can tell when it protects you"], "new", "0.2.5", [
            ["Al empezar la ronda, el amuleto salta en la mochila y su **sello** cae con un golpe sobre la ficha del reto que frena. Se queda ahí toda la ronda.", "When the round starts, the charm jumps in the backpack and its **seal** slams onto the chip of the challenge it holds back. It stays there the whole round."],
            ["La primera vez que cada amuleto le estropea un truco, el crupier se queja nombrando los dos.", "The first time each charm spoils one of his tricks, the dealer complains, naming both."]],
            [I("amuleto-sello", ["El Foco sella el Apagón (nivel 3: a medias) y el crupier protesta.", "The Spotlight seals the Blackout (level 3: halfway) and the dealer protests."])]),
          ] },
      ],
    },
    {
      id: "0.2.4",
      name: ["Perder cuesta", "Losing costs"],
      date: "2026-10-03",
      summary: ["Fallar en Rojo o negro ya no sale gratis: pierdes la cuota y la ronda trae un reto más.",
        "Missing in Red or black is no longer free: you lose the fee and the round brings one more challenge."],
      chapters: [
        { id: "apuestas", kicker: ["Apuestas", "Bets"], title: ["Fallar tiene precio", "A miss has a price"],
          entries: [
            E(["Rojo o negro: fallar suma un reto", "Red or black: a miss adds a challenge"], "change", "0.2.4", [
            ["Si pierdes la ruleta (un color equivocado o un cero que no apostaste), pierdes la cuota y la ronda trae un reto más, sellado y a nivel 3. Si la ronda ya tiene 5 retos, no se añade ninguno. En la revancha va sin él.", "If you lose the roulette (a wrong color, or a zero you did not bet on), you lose the fee and the round brings one more challenge, sealed at level 3. If the round already has 5 challenges, none is added. On the rematch it comes without it."],
            ["La banda de la ruleta lo avisa («Fallas · +1 reto») y la carta de la Barra también.", "The roulette band says so (“You lose · +1 challenge”) and so does the card on the Bar."]]),
          ] },
      ],
    },
    {
      id: "0.2.3",
      name: ["Una versión, una nota", "One version, one note"],
      date: "2026-10-03",
      summary: ["Desde ahora la versión del juego y el parche llevan el mismo número, y cada entrega trae su propia nota.",
        "From now on the game version and the patch share the same number, and every delivery brings its own note."],
      chapters: [
        { id: "sistema", kicker: ["Sistema", "System"], title: ["Numeración nueva", "New numbering"],
          entries: [
            E(["La versión del juego sigue a las notas", "The game version follows the notes"], "change", "0.2.3", [
            ["La versión que ves en el juego pasa a ser 0.2.N, igual que los parches: cada entrega sube el último número y cierra la anterior.", "The version you see in the game is now 0.2.N, like the patches: each delivery bumps the last number and closes the previous one."],
            ["Las versiones antiguas (0.50.1 a 0.79.1) aparecen en las notas como compilaciones, para no confundirlas con los números de parche.", "The old versions (0.50.1 to 0.79.1) appear in the notes as builds, so they are not mixed up with patch numbers."]]),
          ] },
      ],
    },
    {
      id: "0.2.2",
      name: ["Ajuste de la curva", "Curve tuning"],
      date: "2026-10-03",
      games: ["0.77.1", "0.78.1"],
      summary: ["La curva de dificultad de las preguntas se endurece en A3 y A4, se mide cuántas expediciones hacen falta para ver todas las preguntas y Rojo o negro gana una ruleta de verdad.",
        "The question difficulty curve gets tougher on A3 and A4, we measure how many runs it takes to see every question, and Red or black gets a real roulette."],
      chapters: [
        { id: "ascensiones", kicker: ["Ascensiones", "Ascensions"], title: ["A3 y A4, más duras", "A3 and A4, tougher"],
          intro: ["Las preguntas suben con la Ascensión; ahora el experto encuentra más resistencia a mitad de camino.", "Questions climb with the Ascension; now the expert meets more resistance halfway up."],
          entries: [
            E(["A3 y A4, más duras", "A3 and A4, tougher"], "change", "0.77.1", [
            ["A3 y A4 reciben un empuje extra en la dificultad de las preguntas, porque el experto las ganaba casi siempre. La dificultad media de las cinco preguntas pasa a 17, 20, 26, 39, 49 y 53 de A0 a A5 (antes 17, 20, 25, 33, 43 y 53). A0, A1 y A5 no cambian.", "A3 and A4 get an extra push in question difficulty, because the expert won them almost every time. The average difficulty of the five questions goes to 17, 20, 26, 39, 49 and 53 from A0 to A5 (before: 17, 20, 25, 33, 43 and 53). A0, A1 and A5 do not change."],
            ["Ronda 1 en A3: La Habana, Damasco, Ciudad de Panamá, Freetown y Tiflis. Ronda 12 en A3: la batalla de Azincourt, el cráter del Ngorongoro, Armenia, el Museo de Arte Contemporáneo de Niterói y el monte Whitney.", "Round 1 on A3: Havana, Damascus, Panama City, Freetown and Tbilisi. Round 12 on A3: the Battle of Agincourt, the Ngorongoro Crater, Armenia, the Niterói Contemporary Art Museum and Mount Whitney."],
            ["¿Cuántas expediciones hacen falta para ver todas las preguntas? La Aventura tiene 1.909 y una expedición completa enseña 60. Repartidas en las seis Ascensiones, con unas 20 expediciones en cada una se ve el 97 %. Jugando una sola Ascensión hacen falta entre 100 y 300. Lo más difícil solo sale pronto si llegas a A4 o A5.", "How many runs does it take to see every question? The Adventure has 1,909 and a full run shows 60. Spread over the six Ascensions, about 20 runs in each shows 97%. On a single Ascension it takes between 100 and 300. The hardest ones only come up early if you reach A4 or A5."],
            ["Pendiente: comprobar con una persona si el experto deja de ganar A3 casi siempre y si quien solo sabe continentes puede ganar A0. Los objetivos de A0 no se han tocado.", "Pending: check with a real player whether the expert stops winning A3 almost every time and whether someone who only knows continents can win A0. A0 targets have not been touched."]])] },
        { id: "apuestas", kicker: ["Apuestas", "Bets"], title: ["La ruleta de verdad", "The real roulette"],
          intro: ["Antes giraba un icono dentro de la carta y no se veía nada; ahora es un momento de casino.", "It used to spin an icon inside the card and you could not see anything; now it is a casino moment."],
          entries: [
            E(["Rojo o negro, con ruleta de verdad", "Red or black, with a real roulette"], "change", "0.78.1", [
            ["Al apostar se abre una ruleta lineal a pantalla completa con la rueda europea: 37 casillas en su orden real (18 rojas, 18 negras y el 0 verde, 1 de cada 37), puntero dorado y bombillas de marquesina. Dura unos 3 segundos: «No va más», arranque con aceleración, tic de matraca que se frena, latido en el casi-fallo y golpe seco al parar con un sello grande.", "When you bet, a full-screen linear roulette opens with the European wheel: 37 pockets in their real order (18 red, 18 black and the green 0, 1 in 37), a golden pointer and marquee bulbs. It lasts about 3 seconds: «No more bets», an accelerating start, a ratchet tick that slows down, a heartbeat on a near miss and a dry thud at the stop with a big stamp."],
            ["Nuevo botón Verde: si lo apuestas y sale, te saltas el acto entero (en el acto III vas directo al jefe final) y el crupier lo lleva fatal. Si sale verde y no lo apostaste, gana la casa y se ríe. Rojo y negro pagan igual que antes.", "New Green button: if you bet it and it lands, you skip the whole act (in act III you go straight to the final boss) and the dealer takes it very badly. If green lands and you did not bet it, the house wins and laughs. Red and black pay the same as before."]])] },
      ],
      timeline: [["0.77.1", ["La curva de A3 y A4", "The A3 and A4 curve"]], ["0.78.1", ["Ruleta de verdad", "A real roulette"]]],
    },
    {
      id: "0.2.1",
      name: ["La mesa nueva", "The new table"],
      date: "2026-10-03",
      games: ["0.50.1", "0.75.1"],                       // de la primera a la ultima version del juego que lo forman
      summary: [
        "Una revisión de arriba abajo de lo que compras, lo que sufres y contra quién juegas. Los objetos son útiles y se lucen, los retos se notan desde el nivel 1, los jefes examinan una familia entera y el dinero se juega de verdad. Es el parche más medido hasta hoy: cada cifra de estas notas sale de las entradas de cada versión.",
        "A top-to-bottom review of what you buy, what you suffer and who you play against. Items are useful and show off, challenges are felt from level 1, bosses test a whole family and money is really on the line. It is our most measured patch yet: every number in these notes comes from the entry of each game version."],
      chapters: [
        /* ------------------------------------------------------------------ lo mas destacado */
        { id: "destacados", kicker: ["Lo más destacado", "Highlights"], title: ["Una mesa nueva de arriba abajo", "A new table from top to bottom"],
          intro: ["Esta revisión toca casi todo lo que compras, lo que sufres y contra quién juegas. Seis ideas la resumen.", "This review touches almost everything you buy, suffer and play against. Six ideas sum it up."],
          cards: [
            { name: ["Amuletos con cargas", "Charms with charges"], text: ["Seis amuletos de 2 cargas sustituyen a las 12 contras sueltas. Cada uno protege de una familia de retos y se parte al gastar la última carga.", "Six 2-charge charms replace the 12 loose counters. Each one guards against a family of challenges and breaks when its last charge is spent."] },
            { name: ["Retos fundidos y premium", "Merged, premium challenges"], text: ["Los retos gemelos se funden en uno con tres niveles. El humo se barre con el ratón, la lluvia se limpia agitando, la batería se apaga como un móvil.", "Twin challenges merge into one with three levels. Smoke is swept away with the mouse, rain is wiped off by shaking, the battery dies like a phone."] },
            { name: ["23 jefes que suben de tono", "23 bosses that escalate"], text: ["Cada jefe es el examen de una familia: empieza suave y aprieta pregunta a pregunta. Llega La siesta del crupier.", "Each boss is a test of one family: it starts gentle and tightens question by question. The dealer's nap arrives."] },
            { name: ["Apuestas y legendarias", "Bets and legendaries"], text: ["Doble o nada, La apuesta final, Rojo o negro, el Pacto, la Oferta de la casa y una vitrina con la legendaria del acto.", "Double or nothing, The final bet, Red or black, the Pact, the House offer and a showcase with the act's legendary."] },
            { name: ["Todo con el arte de los logros", "All with the achievement art"], text: ["Reliquias, herramientas, suministros, apuestas y 12 iconos de reto nuevos, con el proceso de las fichas de logro: rejilla de 48 px y limpieza a mano.", "Relics, tools, supplies, bets and 12 new challenge icons, all made the way achievement tokens are: a 48 px grid and hand clean-up."] },
            { name: ["Ascensiones con identidad", "Ascensions with identity"], text: ["Cada Ascensión tiene nombre y una regla que se entiende de un vistazo, y cada una suma lo de las anteriores: de «La casa cobra» a «Equipaje de mano».", "Every Ascension has a name and a rule you grasp at a glance, and each adds everything before it: from «The house takes its cut» to «Carry-on»."] },
          ],
          entries: [E(["Las reliquias, rehechas", "Relics, redrawn"], "buff", "0.64.1", [
            ["Las 25 reliquias, junto a las fichas de logro de referencia (fila de arriba).", "The 25 relics, next to the reference achievement tokens (top row)."]],
            [I("galeria-reliquias", ["Las reliquias rehechas, junto a las fichas de logro de referencia.", "The redrawn relics, next to the reference achievement tokens."], "tall")])] },

        /* ------------------------------------------------------------------ reliquias */
        { id: "reliquias", kicker: ["Reliquias", "Relics"], title: ["Amuletos, Ventajas y reliquias nuevas", "Charms, Perks and new relics"],
          intro: ["Las reliquias dejan de decir «el reto X baja un N %». Ahora cambian reglas, se ven actuar y se explican en una línea.", "Relics no longer say «challenge X drops N %». Now they change rules, you see them act, and each fits in one line."],
          entries: [
            E(["Amuletos (6)", "Charms (6)"], "new", "0.54.1", [
              ["Salen 12 contras: Visera, Espejo del ilusionista, Lupa, Sello de la casa, Ancla de mesa, Tapones VIP, Amortiguador, Paraguas, Guante blanco, Monóculo, Batería externa y Administrador de tareas.", "12 counters leave: Visor, Illusionist's mirror, Magnifier, House seal, Table anchor, VIP earplugs, Shock absorber, Umbrella, White glove, Monocle, Power bank and Task manager."],
              ["Entran 6 amuletos, uno por familia de retos: **Mano firme** (el puntero), **Chuleta** (las letras del nombre), **Foco** (la oscuridad), **Gafas de sol** (lo que tapa el mapa), **Ancla** (el mapa que se mueve) y **Protector** (lo que el crupier le hace a tu pantalla).", "6 charms come in, one per challenge family: **Steady hand** (the pointer), **Cheat sheet** (the letters of the name), **Spotlight** (darkness), **Sunglasses** (what covers the map), **Anchor** (the moving map) and **Screen guard** (what the dealer does to your screen)."],
              ["Traen 2 cargas. Gastan una al empezar una ronda en la que su familia sale a nivel 2 o más (a nivel 1, gratis); la revancha no vuelve a cobrar. Se ve un «-1» en la barra.", "They carry 2 charges. One is spent at the start of a round where their family appears at level 2 or higher (free at level 1); the retry does not charge again. A «-1» shows in the bar."],
              ["Se parten al superar la ronda en la que gastan la última carga y dejan libre el hueco. Si ya lo llevas, su carta es una recarga (+2 cargas, sin hueco).", "They break when you clear the round where they spend their last charge, freeing the slot. If you already carry one, its card is a recharge (+2 charges, no slot)."],
              ["Lo que miente o calla (Fronteras falsas, Chinchetas, Adivinanza, Babel…), la tormenta (Rayos, Luces parpadeantes) y las reglas de la casa ya no tienen contra: se sufren, se sobornan, se barajan o se apagan con el Interruptor.", "What lies or stays silent (False borders, Decoy pins, Riddle, Babel…), the storm (Lightning, Flickering lights) and the house rules no longer have a counter: you suffer them, bribe them, reshuffle them or switch them off."],
              ["Partidas guardadas: cada contra retirada se convierte en el amuleto de su familia o se reembolsa.", "Saved runs: every removed counter becomes its family's charm or is refunded."]],
              [I("mochila-amuletos", ["Los amuletos en la mochila, con sus cargas.", "Charms in the backpack, with their charges."])]),
            E(["Ventajas (4)", "Perks (4)"], "new", "0.55.1 · 0.56.1", [
              ["Reliquias que cambian la regla de la ronda sin sumar puntos. Solo cabe una en la mochila: si compras otra, su carta dice «cambiar por esta» y la vieja se vende. Llevan un sello dorado, y mientras no lleves ninguna, la tienda las saca el doble.", "Relics that change the round's rules without adding points. Only one fits in the backpack: if you buy another, its card says «swap for this» and the old one is sold. They carry a gold seal, and while you carry none the shop offers them twice as often."],
              ["**Guardarrachas:** los 2 primeros fallos de cada ronda (también quedarte sin tiempo) no cortan tu racha. La respuesta salvada puntúa x1.", "**Streak guard:** the first 2 misses of each round (running out of time too) do not break your streak. The saved answer scores x1."],
              ["**Mesa de mínimos:** el objetivo baja un 7 % (sale tachado el de siempre), pero el margen paga la mitad de doblones.", "**Low-stakes table:** the target drops 7% (the usual one is struck through), but the margin pays half the doubloons."],
              ["**Segunda bola:** dos veces por ronda, si tu clic no hace racha no cuenta: el reloj se para 0,4 s y repites el tiro. Deja una marca fría «¡Otra!» que dice dónde no está, nunca dónde está.", "**Second ball:** twice per round, if your click does not build a streak it does not count: the clock stops 0.4 s and you retake the shot. It leaves a cold «Again!» mark that says where it is not, never where it is."],
              ["**As en la manga:** cada ronda trae un 6.º lugar de la franja difícil del tema. Puntúa x1, no alarga ni corta la racha y solo suma lo que mejore tu peor respuesta: la ronda vale tus 5 mejores («6 lugares · 5 mejores»).", "**Ace up the sleeve:** every round brings a 6th place from the topic's hard band. It scores x1, neither extends nor breaks the streak and only adds what improves your worst answer: the round is worth your best 5 («6 places · best 5»)."]],
              [I("tienda-ventajas", ["Cuatro Ventajas y un amuleto en la tienda.", "Four Perks and a charm in the shop."]), I("segunda-bola", ["Segunda bola: la marca fría «¡Otra!» dice dónde no está.", "Second ball: the cold «Again!» mark says where it is not."])]),
            E(["Comodín", "Wildcard"], "change", "0.55.1", [
              ["Antes quitaba el reto más flojo y no se notaba. Ahora quita el reto MÁS fuerte de cada ronda (por nivel; si empatan, mapa, pantalla, puntero, reglas y placa) y sale como «Anulado» en el panel de la próxima ronda.", "It used to remove the weakest challenge and you never noticed. Now it removes the STRONGEST challenge of every round (by level; on a tie: map, screen, pointer, rules and plate) and shows as «Voided» in the next-round panel."]]),
            E(["Racha, dinero y supervivencia", "Streak, money and survival"], "new", "0.61.1", [
              ["**Sangre fría** (nueva): con racha de 2 o más se apagan los retos de tu puntero y de tu pantalla. Suena el hielo, el retículo lleva un halo de escarcha y sus fichas salen heladas en la barra; si la racha se corta, vuelven.", "**Cool head** (new): with a streak of 2 or more, your pointer and screen challenges switch off. Ice rings out, the reticle gets a frost halo and its chips turn icy in the bar; if the streak breaks, they return."],
              ["**Ficha de propina:** ahora paga +1 doblón por cada respuesta en racha.", "**Tip chip:** now pays +1 doubloon for every answer in a streak."],
              ["**Hucha** (junta Cajero y Banquero): cada ronda superada mete 3 doblones dentro; se ve la cifra en el icono y al venderla se rompe y te los llevas.", "**Piggy bank** (merges Cashier and Banker): every round cleared drops 3 doubloons inside; the number shows on the icon and selling it breaks it and you keep them."],
              ["**Ojo en el cielo** (junta el Vale de la casa): ves los retos de 2 rondas más y Barajas gratis una vez por visita, salvo en jefes.", "**Eye in the sky** (merges the House voucher): you see the challenges of 2 more rounds and Reshuffle for free once per visit, except at bosses."],
              ["**Catalejo** (junta Sonar trucado y Ruleta de 16 rumbos): +1 carga en tus herramientas y el Sonar y la Brújula, más precisos. El Navegante empieza con él.", "**Spyglass** (merges Rigged sonar and 16-point roulette): +1 charge on your tools and a sharper Sonar and Compass. The Navigator starts with it."],
              ["**Corazón** (junta Por cuenta de la casa): +1 provisión máxima y vencer al jefe del acto II te devuelve una.", "**Heart** (merges On the house): +1 maximum provision and beating the act II boss gives one back."],
              ["**Red de seguridad** (antes Seguro): una vez por acto, fallar una ronda no te cuesta provisión. Tiene su propio aviso.", "**Safety net** (was Insurance): once per act, failing a round does not cost you a provision. It has its own notice."],
              ["Las partidas guardadas cambian las reliquias que se van por la que las absorbe (Por cuenta de la casa se reembolsa).", "Saved runs swap the relics that leave for the one that absorbs them (On the house is refunded)."]],
              [I("sangre-fria", ["Sangre fría en la tienda y, abajo, la barra con Pulso y Cristal roto apagados.", "Cool head in the shop and, below, the bar with Shaky hand and Cracked screen switched off."])]),
            E(["Saber", "Knowledge"], "change", "0.63.1", [
              ["**Soplo del crupier:** te sopla en qué mitad del país está el lugar (según la forma del país; con Sin país, sin nombrarlo) y, en las pistas, la región. En banderas y países calla, y la tienda ya no lo ofrece si solo quedan esas rondas.", "**Dealer's tip-off:** whispers which half of the country the place is in (by the country's shape; with No country, without naming it) and, in clues, the region. In flags and countries it stays silent, and the shop no longer offers it if only those rounds remain."],
              ["**Libro de la casa:** en banderas y pistas la región, en lo demás una nota de campo. Ya no frena la Adivinanza: es un reto de saber, sin contra.", "**House ledger:** the region in flags and clues, a field note elsewhere. It no longer counters the Riddle: that is a knowledge challenge, with no counter."],
              ["**Pase VIP:** caen TRES fichas doradas en el mapa (botan y tintinean) y solo una marca el lugar; las otras dos, del mismo país o del mismo continente, quedan siempre fuera del umbral de racha.", "**VIP pass:** THREE gold chips drop on the map (they bounce and chime) and only one marks the place; the other two, from the same country or continent, always land outside the streak threshold."],
              ["Sale la Chuleta de bolsillo (votada). El **Historiador** empieza con el Libro de la casa y el Soplo del crupier.", "The Pocket cheat sheet leaves (by vote). The **Historian** starts with the House ledger and the Dealer's tip-off."]],
              [I("pase-vip", ["El Pase VIP: tres fichas, una marca el lugar, en capitales y en banderas.", "The VIP pass: three chips, one marks the place, in capitals and in flags."])]),
            E(["Pacto con la casa", "Pact with the house"], "new", "0.67.1", [
              ["Un hueco más en la mochila (6, el sexto con lacre) a cambio de un reto sellado más en cada ronda que no es de jefe (de los que ya has visto, de una familia que no está).", "One more backpack slot (6, the sixth sealed) in exchange for one more sealed challenge in every non-boss round (one you have already seen, from a family that is not there)."],
              ["Con la mochila de 6 llena no se puede vender.", "You cannot sell it while the backpack of 6 is full."]]),
            E(["Dividir (antes Oráculo)", "Split (was Oracle)"], "change", "0.66.1", [
              ["El «split» del blackjack: en la pregunta difícil de cada ronda sale además otro lugar de la misma franja (con su propia sub-semilla: las 5 de siempre no cambian). Bajo la placa aparece «o bien: …» y con un clic o la tecla Tab lo cambias, una sola vez y antes de responder.", "Blackjack's «split»: in each round's hard question, another place from the same band shows up (with its own sub-seed: the usual 5 do not change). Under the plate it reads «or: …» and a click or the Tab key swaps it, once and before answering."],
              ["Lleva los mismos retos de texto (en banderas, su bandera pequeña) y también funciona con Continentes barajados. La primera vez de la expedición, con jackpot.", "It carries the same text challenges (in flags, its small flag) and also works with Shuffled continents. The first time in a run, with a jackpot."]],
              [I("dividir", ["Dividir en capitales, en lugares famosos (con letras temblorosas) y en banderas.", "Split in capitals, in famous places (with shaky letters) and in flags."])]),
          ] },

        /* ------------------------------------------------------------------ tienda y economia */
        { id: "tienda", kicker: ["Tienda y economía", "Shop and economy"], title: ["Una tienda que se lee", "A shop you can read"],
          intro: ["Más decisiones y menos adivinar: cada precio sube con la franja, cada compra se ve actuar y el dinero guardado vale algo.", "More decisions, less guessing: every price rises with the band, every purchase is seen in action and saved money is worth something."],
          entries: [
            E(["Tienda", "Shop"], "change", "0.54.1 · 0.62.1 · 0.64.1", [
              ["**Cambiar por…:** con la mochila llena, la carta lo dice. La eliges, escoges en la mochila qué reliquia dejas (brillan con su sello) y se vende y se compra en un solo gesto.", "**Swap for…:** with a full backpack, the card says so. You pick it, choose which relic to drop (they glow with their seal) and the sale and purchase happen in one move."],
              ["**Venta justa:** vender devuelve la mitad de lo que pagaste (y todo si vendes en la misma visita). Antes era la mitad del precio base.", "**Fair selling:** selling returns half of what you paid (and all of it if you sell on the same visit). It used to be half the base price."],
              ["Barajar y Cambiar cartas suben con la franja de precios; Barajar cuesta el doble en el jefe.", "Reshuffle and Swap cards rise with the price band; Reshuffle costs double at the boss."],
              ["Las herramientas salen por franja de rareza (55 / 35 / 10): Brújula, Nota y Reloj; Sonar, Pase VIP y Descarte; Interruptor. La Carta de cambio pasa a llamarse **Descarte** (9 doblones) y el Pase VIP cuesta 7.", "Tools come by rarity band (55 / 35 / 10): Compass, Note and Hourglass; Sonar, VIP pass and Discard; Master switch. The Swap card is renamed **Discard** (9 doubloons) and the VIP pass costs 7."],
              ["El Refuerzo sale de la Barra para dejar sitio a la apuesta.", "The Boost leaves the Bar to make room for the bet."]],
              [I("cambiar-por", ["Mochila llena: la carta elegida brilla y las reliquias esperan a que elijas cuál dejas.", "Full backpack: the chosen card glows and the relics wait for you to pick which one goes."])]),
            E(["Lucirse", "Showing off"], "new", "0.53.1", [
              ["Cuando una reliquia tuya actúa, su icono salta en la barra de la Aventura con su ficha y su etiqueta («+3 s», «+1»…), sin temblar mientras respondes.", "When one of your relics acts, its icon pops up in the Adventure bar with its chip and label («+3 s», «+1»…), without shaking while you answer."],
              ["En el veredicto, las líneas que pone una reliquia (Cajero, Banquero, Toque de Midas) llevan su icono en oro, y el Seguro que te salva sale con su icono, dos fichas y un temblor flojo.", "In the verdict, the lines a relic adds (Cashier, Banker, Midas touch) carry their icon in gold, and the Insurance that saves you shows with its icon, two chips and a light shake."],
              ["El crupier nombra cada reliquia la primera vez que actúa en la expedición (cuatro frases nuevas en 12 idiomas).", "The dealer names each relic the first time it acts in a run (four new lines in 12 languages)."],
              ["Antes de comprar no cambia nada: ni cartas, ni panel de próxima ronda, ni fichas de reto. El jugador sigue leyendo y atando cabos.", "Before buying nothing changes: no cards, no next-round panel, no challenge chips. Players keep reading and connecting the dots."]]),
            E(["Objetivo y margen", "Target and margin"], "change", "0.55.1 · 0.65.1", [
              ["El objetivo de cada ronda se congela al empezarla; el margen y el consuelo se miden contra el objetivo sin rebajas.", "Each round's target is frozen when it starts; margin and consolation are measured against the target without discounts."],
              ["Las rebajas del objetivo (Mesa de mínimos y Toque de Midas) no pasan juntas del −15 %.", "Target discounts (Low-stakes table and Midas touch) never go beyond −15% together."]]),
            E(["Reto diario", "Daily challenge"], "change", "0.54.1", [
              ["El regalo sale de una lista fija y las semillas llevan la versión del catálogo: añadir o quitar reliquias ya no cambia los regalos de los demás días.", "The gift comes from a fixed list and the seeds carry the catalogue version: adding or removing relics no longer changes the gifts of other days."]]),
            E(["Modo infinito honesto", "Honest endless mode"], "change", "0.62.1", [
              ["El Guardarrachas ya no actúa allí, igual que las demás Ventajas y los amuletos. El crupier lo dice una vez al entrar: aquí no valen trucos de tiempo ni de racha.", "The Streak guard no longer acts there, like the other Perks and the charms. The dealer says so once on entry: no time or streak tricks here."]]),
          ] },

        /* ------------------------------------------------------------------ apuestas y legendarias */
        { id: "apuestas", kicker: ["Apuestas y legendarias", "Bets and legendaries"], title: ["Jugarse el dinero de verdad", "Putting real money on the line"],
          intro: ["La Barra del Campamento trae una apuesta por visita. Aparecen tras vencer a tu primer jefe y, en el Reto diario, son iguales para todos.", "The Camp's Bar brings one bet per visit. They appear after you beat your first boss and, in the Daily challenge, are the same for everyone."],
          entries: [
            E(["Doble o nada", "Double or nothing"], "new", "0.64.1", [
              ["Antes de R4 y R8: te juegas TODOS tus doblones y el jefe trae un reto sellado más.", "Before R4 and R8: you stake ALL your doubloons and the boss brings one more sealed challenge."],
              ["Vencerlo a la primera los dobla (+40 como mucho). Si no, los pierdes.", "Beat it on the first try and they double (+40 at most). If not, you lose them."]]),
            E(["La apuesta final", "The final bet"], "new", "0.64.1", [
              ["Antes de R12: el jefe trae 2 retos sellados. Vencerlo a la primera da +2 provisiones para el modo infinito. Perder no cuesta nada.", "Before R12: the boss brings 2 sealed challenges. Beating it on the first try gives +2 provisions for endless mode. Losing costs nothing."]]),
            E(["Rojo o negro", "Red or black"], "new", "0.64.1", [
              ["En las demás visitas: cuesta 2. La ruleta gira con su tic-tic y, si aciertas, la ronda paga un 50 % más y empiezas en racha.", "On the other visits: it costs 2. The roulette spins with its tick-tick and, if you win, the round pays 50% more and you start with a streak."]],
              [I("rojo-negro", ["Rojo o negro, antes y después de acertar.", "Red or black, before and after winning."])]),
            E(["Oferta de la casa", "House offer"], "new", "0.67.1", [
              ["Una vez en el acto II y otra en el III, en un Campamento sorteado que no sea de jefe: el crupier te paga por aceptar 1, 2 o 3 retos más a nivel 3 en la próxima ronda (el 60 % de su soborno base cada uno).", "Once in act II and once in act III, in a random non-boss Camp: the dealer pays you to accept 1, 2 or 3 more level-3 challenges next round (60% of their base bribe each)."],
              ["Cobras al momento y entran sellados con «Vendido». En la misma visita puedes echarte atrás devolviéndolo.", "You are paid at once and they come in sealed as «Sold». On the same visit you can back out by paying it back."]],
              [I("apuestas-barra", ["Doble o nada apostado, su reto sellado con lacre y Rojo o negro.", "Double or nothing wagered, its wax-sealed challenge and Red or black."], "half"), I("pacto-oferta", ["El Pacto con la casa (mochila de 6 y reto sellado «Pacto») y la Oferta de la casa en la Barra.", "The Pact with the house (backpack of 6 and a «Pact» sealed challenge) and the House offer at the Bar."], "half")]),
            E(["Los retos de las apuestas", "Bet challenges"], "change", "0.64.1 · 0.68.1", [
              ["Los retos de una apuesta van SELLADOS con su lacre (ni soborno ni Comodín): son de los que ya has visto y de una familia que no está.", "A bet's challenges come SEALED with their wax (no bribe, no Wildcard): they are ones you have already seen, from a family that is not there."],
              ["La apuesta final ya no saca retos que no hacen nada en esa ronda.", "The final bet no longer draws challenges that do nothing in that round."]]),
            E(["Vitrina y legendarias", "Showcase and legendaries"], "change", "0.51.1 · 0.65.1", [
              ["**Vitrina:** desde R5, una cuarta carta dorada con la legendaria del acto (23 doblones en el acto II, 27 en el III), con su secuencia de Pan de oro al comprarla. No cambia con Cambiar cartas.", "**Showcase:** from R5, a fourth gold card with the act's legendary (23 doubloons in act II, 27 in act III), with its Gold leaf sequence when bought. It does not change with Swap cards."],
              ["Como mucho UNA legendaria por acto, venga del cofre o de la vitrina. El cofre del jefe ya no trae comunes.", "At most ONE legendary per act, whether from the chest or the showcase. The boss chest no longer brings commons."],
              ["**Toque de Midas:** deja de duplicar doblones. Cada 10 doblones guardados (la Hucha cuenta) bajan el objetivo un 2 %, hasta un 10 %; si te salva la ronda, el veredicto lo dice con jackpot.", "**Midas touch:** it no longer doubles doubloons. Every 10 doubloons you keep (the Piggy bank counts) lowers the target 2%, up to 10%; if it saves your round, the verdict says so with a jackpot."],
              ["Las legendarias llevan el marco «Pan de oro» y su momento de jackpot al elegirlas: la sala se oscurece en ámbar, la carta sube al centro, el marco se enciende en tres golpes y el crupier suelta una de sus tres frases nuevas.", "Legendaries wear the «Gold leaf» frame and get their jackpot moment when picked: the room dims to amber, the card rises to the centre, the frame lights up in three hits and the dealer drops one of his three new lines."]],
              [I("vitrina", ["La vitrina del acto II: el Comodín a 23 doblones.", "The act II showcase: the Wildcard at 23 doubloons."])]),
          ] },

        /* ------------------------------------------------------------------ retos */
        { id: "retos", kicker: ["Retos", "Challenges"], title: ["Menos retos iguales, más retos que se notan", "Fewer samey challenges, more you can feel"],
          intro: ["Se fusionan los gemelos, el sorteo reparte por familias, y los retos se rehacen para que se noten desde el nivel 1 y el 3 sea una locura.", "Twins are merged, the draw spreads across families, and challenges are rebuilt so you feel them from level 1 and level 3 is madness."],
          entries: [
            E(["Retos fundidos con tres niveles", "Merged challenges with three levels"], "merge", "0.57.1", [
              ["**Big bang** (junta Pangea y Continentes barajados): nivel 1 los continentes se separan, nivel 2 Pangea, nivel 3 barajados.", "**Big bang** (merges Pangea and Shuffled continents): level 1 the continents drift apart, level 2 Pangea, level 3 shuffled."],
              ["**Letras temblorosas** (bailan / tiemblan / las dos cosas), **Tinta borrada** (1/3 de las letras / sin vocales / sin vocales ni consonantes; en chino, japonés y coreano, la mitad y dos tercios), **Letras revueltas** (2 parejas / el interior / todo salvo la 1.ª letra) y **Nombre girado** (espejo / boca abajo / cada palabra a su manera).", "**Shaky letters** (dance / tremble / both), **Faded ink** (1/3 of the letters / no vowels / no vowels or consonants; in Chinese, Japanese and Korean, half and two thirds), **Scrambled letters** (2 pairs / the inside / all but the 1st letter) and **Flipped name** (mirror / upside down / each word its own way)."],
              ["**Mapa mudo** (sin fronteras / sin colores de país / en negativo), **Bandera desteñida** (casi gris / gris / negativo en gris), **Miopía**, **Mundo del revés** (el Sur arriba / espejo / las dos cosas), **Terremoto**, **Pulso**, **Cursor fantasma** y **Cristal roto**, cada uno con tres niveles distintos de verdad.", "**Blank map** (no borders / no country colours / negative), **Faded flag** (almost grey / grey / grey negative), **Nearsighted**, **Upside-down world** (South up / mirror / both), **Earthquake**, **Shaky hand**, **Ghost cursor** and **Cracked screen**, each with three truly different levels."],
              ["Salen del sorteo Baile de letras, Sin vocales, Letras cambiadas, Boca abajo, Negativo, Espejo del mapa, Punto ciego, Deriva, Mareo, Cursor parpadeante, Cursor borroso, Pantalla sucia, Colores invertidos, Pangea, Continentes barajados y la Marquesina. Los jefes que los traían llevan su forma (Un solo continente es Big bang en Pangea).", "Out of the draw go Dancing letters, No vowels, Swapped letters, Upside down, Negative, Mirror map, Blind spot, Drift, Dizziness, Blinking cursor, Blurry cursor, Dirty screen, Inverted colours, Pangea, Shuffled continents and the Ticker sign. Bosses that used them carry their form (One continent is Big bang on Pangea)."],
              ["Niveles con números: Rayos cada 4 / 2,5 / 1,5 s; Luces parpadeantes cada 4-6 / 2,5-4 / 1,5-3 s; Controles invertidos (izquierda-derecha / arriba-abajo / los dos); Memoria de pez 3 / 2 / 1,4 s; Cursor con retraso hasta 320 ms; Humo 20-42 %.", "Levels in numbers: Lightning every 4 / 2.5 / 1.5 s; Flickering lights every 4-6 / 2.5-4 / 1.5-3 s; Reversed controls (left-right / up-down / both); Goldfish memory 3 / 2 / 1.4 s; Laggy cursor up to 320 ms; Smoke 20-42%."],
              ["La Tormenta pasa a llamarse **Contrarreloj** (75 / 65 / 55 % del tiempo). El crupier presenta cada forma con su frase.", "The Storm is renamed **Against the clock** (75 / 65 / 55% of the time). The dealer introduces each form with a line."]],
              [I("bigbang-1", ["Big bang nivel 1: los continentes se separan.", "Big bang level 1: the continents drift apart."], "third"), I("bigbang-2", ["Nivel 2: Pangea.", "Level 2: Pangea."], "third"), I("bigbang-3", ["Nivel 3: barajados.", "Level 3: shuffled."], "third"),
               I("nombre-girado", ["Nombre girado con Mapa mudo en negativo.", "Flipped name with a negative Blank map."], "third"), I("miopia", ["Miopía con el punto negro a tope, sobre Mundo del revés.", "Nearsighted at full blur, over Upside-down world."], "third"), I("bandera-destenida", ["Bandera desteñida: el color se va hasta quedar en negativo gris.", "Faded flag: the colour fades until it ends as a grey negative."], "third")]),
            E(["Sorteo por familias y curva de aprendizaje", "Draw by family and learning curve"], "change", "0.58.1", [
              ["Cada hueco sortea primero la familia (letras, saber, luz, tormenta, vista, sitio, puntero, pantalla, mentiras o reglas; más peso a la que menos ha salido) y luego el reto. Nunca dos de la misma familia en una ronda.", "Each slot first draws the family (letters, knowledge, light, storm, sight, place, pointer, screen, lies or rules; more weight to the one that has shown least) and then the challenge. Never two of the same family in one round."],
              ["Las veces se cuentan en el plan base de la expedición: barajar una ronda no cambia las siguientes, ni la tienda ni el Reto diario.", "Counts come from the run's base plan: reshuffling a round changes neither the next ones, nor the shop, nor the Daily challenge."],
              ["La Aventura sin Ascensión pasa a 27 retos: R1, R2 y R3 con un reto suave a nivel 1 (R3, de bandera; R1 sin reto en tu primera expedición), R4 jefe con 2, R5 y R6 con 2, R7 con 3, R8 jefe con 3 y R9 a R12 con 3.", "The Adventure with no Ascension rises to 27 challenges: R1, R2 and R3 with one soft level-1 challenge (R3, a flag one; R1 with none on your first run), R4 boss with 2, R5 and R6 with 2, R7 with 3, R8 boss with 3 and R9 to R12 with 3."],
              ["Un reto que nunca has visto sale a nivel 1 con la etiqueta **NUEVO** y el crupier lo estrena (no en el Reto diario ni desde la Ascensión 3).", "A challenge you have never seen comes at level 1 with the **NEW** label and the dealer premieres it (not in the Daily challenge nor from Ascension 3)."]],
              [I("etiqueta-nuevo", ["La etiqueta NUEVO en el anuncio de la ronda.", "The NEW label in the round announcement."])]),
            E(["Premium I: humo, lluvia, cristal, batería, luces, rayos y chinchetas", "Premium I: smoke, rain, glass, battery, lights, lightning and pins"], "change", "0.59.1", [
              ["**Humo de sala:** más humo, y se barre con el ratón (el gesto lo aparta y lo empuja). Se vuelve a cerrar en unos 2,5 s, con un soplo flojito.", "**Smoky room:** more smoke, and you sweep it with the mouse (the gesture pushes it aside). It closes again in about 2.5 s, with a faint puff."],
              ["**Lluvia:** empaña el mapa poco a poco y se limpia AGITANDO el ratón, con una escobilla que cruza la pantalla. Las gotas se van y vuelven con la humedad.", "**Rain:** fogs the map little by little and is wiped off by SHAKING the mouse, with a wiper crossing the screen. Drops leave and come back with the humidity."],
              ["**Cristal roto:** golpe desde el nivel 1 (1 / 2 / 3 golpes con huellas) y cada golpe deja una zona emborronada grande: hay que mover o acercar el mapa para ver debajo.", "**Cracked screen:** a hit from level 1 (1 / 2 / 3 hits with fingerprints) and every hit leaves a large blurred area: move or zoom the map to see beneath."],
              ["**Batería baja:** como un móvil de verdad. Empieza con un 14-26 %, se descarga a saltos (zumbido y parpadeo), avisa al 20, 10 y 5 % (modo ahorro en amarillo) y, desde el nivel 2, se apaga un momento al 2 % con la pila vacía.", "**Low battery:** like a real phone. It starts at 14-26%, drains in jumps (buzz and flicker), warns at 20, 10 and 5% (power-saving mode in yellow) and, from level 2, shuts off for a moment at 2% with an empty cell."],
              ["**Luces parpadeantes:** pícaras. Además de su ritmo, se van cuando te pillan apuntando, y cada corte es distinto (normal, tartamudo, amago o largo) con chispas de la lámpara.", "**Flickering lights:** cheeky. Besides their rhythm, they go out when they catch you aiming, and every cut is different (normal, stuttering, feint or long) with sparks from the lamp."],
              ["**Rayos:** caen cerca de donde miras y dejan una sombra (la imagen quemada en la retina) de 0,8 / 1,1 / 1,4 s.", "**Lightning:** strikes near where you look and leaves a shadow (the image burned on the retina) of 0.8 / 1.1 / 1.4 s."],
              ["**Chinchetas trampa:** LLUEVEN del cielo una tras otra durante la pregunta (8 / 14 / 22), se clavan con un rebote y polvo, y ya pueden salir en el acto I.", "**Decoy pins:** they RAIN from the sky one after another during the question (8 / 14 / 22), stick with a bounce and dust, and can now appear in act I."]],
              [I("tanda7", ["Humo barrido, lluvia, cristal roto, batería en ahorro y apagada, rayo con sombra y chinchetas que llueven.", "Swept smoke, rain, cracked glass, battery in saver mode and dead, a lightning shadow and raining pins."], "tall")]),
            E(["Premium II: puntero, viento, terremoto y letras", "Premium II: pointer, wind, earthquake and letters"], "change", "0.60.1", [
              ["**Pulso:** el temblor va al ritmo de un corazón (dos latidos cada 0,82 s, con un anillo rojo en el retículo): en el latido salta y entre latidos se calma, así que hay que clicar a tiempo.", "**Shaky hand:** the tremor follows a heartbeat (two beats every 0.82 s, with a red ring on the reticle): it jumps on the beat and calms between beats, so you must click on time."],
              ["**Cursor con retraso:** una goma discontinua une el retículo con tu ratón real y, a niveles 2 y 3, el retículo va a saltos como una mala conexión.", "**Laggy cursor:** a dashed rubber band links the reticle to your real mouse and, at levels 2 and 3, the reticle jumps like a bad connection."],
              ["**Vendaval:** hace OPOSICIÓN. Contra el viento el ratón rinde la mitad (a favor, un cuarto más) y te arrastra unos 30 px aunque estés quieto; rachas de aire cruzan el mapa con su soplido.", "**Gale:** it fights BACK. Against the wind the mouse gives half (with it, a quarter more) and drags you about 30 px even when still; gusts of air cross the map with their whoosh."],
              ["**Terremoto:** cada pocos segundos una SACUDIDA fuerte mueve el mapa de sitio, retumba y hace temblar la pantalla (el Ancla la deja en casi nada; respeta el ajuste de temblor).", "**Earthquake:** every few seconds a strong SHOCK moves the map, rumbles and shakes the screen (the Anchor reduces it to almost nothing; it respects the shake setting)."],
              ["**Letras temblorosas:** bailan y tiemblan desde el nivel 1 y a tope se vuelven LOCAS (botan, se dispersan girando y vuelven). **Runas:** cambian el 55 / 75 / 95 % de las letras.", "**Shaky letters:** they dance and tremble from level 1 and at full tilt go MAD (they bounce, scatter spinning and return). **Runes:** replace 55 / 75 / 95% of the letters."]],
              [I("tanda8", ["Letras locas, goma del cursor con retraso y Vendaval.", "Mad letters, the laggy cursor's rubber band and Gale."])]),
            E(["Retos nuevos I: bandera y placa", "New challenges I: flag and plate"], "new", "0.68.1", [
              ["**Bandera de espaldas:** la bandera entra girando y se queda en espejo (nv1), boca abajo (nv2) o girada 90° (nv3), con un sello que dice el giro. Si es simétrica frente a ese giro se usa el siguiente. Al responder se endereza; el Ancla la deja derecha.", "**Flag from behind:** the flag spins in and stays mirrored (lv1), upside down (lv2) or turned 90° (lv3), with a stamp naming the turn. If it is symmetric under that turn the next one is used. It straightens when you answer; the Anchor keeps it upright."],
              ["**Bandera a trozos:** 4, 6 o 12 trozos de puzle (nv3 con 2 en gris) que vuelven a su sitio de uno en uno cada 3 s (cada 1 s con costuras doradas con la Chuleta).", "**Flag puzzle:** 4, 6 or 12 puzzle pieces (lv3 with 2 in grey) that return to their place one by one every 3 s (every 1 s with gold seams if you carry the Cheat sheet)."],
              ["**Bandera al viento:** 8 tiras que ondean (nv2 con pliegues que oscurecen, nv3 con rachas que dejan media bandera a ratos). Las Gafas de sol la calman.", "**Flag in the wind:** 8 strips that ripple (lv2 with folds that darken, lv3 with gusts that leave half the flag at times). Sunglasses calm it."],
              ["**Pasaporte falso:** el país de debajo se estampa como un pasaporte y en 1, 2 o 3 de las 5 preguntas es un vecino con frontera. Al responder, el FALSO en rojo sobre el falso y el de verdad. No sale en banderas, países ni pistas.", "**Fake passport:** the country below is stamped like a passport and in 1, 2 or 3 of the 5 questions it is a bordering neighbour. On answering, FAKE in red over the fake one and the real one. It does not appear in flags, countries or clues."],
              ["**Panel de salidas** (Saber, sustituye a la Marquesina): fichas de aeropuerto que giran con su clac-clac y se fijan en las letras del nombre, de izquierda a derecha (nv1), con el país tapado hasta el final (nv2) o en desorden, más lentas y con alguna que se suelta (nv3).", "**Departures board** (Knowledge, replaces the Ticker sign): airport flaps that spin with their clack-clack and settle on the letters of the name, left to right (lv1), with the country hidden until the end (lv2) or out of order, slower and with some that come loose (lv3)."],
              ["Todos entran en el sorteo por familia (los de bandera solo en rondas de banderas, como mucho uno por ronda; los de placa, un solo reto de texto), también en los sellados del Pacto y las apuestas.", "All enter the family draw (flag ones only in flag rounds, at most one per round; plate ones, a single text challenge), also in the Pact's and bets' sealed challenges."]],
              [I("retos-t14", ["Panel de salidas, bandera de espaldas, bandera a trozos y pasaporte falso.", "Departures board, flag from behind, flag puzzle and fake passport."]), I("bandera-viento", ["Bandera al viento: ondea hecha de tiras.", "Flag in the wind: it ripples, made of strips."], "tall")]),
            E(["Retos nuevos II: pantalla, tormenta, reglas y mapa", "New challenges II: screen, storm, rules and map"], "new", "0.69.1", [
              ["**Ctrl+Z** (Pantalla): el crupier deshace tu zoom y el mapa vuelve a la vista inicial en 300 ms, con una barrida de líneas y las teclas Ctrl+Z que se hunden. Cada 6 s (nv1), cada 4 s (nv2) o 1,5 s después de cada zoom (nv3).", "**Ctrl+Z** (Screen): the dealer undoes your zoom and the map snaps back to its initial view in 300 ms, with a sweep of lines and sinking Ctrl+Z keys. Every 6 s (lv1), every 4 s (lv2) or 1.5 s after each zoom (lv3)."],
              ["Con juego limpio: nunca con un botón pulsado ni en los 400 ms siguientes a mover el ratón, y los 300 ms del salto se devuelven al reloj. El Protector la deja a la mitad de las veces y Sangre fría la apaga.", "Played fair: never with a button pressed nor within 400 ms of moving the mouse, and the 300 ms of the jump are returned to the clock. The Screen guard halves it and Cool head switches it off."],
              ["**Noche de tormenta** (Tormenta): el mapa queda casi negro con una lluvia fina y solo se ve entero mientras dura el resplandor de un rayo (0,9 s): un rayo cada 1,5 / 2,2 / 3 s, cada uno de su manera (con su trazo y su trueno, un relámpago lejano o un rayo doble).", "**Stormy night** (Storm): the map goes almost black with a fine rain and is only fully visible during a lightning flash (0.9 s): a bolt every 1.5 / 2.2 / 3 s, each its own way (with its trace and thunder, a distant flash or a double bolt)."],
              ["**Pregunta trampa** (Reglas, nunca en R1 a R3): de las 3 preguntas fáciles de la ronda, 1 o 2 se cambian por otra de una franja más dura del mismo tema, con una esquina roja y el sello TRAMPA sobre la placa. El Descarte la cambia por otra de su misma franja.", "**Trick question** (Rules, never in R1 to R3): of the round's 3 easy questions, 1 or 2 are swapped for one from a harder band of the same topic, with a red corner and a TRICK stamp over the plate. Discard swaps it for another of its own band."],
              ["**Gigantes y enanos** (Sitio): un continente se agiganta y otros se encogen (nv1 un gigante y un enano, nv2 uno y dos, nv3 uno y tres) y los demás se encogen algo para dejar sitio, sin pisarse nunca. Pide hacer zoom; el Ancla los deja casi en su sitio.", "**Giants and dwarfs** (Place): one continent swells while others shrink (lv1 one giant and one dwarf, lv2 one and two, lv3 one and three) and the rest shrink a little to make room, never overlapping. It demands zooming; the Anchor leaves them almost in place."]],
              [I("retos-t15", ["Noche de tormenta, Gigantes y enanos, Pregunta trampa y Ctrl+Z rebobinando.", "Stormy night, Giants and dwarfs, Trick question and Ctrl+Z rewinding."])]),
            E(["Sale del catálogo", "Leaves the catalogue"], "out", "", [
              ["**Bolsa de tiempo** se votó que no y no llega.", "**Time pool** was voted down and does not arrive."],
              ["El **Salvapantallas** tampoco entra en el sorteo: solo vive como golpe de un jefe (Rompe la cuarta pared).", "The **Screensaver** does not enter the draw either: it only lives as a blow of one boss (Breaking the fourth wall)."]]),
          ] },

        /* ------------------------------------------------------------------ jefes */
        { id: "jefes", kicker: ["Jefes", "Bosses"], title: ["23 jefes que suben de tono", "23 bosses that escalate"],
          intro: ["Cada jefe es el examen de una familia que sube de tono pregunta a pregunta. En el acto I va de nivel 1 a 2, en el II de 2 a 3 y en el III queda en nivel 3 con un giro distinto en cada pregunta.", "Each boss is a test of one family that escalates question by question. In act I it goes from level 1 to 2, in II from 2 to 3 and in III it stays at level 3 with a different twist each question."],
          entries: [
            E(["Cómo escalan", "How they escalate"], "new", "0.72.1", [
              ["Una barra de 5 muescas en la barra de la Aventura (de ámbar a rojo, la actual late y salta al subir), un pulso rojo en el borde y un sonido que sube con cada pregunta.", "A 5-notch bar in the Adventure bar (amber to red, the current one throbs and jumps when it rises), a red pulse on the edge and a sound that climbs with each question."],
              ["Fichas de lo que ESTA pregunta lleva (el giro, con borde dorado y sello al entrar) y la descripción del jefe en la intro.", "Chips for what THIS question carries (the twist, with a gold border and a seal as it enters) and the boss description in the intro."],
              ["El plan sigue siendo determinista por semilla y ronda, y los amuletos siguen multiplicando encima (el Foco contra El Apagón). Un ingrediente sobornado, inmune o estrenado no pone sus efectos escalados.", "The plan is still deterministic by seed and round, and charms still multiply on top (Spotlight against The Blackout). A bribed, immune or newly premiered ingredient does not apply its escalated effects."],
              ["Cada jefe tiene nombre, descripción corta y frase propia del crupier en 12 idiomas.", "Each boss has a name, a short description and its own dealer line in 12 languages."]]),
            E(["Acto I", "Act I"], "new", "0.72.1", [
              ["**El Apagón:** el foco se cierra en directo de 300 a 120 px y desde la P3 parpadean las luces.", "**The Blackout:** the spotlight closes live from 300 to 120 px and from Q3 the lights flicker."],
              ["**Mareo de casino:** el Pulso crece de 4 a 12,5 px y el latido suena desde la P2. **Un solo continente:** Pangea se cierra de 0,45 a 1. **Ronda ciega:** el borroso crece de 4 a 9,5 px y la tinta pasa a sin vocales.", "**Casino dizziness:** the Shaky hand grows from 4 to 12.5 px and the heartbeat sounds from Q2. **One continent:** Pangea closes from 0.45 to 1. **Blind round:** the blur grows from 4 to 9.5 px and the ink turns to no vowels."],
              ["**Noche cerrada:** vuelve al acto I con Noche de tormenta y Letras temblorosas.", "**Dead of night:** returns to act I with Stormy night and Shaky letters."],
              ["**La siesta del crupier** (nuevo): duerme en su esquina con Zzz y una barra de ruido que sube con +20 por zoom, +10 por segundo arrastrando, +40 por herramienta y +12 por cada segundo pasado el sexto; el umbral baja de 100 a 60. A tope se despierta de golpe, grita y esa pregunta sigue con Apagón a nivel 3. Mientras duerme no reacciona.", "**The dealer's nap** (new): he sleeps in his corner with Zzz and a noise bar rising +20 per zoom, +10 per second dragging, +40 per tool and +12 for every second past the sixth; the threshold drops from 100 to 60. At the top he wakes with a start, shouts and that question carries on with Blackout at level 3. While he sleeps he does not react."]],
              [I("escalada-apagon", ["La escalada de El Apagón: el foco se cierra pregunta a pregunta.", "The Blackout's escalation: the spotlight closes question by question."], "half"), I("siesta", ["La siesta del crupier: dormido, el mapa se amplía, se despierta y la pregunta sigue a oscuras.", "The dealer's nap: asleep, the map widens, he wakes and the question goes on in the dark."], "half")]),
            E(["Acto II", "Act II"], "new", "0.72.1", [
              ["**Bandera en la niebla**, **Bandera al revés del mundo** (bandera de espaldas y mundo del revés con 5 orientaciones distintas), **Neón de fronteras falsas** (el neón gira de 3,4 s a 1 s), **Bandera pixelada** y **Cine mudo**.", "**Flag in the fog**, **Upside-down world flag** (flag from behind and upside-down world with 5 different orientations), **Neon false borders** (the neon spins from 3.4 s to 1 s), **Pixelated flag** and **Silent movie**."],
              ["**Falsa alarma** (Pangea y luego barajados) y **Terremoto en la sala** (sacudidas y chinchetas crecientes).", "**False alarm** (Pangea and then shuffled) and **Quake in the hall** (growing shocks and pins)."],
              ["**Rompe la cuarta pared:** P1 un golpe, P2 una ventana, P3 SALVAPANTALLAS (la pantalla entra en reposo y tu primer clic solo la despierta), P4 Ctrl+Z y P5 PANTALLAZO AZUL falso de 1,5 s con el tiempo devuelto.", "**Breaking the fourth wall:** Q1 a hit, Q2 a window, Q3 SCREENSAVER (the screen goes idle and your first click only wakes it), Q4 Ctrl+Z and Q5 a fake BLUE SCREEN of 1.5 s with the time returned."],
              ["**El coleccionista** (nuevo): el álbum del crupier con un golpe de sello por bandera: desteñida, de espaldas, a trozos, al viento o a oscuras en orden sorteado, más Fronteras falsas fijas. Premia la mochila variada porque cada truco es de una familia con amuleto. Sus cinco fichas van boca abajo en el Campamento y boca arriba con el Ojo en el cielo.", "**The collector** (new): the dealer's album with a stamp blow per flag: faded, from behind, puzzle, in the wind or in the dark in random order, plus fixed False borders. It rewards a varied backpack because every trick is from a family with a charm. Its five chips are face down at the Camp and face up with the Eye in the sky."]],
              [I("pared-cinco", ["La cuarta pared en cinco maneras.", "The fourth wall, five ways."], "half"), I("rueda-coleccionista", ["La Rueda de la fortuna y El coleccionista.", "The Wheel of fortune and The collector."], "half")]),
            E(["Acto III", "Act III"], "new", "0.72.1", [
              ["**El gran espejo** (mapa y controles con 5 combinaciones), **Baraja revuelta**, **Tormenta perfecta** (lluvia, luego rayos, luego noche) y **Pantallazo** (una sola batería para toda la ronda, del 100 al 5 %).", "**The great mirror** (map and controls with 5 combinations), **Shuffled deck**, **Perfect storm** (rain, then lightning, then night) and **System crash** (a single battery for the whole round, from 100 to 5%)."],
              ["**Juego sucio** (antes Todo o nada): Fronteras falsas, Luces parpadeantes y Contrarreloj, con una zancadilla por pregunta: chinchetas, retraso, pulso, parpadeo y controles al revés.", "**Dirty play** (was All or nothing): False borders, Flickering lights and Against the clock, with one dirty trick per question: pins, delay, shake, flicker and reversed controls."],
              ["**Sin pasaporte** (rehecho): Pixeles gordos y un truco por pregunta: sin país, Babel, adivinanza, pasaporte falso, adivinanza sin país.", "**No passport** (rebuilt): Fat pixels and one trick per question: no country, Babel, riddle, fake passport, riddle with no country."],
              ["**Rueda de la fortuna** (nuevo): antes de cada pregunta gira una rueda 1,2 s, con el tiempo devuelto, y cae en una familia que no repite a nivel 3, más un reto fijo a nivel 2. Cada familia gasta una carga de su amuleto.", "**Wheel of fortune** (new): before each question a wheel spins 1.2 s, with the time returned, and lands on a family that does not repeat at level 3, plus a fixed level-2 challenge. Each family spends a charge of its charm."],
              ["**Duelo con la banca** (nuevo): la meta es la puntuación del crupier, que sube con cada respuesta suya hasta sumar EXACTAMENTE el objetivo; su chincheta dorada cae después de la tuya con «BANCA +n». Trae 2 retos a nivel 3.", "**Showdown with the bank** (new): the goal is the dealer's score, which rises with each answer of his until it totals EXACTLY the target; his gold pin lands after yours with «BANK +n». It brings 2 level-3 challenges."]],
              [I("escalada-acto3", ["La escalada del acto III: Juego sucio, tormenta y Sin pasaporte.", "Act III's escalation: Dirty play, storm and No passport."], "half"), I("duelo-banca", ["Duelo con la banca.", "Showdown with the bank."], "half")]),
          ] },

        /* ------------------------------------------------------------------ ascensiones (tanda 17, v0.73.1) */
        { id: "ascensiones", kicker: ["Ascensiones", "Ascensions"], title: ["Cada Ascensión, con su identidad", "Every Ascension, with its own identity"],
          intro: ["El escalón de dificultad que cobra el experto, con una regla clara en cada nivel. Cada Ascensión suma lo de las anteriores.", "The difficulty ladder the expert climbs, with a clear rule at every level. Each Ascension adds everything before it."],
          entries: [
            E(["Las preguntas suben con la Ascensión", "Questions get harder with every Ascension"], "change", "0.75.1", [
              ["La dificultad de las preguntas ya no depende solo de la ronda: sube de forma exponencial entre rondas y entre Ascensiones. En A0 salen los lugares, banderas y pistas más fáciles de cada tema; en A5, los realmente difíciles.", "Question difficulty no longer depends only on the round: it climbs exponentially between rounds and between Ascensions. A0 serves the easiest places, flags and clues of each theme; A5 serves the really hard ones."],
              ["Ronda 1 en A0: París, Caracas, Berlín, La Habana y El Cairo. Ronda 1 en A5: Abu Dabi, Varsovia, Bratislava, Camberra y Brazzaville. Ronda 12 en A5: Iwo Jima, Lincoln Center, la selva de Daintree, la Larga Marcha y Lesoto.", "Round 1 on A0: Paris, Caracas, Berlin, Havana and Cairo. Round 1 on A5: Abu Dhabi, Warsaw, Bratislava, Canberra and Brazzaville. Round 12 on A5: Iwo Jima, Lincoln Center, the Daintree rainforest, the Long March and Lesotho."],
              ["La dificultad media de las cinco preguntas sube de 17 en A0 a 53 en A5 (en una escala de 0 a 100) Las primeras rondas de las Ascensiones altas no son ya lo más difícil: la ronda 1 de A5 es de dificultad media-alta (38) y la 12, la más dura (58).", "The average difficulty of the five questions rises from 17 on A0 to 53 on A5 (on a 0 to 100 scale) The first rounds of the high Ascensions are not the hardest yet: round 1 of A5 is medium-high (38) and round 12 the toughest (58)."],
              ["Siguen saliendo todas las preguntas: no hay techo duro y un lugar difícil puede aparecer de vez en cuando incluso en A0. Se mantiene el reparto de 3 fáciles, 1 media y 1 difícil, pero relativo a la Ascensión. Los temas de dos rondas (banderas, ciudades y monumentos) sortean ahora del tema entero.", "Every question can still appear: there is no hard ceiling and a hard place can show up now and then even on A0. The split of 3 easy, 1 medium and 1 hard stays, but relative to the Ascension. Themes that span two rounds (flags, cities and landmarks) now draw from the whole theme."],
              ["El Reto diario usa su Ascensión en la misma curva y sigue siendo idéntico para todos. Una partida guardada a medias reanuda con sus mismas preguntas. El modo infinito y el Clásico no cambian.", "The Daily Challenge uses its Ascension on the same curve and is still identical for everyone. A half-played saved run resumes with the same questions. Infinite mode and Classic do not change."],
              ["A0 queda deliberadamente suave: quien sabe lo básico gana con facilidad. La curva se seguirá afinando en el parche v0.2.2, porque el experto en A3 todavía gana casi siempre y al novato de continentes aún le cuesta ganar A0.", "A0 is deliberately gentle: anyone who knows the basics wins easily. The curve will keep being tuned in patch v0.2.2, because the expert on A3 still wins almost every time and the continents-only newcomer still struggles to win A0."]]),
            E(["Nombre y regla en todas partes", "A name and a rule everywhere"], "new", "0.73.1", [
              ["Cada Ascensión tiene un nombre y una línea de regla en 12 idiomas. Desde la A2 se añade «La casa cobra más» con las cifras acumuladas (por cada Ascensión: objetivos +5 %, −1 s y precios +10 %).", "Every Ascension has a name and a one-line rule in 12 languages. From A2 on, «The house takes more» is added with the accumulated figures (per Ascension: targets +5%, −1 s and prices +10%)."],
              ["Se ve en la selección de Ascensión (el nombre en blanco, la suma debajo y un globo en cada ficha), en el Campamento (bajo el título; el globo trae las cifras), en la tarjeta de continuar («Acto 2 · Ronda 3 · A3»), en la baraja cerrada («Supera la Ascensión 2 «Reglas de la casa»»), en el veredicto de la expedición y, al ganar, con la siguiente que se abre.", "It shows on the Ascension select screen (the name in white, the sum below and a bubble on each chip), at the Camp (under the title; the bubble carries the figures), on the continue card («Act 2 · Round 3 · A3»), on the locked deck («Clear Ascension 2 «House rules»»), in the run verdict and, when you win, with the next one that unlocks."],
              ["Se midió con unas 1.800 expediciones simuladas (jugadores de cuatro perfiles) y se movieron dos perillas: la regla de la A2 ocupa el sitio de un reto, y la provisión menos pasa de la A3 a la A4.", "It was measured with about 1,800 simulated runs (players of four profiles) and two knobs were moved: the A2 rule takes the place of a challenge, and the lost provision moves from A3 to A4."]]),
            E(["A1 · La casa cobra", "A1 · The house takes its cut"], "change", "0.73.1", [
              ["Objetivos +5 %, −1 s y todo cuesta +10 %: Barajar, Cambiar cartas, amuletos, vitrina, suministros, Rojo o negro y la Oferta de la casa. Los sobornos usan el mismo factor.", "Targets +5%, −1 s and everything costs +10%: Reshuffle, Swap cards, charms, showcase, supplies, Red or black and the House offer. Bribes use the same factor."]]),
            E(["A2 · Reglas de la casa", "A2 · House rules"], "change", "0.54.1 · 0.73.1", [
              ["Una regla de la bolsa (Contrarreloj, Silencio, Vendaval y Pregunta trampa) en R5, R7, R9 y R11, sin repetir; antes eran 6 rondas.", "One rule from the bag (Against the clock, Silence, Gale and Trick question) in R5, R7, R9 and R11, with no repeats; it used to be 6 rounds."],
              ["Sale de la semilla de la expedición: barajar no la cambia ni la repite. Ocupa el sitio de un reto.", "It comes from the run's seed: reshuffling neither changes nor repeats it. It takes the place of a challenge."]]),
            E(["A3 · Retos afilados", "A3 · Sharpened challenges"], "change", "0.73.1", [
              ["+1 nivel en los actos I y II. La lista suave de R1 a R3 sale a nivel 2, los amuletos ya gastan carga en el acto I y se acaba la etiqueta NUEVO.", "+1 level in acts I and II. The soft list of R1 to R3 comes at level 2, charms already spend a charge in act I and the NEW label ends."]]),
            E(["A4 · Jefes con poder", "A4 · Bosses with power"], "change", "0.73.1", [
              ["+1 reto en cada jefe, con tope de 5, y −1 provisión (antes la quitaba la A3). La apuesta final se sigue ofreciendo.", "+1 challenge at every boss, capped at 5, and −1 provision (A3 used to take it). The final bet is still offered."],
              ["La Rueda de la fortuna y El coleccionista, que ya traen 6 fichas, no llevan el reto extra.", "The Wheel of fortune and The collector, which already carry 6 chips, do not get the extra challenge."]]),
            E(["A5 · Equipaje de mano", "A5 · Carry-on"], "change", "0.73.1", [
              ["Mochila de 4 huecos (5 con el Pacto).", "A 4-slot backpack (5 with the Pact)."]]),
          ] },

        /* ------------------------------------------------------------------ arte */
        { id: "arte", kicker: ["Arte", "Art"], title: ["Todo al nivel de las fichas de logro", "Everything at the level of the achievement tokens"],
          intro: ["Ningún icono es provisional. Todos los objetos se rehacen con el proceso de las 100 fichas de logro: rejilla nativa de 48 px, contorno índigo continuo de 1 px, bandas de 2 y 3 tonos y limpieza a mano.", "No icon is provisional. Every object is rebuilt with the process of the 100 achievement tokens: native 48 px grid, continuous 1 px indigo outline, 2 and 3 tone bands and hand clean-up."],
          entries: [
            E(["Iconos rehechos", "Redrawn icons"], "buff", "0.51.1 · 0.56.1 · 0.57.1 · 0.61.1 · 0.64.1", [
              ["Las 25 reliquias, las 7 herramientas, los suministros (Café doble y Seguro de ronda con icono propio), el corazón de provisiones, lleno y vacío, y las 3 apuestas.", "The 25 relics, the 7 tools, the supplies (Double coffee and Round insurance with their own icon), the provisions heart, full and empty, and the 3 bets."],
              ["Los seis amuletos (Mano firme, Chuleta, Foco, Gafas de sol, Ancla y Protector), las cuatro Ventajas, y los de Luces de neón, Sin colores, Dividir, el Pacto y la Oferta de la casa.", "The six charms (Steady hand, Cheat sheet, Spotlight, Sunglasses, Anchor and Screen guard), the four Perks, and those of Neon lights, No colours, Split, the Pact and the House offer."],
              ["Corazón helado de Sangre fría, cerdito de la Hucha y red de trapecio de la Red de seguridad.", "The frozen heart of Cool head, the Piggy bank's piggy and the Safety net's trapeze net."]],

              [I("iconos-herramientas", ["Herramientas, suministros, corazón (lleno y vacío) y las tres apuestas.", "Tools, supplies, heart (full and empty) and the three bets."])]),
            E(["Iconos de reto, dibujados a mano", "Hand-drawn challenge icons"], "new", "0.68.1 – 0.72.1", [
              ["12 iconos nuevos: Bandera de espaldas, a trozos, al viento, Pasaporte falso, Panel de salidas, Ctrl+Z, Noche de tormenta, Pregunta trampa, Gigantes y enanos, La siesta, Salvapantallas y Pantallazo.", "12 new icons: Flag from behind, Flag puzzle, Flag in the wind, Fake passport, Departures board, Ctrl+Z, Stormy night, Trick question, Giants and dwarfs, The nap, Screensaver and System crash."]],
              [I("iconos-t14", ["Iconos de retos de la tanda 14 junto a los logros.", "Challenge icons from batch 14 next to the achievements."], "half"), I("iconos-t15", ["Iconos de la tanda 15.", "Icons from batch 15."], "half"), I("iconos-t16", ["Iconos de los jefes de la tanda 16.", "Boss icons from batch 16."], "tall")]),
            E(["Banderas pixel art en la Enciclopedia", "Pixel art flags in the Encyclopedia"], "new", "0.70.1 · 0.71.1", [
              ["Las 199 banderas pixel art (ondeantes, con mástil), rehechas con una silueta propia: tela de altura constante, contorno continuo de 1 px, pliegue y luz limpios, escudos sin grano. España, Afganistán, Arabia Saudí y Kirguistán llevan el escudo dibujado a mano.", "The 199 pixel art flags (waving, on a pole), redrawn with their own silhouette: constant-height cloth, continuous 1 px outline, clean fold and light, no grain on the crests. Spain, Afghanistan, Saudi Arabia and Kyrgyzstan have their crest hand-drawn."],
              ["Aparecen en las tarjetas relacionadas de cada país, en lugar del icono de España; el resto del juego mantiene sus banderas originales.", "They show on each country's related cards, instead of the Spain icon; the rest of the game keeps its original flags."]]),
          ] },

        /* ------------------------------------------------------------------ arreglos */
        { id: "arreglos", kicker: ["Arreglos", "Fixes"], title: ["Lo que estaba roto", "What was broken"],
          intro: ["Los problemas que salieron al medir el juego, ordenados por tanda.", "The problems that turned up while measuring the game, in order of batch."],
          entries: [
            E(["Tandas 0 a 2", "Batches 0 to 2"], "fix", "0.50.1 – 0.53.1", [
              ["Las notas ya no chivan la respuesta: en banderas y pistas solo dicen la región, y la máscara del nombre tapa de verdad en los 12 idiomas (en coreano dejaba el nombre a la vista en la mitad de los lugares).", "The notes no longer give the answer away: in flags and clues they only say the region, and the name mask really hides it in all 12 languages (in Korean it left the name visible for half the places)."],
              ["Cartas que mentían, corregidas en 12 idiomas. El Seguro de ronda solo sube de precio cuando te salva.", "Cards that lied, fixed in 12 languages. The Round insurance only rises in price when it saves you."],
              ["La tienda solo ofrece pistas donde aportan. Las barajas se ganan superando Ascensiones. Fuera tres jefes del acto II que nunca salían.", "The shop only offers hints where they help. Decks are won by clearing Ascensions. Three act II bosses that never appeared are gone."],
              ["Las Chinchetas trampa ya no señalaban el sitio: clicar en su centro daba 700 a 800 puntos.", "Decoy pins no longer pointed at the spot: clicking their centre gave 700 to 800 points."],
              ["Babel cambia siempre el nombre. Nunca sale un reto que no hace nada, tampoco en los jefes. El Apagón sale una vez por expedición (casi nunca dos). Sin colores sale por fin, con el jefe Cine mudo.", "Babel always changes the name. A challenge that does nothing never appears, not even at bosses. The Blackout appears once per run (almost never twice). No colours finally appears, with the Silent movie boss."],
              ["Nuevo ajuste «Destellos suaves» en Ajustes > Imagen (cada rayo y cada corte de luz, un solo fundido suave) y aviso de fotosensibilidad en el primer arranque.", "New «Soft flashes» setting in Settings > Video (every lightning bolt and light cut, a single soft fade) and a photosensitivity notice on first launch."],
              ["Cambiar de idioma con el Campamento abierto ya no deja las cartas en «0», «1» y «2». Ajustes > Imagen cabe en ruso y portugués.", "Switching language with the Camp open no longer leaves the cards at «0», «1» and «2». Settings > Video fits in Russian and Portuguese."]]),
            E(["Después", "Afterwards"], "fix", "0.51.1 · 0.55.1 · 0.64.1 · 0.65.1", [
              ["El jackpot crea sus sonidos justo antes de que suenen: antes eran unos 800 de golpe, un tirón de unos 60 ms con la CPU lenta.", "The jackpot creates its sounds just before they play: before it was about 800 at once, a stutter of about 60 ms on a slow CPU."],
              ["Una intro de ronda sustituida (reiniciar, abandonar u otra partida) ya no lanza después la pregunta de una partida que no existe.", "A replaced round intro (restart, abandon or another run) no longer launches the question of a run that no longer exists."],
              ["Las rebajas de objetivo tienen tope del −15 %, y el Guardarrachas ya no actúa en el infinito.", "Target discounts are capped at −15%, and the Streak guard no longer acts in endless mode."]]),
          ] },
      ],
      /* historial: version del juego -> lo que trajo */
      timeline: [
        ["0.50.1", ["Arreglos comprobados", "Verified fixes"]], ["0.51.1", ["Legendaria Pan de oro", "Gold leaf legendary"]], ["0.52.1", ["Retos arreglados y Destellos suaves", "Fixed challenges and Soft flashes"]], ["0.53.1", ["Las reliquias se lucen", "Relics show off"]],
        ["0.54.1", ["Amuletos", "Charms"]], ["0.55.1", ["Ventajas y Comodín", "Perks and Wildcard"]], ["0.56.1", ["Segunda bola y As en la manga", "Second ball and Ace up the sleeve"]], ["0.57.1", ["Retos fundidos", "Merged challenges"]],
        ["0.58.1", ["Sorteo por familias", "Draw by family"]], ["0.59.1", ["Retos premium I", "Premium challenges I"]], ["0.60.1", ["Retos premium II", "Premium challenges II"]], ["0.61.1", ["Racha, dinero y supervivencia", "Streak, money and survival"]],
        ["0.62.1", ["Tienda", "Shop"]], ["0.63.1", ["Saber", "Knowledge"]], ["0.64.1", ["Apuestas e iconos", "Bets and icons"]], ["0.65.1", ["Legendarias", "Legendaries"]], ["0.66.1", ["Dividir", "Split"]],
        ["0.67.1", ["Pacto y Oferta", "Pact and Offer"]], ["0.68.1", ["Retos nuevos I", "New challenges I"]], ["0.69.1", ["Retos nuevos II", "New challenges II"]], ["0.70.1", ["Banderas pixel art", "Pixel art flags"]],
        ["0.71.1", ["Banderas repulidas", "Polished flags"]], ["0.72.1", ["Jefes con identidad", "Bosses with identity"]], ["0.73.1", ["Ascensiones con identidad", "Ascensions with identity"]], ["0.74.1", ["Notas del parche", "Patch notes"]], ["0.75.1", ["Preguntas más difíciles con la Ascensión", "Harder questions with the Ascension"]],
      ],
    },
  ];
})(window.AIQ);
