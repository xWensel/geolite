/* POST /api/lamesa  (cuerpo text/plain con JSON, sin preflight, como api/duelo.js)
   La sala de LA MESA (js/mesa8.js): de 3 a 8 jugadores con un codigo. Un relevo minimo: cada juego saca las mismas preguntas de la misma semilla y hace
   las mismas cuentas (quien cae en cada ronda); aqui solo viven la sala, los asientos, el reloj de cada pregunta y las respuestas. Todo caduca a la hora.
     { a: "new", pid, name, ver, c, k }            abre una sala (asiento 0 = anfitrion) y devuelve su codigo
     { a: "join", pid, code, name, ver, c, k }     se sienta en el primer asiento libre (why: "none" no existe, "full" completa, "ver" versiones distintas, "play" hay partida en marcha)
     { a: "poll", pid, code, n, q }                pregunta el estado (n = partida, q = la pregunta por la que pregunta)
     { a: "deal", pid, code }                      el anfitrion reparte: empieza la partida n + 1 con los que esten en la sala (3 como minimo) y una semilla nueva
     { a: "ready", pid, code, n, q, secs, rush, wait, al }   listo para la pregunta q; al = los asientos que siguen en pie (lo calculan igual todos los juegos).
                                                   Cuando lo estan todos los de `al` (o pasan 6 s desde el primero), la pregunta empieza `wait` ms despues
     { a: "lock", pid, code, n, q, lon, lat, t }   fija su respuesta. Cuando ha fijado MEDIA MESA (de los que siguen en pie), al resto le quedan `rush` segundos
     { a: "pass", pid, code, n, q }                se le acabo el reloj sin responder
     { a: "quit", pid, code, n }                   se levanta de la partida n (sigue en la sala)
     { a: "claim", pid, code, n, seat }            ese asiento lleva mas de 15 s sin dar senal: queda fuera de la partida n
     { a: "back", pid, code, over }                de vuelta a la sala tras el veredicto (over: la partida ha terminado para todos)
     { a: "bye", pid, code }                       se levanta de la sala
   EL ANFITRION (campo h, el asiento que reparte) es quien abrio la sala; si se va o lleva mas de 30 s sin dar senal, pasa al asiento mas bajo que siga
   dando senal. La sala solo se cierra cuando no queda nadie.
   Responde el estado visto por quien pregunta: { ok, now, code, me (su asiento), host (el asiento que reparte), st, n, seed, pl (asientos de la partida), seats[8], rd }.
   seats[i] = null o { n (nombre), c (punteros), k (carta), on (da senal), ago, in (esta en la sala), out (se ha ido) }.
   rd = la pregunta q: s (empieza), e (acaba), rdy (mi «listo» esta apuntado), mine (mi respuesta esta guardada), lk (asientos que ya han fijado) y, cuando
   la pregunta se CIERRA (han respondido todos los que siguen en pie y no se han ido, o ha pasado el plazo), z = { a: { asiento: respuesta o "0" }, outs: [asientos
   que se han ido de la partida hasta ese momento] }. Las respuestas no se ensenan hasta el cierre, asi nadie responde viendo las de los demas; `outs` se
   congela en el cierre para que todos los juegos saquen a los mismos en la misma pregunta.
   Sin datos personales: pid es aleatorio en cada arranque del juego y solo se guarda el nombre que el jugador ya usa en la clasificacion. */
