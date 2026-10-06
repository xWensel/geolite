# Duelo de dados · maqueta jugable (v1)

Juego nuevo para el centro de la Barra de Geolite. **Abrir:** `http://localhost:8081/tools/art/dados/maqueta.html` (config `atlas` de `.claude/launch.json`).
Regenerar el arte: `python build.py` (11 s) · RTP y prueba estadística: `node rtp.cjs`.

## El juego en 5 líneas
1. Tú contra Don Crupier, dos dados cada uno. Ficha 2/5/10 (clic en el precio, como la Moneda). Gana el **total más alto**: cobras **×2**.
2. **Empate**: se repite la tirada **una vez**; si vuelve a empatar, **gana la banca**.
3. La banca tira primero (agita y lanza). Luego tú: **mantén** (clic / Espacio / Enter / A) para agitar el cubilete y **suelta** para lanzar; un toque rápido también vale. Momento y fuerza son solo estética.
4. Todo (las 4 caras y la tirada de desempate) sale de una semilla (mulberry32 + hash) **antes** de animar; la animación solo lo enseña. Recargar a mitad = el crupier se guarda la ficha.
5. Recompensa por niveles 1-2-3 según el margen (sonido, temblor y monedas crecientes y nunca idénticos) y reacciones del crupier por situación.

## Tabla de pagos y RTP exacto (de `rtp.cjs`, enumerando 36×36)
| Suceso | Exacto | % |
|---|---|---|
| Una tirada: gano / pierdo | 575/1296 cada uno | 44,3673 % |
| Una tirada: empato | 146/1296 | 11,2654 % |
| **Partida: ganas** | **829150/1679616** | **49,3655 %** |
| Partida: pierdes (incluye doble empate 1,2691 %) | 850466/1679616 | 50,6345 % |
| **RTP = 2 × P(ganar)** | **1658300/1679616** | **98,731 %** (ventaja de la casa 1,269 %) |

Niveles de recompensa (margen ganado en la tirada que decide): **1** = 1-2 puntos (22,75 % de las partidas) · **2** = 3-5 (20,60 %) · **3** = 6+ (6,01 %).
Reglas alternativas evaluadas (todas en `rtp.cjs`): empate=banca 88,735 % · empate=devolver 100 % · repetir hasta decidir 100 % · repetir 1 vez y 2.º empate=devolver 100 % · **repetir 1 vez y 2.º empate=banca 98,731 % (elegida)** · la elegida pagando ×1,95 → 96,263 %.
Prueba estadística (2 M partidas con semilla): RTP simulado 98,825 % (σ ≈ 0,07 %), chi² de uniformidad de las caras 7,10 < 11,07 → OK.
Que el RTP sea un 1 % más generoso que lo habitual lo compensa que el juego es "a pelo": no hay decisión, solo suspense. Si se quisiera 96-97 %, la única palanca limpia es pagar ×1,95 (no recomendada: números feos).

## Arte (todo trazado en 3D con un trazador de rayos ortográfico y cuantizado a la rejilla nativa)
`rt.py` (rayos, rotaciones) · `dice.py` (dados) · `cupd.py` (cubilete) · `mesa.py` (tapete, baranda, aro, sombras, cenefa, icono) · `build.py` (todo a `out/`).
Cada píxel lanza **un** rayo por su centro (nada de suavizado); el resultado se cuantiza a rampas de 3-4 tonos del juego con tramado de 1 px solo en las aristas y contorno índigo `#1d0a3d` de 1 px (`outline_pp`). Luz arriba-izquierda. Todo se muestra a ×4 entero con `image-rendering: pixelated`.
- **Dados** (36×36 nativos, ×4 = 144): cubo de aristas redondeadas, 3 caras visibles, pips proyectados de verdad (salen elipses al verlos de lado) con un brillo de 1 px. Caras opuestas suman 7 y 1-2-3 giran en sentido antihorario (dado diestro).
  - **Tus dados: marfil con pips rojos** (es el dado del icono `assets/icons/dice.webp`: la carta de la Barra, tu mesa y el resto del juego hablan igual).
  - **Dados de la banca: burdeos con pips de marfil y filete de oro** en las aristas (el cuero y el oro del cubilete de Don Crupier). Así se sabe quién es quién a primera vista, sin mirar la posición.
  - 2 materiales × 3 giros de reposo (−40°, 20°, 36°) × 6 valores × 4 ejes de rodadura (X hacia el espectador, Z de lado, Y peonza, C diagonal) × 16 ángulos de 22,5° = 2304 cuadros en 6 hojas (`dice_{ivory|burg}_{0..2}.png`, ~85 KB cada una). Fila = `(valor−1)·4 + eje`, columna = ángulo; ángulo 0 = reposo con ese valor arriba. 45° (=2 cuadros) en el eje Z deja el dado **de canto**.
- **Cubilete de dados** (60×60 nativos): el mismo cuero burdeos, banda de oro, placa y rombo del cubilete del trile pero **boca arriba**. 24 ángulos (−180…+165°) en **dos capas** (`cup_back` interior y borde lejano; `cup_front` pared y borde cercano): los dados se meten entre ambas. A 180° es, píxel a píxel, el cubilete boca abajo del trile.
- **Mesa**: fieltro **verde azulado profundo** (los otros: verde, azul noche, ciruela, burdeos; nunca se repite) con **baranda acolchada de cuero burdeos** (capitoné con botones de oro y filete), bombillas como las bandas de las ruletas, dos aros de oro grabados (donde caen los dados), medallón VS y cenefa propia de la carta: una **hilera de caras de dado** 1-2-3-4-5-6.
- **Carta de la Barra**: `bet_dados.webp` 48 px ×8 = 384 (el duelo: tu dado marfil delante y el de la banca, burdeos con oro, detrás), fieltro teal y cenefa de dados.
- Guante del crupier: se copia `glove_grab.png` del trile (solo en la presentación "Cubilete volcado" de la banca). **No** se redibuja a Don Crupier (retratos `dealer_*.webp`).

