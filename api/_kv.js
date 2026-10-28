/* Cliente minimo de Upstash Redis (REST). Variables de entorno: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
   (o las KV_REST_API_URL / KV_REST_API_TOKEN que crea la integracion de Vercel). Sin ellas la API responde 503 y el juego usa la clasificacion local. */
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
exports.configured = !!(URL_ && TOKEN);
/* la IP de quien envia, cifrada con el token de Redis como sal (secreto del servidor): sirve para vetar a un tramposo sin guardar IPs en claro */
exports.ipTag = ip => require("crypto").createHmac("sha256", String(TOKEN || "x")).update("ip:" + ip).digest("hex").slice(0, 16);
/* la IP de la peticion (la primera de x-forwarded-for, que pone Vercel) y su tag: TODAS las claves de Redis que se cuentan por red usan el tag, nunca la IP */
exports.ip = req => String((req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "x").slice(0, 45);
/* limite de peticiones por red y minuto (v0.3.235): devuelve true si esta red ya paso de `max` en este minuto. El contador caduca siempre a los 2 min,
   pase lo que pase despues (antes, en api/submit.js, iba dentro de la misma pipeline que el resto; aqui va solo, para que duelo y vivo lo compartan) */
exports.limited = async (tag, max, name) => { const k = "rl:" + (name || "") + tag + ":" + Math.floor(Date.now() / 60000); const [n] = await exports.pipeline([["INCR", k], ["EXPIRE", k, 120]]); return n > max; };
exports.pipeline = async cmds => {
  const r = await fetch(URL_ + "/pipeline", { method: "POST", headers: { Authorization: "Bearer " + TOKEN, "content-type": "application/json" }, body: JSON.stringify(cmds), signal: AbortSignal.timeout(4000) });   // Redis colgado: 502 en vez de dejar la funcion esperando
  if (!r.ok) throw new Error("kv " + r.status);
  return (await r.json()).map(x => x.result);
};
/* las clasificaciones del juego: la Aventura de siempre (adv-all), la Aventura de cada dia (advd-, Hoy / Ayer de la Aventura) y el Reto diario
   (daily-, suma de sus 3 intentos). day- (la mejor partida del dia de cualquier modo) solo se acepta de versiones anteriores del juego */
exports.BOARD = /^(daily-\d{8}|advd-\d{8}|day-\d{8}|adv-all)$/;
/* v0.3.174: el estilo de la carta del socio (js/socio.js, code): «categoria.marco.icono.titulo.nivel». Solo forma; el juego valida cada pieza al pintarla */
exports.STYLE = /^\d{1,2}\.[a-z]{1,12}\.[a-z0-9_]{1,32}\.[a-z]{1,12}\.\d{1,4}(\.\d{1,3}\.\d{1,3}\.\d)?$/;   // v2: + carta.fondo.material (El camino del socio)
exports.style = v => (exports.STYLE.test(String(v || "")) ? String(v) : "");
