/*
 * Geolite - campañas del modo Clasico (data/classic.js, generado por tools/build-classic.mjs):
 * 11 campañas de 10 niveles cada una, sin lugares repetidos entre ellas.
 */
window.AIQ = window.AIQ || {};
(function (A) {

  /* tipo de ronda a partir del nombre del nivel original */
  const KIND_RX = [[/nickname|former names|clue|bonus round/i, "clue"], [/capital/i, "capital"], [/famous|unesco|heritage/i, "landmark"], [/cit(y|ies)/i, "city"]];
  const kindOf = n => { for (const [r, k] of KIND_RX) if (r.test(n)) return k; return "place"; };

  /* "Buenos Aires, Argentina" -> nombre + pais (para maquetarlos distinto) */
  const splitName = s => {
    const i = s.lastIndexOf(",");
    return i > 0 ? { name: s.slice(0, i).trim(), sub: s.slice(i + 1).trim() } : { name: s.trim(), sub: "" };
  };

  /* ------------------------------------------------------------------ CLASICO */
  const CLASSIC_META = {
    game1: { t: { en: "World", es: "Mundo", fr: "Monde", pt: "Mundo", de: "Welt", it: "Mondo", zh: "世界", ko: "세계", ja: "世界", ru: "Мир", pl: "Świat" }, d: { en: "A world tour: the best-known cities, landmarks and natural wonders.", es: "Una vuelta al mundo: las ciudades, monumentos y maravillas naturales más conocidos.", fr: "Un tour du monde : les villes, monuments et merveilles naturelles les plus connus.", pt: "Uma volta ao mundo: as cidades, monumentos e maravilhas naturais mais conhecidos.", de: "Eine Weltreise: die bekanntesten Städte, Sehenswürdigkeiten und Naturwunder.", it: "Un giro del mondo: le città, i monumenti e le meraviglie naturali più noti.", zh: "环游世界：最知名的城市、地标与自然奇观。", ko: "세계 일주: 가장 유명한 도시, 랜드마크, 자연경관.", ja: "世界一周：いちばん有名な都市・名所・自然の驚異。", ru: "Кругосветка: самые известные города, достопримечательности и чудеса природы.", pl: "Podróż dookoła świata: najbardziej znane miasta, zabytki i cuda natury." } },
    worldcapitals: { t: { en: "World Capitals", es: "Capitales del mundo", fr: "Capitales du monde", pt: "Capitais do mundo", de: "Welthauptstädte", it: "Capitali del mondo", zh: "世界首都", ko: "세계의 수도", ja: "世界の首都", ru: "Столицы мира", pl: "Stolice świata" }, d: { en: "Every capital in the world, from the most famous to the most remote.", es: "Todas las capitales del mundo, de la más famosa a la más remota.", fr: "Toutes les capitales du monde, de la plus célèbre à la plus lointaine.", pt: "Todas as capitais do mundo, da mais famosa à mais remota.", de: "Alle Hauptstädte der Welt, von der bekanntesten bis zur entlegensten.", it: "Tutte le capitali del mondo, dalla più famosa alla più remota.", zh: "世界上所有的首都，从最著名到最偏远。", ko: "세계의 모든 수도, 가장 유명한 곳부터 가장 외딴 곳까지.", ja: "世界のすべての首都、いちばん有名な所から最果てまで。", ru: "Все столицы мира — от самых известных до самых далёких.", pl: "Wszystkie stolice świata, od najsłynniejszej po najbardziej odległą." } },
    usa: { t: { en: "North America", es: "Norteamérica", fr: "Amérique du Nord", pt: "América do Norte", de: "Nordamerika", it: "Nord America", zh: "北美洲", ko: "북아메리카", ja: "北アメリカ", ru: "Северная Америка", pl: "Ameryka Północna" }, d: { en: "From Alaska to Newfoundland and Greenland: the United States, Canada and the far north.", es: "De Alaska a Terranova y Groenlandia: Estados Unidos, Canadá y el gran norte.", fr: "De l'Alaska à Terre-Neuve et au Groenland : les États-Unis, le Canada et le Grand Nord.", pt: "Do Alasca à Terra Nova e à Groenlândia: Estados Unidos, Canadá e o extremo norte.", de: "Von Alaska bis Neufundland und Grönland: die USA, Kanada und der hohe Norden.", it: "Dall'Alaska a Terranova e alla Groenlandia: Stati Uniti, Canada e il grande Nord.", zh: "从阿拉斯加到纽芬兰和格陵兰：美国、加拿大与遥远的北方。", ko: "알래스카에서 뉴펀들랜드와 그린란드까지: 미국, 캐나다 그리고 머나먼 북쪽.", ja: "アラスカからニューファンドランド、グリーンランドまで。アメリカ、カナダ、そして北の果て。", ru: "От Аляски до Ньюфаундленда и Гренландии: США, Канада и Крайний Север.", pl: "Od Alaski po Nową Fundlandię i Grenlandię: USA, Kanada i daleka Północ." } },
    asia: { t: { en: "Asia", es: "Asia", fr: "Asie", pt: "Ásia", de: "Asien", it: "Asia", zh: "亚洲", ko: "아시아", ja: "アジア", ru: "Азия", pl: "Azja" }, d: { en: "From the Middle East to Japan.", es: "De Oriente Medio a Japón.", fr: "Du Moyen-Orient au Japon.", pt: "Do Oriente Médio ao Japão.", de: "Vom Nahen Osten bis Japan.", it: "Dal Medio Oriente al Giappone.", zh: "从中东到日本。", ko: "중동에서 일본까지.", ja: "中東から日本まで。", ru: "От Ближнего Востока до Японии.", pl: "Od Bliskiego Wschodu po Japonię." } },
    centralsouthamerica: { t: { en: "Latin America", es: "Latinoamérica", fr: "Amérique latine", pt: "América Latina", de: "Lateinamerika", it: "America Latina", zh: "拉丁美洲", ko: "라틴 아메리카", ja: "ラテンアメリカ", ru: "Латинская Америка", pl: "Ameryka Łacińska" }, d: { en: "Central & South America and the Caribbean.", es: "Centroamérica, Sudamérica y el Caribe.", fr: "Amérique centrale et du Sud, et les Caraïbes.", pt: "América Central e do Sul e o Caribe.", de: "Mittel- und Südamerika und die Karibik.", it: "America centrale e meridionale e Caraibi.", zh: "中美洲、南美洲与加勒比地区。", ko: "중앙아메리카, 남아메리카, 카리브해.", ja: "中央アメリカ・南アメリカ・カリブ海。", ru: "Центральная и Южная Америка и Карибы.", pl: "Ameryka Środkowa, Południowa i Karaiby." } },
    oceania: { t: { en: "Oceania", es: "Oceanía", fr: "Océanie", pt: "Oceania", de: "Ozeanien", it: "Oceania", zh: "大洋洲", ko: "오세아니아", ja: "オセアニア", ru: "Океания", pl: "Oceania" }, d: { en: "Australia, New Zealand and the Pacific islands.", es: "Australia, Nueva Zelanda y las islas del Pacífico.", fr: "Australie, Nouvelle-Zélande et îles du Pacifique.", pt: "Austrália, Nova Zelândia e ilhas do Pacífico.", de: "Australien, Neuseeland und die Pazifikinseln.", it: "Australia, Nuova Zelanda e isole del Pacifico.", zh: "澳大利亚、新西兰与太平洋岛屿。", ko: "호주, 뉴질랜드, 태평양 섬들.", ja: "オーストラリア・ニュージーランド・太平洋の島々。", ru: "Австралия, Новая Зеландия и острова Тихого океана.", pl: "Australia, Nowa Zelandia i wyspy Pacyfiku." } },
    europe: { t: { en: "Europe", es: "Europa", fr: "Europe", pt: "Europa", de: "Europa", it: "Europa", zh: "欧洲", ko: "유럽", ja: "ヨーロッパ", ru: "Европа", pl: "Europa" }, d: { en: "Cities, landmarks and nature across the continent.", es: "Ciudades, lugares famosos y naturaleza por todo el continente.", fr: "Villes, lieux célèbres et nature à travers le continent.", pt: "Cidades, lugares famosos e natureza por todo o continente.", de: "Städte, Sehenswürdigkeiten und Natur des ganzen Kontinents.", it: "Città, luoghi famosi e natura in tutto il continente.", zh: "遍布整个大陆的城市、地标与自然。", ko: "대륙 곳곳의 도시, 랜드마크, 자연.", ja: "大陸じゅうの都市・名所・自然。", ru: "Города, достопримечательности и природа всего континента.", pl: "Miasta, zabytki i przyroda całego kontynentu." } },
    flags: { t: { en: "Flags", es: "Banderas", fr: "Drapeaux", pt: "Bandeiras", de: "Flaggen", it: "Bandiere", zh: "国旗", ko: "국기", ja: "国旗", ru: "Флаги", pl: "Flagi" }, d: { en: "Every country's flag: guess where it flies.", es: "La bandera de cada país: adivina dónde ondea.", fr: "Le drapeau de chaque pays : devine où il flotte.", pt: "A bandeira de cada país: adivinhe onde ela tremula.", de: "Die Flagge jedes Landes: errate, wo sie weht.", it: "La bandiera di ogni paese: indovina dove sventola.", zh: "每个国家的国旗：猜猜它飘扬在哪里。", ko: "모든 나라의 국기: 어디에서 휘날리는지 맞혀 보세요.", ja: "すべての国の国旗：どこではためいているか当てよう。", ru: "Флаг каждой страны: угадай, где он развевается.", pl: "Flaga każdego kraju: zgadnij, gdzie powiewa." } },
    clues: { t: { en: "Clues", es: "Pistas", fr: "Indices", pt: "Pistas", de: "Hinweise", it: "Indizi", zh: "线索", ko: "단서", ja: "ヒント", ru: "Подсказки", pl: "Wskazówki" }, d: { en: "Only a fact, no name: figure out the place before the clock runs out.", es: "Solo un dato, sin nombre: averigua el lugar antes de que se acabe el tiempo.", fr: "Seulement un indice, pas de nom : trouve le lieu avant la fin du chrono.", pt: "Só um dado, sem nome: descubra o lugar antes que o tempo acabe.", de: "Nur ein Hinweis, kein Name: finde den Ort, bevor die Zeit abläuft.", it: "Solo un indizio, niente nome: scopri il luogo prima che scada il tempo.", zh: "只有一条信息，没有名字：在时间耗尽前找出这个地点。", ko: "이름 없이 단서 하나만: 시간이 다 되기 전에 장소를 알아내세요.", ja: "名前はなく、手がかりが一つだけ：時間切れになる前に場所を突き止めよう。", ru: "Только факт, без названия: найди место, пока не вышло время.", pl: "Tylko fakt, bez nazwy: odgadnij miejsce, zanim skończy się czas." } },
    events: { t: { en: "Historic Events", es: "Eventos históricos", fr: "Événements historiques", pt: "Eventos históricos", de: "Historische Ereignisse", it: "Eventi storici", zh: "历史事件", ko: "역사적 사건", ja: "歴史的な出来事", ru: "Исторические события", pl: "Wydarzenia historyczne" }, d: { en: "Battles, disasters, treaties and turning points: where did it happen?", es: "Batallas, catástrofes, tratados y momentos clave: ¿dónde ocurrió?", fr: "Batailles, catastrophes, traités et tournants : où cela s'est-il passé ?", pt: "Batalhas, catástrofes, tratados e momentos decisivos: onde aconteceu?", de: "Schlachten, Katastrophen, Verträge und Wendepunkte: Wo geschah es?", it: "Battaglie, catastrofi, trattati e svolte: dove è successo?", zh: "战役、灾难、条约与转折点：它发生在哪里？", ko: "전투, 재난, 조약, 전환점: 어디에서 일어났을까요?", ja: "戦い、災害、条約、転換点：どこで起きた？", ru: "Битвы, катастрофы, договоры и поворотные моменты: где это произошло?", pl: "Bitwy, katastrofy, traktaty i punkty zwrotne: gdzie to się wydarzyło?" } },
    people: { t: { en: "Historical Figures", es: "Personajes históricos", fr: "Personnages historiques", pt: "Personagens históricos", de: "Historische Persönlichkeiten", it: "Personaggi storici", zh: "历史人物", ko: "역사 인물", ja: "歴史上の人物", ru: "Исторические личности", pl: "Postacie historyczne" }, d: { en: "Scientists, artists, rulers and explorers: where were they born?", es: "Científicos, artistas, gobernantes y exploradores: ¿dónde nacieron?", fr: "Scientifiques, artistes, dirigeants et explorateurs : où sont-ils nés ?", pt: "Cientistas, artistas, governantes e exploradores: onde nasceram?", de: "Wissenschaftler, Künstler, Herrscher und Entdecker: Wo wurden sie geboren?", it: "Scienziati, artisti, sovrani ed esploratori: dove sono nati?", zh: "科学家、艺术家、统治者与探险家：他们出生在哪里？", ko: "과학자, 예술가, 통치자, 탐험가: 어디에서 태어났을까요?", ja: "科学者、芸術家、統治者、探検家：どこで生まれた？", ru: "Учёные, художники, правители и путешественники: где они родились?", pl: "Naukowcy, artyści, władcy i odkrywcy: gdzie się urodzili?" } },
    /* la 12.a no viene de data/classic.js: se monta abajo con el mismo nivel de todas las demas */
    mix: { t: { en: "Mixed Bag", es: "Mezcla", fr: "Mélange", pt: "Mistura", de: "Gemischt", it: "Miscuglio", zh: "大杂烩", ko: "믹스", ja: "ミックス", ru: "Всё вперемешку", pl: "Mieszanka" }, d: { en: "A bit of every campaign, level by level: places, flags, clues, events and people.", es: "Un poco de cada campaña, nivel a nivel: lugares, banderas, pistas, sucesos y personajes.", fr: "Un peu de chaque campagne, niveau par niveau : lieux, drapeaux, indices, événements et personnages.", pt: "Um pouco de cada campanha, nível a nível: lugares, bandeiras, pistas, eventos e personagens.", de: "Von jeder Kampagne etwas, Stufe für Stufe: Orte, Flaggen, Hinweise, Ereignisse und Personen.", it: "Un po' di ogni campagna, livello per livello: luoghi, bandiere, indizi, eventi e personaggi.", zh: "每个战役都来一点，逐级混合：地点、国旗、线索、事件与人物。", ko: "모든 캠페인에서 조금씩, 단계별로: 장소, 국기, 단서, 사건, 인물.", ja: "全キャンペーンから少しずつ、レベルごとに：場所・国旗・ヒント・出来事・人物。", ru: "Понемногу из каждой кампании, уровень за уровнем: места, флаги, подсказки, события и личности.", pl: "Po trochu z każdej kampanii, poziom po poziomie: miejsca, flagi, wskazówki, wydarzenia i postacie." } },
  };

  /* nombres de ronda: {region}+{kind} -> frase en 6 idiomas (evita concatenar "Region + Kind" a lo bruto,
   * que en romance no liga bien: "Capitales de Asia" no es "Asia Capitales"). El "(Easy)" etc. se traduce
   * aparte via CLASSIC_TR y se añade al final. */
  const LEVEL_LABEL = {
    capital: {
      world: ["World Capital Cities", "Capitales del mundo", "Capitales du monde", "Capitais do mundo", "Welthauptstädte", "Capitali del mondo", null, "世界首都", "세계의 수도", "世界の首都", "Столицы мира", "Stolice świata"],
      usa: ["North America Capital Cities", "Capitales de Norteamérica", "Capitales d'Amérique du Nord", "Capitais da América do Norte", "Hauptstädte Nordamerikas", "Capitali del Nord America", null, "北美洲首府", "북아메리카의 주도", "北アメリカの州都", "Столицы Северной Америки", "Stolice Ameryki Północnej"],
      europe: ["Europe Capital Cities", "Capitales de Europa", "Capitales d'Europe", "Capitais da Europa", "Hauptstädte Europas", "Capitali dell'Europa", null, "欧洲首都", "유럽의 수도", "ヨーロッパの首都", "Столицы Европы", "Stolice Europy"],
      asia: ["Asia Capital Cities", "Capitales de Asia", "Capitales d'Asie", "Capitais da Ásia", "Hauptstädte Asiens", "Capitali dell'Asia", null, "亚洲首都", "아시아의 수도", "アジアの首都", "Столицы Азии", "Stolice Azji"],
      latam: ["Latin America Capital Cities", "Capitales de Latinoamérica", "Capitales d'Amérique latine", "Capitais da América Latina", "Hauptstädte Lateinamerikas", "Capitali dell'America Latina", null, "拉丁美洲首都", "라틴 아메리카의 수도", "ラテンアメリカの首都", "Столицы Латинской Америки", "Stolice Ameryki Łacińskiej"],
      oceania: ["Oceania Capital Cities", "Capitales de Oceanía", "Capitales d'Océanie", "Capitais da Oceania", "Hauptstädte Ozeaniens", "Capitali dell'Oceania", null, "大洋洲首都", "오세아니아의 수도", "オセアニアの首都", "Столицы Океании", "Stolice Oceanii"],
      africa: ["Africa Capital Cities", "Capitales de África", "Capitales d'Afrique", "Capitais da África", "Hauptstädte Afrikas", "Capitali dell'Africa", null, "非洲首都", "아프리카의 수도", "アフリカの首都", "Столицы Африки", "Stolice Afryki"],
    },
    city: {
      world: ["World Cities", "Ciudades del mundo", "Villes du monde", "Cidades do mundo", "Weltstädte", "Città del mondo", null, "世界城市", "세계의 도시", "世界の都市", "Города мира", "Miasta świata"],
      usa: ["North America Cities", "Ciudades de Norteamérica", "Villes d'Amérique du Nord", "Cidades da América do Norte", "Städte Nordamerikas", "Città del Nord America", null, "北美洲城市", "북아메리카의 도시", "北アメリカの都市", "Города Северной Америки", "Miasta Ameryki Północnej"],
      europe: ["Europe Cities", "Ciudades de Europa", "Villes d'Europe", "Cidades da Europa", "Städte Europas", "Città dell'Europa", null, "欧洲城市", "유럽의 도시", "ヨーロッパの都市", "Города Европы", "Miasta Europy"],
      asia: ["Asia Cities", "Ciudades de Asia", "Villes d'Asie", "Cidades da Ásia", "Städte Asiens", "Città dell'Asia", null, "亚洲城市", "아시아의 도시", "アジアの都市", "Города Азии", "Miasta Azji"],
      latam: ["Latin America Cities", "Ciudades de Latinoamérica", "Villes d'Amérique latine", "Cidades da América Latina", "Städte Lateinamerikas", "Città dell'America Latina", null, "拉丁美洲城市", "라틴 아메리카의 도시", "ラテンアメリカの都市", "Города Латинской Америки", "Miasta Ameryki Łacińskiej"],
      oceania: ["Oceania Cities", "Ciudades de Oceanía", "Villes d'Océanie", "Cidades da Oceania", "Städte Ozeaniens", "Città dell'Oceania", null, "大洋洲城市", "오세아니아의 도시", "オセアニアの都市", "Города Океании", "Miasta Oceanii"],
      africa: ["Africa Cities", "Ciudades de África", "Villes d'Afrique", "Cidades da África", "Städte Afrikas", "Città dell'Africa", null, "非洲城市", "아프리카의 도시", "アフリカの都市", "Города Африки", "Miasta Afryki"],
    },
    landmark: {
      world: ["World Famous Landmarks", "Monumentos famosos del mundo", "Monuments célèbres du monde", "Monumentos famosos do mundo", "Berühmte Sehenswürdigkeiten der Welt", "Monumenti famosi del mondo", null, "世界著名地标", "세계의 유명 랜드마크", "世界の有名な名所", "Знаменитые достопримечательности мира", "Słynne zabytki świata"],
      usa: ["North America Famous Landmarks", "Monumentos famosos de Norteamérica", "Monuments célèbres d'Amérique du Nord", "Monumentos famosos da América do Norte", "Berühmte Sehenswürdigkeiten Nordamerikas", "Monumenti famosi del Nord America", null, "北美洲著名地标", "북아메리카의 유명 랜드마크", "北アメリカの有名な名所", "Знаменитые достопримечательности Северной Америки", "Słynne zabytki Ameryki Północnej"],
      europe: ["Europe Famous Landmarks", "Monumentos famosos de Europa", "Monuments célèbres d'Europe", "Monumentos famosos da Europa", "Berühmte Sehenswürdigkeiten Europas", "Monumenti famosi dell'Europa", null, "欧洲著名地标", "유럽의 유명 랜드마크", "ヨーロッパの有名な名所", "Знаменитые достопримечательности Европы", "Słynne zabytki Europy"],
      asia: ["Asia Famous Landmarks", "Monumentos famosos de Asia", "Monuments célèbres d'Asie", "Monumentos famosos da Ásia", "Berühmte Sehenswürdigkeiten Asiens", "Monumenti famosi dell'Asia", null, "亚洲著名地标", "아시아의 유명 랜드마크", "アジアの有名な名所", "Знаменитые достопримечательности Азии", "Słynne zabytki Azji"],
      latam: ["Latin America Famous Landmarks", "Monumentos famosos de Latinoamérica", "Monuments célèbres d'Amérique latine", "Monumentos famosos da América Latina", "Berühmte Sehenswürdigkeiten Lateinamerikas", "Monumenti famosi dell'America Latina", null, "拉丁美洲著名地标", "라틴 아메리카의 유명 랜드마크", "ラテンアメリカの有名な名所", "Знаменитые достопримечательности Латинской Америки", "Słynne zabytki Ameryki Łacińskiej"],
      oceania: ["Oceania Famous Landmarks", "Monumentos famosos de Oceanía", "Monuments célèbres d'Océanie", "Monumentos famosos da Oceania", "Berühmte Sehenswürdigkeiten Ozeaniens", "Monumenti famosi dell'Oceania", null, "大洋洲著名地标", "오세아니아의 유명 랜드마크", "オセアニアの有名な名所", "Знаменитые достопримечательности Океании", "Słynne zabytki Oceanii"],
      africa: ["Africa Famous Landmarks", "Monumentos famosos de África", "Monuments célèbres d'Afrique", "Monumentos famosos da África", "Berühmte Sehenswürdigkeiten Afrikas", "Monumenti famosi dell'Africa", null, "非洲著名地标", "아프리카의 유명 랜드마크", "アフリカの有名な名所", "Знаменитые достопримечательности Африки", "Słynne zabytki Afryki"],
    },
    nature: {
      world: ["World Natural Wonders", "Maravillas naturales del mundo", "Merveilles naturelles du monde", "Maravilhas naturais do mundo", "Naturwunder der Welt", "Meraviglie naturali del mondo", null, "世界自然奇观", "세계의 자연 경이", "世界の自然の驚異", "Природные чудеса мира", "Cuda natury świata"],
      usa: ["North America Natural Wonders", "Maravillas naturales de Norteamérica", "Merveilles naturelles d'Amérique du Nord", "Maravilhas naturais da América do Norte", "Naturwunder Nordamerikas", "Meraviglie naturali del Nord America", null, "北美洲自然奇观", "북아메리카의 자연 경이", "北アメリカの自然の驚異", "Природные чудеса Северной Америки", "Cuda natury Ameryki Północnej"],
      europe: ["Europe Natural Wonders", "Maravillas naturales de Europa", "Merveilles naturelles d'Europe", "Maravilhas naturais da Europa", "Naturwunder Europas", "Meraviglie naturali dell'Europa", null, "欧洲自然奇观", "유럽의 자연 경이", "ヨーロッパの自然の驚異", "Природные чудеса Европы", "Cuda natury Europy"],
      asia: ["Asia Natural Wonders", "Maravillas naturales de Asia", "Merveilles naturelles d'Asie", "Maravilhas naturais da Ásia", "Naturwunder Asiens", "Meraviglie naturali dell'Asia", null, "亚洲自然奇观", "아시아의 자연 경이", "アジアの自然の驚異", "Природные чудеса Азии", "Cuda natury Azji"],
      latam: ["Latin America Natural Wonders", "Maravillas naturales de Latinoamérica", "Merveilles naturelles d'Amérique latine", "Maravilhas naturais da América Latina", "Naturwunder Lateinamerikas", "Meraviglie naturali dell'America Latina", null, "拉丁美洲自然奇观", "라틴 아메리카의 자연 경이", "ラテンアメリカの自然の驚異", "Природные чудеса Латинской Америки", "Cuda natury Ameryki Łacińskiej"],
      oceania: ["Oceania Natural Wonders", "Maravillas naturales de Oceanía", "Merveilles naturelles d'Océanie", "Maravilhas naturais da Oceania", "Naturwunder Ozeaniens", "Meraviglie naturali dell'Oceania", null, "大洋洲自然奇观", "오세아니아의 자연 경이", "オセアニアの自然の驚異", "Природные чудеса Океании", "Cuda natury Oceanii"],
      africa: ["Africa Natural Wonders", "Maravillas naturales de África", "Merveilles naturelles d'Afrique", "Maravilhas naturais da África", "Naturwunder Afrikas", "Meraviglie naturali dell'Africa", null, "非洲自然奇观", "아프리카의 자연 경이", "アフリカの自然の驚異", "Природные чудеса Африки", "Cuda natury Afryki"],
    },
    history: {
      world: ["World Historic Sites", "Lugares históricos del mundo", "Sites historiques du monde", "Locais históricos do mundo", "Historische Stätten der Welt", "Siti storici del mondo", null, "世界历史遗址", "세계의 역사 유적", "世界の史跡", "Исторические места мира", "Miejsca historyczne świata"],
      usa: ["North America Historic Sites", "Lugares históricos de Norteamérica", "Sites historiques d'Amérique du Nord", "Locais históricos da América do Norte", "Historische Stätten Nordamerikas", "Siti storici del Nord America", null, "北美洲历史遗址", "북아메리카의 역사 유적", "北アメリカの史跡", "Исторические места Северной Америки", "Miejsca historyczne Ameryki Północnej"],
      europe: ["Europe Historic Sites", "Lugares históricos de Europa", "Sites historiques d'Europe", "Locais históricos da Europa", "Historische Stätten Europas", "Siti storici dell'Europa", null, "欧洲历史遗址", "유럽의 역사 유적", "ヨーロッパの史跡", "Исторические места Европы", "Miejsca historyczne Europy"],
      asia: ["Asia Historic Sites", "Lugares históricos de Asia", "Sites historiques d'Asie", "Locais históricos da Ásia", "Historische Stätten Asiens", "Siti storici dell'Asia", null, "亚洲历史遗址", "아시아의 역사 유적", "アジアの史跡", "Исторические места Азии", "Miejsca historyczne Azji"],
      latam: ["Latin America Historic Sites", "Lugares históricos de Latinoamérica", "Sites historiques d'Amérique latine", "Locais históricos da América Latina", "Historische Stätten Lateinamerikas", "Siti storici dell'America Latina", null, "拉丁美洲历史遗址", "라틴 아메리카의 역사 유적", "ラテンアメリカの史跡", "Исторические места Латинской Америки", "Miejsca historyczne Ameryki Łacińskiej"],
      oceania: ["Oceania Historic Sites", "Lugares históricos de Oceanía", "Sites historiques d'Océanie", "Locais históricos da Oceania", "Historische Stätten Ozeaniens", "Siti storici dell'Oceania", null, "大洋洲历史遗址", "오세아니아의 역사 유적", "オセアニアの史跡", "Исторические места Океании", "Miejsca historyczne Oceanii"],
      africa: ["Africa Historic Sites", "Lugares históricos de África", "Sites historiques d'Afrique", "Locais históricos da África", "Historische Stätten Afrikas", "Siti storici dell'Africa", null, "非洲历史遗址", "아프리카의 역사 유적", "アフリカの史跡", "Исторические места Африки", "Miejsca historyczne Afryki"],
    },
    country: {
      world: ["World Countries", "Países del mundo", "Pays du monde", "Países do mundo", "Länder der Welt", "Paesi del mondo", null, "世界各国", "세계의 국가", "世界の国", "Страны мира", "Kraje świata"],
      europe: ["European Countries", "Países de Europa", "Pays d'Europe", "Países da Europa", "Länder Europas", "Paesi dell'Europa", null, "欧洲国家", "유럽의 국가", "ヨーロッパの国", "Страны Европы", "Kraje Europy"],
      asia: ["Asian Countries", "Países de Asia", "Pays d'Asie", "Países da Ásia", "Länder Asiens", "Paesi dell'Asia", null, "亚洲国家", "아시아의 국가", "アジアの国", "Страны Азии", "Kraje Azji"],
      latam: ["Latin American Countries", "Países de Latinoamérica", "Pays d'Amérique latine", "Países da América Latina", "Länder Lateinamerikas", "Paesi dell'America Latina", null, "拉丁美洲国家", "라틴 아메리카의 국가", "ラテンアメリカの国", "Страны Латинской Америки", "Kraje Ameryki Łacińskiej"],
      oceania: ["Oceania Countries", "Países de Oceanía", "Pays d'Océanie", "Países da Oceania", "Länder Ozeaniens", "Paesi dell'Oceania", null, "大洋洲国家", "오세아니아의 국가", "オセアニアの国", "Страны Океании", "Kraje Oceanii"],
      africa: ["African Countries", "Países de África", "Pays d'Afrique", "Países da África", "Länder Afrikas", "Paesi dell'Africa", null, "非洲国家", "아프리카의 국가", "アフリカの国", "Страны Африки", "Kraje Afryki"],
    },
    flag: { world: ["Flags", "Banderas", "Drapeaux", "Bandeiras", "Flaggen", "Bandiere", null, "国旗", "국기", "国旗", "Флаги", "Flagi"] },
    clue: { world: ["Clues", "Pistas", "Indices", "Pistas", "Hinweise", "Indizi", null, "线索", "단서", "ヒント", "Подсказки", "Wskazówki"] },
    event: { world: ["Historic Events", "Eventos históricos", "Événements historiques", "Eventos históricos", "Historische Ereignisse", "Eventi storici", null, "历史事件", "역사적 사건", "歴史的な出来事", "Исторические события", "Wydarzenia historyczne"] },
    mixed: { world: ["Mixed Bag", "Mezcla", "Mélange", "Mistura", "Gemischt", "Miscuglio", null, "大杂烩", "믹스", "ミックス", "Всё вперемешку", "Mieszanka"] },
    character: { world: ["Historical Figures", "Personajes históricos", "Personnages historiques", "Personagens históricos", "Historische Persönlichkeiten", "Personaggi storici", null, "历史人物", "역사 인물", "歴史上の人物", "Исторические личности", "Postacie historyczne"] },
  };
  const row6 = row => { const o = {}; L6.forEach((l, i) => { o[l] = row[i] || (l === "es-419" ? row[1] : row[0]); }); return o; };


  /* textos de los niveles (ingles) -> {en, es, fr, pt, de, it...}: data/classic-tr.js, luego la base de lugares y, si no, igual en todos */
  const L6 = ["en", "es", "fr", "pt", "de", "it", "es-419", "zh", "ko", "ja", "ru", "pl"], nk = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  let PBY = null;
  const placeBy = en => {
    if (!PBY) { PBY = new Map(); (A.PLACES || []).forEach(r => { const n = r[6]; if (n && n.en && !PBY.has(nk(n.en))) PBY.set(nk(n.en), n); }); }
    return PBY.get(nk(en));
  };
  const same = s => { const o = {}; L6.forEach(l => { o[l] = s; }); return o; };
  const lv = (o, l) => o[l] || (l === "es-419" && o.es) || o.en;
  const join = (a, b, sep) => { const o = {}; L6.forEach(l => { o[l] = lv(a, l) + sep + lv(b, l); }); return o; };
  const DIFF_RX = /^(.*?)\s*(\((?:Easy|Medium|Hard|Very hard|Very Hard|Expert|Hardest|Final)\))$/;
  function tr6(s, sentence) {
    s = String(s || "").trim(); if (!s) return same("");
    const T = A.CLASSIC_TR || {}, t = T[s];
    if (t) return row6(t);
    if (sentence) return same(s);                                                   // frase sin traduccion: se deja tal cual
    const m = s.match(DIFF_RX); if (m && T[m[1]] && T[m[2]]) return join(tr6(m[1]), tr6(m[2]), " ");
    const i = s.lastIndexOf(", "); if (i > 0) return join(tr6(s.slice(0, i)), tr6(s.slice(i + 2)), ", ");
    if (/\S\/\S/.test(s)) return s.split("/").map(x => tr6(x)).reduce((a, b) => join(a, b, "/"));
    const p = placeBy(s); if (p) { const o = {}; L6.forEach(l => { o[l] = p[l] || (l === "es-419" && p.es) || s; }); o.en = s; return o; }
    return same(s);
  }
  A.classicTr = tr6;

  /* nombre de ronda: LEVEL_LABEL[kind][region] (o el fallback tr6(L.name) para datos antiguos
   * sin region/kind explicitos) + "(Easy)" etc. ya traducido en CLASSIC_TR. */
  function levelName(L) {
    const tbl = LEVEL_LABEL[L.kind], row = tbl && (tbl[L.region || "world"] || tbl.world);
    const base = row ? row6(row) : tr6(L.name);
    const dTr = (A.CLASSIC_TR || {})["(" + L.diff + ")"];
    const d = dTr ? row6(dTr) : same("(" + L.diff + ")"), o = {};
    L6.forEach(l => { const x = lv(d, l); o[l] = lv(base, l) + (/^[（【]/.test(x) ? "" : " ") + x; });   // el parentesis de ancho completo (zh/ja) ya lleva su aire: sin espacio delante
    return o;
  }

  /* cada partida de un nivel son 10 preguntas: los niveles con mas lugares sortean 10 (en orden de dificultad) y cada intento trae otros */
  const PLAY_Q = 10;
  const pick10 = list => {
    if (list.length <= PLAY_Q) return list;
    const idx = list.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx.slice(0, PLAY_Q).sort((a, b) => a - b).map(i => list[i]);
  };

  const classic = (window.AIQ.CLASSIC || []).map(g => {
    const meta = CLASSIC_META[g.id];
    return {
      id: "c-" + g.id, mode: "classic", title: meta.t, blurb: meta.d, home: g.home,
      levels: g.levels.map((L, li) => {
        const kind = L.kind || (L.bonus ? "clue" : kindOf(L.name));
        const mk = d => {
            if (d.n6) return {                                                              // Eventos/Personajes: textos ya traducidos por tools/build-classic.mjs
              t: "p", lat: d.lat, lon: d.lon, cid: [d.ck || A.ckey(d.n)], img: d.img || null,
              name: { en: d.n, ...d.n6 }, sub: d.s6 || same(""), clue: false, answer: null, fact: { en: d.f, ...d.f6 },
            };
            const clue = L.bonus && d.f;
            const sp = clue ? { name: d.n, sub: "" } : splitName(d.n);
            const full = !clue && (A.CLASSIC_TR || {})[d.n] ? tr6(d.n) : null;                 // traduccion del nombre completo (p. ej. "Olympia, Washington"): se parte en cada idioma
            const part = k => { const o = {}; L6.forEach(l => { const v = full[l], i = v.lastIndexOf(", "); o[l] = i > 0 ? (k ? v.slice(i + 2) : v.slice(0, i)) : (k ? "" : v); }); return o; };
            return {
              t: "p", lat: d.lat, lon: d.lon, cid: [d.ck || A.ckey(clue ? d.f : d.n)], kf: d.kf || 1,
              name: full ? part(0) : clue && d.c6 ? { en: d.n, ...d.c6 } : tr6(sp.name), sub: full ? part(1) : tr6(sp.sub),
              clue: !!clue, answer: clue ? tr6(d.f) : null,
              fact: clue ? same("") : d.f6 ? { en: d.f, ...d.f6 } : tr6(d.f, d.f.length > 40),
            };
          };
        return {
          tier: L.bonus ? 2 : Math.min(2, Math.floor((li / g.levels.length) * 3)), all: () => L.dests.map(mk),
          name: levelName(L), kind, region: L.region || "world", bonus: L.bonus, plainName: true,
          seconds: L.tpq, advance: L.advance, maxPerQ: L.kmBase + L.speed,
          /* Puntuacion de Geolite: distancia = floor(kmBase - km * kmDist / kf), velocidad = floor((1 - tiempo/(tpq - corte)) * speed).
             kf = 1,5 en naturaleza, 1,6 en mares y 1,4 en estrechos (zonas enormes: el mismo error cuenta menos) */
          score(q, km, timeLeft) {
            const dist = Math.max(0, Math.floor(L.kmBase - (km * L.kmDist) / (q.kf || 1)));
            const time = Math.max(0, Math.floor((1 - (L.tpq - timeLeft) / (L.tpq - L.cutoff)) * L.speed));
            return { dist, time, distMax: L.kmBase, timeMax: L.speed };
          },
          questions: () => pick10(L.dests).map(mk),
          one: () => ({ ...mk(L.dests[Math.floor(Math.random() * L.dests.length)]), kind, tpq: L.tpq }),   // para la Mezcla: una pregunta suelta con su tipo y su reloj
        };
      }),
    };
  });

  /* Mezcla (12.a campana): el nivel N junta el nivel N de las otras 11 (misma dificultad, mismo objetivo y 10 preguntas).
     Cada partida sortea 10 de las 11 campanas y saca una pregunta de cada una, en orden al azar; cada pregunta conserva
     su tipo (bandera, pista, retrato...), su reloj (15 o 18 s) y la puntuacion de su campana de origen. */
  if (classic.length) {
    const src = classic.slice(), base = src[0];
    classic.push({
      id: "c-mix", mode: "classic", title: CLASSIC_META.mix.t, blurb: CLASSIC_META.mix.d, home: base.home,
      levels: base.levels.map((L0, li) => {
        const row = src.map(c => c.levels[li]), secs = [...new Set(row.map(L => L.seconds))].sort((a, b) => a - b);
        return {
          tier: L0.tier, name: levelName({ kind: "mixed", region: "world", diff: A.CLASSIC[0].levels[li].diff }), kind: "mixed", region: "world", bonus: false, plainName: true,
          seconds: secs[0], secText: secs.length > 1 ? secs[0] + "–" + secs[secs.length - 1] : null, advance: L0.advance, maxPerQ: L0.maxPerQ,
          score: (q, km, timeLeft) => row[q.src || 0].score(q, km, timeLeft),
          questions() {
            const order = row.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
            const seen = new Set(), out = [];
            for (const i of order) {
              if (out.length >= PLAY_Q) break;
              for (let k = 0; k < 6; k++) { const q = row[i].one(); if (!seen.has(q.cid[0])) { seen.add(q.cid[0]); out.push({ ...q, src: i }); break; } }   // nunca dos veces el mismo lugar en una partida
            }
            return out;
          },
        };
      }),
    });
  }

  /* El antiguo modo Extendido (x-atlas, x-history) no tenia entrada en ningun menu y duplicaba el Clasico
   * (Mundo, Eventos, Pistas): se quito. A.LEVELS y A.HISTORY siguen alimentando la Enciclopedia. */
  A.CAMPAIGNS = classic;
})(window.AIQ);
