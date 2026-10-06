# El globo (maqueta) · notas de diseño

Juego de *crash* para el centro de la Barra. Un globo aerostático sube sobre el mapa de la Tierra; el multiplicador sube con él y hay que **COBRAR** antes de que reviente.
Abrir `maqueta.html` (servidor `atlas`: `http://localhost:8081/tools/art/globo/maqueta.html`). Regenerar el arte: `python build.py`. Probabilidades: `node rtp.cjs` (escribe `rtp-data.js`).

## Archivos
- `build.py` (+ `balloon.py`, `props.py`, `world.py`) → `out/*.png`. Importa `pix.py` de `../trile` (no se toca nada fuera de esta carpeta).
- `crash.js`: el punto de reventón y el pago, **el mismo código** en la maqueta y en `rtp.cjs`. `rtp.cjs`: tablas exactas (BigInt) + prueba estadística de 4 M vuelos.
- `texts.js` (ES/EN, carrete y reacciones), `maqueta.html/css/js`, `capturas/` (capturas revisadas).

## Reglas del juego
1. Ficha 2/5/10 (clic en el precio, igual que la Moneda; teclas/clic en la pastilla). Opcional **AUTO**: cobra solo al llegar a ×1,5 / 2 / 3 / 5 / 10.
2. Cuenta atrás 3-2-1 (quemador, pitidos), despegue. El multiplicador es `exp(0,135·t)`: ×2 a 5,1 s, ×10 a 17 s, ×100 a 34 s (cada vez más rápido en pantalla: el scroll acelera `34 + 1,3·t` px/s).
3. **COBRAR** (clic, Espacio, Enter; con mando, A): cobras `payout(ficha, ×)`. Tu globo se retira a salvo y un **fantasma** translúcido sigue subiendo hasta reventar («habrías llegado a ×N»).
4. Si el globo llega a ×100 (techo) sale al espacio y se cobra solo a ×100.
5. Reventón: el multiplicador se congela y COBRAR se bloquea **en el mismo fotograma**; después, la presentación del reventón.
6. Si se recarga la página a mitad, cuenta como perdido (en la maqueta no hay persistencia; en el juego, el crupier se guarda la ficha).

## Matemática (todo decidido ANTES de animar, `crash.js`)
- Semilla → `u ∈ (0,1]` → `X = clamp(floor(970/u), 1000, 100000)` (milésimas; ×1,000 … ×100,000). Segundo número de la misma semilla: umbral de redondeo `r`.
- **P(el globo llega a ×x) = 0,97/x** para x entre ×1,001 y ×100, exacto en la rejilla de 0,001. Cobrar a cualquier ×fijo (o con AUTO) da **RTP = 97,0000 % exacto** y ninguna regla de parada sin visión del futuro lo mejora.
- ×1,000 (revienta al despegar, imposible cobrar): 1 − 0,97/1,001 = **3,0969 %** (1 de cada 32,3). Cobro mínimo posible ×1,001. (Con rejilla de 0,01 sería 3,96 %; por eso 0,001.)
- **Tope ×100**: P(llegar) = 0,97 % (1 de cada 103,1); cobra ficha·100 (ficha 10 = 1000). **No cambia el RTP** (P(X ≥ x)=0,97/x ya vale hasta 100 y el techo cobra ×100); sin tope E[X] sería infinita y el premio máximo no tendría límite. Con tope: E[X] = ×5,467, mediana ×1,94, σ de cobrar a ×100 = 9,8 fichas/vuelo.
- **Pago entero**: la moneda es entera. Redondear «hacia abajo» da RTP 65–97 % según ×/ficha, «al más cercano» llega a **116 %** (ficha 2, ×1,25: ventaja del jugador); por eso el **redondeo sembrado**: `floor(ficha·×) + [frac(ficha·×) > r]` con `r` sorteado con el reventón. Entero siempre, COBRAR enseña lo que cobrarías *ahora* y la esperanza es exacta (97,0000 % para todo ×).
- Tabla (P llegar / 1 de cada / RTP al cobrar ahí): ×1,001 96,903 % / 1,03; ×1,10 88,18 % / 1,13; ×1,25 77,60 % / 1,29; ×1,5 64,67 % / 1,55; ×2 48,50 % / 2,06; ×3 32,33 % / 3,09; ×5 19,40 % / 5,15; ×10 9,70 % / 10,3; ×25 3,88 % / 25,8; ×50 1,94 % / 51,5; ×100 0,970 % / 103,1. RTP = 97,0000 % en todas.
- Prueba (4 M vuelos con `draw()` real): χ² del reventón 7,26 (9 g.l., crítico 16,92), χ² de `r` 12,18, corr(ln X, r) = −0,0001; RTP medido a ×1,1/1,5/2/5/10/100 = 97,007 / 96,980 / 96,967 / 96,967 / 97,066 / 96,425 % (|z| ≤ 1,17).

