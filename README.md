# Geolite

**Geolite** es un juego de geografía con alma de casino, de **Cousins Studios**. Te piden un lugar, haces clic en el mapa lo más cerca que puedas y cuanto más rápido y más preciso, más puntos. Alrededor de ese gesto hay un roguelike de rondas y actos, un crupier con personalidad, una enciclopedia de 5.025 tarjetas que se desbloquean acertando y un casino donde jugarte los doblones.

Versión actual: ver `VERSION` (se muestra también en Ajustes). Sin build ni dependencias para jugar: abre `index.html` (o `JUGAR.bat`). En la web lo sirve Vercel; en escritorio, Electron (`main.js`, `npm start`).

## Qué es hoy

- **Mapa de precisión.** Mapa del mundo en WebGL2 vectorial (con respaldo en 2D), nítido a cualquier zoom. En las preguntas de país, estar dentro es 0 km; fuera cuenta la distancia real sobre la esfera hasta la frontera más cercana.
- **Casino en pixel art.** Todo el juego es una mesa de casino: tapete, cartas, fichas, monitor CRT, tipografías pixel y una banda sonora propia.
- **12 idiomas:** es, en, fr, pt (Brasil), de, it, es-419, zh, ko, ja, ru y pl.
- **Plataformas:** navegador y PWA instalable, escritorio (Windows con Electron y Steamworks), Linux y Steam Deck (también bajo Proton). Mando completo con cursor propio en el mapa. Teclas, botones del ratón y del mando reasignables en Ajustes > Controles.
- **100 logros** conectados a Steamworks, con ocultos y contadores de progreso (“37 / 100”).

## Modos

- **Aventura** – el modo principal. Roguelike de 12 rondas en 3 actos; la cuarta ronda de cada acto es un jefe y, al ganar, el modo infinito sigue. Cada ronda pide una puntuación objetivo creciente y el crupier la complica con retos de mesa (texto, muro, mapa, regla, puntero y bandera: 67 en total). Entre rondas, el **Campamento**: tres cartas de tienda (reliquias, amuletos, herramientas y provisiones) con tirada, sobornos para quitar un reto, suministros de una ronda (Seguro, Café doble), apuestas (Oferta de la casa, Doble o nada, La apuesta final) y el juego del casino de esa visita. Cuatro barajas (Explorador, Historiador, Navegante y Aventurero ciego), siete herramientas activas, 23 jefes con identidad propia y **Ascensiones 0 a 5** que endurecen objetivos, tiempo, tienda y jefes.
- **Clásico** – campañas de 10 niveles con su propia puntuación y medallas: Mundo, Capitales del mundo, EE. UU., Europa, Asia, Latinoamérica, Oceanía, Banderas, Pistas, Eventos históricos, Personajes históricos y Mezcla.
- **Reto diario** – una mano por día, la misma semilla para todos, tres intentos; la puntuación del día es la suma, con sus clasificaciones de Hoy y Ayer. "Otro día" abre un calendario (o busca el código de una semilla) para practicar la mano de un día pasado, sin clasificación, logros ni récords.
- **Enciclopedia** – 5.025 tarjetas (países, capitales, ciudades, monumentos, naturaleza, mares, estrechos, batallas, sucesos, personajes y curiosidades) organizadas por continentes. Se desbloquean acertando cerca: a menos de 300 km se abre el lugar, a menos de 150 km su Historia y a menos de 75 km su Dato clave (el doble de margen en mares, naturaleza y estrechos). Cada lugar tiene medallas de bronce, plata y oro. Textos, fotos y banderas van empaquetados: funciona sin conexión.

## Don Crupier

El crupier es un personaje animado por capas (retrato, caras, manos, expresiones y gestos) que comenta cada ronda, se deja sobornar para quitar un reto y te la juega de vez en cuando: puede colarte un logro falso con su sello de “De broma”. Su guion existe en los 12 idiomas (`js/dealer.js`) y su arte vive en `tools/crupier/`.

