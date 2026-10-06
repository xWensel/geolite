/* Los tres cubiletes - maqueta jugable. Todo el movimiento va por transform con enteros; el arte se escala x4 sin suavizar. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = "../../../assets/icons/";
  const ST = { stake: 5, lang: "es", reduce: false, sound: true, jokeNext: false, busy: false, bal: 100, pickResolve: null, pickable: false };
  const SLOT = [620, 960, 1300], GY = 790, K = 4, ANCHOR = 44 * K, LIFT = 130, ARC = 40;
  const lerp = (a, b, t) => a + (b - a) * t, ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2), easeOut = p => 1 - Math.pow(1 - p, 3);
  const rnd = Math.random;

  /* ------------------------------------------------------------------ textos (es / en; en el juego, los 12 idiomas con L6) */
  const T = {
    es: {
      card: { n: "Los tres cubiletes", s: "Encuentra el doblón y cobras el doble.", play: "Jugar", coin: "Moneda al aire", coinS: "Acierta y cobras el doble de lo apostado.", heads: "Cara", tails: "Cruz", red: "Rojo o negro", redS: "Acierta el color. El verde salta el acto.", redB: "Rojo", blackB: "Negro", greenB: "Verde", wheel: "Ruleta de premios", wheelS: "Premios buenos y malos. Gira y arriésgate.", spin: "Girar" },
      pill: "Trile · ficha", no: "NO VA MÁS", bal: "BOLSA", chip: "FICHA", prize: "PREMIO",
      hint: { start: "Pulsa JUGAR", watch: "Mira dónde está el doblón…", dance: "Sigue el doblón", pick: "¡Elige un cubilete!", reveal: "¿Seguro?" },
      win: "Aciertas", lose: "Fallas", joke: "Se la ha quedado", winMsg: s => "+" + s, loseMsg: s => "−" + s,
      say: {
        intro: ["Una doblón, tres cubiletes. ¿Qué podría salir mal?", "Mira bien. No parpadees.", "Prometo que no hay truco."],
        dance: ["Sin trampas. Lo juro con la mano en el bolsillo.", "¿La sigues? Yo tampoco.", "Más rápido no, que me mareo yo también."],
        pick: ["Tú eliges. Yo solo muevo cosas.", "Elige con calma. O no: el tiempo es dinero.", "Uno, dos o tres. Las matemáticas están de mi parte."],
        win: ["¿Has ganado la apuesta? Esto no estaba en el guion.", "Suerte de principiante. Y de ojo, a regañadientes.", "Bien visto. Me caes peor."],
        lose: ["La banca siempre gana. Gracias por tu donación.", "Estaba ahí. Lo juro. Estaba ahí.", "Casi. Casi nunca es suficiente."],
        joke: ["Prometí que no había truco. No prometí que hubiera moneda.", "¿Moneda? Yo solo veo tres cubiletes vacíos.", "Qué raro. Se la habrá llevado el viento. En una sala cerrada.", "Mira dentro del guante. No, ahí no. Mejor no mires.", "Cuidado con los bolsillos del frac: tienen mucho fondo.", "Dicen que esto es un timo. Yo lo llamo gestión de banca."],
      },
    },
    en: {
      card: { n: "The three cups", s: "Find the doubloon and win double.", play: "Play", coin: "Coin flip", coinS: "Call it right and win double your stake.", heads: "Heads", tails: "Tails", red: "Red or black", redS: "Call the colour. Green skips the act.", redB: "Red", blackB: "Black", greenB: "Green", wheel: "Prize wheel", wheelS: "Good prizes and bad ones. Spin and risk it.", spin: "Spin" },
      pill: "Shell game · stake", no: "NO MORE BETS", bal: "PURSE", chip: "STAKE", prize: "PRIZE",
      hint: { start: "Press PLAY", watch: "Watch where the doubloon is…", dance: "Follow the doubloon", pick: "Pick a cup!", reveal: "Sure about that?" },
      win: "You win", lose: "You lose", joke: "He kept it", winMsg: s => "+" + s, loseMsg: s => "−" + s,
      say: {
        intro: ["One doubloon, three cups. What could go wrong?", "Watch closely. Don't blink.", "I promise there's no trick."],
        dance: ["No tricks. I swear, hand in my pocket.", "Following it? Neither am I.", "Any faster and I'd get dizzy too."],
        pick: ["Your call. I just move things.", "Take your time. Or don't: time is money.", "One, two or three. The maths is on my side."],
        win: ["You won the bet? That wasn't in the script.", "Beginner's luck. And sharp eyes, grudgingly.", "Well spotted. I like you less."],
        lose: ["The house always wins. Thanks for your donation.", "It was there. I swear. It was right there.", "Close. Close is never enough."],
        joke: ["I promised no tricks. I never promised there'd be a coin.", "Coin? I only see three empty cups.", "Strange. The wind must have taken it. Indoors.", "Check inside the glove. No, not that one. Better not look.", "Mind the tailcoat pockets: they run deep.", "They say this is a scam. I call it bankroll management."],
      },
    },
  };
  const tx = () => T[ST.lang], pickLine = k => { const a = tx().say[k]; return a[Math.floor(rnd() * a.length)]; };

  /* ------------------------------------------------------------------ las cuatro tarjetas de la Barra (HTML del juego) */
  function cards() {
    const t = tx().card, cn = `<img class="ic ic-coin cn" src="${G}coin.webp" alt="" draggable="false">`, ico = (id, src) => `<span class="sp-ic"><img class="ic ic-${id}" src="${src || G + id + ".webp"}" alt="" draggable="false"></span>`;
    $("#trCards").innerHTML =
      `<div class="sup bet cas bt-red">${ico("bet_red")}<span class="sp-t"><b>${t.red}</b><i>${t.redS}</i></span><span class="bt-pick"><button class="bt-c bt-cr" type="button">${t.redB}</button><button class="bt-c bt-cb" type="button">${t.blackB}</button><button class="bt-c bt-cg" type="button">${t.greenB}</button><em class="sp-p">${cn}2</em></span></div>` +
      `<div class="sup bet cas bt-coin">${ico("bet_coin")}<span class="sp-t"><b>${t.coin}</b><i>${t.coinS}</i></span><span class="bt-pick"><button class="bt-c bt-ch" type="button">${t.heads}</button><button class="bt-c bt-ct" type="button">${t.tails}</button><em class="sp-p bt-stake">${cn}2</em></span></div>` +
      `<div class="sup bet cas bt-wheel">${ico("bet_wheel")}<span class="sp-t"><b>${t.wheel}</b><i>${t.wheelS}</i></span><span class="bt-pick"><button class="bt-c bt-cs" type="button">${t.spin}</button><em class="sp-p">${cn}4</em></span></div>` +
      `<div class="sup bet cas bt-cups" id="trCardCups">${ico("bet_cups", "out/bet_cups.webp")}<span class="sp-t"><b>${t.n}</b><i>${t.s}</i></span><span class="bt-pick"><button class="bt-c bt-cu" type="button" id="trCardPlay">${t.play}</button><em class="sp-p bt-stake">${cn}<span id="trCardStake">${ST.stake}</span></em></span></div>`;
    $("#trCardPlay").onclick = () => $("#trWrap").scrollIntoView({ behavior: "smooth", block: "center" }) || play();
  }

  /* ------------------------------------------------------------------ escenario */
  const stage = $("#trStage"), wrap = $("#trWrap"), band = $("#trBand");
  function fit() { const s = wrap.clientWidth / 1920, tf = `scale(${s})`; stage.style.transform = tf; stage.style.setProperty("--tf", tf); }
  addEventListener("resize", fit); document.addEventListener("fullscreenchange", () => setTimeout(fit, 60));

  const mk = (cls, html, parent) => { const d = document.createElement("div"); d.className = cls; if (html) d.innerHTML = html; (parent || stage).appendChild(d); return d; };
  const cups = [], gloves = [];
  const gloveLayer = mk("tr-glovelayer");               // los brazos salen de detras de la mesa: la capa se recorta en su borde superior
  SLOT.forEach((x, i) => {
    const ring = mk("tr-ring", `<img src="out/ring.png" width="232" height="72" alt="" draggable="false">`); ring.style.transform = `translate3d(${x - 116}px,${GY + 2 - 36}px,0)`;
    const num = mk("tr-num", String(i + 1)); num.style.transform = `translate3d(${x - 40}px,${GY + 52}px,0)`;
    cups.push({ id: i, x, arc: 0, lift: 0, hl: 0, z: 10 + i, ring, num, sh: mk("tr-shadow", `<img src="out/shadow.png" width="176" height="48" alt="" draggable="false">`),
      el: mk("tr-cup", `<img src="out/cup.png" width="192" height="224" alt="" draggable="false">`) });
  });
  const coin = { x: SLOT[1], arc: 0, show: false, el: mk("tr-coin", `<img src="out/coin_flat.png" width="68" height="44" alt="" draggable="false">`) };
  const spinEl = mk("tr-spin");
  [0, 1].forEach(i => gloves.push({ vis: 0, tv: 0, x: 0, y: -400, cup: null, el: mk("tr-glove" + (i ? " r" : ""), `<img src="out/glove_grab.png" width="184" height="200" alt="" draggable="false">`, gloveLayer) }));
  const openGlove = { vis: 0, el: mk("tr-glove open", `<img src="out/glove_open.png" width="184" height="248" alt="" draggable="false">`), x: 0, y: 0 };
  const jokeCoin = mk("tr-coin", `<img src="out/coin_flat.png" width="68" height="44" alt="" draggable="false">`); jokeCoin.style.display = "none"; jokeCoin.style.zIndex = 101;

  const order = [0, 1, 2];                         // order[ranura] = id de cubilete
  const slotOf = id => order.indexOf(id);
  const cupTop = c => GY - ANCHOR + c.arc - Math.round((c.lift + c.hl * 0.11) * LIFT);

  function render() {
    for (const c of cups) {
      const top = cupTop(c);
      c.el.style.transform = `translate3d(${Math.round(c.x - 96)}px,${Math.round(top)}px,0)`; c.el.style.zIndex = c.z;
      c.sh.style.transform = `translate3d(${Math.round(c.x - 88)}px,${Math.round(GY - 18 + c.arc * 0.25)}px,0)`;
      c.sh.style.opacity = Math.max(0.25, 1 - 0.4 * c.lift - Math.abs(c.arc) * 0.004);
    }
    // la doblon acompana a su cubilete (arco incluido) y queda en el tapete cuando se levanta
    const cc = cups[coin.cup == null ? 0 : coin.cup];
    coin.el.style.display = coin.show ? "block" : "none";
    if (coin.show) coin.el.style.transform = `translate3d(${Math.round(cc.x - 34)}px,${Math.round(GY - 28 + cc.arc)}px,0)`;
    for (const g of gloves) {
      g.vis += (g.tv - g.vis) * 0.34; if (Math.abs(g.tv - g.vis) < 0.01) g.vis = g.tv;
      if (g.cup != null) { const c = cups[g.cup], tx_ = c.x - 92, ty = cupTop(c) - 124; if (g.vis < 0.05 && g.tv === 1) { g.x = tx_; g.y = ty - 150; } g.x += (tx_ - g.x) * 0.42; g.y += (ty - g.y) * 0.42; }
      g.el.style.opacity = g.vis; g.el.style.transform = `translate3d(${Math.round(g.x)}px,${Math.round(g.y - (1 - g.vis) * 60)}px,0)`;
    }
    openGlove.vis += (openGlove.tv - openGlove.vis) * 0.3; openGlove.el.style.opacity = openGlove.vis; openGlove.el.style.transform = `translate3d(${Math.round(openGlove.x)}px,${Math.round(openGlove.y + (1 - openGlove.vis) * 70)}px,0)`;
    requestAnimationFrame(render);
  }
  const attach = (g, id) => { g.cup = id; g.tv = id == null ? 0 : 1; if (id == null) g.cup = g.cup; };
  const release = () => gloves.forEach(g => { g.tv = 0; });
  const run = (dur, fn) => new Promise(res => { const t0 = performance.now(); const f = now => { const p = Math.min(1, (now - t0) / dur); fn(p); p < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
  const fastMode = () => ST.reduce;

  /* ------------------------------------------------------------------ voz del crupier (globo) y caras */
  let bubbleT = 0;
  function say(text, face) {
    $("#trBubbleTx").textContent = text; $("#trBubble").classList.add("on"); if (face) setFace(face);
    clearTimeout(bubbleT); bubbleT = setTimeout(() => $("#trBubble").classList.remove("on"), Math.max(2800, text.length * 75 + 1000));   // siempre 1 s de mas en pantalla
  }
  const setFace = f => { $("#trDealer").src = G + "dealer_" + f + ".webp"; };
  const hint = k => { const h = $("#trHint"); if (!k) { h.classList.remove("on"); return; } h.textContent = tx().hint[k]; h.classList.add("on"); };
  const pillUpdate = () => { const p = $("#trPill"); p.innerHTML = `<i></i><span>${tx().pill} <b>${ST.stake}</b></span>`; p.classList.add("on"); };
  function hud() { $("#trHud").innerHTML = `<span><img src="${G}coin.webp" alt=""><small>${tx().bal}</small><em>${ST.bal}</em></span><span><small>${tx().chip}</small><em>${ST.stake}</em></span><span><small>${tx().prize}</small><em>×2</em></span>`; $("#trCardStake") && ($("#trCardStake").textContent = ST.stake); }

  /* ------------------------------------------------------------------ sonido (WebAudio sencillo; en el juego, el motor de js/audio.js) */
  const AU = { ctx: null, init() { if (!ST.sound) return null; if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (this.ctx.state === "suspended") this.ctx.resume(); return this.ctx; } };
  const env = (g, t, a, v, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); };
  function tone(f0, f1, d, type, v, delay = 0) { const c = AU.init(); if (!c) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + d); env(g, t, 0.004, v, d); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05); }
  function noise(d, v, hp, delay = 0) { const c = AU.init(); if (!c) return; const t = c.currentTime + delay, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = "highpass"; f.frequency.value = hp; env(g, t, 0.003, v, d); s.connect(f).connect(g).connect(c.destination); s.start(t); }
  const sfx = {
    clack(i = 0) { noise(0.045, 0.15, 2000 + i * 140); tone(250 + i * 12, 120, 0.09, "sine", 0.14); },
    bell() { tone(1568, 1568, 0.9, "sine", 0.07); tone(2093, 2093, 0.9, "sine", 0.04, 0.02); tone(120, 60, 0.2, "sine", 0.12); },
    lift() { noise(0.16, 0.07, 900); tone(170, 300, 0.15, "triangle", 0.06); },
    drum(ms) { const n = Math.round(ms / 55); for (let i = 0; i < n; i++) { tone(95 + rnd() * 8, 70, 0.06, "sine", 0.05 + (i / n) * 0.13, i * 0.055); noise(0.03, 0.03 + (i / n) * 0.07, 1800, i * 0.055); } },
    thump() { tone(150, 45, 0.3, "sine", 0.3); noise(0.1, 0.09, 1500); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.5, "triangle", 0.12, i * 0.09)); tone(130, 130, 0.8, "sawtooth", 0.04, 0.3); },
    lose() { tone(300, 110, 0.55, "sawtooth", 0.08); tone(200, 80, 0.6, "sine", 0.1, 0.1); },
    wink() { tone(988, 1319, 0.18, "triangle", 0.1); tone(1319, 1760, 0.2, "triangle", 0.08, 0.12); },
  };

  /* ------------------------------------------------------------------ el baile */
  const CFG = { 2: { n: 6, dur: 640, rots: 0, feints: 0 }, 5: { n: 9, dur: 440, rots: 2, feints: 1 }, 10: { n: 12, dur: 310, rots: 3, feints: 2 } };
  function genMoves(stake) {
    const c = CFG[stake], mv = [], pairs = [[0, 1], [1, 2], [0, 2]]; let rots = c.rots, last = "";
    while (mv.length < c.n) {
      let m;
      if (rots > 0 && rnd() < 0.3) { m = { type: "rot", dir: rnd() < 0.5 ? 1 : -1 }; rots--; } else { const p = pairs[Math.floor(rnd() * 3)]; m = { type: "swap", a: p[0], b: p[1] }; }
      const key = JSON.stringify(m); if (key === last) continue; last = key; mv.push(m);
    }
    for (let i = 0; i < c.feints; i++) { const p = pairs[Math.floor(rnd() * 3)]; mv.splice(1 + Math.floor(rnd() * (mv.length - 1)), 0, { type: "feint", a: p[0], b: p[1] }); }
    return mv;
  }
  async function doMove(m, dur, i) {
    const fast = fastMode(), D = fast ? Math.max(280, dur) : dur, arcK = fast ? 0 : 1;
    sfx.clack(i);
    if (m.type === "swap" || m.type === "feint") {
      const A = order[m.a], B = order[m.b], ca = cups[A], cb = cups[B], xa = SLOT[m.a], xb = SLOT[m.b], front = rnd() < 0.5 ? 1 : -1, feint = m.type === "feint";
      if (!fast) { attach(gloves[0], A); attach(gloves[1], B); }
      await run(feint ? D * 0.85 : D, p => {
        const e = ease(p), s = Math.sin(Math.PI * p);
        ca.x = feint ? xa + (xb - xa) * 0.4 * s : lerp(xa, xb, e); cb.x = feint ? xb + (xa - xb) * 0.4 * s : lerp(xb, xa, e);
        ca.arc = front * ARC * s * arcK; cb.arc = -front * ARC * s * arcK; ca.z = front > 0 ? 30 : 20; cb.z = front > 0 ? 20 : 30;
      });
      if (!feint) { order[m.a] = B; order[m.b] = A; }
      ca.x = SLOT[slotOf(A)]; cb.x = SLOT[slotOf(B)]; ca.arc = cb.arc = 0;
    } else {   // rotacion de tres: el que cruza dos casillas va por detras
      const d = m.dir, moves = order.map((id, s) => ({ id, from: s, to: (s + d + 3) % 3 })), long = moves.find(x => Math.abs(x.to - x.from) === 2), other = moves.find(x => x !== long && x.id !== long.id);
      if (!fast) { attach(gloves[0], long.id); attach(gloves[1], other.id); }
      await run(D * 1.35, p => {
        const e = ease(p), s = Math.sin(Math.PI * p);
        for (const x of moves) { const c = cups[x.id]; c.x = lerp(SLOT[x.from], SLOT[x.to], e); c.arc = (x === long ? -1 : 0.55) * ARC * s * arcK; c.z = x === long ? 18 : 24; }
      });
      const next = [0, 0, 0]; for (const x of moves) next[x.to] = x.id; next.forEach((id, s) => (order[s] = id));
      for (const c of cups) { c.x = SLOT[slotOf(c.id)]; c.arc = 0; }
    }
    cups.forEach(c => (c.z = 10 + slotOf(c.id)));
  }

  /* ------------------------------------------------------------------ una partida */
  const lift = async (id, to, ms = 360) => { const c = cups[id], from = c.lift; await run(fastMode() ? 160 : ms, p => (c.lift = lerp(from, to, easeOut(p)))); };
  function resetScene() {
    order.splice(0, 3, 0, 1, 2); cups.forEach(c => { c.x = SLOT[c.id]; c.arc = 0; c.lift = 0; c.hl = 0; c.z = 10 + c.id; c.el.classList.remove("pick"); c.num.classList.remove("hot"); });
    gloves.forEach(g => { g.tv = 0; g.vis = 0; g.cup = null; }); openGlove.tv = 0; openGlove.vis = 0; jokeCoin.style.display = "none"; spinEl.style.display = "none";
    coin.show = false; $("#trRes").classList.remove("on"); $("#trPlate").className = "tr-plate"; band.classList.remove("hush", "fast"); setFace("neutral"); hint(null);
  }
  const shake = () => { if (ST.reduce) return; stage.classList.remove("shake"); void stage.offsetWidth; stage.classList.add("shake"); };
  const wash = col => { const w = $("#trWash"); w.style.setProperty("--wc", col); w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, easing: "ease-out" }); };

  async function play() {
    if (ST.busy) return; AU.init();
    if (ST.bal < ST.stake) ST.bal = 100;
    ST.busy = true; $("#trBtnPlay").disabled = true; $("#trBtnJoke").disabled = true; resetScene();
    const joke = ST.jokeNext || rnd() < 1 / 50; ST.jokeNext = false;
    ST.bal -= ST.stake; hud(); pillUpdate();
    const coinId = Math.floor(rnd() * 3); coin.cup = coinId; coin.show = true; ST.coinId = coinId;   // (ST.coinId: solo para las pruebas)
    // 1. muestra
    hint("watch"); say(pickLine("intro"), "neutral"); await sleep(700);
    attach(gloves[0], coinId); await sleep(260); sfx.lift(); await lift(coinId, 1, 420); await sleep(fastMode() ? 700 : 1100); await lift(coinId, 0, 340); sfx.clack(0);
    release(); await sleep(260);
    if (joke) coin.show = false;                                    // el chiste: la doblon ya no esta en la mesa (el crupier la guarda ahora)
    // 2. baile
    $("#trNo").textContent = tx().no; $("#trNo").classList.remove("on"); void $("#trNo").offsetWidth; $("#trNo").classList.add("on"); sfx.bell(); band.classList.add("fast");
    hint("dance"); say(pickLine("dance")); await sleep(1100);
    const moves = genMoves(ST.stake), dur = CFG[ST.stake].dur;
    for (let i = 0; i < moves.length; i++) { await doMove(moves[i], dur, i); if (dur >= 400 || i === moves.length - 1) release(); await sleep(i === moves.length - 1 ? 200 : Math.max(40, dur * 0.18)); }
    release(); band.classList.remove("fast");
    // 3. elige
    hint("pick"); say(pickLine("pick")); const pickId = await choose();
    // 4. revelacion
    hint(null); band.classList.add("hush"); say("…", "neutral"); $("#trBubble").classList.remove("on");
    sfx.drum(900); await sleep(950);
    attach(gloves[0], pickId); await sleep(180); sfx.lift(); await lift(pickId, 1, 420); sfx.thump();
    const win = !joke && pickId === coinId;
    if (win) { coin.cup = pickId; coin.show = true; await sleep(300); await celebrate(pickId); }
    else {
      if (!joke) coin.show = true;                                  // al levantar el tuyo vacio, el crupier ensena donde estaba
      await sleep(joke ? 700 : 500);
      for (const c of cups) if (c.id !== pickId) { attach(gloves[1], c.id); await sleep(150); sfx.lift(); await lift(c.id, 1, 360); await sleep(joke ? 330 : 240); }
      if (joke) await jokeBeat(); else { setFace("laugh"); sfx.lose(); say(pickLine("lose")); showPlate("lose", tx().lose, "", tx().loseMsg(ST.stake)); }
    }
    release(); band.classList.remove("hush"); await sleep(2600);
    for (const c of cups) lift(c.id, 0, 420); await sleep(520); coin.show = false; openGlove.tv = 0;
    ST.busy = false; $("#trBtnPlay").disabled = false; $("#trBtnJoke").disabled = false; hint("start"); $("#trRes").classList.remove("on"); setFace("neutral");
  }

  function choose() {
    return new Promise(res => {
      ST.pickable = true; cups.forEach(c => c.el.classList.add("pick"));
      ST.pickResolve = id => { ST.pickable = false; cups.forEach(c => { c.el.classList.remove("pick"); c.hl = 0; c.num.classList.remove("hot"); }); ST.pickResolve = null; res(id); };
    });
  }
  const pickSlot = s => { if (ST.pickable && ST.pickResolve) { const id = order[s]; sfx.clack(2); ST.pickResolve(id); } };
  cups.forEach(c => {
    c.el.addEventListener("click", () => pickSlot(slotOf(c.id)));
    c.el.addEventListener("mouseenter", () => { if (!ST.pickable) return; c.hl = 1; c.num.classList.add("hot"); sfx.clack(0); });
    c.el.addEventListener("mouseleave", () => { c.hl = 0; c.num.classList.remove("hot"); });
  });
  addEventListener("keydown", e => { if (e.target.matches("input,textarea")) return; if (e.key >= "1" && e.key <= "3") pickSlot(+e.key - 1); else if ((e.key === "Enter" || e.key === " ") && !ST.busy && e.target === document.body) { e.preventDefault(); play(); } });

  function showPlate(kind, name, extra, msg) {
    const p = $("#trPlate"); p.className = "tr-plate " + kind; p.innerHTML = `<b>${name}</b>${extra ? `<i>${extra}</i>` : ""}`; $("#trMsg").textContent = msg;
    const r = $("#trRes"); r.classList.remove("on"); void r.offsetWidth; r.classList.add("on");
  }
  async function celebrate(id) {
    const c = cups[id]; setFace("angry"); sfx.win(); shake(); wash("rgba(255,217,90,.55)");
    // la doblon del juego (24 fotogramas de giro) sale disparada hacia el espectador y cae de vuelta
    const x = c.x - 96, y0 = GY - 110; spinEl.style.display = "block"; let f = 0;
    await run(ST.reduce ? 300 : 900, p => { const h = Math.sin(Math.PI * Math.min(1, p * 1.0)) * 150; spinEl.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y0 - h - 40)}px,0)`; const nf = Math.floor(p * 36) % 24; if (nf !== f) { f = nf; spinEl.style.backgroundPositionX = -nf * 192 + "px"; } });
    spinEl.style.display = "none"; ST.bal += ST.stake * 2; hud();
    showPlate("win", tx().win, "×2", tx().winMsg(ST.stake * 2)); say(pickLine("win"));
    await sleep(500); for (const o of cups) if (o.id !== id) { attach(gloves[1], o.id); await sleep(120); await lift(o.id, 1, 320); }
  }
  async function jokeBeat() {
    // el chiste del trilero: los tres vacios; el crupier suelta la doblon de entre los dedos, guina y se la guarda
    setFace("laugh"); band.classList.remove("hush"); await sleep(800);
    openGlove.x = 640; openGlove.y = 300; openGlove.tv = 1; jokeCoin.style.display = "block"; jokeCoin.style.transform = `translate3d(${openGlove.x + 58}px,${openGlove.y + 118}px,0)`;
    sfx.wink(); say(pickLine("joke")); showPlate("joke", tx().joke, "", tx().loseMsg(ST.stake)); wash("rgba(138,31,63,.5)"); shake();
    await sleep(2400);
    await run(ST.reduce ? 200 : 520, p => { const e = easeOut(p); jokeCoin.style.transform = `translate3d(${Math.round(lerp(openGlove.x + 58, 860, e))}px,${Math.round(lerp(openGlove.y + 118, 360, e) - Math.sin(Math.PI * p) * 70)}px,0)`; jokeCoin.style.opacity = 1 - p * 0.9; });
    jokeCoin.style.display = "none"; jokeCoin.style.opacity = 1; sfx.thump();
  }

  /* ------------------------------------------------------------------ controles */
  function wireSeg(id, cb) { document.querySelectorAll(id + " button").forEach(b => (b.onclick = () => { document.querySelectorAll(id + " button").forEach(x => x.classList.remove("on")); b.classList.add("on"); cb(b.dataset.v); })); }
  wireSeg("#trSegStake", v => { ST.stake = +v; hud(); pillUpdate(); });
  wireSeg("#trSegLang", v => { ST.lang = v; cards(); hud(); pillUpdate(); document.documentElement.lang = v; });
  $("#trChkReduce").onchange = e => { ST.reduce = e.target.checked; document.documentElement.classList.toggle("reduce-motion", ST.reduce); };
  $("#trChkSound").onchange = e => { ST.sound = e.target.checked; };
  $("#trBtnPlay").onclick = play;
  $("#trBtnJoke").onclick = () => { ST.jokeNext = true; play(); };
  $("#trBtnFull").onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else wrap.requestFullscreen && wrap.requestFullscreen(); };

  // pruebas: window.__trile.skipTo('pick'), etc.
  window.__trile = { ST, cups, gloves, order, play, say, showPlate, resetScene, jokeBeat, setFace };

  cards(); fit(); hud(); resetScene(); hint("start"); pillUpdate(); requestAnimationFrame(render);
})();
