/*
 * Geolite - la moneda y la ficha de oro de los contadores, dibujadas al pixel real (v0.4.3, maqueta «El contador de moneda», opcion B votada el 30-oct).
 *
 * La moneda de 64 de rejilla (assets/icons/coin) y la ficha de oro (ficha_oro) puestas a 24-40 px de pantalla pintaban medio pixel de arte por pixel de
 * pantalla: la estrella y el relieve se emborronaban y no casaban con los digitos (a 2 px por pixel) ni con el corazon de la barra (a 1:1). Aqui cada una
 * tiene su rejilla propia, la misma que usa el resto de la pieza, y se dibuja a un numero ENTERO de pixeles reales por pixel de arte (como js/ficha.js):
 *
 *   coin     16 x 18  moneda de los contadores de la esquina (doblones), a 2 px de diseno por pixel de arte
 *   coinHud  22 x 24  la misma a 1:1, la altura del corazon de la barra de la ronda
 *   chip     18 x 18  la ficha de oro (A.ficha.px blank_gold + una chistera de 6 x 4), para el monedero de la Tienda y del Club
 *
 *   A.moneda.html(kind, S, cls)  <canvas class="ic mn-cv" data-mn data-s> listo para insertar; S = pixeles de diseno por pixel de arte (por defecto 2)
 *   A.moneda.el(kind, S)    lo mismo, como elemento
 *   A.moneda.fit(cv)        lo dibuja a la medida exacta que ocupa en pantalla (se llama sola tras insertarlo, y al cambiar la ventana)
 *
 * La moneda es la de siempre (estrella, aro y canto rayado, luz de arriba, contorno #1d0a3d, solo geolite40): la rutina que se aprobo para sus versiones
 * pequenas, con la estrella mas grande en la de 22. La chistera de la ficha es provisional: la cara de Don Crupier no cabe a 18 px.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  "use strict";
  const PAL = { a: "#1d0a3d", b: "#ffd95a", c: "#c46a1b", d: "#f5a623", e: "#fff3b0", f: "#7f3a1a" };
  const SPR = {
    coin: [".....aaaaaa.....", "...aabbbbbbaa...", "..abbccccccbba..", ".abccddddddccba.", ".abcddddddddcba.", "abcddddeeddddcba", "abcdddeeeedddcba", "abcdbbbbbbbbdcba", "adcddbbbbbbddcda", "adcdddbbbbdddcda", "adcddbbddbbddcda", "acdcdccddccdcdca", "acdccddddddccdca", ".acddccccccddca.", ".acccddddddccca.", "..afccccccccfa..", "...aafcffcfaa...", ".....aaaaaa....."],
    coinHud: [".......aaaaaaaa.......", ".....aabbbbbbbbaa.....", "....abbccccccccbba....", "...abccddddddddccba...", "..abcddddddddddddcba..", ".abcddddddddddddddcba.", ".abcddddddeeddddddcba.", "abcdddddddeedddddddcba", "abcddddddbbbbddddddcba", "abcdddbbbbbbbbbbdddcba", "abcddddbbbbbbbbddddcba", "adcdddddbbbbbbdddddcda", "adcdddddbbbbbbdddddcda", "adcddddbbbddbbbddddcda", "adcddddbbddddbbddddcda", "acdcdddccddddccdddcdca", "acdcddddddddddddddcdca", ".acdcddddddddddddcdca.", ".accdccddddddddccdcca.", "..afcddccccccccddcfa..", "...acccddddddddccca...", "....afccccccccccfa....", ".....aafcfccfcfaa.....", ".......aaaaaaaa......."]
  };
  const HAT = [".####.", ".####.", ".bbbb.", "######"];
  const arts = {};
  function art(kind) {
    if (arts[kind]) return arts[kind];
    let cv;
    if (kind === "chip") {
      if (!A.ficha || !A.ficha.px) return null;
      const N = 18, px = A.ficha.px(N, "blank_gold"); cv = document.createElement("canvas"); cv.width = cv.height = N;
      const g = cv.getContext("2d"); g.putImageData(new ImageData(new Uint8ClampedArray(px), N, N), 0, 0);
      const ox = (N - 6) >> 1, oy = (N - 4) >> 1;
      for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) { const ch = HAT[r][q]; if (ch === ".") continue; g.fillStyle = ch === "b" ? "#c46a1b" : (q === 1 && r < 2 ? "#b06a34" : "#6e3414"); g.fillRect(ox + q, oy + r, 1, 1); }
    } else {
      const rows = SPR[kind]; if (!rows) return null;
      cv = document.createElement("canvas"); cv.width = rows[0].length; cv.height = rows.length; const g = cv.getContext("2d");
      rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== ".") { g.fillStyle = PAL[r[x]]; g.fillRect(x, y, 1, 1); } });
    }
    return (arts[kind] = cv);
  }
  /* la medida de diseno es w x h pixeles de arte por S; en pantalla, P pixeles reales por pixel de arte (entero) segun el zoom (--k) y la densidad */
  function fit(cv) {
    const kind = cv.dataset.mn, a = art(kind); if (!a) return;
    const S = +cv.dataset.s || 2, p = cv.offsetParent || cv.parentElement; if (!p || !p.offsetWidth) return;
    const z = p.getBoundingClientRect().width / p.offsetWidth || 1, d = devicePixelRatio || 1, P = Math.max(1, Math.round(S * z * d)), key = kind + P;
    if (cv._mn === key) return; cv._mn = key;
    cv.width = a.width * P; cv.height = a.height * P;
    cv.style.width = (a.width * P / (z * d)) + "px"; cv.style.height = (a.height * P / (z * d)) + "px";
    const g = cv.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(a, 0, 0, cv.width, cv.height);
  }
  const live = document.getElementsByClassName("mn-cv"); let pend = false;
  const scan = () => { pend = false; for (let i = 0; i < live.length; i++) fit(live[i]); };
  const soon = () => { if (pend) return; pend = true; queueMicrotask(scan); requestAnimationFrame(scan); };
  const size = (kind, S) => { const a = art(kind); return a ? [a.width * S, a.height * S] : [0, 0]; };
  function html(kind, S, cls) {
    S = S || 2; const [w, h] = size(kind, S); soon();
    return `<canvas class="ic mn-cv${cls ? " " + cls : ""}" data-mn="${kind}" data-s="${S}" width="${w}" height="${h}" style="width:${w}px;height:${h}px" aria-hidden="true"></canvas>`;
  }
  function el(kind, S, cls) { const t = document.createElement("template"); t.innerHTML = html(kind, S, cls); return t.content.firstChild; }
  addEventListener("resize", scan);
  A.moneda = { html, el, fit, art, scan };
})(window.AIQ);
