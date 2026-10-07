/*
 * Geolite - PANEL DE RENDIMIENTO (v0.2.57). Para medir en equipos reales (sobre todo la Steam Deck) sin herramientas: F3 lo enseña/oculta; arranca
 * visible con ?perf en la direccion o con GEOLITE_PERF=1 / --perf en Electron (en la Deck: Propiedades > Opciones de lanzamiento > GEOLITE_PERF=1 %command%).
 * Enseña fps, tiempo de fotograma (mediana y p95), fotogramas largos (>25 ms), memoria JS, motor del mapa (GL/2D), GPU y la calidad que ha elegido el vigilante.
 * Apagado no cuesta nada (ni un requestAnimationFrame). Encendido, guarda un informe por pantalla/modo en geolite-perf.txt (carpeta de datos del
 * juego; en la Deck ~/.config/geolite/) cada 20 s y al apagarlo, para poder enviarlo.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  const host = window.geoliteHost, T = A.perf = { on: false };
  let box, raf = 0, last = 0, win = [], t0 = 0, tSave = 0, gpu = "", peakHeap = 0;
  const rep = new Map();                                                    // "modo/fase" -> { n, ms: [muestras de 1 s], long, worst, heap }
  const q = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

  const gpuName = () => {
    if (gpu) return gpu;
    try {
      const gl = document.createElement("canvas").getContext("webgl2") || document.createElement("canvas").getContext("webgl"), x = gl && gl.getExtension("WEBGL_debug_renderer_info");
      gpu = (x && gl.getParameter(x.UNMASKED_RENDERER_WEBGL)) || (gl ? "WebGL sin nombre" : "sin WebGL");
    } catch (e) { gpu = "?"; }
    return gpu;
  };
  const where = () => { const S = A.core && A.core.S; return S ? (S.mode || "-") + "/" + (S.phase || "-") : "arranque"; };
  const map = () => (A.core && A.core.map) || null;

  function build() {
    box = document.createElement("pre"); box.id = "perfHud";
    box.style.cssText = "position:fixed;left:6px;top:6px;z-index:2147483000;margin:0;padding:6px 8px;background:rgba(0,0,0,.72);color:#9f9;font:12px/1.35 monospace;pointer-events:none;white-space:pre;border-radius:4px";
    document.body.appendChild(box);
  }

  function second(now) {                                                   // se llama una vez por segundo con los intervalos de ese segundo
    const med = q(win, 0.5), p95 = q(win, 0.95), long = win.filter(d => d > 25).length, worst = Math.max(0, ...win), fps = win.length;
    const m = map(), mem = performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0; peakHeap = Math.max(peakHeap, mem);
    const k = where(), r = rep.get(k) || { n: 0, fps: [], p95: [], long: 0, worst: 0, heap: 0 }; rep.set(k, r);
    r.n++; r.fps.push(fps); r.p95.push(p95); r.long += long; r.worst = Math.max(r.worst, worst); r.heap = Math.max(r.heap, mem);
    const eng = m ? (m.gl ? "GL" : "2D") + " rs " + (m.rsCap || 1).toFixed(2) + " dpr " + (m.dpr || 1).toFixed(2) + " " + (m.quality || "") + (m.idleMs ? " idle " + m.idleMs : "") : "-";
    box.textContent = `${fps} fps  med ${med.toFixed(1)} ms  p95 ${p95.toFixed(1)} ms\nlargos >25 ms: ${long}  peor ${worst.toFixed(0)} ms\nmapa ${eng}\nmem ${mem ? mem.toFixed(0) + " MB (pico " + peakHeap.toFixed(0) + ")" : "n/d"}\n${k}\n${gpuName()}`;
    win = [];
    if (now - tSave > 20000) save(now);
  }

  function report() {
    const lines = ["Geolite " + (A.VERSION || "?") + " - informe de rendimiento", "dispositivo: " + ((host && host.device) || "web") + "  pantalla: " + innerWidth + "x" + innerHeight + " @" + (devicePixelRatio || 1) +
      "  nucleos: " + (navigator.hardwareConcurrency || "?") + "  GPU: " + gpuName(), "duracion: " + Math.round((performance.now() - t0) / 1000) + " s  memoria JS pico: " + peakHeap.toFixed(0) + " MB", ""];
    for (const [k, r] of [...rep].sort((a, b) => b[1].n - a[1].n)) lines.push(`${k.padEnd(24)} ${String(r.n).padStart(4)} s  fps med ${q(r.fps, 0.5)} min ${Math.min(...r.fps)}  p95 ${q(r.p95, 0.5).toFixed(1)} ms  largos ${r.long}  peor ${r.worst.toFixed(0)} ms  mem ${r.heap.toFixed(0)} MB`);
    return lines.join("\n");
  }
  function save(now) { tSave = now || performance.now(); try { if (host && host.perfSave) host.perfSave(report()); } catch (e) { /* sin host */ } }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (last) { const d = now - last; if (d < 1000 && !document.hidden) win.push(d); } last = now;
    if (!t0) t0 = now;
    if (now - (T._s || 0) >= 1000) { T._s = now; if (win.length) second(now); }
  }

  T.set = on => {
    if (on === T.on) return; T.on = on;
    if (on) { if (!box) build(); box.style.display = ""; last = 0; win = []; T._s = 0; t0 = t0 || performance.now(); tSave = performance.now(); raf = requestAnimationFrame(tick); }
    else { cancelAnimationFrame(raf); if (box) box.style.display = "none"; save(); }
  };
  T.report = report;

  addEventListener("keydown", e => { if (e.key === "F3" && !e.repeat) { e.preventDefault(); T.set(!T.on); } });
  addEventListener("beforeunload", () => { if (T.on) save(); });
  if (/[?&]perf\b/.test(location.search) || (host && host.perf)) { if (document.body) T.set(true); else addEventListener("DOMContentLoaded", () => T.set(true)); }
})(window.AIQ);
