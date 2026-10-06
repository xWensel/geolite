# Maquetas premium de juegos de casino para Geolite

Geolite es un juego de geografía roguelike con estética **casino pixel art (estilo Balatro)**. Los **juegos del centro de la Barra** del Campamento
(Rojo o negro, Moneda al aire, Ruleta de premios, Los tres cubiletes) son apuestas rápidas con la doblón del juego. Cada juego nuevo se hace primero como
**MAQUETA JUGABLE con arte real** para que el dueño la apruebe; después se implementa en el juego.

**Referencia obligatoria: `tools/art/trile/`** (la maqueta de Los tres cubiletes, ya aprobada). Léela entera antes de empezar y iguala su acabado:
`pix.py` (utilidades y paleta), `cup.py`, `glove.py`, `extras.py` (cómo se dibuja el arte), `maqueta.html/css/js` (estructura, motor, sonido, cartas de la Barra),
`out/` (sprites). Mira sus capturas en el scratchpad de tu sesión generando las tuyas con el arnés (abajo).

## Estilo (innegociable)
- **Pixel art nítido**, nada de vectores, degradados suaves ni escalado fraccionario de sprites. Método de los iconos de la Barra: máscaras + rampas de 3-4 tonos
  sobre la rejilla nativa, tramado a 1 px, **contorno índigo `#1d0a3d` de 1 px por fuera** (`pix.Canvas.finish()` usa `grid.outline_pp`). Luz arriba-izquierda.
- **Paleta del juego** (muestreada del arte aprobado, en `pix.py`): oro `GOLD` (fff6c8 ffd95a fcc440 f5a623 de881e c46a1b a05018 7f3a1a), rojo `RED` (ff6470 e8283a a8142e 6e1030),
  blanco/lavanda `WHITE`, azul marino `NAVY`, ciruela `PLUM`; añade tonos nuevos solo si hace falta y coherentes. Mira `assets/icons/bet_*.webp`, `dealer_*.webp`, `coin_spin.webp`.
- Sprites a **1x** en PNG (`out/`), mostrados con `image-rendering: pixelated` a **escala entera ×4**. Colocar con enteros. El ESCENARIO entero (1920×1080) sí se escala con `transform: scale()`.
- Todo lo nuevo es "super premium, estilo logros": **nada provisional, plano ni genérico**. Los iconos de la carta de la Barra son rejilla de **48 px ×8 = 384 px** WebP sin pérdida
  (ver `extras.py::bet_cups_icon`). **Sin adornos de destellos/estrellitas, sin índices de carta (A K Q J).**
- Tipografías y colores: el CSS del juego (`css/style.css skins.css uikit.css campamento.css`, tokens `--serif` Jersey 15 y `--mono` Silkscreen). `<html data-skin="casino">`.
  Cartel de resultado, pastilla "APUESTA" y globo del crupier: copia de `trile/maqueta.css` (globo en Jersey 27 px y **siempre 1 s más en pantalla**: `1800 + 22·len + LINGER` ms).
- **Don Crupier**: retratos `assets/icons/dealer_{neutral,laugh,angry,shock}.webp` (64 px lógicos ×8). NUNCA redibujarlo. Sus guantes flotantes: `trile/out/glove_grab.png`, `glove_open.png`.
  Habla con ironía, rompe la cuarta pared, es un trilero con encanto. Cada situación con **≥ 6 frases distintas** (ES y EN en la maqueta; el juego final usa 12 idiomas con el formato `es|en|fr|pt|de|it||zh|ko|ja|ru|pl`).

## Filosofía de cada juego (obligatoria)
1. **Premium** de verdad: "juice" (sonido sintetizado con tono creciente, temblor de pantalla, lavados de luz, redobles, parones dramáticos). Recompensas por niveles 1-2-3
   que crecen (sonido + temblor, nunca idénticos dos veces). Todo respeta "reducir movimiento".
2. **Casino de verdad en las probabilidades**: tabla de pagos explícita, probabilidades EXACTAS (calcúlalas con un script de node/python que enumere o haga programación dinámica;
   guárdalo en tu carpeta como `rtp.cjs`) y **retorno (RTP) ≈ 95-98 %** (ventaja de la casa pequeña y honesta; el juego es algo generoso). Muestra la tabla y el RTP en la maqueta.
   **Sin trucos**: el resultado se decide ANTES de animar con un generador sembrado (en el juego, `A.rng(seed)` = mulberry32 + hash, uniforme); la animación solo lo ENSEÑA.
   Nada del aspecto puede depender de lo apostado ni del resultado salvo lo declarado (sería una pista). Los "casi" y los falsos finales deben ser independientes del resultado
   (los falsos finales caen en cualquier lugar, del mismo o de otro resultado). Verifica la uniformidad con una prueba estadística corta en node.
