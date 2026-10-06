/* Geolite - arnes de capturas para maquetas (Electron sin ventana). El panel del navegador integrado da timeout al capturar y congela temporizadores;
   este arnes carga la pagina de verdad, la deja a 1920x1080, ejecuta pasos de JS y captura PNG con capturePage().

   Uso (desde atlas-iq):  set GL_CFG=ruta\\config.json   ;   node_modules\\electron\\dist\\electron.exe tools\\art\\harness\\run.cjs
          (PowerShell: $env:GL_CFG="C:/ruta/config.json"; .\\node_modules\\electron\\dist\\electron.exe tools\\art\\harness\\run.cjs)
   Nunca pases una URL con "?" como argumento (electron.exe sale con -1): la configuracion va por GL_CFG.

   config.json:
   { "page": "tools/art/dados/maqueta.html",       // ruta bajo atlas-iq (la raiz del servidor)
     "w": 1920, "h": 1080,
     "out": "C:/ruta/donde/guardar/capturas",       // carpeta (se crea)
     "fullstage": ".tr-wrap",                       // opcional: selector del contenedor del escenario; se fija a 1920x1080 en (0,0) para capturarlo a escala 1
     "steps": [ { "js": "document.querySelector('#btn').click()", "wait": 500, "shot": "01-inicio" },
                { "waitFor": "window.__estado && window.__estado().listo", "timeout": 20000, "shot": "02-listo" } ] }
   Cada paso: js (se evalua; si devuelve una promesa se espera; con "print": true se imprime lo que devuelva como RESULT), wait (ms), waitFor (expresion JS que debe ser verdadera; se sondea cada 60 ms), shot (nombre del PNG).
   Los errores de consola salen por la salida estandar como [console-error]. Termina con LISTO. */
const { app, BrowserWindow } = require("electron");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..", "..", "..");
const CFG = JSON.parse(fs.readFileSync(process.env.GL_CFG, "utf8"));
app.setPath("userData", path.join(require("os").tmpdir(), "gl-harness-" + Date.now()));
app.commandLine.appendSwitch("disable-renderer-backgrounding"); app.commandLine.appendSwitch("disable-background-timer-throttling");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".ttf": "font/ttf", ".mp3": "audio/mpeg", ".ogg": "audio/ogg" };
const srv = http.createServer((q, r) => { const p = decodeURIComponent(q.url.split("?")[0]), f = path.join(ROOT, p); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); r.end(d); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
app.whenReady().then(() => srv.listen(0, "127.0.0.1", async () => {
  fs.mkdirSync(CFG.out, { recursive: true });
  const win = new BrowserWindow({ width: CFG.w || 1920, height: CFG.h || 1080, show: false, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.setFrameRate(60); const wc = win.webContents;
  wc.on("console-message", e => { if (e.level === "error" || e.level === 3) console.log("[console-error]", (e.message || "").slice(0, 400)); });
  wc.on("render-process-gone", (e, d) => console.log("RENDER GONE", d.reason));
  await wc.loadURL(`http://127.0.0.1:${srv.address().port}/${CFG.page}`);
  await sleep(CFG.settle || 1500);
  if (CFG.fullstage) await wc.executeJavaScript(`(() => { const w = document.querySelector(${JSON.stringify(CFG.fullstage)}); w.style.cssText += ";position:fixed;left:0;top:0;width:1920px;height:1080px;z-index:99999;border-radius:0;box-shadow:none"; window.dispatchEvent(new Event("resize")); })()`);
  await sleep(300);
  for (const st of CFG.steps || []) {
    if (st.js) { const r = await wc.executeJavaScript(st.js); if (st.print) console.log("RESULT", typeof r === "string" ? r : JSON.stringify(r)); }
    if (st.wait) await sleep(st.wait);
    if (st.waitFor) { const t0 = Date.now(), lim = st.timeout || 20000; while (Date.now() - t0 < lim) { if (await wc.executeJavaScript(`!!(${st.waitFor})`)) break; await sleep(60); } }
    if (st.shot) { fs.writeFileSync(path.join(CFG.out, st.shot + ".png"), (await wc.capturePage()).toPNG()); console.log("shot", st.shot); }
  }
  console.log("LISTO"); app.exit(0);
}));
