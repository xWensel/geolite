# Rasca y gana - maqueta (v1)

Juego nuevo del centro de la Barra (junto a Rojo o negro, Moneda y Ruleta de premios). Se escribe **RASCA**, no "raspa".
Abrir: `http://localhost:8081/tools/art/rasca/maqueta.html` (config `atlas` de `.claude/launch.json`).

## Archivos
- `build.py` (+ `prim.py` primitivas, `syms_a/b/c.py` los 51 simbolos, `card.py` tarjetas/laminas/icono/cursor) -> `out/`. Ejecutar: `python tools/art/rasca/build.py`.
- `rasca-core.js`: el AZAR (UMD, navegador + node). Tabla, `outcome(semilla)`, `evaluate(cuadricula)`, `reelPick`. **Lo usan la maqueta y `rtp.cjs`**: lo verificado es lo jugado.
- `rtp.cjs`: `node tools/art/rasca/rtp.cjs` (~3 s): tabla exacta, enumeracion de las 28.667.520 cuadriculas, 1.000.000 de tarjetas sembradas (chi2), carrete 200.000 sorteos.
- `maqueta.html/css/js`, `capturas/` (revisadas con Read), `out/_sheet_*.png` (hojas de revision x8-x10 del arte).

## El juego
Tarjeta 3x3 (108x146 px nativos, x4). **3 simbolos iguales en cualquier parte = premio segun el simbolo.** Ficha 2/5/10 (clic en el precio, como la Moneda): solo multiplica el premio.
La doblon es el cursor; la lamina es un canvas a resolucion nativa que se rasca **pixel a pixel** (pincel de ~7 px nativos); al rascar el **55 %** de una casilla, el resto de su lamina salta en 4 tandas.
Mando falso probado: stick = mueve, A (mantener) = rasca, Y = rasca todo, X/A en reposo = comprar, LB/RB = ficha. Teclado: flechas/WASD + Espacio (mantener), R/Intro = rasca todo, 1/2/3 = ficha.
"Reducir movimiento": entradas instantaneas, sin temblor ni particulas, la lamina se retira de golpe por casillas (Rasca todo = 1 s).
Si se recarga a mitad de tarjeta, el crupier se guarda la ficha (`rasca_pending` en localStorage).

## Tabla de pagos (probabilidad EXACTA por tarjeta, den. 100.000) y RTP
| Premio | Prob. | Fraccion | Aporta |
|---|---|---|---|
| x100 (3 chisteras) | 0,0800 % | 1/1250 | 8,00 % |
| x25 (3 diamantes) | 0,4000 % | 1/250 | 10,00 % |
| x10 (3 doblones) | 1,2000 % | 3/250 | 12,00 % |
| x5 (3 del simbolo del tema) | 4,0000 % | 1/25 | 20,00 % |
| x3 (2 simbolos, 4,25 % cada uno) | 8,5000 % | 17/200 | 25,50 % |
| x2 (3 simbolos, 3,42 % cada uno) | 10,2500 % | 41/400 | 20,50 % |
| Casi (una pareja) | 28,0000 % | 7/25 | 0 |
| Nada | 47,5700 % | 4757/10000 | 0 |

**RTP exacto = 96.000/100.000 = 96,00 %** (ventaja 4 %; subido desde 95,5 % por decision del usuario: el x2 pasa de 10.000 a 10.250). Acierto 24,43 % (1 de 4,09). Desviacion tipica 3,6 fichas/tarjeta. Medido con 1M de tarjetas: 96,01 %.
El premio xm devuelve m veces la ficha (incluye la apuesta, como la Moneda). Los x100/x25/x10 son siempre chistera/diamante/doblon; los otros 6 simbolos cambian con el tema.

## Fabricacion de la cuadricula (por semilla, ANTES de animar)
`outcome(seed)` = mulberry32(hash("rasca|"+seed)) (igual que `A.rng`). **No recibe ficha, tema, presentacion ni orden de rascado.**
1. Una tirada 0..99.999 elige la clase. 2. **Premio**: 3 casillas iguales + 6 simbolos distintos entre si y del premiado. 3. **Casi**: exactamente UNA pareja + 7 distintos; pareja con pesos 3,3,2,1,1,1,1,1,1 (chistera, diamante, doblon, resto). 4. **Nada**: los 9 distintos.
Regla: veces maxima que se repite un simbolo = 3 premio / 2 casi / 1 nada. Una tarjeta sin premio nunca lleva 3 iguales "por accidente" (enumerado: las 28.667.520 posibles se leen bien).
Tension del crupier: se calcula solo con lo VISIBLE (2 iguales rascadas y alguna casilla sin rascar). El crupier solo reacciona al premio cuando el jugador descubre la tercera.

