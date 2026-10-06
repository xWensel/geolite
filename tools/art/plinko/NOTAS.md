# Lluvia de fichas (Plinko) - maqueta jugable

Juego nuevo para el centro de la Barra. Maqueta en `tools/art/plinko/maqueta.html` (servidor: `http://localhost:8081/tools/art/plinko/maqueta.html`). Nada de esta carpeta toca el juego.

## El juego en 5 lineas
1. Tablero vertical de 12 filas de clavijas **al tresbolillo** (11 y 10 alternas), tolva de 11 columnas arriba y **11 casillas** con multiplicador abajo, con paredes que rebotan.
2. Eliges **ficha** 2 / 5 / 10 (como la Moneda), **riesgo** (Seguro / Equilibrado / Arriesgado: 3 tablas de pagos) y **columna de salida** (1-11: clic en la tolva, flechas o teclas 1-9/0).
3. La trayectoria sale ANTES de una semilla (12 bits izquierda/derecha, 50/50, rebote en pared); la animacion la sigue exacta. Cada clavija se enciende y suena una nota de una pentatonica que **sube con la caida**: la caida es una melodia; al posarse, acorde.
4. Premio = ficha x multiplicador (la fraccion de moneda se sortea con la misma semilla). Recompensas por niveles 1-2-3 (sonido + temblor + luz crecientes) y reaccion de Don Crupier.
5. Carrete de **11 presentaciones** + 4 decorados del tablero + 11 situaciones de crupier (6 frases ES+EN cada una): nada se repite.

## Geometria y modelo (core.js: lo cargan el navegador y node)
- Posicion `p` en medios carriles (0..20). Fila `r` (0..11): clavijas en `p` con la paridad de `r` (pares: 11 clavijas p=0,2..20; impares: 10 clavijas p=1,3..19). La ficha siempre cae SOBRE una clavija; en ella un bit del generador decide izquierda/derecha. En la pared (p=0 a la izquierda, p=20 a la derecha) rebota hacia dentro (solo ocurre en filas pares).
- Tras 12 filas queda en `p` par: **casilla = p/2**. Las clavijas de la ultima fila son los tabiques entre casillas.
- 4096 caminos equiprobables (1 bit por fila). Distribucion exacta por programacion dinamica (`C.counts`) y comprobada enumerando los 4096 caminos (`C.countsBrute`): coinciden en las 11 columnas.
- Desde la columna `c` solo se alcanzan las casillas a <= 6 de distancia (12 pasos de medio carril): las demas son **imposibles** y salen apagadas en la mesa.
- Por que "tresbolillo con paredes" y no piramide: la piramide pura no tiene paredes ni deja elegir columna. El triangulo se ve en la red de rombos que une las clavijas.

## Tablas de pagos y RTP (rtp.cjs)
`node tools/art/plinko/rtp.cjs` calcula todo y escribe `tablas.js` (lo carga la maqueta) y `tablas.md` (las 33 tablas completas).
- Forma fija por riesgo (alta en los bordes, baja en el centro). Para **cada una de las 11 columnas de salida** el programa busca la escala y el redondeo (multiplos de 0,1 / 0,5 / 1 / 5 segun el tamano) que dejan el **RTP exacto entre 96,00 % y 97,00 %**. Resultado: las **33 tablas son igual de justas**; la columna elige la **varianza** (centro = premios grandes y raros; borde = premios pequenos y frecuentes), no el retorno.
- Premio en monedas = ficha x multiplicador. Si hay fraccion (5 x 0,3 = 1,5) se **sortea con la misma semilla** (la fraccion es la probabilidad de cobrar la moneda de arriba): el retorno esperado es exacto para las fichas 2, 5 y 10 y no hay monedas con decimales. Se probo el redondeo fijo y se **descarto**: desvia el RTP de la ficha 2 y la 5 hasta +-4 puntos.
- Prueba estadistica (1 000 000 de caidas por columna, columnas 1, 4 y 6, con `core.walk` + mulberry32): chi cuadrado dentro de limites y RTP empirico (ficha 5, monedas enteras sorteadas) a +-0,2 puntos del exacto.

### Tablas (casillas 1..11; probabilidades exactas)

#### columna central (6)

| Casilla | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Caminos /4096 | 12 | 67 | 220 | 495 | 792 | 924 | 792 | 495 | 220 | 67 | 12 |
| Prob. % | 0,29 | 1,64 | 5,37 | 12,08 | 19,34 | 22,56 | 19,34 | 12,08 | 5,37 | 1,64 | 0,29 |
| **Seguro** | ×5,2 | ×2,6 | ×1,4 | ×1 | ×0,9 | ×0,5 | ×0,9 | ×1 | ×1,4 | ×2,6 | ×5,2 |
| **Equilibrado** | ×17 | ×4,7 | ×1,8 | ×0,9 | ×0,6 | ×0,3 | ×0,6 | ×0,9 | ×1,8 | ×4,7 | ×17 |
| **Arriesgado** | ×95 | ×4,8 | ×1,3 | ×0,3 | ×0,1 | ×0 | ×0,1 | ×0,3 | ×1,3 | ×4,8 | ×95 |
| RTP exacto | Seguro 96,85 % · Equilibrado 96,40 % · Arriesgado 96,45 % |

