/* POST /api/submit  { board, id, name, score }  ->  guarda la MEJOR puntuacion de cada jugador en la tabla.
   Aventura del dia: { board:"advd-AAAAMMDD", id, name, score }  ->  la MEJOR expedicion del jugador ese dia (fecha local del jugador).
   Reto diario: { board:"daily-AAAAMMDD", id, name, tries:[s1, s2, s3] }  ->  cada intento se guarda una sola vez (el primero que llega manda)
   y la tabla ordena por la PUNTUACION GLOBAL del dia (suma de los intentos). Devuelve { ok, rank, total, score, tries }.
   OJO: por ahora la puntuacion es de confianza (limites de plausibilidad + limite de frecuencia). Para clasificar en serio hay que reproducir la partida
   en servidor a partir de la semilla y los clics (ver README, "Antitrampas"). */
const kv = require("./_kv");
const TTL = 3456000;                                                  // 40 dias
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!kv.configured) return res.status(503).json({ ok: false, reason: "no-backend" });
  let b; try { b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}; } catch (e) { return res.status(400).json({ ok: false, reason: "json" }); }
  if (!b || typeof b !== "object") b = {};                             // "null", un numero...: se rechaza abajo como invalido (antes b.board reventaba)
  const board = String(b.board || ""), id = String(b.id || "").replace(/[^a-z0-9]/gi, "").slice(0, 24), daily = /^daily-/.test(board), dayB = /^(day|advd)-/.test(board);
  const name = [...String(b.name || "").normalize("NFC").replace(/[^\p{L}\p{N} _.'\-]/gu, "").replace(/\s+/g, " ").trim()].slice(0, 20).join("").trim() || "Anonymous";   // el mismo filtro que A.profile.clean (hasta 20)
  const tries = daily ? (Array.isArray(b.tries) ? b.tries : [b.score]).slice(0, 3).map(v => Math.floor(+v)) : [];
  const score = daily ? 0 : Math.floor(+b.score);
  if (!kv.BOARD.test(board) || !id) return res.status(400).json({ ok: false, reason: "invalid" });
  if (daily ? !tries.length || tries.some(v => !Number.isFinite(v) || v < 0 || v > 2e6) : !Number.isFinite(score) || score < 0 || score > 5e6) return res.status(400).json({ ok: false, reason: "invalid" });
  if (daily || dayB) {                                                 // Reto diario y "Hoy/Ayer" van por fecha local: se acepta el dia de hoy (UTC) +-1
    const d = new Date(), ymd = x => x.getUTCFullYear() * 10000 + (x.getUTCMonth() + 1) * 100 + x.getUTCDate(), v = +board.replace(/^\D+-/, "");
    const ok = [ymd(d), ymd(new Date(d - 864e5)), ymd(new Date(+d + 864e5))];
    if (dayB) ok.push(ymd(new Date(d - 2 * 864e5)));                   // "Ayer" en America a ultima hora ya son dos dias atras en UTC
    if (!ok.includes(v)) return res.status(400).json({ ok: false, reason: "day" });
  }
  const ip = String((req.headers["x-forwarded-for"] || "").split(",")[0] || "x").slice(0, 45), rl = "rl:" + ip + ":" + Math.floor(Date.now() / 60000);
  try {
    const [n] = await kv.pipeline([["INCR", rl], ["EXPIRE", rl, 120]]);  // el contador caduca siempre (antes, si fallaba el resto, se quedaba para siempre)
    if (n > 20) return res.status(429).json({ ok: false, reason: "rate" });
    const lb = "lb:" + board, names = "names:" + board;
    let total = score, mine = null;
    if (daily) {
      const tk = "tr:" + board + ":" + id;
      const got = await kv.pipeline([...tries.map((v, i) => ["HSETNX", tk, String(i + 1), v]), ["EXPIRE", tk, TTL], ["HMGET", tk, "1", "2", "3"]]);
      mine = got[got.length - 1].filter(v => v != null).map(Number); total = mine.reduce((a, v) => a + v, 0);
      await kv.pipeline([["ZADD", lb, total, id], ["HSET", names, id, name], ["HSET", "tries:" + board, id, mine.join(",")], ["EXPIRE", lb, TTL], ["EXPIRE", names, TTL], ["EXPIRE", "tries:" + board, TTL]]);
    } else if (dayB) {                                                 // mejor expedicion del dia (advd-; day- de versiones anteriores), caduca como el Reto diario
      await kv.pipeline([["ZADD", lb, "GT", score, id], ["HSET", names, id, name], ["EXPIRE", lb, TTL], ["EXPIRE", names, TTL]]);
    } else {                                                           // la Aventura es "de siempre": no caduca (con EXPIRE se borraba entera si nadie jugaba en 40 dias)
      await kv.pipeline([["ZADD", lb, "GT", score, id], ["HSET", names, id, name], ["PERSIST", lb], ["PERSIST", names]]);
      /* y cuenta para "Hoy" (fecha de Espana): asi entran tambien las partidas de versiones del juego anteriores a las tablas del dia, que solo envian aqui */
      if (!b.nd) {                                                     // nd: los clientes de ahora ya mandan su tabla del dia con SU fecha; copiarla aqui (fecha de Espana) la metia en el "Hoy" de otro dia
      const day = "advd-" + new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/-/g, "");
      await kv.pipeline([["ZADD", "lb:" + day, "GT", score, id], ["HSET", "names:" + day, id, name], ["EXPIRE", "lb:" + day, TTL], ["EXPIRE", "names:" + day, TTL]]);
      }
    }
    const [rank, count] = await kv.pipeline([["ZREVRANK", lb, id], ["ZCARD", lb]]);
    res.status(200).json({ ok: true, rank: rank == null ? null : rank + 1, total: count, ...(mine ? { score: total, tries: mine } : {}) });
  } catch (e) { res.status(502).json({ ok: false, reason: "kv" }); }
};
