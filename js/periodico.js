/*
 * Geolite - la mesa Periodico: con MUCHO zoom, las columnas grises se leen. Cada pagina se compone con las notas de la Enciclopedia de los
 * lugares que tienes alrededor (A.PLACES + A.factOf), en tu idioma, y el shader de js/map.js (u_mat 33, u_news) la pega en la mesa.
 * La pagina es un lienzo de 2048 x 1152 px CSS dibujado a 1:1 con la letra pixel del juego; se vuelve a componer solo cuando el mapa se ha movido
 * lo bastante o cambia el idioma. A.periodico.page(lon, lat) devuelve { canvas, ver }.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const W = 2048, H = 1152, COLS = 10, CW = 188, GUT = 16, MX = 10, MY = 12, LH = 16, FONT = '15px "Jersey 15", "Pixelify Sans", "Fusion Pixel", sans-serif';
  let cv = null, ver = 0, key = "", fontsOk = false;
  if (document.fonts && document.fonts.load) document.fonts.load('15px "Jersey 15"').then(() => { fontsOk = true; key = ""; });
  const CJK = /[぀-ヿ㐀-鿿가-힯]/;

  /* parte un texto en lineas de ancho <= w (por palabras; en chino, japones y coreano, por caracteres) */
  function wrap(ctx, text, w) {
    const out = [], cjk = CJK.test(text), units = cjk ? Array.from(text) : text.split(/\s+/);
    let line = "";
    for (const u of units) {
      const t = line ? (cjk ? line + u : line + " " + u) : u;
      if (ctx.measureText(t).width <= w || !line) line = t; else { out.push(line); line = u; }
    }
    if (line) out.push(line);
    return out;
  }

  /* los n lugares con nota mas cercanos al punto (lon, lat) */
  function near(lon, lat, n) {
    const lang = A.wlang ? A.wlang() : "es", k = Math.cos(lat * Math.PI / 180), rows = [];
    for (const r of A.PLACES || []) {
      const dx = (((r[4] - lon + 540) % 360) - 180) * k, dy = r[3] - lat, d = dx * dx + dy * dy;
      rows.push([d, r]);
    }
    rows.sort((a, b) => a[0] - b[0]);
    const items = [];
    for (const [, r] of rows) {
      const fact = A.factOf ? A.factOf({ cid: [r[0]] }) : "";
      if (!fact || fact.length < 40) continue;
      items.push({ title: (r[6] && (r[6][lang] || r[6].en)) || r[0], text: fact });
      if (items.length >= n) break;
    }
    return items;
  }

  function compose(items) {
    if (!cv) { cv = document.createElement("canvas"); cv.width = W; cv.height = H; }
    const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, W, H);
    ctx.font = FONT; ctx.textBaseline = "top"; ctx.fillStyle = "#000"; ctx.imageSmoothingEnabled = false;
    let col = 0, y = MY;
    const x0 = c => MX + c * (CW + GUT);
    for (const it of items) {
      const head = wrap(ctx, it.title.toUpperCase(), CW), body = wrap(ctx, it.text, CW);
      const need = (head.length + body.length) * LH + 10;
      if (y + Math.min(need, LH * 5) > H - MY) { col++; y = MY; }
      if (col >= COLS) break;
      const x = x0(col);
      for (const l of head) { ctx.fillText(l, x, y); ctx.fillText(l, x + 1, y); y += LH; }      // titular: la misma letra, doblada un pixel
      ctx.fillRect(x, y + 1, CW, 1); y += 5;                                                       // filete
      for (const l of body) {
        if (y + LH > H - MY) { col++; y = MY; if (col >= COLS) break; }
        ctx.fillText(l, x0(col), y); y += LH;
      }
      y += 10;
    }
    ver++;
  }

  A.periodico = {
    /* la pagina de los lugares de alrededor; se recompone si el mapa se ha ido a mas de 2 grados, o cambia el idioma */
    page(lon, lat) {
      const lang = A.wlang ? A.wlang() : "es", k = lang + ":" + Math.round(lon / 2) + ":" + Math.round(lat / 2) + (fontsOk ? "f" : "");
      if (k !== key) { key = k; compose(near(lon, lat, 70)); }
      return { canvas: cv, ver, W, H };
    },
  };
})(window.AIQ);
