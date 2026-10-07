/*
 * Geolite - exporta los logros para darlos de alta en Steamworks (Stats & Achievements).
 *   node tools/steam-achievements.mjs     -> docs/steam/achievements.csv + achievements.json
 *   python tools/steam_icons.py           -> docs/steam/icons/<id>.jpg y <id>_locked.jpg (64x64)
 * El "API name" de Steam es el id del logro: js/profile.js lo pasa tal cual a A.steam.unlock(id).
 * Nombres y descripciones en los 12 idiomas del juego (js/i18n2-5.js, A.TR), con el codigo de idioma de Steam.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const OUT = path.join(ROOT, "docs", "steam"); fs.mkdirSync(OUT, { recursive: true });

const A = { icon: () => "", iconize() {}, T: (es, en) => en, tx: o => o.en };
const ctx = { window: { AIQ: A }, document: {}, localStorage: { getItem: () => null, setItem() {} } }; vm.createContext(ctx);
for (const f of ["js/i18n2.js", "js/i18n3.js", "js/i18n4.js", "js/i18n5.js", "js/profile.js"]) if (fs.existsSync(path.join(ROOT, f))) vm.runInContext(read(f), ctx);
const ICON = vm.runInContext("(" + read("js/icons.js").match(/A\.ACH_ICON = (\{[\s\S]*?\});/)[1] + ")", ctx);      // excepciones; sin entrada: ach_<id>
const FRAME = vm.runInContext("(" + read("js/icons.js").match(/A\.ACH_FRAME = (\{[\s\S]*?\});/)[1] + ")", ctx);

/* orden de A.TR: [fr, pt, de, it, es-419, zh, ko, ja, ru, pl] -> idioma de Steam */
const STEAM = [["en", "english"], ["es", "spanish"], ["fr", "french", 0], ["pt", "brazilian", 1], ["de", "german", 2], ["it", "italian", 3], ["es-419", "latam", 4], ["zh", "schinese", 5], ["ko", "koreana", 6], ["ja", "japanese", 7], ["ru", "russian", 8], ["pl", "polish", 9]];
const tr = (o, l) => { if (l === "en" || l === "es") return o[l]; const i = STEAM.find(s => s[0] === l)[2], t = (A.TR || {})[o.en]; return (t && t[i]) || (l === "es-419" ? o.es : null); };

const rows = A.ACH.map(a => {
  const r = { id: a.id, hidden: a.secret ? 1 : 0, tier: a.tier, ev: a.ev, frame: FRAME[a.ev] || "blank_boss", icon: ICON[a.id] || "ach_" + a.id, name: {}, desc: {} };
  for (const [l, s] of STEAM) { r.name[s] = tr(a.name, l); r.desc[s] = tr(a.desc, l); }
  return r;
});
const missing = rows.flatMap(r => STEAM.filter(([, s]) => !r.name[s] || !r.desc[s]).map(([, s]) => `${r.id}:${s}`));
/* sin traduccion cae al ingles, como hace el juego (CLAUDE.md); el aviso de abajo sigue diciendo cuales faltan */
rows.forEach(r => { const a = A.ACH.find(x => x.id === r.id); for (const [, s] of STEAM) { r.name[s] = r.name[s] || a.name.en; r.desc[s] = r.desc[s] || a.desc.en; } });

fs.writeFileSync(path.join(OUT, "achievements.json"), JSON.stringify(rows, null, 1));
const q = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
const head = ["api_name", "hidden", "icon", "icon_locked", ...STEAM.flatMap(([, s]) => [`name_${s}`, `desc_${s}`])];
const csv = [head.join(","), ...rows.map(r => [r.id, r.hidden, `icons/${r.id}.jpg`, `icons/${r.id}_locked.jpg`, ...STEAM.flatMap(([, s]) => [q(r.name[s]), q(r.desc[s])])].join(","))].join("\n");
fs.writeFileSync(path.join(OUT, "achievements.csv"), "﻿" + csv + "\n");
console.log(`${rows.length} logros -> docs/steam/achievements.csv`);
if (missing.length) console.warn(`Sin traducir (${missing.length}): ${missing.slice(0, 40).join(" ")}${missing.length > 40 ? " ..." : ""}`);
