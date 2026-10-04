/* Geolite - textos ES/EN, calculo de IQ e insignia. */
window.AIQ = window.AIQ || {};
(function (A) {
  A.VERSION = "0.2.29";
  A.lang = "es";
  /* fotos de la Enciclopedia: en la web salen de GitHub Pages (pesan ~1 GB y Vercel no las admite), repartidas en dos webs para no pasar
     del limite de 1 GB de cada una; en local y en Electron (127.0.0.1) salen de la carpeta del juego. Las publica tools/publish-media.mjs.
     La musica sigue saliendo de la propia web. */
  const MEDIA = { "assets/wiki/card/": "https://xwensel.github.io/geolite-media/", "assets/wiki/th/": "https://xwensel.github.io/geolite-media/", "assets/wiki/hd/": "https://xwensel.github.io/geolite-media-hd/" };   // th: miniaturas de 320 px de la Enciclopedia
  const LOCAL = typeof location === "undefined" || !/^https?:$/.test(location.protocol) || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  A.media = p => { if (!LOCAL) for (const k in MEDIA) if (p.startsWith(k)) return MEDIA[k] + p; return p; };
  /* enlace para compartir: en Electron (y en local) la direccion es 127.0.0.1:puerto, que no le sirve a nadie: se comparte la web publica */
  const SITE = "https://geolite-game.vercel.app/";
  A.shareUrl = () => (LOCAL ? SITE : location.href.split("#")[0]);
  A.t = (key, p) => {
    let s = (A.STR[A.lang] && A.STR[A.lang][key]) || A.STR.en[key] || key;
    if (p) for (const k in p) s = s.replaceAll("{" + k + "}", p[k]);
    return s;
  };
  const locOf = () => (A.LANGS.find(l => l.code === A.lang) || A.LANGS[0]).loc;
  A.fmt = n => Math.round(n).toLocaleString(locOf());
  A.fmt1 = n => (+n).toLocaleString(locOf(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });   // un decimal con la coma o el punto de cada idioma ("3,4 km" en espanol, no "3.4")
  /* texto multilingue: objeto {en,es,...} o cadena. Si falta el idioma, ingles y luego espanol */
  /* texto {es, en, ...}: idioma propio -> traduccion del ingles (js/i18n2.js) -> idioma base (p.ej. es-419 -> es) -> ingles -> espanol */
  const TRI = { fr: 0, pt: 1, de: 2, it: 3, "es-419": 4, zh: 5, ko: 6, ja: 7, ru: 8, pl: 9 };
  const BASE_OF = { "es-419": "es" };                                 // variantes sin datos propios: reusan el idioma base
  A.wlang = () => BASE_OF[A.lang] || A.lang;                        // idioma de Wikipedia / datos (es-419 -> es)
  const trOf = en => { const t = A.TR && A.TR[en], i = TRI[A.lang]; return t && i != null ? t[i] : undefined; };
  /* "es|en|fr|pt|de|it|es-419|zh|ko|ja|ru|pl" -> {es, en, ...}; los huecos vacios caen al idioma base / ingles via A.tx */
  const PIPE = ["es", "en", "fr", "pt", "de", "it", "es-419", "zh", "ko", "ja", "ru", "pl"];
  A.L6 = s => { const a = s.split("|"), o = {}; PIPE.forEach((l, i) => { if (a[i]) o[l] = a[i]; }); return o; };
  A.pick6 = s => { const a = s.split("|"), i = PIPE.indexOf(A.lang); return (i >= 0 && a[i]) || (BASE_OF[A.lang] && a[PIPE.indexOf(BASE_OF[A.lang])]) || a[1] || a[0]; };
  A.tx = v => (v && typeof v === "object" ? v[A.lang] || (v.en && trOf(v.en)) || (BASE_OF[A.lang] && v[BASE_OF[A.lang]]) || (A.lang === "es" ? v.es : v.en) || v.en || v.es || "" : v || "");
  /* respuesta oculta: cada letra es un hueco, las palabras quedan separadas y al final va el recuento "(3, 7)" */
  A.blanks = (text, count) => {
    const t = String(text || "").trim(); if (!t) return "";
    const p = t.replace(/[\p{L}\p{N}]/gu, "▮"), n = t.split(/[\s\-\/]+/).map(w => [...w].filter(c => /[\p{L}\p{N}]/u.test(c)).length).filter(Boolean);
    return p + (count !== false && n.length ? " (" + n.join(", ") + ")" : "");
  };
  A.blankObj = ans => { const o = {}; for (const k in ans) o[k] = A.blanks(ans[k]); return o; };
  /* pinta un texto con huecos ▮ como casillas (y sin ellos, como texto normal) */
  A.renderBlanks = (el, text) => {
    if (!text.includes("▮")) { el.textContent = text; return; }
    el.innerHTML = [...text].map((c, i, a) => (c === "▮" ? '<b class="blk">▮</b>' : c === " " && a[i - 1] === "▮" && a[i + 1] === "▮" ? '<i class="wg"></i>' : c === " " ? " " : c)).join("");
  };
  A.L = (es, en) => ({ es, en });                                    // texto perezoso: se resuelve al pintar (sigue el idioma activo)
  A.T = (es, en) => A.tx({ es, en });                                // texto inmediato
  A.tf = (es, en, params) => A.T(es, en).replace(/\{(\w+)\}/g, (m, k) => (params && params[k] != null ? params[k] : m));

  /* ------------------------------------------------------------ IQ */
  A.iqTier = iq => (iq < 80 ? 0 : iq < 95 ? 1 : iq < 110 ? 2 : iq < 125 ? 3 : iq < 140 ? 4 : iq < 155 ? 5 : iq < 175 ? 6 : 7);
  /* eff = puntos / maximo posible de lo jugado; prog = niveles superados / niveles totales */
  A.computeIQ = (eff, completed, totalLevels) => {
    const prog = totalLevels ? completed / totalLevels : 0;
    return Math.max(60, Math.min(200, 60 + Math.round(140 * (0.35 * Math.min(1, eff) + 0.65 * prog))));
  };

  /* ------------------------------------------------------------ insignia PNG (estilo casino, en el idioma del jugador) */
  const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  A.makeBadge = async (iq, tierName, subtitle) => {
    const W = 1200, H = 630, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d"), GOLD = "#f8b449", INK = "#16241c", RED = "#fe5f55", PAPER = "#f3eddc", FELT = "#17553a";
    try { await Promise.all([document.fonts.load("400 40px 'Jersey 15'"), document.fonts.load("700 20px Silkscreen")]); } catch (e) { /* sin fuentes */ }
    const logo = await loadImg("assets/logo.png");
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    // fondo y tapete
    const g = c.createRadialGradient(W / 2, H * 0.45, 60, W / 2, H / 2, W * 0.7); g.addColorStop(0, "#1a4a30"); g.addColorStop(1, "#0a140f"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    rr(34, 34, W - 68, H - 68, 28); c.fillStyle = FELT; c.fill(); c.lineWidth = 8; c.strokeStyle = INK; c.stroke();
    rr(48, 48, W - 96, H - 96, 20); c.lineWidth = 4; c.strokeStyle = GOLD; c.stroke();
    c.save(); rr(48, 48, W - 96, H - 96, 20); c.clip(); c.globalAlpha = 0.07; c.fillStyle = "#fff"; for (let x = 0; x < W; x += 18) for (let y = 0; y < H; y += 18) if (((x + y) / 18) % 2 === 0) c.fillRect(x, y, 9, 9); c.restore();
    // ficha de casino con el IQ
    const cx = 290, cy = 330, R = 190;
    c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.arc(cx + 8, cy + 12, R, 0, 7); c.fill();
    c.fillStyle = RED; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = INK; c.stroke();
    c.fillStyle = PAPER; for (let i = 0; i < 8; i++) { c.save(); c.translate(cx, cy); c.rotate(i * Math.PI / 4); c.fillRect(-22, -R + 6, 44, 46); c.restore(); }
    c.fillStyle = "#fff4f0"; c.beginPath(); c.arc(cx, cy, R * 0.66, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
    c.setLineDash([12, 10]); c.lineWidth = 4; c.strokeStyle = RED; c.beginPath(); c.arc(cx, cy, R * 0.58, 0, 7); c.stroke(); c.setLineDash([]);
    c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = INK;
    c.font = "700 26px Silkscreen, monospace"; c.fillText("IQ", cx, cy - 70);
    c.font = "400 150px 'Jersey 15', sans-serif"; c.fillText(String(iq), cx, cy + 16);
    // textos
    c.textAlign = "left"; c.textBaseline = "alphabetic";
    if (logo) { const lw = 300, lh = lw * (logo.height / logo.width); c.drawImage(logo, 540, 70, lw, lh); }
    const x0 = 540;
    c.font = "700 22px Silkscreen, monospace"; c.fillStyle = GOLD; c.fillText(A.t("badge.head").toUpperCase(), x0, 318);
    c.font = "400 78px 'Jersey 15', sans-serif"; c.fillStyle = "#000"; c.fillText(tierName, x0 + 4, 402); c.fillStyle = PAPER; c.fillText(tierName, x0, 398);
    c.font = "400 34px 'Jersey 15', sans-serif"; c.fillStyle = "#ffe08a"; c.fillText(subtitle, x0, 452, W - x0 - 80);
    c.font = "700 18px Silkscreen, monospace"; c.fillStyle = "rgba(243,237,220,.7)";
    c.fillText(new Date().toLocaleDateString(locOf(), { year: "numeric", month: "long", day: "numeric" }).toUpperCase(), x0, 500);
    c.fillText(LOCAL ? SITE.replace(/^https:\/\/|\/$/g, "") : location.host || "geolite", x0, 540);
    return cv;
  };
})(window.AIQ);
