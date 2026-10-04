/*
 * Geolite - envoltorio Electron. Sirve la carpeta del juego por un servidor
 * HTTP local (no file://) para que Service Worker, fetch relativo y rutas
 * funcionen exactamente igual que en el navegador.
 */
const { app, BrowserWindow, ipcMain, screen, shell, session, Menu, dialog } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

/* Steamworks: steam_appid.txt trae 480 (Spacewar, el App ID publico de
 * pruebas de Valve) para poder desarrollar sin tener aun un App ID propio;
 * hay que cambiarlo por el real antes de publicar. Si Steam no esta abierto
 * (o no hay steam_api64.dll junto al ejecutable en un build empaquetado),
 * el init falla y el juego sigue funcionando normal, solo sin logros. */
let steamClient = null;
try {
  steamClient = require("steamworks.js").init();
  require("steamworks.js").electronEnableSteamOverlay();
  console.log("Steamworks conectado:", steamClient.localplayer.getName());
} catch (e) {
  console.warn("Steamworks no disponible (¿Steam esta abierto?):", e.message);
}
/* sabor del build: steam-flavor.json ({"demo":true}) lo escribe tools/steam-pack.mjs --demo; sin el fichero es el juego completo */
let flavor = {}; try { flavor = JSON.parse(fs.readFileSync(path.join(__dirname, "steam-flavor.json"), "utf8")); } catch (e) { /* juego completo */ }
ipcMain.on("host:demo", (e) => { e.returnValue = !!flavor.demo; });
ipcMain.handle("steam:available", () => !!steamClient);
ipcMain.handle("steam:unlock", (e, id) => {   // si ya esta activo no se vuelve a guardar (profile.js reenvia todos los logros al arrancar)
  if (!steamClient || typeof id !== "string") return false;
  try { if (steamClient.achievement.isActivated(id)) return true; return steamClient.achievement.activate(id); } catch (err) { console.warn("steam:unlock", id, err.message); return false; }
});

/* Pantalla (v0.2.27). Dos modos: "window" (con marco, del tamano elegido) y "full" (pantalla completa: en Windows, Electron ya la hace
 * sin bordes y a la resolucion nativa del monitor; la "exclusiva", con cambio de modo de video, no existe en Electron). El antiguo
 * "Sin bordes" (una ventana sin marco que obligaba a recrear la ventana y recargar el juego, intro incluida) pasa a ser "full".
 * Se recuerdan, por equipo y fuera de la nube, el modo, el tamano del area de juego en pixeles FISICOS (lo que conoce el jugador:
 * 1920x1080 es 1920x1080 aunque Windows escale al 150 %; null = automatico), el monitor y la posicion dentro de el. */
const MODE_FILE = path.join(app.getPath("userData"), "winmode.json");
const SIZES = [[960, 600], [1280, 720], [1280, 800], [1366, 768], [1440, 900], [1600, 900], [1680, 1050], [1920, 1080], [1920, 1200], [2560, 1440], [3840, 2160]];   // de menor a mayor area
const MIN_W = 960, MIN_H = 600, FRAME = [16, 39];    // tamano minimo del juego (px CSS) y marco de Windows 10/11 mientras no hay ventana que medir
function loadPrefs() {
  let j = {}; try { j = JSON.parse(fs.readFileSync(MODE_FILE, "utf8")) || {}; } catch (e) { /* primera vez */ }
  const pair = (a, lo, hi) => Array.isArray(a) && a.length === 2 && a.every(n => Number.isFinite(n) && n >= lo && n <= hi);
  return { mode: j.mode === "window" ? "window" : "full", size: pair(j.size, 320, 16384) ? j.size.map(Math.round) : null, display: Number.isFinite(j.display) ? j.display : null, pos: pair(j.pos, -16384, 16384) ? j.pos : null };
}
function savePrefs() { try { fs.writeFileSync(MODE_FILE, JSON.stringify(prefs)); } catch (e) { /* sin permisos de escritura: se pierde al reiniciar */ } }
const prefs = loadPrefs();
let liveMode = prefs.mode;     // el estado real (sigue a la ventana); prefs.mode es lo que eligio el jugador
let win = null, placedAt = 0;

