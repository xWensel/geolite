/* POST /api/submit  { board, id, name, score, run, x }  ->  guarda la MEJOR puntuacion de cada jugador en la tabla.
   Aventura del dia: { board:"advd-AAAAMMDD", id, name, score, run, x }  ->  la MEJOR expedicion del jugador ese dia (fecha local del jugador).
   Reto diario: { board:"daily-AAAAMMDD", id, name, tries:[s1, s2, s3], proofs:[{run, x}, ...] }  ->  cada intento se guarda una sola vez (el primero que llega manda)
   y la tabla ordena por la PUNTUACION GLOBAL del dia (suma de los intentos). Devuelve { ok, rank, total, score, tries }.
   Boleto de partida: { op:"run", id }  ->  { ok, run }. El juego lo pide al empezar la expedicion; sin el, ninguna puntuacion entra ni sube
   (repetir la que ya tienes, para cambiar de nombre, no lo necesita). x = desglose de la partida { s: puntos de las preguntas, c: rondas superadas,
   w: ganada, a: Ascension, q: preguntas contestadas }: el servidor rehace la cuenta final, pone un tope por pregunta y exige el tiempo minimo de juego.
   Cada boleto vale para UNA puntuacion (la misma puede ir a "Siempre" y a "Hoy"). Quien tenga el id o la IP en ban:id / ban:ip (la mesa, api/mesa.js) no envia nada.
   OJO: sigue siendo de confianza (la partida se juega en el navegador): esto obliga a jugar de verdad, o a esperar lo que dura una partida,
   para cada puntuacion. Para clasificar en serio hay que reproducir la partida en servidor a partir de la semilla y los clics (ver README, "Antitrampas"). */
