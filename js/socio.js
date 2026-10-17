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
 *                                    t / icon / title: otra categoria, otro icono u otro titulo, para ensenarla en la tienda)
 *   ICONOS (maqueta «Marcos, titulos e iconos», entrega 1): el globo y la chistera (de la casa), la ilustracion de cada logro que tengas
 *   (las 100, ach_<id>) y los objetos de la casa en la tienda (30-80 fichas de oro).
 *   TITULOS: una placa de cuero bajo tu nombre (sin titulo no hay placa). Ocho se ganan (un logro, o 25 duelos ganados a la banca) y ocho
 *   se compran (20-60). Estado: P.club.icon / P.club.ic (comprados) y P.club.tit / P.club.tt (comprados).
 *   A.socio.icons(kind) / titles()   el catalogo con su estado;  icon() / setIcon(id) / buyIcon(id);  title() / setTitle(id) / buyTitle(id)
 *   A.socio.thumb(cv, id)            la miniatura de un icono en la tienda (sobre el fondo de tu carta, a escala entera)
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
  /* ---------------------------------------------------------------- lo que viste tu carta: ICONOS (el archivo es su rejilla nativa x8) y TITULOS */
  const CASA_IC = ["globe", "boss_hat"];
  const SHOP_IC = { anchor: 50, telescope: 50, lighthouse: 50, eagle: 80, crown: 80, dice: 30, slot: 50, sail: 30, worldmap: 30, columbus: 80, talisman: 30 };
  const IC_N = {
    globe: "El globo|The globe|Le globe|O globo|Der Globus|Il globo||地球仪|지구본|地球儀|Глобус|Globus",
    boss_hat: "La chistera|The top hat|Le haut-de-forme|A cartola|Der Zylinder|Il cilindro||礼帽|실크해트|シルクハット|Цилиндр|Cylinder",
    anchor: "El ancla|The anchor|L'ancre|A âncora|Der Anker|L'ancora||船锚|닻|いかり|Якорь|Kotwica",
    telescope: "El telescopio|The telescope|Le télescope|O telescópio|Das Teleskop|Il telescopio||望远镜|망원경|望遠鏡|Телескоп|Teleskop",
    lighthouse: "El faro|The lighthouse|Le phare|O farol|Der Leuchtturm|Il faro||灯塔|등대|灯台|Маяк|Latarnia morska",
    eagle: "El águila|The eagle|L'aigle|A águia|Der Adler|L'aquila||雄鹰|독수리|ワシ|Орёл|Orzeł",
    crown: "La corona|The crown|La couronne|A coroa|Die Krone|La corona||王冠|왕관|王冠|Корона|Korona",
    dice: "El dado|The die|Le dé|O dado|Der Würfel|Il dado||骰子|주사위|サイコロ|Кубик|Kostka",
    slot: "La tragaperras|The slot machine|La machine à sous|O caça-níqueis|Der Spielautomat|La slot machine||老虎机|슬롯머신|スロットマシン|Игровой автомат|Jednoręki bandyta",
    sail: "La vela|The sail|La voile|A vela|Das Segel|La vela||船帆|돛|帆|Парус|Żagiel",
    worldmap: "El mapamundi|The world map|La mappemonde|O mapa-múndi|Die Weltkarte|Il mappamondo||世界地图|세계 지도|世界地図|Карта мира|Mapa świata",
    columbus: "La carabela|The caravel|La caravelle|A caravela|Die Karavelle|La caravella||卡拉维尔帆船|카라벨선|キャラベル船|Каравелла|Karawela",
    talisman: "La herradura|The horseshoe|Le fer à cheval|A ferradura|Das Hufeisen|Il ferro di cavallo||马蹄铁|말굽|蹄鉄|Подкова|Podkowa",
  };
  /* los titulos: ach = se gana con ese logro; duel = duelos ganados a la banca; p = precio en la tienda */
  const TITLES = [
    { id: "ojo", ach: "bull_100", n: "Ojo de halcón|Hawk eye|Œil de faucon|Olho de falcão|Falkenauge|Occhio di falco||鹰眼|매의 눈|鷹の目|Соколиный глаз|Sokole oko" },
    { id: "racha", ach: "streak_20", n: "Racha de oro|Golden streak|Série en or|Sequência de ouro|Goldene Serie|Serie d'oro||黄金连胜|황금 연승|黄金の連勝|Золотая серия|Złota passa" },
    { id: "enciclo", ach: "codex_1000", n: "Enciclopedia andante|Walking encyclopedia|Encyclopédie vivante|Enciclopédia ambulante|Wandelndes Lexikon|Enciclopedia ambulante||活百科全书|걸어 다니는 백과사전|歩く百科事典|Ходячая энциклопедия|Chodząca encyklopedia" },
    { id: "capital", ach: "classic_capitals", n: "Mente capital|Capital mind|Esprit capital|Mente capital|Hauptstadtkopf|Mente capitale||首都通|수도 박사|首都の達人|Столичный ум|Stołeczny umysł" },
    { id: "mar", ach: "codex_water", n: "Alma marinera|Sea soul|Âme de marin|Alma de marinheiro|Seemannsseele|Anima marinara||航海之魂|바다의 영혼|海の魂|Морская душа|Dusza żeglarza" },
    { id: "casa", ach: "adv_wins10", n: "De vuelta a casa|Home again|De retour à la maison|De volta para casa|Wieder zu Hause|Di nuovo a casa||凯旋归来|귀환|ただいま帰還|Снова дома|Z powrotem w domu" },
    { id: "banca", duel: 25, n: "Le gana a la banca|Beats the house|Bat la banque|Vence a banca|Schlägt die Bank|Batte il banco||赢过庄家|하우스를 이긴 자|胴元に勝つ者|Обыгрывает казино|Ogrywa kasyno" },
    { id: "vuelta", ach: "classic_world", n: "La vuelta al mundo|Around the world|Le tour du monde|A volta ao mundo|Einmal um die Welt|Il giro del mondo||环游世界|세계 일주|世界一周|Вокруг света|Dookoła świata" },
    { id: "turista", p: 20, n: "Turista accidental|Accidental tourist|Touriste par hasard|Turista acidental|Zufallstourist|Turista per caso||意外的游客|우연한 여행자|うっかり観光客|Случайный турист|Przypadkowy turysta" },
    { id: "mapa", p: 20, n: "Mapa en mano|Map in hand|Carte en main|Mapa na mão|Karte in der Hand|Mappa alla mano||地图在手|지도를 든 자|地図を片手に|С картой в руке|Z mapą w ręku" },
    { id: "butan", p: 30, n: "Perdido en Bután|Lost in Bhutan|Perdu au Bhoutan|Perdido no Butão|Verloren in Bhutan|Perso in Bhutan||迷失不丹|부탄에서 길을 잃다|ブータンで迷子|Потерян в Бутане|Zagubiony w Bhutanie" },
    { id: "norte", p: 30, n: "Siempre al norte|Always north|Toujours au nord|Sempre ao norte|Immer nach Norden|Sempre a nord||永远向北|언제나 북쪽으로|いつも北へ|Всегда на север|Zawsze na północ" },
    { id: "chistera", p: 30, n: "Con chistera|Top-hatted|En haut-de-forme|De cartola|Mit Zylinder|Col cilindro||戴礼帽的|실크해트를 쓴|シルクハット姿|В цилиндре|W cylindrze" },
    { id: "doble", p: 40, n: "Doble o nada|Double or nothing|Quitte ou double|Dobro ou nada|Doppelt oder nichts|Lascia o raddoppia||加倍或归零|더블 오어 낫싱|ダブル・オア・ナッシング|Пан или пропал|Wszystko albo nic" },
    { id: "rapido", p: 40, n: "Ni idea, pero rápido|No clue, but fast|Aucune idée, mais vite|Sem ideia, mas rápido|Keine Ahnung, aber schnell|Nessuna idea, ma veloce||毫无头绪，但很快|몰라도 빠르게|分からないけど速い|Без понятия, зато быстро|Bez pojęcia, ale szybko" },
    { id: "invita", p: 60, n: "La casa invita|On the house|C'est la maison qui régale|A casa convida|Geht aufs Haus|Offre la casa||本店请客|하우스가 쏜다|店のおごり|За счёт заведения|Na koszt firmy" },
  ];
  const TIT = Object.fromEntries(TITLES.map(t => [t.id, t]));
  const TX = {
    secret: "Logro secreto|Secret achievement|Succès secret|Conquista secreta|Geheimer Erfolg|Obiettivo segreto||隐藏成就|숨겨진 업적|シークレット実績|Секретное достижение|Sekretne osiągnięcie",
    byAch: "Se gana con el logro «{a}»|Earned with the achievement “{a}”|S'obtient avec le succès « {a} »|Conquistado com a conquista “{a}”|Freigeschaltet mit dem Erfolg „{a}“|Si ottiene con l'obiettivo «{a}»||完成成就「{a}」后获得|업적 「{a}」 달성 시 획득|実績「{a}」で手に入る|Даётся за достижение «{a}»|Zdobywasz za osiągnięcie „{a}”",
    byDuel: "Se gana con 25 duelos ganados a la banca (llevas {n})|Earned by winning 25 duels against the house ({n} so far)|S'obtient en gagnant 25 duels contre la banque ({n} pour l'instant)|Conquistado vencendo 25 duelos contra a banca ({n} até agora)|Freigeschaltet mit 25 gewonnenen Duellen gegen die Bank (bisher {n})|Si ottiene vincendo 25 duelli contro il banco (finora {n})||战胜庄家 25 次后获得（目前 {n} 次）|하우스와의 대결 25승 시 획득(현재 {n}승)|胴元との勝負に25回勝つと手に入る（いま{n}勝）|Даётся за 25 побед в дуэлях с казино (пока {n})|Zdobywasz za 25 wygranych pojedynków z kasynem (na razie {n})",
    dress: "Vestir tu carta|Dress up your card|Habiller ta carte|Vestir sua carta|Karte gestalten|Vesti la tua carta||装扮你的会员卡|카드 꾸미기|カードを着せ替える|Оформить карту|Udekoruj kartę",
  };

  const prof = () => A.profile.get();
  const club = () => { A.club.level(); const c = prof().club; c.ic = c.ic && typeof c.ic === "object" ? c.ic : {}; c.tt = c.tt && typeof c.tt === "object" ? c.tt : {}; return c; };
  const achs = () => A.ACH || [];
  const achOf = id => achs().find(a => a.id === id);
  const achGot = id => !!(prof().ach || {})[id];
  const iconKind = id => CASA_IC.includes(id) ? "casa" : SHOP_IC[id] ? "tienda" : /^ach_/.test(id) && achOf(id.slice(4)) ? "logro" : null;
  const iconOwned = id => { const k = iconKind(id); return k === "casa" || (k === "logro" && achGot(id.slice(4))) || (k === "tienda" && !!(prof().club || {}).ic && !!prof().club.ic[id]); };
  const icon = () => { const c = prof().club || {}; return c.icon && iconOwned(c.icon) ? c.icon : "globe"; };   // el de antes (ficha de oro o crupier) ya no esta: vuelve el globo
  const setIcon = id => { if (!iconOwned(id)) return false; club().icon = id; A.profile.save(); return true; };
  const iconName = id => { const k = iconKind(id); if (k !== "logro") return P6(IC_N[id] || ""); const a = achOf(id.slice(4)); return a.secret && !achGot(a.id) ? "???" : A.tx(a.name); };
  const iconPrice = id => SHOP_IC[id] || 0;
  const iconHow = id => { const k = iconKind(id); if (k !== "logro") return ""; const a = achOf(id.slice(4)); return a.secret && !achGot(a.id) ? P6(TX.secret) : P6(TX.byAch).replace("{a}", A.tx(a.name)); };
  /* el catalogo: casa | logro (lo que tienes primero, en el orden de los logros) | tienda */
  function icons(kind) {
    const L = kind === "casa" ? CASA_IC.slice() : kind === "tienda" ? Object.keys(SHOP_IC) : kind === "logro" ? achs().map(a => "ach_" + a.id) : CASA_IC.concat(Object.keys(SHOP_IC), achs().map(a => "ach_" + a.id));
    const out = L.map(id => ({ id, kind: iconKind(id), owned: iconOwned(id), price: iconPrice(id), name: iconName(id), how: iconHow(id), secret: iconKind(id) === "logro" && achOf(id.slice(4)).secret }));
    return kind === "logro" ? out.filter(i => i.owned).concat(out.filter(i => !i.owned)) : out;
  }
  function buyIcon(id) { if (iconKind(id) !== "tienda" || iconOwned(id) || !A.club || !A.club.spend || !A.club.spend(iconPrice(id))) return false; const c = club(); c.ic[id] = Date.now(); c.icon = id; A.profile.save(); return true; }
  /* titulos */
  const duelWins = () => { try { return A.duelo && A.duelo.stats ? A.duelo.stats().w : 0; } catch (e) { return 0; } };
  const titleOwned = id => { const t = TIT[id]; if (!t) return false; return t.ach ? achGot(t.ach) : t.duel ? duelWins() >= t.duel : !!((prof().club || {}).tt || {})[id]; };
  const title = () => { const c = prof().club || {}; return c.tit && titleOwned(c.tit) ? c.tit : ""; };
  const setTitle = id => { if (id && !titleOwned(id)) return false; club().tit = id || ""; A.profile.save(); return true; };
  const titleName = id => (TIT[id] ? P6(TIT[id].n) : "");
  const titleHow = id => { const t = TIT[id]; if (!t) return ""; if (t.ach) { const a = achOf(t.ach); return a ? P6(TX.byAch).replace("{a}", A.tx(a.name)) : ""; } return t.duel ? P6(TX.byDuel).replace("{n}", A.fmt(Math.min(duelWins(), t.duel))) : ""; };
  const titles = () => TITLES.map(t => ({ id: t.id, kind: t.p ? "tienda" : "hito", owned: titleOwned(t.id), price: t.p || 0, name: titleName(t.id), how: titleHow(t.id) }));
  function buyTitle(id) { const t = TIT[id]; if (!t || !t.p || titleOwned(id) || !A.club || !A.club.spend || !A.club.spend(t.p)) return false; const c = club(); c.tt[id] = Date.now(); c.tit = id; A.profile.save(); return true; }

  /* ---------------------------------------------------------------- dibujo al pixel: rejilla de colores con contorno automatico */
  /* v0.3.174: con margen m alrededor para lo que asoma del canto (laureles, gemas, la N de la rosa, el terciopelo). Las coordenadas son las de la
     carta (pueden ser negativas o pasar del ancho); o() pinta un adorno, que lleva su propio contorno de tinta alrededor (ornaments) */
  function grid(w, h, m = 0) {
    const GW = w + 2 * m, GH = h + 2 * m, c = new Array(GW * GH).fill(null), orn = new Map();
    const at = (x, y) => (x + m >= 0 && y + m >= 0 && x + m < GW && y + m < GH ? (y + m) * GW + x + m : -1);
    const g = { w, h, W: w, H: h, m, GW, GH,
      set(x, y, v) { const i = at(x, y); if (i >= 0) c[i] = v; },
      get(x, y) { const i = at(x, y); return i >= 0 ? c[i] : null; },
      o(x, y, v) { if (at(x, y) >= 0) orn.set(x + "," + y, v); },
      rect(x, y, rw, rh, v) { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) g.set(i, j, v); },
      rrect(x, y, rw, rh, cut, v) { for (let j = 0; j < rh; j++) { const k = j < cut.length ? cut[j] : rh - 1 - j < cut.length ? cut[rh - 1 - j] : 0; for (let i = k; i < rw - k; i++) g.set(x + i, y + j, v); } },
      outline() { const o = []; for (let y = -m; y < h + m; y++) for (let x = -m; x < w + m; x++) { if (!g.get(x, y)) continue; if (!g.get(x - 1, y) || !g.get(x + 1, y) || !g.get(x, y - 1) || !g.get(x, y + 1)) o.push(x, y); } for (let i = 0; i < o.length; i += 2) g.set(o[i], o[i + 1], INK); },
      ornaments() { orn.forEach((v, k) => { const [x, y] = k.split(",").map(Number); g.set(x, y, v); }); orn.forEach((v, k) => { const [x, y] = k.split(",").map(Number); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { if (!orn.has((x + a) + "," + (y + b))) g.set(x + a, y + b, INK); }); }); },
      box(x, y, rw, rh, fill) { if (fill !== undefined) g.rect(x, y, rw, rh, fill); for (let i = x; i < x + rw; i++) { g.set(i, y, INK); g.set(i, y + rh - 1, INK); } for (let j = y; j < y + rh; j++) { g.set(x, j, INK); g.set(x + rw - 1, j, INK); } },
      paint(cv) { cv.width = GW; cv.height = GH; const ctx = cv.getContext("2d"), id = ctx.createImageData(GW, GH);
        c.forEach((v, i) => { if (!v) return; const n = parseInt(v.slice(1), 16); id.data[i * 4] = n >> 16; id.data[i * 4 + 1] = (n >> 8) & 255; id.data[i * 4 + 2] = n & 255; id.data[i * 4 + 3] = 255; });
        ctx.putImageData(id, 0, 0); return ctx; },
    };
    g.s = g.set;
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

  /* ---------------------------------------------------------------- LOS MARCOS (maqueta «Marcos, títulos e iconos», entrega 2): la moldura cambia y el
     material sigue siendo el de tu edicion (unos laureles de papel, de plata o de oro segun tu categoria). Dibujados al pixel, en espejo exacto.
     p = precio en la tienda; ach = se gana con ese logro (10 Aventuras ganadas); casa = el de siempre */
  const MG = 6;                                                            // lo que puede asomar del canto, en pixeles de arte
  /* un adorno dibujado para la esquina de arriba a la izquierda y puesto en las cuatro, en espejo */
  function corners4(g, rows, ox, oy, pal, layer = "o") {
    const W = g.W, H = g.H;
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === ".") return; const v = pal[ch], x = ox + i, y = oy + j; g[layer](x, y, v); g[layer](W - 1 - x, y, v); g[layer](x, H - 1 - y, v); g[layer](W - 1 - x, H - 1 - y, v); }));
  }
  const MARCOS = [
    { id: "filete", casa: true, n: "El de la casa|The house frame|Celui de la maison|O da casa|Der des Hauses|Quella della casa||本店边框|하우스 기본|ハウスの額縁|Фирменная рамка|Firmowa ramka",
      draw(g, F) { const dia = (cx, cy) => { [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]].forEach(([dx, dy]) => g.s(cx + dx, cy + dy, F[0])); g.s(cx, cy, F[2]); }; [[4, 4], [g.W - 5, 4], [4, g.H - 5], [g.W - 5, g.H - 5]].forEach(([x, y]) => dia(x, y)); } },
    { id: "remaches", p: 40, n: "Cámara acorazada|Vault|Chambre forte|Cofre-forte|Tresorraum|Caveau||金库|금고|金庫室|Хранилище|Skarbiec",
      draw(g, F) {
        corners4(g, ["aaaaaab", "abbbbbc", "abbkbbc", "abkkkbc", "abbkbbc", "abbbbbc", "bcccccc"], 0, 0, { a: F[0], b: F[1], c: F[2], k: INK });
        const cx = (g.W - 1) / 2; for (let x = 13; x < cx - 3; x += 8) [x, g.W - 1 - x].forEach(xx => { g.o(xx, 2, F[0]); g.o(xx, g.H - 3, F[0]); });
        const cy = (g.H - 1) / 2; for (let y = 15; y < cy - 3; y += 9) [y, g.H - 1 - y].forEach(yy => { g.o(2, yy, F[0]); g.o(g.W - 3, yy, F[0]); }); } },
    { id: "naipes", p: 40, n: "La baraja|The deck|Le jeu de cartes|O baralho|Das Kartenspiel|Il mazzo||扑克牌|카드 한 벌|トランプ|Колода|Talia",
      draw(g) {
        corners4(g, Array(11).fill("wwwwwwwww"), -1, -1, { w: "#fffaec" });
        const put = (x0, y0, k, col) => SUIT[k].forEach((r, j) => [...r].forEach((ch, i) => { if (ch === "1") g.o(x0 + i, y0 + j, col); }));
        put(1, 2, 0, "#16241c"); put(g.W - 6, 2, 1, "#d8283f"); put(1, g.H - 7, 3, "#16241c"); put(g.W - 6, g.H - 7, 2, "#d8283f"); } },
    { id: "rosa", p: 100, n: "Rosa de los vientos|Compass rose|Rose des vents|Rosa dos ventos|Windrose|Rosa dei venti||罗盘玫瑰|나침반 장미|コンパスローズ|Роза ветров|Róża wiatrów",
      draw(g, F) {
        const star = []; for (let j = -4; j <= 4; j++) { let r = ""; for (let i = -4; i <= 4; i++) r += (i === 0 && j === 0) ? "r" : (i === 0 || j === 0) ? (Math.abs(i + j) === 4 ? "c" : "a") : (Math.abs(i) === Math.abs(j) && Math.abs(i) <= 2) ? "c" : "."; star.push(r); }
        corners4(g, star, 0, 0, { a: F[0], c: F[2], r: "#d8283f" });
        const c0 = Math.floor((g.W - 1) / 2), c1 = c0 + 1;                // la N, arriba en el centro
        [[-6, 0], [-5, -1], [-4, -2]].forEach(([y, a]) => { for (let x = c0 + a; x <= c1 - a; x++) g.o(x, y, "#d8283f"); });
        for (let y = -3; y <= -1; y++) { g.o(c0, y, F[0]); g.o(c1, y, F[0]); }
        for (let x = 12; x < g.W - 12; x += 4) { g.s(x, 2, F[2]); g.s(x, g.H - 3, F[2]); if ((x - 12) % 12 === 0) { g.s(x, 3, F[2]); g.s(x, g.H - 4, F[2]); } } } },
    { id: "laurel", ach: "adv_wins10", n: "Laureles|Laurels|Lauriers|Louros|Lorbeeren|Allori||月桂|월계관|月桂冠|Лавры|Laury",
      draw(g) {
        const L = "#7bc96f", Mm = "#3d8a5f", D = "#1f4d38";
        for (const side of [0, 1]) { const X = x => side ? g.W - 1 - x : x;
          for (let y = Math.round(g.H * .2); y <= g.H - 8; y++) g.o(X(-3), y, D);
          for (let y = Math.round(g.H * .2) + 4; y <= g.H - 10; y += 7) { [[-1, -1, Mm], [-2, -2, L], [-2, -1, Mm], [-1, -2, L]].forEach(([dx, dy, c]) => g.o(X(-3 + dx), y + dy, c)); [[1, -1, Mm], [2, -2, L], [1, -2, L], [2, -1, Mm]].forEach(([dx, dy, c]) => g.o(X(-3 + dx), y + dy, c)); } }
        const bow = ["rr......rr", "rrr.RR.rrr", ".rrrRRrrr.", "..r.RR.r..", "..r....r.."], x0 = Math.floor((g.W - 1) / 2) - 4;
        bow.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== ".") g.o(x0 + i, g.H - 1 + j, ch === "R" ? "#8f1426" : "#d8283f"); })); } },
    { id: "joyero", p: 250, n: "El joyero|The jewel box|Le coffret à bijoux|O porta-joias|Das Schmuckkästchen|Il portagioie||珠宝匣|보석함|宝石箱|Шкатулка|Szkatułka",
      draw(g) {
        const gem = []; for (let j = -3; j <= 3; j++) { let r = ""; for (let i = -3; i <= 3; i++) r += Math.abs(i) + Math.abs(j) > 3 ? "." : (i === 0 && j === -1) ? "w" : j < 0 ? (Math.abs(i) + Math.abs(j) <= 2 ? "p" : "r") : j > 0 ? "R" : "r"; gem.push(r); }
        corners4(g, gem, 1, 1, { w: "#fff7e6", p: "#ff9aa6", r: "#d8283f", R: "#8f1426" });
        const em = (cx, cy) => { for (let y = Math.floor(cy - 2.5); y <= Math.ceil(cy + 2.5); y++) for (let x = Math.floor(cx - 3); x <= Math.ceil(cx + 3); x++) { const d = Math.abs(x - cx) + Math.abs(y - cy); if (d <= 2.6) g.o(x, y, y < cy ? "#7be0a0" : y > cy ? "#14603a" : "#22a85a"); } };
        em((g.W - 1) / 2, 2); em((g.W - 1) / 2, g.H - 3); em(2, (g.H - 1) / 2); em(g.W - 3, (g.H - 1) / 2); } },
    { id: "terciopelo", p: 250, n: "Terciopelo|Velvet|Velours|Veludo|Samt|Velluto||天鹅绒|벨벳|ベルベット|Бархат|Aksamit",
      draw(g, F) {
        for (let y = -g.m; y < g.H + g.m; y++) for (let x = -g.m; x < g.W + g.m; x++) {
          const dx = x < 0 ? -x : x >= g.W ? x - g.W + 1 : 0, dy = y < 0 ? -y : y >= g.H ? y - g.H + 1 : 0, d = Math.max(dx, dy); if (!d || dx + dy > 9) continue;
          g.s(x, y, d === 1 ? INK : d === 2 ? (((x + y) >> 1) & 1 ? F[0] : F[2]) : d === 3 ? (y < 0 ? "#e0505a" : "#c8323f") : d === 4 ? "#a01a30" : "#6e1024"); } } },
  ];
  const MAR = Object.fromEntries(MARCOS.map(m => [m.id, m]));
  const marcoOwned = id => { const m = MAR[id]; if (!m) return false; return !!m.casa || (m.ach ? achGot(m.ach) : !!((prof().club || {}).mc || {})[id]); };
  const marco = () => { const c = prof().club || {}; return c.marco && marcoOwned(c.marco) ? c.marco : "filete"; };
  const setMarco = id => { if (!marcoOwned(id)) return false; club().marco = id; A.profile.save(); return true; };
  const marcoName = id => (MAR[id] ? P6(MAR[id].n) : "");
  const marcoHow = id => { const m = MAR[id]; if (!m || !m.ach) return ""; const a = achOf(m.ach); return a ? P6(TX.byAch).replace("{a}", A.tx(a.name)) : ""; };
  const marcos = () => MARCOS.map(m => ({ id: m.id, kind: m.casa ? "casa" : m.p ? "tienda" : "hito", owned: marcoOwned(m.id), price: m.p || 0, name: marcoName(m.id), how: marcoHow(m.id) }));
  function buyMarco(id) { const m = MAR[id]; if (!m || !m.p || marcoOwned(id) || !A.club || !A.club.spend || !A.club.spend(m.p)) return false; const c = club(); c.mc = c.mc && typeof c.mc === "object" ? c.mc : {}; c.mc[id] = Date.now(); c.marco = id; A.profile.save(); return true; }

  /* la carta entera, a su rejilla nativa (96 x H). Devuelve donde va cada texto */
  function draw(cv, t, two, tit, mk) {
    const TS = tit ? 12 : 0, e = ED[A.club.groupOf(t)], [kind, pal] = ART[t] || ART[0], H = (two ? 136 : 128) + TS, bh = two ? 21 : 13, F = e.frame, g = grid(96, H, MG);
    g.rrect(0, 0, 96, H, [3, 2, 1], F[1]);
    for (let i = 3; i < 93; i++) { g.set(i, 1, F[0]); g.set(i, H - 2, F[2]); } for (let j = 3; j < H - 3; j++) { g.set(1, j, F[0]); g.set(94, j, F[2]); }
    for (let i = 4; i < 92; i++) { g.set(i, 4, F[2]); g.set(i, H - 5, F[2]); } for (let j = 4; j < H - 4; j++) { g.set(4, j, F[2]); g.set(91, j, F[2]); }   // filete
    if (e.pin) for (let i = 9; i < 87; i += 2) { g.set(i, 2, F[0]); g.set(i, H - 3, F[0]); }                // filete de oro de las negras
    g.box(7, 7, 82, bh, e.band);
    const y0 = 7 + bh + 2; g.box(7, y0, 82, 67, null);
    for (let j = 1; j < 66; j++) for (let i = 1; i < 81; i++) g.set(7 + i, y0 + j, pal[pattern(kind, i - 1, j - 1, 80, 65)]);
    for (let i = 8; i < 88; i++) g.set(i, y0 + 1, pal[3]);                                                // la sombra del borde de arriba
    const yn = y0 + 69; g.box(7, yn, 82, 17, "#fffaec"); for (let i = 8; i < 88; i++) g.set(i, yn + 15, "#e9dcb8");
    const yt = yn + 18; if (TS) { g.box(7, yt, 82, 11, "#2a1e14"); for (let i = 8; i < 88; i++) g.set(i, yt + 1, "#4a3624"); }   // la placa de cuero del titulo
    const yf = yn + 19 + TS; g.box(7, yf, 82, 12, e.band);
    (MAR[mk] || MAR.filete).draw(g, F, e);                                 // la moldura (v0.3.174): el filete de siempre o el marco que lleves
    g.outline(); g.ornaments();
    const ctx = g.paint(cv);
    /* el lienzo lleva MG pixeles de margen alrededor: win va en pixeles del lienzo; los textos, en pixeles de la carta */
    return { ctx, H, e, m: MG, cat: [7, 7, 82, bh], win: [8 + MG, y0 + 1 + MG, 80, 65], name: [7, yn, 82, 16], tit: TS ? [7, yt, 82, 11] : null, foot: [7, yf, 82, 12] };
  }
  /* el icono, a su rejilla nativa en el centro de la ventana (el archivo es la rejilla x8: 48 px los logros, 64 los objetos) */
  const imgCache = {};
  function iconImg(id) { const src = `assets/icons/${id}.webp`; let im = imgCache[src]; if (!im) { im = imgCache[src] = new Image(); im.decoding = "async"; im.src = src; } return im; }
  function drawIcon(ctx, win, id, done) {
    const im = iconImg(id), go = () => { const n = Math.round(im.naturalWidth / 8), m = Math.round(im.naturalHeight / 8); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, Math.round(win[0] + (win[2] - n) / 2), Math.round(win[1] + (win[3] - m) / 2), n, m); if (done) done(); };
    if (im.complete && im.naturalWidth) go(); else im.addEventListener("load", go, { once: true });
  }
  /* la miniatura de la tienda: el fondo de la ventana de TU carta y el icono a escala entera (el lienzo mide lo que ocupa en pixeles reales).
     Sin conseguir: en gris y oscuro (como los logros del Perfil); un secreto, solo su sombra */
  function thumb(cv, id, opt = {}) {
    const W = cv.width, H = cv.height, c = cv.getContext("2d"), t = A.club.tierNow(), [kind, pal] = ART[t] || ART[0], im = iconImg(id);
    const go = () => {
      const n = Math.round(im.naturalWidth / 8) || 48, m = Math.round(im.naturalHeight / 8) || 48;
      const base = opt.base || Math.max(n, m), k = Math.max(1, Math.floor(Math.min(W, H) / (base + 12))), w = Math.ceil(W / k), h = Math.ceil(H / k);   // la misma escala para toda la pagina (base = su icono mas grande)
      const o = document.createElement("canvas"); o.width = w; o.height = h; const x = o.getContext("2d"), img = x.createImageData(w, h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = parseInt(pal[pattern(kind, i, j, w, h)].slice(1), 16), q = (j * w + i) * 4; img.data[q] = v >> 16; img.data[q + 1] = (v >> 8) & 255; img.data[q + 2] = v & 255; img.data[q + 3] = 255; }
      x.putImageData(img, 0, 0); x.imageSmoothingEnabled = false;
      if (opt.locked) x.filter = opt.secret ? "brightness(0) opacity(.55)" : "grayscale(1) brightness(.55)";
      x.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, Math.round((w - n) / 2), Math.round((h - m) / 2), n, m); x.filter = "none";
      c.imageSmoothingEnabled = false; c.clearRect(0, 0, W, H); c.drawImage(o, Math.floor((W - w * k) / 2), Math.floor((H - h * k) / 2), w * k, h * k);
    };
    if (im.complete && im.naturalWidth) go(); else im.addEventListener("load", go, { once: true });
  }


  /* ---------------------------------------------------------------- montarla: escala entera, textos, brillo e inclinacion */
  const reduce = () => document.documentElement.classList.contains("reduce-motion");
  /* el ancho se lee del estilo (decimal), no de offsetWidth (redondeado): con un ancho redondeado la medida bailaba entre dos valores y la carta se redibujaba sin parar (y borraba la inclinacion) */
  /* v0.3.174: con el zoom de la pantalla (A.fitK) que da el navegador: la medida del rectangulo cambiaba con las animaciones de entrada (una fila de
     la Clasificacion que aparece escalando) y la chapa se quedaba a otra escala */
  function realPerCss(el) { const z = el.currentCSSZoom; if (z) return z * (devicePixelRatio || 1); const w = parseFloat(el.style.width) || el.offsetWidth; if (!w) return 0; return (el.getBoundingClientRect().width / w) * (devicePixelRatio || 1); }
  /* cuantos pixeles reales hace cada pixel de arte: el mayor entero que cabe en el ancho pedido, pero nunca menos que el entero mas cercano a
     2 pixeles de DISENO por pixel de arte (por debajo, la letra minima de la Deck ya no cabe en sus bandas). v0.3.171: el mas cercano, no el de
     encima: en un portatil de 1366x768 o 1440x900 (1,07-1,12 pixeles reales por pixel de diseno) la carta va a x2, el mismo pixel que en la Deck;
     a x3 crecia un 50 % y se metia debajo de las cartas de modo de la portada */
  function scaleFor(host, w) { const r = realPerCss(host) || 1, s = Math.max(2, Math.round(2 * r), Math.floor((w * r) / 96 + 0.01)); return { s, d: s / r }; }

  function data(o) {
    const P = prof(), t = o.t != null ? o.t : A.club.tierNow(), c = P.club || {}, L = A.club.levelOf(A.club.xp());
    if (o.other) return { t, name: o.name || "—", cat: A.club.tierName(t), lvl: o.lvl || 1, f: null };   // v0.3.174: la carta de otro socio (podio): sin sus fichas
    if (o.nof) return { t, name: P.name || P6("Anónimo|Anonymous|Anonyme|Anônimo|Anonym|Anonimo||匿名|익명|匿名|Аноним|Anonim"), cat: A.club.tierName(t), lvl: L.lvl, f: null };   // la tuya en el podio: como las demas, sin fichas
    return { t, name: P.name || P6("Anónimo|Anonymous|Anonyme|Anônimo|Anonym|Anonimo||匿名|익명|匿名|Аноним|Anonim"), cat: A.club.tierName(t), lvl: L.lvl, f: c.fSeen == null ? A.club.fichas() : c.fSeen };
  }
  function mount(host, o = {}) {
    if (!host || !A.club) return;
    host.classList.add("sc-host");
    const W = o.w || 192; host.style.width = W + "px";
    const build = () => {
      if (!host.isConnected) return;
      const D = data(o), { s, d } = scaleFor(host, W), ic = o.icon || icon(), tt = o.title !== undefined ? o.title : title(), mk = o.marco || marco();
      const sig = [D.t, D.name, D.cat, D.lvl, D.f, ic, tt, mk, s, d.toFixed(4), A.lang].join("|"); if (host._sig === sig) return; host._sig = sig;
      host.innerHTML = "";
      const card = document.createElement("span"); card.className = "sc-card";
      const tilt = document.createElement("span"); tilt.className = "sc-tilt";
      const cv = document.createElement("canvas"); cv.className = "sc-cv";
      /* el titulo de la categoria: una linea si cabe a 18 px de diseno (el minimo de la Deck), si no, dos (la carta crece 8 pixeles) */
      const probe = document.createElement("span"); probe.className = "sc-cat"; probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-size:${Math.max(18, 9 * d)}px`; probe.textContent = D.cat; host.appendChild(probe);
      const two = probe.scrollWidth > 76 * d && /\s/.test(D.cat.trim()); probe.remove();             // una palabra sola no se parte: se estrecha (squeeze)
      const L = draw(cv, D.t, two, !!tt, mk);
      drawIcon(L.ctx, L.win, ic);
      const px = v => v * d + "px", box = (r, cls, html) => `<span class="${cls}" style="left:${px(r[0])};top:${px(r[1])};width:${px(r[2])};height:${px(r[3])}">${html}</span>`;
      const fi = `<img class="sc-fi" src="assets/icons/ficha_oro.webp" alt="" style="width:${px(9)};height:${px(9)}">`;
      card.style.width = px(96); card.style.height = px(L.H); card.style.setProperty("--sd", d);
      card.style.setProperty("--ink", L.e.ink);
      /* el lienzo y sus capas (sombra, brillo, reflejo) llevan el margen del marco alrededor: la carta mide lo mismo y lo que asoma sale por fuera */
      const ext = `left:${px(-L.m)};top:${px(-L.m)};right:auto;bottom:auto;width:${px(96 + 2 * L.m)};height:${px(L.H + 2 * L.m)}`;
      cv.style.cssText = ext; tilt.appendChild(cv);
      const mask = `url(${cv.toDataURL()})`;
      ["sc-shadow", "sc-fx fx-" + (L.e.fx || "no"), "sc-glare"].forEach((cls, i) => { const m = document.createElement("span"); m.className = cls; m.style.cssText = ext; m.style.webkitMaskImage = m.style.maskImage = mask; (i ? tilt : card).appendChild(m); });
      tilt.insertAdjacentHTML("beforeend", box(L.cat, "sc-cat" + (two ? " two" : ""), `<span>${esc(D.cat)}</span>`)
        + box(L.name, "sc-name", esc(D.name))
        + (L.tit ? box(L.tit, "sc-tit", `<span>${esc(titleName(tt))}</span>`) : "")
        + box(L.foot, "sc-foot", `<b class="sc-lv">${esc(P6(A.club.tx.lvS).replace("{n}", D.lvl))}</b>${D.f == null ? "" : `<span class="sc-f">${fi}<b${o.id ? ` id="${o.id}"` : ""}>${A.fmt(D.f)}</b></span>`}`));
      card.appendChild(tilt); host.appendChild(card); host.style.width = px(96); host.style.height = px(L.H);
      fit(tilt.querySelector(".sc-cat"), two ? 8 : 10, d); fit(tilt.querySelector(".sc-name"), 13, d); squeeze(tilt.querySelector(".sc-cat > span"), tilt.querySelector(".sc-cat"));
      if (L.tit) { fit(tilt.querySelector(".sc-tit"), 9, d); squeeze(tilt.querySelector(".sc-tit > span"), tilt.querySelector(".sc-tit"), .72); }
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
  /* ---------------------------------------------------------------- LA CHAPA (v0.3.174, maqueta «Marcos, títulos e iconos»): 80 x 80, el icono en su ventana
     sobre el fondo de la categoria y el marco en pequeno. Es lo que ven los demas (las filas de la Clasificacion y la cabecera del Duelo) y, en la
     tienda, la muestra de cada marco. Escala entera de pixeles reales, como la carta */
  function badgeArt(cv, t, mk) {
    const e = ED[A.club.groupOf(t)] || ED[0], [kind, pal] = ART[t] || ART[0], F = e.frame, g = grid(80, 80, MG);
    g.rrect(0, 0, 80, 80, [3, 2, 1], F[1]);
    for (let i = 3; i < 77; i++) { g.set(i, 1, F[0]); g.set(i, 78, F[2]); } for (let j = 3; j < 77; j++) { g.set(1, j, F[0]); g.set(78, j, F[2]); }
    for (let i = 4; i < 76; i++) { g.set(i, 4, F[2]); g.set(i, 75, F[2]); } for (let j = 4; j < 76; j++) { g.set(4, j, F[2]); g.set(75, j, F[2]); }
    if (e.pin) for (let i = 9; i < 71; i += 2) { g.set(i, 2, F[0]); g.set(i, 77, F[0]); }
    g.box(7, 7, 66, 66, null);
    for (let j = 1; j < 65; j++) for (let i = 1; i < 65; i++) g.set(7 + i, 7 + j, pal[pattern(kind, i - 1, j - 1, 64, 64)]);
    (MAR[mk] || MAR.filete).draw(g, F, e);
    g.outline(); g.ornaments();
    const ctx = g.paint(cv);
    return { ctx, e, m: MG, win: [8 + MG, 8 + MG, 64, 64] };
  }
  /* o: { w: ancho de diseno que puede ocupar (80 por defecto), t, marco, icon (la de otro socio: o.other) } */
  function badge(host, o = {}) {
    if (!host || !A.club) return;
    const W = o.w || 80; host.classList.add("sc-host", "sc-badge"); host.style.width = W + "px";
    const build = () => {
      if (!host.isConnected) return;
      const t = o.t != null ? o.t : A.club.tierNow(), mk = o.marco || (o.other ? "filete" : marco()), ic = o.icon || (o.other ? "globe" : icon());
      const r = realPerCss(host) || 1, s = Math.max(1, Math.floor((W * r) / 80 + 0.01)), d = s / r;   // el mayor entero que cabe en su hueco
      const sig = [t, mk, ic, s, d.toFixed(4)].join("|"); if (host._sig === sig) return; host._sig = sig;
      host.innerHTML = "";
      const card = document.createElement("span"), cv = document.createElement("canvas"); card.className = "sc-card";
      const L = badgeArt(cv, t, mk), px = v => v * d + "px";
      drawIcon(L.ctx, L.win, ic);
      card.style.width = card.style.height = px(80); card.style.setProperty("--sd", d);
      const ext = `left:${px(-L.m)};top:${px(-L.m)};right:auto;bottom:auto;width:${px(80 + 2 * L.m)};height:${px(80 + 2 * L.m)}`;
      cv.className = "sc-cv"; cv.style.cssText = ext;
      const mask = `url(${cv.toDataURL()})`;
      const sh = document.createElement("span"); sh.className = "sc-shadow"; sh.style.cssText = ext; sh.style.webkitMaskImage = sh.style.maskImage = mask; card.appendChild(sh);
      card.appendChild(cv);
      if (L.e.fx) { const fx = document.createElement("span"); fx.className = "sc-fx fx-" + L.e.fx; fx.style.cssText = ext; fx.style.webkitMaskImage = fx.style.maskImage = mask; card.appendChild(fx); }
      host.appendChild(card); host.style.width = host.style.height = px(80);
      if (o.onsize) o.onsize(px(80));
    };
    host._build = build; build();
    if (!host._ro && window.ResizeObserver) { host._ro = new ResizeObserver(() => { if (!host._rq) host._rq = requestAnimationFrame(() => { host._rq = 0; host._build(); }); }); try { host._ro.observe(host, { box: "device-pixel-content-box" }); } catch (e) { host._ro.observe(host); } }
  }
  /* TU ESTILO en corto, para que los demas vean tu carta (la Clasificacion lo guarda con tu puntuacion; la sala del Duelo, con tu sitio):
     «categoria.marco.icono.titulo.nivel» (x = sin titulo). parse() lo valida pieza a pieza: lo que no exista vuelve a lo de la casa */
  const code = () => [A.club.tierNow(), marco(), icon(), title() || "x", A.club.levelOf(A.club.xp()).lvl].join(".");
  function parse(c) {
    const m = /^(\d{1,2})\.([a-z]{1,12})\.([a-z0-9_]{1,32})\.([a-z]{1,12})\.(\d{1,4})$/.exec(String(c || "")); if (!m) return null;
    const t = +m[1]; if (!ART[t]) return null;
    return { t, marco: MAR[m[2]] ? m[2] : "filete", icon: iconKind(m[3]) ? m[3] : "globe", title: TIT[m[4]] ? m[4] : "", lvl: Math.max(1, +m[5]) };
  }
  /* una sola palabra mas larga que la banda (el ruso «Путешественник») no se puede partir: se estrecha lo justo, como mucho un 20 % */
  function squeeze(sp, box, min = .8) { if (!sp || !box) return; sp.style.display = "inline-block"; sp.style.transform = ""; const room = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) * 2, w = sp.scrollWidth; if (w > room && room > 0) sp.style.transform = `scaleX(${Math.max(min, room / w).toFixed(3)})`; }
  /* la letra baja de 1 en 1 hasta caber (sin pasar de 18 px de diseno); si aun no cabe, puntos suspensivos */
  function fit(el, base, d) { if (!el) return; let fs = Math.max(18, base * d); el.style.fontSize = fs + "px"; while (el.scrollWidth > el.clientWidth + 1 && fs > 18) { fs = Math.max(18, fs - 1); el.style.fontSize = fs + "px"; } }

  /* ---------------------------------------------------------------- el Perfil: lo que llevas y el boton que abre la tienda en «Tu carta» */
  function picker(host) {
    if (!host) return;                                                      // el icono y el titulo ya se ven en la carta: aqui, solo el boton
    host.innerHTML = `<button type="button" class="gx-btn sm pri sc-dress" id="pfDress">${A.icon("m_prof")}<span>${esc(P6(TX.dress))}</span></button>`;
    host.querySelector("#pfDress").onclick = () => { if (A.sfx && A.sfx.card) A.sfx.card(); if (A.boutique) A.boutique.cat("carta"); A.hub.screen("boutique"); };
  }

  /* el truco de pruebas (js/truco.js): todo lo de la tienda, tuyo (los logros ya los da el truco) */
  const _todo = () => { const c = club(); Object.keys(SHOP_IC).forEach(id => { c.ic[id] = c.ic[id] || Date.now(); }); TITLES.forEach(t => { if (t.p) c.tt[t.id] = c.tt[t.id] || Date.now(); }); c.mc = c.mc && typeof c.mc === "object" ? c.mc : {}; MARCOS.forEach(m => { if (m.p) c.mc[m.id] = c.mc[m.id] || Date.now(); }); A.profile.save(); };

  A.socio = { mount, picker, thumb, icons, icon, setIcon, buyIcon, iconName, iconHow, iconKind, iconOwned, titles, title, setTitle, buyTitle, titleName, titleHow, titleOwned,
    marcos, marco, setMarco, buyMarco, marcoName, marcoHow, marcoOwned, badge, code, parse, _todo, ART, ED, _draw: draw, _badge: badgeArt };
})(window.AIQ);