const alive = w => !!w && !w.isDestroyed();
const displayById = id => screen.getAllDisplays().find(d => d.id === id) || null;
const displayOf = w => screen.getDisplayMatching(w.getBounds());
const targetDisplay = () => displayById(prefs.display) || (alive(win) ? displayOf(win) : screen.getPrimaryDisplay());
const frameOf = w => { if (!alive(w) || w.isFullScreen() || w.isMaximized()) return FRAME; const [ow, oh] = w.getSize(), [cw, ch] = w.getContentSize(); return ow - cw >= 0 && oh - ch >= 0 ? [ow - cw, oh - ch] : FRAME; };
/* pixeles fisicos de un tamano en px CSS. Con escalas fraccionarias (114 %, 125 %...) Windows redondea los px CSS y la cuenta sale con 1 px de
   mas o de menos (2561x1441 en un monitor de 2560x1440): las medidas que caen a 2 px de una habitual se dan por esa */
const DIMS = [600, 720, 768, 800, 900, 960, 1024, 1050, 1080, 1200, 1280, 1366, 1440, 1536, 1600, 1680, 1920, 2048, 2160, 2560, 2880, 3200, 3440, 3840, 4096, 5120];
const snap = n => { const k = DIMS.find(x => Math.abs(x - n) <= 2); return k || n; };
const phys = (r, sf) => [snap(Math.round(r.width * sf)), snap(Math.round(r.height * sf))];
const minFor = (d, fr) => [Math.min(MIN_W, d.workArea.width - fr[0]), Math.min(MIN_H, d.workArea.height - fr[1])];
/* tamanos de la lista que caben en el area util del monitor con su marco y no dejan el juego por debajo de su minimo */
function fitSizes(d, fr) {
  const sf = d.scaleFactor || 1, wa = d.workArea, [mw, mh] = minFor(d, fr);
  return SIZES.filter(([w, h]) => w / sf + fr[0] <= wa.width && h / sf + fr[1] <= wa.height && w / sf >= mw - 0.5 && h / sf >= mh - 0.5);
}
/* automatico: el mayor de la lista que deja aire (90 % del area util); si ninguno, el mayor que quepa; si tampoco, el mayor 16:10 posible.
   Asi un portatil de 1366x768 o uno de 1080p al 150 % (donde los 1280x800 de antes no cabian) abren una ventana entera y centrada */
function autoSize(d, fr) {
  const sf = d.scaleFactor || 1, wa = d.workArea, list = fitSizes(d, fr);
  const roomy = list.filter(([w, h]) => w / sf + fr[0] <= wa.width * 0.9 && h / sf + fr[1] <= wa.height * 0.9);
  const pick = (roomy.length ? roomy : list).slice(-1)[0]; if (pick) return pick;
  const cw = Math.max(320, Math.min(wa.width - fr[0], (wa.height - fr[1]) * 1.6));
  return [Math.round(cw * sf), Math.round((cw / 1.6) * sf)];
}
/* area de juego (px CSS) para un monitor: la elegida si cabe en el (otro monitor u otra escala de Windows pueden dejarla grande), si no la automatica */
function contentFor(d, fr) {
  const sf = d.scaleFactor || 1, wa = d.workArea; let s = prefs.size;
  if (!s || s[0] / sf + fr[0] > wa.width + 1 || s[1] / sf + fr[1] > wa.height + 1) s = autoSize(d, fr);
  return [Math.round(s[0] / sf), Math.round(s[1] / sf)];
}
/* ventana: area de juego exacta (setContentSize no cuenta el marco; el setSize de antes si, y el juego quedaba mas pequeno) en SU monitor,
   en la posicion recordada si sigue cabiendo o centrada */
