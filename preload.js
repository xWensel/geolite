/*
 * Geolite - preload de Electron. Expone `window.geoliteHost` a la pagina sin
 * activar nodeIntegration (contextIsolation se queda en true por seguridad;
 * steamworks.js solo se usa en el proceso principal, aqui solo se reenvia
 * por IPC).
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("geoliteHost", {
  /* true en el build de la demo de Steam (tools/steam-pack.mjs --demo); el juego lo usa para limitar contenido */
  demo: ipcRenderer.sendSync("host:demo"),
  /* "deck" en una Steam Deck, "pc" en el resto (js/mando.js: iconos y modo mando de entrada) */
  device: ipcRenderer.sendSync("host:device"),
  /* panel de rendimiento (js/perf.js): arranque encendido (GEOLITE_PERF=1 o --perf) y guardado de su informe */
  perf: ipcRenderer.sendSync("host:perf"),
  perfSave: (txt) => ipcRenderer.send("perf:save", String(txt).slice(0, 20000)),
  /* teclado de Steam para escribir con mando (js/teclado.js): { kind: "floating" | "modal" (con text) | "cancel" | "none" } */
  steamKeyboard: (o) => ipcRenderer.invoke("steam:keyboard", o),
  steamAvailable: () => ipcRenderer.invoke("steam:available"),
  /* { account, app } de Steam Cloud, o null sin Steam (Ajustes > Datos) */
  steamCloud: () => ipcRenderer.invoke("steam:cloud"),
  steamUnlock: (id) => ipcRenderer.invoke("steam:unlock", id),
  /* sincrono a proposito: el renderer lo usa para pintar el selector de
   * pantalla al instante, igual que document.fullscreenElement. */
  windowMode: () => ipcRenderer.sendSync("win:getMode"),
  setWindowMode: (mode) => ipcRenderer.send("win:setMode", mode),
  onWindowModeChange: (cb) => { ipcRenderer.on("win:mode-changed", (e, mode) => cb(mode)); },   // sin return: ipcRenderer.on devuelve ipcRenderer y se lo daba a la pagina
  /* Ajustes > Pantalla (v0.2.27): modo, tamano del area de juego en pixeles fisicos, monitor; sincrono para pintar Ajustes al abrirlos */
  screenInfo: () => ipcRenderer.sendSync("win:getScreen"),
  setScreen: (o) => ipcRenderer.send("win:setScreen", o),
  onScreenChange: (cb) => { ipcRenderer.on("win:screen", (e, info) => cb(info)); },
  /* boton de encendido de la portada (js/salir.js): cierra el juego */
  quit: () => ipcRenderer.send("app:quit"),
  /* abres el juego otra vez con este abierto: main trae esta ventana al frente y el crupier lo comenta (js/dealer.js) */
  onAgain: (cb) => { ipcRenderer.on("host:again", () => cb()); },
  /* mueves la ventana a otro monitor (el crupier lo comenta) */
  onDisplay: (cb) => { ipcRenderer.on("host:display", () => cb()); },
});
