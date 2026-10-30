/* La mesa de contenido (maqueta) — consola del desarrollador y del que balancea. Lee data/*.js tal cual; no escribe nada en el juego.
   Lo que decides (Bien / No / Cambiar…, los cortes y sus versiones) se guarda en mesa/notas-contenido.json (servidor local) para que Claude lo lea y lo aplique. */
(function () {
  "use strict";
  const A = window.AIQ, MC = A.MC, SG = (A.SUG && A.SUG.items) || [], SEN = A.SEN || { S: {}, LC: {}, L: [], ANC: {} }, SN = SEN.S, LC = SEN.LC, LANGS = SEN.L, ANC = SEN.ANC;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (n, t) => (t ? (100 * n / t).toFixed(1) : "0") + " %", cl01 = x => Math.max(0, Math.min(100, x));
  const countBy = (arr, f) => { const m = {}; arr.forEach(x => { const k = f(x); m[k] = (m[k] || 0) + 1; }); return m; };
  const NMAP = { "United States": "United States of America", "Republic of Ireland": "Ireland", "Czech Republic": "Czechia" }, nm = s => NMAP[s] || s;
  const NV = A.DUELO_NIVELES, QD = A.QDIFF, QL = A.QLEVEL;
  const THEME = ["capital", "landmark", "flag", "country", "history", "character", "nature", "flag", "city", "clue", "culture", "mixed"];
  const CATS = { capital: "Capitales", city: "Ciudades", landmark: "Monumentos", nature: "Naturaleza", history: "Historia", country: "Países", flag: "Banderas", clue: "Pistas", character: "Personajes", culture: "Cultura (Sello)" };
  const ROUNDS = ["Capitales", "Monumentos I", "Banderas I", "Países", "Historia", "Personajes", "Naturaleza", "Banderas II", "Ciudades", "Pistas", "Cultura", "Jackpot"];
  const ZN = ["Fácil", "Medio", "Difícil"], ZS = ["Lo conoce cualquiera", "Me suena", "No la sé"], ZC = ["#5ee07a", "#ffd24a", "#ff6b78"];

  /* ================= banco unificado ================= */
  const rows = [], placeById = {}, CUR = new Set((A.CODEX_CURATED || []).map(c => c[0]));
  A.PLACES.forEach(p => (placeById[p[0]] = p));
  const cname = q => (A.PCOUNTRY[q] ? A.PCOUNTRY[q].en : q);
  const ctryOfPlace = p => { const pc = A.PLACE_COUNTRIES[p[0]], q = pc && pc.length ? pc[0] : p[5]; return q ? nm(cname(q)) : ""; };
  const roundOf = (topic, lvl) => { if (topic === "capital" && lvl >= 9) return 4; const rs = THEME.map((x, i) => (x === topic ? i : -1)).filter(i => i >= 0); return rs.length ? rs[Math.min(rs.length - 1, Math.floor((lvl - 1) * rs.length / 10))] : -1; };
  function push(r) { if (r.saco == null && NV[r.qid]) r.saco = NV[r.qid][0]; r.d = r.d == null ? 50 : r.d; r.lvl = QL[r.qid] || Math.max(1, Math.min(10, Math.ceil(r.d / 10))); r.round = roundOf(r.topic, r.lvl); r.tags = r.tags || []; let k = r.key; if (k.startsWith("flag:")) k = k.slice(5); if (k.startsWith("clue:")) k = k.slice(5); r.wid = k.replace(/^(x:|person:)/, ""); rows.push(r); }
  A.PLACES.forEach(p => { const [id, kind, , , , , names] = p;
    if (kind === "country") { const en = names.en, c = nm(en); push({ key: "c:" + en, qid: "c:" + en, topic: "country", name: names.es, ctry: c, d: QD["c:" + en], src: "banco" }); push({ key: "flag:c:" + en, qid: "flag:c:" + en, topic: "flag", name: names.es, ctry: c, d: QD["flag:c:" + en], src: "banco" }); }
    else push({ key: id, qid: id, topic: kind, name: names.es, ctry: ctryOfPlace(p), d: QD[id], src: "banco" }); });
  A.CLUES.forEach(([id, , txt]) => { const p = placeById[id]; if (p) push({ key: "clue:" + id, qid: "clue:" + id, topic: "clue", name: txt.es, ctry: ctryOfPlace(p), d: QD["clue:" + id], src: "banco", hand: true }); });
  A.DUELO_PERSONAS.forEach(p => { const k = "person:" + p[0], n = NV[k]; push({ key: k, qid: k, topic: "character", name: p[5].es, ctry: nm(p[10] || ""), d: n && n[1], saco: n && n[0], src: "duelo", sub: p[6].en, yr: p[3], hand: CUR.has(p[0]), mujer: (MC.f || []).includes(p[0]) }); });
  A.DUELO_EXTRA.forEach(x => { const k = "x:" + x[0], n = NV[k], z = x[5] || [], t = x[1];
    const r = { key: k, qid: k, topic: ["culture", "landmark", "city", "nature", "history"].includes(t) ? t : "landmark", name: x[6].es, ctry: nm(z[0] || ""), ctrys: z.map(nm), d: n && n[1], saco: n && n[0], src: "duelo", tags: [], hand: x[9] === 1 };
    if (t === "culture") r.sub = MC.sub[x[0]]; if (MC.marcas.includes(x[0])) r.tags.push("marca"); if (MC.disputado.includes(x[0])) r.tags.push("origen disputado"); if (MC.pasta.includes(x[0])) r.tags.push("pasta"); push(r); });
  rows.forEach(r => { if (!r.hand && CUR.has(r.wid) && r.src !== "banco") r.hand = true; });
  const byKey = {}, byWid = {}; rows.forEach(r => { byKey[r.key] = r; if (!byWid[r.wid] || byWid[r.wid].topic === "flag") byWid[r.wid] = r; });
  const COUNTRIES = A.PLACES.filter(p => p[1] === "country").map(p => nm(p[6].en)).sort();
  const total = rows.length;

  /* ================= notas, cortes y versiones ================= */
  let N = {}, OV = {}, SERVER = false, CFG = { w: { sl: 40, v: 30, inl: 20, st: 10 }, t: [34, 67], mw: 30, base: "jueces" }, HIST = [];
  try { N = JSON.parse(localStorage.getItem("mc.notas") || "{}"); } catch (e) {}
  function loadCfg() { try { Object.assign(CFG, JSON.parse((N["cfg:balanceo"] || {}).nota || "{}")); } catch (e) {} try { HIST = JSON.parse((N["cfg:historial"] || {}).nota || "[]"); } catch (e) { HIST = []; } try { OV = JSON.parse((N["cfg:dif"] || {}).nota || "{}"); } catch (e) { OV = {}; } }
  loadCfg();
  /* ---- guardado: servidor local (notas-contenido.json) o portal (api/contenido + Redis, con la clave de la mesa) ---- */
  const REMOTE = !/^(localhost|127\.0\.0\.1)$/.test(location.hostname), API = REMOTE ? "/api/contenido" : "/api/notas";
  let KEY = "", RVER = 0, OFF = "", SYNC = {}, saving = false, again = false;
  try { KEY = localStorage.getItem("geolite.mesa.key") || localStorage.getItem("mc.key") || ""; SYNC = JSON.parse(localStorage.getItem("mc.sync") || "{}"); } catch (e) {}
  const hdr = h => Object.assign(REMOTE ? { "x-mesa": KEY } : {}, h || {});
  const setNet = () => { const e = $("#net"); if (e) { e.textContent = SERVER ? (REMOTE ? "● portal conectado: Claude lee tus notas" : "● conectado: Claude lee tus notas") : OFF || "○ sin servidor: notas solo en este navegador"; e.style.color = SERVER ? "#5ee07a" : "#ff9aa4"; } };
  /* fusiona lo del servidor: lo que NO has tocado desde la ultima sincronizacion lo manda el servidor; lo que has tocado tu (incluso si lo has borrado) manda tu */
  function reconcile(R) { const dirty = new Set(); new Set([...Object.keys(N), ...Object.keys(SYNC)]).forEach(k => { if (JSON.stringify(N[k]) !== JSON.stringify(SYNC[k])) dirty.add(k); }); const out = {}; Object.keys(R).forEach(k => { if (!dirty.has(k)) out[k] = R[k]; }); dirty.forEach(k => { if (N[k]) out[k] = N[k]; }); const ch = JSON.stringify(out) !== JSON.stringify(N); N = out; SYNC = JSON.parse(JSON.stringify(R)); try { localStorage.setItem("mc.sync", JSON.stringify(SYNC)); } catch (e) {} return ch; }
  function door(msg) { if ($("#door")) return; const o = document.createElement("div"); o.className = "ov"; o.id = "door"; o.innerHTML = `<div class="box"><h2 class="lbl" style="margin:0;color:var(--gold);font-size:14px!important">La mesa de contenido</h2><p class="note" style="margin:0">${esc(msg || "Privada: pide la clave de la mesa.")}</p><input id="dkey" type="password" placeholder="CLAVE" autocomplete="current-password"><div class="row"><button class="btn" id="dgo">Entrar</button></div></div>`; document.body.appendChild(o); const i = $("#dkey"); i.focus(); const go2 = () => { KEY = i.value.trim(); o.remove(); loadNotes(true); }; $("#dgo").onclick = go2; i.onkeydown = e => { if (e.key === "Enter") go2(); }; }
  async function loadNotes(redraw) {
    try { const r = await fetch(API, { headers: hdr() });
      if (r.status === 401) { KEY = ""; try { localStorage.removeItem("mc.key"); } catch (e) {} SERVER = false; OFF = "○ falta la clave"; setNet(); return door("Esa no es la clave."); }
      if (r.status === 429) { SERVER = false; OFF = "○ demasiados intentos: espera 10 minutos"; return setNet(); }
      if (r.status === 503) { SERVER = false; OFF = "○ el portal aún no está activado (falta MESA_KEY o Redis)"; return setNet(); }
      if (!r.ok) throw new Error("http"); const j = await r.json(); SERVER = true; OFF = ""; if (REMOTE) { RVER = j.ver; try { localStorage.setItem("mc.key", KEY); localStorage.setItem("geolite.mesa.key", KEY); } catch (e) {} }
      const ch = reconcile(REMOTE ? j.notas : j); loadCfg(); setNet(); if (redraw || ch) draw(); } catch (e) { SERVER = false; setNet(); } }
  async function pushN() { if (saving) { again = true; return; } saving = true;
    try { do { again = false; const r = await fetch(API, { method: "POST", headers: hdr({ "content-type": "application/json" }), body: JSON.stringify(REMOTE ? { ver: RVER, notas: N } : N) });
        if (r.status === 409) { const j = await r.json(); RVER = j.ver; reconcile(j.notas); again = true; continue; }
        if (r.status === 401) { KEY = ""; SERVER = false; door("Esa no es la clave."); break; }
        SERVER = r.ok; if (r.ok) { if (REMOTE) RVER = (await r.json()).ver; SYNC = JSON.parse(JSON.stringify(N)); try { localStorage.setItem("mc.sync", JSON.stringify(SYNC)); } catch (e) {} } else OFF = "○ no se pudo guardar (" + r.status + ")";
      } while (again); } catch (e) { SERVER = false; } saving = false; setNet(); }
  let VER = 0;
  function saveN() { VER++; try { localStorage.setItem("mc.notas", JSON.stringify(N)); } catch (e) {} pushN(); }
  function saveCfg() { N["cfg:balanceo"] = { v: "cfg", nota: JSON.stringify(CFG), t: Date.now() }; N["cfg:historial"] = { v: "cfg", nota: JSON.stringify(HIST), t: Date.now() }; saveN(); }
  function saveOv() { N["cfg:dif"] = { v: "cfg", nota: JSON.stringify(OV), t: Date.now() }; VER++; saveN(); }
  /* REPASO: recorre lo que aun no has mirado, de uno en uno, con la ficha abierta; al opinar pasa a la siguiente */
  let REP = null;
  const repPending = k => !N[k];
  function repStart(src) {
    reindex(); let list = [];
    if (src === "entra") list = SG.filter(x => !N[SGKEY(x)]).sort((a, b) => b.idiomas - a.idiomas).map(SGKEY);
    else if (src === "linea") list = rows.filter(r => !N[r.key]).sort((a, b) => (a.dif2 == null ? 101 : a.dif2) - (b.dif2 == null ? 101 : b.dif2)).map(r => r.key);
    else { const seen = new Set(); Object.values(remGroups()).forEach(g => g.rows.forEach(r => { if (!N[r.key]) seen.add(r.key); })); list = [...seen]; }
    if (!list.length) return toast("No queda nada sin mirar aquí");
    REP = { src, list }; CURLIST = list.slice(); open(list[0]);
  }
  function repNext() { if (!REP) return; const i = CURLIST.indexOf(DKEY); let k = null; for (let j = i + 1; j < CURLIST.length; j++) if (repPending(CURLIST[j])) { k = CURLIST[j]; break; } if (k == null) for (let j = 0; j < i; j++) if (repPending(CURLIST[j])) { k = CURLIST[j]; break; }
    if (k == null) { toast("¡Repaso terminado! No queda nada sin mirar"); REP = null; return closeDrawer(); } open(k); }
  const repLeft = () => (REP ? CURLIST.filter(repPending).length : 0);
  const userNotes = () => Object.keys(N).filter(k => !k.startsWith("cfg:"));
  if (REMOTE && !KEY) door(); else loadNotes(true);
  if (REMOTE) setInterval(() => { if (KEY && !document.hidden && !$(".ov")) loadNotes(false); }, 25000);
  function toast(t) { const e = $("#toast"); e.textContent = t; e.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(() => (e.style.display = "none"), 1700); }
  function vote(k, v) { if (N[k] && N[k].v === v) { delete N[k]; toast("Opinión quitada"); } else { N[k] = { v, nota: (N[k] && N[k].nota) || "", t: Date.now() }; toast(v === "ok" ? "Bien ✓" : "No ✕"); } saveN(); draw(); refreshDrawerVotes(); if (REP && N[k]) repNext(); }
  function ask(title, sub, init, cb, long) { const o = document.createElement("div"); o.className = "ov"; o.innerHTML = `<div class="box"><h2 class="lbl" style="margin:0;color:var(--gold);font-size:14px!important">${esc(title)}</h2><p class="note" style="margin:0">${esc(sub || "")}</p>${long ? '<textarea id="askv" rows="5"></textarea>' : '<input id="askv">'}<div class="row"><button class="btn" id="askok">Guardar</button><button class="btn ghost" id="askno">Cancelar</button></div></div>`; document.body.appendChild(o); const i = $("#askv"); i.value = init || ""; i.focus(); const done = ok => { const v = i.value; o.remove(); if (ok) cb(v); }; $("#askok").onclick = () => done(true); $("#askno").onclick = () => done(false); i.onkeydown = e => { if (e.key === "Escape") done(false); if (e.key === "Enter" && (!long || e.ctrlKey)) done(true); }; }
  function note(k) { ask("Qué quieres que cambie", nameOfKey(k), (N[k] && N[k].nota) || "", t => { N[k] = { v: (N[k] && N[k].v) || "cambiar", nota: t, t: Date.now() }; saveN(); toast("Nota guardada"); draw(); refreshDrawerVotes(); if (REP) repNext(); }, true); }
  const vb = k => { const n = N[k] || {}, e = esc(k); return `<span class="vt"><button class="y ${n.v === "ok" ? "on" : ""}" data-vote="ok" data-k="${e}">Bien</button><button class="n ${n.v === "no" ? "on" : ""}" data-vote="no" data-k="${e}">No</button><button class="c ${n.nota ? "on" : ""}" data-note="1" data-k="${e}">${n.nota ? "Nota ✎" : "Cambiar…"}</button></span>`; };
  const SGKEY = x => "sug:" + x.id, sgByKey = {}; SG.forEach(x => (sgByKey[SGKEY(x)] = x));
  function nameOfKey(k) { if (k.startsWith("chg:")) return "CAMBIAR → " + nameOfKey(k.slice(4)); if (byKey[k]) return byKey[k].name; if (sgByKey[k]) return "NUEVO: " + sgByKey[k].es + " (" + sgByKey[k].pais + ")"; if (k.startsWith("enc:")) return "ficha " + encName(k.slice(4)); if (k.startsWith("pais:")) return k.slice(5); return k; }

  /* ================= indice de fama ================= */
  const SIG = [["sl", "Idiomas de Wikipedia", "ediciones en otros idiomas"], ["v", "Visitas en inglés", "12 meses, en.wikipedia"], ["inl", "Visitas en español", "12 meses, es.wikipedia"], ["st", "Declaraciones de Wikidata", "cuánto se ha escrito de ella"]];
  const scoreOf = (k, val) => { const a = ANC[k]; if (!a || val == null) return null; const f = k === "sl" || k === "st" ? val : Math.log10(val + 1); return cl01(100 * (f - a[0]) / (a[1] - a[0])); };
  function famaOf(id) { const a = SN[id]; if (!a) return null; let sw = 0, sv = 0; SIG.forEach(([k], i) => { const sc = scoreOf(k, a[i]); if (sc != null && CFG.w[k] > 0) { sw += CFG.w[k]; sv += CFG.w[k] * sc; } }); return sw ? sv / sw : null; }
  const zoneOf = d => (d < CFG.t[0] ? 0 : d < CFG.t[1] ? 1 : 2);
  function reindex() { rows.forEach(r => { const f = famaOf(r.wid); r.fama = f; const wk = f == null ? null : 100 - f; r.wiki = wk; const dn = A.RES && A.RES.dnew ? A.RES.dnew[r.key] : null; r.base = CFG.base === "wiki" ? wk : (dn != null ? dn : (r.d == null ? wk : r.d)); r.dif2 = OV[r.key] != null ? OV[r.key] : r.base; r.zone = r.dif2 == null ? null : zoneOf(r.dif2); r.zoneHoy = zoneOf(r.d); }); }
  /* escenario: "hoy" o "con mis decisiones" (propuestas en Bien entran, filas en No salen) */
  let SCEN = false; try { SCEN = localStorage.getItem("mc.scen") === "1"; } catch (e) {}
  const SUGSIG = A.SUGSIG || {};
  const famaArr = a => { if (!a) return null; let sw = 0, sv = 0; SIG.forEach(([k], i) => { const sc = scoreOf(k, a[i]); if (sc != null && CFG.w[k] > 0) { sw += CFG.w[k]; sv += CFG.w[k] * sc; } }); return sw ? sv / sw : null; };
  const sugTopic = x => ({ persona: "character", ciudad: "city", monumento: "landmark", naturaleza: "nature", historia: "history", capital: "capital" })[x.cat] || (x.sub === "animal" ? "nature" : "culture");
  const sugRow = x => { const f = famaArr(SUGSIG[x.id]), d2 = OV[SGKEY(x)] != null ? OV[SGKEY(x)] : x.dRes != null ? x.dRes : f == null ? null : 100 - f; return { key: SGKEY(x), name: x.es, topic: sugTopic(x), ctry: x.pais, dif2: d2, d: d2 == null ? 50 : d2, zone: d2 == null ? null : zoneOf(d2), zoneHoy: null, tags: [], sug: true, sub: x.sub, mujer: x.mujer, wid: null }; };
  const sgRows = () => SG.map(sugRow).filter(r => r.dif2 != null);
  function cohort() { return SCEN ? rows.filter(r => !(N[r.key] && N[r.key].v === "no")).concat(sgRows().filter(r => N[r.key] && N[r.key].v === "ok")) : rows; }
  const isHand = r => !!r.hand, langOk = id => { const c = LC[id]; return c ? c.l.filter(x => x > 0).length : 0; };
  const snapZ = () => rows.map(r => (r.zone == null ? "-" : r.zone)).join("");

  /* ================= estado de la interfaz ================= */
  const VIEWS = {}, ST = {}, F = {};
  let cur = (location.hash.slice(1) || "inicio"), CURLIST = [], NAVI = -1, WIKI = null, IMGD = null;
  const ff = v => (F[v] = F[v] || {});
  const NAVG = [["", [["inicio", "Inicio"], ["resultado", "Resultado por categorías"], ["categorias", "Categorías"], ["cola", "Cola de decisiones"]]], ["Dificultad", [["balanceo", "La línea de dificultad"], ["margenes", "Márgenes por nivel"], ["rondas", "Probar las rondas"]]], ["Decidir", [["repaso", "Repaso, de uno en uno"], ["sugerencias", "Para añadir"], ["quitar", "Para quitar"], ["notas", "Mis notas"]]], ["Mirar", [["enciclopedia", "Enciclopedia"], ["paises", "Países"], ["personajes", "Personajes"], ["sello", "Sello del país"], ["como", "Cómo funciona hoy"]]]];
  const ALIAS = { preguntas: "balanceo", plan: "inicio" };
  function T(id, cols, data, o) { o = o || {}; const st = ST[id] || (ST[id] = { s: o.s == null ? null : o.s, d: o.d || 1, page: 0, per: o.per || 14 }); let list = data.slice();
    if (st.s != null && cols[st.s] && cols[st.s].v) { const f = cols[st.s].v; list.sort((a, b) => { const x = f(a), y = f(b); return (x > y ? 1 : x < y ? -1 : 0) * st.d; }); }
    if (o.nav !== false) CURLIST = list.map(r => r.key || (r.id ? (r.cat ? "sug:" + r.id : r.id) : r)).slice(0, 3000);
    const per = st.per, pages = Math.max(1, Math.ceil(list.length / per)); st.page = Math.max(0, Math.min(st.page, pages - 1)); const from = st.page * per, sh = list.slice(from, from + per);
    return `<div class="tw" data-tid="${id}"><table><tr>${cols.map((c, i) => `<th class="${c.n ? "num" : ""} ${st.s === i ? "s" : ""}" ${c.v ? `data-sort="${id}:${i}"` : ""}>${c.h}${st.s === i ? (st.d > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr>${sh.map(r => `<tr>${cols.map(c => `<td class="${(c.n ? "num " : "") + (c.w ? "w " : "") + (c.a ? "act" : "")}">${c.f(r)}</td>`).join("")}</tr>`).join("")}</table></div>
      <div class="pager"><button class="chipb" data-pg="${id}:first" ${st.page ? "" : "disabled"}>⏮</button><button class="chipb" data-pg="${id}:-1" ${st.page ? "" : "disabled"}>← Anterior</button><span>Página <b>${st.page + 1}</b> de ${pages} · filas ${list.length ? from + 1 : 0}–${from + sh.length} de ${list.length}</span><button class="chipb" data-pg="${id}:1" ${st.page < pages - 1 ? "" : "disabled"}>Siguiente →</button><button class="chipb" data-pg="${id}:last" ${st.page < pages - 1 ? "" : "disabled"}>⏭</button></div>`; }
  const nmc = r => `<span class="nm" data-open="${esc(r.key)}">${esc(r.name)}</span>`;
  const zbar = r => (r.dif2 == null ? "—" : `<span class="bar3" style="width:110px;display:inline-flex;height:14px;vertical-align:middle"><i style="width:${r.dif2}%;background:${ZC[r.zone]}"></i></span> ${Math.round(r.dif2)}`);
  const zmove = r => (r.zone == null ? "—" : `${ZN[r.zoneHoy]} → <b style="font-weight:400;color:${ZC[r.zone]}">${ZN[r.zone]}</b>`);
  const sel = (v, f, opts, all) => `<select data-f="${v}.${f}"><option value="">${all}</option>${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(ff(v)[f]) === String(k) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const inp = (v, f, ph) => `<input id="in_${v}_${f}" data-f="${v}.${f}" placeholder="${ph}" value="${esc(ff(v)[f] || "")}">`;
  const bar = (label, n, max, extra, cls) => `<div class="br"><span class="l" title="${esc(label)}">${esc(label)}</span><span class="t"><i class="${cls || ""}" style="width:${max ? 100 * n / max : 0}%"></i></span><span class="n">${n}${extra ? " · " + extra : ""}</span></div>`;
  const zstack = (arr, key) => { const c = [0, 1, 2].map(k => arr.filter(r => r[key || "zone"] === k).length); return `<span class="bar3">${c.map((n, k) => `<i style="width:${100 * n / (arr.length || 1)}%;background:${ZC[k]}" title="${ZN[k]}: ${n}"></i>`).join("")}</span>`; };
  const go = (v, f) => { cur = v; if (f) Object.assign(ff(v), f); location.hash = v; draw(); window.scrollTo(0, 0); };

  function readBase() { try { return JSON.parse((N["cfg:base"] || {}).nota || "null"); } catch (e) { return null; } }
  function basePanel() { const b = readBase(); if (!b) return ""; const cur = new Set(rows.map(r => r.key)), old = new Set(b.k.map(x => x[0])), add = rows.filter(r => !old.has(r.key)), del = b.k.filter(x => !cur.has(x[0]));
    return `<div class="pl"><h2>Cambios en vivo <small>desde la línea base del ${new Date(b.t).toLocaleString("es")}</small></h2><div class="kpis"><div class="kpi"><b style="color:#5ee07a">+${add.length}</b><span>preguntas nuevas</span></div><div class="kpi"><b style="color:#ff6b78">−${del.length}</b><span>preguntas quitadas</span></div><div class="kpi"><b>${rows.length}</b><span>ahora</span></div><div class="kpi"><b>${b.k.length}</b><span>en la línea base</span></div></div>${add.length || del.length ? `<div class="cand">${add.slice(0, 30).map(r => `<span class="nm" data-open="${esc(r.key)}" style="color:#5ee07a">+ ${esc(r.name)}</span>`).join("")}${del.slice(0, 30).map(x => `<span class="nm" style="color:#ff9aa4;text-decoration:none">− ${esc(x[1])}</span>`).join("")}</div>` : '<p class="note" style="margin:0">Sin cambios todavía. Cuando yo aplique tus decisiones a los datos del juego, aparecerán aquí al instante.</p>'}<div class="row"><button class="chipb" data-act="setbase">Fijar la línea base ahora</button></div></div>`; }
  function setBase() { N["cfg:base"] = { v: "cfg", nota: JSON.stringify({ t: Date.now(), k: rows.map(r => [r.key, r.name]) }), t: Date.now() }; saveN(); }
  /* ================= INICIO ================= */
  function pendingRem() { const g = remGroups(); return Object.values(g).reduce((s, x) => s + x.rows.filter(r => !N[r.key]).length, 0); }
  VIEWS.inicio = () => {
    reindex(); const R = cohort().filter(r => r.dif2 != null), cnt = [0, 1, 2].map(k => R.filter(r => r.zone === k).length), pend = SG.filter(x => !N[SGKEY(x)]).length, g = remGroups(), quitar = Object.values(g).reduce((n, x) => n + x.rows.filter(r => !N[r.key]).length, 0);
    return `<div class="hero"><h1>La mesa de contenido</h1><p>Aquí decides qué hay en Geolite. Tres pasos. Tú decides, yo lo aplico al juego cuando me lo digas: nada cambia antes.</p></div>
      <div class="pl"><div class="bars" style="gap:10px">
        <div class="task"><span class="num">★</span><div><b>Repasar de uno en uno</b><span>Lo más fácil: te enseño una cosa cada vez, tú pulsas Bien o No y paso a la siguiente.</span></div><button class="btn" data-go="repaso">Empezar el repaso</button></div>
        <div class="task"><span class="num">1</span><div><b>Pon la dificultad</b><span>Una sola línea de 0 a 100 para TODO el juego (Aventura, Clásico y Duelo). Dos cortes la parten en Fácil, Medio y Difícil: ${cnt[0]} · ${cnt[1]} · ${cnt[2]} preguntas.</span></div><button class="btn" data-go="balanceo">Abrir la línea</button></div>
        <div class="task"><span class="num">2</span><div><b>Decide qué entra</b><span>${SG.length} propuestas nuevas de personajes y de Sello del país. Quedan ${pend} sin mirar.</span></div><button class="btn" data-go="sugerencias">Para añadir</button></div>
        <div class="task"><span class="num">3</span><div><b>Decide qué sale</b><span>Marcas, orígenes disputados, repetidas y lo menos conocido. Quedan ${quitar} sin mirar.</span></div><button class="btn" data-go="quitar">Para quitar</button></div></div></div>
      <div class="pl"><h2>Cómo se usa <small>30 segundos</small></h2><div class="bars" style="gap:6px;font-size:23px"><div>• <b>Bien</b> = que entre o se quede · <b>No</b> = fuera · <b>Cambiar…</b> = me escribes qué quieres.</div><div>• Pincha en cualquier nombre: se abre su ficha con sus fotos, su dificultad y el texto.</div><div>• En la ficha: <span class="keys"><kbd>←</kbd> <kbd>→</kbd> cambian de elemento · <kbd>B</kbd> bien · <kbd>N</kbd> no · <kbd>C</kbd> nota · <kbd>Esc</kbd> cierra</span></div><div>• <span class="keys"><kbd>/</kbd></span> o <span class="keys"><kbd>Ctrl K</kbd></span> busca cualquier cosa.</div><div>• Tus ${userNotes().length} opiniones se guardan solas. Mira «Mis notas» para repasarlas.</div></div></div>`;
  };

  VIEWS.repaso = () => {
    reindex(); const nE = SG.filter(x => !N[SGKEY(x)]).length, nL = rows.filter(r => !N[r.key]).length, g = remGroups(), seen = new Set(); Object.values(g).forEach(x => x.rows.forEach(r => { if (!N[r.key]) seen.add(r.key); }));
    const card = (id, n, t, d) => `<div class="task"><span class="num">${n}</span><div><b>${t}</b><span>${d}</span></div><button class="btn" data-act="rep" data-s="${id}">${id === "entra" ? nE : id === "linea" ? nL : seen.size} sin mirar · Empezar</button></div>`;
    return `<div class="hero"><h1>Repaso</h1><p>Te enseño las cosas de una en una, con su foto y su dificultad. Pulsa <b>Bien</b> o <b>No</b> (o las teclas <kbd>B</kbd> y <kbd>N</kbd>) y pasa a la siguiente sola. <kbd>→</kbd> salta sin opinar. Puedes parar cuando quieras: se guarda todo y la próxima vez sigue por donde lo dejaste.</p></div>
      <div class="pl"><div class="bars" style="gap:10px">${card("entra", 1, "Lo que podría entrar", "Propuestas nuevas de personajes y Sello del país. Bien = que entre · No = que no.")}${card("sale", 2, "Lo que podría salir", "Marcas, orígenes disputados, repetidas, lo menos conocido. Bien = se queda · No = fuera.")}${card("linea", 3, "Toda la línea", "Cada pregunta del juego, de la más fácil a la más difícil. Ajusta su número en la ficha si no te cuadra.")}</div></div>`;
  };

  /* ================= BALANCEO ================= */
  VIEWS.balanceo = () => {
    reindex(); const f = ff("balanceo"), C = cohort(), R = C.filter(r => r.dif2 != null), cnt = [0, 1, 2].map(k => R.filter(r => r.zone === k).length), N0 = R.length;
    const bins = Array(50).fill(0); R.forEach(r => bins[Math.min(49, Math.floor(r.dif2 / 2))]++); const mx = Math.max(1, ...bins), nSin = C.length - R.length, nMano = C.filter(r => OV[r.key] != null).length;
    const L = C.filter(r => (f.bz === "" || f.bz == null || r.zone == f.bz) && (!f.cat || r.topic === f.cat) && (!f.ctry || (f.ctry === "∅" ? !r.ctry : r.ctry === f.ctry)) && (!f.q || (r.name + " " + r.key + " " + (r.ctry || "")).toLowerCase().includes(f.q.toLowerCase())) && (!f.x || (f.x === "mano" ? OV[r.key] != null : f.x === "sin" ? r.dif2 == null : true)));
    const hist = HIST.map((h, i) => `<tr><td>${esc(h.name)}</td><td>${new Date(h.t).toLocaleString("es")}</td><td>${h.cuts[0]} / ${h.cuts[1]}</td><td>${h.counts.join(" · ")}</td><td class="act"><button class="chipb" data-act="restore" data-i="${i}">Volver a estos cortes</button> <button class="chipb red" data-act="delhist" data-i="${i}">Borrar</button></td></tr>`).join("");
    const dif = r => `<input class="dn" type="number" min="0" max="100" data-dk="${esc(r.key)}" value="${r.dif2 == null ? "" : Math.round(r.dif2)}" placeholder="—" title="Escribe un número de 0 a 100 y pulsa Intro">`;
    return `<div class="pl"><h2>La línea de dificultad <small>una sola para todo el juego: 0 = la sabe cualquiera · 100 = casi nadie</small></h2>
      <p class="note" style="margin:0">Cada pregunta tiene UN número. Los dos cortes (las barras doradas) parten la línea en tres grupos y esos grupos valen igual en Aventura, Clásico y Duelo. El número de partida es el que le dan hoy los jueces del juego (puedes cambiar a la fama en Wikipedia aquí abajo); <b>tú lo cambias a mano</b> en la tabla o en la ficha. ${SCEN ? `<span style="color:var(--gold)">Estás viendo «con tus decisiones».</span>` : ""}</p>
      <div class="zones">${[0, 1, 2].map(k => `<div class="zone z${k} ${f.bz == k && f.bz !== "" && f.bz != null ? "on" : ""}" data-zone="${k}"><h3>${ZN[k]}</h3><b>${cnt[k]}</b><span>${pct(cnt[k], N0)} · ${ZS[k]}</span><span class="lbl">${k === 0 ? "de 0 a " + CFG.t[0] : k === 1 ? "de " + CFG.t[0] + " a " + CFG.t[1] : "de " + CFG.t[1] + " a 100"}</span></div>`).join("")}</div>
      <div class="hist2" style="height:110px">${bins.map((n, i) => `<i style="height:${100 * n / mx}%;background:${ZC[zoneOf(i * 2 + 1)]}" title="${i * 2}-${i * 2 + 2}: ${n}"></i>`).join("")}<span class="cut" style="left:calc(6px + (100% - 12px) * ${CFG.t[0] / 100})"></span><span class="cut" style="left:calc(6px + (100% - 12px) * ${CFG.t[1] / 100})"></span></div>
      <div class="dual"><input type="range" id="b1" min="1" max="98" value="${CFG.t[0]}"><input type="range" id="b2" min="2" max="99" value="${CFG.t[1]}"></div><div class="scale"><span>0 · famoso</span><span>corte Fácil/Medio: ${CFG.t[0]}</span><span>corte Medio/Difícil: ${CFG.t[1]}</span><span>100 · casi nadie</span></div>
      <div class="row"><button class="btn" data-act="savehist">Guardar estos cortes</button><span class="note" style="margin:0">${nMano} preguntas con el número puesto por ti${nSin ? ` · <b>${nSin}</b> sin número (ponles uno tú)` : ""}</span></div>
      <details><summary class="note" style="cursor:pointer">Cómo se calcula el número de partida (opcional)</summary><div class="bars" style="gap:8px;margin-top:8px"><div class="row"><span class="lbl">Partir de</span><span class="pick"><button class="chipb ${CFG.base !== "wiki" ? "on" : ""}" data-act="base" data-b="jueces">Los jueces de hoy (recomendado)</button><button class="chipb ${CFG.base === "wiki" ? "on" : ""}" data-act="base" data-b="wiki">La fama en Wikipedia</button></span></div><p class="note" style="margin:0">Wikipedia no sirve para geografía: Nauru sale «fácil» (25) porque tiene mucha fama como página, pero casi nadie sabe dónde está. Los jueces dicen 90.</p>${SIG.map(([k, l, d]) => `<div><div class="sl">${l} <input type="range" data-w="${k}" min="0" max="100" value="${CFG.w[k]}"> <b>${CFG.w[k]}</b></div><span class="note" style="margin:0 0 0 2px;font-size:18px!important">${d}</span></div>`).join("")}<p class="note">Cada señal se pasa a 0-100 con una escala fija: añadir contenido nuevo no mueve al resto. Lo que pongas a mano no cambia al mover estos pesos.</p></div></details>
      ${HIST.length ? `<details><summary class="note" style="cursor:pointer">Cortes guardados (${HIST.length})</summary><div class="tw" style="max-height:none"><table><tr><th>Nombre</th><th>Fecha</th><th>Cortes</th><th>Fácil · Medio · Difícil</th><th></th></tr>${hist}</table></div></details>` : ""}</div>
    <div class="pl"><h2>Todo el juego, en orden <small>${L.length} de ${C.length} · de la más fácil a la más difícil · pincha en un nombre para ver su ficha</small></h2><div class="tools">${inp("balanceo", "q", "buscar")}${sel("balanceo", "cat", Object.entries(CATS), "Todas las categorías")}${sel("balanceo", "ctry", [["∅", "(sin país)"]].concat(COUNTRIES.map(c => [c, c])), "Todos los países")}${sel("balanceo", "bz", [[0, "Fácil"], [1, "Medio"], [2, "Difícil"]], "Todos los grupos")}${sel("balanceo", "x", [["mano", "Con número puesto por mí"], ["sin", "Sin número"]], "Sin filtro extra")}<button class="chipb" data-act="clrbal">Limpiar</button></div>
      ${T("bal", [{ h: "Pregunta", f: nmc, v: r => r.name }, { h: "Categoría", f: r => CATS[r.topic] || r.topic, v: r => r.topic }, { h: "País", f: r => esc(r.ctry || "—"), v: r => r.ctry }, { h: "Línea", f: zbar, v: r => (r.dif2 == null ? 101 : r.dif2) }, { h: "Número (0-100)", a: 1, f: dif }, { h: "Grupo", f: r => (r.zone == null ? "—" : `<b style="font-weight:400;color:${ZC[r.zone]}">${ZN[r.zone]}</b>`) + (OV[r.key] != null ? ' <span class="pill">a mano</span>' : ""), v: r => (r.zone == null ? 9 : r.zone) }, { h: "Opinión", a: 1, f: r => vb(r.key) }], L, { s: 3, d: 1 })}</div>`;
  };

  /* ================= MARGENES POR NIVEL ================= */
  /* nivel n (1-10) de cada categoria = una VENTANA de la linea, no una tajada: centro 10n-5 y ancho mw (por defecto 30): 1 = 0-20, 2 = 0-30, 3 = 10-40... */
  const winOf = n => [Math.max(0, 10 * n - 5 - CFG.mw / 2), Math.min(100, 10 * n - 5 + CFG.mw / 2)];
  VIEWS.margenes = () => {
    reindex(); const f = ff("margenes"), R = cohort().filter(r => r.dif2 != null), cats = Object.keys(CATS), LV = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const inWin = (r, n) => { const [a, b] = winOf(n); return r.dif2 >= a && (r.dif2 <= b); };
    const col = n => (n >= 40 ? "#5ee07a" : n >= 15 ? "#ffd24a" : "#ff6b78");
    const grid = cats.map(t => { const a = R.filter(r => r.topic === t); return { t, n: a.length, c: LV.map(l => a.filter(r => inWin(r, l)).length) }; });
    const sel2 = f.c && f.l ? R.filter(r => r.topic === f.c && inWin(r, +f.l)) : [];
    const poor = grid.reduce((s2, g) => s2 + g.c.filter(n => n < 15).length, 0), amb = grid.reduce((s2, g) => s2 + g.c.filter(n => n >= 15 && n < 40).length, 0);
    const win = l => { const [a, b] = winOf(l); return Math.round(a) + "–" + Math.round(b); };
    return `<div class="pl"><h2>Márgenes por nivel <small>cada nivel 1-10 de una categoría coge un tramo de la línea, con solape, no una tajada exacta</small></h2>
      <p class="note" style="margin:0">Nivel 1 = el tramo 0–${Math.round(winOf(1)[1])}, nivel 2 = 0–${Math.round(winOf(2)[1])}, nivel 3 = ${Math.round(winOf(3)[0])}–${Math.round(winOf(3)[1])}… Cada casilla dice <b>cuántas preguntas caben</b>. Verde: 40 o más · ámbar: 15-39 · rojo: menos de 15 (ese nivel se quedaría corto en esa categoría y habría que añadir contenido de ese tramo). Pincha una casilla para ver sus preguntas.</p>
      <div class="sl">Ancho del margen <input type="range" id="mw" min="10" max="50" step="5" value="${CFG.mw}"> <b>${CFG.mw}</b> puntos · ${poor} casillas rojas · ${amb} ámbar</div>
      <div class="tw" style="max-height:none"><table><tr><th>Categoría</th><th class="num">Total</th>${LV.map(l => `<th class="num" title="tramo ${win(l)}">N${l}<br><small>${win(l)}</small></th>`).join("")}</tr>${grid.map(g => `<tr><td>${CATS[g.t]}</td><td class="num">${g.n}</td>${g.c.map((n, i) => `<td class="num" style="padding:2px"><button class="chipb ${f.c === g.t && +f.l === i + 1 ? "on" : ""}" data-mg="${g.t}:${i + 1}" style="width:100%;background:${col(n)};color:#14102a;box-shadow:none">${n}</button></td>`).join("")}</tr>`).join("")}</table></div></div>
      <div class="pl"><h2>${f.c && f.l ? CATS[f.c] + " · nivel " + f.l + " (" + win(+f.l) + ")" : "Elige una casilla"} <small>${f.c && f.l ? sel2.length + " preguntas" : "arriba, pincha un número"}</small></h2>${f.c && f.l ? T("mg", [{ h: "Pregunta", f: nmc, v: r => r.name }, { h: "País", f: r => esc(r.ctry || "—"), v: r => r.ctry }, { h: "Línea", f: zbar, v: r => r.dif2 }, { h: "Grupo", f: r => `<b style="font-weight:400;color:${ZC[r.zone]}">${ZN[r.zone]}</b>`, v: r => r.zone }, { h: "Opinión", a: 1, f: r => vb(r.key) }], sel2, { s: 2, d: 1 }) : '<p class="none">Aquí saldrán las preguntas del nivel que elijas.</p>'}</div>`;
  };

  /* ================= SIMULADOR DE RONDAS ================= */
  const DK = { lo0: 0.02, lo5: 0.42, hi0: 0.18, hi5: 0.66, ka: 2.0, kr: 1.3, minN: 40, de: 0.08, dm: 0.08, dh: 0.20, dhm: 0.12, sg: 0.09, fl: 0.008 };
  const expo = (x, k) => (Math.exp(k * x) - 1) / (Math.exp(k) - 1), cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const diffAt = (asc, pos) => { const g = expo(cl(asc / 5, 0, 1), DK.ka), lo = DK.lo0 + (DK.lo5 - DK.lo0) * g, hi = DK.hi0 + (DK.hi5 - DK.hi0) * g; return cl(lo + (hi - lo) * expo(cl(pos / 11, 0, 1), DK.kr), 0, 1); };
  function simulate(r, asc, src) {
    const topic = THEME[r], val = x => (src === "nuevo" ? x.dif2 : x.d) / 100; let pool = cohort().filter(x => (topic === "mixed" ? x.topic !== "flag" : x.topic === topic) && (src !== "nuevo" || x.dif2 != null));
    const D = diffAt(asc, r), dh = topic === "mixed" ? DK.dhm : DK.dh, mu = [cl(D - DK.de, 0, 1), cl(D + DK.dm, 0, 1), cl(D + dh, 0, 1)], cap = Math.min(1, diffAt(asc, 11) + DK.dh + 0.12); pool = pool.filter(x => val(x) <= cap);
    const bands = mu.map(m => { const ds = pool.map(x => Math.abs(val(x) - m)).sort((a, b) => a - b), need = Math.min(ds.length - 1, DK.minN), sg = Math.max(DK.sg, need > 0 ? ds[need] / 1.5 : 0), w = pool.map(x => [x, Math.exp(-0.5 * ((val(x) - m) / sg) ** 2) + DK.fl]).sort((a, b) => b[1] - a[1]), useful = w.filter(e => e[1] >= 0.25);
      return { mu: m, sg, n: useful.length, avg: useful.length ? useful.reduce((s, e) => s + val(e[0]), 0) / useful.length * 100 : 0, top: w.slice(0, 12).map(e => e[0]) }; });
    return { D, mu, cap, pool: pool.length, bands };
  }
  function simGrid(src) { const key = src + "|" + SCEN + "|" + VER + "|" + CFG.t.join(",") + "|" + Object.values(CFG.w).join(","); if (simGrid.k === key) return simGrid.v; const g = [0, 1, 2, 3, 4, 5].map(a => ROUNDS.map((_, r) => { const s = simulate(r, a, src); return s.pool ? Math.min(...s.bands.map(b => b.n)) : 0; })); simGrid.k = key; simGrid.v = g; return g; }
  VIEWS.rondas = () => {
    reindex(); const f = ff("rondas"), src = f.src || "nuevo", asc = +(f.asc || 0), rd = +(f.rd || 0), g = simGrid(src), s = simulate(rd, asc, src);
    const col = n => (n >= 40 ? "#5ee07a" : n >= 15 ? "#ffd24a" : "#ff6b78");
    return `<div class="pl"><h2>Simulador de rondas <small>qué preguntas puede sacar cada ronda de la Aventura en cada Ascensión</small></h2>
      <p class="note" style="margin:0">En cada ronda salen <b>3 fáciles, 1 media y 1 difícil</b> centradas en una dificultad que sube con la ronda y la Ascensión (misma fórmula que js/adventure.js). Verde = ≥ 40 preguntas útiles en cada tramo; ámbar = 15-39; rojo = &lt; 15 (la ronda repetirá o saldrá lo que no toca).</p>
      <div class="row"><span class="lbl">Medir con</span><span class="pick"><button class="chipb ${src === "nuevo" ? "on" : ""}" data-sim="src:nuevo">Índice nuevo</button><button class="chipb ${src === "hoy" ? "on" : ""}" data-sim="src:hoy">Dificultad de hoy</button></span></div>
      <div class="heat"><span class="h"></span>${ROUNDS.map((l, i) => `<span class="h" title="${l}">R${i + 1}</span>`).join("")}${g.map((row, a) => `<span class="h">A${a}</span>` + row.map((n, r) => `<button data-sim="cell:${a}:${r}" class="${a === asc && r === rd ? "on" : ""}" style="background:${col(n)}" title="${n} útiles en el tramo más pobre">${n}</button>`).join("")).join("")}</div></div>
      <div class="pl"><h2>A${asc} · Ronda ${rd + 1} · ${ROUNDS[rd]} <small>${s.pool} preguntas en el carrete · dificultad buscada ${Math.round(s.D * 100)} · techo ${Math.round(s.cap * 100)}</small></h2>
      <div class="pick">${[0, 1, 2, 3, 4, 5].map(a => `<button class="chipb ${a === asc ? "on" : ""}" data-sim="asc:${a}">A${a}</button>`).join("")}<span style="width:14px"></span>${ROUNDS.map((l, i) => `<button class="chipb ${i === rd ? "on" : ""}" data-sim="rd:${i}">R${i + 1} ${l}</button>`).join("")}</div>
      <div class="grid2">${s.bands.map((b, k) => `<div class="band z${k}"><h3>${["3 fáciles", "1 media", "1 difícil"][k]}</h3><span class="note" style="margin:0">Busca dificultad ~${Math.round(b.mu * 100)} · campana ±${Math.round(b.sg * 100)} · <b style="color:${col(b.n)}">${b.n} candidatas útiles</b> (media ${Math.round(b.avg)})</span><div class="cand">${b.top.map(r => `<span class="nm" data-open="${esc(r.key)}">${esc(r.name)}</span>`).join("")}</div></div>`).join("")}</div>
      ${s.pool === 0 ? '<p class="note" style="color:#ff9aa4">Esta ronda se queda sin preguntas con este criterio.</p>' : ""}</div>`;
  };

  /* ================= MI RECETA DE BALANCEO ================= */
  VIEWS.plan = () => {
    reindex(); const C = cohort(), R = C.filter(r => r.dif2 != null), pend = SG.filter(x => !N[SGKEY(x)]).length, g = remGroups();
    const cats = Object.keys(CATS).map(t => { const a = R.filter(r => r.topic === t), z = [0, 1, 2].map(k => a.filter(r => r.zone === k).length); return { t, n: a.length, z, p: z.map(n => (100 * n) / (a.length || 1)) }; });
    const desb = cats.filter(x => x.n >= 100 && !["country", "flag"].includes(x.t) && (x.z[0] < 25 || x.z[2] < 25));
    const grid = simGrid("nuevo"), flat = grid.flat(), verde = flat.filter(n => n >= 40).length, amb = flat.filter(n => n >= 15 && n < 40).length, rojo = flat.filter(n => n < 15).length;
    const sgAll = sgRows().filter(r => !(N[r.key] && N[r.key].v === "ok") && !(N[r.key] && N[r.key].v === "no")), cells = [];
    grid.forEach((row, a) => row.forEach((n, r) => { if (n < 40) { const s = simulate(r, a, "nuevo"), bi = s.bands.reduce((m, b, i) => (b.n < s.bands[m].n ? i : m), 0), b = s.bands[bi], t = THEME[r]; const cand = sgAll.filter(x => (t === "mixed" ? true : x.topic === t) && Math.abs(x.dif2 - b.mu * 100) <= b.sg * 100).sort((x, y) => Math.abs(x.dif2 - b.mu * 100) - Math.abs(y.dif2 - b.mu * 100)); cells.push({ a, r, n, bi, mu: b.mu, need: 40 - n, cand }); } }));
    cells.sort((x, y) => x.n - y.n);
    const P = R.filter(r => r.topic === "character"), withP = new Set(P.map(r => r.ctry)), withC = new Set(R.filter(r => r.topic === "culture").map(r => r.ctry)), base = rows, bP = new Set(base.filter(r => r.topic === "character").map(r => r.ctry)), bC = new Set(base.filter(r => r.topic === "culture").map(r => r.ctry));
    const mujeres = P.filter(r => r.mujer).length;
    const step = (n, title, ok, body) => `<div class="pl"><h2><span style="font-size:34px">${n}</span> ${title} ${ok ? '<span class="bdg ok">hecho</span>' : '<span class="bdg gold">por hacer</span>'}</h2>${body}</div>`;
    return `<div class="hero"><h1>Mi receta de balanceo</h1><p>Cómo te propongo que lo hagamos: <b>primero quitar, luego medir, luego añadir donde duele</b>. Las cifras se actualizan solas al votar; activa arriba «Con mis decisiones» para ver el efecto de tus Bien y No.</p></div>
      ${step(1, "Fija qué significa Fácil, Medio y Difícil", !desb.length, `<p class="note" style="margin:0">Cortes ${CFG.t[0]} / ${CFG.t[1]} (se ven en «Balanceo»). Regla: toda categoría de 100 o más preguntas (menos Países y Banderas, siempre fáciles) debe tener al menos 25 en Fácil y 25 en Difícil, o no podrá dar rondas fáciles ni difíciles. ${desb.length ? "Ahora cojean: " + desb.map(x => `<b>${CATS[x.t]}</b> (${x.z.join("/")})`).join(", ") + "." : "Ahora: todas dentro."} <span class="nm" data-go="balanceo">Abrir Balanceo →</span></p>`)}
      ${step(2, "Quita lo que sobra", pendingRem() === 0, `<p class="note" style="margin:0">Primero lo que rompe tus criterios (marcas, orígenes disputados, pastas, duplicados, sin país) y luego lo irrelevante: lo muy poco conocido, <b>salvo si es la única de su país</b> en esa categoría (esas se quedan como ancla). Pendiente de mirar: <b>${pendingRem()}</b> filas. <span class="nm" data-go="quitar">Abrir Para quitar →</span></p>`)}
      ${step(3, "Pon la cuadrícula de rondas en verde", rojo === 0 && amb === 0, `<p class="note" style="margin:0">Objetivo medible: que cada ronda de cada Ascensión tenga al menos 40 preguntas útiles en sus 3 tramos. Hoy (${SCEN ? "con tus decisiones" : "sin decisiones"}): <b style="color:#5ee07a">${verde} verdes</b> · <b style="color:#ffd24a">${amb} ámbar</b> · <b style="color:#ff6b78">${rojo} rojas</b> de 72. <span class="nm" data-go="rondas">Ver el simulador →</span></p>
        ${cells.length ? `<div class="tw" style="max-height:none">${T("celdas", [{ h: "Dónde duele", f: c => `A${c.a} · R${c.r + 1} ${ROUNDS[c.r]}`, v: c => c.n }, { h: "Tramo pobre", f: c => ["3 fáciles", "1 media", "1 difícil"][c.bi] + " (dificultad ~" + Math.round(c.mu * 100) + ")" }, { h: "Útiles", n: 1, f: c => `<b style="color:${c.n < 15 ? "#ff6b78" : "#ffd24a"}">${c.n}</b>`, v: c => c.n }, { h: "Faltan", n: 1, f: c => "~" + c.need }, { h: "Propuestas que lo rellenan", w: 1, f: c => (c.cand.length ? `<b>${c.cand.length}</b> · ` + c.cand.slice(0, 5).map(x => `<span class="nm" data-open="${esc(x.key)}">${esc(x.name)}</span>`).join(", ") : '<span style="color:#ff9aa4">ninguna: hay que buscar contenido de este tipo</span>') }], cells, { s: 2, d: 1, nav: false, lim: 14 })}</div>` : '<p class="note">Todo verde.</p>'}`)}
      ${step(4, "Cubre los países y la variedad", false, `<div class="bars"><div class="br" style="grid-template-columns:260px minmax(0,1fr) 160px"><span class="l">Países con personaje</span><span class="t"><i class="ok" style="width:${100 * withP.size / COUNTRIES.length}%"></i></span><span class="n">${bP.size} → ${withP.size} de ${COUNTRIES.length}</span></div><div class="br" style="grid-template-columns:260px minmax(0,1fr) 160px"><span class="l">Países con Sello del país</span><span class="t"><i class="ok" style="width:${100 * withC.size / COUNTRIES.length}%"></i></span><span class="n">${bC.size} → ${withC.size} de ${COUNTRIES.length}</span></div><div class="br" style="grid-template-columns:260px minmax(0,1fr) 160px"><span class="l">Mujeres entre los personajes</span><span class="t"><i class="g" style="width:${100 * mujeres / (P.length || 1)}%"></i></span><span class="n">${mujeres} de ${P.length}</span></div></div><p class="note">Primera cobertura (un país sin nada), después variedad (deporte que no sea fútbol, ciencia, mujeres). <span class="nm" data-go="sugerencias">Abrir Para añadir →</span> · <span class="nm" data-go="paises">Ver países →</span></p>`)}
      ${step(5, "Guarda la versión y repasa", HIST.length > 0, `<p class="note" style="margin:0">Cuando algo te guste, guarda una versión de los cortes en «Balanceo» (puedes compararla con otra). Después me dices «aplica» y yo cambio los datos del juego; antes te enseño exactamente qué entra y qué sale. Quedan <b>${pend}</b> propuestas sin mirar.</p>`)}`;
  };

  /* ================= PREGUNTAS ================= */
  VIEWS.preguntas = () => {
    reindex(); const f = ff("preguntas");
    const L = rows.filter(r => (!f.cat || r.topic === f.cat) && (!f.ctry || (f.ctry === "∅" ? !r.ctry : r.ctry === f.ctry)) && (!f.tag || r.tags.includes(f.tag)) && (f.zone === "" || f.zone == null || r.zone == f.zone) && (f.round === "" || f.round == null || r.round == f.round) && (!f.q || (r.name + " " + r.key + " " + r.ctry).toLowerCase().includes(f.q.toLowerCase())));
    return `<div class="pl"><h2>Preguntas <small>${L.length} de ${total}</small></h2><div class="tools">${inp("preguntas", "q", "buscar nombre, id o país")}${sel("preguntas", "cat", Object.entries(CATS), "Todas las categorías")}${sel("preguntas", "ctry", [["∅", "(sin país)"]].concat(COUNTRIES.map(c => [c, c])), "Todos los países")}${sel("preguntas", "zone", [[0, "Fácil"], [1, "Medio"], [2, "Difícil"]], "Toda dificultad")}${sel("preguntas", "round", ROUNDS.map((l, i) => [i, "R" + (i + 1) + " " + l]), "Todas las rondas")}${sel("preguntas", "tag", [["marca", "marca"], ["origen disputado", "origen disputado"], ["pasta", "pasta"]], "Sin etiqueta")}<button class="chipb" data-act="clrf" data-v="preguntas">Limpiar</button></div>
      ${T("preg", [{ h: "Pregunta", f: r => nmc(r) + r.tags.map(t => ` <span class="pill bad">${t}</span>`).join(""), v: r => r.name }, { h: "Categoría", f: r => CATS[r.topic] + (r.sub ? ` <span class="pill">${esc(r.sub)}</span>` : ""), v: r => r.topic }, { h: "País", f: r => esc(r.ctry || "—"), v: r => r.ctry }, { h: "Índice nuevo", f: zbar, v: r => r.dif2 }, { h: "Hoy", n: 1, f: r => Math.round(r.d), v: r => r.d }, { h: "Zona hoy → nueva", f: zmove }, { h: "Nivel", n: 1, f: r => r.lvl, v: r => r.lvl }, { h: "Ronda", f: r => (r.round >= 0 ? "R" + (r.round + 1) : "—"), v: r => r.round }, { h: "Liga", f: r => (r.saco == null ? "—" : ["Bronce", "Plata", "Oro"][r.saco]), v: r => r.saco }, { h: "Opinión", a: 1, f: r => vb(r.key) }], L, { s: 3, d: -1 })}</div>`;
  };

  /* ================= ENCICLOPEDIA ================= */
  const encName = id => (WIKI && WIKI[id] ? WIKI[id][0] : byWid[id] ? byWid[id].name : id);
  VIEWS.enciclopedia = () => {
    reindex(); if (!WIKI) return `<div class="pl"><h2>Enciclopedia</h2><p class="none">Cargando fichas…</p></div>`;
    const f = ff("enciclopedia"), cur2 = {}; (A.CODEX_CURATED || []).forEach(c => (cur2[c[0]] = c[1]));
    const all = Object.keys(LC).map(id => { const r = byWid[id], c = LC[id]; return { key: "enc:" + id, id, name: WIKI[id] ? WIKI[id][0] : id, type: cur2[id] || (r ? r.topic : "lugar"), ctry: r ? r.ctry : "", dif: r ? r.dif2 : null, zone: r ? r.zone : null, hand: !!(cur2[id] || (r && r.hand)), n: langOk(id), bd: c.b, foto: IMGD ? [!!IMGD[id], !!IMGD[id + "~h"], !!IMGD[id + "~k"]] : [1, 1, 1] }; });
    const types = Object.entries(countBy(all, x => x.type)).sort((a, b) => b[1] - a[1]), q = (f.q || "").toLowerCase();
    const L = all.filter(x => (!f.type || x.type === f.type) && (!q || (x.name + x.id).toLowerCase().includes(q)) && (!f.x || (f.x === "idi" ? x.n < 11 : f.x === "foto" ? x.foto.some(v => !v) : f.x === "resto" ? x.bd : f.x === "man" ? x.hand : !x.hand)));
    return `<div class="pl"><h2>Enciclopedia <small>${L.length} de ${all.length} fichas</small></h2><div class="tools">${inp("enciclopedia", "q", "buscar ficha")}<select data-f="enciclopedia.type"><option value="">Todos los tipos</option>${types.map(([t, n]) => `<option value="${t}" ${f.type === t ? "selected" : ""}>${t} (${n})</option>`).join("")}</select>${sel("enciclopedia", "x", [["idi", "Falta texto en algún idioma"], ["foto", "Falta alguna foto"], ["resto", "Con restos de Wikipedia"], ["man", "Curadas a mano"], ["auto", "Solo automáticas"]], "Sin filtro extra")}<button class="chipb" data-act="clrf" data-v="enciclopedia">Limpiar</button></div>
      ${T("enc", [{ h: "Ficha", f: x => `<span class="nm" data-open="${esc(x.key)}">${esc(x.name)}</span>`, v: x => x.name }, { h: "Tipo", f: x => x.type, v: x => x.type }, { h: "País", f: x => esc(x.ctry || "—"), v: x => x.ctry }, { h: "Dificultad", f: x => (x.dif == null ? "—" : `<span style="color:${ZC[x.zone]}">${ZN[x.zone]} ${Math.round(x.dif)}</span>`), v: x => x.dif }, { h: "Origen", f: x => (x.hand ? '<span class="bdg gold">a mano</span>' : '<span class="bdg">auto</span>') }, { h: "Textos", f: x => (x.n >= 11 ? '<span class="bdg ok">11/11</span>' : `<span class="bdg bad">${x.n}/11</span>`) + (x.bd ? '<span class="bdg bad">restos</span>' : ""), v: x => x.n }, { h: "Fotos P·H·K", f: x => x.foto.map(v => (v ? "✓" : '<span style="color:#ff9aa4">✕</span>')).join(" ") }, { h: "Opinión", a: 1, f: x => vb(x.key) }], L, { s: 0, d: 1 })}</div>`;
  };

  /* ================= PAISES ================= */
  const SUBN = { plato: "plato", bebida: "bebida", musica: "música", fiesta: "fiesta", deporte: "deporte", planta: "planta" };
  function falta(c) { const out = [], R = rows.filter(r => r.ctry === c || (r.ctrys || []).includes(c)), pl = R.filter(r => !["country", "flag", "character", "culture"].includes(r.topic)).length; if (!R.some(r => r.topic === "character")) out.push("sin personaje"); if (pl < 4) out.push("pocos lugares (" + pl + ")"); ["plato", "fiesta", "musica", "deporte", "planta"].forEach(k => { if (!R.some(r => r.sub === k)) out.push("sin " + SUBN[k]); }); if (!R.some(r => r.topic === "nature")) out.push("sin naturaleza"); return out; }
  VIEWS.paises = () => {
    reindex(); const f = ff("paises"), tots = {}; COUNTRIES.forEach(c => (tots[c] = { c, n: 0, lug: 0, pers: 0, cult: 0, fc: 0, dif: 0, faltas: [] }));
    rows.forEach(r => { const t = tots[r.ctry]; if (!t) return; t.n++; t.dif += r.dif2 || 0; if (r.topic === "character") t.pers++; else if (r.topic === "culture") t.cult++; else if (r.topic === "flag" || r.topic === "country") t.fc++; else t.lug++; });
    let L = COUNTRIES.map(c => { const t = tots[c]; t.faltas = falta(c); t.sg = SG.filter(x => x.pais === c).length; return t; }); if (f.falta) L = L.filter(t => t.faltas.includes(f.falta)); if (f.q) L = L.filter(t => t.c.toLowerCase().includes(f.q.toLowerCase())); const tn = rows.filter(r => r.ctry).length;
    const fl = [...new Set(COUNTRIES.flatMap(c => falta(c).map(x => x.replace(/ \(\d+\)/, ""))))].sort();
    return `<div class="pl"><h2>Países <small>${L.length} · pincha en uno para ver todo lo suyo y lo que se propone</small></h2><div class="tools">${inp("paises", "q", "buscar país")}<select data-f="paises.falta"><option value="">Qué le falta: cualquier cosa</option>${[...new Set(["sin personaje", "sin plato", "sin fiesta", "sin música", "sin deporte", "sin planta", "sin naturaleza"])].map(x => `<option ${f.falta === x ? "selected" : ""}>${x}</option>`).join("")}</select><button class="chipb" data-act="clrf" data-v="paises">Limpiar</button></div>
      ${T("pais", [{ h: "País", f: t => `<span class="nm" data-open="pais:${esc(t.c)}">${esc(t.c)}</span>`, v: t => t.c }, { h: "Total", n: 1, f: t => t.n, v: t => t.n }, { h: "% banco", n: 1, f: t => pct(t.n, tn), v: t => t.n }, { h: "Lugares", n: 1, f: t => t.lug, v: t => t.lug }, { h: "Personajes", n: 1, f: t => (t.pers ? t.pers : `<span style="color:#ff9aa4">0</span>`), v: t => t.pers }, { h: "Cultura", n: 1, f: t => (t.cult ? t.cult : `<span style="color:#ff9aa4">0</span>`), v: t => t.cult }, { h: "Propuestas", n: 1, f: t => (t.sg ? `<span class="pill warn">${t.sg}</span>` : "—"), v: t => t.sg }, { h: "Le falta", w: 1, f: t => t.faltas.map(x => `<span class="pill warn">${x}</span>`).join(""), v: t => t.faltas.length }], L, { s: 1, d: -1, nav: false, lim: 60 })}</div>`;
  };

  /* ================= PERSONAJES ================= */
  VIEWS.personajes = () => {
    reindex(); const P = rows.filter(r => r.topic === "character"), byO = Object.entries(countBy(P, r => r.sub)).sort((a, b) => b[1] - a[1]).slice(0, 9), era = countBy(P, r => (r.yr < 0 ? "a. C." : r.yr < 1500 ? "<1500" : r.yr < 1800 ? "1500-1799" : r.yr < 1900 ? "1800s" : r.yr < 1950 ? "1900-49" : "1950+"));
    const mis = P.filter(r => r.zone != null && Math.abs(r.zone - r.zoneHoy) === 2), bC = Object.entries(countBy(P, r => r.ctry)).sort((a, b) => b[1] - a[1]);
    return `<div class="grid2"><div class="pl"><h2>Personajes <small>${P.length} · ${bC.length} países · ${P.filter(isHand).length} curados a mano</small></h2><div class="bars">${byO.map(([o, n]) => `<div class="br"><span class="l">${esc(o)}</span>${zstack(P.filter(r => r.sub === o))}<span class="n">${n} · ${pct(n, P.length)}</span></div>`).join("")}</div><p class="note">Colores = zona con tu índice. Casi todo es fútbol y música: falta deporte variado, ciencia y mujeres (mira «Para añadir»).</p></div>
      <div class="pl"><h2>Por época y país <small>dónde se concentran</small></h2><div class="bars">${["a. C.", "<1500", "1500-1799", "1800s", "1900-49", "1950+"].map(e => bar(e, era[e] || 0, 150, pct(era[e] || 0, P.length), "g")).join("")}<div class="br"><span class="l"></span><span></span><span></span></div>${bC.slice(0, 6).map(([c, n]) => bar(c, n, bC[0][1], pct(n, P.length), n / P.length > .08 ? "r" : "")).join("")}</div></div></div>
      <div class="pl"><h2>Personajes cuya zona cambia 2 niveles <small>${mis.length} · el nivel de hoy no encaja con su fama real</small></h2>${T("pmis", [{ h: "Personaje", f: nmc, v: r => r.name }, { h: "País", f: r => esc(r.ctry), v: r => r.ctry }, { h: "Idiomas", n: 1, f: r => (SN[r.wid] || [])[0], v: r => (SN[r.wid] || [])[0] }, { h: "Zona hoy → nueva", f: zmove }, { h: "Opinión", a: 1, f: r => vb(r.key) }], mis, { s: 2, d: -1, lim: 40 })}</div>`;
  };

  /* ================= SELLO ================= */
  const SUBS = [["plato", "Platos"], ["bebida", "Bebidas"], ["musica", "Música y baile"], ["fiesta", "Fiestas"], ["deporte", "Deportes"], ["planta", "Frutas y plantas"]];
  VIEWS.sello = () => {
    reindex(); const C = rows.filter(r => r.topic === "culture"), f = ff("sello"), meta = +(f.meta || 1), nat = rows.filter(r => r.topic === "nature" && r.src === "duelo");
    return `<div class="grid2"><div class="pl"><h2>Cultura hoy <small>${C.length} entradas · ${new Set(C.map(r => r.ctry)).size} países</small></h2><div class="bars">${SUBS.map(([k, l]) => { const a = C.filter(r => r.sub === k); return `<div class="br"><span class="l">${l}</span>${zstack(a)}<span class="n">${a.length} · ${pct(a.length, C.length)}</span></div>`; }).join("")}<div class="br"><span class="l">Animales (en Naturaleza)</span><span class="bar3"><i style="width:100%;background:#8a8fa8"></i></span><span class="n">${nat.length}</span></div></div>
      <div class="sl" style="margin-top:8px">Meta por país y tipo <input type="range" data-sim="meta" min="1" max="5" value="${meta}"> <b>${meta}</b></div><div class="bars">${SUBS.map(([k, l]) => { const have = COUNTRIES.filter(c => C.filter(r => r.ctry === c && r.sub === k).length >= meta).length; return bar("Países con " + l.toLowerCase(), have, COUNTRIES.length, pct(have, COUNTRIES.length), "ok"); }).join("")}</div><p class="note">Barras verdes: países que llegan a la meta. Lo que falta es lo que hay que ampliar (mira «Para añadir»).</p></div>
      <div class="pl"><h2>Con etiqueta de poda <small>marcas · origen disputado · pastas</small></h2>${T("sell", [{ h: "Entrada", f: nmc, v: r => r.name }, { h: "País", f: r => esc(r.ctrys && r.ctrys.length > 1 ? r.ctrys.join("+") : r.ctry), v: r => r.ctry }, { h: "Etiquetas", w: 1, f: r => r.tags.map(t => `<span class="pill bad">${t}</span>`).join("") }, { h: "Opinión", a: 1, f: r => vb(r.key) }], C.filter(r => r.tags.length), { lim: 30 })}</div></div>`;
  };

  /* ================= SUGERENCIAS (anadir) ================= */
  const nivPers = x => (x.idiomas >= 120 ? "Fácil" : x.idiomas >= 80 ? "Media" : "Difícil");
  VIEWS.sugerencias = () => {
    const f = ff("sugerencias"), per = SG.filter(x => x.cat === "persona"), sel2 = SG.filter(x => x.cat === "sello"), hasP = new Set(rows.filter(r => r.topic === "character").map(r => r.ctry)), hasC = new Set(rows.filter(r => r.topic === "culture").map(r => r.ctry));
    const L = SG.filter(x => (!f.cat || x.cat === f.cat) && (!f.sub || x.sub === f.sub) && (!f.pais || x.pais === f.pais) && (!f.sg || (f.sg === "aviso" ? x.avisos.length : f.sg === "limpias" ? !x.avisos.length && x.seguridad === "alta" : f.sg === "pend" ? !N[SGKEY(x)] : x.seguridad === f.sg)) && (!f.w || (f.w === "m" ? x.mujer : !x.mujer)) && (!f.q || (x.es + x.en + x.pais).toLowerCase().includes(f.q.toLowerCase())));
    const limp = L.filter(x => !x.avisos.length && x.seguridad === "alta" && !N[SGKEY(x)]).length;
    return `<div class="pl"><h2>Para añadir <small>${SG.length} propuestas verificadas contra Wikidata · nada entra hasta que tú digas</small></h2><div class="kpis"><div class="kpi"><b>${per.length}</b><span>personajes</span></div><div class="kpi"><b>${sel2.length}</b><span>Sello del país</span></div><div class="kpi"><b>${new Set(per.map(x => x.pais).filter(c => !hasP.has(c))).size}</b><span>países ganan 1.er personaje</span></div><div class="kpi"><b>${new Set(sel2.map(x => x.pais).filter(c => !hasC.has(c))).size}</b><span>países ganan 1.er Sello</span></div><div class="kpi"><b>${per.filter(x => x.mujer).length}</b><span>mujeres entre los nuevos</span></div><div class="kpi"><b>${SG.filter(x => !N[SGKEY(x)]).length}</b><span>sin mirar</span></div></div>
      <div class="tools">${inp("sugerencias", "q", "buscar")}${sel("sugerencias", "cat", [["persona", "Personajes"], ["sello", "Sello del país"], ["ciudad", "Ciudades"], ["monumento", "Monumentos"], ["naturaleza", "Naturaleza"], ["historia", "Historia"]], "Todas las categorías")}${sel("sugerencias", "sub", [...new Set(SG.map(x => x.sub))].sort().map(x => [x, x]), "Todas las subcategorías")}${sel("sugerencias", "pais", [...new Set(SG.map(x => x.pais))].sort().map(x => [x, x]), "Todos los países")}${sel("sugerencias", "sg", [["pend", "Sin mirar"], ["limpias", "Limpias (seguridad alta, sin aviso)"], ["aviso", "Con aviso"], ["media", "Seguridad media"]], "Toda seguridad")}${sel("sugerencias", "w", [["m", "Solo mujeres"], ["h", "Solo hombres"]], "Hombres y mujeres")}<button class="chipb" data-act="clrf" data-v="sugerencias">Limpiar</button></div>
      <div class="row"><button class="btn" data-act="oklimpias">Bien a las ${limp} limpias de esta lista</button><button class="btn ghost" data-act="nolist">No a las ${L.filter(x => !N[SGKEY(x)]).length} sin mirar de esta lista</button></div></div>
      <div class="pl">${T("sug", [{ h: "Propuesta", f: x => `<span class="nm" data-open="${esc(SGKEY(x))}">${esc(x.es)}</span>`, v: x => x.es }, { h: "Tipo", f: x => (SGCATN[x.cat] || x.cat) + ` <span class="pill">${esc(x.sub)}</span>`, v: x => x.cat + x.sub }, { h: "País", f: x => esc(x.pais), v: x => x.pais }, { h: "Nació en", f: x => esc(x.nacWD || x.nac || "—") }, { h: "Idiomas", n: 1, f: x => x.idiomas, v: x => x.idiomas }, { h: "Línea", f: x => zbar(sugRow(x)), v: x => { const d = sugRow(x).dif2; return d == null ? 101 : d; } }, { h: "Por qué", w: 1, f: x => esc(x.por_que) }, { h: "Avisos", w: 1, f: x => x.avisos.map(a => `<span class="pill bad">${esc(a)}</span>`).join("") + (x.seguridad === "media" ? '<span class="pill warn">dudosa</span>' : "") }, { h: "Opinión", a: 1, f: x => vb(SGKEY(x)) }], L, { s: 4, d: -1, lim: 60 })}
      ${(A.SUG.sinCandidatos || []).length ? `<p class="note" style="margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:none" title="${esc(A.SUG.sinCandidatos.map(([c, n]) => c + (n ? " (" + n + ")" : "")).join("; "))}">Sin candidato válido según los documentalistas: ${A.SUG.sinCandidatos.length} países (pasa el ratón para verlos).</p>` : ""}</div>`;
  };

  /* ================= PARA QUITAR ================= */
  function remGroups() {
    reindex(); const irr = ff("quitar").irr || 88, g = {};
    const cc = countBy(rows.filter(r => r.ctry), r => r.ctry + "|" + r.topic), anc = r => cc[r.ctry + "|" + r.topic] === 1;
    const irrAll = rows.filter(r => r.dif2 != null && r.dif2 >= irr && !["country", "flag", "clue"].includes(r.topic));
    g.irrelevantes = { t: "Posibles irrelevantes", d: "Lo menos conocido del juego (índice ≥ " + irr + "). ¿Merece estar o es relleno? Las que son la ÚNICA de su país en esa categoría no salen aquí (ancla de país: " + irrAll.filter(anc).length + ").", rows: irrAll.filter(r => !anc(r)).sort((a, b) => b.dif2 - a.dif2) };
    g.marcas = { t: "Marcas comerciales", d: "Cambian de dueño: descartadas por criterio.", rows: rows.filter(r => r.tags.includes("marca")) };
    g.disputados = { t: "Origen disputado o compartido", d: "Hummus, pisco…: descartadas por criterio.", rows: rows.filter(r => r.tags.includes("origen disputado")) };
    g.pastas = { t: "Pastas repetidas", d: "Formatos casi intercambiables. Dejaría las 4 más famosas.", rows: rows.filter(r => r.tags.includes("pasta")).sort((a, b) => b.dif2 - a.dif2).slice(0, Math.max(0, rows.filter(r => r.tags.includes("pasta")).length - 4)) };
    const w = {}; rows.forEach(r => { if (r.topic !== "flag" && r.topic !== "clue" && r.topic !== "country") (w[r.wid] = w[r.wid] || []).push(r); });
    g.duplicados = { t: "Posibles duplicados", d: "Dos preguntas que apuntan a la misma ficha de la Enciclopedia.", rows: Object.values(w).filter(a => a.length > 1).flat() };
    g.eeuu = { t: "EE. UU. pesa demasiado", d: "Los 60 lugares de EE. UU. menos conocidos del banco clásico.", rows: rows.filter(r => r.ctry === "United States of America" && ["landmark", "city", "nature", "history"].includes(r.topic) && r.src === "banco").sort((a, b) => b.dif2 - a.dif2).slice(0, 60) };
    g.sinpais = { t: "Sin país asignado", d: "Hay que asignarles país (o quitarlas).", rows: rows.filter(r => !r.ctry) };
    g.nivel = { t: "Personajes con el nivel muy desencajado", d: "Su zona de hoy y la que dice su fama difieren en 2 niveles.", rows: rows.filter(r => r.topic === "character" && r.zone != null && Math.abs(r.zone - r.zoneHoy) === 2) };
    return g;
  }
  VIEWS.quitar = () => {
    const f = ff("quitar"), g = remGroups(), open = f.open || "irrelevantes";
    return `<div class="pl"><h2>Para quitar <small>reglas automáticas · tú decides · «No a todos» solo marca, no borra nada</small></h2><div class="kpis">${Object.entries(g).map(([k, x]) => `<div class="kpi go" data-act="grp" data-g="${k}" style="${k === open ? "outline:3px solid var(--gold)" : ""}"><b>${x.rows.length}</b><span>${x.t}</span></div>`).join("")}</div></div>
      <div class="pl"><h2>${g[open].t} <small>${g[open].d}</small></h2>${open === "irrelevantes" ? `<div class="sl">Mostrar lo menos conocido: índice desde <input type="range" data-sim="irr" min="70" max="99" value="${f.irr || 88}"> <b>${f.irr || 88}</b></div>` : ""}<div class="row"><button class="btn red" data-act="nogrp" data-g="${open}">No a las ${g[open].rows.filter(r => !N[r.key]).length} sin mirar</button><button class="btn ghost" data-act="okgrp" data-g="${open}">Bien (se quedan)</button></div>
      ${T("rem", [{ h: "Entrada", f: nmc, v: r => r.name }, { h: "Categoría", f: r => CATS[r.topic], v: r => r.topic }, { h: "País", f: r => esc(r.ctry || "—"), v: r => r.ctry }, { h: "Índice", f: zbar, v: r => r.dif2 }, { h: "Idiomas", n: 1, f: r => (SN[r.wid] || [])[0] ?? "—", v: r => (SN[r.wid] || [])[0] }, { h: "Visitas", n: 1, f: r => ((SN[r.wid] || [])[1] || 0).toLocaleString("es"), v: r => (SN[r.wid] || [])[1] }, { h: "Etiquetas", f: r => r.tags.map(t => `<span class="pill bad">${t}</span>`).join("") }, { h: "Opinión", a: 1, f: r => vb(r.key) }], g[open].rows, { lim: 50 })}</div>`;
  };


  /* ================= COLA DE DECISIONES ================= */
  /* Todo lo que pide una decision tuya en UNA sola cola: propuestas que podrian entrar y lo que podria salir (por grupos de reglas).
     Una tarjeta cada vez, teclas B / N / C / Espacio (saltar) / Z (deshacer) / I (ficha). Lo que no votes se queda como esta (= Bien). */
  const QSKIP = new Set(), QUNDO = [];
  const QSRC = [["entra", "Podría entrar"], ["sale", "Podría salir"]];
  function queueItems() {
    reindex(); const f = ff("cola"), out = [], seen = new Set(), g = remGroups();
    SG.filter(x => !N[SGKEY(x)]).sort((a, b) => (b.video ? 1e4 : 0) + b.idiomas - (a.video ? 1e4 : 0) - a.idiomas).forEach(x => { seen.add(SGKEY(x)); out.push({ key: SGKEY(x), src: "entra", why: (x.video ? "Del vídeo · " : "Propuesta nueva · ") + ((SGCATN[x.cat] || x.cat).toLowerCase()) }); });
    ["marcas", "disputados", "duplicados", "sinpais", "pastas", "nivel", "eeuu", "irrelevantes"].forEach(k => g[k].rows.forEach(r => { if (!N[r.key] && !seen.has(r.key)) { seen.add(r.key); out.push({ key: r.key, src: "sale", gk: k, why: g[k].t }); } }));
    const topicOf = x => (x.src === "entra" ? sugTopic(sgByKey[x.key]) : (byKey[x.key] || {}).topic), L = out.filter(x => (!f.src || x.src === f.src) && (!f.cat || topicOf(x) === f.cat)), a = L.filter(x => !QSKIP.has(x.key)), b = L.filter(x => QSKIP.has(x.key));
    return { all: out, list: a.concat(b), fresh: a.length, skipped: b.length };
  }
  function qCard(it) {
    const k = it.key;
    if (it.src === "entra") {
      const x = sgByKey[k], r = sugRow(x);
      return `<div class="qc"><span class="pill ${x.video ? "ok" : "warn"}">${esc(it.why)}</span><h1>${esc(x.es)}</h1><p class="note" style="margin:0">${esc(x.en)} · ${esc(x.pais)} · ${esc(x.sub)}${x.mujer ? " · mujer" : ""}</p>
      <div class="qm"><div><small>Dificultad estimada</small>${zbar(r)}</div><div><small>Idiomas de Wikipedia</small><b>${x.idiomas}</b></div><div><small>Seguridad</small><b>${esc(x.seguridad)}</b></div></div>
      ${x.avisos.length ? `<div>${x.avisos.map(a => `<span class="bdg bad">${esc(a)}</span>`).join("")}</div>` : ""}<div class="txt" style="max-height:none">${esc(x.por_que)}</div></div>`;
    }
    const r = byKey[k];
    return `<div class="qc"><span class="pill bad">${esc(it.why)}</span><h1>${esc(r.name)}</h1><p class="note" style="margin:0">${esc(CATS[r.topic] || r.topic)} · ${esc(r.ctry || "sin país")}</p>
      <div class="qm"><div><small>Índice (0 fácil · 100 difícil)</small>${zbar(r)}</div><div><small>Idiomas</small><b>${(SN[r.wid] || [])[0] ?? "—"}</b></div><div><small>Visitas</small><b>${((SN[r.wid] || [])[1] || 0).toLocaleString("es")}</b></div></div>
      ${r.tags.length ? `<div>${r.tags.map(t => `<span class="pill bad">${esc(t)}</span>`).join("")}</div>` : ""}<p class="note" style="margin:0">Bien = se queda en el juego · No = fuera.</p></div>`;
  }
  function qPreview() {
    const R = rows.filter(r => r.dif2 != null), after = R.filter(r => !(N[r.key] && N[r.key].v === "no")).concat(sgRows().filter(r => N[r.key] && N[r.key].v === "ok")),
      c = a => [0, 1, 2].map(z => a.filter(r => r.zone === z).length), c0 = c(R), c1 = c(after), un = userNotes(),
      nSugOk = SG.filter(x => N[SGKEY(x)] && N[SGKEY(x)].v === "ok").length, nOut = rows.filter(r => N[r.key] && N[r.key].v === "no").length, nCh = un.filter(k => N[k].v === "cambiar").length;
    return `<div class="pl"><h2>Si dijeras «aplica» ahora <small>solo es una vista previa: nada cambia hasta que me lo digas</small></h2>
      <div class="kpis"><div class="kpi"><b>+${nSugOk}</b><span>entran (propuestas con Bien)</span></div><div class="kpi"><b>−${nOut}</b><span>salen (preguntas con No)</span></div><div class="kpi"><b>${nCh}</b><span>con «Cambiar…» (te leo la nota)</span></div></div>
      <table><tr><th></th>${ZN.map((z, i) => `<th class="num" style="color:${ZC[i]}">${z}</th>`).join("")}<th class="num">Total</th></tr>
      <tr><td>Hoy</td>${c0.map(x => `<td class="num">${x}</td>`).join("")}<td class="num">${R.length}</td></tr>
      <tr><td>Después</td>${c1.map((x, i) => `<td class="num">${x}${x !== c0[i] ? ` <small style="color:${x > c0[i] ? "var(--z0)" : "#ff9aa4"}">${x > c0[i] ? "+" : ""}${x - c0[i]}</small>` : ""}</td>`).join("")}<td class="num">${after.length}</td></tr></table>
      <div class="row"><button class="btn" data-act="copynotes">Copiar el parte para Claude</button><button class="btn ghost" data-go="margenes">Ver márgenes por nivel</button></div></div>`;
  }
  VIEWS.cola = () => {
    const f = ff("cola"), Q = queueItems(), it = Q.list[0], nE = Q.all.filter(x => x.src === "entra").length, nS = Q.all.length - nE, done = userNotes().length;
    const chips = `<div class="row">${sel("cola", "cat", TOPICS.map(t => [t, CATS[t]]), "Todas las categorías")}<button class="chipb ${f.src ? "" : "on"}" data-act="qsrc" data-s="">Todo · ${Q.all.length}</button>${QSRC.map(([id, l]) => `<button class="chipb ${f.src === id ? "on" : ""}" data-act="qsrc" data-s="${id}">${l} · ${id === "entra" ? nE : nS}</button>`).join("")}</div>`;
    const main = it ? `<div class="pl"><h2>Ahora te toca <small>quedan ${Q.list.length}${Q.skipped ? " · " + Q.skipped + " saltadas al final" : ""} · ${done} opiniones guardadas</small></h2>${chips}
        ${qCard(it)}
        <div class="row"><button class="btn" data-act="qv" data-v="ok">Bien <kbd>B</kbd></button><button class="btn red" data-act="qv" data-v="no">No <kbd>N</kbd></button><button class="btn ghost" data-act="qv" data-v="cambiar">Cambiar… <kbd>C</kbd></button><button class="btn ghost" data-act="qskip">Saltar <kbd>␣</kbd></button><button class="btn ghost" data-act="qundo" ${QUNDO.length ? "" : "disabled"}>Deshacer <kbd>Z</kbd></button><button class="btn ghost" data-open="${esc(it.key)}">Ficha completa <kbd>I</kbd></button></div>
        <div class="row"><button class="chipb" data-act="qall" data-s="${f.src || ""}">Todo lo que queda ${f.src ? "de «" + QSRC.find(x => x[0] === f.src)[1] + "»" : ""} = Bien (${Q.list.length})</button></div></div>`
      : `<div class="pl"><h2>Ahora te toca</h2><p class="none" style="font-size:28px">¡Cola vacía! No queda nada que decidir${f.src ? " en este grupo" : ""}.</p>${chips}</div>`;
    return `<div class="hero"><h1>Cola de decisiones</h1><p>Todo lo que me pide una decisión, de uno en uno y sin buscar nada. <b>Lo que no votes se queda como está</b> (cuenta como Bien). Teclas: <kbd>B</kbd> bien · <kbd>N</kbd> no · <kbd>C</kbd> nota · <kbd>␣</kbd> saltar · <kbd>Z</kbd> deshacer · <kbd>I</kbd> ficha.</p></div>${main}${qPreview()}`;
  };
  function qVote(v) {
    const it = queueItems().list[0]; if (!it) return;
    if (v === "cambiar") return ask("Qué quieres que cambie", nameOfKey(it.key), "", t => { QUNDO.push({ key: it.key, prev: N[it.key] }); N[it.key] = { v: "cambiar", nota: t, t: Date.now() }; saveN(); draw(); }, true);
    QUNDO.push({ key: it.key, prev: N[it.key] }); N[it.key] = { v, nota: it.src === "sale" && v === "no" ? "cola: " + it.why : "", t: Date.now() }; saveN(); toast(v === "ok" ? "Bien ✓" : "No ✕"); draw();
  }
  function qUndo() { const u = QUNDO.pop(); if (!u) return; if (u.prev) N[u.key] = u.prev; else delete N[u.key]; QSKIP.delete(u.key); saveN(); toast("Deshecho"); draw(); }
  function qSkip() { const it = queueItems().list[0]; if (it) { QSKIP.add(it.key); draw(); } }
  function qAll(src) { const L = queueItems().list.filter(x => !src || x.src === src); if (!L.length) return; L.forEach(x => { QUNDO.push({ key: x.key, prev: N[x.key] }); N[x.key] = { v: "ok", nota: "", t: Date.now() }; }); saveN(); toast(L.length + " marcadas como Bien"); draw(); }


  /* ================= CATEGORIAS (el panel de trabajo, una categoria cada vez) ================= */
  const SGCATN = { capital: "Capital", persona: "Personaje", sello: "Sello del país", ciudad: "Ciudad", monumento: "Monumento", naturaleza: "Naturaleza", historia: "Historia" };
  const TOPICS = ["character", "capital", "city", "landmark", "nature", "history", "country", "flag", "clue", "culture"];
  const TOPIC_HELP = {
    character: "Personas famosas de toda la historia: una por país como mínimo y las más conocidas del mundo.",
    capital: "Capitales: una por país. Solo se revisa que estén todas.",
    city: "Ciudades que se preguntan en el mapa.",
    landmark: "Monumentos y lugares famosos.",
    nature: "Ríos, montañas, islas, mares y parques naturales.",
    history: "Batallas, tratados y sucesos con lugar.",
    country: "Países: ya están todos metidos.",
    flag: "Banderas: una por país, ya están todas.",
    clue: "Pistas (preguntas de «¿qué país es?»).",
    culture: "Sello del país: plato, bebida, fiesta, música, deporte, planta y animal."
  };
  const catDone = () => { try { return JSON.parse((N["cfg:cats"] || {}).nota || "{}"); } catch (e) { return {}; } };
  const sgTopicOf = x => sugTopic(x);
  function catStats(t) {
    const R = rows.filter(r => r.topic === t), S = SG.filter(x => sgTopicOf(x) === t), pend = S.filter(x => !N[SGKEY(x)]),
      sale = Object.values(remGroups()).flatMap(g => g.rows).filter(r => r.topic === t && !N[r.key]), uniq = new Set(sale.map(r => r.key)),
      has = new Set(); R.forEach(r => { if (r.ctry) has.add(r.ctry); (r.ctrys || []).forEach(c => has.add(c)); });
    const without = COUNTRIES.filter(c => !has.has(c)), withSug = new Set(pend.map(x => x.pais)), cover = without.filter(c => withSug.has(c));
    return { R, S, pend, nSale: uniq.size, without, cover, video: pend.filter(x => x.video).length, sinPais: S.filter(x => x.pais === "—").length, ok: S.filter(x => N[SGKEY(x)] && N[SGKEY(x)].v === "ok").length, no: S.filter(x => N[SGKEY(x)] && N[SGKEY(x)].v === "no").length };
  }
  VIEWS.categorias = () => {
    reindex(); const D = catDone(), done = TOPICS.filter(t => D[t]).length;
    const card = t => {
      const s = catStats(t), n = s.pend.length + s.nSale, listo = n === 0 && !D[t], st = D[t] ? "Hecha" : listo ? "Sin nada pendiente" : n < s.R.length + s.S.length && (s.ok + s.no) ? "En curso" : "Por empezar", col = D[t] ? "var(--z0)" : listo ? "var(--gold)" : "var(--sub)";
      const hints = [];
      if (s.without.length && !["country", "flag", "clue"].includes(t)) hints.push(`<b>${s.without.length}</b> países sin ninguna entrada${s.cover.length ? `, <b>${s.cover.length}</b> de ellos con propuesta` : ""}: ${esc(s.without.slice(0, 6).join(", "))}${s.without.length > 6 ? "…" : ""}`);
      if (s.video) hints.push(`<b>${s.video}</b> propuestas elegidas en el vídeo (salen primero)`);
      if (s.sinPais) hints.push(`<b>${s.sinPais}</b> propuestas sin país asignado`);
      if (["country", "flag", "clue", "capital"].includes(t) && !s.without.length) hints.push("Todos los países cubiertos: nada que añadir");
      return `<div class="task" style="grid-template-columns:minmax(0,1fr) auto;align-items:start"><div><b>${esc(CATS[t])} <span class="pill" style="color:${col};margin-left:8px">${st}</span></b>
        <span style="display:block">${esc(TOPIC_HELP[t])}</span>
        <span style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:6px"><span class="bdg">${s.R.length} en el juego</span><span class="bdg gold">${s.pend.length} por añadir</span><span class="bdg ${s.nSale ? "bad" : ""}">${s.nSale} por quitar</span>${zstack(s.R)}</span>
        ${hints.length ? `<span style="display:block;margin-top:4px;color:var(--sub)">${hints.join(" · ")}</span>` : ""}</div>
        <div class="col" style="gap:6px"><button class="btn" data-act="catwork" data-t="${t}" ${n ? "" : "disabled"}>Trabajar (${n})</button><button class="btn ghost" data-act="catdone" data-t="${t}">${D[t] ? "Reabrir" : "Marcar hecha"}</button></div></div>`;
    };
    return `<div class="hero"><h1>Categorías</h1><p>Una categoría cada vez. Pulsa <b>Trabajar</b> y te llevo a la cola con solo lo de esa categoría; cuando termines, <b>Marcar hecha</b>. Llevas <b>${done}</b> de ${TOPICS.length}. Lo que no votes se queda como está.</p></div>
      <div class="pl"><div class="bars" style="gap:10px">${TOPICS.map(card).join("")}</div></div>`;
  };

  /* ================= RESULTADO POR CATEGORIAS (la revision completa, de menos a mas dificultad) ================= */
  const ZCEN = [17, 50, 83], ZNAME = ["Fácil", "Medio", "Difícil"];
  const chgOn = k => !!N["chg:" + k];
  const zbtns = (key, d) => { const z = d == null ? -1 : zoneOf(d), e = esc(key); return `<span class="zb">${[0, 1, 2].map(i => `<button class="z${i} ${z === i ? "on" : ""}" data-act="setzone" data-k="${e}" data-z="${i}" data-d="${d == null ? "" : d}" title="${ZNAME[i]}">${["F", "M", "D"][i]}</button>`).join("")}<button class="chg ${chgOn(key) ? "on" : ""}" data-act="chg" data-k="${e}" title="Pedir otro en su lugar">↻ Cambiar</button></span>`; };
  function setZone(key, z, d) { if (d !== "" && d != null && zoneOf(+d) === z) return; OV[key] = ZCEN[z]; saveOv(); DIRTY = true; draw(); toast(ZNAME[z] + " (" + ZCEN[z] + ")"); }
  function toggleChg(key) { const k = "chg:" + key; if (N[k]) { delete N[k]; toast("Quitada la petición de cambio"); } else { N[k] = { v: "cambiar", nota: "pedir cambiar", t: Date.now() }; toast("Pedido: lo cambio por otro"); } saveN(); draw(); }
  const RESCATS = ["character", "capital", "city", "landmark", "nature", "history", "culture"];
  const bin10 = d => Math.min(9, Math.max(0, Math.floor((d - 1) / 10)));
  const efectivo = (key, def) => { const n = N[key]; return n && (n.v === "ok" || n.v === "no") ? n.v : def; };
  function resRows(t) {
    const R = A.RES && A.RES.cats[t]; if (!R) return [];
    const out = rows.filter(r => r.topic === t && r.dif2 != null).map(r => ({ key: r.key, name: r.name, ctry: r.ctry || "—", d: Math.round(r.dif2), estado: "queda", m: "" }));
    const idx = {}; out.forEach(o => (idx[o.key] = o));
    R.salen.forEach(s => { const o = idx[s.id]; if (o) { o.estado = "sale"; o.m = s.m + (s.por ? " → entra " + s.por : ""); } });
    R.entran.forEach(e => { const k = "sug:" + e.id; out.push({ key: k, name: e.es, ctry: e.pais || "—", d: Math.round(OV[k] != null ? OV[k] : e.d), estado: "entra", m: e.m, now: e.a, mujer: e.f }); });
    return out;
  }
  VIEWS.resultado = () => {
    reindex(); const f = ff("resultado"), t = f.t || "character", R = A.RES && A.RES.cats[t];
    if (!R) return '<div class="hero"><h1>Resultado por categorías</h1><p>No hay resultado cargado.</p></div>';
    if (t === "capital") { const base = rows.filter(r => r.topic === "capital" && r.dif2 != null); R.antes = Array(10).fill(0); base.forEach(r => R.antes[bin10(r.dif2)]++); R.despues = R.antes.slice(); R.entran.forEach(e => R.despues[bin10(e.d)]++); }
    const D = catDone(), all = resRows(t), nIn = R.entran.length, nOut = R.salen.length, mx = Math.max(...R.antes, ...R.despues, 1);
    const tr = f.tr == null || f.tr === "" ? null : +f.tr, L = all.filter(o => (!f.es || o.estado === f.es) && (tr == null || bin10(o.d) === tr) && (!f.q || (o.name + o.ctry).toLowerCase().includes(f.q.toLowerCase())));
    const chips = RESCATS.map(c => `<button class="chipb ${c === t ? "on" : ""}" data-act="restab" data-t="${c}">${esc(CATS[c])}${D["res:" + c] ? " ✓" : ""}</button>`).join("");
    const bars = R.antes.map((n, i) => { const m = R.despues[i], lo = i * 10 + 1, hi = (i + 1) * 10; return `<div class="rb ${tr === i ? "on" : ""}" data-act="restr" data-i="${i}" title="Dificultad ${lo}–${hi}: ${n} antes · ${m} después"><span class="rbv"><i style="height:${Math.round(60 * n / mx)}px;background:#6a5f8f"></i><i style="height:${Math.round(60 * m / mx)}px;background:${m < 15 ? "#ff6b78" : m < 40 ? "#ffd24a" : "#5ee07a"}"></i></span><b>${lo}–${hi}</b><small>${n} → ${m}</small></div>`; }).join("");
    const mujer = R.entran.filter(e => e.f).length, ahora = R.entran.filter(e => e.a).length;
    const est = { queda: '<span class="bdg">se queda</span>', entra: '<span class="bdg ok">ENTRA</span>', sale: '<span class="bdg bad">SALE</span>' };
    return `<div class="hero"><h1>Resultado por categorías</h1><p>La revisión completa está hecha: en cada categoría <b>entran y salen las mismas fichas</b> (el total no cambia), de menos a más dificultad (1–100). Pesa la <b>importancia</b> (qué es esencial para enseñar) y el <b>reconocimiento</b> (qué es divertido y se conoce, incluidas figuras actuales). Tú solo miras; lo que no toques se aplica tal cual.</p></div>
      <div class="pl"><h2>Categoría <small>pincha una para verla</small></h2><div class="row">${chips}</div>
      <div class="kpis"><div class="kpi"><b>+${nIn}</b><span>entran</span></div><div class="kpi"><b>−${nOut}</b><span>salen</span></div><div class="kpi"><b>${R.n - nOut}</b><span>se quedan</span></div><div class="kpi"><b>${R.n} → ${R.n + nIn - nOut}</b><span>total antes y después${nIn !== nOut ? " · se compensa con otra categoría" : ""}${R.sinSustituto ? " (" + R.sinSustituto + " salidas por regla sin sustituto)" : ""}</span></div>${t === "character" ? `<div class="kpi"><b>${ahora}</b><span>figuras actuales entre las nuevas · ${mujer} mujeres</span></div>` : ""}</div></div>
      <div class="pl"><h2>Dificultad de 1 a 100 <small>gris = antes · color = después (rojo: menos de 15 · ámbar: 15-39 · verde: 40 o más) · pincha un tramo para filtrar</small></h2><div class="rbars">${bars}</div></div>
      <div class="pl"><h2>${esc(CATS[t])} de menos a más difícil <small>${L.length} de ${all.length}</small></h2>
      <div class="tools">${inp("resultado", "q", "buscar")}${sel("resultado", "es", [["entra", "Solo lo que entra"], ["sale", "Solo lo que sale"], ["queda", "Solo lo que se queda"]], "Todo")}<button class="chipb" data-act="clrres">Limpiar</button><button class="btn" data-act="resok" data-t="${t}">Dar por buena esta categoría</button></div>
      ${T("res", [{ h: "Dificultad", f: o => `<span class="bar3" style="width:90px;display:inline-flex;height:12px;vertical-align:middle"><i style="width:${o.d}%;background:${ZC[zoneOf(o.d)]}"></i></span> <b style="font-weight:400">${o.d}</b>`, v: o => o.d }, { h: "Nombre", f: o => (o.estado === "queda" ? nmc({ key: o.key, name: o.name }) : `<span class="nm" data-open="${esc(o.key)}">${esc(o.name)}</span>`) + (o.now ? ' <span class="pill ok">actual</span>' : ""), v: o => o.name }, { h: "País", f: o => esc(o.ctry), v: o => o.ctry }, { h: "Qué pasa", f: o => (est[efectivo(o.key, o.estado === "entra" ? "ok" : o.estado === "sale" ? "no" : null) === "ok" && o.estado === "sale" ? "queda" : efectivo(o.key, null) === "no" && o.estado === "entra" ? "queda" : o.estado]) , v: o => o.estado }, { h: "Por qué", w: 1, f: o => esc(o.m), v: o => o.m }, { h: "Dificultad y cambios", a: 1, f: o => zbtns(o.key, o.d) }], L, { s: 0, d: 1, per: 16 })}</div>`;
  };
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-act]"); if (!t) return; const a = t.dataset.act, d = t.dataset;
    if (a === "setzone") setZone(d.k, +d.z, d.d);
    else if (a === "chg") toggleChg(d.k);
    else if (a === "restab") { ff("resultado").t = d.t; ff("resultado").tr = null; if (ST.res) ST.res.page = 0; draw(); }
    else if (a === "restr") { const f = ff("resultado"); f.tr = f.tr == d.i ? null : +d.i; if (ST.res) ST.res.page = 0; draw(); }
    else if (a === "clrres") { const t0 = ff("resultado").t; F.resultado = { t: t0 }; draw(); }
    else if (a === "resok") { const R = A.RES.cats[d.t]; let n = 0; R.entran.forEach(x => { const k = "sug:" + x.id; if (!N[k] && !chgOn(k)) { N[k] = { v: "ok", nota: "revisión completa", t: Date.now() }; n++; } }); R.salen.forEach(x => { if (!N[x.id] && !chgOn(x.id)) { N[x.id] = { v: "no", nota: "revisión completa: " + x.m, t: Date.now() }; n++; } }); const D = catDone(); D["res:" + d.t] = Date.now(); N["cfg:cats"] = { v: "cfg", nota: JSON.stringify(D), t: Date.now() }; saveN(); toast("Categoría dada por buena (" + n + " decisiones guardadas)"); draw(); }
  });
  /* ================= NOTAS ================= */
  VIEWS.notas = () => {
    const ks = userNotes().sort((a, b) => N[b].t - N[a].t), f = ff("notas"), L = ks.filter(k => !f.v || N[k].v === f.v).map(k => ({ key: k, name: nameOfKey(k), v: N[k].v, nota: N[k].nota, t: N[k].t })), c = countBy(ks, k => N[k].v);
    return `<div class="pl"><h2>Mis notas <small>${ks.length} · Bien ${c.ok || 0} · No ${c.no || 0} · Cambiar ${c.cambiar || 0}</small></h2><p class="note" style="margin:0">${SERVER ? "Conectado: yo leo estas notas directamente desde mesa/notas-contenido.json." : "Sin servidor local: usa «Copiar para Claude» y pégamelas."}</p>
      <div class="tools">${sel("notas", "v", [["ok", "Bien"], ["no", "No"], ["cambiar", "Cambiar"]], "Todas")}<button class="btn" data-act="copynotes">Copiar para Claude</button><button class="chipb red" data-act="clearnotes">Vaciar todo</button></div>
      ${ks.length ? T("not", [{ h: "Cosa", f: x => `<span class="nm" data-open="${esc(x.key)}">${esc(x.name)}</span>`, v: x => x.name }, { h: "Veredicto", f: x => ({ ok: '<span class="bdg ok">Bien</span>', no: '<span class="bdg bad">No</span>', cambiar: '<span class="bdg gold">Cambiar</span>' }[x.v] || x.v), v: x => x.v }, { h: "Nota", w: 1, f: x => esc(x.nota) }, { h: "", a: 1, f: x => vb(x.key) }], L, { lim: 80 }) : '<p class="none">Aún no has opinado de nada. Pulsa Bien, No o Cambiar… en cualquier lista.</p>'}</div>`;
  };

  /* ================= COMO FUNCIONA ================= */
  VIEWS.como = () => {
    reindex(); const cats = Object.keys(CATS), T1 = 33, T2 = 66;
    const rng = cats.map(t => { const L = rows.filter(r => r.topic === t); return { t, n: L.length, rg: [0, 1, 2].map(k => { const a = L.filter(r => r.saco === k).map(r => r.d); return a.length ? [Math.round(Math.min(...a)), Math.round(Math.max(...a)), a.length] : null; }) }; });
    return `<div class="pl"><h2>Cómo funciona la dificultad hoy <small>léelo una vez</small></h2><div class="bars" style="gap:6px;font-size:22px">
      <div class="task"><span class="num">1</span><div><b>Cada pregunta tiene una dificultad de 0 a 100</b><span>0 = la sabe cualquiera. Hoy la ponía un panel de 3 jueces IA (QDIFF); en personajes y cultura, el banco del Duelo.</span></div><span></span></div>
      <div class="task"><span class="num">2</span><div><b>Nivel 1-10 = la decena dentro de su categoría</b><span>Es lo que usa la Aventura para repartir las 12 rondas por tema.</span></div><span></span></div>
      <div class="task"><span class="num">3</span><div><b>Bronce, Plata y Oro del Duelo son terciles RELATIVOS</b><span>El tercio más fácil de CADA categoría es Bronce. No hay corte fijo: mira la tabla de abajo.</span></div><span></span></div>
      <div class="task"><span class="num">4</span><div><b>En la Aventura: 3 fáciles + 1 media + 1 difícil por ronda</b><span>Centradas en una dificultad que sube con la ronda y la Ascensión. Pruébalo en el «Simulador de rondas».</span></div><span></span></div>
      <div class="task"><span class="num">5</span><div><b>Lo que propongo: UN índice de fama y dos cortes globales</b><span>Así «Difícil» significa lo mismo en todo el juego. Es la pestaña «Balanceo».</span></div><span></span></div></div></div>
      <div class="pl"><h2>Los rangos de hoy por categoría <small>dificultad mínima–máxima de cada liga</small></h2>${T("como", [{ h: "Categoría", f: x => CATS[x.t] }, { h: "Preguntas", n: 1, f: x => x.n }, { h: "Bronce", f: x => (x.rg[0] ? x.rg[0][0] + "–" + x.rg[0][1] : "—") }, { h: "Plata", f: x => (x.rg[1] ? x.rg[1][0] + "–" + x.rg[1][1] : "—") }, { h: "Oro", f: x => (x.rg[2] ? x.rg[2][0] + "–" + x.rg[2][1] : "—") }], rng, { nav: false, lim: 20 })}<p class="note">Los rangos se solapan muchísimo: en Capitales, Bronce llega a 45 y Oro empieza en 12. «Oro» no significa lo mismo en todas las categorías.</p></div>
      <div class="pl"><h2>Otras cosas que he encontrado <small>por si no las sabías</small></h2><div class="bars" style="gap:6px;font-size:22px"><div>• <b>data/carretes.js ya no se usa</b>: adventure.js tiene <code>fixed = false</code> y reparte las rondas solo, por tema y nivel.</div><div>• Hay cuatro escalas de dificultad que no concuerdan entre sí (QDIFF, QLEVEL, <code>PLACES[7]</code>, ligas del Duelo).</div><div>• Las capitales de nivel 9-10 se mandan a la ronda índice 4 (Historia en <code>ROUND_THEME</code>), pero el comentario dice «Ciudades»: conviene mirarlo.</div><div>• Los extras del Duelo de monumentos y ciudades no traen país: de ahí las ${rows.filter(r => !r.ctry).length} sin país.</div></div></div>`;
  };

  /* ================= FICHA (panel lateral) ================= */
  const TXT = {}, LGN = { es: "Español", en: "English", fr: "Français", pt: "Português", de: "Deutsch", it: "Italiano", zh: "中文", ko: "한국어", ja: "日本語", ru: "Русский", pl: "Polski" };
  const loadLang = lg => (TXT[lg] ? Promise.resolve(TXT[lg]) : fetch("../data/wiki/" + lg + ".json").then(r => r.json()).then(j => (TXT[lg] = j)));
  const loadShort = lg => (TXT["s" + lg] ? Promise.resolve(TXT["s" + lg]) : fetch("../data/wiki/" + lg + "-s.json").then(r => r.json()).then(j => (TXT["s" + lg] = j)).catch(() => ({})));
  const dr = () => $("#drawer"); let DKEY = null;
  function closeDrawer() { dr().style.display = "none"; $("#shade").style.display = "none"; DKEY = null; REP = null; if (DIRTY) { DIRTY = false; draw(); } }
  function refreshDrawerVotes() { const e = $("#dvotes"); if (e && DKEY) e.innerHTML = vb(DKEY); }
  function head(key) { const i = CURLIST.indexOf(key); return `<div class="dh"><button class="chipb" data-act="prev">← Anterior</button><button class="chipb" data-act="next">Siguiente →</button><span class="pos">${REP ? "Repaso · quedan " + repLeft() + " sin mirar" : i >= 0 ? i + 1 + " de " + CURLIST.length : ""}</span><span class="sp"></span><button class="chipb" data-act="closed">Cerrar ✕</button></div>`; }
  /* las tres fotos de la ficha (portada, Historia, Dato clave) tal cual las ve el jugador; si falta una, un hueco rojo */
  /* caja de dificultad de la ficha: un numero unico 0-100, deslizador, +-1/+-5 y quitar el ajuste (lo puesto a mano manda sobre el calculado) */
  let DIRTY = false, DID = null;
  const effOfKey = (key, id) => { if (OV[key] != null) return OV[key]; const rw = byKey[key]; if (rw && rw.base !== undefined) return rw.base; const fm = key.startsWith("sug:") ? famaArr(SUGSIG[key.slice(4)]) : famaOf(id); return fm == null ? null : 100 - fm; };
  function difHtml(key, id) { DID = id; const v = effOfKey(key, id), z = v == null ? null : zoneOf(v), e = esc(key), col = z == null ? "var(--sub)" : ZC[z];
    return `<div class="dbx"><b class="dnum" style="color:${col}">${v == null ? "—" : Math.round(v)}</b><span class="dgrp" style="color:${col}">${z == null ? "sin número" : ZN[z]}</span>${OV[key] != null ? '<span class="pill">a mano</span>' : '<span class="pill warn">calculado</span>'}</div>${byKey[key] ? `<p class="note" style="margin:2px 0">Referencias: jueces del juego <b>${byKey[key].d == null ? "—" : Math.round(byKey[key].d)}</b> · fama en Wikipedia <b>${byKey[key].wiki == null ? "—" : Math.round(byKey[key].wiki)}</b></p>` : ""}
      <input type="range" class="dsl" min="0" max="100" value="${v == null ? 50 : Math.round(v)}" data-dr="${e}" style="width:100%"><div class="scale"><span>0 · la sabe cualquiera</span><span>corte ${CFG.t[0]}</span><span>corte ${CFG.t[1]}</span><span>100 · casi nadie</span></div>
      <div class="row">${[-5, -1, 1, 5].map(d => `<button class="chipb" data-act="dnudge" data-d="${d}" data-k="${e}">${d > 0 ? "+" + d : d}</button>`).join("")}${OV[key] != null ? `<button class="chipb red" data-act="dreset" data-k="${e}">Quitar mi número</button>` : ""}</div>`; }
  function setDif(key, v) { if (v == null) delete OV[key]; else OV[key] = Math.max(0, Math.min(100, Math.round(v))); saveOv(); DIRTY = true; const b = $("#dbox"); if (b) b.innerHTML = difHtml(key, DID); }

  const photos = (id, IM) => `<div class="tri">${[["", "_", "Portada"], ["~h", "_h", "Historia"], ["~k", "_k", "Dato clave"]].map(([k, f, l]) => IM[id + k] ? `<figure><img src="../assets/wiki/card/${esc(String(id).replace(/[^A-Za-z0-9._-]/g, "_"))}${f === "_" ? "" : f}.webp" alt="${l}" onerror="this.parentNode.classList.add('miss');this.remove()"><figcaption>${l}</figcaption></figure>` : `<figure class="miss"><figcaption>${l} · falta</figcaption></figure>`).join("")}</div>`;
  function open(key, lang) {
    DKEY = key; dr().style.display = "block"; $("#shade").style.display = "block"; reindex();
    if (key.startsWith("sug:")) return openSug(key);
    if (key.startsWith("pais:")) return openPais(key.slice(5));
    const r = byKey[key], id = key.startsWith("enc:") ? key.slice(4) : r.wid, lg = lang || "es", rr = r || byWid[id];
    dr().innerHTML = head(key) + '<p class="note">Cargando…</p>';
    Promise.all([loadLang(lg), loadShort(lg), IMGD ? Promise.resolve(IMGD) : fetch("../data/wiki/img.json").then(x => x.json()).then(j => (IMGD = j))]).then(([W, S, IM]) => {
      if (DKEY !== key) return; const w = W[id] || [], a = SN[id] || [], c = LC[id], hand = rr ? isHand(rr) : CUR.has(id), fama = famaOf(id), dif = fama == null ? null : 100 - fama, z = dif == null ? null : zoneOf(dif);
      const ph = k => IM[id + k] ? `<span class="bdg ok">${k ? (k === "~h" ? "Historia" : "Dato clave") : "Portada"}</span>` : `<span class="bdg bad">${k ? (k === "~h" ? "Historia" : "Dato clave") : "Portada"} · falta</span>`;
      const credit = ["", "~h", "~k"].map(k => (IM[id + k] ? esc((IM[id + k][3] || []).slice(0, 2).join(" · ")) : "")).filter(Boolean);
      dr().innerHTML = head(key) + `<h1>${esc(w[0] || (rr && rr.name) || id)}</h1><p class="note" style="margin:0">${esc(w[1] || "")}</p>
        <div style="margin-top:10px">${rr ? `<span class="bdg">${CATS[rr.topic]}</span><span class="bdg">${esc(rr.ctry || "sin país")}</span>` : ""}${hand ? '<span class="bdg gold">curado a mano</span>' : '<span class="bdg">automático · Wikipedia/Wikidata</span>'}${c ? (langOk(id) >= 11 ? '<span class="bdg ok">texto en los 11 idiomas</span>' : `<span class="bdg bad">texto en ${langOk(id)}/11 idiomas</span>`) : ""}${c && c.b ? '<span class="bdg bad">restos de Wikipedia</span>' : ""}${(rr && rr.tags || []).map(t => `<span class="bdg bad">${t}</span>`).join("")}</div>
        <h3>Dificultad en la línea</h3><div id="dbox">${difHtml(rr ? rr.key : key, id)}</div>
        <table style="margin-top:8px">${SIG.map(([k, l], i) => { const sc = scoreOf(k, a[i]); return `<tr><td>${l}</td><td class="num">${a[i] == null ? "—" : a[i].toLocaleString("es")}</td><td style="width:38%"><span class="bar3" style="height:12px"><i style="width:${sc || 0}%;background:var(--blue)"></i></span></td><td class="num">${sc == null ? "" : Math.round(sc)}</td></tr>`; }).join("")}</table>
        <h3>Las tres entradas · fotos</h3><div>${ph("")}${ph("~h")}${ph("~k")}</div>${photos(id, IM)}${credit.length ? `<p class="note">${credit.join("<br>")}</p>` : ""}
        <h3>Texto de Wikipedia · idioma (rojo = vacío, dorado = restos)</h3><div class="langs">${LANGS.map((l, i) => `<button class="lg ${l === lg ? "on" : ""} ${c && c.l[i] === 0 ? "no" : ""} ${c && c.b & (1 << i) ? "bd" : ""}" data-lang="${l}" title="${c ? c.l[i] * 10 + " caracteres" : ""}">${LGN[l] || l}${c ? " · " + c.l[i] * 10 : ""}</button>`).join("")}</div>
        <h3>Resumen corto (el de la tarjeta)</h3><div class="txt" style="max-height:none">${esc(S[id] || "— no tiene —")}</div><h3>Texto completo</h3><div class="txt">${esc(w[2] || "— sin texto en este idioma —")}</div>
        <h3>Tu opinión</h3><div id="dvotes">${vb(key)}</div><p class="note">Con «Cambiar…» puedes pedirme p. ej. «ponla en Difícil» o «cambia la foto de Historia».</p>`;
    });
  }
  /* ¿ya existe su ficha? si no, lo dice claro: nada escrito y ninguna de las 3 fotos hasta que la apruebes y yo la cree */
  function sugEntry(x) { const id = x.id, c = LC[id], has = !!(c || (IMGD && IMGD[id]));
    if (!has) return `<div class="tri"><figure class="miss"><figcaption>Portada · sin foto</figcaption></figure><figure class="miss"><figcaption>Historia · sin foto</figcaption></figure><figure class="miss"><figcaption>Dato clave · sin foto</figcaption></figure></div><p class="note"><span class="bdg bad">sin escribir</span> Todavía no existe su ficha: ni texto en los 12 idiomas ni las 3 fotos. Se crean cuando la apruebes con «Bien» y me digas «aplica».</p>`;
    return `<p class="note">${c ? (langOk(id) >= 11 ? '<span class="bdg ok">escrita en los 11 idiomas</span>' : `<span class="bdg bad">escrita en ${langOk(id)}/11 idiomas</span>`) : '<span class="bdg bad">sin texto</span>'}</p>${IMGD ? photos(id, IMGD) : ""}`; }
  function openSug(key) { const x = sgByKey[key]; dr().innerHTML = head(key) + `<h1>${esc(x.es)}</h1><p class="note" style="margin:0">${esc(x.en)} · propuesta nueva</p>
    <div style="margin-top:10px"><span class="bdg gold">${SGCATN[x.cat] || x.cat}</span><span class="bdg">${esc(x.sub)}</span><span class="bdg">${esc(x.pais)}</span>${x.mujer ? '<span class="bdg">mujer</span>' : ""}<span class="bdg ${x.seguridad === "alta" ? "ok" : "bad"}">seguridad ${x.seguridad}</span>${x.avisos.map(a => `<span class="bdg bad">${esc(a)}</span>`).join("")}</div>
    <h3>Su entrada en la Enciclopedia</h3>${sugEntry(x)}<h3>Por qué entra</h3><div class="txt" style="max-height:none">${esc(x.por_que)}</div><h3>Dificultad en la línea</h3><div id="dbox">${difHtml(key, null)}</div><h3>Datos verificados en Wikidata</h3><table><tr><td>Idiomas de Wikipedia</td><td class="num">${x.idiomas}</td></tr>${x.cat === "persona" ? `<tr><td>Nació en</td><td class="num">${esc(x.nacWD || x.nac || "—")}</td></tr><tr><td>Años</td><td class="num">${x.nacio || "?"} – ${x.murio || "vivo"}</td></tr>` : ""}</table>
    <p><a href="https://en.wikipedia.org/wiki/${encodeURIComponent(x.wiki.replace(/ /g, "_"))}" target="_blank" rel="noopener">Abrir en Wikipedia ↗</a></p><h3>Tu opinión</h3><div id="dvotes">${vb(key)}</div>`; }
  function openPais(c) { const R = rows.filter(r => r.ctry === c || (r.ctrys || []).includes(c)), g = countBy(R, r => r.topic), S2 = SG.filter(x => x.pais === c), fl = falta(c);
    dr().innerHTML = head("pais:" + c) + `<h1>${esc(c)}</h1><p class="note" style="margin:0">${R.length} preguntas · ${pct(R.length, rows.filter(r => r.ctry).length)} del banco · ${S2.length} propuestas</p>
    <div style="margin-top:10px">${fl.length ? fl.map(x => `<span class="bdg bad">${x}</span>`).join("") : '<span class="bdg ok">bien cubierto</span>'}</div>
    <h3>Qué tiene</h3><div class="bars">${Object.keys(CATS).filter(t => g[t]).map(t => { const a = R.filter(r => r.topic === t); return `<div class="br" style="grid-template-columns:150px minmax(0,1fr) 90px"><span class="l">${CATS[t]}</span>${zstack(a)}<span class="n">${a.length}</span></div>`; }).join("")}</div>
    <h3>Lo suyo (más famoso primero)</h3><div class="cand">${R.filter(r => r.dif2 != null).sort((a, b) => a.dif2 - b.dif2).slice(0, 60).map(r => `<span class="nm" data-open="${esc(r.key)}">${esc(r.name)}</span>`).join("")}</div>
    <h3>Propuestas para este país</h3>${S2.length ? `<table>${S2.map(x => `<tr><td><span class="nm" data-open="${esc(SGKEY(x))}">${esc(x.es)}</span></td><td>${esc(x.sub)}</td><td class="act">${vb(SGKEY(x))}</td></tr>`).join("")}</table>` : '<p class="note">Ninguna propuesta. Dime qué le falta o escribe una con «Cambiar…».</p>'}<h3>Tu opinión sobre el país</h3><div id="dvotes">${vb("pais:" + c)}</div>`; }
  function navDrawer(d) { if (!DKEY) return; const i = CURLIST.indexOf(DKEY); if (i < 0) return; const k = CURLIST[i + d]; if (k) open(k); }

  /* ================= buscador rapido ================= */
  function openFinder() { const o = document.createElement("div"); o.className = "ov"; o.id = "finder"; o.innerHTML = '<div class="box"><input id="fq" placeholder="Busca una pregunta, ficha, país o propuesta…" autocomplete="off"><div class="res" id="fres"></div><span class="keys">Enter abre el primero · Esc cierra</span></div>'; document.body.appendChild(o); const i = $("#fq"); i.focus();
    const run = () => { const q = i.value.trim().toLowerCase(); let out = []; if (q.length >= 2) { out = rows.filter(r => (r.name + " " + r.key).toLowerCase().includes(q)).slice(0, 12).map(r => [r.key, r.name, CATS[r.topic] + " · " + (r.ctry || "—")]).concat(COUNTRIES.filter(c => c.toLowerCase().includes(q)).slice(0, 4).map(c => ["pais:" + c, c, "país"]), SG.filter(x => (x.es + x.en).toLowerCase().includes(q)).slice(0, 8).map(x => [SGKEY(x), x.es, "propuesta · " + x.pais])); } $("#fres").innerHTML = out.map(([k, n, s], j) => `<button data-fopen="${esc(k)}" class="${j === 0 ? "on" : ""}"><span>${esc(n)}</span><small>${esc(s)}</small></button>`).join(""); };
    i.oninput = run; i.onkeydown = e => { if (e.key === "Escape") o.remove(); if (e.key === "Enter") { const b = $("#fres button"); if (b) { o.remove(); CURLIST = [b.dataset.fopen]; open(b.dataset.fopen); } } }; }

  /* ---- maquetacion por pantalla (2540 de ancho: nada de scroll de pagina; ver contenido.css) ---- */
  function layout() {
    const v = $("#view"), pl = t => [...v.querySelectorAll(".pl")].find(p => { const h = p.querySelector("h2"); return h && h.textContent.trim().toLowerCase().startsWith(t.toLowerCase()); });
    const mk = (items, cls) => { const w = document.createElement("div"); w.className = "cols " + (cls || ""); items.forEach(col => { const c = document.createElement("div"); c.className = "col"; col.filter(Boolean).forEach(n => c.appendChild(n)); w.appendChild(c); }); return w; };
    const place = (w, before) => { v.insertBefore(w, before || null); };
    const clean = () => v.querySelectorAll(".grid2").forEach(g => { if (!g.children.length) g.remove(); });
    const kids = [...v.children];
    if (cur === "inicio") { /* sin columnas */ }
    else if (cur === "balanceo") { const ps = [...v.querySelectorAll(".pl")]; if (ps.length >= 2) v.appendChild(mk([[ps[0]], [ps[1]]])); }
    else if (cur === "rondas") { const ps = [...v.querySelectorAll(".pl")]; if (ps.length >= 2) { v.appendChild(mk([[ps[0]], [ps[1]]])); } }
    else if (cur === "plan") { const ps = [...v.querySelectorAll(".pl")]; if (ps.length >= 5) v.appendChild(mk([[ps[0], ps[1]], [ps[2]], [ps[3], ps[4]]])); }
    else if (cur === "personajes") { const ps = [...v.querySelectorAll(".pl")]; if (ps.length >= 3) { v.appendChild(mk([[ps[0], ps[1]], [ps[2]]])); clean(); } }
    else if (cur === "sello") { const ps = [...v.querySelectorAll(".pl")]; if (ps.length >= 2) { v.appendChild(mk([[ps[0]], [ps[1]]])); clean(); } }
    else if (cur === "como") { const ps = [...v.querySelectorAll(".pl")]; if (ps.length >= 3) v.appendChild(mk([[ps[0], ps[2]], [ps[1]]])); }
    v.querySelectorAll(".tw").forEach(tw => { const p = tw.closest(".pl"); if (p && p.parentElement && p === p.parentElement.lastElementChild) p.classList.add("fill"); });
    if (kids.length && v.querySelector(".cols:not(.auto)")) v.querySelector(".cols:not(.auto)").style.flex = "1";
  }
  /* cuantas filas caben en la altura libre del panel: asi no hay scroll (solo paginas) */
  let fitN = 0;
  function fit() {
    if (!matchMedia("(min-width: 1500px)").matches) return; let changed = false;
    $$("#view .pl.fill > .tw").forEach(tw => { const st = ST[tw.dataset.tid]; if (!st) return; const trs = tw.querySelectorAll("tr"); if (trs.length < 2) return; const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1, head = trs[0].getBoundingClientRect().height / z, rh = Math.max(20, (trs[trs.length - 1].getBoundingClientRect().top + trs[trs.length - 1].getBoundingClientRect().height - trs[1].getBoundingClientRect().top) / z / (trs.length - 1));
      const per = Math.max(4, Math.floor((tw.clientHeight - head - 4) / rh)); if (per !== st.per) { st.per = per; changed = true; } });
    if (changed && fitN < 4) { fitN++; draw(); } else fitN = 0;
  }
  /* ================= pintar ================= */
  function draw() {
    const a = document.activeElement, fid = a && a.id && a.id.startsWith("in_") ? a.id : null, pos = fid ? a.selectionStart : 0;
    $("#nav").innerHTML = NAVG.map(([g, items]) => (g ? `<h4>${g}</h4>` : "") + items.map(([k, l]) => { let b = ""; if (k === "sugerencias") { const n = SG.filter(x => !N[SGKEY(x)]).length; b = n ? `<small>${n}</small>` : ""; } if (k === "cola") { const n = queueItems().all.length; b = n ? `<small>${n}</small>` : ""; } if (k === "notas") b = userNotes().length ? `<small>${userNotes().length}</small>` : ""; return `<button class="nav ${k === cur ? "on" : ""}" data-view="${k}"><span>${l}</span>${b}</button>`; }).join("")).join("");
    $("#scen").innerHTML = SCEN ? "Viendo: <b>con mis decisiones</b>" : "Viendo: <b>hoy</b>"; $("#scen").dataset.act = "scen"; $("#cuts").innerHTML = `Cortes <b>${CFG.t[0]}</b> · <b>${CFG.t[1]}</b>`; $("#nvotes").innerHTML = `Opiniones <b>${userNotes().length}</b>`;
    const v = VIEWS[cur] || VIEWS.inicio; $("#view").className = "content v-" + cur; $("#view").innerHTML = v(); layout(); fit();
    if (fid) { const n = $("#" + fid); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } }
    bindRanges();
  }
  function bindRanges() { const b1 = $("#b1"), b2 = $("#b2");
    if (b1 && b2) { const mv = () => { let a = +b1.value, b = +b2.value; if (a >= b) { if (document.activeElement === b1) a = b - 1; else b = a + 1; } CFG.t = [a, b]; draw(); }; b1.oninput = b2.oninput = mv; b1.onchange = b2.onchange = () => saveCfg(); }
    const mw = $("#mw"); if (mw) { mw.oninput = () => { const b = mw.parentNode.querySelector("b"); if (b) b.textContent = mw.value; }; mw.onchange = () => { CFG.mw = +mw.value; saveCfg(); draw(); }; }
    $$("input[data-w]").forEach(el => { el.oninput = () => { CFG.w[el.dataset.w] = +el.value; draw(); }; el.onchange = () => saveCfg(); });
    $$("input[data-sim]").forEach(el => { el.oninput = () => { const k = el.dataset.sim; if (k === "meta") ff("sello").meta = +el.value; if (k === "irr") ff("quitar").irr = +el.value; draw(); }; }); }

  /* ================= eventos ================= */
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-view],[data-go],[data-open],[data-vote],[data-note],[data-zone],[data-more],[data-pg],[data-mg],[data-sort],[data-lang],[data-act],[data-sim],[data-fopen]"); if (!t) { if (e.target.id === "shade") closeDrawer(); return; }
    if (t.tagName === "INPUT" || t.tagName === "SELECT") return;
    const d = t.dataset;
    if (d.view) return go(d.view);
    if (d.go) return go(d.go, d.f ? JSON.parse(d.f) : null);
    if (d.fopen) { const o = $("#finder"); if (o) o.remove(); CURLIST = [d.fopen]; return open(d.fopen); }
    if (d.open) { open(d.open); return; }
    if (d.vote) return vote(d.k, d.vote);
    if (d.note) return note(d.k);
    if (d.zone != null) { const f = ff("balanceo"); f.bz = f.bz == d.zone ? "" : d.zone; return draw(); }
    if (d.mg) { const [c, l] = d.mg.split(":"), f = ff("margenes"); if (f.c === c && f.l == l) { f.c = f.l = ""; } else { f.c = c; f.l = l; } if (ST.mg) ST.mg.page = 0; return draw(); }
    if (d.pg) { const [id, k] = d.pg.split(":"), st = ST[id]; if (k === "first") st.page = 0; else if (k === "last") st.page = 1e9; else st.page += +k; return draw(); }
    if (d.sort) { const [id, i] = d.sort.split(":"), s = ST[id]; if (s.s === +i) s.d = -s.d; else { s.s = +i; s.d = 1; } s.page = 0; return draw(); }
    if (d.lang) { return open(DKEY, d.lang); }
    if (d.sim) { const [k, a, b] = d.sim.split(":"), f = ff("rondas"); if (k === "src") f.src = a; if (k === "asc") f.asc = +a; if (k === "rd") f.rd = +a; if (k === "cell") { f.asc = +a; f.rd = +b; } return draw(); }
    switch (d.act) {
      case "prev": return navDrawer(-1); case "next": return navDrawer(1); case "closed": return closeDrawer();
      case "clrbal": F.balanceo = {}; return draw(); case "clrf": F[d.v] = {}; Object.keys(ST).forEach(k => (ST[k].page = 0)); return draw();
      case "savehist": return ask("Nombre de esta versión", "Cortes " + CFG.t.join(" / ") + " · se guardan con los pesos actuales", "Cortes " + CFG.t.join("-"), n => { HIST.push({ name: n || "Sin nombre", t: Date.now(), cuts: CFG.t.slice(), w: Object.assign({}, CFG.w), counts: [0, 1, 2].map(k => rows.filter(r => r.zone === k).length), z: snapZ() }); saveCfg(); toast("Versión guardada"); draw(); });
      case "cmp": { const f = ff("balanceo"); f.cmp = f.cmp == d.i ? "" : d.i; return draw(); }
      case "restore": { const h = HIST[+d.i]; CFG.t = h.cuts.slice(); CFG.w = Object.assign({}, h.w); saveCfg(); toast("Cortes restaurados"); return draw(); }
      case "delhist": HIST.splice(+d.i, 1); saveCfg(); return draw();
      case "oklimpias": SG.filter(x => !x.avisos.length && x.seguridad === "alta" && !N[SGKEY(x)] && sgVisible(x)).forEach(x => (N[SGKEY(x)] = { v: "ok", nota: "", t: Date.now() })); saveN(); toast("Hecho"); return draw();
      case "nolist": SG.filter(x => !N[SGKEY(x)] && sgVisible(x)).forEach(x => (N[SGKEY(x)] = { v: "no", nota: "", t: Date.now() })); saveN(); return draw();
      case "grp": ff("quitar").open = d.g; ST.rem && (ST.rem.page = 0); return draw();
      case "nogrp": remGroups()[d.g].rows.filter(r => !N[r.key]).forEach(r => (N[r.key] = { v: "no", nota: "regla: " + d.g, t: Date.now() })); saveN(); toast("Marcadas como «No»"); return draw();
      case "okgrp": remGroups()[d.g].rows.filter(r => !N[r.key]).forEach(r => (N[r.key] = { v: "ok", nota: "", t: Date.now() })); saveN(); return draw();
      case "copynotes": { const out = userNotes().map(k => ({ cosa: nameOfKey(k), id: k, veredicto: N[k].v, nota: N[k].nota })); navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(out, null, 1)); return toast("Copiado: pégamelo"); }
      case "setbase": setBase(); toast("Línea base fijada"); return draw();
      case "scen": SCEN = !SCEN; try { localStorage.setItem("mc.scen", SCEN ? "1" : "0"); } catch (e) {} return draw();
      case "dnudge": { const k = d.k, v = effOfKey(k, DID); return setDif(k, (v == null ? 50 : Math.round(v)) + +d.d); }
      case "dreset": return setDif(d.k, null);
      case "rep": return repStart(d.s);
      case "catwork": ff("cola").cat = d.t; ff("cola").src = ""; return go("cola");
      case "catdone": { const D = catDone(); if (D[d.t]) delete D[d.t]; else D[d.t] = Date.now(); N["cfg:cats"] = { v: "cfg", nota: JSON.stringify(D), t: Date.now() }; saveN(); return draw(); }
      case "qv": return qVote(d.v); case "qskip": return qSkip(); case "qundo": return qUndo();
      case "qsrc": ff("cola").src = d.s; return draw();
      case "qall": if (t.dataset.sure) return qAll(d.s); t.dataset.sure = 1; t.textContent = "Pulsa otra vez para confirmar"; return;
      case "base": CFG.base = d.b; saveCfg(); return draw();
      case "reload": return location.reload();
      case "clearnotes": if (t.dataset.sure) { userNotes().forEach(k => delete N[k]); saveN(); return draw(); } t.dataset.sure = 1; t.textContent = "Pulsa otra vez para vaciar"; return;
    }
  });
  function sgVisible(x) { const f = ff("sugerencias"); return (!f.cat || x.cat === f.cat) && (!f.sub || x.sub === f.sub) && (!f.pais || x.pais === f.pais) && (!f.sg || (f.sg === "aviso" ? x.avisos.length : f.sg === "limpias" ? !x.avisos.length && x.seguridad === "alta" : f.sg === "pend" ? !N[SGKEY(x)] : x.seguridad === f.sg)) && (!f.w || (f.w === "m" ? x.mujer : !x.mujer)) && (!f.q || (x.es + x.en + x.pais).toLowerCase().includes(f.q.toLowerCase())); }
  function onField(e) { const t = e.target; if (!t.dataset || !t.dataset.f) return; const [v, k] = t.dataset.f.split("."); ff(v)[k] = t.value; Object.keys(ST).forEach(k => (ST[k].page = 0)); draw(); }
  document.addEventListener("input", e => { if (e.target.tagName === "INPUT" && e.target.dataset.f) onField(e); });
  document.addEventListener("input", e => { const t = e.target; if (t.dataset && t.dataset.dr) { const v = +t.value, z = zoneOf(v), n = $(".dnum"), g = $(".dgrp"); if (n) { n.textContent = v; n.style.color = ZC[z]; } if (g) { g.textContent = ZN[z]; g.style.color = ZC[z]; } } });
  document.addEventListener("change", e => { const t = e.target; if (t.dataset && t.dataset.dr) return setDif(t.dataset.dr, +t.value); if (t.dataset && t.dataset.dk) { const k = t.dataset.dk; if (t.value.trim() === "") delete OV[k]; else OV[k] = Math.max(0, Math.min(100, Math.round(+t.value))); saveOv(); draw(); } });

  document.addEventListener("change", e => { if (e.target.tagName === "SELECT" && e.target.dataset.f) onField(e); });
  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) { e.preventDefault(); if (!$("#finder")) openFinder(); return; }
    if ($("#finder") && e.key === "Escape") { $("#finder").remove(); return; }
    if (!DKEY && !typing && !$(".ov")) { const t = $("#view .pager [data-pg]"); const id = t && t.dataset.pg.split(":")[0]; if (id && ST[id] && (e.key === "PageDown" || e.key === "PageUp")) { ST[id].page += e.key === "PageDown" ? 1 : -1; e.preventDefault(); draw(); return; } }
    if (cur === "cola" && !DKEY && !typing && !$(".ov") && !e.ctrlKey && !e.metaKey) { const q = e.key.toLowerCase(); if (q === "b") { e.preventDefault(); return qVote("ok"); } if (q === "n") { e.preventDefault(); return qVote("no"); } if (q === "c") { e.preventDefault(); return qVote("cambiar"); } if (q === " " || q === "arrowright") { e.preventDefault(); return qSkip(); } if (q === "z") return qUndo(); if (q === "i") { const it = queueItems().list[0]; if (it) { CURLIST = [it.key]; return open(it.key); } } }
    if (!DKEY || typing) return;
    if (e.key === "Escape") closeDrawer(); else if (e.key === "ArrowRight") navDrawer(1); else if (e.key === "ArrowLeft") navDrawer(-1); else if (e.key.toLowerCase() === "b") vote(DKEY, "ok"); else if (e.key.toLowerCase() === "n") vote(DKEY, "no"); else if (e.key.toLowerCase() === "c") note(DKEY);
  });
  window.addEventListener("hashchange", () => { const h0 = location.hash.slice(1), h = ALIAS[h0] || h0; if (h && VIEWS[h] && h !== cur) { cur = h; draw(); } });
  $("#find").onclick = openFinder;
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { fitN = 0; fit(); }, 200); });

  /* ================= arranque ================= */
  cur = ALIAS[cur] || cur; if (!VIEWS[cur]) cur = "inicio";
  reindex(); draw(); setNet();
  if (!readBase()) { setTimeout(() => { if (!readBase()) setBase(); }, 1500); }
  try { const es = REMOTE ? null : new EventSource("/api/live"); if (!es) throw 0; es.onmessage = () => { const b = $("#livebar"); b.style.display = "flex"; }; } catch (e) {}
  fetch("../data/wiki/es.json").then(r => r.json()).then(j => { WIKI = j; TXT.es = j; draw(); });
  fetch("../data/wiki/img.json").then(r => r.json()).then(j => { IMGD = j; draw(); });
  window.MC2 = { rows, SG, open, go, remGroups, SN, reindex, CFG, byKey };
})();
