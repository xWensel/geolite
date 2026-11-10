/* /api/mesa  La mesa del autor (mesa/index.html): ve las partidas en vivo y habla por el crupier. Cabecera x-mesa = la clave MESA_KEY
   (variable de entorno de Vercel; sin ella la mesa no existe: 503). 10 claves malas en 10 min desde la misma IP la bloquean.
     GET                                  ->  { ok, now, list: [{ sid, t, st, w }] }  partidas con latido en los ultimos 80 s
     POST { op: "watch", sid }            ->  la estas mirando (45 s): esa partida pregunta cada 2 s
     POST { op: "unwatch", sid }
     POST { op: "say", sid, t, e, g, s, p }     ->  el crupier dice t con la cara e y el gesto g (se pierde si en 90 s no la recoge)
     POST { op: "fx", sid, fx, v }        ->  una ficha: rayo (sin v), lluvia/tormenta/apagon/terremoto/humo (v true/false), cristal/huellas/ventana (v 0-5)
     POST { op: "ch", sid, ch, v }        ->  un reto de la Aventura (los de A.CHAL, js/challenges.js) a nivel v 0-3 (0 lo quita); ch "*" los quita todos
     POST { op: "gift", sid, n }          ->  regalo de la casa: n fichas de oro (1-5000, 300 por defecto) con su aviso en la pantalla del jugador; cada orden lleva un id y el juego la cobra una sola vez
     POST { op: "act", sid, a, v }        ->  el crupier y Comodin al momento (bloque D): a = gest (id de gesto, "<gesto>@<cara>" incluido), face (cara),
                                              gaze (-1 | 1 | 2 | "duda" | null = sigue al raton), humor (contento/tenso/picado/aburrido/admirado | null = segun
                                              su partida), cat (accion de Comodin), vest (ropa en directo { hueco: valor | null } o null = la suya) o tras (trastada)
     GET ?log=1                           ->  lo ultimo que has dicho (200 frases, 7 dias)
     POST { op: "cam", sid } / GET ?rtc=sid / POST { op: "rtc", sid, sdp } / POST { op: "camoff", sid }
                                          ->  la camara: se la pides (el jugador la acepta o no: la oferta llega con deny), recoges su oferta WebRTC, le
                                              devuelves tu respuesta y cuelgas
     POST { op: "shot", sid, v } / GET ?shot=sid  ->  v0.4.70: las fotos de respaldo (si el video no conecta): v true las pide, false las corta; GET la ultima
     POST { op: "hand", sid, t, x, y }    ->  v0.4.70: el guante sin video (con las fotos): t tap | move | hide, x e y de 0 a 1 en su ventana
   v0.4.70: cada orden lleva su numero (q, de vivo:seq) y el juego cuenta en su latido la ultima que ha recibido (st.ak) y la ultima frase que ha
   empezado a decir (st.dk): la mesa sabe si ha llegado. El GET de la lista deja vivo:open 8 s: con la mesa abierta, todas las partidas laten cada 4 s.
   Clasificacion (moderacion de las tablas de api/submit.js):
     GET ?lb=adv-all&o=0                  ->  { ok, rows: [{ id, name, score, ip, ban }], count }  50 filas desde el puesto o, con el id y la red cifrada
     GET ?bans=1                          ->  { ok, ids: [...], ips: [...] }  los vetados
     POST { op: "lbdel", id, board?, ban }  ->  quita a ese jugador de board (o de TODAS las tablas) y, con ban, veta su id y su red
     POST { op: "unban", id?, ip? }       ->  levanta el veto */
