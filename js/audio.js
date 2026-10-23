/*
 * Geolite - identidad sonora: «Lounge dorado» (Bloque F, v0.3.191).
 * Los efectos se sintetizan en el navegador; la musica son las 22 pistas fijas de la BSO (assets/music/*.mp3),
 * obra del autor del juego (creada con AKAI): aqui solo se integran y reproducen.
 *  - La familia sale de la cancion 1: su piano electrico FM con la cinta que ondula, vibrafono, fichas y cartas grabadas (Kenney "Casino Audio",
 *    CC0: assets/sfx/sala.mp3, igualadas y con el ataque buscado al cargar), un grave que se siente mas que se oye y un toque de 8 bits solo en
 *    los premios y en la bandera. Nada de campanas metalicas agudas, pitidos cuadrados sueltos ni barridos de ruido.
 *  - Todo afina con la cancion que suena (TONOS: la pentatonica que encaja con cada una, segun `cur`) y nunca suena dos veces igual (fichas al
 *    azar sin repetir, afinacion, fuerza y lado). Firma de la casa: sol-do-re en Do; en otra cancion, su equivalente.
 *  - Mezcla: la musica al frente. Cada efecto tiene su escalon en dB sobre la musica (NIVEL; LEG para los de la regla). El nivel absoluto deja la
 *    mediana de la musica en ~-31 LUFS y un limitador final no deja pasar de -1 dBFS. La musica solo se agacha un poco con los premios.
 *  - Estereo: lo que pasa a la izquierda suena a la izquierda (la x del puntero o del elemento); los premios se abren a los dos lados.
 *  - Los resultados tienen FORMA propia, para reconocerlos sin mirar: mal = una nota plana, bien = dos que suben, muy bien = tres y el acorde,
 *    diana = golpe, glissando y 8 bits; fallo grande = dos graves que caen; tiempo agotado = el reloj y una nota grave.
 *  - Los efectos sin version nueva (retos, globo, rasca y el resto del casino) llevan la regla: dos pasos bajos hacia 4,2 kHz y su escalon.
 *  - Cada cancion tiene su momento (portada, actos, jefe, victoria) y su correccion de volumen: ver GROUPS mas abajo (v0.3.55).
 *  - Debajo de la musica suena la sala (fichas, cartas, alguna copa): A.amb, al final.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const PENTA = [0, 2, 4, 7, 9];
  const MOTIF = [67, 72, 74];                       // sol-do-re: la "firma" de Geolite (en los efectos de la regla)
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const scaleNote = (i, base = 60) => base + 12 * Math.floor(i / 5) + PENTA[((i % 5) + 5) % 5];
  const R = () => Math.random();

  let ctx = null, master, sfxBus, revFx, musBus, musFilter, revIn, outTap, sala = null;
  A.audio = { sfxOn: true, musicOn: true, vol: { master: 0.85, music: 0.7, sfx: 0.9 } };
  const MUS_BASE = 0.55;
  /* mezcla (Bloque F): LOUD sube el conjunto 13 dB (la musica pasa de -44 a -31 LUFS de mediana) y SFX_K coloca los efectos para que, con los
     reguladores de fabrica, cada uno suene a su escalon exacto sobre la musica (medido con el mismo medidor de la maqueta) */
  const LOUD = Math.pow(10, 13 / 20), SFX_K = 1.6;
  const LIM_MK = 1.14;                              // dB que el compresor del navegador suma solo (makeup de un limitador a -2 dB, 20:1): se deshacen

  /* la sala calida: ruido que decae y se oscurece al caer (paso bajo que baja de 7 kHz a 1,2 kHz), con 14 ms de predelay. Sin siseo */
  function impulseWarm(sec) {
    const sr = ctx.sampleRate, n = Math.floor(sr * sec), pre = Math.floor(sr * 0.014), b = ctx.createBuffer(2, n, sr);
    const dk = Math.exp(-1 / (sr * 0.32)), fk = Math.pow(1200 / 7000, 1 / (n - pre)), w = -2 * Math.PI / sr;
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let y = 0, e = 1, fc = 7000;
      for (let i = pre; i < n; i++) { y += (1 - Math.exp(w * fc)) * ((Math.random() * 2 - 1) * e - y); d[i] = y; e *= dk; fc *= fk; }
    }
    return b;
  }
  /* el tope de la salida: lineal hasta -2 dBFS y una curva suave que nunca pasa de -1 dBFS (lo que el limitador no llegue a coger) */
  function capCurve() {
    const N = 4097, c = new Float32Array(N), a = Math.pow(10, -2 / 20), top = Math.pow(10, -1 / 20), k = top - a;
    for (let i = 0; i < N; i++) { const x = (i / (N - 1)) * 2 - 1, ax = Math.abs(x); c[i] = ax <= a ? x : Math.sign(x) * (a + k * Math.tanh((ax - a) / k)); }
    return c;
  }
  let noiseBuf = null, nb = null, wobN = null;
  function init() {
    if (ctx) { if (ctx.state === "suspended" && !document.hidden) ctx.resume(); return true; }   // con la pestana oculta sigue callado (un efecto suelto no lo despierta)
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = A.audio.vol.master;
    /* la salida: +13 dB, el limitador (con su compensacion deshecha) y el tope suave en -1 dBFS */
    const loud = ctx.createGain(), lim = ctx.createDynamicsCompressor(), undo = ctx.createGain(), cap = ctx.createWaveShaper();
    loud.gain.value = LOUD; undo.gain.value = Math.pow(10, -LIM_MK / 20); cap.curve = capCurve();
    lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.15;
    master.connect(loud).connect(lim).connect(undo).connect(cap).connect(ctx.destination); outTap = cap;
    /* la sala calida (una sola para efectos y ambiente) */
    const rv = ctx.createConvolver(); rv.buffer = impulseWarm(1.7);
    const rvOut = ctx.createGain(); rvOut.gain.value = 0.55;
    revIn = ctx.createGain(); revIn.connect(rv); rv.connect(rvOut).connect(master);
    /* los efectos: su bus seco y su envio a la sala siguen al regulador de Efectos */
    sfxBus = ctx.createGain(); sfxBus.gain.value = A.audio.vol.sfx * SFX_K; sfxBus.connect(master);
    revFx = ctx.createGain(); revFx.gain.value = A.audio.vol.sfx * SFX_K; revFx.connect(revIn);
    musFilter = ctx.createBiquadFilter(); musFilter.type = "lowpass"; musFilter.frequency.value = 8600;
    musBus = ctx.createGain(); musBus.gain.value = MUS_BASE * A.audio.vol.music; musBus.connect(musFilter).connect(master);
    /* lo que las voces comparten se prepara ya, detras de la pantalla de carga (nada se crea a mitad de partida): el ruido, la cinta que ondula */
    const mk = len => { const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
    noiseBuf = mk(2); nb = mk(1);
    { const s = ctx.createOscillator(), f = ctx.createOscillator(), g1 = ctx.createGain(), g2 = ctx.createGain(); wobN = ctx.createGain();
      s.frequency.value = 0.55; g1.gain.value = 7; f.frequency.value = 6.2; g2.gain.value = 2; s.connect(g1).connect(wobN); f.connect(g2).connect(wobN); s.start(); f.start(); }
    /* las fichas y cartas de verdad (las mismas del ambiente): se igualan al cargar */
    fetch(A.media("assets/sfx/sala.mp3")).then(r => (r.ok ? r.arrayBuffer() : Promise.reject())).then(b => ctx.decodeAudioData(b)).then(b => { NORM = normSala(b); sala = b; }).catch(() => { /* sin el archivo, la mano sobre el fieltro las sustituye */ });
    pubCarga();                                                       // el publico de la sala (v0.3.201), en segundo plano
    /* pestana oculta: se suspende el audio y se pausa la cancion (si no, seguiria avanzando en silencio y encadenando pistas sin que nadie las oiga) */
    let hidPlay = [];
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) { hidPlay = decks.filter(d => d && !d.el.paused); hidPlay.forEach(pauseAll); ctx.suspend(); }
      else { ctx.resume(); if (A.audio.musicOn) hidPlay.forEach(playAll); hidPlay = []; }
    });
    return true;
  }

  /* ------------------------------------------------------------------ voces de la familia */
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
  }
  const panTo = (node, pan) => { if (!pan) return node; const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); node.connect(p); return p; };
  /* piano electrico FM, el de la cancion 1, con la cinta que ondula */
  function rhodes(to, m, t, o = {}) {
    const { v = 0.08, dur = 0.9, idx = 1.6, lp = 3000, pan = 0 } = o;
    const f = mtof(m), car = ctx.createOscillator(), md = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), l = ctx.createBiquadFilter();
    car.type = md.type = "sine"; car.frequency.value = f; md.frequency.value = f;
    mg.gain.setValueAtTime(f * idx, t); mg.gain.exponentialRampToValueAtTime(f * 0.1, t + Math.min(0.45, dur)); md.connect(mg).connect(car.frequency);
    wobN.connect(car.detune); wobN.connect(md.detune);
    l.type = "lowpass"; l.frequency.value = lp; l.Q.value = 0.4; car.connect(g).connect(l); panTo(l, pan).connect(to);
    env(g, t, 0.005, v, dur);
    const tn = ctx.createOscillator(), tg = ctx.createGain(); tn.type = "sine"; tn.frequency.value = Math.min(9000, f * 7.1); tn.connect(tg).connect(l); env(tg, t, 0.002, v * 0.07, 0.05);
    [car, md].forEach(x => { x.start(t); x.stop(t + dur + 0.1); }); tn.start(t); tn.stop(t + 0.1);
  }
  /* vibrafono: fundamental + parcial 4 (rapido) + chispa 10 muy corta; motor (tremolo) solo en notas largas */
  function vibes(to, m, t, o = {}) {
    const { v = 0.06, dur = 1.0, pan = 0, trem = dur > 0.7 } = o;
    const f = mtof(m), g = ctx.createGain(), l = ctx.createBiquadFilter(); l.type = "lowpass"; l.frequency.value = Math.min(4800, f * 5);
    [[1, 1, dur], [3.98, 0.2, dur * 0.25], [9.92, 0.035, 0.05]].forEach(([r, a, d]) => {
      if (f * r > 12000) return; const os = ctx.createOscillator(), ga = ctx.createGain(); os.type = "sine"; os.frequency.value = f * r;
      ga.gain.setValueAtTime(a, t); ga.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.04, d)); os.connect(ga).connect(g); os.start(t); os.stop(t + dur + 0.1);
    });
    let node = g;
    if (trem) { const tr = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); tr.gain.value = 0.86; lfo.frequency.value = 5.4; lg.gain.value = 0.14; lfo.connect(lg).connect(tr.gain); lfo.start(t); lfo.stop(t + dur + 0.1); g.connect(tr); node = tr; }
    node.connect(l); panTo(l, pan).connect(to);
    env(g, t, 0.003, v, dur);
  }
  /* el toque de 8 bits: pulso cuadrado muy filtrado, flojito, solo en premios y en la bandera */
  function pix(to, m, t, o = {}) {
    const { v = 0.012, dur = 0.12, pan = 0 } = o, f = mtof(m);
    const os = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createBiquadFilter(); os.type = "square"; os.frequency.value = f;
    l.type = "lowpass"; l.frequency.value = Math.min(5000, f * 2.4); l.Q.value = 0.3; os.connect(l).connect(g); panTo(g, pan).connect(to);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.setValueAtTime(v * 0.8, t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.start(t); os.stop(t + dur + 0.05);
  }
  /* peso: un grave que se siente (ataque de 8 ms: sin clic) */
  function sub(to, t, o = {}) {
    const { v = 0.2, f0 = 90, f1 = 45, dur = 0.3 } = o, os = ctx.createOscillator(), g = ctx.createGain();
    os.type = "sine"; os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(f1, t + dur); os.connect(g).connect(to); env(g, t, 0.008, v, dur); os.start(t); os.stop(t + dur + 0.05);
  }
  /* la mano sobre el fieltro: un "tup" sordo y corto */
  function felt(to, t, o = {}) {
    const { v = 0.05, f = 650, dur = 0.035 } = o;
    const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; bp.type = "bandpass"; bp.frequency.value = f * (0.85 + 0.3 * R()); bp.Q.value = 0.9;
    s.connect(bp).connect(g).connect(to); env(g, t, 0.003, v, dur); s.start(t, R() * 0.8); s.stop(t + dur + 0.05);
  }
  /* donde esta cada sonido de assets/sfx/sala.mp3: [inicio, duracion] en segundos (el archivo se monto con 90 ms de silencio entre sonidos) */
  const SALA = { chip: [[0.09, 0.256], [0.436, 0.227], [0.753, 0.256], [1.099, 0.213], [1.401, 0.285], [1.776, 0.17], [2.036, 0.371], [2.496, 0.227], [2.814, 0.184], [3.088, 0.208], [3.385, 0.17], [3.645, 0.227], [3.962, 0.266]],
    mano: [[4.317, 0.616], [5.024, 0.546], [5.66, 0.227], [5.977, 0.356], [6.423, 0.834], [7.347, 0.46]], carta: [[7.897, 0.601], [8.588, 0.584], [9.262, 0.598], [9.95, 0.457], [10.497, 0.689], [11.276, 0.456], [11.822, 0.766]], baraja: [[12.678, 0.721], [13.489, 3.063]] };
  /* la tabla SALA no marca el ataque (hay 15-150 ms de silencio delante de cada sonido): al cargar se busca el primer instante por encima del 10 %
     del pico de cada sonido, y desde ahi se iguala cada grabacion a la misma fuerza tras el paso bajo con que se usa (1,2 / 2,4 / 4 kHz): ninguna salta */
  const NCUT = [1200, 2400, 4000];
  let NORM = null, ON = null;
  function normSala(b) {
    const d = b.getChannelData(0), sr = b.sampleRate, w = Math.floor(0.03 * sr), N = {}; ON = {};
    for (const fam in SALA) {
      ON[fam] = SALA[fam].map(([s0, len]) => { const i0 = Math.max(0, Math.floor((s0 - 0.03) * sr)), i1 = Math.min(d.length, Math.floor((s0 + len) * sr)); let pk = 0;
        for (let i = i0; i < i1; i++) pk = Math.max(pk, Math.abs(d[i]));
        let i = i0; while (i < i1 && Math.abs(d[i]) < pk * 0.1) i++; return Math.max(0, i / sr - 0.003); });
      N[fam] = SALA[fam].map((it, k) => NCUT.map(fc => {
        const a = 1 - Math.exp(-2 * Math.PI * fc / sr); let y1 = 0, y2 = 0;
        const i0 = Math.floor(ON[fam][k] * sr), i1 = Math.min(d.length, i0 + Math.floor(0.1 * sr)), q = new Float64Array(i1 - i0 + 1);
        for (let i = i0; i < i1; i++) { y1 += a * (d[i] - y1); y2 += a * (y1 - y2); q[i - i0 + 1] = q[i - i0] + y2 * y2; }
        let best = 1e-9; for (let i = w; i < q.length; i += 64) best = Math.max(best, (q[i] - q[i - w]) / w);
        return Math.max(0.05, Math.min(30, 0.08 / Math.sqrt(best)));
      }));
    }
    return N;
  }
  /* una grabacion de la sala: nunca la misma dos veces seguidas; altura, lado y fuerza al azar dentro de su margen. Dos pasos bajos: sin chasquido agudo */
  const lastS = {};
  function rec(to, fam, t, o = {}) {
    if (!sala) { felt(to, t, { v: (o.v || 0.3) * 0.15 }); return; }
    const l = SALA[fam]; let k; do { k = Math.floor(R() * l.length); } while (l.length > 1 && k === lastS[fam]); lastS[fam] = k;
    const it = l[k], s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), lp = o.lp || 9000;
    s.buffer = sala; s.playbackRate.value = (o.rate || 1) * (0.93 + 0.14 * R());
    f.type = f2.type = "lowpass"; f.frequency.value = lp; f.Q.value = 0.5; f2.frequency.value = lp * 1.1; f2.Q.value = 0.5;
    const st = ON[fam][k], full = it[1] - (st - it[0]), len = Math.min(full, o.len || full), v = (o.v || 0.4) * (0.85 + 0.3 * R()) * NORM[fam][k][lp < 1800 ? 0 : lp < 3200 ? 1 : 2];
    s.connect(f).connect(f2).connect(g); panTo(g, o.pan != null ? o.pan : (R() - 0.5) * 0.3).connect(to);
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + len * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + len);
    s.start(t, st, len + 0.02);
  }
  /* la nota i de la escala de la cancion que suena, a partir de la altura "desde" (MIDI) */
  const curT = () => { const T = isCl() ? TONOS_CL : TONOS_BA; return T[A.audio.musicOn && cur >= 0 ? cur : 0] || T[0]; };
  function deg(i, desde = 60) {
    const T = curT(), s = T.set.map(p => ((p - T.home) % 12 + 12) % 12).sort((a, b) => a - b);   // grados desde la casa
    const base = desde - ((desde - T.home) % 12 + 12) % 12;                                          // la casa por debajo de "desde"
    return base + 12 * Math.floor(i / 5) + s[((i % 5) + 5) % 5];
  }
  /* un efecto = un bus propio con su escalon (NIVEL) y, si se da, su lado; rev = cuanto manda a la sala */
  function bus(name, rev = 0.12, pan = 0) {
    const g = ctx.createGain(); g.gain.value = Math.pow(10, (NIVEL[name] || 0) / 20);
    const node = panTo(g, pan); node.connect(sfxBus); if (rev) { const s = ctx.createGain(); s.gain.value = rev; node.connect(s).connect(revFx); }
    return g;
  }
  /* los premios grandes crean cientos de nodos: cada golpe se crea poco antes de que suene (JP_LEAD), no todo al principio (crearlos de golpe daba
     un tiron de ~60 ms con CPU lenta). Si algo se retrasa mas de 50 ms (ventana oculta), ese trozo no suena */
  const JP_GAP = 0.46;                    // segundos entre jackpots de la Enciclopedia: el ticket enciende sus casillas y el movil vibra a este mismo ritmo
  const JP_LEAD = 0.12;
  const later = (when, fn) => { const ms = (when - JP_LEAD - ctx.currentTime) * 1000; if (ms <= 4) fn(); else setTimeout(() => { if (ctx.currentTime < when + 0.05) fn(); }, ms); };

  /* ------------------------------------------------------------------ voces de la regla (los efectos sin version nueva) */
  /* Suenan como siempre, pero cada uno entra por su tira: dos pasos bajos hacia 4,2 kHz (sin agudos cortantes) y su escalon (LEG, dB). Mientras
     suena, lb y lr son la entrada de su tira (seco y sala); su sala va a la calida, con el envio igualado en energia a la de antes (x1,69) */
  let lb = null, lr = null;
  function strip(name) {
    const v = Math.pow(10, (LEG[name] != null ? LEG[name] : LEG.otro) / 20), fc = LEG_LP[name] || 4200, g = ctx.createGain(), rs = ctx.createGain();
    g.gain.value = v; rs.gain.value = v * 1.69;
    const lp2 = (node, out) => { const a = ctx.createBiquadFilter(), b = ctx.createBiquadFilter(); a.type = b.type = "lowpass"; a.frequency.value = fc; b.frequency.value = fc * 1.1; node.connect(a).connect(b).connect(out); };
    lp2(g, sfxBus); lp2(rs, revFx);
    return { g, rs };
  }
  function send(node, amt) { if (!amt || !lr) return; const s = ctx.createGain(); s.gain.value = amt; node.connect(s).connect(lr); }
  /* pulsada tipo kalimba / marimba */
  function pluck(m, t, o = {}) {
    const { vol = 0.14, dur = 0.5, bright = 6, bus = lb, rev = 0.3, wave = "triangle" } = o;
    const f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = Math.min(9000, f * bright);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o1.type = wave; o1.frequency.value = f; o2.type = "sine"; o2.frequency.value = f * 4; g2.gain.value = 0.16;
    o1.connect(g); o2.connect(g2).connect(g); g.connect(lp); lp.connect(bus); send(lp, rev);
    env(g, t, 0.003, vol, dur);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  /* campana (armonicos inarmonicos) */
  function bell(m, t, o = {}) {
    const { vol = 0.1, dur = 1.1, bus = lb, rev = 0.5 } = o;
    const f = mtof(m), g = ctx.createGain();
    [[1, 1], [2.756, 0.32], [5.404, 0.12]].forEach(([r, a]) => {
      if (f * r > 20000) return;                                         // armonicos por encima de lo audible (y del limite del oscilador): fuera
      const os = ctx.createOscillator(), ga = ctx.createGain();
      os.type = "sine"; os.frequency.value = f * r; ga.gain.value = a; os.connect(ga).connect(g); os.start(t); os.stop(t + dur + 0.1);
    });
    g.connect(bus); send(g, rev); env(g, t, 0.004, vol, dur);
  }
  function noise(t, dur, o = {}) {
    const { hp = 0, lp = 20000, vol = 0.05, bus = lb, sweepTo, q = 0.7, type } = o;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f1 = ctx.createBiquadFilter(); f1.type = type || (hp ? "highpass" : "lowpass"); f1.frequency.value = hp || lp; f1.Q.value = q;
    if (sweepTo) f1.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); s.connect(f1).connect(g).connect(bus); env(g, t, 0.004, vol, dur);
    s.start(t, Math.max(0, Math.random() * (noiseBuf.duration - dur - 0.2))); s.stop(t + dur + 0.05);
  }
  function thump(t, o = {}) {
    const { vol = 0.3, f0 = 130, f1 = 42, dur = 0.16, bus = lb } = o;
    const os = ctx.createOscillator(), g = ctx.createGain();
    os.type = "sine"; os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(f1, t + dur);
    os.connect(g).connect(bus); env(g, t, 0.003, vol, dur); os.start(t); os.stop(t + dur + 0.05);
  }
  function pad(notes, t, dur, vol = 0.05, bus = musBus) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1300, t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    notes.forEach(m => [-6, 6].forEach(det => {
      const os = ctx.createOscillator(); os.type = "sawtooth"; os.frequency.value = mtof(m); os.detune.value = det;
      os.connect(g); os.start(t); os.stop(t + dur + 0.1);
    }));
    g.connect(lp); lp.connect(bus); send(lp, 0.5);
  }
  /* pitido arcade de onda cuadrada */
  function chirp(m, t, vol = 0.025, dur = 0.09) {
    const os = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    os.type = "square"; os.frequency.value = mtof(m); lp.type = "lowpass"; lp.frequency.value = Math.min(9000, mtof(m) * 5);
    os.connect(lp).connect(g).connect(lb); env(g, t, 0.003, vol, dur); os.start(t); os.stop(t + dur + 0.05);
  }
  /* silaba arcade (la risa del crupier) */
  function blipSq(t, n, m) {
    const os = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    os.type = m.w; os.frequency.setValueAtTime(mtof(n + 12), t); os.frequency.exponentialRampToValueAtTime(mtof(n + 12 + (m.slide || 0)), t + m.d);
    lp.type = "lowpass"; lp.frequency.value = 2600; os.connect(lp).connect(g).connect(lb); env(g, t, 0.004, m.v, m.d); os.start(t); os.stop(t + m.d + 0.05);
  }

  /* ------------------------------------------------------------------ musica: 22 pistas fijas ("BSO" del casino) */
  /*
   * Cada pista es un archivo real en assets/music/ (la BSO del autor del juego, creada con AKAI).
   * Aqui solo se reproducen, se encadenan solas al terminar y se anuncian con una pequena transicion.
   * Titulos: terminos de apuestas en los 12 idiomas (es|en|fr|pt|de|it|es-419|zh|ko|ja|ru|pl).
   */
  const NAMES = [
    ["Apuesta segura", "Sure Bet", "Pari sûr", "Aposta segura", "Sichere Wette", "Scommessa sicura", "Apuesta segura", "稳赢之注", "확실한 베팅", "鉄板の賭け", "Верная ставка", "Pewny zakład"],
    ["Doble o nada", "Double or Nothing", "Quitte ou double", "Dobro ou nada", "Doppelt oder nichts", "Lascia o raddoppia", "Doble o nada", "加倍或归零", "더블 오어 낫싱", "倍か無か", "Пан или пропал", "Podwójnie albo nic"],
    ["Ambos marcan", "Both Teams to Score", "Les deux équipes marquent", "Ambas marcam", "Beide Teams treffen", "Entrambe segnano", "Ambos anotan", "双方都进球", "양 팀 득점", "両チーム得点", "Обе забьют", "Obie strzelą"],
    ["Más de 2,5 goles", "Over 2.5 Goals", "Plus de 2,5 buts", "Mais de 2,5 gols", "Über 2,5 Tore", "Over 2,5 gol", "Más de 2.5 goles", "大于 2.5 球", "2.5골 이상", "2.5ゴール以上", "Тотал больше 2,5", "Powyżej 2,5 gola"],
    ["Todo al rojo", "All on Red", "Tout sur le rouge", "Tudo no vermelho", "Alles auf Rot", "Tutto sul rosso", "Todo al rojo", "全押红色", "레드에 올인", "赤に全賭け", "Всё на красное", "Wszystko na czerwone"],
    ["Huérfanos", "Orphans", "Orphelins", "Órfãos", "Orphelins", "Orfani", "Huérfanos", "孤儿注", "오르펠랭", "オーファン", "Сироты", "Sieroty"],
    ["All-in", "All In", "Tapis !", "All-in", "All-in", "All-in", "All-in", "全押", "올인", "オールイン", "Ва-банк", "All-in"],
    ["Combinada", "Parlay", "Pari combiné", "Múltipla", "Kombiwette", "Multipla", "Combinada", "串关", "팔레이", "パーレー", "Экспресс", "Kupon łączony"],
    ["Sube la apuesta", "Raise the Stakes", "Je relance", "Aumenta a aposta", "Einsatz erhöhen", "Rilancio", "Sube la apuesta", "加注", "판돈을 올려라", "レイズ", "Поднять ставки", "Podbij stawkę"],
    ["Retirar ganancias", "Cash Out", "Encaisser", "Retirar ganhos", "Auszahlen", "Incassa", "Cobrar ganancias", "兑现离场", "캐시 아웃", "キャッシュアウト", "Забрать выигрыш", "Wypłata"],
    ["Banca al día", "Bankroll", "Capital de jeu", "Banca em dia", "Spielkapital", "Capitale di gioco", "Banca al día", "资金池", "뱅크롤", "バンクロール", "Банкролл", "Kasa w porządku"],
    ["Apuesta en vivo", "Live Bet", "Pari en direct", "Aposta ao vivo", "Live-Wette", "Scommessa live", "Apuesta en vivo", "现场投注", "라이브 베팅", "ライブベット", "Ставка по ходу игры", "Zakład na żywo"],
    ["Pleno al quince", "Straight Up", "Plein au quinze", "Número pleno", "Volltreffer", "Pieno al quindici", "Pleno al quince", "单号直注", "스트레이트 업", "ストレートアップ", "Ставка на число", "Prosto na piętnastkę"],
    ["Hándicap asiático", "Asian Handicap", "Handicap asiatique", "Handicap asiático", "Asiatisches Handicap", "Handicap asiatico", "Hándicap asiático", "亚洲让球", "아시안 핸디캡", "アジアンハンディキャップ", "Азиатская фора", "Handicap azjatycki"],
    ["Gran apostador", "High Roller", "Flambeur", "Grande apostador", "Großspieler", "Giocatore d'alto bordo", "Gran apostador", "豪赌客", "하이 롤러", "ハイローラー", "Хайроллер", "Gruba ryba"],
    ["Bote acumulado", "Progressive Jackpot", "Jackpot progressif", "Jackpot progressivo", "Progressiver Jackpot", "Jackpot progressivo", "Pozo acumulado", "累积奖池", "누적 잭팟", "プログレッシブ・ジャックポット", "Прогрессивный джекпот", "Kumulacja"],
    ["Ventaja de la casa", "House Edge", "Avantage de la maison", "Vantagem da casa", "Hausvorteil", "Vantaggio del banco", "Ventaja de la casa", "庄家优势", "하우스 엣지", "ハウスエッジ", "Преимущество казино", "Przewaga kasyna"],
    ["Mano caliente", "Hot Hand", "Main chaude", "Mão quente", "Heiße Hand", "Mano calda", "Mano caliente", "手气正旺", "핫 핸드", "ホットハンド", "Горячая рука", "Gorąca ręka"],
    ["Ganador y colocado", "Each Way", "Pari gagnant-placé", "Ganhador e colocado", "Sieg-Platz-Wette", "Vincente e piazzato", "Ganador y colocado", "独赢位置", "이치 웨이", "単勝・複勝", "Победа и место", "Wygrana i miejsce"],
    ["Empate no vale", "Draw No Bet", "Match nul remboursé", "Empate anula aposta", "Unentschieden, Geld zurück", "Pareggio rimborsato", "Empate no cuenta", "平局退款", "무승부 환불", "引き分け返金", "Ничья — возврат", "Zakład bez remisu"],
    ["Apuesta máxima", "Max Bet", "Mise maximale", "Aposta máxima", "Höchsteinsatz", "Puntata massima", "Apuesta máxima", "最大注", "최대 베팅", "マックスベット", "Максимальная ставка", "Maksymalna stawka"],
    ["Tipsters", "Tipsters", "Tipsters", "Tipsters", "Tipsters", "Tipsters", "Tipsters", "Tipsters", "Tipsters", "Tipsters", "Tipsters", "Tipsters"],
  ];
  /* La banda de la casa (v0.3.200): cada cancion son TRES capas que suenan a la vez y se suben o bajan segun el momento (como en Balatro):
     .c0 = la portada en calma (melodia y acordes; la base de hip hop apagada y bajita, como en la sala de al lado), .c1 = lo que entra en la
     partida (la base entera: bombo que pega y caja o palmada en el pulso del rap; el bajo entero, la percusion), .c2 = la tension de los ultimos
     segundos (tic, madera, aro, toms: nunca platos ni ruido). Partida = c0 + c1; ultimos segundos = c0 + c1 + c2. Todas se pueden rapear: las rapidas
     llevan la base a medio tiempo (la melodia a su tempo). */
  const SONGS = [
    "01-apuesta-segura", "02-doble-o-nada", "03-ambos-marcan", "04-mas-de-2-5-goles", "05-todo-al-rojo", "06-huerfanos", "07-all-in", "08-combinada",
    "09-sube-la-apuesta", "10-retirar-ganancias", "11-banca-al-dia", "12-apuesta-en-vivo", "13-pleno-al-quince", "14-handicap-asiatico", "15-gran-apostador",
    "16-bote-acumulado", "17-ventaja-de-la-casa", "18-mano-caliente", "19-ganador-y-colocado", "20-empate-no-vale", "21-apuesta-maxima", "22-tipsters",
  ];
  /* las de antes, tal cual (un archivo cada una, sin capas): el estilo «Clasicos» de Ajustes > Sonido > Estilo de musica */
  const OLD = [
    "01-lounge-nocturno", "02-ragtime-roulette", "03-bossa-de-medianoche", "04-samba-del-crupier", "05-blues-del-tapete", "06-vals-real", "07-funk-jackpot",
    "08-big-band-all-in", "09-mambo-royale", "10-cash-out", "11-banca-al-dia", "12-apuesta-en-vivo", "13-pleno-al-quince", "14-handicap-asiatico",
    "15-funk-da-sorte", "16-house-del-crupier", "17-tecno-del-bote", "18-merengue-del-premio", "19-cha-cha-del-casino", "20-ranchera-de-la-suerte",
    "21-corrido-del-apostador", "22-tipsters",
  ];
  const FILES = SONGS, LAYERS = 3;
  let MS = "banda";                                                    // estilo de musica: "banda" (la BSO por capas) | "clasica" (las de antes)
  const isCl = () => MS === "clasica";
  const stem = (i, c, cl = isCl()) => (cl ? (c === 0 ? "assets/music/" + OLD[i] + ".mp3" : "") : "assets/music/" + SONGS[i] + ".c" + c + ".mp3");
  /* v0.3.55 (el sonido de la casa, 3a): cada cancion tiene su momento y su volumen. Los archivos no se tocan: todo se decide aqui.
     - GROUPS: el reparto. La portada y los menus, las mas tranquilas (la 1.a, "Apuesta segura", es SIEMPRE la del arranque); cada acto de la
       Aventura, con mas empuje que el anterior; el jefe y la victoria, su tema; los creditos, el vals (js/final.js). Clasico = portada + acto I;
       modo infinito = actos II y III.
     - Dentro de un momento, al acabar una cancion entra otra del grupo (sin repetir las ultimas) con un fundido. Al cambiar de momento la que suena
       TERMINA y la siguiente ya sale del grupo nuevo: ninguna cancion se corta a medias. Las excepciones son el jefe (su tema entra con su llegada y,
       al irse, vuelve la cancion del acto por donde iba) y la victoria.
     - LUFS: el volumen medido de cada pista (ffmpeg ebur128). Entre la mas fuerte y la mas floja habia 8,7 dB; TRIM las lleva todas a -34 LUFS
       (correccion limitada a -4 / +5,5 dB) con una ganancia por pista.
     - BPM y BEAT0 (tempo y primer pulso en ms, medidos: todas van a tempo exacto de principio a fin): el compas de la que suena, A.music.beat().
       Las 22 arrancan en el pulso: el primer ataque cae a los 59-62 ms del archivo y la rejilla aguanta hasta el final. Ojo si entra una pista
       nueva: el ataque mas fuerte de una cancion puede ser el contratiempo (mambo, house, cha-cha); el pulso se mide con la energia en el
       tiempo y con los graves, no con el ataque de toda la banda. */
  const GROUPS = { home: [0, 4, 10, 9], a1: [1, 3, 11, 12, 20], a2: [2, 6, 8, 13, 18, 21], a3: [7, 14, 15, 19], boss: [16], win: [17], credits: [5] };
  GROUPS.classic = GROUPS.home.concat(GROUPS.a1); GROUPS.inf = GROUPS.a2.concat(GROUPS.a3);
  const NOW = { boss: 1, win: 1 };                                      // momentos que no esperan a que acabe la cancion
  /* cada estilo con sus medidas: LUFS = sonoridad de la cancion (en «banda», la de la partida: capas 0 + 1), TRIM las lleva a -34 LUFS;
     BPM = el pulso (la 20 de la banda va en 12/8: su pulso es la negra con puntillo) */
  const LUFS_CL = [-36.9, -38.3, -31.9, -35.6, -34.2, -33.8, -35.7, -31.6, -32.6, -36.3, -32.9, -36.8, -37.4, -33.6, -30.7, -33.9, -36.9, -32.3, -39.4, -31.3, -37.4, -35.1];
  const BPM_CL = [86, 112, 128, 100, 108, 138, 104, 132, 116, 74, 76, 92, 108, 122, 130, 124, 128, 145, 128, 132, 92, 92];
  const LUFS_BA = [-34.5, -34.4, -34.5, -34.4, -34.4, -34.4, -34.5, -34.5, -34.4, -34.4, -34.4, -34.5, -34.4, -34.5, -34.5, -34.4, -34.5, -34.5, -34.5, -34.5, -34.5, -34.5];
  const BPM_BA = [86, 116, 100, 104, 94, 120, 100, 152, 118, 74, 76, 88, 108, 100, 138, 122, 120, 132, 120, 108, 96, 80];
  const trimOf = l => Math.pow(10, Math.max(-4, Math.min(5.5, -34 - l)) / 20), TRIM_CL = LUFS_CL.map(trimOf), TRIM_BA = LUFS_BA.map(trimOf);
  const BEAT0 = () => (isCl() ? 60 : 51);                              // primer pulso (ms): las de antes, 59-62 ms; la banda, 50-53 ms (medido en los mp3)
  const XF = 1.4;                                                       // segundos de fundido entre dos canciones
  let cur = -1, mode = 0, moment = "home", di = -1, resume = null, momT = 0, muf = false, bar = false, en = false;
  const decks = [], recent = [];                                        // dos platos: mientras uno entra, el otro sale

  function deck(k) {
    if (decks[k]) return decks[k];
    const trim = ctx.createGain(), fade = ctx.createGain(); fade.gain.value = 0; trim.connect(fade).connect(musBus);
    const els = [], lg = [];
    for (let c = 0; c < LAYERS; c++) {
      const e = new Audio(); e.crossOrigin = "anonymous"; e.preload = "auto"; e.loop = false;   // si algun dia sale de otro dominio: sin CORS, WebAudio la silenciaria
      const g = ctx.createGain(); g.gain.value = c === 0 ? 1 : 0.0001; ctx.createMediaElementSource(e).connect(g).connect(trim); els.push(e); lg.push(g);
    }
    const el = els[0], d = (decks[k] = { el, els, lg, trim, fade, idx: -1, leaving: false, tm: 0, sync: 0 });   // la capa 0 lleva el reloj
    /* la cancion se acaba: la siguiente entra fundida un poco antes del final (o, si no se pudo, al terminar). De paso, cada 2 s, las capas al reloj */
    el.addEventListener("timeupdate", () => {
      if (decks[di] === d && !d.leaving && el.duration && el.duration - el.currentTime < XF + 0.25) change(pick(), "fade");
      const now = performance.now(); if (now - d.sync > 2000) { d.sync = now; align(d); }
    });
    el.addEventListener("ended", () => { if (decks[di] === d && !d.leaving) change(pick(), "soft"); });
    ["playing", "pause", "seeked", "waiting"].forEach(ev => el.addEventListener(ev, () => { if (decks[di] === d && A.music.onBeat) A.music.onBeat(); }));
    els.slice(1).forEach(e => e.addEventListener("playing", () => align(d)));
    return d;
  }
  /* las capas 1 y 2 siguen a la 0: si alguna se ha separado mas de 30 ms (arranque, salto, pestana oculta), se recoloca */
  function align(d) {
    if (d.el.paused || d.el.readyState < 2) return; const t0 = d.el.currentTime;
    d.els.slice(1).forEach(e => { if (e.getAttribute("src") && !e.paused && e.readyState >= 2 && Math.abs(e.currentTime - t0) > 0.03) { try { e.currentTime = t0 + 0.012; } catch (er) { /* aun sin datos */ } } });
  }
  const playAll = d => d.els.forEach(e => { if (e.getAttribute("src")) e.play().catch(() => {}); });
  const pauseAll = d => d.els.forEach(e => e.pause());
  /* que capas suenan: portada [0], partida [0, 1], ultimos segundos [0, 1, 2] */
  const want = () => (isCl() ? [1, 0, 0] : mode === 2 ? [1, 1, 1] : mode === 1 ? [1, 1, en ? 1 : 0] : [1, 0, 0]);   // las de antes: una sola pista. v0.3.201: con racha de 3, la tension entra tambien en la partida
  /* sube o baja las capas. at = "pulso": la capa que entra lo hace justo en el siguiente pulso de la cancion (el bombo cae a tiempo);
     la que sale se va en un tercio de segundo. Sin musica sonando, de inmediato */
  function layers(how) {
    if (!ctx) return; const t = ctx.currentTime, w = want(); let t0 = t;
    if (how === "pulso") { const b = A.music.beat(); if (b) { const ph = ((b.at % b.ms) + b.ms) % b.ms; t0 = t + (b.ms - ph) / 1000; if (t0 - t > 0.8) t0 = t; } }
    decks.forEach(d => d && d.lg.forEach((g, c) => {
      const to = w[c] ? 1 : 0.0001, gp = g.gain; gp.cancelScheduledValues(t); gp.setValueAtTime(Math.max(0.0001, gp.value), t);
      if (how === "ya") gp.setValueAtTime(to, t); else { gp.setValueAtTime(Math.max(0.0001, gp.value), t0); gp.linearRampToValueAtTime(to, t0 + (w[c] ? 0.05 : 0.33)); }
    }));
  }
  const group = () => GROUPS[moment] || GROUPS.home;
  /* otra del grupo: nunca la que suena ni las ultimas (cuantas, segun lo grande que sea el grupo) */
  function pick(g = group()) {
    const last = recent.slice(-Math.max(1, Math.min(4, g.length - 2)));
    let o = g.filter(i => !last.includes(i)); if (!o.length) o = g.filter(i => i !== cur); if (!o.length) o = g;
    return o[Math.floor(Math.random() * o.length)];
  }
  /* suena la pista i. how: "fade" (fundido de XF s), "soft" (entra en un cuarto de segundo) o "cut" (de golpe). at: segundo desde el que sigue */
  function useTrack(i, how = "soft", at = 0) {
    const t = ctx.currentTime, old = di >= 0 ? decks[di] : null, k = di === 0 ? 1 : 0, d = deck(k), f = how === "fade" ? XF : how === "soft" ? 0.25 : 0.03;
    clearTimeout(d.tm); d.leaving = false; d.idx = i; cur = i; recent.push(i); if (recent.length > 6) recent.shift();
    d.els.forEach((e, c) => { const f = stem(i, c); if (!f) { e.pause(); e.removeAttribute("src"); return; } e.src = A.media(f); try { e.currentTime = at; } catch (er) { /* aun sin datos: empieza desde el principio */ } });
    d.trim.gain.value = (isCl() ? TRIM_CL : TRIM_BA)[i]; { const w = want(); d.lg.forEach((g, c) => { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(w[c] ? 1 : 0.0001, t); }); }
    playAll(d);
    d.fade.gain.cancelScheduledValues(t); d.fade.gain.setValueAtTime(0.0001, t); d.fade.gain.linearRampToValueAtTime(1, t + f);
    if (old) {
      old.leaving = true; old.fade.gain.cancelScheduledValues(t); old.fade.gain.setValueAtTime(old.fade.gain.value, t); old.fade.gain.linearRampToValueAtTime(0.0001, t + f);
      old.tm = setTimeout(() => { if (decks[di] !== old) pauseAll(old); }, f * 1000 + 150);
    }
    di = k;
  }
  /* cambio de cancion con su aviso (js/jukebox.js) */
  function change(i, how, at) { useTrack(i, how, at); if (A.music.onChange) A.music.onChange(i); }
  const musLevel = () => MUS_BASE * A.audio.vol.music * (bar && !muf ? 0.7 : 1) * (en && isCl() && !bar && !muf ? 1.12 : 1);   // las de antes (sin capas), con racha: un punto mas
  /* el timbre de la musica segun donde estes: amortiguada del todo (pausa, tu nombre, salir) o "desde la barra" (Campamento). Las de antes, que no
     tienen capas, abren el filtro en los ultimos segundos y con racha */
  const fcut = () => (muf ? 320 : bar ? 1250 : isCl() && (mode === 2 || en) ? 12500 : 8600);
  function tone() {
    if (!ctx) return; const t = ctx.currentTime;
    musFilter.frequency.setTargetAtTime(fcut(), t, muf ? 0.08 : 0.15);
    musBus.gain.cancelScheduledValues(t); musBus.gain.setTargetAtTime(musLevel(), t, 0.15);
  }
  A.music = {
    start() {
      if (!A.audio.musicOn || !init()) return;
      if (cur < 0) useTrack(0, "cut"); else playAll(decks[di]);   // la primera es siempre la del arranque
    },
    /* las flechas del reproductor: la anterior y la siguiente de la LISTA entera, en orden (1, 2, 3... y vuelta a la 1); el grupo del momento
       solo manda cuando la cancion acaba sola */
    next() { A.music.step(1); },
    prev() { A.music.step(-1); },
    step(d) { const n = FILES.length; if (cur < 0 || n < 2) return; change((cur + d + n) % n, "soft"); },
    index() { return cur; },
    count() { return FILES.length; },
    title(i = cur) { const n = NAMES[i]; if (!n) return ""; const k = A.LANGS.findIndex(l => l.code === A.lang); return n[k] || n[1]; },
    go(i, quiet) { if (FILES[i] == null || !A.audio.musicOn || !init()) return; if (quiet) useTrack(i, "soft"); else change(i, "soft"); },   // salta a una cancion (quiet: sin aviso; los creditos finales ponen el vals)
    now() { return A.music.title(); },
    stop() { decks.forEach(d => d && pauseAll(d)); },
    /* 0 portada (en calma), 1 partida (entra la banda), 2 ultimos segundos (entra la tension): las capas entran en el siguiente pulso */
    mode(m) { if (m === mode) return; mode = m; tone(); layers("pulso"); },
    duck(level = 0.3, ms = 1400) {
      if (!ctx || cur < 0) return;
      const base = musLevel(), t = ctx.currentTime; musBus.gain.cancelScheduledValues(t);
      musBus.gain.setTargetAtTime(base * level, t, 0.05); musBus.gain.setTargetAtTime(base, t + ms / 1000, 0.4);
    },
    muffle(on) { muf = !!on; tone(); },
    /* v0.3.201 (Bloque F, paso 4): la musica sigue tu racha. energia(on): con racha de 3 o mas entra la capa de tension de la cancion (la de los
       ultimos segundos) en el siguiente pulso, sin cortar, y se queda mientras dure la racha; las de antes, sin capas, se abren un punto.
       enfria(): un fallo le quita los agudos un momento y vuelve. Solo se llaman al revelar: mientras contestas, la musica no cambia */
    energia(on) { if (en === !!on) return; en = !!on; tone(); layers("pulso"); },
    enfria() {
      if (!ctx || muf || bar) return; const t = ctx.currentTime, f = musFilter.frequency;
      f.cancelScheduledValues(t); f.setValueAtTime(f.value, t); f.setTargetAtTime(900, t, 0.06); f.setTargetAtTime(fcut(), t + 0.7, 0.35);
    },
    /* el Campamento: la misma cancion, como si llegara desde la sala */
    room(on) { if (bar === !!on) return; bar = !!on; tone(); },
    /* el momento del juego: "home", "classic", "a1" | "a2" | "a3", "inf", "boss", "win". o.delay: ms hasta que entra el tema del jefe (tras el golpe de su llegada) */
    moment(key, o = {}) {
      if (!GROUPS[key] || key === moment) return; const was = moment; moment = key; clearTimeout(momT);
      if (cur < 0 || !ctx || !A.audio.musicOn) { resume = null; return; }
      if (key === "boss") {
        resume = { idx: cur, at: decks[di].el.currentTime };
        momT = setTimeout(() => { if (moment === "boss" && cur !== GROUPS.boss[0]) change(GROUPS.boss[0], "cut"); }, o.delay || 0);
        return;
      }
      if (was === "boss" || NOW[key]) {
        const g = GROUPS[key], back = was === "boss" && resume && g.includes(resume.idx) && cur !== resume.idx ? resume : null, i = back ? back.idx : g.includes(cur) ? cur : pick(g);
        resume = null; if (i !== cur) change(i, "fade", back ? back.at : 0);
      }
      /* de un momento a otro (portada -> acto, acto -> acto): la que suena termina y la siguiente ya sale del grupo nuevo */
    },
    get where() { return moment; },
    /* para las pruebas: que suena en cada plato (archivo, segundo y ganancia de cada capa) */
    _platos() { return decks.map(d => d && { idx: d.idx, sale: d.leaving, capas: d.els.map((e, c) => ({ f: (e.getAttribute("src") || "").split("/").pop(), t: Math.round(e.currentTime * 1000), g: Math.round(d.lg[c].gain.value * 1000) / 1000, parada: e.paused })) }); },
    /* el compas de la cancion que suena: { ms: lo que dura un pulso, at: cuantos ms hace que cayo el primero } o null si no suena nada. Sale del tempo
       medido de cada pista y del reloj del reproductor: no hace falta analizar la musica mientras suena */
    beat() {
      const d = di >= 0 ? decks[di] : null; if (!d || cur < 0 || d.el.paused || d.el.readyState < 2 || !A.audio.musicOn || !(A.audio.vol.music * A.audio.vol.master > 0)) return null;   // con la musica a cero no hay compas que seguir
      return { ms: 60000 / (isCl() ? BPM_CL : BPM_BA)[cur], at: d.el.currentTime * 1000 - BEAT0() - ((ctx.outputLatency || ctx.baseLatency || 0) * 1000) };
    },
  };
  /* Ajustes > Sonido > Estilo de musica: al cambiarlo, la misma cancion en el otro estilo entra fundida (nunca un corte) */
  A.audio.musica = "banda";
  A.audio.setMusica = v => {
    const nv = v === "clasica" ? "clasica" : "banda"; if (nv === MS) return; MS = A.audio.musica = nv;
    if (ctx && cur >= 0 && A.audio.musicOn && di >= 0 && !decks[di].el.paused) change(cur, "fade"); if (ctx) tone();
  };
  /* v0.3.201 (Bloque F, paso 4): EL PUBLICO DE LA SALA. Grabaciones reales de una sala pequena (Freesound, CC0: assets/sfx/publico/LICENCIAS.txt),
     bajito: es la sala, no un estadio. Cada reaccion tiene la suya (votadas en la maqueta); los «oooh» son cuatro y nunca repiten el anterior;
     cada vez con un punto distinto de tono, volumen y lado. Nunca abuchean. Van por el bus de efectos (el regulador de Efectos los mueve) y se
     cargan al arrancar, en segundo plano: nada se descodifica en mitad de una partida. El nivel es el de la maqueta (0 dB): la grabacion a -20 dB
     en la entrada de la mezcla, con los reguladores de fabrica */
  const PUB = { diana: ["aplauso_corto"], porpoco: ["oooh_1", "oooh_2", "oooh_3", "oooh_4"], racha5: ["vitores"], rota: ["ooow"], jackpot: ["aplauso_vitores"], ronda: ["aplauso_largo"] };
  const PUB_G = 0.1 / (0.9 * SFX_K), pubB = {}, pubUlt = {}; let pubIni = false;
  function pubCarga() {
    if (pubIni || !ctx) return; pubIni = true;
    [...new Set(Object.values(PUB).flat())].forEach((n, i) => setTimeout(() => fetch(A.media("assets/sfx/publico/" + n + ".mp3")).then(r => (r.ok ? r.arrayBuffer() : Promise.reject())).then(b => ctx.decodeAudioData(b)).then(b => { pubB[n] = b; }).catch(() => { /* sin esa grabacion, esa reaccion calla */ }), 400 + i * 120));
  }
  A.publico = (k, delay = 0) => {
    if (!A.audio.sfxOn || !ctx) return; pubCarga();
    const L = PUB[k]; if (!L) return;
    let i = 0; if (L.length > 1) { do { i = Math.floor(Math.random() * L.length); } while (i === pubUlt[k]); pubUlt[k] = i; }
    const b = pubB[L[i]]; if (!b) return;
    const t = ctx.currentTime + Math.max(0, delay) / 1000, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = b; s.playbackRate.value = 0.96 + Math.random() * 0.08; f.type = "lowpass"; f.frequency.value = 7000; g.gain.value = PUB_G * (0.9 + Math.random() * 0.2);
    s.connect(f).connect(g); panTo(g, (Math.random() - 0.5) * 0.4).connect(sfxBus); s.start(t);
  };
  A.audio.setSkin = () => {};   // las 22 pistas ya son archivos fijos: el timbre/tempo por skin ya no aplica
  A.audio.state = () => (ctx ? ctx.state : 'none');
  A.audio.tap = () => { if (!ctx) return null; const an = ctx.createAnalyser(); an.fftSize = 2048; outTap.connect(an); return an; };   // para las pruebas: un medidor de lo que sale por los altavoces
  /* volumen 0..1 de "master" | "music" | "sfx" | "amb" */
  A.audio.setVol = (kind, v) => {
    v = Math.max(0, Math.min(1, v)); A.audio.vol[kind] = v;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (kind === "master") { if (!ducked) master.gain.setTargetAtTime(v, t, 0.03); }
    else if (kind === "music") { musBus.gain.cancelScheduledValues(t); musBus.gain.setTargetAtTime(musLevel(), t, 0.03); }
    else if (kind === "amb") ambApply();
    else { sfxBus.gain.setTargetAtTime(v * SFX_K, t, 0.03); revFx.gain.setTargetAtTime(v * SFX_K, t, 0.03); }
  };
  /* Ajustes > Sonido > Sonar en segundo plano (v0.3.2): baja el volumen general a 0 mientras el juego no esta delante y lo devuelve al volver */
  let ducked = false;
  A.audio.duck = on => { ducked = !!on; if (ctx) master.gain.setTargetAtTime(ducked ? 0 : A.audio.vol.master, ctx.currentTime, ducked ? 0.08 : 0.15); };
  A.audio.unlock = (music = true) => { init(); if (music && A.audio.musicOn && ctx) A.music.start(); if (ctx) ambApply(); };
  A.audio.setMusic = on => { A.audio.musicOn = on; if (on) A.music.start(); else A.music.stop(); };
  /* el lado de la pantalla para el estereo: -1 (izquierda) .. 1 (derecha), de una x en pixeles */
  A.audio.side = x => (typeof x === "number" && innerWidth > 0 ? Math.max(-1, Math.min(1, (x / innerWidth) * 2 - 1)) : 0);

  /* ------------------------------------------------------------------ efectos */
  /* antes del primer clic, en la web el navegador puede no dejar sonar: el AudioContext se queda suspendido y lo que se programara en el
     (la intro del estudio) sonaria de golpe, tarde y encima de la musica al pulsar "entrar". Sin gesto todavia, el efecto solo suena si el
     audio arranca de verdad en unos instantes (Electron, o navegador que ya lo permite); si no, se descarta */
  const go = fn => (...a) => {
    if (!A.audio.sfxOn || document.hidden || !init()) return;                         // con la pestana oculta no se oye: ni se programa (sonaria de golpe al volver)
    if (ctx.state === "running" || window.geoliteHost || !navigator.userActivation || navigator.userActivation.hasBeenActive) return fn(ctx.currentTime + 0.005, ...a);
    const t0 = performance.now(), wait = () => { if (ctx.state === "running") fn(ctx.currentTime + 0.005, ...a); else if (performance.now() - t0 < 300) setTimeout(wait, 30); };
    wait();
  };
  /* un efecto de la regla: mientras se programa, sus voces entran por su tira (lb, lr) */
  const old = (name, fn) => go((t, ...a) => { const s = strip(name), b0 = lb, r0 = lr; lb = s.g; lr = s.rs; try { return fn(t, ...a); } finally { lb = b0; lr = r0; } });
  /* el tono de cada cancion (por su numero, como `cur`): la pentatonica que encaja (5 notas) y su nota "casa", de la ficha del motor de la BSO
     (tonica, escala y acordes). Fuera de la musica (apagada o aun sin sonar), Do */
  const MAJ = r => [0, 2, 4, 7, 9].map(x => (x + r) % 12);
  const TONOS_CL = [
    { home: 0, set: MAJ(0) }, { home: 0, set: MAJ(0) }, { home: 7, set: MAJ(7) }, { home: 2, set: MAJ(2) }, { home: 8, set: MAJ(8) },
    { home: 0, set: [0, 2, 4, 9, 11] }, { home: 7, set: MAJ(7) }, { home: 10, set: MAJ(10) }, { home: 3, set: MAJ(3) }, { home: 5, set: MAJ(5) },
    { home: 0, set: MAJ(0) }, { home: 0, set: MAJ(0) }, { home: 9, set: [9, 1, 2, 4, 7] }, { home: 5, set: MAJ(5) }, { home: 5, set: MAJ(5) },
    { home: 5, set: MAJ(5) }, { home: 3, set: MAJ(3) }, { home: 9, set: MAJ(9) }, { home: 7, set: MAJ(7) }, { home: 2, set: MAJ(2) },
    { home: 0, set: MAJ(0) }, { home: 5, set: MAJ(5) },
  ];
  /* la banda (v0.3.200): la pentatonica mayor de la relativa mayor de cada cancion nueva o rehecha (casa = su tonica); la 1 y la 10, las de siempre */
  const TONOS_BA = [
    { home: 0, set: MAJ(0) }, { home: 3, set: MAJ(3) }, { home: 7, set: MAJ(7) }, { home: 2, set: MAJ(2) }, { home: 5, set: MAJ(5) },
    { home: 0, set: MAJ(0) }, { home: 7, set: MAJ(7) }, { home: 10, set: MAJ(10) }, { home: 3, set: MAJ(3) }, { home: 5, set: MAJ(5) },
    { home: 0, set: MAJ(0) }, { home: 8, set: MAJ(8) }, { home: 9, set: [9, 1, 2, 4, 7] }, { home: 5, set: MAJ(5) }, { home: 10, set: MAJ(10) },
    { home: 5, set: MAJ(5) }, { home: 3, set: MAJ(3) }, { home: 0, set: MAJ(0) }, { home: 5, set: MAJ(5) }, { home: 8, set: MAJ(8) },
    { home: 7, set: MAJ(7) }, { home: 5, set: MAJ(5) },
  ];
  /* escalon de cada efecto en dB sobre la musica (maqueta del Bloque F, version 2, con los votos del 23-oct ya dentro: raton -2, premios +3):
     raton -13, pulsar -4, jugada +3 a +10, diana +13, jackpots +13/+16/+19. Medidos con la sonoridad de pico en 50 ms frente a la mediana de la musica */
  const NIVEL = {
    hover: -35.4, menuHover: -35.1, ui: -23.6, card: -24.5, felt: -18.0, toggle: -16.6, blip: -15.1, deny: -18.9, pause: -22.1, pin: -20.3,
    reveal0: -18.8, reveal1: -14.3, reveal2: -12.5, reveal3: -10.1, reveal4: -19.5, reveal5: -14.8, impacto: -25.6, golpe: -15.3, count: -3.0, countEnd: -14.1,
    tick: -11.5, streak: -7.0, streakBreak: -25.5, flag: -14.0, coin: -19.2, jackpot1: -13.2, jackpot2: -13.0, jackpot3: -14.5, barrido: -6.6, goal: -14.5,
    lootStep: -11.6, ach: -13.3, buy: -15.0, sell: -18.3, clear: -14.5, lose: -22.3, stamp: -26.0, win: -10.3, intro: -14.4, lampara: -15.9,
    boss: -23.0, voice: -13.5, rouBet: -22.9, rouTick: -16.1, rouStop: -24.2,
  };
  /* la regla: escalon de cada efecto sin version nueva (dB de su tira; ver LEG_OBJ en la herramienta de medida) y paso bajo propio si 4,2 kHz no basta */
  const LEG = {
    albumStamp: -20.1, bankPin: -21.6, boardDone: -21, bossRise: -20.1, bsodOn: -19.9, buzz: -15.9, cartel: -20.1, chal: -23.3, charge: -20.9, chip: -21.3, coinLand: -27.2,
    coinTink: -29, coinToss: -27.4, counter: -21.5, cupClack: -24.4, cupDrum: -25.2, cupLift: -23.5, cupWink: -28.1, dark: -20, depart: -20.5, devOff: -20.1,
    devOn: -19.7, diceBoom: -26, diceClack: -24.9, diceLand: -24.6, diceRail: -25.4, diceRattle: -20.4, diceSlam: -25.8, diceSnake: -21.1, diceTick: -10.5, diceTie: -26.4,
    ding: -20.8, fail: -24.6, feed: -19.6, flagFlip: -20.1, flapRoll: -1.3, flapSet: -19.3, gbEngine: -26.3, gbNoise: -18.9, gbTone: -27.1, glass: -24.5, gust: -15.3,
    heart: -20, ice: -21, key: -20.2, knock: -20.6, land: -20.5, latido: -20, laugh: -20.7, lift: -16.3, lowbat: -20.7, napOn: -19.9, napStir: -20.1, napWake: -20.9,
    nightBang: -20.1, passFalse: -21, passStamp: -20.2, pinFall: -21.2, plkDrop: -24.5, plkFlash: -27.3, plkLand: -26, plkPeg: -26.2, plkTick: -4.1, plkWall: -25.4,
    powerdown: -22.1, ptrEdge: -21.2, puzzleDeal: -19.3, puzzleSnap: -22.2, rain: -20.6, rcNoise: -17.4, rcScratch: -22.4, reroll: -20.6, restore: -19.2, rouBrake: -25.8,
    rouCrawl: -26.1, rouKick: -25.9, rouNoMore: -27, rouStart: -26, rouZero: -26.1, rumble: -20, sealPop: -20.1, sign: -24.3, smear: -20.8, snap: -20.1, sonar: -20.7,
    spark: -5.1, spot: -22.5, ssBounce: -20.9, ssOn: -20.5, ssWake: -21.1, studio: -28.4, sweep: -19.6, tear: -19.7, thunder: -23.8, trapStamp: -20, victory: -17.8,
    warn: -21.2, wheelLand: -20.8, wheelTick: -20.9, wipe: -20.7, zUndo: -19.8, zumbido: -20,
    otro: -14,
  };
  const LEG_LP = { diceRattle: 3000, diceSnake: 3000, diceTick: 3000, flapRoll: 3000, gbNoise: 3000, ice: 3000, plkTick: 3600, rain: 3600, rcNoise: 3000, rcScratch: 3000, spark: 2600 };
  /* grado pentatonico de cada boton del menu principal (barrer las cartas suena a arpegio) */
  const HOV_DEG = [7, 8, 9, 6, 8, 10, 7];
  let hovT = -9, hovLast = -1, landLast = 0, hovStep = 0, hovDir = 1, flagLast = -1;
  A.audio.jpGap = JP_GAP;
  /* vibracion del movil (Android; en iPhone y en escritorio no existe y no hace nada). Va aparte del sonido: tambien vibra con los efectos
     apagados. La apaga el ajuste Vibracion (game.js pone A.haptic.on), el mismo que quita el temblor de pantalla */
  A.haptic = p => { try { if (A.haptic.on !== false && navigator.vibrate && !document.hidden && !(navigator.userActivation && !navigator.userActivation.hasBeenActive)) navigator.vibrate(p); } catch (e) { /* sin vibracion */ } };
  /* jackpots: un pulso por jackpot, cada uno mas largo que el anterior (se nota mas fuerte) */
  A.haptic.jackpot = level => {
    const P = [40, 70, 150], p = [];
    for (let k = 0; k < Math.max(1, Math.min(3, level)); k++) { if (k) p.push(Math.round(JP_GAP * 1000) - P[k - 1]); p.push(P[k]); }
    A.haptic(p);
  };
  /* la frase de la ronda: los sonidos con nota de una jugada siguen una misma linea que sube (como la cuenta de Balatro) */
  const fr = { t: -9, d: 0 };
  const sigue = (t, base) => { if (t - fr.t > 2.6) fr.d = base; fr.t = t; return fr.d; };
  const avanza = (t, n = 1) => { fr.d += n; fr.t = t; return fr.d; };
  /* la frase sube, pero nunca pasa de do7 (2,1 kHz): si se pasa, baja una octava (en una ronda con diana y racha larga llegaba a 4-8 kHz) */
  const techo = m => { while (m > 96) m -= 12; return m; };
  /* el "rrring" de la tragaperras, redondo, y la lluvia de fichas que caen (mas seguidas al principio); i0..i1: un trozo de la lluvia */
  function ringSoft(to, a, c, t, n, v) { for (let i = 0; i < n; i++) vibes(to, i % 2 ? c : a, t + i * 0.045, { v: v * (1 - 0.7 * i / n), dur: 0.12, trem: false, pan: (i % 2 ? 0.25 : -0.25) }); }
  function lluvia(to, t, n, span, v, i0 = 0, i1 = n) { for (let i = i0; i < i1; i++) { const d = t + span * Math.pow(i / n, 1.3) + R() * 0.03; rec(to, R() < 0.8 ? "chip" : "mano", d, { lp: 3200, v: v * (0.6 + 0.6 * R()), len: 0.2, pan: (R() - 0.5) * 1.2, rate: 1 + R() * 0.2 }); } }
  /* el acorde disminuido oscuro del jefe: sierras tras un paso bajo de 600 Hz, sin zumbido */
  function padOscuro(to, notes, t, dur, v) {
    const g = ctx.createGain(), l = ctx.createBiquadFilter(); l.type = "lowpass"; l.Q.value = 0.6; l.frequency.setValueAtTime(380, t); l.frequency.linearRampToValueAtTime(650, t + dur * 0.55); l.frequency.linearRampToValueAtTime(420, t + dur);
    notes.forEach(m => [-9, 9].forEach(dt => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(m); o.detune.value = dt; wobN.connect(o.detune); o.connect(g); o.start(t); o.stop(t + dur + 0.1); }));
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + dur * 0.45); g.gain.linearRampToValueAtTime(0.0001, t + dur); g.connect(l).connect(to);
  }
  /* el murmullo del crupier: triangular filtrada por dos formantes que alternan (sigue siendo "pixel", sin pitido) */
  const VM = { sly: { b: 52, pat: [0, 3, 5, 3, 7, 5], d: 0.065 }, laugh: { b: 60, pat: [7, 3], d: 0.08 }, angry: { b: 43, pat: [0, -2, 1, -3], d: 0.06 }, shock: { b: 57, pat: [0, 4, 8, 12], d: 0.055 }, boss: { b: 38, pat: [0, 0, -3, 2], d: 0.09 } };

  const NW = {
    /* RATON (pasar): la ficha que roza el fieltro, apagada, por debajo de la musica, y una nota de vibrafono casi en susurro. Barrer varios controles
       seguidos sube por la escala (rebota arriba y baja: nunca chilla) y al parar un instante vuelve al principio. x: el lado (-1..1). Comparte hovT
       con menuHover: si dos oyentes saltan a la vez (Enciclopedia, parche), suena uno */
    hover: go((t, x = 0) => {
      if (t - hovT < 0.06) return; const since = t - hovT; hovT = t;
      if (since > 0.75) { hovStep = 0; hovDir = 1; } else { hovStep += hovDir; if (hovStep >= 6) hovDir = -1; else if (hovStep <= 0) hovDir = 1; }
      const b = bus("hover", 0.06, x * 0.45);
      rec(b, "chip", t, { len: 0.07 + 0.03 * R(), lp: 1100 + 400 * R(), v: 0.5, pan: 0, rate: 0.9 });
      felt(b, t + 0.004, { v: 0.022, f: 520 });
      vibes(b, deg(5 + hovStep, 60), t + 0.006, { v: 0.0075 * (0.85 + 0.3 * R()), dur: 0.22, trem: false });
    }),
    /* las placas y las cartas de la portada: cada una su nota del piano (barrerlas es un arpegio), nunca la misma que la anterior */
    menuHover: go((t, k = 0, x = 0) => {
      if (t - hovT < 0.05) return; hovT = t;                                          // barrido muy rapido por encima: no se amontonan
      let m = hovLast; for (let i = 0; i < 6 && m === hovLast; i++) m = deg((HOV_DEG[k] != null ? HOV_DEG[k] : 7) + Math.floor(R() * 3) - 1, 60); hovLast = m;
      const b = bus("menuHover", 0.1, x * 0.5);
      rec(b, "chip", t, { len: 0.09, lp: 1300 + 500 * R(), v: 0.5, pan: 0 }); felt(b, t + 0.004, { v: 0.02 });
      rhodes(b, m, t + 0.006, { v: 0.008 * (0.85 + 0.3 * R()), dur: 0.28, idx: 1.0, lp: 1800 });
    }),
    /* PULSAR: la ficha que se deja en el tapete (boton), la carta que se desliza (pantallas), pulsar el fondo de la portada y el interruptor de madera */
    ui: go((t, x = 0) => { const b = bus("ui", 0.08, x * 0.4); rec(b, "chip", t, { lp: 2400, v: 0.55, len: 0.16 }); felt(b, t, { v: 0.05, f: 700 }); }),
    card: go((t, x = 0) => { const b = bus("card", 0.1, x * 0.4); rec(b, "carta", t, { lp: 4000, v: 0.6, len: 0.32 }); }),
    felt: go((t, x = 0) => { const b = bus("felt", 0.06, x * 0.4); felt(b, t, { v: 0.09, f: 420, dur: 0.06 }); sub(b, t, { v: 0.06, f0: 110, f1: 60, dur: 0.07 }); }),
    toggle: go((t, on = true) => { const b = bus("toggle", 0.05); felt(b, t, { v: 0.06, f: on ? 1200 : 800, dur: 0.025 }); sub(b, t, { v: 0.05, f0: on ? 240 : 180, f1: 90, dur: 0.05 }); vibes(b, deg(on ? 9 : 7, 60), t + 0.012, { v: 0.012, dur: 0.18, trem: false }); }),
    /* reguladores: la nota sube con el valor (0..1) */
    blip: go((t, v = 0.5) => { const b = bus("blip", 0.08); vibes(b, deg(Math.round(v * 9), 60), t, { v: 0.03, dur: 0.3, trem: false }); }),
    deny: go(t => { const b = bus("deny", 0.08); felt(b, t, { v: 0.06, f: 380, dur: 0.06 }); rhodes(b, deg(-3, 48), t, { v: 0.05, dur: 0.3, idx: 0.9, lp: 1400 }); rhodes(b, deg(-4, 48), t + 0.09, { v: 0.045, dur: 0.35, idx: 0.9, lp: 1300 }); }),
    pause: go(t => { const b = bus("pause", 0.15); rhodes(b, deg(0, 60), t, { v: 0.04, dur: 0.5, idx: 1 }); }),
    /* EL MAPA: la chincheta es una ficha que se planta; con racha, su nota sube. x: donde cae */
    pin: go((t, k = 0, x = 0) => {
      const b = bus("pin", 0.12, x * 0.35); sigue(t, 0);
      rec(b, "chip", t, { lp: 2600, v: 0.6, rate: 0.95 }); felt(b, t, { v: 0.07, f: 600 }); sub(b, t, { v: 0.09, f0: 150, f1: 70, dur: 0.1 });
      rhodes(b, deg(Math.min(k, 6), 60), t + 0.02, { v: 0.035, dur: 0.45 });
    }),
    /* EL REVELADO: 0 fallo grande · 1 mal · 2 bien · 3 muy bien · 4 diana · 5 tiempo agotado. Cada resultado tiene su FORMA (cuantas mas notas
       suben, mejor): mal = una nota sola, corta y plana · bien = dos que suben · muy bien = tres y el acorde que florece · diana = golpe, glissando y
       8 bits · fallo grande = dos notas graves que caen · tiempo agotado = el reloj (tic-tac) y una nota grave */
    reveal: go((t, tier = 2) => {
      const b = bus("reveal" + tier, 0.22);
      if (tier === 4) {
        sub(b, t, { v: 0.32, f0: 85, f1: 38, dur: 0.5 });
        [0, 2, 4, 6, 8].forEach((d, i) => rhodes(b, deg(d, 55), t + i * 0.012, { v: 0.055, dur: 1.6, pan: (i - 2) * 0.18 }));
        [5, 6, 7, 8, 9, 10, 11].forEach((d, i) => vibes(b, deg(d, 67), t + 0.06 + i * 0.04, { v: 0.045, dur: 0.9, pan: -0.5 + i * 0.16 }));
        [11, 13].forEach((d, i) => pix(b, deg(d, 72), t + 0.38 + i * 0.07, { v: 0.009 }));
        fr.t = t; fr.d = 11; A.music.duck(0.55, 1500);
      } else if (tier === 3) {
        sub(b, t, { v: 0.08, f0: 130, f1: 60, dur: 0.14 });
        [0, 2, 4].forEach((d, i) => vibes(b, deg(d + 5, 60), t + i * 0.08, { v: 0.05, dur: 0.7, pan: (i - 1) * 0.3, trem: false }));
        [0, 2, 4, 6].forEach((d, i) => rhodes(b, deg(d, 55), t + 0.17 + i * 0.012, { v: 0.045, dur: 1.3, pan: (i - 1.5) * 0.16 }));
        fr.t = t; fr.d = 9; A.music.duck(0.7, 1200);
      } else if (tier === 2) {
        vibes(b, deg(5, 60), t, { v: 0.05, dur: 0.45, trem: false }); vibes(b, deg(7, 60), t + 0.1, { v: 0.05, dur: 0.75 });
        [0, 2, 4].forEach((d, i) => rhodes(b, deg(d, 55), t + 0.1 + i * 0.014, { v: 0.03, dur: 0.8, pan: (i - 1) * 0.15 }));
        fr.t = t; fr.d = 7;
      } else if (tier === 1) {
        rhodes(b, deg(3, 55), t, { v: 0.055, dur: 0.32, idx: 1.0, lp: 2200 }); felt(b, t, { v: 0.03, f: 700, dur: 0.03 }); fr.t = t; fr.d = 4;
      } else if (tier === 0) {
        felt(b, t, { v: 0.05, f: 400, dur: 0.07 }); sub(b, t, { v: 0.07, f0: 110, f1: 50, dur: 0.18 });
        rhodes(b, deg(-1, 48), t, { v: 0.05, dur: 0.6, idx: 1, lp: 1700 }); rhodes(b, deg(-4, 48), t + 0.2, { v: 0.05, dur: 1.1, idx: 0.9, lp: 1400 }); fr.t = -9;
      } else {
        felt(b, t, { v: 0.08, f: 2600, dur: 0.014 }); felt(b, t + 0.17, { v: 0.07, f: 1800, dur: 0.014 }); felt(b, t + 0.34, { v: 0.08, f: 2600, dur: 0.014 });
        rhodes(b, deg(-5, 48), t + 0.5, { v: 0.05, dur: 1.0, idx: 0.8, lp: 1300 }); fr.t = -9;
      }
    }),
    /* el golpe grave de la diana, tras su instante de silencio (js/casa.js) */
    impacto: go(t => { const b = bus("impacto", 0.05); sub(b, t, { v: 0.3, f0: 70, f1: 32, dur: 0.45 }); felt(b, t, { v: 0.06, f: 300, dur: 0.08 }); }),
    /* la cuenta: cada sumando, una ficha y una nota mas arriba (sigue la linea del revelado) */
    golpe: go((t, k = 0) => { const b = bus("golpe", 0.12), d = avanza(t); rec(b, "chip", t, { lp: 2200, v: 0.45, len: 0.12, rate: 1 + 0.06 * k }); vibes(b, techo(deg(d, 64)), t + 0.004, { v: 0.04, dur: 0.45, trem: false }); }),
    /* contador de puntos: sube por la escala, como una maquinita */
    count: go((t, k = 0) => { const b = bus("count", 0.03); felt(b, t, { v: 0.02, f: 1500 + 900 * k, dur: 0.012 }); vibes(b, deg(Math.floor(k * 9), 72), t, { v: 0.008, dur: 0.07, trem: false }); }),
    countEnd: go(t => { const b = bus("countEnd", 0.18), d = avanza(t); vibes(b, techo(deg(d, 64)), t, { v: 0.04, dur: 0.7 }); vibes(b, techo(deg(d + 2, 64)), t + 0.05, { v: 0.025, dur: 0.7 }); }),
    /* los ultimos segundos: el tic de madera, mas agudo cuanto menos queda */
    tick: go((t, n = 3) => { const b = bus("tick", 0.04); felt(b, t, { v: 0.05, f: 1800 - n * 200, dur: 0.02 }); rhodes(b, deg(6 - n, 60), t, { v: 0.025, dur: 0.15, idx: 1 }); }),
    /* racha: el vibrafono sube un escalon por nivel; desde 4, el pellizco de 8 bits */
    streak: go((t, n = 2) => {
      const b = bus("streak", 0.2), d = avanza(t);
      [0, 2, 4].forEach((s, i) => vibes(b, techo(deg(d + s + Math.min(n, 7), 60)), t + i * 0.06, { v: 0.04, dur: 0.6, pan: (i - 1) * 0.3 }));
      if (n >= 4) pix(b, techo(deg(d + 7 + Math.min(n, 7), 72)), t + 0.2, { v: 0.008, dur: 0.1 });
    }),
    /* racha rota: la ficha que se agrieta (dos fichas que caen sordas) y dos notas que bajan. Perder no se celebra, pero se nota */
    streakBreak: go(t => { const b = bus("streakBreak", 0.12); rec(b, "chip", t, { lp: 2600, v: 0.55, rate: 0.75 }); rec(b, "chip", t + 0.07, { lp: 2200, v: 0.35, rate: 0.68 }); rhodes(b, deg(3, 55), t + 0.05, { v: 0.035, dur: 0.4, idx: 1 }); rhodes(b, deg(1, 55), t + 0.18, { v: 0.03, dur: 0.6, idx: 0.9 }); fr.t = -9; }),
    /* la bandera del acierto: la corneta de 8 bits se queda (es el toque pixel de la casa), mas redonda y mas baja, doblada por el piano. Nunca el
       motivo de la vez anterior. n = 2 (dos paises): un eco arriba */
    flag: go((t, n = 1) => {
      const M = [[0, 1, 2], [0, 2, 3], [1, 2, 4], [0, 1, 4], [0, 2, 4]]; let mi = Math.floor(R() * M.length); if (mi === flagLast) mi = (mi + 1) % M.length; flagLast = mi;
      const b = bus("flag", 0.15), step = 0.1 + 0.02 * R();
      felt(b, t, { v: 0.04, f: 900, dur: 0.06 });
      M[mi].forEach((d, i) => { const last = i === 2; pix(b, deg(d + 5, 60), t + 0.05 + i * step, { v: last ? 0.02 : 0.016, dur: last ? 0.4 : 0.1 }); rhodes(b, deg(d + 5, 60), t + 0.05 + i * step, { v: 0.018, dur: last ? 0.5 : 0.15, idx: 1 }); });
      if (n > 1) M[mi].forEach((d, i) => pix(b, deg(d + 10, 60), t + 0.2 + i * step, { v: 0.008, dur: 0.09 }));
    }),
    coin: go((t, k = 0) => { const b = bus("coin", 0.12, (R() - 0.5) * 0.6); rec(b, "chip", t, { lp: 2300, v: 0.55, rate: 1.05 + 0.1 * k }); vibes(b, deg(6 + Math.round(k * 4), 64), t + 0.01, { v: 0.018, dur: 0.3, trem: false }); }),
    /* PREMIOS (Enciclopedia: 1, 2 o 3 jackpots segun el nivel, 300 / 150 / 75 km): cada jackpot es un golpe: peso, fichas que caen (mas cuanto mas
       grande), acorde del piano que sube (I, IV, V) y arpegio de vibrafono; el 2 y el 3 llevan el "rrring" de la tragaperras (redondo, sin metal) y el 3
       remata con el acorde abierto, la lluvia de fichas y el pellizco de 8 bits. Cada golpe se crea JP_LEAD antes de sonar (el 3 son ~700 nodos) */
    jackpot: go((t, level = 1) => {
      const n = Math.max(1, Math.min(3, level | 0)), b = bus("jackpot" + n, 0.25);
      const CH = [[0, 2, 4, 6], [3, 5, 7, 9], [4, 6, 8, 10]];                    // I, IV (sobre la pentatonica), V
      const hit = k => {
        const t0 = t + k * JP_GAP, p = [1, 1.18, 1.4][k];
        sub(b, t0, { v: [0.18, 0.24, 0.34][k], f0: [110, 100, 90][k], f1: [48, 42, 34][k], dur: [0.22, 0.3, 0.55][k] });
        lluvia(b, t0, 3 + k * 3, 0.3, 0.16 * p);
        CH[k].forEach((d, i) => rhodes(b, deg(d, 55), t0 + 0.01 + i * 0.012, { v: 0.045 * p, dur: 0.9, pan: (i - 1.5) * 0.2 }));
        [0, 1, 2, 3, 4].forEach((s, i) => vibes(b, deg(CH[k][0] + 5 + s, 64), t0 + 0.05 + i * 0.035, { v: 0.032 * p, dur: 0.5, pan: -0.5 + i * 0.25, trem: false }));
        if (k >= 1) ringSoft(b, deg(CH[k][0] + 10, 64), deg(CH[k][0] + 9, 64), t0 + 0.2, k === n - 1 ? 9 : 5, 0.022 * p);
      };
      for (let k = 0; k < n; k++) later(t + k * JP_GAP, () => hit(k));
      const tl = t + (n - 1) * JP_GAP;
      if (n === 3) {
        later(tl + 0.4, () => lluvia(b, tl + 0.4, 18, 1.4, 0.13, 0, 9));                                           // la lluvia final, en dos tandas
        later(tl + 0.4 + 1.4 * Math.pow(0.5, 1.3), () => lluvia(b, tl + 0.4, 18, 1.4, 0.13, 9, 18));
        later(tl + 0.5, () => {
          [0, 2, 4, 6, 8, 10].forEach((d, i) => rhodes(b, deg(d, 48), tl + 0.5 + i * 0.03, { v: 0.05, dur: 2.6, pan: (i - 2.5) * 0.2 }));
          [10, 11, 12, 13, 14].forEach((d, i) => vibes(b, deg(d, 60), tl + 0.55 + i * 0.07, { v: 0.035, dur: 1.4, pan: -0.6 + i * 0.3 }));
        });
        later(tl + 0.9, () => [12, 13, 14, 15].forEach((d, i) => pix(b, deg(d, 72), tl + 0.9 + i * 0.06, { v: 0.009, dur: 0.1, pan: 0.5 - i * 0.3 })));
      } else later(tl + 0.3, () => lluvia(b, tl + 0.3, n === 2 ? 8 : 4, n === 2 ? 0.8 : 0.5, 0.11));
      fr.t = t; fr.d = 10; A.music.duck([0.75, 0.62, 0.5][n - 1], [1200, 1800, 3200][n - 1]);
    }),
    /* el haz de luz del premio gordo: un glissando de vibrafono (nada de barridos de ruido) */
    barrido: go(t => { const b = bus("barrido", 0.3); for (let i = 0; i < 9; i++) vibes(b, deg(5 + i, 60), t + i * 0.035, { v: 0.022, dur: 0.6, pan: -0.8 + i * 0.2, trem: false }); }),
    /* la meta (js/marcador.js): la firma de la casa (sol-do-re en Do; en otra cancion, su equivalente) en piano y vibrafono */
    goal: go(t => { const b = bus("goal", 0.25); sub(b, t, { v: 0.16, f0: 120, f1: 50, dur: 0.2 }); [3, 5, 6].forEach((d, i) => { rhodes(b, deg(d, 60), t + 0.02 + i * 0.08, { v: 0.05, dur: 0.9 }); vibes(b, deg(d + 5, 60), t + 0.02 + i * 0.08, { v: 0.025, dur: 0.6 }); }); [0, 2, 4, 6].forEach((d, i) => rhodes(b, deg(d, 55), t + 0.28 + i * 0.01, { v: 0.035, dur: 1.4 })); pix(b, deg(11, 72), t + 0.3, { v: 0.008 }); A.music.duck(0.7, 1100); }),
    /* cada escalon de botin: unas fichas y dos notas, mas arriba cada vez */
    lootStep: go((t, k = 1) => { const b = bus("lootStep", 0.15); lluvia(b, t, 1 + k, 0.15, 0.3); vibes(b, deg(5 + Math.min(4, k), 64), t, { v: 0.035, dur: 0.5 }); vibes(b, deg(7 + Math.min(4, k), 64), t + 0.05, { v: 0.025, dur: 0.6 }); }),
    ach: go(t => { const b = bus("ach", 0.3); sub(b, t, { v: 0.15, f0: 110, f1: 50, dur: 0.25 }); [0, 2, 4, 6, 8].forEach((d, i) => rhodes(b, deg(d, 55), t + i * 0.015, { v: 0.045, dur: 1.5, pan: (i - 2) * 0.2 })); [5, 7, 9, 10].forEach((d, i) => vibes(b, deg(d, 64), t + 0.1 + i * 0.08, { v: 0.04, dur: 0.9 })); [10, 12].forEach((d, i) => pix(b, deg(d, 72), t + 0.45 + i * 0.07, { v: 0.008 })); A.music.duck(0.7, 1400); }),
    buy: go(t => { const b = bus("buy", 0.15); rec(b, "mano", t, { lp: 2400, v: 0.55, len: 0.35 }); [0, 2, 4].forEach((d, i) => vibes(b, deg(d + 5, 60), t + 0.05 + i * 0.05, { v: 0.035, dur: 0.6 })); }),
    sell: go(t => { const b = bus("sell", 0.12); rec(b, "chip", t, { lp: 2600, v: 0.5 }); vibes(b, deg(6, 60), t + 0.02, { v: 0.03, dur: 0.4 }); vibes(b, deg(4, 60), t + 0.1, { v: 0.028, dur: 0.5 }); }),
    clear: go(t => { const b = bus("clear", 0.3); sub(b, t, { v: 0.2, f0: 120, f1: 42, dur: 0.3 }); [0, 1, 2, 3, 4, 5].forEach((d, i) => vibes(b, deg(d + 5, 60), t + 0.06 + i * 0.07, { v: 0.04, dur: 1.0, pan: -0.5 + i * 0.2 })); [0, 2, 4, 6, 8].forEach((d, i) => rhodes(b, deg(d, 55), t + 0.45 + i * 0.012, { v: 0.045, dur: 1.8 })); pix(b, deg(12, 72), t + 0.55, { v: 0.009 }); A.music.duck(0.6, 1800); }),
    lose: go(t => { const b = bus("lose", 0.3); sub(b, t, { v: 0.16, f0: 80, f1: 34, dur: 0.5 }); [-1, -2, -3, -5].forEach((d, i) => rhodes(b, deg(d, 55), t + i * 0.18, { v: 0.045, dur: 1.3, idx: 0.9, lp: 1600 })); A.music.duck(0.6, 2200); }),
    stamp: go(t => { const b = bus("stamp", 0.08); sub(b, t, { v: 0.22, f0: 130, f1: 40, dur: 0.25 }); felt(b, t, { v: 0.09, f: 500, dur: 0.07 }); rec(b, "carta", t + 0.01, { lp: 3000, v: 0.3, len: 0.12 }); }),
    win: go(t => { const b = bus("win", 0.35); [3, 5, 6].forEach((d, i) => rhodes(b, deg(d, 60), t + 0.1 + i * 0.11, { v: 0.055, dur: 1.4 })); [0, 2, 4, 6, 8].forEach((d, i) => vibes(b, deg(d + 5, 60), t + 0.45 + i * 0.07, { v: 0.04, dur: 1.4, pan: -0.6 + i * 0.3 })); [0, 2, 4, 6, 8].forEach((d, i) => rhodes(b, deg(d, 48), t + 0.4 + i * 0.02, { v: 0.04, dur: 2.6 })); [12, 13, 14].forEach((d, i) => pix(b, deg(d, 72), t + 0.8 + i * 0.06, { v: 0.009 })); A.music.duck(0.5, 2600); }),
    intro: go(t => { const b = bus("intro", 0.25); felt(b, t, { v: 0.05, f: 2400, dur: 0.012 }); sub(b, t + 0.02, { v: 0.12, f0: 200, f1: 80, dur: 0.06 }); [3, 5, 6].forEach((d, i) => rhodes(b, deg(d, 48), t + 0.34 + i * 0.09, { v: 0.045, dur: 0.8 })); A.music.duck(0.75, 1500); }),
    /* una lampara del escenario que se enciende (v0.3.72): el chasquido y, muy bajito, una nota que canta; la segunda, un pelo mas aguda */
    lampara: go((t, i = 0) => { const b = bus("lampara", 0.2); felt(b, t, { v: 0.05, f: 2600 + 400 * i, dur: 0.012 }); sub(b, t, { v: 0.04, f0: 260 - 30 * i, f1: 120, dur: 0.05 }); vibes(b, deg(i ? 8 : 6, 64), t + 0.02, { v: 0.012, dur: 0.8 }); }),
    /* LLEGA EL JEFE: tres golpes de timbal con cuerpo, un acorde disminuido que crece desde lo grave (oscuro: sierras tras un paso bajo de 600 Hz,
       sin zumbido) y el motivo que cae medio tono a medio tono en el piano */
    boss: go(t => {
      const b = bus("boss", 0.4), r = 36 + ((curT().home % 12) + 12) % 12;
      [0, 0.3, 0.6].forEach((d, i) => { sub(b, t + d, { v: 0.36, f0: 95, f1: 32, dur: 0.5 }); sub(b, t + d, { v: 0.12 + i * 0.02, f0: 170, f1: 85, dur: 0.22 }); felt(b, t + d, { v: 0.06, f: 260, dur: 0.09 }); });
      padOscuro(b, [r, r + 3, r + 6, r + 12], t + 0.05, 3.0, 0.03);
      [[15, 0.9], [12, 1.22], [11, 1.6]].forEach(([s, d], i) => { rhodes(b, r + s, t + d, { v: 0.07, dur: i === 2 ? 2.6 : 1.4, idx: 2.4, lp: 1500 }); rhodes(b, r + s - 12, t + d, { v: 0.05, dur: i === 2 ? 2.6 : 1.4, idx: 1.6, lp: 900 }); });
      A.music.duck(0.45, 3000);
    }),
    /* el crupier: una silaba por letra (i = indice), murmullo calido segun su humor */
    voice: go((t, mood = "sly", i = 0) => {
      const m = VM[mood] || VM.sly, b = bus("voice", 0.05), n = m.b + 12 + m.pat[i % m.pat.length] + ((i * 7) % 3), f = mtof(n);
      const os = ctx.createOscillator(), g = ctx.createGain(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), mix = ctx.createGain(), lp = ctx.createBiquadFilter();
      os.type = "triangle"; os.frequency.setValueAtTime(f, t); os.frequency.exponentialRampToValueAtTime(f * 1.03, t + m.d);
      f1.type = "bandpass"; f1.frequency.value = [700, 900, 550][i % 3]; f1.Q.value = 3; f2.type = "bandpass"; f2.frequency.value = [1150, 1500, 1900][(i + 1) % 3]; f2.Q.value = 4;
      lp.type = "lowpass"; lp.frequency.value = 2200; os.connect(f1).connect(mix); os.connect(f2).connect(mix); mix.connect(lp).connect(g).connect(b);
      env(g, t, 0.008, 0.16, m.d); os.start(t); os.stop(t + m.d + 0.05);
    }),
    /* CASINO: la ficha de la apuesta, el tic de la ruleta (madera, no pitido) y la bola que cae en su casilla */
    rouBet: go((t, k = 0) => { const b = bus("rouBet", 0.1); rec(b, "chip", t, { lp: 2600, v: 0.6 }); rec(b, "chip", t + 0.06, { lp: 2400, v: 0.35 }); vibes(b, deg(6 + k, 64), t + 0.02, { v: 0.02, dur: 0.35, trem: false }); }),
    rouTick: go((t, v = 0) => { const b = bus("rouTick", 0.04); felt(b, t, { v: 0.03 + v * 0.05, f: 2600 - v * 1300, dur: 0.012 + v * 0.02 }); sub(b, t, { v: 0.02 + v * 0.05, f0: 420 - v * 200, f1: 160, dur: 0.03 }); }),
    rouStop: go(t => { const b = bus("rouStop", 0.2); sub(b, t, { v: 0.2, f0: 160, f1: 50, dur: 0.2 }); felt(b, t, { v: 0.07, f: 1800, dur: 0.03 }); rec(b, "chip", t + 0.02, { lp: 2600, v: 0.4 }); vibes(b, deg(4, 60), t + 0.03, { v: 0.035, dur: 0.8 }); }),

    /* ---- LA REGLA: los de siempre, sin version nueva. Suenan igual, por su tira (dos pasos bajos hacia 4,2 kHz y su escalon) ---- */
    /* ruleta lineal del Campamento (v0.73): el "no va mas", el arranque (la musica baja), el latido del casi-fallo, el frenazo, el empujon y el cero */
    rouNoMore: old("rouNoMore", t => { bell(91, t, { vol: 0.07, dur: 0.9, rev: 0.4 }); bell(91, t + 0.13, { vol: 0.06, dur: 1.1, rev: 0.4 }); thump(t, { vol: 0.12, f0: 120, f1: 60, dur: 0.2 }); }),
    rouStart: old("rouStart", t => { noise(t, 0.6, { lp: 300, sweepTo: 6500, vol: 0.085, type: "bandpass", q: 1.2 }); thump(t, { vol: 0.26, f0: 140, f1: 46, dur: 0.3 }); for (let i = 0; i < 6; i++) noise(t + 0.04 + i * 0.045, 0.01, { hp: 3000 + i * 500, vol: 0.04 }); A.music.duck(0.65, 3600); }),
    rouCrawl: old("rouCrawl", t => { thump(t, { vol: 0.3, f0: 72, f1: 36, dur: 0.16 }); thump(t + 0.17, { vol: 0.22, f0: 66, f1: 34, dur: 0.18 }); thump(t + 0.62, { vol: 0.3, f0: 72, f1: 36, dur: 0.16 }); pad([43, 50], t, 1.1, 0.035, lb); }),
    /* carrete de finales (v0.2.47): el frenazo en seco (barrido que cae + matraca) y el nuevo empujon tras un falso final (barrido que sube + golpe) */
    rouBrake: old("rouBrake", t => { noise(t, 0.5, { lp: 7000, sweepTo: 350, vol: 0.09, type: "bandpass", q: 1.6 }); thump(t + 0.02, { vol: 0.2, f0: 150, f1: 50, dur: 0.28 }); for (let i = 0; i < 4; i++) noise(t + 0.06 + i * 0.07, 0.012, { hp: 3500 + i * 300, vol: 0.04 }); }),
    rouKick: old("rouKick", t => { noise(t, 0.28, { lp: 500, sweepTo: 5200, vol: 0.075, type: "bandpass", q: 1.2 }); thump(t, { vol: 0.24, f0: 150, f1: 52, dur: 0.22 }); noise(t + 0.02, 0.012, { hp: 4600, vol: 0.05 }); A.music.duck(0.65, 1800); }),
    rouZero: old("rouZero", t => { thump(t, { vol: 0.4, f0: 95, f1: 30, dur: 0.55 }); bell(67, t + 0.02, { vol: 0.08, dur: 1.4, rev: 0.4 }); bell(60, t + 0.1, { vol: 0.07, dur: 1.4, rev: 0.4 }); A.music.duck(0.55, 1500); }),
    /* Moneda al aire (v0.2.9): el lanzamiento y cada rebote al caer (k: 0 el golpe, 1 el rebote chico); el traqueteo de una moneda que se asienta (v0.2.47) */
    coinToss: old("coinToss", t => { noise(t, 0.16, { hp: 2800, sweepTo: 9000, type: "highpass", vol: 0.05 }); bell(95, t, { vol: 0.08, dur: 0.5, rev: 0.2 }); bell(102, t + 0.035, { vol: 0.05, dur: 0.6, rev: 0.2 }); thump(t, { vol: 0.1, f0: 300, f1: 140, dur: 0.06 }); }),
    coinLand: old("coinLand", (t, k = 0) => { thump(t, { vol: 0.24 - k * 0.12, f0: 280, f1: 110, dur: 0.07 }); bell(88 + k * 6, t + 0.004, { vol: 0.11 - k * 0.05, dur: 1 - k * 0.5, rev: 0.3 }); bell(100 + k * 6, t + 0.04, { vol: 0.07 - k * 0.03, dur: 0.8 - k * 0.4, rev: 0.3 }); }),
    coinTink: old("coinTink", t => { bell(98 + Math.random() * 6, t, { vol: 0.05, dur: 0.22, rev: 0.15 }); thump(t, { vol: 0.05, f0: 360, f1: 200, dur: 0.03 }); noise(t, 0.008, { hp: 5000, vol: 0.03 }); }),
    /* Los tres cubiletes (v0.2.48): el golpe de cada cambio (el tono sube con el ritmo: i = numero de cambio), levantar un cubilete, el redoble de la revelacion y el guino del trilero */
    cupClack: old("cupClack", (t, i = 0) => { noise(t, 0.045, { hp: 2000 + i * 140, vol: 0.13 }); thump(t, { vol: 0.13, f0: 250 + i * 12, f1: 120, dur: 0.09 }); pluck(62 + (i % 6), t + 0.004, { vol: 0.02, dur: 0.06, bright: 5, rev: 0.05 }); }),
    cupLift: old("cupLift", t => { noise(t, 0.16, { hp: 900, vol: 0.06 }); thump(t, { vol: 0.06, f0: 170, f1: 300, dur: 0.15 }); }),
    cupDrum: old("cupDrum", (t, ms = 900) => { const n = Math.round(ms / 55); for (let i = 0; i < n; i++) { thump(t + i * 0.055, { vol: 0.05 + (i / n) * 0.13, f0: 95 + Math.random() * 8, f1: 70, dur: 0.06 }); noise(t + i * 0.055, 0.03, { hp: 1800, vol: 0.03 + (i / n) * 0.07 }); } A.music.duck(0.65, ms + 400); }),
    cupWink: old("cupWink", t => { pluck(79, t, { vol: 0.09, dur: 0.18, bright: 4, rev: 0.2 }); pluck(86, t + 0.12, { vol: 0.07, dur: 0.22, bright: 4, rev: 0.25 }); bell(98, t + 0.2, { vol: 0.04, dur: 0.5, rev: 0.3 }); }),
    /* Duelo de dados (v0.2.49): el cubilete que se agita (a: fuerza), cada bote (s: 0-1), el choque de dos dados, la baranda, el cubilete que se estampa, el paron del dado y los remates (empate, ojos de serpiente, doble seis) */
    diceRattle: old("diceRattle", (t, a = 1) => { const n = 3 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) { const d = i * (0.02 + Math.random() * 0.03); noise(t + d, 0.03, { hp: 1800 + Math.random() * 2600, vol: (0.05 + Math.random() * 0.05) * a }); thump(t + d, { vol: 0.012 * a, f0: 700 + Math.random() * 900, f1: 300, dur: 0.03 }); } }),
    diceLand: old("diceLand", (t, s = 1) => { noise(t, 0.05, { hp: 800 + Math.random() * 400, vol: 0.05 + 0.1 * s }); thump(t, { vol: 0.06 + 0.12 * s, f0: (150 + Math.random() * 50) * (1.3 - s * 0.4), f1: 60, dur: 0.09 }); noise(t + 0.004, 0.04, { hp: 3500, vol: 0.01 + 0.03 * s }); }),
    diceTick: old("diceTick", t => { noise(t, 0.02, { hp: 3000, vol: 0.03 }); }),
    diceClack: old("diceClack", t => { noise(t, 0.03, { hp: 3200, vol: 0.1 }); thump(t, { vol: 0.1, f0: 260, f1: 120, dur: 0.1 }); pluck(88, t, { vol: 0.03, dur: 0.05, bright: 5, rev: 0.05 }); }),
    diceRail: old("diceRail", t => { thump(t, { vol: 0.2, f0: 210, f1: 80, dur: 0.2 }); noise(t, 0.12, { hp: 600, vol: 0.1 }); bell(79, t + 0.01, { vol: 0.03, dur: 0.5, rev: 0.2 }); }),
    diceSlam: old("diceSlam", t => { thump(t, { vol: 0.34, f0: 120, f1: 40, dur: 0.35 }); noise(t, 0.14, { hp: 700, vol: 0.14 }); for (let i = 0; i < 4; i++) noise(t + 0.05 + i * 0.04, 0.03, { hp: 1800 + Math.random() * 2600, vol: 0.07 }); }),
    diceTie: old("diceTie", t => { bell(69, t, { vol: 0.08, dur: 0.5, rev: 0.25 }); bell(69, t + 0.3, { vol: 0.08, dur: 0.7, rev: 0.3 }); bell(64, t + 0.3, { vol: 0.05, dur: 0.7, rev: 0.3 }); }),
    diceSnake: old("diceSnake", t => { noise(t, 0.7, { hp: 5000, sweepTo: 2400, vol: 0.05 }); pluck(98, t, { vol: 0.03, dur: 0.5, bright: 3, wave: "sawtooth", rev: 0.3 }); }),
    diceBoom: old("diceBoom", t => { thump(t, { vol: 0.3, f0: 80, f1: 30, dur: 0.6 }); [72, 76, 79, 84, 88].forEach((m, i) => bell(m, t + 0.1 + i * 0.08, { vol: 0.07, dur: 0.6, rev: 0.3 })); }),
    /* Lluvia de fichas (v0.2.50): cada clavija suena una nota de una pentatonica que sube con la caida (root: nota base de esa ficha, i: fila), la pared, el aterrizaje y el destello falso */
    plkPeg: old("plkPeg", (t, i = 0, root = 57, soft = false) => { const m = root + [0, 2, 4, 7, 9][i % 5] + 12 * Math.floor(i / 5); pluck(m, t, { vol: soft ? 0.035 : 0.09, dur: 0.42, bright: 4, rev: 0.25 }); noise(t, 0.02, { hp: 3500, vol: soft ? 0.015 : 0.04 }); }),
    plkWall: old("plkWall", t => { noise(t, 0.05, { hp: 1800, vol: 0.07 }); thump(t, { vol: 0.1, f0: 420, f1: 300, dur: 0.14 }); bell(91, t, { vol: 0.02, dur: 0.2, rev: 0.1 }); }),
    plkDrop: old("plkDrop", t => { noise(t, 0.2, { hp: 900, sweepTo: 3000, vol: 0.06 }); thump(t, { vol: 0.08, f0: 520, f1: 180, dur: 0.22 }); }),
    plkLand: old("plkLand", (t, i = 0, root = 57) => { thump(t, { vol: 0.2, f0: 150, f1: 50, dur: 0.22 }); noise(t, 0.07, { hp: 1400, vol: 0.07 }); [0, 2, 4].forEach(k => bell(root + 12 + [0, 2, 4, 7, 9][(i + k) % 5] + 12 * Math.floor((i + k) / 5), t + 0.02, { vol: 0.04, dur: 0.6, rev: 0.3 })); }),
    plkFlash: old("plkFlash", t => { bell(100, t, { vol: 0.02, dur: 0.12, rev: 0.1 }); }),
    plkTick: old("plkTick", t => { noise(t, 0.015, { hp: 3000, vol: 0.012 }); }),
    /* El globo (v0.2.51) y el rasca (v0.2.52): tonos y ruido sintetizados con los parametros de sus maquetas (componen con ellos todos sus sonidos), el motor
       continuo del globo, que sube de tono con el multiplicador, y el rasqueo, un ruido en bucle cuya intensidad y tono siguen la velocidad del doblon */
    gbTone: old("gbTone", (t, f0, f1, d, type, v, delay) => { const T = t + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, T); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, T + d); env(g, T, 0.004, v, d); o.connect(g).connect(lb); o.start(T); o.stop(T + d + 0.05); }),
    gbNoise: old("gbNoise", (t, d, v, hp, delay, lp, sweep) => { noise(t + (delay || 0), d, Object.assign({ vol: v }, lp ? { lp } : { hp }, sweep ? { sweepTo: sweep } : {})); }),
    gbEngine: (() => {
      let n = null;
      const f = p => { if (!ctx || !A.audio.sfxOn) return; if (!n) { const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(); o1.type = "sine"; o2.type = "triangle"; o2.detune.value = 7; g.gain.value = 0.0001; o1.connect(g); o2.connect(g); g.connect(strip("gbEngine").g); o1.start(); o2.start(); n = { o1, o2, g }; }
        const hz = 160 * Math.pow(2, p * 2.7), t = ctx.currentTime; n.o1.frequency.setTargetAtTime(hz, t, 0.08); n.o2.frequency.setTargetAtTime(hz * 1.5, t, 0.08); n.g.gain.setTargetAtTime(0.012 + p * 0.028, t, 0.1); };
      f.stop = () => { if (!n) return; const m = n; n = null; m.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05); setTimeout(() => { try { m.o1.stop(); m.o2.stop(); } catch (e) { /* ya parado */ } }, 400); };
      return f;
    })(),
    rcNoise: old("rcNoise", (t, d, v, hp, delay, bp) => { noise(t + (delay || 0), d, Object.assign({ vol: v }, bp ? { lp: bp, type: "bandpass", q: 1.1 } : { hp })); }),
    rcScratch: (() => {
      let n = null;
      const f = speed => {
        if (!A.audio.sfxOn || document.hidden || !init()) return;
        if (!n) { const nn = ctx.sampleRate, b = ctx.createBuffer(1, nn, ctx.sampleRate), d0 = b.getChannelData(0); for (let i = 0; i < nn; i++) d0[i] = Math.random() * 2 - 1;
          const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; s.loop = true; bp.type = "bandpass"; bp.Q.value = 0.9; hp.type = "highpass"; hp.frequency.value = 1400; g.gain.value = 0;
          s.connect(bp).connect(hp).connect(g).connect(strip("rcScratch").g); s.start(); n = { s, bp, g, last: 0 }; }
        const t = ctx.currentTime; n.g.gain.setTargetAtTime(Math.min(0.13, 0.025 + speed * 0.00009), t, 0.012); n.bp.frequency.setTargetAtTime(2600 + Math.random() * 2400 + Math.min(1800, speed * 0.6), t, 0.008); n.last = performance.now();
      };
      f.idle = now => { if (n && now - n.last > 70 && n.g.gain.value > 0.0005) n.g.gain.setTargetAtTime(0, ctx.currentTime, 0.025); };
      f.stop = () => { if (!n) return; const m = n; n = null; try { m.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03); } catch (e) { /* contexto cerrado */ } setTimeout(() => { try { m.s.stop(); } catch (e) { /* ya parado */ } }, 300); };
      return f;
    })(),
    /* el final de una partida que no se gana y la victoria (fin de la Aventura, del Clasico, del Duelo) */
    fail: old("fail", t => { [64, 60, 57].forEach((m, i) => pluck(m, t + i * 0.2, { vol: 0.13, dur: 1, bright: 2, rev: 0.6 })); thump(t, { vol: 0.14, f0: 90, f1: 40 }); A.music.duck(0.55, 2200); }),
    victory: old("victory", t => {
      MOTIF.forEach((m, i) => pluck(m + 12, t + i * 0.13, { vol: 0.17, dur: 1.4, rev: 0.7 }));
      for (let i = 0; i < 12; i++) bell(scaleNote(5 + i, 60) + 12, t + 0.55 + i * 0.09, { vol: 0.06, dur: 1.5 });
      pad([48, 55, 60, 64, 67], t + 0.4, 4, 0.06, lb); thump(t + 0.5, { vol: 0.3, f0: 100, f1: 36, dur: 0.5 }); A.music.duck(0.5, 4200);
    }),
    /* la risa del crupier */
    laugh: old("laugh", t => { for (let k = 0; k < 8; k++) blipSq(t + k * 0.095, 67 - k * 1.1 + (k % 2 ? 5 : 0), { w: "square", d: 0.075, v: 0.06, slide: -2 }); noise(t, 0.7, { hp: 2800, vol: 0.01 }); }),
    /* el crupier toca la mesa: cada reto llega con un clic de palanca, un golpe grave y una caida electrica */
    chal: old("chal", t => { [0, 0.07, 0.14].forEach(d => noise(t + d, 0.03, { hp: 3200, vol: 0.09 })); thump(t + 0.18, { vol: 0.4, f0: 110, f1: 36, dur: 0.3 }); noise(t + 0.2, 0.5, { lp: 5000, sweepTo: 200, vol: 0.06, type: "bandpass", q: 1.2 }); bell(45, t + 0.22, { vol: 0.07, dur: 0.9, rev: 0.4 }); }),
    dark: old("dark", t => { noise(t, 0.6, { lp: 3000, sweepTo: 120, vol: 0.07, type: "bandpass", q: 0.9 }); thump(t + 0.5, { vol: 0.3, f0: 80, f1: 30, dur: 0.3 }); }),
    buzz: old("buzz", (t, i = 0) => { const os = ctx.createOscillator(), g = ctx.createGain(); os.type = "sawtooth"; os.frequency.value = 96 + i * 9; os.connect(g).connect(lb); env(g, t, 0.004, 0.05, 0.07); os.start(t); os.stop(t + 0.12); noise(t, 0.05, { hp: 4000, vol: 0.07 }); }),
    restore: old("restore", t => { noise(t, 0.35, { hp: 500, sweepTo: 8000, vol: 0.05, type: "highpass" }); pluck(84, t + 0.2, { vol: 0.08, dur: 0.3, rev: 0.3 }); thump(t + 0.02, { vol: 0.2, f0: 120, f1: 60, dur: 0.12 }); }),
    warn: old("warn", t => { [0, 0.11].forEach(d => pluck(93, t + d, { vol: 0.08, dur: 0.1, bright: 4, rev: 0.1 })); }),
    thunder: old("thunder", t => { noise(t, 0.12, { hp: 3000, vol: 0.12 }); noise(t + 0.1, 1.3, { lp: 700, sweepTo: 70, vol: 0.14 }); thump(t + 0.12, { vol: 0.4, f0: 70, f1: 28, dur: 0.6 }); }),
    /* puntero: cruzar la costa */
    ptrEdge: old("ptrEdge", (t, land) => { if (land) pluck(83, t, { vol: 0.035, dur: 0.1, bright: 3, rev: 0.1 }); else bell(96, t, { vol: 0.02, dur: 0.22, rev: 0.3 }); }),
    /* estudio: dos golpes graves (se encienden "Cousins" y "studios") y un brillo suave cuando pasa la luz */
    studio: old("studio", t => {
      thump(t + 0.62, { vol: 0.62, f0: 110, f1: 34, dur: 0.55 }); noise(t + 0.62, 0.09, { lp: 1500, vol: 0.14 }); bell(45, t + 0.63, { vol: 0.09, dur: 1.3, rev: 0.5 });
      thump(t + 1.26, { vol: 0.5, f0: 140, f1: 38, dur: 0.5 }); noise(t + 1.26, 0.08, { lp: 1900, vol: 0.12 }); bell(52, t + 1.27, { vol: 0.08, dur: 1.2, rev: 0.5 });
      noise(t + 1.85, 1.1, { hp: 3000, vol: 0.03, sweepTo: 9000, type: "highpass" }); bell(93, t + 2.0, { vol: 0.06, dur: 1.4, rev: 0.7 }); bell(100, t + 2.12, { vol: 0.04, dur: 1.2, rev: 0.7 });
    }),
    /* v0.3.50: la Enciclopedia es un aparato. Al encenderlo: el clic del interruptor, el zumbido que sube de la pantalla al calentarse y un pitido
       corto de "listo"; al apagarlo, el clic y el zumbido que cae. Flojito y nunca igual (tono y volumen al azar dentro de un margen) */
    devOn: old("devOn", t => {
      const r = Math.random; noise(t, 0.012, { hp: 3200, vol: 0.05 + 0.02 * r() }); thump(t, { vol: 0.12, f0: 110, f1: 60, dur: 0.1 });
      const os = ctx.createOscillator(), g = ctx.createGain(), f = 1500 + 400 * r(); os.type = "sine"; os.frequency.setValueAtTime(180, t + 0.03); os.frequency.exponentialRampToValueAtTime(f, t + 0.3);
      os.connect(g).connect(lb); env(g, t + 0.03, 0.02, 0.018, 0.3); os.start(t + 0.03); os.stop(t + 0.4);
      noise(t + 0.05, 0.28, { hp: 1600, vol: 0.012, sweepTo: 6500 });
      chirp(88 + Math.round(2 * r()), t + 0.32, 0.012, 0.05); pluck(93, t + 0.33, { vol: 0.02, dur: 0.12, bright: 3, rev: 0.15 });
    }),
    devOff: old("devOff", t => {
      const r = Math.random; noise(t, 0.01, { hp: 3000, vol: 0.045 + 0.02 * r() });
      const os = ctx.createOscillator(), g = ctx.createGain(); os.type = "sine"; os.frequency.setValueAtTime(1300 + 300 * r(), t); os.frequency.exponentialRampToValueAtTime(90, t + 0.24);
      os.connect(g).connect(lb); env(g, t, 0.01, 0.02, 0.24); os.start(t); os.stop(t + 0.32);
      thump(t + 0.2, { vol: 0.1, f0: 90, f1: 45, dur: 0.12 });
    }),
    chip: old("chip", (t, k = 0) => { bell(84 + Math.round(k * 7), t, { vol: 0.05, dur: 0.25, rev: 0.2 }); noise(t, 0.01, { hp: 5000, vol: 0.04 }); }),
    /* pulsar el boton de salida (empezar una partida) */
    depart: old("depart", t => { thump(t, { vol: 0.3, f0: 180, f1: 50, dur: 0.14 }); noise(t, 0.35, { lp: 300, sweepTo: 5000, vol: 0.08, type: "bandpass", q: 1.2 }); MOTIF.forEach((m, i) => pluck(m, t + 0.05 + i * 0.09, { vol: 0.15, dur: 0.9, rev: 0.6 })); }),
    reroll: old("reroll", t => { for (let i = 0; i < 5; i++) noise(t + i * 0.04, 0.03, { hp: 2500 + i * 500, vol: 0.05 }); pluck(79, t + 0.2, { vol: 0.08, dur: 0.2, bright: 3 }); }),
    sonar: old("sonar", (t, near = 0.5) => { const m = 88 - Math.round(near * 14); bell(m, t, { vol: 0.13, dur: 1.4, rev: 0.7 }); bell(m + 12, t + 0.02, { vol: 0.04, dur: 0.9, rev: 0.6 }); noise(t, 0.5, { lp: 900, sweepTo: 3000, vol: 0.03, type: "bandpass", q: 3 }); }),
    /* legendaria del cofre (js/adventure.js, legendary): la carta sube al centro (soplo de banda que se abre) y aterriza en su hueco de la
       mochila (golpe de fieltro + campana); tono y filtro al azar dentro de su rango, y el aterrizaje nunca repite la nota de la vez anterior */
    lift: old("lift", t => noise(t, 0.4, { lp: 440 + Math.random() * 120, sweepTo: 4400 + Math.random() * 1200, vol: 0.05, type: "bandpass", q: 1.3 })),
    land: old("land", t => {
      const N = [84, 86, 88, 91]; let m = N[Math.floor(Math.random() * 4)]; if (m === landLast) m = N[(N.indexOf(m) + 1 + Math.floor(Math.random() * 3)) % 4]; landLast = m;
      thump(t, { vol: 0.2, f0: 140 + Math.random() * 20, f1: 58, dur: 0.1 }); bell(m, t + 0.02, { vol: 0.06, dur: 0.6 }); pluck(m - 12, t, { vol: 0.07, dur: 0.3, rev: 0.3 });
    }),
    /* v0.33 retos premium: lluvia continua, corte de corriente, cristal roto, huellas, ventanas de error, bateria y contra de perk */
    rain: (() => {
      let src = null, gain = null;
      return (dens = 0) => {
        if (!ctx) return;
        if (!src && dens > 0 && A.audio.sfxOn) {
          const n = ctx.sampleRate * 3, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
          let b = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.55 + b * 2.2 + (Math.random() < 0.0009 ? (Math.random() - 0.5) * 3 : 0); }   // siseo + cuerpo grave + gotas sueltas
          src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
          const hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 380; lp.type = "lowpass"; lp.frequency.value = 5200;
          gain = ctx.createGain(); gain.gain.value = 0; src.connect(hp).connect(lp).connect(gain).connect(strip("rain").g); src.start();
        }
        if (gain) gain.gain.setTargetAtTime(A.audio.sfxOn ? dens * 0.055 : 0, ctx.currentTime, dens ? 0.5 : 0.25);
      };
    })(),
    powerdown: old("powerdown", t => { noise(t, 0.5, { lp: 4000, sweepTo: 90, vol: 0.08, type: "bandpass", q: 0.8 }); thump(t + 0.04, { vol: 0.32, f0: 90, f1: 26, dur: 0.45 }); const os = ctx.createOscillator(), g = ctx.createGain(); os.type = "sawtooth"; os.frequency.setValueAtTime(120, t); os.frequency.exponentialRampToValueAtTime(30, t + 0.45); os.connect(g).connect(lb); env(g, t, 0.005, 0.05, 0.45); os.start(t); os.stop(t + 0.55); }),
    glass: old("glass", t => { thump(t, { vol: 0.5, f0: 140, f1: 38, dur: 0.22 }); noise(t, 0.09, { hp: 1800, vol: 0.22 }); noise(t + 0.01, 0.35, { hp: 4500, vol: 0.07, sweepTo: 9000, type: "highpass" }); for (let i = 0; i < 9; i++) bell(96 + Math.round(Math.random() * 14), t + 0.02 + Math.random() * 0.32, { vol: 0.02 + Math.random() * 0.02, dur: 0.2 + Math.random() * 0.25, rev: 0.35 }); }),
    smear: old("smear", t => { for (const [d, f0, f1] of [[0, 1100, 1500], [0.16, 1300, 950]]) { const os = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter(); os.type = "triangle"; os.frequency.setValueAtTime(f0, t + d); os.frequency.linearRampToValueAtTime(f1, t + d + 0.12); bp.type = "bandpass"; bp.frequency.value = 1400; bp.Q.value = 2; os.connect(bp).connect(g).connect(lb); env(g, t + d, 0.01, 0.035, 0.12); os.start(t + d); os.stop(t + d + 0.2); } noise(t, 0.3, { lp: 2500, vol: 0.02, type: "bandpass", q: 1.5 }); }),
    ding: old("ding", t => { bell(81, t, { vol: 0.09, dur: 0.6, rev: 0.25 }); bell(76, t + 0.09, { vol: 0.08, dur: 0.8, rev: 0.3 }); }),
    lowbat: old("lowbat", t => { [0, 0.16].forEach((d, i) => { const os = ctx.createOscillator(), g = ctx.createGain(); os.type = "square"; os.frequency.value = i ? 660 : 880; os.connect(g).connect(lb); env(g, t + d, 0.004, 0.035, 0.12); os.start(t + d); os.stop(t + d + 0.16); }); }),
    charge: old("charge", t => { [72, 79, 84].forEach((m, i) => pluck(m, t + i * 0.07, { vol: 0.07, dur: 0.3, bright: 3, rev: 0.3 })); noise(t, 0.3, { hp: 800, sweepTo: 6000, vol: 0.025, type: "highpass" }); }),
    counter: old("counter", (t, k = 0) => { bell(88 + k * 3, t, { vol: 0.06, dur: 0.6, rev: 0.5 }); bell(95 + k * 3, t + 0.05, { vol: 0.04, dur: 0.8, rev: 0.6 }); noise(t, 0.25, { hp: 5000, sweepTo: 11000, vol: 0.025, type: "highpass" }); }),
    /* v0.36 marcador (js/marcador.js): el ticket sale del marcador (avance de papel, flojito) */
    feed: old("feed", t => { for (let i = 0; i < 5; i++) { noise(t + i * 0.05, 0.014, { hp: 2800 + i * 250, vol: 0.026 }); thump(t + i * 0.05, { vol: 0.035, f0: 520, f1: 260, dur: 0.025 }); } noise(t + 0.02, 0.26, { lp: 1800, sweepTo: 3600, vol: 0.02, type: "bandpass", q: 0.9 }); }),
    /* tanda 7: retos premium. Barrer el humo (un soplo), limpiar la lluvia (goma sobre cristal) y la chincheta que cae del cielo */
    sweep: old("sweep", (t, k = 0.5) => { noise(t, 0.32 + Math.random() * 0.14, { lp: 500 + k * 900, sweepTo: 1800 + Math.random() * 900, vol: 0.02 + k * 0.03, type: "bandpass", q: 0.8 }); }),
    wipe: old("wipe", t => { noise(t, 0.26, { lp: 700, sweepTo: 3200 + Math.random() * 600, vol: 0.05, type: "bandpass", q: 1.4 }); const os = ctx.createOscillator(), g = ctx.createGain(); os.type = "triangle"; os.frequency.setValueAtTime(820 + Math.random() * 120, t + 0.05); os.frequency.exponentialRampToValueAtTime(1250 + Math.random() * 150, t + 0.2); os.connect(g).connect(lb); env(g, t + 0.05, 0.01, 0.018, 0.16); os.start(t + 0.05); os.stop(t + 0.3); }),
    /* v0.72: la chincheta suena al CLAVARSE (no mientras cae) como un tic de kalimba muy corto, en pentatonica y nunca igual; con decenas
       cayendo no se apilan: separacion minima entre tics y volumen que baja con el numero de chinchetas (k = su orden, n = cuantas caen) */
    pinFall: (() => { let last = -1; const P = [72, 74, 76, 79, 81, 84, 86, 88]; return old("pinFall", (t, k = 0, n = 10) => {
      if (t - last < 0.09) return; last = t;
      const m = P[Math.floor(Math.random() * P.length)], v = 0.05 * Math.min(1, Math.sqrt(8 / Math.max(8, n)) * (0.8 + Math.random() * 0.4));
      pluck(m, t, { vol: v, dur: 0.16, bright: 2.5, rev: 0.35 }); noise(t, 0.02, { hp: 3200, vol: v * 0.22 });
    }); })(),
    /* tanda 8 y 9: Sangre fria, el retumbar del terremoto, el latido del Pulso y una racha del Vendaval */
    ice: old("ice", t => { [96, 103, 108].forEach((m, i) => bell(m + (Math.random() < 0.5 ? 0 : 2), t + i * 0.05, { vol: 0.03, dur: 0.5, rev: 0.6 })); noise(t, 0.2, { hp: 6000, sweepTo: 12000, vol: 0.02, type: "highpass" }); }),
    rumble: old("rumble", (t, lv = 1) => { noise(t, 0.85, { lp: 150 + lv * 30, sweepTo: 55, vol: 0.08 + lv * 0.02 }); thump(t, { vol: 0.2, f0: 72, f1: 32, dur: 0.5 }); thump(t + 0.17 + Math.random() * 0.06, { vol: 0.11, f0: 60, f1: 30, dur: 0.4 }); }),
    heart: old("heart", t => { thump(t, { vol: 0.06, f0: 64 + Math.random() * 6, f1: 40, dur: 0.12 }); thump(t + 0.19, { vol: 0.045, f0: 58, f1: 38, dur: 0.12 }); }),
    gust: old("gust", t => { noise(t, 0.9 + Math.random() * 0.4, { lp: 260 + Math.random() * 120, sweepTo: 900 + Math.random() * 300, vol: 0.03, type: "bandpass", q: 0.6 }); }),
    spark: old("spark", t => { for (let i = 0; i < 5; i++) noise(t + i * 0.022 + Math.random() * 0.02, 0.012, { hp: 3800 + Math.random() * 2000, vol: 0.035 + Math.random() * 0.02 }); }),
    tear: old("tear", t => { noise(t, 0.13, { lp: 1100, sweepTo: 5600, vol: 0.075, type: "bandpass", q: 1.3 }); for (let i = 0; i < 6; i++) noise(t + 0.008 + i * 0.016 + Math.random() * 0.006, 0.009, { hp: 3800, vol: 0.045 }); thump(t, { vol: 0.06, f0: 240, f1: 120, dur: 0.05 }); }),
    /* tanda 14: panel de salidas, bandera de espaldas, puzle y pasaporte falso (flojitos y nunca iguales) */
    flapRoll: old("flapRoll", (t, n = 1) => { const k = Math.min(4, 1 + (n > 6 ? 2 : n > 2 ? 1 : 0)); for (let i = 0; i < k; i++) noise(t + i * (0.008 + Math.random() * 0.016), 0.006, { hp: 2400 + Math.random() * 2600, vol: 0.011 + Math.random() * 0.008 }); }),
    flapSet: old("flapSet", (t, n = 1) => { const f = 300 + Math.random() * 90; thump(t, { vol: 0.045, f0: f, f1: f * 0.38, dur: 0.045 }); noise(t, 0.012, { hp: 3200 + Math.random() * 1500, vol: 0.03 }); if (n > 1) noise(t + 0.02, 0.01, { hp: 3800, vol: 0.02 }); }),
    boardDone: old("boardDone", t => { const b = 84 + Math.floor(Math.random() * 3) * 2; bell(b, t, { vol: 0.05, dur: 0.7, rev: 0.5 }); bell(b - 4, t + 0.2, { vol: 0.045, dur: 0.9, rev: 0.55 }); }),
    flagFlip: old("flagFlip", t => { noise(t, 0.18 + Math.random() * 0.06, { lp: 700 + Math.random() * 300, sweepTo: 3600, vol: 0.05, type: "bandpass", q: 1 }); thump(t + 0.17, { vol: 0.07, f0: 220 + Math.random() * 40, f1: 90, dur: 0.07 }); }),
    sealPop: old("sealPop", t => { thump(t, { vol: 0.12, f0: 150, f1: 60, dur: 0.09 }); noise(t, 0.02, { hp: 3000, vol: 0.04 }); pluck(88 + Math.floor(Math.random() * 3), t + 0.02, { vol: 0.04, dur: 0.14, bright: 3, rev: 0.2 }); }),
    puzzleDeal: old("puzzleDeal", t => { for (let i = 0; i < 6; i++) { noise(t + i * 0.045 + Math.random() * 0.02, 0.012, { hp: 1800 + Math.random() * 1200, vol: 0.03 }); thump(t + i * 0.045, { vol: 0.03, f0: 360, f1: 200, dur: 0.03 }); } }),
    puzzleSnap: old("puzzleSnap", (t, left = 1) => { const m = 84 + Math.floor(Math.random() * 4) * 2; thump(t, { vol: 0.09, f0: 330, f1: 120, dur: 0.06 }); noise(t, 0.015, { hp: 2800, vol: 0.04 }); bell(m, t + 0.02, { vol: 0.045, dur: 0.35, rev: 0.4 }); if (left <= 2) bell(m + 7, t + 0.09, { vol: 0.04, dur: 0.5, rev: 0.45 }); }),
    passStamp: old("passStamp", t => { thump(t, { vol: 0.12, f0: 150, f1: 48, dur: 0.12 }); noise(t, 0.05, { lp: 1500 + Math.random() * 500, vol: 0.05 }); }),
    passFalse: old("passFalse", t => { thump(t, { vol: 0.34, f0: 130, f1: 34, dur: 0.22 }); noise(t, 0.1, { lp: 1800, vol: 0.12 }); bell(52 + Math.floor(Math.random() * 3), t + 0.03, { vol: 0.05, dur: 0.6, rev: 0.4 }); }),
    /* tanda 15: Ctrl+Z, Noche de tormenta y Pregunta trampa (flojitos y nunca iguales) */
    zUndo: old("zUndo", t => { const f = 180 + Math.random() * 50; thump(t, { vol: 0.07, f0: f, f1: f * 0.5, dur: 0.05 }); noise(t, 0.012, { hp: 3400, vol: 0.035 }); noise(t + 0.04, 0.26, { lp: 3000 + Math.random() * 600, sweepTo: 420, vol: 0.04, type: "bandpass", q: 1.1 }); thump(t + 0.3, { vol: 0.05, f0: f * 1.2, f1: f * 0.6, dur: 0.045 }); noise(t + 0.3, 0.01, { hp: 4200, vol: 0.03 }); }),
    nightBang: old("nightBang", (t, kind = "strike", soft = false) => {
      const d = 0.08 + Math.random() * 0.4;
      if (kind === "sheet") { noise(t + d, 0.9 + Math.random() * 0.5, { lp: 300 + Math.random() * 120, sweepTo: 55, vol: 0.04 }); thump(t + d + 0.05, { vol: 0.07, f0: 56 + Math.random() * 10, f1: 30, dur: 0.5 }); return; }
      if (!soft) noise(t, 0.05, { hp: 3500, vol: 0.05 });
      noise(t + d, 0.8 + Math.random() * 0.5, { lp: 600 + Math.random() * 250, sweepTo: 70, vol: 0.07 }); thump(t + d + 0.02, { vol: 0.16, f0: 62 + Math.random() * 14, f1: 28, dur: 0.5 });
    }),
    trapStamp: old("trapStamp", t => { thump(t, { vol: 0.2, f0: 150, f1: 46, dur: 0.14 }); noise(t, 0.04, { lp: 1600, vol: 0.08 }); const b = 46 + Math.floor(Math.random() * 3); bell(b, t + 0.03, { vol: 0.06, dur: 0.7, rev: 0.4 }); bell(b + 6, t + 0.09, { vol: 0.045, dur: 0.6, rev: 0.4 }); }),
    /* tanda 16: jefes con identidad (flojitos y nunca iguales): subir de tono, la siesta, el salvapantallas, el pantallazo azul, el album, la rueda y la banca */
    bossRise: old("bossRise", (t, q = 1) => { const k = Math.min(4, q); thump(t, { vol: 0.1 + 0.035 * k, f0: 88 + k * 7, f1: 34, dur: 0.3 }); noise(t, 0.3 + 0.07 * k, { lp: 280 + k * 240, sweepTo: 1500 + k * 800, vol: 0.026 + 0.008 * k, type: "bandpass", q: 1 }); [0, 7, 12, 19].slice(0, 1 + Math.ceil(k / 2)).forEach((st, i) => bell(58 + k * 2 + st, t + 0.05 + i * 0.06, { vol: 0.03 + 0.005 * k, dur: 0.5, rev: 0.4 })); }),
    napOn: old("napOn", t => { [0, 0.55].forEach((d, i) => { noise(t + d, 0.45, { lp: 380 - i * 60, sweepTo: 160, vol: 0.03, type: "bandpass", q: 0.7 }); pluck(50 - i * 2, t + d + 0.05, { vol: 0.035, dur: 0.5, rev: 0.4 }); }); }),
    napStir: old("napStir", (t, l = 1) => { noise(t, 0.2, { lp: 500 + l * 300, sweepTo: 200, vol: 0.03 + l * 0.01, type: "bandpass", q: 0.9 }); thump(t, { vol: 0.05 + l * 0.02, f0: 70, f1: 40, dur: 0.12 }); }),
    napWake: old("napWake", t => { thump(t, { vol: 0.32, f0: 130, f1: 34, dur: 0.22 }); noise(t, 0.07, { hp: 2400, vol: 0.08 }); bell(52, t + 0.02, { vol: 0.07, dur: 0.7, rev: 0.4 }); bell(58, t + 0.05, { vol: 0.05, dur: 0.8, rev: 0.4 }); }),
    ssOn: old("ssOn", t => { noise(t, 0.5, { lp: 3000, sweepTo: 300, vol: 0.04, type: "bandpass", q: 0.8 }); pluck(70, t + 0.1, { vol: 0.03, dur: 0.4, rev: 0.4 }); pluck(63, t + 0.3, { vol: 0.03, dur: 0.5, rev: 0.4 }); }),
    ssBounce: old("ssBounce", t => { pluck(88 + Math.floor(Math.random() * 4) * 2, t, { vol: 0.02, dur: 0.1, bright: 3, rev: 0.1 }); }),
    ssWake: old("ssWake", t => { noise(t, 0.2, { lp: 400, sweepTo: 4000, vol: 0.035, type: "bandpass", q: 1 }); pluck(84, t + 0.05, { vol: 0.04, dur: 0.2, rev: 0.2 }); }),
    bsodOn: old("bsodOn", t => { noise(t, 0.04, { hp: 3000, vol: 0.06 }); thump(t, { vol: 0.2, f0: 120, f1: 50, dur: 0.15 }); const os = ctx.createOscillator(), g = ctx.createGain(); os.type = "square"; os.frequency.setValueAtTime(440, t + 0.05); os.connect(g).connect(lb); env(g, t + 0.05, 0.005, 0.02, 0.16); os.start(t + 0.05); os.stop(t + 0.3); }),
    albumStamp: old("albumStamp", (t, q = 0) => { thump(t, { vol: 0.2, f0: 150, f1: 46, dur: 0.14 }); noise(t, 0.04, { lp: 1600, vol: 0.08 }); bell(58 + q * 2, t + 0.03, { vol: 0.05, dur: 0.6, rev: 0.4 }); pluck(84 + q * 2, t + 0.12, { vol: 0.04, dur: 0.3, rev: 0.3 }); }),
    wheelTick: old("wheelTick", (t, a = 0.5) => { pluck(90 + Math.round(a * 6), t, { vol: 0.025, dur: 0.05, bright: 3, rev: 0.05 }); noise(t, 0.008, { hp: 4000, vol: 0.02 }); }),
    wheelLand: old("wheelLand", t => { thump(t, { vol: 0.14, f0: 160, f1: 60, dur: 0.1 }); bell(84, t, { vol: 0.06, dur: 0.7, rev: 0.4 }); bell(91, t + 0.07, { vol: 0.05, dur: 0.9, rev: 0.5 }); }),
    bankPin: old("bankPin", t => { thump(t, { vol: 0.12, f0: 340, f1: 130, dur: 0.05 }); bell(88, t + 0.02, { vol: 0.06, dur: 0.5, rev: 0.4 }); bell(95, t + 0.1, { vol: 0.05, dur: 0.7, rev: 0.4 }); }),
    /* el corazon y el fondo grave de la sala mientras llega el jefe (el zumbido se apaga solo a los 10 s o al cerrarlo) */
    latido: old("latido", t => { thump(t, { vol: 0.3, f0: 72, f1: 38, dur: 0.16 }); thump(t + 0.24, { vol: 0.2, f0: 64, f1: 36, dur: 0.14 }); }),
    zumbido: (() => {
      let g = null, os = [];
      return on => {
        if (!on) { if (g && ctx) { const t = ctx.currentTime, oo = os; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.2); oo.forEach(o => { try { o.stop(t + 1.2); } catch (e) { /* ya parado */ } }); } g = null; os = []; return; }
        if (g || !A.audio.sfxOn || document.hidden || !init()) return;
        const t = ctx.currentTime + 0.01, lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 170;
        g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 1.2); g.gain.setTargetAtTime(0.0001, t + 9, 1.4);
        os = [41.2, 41.7, 61.8].map(f => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 16); return o; });
        g.connect(lp).connect(strip("zumbido").g);
      };
    })(),
    /* v0.37 tu nombre (js/nombre.js): la sala se apaga (rele, golpe del interruptor general y la luz que cae) y se enciende el foco (clonc
       metalico y el zumbido del filamento); cada tecla es una ficha que sube por la pentatonica; al firmar, el sello y la firma sol-do-re */
    spot: old("spot", t => {
      [0, 0.045].forEach(d => noise(t + d, 0.018, { hp: 3400, vol: 0.06 })); thump(t + 0.05, { vol: 0.34, f0: 92, f1: 30, dur: 0.42 });
      noise(t + 0.05, 0.75, { lp: 2600, sweepTo: 150, vol: 0.05, type: "bandpass", q: 0.9 });
      thump(t + 0.56, { vol: 0.26, f0: 190, f1: 64, dur: 0.1 }); noise(t + 0.56, 0.035, { hp: 2600, vol: 0.09 }); bell(69, t + 0.58, { vol: 0.045, dur: 1, rev: 0.6 });
      noise(t + 0.6, 1.3, { hp: 4800, vol: 0.016, sweepTo: 8800, type: "highpass" }); A.music.duck(0.6, 2600);
    }),
    key: old("key", (t, k = 0) => {
      if (k < 0) { pluck(55, t, { vol: 0.06, dur: 0.12, bright: 2, rev: 0.05 }); noise(t, 0.02, { lp: 1400, vol: 0.04 }); return; }   // borrar: mas grave y apagado
      pluck(scaleNote(3 + Math.min(k, 19), 60), t, { vol: 0.055, dur: 0.12, bright: 4, rev: 0.1 }); noise(t, 0.012, { hp: 4200, vol: 0.035 }); thump(t, { vol: 0.05, f0: 420, f1: 190, dur: 0.03 });
    }),
    /* la jubilacion del crupier (js/final.js, js/dealer.js) y la salida (js/salir.js): tres golpes en la puerta, el chasquido que apaga el foco,
       el cartel que se da la vuelta (antes se llamaba flip, como el interruptor, y le quitaba el sonido: ahora cada uno el suyo) y la firma */
    knock: old("knock", t => { thump(t, { vol: 0.42, f0: 210, f1: 80, dur: 0.11 }); noise(t, 0.035, { lp: 1300, vol: 0.16 }); }),
    snap: old("snap", t => { noise(t, 0.022, { hp: 2600, vol: 0.16 }); thump(t + 0.06, { vol: 0.18, f0: 160, f1: 50, dur: 0.18 }); }),
    cartel: old("cartel", t => { noise(t, 0.09, { lp: 2400, vol: 0.09, type: "bandpass", q: 0.7 }); thump(t + 0.08, { vol: 0.3, f0: 150, f1: 60, dur: 0.16 }); [72, 76, 79, 84].forEach((m, i) => bell(m, t + 0.16 + i * 0.06, { vol: 0.05, dur: 0.9, rev: 0.5 })); }),
    sign: old("sign", t => {
      thump(t, { vol: 0.44, f0: 128, f1: 32, dur: 0.32 }); noise(t, 0.11, { lp: 1700, vol: 0.13 });
      MOTIF.forEach((m, i) => { pluck(m + 12, t + 0.14 + i * 0.1, { vol: 0.14, dur: 1.1, rev: 0.6 }); bell(m + 24, t + 0.14 + i * 0.1, { vol: 0.03, dur: 0.4, rev: 0.4 }); });
      [84, 88, 91, 96, 100].forEach((m, i) => bell(m, t + 0.46 + i * 0.055, { vol: 0.045, dur: 1.2, rev: 0.65 }));
      noise(t + 0.4, 0.7, { hp: 5000, vol: 0.025, sweepTo: 12000, type: "highpass" }); A.music.duck(0.65, 2000);
    }),
  };
  /* ------------------------------------------------------------------ los sonidos de antes: «Clásicos» (Ajustes > Sonido) */
  /* Los 38 sonidos que el Bloque F rehizo, tal como eran hasta la v0.3.192 (el mismo codigo: campanas, kalimba, pitidos de 8 bits, todo en Do y al
     centro), para quien los prefiera. Cada uno entra por su tira, sin filtro, y suena en el MISMO escalon que su version nueva (CLA, dB, medido con
     la misma vara): la musica sigue al frente. Los efectos de la regla (retos, globo, rasca y el resto del casino) son los mismos con las dos */
  const CLA = {
    ach: -17.7, barrido: -19.7, blip: -25.1, boss: -22.5, buy: -19.2, card: -15.4, clear: -17.3, coin: -25.5, count: -21.3, countEnd: -22.8, deny: -26.8, felt: -25.5,
    flag: -16.8, goal: -19.1, golpe: -18.8, hover: -16.3, impacto: -26.6, intro: -25.5, jackpot1: -16.6, jackpot2: -15.9, jackpot3: -18.2, lampara: -21.5, lootStep: -20.2,
    lose: -30.9, menuHover: -15.9, pause: -25.7, pin: -27.3, reveal0: -25.3, reveal1: -21.8, reveal2: -19.1, reveal3: -17.9, reveal4: -18.9, reveal5: -25.7,
    rouBet: -24.9, rouStop: -30.7, rouTick: -25.9, sell: -18.6, stamp: -32.7, streak: -17.5, streakBreak: -20.6, tick: -17.6, toggle: -27.1, ui: -17.7, voice: -19.1,
    win: -16.1,
    otro: -20,
  };
  /* monedas que caen: tintineos metalicos agudos al azar (pentatonica, asi nunca desafinan); muy seguidas al principio y luego se posan */
  function coins(t, n, span, vol = 0.03) {
    for (let i = 0; i < n; i++) {
      const d = t + span * Math.pow(i / n, 1.4) + Math.random() * 0.025;
      bell(scaleNote(10 + Math.floor(Math.random() * 8), 60), d, { vol: vol * (0.5 + Math.random() * 0.7), dur: 0.08 + Math.random() * 0.2, rev: 0.2 });
      if (i % 2 === 0) noise(d, 0.012, { hp: 6500, vol: vol * 0.8 });
    }
  }
  /* el timbre de la maquina: dos notas alternando muy deprisa que se van apagando ("rrring") */
  function ring(a, b, t, n, vol = 0.05) {
    for (let i = 0; i < n; i++) bell(i % 2 ? b : a, t + i * 0.042, { vol: vol * (1 - 0.75 * i / n), dur: 0.13, rev: 0.4 });
  }
  /* corneta de 8 bits (v0.2.15, bandera del acierto): onda cuadrada filtrada con un pellizco de tono al atacar, como un metal, y vibrato opcional */
  function horn(m, t, o = {}) {
    const { vol = 0.03, dur = 0.14, vib = 0, bus = lb } = o;
    const f = mtof(m), os = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    os.type = "square"; os.frequency.setValueAtTime(f * 0.94, t); os.frequency.exponentialRampToValueAtTime(f, t + 0.028);
    lp.type = "lowpass"; lp.Q.value = 1.1; lp.frequency.setValueAtTime(f * 2, t); lp.frequency.exponentialRampToValueAtTime(Math.min(9000, f * 4.5), t + 0.05);
    if (vib) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = vib; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.011, t + dur * 0.55); lfo.connect(lg).connect(os.frequency); lfo.start(t); lfo.stop(t + dur + 0.1); }
    os.connect(lp).connect(g).connect(bus); send(g, 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.014); g.gain.setValueAtTime(vol * 0.85, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.start(t); os.stop(t + dur + 0.05);
  }
  /* voz arcade del crupier: silabas cortas de onda cuadrada/diente de sierra, el tono cambia con el humor */
  const VMOOD = {
    sly: { b: 52, w: "square", pat: [0, 3, 5, 3, 7, 5], d: 0.06, v: 0.05, slide: 1 }, laugh: { b: 60, w: "square", pat: [7, 3], d: 0.08, v: 0.06, slide: -2 },
    angry: { b: 40, w: "sawtooth", pat: [0, -2, 1, -3], d: 0.055, v: 0.055, slide: -1 }, shock: { b: 58, w: "square", pat: [0, 4, 8, 12], d: 0.05, v: 0.055, slide: 2 },
    boss: { b: 34, w: "sawtooth", pat: [0, 0, -3, 2], d: 0.09, v: 0.075, slide: -1 },
  };
  /* Bloque J: los sonidos de raton (pasar, pulsar placa, pulsar boton) nunca suenan igual dos veces seguidas: 6 tonos por familia, ±3 % */
  const bag = () => { let last = -1; return () => { let i; do { i = Math.floor(Math.random() * 6); } while (i === last); last = i; return (i - 2.5) * 0.2; }; };
  const uiVar = bag(), cardVar = bag();
  function stripC(key) {
    const v = Math.pow(10, (CLA[key] != null ? CLA[key] : CLA.otro) / 20), g = ctx.createGain(), rs = ctx.createGain();
    g.gain.value = v; rs.gain.value = v * 1.69; g.connect(sfxBus); rs.connect(revFx);
    return { g, rs };
  }
  const cla = (key, fn) => go((t, ...a) => { const s = stripC(typeof key === "function" ? key(...a) : key), b0 = lb, r0 = lr; lb = s.g; lr = s.rs; try { return fn(t, ...a); } finally { lb = b0; lr = r0; } });
  const PADK = MUS_BASE * 0.7;   // el acorde de fondo de antes iba por el bus de la musica (x0,55 x0,7 de fabrica): por su tira, a la misma fuerza
  const CL = {
    hover: cla("hover", t => {
      if (t - hovT < 0.06) return;
      const r = Math.random, since = t - hovT; hovT = t;
      if (since > 0.75) { hovStep = 0; hovDir = 1; } else { hovStep += hovDir; if (hovStep >= 6) hovDir = -1; else if (hovStep <= 0) hovDir = 1; }
      const m = scaleNote(8 + hovStep, 60) + (r() - 0.5) * 0.08, v = 0.0105 * (0.85 + 0.3 * r());
      noise(t, 0.006 + 0.003 * r(), { type: "bandpass", lp: 3400 + 1800 * r(), q: 1.3, vol: 0.0042 });
      pluck(m, t + 0.003, { vol: v, dur: 0.09 + 0.05 * r(), bright: 2.6 + 1.2 * r(), rev: 0.12, wave: r() < 0.7 ? "sine" : "triangle" });
      bell(m + 12, t + 0.007, { vol: v * 0.24, dur: 0.14 + 0.08 * r(), rev: 0.3 });
      if (hovStep >= 3 && r() < 0.5) chirp(m + 12, t + 0.005, v * 0.1, 0.02);                 // un pellizco de 8 bits cuando la escalera se calienta
    }),
    menuHover: cla("menuHover", (t, k = 0) => {
      if (t - hovT < 0.05) return; hovT = t;                                          // barrido muy rapido por encima: no se amontonan
      const r = Math.random, deg = HOV_DEG[k] != null ? HOV_DEG[k] : 7;
      let m = hovLast; for (let i = 0; i < 6 && m === hovLast; i++) m = scaleNote(deg + Math.floor(r() * 3) - 1, 60);
      hovLast = m; m += (r() - 0.5) * 0.1;                                             // +-5 cents: suena vivo, no de fabrica
      const v = 0.01 * (0.8 + 0.4 * r());                                              // flojito: muy por debajo del clic que viene despues
      noise(t, 0.006 + 0.004 * r(), { type: "bandpass", lp: 3200 + 2400 * r(), q: 1.4, vol: 0.0045 * (0.7 + 0.6 * r()) });
      if (r() < 0.5) noise(t + 0.01 + 0.008 * r(), 0.005, { type: "bandpass", lp: 4200 + 2000 * r(), q: 1.4, vol: 0.0022 });   // a veces, la ficha de debajo
      pluck(m, t + 0.004, { vol: v, dur: 0.08 + 0.06 * r(), bright: 2.5 + 1.5 * r(), rev: 0.1 + 0.08 * r(), wave: r() < 0.7 ? "sine" : "triangle" });
      bell(m + (r() < 0.6 ? 12 : 19), t + 0.008 + 0.012 * r(), { vol: v * (0.22 + 0.12 * r()), dur: 0.12 + 0.1 * r(), rev: 0.3 });
      if (r() < 0.6) chirp(m + 12, t + 0.006, v * 0.12, 0.02);
    }),
    ui: cla("ui", t => pluck(84 + uiVar(), t, { vol: 0.05, dur: 0.12, bright: 3, rev: 0.1 })),
    card: cla("card", t => { const v = 1 + cardVar() * 0.06; noise(t, 0.05, { lp: 2600 * v, vol: 0.08, type: "bandpass", q: 0.8 }); noise(t + 0.04, 0.03, { hp: 3000 * v, vol: 0.04 }); }),
    felt: cla("felt", t => { thump(t, { vol: 0.13, f0: 150, f1: 58, dur: 0.08 }); noise(t, 0.04, { lp: 1700, vol: 0.035 }); pluck(64, t + 0.012, { vol: 0.03, dur: 0.14, bright: 2, rev: 0.15 }); }),
    toggle: cla("toggle", (t, on) => { thump(t, { vol: 0.16, f0: on ? 260 : 190, f1: 80, dur: 0.06 }); pluck(on ? 84 : 72, t + 0.015, { vol: 0.06, dur: 0.1, bright: 3, rev: 0.05 }); }),
    blip: cla("blip", (t, v) => pluck(scaleNote(Math.round(v * 9), 67), t, { vol: 0.09, dur: 0.16, bright: 3, rev: 0.15 })),
    deny: cla("deny", t => { thump(t, { vol: 0.2, f0: 120, f1: 60, dur: 0.1 }); pluck(46, t, { vol: 0.09, dur: 0.18, bright: 1 }); pluck(43, t + 0.09, { vol: 0.09, dur: 0.22, bright: 1 }); }),
    pause: cla("pause", t => pluck(60, t, { vol: 0.08, dur: 0.3, bright: 3 })),
    pin: cla("pin", (t, k = 0) => { thump(t, { vol: 0.32, f0: 320, f1: 70, dur: 0.1 }); noise(t, 0.05, { lp: 2200, vol: 0.06 }); pluck(76, t + 0.02, { vol: 0.05, dur: 0.15, rev: 0.15 });   // la chincheta que cae (antes A.sfx.tap)
      const n = 60 + Math.min(k, 6) * 2; thump(t, { vol: 0.34, f0: 170, f1: 55, dur: 0.11 }); noise(t, 0.05, { hp: 2200, vol: 0.09 }); pluck(n + 12, t + 0.03, { vol: 0.11, dur: 0.28, bright: 4, rev: 0.25 }); bell(n + 24, t + 0.05, { vol: 0.04, dur: 0.4, rev: 0.4 }); }),
    reveal: cla(tier => "reveal" + tier, (t, tier) => {
      if (tier === 4) {
        [72, 76, 79, 84].forEach((m, i) => bell(m + 12, t + i * 0.055, { vol: 0.085, dur: 1.4 })); thump(t, { vol: 0.28, f0: 90, f1: 38, dur: 0.4 });
        A.music.duck(0.35, 1600);
      } else if (tier === 3) { [72, 76, 79].forEach((m, i) => bell(m, t + i * 0.07, { vol: 0.09, dur: 1.1 })); A.music.duck(0.4, 1300); }
      else if (tier === 2) { [76, 79].forEach((m, i) => bell(m, t + i * 0.08, { vol: 0.08, dur: 0.9 })); }
      else if (tier === 1) { pluck(67, t, { vol: 0.12, dur: 0.5, bright: 3 }); pluck(64, t + 0.11, { vol: 0.1, dur: 0.6, bright: 3 }); }
      else if (tier === 0) { pluck(57, t, { vol: 0.16, dur: 0.6, bright: 2 }); pluck(53, t + 0.16, { vol: 0.15, dur: 0.9, bright: 1.8 }); thump(t + 0.02, { vol: 0.12, f0: 100, f1: 50 }); }
      else { thump(t, { vol: 0.26, f0: 150, f1: 55 }); pluck(50, t + 0.12, { vol: 0.14, dur: 0.9, bright: 1.5 }); noise(t, 0.09, { lp: 900, vol: 0.05 }); }
    }),
    impacto: cla("impacto", t => { thump(t, { vol: 0.34, f0: 70, f1: 30, dur: 0.45 }); noise(t, 0.09, { lp: 1400, vol: 0.1 }); }),
    golpe: cla("golpe", (t, k = 0) => {
      const r = Math.random, m = scaleNote(8 + 2 * k, 60) + (r() - 0.5) * 0.08;
      noise(t, 0.016, { type: "bandpass", lp: 3700 + 400 * r(), q: 2, vol: 0.055 }); noise(t + 0.02 + 0.006 * r(), 0.01, { type: "bandpass", lp: 4600, q: 2, vol: 0.028 });
      thump(t, { vol: 0.1, f0: 240, f1: 110, dur: 0.06 });
      pluck(m, t + 0.004, { vol: 0.07 * (0.9 + 0.2 * r()), dur: 0.2, bright: 3, rev: 0.12 }); bell(m + 12, t + 0.01, { vol: 0.035, dur: 0.28, rev: 0.25 });
    }),
    count: cla("count", (t, k) => pluck(scaleNote(Math.floor(k * 9), 72), t, { vol: 0.045, dur: 0.09, bright: 3, rev: 0.05 })),
    countEnd: cla("countEnd", t => { bell(84, t, { vol: 0.07, dur: 0.8 }); bell(91, t + 0.06, { vol: 0.04, dur: 0.8 }); }),
    tick: cla("tick", (t, n) => pluck(88 - n * 2, t, { vol: 0.08, dur: 0.08, bright: 4, rev: 0.05 })),
    streak: cla("streak", (t, n) => { const b = scaleNote(4 + Math.min(n, 7) * 2, 60); pluck(b, t, { vol: 0.12, dur: 0.4 }); pluck(b + 7, t + 0.07, { vol: 0.1, dur: 0.5 }); noise(t, 0.25, { hp: 2500, vol: 0.03, sweepTo: 9000, type: "highpass" }); }),
    streakBreak: cla("streakBreak", t => {
      const r = Math.random;
      noise(t, 0.05, { type: "bandpass", lp: 3600 + 900 * r(), q: 2.2, vol: 0.07 });
      for (let i = 0; i < 4; i++) noise(t + 0.012 + i * 0.019 + r() * 0.008, 0.012, { hp: 4500 + r() * 2500, vol: 0.028 });
      thump(t, { vol: 0.15, f0: 140, f1: 48, dur: 0.14 });
      pluck(64, t + 0.05, { vol: 0.065, dur: 0.22, bright: 2.5, wave: "square" }); pluck(59, t + 0.17, { vol: 0.06, dur: 0.38, bright: 2 });
    }),
    flag: cla("flag", (t, n = 1) => {
      const r = Math.random, M = [[0, 2, 3], [0, 3, 5], [2, 3, 5], [0, 2, 5], [1, 3, 5]];
      let mi = Math.floor(r() * M.length); if (mi === flagLast) mi = (mi + 1 + Math.floor(r() * (M.length - 1))) % M.length; flagLast = mi;
      const base = [60, 62, 65][Math.floor(r() * 3)] + 12, v = 0.03 * (0.85 + 0.3 * r()), step = 0.1 + 0.025 * r();
      noise(t, 0.08, { type: "bandpass", lp: 1300 + 700 * r(), q: 0.9, vol: 0.022 });
      noise(t + 0.03, 0.05, { type: "bandpass", lp: 2200 + 900 * r(), q: 1.2, vol: 0.012 });
      M[mi].forEach((d, i) => { const last = i === 2; horn(scaleNote(d, base) + (r() - 0.5) * 0.08, t + 0.05 + i * step, { vol: v * (last ? 1.08 : 0.9), dur: last ? 0.44 : 0.11, vib: last ? 5.5 + r() : 0 }); });
      if (n > 1) M[mi].forEach((d, i) => horn(scaleNote(d, base) + 12, t + 0.2 + i * step, { vol: v * 0.32, dur: i === 2 ? 0.3 : 0.08 }));
    }),
    coin: cla("coin", (t, k = 0) => { const n = 88 + Math.round(k * 5); bell(n, t, { vol: 0.07, dur: 0.35, rev: 0.25 }); bell(n + 7, t + 0.055, { vol: 0.06, dur: 0.5, rev: 0.3 }); noise(t, 0.012, { hp: 6000, vol: 0.05 }); }),
    jackpot: cla(l => "jackpot" + Math.max(1, Math.min(3, l | 0)), (t, level = 1) => {
      const n = Math.max(1, Math.min(3, level | 0));
      const S0 = { g: lb, r: lr }, inS = f => () => { const b0 = lb, r0 = lr; lb = S0.g; lr = S0.r; try { f(); } finally { lb = b0; lr = r0; } };   // los golpes que se crean mas tarde, por la misma tira
      const ARP = [[72, 76, 79, 84], [76, 79, 84, 88], [76, 79, 84, 88, 91]], RING = [[84, 79], [88, 84], [91, 88]];
      const P = [1.15, 1.3, 1.5], KICK = [[0.24, 160, 50, 0.14], [0.3, 145, 44, 0.2], [0.45, 110, 30, 0.6]];
      const at = (when, fn) => { const ms = (when - JP_LEAD - ctx.currentTime) * 1000; if (ms <= 4) inS(fn)(); else setTimeout(() => { if (ctx.currentTime < when + 0.05) inS(fn)(); }, ms); };
      const hit = k => {
        const t0 = t + k * JP_GAP, a = ARP[k], p = P[k], [kv, f0, f1, kd] = KICK[k];
        thump(t0, { vol: kv, f0, f1, dur: kd }); noise(t0, 0.04, { hp: 3000, vol: 0.08 * p });            // la palanca
        a.forEach((m, i) => {
          const tt = t0 + 0.012 + i * 0.034, fin = i === a.length - 1;
          bell(m, tt, { vol: 0.075 * p * (fin ? 1.3 : 1), dur: fin ? 0.9 : 0.32, rev: 0.4 }); chirp(m + 12, tt, 0.022 * p);
        });
        pluck(a[a.length - 1] - 24, t0, { vol: 0.1 * p, dur: 0.55, bright: 3, rev: 0.3 });
        ring(RING[k][0], RING[k][1], t0 + 0.19, k === n - 1 ? [9, 11, 17][k] : 5, 0.045 * p);
        coins(t0 + 0.05, 3 + k * 2, 0.28, 0.026 * p);
      };
      for (let k = 0; k < n; k++) at(t + k * JP_GAP, () => hit(k));
      const tl = t + (n - 1) * JP_GAP, rain = [8, 14, 28][n - 1], span = [0.5, 0.8, 1.5][n - 1], cut = tl + 0.22 + span * 0.45;
      at(tl + 0.22, () => coins(tl + 0.22, Math.ceil(rain / 2), span * 0.45, 0.03));                       // la lluvia final, en dos tandas
      at(cut, () => coins(cut, Math.floor(rain / 2), span * 0.55, 0.03));
      if (n === 3) {
        at(tl, () => { noise(tl + 0.02, 1.1, { hp: 2600, vol: 0.045, sweepTo: 12000, type: "highpass" }); pad([48, 55, 60, 64, 67, 72], tl + 0.05, 2.8, 0.065, lb); });
        at(tl + 0.78, () => [96, 100, 103, 108].forEach((m, i) => bell(m, tl + 0.78 + i * 0.07, { vol: 0.035, dur: 0.9, rev: 0.7 })));
      }
      A.music.duck([0.5, 0.38, 0.25][n - 1], [1300, 1900, 3200][n - 1]);
    }),
    barrido: cla("barrido", t => { noise(t, 0.7, { type: "bandpass", lp: 900, sweepTo: 5200, q: 1.1, vol: 0.05 }); [84, 88, 91, 96].forEach((m, i) => bell(m, t + 0.1 + i * 0.09, { vol: 0.05, dur: 0.9, rev: 0.6 })); }),
    goal: cla("goal", t => {
      thump(t, { vol: 0.26, f0: 150, f1: 48, dur: 0.18 }); noise(t, 0.05, { hp: 2600, vol: 0.06 });
      MOTIF.forEach((m, i) => { pluck(m + 12, t + 0.02 + i * 0.075, { vol: 0.13, dur: 0.75, rev: 0.5 }); bell(m + 24, t + 0.02 + i * 0.075, { vol: 0.03, dur: 0.3, rev: 0.3 }); });
      bell(91, t + 0.2, { vol: 0.07, dur: 1.2, rev: 0.6 }); bell(98, t + 0.26, { vol: 0.04, dur: 1, rev: 0.6 });
      noise(t + 0.16, 0.5, { hp: 4500, vol: 0.028, sweepTo: 12000, type: "highpass" }); A.music.duck(0.5, 1000);
    }),
    lootStep: cla("lootStep", (t, k = 1) => {
      const n = scaleNote(5 + Math.min(4, Math.max(1, k)), 60) + 12;
      bell(n, t, { vol: 0.08, dur: 0.4, rev: 0.3 }); bell(n + 7, t + 0.05, { vol: 0.06, dur: 0.6, rev: 0.35 }); noise(t, 0.012, { hp: 6000, vol: 0.05 });
      for (let i = 0; i < 1 + k; i++) bell(n + 12 + (i % 2) * 5, t + 0.09 + i * 0.045, { vol: 0.025, dur: 0.18, rev: 0.25 });
    }),
    ach: cla("ach", t => { [79, 83, 86, 91].forEach((m, i) => bell(m, t + i * 0.08, { vol: 0.09, dur: 1.2, rev: 0.6 })); pluck(67, t, { vol: 0.12, dur: 0.6, rev: 0.4 }); noise(t + 0.25, 0.5, { hp: 5000, vol: 0.03, sweepTo: 12000, type: "highpass" }); }),
    buy: cla("buy", t => { [0, 0.06, 0.12].forEach((d, i) => bell(84 + i * 5, t + d, { vol: 0.07, dur: 0.4, rev: 0.3 })); thump(t, { vol: 0.16, f0: 200, f1: 70, dur: 0.08 }); noise(t + 0.02, 0.05, { hp: 3500, vol: 0.05 }); }),
    sell: cla("sell", t => { bell(76, t, { vol: 0.06, dur: 0.3 }); bell(69, t + 0.07, { vol: 0.06, dur: 0.4 }); noise(t, 0.04, { lp: 2400, vol: 0.06, type: "bandpass", q: 1 }); }),
    clear: cla("clear", t => { thump(t, { vol: 0.3, f0: 130, f1: 40, dur: 0.25 }); [72, 76, 79, 84, 88].forEach((m, i) => pluck(m, t + 0.08 + i * 0.075, { vol: 0.13, dur: 0.9, rev: 0.5 })); bell(96, t + 0.5, { vol: 0.08, dur: 1.4, rev: 0.7 }); A.music.duck(0.35, 1800); }),
    lose: cla("lose", t => { thump(t, { vol: 0.4, f0: 80, f1: 28, dur: 0.6 }); [57, 53, 50, 45].forEach((m, i) => pluck(m, t + i * 0.16, { vol: 0.12, dur: 1.3, bright: 1.5, rev: 0.7 })); noise(t, 0.6, { lp: 500, vol: 0.08 }); A.music.duck(0.25, 2400); }),
    stamp: cla("stamp", t => { thump(t, { vol: 0.45, f0: 120, f1: 32, dur: 0.35 }); noise(t, 0.12, { lp: 1600, vol: 0.14 }); }),
    win: cla("win", t => {
      MOTIF.forEach((m, i) => pluck(m + 12, t + 0.12 + i * 0.11, { vol: 0.16, dur: 1.2, rev: 0.6 }));
      [72, 76, 79, 84].forEach((m, i) => bell(m, t + 0.5 + i * 0.07, { vol: 0.08, dur: 1.6 }));
      pad([48, 55, 60, 64], t + 0.4, 2.6, 0.05 * PADK, lb); A.music.duck(0.3, 2600);
    }),
    intro: cla("intro", t => { noise(t, 0.5, { lp: 400, sweepTo: 6000, vol: 0.09, type: "bandpass", q: 1.4 }); thump(t + 0.32, { vol: 0.25, f0: 100, f1: 40, dur: 0.3 }); MOTIF.forEach((m, i) => pluck(m - 12, t + 0.34 + i * 0.09, { vol: 0.1, dur: 0.6 })); A.music.duck(0.4, 1800); }),
    lampara: cla("lampara", (t, i = 0) => { const r = Math.random; noise(t, 0.014, { hp: 3400 + 500 * i + 400 * r(), vol: 0.05 }); thump(t, { vol: 0.06, f0: 290 - 30 * i + 20 * r(), f1: 120, dur: 0.06 }); bell(i ? 91 : 86, t + 0.018, { vol: 0.016 + 0.005 * r(), dur: 0.7, rev: 0.35 }); }),
    boss: cla("boss", t => { [0, 0.28, 0.56].forEach(d => thump(t + d, { vol: 0.42, f0: 95, f1: 34, dur: 0.32 })); pad([38, 41, 44, 50], t, 2.6, 0.09 * PADK, lb); pluck(50, t + 0.85, { vol: 0.14, dur: 1.4, bright: 2, rev: 0.7 }); pluck(47, t + 1.1, { vol: 0.14, dur: 1.8, bright: 2, rev: 0.8 }); A.music.duck(0.3, 2600); }),
    voice: cla("voice", (t, mood = "sly", i = 0) => { const m = VMOOD[mood] || VMOOD.sly; blipSq(t, m.b + m.pat[i % m.pat.length] + ((i * 7) % 3), m); }),
    rouBet: cla("rouBet", (t, k = 0) => { noise(t, 0.018, { hp: 4200, vol: 0.07 }); thump(t, { vol: 0.15, f0: 230, f1: 90, dur: 0.1 }); bell(86 + k * 3, t + 0.004, { vol: 0.05, dur: 0.3, rev: 0.25 }); bell(93 + k * 3, t + 0.045, { vol: 0.04, dur: 0.35, rev: 0.25 }); noise(t + 0.09, 0.012, { hp: 5200, vol: 0.04 }); }),
    rouTick: cla("rouTick", (t, v = 0) => { pluck(86 - v * 22, t, { vol: 0.05 + v * 0.05, dur: 0.05 + v * 0.09, bright: 3.5, rev: 0.1 + v * 0.2 }); thump(t, { vol: 0.035 + v * 0.09, f0: 520 - v * 260, f1: 180, dur: 0.035 }); noise(t, 0.01 + v * 0.01, { hp: 3800, vol: 0.03 + v * 0.04 }); }),
    rouStop: cla("rouStop", t => { thump(t, { vol: 0.42, f0: 170, f1: 50, dur: 0.24 }); noise(t, 0.07, { lp: 2600, vol: 0.11 }); noise(t + 0.012, 0.02, { hp: 5000, vol: 0.06 }); bell(79, t + 0.02, { vol: 0.07, dur: 0.7, rev: 0.3 }); }),
  };
  /* la eleccion (Ajustes > Sonido > Sonidos, la guarda js/game.js): "lounge" (los nuevos) o "clasico" (los de antes) */
  A.audio.sonidos = "lounge";
  A.audio.setSonidos = v => { A.audio.sonidos = v === "clasico" ? "clasico" : "lounge"; };
  A.sfx = {};
  for (const k in NW) A.sfx[k] = CL[k] ? (...a) => (A.audio.sonidos === "clasico" ? CL[k] : NW[k])(...a) : NW[k];
  /* ------------------------------------------------------------------ el ambiente de la sala (v0.3.56, el sonido de la casa 3b) */
  /* Debajo de la musica, la sala: fichas y cartas y alguna copa, sueltas y de tarde en tarde. Cada sitio suena distinto (A.amb.place; lo llama
     js/casa.js, que ya sabe en que pantalla estas): el salon de la portada, la sala que baja la voz mientras piensas, la caja, la barra del
     Campamento y el silencio cuando llega el jefe.
     v0.3.58: NO hay fondo continuo. El murmullo sintetizado y la ruleta lejana (ruido filtrado los dos) sonaban a viento y a ruido blanco, y
     demasiado fuerte (usuario): fuera. Debajo de la musica solo quedan sonidos sueltos y reconocibles; nada de ruido sostenido.
     Sin cargar el juego:
      - las fichas y cartas son reales (assets/sfx/sala.mp3: 28 sonidos de "Casino Audio" de Kenney, CC0, en un solo archivo; SALA dice donde esta
        cada uno). Si no cargara, se sintetizan como antes;
      - los detalles sueltos los lanza un reloj de medio segundo que solo corre mientras el ambiente se oye.
     Ajustes > Sonido > Ambiente regula su nivel (60 % de fabrica). */
  /* cada sitio: nivel, timbre (paso bajo: cuanto mas bajo, mas lejos) y cuantas veces por segundo suena cada cosa */
  const PLACES = {
    salon: { lvl: 1, lp: 2200, chips: 0.4, glass: 0.13, ice: 0, deck: 1 },
    calma: { lvl: 0.55, lp: 900, chips: 0.1, glass: 0.04, ice: 0, deck: 0 },
    caja: { lvl: 0.85, lp: 1700, chips: 0.24, glass: 0.08, ice: 0, deck: 1 },
    barra: { lvl: 0.9, lp: 2100, chips: 0.16, glass: 0.3, ice: 0.18, deck: 0 },
    jefe: { lvl: 0, lp: 500, chips: 0, glass: 0, ice: 0, deck: 0 },      // llega el jefe: la sala se calla
    fuera: { lvl: 0, lp: 500, chips: 0, glass: 0, ice: 0, deck: 0 },     // la Enciclopedia: un aparato, fuera de la sala
  };
  A.audio.vol.amb = 0.6;
  let amb = null, ambPlace = "salon", ambTimer = 0;
  const ambWanted = () => A.audio.sfxOn && A.audio.vol.amb > 0.005;
  const ambLevel = P => (ambWanted() ? P.lvl * 0.55 * 0.9 * A.audio.vol.amb : 0);
  function ambBuild() {
    if (amb || !ctx) return;
    const mk = (f, sendTo) => { const g = ctx.createGain(), lp = ctx.createBiquadFilter(); g.gain.value = 0; lp.type = "lowpass"; lp.frequency.value = f; g.connect(lp).connect(master); if (sendTo) { const s = ctx.createGain(); s.gain.value = sendTo; lp.connect(s).connect(revIn); } return { g, lp }; };
    amb = { ev: mk(1800, 0.85), n: { chips: 0, glass: 0, ice: 0, deck: 0 }, P: PLACES.fuera };   // envio a la sala calida: la misma energia que a la de antes (0,5 x 1,69)
  }
  /* el sitio manda: nivel y timbre. Cuando llega el jefe la sala se calla de golpe; en lo demas, cambia en medio segundo largo */
  function ambApply() {
    if (!ctx) return; const P = PLACES[ambPlace] || PLACES.salon, lvl = ambLevel(P);
    if (!amb) { if (lvl > 0 && ctx.state === "running") ambBuild(); if (!amb) return; }
    const t = ctx.currentTime, tc = ambPlace === "jefe" ? 0.12 : 0.6; amb.P = P;
    amb.ev.g.gain.setTargetAtTime(lvl, t, tc); amb.ev.lp.frequency.setTargetAtTime(P.lp, t, tc);
    if (lvl > 0 && !ambTimer) { const now = ctx.currentTime; amb.n = { chips: now + 1 + Math.random() * 2, glass: now + 3 + Math.random() * 6, ice: now + 2 + Math.random() * 5, deck: now + 20 + Math.random() * 30 }; ambTimer = setInterval(ambTick, 500); }
    else if (lvl <= 0 && ambTimer) { clearInterval(ambTimer); ambTimer = 0; }
  }
  /* un sonido del archivo de la sala, cada vez a otra altura, en otro lado y con otra fuerza */
  function ambSample(fam, t, vol) {
    const l = SALA[fam], it = l[Math.floor(Math.random() * l.length)], s = ctx.createBufferSource(), g = ctx.createGain(), p = ctx.createStereoPanner();
    s.buffer = sala; s.playbackRate.value = 0.92 + Math.random() * 0.16; g.gain.value = vol * (0.6 + Math.random() * 0.6); p.pan.value = Math.random() * 1.6 - 0.8;
    s.connect(g).connect(p).connect(amb.ev.g); s.start(t, it[0], it[1]);
  }
  function ambTick() {
    if (!amb || !ctx || ctx.state !== "running" || document.hidden) return;
    const now = ctx.currentTime, P = amb.P, n = amb.n, r = Math.random, ex = k => -Math.log(1 - r()) / k, bus = amb.ev.g, t = now + 0.03 + r() * 0.45;
    if (P.chips && now >= n.chips) {                                    // fichas (casi siempre) o una carta
      if (sala) { const q = r(); ambSample(q < 0.6 ? "chip" : q < 0.82 ? "mano" : "carta", t, 0.085); }
      else { const k = 2 + Math.floor(r() * 3); for (let i = 0; i < k; i++) noise(t + i * (0.025 + r() * 0.02), 0.012, { type: "bandpass", lp: 3500 + r() * 1500, q: 2, vol: 0.035 * (0.5 + r()), bus }); }
      n.chips = now + ex(P.chips);
    }
    if (P.glass && now >= n.glass) { bell(96 + Math.floor(r() * 8), t, { vol: 0.02 * (0.5 + r()), dur: 0.4, bus, rev: 0 }); n.glass = now + ex(P.glass); }                       // una copa
    if (P.ice && now >= n.ice) { for (let i = 0; i < 3; i++) bell(100 + Math.floor(r() * 6), t + i * 0.05 * r(), { vol: 0.012, dur: 0.12, bus, rev: 0 }); n.ice = now + ex(P.ice); }   // hielo
    if (P.deck && sala && now >= n.deck) { ambSample("baraja", t, 0.06); n.deck = now + 45 + r() * 40; }                                                             // alguien baraja, lejos
  }
  A.amb = {
    /* el sitio: "salon" | "calma" | "caja" | "barra" | "jefe" | "fuera" */
    place(key) { if (PLACES[key]) ambPlace = key; ambApply(); },
    refresh: ambApply,
    get where() { return ambPlace; },
      };

  /* el motor de sonido (abrir el dispositivo de audio y preparar la reverb: ~50 ms de golpe) se monta ya, detras de la pantalla de carga.
     Antes se montaba con el primer sonido (la intro del estudio o el primer clic) y ese fotograma se quedaba parado. Sin gesto del jugador
     el navegador lo deja en pausa: init() lo reanuda con el primer clic, como siempre */
  init();
})(window.AIQ);
