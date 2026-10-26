/* Baja tus notas del portal (api/contenido, Redis) a mesa/notas-contenido.json para que Claude las lea. Usa la clave MESA_KEY de .env.local
   (nunca se imprime). Uso: node mesa/leer-notas.cjs [url]   (por defecto https://geolite-game.vercel.app) */
const fs = require("fs"), path = require("path");
const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8"), m = env.match(/^MESA_KEY=(.+)$/m);
if (!m) { console.log("Falta MESA_KEY en .env.local"); process.exit(1); }
const base = (process.argv[2] || "https://geolite-game.vercel.app").replace(/\/$/, "");
fetch(base + "/api/contenido", { headers: { "x-mesa": m[1].trim() } }).then(async r => {
  if (!r.ok) { console.log("El portal respondió", r.status); process.exit(1); }
  const j = await r.json(); fs.writeFileSync(path.join(__dirname, "notas-contenido.json"), JSON.stringify(j.notas, null, 1));
  console.log("Notas bajadas: " + Object.keys(j.notas).filter(k => !k.startsWith("cfg:")).length + " (versión " + j.ver + ")");
}).catch(e => { console.log("No pude conectar:", e.message); process.exit(1); });