const crypto = require("crypto");
const kv = require("./_kv");
const SID = /^[a-z0-9]{8,24}$/, WORD = /^[a-z_]{0,24}$/, GEST = /^[a-z_]{1,24}(@[a-z_]{1,16})?$/;
const FX = ["rayo", "tormenta", "lluvia", "apagon", "terremoto", "humo", "cristal", "huellas", "ventana"];
const CH = ["shaky", "missing", "mirror", "memory", "runes", "anagram", "riddle", "babel", "nocountry", "fakepass", "ticker", "ctrlz", "stormnight", "trap", "giants", "blur", "dark", "flicker", "wrongborders", "noborders", "spread", "tilt", "flip", "spin", "clouds", "rain", "myopia", "mosaic", "quake", "decoys", "lightning", "tremble", "ghost", "lag", "cmirror", "wind", "storm", "silence", "crack", "hang", "battery", "flaghue", "flagblur", "flagdark", "flaggray", "flagback", "flagpuzzle", "flagwind", "frost", "frosted", "tiles", "signal", "card", "flagwet"];   // los retos que se pueden poner a mano (A.CHAL sin los absorbidos ni los de jefe)
const KEY = process.env.MESA_KEY || "";
const STY = ["grito", "canto", "susurro", "nervios", "siniestro", "libreta", "senal", "anuncio", "sueno", "drama", "jefe", "shout", "tremble", "whisper", "think", "dark", "sing", "glitch", "gold"];   // voces del bocadillo (css/bocadillo.css, js/dealer.js); los 8 nombres viejos se siguen aceptando
const POS = ["tl", "tr", "bl", "br", "c"];   // donde sale el crupier (la mesa nueva ya no lo manda: tiene su sitio fijo en cada pantalla; se acepta por las mesas viejas)
const HUMOR = ["contento", "tenso", "picado", "aburrido", "admirado"];
const CAT = ["espera", "levanta", "anda", "salta", "zarpa", "caricia", "regana", "duerme", "despierta"];   // A.comodin.act
const TRAS = ["mapa", "apagon", "ventana", "guante", "sello", "ticket", "cartas", "telon", "moneda", "ficha", "siesta", "desfile", "creditos"];   // A.trastadas.run; creditos (v0.3.235): los creditos de la Ascension V sin jubilar (antes, un boton temporal en Ajustes)
const SLOT = /^[a-z_]{1,16}$/, PID = /^[a-z0-9_]{1,24}$/, LI = /^[A-Za-z0-9_]{1,40}#\d{1,3}$/;
const PTR = ["ret", "pin", "lin", "dia"], GATO = ["gpelo", "gojos", "gpaj", "gpieza"], HUEVO = ["cae", "hum", "baile"];   // v0.4.70: puntero, ropa de Comodin y huevos de la casa
/* un objeto { hueco: valor | null } con huecos de la lista (o null = lo suyo) */
const slots = (v, ok) => {
  if (v === null) return null;
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = {}; for (const k of Object.keys(v)) { const x = v[k]; if (!ok.includes(k) || !(x === null || (typeof x === "string" && PID.test(x)))) return undefined; o[k] = x; }
  return o;
};
/* lo que llega en una accion, ya validado (o undefined si no vale) */
function actVal(a, v) {
  if (a === "ptr") return slots(v, PTR);
  if (a === "gato") return slots(v, GATO);
  if (a === "mesa") return v === null || (typeof v === "string" && PID.test(v)) ? v : undefined;
  if (a === "huevo") return HUEVO.includes(v) ? v : undefined;
  if (a === "gest") return typeof v === "string" && GEST.test(v) ? v : undefined;
  if (a === "face") return typeof v === "string" && WORD.test(v) && v ? v : undefined;
  if (a === "gaze") return v === null || v === "duda" || v === -1 || v === 1 || v === 2 ? v : undefined;
  if (a === "humor") return v === null || HUMOR.includes(v) ? v : undefined;
  if (a === "cat") return CAT.includes(v) ? v : undefined;
  if (a === "tras") return TRAS.includes(v) ? v : undefined;
  if (a === "vest") {
    if (v === null) return null;
    if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
    const ks = Object.keys(v); if (ks.length > 20) return undefined;
    const o = {}; for (const k of ks) { const x = v[k]; if (!SLOT.test(k) || !(x === null || (typeof x === "string" && SLOT.test(x)))) return undefined; o[k] = x; }
    return o;
  }
  return undefined;
}
const UID = /^[a-z0-9]{1,24}$/i, TAG = /^[a-f0-9]{16}$/;
const same = (a, b) => { const h = x => crypto.createHash("sha256").update(String(x)).digest(); return crypto.timingSafeEqual(h(a), h(b)); };
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Robots-Tag", "noindex");
  if (!KEY || KEY.length < 12 || !kv.configured) return res.status(503).json({ ok: false, reason: "off" });
  const bad = "mesa:bad:" + kv.ipTag(kv.ip(req));   // v0.3.235: las claves malas se cuentan por el tag de la red, no por la IP en claro
  try {
    const [nb] = await kv.pipeline([["GET", bad]]);
    if (+nb >= 10) return res.status(429).json({ ok: false, reason: "rate" });
    if (!same(req.headers["x-mesa"] || "", KEY)) { await kv.pipeline([["INCR", bad], ["EXPIRE", bad, 600]]); return res.status(401).json({ ok: false, reason: "key" }); }
    const now = Date.now();
    if (req.method === "GET") {
      if (req.query && req.query.rtc) { const id = String(req.query.rtc); if (!SID.test(id)) return res.status(400).json({ ok: false }); const [o] = await kv.pipeline([["GETDEL", "vivo:rtc:" + id]]); let offer = null; try { offer = JSON.parse(o); } catch (e) { /* aun no */ } return res.status(200).json({ ok: true, offer }); }
      if (req.query && req.query.lb) {                              // una tabla de la clasificacion, con lo que hace falta para moderarla
        const board = String(req.query.lb), o = Math.max(0, Math.min(100000, parseInt(req.query.o, 10) || 0)), lb = "lb:" + board;
        if (!kv.BOARD.test(board)) return res.status(400).json({ ok: false });
        const [z, count, bid, bip] = await kv.pipeline([["ZRANGE", lb, o, o + 49, "REV", "WITHSCORES"], ["ZCARD", lb], ["SMEMBERS", "ban:id"], ["SMEMBERS", "ban:ip"]]);
        const ids = [], sc = []; for (let i = 0; i < (z || []).length; i += 2) { ids.push(z[i]); sc.push(+z[i + 1]); }
        const [nm, ips] = ids.length ? await kv.pipeline([["HMGET", "names:" + board, ...ids], ["HMGET", "lbip", ...ids]]) : [[], []];
        return res.status(200).json({ ok: true, count: +count || 0, rows: ids.map((id, i) => ({ id, name: nm[i] || "—", score: sc[i], ip: ips[i] || "", ban: bid.includes(id) || (!!ips[i] && bip.includes(ips[i])) })) });
      }
      if (req.query && req.query.bans) { const [ids, ips] = await kv.pipeline([["SMEMBERS", "ban:id"], ["SMEMBERS", "ban:ip"]]); return res.status(200).json({ ok: true, ids: ids || [], ips: ips || [] }); }
      if (req.query && req.query.shot) { const id = String(req.query.shot); if (!SID.test(id)) return res.status(400).json({ ok: false }); const [o] = await kv.pipeline([["GET", "vivo:shot:" + id]]); let s = null; try { s = JSON.parse(o); } catch (e) { /* aun no */ } return res.status(200).json({ ok: true, img: s ? s.img : null, at: s ? s.at : 0 }); }
      if (req.query && req.query.log) { const [l] = await kv.pipeline([["LRANGE", "vivo:log", 0, 199]]); return res.status(200).json({ ok: true, log: (l || []).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean) }); }
      const [, ids] = await kv.pipeline([["ZREMRANGEBYSCORE", "vivo:idx", 0, now - 80000], ["ZRANGE", "vivo:idx", 0, 199, "WITHSCORES"], ["SET", "vivo:open", 1, "EX", 8]]);   // la mesa abierta: todas laten mas rapido
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
    if (b && b.op === "unban") {
      const id = String(b.id || ""), ip = String(b.ip || ""), cmds = [...(UID.test(id) ? [["SREM", "ban:id", id]] : []), ...(TAG.test(ip) ? [["SREM", "ban:ip", ip]] : [])];
      if (!cmds.length) return res.status(400).json({ ok: false });
      await kv.pipeline(cmds); return res.status(200).json({ ok: true });
    }
    if (b && b.op === "lbdel") {                                     // fuera de la clasificacion: de una tabla o de todas (las del dia, la de siempre y el Reto diario)
      const id = String(b.id || ""); if (!UID.test(id)) return res.status(400).json({ ok: false });
      let boards = [];
      if (b.board) { if (!kv.BOARD.test(String(b.board))) return res.status(400).json({ ok: false }); boards = [String(b.board)]; }
      else { let cur = "0"; for (let i = 0; i < 50; i++) { const [[c, keys]] = await kv.pipeline([["SCAN", cur, "MATCH", "lb:*", "COUNT", 1000]]); (keys || []).forEach(k => { const bd = k.slice(3); if (kv.BOARD.test(bd)) boards.push(bd); }); cur = String(c); if (cur === "0") break; } }
      const cmds = []; boards.forEach(bd => cmds.push(["ZREM", "lb:" + bd, id], ["HDEL", "names:" + bd, id], ["HDEL", "tries:" + bd, id], ["DEL", "tr:" + bd + ":" + id]));
      const [[ip]] = await kv.pipeline([["HMGET", "lbip", id]]);
      const out = cmds.length ? await kv.pipeline(cmds) : [];
      if (b.ban) await kv.pipeline([["SADD", "ban:id", id], ...(ip ? [["SADD", "ban:ip", ip]] : [])]);
      return res.status(200).json({ ok: true, removed: out.filter((r, i) => i % 4 === 0 && r).length, ip: b.ban ? ip || "" : "" });
    }
    if (!b || !SID.test(String(b.sid || ""))) return res.status(400).json({ ok: false });
    const sid = b.sid, wk = "vivo:w:" + sid;
    if (b.op === "watch") { await kv.pipeline([["SET", wk, 1, "EX", 45]]); return res.status(200).json({ ok: true }); }
    if (b.op === "unwatch") { await kv.pipeline([["DEL", wk]]); return res.status(200).json({ ok: true }); }
    /* v0.4.70: todas las ordenes van por aqui: llevan su numero (q) para que el juego confirme en su latido (st.ak) que le han llegado */
    const ik = "vivo:in:" + sid;
    const order = async (msg, o = {}) => {
      const [st, q] = await kv.pipeline([["GET", "vivo:s:" + sid], ["INCR", "vivo:seq"]]);
      if (o.needLive && !st) return { st: null, q: 0 };
      let who = ""; try { who = JSON.parse(st).n || ""; } catch (x) { /* ya no esta */ }
      const log = o.log ? [["LPUSH", "vivo:log", JSON.stringify({ sid, who, t: o.log, e: msg.e || "", q, at: now })], ["LTRIM", "vivo:log", 0, 199], ["EXPIRE", "vivo:log", 604800]] : [];
      await kv.pipeline([...(o.pre || []), ["RPUSH", ik, JSON.stringify(Object.assign(msg, { q, at: now }))], ["EXPIRE", ik, o.ttl || 90], ["SET", wk, 1, "EX", 45], ...log]);
      return { st, q };
    };
    const sent = r => res.status(200).json({ ok: true, live: !!r.st, q: r.q });
    if (b.op === "cam" || b.op === "camoff" || b.op === "rtc") {     // la camara: pedirla, colgarla o devolver la respuesta WebRTC al juego
      let msg;
      if (b.op === "rtc") { const sdp = typeof b.sdp === "string" ? b.sdp : ""; if (!sdp || sdp.length > 20000) return res.status(400).json({ ok: false }); msg = { k: "rtc", sdp }; }
      else msg = { k: b.op };
      return sent(await order(msg, { pre: b.op === "cam" ? [["DEL", "vivo:rtc:" + sid], ["DEL", "vivo:shot:" + sid]] : [] }));
    }
    if (b.op === "shot") return sent(await order({ k: "shot", v: !!b.v }));   // las fotos de respaldo: pedirlas (se renuevan cada 20 s) o cortarlas
    if (b.op === "hand") {                                           // el guante por el latido (cuando no hay video ni canal directo)
      const t = ["tap", "move", "hide"].includes(b.t) ? b.t : "", x = +b.x, y = +b.y;
      if (!t || (t !== "hide" && !(x >= 0 && x <= 1 && y >= 0 && y <= 1))) return res.status(400).json({ ok: false });
      return sent(await order({ k: "hand", t, x: +x.toFixed(4) || 0, y: +y.toFixed(4) || 0 }, { ttl: 20 }));
    }
    if (b.op === "fx") {                                             // una ficha: el efecto cae al momento en su partida
      const fx = String(b.fx || ""); if (!FX.includes(fx)) return res.status(400).json({ ok: false });
      const v = typeof b.v === "boolean" ? b.v : Number.isInteger(b.v) && b.v >= 0 && b.v <= 5 ? b.v : undefined;   // interruptor o contador
      return sent(await order({ k: "fx", fx, v }));
    }
    if (b.op === "ch") {                                             // un reto del juego: se monta en su ronda al momento y se queda hasta quitarlo
      const ch = String(b.ch || ""); if (ch !== "*" && !CH.includes(ch)) return res.status(400).json({ ok: false });
      const v = ch === "*" ? 0 : Number.isInteger(b.v) && b.v >= 0 && b.v <= 3 ? b.v : 0;
      return sent(await order({ k: "ch", ch, v }));
    }
    if (b.op === "gift") {                                           // fichas de oro para ponerse guapo: la orden llega por el latido y se cobra una sola vez (id)
      const n = b.n === undefined ? 300 : b.n; if (!Number.isInteger(n) || n < 1 || n > 5000) return res.status(400).json({ ok: false });
      return sent(await order({ k: "gift", n, id: crypto.randomBytes(6).toString("hex") }, { needLive: true, ttl: 300, log: "Regalo de la casa: " + n + " fichas de oro" }));   // si ya no esta, no se guarda nada para nadie
    }
    if (b.op === "act") {                                            // el crupier y Comodin, al momento: gesto, cara, mirada, humor, Comodin, ropa, puntero, mesa, huevo o trastada
      const a = String(b.a || ""), v = actVal(a, b.v === undefined ? undefined : b.v); if (v === undefined) return res.status(400).json({ ok: false });
      return sent(await order({ k: "act", a, v }));
    }
    if (b.op === "say") {
      const t = [...String(b.t || "").normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/[<>]/g, "").replace(/\s+/g, " ").trim()].slice(0, 160).join("");
      const e = WORD.test(b.e || "") ? b.e || "" : "", g = GEST.test(b.g || "") ? b.g : "", s = STY.includes(b.s) ? b.s : "", p = POS.includes(b.p) ? b.p : "", li = LI.test(b.li || "") ? b.li : "";
      if (!t) return res.status(400).json({ ok: false });
      return sent(await order({ t, e, g, s, p, ...(li ? { li } : {}) }, { log: t }));   // li: una frase del juego por su clave: le llega en SU idioma (t, en espanol, si su version no la tiene)
    }
    res.status(400).json({ ok: false });
  } catch (e) { res.status(502).json({ ok: false, reason: "kv" }); }
};
