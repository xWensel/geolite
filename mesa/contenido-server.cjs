/* Servidor LOCAL de la mesa de contenido (maqueta): sirve el repo en http://localhost:4747, guarda tus notas en mesa/notas-contenido.json
   (Claude las lee para ayudarte) y avisa a la consola en vivo cuando cambia algo en data/. Sin dependencias. Solo escucha en 127.0.0.1.
   Uso: node mesa/contenido-server.cjs  (o CONTENIDO-mesa.bat). */
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), NOTAS = path.join(__dirname, "notas-contenido.json"), PORT = +process.env.PORT || 4747;
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".ico": "image/x-icon", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
const clients = new Set();
/* en vivo: si cambia algo en data/ (lo que Claude aplica al juego), la consola avisa al instante */
let t0 = null;
const ping = () => { clearTimeout(t0); t0 = setTimeout(() => clients.forEach(r => r.write("data: datos\n\n")), 700); };
[path.join(ROOT, "data"), path.join(ROOT, "data", "wiki")].forEach(d => { try { fs.watch(d, (ev, f) => { if (f && /\.(js|json)$/.test(f)) ping(); }); } catch (e) {} });
http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (u === "/api/live") { res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" }); res.write("retry: 3000\n\n"); clients.add(res); req.on("close", () => clients.delete(res)); return; }
  if (u === "/api/notas") {
    if (req.method === "POST") {
      let b = ""; req.on("data", d => { b += d; if (b.length > 8e6) req.destroy(); });
      req.on("end", () => { try { const o = JSON.parse(b); fs.writeFileSync(NOTAS, JSON.stringify(o, null, 1)); res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); } catch (e) { res.writeHead(400); res.end(); } });
      return;
    }
    res.writeHead(200, { "content-type": "application/json" }); return res.end(fs.existsSync(NOTAS) ? fs.readFileSync(NOTAS) : "{}");
  }
  const f = path.join(ROOT, u === "/" ? "mesa/contenido.html" : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("no"); }
  res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-cache" }); fs.createReadStream(f).pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log("Mesa de contenido: http://localhost:" + PORT + "/mesa/contenido.html"));