**En directo.** El autor puede mirar las partidas abiertas y hablar por el crupier desde su mesa privada (`/mesa`, clave `MESA_KEY` en Vercel): la frase sale en su bocadillo con el piloto rojo de EN DIRECTO. La mesa es una mesa de casino: cada partida es un asiento, las frases rápidas son cartas (las lee en español y llegan traducidas al idioma del jugador; lo escrito a mano llega tal cual) y los efectos son fichas (`A.chfx.live`) que caen por encima de todo el juego, en cualquier pantalla (partida, Campamento, menús, casino, Ajustes, créditos): las pinta un segundo motor de efectos, el de la mesa, en una capa propia (`#vivoFx`), y el de los retos sigue pegado al mapa. El rayo cae a cada clic; lluvia, tormenta (lluvia y rayos), apagón, terremoto (sacude la pantalla entera) y humo son interruptores; cristal roto, huellas y ventana de error son contadores de ×1 a ×5 (clic pone, clic derecho quita). El humo (`js/humo.js`) es un fluido simulado en la GPU: el crupier se lo echa al jugador a la cara, entra a bocanadas por los dos lados de la pantalla y el jugador lo aparta moviendo el ratón o el cursor del mando. Con efectos puestos, el crupier habla en directo por delante de ellos (si la mesa no elige sitio, abajo a la izquierda). Lo puesto se queda entre preguntas y se va todo si la mesa deja de mirar, si el jugador apaga el directo o si se corta la conexión; el juego informa a la mesa de lo que tiene puesto. En escritorio la mesa puede ver la ventana del juego en vídeo (captura de pestaña de Electron, solo el contenido del juego; WebRTC de punto a punto con STUN público, la oferta y la respuesta cruzan por Upstash) mientras el jugador ve el piloto TE ESTÁ MIRANDO, y señalar con el guante del crupier (`assets/icons/vivo_glove.webp`, sus píxeles): clic = dos toquecitos, arrastrar = le sigue. Cada partida da un latido a `api/vivo.js` cada 25 s (cada 2 s mientras la mesa la mira) con nombre, idioma, plataforma y por dónde va; nada más, con un identificador aleatorio por arranque. Se apaga en Ajustes › Datos (`js/vivo.js`); `api/mesa.js` lista las partidas y entrega lo que dices.

## El casino

Cada Campamento sortea un juego de los ocho. Todos se deciden con la semilla de la partida antes de animar nada: recargar a mitad no cambia ni deshace el resultado.

| Juego | Cómo se juega | Retorno al jugador |
|---|---|---|
| Rojo o negro | Ruleta europea de 37 casillas; si aciertas, la siguiente ronda paga un 50 % más y empiezas en racha. El verde apostado y acertado te salta un acto | — |
| Moneda al aire | Cara o cruz; a veces cae de canto y paga ×6 | — |
| Ruleta de premios | Casillas de suministros, reto extra, Atraco, Reloj corto… | — |
| Los tres cubiletes | Sigue el doblón con la vista; acertar paga ×2 | ×2 |
| El duelo de dados | Dos dados cada uno contra Don Crupier; gana el total mayor y paga ×2 (un empate se repite una vez) | ×2 |
| La lluvia de fichas | Plinko de 12 filas, tres niveles de riesgo y 11 columnas de salida; hasta ×95 | 96,09 – 97,00 % |
| El globo | Crash: cobra antes de que reviente; sube hasta ×100 | 97,00 % exacto |
| Rasca y gana | Tarjeta de 3×3 casillas que se rasca con la doblón; tres iguales pagan de ×2 a ×100 | 96,00 % exacto |

Las fichas son de 2, 5 o 10 doblones. Los retornos se comprueban enumerando todas las combinaciones.

## Logros

100 logros agrupados por horas de juego (Primeros pasos, Primera sesión, Unas horas, Jugador habitual, Maestría y Secretos). Cuentan preguntas, dianas, rachas, tarjetas de la Enciclopedia por tipo y por continente, campañas del Clásico, medallas, Reto diario, cada Ascensión y el casino. Cada logro tiene su insignia propia y se envía a Steamworks con su nombre interno (`API name` = id de `js/profile.js`). La exportación para el panel de Steam se genera con `node tools/steam-achievements.mjs` y `python tools/steam_icons.py` (`docs/steam/`).

## Puntuación

