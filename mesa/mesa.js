/* Geolite - LA MESA DEL CRUPIER (mesa/index.html), rehecha en v0.4.70: la sala de realizacion del autor.
   Ve las partidas abiertas (api/mesa.js GET, cada 3 s) y actua por Don Crupier y Comodin en la partida elegida (o en todas). Cada orden vuelve con su
   numero (q) y el juego cuenta en su latido la ultima recibida (st.ak) y la ultima frase empezada (st.dk): la mesa marca enviada / le ha llegado / la
   esta diciendo. Su pantalla: video de punto a punto (WebRTC, el juego pide permiso al jugador) y, si su red no deja, fotos cada 1,5 s por el servidor.
   Todo lo que se puede lanzar esta tambien en el buscador (Ctrl+K). Los ids de todo son los del juego: js/crupier-data.js, js/vestuario.js,
   js/punteros.js, js/comodin.js, A.CHAL (js/challenges.js), A.trastadas, A.mesas (mesa/datos.js) y las frases de js/dealer.js (mesa/frases.js). */
(function () {
  const A = window.AIQ, $ = id => document.getElementById(id), Q = (s, el = document) => el.querySelector(s), QA = (s, el = document) => [...el.querySelectorAll(s)];
  const API = "/api/mesa", KEYS = "geolite.mesa.key";
  const LS = { get(k, d) { try { const v = localStorage.getItem("geolite.mesa." + k); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem("geolite.mesa." + k, v); } catch (e) { /* sin almacenamiento */ } } };
  let key = ""; try { key = localStorage.getItem(KEYS) || ""; } catch (e) { /* sin almacenamiento */ }
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fmt = n => n == null ? "—" : Math.round(n).toLocaleString("es-ES");
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const anyOf = a => a[Math.floor(Math.random() * a.length)];
  const toast = (t, ms = 2400) => { const el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), ms); };

  /* ================================================================ LO QUE CUENTA EL JUEGO (js/vivo.js state) */
  const LANG = { es: "español", en: "inglés", fr: "francés", pt: "portugués", de: "alemán", it: "italiano", "es-419": "español de Latinoamérica", zh: "chino", ko: "coreano", ja: "japonés", ru: "ruso", pl: "polaco" };
  const LANGS = { es: "español", en: "inglés", fr: "francés", pt: "portugués", de: "alemán", it: "italiano", "es-419": "latino", zh: "chino", ko: "coreano", ja: "japonés", ru: "ruso", pl: "polaco" };   // cortos, para la lista
  const PLAT = { web: "Web", movil: "Móvil", win: "Windows", linux: "Linux", deck: "Steam Deck", "win-demo": "Windows (demo)", "linux-demo": "Linux (demo)", "deck-demo": "Steam Deck (demo)" };
  const HUB = { home: "En la portada", classic: "Eligiendo campaña", adventure: "Mirando la Aventura", daily: "Mirando el Reto diario", duelo: "Mirando el Duelo", codex: "En la Enciclopedia", profile: "En su Perfil", patch: "Leyendo las notas del parche", barra: "En la Barra de la casa", club: "En el Club", tienda: "En la tienda" };
  const KIND = { clue: "pista", flag: "bandera", country: "país", capital: "capital", city: "ciudad", person: "personaje", event: "suceso" };
  const ASCN = ["", "I", "II", "III", "IV", "V"];
  const MODE = { aventura: "Aventura", reto: "Reto diario", clasico: "Clásico" };
  const isMenu = st => !st.sc || st.sc.startsWith("menu:");
  function where(st) {
    if (isMenu(st)) return HUB[(st.sc || "").slice(5)] || "En los menús";
    const md = MODE[st.md] || "Partida";
    if (st.sc === "campamento") return `${md} · Campamento tras la ronda ${st.r - 1 || 1}`;
    const r = st.sc === "infinito" ? "modo infinito" : st.md === "clasico" ? `nivel ${st.r}` : `ronda ${st.r} de 12`;
    return `${md} · ${r}`;
  }
  const WAIT = { tutorial: "Está en el tutorial: lo que digas espera a que lo acabe (90 s como mucho).", nombre: "Le está pidiendo su nombre: lo que digas espera a que conteste.", siesta: "El crupier duerme la siesta en su pantalla: lo que digas le despierta al acabar.", casino: "Está en un juego de la Barra: lo que digas espera a que salga.", arranque: "Su juego está arrancando." };
  const doing = st => !st.q ? "" : st.ph === "asking" ? `Buscando <b>${esc(st.q)}</b>${st.k ? " · " + esc(KIND[st.k] || st.k) : ""}` : st.ph === "reveal" ? `Acaba de buscar <b>${esc(st.q)}</b>` : "";
  const since = t0 => { const m = Math.max(0, Math.round((Date.now() - t0) / 60000)); return m < 60 ? m + " min" : Math.floor(m / 60) + " h " + (m % 60) + " min"; };
  const ORD = ["es", "en", "fr", "pt", "de", "it", "es-419", "zh", "ko", "ja", "ru", "pl"];
  const phrase = (s, l) => { const a = String(s).split("|"); return a[ORD.indexOf(l)] || a[0]; };
  const lang = () => (selSt && selSt.l) || "es";
  const same = l => l === "es" || l === "es-419";
  const flagOf = l => `../assets/icons/flag_${esc(l || "es")}.webp`;

  /* ================================================================ CATALOGOS (ids del juego) */
  /* las frases de la mesa: las lees en espanol y le llegan TRADUCIDAS (no son del juego) */
  const QUICK = [
    ["laugh", "Te estoy viendo.|I can see you.|Je te vois.|Estou te vendo.|Ich sehe dich.|Ti sto guardando.|Te estoy viendo.|我看着你呢。|다 보고 있어.|見てるぞ。|Я тебя вижу.|Widzę cię."],
    ["wink", "Hola. Sí, soy yo de verdad.|Hello. Yes, it’s really me.|Salut. Oui, c’est vraiment moi.|Olá. Sim, sou eu de verdade.|Hallo. Ja, ich bin’s wirklich.|Ciao. Sì, sono proprio io.|Hola. Sí, soy yo de verdad.|你好。没错，真的是我。|안녕. 그래, 진짜 나야.|やあ。そう、本物の私だ。|Привет. Да, это правда я.|Cześć. Tak, to naprawdę ja."],
    ["suspicious", "¿Seguro? Piénsalo otra vez.|Sure? Think again.|Sûr ? Réfléchis encore.|Certeza? Pense de novo.|Sicher? Denk noch mal nach.|Sicuro? Pensaci ancora.|¿Seguro? Piénsalo otra vez.|确定吗？再想想。|확실해? 다시 생각해 봐.|本当に？もう一度考えてみな。|Уверен? Подумай ещё.|Na pewno? Pomyśl jeszcze raz."],
    ["smug", "La casa siempre gana. Casi siempre.|The house always wins. Almost always.|La maison gagne toujours. Presque toujours.|A casa sempre ganha. Quase sempre.|Die Bank gewinnt immer. Fast immer.|Il banco vince sempre. Quasi sempre.|La casa siempre gana. Casi siempre.|庄家总是赢。几乎总是。|하우스는 언제나 이겨. 거의 언제나.|胴元は必ず勝つ。ほぼ必ずな。|Казино всегда выигрывает. Почти всегда.|Kasyno zawsze wygrywa. Prawie zawsze."],
    ["laugh", "¡Uy! Eso ha estado lejos.|Oof! That was far off.|Aïe ! C’était loin.|Eita! Essa foi longe.|Autsch! Das war weit daneben.|Ahi! Era lontanissimo.|¡Uy! Eso estuvo lejos.|哎呀！差得好远。|아이고! 한참 빗나갔네.|おっと！ずいぶん遠いな。|Ой! Далековато.|Ojej! To było daleko."],
    ["bow", "Bien jugado. No se lo digas a nadie.|Well played. Don’t tell anyone.|Bien joué. Ne le dis à personne.|Boa jogada. Não conte a ninguém.|Gut gespielt. Sag’s keinem.|Ben giocato. Non dirlo a nessuno.|Bien jugado. No le digas a nadie.|打得好。别告诉别人。|잘했어. 아무한테도 말하지 마.|お見事。誰にも言うなよ。|Хорошо сыграно. Никому не говори.|Dobrze zagrane. Nikomu nie mów."],
    ["innocent", "¿Una pista? Qué pena, no doy pistas.|A hint? Too bad, I don’t give hints.|Un indice ? Dommage, je n’en donne pas.|Uma dica? Que pena, não dou dicas.|Ein Tipp? Schade, ich gebe keine.|Un indizio? Peccato, non ne do.|¿Una pista? Qué lástima, no doy pistas.|想要提示？可惜，我不给提示。|힌트? 안됐지만 힌트는 없어.|ヒント？残念、ヒントはやらん。|Подсказку? Жаль, я их не даю.|Podpowiedź? Szkoda, nie daję podpowiedzi."],
    ["dare", "Venga, a por la siguiente.|Come on, next one.|Allez, à la suivante.|Vamos, para a próxima.|Los, die nächste.|Dai, la prossima.|Dale, a la que sigue.|来吧，下一题。|자, 다음 문제.|さあ、次だ。|Давай, следующий.|Dalej, następne."],
    ["shock", "¿Sigues ahí? Te oigo respirar.|Still there? I can hear you breathing.|Tu es toujours là ? Je t’entends respirer.|Ainda está aí? Ouço você respirar.|Noch da? Ich hör dich atmen.|Ci sei ancora? Ti sento respirare.|¿Sigues ahí? Te oigo respirar.|还在吗？我听见你在呼吸。|아직 거기 있어? 숨소리 들려.|まだいるか？息づかいが聞こえるぞ。|Ты ещё тут? Я слышу, как ты дышишь.|Jesteś tam? Słyszę, jak oddychasz."],
    ["furious", "¡Otra vez no! Me vas a arruinar la banca.|Not again! You’ll bankrupt the house.|Encore ! Tu vas ruiner la banque.|De novo não! Vai quebrar a banca.|Nicht schon wieder! Du ruinierst die Bank.|Ancora no! Mi rovinerai il banco.|¡Otra vez no! Me vas a quebrar la banca.|又来！你要让庄家破产了。|또야! 하우스 거덜 나겠네.|またか！胴元が破産しちまう。|Опять! Ты разоришь казино.|Znowu! Zrujnujesz kasyno."],
  ];
  /* las fichas: rayo uno por clic; interruptores (se quedan); contadores x1-x5 */
  const CHIPS = [["rayo", "Rayo", "shot"], ["tormenta", "Tormenta", "on"], ["lluvia", "Lluvia", "on"], ["apagon", "Apagón", "on"], ["terremoto", "Terremoto", "on"], ["humo", "Humo", "on"], ["cristal", "Cristal roto", "n"], ["huellas", "Huellas", "n"], ["ventana", "Error falso", "n"]];
  const KIND_ = Object.fromEntries(CHIPS.map(c => [c[0], c[2]])), NAME_ = Object.fromEntries(CHIPS.map(c => [c[0], c[1]]));
  const DEB = [["frost", "Escarcha", 0], ["frosted", "Esmerilado", 0], ["tiles", "Teselas", 0], ["signal", "Señal rota", 0], ["card", "Carta", 0], ["myopia", "Miopía", 1], ["blur", "Borroso", 1], ["flicker", "Parpadeo", 1], ["mosaic", "Píxeles", 1], ["battery", "Batería", 1]];
  /* los retos de la Aventura (A.CHAL): id, nombre, tipo, icono, que hace, niveles */
  const RETOS = [
    ["shaky","Letras temblorosas","text","ch_shaky","El nombre baila y tiembla: cuesta leerlo.","Bailan y tiemblan|Más fuerte|Se dispersan y vuelven"],
    ["missing","Tinta borrada","text","ch_missing","Se borran letras del nombre; a más nivel, todas las vocales.","Falta 1/3 de las letras|Sin vocales|Sin vocales ni 1/3 de consonantes"],
    ["mirror","Nombre girado","text","ch_mirror","El nombre sale en espejo, boca abajo o cada palabra a su manera.","En espejo|Boca abajo|Cada palabra a su manera"],
    ["memory","Memoria de pez","text","ch_memory","El nombre se desvanece: recuérdalo.",""],
    ["runes","Runas","text","ch_runes","Letras sustituidas por símbolos parecidos.",""],
    ["anagram","Letras revueltas","text","ch_anagram","Las letras del nombre cambian de sitio.","2 parejas cambiadas|Interior barajado|Todo salvo la 1.ª"],
    ["riddle","Adivinanza","text","ch_riddle","En vez del nombre, una pista con el nombre tapado.",""],
    ["babel","Torre de Babel","text","ch_babel","El nombre aparece en otro idioma.",""],
    ["nocountry","Sin país","text","t_country","El país del lugar desaparece: solo te queda el nombre.",""],
    ["fakepass","Pasaporte falso","text","ch_fakepass","El país de debajo a veces miente: es un vecino.",""],
    ["ticker","Panel de salidas","text","ch_ticker","Las letras del nombre giran como en un aeropuerto hasta que se fijan.",""],
    ["ctrlz","Ctrl+Z","wall","ch_ctrlz","El crupier deshace tu zoom: el mapa vuelve a la vista inicial.",""],
    ["stormnight","Noche de tormenta","map","ch_stormnight","El mapa está a oscuras: solo lo ves entero cuando cae un rayo.",""],
    ["trap","Pregunta trampa","rule","ch_trap","Una pregunta fácil se cambia por otra más dura, con el sello TRAMPA.",""],
    ["giants","Gigantes y enanos","map","ch_giants","Unos continentes se agigantan y otros se encogen: hay que hacer zoom.",""],
    ["blur","Mapa borroso","map","ch_blur","El mapa está desenfocado.",""],
    ["dark","Apagón","map","ch_dark","El casino se queda a oscuras: solo ves cerca del puntero.",""],
    ["flicker","Luces parpadeantes","map","ch_flicker","Las luces se van cuando menos te lo esperas.",""],
    ["wrongborders","Fronteras falsas","map","ch_wrongborders","Las fronteras dibujadas mienten.",""],
    ["noborders","Mapa mudo","map","ch_noborders","Sin fronteras ni colores de país; a tope, en negativo.","Sin fronteras|Y de un solo color|Y en negativo"],
    ["spread","Big bang","map","ch_spread","Los continentes se separan, se juntan en uno o se barajan.","Se separan|Pangea|Barajados"],
    ["tilt","Continentes torcidos","map","ch_tilt","Cada continente está girado.",""],
    ["flip","Mundo del revés","map","ch_flip","El mapa se da la vuelta: el sur arriba, en espejo o las dos cosas.","Sur arriba|Espejo este-oeste|Las dos cosas"],
    ["spin","Ruleta","map","ch_spin","El mapa gira despacio.",""],
    ["clouds","Humo de sala","map","ch_clouds","El humo tapa el mapa: apártalo con el ratón.",""],
    ["rain","Lluvia","map","ch_rain","La lluvia empaña el mapa: agita el ratón para limpiarla.",""],
    ["myopia","Miopía","map","ch_myopia","Todo se ve nítido menos donde apuntas.","Nítido en 120 px|En 150 px|En 190 px y punto negro"],
    ["mosaic","Píxeles gordos","map","ch_mosaic","El mapa se ve a muy baja resolución.",""],
    ["quake","Terremoto","map","ch_quake","El mapa se desliza solo y tiembla.","Se desliza|Sacudidas|Sacudidas y deriva"],
    ["decoys","Chinchetas trampa","map","ch_decoys","Llueven chinchetas falsas por todo el mapa.",""],
    ["lightning","Rayos","map","ch_lightning","Rayos que ciegan y dejan una sombra donde caen.",""],
    ["tremble","Pulso","ptr","ch_tremble","Tu puntero tiembla y da vueltas, y el clic también.","Gira|Salta|Salta y gira"],
    ["ghost","Cursor fantasma","ptr","ch_ghost","El puntero desaparece y parpadea como un neón.","Desaparece 1 s de 5|Neón|Neón, desapariciones y doble visión"],
    ["lag","Cursor con retraso","ptr","ch_lag","El puntero va con retraso.",""],
    ["cmirror","Controles invertidos","ptr","ch_cmirror","El puntero se mueve al revés.",""],
    ["wind","Vendaval","rule","wind","El viento desvía tu pin.",""],
    ["storm","Contrarreloj","rule","storm","Tienes menos tiempo en cada pregunta.",""],
    ["silence","Silencio","rule","silence","Tus herramientas no funcionan.",""],
    ["crack","Cristal roto","wall","ch_crack","El crupier golpea y pringa tu pantalla: mueve o acerca el mapa para ver bajo las grietas.","Un golpe y huellas|Dos golpes|Tres golpes"],
    ["hang","No responde","wall","ch_hang","Ventanas de error falsas tapan el mapa: ciérralas para seguir.",""],
    ["battery","Batería baja","wall","ch_battery","Tu pantalla se queda sin batería mientras piensas.",""],
    ["flaghue","Luces de neón","flag","ch_flaghue","Las luces del casino cambian los colores de la bandera.",""],
    ["flagblur","Bandera borrosa","flag","ch_blur","La bandera está desenfocada.",""],
    ["flagdark","Bandera a oscuras","flag","ch_dark","La bandera casi no se distingue en la penumbra.",""],
    ["flaggray","Bandera desteñida","flag","ch_flaggray","La bandera pierde sus colores; a tope, en negativo.","Casi gris|Gris|Negativo en gris"],
    ["flagback","Bandera de espaldas","flag","ch_flagback","La bandera se ve por detrás; un sello dice cómo está girada.",""],
    ["flagpuzzle","Bandera a trozos","flag","ch_flagpuzzle","La bandera está troceada y desordenada. Cada 3 s, un trozo vuelve a su sitio.",""],
    ["flagwind","Bandera al viento","flag","ch_flagwind","La bandera ondea con el viento y los pliegues la esconden a ratos.",""],
    ["frost","Escarcha","wall","ch_frost","El cristal se hiela desde los bordes: tu puntero lo despeja y el hielo vuelve si te quedas quieto.","Las esquinas|Hasta un tercio|Casi todo, vuelve el doble de rápido"],
    ["frosted","Cristal esmerilado","map","ch_frosted","Un cristal arenado empaña el mapa; solo ves nítido a través de la ventana pulida que llevas con el puntero.","Poco desenfoque|Más|Mucho más, con velo"],
    ["tiles","Teselas de vidrio","map","ch_tiles","Ves el mapa a través de teselas biseladas: cada una amplía su centro y tuerce los bordes.","Teselas pequeñas|Medianas|Grandes, lente fuerte"],
    ["signal","Señal rota","map","ch_signal","Al mover el mapa, la imagen se arrastra por bloques como un vídeo sin señal; quieto, se recompone.","Un tercio de los bloques|Dos tercios|Casi todos, tarda el doble"],
    ["card","La carta que se cuela","wall","ch_card","El crupier pega naipes en tu cristal: pasa el puntero rápido por encima para despegarlos.","Una carta|Dos|Tres, y vuelven antes"],
    ["flagwet","Bandera mojada","flag","ch_flagwet","La bandera está pintada a la acuarela y le cae agua: los colores se corren hasta hacerse barro.","Barro en 8 s|En 6 s|En 4 s, chorrea más"]
  ];
  const RMAP = Object.fromEntries(RETOS.map(r => [r[0], r]));
  const RK = [["sel", "Los que más sorprenden"], ["map", "Mapa"], ["text", "Nombre"], ["ptr", "Puntero"], ["wall", "Pantalla"], ["rule", "Reglas"], ["flag", "Banderas"], ["on", "Puestos"]];
  const RNOTE = { trap: "cambia las preguntas al repartirlas: se nota desde la ronda siguiente", storm: "no hace nada en el modo infinito" };
  const SEL = ["ctrlz", "crack", "hang", "battery", "card", "frost", "cmirror", "flip", "stormnight", "clouds", "myopia", "ghost", "spread", "trap", "babel", "signal"];
  const PACKS = [
    ["Cuarta pared", "Cristal roto, No responde, Batería baja y La carta que se cuela.", [["crack", 2], ["hang", 1], ["battery", 1], ["card", 2]]],
    ["Pesadilla del casino", "Noche de tormenta, Rayos y Terremoto: el mapa se desmorona.", [["stormnight", 1], ["lightning", 1], ["quake", 2]]],
    ["Resaca", "Miopía, mapa borroso, luces parpadeantes y pulso: nada está quieto.", [["myopia", 2], ["blur", 1], ["flicker", 1], ["tremble", 1]]],
    ["Mundo al revés", "Mundo del revés, controles invertidos y continentes barajados.", [["flip", 3], ["cmirror", 1], ["spread", 3]]],
    ["Hielo y humo", "Escarcha, humo de sala y lluvia: hay que limpiar para ver.", [["frost", 2], ["clouds", 1], ["rain", 1]]],
    ["Espías", "Torre de Babel, pasaporte falso, sin país y pregunta trampa: el nombre miente.", [["babel", 1], ["fakepass", 1], ["nocountry", 1], ["trap", 1]]]
  ];
  /* el crupier: caras y gestos (ids de js/crupier-data.js) */
  const CARA = { sly: "normal", laugh: "risa", angry: "enfado", shock: "sorpresa", wink: "guiño", suspicious: "sospecha", smug: "chulería", sad: "tristeza", nervous: "nervios",
    innocent: "inocencia", bored: "aburrido", sleep: "sueño", furious: "furia", puzzled: "desconcierto", dare: "desafío", bow: "reverencia", dark: "a oscuras", dark_vexed: "a oscuras 2",
    admirado: "admirado", tramando: "tramando", orgulloso: "orgulloso", aliviado: "aliviado", cansado: "cansado", ofendido: "ofendido" };
  const GN = {
    hat_tip: "Toca el ala", hat_off_bow: "Reverencia", hat_pop: "Bote de chistera", hat_low: "Chistera baja", hat_chest: "Chistera al pecho", shuffle: "Baraja", deal_card: "Reparte",
    card_reveal: "Enseña la carta", fan_self: "Se abanica", fan_open: "Abre el abanico", crumple: "Arruga", cards_hide: "Esconde las cartas", point: "Señala", tantrum: "Rabieta",
    droop: "Se hunde", shrug: "Se encoge", finger_wag: "No, no, no", finger_up: "Un momento", shh: "Chist", beckon: "Ven aquí", pinch: "Por un pelo", slow_clap: "Aplauso lento",
    facepalm: "Mano a la cara", scratch_head: "Se rasca", twirl_moustache: "Atusa el bigote", preen: "Se arregla", pocket_watch: "Reloj de bolsillo", coin_toss: "Lanza moneda",
    stamp: "Sella", jot: "Apunta", glass_knock: "Toca el cristal", snap: "Chasquido", magic_pass: "Pase mágico", turn_away: "Se da la vuelta", head_tilt: "Ladea la cabeza",
    hand_heart: "Mano al pecho", cards_tap: "Golpea las cartas", pocket_coin: "Se guarda la moneda", blow: "Sopla", yawn: "Bosteza", palco_clap: "Aplauso de palco",
    nod: "Asiente", sway: "Se mece", tremble: "Tiembla", tremble_body: "Tiembla entero", lean_in: "Se acerca", freeze: "Se congela", slow_blink: "Parpadeo lento", wink: "Guiño",
    r_acierto: "Acierto", r_fallo: "Fallo", r_diana: "Diana", r_pelos: "Por los pelos", r_racha: "Racha", r_racha_rota: "Racha rota", r_ultimo_seg: "Último segundo",
    r_tiempo: "Se acabó el tiempo", r_otro_pais: "Otro país", r_mar: "En el mar", r_compra: "Compras", r_vende: "Vendes", r_reliquia: "Reliquia", r_logro: "Logro",
    r_vida: "Pierdes una vida", r_ultima_vida: "Última vida", r_jefe_vencido: "Jefe vencido", r_gana_casino: "Ganas al casino", r_pierde_casino: "Pierdes al casino",
    r_tienda: "La tienda", r_prueba_ropa: "Te pruebas ropa", r_vuelves: "Vuelves", r_mando: "Coges el mando", r_te_vas: "Te vas",
    e_reparte: "Reparte la carta", e_jefe: "El jefe", e_sella: "Sella el ticket", e_truco: "Truco de la carta", e_desfile: "Desfile", e_despedida: "Despedida", e_cascada: "Cascada",
    e_paga: "Paga fichas", e_reloj: "Mira el reloj", e_moneda: "La moneda", e_invita: "Te invita",
    b_corta: "Corta la baraja", b_guante: "Ajusta el guante", b_peso: "Cambia el peso", b_estira: "Se estira", b_carta: "Voltea una carta", b_ficha: "Juega con una ficha",
  };
  const gname = id => { const [g, c] = String(id || "").split("@"); return (GN[g] || g) + (c ? " · " + (CARA[c] || c) : ""); };
  function groups() {
    try { const g = A.crupier.groups && A.crupier.groups(); if (g && g.reacciones) return g; } catch (e) { /* abajo */ }
    const D = A.CRUPIER_DATA, ids = Object.keys(D.gest), code = (A.crupier.gestures ? A.crupier.gestures() : []).filter(g => !D.gest[g]);
    return { reacciones: ids.filter(i => i.startsWith("r_")), escena: ids.filter(i => i.startsWith("e_")), espera: ids.filter(i => i.startsWith("b_")),
      clasicos: ids.filter(i => !/^[reb]_/.test(i) && !i.includes("@")).concat(code), parejas: ids.filter(i => i.includes("@")) };
  }
  const GTABS = [["reacciones", "Reacciones"], ["escena", "Escena"], ["espera", "Espera"], ["clasicos", "Clásicos"], ["parejas", "Con cara"]];
  const GAZE = [["← Izquierda", -1], ["→ Derecha", 1], ["↓ Abajo", 2], ["Duda", "duda"], ["Al jugador", null]];
  const HUMOR = [["Según su partida", null], ["Contento", "contento"], ["Tenso", "tenso"], ["Picado", "picado"], ["Aburrido", "aburrido"], ["Admirado", "admirado"]];
  const HUMOR_PREV = { contento: ["sly", ["shuffle", "b_carta", "b_ficha", "b_corta"]], tenso: ["nervous", ["fan_self", "e_reloj", "cards_tap"]], picado: ["ofendido", ["cards_tap", "b_guante", "finger_wag"]],
    aburrido: ["bored", ["b_estira", "b_peso", "e_reloj"]], admirado: ["admirado", ["fan_open", "hand_heart", "shuffle"]] };
  const CAT = [["espera", "Espera"], ["levanta", "Se levanta"], ["anda", "Anda"], ["salta", "Salta"], ["zarpa", "Zarpazo"], ["caricia", "Caricia (ronronea)"], ["regana", "Regañina"], ["duerme", "Se duerme"], ["despierta", "Se despierta"]];
  const TRAS = [
    ["sello", "Sello gigante", "En el revelado: DIANA"], ["cartas", "Lluvia de cartas", "Sale sola con racha de 5"], ["telon", "El telón del jefe", "Sale sola al empezar un jefe"],
    ["moneda", "La moneda del duelo", "Sale sola en el Duelo"], ["siesta", "La siesta de la mesa", "En la portada: bostezo y zetas"], ["desfile", "El desfile", "En la tienda: pase de modelo"],
    ["mapa", "Comodín por el mapa", "En la pregunta"], ["apagon", "Apagón con ojos", "En la pregunta"], ["ventana", "La ventana de mentira", "«¿Seguro que es ahí?»"],
    ["guante", "El guante en su puntero", "En la pregunta"], ["ticket", "El gato y su ticket", "En el revelado"], ["creditos", "Los créditos finales", "Los de la Ascensión V, sin jubilarle"],
  ];
  const HUEVOS = [["cae", "Geolite se cae", "Las letras del rótulo caen con su física (solo en la portada)"], ["hum", "Tararea", "Las notas le salen de la chistera"], ["baile", "Su baile", "Chasquido, bigote, pase mágico, abanico y sombrero"]];
  const VOCES = [["", "Habla", "la de siempre"], ["grito", "Grito", "en mayúsculas, tiembla"], ["canto", "Canto", "letra a letra, con vaivén"], ["susurro", "Susurro", "pequeño y bajito"], ["nervios", "Nervios", "tiembla todo"], ["siniestro", "Siniestro", "rojo sobre negro"], ["libreta", "Libreta", "datos, cifras"], ["senal", "Señal", "ventana de sistema"], ["anuncio", "Anuncio", "marco de bombillas"], ["sueno", "Sueño", "lento, con sueño"], ["drama", "Drama", "trágico"], ["jefe", "Jefe", "rótulo del jefe"]];
  const VNAME = Object.fromEntries(VOCES.map(v => [v[0], v[1]]));
  const MOMS = [["mesa", "De la mesa"], ["portada", "Portada"], ["partida", "Partida"], ["acierto", "Acierto"], ["fallo", "Fallo"], ["retos", "Retos"], ["jefes", "Jefes"], ["barra", "La Barra"], ["duelo", "Duelo"], ["tienda", "Tienda y Perfil"], ["salida", "Salida"], ["comodin", "Comodín"], ["pared", "Cuarta pared"]];
  const MNAME = Object.fromEntries(MOMS);
  const VTAB = [["crupier", "Don Crupier"], ["gato", "Comodín"], ["ptr", "Puntero"], ["mapa", "Mesa del mapa"]];
  const PSLOT = { ret: "Retícula", pin: "Chincheta", lin: "Línea", dia: "Diana" };

  /* todas las frases: las del juego (mesa/frases.js, por su clave) y las de la mesa (traducidas aqui) */
  const FR = [];
  QUICK.forEach(([f, s], i) => FR.push({ id: "q" + i, mom: "mesa", es: phrase(s, "es"), qi: i, face: f, voz: "" }));
  (window.MESA_FRASES || []).forEach(([mom, gs]) => gs.forEach(([k, voz, rows]) => rows.forEach(([i, es]) => FR.push({ id: k + "#" + i, li: k + "#" + i, k, mom, es, voz }))));
  FR.forEach(f => { f.n = norm(plain(f.es) + " " + f.k + " " + (MNAME[f.mom] || "")); });

  /* ================================================================ LAS MARCAS: !!grito!! ~canto~ _susurro_ *enfasis* (y las <g> <c> <s> <e> de las frases del juego) */
  function plain(t) { return String(t || "").replace(/<\/?[gcse]>/g, "").replace(/!!([^!]+?)!!/g, "$1").replace(/~([^~]+?)~/g, "$1").replace(/(^|[\s¡¿(«"])_([^_]+?)_(?=$|[\s.,;:!?…)»"])/g, "$1$2").replace(/\*([^*]+?)\*/g, "$1"); }
  /* los trozos con su marca: [[clase, texto], ...] */
  function parts(t) {
    let s = String(t || "").replace(/<(g|c|s|e)>([\s\S]*?)<\/\1>/g, "\u0001$1$2\u0002");
    s = s.replace(/!!([^!]+?)!!/g, "\u0001g$1\u0002").replace(/~([^~]+?)~/g, "\u0001c$1\u0002").replace(/(^|[\s¡¿(«"])_([^_]+?)_(?=$|[\s.,;:!?…)»"])/g, "$1\u0001s$2\u0002").replace(/\*([^*]+?)\*/g, "\u0001e$1\u0002");
    const out = []; let i = 0;
    while (i < s.length) { const a = s.indexOf("\u0001", i); if (a < 0) { out.push(["", s.slice(i)]); break; } if (a > i) out.push(["", s.slice(i, a)]); const b = s.indexOf("\u0002", a); out.push(["m" + s[a + 1], s.slice(a + 2, b < 0 ? undefined : b)]); i = b < 0 ? s.length : b + 1; }
    return out.filter(p => p[1]);
  }
  const markHtml = t => parts(t).map(([c, x]) => c ? `<span class="${c}">${esc(x)}</span>` : esc(x)).join("");

  /* ================================================================ SONIDO DE LA MESA: fichas que tintinean y la voz del ensayo */
  let ac = null;
  const audio = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); return ac; } catch (e) { return null; } };
  function tone(f, at, dur, vol, type = "square") { const c = audio(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .02); }
  const clink = (at = 0) => { tone(2400 + Math.random() * 500, at, .09, .05, "triangle"); tone(3300 + Math.random() * 400, at + .015, .07, .03, "triangle"); };
  const blip = i => tone(({ laugh: 330, angry: 150, furious: 140, shock: 300, sad: 170, dark: 120 }[face] || 220) * (1 + ((i * 7) % 5) * .06), 0, .07, .05);

  /* ================================================================ RED */
  async function call(method, body, q = "") {
    const r = await fetch(API + q, { method, headers: { "x-mesa": key, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401) { logout("Esa no es la clave."); throw new Error("key"); }
    if (r.status === 429) { logout("Demasiados intentos. Espera 10 minutos."); throw new Error("rate"); }
    if (r.status === 503) { logout("La mesa está apagada: falta MESA_KEY en Vercel."); throw new Error("off"); }
    return r.json();
  }
  /* LO MANDADO: cada orden con su numero; el latido de su partida la confirma (st.ak recibida, st.dk empezada a decir) */
  const said = {};                                                            // sid -> [{ q, t, es, at, say, st: sent | recv | said | fail }]
  function logAdd(sid, e) { (said[sid] = said[sid] || []).push(Object.assign({ at: Date.now(), st: e.ok === false ? "fail" : "sent" }, e)); if (said[sid].length > 120) said[sid].shift(); if (sid === sel && libTab === "log") renderLib(); }
  async function order(sid, body, label, o = {}) {
    try {
      const j = await call("POST", Object.assign({ sid }, body)), ok = !!(j.ok && j.live);
      if (label) logAdd(sid, { q: j.q || 0, t: label, es: o.es || "", say: !!o.say, ok });
      if (!j.ok) toast("No se ha podido mandar."); else if (!j.live) toast("Esa partida ya se ha cerrado."); else if (o.ok) toast(o.ok, 1700);
      return ok;
    } catch (e) { if (label) logAdd(sid, { q: 0, t: label, es: o.es || "", say: !!o.say, ok: false }); if (e.message !== "key") toast("Sin conexión: no ha salido."); return false; }
  }
  const act = (a, v, ok, label) => sel ? order(sel, { op: "act", a, v }, label || ok, { ok }) : (toast("Ensayado aquí. Elige una partida para mandárselo."), Promise.resolve(false));

  /* ================================================================ LA PUERTA */
  let doorSpr = null;
  const mount = (host, o) => { const s = A.crupier.mount(host, Object.assign({ fidget: false }, o)); s.set("sly"); return s; };
  function logout(msg) {
    key = ""; try { localStorage.removeItem(KEYS); } catch (e) { /* nada */ }
    clearTimeout(pollT); document.body.classList.remove("in"); $("appWrap").classList.add("hidden"); $("door").classList.remove("hidden"); $("doorErr").textContent = msg || "";
    if (!doorSpr) doorSpr = mount($("doorFace")); doorSpr.set(msg ? "suspicious" : "sly"); if (msg) doorSpr.play("finger_wag");
    setTimeout(() => $("key").focus(), 50);
  }
  $("doorForm").addEventListener("submit", async e => {
    e.preventDefault(); key = $("key").value.trim(); if (!key) return;
    try { const j = await call("GET"); if (j.ok) { try { localStorage.setItem(KEYS, key); } catch (x) { /* nada */ } $("key").value = ""; enter(j); } } catch (x) { /* logout ya avisa */ }
  });
  $("logout").onclick = () => logout("");

  /* ================================================================ LAS PARTIDAS */
  let list = [], sel = null, selSt = null, pollT = 0, watchT = 0, lastOk = 0, spr = null, started = false;
  const fxs = {}, fxAt = {}, chs = {}, chAt = {}, put = {};
  const parseFx = f => !f || f.length < 7 ? null : { lluvia: f[0] === "1", tormenta: f[1] === "1", apagon: f[2] === "1", terremoto: f[3] === "1", cristal: +f[4], huellas: +f[5], ventana: +f[6], humo: f[7] === "1" };
  const fxOf = sid => fxs[sid] || (fxs[sid] = { lluvia: false, tormenta: false, apagon: false, terremoto: false, humo: false, cristal: 0, huellas: 0, ventana: 0 });
  const parseCh = s => { const o = {}; String(s || "").split(",").forEach(p => { const [i, v] = p.split(":"); if (RMAP[i] && +v > 0) o[i] = +v; }); return o; };
  const chOf = sid => chs[sid] || (chs[sid] = {});
  const putOf = sid => put[sid] || (put[sid] = {});
  const pips = n => "●".repeat(n) + "○".repeat(3 - n);
  const noRetos = () => !!selSt && selSt.md === "clasico";   // en los menus y el Campamento si: los visuales cubren toda su pantalla (A.adv.mesaGlobal)
  const nFx = F => F ? ["lluvia", "tormenta", "apagon", "terremoto", "humo"].filter(k => F[k]).length + (F.cristal ? 1 : 0) + (F.huellas ? 1 : 0) + (F.ventana ? 1 : 0) : 0;

  function enter(j) {
    $("door").classList.add("hidden"); $("appWrap").classList.remove("hidden"); document.body.classList.add("in");
    if (!started) { started = true; spr = mount($("face")); setup(); }
    if (j) got(j); poll();
  }
  async function poll() {
    clearTimeout(pollT);
    try { const j = await call("GET"); if (j.ok) { got(j); lastOk = Date.now(); } }
    catch (e) { if (!key) return; }
    netPaint();
    if (key) pollT = setTimeout(poll, document.hidden ? 15000 : 3000);
  }
  function netPaint() {
    const ok = Date.now() - lastOk < 9000, el = $("net");
    el.innerHTML = ok ? `<i class="dot ok"></i><span class="tx">Conectado</span>` : `<i class="dot"></i><span class="tx">Sin conexión con el servidor…</span>`;
    $("netDot").classList.toggle("off", !list.length);
  }
  setInterval(netPaint, 3000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && key) poll(); });

  function got(j) {
    list = j.list.sort((a, b) => (a.st.t0 || 0) - (b.st.t0 || 0));
    $("nLive").textContent = list.length === 1 ? "1 partida en antena" : list.length + " partidas en antena";
    $("nList").textContent = list.length ? String(list.length) : "";
    const now = Date.now();
    for (const x of list) {
      const f = parseFx(x.st.fx); if (f && !(now - (fxAt[x.sid] || 0) < 6000)) fxs[x.sid] = f;
      if (!(now - (chAt[x.sid] || 0) < 6000)) chs[x.sid] = parseCh(x.st.ch);
      const L = said[x.sid]; if (L) for (const e of L) {                     // las confirmaciones de su latido
        if (e.st === "sent" && e.q && +x.st.ak >= e.q) e.st = "recv";
        if (e.say && e.q && (e.st === "sent" || e.st === "recv") && +x.st.dk >= e.q) e.st = "said";
        if (e.st === "sent" && now - e.at > 95000) e.st = "fail";
      }
    }
    if (sel && !list.some(y => y.sid === sel)) gone();
    if (!sel && list.length) { const last = LS.get("sel", ""); if (list.some(y => y.sid === last) || list.length === 1) { pick(list.some(y => y.sid === last) ? last : list[0].sid); return; } }
    if (sel) selSt = list.find(y => y.sid === sel).st;
    paintSeats(); paintTv(); paintPuesto(); paintTarget(); paintDrawer(); if (libTab === "log") renderLib();
  }
  function paintSeats() {
    const L = $("list");
    if (!list.length) { L.innerHTML = `<div class="empty"><div class="cam"><div class="dface" id="emptyFace"></div></div><b>Nadie jugando</b>Ahora mismo no hay partidas abiertas. El crupier baraja solo.</div>`; const h = $("emptyFace"); if (h && !h._s) { h._s = mount(h); h._s.play("shuffle"); } return; }
    L.innerHTML = list.map(x => {
      const st = x.st, F = fxs[x.sid], C = chs[x.sid], nc = C ? Object.keys(C).length : 0, nf = nFx(F), pend = (said[x.sid] || []).some(e => e.st === "sent" && Date.now() - e.at > 6000), ago = Math.round((Date.now() - (x.t || Date.now())) / 1000);
      return `<button class="seat${x.sid === sel ? " sel" : ""}" data-sid="${x.sid}" type="button">${x.w ? `<i class="ear" title="Te está escuchando: su partida pregunta cada 2 s"></i>` : ""}
        <i class="flag" style="background-image:url(${flagOf(st.l)})"></i>
        <span class="nm"><b class="${st.n ? "" : "anon"}">${esc(st.n || "Sin nombre")}</b><i>${esc(LANGS[st.l] || st.l)}</i></span>
        <span class="wh">${esc(where(st))}${st.q && st.ph === "asking" ? " · " + esc(st.q) : ""}</span>
        <span class="tg">${st.lw && WAIT[st.lw] ? `<span class="tag hot" title="${esc(WAIT[st.lw])}">Espera: ${esc(st.lw)}</span>` : ""}<span class="tag">${esc(PLAT[st.p] || st.p)}</span><span class="tag">${since(st.t0)}</span>${st.cam ? `<span class="tag gold">${st.cam === 2 ? "Fotos" : "Pantalla"}</span>` : ""}${nc ? `<span class="tag hot">${nc} reto${nc > 1 ? "s" : ""}</span>` : ""}${nf ? `<span class="tag hot">${nf} efecto${nf > 1 ? "s" : ""}</span>` : ""}${pend ? `<span class="tag hot">Sin confirmar</span>` : ""}${ago > 30 ? `<span class="tag">latido hace ${ago} s</span>` : ""}</span>
      </button>`;
    }).join("");
    QA(".seat", L).forEach(b => { b.onclick = () => pick(b.dataset.sid); });
  }

  /* la partida elegida */
  function pick(sid) {
    if (sel === sid) return;
    if (sel) { camStop(); call("POST", { op: "unwatch", sid: sel }).catch(() => {}); }
    sel = sid; LS.set("sel", sid); const x = list.find(y => y.sid === sid); selSt = x && x.st;
    if (ropaPrev) { ropaPrev = null; dressPrev(); }                          // la ropa que ensayabas era para el anterior
    $("room").classList.remove("nosel"); $("txt").disabled = false; $("send").disabled = false;
    loadF(null); autoMom(); watch();
    paintSeats(); paintTv(); paintPuesto(); paintTarget(); paintDrawer(); renderLib(); refresh();
    spr.set(face); spr.play("hat_tip"); clink(); clink(.07);
    $("txt").focus({ preventScroll: true });
  }
  async function watch() { clearTimeout(watchT); if (!sel) return; try { await call("POST", { op: "watch", sid: sel }); } catch (e) { /* reintenta */ } watchT = setTimeout(watch, 20000); }
  addEventListener("pagehide", () => { if (sel && key) fetch(API, { method: "POST", keepalive: true, headers: { "x-mesa": key, "content-type": "application/json" }, body: JSON.stringify({ op: "unwatch", sid: sel }) }).catch(() => {}); });
  function gone() {
    camStop(true); const n = selSt && selSt.n; toast((n || "La partida") + " ha cerrado el juego."); sel = null; selSt = null; clearTimeout(watchT);
    $("room").classList.add("nosel"); $("send").disabled = true; paintSeats(); paintTv(); paintPuesto(); paintTarget(); paintDrawer(); renderLib(); refresh();
  }
  function stepSel(d) { if (!list.length) return; const i = list.findIndex(x => x.sid === sel), j = (i + d + list.length) % list.length; pick(list[i < 0 ? 0 : j].sid); }

  /* ================================================================ SU PANTALLA: la ficha, el video o las fotos */
  const ICE = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const CAM = { mode: "", gen: 0, sid: null, pc: null, dc: null, shooting: false, shotT: 0, renewT: 0, lastAt: 0, note: "" };
  const iceDone = (p, ms) => new Promise(res => { if (p.iceGatheringState === "complete") return res(); const t = setTimeout(res, ms); p.addEventListener("icegatheringstatechange", () => { if (p.iceGatheringState === "complete") { clearTimeout(t); res(); } }); });
  function tvMode(m, note) { CAM.mode = m; if (note != null) CAM.note = note; paintTv(); }
  function paintTv() {
    const tv = $("tv"), st = selSt, m = CAM.mode;
    tv.classList.toggle("vid", m === "vid"); tv.classList.toggle("pic", m === "pic");
    const lv = $("tvLive"); lv.className = "live" + (m === "vid" ? "" : m === "pic" ? " ph" : " off");
    lv.innerHTML = m === "vid" ? `<i class="dot"></i><span>En directo · vídeo</span>` : m === "pic" ? `<i class="dot"></i><span>Fotos cada 1,5 s</span>` : `<i class="dot off"></i><span>${st ? "Sin imagen" : "Sin partida"}</span>`;
    const canCam = !!(st && st.cam), on = !!m && m !== "deny" && m !== "noanswer";
    $("tvCam").classList.toggle("hidden", !canCam || on); $("tvOff").classList.toggle("hidden", !on);
    $("tvFoot").innerHTML = st ? `<span>${esc(st.n || "Sin nombre")}</span><span>${esc(where(st))}</span><span>${doing(st)}</span>` : "";
    const c = $("card0");
    if (!st) { c.innerHTML = `<div class="st0"><h3>Elige una partida</h3><p class="why">A la izquierda, quien está jugando ahora. Su pantalla saldrá aquí; mientras tanto puedes ensayar con el crupier de la derecha.</p></div>`; return; }
    const md = st.md ? MODE[st.md] || st.md : "";
    const F = [];
    if (st.md && st.md !== "clasico") F.push(["Vidas", st.h != null ? `<span class="hearts">${Array.from({ length: st.hm || 3 }, (_, i) => `<i${i < st.h ? "" : ' class="x"'}></i>`).join("")}</span>` : "—"], ["Monedas", fmt(st.c)], ["Puntos", fmt(st.s)], ["Racha", st.sk ? "×" + st.sk : "—"], ["Ascensión", st.asc ? ASCN[st.asc] : "Sin"]);
    else if (st.md) F.push(["Puntos", fmt(st.s)], ["Campaña", esc(st.d || "—")], ["Racha", st.sk ? "×" + st.sk : "—"]);
    F.push(["Juega en", esc(PLAT[st.p] || st.p)], ["Lleva", since(st.t0)], ["Versión", esc(st.v || "—")]);
    const msg = { ask: ["Pidiéndole permiso…", "Le sale «Don Crupier quiere ver tu partida». Tiene 30 s para decidir."], conn: ["Conectando su pantalla…", "Vídeo de punto a punto; si su red no deja, pasaré a fotos."], wait: ["Esperando sus fotos…", "Su red no deja vídeo: el juego manda una foto cada 1,5 s."], deny: ["Ha dicho que no", "No ha querido que veas su pantalla. Se lo puedes volver a pedir más tarde."], noanswer: ["No contesta", "Puede que tenga el directo apagado en Ajustes o una versión del juego sin cámara."] }[m];
    c.innerHTML = `<div class="st0">
      <div class="md">${md ? `<span class="live ph"><span>${esc(md)}</span></span>` : ""}<span class="live off"><span>${esc(LANG[st.l] || st.l)}</span></span>${st.cam ? "" : `<span class="live off"><span>Sin cámara en ${esc(PLAT[st.p] || st.p)}</span></span>`}</div>
      <h3>${esc(where(st))}</h3>
      ${doing(st) ? `<div class="q">${doing(st)}</div>` : ""}
      <div class="facts">${F.map(([k, v]) => `<div class="fct"><span>${k}</span><b>${v}</b></div>`).join("")}</div>
      ${msg ? `<div>${m === "ask" || m === "conn" || m === "wait" ? '<i class="spin"></i>' : ""}<div class="q" style="margin-top:8px"><b>${msg[0]}</b></div><p class="why">${msg[1]}</p></div>` : `<p class="why">${st.cam ? "«Ver su pantalla» le pide permiso; mientras mires, a él le sale «TE ESTÁ MIRANDO» y puede cortarlo." : "Su pantalla solo se ve en la versión de escritorio. Lo de aquí es lo que cuenta su partida cada pocos segundos."}</p>`}
    </div>`;
  }
  async function camStart() {
    if (!sel || !selSt || !selSt.cam) return; camStop(true);
    const gen = ++CAM.gen, sid = CAM.sid = sel; tvMode("ask"); spr.play("lean_in"); clink();
    try {
      await order(sid, { op: "cam" }, "Le pides ver su pantalla");
      let offer = null;
      for (let i = 0; i < 45 && gen === CAM.gen; i++) {
        await sleep(1000); if (gen !== CAM.gen) return;
        const j = await call("GET", null, "?rtc=" + sid);
        if (j.offer && j.offer.deny) { tvMode("deny"); shotsStop(); spr.set("sad"); spr.play("droop"); return; }
        if (j.offer) { offer = j.offer; break; }
        if (i === 9) shotsStart();                                              // sin video aun: las fotos, por si acaso (sin su permiso, el juego no las manda)
        if (CAM.mode === "pic") continue;
      }
      if (gen !== CAM.gen) return;
      if (!offer) { if (CAM.mode !== "pic") { tvMode("noanswer"); shotsStop(); } return; }
      if (CAM.mode !== "pic") tvMode("conn");
      const p = CAM.pc = new RTCPeerConnection({ iceServers: ICE });
      p.ontrack = e => { $("vid").srcObject = e.streams[0] || new MediaStream([e.track]); };
      p.ondatachannel = e => { CAM.dc = e.channel; };
      p.onconnectionstatechange = () => {
        if (CAM.pc !== p) return; const s = p.connectionState;
        if (s === "connected") { tvMode("vid"); toast("Le ves la pantalla. A él le sale «TE ESTÁ MIRANDO»."); spr.play("slow_blink"); setTimeout(() => { if (CAM.pc === p && gen === CAM.gen) { if ($("vid").videoWidth) shotsStop(); else shotsStart(); } }, 5000); }   // conectado pero sin imagen (pasa): fotos
        else if (s === "failed") { shotsStart(); }
        else if (s === "disconnected" && CAM.mode === "vid") toast("Se ha cortado un momento…");
      };
      await p.setRemoteDescription(offer); await p.setLocalDescription(await p.createAnswer()); await iceDone(p, 3000);
      if (CAM.pc !== p) return;
      await call("POST", { op: "rtc", sid, sdp: p.localDescription.sdp });
      setTimeout(() => { if (CAM.pc === p && p.connectionState !== "connected" && gen === CAM.gen) shotsStart(); }, 9000);   // el video no llega: fotos
    } catch (e) { if (gen === CAM.gen && CAM.mode !== "pic") tvMode("noanswer"); }
  }
  /* las fotos de respaldo: se piden (y se renuevan cada 15 s) y se recogen cada 1,2 s */
  function shotsStart() {
    if (CAM.shooting || !CAM.sid) return; CAM.shooting = true; const sid = CAM.sid, gen = CAM.gen;
    if (CAM.mode !== "vid" && CAM.mode !== "pic") tvMode("wait");
    const renew = () => { if (!CAM.shooting || gen !== CAM.gen) return; call("POST", { op: "shot", sid, v: true }).catch(() => {}); CAM.renewT = setTimeout(renew, 15000); };
    const grab = async () => {
      if (!CAM.shooting || gen !== CAM.gen) return;
      try { const j = await call("GET", null, "?shot=" + sid); if (j.img && j.at > CAM.lastAt) { CAM.lastAt = j.at; $("pic").src = j.img; if (CAM.mode !== "pic" && !(CAM.mode === "vid" && $("vid").videoWidth)) { tvMode("pic"); toast("El vídeo no llega: le ves en fotos."); } } } catch (e) { /* la siguiente */ }
      CAM.shotT = setTimeout(grab, 1200);
    };
    renew(); grab();
  }
  function shotsStop() { if (!CAM.shooting) return; CAM.shooting = false; clearTimeout(CAM.shotT); clearTimeout(CAM.renewT); if (CAM.sid) call("POST", { op: "shot", sid: CAM.sid, v: false }).catch(() => {}); }
  function camStop(silent) {
    const sid = CAM.sid, had = !!CAM.mode; CAM.gen++; shotsStop(); CAM.sid = null; CAM.lastAt = 0;
    try { if (CAM.dc) CAM.dc.close(); } catch (e) { /* ya cerrado */ } try { if (CAM.pc) CAM.pc.close(); } catch (e) { /* ya cerrado */ }
    CAM.pc = CAM.dc = null; $("vid").srcObject = null; $("pic").removeAttribute("src"); CAM.mode = "";
    if (sid && had && !silent) call("POST", { op: "camoff", sid }).catch(() => {});
    $("tv").classList.remove("big"); paintTv();
  }
  /* el guante: donde pinchas en su imagen (sin las bandas negras); clic = dos toquecitos, arrastrar = le sigue */
  function at(e, el) {
    const r = el.getBoundingClientRect(), vw = el.videoWidth || el.naturalWidth || 16, vh = el.videoHeight || el.naturalHeight || 9, k = Math.min(r.width / vw, r.height / vh), w = vw * k, h = vh * k, x0 = r.left + (r.width - w) / 2, y0 = r.top + (r.height - h) / 2;
    const x = (e.clientX - x0) / w, y = (e.clientY - y0) / h; return x < 0 || x > 1 || y < 0 || y > 1 ? null : { x: +x.toFixed(4), y: +y.toFixed(4) };
  }
  let handAt = 0;
  function hand(m) {
    if (CAM.dc && CAM.dc.readyState === "open") { CAM.dc.send(JSON.stringify(m)); return; }
    if (!CAM.sid) return; if (m.t === "move" && performance.now() - handAt < 350) return; handAt = performance.now();
    call("POST", Object.assign({ op: "hand", sid: CAM.sid }, m)).catch(() => {});
  }
  function tapRing(e) { const tv = $("tv"), r = tv.getBoundingClientRect(), d = document.createElement("i"); d.className = "tap"; d.style.left = (e.clientX - r.left) + "px"; d.style.top = (e.clientY - r.top) + "px"; tv.appendChild(d); setTimeout(() => d.remove(), 700); }
  ["vid", "pic"].forEach(id => {
    const el = $(id); let down = null;
    el.addEventListener("pointerdown", e => { if (!at(e, el)) return; down = { x: e.clientX, y: e.clientY, moved: false }; el.setPointerCapture(e.pointerId); });
    el.addEventListener("pointermove", e => { if (!down) return; if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true; if (down.moved) { const p = at(e, el); if (p) hand(Object.assign({ t: "move" }, p)); } });
    el.addEventListener("pointerup", e => { if (!down) return; const p = at(e, el), mv = down.moved; down = null; if (!p) return; if (!mv) { hand(Object.assign({ t: "tap" }, p)); tapRing(e); clink(); spr.play("point"); } else hand(Object.assign({ t: "move" }, p)); });
  });
  /* en cuanto el video trae imagen, manda el video (las fotos eran el respaldo) */
  const vidOk = () => { const v = $("vid"); if (CAM.pc && CAM.pc.connectionState === "connected" && v.videoWidth && CAM.mode !== "vid") { tvMode("vid"); shotsStop(); } else if (v.videoWidth && CAM.shooting && CAM.mode === "vid") shotsStop(); };
  ["loadeddata", "resize", "playing"].forEach(ev => $("vid").addEventListener(ev, vidOk));
  $("tvCam").onclick = camStart; $("tvOff").onclick = () => { camStop(); toast("Has colgado."); };
  $("tvBig").onclick = () => { const b = $("tv").classList.toggle("big"); $("tvBig").textContent = b ? "Volver" : "Agrandar"; };

  /* ================================================================ LO QUE LE TIENES PUESTO (cada cosa con su x) */
  function paintPuesto() {
    const el = $("puesto"); if (!sel) { el.innerHTML = `<span class="lb">Lo que le tienes puesto</span><span class="none">Elige una partida.</span>`; return; }
    const F = fxOf(sel), C = chOf(sel), P = putOf(sel), it = [];
    ["lluvia", "tormenta", "apagon", "terremoto", "humo"].forEach(k => { if (F[k]) it.push([`/mesa/fichas/${k}.webp`, NAME_[k], "", () => fxSet(k, false)]); });
    ["cristal", "huellas", "ventana"].forEach(k => { if (F[k]) it.push([`/mesa/fichas/${k}.webp`, NAME_[k], "×" + F[k], () => fxSet(k, 0)]); });
    Object.keys(C).forEach(id => { const r = RMAP[id]; if (r) it.push([`../assets/icons/${r[3]}.webp`, r[1], pips(C[id]), () => retoSet(id, 0)]); });
    if (P.vest) it.push(["", "Ropa de la mesa", "", () => vestSend(null)]);
    if (P.gato) it.push(["", "Comodín vestido", "", () => gatoSend(null)]);
    if (P.ptr) it.push(["", "Puntero", Object.values(P.ptr).filter(Boolean).map(v => A.punteros ? A.punteros.name(Object.keys(P.ptr).find(s => P.ptr[s] === v), v) : v).join(", "), () => ptrSend(null)]);
    if (P.mesa) { const m = MESAS.find(x => x[0] === P.mesa); it.push(["", "Mesa", m ? m[1] : P.mesa, () => mesaSend(null)]); }
    if (P.humor) it.push(["", "Humor", P.humor, () => humorSend(null)]);
    if (P.gaze != null) it.push(["", "Mirada", (GAZE.find(g => g[1] === P.gaze) || ["?"])[0].replace(/^[←→↓] /, ""), () => gazeSend(null)]);
    el.innerHTML = `<span class="lb">Le tienes puesto</span><div class="pzs">` + (it.length ? it.map(([img, n, v], i) => `<span class="pz">${img ? `<img src="${img}" alt="">` : ""}${esc(n)}${v ? ` <b>${esc(v)}</b>` : ""}<button type="button" data-i="${i}" aria-label="Quitar ${esc(n)}" title="Quitar">×</button></span>`).join("") : `<span class="none">Nada: está como lo dejó el juego.</span>`) +
      `</div>${it.length ? `<button class="chipb red" id="allOff" type="button">Quitar todo (${it.length})</button>` : ""}`;
    QA(".pz button", el).forEach(b => { b.onclick = () => { it[+b.dataset.i][3](); clink(); }; });
    const ao = $("allOff"); if (ao) ao.onclick = allOff;
  }
  async function allOff() {
    if (!sel) return; const F = fxOf(sel), P = putOf(sel), sid = sel; clink(); spr.play("snap");
    for (const k of ["lluvia", "tormenta", "apagon", "terremoto", "humo"]) if (F[k]) fxSet(k, false, true);
    for (const k of ["cristal", "huellas", "ventana"]) if (F[k]) fxSet(k, 0, true);
    if (Object.keys(chOf(sid)).length) { chs[sid] = {}; chAt[sid] = Date.now(); order(sid, { op: "ch", ch: "*", v: 0 }, "Quitas todos los retos"); }
    if (P.vest) vestSend(null, true); if (P.gato) gatoSend(null, true); if (P.ptr) ptrSend(null, true); if (P.mesa) mesaSend(null, true); if (P.humor) humorSend(null, true); if (P.gaze != null) gazeSend(null, true);
    paintPuesto(); paintDrawer(); toast("Le has quitado todo.", 1600);
  }

  /* ================================================================ LA CAJONERA */
  const DTABS = [["efectos", "Efectos", "/mesa/fichas/rayo.webp"], ["retos", "Retos", "../assets/icons/ch_flip.webp"], ["trastadas", "Trastadas", "../assets/icons/vivo_hand.webp"], ["crupier", "El crupier", "../assets/icons/dealer_mini_s.webp"], ["vestuario", "Vestuario", ""], ["regalo", "Regalo", "../assets/icons/ficha_oro.webp"]];
  let dtab = LS.get("tab", "efectos"); if (!DTABS.some(t => t[0] === dtab)) dtab = "efectos";
  function paintTabs() {
    const nCh = sel ? Object.keys(chOf(sel)).filter(id => !DEB.some(d => d[0] === id)).length : 0, nf = sel ? nFx(fxOf(sel)) + DEB.filter(d => chOf(sel)[d[0]]).length : 0, P = sel ? putOf(sel) : {}, nv = ["vest", "gato", "ptr", "mesa"].filter(k => P[k]).length, nc = ["humor"].filter(k => P[k]).length + (P.gaze != null ? 1 : 0);
    const bd = { efectos: nf, retos: nCh, vestuario: nv, crupier: nc };
    $("dtabs").innerHTML = DTABS.map(([k, n, img], i) => `<button class="dtab" type="button" role="tab" aria-selected="${k === dtab}" data-k="${k}" title="Alt+${i + 1}">${img ? `<img src="${img}" alt="">` : ""}${n}${bd[k] ? `<small>${bd[k]}</small>` : ""}</button>`).join("");
    QA(".dtab", $("dtabs")).forEach(b => b.onclick = () => showTab(b.dataset.k));
  }
  function showTab(k) { dtab = k; LS.set("tab", k); QA(".dbody").forEach(p => { p.hidden = p.dataset.d !== k; }); paintDrawer(); }
  function paintDrawer() { paintTabs(); ({ efectos: dEfectos, retos: dRetos, trastadas: dTrastadas, crupier: dCrupier, vestuario: dVestuario, regalo: dRegalo })[dtab](); }
  const ndis = () => sel ? "" : " disabled";
  function wireLR(box, sel_, fn) {                                            // clic +1, clic derecho -1, pulsacion larga -1
    QA(sel_, box).forEach(c => {
      c.onclick = () => { if (c._long) { c._long = false; return; } fn(c, +1); };
      c.oncontextmenu = e => { e.preventDefault(); fn(c, -1); };
      let lt = 0; c.addEventListener("touchstart", () => { lt = setTimeout(() => { c._long = true; fn(c, -1); }, 480); }, { passive: true });
      c.addEventListener("touchend", () => clearTimeout(lt)); c.addEventListener("touchmove", () => clearTimeout(lt), { passive: true });
    });
  }
  function deny(c) { c.classList.remove("deny"); void c.offsetWidth; c.classList.add("deny"); tone(180, 0, .09, .04); }
  function fly(c, src, back) {
    clink(); spr.play(back ? "snap" : "coin_toss");
    const seat = Q(`.seat[data-sid="${sel}"]`), img = Q("img", c); if (!seat || !img) return;
    const a = img.getBoundingClientRect(), b = seat.getBoundingClientRect(), f = document.createElement("img");
    f.className = "flyer"; f.src = src; f.style.left = a.left + "px"; f.style.top = a.top + "px"; document.body.appendChild(f);
    const dx = b.right - 70 - a.left, dy = b.top + b.height / 2 - 32 - a.top, up = -Math.max(80, Math.abs(dx) * .25);
    const there = `translate(${dx}px, ${dy}px) scale(.5) rotate(540deg)`, mid = `translate(${dx * .5}px, ${dy * .5 + up}px) scale(1.2) rotate(260deg)`, home = "translate(0,0) scale(1) rotate(0)";
    const an = f.animate(back ? [{ transform: there }, { transform: mid, offset: .5 }, { transform: home }] : [{ transform: home }, { transform: mid, offset: .5 }, { transform: there }], { duration: back ? 520 : 620, easing: "cubic-bezier(.3,.6,.4,1)" });
    an.onfinish = () => { f.remove(); clink(); clink(.05); };
  }

  /* ---- efectos: fichas y debufos */
  function dEfectos() {
    const el = $("dEfectos"), F = sel ? fxOf(sel) : null, C = sel ? chOf(sel) : {}, off = !sel || noRetos();
    el.innerHTML = `<div class="sec"><h4>Fichas <small>Caen sobre toda su pantalla, esté donde esté, y se quedan hasta que las quites</small></h4><div class="tray" id="tray">${CHIPS.map(([id, n, k]) => { const v = F ? F[id] : null, lit = k === "on" ? !!v : k === "n" ? v > 0 : false; return `<button class="chip${lit ? " lit" : ""}${k === "on" && v ? " on" : ""}" data-fx="${id}" type="button" title="${n}"${ndis()}><img src="/mesa/fichas/${id}.webp" alt=""><span>${n}</span><b>${k === "on" ? "ON" : k === "n" && v ? "×" + v : ""}</b></button>`; }).join("")}</div><span class="hint"><em>Clic</em> poner · <em>Clic derecho</em> quitar · el rayo cae a cada clic · cristal, huellas y error falso suman hasta ×5</span></div>
      <div class="sec"><h4>Debufos <small>Los retos visuales de la Aventura hechos ficha, ×1 a ×3</small></h4>${noRetos() ? `<div class="warn">Está en el Clásico: los debufos solo existen en la Aventura y el Reto diario.</div>` : ""}<div class="tray" id="tray2">${DEB.map(([id, n, g]) => { const v = C[id] || 0; return `<button class="chip${v ? " lit" : ""}" data-deb="${id}" type="button" title="${n}${g ? " · toda su pantalla" : " · el mapa de su pregunta"}"${off ? " disabled" : ""}><img src="/mesa/fichas/${id}.webp" alt=""><span>${n}</span><b>${v ? "×" + v : ""}</b></button>`; }).join("")}</div><span class="hint">Miopía, borroso, parpadeo, píxeles y batería cubren toda su pantalla; el resto, el mapa de su pregunta.</span></div>`;
    wireLR(el, ".chip[data-fx]", (c, d) => chipHit(c, d));
    wireLR(el, ".chip[data-deb]", (c, d) => { if (!sel || c.disabled) return; const id = c.dataset.deb, v = (chOf(sel)[id] || 0) + d; if (v < 0 || v > 3) return deny(c); fly(c, `/mesa/fichas/${id}.webp`, d < 0); retoSet(id, v); });
  }
  async function chipHit(c, d) {
    if (!sel || c.disabled) return; const id = c.dataset.fx, k = KIND_[id], F = fxOf(sel); let v;
    if (k === "shot") { if (d < 0) return; v = undefined; }
    else if (k === "on") { if (d < 0 && !F[id]) return deny(c); v = d > 0 ? !F[id] : false; }
    else { const n = F[id] + d; if (n < 0 || n > 5) return deny(c); v = n; }
    fly(c, `/mesa/fichas/${id}.webp`, k === "on" ? !v : k === "n" ? d < 0 : false);
    fxSet(id, v);
  }
  function fxSet(id, v, quiet) {
    if (!sel) return; const k = KIND_[id], F = fxOf(sel); if (k !== "shot") F[id] = v; fxAt[sel] = Date.now();
    const label = k === "shot" ? "Rayo" : k === "on" ? `${NAME_[id]}: ${v ? "puesta" : "quitada"}` : `${NAME_[id]}: ${v ? "×" + v : "quitado"}`;
    order(sel, { op: "fx", fx: id, v }, label, { ok: quiet ? "" : k === "shot" ? "¡Rayo! Cae en 1-2 s." : label + "." });
    paintPuesto(); paintDrawer(); paintSeats();
  }

  /* ---- retos */
  let rtab = LS.get("rtab", "sel"), rq = "";
  function dRetos() {
    const el = $("dRetos"), C = sel ? chOf(sel) : {}, off = !sel || noRetos(), packOn = pk => pk[2].every(([id, v]) => C[id] === v);
    const pool = rtab === "sel" ? SEL.map(id => RMAP[id]) : rtab === "on" ? RETOS.filter(r => C[r[0]]) : RETOS.filter(r => r[2] === rtab);
    const shown = rq ? RETOS.filter(r => norm(r[1] + " " + r[4]).includes(norm(rq))) : pool;
    el.innerHTML = `${noRetos() ? `<div class="warn">Está en el Clásico: los retos solo existen en la Aventura y el Reto diario. Se los puedes poner cuando entre en una.</div>` : selSt && (isMenu(selSt) || selSt.sc === "campamento") ? `<div class="warn" style="background:rgba(253,215,66,.1);box-shadow:inset 0 0 0 1px rgba(253,215,66,.4);color:var(--sub)">Fuera de la pregunta solo se notan los que cubren toda su pantalla (borroso, miopía, píxeles, batería, rayos, lluvia…); el resto espera a su próxima pregunta de la Aventura.</div>` : ""}
      <div class="sec"><h4>Paquetes <small>un clic pone varios a la vez; otro clic los quita</small></h4><div class="packs">${PACKS.map((pk, i) => `<button class="pk${sel && packOn(pk) ? " lit" : ""}" type="button" data-i="${i}"${off ? " disabled" : ""}><b>${esc(pk[0])}</b><span>${esc(pk[1])}</span></button>`).join("")}</div></div>
      <div class="sec"><div class="row">${RK.map(([k, n]) => { const c = k === "on" ? Object.keys(C).length : k === "sel" ? 0 : RETOS.filter(r => r[2] === k && C[r[0]]).length; return `<button class="chipb${k === rtab && !rq ? " on" : ""}" type="button" data-k="${k}">${n}${c ? ` ×${c}` : ""}</button>`; }).join("")}<span style="flex:1"></span><input id="rq" class="find" style="min-width:200px" type="search" placeholder="Buscar reto…" value="${esc(rq)}"><button class="chipb red" id="rclear" type="button"${off || !Object.keys(C).length ? " disabled" : ""}>Quitar todos</button></div>
      <div class="rgrid">${shown.map(r => rcHtml(C, r, off)).join("") || `<p class="hint">Ninguno.</p>`}</div><span class="hint"><em>Clic</em> subir de nivel (●●●) · <em>Clic derecho</em> bajarlo · pasa el ratón para ver qué hace cada nivel</span></div>`;
    QA(".pk", el).forEach(b => b.onclick = () => retoPack(PACKS[+b.dataset.i]));
    QA(".row .chipb[data-k]", el).forEach(b => b.onclick = () => { rtab = b.dataset.k; rq = ""; LS.set("rtab", rtab); dRetos(); });
    const qi = $("rq"); qi.oninput = () => { rq = qi.value; const p = qi.selectionStart; dRetos(); const q2 = $("rq"); q2.focus(); q2.setSelectionRange(p, p); };
    $("rclear").onclick = () => { if (!sel) return; chs[sel] = {}; chAt[sel] = Date.now(); clink(); order(sel, { op: "ch", ch: "*", v: 0 }, "Quitas todos los retos", { ok: "Retos quitados." }); paintDrawer(); paintPuesto(); };
    wireLR(el, ".rc", (c, d) => { if (!sel || c.disabled) return; const id = c.dataset.id, n = (chOf(sel)[id] || 0) + d; if (n < 0 || n > 3) return deny(c); clink(); spr.play(d > 0 ? "magic_pass" : "snap"); retoSet(id, n); });
  }
  function rcHtml(C, r, off) {
    const [id, n, k, ico, d, lv] = r, v = C[id] || 0, L = lv ? lv.split("|") : [], tip = n + " — " + d + (L.length ? "\n" + L.map((x, i) => (i + 1) + ": " + x).join("\n") : "") + (k === "flag" ? "\nSolo se nota en las rondas de bandera." : "") + (RNOTE[id] ? "\n" + RNOTE[id] + "." : "");
    return `<button class="rc${v ? " lit" : ""}" type="button" data-id="${id}" title="${esc(tip)}"${off ? " disabled" : ""}><img src="../assets/icons/${ico}.webp" alt=""><span>${esc(n)}</span><i>${pips(v)}</i></button>`;
  }
  function retoSet(id, v) {
    if (!sel) return; const C = chOf(sel), r = RMAP[id]; if (v) C[id] = v; else delete C[id]; chAt[sel] = Date.now();
    order(sel, { op: "ch", ch: id, v }, r ? `${r[1]}: ${v ? "nivel " + v : "quitado"}` : id, { ok: r ? (v ? `${r[1]}: nivel ${v}${RNOTE[id] ? " (" + RNOTE[id] + ")" : ""}` : `${r[1]}: quitado.`) : "" });
    paintDrawer(); paintPuesto(); paintSeats();
  }
  async function retoPack(pk) {
    if (!sel || noRetos()) return; const C = chOf(sel), on = pk[2].every(([id, v]) => C[id] === v), sid = sel;
    chAt[sid] = Date.now(); clink(); spr.play(on ? "snap" : "magic_pass");
    for (const [id, v] of pk[2]) { if (on) delete C[id]; else C[id] = v; }
    paintDrawer(); paintPuesto();
    for (const [id, v] of pk[2]) await order(sid, { op: "ch", ch: id, v: on ? 0 : v }, "");
    logAdd(sid, { q: 0, t: `${pk[0]}: ${on ? "quitado" : "puesto"}`, st: "recv" }); toast(`${pk[0]}: ${on ? "quitado" : "puesto (" + pk[2].length + " retos)"}.`, 1800);
  }

  /* ---- trastadas, huevos y Comodin */
  function dTrastadas() {
    const el = $("dTrastadas");
    el.innerHTML = `<div class="sec"><h4>Trastadas <small>salen ya en su partida; si no está en la pantalla de la trastada, sale lo que se pueda</small></h4><div class="acts">${TRAS.map(([id, n, c]) => `<button class="ac noimg" type="button" data-t="${id}"${ndis()}><b>${esc(n)}</b><small>${esc(c)}</small></button>`).join("")}</div></div>
      <div class="sec"><h4>Huevos de la casa</h4><div class="acts">${HUEVOS.map(([id, n, c]) => `<button class="ac noimg" type="button" data-h="${id}"${ndis()}><b>${esc(n)}</b><small>${esc(c)}</small></button>`).join("")}</div></div>
      <div class="sec"><h4>Comodín <small>el gato de la casa, al momento; si no está, primero viene</small></h4><div class="row">${CAT.map(([k, n]) => `<button class="chipb" type="button" data-c="${k}"${ndis()}>${n}</button>`).join("")}</div></div>`;
    QA("[data-t]", el).forEach(b => b.onclick = () => { clink(); spr.play("magic_pass"); const n = Q("b", b).textContent; act("tras", b.dataset.t, "Trastada: " + n + ".", "Trastada: " + n); });
    QA("[data-h]", el).forEach(b => b.onclick = () => { clink(); const n = Q("b", b).textContent; if (b.dataset.h === "baile") ["snap", "twirl_moustache", "magic_pass", "fan_self", "hat_tip"].forEach((g, i) => setTimeout(() => spr.play(g), i * 1150)); act("huevo", b.dataset.h, n + ".", "Huevo: " + n); });
    QA("[data-c]", el).forEach(b => b.onclick = () => { clink(); act("cat", b.dataset.c, "Comodín: " + b.textContent.toLowerCase() + ".", "Comodín: " + b.textContent.toLowerCase()); });
  }

  /* ---- el crupier al momento: gestos, caras, mirada y humor */
  let gtab = LS.get("gtab", "reacciones");
  function dCrupier() {
    const el = $("dCrupier"), G = A.crupier && A.CRUPIER_DATA ? groups() : {}, P = sel ? putOf(sel) : {};
    const ids = (G[gtab] || []).slice().sort((a, b) => gname(a).localeCompare(gname(b), "es"));
    el.innerHTML = `<div class="sec"><h4>Gesto, ya <small>lo hace en su pantalla al pulsar (aquí lo ensayas)</small></h4><div class="gtabs">${GTABS.filter(([k]) => (G[k] || []).length).map(([k, n]) => `<button class="chipb${k === gtab ? " on" : ""}" type="button" data-k="${k}">${n} <span class="dim">${G[k].length}</span></button>`).join("")}</div><div class="ggrid">${ids.map(id => `<button class="chipb" type="button" data-g="${esc(id)}" title="${esc(id)}">${esc(gname(id))}</button>`).join("")}</div></div>
      <div class="sec"><h4>Cara, ya <small>se la pone en su pantalla y se queda en reposo</small></h4><div class="faces" id="facesNow">${faceList().map(f => `<button class="fc" type="button" data-f="${f}" title="${esc(CARA[f] || f)}"><span>${esc(CARA[f] || f)}</span></button>`).join("")}</div></div>
      <div class="sec"><h4>Mirada</h4><div class="row">${GAZE.map(([n, v], i) => `<button class="chipb${sel && (P.gaze === undefined ? null : P.gaze) === v ? " on" : ""}" type="button" data-gz="${i}"${ndis()}>${n}</button>`).join("")}</div></div>
      <div class="sec"><h4>Humor <small>su cara de reposo y sus bucles de espera</small></h4><div class="row">${HUMOR.map(([n, v]) => `<button class="chipb${(P.humor || null) === v ? " on" : ""}" type="button" data-hm="${v || ""}"${ndis()}>${n}</button>`).join("")}</div></div>`;
    QA("[data-k]", el).forEach(b => b.onclick = () => { gtab = b.dataset.k; LS.set("gtab", gtab); dCrupier(); });
    QA("[data-g]", el).forEach(b => b.onclick = () => { const id = b.dataset.g; spr.release && spr.release(); spr.play(id); act("gest", id, gname(id) + ": ya en su pantalla.", "Gesto: " + gname(id)); });
    QA("#facesNow .fc", el).forEach(b => { head(b.dataset.f, b); b.onclick = () => { spr.set(b.dataset.f); act("face", b.dataset.f, "Cara puesta: " + (CARA[b.dataset.f] || b.dataset.f) + ".", "Cara: " + (CARA[b.dataset.f] || b.dataset.f)); }; });
    QA("[data-gz]", el).forEach(b => b.onclick = () => { const v = GAZE[+b.dataset.gz][1]; spr.release && spr.release(); spr.set("sly"); spr.look(v); gazeSend(v); });
    QA("[data-hm]", el).forEach(b => b.onclick = () => { const v = b.dataset.hm || null, Pv = v && HUMOR_PREV[v]; spr.set(Pv ? Pv[0] : face); if (Pv) spr.play(anyOf(Pv[1])); humorSend(v); });
  }
  function gazeSend(v, quiet) { if (!sel) return; const P = putOf(sel); if (v == null) delete P.gaze; else P.gaze = v; act("gaze", v, quiet ? "" : v == null ? "Mira otra vez al jugador." : "Mirada cambiada.", v == null ? "Mirada: al jugador" : "Mirada: " + (GAZE.find(g => g[1] === v) || ["?"])[0]); paintPuesto(); paintDrawer(); }
  function humorSend(v, quiet) { if (!sel) return; const P = putOf(sel); P.humor = v || null; act("humor", v || null, quiet ? "" : v ? "Humor: " + v + "." : "Humor: según su partida.", "Humor: " + (v || "según su partida")); paintPuesto(); paintDrawer(); }

  /* ---- vestuario: el crupier, Comodin, el puntero y la mesa del mapa (todo sin comprar nada: al irte, vuelve lo suyo) */
  let vtab = LS.get("vtab", "crupier"), ropaPrev = null, vestT = 0;
  const vItems = () => (A.vestuario && A.vestuario.items) || [];
  const vSlots = () => (A.vestuario && A.vestuario.SLOTS) || ["traje", "antifaz", "pajarita", "chistera", "lunares", "clavel", "cadena", "pluma", "veneciano", "gafas", "cristal"];
  const blank = () => Object.fromEntries(vSlots().map(s => [s, null]));
  const vname = it => String(it.n || it.id).split("|")[0];
  const CASA = { traje: "morado", antifaz: "oro", pajarita: "rojo" };
  const hex = (slot, c) => (A.vestuario && A.vestuario.hex && A.vestuario.hex(slot, c)) || "#555";
  const MESAS = window.MESA_MESAS || [];
  function dVestuario() {
    const el = $("dVestuario"), P = sel ? putOf(sel) : {};
    let body = "";
    if (vtab === "crupier") {
      const R = P.vest || ropaPrev || blank(), cols = (A.vestuario && A.vestuario.colors) || [];
      const row = (slot, n) => `<div class="vrow"><span>${n}</span><div class="sw">${cols.map(c => { const v = c === CASA[slot] ? null : c, on = (R[slot] || null) === v; return `<button class="swc${on ? " on" : ""}" type="button" data-s="${slot}" data-c="${c}" title="${esc(c)}${c === CASA[slot] ? " (el de la casa)" : ""}" style="background:${hex(slot, c)}">${c === CASA[slot] ? "<i>casa</i>" : ""}</button>`; }).join("")}</div></div>`;
      const PZ = vItems().filter(i => i.r === "p" || i.slot === "chistera");
      body = `<div class="sec"><h4>Don Crupier <small>se lo pones en directo y lo ves aquí al lado; al irte, vuelve a lo suyo</small></h4>${row("traje", "Traje")}${row("antifaz", "Antifaz")}${row("pajarita", "Pajarita y cinta")}
        <div class="vrow"><span>Piezas</span><div class="row">${PZ.map(it => `<button class="chipb${R[it.slot] === it.v ? " on" : ""}" type="button" data-p="${esc(it.id)}">${esc(vname(it))}</button>`).join("") || `<span class="hint">Sin el vestuario del juego cargado.</span>`}</div></div>
        <div class="row"><button class="chipb" id="vMine" type="button"${ndis()}>Lo suyo (lo que lleva él)</button><button class="chipb" id="vHouse" type="button">Lo de la casa</button></div></div>`;
    } else if (vtab === "gato") {
      const G = P.gato || {}, gi = vItems().filter(i => i.r === "g"), by = s => gi.filter(i => i.slot === s);
      body = `<div class="gato"><div class="prob" id="prob"></div><div class="sec"><h4>Comodín <small>pelaje, ojos, pajarita y una pieza; al irte, vuelve a lo suyo</small></h4>
        <div class="vrow"><span>Pelaje</span><div class="row">${by("gpelo").map(it => `<button class="chipb${(G.gpelo || "casa") === it.v ? " on" : ""}" type="button" data-g="gpelo" data-v="${it.v}">${esc(vname(it))}</button>`).join("")}</div></div>
        <div class="vrow"><span>Ojos</span><div class="row">${by("gojos").map(it => `<button class="chipb${(G.gojos || "casa") === it.v ? " on" : ""}" type="button" data-g="gojos" data-v="${it.v}">${esc(vname(it).replace(/^Ojos (S)/, (m, c) => c.toUpperCase()))}</button>`).join("")}</div></div>
        <div class="vrow"><span>Pajarita</span><div class="sw">${by("gpaj").map(it => `<button class="swc${(G.gpaj || "granate") === it.v ? " on" : ""}" type="button" data-g="gpaj" data-v="${it.v}" title="${esc(vname(it))}" style="background:${hex("pajarita", it.v)}">${it.v === "granate" ? "<i>casa</i>" : ""}</button>`).join("")}</div></div>
        <div class="vrow"><span>Pieza</span><div class="row"><button class="chipb${!G.gpieza ? " on" : ""}" type="button" data-g="gpieza" data-v="">Ninguna</button>${by("gpieza").map(it => `<button class="chipb${G.gpieza === it.v ? " on" : ""}" type="button" data-g="gpieza" data-v="${it.v}">${esc(vname(it))}</button>`).join("")}</div></div>
        <div class="row"><button class="chipb" id="gMine" type="button"${ndis()}>Lo suyo</button></div></div></div>`;
    } else if (vtab === "ptr") {
      const T = P.ptr || {}, Pn = A.punteros;
      body = Pn ? `<div class="sec"><h4>Su puntero <small>retícula, chincheta, línea y diana: se las pones a prueba, sin que sean suyas</small></h4>${Pn.SLOTS.map(s => `<div class="vrow"><span>${PSLOT[s] || s}</span><div class="thumbs">${Pn.list(s).map(id => `<button class="th${(T[s] || "casa") === id ? " on" : ""}" type="button" data-ps="${s}" data-pi="${id}" title="${esc(Pn.name(s, id))}"><canvas width="72" height="72" data-ps="${s}" data-pi="${id}"></canvas><span>${esc(Pn.name(s, id))}</span></button>`).join("")}</div></div>`).join("")}<div class="row"><button class="chipb" id="pMine" type="button"${ndis()}>Lo suyo</button></div></div>` : `<p class="hint">Sin los punteros del juego cargados.</p>`;
    } else {
      const cur = P.mesa || null, T = { "": "De la casa", r: "Rara", l: "Legendaria" };
      body = `<div class="sec"><h4>Mesa del mapa <small>le cambias el paño del mapa a prueba; al irte, vuelve a la suya</small></h4><div class="thumbs">${MESAS.map(m => `<button class="th${cur === m[0] ? " on" : ""}" type="button" data-m="${m[0]}" title="${esc(m[1] + " — " + m[3])}"><canvas width="72" height="40" data-m="${m[0]}" style="width:72px;height:40px;margin:16px 0"></canvas><span>${esc(m[1])}</span><em>${m[2][0] === "a" ? "Ascensión " + ASCN[+m[2].slice(1)] : T[m[2]] || ""}</em></button>`).join("")}</div><div class="row"><button class="chipb" id="mMine" type="button"${ndis()}>La suya</button></div></div>`;
    }
    el.innerHTML = `<div class="row">${VTAB.map(([k, n]) => `<button class="chipb${k === vtab ? " on" : ""}" type="button" data-vt="${k}">${n}${P[{ crupier: "vest", gato: "gato", ptr: "ptr", mapa: "mesa" }[k]] ? " ●" : ""}</button>`).join("")}</div>` + body;
    QA("[data-vt]", el).forEach(b => b.onclick = () => { vtab = b.dataset.vt; LS.set("vtab", vtab); dVestuario(); });
    if (vtab === "crupier") {
      QA(".swc[data-s]", el).forEach(b => b.onclick = () => { const R = Object.assign(blank(), (sel && putOf(sel).vest) || ropaPrev || {}); R[b.dataset.s] = b.dataset.c === CASA[b.dataset.s] ? null : b.dataset.c; vestTry(R); });
      QA("[data-p]", el).forEach(b => b.onclick = () => { const it = vItems().find(i => i.id === b.dataset.p); if (!it) return; const R = Object.assign(blank(), (sel && putOf(sel).vest) || ropaPrev || {}); R[it.slot] = R[it.slot] === it.v ? null : it.v; vestTry(R); });
      $("vMine").onclick = () => vestSend(null); $("vHouse").onclick = () => vestTry(blank());
    } else if (vtab === "gato") {
      const G = Object.assign({}, P.gato || {}); probador(G);
      QA("[data-g]", el).forEach(b => b.onclick = () => { const g = Object.assign({}, (sel && putOf(sel).gato) || {}), s = b.dataset.g, v = b.dataset.v || null; g[s] = (s === "gpelo" || s === "gojos") && v === "casa" || s === "gpaj" && v === "granate" ? null : v; gatoSend(g); });
      $("gMine").onclick = () => gatoSend(null);
    } else if (vtab === "ptr" && A.punteros) {
      QA("canvas[data-ps]", el).forEach(c => { try { A.punteros.thumb(c, c.dataset.ps, c.dataset.pi, 0.62); } catch (e) { /* sin dibujo */ } });
      QA(".th[data-ps]", el).forEach(b => b.onclick = () => { const T = Object.assign({}, (sel && putOf(sel).ptr) || {}); T[b.dataset.ps] = b.dataset.pi === "casa" || T[b.dataset.ps] === b.dataset.pi ? null : b.dataset.pi; ptrSend(Object.values(T).some(Boolean) ? T : null); });
      $("pMine").onclick = () => ptrSend(null);
    } else if (vtab === "mapa") {
      QA("canvas[data-m]", el).forEach(c => mesaThumb(c, MESAS.find(m => m[0] === c.dataset.m)));
      QA(".th[data-m]", el).forEach(b => b.onclick = () => mesaSend(putOf(sel || "").mesa === b.dataset.m ? null : b.dataset.m));
      $("mMine").onclick = () => mesaSend(null);
    }
  }
  /* la ropa del crupier: se ensaya al momento en el de la mesa y se le manda entera (A.vestuario.preview en su juego) */
  function vestTry(R) { ropaPrev = R; dressPrev(); if (sel) { putOf(sel).vest = R; clearTimeout(vestT); vestT = setTimeout(() => act("vest", R, "Ropa puesta en su partida.", "Ropa del crupier"), 350); paintPuesto(); } dVestuario(); paintTabs(); }
  function vestSend(R, quiet) { ropaPrev = R; dressPrev(); if (!sel) return; if (R) putOf(sel).vest = R; else delete putOf(sel).vest; clearTimeout(vestT); act("vest", R, quiet ? "" : R ? "Ropa puesta." : "Vuelve a llevar lo suyo.", R ? "Ropa del crupier" : "Ropa: la suya"); paintPuesto(); paintDrawer(); }
  function dressPrev() {
    if (!A.vestuario || !A.vestuario.ready) return;
    try { A.vestuario.ready(() => { const at = ropaPrev ? A.vestuario.atlasFor(Object.assign(blank(), ropaPrev)) : null; spr.dress(at); spr.play(anyOf(["r_prueba_ropa", "preen", "e_desfile"])); }); } catch (e) { /* sin mapa de partes */ }
  }
  /* Comodin: el probador de la tienda (A.comodin.preview) con su ropa, y se la manda */
  function probador(G) {
    const host = $("prob"); if (!host || !A.comodin || !A.comodin.preview || !A.vestuario || !A.vestuario.gato) return;
    try { A.comodin.ropa(() => { const L = A.vestuario.gato.look(Object.assign({ gpelo: null, gojos: null, gpaj: null, gpieza: null }, G || {})); A.comodin.preview(host, L); }); } catch (e) { /* sin gato */ }
  }
  function gatoSend(G, quiet) { if (!sel) return; const P = putOf(sel); if (G && Object.values(G).some(Boolean)) P.gato = G; else { delete P.gato; G = null; } act("gato", G, quiet ? "" : G ? "Comodín vestido." : "Comodín vuelve a lo suyo.", G ? "Ropa de Comodín" : "Comodín: lo suyo"); paintPuesto(); paintDrawer(); }
  function ptrSend(T, quiet) { if (!sel) return; const P = putOf(sel); if (T) P.ptr = T; else delete P.ptr; act("ptr", T, quiet ? "" : T ? "Puntero puesto." : "Vuelve a su puntero.", T ? "Puntero a prueba" : "Puntero: el suyo"); paintPuesto(); paintDrawer(); }
  function mesaSend(id, quiet) { if (!sel) return; const P = putOf(sel), m = MESAS.find(x => x[0] === id); if (id) P.mesa = id; else delete P.mesa; act("mesa", id || null, quiet ? "" : id ? "Mesa del mapa: " + (m ? m[1] : id) + "." : "Vuelve a su mesa del mapa.", id ? "Mesa del mapa: " + (m ? m[1] : id) : "Mesa del mapa: la suya"); paintPuesto(); paintDrawer(); }
  /* la miniatura de una mesa del mapa: su mar (degradado en dos bandas) y el mundo del juego a 36x20 (mesa/datos.js) con sus tres tierras y su linea, a x2 */
  function mesaThumb(c, m) {
    if (!m) return; const g = c.getContext("2d"), k = 2, M = window.MESA_MUNDO || [], H = M.length || 20, Wd = (M[0] || "").length || 36; c.width = Wd * k; c.height = H * k; g.imageSmoothingEnabled = false;
    for (let y = 0; y < H; y++) { g.fillStyle = y < H / 2 ? m[4] : m[5]; g.fillRect(0, y * k, Wd * k, k); }
    const land = ch => ch && ch !== ".";
    M.forEach((r, y) => [...r].forEach((ch, x) => { if (!land(ch)) return; g.fillStyle = m[6 + "abc".indexOf(ch)] || m[6]; g.fillRect(x * k, y * k, k, k); }));
    g.fillStyle = m[9];                                                         // la linea: el borde de abajo y de la derecha de cada trozo de tierra que da al mar o a otro pais
    M.forEach((r, y) => [...r].forEach((ch, x) => { if (!land(ch)) return; if (r[x + 1] !== ch) g.fillRect(x * k + k - 1, y * k, 1, k); if (!M[y + 1] || M[y + 1][x] !== ch) g.fillRect(x * k, y * k + k - 1, k, 1); }));
  }

  /* ---- el regalo de la casa: fichas de oro, al elegido o a todos (doble pulsacion) */
  let gArm = 0, gN = 300;
  function dRegalo() {
    const el = $("dRegalo"), txt = n => `El desarrollador te obsequia con ${n} fichas de oro para que te puedas poner guapo.`;
    el.innerHTML = `<div class="sec"><h4>Regalo de la casa <small>fichas de oro para la tienda; le sale un aviso en su pantalla, en su idioma</small></h4>
      <div class="gift"><img src="../assets/icons/ficha_oro.webp" alt=""><input id="gAmt" type="number" min="1" max="5000" step="50" value="${gN}" inputmode="numeric" aria-label="Fichas de oro">${[100, 300, 500, 1000].map(n => `<button class="chipb${n === gN ? " on" : ""}" type="button" data-n="${n}">${n}</button>`).join("")}</div>
      <div class="preview"><b>REGALO DE LA CASA</b><span id="gMsg">${esc(txt(gN))}</span></div>
      <div class="row"><button class="btn" id="gOne" type="button"${ndis()}>Regalar a ${esc(selSt ? selSt.n || "este jugador" : "…")}</button><button class="btn red" id="gAll" type="button"${list.length ? "" : " disabled"}>${gArm ? `¿Seguro? ${gN} a cada uno de los ${list.length} (pulsa otra vez)` : `Regalar a todos (${list.length})`}</button></div></div>`;
    const inp = $("gAmt"); inp.oninput = () => { const n = Math.round(+inp.value); gN = n >= 1 && n <= 5000 ? n : gN; $("gMsg").textContent = n >= 1 && n <= 5000 ? txt(n) : "Pon una cantidad de 1 a 5000."; };
    QA("[data-n]", el).forEach(b => b.onclick = () => { gN = +b.dataset.n; dRegalo(); });
    $("gOne").onclick = async () => { if (!sel) return; clink(); const ok = await order(sel, { op: "gift", n: gN }, `Regalo: ${gN} fichas de oro`); if (ok) toast(gN + " fichas de oro en camino."); };
    $("gAll").onclick = async () => {
      if (!list.length) return;
      if (!gArm) { gArm = setTimeout(() => { gArm = 0; dRegalo(); }, 5000); dRegalo(); return; }
      clearTimeout(gArm); gArm = 0; clink(); let ok = 0; for (const x of list) if (await order(x.sid, { op: "gift", n: gN }, `Regalo: ${gN} fichas de oro`)) ok++;
      toast(ok + (ok === 1 ? " jugador recibe " : " jugadores reciben ") + gN + " fichas de oro.", 3200); dRegalo();
    };
  }

  /* ================================================================ EL CRUPIER Y LO QUE DICES */
  let face = "sly", gest = "", voz = "", fsel = null, allOn = false;   // fsel: la frase elegida de la lista (si tocas el texto, ya es tuya)
  const head = (f, el) => { const s = A.crupier.still(f, 1, "head"); if (s) el.style.backgroundImage = `url(${s})`; };
  function faceList() { const D = A.CRUPIER_DATA; return Object.keys((D && D.caps) || {}).length ? Object.keys(D.caps) : (A.crupier.list ? A.crupier.list() : Object.keys(CARA)); }
  function paintTarget() {
    const T = $("target"), st = selSt;
    if (!st) { T.innerHTML = `<span class="dim" style="font-size:22px">Sin partida: ensayas para ti.</span>`; $("lvTag").textContent = "Ensayo"; return; }
    T.innerHTML = `<i class="flag" style="background-image:url(${flagOf(allOn ? "es" : st.l)})"></i><b>${allOn ? "A todos" : esc(st.n || "Sin nombre")}</b><span class="lang">${allOn ? list.length + " partidas" : "juega en " + esc(LANG[st.l] || st.l)}</span><span class="sp"></span><span class="seg"><button type="button" data-a="0" aria-pressed="${!allOn}">A ${esc((st.n || "él").split(" ")[0])}</button><button type="button" class="all" data-a="1" aria-pressed="${allOn}">A todos (${list.length})</button></span>`;
    QA(".seg button", T).forEach(b => b.onclick = () => { allOn = b.dataset.a === "1"; paintTarget(); refresh(); });
    $("lvTag").textContent = phrase("EN DIRECTO|LIVE|EN DIRECT|AO VIVO|LIVE|IN DIRETTA|EN VIVO|直播中|생방송|生放送|В ЭФИРЕ|NA ŻYWO", allOn ? "es" : st.l);
  }
  /* lo que de verdad le llegara */
  const outText = () => fsel ? (fsel.qi != null ? phrase(QUICK[fsel.qi][1], lang()) : fsel.es) : $("txt").value.trim();
  function refresh() {
    const tx = $("txt"), n = [...tx.value].length, out = outText(), p = $("prev"), l = lang();
    $("count").textContent = n + " / 160"; $("count").classList.toggle("max", n >= 160);
    if (!playing) { p.innerHTML = out ? markHtml(out) : esc(sel ? "Lo que escribas sale aquí, tal cual lo verá." : "Elige una partida y hablamos."); p.classList.toggle("ph", !out); spr.talk(!!out); if (out) spr.syl(); }
    $("bub").className = "bub" + (voz ? " st-" + voz : "");
    $("send").disabled = !(sel && (out || fsel));
    const who = allOn ? "a todos" : "le";
    const wt = selSt && selSt.lw && WAIT[selSt.lw] && !allOn ? `<b>Ojo:</b> ${esc(WAIT[selSt.lw])} ` : "";
    $("arrives").innerHTML = !sel ? "" : wt + (fsel && fsel.li ? `Frase del juego: ${who} llega la suya${allOn ? ", en el idioma de cada uno" : same(l) ? "" : `, en <b>${esc(LANG[l] || l)}</b>`}.` : fsel ? (allOn || !same(l) ? `Frase de la mesa: ${who} llega traducida${allOn ? "" : ` al <b>${esc(LANG[l] || l)}</b>`}.` : `Frase de la mesa: ${who} llega tal cual.`) : out ? (allOn || same(l) ? `Tu texto ${who} llega tal cual.` : `Tu texto le llega tal cual. Juega en <b>${esc(LANG[l] || l)}</b>.`) : "");
    paintPicks();
  }
  function paintPicks() {
    $("pkVoz").innerHTML = `<i class="vi"></i>Voz: ${esc(VNAME[voz] || "Habla")}`; $("pkVoz").classList.toggle("set", !!voz);
    $("pkCara").innerHTML = `<i class="fi" id="pkFi"></i>${face === "sly" ? "Cara: la suya" : "Cara: " + esc(CARA[face] || face)}`; $("pkCara").classList.toggle("set", face !== "sly"); if (A.crupier && A.crupier.still) head(face, $("pkFi"));
    $("pkGesto").innerHTML = gest ? `Gesto: ${esc(gname(gest))}` : `Gesto: <em>ninguno</em>`; $("pkGesto").classList.toggle("set", !!gest);
  }
  /* los desplegables de la frase: voz, cara y gesto */
  let popEl = null;
  function popClose() { if (popEl) { popEl.remove(); popEl = null; } }
  function popOpen(anchor, title, html, wire) {
    popClose(); const el = popEl = document.createElement("div"); el.className = "popv"; el.innerHTML = `<header><h5>${esc(title)}</h5><button class="chipb" type="button" data-x>Cerrar</button></header><div class="pb scroll">${html}</div>`; document.body.appendChild(el);
    const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight; el.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left)) + "px"; el.style.top = (r.top - h - 8 > 60 ? r.top - h - 8 : Math.min(innerHeight - h - 12, r.bottom + 8)) + "px";
    Q("[data-x]", el).onclick = popClose; wire(el);
  }
  addEventListener("pointerdown", e => { if (popEl && !popEl.contains(e.target) && !e.target.closest(".pick")) popClose(); }, true);
  $("pkVoz").onclick = () => popOpen($("pkVoz"), "Voz del bocadillo", `<div class="vgrid">${VOCES.map(([k, n, d]) => `<button class="vg bub${k ? " st-" + k : ""}${k === voz ? " on" : ""}" type="button" data-v="${k}" style="clip-path:none;animation:none">${n}<small>${d}</small></button>`).join("")}</div>`, el => QA("[data-v]", el).forEach(b => b.onclick = () => { voz = b.dataset.v; popClose(); refresh(); rehearse(outText() || "¡Ojo con lo que haces!"); }));
  $("pkCara").onclick = () => popOpen($("pkCara"), "Cara de la frase", `<div class="faces">${faceList().map(f => `<button class="fc${f === face ? " on" : ""}" type="button" data-f="${f}" title="${esc(CARA[f] || f)}"><span>${esc(CARA[f] || f)}</span></button>`).join("")}</div>`, el => QA(".fc", el).forEach(b => { head(b.dataset.f, b); b.onclick = () => { face = b.dataset.f; spr.set(face); popClose(); refresh(); }; }));
  $("pkGesto").onclick = () => {
    const G = groups(), all = GTABS.flatMap(([k, n]) => (G[k] || []).map(id => [id, n]));
    popOpen($("pkGesto"), "Gesto con la frase", `<div class="lfind" style="padding:0"><input id="gq" type="search" placeholder="Buscar gesto…"></div><div class="row"><button class="chipb${!gest ? " on" : ""}" type="button" data-g="">Ninguno</button></div><div class="ggrid" id="gl"></div>`, el => {
      const draw = () => { const q = norm($("gq").value); $("gl").innerHTML = all.filter(([id]) => !q || norm(gname(id)).includes(q)).map(([id, n]) => `<button class="chipb${id === gest ? " on" : ""}" type="button" data-g="${esc(id)}" title="${esc(n)}">${esc(gname(id))}</button>`).join(""); QA("[data-g]", el).forEach(b => b.onclick = () => { gest = b.dataset.g; if (gest) { spr.release && spr.release(); spr.play(gest); } popClose(); refresh(); }); };
      $("gq").oninput = draw; draw(); $("gq").focus();
    });
  };
  /* elegir una frase (de la lista o del buscador): va al bocadillo; si tocas el texto, ya es tuya y llega tal cual */
  function loadF(f) {
    fsel = f; const tx = $("txt");
    if (f) { tx.value = plain(f.es); if (f.face) face = f.face; voz = f.voz || ""; spr.set(face); clink(); } else if (fsel === null && tx._fromF) tx.value = "";
    tx._fromF = !!f; refresh(); if (libTab === "frases") QA(".fr", $("flist")).forEach(r => r.classList.toggle("on", !!f && r.dataset.id === f.id));
  }
  /* ENSAYO: la escena entera como la vera el jugador (letra a letra, marcas incluidas) */
  let playing = false, playT = 0;
  function stop(reset) { clearTimeout(playT); playing = false; $("play").textContent = "Ensayar"; spr.talk(false); if (spr.release) spr.release(); if (reset) refresh(); }
  function rehearse(text) {
    const t = String(text || outText()).trim();
    stop(false); playing = true; $("play").textContent = "Parar";
    if (spr.release) spr.release(); spr.set(face, { restart: true }); if (gest) spr.play(gest);
    if (!t) { playT = setTimeout(() => stop(true), 2800); return; }
    const bub = $("bub"), p = $("prev"); bub.classList.remove("pop"); void bub.offsetWidth; bub.classList.add("pop"); p.classList.remove("ph");
    p.innerHTML = parts(t).map(([c, x]) => `<span${c ? ` class="${c}"` : ""}>${[...x].map(ch => `<span class="rest">${esc(ch)}</span>`).join("")}</span>`).join("");   // el bocadillo nace con su tamano final
    const L = QA(".rest", p), step = { grito: 22, canto: 52, susurro: 62, nervios: 30, siniestro: 70, libreta: 28, senal: 36, anuncio: 40, sueno: 85, drama: 66, jefe: 48 }[voz] || (face === "laugh" ? 44 : 34); let i = 0;
    const tick = () => {
      if (!playing) return;
      if (i >= L.length) { spr.talk(false); playT = setTimeout(() => stop(false), 2800); return; }
      const ch = L[i].textContent; L[i].classList.remove("rest"); if (/\S/.test(ch)) { spr.syl(); if (i % 2 === 0 && face !== "laugh") blip(i); } i++;
      playT = setTimeout(tick, step + (/[.,!?…。！？]/.test(ch) ? 140 : 0));
    };
    playT = setTimeout(() => { spr.talk(true); tick(); }, 300);
  }
  async function send(fOverride) {
    const f = fOverride || fsel, tx = $("txt"); if (!sel) return;
    const sids = allOn ? list.map(x => x.sid) : [sel]; if (!sids.length) return;
    const own = !f ? tx.value.trim() : ""; if (!f && !own) return;
    $("send").disabled = true; let ok = 0;
    for (const sid of sids) {
      const st = (list.find(x => x.sid === sid) || {}).st || {}, l = st.l || "es";
      const t = f ? (f.qi != null ? phrase(QUICK[f.qi][1], l) : plain(f.es)) : own, es = f && (f.qi != null ? !same(l) : !same(l)) ? plain(f.es) : "";
      const body = { op: "say", t, e: face, g: gest, s: voz }; if (f && f.li) body.li = f.li;
      if (await order(sid, body, f && f.li ? plain(f.es) : t, { es: f && f.li && !same(l) ? "frase del juego, en " + (LANG[l] || l) : es, say: true })) ok++;
    }
    if (ok) { toast(sids.length > 1 ? `En antena para ${ok} de ${sids.length}.` : "En antena. Le llega en 1-2 s."); rehearse(f ? (f.qi != null ? phrase(QUICK[f.qi][1], "es") : f.es) : own); if (!fOverride) { fsel = null; tx.value = ""; tx._fromF = false; } gest = ""; }
    else if (sids.length > 1) toast("No ha llegado a nadie.");
    $("send").disabled = false; refresh(); if (libTab === "log") renderLib(); tx.focus();
  }

  /* ================================================================ LAS FRASES Y LO MANDADO */
  let libTab = "frases", mom = null, fq = "", logAll = false, srvLog = null, showN = 120;
  const momFor = st => !st ? null : isMenu(st) ? "portada" : st.sc === "campamento" ? "tienda" : st.ph === "asking" ? "partida" : null;
  function autoMom() { mom = momFor(selSt); }
  function renderLib() {
    const nF = FR.length, nL = sel ? (said[sel] || []).length : 0;
    $("ltabs").innerHTML = `<button class="dtab" type="button" aria-selected="${libTab === "frases"}" data-l="frases">Frases <small style="background:var(--line2)">${fmt(nF)}</small></button><button class="dtab" type="button" aria-selected="${libTab === "log"}" data-l="log">Lo mandado${nL ? ` <small style="background:var(--line2)">${nL}</small>` : ""}</button>`;
    QA("[data-l]", $("ltabs")).forEach(b => b.onclick = () => { libTab = b.dataset.l; renderLib(); });
    $("lfind").classList.toggle("hidden", libTab !== "frases");
    if (libTab === "frases") {
      const q = norm(fq), pool = FR.filter(f => (!mom || f.mom === mom) && (!q || f.n.includes(q)));
      const counts = {}; FR.forEach(f => { if (!q || f.n.includes(q)) counts[f.mom] = (counts[f.mom] || 0) + 1; });
      $("moms").classList.remove("hidden");
      $("moms").innerHTML = `<button class="chipb${!mom ? " on" : ""}" type="button" data-m="">Todas<small>${fmt(Object.values(counts).reduce((a, b) => a + b, 0))}</small></button>` + MOMS.filter(([k]) => counts[k]).map(([k, n]) => `<button class="chipb${k === mom ? " on" : ""}" type="button" data-m="${k}">${n}<small>${counts[k]}</small></button>`).join("");
      QA("[data-m]", $("moms")).forEach(b => b.onclick = () => { mom = b.dataset.m || null; showN = 120; renderLib(); });
      const l = lang();
      $("flist").innerHTML = pool.slice(0, showN).map(f => `<div class="fr${fsel && fsel.id === f.id ? " on" : ""}" data-id="${esc(f.id)}" role="button" tabindex="0"><p>${markHtml(f.es)}<small>${f.mom === "mesa" ? "de la mesa · " + (same(l) ? "tal cual" : "traducida") : esc(MNAME[f.mom] || f.mom)}${f.voz ? " · voz " + esc(VNAME[f.voz] || f.voz) : ""}</small></p><button class="go" type="button" data-go="${esc(f.id)}" title="Decirla ya">Decir</button></div>`).join("") +
        (pool.length > showN ? `<button class="chipb" type="button" id="more" style="justify-self:center;margin:6px">Ver ${Math.min(200, pool.length - showN)} más (${fmt(pool.length - showN)} sin ver)</button>` : "") + (pool.length ? "" : `<p class="hint" style="padding:10px">Ninguna frase con «${esc(fq)}».</p>`);
      const byId = Object.fromEntries(FR.map(f => [f.id, f]));
      QA(".fr", $("flist")).forEach(r => { r.onclick = e => { if (e.target.closest(".go")) return; loadF(byId[r.dataset.id]); }; r.onkeydown = e => { if (e.key === "Enter") loadF(byId[r.dataset.id]); }; });
      QA(".go", $("flist")).forEach(b => b.onclick = () => { if (!sel) return toast("Primero elige una partida."); const f = byId[b.dataset.go]; send(f); });
      const mo = $("more"); if (mo) mo.onclick = () => { showN += 200; renderLib(); };
    } else {
      $("moms").classList.remove("hidden");
      $("moms").innerHTML = `<button class="chipb${!logAll ? " on" : ""}" type="button" data-g="0">Esta partida</button><button class="chipb${logAll ? " on" : ""}" type="button" data-g="1">Todo lo dicho (7 días)</button>`;
      QA("[data-g]", $("moms")).forEach(b => b.onclick = async () => { logAll = b.dataset.g === "1"; if (logAll) { try { const j = await call("GET", null, "?log=1"); srvLog = j.log || []; } catch (e) { srvLog = []; } } renderLib(); });
      const ST = { sent: "Enviada", recv: "Le ha llegado", said: "La está diciendo", fail: "No ha llegado" };   // las acciones: enviada y le ha llegado
      const hm = t => new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      if (logAll) $("flist").innerHTML = (srvLog || []).map(x => `<div class="lg"><i>${hm(x.at)}</i><b>${esc(x.t)}<em>${esc(x.who || "sin nombre")}</em></b><span></span></div>`).join("") || `<p class="hint" style="padding:10px">Nada en los últimos 7 días.</p>`;
      else { const a = sel ? said[sel] || [] : []; $("flist").innerHTML = a.length ? a.slice().reverse().map(x => `<div class="lg"><i>${hm(x.at)}</i><b>${esc(x.t)}${x.es ? `<em>${esc(x.es)}</em>` : ""}</b><span class="stt ${x.st}">${ST[x.st]}</span></div>`).join("") : `<p class="hint" style="padding:10px">${sel ? "Todavía nada. Rompe el hielo." : "Elige una partida."}</p>`; }
    }
  }
  $("fq").oninput = () => { fq = $("fq").value; showN = 120; renderLib(); };

  /* ================================================================ EL BUSCADOR: Ctrl+K busca y lanza cualquier cosa */
  let palItems = null, palI = 0, palRes = [];
  function palBuild() {
    const it = [], need = fn => () => { if (!sel) { toast("Primero elige una partida."); return; } fn(); };
    FR.forEach(f => it.push({ k: "Frase", t: plain(f.es), s: (MNAME[f.mom] || f.mom) + (f.voz ? " · voz " + (VNAME[f.voz] || f.voz) : ""), n: f.n, ic: "", run: () => loadF(f), now: need(() => send(f)) }));
    RETOS.forEach(r => it.push({ k: "Reto", t: r[1], s: r[4], n: norm(r[1] + " " + r[4]), ic: `../assets/icons/${r[3]}.webp`, run: need(() => { if (noRetos()) return toast("Los retos solo existen en la Aventura."); const v = ((chOf(sel)[r[0]] || 0) % 3) + 1; retoSet(r[0], v); }) }));
    PACKS.forEach(pk => it.push({ k: "Paquete", t: pk[0], s: pk[1], n: norm(pk[0] + " " + pk[1]), ic: "", run: need(() => retoPack(pk)) }));
    CHIPS.forEach(([id, n, k]) => it.push({ k: "Ficha", t: n, s: k === "shot" ? "uno por clic" : k === "on" ? "poner o quitar" : "suma ×1 a ×5", n: norm(n + " ficha"), ic: `/mesa/fichas/${id}.webp`, run: need(() => { const F = fxOf(sel); fxSet(id, k === "shot" ? undefined : k === "on" ? !F[id] : Math.min(5, F[id] + 1)); }) }));
    TRAS.forEach(([id, n, c]) => it.push({ k: "Trastada", t: n, s: c, n: norm(n + " " + c + " trastada"), ic: "", run: need(() => act("tras", id, "Trastada: " + n + ".", "Trastada: " + n)) }));
    HUEVOS.forEach(([id, n, c]) => it.push({ k: "Huevo", t: n, s: c, n: norm(n + " " + c + " huevo"), ic: "", run: need(() => act("huevo", id, n + ".", "Huevo: " + n)) }));
    CAT.forEach(([id, n]) => it.push({ k: "Comodín", t: n, s: "el gato, al momento", n: norm(n + " comodin gato"), ic: "", run: need(() => act("cat", id, "Comodín: " + n.toLowerCase() + ".", "Comodín: " + n.toLowerCase())) }));
    try { const G = groups(); Object.values(G).flat().forEach(id => it.push({ k: "Gesto", t: gname(id), s: "lo hace ya en su pantalla", n: norm(gname(id) + " gesto " + id), ic: "", run: need(() => { spr.play(id); act("gest", id, gname(id) + ": ya en su pantalla.", "Gesto: " + gname(id)); }) })); } catch (e) { /* sin gestos */ }
    faceList().forEach(f => it.push({ k: "Cara", t: "Cara: " + (CARA[f] || f), s: "la de la próxima frase", n: norm((CARA[f] || f) + " cara " + f), ic: "", head: f, run: () => { face = f; spr.set(f); refresh(); } }));
    VOCES.forEach(([k, n, d]) => it.push({ k: "Voz", t: "Voz: " + n, s: d, n: norm(n + " voz " + d), ic: "", run: () => { voz = k; refresh(); rehearse(outText() || "¡Ojo con lo que haces!"); } }));
    MESAS.forEach(m => it.push({ k: "Mesa", t: "Mesa del mapa: " + m[1], s: m[3], n: norm(m[1] + " mesa mapa " + m[3]), ic: "", run: need(() => mesaSend(m[0])) }));
    if (A.punteros) A.punteros.SLOTS.forEach(s => A.punteros.list(s).forEach(id => { const nm = A.punteros.name(s, id); it.push({ k: "Puntero", t: (PSLOT[s] || s) + ": " + nm, s: "a prueba, sin comprarlo", n: norm(nm + " puntero " + (PSLOT[s] || s)), ic: "", run: need(() => { const T = Object.assign({}, putOf(sel).ptr || {}); T[s] = id === "casa" ? null : id; ptrSend(Object.values(T).some(Boolean) ? T : null); }) }); }));
    ((A.vestuario && A.vestuario.colors) || []).forEach(c => it.push({ k: "Ropa", t: "Traje " + c, s: "el crupier, en su partida", n: norm("traje " + c + " ropa"), ic: "", sw: hex("traje", c), run: () => { const R = Object.assign(blank(), (sel && putOf(sel).vest) || ropaPrev || {}); R.traje = c === CASA.traje ? null : c; vestTry(R); } }));
    [["Ver su pantalla", "le pide permiso", () => camStart()], ["Colgar la cámara", "", () => camStop()], ["Quitar todo", "lo que le tienes puesto", () => allOff()], ["Regalar fichas de oro", "abre el cajón del regalo", () => showTab("regalo")]].forEach(([t, s, fn]) => it.push({ k: "Mesa", t, s, n: norm(t + " " + s), ic: "", run: need(fn) }));
    list.forEach(x => it.push({ k: "Partida", t: "Ir a " + (x.st.n || "sin nombre"), s: where(x.st), n: norm((x.st.n || "") + " partida " + where(x.st)), ic: flagOf(x.st.l), run: () => pick(x.sid) }));
    return it;
  }
  function palOpen() { palItems = palBuild(); palI = 0; $("shade").hidden = false; $("pq").value = ""; palDraw(); setTimeout(() => $("pq").focus(), 20); }
  function palClose() { $("shade").hidden = true; }
  function palDraw() {
    const q = norm($("pq").value).split(/\s+/).filter(Boolean);
    const PRI = { Partida: 0, Mesa: 1, Reto: 2, Paquete: 3, Ficha: 4, Trastada: 5, Huevo: 6, "Comodín": 7, Gesto: 8, Cara: 9, Voz: 10, Puntero: 11, Ropa: 12, Frase: 30 };
    const score = x => (PRI[x.k] ?? 20) * 10 + (q.length && norm(x.t).startsWith(q[0]) ? 0 : q.length && norm(x.t).includes(q[0]) ? 3 : 6);
    palRes = (q.length ? palItems.filter(x => q.every(w => x.n.includes(w))) : palItems.filter(x => x.k !== "Frase")).map((x, i) => [score(x), i, x]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(r => r[2]).slice(0, 80);
    palI = Math.min(palI, Math.max(0, palRes.length - 1));
    $("pres").innerHTML = palRes.map((x, i) => `<button class="pi${i === palI ? " on" : ""}" type="button" data-i="${i}"><span class="ic"${x.ic ? ` style="background-image:url(${x.ic})"` : x.sw ? ` style="background:${x.sw}"` : ""}${x.head ? ` data-h="${x.head}"` : ""}>${x.ic || x.sw || x.head ? "" : x.k === "Frase" ? '<i class="vi" style="margin:0"></i>' : esc(x.k.slice(0, 3))}</span><span><b>${x.k === "Frase" ? markHtml(x.t) : esc(x.t)}</b>${x.s ? `<small>${esc(x.s)}</small>` : ""}</span><span class="kd">${esc(x.k)}</span></button>`).join("") || `<p class="hint" style="padding:10px">Nada con eso.</p>`;
    QA("[data-h]", $("pres")).forEach(e => head(e.dataset.h, e));
    QA(".pi", $("pres")).forEach(b => b.onclick = e => palRun(+b.dataset.i, e.ctrlKey || e.metaKey));
    const on = Q(".pi.on", $("pres")); if (on) on.scrollIntoView({ block: "nearest" });
  }
  function palRun(i, now) { const x = palRes[i]; if (!x) return; palClose(); clink(); (now && x.now ? x.now : x.run)(); }
  $("pq").oninput = () => { palI = 0; palDraw(); };
  $("pq").onkeydown = e => {
    if (e.key === "ArrowDown") { e.preventDefault(); palI = Math.min(palRes.length - 1, palI + 1); palDraw(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); palI = Math.max(0, palI - 1); palDraw(); }
    else if (e.key === "Enter") { e.preventDefault(); palRun(palI, e.ctrlKey || e.metaKey); }
    else if (e.key === "Escape") palClose();
  };
  $("shade").addEventListener("pointerdown", e => { if (e.target === $("shade")) palClose(); });
  $("findBtn").onclick = palOpen;

  /* ================================================================ ATAJOS */
  addEventListener("keydown", e => {
    if (!document.body.classList.contains("in")) return;
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("shade").hidden ? palOpen() : palClose(); return; }
    if (e.key === "/" && !typing && $("shade").hidden) { e.preventDefault(); palOpen(); return; }
    if (e.key === "Escape") { if (!$("shade").hidden) return palClose(); if (popEl) return popClose(); if ($("tv").classList.contains("big")) { $("tv").classList.remove("big"); $("tvBig").textContent = "Agrandar"; } return; }
    if (e.altKey && /^[1-6]$/.test(e.key)) { e.preventDefault(); showTab(DTABS[+e.key - 1][0]); return; }
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); stepSel(e.key === "ArrowUp" ? -1 : 1); }
  });

  /* ================================================================ ARRANQUE */
  function setup() {
    const tx = $("txt");
    tx.oninput = () => { if (fsel) { fsel = null; tx._fromF = false; QA(".fr.on").forEach(r => r.classList.remove("on")); } if (playing) stop(false); refresh(); };   // si tocas el texto, ya es tuyo: llega tal cual
    tx.onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); rehearse(); } else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
    $("send").onclick = () => send(); $("play").onclick = () => playing ? stop(true) : rehearse();
    showTab(dtab); renderLib(); paintTarget(); paintTv(); paintPuesto(); refresh();
    A.crupier.ready(() => { paintPicks(); if (dtab === "crupier") dCrupier(); });
  }
  if (key) call("GET").then(j => j.ok ? enter(j) : logout("")).catch(() => logout("")); else logout("");
})();
