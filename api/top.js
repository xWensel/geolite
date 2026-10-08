/* GET /api/top?board=daily-20260925&n=20&o=0&me=<id>  (o: desde que puesto, para pasar paginas)  ->  { ok, rows:[{id?,name,score,tries?}], count, me?:{rank,score} } (id solo en tu fila).
   board=ping sirve para saber si la API global esta activa. En el reto diario, score es la puntuacion global (suma de intentos) y tries el desglose. */
const kv = require("./_kv");
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!kv.configured) return res.status(503).json({ ok: false, reason: "no-backend" });
  const q = req.query || {}, board = String(q.board || "");
  if (board === "ping") return res.status(200).json({ ok: true });
  if (!kv.BOARD.test(board)) return res.status(400).json({ ok: false, reason: "board" });
  const n = Math.max(1, Math.min(50, parseInt(q.n, 10) || 20)), o = Math.max(0, Math.min(100000, parseInt(q.o, 10) || 0)), me = String(q.me || "").replace(/[^a-z0-9]/gi, "").slice(0, 24), daily = /^daily-/.test(board), lb = "lb:" + board;
  try {
    const [z, count, myRank, myScore] = await kv.pipeline([["ZRANGE", lb, o, o + n - 1, "REV", "WITHSCORES"], ["ZCARD", lb], ...(me ? [["ZREVRANK", lb, me], ["ZSCORE", lb, me]] : [])]);
    const ids = [], scores = []; for (let i = 0; i < z.length; i += 2) { ids.push(z[i]); scores.push(+z[i + 1]); }
    const [names, tries] = ids.length ? await kv.pipeline([["HMGET", "names:" + board, ...ids], ...(daily ? [["HMGET", "tries:" + board, ...ids]] : [])]) : [[], []];
    /* el id de cada jugador es su unica llave para enviar puntuaciones: solo se devuelve el tuyo (con otro, cualquiera podria cambiarle el nombre o rellenarle los intentos) */
    const rows = ids.map((id, i) => ({ ...(me && id === me ? { id } : {}), name: names[i] || "—", score: scores[i], ...(daily && tries && tries[i] ? { tries: String(tries[i]).split(",").map(Number) } : {}) }));
    res.status(200).json({ ok: true, rows, count: +count || 0, me: me && myRank != null ? { rank: myRank + 1, score: +myScore } : null });
  } catch (e) { res.status(502).json({ ok: false, reason: "kv" }); }
};