## SIN PISTAS
- Las **falsas alarmas** (pájaro que roza, rayo lejano, granizo suelto, meteoro, tos del quemador, crujido, siseo, OVNI de paso) salen por un proceso de Poisson (≈ 1 cada 4,5 s, mínimo 1,2 s entre ellas) **independiente de X**; el 45 % usa el aviso rápido (0,16-0,26 s), igual que los reales.
- El aviso de un reventón real dura ≤ 0,14 s (menos que un tiempo de reacción humano) y el multiplicador se congela en el instante del contacto. Rayo, costura, fuga y quemador no avisan nada.
- Ni el decorado, ni el globo, ni los eventos de ambiente, ni el ritmo de los pitidos (solo depende del ×) revelan nada. El historial de reventones solo se actualiza al terminar el vuelo.
- Las caras del crupier y sus frases durante el vuelo son azar libre.

## Arte (estilo logros: rejilla nativa, rampas de 4 tonos, tramado de 1 px, contorno índigo de 1 px, luz arriba-izquierda)
- Globo 78×88 px con gajos que convergen, cinturón curvo, falda y el rombo de oro del crupier; **8 libreas** (Don Crupier, Cielo, Arcoíris, Esmeralda, Ciruela, Atardecer, Medianoche, Caramelo). Cesta de mimbre, quemador y llama (4 fotogramas) con resplandor que se nota más de noche. El crupier que asoma son **los píxeles de `dealer_mini.webp`** del juego (rejilla 36×36, sin redibujar): cara neutra/risa, se agacha al reventar y su sombrero sale volando.
- **Escena a 640×360 px nativos, mostrada ×3** (1920×1080), no ×4: con ×4 el mapa (480×270) pierde los continentes y el crupier del juego (36 px) no cabe en una cesta. Todo entero, `image-rendering: pixelated`; el escenario de 1920×1080 se escala con `transform`.
- **Mapa**: tierra real (Natural Earth, `tools/pxkit.land_mask`) a 5,33 px/grado en 3 ventanas de 120° apiladas de polo a polo (hielo con hielo en las costuras: el vuelo al norte las recorre en anillo y empieza en una latitud al azar). Mar con plataforma clara y fondo con manchas, biomas (desierto, selva, sabana, taiga, tundra, nieve), ~28 cordilleras reales (Andes, Alpes, Himalaya, Rocosas…) con sombra y paralaje propio, luces de ciudades que se encienden de noche.
- **Cielo**: una sola línea de tiempo (amanecer → día → atardecer → crepúsculo → noche con estrellas) con degradado tramado (Bayer 4×4); cada vuelo la recorre a su ritmo y la altura la avanza. El horizonte se curva con la altura (R de 24000 → 1050 px), con halo de atmósfera. Nubes en 3 capas con paralaje (las cercanas pasan por delante del globo); desaparecen por encima del tiempo. Aurora, luna llena, sol, tormenta (lluvia + rayos de fondo), niebla.
- **Carta de la Barra**: cielo de crepúsculo vertical (azul noche → violeta → rosa → naranja de horizonte; no repite verde, azul noche, ciruela ni burdeos), cenefa de **toldo de gajos rojos y crema** arriba y **nubes** abajo (`out/cenefa_*.png`), icono 48 px → 384 px (`out/bet_globo.webp`). Marco del cuadro con bombillas: `.rou-lights` del juego arriba/abajo y laterales propios.

## El carrete (mira `capturas/08-carrete.png`)
Cuatro carretes independientes con el mismo sorteo (sin repetir los 2 últimos, peso `1/(1+vistos)^1,6`) + falsas alarmas al azar + 2 eventos de ambiente por vuelo. Selectores de prueba para forzarlos y contadores en vivo. **10 vuelos** (cielo; la pastilla pone «VUELO X DE 10»): Mediodía despejado, Amanecer, Atardecer dorado, Hora azul, Tormenta, Aurora boreal, Luna llena, Niebla de montaña, Cielo de cúmulos, Crepúsculo violeta. **8 reventones**: pinchazo de pájaro, rayo, granizo, meteorito, costura abierta, fuga lenta, se apaga el quemador, abducción OVNI. **8 falsas alarmas** (las mismas piezas sin consecuencias). **6 eventos de ambiente**: bandada, avión con estela, otros globos, OVNI, zepelín, lluvia de meteoros. **8 libreas**. 10×8×6×8 = 3840 combinaciones.

## Dopamina
Tono continuo que sube con el ×, pitidos de tensión (dependen solo del ×), temblor de cámara continuo desde ~×8 que crece con la altura, viñeta que late, bombillas rápidas al despegar y al cobrar alto. Cobro: <×1,5 (tintineo), nivel 1 ×1,5–3, nivel 2 ×3–10, nivel 3 >×10: acorde, graves, barrido de ruido, lavado dorado, temblor (3/6/12/22 px) y lluvia de monedas (4/14/34/80); tonos y signos del temblor con azar.

