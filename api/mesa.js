/* /api/mesa  La mesa del autor (mesa/index.html): ve las partidas en vivo y habla por el crupier. Cabecera x-mesa = la clave MESA_KEY
   (variable de entorno de Vercel; sin ella la mesa no existe: 503). 10 claves malas en 10 min desde la misma IP la bloquean.
     GET                                  ->  { ok, now, list: [{ sid, t, st, w }] }  partidas con latido en los ultimos 80 s
     POST { op: "watch", sid }            ->  la estas mirando (45 s): esa partida pregunta cada 2 s
     POST { op: "unwatch", sid }
     POST { op: "say", sid, t, e, g, s, p }     ->  el crupier dice t con la cara e y el gesto g (se pierde si en 90 s no la recoge)
     POST { op: "fx", sid, fx, v }        ->  una ficha: rayo (sin v), lluvia/tormenta/apagon/terremoto (v true/false), cristal/huellas/ventana (v 0-5)
     GET ?log=1                           ->  lo ultimo que has dicho (200 frases, 7 dias)
     POST { op: "cam", sid } / GET ?rtc=sid / POST { op: "rtc", sid, sdp } / POST { op: "camoff", sid }
                                          ->  la camara: se la pides, recoges su oferta WebRTC, le devuelves tu respuesta y cuelgas */
