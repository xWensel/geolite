/*
 * Geolite - puente con Steamworks (solo existe dentro de Electron, via
 * preload.js + IPC; en el navegador normal window.geoliteHost no existe
 * y A.steam se queda sin definir, exactamente como antes).
 */
window.AIQ = window.AIQ || {};
if (window.geoliteHost && window.geoliteHost.steamUnlock) {
  window.AIQ.steam = { unlock: (id) => window.geoliteHost.steamUnlock(id) };
}
/* INVITACIONES a La mesa (js/mesa8.js): el escritorio entrega el codigo de una sala (main.js: arrancar con --mesa=CODIGO o +mesa CODIGO, tambien con
   el juego ya abierto; el dia que haya App ID, la invitacion de Steam acaba en ese mismo aviso). En la web no hay geoliteHost y esto no hace nada. */
if (window.geoliteHost && window.geoliteHost.onInvite) {
  const give = (code) => { let n = 0; const t = () => { const m = window.AIQ.mesa8; if (m && m.invite) m.invite(code); else if (++n < 150) setTimeout(t, 200); }; t(); };
  window.geoliteHost.onInvite(give);
  try { const c = window.geoliteHost.invite && window.geoliteHost.invite(); if (c) give(c); } catch (e) { /* sin invitacion */ }
}
