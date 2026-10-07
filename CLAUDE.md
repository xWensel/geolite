# Geolite - reglas del proyecto

## Que es Geolite
Juego de geografia con alma de casino, de Cousins Studios: haces clic en el mapa lo mas cerca posible del lugar que te piden. Modos: Aventura (roguelike de 12 rondas en 3 actos, Ascensiones 0-5, modo infinito, Campamento con tienda y casino de 8 juegos, Don Crupier), Clasico (12 campanas de 10 niveles), Reto diario y Enciclopedia (5.025 tarjetas). 12 idiomas, 100 logros en Steamworks, web/PWA, Electron en Windows, Linux y Steam Deck. La definicion completa del producto es `README.md`: describe SIEMPRE lo que Geolite es hoy, en presente, sin historia ni origenes. Los datos del jugador usan claves `atlasiq.*` y el codigo el espacio `window.AIQ` (nombres internos estables).

## Autoria y creditos (no se cambia sin que el autor lo pida)
- Diseno, codigo, arte y banda sonora: Cousins Studios (el arte, con el matiz de la linea siguiente).
- Arte: pixel art de Cousins Studios. Base ideada por el estudio y andamiaje de IA (libro de estilo propio y paleta limitada); trabajo manual y pulido humano, pieza a pieza, hasta la rejilla nativa del juego: el crupier (retrato maestro pulido a mano), iconos e insignias de logros (48 px nativos), iconos del casino, escenas, tarjetas de modo, logo y escudo. Todo el arte debe quedar a rejilla nativa y a escala entera (`image-rendering: pixelated`). Lo que se publique como arte sin ese repaso a mano no cuenta como terminado.
- Banda sonora: creada por Cousins Studios con AKAI y exportada al motor de audio del juego (`assets/music/`, orden y titulos en `js/audio.js`). 21 canciones, 35 min 43 s. Cualquier cancion nueva se anade a esta lista y a la del README:
01. Apuesta segura / Sure Bet (lounge nocturno, 1:30)
02. Doble o nada / Double or Nothing (ragtime, 1:44)
03. Ambos marcan / Both Teams to Score (bossa nova, 1:41)
04. Más de 2,5 goles / Over 2.5 Goals (samba, 1:37)
05. Todo al rojo / All on Red (blues, 1:48)
06. Huérfanos / Orphans (vals, 1:45)
07. All-in / All In (funk, 1:33)
08. Combinada / Parlay (big band, 1:43)
09. Sube la apuesta / Raise the Stakes (mambo, 1:40)
10. Retirar ganancias / Cash Out (lo-fi, 1:45)
11. Banca al día / Bankroll (reggae, 1:42)
12. Apuesta en vivo / Live Bet (reggaeton, 1:45)
13. Pleno al quince / Straight Up (flamenco, 1:48)
14. Hándicap asiático / Asian Handicap (deep house, 1:35)
15. Gran apostador / High Roller (funk, 1:44)
16. Bote acumulado / Progressive Jackpot (house, 1:34)
17. Ventaja de la casa / House Edge (tecno, 1:46)
18. Mano caliente / Hot Hand (merengue, 1:47)
19. Ganador y colocado / Each Way (cha-cha-chá, 1:46)
20. Empate no vale / Draw No Bet (ranchera, 1:43)
21. Apuesta máxima / Max Bet (corrido, 1:45)
- Datos y licencias: fronteras de Natural Earth, textos de Wikipedia y fotos de Wikimedia Commons con atribucion por tarjeta (`credits.html`, panel Creditos del juego), tipografias SIL OFL (Silkscreen, Jersey 15, Pixelify Sans, Fusion Pixel). Cualquier foto o fuente nueva entra en `credits.html` (`tools/build-credits.mjs`).

## Versiones (obligatorio en cada entrega)
- La version del juego es 0.2.N y sigue la numeracion de las notas del parche. Cada entrega que se sube a `main` sube el ULTIMO numero en 1, cierra la version anterior y lleva su propia entrada en las notas del parche (`js/parche-data.js`; si es pequena, 1 o 2 lineas). Un parche publicado nunca se edita.
- La version actual es la de `VERSION`. Al subir una entrega, cambia la version en TODOS estos sitios a la vez: `VERSION`, `js/support.js` (`A.VERSION`, la que se ve en el juego), `package.json` y `package-lock.json` (`version`), y la cache de `sw.js` (`geolite-vX.Y.Z`).
- El `README.md` no lleva entradas por entrega: solo se toca si cambia lo que Geolite es (modos, cifras, creditos). El historial vive en las notas del parche y en git.

## Arte ligado al crupier
- El crupier (Don Crupier) es un sprite animado por capas: fuente en `tools/crupier/` (retrato maestro pulido a mano, capas, caras,
  manos, expresiones y gestos en `anim.py`). `python tools/crupier/build.py` genera `js/crupier-data.js` (lo que usa el juego con
  `js/crupier.js`) y los retratos fijos; con `--apply` sustituye `assets/icons/dealer_*.webp`. NUNCA regenerar al crupier con
  gen_art/pixelize_all/retouch (lo volverian a sacar del jpg con el broche en la chistera). Consistencia: chistera lisa, mismas cartas.
- La tarjeta del modo Aventura (`assets/gen/card_adv.webp`) lleva DENTRO al crupier de sus frases (`assets/icons/dealer_neutral.webp`).
  Si el crupier cambia (retrato nuevo, retoque, otro traje o tamano), en la misma entrega hay que regenerar la tarjeta con
  `python tools/card_adv.py` y revisarla para que se adapte: posicion `DEALER_AT`, que la mesa le tape el busto, que la pajarita
  siga a la vista y que el explorador no le tape la cara. Las piezas de la escena estan en `tools/art/card_adv/`.
- El icono del jefe del acto (`assets/icons/boss_hat.webp`: ruta de la expedicion, proxima ronda, ficha roja del jefe) es la chistera del crupier,
  sacada de su capa `hat`. Si el crupier cambia, en la misma entrega: `python tools/crupier/chistera.py`.

## Logros
- Tope de 100 (Steam). Los logros salen sobre todo del juego de geografia (dianas, Enciclopedia por tipo y continente, campanas, Ascensiones, rachas); el casino solo aporta unos pocos guinos. Hay ocultos y contadores de progreso. Cada logro tiene insignia propia (`assets/icons/ach_<id>.webp`).
- Definicion en `js/profile.js` (`A.ACH`); tras cambiar logros o textos, volver a exportar con `node tools/steam-achievements.mjs` y `python tools/steam_icons.py`.

## Notas del parche (lo que lee el jugador dentro del juego)
- Los parches tienen numeracion PROPIA, distinta de la del juego (v0.2.1, v0.2.2...), y se leen desde el icono del cuaderno de la esquina inferior izquierda de la portada.
  Los datos estan en `js/parche-data.js` (`A.PATCHES`, el mas nuevo primero; la cabecera del archivo explica el formato) y sus capturas en `assets/parche/`. La interfaz es `js/parche.js` + `css/parche.css`.
- Cuando una entrega (o varias seguidas) reuna cambios que el jugador note, anade un parche nuevo (o amplia el ultimo si aun no se ha publicado): textos en es y en (los otros 10 idiomas caen al ingles),
  cifras medidas contra el juego y cada entrada con la version del juego en la que llego. El punto rojo de "nuevo" sale solo.
