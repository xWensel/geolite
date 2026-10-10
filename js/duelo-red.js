/*
 * Geolite - DUELO DE FICHAS: el transporte de la sala privada (un amigo, con un codigo). Solo lleva mensajes entre el juego y api/duelo.js y
 * pone en hora el reloj de los dos; de la sala, las rondas y las fichas se ocupa js/duelo.js. El dia que se invite por Steam, lo que cambia es
 * este fichero (misma interfaz: call, now, perfAt, bye).
 *  - call(cuerpo): POST con JSON en text/plain (sin preflight, como js/vivo.js). Devuelve la respuesta del servidor o { ok: false, why: "net" }.
 *  - El reloj: cada respuesta trae la hora del servidor; con la de menos ida y vuelta se calcula el desfase. now() = hora del servidor ahora;
 *    perfAt(t) = ese instante del servidor en el reloj de la pagina (performance.now()).
 *  - Quien eres: un identificador al azar en cada arranque del juego (no se guarda ni identifica a nadie).
 * La direccion: /api/duelo en la web; desde el juego de escritorio, la de la web publicada. "atlasiq.duelo.api" (localStorage) la cambia para pruebas.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const SITE = "https://geolite-game.vercel.app", KEY = "atlasiq.duelo.api";
  const LOCAL = typeof location === "undefined" || !/^https?:$/.test(location.protocol) || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const url = () => { let u = ""; try { u = localStorage.getItem(KEY) || ""; } catch (e) { /* sin almacenamiento */ } return u || (LOCAL ? SITE : "") + "/api/duelo"; };
  const pid = (() => { const AB = "abcdefghijklmnopqrstuvwxyz0123456789", b = new Uint8Array(16); crypto.getRandomValues(b); return [...b].map(x => AB[x % 36]).join(""); })();
  let off = 0, best = Infinity;
  async function call(body) {
    const c = new AbortController(), k = setTimeout(() => c.abort(), 5000), p0 = performance.now(), d0 = Date.now();
    try {
      const r = await fetch(url(), { method: "POST", body: JSON.stringify({ ...body, pid }), headers: { "content-type": "text/plain" }, signal: c.signal }), j = await r.json(), rtt = performance.now() - p0;
      if (j && j.now) { if (rtt <= best) { best = rtt; off = j.now - (d0 + rtt / 2); } else best *= 1.02; }   // la mejor medida manda; se va olvidando por si la red cambia
      return j && typeof j === "object" ? j : { ok: false, why: "net" };
    } catch (e) { return { ok: false, why: "net" }; } finally { clearTimeout(k); }
  }
  A.dueloRed = { call, now: () => Date.now() + off, perfAt: t => performance.now() + (t - Date.now() - off),
    bye: body => { try { navigator.sendBeacon(url(), JSON.stringify({ ...body, pid })); } catch (e) { /* al cerrar: si no sale, la sala caduca sola */ } } };
})(window.AIQ);
