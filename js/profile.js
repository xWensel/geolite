/*
 * Geolite - perfil del jugador (v0.6): estadisticas, records, progreso de la Aventura y logros.
 * Todo vive en localStorage; la capa `A.steam` (si existe) recibe los logros para Steamworks.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const KEY = "atlasiq.profile.v1";

  const defaults = () => ({
    v: 1, id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), name: "", created: Date.now(),
    stats: { plays: 0, questions: 0, km: 0, hits: 0, bulls: 0, bestStreak: 0, perfectRounds: 0, timeouts: 0, seconds: 0, inside: 0 },
    records: {}, ach: {}, boards: {}, daily: {}, nameLog: [], nameAsk: 0,
    adv: { runs: 0, wins: 0, bestScore: 0, bestRound: 0, coins: 0, asc: 0, boss: 0, decks: { explorer: 1 }, deckWins: {}, seen: {} },
    medals: {}, casino: { games: {}, plays: 0 },
  });
  let P = defaults();
  try { const d = JSON.parse(localStorage.getItem(KEY) || "null"); if (d && d.v === 1) { P = Object.assign(defaults(), d); P.stats = Object.assign(defaults().stats, d.stats); P.adv = Object.assign(defaults().adv, d.adv); } }
  catch (e) { try { localStorage.setItem(KEY + ".bad", localStorage.getItem(KEY)); } catch (e2) { /* sin almacenamiento */ } }   // JSON roto: se aparta antes de que el perfil nuevo lo pise
  /* piezas con otra forma (perfil a medio escribir o tocado a mano): se reponen para que nada casque al leerlas (P.ach[id], P.daily[b]...) */
  { const D0 = defaults(), obj = v => !!v && typeof v === "object" && !Array.isArray(v); ["records", "ach", "boards", "daily", "medals", "stats", "adv", "casino"].forEach(k => { if (!obj(P[k])) P[k] = D0[k]; });
    if (!Array.isArray(P.nameLog)) P.nameLog = []; if (typeof P.name !== "string") P.name = ""; if (!P.id || typeof P.id !== "string") P.id = D0.id; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* sin almacenamiento */ } };
  /* barajas (2026-10-02): antes se abrian con el Acto I (Historiador), un jefe (Navegante) y ganar (Aventurero ciego); ahora con victorias y
     Ascensiones (js/adventure.js, DECKS). Una sola vez: las que ya tenias abiertas con la regla vieja se quedan abiertas (adv.deckKeep) */
  if (!P.adv.deckMig) {
    const OLD = { historian: "adv_act1", navigator: "adv_boss", blind: "adv_win" }, keep = (P.adv.deckKeep = Object.assign({}, P.adv.deckKeep));
    for (const id in OLD) if (P.ach[OLD[id]]) keep[id] = 1;
    P.adv.deckMig = 1; save();
  }

  /* nombre con el que rankeas (v0.37): letras de cualquier alfabeto, cifras, espacio y _ . - ' (lo mismo que acepta api/submit.js), hasta 20 */
  const NAME_MAX = 20;
  const clean = n => [...String(n || "").normalize("NFC").replace(/[^\p{L}\p{N} _.'\-]/gu, "").replace(/\s+/g, " ").trimStart()].slice(0, NAME_MAX).join("");
  A.profile = {
    get: () => P, save, NAME_MAX, clean,
    /* guarda el nombre y lo apunta en P.nameLog (los que ya has usado: el crupier "ya te conoce" si vuelves a uno) */
    setName(n) {
      P.name = clean(n).trim();
      if (P.name) { const low = P.name.toLowerCase(); P.nameLog = [P.name, ...(P.nameLog || []).filter(x => x.toLowerCase() !== low)].slice(0, 8); P.nameAsk = 0; }
      save(); return P.name;
    },
    knownName: n => { const low = clean(n).trim().toLowerCase(); return !!low && (P.nameLog || []).some(x => x.toLowerCase() === low); },
    /* records[board] = mejor puntuacion; devuelve true si es nuevo record */
    record(board, score) { const old = P.records[board] || 0; if (score > old) { P.records[board] = score; save(); return true; } return false; },
    /* una jugada de casino ya cerrada (js/adventure.js, reportCasino): cuenta los juegos distintos y avisa a los logros */
    casino(rec) {
      const C = P.casino = (P.casino && P.casino.games) ? P.casino : { games: {}, plays: 0 };
      C.games[rec.game] = (C.games[rec.game] || 0) + 1; C.plays = (C.plays || 0) + 1; save();
      A.ach.emit("casino", { kind: "play", game: rec.game, played: Object.keys(C.games).length, green: !!rec.green, edge: !!rec.edge, mult: rec.mult || 0 });
    },
    medal(id, m) { const rank = { bronze: 1, silver: 2, gold: 3 }; if ((rank[m] || 0) > (rank[P.medals[id]] || 0)) { P.medals[id] = m; save(); } },
  };

  /* ---------------------------------------------------------------- logros */
  const AD = (id, ico, es, en, de, dn, ev, test, secret) => ({ id, ico, name: { es, en }, desc: { es: de, en: dn }, ev, test, secret: !!secret });
  const S = () => P.stats, ADV = () => P.adv;
  const won = id => !!P.records["classic:" + id + ":win"];
  const classicIds = () => (A.CAMPAIGNS || []).filter(c => c.mode === "classic").map(c => c.id);
  const golds = () => classicIds().filter(id => P.medals[id] === "gold").length;
  const DECKS = ["explorer", "historian", "navigator", "blind"];
  const deckWins = () => DECKS.filter(d => ((ADV().deckWins || {})[d] || 0) > 0).length;
  /* Retos diarios completados = dias con algun intento cerrado (los "Dias jugados" del Reto diario). Contar las claves de P.daily sumaba
     dias con el intento a medias y las tablas "weekly-" del formato antiguo */
  const contDone = (c, k) => !!(c && c.cont && c.cont[k] && c.cont[k][1] > 0 && c.cont[k][0] >= c.cont[k][1]);
  const dailyDays = () => (A.rank && A.rank.daily ? A.rank.daily.stats().days : 0);
  /* Tramos de dificultad (secciones del Perfil): de menos a mas dificil y de menos a mas horas de juego; los secretos, al final.
   * El orden no importa a Steam (el "API name" es el id). Todos comprobados como alcanzables (v0.34, 100 logros: el tope de Steam). */
  A.ACH_TIERS = [
    { n: { es: "Primeros pasos", en: "First steps" }, t: { es: "Tus primeros minutos", en: "Your first minutes" } },
    { n: { es: "Primera sesión", en: "First session" }, t: { es: "Menos de una hora", en: "Under an hour" } },
    { n: { es: "Unas horas", en: "A few hours" }, t: { es: "De 1 a 5 horas", en: "1 to 5 hours" } },
    { n: { es: "Jugador habitual", en: "Regular player" }, t: { es: "De 5 a 20 horas", en: "5 to 20 hours" } },
    { n: { es: "Maestría", en: "Mastery" }, t: { es: "Más de 20 horas", en: "Over 20 hours" } },
    { n: { es: "Secretos", en: "Secrets" }, t: { es: "Ocultos hasta conseguirlos", en: "Hidden until unlocked" } },
  ];
  const tier = (t, list) => list.map(a => Object.assign(a, { tier: t }));
  A.ACH = [
    /* ---- I. primeros pasos (minutos) ---- */
    ...tier(0, [
      AD("first_pin", "📍", "Primer pin", "First pin", "Responde tu primera pregunta.", "Answer your first question.", "q", () => S().questions >= 1),
      AD("adv_start", "🧳", "Salir de casa", "Setting out", "Empieza una Aventura.", "Start an Adventure.", "adv", c => c.kind === "start"),
      AD("bull_1", "🎯", "Diana", "Bullseye", "Acierta a menos de 25 km (o dentro del país).", "Land within 25 km (or inside the country).", "q", c => c.bull),
      AD("codex_10", "📖", "Primeras páginas", "First pages", "10 tarjetas en la Enciclopedia.", "10 Encyclopedia cards.", "codex", c => c.u >= 10),
      AD("adv_clear1", "🥾", "Primer campamento", "First camp", "Supera una ronda de la Aventura.", "Clear an Adventure round.", "adv", c => c.kind === "clear"),
      AD("adv_blind", "🕶️", "A ciegas", "Blindfolded", "Supera una ronda sin usar herramientas.", "Clear a round without using tools.", "adv", c => c.kind === "clear" && c.tools === 0),
      AD("streak_5", "🔥", "En racha", "On a roll", "Racha de 5 aciertos.", "5-hit streak.", "q", () => S().bestStreak >= 5),
      AD("speed", "⚡", "Relámpago", "Lightning", "Acierta bien en menos de 2 segundos.", "Nail it in under 2 seconds.", "q", c => c.ratio >= 0.75 && c.used != null && c.used <= 2),
    ]),
    /* ---- II. primera sesion (menos de 1 h) ---- */
    ...tier(1, [
      AD("codex_50", "📚", "Rata de biblioteca", "Bookworm", "50 tarjetas.", "50 cards.", "codex", c => c.u >= 50),
      AD("adv_bribe", "💸", "Bajo la mesa", "Under the table", "Soborna al crupier para quitar un reto.", "Bribe the dealer to remove a challenge.", "adv", c => c.kind === "bribe"),
      AD("perfect", "💯", "Ronda perfecta", "Perfect round", "Acierta bien todas las preguntas de un nivel del Clásico.", "Nail every question in a Classic level.", "level", c => c.perfect),
      AD("km_equator", "📏", "Despiste ecuatorial", "Equatorial blunder", "Acumula 40.075 km de error: una vuelta entera al mundo.", "Rack up 40,075 km of total error: one full lap of the Earth.", "q", () => S().km >= 40075),
      AD("adv_boss", "🐉", "Cazajefes", "Boss slayer", "Derrota a un jefe.", "Defeat a boss.", "adv", c => c.kind === "boss"),
      AD("adv_act1", "🌅", "Las rutas conocidas", "The known roads", "Completa el Acto I.", "Complete Act I.", "adv", c => c.kind === "act" && c.act >= 1),
      AD("codex_100", "🏛️", "Erudito", "Scholar", "100 tarjetas.", "100 cards.", "codex", c => c.u >= 100),
      AD("streak_10", "☄️", "Imparable", "Unstoppable", "Racha de 10 aciertos.", "10-hit streak.", "q", () => S().bestStreak >= 10),
      AD("daily_1", "📅", "Reto del día", "Daily challenge", "Juega el Reto diario.", "Play the Daily challenge.", "daily", () => true),
      AD("classic_world", "🌍", "Vuelta al mundo", "Round the world", "Termina la campaña Mundo.", "Finish the World campaign.", "classic", () => won("c-game1")),
      AD("casino_first", "🎲", "A la mesa", "Pull up a chair", "Juega tu primer juego del casino.", "Play your first casino game.", "casino", c => c.kind === "play"),
    ]),
    /* ---- III. unas horas (1-5 h) ---- */
    ...tier(2, [
      AD("last_second", "⏱️", "Por los pelos", "By a whisker", "Acierta bien con menos de 1 segundo restante.", "Nail it with under 1 second left.", "q", c => c.ratio >= 0.75 && c.left != null && c.left < 1 && c.left > 0),
      /* antes "10 lugares sin categoria propia": desde que la Enciclopedia solo tiene tarjetas alcanzables no queda ninguna de tipo "place" (era imposible) */
      AD("codex_place", "🧭", "Rincones perdidos", "Hidden corners", "20 monumentos en la Enciclopedia.", "20 landmarks in the Encyclopedia.", "codex", c => (c.by.landmark || [0])[0] >= 20),
      AD("codex_capitals", "🏙️", "Diplomático", "Diplomat", "40 capitales.", "40 capitals.", "codex", c => (c.by.capital || [0])[0] >= 40),
      AD("codex_water", "🌊", "Aguas tranquilas", "Calm waters", "15 mares u océanos.", "15 seas or oceans.", "codex", c => (c.by.water || [0])[0] >= 15),
      AD("codex_nature", "🌋", "Naturalista", "Naturalist", "30 lugares de naturaleza en la Enciclopedia.", "30 nature entries in the Encyclopedia.", "codex", c => (c.by.nature || [0])[0] >= 30),
      AD("codex_people", "🧑‍🎨", "Historiador", "Historian", "25 personajes históricos.", "25 historical figures.", "codex", c => (c.by.person || [0])[0] >= 25),
      AD("codex_events", "⚔️", "Cronista", "Chronicler", "20 batallas y sucesos.", "20 battles and events.", "codex", c => ((c.by.battle || [0])[0] + (c.by.event || [0])[0]) >= 20),
      AD("bull_25", "🎯", "Pulso de cirujano", "Surgeon's aim", "25 dianas en total.", "25 bullseyes in total.", "q", () => S().bulls >= 25),
      AD("adv_flawless", "🛡️", "Sin un rasguño", "Not a scratch", "Completa un acto sin perder provisiones.", "Complete an act without losing a provision.", "adv", c => c.kind === "act" && c.flawless),
      AD("codex_country50", "🛃", "Trotamundos", "Globetrotter", "50 países en la Enciclopedia.", "50 countries in the Encyclopedia.", "codex", c => (c.by.country || [0])[0] >= 50),
      AD("codex_250", "🎓", "Catedrático", "Professor", "250 tarjetas.", "250 cards.", "codex", c => c.u >= 250),
      /* Clasico: un logro por campana (las 11), todas, oros y sin fallar. Sin "termina una cualquiera": saltaba siempre a la vez que el de la campana terminada. */
      AD("classic_capitals", "🏛️", "Gira de capitales", "Capital tour", "Termina Capitales del mundo.", "Finish World Capitals.", "classic", () => won("c-worldcapitals")),
      AD("classic_europe", "🏰", "Grand Tour", "Grand Tour", "Termina Europa.", "Finish Europe.", "classic", () => won("c-europe")),
      AD("classic_latam", "💃", "Tierra latina", "Latin spirit", "Termina Latinoamérica.", "Finish Latin America.", "classic", () => won("c-centralsouthamerica")),
      AD("classic_usa", "🗽", "Sueño americano", "American dream", "Termina Estados Unidos.", "Finish USA.", "classic", () => won("c-usa")),
      AD("classic_asia", "🏯", "Ruta de la seda", "Silk road", "Termina Asia.", "Finish Asia.", "classic", () => won("c-asia")),
      AD("classic_oceania", "🏄", "Al fin del mundo", "Down under", "Termina Oceanía.", "Finish Oceania.", "classic", () => won("c-oceania")),
      AD("adv_act2", "🌄", "Más allá del mapa", "Beyond the map", "Completa el Acto II.", "Complete Act II.", "adv", c => c.kind === "act" && c.act >= 2),
      AD("adv_lastlife", "💔", "Al filo", "On the edge", "Derrota a un jefe con una sola provisión.", "Defeat a boss with a single provision left.", "adv", c => c.kind === "boss" && c.lives === 1),
      AD("classic_clean", "🎪", "Sin red", "No safety net", "Termina una campaña del Clásico desde el nivel 1 sin fallar ninguno.", "Finish a Classic campaign from level 1 without failing a single level.", "classic", c => !!(c.win && c.clean)),
      AD("adv_boss5", "☠️", "Cazarrecompensas", "Bounty hunter", "Derrota a 5 jefes en total.", "Defeat 5 bosses in total.", "adv", () => ADV().boss >= 5),
      AD("codex_city", "🏙️", "Turista empedernido", "World traveler", "100 ciudades.", "100 cities.", "codex", c => (c.by.city || [0])[0] >= 100),
      AD("codex_curio", "🎲", "Culturilla general", "Trivia buff", "100 curiosidades.", "100 curiosities.", "codex", c => (c.by.curiosity || [0])[0] >= 100),
      AD("pixel", "🔬", "Al milímetro", "To the millimeter", "Acierta a menos de 5 km.", "Land within 5 km.", "q", c => c.km != null && c.km <= 5 && !c.inside && !c.area),   // dentro del pais es km 0: eso ya es Diana, no punteria de 5 km
      AD("q_1000", "🗺️", "Cartógrafo", "Cartographer", "1.000 preguntas respondidas.", "1,000 questions answered.", "q", () => S().questions >= 1000),
    ]),
    /* ---- IV. jugador habitual (5-20 h) ---- */
    ...tier(3, [
      AD("adv_runs10", "👢", "Curtido", "Veteran", "Empieza 10 expediciones.", "Start 10 expeditions.", "adv", () => ADV().runs >= 10),
      AD("codex_500", "🌟", "Enciclopedista", "Encyclopedist", "500 tarjetas.", "500 cards.", "codex", c => c.u >= 500),
      AD("classic_flags", "🚩", "Abanderado", "Standard-bearer", "Termina Banderas.", "Finish Flags.", "classic", () => won("c-flags")),
      AD("classic_clues", "🕵️", "Detective", "Sleuth", "Termina Pistas.", "Finish Clues.", "classic", () => won("c-clues")),
      AD("classic_events", "📜", "Testigo de la historia", "Witness to history", "Termina Eventos históricos.", "Finish Historic Events.", "classic", () => won("c-events")),
      AD("classic_people", "🎭", "Biógrafo", "Biographer", "Termina Personajes históricos.", "Finish Historical Figures.", "classic", () => won("c-people")),
      AD("codex_strait", "⛵", "Paso estrecho", "Narrow passage", "8 estrechos o cabos.", "8 straits or capes.", "codex", c => (c.by.strait || [0])[0] >= 8),
      AD("streak_20", "🌋", "Erupción", "Eruption", "Racha de 20 aciertos.", "20-hit streak.", "q", () => S().bestStreak >= 20),
      AD("adv_win", "🗿", "Terra Incognita", "Terra Incognita", "Completa el Acto III y gana la expedición.", "Complete Act III and win the expedition.", "adv", c => c.kind === "act" && c.act >= 3 && !c.daily),
      AD("adv_asc", "⛰️", "Ascensión", "Ascension", "Gana una expedición en Ascensión 1 o más.", "Win an expedition at Ascension 1 or higher.", "adv", c => c.kind === "act" && c.act >= 3 && !c.daily && c.asc >= 1),
      AD("classic_gold1", "🥇", "Oro a la vista", "First gold", "Consigue tu primera medalla de oro en el Clásico.", "Earn your first Classic gold medal.", "classic", () => golds() >= 1),
      AD("bull_100", "🏹", "Ojo de halcón", "Hawk eye", "100 dianas en total.", "100 bullseyes in total.", "q", () => S().bulls >= 100),
      /* tras ganar, el modo infinito no tiene actos: "Llega al Acto V" era imposible; se cuentan preguntas aguantadas (js/adventure.js, afterQuestion) */
      AD("adv_endless", "♾️", "Leyenda", "Legend", "Aguanta 25 preguntas en el modo infinito.", "Survive 25 questions in infinite mode.", "adv", c => c.kind === "hold" && c.inf >= 25),
      AD("adv_fullhouse", "🎰", "Pleno", "Clean sweep", "5 dianas en una misma ronda de la Aventura.", "5 bullseyes in a single Adventure round.", "adv", c => c.kind === "clear" && c.bulls >= 5),
      AD("adv_legendary", "💎", "Botín legendario", "Legendary loot", "Consigue una reliquia legendaria en un cofre de jefe.", "Get a legendary relic from a boss chest.", "adv", c => c.kind === "legend" && c.chest),   // solo la del cofre
      AD("codex_1000", "📚", "Bibliotecario", "Librarian", "1.000 tarjetas.", "1,000 cards.", "codex", c => c.u >= 1000),
      AD("adv_score100k", "🎇", "Premio gordo", "Jackpot", "100.000 puntos en una sola expedición.", "100,000 points in a single expedition.", "adv", c => c.kind === "end" && c.score >= 100000),
      AD("adv_rich2", "💎", "Altas apuestas", "High roller", "Ten 100 doblones a la vez.", "Hold 100 doubloons at once.", "adv", c => c.kind === "hold" && c.coins >= 100),
      AD("speed_master", "🎩", "Reflejos de crupier", "Dealer reflexes", "Acierta muy bien en menos de 1 segundo.", "Nail it almost perfectly in under 1 second.", "q", c => c.ratio >= 0.9 && c.used != null && c.used <= 1),
      AD("classic_all", "🏆", "Maestro del Clásico", "Classic master", "Termina todas las campañas del Clásico.", "Finish every Classic campaign.", "classic", () => classicIds().every(won)),
      AD("casino_tour", "🗺️", "Gira del casino", "Casino tour", "Juega los 8 juegos del casino.", "Play all 8 casino games.", "casino", c => c.kind === "play" && c.played >= 8),
      AD("codex_sa", "🦙", "Sudamérica de norte a sur", "South America, top to bottom", "Desbloquea todas las tarjetas de Sudamérica.", "Unlock every South America card.", "codex", c => contDone(c, "sa")),
      AD("codex_oc", "🏝️", "Todas las islas", "Every island", "Desbloquea todas las tarjetas de Oceanía.", "Unlock every Oceania card.", "codex", c => contDone(c, "oc")),
    ]),
    /* ---- V. maestria (20 h o mas) ---- */
    ...tier(4, [
      AD("q_5000", "🌍", "Geógrafo", "Geographer", "5.000 preguntas respondidas.", "5,000 questions answered.", "q", () => S().questions >= 5000),
      AD("classic_gold5", "🪙", "Cinco de oros", "Gold rush", "Medalla de oro en 5 campañas del Clásico.", "Gold medal in 5 Classic campaigns.", "classic", () => golds() >= 5),
      AD("adv_asc2", "⛰️", "Ascensión II", "Ascension II", "Gana una expedición en Ascensión 2 o más.", "Win an expedition at Ascension 2 or higher.", "adv", c => c.kind === "act" && c.act >= 3 && !c.daily && c.asc >= 2),
      AD("adv_asc3", "⛰️", "Ascensión III", "Ascension III", "Gana una expedición en Ascensión 3 o más.", "Win an expedition at Ascension 3 or higher.", "adv", c => c.kind === "act" && c.act >= 3 && !c.daily && c.asc >= 3),
      AD("adv_flawless3", "🏵️", "Leyenda intachable", "Flawless legend", "Completa el Acto III sin perder provisiones.", "Complete Act III without losing a provision.", "adv", c => c.kind === "act" && c.flawless && c.act >= 3),
      AD("daily_30", "🎟️", "Ritual diario", "Daily ritual", "Juega el Reto diario 30 días distintos.", "Play the Daily challenge on 30 different days.", "daily", () => dailyDays() >= 30),
      AD("codex_country", "🛂", "Pasaporte completo", "Full passport", "190 países en la Enciclopedia.", "190 countries in the Encyclopedia.", "codex", c => (c.by.country || [0])[0] >= 190),
      AD("adv_asc4", "⛰️", "Ascensión IV", "Ascension IV", "Gana una expedición en Ascensión 4 o más.", "Win an expedition at Ascension 4 or higher.", "adv", c => c.kind === "act" && c.act >= 3 && !c.daily && c.asc >= 4),
      AD("bull_500", "🦅", "Leyenda del mapa", "Map legend", "500 dianas en total.", "500 bullseyes in total.", "q", () => S().bulls >= 500),
      AD("streak_50", "🌪️", "Invencible", "Invincible", "Racha de 50 aciertos.", "50-hit streak.", "q", () => S().bestStreak >= 50),
      AD("adv_endless2", "🔥", "Mito", "Myth", "Aguanta 50 preguntas en el modo infinito.", "Survive 50 questions in infinite mode.", "adv", c => c.kind === "hold" && c.inf >= 50),
      AD("codex_2500", "🏛️", "Gran Biblioteca", "Great Library", "2.500 tarjetas.", "2,500 cards.", "codex", c => c.u >= 2500),
      AD("codex_capitals_all", "🎩", "Embajador", "Ambassador", "Todas las capitales del mundo en la Enciclopedia.", "Every world capital in the Encyclopedia.", "codex", c => !!c.by.capital && c.by.capital[1] > 0 && c.by.capital[0] >= c.by.capital[1]),
      AD("adv_wins10", "🤵", "Habitual de la casa", "House regular", "Gana 10 expediciones.", "Win 10 expeditions.", "adv", () => ADV().wins >= 10),
      AD("adv_blindwin", "🙈", "Fe ciega", "Blind faith", "Gana una expedición con la baraja Aventurero ciego.", "Win an expedition with the Blind adventurer deck.", "adv", c => c.kind === "win" && c.deck === "blind"),
      AD("adv_alldecks", "🃏", "Cuatro palos", "Four suits", "Gana una expedición con cada una de las 4 barajas.", "Win an expedition with each of the 4 decks.", "adv", () => deckWins() >= 4),
      AD("q_10000", "📜", "Sabio de los mapas", "Map sage", "10.000 preguntas respondidas.", "10,000 questions answered.", "q", () => S().questions >= 10000),
      AD("bull_1000", "🏵️", "As de diana", "Ace shot", "1.000 dianas en total.", "1,000 bullseyes in total.", "q", () => S().bulls >= 1000),
      AD("classic_goldall", "👑", "Oro puro", "Solid gold", "Medalla de oro en todas las campañas del Clásico.", "Gold medal in every Classic campaign.", "classic", () => classicIds().every(id => P.medals[id] === "gold")),
      AD("codex_all", "👑", "Completista", "Completionist", "Desbloquea todas las tarjetas.", "Unlock every card.", "codex", c => c.u >= c.t),
      AD("casino_banco", "🏦", "Banca privada", "Private bank", "Ten 177 doblones a la vez.", "Hold 177 doubloons at once.", "casino", c => c.kind === "hold" && c.coins >= 177),
      AD("codex_eu", "🏰", "Europa de cabo a rabo", "Europe, end to end", "Desbloquea todas las tarjetas de Europa.", "Unlock every Europe card.", "codex", c => contDone(c, "eu")),
      AD("codex_as", "🏯", "Asia de punta a punta", "Asia, coast to coast", "Desbloquea todas las tarjetas de Asia.", "Unlock every Asia card.", "codex", c => contDone(c, "as")),
      AD("codex_af", "🦁", "África sin secretos", "Africa unveiled", "Desbloquea todas las tarjetas de África.", "Unlock every Africa card.", "codex", c => contDone(c, "af")),
      AD("codex_na", "🗽", "Norteamérica al completo", "North America, complete", "Desbloquea todas las tarjetas de Norteamérica.", "Unlock every North America card.", "codex", c => contDone(c, "na")),
    ]),
    /* ---- secretos ---- */
    ...tier(5, [
      AD("marathon", "🏃", "Maratón", "Marathon", "50 preguntas en una sesión.", "50 questions in one session.", "q", () => A._sessionQ >= 50, true),
      AD("night", "🌙", "Búho", "Night owl", "Juega pasada la medianoche.", "Play past midnight.", "q", () => new Date().getHours() < 5, true),
      AD("casino_cero", "🟢", "Cero verde", "Green zero", "Acierta el verde en Rojo o negro y salta un acto.", "Hit green in Red or black and skip an act.", "casino", c => !!c.green, true),
      AD("casino_canto", "🪙", "De canto", "On its edge", "La moneda cae de canto en Moneda al aire.", "The coin lands on its edge in Coin flip.", "casino", c => !!c.edge, true),
      AD("casino_espacial", "🚀", "Misión espacial", "Space mission", "Cobra El globo a ×77 o más.", "Cash out The balloon at ×77 or more.", "casino", c => c.kind === "play" && c.mult >= 77, true),
      AD("antipodas", "🌐", "Al otro lado del mundo", "Other side of the world", "Responde con más de 15.000 km de error.", "Answer with more than 15,000 km of error.", "q", c => c.km != null && c.km > 15000, true),
      AD("casino_falso", "🃏", "Con la guardia baja", "Caught off guard", "Don Crupier te cuela un logro falso.", "Don Crupier slips you a fake achievement.", "dealer", () => true, true),
      AD("adv_ascmax", "🎩", "Jubila al crupier", "Retire the dealer", "Gana una expedición en la Ascensión máxima.", "Win an expedition at max Ascension.", "adv", c => c.kind === "act" && c.act >= 3 && !c.daily && c.asc >= 5, true),
    ]),
  ];
  A._sessionQ = 0;

  /* progreso de los logros acumulativos, como en Steam ("37 / 100"): id -> [actual, meta] */
  const cx = c => (k => (c.by[k] || [0, 0])[0]);
  const PROG = {
    q_1000: () => [S().questions, 1000], q_5000: () => [S().questions, 5000], q_10000: () => [S().questions, 10000],
    bull_25: () => [S().bulls, 25], bull_100: () => [S().bulls, 100], bull_500: () => [S().bulls, 500], bull_1000: () => [S().bulls, 1000],
    
    streak_5: () => [S().bestStreak, 5], streak_10: () => [S().bestStreak, 10], streak_20: () => [S().bestStreak, 20], streak_50: () => [S().bestStreak, 50],
    km_equator: () => [Math.floor(S().km), 40075],
    adv_boss5: () => [ADV().boss, 5], adv_runs10: () => [ADV().runs, 10], adv_wins10: () => [ADV().wins, 10], adv_alldecks: () => [deckWins(), 4],
    daily_30: () => [dailyDays(), 30],
    classic_all: () => [classicIds().filter(won).length, classicIds().length], classic_gold5: () => [golds(), 5], classic_goldall: () => [golds(), classicIds().length],
    casino_tour: () => [Object.keys((P.casino || {}).games || {}).length, 8],
    codex_eu: c => c && c.cont && c.cont.eu && c.cont.eu.slice(), codex_as: c => c && c.cont && c.cont.as && c.cont.as.slice(), codex_af: c => c && c.cont && c.cont.af && c.cont.af.slice(),
    codex_na: c => c && c.cont && c.cont.na && c.cont.na.slice(), codex_sa: c => c && c.cont && c.cont.sa && c.cont.sa.slice(), codex_oc: c => c && c.cont && c.cont.oc && c.cont.oc.slice(),
    codex_10: c => c && [c.u, 10], codex_50: c => c && [c.u, 50], codex_100: c => c && [c.u, 100], codex_250: c => c && [c.u, 250], codex_500: c => c && [c.u, 500],
    codex_1000: c => c && [c.u, 1000], codex_2500: c => c && [c.u, 2500], codex_all: c => c && [c.u, c.t],
    codex_people: c => c && [cx(c)("person"), 25], codex_capitals: c => c && [cx(c)("capital"), 40], codex_capitals_all: c => c && [cx(c)("capital"), (c.by.capital || [0, 0])[1]],
    codex_events: c => c && [cx(c)("battle") + cx(c)("event"), 20], codex_nature: c => c && [cx(c)("nature"), 30], codex_water: c => c && [cx(c)("water"), 15],
    codex_strait: c => c && [cx(c)("strait"), 8], codex_curio: c => c && [cx(c)("curiosity"), 100], codex_city: c => c && [cx(c)("city"), 100],
    codex_country50: c => c && [cx(c)("country"), 50], codex_country: c => c && [cx(c)("country"), 190], codex_place: c => c && [cx(c)("landmark"), 20],
  };

  const queue = []; let showing = false;
  function toast() {
    if (showing || !queue.length) return; showing = true;
    const a = queue.shift(); if (a.fake) return fakeToast(a);
    let el = document.getElementById("achToast");
    if (!el) { el = document.createElement("div"); el.id = "achToast"; el.className = "ach-toast hidden"; (document.getElementById("leftCol") || document.getElementById("app")).appendChild(el); }
    el.innerHTML = `<span class="ach-ico">${A.badge(a.id)}</span><span class="ach-t"><em>${A.T("Logro desbloqueado", "Achievement unlocked")}</em><b>${A.tx(a.name)}</b><i>${A.tx(a.desc)}</i></span>`;
    el.classList.remove("hidden", "in"); A.restyle(el); el.classList.add("in"); A.sfx.ach();
    if (A.dealer && A.dealer.noteAch) A.dealer.noteAch(a);                       // el crupier lo comenta a veces (js/dealer.js)
    setTimeout(() => { el.classList.add("hidden"); showing = false; setTimeout(toast, 250); }, 4600);
  }
  /* EL LOGRO FALSO del crupier (js/dealer.js): identico a un aviso de verdad (mismo sonido), con su cara en la ficha; al segundo le cae el sello
     "De broma", el crupier se rie y el aviso se tuerce y se cae. No pasa por P.ach, ni por el contador ni por Steam. Va en #app (se ve tambien en el inicio) */
  const STAMP = "De broma|Just kidding|Pour rire|De brincadeira|Nur Spaß|Per scherzo||开玩笑的|농담|冗談|Шутка|Żart";
  function fakeToast(a) {
    let el = document.getElementById("achFake");
    if (!el) { el = document.createElement("div"); el.id = "achFake"; document.getElementById("app").appendChild(el); }
    el.innerHTML = `<span class="ach-ico"><span class="ic badge">${A.icon("blank_boss", "bd-base")}${A.icon("dealer_mini_laugh", "bd-in")}</span></span><span class="ach-t"><em>${A.T("Logro desbloqueado", "Achievement unlocked")}</em><b>${a.name}</b><i>${a.desc}</i></span><b class="ach-stamp">${A.pick6(STAMP)}</b>`;
    el.className = "ach-toast ach-fake"; A.restyle(el); el.classList.add("in"); A.sfx.ach();
    setTimeout(() => { el.classList.add("fooled"); A.sfx.stamp(); if (A.haptic) A.haptic([30, 40, 70]); A.ach.emit("dealer", { fake: true }); }, 1300);
    setTimeout(() => { if (a.then) a.then(); }, 2000);
    setTimeout(() => el.classList.add("drop"), 4300);
    setTimeout(() => { el.className = "ach-toast ach-fake hidden"; showing = false; setTimeout(toast, 250); }, 5200);
  }
  A.ach = {
    fake(o) { if (showing || queue.length) return false; queue.push(Object.assign({ fake: true }, o)); toast(); return true; },
    busy: () => showing || queue.length > 0,
    emit(ev, ctx) {
      ctx = ctx || {}; let n = 0;
      for (const a of A.ACH) {
        if (a.ev !== ev || P.ach[a.id]) continue;
        let ok = false; try { ok = a.test(ctx); } catch (e) { ok = false; }
        if (!ok) continue;
        P.ach[a.id] = Date.now(); n++; queue.push(a); if (A.steam && A.steam.unlock) A.steam.unlock(a.id);
      }
      if (n) { save(); toast(); }
    },
    count: () => A.ACH.filter(a => P.ach[a.id]).length, total: () => A.ACH.length,          // un logro retirado (classic_win) no cuenta aunque siga en el perfil
    /* progreso de todos los acumulativos de una vez (la Enciclopedia se cuenta una sola vez) */
    progress() {
      let c = null; try { if (A.codexStats && A.codex && A.codex.byType) { const st = A.codexStats(); c = { u: st.u, t: st.t, by: A.codex.byType(), cont: A.codex.byCont ? A.codex.byCont() : {} }; } } catch (e) { c = null; }
      const out = {};
      for (const id in PROG) { try { const v = PROG[id](c); if (v && v[1] > 0) out[id] = [Math.max(0, Math.min(v[0] || 0, v[1])), v[1]]; } catch (e) { /* sin datos */ } }
      return out;
    },
  };

  /* ---------------------------------------------------------------- registro de una pregunta */
  const BULL_KM = 25;
  A.profile.question = ({ km, inside, area, ratio, streak, left, limit, timeout }) => {
    const s = P.stats; s.questions++; A._sessionQ++;
    if (timeout) { s.timeouts++; save(); A.ach.emit("q", { timeout: true }); return; }
    s.km += km || 0; s.seconds += Math.max(0, limit - left); if (ratio >= 0.4) s.hits++;
    const bull = inside || area || (km != null && km <= BULL_KM); if (bull) s.bulls++; if (inside) s.inside++;
    s.bestStreak = Math.max(s.bestStreak, streak);
    save(); A.ach.emit("q", { km, ratio, bull, used: limit - left, left, inside, area });
  };

  /* Steam: al arrancar se reenvia lo ya conseguido (activar un logro ya activo no hace nada): si Steam no estaba abierto cuando lo ganaste, no se pierde */
  if (A.steam && A.steam.unlock) A.ACH.forEach(a => { if (P.ach[a.id]) try { Promise.resolve(A.steam.unlock(a.id)).catch(() => {}); } catch (e) { /* sin Steam */ } });
})(window.AIQ);