## Carrete (8 presentaciones; `reelPick`: nunca las 2 ultimas, mas peso a las menos vistas; independiente del resultado)
| # | Tema | Entrada | Orden de "Rasca todo" | Efecto de premio |
|---|---|---|---|---|
| 1 | Tesoro (cobre) | desliza desde abajo | lectura | lluvia de doblones |
| 2 | Mapamundi (plata azulada) | cae con rebote | espiral | chinchetas |
| 3 | Banderas (plata) | llega girando, como carta | serpiente | banderines y confeti |
| 4 | Noche de gala (onix) | se abre el telon | en cruz | focos y serpentinas |
| 5 | Monumentos (arenisca, laton) | sello seco | por columnas | canones de confeti |
| 6 | Faro y mar (perla verde, cobre) | entra a bandazos | del centro afuera | haz del faro |
| 7 | Gemas (oro rosa, platino) | gira como moneda | diagonal | lluvia de gemas |
| 8 | Tiempo (hielo) | aparece con relampago | al azar | tormenta (rayo + lluvia) |
Cada tema cambia marco (metal + cuentas), papel, casillas, lamina (rampa propia con relieve en rejilla 4x4 + banda de brillo + rombo estampado), 6 simbolos y el color ambiente de la pared. Contador "TARJETA X DE 8" + selector para forzar (en las pruebas).
Recompensas por niveles: 1 = x2/x3, 2 = x5/x10, 3 = x25 y x100 (jackpot: 2a oleada, lluvia de CHISTERAS, crupier se desmaya/aplaude). Sonido (4 melodias por nivel, detune al azar), temblor, destello y vibracion de mando crecientes y nunca iguales.

## Crupier (9 situaciones x 6-7 frases ES+EN con cara y gesto)
intro, tension, nada, casi, chico (x2-x3), medio (x5-x10), gordo (x25), jackpot (x100), "Rasca todo". Gestos: tip, shrug, hop, peek (se asoma), sweat (gotas), faint, clap (guantes de `trile/out`). Globo Jersey 27 px, `1800 + 22*len + 1000` ms. Retratos `dealer_*.webp` sin tocar.

## Estetica nueva
Pared de **nogal** (tablones pixel), **mostrador de laton con tapete de MARFIL/hueso** (fieltro de fibras + destellos de cristal con cortes duros) y filo dorado, bombillas `rou-lights` como las ruletas. Carta de la Barra **marfil** con cenefa propia (laminas de plata + rombos de oro, `out/cenefa.png`, 1:1 como la del trile) e icono `bet_rasca.webp` 48 px x8: tarjeta con marco de oro, fila rascada con 3 chisteras y la doblon. Las placas del escenario (premios, controles, HUD) son de nogal con laton: contraste con el marfil.

## Trampas encontradas
- `pix.py` define `HERE` (la carpeta del trile): `from pix import *` lo pisa; `prim.py` lo redefine despues.
- El texto de la tarjeta (titulo y pie) es HTML (12 idiomas); `fitText` mide una vez al montar (nunca por fotograma) con un `<span>` interno: `scrollWidth` de la caja flex siempre vale >= su ancho.
- La lamina se lee con `getImageData`: se carga desde data URI (`out/art.js`) para que tambien funcione desde `file://`.
- Los guantes salen de DETRAS del mostrador (z 2 < mostrador 3): no hace falta recortar.
- El harness a veces cierra con 255 (proceso GPU); repetir.

## Decisiones abiertas
1. Probabilidades: el reparto propuesto (acierto 24,2 %, casi 28 %) es un punto de partida; el casi sube la emocion sin coste en RTP. Se puede subir el RTP a 96 % sin tocar el resto (p. ej. x2 de 10 % a 10,25 %).
2. Texto baked en el arte: NINGUNO (titulo y pie son HTML). En el juego, titulo/pie via L6 y `fitText`.
3. Los x2/x3/x5 con simbolos de tema distintos por tarjeta: el jugador debe leer la tabla de la izquierda (cambia con el tema). Opcion: marcar el simbolo x5 con un marco.
4. Semilla en el juego: `A.rng(runSeed + "|rasca|" + n)`; `outcome(semilla)` ya es compatible. El reto diario podria fijar las tarjetas.
5. Sonido: WebAudio sencillo; en el juego, el motor de `js/audio.js` (rasqueo = ruido filtrado, suena flojito).
6. Falta (no hecho): logros ("Tres chisteras"), la carta real en `campamento`, los textos en 12 idiomas, icono 48 px definitivo revisado con el dueño.

