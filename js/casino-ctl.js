/* Geolite - controles de los juegos del casino (v0.2.53): mantener = TODO al doble, SALTAR = ir directo al resultado.
   Un solo modulo para los 8 juegos (Moneda, Ruleta de premios, Rojo o negro, Trile, Dados, Plinko, Globo, Rasca): cada juego lo monta con A.casCtl.attach(capa, ganchos).
   COMO ACELERA: no toca el codigo de los juegos. Mientras hay una capa de casino abierta hay un RELOJ VIRTUAL: performance.now(), el tiempo que reciben los
   requestAnimationFrame y los setTimeout/setInterval creados en ese rato corren a la velocidad del momento (x1, x2 al mantener, x14 al saltar); las animaciones CSS y
   las de la Web Animations API de la capa reciben el mismo playbackRate. Asi el crupier, los globos de texto, las particulas y los temporizadores van a una.
   COMO SALTA: acelera a x14 (y sin sonido) hasta que el juego avisa de que llega al resultado con ctl.outcome(); entonces vuelve a x1 y se ve el resultado entero.
   El resultado ya esta decidido y cobrado antes de animar, asi que saltar nunca cambia lo que pagas.
   Donde el juego espera al jugador (agitar, elegir, rascar, cobrar) llama ctl.waiting(true): los botones se esconden y la velocidad vuelve a x1. */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const N = { now: performance.now.bind(performance), st: window.setTimeout.bind(window), ct: window.clearTimeout.bind(window), si: window.setInterval.bind(window), ci: window.clearInterval.bind(window),
    raf: window.requestAnimationFrame.bind(window) };                                          // los nativos, guardados antes de tocar nada
  const FF = 14, TXT = {
    skip: A.L6("Saltar|Skip|Passer|Pular|Überspringen|Salta||跳过|건너뛰기|スキップ|Пропустить|Pomiń"),
    skipTip: A.L6("Saltar al resultado|Skip to the result|Passer au résultat|Pular para o resultado|Zum Ergebnis springen|Salta al risultato||跳到结果|결과로 건너뛰기|結果へスキップ|Перейти к результату|Przejdź do wyniku"),
    ffTip: A.L6("Mantén pulsado: ×2 de velocidad|Hold: double speed|Maintiens : vitesse ×2|Segure: velocidade ×2|Gedrückt halten: doppeltes Tempo|Tieni premuto: velocità ×2|Mantén presionado: ×2 de velocidad|按住：2 倍速|길게 누르면 2배속|長押しで2倍速|Удерживай: скорость ×2|Przytrzymaj: prędkość ×2"),
  };

  /* ------------------------------------------------------------------ el reloj virtual */
  let installed = false, speed = 1, vt = 0, rt = 0, active = 0, cur = null, armed = 0, armedDue = Infinity, tid = 1e9, rateOn = false;
  const timers = new Map();
  const sync = () => { const n = N.now(); vt += (n - rt) * speed; rt = n; return vt; };
  function arm() {
    let min = Infinity; timers.forEach(t => { if (t.due < min) min = t.due; });
    if (min === Infinity) { if (armed) { N.ct(armed); armed = 0; armedDue = Infinity; } return; }
    if (armed && armedDue <= min) return;                                                      // ya hay uno que despierta antes
    if (armed) N.ct(armed);
    armedDue = min; armed = N.st(runDue, Math.max(0, (min - sync()) / speed));
  }
  function runDue() {
    armed = 0; armedDue = Infinity; const now = sync(), due = [];
    timers.forEach((t, id) => { if (t.due <= now) due.push([id, t]); }); due.sort((a, b) => a[1].due - b[1].due);
    for (const [id, t] of due) {
      if (!timers.has(id)) continue;                                                           // lo cancelo un temporizador anterior de esta misma tanda
      if (t.every) { t.due += t.every; if (t.due < now - t.every * 4) t.due = now + t.every; } else timers.delete(id);
      try { t.fn(...t.a); } catch (e) { try { console.error(e); } catch (x) { /* nada */ } }
    }
    arm();
  }
  function install() {
    if (installed) return; installed = true; rt = N.now(); vt = rt;
    performance.now = () => sync();
    window.requestAnimationFrame = cb => N.raf(() => cb(sync()));
    window.setTimeout = function (fn, ms, ...a) {
      if (!active || typeof fn !== "function") return N.st(fn, ms, ...a);
      const id = ++tid; timers.set(id, { fn, a, due: sync() + Math.max(0, +ms || 0), every: 0 }); arm(); return id;
    };
    window.setInterval = function (fn, ms, ...a) {
      if (!active || typeof fn !== "function") return N.si(fn, ms, ...a);
      const id = ++tid, every = Math.max(4, +ms || 0); timers.set(id, { fn, a, due: sync() + every, every }); arm(); return id;
    };
    const clr = nat => function (id) { if (timers.has(id)) timers.delete(id); else nat(id); };
    window.clearTimeout = clr(N.ct); window.clearInterval = clr(N.ci);
  }
  function rateTick() {                                                                        // las animaciones de la capa (CSS y WAAPI) siguen el mismo ritmo
    const ov = cur && cur.ov;
    if (ov && ov.isConnected) { try { for (const a of ov.getAnimations({ subtree: true })) if (a.playbackRate !== speed) a.playbackRate = speed; } catch (e) { /* nada */ } }
    if (speed !== 1) N.raf(rateTick); else rateOn = false;
  }
  function setSpeed(v) {
    if (v === speed) return; sync(); speed = v; arm();
    if (!rateOn) { rateOn = true; N.raf(rateTick); }
  }

  /* ------------------------------------------------------------------ el dibujo de los iconos: pixel art, un rect por fila */
  const TRI = [1, 2, 3, 4, 5, 4, 3, 2, 1];
  const rows = (cols) => TRI.map((w, i) => { let d = ""; cols.forEach(([x0, kind]) => { if (kind === "t") d += `M${x0} ${i}h${w}v1h-${w}z`; else d += `M${x0} ${i}h${kind}v1h-${kind}z`; }); return d; }).join("");
  const ICON = {
    ff: { w: 11, d: rows([[0, "t"], [6, "t"]]) },                                              // dos flechas
    skip: { w: 8, d: rows([[0, "t"], [6, 2]]) },                                             // flecha + barra
  };
  const svg = k => `<svg class="cc-ic" viewBox="0 0 ${ICON[k].w} 10" shape-rendering="crispEdges" aria-hidden="true"><path class="sh" transform="translate(0 1)" d="${ICON[k].d}"/><path class="fg" d="${ICON[k].d}"/></svg>`;

  /* ------------------------------------------------------------------ el dock de botones de una capa */
  function attach(ov, hooks) {
    if (!ov) return null; install(); active++;
    const tx = o => A.tx(o);
    const dock = document.createElement("div"); dock.className = "cc-dock"; dock.dataset.st = "play";
    dock.innerHTML = `<button class="cc-btn cc-ff" type="button" title="${tx(TXT.ffTip)}" aria-label="${tx(TXT.ffTip)}">${svg("ff")}<b>×2</b></button>`
      + `<button class="cc-btn cc-skip" type="button" title="${tx(TXT.skipTip)}" aria-label="${tx(TXT.skipTip)}">${svg("skip")}<span>${tx(TXT.skip)}</span></button>`;
    ov.appendChild(dock); dock.addEventListener("animationend", e => { if (e.target === dock) dock.classList.add("shown"); });
    const ffB = dock.querySelector(".cc-ff"), skB = dock.querySelector(".cc-skip");
    const S = { ov, hooks: hooks || {}, st: "play", held: false, latch: false, ff: false, saved: null, dead: false };
    const fit = () => { const s = Math.max(2, Math.min(4, Math.round(innerHeight / 270))); dock.style.setProperty("--s", s); dock.style.setProperty("--r", s >= 4 ? 3 : 2); dock.style.setProperty("--u", s >= 4 ? 3 : 2); };
    fit(); addEventListener("resize", fit);

    const mute = on => {                                                                       // saltando no suena nada (todo el sonido se amontonaria): se restaura en cuanto vuelve a x1
      try { if (on && S.saved == null) { S.saved = A.audio.vol.sfx; A.audio.setVol("sfx", 0); } else if (!on && S.saved != null) { A.audio.setVol("sfx", S.saved); S.saved = null; } } catch (e) { /* sin audio */ }
    };
    const update = () => {
      if (S.dead) return;
      if (S.ff && S.st === "wait") S.ff = false;                                               // el juego espera al jugador: se acabo la prisa
      const eff = S.st !== "play" ? 1 : S.ff ? FF : (S.held || S.latch) ? 2 : 1;
      if (cur === S) setSpeed(eff); mute(eff === FF);
      dock.dataset.st = S.st; dock.classList.toggle("is-fast", eff === 2); dock.classList.toggle("is-ff", eff === FF);
      ffB.classList.toggle("on", eff === 2); skB.classList.toggle("on", eff === FF);
    };
    cur = S;
    const press = () => { if (S.st !== "play" || S.ff) return; S.held = true; S.t0 = N.now(); update(); };
    const release = () => {
      if (!S.held) return; S.held = false;
      if (S.padTap && N.now() - S.t0 < 260) S.latch = !S.latch;                                // con mando el clic es instantaneo: un toque fija el x2, otro lo suelta
      update();
    };
    ffB.addEventListener("pointerdown", e => { if (e.button > 0) return; e.preventDefault(); e.stopPropagation(); S.padTap = e.pointerType !== "touch" && !!(A.mando && A.mando.on); try { ffB.setPointerCapture(e.pointerId); } catch (x) { /* sintetico */ } press(); });
    ffB.addEventListener("pointerup", e => { e.stopPropagation(); release(); }); ffB.addEventListener("pointercancel", release); ffB.addEventListener("lostpointercapture", release);
    ffB.addEventListener("contextmenu", e => e.preventDefault());
    const skip = () => {
      if (S.st !== "play" || S.ff) return; S.ff = true; S.held = false; S.latch = false;
      try { if (S.hooks.skip) S.hooks.skip(); } catch (e) { try { console.error(e); } catch (x) { /* nada */ } }
      update();
    };
    skB.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); });
    skB.addEventListener("click", e => { e.stopPropagation(); skip(); });
    dock.addEventListener("click", e => e.stopPropagation());                                  // nada de esto cierra la capa (tocar la pantalla la cierra al acabar)
    const onKey = e => { if (S.st !== "play") return; if (e.key === "Shift") { if (!e.repeat) press(); } else if (e.key === "Escape") { e.preventDefault(); skip(); } };
    const onKeyUp = e => { if (e.key === "Shift") release(); };
    const onBlur = () => { S.held = false; update(); };
    addEventListener("keydown", onKey, true); addEventListener("keyup", onKeyUp, true); addEventListener("blur", onBlur);

    const destroy = () => {
      if (S.dead) return; S.dead = true; active = Math.max(0, active - 1); mute(false); if (cur === S) { cur = null; setSpeed(1); }
      removeEventListener("keydown", onKey, true); removeEventListener("keyup", onKeyUp, true); removeEventListener("blur", onBlur); removeEventListener("resize", fit); N.ci(wd);
      dock.remove();
    };
    const wd = N.si(() => { if (!ov.isConnected) destroy(); }, 250);                           // si otra pantalla se lleva la capa, no se queda el sonido callado ni el reloj acelerado
    const api = {
      waiting(on) { if (S.dead || S.st === "done") return; S.st = on ? "wait" : "play"; if (on) S.latch = false; update(); },   // el juego espera una accion del jugador: sin botones y a x1
      outcome() { if (S.dead || S.st === "done") return; S.st = "done"; S.ff = S.held = S.latch = false; update(); },             // llega el resultado: se ve entero y a x1
      destroy, get fast() { return speed; },
    };
    return api;
  }

  A.casCtl = { attach, install, FF, get speed() { return speed; } };
})(window.AIQ);
