/*
 * Geolite - EL VESTUARIO DEL CRUPIER (v0.3.134, Club de la casa): ropa para Don Crupier que se compra en la boutique con fichas de oro.
 * Solo cambia colores del arte aprobado de Pixel Lab (nunca dibuja): el mapa de partes (js/crupier-partes.js, mismo tamano que el atlas
 * de js/crupier-data.js) dice que es cada pixel (1 traje, 2 chistera, 3 pajarita y cinta de la chistera, 4 antifaz) y aqui
 * se recolorea el atlas UNA vez al cambiar de ropa; el crupier (js/crupier.js) dibuja con ese atlas, sin coste en cada fotograma.
 * Todo en la paleta Geolite 32; el contorno sigue en tinta. Una CARTA de 12 colores, la misma y en el mismo orden para el traje, el antifaz
 * y la pajarita (con la cinta de la chistera a juego); el de la casa de cada hueco es gratis. La chistera sigue al traje salvo la dorada (legendaria).
 * Estado en el perfil: P.vest = { own: { id: fecha }, wear: { traje, antifaz, pajarita, chistera } } (null = el de la casa).
 *   A.vestuario.items  .get(id)  .owned(id)  .worn()  .wearing(id)  .wear(id)  .takeOff(slot)  .buy(id)  .price(id)
 *   A.vestuario.atlasFor(ropa)  (lienzo o null)   .thumb(ropa, k)  (dataURL del retrato)   .with(id) (la ropa que llevas + esa pieza)
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const hex = s => parseInt(s.slice(1), 16);
  /* colores del arte de Pixel Lab que cambia cada hueco. El antifaz va entero en oro (arreglado en el atlas el 2026-10-16):
     brillo fff3b0, claro fdd742, medio f5a623, sombra bajo el ala c46a1b, pliegue 3c240a */
  const SRC = { main: 0x4a1d96, sh: 0x301252, rHi: 0xe8283a, rLo: 0xa8142e, gHi: 0xfdd742, gMid: 0xf5a623, gLt: 0xfff3b0, gSh: 0xc46a1b, gDp: 0x3c240a };
  /* LA CARTA DE COLORES: los mismos 12, en el mismo orden, para el traje, el antifaz y la pajarita (que lleva a juego la cinta de la chistera).
     Todo en la paleta Geolite 32. traje: [color, sombra]; antifaz: [claro, medio, brillo, sombra bajo el ala, pliegue]; pajarita: [color, sombra].
     casa: el hueco en el que ese color es el de siempre (gratis y tuyo desde el principio: el traje morado, el antifaz de oro y la pajarita roja).
     n: el color como adjetivo en los 12 idiomas, "masculino|femenino" donde cambia (es, pt, de, it, ru, pl); el nombre se monta con NAME */
  const COLORS = [
    { k: "rojo", traje: ["#e8283a", "#a8142e"], antifaz: ["#e8283a", "#a8142e", "#ff6b5e", "#a8142e", "#301252"], pajarita: ["#e8283a", "#a8142e"], casa: "pajarita",
      n: ["rojo|roja", "Red", "rouge", "vermelho|vermelha", "Roter|Rote", "rosso|rossa", "", "红色", "빨간", "赤の", "Красный|Красная", "Czerwony|Czerwona"] },
    { k: "granate", traje: ["#a8142e", "#301252"], antifaz: ["#a8142e", "#301252", "#e8283a", "#301252", "#1d0a3d"], pajarita: ["#a8142e", "#301252"],
      n: ["granate", "Burgundy", "bordeaux", "grená", "Weinroter|Weinrote", "granata", "", "酒红色", "와인색", "ワインレッドの", "Бордо­вый|Бордо­вая", "Bordowy|Bordowa"] },
    { k: "rosa", traje: ["#e5408f", "#a8142e"], antifaz: ["#e5408f", "#a8142e", "#ffd3b6", "#a8142e", "#301252"], pajarita: ["#e5408f", "#a8142e"],
      n: ["rosa", "Pink", "rose", "rosa", "Rosa­farbener|Rosa­farbene", "rosa", "", "粉色", "분홍", "ピンクの", "Розовый|Розовая", "Różowy|Różowa"] },
    { k: "cobre", traje: ["#c46a1b", "#6e3414"], antifaz: ["#c46a1b", "#6e3414", "#f5a623", "#6e3414", "#3c240a"], pajarita: ["#c46a1b", "#6e3414"],
      n: ["de cobre", "Copper", "cuivré", "acobreado|acobreada", "Kupferner|Kupferne", "ramato|ramata", "", "铜色", "구릿빛", "銅色の", "Медный|Медная", "Miedziany|Miedziana"] },
    { k: "oro", traje: ["#f5a623", "#c46a1b"], antifaz: ["#fdd742", "#f5a623", "#fff3b0", "#c46a1b", "#3c240a"], pajarita: ["#fdd742", "#f5a623"], casa: "antifaz",
      n: ["de oro", "Gold", "doré", "dourado|dourada", "Goldener|Goldene", "dorato|dorata", "", "金色", "금빛", "金の", "Золотой|Золотая", "Złoty|Złota"] },
    { k: "verde", traje: ["#3fb54a", "#136b3e"], antifaz: ["#a6e05a", "#3fb54a", "#fff3b0", "#136b3e", "#1d0a3d"], pajarita: ["#3fb54a", "#136b3e"],
      n: ["verde", "Green", "vert", "verde", "Grüner|Grüne", "verde", "", "绿色", "초록", "緑の", "Зелёный|Зелёная", "Zielony|Zielona"] },
    { k: "esmeralda", traje: ["#136b3e", "#301252"], antifaz: ["#3fb54a", "#136b3e", "#a6e05a", "#136b3e", "#301252"], pajarita: ["#136b3e", "#301252"],
      n: ["esmeralda", "Emerald", "émeraude", "esmeralda", "Smaragd­grüner|Smaragd­grüne", "smeraldo", "", "翡翠绿", "에메랄드", "エメラルドの", "Изум­рудный|Изум­рудная", "Szmarag­dowy|Szmarag­dowa"] },
    { k: "turquesa", traje: ["#0dbeaf", "#08787f"], antifaz: ["#5ef2df", "#0dbeaf", "#f3f0fa", "#08787f", "#301252"], pajarita: ["#0dbeaf", "#08787f"],
      n: ["turquesa", "Turquoise", "turquoise", "turquesa", "Türkis­farbener|Türkis­farbene", "turchese", "", "青绿色", "청록", "ターコイズの", "Бирю­зовый|Бирю­зовая", "Turkusowy|Turkusowa"] },
    { k: "azul", traje: ["#0c60d3", "#301252"], antifaz: ["#1689fb", "#0c60d3", "#7ac8ff", "#0c60d3", "#301252"], pajarita: ["#1689fb", "#0c60d3"],
      n: ["azul", "Blue", "bleu", "azul", "Blauer|Blaue", "blu", "", "蓝色", "파란", "青の", "Синий|Синяя", "Niebieski|Niebieska"] },
    { k: "morado", traje: ["#4a1d96", "#301252"], antifaz: ["#6e40c4", "#4a1d96", "#9c7ce6", "#4a1d96", "#301252"], pajarita: ["#6e40c4", "#4a1d96"], casa: "traje",
      n: ["morado|morada", "Purple", "violet", "roxo|roxa", "Violetter|Violette", "viola", "", "紫色", "보라", "紫の", "Фиоле­товый|Фиоле­товая", "Fioletowy|Fioletowa"] },
    { k: "plata", traje: ["#8a8fa8", "#3a2f58"], antifaz: ["#f3f0fa", "#c9cde0", "#f3f0fa", "#8a8fa8", "#3a2f58"], pajarita: ["#c9cde0", "#8a8fa8"],
      n: ["de plata", "Silver", "argenté", "prateado|prateada", "Silberner|Silberne", "argentato|argentata", "", "银色", "은빛", "銀の", "Сереб­ряный|Сереб­ряная", "Srebrny|Srebrna"] },
    { k: "negro", traje: ["#3a2f58", "#301252"], antifaz: ["#3a2f58", "#301252", "#8a8fa8", "#301252", "#1d0a3d"], pajarita: ["#3a2f58", "#301252"],
      n: ["negro|negra", "Black", "noir", "preto|preta", "Schwarzer|Schwarze", "nero|nera", "", "黑色", "검은", "黒の", "Чёрный|Чёрная", "Czarny|Czarna"] },
  ];
  const BY = Object.fromEntries(COLORS.map(c => [c.k, c]));
  const CHISTERA = { dorada: ["#f5a623", "#c46a1b"] };
  /* el nombre de cada prenda en los 12 idiomas: {m}/{f} = el color en masculino/femenino (el genero del sustantivo en cada idioma) */
  const NAME = {
    traje: ["Traje {m}", "{m} suit", "Costume {m}", "Terno {m}", "{m} Anzug", "Abito {m}", "", "{m}西装", "{m} 정장", "{m}スーツ", "{m} костюм", "{m} garnitur"],
    antifaz: ["Antifaz {m}", "{m} mask", "Loup {m}", "Máscara {f}", "{f} Maske", "Maschera {f}", "", "{m}面具", "{m} 가면", "{m}仮面", "{f} маска", "{f} maska"],
    pajarita: ["Pajarita {f}", "{m} bow tie", "Nœud papillon {m}", "Gravata-borboleta {f}", "{f} Fliege", "Papillon {m}", "", "{m}领结", "{m} 나비넥타이", "{m}蝶ネクタイ", "{f} бабочка", "{f} mucha"],
  };
  const DESC = {
    traje: "El frac y la chistera, del mismo color.|The tailcoat and top hat, in the same colour.|Le frac et le haut-de-forme, de la même couleur.|O fraque e a cartola, da mesma cor.|Frack und Zylinder in derselben Farbe.|Frac e cilindro, dello stesso colore.||燕尾服和礼帽，同一种颜色。|연미복과 실크해트를 같은 색으로.|燕尾服とシルクハットを同じ色で。|Фрак и цилиндр одного цвета.|Frak i cylinder w tym samym kolorze.",
    antifaz: "El antifaz entero, con su sombra bajo el ala.|The whole mask, with its shadow under the brim.|Le loup entier, avec son ombre sous le bord.|A máscara inteira, com sua sombra sob a aba.|Die ganze Maske, mit ihrem Schatten unter der Krempe.|La maschera intera, con la sua ombra sotto la tesa.||整副面具，连同帽檐下的阴影。|가면 전체, 챙 아래 그림자까지.|仮面全体を、つばの下の影ごと。|Вся маска, вместе с тенью под полями.|Cała maska, z cieniem pod rondem.",
    pajarita: "La pajarita y, a juego, la cinta de la chistera.|The bow tie and, to match, the top hat's band.|Le nœud papillon et, assorti, le ruban du haut-de-forme.|A gravata-borboleta e, combinando, a fita da cartola.|Die Fliege und passend dazu das Hutband des Zylinders.|Il papillon e, abbinato, il nastro del cilindro.||领结，以及与之相配的礼帽帽带。|나비넥타이와, 거기에 맞춘 실크해트의 띠.|蝶ネクタイと、おそろいのシルクハットのリボン。|Бабочка и в тон ей лента цилиндра.|Mucha i do pary wstążka cylindra.",
    casa: "Lo de siempre: así viste la casa.|The usual: how the house dresses.|Comme toujours : la tenue de la maison.|O de sempre: assim a casa se veste.|Wie immer: so kleidet sich das Haus.|Come sempre: così veste la casa.||老样子：本店的标准装扮。|늘 그렇듯: 하우스의 기본 차림.|いつもどおり、店の定番の装い。|Как всегда: так одевается заведение.|Jak zawsze: tak ubiera się kasyno.",
  };
  const PRICE = { traje: 250, antifaz: 250, pajarita: 150, l: 600 };
  const SLOTS = ["traje", "antifaz", "pajarita", "chistera"];
  const BUY = ["traje", "antifaz", "pajarita"];
  const nameOf = (slot, c) => NAME[slot].map((pat, i) => { if (i === 6) return ""; const [m, f] = c.n[i].split("|"); return pat.replace("{m}", m).replace("{f}", f || m); }).join("|");
  /* el catalogo: por hueco, los 12 colores en el orden de la carta; al final, la legendaria. id = <hueco>_<color> */
  const ITEMS = BUY.flatMap(slot => COLORS.map(c => ({ id: slot + "_" + c.k, slot, v: c.k, r: "r", casa: c.casa === slot, n: nameOf(slot, c), d: c.casa === slot ? DESC.casa : DESC[slot] })))
    .concat([{ id: "chistera_dorada", slot: "chistera", v: "dorada", r: "l", casa: false,
      n: "Chistera dorada|Golden top hat|Haut-de-forme doré|Cartola dourada|Goldener Zylinder|Cilindro dorato||金色礼帽|황금 실크해트|金のシルクハット|Золотой цилиндр|Złoty cylinder",
      d: "Solo la chistera, en oro, vaya donde vaya: en la cabeza, en la mano o contra el pecho.|Just the top hat, in gold, wherever it goes: on his head, in his hand or against his chest.|Seulement le haut-de-forme, en or, où qu'il soit : sur la tête, à la main ou contre la poitrine.|Só a cartola, em ouro, onde quer que esteja: na cabeça, na mão ou no peito.|Nur der Zylinder, in Gold, wo immer er ist: auf dem Kopf, in der Hand oder an der Brust.|Solo il cilindro, d'oro, ovunque sia: in testa, in mano o sul petto.||只有礼帽是金的，无论在头上、手里还是胸前。|실크해트만 금빛으로. 머리 위든 손이든 가슴이든.|シルクハットだけを金に。頭でも手でも胸でも。|Только цилиндр, золотой, где бы он ни был: на голове, в руке или у груди.|Tylko cylinder, złoty, gdziekolwiek jest: na głowie, w dłoni czy przy piersi." }]);
  /* el color de la casa de cada hueco: llevarlo = no llevar nada en ese hueco (null) */
  const CASA = Object.fromEntries(COLORS.filter(c => c.casa).map(c => [c.casa, c.k]));

  /* ---------------------------------------------------------------- estado */
  const prof = () => A.profile.get();
  const st = () => { const P = prof(); if (!P.vest || typeof P.vest !== "object") P.vest = { own: {}, wear: {} }; if (!P.vest.own) P.vest.own = {}; if (!P.vest.wear) P.vest.wear = {}; return P.vest; };
  const save = () => A.profile.save();
  const get = id => ITEMS.find(i => i.id === id) || null;
  const owned = id => { const it = get(id); return !!it && (it.casa || !!st().own[id]); };
  /* lo puesto por hueco: el color (o null = el de la casa); un color guardado que ya no existe vuelve al de la casa */
  const worn = () => { const w = st().wear, o = {}; SLOTS.forEach(s => { const v = w[s] || null; o[s] = v && (s === "chistera" ? CHISTERA[v] : BY[v] && v !== CASA[s]) ? v : null; }); return o; };
  const wearing = id => { const it = get(id), w = worn(); if (!it) return false; return it.casa ? w[it.slot] === null : w[it.slot] === it.v; };
  const withItem = (id, base) => { const it = get(id), o = { ...(base || worn()) }; if (!it) return o; o[it.slot] = it.casa ? null : it.v; return o; };
  const price = id => { const it = get(id); return !it || it.casa ? 0 : it.r === "l" ? PRICE.l : PRICE[it.slot] || 250; };
  const keyOf = o => SLOTS.map(s => o[s] || "-").join("|");

  /* ---------------------------------------------------------------- el recoloreado */
  let base = null, parts = null, waiting = [];
  function prep(done) {
    if (base) return done && done();
    if (done) waiting.push(done);
    if (prep.busy) return; prep.busy = true;
    A.crupier.ready(() => {
      const atlas = A.crupier.atlas(), pim = new Image();
      pim.onload = () => {
        const w = atlas.naturalWidth || atlas.width, h = atlas.naturalHeight || atlas.height;
        const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d", { willReadFrequently: true });
        x.drawImage(atlas, 0, 0); const data = x.getImageData(0, 0, w, h).data;
        x.clearRect(0, 0, w, h); x.drawImage(pim, 0, 0); const pd = x.getImageData(0, 0, w, h).data;
        const idx = { 1: [], 2: [], 3: [], 4: [] };
        for (let i = 0, p = 0; i < pd.length; i += 4, p++) { const k = pd[i]; if (k >= 1 && k <= 4 && data[i + 3]) idx[k].push(i); }
        Object.keys(idx).forEach(k => { idx[k] = Int32Array.from(idx[k]); });
        base = { w, h, data, idx };
        const m = A.CRUPIER_DATA.master; base.master = m;
        prep.busy = false; waiting.splice(0).forEach(f => f());
      };
      pim.src = A.CRUPIER_PARTES;
    });
  }
  const isDefault = o => SLOTS.every(s => !o[s]);
  function maps(o) {
    const M = {};
    const tr = o.traje && BY[o.traje] && BY[o.traje].traje, ch = o.chistera && CHISTERA[o.chistera], pj = o.pajarita && BY[o.pajarita] && BY[o.pajarita].pajarita, an = o.antifaz && BY[o.antifaz] && BY[o.antifaz].antifaz;
    if (tr) M[1] = { [SRC.main]: hex(tr[0]), [SRC.sh]: hex(tr[1]) };
    if (ch || tr) { const c = ch || tr; M[2] = { [SRC.main]: hex(c[0]), [SRC.sh]: hex(c[1]) }; }
    if (pj) M[3] = { [SRC.rHi]: hex(pj[0]), [SRC.rLo]: hex(pj[1]) };            // la pajarita y la cinta de la chistera
    if (an) M[4] = { [SRC.gHi]: hex(an[0]), [SRC.gMid]: hex(an[1]), [SRC.gLt]: hex(an[2]), [SRC.gSh]: hex(an[3]), [SRC.gDp]: hex(an[4]) };
    return M;
  }
  function paint(dst, o) {
    const M = maps(o), d = base.data;
    for (const k of Object.keys(M)) {
      const mp = M[k], list = base.idx[k];
      for (let j = 0; j < list.length; j++) {
        const i = list[j];
        const v = mp[(d[i] << 16) | (d[i + 1] << 8) | d[i + 2]];
        if (v != null) { dst[i] = v >> 16; dst[i + 1] = (v >> 8) & 255; dst[i + 2] = v & 255; }
      }
    }
  }
  const cache = new Map();
  /* el atlas entero con esa ropa (o null si es la de siempre); se guardan los 4 ultimos */
  function atlasFor(o) {
    if (!base || isDefault(o)) return null;
    const key = keyOf(o); if (cache.has(key)) { const c = cache.get(key); cache.delete(key); cache.set(key, c); return c; }
    const c = document.createElement("canvas"); c.width = base.w; c.height = base.h;
    const x = c.getContext("2d"), im = x.createImageData(base.w, base.h); im.data.set(base.data); paint(im.data, o); x.putImageData(im, 0, 0);
    cache.set(key, c); while (cache.size > 4) cache.delete(cache.keys().next().value);
    return c;
  }
  /* el retrato quieto con esa ropa (tarjetas de la boutique): solo se recolorea el rectangulo del retrato; k = pixeles por pixel */
  const thumbs = new Map();
  function thumb(o, k = 2) {
    if (!base) return "";
    const key = keyOf(o) + "@" + k; if (thumbs.has(key)) return thumbs.get(key);
    const [mx, my, mw, mh, ox, oy] = base.master, W = 96, H = 112;
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    const im = x.createImageData(mw, mh), d = base.data;
    for (let r = 0; r < mh; r++) { const s = ((my + r) * base.w + mx) * 4; im.data.set(d.subarray(s, s + mw * 4), r * mw * 4); }
    const M = maps(o);
    for (let r = 0; r < mh; r++) for (let q = 0; q < mw; q++) {
      const i = ((my + r) * base.w + mx + q) * 4, j = (r * mw + q) * 4; if (!d[i + 3]) continue;
      const code = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      const part = partAt(i); if (!part || !M[part]) continue;
      const v = M[part][code]; if (v != null) { im.data[j] = v >> 16; im.data[j + 1] = (v >> 8) & 255; im.data[j + 2] = v & 255; }
    }
    x.putImageData(im, ox, oy);
    const big = document.createElement("canvas"); big.width = W * k; big.height = H * k; const bx = big.getContext("2d"); bx.imageSmoothingEnabled = false; bx.drawImage(c, 0, 0, W * k, H * k);
    const url = big.toDataURL(); thumbs.set(key, url); return url;
  }
  /* parte de un pixel del atlas (para las miniaturas): un mapa inverso pequeno, solo del retrato */
  let partOf = null;
  function partAt(i) {
    if (!partOf) { partOf = new Map(); for (const k of [1, 2, 3, 4]) { const L = base.idx[k]; const [mx, my, mw, mh] = base.master; const a = (my * base.w + mx) * 4, b = ((my + mh) * base.w) * 4; for (let j = 0; j < L.length; j++) if (L[j] >= a && L[j] < b) partOf.set(L[j], k); } }
    return partOf.get(i) || 0;
  }

  /* ---------------------------------------------------------------- ponerse y comprar */
  function apply() { if (!base) return prep(apply); A.crupier.dress(atlasFor(worn())); }
  function wear(id) {
    const it = get(id); if (!it || !owned(id)) return false;
    st().wear[it.slot] = it.casa ? null : it.v;                                  // el de la casa = nada encima
    save(); apply(); return true;
  }
  function takeOff(id) {
    const it = get(id); if (!it || it.casa) return;
    const w = st().wear; if (w[it.slot] === it.v) w[it.slot] = null;
    save(); apply();
  }
  function buy(id) {
    const it = get(id); if (!it || it.casa || owned(id) || !A.club || !A.club.spend) return false;
    if (!A.club.spend(price(id))) return false;
    st().own[id] = Date.now(); save(); wear(id); return true;
  }

  A.vestuario = {
    items: ITEMS, SLOTS, BUY, colors: COLORS.map(c => c.k), get, owned, worn, wearing, wear, takeOff, buy, price, keyOf,
    with: withItem, atlasFor, thumb, ready: prep, apply,
    name: id => A.pick6(get(id).n), desc: id => A.pick6(get(id).d),
    count: () => ITEMS.filter(i => !i.casa && owned(i.id)).length,
  };
  /* al arrancar, el crupier sale con la ropa que lleve el perfil */
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", () => setTimeout(() => { if (A.profile && A.crupier) { const w = worn(); if (!isDefault(w)) prep(apply); } }, 0));
  else setTimeout(() => { if (A.profile && A.crupier) { const w = worn(); if (!isDefault(w)) prep(apply); } }, 0);
})(window.AIQ);