## Crupier (14 situaciones × 6 frases ES + 6 EN, cada una con cara y gesto; globo siempre 1 s más en pantalla)
Despegue · charla en vuelo (azar) · cobro <×1,5 · ×1,5–3 · ×3–10 · >×10 · cobro automático · techo ×100 · revienta sin cobrar · revienta a ×1,00 · revienta >×10 sin cobrar · cobro justo antes de reventar (<0,6 s) · el fantasma llega ≥3× lo cobrado (y ≥×5) · el fantasma revienta enseguida (≤×1,25 lo cobrado). Gestos CSS: nod, hop, shake, lean, zoom, bounce.

## Decisiones abiertas
1. ¿RTP 97 %? (la política del proyecto pide 95-98 %). ¿Techo ×100 (1000 monedas con ficha 10) o más bajo (×50)? Se puede bajar sin tocar el RTP.
2. Velocidad `R = 0,135`: un vuelo largo (×100) dura 34 s; si se quiere más ágil, subir R (el RTP no cambia).
3. Escena a ×3 en vez de ×4 (justificada arriba).
4. ¿Mostrar el nombre del vuelo («Atardecer dorado»)? No revela nada, pero es ruido; quitarlo es una línea.
5. Perks/Ascensión: ¿afectan a este juego? (propuesta: no; apuesta limpia).
6. Textos de los 12 idiomas, sonido final con `js/audio.js` y logros (p. ej. «a ×100», «revienta al despegar», «cobra a ×1,001») pendientes.

## Sin probar
Mando real (la maqueta solo hace clic/Espacio/Enter; los botones tienen `cursor: pointer`), audio (el arnés de Electron lo cuelga; probado a ojo por el código, sin escuchar), Chrome/Firefox reales a 60 fps (en el arnés el render del canvas cuesta ≈ 0,4 ms por fotograma), pantalla completa, «reducir movimiento» (anula temblor, lavados y gestos), Steam Deck/Proton. El arnés de capturas retrasa cada captura varios segundos con la escena en marcha: las capturas se toman «cerca» del instante pedido; no se pudo capturar la cuenta atrás.

## Implementado en el juego (v0.2.51)
Pasa a `js/casino-globo.js` (+ `js/casino-globo-textos.js`, `css/casino-globo.css`, arte en `assets/globo/`), enganchado al registro `A.adv.casino.add` de `js/adventure.js` (ver casino-registro-juegos). `js/casino-globo.js` se ENSAMBLA: la escena (cielo, mapa, nubes, globo, reventones, falsas alarmas, ambiente y sintetizadores) es el codigo de `maqueta.js` tal cual; lo escrito a mano es el flujo, el cobro sembrado, el HUD, el crupier y el sonido por el motor del juego.
Decisiones del usuario aplicadas: techo x100 (se cobra solo; 0,97 %, ~1 de cada 103), velocidad "mas agil" (R = 0,23 en vez de 0,135: ~20 s hasta x100; el desplazamiento del mapa se escala con R/0,135 para que la altura a cada multiplicador no cambie), escena a x3 (en el juego, a un factor ENTERO n del canvas de 640x360: x3 en 1920x1080, x2 en 1366x768...), nombre del vuelo oculto, sin perks (apuesta limpia), logro oculto futuro = el techo.
Cambios sobre la maqueta: la ficha se paga al DESPEGAR y el punto de reventon se guarda ya (`run.reds[r] = { id: "globo", att, stake, X, cashM, pay, done }`); cobrar se cobra en el acto (recargar despues no lo deshace); recargar a media vuelo = reventon; Volver / Esc antes de despegar no cuestan nada; despues de cobrar, tocar la pantalla se salta el resto del vuelo; el historial de reventones (ultimos 7) vive en el perfil (adv.gbHist); el crupier es el rig animado (A.crupier.mount, fuera del escenario escalado); el temblor respeta Vibracion y los lavados Destellos suaves; los sonidos salen por `A.sfx.gbTone / gbNoise / gbEngine` (volumen y mute del juego).
Bug del motor de audio arreglado de paso: `noise()` con una duracion >= 1,8 s daba un offset negativo y lanzaba una excepcion (la fuga lenta, 1,8 s, la tiraba y paraba el reventon).
Verificado con las funciones reales: 3 M de vuelos, reventon a x1,00 3,097 % (exacto 3,097), techo 0,967 % (exacto 0,970), RTP cobrando a x1,1 / x1,5 / x2 / x5 / x10 / x100 = 97,00 / 96,96 / 96,94 / 96,95 / 97,05 / 96,75 %.
Aviso de economia: ficha 10 y techo x100 pagan 1000 monedas (1 de cada 103 vuelos si no se cobra antes; retorno esperado igual que en el resto). Un tope mas bajo (x50) no cambia el retorno y es una constante (CAP).
Pendiente: logro oculto del techo (tras la revision de logros, tope de 100 en Steam). Las imagenes de `out/` y `capturas/` no se suben (assets/globo tiene las que usa el juego): `python build.py` regenera `out/`.
