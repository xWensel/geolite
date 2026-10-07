# Geolite en Steam - roadmap y pendientes

Objetivo de referencia: **Steam Next Fest de febrero de 2027** (22 feb - 1 mar 2027,
inscripcion cierra el 10 de enero de 2027). La edicion de octubre 2026 ya no es
viable: el registro cerro el 31 de agosto y los entregables (build + pagina) se
piden antes del 28 de septiembre.

## Bloqueantes legales

- [x] **Modo Clasico - hecho.** 11 campanas de 10 niveles cada una (Mundo,
      Capitales del mundo, EE. UU., Europa, Asia, Latinoamerica, Oceania,
      Banderas, Pistas, Eventos historicos, Personajes historicos), generadas
      con `node tools/build-classic.mjs` desde `data/places.js` + `data/wiki`
      y `tools/extra-data.json` (`node tools/build-extra.mjs`, Wikidata, solo
      si cambian las listas de Eventos/Personajes). Cero lugares, facts o
      umbrales de otros juegos: todo es propio de Geolite. Sin solapes: cada
      lugar sale en una sola campana; capitales solo en Capitales del mundo,
      paises solo en Banderas, batallas y sucesos solo en Eventos. Los nombres
      de nivel se traducen en `data/campaigns.js` (`LEVEL_LABEL`).
      Pendiente: Oceania necesita los ~100 lugares nuevos anadidos a
      `tools/places-src.mjs` (resolucion incremental en `data/places.js`);
      hasta entonces sale con 8 niveles cortos.
- [x] **Nombre "Geolite" - comprobado.** Busqueda en TMview (100 resultados,
      ~25 oficinas: USPTO, EUIPO, UKIPO, CNIPA, JPO...): ninguna marca
      "GEOLITE" registrada en clase 9 (software) ni 41 (entretenimiento); las
      que existen son de iluminacion, quimica y construccion, sin relacion.
      Unico roce real: un juego movil pequeño "GeoLite: Geometry Roguelite"
      (Google Play, ~100 descargas, sin marca registrada) - riesgo de
      confusion bajo pero no nulo. 0 resultados para "geolite" en Steam ahora
      mismo. Pendiente si se quiere blindar del todo: registrar la marca en
      EUIPO (850 EUR, cubre los 27 paises de la UE) antes de anunciar en
      Steam.
- [ ] Atribucion de Wikipedia (CC BY-SA 4.0) y fotos de Commons: ya se muestra
      por tarjeta; falta pantalla de creditos dedicada.
- [ ] Modo sin conexion: empaquetar textos y fotos de la Enciclopedia (con su
      licencia) en vez de pedirlos a Wikipedia en tiempo real. Necesario para
      Steam (no se puede depender de que el jugador tenga internet) y ademas
      resuelve parte del empaquetado offline en Electron.
- [ ] **Arte generado con IA.** El pipeline (`tools/gen-art.mjs`,
      `tools/gen_art.py`, Pollinations) sigue en pie. Decision tomada: se
      declara en el cuestionario de "AI-generated content" de Steamworks y se
      anade una linea breve en la ficha de tienda; no se rehace el arte.

## Tecnico (empaquetado)

- [x] **Electron - hecho.** `main.js` sirve el juego con un servidor HTTP
      local (no `file://`), ventana en pantalla completa real (cubre la barra
      de tareas), GPU sandbox desactivado (arregla WebP que no pintaba en
      algunos equipos, sin perder framerate - `disableHardwareAcceleration()`
      se probo y se descarto por dejar el juego a ~2 FPS). `npm start` para
      lanzarlo.
- [x] **`steamworks.js` - logros conectados.** `preload.js` expone
      `window.geoliteHost.steamUnlock(id)` por IPC (contextIsolation se queda
      en true, steamworks.js solo corre en el proceso principal, nunca en el
      renderer - mas seguro que lo que sugiere el README oficial). `js/steam.js`
      rellena `A.steam.unlock` solo dentro de Electron; en el navegador normal
      no existe, igual que antes. Probado en real: con Steam abierto,
      `steamworks.init()` conecta con la cuenta de Steam del usuario.
      `steam_appid.txt` trae `480` (Spacewar, el App ID publico de pruebas de
      Valve) - **hay que cambiarlo por el App ID real antes de publicar**.
      Los logros en si no se pueden probar de verdad hasta tener ese App ID
      propio con los logros de Geolite dados de alta en el panel de
      Steamworks (activar uno de Spacewar con nuestros IDs simplemente no
      hace nada, son logros que no existen para App 480).
      **Alta de logros:** `node tools/steam-achievements.mjs` y
      `python tools/steam_icons.py` generan `docs/steam/achievements.csv`
      (100 logros: API name = id de `js/profile.js`, oculto si/no, nombre y
      descripcion en los 12 idiomas con el codigo de Steam) y
      `docs/steam/icons/` (64x64 JPG, conseguido y `_locked`). Cada logro
      tiene insignia propia. Retirado `classic_win` (se desbloqueaba siempre
      a la vez que el logro de la campana terminada); anadidos
      `classic_europe`, `classic_flags`, `classic_clues`, `classic_events` y
      `classic_people`; `classic_all` y `classic_goldall` cubren todas las
      campanas del Clasico. Volver a exportar tras cambiar logros o textos.
      Pendiente: Leaderboards (Steam Leaderboards o backend propio con
      validacion en servidor, reproduciendo la partida con la semilla) y
      Cloud save (perfil `atlasiq.profile.v1` y partida `atlasiq.run.v1` ya
      existen en localStorage, falta mapearlos a Steam Cloud).