const kv = require("./_kv");
const crypto = require("crypto");
const TTL = 3600, START_IN = 1200, GRACE = 1500, GONE = 15000, HOST_GONE = 30000, MIN = 3, READY_MAX = 6000, BEAT = 5000;
const AB = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE = /^[A-HJKMNP-Z2-9]{5}$/, PID = /^[a-z0-9]{10,24}$/, VER = /^[\w.\-/]{1,48}$/, ROUND = /^(f|r|s|c|u|w|al|a|x|z|o):/, AL = /^[0-7](,[0-7]){0,7}$/;
const rnd = n => { const b = crypto.randomBytes(n); let s = ""; for (let i = 0; i < n; i++) s += AB[b[i] % AB.length]; return s; };
const clean = v => [...String(v == null ? "" : v).normalize("NFC").replace(/[ᅟᅠㅤﾠ]/g, "").replace(/[^\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Nd} _.'\-ー]/gu, "").replace(/\s+/g, " ").replace(/^[ _.'\-ー]+/, "").replace(/([_.'\-])\1+/g, "$1").trim()].slice(0, 16).join("").trim();   // el mismo filtro que la clasificacion (api/submit.js)
const int = (v, a, b) => { v = Math.floor(+v); return Number.isFinite(v) && v >= a && v <= b ? v : null; };
const cos = v => (/^[a-z]{1,10}(\.[a-z]{1,10}){0,3}$/.test(String(v || "")) ? String(v) : "");
const key = c => "lamesa:" + c;
const obj = a => { const o = {}; if (Array.isArray(a)) for (let i = 0; i + 1 < a.length; i += 2) o[a[i]] = String(a[i + 1]); else if (a && typeof a === "object") for (const k in a) o[k] = String(a[k]); return o; };
const run = cmds => kv.pipeline(cmds.map(c => c.map(String)));
const read = async c => obj((await run([["HGETALL", key(c)]]))[0]);
const write = async (c, cmds) => { const out = await run([...cmds, ["EXPIRE", key(c), TTL], ["HGETALL", key(c)]]); return obj(out[out.length - 1]); };
const list = s => (s ? String(s).split(",").filter(x => x !== "" && x !== "-").map(Number) : []);
const ALL = [0, 1, 2, 3, 4, 5, 6, 7];
/* cuando acaba la pregunta b ("n:q"): su plazo o, si ya ha fijado media mesa, lo que le queda al resto */
const endOf = (R, b) => { const s = +R["s:" + b] || 0; if (!s) return 0; const e = s + (+R["c:" + b] || 12) * 1000, x = +R["x:" + b] || 0; return x ? Math.min(e, x) : e; };
const outsOf = (R, n) => ALL.filter(i => R["o:" + n + ":" + i]);
/* los que tienen que responder la pregunta b: los que siguen en pie segun los juegos, menos los que se han ido de la partida */
const needOf = (R, n, b) => { const o = outsOf(R, n); return list(R["al:" + b]).filter(i => !o.includes(i)); };

function view(R, code, me, now, n, q) {
  const ago = i => Math.max(0, now - (+R["s" + i] || 0));
  const seats = ALL.map(i => (R["p" + i] ? { n: R["n" + i] || "", c: R["c" + i] || "", k: R["k" + i] || "", on: ago(i) < 10000, ago: Math.min(ago(i), 999999), in: R["r" + i] === "1", out: R["x" + i] === "1" } : null));
  const o = { ok: true, now, code, me, host: +R.h || 0, st: R.st || "lobby", n: +R.n || 0, seats };
  if (o.st === "play") { o.seed = R.seed; o.pl = list(R.pl); }
  if (n != null && n === o.n) o.outs = outsOf(R, n);
  if (q && n === o.n) {
    const b = n + ":" + q, z = R["z:" + b];
    o.rd = { q, s: +R["s:" + b] || 0, e: endOf(R, b), rdy: R["r:" + b + ":" + me] ? 1 : 0, mine: R["a:" + b + ":" + me] != null, lk: ALL.filter(i => { const a = R["a:" + b + ":" + i]; return a != null && a !== "0"; }), z: null };
    if (z != null) { const a = {}; list(R["al:" + b]).forEach(i => { a[i] = R["a:" + b + ":" + i] == null ? "0" : R["a:" + b + ":" + i]; }); o.rd.z = { a, outs: list(z) }; }
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
    if ((a === "new" || a === "join") && await kv.limited(kv.ipTag(kv.ip(req)), 20, "lamesa:")) return res.status(429).json({ ok: false, why: "rate" });   // abrir o sentarse: 20 por red y minuto
    if (a === "new") {
      for (let i = 0; i < 4; i++) {
        const code = rnd(5), got = await run([["HSETNX", key(code), "p0", pid]]);
        if (+got[0] === 1) return send(view(await write(code, [["HSET", key(code), "n0", clean(b.name), "c0", cos(b.c), "k0", kv.style(b.k), "s0", now, "r0", 1, "h", 0, "st", "lobby", "n", 0, "ver", ver]]), code, 0, now));
      }
      return res.status(503).json({ ok: false, why: "busy" });
    }
    const code = String(b.code || "").toUpperCase(); if (!CODE.test(code)) return send({ ok: false, why: "none" });
    let R = await read(code);
    if (!R.ver && !R.st) return send({ ok: false, why: "none" });
    let me = ALL.find(i => R["p" + i] === pid); if (me == null) me = -1;
    if (a === "join") {
      if (me < 0) {
        if (!ALL.some(i => R["p" + i] && R["x" + i] !== "1")) return send({ ok: false, why: "none" });   // ya no queda nadie
        if (R.ver && ver !== R.ver) return send({ ok: false, why: "ver" });
        if (R.st === "play") return send({ ok: false, why: "play" });
        for (const i of ALL) {                                            // el primer asiento libre (vacio, o de alguien que ya se fue); si entran dos a la vez, se sienta el primero
          if (R["p" + i] && R["x" + i] !== "1") continue;
          if (R["p" + i]) await run([["HDEL", key(code), "p" + i, "n" + i, "c" + i, "k" + i, "s" + i, "x" + i, "r" + i]]);
          const got = await run([["HSETNX", key(code), "p" + i, pid], ["HGET", key(code), "p" + i]]);
          if (got[1] === pid) { me = i; break; }
        }
        if (me < 0) return send({ ok: false, why: "full" });
        R = await write(code, [["HSET", key(code), "n" + me, clean(b.name), "c" + me, cos(b.c), "k" + me, kv.style(b.k), "s" + me, now, "r" + me, 1]]);
      }
      return send(view(R, code, me, now));
    }
    if (me < 0) return send({ ok: false, why: "out" });
    const n = int(b.n, 0, 1e6), q = int(b.q, 1, 99), bk = n + ":" + q, play = R.st === "play" && n === (+R.n || 0), live = play && q != null, pl = list(R.pl), cmds = [];
    const here = i => R["p" + i] && R["x" + i] !== "1" && R["r" + i] === "1";
    /* el relevo: si el anfitrion se ha ido (o se va ahora, o lleva 30 s sin dar senal), reparte el asiento mas bajo que siga dando senal */
    let host = +R.h || 0;
    { const up = i => R["p" + i] && R["x" + i] !== "1" && !(a === "bye" && i === me) && (i === me || now - (+R["s" + i] || 0) < GONE);
      if (!up(host) && (a === "bye" && host === me || !R["p" + host] || R["x" + host] === "1" || now - (+R["s" + host] || 0) > HOST_GONE)) { const nh = ALL.find(up); if (nh != null && nh !== host) { host = nh; cmds.push(["HSET", key(code), "h", nh]); } } }
    if (a === "deal" && me === host) {
      const done = R.st !== "play" || pl.every(i => R["o:" + R.n + ":" + i] || R["x" + i] === "1" || R["r" + i] === "1");   // sin partida, o la anterior ya no la juega nadie
      const who = ALL.filter(here);
      if (done && who.length >= MIN) {
        const old = Object.keys(R).filter(f => ROUND.test(f)); if (old.length) cmds.push(["HDEL", key(code), ...old]);
        cmds.push(["HSET", key(code), "st", "play", "n", (+R.n || 0) + 1, "seed", rnd(8), "pl", who.join(","), ...who.flatMap(i => ["r" + i, 0])]);
      }
    } else if (a === "back") {
      cmds.push(["HSET", key(code), "r" + me, 1]);
      if (R.st === "play") { if (b.over) cmds.push(["HSET", key(code), "st", "lobby"]); else if (pl.includes(me)) cmds.push(["HSETNX", key(code), "o:" + R.n + ":" + me, 1]); }   // vuelve con la partida en marcha: fuera de ella
    } else if (a === "bye") {
      if (R.st === "play" && pl.includes(me)) cmds.push(["HSETNX", key(code), "o:" + R.n + ":" + me, 1]);
      if (!(R.st === "play" && pl.includes(me))) cmds.push(["HDEL", key(code), "p" + me, "n" + me, "c" + me, "k" + me, "s" + me, "x" + me, "r" + me]);   // en la sala, el asiento queda libre
      else cmds.push(["HSET", key(code), "x" + me, 1]);
    } else if (a === "quit" && play && pl.includes(me)) cmds.push(["HSETNX", key(code), "o:" + n + ":" + me, 1]);
    else if (a === "claim" && play) { const s = int(b.seat, 0, 7); if (s != null && s !== me && pl.includes(s) && now - (+R["s" + s] || 0) > GONE) cmds.push(["HSETNX", key(code), "o:" + n + ":" + s, 1]); }
    else if (a === "ready" && live && pl.includes(me)) {
      const secs = int(b.secs, 3, 120), rush = int(b.rush, 1, 60), wait = int(b.wait, 0, 30000), al = AL.test(String(b.al || "")) ? String(b.al) : null;
      if (secs != null && rush != null && al && list(al).every(i => pl.includes(i))) {
        R = await write(code, [["HSETNX", key(code), "r:" + bk + ":" + me, 1], ["HSETNX", key(code), "c:" + bk, secs], ["HSETNX", key(code), "u:" + bk, rush], ["HSETNX", key(code), "al:" + bk, al], ["HSETNX", key(code), "f:" + bk, now], ["HSETNX", key(code), "w:" + bk, wait || 0]]);
      }
    } else if ((a === "lock" || a === "pass") && live && R["s:" + bk] && R["z:" + bk] == null && R["a:" + bk + ":" + me] == null && needOf(R, n, bk).includes(me)) {
      const s = +R["s:" + bk], late = now > endOf(R, bk) + GRACE, lon = +b.lon, lat = +b.lat, t = +b.t;
      const good = a === "lock" && !late && now >= s - 500 && Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lat) <= 90 && Math.abs(lon) <= 720 && Number.isFinite(t) && t >= 0 && t <= 200;
      R = await write(code, [["HSETNX", key(code), "a:" + bk + ":" + me, good ? JSON.stringify({ lon, lat, t }) : "0"]]);
      const need = needOf(R, n, bk), locked = need.filter(i => { const v = R["a:" + bk + ":" + i]; return v != null && v !== "0"; }).length;
      if (good && locked >= Math.ceil(need.length / 2)) cmds.push(["HSETNX", key(code), "x:" + bk, now + (+R["u:" + bk] || 5) * 1000]);   // ha fijado media mesa: lo que le queda al resto
    }
    if (live) {
      /* la pregunta empieza cuando estan listos todos los que siguen en pie (o 6 s despues del primero, para que uno colgado no pare la mesa) */
      if (R["f:" + bk] && !R["s:" + bk]) { const need = needOf(R, n, bk); if (need.every(i => R["r:" + bk + ":" + i]) || now - (+R["f:" + bk] || 0) > READY_MAX) cmds.push(["HSETNX", key(code), "s:" + bk, now + Math.max(START_IN, +R["w:" + bk] || 0)]); }
      /* y se cierra cuando han respondido todos ellos o ha pasado el plazo: quien falte se queda en blanco, y se congela quien se ha ido */
      if (R["s:" + bk] && R["z:" + bk] == null) {
        const need = needOf(R, n, bk), miss = need.filter(i => R["a:" + bk + ":" + i] == null);
        if (!miss.length || now > endOf(R, bk) + GRACE) { for (const i of miss) cmds.push(["HSETNX", key(code), "a:" + bk + ":" + i, "0"]); cmds.push(["HSETNX", key(code), "z:" + bk, outsOf(R, n).join(",") || "-"]); }
      }
    }
    if (cmds.length) R = await write(code, a === "bye" ? cmds : [...cmds, ["HSET", key(code), "s" + me, now]]);
    else if (now - (+R["s" + me] || 0) > BEAT) { await run([["HSET", key(code), "s" + me, now], ["EXPIRE", key(code), TTL]]); R["s" + me] = String(now); }
    if (a === "bye") return send({ ok: true, now, bye: 1 });
    send(view(R, code, me, now, n, q));
  } catch (e) { res.status(502).json({ ok: false, why: "kv" }); }
};