## No probado
Mando real (solo mando falso por `window.__fakePad`), Steam Input, pantalla tactil, ratas de fotogramas en hardware lento (medido en Electron sin ventana: 60 fps, 0 fotogramas > 33 ms durante "Rasca todo" con particulas), vibracion del mando, volumen real del sonido (solo se comprobo que no lanza errores).

## Implementado en el juego (v0.2.52)
Pasa a `js/casino-rasca.js` (+ `js/casino-rasca-textos.js`, `js/casino-rasca-arte.js`, `css/casino-rasca.css`, arte en `assets/rasca/` y `assets/icons/bet_rasca.webp`), enganchado al registro `A.adv.casino.add` de `js/adventure.js`. El sorteo del centro de la Barra (CASINO) pasa a 8 juegos.
- La tarjeta se decide por semilla `A.rng(run.seed:rasca:ronda:intento)` (el reto diario sale igual para todos: "fijas"), la ficha y el premio se pagan al empezar y `run.reds[r] = { id: "rasca", att, stake, grid, cls, mult, cells, rid, pay, done }`. Recargar a mitad no cambia ni deshace nada (la carta de la Barra ensena el resultado). El `outcome` del juego es el de `rasca-core.js` con `A.rng` en lugar de `mulberry(hash("rasca|"+seed))`; verificado con la funcion real: 2.000.000 de tarjetas, 0 cuadriculas invalidas, chi2 8,98 (gl 7), RTP 96,36 % (1,4 sigma).
- Cambios sobre la maqueta (decisiones del usuario): RTP 96 % (x2 a 10.250), el simbolo de x5 va enmarcado en la tabla de premios, icono de la carta pulido (grosor, sombra en el suelo, brillos; `card.bet_icon`), el x100 se queda en 1/1250 (pendiente de la revision de logros: el usuario quiere que los logros de casino sean todos igual de dificiles), sin "Otra tarjeta" (una por visita al Campamento), la ficha se elige en la Barra, sin Volver (la tarjeta ya esta comprada), sin pistas de la presentacion.
- Mando: el cursor del juego (stick izquierdo) mueve la doblon y A MANTENIDO rasca (se lee el boton directamente, respetando "confirmar y atras intercambiados"); el Intro sintetico que manda la A del mando NO cuenta como "Rasca todo" (si el real del teclado); Y (Tab) = Rasca todo. El cursor del sistema del mando se esconde sobre la tarjeta (`html.ra-pad`).
- Sonido por el motor del juego: `A.sfx.rcScratch(velocidad)` (ruido filtrado en bucle, intensidad y tono segun la velocidad; `.idle(now)` y `.stop()`), `A.sfx.rcNoise`, los tonos con `A.sfx.gbTone`, y la recompensa por niveles con `A.sfx.jackpot(nivel)` + `A.core.jpShake` + `A.haptic`.
- Laminas: 8 PNG de 108x146 incrustados como data URI en `js/casino-rasca-arte.js` (generado desde `out/art.js`; hay que poder LEER sus pixeles desde file://). Los simbolos y tarjetas sueltos estan en `assets/rasca/`.
- Textos: 62 frases del crupier x 12 idiomas en 9 situaciones (al comprar, dos iguales, nada, casi, chico, medio, gordo, jackpot, rasca todo) y la interfaz; en espanol RASCA, nunca "raspa".
- Pruebas: `A.adv._rasca` ({ outcome, decide, evaluate, TIERS, REEL, force (clase), reel (id), auto ({ all, delay }), st, get() }). Medido en Electron sin ventana: x100/x25/x10/x5/x3/x2/casi/nada con "Rasca todo", rascado manual con el raton, tension, mando falso, recarga a mitad, reducir movimiento, 1366x768, 10 idiomas sin desbordes y 60 fps sin un solo fotograma perdido con la lluvia de chisteras.
- Pendiente: logro oculto "tres chisteras" (tras la revision de logros, tope de 100 en Steam). El x100 de ficha 10 paga 1000 monedas (1 de cada 1250 tarjetas): una constante (TIERS) si se quiere topar. `out/*.png` y `capturas/` no se suben: `python build.py` regenera `out/`.