#### columna del borde (1)

| Casilla | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Caminos /4096 | 924 | 1584 | 990 | 440 | 132 | 24 | 2 | 0 | 0 | 0 | 0 |
| Prob. % | 22,56 | 38,67 | 24,17 | 10,74 | 3,22 | 0,59 | 0,05 | — | — | — | — |
| **Seguro** | ×1,8 | ×1 | ×0,5 | ×0,4 | ×0,3 | ×0,2 | ×0,3 | ×0,4 | ×0,5 | ×1 | ×1,8 |
| **Equilibrado** | ×2,7 | ×0,7 | ×0,3 | ×0,1 | ×0,1 | ×0,1 | ×0,1 | ×0,1 | ×0,3 | ×0,7 | ×2,7 |
| **Arriesgado** | ×3,8 | ×0,2 | ×0,1 | ×0,1 | ×0 | ×0 | ×0 | ×0,1 | ×0,1 | ×0,2 | ×3,8 |
| RTP exacto | Seguro 96,76 % · Equilibrado 96,69 % · Arriesgado 96,95 % |

#### columna 3

| Casilla | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Caminos /4096 | 495 | 1012 | 990 | 804 | 496 | 220 | 66 | 12 | 1 | 0 | 0 |
| Prob. % | 12,08 | 24,71 | 24,17 | 19,63 | 12,11 | 5,37 | 1,61 | 0,29 | 0,02 | — | — |
| **Seguro** | ×2,6 | ×1,3 | ×0,7 | ×0,5 | ×0,4 | ×0,2 | ×0,4 | ×0,5 | ×0,7 | ×1,3 | ×2,6 |
| **Equilibrado** | ×4,1 | ×1,1 | ×0,5 | ×0,2 | ×0,2 | ×0,1 | ×0,2 | ×0,2 | ×0,5 | ×1,1 | ×4,1 |
| **Arriesgado** | ×7 | ×0,3 | ×0,1 | ×0,1 | ×0 | ×0 | ×0 | ×0,1 | ×0,1 | ×0,3 | ×7 |
| RTP exacto | Seguro 97,00 % · Equilibrado 96,09 % · Arriesgado 96,42 % |

#### RTP exacto de las 33 tablas (%)

| | col 1 | col 2 | col 3 | col 4 | col 5 | col 6 | col 7 | col 8 | col 9 | col 10 | col 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Seguro | 96,76 | 96,74 | 97,00 | 96,81 | 96,75 | 96,85 | 96,75 | 96,81 | 97,00 | 96,74 | 96,76 |
| Equilibrado | 96,69 | 96,64 | 96,09 | 96,80 | 96,34 | 96,40 | 96,34 | 96,80 | 96,09 | 96,64 | 96,69 |
| Arriesgado | 96,95 | 96,25 | 96,42 | 96,57 | 96,42 | 96,45 | 96,42 | 96,57 | 96,42 | 96,25 | 96,95 |

#### Resumen por nivel (columna central / columna del borde)

| Nivel | Máximo | Cobras ≥×1 | ×0 | Desv. típica |
|---|---|---|---|---|
| Seguro | ×5.2 / ×1.8 | 38,77 % / 61,23 % | 0,00 % / 0,00 % | 0.51 / 0.51 |
| Equilibrado | ×17 / ×2.7 | 14,60 % / 22,56 % | 0,00 % / 0,00 % | 1.48 / 0.96 |
| Arriesgado | ×95 / ×3.8 | 14,60 % / 22,56 % | 22,56 % / 3,86 % | 7.27 / 1.53 |


Las casillas "—" (0 caminos) son imposibles desde esa columna. Todas las tablas: `tablas.md`.

## Sin trucos
- Semilla por ficha (`crypto.getRandomValues`) -> `C.walk` -> casilla -> premio, todo antes de animar. En el juego: `A.rng(seed)` (mulberry32 + hash), uniforme.
- Presentaciones, decorados, destellos falsos, camara lenta, fichas fantasma, ola de luces, pausas en equilibrio... salen de un azar **aparte** (`Math.random`) y no dependen de la casilla, de la ficha, del riesgo ni de la columna. La camara lenta cubre SIEMPRE las filas 9-12 (no delata nada). Los destellos falsos se sortean entre las 11 casillas por igual.
- Si se recarga a mitad (`plk_pending` en localStorage), la ficha cuenta como perdida y el crupier "se la guarda".
- Para pruebas hay un selector de **casilla forzada** (busca una semilla que caiga ahi) y de presentacion/decorado; en el juego no existen.

