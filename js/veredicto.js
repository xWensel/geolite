/*
 * Geolite - EL VEREDICTO QUE COBRA (paquete «Veredicto, jefe y cofre» del Probador, aprobado en su segunda ronda, preset EXTREMA; maqueta:
 * geolite-art-tools/probador/src/fx/ver-caja.js, ver-llamas.js y ver-base.js). Sobre el ticket de caja de siempre (js/game.js, verdict()):
 *  - LA CAJA REGISTRADORA (ver-caja): el ticket sube de la ranura a pasos, una linea cada vez, con su curva al salir; cada sumando es un rodillo
 *    (los del revelado: A.par.rueda) que gira y encaja con su clac; el contador de laton del cartel suma cada lugar y la barra de la meta se llena
 *    con el; al encajar el total suena el timbre (dos con margen holgado; con margen aplastante, ademas el cajon que se abre con fichas y temblor),
 *    se arranca el papel y cae el sello (js/celebra.js: hunde el ticket, la tinta se corre y la lampara sube).
 *  - POR LOS PELOS (ver-ajustado): si ganas por menos de un 5 %, las cifras del ticket ya estan puestas; la barra se llena ficha a ficha, cada vez
 *    mas despacio; la ultima se queda dudando en el borde de la meta, la sala baja la luz y late; al caer, la barra pasa a laton, timbre y sello.
 *  - LA PUNTUACION ARDE (ver-llamas): si acabas en racha (2 o mas) y con un margen de +25 % o mas, el total del ticket prende con LA LLAMA DE LA
 *    RACHA del juego (assets/icons/a_flame_s.webp, la del recuadro PUNTOS x RACHA): 1, 2 o 3 llamas segun la racha y escala entera x1, x2 o x3
 *    segun racha y margen; el total se lee encima en tinta oscura con contorno de papel.
 * Nada flota ni salta: todo vive en el ticket, la barra y el contador. El crupier (a la derecha) no recibe ninguna luz ni sombra: la llama alumbra
 * solo el papel y la sala que baja va por debajo del veredicto. Movimiento Minimo: el estado final, quieto (ticket entero, cifras puestas,
 * contador en su total, barra llena, sello puesto, la llama en un fotograma). Vibracion = no: sin temblor ni mando.
 *
 *   A.veredicto.monta({ vd, kind, meter, stats, superada, streak }) -> { stats: true (las cifras las ruedan aqui), selloMs } | null
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  /* el preset Extrema de la maqueta */
  const CJ = { ritmo: 0.9, papel: "linea", tiembla: true };                                 // ver-caja
  const AJ = { duda: 1.2, frena: 1, sala: 0.5, latido: true };                              // ver-ajustado
  const LL = { tope: 3, aviva: true, golpe: true, luz: 1.25 };                              // ver-llamas
  const cls = () => document.documentElement.classList;
  const quieto = () => cls().contains("reduce-motion");
  const temblor = () => !cls().contains("no-shake") && !quieto() && !(A.core && A.core.S && A.core.S.shake === false);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeIO = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const easeOut = u => 1 - Math.pow(1 - u, 3);
  const son = (k, ...a) => { try { if (A.sfx && A.sfx[k]) A.sfx[k](...a); } catch (e) { /* audio no listo */ } };
  const vib = (s, w, ms) => { try { if (A.haptic && A.haptic.dual) A.haptic.dual(s, w, ms); else if (A.haptic) A.haptic(Math.round(ms * 0.6)); } catch (e) { /* sin vibracion */ } };
  const golpe = n => { if (temblor() && A.core && A.core.jpShake) A.core.jpShake(Math.max(1, Math.min(3, n))); };
  const dpr = () => devicePixelRatio || 1;
  const zoomOf = el => { const r = el.getBoundingClientRect(); return el.offsetHeight ? r.height / el.offsetHeight : 1; };
  const escala = () => (innerHeight * dpr()) / 1080;                                         // px del dispositivo por px de la maqueta (1080p)

  /* ================================================================ pixel art: cifras 5x7 de la casa y el contador de laton (ver-base.js) */
  const GL5 = {
    "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."], "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"], "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
    "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."], "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
    "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."], "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
    "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."], "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  };
  class Contador {
    constructor(N, k) {
      this.N = N; this.k = k; this.W = 9 * N + 4; this.H = 17; this.pos = new Array(N).fill(0); this.anim = []; this.val = 0;
      const c = (this.bez = document.createElement("canvas")); c.width = this.W * k; c.height = (this.H + 1) * k; const g = c.getContext("2d");
      const P = (x, y, col) => { g.fillStyle = col; g.fillRect(x * k, y * k, k, k); }, W = this.W, H = this.H;
      for (let x = 1; x < W - 1; x++) P(x, H, "#0a0a0c");                                     // sombra dura (la lampara esta arriba)
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if ((x === 0 || x === W - 1) && (y === 0 || y === H - 1)) continue;
        let col;
        if (x === 0 || x === W - 1 || y === 0 || y === H - 1) col = "#1d0a3d";
        else if (y === 1) col = x === 1 || x === W - 2 ? "#fdd742" : "#fff3b0";
        else if (y === H - 2) col = "#c46a1b";
        else if (x === 1) col = "#fdd742";
        else if (x === W - 2) col = "#c46a1b";
        else col = "#f5a623";
        P(x, y, col);
      }
      for (let j = 0; j < N; j++) {
        const x0 = 3 + j * 9;
        for (let x = x0 - 1; x <= x0 + 7; x++) { P(x, 2, "#6e3414"); P(x, 14, x === x0 - 1 || x === x0 + 7 ? "#f5a623" : "#fdd742"); }
        for (let y = 3; y <= 13; y++) { P(x0 - 1, y, "#c46a1b"); P(x0 + 7, y, "#fdd742"); }
        g.clearRect(x0 * k, 3 * k, 7 * k, 11 * k);
      }
      P(1, 8, "#fff3b0"); P(W - 2, 8, "#6e3414");                                             // dos remaches
    }
    set(v) { this.val = v; const s = String(Math.max(0, Math.floor(v))).padStart(this.N, "0").slice(-this.N); for (let i = 0; i < this.N; i++) this.pos[i] = +s[i]; this.anim = []; }
    /* rueda hasta v: cada rodillo hacia delante hasta su cifra, de derecha a izquierda */
    rodar(v, t, dur = 0.34, stag = 0.03) {
      const s = String(Math.max(0, Math.floor(v))).padStart(this.N, "0").slice(-this.N); this.anim = [];
      for (let i = 0; i < this.N; i++) {
        const from = this.pos[i], to = +s[i]; let dist = (to - ((Math.round(from) % 10) + 10) % 10 + 10) % 10;
        if (dist === 0 && v !== this.val && i >= this.N - 2) dist = 10;                       // las cifras bajas dan la vuelta aunque coincidan
        const ii = this.N - 1 - i;
        this.anim[i] = { from, d: dist, t0: t + ii * stag, t1: t + ii * stag + dur * (0.75 + 0.25 * Math.min(1, dist / 6)), done: dist === 0 };
      }
      this.val = v;
    }
    tick(t) {
      let clacs = 0;
      for (let i = 0; i < this.N; i++) {
        const a = this.anim[i]; if (!a) continue;
        if (t >= a.t1) { if (!a.done) { a.done = true; clacs++; } this.pos[i] = (a.from + a.d) % 10; a.e = t - a.t1; continue; }
        if (t < a.t0) continue;
        const u = (t - a.t0) / (a.t1 - a.t0); this.pos[i] = a.from + a.d * easeOut(u); a.v = a.d * 3 * Math.pow(1 - u, 2) / (a.t1 - a.t0);
      }
      return clacs;
    }
    shown() { return this.pos.reduce((a, d) => a * 10 + (((Math.round(d) % 10) + 10) % 10), 0); }
    draw(g, x, y, o = {}) {
      const k = this.k; g.imageSmoothingEnabled = false; g.drawImage(this.bez, x, y);
      const lead = (() => { let i = 0; while (i < this.N - 1 && Math.round(this.pos[i]) % 10 === 0 && !(this.anim[i] && !this.anim[i].done)) i++; return i; })();
      for (let j = 0; j < this.N; j++) {
        const wx = x + (3 + j * 9) * k, wy = y + 3 * k, a = this.anim[j];
        g.fillStyle = "#0a0a0c"; g.fillRect(wx, wy, 7 * k, 11 * k); g.fillStyle = "#1d0a3d"; g.fillRect(wx, wy + 2 * k, 7 * k, 7 * k);
        let p = this.pos[j]; if (a && a.done && a.e != null && a.e < 0.25 && !o.quieto) p += 0.09 * Math.sin(a.e * 50) * Math.exp(-a.e * 26);
        const fl = Math.floor(p), fr = p - fl, pitch = 11 * k, fast = a && !a.done && a.v > 9 && o.desenfoque, dim = j < lead;
        for (let n = -1; n <= 1; n++) {
          const gl = GL5[String((((fl + n) % 10) + 10) % 10)], gy = wy + 2 * k + Math.round((n - fr) * pitch);
          for (let r = 0; r < 7; r++) {
            const yy = gy + r * k; if (yy < wy || yy + k > wy + 11 * k) continue;
            const band = (yy - wy) / k;
            let col = band < 1 || band >= 10 ? "#3a2f58" : band < 2 || band >= 9 ? "#8a8fa8" : band < 3 || band >= 8 ? "#c9cde0" : "#f3f0fa";
            if (dim) col = band < 2 || band >= 9 ? "#3a2f58" : "#5c565b";
            if (fast) col = band < 2 || band >= 9 ? "#3a2f58" : "#8a8fa8";
            g.fillStyle = col; for (let i = 0; i < 5; i++) if (gl[r][i] === "#") g.fillRect(wx + (1 + i) * k, yy, k, k);
          }
          if (fast) {                                                                          // estela: la cifra se estira en columnas de 1 px de arte
            g.fillStyle = "#5c565b";
            for (let i = 0; i < 5; i++) { let any = false; for (let r = 0; r < 7; r++) if (gl[r][i] === "#") any = true; if (!any) continue;
              for (let r = -2; r < 9; r++) { const yy = gy + r * k; if (yy < wy + k || yy + k > wy + 10 * k) continue; if (r >= 0 && r < 7 && gl[r][i] === "#") continue; if ((r + i) % 2) g.fillRect(wx + (1 + i) * k, yy, k, k); } }
          }
        }
      }
    }
  }

  /* ================================================================ la llama de la racha (ver-llamas) */
  const LLAMA = (() => { const im = new Image(); im.decoding = "async"; im.src = "assets/icons/a_flame_s.webp"; return im; })();
  let LLC = null;
  const llamaSpr = () => {
    if (LLC) return LLC; if (!LLAMA.complete || !LLAMA.naturalWidth) return null;
    const mk = flip => { const c = document.createElement("canvas"); c.width = c.height = 32; const q = c.getContext("2d"); q.imageSmoothingEnabled = false; if (flip) { q.translate(32, 0); q.scale(-1, 1); } q.drawImage(LLAMA, 0, 0, 32, 32); return c; };
    return (LLC = { a: mk(false), b: mk(true) });
  };
  const lvOf = n => (n >= 6 ? 3 : n >= 4 ? 2 : 1);                                               // como el ticket de la ronda
  const pasoM = m => (m >= 200 ? 3 : m >= 100 ? 2 : m >= 25 ? 1 : 0);                          // margen (%) -> escalon
  const RIT = [[0.36, 0], [0.44, 0.2], [0.4, 0.1]];                                             // periodo y adelanto de cada llama (como en partida)
  const grupo = (n, p, s) => {
    const km = Math.max(1, Math.round(p * s)), ks = Math.max(1, Math.round(Math.max(1, p - 1) * s));
    if (n === 1) return [{ k: km, dx: 0, up: 0, ri: 1 }];
    if (n === 2) { const d = p === 1 ? 16 * km : 11 * km; return [{ k: km, dx: -d, up: 0, ri: 0 }, { k: km, dx: d, up: 0, ri: 2 }]; }
    if (p === 1) return [{ k: km, dx: -30 * km, up: 0, ri: 0 }, { k: km, dx: 0, up: 6 * km, ri: 1 }, { k: km, dx: 30 * km, up: 0, ri: 2 }];
    const d = 12 * km + 8 * ks;
    return [{ k: ks, dx: -d, up: 0, ri: 0 }, { k: ks, dx: d, up: 0, ri: 2 }, { k: km, dx: 0, up: 0, ri: 1 }];
  };
  /* donde esta la tinta de las cifras de un elemento (su caja de letra: arriba y abajo de los numeros), en px de pantalla */
  function tinta(el) {
    const box = el.querySelector(".odo") || el, r = box.getBoundingClientRect(), cs = getComputedStyle(box), fs = parseFloat(cs.fontSize) || 40;
    const g = document.createElement("canvas").getContext("2d"); g.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    const m = g.measureText("0123456789"), z = r.height / fs || 1;                       // la caja del rodillo mide 1em (zoom incluido)
    const fA = m.fontBoundingBoxAscent || fs * 0.8, fD = m.fontBoundingBoxDescent || fs * 0.2, base = r.top + ((fs - (fA + fD)) / 2 + fA) * z;
    return { top: base - (m.actualBoundingBoxAscent || fs * 0.57) * z, bottom: base + (m.actualBoundingBoxDescent || 0) * z, left: r.left, right: r.right };
  }

  /* ================================================================ montar el veredicto */
  let vivo = null;
  function monta(o = {}) {
    if (vivo) vivo.fin();
    const vd = o.vd; if (!vd || !vd.isConnected) return null;
    const tk = vd.querySelector(".gx-vd-ticket"), mid = vd.querySelector(".gx-vd-mid"); if (!tk || !mid) return null;
    const red = quieto(), meter = o.meter && o.meter[1] > 1 ? o.meter : null, gana = o.kind === "ok";
    const pts = meter ? meter[0] : 0, goal = meter ? meter[1] : 0, margen = meter && goal ? (pts - goal) / goal : 0;
    const ajustado = gana && meter && pts >= goal && margen < 0.05;
    const tier = clamp(o.superada | 0 || 1, 1, 3);
    vd.classList.add("vdx"); if (ajustado) vd.classList.add("vdx-aj");
    const R = CJ.ritmo, sec = u => u / R;                                                      // la linea de tiempo va a ritmo 1 (la de la maqueta); en segundos, / ritmo

    /* ---------------- las lineas del ticket: cada una, cuando sale de la ranura y que cifra rueda */
    const z = zoomOf(tk), tkR = tk.getBoundingClientRect(), loc = y => (y - tkR.top) / z;
    const filas = [...tk.querySelectorAll(".gx-lead-row")];
    const th = tk.querySelector(".gx-vd-th"), stamp = tk.querySelector(".gx-vd-stamp");
    const valorDe = (row, i) => {
      const b = row.querySelector(":scope > b"); if (!b) return null;
      if (/^vs\d+$/.test(b.id)) { const v = o.stats && o.stats[+b.id.slice(2)]; return v && typeof v[1] === "number" ? { b, el: b, v: Math.round(v[1]) } : null; }
      const tx = b.textContent.trim(), m = /^([+−\-–]?)\s*([\d.,\s  ]+)$/.exec(tx); if (!m) return null;
      const v = parseInt(m[2].replace(/\D/g, ""), 10); if (!isFinite(v)) return null;
      b.textContent = ""; if (m[1]) b.append(m[1]); const sp = document.createElement("span"); sp.className = "odo"; b.append(sp);
      return { b, el: sp, v };
    };
    /* agrupar por linea (en dos columnas, las dos filas de una linea salen juntas) */
    const lineas = [];
    filas.forEach((row, i) => {
      const r = row.getBoundingClientRect(), bot = loc(r.bottom), last = lineas[lineas.length - 1];
      const it = { row, big: row.classList.contains("big"), place: false, val: valorDe(row, i) };
      if (last && Math.abs(last.bot - bot) < 3) last.items.push(it); else lineas.push({ bot, items: [it] });
    });
    /* solo los lugares cuentan para el contador (el primer bloque de filas, si viene antes del total) */
    const bigIdx = lineas.findIndex(l => l.items.some(x => x.big));
    lineas.forEach((l, i) => l.items.forEach(x => { x.place = bigIdx > 0 && i < bigIdx; }));
    const fin = tk.offsetHeight, head = th ? loc(th.getBoundingClientRect().bottom) + 8 : 40;
    /* tiempos (ritmo 1): lugares cada 0,17 s; el total, 0,2 s despues; tras el total 0,26 y luego 0,14 por linea; se arranca y cae el sello */
    let tt = 0.12;
    lineas.forEach((l, i) => {
      if (i > 0) { const prev = lineas[i - 1]; tt += prev.items.some(x => x.big) ? 0.26 : l.items.some(x => x.big) ? 0.2 : i < bigIdx ? 0.17 : 0.14; }
      l.at = tt; l.feed = Math.min(fin, l.bot + 7);
      l.items.forEach(x => { if (x.val) { const len = String(x.val.v).length; x.ms = (x.big ? 0.42 + 0.05 * len : 0.24 + 0.03 * len); x.t0 = l.at + 0.07; x.lock = x.t0 + x.ms; } });
    });
    const lastAt = lineas.length ? lineas[lineas.length - 1].at : 0.12;
    const T = { tear: lastAt + 0.16, sello: lastAt + 0.3 };
    const bigIt = (lineas[bigIdx] || { items: [] }).items.find(x => x.big);

    /* ---------------- el contador de laton (si el cartel dice «puntos / meta») y la barra */
    const lead = vd.querySelector(".gx-vd-head .gx-lead"), meterEl = vd.querySelector(".gx-vd-meter"), fillEl = meterEl && meterEl.querySelector("i");
    let ctr = null, ctrCv = null, ctrG = null;
    if (meter && lead && lead.textContent.trim() === `${A.fmt(pts)} / ${A.fmt(goal)}`) {
      const N = Math.max(4, String(Math.floor(pts)).length), k = Math.max(1, Math.round(3 * escala()));
      ctr = new Contador(N, k); ctr.set(0);
      lead.textContent = ""; lead.classList.add("vdx-lead");
      ctrCv = document.createElement("canvas"); ctrCv.className = "vdx-ctr"; ctrCv.width = ctr.W * k; ctrCv.height = (ctr.H + 1) * k;
      const zl = zoomOf(vd.querySelector(".gx-vd-head")) || 1; ctrCv.style.width = (ctrCv.width / dpr() / zl) + "px"; ctrCv.style.height = (ctrCv.height / dpr() / zl) + "px";
      const meta = document.createElement("span"); meta.className = "vdx-meta"; meta.textContent = "/ " + A.fmt(goal);
      lead.append(ctrCv, meta); ctrG = ctrCv.getContext("2d");
    }
    const top = meter ? Math.max(pts, goal) : 1, gf = meter ? goal / top : 1;
    let barV = 0, barFrom = 0, barTo = 0, barT0 = 0, barMs = 0.3;
    const barra = (v, u, ms = 0.3) => { barFrom = barV; barTo = v; barT0 = u; barMs = ms; };
    if (meterEl) meterEl.classList.remove("full");

    /* ---------------- la llama (si arde) */
    const racha = o.streak | 0, mPct = margen * 100;
    const llN = gana && racha >= 2 && pasoM(mPct) >= 1 && bigIt && bigIt.val ? lvOf(racha) : 0, llPaso = llN ? Math.max(1, Math.min(LL.tope, llN, pasoM(mPct))) : 0;
    let llCv = null, llG = null, llSig = "", llIgn = -1, llLast = -1;

    /* ---------------- el estado de partida */
    const ranura = document.createElement("i"); ranura.className = "vdx-ranura"; ranura.setAttribute("aria-hidden", "true");
    let sala = null;
    if (!red && !ajustado) { mid.appendChild(ranura); mid.classList.add("vdx-feed"); }
    lineas.forEach(l => l.items.forEach(x => { if (x.val) { x.val.el.classList.add("odo"); if (!red && !ajustado) x.val.b.style.visibility = "hidden"; } }));
    /* el sello: su golpe cae en su momento (el CSS lo lee de --vdx-sello) */
    let selloS = sec(T.sello);
    /* POR LOS PELOS: el plan de fichas */
    let PL = null;
    if (ajustado) {
      const ajT = margen < 0.01 ? 1 : margen < 0.03 ? 2 : 3, NS = 12, steps = []; let at = 0.1;
      const gfp = goal / pts;                                                                 // la meta en la barra del ajustado (la barra entera = tus puntos)
      for (let i = 1; i <= NS; i++) { const x = i / NS, frac = gfp * (1 - Math.pow(1 - x, 1.7)) * 0.985; at += 0.045 + (0.04 + 0.24 * AJ.frena) * Math.pow(x, 3); steps.push({ at, frac }); }
      const dudaAt = at + 0.06 + 0.08 * AJ.frena, cae = dudaAt + AJ.duda * [1.25, 1, 0.7][ajT - 1];
      PL = { steps, dudaAt, cae, gfp, ajT };
      selloS = cae + 0.42;
    }
    vd.style.setProperty("--vdx-sello", (red ? 0 : selloS).toFixed(2) + "s");

    /* la sala contiene la respiracion (ajustado): una penumbra por debajo del veredicto, nunca sobre el crupier, el ticket ni el cartel */
    if (PL && !red) {
      const lay = document.getElementById("layer"), dlg = document.getElementById("dlg");
      if (lay && dlg && dlg.parentNode === lay) {
        sala = document.createElement("i"); sala.className = "vdx-sala"; sala.setAttribute("aria-hidden", "true");
        const hd = vd.querySelector(".gx-vd-head"), hr = hd && hd.getBoundingClientRect();
        if (hr) { sala.style.setProperty("--cx", ((hr.left + hr.width / 2) / innerWidth * 100).toFixed(1) + "%"); sala.style.setProperty("--cy", ((hr.top + hr.height * 0.6) / innerHeight * 100).toFixed(1) + "%"); }
        lay.insertBefore(sala, dlg);
      }
    }
    /* el lienzo de la barra (las fichas de canto y la que duda) */
    let barCv = null, barG = null;
    if (PL && meterEl) { barCv = document.createElement("canvas"); barCv.className = "vdx-barcv"; barCv.setAttribute("aria-hidden", "true"); meterEl.appendChild(barCv); barG = barCv.getContext("2d"); }

    const t0 = performance.now(); let lastU = -1, raf = 0, done = false, timbre = false;
    const cross = (u, x) => lastU < x && u >= x;
    /* ---------------- un fotograma */
    function frame(now) {
      raf = 0;
      if (!vd.isConnected) return api.fin();
      const u = red ? 99 : ((now - t0) / 1000) * R;
      /* el papel: hasta donde ha salido */
      if (!red && !ajustado) {
        let f = head;
        for (let i = 0; i < lineas.length; i++) { const l = lineas[i], a = l.at; if (u >= a) { const p0 = i ? lineas[i - 1].feed : head; f = u < a + 0.08 ? p0 + (l.feed - p0) * easeIO((u - a) / 0.08) : l.feed; } }
        if (u >= T.tear - 0.1) f = Math.max(f, lineas.length ? lineas[lineas.length - 1].feed + (fin - lineas[lineas.length - 1].feed) * easeIO(clamp((u - T.tear + 0.1) / 0.1, 0, 1)) : fin);
        const dy = Math.max(0, fin - f);
        tk.style.transform = dy > 0.5 ? `translateY(${dy.toFixed(2)}px)` : "";
        if (dy <= 0.5 && mid.classList.contains("vdx-feed")) { mid.classList.remove("vdx-feed"); ranura.remove(); }
        /* sonidos y rodillos al cruzar su instante */
        if (lastU >= 0) lineas.forEach(l => { if (cross(u, l.at)) son("caja", "papel", 0.7); });
      }
      {
        lineas.forEach((l, li) => l.items.forEach(x => {
          if (!x.val) return;
          if (red || ajustado) { if (!x.ok) { x.ok = 1; A.par && A.par.rueda ? A.par.rueda(x.val.el, x.val.v, { instant: true, from: x.val.v }) : (x.val.el.textContent = A.fmt(x.val.v)); } return; }
          if (!x.ok && u >= x.t0) {
            x.ok = 1; x.val.b.style.visibility = "";
            if (A.par && A.par.rueda) A.par.rueda(x.val.el, x.val.v, { from: 0, ms: Math.round(sec(x.ms) * 1000), row: Math.min(6, li), tick: x.big }); else x.val.el.textContent = A.fmt(x.val.v);
          }
          if (!x.lk && u >= x.lock) {
            x.lk = 1;
            if (x.place && ctr) { const sum = lineas.slice(0, bigIdx).reduce((a, L2) => a + L2.items.filter(y => y.lk && y.val).reduce((b, y) => b + y.val.v, 0), 0); ctr.rodar(Math.min(pts, sum), u, 0.3); }
            if (x.place && !ctr && meter) { const sum = lineas.slice(0, bigIdx).reduce((a, L2) => a + L2.items.filter(y => y.lk && y.val).reduce((b, y) => b + y.val.v, 0), 0); barra(Math.min(pts, sum) / top, u); }
            if (x.big) {
              if (ctr) ctr.rodar(pts, u, 0.32); else if (meter) barra(pts / top, u);
              if (gana && !timbre) { timbre = true; son("caja", "timbre", tier); vib(0.3 + 0.2 * tier, 0.2, 140 + 60 * tier); if (CJ.tiembla && tier === 3) golpe(2); }
              if (llN) llIgn = u;
            }
          }
        }));
        if (!red && !ajustado && lastU >= 0 && cross(u, T.tear)) son("caja", "corte");
      }
      /* POR LOS PELOS */
      if (PL) {
        const pl = PL;
        if (!red && lastU >= 0) {
          pl.steps.forEach((s, i) => { if (cross(u, s.at)) { son("caja", "ficha", i > pl.steps.length - 5 ? 1 : 2); if (ctr) ctr.rodar(Math.round(pts * s.frac), u, 0.12 + 0.2 * (i / pl.steps.length)); vib(0.08 + 0.02 * i / 3, 0.05, 30); } });
          if (cross(u, pl.dudaAt) && AJ.latido) { son("aliento"); if (pl.ajT === 1) setTimeout(() => { if (vd.isConnected) son("aliento"); }, 520); }
          if (cross(u, pl.cae)) { son("caja", "ficha", 1); son("caja", "clac", 1.2); if (ctr) ctr.rodar(pts, u, 0.32); son("caja", "timbre", pl.ajT === 1 ? 2 : 1); vib(0.5, 0.3, 220); golpe(1); }
        }
        let frac = 0; for (const s of pl.steps) if (u >= s.at) frac = s.frac;
        const cayo = red || u >= pl.cae;
        barV = cayo ? 1 : frac;
        if (sala) { const dk = AJ.sala * sm(pl.dudaAt - 0.25, pl.dudaAt + 0.15, u) * (1 - sm(pl.cae, pl.cae + 0.35, u)); sala.style.opacity = dk.toFixed(3); }
        if (red && ctr) ctr.set(pts);
        if (meterEl) { meterEl.classList.toggle("full", cayo); if (fillEl) { fillEl.style.width = (barV * 100).toFixed(2) + "%"; } const em = meterEl.querySelector("em"); if (em) em.style.left = (pl.gfp * 100).toFixed(2) + "%"; }
        if (barG) pintaFichas(u, frac, cayo);
      } else if (meterEl) {
        if (red) barV = pts / top; else if (ctr) barV = Math.min(pts, ctr.shown()) / top; else { const e = clamp((u - barT0) / barMs, 0, 1); barV = barFrom + (barTo - barFrom) * easeOut(e); }
        if (fillEl) fillEl.style.width = (barV * 100).toFixed(2) + "%";
        meterEl.classList.toggle("full", barV >= gf - 1e-4 && pts >= goal);
      }
      /* el contador de laton */
      if (ctr) {
        if (red) ctr.set(pts);
        const c = ctr.tick(u); if (c && !red) { son("caja", "clac", 0.8); vib(0.18, 0.1, 40); }
        ctrG.clearRect(0, 0, ctrCv.width, ctrCv.height); ctr.draw(ctrG, 0, 0, { quieto: red, desenfoque: true });
      }
      /* la llama */
      if (llN && (red || llIgn >= 0)) pintaLlama(now, u);
      lastU = u;
      const acabado = red || u > Math.max(T.sello, PL ? PL.cae + 0.5 : 0) + 0.6;
      if (acabado && !done) {
        done = true;
        if (!ajustado) { tk.style.transform = ""; mid.classList.remove("vdx-feed"); ranura.remove(); }
        if (sala) { sala.remove(); sala = null; }
        if (barCv && (red || u > PL.cae + 0.5)) { barCv.remove(); barCv = null; barG = null; }
      }
      if (!done || (llN && !red) || (ctr && !red && ctr.anim.some(a => a && !a.done))) raf = requestAnimationFrame(frame);
    }
    /* las fichas de canto en la barra y la ultima, que duda en el borde (pixel art, un px de arte entero) */
    function pintaFichas(u, frac, cayo) {
      const r = meterEl.getBoundingClientRect(), d = dpr(), pad = Math.round(12 * escala());
      const W = Math.round(r.width * d) + 2 * pad, H = Math.round(r.height * d) + 2 * pad, zl = zoomOf(meterEl) || 1;
      if (barCv.width !== W || barCv.height !== H) { barCv.width = W; barCv.height = H; barCv.style.width = W / d / zl + "px"; barCv.style.height = H / d / zl + "px"; barCv.style.left = barCv.style.top = -pad / d / zl + "px"; }
      const g = barG; g.clearRect(0, 0, W, H);
      const t = Math.max(1, Math.round(2 * zl * d)), ix0 = pad + t, iw = W - 2 * pad - 2 * t, iy0 = pad + t, ih = H - 2 * pad - 2 * t;
      const chipW = Math.max(6, Math.round(12 * escala())), fw = Math.round(iw * (cayo ? 1 : frac));
      g.fillStyle = cayo ? "rgba(110,52,20,0.55)" : "rgba(120,20,30,0.5)";
      for (let x = ix0 + chipW; x < ix0 + fw; x += chipW) g.fillRect(x - 1, iy0 + t, 1, ih - t);
      if (cayo || u < PL.dudaAt - 0.2) return;
      const e = u - (PL.dudaAt - 0.2), tilt = Math.sin(e * 9.5) * Math.min(1, e * 3) * 6 * escala();
      const x = ix0 + fw + 2, wob = Math.round(tilt), cw = chipW + 2;
      for (let rr = -2; rr < ih + 2; rr++) {
        const off = Math.round(wob * (1 - (rr + 2) / (ih + 4))), edge = rr < 0 || rr >= ih;
        g.fillStyle = "#1d0a3d"; g.fillRect(x + off - 1, iy0 + rr, cw + 2, 1);
        for (let i = 0; i < cw; i++) {
          const white = (Math.floor(rr / 3) + (i > cw / 2 ? 1 : 0)) % 2 === 0 && i > 1 && i < cw - 2;
          g.fillStyle = edge ? "#1d0a3d" : i === 0 ? "#ffa59b" : i === cw - 1 ? "#a8142e" : white ? "#f3f0fa" : "#e8283a";
          g.fillRect(x + off + i, iy0 + rr, 1, 1);
        }
      }
    }
    /* la llama sobre el total: escalones enteros que se avivan de uno en uno; el total encima en tinta oscura con contorno de papel */
    function pintaLlama(now, u) {
      const spr = llamaSpr(); if (!spr) return;
      const b = bigIt.val.b, s = escala(), d = dpr();
      let paso = llPaso;
      if (!red && LL.aviva) paso = Math.min(llPaso, 1 + Math.floor((u - llIgn) / R / 0.1));
      if (!red && paso !== llLast) {
        if (paso > Math.max(0, llLast)) { son("llama", paso); if (paso === llPaso && LL.golpe) { golpe(paso >= 3 ? 2 : 1); vib(0.2 + 0.12 * paso, 0.25 + 0.15 * paso, 160 + 60 * paso); } }
        llLast = paso;
      }
      if (!llCv) {
        llCv = document.createElement("canvas"); llCv.className = "vdx-llamas"; llCv.setAttribute("aria-hidden", "true"); tk.insertBefore(llCv, tk.firstChild); llG = llCv.getContext("2d");
        b.classList.add("vdx-arde"); tk.classList.add("vdx-arde-tk");
      }
      const tr = tk.getBoundingClientRect(), W = Math.round(tr.width * d), H = Math.round(tr.height * d), zl = zoomOf(tk) || 1;
      if (llCv.width !== W || llCv.height !== H) { llCv.width = W; llCv.height = H; llCv.style.width = tk.offsetWidth + "px"; llCv.style.height = tk.offsetHeight + "px"; llSig = ""; }
      /* el titileo: se da la vuelta y sube una celda a saltos; solo se repinta cuando cambia algo */
      const tq = red ? 1.3 : (now - t0) / 1000;
      const F = grupo(llN, paso, s), flips = F.map(f => !red && ((tq + RIT[f.ri][1]) / RIT[f.ri][0]) % 1 >= 0.5), tit = red ? 1 : 0.93 + 0.07 * (Math.floor(tq / 0.18) % 2);
      const sig = paso + ":" + flips.join() + ":" + tit + ":" + W + "x" + H; if (sig === llSig) return; llSig = sig;
      const ink = tinta(b), km = Math.max(1, Math.round(paso * s));
      const base = Math.round(paso >= 3 ? (ink.bottom - tr.top) * d + 5 * s : (ink.top - tr.top) * d + 7 * km);   // a x3 nace bajo la linea de las cifras; si no, asoma por encima y sus 7 ultimas filas quedan detras
      let gx0 = 1e9, gx1 = -1e9, gy0 = 1e9;
      for (const f of F) { gx0 = Math.min(gx0, f.dx - 12 * f.k); gx1 = Math.max(gx1, f.dx + 12 * f.k); gy0 = Math.min(gy0, -28 * f.k - f.up); }
      let cx = Math.round(((ink.left + ink.right) / 2 - tr.left) * d); const maxR = Math.floor(W - 6 * s);
      if (cx + gx1 > maxR) cx = maxR - gx1;
      const g = llG; g.clearRect(0, 0, W, H);
      /* la luz de la llama sobre el papel (calida; nunca sale del ticket: el crupier queda fuera) */
      const I = LL.luz * (0.35 + 0.22 * paso + 0.12 * llN) * tit, gcx = cx + (gx0 + gx1) / 2, gcy = base + gy0 * 0.38, rx = (gx1 - gx0) * 0.62 + 40 * s, ry = -gy0 * 0.78 + 30 * s;
      g.save(); g.translate(gcx, gcy); g.scale(1, ry / rx);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, `rgba(255,150,52,${(0.16 * I).toFixed(3)})`); gr.addColorStop(0.55, `rgba(255,150,52,${(0.07 * I).toFixed(3)})`); gr.addColorStop(1, "rgba(255,150,52,0)");
      g.fillStyle = gr; g.fillRect(-rx, -rx, 2 * rx, 2 * rx); g.restore();
      g.imageSmoothingEnabled = false;
      F.forEach((f, i) => g.drawImage(flips[i] ? spr.b : spr.a, cx + f.dx - 16 * f.k, base - 30 * f.k - f.up - (flips[i] ? f.k : 0), 32 * f.k, 32 * f.k));
    }
    const api = {
      stats: !!lineas.length, selloMs: Math.round(selloS * 1000),
      fin() { cancelAnimationFrame(raf); raf = 0; if (sala) sala.remove(); if (vivo === api) vivo = null; },
    };
    raf = requestAnimationFrame(frame);
    vivo = api;
    return api;
  }

  A.veredicto = { monta, Contador };
})(window.AIQ);