function placeWindow(w, d, keepPos) {
  const wa = d.workArea; placedAt = Date.now();
  if (displayOf(w).id !== d.id) w.setPosition(wa.x + 8, wa.y + 8);        // primero al monitor: si tiene otra escala, Windows reescala la ventana al llegar
  const fr = frameOf(w), [mw, mh] = minFor(d, fr), [cw, ch] = contentFor(d, fr);
  w.setMinimumSize(Math.round(mw + fr[0]), Math.round(mh + fr[1]));       // en pantallas pequenas el minimo de siempre (960x600) no cabia en el area util
  w.setContentSize(cw, ch);
  /* con escalas fraccionarias Windows reajusta el tamano un instante despues (quedaba 4 px CSS mayor): se mide ya asentado y se corrige,
     manteniendo la ventana centrada donde estaba */
  const fix = n => setTimeout(() => {
    if (!alive(w) || w.isFullScreen() || w.isMaximized()) return; const [gw, gh] = w.getContentSize(); if (gw === cw && gh === ch) return;
    const b = w.getBounds(); placedAt = Date.now(); w.setContentSize(Math.max(1, 2 * cw - gw), Math.max(1, 2 * ch - gh));
    const [nw, nh] = w.getSize(); w.setPosition(Math.round(b.x + (b.width - nw) / 2), Math.round(b.y + (b.height - nh) / 2)); if (n < 2) fix(n + 1);
  }, 150);
  fix(0);
  const [ow, oh] = w.getSize(); let x = wa.x + Math.round((wa.width - ow) / 2), y = wa.y + Math.max(0, Math.round((wa.height - oh) / 2));
  if (keepPos && prefs.pos) { const px = d.bounds.x + prefs.pos[0], py = d.bounds.y + prefs.pos[1]; if (px >= wa.x && py >= wa.y && px + ow <= wa.x + wa.width && py + oh <= wa.y + wa.height) { x = px; y = py; } }
  w.setPosition(x, y);
}
/* tras salir de pantalla completa (asincrono en Windows): el evento o, por si no llega, un tiempo prudencial */
function afterLeave(w, fn) {
  let done = false; const go = () => { if (done || !alive(w)) return; done = true; fn(); };
  w.once("leave-full-screen", () => setTimeout(go, 60)); setTimeout(go, 700); w.setFullScreen(false);
}
/* aplica lo elegido (modo, tamano, monitor) a la ventana viva, sin recrearla nunca (el juego no se recarga) */
function applyScreen(keepPos) {
  const w = win; if (!alive(w)) return;
  const d = targetDisplay(); prefs.display = d.id;
  if (prefs.mode === "full") {
    if (w.isFullScreen() && displayOf(w).id === d.id) return notifyScreen();
    const go = () => { if (w.isMaximized()) w.unmaximize(); if (displayOf(w).id !== d.id) placeWindow(w, d, false); w.setFullScreen(true); };
    if (w.isFullScreen()) afterLeave(w, go); else go();
  } else {
    const go = () => { if (w.isMaximized()) w.unmaximize(); placeWindow(w, d, keepPos); notifyScreen(); };
    if (w.isFullScreen()) afterLeave(w, go); else go();
  }
}
/* lo que pinta Ajustes > Pantalla */
function screenInfo() {
  const d = alive(win) ? displayOf(win) : screen.getPrimaryDisplay(), sf = d.scaleFactor || 1, fr = frameOf(win), prim = screen.getPrimaryDisplay().id;
  const cur = alive(win) ? phys(win.getContentBounds(), sf) : [0, 0];
  const all = screen.getAllDisplays().slice().sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y);
  return {
    mode: liveMode, size: prefs.size, sizeOk: !!prefs.size && prefs.size[0] / sf + fr[0] <= d.workArea.width + 1 && prefs.size[1] / sf + fr[1] <= d.workArea.height + 1, auto: autoSize(d, fr), cur, sizes: fitSizes(d, fr), display: d.id, native: phys(d.bounds, sf),
    displays: all.map((x, i) => { const [pw, ph] = phys(x.bounds, x.scaleFactor || 1); return { id: x.id, n: i + 1, label: String(x.label || "").slice(0, 40), primary: x.id === prim, w: pw, h: ph }; }),
  };
}
let notifyT = 0;
function notifyScreen() { clearTimeout(notifyT); notifyT = setTimeout(() => { if (alive(win)) win.webContents.send("win:screen", screenInfo()); }, 80); }