const crypto = require("crypto");
const kv = require("./_kv");
const TTL = 3456000;                                                  // 40 dias
const RUN_TTL = 2592000;                                              // un boleto vive 30 dias (una expedicion guardada se puede seguir otro dia)
const ASC = [1, 1.1, 1.2, 1.3, 1.4, 1.5];                             // el multiplicador de la Ascension (ASC_MULT de js/adventure.js)
const QMAX = 5500;                                                    // tope de puntos de una pregunta: 1.400 (distancia + tiempo) x2,5 (racha) x1,5 (Rojo o negro), con margen
const QMS = 1500;                                                     // cada pregunta dura al menos 1,5 s de reloj (clic + revelado); una partida real tarda mucho mas
/* el boleto de esa partida: es de este jugador, la cuenta cuadra, cabe en el tiempo jugado y no se ha usado ya para otra puntuacion */
async function proof(rid, id, score, x) {
  rid = String(rid || "");
  if (!/^[a-f0-9]{24}$/.test(rid) || !x || typeof x !== "object") return "proof";
  const s = +x.s, c = +x.c, w = x.w ? 1 : 0, a = +x.a, q = +x.q;
  if (![s, c, a, q].every(Number.isFinite) || s < 0 || c < 0 || c > 9999 || !Number.isInteger(c) || !Number.isInteger(a) || a < 0 || a > 5 || !Number.isInteger(q) || q < c || q > 1e5) return "proof";
  if (Math.round((s + c * 1000 + w * 2500) * ASC[a]) !== score || s > q * QMAX) return "proof";
  const [[uid, t0, s0]] = await kv.pipeline([["HMGET", "run:" + rid, "id", "t", "s"]]);
  if (!uid || uid !== id) return "run";
  if (Date.now() - +t0 < q * QMS) return "time";
  if (s0 != null) return +s0 === score ? true : "used";
  const [set, s1] = await kv.pipeline([["HSETNX", "run:" + rid, "s", score], ["HGET", "run:" + rid, "s"]]);
  return set || +s1 === score ? true : "used";
}
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!kv.configured) return res.status(503).json({ ok: false, reason: "no-backend" });
  let b; try { b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}; } catch (e) { return res.status(400).json({ ok: false, reason: "json" }); }
  if (!b || typeof b !== "object") b = {};                             // "null", un numero...: se rechaza abajo como invalido (antes b.board reventaba)
  const id = String(b.id || "").replace(/[^a-z0-9]/gi, "").slice(0, 24);
  const ip = String((req.headers["x-forwarded-for"] || "").split(",")[0] || "x").slice(0, 45), h = kv.ipTag(ip), rl = "rl:" + ip + ":" + Math.floor(Date.now() / 60000);
  if (b.op === "run") {                                                // boleto de una expedicion nueva (o de una guardada que aun no lo tenia)
    if (!id) return res.status(400).json({ ok: false, reason: "invalid" });
    const rk = "rk:" + h + ":" + Math.floor(Date.now() / 3600000);
    try {
      const [n, , m, , bi, bd] = await kv.pipeline([["INCR", rl], ["EXPIRE", rl, 120], ["INCR", rk], ["EXPIRE", rk, 7200], ["SISMEMBER", "ban:ip", h], ["SISMEMBER", "ban:id", id]]);
      if (bi || bd) return res.status(403).json({ ok: false, reason: "ban" });
      if (n > 20 || m > 30) return res.status(429).json({ ok: false, reason: "rate" });   // 30 expediciones por hora y red
      const rid = crypto.randomBytes(12).toString("hex");
      await kv.pipeline([["HSET", "run:" + rid, "id", id, "t", Date.now(), "ip", h], ["EXPIRE", "run:" + rid, RUN_TTL]]);
      return res.status(200).json({ ok: true, run: rid });
    } catch (e) { return res.status(502).json({ ok: false, reason: "kv" }); }
  }
  const board = String(b.board || ""), daily = /^daily-/.test(board), dayB = /^(day|advd)-/.test(board);
  const name = [...String(b.name || "").normalize("NFC").replace(/[ᅟᅠㅤﾠ]/g, "").replace(/[^\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Nd} _.'\-ー]/gu, "").replace(/\s+/g, " ").replace(/^[ _.'\-ー]+/, "").replace(/([_.'\-])\1+/g, "$1").trim()].slice(0, 16).join("").trim() || "Anonymous";   // el mismo filtro que A.profile.clean (hasta 16)
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
  try {
    const lb = "lb:" + board, names = "names:" + board;
    const [n, , bi, bd, cur] = await kv.pipeline([["INCR", rl], ["EXPIRE", rl, 120], ["SISMEMBER", "ban:ip", h], ["SISMEMBER", "ban:id", id], ["ZSCORE", lb, id]]);  // el contador caduca siempre (antes, si fallaba el resto, se quedaba para siempre)
    if (bi || bd) return res.status(403).json({ ok: false, reason: "ban" });
    if (n > 20) return res.status(429).json({ ok: false, reason: "rate" });
    let total = score, mine = null;
    if (daily) {
      const tk = "tr:" + board + ":" + id, pf = Array.isArray(b.proofs) ? b.proofs : [];
      const [had] = await kv.pipeline([["HMGET", tk, "1", "2", "3"]]), add = [];
      for (let i = 0; i < tries.length; i++) {                         // solo entra un intento nuevo con el boleto de su partida; los ya guardados no se tocan
        if (had[i] != null) continue;
        const p = pf[i]; if (p && typeof p === "object" && (await proof(p.run, id, tries[i], p.x)) === true) add.push(["HSETNX", tk, String(i + 1), tries[i]]);
      }
      const got = await kv.pipeline([...add, ["EXPIRE", tk, TTL], ["HMGET", tk, "1", "2", "3"]]);
      mine = got[got.length - 1].filter(v => v != null).map(Number); total = mine.reduce((a, v) => a + v, 0);
      if (!mine.length) return res.status(403).json({ ok: false, reason: "proof" });
      await kv.pipeline([["ZADD", lb, total, id], ["HSET", names, id, name], ["HSET", "tries:" + board, id, mine.join(",")], ["EXPIRE", lb, TTL], ["EXPIRE", names, TTL], ["EXPIRE", "tries:" + board, TTL], ...(add.length ? [["HSET", "lbip", id, h]] : [])]);
    } else {
      const up = cur == null || score > +cur;                          // entra o sube: hace falta el boleto. Si no (cambio de nombre, reenvio), solo cambia el nombre
      if (up) { const v = await proof(b.run, id, score, b.x); if (v !== true) return res.status(403).json({ ok: false, reason: v }); }
      if (dayB) await kv.pipeline([["ZADD", lb, "GT", score, id], ["HSET", names, id, name], ["EXPIRE", lb, TTL], ["EXPIRE", names, TTL], ...(up ? [["HSET", "lbip", id, h]] : [])]);   // mejor expedicion del dia (advd-; day- de versiones anteriores), caduca como el Reto diario
      else await kv.pipeline([["ZADD", lb, "GT", score, id], ["HSET", names, id, name], ["PERSIST", lb], ["PERSIST", names], ...(up ? [["HSET", "lbip", id, h]] : [])]);   // la Aventura es "de siempre": no caduca
    }
    const [rank, count] = await kv.pipeline([["ZREVRANK", lb, id], ["ZCARD", lb]]);
    res.status(200).json({ ok: true, rank: rank == null ? null : rank + 1, total: count, ...(mine ? { score: total, tries: mine } : {}) });
  } catch (e) { res.status(502).json({ ok: false, reason: "kv" }); }
};
