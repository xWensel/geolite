/*
 * Geolite - LA CARTA DEL SOCIO (maqueta «Tarjeta de socio», 2026-10-16): tu tarjeta de socio es una carta de la casa, dibujada al pixel.
 *
 * Una carta de 96 x 128 pixeles de arte (136 si el nombre de la categoria necesita dos lineas) con su marco, una banda con la categoria, la
 * ventana con el icono que elijas sobre el fondo de tu categoria, tu nombre en su placa y, abajo, tu nivel y tus fichas de oro.
 *   - Cada una de las 15 categorias tiene su carta: su fondo (bandas, lunares, rayas, ruleta, rosa de los vientos, cuadricula, rayos, palos,
 *     rombos, olas, estrellas) y su paleta.
 *   - El marco es la EDICION de su tramo (A.club.groupOf): papel, plata, oro, negra y leyenda. Las cuatro ultimas brillan (plata y oro, un
 *     reflejo; negra y leyenda, holograficas) y el brillo sigue al raton.
 *   - Se inclina hacia el raton (y con el mando, al enfocarla). Con el movimiento reducido del juego (html.reduce-motion), quieta.
 *   - Se dibuja a ESCALA ENTERA de pixeles reales, como las fichas (js/ficha.js): mide cuantos pixeles reales ocupa un pixel de diseno (zoom
 *     de la pantalla y de la ventana) y elige el mayor entero que cabe en el ancho pedido. Si la pantalla cambia de escala, se vuelve a dibujar.
 *
 *   A.socio.mount(host, { w, id })   pinta la carta en host (w = ancho de diseno que puede ocupar; id: el del contador de fichas;
 *                                    t / icon: otra categoria u otro icono, para ensenarla en la tienda)
 *   A.socio.icons()                  los iconos que puedes poner (los de la casa, gratis; la tienda vendera mas)
 *   A.socio.icon() / setIcon(id)     el que llevas (P.club.icon)
 *   A.socio.picker(host, onPick)     el selector del Perfil
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const INK = "#120e1c";
  const P6 = s => A.pick6(s), esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  /* las ediciones (tramos de la escalera): marco [luz, cuerpo, sombra], banda, su tinta y el brillo */
  const ED = [
    { frame: ["#fffaec", "#efe2bf", "#b89a62"], band: "#f6efdc", ink: "#16241c", fx: "" },
    { frame: ["#ffffff", "#c9cde0", "#7d8299"], band: "#e3e7f2", ink: "#1c243a", fx: "plata" },
    { frame: ["#fff3b0", "#fdd742", "#c46a1b"], band: "#f5a623", ink: "#3a1a06", fx: "oro" },
    { frame: ["#f2d58a", "#2e2b35", "#141317"], band: "#1c1b21", ink: "#f2d58a", fx: "negra", pin: true },
    { frame: ["#ffe39a", "#ffcf66", "#a8142e"], band: "#4a1430", ink: "#ffe39a", fx: "leyenda", pin: true },
  ];
  /* la carta de cada categoria (mismo orden que A.club.RANKS): su fondo y su paleta, de claro a oscuro */
  const ART = [
    ["bands", ["#5fae7f", "#3d8a5f", "#2d6a4a", "#1f4d38"]],     // Turista
    ["dots", ["#6fc9b6", "#3f9a8a", "#2b7468", "#1d5048"]],      // Miron
    ["stripes", ["#8aa0cc", "#667fb0", "#4c6491", "#34466a"]],   // Habitual
    ["checker", ["#e8505a", "#b0203a", "#2e2b35", "#17151c"]],   // Apostador: la ruleta
    ["compass", ["#86cdec", "#5aa4cf", "#3b77a3", "#264d70"]],   // Trotamundos
    ["grid", ["#eadcae", "#cdb67e", "#94804c", "#5e4e2a"]],      // Cartografo: el pergamino
    ["rays", ["#e8505a", "#b8303e", "#8a2030", "#5a1420"]],      // Rival
    ["suits", ["#4fa06e", "#2d6a4a", "#1f4d38", "#0e271c"]],     // Contador de cartas: el tapete
    ["bands", ["#57bcb2", "#2f8a86", "#1f6466", "#14444a"]],     // Geografo: los mares
    ["argyle", ["#c0386a", "#902450", "#5e1636", "#33102a"]],    // Gran apostador
    ["waves", ["#5a88dc", "#3462b4", "#22448a", "#142c60"]],     // Almirante
    ["argyle", ["#5a5468", "#3d3848", "#28252f", "#141317"]],    // Socio: el dorso negro
    ["stripes", ["#8a5ae0", "#6438b4", "#45248a", "#2c1460"]],   // Embajador
    ["suits", ["#4a4556", "#2e2b35", "#1e1c24", "#0e0d12"]],     // Crupier honorario
    ["stars", ["#b03478", "#801c56", "#56123a", "#2a0a1e"]],     // Leyenda de la casa
  ];
  /* los iconos de la ventana: los de la casa, gratis. n = su rejilla nativa; b = cuantos pixeles del archivo hace cada pixel de arte */
  const ICONS = [
    { id: "ficha_oro", n: 64, b: 8, name: "Ficha de oro|Gold chip|Jeton d'or|Ficha de ouro|Goldchip|Fiche d'oro||金筹码|골드 칩|金のチップ|Золотая фишка|Złoty żeton" },
    { id: "dealer_mini", n: 52, b: 2, viste: true, name: "El crupier|The dealer|Le croupier|O crupiê|Der Croupier|Il croupier||荷官|딜러|ディーラー|Крупье|Krupier" },
    { id: "globe", n: 64, b: 8, name: "El globo|The globe|Le globe|O globo|Der Globus|Il globo||地球仪|지구본|地球儀|Глобус|Globus" },
    { id: "boss_hat", n: 48, b: 8, name: "La chistera|The top hat|Le haut-de-forme|A cartola|Der Zylinder|Il cilindro||礼帽|실크해트|シルクハット|Цилиндр|Cylinder" },
  ];
  const TX = {
    pick: "Tu icono|Your icon|Ton icône|Seu ícone|Dein Symbol|La tua icona||你的图标|내 아이콘|きみのアイコン|Твой значок|Twoja ikona",
    pickTip: "El dibujo del centro de tu carta. Pronto habrá más en la tienda.|The picture in the middle of your card. More coming to the boutique soon.|Le dessin au centre de ta carte. Bientôt d'autres à la boutique.|O desenho no centro da sua carta. Em breve, mais na boutique.|Das Bild in der Mitte deiner Karte. Bald gibt es mehr in der Boutique.|Il disegno al centro della tua carta. Presto altri in boutique.||你卡片中央的图案。精品店很快会上新。|카드 가운데 그림. 곧 부티크에 더 들어와요.|カードの真ん中の絵。もうすぐブティックにも並ぶ。|Рисунок в центре твоей карты. Скоро в бутике будут ещё.|Rysunek na środku twojej karty. Wkrótce więcej w butiku.",
  };

  const prof = () => A.profile.get();
  const icon = () => { const c = prof().club || {}; return ICONS.some(i => i.id === c.icon) ? c.icon : "ficha_oro"; };
  const setIcon = id => { if (!ICONS.some(i => i.id === id)) return; A.club.level(); prof().club.icon = id; A.profile.save(); };

  /* ---------------------------------------------------------------- dibujo al pixel: rejilla de colores con contorno automatico */
  function grid(w, h) {
    const c = new Array(w * h).fill(null);
    const g = { w, h,
      set(x, y, v) { if (x >= 0 && y >= 0 && x < w && y < h) c[y * w + x] = v; },
      get(x, y) { return x >= 0 && y >= 0 && x < w && y < h ? c[y * w + x] : null; },
      rect(x, y, rw, rh, v) { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) g.set(i, j, v); },
      rrect(x, y, rw, rh, cut, v) { for (let j = 0; j < rh; j++) { const k = j < cut.length ? cut[j] : rh - 1 - j < cut.length ? cut[rh - 1 - j] : 0; for (let i = k; i < rw - k; i++) g.set(x + i, y + j, v); } },
      outline() { const o = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!g.get(x, y)) continue; if (!g.get(x - 1, y) || !g.get(x + 1, y) || !g.get(x, y - 1) || !g.get(x, y + 1)) o.push(x, y); } for (let i = 0; i < o.length; i += 2) g.set(o[i], o[i + 1], INK); },
      box(x, y, rw, rh, fill) { if (fill !== undefined) g.rect(x, y, rw, rh, fill); for (let i = x; i < x + rw; i++) { g.set(i, y, INK); g.set(i, y + rh - 1, INK); } for (let j = y; j < y + rh; j++) { g.set(x, j, INK); g.set(x + rw - 1, j, INK); } },
      paint(cv) { cv.width = w; cv.height = h; const ctx = cv.getContext("2d"), id = ctx.createImageData(w, h);
        c.forEach((v, i) => { if (!v) return; const n = parseInt(v.slice(1), 16); id.data[i * 4] = n >> 16; id.data[i * 4 + 1] = (n >> 8) & 255; id.data[i * 4 + 2] = n & 255; id.data[i * 4 + 3] = 255; });
        ctx.putImageData(id, 0, 0); return ctx; },
    };
    return g;
  }
  /* los palos, a 5 x 5 (picas, corazones, rombos, treboles) para el fondo del Contador de cartas y del Crupier honorario */
  const SUIT = ["00100,01110,11111,00100,01110", "01010,11111,11111,01110,00100", "00100,01110,11111,01110,00100", "01110,01110,11111,11111,00100"].map(s => s.split(","));
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  /* el fondo de la ventana: indice 0 (claro) a 3 (oscuro) segun el dibujo de la categoria, con un foco detras del icono y el borde en sombra */
  function pattern(kind, x, y, w, h) {
    const cx = (w - 1) / 2, cy = h * .47, dx = (x - cx) / (w * .5), dy = (y - cy) / (h * .5), d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    let k;
    switch (kind) {
      case "bands": k = Math.min(3, Math.floor(d * 2.6)); break;
      case "dots": k = (((x + (Math.floor(y / 7) % 2) * 3) % 7 < 3) && (y % 7 < 3)) ? 1 : 2; break;
      case "stripes": k = ((x + y) % 10 < 5) ? 1 : 2; break;
      case "checker": k = ((Math.floor(x / 8) + Math.floor(y / 8)) % 2) ? 1 : 3; break;
      case "compass": { const ray = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16) % 2; k = ray ? 1 : 2; if (Math.abs(d - .55) < .045 || Math.abs(d - .9) < .04) k = 0; break; }
      case "grid": k = (x % 11 === 5 || y % 11 === 5) ? 2 : 1; break;
      case "rays": k = (Math.floor(((a + Math.PI) / (Math.PI * 2)) * 24) % 2) ? 1 : 2; break;
      case "suits": { const tx = Math.floor(x / 10), ty = Math.floor(y / 10), s = SUIT[(tx + ty * 3) % 4], px = x % 10 - 2 - (ty % 2) * 0, py = y % 10 - 2; k = px >= 0 && px < 5 && py >= 0 && py < 5 && s[py][px] === "1" ? 0 : 2; break; }
      case "argyle": { const u = (x + 8) % 16 - 8, v = (y + 8) % 16 - 8; k = Math.abs(u) + Math.abs(v) < 8 ? 1 : 2; if ((x + y) % 16 === 0 || (x - y + 64) % 16 === 0) k = 0; break; }
      case "waves": k = ((y + Math.round(2 * Math.sin(x / 3.2))) % 8 < 3) ? 1 : 2; break;
      case "stars": k = Math.min(3, 1 + Math.floor(d * 2)); if (hash(x, y) > .965) k = 0; if ((Math.floor(((a + Math.PI) / (Math.PI * 2)) * 20) % 2) && d < .8 && k > 1) k = 1; break;
      default: k = 2;
    }
    if (kind !== "bands" && kind !== "stars") { if (d < .42 && k > 0) k--; if (d > .95 && k < 3) k++; }   // foco detras del icono, borde en sombra
    return k;
  }

  /* la carta entera, a su rejilla nativa (96 x H). Devuelve donde va cada texto */
  function draw(cv, t, two) {
    const e = ED[A.club.groupOf(t)], [kind, pal] = ART[t] || ART[0], H = two ? 136 : 128, bh = two ? 21 : 13, F = e.frame, g = grid(96, H);
    g.rrect(0, 0, 96, H, [3, 2, 1], F[1]);
    for (let i = 3; i < 93; i++) { g.set(i, 1, F[0]); g.set(i, H - 2, F[2]); } for (let j = 3; j < H - 3; j++) { g.set(1, j, F[0]); g.set(94, j, F[2]); }
    for (let i = 4; i < 92; i++) { g.set(i, 4, F[2]); g.set(i, H - 5, F[2]); } for (let j = 4; j < H - 4; j++) { g.set(4, j, F[2]); g.set(91, j, F[2]); }   // filete
    const dia = (cx, cy) => { [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]].forEach(([dx, dy]) => g.set(cx + dx, cy + dy, F[0])); g.set(cx, cy, F[2]); };
    [[4, 4], [91, 4], [4, H - 5], [91, H - 5]].forEach(([x, y]) => dia(x, y));
    if (e.pin) for (let i = 9; i < 87; i += 2) { g.set(i, 2, F[0]); g.set(i, H - 3, F[0]); }                // filete de oro de las negras
    g.box(7, 7, 82, bh, e.band);
    const y0 = 7 + bh + 2; g.box(7, y0, 82, 67, null);
    for (let j = 1; j < 66; j++) for (let i = 1; i < 81; i++) g.set(7 + i, y0 + j, pal[pattern(kind, i - 1, j - 1, 80, 65)]);
    for (let i = 8; i < 88; i++) g.set(i, y0 + 1, pal[3]);                                                // la sombra del borde de arriba
    const yn = y0 + 69; g.box(7, yn, 82, 17, "#fffaec"); for (let i = 8; i < 88; i++) g.set(i, yn + 15, "#e9dcb8");
    const yf = yn + 19; g.box(7, yf, 82, 12, e.band);
    g.outline();
    const ctx = g.paint(cv);
    return { ctx, H, e, cat: [7, 7, 82, bh], win: [8, y0 + 1, 80, 65], name: [7, yn, 82, 16], foot: [7, yf, 82, 12] };
  }
  /* el icono, a su rejilla nativa en el centro de la ventana */
  const imgCache = {};
  function iconImg(id) {
    const ic = ICONS.find(i => i.id === id) || ICONS[0], def = `assets/icons/${ic.id}.webp`, src = ic.viste && A.crupierArt ? A.crupierArt(ic.id, def) : def;
    let im = imgCache[src]; if (!im) { im = imgCache[src] = new Image(); im.decoding = "async"; im.src = src; }
    return { im, ic };
  }
  function drawIcon(ctx, win, id, done) {
    const { im, ic } = iconImg(id), go = () => { ctx.imageSmoothingEnabled = false; const x = Math.round(win[0] + (win[2] - ic.n) / 2), y = Math.round(win[1] + (win[3] - ic.n) / 2); ctx.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, x, y, ic.n, ic.n); if (done) done(); };
    if (im.complete && im.naturalWidth) go(); else im.addEventListener("load", go, { once: true });
  }

  /* ---------------------------------------------------------------- montarla: escala entera, textos, brillo e inclinacion */
  const reduce = () => document.documentElement.classList.contains("reduce-motion");
  function realPerCss(el) { const w = el.offsetWidth; if (!w) return 0; return (el.getBoundingClientRect().width / w) * (devicePixelRatio || 1); }
  /* cuantos pixeles reales hace cada pixel de arte: el mayor entero que cabe en el ancho pedido, pero nunca menos de 2 pixeles de DISENO
     por pixel de arte (por debajo, la letra minima de la Deck ya no cabe en sus bandas) */
  function scaleFor(host, w) { const r = realPerCss(host) || 1, s = Math.max(2, Math.ceil(2 * r - 0.01), Math.floor((w * r) / 96 + 0.01)); return { s, d: s / r }; }

  function data(o) {
    const P = prof(), t = o.t != null ? o.t : A.club.tierNow(), c = P.club || {}, L = A.club.levelOf(A.club.xp());
    return { t, name: P.name || P6("Anónimo|Anonymous|Anonyme|Anônimo|Anonym|Anonimo||匿名|익명|匿名|Аноним|Anonim"), cat: A.club.tierName(t), lvl: L.lvl, f: c.fSeen == null ? A.club.fichas() : c.fSeen };
  }
  function mount(host, o = {}) {
    if (!host || !A.club) return;
    host.classList.add("sc-host");
    const W = o.w || 192; host.style.width = W + "px";
    const build = () => {
      if (!host.isConnected) return;
      const D = data(o), { s, d } = scaleFor(host, W), ic = o.icon || icon();
      const sig = [D.t, D.name, D.cat, D.lvl, D.f, ic, s, d.toFixed(4), A.lang].join("|"); if (host._sig === sig) return; host._sig = sig;
      host.innerHTML = "";
      const card = document.createElement("span"); card.className = "sc-card";
      const tilt = document.createElement("span"); tilt.className = "sc-tilt";
      const cv = document.createElement("canvas"); cv.className = "sc-cv";
      /* el titulo de la categoria: una linea si cabe a 18 px de diseno (el minimo de la Deck), si no, dos (la carta crece 8 pixeles) */
      const probe = document.createElement("span"); probe.className = "sc-cat"; probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-size:${Math.max(18, 9 * d)}px`; probe.textContent = D.cat; host.appendChild(probe);
      const two = probe.scrollWidth > 76 * d && /\s/.test(D.cat.trim()); probe.remove();             // una palabra sola no se parte: se estrecha (squeeze)
      const L = draw(cv, D.t, two);
      drawIcon(L.ctx, L.win, ic);
      const px = v => v * d + "px", box = (r, cls, html) => `<span class="${cls}" style="left:${px(r[0])};top:${px(r[1])};width:${px(r[2])};height:${px(r[3])}">${html}</span>`;
      const fi = `<img class="sc-fi" src="assets/icons/ficha_oro.webp" alt="" style="width:${px(9)};height:${px(9)}">`;
      card.style.width = px(96); card.style.height = px(L.H); card.style.setProperty("--sd", d);
      card.style.setProperty("--ink", L.e.ink);
      tilt.appendChild(cv);
      const mask = `url(${cv.toDataURL()})`;
      ["sc-shadow", "sc-fx fx-" + (L.e.fx || "no"), "sc-glare"].forEach((cls, i) => { const m = document.createElement("span"); m.className = cls; m.style.webkitMaskImage = m.style.maskImage = mask; (i ? tilt : card).appendChild(m); });
      tilt.insertAdjacentHTML("beforeend", box(L.cat, "sc-cat" + (two ? " two" : ""), `<span>${esc(D.cat)}</span>`)
        + box(L.name, "sc-name", esc(D.name))
        + box(L.foot, "sc-foot", `<b class="sc-lv">${esc(P6(A.club.tx.lvS).replace("{n}", D.lvl))}</b><span class="sc-f">${fi}<b${o.id ? ` id="${o.id}"` : ""}>${A.fmt(D.f)}</b></span>`));
      card.appendChild(tilt); host.appendChild(card); host.style.width = px(96); host.style.height = px(L.H);
      fit(tilt.querySelector(".sc-cat"), two ? 8 : 10, d); fit(tilt.querySelector(".sc-name"), 13, d); squeeze(tilt.querySelector(".sc-cat > span"), tilt.querySelector(".sc-cat"));
      /* se inclina hacia el raton; el brillo y el reflejo le siguen */
      const tgt = o.hover || host;
      tgt.onpointermove = ev => { if (reduce()) return; const r = card.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5;
        tilt.style.transform = `perspective(${px(420)}) rotateY(${(x * 14).toFixed(2)}deg) rotateX(${(-y * 14).toFixed(2)}deg)`;
        tilt.style.setProperty("--gx", ((x + .5) * 100).toFixed(1) + "%"); tilt.style.setProperty("--gy", ((y + .5) * 100).toFixed(1) + "%"); };
      tgt.onpointerleave = () => { tilt.style.transform = ""; };
    };
    host._build = build; build();
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(() => { host._sig = ""; build(); });
    /* si cambia la escala de la pantalla (ventana, ajuste de la portada), cambian sus pixeles reales: se vuelve a medir y a dibujar */
    /* al fotograma siguiente: dibujar cambia el tamano de la propia carta, y hacerlo dentro del aviso encadenaba otro («ResizeObserver loop») */
    if (!host._ro && window.ResizeObserver) { host._ro = new ResizeObserver(() => { if (!host._rq) host._rq = requestAnimationFrame(() => { host._rq = 0; host._build(); }); }); try { host._ro.observe(host, { box: "device-pixel-content-box" }); } catch (e) { host._ro.observe(host); } }
  }
  /* una sola palabra mas larga que la banda (el ruso «Путешественник») no se puede partir: se estrecha lo justo, como mucho un 20 % */
  function squeeze(sp, box) { if (!sp || !box) return; sp.style.display = "inline-block"; sp.style.transform = ""; const room = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) * 2, w = sp.scrollWidth; if (w > room && room > 0) sp.style.transform = `scaleX(${Math.max(.8, room / w).toFixed(3)})`; }
  /* la letra baja de 1 en 1 hasta caber (sin pasar de 18 px de diseno); si aun no cabe, puntos suspensivos */
  function fit(el, base, d) { if (!el) return; let fs = Math.max(18, base * d); el.style.fontSize = fs + "px"; while (el.scrollWidth > el.clientWidth + 1 && fs > 18) { fs = Math.max(18, fs - 1); el.style.fontSize = fs + "px"; } }

  /* ---------------------------------------------------------------- el selector del Perfil */
  function picker(host, onPick) {
    if (!host) return;
    const cur = icon();
    host.innerHTML = `<span class="gx-eyb sc-pk-h">${esc(P6(TX.pick))}</span><div class="sc-pk" role="group" aria-label="${esc(P6(TX.pick))}">${ICONS.map(i => {
      const def = `assets/icons/${i.id}.webp`, src = i.viste && A.crupierArt ? A.crupierArt(i.id, def) : def;
      return `<button type="button" class="sc-pk-i${i.id === cur ? " on" : ""}" data-ic="${i.id}" aria-pressed="${i.id === cur}" ${A.ttAttr ? A.ttAttr(P6(i.name), P6(TX.pickTip)) : ""}><img src="${src}" alt="${esc(P6(i.name))}" draggable="false"></button>`; }).join("")}</div>`;
    host.querySelectorAll(".sc-pk-i").forEach(b => b.onclick = () => { if (b.dataset.ic === icon()) return; setIcon(b.dataset.ic); if (A.sfx && A.sfx.card) A.sfx.card(); host.querySelectorAll(".sc-pk-i").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); }); if (onPick) onPick(b.dataset.ic); });
  }

  A.socio = { mount, picker, icons: () => ICONS.slice(), icon, setIcon, ART, ED, _draw: draw };
})(window.AIQ);