## El carrete de tiradas (10 presentaciones, `PR` en `maqueta.js`)
Sorteo: `reelPick` = sin repetir las 2 últimas y peso `1/(1+vistas)^1,6` (más peso a las menos vistas). **La banca y tú nunca usáis la misma.** Independiente del resultado y de la apuesta (nada depende de lo apostado). Contador "presentación X de N" + selector para forzarla + botón "Probar" por presentación.
1 Clásica (3 botes) · 2 Deslizada (un bote y larga deslizada) · 3 Rebote en la baranda · 4 Los dos chocan · 5 Uno para y el otro tarda · 6 De canto (tambalea y cae) · 7 Desde arriba · 8 Cubilete volcado (estampa, repiqueteo y aparecen a la vez) · 9 Peonza · 10 Rodado.
Posiciones de reposo, giros, número de botes, duraciones y trayectorias llevan jitter propio; la **fuerza** (tiempo mantenido) solo escala la altura de los botes (0,85-1,20).

## Reacciones del crupier (≥ 6 frases ES+EN por situación, cara y gesto del retrato)
Su frase al agitar · te gana · le ganas por poco · le ganas por mucho · empate · segundo empate (gana la banca) · ojos de serpiente · doble seis (tuyo) · él saca 12 · un siete (+ apertura y "tu turno", 3 cada una). Cola de voz: nunca se le corta una frase y cada una sale `1800 + 22·len + 1000` ms. Niveles: 1 = arpegio corto + temblor 5 px · 2 = arpegio largo + 11 px + 1 moneda · 3 = fanfarria + 20 px y un segundo temblor + 3 monedas; tono raíz y dirección del temblor al azar cada vez.

## Capturas revisadas
`capturas/`: `c-barra` (carta), `c-tabla`/`c-carrete` (secciones 3 y 4), `p-*` (una por presentación), `v-*` (volcado de la banca y el tuyo), `r-*` (serpiente, doble seis, empate, doble empate, jackpot, pierde), `f-*` (turno, lanzamiento desde arriba, jackpot), `q-*` (reducir movimiento y EN con el camino real de ratón). Se generan con `tools/art/harness/run.cjs` (config por `GL_CFG`; `window.__dados` expone `phase()`, `force()`, `pres()`, `dpres()`, `setAuto()`, `press()/release()`).

## Decisiones abiertas
- La **mano del jugador** no se dibuja (tu cubilete se mueve solo, como en los dibujos animados); el guante del crupier solo aparece en el volcado de la banca. ¿Un guante propio (no blanco) para ti?
- ¿El dado de canto debería dar algún premio/logro oculto (p. ej. "Equilibrista")? Hoy es solo una presentación.
- ¿Logros ocultos para ojos de serpiente, doble seis y doble empate (1,27 %)?
- Peso de la hoja de dados: ~0,5 MB en total; si molesta, se pueden quitar los giros de reposo 0 y 2 (la mitad) o bajar a 12 ángulos.
- ¿Subir a 16 ángulos/giro más suaves a 60 fps? Ahora cambian cuadro cada ~70 ms al girar rápido.
- Mando: A = mantener/soltar, cruceta = ficha. Sin probar con mando real.
- El juego final usará los 12 idiomas (`es|en|fr|pt|de|it||zh|ko|ja|ru|pl`): ahora ES+EN.

## Trampas
- Si varias sesiones comparten carpeta de capturas, los `cfg*.json` con nombre genérico se pisan: usar una subcarpeta propia.
- `pix.py` define su propio `HERE` (la carpeta del trile): `from pix import *` lo pisa. Aquí la ruta propia se llama `MYDIR`.
- El arnés espera la promesa de `js`: `play()` es `async`; usar `setTimeout(__dados.play,0)` y sondear `__dados.phase()`.

## Implementado en el juego (v0.2.49)
Pasa a `js/casino-dados.js` (+ `js/casino-dados-textos.js`, `css/casino-dados.css`, arte en `assets/dados/`), enganchado al registro `A.adv.casino.add` de `js/adventure.js`.
Decisiones del usuario aplicadas: empate = se repite una vez (2.º empate = banca, RTP 98,731 %), sin mano del jugador, pesos de las presentaciones como estaban, premio x2 con ficha 2/5/10.
Nota del usuario sobre la maqueta: los dados DENTRO del cubilete se movian, se veian feos y sobresalian. Arreglo: dentro del cubilete no se dibujan; salen de la boca ya en vuelo (aparecen en 110 ms, por delante del cubilete) y rebotan en el tapete.
El cubilete se dibuja a x4 exacto (cuadro de 62 px nativos = 248 px; la maqueta lo escalaba a 3,87).
El resultado se decide con la semilla (`run.seed:dados:ronda:intento`), se guarda y se cobra al empezar (recargar a medias no lo deshace) y 12 idiomas. Pruebas: `A.adv._dice` ({ force(res), pres, dpres, auto, slow, st }).
Pendiente (logros ocultos, tras la revision de logros): doble empate (1,27 %); los de casino deben ser todos igual de dificiles, no imposibles.
