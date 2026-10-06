/* Lluvia de fichas - maqueta jugable. Todo el movimiento va por transform con enteros (multiplos de 4: la rejilla nativa x4); el arte se escala x4 sin suavizar.
   El resultado se decide ANTES con core.js (generador sembrado); la animacion solo sigue ese camino. El azar de la presentacion es aparte (Math.random). */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const C = window.PLK_CORE, TAB = window.PLK_TAB, NR = C.R, NC = C.COLS, G = "../../../assets/icons/", K = 4;
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), easeOut = p => 1 - Math.pow(1 - p, 3);
  const vr = Math.random, ri = (a, b) => a + Math.floor(vr() * (b - a + 1)), pick = a => a[Math.floor(vr() * a.length)];
  const ST = { stake: 5, risk: 1, col: 5, lang: "es", reduce: false, sound: true, bal: 100, busy: false, phase: "idle", row: -1, ts: 1, forced: { pres: "", slot: "", decor: "" }, hist: [], res: null, presIdx: -1, decor: "petroleo", lastSlot: -1 };
  try { const b = +localStorage.getItem("plk_bal"); if (b > 0) ST.bal = b; } catch (e) {}

  /* geometria en px de pantalla, relativa al tablero (214x220 nativos x4) */
  const PX = p => (17 + 9 * p) * K, PY = r => (34 + 13 * r) * K, REST = 40, CHUTE_Y = 52, SLOT_Y = 776, WALLX = [8 * K + 24, 206 * K - 24];
  const BX = 532, BY = 110;
  const fm = (t, lang) => { const v = t % 10 === 0 ? String(t / 10) : (t / 10).toFixed(1); return (lang || ST.lang) === "es" ? v.replace(".", ",") : v; };
  const tier = t => (t === 0 ? 0 : t < 10 ? 1 : t < 50 ? 2 : t < 250 ? 3 : 4);
  const PAY = (r, c) => TAB.pay[r][c];

  /* ------------------------------------------------------------------ textos (es / en; en el juego, los 12 idiomas) */
  const PRES = [
    ["clasica", "Caída limpia", "Clean drop", "Cadencia pareja, sin adornos: la referencia.", "Even cadence, no frills: the baseline."],
    ["equilibrio", "En equilibrio", "Balancing act", "La ficha se queda quieta sobre una clavija, tiembla y por fin se decide.", "The chip stalls on a peg, trembles, and finally commits."],
    ["doble", "Doble salto", "Double hop", "Salta dos filas de golpe rozando la clavija intermedia.", "Skips two rows at once, grazing the peg in between."],
    ["carambola", "Carambola", "Carom shot", "Sale disparada hasta la pared lateral y vuelve al tablero.", "Shoots out to the side wall and comes back to the board."],
    ["giro", "Lanzada con giro", "Spinning toss", "El crupier la lanza al aire: la doblón gira y cae por la tolva.", "The dealer flips it: the doubloon spins and drops through the chute."],
    ["camara", "Cámara lenta", "Slow motion", "Las últimas filas a cámara lenta (siempre las mismas: sin pistas).", "The last rows in slow motion (always the same rows: no hints)."],
    ["lluvia", "Lluvia de fichas", "Chip rain", "Fichas fantasma caen a su aire por el tablero; la tuya brilla.", "Ghost chips tumble through the board; yours is the bright one."],
    ["destellos", "Falsos destellos", "False flashes", "Casillas que se encienden antes de tiempo sin significar nada.", "Slots that light up early and mean nothing."],
    ["luces", "Pasillo de luces", "Light corridor", "Una ola de luz recorre las clavijas antes de soltar.", "A wave of light runs through the pegs before the drop."],
    ["pesada", "Ficha pesada", "Heavy chip", "Golpes secos, tablero que vibra con cada clavija.", "Dull thuds, the board rattles on every peg."],
    ["ligera", "Ficha ligera", "Light chip", "Rebotes altos y flotantes, caída más lenta.", "High floaty bounces, a slower fall."],
  ];
  const DECORS = [["petroleo", "Petróleo y oro", "Petrol & gold"], ["noche", "Noche con luces", "Night lights"], ["marmol", "Mármol y oro", "Marble & gold"], ["rubi", "Rubí", "Ruby"]];
  const T = {
    es: { risk: ["Seguro", "Equilibrado", "Arriesgado"], labs: ["RIESGO", "FICHA", "COLUMNA DE SALIDA"], go: "Soltar", pill: "Lluvia de fichas · ficha", no: "NO VA MÁS", bal: "BOLSA", chip: "FICHA", maxl: "MÁXIMO",
      hint: { start: "Elige y suelta", fall: "Sigue la ficha…", lose: "", done: "" }, net: n => (n > 0 ? "+" + n : n < 0 ? "−" + -n : "±0"), col: "col.", reach: "alcanzable", pres: "presentación", of: "de", dec: "decorado",
      card: { n: "Lluvia de fichas", s: "Suelta la ficha y mira dónde cae. Tú eliges el riesgo.", play: "Jugar", coin: "Moneda al aire", coinS: "Acierta y cobras el doble de lo apostado.", heads: "Cara", tails: "Cruz", red: "Rojo o negro", redS: "Acierta el color. El verde salta el acto.", redB: "Rojo", blackB: "Negro", greenB: "Verde", wheel: "Ruleta de premios", wheelS: "Premios buenos y malos. Gira y arriésgate.", spin: "Girar" },
      say: {
        drop: ["Que ruede, que ruede… y que ruede hacia mi bolsillo.", "Cada clavija es un peaje pequeño. Yo cobro todos.", "La gravedad no cree en la suerte. Yo tampoco.", "Tranquilo: la ficha sabe adónde va. Yo, por si acaso, también.", "Escucha: cada golpe es una nota. La ficha es mi pianista.", "Esto no es azar. Es física con mala leche."],
        fall: ["Mira cómo baila. Casi da pena.", "¡Ay, esa clavija! Siempre mete la pata.", "Yo no empujo. Solo carraspeo.", "Va bien. Demasiado bien. Qué sospechoso.", "Cada clavija la he afinado yo. Perdón por el re.", "Respira, que la ficha se asusta."],
        zero: ["Cero. Un círculo perfecto, como mi sonrisa.", "La ficha ha decidido jubilarse. Sin pensión.", "Esa casilla la pone la casa. Con cariño.", "Cero. Te lo dije… bueno, no, pero lo pensé.", "Ni el eco devuelve nada. Tranquilo, es normal.", "Qué limpio: cero y sin rozaduras."],
        low: ["Algo es algo. Medio algo, en concreto.", "Te devuelvo el cambio, que no se diga que soy tacaño.", "Pierdes poco. Eso se llama estilo.", "El consuelo de la casa: calderilla.", "Casi llegas a tablas. Casi.", "Perder despacio también es un arte."],
        ok: ["Recuperas lo tuyo. Qué conformista.", "Un premio discreto, como mi propina.", "Ni fu ni fa. Ni mal para empezar la noche.", "Ganar poco es ganar. Aunque duela decirlo.", "Te toca. Ni me lo creo.", "Cobras. Apunta la fecha."],
        big: ["¡Eso no estaba en mis cálculos!", "Vaya racha. Revisaré las clavijas.", "Una buena. Otra y llamo al sindicato.", "Cobra, cobra, que se me caen las canas.", "Mira el marcador y piensa en mi sueldo.", "Premio gordo. Qué mala suerte… la mía."],
        max: ["¡NO! ¡La esquina! ¡Nadie cae en la esquina!", "Máximo premio. Necesito un minuto. Y un tapón para los oídos.", "Esto es un fallo del tablero. Pido revisión.", "¿Me dejas respirar? Es mi bolsillo el que sufre.", "Casino cerrado por duelo. Vuelvo en cinco minutos.", "La estadística acaba de pedirme perdón."],
        near: ["Uf, a un carril del premio. Qué cruel soy.", "Casi. Esa palabra me da de comer.", "Mira el hueco de al lado… ahí estaba tu fortuna.", "Una clavija más y me arruinas. Lástima.", "A un suspiro del máximo. Yo suspiré por ti.", "Lo normal en la esquina: se acerca y se arrepiente."],
        center: ["Otra vez al centro. Eres de buen camino.", "El centro te quiere. A mí también: ahí cobro.", "Tres seguidas en medio. La física te aprecia.", "Siempre al medio: eso se llama prudencia o pereza.", "Tu ficha tiene miedo a las esquinas. Lo entiendo.", "¿Y si probamos otra columna? Es una sugerencia, no una trampa."],
        slump: ["Tres sin premio. Te invito a un agua. Con hielo.", "Hoy las clavijas te riñen. No es personal.", "Racha negra. Las mías son azul petróleo.", "La suerte vuelve… a mis manos.", "Sube el riesgo, dicen. Yo solo lo cobro.", "Respira. Llevas tres. La cuarta es la vencida… o no."],
        edge: ["¿Al borde? Qué valiente… o qué mal pensado.", "Desde la esquina el premio es pequeño, pero frecuente.", "La pared escucha bien. Rebotará tu ficha.", "Elegiste el borde. Respeto. Y cobro.", "Esa pared ha visto cosas. Quizá cobre también.", "Cuidado con el rebote: la pared no tiene paciencia."],
      } },
    en: { risk: ["Safe", "Balanced", "Risky"], labs: ["RISK", "STAKE", "DROP COLUMN"], go: "Drop", pill: "Chip rain · stake", no: "NO MORE BETS", bal: "PURSE", chip: "STAKE", maxl: "MAX",
      hint: { start: "Choose and drop", fall: "Follow the chip…", lose: "", done: "" }, net: n => (n > 0 ? "+" + n : n < 0 ? "−" + -n : "±0"), col: "col.", reach: "reachable", pres: "presentation", of: "of", dec: "decor",
      card: { n: "Chip rain", s: "Drop the chip and watch it fall. You pick the risk.", play: "Play", coin: "Coin flip", coinS: "Call it right and win double your stake.", heads: "Heads", tails: "Tails", red: "Red or black", redS: "Call the colour. Green skips the act.", redB: "Red", blackB: "Black", greenB: "Green", wheel: "Prize wheel", wheelS: "Good prizes and bad ones. Spin and risk it.", spin: "Spin" },
      say: {
        drop: ["Roll, roll… and roll into my pocket.", "Every peg is a small toll. I collect them all.", "Gravity doesn't believe in luck. Neither do I.", "Relax: the chip knows where it's going. So do I, just in case.", "Listen: every knock is a note. The chip is my pianist.", "This isn't chance. It's physics with a mean streak."],
        fall: ["Look at it dance. Almost sad.", "Oh, that peg! Always putting its foot in it.", "I'm not pushing. Just clearing my throat.", "Going well. Too well. Suspicious.", "I tuned every peg myself. Sorry about the D.", "Breathe, you'll scare the chip."],
        zero: ["Zero. A perfect circle, like my smile.", "The chip decided to retire. No pension.", "That slot is on the house. With love.", "Zero. I told you… well, no, but I thought it.", "Not even the echo pays back. Perfectly normal.", "So clean: zero, not a scratch."],
        low: ["Something is something. Half of something, anyway.", "Here's your change, can't call me stingy.", "You lose little. That's called style.", "The house's consolation: pocket change.", "Almost a draw. Almost.", "Losing slowly is also an art."],
        ok: ["You get your money back. How modest.", "A discreet prize, like my tip.", "Meh. Not bad to start the night.", "Winning small is winning. It hurts to say.", "Your turn. I don't believe it either.", "You collect. Mark the date."],
        big: ["That was not in my calculations!", "What a streak. I'll check the pegs.", "A good one. One more and I call the union.", "Collect, collect, my hair is going grey.", "Look at the board and think of my salary.", "Big prize. Such bad luck… mine."],
        max: ["NO! The corner! Nobody lands in the corner!", "Top prize. I need a minute. And earplugs.", "This is a board malfunction. I request a review.", "Let me breathe? It's my pocket that suffers.", "Casino closed for mourning. Back in five.", "Statistics just apologised to me."],
        near: ["Phew, one lane from the prize. How cruel of me.", "Almost. That word feeds me.", "Look at the gap next door… your fortune was there.", "One more peg and you'd have ruined me. Pity.", "One breath from the top. I sighed for you.", "Typical corner: it approaches and regrets it."],
        center: ["Middle again. You're on the straight path.", "The middle loves you. Me too: that's where I collect.", "Three in a row in the middle. Physics likes you.", "Always the middle: that's prudence or laziness.", "Your chip fears the corners. I understand.", "How about another column? A suggestion, not a trap."],
        slump: ["Three without a prize. Let me buy you a water. With ice.", "The pegs are scolding you today. Nothing personal.", "A black streak. Mine are petrol blue.", "Luck comes back… to my hands.", "Raise the risk, they say. I only cash it.", "Breathe. That's three. The fourth is the charm… or not."],
        edge: ["The edge? So brave… or so suspicious.", "From the corner the prize is small, but frequent.", "The wall is a good listener. It will bounce your chip.", "You chose the edge. Respect. And I collect.", "That wall has seen things. Maybe it collects too.", "Mind the bounce: the wall has no patience."],
      } },
  };
  const FACE = { drop: ["neutral", "laugh"], fall: ["neutral", "shock"], zero: ["laugh"], low: ["laugh", "neutral"], ok: ["neutral", "shock"], big: ["angry", "shock"], max: ["shock", "angry"], near: ["laugh"], center: ["neutral", "laugh"], slump: ["laugh"], edge: ["neutral", "shock"] };
  const GEST = { drop: ["nod", "tilt"], fall: ["tilt", "lean"], zero: ["jump", "nod"], low: ["nod", "tilt"], ok: ["tilt", "nod"], big: ["shiver", "jump"], max: ["shiver", "jump"], near: ["lean", "tilt"], center: ["nod", "lean"], slump: ["tilt", "nod"], edge: ["lean", "tilt"] };
  const SIT_NAME = { drop: "al soltar (según la columna)", fall: "durante la caída", zero: "casilla ×0", low: "premio < ×1", ok: "premio ×1 a <×5 (nivel 1)", big: "premio ≥ ×5 (nivel 2-3)", max: "el máximo de la tabla", near: "casi al máximo (la casilla de al lado)", center: "tres seguidas en las casillas centrales", slump: "tres sin recuperar la ficha", edge: "columna del borde" };
  const tx = () => T[ST.lang], L = () => (ST.lang === "es" ? 1 : 2);

  /* ------------------------------------------------------------------ el carrete: sin repetir las 2 ultimas y con mas peso a las menos vistas (como reelPick del juego) */
  const REEL = { pres: { seen: {}, last: [] }, decor: { seen: {}, last: [] } };
  try { Object.assign(REEL, JSON.parse(localStorage.getItem("plk_reel") || "{}")); } catch (e) {}
  function reelPick(key, ids) {
    const R = REEL[key], pool = ids.filter(id => !R.last.includes(id)), min = Math.min(...pool.map(id => R.seen[id] || 0)), w = pool.map(id => 1 / (1 + (R.seen[id] || 0) - min));
    let x = vr() * w.reduce((a, b) => a + b, 0), i = 0; while (i < pool.length - 1 && x >= w[i]) x -= w[i++];
    const id = pool[i]; R.seen[id] = (R.seen[id] || 0) + 1; R.last = [id, ...R.last].slice(0, 2); try { localStorage.setItem("plk_reel", JSON.stringify(REEL)); } catch (e) {} return id;
  }

  /* ------------------------------------------------------------------ las cuatro cartas de la Barra (HTML del juego) */
  function cards() {
    const t = tx().card, cn = `<img class="ic ic-coin cn" src="${G}coin.webp" alt="" draggable="false">`, ico = (id, src) => `<span class="sp-ic"><img class="ic ic-${id}" src="${src || G + id + ".webp"}" alt="" draggable="false"></span>`;
    $("#plCards").innerHTML =
      `<div class="sup bet cas bt-red">${ico("bet_red")}<span class="sp-t"><b>${t.red}</b><i>${t.redS}</i></span><span class="bt-pick"><button class="bt-c bt-cr" type="button">${t.redB}</button><button class="bt-c bt-cb" type="button">${t.blackB}</button><button class="bt-c bt-cg" type="button">${t.greenB}</button><em class="sp-p">${cn}2</em></span></div>` +
      `<div class="sup bet cas bt-coin">${ico("bet_coin")}<span class="sp-t"><b>${t.coin}</b><i>${t.coinS}</i></span><span class="bt-pick"><button class="bt-c bt-ch" type="button">${t.heads}</button><button class="bt-c bt-ct" type="button">${t.tails}</button><em class="sp-p bt-stake">${cn}2</em></span></div>` +
      `<div class="sup bet cas bt-wheel">${ico("bet_wheel")}<span class="sp-t"><b>${t.wheel}</b><i>${t.wheelS}</i></span><span class="bt-pick"><button class="bt-c bt-cs" type="button">${t.spin}</button><em class="sp-p">${cn}4</em></span></div>` +
      `<div class="sup bet cas bt-plk" id="plCardPlk">${ico("bet_plinko", "out/bet_plinko.webp")}<span class="sp-t"><b>${t.n}</b><i>${t.s}</i></span><span class="bt-pick"><button class="bt-c bt-pl" type="button" id="plCardPlay">${t.play}</button><em class="sp-p bt-stake">${cn}<span id="plCardStake">${ST.stake}</span></em></span></div>`;
    $("#plCardPlay").onclick = () => { $("#plWrap").scrollIntoView({ behavior: "smooth", block: "center" }); play(); };
  }

  /* ------------------------------------------------------------------ escenario */
  const stage = $("#plStage"), wrap = $("#plWrap"), board = $("#plBoard"), fx = $("#plFx");
  function fit() { const s = wrap.clientWidth / 1920, tf = `scale(${s})`; stage.style.transform = tf; stage.style.setProperty("--tf", tf); }
  addEventListener("resize", fit); document.addEventListener("fullscreenchange", () => setTimeout(fit, 60));
  const mk = (cls, parent, html) => { const d = document.createElement("div"); d.className = cls; if (html) d.innerHTML = html; (parent || fx).appendChild(d); return d; };

  const pegs = {}, halos = [], trails = [], ghosts = [], slots = [], notches = [];
  { const L0 = $("#plPegs"); for (let r = 0; r < NR; r++) for (let p = r % 2; p <= 20; p += 2) { const e = mk("pg", L0); e.style.transform = `translate3d(${PX(p) - 16}px,${PY(r) - 16}px,0)`; pegs[r * 21 + p] = e; } }
  for (let j = 0; j < NC; j++) { const n = mk("pl-notch", $("#plNotches"), `<span>${j + 1}</span>`); n.style.left = (PX(2 * j) - 36) + "px"; n.onclick = () => setCol(j); notches.push(n); }
  for (let j = 0; j < NC; j++) { const s = mk("pl-slot", $("#plSlots")); s.style.left = ((17 + 18 * j - 8) * K) + "px"; slots.push(s); }
  for (let i = 0; i < 7; i++) halos.push(mk("pl-halo"));
  const wallEl = [mk("pl-wall l"), mk("pl-wall r")];
  const TR = 9; for (let i = 0; i < TR; i++) { const t = mk("pl-trail"); t.style.backgroundPositionX = -(i < 4 ? 0 : i < 7 ? 1 : 2) * 24 + "px"; trails.push(t); }
  const chipEl = mk("pl-chip"), spinEl = mk("pl-spin", stage); spinEl.style.left = "0"; spinEl.style.top = "0";
  let cx = 0, cy = 0, haloN = 0, trailHist = [], chipF = 0;
  function setFrame(f) { if (f !== chipF) { chipF = f; chipEl.style.backgroundPositionX = -f * 48 + "px"; } }
  function place(x, y) {
    x = Math.round(x / K) * K; y = Math.round(y / K) * K; if (x === cx && y === cy) return; cx = x; cy = y;
    chipEl.style.transform = `translate3d(${x - 24}px,${y - 24}px,0)`;
    trailHist.unshift(x, y); if (trailHist.length > (TR * 2 + 2) * 2) trailHist.length = (TR * 2 + 2) * 2;
    for (let i = 0; i < TR; i++) { const k = Math.min((trailHist.length >> 1) - 1, (i + 1) * 2) * 2, t = trails[i]; t.style.transform = `translate3d(${trailHist[k] - 12}px,${trailHist[k + 1] - 12}px,0)`; t.style.opacity = ST.reduce ? 0 : 1 - i / (TR + 2); }
  }
  const trailOff = () => { trailHist.length = 0; trails.forEach(t => (t.style.opacity = 0)); };
  const chipShow = v => { chipEl.style.display = v ? "block" : "none"; if (!v) trailOff(); };
  const run = (dur, fn) => new Promise(res => { dur = Math.max(30, dur * ST.ts * (ST.reduce ? 0.6 : 1)); let t0 = performance.now(), last = t0; const f = now => { if (ST.paused) { t0 += now - last; last = now; requestAnimationFrame(f); return; } last = now; const p = clamp((now - t0) / dur, 0, 1); fn(p); if (ST.pauseRow != null && ST.row >= ST.pauseRow && p >= ST.pauseAt) { ST.paused = true; ST.pauseRow = null; } p < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });   // ST.paused: solo para las capturas de prueba

  /* ------------------------------------------------------------------ sonido (WebAudio sencillo; en el juego, el motor de js/audio.js) */
  const AU = { ctx: null, init() { if (!ST.sound) return null; if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (this.ctx.state === "suspended") this.ctx.resume(); return this.ctx; } };
  const env = (g, t, a, v, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); };
  function tone(f0, f1, d, type, v, delay = 0) { const c = AU.init(); if (!c) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + d); env(g, t, 0.004, v, d); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05); }
  function noise(d, v, hp, delay = 0) { const c = AU.init(); if (!c) return; const t = c.currentTime + delay, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = "highpass"; f.frequency.value = hp; env(g, t, 0.003, v, d); s.connect(f).connect(g).connect(c.destination); s.start(t); }
  const PENTA = [0, 2, 4, 7, 9];                                     // pentatonica mayor: suene lo que suene, consuena
  let ROOT = 261.63; const nf = i => ROOT * Math.pow(2, (PENTA[i % 5] + 12 * Math.floor(i / 5)) / 12);
  let lastWin = -1;
  const sfx = {
    peg(i, soft) { const f = nf(i), v = soft ? 0.035 : 0.11; tone(f, f, 0.42, "sine", v); tone(f * 2, f * 2, 0.22, "triangle", v * 0.35); noise(0.02, soft ? 0.02 : 0.05, 3500); },
    wall() { tone(1800, 1500, 0.09, "square", 0.04); tone(420, 300, 0.14, "triangle", 0.1); noise(0.05, 0.07, 1800); },
    drop() { noise(0.2, 0.06, 900); tone(520, 180, 0.22, "triangle", 0.08); },
    bell() { tone(1568, 1568, 0.9, "sine", 0.06); tone(2093, 2093, 0.9, "sine", 0.035, 0.02); tone(120, 60, 0.2, "sine", 0.1); },
    land(i) { tone(150, 50, 0.22, "sine", 0.2); noise(0.07, 0.07, 1400); for (const k of [0, 2, 4]) tone(nf(i + k), nf(i + k), 0.6, "triangle", 0.06, 0.02); },
    lose() { tone(300, 110, 0.5, "sawtooth", 0.06); tone(200, 80, 0.55, "sine", 0.09, 0.08); },
    tick() { tone(1200, 1200, 0.03, "square", 0.015); },
    win(level) {
      let v; do v = ri(0, 2); while (v === lastWin); lastWin = v; const sc = [[0, 1, 2, 3], [0, 2, 3, 4], [1, 2, 4, 5]][v];
      if (level === 1) { sc.slice(0, 3).forEach((d, i) => tone(nf(d + 5), nf(d + 5), 0.5, "triangle", 0.1, i * 0.08)); }
      else if (level === 2) { sc.forEach((d, i) => { tone(nf(d + 7), nf(d + 7), 0.6, "triangle", 0.11, i * 0.075); tone(nf(d + 12), nf(d + 12), 0.5, "sine", 0.05, i * 0.075 + 0.03); }); noise(0.4, 0.05, 5000, 0.2); tone(130, 130, 0.9, "sawtooth", 0.04, 0.25); }
      else { for (let i = 0; i < 9; i++) { tone(nf(i * 1 + v + 4), nf(i + v + 4), 0.55, "triangle", 0.11, i * 0.07); } [0, 2, 4, 7].forEach(d => tone(nf(d + 10), nf(d + 10), 1.4, "sawtooth", 0.035, 0.6)); tone(90, 40, 0.8, "sine", 0.3, 0.55); noise(1.0, 0.06, 4000, 0.6); }
    },
    flash() { tone(1760, 1760, 0.12, "sine", 0.03); },
  };

  /* ------------------------------------------------------------------ voz del crupier (globo, caras, gestos); siempre 1 s mas en pantalla y nunca se le corta */
  let bubbleUntil = 0, bubbleT = 0; const LINGER = 1000;
  const setFace = f => { $("#plDealer").src = G + "dealer_" + f + ".webp"; };
  function gesture(g) { const d = $("#plDealer"); if (ST.reduce || !g) return; d.className = "pl-dealer"; void d.offsetWidth; d.className = "pl-dealer g-" + g; }
  async function say(sit, o = {}) {
    const lines = tx().say[sit], text = o.text || pick(lines);
    if (o.polite && performance.now() < bubbleUntil) return;
    while (performance.now() < bubbleUntil) await sleep(80);
    $("#plBubbleTx").textContent = text; $("#plBubble").classList.add("on"); setFace(o.face || pick(FACE[sit] || ["neutral"])); gesture(o.gest || pick(GEST[sit] || ["nod"]));
    const ms = 1800 + 22 * text.length + LINGER; bubbleUntil = performance.now() + ms; clearTimeout(bubbleT); bubbleT = setTimeout(() => { $("#plBubble").classList.remove("on"); }, ms);
    return text;
  }
  const hint = k => { const h = $("#plHint"); if (!k || !tx().hint[k]) { h.classList.remove("on"); return; } h.textContent = tx().hint[k]; h.classList.add("on"); };

  /* ------------------------------------------------------------------ pintado del estado: casillas, panel de mandos, bolsa, historial */
  const fmt = n => String(n);
  function renderSlots(anim) {
    const t = PAY(ST.risk, ST.col), cn = TAB.counts[ST.col];
    slots.forEach((s, j) => {
      const m = "t" + tier(t[j]), txt = "×" + fm(t[j]); s.className = "pl-slot " + m + (txt.length > 4 ? " s3" : "") + (cn[j] ? "" : " off"); s.textContent = txt; if (anim && !ST.reduce) s.animate([{ transform: "translateY(-14px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 450, delay: Math.abs(j - 5) * 30, easing: "steps(5)", fill: "backwards" });
    });
  }
  function renderPanel() {
    const t = PAY(ST.risk, ST.col), cn = TAB.counts[ST.col], N = TAB.N, st = TAB.stats[ST.risk][ST.col], mx = Math.max(...cn.map((n, j) => (n ? t[j] : 0))), jm = t.findIndex((v, j) => cn[j] && v === mx);
    $("#plColN").innerHTML = `${ST.col + 1}<small>/ ${NC}</small>`;
    notches.forEach((n, j) => n.classList.toggle("on", j === ST.col));
    $("#plProb").innerHTML = cn.map((n, j) => `<u class="${j === ST.lastSlot ? "cur" : n ? "" : "z"}" style="height:${Math.max(3, Math.round(60 * n / Math.max(...cn)))}px"></u>`).join("");
    const pm = cn[jm] ? (ST.lang === "es" ? `1 de ${Math.round(N / cn[jm])}` : `1 in ${Math.round(N / cn[jm])}`) : "—";
    $("#plInfo").innerHTML = ST.lang === "es"
      ? `Máximo <b>×${fm(mx)}</b> (${pm})<br>Cobras ≥ ×1: <b>${(100 * st.hit).toFixed(1).replace(".", ",")} %</b> · ×0: <b>${(100 * st.zero).toFixed(1).replace(".", ",")} %</b><br>Retorno exacto: <b>${(100 * TAB.rtp[ST.risk][ST.col]).toFixed(2).replace(".", ",")} %</b>`
      : `Max <b>×${fm(mx)}</b> (${pm})<br>Win ≥ ×1: <b>${(100 * st.hit).toFixed(1)} %</b> · ×0: <b>${(100 * st.zero).toFixed(1)} %</b><br>Exact return: <b>${(100 * TAB.rtp[ST.risk][ST.col]).toFixed(2)} %</b>`;
    $$(".pl-risk").forEach((b, i) => b.classList.toggle("on", i === ST.risk)); $$(".pl-stk").forEach(b => b.classList.toggle("on", +b.dataset.v === ST.stake));
    $("#plCardStake") && ($("#plCardStake").textContent = ST.stake);
    const sh = (r) => { const tt = PAY(r, 5); return [0, 1, 2, 3, 4, 5].map(j => `<u style="height:${Math.max(3, Math.round(34 * Math.log(1 + tt[j] / 10) / Math.log(1 + tt[0] / 10)))}px"></u>`).join(""); };
    $$(".pl-risk").forEach((b, i) => { b.innerHTML = `<span>${tx().risk[i]}</span><span class="sh">${sh(i)}</span>`; });
    $$(".pl-lab").forEach((l, i) => (l.textContent = tx().labs[i])); $("#plGo").textContent = tx().go; $("#plPill").innerHTML = `<i></i><span>${tx().pill} <b>${ST.stake}</b></span>`; $("#plPill").classList.add("on");
    $("#plHud").innerHTML = `<span><img src="${G}coin.webp" alt=""><small>${tx().bal}</small><em>${ST.bal}</em></span><span><small>${tx().chip}</small><em>${ST.stake}</em></span><span><small>${tx().maxl}</small><em>×${fm(mx)}</em></span>`;
  }
  function renderHist(newOne) { $("#plHist").innerHTML = ST.hist.slice(-9).map((h, i, a) => `<b class="t${tier(h.t)}${newOne && i === a.length - 1 ? " n" : ""}">×${fm(h.t)}</b>`).join(""); }
  function setCol(j) { if (ST.busy) return; ST.col = clamp(j, 0, NC - 1); ST.lastSlot = -1; chipPark(); renderSlots(true); renderPanel(); renderTab && renderTab(); }
  function setRisk(r) { if (ST.busy) return; ST.risk = r; renderSlots(true); renderPanel(); renderTab && renderTab(); }
  function setStake(s) { if (ST.busy) return; ST.stake = s; renderPanel(); }
  function chipPark() { chipShow(true); trailOff(); setFrame(0); place(PX(2 * ST.col), CHUTE_Y); trailOff(); }
  function applyDecor(id) { ST.decor = id; stage.dataset.decor = id; $("#plSelDecor").value = ST.forced.decor || ""; }

  /* ------------------------------------------------------------------ efectos: clavijas, aros de luz, paredes, temblor del tablero */
  const litKeys = [{ backgroundPositionX: "-64px", offset: 0 }, { backgroundPositionX: "-64px", offset: 0.22 }, { backgroundPositionX: "-32px", offset: 0.23 }, { backgroundPositionX: "-32px", offset: 0.55 }, { backgroundPositionX: "0px", offset: 0.56 }, { backgroundPositionX: "0px", offset: 1 }];
  const haloKeys = [{ opacity: 1, backgroundPositionX: "0px", offset: 0 }, { opacity: 1, backgroundPositionX: "0px", offset: 0.24 }, { opacity: 0.9, backgroundPositionX: "-112px", offset: 0.25 }, { opacity: 0.8, backgroundPositionX: "-112px", offset: 0.55 }, { opacity: 0.5, backgroundPositionX: "-224px", offset: 0.56 }, { opacity: 0, backgroundPositionX: "-224px", offset: 1 }];
  function lightPeg(r, p, dur = 520, halo = true) {
    const e = pegs[r * 21 + p]; if (!e) return; e.animate(litKeys, { duration: dur });
    if (halo && !ST.reduce) { const h = halos[haloN++ % halos.length]; h.style.transform = `translate3d(${PX(p) - 56}px,${PY(r) - 56}px,0)`; h.animate(haloKeys, { duration: 400 }); }
  }
  function wallFlash(side) { const w = wallEl[side < 0 ? 0 : 1]; w.style.setProperty("--wc", "#fff3b0"); w.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 420, easing: "ease-out" }); }
  let sh = { a: 0 }; function bump(a) { sh.a = Math.max(sh.a, ST.reduce ? 0 : a); if (!sh.on) { sh.on = true; requestAnimationFrame(shk); } }
  function shk() { const a = sh.a; if (a < 0.6) { board.style.transform = ""; sh.on = false; sh.a = 0; return; } board.style.transform = `translate3d(${Math.round((vr() - 0.5) * 2 * a / 4) * 4}px,${Math.round((vr() - 0.5) * 2 * a / 4) * 4}px,0)`; sh.a *= 0.84; requestAnimationFrame(shk); }
  const shakeStage = lv => { if (ST.reduce) return; const c = "shake" + (lv > 1 ? lv : ""); stage.classList.remove("shake", "shake2", "shake3"); stage.getAnimations().forEach(a => a.cancel()); stage.classList.add(c); setTimeout(() => stage.classList.remove(c), 1300); };
  const wash = col => { const w = $("#plWash"); w.style.setProperty("--wc", col); w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, easing: "ease-out" }); };

  /* ------------------------------------------------------------------ la decision: semilla -> camino -> casilla -> premio (todo ANTES de animar) */
  function newSeed() { try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch (e) { return Math.floor(vr() * 4294967296); } }
  function decide(forceSlot) {
    let seed = newSeed(), w, rand, tries = 0;
    for (;;) { rand = C.rng(seed); w = C.walk(rand, ST.col); if (forceSlot === "" || forceSlot == null || w.slot === +forceSlot || ++tries > 20000) break; seed = (seed + 1) >>> 0; }      // (el forzado es solo de pruebas)
    const t = PAY(ST.risk, ST.col)[w.slot], x = ST.stake * t, u = rand(), coins = Math.floor(x / 10) + (u < (x % 10) / 10 ? 1 : 0);
    return { seed, walk: w, slot: w.slot, t, x, coins, net: coins - ST.stake, col: ST.col, risk: ST.risk, stake: ST.stake, forcedFail: forceSlot !== "" && w.slot !== +forceSlot };
  }

  /* ------------------------------------------------------------------ la caida: cada presentacion es un plan que modifica solo el ASPECTO */
  function makePlan(id) {
    const p = { id, base: 205, hop: 14, shake: 1, dbl: [], bal: null, carom: null, slow: null, spin: false, toss: false, rain: 0, flashes: 0, wave: false };
    if (id === "equilibrio") p.bal = { r: ri(3, 8), ms: ri(750, 1250) };
    if (id === "doble") { const a = ri(1, 3), b = ri(5, 8); p.dbl = [a, b].slice(0, ri(1, 2)); }
    if (id === "carambola") p.carom = { r: ri(2, 7) };
    if (id === "giro") { p.spin = true; p.toss = true; }
    if (id === "camara") p.slow = 8;
    if (id === "lluvia") p.rain = ri(8, 11);
    if (id === "destellos") p.flashes = ri(3, 5);
    if (id === "luces") p.wave = true;
    if (id === "pesada") { p.base = 190; p.hop = 6; p.shake = 2.6; }
    if (id === "ligera") { p.base = 275; p.hop = 38; p.shake = 0.5; }
    return p;
  }
  function hitPeg(r, p, prevBit) {
    ST.row = r; lightPeg(r, p); sfx.peg(r + (prevBit || 0)); const late = r >= NR - 3 ? (r - (NR - 4)) : 0; bump((late * 5 + 3) * (r >= NR - 3 ? 1 : 0.4) * (ST.plan.shake || 1) * 4 / 4);
  }
  const arc = (x0, y0, x1, y1, dur, hop, f) => run(dur, p => { setFrame(ST.plan.spin ? Math.floor(performance.now() / 70) % 12 : 0); place(lerp(x0, x1, p), lerp(y0, y1, f ? f(p) : p) - 4 * hop * p * (1 - p)); });
  const lift = on => { chipEl.style.filter = on ? "drop-shadow(8px 20px 0 rgba(8,0,24,.32))" : ""; };

  async function fall(res, plan) {
    const W = res.walk, P = W.P, ys = r => PY(r) - REST, xs = p => PX(p), row = r => plan.base * (0.9 + vr() * 0.2) * (r === 0 ? 1 : 1);
    ST.phase = "fall"; chipShow(true); setFrame(0); place(xs(P[0]), CHUTE_Y); trailOff(); $("#plVig").classList.remove("on");
    if (plan.toss) await tossIntro(xs(P[0]));
    await run(330, p => place(xs(P[0]), lerp(CHUTE_Y, ys(0), p * p)));
    hitPeg(0, P[0], 0); ST.ts = 1;
    for (let r = 0; r < NR; r++) {
      if (plan.slow != null && r === plan.slow) { ST.ts = 2.4; $("#plVig").classList.add("on"); board.classList.add("crawl"); }
      const x0 = xs(P[r]), y0 = ys(r), last = r === NR - 1;
      if (plan.bal && plan.bal.r === r) {                         // en equilibrio: tiembla sobre la clavija antes de decidirse
        const ms = plan.bal.ms, dir = W.bits[r] ? 1 : -1; let k = 0;
        await run(ms, p => { const a = (1 - p) * 10 * Math.sin(p * 19) + (p > 0.8 ? (p - 0.8) * 5 * 12 * dir : 0); if (Math.floor(p * 9) !== k) { k = Math.floor(p * 9); sfx.tick(); lightPeg(r, P[r], 160, false); } place(x0 + a, y0 - Math.abs(Math.sin(p * 9)) * 2); });
      }
      if (W.wall[r]) {                                             // rebote en la pared: va hacia ella, la toca y vuelve hacia dentro
        const side = W.wall[r], wx = WALLX[side < 0 ? 0 : 1], d = row(r);
        await arc(x0, y0, wx, y0 + 8, d * 0.42, 6, easeOut); wallFlash(side); sfx.wall(); bump(12 * plan.shake);
        const ex = last ? xs(P[NR]) : xs(P[r + 1]), ey = last ? SLOT_Y : ys(r + 1);
        await arc(wx, y0 + 8, ex, ey, d * 0.8, plan.hop, null);
      } else if (plan.carom && plan.carom.r === r && !last) {     // carambola: sale en alto hasta la pared lateral (por encima de las clavijas) y vuelve al tablero
        const wx = x0 < 480 ? WALLX[0] : WALLX[1], d = row(r) * clamp(Math.abs(wx - x0) / 300, 0.9, 1.7); lift(true);
        await arc(x0, y0, wx, y0 - 20, d, 60, easeOut); wallFlash(wx < 480 ? -1 : 1); sfx.wall(); bump(14);
        await arc(wx, y0 - 20, xs(P[r + 1]), ys(r + 1), d, 70, null); lift(false);
      } else if (plan.dbl.includes(r) && r <= NR - 3 && !W.wall[r + 1]) {  // doble salto: dos filas de golpe
        const d = row(r) * 1.55; lift(true); let mid = false;
        await run(d, p => { const xm = p < 0.5 ? lerp(x0, xs(P[r + 1]), p * 2) : lerp(xs(P[r + 1]), xs(P[r + 2]), p * 2 - 1); setFrame(0); place(xm, lerp(y0, ys(r + 2), p) - 4 * 46 * p * (1 - p)); if (!mid && p >= 0.5) { mid = true; lightPeg(r + 1, P[r + 1], 380); sfx.peg(r + 1 + W.bits[r], true); } });
        lift(false); r += 1; hitPeg(r + 1, P[r + 1], W.bits[r]);
        continue;
      } else {
        const ex = last ? xs(P[NR]) : xs(P[r + 1]), ey = last ? SLOT_Y : ys(r + 1);
        await arc(x0, y0, ex, ey, last ? row(r) * 1.25 : row(r), last ? plan.hop + 8 : plan.hop, null);
      }
      if (!last) hitPeg(r + 1, P[r + 1], W.bits[r]);
    }
    // la casilla: dos rebotes pequenos y se asienta
    const sx = xs(P[NR]); await arc(sx, SLOT_Y, sx, SLOT_Y, 230, 22, null); await arc(sx, SLOT_Y, sx, SLOT_Y, 170, 9, null); setFrame(0); ST.ts = 1; board.classList.remove("crawl"); $("#plVig").classList.remove("on");
  }
  async function tossIntro(x) {                                    // el crupier lanza la doblon: la de verdad (coin_spin, 24 fotogramas) sube en arco hasta la tolva y se hace ficha
    chipShow(false); spinEl.style.display = "block"; let f = -1; const sx = 330, sy = 380, ex = BX + x - 96, ey = BY + CHUTE_Y - 96;
    await run(950, p => { const nfr = Math.floor(p * 40) % 24; if (nfr !== f) { f = nfr; spinEl.style.backgroundPositionX = -nfr * 192 + "px"; } spinEl.style.transform = `translate3d(${Math.round(lerp(sx, ex, p) / 4) * 4}px,${Math.round(lerp(sy, ey, p) - 4 * 230 * p * (1 - p)) / 4 * 4}px,0)`; });
    spinEl.style.display = "none"; chipShow(true); place(x, CHUTE_Y); lightPeg(0, ST.col * 2, 0, true); halos[0].style.transform = `translate3d(${x - 56}px,${CHUTE_Y - 56}px,0)`; halos[0].animate(haloKeys, { duration: 400 }); sfx.drop();
  }
  /* fichas decorativas: caen por su cuenta (azar de presentacion, ni luz ni notas) y se pierden en una casilla; no significan nada */
  function rainChips(n, gold) {
    for (let i = 0; i < n; i++) (async () => {
      const el = mk("pl-chip ghost" + (gold ? " goldy" : ""), fx); if (gold) { el.style.filter = "drop-shadow(4px 8px 0 rgba(8,0,24,.4))"; el.style.opacity = ".95"; el.style.zIndex = 4; }
      const col = ri(0, NC - 1), w = C.walk(C.rng(newSeed()), col), mv = (x, y) => (el.style.transform = `translate3d(${Math.round(x / K) * K - 24}px,${Math.round(y / K) * K - 24}px,0)`);
      el.style.backgroundPositionX = -ri(0, 11) * 48 + "px"; el.style.opacity = "0"; mv(PX(w.P[0]), -40); await sleep(i * (gold ? 45 : 170) + ri(0, 150)); el.style.opacity = gold ? "0.95" : "0.42"; let y = -40;
      for (let r = 0; r < NR; r++) { const x0 = PX(w.P[r]), y0 = r ? PY(r - 1) - REST : y, x1 = PX(w.P[r]); await run(r ? 230 : 300, p => mv(lerp(PX(w.P[Math.max(0, r - 1)]), x1, p), lerp(y0, PY(r) - REST, p) - 4 * 12 * p * (1 - p))); }
      await run(300, p => mv(PX(w.P[NR]), lerp(PY(NR - 1) - REST, SLOT_Y, p))); el.animate([{ opacity: gold ? 0.95 : 0.42 }, { opacity: 0 }], { duration: 500, fill: "forwards" }); await sleep(520); el.remove();
    })();
  }
  async function wave() { for (let r = 0; r < NR; r++) { for (let p = r % 2; p <= 20; p += 2) { if ((p + r * 3) % 4 === 0 || p === ST.col * 2) lightPeg(r, p, 420, false); } sfx.peg(r, true); await sleep(r < 2 ? 70 : 62); } await sleep(200); }

  /* ------------------------------------------------------------------ una partida */
  function resetScene() { $("#plRes").classList.remove("on"); board.classList.remove("done", "hush", "crawl", "fast"); slots.forEach(s => s.classList.remove("hit", "flash")); $("#plVig").classList.remove("on"); lift(false); hint("start"); spinEl.style.display = "none"; }
  function sitFor(res) {
    const H = ST.hist, tt = res.t, cn = TAB.counts[res.col], pays = PAY(res.risk, res.col), mxv = Math.max(...pays.map((v, j) => (cn[j] ? v : 0))), jm = pays.findIndex((v, j) => cn[j] && v === mxv);
    if (tt === mxv && tt >= 20) return "max";
    if (tt >= 50) return "big";
    if (Math.abs(res.slot - jm) === 1 && mxv >= 50 && tt < 10) return "near";
    const last3 = H.slice(-2).concat([{ slot: res.slot, t: tt }]);
    if (last3.length === 3 && last3.every(h => h.slot >= 4 && h.slot <= 6)) return "center";
    if (H.length >= 2 && H.slice(-2).concat([{ t: tt }]).every(h => h.t < 10)) return "slump";
    return tt === 0 ? "zero" : tt < 10 ? "low" : "ok";
  }
  const levelOf = t => (t >= 250 ? 3 : t >= 50 ? 2 : t >= 10 ? 1 : 0);
  async function play(opt = {}) {
    if (ST.busy) return; AU.init(); ST.busy = true; ST.phase = "drop"; $("#plGo").disabled = true; $("#plBtnPlay").disabled = true;
    if (ST.bal < ST.stake) ST.bal = 100;
    ST.bal -= ST.stake; try { localStorage.setItem("plk_bal", ST.bal); localStorage.setItem("plk_pending", JSON.stringify({ stake: ST.stake, t: Date.now() })); } catch (e) {}
    const res = decide(opt.slot !== undefined ? opt.slot : ST.forced.slot); ST.res = res;
    const presId = opt.pres || ST.forced.pres || reelPick("pres", PRES.map(p => p[0])); ST.presIdx = PRES.findIndex(p => p[0] === presId);
    const decorId = opt.decor || ST.forced.decor || reelPick("decor", DECORS.map(d => d[0])); applyDecor(decorId);
    ROOT = pick([220, 246.94, 261.63, 293.66]); const plan = makePlan(presId); ST.plan = plan; ST.row = -1;
    $("#plCount").textContent = `${tx().pres} ${ST.presIdx + 1} ${tx().of} ${PRES.length}`; renderReel && renderReel(); renderPanel(); resetScene(); chipPark(); chipShow(true);
    // 1. "no va mas" y salida
    $("#plNo").textContent = tx().no; $("#plNo").classList.remove("on"); void $("#plNo").offsetWidth; $("#plNo").classList.add("on"); sfx.bell(); board.classList.add("fast"); hint("fall");
    const edge = ST.col === 0 || ST.col === NC - 1; say(edge && vr() < 0.55 ? "edge" : "drop"); await sleep(ST.reduce ? 500 : 1000);
    if (plan.wave) await wave();
    if (plan.rain) rainChips(plan.rain, false);
    if (plan.flashes) for (let i = 0; i < plan.flashes; i++) setTimeout(() => { const s = slots[ri(0, NC - 1)]; s.classList.remove("flash"); s.getAnimations().forEach(a => a.cancel()); void s.offsetWidth; s.classList.add("flash"); sfx.flash(); setTimeout(() => s.classList.remove("flash"), 1500); }, 400 + i * ri(380, 640) + ri(0, 300));
    if (!plan.toss) sfx.drop();
    const fallSay = setTimeout(() => { if (vr() < 0.4) say("fall", { polite: true }); }, 1400);
    await fall(res, plan); clearTimeout(fallSay); board.classList.remove("fast");
    // 2. resultado
    await settle(res);
  }
  async function settle(res) {
    ST.phase = "done"; ST.lastSlot = res.slot; const s = slots[res.slot], lv = levelOf(res.t), sit = sitFor(res);
    board.classList.add("done"); s.classList.add("hit"); ST.bal += res.coins; ST.hist.push({ slot: res.slot, t: res.t }); renderHist(true); renderPanel();
    try { localStorage.setItem("plk_bal", ST.bal); localStorage.removeItem("plk_pending"); } catch (e) {}
    const pl = $("#plPlate"); pl.className = "pl-plate t" + tier(res.t); pl.innerHTML = `<b>×${fm(res.t)}</b><i>${res.stake} × ${fm(res.t)} = ${fm(res.x)}</i>`;
    $("#plMsg").textContent = tx().net(res.net) + (res.x % 10 && ST.lang ? "  (" + (ST.lang === "es" ? "fracción sorteada" : "fraction drawn") + ")" : ""); const r = $("#plRes"); r.classList.remove("on"); void r.offsetWidth; r.classList.add("on");
    if (lv === 0) { sfx.land(res.slot % 3); res.t === 0 ? sfx.lose() : null; wash("rgba(0,0,0,.35)"); }
    else { sfx.land(res.slot % 3 + 2); sfx.win(lv); shakeStage(lv); bump(8 * lv); wash(lv === 3 ? "rgba(255,138,232,.6)" : "rgba(255,217,90,.55)"); if (lv >= 2) rainChips(lv === 3 ? 26 : 9, true); if (lv === 3 && navigator.vibrate) { try { navigator.vibrate([60, 40, 120]); } catch (e) {} } }
    s.classList.add("flash"); say(sit);
    ST.res.sit = sit; ST.res.level = lv; hint(null);
    await sleep(ST.reduce ? 1500 : 3200); while (ST.hold) await sleep(60); s.classList.remove("flash");   // ST.hold: solo para las capturas de prueba
    $("#plRes").classList.remove("on"); slots.forEach(x => x.classList.remove("hit")); board.classList.remove("done"); setFace("neutral"); chipPark(); renderPanel();
    ST.busy = false; ST.phase = "idle"; $("#plGo").disabled = false; $("#plBtnPlay").disabled = false; hint("start");
  }

  /* ------------------------------------------------------------------ controles */
  $("#plRisks").innerHTML = [0, 1, 2].map(i => `<button class="pl-risk" type="button" data-r="${i}"></button>`).join("");
  $("#plStakes").innerHTML = [2, 5, 10].map(v => `<button class="pl-stk" type="button" data-v="${v}"><img src="${G}coin.webp" alt="">${v}</button>`).join("");
  $$(".pl-risk").forEach(b => (b.onclick = () => setRisk(+b.dataset.r))); $$(".pl-stk").forEach(b => (b.onclick = () => setStake(+b.dataset.v)));
  $("#plColL").onclick = () => setCol(ST.col - 1); $("#plColR").onclick = () => setCol(ST.col + 1); $("#plGo").onclick = () => play(); $("#plBtnPlay").onclick = () => play();
  $$("#plSegLang button").forEach(b => (b.onclick = () => { $$("#plSegLang button").forEach(x => x.classList.remove("on")); b.classList.add("on"); ST.lang = b.dataset.v; document.documentElement.lang = ST.lang; cards(); renderSlots(); renderPanel(); hint("start"); renderTab(); renderReel(); fillSelects(); }));
  $("#plChkReduce").onchange = e => { ST.reduce = e.target.checked; document.documentElement.classList.toggle("reduce-motion", ST.reduce); };
  $("#plChkSound").onchange = e => { ST.sound = e.target.checked; };
  $("#plBtnFull").onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else wrap.requestFullscreen && wrap.requestFullscreen(); };
  function fillSelects() {
    $("#plSelPres").innerHTML = `<option value="">${ST.lang === "es" ? "Al azar (carrete)" : "Random (reel)"}</option>` + PRES.map((p, i) => `<option value="${p[0]}">${i + 1}. ${p[L()]}</option>`).join("");
    $("#plSelDecor").innerHTML = `<option value="">${ST.lang === "es" ? "Al azar (carrete)" : "Random (reel)"}</option>` + DECORS.map(d => `<option value="${d[0]}">${d[L()]}</option>`).join("");
    $("#plSelSlot").innerHTML = `<option value="">${ST.lang === "es" ? "Al azar (semilla)" : "Random (seed)"}</option>` + [...Array(NC).keys()].map(j => `<option value="${j}">${ST.lang === "es" ? "Casilla" : "Slot"} ${j + 1}</option>`).join("");
    $("#plSelPres").value = ST.forced.pres; $("#plSelDecor").value = ST.forced.decor; $("#plSelSlot").value = ST.forced.slot;
  }
  $("#plSelPres").onchange = e => { ST.forced.pres = e.target.value; const i = PRES.findIndex(p => p[0] === e.target.value); $("#plCount").textContent = i < 0 ? `${tx().pres} — ${tx().of} ${PRES.length}` : `${tx().pres} ${i + 1} ${tx().of} ${PRES.length}`; };
  $("#plSelDecor").onchange = e => { ST.forced.decor = e.target.value; if (e.target.value) applyDecor(e.target.value); };
  $("#plSelSlot").onchange = e => { ST.forced.slot = e.target.value; };
  addEventListener("keydown", e => {
    if (e.target.matches("input,textarea,select")) return;
    if (e.key === "ArrowLeft") { setCol(ST.col - 1); e.preventDefault(); } else if (e.key === "ArrowRight") { setCol(ST.col + 1); e.preventDefault(); }
    else if (e.key >= "1" && e.key <= "9") setCol(+e.key - 1); else if (e.key === "0") setCol(9); else if (e.key === "r" || e.key === "R") setRisk((ST.risk + 1) % 3);
    else if ((e.key === "Enter" || e.key === " ") && !ST.busy && e.target === document.body) { e.preventDefault(); play(); }
  });

  /* ------------------------------------------------------------------ secciones de documentacion: tabla de pagos y carrete (se pintan desde tablas.js, la misma fuente que el juego) */
  const pc = (x, d = 2) => (100 * x).toFixed(d).replace(".", ",") + " %";
  function renderTab() {
    const el = $("#plTab"); if (!el) return; const r = ST.risk, c = ST.col, t = PAY(r, c), cn = TAB.counts[c], N = TAB.N, st = TAB.stats[r][c];
    const rows = t.map((v, j) => `<tr class="${cn[j] ? "" : "dim"}"><td>${j + 1}</td><td>×${fm(v, "es")}</td><td>${cn[j]} / ${N}</td><td>${cn[j] ? pc(cn[j] / N) : "imposible"}</td><td>${cn[j] ? pc(cn[j] * v / 10 / N) : "—"}</td></tr>`).join("");
    const mat = TAB.risk.map((nm, i) => `<tr class="${i === r ? "hl" : ""}"><td>${nm}</td>${TAB.rtp[i].map((x, j) => `<td class="${i === r && j === c ? "hl" : ""}">${(100 * x).toFixed(2).replace(".", ",")}</td>`).join("")}</tr>`).join("");
    const sum = TAB.risk.map((nm, i) => { const s = TAB.stats[i][c]; return `<tr class="${i === r ? "hl" : ""}"><td>${nm}</td><td>×${fm(Math.round(s.max * 10), "es")}</td><td>${pc(s.hit, 1)}</td><td>${pc(s.zero, 1)}</td><td>${s.sd.toFixed(2).replace(".", ",")}</td><td>${pc(TAB.rtp[i][c])}</td></tr>`; }).join("");
    el.innerHTML = `<div class="mq-tabbar"><span class="mq-p"><b>Riesgo</b></span><div class="mq-seg" id="plTabRisk">${TAB.risk.map((n, i) => `<button data-v="${i}" class="${i === r ? "on" : ""}">${n}</button>`).join("")}</div><span class="mq-p"><b>Columna de salida</b></span><select id="plTabCol">${[...Array(NC).keys()].map(j => `<option value="${j}" ${j === c ? "selected" : ""}>${j + 1}${j === 5 ? " (centro)" : ""}</option>`).join("")}</select></div>
      <div class="mq-grid2"><div><table class="mq-t"><tr><th>Casilla</th><th>Multiplicador</th><th>Caminos</th><th>Probabilidad</th><th>Aporta al RTP</th></tr>${rows}<tr><th colspan="4" style="text-align:right">RTP exacto (ficha 2, 5 y 10)</th><th>${pc(TAB.rtp[r][c])}</th></tr></table>
      <div class="mq-bars">${cn.map((n, j) => `<u style="height:${Math.max(1, Math.round(88 * n / Math.max(...cn)))}px;${cn[j] ? "" : "background:#3a2b66"}"></u>`).join("")}</div></div>
      <div><p class="mq-p"><b>Tu selección:</b> ${TAB.risk[r]}, columna ${c + 1}. Gana (≥×1) <b>${pc(st.hit, 1)}</b>, ×0 <b>${pc(st.zero, 1)}</b>. Las casillas "imposible" no se pueden alcanzar en 12 filas desde esa columna.</p>
      <table class="mq-t"><tr><th>Nivel (col. ${c + 1})</th><th>Máximo</th><th>≥ ×1</th><th>×0</th><th>Desv. típica</th><th>RTP</th></tr>${sum}</table>
      <p class="mq-p" style="margin-top:14px"><b>RTP exacto de las 33 tablas</b> (nivel × columna de salida 1…11, en %):</p>
      <table class="mq-t"><tr><th></th>${[...Array(NC).keys()].map(j => `<th>${j + 1}</th>`).join("")}</tr>${mat}</table>
      <p class="mq-p">Todas entre 96,00 % y 97,00 %. El premio es ficha × multiplicador; la fracción de moneda se sortea con la misma semilla (el retorno esperado es exacto para la ficha 2, 5 y 10). La columna elige la <b>varianza</b>: en el centro, premios grandes y raros; en el borde, premios pequeños y frecuentes (la tabla se reescala para que siga siendo justa).</p></div></div>`;
    $$("#plTabRisk button").forEach(b => (b.onclick = () => setRisk(+b.dataset.v))); $("#plTabCol").onchange = e => setCol(+e.target.value);
  }
  function renderReel() {
    const el = $("#plReel"); if (!el) return; const R = REEL;
    const pr = PRES.map((p, i) => `<div class="mq-row ${R.pres.last.includes(p[0]) ? "last" : ""}"><span class="n">${i + 1}</span><span><b>${p[L()]}</b><br>${p[L() + 2]}</span><span>vista ${R.pres.seen[p[0]] || 0}×</span><button data-p="${p[0]}">Forzar</button><button data-pp="${p[0]}">Jugar</button></div>`).join("");
    const dc = DECORS.map(d => `<div class="mq-row ${R.decor.last.includes(d[0]) ? "last" : ""}"><span class="n">${DECORS.indexOf(d) + 1}</span><span><b>${d[L()]}</b></span><span>visto ${R.decor.seen[d[0]] || 0}×</span><button data-d="${d[0]}">Ver</button><span></span></div>`).join("");
    const sit = Object.keys(T.es.say).map(k => `<details class="mq-sit"><summary>${k} · ${SIT_NAME[k]} · ${T.es.say[k].length} frases · caras: ${FACE[k].join(", ")} · gestos: ${GEST[k].join(", ")}</summary><ol>${T.es.say[k].map((s, i) => `<li>${s}<br><i style="color:#8f80b8">${T.en.say[k][i]}</i></li>`).join("")}</ol></details>`).join("");
    el.innerHTML = `<div class="mq-grid2"><div><h3>Presentaciones (${PRES.length})</h3><p class="mq-p">Se sortean <b>sin repetir las 2 últimas</b> y con más peso a las menos vistas; no dependen del resultado, de la ficha, del riesgo ni de la columna. (Atenuadas: las 2 últimas, excluidas del próximo sorteo.)</p><div class="mq-rows">${pr}</div></div>
      <div><h3>Decorados del tablero (${DECORS.length})</h3><p class="mq-p">Otro carrete aparte: cada ficha puede salir en un decorado distinto (fondo, textura, clavijas y bombillas).</p><div class="mq-rows">${dc}</div><h3 style="margin-top:18px">Reacciones del crupier (${Object.keys(T.es.say).length} situaciones × 6 frases × 2 idiomas)</h3><p class="mq-p">Nivel de premio: 1 (×1 a <×5): acorde y temblor leve · 2 (×5 a <×25): arpegio, temblor medio, lluvia dorada · 3 (≥×25): fanfarria, temblor largo, lluvia de fichas y vibración. Tres variantes de sonido que nunca se repiten dos veces seguidas.</p>${sit}</div></div>`;
    $$("#plReel [data-p]").forEach(b => (b.onclick = () => { ST.forced.pres = b.dataset.p; fillSelects(); $("#plSelPres").onchange({ target: { value: b.dataset.p } }); }));
    $$("#plReel [data-pp]").forEach(b => (b.onclick = () => { $("#plWrap").scrollIntoView({ behavior: "smooth", block: "center" }); play({ pres: b.dataset.pp }); }));
    $$("#plReel [data-d]").forEach(b => (b.onclick = () => { ST.forced.decor = b.dataset.d; fillSelects(); applyDecor(b.dataset.d); }));
  }

  /* pruebas: window.__plk */
  window.__plk = { ST, play, say, setCol, setRisk, setStake, applyDecor, decide, makePlan, sitFor, slots, pegs, REEL, get plan() { return ST.plan; } };

  cards(); fit(); fillSelects(); renderSlots(); renderPanel(); renderHist(); renderTab(); renderReel(); resetScene(); chipPark(); applyDecor("petroleo");
  try { if (localStorage.getItem("plk_pending")) { localStorage.removeItem("plk_pending"); setTimeout(() => say("zero", { text: ST.lang === "es" ? "Había una ficha a medias… me la he guardado yo." : "There was a half-finished chip… I kept it." }), 600); } } catch (e) {}
})();
