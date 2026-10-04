# Geolite en Steam - guia de subida

## 0. Una sola vez
1. Alta en Steamworks (Steam Direct, 100 USD por juego, 30 dias minimo hasta poder lanzar) -> te da el **App ID** del juego.
2. En el juego (Steamworks -> All Associated Packages, Apps and DLC) crea la **demo** ("Add new DLC/Demo") -> otro **App ID** (gratuito).
3. En cada app: SteamPipe -> Depots -> crea un depot (Windows 64-bit). Anota los **Depot ID**.
4. Instala SteamCMD (https://developer.valvesoftware.com/wiki/SteamCMD) y una cuenta de Steamworks con permiso "Edit App Metadata / Publish App Changes".
5. Sustituye los `REEMPLAZA_*` de `app_build_game.vdf` y `app_build_demo.vdf`.
6. Logros: `node tools/steam-achievements.mjs` y `python tools/steam_icons.py` generan `docs/steam/achievements.csv` y los 200 iconos
   (`docs/steam/icons/<id>.jpg` y `<id>_locked.jpg`, 64x64). Se cargan en Stats & Achievements y hay que pulsar **Publish**.
7. Launch options (SteamPipe -> Installation -> General): ejecutable `Geolite.exe` (demo: `GeoliteDemo.exe`), Windows 64.

## 1. Cada version
Atajo: `node tools/steam-upload.mjs` (o `--demo`) empaqueta, rellena el .vdf con `steam/ids.local.json` (lo crea la primera vez, fuera de git)
y sube a la rama privada `pruebas`. Lo de abajo es el paso a paso a mano.
```
node tools/steam-pack.mjs            # juego completo   -> dist/Geolite-win32-x64
node tools/steam-pack.mjs --demo     # demo (sin fotos HD y con steam-flavor.json) -> dist/Geolite Demo-win32-x64
steamcmd +login TU_USUARIO +run_app_build "%CD%\steam\app_build_game.vdf" +quit
steamcmd +login TU_USUARIO +run_app_build "%CD%\steam\app_build_demo.vdf" +quit
```
Deja `"SetLive" ""` vacio: la build llega a Steamworks pero no sale a nadie. Despues, en Steamworks -> SteamPipe -> Builds, asignala a una
rama privada (p. ej. `pruebas`, con contrasena) y pruebala desde tu biblioteca. Solo la rama `default` es la que ve el publico.

## 2. Probar antes de publicar
- Tu cuenta ya tiene el juego (es del propietario): instala la rama `pruebas` desde la biblioteca, juega, comprueba logros y overlay (Shift+Tab).
- Para testers: Steamworks -> Users & Permissions -> Manage keys, o Steam Playtest.
- Para volver a probar un logro: en la consola de Steam `achievement_clear <appid> <id>` o Stats & Achievements -> Reset.

## 3. Comprobaciones antes de enviar a revision
- `node tools/audit-licenses.mjs` -> `docs/licencias-fotos.md` (fotos con licencia dudosa o sin autor).
- Pantalla "Creditos y licencias" (Ajustes) con autores de fotos, banderas y textos de Wikipedia.
- Cuestionario de contenido de Steam: declarar el arte generado con IA.