## El carrete (11 presentaciones; `reelPick`: sin repetir las 2 ultimas, mas peso a las menos vistas; contador "presentacion X de 11" y selector para forzarlas)
1. **Caida limpia** (referencia). 2. **En equilibrio**: se queda quieta sobre una clavija (fila 4-9 al azar), tiembla 0,75-1,25 s y se decide. 3. **Doble salto**: 1-2 veces salta dos filas de golpe rozando la clavija intermedia. 4. **Carambola**: sale en alto hasta la pared lateral y vuelve. 5. **Lanzada con giro**: el crupier la lanza al aire (la doblon de verdad, `coin_spin.webp`, 24 fotogramas) y cae por la tolva; la ficha pequena tambien gira (12 fotogramas). 6. **Camara lenta** en las ultimas filas, con vineta. 7. **Lluvia de fichas**: 8-11 fichas fantasma (azuladas, translucidas) caen por su cuenta. 8. **Falsos destellos**: 3-5 casillas se encienden antes de tiempo. 9. **Pasillo de luces**: una ola de luz recorre las clavijas antes de soltar. 10. **Ficha pesada**: golpes secos, tablero que vibra el doble. 11. **Ficha ligera**: rebotes altos y flotantes.
- **Decorados** (otro carrete aparte, 4): *Petroleo y oro* (la mesa nueva), *Noche con luces* (indigo, neon, marco de acero), *Marmol y oro* (losas con vetas y juntas de oro), *Rubi* (facetas de joya). Cambian fondo, textura, clavijas (oro / plata / bronce / rosa), bombillas y halos.
- Siempre: estela de luz (puntos que se encogen), sombra dura de la ficha, aro de luz en la clavija golpeada, temblor del tablero **creciente en las 3 ultimas filas**, pared que destella al rebotar (con "tin").

## Reacciones del crupier (11 situaciones x 6 frases x ES/EN, con cara y gesto)
`drop` (al soltar), `fall` (durante la caida, 40 %), `zero` (x0), `low` (<x1), `ok` (x1 a <x5), `big` (>=x5), `max` (el maximo de la tabla), `near` (la casilla de al lado del maximo), `center` (3 seguidas en las casillas centrales), `slump` (3 sin recuperar la ficha), `edge` (columna del borde). Caras: neutral / laugh / angry / shock; gestos (CSS sobre el retrato, nunca se redibuja): nod, tilt, jump, shiver, lean. Globo en Jersey 27 px, `1800 + 22*len + 1000` ms, y **nunca se le corta** (cola). Frases en `maqueta.js` (`T.es.say`, `T.en.say`); la seccion 4 de la maqueta las lista todas.
- Recompensas: **nivel 1** (>=x1): acorde corto, temblor leve, destello de la casilla. **Nivel 2** (>=x5): arpegio + brillo, temblor medio, lavado de luz, lluvia dorada. **Nivel 3** (>=x25): fanfarria + golpe grave, temblor largo, lavado rosa, lluvia de 26 fichas, vibracion. Tres variantes de sonido que no se repiten dos veces seguidas.

## Mesa y arte (todo pixel art, `python build.py` -> out/)
- **Fondo nuevo: petroleo profundo con filo de oro.** No repite el verde de Rojo o negro, el azul noche de la Moneda, el ciruela de la Ruleta ni el burdeos del Trile; el oro y las bombillas calidas resaltan sobre el petroleo. Paneles biselados, red de rombos que une las clavijas, marco de oro con ranura de bombillas (las de las bandas de las ruletas, `rou-lights`, tambien en vertical).
- Carta de la Barra: fieltro petroleo (`radial-gradient #12909e -> #07323d`), **cenefa propia** (`out/cenefa.png`, 16x10: dos clavijas de oro en zigzag con la estela de la ficha) e **icono 48 px** (`out/bet_plinko.png` / `.webp` 384x384 sin perdida: triangulo de 6 clavijas, la ficha recien rebotada con su estela y 4 casillas de colores).
- Piezas: `parts.py` (ficha de 10 px con cara A = sombrero del crupier y cara B = brujula, 12 fotogramas de giro con canto de cordoncillo; clavijas de 3 estados; aros de luz; estela; flecha de tolva), `board.py` (tablero 214x220 nativos x4 = 856x880 para cada decorado), `icon.py`. Contorno indigo 1 px, rampas de 3-4 tonos, luz arriba-izquierda, escala x4 entera y posiciones en multiplos de 4.
- La ficha es la doblon a escala pequena **dibujada en rejilla nativa** (no se reduce coin_flat); la grande (`coin_spin.webp`) solo se usa en la presentacion "Lanzada con giro".

