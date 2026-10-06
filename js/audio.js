/*
 * Geolite - identidad sonora.
 * Los efectos se sintetizan en el navegador; la musica son las 21 pistas fijas de la BSO (assets/music/*.mp3),
 * obra del autor del juego (creada con AKAI): aqui solo se integran y reproducen.
 *  - Firma: motivo de tres notas ascendentes (sol-do-re) que suena al empezar, al superar niveles y en la victoria.
 *  - Escala pentatonica de Do mayor: cualquier nota que suene "encaja", asi nada choca.
 *  - La intensidad de "tension" (ultimos segundos) abre el filtro de la musica; no cambia de pista.
 *  - Los sonidos del resultado cambian segun lo cerca que estes: diana, muy bien, bien, fallo, tiempo agotado.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const PENTA = [0, 2, 4, 7, 9];
  const MOTIF = [67, 72, 74];                       // sol-do-re: la "firma" de Geolite
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const scaleNote = (i, base = 60) => base + 12 * Math.floor(i / 5) + PENTA[((i % 5) + 5) % 5];

  let ctx = null, master, sfxBus, musBus, musFilter, revIn;
  A.audio = { sfxOn: true, musicOn: true, vol: { master: 0.85, music: 0.7, sfx: 0.9 } };
  const MUS_BASE = 0.55;

  function impulse(seconds, decay) {
    const n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return buf;
  }
  function init() {
    if (ctx) { if (ctx.state === "suspended" && !document.hidden) ctx.resume(); return true; }   // con la pestana oculta sigue callado (un efecto suelto no lo despierta)
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = A.audio.vol.master;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 20; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = A.audio.vol.sfx; sfxBus.connect(master);
    musFilter = ctx.createBiquadFilter(); musFilter.type = "lowpass"; musFilter.frequency.value = 8600;
    musBus = ctx.createGain(); musBus.gain.value = MUS_BASE * A.audio.vol.music; musBus.connect(musFilter).connect(master);
    const rv = ctx.createConvolver(); rv.buffer = impulse(1.9, 2.8);
    const rvOut = ctx.createGain(); rvOut.gain.value = 0.42;
    revIn = ctx.createGain(); revIn.connect(rv); rv.connect(rvOut).connect(master);
    /* pestana oculta: se suspende el audio y se pausa la cancion (si no, seguiria avanzando en silencio y encadenando pistas sin que nadie las oiga) */
    let hidPlay = false;
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) { hidPlay = !!(mediaEl && !mediaEl.paused); if (hidPlay) mediaEl.pause(); ctx.suspend(); }
      else { ctx.resume(); if (hidPlay && mediaEl && A.audio.musicOn) mediaEl.play().catch(() => {}); hidPlay = false; }
    });
    return true;
  }

  /* ------------------------------------------------------------------ voces */
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
  }
  function send(node, amt) { if (!amt) return; const s = ctx.createGain(); s.gain.value = amt; node.connect(s).connect(revIn); }

  /* pulsada tipo kalimba / marimba */
  function pluck(m, t, o = {}) {
    const { vol = 0.14, dur = 0.5, bright = 6, bus = sfxBus, rev = 0.3, wave = "triangle" } = o;
    const f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = Math.min(9000, f * bright);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o1.type = wave; o1.frequency.value = f; o2.type = "sine"; o2.frequency.value = f * 4; g2.gain.value = 0.16;
    o1.connect(g); o2.connect(g2).connect(g); g.connect(lp); lp.connect(bus); send(lp, rev);
    env(g, t, 0.003, vol, dur);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  /* campana (armonicos inarmonicos: sonido metalico limpio) */
  function bell(m, t, o = {}) {
    const { vol = 0.1, dur = 1.1, bus = sfxBus, rev = 0.5 } = o;
    const f = mtof(m), g = ctx.createGain();
    [[1, 1], [2.756, 0.32], [5.404, 0.12]].forEach(([r, a]) => {
      if (f * r > 20000) return;                                         // armonicos por encima de lo audible (y del limite del oscilador): fuera
      const os = ctx.createOscillator(), ga = ctx.createGain();
      os.type = "sine"; os.frequency.value = f * r; ga.gain.value = a; os.connect(ga).connect(g); os.start(t); os.stop(t + dur + 0.1);
    });
    g.connect(bus); send(g, rev); env(g, t, 0.004, vol, dur);
  }
  let noiseBuf = null;
  function noise(t, dur, o = {}) {
    const { hp = 0, lp = 20000, vol = 0.05, bus = sfxBus, sweepTo, q = 0.7, type } = o;
    if (!noiseBuf) { const nn = ctx.sampleRate * 2, d0 = (noiseBuf = ctx.createBuffer(1, nn, ctx.sampleRate)).getChannelData(0); for (let i = 0; i < nn; i++) d0[i] = Math.random() * 2 - 1; }   // un solo buffer de ruido reutilizado
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f1 = ctx.createBiquadFilter(); f1.type = type || (hp ? "highpass" : "lowpass"); f1.frequency.value = hp || lp; f1.Q.value = q;
    if (sweepTo) f1.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain(); s.connect(f1).connect(g).connect(bus); env(g, t, 0.004, vol, dur);
    s.start(t, Math.random() * (noiseBuf.duration - dur - 0.2)); s.stop(t + dur + 0.05);
  }
  function thump(t, o = {}) {
    const { vol = 0.3, f0 = 130, f1 = 42, dur = 0.16, bus = sfxBus } = o;
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
  /* tragaperras (jackpot de la Enciclopedia) */
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
    const { vol = 0.03, dur = 0.14, vib = 0, bus = sfxBus } = o;
    const f = mtof(m), os = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    os.type = "square"; os.frequency.setValueAtTime(f * 0.94, t); os.frequency.exponentialRampToValueAtTime(f, t + 0.028);
    lp.type = "lowpass"; lp.Q.value = 1.1; lp.frequency.setValueAtTime(f * 2, t); lp.frequency.exponentialRampToValueAtTime(Math.min(9000, f * 4.5), t + 0.05);
    if (vib) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = vib; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.011, t + dur * 0.55); lfo.connect(lg).connect(os.frequency); lfo.start(t); lfo.stop(t + dur + 0.1); }
    os.connect(lp).connect(g).connect(bus); send(g, 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.014); g.gain.setValueAtTime(vol * 0.85, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.start(t); os.stop(t + dur + 0.05);
  }
  /* pitido arcade de onda cuadrada: el brillo de maquinita que se suma a las campanas */
  function chirp(m, t, vol = 0.025, dur = 0.09) {
    const os = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    os.type = "square"; os.frequency.value = mtof(m); lp.type = "lowpass"; lp.frequency.value = Math.min(9000, mtof(m) * 5);
    os.connect(lp).connect(g).connect(sfxBus); env(g, t, 0.003, vol, dur); os.start(t); os.stop(t + dur + 0.05);
  }


  /* voz arcade del crupier: silabas cortas de onda cuadrada/diente de sierra, el tono cambia con el humor */
  const VMOOD = {
    sly: { b: 52, w: "square", pat: [0, 3, 5, 3, 7, 5], d: 0.06, v: 0.05, slide: 1 }, laugh: { b: 60, w: "square", pat: [7, 3], d: 0.08, v: 0.06, slide: -2 },
    angry: { b: 40, w: "sawtooth", pat: [0, -2, 1, -3], d: 0.055, v: 0.055, slide: -1 }, shock: { b: 58, w: "square", pat: [0, 4, 8, 12], d: 0.05, v: 0.055, slide: 2 },
    boss: { b: 34, w: "sawtooth", pat: [0, 0, -3, 2], d: 0.09, v: 0.075, slide: -1 },
  };
  function blip(t, n, m) {
    const os = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    os.type = m.w; os.frequency.setValueAtTime(mtof(n + 12), t); os.frequency.exponentialRampToValueAtTime(mtof(n + 12 + (m.slide || 0)), t + m.d);
    lp.type = "lowpass"; lp.frequency.value = 2600; os.connect(lp).connect(g).connect(sfxBus); env(g, t, 0.004, m.v, m.d); os.start(t); os.stop(t + m.d + 0.05);
  }

  /* ------------------------------------------------------------------ musica: 21 pistas fijas ("BSO" del casino) */
  /*
   * Cada pista es un archivo real en assets/music/ (la BSO del autor del juego, creada con AKAI).
   * Aqui solo se reproducen, se encadenan solas al terminar y se anuncian con una pequena transicion.
   * Titulos: terminos de apuestas en los 12 idiomas (es|en|fr|pt|de|it|es-419|zh|ko|ja|ru|pl).
   */
  const NAMES = [
    ["Apuesta segura", "Sure Bet", "Pari sûr", "Aposta segura", "Sichere Wette", "Scommessa sicura", "Apuesta segura", "稳赢之注", "확실한 베팅", "鉄板の賭け", "Верная ставка", "Pewny zakład"],
    ["Doble o nada", "Double or Nothing", "Quitte ou double", "Dobro ou nada", "Doppelt oder nichts", "Doppio o niente", "Doble o nada", "加倍或归零", "더블 오어 낫싱", "倍か無か", "Всё или ничего", "Podwójnie albo nic"],
    ["Ambos marcan", "Both Teams to Score", "Les deux équipes marquent", "Ambas marcam", "Beide Teams treffen", "Entrambe segnano", "Ambos anotan", "双方都进球", "양 팀 득점", "両チーム得点", "Обе забьют", "Obie strzelą"],
    ["Más de 2,5 goles", "Over 2.5 Goals", "Plus de 2,5 buts", "Mais de 2,5 gols", "Über 2,5 Tore", "Over 2,5 gol", "Más de 2.5 goles", "大于 2.5 球", "2.5골 이상", "2.5ゴール以上", "Тотал больше 2,5", "Powyżej 2,5 gola"],
    ["Todo al rojo", "All on Red", "Tout sur le rouge", "Tudo no vermelho", "Alles auf Rot", "Tutto sul rosso", "Todo al rojo", "全押红色", "레드에 올인", "すべて赤に", "Всё на красное", "Wszystko na czerwone"],
    ["Huérfanos", "Orphans", "Orphelins", "Órfãos", "Waisen", "Orfani", "Huérfanos", "孤儿注", "오르펠랭", "オーファン", "Сироты", "Sieroty"],
    ["All-in", "All In", "Tapis !", "All-in", "All-in", "All-in", "All-in", "全押", "올인", "オールイン", "Ва-банк", "All-in"],
    ["Combinada", "Parlay", "Pari combiné", "Múltipla", "Kombiwette", "Multipla", "Parlay", "串关", "팔레이", "パーレー", "Экспресс", "Kupon łączony"],
    ["Sube la apuesta", "Raise the Stakes", "Je relance", "Aumenta a aposta", "Einsatz erhöhen", "Rilancio", "Sube la apuesta", "加注", "판돈을 올려라", "レイズ", "Поднять ставки", "Podbij stawkę"],
    ["Retirar ganancias", "Cash Out", "Encaisser", "Retirar ganhos", "Auszahlen", "Incassa", "Cobrar ganancias", "兑现离场", "캐시 아웃", "キャッシュアウト", "Забрать выигрыш", "Wypłata"],
    ["Banca al día", "Bankroll", "Bankroll", "Banca em dia", "Bankroll", "Bankroll", "Banca al día", "资金池", "뱅크롤", "バンクロール", "Банкролл", "Kasa w porządku"],
    ["Apuesta en vivo", "Live Bet", "Pari en direct", "Aposta ao vivo", "Live-Wette", "Scommessa live", "Apuesta en vivo", "现场投注", "라이브 베팅", "ライブベット", "Ставка по ходу игры", "Zakład na żywo"],
    ["Pleno al quince", "Straight Up", "Plein au quinze", "Pleno ao quinze", "Volltreffer", "Pieno al quindici", "Pleno al quince", "单号直注", "스트레이트 업", "ストレートアップ", "Ставка на число", "Pełny na piętnastkę"],
    ["Hándicap asiático", "Asian Handicap", "Handicap asiatique", "Handicap asiático", "Asiatisches Handicap", "Handicap asiatico", "Hándicap asiático", "亚洲让球", "아시안 핸디캡", "アジアンハンディキャップ", "Азиатская фора", "Handicap azjatycki"],
    ["Gran apostador", "High Roller", "Flambeur", "Grande apostador", "Großspieler", "Giocatore d'alto bordo", "Gran apostador", "豪赌客", "하이 롤러", "ハイローラー", "Хайроллер", "Gruba ryba"],
    ["Bote acumulado", "Progressive Jackpot", "Jackpot progressif", "Jackpot progressivo", "Progressiver Jackpot", "Jackpot progressivo", "Pozo acumulado", "累积奖池", "누적 잭팟", "プログレッシブ・ジャックポット", "Прогрессивный джекпот", "Kumulacja"],
    ["Ventaja de la casa", "House Edge", "Avantage de la maison", "Vantagem da casa", "Hausvorteil", "Vantaggio del banco", "Ventaja de la casa", "庄家优势", "하우스 엣지", "ハウスエッジ", "Преимущество казино", "Przewaga kasyna"],
    ["Mano caliente", "Hot Hand", "Main chaude", "Mão quente", "Heiße Hand", "Mano calda", "Mano caliente", "手气正旺", "핫 핸드", "ホットハンド", "Горячая рука", "Gorąca ręka"],
    ["Ganador y colocado", "Each Way", "Pari gagnant-placé", "Ganhador e colocado", "Sieg-Platz-Wette", "Vincente e piazzato", "Ganador y colocado", "独赢位置", "이치 웨이", "単勝・複勝", "Победа и место", "Wygrana i miejsce"],
    ["Empate no vale", "Draw No Bet", "Match nul remboursé", "Empate anula aposta", "Unentschieden, Geld zurück", "Pareggio rimborsato", "Empate no cuenta", "平局退款", "무승부 환불", "引き分け返金", "Ничья — возврат", "Remis bez zakładu"],
    ["Apuesta máxima", "Max Bet", "Mise maximale", "Aposta máxima", "Höchsteinsatz", "Puntata massima", "Apuesta máxima", "最大注", "최대 베팅", "マックスベット", "Максимальная ставка", "Maksymalna stawka"],
  ];
  const FILES = [
    "assets/music/01-lounge-nocturno.mp3", "assets/music/02-ragtime-roulette.mp3", "assets/music/03-bossa-de-medianoche.mp3",
    "assets/music/04-samba-del-crupier.mp3", "assets/music/05-blues-del-tapete.mp3", "assets/music/06-vals-real.mp3",
    "assets/music/07-funk-jackpot.mp3", "assets/music/08-big-band-all-in.mp3", "assets/music/09-mambo-royale.mp3",
    "assets/music/10-cash-out.mp3", "assets/music/11-banca-al-dia.mp3", "assets/music/12-apuesta-en-vivo.mp3",
    "assets/music/13-pleno-al-quince.mp3", "assets/music/14-handicap-asiatico.mp3", "assets/music/15-funk-da-sorte.mp3",
    "assets/music/16-house-del-crupier.mp3", "assets/music/17-tecno-del-bote.mp3", "assets/music/18-merengue-del-premio.mp3",
    "assets/music/19-cha-cha-del-casino.mp3", "assets/music/20-ranchera-de-la-suerte.mp3", "assets/music/21-corrido-del-apostador.mp3",
  ];
  let cur = -1, mediaEl = null, mediaSrc = null, mode = 0;
  const recent = [];

  function ensureMedia() {
    if (mediaEl) return;
    mediaEl = new Audio(); mediaEl.crossOrigin = "anonymous"; mediaEl.preload = "auto"; mediaEl.loop = false;   // si algun dia sale de otro dominio: sin CORS, WebAudio la silenciaria
    mediaSrc = ctx.createMediaElementSource(mediaEl); mediaSrc.connect(musBus);
    mediaEl.addEventListener("ended", () => useTrack(autoIdx(), true));
  }
  const autoIdx = () => { const opts = FILES.map((_, i) => i).filter(i => !recent.includes(i)); return opts[Math.floor(Math.random() * opts.length)]; };
  const nextIdx = () => (cur + 1) % FILES.length;
  const prevIdx = () => (cur - 1 + FILES.length) % FILES.length;
  function transition(t) {
    noise(t, 1.1, { hp: 2500, vol: 0.035, sweepTo: 9000, type: "highpass", bus: musBus }); thump(t, { vol: 0.2, f0: 90, f1: 40, dur: 0.3, bus: musBus }); bell(84, t, { vol: 0.05, dur: 1.4, bus: musBus, rev: 0.6 });
  }
  function useTrack(i, announce) {
    ensureMedia(); cur = i; recent.push(i); if (recent.length > 4) recent.shift();
    mediaEl.src = A.media(FILES[i]); mediaEl.currentTime = 0; mediaEl.play().catch(() => {});
    if (announce) { transition(ctx.currentTime); if (A.music.onChange) A.music.onChange(i); }
  }
  A.music = {
    start() {
      if (!A.audio.musicOn || !init()) return;
      if (cur < 0) useTrack(0, false); else { ensureMedia(); mediaEl.play().catch(() => {}); }
    },
    next() { if (cur < 0) return; useTrack(nextIdx(), true); },
    prev() { if (cur < 0) return; useTrack(prevIdx(), true); },
    index() { return cur; },
    count() { return FILES.length; },
    title(i = cur) { const n = NAMES[i]; if (!n) return ""; const k = A.LANGS.findIndex(l => l.code === A.lang); return n[k] || n[1]; },
    go(i) { if (FILES[i] != null) useTrack(i, true); },   // dev: salta a una cancion
    now() { return A.music.title(); },
    stop() { if (mediaEl) mediaEl.pause(); },
    mode(m) { mode = m; if (ctx) musFilter.frequency.setTargetAtTime(m === 2 ? 12500 : 8600, ctx.currentTime, 0.15); },
    duck(level = 0.3, ms = 1400) {
      if (!ctx || cur < 0) return;
      const base = MUS_BASE * A.audio.vol.music, t = ctx.currentTime; musBus.gain.cancelScheduledValues(t);
      musBus.gain.setTargetAtTime(base * level, t, 0.05); musBus.gain.setTargetAtTime(base, t + ms / 1000, 0.4);
    },
    muffle(on) { if (ctx) musFilter.frequency.setTargetAtTime(on ? 320 : 8600, ctx.currentTime, 0.08); },
  };
  A.audio.setSkin = () => {};   // las 21 pistas ya son archivos fijos: el timbre/tempo por skin ya no aplica
  A.audio.state = () => (ctx ? ctx.state : 'none');
  /* volumen 0..1 de "master" | "music" | "sfx" */
  A.audio.setVol = (kind, v) => {
    v = Math.max(0, Math.min(1, v)); A.audio.vol[kind] = v;
    if (!ctx) return;
    const t = ctx.currentTime;
    if (kind === "master") master.gain.setTargetAtTime(v, t, 0.03);
    else if (kind === "music") { musBus.gain.cancelScheduledValues(t); musBus.gain.setTargetAtTime(MUS_BASE * v, t, 0.03); }
    else sfxBus.gain.setTargetAtTime(v, t, 0.03);
  };
  A.audio.unlock = (music = true) => { init(); if (music && A.audio.musicOn && ctx) A.music.start(); };
  A.audio.setMusic = on => { A.audio.musicOn = on; if (on) A.music.start(); else A.music.stop(); };

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
  /* grado pentatonico de cada boton del menu principal: clasico, aventura, diario (las cartas suben de izquierda a derecha),
     Enciclopedia, Perfil y Clasificacion (abajo, mas graves y tambien subiendo: Enciclopedia, Clasificacion, Perfil) y Ajustes (arriba, el mas agudo).
     Todo entre do5 y re6 */
  const HOV_DEG = [7, 8, 9, 6, 8, 10, 7];
  let hovT = -1, hovLast = 0, landLast = 0, flagLast = -1;
  const JP_GAP = 0.46;                    // segundos entre jackpots de la Enciclopedia: el ticket enciende sus casillas y el movil vibra a este mismo ritmo
  const JP_LEAD = 0.12;                   // con cuanta antelacion se crean los nodos de cada golpe del jackpot
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

  A.sfx = {
    ui: go(t => pluck(84, t, { vol: 0.05, dur: 0.12, bright: 3, rev: 0.1 })),
    hover: go(t => noise(t, 0.02, { hp: 5000, vol: 0.02 })),
    /* menu principal (3 modos, Enciclopedia, Clasificacion, Perfil, Ajustes): rozar una ficha de casino. Clac minimo de ficha, nota de marimba o kalimba,
       brillo de campana y una pizca de 8 bits, todo flojito. Cada boton tiene su registro (barrer las cartas suena a arpegio) y cada vez
       se sortea la nota vecina (nunca la misma que la anterior), el timbre, el brillo, la sala y el volumen: no suena dos veces igual */
    menuHover: go((t, k = 0) => {
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
    /* clic en el fieltro: pulsar donde sea en el menu, sin que haya nada que pulsar, y aun asi se siente bien */
    felt: go(t => { thump(t, { vol: 0.13, f0: 150, f1: 58, dur: 0.08 }); noise(t, 0.04, { lp: 1700, vol: 0.035 }); pluck(64, t + 0.012, { vol: 0.03, dur: 0.14, bright: 2, rev: 0.15 }); }),
    start: go(t => { MOTIF.forEach((m, i) => pluck(m, t + i * 0.13, { vol: 0.16, dur: 0.9, rev: 0.6 })); bell(79, t + 0.42, { vol: 0.07 }); }),
    /* clic en el mapa: chincheta que cae */
    tap: go(t => { thump(t, { vol: 0.32, f0: 320, f1: 70, dur: 0.1 }); noise(t, 0.05, { lp: 2200, vol: 0.06 }); pluck(76, t + 0.02, { vol: 0.05, dur: 0.15, rev: 0.15 }); }),
    /* resultado: 0 fallo grande · 1 mal · 2 bien · 3 muy bien · 4 diana · 5 tiempo agotado */
    reveal: go((t, tier) => {
      if (tier === 4) {
        [72, 76, 79, 84].forEach((m, i) => bell(m + 12, t + i * 0.055, { vol: 0.085, dur: 1.4 })); thump(t, { vol: 0.28, f0: 90, f1: 38, dur: 0.4 });
        noise(t, 0.6, { hp: 3000, vol: 0.04, sweepTo: 12000, type: "highpass" }); A.music.duck(0.35, 1600);
      } else if (tier === 3) { [72, 76, 79].forEach((m, i) => bell(m, t + i * 0.07, { vol: 0.09, dur: 1.1 })); A.music.duck(0.4, 1300); }
      else if (tier === 2) { [76, 79].forEach((m, i) => bell(m, t + i * 0.08, { vol: 0.08, dur: 0.9 })); }
      else if (tier === 1) { pluck(67, t, { vol: 0.12, dur: 0.5, bright: 3 }); pluck(64, t + 0.11, { vol: 0.1, dur: 0.6, bright: 3 }); }
      else if (tier === 0) { pluck(57, t, { vol: 0.16, dur: 0.6, bright: 2 }); pluck(53, t + 0.16, { vol: 0.15, dur: 0.9, bright: 1.8 }); thump(t + 0.02, { vol: 0.12, f0: 100, f1: 50 }); }
      else { thump(t, { vol: 0.26, f0: 150, f1: 55 }); pluck(50, t + 0.12, { vol: 0.14, dur: 0.9, bright: 1.5 }); noise(t, 0.09, { lp: 900, vol: 0.05 }); }
    }),
    /* contador de puntos: sube por la pentatonica, como una maquinita */
    count: go((t, k) => pluck(scaleNote(Math.floor(k * 9), 72), t, { vol: 0.045, dur: 0.09, bright: 3, rev: 0.05 })),
    countEnd: go(t => { bell(84, t, { vol: 0.07, dur: 0.8 }); bell(91, t + 0.06, { vol: 0.04, dur: 0.8 }); }),
    /* racha: cada nivel de racha sube un peldano */
    streak: go((t, n) => { const b = scaleNote(4 + Math.min(n, 7) * 2, 60); pluck(b, t, { vol: 0.12, dur: 0.4 }); pluck(b + 7, t + 0.07, { vol: 0.1, dur: 0.5 }); noise(t, 0.25, { hp: 2500, vol: 0.03, sweepTo: 9000, type: "highpass" }); }),
    /* v0.2.15, la bandera del acierto: corneta pixel de tres notas que suben mientras la bandera sube por el mastil. Flojita (muy por debajo de los
       jackpots) y nunca igual: se sortean el motivo (nunca el de la vez anterior), el tono, el volumen y la afinacion; la ultima nota lleva vibrato.
       Delante, el golpe de tela al desplegarse. n = 2 (dos paises): un eco una octava arriba */
    flag: go((t, n = 1) => {
      const r = Math.random, M = [[0, 2, 3], [0, 3, 5], [2, 3, 5], [0, 2, 5], [1, 3, 5]];
      let mi = Math.floor(r() * M.length); if (mi === flagLast) mi = (mi + 1 + Math.floor(r() * (M.length - 1))) % M.length; flagLast = mi;
      const base = [60, 62, 65][Math.floor(r() * 3)] + 12, v = 0.03 * (0.85 + 0.3 * r()), step = 0.1 + 0.025 * r();
      noise(t, 0.08, { type: "bandpass", lp: 1300 + 700 * r(), q: 0.9, vol: 0.022 });
      noise(t + 0.03, 0.05, { type: "bandpass", lp: 2200 + 900 * r(), q: 1.2, vol: 0.012 });
      M[mi].forEach((d, i) => { const last = i === 2; horn(scaleNote(d, base) + (r() - 0.5) * 0.08, t + 0.05 + i * step, { vol: v * (last ? 1.08 : 0.9), dur: last ? 0.44 : 0.11, vib: last ? 5.5 + r() : 0 }); });
      if (n > 1) M[mi].forEach((d, i) => horn(scaleNote(d, base) + 12, t + 0.2 + i * step, { vol: v * 0.32, dur: i === 2 ? 0.3 : 0.08 }));
    }),
    /* v0.2.15, racha rota: la ficha que se agrieta. Chasquido seco, unas esquirlas, un golpe sordo y dos notas que caen. Flojo: perder no se celebra, pero se nota */
    streakBreak: go(t => {
      const r = Math.random;
      noise(t, 0.05, { type: "bandpass", lp: 3600 + 900 * r(), q: 2.2, vol: 0.07 });
      for (let i = 0; i < 4; i++) noise(t + 0.012 + i * 0.019 + r() * 0.008, 0.012, { hp: 4500 + r() * 2500, vol: 0.028 });
      thump(t, { vol: 0.15, f0: 140, f1: 48, dur: 0.14 });
      pluck(64, t + 0.05, { vol: 0.065, dur: 0.22, bright: 2.5, wave: "square" }); pluck(59, t + 0.17, { vol: 0.06, dur: 0.38, bright: 2 });
    }),
    tick: go((t, n) => pluck(88 - n * 2, t, { vol: 0.08, dur: 0.08, bright: 4, rev: 0.05 })),
    /* ruleta lineal del Campamento (v0.73): la ficha al apostar, el "no va mas" (campanilla), el arranque (barrido + golpe; la musica baja), el tic de matraca de
       cada casilla (v: 0 rapido .. 1 casi parada: mas grave, mas fuerte y mas largo), el latido del casi-fallo, el tope final y el cero */
    rouBet: go((t, k = 0) => { noise(t, 0.018, { hp: 4200, vol: 0.07 }); thump(t, { vol: 0.15, f0: 230, f1: 90, dur: 0.1 }); bell(86 + k * 3, t + 0.004, { vol: 0.05, dur: 0.3, rev: 0.25 }); bell(93 + k * 3, t + 0.045, { vol: 0.04, dur: 0.35, rev: 0.25 }); noise(t + 0.09, 0.012, { hp: 5200, vol: 0.04 }); }),
    rouNoMore: go(t => { bell(91, t, { vol: 0.07, dur: 0.9, rev: 0.4 }); bell(91, t + 0.13, { vol: 0.06, dur: 1.1, rev: 0.4 }); thump(t, { vol: 0.12, f0: 120, f1: 60, dur: 0.2 }); }),
    rouStart: go(t => { noise(t, 0.6, { lp: 300, sweepTo: 6500, vol: 0.085, type: "bandpass", q: 1.2 }); thump(t, { vol: 0.26, f0: 140, f1: 46, dur: 0.3 }); for (let i = 0; i < 6; i++) noise(t + 0.04 + i * 0.045, 0.01, { hp: 3000 + i * 500, vol: 0.04 }); A.music.duck(0.4, 3600); }),
    rouTick: go((t, v = 0) => { pluck(86 - v * 22, t, { vol: 0.05 + v * 0.05, dur: 0.05 + v * 0.09, bright: 3.5, rev: 0.1 + v * 0.2 }); thump(t, { vol: 0.035 + v * 0.09, f0: 520 - v * 260, f1: 180, dur: 0.035 }); noise(t, 0.01 + v * 0.01, { hp: 3800, vol: 0.03 + v * 0.04 }); }),
    rouCrawl: go(t => { thump(t, { vol: 0.3, f0: 72, f1: 36, dur: 0.16 }); thump(t + 0.17, { vol: 0.22, f0: 66, f1: 34, dur: 0.18 }); thump(t + 0.62, { vol: 0.3, f0: 72, f1: 36, dur: 0.16 }); pad([43, 50], t, 1.1, 0.035, sfxBus); }),
    rouStop: go(t => { thump(t, { vol: 0.42, f0: 170, f1: 50, dur: 0.24 }); noise(t, 0.07, { lp: 2600, vol: 0.11 }); noise(t + 0.012, 0.02, { hp: 5000, vol: 0.06 }); bell(79, t + 0.02, { vol: 0.07, dur: 0.7, rev: 0.3 }); }),
    /* carrete de finales (v0.2.47): el frenazo en seco (barrido que cae + matraca) y el nuevo empujon tras un falso final (barrido que sube + golpe) */
    rouBrake: go(t => { noise(t, 0.5, { lp: 7000, sweepTo: 350, vol: 0.09, type: "bandpass", q: 1.6 }); thump(t + 0.02, { vol: 0.2, f0: 150, f1: 50, dur: 0.28 }); for (let i = 0; i < 4; i++) noise(t + 0.06 + i * 0.07, 0.012, { hp: 3500 + i * 300, vol: 0.04 }); }),
    rouKick: go(t => { noise(t, 0.28, { lp: 500, sweepTo: 5200, vol: 0.075, type: "bandpass", q: 1.2 }); thump(t, { vol: 0.24, f0: 150, f1: 52, dur: 0.22 }); noise(t + 0.02, 0.012, { hp: 4600, vol: 0.05 }); A.music.duck(0.4, 1800); }),
    /* Moneda al aire (v0.2.9): el lanzamiento (barrido + campanilla) y cada rebote al caer (k: 0 el golpe, 1 el rebote chico) */
    coinToss: go(t => { noise(t, 0.16, { hp: 2800, sweepTo: 9000, type: "highpass", vol: 0.05 }); bell(95, t, { vol: 0.08, dur: 0.5, rev: 0.2 }); bell(102, t + 0.035, { vol: 0.05, dur: 0.6, rev: 0.2 }); thump(t, { vol: 0.1, f0: 300, f1: 140, dur: 0.06 }); }),
    coinLand: go((t, k = 0) => { thump(t, { vol: 0.24 - k * 0.12, f0: 280, f1: 110, dur: 0.07 }); bell(88 + k * 6, t + 0.004, { vol: 0.11 - k * 0.05, dur: 1 - k * 0.5, rev: 0.3 }); bell(100 + k * 6, t + 0.04, { vol: 0.07 - k * 0.03, dur: 0.8 - k * 0.4, rev: 0.3 }); }),
    coinTink: go(t => { bell(98 + Math.random() * 6, t, { vol: 0.05, dur: 0.22, rev: 0.15 }); thump(t, { vol: 0.05, f0: 360, f1: 200, dur: 0.03 }); noise(t, 0.008, { hp: 5000, vol: 0.03 }); }),   // el traqueteo de una moneda que se asienta (v0.2.47)
    rouZero: go(t => { thump(t, { vol: 0.4, f0: 95, f1: 30, dur: 0.55 }); bell(67, t + 0.02, { vol: 0.08, dur: 1.4, rev: 0.4 }); bell(60, t + 0.1, { vol: 0.07, dur: 1.4, rev: 0.4 }); A.music.duck(0.3, 1500); }),
    intro: go(t => { noise(t, 0.5, { lp: 400, sweepTo: 6000, vol: 0.09, type: "bandpass", q: 1.4 }); thump(t + 0.32, { vol: 0.25, f0: 100, f1: 40, dur: 0.3 }); MOTIF.forEach((m, i) => pluck(m - 12, t + 0.34 + i * 0.09, { vol: 0.1, dur: 0.6 })); A.music.duck(0.4, 1800); }),
    stamp: go(t => { thump(t, { vol: 0.45, f0: 120, f1: 32, dur: 0.35 }); noise(t, 0.12, { lp: 1600, vol: 0.14 }); }),
    win: go(t => {
      MOTIF.forEach((m, i) => pluck(m + 12, t + 0.12 + i * 0.11, { vol: 0.16, dur: 1.2, rev: 0.6 }));
      [72, 76, 79, 84].forEach((m, i) => bell(m, t + 0.5 + i * 0.07, { vol: 0.08, dur: 1.6 }));
      pad([48, 55, 60, 64], t + 0.4, 2.6, 0.05); A.music.duck(0.3, 2600);
    }),
    fail: go(t => { [64, 60, 57].forEach((m, i) => pluck(m, t + i * 0.2, { vol: 0.13, dur: 1, bright: 2, rev: 0.6 })); thump(t, { vol: 0.14, f0: 90, f1: 40 }); A.music.duck(0.3, 2200); }),
    victory: go(t => {
      MOTIF.forEach((m, i) => pluck(m + 12, t + i * 0.13, { vol: 0.17, dur: 1.4, rev: 0.7 }));
      for (let i = 0; i < 12; i++) bell(scaleNote(5 + i, 60) + 12, t + 0.55 + i * 0.09, { vol: 0.06, dur: 1.5 });
      pad([48, 55, 60, 64, 67], t + 0.4, 4, 0.06); thump(t + 0.5, { vol: 0.3, f0: 100, f1: 36, dur: 0.5 }); A.music.duck(0.25, 4200);
    }),
    pause: go(t => pluck(60, t, { vol: 0.08, dur: 0.3, bright: 3 })),
    /* Vault Raiders: marcado de caja fuerte -> clunk -> puerta -> dos notas brillantes (quinta ascendente) */
    vault: go(t => {
      [0.10, 0.36, 0.60].forEach(d => { noise(t + d, 0.035, { hp: 2600, vol: 0.10 }); thump(t + d, { vol: 0.07, f0: 440, f1: 190, dur: 0.05 }); });
      noise(t + 0.1, 0.8, { lp: 220, sweepTo: 1500, vol: 0.05, type: "bandpass", q: 1.1 });
      thump(t + 0.92, { vol: 0.6, f0: 95, f1: 32, dur: 0.5 }); noise(t + 0.92, 0.1, { lp: 1800, vol: 0.18 });
      bell(57, t + 0.93, { vol: 0.11, dur: 1.0, rev: 0.4 }); bell(64.4, t + 0.94, { vol: 0.05, dur: 0.7, rev: 0.4 });
      noise(t + 0.95, 0.7, { hp: 1400, vol: 0.06, sweepTo: 6500, type: "highpass" });
      pad([48, 55, 59, 62, 64], t + 1.15, 2.8, 0.08, sfxBus);
      bell(79, t + 1.22, { vol: 0.14, dur: 1.7, rev: 0.6 }); bell(86, t + 1.44, { vol: 0.17, dur: 2.2, rev: 0.75 });
      [91, 95, 98, 103].forEach((m, i) => bell(m, t + 1.72 + i * 0.06, { vol: 0.045, dur: 0.9, rev: 0.7 }));
      noise(t + 1.7, 0.7, { hp: 5000, vol: 0.035, sweepTo: 12000, type: "highpass" });
    }),
    /* crupier: una silaba por letra (i = indice) y su risa */
    voice: go((t, mood = "sly", i = 0) => { const m = VMOOD[mood] || VMOOD.sly; blip(t, m.b + m.pat[i % m.pat.length] + ((i * 7) % 3), m); }),
    laugh: go(t => { for (let k = 0; k < 8; k++) blip(t + k * 0.095, 67 - k * 1.1 + (k % 2 ? 5 : 0), { w: "square", d: 0.075, v: 0.06, slide: -2 }); noise(t, 0.7, { hp: 2800, vol: 0.01 }); }),
    /* el crupier toca la mesa: cada reto llega con un clic de palanca, un golpe grave y una caida electrica */
    chal: go(t => { [0, 0.07, 0.14].forEach(d => noise(t + d, 0.03, { hp: 3200, vol: 0.09 })); thump(t + 0.18, { vol: 0.4, f0: 110, f1: 36, dur: 0.3 }); noise(t + 0.2, 0.5, { lp: 5000, sweepTo: 200, vol: 0.06, type: "bandpass", q: 1.2 }); bell(45, t + 0.22, { vol: 0.07, dur: 0.9, rev: 0.4 }); }),
    dark: go(t => { noise(t, 0.6, { lp: 3000, sweepTo: 120, vol: 0.07, type: "bandpass", q: 0.9 }); thump(t + 0.5, { vol: 0.3, f0: 80, f1: 30, dur: 0.3 }); }),
    buzz: go((t, i = 0) => { const os = ctx.createOscillator(), g = ctx.createGain(); os.type = "sawtooth"; os.frequency.value = 96 + i * 9; os.connect(g).connect(sfxBus); env(g, t, 0.004, 0.05, 0.07); os.start(t); os.stop(t + 0.12); noise(t, 0.05, { hp: 4000, vol: 0.07 }); }),
    restore: go(t => { noise(t, 0.35, { hp: 500, sweepTo: 8000, vol: 0.05, type: "highpass" }); pluck(84, t + 0.2, { vol: 0.08, dur: 0.3, rev: 0.3 }); thump(t + 0.02, { vol: 0.2, f0: 120, f1: 60, dur: 0.12 }); }),
    warn: go(t => { [0, 0.11].forEach(d => pluck(93, t + d, { vol: 0.08, dur: 0.1, bright: 4, rev: 0.1 })); }),
    thunder: go(t => { noise(t, 0.12, { hp: 3000, vol: 0.12 }); noise(t + 0.1, 1.3, { lp: 700, sweepTo: 70, vol: 0.14 }); thump(t + 0.12, { vol: 0.4, f0: 70, f1: 28, dur: 0.6 }); }),
    /* puntero: cruzar la costa */
    ptrEdge: go((t, land) => { if (land) pluck(83, t, { vol: 0.035, dur: 0.1, bright: 3, rev: 0.1 }); else bell(96, t, { vol: 0.02, dur: 0.22, rev: 0.3 }); }),
    /* estudio: dos golpes graves (se encienden "Cousins" y "studios") y un brillo suave cuando pasa la luz */
    studio: go(t => {
      thump(t + 0.62, { vol: 0.62, f0: 110, f1: 34, dur: 0.55 }); noise(t + 0.62, 0.09, { lp: 1500, vol: 0.14 }); bell(45, t + 0.63, { vol: 0.09, dur: 1.3, rev: 0.5 });
      thump(t + 1.26, { vol: 0.5, f0: 140, f1: 38, dur: 0.5 }); noise(t + 1.26, 0.08, { lp: 1900, vol: 0.12 }); bell(52, t + 1.27, { vol: 0.08, dur: 1.2, rev: 0.5 });
      noise(t + 1.85, 1.1, { hp: 3000, vol: 0.03, sweepTo: 9000, type: "highpass" }); bell(93, t + 2.0, { vol: 0.06, dur: 1.4, rev: 0.7 }); bell(100, t + 2.12, { vol: 0.04, dur: 1.2, rev: 0.7 });
    }),
    /* carta que se desliza (UI) y ficha que cae */
    card: go(t => { noise(t, 0.05, { lp: 2600, vol: 0.08, type: "bandpass", q: 0.8 }); noise(t + 0.04, 0.03, { hp: 3000, vol: 0.04 }); }),
    chip: go((t, k = 0) => { bell(84 + Math.round(k * 7), t, { vol: 0.05, dur: 0.25, rev: 0.2 }); noise(t, 0.01, { hp: 5000, vol: 0.04 }); }),
    /* zoom sensorial: silbido de aire continuo cuyo tono y volumen siguen la velocidad del zoom */
    zoomVel: (() => {
      let src = null, gain = null, filt = null;
      return (zv, pan) => {
        if (!ctx) return;
        if (!A.audio.sfxOn) { if (gain) gain.gain.setTargetAtTime(0, ctx.currentTime, 0.06); return; }   // efectos apagados (tecla M) a media rueda: el silbido no se queda sonando
        if (!src) {
          const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
          for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
          src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
          filt = ctx.createBiquadFilter(); filt.type = "bandpass"; filt.Q.value = 0.9; filt.frequency.value = 500;
          gain = ctx.createGain(); gain.gain.value = 0; src.connect(filt).connect(gain).connect(sfxBus); src.start();
        }
        const a = Math.min(1, Math.abs(zv) / 3.2 + Math.min(0.35, pan / 2600)), t = ctx.currentTime;
        gain.gain.setTargetAtTime(a * 0.045, t, 0.06);
        filt.frequency.setTargetAtTime(380 + a * 2400 + (zv > 0 ? 500 : 0), t, 0.07);
      };
    })(),
    /* feedback de sliders: el tono sube con el valor (0..1) */
    blip: go((t, v) => pluck(scaleNote(Math.round(v * 9), 67), t, { vol: 0.09, dur: 0.16, bright: 3, rev: 0.15 })),
    /* interruptores: clic seco de palanca */
    flip: go((t, on) => { thump(t, { vol: 0.16, f0: on ? 260 : 190, f1: 80, dur: 0.06 }); pluck(on ? 84 : 72, t + 0.015, { vol: 0.06, dur: 0.1, bright: 3, rev: 0.05 }); }),
    /* pulsar el boton de salida */
    depart: go(t => { thump(t, { vol: 0.3, f0: 180, f1: 50, dur: 0.14 }); noise(t, 0.35, { lp: 300, sweepTo: 5000, vol: 0.08, type: "bandpass", q: 1.2 }); MOTIF.forEach((m, i) => pluck(m, t + 0.05 + i * 0.09, { vol: 0.15, dur: 0.9, rev: 0.6 })); }),
    /* v0.6: clic de mapa (pin que cae), monedas, tienda, sonar, jefe, logro, ronda */
    pin: go((t, k = 0) => { const n = 60 + Math.min(k, 6) * 2; thump(t, { vol: 0.34, f0: 170, f1: 55, dur: 0.11 }); noise(t, 0.05, { hp: 2200, vol: 0.09 }); pluck(n + 12, t + 0.03, { vol: 0.11, dur: 0.28, bright: 4, rev: 0.25 }); bell(n + 24, t + 0.05, { vol: 0.04, dur: 0.4, rev: 0.4 }); }),
    coin: go((t, k = 0) => { const n = 88 + Math.round(k * 5); bell(n, t, { vol: 0.07, dur: 0.35, rev: 0.25 }); bell(n + 7, t + 0.055, { vol: 0.06, dur: 0.5, rev: 0.3 }); noise(t, 0.012, { hp: 6000, vol: 0.05 }); }),
    buy: go(t => { [0, 0.06, 0.12].forEach((d, i) => bell(84 + i * 5, t + d, { vol: 0.07, dur: 0.4, rev: 0.3 })); thump(t, { vol: 0.16, f0: 200, f1: 70, dur: 0.08 }); noise(t + 0.02, 0.05, { hp: 3500, vol: 0.05 }); }),
    sell: go(t => { bell(76, t, { vol: 0.06, dur: 0.3 }); bell(69, t + 0.07, { vol: 0.06, dur: 0.4 }); noise(t, 0.04, { lp: 2400, vol: 0.06, type: "bandpass", q: 1 }); }),
    deny: go(t => { thump(t, { vol: 0.2, f0: 120, f1: 60, dur: 0.1 }); pluck(46, t, { vol: 0.09, dur: 0.18, bright: 1 }); pluck(43, t + 0.09, { vol: 0.09, dur: 0.22, bright: 1 }); }),
    reroll: go(t => { for (let i = 0; i < 5; i++) noise(t + i * 0.04, 0.03, { hp: 2500 + i * 500, vol: 0.05 }); pluck(79, t + 0.2, { vol: 0.08, dur: 0.2, bright: 3 }); }),
    sonar: go((t, near = 0.5) => { const m = 88 - Math.round(near * 14); bell(m, t, { vol: 0.13, dur: 1.4, rev: 0.7 }); bell(m + 12, t + 0.02, { vol: 0.04, dur: 0.9, rev: 0.6 }); noise(t, 0.5, { lp: 900, sweepTo: 3000, vol: 0.03, type: "bandpass", q: 3 }); }),
    boss: go(t => { [0, 0.28, 0.56].forEach(d => thump(t + d, { vol: 0.42, f0: 95, f1: 34, dur: 0.32 })); pad([38, 41, 44, 50], t, 2.6, 0.09); pluck(50, t + 0.85, { vol: 0.14, dur: 1.4, bright: 2, rev: 0.7 }); pluck(47, t + 1.1, { vol: 0.14, dur: 1.8, bright: 2, rev: 0.8 }); A.music.duck(0.3, 2600); }),
    clear: go(t => { thump(t, { vol: 0.3, f0: 130, f1: 40, dur: 0.25 }); [72, 76, 79, 84, 88].forEach((m, i) => pluck(m, t + 0.08 + i * 0.075, { vol: 0.13, dur: 0.9, rev: 0.5 })); bell(96, t + 0.5, { vol: 0.08, dur: 1.4, rev: 0.7 }); A.music.duck(0.35, 1800); }),
    lose: go(t => { thump(t, { vol: 0.4, f0: 80, f1: 28, dur: 0.6 }); [57, 53, 50, 45].forEach((m, i) => pluck(m, t + i * 0.16, { vol: 0.12, dur: 1.3, bright: 1.5, rev: 0.7 })); noise(t, 0.6, { lp: 500, vol: 0.08 }); A.music.duck(0.25, 2400); }),
    /* legendaria del cofre (js/adventure.js, legendary): la carta sube al centro (soplo de banda que se abre) y aterriza en su hueco de la
       mochila (golpe de fieltro + campana); tono y filtro al azar dentro de su rango, y el aterrizaje nunca repite la nota de la vez anterior */
    lift: go(t => noise(t, 0.4, { lp: 440 + Math.random() * 120, sweepTo: 4400 + Math.random() * 1200, vol: 0.05, type: "bandpass", q: 1.3 })),
    land: go(t => {
      const N = [84, 86, 88, 91]; let m = N[Math.floor(Math.random() * 4)]; if (m === landLast) m = N[(N.indexOf(m) + 1 + Math.floor(Math.random() * 3)) % 4]; landLast = m;
      thump(t, { vol: 0.2, f0: 140 + Math.random() * 20, f1: 58, dur: 0.1 }); bell(m, t + 0.02, { vol: 0.06, dur: 0.6 }); pluck(m - 12, t, { vol: 0.07, dur: 0.3, rev: 0.3 });
    }),
    ach: go(t => { [79, 83, 86, 91].forEach((m, i) => bell(m, t + i * 0.08, { vol: 0.09, dur: 1.2, rev: 0.6 })); pluck(67, t, { vol: 0.12, dur: 0.6, rev: 0.4 }); noise(t + 0.25, 0.5, { hp: 5000, vol: 0.03, sweepTo: 12000, type: "highpass" }); }),
    /* Enciclopedia: 1, 2 o 3 jackpots segun el nivel (300 / 150 / 75 km). Cada jackpot es palanca + arpegio de campanas y pitidos
       + timbre + monedas, y el siguiente sube un peldano del mismo acorde de Do mayor (el bajo hace do-mi-sol) y pega mas fuerte.
       Tras el ultimo cae la lluvia de monedas, mas larga cuanto mas alto el nivel; el 3 es el premio gordo: golpe grave, acorde de fondo y destellos.
       Los nodos de cada golpe se crean poco antes de que suene (JP_LEAD), no todos al principio: el 3 son ~800 nodos y crearlos de golpe
       daba un tiron de ~60 ms con CPU lenta. Si algo se retrasa mas de 50 ms (ventana oculta), ese trozo no suena */
    jackpot: go((t, level = 1) => {
      const n = Math.max(1, Math.min(3, level | 0));
      const ARP = [[72, 76, 79, 84], [76, 79, 84, 88], [76, 79, 84, 88, 91]], RING = [[84, 79], [88, 84], [91, 88]];
      const P = [1.15, 1.3, 1.5], KICK = [[0.24, 160, 50, 0.14], [0.3, 145, 44, 0.2], [0.45, 110, 30, 0.6]];
      const at = (when, fn) => { const ms = (when - JP_LEAD - ctx.currentTime) * 1000; if (ms <= 4) fn(); else setTimeout(() => { if (ctx.currentTime < when + 0.05) fn(); }, ms); };
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
        at(tl, () => { noise(tl + 0.02, 1.1, { hp: 2600, vol: 0.045, sweepTo: 12000, type: "highpass" }); pad([48, 55, 60, 64, 67, 72], tl + 0.05, 2.8, 0.065, sfxBus); });
        at(tl + 0.78, () => [96, 100, 103, 108].forEach((m, i) => bell(m, tl + 0.78 + i * 0.07, { vol: 0.035, dur: 0.9, rev: 0.7 })));
      }
      A.music.duck([0.5, 0.38, 0.25][n - 1], [1300, 1900, 3200][n - 1]);
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
          gain = ctx.createGain(); gain.gain.value = 0; src.connect(hp).connect(lp).connect(gain).connect(sfxBus); src.start();
        }
        if (gain) gain.gain.setTargetAtTime(A.audio.sfxOn ? dens * 0.055 : 0, ctx.currentTime, dens ? 0.5 : 0.25);
      };
    })(),
    powerdown: go(t => { noise(t, 0.5, { lp: 4000, sweepTo: 90, vol: 0.08, type: "bandpass", q: 0.8 }); thump(t + 0.04, { vol: 0.32, f0: 90, f1: 26, dur: 0.45 }); const os = ctx.createOscillator(), g = ctx.createGain(); os.type = "sawtooth"; os.frequency.setValueAtTime(120, t); os.frequency.exponentialRampToValueAtTime(30, t + 0.45); os.connect(g).connect(sfxBus); env(g, t, 0.005, 0.05, 0.45); os.start(t); os.stop(t + 0.55); }),
    glass: go(t => { thump(t, { vol: 0.5, f0: 140, f1: 38, dur: 0.22 }); noise(t, 0.09, { hp: 1800, vol: 0.22 }); noise(t + 0.01, 0.35, { hp: 4500, vol: 0.07, sweepTo: 9000, type: "highpass" }); for (let i = 0; i < 9; i++) bell(96 + Math.round(Math.random() * 14), t + 0.02 + Math.random() * 0.32, { vol: 0.02 + Math.random() * 0.02, dur: 0.2 + Math.random() * 0.25, rev: 0.35 }); }),
    smear: go(t => { for (const [d, f0, f1] of [[0, 1100, 1500], [0.16, 1300, 950]]) { const os = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter(); os.type = "triangle"; os.frequency.setValueAtTime(f0, t + d); os.frequency.linearRampToValueAtTime(f1, t + d + 0.12); bp.type = "bandpass"; bp.frequency.value = 1400; bp.Q.value = 2; os.connect(bp).connect(g).connect(sfxBus); env(g, t + d, 0.01, 0.035, 0.12); os.start(t + d); os.stop(t + d + 0.2); } noise(t, 0.3, { lp: 2500, vol: 0.02, type: "bandpass", q: 1.5 }); }),
    ding: go(t => { bell(81, t, { vol: 0.09, dur: 0.6, rev: 0.25 }); bell(76, t + 0.09, { vol: 0.08, dur: 0.8, rev: 0.3 }); }),
    lowbat: go(t => { [0, 0.16].forEach((d, i) => { const os = ctx.createOscillator(), g = ctx.createGain(); os.type = "square"; os.frequency.value = i ? 660 : 880; os.connect(g).connect(sfxBus); env(g, t + d, 0.004, 0.035, 0.12); os.start(t + d); os.stop(t + d + 0.16); }); }),
    charge: go(t => { [72, 79, 84].forEach((m, i) => pluck(m, t + i * 0.07, { vol: 0.07, dur: 0.3, bright: 3, rev: 0.3 })); noise(t, 0.3, { hp: 800, sweepTo: 6000, vol: 0.025, type: "highpass" }); }),
    counter: go((t, k = 0) => { bell(88 + k * 3, t, { vol: 0.06, dur: 0.6, rev: 0.5 }); bell(95 + k * 3, t + 0.05, { vol: 0.04, dur: 0.8, rev: 0.6 }); noise(t, 0.25, { hp: 5000, sweepTo: 11000, vol: 0.025, type: "highpass" }); }),
    /* v0.36 marcador (js/marcador.js): el ticket sale del marcador (avance de papel, flojito), se arranca al pasar de pregunta,
       la barra toca la meta (la firma sol-do-re, rapida y una octava arriba) y cada escalon de botin (una moneda, mas aguda cada vez) */
    feed: go(t => { for (let i = 0; i < 5; i++) { noise(t + i * 0.05, 0.014, { hp: 2800 + i * 250, vol: 0.026 }); thump(t + i * 0.05, { vol: 0.035, f0: 520, f1: 260, dur: 0.025 }); } noise(t + 0.02, 0.26, { lp: 1800, sweepTo: 3600, vol: 0.02, type: "bandpass", q: 0.9 }); }),
    /* tanda 7: retos premium. Barrer el humo (un soplo), limpiar la lluvia (goma sobre cristal), la chincheta que cae del cielo (silbido y clavo)
       y las chispas de la lampara. Flojitos y nunca iguales */
    sweep: go((t, k = 0.5) => { noise(t, 0.32 + Math.random() * 0.14, { lp: 500 + k * 900, sweepTo: 1800 + Math.random() * 900, vol: 0.02 + k * 0.03, type: "bandpass", q: 0.8 }); }),
    wipe: go(t => { noise(t, 0.26, { lp: 700, sweepTo: 3200 + Math.random() * 600, vol: 0.05, type: "bandpass", q: 1.4 }); const os = ctx.createOscillator(), g = ctx.createGain(); os.type = "triangle"; os.frequency.setValueAtTime(820 + Math.random() * 120, t + 0.05); os.frequency.exponentialRampToValueAtTime(1250 + Math.random() * 150, t + 0.2); os.connect(g).connect(sfxBus); env(g, t + 0.05, 0.01, 0.018, 0.16); os.start(t + 0.05); os.stop(t + 0.3); }),
    /* v0.72: la chincheta suena al CLAVARSE (no mientras cae) como un tic de kalimba muy corto, en pentatonica y nunca igual; con decenas
       cayendo no se apilan: separacion minima entre tics y volumen que baja con el numero de chinchetas (k = su orden, n = cuantas caen) */
    pinFall: (() => { let last = -1; const PENTA = [72, 74, 76, 79, 81, 84, 86, 88]; return go((t, k = 0, n = 10) => {
      if (t - last < 0.09) return; last = t;
      const m = PENTA[Math.floor(Math.random() * PENTA.length)], v = 0.05 * Math.min(1, Math.sqrt(8 / Math.max(8, n)) * (0.8 + Math.random() * 0.4));
      pluck(m, t, { vol: v, dur: 0.16, bright: 2.5, rev: 0.35 }); noise(t, 0.02, { hp: 3200, vol: v * 0.22 });
    }); })(),
    /* tanda 8: el retumbar del terremoto, el latido del Pulso y una racha del Vendaval */
    ice: go(t => { [96, 103, 108].forEach((m, i) => bell(m + (Math.random() < 0.5 ? 0 : 2), t + i * 0.05, { vol: 0.03, dur: 0.5, rev: 0.6 })); noise(t, 0.2, { hp: 6000, sweepTo: 12000, vol: 0.02, type: "highpass" }); }),   // tanda 9: Sangre fria
    rumble: go((t, lv = 1) => { noise(t, 0.85, { lp: 150 + lv * 30, sweepTo: 55, vol: 0.08 + lv * 0.02 }); thump(t, { vol: 0.2, f0: 72, f1: 32, dur: 0.5 }); thump(t + 0.17 + Math.random() * 0.06, { vol: 0.11, f0: 60, f1: 30, dur: 0.4 }); }),
    heart: go(t => { thump(t, { vol: 0.06, f0: 64 + Math.random() * 6, f1: 40, dur: 0.12 }); thump(t + 0.19, { vol: 0.045, f0: 58, f1: 38, dur: 0.12 }); }),
    gust: go(t => { noise(t, 0.9 + Math.random() * 0.4, { lp: 260 + Math.random() * 120, sweepTo: 900 + Math.random() * 300, vol: 0.03, type: "bandpass", q: 0.6 }); }),
    spark: go(t => { for (let i = 0; i < 5; i++) noise(t + i * 0.022 + Math.random() * 0.02, 0.012, { hp: 3800 + Math.random() * 2000, vol: 0.035 + Math.random() * 0.02 }); }),
    tear: go(t => { noise(t, 0.13, { lp: 1100, sweepTo: 5600, vol: 0.075, type: "bandpass", q: 1.3 }); for (let i = 0; i < 6; i++) noise(t + 0.008 + i * 0.016 + Math.random() * 0.006, 0.009, { hp: 3800, vol: 0.045 }); thump(t, { vol: 0.06, f0: 240, f1: 120, dur: 0.05 }); }),
    /* tanda 14: panel de salidas, bandera de espaldas, puzle y pasaporte falso (flojitos y nunca iguales) */
    flapRoll: go((t, n = 1) => { const k = Math.min(4, 1 + (n > 6 ? 2 : n > 2 ? 1 : 0)); for (let i = 0; i < k; i++) noise(t + i * (0.008 + Math.random() * 0.016), 0.006, { hp: 2400 + Math.random() * 2600, vol: 0.011 + Math.random() * 0.008 }); }),
    flapSet: go((t, n = 1) => { const f = 300 + Math.random() * 90; thump(t, { vol: 0.045, f0: f, f1: f * 0.38, dur: 0.045 }); noise(t, 0.012, { hp: 3200 + Math.random() * 1500, vol: 0.03 }); if (n > 1) noise(t + 0.02, 0.01, { hp: 3800, vol: 0.02 }); }),
    boardDone: go(t => { const b = 84 + Math.floor(Math.random() * 3) * 2; bell(b, t, { vol: 0.05, dur: 0.7, rev: 0.5 }); bell(b - 4, t + 0.2, { vol: 0.045, dur: 0.9, rev: 0.55 }); }),
    flagFlip: go(t => { noise(t, 0.18 + Math.random() * 0.06, { lp: 700 + Math.random() * 300, sweepTo: 3600, vol: 0.05, type: "bandpass", q: 1 }); thump(t + 0.17, { vol: 0.07, f0: 220 + Math.random() * 40, f1: 90, dur: 0.07 }); }),
    sealPop: go(t => { thump(t, { vol: 0.12, f0: 150, f1: 60, dur: 0.09 }); noise(t, 0.02, { hp: 3000, vol: 0.04 }); pluck(88 + Math.floor(Math.random() * 3), t + 0.02, { vol: 0.04, dur: 0.14, bright: 3, rev: 0.2 }); }),
    puzzleDeal: go(t => { for (let i = 0; i < 6; i++) { noise(t + i * 0.045 + Math.random() * 0.02, 0.012, { hp: 1800 + Math.random() * 1200, vol: 0.03 }); thump(t + i * 0.045, { vol: 0.03, f0: 360, f1: 200, dur: 0.03 }); } }),
    puzzleSnap: go((t, left = 1) => { const m = 84 + Math.floor(Math.random() * 4) * 2; thump(t, { vol: 0.09, f0: 330, f1: 120, dur: 0.06 }); noise(t, 0.015, { hp: 2800, vol: 0.04 }); bell(m, t + 0.02, { vol: 0.045, dur: 0.35, rev: 0.4 }); if (left <= 2) bell(m + 7, t + 0.09, { vol: 0.04, dur: 0.5, rev: 0.45 }); }),
    passStamp: go(t => { thump(t, { vol: 0.12, f0: 150, f1: 48, dur: 0.12 }); noise(t, 0.05, { lp: 1500 + Math.random() * 500, vol: 0.05 }); }),
    passFalse: go(t => { thump(t, { vol: 0.34, f0: 130, f1: 34, dur: 0.22 }); noise(t, 0.1, { lp: 1800, vol: 0.12 }); bell(52 + Math.floor(Math.random() * 3), t + 0.03, { vol: 0.05, dur: 0.6, rev: 0.4 }); }),
    /* tanda 15: Ctrl+Z, Noche de tormenta, Pregunta trampa y Gigantes y enanos (flojitos y nunca iguales) */
    zUndo: go(t => { const f = 180 + Math.random() * 50; thump(t, { vol: 0.07, f0: f, f1: f * 0.5, dur: 0.05 }); noise(t, 0.012, { hp: 3400, vol: 0.035 }); noise(t + 0.04, 0.26, { lp: 3000 + Math.random() * 600, sweepTo: 420, vol: 0.04, type: "bandpass", q: 1.1 }); thump(t + 0.3, { vol: 0.05, f0: f * 1.2, f1: f * 0.6, dur: 0.045 }); noise(t + 0.3, 0.01, { hp: 4200, vol: 0.03 }); }),
    nightBang: go((t, kind = "strike", soft = false) => {
      const d = 0.08 + Math.random() * 0.4;
      if (kind === "sheet") { noise(t + d, 0.9 + Math.random() * 0.5, { lp: 300 + Math.random() * 120, sweepTo: 55, vol: 0.04 }); thump(t + d + 0.05, { vol: 0.07, f0: 56 + Math.random() * 10, f1: 30, dur: 0.5 }); return; }
      if (!soft) noise(t, 0.05, { hp: 3500, vol: 0.05 });
      noise(t + d, 0.8 + Math.random() * 0.5, { lp: 600 + Math.random() * 250, sweepTo: 70, vol: 0.07 }); thump(t + d + 0.02, { vol: 0.16, f0: 62 + Math.random() * 14, f1: 28, dur: 0.5 });
    }),
    trapStamp: go(t => { thump(t, { vol: 0.2, f0: 150, f1: 46, dur: 0.14 }); noise(t, 0.04, { lp: 1600, vol: 0.08 }); const b = 46 + Math.floor(Math.random() * 3); bell(b, t + 0.03, { vol: 0.06, dur: 0.7, rev: 0.4 }); bell(b + 6, t + 0.09, { vol: 0.045, dur: 0.6, rev: 0.4 }); }),
    giantGrow: go((t, up = true) => { noise(t, 0.5, { lp: up ? 220 : 1500, sweepTo: up ? 1500 : 220, vol: 0.05, type: "bandpass", q: 0.9 }); thump(t + 0.05, { vol: 0.1, f0: up ? 70 : 110, f1: up ? 110 : 55, dur: 0.35 }); pluck((up ? 60 : 72) + Math.floor(Math.random() * 3) * 2, t + 0.1, { vol: 0.04, dur: 0.3, rev: 0.3 }); }),
    /* tanda 16: jefes con identidad (flojitos y nunca iguales): subir de tono, la siesta, el salvapantallas, el pantallazo azul, el album, la rueda y la banca */
    bossRise: go((t, q = 1) => { const k = Math.min(4, q); thump(t, { vol: 0.1 + 0.035 * k, f0: 88 + k * 7, f1: 34, dur: 0.3 }); noise(t, 0.3 + 0.07 * k, { lp: 280 + k * 240, sweepTo: 1500 + k * 800, vol: 0.026 + 0.008 * k, type: "bandpass", q: 1 }); [0, 7, 12, 19].slice(0, 1 + Math.ceil(k / 2)).forEach((st, i) => bell(58 + k * 2 + st, t + 0.05 + i * 0.06, { vol: 0.03 + 0.005 * k, dur: 0.5, rev: 0.4 })); }),
    napOn: go(t => { [0, 0.55].forEach((d, i) => { noise(t + d, 0.45, { lp: 380 - i * 60, sweepTo: 160, vol: 0.03, type: "bandpass", q: 0.7 }); pluck(50 - i * 2, t + d + 0.05, { vol: 0.035, dur: 0.5, rev: 0.4 }); }); }),
    napStir: go((t, l = 1) => { noise(t, 0.2, { lp: 500 + l * 300, sweepTo: 200, vol: 0.03 + l * 0.01, type: "bandpass", q: 0.9 }); thump(t, { vol: 0.05 + l * 0.02, f0: 70, f1: 40, dur: 0.12 }); }),
    napWake: go(t => { thump(t, { vol: 0.32, f0: 130, f1: 34, dur: 0.22 }); noise(t, 0.07, { hp: 2400, vol: 0.08 }); bell(52, t + 0.02, { vol: 0.07, dur: 0.7, rev: 0.4 }); bell(58, t + 0.05, { vol: 0.05, dur: 0.8, rev: 0.4 }); }),
    ssOn: go(t => { noise(t, 0.5, { lp: 3000, sweepTo: 300, vol: 0.04, type: "bandpass", q: 0.8 }); pluck(70, t + 0.1, { vol: 0.03, dur: 0.4, rev: 0.4 }); pluck(63, t + 0.3, { vol: 0.03, dur: 0.5, rev: 0.4 }); }),
    ssBounce: go(t => { pluck(88 + Math.floor(Math.random() * 4) * 2, t, { vol: 0.02, dur: 0.1, bright: 3, rev: 0.1 }); }),
    ssWake: go(t => { noise(t, 0.2, { lp: 400, sweepTo: 4000, vol: 0.035, type: "bandpass", q: 1 }); pluck(84, t + 0.05, { vol: 0.04, dur: 0.2, rev: 0.2 }); }),
    bsodOn: go(t => { noise(t, 0.04, { hp: 3000, vol: 0.06 }); thump(t, { vol: 0.2, f0: 120, f1: 50, dur: 0.15 }); const os = ctx.createOscillator(), g = ctx.createGain(); os.type = "square"; os.frequency.setValueAtTime(440, t + 0.05); os.connect(g).connect(sfxBus); env(g, t + 0.05, 0.005, 0.02, 0.16); os.start(t + 0.05); os.stop(t + 0.3); }),
    albumStamp: go((t, q = 0) => { thump(t, { vol: 0.2, f0: 150, f1: 46, dur: 0.14 }); noise(t, 0.04, { lp: 1600, vol: 0.08 }); bell(58 + q * 2, t + 0.03, { vol: 0.05, dur: 0.6, rev: 0.4 }); pluck(84 + q * 2, t + 0.12, { vol: 0.04, dur: 0.3, rev: 0.3 }); }),
    wheelTick: go((t, a = 0.5) => { pluck(90 + Math.round(a * 6), t, { vol: 0.025, dur: 0.05, bright: 3, rev: 0.05 }); noise(t, 0.008, { hp: 4000, vol: 0.02 }); }),
    wheelLand: go(t => { thump(t, { vol: 0.14, f0: 160, f1: 60, dur: 0.1 }); bell(84, t, { vol: 0.06, dur: 0.7, rev: 0.4 }); bell(91, t + 0.07, { vol: 0.05, dur: 0.9, rev: 0.5 }); }),
    bankPin: go(t => { thump(t, { vol: 0.12, f0: 340, f1: 130, dur: 0.05 }); bell(88, t + 0.02, { vol: 0.06, dur: 0.5, rev: 0.4 }); bell(95, t + 0.1, { vol: 0.05, dur: 0.7, rev: 0.4 }); }),
    goal: go(t => {
      thump(t, { vol: 0.26, f0: 150, f1: 48, dur: 0.18 }); noise(t, 0.05, { hp: 2600, vol: 0.06 });
      MOTIF.forEach((m, i) => { pluck(m + 12, t + 0.02 + i * 0.075, { vol: 0.13, dur: 0.75, rev: 0.5 }); bell(m + 24, t + 0.02 + i * 0.075, { vol: 0.03, dur: 0.3, rev: 0.3 }); });
      bell(91, t + 0.2, { vol: 0.07, dur: 1.2, rev: 0.6 }); bell(98, t + 0.26, { vol: 0.04, dur: 1, rev: 0.6 });
      noise(t + 0.16, 0.5, { hp: 4500, vol: 0.028, sweepTo: 12000, type: "highpass" }); A.music.duck(0.5, 1000);
    }),
    lootStep: go((t, k = 1) => {
      const n = scaleNote(5 + Math.min(4, Math.max(1, k)), 60) + 12;
      bell(n, t, { vol: 0.08, dur: 0.4, rev: 0.3 }); bell(n + 7, t + 0.05, { vol: 0.06, dur: 0.6, rev: 0.35 }); noise(t, 0.012, { hp: 6000, vol: 0.05 });
      for (let i = 0; i < 1 + k; i++) bell(n + 12 + (i % 2) * 5, t + 0.09 + i * 0.045, { vol: 0.025, dur: 0.18, rev: 0.25 });
    }),
    /* v0.37 tu nombre (js/nombre.js): la sala se apaga (rele, golpe del interruptor general y la luz que cae) y se enciende el foco (clonc
       metalico y el zumbido del filamento); cada tecla es una ficha que sube por la pentatonica; al firmar, el sello y la firma sol-do-re */
    spot: go(t => {
      [0, 0.045].forEach(d => noise(t + d, 0.018, { hp: 3400, vol: 0.06 })); thump(t + 0.05, { vol: 0.34, f0: 92, f1: 30, dur: 0.42 });
      noise(t + 0.05, 0.75, { lp: 2600, sweepTo: 150, vol: 0.05, type: "bandpass", q: 0.9 });
      thump(t + 0.56, { vol: 0.26, f0: 190, f1: 64, dur: 0.1 }); noise(t + 0.56, 0.035, { hp: 2600, vol: 0.09 }); bell(69, t + 0.58, { vol: 0.045, dur: 1, rev: 0.6 });
      noise(t + 0.6, 1.3, { hp: 4800, vol: 0.016, sweepTo: 8800, type: "highpass" }); A.music.duck(0.35, 2600);
    }),
    key: go((t, k = 0) => {
      if (k < 0) { pluck(55, t, { vol: 0.06, dur: 0.12, bright: 2, rev: 0.05 }); noise(t, 0.02, { lp: 1400, vol: 0.04 }); return; }   // borrar: mas grave y apagado
      pluck(scaleNote(3 + Math.min(k, 19), 60), t, { vol: 0.055, dur: 0.12, bright: 4, rev: 0.1 }); noise(t, 0.012, { hp: 4200, vol: 0.035 }); thump(t, { vol: 0.05, f0: 420, f1: 190, dur: 0.03 });
    }),
    sign: go(t => {
      thump(t, { vol: 0.44, f0: 128, f1: 32, dur: 0.32 }); noise(t, 0.11, { lp: 1700, vol: 0.13 });
      MOTIF.forEach((m, i) => { pluck(m + 12, t + 0.14 + i * 0.1, { vol: 0.14, dur: 1.1, rev: 0.6 }); bell(m + 24, t + 0.14 + i * 0.1, { vol: 0.03, dur: 0.4, rev: 0.4 }); });
      [84, 88, 91, 96, 100].forEach((m, i) => bell(m, t + 0.46 + i * 0.055, { vol: 0.045, dur: 1.2, rev: 0.65 }));
      noise(t + 0.4, 0.7, { hp: 5000, vol: 0.025, sweepTo: 12000, type: "highpass" }); A.music.duck(0.4, 2000);
    }),
  };
  /* el motor de sonido (abrir el dispositivo de audio y preparar la reverb: ~50 ms de golpe) se monta ya, detras de la pantalla de carga.
     Antes se montaba con el primer sonido (la intro del estudio o el primer clic) y ese fotograma se quedaba parado. Sin gesto del jugador
     el navegador lo deja en pausa: init() lo reanuda con el primer clic, como siempre */
  init();
})(window.AIQ);