function wireWindow(w) {
  w.webContents.on("did-finish-load", () => {
    console.log("Ventana cargada OK");
    w.webContents.executeJavaScript("innerWidth + 'x' + innerHeight").then(s => console.log("Tamano de contenido:", s));
  });
  w.webContents.on("did-fail-load", (e, code, desc) => console.error("Fallo al cargar:", code, desc));
  w.webContents.on("console-message", e => console.log("[renderer]", e.level, e.message, e.sourceId + ":" + e.lineNumber));   // Electron 35+: los datos van en el evento (los argumentos sueltos estan obsoletos)
  w.webContents.on("render-process-gone", (e, details) => console.error("Renderer crash:", details));
  /* si la ventana entra o sale de pantalla completa por otra via (API de pantalla completa del navegador, el SO), el modo en memoria
     sigue al estado real para que Ajustes y la tecla F no se desincronicen (no se guarda: lo guardado es lo que elige el jugador) */
  const notify = m => { if (w !== win) return; liveMode = m; w.webContents.send("win:mode-changed", liveMode); notifyScreen(); };
  w.on("enter-full-screen", () => notify("full")); w.on("leave-full-screen", () => notify("window"));
  /* lo que hace el jugador con la ventana se recuerda: arrastrarla (monitor y posicion) y estirarla con el borde (tamano "personalizado") */
  const plain = () => w === win && !w.isFullScreen() && !w.isMaximized() && !w.isMinimized();
  w.on("moved", () => { if (!plain()) return; const d = displayOf(w), b = w.getBounds(); prefs.display = d.id; prefs.pos = [b.x - d.bounds.x, b.y - d.bounds.y]; savePrefs(); notifyScreen(); });
  w.on("resized", () => {
    if (!plain() || Date.now() - placedAt < 600) return;               // los cambios de tamano propios (Ajustes, F, monitor) no cuentan
    const sf = displayOf(w).scaleFactor || 1, [cw, ch] = w.getContentSize(); prefs.size = [Math.round(cw * sf), Math.round(ch * sf)]; savePrefs(); notifyScreen();
  });
  /* seguridad: la ventana del juego solo muestra el juego. Los enlaces externos (creditos de fotos, Wikipedia) se abren en el navegador
     del sistema; nada se abre en otra ventana de Electron (heredaria el puente geoliteHost) ni navega fuera del servidor local */
  const local = u => { try { const x = new URL(u); return x.hostname === "127.0.0.1" && x.port === String(serverPort); } catch (e) { return false; } };
  const external = u => { if (/^https?:\/\//i.test(u)) shell.openExternal(u).catch(() => {}); };
  w.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: "deny" }; });
  w.webContents.on("will-navigate", (e, url) => { if (!local(url)) { e.preventDefault(); external(url); } });
  if (!app.isPackaged) w.webContents.on("before-input-event", (e, i) => { if (i.type === "keyDown" && i.key === "F12") w.webContents.toggleDevTools(); });   // sin menu (ver whenReady): en desarrollo, F12 abre las herramientas
}

