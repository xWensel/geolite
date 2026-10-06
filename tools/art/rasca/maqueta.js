/* Rasca y gana - maqueta jugable. El azar vive en rasca-core.js (el mismo codigo que verifica rtp.cjs); aqui solo se ENSENA un resultado ya decidido.
   Movimiento por transform con enteros; el arte se escala x4 sin suavizar; la lamina es un canvas a resolucion nativa (108x146) que se rasca pixel a pixel. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const G = "../../../assets/icons/", O = "out/";
  const Core = window.RascaCore, ART = window.RASCA_ART, GEO = ART.geom;
  const K = 4, CX0 = 744, CY0 = 378, NW = GEO.W, NH = GEO.H;
  const rnd = Math.random, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2), easeOut = p => 1 - Math.pow(1 - p, 3), easeBack = p => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
  const bounce = p => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375; return n * (p -= 2.625 / d) * p + 0.984375; };
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: la maqueta sigue */ } }, del(k) { try { localStorage.removeItem(k); } catch (e) { /* idem */ } } };
  const cellXY = i => [GEO.FX + (i % 3) * (GEO.CELL + GEO.GAP), GEO.FY + Math.floor(i / 3) * (GEO.CELL + GEO.GAP)];
  const ST = { stake: 5, lang: "es", reduce: false, sound: true, bal: store.get("rasca_bal", 100), phase: "idle", force: "", reelForce: "", down: false, keyHold: false, padHold: false, seen: store.get("rasca_seen", {}), lastReel: store.get("rasca_last", []), payTheme: "mapamundi" };
  let card = null;

  /* ------------------------------------------------------------------ textos (es / en; en el juego, los 12 idiomas con L6) */
  const T = {
    es: {
      bar: { n: "Rasca y gana", s: "Tres iguales y cobras. Rasca con la doblón.", btn: "Rascar", coin: "Moneda al aire", coinS: "Acierta y cobras el doble de lo apostado.", heads: "Cara", tails: "Cruz", red: "Rojo o negro", redS: "Acierta el color. El verde salta el acto.", redB: "Rojo", blackB: "Negro", greenB: "Verde", wheel: "Ruleta de premios", wheelS: "Premios buenos y malos. Gira y arriésgate.", spin: "Girar" },
      title: "Rasca y gana", foot: "3 iguales = premio", pill: "Rasca · ficha", buy: "Comprar tarjeta", all: "Rasca todo", next: "Otra tarjeta", bal: "BOLSA", chip: "FICHA", prize: "PREMIO", payTitle: "Premios", payNote: "Tres iguales en cualquier casilla.", rtpNote: "Devuelve el", tagNo: "Tarjeta", tagOf: "de",
      hint: { idle: "Compra una tarjeta", scratch: "Arrastra la doblón para rascar", tension: "¡Dos iguales!", done: "¿Otra tarjeta?" },
      keys: "", helpT: "Controles", help: [["RATÓN", "Arrastra sobre la lámina"], ["FLECHAS + ESPACIO", "Mueve y rasca"], ["STICK + A", "Mueve y rasca"], ["R · Y · BOTÓN", "Rasca todo"], ["1 · 2 · 3", "Cambia la ficha"]],
      win: "Premio", lose: "Sin premio", casi: "Casi", winMsg: s => "+" + s, loseMsg: s => "−" + s,
    },
    en: {
      bar: { n: "Scratch & win", s: "Match three and you win. Scratch with the doubloon.", btn: "Scratch", coin: "Coin flip", coinS: "Call it right and win double your stake.", heads: "Heads", tails: "Tails", red: "Red or black", redS: "Call the colour. Green skips the act.", redB: "Red", blackB: "Black", greenB: "Green", wheel: "Prize wheel", wheelS: "Good prizes and bad ones. Spin and risk it.", spin: "Spin" },
      title: "Scratch & win", foot: "3 alike = prize", pill: "Scratch · stake", buy: "Buy a card", all: "Scratch all", next: "Another card", bal: "PURSE", chip: "STAKE", prize: "PRIZE", payTitle: "Prizes", payNote: "Three alike in any cells.", rtpNote: "Pays back", tagNo: "Card", tagOf: "of",
      hint: { idle: "Buy a card", scratch: "Drag the doubloon to scratch", tension: "Two alike!", done: "Another card?" },
      keys: "", helpT: "Controls", help: [["MOUSE", "Drag over the foil"], ["ARROWS + SPACE", "Move and scratch"], ["STICK + A", "Move and scratch"], ["R · Y · BUTTON", "Scratch all"], ["1 · 2 · 3", "Change the stake"]],
      win: "Prize", lose: "No prize", casi: "Almost", winMsg: s => "+" + s, loseMsg: s => "−" + s,
    },
  };
  const tx = () => T[ST.lang], L = (o) => o[ST.lang];

  /* ------------------------------------------------------------------ el carrete: 8 presentaciones = tema + entrada + orden de revelado + efecto de premio */
  const ENTRY_N = { slide: ["Desliza desde abajo", "Slides up from below"], drop: ["Cae desde arriba con rebote", "Drops in with a bounce"], fan: ["Llega girando, como una carta", "Swings in like a playing card"], curtain: ["Se abre el telón", "The curtain opens"], stamp: ["Sello seco sobre el mostrador", "Stamped onto the counter"], wave: ["Entra a bandazos, como un barco", "Rolls in like a ship"], spin: ["Gira como una moneda", "Spins like a coin"], zoom: ["Aparece con un relámpago", "Appears with a lightning flash"] };
  const ORDER_N = { reading: ["lectura", "reading"], spiral: ["espiral", "spiral"], snake: ["serpiente", "snake"], cross: ["en cruz", "cross"], columns: ["por columnas", "by columns"], centerout: ["del centro afuera", "centre outwards"], diagonal: ["en diagonal", "diagonal"], random: ["al azar", "random"] };
  const FX_N = { coins: ["lluvia de doblones", "doubloon rain"], pins: ["chinchetas", "map pins"], bunting: ["banderines y confeti", "bunting and confetti"], spot: ["focos y serpentinas", "spotlights and streamers"], cannons: ["cañones de confeti", "confetti cannons"], beam: ["haz del faro", "lighthouse beam"], gems: ["lluvia de gemas", "gem rain"], storm: ["tormenta: rayo y lluvia", "storm: lightning and rain"] };
  const ORDERS = { reading: [0, 1, 2, 3, 4, 5, 6, 7, 8], spiral: [0, 1, 2, 5, 8, 7, 6, 3, 4], snake: [0, 1, 2, 5, 4, 3, 6, 7, 8], cross: [4, 1, 3, 5, 7, 0, 2, 6, 8], columns: [0, 3, 6, 1, 4, 7, 2, 5, 8], centerout: [4, 0, 8, 2, 6, 1, 7, 3, 5], diagonal: [0, 1, 3, 2, 4, 6, 5, 7, 8], random: null };
  const REEL = [
    { id: "r1", theme: "tesoro", entry: "slide", order: "reading", fx: "coins" }, { id: "r2", theme: "mapamundi", entry: "drop", order: "spiral", fx: "pins" },
    { id: "r3", theme: "banderas", entry: "fan", order: "snake", fx: "bunting" }, { id: "r4", theme: "gala", entry: "curtain", order: "cross", fx: "spot" },
    { id: "r5", theme: "monumentos", entry: "stamp", order: "columns", fx: "cannons" }, { id: "r6", theme: "faro", entry: "wave", order: "centerout", fx: "beam" },
    { id: "r7", theme: "gemas", entry: "spin", order: "diagonal", fx: "gems" }, { id: "r8", theme: "tiempo", entry: "zoom", order: "random", fx: "storm" },
  ];
  const thName = th => ART.themes[th][ST.lang];

  /* ------------------------------------------------------------------ el crupier: frases por situacion [es, en, cara, gesto] (>= 6 cada una) */
  const S = {
    intro: [
      ["Tarjeta nueva. Ilusión incluida, sin garantía.", "Fresh card. Hope included, no warranty.", "neutral", "tip"],
      ["Rasca con la doblón. Con las uñas es de tramposos.", "Scratch with the doubloon. Fingernails are for cheats.", "neutral", ""],
      ["Yo no miro. (Sí miro.)", "I'm not looking. (I'm looking.)", "laugh", "peek"],
      ["La lámina es de plata. La suerte, de latón.", "The foil is silver. The luck is brass.", "neutral", ""],
      ["Tres iguales y te pago. Dos iguales y me pongo nervioso.", "Three alike and I pay. Two alike and I get nervous.", "neutral", "shrug"],
      ["Respira. Rasca. Reza. En ese orden.", "Breathe. Scratch. Pray. In that order.", "laugh", ""],
      ["Nadie ha rascado nunca mal. Pero tú vas a intentarlo.", "Nobody ever scratched wrong. You'll try, though.", "laugh", "tip"],
    ],
    tension: [
      ["Dos iguales... qué casualidad más inoportuna.", "Two alike... what an untimely coincidence.", "shock", "sweat"],
      ["No me mires. Sudo por dentro. Y por fuera.", "Don't look at me. I'm sweating inside. And outside.", "shock", "sweat"],
      ["A ver, a ver... ¿y si la tercera se esconde?", "Hold on... what if the third one is hiding?", "shock", "peek"],
      ["Esto no estaba en mis cálculos. Bueno, sí. Pero no así.", "That wasn't in my sums. Well, it was. Just not like this.", "shock", "sweat"],
      ["Me tiembla el bigote. Es un tic. Un tic carísimo.", "My moustache is twitching. It's a tic. An expensive one.", "shock", "peek"],
      ["Rasca despacio, por piedad. Soy una chistera sensible.", "Scratch slowly, for pity's sake. I'm a sensitive top hat.", "shock", "sweat"],
      ["Si sale la tercera, yo no estaba aquí.", "If the third one shows up, I was never here.", "shock", "peek"],
    ],
    nada: [
      ["Nada. Lo que se dice nada. Un clásico.", "Nothing. As in nothing. A classic.", "laugh", "tip"],
      ["La lámina era de plata; tu suerte, de papel.", "The foil was silver; your luck was paper.", "laugh", ""],
      ["Ha sido bonito mientras no lo sabías.", "It was nice while you didn't know.", "laugh", "shrug"],
      ["Pierdes la ficha. Ganas una anécdota. Yo me quedo la ficha.", "You lose the chip. You gain an anecdote. I keep the chip.", "laugh", ""],
      ["Esas nueve casillas te han mirado a los ojos y han dicho que no.", "Those nine cells looked you in the eye and said no.", "laugh", "hop"],
      ["¿Otra? Dicen que la siguiente es la buena. Lo dicen todos. Los que no ganan.", "Another? They say the next one's the good one. Everyone says it. The losers.", "laugh", ""],
      ["La banca da las gracias. La banca siempre da las gracias.", "The house says thanks. The house always says thanks.", "laugh", "tip"],
    ],
    casi: [
      ["¡Casi! Qué cerca. Qué lejos. Depende de a quién preguntes.", "So close! So near. So far. Depends who you ask.", "laugh", "shrug"],
      ["Dos iguales y una tercera con muy mala educación.", "Two alike and a third one with terrible manners.", "laugh", "hop"],
      ["Casi no cuenta, pero se siente. Esa es la gracia.", "Almost doesn't count, but it stings. That's the fun.", "laugh", ""],
      ["He sudado y todo. Qué desperdicio de sudor.", "I even sweated. What a waste of sweat.", "laugh", "shrug"],
      ["La tercera estaba. Se escondió. Es muy tímida.", "The third one was there. It hid. It's very shy.", "laugh", ""],
      ["Casi gana. Casi. Mi palabra favorita.", "Almost won. Almost. My favourite word.", "laugh", "tip"],
      ["Uf, qué susto me has dado. Y qué susto te he dado yo.", "Phew, you gave me a fright. And I gave you one.", "laugh", "hop"],
    ],
    chico: [
      ["Premio pequeño: de los que ni avergüenzan ni enriquecen.", "A small prize: neither embarrassing nor enriching.", "neutral", "shrug"],
      ["Te devuelvo lo tuyo y un poco más. Qué generoso soy.", "Here's yours back and a little more. How generous of me.", "neutral", "tip"],
      ["Una propina de la banca. Gástala en otra tarjeta.", "A tip from the house. Spend it on another card.", "laugh", ""],
      ["Tres iguales. Qué pesadilla para mi bolsillo.", "Three alike. What a nightmare for my pocket.", "angry", "shrug"],
      ["Poquito, pero tuyo. Disfrútalo, que me duele.", "Not much, but yours. Enjoy it, it hurts me.", "angry", ""],
      ["Esto no es un premio, es un cumplido.", "That's not a prize, it's a compliment.", "neutral", "tip"],
      ["Cualquiera puede ganar algo. Hoy te toca ser cualquiera con suerte.", "Anyone can win something. Today you get to be anyone, lucky.", "laugh", ""],
    ],
    medio: [
      ["¡Ahí va! Eso ya empieza a doler en la contabilidad.", "Well! That's starting to hurt the accounts.", "shock", "hop"],
      ["Mi bigote lo ha visto y no me ha avisado.", "My moustache saw it and didn't warn me.", "shock", "shrug"],
      ["Un buen premio. Voy a tener que hablar con la lámina.", "A fine prize. I'll have to talk to the foil.", "angry", "tip"],
      ["No te acostumbres. La suerte es como mi sonrisa: sospechosa.", "Don't get used to it. Luck is like my smile: suspicious.", "angry", ""],
      ["Cobra, anda, antes de que cambie de opinión.", "Collect it, quick, before I change my mind.", "angry", "hop"],
      ["Eso es una racha en camino. Lo dice la lámina. Y yo miento.", "That's a streak on the way. The foil says so. And I lie.", "laugh", ""],
      ["Premio mediano, enfado grande.", "Medium prize, big grumble.", "angry", "shrug"],
    ],
    gordo: [
      ["¡Veinticinco veces! ¿Quién ha dejado la ventana abierta a la suerte?", "Twenty-five times! Who left the window open for luck?", "shock", "clap"],
      ["Esto es un atraco. Y la víctima soy yo.", "This is a robbery. And I'm the victim.", "shock", "sweat"],
      ["Voy a necesitar sentarme. Y otro sombrero.", "I'll need to sit down. And another hat.", "shock", "hop"],
      ["Tres iguales de lujo. Mi contable llora en un rincón.", "Three deluxe alike. My accountant is crying in a corner.", "angry", "clap"],
      ["Que revisen la lámina: debe de estar defectuosa. A tu favor.", "Have the foil checked: it must be faulty. In your favour.", "shock", "shrug"],
      ["Gordo, gordísimo. Hoy me retiro. Mañana vuelvo.", "Big, huge. I retire today. Back tomorrow.", "angry", "tip"],
      ["Mi bigote se ha despegado del susto.", "My moustache just came unglued from the shock.", "shock", "hop"],
    ],
    jackpot: [
      ["¡TRES CHISTERAS! ¡Mi propia chistera se ha puesto en mi contra!", "THREE TOP HATS! My own hat has turned against me!", "shock", "faint"],
      ["Cien veces. ¡CIEN! Me desmayo. Avisa a mi sombrerero.", "A hundred times. ONE HUNDRED! I'm fainting. Call my hatter.", "shock", "faint"],
      ["Esto no puede ser. Es un error de imprenta. A tu favor.", "This can't be. It's a printing error. In your favour.", "shock", "clap"],
      ["He visto a tres de mi familia en una tarjeta y no me han invitado a la boda.", "I saw three of my family on one card and they didn't invite me to the wedding.", "angry", "clap"],
      ["La banca se rinde. La banca no se rinde nunca. La banca se rinde.", "The house surrenders. The house never surrenders. The house surrenders.", "shock", "faint"],
      ["Voy a tener que vender el mostrador. Con la doblón incluida.", "I'll have to sell the counter. Doubloon included.", "shock", "sweat"],
      ["Eres una amenaza. Una amenaza con tres chisteras.", "You're a menace. A menace with three top hats.", "angry", "clap"],
    ],
    all: [
      ["¿Rascado exprés? Eso es hacerse trampas a uno mismo.", "Express scratching? That's cheating yourself.", "laugh", "shrug"],
      ["Sin paciencia no hay emoción. Pero tú sabrás.", "No patience, no thrill. But suit yourself.", "neutral", ""],
      ["Déjame a mí. Yo rasco con clase.", "Leave it to me. I scratch with class.", "laugh", "tip"],
      ["Y... a lo bestia. Me gusta tu estilo. Me cae mal.", "And... brutally. I like your style. I resent it.", "neutral", "shrug"],
      ["Cuidado con la doblón, que es la única que tengo.", "Careful with the doubloon, it's the only one I have.", "shock", ""],
      ["La lámina no tenía nada que ver con esto.", "The foil had nothing to do with it.", "laugh", ""],
    ],
  };
  const SIT_N = { intro: ["Al comprar", "On purchase"], tension: ["Dos iguales y la tercera sin rascar", "Two alike, third still covered"], nada: ["Pierdes (nada)", "You lose (nothing)"], casi: ["Casi (una pareja)", "Almost (a pair)"], chico: ["Premio pequeño (×2, ×3)", "Small prize (×2, ×3)"], medio: ["Premio medio (×5, ×10)", "Medium prize (×5, ×10)"], gordo: ["Premio gordo (×25)", "Big prize (×25)"], jackpot: ["JACKPOT (×100)", "JACKPOT (×100)"], all: ["Al pulsar «Rasca todo»", "On «Scratch all»"] };

  /* ------------------------------------------------------------------ DOM base */
  const stage = $("#raStage"), wrap = $("#raWrap"), band = $("#raBand"), cardEl = $("#raCard"), symsEl = $("#raSyms"), hlsEl = $("#raHls"), foilCv = $("#raFoil"), fctx = foilCv.getContext("2d"), fxCv = $("#raFx"), fx = fxCv.getContext("2d");
  const coinEl = $("#raCoin"), coinH = $("#raCoinH"), dealerBox = $("#raDealerBox"), dealerImg = $("#raDealer");
  let scale = 1, shakeX = 0, shakeY = 0, rect = null;
  const applyTf = () => { stage.style.transform = `translate(${Math.round(shakeX * scale)}px,${Math.round(shakeY * scale)}px) scale(${scale})`; };
  function fit() { scale = wrap.clientWidth / 1920; rect = null; applyTf(); }
  addEventListener("resize", fit); document.addEventListener("fullscreenchange", () => setTimeout(fit, 60)); addEventListener("scroll", () => { rect = null; }, { passive: true });
  const toStage = e => { if (!rect) rect = wrap.getBoundingClientRect(); return [(e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale]; };

  /* imagenes de simbolos (tambien para las particulas) */
  const IMG = {}; const allSyms = new Set(); Object.values(ART.themes).forEach(t => t.syms.forEach(s => allSyms.add(s)));
  allSyms.forEach(n => { const im = new Image(); im.src = O + "spr/" + n + ".png"; IMG[n] = im; });
  const foilBase = {};
  const foilsReady = Promise.all(Object.keys(ART.foil).map(th => new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = NW; c.height = NH; const g = c.getContext("2d"); g.drawImage(im, 0, 0); foilBase[th] = g.getImageData(0, 0, NW, NH).data; res(); }; im.onerror = res; im.src = ART.foil[th]; })));
  const cellOf = new Int8Array(NW * NH).fill(-1); for (let i = 0; i < 9; i++) { const [x0, y0] = cellXY(i); for (let y = 0; y < GEO.CELL; y++) for (let x = 0; x < GEO.CELL; x++) cellOf[(y0 + y) * NW + x0 + x] = i; }

  /* ------------------------------------------------------------------ las cartas de la Barra (HTML del juego) */
  function cards() {
    const t = tx().bar, cn = `<img class="ic ic-coin cn" src="${G}coin.webp" alt="" draggable="false">`, ico = (id, src) => `<span class="sp-ic"><img class="ic ic-${id}" src="${src || G + id + ".webp"}" alt="" draggable="false"></span>`;
    $("#raCards").innerHTML =
      `<div class="sup bet cas bt-red">${ico("bet_red")}<span class="sp-t"><b>${t.red}</b><i>${t.redS}</i></span><span class="bt-pick"><button class="bt-c bt-cr" type="button">${t.redB}</button><button class="bt-c bt-cb" type="button">${t.blackB}</button><button class="bt-c bt-cg" type="button">${t.greenB}</button><em class="sp-p">${cn}2</em></span></div>` +
      `<div class="sup bet cas bt-coin">${ico("bet_coin")}<span class="sp-t"><b>${t.coin}</b><i>${t.coinS}</i></span><span class="bt-pick"><button class="bt-c bt-ch" type="button">${t.heads}</button><button class="bt-c bt-ct" type="button">${t.tails}</button><em class="sp-p bt-stake">${cn}2</em></span></div>` +
      `<div class="sup bet cas bt-wheel">${ico("bet_wheel")}<span class="sp-t"><b>${t.wheel}</b><i>${t.wheelS}</i></span><span class="bt-pick"><button class="bt-c bt-cs" type="button">${t.spin}</button><em class="sp-p">${cn}4</em></span></div>` +
      `<div class="sup bet cas bt-rasca" id="raCardRasca">${ico("bet_rasca", O + "bet_rasca.webp")}<span class="sp-t"><b>${t.n}</b><i>${t.s}</i></span><span class="bt-pick"><button class="bt-c bt-ra" type="button" id="raCardPlay">${t.btn}</button><em class="sp-p bt-stake" id="raCardStake">${cn}<span id="raCardStakeN">${ST.stake}</span></em></span></div>`;
    $("#raCardPlay").onclick = () => { wrap.scrollIntoView({ behavior: "smooth", block: "center" }); buy(); };
    $("#raCardStake").onclick = () => cycleStake();
  }
  function cycleStake() { setStake(ST.stake === 2 ? 5 : ST.stake === 5 ? 10 : 2); }
  function setStake(v) { ST.stake = v; $$("#raSegStake button").forEach(b => b.classList.toggle("on", +b.dataset.v === v)); hud(); pill(); sbar(); }
  const sbar = () => { const e = $("#raCardStakeN"); if (e) e.textContent = ST.stake; };

  /* ------------------------------------------------------------------ HUD, panel de premios, textos del escenario */
  function hud() { $("#raHud").innerHTML = `<span><img src="${G}coin.webp" alt=""><small>${tx().bal}</small><em>${ST.bal}</em></span><span><small>${tx().chip}</small><em>${ST.stake}</em></span><span><small>${tx().prize}</small><em>×100</em></span>`; sbar(); }
  function helpP() { $("#raHelp").innerHTML = `<h4>${tx().helpT}</h4>` + tx().help.map(r => `<div class="ra-hr"><span class="kc">${r[0]}</span><span>${r[1]}</span></div>`).join(""); }
  function pill() { helpP(); $("#raSignTx").textContent = tx().title.toUpperCase(); $("#raPill").innerHTML = `<i></i><span>${tx().pill} <b>${ST.stake}</b></span>`; $("#raBtnBuy").textContent = ST.phase === "done" ? tx().next : tx().buy; $("#raBtnAll").textContent = tx().all; $("#raBtnBuy2").textContent = "▶ " + tx().buy.toUpperCase(); }
  function payPanel(th) {
    const syms = ART.themes[th].syms, name = (th) => th;
    let h = `<h4>${tx().payTitle}<small>${(Core.TIERS.reduce((a, t) => a + t.n * t.m, 0) / Core.DEN * 100).toFixed(1).replace(".", ST.lang === "es" ? "," : ".")} %</small></h4>`;
    for (const t of Core.TIERS) h += `<div class="ra-row" data-tier="${t.id}"><span class="ra-m">×${t.m}</span><span class="ra-ics">${t.slots.map(s => `<span><img src="${O}spr/${syms[s]}.png" alt="" draggable="false"></span>`).join("")}</span></div>`;
    h += `<p class="ra-pnote">${tx().payNote} ${tx().rtpNote} ${(Core.TIERS.reduce((a, t) => a + t.n * t.m, 0) / Core.DEN * 100).toFixed(1).replace(".", ST.lang === "es" ? "," : ".")} %.</p>`;
    $("#raPayBox").innerHTML = h;
  }
  function fitText(el, text, maxW, px) { el.innerHTML = "<span></span>"; const sp = el.firstChild; sp.textContent = text; el.style.fontSize = px + "px"; let n = 0; while (sp.offsetWidth > maxW && px > 20 && n++ < 40) { px -= 2; el.style.fontSize = px + "px"; } }   // una vez al montar la tarjeta, nunca por fotograma
  const cardTexts = () => { fitText($("#raCardTitle"), tx().title, 352, 56); fitText($("#raCardFoot"), tx().foot, 352, 28); };
  const hint = (k, extra) => { const h = $("#raHint"); if (!k) { h.classList.remove("on"); return; } h.innerHTML = tx().hint[k] + (extra ? `<small>${extra}</small>` : ""); h.classList.add("on"); };

  /* ------------------------------------------------------------------ sonido (WebAudio sencillo; en el juego, el motor de js/audio.js) */
  const AU = { ctx: null, init() { if (!ST.sound) return null; if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (this.ctx.state === "suspended") this.ctx.resume(); return this.ctx; } };
  const env = (g, t, a, v, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); };
  function tone(f0, f1, d, type, v, delay = 0) { const c = AU.init(); if (!c) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + d); env(g, t, 0.004, v, d); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05); }
  function noise(d, v, hp, delay = 0, bp = 0) { const c = AU.init(); if (!c) return; const t = c.currentTime + delay, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = bp ? "bandpass" : "highpass"; f.frequency.value = bp || hp; if (bp) f.Q.value = 1.1; env(g, t, 0.003, v, d); s.connect(f).connect(g).connect(c.destination); s.start(t); }
  /* el rasqueo: un ruido en bucle filtrado (paso banda) cuya intensidad y tono siguen la velocidad de la doblon */
  const SC = { on: false, src: null, g: null, f: null, last: 0 };
  function scratchTick(speed) {
    const c = AU.init(); if (!c) return;
    if (!SC.on) { const n = c.sampleRate, b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1; SC.src = c.createBufferSource(); SC.src.buffer = b; SC.src.loop = true; SC.f = c.createBiquadFilter(); SC.f.type = "bandpass"; SC.f.Q.value = 0.9; SC.hp = c.createBiquadFilter(); SC.hp.type = "highpass"; SC.hp.frequency.value = 1400; SC.g = c.createGain(); SC.g.gain.value = 0; SC.src.connect(SC.f).connect(SC.hp).connect(SC.g).connect(c.destination); SC.src.start(); SC.on = true; }
    const t = c.currentTime; SC.g.gain.setTargetAtTime(Math.min(0.13, 0.025 + speed * 0.00009), t, 0.012); SC.f.frequency.setTargetAtTime(2600 + rnd() * 2400 + Math.min(1800, speed * 0.6), t, 0.008); SC.last = performance.now();
  }
  const scratchIdle = now => { if (SC.on && SC.g && now - SC.last > 70 && SC.g.gain.value > 0.0005) SC.g.gain.setTargetAtTime(0, AU.ctx.currentTime, 0.025); };
  const JING = { 1: [[523, 659, 784], [587, 740, 880], [494, 659, 831], [554, 698, 880]], 2: [[523, 659, 784, 1046, 1318], [440, 554, 659, 880, 1108], [587, 740, 880, 1175, 1480], [466, 587, 698, 932, 1175]], 3: [[392, 523, 659, 784, 1046, 1318, 1568, 2093], [330, 415, 494, 659, 831, 988, 1318, 1661], [440, 554, 659, 880, 1108, 1318, 1760, 2217], [349, 466, 587, 698, 932, 1175, 1397, 1865]] };
  const lastJ = {}; let lastShake = 0;
  const sfx = {
    buy() { tone(1900, 1300, 0.07, "square", 0.025); tone(2500, 1800, 0.09, "triangle", 0.03, 0.06); noise(0.05, 0.03, 4000, 0.02); },
    swish() { noise(0.35, 0.05, 0, 0, 1800); tone(180, 420, 0.3, "triangle", 0.03); }, thump() { tone(150, 45, 0.3, "sine", 0.26); noise(0.1, 0.08, 1500); }, flick() { noise(0.08, 0.06, 2600); tone(900, 300, 0.1, "triangle", 0.04); },
    rustle() { for (let i = 0; i < 5; i++) noise(0.14, 0.04, 0, i * 0.1, 900 + i * 220); }, zap() { noise(0.25, 0.1, 3000); tone(2400, 80, 0.35, "sawtooth", 0.05); }, wave() { tone(120, 240, 0.6, "sine", 0.06); noise(0.5, 0.04, 0, 0, 600); }, ring() { tone(1320, 1320, 0.5, "sine", 0.05); tone(1760, 1760, 0.5, "sine", 0.03, 0.05); },
    reveal(n) { tone(420 + n * 55, 640 + n * 70, 0.12, "triangle", 0.06); noise(0.05, 0.03, 3000); },
    heart() { tone(70, 50, 0.12, "sine", 0.18); tone(62, 46, 0.14, "sine", 0.15, 0.17); },
    lose() { tone(300, 110, 0.55, "sawtooth", 0.06); tone(200, 80, 0.6, "sine", 0.09, 0.1); },
    casi() { tone(440, 330, 0.22, "triangle", 0.07); tone(392, 294, 0.22, "triangle", 0.07, 0.24); tone(330, 196, 0.5, "triangle", 0.07, 0.48); },
    win(level) {
      const sets = JING[level]; let k; do { k = Math.floor(rnd() * sets.length); } while (k === lastJ[level] && sets.length > 1); lastJ[level] = k;
      const det = 1 + (rnd() - 0.5) * 0.05, notes = sets[k], gap = 0.095 - level * 0.012;
      notes.forEach((f, i) => tone(f * det, f * det, 0.4 + level * 0.12, i % 2 ? "triangle" : "square", 0.045 + level * 0.014, i * gap));
      if (level >= 2) { tone(98 * det, 55, 0.7, "sine", 0.24); tone(notes[0] * det / 2, notes[0] * det / 2, 0.9, "triangle", 0.05, notes.length * gap); }
      if (level >= 3) { tone(1568, 1568, 1.1, "sine", 0.06, 0.1); tone(2093, 2093, 1.1, "sine", 0.04, 0.12); noise(0.9, 0.05, 2500, 0.05); for (let i = 0; i < 14; i++) tone(2400 + rnd() * 2200, 0, 0.06, "square", 0.012, 0.4 + i * 0.07); }
      else if (level >= 2) for (let i = 0; i < 6; i++) tone(2400 + rnd() * 1800, 0, 0.05, "square", 0.012, 0.3 + i * 0.08);
    },
    clack() { noise(0.045, 0.12, 2000); tone(250, 120, 0.09, "sine", 0.12); },
  };
  let hbTimer = 0; const heartOn = () => { heartOff(); let n = 0; const beat = () => { if (n++ > 9) return; sfx.heart(); hbTimer = setTimeout(beat, 760); }; beat(); }; const heartOff = () => { clearTimeout(hbTimer); };
  const rumble = (lv) => { try { const p = (navigator.getGamepads && [...navigator.getGamepads()].find(Boolean)); p && p.vibrationActuator && p.vibrationActuator.playEffect("dual-rumble", { duration: [0, 160, 340, 700][lv], strongMagnitude: [0, 0.25, 0.55, 1][lv], weakMagnitude: [0, 0.2, 0.4, 0.8][lv] }); } catch (e) { /* sin mando */ } };

  /* ------------------------------------------------------------------ el crupier */
  let bubbleT = 0, faceT = 0, gT = 0; const lastSay = {};
  function speak(text, face, g) { $("#raBubbleTx").textContent = text; $("#raBubble").classList.add("on"); if (face) setFace(face); if (g) gesture(g); clearTimeout(bubbleT); bubbleT = setTimeout(() => $("#raBubble").classList.remove("on"), 1800 + 22 * text.length + 1000); }   // siempre 1 s mas en pantalla
  function say(sit) { const a = S[sit]; let i; do { i = Math.floor(rnd() * a.length); } while (i === lastSay[sit] && a.length > 1); lastSay[sit] = i; const p = a[i]; speak(ST.lang === "es" ? p[0] : p[1], p[2], p[3]); return p; }
  const setFace = f => { dealerImg.src = G + "dealer_" + f + ".webp"; clearTimeout(faceT); if (f !== "neutral" && !(card && card.tense)) faceT = setTimeout(() => { if (!(card && card.tense)) dealerImg.src = G + "dealer_neutral.webp"; }, 4200); };
  const glL = $("#raGlL"), glR = $("#raGlR");
  function gesture(g) {
    if (ST.reduce || !g) return;
    if (g === "sweat") { dealerBox.classList.add("sweat"); clearTimeout(gT); gT = setTimeout(() => { if (!(card && card.tense)) dealerBox.classList.remove("sweat"); }, 3600); return; }
    if (g === "peek") { dealerBox.classList.add("g-peek"); setTimeout(() => { if (!(card && card.tense)) dealerBox.classList.remove("g-peek"); }, 2600); return; }
    if (g === "clap") return clap(3 + Math.floor(rnd() * 2));
    const c = "g-" + g, dur = { tip: 620, shrug: 720, hop: 920, faint: 2850 }[g] || 700; dealerBox.classList.remove("g-tip", "g-shrug", "g-hop", "g-faint"); void dealerBox.offsetWidth; dealerBox.classList.add(c); setTimeout(() => dealerBox.classList.remove(c), dur);
  }
  let clapId = 0; const glovesOff = () => { clapId++; glL.style.opacity = glR.style.opacity = 0; };
  async function clap(n) {
    const my = ++clapId, run1 = (d, fn) => new Promise(res => { const t0 = performance.now(), f = now => { const p = Math.min(1, (now - t0) / d); if (my === clapId) fn(p); p < 1 && my === clapId ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
    glL.style.opacity = glR.style.opacity = 1; const L0 = 860, R0 = 1360; glL.style.left = L0 + "px"; glR.style.left = R0 + "px";
    await run1(300, p => { const y = lerp(340, 120, easeOut(p)); glL.style.transform = `translate3d(0,${Math.round(y - 340)}px,0)`; glR.style.transform = `scaleX(-1) translate3d(0,${Math.round(y - 340)}px,0)`; });
    for (let i = 0; i < n && my === clapId; i++) { await run1(130, p => { const x = lerp(0, 120, easeOut(p)); glL.style.left = L0 + x + "px"; glR.style.left = R0 - x + "px"; }); sfx.clack(); await run1(130, p => { const x = lerp(120, 0, p); glL.style.left = L0 + x + "px"; glR.style.left = R0 - x + "px"; }); }
    await run1(300, p => { const y = lerp(120, 340, ease(p)); glL.style.transform = `translate3d(0,${Math.round(y - 340)}px,0)`; glR.style.transform = `scaleX(-1) translate3d(0,${Math.round(y - 340)}px,0)`; }); if (my === clapId) glL.style.opacity = glR.style.opacity = 0;
  }

  /* ------------------------------------------------------------------ particulas (un solo canvas 1920x1080; todo a enteros) */
  const parts = []; let bunt = null;
  const P = o => { if (parts.length < 520) parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 1800, t: 0, life: 1, w: 8, h: 8, col: "#fff", img: null, floor: 0, bnc: 0, drag: 0, sway: 0, ph: rnd() * 6 }, o)); };
  function flakes(x, y, n) { const F = card ? ART.themes[card.th].flake : ["#fff"]; for (let i = 0; i < n; i++) P({ x: x + (rnd() - .5) * 28, y: y - 10 + (rnd() - .5) * 12, vx: (rnd() - .5) * 520, vy: -300 - rnd() * 520, life: 0.5 + rnd() * 0.5, w: rnd() < .5 ? 4 : 8, h: rnd() < .5 ? 4 : 8, col: F[Math.floor(rnd() * 4)] }); }
  function drawParts(dt) {
    if (!parts.length && !bunt) { if (fxCv.dataset.dirty) { fx.clearRect(0, 0, 1920, 1080); fxCv.dataset.dirty = ""; } return; }
    fx.clearRect(0, 0, 1920, 1080); fxCv.dataset.dirty = "1"; fx.imageSmoothingEnabled = false;
    if (bunt) drawBunting(dt);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt; if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += (p.vx + Math.sin(p.t * 6 + p.ph) * p.sway) * dt; p.y += p.vy * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; }
      if (p.floor && p.y + p.h > p.floor && p.vy > 0) { if (p.bnc) { p.y = p.floor - p.h; p.vy *= -p.bnc; p.vx *= 0.8; } else { p.y = p.floor - p.h; p.vy = 0; p.vx = 0; p.g = 0; } }
      const a = p.life - p.t < 0.35 ? (p.life - p.t) / 0.35 : 1; fx.globalAlpha = a;
      if (p.img) fx.drawImage(p.img, Math.round(p.x), Math.round(p.y), p.w, p.h); else { fx.fillStyle = p.col; fx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h); }
    }
    fx.globalAlpha = 1;
  }
  const PAL = th => [...ART.themes[th].flake.slice(0, 3), ART.themes[th].gold, "#e8283a", "#ffffff", "#3f9af0", "#5cc84a"];
  function drawBunting(dt) {
    bunt.t += dt; const e = easeOut(Math.min(1, bunt.t / 0.5)), out = bunt.t > bunt.life - 0.4 ? (bunt.life - bunt.t) / 0.4 : 1; if (bunt.t > bunt.life) { bunt = null; return; }
    fx.globalAlpha = out;
    for (const side of [0, 1]) for (let k = 0; k < 14; k++) {
      const x = side ? 1920 - 70 - k * 66 : 20 + k * 66, sag = Math.round(Math.sin((k + 0.5) / 14 * Math.PI) * 54), y = Math.round(-120 + (30 + sag + (side ? 46 : 0)) * e + (side ? 0 : 0)); fx.fillStyle = bunt.cols[(k + side) % bunt.cols.length];
      for (let r = 0; r < 7; r++) fx.fillRect(x + r * 4, y + r * 8, 48 - r * 8, 8); fx.fillStyle = "#1d0a3d"; fx.fillRect(x - 4, y - 4, 56, 4);
    }
    fx.globalAlpha = 1;
  }
  function emitFx(kind, lv, th) {
    if (ST.reduce) return; const pal = PAL(th), syms = ART.themes[th].syms, big = lv >= 3, N = [0, 16, 44, 110][lv];
    const rain = (img, w, n, spread = 1) => { for (let i = 0; i < n; i++) P({ img, w, h: w, x: 80 + rnd() * 1760, y: -80 - rnd() * 700 * spread, vx: (rnd() - .5) * 160, vy: 60 + rnd() * 220, g: 1500, floor: 960 + rnd() * 40, bnc: img ? 0.5 : 0.3, life: 2.4 + rnd() * 1.4 }); };
    const confetti = (n, fromBottom) => { for (let i = 0; i < n; i++) { const c = pal[Math.floor(rnd() * pal.length)], hor = rnd() < .5; const L = fromBottom ? (i % 2 ? 1 : -1) : 0; P(fromBottom ? { x: L < 0 ? 40 : 1860, y: 980, vx: (L < 0 ? 1 : -1) * (400 + rnd() * 900), vy: -900 - rnd() * 900, g: 1500, drag: 0.8, w: hor ? 16 : 8, h: hor ? 8 : 16, col: c, life: 2.4 + rnd() * 1.2, sway: 60 } : { x: rnd() * 1920, y: -60 - rnd() * 500, vx: (rnd() - .5) * 120, vy: 80 + rnd() * 140, g: 260, w: hor ? 16 : 8, h: hor ? 8 : 16, col: c, life: 3 + rnd() * 1.5, sway: 90 }); } };
    if (kind === "coins") rain(IMG.coin, 48, N);
    else if (kind === "pins") rain(IMG.pin || IMG.coin, 48, Math.round(N * 0.6));
    else if (kind === "bunting") { bunt = { t: 0, life: 3.2 + lv * 0.5, cols: pal }; confetti(N * 2, false); }
    else if (kind === "spot") { $("#raSpotL").classList.remove("on"); $("#raSpotR").classList.remove("on"); void stage.offsetWidth; $("#raSpotL").classList.add("on"); $("#raSpotR").classList.add("on"); for (let i = 0; i < N; i++) P({ x: rnd() * 1920, y: -120 - rnd() * 500, vx: 0, vy: 90 + rnd() * 120, g: 0, w: 8, h: 56 + Math.floor(rnd() * 3) * 16, col: pal[Math.floor(rnd() * pal.length)], life: 3.4, sway: 140 }); }
    else if (kind === "cannons") confetti(N * 2, true);
    else if (kind === "beam") { const b = $("#raBeam"); b.classList.remove("on"); void b.offsetWidth; b.classList.add("on"); rain(IMG.coin, 48, Math.round(N * 0.5)); }
    else if (kind === "gems") { const gs = [...Object.keys(IMG)].filter(n => n.startsWith("gem_")); for (let i = 0; i < N; i++) P({ img: IMG[gs[i % gs.length]], w: 48, h: 48, x: 80 + rnd() * 1760, y: -80 - rnd() * 700, vx: (rnd() - .5) * 120, vy: 80 + rnd() * 200, g: 1400, floor: 960 + rnd() * 40, bnc: 0.55, life: 2.6 + rnd() }); }
    else if (kind === "storm") { stage.classList.remove("flash"); void stage.offsetWidth; stage.classList.add("flash"); for (let i = 0; i < N * 2; i++) P({ x: rnd() * 1960 - 40, y: -60 - rnd() * 900, vx: -120, vy: 900 + rnd() * 500, g: 0, w: 4, h: 28, col: i % 4 ? "#8fd4ff" : "#ffffff", life: 1.8 + rnd() * 0.8 }); }
    if (big) { const hats = card.out.cls === "x100"; for (let i = 0; i < (hats ? 26 : 16); i++) P({ img: hats ? IMG.hat : IMG.diamond, w: 72, h: 72, x: 80 + rnd() * 1760, y: -100 - rnd() * 800, vx: (rnd() - .5) * 200, vy: 100 + rnd() * 200, g: 1300, floor: 970, bnc: 0.45, life: 3.2 + rnd() * 1.2 }); }   // chisteras = solo el jackpot (3 chisteras)
  }

  /* ------------------------------------------------------------------ temblor, destellos de luz y recompensas por niveles */
  let shakeRun = 0;
  function shake(amp, ms) { if (ST.reduce) return; const id = ++shakeRun, t0 = performance.now(), a = amp * (0.8 + rnd() * 0.4), sx = rnd() < .5 ? 1 : -1; const f = now => { if (id !== shakeRun) return; const p = Math.min(1, (now - t0) / ms), k = (1 - p) * (1 - p); shakeX = Math.round(Math.sin(now / 17) * a * k * sx + (rnd() - .5) * a * 0.5 * k); shakeY = Math.round(Math.cos(now / 13) * a * 0.7 * k + (rnd() - .5) * a * 0.4 * k); applyTf(); if (p < 1) requestAnimationFrame(f); else { shakeX = shakeY = 0; applyTf(); } }; requestAnimationFrame(f); }
  const wash = (col, ms = 650) => { const w = $("#raWash"); w.style.setProperty("--wc", col); w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: "ease-out" }); };
  const lights = ms => { band.classList.add("fast"); setTimeout(() => band.classList.remove("fast"), ms); };
  function reward(lv, tier) {
    sfx.win(lv); rumble(lv); shake([0, 5, 11, 20][lv], [0, 350, 620, 1150][lv]); wash(["", "rgba(255,217,90,.35)", "rgba(255,200,70,.55)", "rgba(255,230,120,.8)"][lv], [0, 500, 750, 1300][lv]); lights([0, 900, 1500, 2600][lv]);
    emitFx(card.R.fx, lv, card.th); if (tier.id === "x100") setTimeout(() => { sfx.win(3); shake(14, 800); wash("rgba(255,255,255,.7)", 900); emitFx(card.R.fx, 3, card.th); }, 1100);
  }

  /* ------------------------------------------------------------------ la lamina: rascar pixel a pixel */
  function foilInit(th) {
    const d = new Uint8ClampedArray(foilBase[th]); card.img = new ImageData(d, NW, NH); card.total = new Array(9).fill(0); card.clear = new Array(9).fill(0);
    for (let i = 0; i < NW * NH; i++) if (d[i * 4 + 3] && cellOf[i] >= 0) card.total[cellOf[i]]++;
    fctx.putImageData(card.img, 0, 0);
  }
  function stamp(nx, ny, R) {
    const d = card.img.data, x0 = Math.max(0, Math.floor(nx - R)), x1 = Math.min(NW - 1, Math.ceil(nx + R)), y0 = Math.max(0, Math.floor(ny - R)), y1 = Math.min(NH - 1, Math.ceil(ny + R)); let n = 0;
    if (x1 < x0 || y1 < y0) return 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x + 0.5 - nx, dy = y + 0.5 - ny; if (dx * dx + dy * dy > R * R) continue; const p = y * NW + x; if (d[p * 4 + 3]) { d[p * 4 + 3] = 0; n++; const c = cellOf[p]; if (c >= 0) card.clear[c]++; } }
    if (n) fctx.putImageData(card.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1); return n;
  }
  function strokeTo(nx, ny) {
    let n = 0; const R0 = 3.4, l = card.last;
    if (l) { const dx = nx - l.x, dy = ny - l.y, steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 1.2)); for (let i = 1; i <= steps; i++) n += stamp(l.x + dx * i / steps, l.y + dy * i / steps, R0 + (rnd() - 0.5) * 0.9); } else n += stamp(nx, ny, R0);
    card.last = { x: nx, y: ny }; return n;
  }
  function checkCells() { for (let c = 0; c < 9; c++) if (!card.rev[c] && card.clear[c] / card.total[c] >= 0.55) revealCell(c, false); }
  function revealCell(c, instant) {
    if (!card || card.rev[c]) return; card.rev[c] = true; const n = card.rev.filter(Boolean).length, [x0, y0] = cellXY(c), d = card.img.data, left = [];
    for (let y = 0; y < GEO.CELL; y++) for (let x = 0; x < GEO.CELL; x++) { const p = (y0 + y) * NW + x0 + x; if (d[p * 4 + 3]) left.push(p); }
    const wipe = list => { for (const p of list) d[p * 4 + 3] = 0; fctx.putImageData(card.img, 0, 0, x0, y0, GEO.CELL, GEO.CELL); };
    if (instant || ST.reduce || left.length < 8) wipe(left);
    else {                                              // la lamina que queda salta a trozos, en 4 tandas
      for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
      const q = Math.ceil(left.length / 4); for (let k = 0; k < 4; k++) setTimeout(() => { if (card) { const part = left.slice(k * q, (k + 1) * q); wipe(part); for (let m = 0; m < part.length; m += 22) { const p = part[m]; flakes(CX0 + (p % NW) * K, CY0 + Math.floor(p / NW) * K, 1); } } }, k * 45);
    }
    const im = symsEl.children[c]; im.classList.remove("pop"); void im.offsetWidth; im.classList.add("pop"); sfx.reveal(n);
    afterReveal();
  }
  function afterReveal() {
    const c = card, bySym = {}; c.rev.forEach((r, i) => { if (r) (bySym[c.out.grid[i]] = bySym[c.out.grid[i]] || []).push(i); });
    const n = c.rev.filter(Boolean).length;
    if (c.out.win >= 0 && !c.won && c.out.cells.every(i => c.rev[i])) { c.won = true; win(); }
    if (!c.won && !c.finished) for (const s in bySym) if (bySym[s].length === 2 && n < 9 && !c.pairSeen[s]) { c.pairSeen[s] = true; tension(bySym[s]); }
    if (n === 9) finish();
  }
  function tension(cells) {
    card.tense = true; cells.forEach(i => hlsEl.children[i].classList.add("pair")); dealerBox.classList.add("sweat", "g-peek"); setFace("shock"); say("tension"); hint("tension"); if (!ST.reduce) heartOn();
  }
  function tensionOff() { if (!card) return; card.tense = false; heartOff(); dealerBox.classList.remove("sweat", "g-peek"); $$("#raHls .hl.pair").forEach(h => h.classList.remove("pair")); }
  function showPlate(kind, name, extra, msg) { const p = $("#raPlate"); p.className = "ra-plate " + kind; p.innerHTML = `<b>${name}</b>${extra ? `<i>${extra}</i>` : ""}`; $("#raMsg").textContent = msg; const r = $("#raRes"); r.classList.remove("on"); void r.offsetWidth; r.classList.add("on"); }
  function win() {
    const c = card, tier = Core.TIERS.find(t => t.id === c.out.cls); tensionOff(); c.paid = true; ST.bal += ST.stake * tier.m; store.set("rasca_bal", ST.bal); store.del("rasca_pending"); hud();
    c.out.cells.forEach(i => { hlsEl.children[i].classList.add("win"); symsEl.children[i].classList.add("win"); }); setTimeout(() => c.rev.forEach((r, i) => { if (r && !c.out.cells.includes(i)) symsEl.children[i].classList.add("dim"); }), 700);
    const row = $(`.ra-row[data-tier="${tier.id}"]`); row && row.classList.add("hit");
    showPlate(tier.level >= 3 ? "big" : "", tx().win, "×" + tier.m, tx().winMsg(ST.stake * tier.m)); hint(null); reward(tier.level, tier); say(tier.sit);
    setTimeout(() => { if (card === c && !c.finished) autoReveal(false); }, ST.reduce ? 600 : 1500);
  }
  function finish() {
    const c = card; if (c.finished) return; c.finished = true; tensionOff();
    if (!c.paid) {
      store.del("rasca_pending");
      if (c.out.cls === "casi") { sfx.casi(); showPlate("casi", tx().casi, "", tx().loseMsg(ST.stake)); say("casi"); shake(4, 300); }
      else { sfx.lose(); showPlate("lose", tx().lose, "", tx().loseMsg(ST.stake)); say("nada"); }
    }
    setTimeout(() => { if (card !== c) return; ST.phase = "done"; stage.classList.remove("scratching"); coinEl.style.display = coinH.style.display = "none"; setBtns(); hint("done"); pill(); }, c.paid ? 1900 : 900);
  }

  /* "Rasca todo": la doblon recorre cada casilla en zigzag, en el orden de la presentacion; reducir movimiento = la lamina sale de golpe por casillas */
  const cur = { x: 960, y: 700 };
  async function autoPath(i) {
    const [x0, y0] = cellXY(i), pts = []; for (let r = 0; r < 6; r++) { pts.push([x0 + (r % 2 ? 25 : 3), y0 + 3 + r * 4.4]); pts.push([x0 + (r % 2 ? 3 : 25), y0 + 3 + r * 4.4 + 2.2]); }
    for (const [nx, ny] of pts) { if (card.rev[i] || !card) break; const fx0 = cur.x, fy0 = cur.y, tx_ = CX0 + nx * K, ty_ = CY0 + ny * K, d = 34; await new Promise(res => { const t0 = performance.now(), f = now => { const p = Math.min(1, (now - t0) / d); cur.x = lerp(fx0, tx_, p); cur.y = lerp(fy0, ty_, p); p < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); }); }
  }
  async function autoReveal(withCoin) {
    const c = card; if (!c || c.auto) return; c.auto = true; const order = ORDERS[c.R.order] || [...Array(9).keys()].sort(() => rnd() - 0.5);
    for (const i of order) {
      if (card !== c) return; if (c.rev[i]) continue;
      if (ST.reduce) { revealCell(i, true); await sleep(110); }
      else if (withCoin) { c.autoHold = true; await autoPath(i); c.autoHold = false; if (!c.rev[i]) revealCell(i, false); await sleep(60); }
      else { revealCell(i, false); await sleep(170); }
    }
    c.auto = false; c.autoHold = false;
  }
  async function scratchAll() { if (ST.phase !== "scratch" || !card || card.auto) return; say("all"); await autoReveal(true); }

  /* ------------------------------------------------------------------ entradas de la tarjeta (una por presentacion) */
  const setCard = (tx_, ty_, sx = 1, sy = 1, op = 1) => { cardEl.style.transform = `translate3d(${Math.round(tx_)}px,${Math.round(ty_)}px,0) scale(${sx},${sy})`; cardEl.style.opacity = op; };
  const runAnim = (d, fn) => new Promise(res => { const t0 = performance.now(), f = now => { const p = Math.min(1, (now - t0) / d); fn(p); p < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
  const ENTRY = {
    async slide() { sfx.swish(); await runAnim(700, p => setCard(0, lerp(720, 0, easeBack(p)))); setCard(0, 0); },
    async drop() { await runAnim(950, p => { setCard(0, lerp(-780, 0, bounce(p))); if (p > 0.36 && !this._h1) { this._h1 = 1; sfx.thump(); shake(7, 300); } }); this._h1 = 0; setCard(0, 0); },
    async fan() { sfx.flick(); await runAnim(760, p => setCard(lerp(780, 0, easeOut(p)), lerp(-60, 0, easeOut(p)), Math.max(0.02, Math.abs(Math.cos((1 - easeOut(p)) * Math.PI * 1.5))), 1)); setCard(0, 0); },
    async curtain() { const l = $("#raCurL"), r = $("#raCurR"); l.classList.add("on"); r.classList.add("on"); setCard(0, 0); sfx.rustle(); await sleep(420); await runAnim(800, p => { l.style.transform = `translateX(${-Math.round(easeOut(p) * 236)}px)`; r.style.transform = `translateX(${Math.round(easeOut(p) * 236)}px)`; }); l.classList.remove("on"); r.classList.remove("on"); l.style.transform = r.style.transform = ""; },
    async stamp() { setCard(0, 0, 1.7, 1.7, 0); await sleep(120); await runAnim(260, p => setCard(0, 0, lerp(1.7, 1, p * p), lerp(1.7, 1, p * p), Math.min(1, p * 2.4))); sfx.thump(); shake(10, 420); setCard(0, 0); },
    async wave() { sfx.wave(); await runAnim(1000, p => setCard(lerp(-1050, 0, easeOut(p)), Math.round(46 * Math.sin(p * 9.5) * (1 - p)))); setCard(0, 0); },
    async spin() { sfx.ring(); await runAnim(900, p => setCard(0, 0, Math.max(0.03, Math.abs(Math.cos((1 - easeOut(p)) * Math.PI * 2.5))), 1, Math.min(1, p * 4))); setCard(0, 0); },
    async zoom() { stage.classList.remove("flash"); void stage.offsetWidth; stage.classList.add("flash"); sfx.zap(); setCard(0, 0, 0.1, 0.1, 0); await sleep(140); await runAnim(540, p => setCard(0, 0, lerp(0.1, 1, easeBack(p)), lerp(0.1, 1, easeBack(p)), Math.min(1, p * 3))); setCard(0, 0); },
  };

  /* ------------------------------------------------------------------ una tarjeta */
  const seedN = (() => { let n = 0; return () => "m" + (crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0].toString(16) : Math.floor(rnd() * 1e9)) + "-" + (n++); })();
  function forced(cls) { for (let i = 0; i < 400000; i++) { const o = Core.outcome("forzar-" + cls + "-" + i + "-" + Math.floor(rnd() * 1e6)); if (o.cls === cls) return o; } return Core.outcome(seedN()); }
  function reelPick() { const id = Core.reelPick(REEL.map(r => r.id), ST.seen, ST.lastReel, rnd); ST.seen[id] = (ST.seen[id] || 0) + 1; ST.lastReel = [id, ...ST.lastReel].slice(0, 2); store.set("rasca_seen", ST.seen); store.set("rasca_last", ST.lastReel); return id; }
  function setBtns() { const idle = ST.phase === "idle" || ST.phase === "done", sc = ST.phase === "scratch" && card && !card.auto && !card.finished; $("#raBtnBuy").hidden = !idle; $("#raBtnAll").hidden = ST.phase === "idle" || ST.phase === "done" || ST.phase === "enter"; $("#raBtnAll").disabled = !sc; $("#raBtnBuy2").disabled = !idle; }
  function resetStage() {
    tensionOff(); glovesOff(); clearTimeout(bubbleT); $("#raBubble").classList.remove("on"); dealerBox.classList.remove("sweat", "g-peek", "g-faint"); setFace("neutral"); $("#raRes").classList.remove("on"); parts.length = 0; bunt = null; hint(null);
    $$(".ra-row.hit").forEach(r => r.classList.remove("hit")); coinEl.style.display = coinH.style.display = "none"; stage.classList.remove("scratching"); band.classList.remove("hush", "fast"); ["raSpotL", "raSpotR", "raBeam"].forEach(i => $("#" + i).classList.remove("on"));
  }
  async function buy(reelId) {
    if (ST.phase !== "idle" && ST.phase !== "done") return; AU.init(); await foilsReady;
    if (ST.bal < ST.stake) ST.bal = 100;
    ST.phase = "enter"; setBtns(); ST.bal -= ST.stake; store.set("rasca_bal", ST.bal); store.set("rasca_pending", { stake: ST.stake, t: Date.now() }); hud(); pill(); resetStage(); cardEl.classList.add("off");
    const out = ST.force ? forced(ST.force) : Core.outcome(seedN()), rid = reelId || ST.reelForce || reelPick(), R = REEL.find(r => r.id === rid), th = R.theme;
    card = { out, R, th, rev: new Array(9).fill(false), last: null, auto: false, autoHold: false, won: false, paid: false, finished: false, tense: false, pairSeen: {}, no: REEL.indexOf(R) + 1 };
    buildCard(); foilInit(th); cardEl.classList.add("off"); setCard(0, 0, 1, 1, 0); sfx.buy();
    $("#raTag").classList.add("on"); const lang = ST.lang === "es" ? 0 : 1; $("#raTagNo").textContent = `${tx().tagNo} ${card.no} ${tx().tagOf} ${REEL.length}`; $("#raTagTh").textContent = `${thName(th)} · ${ENTRY_N[R.entry][lang]}`;
    say("intro"); cardEl.classList.remove("off");
    if (ST.reduce) setCard(0, 0); else await ENTRY[R.entry].call(ENTRY);
    ST.phase = "scratch"; stage.classList.add("scratching"); setBtns(); hint("scratch"); cur.x = 960; cur.y = 860;
  }
  function buildCard() {
    const c = card, th = c.th, TH = ART.themes[th]; stage.style.setProperty("--amb", TH.amb); stage.style.setProperty("--gold", TH.gold); cardEl.style.setProperty("--cg", TH.gold);
    $("#raBase").src = O + "card_" + th + ".png"; cardTexts();
    symsEl.innerHTML = ""; hlsEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const [x0, y0] = cellXY(i), im = document.createElement("img"); im.src = O + "spr/" + TH.syms[c.out.grid[i]] + ".png"; im.draggable = false; im.style.left = (x0 + 2) * K + "px"; im.style.top = (y0 + 2) * K + "px"; symsEl.appendChild(im);
      const h = document.createElement("div"); h.className = "hl"; h.style.left = (x0 * K - 0) + "px"; h.style.top = (y0 * K) + "px"; hlsEl.appendChild(h);
    }
    payPanel(th);
  }

  /* ------------------------------------------------------------------ entrada: raton, teclado, mando */
  stage.addEventListener("pointermove", e => { const [x, y] = toStage(e); cur.x = x; cur.y = y; ST.pointerIn = true; });
  stage.addEventListener("pointerdown", e => { if (e.button !== 0 || e.target.closest(".ra-btn,.ra-pill")) return; const [x, y] = toStage(e); cur.x = x; cur.y = y; ST.down = true; if (card) card.last = null; try { stage.setPointerCapture(e.pointerId); } catch (_) { /* sintetico */ } });
  const up = () => { ST.down = false; };
  stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up); stage.addEventListener("pointerleave", () => { ST.pointerIn = false; });
  const keys = new Set();
  addEventListener("keydown", e => {
    if (e.target.matches("input,textarea,select")) return; const k = e.key.toLowerCase();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"].includes(k) && ST.phase === "scratch") { keys.add(k); e.preventDefault(); }
    else if (k === " " || k === "enter") { if (e.target.tagName === "BUTTON") return; e.preventDefault(); if (ST.phase === "idle" || ST.phase === "done") buy(); else if (ST.phase === "scratch") { if (k === " ") ST.keyHold = true; else scratchAll(); } }
    else if (k === "r" && ST.phase === "scratch") scratchAll();
    else if ((ST.phase === "idle" || ST.phase === "done") && "123".includes(k) && k.length === 1) setStake([2, 5, 10][+k - 1]);
  });
  addEventListener("keyup", e => { const k = e.key.toLowerCase(); keys.delete(k); if (k === " ") ST.keyHold = false; });
  const padEdge = {};
  function pollInput(dt) {
    let mx = 0, my = 0; const sp = (keys.has("shift") ? 1500 : 900) * dt;
    if (keys.has("arrowleft") || keys.has("a")) mx -= 1; if (keys.has("arrowright") || keys.has("d")) mx += 1; if (keys.has("arrowup") || keys.has("w")) my -= 1; if (keys.has("arrowdown") || keys.has("s")) my += 1;
    const pads = window.__fakePad ? [window.__fakePad] : navigator.getGamepads ? [...navigator.getGamepads()] : []; const p = pads.find(Boolean); ST.padHold = false;
    if (p) {
      const ax = Math.abs(p.axes[0]) > 0.2 ? p.axes[0] : 0, ay = Math.abs(p.axes[1]) > 0.2 ? p.axes[1] : 0, b = i => p.buttons[i] && (p.buttons[i].pressed || p.buttons[i] === true);
      mx += ax * Math.abs(ax) * 1.4 + (b(15) ? 1 : 0) - (b(14) ? 1 : 0); my += ay * Math.abs(ay) * 1.4 + (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
      ST.padHold = !!b(0) && ST.phase === "scratch"; const edge = (i, fn) => { const on = !!b(i); if (on && !padEdge[i]) fn(); padEdge[i] = on; };
      edge(0, () => { if (ST.phase === "idle" || ST.phase === "done") buy(); }); edge(3, () => scratchAll()); edge(2, () => { if (ST.phase === "idle" || ST.phase === "done") buy(); }); edge(4, () => { if (ST.phase === "idle" || ST.phase === "done") setStake(ST.stake === 10 ? 5 : 2); }); edge(5, () => { if (ST.phase === "idle" || ST.phase === "done") setStake(ST.stake === 2 ? 5 : 10); });
    }
    if ((mx || my) && ST.phase === "scratch" && card && !card.auto) { cur.x = clamp(cur.x + mx * sp, 0, 1920); cur.y = clamp(cur.y + my * sp, 330, 1010); ST.padMoved = true; }
  }
  addEventListener("keydown", e => { if (e.key === "Shift") keys.add("shift"); }); addEventListener("keyup", e => { if (e.key === "Shift") keys.delete("shift"); });

  /* ------------------------------------------------------------------ bucle: la doblon, la lamina, las particulas (solo transform / canvas) */
  let tPrev = performance.now(), px = -1, py = -1;
  function frame(now) {
    const dt = Math.min(0.05, (now - tPrev) / 1000); tPrev = now; pollInput(dt);
    const active = ST.phase === "scratch" && card && !card.finished, auto = active && card.autoHold, holding = active && (ST.down || ST.keyHold || ST.padHold || auto) && !(card.auto && !card.autoHold);
    if (active && (ST.pointerIn || ST.padMoved || card.auto || ST.keyHold || ST.padHold || keys.size)) {
      const flat = !holding; coinEl.style.display = flat ? "block" : "none"; coinH.style.display = flat ? "none" : "block";
      const el = flat ? coinEl : coinH, hx = flat ? 36 : 40, hy = flat ? 64 : 54; el.style.transform = `translate3d(${Math.round(cur.x - hx)}px,${Math.round(cur.y - hy)}px,0)`;
    } else if (!active) { coinEl.style.display = coinH.style.display = "none"; }
    if (holding) {
      const nx = (cur.x - CX0) / K, ny = (cur.y - CY0) / K;
      if (nx > -4 && nx < NW + 4 && ny > -4 && ny < NH + 4) {
        const dist = px < 0 ? 0 : Math.hypot(cur.x - px, cur.y - py), removed = strokeTo(nx, ny);
        if (removed) { scratchTick(dist / Math.max(dt, 0.008)); flakes(cur.x, cur.y, Math.min(3, 1 + (removed >> 4))); checkCells(); }
      } else card.last = null;
    } else if (card) card.last = null;
    px = cur.x; py = cur.y; scratchIdle(now); drawParts(dt); requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ secciones de la pagina: tabla de pagos, carrete, reacciones, como funciona */
  const pct = (n, d = 4) => (n / Core.DEN * 100).toFixed(d).replace(".", ",") + " %";
  const gcd = (a, b) => (b ? gcd(b, a % b) : a), frac = (n, d) => `${n / gcd(n, d)}/${d / gcd(n, d)}`;
  function renderPay() {
    const syms = ART.themes[ST.payTheme].syms; let rtp = 0, hit = 0, rows = "";
    for (const t of Core.TIERS) { rtp += t.n * t.m; hit += t.n; rows += `<tr><td><b>×${t.m}</b></td><td class="sy">${t.slots.map(s => `<img src="${O}spr/${syms[s]}.png" alt="">`).join("")}</td><td class="n">${pct(t.n)}</td><td class="n">${frac(t.n, Core.DEN)}</td><td class="n">1 de ${(Core.DEN / t.n).toFixed(1).replace(".", ",")}</td><td class="n">${pct(t.n * t.m)}</td></tr>`; }
    const opts = Object.keys(ART.themes).map(t => `<option value="${t}"${t === ST.payTheme ? " selected" : ""}>${ART.themes[t].es}</option>`).join("");
    $("#raPayTable").innerHTML = `<p>Símbolos de ejemplo del tema <select id="raPayTheme" class="chk" style="display:inline">${opts}</select> (las ranuras ×100 · ×25 · ×10 son siempre la chistera, el diamante y la doblón; los otros seis cambian con el tema). Probabilidades <b>exactas</b> por tarjeta (cienmilésimas):</p>
      <table class="mq-t"><tr><th>Premio</th><th>Símbolos</th><th class="n">Probabilidad</th><th class="n">Fracción</th><th class="n">Frecuencia</th><th class="n">Aporta al RTP</th></tr>${rows}
      <tr><td>Casi</td><td>una pareja y nada más</td><td class="n">${pct(Core.CASI_N)}</td><td class="n">${frac(Core.CASI_N, Core.DEN)}</td><td class="n">1 de ${(Core.DEN / Core.CASI_N).toFixed(2).replace(".", ",")}</td><td class="n">0 %</td></tr>
      <tr><td>Nada</td><td>nueve símbolos distintos</td><td class="n">${pct(Core.NADA_N)}</td><td class="n">${frac(Core.NADA_N, Core.DEN)}</td><td class="n">1 de ${(Core.DEN / Core.NADA_N).toFixed(2).replace(".", ",")}</td><td class="n">0 %</td></tr>
      <tr class="tot"><td>RTP exacto</td><td colspan="2">acierto (algún premio): ${pct(hit)} = ${frac(hit, Core.DEN)}</td><td class="n" colspan="2">ventaja de la casa ${pct(Core.DEN - rtp)}</td><td class="n">${pct(rtp)}</td></tr></table>
      <p>RTP = ${rtp.toLocaleString("es-ES")}/${Core.DEN.toLocaleString("es-ES")} = <b>${(rtp / Core.DEN * 100).toFixed(2).replace(".", ",")} %</b> (en fichas devueltas por ficha apostada: ×${(rtp / Core.DEN).toFixed(3).replace(".", ",")}). El premio ×m devuelve m veces la ficha (ya incluye la apuesta, como la Moneda: ×2 = el doble). Independiente de la ficha 2/5/10: la ficha solo multiplica el premio.</p>
      <h3>Cómo se fabrica la cuadrícula (todo por semilla, ANTES de animar)</h3>
      <ul><li><b>Premio</b> (${pct(hit)}): tres casillas iguales del símbolo premiado y <b>seis símbolos distintos entre sí y distintos del premiado</b> → un premio nunca lleva una segunda pareja que pueda confundir.</li>
      <li><b>Casi</b> (${pct(Core.CASI_N)}, declarado e independiente de la ficha y del tema): exactamente <b>una pareja</b> y siete símbolos distintos. La pareja se reparte con pesos ${Core.CASI_W.join(" · ")} (chistera, diamante, doblón y los seis del tema): los «casi» de chistera y diamante son los más frecuentes y duelen más.</li>
      <li><b>Nada</b> (${pct(Core.NADA_N)}): los nueve símbolos distintos. Ninguna tarjeta sin premio puede llevar tres iguales «por accidente»: <code>rtp.cjs</code> enumera las 28.667.520 cuadrículas posibles y comprueba que cada una paga exactamente lo declarado.</li>
      <li>La clase se sortea con una sola tirada de 0 a 99.999; el símbolo dentro del nivel (2 en ×3, 3 en ×2) y las casillas se sortean con la misma semilla. Mulberry32 + hash, igual que <code>A.rng</code>. Verificado con 1.000.000 de tarjetas (chi², RTP medido 95,49 %).</li></ul>`;
    $("#raPayTheme").onchange = e => { ST.payTheme = e.target.value; renderPay(); };
  }
  function renderReel() {
    const lang = ST.lang === "es" ? 0 : 1, rows = REEL.map((r, i) => `<tr><td class="n">${i + 1}</td><td><b>${ART.themes[r.theme].es}</b> <span style="color:#8f80b8">/ ${ART.themes[r.theme].en}</span></td><td>${ENTRY_N[r.entry][0]}</td><td>${ORDER_N[r.order][0]}</td><td>${FX_N[r.fx][0]}</td><td class="n">${ST.seen[r.id] || 0}</td><td><button data-r="${r.id}">▶ probar</button></td></tr>`).join("");
    $("#raReelTable").innerHTML = `<p>Cada tarjeta que compras sorteará una de estas 8 presentaciones: <b>nunca las 2 últimas</b> y con <b>más peso a las menos vistas</b> (la misma regla que <code>reelPick</code> de las ruletas; 200.000 sorteos de prueba en <code>rtp.cjs</code>: se equilibran y no repiten). Cambia el <b>tema</b> (marco, lámina, papel, casillas y los seis símbolos bajos), la <b>entrada</b> de la tarjeta, el <b>orden</b> en que se revela con «Rasca todo» y el <b>efecto</b> al completar un premio. Es independiente del resultado.</p>
      <table class="mq-t"><tr><th class="n">#</th><th>Tema</th><th>Entrada de la tarjeta</th><th>Orden de revelado</th><th>Efecto de premio</th><th class="n">Vistas</th><th></th></tr>${rows}</table>
      <p>Además, sin sorteo: <b>tensión</b> (cuando se ven 2 iguales y la tercera sigue tapada el crupier suda, se asoma y se oye un latido), recompensas por <b>niveles 1-2-3</b> (sonido + temblor + partículas crecientes, nunca idénticos: 4 melodías por nivel, amplitud y tono con azar) y el <b>jackpot</b> (lluvia de chisteras, el crupier se desmaya).</p>`;
    $$("#raReelTable button").forEach(b => (b.onclick = () => { wrap.scrollIntoView({ behavior: "smooth", block: "center" }); buy(b.dataset.r); }));
    const sel = $("#raSelReel"); if (sel && !sel.options.length) { sel.innerHTML = `<option value="">sorteo normal (carrete)</option>` + REEL.map((r, i) => `<option value="${r.id}">${i + 1} · ${ART.themes[r.theme].es}</option>`).join(""); sel.onchange = () => (ST.reelForce = sel.value); }
  }
  function renderSay() {
    $("#raSayTable").innerHTML = `<div class="mq-say">` + Object.keys(S).map(k => `<div><h3>${SIT_N[k][0]} <small>${S[k].length} frases</small></h3><ol>${S[k].map((p, i) => `<li data-s="${k}" data-i="${i}">${p[0]}<br><span style="color:#8f80b8">${p[1]}</span> <em>${p[2]}${p[3] ? " · " + p[3] : ""}</em></li>`).join("")}</ol></div>`).join("") + `</div>`;
    $$("#raSayTable li").forEach(li => (li.onclick = () => { const p = S[li.dataset.s][+li.dataset.i]; wrap.scrollIntoView({ behavior: "smooth", block: "center" }); speak(ST.lang === "es" ? p[0] : p[1], p[2], p[3]); }));
  }
  function renderHow() {
    $("#raHow").innerHTML = `<div><h3>El flujo</h3><ol><li><b>Comprar</b>: ficha de 2, 5 o 10 (clic en el precio de la carta o de la mesa, como en la Moneda). La tarjeta entra de una de las 8 maneras del carrete.</li><li><b>Rascar</b>: la doblón es el cursor. Arrastra (o flechas + Espacio, o stick + A) y la lámina salta en trocitos de pixel nativo con su rasqueo filtrado. Al rascar el <b>55 %</b> de una casilla, la lámina que queda se retira sola.</li><li><b>Tensión</b>: dos iguales a la vista y la tercera sin rascar = el crupier suda y se asoma.</li><li><b>Premio</b>: al descubrir la tercera igual, el premio se cobra, suena la recompensa de su nivel y el crupier rasca el resto.</li><li><b>Rasca todo</b> (botón, R, Y del mando): la doblón recorre las casillas en el orden de la presentación. Con «reducir movimiento» la lámina se retira de golpe por casillas.</li></ol><p>Si cierras el juego a mitad de una tarjeta, el crupier se guarda la ficha (no se puede recargar para ver la solución).</p></div>
      <div><h3>Números y reglas</h3><table class="mq-t"><tr><th>Ficha</th><th>Premio ×2…×100</th><th>Tarjeta de 3×3</th></tr><tr><td>2 / 5 / 10</td><td>múltiplo de la ficha</td><td>mismo sorteo para las tres</td></tr></table><p>La ficha no cambia el sorteo, la presentación ni la frecuencia de los «casi»: solo multiplica el premio. Pierdes solo la ficha, como en la Moneda. En el juego, la semilla saldrá de <code>A.rng(runSeed + n.º de tarjeta)</code>, así que el reto diario y las partidas con semilla son reproducibles.</p><h3>Mando y teclado</h3><p>Stick izquierdo / cruceta: mueven la doblón · <b>A</b> (mantener): rascar · <b>Y</b>: rasca todo · <b>X</b> o <b>A</b> en reposo: comprar · <b>LB/RB</b>: ficha. Teclado: flechas/WASD + <b>Espacio</b> (mantener), <b>R</b> o Intro: rasca todo, 1·2·3: ficha. Lo pulsable lleva <code>cursor: pointer</code> para el recorrido de mando del juego.</p></div>`;
  }

  /* ------------------------------------------------------------------ controles de la pagina */
  function wireSeg(id, cb) { $$(id + " button").forEach(b => (b.onclick = () => { $$(id + " button").forEach(x => x.classList.remove("on")); b.classList.add("on"); cb(b.dataset.v); })); }
  wireSeg("#raSegStake", v => { ST.stake = +v; hud(); pill(); sbar(); });
  wireSeg("#raSegLang", v => { ST.lang = v; document.documentElement.lang = v; cards(); hud(); pill(); renderPay(); renderReel(); renderSay(); cardTexts(); payPanel(card ? card.th : "tesoro"); hint(ST.phase === "idle" ? "idle" : ST.phase === "done" ? "done" : "scratch"); setBtns(); });
  $("#raChkReduce").onchange = e => { ST.reduce = e.target.checked; document.documentElement.classList.toggle("reduce-motion", ST.reduce); };
  $("#raChkSound").onchange = e => { ST.sound = e.target.checked; };
  $("#raBtnBuy").onclick = () => buy(); $("#raBtnBuy2").onclick = () => buy(); $("#raBtnAll").onclick = scratchAll; $("#raPill").onclick = cycleStake;
  $("#raBtnFull").onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else wrap.requestFullscreen && wrap.requestFullscreen(); };
  $("#raSelOut").onchange = e => (ST.force = e.target.value);

  /* ------------------------------------------------------------------ pruebas (harness): window.__rasca */
  window.__rasca = {
    ST, Core, cur, S, REEL, buy, scratchAll, revealCell, say, speak, win, finish, hint, stamp, foilCv,
    get card() { return card; },
    partial(i, frac) { const [x0, y0] = cellXY(i); card.last = null; let k = 0; const pts = []; for (let r = 0; r < 6; r++) { pts.push([x0 + (r % 2 ? 25 : 3), y0 + 3 + r * 4.4]); pts.push([x0 + (r % 2 ? 3 : 25), y0 + 3 + r * 4.4 + 2.2]); }
      for (const [nx, ny] of pts) { strokeTo(nx, ny); if (card.clear[i] / card.total[i] >= frac) break; } cur.x = CX0 + (x0 + 14) * K; cur.y = CY0 + (y0 + 14) * K; card.last = null; return card.clear[i] / card.total[i]; },
    flakes, emitFx, tension, reward,
  };

  function idlePreview() { const th = "tesoro", TH = ART.themes[th]; stage.style.setProperty("--amb", TH.amb); stage.style.setProperty("--gold", TH.gold); cardEl.style.setProperty("--cg", TH.gold); $("#raBase").src = O + "card_" + th + ".png"; symsEl.innerHTML = ""; hlsEl.innerHTML = ""; payPanel(th); cardTexts(); foilsReady.then(() => { if (!card) fctx.putImageData(new ImageData(new Uint8ClampedArray(foilBase[th]), NW, NH), 0, 0); }); }
  cards(); fit(); hud(); pill(); idlePreview(); (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(cardTexts); hint("idle"); setBtns(); renderPay(); renderReel(); renderSay(); renderHow(); dealerBox.classList.add("bob");
  if (store.get("rasca_pending", null)) { store.del("rasca_pending"); setTimeout(() => speak(ST.lang === "es" ? "Vaya, cerraste a mitad de tarjeta. Me guardo tu ficha. Sin rencores." : "You closed mid-card. I'll keep your chip. No hard feelings.", "laugh", "tip"), 900); }
  requestAnimationFrame(frame);
})();
