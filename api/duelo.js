/* POST /api/duelo  (cuerpo text/plain con JSON, sin preflight: el juego de escritorio llama desde http://127.0.0.1)
   La sala privada del Duelo de fichas (js/duelo-red.js): un relevo minimo entre DOS jugadores. Cada cliente saca las mismas preguntas de la misma
   semilla y hace las mismas cuentas; aqui solo viven la sala, el reloj de cada ronda y las dos respuestas. Todo caduca a la hora.
     { a: "new", pid, name, ver, t }            abre una sala y devuelve su codigo (5 letras o cifras, sin las que se confunden)
     { a: "join", pid, code, name, ver }        el invitado se sienta (why: "none" no existe, "full" completa, "ver" versiones distintas)
     { a: "poll", pid, code, n, k }             pregunta el estado (n = duelo, k = la ronda por la que pregunta)
     { a: "set", pid, code, t }                 el anfitrion cambia de mesa (solo en la sala)
     { a: "deal", pid, code }                   el anfitrion reparte: empieza el duelo n + 1 con una semilla nueva (los dos tienen que estar en la sala)
     { a: "ready", pid, code, n, k, secs, rush, wait }   listo para la ronda k: cuando lo estan los dos, la ronda empieza `wait` ms despues (hora del servidor)
     { a: "lock", pid, code, n, k, lon, lat, t } fija su respuesta. La primera que llega deja al otro como mucho `rush` segundos
     { a: "pass", pid, code, n, k }             se le acabo el reloj sin responder
     { a: "quit", pid, code, n }                se rinde en el duelo n (sigue en la sala)
     { a: "claim", pid, code, n }               el otro lleva mas de 15 s sin dar senal: pierde el duelo n por abandono
     { a: "back", pid, code }                   de vuelta a la sala tras el veredicto
     { a: "bye", pid, code }                    se levanta (el invitado deja el asiento libre; si se va el anfitrion, la sala se cierra)
   Responde el estado visto por quien pregunta: { ok, now, code, role, st, n, t, seed, h, g, quit, rd }. now = hora del servidor (los clientes la usan
   para poner el mismo reloj). h / g = los asientos: n (nombre), on (da senal), ago (ms desde la ultima), in (esta en la sala) y out (se ha ido).
   quit = quien ha perdido el duelo n por rendirse o por abandono ("me" o "his"; con gone: true, por llevar demasiado sin dar senal). rd = la ronda k: s (empieza), e (acaba), me (mi respuesta),
   his.lk (el otro ya ha fijado) y his.a (su respuesta: solo se ensena cuando la mia ya esta guardada, asi nadie responde viendo la del otro).
   Pasado el final de la ronda, quien no haya respondido se queda sin respuesta ("0"). Sin datos personales: pid es aleatorio en cada arranque del
   juego y solo se guarda el nombre que el jugador ya usa en la clasificacion. */
