/* POST /api/vivo  (cuerpo text/plain con JSON, sin preflight: el juego de escritorio llama desde http://127.0.0.1)
   El latido de una partida abierta para la mesa del autor (mesa/, api/mesa.js):
     { sid, st }      st = el estado de la partida (nombre, idioma, pantalla, ronda, lugar...): se guarda 75 s y entra en la lista de partidas en vivo
     { sid }          solo pregunta: sin st, no renueva nada (el latido rapido mientras el autor la mira)
     { sid, bye: 1 }  la partida se cierra: sale de la lista
     { sid, rtc }     la camara: la oferta WebRTC del juego (sdp) para que la mesa vea la ventana del juego
   Responde { ok, w, m }: w = 1 si el autor la esta mirando (el juego pasa a preguntar cada 2 s) y m = lo que el crupier tiene que decir (como mucho 5).
   Sin datos personales: sid es aleatorio en cada arranque y no se guarda la IP. El jugador lo apaga en Ajustes > Datos. */
const kv = require("./_kv");
const SID = /^[a-z0-9]{8,24}$/;
const cut = (v, n) => [...String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, "")].slice(0, n).join("");
const num = v => (Number.isFinite(+v) ? Math.round(+v) : null);
/* solo los campos conocidos y acotados: nada de lo que mande un cliente llega tal cual a la mesa */
function clean(st) {
  if (!st || typeof st !== "object") return null;
  const o = { n: cut(st.n, 20), l: cut(st.l, 8), p: cut(st.p, 8), v: cut(st.v, 12), sc: cut(st.sc, 24), md: cut(st.md, 12), ph: cut(st.ph, 12), q: cut(st.q, 60), k: cut(st.k, 16), d: cut(st.d, 12), fx: /^[01]{4}[0-5]{3}$/.test(st.fx || "") ? st.fx : "" };
  for (const k of ["r", "a", "asc", "s", "c", "h", "hm", "sk", "t0", "mt", "cam"]) { const x = num(st[k]); if (x != null) o[k] = x; }
  return o;
}
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.setHeader("Access-Control-Allow-Methods", "POST"); res.setHeader("Access-Control-Allow-Headers", "content-type"); return res.status(204).end(); }
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!kv.configured) return res.status(503).json({ ok: false });
  let b; try { b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}; } catch (e) { return res.status(400).json({ ok: false }); }
  if (!b || typeof b !== "object" || !SID.test(String(b.sid || ""))) return res.status(400).json({ ok: false });
  const sid = b.sid;
  try {
    if (b.bye) { await kv.pipeline([["ZREM", "vivo:idx", sid], ["DEL", "vivo:s:" + sid]]); return res.status(200).json({ ok: true }); }
    if (b.rtc) {                                                       // la camara: la oferta de conexion del juego para la mesa (api/mesa.js la recoge)
      const r = b.rtc, sdp = typeof r.sdp === "string" ? r.sdp : "";
      if (r.type !== "offer" || !sdp || sdp.length > 20000) return res.status(400).json({ ok: false });
      await kv.pipeline([["SET", "vivo:rtc:" + sid, JSON.stringify({ type: "offer", sdp }), "EX", 60]]); return res.status(200).json({ ok: true });
    }
    const st = clean(b.st), cmds = [];
    if (st) cmds.push(["SET", "vivo:s:" + sid, JSON.stringify(st), "EX", 75], ["ZADD", "vivo:idx", Date.now(), sid]);
    cmds.push(["LPOP", "vivo:in:" + sid, 5], ["EXISTS", "vivo:w:" + sid]);
    const out = await kv.pipeline(cmds), w = out[out.length - 1], m = out[out.length - 2];
    const msgs = (Array.isArray(m) ? m : m ? [m] : []).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
    res.status(200).json({ ok: true, w: w ? 1 : 0, m: msgs });
  } catch (e) { res.status(502).json({ ok: false }); }
};