## Rendimiento (fluidez)
- Por fotograma solo `transform`/`opacity` (ficha, 9 puntos de estela, halos, temblor del tablero); las clavijas se encienden con la Web Animations API (sin leer layout). `rAF` medido en el arnes: mediana 16,7 ms, maximo 16,8 ms durante una caida completa.
- Trampa pisada: un `filter: drop-shadow(... 40px)` sobre el tablero entero (subarbol animado) hundia el arnes; la sombra del tablero es ahora un `box-shadow` estatico detras. La sombra de la ficha es un `drop-shadow` duro de 48 px (barato).
- El arnes con ventana oculta retrasa sus propios temporizadores (la pagina va a 60 fps pero las capturas salen tarde): para capturar a mitad de caida hay `__plk.ST.pauseRow/pauseAt` (pausa determinista) y `__plk.ST.hold` (mantiene el resultado en pantalla).

## Decisiones abiertas
1. **Columna y riesgo**: hoy la columna reescala la tabla (RTP igual en las 33). Consecuencia: "Arriesgado" desde el borde es poco arriesgado (max x3,8). Alternativas: (a) dejarlo asi (la columna = segundo dial de varianza), (b) bloquear columnas del borde, (c) que el riesgo mande y la columna solo desplace la distribucion con una tabla fija (RTP distinto por columna: no cumple 96-97 % en todas).
2. **Fraccion de moneda sorteada** (5 x 0,3 = 1,5 -> 1 o 2 monedas): exacto, pero la misma casilla puede dar +1 o +2; alternativa: monedas con decimal.
3. 12 filas / 11 casillas: con 10 filas el borde casi no se alcanza desde el centro; 12 es el minimo comodo. Se puede probar 14 filas / 13 casillas.
4. El decorado cambia con cada ficha (carrete). Se puede dejar fijo en Petroleo y que los otros sean compra/logro.
5. Logro oculto para la casilla maxima y para "3 en la esquina"; contador de presentaciones vistas como coleccionable.
6. Crupier: aqui gestos CSS sobre el retrato; en el juego se usaria el rig animado (`js/crupier.js`: 48 gestos).

## No probado
Mando (cursor pointer ya puesto en todo lo pulsable; falta mapear la cruceta a columna y A a soltar), Steam Deck / pantalla tactil, los otros 10 idiomas, el motor de audio real (`js/audio.js`; aqui WebAudio sencillo y no se ha podido escuchar), reduccion de movimiento mas alla de una pasada visual, y el rendimiento en una GPU modesta fuera del arnes.

## Archivos
`core.js` (semilla, camino, distribucion) - `rtp.cjs` (tablas y pruebas) -> `tablas.js`, `tablas.md` - `parts.py`, `board.py`, `icon.py`, `build.py` -> `out/` - `maqueta.html/css/js` - `capturas/` (revisadas con el arnes `tools/art/harness/run.cjs`).

## Implementado en el juego (v0.2.50)
Pasa a `js/casino-plinko.js` (+ `js/casino-plinko-textos.js`, `js/casino-plinko-tablas.js` = tablas.js generado, `css/casino-plinko.css`, arte en `assets/plinko/`), enganchado al registro `A.adv.casino.add` de `js/adventure.js` (ver casino-registro-juegos).
Decisiones del usuario aplicadas: riesgo = dejarlo (la columna reescala la tabla, RTP 96-97 % en las 33), fraccion de moneda = sorteo con la misma semilla, tablero de 12 filas, decorado = carrete (4, sorteo vivo), crupier = el rig animado (A.crupier.mount, fuera del escenario escalado y a pixel entero con A.crupier.snap).
Nota del usuario: "no se ilumina la casilla de la derecha". Causa en la maqueta: las capas `.pl-layer` (pegs, slots, fx) cubren la tolva y se comian los clics y el hover de TODAS las columnas (elementFromPoint devolvia la capa). Ahora `.pk-layer { pointer-events: none }` y la tolva responde y marca (flecha) la columna elegida y la del raton; la flecha pasa a 36x28 (x4 exacto, antes 28x20).
La ficha se paga y se cobra al SOLTAR (Esc o Volver antes no cuestan nada); el registro se guarda ANTES de animar (recargar a medias no lo deshace). El historial de las ultimas 9 caidas vive en el perfil (adv.plkHist) para las frases de "tres al centro" y "tres sin premio".
Pendiente (logros ocultos, tras la revision de logros): la casilla maxima (1 de cada 171 con Arriesgado desde el centro).
Aviso de economia: con Arriesgado desde el centro y la ficha 10, el maximo (x95) paga ~950 monedas, mucho mas que cualquier otra cosa del Campamento (probabilidad 1/171 por caida; retorno esperado igual que el resto). Si se quiere, un tope por caida es un cambio de una linea en decide().