const kv = require("./_kv");
const crypto = require("crypto");
const TTL = 3600, START_IN = 1200, GRACE = 1500, GONE = 15000;
const AB = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE = /^[A-HJKMNP-Z2-9]{5}$/, PID = /^[a-z0-9]{10,24}$/, TABLE = /^[a-z]{2,12}$/, VER = /^[\w.\-/]{1,48}$/, ROUND = /^(s|c|u|x|r|a|q):/;
const rnd = n => { const b = crypto.randomBytes(n); let s = ""; for (let i = 0; i < n; i++) s += AB[b[i] % AB.length]; return s; };
const clean = v => [...String(v == null ? "" : v).normalize("NFC").replace(/[^\p{L}\p{N} _.'\-]/gu, "").replace(/\s+/g, " ").trim()].slice(0, 20).join("").trim();   // el mismo filtro que la clasificacion (api/submit.js)
const int = (v, a, b) => { v = Math.floor(+v); return Number.isFinite(v) && v >= a && v <= b ? v : null; };
const key = c => "duelo:" + c;
const obj = a => { const o = {}; if (Array.isArray(a)) for (let i = 0; i + 1 < a.length; i += 2) o[a[i]] = String(a[i + 1]); else if (a && typeof a === "object") for (const k in a) o[k] = String(a[k]); return o; };
const run = cmds => kv.pipeline(cmds.map(c => c.map(String)));
const read = async c => obj((await run([["HGETALL", key(c)]]))[0]);
const write = async (c, cmds) => { const out = await run([...cmds, ["EXPIRE", key(c), TTL], ["HGETALL", key(c)]]); return obj(out[out.length - 1]); };
/* cuando acaba la ronda b ("n:k"): su plazo o, si alguien ya ha fijado, lo que le queda al otro */
const endOf = (R, b) => { const s = +R["s:" + b] || 0; if (!s) return 0; const e = s + (+R["c:" + b] || 15) * 1000, x = +R["x:" + b] || 0; return x ? Math.min(e, x) : e; };

function view(R, code, role, now, n, k) {
  const other = role === "h" ? "g" : "h", ago = r => Math.max(0, now - (+R[r + "s"] || 0));
  const seat = r => (R[r] ? { n: R[r + "n"] || "", on: ago(r) < 10000, ago: Math.min(ago(r), 999999), in: R[r + "r"] === "1", out: R[r + "x"] === "1" } : null);
  const o = { ok: true, now, code, role, st: R.st || "lobby", n: +R.n || 0, t: R.t || "media", h: seat("h"), g: seat("g") };
  if (o.st === "play") o.seed = R.seed;
  if (n != null && n === o.n) { const q = R["q:" + n]; if (q) { o.quit = q[0] === role ? "me" : "his"; if (q[1] === "!") o.gone = true; } }
  if (k && n === o.n && o.st === "play") {
    const b = n + ":" + k, me = R["a:" + b + ":" + role], his = R["a:" + b + ":" + other];
    o.rd = { k, s: +R["s:" + b] || 0, e: endOf(R, b), me: me == null ? null : me, his: his == null ? null : { lk: his !== "0", a: me != null ? his : undefined },
      rdy: [R["r:" + b + ":" + role] ? 1 : 0, R["r:" + b + ":" + other] ? 1 : 0] };
  }
  return o;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.setHeader("Access-Control-Allow-Methods", "POST"); res.setHeader("Access-Control-Allow-Headers", "content-type"); return res.status(204).end(); }
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!kv.configured) return res.status(503).json({ ok: false, why: "off" });
  let b; try { b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}; } catch (e) { return res.status(400).json({ ok: false }); }
  if (!b || typeof b !== "object" || !PID.test(String(b.pid || ""))) return res.status(400).json({ ok: false });
  const pid = b.pid, a = String(b.a || ""), now = Date.now(), ver = VER.test(String(b.ver || "")) ? String(b.ver) : "", send = o => res.status(200).json(o);
  try {
    if (a === "new") {
      const t = TABLE.test(String(b.t || "")) ? b.t : "media";
      for (let i = 0; i < 4; i++) {
        const code = rnd(5), got = await run([["HSETNX", key(code), "h", pid], ["EXPIRE", key(code), TTL]]);
        if (+got[0] === 1) return send(view(await write(code, [["HSET", key(code), "hn", clean(b.name), "hs", now, "hr", 1, "st", "lobby", "n", 0, "t", t, "ver", ver]]), code, "h", now));
      }
      return res.status(503).json({ ok: false, why: "busy" });
    }
    const code = String(b.code || "").toUpperCase(); if (!CODE.test(code)) return send({ ok: false, why: "none" });
    let R = await read(code);
    if (!R.h || R.hx === "1") return send({ ok: false, why: "none" });   // no existe, ha caducado o el anfitrion la cerro
    if (a === "join") {
      if (R.h !== pid) {
        if (R.ver && ver !== R.ver) return send({ ok: false, why: "ver" });
        if (R.g && R.g !== pid && R.gx !== "1") return send({ ok: false, why: "full" });
        if (R.g && R.g !== pid) await run([["HDEL", key(code), "g", "gn", "gs", "gx", "gr"]]);       // el invitado anterior se fue a medio duelo: su asiento queda libre
        const got = await run([["HSETNX", key(code), "g", pid], ["HGET", key(code), "g"]]);          // si entran dos a la vez, se sienta el primero
        if (got[1] !== pid) return send({ ok: false, why: "full" });
        R = await write(code, [["HSET", key(code), "gn", clean(b.name), "gs", now, "gr", 1], ["HDEL", key(code), "gx"]]);
      }
      return send(view(R, code, R.h === pid ? "h" : "g", now));
    }
    const role = R.h === pid ? "h" : R.g === pid ? "g" : null; if (!role) return send({ ok: false, why: "out" });
    const other = role === "h" ? "g" : "h", n = int(b.n, 0, 1e6), k = int(b.k, 1, 99), bk = n + ":" + k, play = R.st === "play" && n === (+R.n || 0), live = play && k != null, cmds = [];
    if (a === "set" && role === "h" && R.st !== "play" && TABLE.test(String(b.t || ""))) cmds.push(["HSET", key(code), "t", b.t]);
    else if (a === "deal" && role === "h" && R.st !== "play" && R.g && R.gx !== "1" && R.gr === "1") {
      const old = Object.keys(R).filter(f => ROUND.test(f)); if (old.length) cmds.push(["HDEL", key(code), ...old]);   // las rondas del duelo anterior ya no hacen falta
      cmds.push(["HSET", key(code), "st", "play", "n", (+R.n || 0) + 1, "seed", rnd(8), "hr", 0, "gr", 0]);
    } else if (a === "back") {
      cmds.push(["HSET", key(code), role + "r", 1, "st", "lobby"]);
      if (role === "h" && R.gx === "1") cmds.push(["HDEL", key(code), "g", "gn", "gs", "gx", "gr"]);                    // el invitado se fue a medio duelo: asiento libre
    } else if (a === "bye") {
      if (role === "g" && R.st !== "play") cmds.push(["HDEL", key(code), "g", "gn", "gs", "gx", "gr"]);                 // en la sala, el asiento queda libre
      else cmds.push(["HSET", key(code), role + "x", 1]);
    } else if (a === "quit" && play) cmds.push(["HSETNX", key(code), "q:" + n, role]);
    else if (a === "claim" && play && R[other] && now - (+R[other + "s"] || 0) > GONE) cmds.push(["HSETNX", key(code), "q:" + n, other + "!"]);
    else if (a === "ready" && live) {
      const secs = int(b.secs, 3, 120), rush = int(b.rush, 1, 60), wait = int(b.wait, 0, 30000);
      if (secs != null && rush != null) {
        R = await write(code, [["HSETNX", key(code), "r:" + bk + ":" + role, 1], ["HSETNX", key(code), "c:" + bk, secs], ["HSETNX", key(code), "u:" + bk, rush]]);
        if (R["r:" + bk + ":h"] && R["r:" + bk + ":g"] && !R["s:" + bk]) cmds.push(["HSETNX", key(code), "s:" + bk, now + Math.max(START_IN, wait || 0)]);   // listos los dos: la ronda empieza para ambos a la misma hora
      }
    } else if ((a === "lock" || a === "pass") && live && R["s:" + bk] && R["a:" + bk + ":" + role] == null) {
      const s = +R["s:" + bk], late = now > endOf(R, bk) + GRACE, lon = +b.lon, lat = +b.lat, t = +b.t;
      const good = a === "lock" && !late && now >= s - 500 && Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lat) <= 90 && Math.abs(lon) <= 720 && Number.isFinite(t) && t >= 0 && t <= 200;
      cmds.push(["HSETNX", key(code), "a:" + bk + ":" + role, good ? JSON.stringify({ lon, lat, t }) : "0"]);
      if (good) cmds.push(["HSETNX", key(code), "x:" + bk, now + (+R["u:" + bk] || 5) * 1000]);   // el primero que fija marca lo que le queda al otro
    }
    /* se acabo la ronda (plazo y margen): quien no haya respondido se queda sin respuesta */
    if (live && R["s:" + bk] && now > endOf(R, bk) + GRACE) for (const r of ["h", "g"]) if (R["a:" + bk + ":" + r] == null) cmds.push(["HSETNX", key(code), "a:" + bk + ":" + r, "0"]);
    if (cmds.length) R = await write(code, a === "bye" ? cmds : [...cmds, ["HSET", key(code), role + "s", now]]);
    else if (now - (+R[role + "s"] || 0) > 4000) { await run([["HSET", key(code), role + "s", now], ["EXPIRE", key(code), TTL]]); R[role + "s"] = String(now); }   // sigo aqui (el otro me ve conectado); sin releer la sala
    if (!R.h) return send({ ok: false, why: "none" });
    send(view(R, code, role, now, n, k));
  } catch (e) { res.status(502).json({ ok: false, why: "kv" }); }
};
