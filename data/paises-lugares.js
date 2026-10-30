/* Geolite - pais que se ve debajo en los lugares que no tienen uno solo (v0.20, regla del autor 2026-09-30):
 * todo lugar lleva pais salvo mares y oceanos; si lo comparten dos, los dos; si mas, el principal (mas superficie, o donde ocurrio sobre todo).
 * QIDs de Wikidata (nombres en data/places.js, A.PCOUNTRY). Propuesta de un documentalista y dos revisores; decide la mayoria. */
window.AIQ = window.AIQ || {};
window.AIQ.PLACE_COUNTRIES = {
  "elbe": ["Q183","Q213"],
  "amazon-rainforest": ["Q155"],  // Selva amazónica → Brasil
  "battle-of-jutland": ["Q35"],  // Batalla de Jutlandia → Dinamarca
  "battle-of-the-coral-sea": ["Q408"],  // Batalla del mar del Coral → Australia
  "bering-strait": ["Q30","Q159"],  // Estrecho de Bering → Estados Unidos · Rusia
  "caspian-sea": ["Q232"],  // Mar Caspio → Kazajistán
  "congo-basin": ["Q974"],  // Cuenca del Congo → República Democrática del Congo
  "dead-sea": ["Q810"],  // Mar Muerto → Jordania
  "english-channel": ["Q145","Q142"],  // Canal de la Mancha → Reino Unido · Francia
  "falklands-war": ["Q145","Q414"],  // Guerra de las Malvinas → Reino Unido · Argentina
  "gobi-desert": ["Q148","Q711"],  // Desierto de Gobi → China · Mongolia
  "great-rift-valley": ["Q114"],  // Gran Valle del Rift → Kenia
  "k2": ["Q843","Q148"],  // K2 → Pakistán · China
  "kalahari-desert": ["Q963"],  // Kalahari → Botsuana
  "kangchenjunga": ["Q837","Q668"],  // Kanchenjunga → Nepal · India
  "lake-chad": ["Q657"],  // Lago Chad → Chad
  "lake-constance": ["Q183"],  // Lago de Constanza → Alemania
  "lake-geneva": ["Q39","Q142"],  // Lago Lemán → Suiza · Francia
  "lake-malawi": ["Q1020"],  // Lago Malaui → Malaui
  "lake-ontario": ["Q16","Q30"],  // Lago Ontario → Canadá · Estados Unidos
  "lake-superior": ["Q30","Q16"],  // Lago Superior → Estados Unidos · Canadá
  "lake-tanganyika": ["Q924"],  // Lago Tanganica → Tanzania
  "lake-titicaca": ["Q419","Q750"],  // Lago Titicaca → Perú · Bolivia
  "lake-victoria": ["Q924"],  // Lago Victoria → Tanzania
  "lhotse": ["Q837","Q148"],  // Lhotse → Nepal · China
  "makalu": ["Q837","Q148"],  // Makalu → Nepal · China
  "matterhorn": ["Q39","Q38"],  // Cervino → Suiza · Italia
  "mont-blanc": ["Q142","Q38"],  // Mont Blanc → Francia · Italia
  "mount-everest": ["Q837","Q148"],  // Monte Everest → Nepal · China
  "niagara-falls": ["Q16","Q30"],  // Cataratas del Niágara → Canadá · Estados Unidos
  "patagonia": ["Q414","Q298"],  // Patagonia → Argentina · Chile
  "sahara": ["Q262"],  // Sahara → Argelia
  "sahel": ["Q912"],  // Sahel → Mali
  "scramble-for-africa": ["Q974"],  // Reparto de África → República Democrática del Congo
  "sinking-of-the-titanic": ["Q16"],  // Hundimiento del RMS Titanic → Canadá
  "six-day-war": ["Q79"],  // Guerra de los Seis Días → Egipto
  "strait-of-gibraltar": ["Q29","Q1028"],  // Estrecho de Gibraltar → España · Marruecos
  "strait-of-malacca": ["Q252","Q833"],  // Estrecho de Malaca → Indonesia · Malasia
  "victoria-falls": ["Q954","Q953"],  // Cataratas Victoria → Zimbabue · Zambia
  "yom-kippur-war": ["Q79","Q858"],  // Guerra de Yom Kipur → Egipto · Siria
  "battle-of-talas": ["Q813","Q232"],  // Batalla de Talas → Kirguistán · Kazajistán
  "battle-of-the-yarmouk": ["Q858"],  // Batalla de Yarmuk → Siria
};