function buildWindow(url) {
  const d = targetDisplay(), wa = d.workArea, [mw, mh] = minFor(d, FRAME), [cw, ch] = contentFor(d, FRAME);
  const opts = {
    minWidth: Math.round(mw), minHeight: Math.round(mh), useContentSize: true, autoHideMenuBar: true,
    backgroundColor: "#000000", show: false, icon: path.join(ROOT, "assets", "desktop", "icon.ico"),
    width: cw, height: ch, x: wa.x + Math.round((wa.width - cw - FRAME[0]) / 2), y: wa.y + Math.max(0, Math.round((wa.height - ch - FRAME[1]) / 2)),
    fullscreen: prefs.mode === "full",                                   // a pantalla completa en el monitor donde se crea (el elegido)
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(ROOT, "preload.js") },
  };
  const w = new BrowserWindow(opts);
  if (prefs.mode !== "full") placeWindow(w, d, true);                    // con el marco ya medido: tamano exacto y posicion recordada
  /* el crupier nota que mueves la ventana a otro monitor (js/dealer.js: "me cambias de pantalla") */
  let disp = null; const dispOf = () => { try { return displayOf(w).id; } catch (e) { return null; } };
  w.once("ready-to-show", () => { disp = dispOf(); });
  w.on("moved", () => { const d2 = dispOf(); if (disp != null && d2 != null && d2 !== disp && !w.isDestroyed()) w.webContents.send("host:display"); if (d2 != null) disp = d2; });
  w.once("ready-to-show", () => w.show());
  wireWindow(w);
  w.loadURL(url);
  return w;
}

/* un monitor que se desconecta o cambia de escala: la ventana vuelve dentro del area util (sin quedarse fuera de la pantalla) */
function screenChanged() {
  setTimeout(() => {
    if (!alive(win)) return;
    if (!displayById(prefs.display)) prefs.display = displayOf(win).id;
    if (!win.isFullScreen() && !win.isMaximized()) {
      const b = win.getBounds(), wa = displayOf(win).workArea;
      if (b.x < wa.x - 8 || b.y < wa.y - 8 || b.x + b.width > wa.x + wa.width + 8 || b.y + b.height > wa.y + wa.height + 8) applyScreen(false);
    }
    notifyScreen();
  }, 300);
}

ipcMain.on("win:getMode", (e) => { e.returnValue = liveMode; });
ipcMain.on("win:getScreen", (e) => { e.returnValue = screenInfo(); });
/* boton de encendido de la portada (js/salir.js): cierra el juego entero; solo lo acepta de la ventana del juego */
ipcMain.on("app:quit", (e) => { if (win && e.sender === win.webContents) app.quit(); });
/* Ajustes y la tecla F: { mode, size ([w,h] fisicos o null = automatico), display }. "border" de versiones anteriores = pantalla completa */
ipcMain.on("win:setScreen", (e, o) => {
  if (!alive(win) || e.sender !== win.webContents || !o || typeof o !== "object") return;
  let moved = false;
  if (o.mode === "window" || o.mode === "full" || o.mode === "border") prefs.mode = liveMode = o.mode === "window" ? "window" : "full";
  if ("size" in o) { const s = o.size; if (s === null || (Array.isArray(s) && s.length === 2 && s.every(n => Number.isInteger(n) && n >= 320 && n <= 16384))) { prefs.size = s; moved = true; } }
  if ("display" in o && displayById(o.display)) { prefs.display = o.display; moved = true; }
  if (moved) prefs.pos = null;                                           // tamano u otro monitor nuevos: centrada
  savePrefs(); applyScreen(!moved);
});
ipcMain.on("win:setMode", (e, mode) => { if (alive(win) && e.sender === win.webContents && /^(window|full|border)$/.test(mode)) { prefs.mode = liveMode = mode === "window" ? "window" : "full"; savePrefs(); applyScreen(true); } });

/* Las imagenes generadas (WebP) no pintan aunque devtools confirme que estan
 * cargadas (complete=true, naturalWidth=1024, opacity="1") - falla el pintado
 * final, no la carga. Investigado a fondo: NO es la GPU (chrome://gpu: RTX
 * 3080 bien acelerada; probados y descartados disableHardwareAcceleration(),
 * disable-gpu-compositing, disable-features=CanvasOopRasterization y
 * disable-gpu-rasterization - ninguno arreglo las imagenes y algunos dejaban
 * el juego renqueante). El patron real: los iconos pequenos (src fijo desde
 * el HTML) SI pintan; las ilustraciones grandes (src asignado por JS despues
 * de cargar, ver js/art.js) NO. Eso apunta a un bug de repintado tras
 * asignacion asincrona de src, no a la GPU - se arregla en JS (ver
 * js/art.js), asi que aqui solo se deja disable-gpu-sandbox (framerate
 * normal, confirmado). */
