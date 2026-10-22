/*
 * Geolite - EL VESTUARIO DEL CRUPIER (v0.3.134, Club de la casa): ropa para Don Crupier que se compra en la boutique con fichas de oro.
 * Solo cambia colores del arte aprobado de Pixel Lab (nunca dibuja): el mapa de partes (js/crupier-partes.js, mismo tamano que el atlas
 * de js/crupier-data.js) dice que es cada pixel (1 traje, 2 chistera, 3 cinta de la chistera, 4 antifaz, 5 pajarita, 6 y 7 sus lunares; y en
 * otros bits, el clavel de la solapa) y aqui
 * se recolorea el atlas UNA vez al cambiar de ropa; el crupier (js/crupier.js) dibuja con ese atlas, sin coste en cada fotograma.
 * Todo en la paleta Geolite 32; el contorno sigue en tinta. Una CARTA de 12 colores, la misma y en el mismo orden para el traje, el antifaz
 * y la pajarita (con la cinta de la chistera a juego); el de la casa de cada hueco es gratis. La chistera sigue al traje salvo la dorada (legendaria).
 * Bloque D: seis piezas de guino (corazon, espada y mando en la solapa, en el hueco del clavel; gafas sobre el antifaz; cristal en la cinta de la
 * chistera; pocion en el chaleco, en el hueco de la cadena), pintadas tal cual como capas por fotograma (js/crupier-guinos.js, como la pluma).
 * Estado en el perfil: P.vest = { own: { id: fecha }, wear: { traje, antifaz, pajarita, chistera, lunares, clavel, cadena, pluma, veneciano, gafas,
 * cristal } } (null = el de la casa / nada; clavel = "si" | "corazon" | "espada" | "mando"; cadena = "si" | "pocion"; el resto de piezas, "si").
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
    { k: "azul", traje: ["#1689fb", "#0c60d3"], antifaz: ["#1689fb", "#0c60d3", "#7ac8ff", "#0c60d3", "#301252"], pajarita: ["#1689fb", "#0c60d3"],
      n: ["azul", "Blue", "bleu", "azul", "Blauer|Blaue", "blu", "", "蓝色", "파란", "青の", "Синий|Синяя", "Niebieski|Niebieska"] },
    { k: "morado", traje: ["#4a1d96", "#301252"], antifaz: ["#6e40c4", "#4a1d96", "#9c7ce6", "#4a1d96", "#301252"], pajarita: ["#6e40c4", "#4a1d96"], casa: "traje",
      n: ["morado|morada", "Purple", "violet", "roxo|roxa", "Violetter|Violette", "viola", "", "紫色", "보라", "紫の", "Фиоле­товый|Фиоле­товая", "Fioletowy|Fioletowa"] },
    { k: "plata", traje: ["#8a8fa8", "#3a2f58"], antifaz: ["#f3f0fa", "#c9cde0", "#f3f0fa", "#8a8fa8", "#3a2f58"], pajarita: ["#c9cde0", "#8a8fa8"], lunares: ["#3a2f58", "#301252"],
      n: ["de plata", "Silver", "argenté", "prateado|prateada", "Silberner|Silberne", "argentato|argentata", "", "银色", "은빛", "銀の", "Сереб­ряный|Сереб­ряная", "Srebrny|Srebrna"] },
    { k: "negro", traje: ["#3a2f58", "#301252"], antifaz: ["#3a2f58", "#301252", "#8a8fa8", "#301252", "#1d0a3d"], pajarita: ["#3a2f58", "#301252"],
      n: ["negro|negra", "Black", "noir", "preto|preta", "Schwarzer|Schwarze", "nero|nera", "", "黑色", "검은", "黒の", "Чёрный|Чёрная", "Czarny|Czarna"] },
  ];
  const BY = Object.fromEntries(COLORS.map(c => [c.k, c]));
  const CHISTERA = { dorada: ["#f5a623", "#c46a1b"] };
  /* LAS PIEZAS: se ponen encima de la ropa. Lunares: en la pajarita (no en la cinta), del color que lleve; el mapa de partes marca cada lunar
     de cada fotograma (6 sobre el tono claro, 7 sobre la sombra: geolite-art-tools/.../vestuario/lunares.py). Blancos; en la de plata, oscuros */
  const LUNARES = ["#f3f0fa", "#c9cde0"];
  /* Piezas pintadas encima (no recolorean): el clavel de la solapa y la cadena del reloj, las de la maqueta (Pixel Lab) limpias y colocadas
     fotograma a fotograma (pieza.py). Bits 3-7 del mapa de partes: 1-5 el clavel (flor, sombra, contorno, hoja, hoja oscura), 6-10 la cadena
     (oro claro, medio, oscuro, pliegue, tinta). Detras de manos, cartas y chistera; con el cuerpo girado, no se ven */
  const PX = [null, ["clavel", 0xe8283a], ["clavel", 0xa8142e], ["clavel", 0x1d0a3d], ["clavel", 0x3fb54a], ["clavel", 0x136b3e],
    ["cadena", 0xfdd742], ["cadena", 0xf5a623], ["cadena", 0xc46a1b], ["cadena", 0x3c240a], ["cadena", 0x1d0a3d]];
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
  const PRICE = { traje: 250, antifaz: 250, pajarita: 150, p: 300, l: 600 };
  const SLOTS = ["traje", "antifaz", "pajarita", "chistera", "lunares", "clavel", "cadena", "pluma", "veneciano", "gafas", "cristal"];
  const PIEZAS = ["lunares", "clavel", "cadena", "pluma", "veneciano", "gafas", "cristal"];
  /* bloque D: las piezas de guino comparten hueco con las de siempre. La solapa lleva el clavel ("si") o el corazon, la espada o el mando; el
     chaleco, la cadena ("si") o la pocion. Gafas y cristal tienen hueco propio. Lo guardado antes ("si") sigue siendo el clavel y la cadena */
  const VAL = { clavel: ["si", "corazon", "espada", "mando"], cadena: ["si", "pocion"] };
  const okVal = (s, v) => (VAL[s] || ["si"]).includes(v);
  /* las piezas de guino (corazon, espada y mando en la solapa, gafas sobre el antifaz, cristal en la cinta, pocion en el chaleco) van como capas
     por fotograma (js/crupier-guinos.js), como la pluma: se pintan tal cual, sin recolorear. [hueco, valor, clave de sus capas] en el orden en
     que se pintan */
  const GUINOS = [["gafas", "si", "gafas"], ["cristal", "si", "cristal"], ["clavel", "corazon", "corazon"], ["clavel", "espada", "espada"], ["clavel", "mando", "mando"], ["cadena", "pocion", "pocion"]];
  /* la pluma de pavo real y el antifaz veneciano salen del dibujo (por encima de la copa, sobre sienes y orejas): no se pintan en el atlas
     sino como capas por fotograma (js/crupier-pluma.js, js/crupier-veneciano.js) que js/crupier.js pone encima si el atlas vestido las
     lleva (atlas.ov). El oro de las alas del veneciano toma el color del antifaz */
  const BUY = ["traje", "antifaz", "pajarita"];
  const nameOf = (slot, c) => NAME[slot].map((pat, i) => { if (i === 6) return ""; const [m, f] = c.n[i].split("|"); return pat.replace("{m}", m).replace("{f}", f || m); }).join("|");
  /* el catalogo: por hueco, los 12 colores en el orden de la carta; al final, la legendaria. id = <hueco>_<color> */
  const ITEMS = BUY.flatMap(slot => COLORS.map(c => ({ id: slot + "_" + c.k, slot, v: c.k, r: "r", casa: c.casa === slot, n: nameOf(slot, c), d: c.casa === slot ? DESC.casa : DESC[slot] })))
    .concat([{ id: "pieza_lunares", slot: "lunares", v: "si", r: "p", casa: false,
      n: "Lunares|Polka dots|Pois|Bolinhas|Punkte|Pois||波点|물방울무늬|水玉|Горошек|Grochy",
      d: "Lunares en la pajarita, sea del color que sea.|Polka dots on the bow tie, whatever its colour.|Des pois sur le nœud papillon, quelle que soit sa couleur.|Bolinhas na gravata-borboleta, seja qual for a cor.|Punkte auf der Fliege, egal in welcher Farbe.|Pois sul papillon, di qualunque colore sia.||领结上的波点，不论领结是什么颜色。|나비넥타이에 물방울무늬, 어떤 색이든.|蝶ネクタイに水玉。色はどれでも。|Горошек на бабочке, какого бы цвета она ни была.|Grochy na musze, niezależnie od jej koloru." }])
    .concat([{ id: "pieza_clavel", slot: "clavel", v: "si", r: "p", casa: false,
      n: "Clavel en la solapa|Carnation buttonhole|Œillet à la boutonnière|Cravo na lapela|Nelke im Knopfloch|Garofano all'occhiello||翻领康乃馨|옷깃의 카네이션|襟のカーネーション|Гвоздика в петлице|Goździk w butonierce",
      d: "Un clavel rojo en la solapa, de los de antes.|A red carnation in the lapel, the old-school way.|Un œillet rouge à la boutonnière, à l'ancienne.|Um cravo vermelho na lapela, à moda antiga.|Eine rote Nelke im Knopfloch, ganz klassisch.|Un garofano rosso all'occhiello, all'antica.||翻领上别一朵红色康乃馨，老派风格。|옷깃에 꽂은 빨간 카네이션, 옛날 멋.|襟に赤いカーネーション。昔ながらの粋。|Красная гвоздика в петлице, по старинке.|Czerwony goździk w butonierce, po staremu." }])
    .concat([{ id: "pieza_cadena", slot: "cadena", v: "si", r: "p", casa: false,
      n: "Cadena de reloj|Watch chain|Chaîne de montre|Corrente de relógio|Uhrkette|Catena dell'orologio||怀表链|시곗줄|懐中時計の鎖|Цепочка для часов|Dewizka",
      d: "La cadena de oro del reloj de bolsillo, cruzando el frac.|The pocket watch's gold chain, across the tailcoat.|La chaîne en or de la montre à gousset, en travers du frac.|A corrente de ouro do relógio de bolso, atravessando o fraque.|Die goldene Kette der Taschenuhr, quer über den Frack.|La catena d'oro dell'orologio da taschino, di traverso sul frac.||怀表的金链，斜挂在燕尾服上。|회중시계의 금줄이 연미복을 가로질러요.|懐中時計の金の鎖が燕尾服を横切る。|Золотая цепочка карманных часов поперёк фрака.|Złota dewizka kieszonkowego zegarka, w poprzek fraka." }])
    .concat([{ id: "pieza_pluma", slot: "pluma", v: "si", r: "p", casa: false,
      n: "Pluma de pavo real|Peacock feather|Plume de paon|Pena de pavão|Pfauenfeder|Piuma di pavone||孔雀羽毛|공작 깃털|孔雀の羽根|Павлинье перо|Pawie pióro",
      d: "Una pluma de pavo real metida en la cinta de la chistera.|A peacock feather tucked into the top hat's band.|Une plume de paon glissée dans le ruban du haut-de-forme.|Uma pena de pavão presa na fita da cartola.|Eine Pfauenfeder im Hutband des Zylinders.|Una piuma di pavone infilata nel nastro del cilindro.||一根孔雀羽毛插在礼帽的帽带上。|실크해트의 띠에 꽂은 공작 깃털.|シルクハットのリボンに差した孔雀の羽根。|Павлинье перо за лентой цилиндра.|Pawie pióro zatknięte za wstążkę cylindra." }])
    .concat([{ id: "pieza_veneciano", slot: "veneciano", v: "si", r: "p", casa: false,
      n: "Antifaz veneciano|Venetian mask|Loup vénitien|Máscara veneziana|Venezianische Maske|Maschera veneziana||威尼斯面具|베네치아 가면|ヴェネツィアの仮面|Венецианская маска|Maska wenecka",
      d: "Alas de filigrana a cada lado, del color de su antifaz: carnaval de Venecia.|Filigree wings on each side, in his mask's colour: Venice carnival.|Des ailes en filigrane de chaque côté, de la couleur de son loup : le carnaval de Venise.|Asas de filigrana de cada lado, da cor da máscara: carnaval de Veneza.|Filigranflügel auf jeder Seite, in der Farbe seiner Maske: Karneval in Venedig.|Ali in filigrana su ogni lato, del colore della sua maschera: carnevale di Venezia.||两侧是花丝翅膀，颜色随面具而变：威尼斯狂欢节。|양옆에 금세공 날개, 가면과 같은 색: 베네치아 카니발.|両脇に金線細工の翼。色は仮面と同じ。ヴェネツィアのカーニバル。|Филигранные крылья с каждой стороны, в цвет маски: венецианский карнавал.|Filigranowe skrzydła po obu stronach, w kolorze maski: karnawał w Wenecji." }])
    /* bloque D: las piezas de guino (Pixel Lab, aprobadas en la maqueta del crupier) */
    .concat([{ id: "pieza_corazon", slot: "clavel", v: "corazon", r: "p", casa: false,
      n: "Corazón de vida|Extra-life heart|Cœur de vie|Coração de vida|Lebensherz|Cuore di vita||生命之心|생명의 하트|ライフのハート|Сердце жизни|Serce życia",
      d: "Un corazón de píxel en la solapa: una vida de más, por si acaso.|A pixel heart on the lapel: one extra life, just in case.|Un cœur en pixels à la boutonnière : une vie en plus, au cas où.|Um coração de pixel na lapela: uma vida extra, só por garantia.|Ein Pixelherz am Revers: ein Extraleben, nur für den Fall.|Un cuore di pixel all'occhiello: una vita in più, non si sa mai.||翻领上的像素爱心：多一条命，以防万一。|옷깃에 단 픽셀 하트: 혹시 모르니 목숨 하나 더.|襟にピクセルのハート。念のため、残機をひとつ追加。|Пиксельное сердце в петлице: лишняя жизнь, на всякий случай.|Pikselowe serce w butonierce: dodatkowe życie, na wszelki wypadek." }])
    .concat([{ id: "pieza_espada", slot: "clavel", v: "espada", r: "p", casa: false,
      n: "Espada del héroe|Hero's sword|Épée du héros|Espada do herói|Heldenschwert|Spada dell'eroe||勇者之剑|용사의 검|勇者の剣|Меч героя|Miecz bohatera",
      d: "Una espada de héroe en miniatura, prendida en la solapa. Para jefes de bolsillo.|A miniature hero's sword pinned to the lapel. For pocket-sized bosses.|Une épée de héros miniature, épinglée à la boutonnière. Pour les boss de poche.|Uma espada de herói em miniatura, presa na lapela. Para chefões de bolso.|Ein Heldenschwert im Miniaturformat, ans Revers gesteckt. Für Bosse im Taschenformat.|Una spada da eroe in miniatura, appuntata all'occhiello. Per boss tascabili.||别在翻领上的迷你勇者之剑。专打口袋大小的头目。|옷깃에 꽂은 미니 용사의 검. 주머니만 한 보스 전용.|襟に留めたミニサイズの勇者の剣。ポケットサイズのボス用。|Крошечный меч героя на лацкане. Для карманных боссов.|Miniaturowy miecz bohatera wpięty w klapę. Na kieszonkowych bossów." }])
    .concat([{ id: "pieza_mando", slot: "clavel", v: "mando", r: "p", casa: false,
      n: "Mando retro|Retro controller|Manette rétro|Controle retrô|Retro-Controller|Controller retrò|Control retro|复古手柄|레트로 패드|レトロなコントローラー|Ретро-геймпад|Retro pad",
      d: "Un mando de los de antes en la solapa. Soplabas el cartucho y funcionaba.|An old-school controller on the lapel. You blew on the cartridge and it worked.|Une manette à l'ancienne à la boutonnière. On soufflait dans la cartouche et ça marchait.|Um controle das antigas na lapela. Você soprava o cartucho e funcionava.|Ein Controller von früher am Revers. Man pustete in die Kassette, und es lief.|Un controller di una volta all'occhiello. Soffiavi nella cartuccia e partiva.|Un control de los de antes en la solapa. Soplabas el cartucho y funcionaba.|翻领上的老式手柄。那时对着卡带吹口气就能用。|옷깃에 단 옛날 패드. 팩에 입김 불면 됐었지.|襟に昔ながらのコントローラー。カセットをフーッと吹けば動いた。|Старый добрый геймпад на лацкане. Дунул в картридж — и всё работает.|Pad jak za dawnych lat w klapie. Dmuchało się w kartridż i działało." }])
    .concat([{ id: "pieza_gafas", slot: "gafas", v: "si", r: "p", casa: false,
      n: "Gafas de 8 bits|8-bit shades|Lunettes 8 bits|Óculos de 8 bits|8-Bit-Brille|Occhiali a 8 bit|Lentes de 8 bits|8位墨镜|8비트 선글라스|8ビットのサングラス|8-битные очки|8-bitowe okulary",
      d: "Gafas de sol pixeladas encima del antifaz. Para cuando ganas y no hace falta decir nada.|Pixelated shades over his mask. For when you win and there's nothing left to say.|Des lunettes de soleil pixelisées par-dessus le loup. Pour quand on gagne et qu'il n'y a rien à ajouter.|Óculos escuros pixelados sobre a máscara. Para quando você ganha e não precisa dizer nada.|Verpixelte Sonnenbrille über der Maske. Für Siege, zu denen man nichts mehr sagen muss.|Occhiali da sole pixelati sopra la maschera. Per quando vinci e non c'è altro da dire.|Lentes de sol pixelados encima del antifaz. Para cuando ganas y no hace falta decir nada.|戴在面具上的像素墨镜。赢了就不用多说什么。|가면 위에 쓴 픽셀 선글라스. 이기고 나서 말이 필요 없을 때.|仮面の上にピクセルのサングラス。勝ったら、もう何も言うことはない。|Пиксельные тёмные очки поверх маски. Когда выиграл и слова уже не нужны.|Pikselowe okulary przeciwsłoneczne na masce. Gdy wygrywasz i nie trzeba nic mówić." }])
    .concat([{ id: "pieza_cristal", slot: "cristal", v: "si", r: "p", casa: false,
      n: "Cristal mágico|Magic crystal|Cristal magique|Cristal mágico|Zauberkristall|Cristallo magico||魔法水晶|마법의 크리스털|魔法のクリスタル|Волшебный кристалл|Magiczny kryształ",
      d: "Un cristal engastado en la cinta de la chistera. Dicen que guarda una partida.|A crystal set into the top hat's band. They say it holds a saved game.|Un cristal serti dans le ruban du haut-de-forme. On dit qu'il garde une sauvegarde.|Um cristal cravado na fita da cartola. Dizem que guarda um jogo salvo.|Ein Kristall im Hutband des Zylinders. Angeblich steckt ein Spielstand darin.|Un cristallo incastonato nel nastro del cilindro. Si dice che custodisca un salvataggio.||镶在礼帽帽带上的水晶。据说里面存着一个存档。|실크해트의 띠에 박힌 크리스털. 세이브 파일이 들어 있다나.|シルクハットのリボンにはめた水晶。セーブデータが入っているとか。|Кристалл в ленте цилиндра. Говорят, в нём хранится сохранение.|Kryształ osadzony we wstążce cylindra. Podobno trzyma zapis gry." }])
    .concat([{ id: "pieza_pocion", slot: "cadena", v: "pocion", r: "p", casa: false,
      n: "Poción|Potion|Potion|Poção|Trank|Pozione||药水|포션|ポーション|Зелье|Mikstura",
      d: "Un frasco rojo colgado del frac. Recupera la vida; el orgullo, no.|A red flask hanging from his tailcoat. Restores health; pride, not so much.|Une fiole rouge accrochée au frac. Elle rend la vie ; la fierté, non.|Um frasco vermelho pendurado no fraque. Recupera a vida; o orgulho, não.|Ein rotes Fläschchen am Frack. Stellt Leben wieder her, Stolz leider nicht.|Una fiala rossa appesa al frac. Ridà la vita; l'orgoglio, no.||挂在燕尾服上的红色药瓶。能回血，回不了面子。|연미복에 매단 빨간 병. 체력은 회복, 자존심은 글쎄.|燕尾服に下げた赤い小瓶。体力は回復、プライドはそのまま。|Красный флакон на фраке. Восстанавливает здоровье, но не гордость.|Czerwona fiolka przy fraku. Przywraca życie; dumy już nie." }])
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
  const norm = w => { const o = {}; SLOTS.forEach(s => { const v = (w && w[s]) || null; o[s] = v && (s === "chistera" ? CHISTERA[v] : PIEZAS.includes(s) ? okVal(s, v) : BY[v] && v !== CASA[s]) ? v : null; }); return o; };
  const worn = () => norm(st().wear);
  const wearing = id => { const it = get(id), w = worn(); if (!it) return false; return it.casa ? w[it.slot] === null : w[it.slot] === it.v; };
  const withItem = (id, base) => { const it = get(id), o = { ...(base || worn()) }; if (!it) return o; o[it.slot] = it.casa ? null : it.v; return o; };
  const price = id => { const it = get(id); return !it || it.casa ? 0 : it.r === "l" ? PRICE.l : it.r === "p" ? PRICE.p : PRICE[it.slot] || 250; };
  const keyOf = o => SLOTS.map(s => o[s] || "-").join("|");

  /* ---------------------------------------------------------------- el recoloreado */
  let base = null, parts = null, waiting = [], plumaImg = null, venImg = null, guiImg = null;
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
        const idx = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] }, cl = [], clc = [];     // 3 cinta, 5 pajarita, 6 y 7 sus lunares; las piezas pintadas aparte
        for (let i = 0; i < pd.length; i += 4) { if (!data[i + 3]) continue; const v = pd[i], k = v & 7, c = v >> 3; if (k) idx[k].push(i); if (c && PX[c]) { cl.push(i); clc.push(c); } }
        Object.keys(idx).forEach(k => { idx[k] = Int32Array.from(idx[k]); });
        base = { w, h, data, idx, clav: Int32Array.from(cl), clavC: Uint8Array.from(clc) };
        const m = A.CRUPIER_DATA.master; base.master = m;
        const fin = () => { prep.busy = false; waiting.splice(0).forEach(f => f()); };
        const imgs = [plumaImg, venImg, guiImg].filter(i => i && !i.complete); let left = imgs.length;     // y las capas, listas antes de las miniaturas
        if (!left) fin(); else imgs.forEach(i => { i.onload = i.onerror = () => { if (--left === 0) fin(); }; });
      };
      if (A.CRUPIER_PLUMA && !plumaImg) { plumaImg = new Image(); plumaImg.src = A.CRUPIER_PLUMA.img; }
      if (A.CRUPIER_VENECIANO && !venImg) { venImg = new Image(); venImg.src = A.CRUPIER_VENECIANO.img; }
      if (A.CRUPIER_GUINOS && !guiImg) { guiImg = new Image(); guiImg.src = A.CRUPIER_GUINOS.img; }
      pim.src = A.CRUPIER_PARTES;
    });
  }
  const isDefault = o => SLOTS.every(s => !o[s]);
  function maps(o) {
    const M = {};
    const tr = o.traje && BY[o.traje] && BY[o.traje].traje, ch = o.chistera && CHISTERA[o.chistera], pj = o.pajarita && BY[o.pajarita] && BY[o.pajarita].pajarita, an = o.antifaz && BY[o.antifaz] && BY[o.antifaz].antifaz;
    if (tr) M[1] = { [SRC.main]: hex(tr[0]), [SRC.sh]: hex(tr[1]) };
    if (ch || tr) { const c = ch || tr; M[2] = { [SRC.main]: hex(c[0]), [SRC.sh]: hex(c[1]) }; }
    if (pj) M[3] = M[5] = M[6] = M[7] = { [SRC.rHi]: hex(pj[0]), [SRC.rLo]: hex(pj[1]) };     // la pajarita y la cinta de la chistera
    if (o.lunares) { const c = (o.pajarita && BY[o.pajarita]) || BY[CASA.pajarita], dt = c.lunares || LUNARES;
      M[6] = { [SRC.rHi]: hex(dt[0]), [SRC.rLo]: hex(dt[0]) }; M[7] = { [SRC.rHi]: hex(dt[1]), [SRC.rLo]: hex(dt[1]) }; }
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
    if (o.clavel === "si" || o.cadena === "si") for (let j = 0; j < base.clav.length; j++) { const px = PX[base.clavC[j]]; if (o[px[0]] !== "si") continue; const i = base.clav[j], v = px[1]; dst[i] = v >> 16; dst[i + 1] = (v >> 8) & 255; dst[i + 2] = v & 255; }   // el clavel y la cadena de siempre (no las piezas de guino de su hueco)
  }
  /* las capas que se pintan encima del dibujo (antifaz veneciano, pluma): el veneciano, con su oro del color del antifaz */
  const venCache = new Map();
  function venFor(o) {
    const an = o.antifaz && BY[o.antifaz] && BY[o.antifaz].antifaz, key = an ? o.antifaz : "-";
    if (venCache.has(key)) return venCache.get(key);
    let img = venImg;
    if (an) {
      const c = document.createElement("canvas"); c.width = venImg.naturalWidth; c.height = venImg.naturalHeight;
      const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(venImg, 0, 0);
      const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
      const M = { [SRC.gHi]: hex(an[0]), [SRC.gMid]: hex(an[1]), [SRC.gLt]: hex(an[2]), [SRC.gSh]: hex(an[3]), [SRC.gDp]: hex(an[4]) };
      for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const v = M[(d[i] << 16) | (d[i + 1] << 8) | d[i + 2]]; if (v != null) { d[i] = v >> 16; d[i + 1] = (v >> 8) & 255; d[i + 2] = v & 255; } }
      x.putImageData(im, 0, 0); img = c;
    }
    venCache.set(key, img); return img;
  }
  function layers(o) {
    const L = [];
    if (o.veneciano && venImg && venImg.complete) L.push({ img: venFor(o), r: A.CRUPIER_VENECIANO.r });
    if (o.pluma && plumaImg && plumaImg.complete) L.push({ img: plumaImg, r: A.CRUPIER_PLUMA.r });
    if (guiImg && guiImg.complete) for (const [s, v, k] of GUINOS) if (o[s] === v && A.CRUPIER_GUINOS.r[k]) L.push({ img: guiImg, r: A.CRUPIER_GUINOS.r[k] });   // bloque D: las piezas de guino, tal cual
    return L;
  }
  const cache = new Map();
  /* el atlas entero con esa ropa (o null si es la de siempre); se guardan los 4 ultimos */
  function atlasFor(o) {
    if (!base || isDefault(o)) return null;
    const key = keyOf(o); if (cache.has(key)) { const c = cache.get(key); cache.delete(key); cache.set(key, c); return c; }
    const c = document.createElement("canvas"); c.width = base.w; c.height = base.h;
    const x = c.getContext("2d"), im = x.createImageData(base.w, base.h); im.data.set(base.data); paint(im.data, o); x.putImageData(im, 0, 0);
    const ov = layers(o); if (ov.length) c.ov = ov;
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
    if (o.clavel === "si" || o.cadena === "si") for (let j = 0; j < base.clav.length; j++) {
      const px = PX[base.clavC[j]]; if (o[px[0]] !== "si") continue;
      const i = base.clav[j] >> 2, ay = Math.floor(i / base.w) - my, ax = (i % base.w) - mx; if (ay < 0 || ay >= mh || ax < 0 || ax >= mw) continue;
      const t = (ay * mw + ax) * 4, v = px[1]; im.data[t] = v >> 16; im.data[t + 1] = (v >> 8) & 255; im.data[t + 2] = v & 255;
    }
    x.putImageData(im, ox, oy);
    for (const L of layers(o)) { const r = L.r.master; if (r) x.drawImage(L.img, r[0], r[1], r[2], r[3], r[4], r[5], r[2], r[3]); }
    const big = document.createElement("canvas"); big.width = W * k; big.height = H * k; const bx = big.getContext("2d"); bx.imageSmoothingEnabled = false; bx.drawImage(c, 0, 0, W * k, H * k);
    const url = big.toDataURL(); thumbs.set(key, url); return url;
  }
  /* parte de un pixel del atlas (para las miniaturas): un mapa inverso pequeno, solo del retrato */
  let partOf = null;
  function partAt(i) {
    if (!partOf) { partOf = new Map(); for (const k of [1, 2, 3, 4, 5, 6, 7]) { const L = base.idx[k]; const [mx, my, mw, mh] = base.master; const a = (my * base.w + mx) * 4, b = ((my + mh) * base.w) * 4; for (let j = 0; j < L.length; j++) if (L[j] >= a && L[j] < b) partOf.set(L[j], k); } }
    return partOf.get(i) || 0;
  }

  /* ---------------------------------------------------------------- ponerse y comprar */
  /* ---------------------------------------------------------------- v0.3.150: el crupier vestido tambien en sus imagenes fijas
     La carta de la Aventura (assets/gen/card_adv.webp: el retrato a 12x sobre su foco), los retratos del trile y los dados (4x, con sus caras)
     y su cabeza de los avisos (2x): son el retrato del atlas tal cual, asi que se copian encima los pixeles del crupier vestido donde la imagen
     coincide con el de siempre (o donde estaba vacia: la pluma y las alas del veneciano). La cabeza pequena (32 px) es otro dibujo: se
     recolorea por zonas (chistera, cinta y antifaz). Sin redibujar nada. Quien las pinte lleva data-cart (la imagen) y data-cdef (la de siempre)
     y se cambian solas al cambiar de ropa: A.crupierArt(nombre, la de siempre). */
  const ART = {
    card_adv: { path: "assets/gen/card_adv.webp", e: "sly", k: 12, ox: 13, oy: 6 },        // pixel (x, y) de la imagen = (x + ox, y + oy) del lienzo de 96x112
    dealer_neutral: { path: "assets/icons/dealer_neutral.webp", e: "sly", k: 4, ox: 0, oy: 16 },
    dealer_laugh: { path: "assets/icons/dealer_laugh.webp", e: "laugh", k: 4, ox: 0, oy: 16 },
    dealer_angry: { path: "assets/icons/dealer_angry.webp", e: "angry", k: 4, ox: 0, oy: 16 },
    dealer_shock: { path: "assets/icons/dealer_shock.webp", e: "shock", k: 4, ox: 0, oy: 16 },
    dealer_mini: { path: "assets/icons/dealer_mini.webp", e: "sly", k: 2, ox: 22, oy: 25 },
    dealer_mini_s: { path: "assets/icons/dealer_mini_s.webp", k: 2, zonas: true },
  };
  const artCache = new Map(), artBusy = new Set();
  const PURPLE = new Set([SRC.main, SRC.sh]), RED = new Set([SRC.rHi, SRC.rLo]), GOLD = new Set([SRC.gHi, SRC.gMid, SRC.gLt, SRC.gSh, SRC.gDp]);
  function artGen(name, o, done) {
    const spec = ART[name], key = keyOf(o) + "|" + name;
    if (artCache.has(key)) return done(artCache.get(key));
    if (artBusy.has(key)) return; artBusy.add(key);
    const im = new Image();
    im.onload = () => {
      const k = spec.k, w = Math.round(im.naturalWidth / k), h = Math.round(im.naturalHeight / k);
      const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingEnabled = false;
      x.drawImage(im, 0, 0, w, h);
      const S = x.getImageData(0, 0, w, h), s = S.data;
      if (spec.zonas) {
        /* la cabeza pequena: chistera = los morados de arriba, cinta = los rojos de arriba, antifaz = los oros de la cara */
        const M = maps(o);
        for (let y = 0; y < h; y++) for (let q = 0; q < w; q++) {
          const j = (y * w + q) * 4; if (!s[j + 3]) continue;
          const code = (s[j] << 16) | (s[j + 1] << 8) | s[j + 2];
          const part = PURPLE.has(code) && y <= 18 ? 2 : RED.has(code) && y <= 16 ? 3 : GOLD.has(code) && y >= 16 && y <= 23 ? 4 : 0;
          const v = part && M[part] && M[part][code]; if (v != null && part) { s[j] = v >> 16; s[j + 1] = (v >> 8) & 255; s[j + 2] = v & 255; }
        }
      } else {
        const Od = A.crupier.data(spec.e, A.crupier.atlas()), Oa = Od && new Uint8ClampedArray(Od.data), Dd = Oa && A.crupier.data(spec.e, atlasFor(o));
        if (!Dd) { artBusy.delete(key); return; }
        const d = Dd.data;
        for (let y = 0; y < h; y++) for (let q = 0; q < w; q++) {
          const cy = y + spec.oy, cx = q + spec.ox; if (cy < 0 || cy >= 112 || cx < 0 || cx >= 96) continue;
          const i = (cy * 96 + cx) * 4, j = (y * w + q) * 4;
          if (!d[i + 3] || (d[i] === Oa[i] && d[i + 1] === Oa[i + 1] && d[i + 2] === Oa[i + 2] && d[i + 3] === Oa[i + 3])) continue;   // nada cambia ahi
          const same = Oa[i + 3] && s[j + 3] && Math.abs(s[j] - Oa[i]) + Math.abs(s[j + 1] - Oa[i + 1]) + Math.abs(s[j + 2] - Oa[i + 2]) < 24;
          if (same || !Oa[i + 3]) { s[j] = d[i]; s[j + 1] = d[i + 1]; s[j + 2] = d[i + 2]; s[j + 3] = 255; }   // retoques propios de la imagen: se respetan
        }
      }
      x.putImageData(S, 0, 0);
      const big = document.createElement("canvas"); big.width = w * k; big.height = h * k; const bx = big.getContext("2d"); bx.imageSmoothingEnabled = false; bx.drawImage(c, 0, 0, w * k, h * k);
      const url = big.toDataURL(); artBusy.delete(key); artCache.set(key, url);
      while (artCache.size > 48) artCache.delete(artCache.keys().next().value);
      done(url);
    };
    im.onerror = () => artBusy.delete(key);
    im.src = spec.path;
  }
  /* la imagen ya vestida (o la de siempre mientras se prepara, y luego se cambia sola) */
  function art(name, def) {
    const o = cur(); if (!ART[name] || !base || isDefault(o)) return def;
    const key = keyOf(o) + "|" + name; if (artCache.has(key)) return artCache.get(key);
    artGen(name, o, () => refreshArt(name)); return def;
  }
  function refreshArt(name) {
    document.querySelectorAll(name ? `[data-cart="${name}"]` : "[data-cart]").forEach(el => {
      const u = art(el.dataset.cart, el.dataset.cdef); if (!u) return;
      if (el.tagName === "IMG") { if (el.getAttribute("src") !== u) el.src = u; } else el.style.backgroundImage = `url("${u}")`;
    });
  }
  A.crupierArt = art;
  /* bloque D: la mesa del crupier (js/vivo.js) le cambia la ropa en directo SIN tocar lo que tienes ni lo que llevas: preview(ropa) viste a
     todos los crupieres (y sus imagenes fijas) con esa ropa; preview(null) vuelve a la tuya. ropa = { hueco: valor | null } como P.vest.wear */
  let prev = null;
  const cur = () => prev || worn();
  function preview(o) {
    if (!o || typeof o !== "object") { if (!prev) return; prev = null; return apply(); }
    prev = norm(o); apply();
  }
  function apply() { if (!base) return prep(apply); const o = cur(); A.crupier.dress(isDefault(o) ? null : atlasFor(o)); if (!isDefault(o)) Object.keys(ART).forEach(n => artGen(n, o, () => refreshArt(n))); refreshArt(); }
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
    with: withItem, atlasFor, thumb, ready: prep, apply, preview, previewing: () => !!prev,
    name: id => A.pick6(get(id).n), desc: id => A.pick6(get(id).d),
    count: () => ITEMS.filter(i => !i.casa && owned(i.id)).length,
  };
  /* al arrancar, el crupier sale con la ropa que lleve el perfil */
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", () => setTimeout(() => { if (A.profile && A.crupier) { const w = worn(); if (!isDefault(w)) prep(apply); } }, 0));
  else setTimeout(() => { if (A.profile && A.crupier) { const w = worn(); if (!isDefault(w)) prep(apply); } }, 0);
})(window.AIQ);