3. **NADA repetitivo**: un **CARRETE** de presentaciones (como en las ruletas: 7 finales sorteados sin repetir los 2 últimos, con más peso a los menos vistos; mira `reelPick`/`ROU_REEL` en
   `js/adventure.js`) + un surtido grande de **reacciones del crupier** (frases, cara, gesto) por situación + variación visual (escenarios, tiradas, cadencias, direcciones, fondos).
   Debe VERSE en la maqueta: un contador "presentación X de N" y un selector para forzarla. "Infinidad de maneras de definirse".
4. **Mando y teclado**: lo pulsable lleva `cursor: pointer` (el sistema de mando del juego recorre lo que tenga cursor pointer y copia los `:hover`); teclas numéricas / Espacio / Enter.
5. **Fluidez**: por fotograma solo `transform`/`opacity`; nada de leer el layout (`offsetWidth`, `getBoundingClientRect`) en el bucle de animación; nada de `ctx.font`/`getComputedStyle` por fotograma.

## Cómo montar la maqueta
- Carpeta **`tools/art/<juego>/`**. NO toques nada fuera de ella (ni `js/`, `css/`, `assets/`, ni `tools/art/trile/`; puedes importar `pix.py` con
  `sys.path.insert(0, "../trile")`). **Nada de commits.**
- Estructura: `build.py` (+ módulos de dibujo) → `out/*.png`; `maqueta.html`, `maqueta.css`, `maqueta.js`; `rtp.cjs`; `NOTAS.md` (diseño, reglas, tabla, carrete, decisiones abiertas).
- Escenario fijo **1920×1080** escalado a su contenedor; **ids con prefijo propio** (el CSS del juego ya usa `#hud #dealer #bubble #stage #wrap #hint #res #band...`: en el trile el HUD
  salió arriba por eso). Enlaza `../../../css/{style,skins,uikit,campamento}.css`.
- La maqueta incluye: (1) **la carta en la Barra** junto a las 3 existentes (patrón `cards()` de `trile/maqueta.js`, CSS real; cada juego con su propio fieltro y su **cenefa**),
  (2) **la mesa jugable completa** (apuesta con ficha 2/5/10 como la Moneda, juego, revelación, resultado; ES/EN, reducir movimiento, sonido), (3) una sección con la
  **tabla de pagos y el RTP exacto** y el listado del **carrete de presentaciones y de reacciones**, (4) botones de prueba (forzar una presentación, forzar un resultado).
- Los guantes salen de DETRÁS de la mesa (capa recortada en el borde superior); el cubilete del trile y sus guantes se pueden reutilizar tal cual.
- El resultado se guarda/decide antes de animar; si se recarga a mitad, cuenta como perdido (el crupier "se guarda la ficha").

## Cómo probar y capturar
- El panel del navegador integrado va lento y da timeout al capturar: usa **`tools/art/harness/run.cjs`** (Electron sin ventana; cabecera con el uso y el formato de config).
  Pasa la config por la variable `GL_CFG` (nunca una URL por argumento). Expón en la página un `window.__algo` con el estado para sondearlo con `waitFor`.
- **Revisa tus capturas con la herramienta Read y pule** hasta que se vea premium: el arte del trile necesitó ~3 pasadas por pieza (ampliar ×10 con `pix.zoom_sheet`).
- Servidor para verlo en el navegador del usuario: la config `atlas` de `.claude/launch.json` (`python -m http.server 8081 --directory atlas-iq`) ya sirve el proyecto:
  `http://localhost:8081/tools/art/<juego>/maqueta.html`.
- Sé **proporcionado**: pulir arte y sensación sí; baterías de pruebas exhaustivas no.

## Trampas ya pisadas en el trile
- IDs que chocan con el CSS del juego (usa prefijo). El `<html>`/`body` del juego tienen `overflow:hidden; height:100%`: la maqueta lo sobreescribe (`maqueta.css`).
- No escales sprites con factores fraccionarios (se ven irregulares); la profundidad se hace con `z-index`, arcos y sombras, no con escala.
- Mantén lo que "va debajo" (la doblón bajo el cubilete) sincronizado con el movimiento del que lo tapa, o asoma.
- El tramado de 1 px queda bien; el de 2-3 px forma columnas feas. A tamaño muy pequeño (14 px) los detalles ensucian: simplifica.
- `will-change: transform` en lo que se mueve; capas con `pointer-events: none` para gloves/efectos.
- Sonido: WebAudio sintetizado sencillo (ver `tone`/`noise`/`sfx` en `trile/maqueta.js`); en el juego se sustituirá por el motor de `js/audio.js`.

## Entrega (informa al final)
Ruta de `maqueta.html`; capturas (rutas absolutas); resumen del juego en 5 líneas; **tabla de pagos y RTP exacto**; el carrete (lista de presentaciones y de reacciones);
decisiones abiertas; qué no pudiste probar (mando, etc.).
