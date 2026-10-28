/* Geolite - lo primero que corre, antes de pintar nada (v0.3.235: antes eran dos <script> en linea en index.html; fuera de el, la
 * Content-Security-Policy del juego puede prohibir todo script en linea).
 *  - Steam Deck (v0.2.32): la marca en <html data-dev="deck"> antes del primer fotograma (css/deck.css sube la letra pequena).
 *  - La pantalla de carga (#splash, negro): si a los 20 s el juego no la ha quitado, se quita sola (nunca una pantalla negra para siempre). */
try { if (window.geoliteHost && window.geoliteHost.device === "deck") document.documentElement.dataset.dev = "deck"; } catch (e) { /* sin Electron */ }
setTimeout(function () { var e = document.getElementById("splash"); if (e) e.remove(); }, 20000);
