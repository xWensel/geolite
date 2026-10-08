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
- Numeracion 0.M.N. El 0 inicial indica pre-release (hasta salir a Steam); la M es el hito en el que estamos (hoy el 3: v0.3.0 es la build limpia, solo con lo que Geolite es hoy); la N son las iteraciones: cada push a `main` suma +1 a la tercera cifra (0.3.0 -> 0.3.1 -> 0.3.2...). Al cambiar de hito la N vuelve a 0.
- La version actual es la de `VERSION`. Al subir una entrega, cambia la version en TODOS estos sitios a la vez: `VERSION`, `js/support.js` (`A.VERSION`, la que se ve en el juego), `package.json` y `package-lock.json` (`version`, dos veces), y la cache de `sw.js` (`geolite-vX.Y.Z`).
- La version del juego y la de las notas del parche son la misma. Cada entrega lleva su propia entrada en `js/parche-data.js` (si es pequena, 1 o 2 lineas). Un parche publicado nunca se edita.
- El `README.md` no lleva entradas por entrega: solo se toca si cambia lo que Geolite es (modos, cifras, creditos). El historial vive en las notas del parche y en git.

## Build limpia (regla de fondo)
- El repositorio solo contiene lo que el juego usa HOY: nada de iconos, escenas, codigo, migraciones de guardados antiguos ni carpetas de pruebas que ya no se usen. Antes de cada entrega, lo que sobra se borra (git guarda el historial; la v0.3.0 parte del commit `60acc9a`).
- `tools/` solo guarda lo que construye y publica el juego: `steam-pack.mjs`, `steam-upload.mjs`, `steam-achievements.mjs`, `steam_icons.py`, `ach_pixel.py`, `audit-licenses.mjs`, `build-credits.mjs`, `bundle-media.py`, `wiki-thumbs.py`, `publish-media.mjs`, `fetch-media.mjs`, `linux_tar.py`. Los generadores de arte y de datos se retiraron en la v0.3.0; si hicieran falta, se recuperan del historial de git.

## Fotos de la Enciclopedia
- TODA carta tiene foto real, libre para uso comercial (dominio publico, CC0, CC BY o CC BY-SA) con autor y licencia en `data/wiki/img.json` (se muestran en la ficha y en `credits.html`). Nunca se usa una ilustracion de relleno en su lugar, y el aviso de tarjeta nueva y la ficha ensenan la foto del lugar.
- Cada lugar es UNA carta con tres niveles (`id`, `id~h`, `id~k`) que comparten foto.
- Tamanos: miniatura 320 px (`assets/wiki/th`), tarjeta 960 px (`assets/wiki/card`) y HD 1920 px (`assets/wiki/hd`). El paquete de Steam las incluye las tres (`node tools/steam-pack.mjs`): un solo paquete, sin servidores. En la web se sirven desde GitHub Pages (`js/support.js`, `A.media`).

## Arte ligado al crupier
- El crupier (Don Crupier) es un sprite animado por capas que usa `js/crupier.js` con los datos de `js/crupier-data.js` (atlas incrustado). Las fuentes de arte (`tools/crupier/`, `tools/card_adv.py`...) se retiraron del repositorio en la v0.3.0.
- Las tres cartas de modo de la portada (`assets/gen/card_classic.webp`, `card_adv.webp`, `card_compete.webp`) son sencillas: UN protagonista al estilo de los logros (globo, crupier, trofeo) sobre un fondo de foco a bandas del color de su modo (turquesa, granate, morado). Nada de escenas cargadas ni de piezas de dentro del juego (mapa, chinchetas, HUD). La de Aventura es el crupier de sus frases (`assets/icons/dealer_neutral.webp`) a 1:1 de su rejilla sobre un lienzo de 102x128 (x10); si el crupier cambia, la carta se rehace en la misma entrega.
- El icono del jefe del acto (`assets/icons/boss_hat.webp`) es la chistera del crupier. Todo el arte va a rejilla nativa y a escala entera (`image-rendering: pixelated`).

## Logros
- Tope de 100 (Steam). Los logros salen sobre todo del juego de geografia (dianas, Enciclopedia por tipo y continente, campanas, Ascensiones, rachas); el casino solo aporta unos pocos guinos. Hay ocultos y contadores de progreso. Cada logro tiene insignia propia (`assets/icons/ach_<id>.webp`).
- Definicion en `js/profile.js` (`A.ACH`); tras cambiar logros o textos, volver a exportar con `node tools/steam-achievements.mjs` y `python tools/steam_icons.py`.

## Notas del parche (lo que lee el jugador dentro del juego)
- Se leen desde el icono del cuaderno de la esquina inferior izquierda de la portada. Los datos estan en `js/parche-data.js` (`A.PATCHES`, el mas nuevo primero; la cabecera del archivo explica el formato), las capturas opcionales en `assets/parche/` y la interfaz es `js/parche.js` + `css/parche.css`.
- El numero del parche es el de la version del juego (0.3.0, 0.3.1...). Cada entrega suma una entrada: textos en es y en (los otros 10 idiomas caen al ingles), cifras medidas contra el juego y cada entrada con la version en la que llego. El punto rojo de "nuevo" sale solo.
