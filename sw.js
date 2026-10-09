/* Geolite - service worker: funciona sin conexion (cache de la app) y se actualiza solo. */
const CACHE = "geolite-v0.3.45";
const CORE = [
  "./", "index.html", "manifest.webmanifest", "css/style.css", "css/boot.css", "css/skins.css", "css/codex.css", "css/hub.css", "css/premium.css", "css/challenges.css", "css/uikit.css", "css/tour.css", "css/marcador.css", "js/marcador.js", "css/nombre.css", "js/nombre.js", "css/podio.css", "css/otrodia.css", "css/portada.css", "css/parche.css", "js/parche-data.js", "js/parche.js", "assets/icons/m_patch.webp", "js/podio.js", "js/otrodia.js", "css/salir.css", "css/final.css", "js/salir.js", "js/final.js", "css/campamento.css", "css/casino-ctl.css", "css/casino-dados.css", "css/casino-plinko.css", "css/casino-globo.css", "css/casino-rasca.css", "css/peek.css", "css/mando.css", "css/ajustes.css", "css/deck.css", "css/gala.css", "css/legible.css", "js/glifos-data.js", "js/mando-textos.js", "js/mando.js", "js/controles.js", "js/teclado.js", "js/creditos.js","js/perf.js","js/vivo.js","js/uikit.js", "js/tips.js", "js/peek.js", "js/tour.js", "js/jukebox.js", "js/profile.js", "js/rank.js", "js/relics.js", "js/challenges.js", "js/chfx.js", "js/crupier-data.js", "js/crupier.js", "js/dealer.js", "js/pointer.js", "js/casino-ctl.js", "js/adventure.js", "js/casino-dados-textos.js", "js/casino-dados.js", "js/casino-plinko-tablas.js", "js/casino-plinko-textos.js", "js/casino-plinko.js", "js/casino-globo-textos.js", "js/casino-globo.js", "js/casino-rasca-arte.js", "js/casino-rasca-textos.js", "js/casino-rasca.js", "js/hub.js", "js/icons.js", "js/i18n2.js", "js/i18n3.js", "js/i18n4.js", "js/i18n5.js", "js/i18n6.js", "js/teclas.js", "js/art.js", "data/codex.js", "data/places.js", "data/pistas.js", "data/paises-lugares.js", "data/aguas.js", "data/dificultad.js", "data/niveles.js", "data/carretes.js", "js/codex.js", "js/wiki.js",
  "js/vendor/topojson-client.min.js", "js/vendor/earcut.min.js", "data/world.js", "data/classic.js", "data/locations.js", "data/history.js", "data/classic-tr.js", "data/campaigns.js",
  "js/geo.js", "js/aguas.js", "js/i18n.js", "js/logo.js", "js/support.js", "js/audio.js", "js/map2d.js", "js/map.js", "js/skins.js", "js/gala.js", "js/game.js", "data/flags.js", "js/steam.js",
  "js/jefes.js", "assets/favicon-32.png", "assets/favicon-16.png", "assets/apple-touch-icon.png", "assets/icon-192.png", "assets/icon-512.png", "assets/logo.png", "assets/icons/logo_mark.png", "assets/icons/logo_mark_s.png", "favicon.ico",
];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                        // servicios externos: siempre red
  if (url.pathname.startsWith("/api/")) return;                      // clasificacion: siempre en vivo (una respuesta vieja haria creer que hay servidor)
  // red primero para lo propio (asi siempre hay la version mas nueva) y cache como respaldo sin conexion; las fuentes, cache primero
  const isFont = url.pathname.includes("/fonts/");
  e.respondWith(
    (isFont ? caches.match(req) : Promise.resolve(null)).then(hit => hit || fetch(req).then(res => {
      // solo respuestas enteras (200): la musica llega por trozos (206) y cache.put los rechaza; las fotos HD (~900 MB) no se guardan: solo se piden al ampliar
      if (res.status === 200 && !url.pathname.includes("/assets/wiki/hd/")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => {                                                   // sin red: solo las paginas caen a la portada (nunca un script o una imagen)
      const nav = req.mode === "navigate";                             // una pagina no puede servirse con una respuesta redirigida (Vercel manda index.html -> /)
      return caches.match(req).then(r => (r && !(nav && r.redirected) ? r : nav ? caches.match("./") : Response.error()));
    }))
  );
});
