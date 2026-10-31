/* POST /api/socio  { id }  ->  { ok, n }: el NUMERO DE SOCIO de este jugador, por orden de llegada (el primero que entra es el 1).
   Se da una sola vez: la primera vez que el juego pregunta por un id nuevo se le asigna el siguiente numero y desde entonces siempre es el mismo
   (hash socio:n, id -> numero; contador socio:count). Lo pinta el reverso de la carta de socio (js/huevos.js). Los jugadores que ya existian reciben su
   numero la primera vez que se conectan con esta version, por orden de conexion. Sin Redis (sin backend) responde 503 y el juego sigue sin numero. */
const kv = require("./_kv");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!kv.configured) return res.status(503).json({ ok: false, reason: "no-backend" });
  let b; try { b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}; } catch (e) { return res.status(400).json({ ok: false, reason: "json" }); }
  if (!b || typeof b !== "object") b = {};
  const id = String(b.id || "").replace(/[^a-z0-9]/gi, "").slice(0, 24);
  if (id.length < 12) return res.status(400).json({ ok: false, reason: "id" });
  try {
    const [cur] = await kv.pipeline([["HGET", "socio:n", id]]);
    if (cur) return res.json({ ok: true, n: +cur });
    if (await kv.limited(kv.ipTag(kv.ip(req)), 20, "socio")) return res.status(429).json({ ok: false, reason: "limit" });   // los ids nuevos desde una misma red, con tope por minuto
    const [n] = await kv.pipeline([["INCR", "socio:count"]]);
    const [, got] = await kv.pipeline([["HSETNX", "socio:n", id, n], ["HGET", "socio:n", id]]);
    return res.json({ ok: true, n: +got });
  } catch (e) { return res.status(500).json({ ok: false }); }
};
