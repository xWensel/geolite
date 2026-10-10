/*
 * Geolite - Enciclopedia geografica (v0.35: un atlas por continentes y familias de paises, con medallas).
 *
 *  - Cada lugar del juego es UNA carta con 3 medallas: bronce (<= 300 km: su ficha), plata (<= 150 km: su historia) y oro (<= 75 km: su dato clave).
 *    Por dentro siguen siendo 3 tarjetas (id, id~h, id~k): los logros las cuentan por tipo y el guardado no cambia; solo la interfaz las junta.
 *  - Se recorre como un atlas: Resumen (mapa del mundo que se colorea con lo que llevas) -> continente -> familia de paises -> pais -> lugar.
 *    "Por afinar" reune lo que ya conoces pero aun no has clavado a 75 km. Lo no descubierto sale boca abajo (y el pais, con su silueta y "???").
 *  - Personajes, sucesos y curiosidades se desbloquean en cadena al acertar lugares relacionados; van con su pais.
 *  - Textos, fotos y banderas van empaquetados (js/wiki.js): al jugar nunca se consulta Wikipedia.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const $ = id => document.getElementById(id);
  const STORE = "atlasiq.codex.v1";
  const TYPE_KEY = { person: "type.person", curiosity: "type.curiosity", history: "type.history" };
  const typeLabel = t => A.t(TYPE_KEY[t] || "kind." + t);

  /* iconos propios por tipo (js/icons.js) */
  const TYPE_IC = { city: "t_city", capital: "t_capital", country: "t_country", landmark: "t_landmark", nature: "t_nature", water: "t_water", strait: "t_strait", battle: "t_battle", event: "t_event", history: "chronicler", person: "t_person", curiosity: "t_curio", place: "t_place" };
  const iconSvg = t => A.icon(TYPE_IC[t] || "t_place", "cx-ic");
  /* icono de una tarjeta relacionada: el pais descubierto lleva SU bandera pixel (assets/flags/p, tools/flags_pixel.py); t_country (bandera de la casa con el mundo) queda de icono de la categoria */
  const relIcon = (e, un) => (un && e.type === "country" && e.id.startsWith("c:") && hasFlag(e.id.slice(2)) ? `<img class="ic cx-ic cx-pxf" alt="" src="assets/flags/p/${A.mediaKey(neEn[e.id.slice(2)])}.webp" decoding="async" draggable="false">` : iconSvg(e.type));

  /* continente de un punto (etiqueta de la ficha, pista del Pasaporte en la Aventura y continentes de los retos del mapa, js/map.js).
     Antes Egipto salia en Asia, el Magreb, Siria, Irak e Iran en Europa y Tahiti, Samoa, Tonga, Costa Rica o Panama en Sudamerica */
  const AEG = [[40.0, 26.2], [39.2, 26.65], [38.6, 26.2], [38.3, 26.3], [37.75, 27.05], [37.0, 27.36], [36.7, 27.9], [36.55, 29.1]];   // islas griegas frente a Anatolia
  const aeg = lat => { for (let i = 1; i < AEG.length; i++) if (lat >= AEG[i][0]) { const [a, x] = AEG[i - 1], [b, y] = AEG[i]; return y + (x - y) * (lat - b) / (a - b); } return 99; };
  const isAf = (lat, lon) => {
    if (lat < -45 || lat > 37.6 || lon < -26 || lon > 64) return false;
    if (lat < 0) return true;                                                           // con Madagascar, Mauricio, Seychelles, Reunion y Santa Elena
    if (lon > 51.5) return false;                                                       // Socotra, Oman y el golfo Persico
    if (lat >= 12.5 && lon > (lat > 29.9 ? 32.6 - (lat - 29.9) * 0.2 : 32.6 + (30 - lat) * 0.615)) return false;   // Sinai, Levante y Arabia: al otro lado del canal de Suez y del mar Rojo
    if (lat <= 30) return true;
    return lon < -2 ? lat < 35.95 : lon < -0.6 ? lat < 36.4 : lon < 11.3 ? lat < 37.5 : lat < 34;   // costa mediterranea: Gibraltar, Argelia y Tunez / Lampedusa, Malta y Creta
  };
  const isEu = (lat, lon) => {
    if (lat > 58) return lon < 60 + (lat - 58) * 0.6;                                  // Urales del norte y Nueva Zembla
    if (lat > 51.3) return lon < 59.5;                                                  // Urales
    if (lat > 47) return lon < 51.6;                                                    // rio Ural hasta el Caspio
    if (lon >= 48.5) return false;                                                      // Caspio y Asia central
    if (lon >= 37.5) return lat > Math.min(43.4, 43.4 - (lon - 40) * 0.22);             // Caucaso: Sochi y el Elbrus en Europa; Georgia, Armenia y Azerbaiyan en Asia
    if (lon >= 29.02) return lat > 42.3 || (lat > 34.5 && lat < 35.8 && lon < 34.7);    // mar Negro (Crimea y Ucrania en Europa, Anatolia en Asia) y Chipre
    if (lon < 26.2) return true;
    if (lat > 40) return lat > (lon < 26.73 ? 40 + (lon - 26.18) * 0.78 : 40.75);       // Dardanelos y mar de Marmara: Tracia y el Estambul europeo en Europa
    return lon < aeg(lat);
  };
  const continent = (lat, lon) => {
    if (lat == null) return "sea";
    if (lat < -60 || (lat < -45 && lon > -30 && lon < 110)) return "an";              // y las islas subantarticas del Indico
    if (lat < 12 && (lon > 165 || lon < (lat < 0 ? -125 : -140))) return "oc";         // Polinesia, Micronesia y Melanesia del Pacifico (Hawai sigue con Norteamerica)
    if (lat > 62 && lon < -168.97) return "as";                                       // Chukotka, al otro lado del antimeridiano
    if (lon < -30 || (lat > 66.6 && lon < -12)) return lat > 12 || (lat > 7 && lon < -77.3) ? "na" : "sa";   // America (y Groenlandia); Centroamerica hasta Panama, con Norteamerica
    if (isAf(lat, lon)) return "af";
    if (lat < 0 ? lon >= 140.9 || (lat < -10.5 && lon > 112) : lon >= 130 && lat < 23) return "oc";   // Australia, Nueva Guinea oriental, Palaos, Guam, Micronesia (Indonesia y Timor, en Asia)
    return isEu(lat, lon) ? "eu" : "as";
  };

  /* continentes del MAPA (los retos que mueven continentes): la division de siempre, con la que estan afinadas las colocaciones sin solapes (dev/layouttest.js).
     La de arriba es la geografica (etiquetas y pista del Pasaporte); con ella el reto "hold" pisaba continentes */
  const continentMap = (lat, lon) => {
    if (lat == null) return "sea";
    if (lat < -60) return "an";
    if (lon < -30 && lat > 12) return "na"; if (lon < -30) return "sa";
    if (lon >= -30 && lon < 60 && lat > 34) return "eu"; if (lon >= -20 && lon < 52 && lat <= 37 && lat > -36 && !(lon > 34 && lat > 12 && lat < 34 && lon < 60)) return lat > 12 && lon > 26 && lat < 33 && lon < 36.5 ? "as" : "af";
    if (lon > 110 && lat < -8) return "oc"; if (lon > 112 && lon < 180 && lat < 0 && lat > -50) return "oc"; if (lon > 165 || lon < -150) return "oc";
    if (lon >= 130 && lat > -50 && lat < 23) return "oc";                 // Micronesia, Palau, Guam, Marianas y Marshall (Filipinas, Taiwan y Japon quedan fuera)
    if (lat < -8 && lon > 100) return "oc"; return lon >= 25 ? "as" : "eu";
  };

  /* ================================================================== datos */
  const E = {}, order = [], chain = {}, fame = {}, neQ = {}, neEn = {};   // fame: nivel*100 + puesto 0-99 del banco (menos = mas famoso); neQ/neEn: pais Natural Earth -> QID / nombre ingles
  let world = null, map = null, store = { unlocked: {}, seen: {} };
  const listeners = [];

  function load() { try { store = Object.assign({ unlocked: {}, seen: {} }, JSON.parse(localStorage.getItem(STORE) || "{}")); } catch (e) { /* vacio */ } }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(store)); } catch (e) { /* sin almacenamiento */ } }

  const WIKI_OVERRIDE = {
    "hermitage": "Hermitage Museum", "agram": "Zagreb", "davao": "Davao City", "tucuman": "San Miguel de Tucumán", "hanyang": "Seoul", "san-juan-puerto-rico": "San Juan, Puerto Rico", "red-fort": "Red Fort", "pentagon": "The Pentagon", "tea-party": "Boston Tea Party", "trinity-site": "Trinity (nuclear test)", "vegas-strip": "Las Vegas Strip",
    "edison": "Edison, New Jersey", "bam": "Bam, Iran", "natal": "Natal, Rio Grande do Norte", "sparks": "Sparks, Nevada", "reno": "Reno, Nevada", "flint": "Flint, Michigan", "eugene": "Eugene, Oregon",
    "salem": "Salem, Massachusetts", "savannah": "Savannah, Georgia", "elgin": "Elgin, Illinois", "emerald": "Emerald, Queensland", "dubbo": "Dubbo", "troy": "Troy", "ur": "Ur", "area-51": "Area 51",
    "mount-rainier": "Mount Rainier", "k2": "K2", "washington": "Washington, D.C.", "old-city-of-acre": "Acre, Israel", "old-city-of-jerusalem": "Old City of Jerusalem",
    "battle-of-waterloo": "Battle of Waterloo", "kitty-hawk": "Kitty Hawk, North Carolina", "montana": "Little Bighorn Battlefield National Monument", "battle": "Battle, East Sussex",
    "hawaii": "Hawaii (island)", "sinking-of-the-titanic": "Sinking of the Titanic", "columbus-s-first-landfall": "Voyages of Christopher Columbus",
    "christ-the-redeemer": "Christ the Redeemer (statue)", "big-ben": "Big Ben", "saint-basil-s-cathedral": "Saint Basil's Cathedral", "chichen-itza": "Chichen Itza", "sagrada-familia": "Sagrada Família",
    "pyramids-of-giza": "Giza pyramid complex", "great-wall-of-china": "Great Wall of China", "mount-fuji": "Mount Fuji", "ulaanbaatar": "Ulaanbaatar", "reykjavik": "Reykjavík",
  };
  const COUNTRY_WIKI = {
    "United States of America": "United States", "Dem. Rep. Congo": "Democratic Republic of the Congo", "Congo": "Republic of the Congo", "eSwatini": "Eswatini", "Bosnia and Herz.": "Bosnia and Herzegovina", "Czechia": "Czech Republic",
    "Macedonia": "North Macedonia", "N. Cyprus": "Northern Cyprus", "Dominican Rep.": "Dominican Republic", "Central African Rep.": "Central African Republic", "Eq. Guinea": "Equatorial Guinea", "St. Vin. and Gren.": "Saint Vincent and the Grenadines",
    "Côte d'Ivoire": "Ivory Coast", "Palestine": "State of Palestine", "W. Sahara": "Western Sahara", "S. Sudan": "South Sudan", "Solomon Is.": "Solomon Islands", "Marshall Is.": "Marshall Islands", "Georgia": "Georgia (country)",
    "Timor-Leste": "East Timor", "São Tomé and Principe": "São Tomé and Príncipe", "Cabo Verde": "Cape Verde", "Vatican": "Vatican City", "Myanmar": "Myanmar", "Macedonia ": "North Macedonia", "St. Kitts and Nevis": "Saint Kitts and Nevis",
  };
  const COUNTRY_DISP = { "United States of America": "United States", "Dem. Rep. Congo": "DR Congo", "Congo": "Republic of the Congo", "Bosnia and Herz.": "Bosnia and Herzegovina", "Czechia": "Czechia", "Macedonia": "North Macedonia" };
  const rarityFor = (i, n) => Math.min(3, Math.floor((i / Math.max(1, n)) * 4));
  const eventLike = /^(battle|bomb dropped|dead sea scrolls|tea party|independence)$/i;
  /* el pais del texto del Clasico ("Gary, United States · ...") cuando no coincide con el de Natural Earth */
  const HOME_FIX = { "Republic of Ireland": "Ireland", "North Macedonia": "Macedonia", "Ivory Coast": "Côte d'Ivoire", "Czech Republic": "Czechia", "East Timor": "Timor-Leste", "Eswatini": "eSwatini", "DR Congo": "Dem. Rep. Congo", "Democratic Republic of the Congo": "Dem. Rep. Congo", "Republic of the Congo": "Congo", "South Sudan": "S. Sudan", "Bosnia and Herzegovina": "Bosnia and Herz.", "Dominican Republic": "Dominican Rep.", "Central African Republic": "Central African Rep.", "Equatorial Guinea": "Eq. Guinea", "Vatican City": "Vatican", "UK": "United Kingdom", "US": "United States of America" };

  function countryFrom(title, gameId) {
    const parts = String(title).replace(/\(.*?\)/g, "").split(","), tail = parts.length > 1 ? parts[parts.length - 1].trim().split("/")[0].trim() : "";
    const n = tail && (A.CODEX_COUNTRY[tail] || tail);
    return n && world.byName[n] ? n : gameId === "usa" ? "United States of America" : null;   // Norteamerica: Canada y Groenlandia por su coma; sin pais (estrecho de Bering), Estados Unidos
  }
  function homeFrom(f) {
    const parts = String(f || "").split(/\s+[·•]\s+/)[0].replace(/\(.*?\)/g, "").split(","); if (parts.length < 2) return null;
    const tail = parts[parts.length - 1].trim(), n = HOME_FIX[tail] || A.CODEX_COUNTRY[tail] || tail;
    return world.byName[n] ? n : null;
  }
  function centroid(name) {
    const f = world.byName[name]; if (!f) return [null, null];
    const big = f.polys.reduce((a, b) => ((b.bbox[2] - b.bbox[0]) * (b.bbox[3] - b.bbox[1]) > (a.bbox[2] - a.bbox[0]) * (a.bbox[3] - a.bbox[1]) ? b : a));
    return [(big.bbox[1] + big.bbox[3]) / 2, (big.bbox[0] + big.bbox[2]) / 2];
  }

  function build() {
    const add = e => {
      const cur = E[e.id];
      if (!cur) { E[e.id] = e; order.push(e.id); return e; }
      if (cur.type === "place" && e.type !== "place") cur.type = e.type;
      if (e.rarity < cur.rarity) cur.rarity = e.rarity;
      for (const k of Object.keys(e.name || {})) if (!cur.name[k] && e.name[k]) cur.name[k] = e.name[k];
      if (!cur.fact.en && e.fact && e.fact.en) cur.fact = e.fact;
      if (cur.lat == null && e.lat != null) { cur.lat = e.lat; cur.lon = e.lon; }
      if (!cur.country && e.country) cur.country = e.country;
      if (!cur.home && e.home) cur.home = e.home;                       // pais "de casa" (solo para la interfaz: el desbloqueo en cadena sigue mirando .country)
      if (!cur.qc && e.qc) cur.qc = e.qc;
      if (!cur.triggers && e.triggers) cur.triggers = e.triggers;     // Napoleon del Clasico + la tarjeta curada: sigue enlazando Paris, Waterloo...
      return cur;
    };
    /* 0) banco de lugares empaquetado (data/places.js): capitales, ciudades, monumentos, naturaleza, historia y paises */
    if (A.PLACES && A.PLACES.length) {
      const neBy = {}; A.PLACES.forEach(r => { if (r[1] === "country") neBy[r[6].en] = r[0].slice(2); });
      A.PLACES.forEach(([id, kind, tier, lat, lon, qc, names, dif]) => {
        /* v0.20: el pais que se ve debajo (data/paises-lugares.js) */
        const qc1 = (A.PLACE_COUNTRIES && A.PLACE_COUNTRIES[id] && A.PLACE_COUNTRIES[id][0]) || qc, cnEn = qc1 && A.PCOUNTRY && A.PCOUNTRY[qc1] && A.PCOUNTRY[qc1].en, ne = (cnEn && (neBy[cnEn] || (world.byName[cnEn] ? cnEn : null))) || null;
        if (ne && !neQ[ne]) { neQ[ne] = qc1; neEn[ne] = cnEn; }
        if (kind === "country") { neEn[id.slice(2)] = names.en; if (qc) neQ[id.slice(2)] = qc; }
        fame[id] = tier * 100 + (dif == null ? 50 : dif);                 // nivel del banco (0 = lo mas conocido) y dentro su puesto: Londres antes que Canterbury
        const type = kind === "history" ? (/^(battle|siege|fall of|.*\bwar\b|bombing|attack|normandy|gallipoli|dunkirk|tet )/i.test(names.en) ? "battle" : "event")   // igual que el tipo de la pregunta (js/adventure.js)
          : kind === "nature" ? (/\b(sea|ocean|gulf|bay)\b/i.test(names.en) ? "water" : /\b(strait|channel|canal|cape|drake|bosporus|bosphorus)\b/i.test(names.en) ? "strait" : "nature") : kind;
        const rar = Math.min(3, tier + (kind === "history" || kind === "nature" ? 1 : 0));
        add({ id, type, name: { ...names }, wiki: names.en, lat: kind === "country" ? null : lat, lon: kind === "country" ? null : lon, country: ne, qc: qc1 || null, fact: { en: "", es: "" }, rarity: rar, src: "places", nogeo: kind === "country" });
      });
    }
    const wikiFor = (id, title) => WIKI_OVERRIDE[id] || String(title).replace(/\(.*?\)/g, "").replace(/\s+-\s+\d{3,4}\b/, "").split(",")[0].trim();

    // 1) modo Extendido (mundo)
    (A.LEVELS || []).forEach((L, i) => L.pool.forEach(o => {
      const r = rarityFor(i, A.LEVELS.length);
      if (o.t === "c") return;                                        // los paises se crean mas abajo
      const id = A.ckey(o.n.en), cn = countryFrom("x, " + (o.c.en || ""), "");
      add({ id, type: L.kind === "strait" ? "strait" : L.kind, name: { en: o.n.en, es: o.n.es }, wiki: wikiFor(id, o.n.en), full: o.c.en ? o.n.en + ", " + o.c.en : "", lat: o.lat, lon: o.lon, country: cn, fact: o.f, rarity: r, src: "atlas" });
    }));
    // 2) modo Extendido (historia y pistas)
    (A.HISTORY || []).forEach((L, i) => L.pool.forEach(a => {
      const r = Math.min(3, i + 1);
      if (L.kind === "clue") {
        const id = A.ckey(a[2]), nm = a[2].split(",")[0], nmEs = a[3].split(",")[0];
        add({ id, type: "city", name: { en: nm, es: nmEs }, wiki: wikiFor(id, nm), full: a[2], lat: a[4], lon: a[5], country: countryFrom(a[2], ""), fact: { en: `${a[0]} — ${a[6]}`, es: `${a[1]} — ${a[7]}` }, rarity: r, src: "atlas" });
      } else {
        const id = A.ckey(a[0]);
        add({ id, type: L.kind, name: { en: a[0].replace(/\s*\(.*?\)\s*/g, "").trim(), es: a[1].replace(/\s*\(.*?\)\s*/g, "").trim() }, wiki: wikiFor(id, a[0]), lat: a[4], lon: a[5], country: countryFrom(a[2], ""), fact: { en: a[6], es: a[7] }, rarity: r, src: "atlas" });
        const pid = A.ckey(a[2]);
        if (pid !== id) add({ id: pid, type: /ocean|sea$/i.test(a[2]) ? "water" : "place", name: { en: a[2].split(",")[0], es: a[3].split(",")[0] }, wiki: wikiFor(pid, a[2]), lat: a[4], lon: a[5], country: countryFrom(a[2], ""), fact: { en: "", es: "" }, rarity: r, src: "atlas" });
      }
    }));
    // 3) modo Clasico: los destinos de sus 11 campanas
    (A.CLASSIC || []).forEach(g => g.levels.forEach((L, li) => {
      const r = rarityFor(li, g.levels.length);
      L.dests.forEach(d => {
        const clue = L.bonus && d.f, title = clue ? d.f : d.n, id = d.ck || A.ckey(title), base = title.replace(/\(.*?\)/g, "").split(",")[0].trim();   // d.ck: clave fija de Eventos y Personajes (reina Victoria != Victoria de Seychelles)
        let type = /capital/i.test(L.name) ? "capital" : /famous|unesco|heritage|places/i.test(L.name) ? "landmark" : /cit(y|ies)/i.test(L.name) ? "city" : "place";
        if (["city", "capital", "landmark", "nature"].includes(L.kind)) type = L.kind;
        if (L.kind === "character") type = "person";
        else if (L.kind === "event") type = /^(battle|siege|fall of)\b/i.test(title) ? "battle" : "event";
        else if (eventLike.test(base) || /^battle of|bomb dropped/i.test(title)) type = "event";
        add({ id, type, name: d.n6 ? { en: base, ...d.n6 } : { en: base, es: "" }, wiki: wikiFor(id, title), full: clue ? "" : title.replace(/\(.*?\)/g, "").trim(), lat: d.lat, lon: d.lon, country: countryFrom(title, g.id), home: clue ? null : homeFrom(d.f), fact: clue ? { en: "", es: "" } : { en: d.f, es: "", ...(d.f6 || {}) }, rarity: r, src: "classic" });
      });
    }));

    // 4) paises: los de las preguntas + los que aparecen como pais de algun lugar o como disparador
    const wanted = new Set();
    (A.LEVELS || []).forEach(L => L.pool.forEach(o => { if (o.t === "c") wanted.add(o.key); }));
    for (const id of order) if (E[id].country) wanted.add(E[id].country);
    (A.CODEX_CURATED || []).forEach(c => c[6].forEach(t => { if (t.startsWith("c:")) wanted.add(t.slice(2)); }));
    const esCountry = {}; (A.LEVELS || []).forEach(L => L.pool.forEach(o => { if (o.t === "c") esCountry[o.key] = o; }));
    wanted.forEach(name => {
      if (!world.byName[name]) return;
      const [lat, lon] = centroid(name), o = esCountry[name], idx = o ? (A.LEVELS.findIndex(L => L.pool.includes(o))) : 4;
      add({ id: "c:" + name, type: "country", name: { en: COUNTRY_DISP[name] || name, es: o ? o.n.es : "" }, wiki: COUNTRY_WIKI[name] || name, lat, lon, country: null, fact: o ? o.f : { en: "", es: "" }, rarity: o ? rarityFor(idx, A.LEVELS.length) : 1, src: "country", nogeo: true });
    });

    // 5) tarjetas curadas (personajes, sucesos, curiosidades) y su cadena de desbloqueo
    (A.CODEX_CURATED || []).forEach(c => {
      const [id, type, wiki, es, lat, lon, trig] = c;
      add({ id, type, name: { en: wiki, es }, wiki, lat, lon, country: null, fact: { en: "", es: "" }, rarity: type === "person" ? 2 : type === "event" ? 1 : 1, src: "curated", triggers: trig, nogeo: true });
      trig.forEach(t => (chain[t] = chain[t] || []).push(id));
    });
    // 6) cada lugar del banco tiene 3 entradas: el lugar (<= 300 km), su historia (<= 150 km) y su dato clave (<= 75 km)
    (A.PLACES || []).forEach(([id]) => {
      const p = E[id]; if (!p) return;
      add({ id: id + "~h", type: "history", name: p.name, wiki: p.wiki, lat: p.lat, lon: p.lon, country: p.country, fact: { en: "", es: "" }, rarity: 2, src: "tier", tier: 2, parent: id, nogeo: p.nogeo });
      add({ id: id + "~k", type: "curiosity", name: p.name, wiki: p.wiki, lat: p.lat, lon: p.lon, country: p.country, fact: { en: "", es: "" }, rarity: 3, src: "tier", tier: 3, parent: id, nogeo: p.nogeo });
    });
    // 7) solo existen las tarjetas que alguna pregunta puede desbloquear (A.codexUnlock): los restos del antiguo modo Extendido
    //    ("New York" junto a "New York City", el pueblo de cada batalla...) no salen en ninguna pregunta y dejaban imposible el logro Completista
    const asked = new Set();
    (A.PLACES || []).forEach(([id, kind, , lat]) => { if (kind === "country" ? world.byName[id.slice(2)] : lat != null) asked.add(id); });   // las mismas que acepta placeQ (js/adventure.js)
    (A.CLASSIC || []).forEach(g => g.levels.forEach(L => L.dests.forEach(d => asked.add(d.ck || A.ckey(L.bonus && d.f ? d.f : d.n)))));
    const reach = new Set();
    asked.forEach(id => {
      const e = E[id]; if (!e) return;
      [id, id + "~h", id + "~k", e.country ? "c:" + e.country : null].forEach(x => { if (x && E[x]) reach.add(x); });
      (chain[id] || []).concat(e.country ? chain["c:" + e.country] || [] : []).forEach(x => { if (E[x]) reach.add(x); });
    });
    for (let i = order.length - 1; i >= 0; i--) if (!reach.has(order[i])) { delete E[order[i]]; order.splice(i, 1); }
    // los personajes sin nada relacionado no existen; el resto se numera
    order.forEach((id, i) => { E[id].no = i + 1; });
  }

  /* ================================================================== desbloqueo */
  const isUnlocked = id => !!store.unlocked[id];
  function unlockOne(id, tier, out) {
    if (!E[id] || store.unlocked[id]) return false;
    store.unlocked[id] = { t: Date.now(), tier }; out.push(id); return true;
  }
  /* Desbloqueo por PRECISION (km al objetivo; 0 = dentro del pais). Cada lugar tiene 3 entradas:
       <= 300 km  el lugar (generica, y su pais)      <= 150 km  su historia + sucesos relacionados      <= 75 km  su dato clave + personajes y curiosidades
     Las zonas enormes (mares, naturaleza, estrechos) tienen umbrales x2.  Devuelve { added: [ids], level: 0..3 }. */
  const LIM = [300, 150, 75];
  const SCALE = { water: 2, nature: 2, strait: 2 };
  A.codexUnlock = (q, km) => {
    const out = { added: [], level: 0 };
    if (km == null || !q.cid) return out;
    const first = q.cid.map(c => E[c]).find(Boolean), sc = (first && SCALE[first.type]) || 1;   // las pistas llevan antes su propio id ("clue:<id>") y luego el del lugar
    const level = km <= LIM[2] * sc ? 3 : km <= LIM[1] * sc ? 2 : km <= LIM[0] * sc ? 1 : 0;
    out.level = level; if (!level) return out;
    const lateral = x => (E[x].type === "event" || E[x].type === "battle") ? 2 : 3;
    for (const cid of q.cid) {
      const e = E[cid]; if (!e) continue;
      unlockOne(cid, level, out.added);
      if (level >= 2 && E[cid + "~h"]) unlockOne(cid + "~h", level, out.added);
      if (level >= 3 && E[cid + "~k"]) unlockOne(cid + "~k", level, out.added);
      if (e.country && E["c:" + e.country]) unlockOne("c:" + e.country, level, out.added);
      for (const x of (chain[cid] || []).concat(e.country ? chain["c:" + e.country] || [] : [])) if (level >= lateral(x)) unlockOne(x, level, out.added);
    }
    if (out.added.length) { save(); dirty(); listeners.forEach(f => f(out.added)); prefetch(out.added); emitStats(); }
    return out;
  };
  const byType = () => { const cnt = {}; order.forEach(id => { const e = E[id], c = cnt[e.type] || (cnt[e.type] = [0, 0]); c[1]++; if (isUnlocked(id)) c[0]++; }); return cnt; };
  /* tarjetas de cada continente [desbloqueadas, total] (logros por continente) */
  const byCont = () => { const o = {}; ["eu", "as", "af", "na", "sa", "oc"].forEach(c => { const s = sumStats(contGroups(c)); o[c] = [s.u, s.t]; }); return o; };
  const emitStats = () => { if (A.ach) { const st = stats(); A.ach.emit("codex", { u: st.u, t: st.t, by: byType(), cont: byCont() }); } };
  A.codexLimits = e => { const id = (e && e.cids && e.cids.find(c => E[c])) || (e && (e.parent || e.id)), sc = (E[id] && SCALE[E[id].type]) || 1; return LIM.map(x => x * sc); };   // cids: las pistas llevan antes "clue:<id>"
  A.continent = continent; A.continentMap = continentMap;
  function stats() { let u = 0; order.forEach(id => { if (isUnlocked(id)) u++; }); return { u, t: order.length }; }
  A.codexStats = stats;

  /* ================================================================== contenido empaquetado (data/wiki + assets/wiki): nunca se consulta Wikipedia al jugar */
  const contentMem = {};
  const memOf = id => contentMem[A.wlang() + ":" + ((E[id] && E[id].parent) || id)];
  async function loadContent(e, lang) {
    if (e.parent) e = E[e.parent];
    const key = lang + ":" + e.id;
    if (contentMem[key]) return contentMem[key];
    const pk = await A.wiki.get(e.id, lang);
    return (contentMem[key] = pk || { none: true, t: Date.now(), lang });
  }
  function prefetch(ids) { [...new Set(ids.map(id => E[id].parent || id))].slice(0, 4).forEach(id => loadContent(E[id], A.wlang()).then(() => notify("content", id)).catch(() => {})); }
  const notifiers = []; const notify = (k, id) => notifiers.forEach(f => f(k, id));

  /* ================================================================== atlas: continentes, familias de paises y paises
     Familias pensadas para aprender: vecinos que se reconocen juntos, en orden de lectura (oeste -> este, norte -> sur) y con el pais
     que da nombre a la familia delante. Cada pais de la Enciclopedia esta en una sola. Nombres: es|en|fr|pt|de|it|es-419|zh|ko|ja|ru|pl */
  const P = s => A.pick6(s);
  const CONTS = ["eu", "as", "af", "na", "sa", "oc", "sea"];
  const RG = (id, cont, names, countries, more) => ({ id, cont, names, countries, ...(more || {}) });
  const REGIONS = [
    RG("uk-irlanda", "eu", "Reino Unido e Irlanda|United Kingdom & Ireland|Royaume-Uni et Irlande|Reino Unido e Irlanda|Vereinigtes Königreich und Irland|Regno Unito e Irlanda||英国与爱尔兰|영국과 아일랜드|イギリスとアイルランド|Великобритания и Ирландия|Wielka Brytania i Irlandia", ["United Kingdom", "Ireland"]),
    RG("iberica", "eu", "Península Ibérica|Iberian Peninsula|Péninsule ibérique|Península Ibérica|Iberische Halbinsel|Penisola iberica||伊比利亚半岛|이베리아반도|イベリア半島|Пиренейский полуостров|Półwysep Iberyjski", ["Spain", "Portugal", "Andorra"]),
    RG("francia-benelux", "eu", "Francia y Benelux|France & Benelux|France et Benelux|França e Benelux|Frankreich und Benelux|Francia e Benelux||法国与比荷卢|프랑스와 베네룩스|フランスとベネルクス|Франция и Бенилюкс|Francja i Beneluks", ["France", "Monaco", "Belgium", "Netherlands", "Luxembourg"]),
    RG("italia-malta", "eu", "Italia y Malta|Italy & Malta|Italie et Malte|Itália e Malta|Italien und Malta|Italia e Malta||意大利与马耳他|이탈리아와 몰타|イタリアとマルタ|Италия и Мальта|Włochy i Malta", ["Italy", "San Marino", "Vatican", "Malta"]),
    RG("europa-central", "eu", "Europa Central|Central Europe|Europe centrale|Europa Central|Mitteleuropa|Europa centrale||中欧|중부 유럽|中央ヨーロッパ|Центральная Европа|Europa Środkowa", ["Germany", "Switzerland", "Liechtenstein", "Austria", "Czechia", "Poland", "Slovakia", "Hungary"]),
    RG("nordicos", "eu", "Países nórdicos y bálticos|Nordic & Baltic countries|Pays nordiques et baltes|Países nórdicos e bálticos|Nordische und baltische Länder|Paesi nordici e baltici||北欧与波罗的海国家|북유럽과 발트 3국|北欧とバルト三国|Северные страны и Прибалтика|Kraje nordyckie i bałtyckie", ["Iceland", "Norway", "Denmark", "Sweden", "Finland", "Estonia", "Latvia", "Lithuania"]),
    RG("balcanes", "eu", "Balcanes|Balkans|Balkans|Bálcãs|Balkan|Balcani||巴尔干半岛|발칸반도|バルカン半島|Балканы|Bałkany", ["Slovenia", "Croatia", "Bosnia and Herz.", "Montenegro", "Serbia", "Kosovo", "Albania", "Macedonia", "Greece", "Bulgaria", "Romania", "Cyprus"]),
    RG("europa-este", "eu", "Europa del Este|Eastern Europe|Europe de l'Est|Leste Europeu|Osteuropa|Europa orientale||东欧|동유럽|東ヨーロッパ|Восточная Европа|Europa Wschodnia", ["Russia", "Belarus", "Ukraine", "Moldova"]),
    RG("anatolia-caucaso", "as", "Anatolia y Cáucaso|Anatolia & the Caucasus|Anatolie et Caucase|Anatólia e Cáucaso|Anatolien und Kaukasus|Anatolia e Caucaso||安纳托利亚与高加索|아나톨리아와 캅카스|アナトリアとコーカサス|Анатолия и Кавказ|Anatolia i Kaukaz", ["Turkey", "Georgia", "Armenia", "Azerbaijan"]),
    RG("levante", "as", "Levante y Mesopotamia|Levant & Mesopotamia|Levant et Mésopotamie|Levante e Mesopotâmia|Levante und Mesopotamien|Levante e Mesopotamia||黎凡特与美索不达米亚|레반트와 메소포타미아|レバントとメソポタミア|Левант и Месопотамия|Lewant i Mezopotamia", ["Israel", "Palestine", "Lebanon", "Syria", "Jordan", "Iraq"]),
    RG("arabia", "as", "Península Arábiga|Arabian Peninsula|Péninsule arabique|Península Arábica|Arabische Halbinsel|Penisola arabica||阿拉伯半岛|아라비아반도|アラビア半島|Аравийский полуостров|Półwysep Arabski", ["Saudi Arabia", "Yemen", "Oman", "United Arab Emirates", "Qatar", "Bahrain", "Kuwait"]),
    RG("asia-central", "as", "Irán y Asia Central|Iran & Central Asia|Iran et Asie centrale|Irã e Ásia Central|Iran und Zentralasien|Iran e Asia centrale||伊朗与中亚|이란과 중앙아시아|イランと中央アジア|Иран и Центральная Азия|Iran i Azja Środkowa", ["Iran", "Afghanistan", "Turkmenistan", "Uzbekistan", "Tajikistan", "Kyrgyzstan", "Kazakhstan"]),
    RG("asia-sur", "as", "Asia del Sur|South Asia|Asie du Sud|Sul da Ásia|Südasien|Asia meridionale||南亚|남아시아|南アジア|Южная Азия|Azja Południowa", ["India", "Pakistan", "Nepal", "Bhutan", "Bangladesh", "Sri Lanka", "Maldives"]),
    RG("asia-oriental", "as", "Asia Oriental|East Asia|Asie de l'Est|Leste Asiático|Ostasien|Asia orientale||东亚|동아시아|東アジア|Восточная Азия|Azja Wschodnia", ["China", "Mongolia", "North Korea", "South Korea", "Japan", "Taiwan"]),
    RG("sudeste-asiatico", "as", "Sudeste Asiático|Southeast Asia|Asie du Sud-Est|Sudeste Asiático|Südostasien|Sud-est asiatico||东南亚|동남아시아|東南アジア|Юго-Восточная Азия|Azja Południowo-Wschodnia", ["Myanmar", "Thailand", "Laos", "Cambodia", "Vietnam", "Malaysia", "Singapore", "Brunei", "Philippines", "Indonesia", "Timor-Leste"]),
    RG("magreb", "af", "Magreb|Maghreb|Maghreb|Magrebe|Maghreb|Maghreb||马格里布|마그레브|マグリブ|Магриб|Maghreb", ["Morocco", "Algeria", "Tunisia", "Libya", "Mauritania"]),
    RG("nilo-cuerno", "af", "Nilo y Cuerno de África|Nile & Horn of Africa|Nil et Corne de l'Afrique|Nilo e Chifre da África|Nil und Horn von Afrika|Nilo e Corno d'Africa||尼罗河与非洲之角|나일강과 아프리카의 뿔|ナイル川流域とアフリカの角|Нил и Африканский Рог|Nil i Róg Afryki", ["Egypt", "Sudan", "S. Sudan", "Ethiopia", "Eritrea", "Djibouti", "Somalia"]),
    RG("africa-occidental", "af", "África Occidental|West Africa|Afrique de l'Ouest|África Ocidental|Westafrika|Africa occidentale||西非|서아프리카|西アフリカ|Западная Африка|Afryka Zachodnia", ["Senegal", "Cabo Verde", "Gambia", "Guinea-Bissau", "Guinea", "Sierra Leone", "Liberia", "Côte d'Ivoire", "Mali", "Burkina Faso", "Ghana", "Togo", "Benin", "Niger", "Nigeria"]),
    RG("africa-central", "af", "África Central|Central Africa|Afrique centrale|África Central|Zentralafrika|Africa centrale||中部非洲|중앙아프리카|中部アフリカ|Центральная Африка|Afryka Środkowa", ["Dem. Rep. Congo", "Congo", "Gabon", "Eq. Guinea", "São Tomé and Principe", "Cameroon", "Central African Rep.", "Chad"]),
    RG("africa-oriental", "af", "África Oriental|East Africa|Afrique de l'Est|África Oriental|Ostafrika|Africa orientale||东非|동아프리카|東アフリカ|Восточная Африка|Afryka Wschodnia", ["Kenya", "Tanzania", "Uganda", "Rwanda", "Burundi", "Madagascar", "Seychelles", "Comoros", "Mauritius"]),
    RG("africa-austral", "af", "África Austral|Southern Africa|Afrique australe|África Austral|Südliches Afrika|Africa australe||南部非洲|아프리카 남부|南部アフリカ|Южная Африка|Afryka Południowa", ["South Africa", "Namibia", "Botswana", "Zimbabwe", "Zambia", "Malawi", "Mozambique", "Angola", "Lesotho", "eSwatini"]),
    RG("anglo", "na", "EE. UU., Canadá y Groenlandia|United States, Canada & Greenland|États-Unis, Canada et Groenland|EUA, Canadá e Groenlândia|USA, Kanada und Grönland|Stati Uniti, Canada e Groenlandia||美国、加拿大与格陵兰|미국·캐나다·그린란드|アメリカ・カナダ・グリーンランド|США, Канада и Гренландия|USA, Kanada i Grenlandia", ["United States of America", "Canada", "Greenland"]),
    RG("centroamerica", "na", "México y Centroamérica|Mexico & Central America|Mexique et Amérique centrale|México e América Central|Mexiko und Zentralamerika|Messico e America centrale||墨西哥与中美洲|멕시코와 중앙아메리카|メキシコと中央アメリカ|Мексика и Центральная Америка|Meksyk i Ameryka Środkowa", ["Mexico", "Guatemala", "Belize", "El Salvador", "Honduras", "Nicaragua", "Costa Rica", "Panama"]),
    RG("caribe", "na", "Caribe|Caribbean|Caraïbes|Caribe|Karibik|Caraibi||加勒比地区|카리브해 지역|カリブ海諸国|Карибский бассейн|Karaiby", ["Cuba", "Bahamas", "Jamaica", "Haiti", "Dominican Rep.", "St. Kitts and Nevis", "Antigua and Barb.", "Dominica", "Saint Lucia", "St. Vin. and Gren.", "Barbados", "Grenada", "Trinidad and Tobago", "Curaçao", "Aruba"]),
    RG("andinos", "sa", "Países andinos|Andean countries|Pays andins|Países andinos|Andenstaaten|Paesi andini||安第斯国家|안데스 국가|アンデス諸国|Андские страны|Kraje andyjskie", ["Colombia", "Venezuela", "Ecuador", "Peru", "Bolivia"]),
    RG("brasil-guayanas", "sa", "Brasil y las Guayanas|Brazil & the Guianas|Brésil et Guyanes|Brasil e Guianas|Brasilien und die Guayanas|Brasile e Guiane||巴西与圭亚那地区|브라질과 기아나 지역|ブラジルとギアナ地方|Бразилия и Гвианы|Brazylia i Gujany", ["Brazil", "Guyana", "Suriname"]),
    RG("cono-sur", "sa", "Cono Sur|Southern Cone|Cône Sud|Cone Sul|Südkegel|Cono Sud||南锥体|남아메리카 남부|南米南部|Южный конус|Stożek Południowy", ["Argentina", "Chile", "Uruguay", "Paraguay"]),
    RG("australasia", "oc", "Australia y Nueva Zelanda|Australia & New Zealand|Australie et Nouvelle-Zélande|Austrália e Nova Zelândia|Australien und Neuseeland|Australia e Nuova Zelanda||澳大利亚与新西兰|오스트레일리아와 뉴질랜드|オーストラリアとニュージーランド|Австралия и Новая Зеландия|Australia i Nowa Zelandia", ["Australia", "New Zealand"]),
    RG("melanesia", "oc", "Melanesia|Melanesia|Mélanésie|Melanésia|Melanesien|Melanesia||美拉尼西亚|멜라네시아|メラネシア|Меланезия|Melanezja", ["Papua New Guinea", "Solomon Is.", "Vanuatu", "Fiji"]),
    RG("micronesia", "oc", "Micronesia|Micronesia|Micronésie|Micronésia|Mikronesien|Micronesia||密克罗尼西亚|미크로네시아|ミクロネシア|Микронезия|Mikronezja", ["Palau", "Micronesia", "Nauru", "Marshall Is.", "Kiribati"]),
    RG("polinesia", "oc", "Polinesia|Polynesia|Polynésie|Polinésia|Polynesien|Polinesia||波利尼西亚|폴리네시아|ポリネシア|Полинезия|Polinezja", ["Samoa", "Tonga"], { extra: ["Q672", "Q26988"] }),   // + Tuvalu e Islas Cook (sin poligono en el mapa)
    RG("atlantico", "sea", "Océano Atlántico|Atlantic Ocean|Océan Atlantique|Oceano Atlântico|Atlantischer Ozean|Oceano Atlantico||大西洋|대서양|大西洋|Атлантический океан|Ocean Atlantycki", [], { seas: ["atlantic-ocean", "north-sea", "baltic-sea", "sargasso-sea", "gulf-of-mexico", "caribbean-sea"] }),
    RG("mediterraneo", "sea", "Mediterráneo y mar Negro|Mediterranean & Black Sea|Méditerranée et mer Noire|Mediterrâneo e mar Negro|Mittelmeer und Schwarzes Meer|Mediterraneo e Mar Nero||地中海与黑海|지중해와 흑해|地中海と黒海|Средиземное и Чёрное моря|Morze Śródziemne i Czarne", [], { seas: ["mediterranean-sea", "adriatic-sea", "aegean-sea", "black-sea"] }),
    RG("indico", "sea", "Océano Índico|Indian Ocean|Océan Indien|Oceano Índico|Indischer Ozean|Oceano Indiano||印度洋|인도양|インド洋|Индийский океан|Ocean Indyjski", [], { seas: ["indian-ocean", "red-sea", "persian-gulf", "arabian-sea", "bay-of-bengal"] }),
    RG("pacifico", "sea", "Océano Pacífico|Pacific Ocean|Océan Pacifique|Oceano Pacífico|Pazifischer Ozean|Oceano Pacifico||太平洋|태평양|太平洋|Тихий океан|Ocean Spokojny", [], { seas: ["pacific-ocean", "south-china-sea", "sea-of-japan", "coral-sea", "tasman-sea"] }),
    RG("polares", "sea", "Polos y océanos polares|Poles & polar oceans|Pôles et océans polaires|Polos e oceanos polares|Pole und Polarmeere|Poli e oceani polari||两极与极地海洋|극지방과 극지 바다|極地と極地の海|Полюса и полярные океаны|Bieguny i oceany polarne", ["Antarctica"], { seas: ["arctic-ocean", "southern-ocean", "drake-passage"] }),
  ];
  const regName = r => P(r.names);
  const REG_OF = {}; REGIONS.forEach(r => r.countries.forEach(ne => (REG_OF[ne] = r)));   // pais del mapa (Natural Earth) -> su familia (la Aventura la usa en la nota de las banderas)
  const contName = c => A.t("cont." + c);

  /* indice geografico: se monta la primera vez que se abre la Enciclopedia (nada de esto hace falta para jugar) */
  let G = null;
  const nearestNE = (lat, lon, ok) => {
    let best = null, bd = 160;
    for (const f of world.features) {
      if (!ok[f.name]) continue;
      let near = false; for (const p of f.polys) if (lon >= p.bbox[0] - 1 && lon <= p.bbox[2] + 1 && lat >= p.bbox[1] - 1 && lat <= p.bbox[3] + 1) { near = true; break; }
      if (near && A.geo.inFeature(lon, lat, f)) return f.name;
    }
    for (const f of world.features) { if (!ok[f.name]) continue; const d = A.geo.distToFeature(lon, lat, f, bd); if (d < bd) { bd = d; best = f.name; } }
    return best;
  };
  const SECS = [
    { k: "city", ic: "t_city", types: ["capital", "city"], n: "Capitales y ciudades|Capitals & cities|Capitale et villes|Capital e cidades|Hauptstadt und Städte|Capitale e città||首都与城市|수도와 도시|首都と都市|Столица и города|Stolica i miasta" },
    { k: "landmark", ic: "t_landmark", types: ["landmark", "place"], n: "Monumentos|Landmarks|Monuments|Monumentos|Sehenswürdigkeiten|Monumenti||名胜古迹|명소|名所|Достопримечательности|Zabytki" },
    { k: "nature", ic: "t_nature", types: ["nature", "water", "strait"], n: "Naturaleza|Nature|Nature|Natureza|Natur|Natura||自然|자연|自然|Природа|Przyroda" },
    { k: "history", ic: "t_battle", types: ["battle", "event"], n: "Batallas y sucesos|Battles & events|Batailles et événements|Batalhas e eventos|Schlachten und Ereignisse|Battaglie ed eventi||战役与事件|전투와 사건|戦いと出来事|Битвы и события|Bitwy i wydarzenia" },
    { k: "person", ic: "t_person", types: ["person"], n: "Personajes|People|Personnages|Personagens|Persönlichkeiten|Personaggi||人物|인물|人物|Личности|Postacie" },
    { k: "curio", ic: "t_curio", types: ["curiosity"], n: "Curiosidades|Curiosities|Curiosités|Curiosidades|Kuriositäten|Curiosità||趣闻|흥미로운 사실|豆知識|Любопытные факты|Ciekawostki" },
  ];
  const SEC_OF = {}; SECS.forEach((s, i) => s.types.forEach(t => (SEC_OF[t] = i)));
  function index() {
    if (G) return G;
    const regs = REGIONS.map(r => ({ ...r, groups: [] })), gs = {}, byNE = {}, seaOf = {};
    const mk = (key, r, o) => (gs[key] = { key, reg: r, card: null, places: [], singles: [], ...o });
    regs.forEach(r => {
      r.countries.forEach(ne => { if (!E["c:" + ne] && !world.byName[ne]) return; byNE[ne] = r; r.groups.push(mk("c:" + ne, r, { ne, card: E["c:" + ne] ? "c:" + ne : null })); });
      if (r.seas) { r.seas.forEach(p => (seaOf[p] = "s:" + r.id)); r.groups.push(mk("s:" + r.id, r, { sea: true })); }
      (r.extra || []).forEach(q => r.groups.push(mk("q:" + q, r, { qc: q })));
    });
    const cKey = ne => (ne && byNE[ne] ? "c:" + ne : null);
    const keyOf = e => {
      if (seaOf[e.id]) return seaOf[e.id];
      const k = cKey(e.country) || cKey(e.home); if (k) return k;
      if (e.triggers) {                                                 // curadas: el pais de los lugares que las desbloquean (alli es donde se consiguen)
        const n = {}; let best = null;
        e.triggers.forEach(t => { const x = t.startsWith("c:") ? t.slice(2) : E[t] && (E[t].country || E[t].home); if (x && byNE[x]) { n[x] = (n[x] || 0) + 1; if (!best || n[x] > n[best]) best = x; } });
        if (best) return "c:" + best;
      }
      if (e.qc && gs["q:" + e.qc]) return "q:" + e.qc;                // Tuvalu e Islas Cook
      return e.lat != null ? cKey(nearestNE(e.lat, e.lon, byNE)) : null;
    };
    const misc = [];
    order.forEach(id => {
      const e = E[id]; if (e.parent || e.type === "country") return;
      const g = gs[keyOf(e)]; if (!g) { misc.push(id); return; }
      g[E[id + "~h"] ? "places" : "singles"].push(id); e.g = g.key;
    });
    if (misc.length) { const r = regs.find(x => x.id === "polares"); const g = mk("s:otros", r, { sea: true, misc: true }); g.singles = misc.filter(id => !E[id + "~h"]); g.places = misc.filter(id => E[id + "~h"]); misc.forEach(id => (E[id].g = g.key)); r.groups.push(g); }
    Object.values(gs).forEach(g => {
      if (g.card) { E[g.card].g = g.key; }
      const sec = id => SEC_OF[E[id].type] ?? 1;
      const by = (a, b) => (sec(a) - sec(b)) || ((fame[a] ?? 999) - (fame[b] ?? 999)) || (E[a].no - E[b].no);
      g.places.sort(by); g.singles.sort(by); g.all = g.places.concat(g.singles).sort(by);
    });
    G = { regs, gs, byNE };
    return G;
  }

  /* medallas: 0-3 en los lugares con niveles (id, id~h, id~k); 0/1 en las tarjetas sueltas */
  const U = isUnlocked;
  const tiered = id => !!E[id + "~h"];
  const medOf = id => tiered(id) ? (U(id) ? 1 : 0) + (U(id + "~h") ? 1 : 0) + (U(id + "~k") ? 1 : 0) : (U(id) ? 1 : 0);
  const idsOf = id => (tiered(id) ? [id, id + "~h", id + "~k"] : [id]);
  const freshOf = id => idsOf(id).some(x => U(x) && !store.seen[x]);
  /* recuentos por grupo, memorizados hasta que cambia el progreso (desbloquear, ver, borrar): cada pagina los pide decenas de veces */
  let SM = new Map();
  let statVer = 0;
  let rfN = -1;
  const dirty = () => { SM = new Map(); statVer++; rfN = -1; };
  const refineN = () => { if (rfN < 0) { rfN = 0; order.forEach(id => { const e = E[id]; if (!e.parent && tiered(id) && U(id) && medOf(id) < 3) rfN++; }); } return rfN; };
  function gStats(g) {
    const hit = SM.get(g.key); if (hit) return hit;
    const s = { u: 0, t: 0, pl: 0, pu: 0, m: [0, 0, 0, 0], nw: 0 }; SM.set(g.key, s);
    const one = id => { const ids = idsOf(id); s.t += ids.length; ids.forEach(x => { if (U(x)) { s.u++; if (!store.seen[x]) s.nw++; } }); };
    if (g.card) one(g.card);                                          // la ficha del pais cuenta en el %, pero sus medallas van aparte (en su bandera)
    g.places.forEach(id => { one(id); const m = medOf(id); s.m[m]++; s.pl++; if (m) s.pu++; });
    g.singles.forEach(one);
    return s;
  }
  const sumStats = groups => groups.reduce((a, g) => { const s = gStats(g); a.u += s.u; a.t += s.t; a.pl += s.pl; a.pu += s.pu; a.nw += s.nw; s.m.forEach((v, i) => (a.m[i] += v)); return a; }, { u: 0, t: 0, pl: 0, pu: 0, m: [0, 0, 0, 0], nw: 0 });
  const contGroups = c => index().regs.filter(r => r.cont === c).flatMap(r => r.groups);
  const gKnown = g => !!g.sea || gStats(g).u > 0;
  const pctOf = s => (s.t ? (s.u >= s.t ? 100 : Math.floor(100 * s.u / s.t)) : 0);

  /* nombres y banderas de los paises */
  const cName = ne => { const e = E["c:" + ne], n = e && e.name; if (n && n.es && n.fr) return A.tx(n); const q = neQ[ne], pc = q && A.PCOUNTRY && A.PCOUNTRY[q]; return (pc && A.tx(pc)) || (n && n.en) || ne; };
  const gName = g => (g.ne ? cName(g.ne) : g.qc ? ((A.PCOUNTRY && A.PCOUNTRY[g.qc] && A.tx(A.PCOUNTRY[g.qc])) || g.qc) : regName(g.reg));
  /* banderas ya rasterizadas (tools/flags-raster.cjs): los SVG con escudo se pintan en el hilo principal y una pagina con 40 daba un tiron */
  const hasFlag = ne => { const en = neEn[ne]; return !!(en && A.FLAGS && A.FLAGS[en]); };   // los 199 paises la tienen (data/flags.js); si faltara una, sale el icono de pais
  const flagSrc = ne => { const en = neEn[ne], F = en && A.FLAGS && A.FLAGS[en]; return F ? `assets/flags/r/${A.mediaKey(en)}.webp` : A.media(`assets/wiki/card/${A.mediaKey("c:" + ne)}.webp`); };
  const flagFit = ne => { const en = neEn[ne], F = en && A.FLAGS && A.FLAGS[en], r = F ? F[1] / F[2] : 1.5; return r < 1.25 || r > 2.1 ? " fit" : ""; };   // Nepal, Suiza, Vaticano, Catar...: enteras
  const flagImg = (ne, cls = "") => (hasFlag(ne) ? `<img class="cx-flag${flagFit(ne)}${cls}" alt="" src="${esc(flagSrc(ne))}" decoding="async" draggable="false">` : A.icon("t_country"));

  /* ================================================================== interfaz */
  const S = {
    home: "Resumen|Overview|Vue d'ensemble|Resumo|Übersicht|Panoramica||总览|개요|概要|Обзор|Przegląd",
    refine: "Por afinar|To refine|À affiner|Para refinar|Zu verfeinern|Da affinare||待精进|정확도 올리기|精度を上げる|Довести до золота|Do poprawy",
    mine: "Tu Enciclopedia|Your Encyclopedia|Ton Encyclopédie|Sua Enciclopédia|Deine Enzyklopädie|La tua enciclopedia||你的百科全书|나의 도감|あなたの図鑑|Твоя энциклопедия|Twoja Encyklopedia",
    places: "{a} / {b} lugares|{a} / {b} places|{a} / {b} lieux|{a} / {b} lugares|{a} / {b} Orte|{a} / {b} luoghi||{a} / {b} 个地点|장소 {a} / {b}|{a} / {b} か所|Мест: {a} / {b}|Miejsca: {a} / {b}",
    nCountries: "{n} países|{n} countries|{n} pays|{n} países|{n} Länder|{n} paesi||{n} 个国家|국가 {n}곳|{n} か国|Стран: {n}|Kraje: {n}",
    countries: "Países|Countries|Pays|Países|Länder|Paesi||国家|국가|国|Страны|Kraje",
    bronze: "Bronce|Bronze|Bronze|Bronze|Bronze|Bronzo||铜牌|동메달|銅メダル|Бронза|Brąz",
    silver: "Plata|Silver|Argent|Prata|Silber|Argento||银牌|은메달|銀メダル|Серебро|Srebro",
    gold: "Oro|Gold|Or|Ouro|Gold|Oro||金牌|금메달|金メダル|Золото|Złoto",
    within: "a menos de {km}|within {km}|à moins de {km}|a menos de {km}|unter {km}|entro {km}||{km} 以内|{km} 이내|{km} 以内|в пределах {km}|do {km}",
    m1: "Descubiertos|Discovered|Découverts|Descobertos|Entdeckt|Scoperti||已发现|발견|発見|Открыто|Odkryte",
    chap1: "El lugar|The place|Le lieu|O lugar|Der Ort|Il luogo||地点|장소|場所|Место|Miejsce",
    chap1c: "El país|The country|Le pays|O país|Das Land|Il paese||国家|국가|国|Страна|Kraj",
    got: "Conseguida|Earned|Obtenue|Conquistada|Erhalten|Ottenuta||已获得|획득|獲得済み|Получено|Zdobyte",
    miss: "Te falta|Missing|Manquante|Falta|Fehlt|Manca||未获得|미획득|未獲得|Нет|Brak",
    lockL: "Sin descubrir|Undiscovered|Non découvert|Não descoberto|Unentdeckt|Non scoperto||未发现|미발견|未発見|Не открыто|Nieodkryte",
    started: "Empezado|Started|Commencé|Em andamento|Begonnen|Iniziato||已开始|진행 중|進行中|Начато|Rozpoczęte",
    full: "Completo|Complete|Complet|Completo|Vollständig|Completo||已完成|완료|コンプリート|Завершено|Ukończone",
    mapHint: "Pulsa un país para abrirlo|Click a country to open it|Clique sur un pays pour l'ouvrir|Clique em um país para abri-lo|Klicke auf ein Land, um es zu öffnen|Clicca su un paese per aprirlo|Haz clic en un país para abrirlo|点击国家即可打开|국가를 클릭하면 열려요|国をクリックすると開きます|Нажми на страну, чтобы открыть её|Kliknij kraj, aby go otworzyć",
    ficha: "Ficha del país|Country card|Fiche du pays|Ficha do país|Länder-Steckbrief|Scheda del paese||国家卡片|국가 카드|国のカード|Карточка страны|Karta kraju",
    read: "Leer la ficha|Read the card|Lire la fiche|Ler a ficha|Steckbrief lesen|Leggi la scheda||阅读卡片|카드 읽기|カードを読む|Читать карточку|Czytaj kartę",
    two: "A un paso del oro|One step from gold|À un pas de l'or|A um passo do ouro|Nur noch Gold fehlt|A un passo dall'oro||离金牌一步之遥|금메달까지 한 걸음|金まであと一歩|Шаг до золота|Krok od złota",
    one: "Te faltan la plata y el oro|Silver and gold to go|Il manque l'argent et l'or|Faltam a prata e o ouro|Silber und Gold fehlen noch|Mancano argento e oro||还差银牌和金牌|은메달과 금메달이 남았어요|銀と金がまだ|Не хватает серебра и золота|Brakuje srebra i złota",
    ctry: "Países por dominar|Countries to master|Pays à maîtriser|Países para dominar|Länder zum Meistern|Paesi da padroneggiare||待精通的国家|정복할 국가|極めたい国|Страны для покорения|Kraje do opanowania",
    refineIntro: "Lugares que ya conoces: clávalos más cerca para ganar las medallas que les faltan.|Places you already know: pin them closer to win their missing medals.|Des lieux que tu connais déjà : vise plus près pour gagner les médailles qui leur manquent.|Lugares que você já conhece: acerte mais perto para ganhar as medalhas que faltam.|Orte, die du schon kennst: Triff sie genauer, um die fehlenden Medaillen zu holen.|Luoghi che conosci già: piazzali più vicino per vincere le medaglie mancanti.|Lugares que ya conoces: clávalos más cerca para ganar las medallas que les faltan.|你已认识的地点：标得更准，就能拿到还差的奖牌。|이미 아는 장소들이에요. 더 가깝게 찍어서 남은 메달을 따세요.|もう知っている場所です。もっと近くに当てて、残りのメダルを手に入れよう。|Места, которые ты уже знаешь: отметь их точнее, чтобы получить недостающие медали.|Miejsca, które już znasz: traf bliżej, by zdobyć brakujące medale.",
    refineCtry: "Su historia y su dato clave se ganan con la pregunta del propio país.|Their history and key fact are won with the country's own question.|Leur histoire et leur fait clé se gagnent avec la question du pays lui-même.|A história e o dado-chave se ganham com a pergunta do próprio país.|Geschichte und Kernfakt gibt es nur mit der Frage nach dem Land selbst.|Storia e dato chiave si vincono con la domanda sul paese stesso.||它们的历史和关键信息，要答对该国本身的题目才能获得。|역사와 핵심 정보는 그 나라 자체를 묻는 문제로 얻어요.|歴史と重要な事実は、その国そのものを問う問題で手に入る。|Историю и ключевой факт даёт только вопрос о самой стране.|Historię i kluczowy fakt zdobywa się pytaniem o sam kraj.",
    refineEmpty: "Nada por afinar: todo lo que conoces está clavado.|Nothing to refine: you've nailed everything you know.|Rien à affiner : tout ce que tu connais a déjà sa médaille d'or.|Nada para refinar: tudo o que você conhece está cravado.|Nichts zu verfeinern: Alles, was du kennst, sitzt.|Niente da affinare: tutto ciò che conosci è centrato.|Nada por afinar: ya tienes el oro en todo lo que conoces.|没有需要精进的：你已认识的地点都已拿到金牌。|다듬을 곳이 없어요. 아는 곳은 모두 정확히 맞혔어요.|精度を上げる場所はありません。知っている場所はすべて完璧です。|Доводить нечего: у всего, что ты знаешь, уже есть золото.|Nie ma nic do poprawy: wszystko, co znasz, jest trafione.",
    lockedC: "País sin descubrir|Undiscovered country|Pays non découvert|País não descoberto|Unentdecktes Land|Paese non scoperto||未发现的国家|미발견 국가|未発見の国|Неоткрытая страна|Nieodkryty kraj",
    lockedCHint: "Acierta cualquier lugar de este país a menos de {km} para descubrirlo.|Pin any place in this country within {km} to discover it.|Place n'importe quel lieu de ce pays à moins de {km} pour le découvrir.|Acerte qualquer lugar deste país a menos de {km} para descobri-lo.|Triff einen beliebigen Ort dieses Landes mit weniger als {km} Abstand, um es zu entdecken.|Centra un luogo qualsiasi di questo paese entro {km} per scoprirlo.|Acierta cualquier lugar de este país a menos de {km} para descubrirlo.|在 {km} 以内标出该国任意地点，即可发现这个国家。|이 나라의 아무 장소나 {km} 이내로 맞히면 발견돼요.|この国のどこかを {km} 以内で当てると発見できる。|Отметь любое место этой страны в пределах {km}, чтобы открыть её.|Traf dowolne miejsce w tym kraju z dokładnością do {km}, by go odkryć.",
    chainBy: "Clava a menos de {km} uno de estos lugares: {list}.|Pin one of these places within {km}: {list}.|Place l'un de ces lieux à moins de {km} : {list}.|Acerte um destes lugares a menos de {km}: {list}.|Triff einen dieser Orte mit weniger als {km} Abstand: {list}.|Centra uno di questi luoghi entro {km}: {list}.|Atina a menos de {km} uno de estos lugares: {list}.|在 {km} 以内标出其中一个地点：{list}。|다음 장소 중 하나를 {km} 이내로 맞히세요: {list}.|次のどれかを {km} 以内で当てよう：{list}。|Отметь одно из этих мест в пределах {km}: {list}.|Traf z dokładnością do {km} jedno z tych miejsc: {list}.",
    classic: "Sale en el modo {m}: sitúa el lugar a menos de {km}.|Appears in {m} mode: pin it within {km}.|Apparaît en mode {m} : place-le à moins de {km}.|Aparece no modo {m}: acerte a menos de {km}.|Kommt im Modus „{m}“ vor: Triff ihn mit weniger als {km} Abstand.|Compare nella modalità {m}: piazzalo entro {km}.|Sale en el modo {m}: ubícalo a menos de {km}.|出现在{m}模式中：在 {km} 以内标出即可。|{m} 모드에 나와요. {km} 이내로 맞히세요.|{m}モードに登場：{km} 以内で当てよう。|Встречается в режиме «{m}»: отметь это место в пределах {km}.|Pojawia się w trybie „{m}”: traf z dokładnością do {km}.",
    prev: "Anterior|Previous|Précédent|Anterior|Zurück|Precedente||上一个|이전|前へ|Назад|Poprzedni",
    next: "Siguiente|Next|Suivant|Próximo|Weiter|Successivo||下一个|다음|次へ|Далее|Następny",
    results: "Resultados: {n}|Results: {n}|Résultats : {n}|Resultados: {n}|Ergebnisse: {n}|Risultati: {n}||{n} 个结果|결과 {n}개|{n} 件|Найдено: {n}|Wyniki: {n}",
    noRes: "Nada de lo que has descubierto se llama así.|Nothing you've discovered goes by that name.|Rien de ce que tu as découvert ne porte ce nom.|Nada do que você descobriu tem esse nome.|Nichts, was du entdeckt hast, heißt so.|Niente di ciò che hai scoperto si chiama così.||你发现的内容里没有这个名字。|발견한 것 중에 그런 이름은 없어요.|発見したものの中に、その名前はありません。|Среди открытого нет ничего с таким названием.|Nic spośród odkrytych miejsc tak się nie nazywa.",
    nothing: "Aún no has descubierto nada aquí: acierta lugares de esta zona en una partida.|Nothing discovered here yet: pin places from this area in a game.|Rien de découvert ici pour l'instant : trouve des lieux de cette zone pendant une partie.|Nada descoberto aqui ainda: acerte lugares desta área numa partida.|Hier ist noch nichts entdeckt: Triff Orte aus dieser Gegend in einer Partie.|Ancora niente di scoperto qui: centra luoghi di questa zona in partita.|Aún no has descubierto nada aquí: acierta lugares de esta zona en una partida.|这里还什么都没发现：在游戏中命中这一带的地点吧。|아직 여기서 발견한 게 없어요. 게임에서 이 지역의 장소를 맞혀 보세요.|ここはまだ何も発見していません。ゲームでこの地域の場所を当てよう。|Здесь пока ничего не открыто: угадывай места этого региона в игре.|Nic tu jeszcze nie odkryto: trafiaj miejsca z tego regionu w grze.",
    newN: "Nuevas: {n}|New: {n}|Nouvelles : {n}|Novas: {n}|Neu: {n}|Nuove: {n}||{n} 个新内容|새로 얻음 {n}|新着 {n}|Новых: {n}|Nowe: {n}",
    nueva: "Nueva|New|Nouvelle|Nova|Neu|Nuova||新|NEW|NEW|Новая|Nowa",
    prog: "{a} / {b} medallas y tarjetas|{a} / {b} medals & cards|{a} / {b} médailles et cartes|{a} / {b} medalhas e cartas|{a} / {b} Medaillen und Karten|{a} / {b} medaglie e carte||奖牌与卡片 {a} / {b}|메달·카드 {a} / {b}|メダルとカード {a} / {b}|Медали и карточки: {a} / {b}|Medale i karty: {a} / {b}",
  };
  const ui = { built: false, view: { k: "home" }, stack: [], q: "", cur: null, lockN: 0 };
  const esc = s => A.esc(s);                                           // textos de Wikipedia/Commons dentro de innerHTML
  const photo = u => (/\.svg$/i.test(u) ? "" : "cx-photo");           // fotos de Wikipedia/Commons: se reducen suavizadas (css/codex.css); el arte pixel y las banderas SVG siguen nitidos
  const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ł/g, "l").replace(/ø/g, "o").replace(/ß/g, "ss").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/[đð]/g, "d").replace(/þ/g, "th").replace(/ı/g, "i");   // busqueda sin tildes ni mayusculas (ni ł, ø, ß, æ, œ, đ, ð, þ, ı, que NFD no separa)
  const cap = t => (t ? t.charAt(0).toLocaleUpperCase(A.lang) + t.slice(1) : "");
  const kmTxt = km => (A.core && A.core.S && A.core.S.units === "mi" ? A.fmtDist(km) : A.fmt(km) + " km");
  const nameOf = (e, rec) => e.type === "country" && e.id.startsWith("c:") ? cName(e.id.slice(2)) : e.parent ? nameOf(E[e.parent], rec) : e.name[A.lang] || e.name[A.wlang()] || (rec && rec.title && rec.lang === A.wlang() ? rec.title : "") || e.name.en || e.name.es;
  const MED = ["bronze", "silver", "gold"];
  const medal = (i, on, cls = "") => `<span class="cx-md ${MED[i]}${on ? " on" : ""} ${cls}">${A.icon("medal_" + MED[i])}</span>`;
  const pips = m => `<span class="cx-pips">${[0, 1, 2].map(i => `<i class="${MED[i]}${m > i ? " on" : ""}"></i>`).join("")}</span>`;
  /* barra de un grupo: lugares por medallas (oro, plata, bronce, sin descubrir) */
  const mbar = s => { const n = Math.max(1, s.m[0] + s.m[1] + s.m[2] + s.m[3]), w = v => (100 * v / n).toFixed(2) + "%"; return `<span class="cx-mb"><s class="g" style="width:${w(s.m[3])}"></s><s class="s" style="width:${w(s.m[2])}"></s><s class="b" style="width:${w(s.m[1])}"></s></span>`; };
  const scaleOf = groups => { const l = new Set(groups.flatMap(g => g.places).map(id => A.codexLimits({ id })[0])); return l.size === 1 ? [...l][0] / LIM[0] : 1; };
  const medCounts = (s, sc = 1) => `<span class="cx-mc">${[0, 1, 2].map(i => `<span class="${MED[i]}" data-tt="${esc(P(S[MED[i]]) + " · " + P(S.within).replace("{km}", kmTxt(LIM[i] * sc)))}">${A.icon("medal_" + MED[i])}<b>${A.fmt(s.m.slice(i + 1).reduce((a, b) => a + b, 0))}</b></span>`).join("")}</span>`;
  const placesTxt = s => (s.pl ? P(S.places).replace("{a}", A.fmt(s.pu)).replace("{b}", A.fmt(s.pl)) : `${A.fmt(s.u)} / ${A.fmt(s.t)}`);
  const limits = id => A.codexLimits({ id });

  /* ---------------- armazon ---------------- */
  function buildUI() {
    if (ui.built) return; ui.built = true;
    const root = document.createElement("div"); root.id = "codex"; root.className = "hidden"; root.setAttribute("role", "dialog");
    root.innerHTML = `
      <div class="cx-shell">
        <header class="cx-head">
          <button class="gx-btn sm cx-back" id="cxBack" type="button">${A.icon("u_back")}<b></b>${A.gala.keyHint("Esc", "b")}</button>
          <div class="cx-ttl"><h2 class="gx-t-l"><span class="cx-tic">${A.icon("m_codex")}</span><span data-cx="title"></span></h2><nav class="cx-crumb" id="cxCrumb"></nav></div>
          <label class="cx-search">${A.icon("lens", "sm")}<input id="cxSearch" type="search" autocomplete="off" spellcheck="false"></label>
        </header>
        <div class="cx-body">
          <nav class="cx-nav" id="cxNav"></nav>
          <main class="cx-main" id="cxMain" tabindex="-1"></main>
          <div class="cx-stage" id="cxStage"><span class="cx-mtip hidden" id="cxTip"></span><div class="cx-leg" id="cxLeg"></div>
            <div class="cx-zoom"><button type="button" data-zoom="in" data-tip="tip.in" data-key="+">${A.icon("u_plus")}</button><button type="button" data-zoom="out" data-tip="tip.out" data-key="−">${A.icon("u_minus")}</button><button type="button" data-zoom="home" data-tip="tip.home" data-key="0">${A.icon("u_home")}</button></div></div>
        </div>
        <div class="cx-light hidden" id="cxLight"></div>
      </div><div class="cx-brk" aria-hidden="true"></div><div class="cx-pw" aria-hidden="true"><i></i><i></i><b></b></div>`;   // v0.3.50: el visor (escuadras de laton) y el encendido y apagado del aparato
    $("app").appendChild(root);
    $("cxBack").onclick = () => back();
    let qT = 0;
    $("cxSearch").oninput = e => { clearTimeout(qT); qT = setTimeout(() => { const raw = e.target.value, q = fold(raw.trim()); if (q) { if (ui.view.k !== "search") { saveTop(); ui.stack.push(ui.view); } ui.view = { k: "search", q, raw }; render(); } else if (ui.view.k === "search") back(); }, 140); };
    /* las teclas se escuchan en document (captura) y no en la raiz: al repintar se borra el boton que tenia el foco, el foco cae a <body>
       y Esc dejaba de retroceder (e Intro avanzaba la partida de detras). Mismo patron que js/podio.js */
    document.addEventListener("keydown", e => {
      if (!isOpen()) return;
      const lit = !$("cxLight").classList.contains("hidden");
      if (e.key === "Escape") { e.stopPropagation(); if (lit) $("cxLight").classList.add("hidden"); else back(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (ui.view.k === "detail" && e.target.tagName !== "INPUT" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.stopPropagation(); e.preventDefault(); if (!lit) step(e.key === "ArrowLeft" ? -1 : 1); return; }
      { const za = e.target.tagName !== "INPUT" && stageOn() && A.keys ? A.keys.which(e) : null; if (za === "zin" || za === "zout" || za === "home") { e.stopPropagation(); e.preventDefault(); zoomStep(za === "home" ? 0 : za === "zout" ? 1 / 1.6 : 1.6); return; } }   // +/- y 0: el zoom del mapa, como en partida
      if (e.target.tagName === "INPUT") { e.stopPropagation(); return; }
      if (!["codex", "fs", "sfx", "mus", "up", "down", "left", "right"].includes(A.keys && A.keys.which(e))) {   // v0.3.2: teclas de Ajustes > Controles (antes C, F, M y N fijas); el mapa del atlas tambien se mueve con el teclado
        e.stopPropagation(); if (e.key === "Enter" || e.key === " ") { const b = document.activeElement; if (!b || !$("codex").contains(b)) e.preventDefault(); } }   // Intro, espacio, P, 1-4, +/- y 0 no tocan la partida de detras
    }, true);
    root.addEventListener("click", onClick);
    $("cxStage").addEventListener("click", e => { const b = e.target.closest("[data-zoom]"); if (b) { zoomStep(b.dataset.zoom === "in" ? 1.6 : b.dataset.zoom === "out" ? 1 / 1.6 : 0); A.sfx.ui(); } });
    mapBind();
    /* sonido flojito al pasar por lo que se puede abrir (el resto de menus lo pone js/game.js) */
    let lastH = null;
    /* pasar el raton por una carta "Nueva" ya cuenta como verla: se quita la etiqueta sin tener que abrirla */
    root.addEventListener("mouseover", e => {
      const f = e.target.closest(".cx-card.fresh"); if (!f) return;
      f.classList.remove("fresh"); const n = f.querySelector(".cx-new"); if (n) n.remove();
      let ch = 0; idsOf(f.dataset.id).forEach(x => { if (pump.fr) pump.fr.delete(x); if (U(x) && !store.seen[x]) { store.seen[x] = 1; ch = 1; } }); if (ch) { save(); dirty(); }
    });
    root.addEventListener("mouseover", e => { const el = e.target.closest(".cx-nv, .cx-ct, .cx-card, .cx-jump, .cx-rel, .cx-crumb a, .cx-back, .cx-step, .cx-readc"); if (el && el !== lastH && A.sfx.hover) A.sfx.hover(); lastH = el; });
    root.addEventListener("pointermove", e => { const c = e.target.closest(".cx-card, .cx-big"); if (c) tiltMove(c, e, c.classList.contains("cx-big") ? 10 : 7); });
    root.addEventListener("pointerout", e => { const c = e.target.closest(".cx-card, .cx-big"); if (c && !c.contains(e.relatedTarget)) tiltReset(c); });
    notifiers.push((k, id) => { if (k !== "content" || !isOpen()) return; if (ui.cur === id) fillText(id); else paintThumb(id); });
    A.tips = A.tips || {};
    A.tips.cxCard = el => cardTip(el.dataset.id);
    A.tips.cxTile = el => tileTip(el.dataset.go.slice(2));
  }
  const isOpen = () => !!$("codex") && !$("codex").classList.contains("hidden");

  /* ---------------- navegacion: Resumen -> continente -> pais -> carta (Esc y "Volver" deshacen el camino) ---------------- */
  const parse = s => s === "home" ? { k: "home" } : s === "refine" ? { k: "refine" } : s.startsWith("cont:") ? { k: "cont", c: s.slice(5) } : s.startsWith("g:") ? { k: "group", g: s.slice(2) } : s.startsWith("d:") ? { k: "detail", id: s.slice(2) } : null;
  /* al irse de una pagina se apunta DONDE estabas: la carta o ficha pulsada (o la primera a la vista) y a que altura. Con pixeles no valia:
     las cartas entran por tandas y las secciones lejanas aun no tienen su alto real (content-visibility). Una lectura al navegar, nunca por fotograma */
  const zk = m => m.currentCSSZoom || parseFloat(document.documentElement.style.getPropertyValue("--k")) || 1;
  function saveTop(src) {
    const m = $("cxMain"); if (!m) return; const v = ui.view; v.top = m.scrollTop; v.sh = m.scrollHeight; v.anc = null;
    const r = m.getBoundingClientRect();
    let el = src && m.contains(src) ? src.closest(".cx-card[data-go], .cx-ct[data-go], .cx-rel[data-go]") : null;
    if (!el) for (const fy of [0.2, 0.45, 0.7]) { for (const fx of [0.25, 0.5, 0.75]) { const a = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); el = a && m.contains(a) && a.closest(".cx-card[data-go], .cx-ct[data-go]"); if (el) break; } if (el) break; }
    if (el) { v.anc = el.dataset.go; v.ancOff = (el.getBoundingClientRect().top - r.top) / zk(m); }
  }
  function restoreTop(m, v) {
    const want = v.anc, off = v.ancOff || 0; v.anc = null; pump.anc = null;
    if (!want && !v.top) { m.scrollTop = 0; return; }
    m.classList.add("cx-rst");                                          // las secciones de encima, con su alto real (sin content-visibility) mientras se vuelve
    if (pump.q.length && v.sh) m.insertAdjacentHTML("beforeend", `<div class="cx-hold" style="height:${v.sh}px;overflow-anchor:none"></div>`);   // y el alto que tenia, mientras entran las cartas de debajo
    m.scrollTop = v.top || 0;
    const place = () => { const el = want && m.querySelector(`[data-go="${CSS.escape(want)}"]`); if (el) m.scrollTop += (el.getBoundingClientRect().top - m.getBoundingClientRect().top) / zk(m) - off; };
    place(); if (want) pump.anc = place;
    if (!pump.q.length) requestAnimationFrame(() => m.classList.remove("cx-rst"));   // content-visibility: auto recuerda los altos ya pintados: nada se mueve al quitarlo
  }
  function go(v, root, src) {
    if (!v) return;
    if (root) ui.stack = []; else { saveTop(src); ui.stack.push(ui.view); }
    ui.view = v; render(); A.sfx.card();
  }
  function back() {
    if (ui.stack.length) { ui.view = ui.stack.pop(); render(); A.sfx.ui(); return; }
    if (ui.view.k !== "home") { ui.view = { k: "home" }; render(); A.sfx.ui(); return; }
    close();
  }
  /* camino de una vista (para las migas y para "Volver" cuando se entra directo a una carta desde el aviso) */
  function trail(v) {
    const out = [{ k: "home" }], gs = index().gs;                         // index() es quien apunta E[id].g
    const gOf = key => key && gs[key];
    const g = v.k === "group" ? gOf(v.g) : v.k === "detail" ? gOf(E[v.id] && E[v.id].g) : null;
    const c = v.k === "cont" ? v.c : g ? g.reg.cont : null;
    if (v.k === "refine") out.push({ k: "refine" });
    if (c) out.push({ k: "cont", c, jump: g && g.reg.id });
    if (g && (v.k === "detail" || v.k === "group") && !(g.sea && v.k === "detail")) out.push({ k: "group", g: g.key });
    if (v.k === "detail" && g && g.sea) out[out.length - 1].jump = g.reg.id;
    return out;
  }
  const viewName = v => v.k === "home" ? P(S.home) : v.k === "refine" ? P(S.refine) : v.k === "cont" ? contName(v.c) : v.k === "group" ? (() => { const g = index().gs[v.g]; return g && gKnown(g) ? gName(g) : "???"; })() : v.k === "detail" ? (U(v.id) ? nameOf(E[v.id], memOf(v.id)) : "???") : v.k === "search" ? A.t("codex.search").replace(/[.…]+$/, "") : "";
  function crumbSync() {
    const t = trail(ui.view), cur = ui.view, same = (a, b) => a.k === b.k && a.c === b.c && a.g === b.g;
    if (t.length && same(t[t.length - 1], cur)) t.pop();
    $("cxCrumb").innerHTML = t.map(x => `<a data-crumb="${esc(JSON.stringify(x))}">${esc(viewName(x))}</a>`).join("<i>›</i>") + (cur.k === "home" ? "" : `<i>›</i><b>${esc(viewName(cur))}</b>`);
    $("cxBack").querySelector("b").textContent = ui.view.k === "home" && !ui.stack.length ? A.t("codex.close") : A.t("codex.back");   // como en el resto de pantallas: Cerrar (o Volver dentro), con su tecla Esc
  }
  function onClick(e) {
    const t = e.target.closest("[data-go], [data-crumb], [data-jump], [data-step], [data-light]"); if (!t) return;
    if (t.dataset.crumb) { const v = JSON.parse(t.dataset.crumb), jump = v.jump; delete v.jump; saveTop(); ui.stack = trail(v).slice(0, -1); ui.view = v; render(); if (jump) jumpTo(jump, true); A.sfx.ui(); return; }
    if (t.dataset.jump) { jumpTo(t.dataset.jump); A.sfx.card(); return; }
    if (t.dataset.step) { step(+t.dataset.step); return; }
    if (t.dataset.light != null) { lightbox(ui.cur, t.dataset.light); return; }
    const v = parse(t.dataset.go); if (!v) return;
    if (t.classList.contains("cx-nv")) { ui.stack = []; ui.view = v; render(); A.sfx.card(); return; }
    if (v.k === "detail") openCard(v.id, t); else go(v, false, t);
  }
  function jumpTo(rid, now) {
    const el = $("cxr-" + rid); if (!el) return; const m = $("cxMain"), tok = pump.tok;
    const tg = () => Math.max(0, el.offsetTop - 8);
    const fix = n => { if (n <= 0 || tok !== pump.tok || !el.isConnected) return; const t = Math.min(tg(), m.scrollHeight - m.clientHeight); if (Math.abs(t - m.scrollTop) > 1) { m.scrollTop = t; requestAnimationFrame(() => requestAnimationFrame(() => fix(n - 1))); } };
    const settle = () => requestAnimationFrame(() => requestAnimationFrame(() => fix(3)));   // content-visibility da su alto a las regiones al fotograma siguiente
    if (now) requestAnimationFrame(() => { m.scrollTo({ top: tg(), behavior: "auto" }); settle(); });
    else {                                                              // si el scroll suave no mueve nada no hay scrollend: el listener se quitaba nunca y devolvia al capitulo mas tarde
      if (m._jt) m.removeEventListener("scrollend", m._jt); m._jt = settle;
      m.addEventListener("scrollend", settle, { once: true }); setTimeout(() => { m.removeEventListener("scrollend", settle); if (m._jt === settle) m._jt = null; }, 1500);
      m.scrollTo({ top: tg(), behavior: "smooth" });
    }
  }
  /* pulsas tarjetas bloqueadas: a la 3.a, la cerradura es suya */
  function openCard(id, src) {
    if (E[id] && !U(id)) {
      ui.lockN++;
      if (ui.lockN >= 3) setTimeout(() => { const k = document.querySelector("#codex .cx-big .cx-bk .ic.q"), S2 = A.core && A.core.S;
        if (k && !((S2 && S2.reduce) || matchMedia("(prefers-reduced-motion: reduce)").matches)) k.animate([{ transform: "none" }, { transform: "rotate(-12deg)" }, { transform: "rotate(10deg)" }, { transform: "rotate(-6deg)" }, { transform: "none" }], { duration: 420 });
        if (A.dealer && A.dealer.codexLock) A.dealer.codexLock(ui.lockN); }, 150);
    }
    go({ k: "detail", id }, false, src);
  }
  /* anterior / siguiente dentro del mismo pais (o del mismo oceano) */
  function step(d) {
    const v = ui.view, g = v.k === "detail" && index().gs[E[v.id].g]; if (!g) return;
    const list = g.all, i = list.indexOf(v.id); if (i < 0 || list.length < 2) return;
    ui.view = { k: "detail", id: list[(i + d + list.length) % list.length] }; render(); A.sfx.card();
  }

  /* ---------------- pintar ---------------- */
  function render() {
    const v = ui.view, m = $("cxMain");
    ui.cur = v.k === "detail" ? v.id : null;
    navSync(); crumbSync();
    if (io) io.disconnect();
    pump.q = []; pump.inline = 0; pump.tok++; cancelAnimationFrame(pump.raf); pump.raf = 0; pump.fr = null;
    pump.want = v.anc && v.anc.startsWith("d:") ? v.anc.slice(2) : null;
    $("cxLight").classList.add("hidden");                              // el visor HD nunca se queda encima de otra pagina
    if (v.k === "search") { ui.q = v.q || ""; if ($("cxSearch").value !== (v.raw || "")) $("cxSearch").value = v.raw || ""; } else if (ui.q || $("cxSearch").value) { ui.q = ""; $("cxSearch").value = ""; }
    m.className = "cx-main v-" + v.k;
    const sh = $("codex").querySelector(".cx-shell"), stage = !!STAGE_V[v.k] && stageFits();
    sh.dataset.v = v.k; sh.classList.toggle("stage", stage); $("codex").classList.toggle("dim", !stage);
    if (A.coverMap) A.coverMap("codex", !stage, () => isOpen() && !stageOn());               // tapado: el mapa deja de dibujarse; con la mesa a la vista, vivo
    $("cxLeg").innerHTML = stage && (v.k === "home" || v.k === "cont") ? legendHTML() : "";
    if (!stage) $("cxTip").classList.add("hidden");
    m.innerHTML = v.k === "home" ? pageHome() : v.k === "cont" ? pageCont(v.c) : v.k === "group" ? pageGroup(v.g) : v.k === "detail" ? pageDetail(v.id) : v.k === "refine" ? pageRefine() : pageSearch();
    restoreTop(m, v);
    if (!m.contains(document.activeElement) && !$("codex").contains(document.activeElement)) $("codex").focus({ preventScroll: true });
    after(v);
  }
  function navSync() {
    const all = sumStats(index().regs.flatMap(r => r.groups)), cur = ui.view, top = trail(cur)[1] || cur;
    const on = x => (cur.k === "home" && x === "home") || (top.k === "cont" && x === "cont:" + top.c) || (cur.k === "refine" && x === "refine");
    const item = (go2, ic, name, s, extra = "", badge = true) => `<button type="button" class="cx-nv${on(go2) ? " on" : ""}${s && s.u >= s.t ? " full" : ""}" data-go="${go2}"><span class="cx-nvi">${A.icon(ic)}${badge && s && s.nw ? `<em data-tt="${esc(P(S.newN).replace("{n}", A.fmt(s.nw)))}">${s.nw > 99 ? "99+" : s.nw}</em>` : ""}</span><b>${esc(name)}</b><i>${extra || (s ? pctOf(s) + " %" : "")}</i>${s ? mbar(s) : ""}</button>`;
    $("cxNav").innerHTML = item("home", "worldmap", P(S.home), all, "", false)
      + `<hr>` + CONTS.map(c => item("cont:" + c, "k_" + c, contName(c), sumStats(contGroups(c)))).join("")
      + `<hr>` + item("refine", "a_target", P(S.refine), null, A.fmt(refineN()));
  }

  /* --- Resumen --- */
  function medalTotals() {
    const m = [0, 0, 0], n = { t: 0 };
    order.forEach(id => { const e = E[id]; if (e.parent || !tiered(id) || e.type === "country") return; n.t++; const k = medOf(id); for (let i = 0; i < k; i++) m[i]++; });   // los lugares (los paises tienen su chip)
    return { m, t: n.t };
  }
  function pageHome() {
    const st = stats(), mt = medalTotals(), by = byType(), c = t => by[t] || [0, 0];
    const chip = (ic, name, a, b) => `<span class="cx-chip2">${A.icon(ic)}<b>${esc(name)}</b><em>${A.fmt(a)}<i>/${A.fmt(b)}</i></em></span>`;
    const ev = [c("battle")[0] + c("event")[0], c("battle")[1] + c("event")[1]];
    const pct = st.t ? (st.u >= st.t ? 100 : Math.floor(1000 * st.u / st.t) / 10) : 0;
    return `<section class="cx-sum">
        <div class="cx-sum-l"><span class="cx-k">${esc(P(S.mine))}</span><b>${A.fmt1 ? A.fmt1(pct) : pct}<i>%</i></b><em>${esc(P(S.prog).replace("{a}", A.fmt(st.u)).replace("{b}", A.fmt(st.t)))}</em><span class="cx-bar"><s style="width:${100 * st.u / Math.max(1, st.t)}%"></s></span></div>
        <div class="cx-sum-m">${[0, 1, 2].map(i => `<div class="cx-medal ${MED[i]}" data-tt="${esc(P(S[MED[i]]) + " · " + P(S.within).replace("{km}", kmTxt(LIM[i])) + "\n" + [P(S.m1), A.t("codex.tierh"), A.t("codex.tierk")][i])}">${medal(i, mt.m[i] > 0)}<b>${A.fmt(mt.m[i])}<i>/${A.fmt(mt.t)}</i></b><span>${esc([P(S.m1), A.t("codex.tierh"), A.t("codex.tierk")][i])}</span><em>&lt; ${esc(kmTxt(LIM[i]))}</em></div>`).join("")}</div>
        <div class="cx-sum-c">${chip("t_country", P(S.countries), c("country")[0], c("country")[1])}${chip("t_person", P(SECS[4].n), c("person")[0], c("person")[1])}${chip("t_battle", P(SECS[3].n), ev[0], ev[1])}${chip("t_curio", P(SECS[5].n), c("curiosity")[0], c("curiosity")[1])}</div>
      </section>
`;
  }
  const legendHTML = () => `<span><i class="l0"></i>${esc(P(S.lockL))}</span><span><i class="l1"></i><i class="l2"></i><i class="l3"></i>${esc(P(S.started))}</span><span><i class="l4"></i>${esc(P(S.full))}</span><em>${esc(P(S.mapHint))}</em>`;

  /* --- Continente: familias de paises --- */
  function pageCont(c) {
    const regs = index().regs.filter(r => r.cont === c && r.groups.length), st = sumStats(regs.flatMap(r => r.groups)), sea = c === "sea";
    const head = `<header class="cx-ch${sea ? " sea" : ""}">
        <div class="cx-ch-l"><div class="cx-ch-t">${A.icon("k_" + c, "cx-kic")}<div><h2>${esc(contName(c))}</h2><p>${esc(sea ? placesTxt(st) : P(S.nCountries).replace("{n}", regs.reduce((a, r) => a + r.groups.filter(g => g.ne || g.qc).length, 0)) + " · " + placesTxt(st))}</p></div><em class="cx-pct">${pctOf(st)} %</em></div>
          ${medCounts(st, scaleOf(regs.flatMap(r => r.groups)))}${mbar(st)}
          <div class="cx-jumps">${regs.map(r => { const s = sumStats(r.groups); return `<button type="button" class="cx-jump${s.u >= s.t ? " full" : ""}" data-jump="${r.id}"><b>${esc(regName(r))}</b><em>${pctOf(s)} %</em></button>`; }).join("")}</div></div>
      </header>`;
    return head + regs.map(r => {
      const s = sumStats(r.groups), n = r.groups.filter(g => g.ne || g.qc).length;
      return `<section class="cx-reg" id="cxr-${r.id}"><header class="cx-rh"><div><b>${esc(regName(r))}</b><i>${esc((n ? P(S.nCountries).replace("{n}", n) + " · " : "") + placesTxt(s))}</i></div><span class="cx-rh-r"><em>${pctOf(s)} %</em>${mbar(s)}</span></header>
        ${r.groups.map(g => (g.sea ? grid(g.all) : "")).join("")}
        ${r.groups.some(g => !g.sea) ? `<div class="cx-tiles">${r.groups.filter(g => !g.sea).map(tileHTML).join("")}</div>` : ""}</section>`;
    }).join("");
  }
  function tileHTML(g) {
    const s = gStats(g), known = gKnown(g), full = s.u >= s.t;
    return `<button type="button" class="cx-ct${known ? "" : " unk"}${full ? " full" : ""}" data-go="g:${esc(g.key)}" data-tf="cxTile">
      <span class="cx-ct-f">${known ? (g.ne ? flagImg(g.ne) : A.icon("t_country")) : g.ne ? `<canvas class="cx-sil" data-ne="${esc(g.ne)}"></canvas>` : `<b>?</b>`}</span>
      <span class="cx-ct-t"><b${known ? fsAttr(gName(g), 21, 12.5) : ""}>${known ? esc(gName(g)) : "???"}</b><i>${esc(placesTxt(s))}</i></span>
      <em class="cx-ct-p">${pctOf(s)} %</em>${s.nw ? `<u>${s.nw > 99 ? "99+" : s.nw}</u>` : ""}${mbar(s)}</button>`;
  }
  function tileTip(key) {
    const g = index().gs[key]; if (!g) return "";
    const s = gStats(g), known = gKnown(g);
    return (known ? gName(g) : P(S.lockedC)) + "\n" + placesTxt(s) + " · " + pctOf(s) + " %\n" + [0, 1, 2].map(i => P(S[MED[i]]) + " " + s.m.slice(i + 1).reduce((a, b) => a + b, 0)).join(" · ");
  }

  /* --- Pais (o territorio, u oceano): sus lugares por secciones --- */
  function pageGroup(key) {
    const g = index().gs[key]; if (!g) return "";
    const s = gStats(g), known = gKnown(g), c = g.card, cm = c ? medOf(c) : 0;
    const flag = g.ne && known ? flagImg(g.ne) : g.ne ? `<canvas class="cx-sil big" data-ne="${esc(g.ne)}"></canvas>` : A.icon(g.sea ? "k_sea" : "t_country");
    const head = `<header class="cx-gh">
        <button type="button" class="cx-gh-f${known ? "" : " unk"}${c ? "" : " nofile"}" ${c ? `data-go="d:${esc(c)}"` : ""}>${flag}${c && tiered(c) ? pips(cm) : ""}</button>
        <div class="cx-gh-t"><p class="cx-tags"><span>${A.icon("k_" + g.reg.cont, "sm")}${esc(contName(g.reg.cont))}</span><span>${esc(regName(g.reg))}</span></p>
          <h2>${known ? esc(gName(g)) : "???"}</h2>
          <div class="cx-gh-s"><em class="cx-pct">${pctOf(s)} %</em><span>${esc(placesTxt(s))}</span>${medCounts(s, scaleOf([g]))}</div>${mbar(s)}
          ${known ? `<p class="cx-gh-d" id="cxGhd"></p>` : `<p class="cx-gh-d">${esc(P(S.lockedCHint).replace("{km}", kmTxt(300)))}</p>`}
          ${c && U(c) ? `<button type="button" class="gx-btn sm cx-readc" data-go="d:${esc(c)}">${A.icon("m_codex", "sm")}${esc(P(S.read))}${tiered(c) ? pips(cm) : ""}</button>` : ""}</div>
      </header>`;
    const secs = SECS.map((sec, i) => { const ids = g.all.filter(id => (SEC_OF[E[id].type] ?? 1) === i); return ids.length ? secHTML(sec, ids) : ""; }).join("");
    return head + secs;
  }
  function secHTML(sec, ids, sub) {
    const u = ids.filter(U).length;
    return `<section class="cx-sec2"><header class="cx-sh">${A.icon(sec.ic)}<b>${esc(P(sec.n))}</b><em>${A.fmt(u)}<i>/${A.fmt(ids.length)}</i></em></header>${grid(ids, sub)}</section>`;
  }
  /* rejilla de cartas: las primeras van en la pagina y el resto entra por tandas en los fotogramas siguientes (EE. UU. tiene 255 cartas
     y "Por afinar" puede pasar de mil: montarlas de golpe era un tiron largo en equipos modestos) */
  const pump = { q: [], inline: 0, raf: 0, tok: 0, fr: null, want: null };
  function grid(ids, sub) {
    let k = Math.max(0, Math.min(ids.length, 36 - pump.inline)); const n = pump.q.length;
    if (pump.want) { const j = ids.indexOf(pump.want); if (j >= 0) { k = Math.min(ids.length, Math.max(k, j + 13)); pump.want = null; } else if (pump.want) k = ids.length; }   // volver: todo hasta la carta de la que venias
    pump.inline += k;
    if (k < ids.length) pump.q.push({ n, ids: ids.slice(k), sub });
    return `<div class="cx-cards"${k < ids.length ? ` data-q="${n}"` : ""}>${ids.slice(0, k).map(id => cardHTML(id, sub && sub(id))).join("")}</div>`;
  }
  function pumpRun(tok) {
    pump.raf = 0; if (tok !== pump.tok) return;
    const m = $("cxMain"), t0 = performance.now();
    while (pump.q.length && performance.now() - t0 < 5) {
      const j = pump.q[0], el = m.querySelector(`.cx-cards[data-q="${j.n}"]`); if (!el) { pump.q.shift(); continue; }
      const part = j.ids.splice(0, 12); el.insertAdjacentHTML("beforeend", part.map(id => cardHTML(id, j.sub && j.sub(id))).join(""));
      for (let c = el.lastElementChild, i = 0; c && i < part.length; c = c.previousElementSibling, i++) if (c.classList.contains("open")) io.observe(c);
      if (!j.ids.length) pump.q.shift();
    }
    if (pump.q.length) pump.raf = requestAnimationFrame(() => pumpRun(tok));
    else { if (pump.anc) { pump.anc(); pump.anc = null; } const h = m.querySelector(":scope > .cx-hold"); if (h) h.remove(); requestAnimationFrame(() => m.classList.remove("cx-rst")); }
  }
  /* tamano de letra por la palabra mas larga (cirilico, mas ancho; CJK corta solo): "Вестминстерское" no se parte a media palabra */
  const fitFs = (nm, base, budget) => { let w = 0; for (const t of String(nm).split(/[\s\-‐–\/·,]+/)) { let v = 0; for (const ch of t) v += /[Ѐ-ӿ]/.test(ch) ? 1.6 : /[　-鿿가-힯]/.test(ch) ? 0 : 1; if (v > w) w = v; } return w > budget ? Math.max(Math.round(base * 0.7), Math.floor(base * budget / w)) : 0; };
  const fsAttr = (nm, base, budget) => { const f = fitFs(nm, base, budget); return f ? ` style="font-size:${f}px"` : ""; };
  function cardHTML(id, sub) {
    const e = E[id], un = U(id), tr = tiered(id), m = medOf(id), fr = un && (pump.fr ? idsOf(id).some(x => pump.fr.has(x)) : freshOf(id));
    return `<button type="button" class="cx-card ${un ? "open" : "locked"} ${tr ? "m" + m : un ? "mx" : "m0"}${fr ? " fresh" : ""}" data-go="d:${esc(id)}" data-id="${esc(id)}" data-tf="cxCard">
      <span class="cx-art">${un ? "" : `<span class="cx-bk">${iconSvg(e.type)}</span>`}</span>
      <span class="cx-pn"${un ? fsAttr(nameOf(e, memOf(id)), 18, 15.5) : ""}>${un ? esc(nameOf(e, memOf(id))) : "???"}</span>${sub ? `<span class="cx-sub">${esc(sub)}</span>` : ""}
      ${tr ? pips(m) : `<span class="cx-kind">${esc(typeLabel(e.type))}</span>`}${fr ? `<span class="cx-new">${esc(P(S.nueva))}</span>` : ""}</button>`;
  }
  function cardTip(id) {
    const e = E[id]; if (!e) return "";
    const head = (U(id) ? nameOf(e, memOf(id)) : P(S.lockL)) + "\n" + typeLabel(e.type);
    if (!tiered(id)) return head + (U(id) ? "" : "\n" + howTo(id));
    const L = limits(id);
    return head + "\n" + [0, 1, 2].map(i => `${P(S[MED[i]])} · ${P(S.within).replace("{km}", kmTxt(L[i]))}: ${U([id, id + "~h", id + "~k"][i]) ? P(S.got) : P(S.miss)}`).join("\n");
  }
  /* como se consigue una tarjeta suelta (personaje, suceso, curiosidad): los lugares que la desbloquean, si ya los conoces */
  function howTo(id) {
    const e = E[id];
    const cls = e.src === "classic" ? P(S.classic).replace("{m}", A.t("mode.classic")).replace("{km}", kmTxt(300)) : "";
    const trig = (e.triggers || []).filter(t => E[t]);
    if (!trig.length) return cls || A.t("codex.hint.chain");
    const li = e.type === "event" || e.type === "battle" ? 1 : 2;      // como lateral() en codexUnlock: sucesos a plata, el resto a oro
    const km = kmTxt(Math.min(...trig.map(t => A.codexLimits({ id: t })[li])));   // mares y naturaleza: el doble
    const names = trig.map(t => (U(t) ? nameOf(E[t], memOf(t)) : "???")), shown = [...new Set(names)].slice(0, 4);
    const ch = P(S.chainBy).replace("{km}", km).replace("{list}", shown.join(", ") + (trig.length > 4 ? "…" : ""));
    return cls ? ch + " " + cls : ch;
  }

  /* --- Por afinar --- */
  function refineList() {
    const two = [], one = [], ctry = [], gs = index().gs;
    const rk = new Map(); index().regs.forEach((r, i) => r.groups.forEach((g, j) => rk.set(g.key, i * 1000 + j)));
    const rank = id => rk.get(E[id].g) ?? 1e9;
    order.forEach(id => {
      const e = E[id]; if (e.parent || !tiered(id) || !U(id)) return; const m = medOf(id); if (m >= 3) return;
      (e.type === "country" ? ctry : m === 2 ? two : one).push(id);
    });
    const by = (a, b) => rank(a) - rank(b) || (fame[a] ?? 999) - (fame[b] ?? 999);
    two.sort(by); one.sort(by); ctry.sort(by);
    return { two, one, ctry };
  }
  function pageRefine() {
    const rf = refineList(), gs = index().gs, sub = id => { const g = gs[E[id].g]; return g && !g.sea ? gName(g) : g ? regName(g.reg) : ""; };
    /* cada medalla, repartida por continentes: se ve donde te falta afinar mas */
    const byCont = ids => CONTS.map(c => [c, ids.filter(id => { const g = gs[E[id].g]; return g && g.reg.cont === c; })]).filter(x => x[1].length);
    const sec = (ic, name, ids, note) => ids.length ? `<section class="cx-sec3"><header class="cx-sh">${A.icon(ic)}<b>${esc(name)}</b><em>${A.fmt(ids.length)}</em></header>${note ? `<p class="cx-note">${esc(note)}</p>` : ""}
      ${byCont(ids).map(([c, l]) => `<div class="cx-sub2"><h4>${A.icon("k_" + c)}<b>${esc(contName(c))}</b><em>${A.fmt(l.length)}</em></h4>${grid(l, sub)}</div>`).join("")}</section>` : "";
    const any = rf.two.length + rf.one.length + rf.ctry.length, known = any || order.some(id => !E[id].parent && tiered(id) && U(id));
    return `<header class="cx-ph-h">${A.icon("a_target", "cx-kic")}<div><h2>${esc(P(S.refine))}</h2><p>${esc(any ? P(S.refineIntro) : known ? P(S.refineEmpty) : A.t("codex.empty"))}</p></div></header>`
      + sec("medal_gold", P(S.two), rf.two) + sec("medal_silver", P(S.one), rf.one) + sec("t_country", P(S.ctry), rf.ctry, P(S.refineCtry));
  }

  /* --- Buscar (solo en lo descubierto) --- */
  function pageSearch() {
    const q = ui.q, gs = index().gs, hits = [];
    order.forEach(id => { const e = E[id]; if (e.parent || !U(id)) return; const rec = memOf(id); if (fold(nameOf(e, rec) + " " + e.name.en + " " + (e.name.es || "") + " " + (rec && rec.title || "")).includes(q)) hits.push(id); });
    const sub = id => { const g = gs[E[id].g]; return g && !g.sea && E[id].type !== "country" ? gName(g) : g ? regName(g.reg) : ""; };
    return `<header class="cx-ph-h">${A.icon("lens", "cx-kic")}<div><h2>${esc(P(S.results).replace("{n}", A.fmt(hits.length)))}</h2>${hits.length ? "" : `<p>${esc(P(S.noRes))}</p>`}</div></header>`
      + (hits.length ? grid(hits.slice(0, 240), sub) : "");
  }

  /* --- La carta: ficha, historia y dato clave --- */
  function relatedOf(e) {
    const ids = new Set();
    (e.triggers || []).forEach(t => { if (E[t]) ids.add(E[t].parent || t); });
    (chain[e.id] || []).forEach(x => ids.add(x));
    if (e.country && E["c:" + e.country]) ids.add("c:" + e.country);
    ids.delete(e.id); return [...ids].slice(0, 14);
  }
  function pageDetail(id) {
    const e = E[id]; if (!e) return "";
    const un = U(id), rec = un ? memOf(id) : null, tr = tiered(id), m = medOf(id), L = limits(id), g = index().gs[e.g];
    const rel = relatedOf(e).map(x => { const o = E[x], u = U(x); return `<button class="cx-rel ${u ? "" : "lk"}" data-go="d:${esc(x)}" type="button">${relIcon(o, u)}<span>${u ? esc(nameOf(o, memOf(x))) : "???"}</span>${tiered(x) ? pips(medOf(x)) : ""}</button>`; }).join("");
    const where = g ? (g.sea ? regName(g.reg) : gKnown(g) ? gName(g) : "???") : "";
    const nav = g && g.all.length > 1 && g.all.includes(id) ? `<span class="cx-steps"><button type="button" class="gx-btn gho sm cx-step" data-step="-1" aria-label="${esc(P(S.prev))}">‹</button><em>${g.all.indexOf(id) + 1} / ${g.all.length}</em><button type="button" class="gx-btn gho sm cx-step" data-step="1" aria-label="${esc(P(S.next))}">›</button></span>` : "";
    const chaps = tr ? [0, 1, 2].map(i => { const has = U([id, id + "~h", id + "~k"][i]);
        return `<section class="cx-chap ${MED[i]}${has ? " on" : ""}" id="cxch${i + 1}"><h3>${medal(i, has)}<b>${esc(i ? A.t(i === 1 ? "codex.tierh" : "codex.tierk") : P(e.type === "country" ? S.chap1c : S.chap1))}</b><em>&lt; ${esc(kmTxt(L[i]))}</em></h3>
          <div class="cx-chb">${has ? `<p class="cx-load">${esc(A.T("Cargando…", "Loading…"))}</p>` : `<p class="cx-lockl">${A.icon("lock", "sm")}${esc(A.core && A.core.S && A.core.S.units === "mi" ? A.t("codex.hint.tier").replace(/\{km\}\s*(?:km|公里|км)/, A.fmtDist(L[i])) : A.t("codex.hint.tier", { km: L[i] }))}</p>`}</div></section>`; }).join("")
      : `<section class="cx-chap single${un ? " on" : ""}" id="cxch1"><h3>${iconSvg(e.type)}<b>${esc(A.t("codex.about"))}</b></h3><div class="cx-chb">${un ? `<p class="cx-load">${esc(A.T("Cargando…", "Loading…"))}</p>` : `<p class="cx-lockl">${A.icon("lock", "sm")}${esc(howTo(id))}</p>`}</div></section>`;
    const live = stageFits();                                          // con la mesa a la vista, el lugar sale en el mapa del juego; si no, en su miniatura
    return `<div class="cx-d1">
        <div class="cx-dtop"><div class="cx-d-card">
          <div class="cx-big ${un ? "open" : "locked"} ${tr ? "m" + m : un ? "mx" : "m0"}">
            <div class="cx-art${rec && rec.img && rec.img.flag ? " flag" : ""}">${un ? `${rec && !rec.none && !rec.img ? iconSvg(e.type) : ""}${rec && rec.img ? `<img id="cxHero" class="${photo(rec.img.card)}" alt="" src="${esc(rec.img.card)}" decoding="async" data-light><button class="cx-hd" type="button" data-light ${A.ttAttr(A.t("codex.hd"))}>${A.icon("a_lens")}</button>` : ""}` : `<span class="cx-bk">${iconSvg(e.type)}${A.icon("lock", "q")}</span>`}</div>
            <div class="cx-cap"><span class="cx-pn">${un ? esc(nameOf(e, rec)) : esc(A.t("codex.locked"))}</span><span class="cx-mt"><em>${esc(typeLabel(e.type))}</em>${tr ? pips(m) : ""}</span></div><span class="cx-foil"></span>
          </div>
          ${tr ? `<div class="cx-dmeds">${[0, 1, 2].map(i => `<span data-tt="${esc(P(S[MED[i]]) + " · " + P(S.within).replace("{km}", kmTxt(L[i])) + "\n" + (m > i ? P(S.got) : P(S.miss)))}">${medal(i, m > i)}<em>&lt; ${esc(kmTxt(L[i]))}</em></span>`).join("")}</div>` : ""}
        </div>
        <div class="cx-dinfo">
          <div class="cx-d-top"><p class="cx-tags"><span>${esc(typeLabel(e.type))}</span>${g ? `<span>${g.ne && gKnown(g) && hasFlag(g.ne) ? `<img class="cx-tflag" alt="" src="${esc(flagSrc(g.ne))}">` : A.icon("k_" + g.reg.cont, "sm")}${esc(where)}</span><span>${esc(regName(g.reg))}</span>` : ""}</p>${nav}</div>
          <h2>${un ? esc(nameOf(e, rec)) : "???"}</h2>
          ${un && rec && rec.desc ? `<p class="cx-desc">${esc(cap(rec.desc))}</p>` : ""}
          ${un && A.tx(e.fact) ? `<blockquote class="cx-fact">${esc(A.tx(e.fact))}</blockquote>` : ""}
          ${rec && rec.img && rec.credit ? `<p class="cx-credit">${esc(A.t("codex.photo"))}: ${rec.credit.artist ? esc(rec.credit.artist) + " · " : ""}<a href="${esc(rec.credit.page)}" target="_blank" rel="noopener">${esc(rec.credit.license || "Wikimedia Commons")}</a></p>` : ""}
        </div></div>
        <div class="cx-d-body">
          ${chaps}
          ${un ? `<p class="cx-src" id="cxSrc"></p>` : ""}
          ${rel ? `<div class="cx-sec"><h3>${esc(A.t("codex.related"))}</h3><div class="cx-rels">${rel}</div></div>` : ""}
          ${un && e.lat != null && e.type !== "country" ? `<div class="cx-sec"><h3>${esc(A.t("codex.location"))}</h3>${live ? "" : `<canvas id="cxMini" class="cx-mini"></canvas>`}<p class="cx-coord">${A.icon("a_pin", "sm")}${Math.abs(e.lat).toFixed(2)}°${e.lat >= 0 ? "N" : "S"}  ${Math.abs(e.lon).toFixed(2)}°${e.lon >= 0 ? "E" : "W"}</p></div>` : ""}
        </div>
      </div>`;
  }
  async function fillText(id) {
    const e = E[id]; let rec;
    try { rec = await loadContent(e, A.wlang()); } catch (x) { rec = null; }
    if (ui.cur !== id || !$("cxch1")) return;
    const par = t => String(t || "").split(/\n{2,}|\n/).filter(x => x.trim()).map(x => `<p>${x.replace(/</g, "&lt;")}</p>`).join("");
    const box = i => { const s = $("cxch" + i); return s && s.classList.contains("on") ? s.querySelector(".cx-chb") : null; };
    if (!rec || rec.none) { [1, 2, 3].forEach(i => { const b = box(i); if (b) b.innerHTML = `<p class="cx-load err">${esc(A.t("codex.nodesc"))}</p>`; }); return; }
    const T = tiers(rec);
    const fig = k => { const f = rec.tierImg && rec.tierImg[k]; if (!f) return "";              // la foto de ese capitulo, a la derecha del texto; clic = HD
      const c = f.credit ? `<figcaption>${esc(A.t("codex.photo"))}: ${f.credit.artist ? esc(f.credit.artist) + " · " : ""}<a href="${esc(f.credit.page)}" target="_blank" rel="noopener">${esc(f.credit.license || "Wikimedia Commons")}</a></figcaption>` : "";
      return `<figure class="cx-fig"><button type="button" class="cx-figb" data-light="${k}" ${A.ttAttr(A.t("codex.hd"))}><img class="cx-photo" alt="" src="${esc(f.card)}" decoding="async"><span class="cx-hd">${A.icon("a_lens")}</span></button>${c}</figure>`; };
    if (tiered(id)) { [T.intro || rec.extract, T.hist, T.key].forEach((t, i) => { const b = box(i + 1); if (b) b.innerHTML = (i ? fig(i === 1 ? "h" : "k") : "") + (par(t) || `<p class="cx-load err">${esc(A.t("codex.nodesc"))}</p>`); }); }
    else { const b = box(1); if (b) b.innerHTML = par(T.intro || rec.extract) + (T.hist ? `<h4>${esc(A.t("codex.tierh"))}</h4>${par(T.hist)}` : ""); }
    const ttr = rec.tierTr && (rec.tierTr.h || rec.tierTr.k);                // algun tier se tradujo a mano: se acredita y enlaza el original
    if ($("cxSrc")) $("cxSrc").innerHTML = `${esc(A.t(rec.tr || ttr ? "codex.license.tr" : "codex.license"))} · <a href="${esc((ttr && ttr.url) || rec.url || "#")}" target="_blank" rel="noopener">${esc(A.t("codex.wiki"))} ↗</a>`;
    if (rec.img && !$("cxHero") && U(id)) { const top = $("cxMain").scrollTop; render(); $("cxMain").scrollTop = top; return; }
    if (ui.view.ch) { const s = $("cxch" + ui.view.ch); ui.view.ch = 0; if (s) requestAnimationFrame(() => s.scrollIntoView({ block: "start", behavior: "smooth" })); }
  }
  /* 3 textos a partir del articulo del lugar: generico (descripcion + inicio), historia y dato clave (el resto del texto de cabecera).
     tools/codex-tiers.mjs copia este recorte: si cambia aqui, cambiarlo alli */
  const tierMem = new WeakMap();
  const dangling = t => /[:：]\s*$/.test(t);                          // "...dijo:" o "son los siguientes:" sin la cita ni la lista que venian detras
  const undangle = t => { const ls = String(t || "").split("\n"); while (ls.length > 1 && dangling(ls[ls.length - 1])) ls.pop(); return ls.length === 1 && dangling(ls[0]) ? "" : ls.join("\n"); };
  function tiers(rec) {
    let T = tierMem.get(rec); if (!T) { T = tiers0(rec); T = { intro: undangle(T.intro) || T.intro, hist: undangle(T.hist), key: undangle(T.key) }; tierMem.set(rec, T); }
    return T;
  }
  function tiers0(rec) {
    const sents = A.sentences(A.cleanText(rec.extract)), hist = A.cleanText(rec.history).split(/\n+/).filter(x => x.trim());
    while (sents.length > 1 && dangling(sents[sents.length - 1])) sents.pop();
    const J = /^(zh|ja)$/.test(rec.lang) ? "" : " ";                  // chino y japones: las frases van pegadas, sin espacio
    let n = 0, len = 0; while (n < sents.length && (n < 2 || len < 200) && n < 3) len += sents[n++].length;
    const intro = sents.slice(0, n).join(J), rest = sents.slice(n);
    if (rec.key) return { intro: intro || A.cleanText(rec.extract), hist: hist.join("\n"), key: A.cleanText(rec.key) };   // tiers propios (r[5]): sin recortes
    let histP = hist, key = rest.join(J);
    if (key.length < 90 && hist.length > 1) { const h = Math.ceil(hist.length / 2); histP = hist.slice(0, h); key = (key ? key + "\n" : "") + hist.slice(h).join("\n"); }   // extractos muy cortos: la historia se reparte
    if (!histP.length && rest.length > 2) { const h = Math.ceil(rest.length / 2); histP = [rest.slice(0, h).join(J)]; key = rest.slice(h).join(J); }
    return { intro: intro || A.cleanText(rec.extract), hist: histP.join("\n"), key };
  }
  function lightbox(id, k) {                                          // k = "h" / "k": la foto de la Historia o del Dato clave; vacio = la de la carta
    const rec = memOf(id), L = $("cxLight"), ti = k && rec && rec.tierImg && rec.tierImg[k];
    const img = ti || (rec && rec.img), cr = ti ? ti.credit : rec && rec.credit; if (!img) return;
    L.innerHTML = `<img class="${photo(img.hd)}" alt="" src="${esc(img.hd)}"><button type="button" class="cx-lx" aria-label="${esc(A.t("codex.close"))}">${A.icon("u_close")}</button><p>${cr ? esc((cr.artist ? cr.artist + " · " : "") + (cr.license || "")) : ""}</p>`;
    const im = L.querySelector("img"); im.onerror = () => { im.onerror = null; im.src = img.card; };   // build de Steam "ligero"/demo sin fotos HD: se ve la tarjeta
    L.classList.remove("hidden"); L.onclick = () => L.classList.add("hidden"); A.sfx.card();
  }

  /* ---------------- despues de pintar: fotos perezosas, siluetas, mapas ---------------- */
  let io = null;
  function after(v) {
    const m = $("cxMain");
    if (v.k === "detail") A.genFill(m);
    io = new IntersectionObserver(en => en.forEach(x => { if (!x.isIntersecting) return; io.unobserve(x.target); if (x.target.tagName === "CANVAS") silQ(x.target); else paintThumb(x.target.dataset.id, x.target); }), { root: m, rootMargin: "400px" });
    m.querySelectorAll(".cx-card.open, canvas.cx-sil").forEach(n => io.observe(n));
    if (pump.q.length) { const tok = pump.tok; pump.raf = requestAnimationFrame(() => pumpRun(tok)); }
    if (stageOn()) { const tok = pump.tok; requestAnimationFrame(() => { if (tok === pump.tok) frameMap(v, v.k === "home" && !ui.flown ? 0 : 900); ui.flown = true; }); }   // al fotograma siguiente: el primero solo pinta la pagina
    if (v.k === "detail") {
      const e = E[v.id];
      if (U(v.id)) {
        let ch = 0; idsOf(v.id).forEach(x => { if (U(x) && !store.seen[x]) { store.seen[x] = 1; ch = 1; } }); if (ch) { save(); dirty(); }          // solo lo desbloqueado: mirar una bloqueada no gasta su "Nueva"
        fillText(v.id);
        if (!stageOn() && e.lat != null && map && $("cxMini")) setTimeout(() => requestAnimationFrame(() => { const cv = $("cxMini"); if (cv && ui.cur === v.id) try { map.drawThumb(cv, { lat: e.lat, lon: e.lon, zoom: e.type === "water" ? 3.5 : 9 }); } catch (x) { /* sin miniatura */ } }), 140);
      }
    }
    if (v.k === "group") {
      const g = index().gs[v.g];
      if (g) { let ch = 0; pump.fr = new Set(); [g.card, ...g.all].forEach(id => id && idsOf(id).forEach(x => { if (U(x) && !store.seen[x]) { pump.fr.add(x); store.seen[x] = 1; ch = 1; } })); if (ch) { save(); dirty(); } }   // lo que ves en la pagina del pais deja de ser "Nueva" (esta vez aun se marca)
      if (g && g.card && U(g.card)) loadContent(E[g.card], A.wlang()).then(rec => { const d = $("cxGhd"); if (d && ui.view.k === "group" && ui.view.g === v.g && rec && !rec.none) d.textContent = cap(rec.desc) || A.sentences(A.cleanText(rec.extract)).slice(0, 2).join(/^(zh|ja)$/.test(rec.lang) ? "" : " "); }).catch(() => {});
    }
  }
  async function paintThumb(id, b) {
    b = b || ($("cxMain") && $("cxMain").querySelector(`.cx-card[data-id="${CSS.escape(id)}"]`)); if (!b || !U(id)) return;
    try {
      const rec = await loadContent(E[id], A.wlang()); if (rec.none) return noPic(b); if (!b.isConnected) return;
      const pn = b.querySelector(".cx-pn"), nm = nameOf(E[id], rec); if (pn.textContent !== nm) { pn.textContent = nm; const f = fitFs(nm, 18, 15.5); pn.style.fontSize = f ? f + "px" : ""; }
      if (!rec.img) noPic(b);
      if (rec.img && !b.querySelector(".cx-art img.cx-th")) {
        const im = new Image(), th = thumbOf(id, rec); im.decoding = "async"; im.alt = ""; im.className = "cx-th " + photo(rec.img.thumb);
        const dec = () => (im.decode ? im.decode() : Promise.resolve());
        im.src = th; dec().catch(() => { if (im.src.endsWith(rec.img.thumb) || th === rec.img.thumb) throw 0; im.src = rec.img.thumb; return dec(); }).then(() => thumbIn(b, im, rec.img.flag), () => {});
      }
    } catch (x) { noPic(b); }   // sin datos: el icono
  }
  /* el icono de la categoria solo cuando de verdad no hay foto: nunca de relleno mientras carga */
  const noPic = b => { const art = b && b.querySelector(".cx-art"); if (art && !art.firstChild) art.innerHTML = iconSvg(E[b.dataset.id] ? E[b.dataset.id].type : ""); };
  /* miniatura de 320 px (tools/wiki-thumbs.py) para las cartas pequenas; si falta, la de 960 px */
  const thumbOf = (id, rec) => (rec.img && /assets\/wiki\/card\//.test(rec.img.thumb) ? A.media(`assets/wiki/th/${A.mediaKey((E[id] && E[id].parent) || id)}.webp`) : rec.img.thumb);
  /* las fotos de las cartas entran por tandas, una vez decodificadas, sin forzar el recalculo de la pagina (A.revealImg hace dos por tanda:
     con cientos de cartas, tirones). El empujon de capa (translateZ y fuera al fotograma siguiente) evita las fotos "fantasma" de Electron */
  let thQ = null;
  function thumbIn(b, im, flag) {
    if (!thQ) { thQ = []; requestAnimationFrame(() => { const q = thQ; thQ = null;
      q.forEach(([b2, im2, f2]) => { if (!b2.isConnected) return; const art = b2.querySelector(".cx-art"); art.classList.toggle("flag", !!f2); im2.style.transform = "translateZ(0)"; art.appendChild(im2); b2.classList.add("has-img"); });
      requestAnimationFrame(() => q.forEach(([, im2]) => (im2.style.transform = ""))); }); }
    thQ.push([b, im, flag]);
  }
  /* siluetas de los paises sin descubrir (para aprender su forma antes que su nombre); unas pocas por fotograma */
  const silQueue = []; let silT = 0;
  const silQ = cv => { silQueue.push(cv); if (!silT) silT = requestAnimationFrame(silRun); };
  function silRun() {
    silT = 0; const t0 = performance.now();
    while (silQueue.length && performance.now() - t0 < 4) { const cv = silQueue.shift(); if (cv.isConnected) drawSil(cv, cv.dataset.ne); }
    if (silQueue.length) silT = requestAnimationFrame(silRun);
  }
  function drawSil(cv, ne) {
    const f = world.byName[ne]; if (!f) return;
    let big = f.polys[0], ba = -1; f.polys.forEach(p => { const a = (p.bbox[2] - p.bbox[0]) * (p.bbox[3] - p.bbox[1]); if (a > ba) { ba = a; big = p; } });
    let [a0, b0, a1, b1] = big.bbox; const cx = (a0 + a1) / 2, cy = (b0 + b1) / 2, rad = Math.max(a1 - a0, b1 - b0) * 0.9 + 1.5;
    f.polys.forEach(p => { const px = (p.bbox[0] + p.bbox[2]) / 2, py = (p.bbox[1] + p.bbox[3]) / 2; if (Math.abs(px - cx) < rad && Math.abs(py - cy) < rad) { a0 = Math.min(a0, p.bbox[0]); b0 = Math.min(b0, p.bbox[1]); a1 = Math.max(a1, p.bbox[2]); b1 = Math.max(b1, p.bbox[3]); } });
    const W = cv.width = cv.classList.contains("big") ? 96 : 48, H = cv.height = cv.classList.contains("big") ? 64 : 32, c = cv.getContext("2d");
    if (Math.max(a1 - a0, b1 - b0) < 1.2) { cv.parentElement.classList.add("q"); return; }      // microestados: no se reconoce la forma (sale la interrogacion)
    const [x0, y0] = A.geo.project(a0, b0), [x1, y1] = A.geo.project(a1, b1), pad = 3, k = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0));
    c.setTransform(k, 0, 0, -k, W / 2 - (x0 + x1) / 2 * k, H / 2 + (y0 + y1) / 2 * k);
    c.fillStyle = "#6fdcbf"; c.fill(f.path);
  }

  /* ---------------- el mapa: EL MISMO del juego (js/map.js), detras de la Enciclopedia ----------------
     A la derecha queda la mesa a la vista: se arrastra y se acerca con la rueda o con +/- como en una partida. La Enciclopedia solo le dice
     a donde mirar (mundo, continente, pais o lugar), tine cada pais con lo que llevas (map.setPaint) y resalta el que senalas. Al cerrar,
     el mapa vuelve a como estaba. Por afinar y Buscar lo tapan (y el mapa se congela: A.coverMap) */
  const BOX = { world: [-168, -42, 192, 74], eu: [-25, 34, 45, 71.5], as: [26, -11, 148, 55], af: [-26, -36, 58, 38], na: [-170, 6, -50, 80], sa: [-84, -56, -33, 13], oc: [110, -48, 190, 2], sea: [-168, -60, 192, 75] };
  const TINT = { lock: [0.03, 0.08, 0.06, 0.6], full: [0.97, 0.7, 0.26, 0.8], ramp: p => [0.12, 0.72, 0.64, 0.28 + 0.4 * p] };
  const STAGE_V = { home: 1, cont: 1, group: 1, detail: 1 };
  let paintMem = null, mapSaved = null, mapCtx = { hi: null }, ptr = null;
  const stageOn = () => isOpen() && !!$("codex").querySelector(".cx-shell.stage");
  /* solo desde la portada: abierta en plena partida (desde el aviso de tarjeta nueva) no se toca su mapa (camara, chinchetas, retos que mueven continentes) */
  const atTitle = () => { const S2 = A.core && A.core.S; return !S2 || S2.phase === "title"; };
  const stageFits = () => !!map && !!map.fitPoints && atTitle() && innerWidth / (parseFloat(document.documentElement.style.getPropertyValue("--k")) || 1) >= 1180 && innerHeight >= 520;
  function paintOf() {
    if (paintMem && paintMem.v === statVer) return paintMem.p;
    const p = {}, gs = index().gs;
    for (const f of world.features) if (f.name !== "Antarctica") p[f.name] = TINT.lock;       // sin descubrir (y lo que no esta en la Enciclopedia), en penumbra
    for (const key in gs) { const g = gs[key]; if (!g.ne) continue; const s = gStats(g); if (s.u) p[g.ne] = s.u >= s.t ? TINT.full : TINT.ramp(s.u / s.t); }
    paintMem = { v: statVer, p }; return p;
  }
  /* caja de un pais: su poligono mayor y los cercanos (Francia sin la Guayana, EE. UU. sin Hawai...) */
  function boxOf(ne) {
    const f = world.byName[ne]; if (!f) return null;
    let big = f.polys[0], ba = -1; f.polys.forEach(p => { const a = (p.bbox[2] - p.bbox[0]) * (p.bbox[3] - p.bbox[1]); if (a > ba) { ba = a; big = p; } });
    let [a0, b0, a1, b1] = big.bbox; const cx = (a0 + a1) / 2, cy = (b0 + b1) / 2, rad = Math.max(a1 - a0, b1 - b0) * 0.9 + 1.5;
    f.polys.forEach(p => { const px = (p.bbox[0] + p.bbox[2]) / 2, py = (p.bbox[1] + p.bbox[3]) / 2; if (Math.abs(px - cx) < rad && Math.abs(py - cy) < rad) { a0 = Math.min(a0, p.bbox[0]); b0 = Math.min(b0, p.bbox[1]); a1 = Math.max(a1, p.bbox[2]); b1 = Math.max(b1, p.bbox[3]); } });
    return [a0, b0, a1, b1];
  }
  const ptsAround = (lon, lat, d) => [[lon - d, lat - d * 0.7], [lon + d, lat + d * 0.7]];
  const grow = (b, k) => { const dx = Math.max(1.5, (b[2] - b[0]) * k), dy = Math.max(1, (b[3] - b[1]) * k); return [[b[0] - dx, b[1] - dy], [b[2] + dx, b[3] + dy]]; };
  /* encuadre y marcas de cada pagina. La chincheta del lugar solo sale si ya lo conoces (si no, el mapa delataria donde esta) */
  function frameMap(v, ms = 900) {
    if (!stageOn()) return;
    const st = $("cxStage").getBoundingClientRect(), pad = { l: st.left + 24, t: st.top + 24, r: Math.max(24, innerWidth - st.right + 24), b: Math.max(24, innerHeight - st.bottom + 24) };
    const gs = index().gs, marks = {}; let pts = null;
    if (v.k === "home") pts = [[BOX.world[0], BOX.world[1]], [BOX.world[2], BOX.world[3]]];
    else if (v.k === "cont") { const b = BOX[v.c] || BOX.world; pts = [[b[0], b[1]], [b[2], b[3]]]; }
    else {
      const g = gs[v.k === "group" ? v.g : E[v.id] && E[v.id].g], e = v.k === "detail" && E[v.id];
      if (g && g.ne) { const b = boxOf(g.ne); if (b) pts = grow(b, 0.25); marks.highlight = g.ne; }
      if (e && U(v.id) && e.lat != null && e.type !== "country") { pts = ptsAround(e.lon, e.lat, SCALE[e.type] ? 9 : 3.5); marks.answer = [e.lon, e.lat]; marks.label = nameOf(e, memOf(v.id)); }
      if (!pts && g) { const ll = g.all.map(id => E[id]).filter(x => x.lat != null); if (ll.length) { const lo = ll.map(x => x.lon), la = ll.map(x => x.lat); pts = grow([Math.min(...lo), Math.min(...la), Math.max(...lo), Math.max(...la)], 0.2); } }
      if (!pts) { const b = BOX[g ? g.reg.cont : "world"] || BOX.world; pts = [[b[0], b[1]], [b[2], b[3]]]; }
    }
    mapCtx = { hi: marks.highlight || null };
    if (map.setPaint) map.setPaint(paintOf());
    map.setMarks(marks);
    map.fitPoints(pts, pad, ms);
  }
  /* el pais bajo el raton (solo los de la Enciclopedia). Primero el que contiene el punto; solo si cae en el mar, el mas cercano a unos
     pocos pixeles (a este zoom). Antes valia el primero de la lista a menos de 25 km y Palestina salia siempre como Israel o Jordania */
  function pickAt(cx, cy) {
    if (!map.screenToLonLat) return null;
    const r = map.cv.getBoundingClientRect(); let lon, lat, tol;
    try { [lon, lat] = map.screenToLonLat(cx - r.left, cy - r.top); const q = map.screenToLonLat(cx - r.left + 8, cy - r.top); tol = A.geo.haversine(lat, lon, q[1], q[0]); } catch (x) { return null; }
    if (!(lat >= -90 && lat <= 90) || !isFinite(lon)) return null; lon = ((lon + 540) % 360) - 180;
    tol = Math.min(150, isFinite(tol) ? tol : 25);
    const by = index().byNE, pad = tol / 80 + 0.3, cand = [];
    for (const f of world.features) {
      let near = false; for (const p of f.polys) for (const L of [lon, lon + 360, lon - 360]) if (L >= p.bbox[0] - pad && L <= p.bbox[2] + pad && lat >= p.bbox[1] - pad && lat <= p.bbox[3] + pad) { near = true; break; }
      if (!near) continue;
      if (A.geo.inFeature(lon, lat, f)) return by[f.name] ? f.name : null;   // dentro de un pais: ese, nunca el vecino
      if (by[f.name]) cand.push(f);
    }
    let best = null, bd = tol;
    for (const f of cand) { const d = A.geo.distToFeature(lon, lat, f, bd); if (d < bd) { bd = d; best = f.name; } }
    return best;
  }
  function mapTip(ne, cx, cy) {
    const tip = $("cxTip"), stage = $("cxStage"); if (!tip || !stage) return;
    if (!ne) { tip.classList.add("hidden"); tip._ne = null; map.cv.style.cursor = ""; return; }
    const box = stage.getBoundingClientRect(), z = box.width / Math.max(1, stage.clientWidth);
    if (tip._ne !== ne) {                                               // solo al cambiar de pais: contenido nuevo y una medida
      const g = index().gs["c:" + ne], s = gStats(g), known = gKnown(g);
      tip.innerHTML = `${known && hasFlag(ne) ? `<img alt="" src="${esc(flagSrc(ne))}">` : ""}<b>${known ? esc(gName(g)) : "???"}</b><em>${pctOf(s)} %</em>`;
      tip.classList.remove("hidden"); map.cv.style.cursor = "pointer"; tip._ne = ne; tip._w = tip.offsetWidth;
    }
    const x = (cx - box.left) / z, y = (cy - box.top) / z, bw = box.width / z, w = tip._w || 0;
    tip.style.left = (x + 16 + w <= bw - 6 ? x + 16 : x - 16 - w >= 6 ? x - 16 - w : Math.max(6, bw - 6 - w)) + "px"; tip.style.top = Math.max(4, y - 38) + "px";
  }
  function mapBind() {
    if (!map || !map.cv || map._cxBound) return; map._cxBound = true;
    const cv = map.cv; let raf = 0, last = null, hov = null;
    const set = ne => { if (ne === hov) return; hov = ne; if (map.setHighlight) map.setHighlight(ne || mapCtx.hi); };
    cv.addEventListener("pointermove", e => {
      if (!stageOn()) return; last = e; if (ptr && e.pointerType === "mouse" && !(e.buttons & 1)) ptr = null;   // se solto fuera del lienzo
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (!stageOn() || !last) return; const drag = ptr && Math.hypot(last.clientX - ptr.x, last.clientY - ptr.y) > 5, ne = drag ? null : pickAt(last.clientX, last.clientY); set(ne); mapTip(ne, last.clientX, last.clientY); });
    });
    cv.addEventListener("pointerleave", () => { if (!stageOn()) return; last = null; set(null); mapTip(null); });
    cv.addEventListener("pointerdown", e => { if (stageOn() && e.button === 0) ptr = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener("pointerup", e => {
      const p = ptr; ptr = null; if (!p || !stageOn() || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 5) return;
      const ne = pickAt(e.clientX, e.clientY); if (!ne) return; const key = "c:" + ne;
      if (!(ui.view.k === "group" && ui.view.g === key)) { hov = null; mapTip(null); go({ k: "group", g: key }); }
    });
  }
  document.addEventListener("aiq:mapcanvas", () => { if (map && map._cxBound) { map._cxBound = false; mapBind(); } });   // el mapa recreo su lienzo (la GPU se reinicio): los gestos de la Enciclopedia se vuelven a enganchar
  /* +, - y la casa: los mismos gestos que en partida (zoomBy anima y frena como la rueda) */
  function zoomStep(f) {
    if (!stageOn()) return; const r = $("cxStage").getBoundingClientRect();
    if (f) map.zoomBy(f, (r.left + r.right) / 2, (r.top + r.bottom) / 2); else frameMap(ui.view, 600);
  }
  /* al abrir se guarda como estaba el mapa (camara, marcas, deriva de la portada) y al cerrar se deja igual */
  function mapSave() { if (!map || mapSaved || !atTitle()) return; mapSaved = { view: { ...map.view }, marks: map.marks, drift: !!map.drift }; }
  function mapRestore() {
    const m = mapSaved; mapSaved = null; if (!map || !m) return;
    if (map.setPaint) map.setPaint(null); map.cv.style.cursor = "";
    map.marks = m.marks; map.dirty = map.fxDirty = true;
    const S2 = A.core && A.core.S;
    if (m.drift && S2 && S2.phase === "title" && map.startDrift) map.startDrift(); else map.animateTo(m.view, 700);
  }

  let tEl = null, tR = null;
  function tiltMove(el, ev, deg) {
    if (el !== tEl) { tEl = el; tR = el.getBoundingClientRect(); }      // una lectura al entrar en la carta, no una por movimiento
    const r = tR, x = Math.max(-0.5, Math.min(0.5, (ev.clientX - r.left) / r.width - 0.5)), y = Math.max(-0.5, Math.min(0.5, (ev.clientY - r.top) / r.height - 0.5));
    el.style.setProperty("--rx", (-y * deg).toFixed(2) + "deg"); el.style.setProperty("--ry", (x * deg).toFixed(2) + "deg"); el.style.setProperty("--gx", (x * 100 + 50).toFixed(0) + "%"); el.style.setProperty("--gy", (y * 100 + 50).toFixed(0) + "%");
  }
  const tiltReset = el => { tEl = null; el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); };
  function labels() {
    document.querySelectorAll("#codex [data-cx]").forEach(el => { el.textContent = A.t("codex." + el.dataset.cx); });
    $("cxSearch").placeholder = A.t("codex.search");
  }

  /* ---------------- abrir / cerrar / aviso de tarjeta nueva ---------------- */
  /* el crupier de la portada no habla encima de la Enciclopedia: se retira al abrirla y vuelve a asomar al cerrarla (como con el podio, js/podio.js) */
  let dealerWas = false;
  /* v0.3.50 (usuario): el aparato se enciende al abrirlo (la linea de fosforo y la pantalla que se abre) y se apaga al cerrarlo (se cierra en una
     linea y se va en un punto). Solo transform y opacidad sobre capas propias (css/codex.css, .cx-pw); con "reducir movimiento", sin efecto */
  let pwT = 0, shutT = 0;
  const pwStill = () => { const S2 = A.core && A.core.S; return !!(S2 && S2.reduce) || matchMedia("(prefers-reduced-motion: reduce)").matches; };
  function power(on) {
    const r = $("codex"); if (!r) return; clearTimeout(pwT); r.classList.remove("pw-on", "pw-off"); if (pwStill()) return;
    A.restyle(r); r.classList.add(on ? "pw-on" : "pw-off");
    if (on) pwT = setTimeout(() => r.classList.remove("pw-on"), 520);
  }
  function open(id) {
    const fresh = !isOpen() || !!shutT;                                  // cerrada (o apagandose): se vuelve a encender
    if (shutT) { clearTimeout(shutT); shutT = 0; $("codex").classList.remove("pw-off"); }
    if (!isOpen() && A.dealer && A.dealer.homeTease) { dealerWas = !!A.dealer.onHome; if (dealerWas) A.dealer.homeTease(false); }
    if (!isOpen()) { mapSave(); ui.flown = false; if (map && map.setStyle && A.MAPSTYLES && A.MAPSTYLES.casino && map.sk !== A.MAPSTYLES.casino) map.setStyle(A.MAPSTYLES.casino); }   // v0.3.62: el aparato tiene su propia pantalla; la mesa del jugador vuelve al cerrarlo
    buildUI(); const root = $("codex"); root.classList.remove("hidden"); document.body.classList.add("cx-on"); labels();
    if (id && E[id]) { const pid = E[id].parent || id, v = { k: "detail", id: pid, ch: E[id].tier || 0 }; ui.stack = trail(v); ui.view = v; }
    else if (ui.view.k === "detail" || ui.view.k === "search") { ui.view = { k: "home" }; ui.stack = []; }        // vuelve a donde lo dejaste (Resumen, continente o pais); una carta suelta, no
    ui.q = ""; $("cxSearch").value = "";
    render(); root.tabIndex = -1;
    requestAnimationFrame(() => setTimeout(() => { if (isOpen()) root.focus({ preventScroll: true }); }, 0));   // el foco, ya pintada: dado al instante obligaba a maquetar la Enciclopedia entera a medio abrir
    if (fresh) { power(true); (A.sfx.devOn || A.sfx.card)(); } else A.sfx.card();
    ui.lockN = 0;
    if (!id && A.dealer && A.dealer.codexOpen) setTimeout(() => { if (isOpen() && !ui.cur) A.dealer.codexOpen({ stats, tease }); }, 900);   // el crupier: tu ritmo, o te ensena una bloqueada
  }
  /* el crupier te ensena algo bloqueado 3 s y lo vuelve a tapar (no desbloquea nada): una carta boca abajo a la vista; si no hay, un pais sin
     descubrir de la lista (su bandera y su nombre); y en el Resumen, uno grande del mapa del juego, resaltado con su nombre */
  function tease() {
    const g = $("cxMain"); if (!g) return false; const gr = g.getBoundingClientRect();
    const S2 = A.core && A.core.S, reduced = (S2 && S2.reduce) || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = el => { const r = el.getBoundingClientRect(); return r.top >= gr.top && r.bottom <= gr.bottom; };
    const flip = (b, then) => { if (reduced) return then(); b.animate([{ transform: "rotateY(0)" }, { transform: "rotateY(90deg)" }], { duration: 160, easing: "ease-in" }).onfinish = () => { then(); b.animate([{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0)" }], { duration: 180, easing: "ease-out" }); }; };
    const b = [...g.querySelectorAll(".cx-card.locked")].find(seen);
    if (b) {
      const art = b.querySelector(".cx-art"), id = b.dataset.id, img = new Image(); img.className = "cx-tease"; img.alt = ""; img.onerror = () => img.remove(); img.src = A.media(`assets/wiki/card/${A.mediaKey((E[id] && E[id].parent) || id)}.webp`);
      flip(b, () => { art.appendChild(img); b.classList.add("teased"); A.sfx.card(); });
      setTimeout(() => { if (b.isConnected) flip(b, () => { img.remove(); b.classList.remove("teased"); }); }, 3400);
      return true;
    }
    const t = [...g.querySelectorAll(".cx-ct.unk")].find(el => seen(el) && el.querySelector("canvas.cx-sil"));
    const tg = t && index().gs[t.dataset.go.slice(2)];
    if (tg && tg.ne && hasFlag(tg.ne)) {
      const f = t.querySelector(".cx-ct-f"), nb = t.querySelector(".cx-ct-t b"), img = new Image(); img.className = "cx-tease cx-flag" + flagFit(tg.ne); img.alt = ""; img.onerror = () => img.remove(); img.src = flagSrc(tg.ne);
      flip(t, () => { f.appendChild(img); nb.textContent = cName(tg.ne); t.classList.add("teased"); A.sfx.card(); });
      setTimeout(() => { if (t.isConnected) flip(t, () => { img.remove(); nb.textContent = "???"; t.classList.remove("teased"); }); }, 3400);
      return true;
    }
    if (ui.view.k === "home" && stageOn() && map.setHighlight && map.lonLatToScreen) {
      const st = $("cxStage").getBoundingClientRect(), r = map.cv.getBoundingClientRect(), gs = index().gs;
      const cand = Object.values(gs).filter(x => x.ne && !gKnown(x) && hasFlag(x.ne)).map(x => { const bx = boxOf(x.ne); return bx && { x, bx, a: (bx[2] - bx[0]) * (bx[3] - bx[1]) }; }).filter(Boolean).sort((p, q) => q.a - p.a);
      for (const c of cand.slice(0, 40)) {
        const lon = (c.bx[0] + c.bx[2]) / 2, lat = (c.bx[1] + c.bx[3]) / 2, pt = map.lonLatToScreen(lon, lat), cx = r.left + pt[0], cy = r.top + pt[1];
        if (cx < st.left + 60 || cx > st.right - 60 || cy < st.top + 40 || cy > st.bottom - 40) continue;
        const tip = $("cxTip"); map.setHighlight(c.x.ne); A.sfx.card();
        tip._ne = null; tip.innerHTML = `${hasFlag(c.x.ne) ? `<img alt="" src="${esc(flagSrc(c.x.ne))}">` : ""}<b>${esc(cName(c.x.ne))}</b>`; tip.classList.remove("hidden");
        const z = st.width / Math.max(1, $("cxStage").clientWidth), w = tip.offsetWidth;
        tip.style.left = Math.max(6, (cx - st.left) / z - w / 2) + "px"; tip.style.top = Math.max(4, (cy - st.top) / z - 44) + "px";
        setTimeout(() => { if (!isOpen()) return; map.setHighlight(mapCtx.hi); if (tip._ne == null) tip.classList.add("hidden"); }, 3400);
        return true;
      }
    }
    return false;
  }
  /* cerrar: el aparato se apaga (~0,3 s) y despues se recoge todo; mientras se apaga no se puede pulsar nada (css/codex.css, .pw-off) */
  function close() {
    if (!isOpen() || shutT) return;
    if (pwStill()) return shut();
    power(false); if (A.sfx.devOff) A.sfx.devOff();
    shutT = setTimeout(() => { shutT = 0; const r = $("codex"); if (r) r.classList.remove("pw-off"); shut(true); }, 300);
  }
  function shut(quiet) { const was = isOpen(), r = $("codex"); if (r) r.classList.add("hidden");
    pump.tok++; cancelAnimationFrame(pump.raf); pump.raf = 0; pump.q = []; if (io) io.disconnect(); silQueue.length = 0; cancelAnimationFrame(silT); silT = 0;   // nada sigue trabajando con ella cerrada
    if ($("cxLight")) $("cxLight").classList.add("hidden"); document.body.classList.remove("cx-on"); if (A.coverMap) A.coverMap("codex", false); if (was) mapRestore(); if (was && map && map.setStyle && A.mesas) { const st = A.mesas.style(); if (map.sk !== st) map.setStyle(st); } ui.cur = null; if (was && !quiet) A.sfx.ui(); if (A.codexOnClose) A.codexOnClose();
    const S2 = A.core && A.core.S;
    if (dealerWas && A.dealer && A.dealer.homeTease && document.querySelector(".hh") && S2 && S2.phase === "title" && !S2.settingsOpen) A.dealer.homeTease(true);
    dealerWas = false;
  }

  /* aviso de tarjeta nueva: un monton de polaroids con todo lo conseguido, tarjeta a tarjeta (v0.3.20). Cada una cae desde un lado
     al azar y se queda con su giro y su sitio en el monton tambien al azar, para que nunca caigan igual; su foto hace el zoom lento de
     una diapositiva. Todas van en la misma celda, asi el aviso mide lo que la mas alta y no da saltos. La primera se queda un poco,
     las del medio pasan mas deprisa cuantas mas son y la ultima aguanta hasta ~7 s; con el raton encima se para */
  let toastT = 0, reelT = 0;
  function toastItem(id) {
    const e = E[id], it = document.createElement("span"); it.className = "cx-ri";
    const lvl = e.parent ? e.tier : tiered(id) ? 1 : 0, what = e.parent ? A.t(e.tier === 2 ? "codex.tierh" : "codex.tierk") : typeLabel(e.type);
    const ctry = e.country && cName(e.country) ? cName(e.country) : "", pid = e.parent || id, lang = A.wlang();
    it.innerHTML = `<span class="cx-tcard m${lvl}"><span class="cx-art"></span>${lvl ? `<span class="cx-tmed">${A.icon("medal_" + MED[lvl - 1])}</span>` : ""}</span><span class="cx-tt"><em>${esc(A.t("codex.new"))} · ${esc(what)}</em><b>${esc(nameOf(e, memOf(id)))}</b>${ctry ? `<s>${esc(ctry)}</s>` : ""}<i></i></span>`;
    const info = it.querySelector("i"), say = d => { if (d) info.textContent = d; };
    /* la foto (img.json) y el dato corto llegan enseguida; el texto completo de la tarjeta mejora el nombre y la descripcion cuando carga */
    const put = (src, back, flag) => new Promise(res => {
      const im = new Image(); im.alt = ""; im.className = photo(src);
      const done = () => { const art = it.querySelector(".cx-art"); art.classList.toggle("flag", !!flag); art.prepend(im); res(); };
      im.onload = done; im.onerror = () => { if (!back) return res(); im.onerror = () => res(); im.src = back; };
      im.src = src;
    });
    const full = loadContent(e, lang).then(rec => { if (rec.none) return null; it.querySelector("b").textContent = nameOf(e, rec); say(rec.desc); return rec; }).catch(() => null);
    /* Historia (id~h) y Dato clave (id~k) ensenan su propia foto, no la de la portada del lugar */
    it._ready = Promise.all([A.wiki.imgOf(id), A.wiki.imgOf(pid), A.wiki.loadShort(lang)]).then(([own, base]) => {
      say(A.cleanFact(A.wiki.factOf(pid, lang)));
      const im = own || base, k = A.mediaKey(own ? id : pid);
      if (im) return put(A.media(`assets/wiki/card/${k}.webp`), A.media(`assets/wiki/th/${k}.webp`), /\/(\d+px-)?(State_)?flag_of_[^\/]*$/i.test(im[0]));
      return full.then(rec => (rec && rec.img ? put(rec.img.card, rec.img.thumb, rec.img.flag) : null));   // paises sin foto propia: su bandera (la foto grande: la polaroid mide ~400 px)
    }).catch(() => {}).then(() => { const art = it.querySelector(".cx-art"); if (!art.querySelector("img")) art.innerHTML = iconSvg(e.type); });   // el icono solo si de verdad no hay foto, nunca de relleno mientras carga
    return it;
  }
  /* el aviso espera (hasta 1,4 s) a que las fotos de las primeras tarjetas esten cargadas: se ve la foto, no el icono de relleno */
  function toast(ids) {
    if (!ids.length) return;
    const items = ids.map(toastItem);
    Promise.race([Promise.all(items.slice(0, 2).map(x => x._ready)), new Promise(r => setTimeout(r, 1400))]).then(() => toastShow(ids, items));
  }
  function toastShow(ids, items) {
    let el = $("cxToast"); if (!el) { el = document.createElement("button"); el.id = "cxToast"; el.type = "button"; el.className = "cx-toast hidden"; (document.getElementById("leftCol") || $("app")).appendChild(el); }
    clearTimeout(toastT); clearTimeout(reelT);
    const n = ids.length, FIRST = 1300, END = 7000, step = Math.max(240, Math.min(900, 3800 / Math.max(1, n - 1)));
    const hold = k => n === 1 ? END : k === 0 ? FIRST : k < n - 1 ? step : Math.max(1600, END - FIRST - (n - 2) * step);
    const calm = document.documentElement.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.classList.add("pile");
    el.innerHTML = `<span class="cx-reel"></span>${n > 1 ? `<span class="cx-cnt"></span>` : ""}`;
    const cnt = el.querySelector(".cx-cnt"), rnd = (a, b) => a + Math.random() * (b - a);
    items.forEach(it => el.firstElementChild.appendChild(it));
    /* donde se queda cada una: giro de -6 a 6 grados (nunca casi igual que la de debajo) y un poco descolocada */
    let lastR = rnd(-6, 6) > 0 ? -3 : 3;
    const rest = items.map(() => { let r; do r = rnd(-6, 6); while (Math.abs(r - lastR) < 2.5); lastR = r; return `translate(${rnd(-12, 12).toFixed(1)}px, ${rnd(-8, 6).toFixed(1)}px) rotate(${r.toFixed(2)}deg)`; });
    items.forEach((it, j) => { it.style.transform = rest[j]; it.style.zIndex = j + 1; it.style.setProperty("--ko", `${rnd(25, 75) | 0}% ${rnd(25, 70) | 0}%`); });
    /* de donde cae: izquierda, arriba, derecha o abajo, girando a su aire */
    const from = () => { const side = Math.random() * 4 | 0, sp = rnd(-28, 28).toFixed(1);
      return side === 0 ? `translate(-125%, ${rnd(-60, 40) | 0}px) rotate(${-Math.abs(sp)}deg)` : side === 1 ? `translate(${rnd(-50, 50) | 0}px, -115%) rotate(${sp}deg)`
        : side === 2 ? `translate(120%, ${rnd(-60, 40) | 0}px) rotate(${Math.abs(sp)}deg)` : `translate(${rnd(-40, 40) | 0}px, 70%) rotate(${sp}deg) scale(1.08)`; };
    let i = 0;
    const show = k => {
      const it = items[k], d = calm ? 0 : Math.min(560, Math.max(320, step - 40));
      items.forEach((o, j) => { if (j < k) { o.classList.remove("on"); o.classList.toggle("under", j >= k - 3); } });   // en el monton se ven las 3 de debajo; las mas viejas ya no
      it.classList.remove("under"); it.classList.add("on", "kb"); if (cnt) cnt.textContent = `${k + 1} / ${n}`;
      if (!d) return;
      it.animate([{ transform: from(), opacity: 0 }, { opacity: 1, offset: .35 }, { transform: rest[k], opacity: 1 }], { duration: d, easing: "cubic-bezier(.2, .9, .3, 1.12)" });
      const p = items[k - 1];
      if (p) setTimeout(() => p.isConnected && p.animate([{ transform: rest[k - 1] }, { transform: `${rest[k - 1]} translate(${rnd(-4, 4).toFixed(1)}px, 3px) rotate(${rnd(-1.2, 1.2).toFixed(2)}deg)` }, { transform: rest[k - 1] }], { duration: 240, easing: "ease-out" }), d * .82);   // el golpecito a la de debajo al caer
    };
    const leave = () => { el.classList.remove("in"); el.classList.add("out"); toastT = setTimeout(() => el.classList.add("hidden"), 340); };
    const next = () => { if (i < n - 1) { show(++i); reelT = setTimeout(next, hold(i)); } else leave(); };
    el._leave = () => { clearTimeout(reelT); leave(); };
    el.onpointerenter = () => clearTimeout(reelT);
    el.onpointerleave = () => { clearTimeout(reelT); reelT = setTimeout(next, 700); };
    el.onclick = () => { clearTimeout(reelT); if (A.core && A.core.S && A.core.S.phase === "asking") { leave(); return; } el.classList.add("hidden"); open(ids[i]); };   // con el reloj corriendo solo se aparta
    el.classList.remove("hidden", "in", "out"); A.restyle(el); el.classList.add("in");
    /* ancho de la polaroid segun el alto libre bajo la placa: se mide al abrir (no por fotograma) y se encoge hasta que no tape los botones de abajo */
    el.classList.remove("slim"); el.style.removeProperty("--pw");
    if (el.parentNode && el.parentNode.id === "leftCol" && !document.body.classList.contains("tk-on")) {
      const col = el.parentNode.clientWidth, limit = window.innerHeight - 72, reel = el.firstElementChild;
      let pw = Math.round(col * .9); el.classList.toggle("slim", window.innerHeight < 720);
      for (let k = 0; k < 4; k++) {
        el.style.setProperty("--pw", pw + "px");
        const over = reel.getBoundingClientRect().bottom + 14 - limit; if (over <= 0) break;
        pw = Math.max(200, Math.round(pw - over / (el.classList.contains("slim") ? .62 : .75) - 4)); if (pw === 200) { el.style.setProperty("--pw", "200px"); break; }
      }
    }
    show(0); reelT = setTimeout(next, hold(0));
  }
  listeners.push(added => { setTimeout(() => toast(added), 1700); });   // sin sonido propio: lo celebran los jackpots del ticket (A.sfx.jackpot)

  A.codex = {
    init(w, m) { world = w; map = m; load(); build(); },
    open, close, isOpen, stats, entry: id => E[id], has: id => !!E[id],
    toastAside() { const el = $("cxToast"); if (el && el._leave && !el.classList.contains("hidden") && !el.classList.contains("out")) el._leave(); },   // empieza otra pregunta: el monton se aparta y deja el mapa libre
    unlocked: () => order.filter(isUnlocked), total: () => order.length,
    isUnlocked: id => !!store.unlocked[id],
    _load: (id, lang) => loadContent(E[id], lang || A.wlang()), _toast: ids => toast(ids),
    _index: () => index(), _groupStats: key => gStats(index().gs[key]), _map: () => map, _ui: () => ui,
    ids: () => order.slice(),
    regionNames: ne => (REG_OF[ne] ? REG_OF[ne].names : ""),         // nombre de la familia de un pais, "es|en|..." (sin montar el atlas)
    reset() { store = { unlocked: {}, seen: {} }; save(); dirty(); ui.cur = null; if (isOpen()) { ui.stack = []; ui.view = { k: "home" }; render(); } },
    byType, byCont,
    refresh() { if (isOpen()) { labels(); saveTop(); render(); } },
  };
})(window.AIQ);
