/* /api/contenido  La mesa de contenido (mesa/contenido.html): guarda lo que el autor opina de cada pregunta, ficha o propuesta (Bien / No / Cambiar…),
   sus cortes de dificultad y sus versiones, para que Claude los lea y los aplique. Cabecera x-mesa = la clave MESA_KEY (la misma de la mesa del crupier;
   sin ella o sin Redis responde 503). 10 claves malas en 10 min desde la misma IP la bloquean. Una sola clave de Redis (contenido:notas) con { ver, notas }.
     GET            ->  { ok, ver, notas }
     POST { ver, notas }  ->  { ok, ver } si ver es la ultima; si otro dispositivo guardo antes: 409 { ok: false, reason: "ver", ver, notas } y el cliente fusiona y reintenta */
const crypto = require("crypto");
const kv = require("./_kv");
const KEY = process.env.MESA_KEY || "", DB = "contenido:notas", MAXB = 900000;
const same = (a, b) => { const h = x => crypto.createHash("sha256").update(String(x)).digest(); return crypto.timingSafeEqual(h(a), h(b)); };
const VERD = /^(ok|no|cambiar|cfg)$/;
function clean(n) {   // solo forma: claves cortas, veredicto de la lista, nota de texto (las de cfg: pueden ser grandes: cortes, versiones, linea base)
  if (!n || typeof n !== "object" || Array.isArray(n)) return null;
  const ks = Object.keys(n); if (ks.length > 20000) return null; const o = {};
  for (const k of ks) { const x = n[k]; if (typeof k !== "string" || k.length > 240 || !x || typeof x !== "object") return null;
    const big = k.startsWith("cfg:"); if (!VERD.test(String(x.v)) || typeof x.nota !== "string" || x.nota.length > (big ? 600000 : 4000)) return null;
    o[k] = { v: x.v, nota: x.nota, t: +x.t || 0 }; }
  return o;
}
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Robots-Tag", "noindex");
  if (!KEY || KEY.length < 12 || !kv.configured) return res.status(503).json({ ok: false, reason: "off" });
  const ip = String((req.headers["x-forwarded-for"] || "").split(",")[0] || "x").slice(0, 45), bad = "mesa:bad:" + ip;
  try {
    const [nb] = await kv.pipeline([["GET", bad]]);
    if (+nb >= 10) return res.status(429).json({ ok: false, reason: "rate" });
    if (!same(req.headers["x-mesa"] || "", KEY)) { await kv.pipeline([["INCR", bad], ["EXPIRE", bad, 600]]); return res.status(401).json({ ok: false, reason: "key" }); }
    const [raw] = await kv.pipeline([["GET", DB]]); let cur = { ver: 0, notas: {} }; try { if (raw) cur = JSON.parse(raw); } catch (e) { /* vacio */ }
    if (req.method === "GET") return res.status(200).json({ ok: true, ver: cur.ver, notas: cur.notas });
    if (req.method !== "POST") return res.status(405).json({ ok: false });
    let b; try { b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}; } catch (e) { return res.status(400).json({ ok: false }); }
    const notas = clean(b.notas); if (!notas) return res.status(400).json({ ok: false, reason: "form" });
    if ((+b.ver || 0) !== cur.ver) return res.status(409).json({ ok: false, reason: "ver", ver: cur.ver, notas: cur.notas });
    const val = JSON.stringify({ ver: cur.ver + 1, notas }); if (Buffer.byteLength(val) > MAXB) return res.status(413).json({ ok: false, reason: "size" });
    await kv.pipeline([["SET", DB, val]]); return res.status(200).json({ ok: true, ver: cur.ver + 1 });
  } catch (e) { return res.status(502).json({ ok: false }); }
};