- [x] Overlay de Steam en Electron: `electronEnableSteamOverlay()` ya se
      llama en `main.js`. Sin verificar visualmente (pulsar Shift+Tab con
      Steam abierto) - pendiente de probar a mano.
- [ ] Mando y Steam Deck: cursor con stick, atajos de boton, texto legible en
      pantalla pequena.
- [ ] Localizacion: interfaz nueva en es/en; completar fr/pt/de/it (no
      bloqueante para el demo/Next Fest, se puede dejar para despues).
- [ ] Accesibilidad: daltonismo, escala de texto, remapeo de teclas.
- [ ] Decidir si `api/submit.js` / `api/top.js` (Vercel KV) siguen vivos para
      un ranking online propio o si el leaderboard pasa 100% a Steam.
- [ ] Crash reporting y analitica opcional.

## Tienda

- [ ] Alta en Steamworks y cuota Steam Direct (100 USD), datos bancarios y
      fiscales. Hacerlo cuanto antes: la aprobacion de Valve tarda y todo lo
      demas depende de tener la app creada.
- [ ] Capsulas (varios tamanos), trailer, 5+ capturas, descripcion,
      cuestionario de edad/contenido y cuestionario de IA (ver bloqueante de
      arte).
- [ ] Pagina "Proximamente" publicada con semanas de antelacion.
- [ ] Build de demo jugable lista y subida antes del 10 de enero de 2027 para
      inscribirse a Steam Next Fest (22 feb - 1 mar 2027).

## Roadmap sugerido (hoy: 27 sept 2026 -> Next Fest feb 2027)

1. **Semanas 1-3 (paralelo):**
   - Legal: ~~reescribir datos del modo Clasico~~ hecho (ver arriba).
   - Tecnico: montar el wrapper de Electron + primer build local. Empezar
     integracion de `steamworks.js` (logros primero, es lo mas mecanico).
   - Tienda: dar de alta la cuenta en Steamworks (paga el fee, reserva el
     nombre) para no perder tiempo de aprobacion despues.
2. **Semanas 3-6:**
   - Empaquetar Enciclopedia offline (textos+fotos con licencia).
   - Cloud save y leaderboards con `steamworks.js`.
   - Comprobar overlay de Steam y soporte de mando/Deck.
   - Trademark check del nombre "Geolite".
3. **Semanas 6-9:**
   - Pantalla de creditos (Wikipedia/Commons).
   - Assets de tienda: capsulas, capturas, trailer corto.
   - Publicar pagina "Proximamente".
   - Preparar y probar el build de demo (subconjunto del juego, sin
     depender de red).
4. **Semanas 9-12 (antes del 10 ene 2027):**
   - Pulido final del build de demo, pruebas de mando/Deck, QA de
     achievements/leaderboards.
   - Inscripcion oficial a Steam Next Fest febrero 2027.
5. **Post-Next Fest:** localizacion fr/pt/de/it, accesibilidad, iterar sobre
   feedback del festival antes del lanzamiento completo.

Los items de accesibilidad y localizacion completa no son bloqueantes para el
demo/Next Fest: se pueden dejar para la fase posterior sin riesgo.

## Medir el rendimiento en Steam Deck
1. Opciones de lanzamiento del juego en Steam: `GEOLITE_PERF=1 %command%` (en escritorio tambien vale F3 con teclado).
2. Juega 10-15 minutos recorriendo: portada, Clasico (zoom con la rueda), Aventura con Campamento y los 8 juegos del casino, Enciclopedia.
3. Recoge `geolite-perf.txt` (Linux nativo: `~/.config/geolite/`; Proton: dentro del prefijo, en `AppData/Roaming/geolite/`). Da fps mediana y minimo,
   p95 de fotograma, fotogramas largos y memoria por modo/fase, mas la GPU y el motor del mapa (GL o 2D).
4. Objetivo de referencia: 60 fps medianos en mapa y menus, p95 por debajo de 25 ms, memoria JS estable (sin subida continua entre rondas).
   Si el mapa cae a 2D, o una fase baja de 40 fps, ahi esta el trabajo; el vigilante del mapa (`js/map.js`, `_adapt`) ya baja la resolucion solo.