app.commandLine.appendSwitch("disable-gpu-sandbox");
/* el sonido no espera a un clic: jugando solo con mando (Steam Deck) las pulsaciones del mando no cuentan como gesto del usuario para el navegador */
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
/* Si la GPU se reinicia varias veces (volver de otra aplicacion, suspender, cambiar de monitor), Chromium bloquea WebGL para el origen hasta
 * reiniciar y el mapa se quedaba en blanco y parpadeando. Sin el bloqueo, el contexto vuelve (js/map.js lo reconstruye o recrea el lienzo). */
app.disableDomainBlockingFor3DAPIs();

const ROOT = __dirname;
const PORT = 47815;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".wasm": "application/wasm", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml" };

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      /* solo el propio juego: Host local (contra DNS rebinding desde una web), nada fuera de la carpeta (tampoco carpetas hermanas
         que empiecen igual) y nada oculto (.env.local con la clave de Pollinations, .git...). Una URL mal codificada ya no tumba la app */
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(req.headers.host || "")) { res.writeHead(403); res.end(); return; }
      let urlPath; try { urlPath = decodeURIComponent(req.url.split("?")[0]); } catch (e) { res.writeHead(400); res.end(); return; }
      let filePath = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);
      if (!filePath.startsWith(ROOT + path.sep) || path.relative(ROOT, filePath).split(path.sep).some(p => p.startsWith("."))) { res.writeHead(403); res.end(); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end("Not found"); return; }
        res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream", "Cache-Control": "no-cache" });   // siempre la ultima version de los archivos
        res.end(data);
      });
    });
    /* puerto FIJO: el guardado (localStorage) va por origen y el puerto forma parte de el; con un puerto
       aleatorio cada arranque empezaria sin partidas, perfil ni Enciclopedia. Solo si esta ocupado se prueba el siguiente */
    let port = PORT;
    server.on("error", err => { if ((err.code === "EADDRINUSE" || err.code === "EACCES") && port < PORT + 20) server.listen(++port, "127.0.0.1"); else { dialog.showErrorBox("Geolite", "No se pudo abrir el servidor local del juego. / Could not start the game's local server.\n\n" + err.message); app.quit(); } });   // EACCES: puerto reservado por Windows (Hyper-V, WSL); antes la excepcion dejaba el proceso vivo sin ventana
    server.on("listening", () => resolve(server.address().port));
    server.listen(port, "127.0.0.1");
  });
}

let serverPort = 0, serverP = null;
async function createWindow() {
  const first = !serverP;
  const port = serverPort = await (serverP = serverP || startServer());   // un solo servidor: en macOS, reabrir la ventana no debe cambiar de puerto (ni de guardado)
  if (first) console.log("Servidor local en el puerto", port);
  win = buildWindow(`http://127.0.0.1:${port}/index.html`);
}

/* una sola instancia: una segunda abriria otro puerto (otro origen) y mostraria el juego sin partidas ni perfil; se trae al frente la primera */
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); win.webContents.send("host:again"); } });   // el crupier lo comenta: "solo hay un crupier"
  app.whenReady().then(() => {
    /* permisos: solo lo que el juego usa (pantalla completa, copiar el resultado al portapapeles, bloqueo del puntero); el resto se deniega */
    const OK = new Set(["fullscreen", "clipboard-sanitized-write", "pointerLock"]);
    session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(OK.has(perm)));
    Menu.setApplicationMenu(null);   // sin el menu por defecto: sus atajos (Ctrl+R recarga, Ctrl+W cierra, Ctrl+-/+ zoom, Ctrl+Mayus+I) seguian vivos con la barra oculta
    screen.on("display-removed", screenChanged); screen.on("display-metrics-changed", screenChanged); screen.on("display-added", notifyScreen);   // monitores que se van o cambian de escala
    createWindow();
  });
}
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
