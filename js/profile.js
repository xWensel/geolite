/*
 * Geolite - perfil del jugador (v0.6): estadisticas, records, progreso de la Aventura y logros.
 * Todo vive en localStorage; la capa `A.steam` (si existe) recibe los logros para Steamworks.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const KEY = "atlasiq.profile.v1";

  /* el id del jugador es su unica llave en la clasificacion (api/submit.js: con el se cambia su nombre en todas las tablas). v0.3.235: 20 letras y
     cifras del generador criptografico (~103 bits), como el sid de js/vivo.js; antes Math.random + la hora (16, adivinable). Los perfiles que ya
     existen conservan su id (sus filas en las tablas van con el); a-z0-9 y hasta 24, lo que acepta el servidor */
  const newId = () => { const AB = "abcdefghijklmnopqrstuvwxyz0123456789", b = new Uint8Array(20); try { crypto.getRandomValues(b); } catch (e) { for (let i = 0; i < 20; i++) b[i] = Math.random() * 256; } return [...b].map(x => AB[x % 36]).join(""); };
  const defaults = () => ({
    v: 1, id: newId(), name: "", created: Date.now(),
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
    for (const b in P.boards) if (!Array.isArray(P.boards[b])) delete P.boards[b];
    for (const b in P.daily) if (!P.daily[b] || typeof P.daily[b] !== "object") delete P.daily[b];
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
  const NAME_MAX = 16;
  /* solo letras de los alfabetos del juego (latino, cirilico, griego, han, kana, hangul), cifras, espacio y _ . ' - ; fuera los rellenos
     invisibles (hangul U+115F/1160/3164/FFA0), emojis y simbolos; no empieza por signo ni repite signos (el mismo filtro en api/submit.js y api/duelo.js) */
  const clean = n => [...String(n || "").normalize("NFC").replace(/[ᅟᅠㅤﾠ]/g, "").replace(/[^\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Nd} _.'\-ー]/gu, "").replace(/\s+/g, " ").replace(/^[ _.'\-ー]+/, "").replace(/([_.'\-])\1+/g, "$1")].slice(0, NAME_MAX).join("");
  A.profile = {
    get: () => P, save, NAME_MAX, clean,
    /* v0.3.236: el Clasico entero (las 12 campanas ganadas): el segundo final del juego (js/game.js, endScreen; js/dealer.js, endGame) */
    classicWon: () => classicIds().filter(won).length, classicTotal: () => classicIds().length, classicDone: () => classicIds().length > 0 && classicIds().every(won),
    /* guarda el nombre y lo apunta en P.nameLog (los que ya has usado: el crupier "ya te conoce" si vuelves a uno) */
    setName(n) {
      P.name = clean(n).trim();
      if (P.name) { const low = P.name.toLowerCase(); P.nameLog = [P.name, ...(P.nameLog || []).filter(x => x.toLowerCase() !== low)].slice(0, 8); P.nameAsk = 0; }
      save(); return P.name;
    },
    knownName: n => { const low = clean(n).trim().toLowerCase(); return !!low && (P.nameLog || []).some(x => x.toLowerCase() === low); },
    /* records[board] = mejor puntuacion; devuelve true si es nuevo record */
    record(board, score) { const old = P.records[board] || 0; if (score > old) { P.records[board] = score; save(); return true; } return false; },
    /* una cancion de la banda que ha sonado hasta el final (js/audio.js): P.songs[indice] */
    song(i, of) { if (!(i >= 0)) return; const s = P.songs = (P.songs && typeof P.songs === "object") ? P.songs : {}; if (s[i]) return; s[i] = 1; save(); A.ach.emit("casa", { kind: "song", n: Object.keys(s).length, of: of || 22 }); },
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
  const clubLv = () => (A.club ? A.club.level() : 0);                     // v2: los logros del Club (sustituyen a los del Reto diario, apagado)
  /* Tramos de dificultad (secciones del Perfil): de menos a mas dificil y de menos a mas horas de juego; los secretos, al final.
   * El orden no importa a Steam (el "API name" es el id). Todos comprobados como alcanzables (v0.34, 100 logros: el tope de Steam).
   * REVISION DEL 12-NOV (votada): salen 11 peldanos de relleno, entran 4 a la vista y 7 secretos (16 secretos). NINGUNO del Duelo ni del modo Barra
   * de la casa: ninguno de los dos avisa a A.ach (los casino_* son de la barra del Campamento, dentro de la Aventura). ev "casa" = la tienda, la
   * musica, los huevos, la siesta y los creditos. */
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
      AD("adv_bribe", "💸", "Bajo la mesa", "Under the table", "Soborna al crupier para quitar un reto.", "Bribe the dealer to remove a challenge.", "adv", c => c.kind === "bribe"),
      AD("perfect", "💯", "Ronda perfecta", "Perfect round", "Acierta bien todas las preguntas de un nivel del Clásico.", "Nail every question in a Classic level.", "level", c => c.perfect),
      AD("adv_boss", "🐉", "Cazajefes", "Boss slayer", "Derrota a un jefe.", "Defeat a boss.", "adv", c => c.kind === "boss"),
      AD("adv_act1", "🌅", "Las rutas conocidas", "The known roads", "Completa el Acto I.", "Complete Act I.", "adv", c => c.kind === "act" && c.act >= 1),
      AD("codex_100", "🏛️", "Erudito", "Scholar", "Consigue 100 tarjetas de la Enciclopedia.", "Collect 100 Encyclopedia cards.", "codex", c => c.u >= 100),
      AD("shop_first", "🛍️", "De estreno", "Brand new", "Compra tu primera pieza en la tienda.", "Buy your first piece in the shop.", "casa", c => c.kind === "buy"),
      AD("streak_10", "☄️", "Imparable", "Unstoppable", "Racha de 10 aciertos.", "10-hit streak.", "q", () => S().bestStreak >= 10),
      AD("club_10", "🃏", "Socio del club", "Card-carrying member", "Llega al nivel 10 del Club de la casa.", "Reach level 10 of the House Club.", "club", () => clubLv() >= 10),
      AD("classic_world", "🌍", "Vuelta al mundo", "Round the world", "Termina la campaña Mundo.", "Finish the World campaign.", "classic", () => won("c-game1")),
      AD("casino_first", "🎲", "A la mesa", "Pull up a chair", "Juega tu primer juego del casino.", "Play your first casino game.", "casino", c => c.kind === "play"),
    ]),
    /* ---- III. unas horas (1-5 h) ---- */
    ...tier(2, [
      AD("last_second", "⏱️", "Por los pelos", "By a whisker", "Acierta bien con menos de 1 segundo restante.", "Nail it with under 1 second left.", "q", c => c.ratio >= 0.75 && c.left != null && c.left < 1 && c.left > 0),
      AD("codex_capitals", "🏙️", "Diplomático", "Diplomat", "Consigue 40 capitales en la Enciclopedia.", "Collect 40 capitals in the Encyclopedia.", "codex", c => (c.by.capital || [0])[0] >= 40),
      AD("codex_water", "🌊", "Aguas tranquilas", "Calm waters", "Consigue 15 mares u océanos en la Enciclopedia.", "Collect 15 seas or oceans in the Encyclopedia.", "codex", c => (c.by.water || [0])[0] >= 15),
      AD("codex_nature", "🌋", "Naturalista", "Naturalist", "30 lugares de naturaleza en la Enciclopedia.", "30 nature entries in the Encyclopedia.", "codex", c => (c.by.nature || [0])[0] >= 30),
      AD("codex_people", "🧑‍🎨", "Historiador", "Historian", "Consigue 25 personajes históricos en la Enciclopedia.", "Collect 25 historical figures in the Encyclopedia.", "codex", c => (c.by.person || [0])[0] >= 25),
      AD("codex_events", "⚔️", "Cronista", "Chronicler", "Consigue 20 batallas y sucesos en la Enciclopedia.", "Collect 20 battles and events in the Encyclopedia.", "codex", c => ((c.by.battle || [0])[0] + (c.by.event || [0])[0]) >= 20),
      AD("bull_25", "🎯", "Pulso de cirujano", "Surgeon's aim", "25 dianas en total.", "25 bullseyes in total.", "q", () => S().bulls >= 25),
      AD("adv_flawless", "🛡️", "Sin un rasguño", "Not a scratch", "Completa un acto sin perder provisiones.", "Complete an act without losing a provision.", "adv", c => c.kind === "act" && c.flawless),
      AD("codex_country50", "🛃", "Trotamundos", "Globetrotter", "50 países en la Enciclopedia.", "50 countries in the Encyclopedia.", "codex", c => (c.by.country || [0])[0] >= 50),
      /* Clasico: un logro por campana (las 11), todas, oros y sin fallar. Sin "termina una cualquiera": saltaba siempre a la vez que el de la campana terminada. */
      AD("classic_capitals", "🏛️", "Gira de capitales", "Capital tour", "Termina Capitales del mundo.", "Finish World Capitals.", "classic", () => won("c-worldcapitals")),
      AD("classic_europe", "🏰", "Grand Tour", "Grand Tour", "Termina Europa.", "Finish Europe.", "classic", () => won("c-europe")),
      AD("classic_latam", "💃", "Tierra latina", "Latin spirit", "Termina Latinoamérica.", "Finish Latin America.", "classic", () => won("c-centralsouthamerica")),
      AD("classic_usa", "🗽", "Sueño americano", "American dream", "Termina Norteamérica.", "Finish North America.", "classic", () => won("c-usa")),
      AD("classic_asia", "🏯", "Ruta de la seda", "Silk road", "Termina Asia.", "Finish Asia.", "classic", () => won("c-asia")),
      AD("classic_oceania", "🏄", "Al fin del mundo", "Down under", "Termina Oceanía.", "Finish Oceania.", "classic", () => won("c-oceania")),
      AD("adv_act2", "🌄", "Más allá del mapa", "Beyond the map", "Completa el Acto II.", "Complete Act II.", "adv", c => c.kind === "act" && c.act >= 2),
      AD("adv_lastlife", "💔", "Al filo", "On the edge", "Derrota a un jefe con una sola provisión.", "Defeat a boss with a single provision left.", "adv", c => c.kind === "boss" && c.lives === 1),
      AD("classic_clean", "🎪", "Sin red", "No safety net", "Termina una campaña del Clásico desde el nivel 1 sin fallar ninguno.", "Finish a Classic campaign from level 1 without failing a single level.", "classic", c => !!(c.win && c.clean)),
      AD("adv_boss5", "☠️", "Cazarrecompensas", "Bounty hunter", "Derrota a 5 jefes en total.", "Defeat 5 bosses in total.", "adv", () => ADV().boss >= 5),
      AD("codex_curio", "🎲", "Culturilla general", "Trivia buff", "Consigue 100 curiosidades en la Enciclopedia.", "Collect 100 curiosities in the Encyclopedia.", "codex", c => (c.by.curiosity || [0])[0] >= 100),
      AD("pixel", "🔬", "Al milímetro", "To the millimeter", "Acierta a menos de 5 km.", "Land within 5 km.", "q", c => c.km != null && c.km <= 5 && !c.inside && !c.area),   // dentro del pais es km 0: eso ya es Diana, no punteria de 5 km
      AD("q_1000", "🗺️", "Cartógrafo", "Cartographer", "1.000 preguntas respondidas.", "1,000 questions answered.", "q", () => S().questions >= 1000),
    ]),
    /* ---- IV. jugador habitual (5-20 h) ---- */
    ...tier(3, [
      AD("codex_500", "🌟", "Enciclopedista", "Encyclopedist", "Consigue 500 tarjetas de la Enciclopedia.", "Collect 500 Encyclopedia cards.", "codex", c => c.u >= 500),
      AD("classic_flags", "🚩", "Abanderado", "Standard-bearer", "Termina Banderas.", "Finish Flags.", "classic", () => won("c-flags")),
      AD("classic_clues", "🕵️", "Detective", "Sleuth", "Termina Pistas.", "Finish Clues.", "classic", () => won("c-clues")),
      AD("classic_events", "📜", "Testigo de la historia", "Witness to history", "Termina Eventos históricos.", "Finish Historic Events.", "classic", () => won("c-events")),
      AD("classic_people", "🎭", "Biógrafo", "Biographer", "Termina Personajes históricos.", "Finish Historical Figures.", "classic", () => won("c-people")),
      AD("classic_mix", "🧵", "Cajón de sastre", "Odds and ends", "Termina Mezcla.", "Finish Mixed Bag.", "classic", () => won("c-mix")),
      AD("juke_all", "🎷", "Melómano", "Music lover", "Escucha las 22 canciones de la banda de la casa.", "Listen to all 22 songs by the house band.", "casa", c => c.kind === "song" && c.n >= c.of),
      AD("streak_20", "🌋", "Erupción", "Eruption", "Racha de 20 aciertos.", "20-hit streak.", "q", () => S().bestStreak >= 20),
      AD("adv_win", "🗿", "Terra Incognita", "Terra Incognita", "Completa el Acto III y gana la expedición.", "Complete Act III and win the expedition.", "adv", c => c.kind === "act" && c.act >= 3 && !c.daily),
      AD("adv_asc", "⛰️", "Ascensión", "Ascension", "Gana una expedición en Ascensión 1 o más.", "Win an expedition at Ascension 1 or higher.", "adv", c => c.kind === "act" && c.act >= 3 && !c.daily && c.asc >= 1),
      AD("classic_gold1", "🥇", "Oro a la vista", "First gold", "Consigue tu primera medalla de oro en el Clásico.", "Earn your first Classic gold medal.", "classic", () => golds() >= 1),
      AD("bull_100", "🏹", "Ojo de halcón", "Hawk eye", "100 dianas en total.", "100 bullseyes in total.", "q", () => S().bulls >= 100),
      /* tras ganar, el modo infinito no tiene actos: "Llega al Acto V" era imposible; se cuentan preguntas aguantadas (js/adventure.js, afterQuestion) */
      AD("adv_endless", "♾️", "Leyenda", "Legend", "Aguanta 25 preguntas en el modo infinito.", "Survive 25 questions in infinite mode.", "adv", c => c.kind === "hold" && c.inf >= 25),
      AD("adv_fullhouse", "🎰", "Pleno", "Clean sweep", "5 dianas en una misma ronda de la Aventura.", "5 bullseyes in a single Adventure round.", "adv", c => c.kind === "clear" && c.bulls >= 5),
      AD("adv_legendary", "💎", "Botín legendario", "Legendary loot", "Consigue una reliquia legendaria en un cofre de jefe.", "Get a legendary relic from a boss chest.", "adv", c => c.kind === "legend" && c.chest),   // solo la del cofre
      AD("codex_1000", "📚", "Bibliotecario", "Librarian", "Consigue 1.000 tarjetas de la Enciclopedia.", "Collect 1,000 Encyclopedia cards.", "codex", c => c.u >= 1000),
      AD("adv_score100k", "🎇", "Premio gordo", "Jackpot", "100.000 puntos en una sola expedición.", "100,000 points in a single expedition.", "adv", c => c.kind === "end" && c.score >= 100000),
      AD("speed_master", "🎩", "Reflejos de crupier", "Dealer reflexes", "Acierta muy bien en menos de 1 segundo.", "Nail it almost perfectly in under 1 second.", "q", c => c.ratio >= 0.9 && c.used != null && c.used <= 1),
      AD("classic_all", "🏆", "Maestro del Clásico", "Classic master", "Termina todas las campañas del Clásico.", "Finish every Classic campaign.", "classic", () => classicIds().every(won)),
      AD("casino_tour", "🗺️", "Gira del casino", "Casino tour", "Juega los 8 juegos del casino.", "Play all 8 casino games.", "casino", c => c.kind === "play" && c.played >= 8),
      AD("codex_sa", "🦙", "Sudamérica de norte a sur", "South America, top to bottom", "Desbloquea todas las tarjetas de Sudamérica.", "Unlock every South America card.", "codex", c => contDone(c, "sa")),
      AD("codex_oc", "🏝️", "Todas las islas", "Every island", "Desbloquea todas las tarjetas de Oceanía.", "Unlock every Oceania card.", "codex", c => contDone(c, "oc")),
    ]),
    /* ---- V. maestria (20 h o mas) ---- */
    ...tier(4, [
      AD("classic_gold5", "🪙", "Cinco de oros", "Gold rush", "Medalla de oro en 5 campañas del Clásico.", "Gold medal in 5 Classic campaigns.", "classic", () => golds() >= 5),
      AD("adv_asc2", "⛰️", "Ascensión II", "Ascension II", "Gana una expedición en Ascensión 2 o más.", "Win an expedition at Ascension 2 or higher.", "adv", c => c.kind === "act" && c.act >= 3 && !c.daily && c.asc >= 2),
      AD("adv_flawless3", "🏵️", "Leyenda intachable", "Flawless legend", "Completa el Acto III sin perder provisiones.", "Complete Act III without losing a provision.", "adv", c => c.kind === "act" && c.flawless && c.act >= 3),
      AD("club_100", "👑", "La casa es tuya", "The house is yours", "Llega al nivel 100 del Club de la casa.", "Reach level 100 of the House Club.", "club", () => clubLv() >= 100),
      AD("codex_country", "🛂", "Pasaporte completo", "Full passport", "190 países en la Enciclopedia.", "190 countries in the Encyclopedia.", "codex", c => (c.by.country || [0])[0] >= 190),
      AD("streak_50", "🌪️", "Invencible", "Invincible", "Racha de 50 aciertos.", "50-hit streak.", "q", () => S().bestStreak >= 50),
      AD("adv_endless2", "🔥", "Mito", "Myth", "Aguanta 50 preguntas en el modo infinito.", "Survive 50 questions in infinite mode.", "adv", c => c.kind === "hold" && c.inf >= 50),
      AD("codex_2500", "🏛️", "Gran Biblioteca", "Great Library", "Consigue 2.500 tarjetas de la Enciclopedia.", "Collect 2,500 Encyclopedia cards.", "codex", c => c.u >= 2500),
      AD("codex_capitals_all", "🎩", "Embajador", "Ambassador", "Todas las capitales del mundo en la Enciclopedia.", "Every world capital in the Encyclopedia.", "codex", c => !!c.by.capital && c.by.capital[1] > 0 && c.by.capital[0] >= c.by.capital[1]),
      AD("adv_wins10", "🤵", "Habitual de la casa", "House regular", "Gana 10 expediciones.", "Win 10 expeditions.", "adv", () => ADV().wins >= 10),
      AD("adv_bare", "🎒", "Con lo puesto", "Travelling light", "Gana una expedición sin comprar nada en el Campamento.", "Win an expedition without buying anything at the Camp.", "adv", c => c.kind === "win" && !!c.bare),
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
      AD("casino_falso", "🃏", "Con la guardia baja", "Caught off guard", "Don Crupier te cuela un logro falso.", "The dealer slips you a fake achievement.", "dealer", () => true, true),
      AD("km_equator", "📏", "Despiste ecuatorial", "Equatorial blunder", "Acumula 40.075 km de error: una vuelta entera al mundo.", "Rack up 40,075 km of total error: one full lap of the Earth.", "q", () => S().km >= 40075, true),
      AD("egg_first", "🥚", "Curioso", "Curious", "Encuentra tu primer huevo de la casa.", "Find your first house egg.", "casa", c => c.kind === "egg" && c.n >= 1, true),
      AD("egg_all", "📓", "La libreta llena", "The full notebook", "Encuentra los 16 huevos de la casa.", "Find all 16 house eggs.", "casa", c => c.kind === "egg" && c.n >= c.of, true),
      AD("adv_77", "7️⃣", "Siete, siete", "Seven, seven", "Ten exactamente 77 doblones a la vez.", "Hold exactly 77 doubloons at once.", "adv", c => c.kind === "hold" && c.coins === 77, true),
      AD("adv_short", "🎁", "Premio de consolación", "Consolation prize", "Pierde una expedición en la primera ronda.", "Lose an expedition in the first round.", "adv", c => c.kind === "end" && !c.won && !!c.dead && c.round === 1, true),
      AD("comeback", "🪃", "Remontada", "Comeback", "Haz diana justo después de fallar por más de 5.000 km.", "Hit a bullseye right after missing by more than 5,000 km.", "q", c => !!c.back, true),
      AD("siesta", "💤", "La siesta", "The nap", "Deja la portada quieta hasta que el crupier se duerma.", "Leave the title screen alone until the dealer nods off.", "casa", c => c.kind === "siesta", true),
      AD("credits_end", "🎬", "Fin de fiesta", "Last one out", "Quédate en los créditos finales hasta el FIN, sin saltarlos.", "Stay through the end credits until THE END, without skipping.", "casa", c => c.kind === "credits", true),
      AD("adv_ascmax", "🎩", "Jubila al crupier", "Retire the dealer", "Gana una expedición en la Ascensión máxima.", "Win an expedition at max Ascension.", "adv", c => c.kind === "act" && c.act >= 3 && !c.daily && c.asc >= 5, true),
    ]),
  ];
  A._sessionQ = 0;

  /* progreso de los logros acumulativos, como en Steam ("37 / 100"): id -> [actual, meta] */
  const cx = c => (k => (c.by[k] || [0, 0])[0]);
  const PROG = {
    q_1000: () => [S().questions, 1000], q_10000: () => [S().questions, 10000],
    bull_25: () => [S().bulls, 25], bull_100: () => [S().bulls, 100], bull_1000: () => [S().bulls, 1000],
    
    streak_5: () => [S().bestStreak, 5], streak_10: () => [S().bestStreak, 10], streak_20: () => [S().bestStreak, 20], streak_50: () => [S().bestStreak, 50],
    juke_all: () => [Object.keys(P.songs || {}).length, A.music && A.music.count ? A.music.count() : 22],
    adv_boss5: () => [ADV().boss, 5], adv_wins10: () => [ADV().wins, 10], adv_alldecks: () => [deckWins(), 4],
    club_10: () => [Math.min(clubLv(), 10), 10], club_100: () => [Math.min(clubLv(), 100), 100],
    classic_all: () => [classicIds().filter(won).length, classicIds().length], classic_gold5: () => [golds(), 5], classic_goldall: () => [golds(), classicIds().length],
    casino_tour: () => [Object.keys((P.casino || {}).games || {}).length, 8],
    codex_eu: c => c && c.cont && c.cont.eu && c.cont.eu.slice(), codex_as: c => c && c.cont && c.cont.as && c.cont.as.slice(), codex_af: c => c && c.cont && c.cont.af && c.cont.af.slice(),
    codex_na: c => c && c.cont && c.cont.na && c.cont.na.slice(), codex_sa: c => c && c.cont && c.cont.sa && c.cont.sa.slice(), codex_oc: c => c && c.cont && c.cont.oc && c.cont.oc.slice(),
    codex_10: c => c && [c.u, 10], codex_100: c => c && [c.u, 100], codex_500: c => c && [c.u, 500],
    codex_1000: c => c && [c.u, 1000], codex_2500: c => c && [c.u, 2500], codex_all: c => c && [c.u, c.t],
    codex_people: c => c && [cx(c)("person"), 25], codex_capitals: c => c && [cx(c)("capital"), 40], codex_capitals_all: c => c && [cx(c)("capital"), (c.by.capital || [0, 0])[1]],
    codex_events: c => c && [cx(c)("battle") + cx(c)("event"), 20], codex_nature: c => c && [cx(c)("nature"), 30], codex_water: c => c && [cx(c)("water"), 15],
    codex_curio: c => c && [cx(c)("curiosity"), 100],
    codex_country50: c => c && [cx(c)("country"), 50], codex_country: c => c && [cx(c)("country"), 190],
  };

  const queue = []; let showing = false;
  /* L6 (revision del 12-nov): CADA LOGRO PAGA FICHAS DE ORO segun su tramo (los secretos, 25). P.achPaid[id] = ya cobrado. Con el truco de
     pruebas no se paga nada. Los que ya tenias de antes se cobran de una vez al entrar (backpay), con su aviso */
  const PAY = [5, 10, 15, 25, 40, 25];
  const canPay = () => !P.truco && A.club && A.club.give;
  function pay(a) { if (!canPay()) return 0; const pd = P.achPaid = (P.achPaid && typeof P.achPaid === "object") ? P.achPaid : {}; if (pd[a.id]) return 0; pd[a.id] = 1; const f = PAY[a.tier] || 0; A.club.give(f); return f; }
  function backpay() {
    if (!canPay()) return; const pd = P.achPaid = (P.achPaid && typeof P.achPaid === "object") ? P.achPaid : {}; let f = 0, k = 0;
    for (const a of A.ACH) if (P.ach[a.id] && !pd[a.id]) { pd[a.id] = 1; f += PAY[a.tier] || 0; k++; }
    if (!k) return; A.club.give(f); save(); queue.push({ back: true, n: k, f }); toast();
  }
  { let n = 0; const go = () => { if (A.club && A.club.give && A.core) backpay(); else if (n++ < 60) setTimeout(go, 500); }; setTimeout(go, 1500); }
  /* L7: «TE FALTA POCO». Al cerrar una ronda o una partida sin logro nuevo, un renglon en la bandeja con el que tienes mas cerca (del 80 % en
     adelante), nunca un secreto y cada uno una sola vez por sesion */
  const nearSeen = {};
  function near() {
    if (showing || queue.length) return; const pr = A.ach.progress(); let best = null, br = 0;
    for (const a of A.ACH) { if (P.ach[a.id] || a.secret || nearSeen[a.id]) continue; const v = pr[a.id]; if (!v || v[0] >= v[1]) continue; const r = v[0] / v[1]; if (r >= 0.8 && r > br) { best = a; br = r; } }
    if (!best) return; nearSeen[best.id] = 1; queue.push({ near: true, a: best, v: pr[best.id] }); toast();
  }
  const TXL = {
    near: "Te falta poco|Almost there|Tu y es presque|Falta pouco|Fast geschafft|Ci sei quasi||就差一点|거의 다 왔어요|あと少し|Осталось чуть-чуть|Już prawie",
    logros: "Logros|Achievements|Succès|Conquistas|Erfolge|Obiettivi||成就|업적|実績|Достижения|Osiągnięcia",
    fichas: "fichas de oro|gold chips|jetons d'or|fichas de ouro|Goldchips|fiche d'oro||金筹码|골드 칩|ゴールドチップ|золотых фишек|złotych żetonów",
    back: "Por los {n} logros que ya tenías. La casa paga sus deudas.|For the {n} achievements you already had. The house pays its debts.|Pour les {n} succès que tu avais déjà. La maison paie ses dettes.|Pelas {n} conquistas que você já tinha. A casa paga suas dívidas.|Für die {n} Erfolge, die du schon hattest. Das Haus zahlt seine Schulden.|Per i {n} obiettivi che avevi già. La casa paga i suoi debiti.||为你已有的 {n} 个成就。本店有债必还。|이미 달성한 업적 {n}개의 몫입니다. 하우스는 빚을 갚습니다.|すでに持っていた実績{n}個の分。店は借りを返します。|За {n} достижений, которые у тебя уже были. Заведение платит по счетам.|Za {n} osiągnięć, które już masz. Kasyno spłaca długi.",
    sec: "Secreto|Secret|Secret|Secreto|Geheim|Segreto||秘密|비밀|シークレット|Секрет|Sekret",
  };
  const FICHA = big => `<img class="ck-fi${big ? "" : " sm"}" src="assets/icons/ficha_oro.webp" alt="" draggable="false">`;   // la ficha de oro del Club, a sus dos tamaños de siempre (32 y 18 px)
  /* v0.3.35: EL AVISO TIENE SU ZONA, nunca tapa titulos ni HUD. En partida va bajo la placa (#leftCol, como siempre). Fuera de ella:
     - Campamento (y Cofre del jefe): la mesa no tiene hueco libre, asi que ocupa el sitio del titulo y el titulo se aparta mientras dura (body.ach-title)
     - pantallas con cabecera (Clasico, Aventura, Reto diario, Perfil, Notas): en la cabecera, entre el titulo y el engranaje
     - portada (y lo que se abra encima): bajo el boton de apagar, sin llegar al logo ni al panel de la Clasificacion
     - el resto (veredicto...): arriba a la izquierda, que esta libre
     Si cambia la pantalla con el aviso a la vista (del veredicto al Campamento, a la partida...), se recoloca. Saber la zona no mide nada (solo clases y
     nodos): solo se mide al cambiar de zona */
  let zoneSig = "", zoneT = 0;
  const HEAD = ".scr-head, .pf-head, .bq-head, .cl-head, .av-head, .pt-head, .du-st .hd";   // las cabeceras con titulo (menus del hub y pantallas del Naipe de gala). v0.3.205: + Clasico, Aventura, notas y Duelo (sin ellas el aviso caia arriba a la izquierda, encima de «Cerrar» y del titulo)
  function zoneOf() {
    const pl = document.getElementById("plate"), lay = document.getElementById("layer"), d = document.getElementById("dlg");
    if (pl && !pl.classList.contains("hidden")) return "run";
    if (!d || !lay || lay.classList.contains("hidden")) return "free";
    if (d.querySelector(".tb-head .tb-title")) return "camp";
    const h = d.querySelector(HEAD.split(", ").map(x => x + " h2").join(", ")); if (h) return "scr|" + h.textContent;
    if (d.querySelector(".gx-vd .gx-vd-acts")) return "vd";                      // v0.3.199: el veredicto tiene su bandeja (abajo a la izquierda)
    return d.classList.contains("home") && document.getElementById("quitBtn") ? (document.getElementById("pdWrap") ? "home|pd" : "home") : "free";
  }
  /* Bloque J: UN SOLO PAPEL Y UNAS MISMAS ZONAS para los avisos de logro y de cancion. La caja de cada zona en px de pantalla {x, w} y, o bien su
     arriba (y), o bien el centro vertical (cy: el aviso se centra con su alto ya medido). Partida: bajo la placa; Campamento: el sitio del titulo;
     pantallas con cabecera: su centro (entre el titulo y lo que haya a la derecha); portada: sobre el lema */
  /* v0.3.199 (Bloque F, paso 3): LOS AVISOS EN BANDEJA. Cada pantalla tiene un sitio fijo que no tapa nada y el aviso se reparte hasta el desde
     fuera, por el lado de su esquina (side: tl, tr, bl, br, t). Portada: arriba a la derecha, en espejo de la carta de socio (si el crupier esta de
     visita ahi, debajo de la carta de socio, a la izquierda); veredicto: abajo a la izquierda, bajo el cartel; Campamento: el sitio del titulo,
     sin la linea de descripcion para caber en su alto (mini) */
  function zoneBox(sig, W) {
    const d = document.getElementById("dlg"), col = document.getElementById("leftCol"), R = e => e.getBoundingClientRect(), C0 = col ? R(col) : { left: 0, top: 0, width: 0 };
    let x = C0.left, y = C0.top, w = W, cy = null, yb = null, side = "tl", mini = false;
    if (sig === "camp") { const t = R(d.querySelector(".tb-head .tb-title")); x = t.left; y = t.top; w = Math.min(W, t.width); mini = true; }
    else if (sig === "vd") {
      const h = d.querySelector(".gx-vd-head"), a = d.querySelector(".gx-vd-acts");
      if (h && a) { const Hr = R(h), Ar = R(a); x = Hr.left; w = Math.min(W, Hr.width); yb = Ar.bottom; side = "bl"; }
    }
    else if (sig.startsWith("scr|")) {
      const hd = d.querySelector(HEAD), h2 = hd.querySelector("h2"), H = R(hd), rg = document.createRange(); rg.selectNodeContents(h2);
      const right = [...hd.children].filter(c => c !== h2 && c.getBoundingClientRect().left > R(h2).right).map(c => R(c).left);   // lo que hay a su derecha: monedero, cifras, engranaje
      const a = R(rg).right + 24, b = (right.length ? Math.min(...right) : H.right) - 24; w = Math.max(200, Math.min(W, b - a));
      x = Math.min(Math.max(a, H.left + (H.width - w) / 2), b - w); cy = H.top + H.height / 2;
    } else if (sig.startsWith("home")) {
      const sc = document.getElementById("socioCard"), S = sc ? R(sc) : null;
      if (S && S.width) {
        const k = Math.min(innerWidth / 1920, innerHeight / 1080);
        w = Math.min(W, innerWidth - 32); x = innerWidth - S.left - w; y = S.top; side = "tr";
        /* el crupier de visita esta a la derecha, justo ahi: entonces la bandeja de abajo a la izquierda, bajo la carta de socio */
        const dl = document.getElementById("dealer"), cr = dl && dl.classList.contains("in") && dl.classList.contains("home") ? R(dl) : null;
        if (cr && cr.width && cr.left < x + w && cr.right > x && cr.top < y + 170 * k && cr.bottom > y) {
          const nx = d.querySelector(".hh-socio-nx"), c0 = d.querySelector(".hh-cards > .mcard"), B = nx && R(nx).height ? R(nx) : S;
          x = S.left; y = B.bottom + 16 * k; w = Math.min(W, (c0 ? R(c0).left : innerWidth) - S.left - 16 * k); side = "bl";
        }
      } else {
        const tg = d.querySelector(".hh-tag"), T = tg ? R(tg) : null, wd = Math.min(W, innerWidth - 32);
        if (T) { w = wd; x = T.left + (T.width - w) / 2; y = T.top - 8; side = "t"; } else { const q = R(document.getElementById("quitBtn")); x = q.left; y = q.bottom + 12; }
      }
    } else if (sig.startsWith("scr|")) side = "t";
    return { x, y, w, cy, yb, side, mini, run: sig === "run" };
  }
  /* de donde llega el aviso a su bandeja (y por donde se va): desde fuera de la pantalla, por su esquina */
  const LADO = { tl: [-260, -260, -14], tr: [260, -260, 14], bl: [-260, 260, 14], br: [260, 260, -14], t: [0, -220, 6] };
  function place(el) {
    const sig = zoneOf(); if (sig === zoneSig && el.isConnected) return; zoneSig = (A.relieve && A.relieve.vivo) ? "" : sig;   // v0.3.205: con la pantalla aun entrando, se vuelve a colocar en cuanto se pose
    const st = el.style, col = el.parentElement, R = e => e.getBoundingClientRect();
    document.body.classList.toggle("ach-title", sig === "camp");
    el.classList.toggle("free", sig !== "run");
    st.left = st.top = st.width = "";
    if (sig === "run" || !col) { el.classList.remove("mini"); el.removeAttribute("data-lz"); return; }
    const C0 = R(col), z = C0.width / (col.offsetWidth || C0.width) || 1, b = zoneBox(sig, Math.min(420, innerWidth - 32));   // z: por si #leftCol llevara zoom
    el.classList.toggle("mini", !!b.mini);
    st.width = Math.round(b.w / z) + "px";
    const y = b.yb != null ? b.yb - el.offsetHeight * z : b.cy != null ? b.cy - el.offsetHeight * z / 2 : b.y;   // el alto, ya con su ancho
    st.left = Math.round((b.x - C0.left) / z) + "px"; st.top = Math.round((y - C0.top) / z) + "px";
    const L = LADO[b.side] || LADO.tl; st.setProperty("--lz-ax", L[0] + "px"); st.setProperty("--lz-ay", L[1] + "px"); st.setProperty("--lz-ar", L[2] + "deg");
    if (A.relieve) A.relieve.pieza(el);                                                                       // su sombra, desde la lampara de esa pantalla
  }
  let dlW = 0;
  function toast() {
    if (showing || !queue.length) return;
    if (A.core && A.core.S && A.core.S.booting) { setTimeout(toast, 400); return; }   // con la puerta a oscuras (js/puerta.js) el aviso y su comentario esperan a que la casa abra
    if (A.dealer && A.dealer.asideOn && A.dealer.asideOn() && dlW++ < 20) { setTimeout(toast, 400); return; }   // v0.3.205: el crupier acaba su frase en esa pantalla: el aviso, despues (no encima)
    dlW = 0; showing = true;
    const a = queue.shift(); if (a.fake) return fakeToast(a);
    let el = document.getElementById("achToast");
    if (!el) { el = document.createElement("div"); el.id = "achToast"; el.className = "ach-toast hidden"; (document.getElementById("leftCol") || document.getElementById("app")).appendChild(el); }
    const soft = !!(a.near || a.back), x = a.near ? a.a : a, fx = A.fmt || String, tr = soft ? -1 : x.tier;   // soft: «te falta poco» y el cobro de atrasos (sin quema, sin crupier)
    el.innerHTML = a.back ? `<span class="ach-ico">${FICHA("big")}</span><span class="ach-t"><em>${A.pick6(TXL.logros)}</em><b>+${fx(a.f)} ${A.pick6(TXL.fichas)}</b><i>${A.pick6(TXL.back).replace("{n}", fx(a.n))}</i></span>`
      : a.near ? `<span class="ach-ico">${A.badge(x.id)}</span><span class="ach-t"><em>${A.pick6(TXL.near)}</em><b>${A.tx(x.name)}</b><i class="ach-pr"><span class="gx-bar"><i style="width:${Math.round(100 * a.v[0] / a.v[1])}%"></i></span><span>${fx(a.v[0])} / ${fx(a.v[1])}</span></i></span>`
      : `<span class="ach-ico">${A.badge(a.id)}</span><span class="ach-t"><em>${A.T("Logro desbloqueado", "Achievement unlocked")}</em><b>${A.tx(a.name)}</b><i>${A.tx(a.desc)}</i></span>${a._pay ? `<u class="ach-pay">+${a._pay}${FICHA()}</u>` : ""}${a.secret ? `<b class="ach-stamp">${A.pick6(TXL.sec)}</b>` : ""}`;
    el.classList.remove("hidden", "in", "out", "qm", "sealed"); el.classList.toggle("soft", soft); el.dataset.tr = tr; zoneSig = ""; place(el); A.restyle(el); el.classList.add("in");
    /* L8: EL AVISO CRECE CON EL LOGRO. El sonido sube con el tramo (0, +2, +4 semitonos; +7 los secretos), la quema dura mas, la Maestria
       se lleva el aplauso de la sala y al secreto le cae su sello */
    if (soft) { if (A.sfx.ui) A.sfx.ui(); } else A.sfx.ach(a.secret ? 7 : tr >= 4 ? 4 : tr >= 2 ? 2 : 0);
    if (!soft && tr === 4 && A.publico) A.publico("jackpot", 0.35);
    if (!soft && a.secret) setTimeout(() => { if (el.dataset.tr === "5" && !el.classList.contains("hidden")) { el.classList.add("sealed"); if (A.sfx.stamp) A.sfx.stamp(); if (A.haptic) A.haptic([30, 40, 70]); } }, 1100);
    if (!soft && A.celebra && A.celebra.logro) A.celebra.logro(el, tr);                       // v0.3.203: aparece quemandose en oro, en su sitio (js/celebra.js)
    clearInterval(zoneT); zoneT = setInterval(() => place(el), 250);              // la pantalla puede cambiar con el aviso a la vista
    if (!soft && A.dealer && A.dealer.noteAch) A.dealer.noteAch(a);              // el crupier lo comenta a veces (js/dealer.js)
    /* se va por donde vino (en la partida, como siempre) y deja paso al siguiente */
    setTimeout(() => {
      clearInterval(zoneT); const fin = () => { el.classList.add("hidden"); el.classList.remove("out"); document.body.classList.remove("ach-title"); showing = false; setTimeout(toast, 250); };
      if (A.celebra && A.celebra.logroFuera && A.celebra.logroFuera(el, fin)) return;   // y se va igual, quemandose
      el.classList.add("out"); setTimeout(fin, el.classList.contains("free") ? 300 : 0);
    }, soft ? 3800 : tr >= 4 ? 5600 : 4600);
  }
  /* EL LOGRO FALSO del crupier (js/dealer.js): identico a un aviso de verdad (mismo sonido), con su cara en la ficha; al segundo le cae el sello
     "De broma", el crupier se rie y el aviso se tuerce y se cae. No pasa por P.ach, ni por el contador ni por Steam. Va en #app (se ve tambien en el inicio) */
  const STAMP = "De broma|Just kidding|Pour rire|De brincadeira|Nur Spaß|Per scherzo||开玩笑的|농담|冗談|Шутка|Żart";
  function fakeToast(a) {
    let el = document.getElementById("achFake");
    if (!el) { el = document.createElement("div"); el.id = "achFake"; document.getElementById("app").appendChild(el); }
    el.innerHTML = `<span class="ach-ico"><span class="ic badge">${A.icon("blank_boss", "bd-base")}${A.icon("ach_casino_falso", "bd-in")}</span></span><span class="ach-t"><em>${A.T("Logro desbloqueado", "Achievement unlocked")}</em><b>${a.name}</b><i>${a.desc}</i></span><b class="ach-stamp">${A.pick6(STAMP)}</b>`;
    el.className = "ach-toast ach-fake"; A.restyle(el); el.classList.add("in"); A.sfx.ach();
    setTimeout(() => { el.classList.add("fooled"); A.sfx.stamp(); if (A.haptic) A.haptic([30, 40, 70]); A.ach.emit("dealer", { fake: true }); }, 1300);
    setTimeout(() => { if (a.then) a.then(); }, 2000);
    setTimeout(() => el.classList.add("drop"), 4300);
    setTimeout(() => { el.className = "ach-toast ach-fake hidden"; showing = false; setTimeout(toast, 250); }, 5200);
  }
  A.ach = {
    zone: () => { const sig = zoneOf(), b = zoneBox(sig, Math.min(420, innerWidth - 32)); return Object.assign({ sig: sig.split("|")[0] }, b); },   // la zona de avisos de ahora mismo (js/jukebox.js: la cancion usa la misma)
    backpay, near,                                                               // el cobro de atrasos (al entrar) y el «te falta poco» (L6 y L7)
    fake(o) { if (showing || queue.length) return false; queue.push(Object.assign({ fake: true }, o)); toast(); return true; },
    busy: () => showing || queue.length > 0,
    emit(ev, ctx) {
      if (A.adv && A.adv.isPractice && A.adv.isPractice()) return;      // la practica con la semilla de otro dia no da logros
      ctx = ctx || {}; let n = 0;
      for (const a of A.ACH) {
        if (a.ev !== ev || P.ach[a.id]) continue;
        let ok = false; try { ok = a.test(ctx); } catch (e) { ok = false; }
        if (!ok) continue;
        P.ach[a.id] = Date.now(); n++; a._pay = pay(a); queue.push(a); if (A.steam && A.steam.unlock && !P.truco) A.steam.unlock(a.id);     // P.truco: partida con el truco de pruebas (js/truco.js): nunca a Steam
      }
      if (n) { save(); toast(); }
      else if ((ev === "adv" && (ctx.kind === "clear" || ctx.kind === "end")) || ev === "level") setTimeout(near, 900);   // L7: sin logro nuevo al cerrar la ronda o la partida
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
    if (A.club) A.club.q(timeout ? 0 : ratio);                              // el Club de la casa: experiencia por precision (js/club.js)
    if (timeout) { s.timeouts++; A._lastKm = 0; save(); A.ach.emit("q", { timeout: true }); return; }
    s.km += km || 0; s.seconds += Math.max(0, limit - left); if (ratio >= 0.4) s.hits++;
    const bull = inside || area || (km != null && km <= BULL_KM); if (bull) s.bulls++; if (inside) s.inside++;
    s.bestStreak = Math.max(s.bestStreak, streak);
    const back = bull && A._lastKm > 5000; A._lastKm = bull ? 0 : (km || 0);         // «Remontada»: diana justo despues de fallar por mas de 5.000 km
    save(); A.ach.emit("q", { km, ratio, bull, used: limit - left, left, inside, area, back });
  };

  /* Steam: al arrancar se reenvia lo ya conseguido (activar un logro ya activo no hace nada): si Steam no estaba abierto cuando lo ganaste, no se pierde */
  if (A.steam && A.steam.unlock && !P.truco) A.ACH.forEach(a => { if (P.ach[a.id]) try { Promise.resolve(A.steam.unlock(a.id)).catch(() => {}); } catch (e) { /* sin Steam */ } });
})(window.AIQ);