- Solo cuentan precisión y rapidez: las reliquias no multiplican los puntos.
- Clásico: `distancia = floor(kmBase − km·kmDist / kf)` · `velocidad = floor((1 − t/(tpq − corte)) · speed)`. `kf` = 1,5 en naturaleza, 1,6 en mares y 1,4 en estrechos (zonas enormes: el mismo error cuenta menos). Cada partida de un nivel son 10 preguntas.
- Aventura: puntos de ronda contra un objetivo que sube con el acto y la Ascensión; los doblones salen de las dianas, de superar rondas y jefes, y del interés (1 por cada 10, con tope).

## Clasificación global

`api/top.js` y `api/submit.js` guardan las tablas en Upstash Redis (base `geolite-clasification`, región `iad1` junto a las funciones de Vercel). Las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` se crean al añadir *Storage → Marketplace → Upstash Redis* y volver a desplegar. Sin ellas el juego usa clasificación local y la pantalla del Reto diario dice “Solo este equipo”. La Clasificación de la portada tiene dos filas: el modo (**Aventura** | **Reto diario**) y su periodo (la Aventura: **Histórico**, **Hoy** y **Ayer**; el Reto diario: **Hoy** y **Ayer**). El podio enseña los 3 primeros y la lista pasa de 5 en 5 con flechas hasta el último; la tabla de la pantalla del Reto diario, de 8 en 8. El servidor solo acepta `adv-all`, `advd-AAAAMMDD`, `daily-AAAAMMDD` y `day-AAAAMMDD` (esta, solo de versiones anteriores).

- **Reto diario** (`daily-AAAAMMDD`, fecha local del jugador; el servidor acepta hoy ±1 día en UTC): el cliente manda `{ board, id, name, tries:[s1, s2, s3] }`. Cada intento se guarda una sola vez (`HSETNX tr:<tablero>:<id>`), así que reenviar no puede subir un intento ya guardado; `lb:<tablero>` ordena por la suma y `tries:<tablero>` guarda el desglose.
- `GET /api/top?board=…&n=8&o=0&me=<id>` devuelve también `count` (jugadores) y `me` (tu puesto aunque no estés en la página); `o` es el puesto desde el que empieza la página.
- **Aventura de hoy y de ayer** (`advd-AAAAMMDD`, fecha local del jugador, caduca a los 40 días): la mejor expedición de la Aventura de cada jugador ese día (`ZADD GT`). Los intentos del Reto diario no cuentan aquí.
- **Aventura** (`adv-all`): la mejor expedición de cada jugador (`ZADD GT`).

**Antitrampas:** la puntuación es de confianza (límites de plausibilidad y de frecuencia). Reproducir cada partida en servidor a partir de la semilla y los clics es el siguiente paso previsto.

## Estructura

- `index.html` + `css/` – interfaz (casino en pixel art nítido; `uikit.css` escala cada pantalla para que nunca haya que desplazarse en escritorio)
- `js/game.js` – núcleo: rondas, marcador, ajustes, escalado · `js/map.js` / `js/map2d.js` – mapa WebGL y de respaldo · `js/geo.js` – geografía y distancias
- `js/adventure.js`, `js/relics.js`, `js/challenges.js`, `js/chfx.js`, `js/jefes.js` – Aventura, reliquias, retos y jefes · `js/casino-*.js` – los juegos del casino · `js/dealer.js`, `js/crupier.js` – el crupier y su guion
- `js/hub.js`, `js/profile.js`, `js/rank.js`, `js/steam.js`, `api/` – menús, perfil y logros, clasificación y Steamworks · `js/codex.js`, `js/wiki.js` – Enciclopedia
- `js/audio.js`, `js/jukebox.js` – efectos sintetizados y la banda sonora (`assets/music/`) · `js/i18n*.js` – textos en 12 idiomas · `js/parche*.js` – notas del parche dentro del juego
- `data/` – mundo, lugares, preguntas, Enciclopedia (`data/wiki/`) · `tools/` – empaquetado y subida a Steam, logros, créditos y fotos · `docs/steam/`, `steam/` – material y guía de Steam
- `fonts/` – Silkscreen, Jersey 15, Pixelify Sans y Fusion Pixel (SIL OFL) más subconjuntos propios para CJK, cirílico y polaco
- Los datos del jugador usan claves `atlasiq.*` en `localStorage` y el código el espacio de nombres `window.AIQ`: son nombres internos estables.

## Créditos

**Diseño, código, arte y banda sonora: Cousins Studios.**

### Arte

Todo el arte de Geolite es pixel art de Cousins Studios. La base está ideada por el estudio y levantada con andamiaje de IA (libro de estilo propio, paleta limitada); el trabajo manual y el pulido son humanos: cada pieza se retoca, se redibuja y se pule a mano hasta quedar a la rejilla nativa del juego.

- **Don Crupier:** retrato maestro pulido a mano; capas, caras, manos, expresiones y gestos animados por capas.
- **Iconos:** insignias de logros (48 px nativos sobre su ficha), iconos del casino, reliquias, herramientas, jefes, retos, barajas, tipos de tarjeta e interfaz.
- **Escenas y tarjetas:** jefes, actos, Campamento, cofre, victoria y derrota, las tarjetas de modo y las mesas de cada juego del casino.
- **Marca:** logo y escudo (la Tierra de la O de GEOLITE con la carta y la ficha), en PNG a escala entera.

### Banda sonora

Creada por Cousins Studios con AKAI; los audios se exportaron e integraron en el motor de audio del juego. 21 canciones (35 min 43 s), con título en los 12 idiomas, que rotan sin repetirse seguidas y se navegan desde Ajustes > Sonido:


| N.º | Título | Title | Estilo | Duración |
|---:|---|---|---|---:|
| 01 | Apuesta segura | Sure Bet | lounge nocturno | 1:30 |
| 02 | Doble o nada | Double or Nothing | ragtime | 1:44 |
| 03 | Ambos marcan | Both Teams to Score | bossa nova | 1:41 |
| 04 | Más de 2,5 goles | Over 2.5 Goals | samba | 1:37 |
| 05 | Todo al rojo | All on Red | blues | 1:48 |
| 06 | Huérfanos | Orphans | vals | 1:45 |
| 07 | All-in | All In | funk | 1:33 |
| 08 | Combinada | Parlay | big band | 1:43 |
| 09 | Sube la apuesta | Raise the Stakes | mambo | 1:40 |
| 10 | Retirar ganancias | Cash Out | lo-fi | 1:45 |
| 11 | Banca al día | Bankroll | reggae | 1:42 |
| 12 | Apuesta en vivo | Live Bet | reggaeton | 1:45 |
| 13 | Pleno al quince | Straight Up | flamenco | 1:48 |
| 14 | Hándicap asiático | Asian Handicap | deep house | 1:35 |
| 15 | Gran apostador | High Roller | funk | 1:44 |
| 16 | Bote acumulado | Progressive Jackpot | house | 1:34 |
| 17 | Ventaja de la casa | House Edge | tecno | 1:46 |
| 18 | Mano caliente | Hot Hand | merengue | 1:47 |
| 19 | Ganador y colocado | Each Way | cha-cha-chá | 1:46 |
| 20 | Empate no vale | Draw No Bet | ranchera | 1:43 |
| 21 | Apuesta máxima | Max Bet | corrido | 1:45 |

Los efectos de sonido del juego se sintetizan en el propio motor de audio (`js/audio.js`).

### Datos, tipografías y licencias

- **Fronteras:** Natural Earth (dominio público) vía `world-atlas` (ISC). **Mares, océanos y lagos** (`data/aguas.js`): polígonos de Natural Earth 10m (dominio público), simplificados. `topojson-client` (ISC).
- **Enciclopedia:** textos de Wikipedia y fotos de Wikimedia Commons (CC BY-SA y dominio público) empaquetados con su atribución por tarjeta; la lista completa de autores y licencias está en `credits.html` y dentro del juego, en Ajustes > Datos > Créditos y licencias.
- **Modo Clásico:** lugares, datos y puntuación propios de Geolite.
- **Tipografías:** Silkscreen, Jersey 15, Pixelify Sans y Fusion Pixel (SIL OFL).
