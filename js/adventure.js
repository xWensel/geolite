/*
 * Geolite - AVENTURA (v0.9): el modo roguelike.
 * Eres un aventurero que descifra lugares. Cada RONDA es un tema concreto con un banco enorme de lugares (100+ por tema) y una
 * puntuacion objetivo que sube; entre rondas hay campamento (3 cartas y rolear), y cada acto acaba con un jefe.
 * Todo sale de una semilla: partidas aleatorias, y el Reto diario comparte semilla para clasificar. Necesita A.core (game.js) y A.RELICS.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const T = A.T, L = A.L, $ = id => document.getElementById(id), C = () => A.core;
  const RUNKEY = "atlasiq.run.v2", DAILYKEY = "atlasiq.daily.v1";   // el intento del Reto diario va en su propia ranura: no pisa la expedicion guardada
  const ic = (id, cls) => A.icon(id, cls), CN = () => A.icon("coin", "cn");
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const L6 = A.L6;
  const suitRed = s => s === "s_pin" || s === "s_compass" || s === "heart";
  const ixs = () => "";                                              // las cartas ya no llevan indices (A K Q J, numeros ni palos)
  const R_NAMES = [L6("Común|Common|Commune|Comum|Gewöhnlich|Comune||普通|일반|コモン|Обычная|Zwykła"), L6("Poco común|Uncommon|Peu commune|Incomum|Ungewöhnlich|Non comune||不常见|고급|アンコモン|Необычная|Niepospolita"), L6("Rara|Rare|Rare|Rara|Selten|Rara||稀有|희귀|レア|Редкая|Rzadka"), L6("Legendaria|Legendary|Légendaire|Lendária|Legendär|Leggendaria||传说|전설|レジェンダリー|Легендарная|Legendarna")];

  /* ------------------------------------------------------------------ actos */
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const ACTS = [
    { n: L("Acto I", "Act I"), t: L("Las rutas conocidas", "The known roads"), f: L("El gremio de cartógrafos te encarga tus primeras rutas.", "The Cartographers' Guild hands you your first routes.") },
    { n: L("Acto II", "Act II"), t: L("Más allá del mapa", "Beyond the map"), f: L("Las fronteras se difuminan y los nombres se vuelven raros.", "Borders blur and the names get strange.") },
    { n: L("Acto III", "Act III"), t: L("Terra Incognita", "Terra Incognita"), f: L("Nadie ha vuelto de aquí con un mapa completo.", "No one has come back from here with a complete map.") },
  ];
  const actInfo = act => ACTS[act] || { n: L("Acto " + (ROMAN[act] || act + 1), "Act " + (ROMAN[act] || act + 1)), t: L("Leyenda", "Legend"), f: L("Ya no hay guía: solo tu pulso.", "There is no guide now: only your aim.") };

  /* ------------------------------------------------------------------ temas de ronda (cada uno con un banco enorme) */
  const TOPIC_NAMES = {
    capital: [L6("Capitales del mundo|World capitals|Capitales du monde|Capitais do mundo|Hauptstädte der Welt|Capitali del mondo||世界首都|세계의 수도|世界の首都|Столицы мира|Stolice świata"), L6("Capitales del mundo (difíciles)|World capitals (hard)|Capitales du monde (difficiles)|Capitais do mundo (difíceis)|Hauptstädte der Welt (schwer)|Capitali del mondo (difficili)||世界首都（困难）|세계의 수도 (어려움)|世界の首都（むずかしい）|Столицы мира (сложные)|Stolice świata (trudne)")],
    landmark: [L6("Monumentos y lugares famosos|Landmarks and famous places|Monuments et lieux célèbres|Monumentos e lugares famosos|Wahrzeichen und berühmte Orte|Monumenti e luoghi famosi||地标与著名地点|랜드마크와 유명한 장소|名所と有名な場所|Достопримечательности и известные места|Zabytki i słynne miejsca"), L6("Maravillas del mundo (difíciles)|World wonders (hard)|Merveilles du monde (difficiles)|Maravilhas do mundo (difíceis)|Weltwunder (schwer)|Meraviglie del mondo (difficili)||世界奇观（困难）|세계의 경이 (어려움)|世界の驚異（むずかしい）|Чудеса света (сложные)|Cuda świata (trudne)"), L6("Tesoros escondidos|Hidden treasures|Trésors cachés|Tesouros escondidos|Verborgene Schätze|Tesori nascosti||隐藏的宝藏|숨겨진 보물|隠れた名所|Скрытые сокровища|Ukryte skarby")],
    city: [L6("Grandes ciudades|Big cities|Grandes villes|Grandes cidades|Große Städte|Grandi città||大城市|대도시|大都市|Большие города|Wielkie miasta"), L6("Ciudades importantes|Important cities|Villes importantes|Cidades importantes|Wichtige Städte|Città importanti||重要城市|주요 도시|主要都市|Важные города|Ważne miasta"), L6("Ciudades difíciles|Hard cities|Villes difficiles|Cidades difíceis|Schwierige Städte|Città difficili||高难城市|어려운 도시|難しい都市|Сложные города|Trudne miasta")],
    country: [L6("Países (haz clic dentro)|Countries (click inside)|Pays (clique dedans)|Países (clique dentro)|Länder (klicke hinein)|Paesi (clicca dentro)||国家（点击国境内）|국가 (안쪽을 클릭)|国（国内をクリック）|Страны (кликни внутри)|Kraje (kliknij w środku)"), L6("Países difíciles|Hard countries|Pays difficiles|Países difíceis|Schwierige Länder|Paesi difficili||高难国家|어려운 국가|難しい国|Сложные страны|Trudne kraje")],
    history: [L6("Batallas y sucesos famosos|Famous battles and events|Batailles et événements célèbres|Batalhas e eventos famosos|Berühmte Schlachten und Ereignisse|Battaglie ed eventi famosi||著名战役与事件|유명한 전투와 사건|有名な戦いと出来事|Знаменитые битвы и события|Słynne bitwy i wydarzenia"), L6("Historia (difícil)|History (hard)|Histoire (difficile)|História (difícil)|Geschichte (schwer)|Storia (difficile)||历史（困难）|역사 (어려움)|歴史（むずかしい）|История (сложная)|Historia (trudna)")],
    nature: [L6("Maravillas de la naturaleza|Natural wonders|Merveilles de la nature|Maravilhas da natureza|Naturwunder|Meraviglie della natura||自然奇观|자연의 경이|自然の驚異|Природные чудеса|Cuda natury"), L6("Mares y montañas|Seas and mountains|Mers et montagnes|Mares e montanhas|Meere und Berge|Mari e montagne||海洋与山脉|바다와 산|海と山|Моря и горы|Morza i góry")],
    clue: [L6("Apodos y pistas|Nicknames and clues|Surnoms et indices|Apelidos e pistas|Spitznamen und Hinweise|Soprannomi e indizi||别称与线索|별명과 단서|ニックネームとヒント|Прозвища и подсказки|Przydomki i wskazówki")],
    mixed: [L6("¡Jackpot! De todo un poco|Jackpot! A bit of everything|Jackpot ! Un peu de tout|Jackpot! Um pouco de tudo|Jackpot! Von allem etwas|Jackpot! Un po' di tutto||大奖！样样都有|잭팟! 이것저것 다 있어요|ジャックポット！なんでもあり|Джекпот! Всего понемногу|Jackpot! Wszystkiego po trochu")],
    flag: [L6("Banderas del mundo|World flags|Drapeaux du monde|Bandeiras do mundo|Flaggen der Welt|Bandiere del mondo||世界国旗|세계의 국기|世界の国旗|Флаги мира|Flagi świata"), L6("El coleccionista de banderas|The flag collector|Le collectionneur de drapeaux|O colecionador de bandeiras|Der Flaggensammler|Il collezionista di bandiere||国旗收藏家|국기 수집가|国旗コレクター|Коллекционер флагов|Kolekcjoner flag")],
  };
  const featOf = o => (o ? (o.t === "c" ? C().world.byName[o.key] : A.waters && A.waters.of(o)) || null : null);   // pais o masa de agua: lo que se acierta haciendo clic dentro
  const kf = o => KIND_FACTOR[o.area ? "country" : o.kind] || 1;                                  // una masa de agua mide como un pais (antes, como un punto: x1,4 y x1,6)
  const KIND_FACTOR = { capital: 1, city: 1, landmark: 0.9, nature: 1.5, battle: 0.9, event: 0.9, country: 0.7, clue: 1, water: 1.6, strait: 1.4 };
  /* 12 rondas: 3 actos de 4 (la 4.a es el jefe). Empieza facil y va cambiando de tema y subiendo el nivel.
     v0.20 (usuario): ciudades y monumentos tienen dos rondas (son la mayor parte del banco); capitales e historia, una; banderas siguen dobles. */
  const ROUNDS = [
    { topic: "capital", tier: 0 }, { topic: "landmark", tier: 0 }, { topic: "flag", tier: 0 }, { topic: "country", tier: 0, boss: true },
    { topic: "city", tier: 0 }, { topic: "history", tier: 0 }, { topic: "nature", tier: 0 }, { topic: "flag", tier: 1, boss: true },
    { topic: "city", tier: 1 }, { topic: "clue", tier: 1 }, { topic: "landmark", tier: 1 }, { topic: "mixed", tier: 1, boss: true },
  ];
  const roundDefOf = r => (r < ROUNDS.length ? ROUNDS[r] : (() => { const b = ROUNDS[4 + ((r - 4) % 8)]; return { ...b, tier: Math.min(2, b.tier + 1), boss: (r % 4) === 3 }; })());

  /* ------------------------------------------------------------------ banco de preguntas por tema y nivel */
  let POOLS = null;
  const kindOfHistory = t => (/^(battle|siege|fall of|.*\bwar\b|bombing|attack|normandy|gallipoli|dunkirk|tet )/i.test(t) ? "battle" : "event");
  const kindOfNature = t => (/\b(sea|ocean|gulf|bay)\b/i.test(t) ? "water" : /\b(strait|channel|canal|cape|drake|bosporus|bosphorus)\b/i.test(t) ? "strait" : "nature");
  /* v0.20 (usuario): todo lugar lleva pais debajo salvo mares y oceanos; si lo comparten dos, los dos ("Nepal · China"); si mas, el principal (data/paises-lugares.js) */
  const joinCountries = qids => { const ns = qids.map(q => A.PCOUNTRY && A.PCOUNTRY[q]).filter(Boolean); if (!ns.length) return null; const o = {}; Object.keys(ns[0]).forEach(l => (o[l] = ns.map(n => n[l] || n.en).join(" · "))); return o; };
  function placeQ(row) {
    const [id, kind, tier, lat, lon, qc0, names, fame] = row, extra = A.PLACE_COUNTRIES && A.PLACE_COUNTRIES[id], qc = extra && extra.length ? extra[0] : qc0;
    const cn = (extra && extra.length > 1 && joinCountries(extra)) || (qc && A.PCOUNTRY && A.PCOUNTRY[qc]), en = names.en;
    const cEn = (extra && extra.length ? extra : qc0 ? [qc0] : []).map(q => A.PCOUNTRY && A.PCOUNTRY[q] && A.PCOUNTRY[q].en).filter(Boolean);   // paises en ingles: la regla "un pais por ronda" y el Pase VIP
    if (kind === "country") { const key = id.slice(2); if (!C().world.byName[key]) return null; return { t: "c", key, name: names, sub: { es: "", en: "" }, clue: false, answer: null, fact: {}, cid: [id], kind: "country", topic: "country", tier, fame: fame || 0, cEn: [en], cks: [countryKey(en)] }; }
    if (lat == null) return null;
    const k = kind === "history" ? kindOfHistory(en) : kind === "nature" ? kindOfNature(en) : kind;
    const wf = A.waters && A.waters.feat(id);                                                  // v0.2.5: mares, oceanos y lagos se aciertan haciendo clic dentro de su masa de agua (js/aguas.js)
    return { t: "p", lat: wf && wf.label ? wf.label[1] : lat, lon: wf && wf.label ? wf.label[0] : lon, name: names, sub: cn || { es: "", en: "" }, clue: false, answer: null, fact: {}, cid: [id], kind: k, topic: kind, tier, fame: fame || 0, cEn, cks: cEn.map(countryKey), ...(wf ? { area: id } : {}) };
  }
  const countryKey = e => { const k = String(e || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, ""); return k === "republicofireland" ? "ireland" : k; };   // el mismo pais como pregunta de pais, bandera, pista o lugar
  function pools() {
    if (POOLS) return POOLS; POOLS = {};
    const add = (topic, tier, q) => { const key = topic + "|" + tier; (POOLS[key] = POOLS[key] || []).push(q); };
    const seen = new Set();
    (A.PLACES || []).forEach(row => { const q = placeQ(row); if (q && !seen.has(q.cid[0])) { seen.add(q.cid[0]); add(q.topic, q.tier, q); } });
    /* v0.20: banco propio de pistas (data/pistas.js): apodos y pistas inequivocas en 11 idiomas, cada una atada a un lugar del banco.
       cid: ["clue:<id>", <id>]: la primera identifica la pregunta (carretes, repetidos); la segunda desbloquea la tarjeta del lugar en la Enciclopedia al acertarla.
       La pista va en el nombre, la respuesta en answer y el pais solo por dentro (cks: regla de un pais por ronda), para que debajo salgan las casillas de letras */
    const byId = {}; (A.PLACES || []).forEach(row => (byId[row[0]] = row));
    (A.CLUES || []).forEach(([id, diff, txt]) => {
      const row = byId[id], q = row && placeQ(row); if (!q || seen.has("clue:" + id)) return;
      seen.add("clue:" + id);
      add("clue", 1, { ...q, name: txt, answer: q.name, sub: { es: "", en: "" }, clue: true, cid: ["clue:" + id, id], topic: "clue", tier: 1, fame: diff });
    });
    return POOLS;
  }
  /* v0.20 (usuario, 2026-09-30): TODAS las preguntas del banco tienen salida en las 12 rondas (la Enciclopedia y sus logros se completan jugando la Aventura).
     - Cada pregunta tiene una dificultad 0-100 (A.QDIFF, data/dificultad.js: panel de 3 jueces) y un NIVEL 1-10 DENTRO DE SU CATEGORIA (A.QLEVEL, data/niveles.js:
       deciles; usuario: "todas las categorias con dificultades de 1 a 10"). Las banderas van aparte ("flag:c:<Pais>").
     - Cada tema se reparte entre SUS rondas (data/carretes.js, sin tamano fijo): con dos rondas, la primera lleva los niveles 1-5 y la segunda los 6-10.
       Sin techo por ronda (el usuario lo quito el 2026-09-30).
     - En cada ronda: 3 del 60 % mas facil de su carrete, 1 del 20 % medio y 1 del 20 % mas dificil, asi todas salen con la misma frecuencia.
     - Azar vivo (usuario, 2026-09-30): nada de mazos; todas las preguntas estan siempre en su pool y pueden repetirse, pero las que menos te han salido
       pesan algo mas en el sorteo (perfil: adv.seen). El Reto diario sortea solo con su semilla (igual para todos).
     - En una ronda, si se puede: como mucho 2 del mismo continente, nunca 2 del mismo pais ni un nombre ya preguntado en la expedicion. */
  const ROUND_THEME = ["capital", "landmark", "flag", "country", "city", "history", "nature", "flag", "city", "clue", "landmark", "mixed"];
  const qidOf = (q, topic) => (topic === "flag" ? "flag:" + q.cid[0] : q.cid[0]);
  const diffOf = (q, topic) => { const d = A.QDIFF && A.QDIFF[qidOf(q, topic)]; return d == null ? 50 : d; };
  const levelOf = d => clamp(Math.ceil(d / 10), 1, 10);
  const lvOf = (q, topic) => (A.QLEVEL && A.QLEVEL[qidOf(q, topic)]) || levelOf(diffOf(q, topic));   // nivel 1-10 dentro de su categoria
  const byLevel = topic => (a, b) => (lvOf(a, topic || a.topic) - lvOf(b, topic || b.topic)) || (diffOf(a, topic || a.topic) - diffOf(b, topic || b.topic));
  const nk = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const nameKeys = q => [nk(q.name && q.name.en), nk(q.name && q.name.es)].concat(q.clue && q.answer ? [nk(q.answer.en), nk(q.answer.es)] : []).filter(Boolean);
  const cksOf = q => q.cks || [];
  let ALLQ = null;                                                   // cid -> pregunta (un pais es la misma pregunta como nombre y como bandera: la ronda decide como se ve)
  const allQ = () => { if (ALLQ) return ALLQ; ALLQ = {}; Object.values(pools()).forEach(l => l.forEach(q => { ALLQ[q.cid[0]] = ALLQ[q.cid[0]] || q; })); return ALLQ; };
  let ASSIGN = null;
  function assign() {                                                // carrete de cada ronda (0-11), de mas facil a mas dificil
    if (ASSIGN) return ASSIGN;
    const fixed = A.CARRETES && A.CARRETES.length === 12, out = new Set(A.CARRETES_FUERA || []), all = allQ(), auto = autoAssign();
    const lists = (fixed ? A.CARRETES : auto).map(ids => ids.filter(id => !out.has(id)));
    if (fixed) {                                                     // una pregunta nueva del banco que aun no esta en data/carretes.js entra donde la pondria el reparto automatico
      const has = [new Set(), new Set()]; lists.forEach((l, i) => l.forEach(id => has[ROUND_THEME[i] === "flag" ? 0 : 1].add(id)));
      auto.forEach((l, i) => l.forEach(id => { const h = has[ROUND_THEME[i] === "flag" ? 0 : 1]; if (!h.has(id) && !out.has(id)) { lists[i].push(id); h.add(id); } }));
    }
    return (ASSIGN = lists.map((ids, i) => ids.map(id => all[id]).filter(Boolean).sort(byLevel(ROUND_THEME[i] === "mixed" ? null : ROUND_THEME[i]))));
  }
  function autoAssign() {                                            // ids por ronda (la 12 no tiene carrete propio: saca de todo el banco)
    const P = pools(), out = ROUND_THEME.map(() => []);
    const byTopic = t => [].concat(...[0, 1, 2].map(x => P[(t === "flag" ? "country" : t) + "|" + x] || []));
    for (const t of ["capital", "landmark", "flag", "country", "city", "history", "nature", "clue"]) {
      const rs = ROUND_THEME.map((x, i) => (x === t ? i : -1)).filter(i => i >= 0), list = byTopic(t).sort(byLevel(t));
      list.forEach(q => out[t === "capital" && lvOf(q, t) >= 9 ? 4 : rs[Math.min(rs.length - 1, Math.floor((lvOf(q, t) - 1) * rs.length / 10))]].push(q.cid[0]));   // dos rondas: niveles 1-5 y 6-10; las capitales 9-10, invitadas en Grandes ciudades (R5) para suavizar la R1
    }
    return out;
  }
  const poolFor = r => assign()[r < 12 ? r : 4 + ((r - 4) % 8)];   // la Leyenda (12+) repite las rondas 5-12
  /* v0.74 (usuario, 2026-10-03): "la dificultad tiene que venir ENTRE ASCENSIONES: en la A0, los lugares, las banderas y las pistas de los mas faciles, y asi hasta que las
     ultimas sean lugares realmente complicados; las primeras rondas de las ultimas Ascensiones no tienen por que ser ultra dificiles: una subida EXPONENCIAL entre rondas y entre Ascensiones".
     D(a, r) = posicion 0-1 en el carrete de la ronda (0 = lo mas facil, 1 = lo mas dificil) donde se centra el sorteo:
       D = lo(a) + (hi(a) - lo(a)) * expo(r / 11, kr)        r = ronda 0-11 de la expedicion; sube dentro de la Ascension
       lo(a) = lo0 + (lo5 - lo0) * expo(a / 5, ka)           el suelo de la Ascension (su ronda 1): A0 .02, A1 .12, A2 .24, A3 .38, A4 .55, A5 .75
       hi(a) = hi0 + (hi5 - hi0) * expo(a / 5, ka)           el techo de la Ascension (su ronda 12): A0 .36, A1 .45, A2 .55, A3 .67, A4 .82, A5 .99
       expo(x, k) = (e^(k x) - 1) / (e^k - 1)                exponencial que sale de 0 y llega a 1 (k = 0 seria recta)
     En cada ronda siguen las 3 faciles / 1 media / 1 dificil, pero como ventana alrededor de D: centros D-de, D+dm y D+dh (acotados a 0-1), con un peso de campana de ancho sg
     sobre la posicion de cada pregunta en el carrete y un suelo fl: NADA de techo duro, todo el carrete sigue en el pool (el suelo hace que lo lejano salga muy de vez en cuando) */
  const DK0 = { lo0: 0.02, lo5: 0.75, hi0: 0.36, hi5: 0.99, ka: 0.9, kr: 2.2, de: 0.15, dm: 0.10, dh: 0.30, sg: 0.12, fl: 0.008, tw: 1, up: [0, 0, 0.02, 0.10, 0.10, 0] };   // up: empuje extra de la ventana en A3 y A4 (el experto las ganaba casi siempre); A0-A2 y A5 no cambian
  const DKN = () => (A.KN && A.KN.dk ? Object.assign({}, DK0, A.KN.dk) : DK0);   // perillas de medicion (dev/bot.js: CFG.knobs = { dk: {...} })
  const expo = (x, k) => (Math.abs(k) < 1e-6 ? x : (Math.exp(k * x) - 1) / (Math.exp(k) - 1));
  const diffAt = (asc, pos) => { const K = DKN(), g = expo(clamp((asc | 0) / 5, 0, 1), K.ka), lo = K.lo0 + (K.lo5 - K.lo0) * g, hi = K.hi0 + (K.hi5 - K.hi0) * g; return clamp(lo + (hi - lo) * expo(clamp(pos / 11, 0, 1), K.kr) + ((K.up && K.up[clamp(asc | 0, 0, 5)]) || 0), 0, 1); };
  let BASE = {}, BANDS = {};
  function baseOf(slot) {                                            // el carrete de la ronda de facil a dificil y la posicion 0-1 de cada pregunta; la 12 saca de todo el banco (sin banderas)
    const tw = (DKN().tw | 0) ? 1 : 0, bk = slot + ":" + tw; if (BASE[bk]) return BASE[bk];
    let list = poolFor(slot), topic = ROUND_THEME[slot < 12 ? slot : 4 + ((slot - 4) % 8)], tail = null;
    if (topic === "mixed") {
      const seen = new Set(); tail = new Set(assign()[11].map(q => q.cid[0])); list = [];
      assign().forEach((l, i) => { if (ROUND_THEME[i] !== "flag") l.forEach(q => { if (!seen.has(q.cid[0])) { seen.add(q.cid[0]); list.push(q); } }); });
      list.sort((a, b) => diffOf(a, a.topic) - diffOf(b, b.topic));  // la 12 ordena por la dificultad absoluta: facil es facil de verdad en cualquier categoria
    } else if (tw) {                                                 // el tema entero (rondas I y II juntas) como un solo carrete: asi la R8 de la A0 tambien lleva banderas faciles (perilla dk.tw = 0 vuelve a un carrete por ronda)
      const seen = new Set(); list = [];
      assign().forEach((l, i) => { if (ROUND_THEME[i] === topic) l.forEach(q => { if (!seen.has(q.cid[0])) { seen.add(q.cid[0]); list.push(q); } }); });
      list.sort(byLevel(topic));
    }
    const own = topic === "mixed" ? list : list.filter(q => q.topic === (topic === "flag" ? "country" : topic)), guests = topic === "mixed" ? [] : list.filter(q => !own.includes(q));   // invitadas: p. ej. capitales 9-10 en la R5 (las mas dificiles)
    const n = own.length, pct = new Map(); own.forEach((q, i) => pct.set(q.cid[0], n > 1 ? i / (n - 1) : 0.5)); guests.forEach(q => pct.set(q.cid[0], 1));
    return (BASE[bk] = { topic, tail, list: own.concat(guests), pct });
  }
  function bandsOf(slot, pos) {                                      // franjas de una ronda para su Ascension: [facil, media, dificil] desplazadas segun D(a, r); cls(q) dice a cual de las tres se parece mas
    const K = DKN(), D = diffAt(run ? run.asc : 0, pos), key = [slot, (K.tw | 0) ? 1 : 0, D.toFixed(4), K.de, K.dm, K.dh, K.sg, K.fl].join(":");
    if (BANDS[key]) return BANDS[key];
    const base = baseOf(slot), mu = [clamp(D - K.de, 0, 1), clamp(D + K.dm, 0, 1), clamp(D + K.dh, 0, 1)], cut = [(mu[0] + mu[1]) / 2, (mu[1] + mu[2]) / 2];
    const bell = m => { const w = new Map(); base.list.forEach(q => { const z = (base.pct.get(q.cid[0]) - m) / K.sg; w.set(q, K.fl + (1 - K.fl) * Math.exp(-0.5 * z * z)); }); return w; };
    return (BANDS[key] = { topic: base.topic, tail: base.tail, D, pct: q => base.pct.get(q.cid[0]), cls: q => { const p = base.pct.get(q.cid[0]); return p == null || p < cut[0] ? 0 : p < cut[1] ? 1 : 2; },
      bands: [{ k: "e", n: 3, list: base.list, w: bell(mu[0]) }, { k: "m", n: 1, list: base.list, w: bell(mu[1]) }, { k: "h", n: 1, list: base.list, w: bell(mu[2]) }] });
  }
  /* saca n preguntas de una franja por sorteo con peso: todas siguen en el pool y pueden repetirse, pero las que menos te han salido pesan mas
     (peso 1 / (1 + veces - minimo de la franja): nunca vista = 1, una vez mas que la que menos = 1/2...). En el Reto diario todas pesan igual y manda la semilla.
     Reglas que se relajan si no hay otra: 2) continente y pais; 1) nada ya preguntado en la expedicion; 0) lo que sea. first: preguntas con prioridad (x4). */
  const seenStore = () => { if (run._scratch) return run._scratch; const P = A.profile.get(); if (P.adv.decks) delete P.adv.decks; return (P.adv.seen = P.adv.seen || {}); };
  const seenKey = (q, topic) => qidOf(q, topic || q.topic);
  function takeFrom(band, n, rr, taken, ctx, first) {                // band = una franja de bandsOf: { list: todo el carrete, w: peso de campana de cada pregunta }
    const list = band.list, bw = band.w, got = [], seen = run.board ? null : seenStore(), cnt = q => (seen && seen[seenKey(q, ctx.topic)]) || 0;
    const core = list.filter(q => bw.get(q) > 0.3), ref = core.length ? core : list;   // "lo que menos ha salido" se mide en el centro de la ventana: lo lejano casi no sale y no cuenta
    const min = ref.reduce((m, q) => Math.min(m, cnt(q)), Infinity), w = q => bw.get(q) * (first && first.has(q.cid[0]) ? 4 : 1) / (1 + Math.max(0, cnt(q) - (min === Infinity ? 0 : min)));
    const fits = (q, lvl) => {
      if (taken.includes(q)) return false;
      if (lvl >= 1 && (ctx.used.has(q.cid[0]) || nameKeys(q).some(k => ctx.names.has(k)))) return false;
      if (lvl >= 2) { const c = continentOf(q), cs = cksOf(q); if (taken.filter(x => continentOf(x) === c).length >= 2 || (cs.length && taken.some(x => cksOf(x).some(k => cs.includes(k))))) return false; }
      return true;
    };
    for (const lvl of [2, 1, 0]) while (got.length < n) {
      const cand = list.filter(q => fits(q, lvl)); if (!cand.length) break;
      let r = rr() * cand.reduce((t, q) => t + w(q), 0), q = cand[cand.length - 1];
      for (const c of cand) { r -= w(c); if (r <= 0) { q = c; break; } }
      got.push(q); taken.push(q); nameKeys(q).forEach(k => ctx.names.add(k));
    }
    return got;
  }
  /* cuenta cada pregunta jugada (Aventura normal): con eso las que menos han salido pesan mas en el sorteo */
  const countSeen = (q, topic) => { if (!q || !run || run.board) return; const S = seenStore(), k = seenKey(q, topic); S[k] = (S[k] || 0) + 1; if (!run._scratch) A.profile.save(); };
  const CONT = { af: L("África", "Africa"), na: L("Norteamérica", "North America"), sa: L("Sudamérica", "South America"), as: L("Asia", "Asia"), eu: L("Europa", "Europe"), oc: L("Oceanía", "Oceania"), an: L("Antártida", "Antarctica") };   // sin "an" el Pasaporte diria "el mar" en cualquier lugar de la Antartida
  const centre = o => { const f = C().world.byName[o.key], big = f.polys.reduce((a, b) => ((b.bbox[2] - b.bbox[0]) * (b.bbox[3] - b.bbox[1]) > (a.bbox[2] - a.bbox[0]) * (a.bbox[3] - a.bbox[1]) ? b : a)); return [(big.bbox[1] + big.bbox[3]) / 2, (big.bbox[0] + big.bbox[2]) / 2]; };
  const latlon = o => (o.t === "c" ? centre(o) : [o.lat, o.lon]);
  const continentOf = o => { const [la, lo] = latlon(o); return A.continent(la, lo); };

  /* ------------------------------------------------------------------ herramientas (activas, cargas por ronda) */
  const TOOLS = {
    sonar: { ico: "sonar", uses: 2, cost: 5, r: 1, n: L("Sonar", "Sonar"), d: L6("Toca un punto del mapa: te dice a cuántos km está el objetivo (±6 %) y dibuja el anillo.|Click a point on the map: it tells you how far the target is (±6%) and draws the ring.|Touche un point : il indique la distance à la cible (±6 %) et trace l'anneau.|Toque num ponto: diz a que distância está o alvo (±6%) e desenha o anel.|Klick auf einen Punkt der Karte: zeigt, wie weit das Ziel entfernt ist (±6 %), und zeichnet den Ring.|Clicca su un punto: indica la distanza dal bersaglio (±6%) e disegna l'anello.||点击一个点：显示目标的距离（±6%）并画出圆环。|지도에서 한 지점을 고르면 목표까지의 거리(±6%)를 알려 주고 원을 그립니다.|地点をクリックすると目標までの距離（±6%）が分かり、輪が描かれる。|Коснись точки: покажет расстояние до цели (±6%) и нарисует кольцо.|Kliknij punkt na mapie: pokaże, ile km dzieli go od celu (±6%), i narysuje okrąg."), kind: "probe" },
    compass: { ico: "compass", uses: 3, cost: 4, r: 0, n: L("Brújula", "Compass"), d: L("Toca un punto: una flecha señala el rumbo (8 direcciones) hacia el objetivo.", "Tap a point: an arrow shows the heading (8 directions) to the target."), kind: "probe" },
    passport: { ico: "passport", uses: 1, cost: 7, r: 1, n: L("Pase VIP", "VIP pass"), d: L6("Tres fichas caen en el mapa: solo una marca el lugar.|Three chips drop onto the map: only one marks the place.|Trois jetons tombent sur la carte : un seul marque le lieu.|Três fichas caem no mapa: só uma marca o lugar.|Drei Chips fallen auf die Karte: Nur einer markiert den Ort.|Tre fiche cadono sulla mappa: solo una segna il luogo.||三枚筹码落在地图上：只有一枚标出了地点。|칩 세 개가 지도에 떨어집니다: 하나만 장소를 가리킵니다.|3枚のチップが地図に落ちる。場所を示すのは1枚だけ。|Три фишки падают на карту: только одна отмечает место.|Trzy żetony spadają na mapę: tylko jeden oznacza miejsce."), kind: "instant" },   // como revealCountry: en banderas, paises y pistas solo el continente
    journal: { ico: "journal", uses: 1, cost: 4, r: 0, n: L("Nota del crupier", "Dealer's note"), d: L6("Lee la nota de campo (en banderas, la región; en pistas, inicial y continente).|Read the field note (flags: the region; clues: initial and continent).|Lis la note de terrain (drapeaux : la région ; indices : initiale et continent).|Leia a nota de campo (bandeiras: a região; pistas: inicial e continente).|Lies die Feldnotiz (Flaggen: Region; Hinweise: Anfangsbuchstabe und Kontinent).|Leggi la nota di campo (bandiere: la regione; indizi: iniziale e continente).||阅读实地笔记（国旗给地区，线索给首字和大洲）。|야외 일지를 읽어 보세요(국기는 지역, 단서는 첫 글자와 대륙).|フィールドノートを読もう（国旗は地域、ヒントは頭文字と大陸）。|Прочитай полевую заметку (флаги — регион, подсказки — первая буква и континент).|Przeczytaj notatkę terenową (flagi: region; wskazówki: pierwsza litera i kontynent)."), kind: "instant" },
    hourglass: { ico: "hourglass", uses: 2, cost: 4, r: 0, n: L("Reloj de arena", "Hourglass"), d: L("+6 segundos en la pregunta actual.", "+6 seconds on the current question."), kind: "instant" },
    interruptor: { ico: "interruptor", uses: 1, cost: 8, r: 2, n: L("Interruptor", "Master switch"), d: L6("Apaga todos los retos durante esta pregunta, salvo el tiempo que ya quitó la Tormenta. Con Silencio no se puede usar.|Switches every challenge off for this question, except the time the Storm already took. It can't be used under Silence.|Désactive tous les défis pour cette question, sauf le temps déjà pris par la Tempête. Inutilisable sous Silence.|Desliga todos os desafios nesta pergunta, exceto o tempo que a Tempestade já tirou. Não pode ser usado com Silêncio.|Schaltet alle Herausforderungen für diese Frage aus, außer der Zeit, die der Sturm schon genommen hat. Bei Stille nicht nutzbar.|Spegne tutte le sfide per questa domanda, tranne il tempo già tolto dalla Tempesta. Non si può usare con il Silenzio.||关闭本题的所有挑战，但“风暴”已扣掉的时间不会返还。“沉默”时无法使用。|이 문제의 모든 도전을 끕니다. 단, 폭풍이 이미 줄인 시간은 돌아오지 않습니다. 침묵 중에는 사용할 수 없습니다.|この問題のチャレンジをすべてオフにする。ただし嵐で減った時間は戻らない。静寂の間は使えない。|Отключает все испытания для этого вопроса, кроме времени, уже отнятого «Бурей». При «Тишине» не работает.|Wyłącza wszystkie wyzwania w tym pytaniu, poza czasem zabranym już przez Burzę. Nie działa podczas Ciszy."), sn: L6("Interruptor|Master switch|Interrupteur|Interruptor|Schalter|Interruttore|Interruptor|总开关|메인 스위치|マスタースイッチ|Выключатель|Wyłącznik"), kind: "instant" },
    swapcard: { ico: "swapcard", uses: 1, cost: 9, r: 1, n: L("Descarte", "Discard"),   // tanda 9: antes Carta de cambio (es lo que mas rinde por doblon)
      d: L("Cambia esta pregunta por otro lugar de la ronda.", "Swaps this question for another place from the round."), kind: "instant" },
  };
  const BOSSES = {};                                                 // los jefes ahora son combinaciones de retos (js/challenges.js)
  /* barajas (usuario, 2026-10-02): se ganan superando Ascensiones. unlock = logro que la abre: Historiador ganando una expedicion, Navegante ganando
     en Ascension 1 o mas y Aventurero ciego en Ascension 2 o mas (antes Acto I, un jefe y ganar). Las que ya tenias abiertas se quedan (A.adv.deckLocked).
     asc = la Ascension que hay que superar (la carta cerrada lo dice) */
  const DECKS = {
    explorer: { ico: "deck_explorer", n: L("Explorador", "Explorer"), d: L("Un Sonar y 4 doblones. La baraja para aprender.", "A Sonar and 4 doubloons. The deck for learning."), tools: ["sonar"], perks: [], coins: 4, lives: 3, unlock: null },
    /* con los nombres de ahora de sus cartas (antes Cuaderno, Diccionario, Brujula de 16 rumbos y Linterna de minero, que ya no existen) */
    historian: { ico: "deck_historian", n: L("Historiador", "Historian"), d: L6("Libro de la casa y Soplo del crupier: siempre sabes por dónde empezar.|House ledger and Dealer's tip-off: you always know where to start.|Registre de la maison et Tuyau du croupier : tu sais toujours par où commencer.|Livro da casa e Dica do crupiê: você sempre sabe por onde começar.|Hausregister und Tipp vom Croupier: Du weißt immer, wo du anfangen musst.|Registro della casa e Soffiata del croupier: sai sempre da dove partire.|Libro de la casa y Soplo del crupier: siempre sabes por dónde empezar.|赌场账簿与荷官的暗示：你总知道从哪儿下手。|하우스 장부와 딜러의 귀띔: 어디서 시작할지 늘 압니다.|ハウスの帳簿とディーラーの耳打ち：どこから始めるか、いつもわかる。|«Книга заведения» и «Наводка крупье»: ты всегда знаешь, с чего начать.|Księga kasyna i cynk od krupiera: zawsze wiesz, od czego zacząć."), tools: [], perks: ["almanac", "sextant"], coins: 3, lives: 3, unlock: "adv_win", asc: 0 },
    navigator: { ico: "deck_navigator", n: L("Navegante", "Navigator"), d: L6("Dos brújulas y el Catalejo. Nunca te pierdes.|Two compasses and the Spyglass. You never get lost.|Deux boussoles et la Longue-vue. Tu ne te perds jamais.|Duas bússolas e a Luneta. Você nunca se perde.|Zwei Kompasse und das Fernrohr. Du verirrst dich nie.|Due bussole e il Cannocchiale. Non ti perdi mai.||两个指南针加望远镜。你永远不会迷路。|나침반 두 개와 망원경. 절대 길을 잃지 않습니다.|2つのコンパスと望遠鏡。決して迷わない。|Два компаса и подзорная труба. Ты никогда не заблудишься.|Dwa kompasy i luneta. Nigdy się nie zgubisz."), tools: ["compass", "compass"], perks: ["glass"], coins: 3, lives: 3, unlock: "adv_asc", asc: 1 },
    blind: { ico: "deck_blind", n: L("Aventurero ciego", "Blind adventurer"), d: L6("Sin herramientas, con el Foco del vigilante y 4 provisiones.|No tools, but the Pit boss's spotlight and 4 provisions.|Sans outils, avec le Projecteur du chef de table et 4 provisions.|Sem ferramentas, com o Holofote do supervisor e 4 provisões.|Ohne Werkzeuge, mit dem Scheinwerfer des Pitbosses und 4 Proviant.|Senza strumenti, con il Faro del capotavolo e 4 provviste.||没有工具，携带场务经理的聚光灯与 4 份补给。|도구 없이 플로어 매니저의 스포트라이트와 식량 4개.|道具なし。ピットボスのスポットライトと食料4つで出発。|Без инструментов, с прожектором пит-босса и 4 запасами.|Bez narzędzi, z reflektorem szefa sali i 4 zapasami."), tools: [], perks: ["miner"], coins: 6, lives: 4, unlock: "adv_asc2", asc: 2 },
  };
  const TOPIC_ICON = { capital: "t_capital", landmark: "t_landmark", city: "t_city", country: "t_country", history: "t_battle", nature: "t_nature", clue: "t_curio", mixed: "slot", flag: "t_country" };
  const BOSS_IC = "boss_hat";                                        // v0.35: el jefe del acto es la chistera del crupier (los mismos pixeles de su retrato: tools/crupier/chistera.py)
  A.ADV = { TOOLS, PERKS: A.RELICS, BOSSES, DECKS, ROUNDS, TOPIC_NAMES, TOPIC_ICON, BOSS_IC, roundDefOf, chalFor: r => chalFor(r), maxPerks: () => maxPerks(), bagN: () => bagN() };

  /* ------------------------------------------------------------------ partida (run) */
  let run = null, slot = RUNKEY;                                     // slot: ranura de la partida activa (expedicion normal o intento del Reto diario)
  const keyOf = daily => (daily ? DAILYKEY : RUNKEY);
  const loadSlot = daily => { try { const r = JSON.parse(localStorage.getItem(keyOf(daily)) || "null"); return r && typeof r === "object" && Number.isFinite(r.act) && Number.isFinite(r.round) ? r : null; } catch (e) { return null; } };   // una ranura corrupta o a medio escribir cuenta como vacia (antes Continuar no hacia nada o lanzaba)
  /* el logro de la legendaria del cofre se queda en deuda (run.legAch) hasta la tienda: su aviso no tapa la secuencia. Se paga ahi, al reanudar
     o, si la partida se cierra a mitad y no se continua, al abandonarla o al empezar otra encima. Pagar dos veces no hace nada */
  const payLeg = r => { if (r && r.legAch) { r.legAch = 0; A.ach.emit("adv", { kind: "legend", chest: true }); } };
  A.adv = { get run() { return run; }, hasSave(daily) { return !!loadSlot(daily); } };
  /* ---------------- la ruta de la expedicion: 12 rondas en 3 actos (el jefe cierra cada acto) y el modo infinito al final ----------------
     v0.35 (usuario): antes el Campamento ensenaba una ventana de 12 casillas que se corria y llegaba a rondas 13-18 que no existen.
     size "bar": la barra del Campamento (lo jugado, ficha de oro con su marca; la proxima, encendida y con la chincheta encima).
     size "plan": la de las pantallas de Aventura y Reto diario (un panel por acto con su nombre).
     route: la ruta barajada del Reto diario (route[hueco] = ronda original). cur: la proxima ronda que se juega (-1: aun no ha empezado) */
  const INF_N = L6("Infinito|Infinite|Infini|Infinito|Endlos|Infinito||无尽|무한|エンドレス|Бесконечный|Nieskończony");
  const INF_D = L6("Tras el último jefe: preguntas sin parar, cada vez con menos tiempo, hasta que se acaben tus provisiones.|After the last boss: nonstop questions, with less time each, until your provisions run out.|Après le dernier boss : des questions sans fin, avec de moins en moins de temps, jusqu'à épuiser tes provisions.|Depois do último chefe: perguntas sem parar, com cada vez menos tempo, até acabarem suas provisões.|Nach dem letzten Boss: Fragen ohne Ende, mit immer weniger Zeit, bis dein Proviant aufgebraucht ist.|Dopo l'ultimo boss: domande senza sosta, con sempre meno tempo, finché non finiscono le provviste.||击败最后一个首领后：问题接连不断，时间越来越少，直到补给耗尽。|마지막 보스 이후: 식량이 떨어질 때까지 점점 짧아지는 시간 속에 문제가 끝없이 이어집니다.|最後のボスの後：食料が尽きるまで、時間がどんどん短くなる問題が続く。|После последнего босса: вопросы без остановки, со всё меньшим временем, пока не кончатся запасы.|Po ostatnim bossie: pytania bez końca, z coraz krótszym czasem, aż skończą się zapasy.");
  A.adv.road = ({ size = "bar", route = null, cur = -1 } = {}) => {
    const def = i => (route ? { ...ROUNDS[route[i]], boss: i % 4 === 3 } : ROUNDS[i]);
    const node = i => { const d = def(i), st = i < cur ? " done" : i === cur ? " next" : "";
      return `<span class="rd-n${d.boss ? " boss" : ""}${st}" ${A.roundTip(i, route)}><span class="rd-ic">${ic(d.boss ? BOSS_IC : TOPIC_ICON[d.topic])}</span>${size === "plan" ? `<em>${i + 1}</em>` : ""}</span>`; };
    const acts = [0, 1, 2].map(a => { const st = cur >= 4 * (a + 1) ? " done" : cur >= 4 * a ? " now" : "";
      const head = size === "plan" ? `<header class="rd-h"><b>${A.tx(ACTS[a].n)}</b><i>${A.tx(ACTS[a].t)}</i></header>` : `<i class="rd-k">${ROMAN[a]}</i>`;
      return `<div class="rd-act${st}">${head}<div class="rd-row">${[0, 1, 2, 3].map(k => node(4 * a + k)).join("")}</div></div>`; }).join("");
    const inf = `<div class="rd-act rd-inf">${size === "plan" ? "" : `<i class="rd-k"></i>`}<div class="rd-row"><span class="rd-n inf" ${A.ttAttr(A.T("Modo infinito", "Infinite mode"), A.tx(INF_D))}><span class="rd-ic"><b>∞</b></span>${size === "plan" ? `<em>${A.tx(INF_N)}</em>` : ""}</span></div></div>`;
    return `<div class="rd ${size}">${acts}${inf}</div>`;
  };
  /* baraja cerrada: aun no tienes su logro y no la tenias abierta con la regla de antes (perfil: adv.deckKeep, ver js/profile.js) */
  A.adv.deckLocked = id => { const d = DECKS[id], P = A.profile.get(); return !!(d && d.unlock && !P.ach[d.unlock] && !(P.adv.deckKeep || {})[id]); };
  A.adv.poolStats = () => Object.fromEntries(Object.entries(pools()).map(([k, v]) => [k, v.length]));
  A.adv.roundPlaces = r => poolFor(r);
  A.adv.countSeen = countSeen;
  A.adv.roundPool = r => poolFor(r).length;
  const persist = () => { try { if (run) localStorage.setItem(slot, JSON.stringify(run)); else localStorage.removeItem(slot); } catch (e) { /* sin almacenamiento */ } };

  /* tanda 17: Ascensiones con identidad. A1 La casa cobra (+5 % objetivo, -1 s, +10 % precios: sube un escalon por Ascension), A2 Reglas de la casa (una regla en R5, R7, R9 y R11),
     A3 Retos afilados (+1 nivel en los actos I y II), A4 Jefes con poder (+1 reto en cada jefe, tope 5, y -1 provision: medido, ver perks-revision-2026-10) y A5 Equipaje de mano (mochila de 4, 5 con el Pacto) */
  const ascFx = a => ({ target: 1 + 0.05 * a, secs: -a, lives: a >= ((A.KN || {}).provAt || 3) ? -1 : 0, price: 1 + 0.1 * a, boss2: a >= 4, pack: a >= 5 ? -1 : 0 });
  const ASC_N = [null, L6("La casa cobra|The house takes its cut|La maison encaisse|A casa cobra|Das Haus kassiert|La casa incassa||赌场收账|하우스의 수수료|ハウスの取り分|Заведение берёт своё|Kasyno bierze swoje"), L6("Reglas de la casa|House rules|Règles de la maison|Regras da casa|Hausregeln|Regole della casa||赌场规矩|하우스 룰|ハウスルール|Правила заведения|Zasady kasyna"), L6("Retos afilados|Sharpened challenges|Défis aiguisés|Desafios afiados|Geschärfte Herausforderungen|Sfide affilate||凌厉挑战|날카로워진 도전|チャレンジ強化|Заострённые испытания|Zaostrzone wyzwania"), L6("Jefes con poder|Empowered bosses|Boss puissants|Chefes com poder|Bosse mit Macht|Boss con potere||强力首领|강력한 보스|力を持つボス|Усиленные боссы|Bossowie z mocą"), L6("Equipaje de mano|Carry-on|Bagage à main|Bagagem de mão|Handgepäck|Bagaglio a mano||随身行李|기내 수하물|機内持ち込み|Ручная кладь|Bagaż podręczny")], ASC_D = [null, L6("Objetivos +5 %, −1 s y todo cuesta +10 %.|Targets +5%, −1 s and everything costs +10%.|Objectifs +5 %, −1 s et tout coûte +10 %.|Metas +5%, −1 s e tudo custa +10%.|Ziele +5 %, −1 s und alles kostet +10 %.|Obiettivi +5%, −1 s e tutto costa +10%.||目标 +5%，−1 秒，一切涨价 10%。|목표 +5%, −1초, 모든 가격 +10%.|目標+5%、−1秒、すべて+10%値上げ。|Цели +5%, −1 с, всё дороже на 10%.|Cele +5%, −1 s, wszystko droższe o 10%."), L6("Una regla de la casa en las rondas 5, 7, 9 y 11.|A house rule in rounds 5, 7, 9 and 11.|Une règle de la maison aux manches 5, 7, 9 et 11.|Uma regra da casa nas rodadas 5, 7, 9 e 11.|Eine Hausregel in Runde 5, 7, 9 und 11.|Una regola della casa nei round 5, 7, 9 e 11.||第 5、7、9、11 回合有一条赌场规矩。|5·7·9·11라운드에 하우스 룰이 하나 붙습니다.|ラウンド5・7・9・11にハウスルールが1つ。|Правило заведения в раундах 5, 7, 9 и 11.|Zasada kasyna w rundach 5, 7, 9 i 11."), L6("Retos un nivel más fuertes en los actos I y II.|Challenges one level stronger in acts I and II.|Défis d'un niveau de plus aux actes I et II.|Desafios um nível mais fortes nos atos I e II.|Herausforderungen eine Stufe stärker in Akt I und II.|Sfide di un livello più forti negli atti I e II.||第一、二幕的挑战强一级。|1·2막 도전이 한 단계 강해집니다.|第1・2幕のチャレンジが1段階強化。|Испытания в актах I и II на уровень сильнее.|Wyzwania o poziom mocniejsze w aktach I i II."), L6("Cada jefe trae un reto más (con tope de 5) y una provisión menos.|Every boss brings one more challenge (capped at 5) and you have one fewer provision.|Chaque boss apporte un défi de plus (5 au maximum) et tu as une provision de moins.|Cada chefe traz um desafio a mais (no máximo 5) e você tem uma provisão a menos.|Jeder Boss bringt eine Herausforderung mehr (höchstens 5), und du hast einen Proviant weniger.|Ogni boss porta una sfida in più (massimo 5) e hai una provvista in meno.||每个首领多一个挑战（最多 5 个），补给 −1。|보스마다 도전이 하나 더 나오고 (최대 5개) 식량이 1개 줄어듭니다.|各ボスにチャレンジが1つ増え（最大5つ）、食料が1つ減る。|Каждый босс приносит ещё одно испытание (не больше 5), и на один запас меньше.|Każdy boss przynosi jedno wyzwanie więcej (maksymalnie 5) i masz jeden zapas mniej."), L6("Mochila de 4 huecos (5 con el Pacto).|A 4-slot backpack (5 with the Pact).|Un sac de 4 emplacements (5 avec le Pacte).|Mochila de 4 espaços (5 com o Pacto).|Ein Rucksack mit 4 Plätzen (5 mit dem Pakt).|Uno zaino da 4 posti (5 con il Patto).||背包只有 4 格（有契约时 5 格）。|배낭 4칸 (계약이 있으면 5칸).|バッグは4枠（契約があれば5枠）。|Рюкзак на 4 ячейки (5 с «Договором»).|Plecak na 4 miejsca (5 z Paktem).")], ASC_K = L6("La casa cobra más: objetivos +{a} %, −{s} s, precios +{p} %.|The house takes more: targets +{a}%, −{s} s, prices +{p}%.|La maison encaisse plus : objectifs +{a} %, −{s} s, prix +{p} %.|A casa cobra mais: metas +{a}%, −{s} s, preços +{p}%.|Das Haus verlangt mehr: Ziele +{a} %, −{s} s, Preise +{p} %.|La casa incassa di più: obiettivi +{a}%, −{s} s, prezzi +{p}%.||赌场收得更多：目标 +{a}%，−{s} 秒，价格 +{p}%。|하우스가 더 챙깁니다: 목표 +{a}%, −{s}초, 가격 +{p}%.|ハウスの取り分が増える：目標+{a}%、−{s}秒、価格+{p}%。|Заведение берёт больше: цели +{a}%, −{s} с, цены +{p}%.|Kasyno bierze więcej: cele +{a}%, −{s} s, ceny +{p}%."), ASC_ALL = L6("Suma todo lo anterior.|Adds everything above.|Cumule tout ce qui précède.|Soma tudo o que veio antes.|Alles Vorherige zusammen.|Include tutti i precedenti.||叠加之前的全部效果。|이전 효과가 모두 더해집니다.|これまでの効果がすべて加わる。|Включает всё предыдущее.|Obejmuje wszystkie poprzednie."), ASC_UNLOCK = L6("Ascensión {n} desbloqueada: «{name}».|Ascension {n} unlocked: “{name}”.|Ascension {n} débloquée : « {name} ».|Ascensão {n} desbloqueada: “{name}”.|Aufstieg {n} freigeschaltet: „{name}“.|Ascensione {n} sbloccata: «{name}».||已解锁进阶 {n}：“{name}”。|어센션 {n} 해금: '{name}'.|アセンション{n}解放：「{name}」。|Восхождение {n} открыто: «{name}».|Odblokowano Wniebowstąpienie {n}: „{name}”.");
  A.adv.ascInfo = i => ({ n: A.tx(ASC_N[i]), d: A.tx(ASC_D[i]), k: i >= 2 ? A.tx(ASC_K).replace("{a}", 5 * i).replace("{s}", i).replace("{p}", 10 * i) + " " + A.tx(ASC_ALL) : "" });
  const roundNo = () => run.act * 4 + run.round;
  /* Reto diario: la ruta del dia baraja las rondas de cada acto (run.route[hueco] = ronda original); el jefe sigue siendo el 4.o hueco de cada acto */
  const slotOf = r => (run && run.route && r < 12 ? run.route[r] : r);
  const defAt = r => (run && run.route && r < 12 ? { ...roundDefOf(run.route[r]), boss: r % 4 === 3 } : roundDefOf(r));
  A.adv.roundDef = defAt;
  const rdef = () => defAt(roundNo());
  const isBoss = () => run.round === 3;
  const perkList = () => run.perks.map(id => A.RELICS[id]).filter(Boolean);
  const baseSlots = () => 5 + ascFx(run.asc).pack;                   // tanda 17 (A5): 4 huecos de base en Ascension 5
  const maxPerks = () => baseSlots() + perkList().reduce((n, p) => n + (p.slot || 0), 0);   // tanda 13 (S7): huecos de la mochila
  /* 0.2.23: el Pacto no ocupa hueco (antes ocupaba el que daba y no servia de nada): la mochila cuenta todo lo demas; el Pacto se ve como un lacre junto al contador */
  const isPact = id => !!(A.RELICS[id] && A.RELICS[id].pact), bag = () => run.perks.filter(id => !isPact(id)), bagN = () => bag().length;
  const has = flag => perkList().some(p => p[flag]);
  const sumFlag = flag => perkList().reduce((n, p) => n + (p[flag] || 0), 0);
  const owned = id => run.perks.includes(id);
  /* objetivo: escalera lineal, +250 por ronda de 2.000 (ronda 1) a 4.500 (ronda 11); el jefe final (ronda 12) es 4.777 exactos. Redondeado a 50 (salvo ese 4.777 sin ascension ni perks de ronda).
     v0.20 (usuario, 2026-09-30): que pese mas SABER que clavar; antes +350 por ronda, 5.777 y +10 % por Ascension hacian imposibles las rondas 11-12 aunque supieras las cinco */
  /* tanda 4 (S21): el objetivo de la ronda se congela al empezarla (run.tgt). El margen y el consuelo se miden contra el objetivo SIN rebajas
     (la Mesa de minimos no se paga a si misma). El panel del Campamento usa target(), en directo */
  const tgtKey = () => roundNo() + ":" + (run.attempt || 0);
  const roundTarget = () => { run.tgt = run.tgt || {}; const k = tgtKey(); if (run.tgt[k] == null) run.tgt[k] = target(); return run.tgt[k]; };
  const baseTarget = () => { const r = roundNo(), base = r >= 11 ? 4777 : 2000 + 250 * r, m = ascFx(run.asc).target; return r >= 11 && m === 1 ? base : Math.round((base * m) / 50) * 50; };
  const target = () => { const t = { seconds: 0, target: 1 }; perkList().forEach(p => p.round && p.round(t, run)); t.target = Math.max(0.85, t.target); const r = roundNo(), base = r >= 11 ? 4777 : 2000 + 250 * r, m = ascFx(run.asc).target * t.target; return r >= 11 && m === 1 ? base : Math.round((base * m) / 50) * 50; };   // tanda 12: las rebajas del objetivo (Midas y Mesa de minimos) no pasan del −15 %
  const shopCtx = () => { const x = { price: 0, freeReroll: 0, slots: 3 }; perkList().forEach(p => p.shop && p.shop(x, run)); return x; };
  const inflation = () => 1 + 0.25 * run.act;                            // todo cuesta mas en cada acto: el dinero pesa mas segun avanzas
  const price = c => Math.max(1, Math.round(c * ascFx(run.asc).price * inflation()) + shopCtx().price);
  const lifePrice = () => price(6 + 2 * (run.lifeBuys || 0));            // cada provision comprada en la partida cuesta 2 mas
  /* tanda 3 (S8): vender devuelve la mitad de lo que pagaste (run.paid); lo del cofre o de partidas viejas, la mitad de su precio de ahora.
     Vendida en la misma visita en que la compraste: todo lo pagado (salvo el Ojo en el cielo, que ya ha mirado) */
  const sellValue = id => (id === "hoard" ? run.hucha || 0 : 0) + sellBase(id);   // tanda 9: la Hucha vale ademas lo que lleva dentro
  const sellBase = id => { const p = A.RELICS[id], paid = run.paid && run.paid[id]; if (paid > 0 && run.paidAt && run.paidAt[id] === run.shopKey && id !== "spyhole") return paid; return Math.ceil((paid > 0 ? paid : price(p.cost)) / 2); };
  /* amuletos (tanda 3): las contras de antes. Desde la 0.2.5 son fijos (sin cargas): ver amuPerks */
  const AMU_TAG = L6("Amuleto|Amulet|Amulette|Amuleto|Amulett|Amuleto||护身符|부적|お守り|Амулет|Amulet");
  const VTG_TAG = L6("Ventaja|Edge|Atout|Vantagem|Vorteil|Vantaggio||优势|어드밴티지|アドバンテージ|Преимущество|Atut"), VTG_SWAP = L6("vende la otra|sells your other one|vend l'autre|vende a outra|verkauft den anderen|vende l'altro||卖掉另一张|다른 하나는 판매|もう一枚は売る|продаёт другое|sprzedaje drugi");   // 0.2.21: nada de "cambiar": la vieja se vende
  const OTRA = L6("¡Otra!|One more!|Encore !|De novo!|Noch mal!|Ancora!||再来！|한 번 더!|もう一回！|Ещё!|Jeszcze!"), BEST5 = L6("5 mejores|best 5|5 meilleures|5 melhores|beste 5|5 migliori||取前5|상위 5개|上位5つ|5 лучших|5 najlepszych");
  const NULLED = L6("Anulado|Voided|Annulé|Anulado|Annulliert|Annullato||已作废|무효|無効|Отменён|Anulowane"), SAVED_BY = L6("te ha salvado|saved you|t'a sauvé|te salvou|hat dich gerettet|ti ha salvato|te salvó|救了你|덕분에 살았어요|に救われた|спас тебя|cię uratował");
  const gain = n => Math.round(n * (sumFlag("coinX") || 1));
  const chestSkip = () => Math.round(2.5 * inflation());                // dejar el cofre del jefe sin abrir: 3 doblones al empezar el acto II, 4 al empezar el III (el Toque de Midas los duplica, como todo lo que ganas)
  /* retos de la ronda r tras aplicar perks (Llave maestra, Talisman, inmunidades); pl: otra mano de perks (la tienda valora cada reliquia sin contarla a ella) */
  /* tanda 6b: el plan de la ronda r (barajada si la barajaste), con el historial del plan base de la expedicion */
  const planOf = r => A.chal.plan(run.seed + ((run.salt && run.salt[r]) ? ":" + run.salt[r] : ""), r, run.asc, defAt(r).topic, run.cjk, { base: run.seed, topics: x => defAt(x).topic, first: !!run.first });
  const chalFor = (r, pl = perkList()) => {
    const plan = A.adv._forceBoss ? A.chal.plan(run.seed, r, run.asc, defAt(r).topic, run.cjk, { base: run.seed, topics: x => defAt(x).topic, first: !!run.first, force: A.adv._forceBoss }) : planOf(r), boss = r % 4 === 3;
    let list = A.adv._force ? A.adv._force.map(id => { const [i, l] = String(id).split("@"); return A.chal.canon({ id: i, lv: +l || 2 }); }) : plan.list.slice();
    const bribed = (run.bribed && run.bribed[r]) || [], paid = list.filter(c => bribed.includes(c.id)).map(c => c.id); if (bribed.length) list = list.filter(c => !bribed.includes(c.id));   // sobornados en el Campamento (paid: los que estaban en esta tirada; barajar no borra los sobornos)
    const sum = f => pl.reduce((n, p) => n + (p[f] || 0), 0), nulled = [];
    for (let k = sum("skipHardest"); k > 0 && list.length; k--) { const RK = { map: 5, wall: 4, ptr: 3, rule: 2 }, w = c => (c.lv || 1) * 10 + (RK[A.CHAL[c.id].kind] || 1); const top = list.reduce((a, c) => (w(c) > w(a) ? c : a)); nulled.push(top.id); list = list.filter(c => c !== top); }   // Comodin: fuera el reto mas fuerte
    if (boss) { let soft = sum("softenBoss"); list = list.map((c, i) => (i < soft ? { ...c, lv: 1 } : c)); }
    list = list.filter(c => !pl.some(p => (p.immune || []).includes(c.id)));
    if (run.board) list = list.map(c => (c.id === "trap" && (c.lv || 1) > 2 ? { ...c, lv: 2 } : c));   // tanda 15: la Pregunta trampa, en el Reto diario, como mucho a nivel 2
    for (const bet of run.inf ? [] : [run.bets && run.bets[r], casOf(r)])      // tanda 11: los de las apuestas (la lateral y Rojo o negro), sellados (si fallas, la revancha va sin ellos)
      if (bet && bet.retos && (bet.id === "offer" || r !== roundNo() || (bet.att != null ? bet.att === (run.attempt || 0) : !(run.attempt > 0)))) list = list.concat(bet.retos.filter(b => !list.some(c => c.id === b.id)).map(c => ({ ...c, sealed: true, sealBy: bet.id === "offer" ? "offer" : "bet" })));
    if (pl.some(p => p.pact) && !boss && !run.inf && r <= LAST && list.length < 4) { const add = pickSealed(r, 1, "pacto", list)[0]; if (add) list.push({ ...add, lv: clamp(list.length ? Math.max(...list.map(c => c.lv || 1)) : 1, 1, 3), sealed: true, sealBy: "pact" }); }   // tanda 13: el reto del Pacto
    if (boss) { const live = l => l.filter(c => c.wh == null).length + (l.some(c => c.wh != null) ? 1 : 0); while (live(list) > 5) { const k = list.findIndex(c => c.x4); if (k < 0) break; list.splice(k, 1); } }   // tanda 17 (A4): el reto extra del jefe cede ante los sellados: nunca mas de 5
    if (run.chSeen0 && !run.board && run.asc < 3 && !A.adv._force) list = list.map(c => (run.chSeen0.includes(c.id) || c.sealed ? c : { ...c, lv: 1, isNew: true }));   // S12: lo que nunca has visto se estrena a nivel 1
    if (pl.some(p => p.spy)) list = list.map(c => (c.hid ? { ...c, up: true } : c));   // tanda 16: con el Ojo en el cielo, las fichas boca abajo del jefe se ven
    return { list, combo: plan.combo, boss, paid, nulled };
  };

  /* ---------------- tienda relevante: lo que sirve cada reliquia en ESTA expedicion ----------------
     Los retos salen de la semilla (A.chal.plan), asi que el Campamento sabe que trucos quedan por venir (con barajados y sobornos ya aplicados).
     Una contra solo se ofrece si alguno de sus retos aparece en las rondas que quedan; las piezas de una herramienta, solo si la llevas;
     las de economia, solo si queda Campamento donde gastar lo que dan; y la de empezar acto, solo si queda algun acto por empezar. */
  const LAST = 11;                                                   // ultima ronda numerada: despues solo queda el modo infinito (sin retos ni Campamento)
  let CTR = null;                                                    // reliquia -> retos que frena (sale de A.CHAL[reto].counters)
  const ctrOf = id => { if (!CTR) { CTR = {}; for (const c in A.CHAL) (A.CHAL[c].counters || []).forEach(p => (CTR[p] = CTR[p] || []).push(c)); } return CTR[id] || null; };
  const pureCounter = p => !!ctrOf(p.id) && !(p.open || p.round || p.clear || p.post || p.shop || p.buy || p.actStart);   // solo frena retos (Batería externa y la Chuleta de bolsillo sirven tambien sin su reto)
  /* rondas (de `from` a la ultima) con algun reto que esta reliquia frena: [{ r, id }]. Sin herramientas, el Silencio no te quita nada (Tapones VIP) */
  const helpRounds = (id, from = roundNo()) => {
    let cs = ctrOf(id); const out = []; if (!cs || run.inf) return out;
    if (!Object.keys(run.tools).length) cs = cs.filter(c => c !== "silence");
    const pl = perkList().filter(p => p.id !== id);
    for (let r = from; r <= LAST; r++) { const hit = chalFor(r, pl).list.find(c => cs.includes(c.id)); if (hit) out.push({ r, id: hit.id }); }
    return out;
  };
  /* pistas gratis: solo si aportan en alguna de las rondas que quedan. El Soplo (continente) solo donde el pais no esta escrito: banderas, paises,
     pistas, el Jackpot (saca tambien de los carretes de paises y de pistas: 1 de cada 5) o una ronda con Sin pais. La Chuleta de bolsillo y el Oraculo iluminan el pais en las rondas de lugares (el Jackpot incluido, que es casi
     todo lugares); en banderas, paises y pistas solo dan el continente (ver revealCountry). El Libro de la casa sirve en cualquier ronda */
  const NOPAIS = ["flag", "country", "clue"];
  const hintHelps = (hint, from) => {
    if (hint === "note") return true;
    if (hint === "half") { for (let r = from; r <= LAST; r++) { const t = defAt(r).topic; if (t !== "flag" && t !== "country") return true; } return false; }   // el Soplo calla en banderas y paises
    for (let r = from; r <= LAST; r++) {
      const t = defAt(r).topic;
      if (hint === "continent" ? NOPAIS.includes(t) || t === "mixed" || chalFor(r).list.some(c => c.id === "nocountry") : !NOPAIS.includes(t)) return true;
    }
    return false;
  };
  const useful = (id, from = roundNo()) => {
    const p = A.RELICS[id]; if (!p || run.inf || from > LAST) return false;
    const left = LAST + 1 - from;                                    // rondas que quedan, contando la proxima
    if (pureCounter(p)) return helpRounds(id, from).length > 0;
    if (p.hint) return hintHelps(p.hint, from);
    if (p.calm) { for (let r = from; r <= LAST; r++) if (chalFor(r).list.some(c => p.calm.includes((A.CHAL[c.id] || {}).fam))) return true; return false; }   // Sangre fria: queda alguna ronda con retos de puntero o pantalla
    if (p.toolBonus) return Object.keys(run.tools).length > 0;        // el Catalejo tambien afina el Sonar y la Brujula, pero sirve con cualquier herramienta
    if (p.bank) return left >= 3;
    if (p.sonarErr) return !!run.tools.sonar;                        // Sonar trucado sin Sonar, o la ruleta de 16 rumbos sin Brujula, no hacen nada
    if (p.compass16) return !!run.tools.compass;
    if (p.toolBonus) return Object.keys(run.tools).length > 0;
    if (p.actStart) return run.act < 2;                              // se cobra al empezar un acto: en el III ya no empieza ninguno
    if (p.spy) return left >= 2;
    if (p.pact) return left >= 2;
    if (p.interest || p.coinX || p.clear || p.post || p.shop) return left >= 3;
    return true;
  };

  /* ---------------- botin de ronda: superar el objetivo paga 2 (jefe 4) y cada escalon de margen suma 1; fallar paga 1 por cada tercio del objetivo ----------------
     Calibrado con dev/bot.js sobre partidas reales: pasar justo cobra lo mismo que antes y todo lo que se gana de mas sale del margen (+55-75 % por expedicion). */
  const CLEAR = [2, 4], STEPS = [1.1, 1.25, 1.5, 2];                // escalones: +10 %, +25 %, +50 % y el doble del objetivo
  const marginOf = q => STEPS.filter(s => q >= s).length;
  const consoOf = q => clamp(Math.floor(q * 3), 0, 2);              // un tercio -> 1, dos tercios -> 2: nunca mas que superarla
  const loot = (s, t, boss) => { const q = s / Math.max(1, t), m = marginOf(q); return { q, base: CLEAR[boss ? 1 : 0], margin: m, next: m < STEPS.length ? Math.ceil(t * STEPS[m] - 1e-7) : 0 }; };   // -1e-7: 2100 x 1,1 da 2310,0000000000005 y el marcador pedia 2.311
  const pctOf = (s, t) => Math.floor((s * 100) / Math.max(1, t));   // % entero exacto (floor((q - 1) * 100) daba 13 % con 5.700 de 5.000)
  A.adv.loot = loot;
  /* textos nuevos de la economia (es|en|fr|pt|de|it|es-419|zh|ko|ja|ru|pl) */
  const ETX = {
    margin: L6("Margen +{p} %|Margin +{p}%|Marge +{p} %|Margem +{p}%|Vorsprung +{p} %|Margine +{p}%||超额 +{p}%|초과 달성 +{p}%|上乗せ +{p}%|Перевес +{p}%|Nadwyżka +{p}%"),
    conso: L6("Consuelo ({p} % del objetivo)|Consolation ({p}% of target)|Consolation ({p} % de l'objectif)|Consolação ({p}% da meta)|Trostpreis ({p} % des Ziels)|Consolazione ({p}% dell'obiettivo)||安慰奖（达成目标的 {p}%）|위로금 (목표의 {p}%)|残念賞（目標の{p}%）|Утешительный приз ({p}% цели)|Nagroda pocieszenia ({p}% celu)"),
    retry: L6("Revancha: la casa te deja una carta a mitad de precio.|Rematch: the house lets you have one card at half price.|Revanche : la maison te laisse une carte à moitié prix.|Revanche: a casa te deixa uma carta pela metade do preço.|Revanche: Das Haus überlässt dir eine Karte zum halben Preis.|Rivincita: la casa ti lascia una carta a metà prezzo.||再战：庄家让你半价买一张牌。|설욕전: 하우스가 카드 한 장을 반값에 줘요.|リベンジ：ハウスがカードを1枚半額にしてくれる。|Реванш: заведение уступает тебе одну карту за полцены.|Rewanż: kasyno odstępuje ci jedną kartę za pół ceny."),   // no dice cual ni por que: el jugador lee la carta rebajada y ata cabos
    loot: L6("Botín|Loot|Butin|Prêmio|Beute|Bottino||战利品|보상|報酬|Добыча|Łup"),
    next: L6("+{c} a {s}|+{c} at {s}|+{c} à {s}|+{c} com {s}|+{c} ab {s}|+{c} a {s}||{s} 分 +{c}|{s}점에 +{c}|{s}で+{c}|+{c} при {s}|+{c} przy {s}"),
    max: L6("máx.|max|max|máx.|max.|max||最高|최대|最大|макс.|maks."),
    lootTip: L6("Botín de la ronda|Round loot|Butin de la manche|Prêmio da rodada|Rundenbeute|Bottino del round||本回合战利品|라운드 보상|ラウンド報酬|Добыча раунда|Łup rundy"),
    lootTipD: L6("Doblones que cobras al superar la ronda: 2 (jefe 4) y +1 por cada escalón de margen: +10 %, +25 %, +50 % y el doble del objetivo. Si fallas, cobras 1 por cada tercio del objetivo que alcances.|Doubloons you collect for clearing the round: 2 (boss 4), plus 1 for every margin step: +10%, +25%, +50% and double the target. If you fail, you get 1 for every third of the target you reach.|Doublons encaissés en réussissant la manche : 2 (boss 4), et +1 par palier de marge : +10 %, +25 %, +50 % et le double de l'objectif. Si tu échoues, tu touches 1 par tiers de l'objectif atteint.|Dobrões que você recebe ao vencer a rodada: 2 (chefe 4) e +1 por degrau de margem: +10%, +25%, +50% e o dobro da meta. Se falhar, recebe 1 por cada terço da meta alcançado.|Dublonen fürs Bestehen der Runde: 2 (Boss 4) und +1 pro Vorsprungsstufe: +10 %, +25 %, +50 % und das Doppelte des Ziels. Scheiterst du, gibt es 1 pro erreichtem Drittel des Ziels.|Dobloni che incassi superando il round: 2 (boss 4) e +1 per ogni gradino di margine: +10%, +25%, +50% e il doppio dell'obiettivo. Se fallisci, ne prendi 1 per ogni terzo dell'obiettivo raggiunto.||通过本回合可得金币：2（首领 4），每达到一档超额再 +1：+10%、+25%、+50% 和目标的两倍。失败时，每达成目标的三分之一得 1。|라운드를 클리어하면 받는 도블론: 2 (보스 4), 초과 달성 단계마다 +1: +10%, +25%, +50%, 목표의 두 배. 실패하면 달성한 목표의 3분의 1마다 1.|ラウンドクリアで得るダブロン：2（ボス4）、上乗せの段階ごとに+1：+10%、+25%、+50%、目標の2倍。失敗しても、達成した目標の3分の1ごとに1。|Дублоны за прохождение раунда: 2 (босс 4) и +1 за каждую ступень перевеса: +10%, +25%, +50% и двойная цель. При провале — 1 за каждую достигнутую треть цели.|Dublony za zaliczenie rundy: 2 (boss 4) i +1 za każdy próg nadwyżki: +10%, +25%, +50% i podwójny cel. Gdy oblejesz, dostajesz 1 za każdą osiągniętą trzecią część celu."),
  };
  const et = (k, p) => A.tx(ETX[k]).replace(/\{(\w+)\}/g, (m, x) => (p && p[x] != null ? p[x] : m));

  A.adv.begin = function ({ deck = "explorer", asc = 0, seed, ranked = false, board = null, dailyTry = 0, route = null, gift = null } = {}) {
    resumedIntro = false; flashQ.length = 0;                          // nada de la expedicion anterior (la frase de reanudar, destellos pendientes)
    const d = DECKS[deck] || DECKS.explorer, bonus = gift && A.RELICS[gift] && !d.perks.includes(gift) ? A.RELICS[gift] : null;
    slot = keyOf(!!board); payLeg(loadSlot(!!board));
    /* cjk (sin runas ni sin vocales) se fija al empezar: cambiar de idioma a media expedicion no mueve los trucos ni los sobornos (ver A.chal.plan) */
    run = {
      v: 2, seed: seed || "run-" + Math.random().toString(36).slice(2, 10), cjk: A.chal.noLatin(), deck, asc, ranked, board, dailyTry, route: route ? route.slice(0, 12) : null, gift: bonus ? gift : null,
      act: 0, round: 0, attempt: 0, coins: d.coins, lives: d.lives + ascFx(asc).lives, maxLives: d.lives + ascFx(asc).lives,
      first: !board && !A.profile.get().adv.runs, chSeen0: !board && asc < 3 && A.dealer && A.dealer.trickSeen ? A.dealer.trickSeen() : null,
      perks: d.perks.concat(bonus ? [gift] : []), tools: {}, score: 0, cleared: 0, used: [], rerolls: 0, freeUsed: 0, shopN: 0, phase: "round", qi: 0, qn: 5, qTools: 0, rTools: 0, luckUsed: false, guardUsed: false,
      livesLostAct: 0, shieldAct: -1, leftSum: 0, roundScore: 0, rGood: 0, qTotal: 0, stats: { bulls: 0, best: 0, coinsEarned: 0 }, t0: Date.now(),
    };
    d.tools.forEach(t => addTool(t)); if (bonus && bonus.buy) bonus.buy(run);
    persist(); A.ach.emit("adv", { kind: "start" }); A.profile.get().adv.runs++; A.profile.save();
    startRound();
  };
  /* Reto diario: gasta uno de los 3 intentos de hoy y empieza con la mano del dia (baraja, ascension, regalo y ruta) y la semilla de ESE intento */
  A.adv.beginDaily = board => {
    const DY = A.rank.daily, k = DY.start(board); if (!k) return false;
    const h = DY.hand(board);
    A.adv.begin({ deck: h.deck, asc: h.asc, seed: DY.trySeed(board, k), ranked: true, board, dailyTry: k, route: h.route, gift: h.gift });
    return true;
  };
  /* puntos de una expedicion al cerrarla: lo sumado en las rondas + 1.000 por ronda superada + 2.500 si conquisto los tres actos, y TODO ello por el
     multiplicador de la Ascension (usuario, 2026-10-03): Ascension 0 no cambia; +10 % por nivel hasta x1,50. Solo se aplica aqui, al cerrar: no toca
     objetivos, margenes ni lo que ves ronda a ronda. Asi una run infinita en Ascension 0 no le gana a una igual de buena en una dificultad mayor */
  const ASC_MULT = [1, 1.1, 1.2, 1.3, 1.4, 1.5], ascMult = a => ASC_MULT[Math.max(0, Math.min(5, a | 0))];
  const mulTxt = m => { try { return m.toLocaleString(A.lang, { minimumFractionDigits: 2 }); } catch (e) { return m.toFixed(2); } };
  const rawOf = r => r.score + r.cleared * 1000 + (r.won ? 2500 : 0);
  const finalOf = r => Math.round(rawOf(r) * ascMult(r.asc));
  A.adv.finalOf = finalOf; A.adv.ascMult = ascMult; A.adv.mulTxt = mulTxt;
  /* partida guardada: se descarta lo que ya no exista en el catalogo (reliquias, herramientas, retos) para que reanudar nunca falle */
  function sanitize(r) {
    r.perks = r.perks.filter(id => A.RELICS[id]);
    Object.keys(r.tools).filter(id => !TOOLS[id]).forEach(id => delete r.tools[id]);
    if ((r.stock || []).some(s => (s.k === "perk" && !A.RELICS[s.id]) || (s.k === "tool" && !TOOLS[s.id]))) { r.stock = null; r.stockKey = null; }
    if (r.cjk == null) r.cjk = A.chal.noLatin();
    if (r.chal) r.chal = r.chal.filter(c => A.CHAL[c.id]);
  }
  A.adv.resume = function (daily = false) {
    slot = keyOf(daily); run = loadSlot(daily);
    if (!run) return false;
    sanitize(run); resumedIntro = true;
    if (run.phase === "shop" || run.phase === "chest") openShop(run.phase === "chest");
    else if (run.phase === "verdict") afterVerdict(!!run.vBoss);                            // la ronda ya estaba superada y cobrada: seguimos al campamento
    else if (run.phase === "win") showWinChoice();                                          // ya habias ganado: vuelve a preguntar cobrar o modo infinito
    else if (run.phase === "retry") openShop(false);                                        // ronda fallida: vuelves al campamento para reintentar
    else if (run.phase === "round" && (run.inf ? run.infOver : run.curQ && run.qi >= run.qn)) endSaved();   // guardaste en el ticket de la ultima pregunta: la ronda se cierra (antes se repetia entera sin perder provision)
    else if (run.phase === "round" && run.inf) startInfinite(true);                         // sigue en el modo infinito donde lo dejaste
    else if (run.phase === "round" && run.qi < run.qn && run.curQ) { run.used = run.used.filter(id => !run.curQ.includes(id)); startRound(true); }   // pickQuestions(n, true) repone las mismas (run.curQ)   // sigue en la misma pregunta con las mismas preguntas (tambien en la primera: antes salir y volver daba 5 lugares nuevos y las herramientas recargadas)
    else startRound();
    return true;
  };
  /* la ronda ya estaba jugada entera al guardar (menu desde el ticket de la ultima pregunta, o sin provisiones en el modo infinito): se cierra sin volver a jugarla */
  function endSaved() {
    const S = C().S; S.run = run; S.levelScore = run.roundScore || 0; S.runTotal = run.score;
    S.camp = { id: "adv", mode: "adventure", title: { es: "Aventura", en: "Adventure" }, home: { lat: 20, lon: 10, zoom: 1 }, levels: [{ advance: run.inf ? 1 : roundTarget(), boss: !run.inf && isBoss() }] };
    A.adv.roundEnd();
  }
  /* descarta la partida guardada de una ranura (por defecto, la de la partida activa si la hay; si no, la expedicion normal).
     Un intento del Reto diario no se tira: se cierra con los puntos que llevaba y cuenta para la puntuacion global del dia. */
  A.adv.abandon = (daily = !!(run && run.board)) => {
    const act = !!run && !!run.board === daily, r = act ? run : loadSlot(daily), key = act ? slot : keyOf(daily); payLeg(r);
    if (daily && r && r.board && r.dailyTry) A.rank.daily.finish(r.board, r.dailyTry, Math.round((rawOf(r) + (r.inf ? r.roundScore || 0 : 0)) * ascMult(r.asc)), { r: r.cleared, won: !!r.won });
    if (act) run = null;
    try { localStorage.removeItem(key); } catch (e) { /* sin almacenamiento */ }
  };
  A.adv.save = () => persist();
  A.adv.leave = () => { if (run) { snapSpent(); persist(); A.dealer.noteLeave(); } clearTimers(); A.chal.end(); A.dealer.enable(false); run = null; A.adv.hideBars(); };
  A.adv.summary = (daily = false) => { const r = (run && !!run.board === daily && run) || loadSlot(daily); return r ? { act: r.act + 1, round: r.round + 1, coins: r.coins, score: r.score, lives: r.lives, board: r.board || null, dailyTry: r.dailyTry || 0, inf: !!r.inf, asc: r.asc || 0 } : null; };
  A.adv.active = () => !!run;
  A.adv.isDaily = () => !!(run && run.board);

  function toolMax(id) { const t = run.tools[id]; if (!t) return 0; const plus = perkList().reduce((n, p) => n + (p.toolBonus || 0), 0) + (run.sup && run.sup.kit ? 1 : 0); return t.max + plus; }
  function addTool(id) { const t = run.tools[id]; if (t) t.max++; else run.tools[id] = { max: TOOLS[id].uses, left: TOOLS[id].uses }; }
  function refillTools() { for (const id in run.tools) run.tools[id].left = toolMax(id); }

  /* ---------------- ronda ---------------- */
  /* el pais siempre a la vista: si el lugar no tiene pais (mares, desiertos, cordilleras...), se muestra su continente */
  const withSub = q => { if (q.t === "p" && !q.clue && !(q.sub && (q.sub.en || q.sub.es))) { const c = CONT[continentOf(q)]; if (c) q.sub = { es: c.es, en: c.en }; } return q; };
  /* v0.20: 3 faciles, 1 media y 1 dificil de las franjas de la ronda (ver bandsOf/takeFrom), en orden barajado; al reanudar, las mismas de antes.
     v0.74: las franjas son relativas a la ventana de dificultad de la Ascension y la ronda (ver diffAt) */
  const QV = 3;                                                      // version del sorteo: una partida guardada con el criterio de antes (v0.19-v0.73: franjas fijas) no reutiliza sus preguntas al reanudar
  const ctxOf = (pos, usedIds, topic) => { const all = allQ(), ctx = { used: new Set(usedIds), names: new Set(), topic: topic === "mixed" ? null : topic }; usedIds.forEach(id => all[id] && nameKeys(all[id]).forEach(k => ctx.names.add(k))); return ctx; };
  function drawRound(pos, attempt, usedIds, n = 5) {                 // n preguntas de la ronda de la posicion pos (0-11, y la Leyenda): 3 faciles, 1 media y 1 dificil, en orden barajado
    const slot = slotOf(pos), B = bandsOf(slot, pos), rr = A.rng(`${run.seed}:q:${pos}:${attempt}`), ctx = ctxOf(pos, usedIds, B.topic), taken = [];
    for (const b of [B.bands[2], B.bands[1], B.bands[0]]) takeFrom(b, Math.round(b.n * n / 5), rr, taken, ctx, b.k === "h" ? B.tail : null);   // primero la dificil y la media: las faciles tienen mas donde elegir
    for (const b of B.bands) if (taken.length < n) takeFrom(b, n - taken.length, rr, taken, ctx, null);   // franja corta: se completa con las otras
    return rr.shuffle(taken).slice(0, n);
  }
  /* Reto diario: "ya preguntado" sale solo de la semilla (los primeros intentos de las rondas anteriores y los intentos previos de esta), nunca de lo que haya hecho
     cada jugador (reintentos, Carta de cambio): asi todos ven las mismas preguntas en el mismo intento */
  let DU = { seed: null, memo: {} };
  function dailyUsed(pos) {
    if (DU.seed !== run.seed) DU = { seed: run.seed, memo: {} };
    if (DU.memo[pos]) return DU.memo[pos];
    const prev = pos > 0 ? dailyUsed(pos - 1) : [];
    return (DU.memo[pos] = pos > 0 ? prev.concat(drawRound(pos - 1, 0, prev).map(q => q.cid[0])) : []);
  }
  /* As en la manga (tanda 5): el 6.o lugar, de la franja DIFICIL del tema, con su propia sub-semilla (":manga"): las 5 de siempre no cambian */
  function drawExtra(pos, attempt, usedIds) {
    const slot = slotOf(pos), B = bandsOf(slot, pos), rr = A.rng(`${run.seed}:q:${pos}:${attempt}:manga`), ctx = ctxOf(pos, usedIds, B.topic), taken = [];
    takeFrom(B.bands[2], 1, rr, taken, ctx, B.tail);
    for (const b of B.bands) if (!taken.length) takeFrom(b, 1, rr, taken, ctx, null);
    return taken.slice(0, 1);
  }
  /* Pregunta trampa (tanda 15): de las 3 faciles de la ronda, 1 o 2 se cambian por otra de una franja mas dura del mismo tema (nv1 2/2/1, nv2 2/1/2, nv3 1/2/2).
     Las 5 de siempre salen igual (drawRound no se toca): lo que cambia sale de su propia sub-semilla ":trap", y la que entra lleva q.trap = true (esquina roja y sello) */
  function applyTrap(out, pos, attempt, used, lv) {
    const t = A.chal.par({ id: "trap", lv }), B = bandsOf(slotOf(pos), pos), rr = A.rng(`${run.seed}:q:${pos}:${attempt}:trap`);
    const idx = rr.shuffle(out.map((q, i) => ({ i, p: B.pct(q) == null ? 1 : B.pct(q) })).sort((x, y) => x.p - y.p).slice(0, 3).map(x => x.i)), want = [].concat(t.med ? [1] : [], t.hard ? [2] : []);
    want.forEach((band, j) => {
      if (j >= idx.length) return;
      const got = takeFrom(B.bands[band], 1, rr, out.filter((q, i) => i !== idx[j]), ctxOf(pos, used.concat(out.map(q => q.cid[0])), B.topic), band === 2 ? B.tail : null);
      if (got[0]) out[idx[j]] = { ...got[0], trap: true };
    });
    return out;
  }
  A.adv._bandIdx = cid => { const pos = roundNo(), B = bandsOf(slotOf(pos), pos), q = allQ()[cid]; return q && B.pct(q) != null ? B.cls(q) : 0; };   // para las pruebas: 0 facil, 1 media, 2 dificil (relativas a la ventana de esta Ascension y ronda)
  A.adv._diff = cid => { const q = allQ()[cid]; return q ? diffOf(q, ROUND_THEME[slotOf(roundNo())]) : 50; };   // la dificultad 0-100 de una pregunta (A.QDIFF), para el bot
  A.adv._allQ = allQ;                                                // para las pruebas: cid -> pregunta
  A.adv.diffAt = diffAt;                                             // D(Ascension, ronda) de 0 a 1
  function pickQuestions(n, keep, chal) {
    const all = allQ();
    if (keep && run.qv === QV && run.curQ && run.curQ.length === n && run.curQ.every(id => all[id])) { run.used = run.used.concat(run.curQ.filter(id => !run.used.includes(id))); return run.curQ.map(id => { const q = withSub({ ...all[id] }); if (run.trap && run.trap.includes(id)) q.trap = true; return q; }); }
    const pos = roundNo();
    let used = run.used;
    if (run.board) { used = dailyUsed(pos); for (let a = 0; a < run.attempt; a++) used = used.concat(drawRound(pos, a, used, Math.min(n, 5)).map(q => q.cid[0])); }
    const out = drawRound(pos, run.attempt, used, Math.min(n, 5)), tp = !run.inf && chal && chal.find(c => c.id === "trap");
    if (tp) applyTrap(out, pos, run.attempt, used, tp.lv || 1);
    run.trap = out.filter(q => q.trap).map(q => q.cid[0]);
    if (n > 5) out.push(...drawExtra(pos, run.attempt, used.concat(out.map(q => q.cid[0]))));   // la 6.a, la ultima
    run.qv = QV; run.curQ = out.map(q => q.cid[0]); run.used = run.used.concat(run.curQ);
    return out.map(q => withSub({ ...q }));
  }
  function roundLevel(keep) {
    const r = roundNo(), boss = isBoss(), def = rdef(), cf = chalFor(r), halve = 1;
    const ctx = { seconds: clamp(Math.round(26 - 1.0 * r + ascFx(run.asc).secs), 10, 28), target: 1 };
    perkList().forEach(p => p.round && p.round(ctx, run)); ctx.target = Math.max(0.85, ctx.target);
    if (run.sup && run.sup.cafe) ctx.seconds += 4;                                       // suministro: Cafe doble
    { const cr = casOf(r); if (cr && cr.secs && cr.att === (run.attempt || 0)) ctx.seconds += cr.secs; }   // Ruleta de premios: Reloj corto
    ctx.seconds = Math.max(6, ctx.seconds);
    run.chal = cf.list; run.chalName = cf.combo ? cf.combo.n : null; run.chalHalve = halve; run.chalKey = cf.boss && cf.combo ? cf.combo.k : null; run.chalDesc = cf.boss && cf.combo ? cf.combo.d : null;
    run.duel = !run.inf && run.chalKey === "duel" ? mkDuel(roundTarget()) : null;   // tanda 16: Duelo con la banca
    const rules = cf.list.map(c => (c.id === "storm" ? "clock" : c.id)).filter(id => ["wind", "clock", "silence"].includes(id)), st = cf.list.find(c => c.id === "storm");
    if (st) ctx.seconds = Math.max(6, Math.round(ctx.seconds * [0.75, 0.65, 0.55][clamp((st.lv || 1) - 1, 0, 2)]));   // Contrarreloj (tanda 6): 0,75 / 0,65 / 0,55 del tiempo
    run.boss = rules; run.wind = null;
    if (rules.includes("wind")) { const wr = A.rng(`${run.seed}:wind:${r}:${run.attempt}`); run.wind = { brg: Math.round(wr() * 360), km: Math.round((160 + 40 * run.act) * halve) }; }
    run.qn = has("sleeve") && !run.inf ? 6 : 5;
    const qs = pickQuestions(run.qn, keep, cf.list), info = actInfo(run.act), tn = TOPIC_NAMES[def.topic][Math.min(def.tier, TOPIC_NAMES[def.topic].length - 1)];
    run.topic = def.topic; run.tier = def.tier;
    if (!(keep && run.split && run.split.key === tgtKey())) {           // Dividir (tanda 12b): la alternativa de la pregunta dificil
      run.split = null;
      if (has("split") && !run.inf) {
        const pos = roundNo(), B = bandsOf(slotOf(pos), pos), hi = qs.reduce((m, q, i) => (i < 5 && B.pct(q) != null && (m < 0 || B.pct(q) > B.pct(qs[m])) ? i : m), -1);
        if (hi >= 0) { const t = []; takeFrom(B.bands[2], 1, A.rng(`${run.seed}:alt:${pos}:${run.attempt || 0}`), t, ctxOf(pos, run.used, B.topic), B.tail); if (t[0]) run.split = { key: tgtKey(), qi: hi, alt: t[0].cid[0], used: false }; }
      }
    }
    return {
      name: `${A.tx(info.n)} · ${boss ? A.T("Jefe", "Boss") : A.tf("Ronda {n}/3", "Round {n}/3", { n: run.round + 1 })}`, topicName: tn, topic: def.topic, kind: "adventure", boss: !!boss,
      seconds: ctx.seconds, advance: roundTarget(), maxPerQ: 1400, bonus: false, plainName: true, questions: () => qs,
      score: (q, km, left) => A.adv.score(q, km, left, true).sc,
    };
  }
  function startRound(keep) {
    run.phase = "round";
    if (!keep) { run.qPts = []; run.qi = 0; run.luckUsed = false; run.guardUsed = false; run.rTools = 0; run.rBulls = 0; run.leftSum = 0; run.roundScore = 0; run.rGood = 0; run.streak = 0; run.calmOn = false; refillTools(); }
    const Lv = roundLevel(keep), S = C().S;
    S.run = run; S.camp = { id: "adv", mode: "adventure", title: { es: "Aventura", en: "Adventure" }, home: { lat: 20, lon: 10, zoom: 1 }, levels: [Lv] };
    S.runTotal = run.score; S.runMax = 0; C().map.setHome(S.camp.home); C().map.setStyle(mapStyleFor());
    A.dealer.enable(true); if (run.duel) run.duel.n = keep ? run.qi : 0;
    A.chal.begin(run.chal, A.chal.fx(amuPerks()), { seed: run.seed, round: roundNo(), halve: run.chalHalve, boss: run.chalKey, asc: run.asc, topic: run.topic, cjk: run.cjk });
    persist(); A.ach.emit("adv", { kind: "round", act: run.act }); C().startLevel(0);
    if (keep) { S.qi = run.qi; S.levelScore = run.roundScore; S.streak = run.streak || 0; S.hits = run.rGood; C().updateHud && C().updateHud(); }
    if (Lv.boss) setTimeout(() => A.sfx.boss(), 200);
  }
  /* ---------------- modo infinito: tras la ronda 12, ya no hay mas rondas numeradas ni campamento ---------------- */
  function infPool() {                                                 // todo el banco de lugares, de todos los temas, sin repetir
    const P = pools(), seen = new Set(), out = [];
    Object.keys(P).forEach(k => P[k].forEach(q => { if (!seen.has(q.cid[0])) { seen.add(q.cid[0]); out.push(q); } }));
    return out;
  }
  function infBatch(n) {                                                // la tanda n sale siempre igual de la semilla: reanudar no rebaraja el carrete (ni deja cambiar una pregunta dificil saliendo y volviendo; ni rompe el Reto diario)
    const rr = A.rng(`${run.seed}:inf:${n}`);
    return rr.shuffle(infPool()).map(q => withSub({ ...q }));
  }
  function infiniteLevel() {
    const N = Math.max(2, run.infN || 0), qs = []; for (let i = 1; i <= N; i++) qs.push(...infBatch(i)); run.infN = N;                     // dos barajadas del banco entero: de sobra para una sesion normal (se rellena sola si hace falta)
    return {
      name: A.T("Modo infinito", "Infinite mode"), topicName: A.T("Preguntas sin parar", "Nonstop questions"), topic: "mixed", kind: "adventure", boss: false,
      seconds: run.infSeconds, advance: 1, maxPerQ: 1400, bonus: false, plainName: true, questions: () => qs,
      score: (q, km, left) => A.adv.score(q, km, left, true).sc,
    };
  }
  function startInfinite(keep) {
    run.inf = true; run.phase = "round"; run.topic = "mixed"; run.tier = 2; run.chal = []; run.chalName = null; run.chalHalve = 1; run.boss = []; run.wind = null;
    if (!keep) { run.infN = 0; run.infOver = false; run.infSeconds = 12; run.qi = 0; run.luckUsed = false; run.guardUsed = false; run.rTools = 0; run.rBulls = 0; run.leftSum = 0; run.roundScore = 0; run.rGood = 0; run.streak = 0; refillTools(); }
    const Lv = infiniteLevel(), S = C().S;
    S.run = run; S.camp = { id: "adv", mode: "adventure", title: { es: "Aventura", en: "Adventure" }, home: { lat: 20, lon: 10, zoom: 1 }, levels: [Lv] };
    S.runTotal = run.score; S.runMax = 0; C().map.setHome(S.camp.home); C().map.setStyle(mapStyleFor());
    A.dealer.enable(true); A.chal.begin([], A.chal.fx(perkList()), { seed: run.seed, round: roundNo(), halve: 1 });
    persist(); A.ach.emit("adv", { kind: "round", act: run.act }); C().startLevel(0);
    if (keep) { S.qi = run.qi; S.levelScore = run.roundScore; S.streak = run.streak || 0; S.hits = run.rGood; C().updateHud && C().updateHud(); }
  }
  A.adv.startInfinite = startInfinite;
  A.adv.isInfinite = () => !!(run && run.inf);
  A.adv.infDone = () => !!(run && run.inf && run.infOver);
  function mapStyleFor() { return A.MAPSTYLES[A.skin] || A.MAPSTYLES.casino; }
  const DIRS16 = [["N", "N"], ["NNE", "NNE"], ["NE", "NE"], ["ENE", "ENE"], ["E", "E"], ["ESE", "ESE"], ["SE", "SE"], ["SSE", "SSE"], ["S", "S"], ["SSW", "SSO"], ["SW", "SO"], ["WSW", "OSO"], ["W", "O"], ["WNW", "ONO"], ["NW", "NO"], ["NNW", "NNO"]];
  const dirName = brg => { const idx = Math.round((((brg % 360) + 360) % 360) / 22.5) % 16, d = has("compass16") ? DIRS16[idx] : DIRS16[Math.round(idx / 2) % 8 * 2]; return A.lang === "es" ? d[1] : d[0]; };
  /* en el Reto diario, la etiqueta del acto dice en que intento vas (en lugar del subtitulo del acto) */
  const dailyLbl = k => A.pick6("Reto diario {k}/3|Daily {k}/3|Défi quotidien {k}/3|Desafio diário {k}/3|Tagesherausforderung {k}/3|Sfida giornaliera {k}/3||每日挑战 {k}/3|일일 도전 {k}/3|デイリーチャレンジ {k}/3|Испытание дня {k}/3|Wyzwanie dnia {k}/3").replace("{k}", k);
  const actSub = info => (run && run.board && run.dailyTry ? dailyLbl(run.dailyTry) : A.tx(info.t));
  /* tanda 16: DUELO CON LA BANCA. El objetivo de la ronda es la puntuacion del crupier, repartida en sus 5 respuestas (suman EXACTAMENTE el objetivo). Su chincheta cae
     despues de la tuya: la distancia sale de lo que puntua (como la tuya) y el rumbo, de la semilla. No cambia el equilibrio: solo como se ve */
  const mkDuel = T => {
    const rr = A.rng(`${run.seed}:duels:${roundNo()}`), w = Array.from({ length: 5 }, () => 0.55 + rr() * 0.9), sw = w.reduce((a, b) => a + b, 0), s = w.map(x => Math.round(T * x / sw)), sum = () => s.reduce((a, b) => a + b, 0);
    for (let k = 0; k < 6; k++) { const over = s.map((x, i) => (x > 1350 ? i : -1)).filter(i => i >= 0); if (!over.length) break; let ex = 0; over.forEach(i => { ex += s[i] - 1350; s[i] = 1350; }); const rest = s.map((_, i) => i).filter(i => !over.includes(i)); rest.forEach(i => { s[i] += Math.round(ex / rest.length); }); }
    s[4] += T - sum(); return { s, n: 0, T };
  };
  const bankMove = (res, i) => {
    const d = run.duel, o = res.o; if (!d || !o || i < 0 || i > 4) return null; const s = d.s[i] || 0, r = roundNo(), rr = A.rng(`${run.seed}:duelp:${r}:${i}`);
    const scale = clamp(1500 * Math.pow(0.97, r), 300, 1500) * kf(o), dist = clamp(s / 1.2, 20, 1000), km = Math.min(5000, -scale * Math.log(dist / 1000));
    let lat = o.lat, lon = o.lon; if (o.t === "c") { const f = C().world.byName[o.key]; if (!f) return null; const big = f.polys.reduce((a, b) => ((b.bbox[2] - b.bbox[0]) * (b.bbox[3] - b.bbox[1]) > (a.bbox[2] - a.bbox[0]) * (a.bbox[3] - a.bbox[1]) ? b : a)); lon = (big.bbox[0] + big.bbox[2]) / 2; lat = (big.bbox[1] + big.bbox[3]) / 2; }
    const brg = rr() * Math.PI * 2, dd = km / 6371, la1 = lat * Math.PI / 180, lo1 = lon * Math.PI / 180, la2 = Math.asin(Math.sin(la1) * Math.cos(dd) + Math.cos(la1) * Math.sin(dd) * Math.cos(brg)), lo2 = lo1 + Math.atan2(Math.sin(brg) * Math.sin(dd) * Math.cos(la1), Math.cos(dd) - Math.sin(la1) * Math.sin(la2));
    const wrap = x => ((x + 540) % 360) - 180;
    return { s, n: i, pt: [wrap(lo2 * 180 / Math.PI), clamp(la2 * 180 / Math.PI, -70, 78)], sum: d.s.slice(0, i + 1).reduce((a, b) => a + b, 0) };
  };
  A.adv.duelHud = () => { const d = run && run.duel && !run.inf ? run.duel : null; if (!d) return null; const bank = d.s.slice(0, d.n || 0).reduce((a, b) => a + b, 0); return { bank, pct: Math.min(100, 100 * bank / Math.max(1, d.T)) }; };
  A.adv.introHtml = Lv => {
    if (run.inf) {
      return `<div class="intro-in adv"><div class="intro-left"><div class="intro-num blind">${A.blind("small", "s_compass")}</div><div class="intro-body">
        <span class="tag">${A.tx(actInfo(run.act).n)} · ${A.T("Modo infinito", "Infinite mode")}</span><h2>${A.tx(Lv.topicName)}</h2>
        <p class="intro-sub">${A.T("De todo tipo: mapas, países, monumentos, historia… Cada pregunta, menos tiempo.", "Every kind of question: maps, countries, landmarks, history… Less time on every question.")}</p>
        <p class="adv-goal">${A.fmt1(Lv.seconds)} s</p></div></div>
        <div class="intro-art">${A.pic("topic_mixed")}<div class="intro-dealer" id="introDealer"></div></div></div>`;
    }
    const info = actInfo(run.act), def = rdef(), list = run.chal || [];
    /* territorio nuevo: una ronda mas alla de tu mejor ronda de siempre (desde la 2.a expedicion, una vez por expedicion): sello "Nuevo" y el crupier lo dice */
    const Pv = A.profile.get(); run._virgin = !run.attempt && (Pv.adv.runs || 0) >= 2 && roundNo() + 1 > (Pv.adv.bestRound || 0) && !run.virginShown; if (run._virgin) run.virginShown = true;
    const NEW = A.pick6("Nuevo|New|Nouveau|Novo|Neu|Nuovo||新领域|새 영역|未踏|Впервые|Nowe");
    const chips = list.map(c => { if (c.hid && !c.up) return `<div class="adv-debuff k-rule"><span>${ic(BOSS_IC)}</span><div><b>${A.tx(A.chal.tl("ui_faceDown"))}</b><i>${A.tx(A.chal.tl(run.chalKey === "collector" ? "ui_faceDownColl" : "ui_faceDownWheel"))}</i></div></div>`; const d = A.CHAL[c.id]; return `<div class="adv-debuff k-${d.kind}"><span>${ic(d.ico)}</span><div><b>${A.tx(d.n)}${c.isNew ? ` <span class="ch-new">${A.tx(A.chal.NEW_TAG)}</span>` : ""} <i class="ch-lv">${"●".repeat(c.lv || 1)}</i></b><i>${A.tx(d.d)}</i>${c.id === "wind" && run.wind ? `<em>${A.T("Viento hacia", "Wind toward")} ${dirName(run.wind.brg)} · ${A.fmtDist(run.wind.km)}</em>` : ""}</div></div>`; }).join("");
    const kind = Lv.boss ? "boss" : run.round === 0 ? "small" : "big", inner = Lv.boss ? BOSS_IC : run.round === 0 ? "s_pin" : "s_compass";
    return `<div class="intro-in adv${Lv.boss ? " is-boss" : ""}"><div class="intro-left"><div class="intro-num blind">${A.blind(kind, inner)}</div><div class="intro-body">
      <span class="tag">${A.tx(info.n)} · ${actSub(info)}</span><h2>${A.tx(Lv.topicName)}</h2>
      ${Lv.boss && run.chalName ? `<p class="boss-combo">${A.tx(run.chalName)}</p>` : ""}${Lv.boss && run.chalDesc && run.chalDesc.es ? `<p class="boss-d">${A.tx(run.chalDesc)}</p>` : ""}
      <p class="intro-sub">${Lv.boss ? A.T("Jefe del acto", "Act boss") : A.T("Ronda", "Round") + " " + (run.round + 1)} · ${A.tx(info.f)}${run._virgin ? ` <b class="intro-new">${NEW}</b>` : ""}</p>
      <p class="adv-goal">${A.T("Objetivo", "Target")} ${!run.inf && baseTarget() > Lv.advance ? `<s class="of-was">${A.fmt(baseTarget())}</s> ` : ""}<b>${A.fmt(Lv.advance)}</b> · ${run.qn} ${A.T("lugares", "places")}${run.qn > 5 ? " · " + A.tx(BEST5) : ""} · ${Lv.seconds} s</p>
      ${list.length ? `<h4 class="adv-chal-h">${A.T("El crupier toca la mesa", "The dealer touches the table")}</h4>` : ""}${chips}</div></div>
      <div class="intro-art">${A.pic("topic_" + def.topic)}<div class="intro-dealer" id="introDealer"></div></div></div>`;
  };
  /* el crupier habla en la intro: lo que toca segun el momento de la expedicion (primera, revancha, reanudada, reintento, nuevo acto, jefe...)
     + una frase por reto (y protesta si ya llevas el perk que lo anula). El guion vive en js/dealer.js (D.introSeq). */
  let resumedIntro = false;                                           // la proxima intro es la primera tras reanudar una partida guardada
  A.adv.introReady = (Lv, talked) => {                                // talked: avisa cuando el crupier ha acabado de hablar (con su segundo de mas)
    const host = $("introDealer"); if (!host || !run) return 0; const D = A.dealer, list = (run.chal || []).filter(c => !c.hid || c.up);   // las fichas boca abajo no se anuncian
    D.enable(true); D.dock(host);
    const counters = list.some(c => (A.CHAL[c.id].counters || []).some(id => owned(id)));
    const seq = D.introSeq({
      boss: !!Lv.boss, last: roundNo() === 11, inf: !!run.inf, fresh: run.act === 0 && run.round === 0 && !run.qTotal && !run.attempt, resumed: resumedIntro, ranked: !!run.ranked,
      dailyTry: run.dailyTry || 0, dailyTotal: run.board && run.dailyTry ? A.rank.daily.get(run.board).total : 0,
      act: run.act, round: run.round, attempt: run.attempt, lives: run.lives, chal: list.slice(0, Lv.boss ? 3 : 2).map(c => c.id), form: list.slice(0, Lv.boss ? 3 : 2).map(c => A.chal.formOf(c)), isNew: list.slice(0, Lv.boss ? 3 : 2).map(c => !!c.isNew), counters,
      rn: roundNo() + 1, bossName: Lv.boss && run.chalName ? A.tx(run.chalName) : "", bossKey: Lv.boss ? run.chalKey : null, virgin: !!run._virgin,
    });
    resumedIntro = false;
    D.sequence(seq, talked); return seq.reduce((n, it) => n + A.tx(it.line).length * 40 + 900 + D.LINGER, 0);   // cada frase, con su segundo de mas
  };
  A.adv.introEnd = () => { A.dealer.dock(null); A.dealer.release(); };   // si saltas la intro a media frase, la termina en la esquina y se va (sin decir el resto)

  /* ---------------- puntuacion de una pregunta ---------------- */
  A.adv.score = function (o, km, left, noSide) {
    const Lv = C().S.camp.levels[0], limit = C().S.limit || Lv.seconds, halve = 1, boss = run.boss || [], S = C().S;
    const r = roundNo(), c = {
      o, km, left, limit, kind: o.kind || (o.clue ? "clue" : "place"), topic: o.topic || "mixed", cont: continentOf(o), coins: 0, lines: [], xmult: 1, mult: 1, streakStep: 0.2,
      scale: clamp(1500 * Math.pow(0.97, r), 300, 1500) * kf(o),   // v0.20: el margen se estrecha un 3 % por ronda (antes 6 %)
    };
    perkList().forEach(p => p.q && p.q(c, run));
    if (km != null) perkList().forEach(p => p.km && p.km(c, run));
    let dist = km == null ? 0 : Math.round(1000 * Math.exp(-c.km / c.scale));
    const time = km == null ? 0 : Math.round(400 * Math.max(0, left / limit) * (0.3 + 0.7 * dist / 1000));
    c.dist = dist; c.time = time; c.chips = dist + time;
    /* acierto (racha, bandera): dentro de los 300 km de la Enciclopedia (x2 en mares y naturaleza), el anillo exterior; no un porcentaje de los puntos */
    const lim0 = (A.codexLimits && o.cid ? A.codexLimits({ id: o.cid[0], cids: o.cid }) : [300, 150, 75])[0];
    c.hit = km != null && c.km <= lim0;
    const manga = has("sleeve") && !run.inf && run.qi === 5; let streak = c.hit ? S.streak + 1 : 0, guarded = false;
    if (manga) streak = S.streak;                                     // As en la manga: la 6.a ni alarga ni corta la racha
    const gN = sumFlag("guard");                                       // Guardarrachas: los 2 primeros fallos de la ronda no cortan la racha (tampoco el tiempo agotado)
    if (!c.hit && !manga && S.streak > 0 && gN && !run.inf && (+run.guardUsed || 0) < gN) { streak = S.streak; guarded = true; if (!noSide) { run.guardUsed = (+run.guardUsed || 0) + 1; setTimeout(() => A.adv.flash("streakguard", 2, "✓"), 450); } c.lines.push(["streakguard", A.tx(A.RELICS.streakguard.n), "✓"]); }
    if (!noSide && !run.inf && streak === 2 && S.streak === 1 && has("calm") && run.qi < (run.qn || 5) - 1 && (run.chal || []).some(c2 => (perkList().find(p => p.calm) || {}).calm.includes((A.CHAL[c2.id] || {}).fam))) setTimeout(() => { A.adv.flash("coolhead", 1, "❄"); if (A.sfx.ice) A.sfx.ice(); }, 500);   // Sangre fria: la siguiente, en frio
    c.streak = streak; c.mult = guarded || manga ? 1 : 1 + (streak >= 2 ? Math.min(1.5, c.streakStep * (streak - 1)) : 0);   // la respuesta salvada puntua x1
    c.qi = run.qi;
    if (km != null) perkList().forEach(p => { if (!p.post) return; const tx = p.post(c, run); if (tx) { c.lines.push([p.ico, A.tx(p.n), tx]); if (!noSide) A.adv.flash(p.id, 0, tx); } });
    c.total = km == null ? 0 : Math.round(c.chips * c.mult * c.xmult);
    if (!noSide && !run.inf) { run.qPts = run.qPts || []; run.qPts[c.qi] = c.total; }
    if (manga) {                                                       // suma solo lo que mejora a tu peor respuesta de las 5: la ronda vale tus 5 mejores
      const prev = (run.qPts || []).slice(0, 5), worst = prev.length ? Math.min(...prev) : 0, raw = c.total; c.total = Math.max(0, raw - worst);
      c.lines.push(["sleeve", A.tx(A.RELICS.sleeve.n), raw > worst ? "−" + A.fmt(worst) : "="]);
      if (!noSide) setTimeout(() => { if (raw > worst) { A.adv.flash("sleeve", 2, "+" + A.fmt(raw - worst)); A.sfx.jackpot(2); } else A.adv.flash("sleeve", 0, "="); }, 450);
    }
    if (!noSide && c.hit && run.ballSaved && run.ballSaved[qKey()]) { run.ballSaved[qKey()] = 0; setTimeout(() => { A.adv.flash("reball", 2, "✓"); A.sfx.jackpot(2); }, 450); }   // la segunda bola acerto
    c.coinsBase = km == null ? 0 : dist >= 960 ? 1 : 0;                         // solo las dianas dan doblon
    c.coins += c.coinsBase; c.coins = gain(c.coins);
    c.sc = { dist, time, distMax: 1000, timeMax: 400 };
    return c;
  };
  let reactT = 0, abSwapped = false;                                                     // reaccion pendiente del crupier a la ultima respuesta
  A.adv.afterQuestion = function (res) {
    clearTimers();
    { const S0 = C().S, q0 = S0.qs && S0.qs[S0.qi]; A.adv.countSeen(q0, run.topic === "flag" ? "flag" : q0 && q0.topic); }   // v0.20: veces que ha salido cada pregunta
    run.coins += res.coins; run.stats.coinsEarned += res.coins; if (res.dist >= 960) { run.stats.bulls++; run.rBulls = (run.rBulls || 0) + 1; } run.stats.best = Math.max(run.stats.best, res.total);
    if (res.dist >= 750) run.rGood++; run.leftSum += Math.max(0, res.left || 0); run.roundScore += res.total; run.qTotal++;
    const prevStreak = run.streak || 0, prevScore = run.roundScore - res.total, goalLv = C().S.camp && C().S.camp.levels && C().S.camp.levels[0];
    run.streak = res.streak || 0; run.qi++; run.qTools = 0;
    if (run.duel && !run.inf) { run.duel.n = run.qi; res.bank = bankMove(res, run.qi - 1); }   // tanda 16: la banca responde despues que tu
    if (run.inf && !run.infOver) {
      const S = C().S, Lv = S.camp.levels[0];
      Lv.seconds = Math.max(3, Math.round((Lv.seconds - 0.2) * 10) / 10); run.infSeconds = Lv.seconds;
      if (S.qs.length - S.qi < 60) S.qs.push(...infBatch(run.infN = (run.infN || 2) + 1));                        // se acerca el final del carrete: se rellena antes de que se note
      const failed = res.km == null || res.dist < 400;
      if (failed) {
        const insured = !!(run.sup && run.sup.seguro), shielded = insured || (has("shieldAct") && run.shieldAct !== run.act);
        if (shielded && !insured) run.shieldAct = run.act; else { run.lives--; run.livesLostAct++; }
        if (run.lives <= 0) run.infOver = true;                                     // se acaban las provisiones: la siguiente pantalla cobra la expedicion
      }
    }
    persist(); A.ach.emit("casino", { kind: "hold", coins: run.coins }); A.ach.emit("adv", { kind: "hold", coins: run.coins, perks: run.perks.length, inf: run.inf ? run.qi : 0 });   // inf: preguntas aguantadas en el modo infinito
    const kind = res.km == null ? "timeout" : res.dist >= 960 ? "bull" : res.dist < 400 ? "miss" : res.streak >= 3 ? "streak" : res.dist >= 750 ? "good" : null;
    const qAt = C().S.qi, still = () => { const S2 = C().S; return !!run && S2.qi === qAt && S2.phase === "reveal"; };   // pasaste a la siguiente: ya no la comenta
    /* lo que el crupier sabe de esta respuesta: el lugar, tu mano de verdad y si es "ese sitio otra vez" (js/dealer.js) */
    const oq = C().S.qs[qAt], info = { valid: still, km: res.km, dist: res.dist, hand: res.hand || null, chal: (run.chal || []).map(c => c.id), rk: run.act + ":" + run.round + ":" + (run.attempt || 0),
      place: oq ? A.tx(oq.clue ? oq.answer : oq.name) : "", key: oq ? (oq.cid ? oq.cid[0] : oq.key || (oq.name && (oq.name.en || oq.name.es))) : "",
      dwell: A.dealer.trackEnd ? A.dealer.trackEnd() : 0, streakEnd: prevStreak >= 5 && !run.streak ? prevStreak : 0,
      goal: !run.inf && !!goalLv && prevScore < goalLv.advance && run.roundScore >= goalLv.advance && run.qi < run.qn };
    /* en que pais cayo tu pin y cual se buscaba; y si picaste en una chincheta trampa (solo para lo que dice el crupier) */
    const g = res.guess, P0 = A.pointer;
    if (g && res.km != null && P0 && P0.countryAt) { info.pinC = P0.countryAt(g.lon, g.lat); info.tgtC = oq && oq.t === "c" ? A.tx(oq.clue ? oq.answer : oq.name) : oq ? P0.countryAt(oq.lon, oq.lat) : ""; }
    const dcs = C().map && C().map.decoys; if (g && dcs && dcs.length && res.dist < 750) info.decoy = dcs.some(d => A.geo.haversine(g.lat, g.lon, d.lat, d.lon) < 90);   // v0.52: las chinchetas caen en cualquier sitio, tambien junto al bueno: solo si fallaste
    if (A.dealer.noteAnswer) A.dealer.noteAnswer(info);
    clearTimeout(reactT); reactT = setTimeout(() => { if (still()) A.dealer.react(kind || "quiet", info); }, 1300);
  };

  /* ---------------- pistas gratis de reliquias ---------------- */
  let timers = [];
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  let NE_BY_EN = null;                                               // nombre ingles (Wikipedia/Wikidata) -> nombre del mapa (Natural Earth)
  const neOf = nameEn => {
    const W = C().world.byName; if (!nameEn) return null; if (W[nameEn]) return nameEn;
    if (!NE_BY_EN) { NE_BY_EN = {}; (A.PLACES || []).forEach(r => { if (r[1] === "country") NE_BY_EN[r[6].en] = r[0].slice(2); }); }
    const ne = NE_BY_EN[nameEn] || (A.CODEX_COUNTRY || {})[nameEn]; return ne && W[ne] ? ne : null;
  };
  function revealCountry(o) {
    if (o.t === "c") { noteH(A.T("Continente: ", "Continent: ") + continentName(o), "passport"); return; }
    const ne = o.clue ? null : (o.cEn && o.cEn.length ? o.cEn : [o.sub && o.sub.en]).map(neOf).find(Boolean);   // lugares con dos paises: el primero que exista en el mapa; en las pistas, solo el continente (como antes)
    if (ne && C().world.byName[ne]) { C().map.setMarks({ highlight: ne }); noteH(A.tx(o.sub), "passport"); }
    else noteH(A.T("Continente: ", "Continent: ") + continentName(o), "passport");
  }
  /* nota de campo sin chivatazos (Libro de la casa y Nota del crupier). En las banderas la nota del pais nombra su capital, gentilicios... y en las
     pistas, la respuesta: alli solo dice la region del pais (las 31 familias de la Enciclopedia, js/codex.js) o, si no tiene, su continente.
     Si el nombre de la familia dice el pais o la respuesta en algun idioma ("Italia y Malta", "United States, Canada & Greenland", "Iran y Asia
     Central"...), la region es el continente ("Region: Europa": la carta promete la region y la cumple). Con la Adivinanza, la nota sale tapada
     igual que la placa (antes la resolvia al instante) */
  const REGION = "Región: {r}|Region: {r}|Région : {r}|Região: {r}|Region: {r}|Regione: {r}||地区：{r}|지역: {r}|地域：{r}|Регион: {r}|Region: {r}";
  const foldTx = s => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC").toLowerCase();   // NFC: sin recomponer, el hangul se quedaba en jamo
  const CJK_RE = /[\u1100-\u11ff\u3040-\u30ff\u3130-\u318f\u3400-\u9fff\uac00-\ud7af]/;
  const saysWord = (txt, w) => (CJK_RE.test(w) ? w.length >= 2 && txt.includes(w) : w.length >= 4 && new RegExp("(^|[^\\p{L}\\p{N}])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^\\p{L}\\p{N}])", "u").test(txt));
  const famSays = (fam, N) => { const R = A.L6(fam); return Object.keys(N).some(l => R[l] && N[l].some(n => foldTx(n).split(/[\s,.()'’-]+/).some(w => saysWord(foldTx(R[l]), w)))); };
  const regionNote = o => {
    const ne = o.t === "c" ? o.key : (o.cEn || []).map(neOf).find(Boolean), fam = ne && A.codex && A.codex.regionNames ? A.codex.regionNames(ne) : "", N = {};
    Object.entries((o.clue ? o.answer : o.name) || {}).concat((o.cEn || []).map(n => ["en", n])).forEach(([l, n]) => { if (n) (N[l] = N[l] || []).push(n); });   // la respuesta y el pais, en cada idioma
    return A.pick6(REGION).replace("{r}", fam && !famSays(fam, N) ? A.pick6(fam) : continentName(o));
  };
  /* Soplo del crupier (tanda 10): en que mitad del pais esta el lugar, segun el eje largo del poligono donde esta (con Sin pais, sin nombrarlo);
     en las pistas, la region. En banderas y paises no dice nada (la tienda ya no lo ofrece si solo quedan esas rondas) */
  const HALF = { N: L6("Mitad norte de {c}|Northern half of {c}|Moitié nord : {c}|Metade norte de {c}|Nördliche Hälfte von {c}|Metà nord di {c}||{c}的北半部|{c}의 북쪽 절반|{c}の北半分|Северная половина: {c}|Północna połowa: {c}"), S: L6("Mitad sur de {c}|Southern half of {c}|Moitié sud : {c}|Metade sul de {c}|Südliche Hälfte von {c}|Metà sud di {c}||{c}的南半部|{c}의 남쪽 절반|{c}の南半分|Южная половина: {c}|Południowa połowa: {c}"), E: L6("Mitad este de {c}|Eastern half of {c}|Moitié est : {c}|Metade leste de {c}|Östliche Hälfte von {c}|Metà est di {c}||{c}的东半部|{c}의 동쪽 절반|{c}の東半分|Восточная половина: {c}|Wschodnia połowa: {c}"), W: L6("Mitad oeste de {c}|Western half of {c}|Moitié ouest : {c}|Metade oeste de {c}|Westliche Hälfte von {c}|Metà ovest di {c}||{c}的西半部|{c}의 서쪽 절반|{c}の西半分|Западная половина: {c}|Zachodnia połowa: {c}") }, HALF0 = { N: L6("Mitad norte del país|Northern half of the country|Moitié nord du pays|Metade norte do país|Nördliche Landeshälfte|Metà nord del paese||该国北半部|나라의 북쪽 절반|国の北半分|Северная половина страны|Północna połowa kraju"), S: L6("Mitad sur del país|Southern half of the country|Moitié sud du pays|Metade sul do país|Südliche Landeshälfte|Metà sud del paese||该国南半部|나라의 남쪽 절반|国の南半分|Южная половина страны|Południowa połowa kraju"), E: L6("Mitad este del país|Eastern half of the country|Moitié est du pays|Metade leste do país|Östliche Landeshälfte|Metà est del paese||该国东半部|나라의 동쪽 절반|国の東半分|Восточная половина страны|Wschodnia połowa kraju"), W: L6("Mitad oeste del país|Western half of the country|Moitié ouest du pays|Metade oeste do país|Westliche Landeshälfte|Metà ovest del paese||该国西半部|나라의 서쪽 절반|国の西半分|Западная половина страны|Zachodnia połowa kraju") };
  const halfNote = o => {
    if (A.adv.isFlagRound() || o.t === "c") return null;
    if (o.clue) return regionNote(o);
    const ne = (o.cEn || []).map(neOf).find(Boolean), f = ne && C().world.byName[ne]; if (!f || o.lat == null) return null;
    const ar = p => (p.bbox[2] - p.bbox[0]) * (p.bbox[3] - p.bbox[1]), poly = f.polys.find(p => A.geo.inFeature(o.lon, o.lat, { polys: [p] })) || f.polys.reduce((a, b) => (ar(b) > ar(a) ? b : a));
    const b = poly.bbox, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, w = (b[2] - b[0]) * Math.cos((cy * Math.PI) / 180), h = b[3] - b[1];
    const k = w >= h ? (o.lon >= cx ? "E" : "W") : o.lat >= cy ? "N" : "S";
    return (run.chal || []).some(c => c.id === "nocountry") || !o.sub ? A.tx(HALF0[k]) : A.tx(HALF[k]).replace("{c}", A.tx(o.sub).split(" · ")[0]);
  };
  /* Pase VIP (tanda 10): tres fichas doradas caen en el mapa en orden barajado (sub-semilla :trile): una marca el lugar y dos son senuelos fuera
     del umbral de racha x1,5 (del lugar y entre si). Lugares: del mismo pais (si no hay dos, del mismo continente); paises y banderas: el centro
     de otros paises del mismo continente cuyo borde queda lejos. A ciegas, una ficha al azar hace racha ~1 de cada 3 veces */
  const TRILE_NOTE = L6("Una de las tres fichas marca el lugar.|One of the three chips marks the place.|Un des trois jetons marque le lieu.|Uma das três fichas marca o lugar.|Einer der drei Chips markiert den Ort.|Una delle tre fiche segna il luogo.||三枚筹码中有一枚标出了地点。|세 칩 중 하나가 장소를 가리킵니다.|3枚のうち1枚が場所を示している。|Одна из трёх фишек отмечает место.|Jeden z trzech żetonów oznacza miejsce.");
  function trile(o) {
    const S = C().S, map = C().map, Wd = C().world, rr = A.rng(`${run.seed}:trile:${roundNo()}:${S.qi}`);
    const far = 1.5 * 0.5108 * clamp(1500 * Math.pow(0.97, roundNo()), 300, 1500) * kf(o), dist = (a, b) => A.geo.haversine(a[1], a[0], b[1], b[0]);
    const inner = f => { const ar = p => (p.bbox[2] - p.bbox[0]) * (p.bbox[3] - p.bbox[1]), big = f.polys.reduce((a, b) => (ar(b) > ar(a) ? b : a)), b = big.bbox; let p = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; for (let k = 0; k < 60 && !A.geo.inFeature(p[0], p[1], { polys: [big] }); k++) p = [b[0] + (b[2] - b[0]) * rr(), b[1] + (b[3] - b[1]) * rr()]; return p; };
    let tgt, pool;
    if (o.t === "c") {
      const f = Wd.byName[o.key]; if (!f) return; tgt = inner(f); const cont = A.continent(tgt[1], tgt[0]);
      pool = Wd.features.filter(g => g !== f && g.polys.length).map(inner).filter(p => A.continent(p[1], p[0]) === cont && A.geo.distToFeature(p[0], p[1], f) > far);
    } else {
      tgt = [o.lon, o.lat]; const cs = new Set(o.cEn || []), cont = continentOf(o), bank = infPool().filter(q => q.lat != null && q.cid[0] !== o.cid[0]);
      const same = bank.filter(q => (q.cEn || []).some(n => cs.has(n))).map(q => [q.lon, q.lat]).filter(p => dist(p, tgt) > far);
      pool = same.length >= 2 ? same : bank.filter(q => continentOf(q) === cont).map(q => [q.lon, q.lat]).filter(p => dist(p, tgt) > far);
    }
    const picks = []; for (const p of rr.shuffle(pool)) { if (picks.every(q => dist(q, p) > far)) picks.push(p); if (picks.length === 2) break; }
    for (const p of pool) { if (picks.length >= 2) break; if (!picks.includes(p)) picks.push(p); }
    const t0 = performance.now() + 120, list = rr.shuffle([tgt, ...picks]).map((p, k) => ({ lon: p[0], lat: p[1], t0: t0 + k * 260, chip: true }));
    map.setDecoys((map.decoys || []).filter(d => !d.chip).concat(list));
    list.forEach((d, k) => timers.push(setTimeout(() => A.sfx.chip(0.3 + k * 0.25), d.t0 - performance.now() + 480)));   // cada ficha tintinea al caer
    timers.push(setTimeout(() => A.sfx.counter(1), t0 - performance.now() + (list.length - 1) * 260 + 760));   // y la mesa dice tachan
    noteH(A.tx(TRILE_NOTE), "passport");
  }
  const fieldNote = o => (A.adv.isFlagRound() || o.clue ? regionNote(o) : A.chal.noteMask(o, A.tx(o.fact) || (A.factOf && A.factOf(o)) || ""));
  const hints = [];
  const noteH = (txt, icon) => { hints.push(txt); const el = $("factText"); el.textContent = hints.join("  ·  "); if (icon) el.insertAdjacentHTML("afterbegin", A.icon(icon, "sm")); };
  /* el reloj de la pregunta no vuelve a empezar si recargas o sales a mitad: al reanudar sigue con lo que ya habias gastado
     (antes recargar la pagina daba el tiempo entero otra vez, tambien en el Reto diario) */
  const qKey = () => run && `${run.act}:${run.round}:${run.attempt || 0}:${run.qi}:${run.inf ? 1 : 0}`;
  function snapSpent() {
    const S = C() && C().S; if (!run || !S || S.run !== run || S.phase !== "asking") return;
    run.qSpent = { k: qKey(), ms: Math.max(0, (S.paused ? S.pauseAt : performance.now()) - S.t0 - S.pausedAcc) }; persist();
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) snapSpent(); });
  addEventListener("pagehide", snapSpent);
  A.adv.onQuestion = function () {
    { const o0 = C().S.qs[C().S.qi]; if (A.dealer.trackQ) A.dealer.trackQ(o0 && o0.t !== "c" ? o0.lat : null, o0 && o0.t !== "c" ? o0.lon : null); }   // te vio encima (js/dealer.js)
    if (run && run.qSpent) { if (run.qSpent.k === qKey()) C().S.t0 -= run.qSpent.ms; run.qSpent = null; }
    const S = C().S, o = S.qs[S.qi], kept = o && run.probes && run.probes.length && run.probesK === qKey() + ":" + o.cid[0] ? run.probes : null;   // al reanudar la misma pregunta, las sondas siguen ahi (las cargas ya estaban gastadas)
    clearTimers(); hints.length = 0; run.qTools = 0; run.probes = kept || []; run.tool = null; run.windOff = false; S.tool = null; renderBars();
    if (!o) return;
    { const b = !run.inf && run.qi === 0 && casOf(roundNo()); if (b && (b.id === "red" ? b.win : b.streak) && b.att === (run.attempt || 0)) { S.streak = Math.max(S.streak || 0, 1); run.streak = Math.max(run.streak || 0, 1); } }   // tanda 11: Rojo o negro acertado: empiezas en racha
    const calmF = (perkList().find(p => p.calm) || {}).calm, calm = calmF && !run.inf && (run.streak || 0) >= 2 && (run.chal || []).some(c => calmF.includes((A.CHAL[c.id] || {}).fam)) ? calmF : null;   // Sangre fria (tanda 9)
    if (!!calm !== !!run.calmOn) { if (calm) A.adv.flash("coolhead", 0, "❄"); else A.adv.flash("coolhead", 0, "✕", () => A.sfx.chip(0.3)); }   // entra en frio / se le quiebra el halo
    const calmWas = !!run.calmOn; run.calmOn = !!calm; if (calmWas !== run.calmOn) renderBars();   // las fichas que apaga, heladas
    const fx = A.chal.fx(amuPerks()); A.chal.question(o, run.qi, { calm });
    if (run.intQ === qKey()) { A.chal.suspend(); run.windOff = true; }   // el Interruptor ya estaba gastado en esta pregunta: Descarte, Dividir o recargar no lo deshacen
    showSplit();
    if (kept) { C().map.avoid = hudRects(); C().map.setProbes(kept); renderBars(); }
    A.pointer.set({ tool: null, fx, calm: !!calm, noCountry: o.t === "c", windFn: run.wind ? windGhost : null, distFn: (lon, lat) => { const oo = C().S.qs[C().S.qi]; if (!oo) return null; const fo = featOf(oo); return fo ? A.geo.distToFeature(lon, lat, fo) : A.geo.haversine(lat, lon, oo.lat, oo.lon); } });
    const api = {
      fact: o2 => { const txt = fieldNote(o2); if (txt) noteH(txt, "almanac"); },
      half: o2 => { const txt = halfNote(o2); if (txt) noteH(txt, "sextant"); },   // Soplo del crupier (tanda 10)
      note: noteH, continent: o2 => continentName(o2), country: revealCountry, addTime: s => { S.limit += s; },
      laterHalf: fn => api.later(S.limit / 2, fn),
      /* cuando queden `sec` segundos del reloj de la pregunta: se recalcula en cada espera (la pausa y el Reloj de arena mueven el momento; antes una pausa lo perdia) */
      later: (sec, fn) => { const tick = () => { if (S.phase !== "asking") return; const left = S.limit - (performance.now() - S.t0 - S.pausedAcc) / 1000; if (!S.paused && left <= sec) return fn(); timers.push(setTimeout(tick, S.paused ? 250 : Math.max(50, (left - sec) * 1000))); }; tick(); },
    };
    /* las pistas gratis se lucen la primera vez que dan algo en cada ronda (tambien las que esperan a mitad de tiempo) */
    const rk = run.act + ":" + run.round + ":" + run.attempt;
    perkList().forEach(p => {
      if (!p.open) return;
      const mark = () => { run.hintFl = run.hintFl || {}; if (run.hintFl[p.id] !== rk) { run.hintFl[p.id] = rk; A.adv.flash(p.id, 0); } };
      p.open({ ...api, fact: x => { mark(); api.fact(x); }, note: (t, i) => { mark(); return api.note(t, i); }, country: x => { mark(); return api.country(x); }, half: x => { if (halfNote(x)) mark(); api.half(x); } }, o, run);
    });
    if (S.qi === 5 && has("sleeve") && !run.inf) A.adv.flash("sleeve", 0, "6");   // la 6.a sale de la manga
    if (S.qi === 0 && !run.inf && run.rfK !== rk) { run.rfK = rk; timers.push(setTimeout(() => { if (C().S.phase === "asking") roundFlashes(); }, 650)); }
    if (run.qTotal === 0 && A.tour) A.tour.maybe("q");
  };
  /* el viento EMPUJA el puntero: se ve moverse (racha lenta incluida) y el clic cae exactamente donde esta el puntero. Devuelve el desplazamiento en pantalla. */
  const gust = () => 1 + 0.22 * Math.sin(performance.now() / 1000 * 1.9) + 0.08 * Math.sin(performance.now() / 1000 * 5.3);
  const windGhost = (px, py) => { const m = C().map; if (!run || !run.wind || run.windOff) return null; const [lon, lat] = m.screenToLonLat(px, py), a = A.adv.adjust(lon, lat, gust()), p = m.lonLatToScreen(a.lon, a.lat, m.lastCt); return [p[0] - px, p[1] - py]; };
  A.adv.decorate = o => A.chal.decorate(o);
  /* ronda de banderas: la placa muestra la bandera (SVG empaquetado en assets/flags por tools/bundle-media.py; credito en data/flags.js) en vez del nombre */
  A.adv.isFlagRound = () => !!(run && run.topic === "flag");
  A.adv.renderFlag = o => {
    const el = $("askName"); if (!el) return; const sub = $("askSub"); if (sub) sub.textContent = "";
    const rec = A.FLAGS && o.name && A.FLAGS[o.name.en];
    if (!rec) { el.textContent = A.tx(o.name); return; }                          // sin datos empaquetados todavia: se ve el nombre, nunca un hueco vacio
    const src = `assets/flags/${A.mediaKey(o.name.en)}.svg`;
    el.innerHTML = `<img class="ask-flag" src="${src}" alt="" draggable="false">`;
    const img = el.querySelector(".ask-flag"), fx = A.chal.flagFx && A.chal.flagFx();
    if (img && fx) img.style.filter = fx;
  };
  /* el viento desvia el clic */
  A.adv.adjust = function (lon, lat, mul = 1) {
    if (!run || !run.wind || run.windOff) return { lon, lat };
    const wm = (A.chal && A.chal.fxNow && A.chal.fxNow().windMul) || 1;                   // Veleta: el viento empuja la mitad
    const D = Math.PI / 180, d = run.wind.km * wm * mul / 6371, la = lat * D, lo = lon * D, b = run.wind.brg * D;
    const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
    const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
    return { lon: ((lo2 / D + 540) % 360) - 180, lat: clamp(la2 / D, -85, 85) };
  };

  /* ---------------- herramientas ---------------- */
  A.adv.useTool = function (id) {
    const S = C().S; if (!run || S.phase !== "asking" || S.paused) return;
    const t = run.tools[id], def = TOOLS[id]; if (!t) return;
    if ((run.boss || []).includes("silence")) { A.sfx.deny(); const w = A.T("El Silencio anula tus herramientas.", "Silence cancels your tools."); if (hints[hints.length - 1] !== w) noteH(w); return; }   // el aviso, una vez (antes se repetia en cada pulsacion)
    if (t.left <= 0) { A.sfx.deny(); return; }
    if (def.kind === "probe") {                                      // la pista ("Toca el mapa...") sale encima de la carta: en la nota, esta crecia y la carta saltaba 63 px bajo el raton
      S.tool = S.tool === id ? null : id; A.sfx.flip(!!S.tool); C().map.setPick(true);
      renderBars(); return;
    }
    t.left--; run.qTools++; run.rTools++; A.sfx.buy();
    const o = C().S.qs[S.qi];
    if (id === "hourglass") { S.limit += 6; noteH(A.T("+6 segundos", "+6 seconds")); }
    else if (id === "interruptor") { A.chal.suspend(); run.windOff = true; run.intQ = qKey(); A.sfx.restore(); noteH(A.T("Retos apagados en esta pregunta", "Challenges off for this question")); A.dealer.react("counter"); }
    else if (id === "swapcard") { if (!swapQuestion()) { t.left++; run.qTools--; run.rTools--; A.sfx.deny(); return; } }
    else if (id === "journal") { const txt = o.clue ? A.tf("Empieza por «{l}» y está en {c}.", "Starts with “{l}” and lies in {c}.", { l: A.tx(o.answer).trim()[0], c: continentName(o) }) : fieldNote(o) || A.T("Sin notas para este lugar.", "No notes for this place."); noteH(txt, "journal"); }
    else if (id === "passport") trile(o);                                // tanda 10: el Pase VIP es un trile
    persist(); renderBars();
  };
  /* Dividir (tanda 12b): en la pregunta dificil, bajo la placa, "o bien: <otro lugar>" (con los mismos retos de placa; en banderas, su bandera
     pequena). Un clic o la tecla Tab la cambian, una sola vez y antes de responder; la otra carta se va con el crupier */
  const SPLIT_OR = L6("o bien:|or:|ou bien :|ou então:|oder:|oppure:||或者：|또는:|または：|или:|albo:");
  const splitQ = () => { const sp = run && run.split, all = sp && allQ(); return sp && all[sp.alt] ? withSub({ ...all[sp.alt] }) : null; };
  A.adv.splitAlt = () => { const S = C().S, sp = run && run.split; return sp && !sp.used && !run.inf && sp.key === tgtKey() && S.qi === sp.qi ? splitQ() : null; };   // tambien para la mesa de Continentes barajados
  function showSplit() {
    const old = $("splitAlt"); if (old) old.remove();
    const q = A.adv.splitAlt(), sub = $("askSub"); if (!q || !sub) return;
    const b = document.createElement("button"); b.id = "splitAlt"; b.type = "button"; b.className = "split-alt";
    b.innerHTML = `<span class="sa-k">${ic("oracle", "sm")}${A.tx(SPLIT_OR)}</span><span class="sa-n"></span><kbd class="sa-key k-kb">Tab</kbd><i class="gl sa-gl" data-gl="y"></i>`;
    const n = b.querySelector(".sa-n");
    if (A.adv.isFlagRound() && q.t === "c" && A.FLAGS && q.name && A.FLAGS[q.name.en]) { const fx = A.chal.flagFx && A.chal.flagFx(); n.innerHTML = `<img class="sa-flag" alt="" src="assets/flags/${A.mediaKey(q.name.en)}.svg"${fx ? ` style="filter:${fx}"` : ""}>`; A.chal.flagAlt && A.chal.flagAlt(n.querySelector("img"), q); }
    else if (A.chal.decoAlt) A.chal.decoAlt(n, q); else n.textContent = A.tx(q.name);
    b.onclick = e => { e.stopPropagation(); splitSwap(); };
    sub.after(b);
  }
  function splitSwap() {
    const S = C().S, q = A.adv.splitAlt(); if (!q || S.phase !== "asking") return false;
    run.split.used = true; S.qs[S.qi] = q; if (run.curQ) run.curQ[S.qi] = q.cid[0]; run.used.push(q.cid[0]);
    C().map.clearMarks(); C().refreshPrompt(); hints.length = 0; $("factText").textContent = ""; run.qSpent = null; A.adv.onQuestion(); A.sfx.card(); setTimeout(() => A.sfx.card(), 140);
    A.adv.flash("oracle", run.splitSeen ? 0 : 2, "⇄"); if (!run.splitSeen) { run.splitSeen = 1; setTimeout(() => A.sfx.jackpot(2), 300); }   // la primera vez de la expedicion, con jackpot
    persist(); return true;
  }
  addEventListener("keydown", e => { if ((A.keys ? A.keys.match("alt", e) : e.key === "Tab") && $("splitAlt") && C().S.phase === "asking") { e.preventDefault(); splitSwap(); } });
  /* Carta de cambio: otro lugar de la ronda en vez del actual */
  function swapQuestion() {
    const S = C().S, cur = S.qs[S.qi], rr = A.rng(`${run.seed}:swap:${roundNo()}:${S.qi}:${run.qTotal}`); let pick = null;
    if (!cur) return false;
    if (run.inf) { const used = new Set(run.used), cand = infPool().filter(q => !used.has(q.cid[0])); pick = cand.length ? rr.pick(cand) : null; }   // modo infinito: del banco entero
    else {                                                           // v0.20: otra de la misma franja (facil por facil, dificil por dificil), con las reglas de la ronda y del mazo
      const pos = roundNo(), slot = slotOf(pos), B = bandsOf(slot, pos), b = B.bands[B.cls(cur)];
      const others = S.qs.filter((q, i) => q && i !== S.qi);
      pick = takeFrom(b, 1, rr, others.slice(), ctxOf(pos, run.used, B.topic), null)[0] || null;
    }
    if (!pick) { noteH(A.T("No quedan lugares para cambiar.", "No places left to swap.")); return false; }
    const q = withSub({ ...pick });
    if (run.curQ && !run.inf) run.curQ[S.qi] = q.cid[0]; run.used.push(q.cid[0]); S.qs[S.qi] = q;
    C().map.clearMarks(); C().refreshPrompt(); hints.length = 0; $("factText").textContent = ""; run.qSpent = null; A.adv.onQuestion(); A.sfx.card(); return true;
  }
  const continentName = o => A.tx(CONT[continentOf(o)] || L("el mar", "the sea"));
  /* distancia aproximada del Sonar, redondeada en la unidad que ves (antes se redondeaba en km y en millas salian cosas como "≈ 621 mi") */
  const approx = km => { const mi = C().S.units === "mi", v = mi ? km / 1.609344 : km, st = v > 500 ? 50 : 10, r = Math.max(st, Math.round(v / st) * st); return "≈ " + A.fmtDist(mi ? r * 1.609344 : r); };
  /* donde se ve el objetivo en el mapa (coordenadas del mapa tal como se dibuja, cada trozo de pais con su continente): el punto del objetivo mas
     cercano a a. La Brujula apunta ahi y, con los continentes movidos, el anillo del Sonar pasa por ahi aunque sondees desde otro continente */
  const seenTarget = (o, f, a, map) => {
    if (!f) return map.sceneOf(o.lon, o.lat);
    let best = null, bd = Infinity;
    for (const p of f.polys) for (const ring of p.rings) for (const [lo, la] of ring) { const q = map.sceneOf(lo, la, p.ct), d = (q[0] - a[0]) ** 2 + (q[1] - a[1]) ** 2; if (d < bd) { bd = d; best = q; } }
    return best;
  };
  /* lo que tapa el HUD en el lienzo del mapa (px): las etiquetas de las sondas lo esquivan. Se lee al sondear, no en cada fotograma */
  const hudRects = () => { const cv = C().map.cv.getBoundingClientRect(); return ["plate", "advBar", "ledger", "rail", "dock", "note", "toolBar"].map(id => $(id)).filter(e => e && e.getClientRects().length).map(e => { const b = e.getBoundingClientRect(), up = e.id === "toolBar" ? 56 : 4; return [b.left - cv.left - 4, b.top - cv.top - up, b.right - cv.left + 4, b.bottom - cv.top + 4]; }); };
  A.adv.probe = function (lon, lat) {
    const S = C().S, id = S.tool, t = run.tools[id], map = C().map; if (!t || t.left <= 0) { S.tool = null; renderBars(); return; }
    const o = S.qs[S.qi]; t.left--; run.qTools++; run.rTools++; S.tool = null; S.probeAt = performance.now();   // un doble clic ya no responde la pregunta (ver onPick)
    const f = featOf(o), km = f ? A.geo.distToFeature(lon, lat, f) : A.geo.haversine(lat, lon, o.lat, o.lon);
    const list = (run.probes = run.probes || []), P = { lon, lat, ct: map.pickCt };   // ct: marco del mapa deformado donde tocaste (la sonda se dibuja entera alli)
    run.probesK = qKey() + ":" + o.cid[0];
    if (f ? km === 0 : km < 5) { P.inside = true; P.label = f ? (o.area ? A.T("¡Dentro!", "Inside!") : A.T("¡Dentro del país!", "Inside the country!")) : A.T("¡Aquí mismo!", "Right here!"); A.sfx.sonar(1); }   // encima del objetivo: ni anillo ni flecha
    else if (id === "sonar") {
      const fz = (A.rng(run.seed + ":sn:" + roundNo() + ":" + S.qi + ":" + list.length)() - 0.5) * (has("sonarErr") ? 0.04 : 0.12);
      P.km = Math.min(20015, km * (1 + fz)); P.label = approx(P.km);   // nunca mas de media vuelta al mundo
      if (P.ct != null) { const a = map.sceneOf(lon, lat, P.ct), b = seenTarget(o, f, a, map); P.dr = Math.hypot(b[0] - a[0], b[1] - a[1]) * (1 + fz); }   // continentes movidos: el anillo se mide en el mapa que ves (los km siguen siendo los de verdad)
      A.sfx.sonar(clamp(1 - km / 8000, 0, 1));
    } else {
      /* Brujula: rumbo en el mapa que ves, hacia el punto del objetivo mas cercano tal como se dibuja. Antes era el rumbo de salida de la ruta por
         el globo, hacia el centro de la caja del pais: en un mapa plano la flecha se desviaba mas de 45 grados en casi la mitad de las sondas
         lejanas, y con los continentes movidos apuntaba a donde no estaba el objetivo */
      const a = map.sceneOf(lon, lat, P.ct), b = seenTarget(o, f, a, map);
      const brg = (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI + 360) % 360, step = has("compass16") ? 22.5 : 45, snap = (Math.round(brg / step) * step) % 360;
      P.bearing = snap; P.label = dirName(snap); A.sfx.sonar(0.8);
    }
    list.push(P); map.avoid = hudRects(); map.setProbes(list); persist(); renderBars();   // el resultado tambien encima de las cartas (renderBars): con el apagon o el mapa borroso la etiqueta del mapa no se lee
    if (list.length >= 3) A.ach.emit("adv", { kind: "probe", n: list.length });
  };

  /* ---------------- barras de estado (durante la partida) ---------------- */
  function ensureBars() {
    let el = $("advBar"); if (el) return;
    el = document.createElement("div"); el.id = "advBar"; el.className = "adv-bar hidden"; ($("leftCol") || $("app")).appendChild(el);
    const tb = document.createElement("div"); tb.id = "toolBar"; tb.className = "tool-bar hidden"; $("app").appendChild(tb);
  }
  function hearts() { let h = ""; for (let i = 0; i < run.maxLives; i++) h += `<i class="hp ${i < run.lives ? "on" : ""}">${ic(i < run.lives ? "heart" : "heart_empty")}</i>`; return h; }
  /* botin en vivo en el marcador: en cuanto superas el objetivo, cuanto cobrarias ya y a cuantos puntos esta el siguiente doblon */
  function renderLoot() {
    const led = $("ledger"); if (!led) return;
    let el = $("scLoot"); if (!el) { el = document.createElement("div"); el.id = "scLoot"; el.className = "lg-loot hidden"; el.dataset.tf = "loot"; led.insertBefore(el, $("streakChip")); }
    const S = C().S, Lv = S.camp && S.camp.levels && S.camp.levels[0];
    const on = !!(run && !run.inf && Lv && S.camp.mode === "adventure" && ["asking", "reveal"].includes(S.phase) && S.levelScore >= Lv.advance);
    el.classList.toggle("hidden", !on); if (!on) return;
    const tb = Math.max(Lv.advance, baseTarget()), lt = loot(S.levelScore, tb, isBoss()), got = gain(lt.base + (has("marginHalf") ? Math.floor(lt.margin / 2) : lt.margin));
    el.innerHTML = `<span>${A.tx(ETX.loot)}</span><b>${CN()}+${got}</b><i>${lt.next ? et("next", { c: gain(lt.base + (has("marginHalf") ? Math.floor((lt.margin + 1) / 2) : lt.margin + 1)), s: A.fmt(lt.next) }) : A.tx(ETX.max)}</i>`;
  }
  if (A.tips) A.tips.loot = () => A.tx(ETX.lootTip) + "\n" + A.tx(ETX.lootTipD);
  /* ---------------- lucirse (tanda 2): cuando una reliquia TUYA actua, su icono salta en la barra, suena y, si es un premio, tiembla.
     Antes de comprar no cambia nada (ni cartas, ni panel de proxima ronda, ni fichas de reto). lv 0 = aviso (brinco y ficha, sin temblor:
     tambien mientras respondes), 1 = premio flojo (brillo y moneda), 2 = premio medio (brillo, dos fichas y temblor 1, nunca mientras respondes).
     Cola: un aviso tras otro, al ritmo del sonido. La primera vez que actua cada reliquia en la expedicion, el crupier la nombra (frase soft,
     una por ronda como mucho, pasa por su presupuesto) */
  const flashQ = [], flashOn = {};
  let flashBusy = false, flashK = 0;
  A.adv.flash = (id, lv = 0, label = "", snd) => { if (!run || !A.RELICS[id] || !owned(id)) return; flashQ.push({ id, lv, label, snd }); if (!flashBusy) flashNext(); };
  function flashPaint(el, f) {
    el.classList.remove("fl0", "fl1", "fl2"); A.restyle(el); el.classList.add("fl" + f.lv);
    if (f.label) { const old = el.querySelector(".ab-lbl"); if (old) old.remove(); el.insertAdjacentHTML("beforeend", `<i class="ab-lbl">${f.label}</i>`); }
  }
  /* la queja del amuleto (una por amuleto y expedicion): si el crupier esta hablando, espera su turno durante la pregunta en vez de perderse */
  function amuGripe(id, n) {
    if (!run) return; const am = amuHit(A.RELICS[id])[0]; run.relicSeen = run.relicSeen || {};
    if (!am || run.inf || run.relicSeen[id] || n > 8 || C().S.phase !== "asking") return;
    if (A.dealer.react("amulet", { p: A.tx(A.RELICS[id].n), c: A.tx(A.CHAL[am.id].n) })) { run.relicSeen[id] = 1; return; }
    setTimeout(() => amuGripe(id, n + 1), 1500);
  }
  function flashNext() {
    const f = flashQ.shift(); if (!f || !run) { flashQ.length = 0; flashBusy = false; return; } flashBusy = true;
    const el = document.querySelector(`#advBar .ab-perk[data-id="${f.id}"]`), k = flashK++ % 4, asking = C().S.phase === "asking";
    flashOn[f.id] = { f, t: performance.now() }; if (el) flashPaint(el, f);
    if (f.snd) f.snd(); else if (f.lv === 0) A.sfx.chip(0.15 + Math.random() * 0.7); else { A.sfx.coin(k); if (f.lv === 2) setTimeout(() => A.sfx.chip(0.4 + Math.random() * 0.5), 120); }
    if (f.lv === 2 && !asking && C().jpShake) C().jpShake(1);                           // nada tiembla mientras respondes
    run.relicSeen = run.relicSeen || {}; const rk = run.act + ":" + run.round;
    if (A.RELICS[f.id].amulet) amuGripe(f.id, 0);                                         // 0.2.5: un amuleto le estropea un reto: se queja nombrando los dos
    else if (!run.relicSeen[f.id] && run.relicSaidR !== rk && !run.inf && A.dealer.react("relic", { p: A.tx(A.RELICS[f.id].n) })) { run.relicSeen[f.id] = 1; run.relicSaidR = rk; }   // solo cuenta si de verdad habla (si estaba ocupado, lo intenta la siguiente)
    setTimeout(flashNext, f.lv ? 420 : 300);
  }
  /* amuletos fijos (0.2.5): sin cargas, actuan siempre que sale su familia. Contra un reto a nivel 3 solo lo suavizan: sus efectos a medias
     (los multiplicadores a mitad de camino de 1, los tiempos de arreglo el doble, el resto a la mitad; los si/no se quedan). Es la lista que ven los retos */
  const amuHit = p => (run.chal || []).filter(c => A.CHAL[c.id] && A.CHAL[c.id].fam === p.amulet);
  const amuSoft = fx => { const o = {}; for (const k in fx) { const v = fx[k]; o[k] = typeof v !== "number" ? v : /Mul$|^darkR$/.test(k) ? (1 + v) / 2 : /Ms$|^hangAuto$/.test(k) ? v * 2 : v / 2; } return o; };
  const amuPerks = () => perkList().map(p => (p.amulet && amuHit(p).some(c => (c.lv || 1) >= 3) ? { ...p, fx: amuSoft(p.fx) } : p));
  /* el sello del amuleto en la ficha del reto que frena (en la barra, toda la ronda). Aparece con un golpe al empezar la ronda (A.adv.amuSlam) */
  const amuOf = c => { const f = (A.CHAL[c.id] || {}).fam; return f ? perkList().find(p => p.amulet === f) : null; };
  A.adv.amuSlam = id => {
    run.amuSlam = roundNo() + ":" + (run.attempt || 0);
    document.querySelectorAll(`#advBar .ch-amu[data-amu="${id}"]`).forEach((el, i) => { el.classList.remove("wait", "slam"); A.restyle(el); el.classList.add("slam"); setTimeout(() => A.sfx.sealPop(), 60 + i * 120); const ch = el.closest(".ch-chip"); if (ch && !matchMedia("(prefers-reduced-motion: reduce)").matches) ch.animate([{ transform: "none" }, { transform: "translateX(-4px) rotate(-2deg)" }, { transform: "translateX(3px) rotate(1deg)" }, { transform: "none" }], { duration: 300, delay: 220, easing: "steps(6, end)" }); });   // la ficha encaja el golpe
  };
  /* premio en el veredicto (la barra esta oculta): suena una moneda por linea de reliquia al aparecer y tiembla una vez (1); lv 2 = premio medio */
  function relicPay(ids, lv = 1) {
    ids = ids.filter(Boolean); if (!ids.length) return;
    ids.forEach((id, i) => setTimeout(() => { A.sfx.coin(i % 4); if (lv === 2) setTimeout(() => A.sfx.chip(0.4 + Math.random() * 0.5), 120); }, 520 + i * 120));
    setTimeout(() => { if (C().jpShake) C().jpShake(1); }, 560);
    run.relicSeen = run.relicSeen || {}; const id = ids.find(x => !run.relicSeen[x]); if (id) run.relicSeen[id] = 1;   // el veredicto ya habla de ella: el crupier no la presenta luego
  }
  /* renderBars rehace la barra: lo que acaba de lucirse (en los ultimos 700 ms) se vuelve a pintar en el icono nuevo */
  function flashKeep(bar) { const now = performance.now(); for (const id in flashOn) { const x = flashOn[id]; if (now - x.t > 700) { delete flashOn[id]; continue; } const el = bar.querySelector(`.ab-perk[data-id="${id}"]`); if (el) flashPaint(el, x.f); } }
  /* Segunda bola (tanda 5): dos veces por ronda, si tu clic no hace racha (menos de 600) no cuenta. Queda una marca fria (una sonda sin anillo
     ni distancia: dice "aqui no", nunca "aqui si"), el reloj se para 0,4 s y vale el siguiente clic. No salta con el tiempo agotado ni con las sondas */
  A.adv.reBall = (lon, lat) => {
    if (!run || run.inf || !has("reball")) return false;
    const S = C().S, o = S.qs[S.qi]; if (!o) return false;
    const key = roundNo() + ":" + (run.attempt || 0); run.ballN = run.ballN || {}; if ((run.ballN[key] || 0) >= sumFlag("reball")) return false;
    const f = featOf(o), km = f ? A.geo.distToFeature(lon, lat, f) : A.geo.haversine(lat, lon, o.lat, o.lon);
    const lim0 = (A.codexLimits && o.cid ? A.codexLimits({ id: o.cid[0], cids: o.cid }) : [300, 150, 75])[0]; if (km <= lim0) return false;   // la misma diana que la racha (antes el 60 % de los puntos: de 300 a ~770 km no habia segundo tiro)
    run.ballN[key] = (run.ballN[key] || 0) + 1; (run.ballSaved = run.ballSaved || {})[qKey()] = 1;
    run.probes = run.probes || []; run.probes.push({ lon, lat, ct: C().map.pickCt, cold: true, label: A.tx(OTRA) }); run.probesK = qKey() + ":" + o.cid[0];
    C().map.avoid = hudRects(); C().map.setProbes(run.probes); renderBars();
    S.t0 += 400;                                                         // el reloj se para 0,4 s
    A.sfx.chip(0.2); setTimeout(() => A.sfx.chip(0.65), 140);           // clac-clac de la bola que rebota
    A.adv.flash("reball", 0, A.tx(OTRA));
    return true;
  };
  /* lo que hacen tus reliquias al empezar la ronda (en la 1.a pregunta, tras la intro): quitar o suavizar retos, segundos de mas, cargas de mas, la provision de Por cuenta de la casa */
  function roundFlashes() {
    const r = roundNo(), plan = planOf(r).list, bribed = (run.bribed && run.bribed[r]) || [];
    const left = plan.filter(c => !bribed.includes(c.id)), pl = perkList();
    pl.forEach(p => {
      if (p.skipHardest && left.length) A.adv.flash(p.id, 0);
      if (p.softenBoss && r % 4 === 3 && left.length) A.adv.flash(p.id, 0);
      if ((p.immune || []).some(id => left.some(c => c.id === id))) A.adv.flash(p.id, 0);
      if (p.toolBonus && Object.keys(run.tools).length) A.adv.flash(p.id, 0, "+" + p.toolBonus);
      if (p.round) { const x = { seconds: 0 }; p.round(x, run); if (x.seconds) A.adv.flash(p.id, 0, "+" + x.seconds + " s"); }
    });
    if (run.healAct === run.act && run.round === 0 && !run.attempt) { run.healAct = -1; A.adv.flash("medkit", 1, "+1"); }
  }
  /* nombres de la mano de herramientas: como mucho dos lineas y ninguna palabra fuera de la carta. Si no cabe, la letra se reduce poco a poco (hasta un 26 %),
     como los nombres de las cartas del menu (js/hub.js). Se mide en px propios de la carta: el abanico las gira, y scrollHeight/scrollWidth no cuentan el giro */
  const toolLines = el => Math.round(el.scrollHeight / (parseFloat(getComputedStyle(el).lineHeight) || 17));   // el hueco mide 2 lineas fijas: lo que sobra se cuenta con scrollHeight
  const fitToolNames = tb => {
    const go = () => tb.querySelectorAll(".tool .tl-n").forEach(el => {
      el.style.fontSize = el.style.letterSpacing = ""; const fs = parseFloat(getComputedStyle(el).fontSize), fits = () => el.scrollWidth <= el.clientWidth + 1 && toolLines(el) <= 2;
      if (fits()) return; el.style.letterSpacing = "0";                      // primero se aprieta el espaciado (la letra de pixeles ya lleva su hueco)...
      for (let k = 0.97; k >= 0.74 && !fits(); k -= 0.03) el.style.fontSize = (fs * k).toFixed(1) + "px";   // ...y despues la letra
    });
    go(); if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(go);   // con la letra aun sin cargar, las medidas salen cortas
  };
  function renderBars() {
    ensureBars(); const bar = $("advBar"), tb = $("toolBar"); renderLoot();
    if (!run || !C().S.camp || C().S.camp.mode !== "adventure" || ["title", "levelEnd", "shop"].includes(C().S.phase)) { bar.classList.add("hidden"); tb.classList.add("hidden"); return; }
    const info = actInfo(run.act), silenced = (run.boss || []).includes("silence");
    bar.classList.remove("hidden");
    bar.innerHTML = `<div class="ab-top"><span class="ab-act" data-tf="abact">${A.tx(info.n)}</span><span class="ab-coins" id="abCoins" data-tf="abcoins">${CN()}<b>${run.coins}</b></span><span class="ab-hearts" data-tf="abhearts">${hearts()}</span></div>
      <div class="ab-perks">${run.perks.map(id => `<span class="ab-perk" data-id="${id}">${ic(id)}${id === "hoard" && run.hucha ? `<b class="hc-n">${run.hucha}</b>` : ""}</span>`).join("")}</div>
      ${(run.chal || []).length ? `<div class="ab-chal">${(A.chal.barList ? A.chal.barList(run.chal) : run.chal).map(c => { const am = amuOf(c), cc = am ? { ...c, amu: am.id, amuIco: am.ico, amuWait: run.qi === 0 && run.amuSlam !== roundNo() + ":" + (run.attempt || 0) } : c; return A.chal.chip(run.calmOn && ((perkList().find(p => p.calm) || {}).calm || []).includes((A.CHAL[c.id] || {}).fam) ? { ...cc, calm: true } : cc, true); }).join("")}</div>` : ""}
      ${A.jefes ? A.jefes.riseHtml() : ""}
      ${run.wind ? `<div class="ab-wind"><svg viewBox="-12 -12 24 24" style="transform:rotate(${run.wind.brg}deg)"><path d="M0 -9 L6 4 L0 1 L-6 4 Z"/></svg><span>${dirName(run.wind.brg)} · ${A.fmtDist(run.wind.km)}</span></div>` : ""}`;
    flashKeep(bar);
    const ids = Object.keys(run.tools);
    tb.classList.toggle("hidden", !ids.length || C().S.phase !== "asking");
    const aim = id => (id === "sonar" ? A.T("Toca el mapa para lanzar una sonda…", "Tap the map to send a probe…") : A.T("Toca el mapa para orientar la brújula…", "Tap the map to aim the compass…"));
    const res = !C().S.tool && (run.probes || []).length ? `<i class="tl-res">${run.probes.map(p => p.label).join("  ·  ")}</i>` : "";   // lo que han dicho las sondas de esta pregunta
    tb.innerHTML = res + ids.map((id, i) => { const t = run.tools[id], on = C().S.tool === id, off = t.left <= 0 || silenced; return `<button class="tool pc-hand${on ? " on" : ""}${off ? " off" : ""}" data-tool="${id}" style="--r:${((i - (ids.length - 1) / 2) * 6).toFixed(1)}deg" title="${A.tx(TOOLS[id].n)} — ${A.tx(TOOLS[id].d)}">${on && TOOLS[id].kind === "probe" ? `<i class="tl-aim">${aim(id)}</i>` : ""}<span class="tl-ico felt">${ic(TOOLS[id].ico)}</span><b class="tl-n">${A.tx(TOOLS[id].sn || TOOLS[id].n)}</b><span class="tl-pips">${Array.from({ length: toolMax(id) }, (_, k) => `<i class="${k < t.left ? "on" : ""}"></i>`).join("")}</span><kbd class="k-kb">${i + 1}</kbd></button>`; }).join("");
    tb.querySelectorAll(".tool").forEach(b => (b.onclick = () => A.adv.useTool(b.dataset.tool)));
    fitToolNames(tb);
    if (A.pointer) A.pointer.set({ tool: C().S.tool });
  }
  A.adv.refresh = renderBars;
  A.adv.hideBars = () => { const a = $("advBar"), b = $("toolBar"), l = $("scLoot"); if (a) a.classList.add("hidden"); if (b) b.classList.add("hidden"); if (l) l.classList.add("hidden"); };
  A.adv.hudTitle = () => { const Lv = C().S.camp.levels[0]; return run && run.inf ? `${A.tx(Lv.name)} · ${A.tx(Lv.topicName)} · ${A.fmt1(Lv.seconds)} s` : `${A.tx(Lv.name)} · ${A.tx(Lv.topicName)} · ${A.T("Objetivo", "Target")} ${A.fmt(Lv.advance)}`; };
  A.adv.toolKey = n => { const ids = run ? Object.keys(run.tools) : []; if (ids[n]) A.adv.useTool(ids[n]); };
  A.adv.cancelTool = () => { const S = C().S; if (S.tool) { S.tool = null; renderBars(); } };

  /* ---------------- fin de ronda ---------------- */
  A.adv.roundEnd = function () {
    if (run.inf) { run.score += C().S.levelScore; run.sup = {}; persist(); A.adv.hideBars(); return endRun(true); }   // modo infinito: sin provisiones, se cobra directamente
    const S = C().S, Lv = S.camp.levels[0], pass = S.levelScore >= Lv.advance, boss = isBoss();
    if (A.dealer.noteTricks) A.dealer.noteTricks((run.chal || []).map(c => c.id), pass);   // el historial de cada truco (lo cuenta el crupier en la intro)
    if (A.dealer.noteRound) A.dealer.noteRound(pass);                                     // el marcador historico: tu contra la banca
    S.phase = "levelEnd"; A.adv.hideBars(); clearTimers(); clearTimeout(reactT); A.chal.end(); C().map.setStyle(mapStyleFor());
    if (pass) {
      run.score += S.levelScore; run.cleared++; S.runTotal = run.score;
      const tb = Math.max(Lv.advance, baseTarget()), lt = loot(S.levelScore, tb, boss), mh = has("marginHalf"), mg = mh ? Math.floor(lt.margin / 2) : lt.margin, x = { coins: lt.base + mg }, lines = [[A.T("Ronda superada", "Round cleared"), "+" + lt.base]];
      if (lt.margin) lines.push([et("margin", { p: pctOf(S.levelScore - tb, tb) }) + (mh ? " · ½" : ""), "+" + mg, mh ? "minbet" : null, mh ? "half" : null]);   // la Mesa de minimos paga la mitad del margen
      if (mh && S.levelScore < tb) lines.push([A.tx(A.RELICS.minbet.n) + " · " + A.tx(SAVED_BY), "", "minbet"]);
      if (has("midas") && !mh && S.levelScore < tb) { lines.push([A.tx(A.RELICS.philosopher.n) + " · " + A.tx(SAVED_BY), "", "philosopher"]); setTimeout(() => { A.sfx.jackpot(2); if (A.core.jpShake) A.core.jpShake(2); }, 1100); }   // tanda 12: Midas te ha salvado   // ha decidido la ronda   // cuanto mas por encima del objetivo, mas doblones
      const cap = sumFlag("interest") || 2, interest = Math.min(cap, Math.floor(run.coins / 10));
      if (interest) { x.coins += interest; lines.push([A.T("Interés (1 por cada 10)", "Interest (1 per 10)"), "+" + interest, interest > 2 ? (perkList().find(p => p.interest) || {}).id : null]); }   // por encima de 2, es el Banquero
      perkList().forEach(p => { if (p.clear) { const y = { coins: 0 }, tx = p.clear(y, run); if (y.coins) { x.coins += y.coins; lines.push([A.tx(p.n), tx || "+" + y.coins, p.id]); } } });
      if (has("bank")) { const b = gain(sumFlag("bank")); run.hucha = (run.hucha || 0) + b; lines.push([A.tx(A.RELICS.hoard.n) + " · " + A.tx(H_IN).replace("{n}", run.hucha), "+" + b, "hoard"]); }   // tanda 9: la Hucha guarda, no paga
      if (boss && run.act === 1 && has("bossHeal") && run.lives < run.maxLives) { run.lives++; lines.push([A.tx(A.RELICS.heartperk.n), A.tx(H_HEART), "heartperk"]); setTimeout(() => A.sfx.jackpot(1), 1100); }   // Corazon: el jefe del acto II te devuelve una provision
      const bet = (run.bets || {})[roundNo()], rb = casOf(roundNo()), first = !run.attempt;   // tanda 11: las apuestas se cobran aqui
      if (rb && rb.id === "red" && rb.win && rb.att === (run.attempt || 0) && !rb.paid) { const extra = Math.ceil(x.coins * 0.5); x.coins += extra; rb.paid = 1; lines.push([A.tx(BETS.red.n) + " · +50 %", "+" + extra, null, "bet"]); }
      const got = gain(x.coins); if (got !== x.coins) lines.push([A.T("Doblones ×2", "Doubloons ×2"), "+" + (got - x.coins), (perkList().find(p => p.coinX) || {}).id]);
      run.coins += got; run.stats.coinsEarned += got;
      if (bet && bet.id === "double" && !bet.done) { bet.done = 1; if (first) { const win = Math.min(bet.stake, 40); run.coins += bet.stake + win; run.stats.coinsEarned += win; lines.push([A.tx(BETS.double.n) + " ×2", "+" + (bet.stake + win), null, "bet"]); setTimeout(() => { A.sfx.jackpot(3); if (A.core.jpShake) A.core.jpShake(3); A.dealer.say(A.dealer.line("betWin"), { mood: "angry", hold: 2400 }); }, 1100); } }   // doblas lo apostado (+40 como mucho)
      if (bet && bet.id === "final" && !bet.done) { bet.done = 1; if (first) { run.maxLives += 2; run.lives += 2; lines.push([A.tx(BETS.final.n), A.tx(BT.lives2), null, "bet"]); setTimeout(() => { A.sfx.jackpot(3); if (A.core.jpShake) A.core.jpShake(3); }, 1100); } }   // +2 provisiones para el modo infinito
      A.ach.emit("adv", { kind: "clear", tools: run.rTools, bulls: run.rBulls || 0 }); if (boss) { A.ach.emit("adv", { kind: "boss", lives: run.lives }); A.profile.get().adv.boss++; }
      A.sfx.stamp(); setTimeout(A.sfx.clear, 300);
      const actDone = boss, winAct = actDone ? run.act + 1 : 0;
      if (actDone) { const flawless = run.livesLostAct === 0; A.ach.emit("adv", { kind: "act", act: winAct, flawless, asc: run.asc, daily: !!run.board }); run.livesLostAct = 0; A.profile.get().adv.bestAct = Math.max(A.profile.get().adv.bestAct || 0, winAct); }
      A.profile.get().adv.bestRound = Math.max(A.profile.get().adv.bestRound, roundNo() + 1);
      run.phase = "verdict"; run.vBoss = boss; persist(); A.profile.save();
      C().verdict({
        kind: "ok", level: roundNo() + 1, tag: `${A.tx(actInfo(run.act).n)} · ${boss ? A.T("Jefe", "Boss") : A.T("Ronda", "Round") + " " + (run.round + 1)}`, title: boss ? A.T("¡Jefe derrotado!", "Boss defeated!") : A.T("Ronda superada", "Round cleared"),
        text: `${A.fmt(S.levelScore)} / ${A.fmt(Lv.advance)}`, lines,
        stats: [[A.T("Puntos de la ronda", "Round points"), S.levelScore], [A.T("Total de la expedición", "Expedition total"), run.score], [A.T("Doblones", "Doubloons"), run.coins]],
        stamp: A.T("SUPERADA", "CLEARED"), stampSub: String(roundNo() + 1).padStart(2, "0"), art: boss ? "chest" : "win",
        buttons: [{ id: "nlBtn", cls: "btn-ink", label: boss ? A.T("Abrir el cofre del jefe", "Open the boss chest") : A.T("Al campamento", "To camp"), arrow: true, primary: true, onclick: () => { if (boss && run.act < 2 && !run.chestStuckDone && Math.random() < 0.6) { run.chestStuckDone = true; persist(); return stuckChest(); } afterVerdict(boss); } }, { id: "vdMenu", cls: "btn-line", label: A.T("Menú", "Menu"), onclick: () => C().runMenu(), keep: true }],
      });
      relicPay(lines.filter(l => l[2] && !l[3]).map(l => l[2]));
      const wb = { big: lt.margin >= 3, c: got, p: pctOf(S.levelScore - Lv.advance, Lv.advance), rn: roundNo() + 1, close: S.levelScore - Lv.advance < Lv.advance * 0.05 ? S.levelScore - Lv.advance : null };   // close: por los pelos   // aplastar la meta (+50 %) tiene sus propias frases
      setTimeout(() => A.dealer.react("roundWin", wb), 700);                // el crupier protesta (antes estas frases nunca se decian)
    } else {
      const insured = !!(run.sup && run.sup.seguro), shielded = insured || (has("shieldAct") && run.shieldAct !== run.act);
      if (shielded && !insured) run.shieldAct = run.act; else if (!shielded) { run.lives--; run.livesLostAct++; }
      const lb = (run.bets || {})[roundNo()], betLost = [];   // tanda 11: la apuesta del jefe se pierde al fallarlo (Doble o nada: lo apostado)
      if (lb && (lb.id === "double" || lb.id === "final") && !lb.done) { lb.done = 1; delete run.bets[roundNo()]; betLost.push([A.tx(BETS[lb.id].n), lb.id === "double" ? "−" + lb.stake : "—", null, "bet lost"]); setTimeout(() => A.dealer.say(A.dealer.line("betLose"), { mood: "laugh", hold: 2400 }), 1200); }
      if (insured) run.segN = (run.segN || 0) + 1;                       // el Seguro de ronda se ha gastado: el siguiente cuesta 2 mas (superar la ronda no lo encarece)
      run.attempt++; run.phase = "retry";
      /* consuelo: lo que puntuaste en la ronda fallida se cobra (1 por cada tercio del objetivo) para comprar ayuda antes de la revancha */
      const q = S.levelScore / Math.max(1, Math.max(Lv.advance, baseTarget())), conso = run.lives > 0 ? gain(consoOf(q)) : 0;
      if (conso) { run.coins += conso; run.stats.coinsEarned += conso; }
      persist();
      A.sfx.stamp(); setTimeout(A.sfx.lose, 300);
      if (run.lives <= 0) return endRun(false);
      C().verdict({
        kind: "", level: roundNo() + 1, tag: `${A.tx(actInfo(run.act).n)} · ${boss ? A.T("Jefe", "Boss") : A.T("Ronda", "Round") + " " + (run.round + 1)}`, title: A.T("No llegaste al objetivo", "Target missed"),
        text: (insured ? A.pick6(SAVED_SUP) : shielded ? ic("shield", "sm") + " " + A.pick6(SAVED_PERK) : "") + (run.lives === 1 ? A.tf("Te quedaste en {s} de {a}. Te queda {n} provisión.", "You scored {s} of {a}. You have {n} provision left.", { s: A.fmt(S.levelScore), a: A.fmt(Lv.advance), n: run.lives }) : A.tf("Te quedaste en {s} de {a}. Te quedan {n} provisiones.", "You scored {s} of {a}. You have {n} provisions left.", { s: A.fmt(S.levelScore), a: A.fmt(Lv.advance), n: run.lives })),   // cada seguro con su frase: se sabe cual te ha salvado
        lines: (conso ? [[et("conso", { p: pctOf(S.levelScore, Lv.advance) }), "+" + conso]] : []).concat(betLost),
        stats: [[A.T("Puntos de la ronda", "Round points"), S.levelScore], [A.T("Objetivo", "Target"), Lv.advance], [A.T("Doblones", "Doubloons"), run.coins]], stamp: A.T("FALLIDA", "FAILED"), stampSub: String(run.lives), art: "lose",
        buttons: [{ id: "rtBtn", cls: "btn-ink", label: A.T("Reintentar con lugares nuevos", "Retry with new places"), arrow: true, primary: true, onclick: () => openShop(false) }, { id: "abBtn", cls: "btn-line", label: A.T("Abandonar", "Abandon"), onclick: () => endRun(false) }],
      });
      if (shielded && !insured) relicPay(["shield"], 2);
      const lives = run.lives; setTimeout(() => A.dealer.react("roundFail", { lives, conso }), 700);
      A.dealer.hover($("abBtn"), "hoverAbandon");                            // si el cursor va hacia Abandonar, el crupier lo ve
      { const ab = $("abBtn"); if (ab && !abSwapped) ab.addEventListener("pointerenter", () => { if (abSwapped || !ab.isConnected) return; abSwapped = true; const sp = ab.querySelector("span"); if (sp) sp.textContent = A.pick6("Abandonar (y dejarle ganar)|Give up (and let him win)|Abandonner (et le laisser gagner)|Abandonar (e deixar ele ganhar)|Aufgeben (und ihn gewinnen lassen)|Abbandona (e lascialo vincere)|Abandonar (y dejarlo ganar)|放弃（让他赢）|포기 (딜러에게 져 주기)|降参する（勝ちを譲る）|Сдаться (и дать ему выиграть)|Poddaj się (i daj mu wygrać)"); if (A.sfx.buzz) A.sfx.buzz(1); }); }   // el boton dice la verdad (una vez por sesion)
    }
    run.sup = {}; persist();                                                // los suministros solo valen para una ronda
  };
  const H_HEART = L6("+1 provisión|+1 provision|+1 provision|+1 provisão|+1 Proviant|+1 provvista||+1 补给|식량 +1|+1 食料|+1 запас|+1 zapas"), H_IN = L6("dentro: {n}|inside: {n}|dedans : {n}|dentro: {n}|drin: {n}|dentro: {n}||里面：{n}|안에: {n}|中身：{n}|внутри: {n}|w środku: {n}"), H_FREE = L6("gratis|free|gratuit|grátis|gratis|gratis||免费|무료|無料|бесплатно|za darmo");
  const SAVED_PERK = "¡La red te salva (una vez por acto): no pierdes provisión! |The safety net catches you (once per act): no provision lost! |Le filet te rattrape (une fois par acte) : aucune provision perdue ! |A rede te segura (uma vez por ato): nenhuma provisão perdida! |Das Sicherheitsnetz fängt dich auf (einmal pro Akt): kein Proviant verloren! |La rete ti salva (una volta per atto): nessuna provvista persa! ||安全网接住了你（每幕一次）：补给不减！|안전망이 받아 줬어요 (막마다 한 번): 식량을 잃지 않았어요! |ネットが受け止めた（各幕に1回）：食料は失わない！|Сетка тебя поймала (раз за акт): запас не потерян! |Siatka cię łapie (raz na akt): nie tracisz zapasu! ";   // tanda 9: la Red de seguridad (antes, el Seguro)
  const SAVED_SUP = "¡El Seguro de ronda te cubre: no pierdes provisión! |Round insurance covers you: no provision lost! |L'Assurance de manche te couvre : aucune provision perdue ! |O Seguro de rodada te cobre: nenhuma provisão perdida! |Die Rundenversicherung springt ein: kein Proviant verloren! |L'Assicurazione del round ti copre: nessuna provvista persa! ||回合保险为你兜底：补给不减！ |라운드 보험이 지켜 줬습니다: 식량 손실 없음! |ラウンド保険でカバー：食料は失われなかった！ |Страховка раунда покрыла провал: ни один запас не потерян! |Ubezpieczenie rundy cię kryje: żaden zapas nie przepada! ";
  /* el primer clic en "Abrir el cofre" no lo abre: el cofre (la medalla) tiembla y el crupier confiesa que lo esta sujetando; el segundo ya lo abre */
  function stuckChest() {
    const m = document.querySelector(".v-medal"), b = $("nlBtn"), S = C().S, reduced = (S && S.reduce) || matchMedia("(prefers-reduced-motion: reduce)").matches;
    A.sfx.deny();
    if (!reduced) [m, b].forEach(e => e && e.animate([{ transform: "none" }, { transform: "translateX(-6px) rotate(-4deg)" }, { transform: "translateX(5px) rotate(3deg)" }, { transform: "translateX(-3px) rotate(-2deg)" }, { transform: "none" }], { duration: 420, easing: "ease-out" }));
    if (A.dealer.chestStuck) A.dealer.chestStuck();
  }
  function afterVerdict(boss) { if (boss && run.act + 1 === 3 && !run.won) return winScreen(); nextStep(boss); }
  function nextStep(boss) {
    if (boss) { run.act++; run.round = 0; run.attempt = 0; const l0 = run.lives; perkList().forEach(p => p.actStart && p.actStart(run)); if (run.lives > l0) run.healAct = run.act; openShop(true); }   // healAct: Por cuenta de la casa se luce en la 1.a pregunta del acto
    else { run.round++; run.attempt = 0; openShop(false); }
  }
  function winScreen() {
    run.won = true; run.act++; run.round = 0; run.attempt = 0; run.phase = "win"; persist(); A.sfx.victory();
    const PA = A.profile.get().adv; PA.wins++; PA.deckWins = PA.deckWins || {}; PA.deckWins[run.deck] = (PA.deckWins[run.deck] || 0) + 1; A.profile.save();
    A.ach.emit("adv", { kind: "win", deck: run.deck });
    showWinChoice();
  }
  /* ronda 12 es la ultima: desde aqui solo se puede cobrar o pasar al modo infinito (nunca mas rondas numeradas) */
  function showWinChoice() {
    C().verdict({
      kind: "win", level: 12, tag: A.T("Tres actos completados", "Three acts completed"), title: A.T("¡Terra Incognita conquistada!", "Terra Incognita conquered!"),
      text: A.pick6("Has completado los tres actos. Puedes cobrar tu gloria ahora o entrar en el modo infinito: preguntas sin parar de todo tipo, cada vez con menos tiempo, hasta que se te acaben las provisiones.|You've completed all three acts. Cash out your glory now, or enter infinite mode: nonstop questions of every kind, with less time on each one, until you run out of provisions.|Tu as terminé les trois actes. Encaisse ta gloire maintenant, ou entre dans le mode infini : des questions de tout genre sans arrêt, avec moins de temps à chaque question, jusqu'à épuiser tes provisions.|Você completou os três atos. Recolha sua glória agora ou entre no modo infinito: perguntas de todo tipo sem parar, com menos tempo a cada pergunta, até acabarem suas provisões.|Du hast alle drei Akte geschafft. Kassiere jetzt deinen Ruhm oder starte den Endlosmodus: Fragen aller Art ohne Pause, mit jeder Frage weniger Zeit, bis dein Proviant aufgebraucht ist.|Hai completato i tre atti. Incassa la gloria ora oppure entra nella modalità infinita: domande di ogni tipo senza sosta, con meno tempo a ogni domanda, finché non finiscono le provviste.|Completaste los tres actos. Puedes cobrar tu gloria ahora o entrar al modo infinito: preguntas sin parar de todo tipo, cada vez con menos tiempo, hasta que se te acaben las provisiones.|你已完成全部三幕。现在兑现荣耀，或进入无尽模式：各类问题接连不断，每题时间越来越少，直到补给耗尽。|세 막을 모두 완료했습니다. 지금 영광을 챙기거나 무한 모드에 들어가세요: 식량이 떨어질 때까지 온갖 문제가 끝없이 나오고, 문제마다 시간이 점점 줄어듭니다.|3つの幕をすべて完了した。今すぐ栄光を現金化するか、エンドレスモードへ：食料が尽きるまで、あらゆる問題がノンストップで、1問ごとに時間が短くなる。|Все три акта пройдены. Забери свою славу сейчас или войди в бесконечный режим: вопросы всех видов без остановки, с каждым вопросом времени меньше, пока не кончатся запасы.|Wszystkie trzy akty za tobą. Zgarnij chwałę teraz albo wejdź w tryb nieskończony: pytania wszelkiego rodzaju bez przerwy, z coraz krótszym czasem, aż skończą ci się zapasy."),
      stats: [[A.T("Total de la expedición", "Expedition total"), run.score], [A.T("Doblones", "Doubloons"), run.coins]], stamp: A.T("VICTORIA", "VICTORY"), stampSub: A.icon("u_star", "st"), art: "win",
      buttons: [{ id: "infBtn", cls: "btn-ink", label: A.T("Modo infinito", "Infinite mode"), arrow: true, primary: true, onclick: () => startInfinite() }, { id: "endBtn", cls: "btn-line", label: A.T("Cobrar y terminar", "Cash out"), onclick: () => endRun(true) }],
    });
  }

  /* ---------------- campamento: tres cartas (se pueden cambiar pagando) ---------------- */
  /* v0.35: solo salen cartas que sirven en ESTA expedicion (ver useful); las contras pesan mas cuantas mas rondas frenan y si frenan la proxima;
     y tras fallar, una carta frena los trucos de la ronda que repites (o el Interruptor, si ninguna reliquia puede) */
  function offers(chest) {
    const rr = A.rng(`${run.seed}:shop:${roundNo()}:${run.attempt || 0}:${run.shopN}:${chest ? 1 : 0}`), R = A.RELICS, out = [];
    const legDone = !!(run.legAct && run.legAct[run.act]);                // tanda 12 (S11): una legendaria por acto, venga de donde venga
    const bag = Object.keys(R).filter(id => !owned(id) && (chest ? !(R[id].r === 3 && legDone) : R[id].r < 3) && useful(id));   // 0.2.5: los amuletos ya no tienen recarga: el tuyo no vuelve a salir
    const cur = chalFor(roundNo()).list, up = new Set(); cur.forEach(c => (A.CHAL[c.id].counters || []).forEach(id => up.add(id)));
    const reach = {}; bag.forEach(id => { if (ctrOf(id)) reach[id] = helpRounds(id).length; });
    const wt = id => { const r = R[id].r; return (chest ? [0, 50, 40, 10][r] : [60, 30 + run.act * 4, 10 + run.act * 5][r]) * (up.has(id) ? 2.6 : 1) * (reach[id] ? 0.7 + 0.3 * Math.min(4, reach[id]) : 1) * (R[id].amulet && run.act === 0 ? 0.5 : 1) * (R[id].ventaja && !perkList().some(p => p.ventaja) ? 2 : 1); };   // sin Ventaja, pesan el doble   // acto I: los amuletos pesan la mitad (que no llenen la mochila)
    const draw = (pool = bag) => { const tot = pool.reduce((n, id) => n + wt(id), 0); let x = rr() * tot, pick = pool[pool.length - 1]; for (const id of pool) { x -= wt(id); if (x <= 0) { pick = id; break; } } bag.splice(bag.indexOf(pick), 1); return pick; };
    const canTool = id => !!run.tools[id] || Object.keys(run.tools).length < 4;   // con 4 herramientas distintas solo sirven cargas de las tuyas
    const slots = chest ? 3 : shopCtx().slots;
    if (!chest && run.attempt > 0 && cur.length && run.fixUsed !== `${roundNo()}:${run.attempt}`) {   // la carta de la revancha va a mitad de precio (fix: ver cardCost); una sola por revancha aunque cambies cartas
      const fix = bag.filter(id => up.has(id));
      if (fix.length) out.push({ k: "perk", id: draw(fix), fix: true });
      else if (canTool("interruptor")) out.push({ k: "tool", id: "interruptor", fix: true });
    }
    while (out.length < slots) {
      const roll = rr();
      if (!chest && roll < 0.16) {                                     // tanda 9 (S9): primero la franja (55 / 35 / 10) y luego una herramienta de esa franja
        const tk = Object.keys(TOOLS).filter(id => canTool(id) && !out.some(o => o.id === id)), tiers = [0, 1, 2].filter(t => tk.some(id => TOOLS[id].r === t)), TW = [55, 35, 10];
        if (tiers.length) { let x = rr() * tiers.reduce((n, t) => n + TW[t], 0), tier = tiers[tiers.length - 1]; for (const t of tiers) { x -= TW[t]; if (x <= 0) { tier = t; break; } } out.push({ k: "tool", id: rr.pick(tk.filter(id => TOOLS[id].r === tier)) }); continue; }
      }
      if (!chest && roll > 0.93 && run.lives < run.maxLives && !out.some(o => o.k === "life")) { out.push({ k: "life" }); continue; }
      if (!bag.length) break;
      out.push({ k: "perk", id: draw() });
    }
    if (!chest && run.act >= 1 && !legDone && !run.inf) {                 // tanda 12 (S11): la vitrina (no cambia con Cambiar cartas: sale de la semilla del acto)
      const legs = Object.keys(R).filter(id => R[id].r === 3 && !owned(id) && useful(id)).sort();
      if (legs.length) out.push({ k: "perk", id: A.rng(`${run.seed}:vit:${run.act}`).pick(legs), vit: true });
    }
    return out;
  }
  function openShop(chest) {
    const S = C().S; S.phase = "shop"; A.adv.hideBars(); clearTimers(); A.chal.end(); A.dealer.release(); run.phase = chest ? "chest" : "shop";
    const key = `${roundNo()}:${run.attempt || 0}:${run.shopN}:${chest}`, visit = `${roundNo()}:${run.attempt || 0}:${chest}`, newVisit = run.shopKey !== visit;
    if (newVisit) run.visitBuys = 0;
    if (!run.stock || run.stockKey !== key) { run.stock = offers(chest); run.stockKey = key; run.bought = []; if (run.shopKey !== visit) { run.shopKey = visit; run.rerolls = 0; run.freeUsed = 0; } }
    persist(); renderShop(chest);
    if (!chest && run.legAch) { const r0 = run; setTimeout(() => { if (run === r0) payLeg(r0); }, 900); }   // el logro de la legendaria del cofre: ya en la tienda, un poco despues de pintarla
    if (newVisit && A.dealer.campArrive) {                                            // el crupier se sienta a la mesa (js/dealer.js)
      const cf = chalFor(roundNo()), costs = (run.stock || []).map(s => (s.k === "life" ? lifePrice() : cardCost(s)));
      A.dealer.campArrive({ chest, coins: run.coins, n: cf.list.length, r: roundNo() + 1, boss: !!cf.boss && !chest, bossName: cf.combo ? A.tx(cf.combo.n) : "", retry: run.attempt > 0,
        newAct: run.round === 0 && run.act > 0 && !run.attempt, cheapest: costs.length ? Math.min(...costs) : 0 });
    }
  }
  /* "proxima ronda" del Campamento: el tema de la ronda (o el jefe) y cada truco en dos lineas: nombre y soborno arriba, lo que hace debajo.
     v0.35 (usuario): antes cada truco ocupaba tres lineas (el soborno debajo) y no decia de que tema era la ronda. En el jefe, su nombre en grande
     y en la linea pequena, entre "Jefe del acto" y el objetivo, el tema. Con el Ojo en el cielo, debajo, la ronda siguiente en una linea.
     v0.35: ya no dice que reliquia frena cada truco (ni las cartas contra que truco sirven): el jugador tiene que leer y atar cabos. */
  const nextHtml = () => {
    const r = roundNo(), rows = [r]; if (has("spy")) for (let k = 1; k <= 2 && r + k <= LAST; k++) rows.push(r + k);   // tanda 9: el Ojo en el cielo ve dos rondas mas   // tras la ronda 12 no hay mas trucos (antes el Ojo en el cielo ensenaba una "Ronda 1" que no existe)
    const dot = "<i>·</i>";
    const html = rows.map((rr, k) => {
      const cf = chalFor(rr), n = cf.list.length, done = cf.paid, main = k === 0, d = defAt(rr), TN = TOPIC_NAMES[d.topic], topic = A.tx(TN[Math.min(d.tier, TN.length - 1)]);
      const named = cf.boss && cf.combo, name = named ? A.tx(cf.combo.n) : topic;
      const kick = [main ? A.T("Próxima ronda", "Next round") : A.T("Después", "Then"), cf.boss ? A.T("Jefe del acto", "Act boss") : A.T("Ronda", "Round") + " " + ((rr % 4) + 1)].concat(named ? [topic] : []).join(dot);
      const badge = `<span class="nr-badge">${ic(cf.boss ? BOSS_IC : TOPIC_ICON[d.topic])}</span>`;
      const count = `<span class="nr-n">${n ? n + " " + (n === 1 ? A.T("reto", "challenge") : A.T("retos", "challenges")) : A.T("Sin retos", "No challenges")}</span>`;
      if (!main) return `<div class="nr far${cf.boss ? " boss" : ""}"><div class="nr-head">${badge}<div class="nr-ttl"><span class="nr-k">${kick}</span><b class="nr-name">${name}</b></div><div class="nr-chips">${cf.list.map(c => A.chal.chip(c, true)).join("")}</div>${count}</div></div>`;
      const shuffle = n ? `<button class="chipbtn nr-shuffle" id="chalReroll" type="button" data-tt="${A.T("Barajar: el crupier elige otros retos para la próxima ronda", "Reshuffle: the dealer picks other challenges for the next round")}">${ic("dice", "sm")}<span>${A.T("Barajar", "Reshuffle")}</span>${freeShuf() ? `<em class="nr-free">${ic("spyhole", "sm")}${A.tx(H_FREE)}</em>` : `<em>${CN()}${chalRerollCost()}</em>`}</button>` : "";
      const lis = cf.list.map(c => { const hd = c.hid && !c.up, dd = hd ? { kind: "rule", ico: BOSS_IC, n: A.chal.tl("ui_faceDown"), d: A.chal.tl(cf.combo && cf.combo.k === "collector" ? "ui_faceDownColl" : "ui_faceDownWheel") } : A.CHAL[c.id];
        return `<li class="nr-row k-${dd.kind}"><span class="nr-ic">${ic(dd.ico)}</span><b class="nr-rn">${A.tx(dd.n)}${c.isNew ? ` <span class="ch-new">${A.tx(A.chal.NEW_TAG)}</span>` : ""} <i class="ch-lv">${"●".repeat(c.lv || 1)}</i></b>${c.sealed ? `<em class="nr-have nr-seal">${A.tx(c.sealBy === "pact" ? BT.pact : c.sealBy === "offer" ? BT.sold : BT.seal)}</em>` : ""}<button class="nr-buy${c.sealed ? " hidden" : ""}" type="button" data-r="${rr}" data-id="${c.id}" data-tt="${A.T("Sobornar al crupier: quita este reto de la próxima ronda. Cada soborno encarece los siguientes.", "Bribe the dealer: removes this challenge from the next round. Each bribe makes the next ones pricier.")}">${A.T("Sobornar", "Bribe")}<span class="nr-p">${CN()}${bribePrice(c, cf.boss)}</span></button><p>${A.tx(dd.d)}</p></li>`; }).join("")
        + done.map(id => `<li class="nr-row done"><span class="nr-ic">${ic(A.CHAL[id].ico)}</span><b class="nr-rn">${A.tx(A.CHAL[id].n)}</b><em class="nr-have">${A.T("Sobornado", "Bribed")}</em></li>`).join("")
        + (cf.nulled || []).map(id => `<li class="nr-row done"><span class="nr-ic">${ic(A.CHAL[id].ico)}</span><b class="nr-rn">${A.tx(A.CHAL[id].n)}</b><em class="nr-have">${A.tx(NULLED)}</em></li>`).join("");   // los que quita tu Comodin
      return `<div class="nr${cf.boss ? " boss" : ""}"><div class="nr-head">${badge}<div class="nr-ttl"><span class="nr-k">${kick}${dot}${A.T("Objetivo", "Target")} ${baseTarget() > target() && rr === roundNo() ? `<s class="of-was">${A.fmt(baseTarget())}</s> ` : ""}<b>${A.fmt(target())}</b></span><b class="nr-name">${name}</b></div>${count}${shuffle}</div>${lis ? `<ul class="nr-list n${Math.min(6, n + done.length)}">${lis}</ul>` : `<p class="nr-clean">${A.T("Ronda limpia: solo tú y el mapa.", "A clean round: just you and the map.")}</p>`}</div>`;
    }).join("");
    return `<div class="tb-next">${html}</div>`;
  };
  /* v0.3.1: sobornar es caro y el crupier sube la tarifa. Base: 3 + 2 por nivel del truco (+1 si es de mapa), el doble en el jefe, y sube con el acto
     y la ascension como todo lo demas. Cada soborno pagado en la expedicion encarece los siguientes un 50 % del precio base (barajar no lo reinicia).
     Con dev/bot.js (bribe, sin cartas), quien solo sobornaba quitaba el 58-67 % de los trucos (todos los del acto I); ahora el 17-21 %:
     los trucos son el juego, y la contra comprada a tiempo sale mucho mas a cuenta */
  const bribePrice = (c, boss) => { const d = A.CHAL[c.id]; return Math.max(2, Math.round((3 + 2 * (c.lv || 1) + (d.kind === "map" ? 1 : 0)) * (boss ? 2 : 1) * (1 + 0.5 * (run.bribeN || 0)) * ascFx(run.asc).price * inflation())); };
  const freeShuf = () => has("freeShuffle") && !chalFor(roundNo()).boss && run.freeShuf !== run.shopKey;   // tanda 9: una vez por visita con el Ojo en el cielo, salvo jefes
  const chalRerollCost = () => (freeShuf() ? 0 : price(4 + 2 * ((run.salt && run.salt[roundNo()]) || 0)) * (chalFor(roundNo()).boss ? 2 : 1));   // tanda 9 (S9): como el soborno, el doble en el jefe
  const tapAt = {}, tapOnce = (k, ms = 400) => { const t = performance.now(); if (t - (tapAt[k] || 0) < ms) return false; tapAt[k] = t; return true; };   // un doble clic no cobra dos veces
  function bribe(id) {
    if (!tapOnce("bribe")) return;
    const r = roundNo(), cf = chalFor(r), c = cf.list.find(x => x.id === id); if (!c) return; const cost = bribePrice(c, cf.boss);
    if (run.coins < cost) { A.sfx.deny(); flash(A.T("No te alcanzan los doblones.", "Not enough doubloons.")); return; }
    run.coins -= cost; run.bribeN = (run.bribeN || 0) + 1; run.bribed = run.bribed || {}; (run.bribed[r] = run.bribed[r] || []).push(id); A.sfx.buy(); persist(); A.ach.emit("adv", { kind: "bribe" });
    A.dealer.enable(true); A.dealer.say(A.dealer.line("bribe"), { mood: "angry", hold: 1800 }); renderShop(run.phase === "chest");
  }
  function rerollChal() {
    if (!tapOnce("shuffle")) return;
    const r = roundNo(), cost = chalRerollCost(); if (run.coins < cost) { A.sfx.deny(); flash(A.T("No te alcanzan los doblones.", "Not enough doubloons.")); return; }
    if (freeShuf()) { run.freeShuf = run.shopKey; A.adv.flash("spyhole", 0, A.tx(H_FREE)); }
    run.coins -= cost; run.salt = run.salt || {}; run.salt[r] = (run.salt[r] || 0) + 1; A.sfx.reroll(); persist();   // los sobornos pagados se quedan: si el truco vuelve a salir, sigue fuera
    A.dealer.enable(true); A.dealer.say(A.dealer.line("reroll"), { mood: "laugh", hold: 1800 }); renderShop(run.phase === "chest");
  }
  const routeHtml = () => A.adv.road({ size: "bar", route: run.route, cur: roundNo() });   // siempre las 12 rondas y el infinito (antes, una ventana de 12 que se corria)
  const rerollCost = () => { const sx = shopCtx(); return run.freeUsed < sx.freeReroll ? 0 : price(3 + run.rerolls); };
  /* precio de una carta de la tienda: la de la revancha (s.fix) va a mitad de precio */
  const cardCost = s => { const full = s.vit ? price(18) : price(s.k === "perk" ? A.RELICS[s.id].cost : TOOLS[s.id].cost); return s.fix ? Math.max(1, Math.ceil(full / 2)) : full; };   // la vitrina: 23 en el acto II y 27 en el III (A0)
  const costHtml = s => (s.vit ? CN() + cardCost(s) : s.fix ? `${CN()}<s class="of-was">${price(s.k === "perk" ? A.RELICS[s.id].cost : TOOLS[s.id].cost)}</s>${cardCost(s)}` : CN() + cardCost(s));
  /* ---------------- PAN DE ORO (v0.51): la carta legendaria ----------------
     El marco de oro con bisel de pixel, la placa de laton, el terciopelo y el halo van en css/campamento.css. Aqui, el brillo de oro que la barre
     a saltos de pixel (como la clase Holo del prototipo aprobado): un lienzo pequeno por carta, 1 pixel de arte = 3 px del lienzo de 1280x720
     redondeado al pixel real de la pantalla (escala entera), pintado a ~20 fps SOLO mientras pasa el brillo (0,9 s de cada 3,6) y la carta sigue
     en pantalla (IntersectionObserver: la mesa del Campamento sigue en el documento durante la ronda, con #layer oculto); el resto del tiempo
     duerme. El tamano llega por ResizeObserver en pixeles reales: nada se mide por fotograma. Con "reducir movimiento", un brillo quieto (salvo
     en la secuencia del cofre) */
  const GLINT = `<span class="lg-halo"></span><span class="lg-clip"><canvas></canvas></span>`;
  const RMQ = matchMedia("(prefers-reduced-motion: reduce)");           // una sola consulta: leer .matches no cuesta nada
  const Gold = (() => {
    const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], WH = [255, 255, 255], G0 = [255, 246, 200], G1 = [255, 217, 90], PER = 3.6, DUR = 0.9;
    const live = new Set(); let raf = 0, tm = 0, last = 0;
    const still = () => { const S = C().S; return !!(S && S.reduce) || RMQ.matches; };
    const wake = () => { clearTimeout(tm); tm = 0; if (!raf) raf = requestAnimationFrame(frame); };
    const ro = window.ResizeObserver ? new ResizeObserver(es => { es.forEach(e => e.target._gold && e.target._gold.note(e)); wake(); }) : null;
    /* se ve o no (display:none de un padre o fuera de la pantalla): lo dice el navegador al cambiar, sin medir nada */
    const io = window.IntersectionObserver ? new IntersectionObserver(es => { es.forEach(e => { if (e.target._gold) e.target._gold.vis = e.isIntersecting; }); wake(); }) : null;
    class Glint {
      constructor(cv) { this.cv = cv; this.clip = cv.parentNode; this.el = this.clip.parentNode; this.ctx = this.im = null; this.t0 = Math.random() * PER; this.W = this.H = this.P = 0; this.pend = null; this.c = null; this.at0 = null; this.dur = DUR; this.live = false; this.vis = !io; this.clip._gold = this; }
      /* el aviso del ResizeObserver solo se apunta: el lienzo cambia de tamano en el fotograma siguiente (no en el de pintar la mesa, el mas cargado) */
      note(e) {
        const b = e.contentBoxSize && e.contentBoxSize[0], d = e.devicePixelContentBoxSize && e.devicePixelContentBoxSize[0];
        const cw = b ? b.inlineSize : e.contentRect.width, ch = b ? b.blockSize : e.contentRect.height;
        if (cw && ch) this.pend = [cw, ch, d ? d.inlineSize : 0, d ? d.blockSize : 0];
      }
      /* lienzo a escala entera de pixel real: P pixeles reales por pixel de arte (3 en 1280x720; 5 a 1,5x) */
      size() {
        const [cw, ch, dw, dh] = this.pend; this.pend = null;
        const r = dw ? dw / cw : (this.el.currentCSSZoom || 1) * (devicePixelRatio || 1), P = Math.max(2, Math.round(3 * r + 0.01));   // +0,01: a 1,5x (4,5) siempre 5, igual en la carta y en la mochila
        const W = Math.ceil((dw || cw * r) / P), H = Math.ceil((dh || ch * r) / P);
        if (W === this.W && H === this.H && P === this.P) return;
        this.W = W; this.H = H; this.P = P; this.cv.width = W; this.cv.height = H; this.cv.style.width = (W * P) / r + "px"; this.cv.style.height = (H * P) / r + "px";
        this.im = null; this.c = null;                                   // cambiar el tamano deja el lienzo en blanco; el contexto y su imagen, al primer brillo
      }
      /* el brillo ahora: la diagonal x + y = c (o null si no pasa). sweep() lo lanza ya, durante dur segundos */
      at(t) {
        let ts, dur = DUR;
        if (this.at0 != null) { ts = t - this.at0; dur = this.dur; if (ts > dur) { this.at0 = null; return null; } } else ts = (t + this.t0) % PER;
        return ts >= 0 && ts < dur ? Math.round(-14 + ((this.W + this.H + 28) * ts) / dur) : null;
      }
      wait(t) { return PER - ((t + this.t0) % PER); }
      sweep(dur) { this.at0 = performance.now() / 1000; this.dur = dur; wake(); }
      /* franja blanca de 3 pixeles, filos crema y un tramado de oro a los lados (Bayer 4x4): solo se recorre la franja */
      paint(c) {
        if (c === this.c || !this.W) return; this.c = c;
        if (!this.im) { this.ctx = this.ctx || this.cv.getContext("2d"); this.im = this.ctx.createImageData(this.W, this.H); }
        const W = this.W, H = this.H, d = this.im.data; d.fill(0);
        if (c != null) for (let y = 0; y < H; y++) for (let x = Math.max(0, c - 6 - y), x1 = Math.min(W - 1, c + 6 - y); x <= x1; x++) {
          const dd = x + y - c, ad = dd < 0 ? -dd : dd, col = ad <= 1 ? WH : ad === 2 || ad === 4 ? G0 : BAY[(y & 3) * 4 + (x & 3)] < 6 ? G1 : null;
          if (!col) continue; const i = (y * W + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = ad <= 1 ? 170 : ad === 2 ? 130 : ad === 4 ? 110 : 85;
        }
        this.ctx.putImageData(this.im, 0, 0);
      }
    }
    function frame(now) {
      raf = 0; const t = now / 1000, rm = still(), due = now - last >= 30; let act = false, soon = Infinity;
      for (const g of live) {
        if (!g.el.isConnected) { live.delete(g); if (ro) ro.unobserve(g.clip); if (io) io.unobserve(g.clip); continue; }
        if (!g.vis) continue;                                              // no se ve: ni pinta ni cuenta para despertar el bucle (con todas ocultas, duerme)
        if (g.pend) g.size();
        if (!g.W) continue;
        if (rm && !g.live) { g.paint(Math.round((g.W + g.H) * 0.32)); continue; }       // quieto: un reflejo fijo
        const c = g.at(t);
        if (c != null || g.c != null || g.at0 != null) act = true; else soon = Math.min(soon, g.wait(t));
        if (due) g.paint(c);
      }
      if (due) last = now;
      if (act) tm = setTimeout(wake, 40); else if (soon < Infinity) tm = setTimeout(wake, Math.max(16, soon * 1000 - 24));   // ~20 fps: un rAF por pintada, no 60
    }
    return {
      /* tras pintar la mesa: un brillo por lienzo nuevo (el tamano llega con el primer aviso del ResizeObserver, ya maquetado) */
      mount: root => { if (!ro) return; root.querySelectorAll(".lg-clip > canvas").forEach(cv => { if (cv.parentNode._gold) return; const g = new Glint(cv); live.add(g); try { ro.observe(g.clip, { box: "device-pixel-content-box" }); } catch (e) { ro.observe(g.clip); } if (io) io.observe(g.clip); }); },
      of: el => { const c = el && el.querySelector(".lg-clip"); return (c && c._gold) || null; },
    };
  })();
  function cardHtml(s, i, chest) {
    const bought = run.bought.includes(i);
    if (s.k === "perk") {
      const p = A.RELICS[s.id];                                           // la carta solo cuenta lo que hace: contra que truco sirve lo descubre el jugador leyendo
      return `<div class="offer pc r${p.r}${s.vit ? " vit" : ""}${bought ? " sold" : ""}" data-ix="${i}" data-suit="${suitRed(p.suit) ? "red" : "blk"}">${p.r === 3 && !bought ? GLINT : ""}${ixs(p.cost, p.suit)}<span class="of-r">${s.vit ? A.tx(VIT_TAG) + " · " : ""}${p.amulet ? A.tx(AMU_TAG) : p.ventaja ? A.tx(VTG_TAG) + (perkList().some(q => q.ventaja && q.id !== s.id) ? " · " + A.tx(VTG_SWAP) : "") : A.tx(R_NAMES[p.r])}${bagN() >= maxPerks() && !p.pact && !bought && !(p.ventaja && perkList().some(q => q.ventaja && q.id !== s.id)) ? " · " + A.tx(SWAP_FOR) : ""}</span><div class="of-ico felt">${ic(p.ico)}</div><b class="of-n">${A.tx(p.n)}</b><p>${A.tx(p.d)}</p><button class="buy${chest ? " sq-fit" : ""}" ${bought ? "disabled" : ""}>${bought ? A.T("Comprado", "Owned") : chest ? A.T("Elegir gratis", "Take for free") : costHtml(s)}</button></div>`;   // sq-fit: "Elegir gratis" en una linea en todos los idiomas
    }
    if (s.k === "tool") {
      const t = TOOLS[s.id], have = run.tools[s.id];
      return `<div class="offer pc otool r${t.r}${bought ? " sold" : ""}" data-ix="${i}" data-suit="blk">${ixs("A", "s_palm")}<span class="of-r">${A.T("Herramienta", "Tool")}</span><div class="of-ico felt">${ic(t.ico)}</div><b class="of-n">${A.tx(t.n)}${have ? ` <em>+1 ${A.T("carga", "charge")}</em>` : ""}</b><p>${A.tx(t.d)}</p><button class="buy" ${bought ? "disabled" : ""}>${bought ? A.T("Comprado", "Owned") : costHtml(s)}</button></div>`;
    }
    return `<div class="offer pc life${bought ? " sold" : ""}" data-ix="${i}" data-suit="red">${ixs("♥", "heart")}<span class="of-r">${A.T("Provisión", "Provision")}</span><div class="of-ico felt">${ic("heart")}</div><b class="of-n">+1 ${A.T("provisión", "provision")}</b><p>${A.tf("Recupera una provisión (máx. {n}).", "Restore a provision (max {n}).", { n: run.maxLives })}</p><button class="buy" ${bought || run.lives >= run.maxLives ? "disabled" : ""}>${CN()}${lifePrice()}</button></div>`;
  }
  /* v0.35 (usuario): Campamento premium. La mochila son cartas pequenas con el color de su rareza: un clic levanta la reliquia y ensena
     "Vender" encima; el segundo clic, en ese boton, la vende (antes un solo clic la vendia sin preguntar). Tambien en el cofre del jefe.
     El boton de "estoy listo" lleva la ficha de la ronda que viene (la misma de su presentacion) y su tema. */
  let swapIx = null;                                                    // carta elegida con la mochila llena: falta decir que reliquia vendes (tanda 9; desde 0.2.21 se dice "vender", no "cambiar")
  const SWAP_FOR = L6("vende una…|sell one…|vends-en une…|venda uma…|verkauf eins…|vendine una…||先卖一件…|하나 팔기…|ひとつ売って…|продай одну…|sprzedaj jeden…"), SWAP_PICK = L6("Elige qué reliquia vendes.|Pick which relic to sell.|Choisis la relique que tu vends.|Escolha qual relíquia vender.|Wähl, welches Relikt du verkaufst.|Scegli quale reliquia vendere.||选一件要卖掉的遗物。|팔 유물을 고르세요.|売るレリックを選んで。|Выбери, какую реликвию продать.|Wybierz, który relikt sprzedać.");
  /* vende la reliquia de la mochila y compra la carta elegida (si con lo que te dan te alcanza) */
  function swapFor(ix, id, chest) {
    const s = run.stock[ix]; swapIx = null; if (!s) return renderShop(chest); const c = chest ? 0 : cardCost(s);
    if (run.coins + sellValue(id) < c) { A.sfx.deny(); return renderShop(chest); }
    sell(id, chest); const el = document.querySelector(`#dlg .offer[data-ix="${ix}"]`); if (el) buy(el, chest);
  }
  const SELL = "Vender|Sell|Vendre|Vender|Verkaufen|Vendi||出售|판매|売る|Продать|Sprzedaj";
  const TAKE = "Te llevas|You take|Tu prends|Você leva|Du bekommst|Prendi||你获得|획득|もらう|Получишь|Dostajesz";
  /* la reliquia en la mochila: carta pequena con el color de su rareza (la legendaria, con su marco de oro y su brillo).
     face: el dibujo como fondo y sin boton de vender (la que aparece al final de la secuencia: ninguna imagen nueva, que haria reajustar la pantalla) */
  const relicHtml = (id, face) => { const p = A.RELICS[id];
    return `<div class="tr-card tr-relic r${p.r}${p.ventaja ? " vtg" : ""}" data-relic="${id}"><button class="tr-face inv-perk" type="button">${p.r === 3 ? GLINT : ""}${face || ic(id)}${id === "hoard" && run.hucha ? `<b class="hc-n">${run.hucha}</b>` : ""}</button></div>`; };
  /* ---- la carta grande de lo que llevas (js/peek.js): al pasar el raton por la mochila o por la barra de la ronda se abre encima, para leerla
     entera. En el Campamento lleva dentro lo que se puede hacer con ella: venderla (tambien para hacer sitio a la carta elegida) o el aviso del Pacto */
  const PK_IN = L6("dentro|inside|dedans|dentro|drin|dentro||在里面|들어 있음|入っている|внутри|w środku"), PK_USES = L6("{n} usos por ronda|{n} uses per round|{n} utilisations par manche|{n} usos por rodada|{n} Anwendungen pro Runde|{n} usi per round||每回合 {n} 次|라운드당 {n}회|1ラウンド{n}回|{n} исп. за раунд|Użycia na rundę: {n}"),
    PK_TOOL = L6("Herramienta|Tool|Outil|Ferramenta|Werkzeug|Strumento||工具|도구|道具|Инструмент|Narzędzie");
  let shopChest = false;                                                // si la mochila que se ve es la del cofre del jefe (para vender desde la carta grande)
  const pkCard = (o, tag, meta, btn) => `<span class="pk-tag">${tag}</span><div class="pk-felt felt">${o.r === 3 ? `<span class="pk-gold"></span>` : ""}${ic(o.ico || o.id)}</div><b class="pk-n">${A.tx(o.n)}</b><p class="pk-d">${A.tx(o.d)}</p>${meta ? `<p class="pk-meta">${meta}</p>` : ""}${btn || ""}`;
  function peekRelic(id, camp) {
    const p = A.RELICS[id]; if (!p || !run) return null;
    const tag = p.amulet ? A.tx(AMU_TAG) : p.ventaja ? A.tx(VTG_TAG) : A.tx(R_NAMES[p.r]), meta = id === "hoard" && run.hucha ? `${CN()}<b>${run.hucha}</b> ${A.tx(PK_IN)}` : "";
    const pact = isPact(id) && bagN() > baseSlots(), mode = !camp ? "" : legOn ? "busy" : pact ? "pact" : swapIx != null && !isPact(id) ? "swap" : "sell";
    const btn = mode === "sell" || mode === "swap" ? `<button class="pk-act sell" type="button"><span>${A.pick6(SELL)}</span><em>${CN()}+${sellValue(id)}</em></button>`   // con la mochila llena tambien se vende: la carta elegida entra en su hueco
      : mode === "pact" ? `<button class="pk-act off" type="button" disabled><span>${A.tx(PACT_FIRST)}</span></button>` : "";
    return { key: `r:${id}:${mode}:${sellValue(id)}`, cls: `r${p.r}${p.amulet ? " amu" : ""}${btn ? " act" : ""}`, html: pkCard({ ...p, id }, tag, meta, btn),
      wire: (card, close) => { const b = card.querySelector(".pk-act:not(.off)"); if (!b) return;
        b.onclick = e => { e.stopPropagation(); if (card.classList.contains("pk-go")) return; card.classList.add("pk-go");
          const go = mode === "swap" ? () => { close(true); if (run && C().S.phase === "shop" && swapIx != null) swapFor(swapIx, id, shopChest); } : () => { close(true); if (run && C().S.phase === "shop" && run.perks.includes(id)) sell(id, shopChest); };
          if (matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("reduce-motion")) go(); else { card.classList.add("pk-sold"); setTimeout(go, 230); } }; } };
  }
  A.peek.on(".table.mesa .tr-relic .tr-face", el => peekRelic(el.parentNode.dataset.relic, true));
  A.peek.on("#advBar .ab-perk", el => peekRelic(el.dataset.id, false));
  A.peek.on(".table.mesa .tr-tool", el => { const id = el.dataset.tool, t = TOOLS[id]; if (!t || !run || !run.tools[id]) return null; const n = toolMax(id);
    return { key: `t:${id}:${n}`, cls: `r${t.r} pk-tool`, html: pkCard(t, A.tx(PK_TOOL), `<span class="pk-pips">${"<i></i>".repeat(n)}</span>${A.tx(PK_USES).replace("{n}", n)}`) }; });
  /* logros del casino: cada jugada deja su registro en run.reds (se guarda ANTES de animar); se cuenta al volver al Campamento, con el resultado ya visto, para que el aviso no destripe el giro */
  function reportCasino() {
    if (!run || !run.reds || !A.profile || !A.profile.casino) return;
    let any = false;
    for (const k in run.reds) {
      const b = run.reds[k]; if (!b || b.rep || !CASINO.includes(b.id)) continue;
      if ((b.id === "globo" || b.id === "rasca") && !b.done) continue;                       // a medias: se cuenta cuando termina
      b.rep = 1; any = true;
      A.profile.casino({ game: b.id, green: b.id === "red" && !!b.win && b.out === "green", edge: b.id === "coin" && b.out === "edge", mult: b.id === "globo" ? (b.cashM || 0) / 1000 : 0 });
    }
    if (any) persist();
  }
  function renderShop(chest) {
    reportCasino();
    legOn = 0; swapIx = null; shopChest = !!chest; A.peek.close(true);  // mesa nueva: si la legendaria se estaba luciendo en la anterior, esa secuencia ya no sigue
    const slots = maxPerks(), info = actInfo(run.act), rc = rerollCost(), r = roundNo(), cf = chalFor(r);
    const cards = run.stock.map((s, i) => cardHtml(s, i, chest)).join("") || `<p class="tb-empty">${A.T("No quedan cartas: ¡sigue adelante!", "No cards left: move on!")}</p>`;
    /* la mochila no avisa de que una reliquia ya no sirve: saber cuando venderla tambien es cosa del jugador */
    const B = bag(), relics = Array.from({ length: slots }, (_, k) => (B[k] ? relicHtml(B[k]) : `<span class="tr-slot${k >= baseSlots() ? " pact" : ""}"></span>`)).join("");   // el hueco del Pacto, con su lacre
    const pactSeal = run.perks.some(isPact) ? `<span class="tr-relic tr-pact r1" data-relic="pact"><button class="tr-face" type="button">${ic("pact")}</button></span>` : "";   // 0.2.23: el Pacto, fuera de los huecos
    const tools = Object.keys(run.tools).map(id => `<span class="tr-card tr-tool" data-tool="${id}" tabindex="0"><span class="tr-face">${ic(TOOLS[id].ico)}<span class="tr-pips">${Array.from({ length: toolMax(id) }, () => "<i></i>").join("")}</span></span></span>`).join("") || `<i class="tr-none">${A.T("Ninguna", "None")}</i>`;
    /* fuera la frase de siempre ("Tres cartas sobre la mesa..."): solo los avisos que cambian algo (revancha, cofre, mochila llena) */
    const retryNote = !chest && run.stock.some((s, i) => s.fix && !run.bought.includes(i));
    const note = chest ? (bagN() >= slots ? A.T("Mochila llena: vende una reliquia.", "Pack full: sell a relic.") : A.T("Elige UNA reliquia gratis. Aquí pueden salir legendarias.", "Pick ONE relic for free. Legendaries can show up here.")) : retryNote ? A.tx(ETX.retry) : "";
    /* antes del jefe, el crupier te reescribe el boton (funciona igual) */
    const doom = !chest && !!cf.boss, DOOM = A.pick6("Ir al matadero|To the slaughter|À l'abattoir|Pro matadouro|Zur Schlachtbank|Al macello||去送死|도살장으로|処刑台へ|На убой|Na rzeź");
    const nd = defAt(r), TN = TOPIC_NAMES[nd.topic], topic = A.tx(TN[Math.min(nd.tier, TN.length - 1)]);
    /* letra de las cartas segun lo llena que va la mesa (retos de la proxima ronda, Ojo en el cielo, avisos): se decide aqui, sin medir nada
       (con container queries cada maquetacion del Campamento costaba el doble y la primera apertura perdia un fotograma) */
    const full = (cf.list.length + cf.paid.length >= 3 ? 1 : 0) + (has("spy") ? Math.min(2, LAST - r) : 0) + (note ? 1 : 0) - (chest ? 1 : 0);   // el cofre no lleva suministros: le sobra sitio
    const dense = Math.max(0, Math.min(2, full + (full > 0 && /^(ru|pl)$/.test(A.lang) ? 1 : 0)));   // ruso y polaco, los textos mas largos de las cartas
    const chip = chest ? ic("chest") : A.blind(cf.boss ? "boss" : run.round === 0 ? "small" : "big", cf.boss ? BOSS_IC : run.round === 0 ? "s_pin" : "s_compass");
    const goB = chest ? A.T("Continuar sin elegir", "Continue without picking") : doom ? DOOM : A.T("Siguiente ronda", "Next round");
    const goI = chest ? `${A.pick6(TAKE)} ${CN()}+${gain(chestSkip())}` : cf.boss ? A.T("Jefe del acto", "Act boss") + (cf.combo ? " · " + A.tx(cf.combo.n) : "") : A.T("Ronda", "Round") + " " + (run.round + 1) + " · " + topic;
    C().dialog(`<div class="table mesa d${dense}${chest ? " chest" : ""}${run.stock.length > 3 ? " many" : ""}">
      <header class="tb-head"><div class="tb-title"><span class="tag">${A.tx(info.n)} · ${actSub(info)}</span><h2>${chest ? A.T("Cofre del jefe", "Boss chest") : A.T("Campamento", "Camp")}</h2>${run.asc ? `<p class="tb-ascd" ${A.ttAttr("A" + run.asc + " · " + A.adv.ascInfo(run.asc).n, A.adv.ascInfo(run.asc).d + (A.adv.ascInfo(run.asc).k ? " " + A.adv.ascInfo(run.asc).k : ""))}><b>A${run.asc} · ${A.adv.ascInfo(run.asc).n}</b> ${A.adv.ascInfo(run.asc).d}</p>` : ""}</div>
        ${routeHtml()}<div class="tb-right"><button class="chipbtn tb-menu" id="shopMenu" type="button">${A.icon("u_pause", "sm")}<span>${A.T("Menú", "Menu")}</span></button><div class="tb-coins" id="shopCoins">${CN()}<b>${run.coins}</b></div></div></header>
      ${nextHtml()}
      ${chest ? "" : supHtml()}
      <section class="tb-shop">${note ? `<p class="tb-note">${note}</p>` : ""}<section class="offers">${cards}</section>
        ${chest ? "" : `<div class="tb-actions"><button class="chipbtn" id="rerollBtn" type="button">${ic("dice", "sm")}<span>${A.T("Cambiar cartas", "New cards")}</span><em>${rc ? CN() + rc : A.T("gratis", "free")}</em></button></div>`}</section>
      <footer class="tb-tray">
        <div class="tray-col tr-relics"><h4>${A.T("Reliquias", "Relics")} <b>${B.length}/${slots}</b>${pactSeal}</h4><div class="tray-row">${relics}</div></div>
        <div class="tray-col tr-tools"><h4>${A.T("Herramientas", "Tools")}</h4><div class="tray-row">${tools}</div></div>
        <div class="tray-col tr-prov"><h4>${A.T("Provisiones", "Provisions")} <b>${run.lives}/${run.maxLives}</b></h4><div class="tray-row hearts">${hearts()}</div></div>
        <button class="go2${doom ? " doom" : ""}${chest ? " skip" : ""}" id="goRound" type="button" data-primary><span class="go2-chip">${chip}</span><span class="go2-t"><b>${goB}</b><i>${goI}</i></span><span class="go2-ar">${A.icon("u_next", "sm")}</span></button></footer></div>`, "tablewrap");
    Gold.mount($("dlg"));                                                // el brillo de oro de las legendarias (mesa y mochila)
    document.querySelectorAll(".offer").forEach((el, i) => { const btn = el.querySelector(".buy"); if (btn) btn.onclick = () => buy(el, chest); if (!chest) el.addEventListener("pointerenter", e => { if (e.pointerType === "mouse" && A.dealer.campHover) A.dealer.campHover(i); }); });
    /* la mochila: pasar el raton abre la carta grande (con su boton de vender); un clic la deja fija. Con una carta de la mesa esperando
       hueco, el clic en la reliquia la vende y entra esa. Tambien en el cofre del jefe: con la mochila llena, vendes una y eliges gratis */
    document.querySelectorAll("#dlg .tr-relic").forEach(c => { const id = c.dataset.relic;
      c.querySelector(".tr-face").onclick = e => { e.stopPropagation(); if (swapIx != null && !isPact(id)) { A.peek.close(true); return swapFor(swapIx, id, chest); } A.peek.toggle(e.currentTarget); }; });
    document.querySelectorAll("#dlg .tr-tool").forEach(c => (c.onclick = e => { e.stopPropagation(); A.peek.toggle(c); }));
    const tb = document.querySelector("#dlg .table.mesa"); if (tb) tb.addEventListener("click", e => { if (swapIx != null && !e.target.closest(".offer")) { swapIx = null; document.querySelectorAll("#dlg .swap-pick, #dlg .swap-src").forEach(x => x.classList.remove("swap-pick", "swap-src")); } });
    if ($("rerollBtn")) $("rerollBtn").onclick = () => {
      if (!tapOnce("reroll")) return;
      const c = rerollCost(); if (run.coins < c) { A.sfx.deny(); shake($("rerollBtn")); return; } run.coins -= c; if (c === 0) run.freeUsed++; else run.rerolls++; run.shopN++; run.stock = null; A.sfx.reroll();
      if (c > 0 && !run.shellDone && (run.paidRerolls = (run.paidRerolls || 0) + 1) >= 2) { run.shellDone = true; persist(); if (A.dealer.campShell) A.dealer.campShell(); return shellCards(() => openShop(false)); }   // el trile: una vez por expedicion
      openShop(false);
    };
    $("shopMenu").onclick = () => C().runMenu();
    document.querySelectorAll("#dlg .nr-buy").forEach(b => (b.onclick = () => bribe(b.dataset.id)));
    if ($("chalReroll")) $("chalReroll").onclick = rerollChal;
    if (!chest) { wireSup(); wireBet(); }
    $("goRound").onclick = () => {
      if (legOn) return;                                                 // la legendaria del cofre aun se esta luciendo (Intro pulsa este boton)
      if (!chest && !run.visitBuys && !run.skipSaid && run.coins >= 8 && Math.random() < 0.5 && A.dealer.campSkip) { run.skipSaid = true; A.dealer.campSkip(run.coins); }   // te vas sin comprar nada (una vez por expedicion)
      run.stock = null; A.peek.close(true);
      if (chest) { const k = gain(chestSkip()); run.coins += k; run.stats.coinsEarned += k; A.sfx.sell(); }   // dejar el cofre sin abrir tambien se cobra (con la mochila llena, el cofre no es papel mojado)
      persist(); chest ? openShop(false) : startRound();
    };
    A.ach.emit("casino", { kind: "hold", coins: run.coins }); A.ach.emit("adv", { kind: "hold", coins: run.coins, perks: run.perks.length });
    if (A.tour) A.tour.maybe("camp");
  }
  /* Suministros de la proxima ronda (se gastan cada ronda: el dinero siempre tiene en que invertirse) */
  /* ---------------- tanda 11: APUESTAS de la Barra (una por visita; aparecen tras vencer a tu primer jefe; en el Reto diario, para todos) ----------------
     Antes de R4 y R8, Doble o nada: te juegas TODOS tus doblones, el jefe trae un reto mas; vencerlo a la primera los dobla (+40 como mucho) y si no,
     los pierdes. Antes de R12, La apuesta final: el jefe trae 2 retos mas; vencerlo a la primera da +2 provisiones para el modo infinito y perder no
     cuesta nada. En las demas visitas, Rojo o negro: tirar cuesta poco y, si aciertas, la proxima ronda paga un 50 % mas y empiezas en racha.
     Los retos de las apuestas van SELLADOS (ni el Comodin ni el soborno los quitan): de los que ya has visto, de una familia que no esta, a nivel 3 */
  const VIT_TAG = L6("Vitrina|Showcase|Vitrine|Vitrine|Vitrine|Vetrina||橱窗|진열장|ショーケース|Витрина|Gablota");
  const PACT_FIRST = L6("Vende antes otra|Sell another first|Vends-en une autre d'abord|Venda outra antes|Verkauf zuerst eine andere|Vendi prima un'altra||先卖掉另一件|다른 걸 먼저 파세요|先に別のを売って|Сначала продай другую|Najpierw sprzedaj inny");
  const BETS = { offer: { n: L6("Oferta de la casa|House offer|Offre de la maison|Oferta da casa|Angebot des Hauses|Offerta della casa||赌场的报价|하우스의 제안|ハウスの申し出|Предложение заведения|Oferta kasyna"), d: L6("Elige cuántos retos de más aceptas en la próxima ronda (de 1 a 3): cobras al momento y entran sellados, a nivel 3.|Choose how many extra challenges you accept next round (1 to 3): you get paid at once and they come in sealed, at level 3.|Choisis combien de défis en plus tu acceptes à la prochaine manche (de 1 à 3) : on te paie tout de suite et ils arrivent scellés, au niveau 3.|Escolha quantos desafios a mais aceita na próxima rodada (de 1 a 3): recebe na hora e eles entram selados, no nível 3.|Wähl, wie viele zusätzliche Herausforderungen du nächste Runde annimmst (1 bis 3): Du kassierst sofort, und sie kommen versiegelt auf Stufe 3.|Scegli quante sfide in più accetti nel prossimo round (da 1 a 3): incassi subito ed entrano sigillate, al livello 3.||选择下一回合多接受几个挑战（1 到 3 个）：立刻拿钱，挑战以 3 级封印加入。|다음 라운드에 받을 추가 도전 수를 고르세요 (1~3): 즉시 돈을 받고, 도전은 3단계로 봉인되어 들어옵니다.|次のラウンドで追加のチャレンジをいくつ受けるか選ぶ（1〜3）：すぐに支払われ、レベル3で封印されて入る。|Выбери, сколько дополнительных испытаний примешь в следующем раунде (от 1 до 3): плата сразу, а они придут запечатанными, на уровне 3.|Wybierz, ile dodatkowych wyzwań przyjmiesz w następnej rundzie (od 1 do 3): zapłatę dostajesz od razu, a wchodzą zapieczętowane, na poziomie 3."), s: L6("Te pago por cada reto de más que aceptes en la próxima ronda.|I'll pay you for each extra challenge you accept next round.|Je te paie pour chaque défi en plus que tu acceptes à la prochaine manche.|Eu te pago por cada desafio a mais que aceitar na próxima rodada.|Ich zahle dir für jede zusätzliche Herausforderung, die du nächste Runde annimmst.|Ti pago per ogni sfida in più che accetti nel prossimo round.||下一回合每多接受一个挑战，我就付你钱。|다음 라운드에 도전을 하나 더 받을 때마다 돈을 주지.|次のラウンドで追加のチャレンジを受けるごとに払おう。|Плачу за каждое дополнительное испытание, которое примешь в следующем раунде.|Płacę za każde dodatkowe wyzwanie, które przyjmiesz w następnej rundzie."), ico: "bet_offer" }, double: { n: L6("Doble o nada|Double or nothing|Quitte ou double|Dobro ou nada|Doppelt oder nichts|Lascia o raddoppia||加倍或归零|더블 오어 낫싱|ダブル・オア・ナッシング|Пан или пропал|Podwójnie albo nic"), d: L6("Te juegas todos tus doblones. El jefe trae un reto más: si lo vences a la primera, los doblas (+40 como mucho); si no, los pierdes.|You stake all your doubloons. The boss brings one more challenge: beat it on the first try and you double them (+40 at most); otherwise you lose them.|Tu mises tous tes doublons. Le boss apporte un défi de plus : bats-le du premier coup et tu les doubles (+40 maximum) ; sinon, tu les perds.|Você aposta todos os seus dobrões. O chefe traz mais um desafio: vença de primeira e você os dobra (+40 no máximo); senão, perde tudo.|Du setzt alle deine Dublonen. Der Boss bringt eine Herausforderung mehr: Besiegst du ihn im ersten Versuch, verdoppelst du sie (höchstens +40), sonst verlierst du sie.|Punti tutti i tuoi dobloni. Il boss porta una sfida in più: battilo al primo colpo e li raddoppi (+40 al massimo); altrimenti li perdi.||押上你所有的金币。首领多带一个挑战：一次击败它，金币翻倍（最多 +40）；否则全输光。|도블론을 전부 겁니다. 보스가 도전을 하나 더 가져옵니다: 한 번에 이기면 두 배 (최대 +40), 아니면 모두 잃습니다.|ダブロンを全部賭ける。ボスはチャレンジを1つ追加してくる。一発で倒せば倍（最大+40）、だめなら全部失う。|Ставишь все дублоны. Босс приносит ещё одно испытание: победишь с первого раза — удвоишь (максимум +40), иначе всё потеряешь.|Stawiasz wszystkie dublony. Boss przynosi jedno wyzwanie więcej: pokonaj go za pierwszym razem, a je podwoisz (maks. +40); inaczej je tracisz."), s: L6("Todos tus doblones contra el jefe: a la primera, ×2 (+40 máx.); si no, nada.|All your doubloons on the boss: first try, ×2 (+40 max); otherwise, nothing.|Tous tes doublons sur le boss : du premier coup, ×2 (+40 max) ; sinon, rien.|Todos os seus dobrões no chefe: de primeira, ×2 (+40 máx.); senão, nada.|Alle Dublonen auf den Boss: im ersten Versuch ×2 (max. +40), sonst nichts.|Tutti i dobloni sul boss: al primo colpo ×2 (+40 max); altrimenti, niente.||全部金币押在首领身上：一次过关 ×2（最多 +40），否则全没。|도블론 전부를 보스에: 한 번에 이기면 ×2 (최대 +40), 아니면 전부 잃음.|全ダブロンをボスに：一発なら×2（最大+40）、だめなら全部失う。|Все дублоны на босса: с первого раза ×2 (макс. +40), иначе ничего.|Wszystkie dublony na bossa: za pierwszym razem ×2 (maks. +40), inaczej nic."), ico: "bet_double" }, final: { n: L6("La apuesta final|The final bet|La mise finale|A aposta final|Der letzte Einsatz|La puntata finale||最后的赌注|마지막 베팅|最後の賭け|Последняя ставка|Ostatni zakład"), d: L6("El jefe final trae 2 retos más. Si lo vences a la primera, +2 provisiones para el modo infinito. Perder no cuesta nada.|The final boss brings 2 more challenges. Beat it on the first try for +2 provisions in infinite mode. Losing costs nothing.|Le boss final apporte 2 défis de plus. Bats-le du premier coup : +2 provisions pour le mode infini. Perdre ne coûte rien.|O chefe final traz mais 2 desafios. Vença de primeira e ganhe +2 provisões para o modo infinito. Perder não custa nada.|Der Endboss bringt 2 Herausforderungen mehr. Besiegst du ihn im ersten Versuch: +2 Proviant für den Endlosmodus. Verlieren kostet nichts.|Il boss finale porta 2 sfide in più. Battilo al primo colpo: +2 provviste per la modalità infinita. Perdere non costa nulla.||最终首领多带 2 个挑战。一次击败它，无尽模式补给 +2。输了也不亏。|최종 보스가 도전을 2개 더 가져옵니다. 한 번에 이기면 무한 모드 식량 +2. 져도 잃는 건 없습니다.|最終ボスはチャレンジを2つ追加してくる。一発で倒せばエンドレスモード用に食料+2。負けても失うものはない。|Финальный босс приносит ещё 2 испытания. Победишь с первого раза — +2 запаса для бесконечного режима. Проигрыш ничего не стоит.|Ostatni boss przynosi 2 wyzwania więcej. Pokonaj go za pierwszym razem: +2 zapasy na tryb nieskończony. Przegrana nic nie kosztuje."), s: L6("El jefe final trae 2 retos más. A la primera: +2 provisiones.|The final boss brings 2 more challenges. First try: +2 provisions.|Le boss final apporte 2 défis de plus. Du premier coup : +2 provisions.|O chefe final traz mais 2 desafios. De primeira: +2 provisões.|Der Endboss bringt 2 Herausforderungen mehr. Im ersten Versuch: +2 Proviant.|Il boss finale porta 2 sfide in più. Al primo colpo: +2 provviste.||最终首领多带 2 个挑战。一次过关：补给 +2。|최종 보스가 도전 2개 추가. 한 번에 이기면 식량 +2.|最終ボスにチャレンジ2つ追加。一発なら食料+2。|Финальный босс приносит ещё 2 испытания. С первого раза: +2 запаса.|Ostatni boss przynosi 2 wyzwania więcej. Za pierwszym razem: +2 zapasy."), ico: "bet_final" }, red: { n: L6("Rojo o negro|Red or black|Rouge ou noir|Vermelho ou preto|Rot oder Schwarz|Rosso o nero||红或黑|빨강 또는 검정|赤か黒|Красное или чёрное|Czerwone czy czarne"), d: L6("Elige color y gira. Si aciertas, la próxima ronda paga un 50 % más y empiezas en racha. Si fallas, pierdes la cuota y la ronda trae un reto más (sellado, a nivel 3).|Pick a color and spin. If you're right, the next round pays 50% more and you start on a streak. If you're wrong, you lose the fee and the round brings one more challenge (sealed, level 3).|Choisis une couleur et lance. Si tu as raison, la prochaine manche paie 50 % de plus et tu commences en série. Si tu as tort, tu perds la mise et la manche apporte un défi de plus (scellé, niveau 3).|Escolha uma cor e gire. Se acertar, a próxima rodada paga 50% a mais e você começa em sequência. Se errar, perde a taxa e a rodada traz mais um desafio (selado, nível 3).|Wähl eine Farbe und dreh. Liegst du richtig, zahlt die nächste Runde 50 % mehr und du startest mit Serie. Liegst du falsch, verlierst du den Einsatz und die Runde bringt eine Herausforderung mehr (versiegelt, Stufe 3).|Scegli un colore e gira. Se indovini, il prossimo round paga il 50% in più e parti in serie. Se sbagli, perdi la quota e il round porta una sfida in più (sigillata, livello 3).||选一种颜色然后转动。猜中的话，下一回合奖励多 50%，并且开局就有连击。猜错的话，输掉费用，该回合多一个挑战（3 级封印）。|색을 고르고 돌리세요. 맞히면 다음 라운드 보상이 50% 늘고 연속 기록을 안고 시작합니다. 틀리면 참가비를 잃고 라운드에 도전이 하나 더 붙습니다 (봉인, 3단계).|色を選んで回す。当たれば次のラウンドの報酬が50%増え、連続正解つきで始まる。はずれると参加費を失い、ラウンドにチャレンジが1つ増える（封印、レベル3）。|Выбери цвет и крути. Угадаешь — следующий раунд платит на 50% больше, и ты начинаешь с серией. Не угадаешь — потеряешь взнос, и в раунде станет на одно испытание больше (запечатанное, 3-й уровень).|Wybierz kolor i zakręć. Jeśli trafisz, następna runda płaci 50% więcej i zaczynasz z serią. Jeśli spudłujesz, tracisz opłatę, a runda dostaje jedno wyzwanie więcej (zapieczętowane, poziom 3)."), s: L6("Aciertas: +50 % y racha. Fallas: un reto más.|Win: +50% and a streak. Lose: one more challenge.|Gagné : +50 % et série. Perdu : un défi de plus.|Acerta: +50% e sequência. Erra: um desafio a mais.|Treffer: +50 % und Serie. Daneben: eine Herausforderung mehr.|Indovini: +50% e serie. Sbagli: una sfida in più.||猜中：+50% 并有连击。猜错：多一个挑战。|맞히면 +50%와 연속 기록. 틀리면 도전 +1.|当たり：+50%と連続正解。はずれ：チャレンジ+1。|Угадаешь: +50 % и серия. Мимо: ещё одно испытание.|Trafisz: +50% i seria. Pudło: jedno wyzwanie więcej."), ico: "bet_red" } };
  const BT = { red: L6("Rojo|Red|Rouge|Vermelho|Rot|Rosso||红|빨강|赤|Красное|Czerwone"), black: L6("Negro|Black|Noir|Preto|Schwarz|Nero||黑|검정|黒|Чёрное|Czarne"), go: L6("Apostar|Bet|Miser|Apostar|Setzen|Punta||下注|베팅|賭ける|Ставлю|Stawiam"), on: L6("Apostado|Bet placed|Misé|Apostado|Gesetzt|Puntato||已下注|베팅함|賭けた|Ставка сделана|Postawione"), won: L6("¡Aciertas!|You win!|Gagné !|Acertou!|Gewonnen!|Hai vinto!||猜中了！|맞혔다!|当たり！|В точку!|Trafione!"), lost: L6("Fallas|You lose|Perdu|Errou|Verloren|Hai perso||没猜中|빗나감|はずれ|Мимо|Pudło"), sold: L6("Vendido|Sold|Vendu|Vendido|Verkauft|Venduto||成交|판매 완료|成立|Продано|Sprzedane"), pact: L6("Pacto|Pact|Pacte|Pacto|Pakt|Patto||契约|계약|契約|Договор|Pakt"), seal: L6("Apuesta|Bet|Pari|Aposta|Wette|Scommessa||赌注|베팅|賭け|Ставка|Zakład"), lives2: L6("+2 provisiones|+2 provisions|+2 provisions|+2 provisões|+2 Proviant|+2 provviste||+2 补给|식량 +2|+2 食料|+2 запаса|+2 zapasy") };
  A.adv.BET_SEAL = BT.seal;
  /* v0.73: la ruleta con cero (la rueda europea: 37 casillas, una verde). Verde apostado y acertado: te saltas el acto; verde ajeno: gana la casa */
  const BT2 = { green: L6("Verde|Green|Vert|Verde|Grün|Verde||绿|초록|緑|Зелёное|Zielone"), zero: L6("Cero|Zero|Zéro|Zero|Null|Zero||零|0|ゼロ|Ноль|Zero"),
    skip: L6("¡Te saltas el acto!|You skip the act!|Tu sautes l'acte !|Você pula o ato!|Du überspringst den Akt!|Salti l'atto!||跳过这一幕！|막을 건너뜁니다!|幕を飛ばす！|Акт пропущен!|Przeskakujesz akt!"),
    toFinal: L6("¡Directo al jefe final!|Straight to the final boss!|Direct au boss final !|Direto ao chefe final!|Direkt zum Endboss!|Dritto al boss finale!||直达最终首领！|곧장 최종 보스로!|そのまま最終ボスへ！|Прямо к финальному боссу!|Prosto do ostatniego bossa!"),
    extra: L6("+1 reto|+1 challenge|+1 défi|+1 desafio|+1 Herausforderung|+1 sfida||+1 挑战|도전 +1|チャレンジ+1|+1 испытание|+1 wyzwanie"),
    noMore: L6("NO VA MÁS|NO MORE BETS|RIEN NE VA PLUS|FIM DAS APOSTAS|NICHTS GEHT MEHR|NULLA VA PIÙ||停止下注|베팅 마감|ベット終了|СТАВКИ СДЕЛАНЫ|KONIEC ZAKŁADÓW"),
    house: L6("Gana la casa|The house wins|La maison gagne|A casa ganha|Das Haus gewinnt|Vince il banco||庄家赢|하우스 승리|ハウスの勝ち|Заведение выигрывает|Kasyno wygrywa"),
    tip: L6("1 entre 37: si sale, te saltas el acto entero (en el último, vas directo al jefe final). Si sale y no lo elegiste, gana la casa.|1 in 37: if it hits, you skip the whole act (in the last one, straight to the final boss). If it hits and you didn't pick it, the house wins.|1 sur 37 : s'il sort, tu sautes l'acte entier (au dernier, direct au boss final). S'il sort sans que tu l'aies choisi, la maison gagne.|1 em 37: se sair, você pula o ato inteiro (no último, vai direto ao chefe final). Se sair e você não escolheu, a casa ganha.|1 zu 37: Kommt Grün, überspringst du den ganzen Akt (im letzten geht's direkt zum Endboss). Kommt Grün und du hast nicht darauf gesetzt, gewinnt das Haus.|1 su 37: se esce, salti l'intero atto (nell'ultimo, dritto al boss finale). Se esce e non l'hai scelto, vince il banco.||1/37 的概率：开出就跳过整幕（最后一幕则直达最终首领）。开出但你没选，庄家赢。|37분의 1: 나오면 막 전체를 건너뜁니다 (마지막 막에서는 곧장 최종 보스). 나왔는데 고르지 않았다면 하우스가 이깁니다.|37分の1：出れば幕を丸ごと飛ばす（最後の幕では最終ボスへ直行）。出たのに選んでいなければ、ハウスの勝ち。|1 из 37: выпадет — пропускаешь весь акт (в последнем — сразу к финальному боссу). Выпадет без твоей ставки — выигрывает заведение.|1 do 37: jeśli wypadnie, przeskakujesz cały akt (w ostatnim — prosto do ostatniego bossa). Jeśli wypadnie bez twojego zakładu, wygrywa kasyno.") };
  /* v0.2.8: la Barra es una fila de TRES casillas de juego. En el centro, SIEMPRE Rojo o negro. A los lados, dos sorteados por ronda entre los demas:
     los suministros (Seguro, Cafe doble) y las apuestas que tocan en esa ronda (Oferta de la casa en su Campamento sorteado; Doble o nada / La apuesta
     final antes de cada jefe: salian siempre y no se pierden). Lo que ya tienes puesto (apuesta o suministro activo) no se esconde. Un juego nuevo de
     casino entra en SIDE_GAMES y en barOf. */
  const casOf = r => { const R = run.reds && run.reds[r]; if (R) return R; const b = (run.bets || {})[r]; if (b && b.id === "red") { run.reds = run.reds || {}; run.reds[r] = b; delete run.bets[r]; return b; } return null; };   // las partidas guardadas con Rojo o negro en run.bets se mudan solas
  const CASINO = ["red", "coin", "wheel", "cups"];                              // los juegos del centro; cada ronda sortea uno (la semilla) y se queda con el
  const casinoKind = r => { const R = casOf(r); return R && CASINO.includes(R.id) ? R.id : A.adv._casinoForce || A.rng(`${run.seed}:casino:${r}`).pick(CASINO); };   // _casinoForce: solo pruebas
  const SIDE_GAMES = ["offer", "double", "final"];
  const sideRound = r => (r > LAST ? null : r % 4 === 3 ? (r === LAST ? "final" : "double") : "offer");   // la apuesta lateral que toca en la ronda r: antes de cada jefe la suya; en los demas Campamentos (desde el primero), la Oferta de la casa
  function sideOk(k, r) {
    const b = (run.bets || {})[r]; if (b && b.id === k) return true;                      // la que ya pusiste se queda
    if (run.attempt > 0) return false;
    if (k === "offer") return 4 - chalFor(r).list.length >= 1 && pickSealed(r, 1, "oferta").length === 1;
    return run.lives > 1 && chalFor(r).list.filter(c => !c.x4).length + (k === "final" ? 2 : 1) <= 5 && (k !== "double" || run.coins >= 1);
  }
  function barOf(r) {                                                     // [izquierda, derecha]; se fija por ronda e intento (la tienda se redibuja a cada compra)
    const key = r + ":" + (run.attempt || 0); if (run.bar && run.bar.key === key) return run.bar.s;
    casOf(r);                                                             // mueve a su sitio un Rojo o negro de una partida vieja
    const rr = A.rng(`${run.seed}:barra:${r}`), b = (run.bets || {})[r], open = betsOpen() && !run.inf;   // aun sin apuestas abiertas (antes de tu primer jefe): solo los suministros
    const sd = open ? (b ? b.id : sideRound(r)) : null, bet = sd && sideOk(sd, r) ? sd : null;
    const sup = rr.shuffle(["seguro", "cafe"]).sort((x, y) => (run.sup && run.sup[y] ? 1 : 0) - (run.sup && run.sup[x] ? 1 : 0));   // a la izquierda, un suministro (el que ya tengas activo, primero)
    const s = [sup[0], bet];                                                // derecha: SIEMPRE una apuesta (o hueco si esa ronda no toca ninguna)
    run.bar = { key, s }; return s;
  }
  const offerPay = c => { const d = A.CHAL[c.id]; return Math.max(1, Math.round(0.6 * (3 + 2 * (c.lv || 3) + (d.kind === "map" ? 1 : 0)) * ascFx(run.asc).price * inflation())); };   // el 60 % del soborno base, sin la escalada
  const betsOpen = () => true;   // la Barra de tres casillas (suministro, casino, apuesta) sale en TODOS los Campamentos, desde el primero
  const redCost = () => price(2);
  /* n retos sellados para la ronda r: de familias que no estan, sin chocar con la ronda (texto en banderas, la placa, Memoria de pez...) */
  function pickSealed(r, n, tag, baseList) {
    const D = A.CHAL, base = baseList || chalFor(r).list, fs = new Set(base.map(c => D[c.id].fam)), flag = defAt(r).topic === "flag", topic = defAt(r).topic, txt = base.some(c => D[c.id].kind === "text");
    const bad = id => (flag ? D[id].kind === "text" : D[id].kind === "flag") || (txt && D[id].kind === "text") || (run.cjk && id === "runes") || ((topic === "country" || topic === "clue") && (id === "nocountry" || id === "fakepass")) || (topic === "clue" && id === "ticker") || (run.cjk && id === "ticker") || (topic === "clue" && id === "riddle") || (id === "memory" && base.some(c => c.id === "hang" || c.id === "battery")) || ((id === "hang" || id === "battery") && base.some(c => c.id === "memory"));
    let pool = Object.keys(D).filter(id => !D[id].sub && !D[id].boss && D[id].kind !== "rule" && id !== "dark" && !fs.has(D[id].fam) && !bad(id));
    if (!run.board && run.chSeen0) { const seen = pool.filter(id => run.chSeen0.includes(id)); if (seen.length >= n) pool = seen; }   // de los que ya has visto
    const rr = A.rng(`${run.seed}:${tag}:${r}`), got = [];
    for (const id of rr.shuffle(pool)) { if (fs.has(D[id].fam)) continue; got.push({ id, lv: 3 }); fs.add(D[id].fam); if (got.length === n) break; }
    return got;
  }
  /* la carta de la apuesta en la Barra (tapete rojo) */
  function betHtml(k) {
    const r = roundNo(); if (run.inf || r > LAST || !betsOpen()) return "";   // el juego de casino del centro sale en TODOS los Campamentos; solo las apuestas laterales esperan a tu primer jefe
    const b = CASINO.includes(k) ? casOf(r) : (run.bets || {})[r], B = BETS[k], cf = chalFor(r), head = `<span class="sp-ic">${ic(B.ico)}</span><span class="sp-t" data-tt="${A.tx(B.d).replace(/"/g, "&quot;")}"><b>${A.tx(B.n)}</b><i>${A.tx(B.s)}</i></span>`;   // en la carta, el texto corto; el entero, en el globo
    if (k === "offer") {
      if (b && b.id === "offer") return `<div class="sup bet on bt-offer" data-bet="offer" role="button" tabindex="0">${head}<em class="sp-on">${A.tx(BT.sold)} · ${b.retos.length} · +${CN()}${b.pay}</em></div>`;
      const room = 4 - cf.list.length; if (room < 1 || run.attempt > 0) return "";
      const opts = [1, 2, 3].filter(n => n <= room).map(n => { const rs = pickSealed(r, n, "oferta"); return rs.length === n ? `<button class="bt-c bt-n" type="button" data-n="${n}">${n}<span>+${CN()}${rs.reduce((m, c) => m + offerPay(c), 0)}</span></button>` : ""; }).join("");
      return opts ? `<div class="sup bet bt-offer" data-bet="offer">${head}<span class="bt-pick">${opts}</span></div>` : "";
    }
    if (k === "coin") {
      const att = run.attempt || 0, edge = b && b.out === "edge";
      if (b && b.att === att) return `<div class="sup bet cas bt-coin done ${b.win ? "win" : "lose"}" data-bet="coin">${head}<em class="bt-res"><b>${A.tx(CT[b.out])}</b>${A.tx(edge ? CT.edgeMsg : b.win ? BT.won : BT.lost)}${b.pay ? " · +" + b.pay : ""}</em></div>`;
      return `<div class="sup bet cas bt-coin" data-bet="coin">${head}<span class="bt-pick"><button class="bt-c bt-ch" type="button" data-side="heads">${A.tx(CT.heads)}</button><button class="bt-c bt-ct" type="button" data-side="tails">${A.tx(CT.tails)}</button><em class="sp-p bt-stake" role="button" tabindex="0">${CN()}${coinCost(coinStake)}</em></span></div>`;
    }
    if (CASINO_EXT[k]) return CASINO_EXT[k].card(Object.assign(Object.create(CX), { b, head, att: run.attempt || 0 }));   // v0.2.49: los juegos que viven en js/casino-*.js
    if (k === "cups") {
      const att = run.attempt || 0; cupsPreload();
      if (b && b.att === att) {
        if (b.pick == null && !rouOpen) { b.pick = -1; b.win = false; b.pay = 0; persist(); }   // se cerro el juego a mitad del baile: el crupier se guarda la ficha
        return `<div class="sup bet cas bt-cups done ${b.win ? "win" : "lose"}" data-bet="cups">${head}<em class="bt-res"><b>${A.tx(b.joke ? TRL.joke : b.win ? BT.won : BT.lost)}</b>${b.pay ? "+" + b.pay : ""}</em></div>`;
      }
      return `<div class="sup bet cas bt-cups" data-bet="cups">${head}<span class="bt-pick"><button class="bt-c bt-cu" type="button" data-play="1">${A.tx(TRL.play)}</button><em class="sp-p bt-stake" role="button" tabindex="0">${CN()}${coinCost(cupsStake)}</em></span></div>`;
    }
    if (k === "wheel") {
      const att = run.attempt || 0, P = b && PRIZES[b.w];
      if (b && b.att === att && P) return `<div class="sup bet cas bt-wheel done ${P.t === "good" ? "win" : "lose"}" data-bet="wheel">${head}<em class="bt-res"><b>${A.tx(WT[P.k])}</b>${b.val ? (b.val > 0 ? "+" : "") + b.val : ""}</em></div>`;
      return `<div class="sup bet cas bt-wheel" data-bet="wheel">${head}<span class="bt-pick"><button class="bt-c bt-cs" type="button" data-spin="1">${A.tx(CT.spin)}</button><em class="sp-p">${CN()}${wheelCost()}</em></span></div>`;
    }
    if (k === "red") {
      const att = run.attempt || 0;
      if (b && b.att === att) { const gn = b.out === "green"; return `<div class="sup bet cas bt-red done ${b.win ? "win" : "lose"}${gn ? " zero" : ""}" data-bet="red">${head}<em class="bt-res"><b>${A.tx(gn ? BT2.zero : b.out === "red" ? BT.red : BT.black)}${b.n != null ? " · " + b.n : ""}</b>${A.tx(gn ? BT2.house : b.win ? BT.won : BT.lost)}${b.retos && b.retos.length ? " · " + A.tx(BT2.extra) : ""}</em></div>`; }
      return `<div class="sup bet cas bt-red" data-bet="red">${head}<span class="bt-pick"><button class="bt-c bt-cr" type="button" data-pick="red">${A.tx(BT.red)}</button><button class="bt-c bt-cb" type="button" data-pick="black">${A.tx(BT.black)}</button>${r < LAST ? `<button class="bt-c bt-cg" type="button" data-pick="green" ${A.ttAttr(A.tx(BT2.green), A.tx(BT2.tip))}>${A.tx(BT2.green)}</button>` : ""}<em class="sp-p">${CN()}${redCost()}</em></span></div>`;
    }
    if (b && b.id === k) return `<div class="sup bet on bt-${k}" data-bet="${k}" role="button" tabindex="0">${head}<em class="sp-on">${A.tx(BT.on)}${k === "double" ? " · " + CN() + b.stake : ""}</em></div>`;
    if (!sideOk(k, r)) return "";
    return `<div class="sup bet bt-${k}" data-bet="${k}" role="button" tabindex="0">${head}<em class="sp-p bt-go">${A.tx(BT.go)}${k === "double" ? " · " + CN() + run.coins : ""}</em></div>`;
  }
  function wireBet() { document.querySelectorAll("#dlg .sup.bet").forEach(wireOneBet); }
  function wireOneBet(el) {
    const r = roundNo(), k = el.dataset.bet;
    if (k === "offer") {
      el.querySelectorAll("[data-n]").forEach(btn => (btn.onclick = e => {
        e.stopPropagation(); const retos = pickSealed(r, +btn.dataset.n, "oferta"), pay = retos.reduce((m, c) => m + offerPay(c), 0);
        run.bets = run.bets || {}; run.bets[r] = { id: "offer", retos, pay }; run.coins += pay; persist(); renderShop(false);
        A.sfx.jackpot(1); if (A.core.jpShake) A.core.jpShake(1); A.dealer.enable(true); A.dealer.say(A.dealer.line("betDeal"), { mood: "laugh", hold: 2400 });   // lluvia de monedas
      }));
      el.onclick = () => { const b = (run.bets || {})[r]; if (!b || b.id !== "offer") return; if (run.coins < b.pay) { A.sfx.deny(); shake(el); return; } run.coins -= b.pay; delete run.bets[r]; A.sfx.sell(); persist(); renderShop(false); };   // en la misma visita, te echas atras devolviendo lo cobrado
      return;
    }
    if (k === "coin") {
      const pill = el.querySelector(".bt-stake");
      if (pill) pill.onclick = e => { e.stopPropagation(); coinStake = (coinStake + 1) % COIN_STAKES.length; pill.innerHTML = CN() + coinCost(coinStake); A.sfx.tick(1); };   // el precio se cambia con un clic en la ficha
      el.querySelectorAll("[data-side]").forEach(btn => (btn.onclick = e => {
        e.stopPropagation(); if (rouOpen) return; const stake = coinCost(coinStake); if (run.coins < stake) { A.sfx.deny(); shake(el); return; }
        const att = run.attempt || 0, u = A.rng(`${run.seed}:moneda:${r}:${att}`)(), pick = btn.dataset.side;
        const out = u < 1 / 64 ? "edge" : (u - 1 / 64) / (63 / 64) < 0.5 ? "heads" : "tails", win = out === pick, pay = out === "edge" ? stake * 6 : win ? stake * 2 : 0;   // 1 de cada 64 cae de canto
        run.coins += pay - stake; if (pay > stake) run.stats.coinsEarned += pay - stake;
        run.reds = run.reds || {}; run.reds[r] = { id: "coin", pick, out, win: win || out === "edge", att, stake, pay };
        persist(); A.sfx.rouBet(pick === "heads" ? 0 : 1); if (A.haptic) A.haptic([10]);
        { const cb = document.querySelector("#shopCoins b"); if (cb) cb.textContent = run.coins - pay; }
        spinCoin({ pick, out, win, pay, stake }, () => { if (!run || C().S.phase !== "shop" || !run.stock) return; renderShop(false); });
      }));
      return;
    }
    if (CASINO_EXT[k]) return CASINO_EXT[k].wire(el, Object.assign(Object.create(CX), { r }));
    if (k === "cups") {
      const pill = el.querySelector(".bt-stake");
      if (pill) pill.onclick = e => { e.stopPropagation(); cupsStake = (cupsStake + 1) % COIN_STAKES.length; pill.innerHTML = CN() + coinCost(cupsStake); A.sfx.tick(1); };   // el precio se cambia con un clic en la ficha (y con el, lo rapido que mezcla)
      const btn = el.querySelector("[data-play]"); if (!btn) return;
      btn.onclick = e => {
        e.stopPropagation(); if (rouOpen) return; const tier = cupsStake % COIN_STAKES.length, stake = coinCost(cupsStake); if (run.coins < stake) { A.sfx.deny(); shake(el); return; }
        const att = run.attempt || 0, u = A.rng(`${run.seed}:trile:${r}:${att}`), coinId = Math.floor(u() * 3), joke = A.adv._cupsJoke != null ? !!A.adv._cupsJoke : u() < 1 / 50;   // donde esta el doblon y el chiste del trilero (1 de cada 50): decididos por la semilla (_cupsJoke: solo pruebas)
        run.coins -= stake; run.reds = run.reds || {};
        const rec = (run.reds[r] = { id: "cups", att, stake, coin: coinId, joke, pick: null, win: false, pay: 0 });   // la ficha ya esta pagada: recargar a mitad del baile = el crupier se la queda
        persist(); A.sfx.rouBet(1); if (A.haptic) A.haptic([10]);
        const upd = () => { const cb = document.querySelector("#shopCoins b"); if (cb) cb.textContent = run.coins; }; upd();
        spinCups({ stake, tier, coinId, joke, seq: cupsMoves(`${run.seed}:trile:baile:${r}:${att}`, tier),
          onPick(id) { rec.pick = id; rec.win = !joke && id === coinId; rec.pay = rec.win ? stake * 2 : 0; if (rec.pay) { run.coins += rec.pay; run.stats.coinsEarned += rec.pay - stake; } persist(); upd(); return rec; },   // se decide y se guarda ANTES de la revelacion
          onError() { if (rec.pick == null) { run.coins += stake; if (run.reds && run.reds[r] === rec) delete run.reds[r]; persist(); upd(); } } },   // un fallo de la pantalla no se come la ficha
          () => { if (!run || C().S.phase !== "shop" || !run.stock) return; renderShop(false); });
      };
      return;
    }
    if (k === "wheel") {
      const spinBtn = el.querySelector("[data-spin]"); if (!spinBtn) return;                // ya tirada en este intento: solo el resultado
      spinBtn.onclick = e => {
        e.stopPropagation(); if (rouOpen) return; const c = wheelCost(); if (run.coins < c) { A.sfx.deny(); shake(el); return; }
        const att = run.attempt || 0, w = Math.floor(A.rng(`${run.seed}:premios:${r}:${att}`)() * PRIZES.length), rec = { id: "wheel", w, att };
        run.coins -= c; run.reds = run.reds || {}; run.reds[r] = rec; const afterFee = run.coins;
        const info = applyPrize(PRIZES[w], rec, r); run.bar = null;       // el premio puede ser un suministro: la Barra se vuelve a montar
        persist(); A.sfx.rouBet(2); if (A.haptic) A.haptic([10]);
        { const cb = document.querySelector("#shopCoins b"); if (cb) cb.textContent = afterFee; }
        spinWheel({ w, info }, () => { if (!run || C().S.phase !== "shop" || !run.stock) return; renderShop(false); });
      };
      return;
    }
    if (k === "red") {
      el.querySelectorAll("[data-pick]").forEach(btn => (btn.onclick = e => {
        e.stopPropagation(); if (rouOpen) return; const c = redCost(); if (run.coins < c) { A.sfx.deny(); shake(el); return; }
        const att = run.attempt || 0, n = Math.floor(A.rng(`${run.seed}:rojo:${r}:${att}`)() * 37), out = colorOf(n), pick = btn.dataset.pick;   // la rueda europea: 18 rojos, 18 negros y el cero
        run.coins -= c; run.reds = run.reds || {}; const win = pick === out;
        const extra = !win && chalFor(r).list.length < 5 ? pickSealed(r, 1, "rojoextra") : [];   // fallar: la cuota ya esta perdida y la ronda trae un reto mas (sellado, nivel 3; con 5 retos ya no cabe)
        run.reds[r] = { id: "red", pick, out, n, win, att }; if (extra.length) run.reds[r].retos = extra;
        const skip = win && out === "green" ? greenSkip() : null;   // el salto ya esta hecho y guardado antes de girar: recargar a medias no lo deshace (la ruleta solo lo ensena)
        persist();
        A.sfx.rouBet(pick === "green" ? 2 : pick === "red" ? 0 : 1); if (A.haptic) A.haptic([10]);   // la ficha cae al instante: el clic nunca se queda mudo
        { const cb = document.querySelector("#shopCoins b"); if (cb) cb.textContent = run.coins; }
        spinRoulette({ pick, n, skip, last: skip === "final", extra: extra.length > 0 }, () => { if (!run || C().S.phase !== "shop") return; if (skip) openShop(false); else if (run.stock) renderShop(false); });
      }));
      return;
    }
    el.onclick = () => {
      run.bets = run.bets || {}; const b = run.bets[r];
      if (b && b.id === k) { if (k === "double") run.coins += b.stake; delete run.bets[r]; A.sfx.sell(); persist(); return renderShop(false); }   // en la misma visita, te echas atras
      const retos = pickSealed(r, k === "final" ? 2 : 1, k === "final" ? "final" : "doble"); if (!retos.length) { A.sfx.deny(); shake(el); return; }
      run.bets[r] = { id: k, retos, stake: k === "double" ? run.coins : 0 }; if (k === "double") run.coins = 0;
      A.sfx.chip(0.2); setTimeout(() => A.sfx.chip(0.6), 120); setTimeout(() => A.sfx.stamp(), 260); persist(); renderShop(false);
      A.dealer.enable(true); A.dealer.say(A.dealer.line("betDeal"), { mood: "sly", hold: 2400 });   // cierra el trato
    };
  }
  /* ---------------- la ruleta lineal de Rojo o negro (v0.73) ----------------
     Una banda a pantalla completa con las 37 casillas de la rueda europea, en su orden real (el 0 verde, 18 rojos, 18 negros). Un puntero dorado
     fijo en el centro; la tira arranca a toda velocidad y se asienta en la ganadora (1,5-5 s) con un final sorteado del carrete (ROU_REEL, v0.2.47).
     Todo el resultado ya esta decidido y guardado: esto solo lo ensena. Pixel art: casillas de ancho entero, posiciones redondeadas al pixel,
     nada de medir la maquetacion por fotograma (la tira se mueve solo con transform). */
  const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];   // el orden de la rueda
  const REDN = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const colorOf = n => (n === 0 ? "green" : REDN.has(n) ? "red" : "black");
  let rouOpen = false;
  /* el salto del verde apostado y acertado: actos I y II, al Campamento de la ronda 1 del acto siguiente (sin jefe ni cofre); en el III, al jefe final */
  function greenSkip() {
    const last = run.act + 1 >= 3;
    if (last && run.round >= 3) return null;                          // ya ibas al jefe final (en la ronda 12 no se ofrece el verde)
    if (last) run.round = 3;
    else { run.act++; run.round = 0; run.livesLostAct = 0; const l0 = run.lives; perkList().forEach(p => p.actStart && p.actStart(run)); if (run.lives > l0) run.healAct = run.act; }
    run.attempt = 0; run.stock = null;
    return last ? "final" : "act";
  }
  /* ---------------- el carrete de finales (v0.2.47) ----------------
     La tira acababa siempre igual (frenaba, rozaba la casilla contigua, que por la alternancia de la rueda es SIEMPRE de otro color, y volvia): previsible.
     Ahora cada giro sortea un FINAL del carrete y una DIRECCION. El resultado ya esta decidido y guardado: esto solo elige COMO se ensena.
     Cada final es una lista de tramos { d: segundos, to: casillas que le faltan, e: curva, ev: aviso }; la ruleta los recorre con
     r(t) = lo que le falta a la tira para el centro de la casilla ganadora (positivo: aun no llega; negativo: se ha pasado).
     Nada del final depende de lo apostado ni de si se gana (delataria): los falsos finales paran en una casilla cualquiera, del mismo color o de otro. */
  const rouE = { out: p => x => 1 - Math.pow(1 - x, p), io: x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2), lin: x => x,
    ramp: (v0, v1) => y => (2 * v0 * y - (v0 - v1) * y * y) / (v0 + v1) };                      // frena de v0 a v1 (casillas por segundo) sin saltos de velocidad
  const rouU = (a, b) => a + Math.random() * (b - a), rouI = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const rouWarp = t => (t < 0.16 ? (t * t) / 0.32 : t - 0.08);                                  // arranque con 0,16 s de aceleracion (la velocidad es continua en el empalme)
  const ROU_REEL = {
    classic: { ext: 1, plan: (sc = 1) => {                  // el de siempre: frena, roza la casilla contigua y se arrastra de vuelta; ahora tambien puede quedarse corto
      const off = rouU(0.55, 0.85), r1 = Math.random() < 0.55 ? -off : off;
      return { r0: rouU(80, 115) * sc, segs: [{ d: rouU(2.05, 2.3), to: r1, e: rouE.out(3.6) }, { d: 0.55, to: 0, ev: "crawl" }] }; } },
    brake: { ext: 0.3, hit: 14, plan: (sc = 1) => {         // a tope y frenazo en seco, con un golpecito al parar
      const v0 = rouU(100, 135) * sc, v1 = rouU(46, 56) * sc, d1 = rouU(1.15, 1.45), d2 = rouU(0.5, 0.7), p = rouU(2.1, 2.6), rb = (v1 * d2) / p - 0.16;   // rb: lo que recorre frenando (la velocidad empalma)
      return { r0: (d1 * (v0 + v1)) / 2 + rb, segs: [{ d: d1, to: rb, e: rouE.ramp(v0, v1) }, { d: d2, to: -0.16, e: rouE.out(p), ev: "brake" }, { d: 0.17, to: 0 }] }; } },
    spring: { ext: 3.4, plan: (sc = 1) => {                 // pasa de largo y vuelve y va, cada vez mas corto, como un muelle
      const a = rouU(0.9, 3.2), segs = [{ d: rouU(1.7, 2.0), to: -a, e: rouE.out(3.2) }];
      for (let amp = a * rouU(0.5, 0.62), sg = 1, d = 0.46; amp > 0.17; amp *= rouU(0.42, 0.55), sg = -sg, d = Math.max(0.2, d * 0.8)) segs.push({ d, to: sg * amp });
      segs.push({ d: 0.2, to: 0 }); return { r0: rouU(80, 115) * sc, segs }; } },
    drip: { ext: 0, plan: (sc = 1) => {                     // para a unas casillas y se arrastra de una en una, con parones al azar: cada paso puede ser el ultimo
      const n = rouI(2, 4), segs = [{ d: rouU(1.5, 1.8), to: n, e: rouE.out(3.6) }];
      for (let i = n; i > 0; i--) segs.push({ d: rouU(0.12, 0.42), ev: i === n ? "crawl" : null }, { d: rouU(0.24, 0.32), to: i - 1 });
      return { r0: rouU(80, 115) * sc, segs }; } },
    fake: { ext: 7, plan: (sc = 1) => {                     // falso final: parece que ha parado (suena el tope) y no: arranca otra vez; a veces dos veces
      const k = rouI(2, 6), fwd = Math.random() < 0.6, rf = fwd ? k : -k, segs = [{ d: rouU(1.8, 2.1), to: rf, e: rouE.out(3.6) }, { d: rouU(0.5, 0.85), ev: "stop" }];
      if (Math.random() < 0.28) { const r2 = (fwd ? 1 : -1) * rouI(1, k - 1); segs.push({ d: rouU(0.4, 0.55), to: r2, ev: "kick" }, { d: rouU(0.32, 0.55), ev: "stop" }); }
      segs.push({ d: rouU(0.45, 0.7), to: 0, ev: "kick" }); return { r0: rouU(80, 115) * sc, segs }; } },
    drift: { ext: 0, plan: (sc = 1) => {                    // frena sin fin: las ultimas casillas tardan una eternidad (latido y bombillas lentas)
      const r0 = rouU(85, 120) * sc, p = rouU(5.2, 6.2), D = rouU(3.2, 3.8), x1 = 1 - Math.pow(3 / r0, 1 / p);   // x1: cuando le faltan 3 casillas; a partir de ahi la tension
      return { r0, segs: [{ d: x1 * D, to: 3, e: y => (1 - Math.pow(1 - x1 * y, p)) / (1 - Math.pow(1 - x1, p)) }, { d: (1 - x1) * D, to: 0, e: rouE.out(p), ev: "crawl" }] }; } },
    flash: { hit: 14, plan: (sc = 1) => ({ r0: rouU(45, 70) * sc, segs: [{ d: rouU(1.3, 1.65), to: 0, e: rouE.out(rouU(2.4, 3)) }] }) },   // relampago: de golpe, sin tiempo de pensar
  };
  /* los tramos encadenados: at(tw) = lo que falta en el instante tw (ya con el arranque de rouWarp); un tramo sin "to" es una parada */
  function rouPath(r0, segs) {
    let t = 0, from = r0; const T = segs.map(s => { const to = s.to === undefined ? from : s.to, g = { t0: t, t1: (t += s.d), from, to, e: s.e || rouE.io, ev: s.ev }; from = to; return g; });
    return { T, total: t, at: tw => { if (tw <= 0) return r0; for (const g of T) if (tw < g.t1) return g.from + (g.to - g.from) * g.e((tw - g.t0) / (g.t1 - g.t0)); return 0; } };
  }
  /* la tira entera: casillas de sobra para el recorrido y para media pantalla a cada lado, y la casilla ganadora colocada para que la salida y lo que se pase de largo queden dentro */
  function rouBuild(id, pos, dir, cw) {
    const K = ROU_REEL[id], { r0, segs } = K.plan(), M = Math.ceil(innerWidth / cw / 2) + 3 + Math.ceil(K.ext || 0);
    const NB = Math.ceil((r0 + 2 * M + 37) / 37), NC = 37 * NB, ok = [];
    for (let k = 0; k < NB; k++) { const F = pos + 37 * k + 0.5; if (dir > 0 ? F - r0 >= M && F <= NC - M : F >= M && F + r0 <= NC - M) ok.push(k); }
    const k = ok.length ? ok[Math.floor(Math.random() * ok.length)] : NB >> 1, SF = pos + 37 * k;
    return { id, K, dir, r0, path: rouPath(r0, segs), NC, SF, F: SF + 0.5 };
  }
  /* el sorteo del final, comun a Rojo o negro, la Ruleta de premios y la Moneda: azar vivo (nunca los dos ultimos y mas peso a los que menos han salido);
     cada pantalla guarda su memoria en el perfil (rouSeen/rouLast, whSeen/whLast, cnSeen/cnLast), no se repite al reabrir el juego */
  function reelPick(key, ids) {
    const PA = A.profile.get().adv, sk = key + "Seen", lk = key + "Last", seen = (PA[sk] = PA[sk] && typeof PA[sk] === "object" ? PA[sk] : {}), last = Array.isArray(PA[lk]) ? PA[lk] : [];
    const pool = ids.filter(id => !last.includes(id)), min = Math.min(...pool.map(id => seen[id] || 0)), w = pool.map(id => 1 / (1 + (seen[id] || 0) - min));
    let x = Math.random() * w.reduce((a, b) => a + b, 0), i = 0; while (i < pool.length - 1 && x >= w[i]) x -= w[i++];
    const id = pool[i]; seen[id] = (seen[id] || 0) + 1; PA[lk] = [id, ...last].slice(0, 2); A.profile.save(); return id;
  }
  const rouPick = () => reelPick("rou", Object.keys(ROU_REEL));
  function spinRoulette(o, done) {
    const { pick, n, skip } = o, out = colorOf(n), win = pick === out, zero = out === "green", S = C().S, app = $("app");
    const reduced = !!(S && S.reduce);
    if (!app) return done();
    rouOpen = true;
    const cw = Math.max(60, Math.min(116, Math.round(innerHeight * 0.125), Math.round(innerWidth / 7)));   // casilla entera en px: pixel art
    const F0 = A.adv._rouForce || {}, plan = rouBuild(reduced ? "classic" : F0.kind || rouPick(), WHEEL.indexOf(n), F0.dir || (Math.random() < 0.5 ? 1 : -1), cw);   // el final y la direccion de este giro (_rouForce: solo pruebas)
    const { path, dir, SF, F: SEND, NC, K } = plan, S0 = SEND - dir * plan.r0, T_IN = 0.34;      // casilla final y punto de salida; el puntero para en el centro de la casilla
    const END = path.total + 0.08;                                                                // t en que la tira queda parada
    const cells = []; for (let i = 0; i < NC; i++) { const v = WHEEL[i % 37]; cells.push(`<i class="rc rc-${colorOf(v)}"><b>${v}</b></i>`); }
    const pickName = A.tx(pick === "red" ? BT.red : pick === "black" ? BT.black : BT2.green), outName = A.tx(zero ? BT2.zero : out === "red" ? BT.red : BT.black);
    const msg = zero ? (win ? A.tx(o.last ? BT2.toFinal : BT2.skip) : A.tx(BT2.house) + (o.extra ? " · " + A.tx(BT2.extra) : "")) : A.tx(win ? BT.won : BT.lost) + (o.extra ? " · " + A.tx(BT2.extra) : "");
    const ov = document.createElement("div"); ov.id = "rouOv"; ov.className = `rou spin${win ? " win" : " lose"}${zero ? " zero" : ""}`; ov.style.setProperty("--cw", cw + "px");
    ov.innerHTML = `<div class="rou-stage"><div class="rou-top"><b class="rou-no">${A.tx(BT2.noMore)}</b><div class="rou-res"><span class="rr-plate rc-${out}"><b>${outName}</b><i>${n}</i></span><span class="rr-msg">${msg}</span></div>
        <div class="rou-pick"><span class="rp-dot rp-${pick}"></span><span class="rp-k">${A.tx(BT.seal)}</span><b>${pickName}</b></div></div>
      <div class="rou-band"><i class="rou-lights top"></i><div class="rou-view"><div class="rou-strip">${cells.join("")}</div></div>
        <div class="rou-ptr"><i class="pt-top"></i><i class="pt-line"></i><i class="pt-bot"></i><span class="pt-frame"></span></div><i class="rou-lights bot"></i></div></div><u class="rou-wash"></u>`;
    app.appendChild(ov);
    const strip = ov.querySelector(".rou-strip"), ptr = ov.querySelector(".rou-ptr"), band = ov.querySelector(".rou-band"), kids = strip.children;
    const place = s => { strip.style.transform = `translate3d(${-Math.round(s * cw)}px,0,0)`; };
    place(S0);
    const block = e => { e.preventDefault(); e.stopPropagation(); };                                // mientras gira, ni el teclado llega al Campamento de detras
    addEventListener("keydown", block, true);
    let closed = false, revealed = false, t0 = 0, last = S0, lastT = 0, lastTick = 0, cur = -1, fast = false, evI = 0;
    const ctl = !reduced && A.casCtl ? A.casCtl.attach(ov, {}) : null;                               // v0.2.53: mantener = x2 y SALTAR (js/casino-ctl.js)
    const cleanup = () => { if (ctl) ctl.destroy(); removeEventListener("keydown", block, true); rouOpen = false; };
    const close = () => {
      if (closed) return; closed = true; if (ctl) ctl.destroy(); removeEventListener("keydown", block, true); ov.classList.add("out");
      setTimeout(() => { ov.remove(); rouOpen = false; done(); }, reduced ? 0 : 280);
    };
    const bail = e => { try { console.error("ruleta", e); } catch (x) { /* nada */ } if (closed) return; closed = true; cleanup(); ov.remove(); done(); };   // pase lo que pase, el Campamento nunca se queda bloqueado
    const hit = px => { if (!reduced) band.animate([{ transform: "translateY(0)" }, { transform: `translateY(${px}px)` }, { transform: `translateY(${-px * 0.375}px)` }, { transform: "translateY(0)" }], { duration: 300, easing: "ease-out" }); };   // el golpe del tope
    const tense = on => { ov.classList.toggle("crawl", on); ov.classList.toggle("spin", !on); };   // tension: latido y bombillas lentas
    const EV = {                                                                                    // los avisos de los tramos del final (ROU_REEL)
      crawl: () => { tense(true); A.sfx.rouCrawl(); },
      brake: () => A.sfx.rouBrake(),
      stop: () => { ov.classList.add("hush"); A.sfx.rouStop(); hit(8); if (A.haptic) A.haptic([30]); },   // falso final: suena, golpea y apaga las bombillas igual que el de verdad
      kick: () => { ov.classList.remove("hush"); A.sfx.rouKick(); },
    };
    const reveal = () => {
      if (revealed) return; revealed = true; if (ctl) ctl.outcome(); place(SEND); ov.classList.remove("spin", "fast", "crawl", "hush"); ov.classList.add("done", "is-" + out);
      if (cur >= 0 && kids[cur]) kids[cur].classList.remove("cur"); kids[SF].classList.add("hit");
      A.sfx.rouStop(); if (A.haptic) A.haptic([zero ? 60 : 30]);
      hit(K.hit || 8);
      ov.classList.add("flash");
      setTimeout(() => {
        A.dealer.enable(true);
        if (zero && win) { A.sfx.jackpot(2); if (A.core.jpShake) A.core.jpShake(3); if (A.haptic) A.haptic([40, 40, 80]); A.dealer.say(A.dealer.line(o.last ? "betGreenFinal" : "betGreenWin"), { mood: "angry", face: "furious", gesture: o.last ? "tremble_body" : "stamp", fx: "shake", hold: 3400 }); }
        else if (zero) { A.sfx.rouZero(); A.sfx.lose(); if (A.core.jpShake) A.core.jpShake(2); A.dealer.say(A.dealer.line("betGreenLose"), { mood: "laugh", face: "laugh", gesture: "fan_self", hold: 2600 }); }
        else if (win) { A.sfx.jackpot(1); if (A.core.jpShake) A.core.jpShake(1); A.dealer.say(A.dealer.line("betWin"), { mood: "angry", hold: 2200 }); }
        else { A.sfx.lose(); A.dealer.say(A.dealer.line("betLose"), { mood: "laugh", hold: 2200 }); }
      }, 150);
      setTimeout(() => { ov.addEventListener("click", close); ov.classList.add("skippable"); }, 600);
      setTimeout(close, zero ? 2900 : 2300);                                                      // el cero se queda mas: hay que verlo
    };
    try {
      if (reduced) { A.sfx.rouNoMore(); setTimeout(() => { if (!closed) reveal(); }, 2000); return; }   // sin movimiento, pero con su espera: la tension es del juego
      A.sfx.rouNoMore(); setTimeout(() => { if (!closed && !revealed) A.sfx.rouStart(); }, T_IN * 1000);
      const frame = now => {
        try {
          if (!ov.isConnected) { cleanup(); return; }                                              // otra pantalla se llevo la capa por delante: que no se quede el teclado bloqueado
          if (revealed) return;
          if (!t0) t0 = now + T_IN * 1000;
          const t = (now - t0) / 1000, tw = rouWarp(t), s = t <= 0 ? S0 : SEND - dir * path.at(tw), dt = Math.max(1, now - lastT) / 1000, v = lastT ? Math.abs(s - last) / dt : 0;   // v: casillas por segundo
          place(s);
          if ((v > 30) !== fast) { fast = v > 30; ov.classList.toggle("fast", fast); }              // a toda velocidad los numeros se funden: solo color
          while (t > 0 && evI < path.T.length && tw >= path.T[evI].t0) { const ev = path.T[evI++].ev; if (ev && EV[ev]) EV[ev](); }   // el aviso de cada tramo, una vez, al empezar
          const idx = Math.floor(s);
          if (idx !== cur) {
            if (cur >= 0 && kids[cur]) kids[cur].classList.remove("cur");
            cur = idx; if (v < 16 && kids[cur]) kids[cur].classList.add("cur");                     // solo la ilumina cuando se la puede leer
            if (t > 0 && now - lastTick > 34) {
              lastTick = now; const slow = Math.max(0, Math.min(1, 1 - v / 60)); A.sfx.rouTick(slow); if (A.haptic && v < 10) A.haptic([6]);
              if (v < 45) { const dy = 3 + slow * 6; ptr.animate([{ transform: "translateY(0)" }, { transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], { duration: 70 + slow * 60, easing: "ease-out" }); }   // la lengueta del puntero cede mas cuanto mas lento
            }
          }
          last = s; lastT = now;
          if (t >= END) return reveal();
          requestAnimationFrame(frame);
        } catch (e) { bail(e); }
      };
      requestAnimationFrame(frame);
    } catch (e) { bail(e); }
  }
  /* ---------------- v0.2.9: mas juegos de casino para el centro de la Barra: Moneda al aire y Ruleta de premios ----------------
     El centro lo sortea la semilla por ronda entre CASINO (Rojo o negro, Moneda al aire, Ruleta de premios); cada juego tiene su cenefa y su pantalla.
     Todo se decide y se guarda ANTES de animar (como la ruleta): recargar a medias no lo deshace. El registro de la ronda vive en run.reds[r]
     ({ id, att, ... }) y sus efectos (racha, segundos, retos sellados) solo valen para el intento en que se tiro (att). */
  Object.assign(BETS, {
    coin: { n: L6("Moneda al aire|Coin flip|Pile ou face|Cara ou coroa|Münzwurf|Testa o croce||抛硬币|동전 던지기|コイントス|Орёл или решка|Rzut monetą"),
      d: L6("Elige cara o cruz. Si aciertas, cobras el doble de lo apostado; si fallas, lo pierdes. A veces la moneda cae de canto: paga ×6.|Pick heads or tails. Guess right and you win double your stake; guess wrong and you lose it. Sometimes the coin lands on its edge: pays ×6.|Choisis pile ou face. Si tu as raison, tu gagnes le double de ta mise ; sinon, tu la perds. Parfois la pièce retombe sur la tranche : paie ×6.|Escolha cara ou coroa. Se acertar, recebe o dobro da aposta; se errar, perde. Às vezes a moeda cai em pé: paga ×6.|Wähl Kopf oder Zahl. Liegst du richtig, bekommst du den doppelten Einsatz, sonst ist er weg. Manchmal bleibt die Münze auf der Kante stehen: zahlt ×6.|Scegli testa o croce. Se indovini, vinci il doppio della puntata; se sbagli, la perdi. A volte la moneta cade di taglio: paga ×6.||选正面或反面。猜对赢双倍赌注，猜错输掉赌注。偶尔硬币会立起来：赔 ×6。|앞면이나 뒷면을 고르세요. 맞히면 건 돈의 두 배, 틀리면 잃습니다. 가끔 동전이 세로로 섭니다: ×6 지급.|表か裏を選ぶ。当たれば賭け金の2倍、はずれれば失う。まれにコインが縁で立つ：×6の配当。|Выбери орла или решку. Угадал — получаешь удвоенную ставку, не угадал — теряешь её. Иногда монета встаёт на ребро: выплата ×6.|Wybierz orła lub reszkę. Trafisz — dostajesz podwójną stawkę, pudło — tracisz ją. Czasem moneta staje na krawędzi: wypłata ×6."),
      s: L6("Acierta y cobras el doble de lo apostado.|Call it right and win double your stake.|Devine juste et gagne le double de ta mise.|Acerte e receba o dobro da aposta.|Rate richtig: doppelter Einsatz.|Indovina e vinci il doppio.||猜对赢双倍赌注。|맞히면 건 돈의 두 배.|当てれば賭け金の2倍。|Угадай — получишь двойную ставку.|Zgadnij i wygraj podwójnie."), ico: "bet_coin" },
    wheel: { n: L6("Ruleta de premios|Prize wheel|Roue des prix|Roda de prêmios|Glücksrad|Ruota dei premi||奖品转盘|상품 룰렛|景品ルーレット|Колесо призов|Koło nagród"),
      d: L6("Pagas la cuota y giras la rueda: 12 casillas con premios (doblones, racha, café, seguro, provisión) y castigos (un reto más, atraco, reloj corto). Todas tienen la misma probabilidad.|You pay the fee and spin: 12 slots with prizes (doubloons, streak, espresso, insurance, provision) and penalties (one more challenge, a heist, a short clock). Every slot is equally likely.|Tu paies la mise et tu lances la roue : 12 cases avec des lots (doublons, série, café, assurance, provision) et des pénalités (un défi de plus, un braquage, une horloge courte). Chaque case a la même probabilité.|Você paga a taxa e gira a roda: 12 casas com prêmios (dobrões, sequência, café, seguro, provisão) e castigos (mais um desafio, um assalto, relógio curto). Todas têm a mesma chance.|Du zahlst den Einsatz und drehst: 12 Felder mit Preisen (Dublonen, Serie, Espresso, Versicherung, Proviant) und Strafen (eine Herausforderung mehr, ein Überfall, kurze Uhr). Jedes Feld ist gleich wahrscheinlich.|Paghi la quota e giri la ruota: 12 caselle con premi (dobloni, serie, caffè, assicurazione, provvista) e penalità (una sfida in più, una rapina, tempo ridotto). Ogni casella ha la stessa probabilità.||你付费并转动转盘：12 格，有奖励（金币、连击、咖啡、保险、补给）也有惩罚（多一个挑战、被抢劫、时间变短）。每格概率相同。|참가비를 내고 룰렛을 돌립니다: 12칸에 상(도블론, 연속 기록, 커피, 보험, 식량)과 벌(도전 +1, 강탈, 짧은 시계)이 있습니다. 모든 칸의 확률은 같습니다.|参加費を払ってルーレットを回す：12マスに、賞（ダブロン、連続正解、コーヒー、保険、食料）と罰（チャレンジ+1、強奪、短い時計）。どのマスも同じ確率。|Платишь взнос и крутишь колесо: 12 секторов с призами (дублоны, серия, кофе, страховка, запас) и штрафами (ещё одно испытание, ограбление, урезанное время). Шансы у всех секторов одинаковые.|Płacisz opłatę i kręcisz kołem: 12 pól z nagrodami (dublony, seria, kawa, ubezpieczenie, zapas) i karami (jedno wyzwanie więcej, napad, krótki zegar). Każde pole ma te same szanse."),
      s: L6("Premios buenos y malos. Gira y arriésgate.|Good prizes and bad ones. Spin and risk it.|Bons lots et mauvais. Tourne, tente ta chance.|Prêmios bons e ruins. Gire e arrisque.|Gute Preise und schlechte. Dreh und riskier es.|Premi buoni e cattivi. Gira e rischia.||有好奖也有坏奖，转一转赌一把。|좋은 상도 나쁜 상도. 돌려서 도전하세요.|良い賞も悪い賞も。回して賭けよう。|Призы хорошие и плохие. Крути и рискуй.|Dobre nagrody i złe. Zakręć i zaryzykuj."), ico: "bet_wheel" },
  });
  const CT = {
    heads: L6("Cara|Heads|Face|Cara|Kopf|Testa||正面|앞면|表|Орёл|Orzeł"), tails: L6("Cruz|Tails|Pile|Coroa|Zahl|Croce||反面|뒷면|裏|Решка|Reszka"),
    edge: L6("De canto|On its edge|Sur la tranche|Em pé|Auf der Kante|Di taglio||立起来了|세로로 섬|縁で立った|На ребре|Na krawędzi"),
    edgeMsg: L6("¡Se ha quedado de canto!|It landed on its edge!|Elle reste sur la tranche !|Ficou em pé!|Sie bleibt auf der Kante stehen!|È rimasta di taglio!|¡Quedó de canto!|硬币立住了！|동전이 세로로 섰다!|コインが縁で立った！|Монета встала на ребро!|Moneta stanęła na krawędzi!"),
    spin: L6("Girar|Spin|Tourner|Girar|Drehen|Gira||转动|돌리기|回す|Крутить|Kręć"),
  };
  const WT = {
    coin: L6("Doblones|Doubloons|Doublons|Dobrões|Dublonen|Dobloni||金币|도블론|ダブロン|Дублоны|Dublony"), jack: L6("¡Premio gordo!|Jackpot!|Jackpot !|Prêmio gordo!|Jackpot!|Jackpot!||大奖！|잭팟!|ジャックポット！|Джекпот!|Jackpot!"),
    streak: L6("Racha|Streak|Série|Sequência|Serie|Serie||连击|연속 기록|連続正解|Серия|Seria"), streakD: L6("Empiezas la próxima ronda en racha|You start next round on a streak|Tu commences la prochaine manche en série|Você começa a próxima rodada em sequência|Du startest die nächste Runde mit Serie|Parti in serie nel prossimo round||下一回合开局就有连击|다음 라운드를 연속 기록으로 시작합니다|次のラウンドを連続正解つきで始める|Следующий раунд начнёшь с серией|Następną rundę zaczniesz z serią"),
    cafe: L6("Café gratis|Free espresso|Café offert|Café grátis|Gratis-Espresso|Caffè gratis||免费咖啡|공짜 커피|無料コーヒー|Бесплатный кофе|Darmowa kawa"), cafeD: L6("Café doble activo en la próxima ronda|Double espresso active next round|Double expresso actif à la prochaine manche|Café duplo ativo na próxima rodada|Doppelter Espresso nächste Runde aktiv|Caffè doppio attivo nel prossimo round||下一回合双倍咖啡生效|다음 라운드에 더블 커피 적용|次のラウンドでダブルコーヒー有効|Двойной кофе действует в следующем раунде|Podwójna kawa aktywna w następnej rundzie"),
    seguro: L6("Seguro gratis|Free insurance|Assurance offerte|Seguro grátis|Gratis-Versicherung|Assicurazione gratis||免费保险|공짜 보험|無料保険|Бесплатная страховка|Darmowe ubezpieczenie"), seguroD: L6("Seguro de ronda activo|Round insurance active|Assurance de manche active|Seguro de rodada ativo|Rundenversicherung aktiv|Assicurazione del round attiva||回合保险生效|라운드 보험 적용|ラウンド保険有効|Страховка раунда действует|Ubezpieczenie rundy aktywne"),
    already: L6("Ya lo tenías: lo cobras en doblones|Already had it: you get doubloons instead|Tu l'avais déjà : payé en doublons|Você já tinha: pago em dobrões|Hattest du schon: in Dublonen ausgezahlt|Ce l'avevi già: pagato in dobloni||你已拥有：折算成金币|이미 있어서 도블론으로 받습니다|すでに持っている：ダブロンで支払い|Уже есть: выплата дублонами|Już to masz: wypłata w dublonach"),
    life: L6("Provisión|Provision|Provision|Provisão|Proviant|Provvista||补给|식량|食料|Запас|Zapas"), lifeD: L6("+1 provisión|+1 provision|+1 provision|+1 provisão|+1 Proviant|+1 provvista||+1 补给|식량 +1|+1 食料|+1 запас|+1 zapas"),
    none: L6("Nada|Nothing|Rien|Nada|Nichts|Niente||什么都没有|꽝|なし|Ничего|Nic"), noneD: L6("La rueda no paga nada|The wheel pays nothing|La roue ne paie rien|A roda não paga nada|Das Rad zahlt nichts|La ruota non paga nulla||转盘没有奖励|룰렛이 아무것도 주지 않습니다|ルーレットは何も出さない|Колесо ничего не платит|Koło nic nie płaci"),
    reto: L6("Reto extra|Extra challenge|Défi en plus|Desafio extra|Extra-Herausforderung|Sfida extra||额外挑战|추가 도전|追加チャレンジ|Доп. испытание|Dodatkowe wyzwanie"), retoD: L6("La ronda trae un reto más (sellado, nivel 3)|The round brings one more challenge (sealed, level 3)|La manche apporte un défi de plus (scellé, niveau 3)|A rodada traz mais um desafio (selado, nível 3)|Die Runde bringt eine Herausforderung mehr (versiegelt, Stufe 3)|Il round porta una sfida in più (sigillata, livello 3)||该回合多一个挑战（3 级封印）|라운드에 도전이 하나 더 붙습니다 (봉인, 3단계)|ラウンドにチャレンジが1つ増える（封印、レベル3）|В раунде станет на одно испытание больше (запечатанное, 3-й уровень)|Runda dostaje jedno wyzwanie więcej (zapieczętowane, poziom 3)"),
    noRoom: L6("Ya no cabe otro reto: te libras|There's no room for another challenge: you're spared|Plus de place pour un défi : tu t'en tires|Não cabe mais um desafio: você se livra|Kein Platz für eine weitere Herausforderung: Glück gehabt|Non c'è posto per un'altra sfida: te la cavi||挑战已满：你逃过一劫|더 이상 도전이 들어갈 자리가 없어 무사합니다|これ以上チャレンジは入らない：助かった|Места для ещё одного испытания нет: повезло|Nie ma miejsca na kolejne wyzwanie: uchodzi ci to płazem"),
    steal: L6("Atraco|Heist|Braquage|Assalto|Überfall|Rapina||被抢劫|강탈|強奪|Ограбление|Napad"), stealD: L6("El crupier se queda la mitad de tus doblones|The dealer keeps half your doubloons|Le croupier garde la moitié de tes doublons|O crupiê fica com metade dos seus dobrões|Der Croupier behält die Hälfte deiner Dublonen|Il croupier si tiene metà dei tuoi dobloni|El crupier se queda con la mitad de tus doblones|荷官拿走你一半金币|딜러가 도블론의 절반을 가져갑니다|ディーラーがダブロンの半分を取る|Крупье забирает половину твоих дублонов|Krupier zabiera połowę twoich dublonów"),
    clock: L6("Reloj corto|Short clock|Horloge courte|Relógio curto|Kurze Uhr|Tempo ridotto||时间变短|짧은 시계|短い時計|Урезанное время|Krótki zegar"), clockD: L6("−{n} s por pregunta en la próxima ronda|−{n} s per question next round|−{n} s par question à la prochaine manche|−{n} s por pergunta na próxima rodada|−{n} s pro Frage in der nächsten Runde|−{n} s per domanda nel prossimo round||下一回合每题 −{n} 秒|다음 라운드 문제당 −{n}초|次のラウンドは1問につき−{n}秒|−{n} с на вопрос в следующем раунде|−{n} s na pytanie w następnej rundzie"),
  };
  /* las 12 casillas, en el orden de la rueda: buenas, malas y una vacia, intercaladas. t decide el color de la cuna; mul son doblones base (escalan con la expedicion) */
  const PRIZES = [
    { k: "coin", mul: 6, ico: "pz_monedas", t: "good" }, { k: "reto", ico: "pz_reto", t: "bad" }, { k: "jack", mul: 14, ico: "pz_gordo", t: "good" }, { k: "clock", ico: "pz_reloj", t: "bad" },
    { k: "cafe", ico: "sup_cafe", t: "good" }, { k: "steal", ico: "pz_atraco", t: "bad" }, { k: "seguro", ico: "sup_seguro", t: "good" }, { k: "none", ico: "pz_nada", t: "none" },
    { k: "streak", ico: "a_flame", t: "good" }, { k: "reto", ico: "pz_reto", t: "bad" }, { k: "life", ico: "heart", t: "good" }, { k: "coin", mul: 6, ico: "pz_monedas", t: "good" },
  ];
  const prizeVal = n => Math.max(1, Math.round(n * ascFx(run.asc).price * inflation()));
  const wheelCost = () => price(4), COIN_STAKES = [2, 5, 10], coinCost = i => price(COIN_STAKES[i % COIN_STAKES.length]);
  let coinStake = 0;
  const tx = (o, n) => A.tx(o).replace("{n}", n);
  /* aplica el premio (dinero, provision, suministro, reto sellado...) y devuelve lo que ensena la pantalla */
  function applyPrize(P, rec, r) {
    const T = WT, v = P.mul ? prizeVal(P.mul) : 0, earn = n => { run.coins += n; run.stats.coinsEarned += n; };
    if (P.k === "coin" || P.k === "jack") { earn(v); rec.val = v; return { name: A.tx(P.k === "jack" ? T.jack : T.coin), detail: "+" + v, tone: "good", jp: P.k === "jack" ? 3 : 1 }; }
    if (P.k === "streak") { rec.streak = true; return { name: A.tx(T.streak), detail: A.tx(T.streakD), tone: "good", jp: 1 }; }
    if (P.k === "cafe" || P.k === "seguro") {
      const s = SUPS.find(x => x.id === P.k), shown = barOf(r).includes(P.k) && !(run.sup && run.sup[P.k]);
      if (shown) { run.sup = run.sup || {}; run.sup[P.k] = "gift"; return { name: A.tx(T[P.k]), detail: A.tx(T[P.k + "D"]), tone: "good", jp: 1 }; }
      const pay = prizeVal(s.cost); earn(pay); return { name: A.tx(T[P.k]), detail: A.tx(T.already) + " · +" + pay, tone: "good", jp: 1 };
    }
    if (P.k === "life") {
      if (run.lives < run.maxLives) { run.lives++; return { name: A.tx(T.life), detail: A.tx(T.lifeD), tone: "good", jp: 2 }; }
      const pay = prizeVal(8); earn(pay); return { name: A.tx(T.life), detail: A.tx(T.already) + " · +" + pay, tone: "good", jp: 1 };
    }
    if (P.k === "reto") {
      const rs = chalFor(r).list.length < 5 ? pickSealed(r, 1, "premioreto") : [];
      if (rs.length) { rec.retos = rs; return { name: A.tx(T.reto), detail: A.tx(T.retoD), tone: "bad", jp: 0 }; }
      return { name: A.tx(T.reto), detail: A.tx(T.noRoom), tone: "none", jp: 0 };
    }
    if (P.k === "clock") { rec.secs = -3; return { name: A.tx(T.clock), detail: tx(T.clockD, 3), tone: "bad", jp: 0 }; }
    if (P.k === "steal") { const amt = Math.floor(run.coins / 2); run.coins -= amt; rec.val = -amt; return { name: A.tx(T.steal), detail: A.tx(T.stealD) + (amt ? " · −" + amt : ""), tone: "bad", jp: 0 }; }
    return { name: A.tx(T.none), detail: A.tx(T.noneD), tone: "none", jp: 0 };
  }
  const wedgeLabel = P => (P.mul ? "+" + prizeVal(P.mul) : P.k === "steal" ? "−½" : P.k === "clock" ? "−3s" : "");

  /* la capa a pantalla completa que comparten Moneda y Ruleta de premios (la de Rojo o negro es la suya): teclado bloqueado, cierre con fundido, nunca deja el Campamento bloqueado */
  function rouShell(cls, html, vars, done) {
    const app = $("app"), S = C().S, reduced = !!(S && S.reduce);
    if (!app) { done(); return null; }
    rouOpen = true;
    const ov = document.createElement("div"); ov.id = "rouOv"; ov.className = "rou spin " + cls;
    Object.keys(vars).forEach(k => ov.style.setProperty(k, vars[k])); ov.innerHTML = html + '<u class="rou-wash"></u>'; app.appendChild(ov);
    const block = e => { e.preventDefault(); e.stopPropagation(); }; addEventListener("keydown", block, true);
    const sh = { ov, reduced, closed: false, revealed: false, hooks: {} };
    /* v0.2.53: mantener = x2 y SALTAR (js/casino-ctl.js). sh.waiting(true) = el juego espera al jugador (sin botones y a x1); sh.outcome() = llega el resultado (a x1, sin botones); sh.hooks.skip = salto propio del juego */
    const ctl = !reduced && A.casCtl ? A.casCtl.attach(ov, sh.hooks) : null;
    sh.waiting = on => { if (ctl) ctl.waiting(on); }; sh.outcome = () => { if (ctl) ctl.outcome(); };
    sh.close = () => { if (sh.closed) return; sh.closed = true; if (ctl) ctl.destroy(); removeEventListener("keydown", block, true); ov.classList.add("out"); setTimeout(() => { ov.remove(); rouOpen = false; done(); }, reduced ? 0 : 280); };
    sh.bail = e => { try { console.error("casino", e); } catch (x) { /* nada */ } if (sh.closed) return; sh.closed = true; if (ctl) ctl.destroy(); removeEventListener("keydown", block, true); ov.remove(); rouOpen = false; done(); };
    sh.hold = ms => { sh.outcome(); setTimeout(() => { ov.addEventListener("click", sh.close); ov.classList.add("skippable"); }, 600); setTimeout(sh.close, ms); };   // sh.hold llega siempre al final: por si algun juego no avisa del resultado
    return sh;
  }

  /* ---------------- Moneda al aire: la moneda (la de los logros, en 24 fotogramas de giro) sube, gira y cae; si cae de canto, se queda de pie ---------------- */
  /* ---------------- el carrete de finales de la Moneda (v0.2.47) ----------------
     Como en las ruletas: el resultado (cara, cruz o canto) ya esta decidido y guardado; esto solo elige COMO cae la moneda. 7 finales propios de una moneda, un sentido de giro al azar
     (la moneda gira hacia un lado o hacia el otro) y el mismo sorteo vivo (nunca los dos ultimos, mas peso a los menos vistos).
     Nada depende de la apuesta ni del resultado: el que se tambalea (topple) aterriza con una cara al azar y se da la vuelta la mitad de las veces, ganes o pierdas. */
  const CN_UP = "cubic-bezier(.2,.7,.35,1)", CN_DN = "cubic-bezier(.6,0,.85,.4)", CN_UPS = "cubic-bezier(.2,.6,.4,1)";
  /* la linea de tiempo vertical (alturas en unidades de H, ms): sube, cae (golpe de fuerza k; k<0 = tintineo) o espera en el suelo; cada punto lleva la curva del tramo que EMPIEZA en el */
  function cnLine(from) {
    const L = { pts: [[0, -(from || 0), CN_DN]], hits: [], t: 0 }, last = () => L.pts[L.pts.length - 1];
    L.up = (h, ms, e) => { last()[2] = e || CN_UPS; L.t += ms; L.pts.push([L.t, -h, CN_DN]); return L; };
    L.down = (ms, k) => { last()[2] = CN_DN; L.t += ms; L.pts.push([L.t, 0, CN_UPS]); L.hits.push([L.t, k]); return L; };
    L.hold = ms => { L.t += ms; L.pts.push([L.t, 0, CN_UPS]); return L; };
    return L;
  }
  /* grados de giro (E: el angulo final de la cara; el sentido lo pone el sorteo): hasta el primer golpe, y el balanceo de una moneda que se asienta (puntos [ms, grados] suavizados) */
  const cnFly = (turns, p, land, E) => t => (t >= land ? 360 * turns + E : (360 * turns + E) * (1 - Math.pow(1 - t / land, p)));
  const cnRock = (base, pts, t0) => t => { const x = t - t0; for (let i = 1; i < pts.length; i++) if (x < pts[i][0]) { const [ta, oa] = pts[i - 1], [tb, ob] = pts[i], u = Math.max(0, (x - ta) / (tb - ta)); return base + oa + (ob - oa) * u * u * (3 - 2 * u); } return base + pts[pts.length - 1][1]; };
  const COIN_REEL = {
    toss: { plan: E => ({ L: cnLine().up(1, 836, CN_UP).down(608, 0).up(0.14, 209).down(247, 1), deg: cnFly(4, 2.3, 1444, E) }) },   // el de siempre
    high: { plan: E => { const L = cnLine().up(rouU(1.7, 2.1), rouU(840, 940), CN_UP).down(rouU(660, 760), 0), land = L.t; L.up(0.3, 250).down(290, 1).up(0.08, 125).down(145, 1.2); return { L, deg: cnFly(rouI(6, 8), 2, land, E) }; } },   // al techo: vuelo largo y dos rebotes
    slow: { plan: E => { const L = cnLine().up(0.8, rouU(1050, 1200), "cubic-bezier(.1,.8,.3,1)").down(rouU(640, 740), 0), land = L.t; L.up(0.1, 170).down(200, 1); return { L, deg: cnFly(2, rouU(1.15, 1.4), land, E) }; } },   // camara lenta: se queda colgando y gira despacio
    drop: { plan: E => { const L = cnLine(2.1).down(rouU(480, 560), 0), land = L.t; L.up(0.55, 330).down(360, 1).up(0.2, 200).down(230, 1.2).up(0.06, 110).down(130, 1.4); return { L, deg: cnFly(rouI(2, 3), 1.6, land, E), sky: true }; } },   // cae del cielo y rebota tres veces
    flash: { plan: E => { const L = cnLine().up(0.55, 380, CN_UP).down(330, 0), land = L.t; L.up(0.06, 90).down(110, 1); return { L, deg: cnFly(3, 2, land, E) }; } },   // tiro seco: ni un segundo
    topple: { plan: (E, edge) => {                                       // aterriza, se tambalea y a veces se da la vuelta
      const L = cnLine().up(rouU(0.85, 1), rouU(760, 840), CN_UP).down(rouU(560, 640), 0), land = L.t; L.up(0.12, 190).down(230, 1);
      const flip = !edge && Math.random() < 0.5, F = flip ? E + 180 : E, turns = rouI(3, 4), fly = cnFly(turns, 2.2, land, F), t0 = L.t;
      const rock = flip ? [[0, 0], [150, 28], [280, -6], [390, 52], [470, 14], [540, 96], [590, 150], [640, 180]] : [[0, 0], [130, -34], [260, 12], [360, -20], [440, 6], [500, -9], [545, 3], [575, 0]], rk = cnRock(360 * turns + F, rock, t0);
      rock.slice(1, flip ? -1 : undefined).forEach(r => L.hits.push([t0 + r[0], -1])); if (flip) L.hits.push([t0 + 640, 0.9]);
      return { L, deg: t => (t < t0 ? fly(t) : rk(t)), total: t0 + rock[rock.length - 1][0] }; } },
    spin: { plan: E => {                                                  // peonza: aterriza girando en el sitio y el traqueteo final se acelera hasta que cae plana
      const L = cnLine().up(rouU(0.65, 0.8), rouU(540, 620), CN_UP).down(rouU(440, 520), 0).up(0.12, 160).down(190, 1), T = rouU(2500, 3000), gaps = [276, 200, 145, 105, 76, 55, 40];
      const wait = T - gaps.reduce((a, b) => a + b, 0) - L.t; if (wait > 0) L.hold(wait);
      gaps.forEach(g => L.up(0.04 * Math.sqrt(g / 276), g / 2).down(g / 2, -1));
      const TH = 360 * rouI(6, 8) + E; return { L, deg: t => TH * (1 - Math.pow(1 - Math.min(1, t / T), 3)), total: T }; } },
  };
  function spinCoin(o, done) {
    const { pick, out, win, pay } = o, edge = out === "edge", cw = Math.max(60, Math.min(116, Math.round(innerHeight * 0.125), Math.round(innerWidth / 7))), k = Math.max(2, Math.min(3, Math.round(cw * 1.5 / 64))), fw = 64 * k, NF = 24;   // fotograma de 64 px logicos, ampliado en entero
    const msg = edge ? A.tx(CT.edgeMsg) + " +" + pay : win ? A.tx(BT.won) + " +" + pay : A.tx(BT.lost);
    const sh = rouShell(`coin ${edge ? "win edge" : win ? "win" : "lose"}`,
      `<div class="rou-stage"><div class="rou-top"><b class="rou-no">${A.tx(BT2.noMore)}</b><div class="rou-res"><span class="rr-plate rc-coin"><b>${A.tx(CT[out])}</b>${win || edge ? `<i>${edge ? "×6" : "×2"}</i>` : ""}</span><span class="rr-msg">${msg}</span></div>
        <div class="rou-pick"><span class="rp-dot rp-coin"></span><span class="rp-k">${A.tx(BT.seal)}</span><b>${A.tx(CT[pick])} · ${o.stake}</b></div></div>
      <div class="rou-band cn-band"><i class="rou-lights top"></i><div class="cn-air"><i class="cn-shadow"></i><div class="cn-arc"><i class="cn-spr"></i><img class="cn-stand" src="assets/icons/coin_stand.webp" alt="" draggable="false"></div></div><i class="rou-lights bot"></i></div></div>`,
      { "--cw": cw + "px", "--fw": fw + "px", "--k": k }, done);
    if (!sh) return;
    const ov = sh.ov, arc = ov.querySelector(".cn-arc"), spr = ov.querySelector(".cn-spr"), shadow = ov.querySelector(".cn-shadow");
    const END = out === "tails" ? 180 : edge ? 75 : 0, H = Math.round(fw * 0.62), T_IN = 340;
    const F0 = A.adv._cnForce || {}, kind = sh.reduced ? "toss" : F0.kind || reelPick("cn", Object.keys(COIN_REEL)), sg = F0.dir || (Math.random() < 0.5 ? 1 : -1);   // el final y el sentido de giro de este tiro (_cnForce: solo pruebas)
    const P = COIN_REEL[kind].plan(END, edge), DUR = Math.max(P.L.t, P.total || 0);
    const frameAt = deg => ((Math.round((sg * deg) / (360 / NF)) % NF) + NF) % NF, put = i => { spr.style.backgroundPositionX = -i * fw + "px"; };
    put(0); if (P.sky && !sh.reduced) arc.style.visibility = shadow.style.visibility = "hidden";   // el que cae del cielo no se ve antes de soltarlo
    const reveal = () => {
      if (sh.revealed) return; sh.revealed = true; sh.outcome(); put(frameAt(END)); ov.classList.remove("spin"); ov.classList.add("done", "is-coin", edge ? "is-edge" : win ? "is-win" : "is-lose");
      if (A.haptic) A.haptic([edge ? 60 : 30]);
      setTimeout(() => {
        A.dealer.enable(true);
        if (edge) { A.sfx.jackpot(3); if (A.core.jpShake) A.core.jpShake(3); if (A.haptic) A.haptic([40, 40, 80]); A.dealer.say(A.dealer.line("betWin"), { mood: "angry", face: "furious", gesture: "stamp", fx: "shake", hold: 3000 }); }
        else if (win) { A.sfx.jackpot(1); if (A.core.jpShake) A.core.jpShake(1); A.dealer.say(A.dealer.line("betWin"), { mood: "angry", hold: 2200 }); }
        else { A.sfx.lose(); A.dealer.say(A.dealer.line("betLose"), { mood: "laugh", hold: 2200 }); }
      }, 150);
      sh.hold(edge ? 3000 : 2300);
    };
    try {
      if (sh.reduced) { setTimeout(() => { if (!sh.closed) reveal(); }, 2000); return; }   // sin movimiento, pero con su espera
      A.sfx.rouNoMore();
      setTimeout(() => {
        if (sh.closed || sh.revealed) return;
        if (P.sky) { arc.style.visibility = shadow.style.visibility = ""; A.sfx.rouBrake(); } else A.sfx.coinToss();
        const pts = P.L.pts.slice(); if (P.L.t < DUR) pts.push([DUR, 0, CN_UPS]);
        arc.animate(pts.map(([t, y, e]) => ({ transform: `translateY(${Math.round(y * H)}px)`, offset: t / DUR, easing: e })), { duration: DUR, fill: "forwards" });
        shadow.animate(pts.map(([t, y, e]) => { const a = Math.abs(y); return { transform: `scaleX(${Math.max(0.25, 1 - 0.45 * a).toFixed(2)})`, opacity: Math.max(0.1, 0.55 - 0.33 * a), offset: t / DUR, easing: e }; }), { duration: DUR, fill: "forwards" });
        const t0 = performance.now(); let cur = 0;
        const frame = now => {
          if (sh.closed || sh.revealed) return;
          const t = now - t0, i = frameAt(P.deg(t));
          if (i !== cur) { cur = i; put(i); }
          if (t < DUR) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
        P.L.hits.forEach(([t, kk]) => setTimeout(() => { if (!sh.closed && !sh.revealed) { if (kk < 0) A.sfx.coinTink(); else A.sfx.coinLand(kk); } }, t));   // cada golpe contra la mesa
        setTimeout(() => { if (!sh.closed) reveal(); }, DUR + 60);
      }, T_IN);
    } catch (e) { sh.bail(e); }
  }

  /* ---------------- Ruleta de premios: rueda circular de 12 cunas, aro de bombillas y puntero fijo arriba ---------------- */
  function spinWheel(o, done) {
    const { w, info } = o, N = PRIZES.length, STEP = 360 / N, ws = Math.max(240, Math.min(620, Math.round(Math.min(innerHeight * 0.5, innerWidth * 0.78) / 4) * 4));
    const TONE = { good: ["#f2b63d", "#1f9a58"], bad: ["#c9362c", "#23252e"], none: ["#5d6470", "#4a505b"] };
    const cnt = { good: 0, bad: 0, none: 0 }, cols = PRIZES.map(P => TONE[P.t][cnt[P.t]++ % 2]);
    const disc = `conic-gradient(from ${-STEP / 2}deg, ${cols.map((c, i) => `${c} ${i * STEP}deg ${(i + 1) * STEP}deg`).join(", ")})`;
    const slots = PRIZES.map((P, i) => `<span class="wh-s" style="--a:${i * STEP}deg"><img src="assets/icons/${P.ico}.webp" alt="" draggable="false"><b>${wedgeLabel(P)}</b></span>`).join("");
    const bulbs = Array.from({ length: 24 }, (_, i) => `<i class="wh-b ${i % 2 ? "o" : "e"}" style="--a:${i * 15}deg"></i>`).join("");
    const sh = rouShell(`wheel ${info.tone === "good" ? "win" : "lose"} tone-${info.tone}`,
      `<div class="rou-stage"><div class="rou-top"><b class="rou-no">${A.tx(BT2.noMore)}</b><div class="rou-res"><span class="rr-plate rc-${info.tone}"><b>${info.name}</b></span><span class="rr-msg">${info.detail}</span></div>
        <div class="rou-pick"><span class="rp-dot rp-wheel"></span><span class="rp-k">${A.tx(BT.seal)}</span><b>${A.tx(BETS.wheel.n)}</b></div></div>
      <div class="wh" ><div class="wh-ring">${bulbs}</div><div class="wh-disc" style="background:${disc}">${slots}<u class="wh-sep"></u><u class="wh-dim" style="--a:${w * STEP}deg"></u></div>
        <i class="wh-hub"><img src="assets/icons/coin.webp" alt="" draggable="false"></i><i class="wh-ptr"></i></div></div>`,
      { "--ws": ws + "px", "--cw": Math.round(ws * 0.2) + "px" }, done);
    if (!sh) return;
    const ov = sh.ov, discEl = ov.querySelector(".wh-disc"), ptr = ov.querySelector(".wh-ptr");
    const jit = (A.rng(`${run.seed}:premios:j:${roundNo()}:${run.attempt || 0}`)() - 0.5) * 0.7 * STEP;           // donde se para dentro de la cuna: a veces rozando el borde
    /* v0.2.47: el mismo carrete de finales que Rojo o negro (ROU_REEL), con el recorrido en cunas (0,36: ~2-4 vueltas), una direccion al azar y un angulo de salida al azar.
       La cuna ganadora sigue decidida y guardada antes de girar; la rueda siempre acaba en TH (la cuna bajo el puntero) */
    const F0 = A.adv._whForce || {}, kind = sh.reduced ? "classic" : F0.kind || reelPick("wh", Object.keys(ROU_REEL)), dir = F0.dir || (Math.random() < 0.5 ? 1 : -1);   // _whForce: solo pruebas
    const pl = ROU_REEL[kind].plan(0.36), path = rouPath(pl.r0, pl.segs), T_IN = 0.34, END = path.total + 0.08;
    const TH = 360 * 5 - w * STEP + jit, a0 = TH - dir * pl.r0 * STEP, angAt = t => (t <= 0 ? a0 : TH - dir * path.at(rouWarp(t)) * STEP);
    const put = a => { discEl.style.transform = `rotate(${a.toFixed(2)}deg)`; };
    put(a0);
    const tense = on => { ov.classList.toggle("crawl", on); ov.classList.toggle("spin", !on); };   // tension: latido y bombillas lentas
    const EV = {                                                                                    // los avisos de los tramos del final (ROU_REEL)
      crawl: () => { tense(true); A.sfx.rouCrawl(); },
      brake: () => A.sfx.rouBrake(),
      stop: () => { ov.classList.add("hush"); A.sfx.rouStop(); if (A.haptic) A.haptic([30]); },   // falso final: suena y apaga las bombillas igual que el de verdad
      kick: () => { ov.classList.remove("hush"); A.sfx.rouKick(); },
    };
    const reveal = () => {
      if (sh.revealed) return; sh.revealed = true; sh.outcome(); put(TH); ov.classList.remove("spin", "crawl", "hush"); ov.classList.add("done", "is-" + info.tone);
      A.sfx.rouStop(); if (A.haptic) A.haptic([info.tone === "good" ? 40 : 25]);
      setTimeout(() => {
        A.dealer.enable(true);
        if (info.tone === "good") { A.sfx.jackpot(info.jp || 1); if (A.core.jpShake) A.core.jpShake(info.jp || 1); A.dealer.say(A.dealer.line("betWin"), { mood: "angry", hold: 2400 }); }
        else if (info.tone === "bad") { A.sfx.lose(); if (A.core.jpShake) A.core.jpShake(1); A.dealer.say(A.dealer.line("betLose"), { mood: "laugh", hold: 2400 }); }
        else { A.sfx.deny(); A.dealer.say(A.dealer.line("betLose"), { mood: "sly", hold: 2200 }); }
      }, 150);
      sh.hold(info.jp === 3 ? 3200 : 2800);
    };
    try {
      if (sh.reduced) { setTimeout(() => { if (!sh.closed) reveal(); }, 2000); return; }   // sin movimiento, pero con su espera
      A.sfx.rouNoMore(); setTimeout(() => { if (!sh.closed && !sh.revealed) A.sfx.rouStart(); }, T_IN * 1000);
      let t0 = 0, last = a0, lastT = 0, lastTick = 0, cur = 0, evI = 0;
      const frame = now => {
        try {
          if (!ov.isConnected) { sh.bail("capa retirada"); return; }
          if (sh.revealed) return;
          if (!t0) t0 = now + T_IN * 1000;
          const t = (now - t0) / 1000, a = angAt(t), dt = Math.max(1, now - lastT) / 1000, v = lastT ? Math.abs(a - last) / dt : 0;      // v: grados por segundo
          put(a);
          while (t > 0 && evI < path.T.length && rouWarp(t) >= path.T[evI].t0) { const ev = path.T[evI++].ev; if (ev && EV[ev]) EV[ev](); }   // el aviso de cada tramo, una vez, al empezar
          const idx = Math.floor((a + STEP / 2) / STEP);
          if (idx !== cur) {
            cur = idx;
            if (t > 0 && now - lastTick > 34) {
              lastTick = now; const slow = Math.max(0, Math.min(1, 1 - v / 1500)); A.sfx.rouTick(slow); if (A.haptic && v < 300) A.haptic([6]);
              if (v < 1100) { const dy = 3 + slow * 7; ptr.animate([{ transform: "rotate(0deg)" }, { transform: `rotate(${-18 - slow * 14}deg)` }, { transform: "rotate(0deg)" }], { duration: 80 + slow * 90, easing: "ease-out" }); }   // el puntero cede a cada cuna
            }
          }
          last = a; lastT = now;
          if (t >= END) return reveal();
          requestAnimationFrame(frame);
        } catch (e) { sh.bail(e); }
      };
      requestAnimationFrame(frame);
    } catch (e) { sh.bail(e); }
  }
  /* ---------------- v0.2.48: Los tres cubiletes (el trile) ----------------
     El crupier esconde un doblon bajo uno de tres cubiletes, los mezcla y eliges. El baile es HONESTO (se puede seguir con la vista): la ficha sube la dificultad
     (6 / 9 / 12 cambios, de 0,64 a 0,31 s). Aciertas = x2. Y 1 de cada 50 el crupier se queda el doblon: al levantar los tres no hay nada (el chiste del trilero;
     cuenta como perdida, no depende de lo que elijas). Todo se decide ANTES de animar con la semilla (donde esta el doblon, el chiste y la lista de cambios);
     lo unico que decide el jugador es el cubilete. Si se cierra el juego a mitad del baile (pick sin guardar), el crupier se guarda la ficha: no se puede recargar
     para ver la solucion. Maqueta aprobada: tools/art/trile/. El escenario es de 1920x1080 con el arte a x4 y se escala con K/4 (K entero) para que el pixel art quede nitido. */
  Object.assign(BETS, {
    cups: { n: L6("Los tres cubiletes|The three cups|Les trois gobelets|Os três copos|Hütchenspiel|I tre bussolotti||三个杯子|세 개의 컵|3つのカップ|Напёрстки|Trzy kubki"),
      d: L6("El crupier esconde un doblón bajo uno de tres cubiletes y los mezcla. Sigue el doblón con la vista y elige: si aciertas, cobras el doble de lo apostado. Cuanto mayor la ficha, más rápido mezcla.|The dealer hides a doubloon under one of three cups and shuffles them. Follow the doubloon with your eyes and pick: guess right and you win double your stake. The bigger the stake, the faster he shuffles.|Le croupier cache un doublon sous l'un des trois gobelets et les mélange. Suis le doublon des yeux et choisis : si tu as raison, tu gagnes le double de ta mise. Plus la mise est grosse, plus il mélange vite.|O crupiê esconde um dobrão sob um dos três copos e embaralha. Siga o dobrão com os olhos e escolha: se acertar, recebe o dobro da aposta. Quanto maior a ficha, mais rápido ele embaralha.|Der Croupier versteckt eine Dublone unter einem von drei Bechern und mischt sie. Verfolge die Dublone mit den Augen und wähl: Liegst du richtig, bekommst du den doppelten Einsatz. Je höher der Einsatz, desto schneller mischt er.|Il croupier nasconde un doblone sotto uno dei tre bussolotti e li mescola. Segui il doblone con gli occhi e scegli: se indovini, vinci il doppio della puntata. Più alta è la puntata, più veloce mescola.||荷官把一枚金币藏在三个杯子之一下面并打乱它们。用眼睛盯紧金币再选杯子：猜对赢双倍赌注。赌注越大，他换得越快。|딜러가 도블론 하나를 컵 세 개 중 하나 밑에 숨기고 섞습니다. 눈으로 도블론을 따라가 컵을 고르세요. 맞히면 건 돈의 두 배. 판돈이 클수록 더 빨리 섞습니다.|ディーラーがダブロンを3つのカップのどれかの下に隠してシャッフルする。目で追ってカップを選ぼう。当たれば賭け金の2倍。賭け金が大きいほど速く混ぜる。|Крупье прячет дублон под одним из трёх напёрстков и перемешивает их. Следи за дублоном глазами и выбирай: угадал — получишь удвоенную ставку. Чем больше ставка, тем быстрее он мешает.|Krupier chowa dublona pod jednym z trzech kubków i tasuje je. Śledź dublona wzrokiem i wybierz: trafisz — dostajesz podwójną stawkę. Im wyższa stawka, tym szybciej tasuje."),
      s: L6("Encuentra el doblón y cobras el doble.|Find the doubloon and win double.|Trouve le doublon et gagne le double.|Encontre o dobrão e receba o dobro.|Finde die Dublone: doppelter Einsatz.|Trova il doblone e vinci il doppio.||找到金币，赢双倍赌注。|도블론을 찾으면 두 배.|ダブロンを見つけたら2倍。|Найди дублон — получи вдвое.|Znajdź dublona i wygraj podwójnie."), ico: "bet_cups" },
  });
  const TRL = {
    play: L6("Jugar|Play|Jouer|Jogar|Spielen|Gioca||玩|시작|遊ぶ|Играть|Graj"),
    watch: L6("Mira dónde está el doblón…|Watch where the doubloon is…|Regarde où est le doublon…|Veja onde está o dobrão…|Schau, wo die Dublone liegt…|Guarda dov'è il doblone…||看好金币在哪儿…|도블론이 어디 있는지 봐…|ダブロンの場所をよく見て…|Смотри, где дублон…|Patrz, gdzie jest dublon…"),
    dance: L6("Sigue el doblón|Follow the doubloon|Suis le doublon|Siga o dobrão|Folge der Dublone|Segui il doblone||盯紧金币|도블론을 따라가|ダブロンを追え|Следи за дублоном|Śledź dublona"),
    pick: L6("¡Elige un cubilete!|Pick a cup!|Choisis un gobelet !|Escolha um copo!|Wähl einen Becher!|Scegli un bussolotto!||选一个杯子！|컵을 골라!|カップを選べ！|Выбирай напёрсток!|Wybierz kubek!"),
    joke: L6("Se lo ha quedado|He kept it|Il l'a gardé|Ficou com ele|Er hat sie behalten|Se l'è tenuto|Se lo quedó|被他私吞了|딜러가 꿀꺽했다|懐に入れた|Он его прикарманил|Zatrzymał go sobie"),
  };
  const CUPS_CFG = [{ n: 6, dur: 640, rots: 0, feints: 0 }, { n: 9, dur: 440, rots: 2, feints: 1 }, { n: 12, dur: 310, rots: 3, feints: 2 }];   // por ficha: cambios, ms por cambio, rotaciones de tres y falsos pases
  const CUPS_SLOT = [620, 960, 1300], CUPS_GY = 790;
  let cupsStake = 0;
  const cupsPreload = () => { if (cupsPreload.done) return; cupsPreload.done = 1; ["cup", "glove_grab", "glove_open", "coin_flat", "ring", "shadow", "felt", "cenefa"].forEach(n => { new Image().src = `assets/trile/${n}.png`; }); };
  /* la lista de cambios (sembrada: la misma tirada baila igual); ranuras 0-1-2 de izquierda a derecha */
  function cupsMoves(seed, tier) {
    const c = CUPS_CFG[tier] || CUPS_CFG[0], rnd = A.rng(seed), pairs = [[0, 1], [1, 2], [0, 2]], mv = []; let rots = c.rots, last = "";
    while (mv.length < c.n) {
      let m; const front = rnd() < 0.5 ? 1 : -1;
      if (rots > 0 && rnd() < 0.3) { m = { type: "rot", dir: rnd() < 0.5 ? 1 : -1 }; rots--; } else { const p = pairs[Math.floor(rnd() * 3)]; m = { type: "swap", a: p[0], b: p[1], front }; }
      const key = m.type + (m.a != null ? m.a + "" + m.b : m.dir); if (key === last) continue; last = key; mv.push(m);
    }
    for (let i = 0; i < c.feints; i++) { const p = pairs[Math.floor(rnd() * 3)]; mv.splice(1 + Math.floor(rnd() * (mv.length - 1)), 0, { type: "feint", a: p[0], b: p[1], front: rnd() < 0.5 ? 1 : -1 }); }
    return mv;
  }
  function spinCups(o, done) {
    const SL = CUPS_SLOT, GY = CUPS_GY, ANCH = 176, LIFT = 130, ARC = 40, lerp = (a, b, t) => a + (b - a) * t, ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2), easeOut = p => 1 - Math.pow(1 - p, 3);
    const html = `<div class="tr-stage"><div class="tr-bg"></div><img class="tr-dealer" src="assets/icons/dealer_neutral.webp" alt="" draggable="false"><div class="tr-bubble"><span></span></div>
      <div class="tr-left"><div class="rou-pick"><span class="rp-dot rp-cups"></span><span class="rp-k">${A.tx(BT.seal)}</span><b>${A.tx(BETS.cups.n)} · ${o.stake}</b></div><div class="tr-hint"></div></div>
      <div class="tr-top"><b class="tr-no">${A.tx(BT2.noMore)}</b><div class="tr-res"><span class="tr-plate"></span><span class="tr-msg"></span></div></div>
      <div class="tr-band"><i class="rou-lights top"></i><i class="rou-lights bot"></i></div></div>`;
    const sh = rouShell("cups", html, {}, () => { try { A.dealer.hold(false); } catch (e) { /* sin crupier */ } done(); });
    if (!sh) return;
    try { A.dealer.hold(true); } catch (e) { /* sin crupier */ }                                  // el crupier de la esquina calla: aqui habla el de la mesa
    const ov = sh.ov, stage = ov.querySelector(".tr-stage"), reduced = sh.reduced, Q = s => ov.querySelector(s), CANCEL = {};
    ov.classList.remove("spin");
    const fit = () => { const W = ov.clientWidth || innerWidth, H = ov.clientHeight || innerHeight; let k = 2; for (const c of [3, 4, 5, 6]) if ((1920 * c / 4 - W) / 2 <= 90 && (1080 * c / 4 - H) / 2 <= 24) k = c;   // K entero: cada pixel del arte = K pixeles de pantalla
      stage.style.transform = `translate(${Math.round((W - 1920 * k / 4) / 2)}px,${Math.round((H - 1080 * k / 4) / 2)}px) scale(${k / 4})`; };
    fit(); const onResize = () => { if (ov.isConnected) fit(); else removeEventListener("resize", onResize); }; addEventListener("resize", onResize);
    const alive = () => !sh.closed && ov.isConnected;
    const sleep = ms => new Promise((res, rej) => setTimeout(() => (alive() ? res() : rej(CANCEL)), ms));
    const run = (dur, fn) => new Promise((res, rej) => { const t0 = performance.now(); const f = now => { if (!alive()) return rej(CANCEL); const p = Math.min(1, (now - t0) / dur); fn(p); p < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
    const mk = (cls, inner, parent) => { const d = document.createElement("div"); d.className = cls; if (inner) d.innerHTML = inner; (parent || stage).appendChild(d); return d; };
    const IMG = (n, w, h) => `<img src="assets/trile/${n}.png" width="${w}" height="${h}" alt="" draggable="false">`;
    const cups = SL.map((x, i) => {
      const ring = mk("tr-ring", IMG("ring", 232, 72)); ring.style.transform = `translate3d(${x - 116}px,${GY + 2 - 36}px,0)`;
      const num = mk("tr-num", String(i + 1)); num.style.transform = `translate3d(${x - 40}px,${GY + 52}px,0)`;
      return { id: i, x, arc: 0, lift: 0, hl: 0, z: 10 + i, num, sh: mk("tr-shadow", IMG("shadow", 176, 48)), el: mk("tr-cup", IMG("cup", 192, 224)) };
    });
    const coin = { cup: o.coinId, show: false, el: mk("tr-coin", IMG("coin_flat", 76, 52)) };
    const spinEl = mk("tr-spin"), gloveLayer = mk("tr-glovelayer");
    const gloves = [0, 1].map(i => ({ vis: 0, tv: 0, x: 0, y: -400, cup: null, el: mk("tr-glove" + (i ? " r" : ""), IMG("glove_grab", 184, 200), gloveLayer) }));
    const openGlove = { vis: 0, tv: 0, x: 0, y: 0, el: mk("tr-glove open", IMG("glove_open", 184, 248)) };
    const jokeCoin = mk("tr-coin", IMG("coin_flat", 76, 52)); jokeCoin.style.display = "none"; jokeCoin.style.zIndex = 102;
    const order = [0, 1, 2], slotOf = id => order.indexOf(id), cupTop = c => GY - ANCH + c.arc - Math.round((c.lift + c.hl * 0.11) * LIFT);
    const render = () => {
      if (!alive()) return;
      for (const c of cups) {
        c.el.style.transform = `translate3d(${Math.round(c.x - 96)}px,${Math.round(cupTop(c))}px,0)`; c.el.style.zIndex = c.z;
        c.sh.style.transform = `translate3d(${Math.round(c.x - 88)}px,${Math.round(GY - 18 + c.arc * 0.25)}px,0)`; c.sh.style.opacity = Math.max(0.25, 1 - 0.4 * c.lift - Math.abs(c.arc) * 0.004);
      }
      const cc = cups[coin.cup];                                                              // el doblon acompana a su cubilete (arco incluido) y queda en el tapete al levantarlo
      coin.el.style.display = coin.show ? "block" : "none"; if (coin.show) coin.el.style.transform = `translate3d(${Math.round(cc.x - 38)}px,${Math.round(GY - 32 + cc.arc)}px,0)`;
      for (const g of gloves) {
        g.vis += (g.tv - g.vis) * 0.34; if (Math.abs(g.tv - g.vis) < 0.01) g.vis = g.tv;
        if (g.cup != null) { const c = cups[g.cup], gx = c.x - 92, gy = cupTop(c) - 124; if (g.vis < 0.05 && g.tv === 1) { g.x = gx; g.y = gy - 150; } g.x += (gx - g.x) * 0.42; g.y += (gy - g.y) * 0.42; }
        g.el.style.opacity = g.vis; g.el.style.transform = `translate3d(${Math.round(g.x)}px,${Math.round(g.y - (1 - g.vis) * 60)}px,0)`;
      }
      openGlove.vis += (openGlove.tv - openGlove.vis) * 0.3; openGlove.el.style.opacity = openGlove.vis; openGlove.el.style.transform = `translate3d(${Math.round(openGlove.x)}px,${Math.round(openGlove.y + (1 - openGlove.vis) * 70)}px,0)`;
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
    const attach = (g, id) => { g.cup = id; g.tv = id == null ? 0 : 1; }, release = () => gloves.forEach(g => { g.tv = 0; });
    /* el crupier: globo (Jersey, siempre 1 s mas en pantalla), cara y pista */
    const bubble = Q(".tr-bubble"), bTx = bubble.firstChild, dealerImg = Q(".tr-dealer"), hintEl = Q(".tr-hint"); let bubbleT = 0;
    const face = f => { dealerImg.src = `assets/icons/dealer_${f}.webp`; };
    const say = (key, f) => { const t = A.tx(A.dealer.line(key)) || ""; bTx.textContent = t; bubble.classList.add("on"); if (f) face(f); clearTimeout(bubbleT); bubbleT = setTimeout(() => bubble.classList.remove("on"), 1800 + t.length * 22 + (A.dealer.LINGER || 1000)); };
    const hint = k => { if (!k) { hintEl.classList.remove("on"); return; } hintEl.textContent = A.tx(TRL[k]); hintEl.classList.add("on"); };
    const plate = (kind, name, extra, msg) => { const p = Q(".tr-plate"); p.className = "tr-plate " + kind; p.innerHTML = `<b>${name}</b>${extra ? `<i>${extra}</i>` : ""}`; Q(".tr-msg").textContent = msg; const r = Q(".tr-res"); r.classList.remove("on"); void r.offsetWidth; r.classList.add("on"); };
    /* el baile */
    async function doMove(m, dur, i) {
      const D = reduced ? Math.max(280, dur) : dur, arcK = reduced ? 0 : 1; A.sfx.cupClack(i);
      if (m.type === "swap" || m.type === "feint") {
        const a = order[m.a], b = order[m.b], ca = cups[a], cb = cups[b], xa = SL[m.a], xb = SL[m.b], front = m.front, feint = m.type === "feint";
        if (!reduced) { attach(gloves[0], a); attach(gloves[1], b); }
        await run(feint ? D * 0.85 : D, p => { const e = ease(p), s = Math.sin(Math.PI * p);
          ca.x = feint ? xa + (xb - xa) * 0.4 * s : lerp(xa, xb, e); cb.x = feint ? xb + (xa - xb) * 0.4 * s : lerp(xb, xa, e);
          ca.arc = front * ARC * s * arcK; cb.arc = -front * ARC * s * arcK; ca.z = front > 0 ? 30 : 20; cb.z = front > 0 ? 20 : 30; });
        if (!feint) { order[m.a] = b; order[m.b] = a; }
        ca.x = SL[slotOf(a)]; cb.x = SL[slotOf(b)]; ca.arc = cb.arc = 0;
      } else {                                                                                // rotacion de tres: el que cruza dos casillas va por detras
        const d = m.dir, moves = order.map((id, s) => ({ id, from: s, to: (s + d + 3) % 3 })), long = moves.find(x => Math.abs(x.to - x.from) === 2), other = moves.find(x => x !== long);
        if (!reduced) { attach(gloves[0], long.id); attach(gloves[1], other.id); }
        await run(D * 1.35, p => { const e = ease(p), s = Math.sin(Math.PI * p); for (const x of moves) { const c = cups[x.id]; c.x = lerp(SL[x.from], SL[x.to], e); c.arc = (x === long ? -1 : 0.55) * ARC * s * arcK; c.z = x === long ? 18 : 24; } });
        const next = [0, 0, 0]; for (const x of moves) next[x.to] = x.id; next.forEach((id, s) => (order[s] = id)); for (const c of cups) { c.x = SL[slotOf(c.id)]; c.arc = 0; }
      }
      cups.forEach(c => (c.z = 10 + slotOf(c.id)));
    }
    const lift = async (id, to, ms = 360) => { const c = cups[id], from = c.lift; await run(reduced ? 160 : ms, p => (c.lift = lerp(from, to, easeOut(p)))); };
    let pickResolve = null, pickable = false;
    const choose = () => new Promise(res => { pickable = true; cups.forEach(c => c.el.classList.add("pick")); pickResolve = id => { pickable = false; cups.forEach(c => { c.el.classList.remove("pick"); c.hl = 0; c.num.classList.remove("hot"); }); pickResolve = null; res(id); }; });
    const pickSlot = s => { if (pickable && pickResolve) { A.sfx.cupClack(2); pickResolve(order[s]); } };
    let sel = -1; const setSel = s => { cups.forEach(c => { c.hl = 0; c.num.classList.remove("hot"); }); sel = s; if (s >= 0) { const c = cups[order[s]]; c.hl = 1; c.num.classList.add("hot"); A.sfx.cupClack(0); } };
    cups.forEach(c => {
      c.el.addEventListener("click", () => pickSlot(slotOf(c.id)));
      c.el.addEventListener("mouseenter", () => { if (!pickable) return; setSel(slotOf(c.id)); }); c.el.addEventListener("mouseleave", () => { if (pickable && sel === slotOf(c.id)) setSel(-1); });
    });
    const onKey = e => { if (!ov.isConnected) { removeEventListener("keydown", onKey, true); return; } if (!pickable) return;
      if (e.key >= "1" && e.key <= "3") pickSlot(+e.key - 1); else if (e.key === "ArrowLeft" || e.key === "ArrowRight") setSel(sel < 0 ? (e.key === "ArrowLeft" ? 2 : 0) : (sel + (e.key === "ArrowLeft" ? 2 : 1)) % 3); else if ((e.key === "Enter" || e.key === " ") && sel >= 0) pickSlot(sel); };
    addEventListener("keydown", onKey, true);
    (async () => {
      try {
        const joke = o.joke, coinId = o.coinId; coin.show = true;
        // 1. muestra: el crupier levanta el cubilete de la doblon y la ensena
        hint("watch"); say("trileIntro", "neutral"); await sleep(700);
        attach(gloves[0], coinId); await sleep(260); A.sfx.cupLift(); await lift(coinId, 1, 420); await sleep(reduced ? 700 : 1100); await lift(coinId, 0, 340); A.sfx.cupClack(0); release(); await sleep(260);
        if (joke) coin.show = false;                                                          // el chiste: el doblon ya no esta en la mesa (el crupier se lo guarda ahora)
        // 2. baile
        const no = Q(".tr-no"); no.classList.remove("on"); void no.offsetWidth; no.classList.add("on"); A.sfx.rouNoMore(); ov.classList.add("spin");
        hint("dance"); say("trileDance"); await sleep(1100);
        const dur = CUPS_CFG[o.tier].dur;
        for (let i = 0; i < o.seq.length; i++) { await doMove(o.seq[i], dur, i); if (dur >= 400 || i === o.seq.length - 1) release(); await sleep(i === o.seq.length - 1 ? 200 : Math.max(40, dur * 0.18)); }
        release(); ov.classList.remove("spin");
        // 3. elige
        hint("pick"); say("trilePick"); if (A.haptic) A.haptic([8]); sh.waiting(true); const pickId = await choose(); sh.waiting(false);
        const rec = o.onPick(pickId), win = rec.win;                                           // la tirada se decide y se guarda AQUI, antes de la revelacion
        // 4. revelacion
        hint(null); ov.classList.add("hush"); bubble.classList.remove("on"); A.sfx.cupDrum(900); await sleep(950);
        attach(gloves[0], pickId); await sleep(180); A.sfx.cupLift(); await lift(pickId, 1, 420); A.sfx.rouStop();
        if (win) {
          coin.cup = pickId; coin.show = true; await sleep(300); face("angry"); A.sfx.jackpot(1); if (A.core.jpShake) A.core.jpShake(1); if (A.haptic) A.haptic([30, 30, 60]); ov.classList.add("win", "flash");
          const c = cups[pickId], x = c.x - 96, y0 = GY - 150; spinEl.style.display = "block"; let f = 0;                      // la doblon del juego (24 fotogramas) sale hacia el espectador y cae
          await run(reduced ? 300 : 900, p => { const h = Math.sin(Math.PI * p) * 150; spinEl.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y0 - h)}px,0)`; const nf = Math.floor(p * 36) % 24; if (nf !== f) { f = nf; spinEl.style.backgroundPositionX = -nf * 192 + "px"; } });
          spinEl.style.display = "none"; sh.outcome(); plate("win", A.tx(BT.won), "×2", "+" + rec.pay); say("betWin");
          await sleep(500); for (const oc of cups) if (oc.id !== pickId) { attach(gloves[1], oc.id); await sleep(120); await lift(oc.id, 1, 320); }
          release(); sh.hold(3400);
        } else {
          if (!joke) coin.show = true;                                                        // al levantar el tuyo vacio, el crupier ensena donde estaba
          await sleep(joke ? 700 : 500);
          for (const oc of cups) if (oc.id !== pickId) { attach(gloves[1], oc.id); await sleep(150); A.sfx.cupLift(); await lift(oc.id, 1, 360); await sleep(joke ? 330 : 240); }
          release(); ov.classList.add("lose");
          if (joke) {                                                                          // el chiste del trilero: los tres vacios; suelta el doblon de entre los dedos, guina y se lo guarda
            ov.classList.add("joke"); ov.classList.remove("hush"); face("laugh"); await sleep(800);
            openGlove.x = 640; openGlove.y = 300; openGlove.tv = 1; jokeCoin.style.display = "block"; jokeCoin.style.transform = `translate3d(${openGlove.x + 54}px,${openGlove.y + 112}px,0)`;
            A.sfx.cupWink(); sh.outcome(); say("trileJoke"); plate("joke", A.tx(TRL.joke), "", "−" + o.stake); ov.classList.add("flash"); A.sfx.lose(); if (A.core.jpShake) A.core.jpShake(1); if (A.haptic) A.haptic([40, 20, 40]);
            sh.hold(5200); await sleep(2600);
            await run(reduced ? 200 : 520, p => { const e = easeOut(p); jokeCoin.style.transform = `translate3d(${Math.round(lerp(openGlove.x + 54, 860, e))}px,${Math.round(lerp(openGlove.y + 112, 360, e) - Math.sin(Math.PI * p) * 70)}px,0)`; jokeCoin.style.opacity = 1 - p * 0.9; });
            jokeCoin.style.display = "none"; A.sfx.stamp();
          } else { sh.outcome(); face("laugh"); A.sfx.lose(); say("betLose"); plate("lose", A.tx(BT.lost), "", "−" + o.stake); ov.classList.add("flash"); sh.hold(3000); }
        }
      } catch (e) {
        if (e === CANCEL) { if (!sh.closed && !ov.isConnected) sh.bail("capa retirada"); return; }   // otra pantalla se llevo la capa: que el Campamento no se quede bloqueado
        try { console.error("trile", e); } catch (x) { /* nada */ }
        if (o.onError) o.onError(); sh.bail(e);                                               // pase lo que pase, el Campamento no se queda bloqueado (y no se pierde la ficha por un fallo)
      } finally { removeEventListener("keydown", onKey, true); }
    })();
  }
  A.adv._cups = { moves: cupsMoves, cfg: CUPS_CFG, card: () => betHtml("cups"), rec: () => casOf(roundNo()) };
  /* ---------------- v0.2.49: los juegos de casino que viven en su propio archivo (js/casino-*.js, despues de este) ----------------
     Un archivo registra su juego con A.adv.casino.add({ id, bet: { n, d, s, ico }, card(cx), wire(el, cx) }): entra en CASINO (el sorteo del centro de la Barra), su carta se pinta con
     card() y se cablea con wire(). cx es CX (abajo) mas { b, head, att } en card() y { r } en wire(); b es el registro de la ronda (run.reds[r]). Cada juego guarda su registro ANTES de animar. */
  const CASINO_EXT = {};
  const CX = {
    get run() { return run; }, get open() { return rouOpen; }, round: roundNo, persist, rouShell, reelPick, coinCost, STAKES: COIN_STAKES, CN, BT, BT2, ic, L6, casOf,
    shake: el => shake(el),                                                                                 // (shake se define mas abajo)
    refresh: () => { if (!run || C().S.phase !== "shop" || !run.stock) return; renderShop(false); },        // repinta el Campamento cuando se cierra la pantalla del juego
    coins: () => { const cb = document.querySelector("#shopCoins b"); if (cb) cb.textContent = run.coins; },   // el saldo que se ve detras de la capa
  };
  A.adv.casino = { add(def) { CASINO_EXT[def.id] = def; BETS[def.id] = def.bet; if (!CASINO.includes(def.id)) CASINO.push(def.id); }, ids: () => CASINO.slice() };                                         // solo para pruebas (dev/)
  const SUPS = [
    { id: "cafe", cost: 4, ico: "sup_cafe", n: A.L("Café doble", "Double espresso"), d: A.L("+4 s por pregunta en la próxima ronda", "+4 s per question next round") },
    { id: "seguro", cost: 8, ico: "sup_seguro", n: A.L("Seguro de ronda", "Round insurance"), d: A.L("Si fallas la próxima ronda, no pierdes provisión", "If you fail next round, you keep your provision") },
  ];
  const supCost = s => price(s.cost + (s.id === "seguro" ? 2 * (run.segN || 0) : 0));   // cada Seguro de ronda gastado (el que te salva al fallar; ver roundEnd) encarece el siguiente: no se puede fallar gratis para siempre
  let supFresh = null;                                                 // el suministro recien comprado: solo a ese le cae el sello
  function supHtml() {
    const sup = run.sup || {}, r = roundNo(), card = s => `<button class="sup sp-${s.id}${sup[s.id] ? " on" : ""}${supFresh === s.id ? " fresh" : ""}" data-sup="${s.id}" type="button"><span class="sp-ic">${ic(s.ico)}</span><span class="sp-t"><b>${A.tx(s.n)}</b><i>${A.tx(s.d)}</i></span>${sup[s.id] ? `<em class="sp-on">${A.T("Activo", "On")}</em>` : `<em class="sp-p">${CN()}${supCost(s)}</em>`}</button>`;
    const void_ = '<i class="sup-void"></i>', red = betHtml(casinoKind(r)), slot = id => (!id ? "" : SIDE_GAMES.includes(id) ? betHtml(id) : card(SUPS.find(x => x.id === id))) || void_;
    const [L, R] = barOf(r);
    supFresh = null;
    return `<div class="tb-sup${red ? "" : " no-cas"}">${slot(L)}${red || ""}${slot(R)}</div>`;   // izquierda, un suministro; derecha, la apuesta que toque (o hueco); centro, el juego de casino (si la casa ya abre las apuestas)
  }
  function wireSup() {
    document.querySelectorAll("[data-sup]").forEach(b => (b.onclick = () => {
      const s = SUPS.find(x => x.id === b.dataset.sup), c = supCost(s); run.sup = run.sup || {};
      if (run.sup[s.id]) { run.coins += typeof run.sup[s.id] === "number" ? run.sup[s.id] : run.sup[s.id] === "gift" ? 0 : c; run.sup[s.id] = false; A.sfx.sell(); }   // devuelve lo que pagaste (vender el Vale entre medias ya no regala 1)
      else { if (run.coins < c) { A.sfx.deny(); shake(b); return; } run.coins -= c; run.sup[s.id] = c; supFresh = s.id; run.visitBuys = (run.visitBuys || 0) + 1; A.sfx.buy(); if (SUPS.every(x => run.sup[x.id])) A.ach.emit("adv", { kind: "supplies" }); }
      persist(); renderShop(false);
    }));
  }
  const shake = el => { el.classList.remove("no"); A.restyle(el); el.classList.add("no"); };   // A.restyle: sin forzar la maquetacion (offsetWidth daba tirones)
  /* sin fondos: le cae un sello a la carta (como el DENEGADO de la salida) y el crupier lo comenta una vez por visita */
  const NOFUNDS = "Sin fondos|No funds|Sans le sou|Sem fundos|Keine Deckung|Senza fondi||余额不足|잔고 부족|残高不足|Нет средств|Brak środków";
  function noFunds(el) {
    A.sfx.stamp(); if (A.haptic) A.haptic([20, 30, 40]);
    let st = el.querySelector(".of-stamp"); if (!st) { st = document.createElement("b"); st.className = "of-stamp"; st.textContent = A.pick6(NOFUNDS); el.appendChild(st); }
    st.classList.remove("on"); A.restyle(st); st.classList.add("on");
    if (A.dealer.campNoFunds) A.dealer.campNoFunds(run.coins);
  }
  /* el trile: las cartas se dan la vuelta y se barajan como cubiletes antes de las nuevas (solo animacion: las cartas y precios son los que tocan) */
  function shellCards(done) {
    const tb = document.querySelector("#dlg .table"), cards = [...document.querySelectorAll("#dlg .offers .offer")], S = C().S;
    const reduced = (S && S.reduce) || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fin = () => { if (tb) tb.classList.remove("shelling"); if (C().S.phase === "shop" && run && run.phase === "shop") done(); };
    if (!tb || cards.length < 2 || reduced) return fin();
    tb.classList.add("shelling");
    const xs = cards.map(c => c.getBoundingClientRect().left);
    cards.forEach(c => c.animate([{ transform: "rotateY(0)" }, { transform: "rotateY(90deg)" }], { duration: 170, easing: "ease-in" }).onfinish = () => { c.classList.add("faced"); c.animate([{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0)" }], { duration: 170, easing: "ease-out" }); });
    let pass = 0;
    const one = () => {
      if (!tb.isConnected) return fin();
      const a = pass % cards.length, b = (a + 1) % cards.length, dx = xs[b] - xs[a], up = pass % 2 ? 1 : -1;
      cards[a].animate([{ transform: "none" }, { transform: `translate(${dx / 2}px, ${-28 * up}px) scale(1.04)` }, { transform: `translate(${dx}px, 0)` }, { transform: "none" }], { duration: 420, easing: "ease-in-out" });
      cards[b].animate([{ transform: "none" }, { transform: `translate(${-dx / 2}px, ${28 * up}px)` }, { transform: `translate(${-dx}px, 0)` }, { transform: "none" }], { duration: 420, easing: "ease-in-out" });
      A.sfx.card(); if (pass % 2) A.sfx.chip(pass);
      if (++pass < 3) setTimeout(one, 440); else setTimeout(fin, 460);
    };
    setTimeout(one, 380);
  }
  function buy(el, chest) {
    if (legOn) return;
    const i = +el.dataset.ix, s = run.stock[i]; if (!s || run.bought.includes(i)) return;   // data-ix (no data-i: cambiar de idioma reescribe todo [data-i] con A.t)
    if (s.k === "life") { const c = lifePrice(); if (run.lives >= run.maxLives) { A.sfx.deny(); shake(el); return; } if (run.coins < c) return noFunds(el); run.coins -= c; run.lives++; run.lifeBuys = (run.lifeBuys || 0) + 1; run.bought.push(i); A.sfx.buy(); persist(); return renderShop(chest); }
    if (s.k === "perk") {
      const p = A.RELICS[s.id], c = chest ? 0 : cardCost(s);
      if (owned(s.id)) return;                                            // 0.2.5: un amuleto no se compra dos veces (tiendas guardadas de antes, con su recarga)
      const swapV = p.ventaja ? perkList().find(q => q.ventaja && q.id !== s.id) : null;
      if (!swapV && !p.pact && bagN() >= maxPerks()) {                // tanda 9 (S10): mochila llena: eliges cual vendes y la carta entra en su hueco, en un gesto
        if (run.coins + Math.max(...bag().map(sellValue)) < c) return noFunds(el);
        swapIx = i; document.querySelectorAll("#dlg .tr-relic:not(.tr-pact)").forEach(x => { x.classList.add("swap-pick"); x.dataset.sv = "+" + sellValue(x.dataset.relic); }); document.querySelectorAll("#dlg .offer").forEach(x => x.classList.toggle("swap-src", x === el)); A.sfx.card(); flash(A.tx(SWAP_PICK)); return;   // 0.2.21: cada reliquia ensena lo que te dan por venderla (antes una flecha de cambio)
      }
      if (run.coins + (swapV ? sellValue(swapV.id) : 0) < c) return noFunds(el);
      if (swapV) { run.coins += sellValue(swapV.id); run.perks.splice(run.perks.indexOf(swapV.id), 1); if (run.paid) delete run.paid[swapV.id]; A.sfx.sell(); }   // la Ventaja vieja se vende
      if (!chest && A.dealer.campBought) A.dealer.campBought(s.id, A.tx(p.n), run.seed);
      run.coins -= c; run.perks.push(s.id);
      run.paid = run.paid || {}; run.paidAt = run.paidAt || {}; run.paid[s.id] = c; run.paidAt[s.id] = run.shopKey;
      if (p.buy) p.buy(run); if (p.r === 3 && chest) run.legAch = 1;
      if (p.r === 3) (run.legAct = run.legAct || {})[run.act] = s.id;
      if (p.pact) setTimeout(() => { A.sfx.stamp(); if (A.core.jpShake) A.core.jpShake(2); A.dealer.enable(true); A.dealer.say(A.dealer.line("betDeal"), { mood: "sly", hold: 2400 }); }, 200);   // trato hecho: un hueco lacrado mas   // tanda 12: la legendaria de este acto   // Botin legendario: solo la del cofre del jefe. Se concede en la tienda (openShop): su aviso no tapa la secuencia
    } else {
      const c = cardCost(s);
      if (!run.tools[s.id] && Object.keys(run.tools).length >= 4) { A.sfx.deny(); shake(el); flash(A.T("Solo 4 herramientas distintas.", "Only 4 different tools.")); return; }
      if (run.coins < c) return noFunds(el);
      run.coins -= c; addTool(s.id);
    }
    if (s.fix) run.fixUsed = `${roundNo()}:${run.attempt}`;              // ya cobraste la rebaja de esta revancha
    const leg = (chest || s.vit) && s.k === "perk" && A.RELICS[s.id].r === 3;   // la de la vitrina tambien tiene su secuencia       // la legendaria del cofre: su propia secuencia (y sus sonidos)
    run.bought.push(i); run.visitBuys = (run.visitBuys || 0) + 1; if (!leg) A.sfx.buy(); persist();
    if (chest) { run.stock = null; run.bought = []; if (leg) run.phase = "shop"; persist(); return leg ? legendary(el) : openShop(false); }   // guardada ya en la tienda: si se cierra a mitad, la reliquia es tuya y no vuelve el cofre
    if (leg) return legendary(el);
    renderShop(chest);
  }
  /* PAN DE ORO: al elegir la legendaria en el cofre del jefe (~2 s, la secuencia del prototipo aprobado). Las otras cartas caen de la mesa y la sala
     se oscurece en ambar; la legendaria sube al centro con un bote (pasa por x1,12 y se posa a x1: el pixel queda entero) mientras suena su subida
     y la barre el brillo; jackpot(3) con sus tres golpes (A.audio.jpGap): en cada uno el marco se enciende, saltan 3, 5 y 9 doblones por delante y
     la pantalla tiembla 1, 2 y 3 (Vibracion y "reducir movimiento" mandan, como en jpShake); al final habla el crupier (js/dealer.js, campLegend) y,
     en cuanto empieza su frase, la sala se enciende y la carta vuela a su hueco de la mochila, que destella en oro. Despues, la tienda: cuando el
     crupier acaba su frase y su segundo de mas (nunca se le corta). Antes de empezar la reliquia ya esta comprada y guardada (y el logro, en deuda:
     su aviso sale en la tienda). Sin clics mientras dura (mesa inerte; Esc tampoco abre el menu: A.adv.busy). Se mide todo una vez al empezar;
     despues solo transform y opacity */
  let legOn = 0, legN = 0;                                             // legOn: la secuencia en curso (0: ninguna); legN: contador, nunca se repite
  const legWait = ms => new Promise(r => setTimeout(r, ms));
  const legPaint = () => new Promise(r => { requestAnimationFrame(() => setTimeout(r, 0)); setTimeout(r, 60); });   // tras pintar el fotograma de ahora (o 60 ms, con la ventana oculta)
  function legCoins(fx, x, y, n) {                                       // doblones que saltan de la carta (en px del lienzo: la mesa lleva su zoom)
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i"); c.className = "lg-coin"; c.style.left = x + "px"; c.style.top = y + "px"; fx.appendChild(c);
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 150 + Math.random() * 170, dx = Math.cos(ang) * v, up = Math.sin(ang) * v, fall = 260 + Math.random() * 160;
      c.animate([{ transform: "translate(0, 0) scale(.6)", opacity: 1 }, { transform: `translate(${(dx * 0.55).toFixed(1)}px, ${up.toFixed(1)}px) scale(1)`, opacity: 1, offset: 0.38, easing: "cubic-bezier(.2, .6, .5, 1)" },
        { transform: `translate(${dx.toFixed(1)}px, ${(up + fall).toFixed(1)}px) scale(.9)`, opacity: 0 }], { duration: 900 + Math.random() * 300, easing: "cubic-bezier(.3, 0, .8, .6)" }).onfinish = () => c.remove();
    }
  }
  async function legendary(el) {
    const tok = (legOn = ++legN), r0 = run, tb = el.closest(".table");
    const alive = () => legOn === tok && run === r0 && tb.isConnected;
    const end = () => {                                                  // si saliste a la portada entretanto, nada
      if (legOn !== tok) return; if (!(run === r0 && tb && tb.isConnected)) { legOn = 0; return; }
      if (A.dealer.release) A.dealer.release();                          // ya dijo su frase y su segundo de mas: se va, y la tienda llega un poco despues (no en el mismo fotograma)
      setTimeout(() => { if (legOn !== tok) return; legOn = 0; if (run === r0 && tb.isConnected) openShop(false); }, 140);
    };
    try {                                                                // si algo falla a mitad, la tienda llega igual (la mesa no se queda inerte)
      const id = r0.perks[r0.perks.length - 1], S = C().S, rm = !!(S && S.reduce) || RMQ.matches;
      if (!tb || !A.RELICS[id]) return end();
      const offers = tb.querySelector(".offers"), others = [...offers.querySelectorAll(".offer")].filter(o => o !== el), g = Gold.of(el);
      const slot = tb.querySelectorAll(".tr-relics .tray-row > *")[bagN() - 1], icoSrc = (el.querySelector(".of-ico img") || {}).src || "";
      tb.classList.add("lg-seq"); el.classList.add("lg-hero"); tb.inert = true;
      /* medir (una sola vez, ya con la mesa quieta): en pixeles de pantalla; las animaciones van en px del lienzo (/k, la mesa lleva zoom) */
      const k = el.currentCSSZoom || A.uiK(), lr = el.getBoundingClientRect(), or = offers.getBoundingClientRect(), dr = tb.parentNode.getBoundingClientRect(), sr = slot ? slot.getBoundingClientRect() : null;
      const from = getComputedStyle(el).transform, m = from && from !== "none" ? new DOMMatrixReadOnly(from) : null, tx = m ? m.m41 : 0, ty = m ? m.m42 : 0, w0 = el.offsetWidth || 1, sw = slot ? slot.offsetWidth : 56;
      const lx = lr.left + lr.width / 2, ly = lr.top + lr.height / 2, cx = rm ? lx : or.left + or.width / 2, cy = rm ? ly : Math.max(dr.top + lr.height * 0.56 + 8, Math.min(dr.top + dr.height * 0.46, or.top + or.height / 2));
      const to = (x, y, sc) => `translate(${((x - lx) / k + tx).toFixed(2)}px, ${((y - ly) / k + ty).toFixed(2)}px) scale(${sc})`, up = to(cx, cy, 1);
      const dim = document.createElement("i"), fx = document.createElement("i"); dim.className = "lg-dim"; fx.className = "lg-fx";
      dim.style.setProperty("--lx", (((cx - dr.left) / dr.width) * 100).toFixed(1) + "%"); dim.style.setProperty("--ly", (((cy - dr.top) / dr.height) * 100).toFixed(1) + "%");
      tb.append(dim, fx);
      const fxX = (cx - dr.left) / k, fxY = (cy - dr.top) / k;
      /* 0,0 s: las otras caen de la mesa y la sala se oscurece; 0,1 s: la legendaria sube al centro (bote: x1,12 a medio camino y se posa a x1),
         suena su subida (A.sfx.lift) y el brillo la barre */
      A.sfx.card();
      others.forEach((o, i) => o.animate(rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1 }, { opacity: 0, transform: `translateY(70px) rotate(${i ? 9 : -9}deg)` }], { duration: 380, easing: "cubic-bezier(.5, 0, .75, 0)", fill: "forwards" }));
      dim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, fill: "forwards" });
      if (!rm) el.animate([{ transform: from && from !== "none" ? from : "none", easing: "cubic-bezier(.25, 1.25, .5, 1)" }, { transform: to(cx, cy, 1.12), offset: 0.62, easing: "cubic-bezier(.45, 0, .4, 1)" }, { transform: up }], { duration: 440, delay: 100, fill: "both" });
      if (g) { g.live = true; setTimeout(() => g.sweep(0.5), 100); }
      setTimeout(() => { if (alive()) A.sfx.lift(); }, 100);
      await legWait(520); if (!alive()) return end();
      /* 0,5 s: jackpot(3). En cada golpe: el marco se enciende, saltan 3, 5 y 9 doblones y la pantalla tiembla 1, 2 y 3. El golpe 1 se pinta ANTES
         de sintetizar el jackpot (el jackpot crea los nodos de cada golpe poco antes de que suene, pero el primero va al momento): el temblor, los
         doblones y la carta ya van por el compositor y el sonido llega un fotograma despues (el oido lo acepta; al reves, no). Los golpes 2 y 3, al compas del sonido */
      const gap = A.audio.jpGap * 1000;
      const hit = n => {
        if (C().jpShake) C().jpShake(n + 1);
        el.classList.add("hit"); setTimeout(() => el.classList.remove("hit"), 150);
        if (g) g.sweep(0.38);
        if (!rm) legCoins(fx, fxX, fxY, [3, 5, 9][n]);
        if (n === 2 && !rm) el.animate([{ transform: "scale(1)" }, { transform: "scale(1.09)" }, { transform: "scale(1)" }], { duration: 300, easing: "steps(6, end)", composite: "add" });
      };
      hit(0);
      await legPaint(); if (!alive()) return end();
      const t1 = performance.now(); A.sfx.jackpot(3); A.haptic.jackpot(3);
      for (let n = 1; n < 3; n++) { await legWait(Math.max(0, t1 + n * gap - performance.now())); if (!alive()) return end(); hit(n); }
      await legWait(560); if (!alive()) return end();
      /* 2,0 s: habla el crupier. Si estaba a media frase, la suya espera turno (nunca se le corta) y la carta, en el centro con la sala a oscuras,
         espera con ella: la sala se enciende y la carta vuela a la mochila cuando EMPIEZA su frase (como mucho 7 s) */
      let said, done; const start = new Promise(r => (said = r)), talk = new Promise(r => (done = r));
      if (!(A.dealer.campLegend && A.dealer.campLegend(Math.max(1, rm ? 1 : lr.width * 1.12), () => { said(); done(); }, said))) { said(); done(); }
      await Promise.race([start, legWait(7000)]); if (!alive()) return end();
      dim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, fill: "forwards" });
      if (rm) await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }).finished.catch(() => {});
      if (!rm) {
        await legWait(120); if (!alive()) return end();
        const fly = sr ? to(sr.left + sr.width / 2, sr.top + sr.height / 2, (sw / w0).toFixed(4)) : up;
        await el.animate([{ transform: up }, { transform: fly, opacity: 1, offset: 0.92 }, { transform: fly, opacity: 0 }], { duration: 460, easing: "cubic-bezier(.55, 0, .3, 1)", fill: "forwards" }).finished.catch(() => {});
        if (!alive()) return end();
      }
      /* llega: la reliquia aparece en su hueco con su marco de oro y el hueco destella (el icono va de fondo: una imagen nueva haria reajustar la pantalla).
         Suena el aterrizaje (A.sfx.land: golpe y campana en una nota de la pentatonica al azar, nunca la de la vez anterior) */
      if (slot && slot.isConnected) {
        const face = icoSrc ? `<i class="ic lg-ico" style="background-image:url('${icoSrc}')"></i>` : "";
        slot.insertAdjacentHTML("afterend", relicHtml(id, face)); const mini = slot.nextElementSibling; slot.remove();
        if (mini) { mini.classList.add("lg-in"); Gold.mount(mini); }
        const cnt = tb.querySelector(".tr-relics h4 b"); if (cnt) cnt.textContent = `${bagN()}/${maxPerks()}`;
      }
      A.sfx.land(); A.haptic([30]);
      await Promise.all([Promise.race([talk, legWait(9000)]), legWait(800)]);   // red de seguridad: nunca se queda la mesa bloqueada
      end();
    } catch (e) { console.error(e); end(); }
  }
  A.adv.busy = () => legOn !== 0;                                        // la legendaria del cofre se esta luciendo (js/game.js: Esc no abre el menu)
  function sell(id, chest) { const k = run.perks.indexOf(id); if (k < 0 || (isPact(id) && bagN() > baseSlots())) return; const v = sellValue(id); if (id === "hoard" && run.hucha) { const t = run.hucha >= 20 ? 3 : run.hucha >= 10 ? 2 : 1; A.sfx.jackpot(t); if (A.core.jpShake) A.core.jpShake(t); run.hucha = 0; }   // se rompe: llueven monedas
    run.perks.splice(k, 1); run.coins += v; if (run.paid) delete run.paid[id]; if (A.RELICS[id].sell) A.RELICS[id].sell(run); A.sfx.sell(); persist(); renderShop(!!chest); }   // sell: lo que la reliquia dio al comprarla se va con ella (Corazon de explorador)
  function flash(t) { const n = document.querySelector("#dlg .tb-shop"); if (!n) return; n.querySelectorAll(".shop-flash").forEach(x => x.remove()); const m = document.createElement("p"); m.className = "shop-flash"; m.textContent = t; n.appendChild(m); setTimeout(() => m.remove(), 2200); }   // flotando sobre las cartas: no empuja nada

  /* ---------------- fin de la expedicion ---------------- */
  function endRun(win) {
    const P = A.profile.get(), bonus = run.cleared * 1000 + (run.won ? 2500 : 0), final = finalOf(run), wasRanked = run.ranked, board = run.board, daily = !!(wasRanked && board);
    /* el Reto diario tiene sus propias tablas (Hoy y Ayer): no cuenta para el record ni para la tabla "Aventura" (solo expediciones del modo Aventura) */
    if (!daily) P.adv.bestScore = Math.max(P.adv.bestScore, final);
    P.adv.coins += run.stats.coinsEarned;
    const newAsc = win && run.won && !daily && P.adv.asc < Math.min(5, run.asc + 1) ? Math.min(5, run.asc + 1) : 0;
    if (win && run.won && !daily) P.adv.asc = Math.max(P.adv.asc, Math.min(5, run.asc + 1));   // el Reto diario no desbloquea ascensiones de la Aventura
    A.profile.save();
    const hadBest = (P.records["adv-all"] || 0) > 0, rec = !daily && A.profile.record("adv-all", final);   // la primera expedicion siempre es "record": el crupier solo lo celebra si habia uno que batir
    if (!daily) A.rank.submit("adv-all", { score: final, extra: { deck: run.deck, asc: run.asc, r: run.cleared } });
    A.rank.day.submit(final);                                                                  // "Hoy" y "Ayer" del podio: la mejor partida del dia, sea de la Aventura o del Reto diario
    A.ach.emit("adv", { kind: "end", score: final, won: !!run.won });
    /* Reto diario: el intento se cierra y suma a la puntuacion global del dia (las partidas del formato antiguo, sin numero de intento, cuentan como el primero) */
    let day = null, sent = null;
    if (wasRanked && board) {
      const DY = A.rank.daily, k = run.dailyTry || (DY.get(board).tries.length ? 0 : 1);
      if (k) { sent = DY.finish(board, k, final, { r: run.cleared, won: !!run.won }); day = { k, ...DY.get(board) }; }
      A.ach.emit("daily", {});
    }
    const r = run; run = null; persist(); C().S.run = null; A.chal.end(); A.dealer.enable(true);
    const fell = { r: r.cleared + 1, won: !!r.won, record: rec && hadBest, daily, retire: !!(win && r.won && !daily && r.asc === 5) };   // retire: ganas en Ascension 5 (el crupier se jubila)           // {r}: la ronda en la que caiste
    A.dealer.noteRun(fell);
    /* v0.37: si aun no sabe tu nombre, te lo pregunta bajo un foco (js/nombre.js) y despues solo te invita a jugar otra */
    const asks = A.nombre && A.nombre.maybeAsk({ won: !!win, after: () => A.dealer.tempt({ ...fell, won: !!win }) });
    if (!asks) setTimeout(() => A.dealer.react(win ? "runWin" : "runLose", fell), 900);
    A.sfx.stamp(); setTimeout(win ? A.sfx.victory : A.sfx.lose, 300);
    const summary = (r.won ? A.tf("Superaste {r} rondas y conquistaste los tres actos. Puntos: {p} + bonus {b}.", "You cleared {r} rounds and conquered all three acts. Points: {p} + bonus {b}.", { r: r.cleared, p: A.fmt(r.score), b: A.fmt(bonus) })
      : r.cleared === 1 ? A.tf("Superaste {r} ronda y llegaste al {act}. Puntos: {p} + bonus {b}.", "You cleared {r} round and reached {act}. Points: {p} + bonus {b}.", { r: r.cleared, act: A.tx(actInfo(r.act).n), p: A.fmt(r.score), b: A.fmt(bonus) })
      : A.tf("Superaste {r} rondas y llegaste al {act}. Puntos: {p} + bonus {b}.", "You cleared {r} rounds and reached {act}. Points: {p} + bonus {b}.", { r: r.cleared, act: A.tx(actInfo(r.act).n), p: A.fmt(r.score), b: A.fmt(bonus) })) + (r.asc > 0 ? " " + A.pick6("Ascensión {a}: ×{m} al total.|Ascension {a}: ×{m} on the total.|Ascension {a} : ×{m} sur le total.|Ascensão {a}: ×{m} no total.|Aufstieg {a}: ×{m} auf die Summe.|Ascensione {a}: ×{m} sul totale.||进阶 {a}：总分 ×{m}。|어센션 {a}: 총점 ×{m}.|アセンション{a}：合計に×{m}。|Восхождение {a}: ×{m} к итогу.|Wniebowstąpienie {a}: ×{m} do sumy.").replace("{a}", r.asc).replace("{m}", mulTxt(ascMult(r.asc))) : "") + (rec ? A.T(" ¡Nuevo récord personal!", " New personal best!") : "");
    if (day) {
      const sp = /^(zh|ja)$/.test(A.lang) ? "" : " ", again = day.left > 0 && board === A.rank.daily.board();   // el siguiente intento solo si sigue siendo el mismo dia
      const toBoard = () => C().showHub("daily"), next = () => { A.sfx.depart(); C().S.ranked = null; C().prepareRun(); if (!A.adv.beginDaily(board)) toBoard(); };
      C().verdict({
        kind: win ? "win" : "", level: r.cleared, tag: dailyLbl(day.k),
        title: (win ? A.pick6("Intento {k} cobrado|Attempt {k} cashed out|Essai {k} encaissé|Tentativa {k} recolhida|Versuch {k} ausgezahlt|Tentativo {k} incassato||第 {k} 次尝试已兑现|{k}번째 시도 현금화 완료|挑戦{k}回目をキャッシュアウト|Попытка {k} обналичена|Podejście {k} spieniężone")
          : A.pick6("Fin del intento {k}|Attempt {k} over|Fin de l'essai {k}|Fim da tentativa {k}|Versuch {k} beendet|Fine del tentativo {k}||第 {k} 次尝试结束|{k}번째 시도 종료|挑戦{k}回目終了|Попытка {k} окончена|Koniec podejścia {k}")).replace("{k}", day.k),
        text: summary + sp + A.pick6("Puntuación global de hoy: {t} ({n} de 3 intentos).|Today's global score: {t} ({n} of 3 attempts).|Score global du jour : {t} ({n} essais sur 3).|Pontuação global de hoje: {t} ({n} de 3 tentativas).|Gesamtpunktzahl heute: {t} ({n} von 3 Versuchen).|Punteggio globale di oggi: {t} ({n} tentativi su 3).||今日总分：{t}（已用 {n}/3 次尝试）。|오늘의 총점: {t} (3번 중 {n}번 시도).|今日の総合スコア：{t}（3回中{n}回）。|Общий счёт за сегодня: {t} ({n} из 3 попыток).|Dzisiejszy wynik łączny: {t} ({n} z 3 podejść).").replace("{t}", A.fmt(day.total)).replace("{n}", day.done) + `<span id="vdRank"></span>`,
        stats: [[A.pick6("Puntos del intento|Attempt score|Score de l'essai|Pontos da tentativa|Punkte des Versuchs|Punti del tentativo||本次尝试得分|이번 시도 점수|今回の挑戦スコア|Очки попытки|Wynik podejścia"), final], [A.pick6("Puntuación global|Global score|Score global|Pontuação global|Gesamtpunktzahl|Punteggio globale||总分|총점|総合スコア|Общий счёт|Wynik łączny"), day.total], [A.T("Rondas superadas", "Rounds cleared"), r.cleared]],
        stamp: win ? A.T("GLORIA", "GLORY") : A.T("FIN", "END"), stampSub: win ? A.icon("u_star", "st") : A.icon("u_close", "st"), art: win ? "win" : "lose",
        buttons: again ? [{ id: "nrBtn", cls: "btn-ink", label: A.pick6("Jugar el intento {k}|Play attempt {k}|Jouer l'essai {k}|Jogar a tentativa {k}|Versuch {k} spielen|Gioca il tentativo {k}||开始第 {k} 次尝试|{k}번째 시도 시작|挑戦{k}回目へ|Сыграть попытку {k}|Rozegraj podejście {k}").replace("{k}", day.k + 1), arrow: true, primary: true, onclick: next },
          { id: "lbBtn", cls: "btn-line", label: A.T("Clasificación", "Leaderboard"), onclick: toBoard }, { id: "hubBtn", cls: "btn-line", label: A.T("Menú", "Menu"), onclick: () => C().showHub() }]
          : [{ id: "nrBtn", cls: "btn-ink", label: A.pick6("Ver la clasificación|See the leaderboard|Voir le classement|Ver o placar|Rangliste ansehen|Vedi la classifica|Ver la clasificación|查看排行榜|리더보드 보기|ランキングを見る|Смотреть таблицу|Zobacz ranking"), arrow: true, primary: true, onclick: toBoard }, { id: "hubBtn", cls: "btn-line", label: A.T("Menú", "Menu"), onclick: () => C().showHub() }],
      });
      /* con la clasificacion global activa, el puesto llega en cuanto responde el servidor */
      if (sent) sent.then(res => { const el = $("vdRank"), g = res && res.global; if (el && g && g.rank) el.textContent = sp + A.pick6("Puesto {r} de {n} en el mundo.|Rank {r} of {n} worldwide.|Rang {r} sur {n} dans le monde.|Posição {r} de {n} no mundo.|Platz {r} von {n} weltweit.|Posizione {r} su {n} nel mondo.||全球第 {r} 名（共 {n} 人）。|전 세계 {n}명 중 {r}위.|世界{n}人中{r}位。|Место {r} из {n} в мире.|Miejsce {r} z {n} na świecie.").replace("{r}", A.fmt(g.rank)).replace("{n}", A.fmt(g.total)); }).catch(() => {});
    } else {
      C().verdict({
        kind: win ? "win" : "", level: r.cleared, tag: A.T("Expedición", "Expedition") + (r.asc ? " · A" + r.asc + " " + A.tx(ASC_N[r.asc]) : ""), title: win ? A.T("Expedición cobrada", "Expedition cashed out") : A.T("Fin de la expedición", "Expedition over"),
        text: summary + (newAsc ? " " + A.tx(ASC_UNLOCK).replace("{n}", newAsc).replace("{name}", A.tx(ASC_N[newAsc])) : ""),
        stats: [[A.T("Puntuación final", "Final score"), final], [A.T("Rondas superadas", "Rounds cleared"), r.cleared], [A.T("Doblones ganados", "Doubloons earned"), r.stats.coinsEarned]],
        stamp: win ? A.T("GLORIA", "GLORY") : A.T("FIN", "END"), stampSub: win ? A.icon("u_star", "st") : A.icon("u_close", "st"), art: win ? "win" : "lose",
        buttons: [{ id: "nrBtn", cls: "btn-ink", label: A.T("Otra expedición", "Another expedition"), arrow: true, primary: true, onclick: () => C().showHub("adventure") }, { id: "hubBtn", cls: "btn-line", label: A.T("Menú", "Menu"), onclick: () => C().showHub() }],
      });
    }
    A.dealer.hover($("hubBtn"), "hoverQuit");                              // si el cursor va hacia Menu en vez de a otra expedicion, el crupier lo ve
    C().map.setStyle(mapStyleFor()); A.adv.hideBars();
  }
  A.adv.endRun = endRun; A.adv.startRound = startRound; A.adv.openShop = openShop;
})(window.AIQ);
