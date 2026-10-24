/* Nombre del lugar de nacimiento de cada personaje del Duelo/Aventura (Wikidata P19) en los 11 idiomas -> data/duelo-nacimientos.js
   Carta -> titulo en en.json -> QID (API de Wikipedia) -> P19 -> etiquetas. Solo se acepta si las coordenadas del lugar caen a <60 km de las del personaje. */
import fs from "fs";
const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const LG = ["es", "en", "fr", "pt", "de", "it", "zh", "ko", "ja", "ru", "pl"];
global.window = { AIQ: {} }; await import("file:///" + root + "data/duelo-personas.js");
const D = window.AIQ.DUELO_PERSONAS, EN = JSON.parse(fs.readFileSync(root + "data/wiki/en.json", "utf8"));
const get = async u => { for (let i = 0; i < 4; i++) { try { const r = await fetch(u, { headers: { "User-Agent": "GeoliteBuild/1.0 (alvarocanochica@gmail.com)" } }); if (r.ok) return r.json(); } catch (e) {} await new Promise(r => setTimeout(r, 1500)); } throw new Error(u); };
const hav = (a, b, c, d) => { const t = x => x * Math.PI / 180, h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const qid = {};
for (const ch of chunk(D.map(r => r[0]), 40)) {
  const titles = ch.map(id => EN[id] && EN[id][0]).filter(Boolean);
  const j = await get("https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=" + encodeURIComponent(titles.join("|")));
  const map = {}; (j.query.redirects || []).forEach(r => (map[r.from] = r.to)); (j.query.normalized || []).forEach(r => (map[r.from] = r.to));
  const byT = {}; Object.values(j.query.pages).forEach(p => p.pageprops && (byT[p.title] = p.pageprops.wikibase_item));
  ch.forEach(id => { let t = EN[id] && EN[id][0]; if (t) { while (map[t]) t = map[t]; qid[id] = byT[t]; } });
}
const pq = {}; // persona -> QID del lugar de nacimiento
for (const ch of chunk(Object.entries(qid).filter(e => e[1]), 40)) {
  const j = await get("https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=" + ch.map(e => e[1]).join("|"));
  ch.forEach(([id, q]) => { const c = j.entities[q] && j.entities[q].claims && j.entities[q].claims.P19; const v = c && c[0].mainsnak.datavalue; if (v) pq[id] = v.value.id; });
}
const lab = {}, crd = {};
for (const ch of chunk([...new Set(Object.values(pq))], 40)) {
  const j = await get("https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|claims&languages=" + LG.join("|") + "&ids=" + ch.join("|"));
  ch.forEach(q => { const e = j.entities[q]; lab[q] = {}; LG.forEach(l => e.labels[l] && (lab[q][l] = e.labels[l].value)); const p = e.claims && e.claims.P625; const v = p && p[0].mainsnak.datavalue; crd[q] = v && [v.value.latitude, v.value.longitude]; });
}
/* los que Wikidata no trae o trae lejos de la chincheta: titulo de Wikipedia (en) del lugar, a mano */
const MANUAL = { "charles-darwin": ["Shrewsbury"], "jose-rizal": ["Calamba, Laguna"], "genghis-khan": ["Delüün Boldog"], "leif-erikson": ["Haukadalur"], "desmond-tutu": ["Klerksdorp"], "benito-juarez": ["San Pablo Guelatao"], "carlos-gardel": ["Toulouse", "Tacuarembó"], "keylor-navas": ["San Isidro de El General"], "filippo-tommaso-marinetti": ["Alexandria"] };
const mlab = {};
{ const ts = [...new Set(Object.values(MANUAL).flat())], j = await get("https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=" + encodeURIComponent(ts.join("|")));
  const map = {}; (j.query.redirects || []).forEach(r => (map[r.from] = r.to)); (j.query.normalized || []).forEach(r => (map[r.from] = r.to)); const byT = {}; Object.values(j.query.pages).forEach(p => p.pageprops && (byT[p.title] = p.pageprops.wikibase_item));
  const ids = ts.map(t => { while (map[t]) t = map[t]; return [t, byT[t]]; }); const w = await get("https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels&languages=" + LG.join("|") + "&ids=" + ids.map(x => x[1]).join("|"));
  ts.forEach((t, i) => { const e = w.entities[ids[i][1]], o = {}; if (!e || !e.labels) console.log("FALTA", t, ids[i]); LG.forEach(l => (o[l] = (e.labels[l] || e.labels.en || e.labels.mul || Object.values(e.labels)[0] || {value: t}).value)); mlab[t] = o; }); }
const out = {}; let bad = [];
D.forEach(r => { if (MANUAL[r[0]]) { const o = {}; LG.forEach(l => (o[l] = MANUAL[r[0]].map(t => mlab[t][l]).join(" / "))); return (out[r[0]] = o); } const q = pq[r[0]]; if (!q || !lab[q].en) return bad.push(r[0] + " sin P19"); const c = crd[q]; if (c && hav(r[1], r[2], c[0], c[1]) > 60) return bad.push(r[0] + " lejos " + Math.round(hav(r[1], r[2], c[0], c[1]))); const o = {}; LG.forEach(l => (o[l] = lab[q][l] || lab[q].en)); out[r[0]] = o; });
fs.writeFileSync(root + "data/duelo-nacimientos.js", "/* Geolite - lugar de nacimiento de los personajes del Duelo y la Aventura, por idioma (Wikidata P19; generado por tools/build-birthplaces.mjs, no editar a mano). { id de carta: { idioma: nombre } } */\nwindow.AIQ = window.AIQ || {};\nwindow.AIQ.DUELO_NACIMIENTOS = " + JSON.stringify(out) + ";\n");
console.log(Object.keys(out).length + "/" + D.length, bad.length, bad.slice(0, 40));