const crypto = require("crypto");
const kv = require("./_kv");
const SID = /^[a-z0-9]{8,24}$/, WORD = /^[a-z_]{0,24}$/;
const FX = ["rayo", "tormenta", "lluvia", "apagon", "terremoto", "cristal", "huellas", "ventana"];
const KEY = process.env.MESA_KEY || "";
const STY = ["shout", "tremble", "whisper", "think", "dark", "sing", "glitch", "gold"];   // estilos del bocadillo (css/challenges.css, .dl-bubble.st-*)
const POS = ["tl", "tr", "bl", "br", "c"];   // donde sale el crupier en la pantalla del jugador: esquinas o centro grande
const same = (a, b) => { const h = x => crypto.createHash("sha256").update(String(x)).digest(); return crypto.timingSafeEqual(h(a), h(b)); };
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Robots-Tag", "noindex");
  if (!KEY || KEY.length < 12 || !kv.configured) return res.status(503).json({ ok: false, reason: "off" });
  const ip = String((req.headers["x-forwarded-for"] || "").split(",")[0] || "x").slice(0, 45), bad = "mesa:bad:" + ip;
  try {
    const [nb] = await kv.pipeline([["GET", bad]]);
    if (+nb >= 10) return res.status(429).json({ ok: false, reason: "rate" });
    if (!same(req.headers["x-mesa"] || "", KEY)) { await kv.pipeline([["INCR", bad], ["EXPIRE", bad, 600]]); return res.status(401).json({ ok: false, reason: "key" }); }
    const now = Date.now();
    if (req.method === "GET") {
      if (req.query && req.query.rtc) { const id = String(req.query.rtc); if (!SID.test(id)) return res.status(400).json({ ok: false }); const [o] = await kv.pipeline([["GETDEL", "vivo:rtc:" + id]]); let offer = null; try { offer = JSON.parse(o); } catch (e) { /* aun no */ } return res.status(200).json({ ok: true, offer }); }
      if (req.query && req.query.log) { const [l] = await kv.pipeline([["LRANGE", "vivo:log", 0, 199]]); return res.status(200).json({ ok: true, log: (l || []).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean) }); }
      const [, ids] = await kv.pipeline([["ZREMRANGEBYSCORE", "vivo:idx", 0, now - 80000], ["ZRANGE", "vivo:idx", 0, 199, "WITHSCORES"]]);
      const sids = [], at = {}; for (let i = 0; i < (ids || []).length; i += 2) { sids.push(ids[i]); at[ids[i]] = +ids[i + 1]; }
      let list = [];
      if (sids.length) {
        const got = await kv.pipeline([["MGET", ...sids.map(s => "vivo:s:" + s)], ["MGET", ...sids.map(s => "vivo:w:" + s)]]);
        list = sids.map((s, i) => { let st = null; try { st = JSON.parse(got[0][i]); } catch (e) { /* caducado entre medias */ } return st && { sid: s, t: at[s], st, w: got[1][i] ? 1 : 0 }; }).filter(Boolean);
      }
      return res.status(200).json({ ok: true, now, list });
    }
    if (req.method !== "POST") return res.status(405).json({ ok: false });
    let b; try { b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}; } catch (e) { return res.status(400).json({ ok: false }); }
    if (!b || !SID.test(String(b.sid || ""))) return res.status(400).json({ ok: false });
    const sid = b.sid, wk = "vivo:w:" + sid;
    if (b.op === "watch") { await kv.pipeline([["SET", wk, 1, "EX", 45]]); return res.status(200).json({ ok: true }); }
    if (b.op === "unwatch") { await kv.pipeline([["DEL", wk]]); return res.status(200).json({ ok: true }); }
    if (b.op === "cam" || b.op === "camoff" || b.op === "rtc") {     // la camara: pedirla, colgarla o devolver la respuesta WebRTC al juego
      const ik = "vivo:in:" + sid; let msg;
      if (b.op === "rtc") { const sdp = typeof b.sdp === "string" ? b.sdp : ""; if (!sdp || sdp.length > 20000) return res.status(400).json({ ok: false }); msg = { k: "rtc", sdp }; }
      else msg = { k: b.op };
      await kv.pipeline([...(b.op === "cam" ? [["DEL", "vivo:rtc:" + sid]] : []), ["RPUSH", ik, JSON.stringify(msg)], ["EXPIRE", ik, 90], ["SET", wk, 1, "EX", 45]]);
      return res.status(200).json({ ok: true });
    }
    if (b.op === "fx") {                                             // una ficha: el efecto cae al momento en su partida
      const fx = String(b.fx || ""); if (!FX.includes(fx)) return res.status(400).json({ ok: false });
      const v = typeof b.v === "boolean" ? b.v : Number.isInteger(b.v) && b.v >= 0 && b.v <= 5 ? b.v : undefined;   // interruptor o contador
      const ik = "vivo:in:" + sid, [st] = await kv.pipeline([["GET", "vivo:s:" + sid]]);
      await kv.pipeline([["RPUSH", ik, JSON.stringify({ k: "fx", fx, v, at: now })], ["EXPIRE", ik, 90], ["SET", wk, 1, "EX", 45]]);
      return res.status(200).json({ ok: true, live: !!st });
    }
    if (b.op === "say") {
      const t = [...String(b.t || "").normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()].slice(0, 160).join("");
      const e = WORD.test(b.e || "") ? b.e || "" : "", g = WORD.test(b.g || "") ? b.g || "" : "", s = STY.includes(b.s) ? b.s : "", p = POS.includes(b.p) ? b.p : "";
      if (!t) return res.status(400).json({ ok: false });
      const msg = JSON.stringify({ t, e, g, s, p, at: now }), ik = "vivo:in:" + sid;
      const [st] = await kv.pipeline([["GET", "vivo:s:" + sid]]);
      let who = ""; try { who = JSON.parse(st).n || ""; } catch (x) { /* ya no esta */ }
      await kv.pipeline([["RPUSH", ik, msg], ["EXPIRE", ik, 90], ["SET", wk, 1, "EX", 45], ["LPUSH", "vivo:log", JSON.stringify({ sid, who, t, e, at: now })], ["LTRIM", "vivo:log", 0, 199], ["EXPIRE", "vivo:log", 604800]]);
      return res.status(200).json({ ok: true, live: !!st });
    }
    res.status(400).json({ ok: false });
  } catch (e) { res.status(502).json({ ok: false, reason: "kv" }); }
};
