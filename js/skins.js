/*
 * Geolite - skins. Cada uno cambia TODO: mapa (shader), paleta de interfaz, tipografia, formas, sonido.
 * Solo queda el aspecto Casino (el de Expedicion se retiro en v0.9).
 *   casino      mesa de cartas + monitor CRT (estilo "Balatro") Pixelify Sans + Silkscreen
 * v0.3.62: las MESAS del mapa (A.MESAS, A.mesas): el aspecto del mapa se gana y se elige aparte del skin.
 */
window.AIQ = window.AIQ || {};
(function (A) {
  A.MAPSTYLES = A.MAPSTYLES || {};

  A.MAPSTYLES.casino = {
    style: 1, animated: true,
    oceanTop: "#1f5a52", oceanBot: "#0d2c33", shallow: "#39a58c", swirl: ["#0f3b3a", "#1f7a63", "#6b2740"],
    land: ["#f6e6c8", "#ffd9a8", "#ffc4c4", "#c9e8c1", "#bfe0ff", "#f3d6ff", "#fff7e6"],
    line: [0.1, 0.07, 0.16, 0.95], lineW: 2.3, lineOff: [0, 0], lineOffCol: [0, 0, 0, 0], shadow: { off: [3, -4], col: [0.04, 0.02, 0.08, 0.5] },
    grid: "#9fd6c8", gridA: 0.1, tropic: "#ffd98a", ao: 0.1, grain: 0.02, vignette: 0.5, postGrain: 0.045, tint: [1, 1, 1], crt: true,
    ink: "#16241c", paper: "#f3eddc", red: "#fe5f55", brass: "#f8b449", hl: "#fe5f55",
  };

  /* ---------------------------------------------------------------- v0.3.62: LAS MESAS DEL MAPA
     El jugador gana mesas nuevas y elige sobre cual juega (Perfil > Mesas, js/hub.js). Una mesa solo cambia el ASPECTO del mapa: fronteras, nombres,
     reglas y puntuacion son los mismos, asi que vale en todos los modos. "Casino" es la de siempre (remolino y pantalla de tubo). Las de pano
     (style 2 en js/map.js) son lisas y quietas: sin remolino, sin tubo y sin grano animado, y el mapa deja de repintarse en reposo.
     felt = [pelo del fieltro, sombra de contacto de las piezas, luz de costa, lampara]. land = siete tonos de una misma familia: los vecinos se
     separan por el tono y por la tinta de la frontera (comprobarlo de cerca en Europa si se toca). La Enciclopedia es un aparato con su propia
     pantalla: mientras esta abierta el mapa vuelve a "casino" (js/codex.js). */
  const PANO = { style: 2, animated: false, crt: false, felt: [0.07, 0.22, 0.22, 0.05], lineW: 2.2, lineOff: [0, 0], lineOffCol: [0, 0, 0, 0], gridA: 0.2, tropic: "#ffd98a",
    ao: 0.1, grain: 0.012, vignette: 0.34, postGrain: 0, tint: [1, 1, 1], ink: "#16241c", paper: "#f3eddc", red: "#fe5f55", brass: "#f8b449", hl: "#fe5f55" };
  A.MAPSTYLES.mesa = { ...PANO, oceanTop: "#245a41", oceanBot: "#123324", shallow: "#2f7a56", land: ["#f7eed6", "#e3cc98", "#f2d3c0", "#d3dfbd", "#d9d4c8", "#efdca8", "#fcf7ea"],
    line: [0.06, 0.1, 0.08, 0.95], shadow: { off: [3, -4], col: [0.01, 0.05, 0.03, 0.55] }, grid: "#d4a04a" };
  A.MAPSTYLES.granate = { ...PANO, oceanTop: "#6d2230", oceanBot: "#3a1018", shallow: "#8a2c39", land: ["#f7eed6", "#e3cc98", "#f4d2c4", "#dcdcb8", "#dbd3ca", "#efdca8", "#fcf7ea"],
    line: [0.12, 0.04, 0.06, 0.95], shadow: { off: [3, -4], col: [0.08, 0.01, 0.02, 0.55] }, grid: "#e2b25a" };
  A.MAPSTYLES.medianoche = { ...PANO, oceanTop: "#1a2c5a", oceanBot: "#0a1230", shallow: "#27407a", land: ["#e8ecf5", "#b4c2de", "#e2d6ee", "#c4dfe4", "#cfd3df", "#98abd0", "#f5f7fc"],
    line: [0.05, 0.07, 0.18, 0.95], shadow: { off: [3, -4], col: [0.01, 0.02, 0.1, 0.55] }, grid: "#a9c4ff", gridA: 0.18, tropic: "#dfe8ff" };
  A.MAPSTYLES.banca = { ...PANO, oceanTop: "#232326", oceanBot: "#0c0c0e", shallow: "#2e2b25", land: ["#f3cf6c", "#cf9630", "#f9e2a0", "#b98328", "#e6b84c", "#fbeec4", "#ffe9b0"],
    line: [0.12, 0.07, 0.01, 0.95], shadow: { off: [3, -4], col: [0, 0, 0, 0.6] }, grid: "#f8b449", gridA: 0.16, tropic: "#fff0b8" };
  /* el atlas de papel con el que nacio el juego (su estilo base sigue en js/map.js): como mesa, la tinta de las fronteras un punto mas firme (que se lean
     igual que en las demas) y sin el grano que se movia */
  A.MAPSTYLES.expedicion = { ...A.MAPSTYLES.expedicion, animated: false, crt: false, line: [0.15, 0.2, 0.23, 0.72], lineW: 1.4, postGrain: 0 };

  /* ---------------------------------------------------------------- v0.3.132: LAS MESAS DE LA BOUTIQUE (Club de la casa, entrega 2)
     Materiales, no colores (js/map.js: u_mat 1-27 en tierra y mar, fx2 en el posproceso). mat: 1 madera, 2 marmol, 3 tiza, 4 neon, 5 pergamino
     con rumbos, 6 bandas de profundidad, 8 cianotipo, 9 laton cepillado, 10 hielo, 11 moqueta, 14 halo de oro o de lava. mc1/mc2 = colores del
     material, mp = sus parametros, lmat = tratamiento de la frontera (1 tiza, 2 neon), coast = luz de la costa, wide = desenfoque ancho (bandas).
     Regla del usuario: el MAR LIMPIO (nada de grietas, vetas ni rayas que se confundan con islas). Las raras son quietas; las legendarias, vivas. */
  const MS = o => ({ ...A.MAPSTYLES.mesa, grain: 0, ...o });
  A.MAPSTYLES.ruleta = MS({ mat: 1, oceanTop: "#6e3420", oceanBot: "#3e190d", shallow: "#8a4a2a", mc1: "#230b04", mc2: "#b0663c", mp: [26, 150, 0.16, 2], felt: [0, 0.3, 0.1, 0.07],
    land: ["#f4e6c4", "#e2c48e", "#efd2b0", "#d9cfa6", "#e8dcc4", "#f0d898", "#fbf3e0"], line: [0.16, 0.07, 0.03, 0.95], shadow: { off: [3, -4], col: [0.05, 0.01, 0, 0.6] }, grid: "#e0a85a", gridA: 0.12 });
  A.MAPSTYLES.tablero = MS({ mat: 1, oceanTop: "#c08a52", oceanBot: "#8a5a2e", shallow: "#cf9a62", mc1: "#5a3416", mc2: "#e0b07a", mp: [34, 190, 0.1, 2], felt: [0, 0.22, 0.1, 0.05],
    land: ["#2f5d4a", "#8a3a2c", "#2c4a6e", "#a0782a", "#5a3a5e", "#3d6b6b", "#6e5a2e"], line: [0.98, 0.9, 0.7, 0.92], shadow: { off: [3, -4], col: [0.15, 0.07, 0.02, 0.55] }, grid: "#5a3416", gridA: 0.16, tropic: "#5a3416", ink: "#2a1a0c" });
  A.MAPSTYLES.carrara = MS({ mat: 2, oceanTop: "#eeeae2", oceanBot: "#d2ccc1", shallow: "#e4dfd6", mc1: "#77736f", mc2: "#b4ada3", mp: [0.03, 1, 0, 2], felt: [0, 0.12, 0, 0.04],
    land: ["#c9a46a", "#a65f46", "#6f8a6a", "#8a6f9e", "#b98a52", "#5f7f93", "#c48f7a"], line: [0.14, 0.1, 0.08, 0.9], shadow: { off: [2, -3], col: [0.2, 0.17, 0.13, 0.18] }, grid: "#8a847c", gridA: 0.14, tropic: "#a0703a" });
  A.MAPSTYLES.nero = MS({ mat: 2, oceanTop: "#1f1e21", oceanBot: "#0b0b0d", shallow: "#2a2826", mc1: "#d8b469", mc2: "#5a5650", mp: [0.03, 1.4, 0, 2], felt: [0, 0.25, 0, 0.05],
    land: ["#f1e6cf", "#dccaa0", "#efd9c4", "#d6d1bb", "#e4dccb", "#ead7a2", "#faf4e6"], line: [0.1, 0.08, 0.05, 0.95], shadow: { off: [3, -4], col: [0, 0, 0, 0.6] }, grid: "#d8b469", gridA: 0, tropic: "#f0d890" });
  A.MAPSTYLES.pizarra = MS({ mat: 3, oceanTop: "#2f3d37", oceanBot: "#1c2622", shallow: "#34443d", mc1: "#e8efe9", mc2: "#26322e", mp: [0.09, 0, 0, 2], felt: [0, 0, 0, 0.04], lmat: 1,
    land: ["#f2efe6", "#f6d9a0", "#f4b9b0", "#bfe3c4", "#b9d4f2", "#e5c6f0", "#fff6c9"], line: [0.95, 0.96, 0.93, 0.92], lineW: 2.0, shadow: null, grid: "#e8efe9", gridA: 0.1, tropic: "#f6d9a0" });
  A.MAPSTYLES.vegas = MS({ mat: 4, oceanTop: "#140b28", oceanBot: "#05030c", shallow: "#140b28", mc1: "#22d8ff", mp: [0.4, 0, 0, 1], felt: [0, 0, 0, 0.05], lmat: 2, coast: [0.2, 0.9, 1, 1],
    land: ["#1f1338", "#26133c", "#16223e", "#2c1132", "#1a1c36", "#22163a", "#2c1c44"], line: [1, 0.25, 0.68, 1], lineW: 2.2, shadow: null, grid: "#7a3cff", gridA: 0.2, tropic: "#ffd84a", hl: "#ffd84a" });
  A.MAPSTYLES.nautica = MS({ mat: 5, wide: true, oceanTop: "#e2cf9f", oceanBot: "#cdb27c", shallow: "#e8d8ae", mc1: "#5a3a1e", mc2: "#a8783e", mp: [9, 0, 0, 2], felt: [0, 0, 0.25, 0.03],
    land: ["#f6ebcc", "#f2d9b0", "#e9e0b6", "#f3cfbb", "#e3e4bf", "#f7e3a8", "#fbf2dc"], line: [0.32, 0.19, 0.08, 0.92], lineW: 1.8, shadow: { off: [2, -3], col: [0.35, 0.22, 0.08, 0.25] }, grid: "#6a4a26", gridA: 0.22, tropic: "#a8452a" });
  A.MAPSTYLES.fondo = MS({ mat: 6, wide: true, oceanTop: "#0f2c4e", oceanBot: "#071830", shallow: "#8fd0da", mc1: "#5fb1c8", mc2: "#c8f0f4", mp: [2.0, 0, 0, 1], felt: [0, 0.1, 0.12, 0.04],
    land: ["#e9dcb0", "#cfd9a4", "#e3c99a", "#d8e2b8", "#efe2c0", "#c9d6a0", "#f4ead0"], line: [0.12, 0.15, 0.1, 0.85], shadow: { off: [3, -4], col: [0.01, 0.04, 0.1, 0.5] }, grid: "#a9dde6", gridA: 0.12, tropic: "#ffe2a0" });
  A.MAPSTYLES.cianotipo = MS({ mat: 8, oceanTop: "#1f528e", oceanBot: "#123a6e", shallow: "#25609e", mc1: "#dbe8ff", mp: [0, 0, 0, 2], felt: [0, 0, 0, 0.04],
    land: ["#3e74b4", "#3568a6", "#4880bf", "#2f5f9a", "#5289c6", "#3a6eae", "#5c93cf"], line: [0.92, 0.95, 1, 0.95], lineW: 1.8, shadow: null, grid: "#dbe8ff", gridA: 0.2, tropic: "#dbe8ff", ink: "#0f2a4e", paper: "#f4f8ff" });
  A.MAPSTYLES.laton = MS({ mat: 9, oceanTop: "#b8862e", oceanBot: "#77511a", shallow: "#c4943a", mc1: "#3e2a0c", mc2: "#f2d38a", mp: [150, 0, 0, 2], felt: [0, 0.3, 0.05, 0],
    land: ["#2a2420", "#3a2a22", "#24302c", "#352a30", "#2c2c26", "#3a3224", "#433a30"], line: [0.95, 0.78, 0.4, 0.95], shadow: { off: [3, -4], col: [0.15, 0.08, 0, 0.6] }, grid: "#3e2a0c", gridA: 0.18, tropic: "#3e2a0c" });
  A.MAPSTYLES.moqueta = MS({ mat: 11, oceanTop: "#6a1424", oceanBot: "#3e0a14", shallow: "#7a1c2c", mc1: "#1f5a52", mc2: "#e0b25a", mp: [30, 0, 0, 2], felt: [0, 0.32, 0.05, 0.06],
    land: ["#f7eed6", "#e3cc98", "#f2d3c0", "#d3dfbd", "#d9d4c8", "#efdca8", "#fcf7ea"], line: [0.14, 0.03, 0.05, 0.95], shadow: { off: [3, -4], col: [0.08, 0, 0.02, 0.6] }, grid: "#e0b25a", gridA: 0.0 });
  A.MAPSTYLES.hielo = MS({ mat: 10, oceanTop: "#2d5f86", oceanBot: "#163a5c", shallow: "#a8d6ee", mc1: "#d8f0ff", mc2: "#6aa6cc", mp: [0.015, 0, 0, 2], felt: [0, 0.12, 0.3, 0.05],
    land: ["#f4f8fb", "#dcebf5", "#ece9f8", "#d9efe6", "#f6efe2", "#e2eafa", "#fbfdff"], line: [0.1, 0.18, 0.3, 0.9], shadow: { off: [3, -4], col: [0.02, 0.08, 0.16, 0.5] }, grid: "#d8f0ff", gridA: 0.14, tropic: "#ffe9b0" });
  A.MAPSTYLES.tele = { ...A.MAPSTYLES.casino, animated: true, crt: true, swirl: ["#23262b", "#4d535b", "#8c939c"], shallow: "#7a8088", fx2: [1, 0.045, 1, 0], postGrain: 0.02, vignette: 0.62,
    land: ["#ececec", "#c9c9c9", "#dadada", "#b6b6b6", "#f4f4f4", "#c0c0c0", "#e2e2e2"], line: [0.06, 0.06, 0.07, 0.95], grid: "#c9c9c9", gridA: 0.1, tropic: "#ececec" };
  A.MAPSTYLES.cine = MS({ animated: true, oceanTop: "#6a645a", oceanBot: "#3a362f", shallow: "#7a7366", felt: [0, 0.22, 0.12, 0.08], fx2: [2, 0.035, 1, 0], vignette: 0.78,
    land: ["#e9e2d0", "#d4cab2", "#e2d8c0", "#c8bea6", "#efe8d8", "#d9cfb8", "#f4eee0"], line: [0.1, 0.08, 0.06, 0.95], shadow: { off: [3, -4], col: [0.05, 0.04, 0.02, 0.55] }, grid: "#e9e2d0", gridA: 0.1, tropic: "#e9e2d0" });
  A.MAPSTYLES.laca = MS({ mat: 14, animated: true, oceanTop: "#1b1a1f", oceanBot: "#08080a", shallow: "#1b1a1f", mc1: "#8a6424", mc2: "#f2c867", mp: [0.55, 0, 0.16, 1], felt: [0, 0.2, 0, 0.05],
    land: ["#f3efe6", "#e4dccb", "#efe2d6", "#dfe0d2", "#e9e6dc", "#efe0bc", "#fbf8f1"], line: [0.08, 0.08, 0.1, 0.95], coast: [0.85, 0.64, 0.26, 1], shadow: { off: [3, -4], col: [0, 0, 0, 0.6] }, grid: "#d9a441", gridA: 0 });
  A.MAPSTYLES.brasas = MS({ mat: 14, animated: true, oceanTop: "#1c1412", oceanBot: "#070505", shallow: "#1c1412", mc1: "#e04a1c", mc2: "#ffc04a", mp: [1.25, 0.5, 0, 1], felt: [0, 0, 0, 0.03],
    land: ["#cfc6b8", "#b8ab98", "#d8cdb6", "#a99d8c", "#c6b9a2", "#ddd2bf", "#e8e0d0"], line: [0.1, 0.05, 0.03, 0.95], shadow: { off: [3, -4], col: [0, 0, 0, 0.65] }, grid: "#ff5a1f", gridA: 0 });

  /* ---------------------------------------------------------------- v0.3.177: la tanda 2 de la tienda (8 raras quietas + 6 legendarias vivas)
     mat 15 azulejo, 16 cuaderno, 18 ajedrez, 19 despacho, 20 jade, 21 seda, 22 acuarela, 23 aurora, 24 tesoro, 25 recreativa, 26 tormenta, 27 nacar;
     bolsillo es un posproceso (fx2 modo 3: bloques de 2 px, cuatro verdes y tramado) y tormenta lleva los relampagos (fx2 modo 4). Las quietas no repintan
     en reposo; las vivas (animated) si, y por eso su material es de pocas octavas de ruido. Mar limpio: ninguna lleva rayas ni grietas en el agua. */
  A.MAPSTYLES.azulejo = MS({ mat: 15, oceanTop: "#f3f1ea", oceanBot: "#dedacf", shallow: "#f3f1ea", mc1: "#22549e", mc2: "#b8b2a6", mp: [30, 0, 0, 2], felt: [0, 0.15, 0, 0.03],
    land: ["#d9895a", "#e0b062", "#a8a05a", "#c96f4f", "#e6c48a", "#b98552", "#d8a070"], line: [0.18, 0.1, 0.06, 0.95], shadow: { off: [3, -4], col: [0.15, 0.1, 0.05, 0.35] }, gridA: 0 });
  A.MAPSTYLES.cuaderno = MS({ mat: 16, oceanTop: "#fbfaf4", oceanBot: "#efece0", shallow: "#fbfaf4", mc1: "#8fb4d8", mc2: "#e05a5a", mp: [12, 70, 0, 1], felt: [0, 0, 0, 0.02], lmat: 1,
    land: ["#ffd84a", "#7fd36a", "#ff9a5a", "#6ab8ff", "#ff7aa8", "#b48aff", "#5ad6c8"], line: [0.2, 0.2, 0.24, 0.92], lineW: 1.7, shadow: null, gridA: 0 });
  A.MAPSTYLES.bolsillo = MS({ mat: 0, oceanTop: "#555555", oceanBot: "#555555", shallow: "#555555", fx2: [3, 0, 0, 0], vignette: 0, felt: [0, 0, 0, 0],
    land: ["#7a7a7a", "#9a9a9a", "#bababa", "#d2d2d2", "#ececec", "#888888", "#c6c6c6"], line: [0, 0, 0, 1], lineW: 2.0, shadow: null, gridA: 0 });
  A.MAPSTYLES.ajedrez = MS({ mat: 18, oceanTop: "#c99a62", oceanBot: "#b8884f", shallow: "#c99a62", mc1: "#5a3a20", mc2: "#2a1a0c", mp: [44, 0, 0, 2], felt: [0, 0.25, 0, 0.05],
    land: ["#f4ead2", "#e8d6ae", "#f1dcc4", "#e2dcc0", "#ece4d2", "#f0dcaa", "#fbf6e8"], line: [0.12, 0.07, 0.03, 0.95], shadow: { off: [3, -4], col: [0.08, 0.03, 0, 0.6] }, gridA: 0 });
  A.MAPSTYLES.despacho = MS({ mat: 19, oceanTop: "#2e4d3c", oceanBot: "#1a3024", shallow: "#2e4d3c", mc1: "#c99a3a", mp: [26, 0, 0, 1], felt: [0, 0.28, 0, 0.06],
    land: ["#efe4c8", "#e0cfa4", "#ecd6bc", "#d8d2b4", "#e6dcc8", "#ead39c", "#f8f1de"], line: [0.1, 0.12, 0.08, 0.95], shadow: { off: [3, -4], col: [0.01, 0.05, 0.03, 0.6] }, gridA: 0 });
  A.MAPSTYLES.jade = MS({ mat: 20, oceanTop: "#2f6a52", oceanBot: "#1b4634", shallow: "#2f6a52", mc1: "#82c49c", mc2: "#e8fff0", mp: [0.012, 0, 0, 2], felt: [0, 0.25, 0, 0.04],
    land: ["#f6f1e2", "#eadfc0", "#f3e6d6", "#e4e6d2", "#efeadc", "#f0e0b0", "#fdfaf0"], line: [0.06, 0.14, 0.1, 0.95], shadow: { off: [3, -4], col: [0, 0.06, 0.03, 0.55] }, gridA: 0 });
  A.MAPSTYLES.seda = MS({ mat: 21, oceanTop: "#8e1e2e", oceanBot: "#5a0f1c", shallow: "#8e1e2e", mc1: "#f08090", mp: [9, 0, 0, 1], felt: [0, 0.25, 0, 0],
    land: ["#f6e6c0", "#e8c886", "#f2d8be", "#e0d2a8", "#eee2cc", "#f0d290", "#fcf4e2"], line: [0.16, 0.03, 0.05, 0.95], shadow: { off: [3, -4], col: [0.1, 0, 0.02, 0.6] }, gridA: 0 });
  A.MAPSTYLES.acuarela = MS({ mat: 22, oceanTop: "#eef3f4", oceanBot: "#dfe8ea", shallow: "#eef3f4", mc1: "#5b8fb8", mp: [0, 0, 0, 2], felt: [0, 0, 0, 0.02],
    land: ["#f2c9a0", "#c9dfa8", "#f0e0a0", "#e8b8c0", "#b8d0e8", "#d8c8e8", "#f8e8c8"], line: [0.28, 0.22, 0.2, 0.75], lineW: 1.5, shadow: null, gridA: 0 });
  A.MAPSTYLES.aurora = MS({ mat: 23, animated: true, oceanTop: "#0e1c36", oceanBot: "#040812", shallow: "#0e1c36", mc1: "#3dffa0", mc2: "#9a6aff", mp: [1, 0, 0, 1], felt: [0, 0.2, 0, 0],
    land: ["#e8eef6", "#d4dce8", "#e2e0f0", "#d0e4e0", "#eceae4", "#dce6f4", "#f6f8fc"], line: [0.05, 0.08, 0.16, 0.95], shadow: { off: [3, -4], col: [0, 0, 0.04, 0.6] }, gridA: 0 });
  A.MAPSTYLES.tesoro = MS({ mat: 24, animated: true, oceanTop: "#7a4e10", oceanBot: "#7a4e10", shallow: "#7a4e10", mc1: "#6e440c", mc2: "#ffe08a", mp: [0.006, 0.6, 0, 2], felt: [0, 0.3, 0, 0],
    land: ["#2a2018", "#33251c", "#26241e", "#3a2a22", "#2e2820", "#382c1c", "#40342a"], line: [0.98, 0.84, 0.5, 0.95], coast: [0.98, 0.84, 0.5, 1], shadow: { off: [3, -4], col: [0.2, 0.1, 0, 0.6] }, gridA: 0, ink: "#2a1a0c" });
  A.MAPSTYLES.neonvivo = { ...A.MAPSTYLES.vegas, animated: true, mp: [0.4, 1, 0, 1] };
  A.MAPSTYLES.recreativa = MS({ mat: 25, animated: true, wide: true, crt: true, oceanTop: "#142a7a", oceanBot: "#0a1448", shallow: "#142a7a", mc1: "#4aa8ff", mc2: "#e8f6ff", mp: [2.0, 0.8, 0, 2], felt: [0, 0, 0, 0],
    land: ["#58c858", "#a8e060", "#e8d870", "#48a848", "#d8b860", "#88d080", "#f0e8a0"], line: [0.04, 0.1, 0.04, 1], shadow: { off: [3, -4], col: [0, 0, 0.1, 0.6] }, gridA: 0 });
  A.MAPSTYLES.tormenta = MS({ mat: 26, animated: true, oceanTop: "#2c3846", oceanBot: "#121820", shallow: "#2c3846", mp: [0.006, 0.5, 0, 2], fx2: [4, 1, 0, 0], felt: [0, 0.25, 0, 0],
    land: ["#c8ccc0", "#b4bcae", "#d0ccbc", "#a8b0a4", "#c0c4bc", "#d8d6c8", "#e0e2d8"], line: [0.08, 0.1, 0.12, 0.95], shadow: { off: [3, -4], col: [0, 0.02, 0.05, 0.6] }, gridA: 0 });
  A.MAPSTYLES.nacar = MS({ mat: 27, animated: true, oceanTop: "#f2eef4", oceanBot: "#dcd8e4", shallow: "#f2eef4", mp: [0.004, 0.03, 0.16, 2], felt: [0, 0.2, 0, 0],
    land: ["#2a3a4a", "#3a2a48", "#1f4040", "#3a3040", "#2a3048", "#40303a", "#30404a"], line: [0.92, 0.9, 0.94, 0.9], shadow: { off: [3, -4], col: [0.1, 0.08, 0.14, 0.4] }, gridA: 0 });

  /* ---------------------------------------------------------------- v0.3.177: la tanda 3 de la tienda (8 raras quietas + 5 legendarias vivas), votada el 22-oct
     mat 28 corcho, 29 zen (surcos de arena alrededor de las costas), 30 punto de cruz, 31 teselas, 32 bloques, 33 periodico, 34 tartan, 35 vitral,
     36 radar, 37 lluvia de codigo, 38 lampara de lava, 39 piscina; la cinta VHS es un posproceso (fx2 modo 5). Lava y piscina responden al puntero, a los
     clics y al mapa (js/map.js: u_it, u_hv). Regla del usuario: ningun efecto estorba al juego (pocas columnas de codigo, banda de VHS fina y rara). */
  A.MAPSTYLES.corcho = MS({ mat: 28, oceanTop: "#b98a56", oceanBot: "#a67845", shallow: "#b98a56", mc1: "#5a3a1c", mc2: "#e0bd8a", mp: [1, 0, 0, 2], felt: [0, 0.2, 0, 0.04],
    land: ["#fff6c8", "#ffd3d3", "#cfeaff", "#d8f5cf", "#f4dcff", "#ffe6c2", "#ffffff"], line: [0.2, 0.15, 0.1, 0.8], shadow: { off: [3, -4], col: [0.25, 0.12, 0.02, 0.55] }, gridA: 0 });
  A.MAPSTYLES.zen = MS({ mat: 29, oceanTop: "#e6dcc3", oceanBot: "#d4c8aa", shallow: "#e6dcc3", mc1: "#9c8d62", mp: [16, 0, 0, 2], felt: [0, 0.3, 0, 0],
    land: ["#7b7f7a", "#6a6e6a", "#8a8d86", "#5f6764", "#767b73", "#8c9088", "#6d726c"], line: [0.1, 0.11, 0.1, 0.9], shadow: { off: [3, -4], col: [0.2, 0.17, 0.1, 0.45] }, gridA: 0 });
  A.MAPSTYLES.bordado = MS({ mat: 30, oceanTop: "#3a6fc2", oceanBot: "#3a6fc2", shallow: "#3a6fc2", mc1: "#7fa6e8", mc2: "#f1e8d0", mp: [4, 0, 0, 2], felt: [0, 0.15, 0, 0],
    land: ["#d9534f", "#e8a33d", "#5aa469", "#8a6cc8", "#e17aa0", "#3fb0b0", "#c9b458"], line: [0.12, 0.08, 0.08, 0.9], shadow: { off: [2, -3], col: [0.1, 0.08, 0.04, 0.4] }, gridA: 0 });
  A.MAPSTYLES.teselas = MS({ mat: 31, oceanTop: "#2f7f9f", oceanBot: "#1c5c7c", shallow: "#2f7f9f", mc1: "#e8c07a", mc2: "#cfc9b6", mp: [7, 0, 0, 2], felt: [0, 0.2, 0, 0.03],
    land: ["#e8dcc0", "#d9a066", "#c47a50", "#e3c78a", "#b9b08a", "#d8c4a0", "#efe6d0"], line: [0.2, 0.1, 0.06, 0.9], shadow: { off: [3, -4], col: [0.05, 0.1, 0.12, 0.5] }, gridA: 0 });
  A.MAPSTYLES.bloques = MS({ mat: 32, oceanTop: "#2a6fd0", oceanBot: "#1f58b0", shallow: "#2a6fd0", mc1: "#0f2f66", mp: [6, 0, 0, 2], felt: [0, 0.3, 0, 0],
    land: ["#e8312a", "#f6d21a", "#2e9e48", "#f0f0ea", "#f08a1c", "#8b4fc0", "#26b5c9"], line: [0.08, 0.08, 0.1, 0.95], shadow: { off: [3, -4], col: [0, 0.05, 0.15, 0.55] }, gridA: 0 });
  A.MAPSTYLES.periodico = MS({ mat: 33, oceanTop: "#d8d0bb", oceanBot: "#cbc2ab", shallow: "#d8d0bb", mc1: "#3a3a3a", mp: [24, 0, 0, 2], felt: [0, 0.1, 0, 0],
    land: ["#d6483a", "#2d63b8", "#f2d03a", "#2a2a2a", "#e98a3a", "#3a9a6a", "#8a4ea8"], line: [0.1, 0.1, 0.1, 0.95], shadow: null, gridA: 0 });
  A.MAPSTYLES.tartan = MS({ mat: 34, oceanTop: "#1f5a3e", oceanBot: "#174630", shallow: "#1f5a3e", mc1: "#142a5c", mc2: "#e8c43a", mp: [48, 0, 0, 2], felt: [0, 0.2, 0, 0],
    land: ["#f1ead8", "#e6dcc0", "#f0d9c8", "#dfe6cf", "#e9e2d3", "#efe0b4", "#fbf7ec"], line: [0.1, 0.12, 0.08, 0.95], shadow: { off: [3, -4], col: [0, 0.06, 0.03, 0.55] }, gridA: 0 });
  A.MAPSTYLES.vitral = MS({ mat: 35, oceanTop: "#26407a", oceanBot: "#1a2a58", shallow: "#26407a", mc1: "#0c0c12", mp: [16, 0, 0, 2], felt: [0, 0, 0, 0],
    land: ["#f3ecd8", "#eadfc2", "#f4e2d4", "#e5e8d6", "#efe9db", "#f1e3b8", "#fbf6e8"], line: [0.05, 0.05, 0.08, 0.95], shadow: null, gridA: 0 });
  A.MAPSTYLES.radar = MS({ mat: 36, animated: true, oceanTop: "#1a0d03", oceanBot: "#0c0601", shallow: "#1a0d03", mc1: "#ff9f1a", mc2: "#ffe0a0", mp: [1.3, 0, 0, 2], felt: [0, 0, 0, 0],
    land: ["#3a2208", "#47290a", "#2f1c06", "#523009", "#3d2509", "#4a2c0a", "#2b1905"], line: [0.62, 0.36, 0.06, 0.85], shadow: null, gridA: 0 });
  A.MAPSTYLES.matrix = MS({ mat: 37, animated: true, oceanTop: "#030a05", oceanBot: "#010302", shallow: "#030a05", mc1: "#27e860", mc2: "#d6ffe3", mp: [1, 0, 0, 2], felt: [0, 0, 0, 0],
    land: ["#0f3a1c", "#14481f", "#0b2d16", "#18522a", "#103a1d", "#1a5a2c", "#0c3017"], line: [0.3, 1, 0.5, 0.9], shadow: null, gridA: 0 });
  A.MAPSTYLES.lava = MS({ mat: 38, animated: true, oceanTop: "#2a0f3a", oceanBot: "#14061f", shallow: "#2a0f3a", mc1: "#ff5a2a", mc2: "#ffd54a", mp: [0.3, 0, 0, 2], felt: [0, 0.2, 0, 0],
    land: ["#f4e7d4", "#ead9bf", "#f2dccd", "#e6e3cf", "#efe5d4", "#f1dfb6", "#faf2e4"], line: [0.12, 0.04, 0.16, 0.95], shadow: { off: [3, -4], col: [0.05, 0, 0.1, 0.6] }, gridA: 0 });
  A.MAPSTYLES.piscina = MS({ mat: 39, animated: true, oceanTop: "#35c3d4", oceanBot: "#1b8fb5", shallow: "#35c3d4", mc1: "#eaffff", mp: [0.045, 3.0, 0, 2], felt: [0, 0.2, 0, 0],
    land: ["#f6efe0", "#f2dfc4", "#f7e4dc", "#e9efdb", "#f3ede0", "#f5e2b0", "#fffaf0"], line: [0.1, 0.25, 0.35, 0.9], shadow: { off: [3, -4], col: [0, 0.15, 0.25, 0.4] }, gridA: 0 });
  A.MAPSTYLES.vhs = MS({ animated: true, crt: true, oceanTop: "#1d34d8", oceanBot: "#101c8e", shallow: "#2a44e8", fx2: [5, 0.05, 1, 0], vignette: 0.55, postGrain: 0.02, felt: [0, 0, 0, 0],
    land: ["#f2f2f2", "#e8e0a0", "#f0b8d8", "#a8e8e8", "#f0f0b0", "#e8c8a0", "#ffffff"], line: [0.05, 0.05, 0.1, 0.95], shadow: null, gridA: 0 });

  /* ---------------------------------------------------------------- v0.3.179: la tanda 4 de la tienda (mesas de videojuegos; 4 raras + 3 legendarias), votada el 22-oct
     mat 43 mundo de cubos, 44 mazmorra, 45 reverso de baraja, 47 campo de minas, 49 edicion policroma (se inclina con el puntero), 52 hiperespacio.
     Plataformas usa el humo azul del casino (style 1) con los paises de ladrillo (mat 54 solo en tierra). */
  A.MAPSTYLES.cubos = MS({ mat: 43, oceanTop: "#3a62d0", oceanBot: "#2c4fb4", shallow: "#3a62d0", mc1: "#7fa0ff", mp: [16, 0, 0, 2], felt: [0, 0.1, 0, 0],
    land: ["#5ea83c", "#7c9a40", "#8a6a44", "#9a9a94", "#d8c880", "#4f9232", "#c8b878"], line: [0.1, 0.12, 0.06, 0.95], shadow: { off: [3, -4], col: [0, 0.05, 0.12, 0.5] }, gridA: 0 });
  A.MAPSTYLES.mazmorra = MS({ mat: 44, oceanTop: "#4a4562", oceanBot: "#3c384e", shallow: "#4a4562", mc1: "#15121c", mc2: "#4f7a3a", mp: [14, 0, 0, 2], felt: [0, 0.2, 0, 0],
    land: ["#d8cfae", "#cfc4a0", "#e0d4b4", "#c4bc9c", "#dcd2b6", "#d4c8a0", "#e8dfc4"], line: [0.1, 0.08, 0.1, 0.95], shadow: { off: [3, -4], col: [0.04, 0.02, 0.08, 0.6] }, gridA: 0 });
  A.MAPSTYLES.reverso = MS({ mat: 45, oceanTop: "#a82030", oceanBot: "#8e1826", shallow: "#a82030", mc2: "#f4ecd8", mp: [10, 0, 0, 2], felt: [0, 0.2, 0, 0],
    land: ["#fbf6e6", "#f6efd8", "#fff8ee", "#f2ead4", "#fdf4e2", "#f8f0dc", "#fffaf0"], line: [0.45, 0.05, 0.1, 0.95], shadow: { off: [3, -4], col: [0.12, 0, 0.02, 0.55] }, gridA: 0 });
  A.MAPSTYLES.minas = MS({ mat: 47, oceanTop: "#a9a9a9", oceanBot: "#a0a0a0", shallow: "#a9a9a9", mp: [8, 0, 0, 2], felt: [0, 0, 0, 0],
    land: ["#fff3c0", "#c8f0c8", "#ffd0d0", "#c8d8ff", "#f0d0ff", "#ffe0b0", "#e0f4f4"], line: [0.15, 0.15, 0.15, 0.95], shadow: null, gridA: 0 });
  A.MAPSTYLES.policroma = MS({ mat: 49, animated: true, oceanTop: "#1a1030", oceanBot: "#1a1030", shallow: "#1a1030", mp: [1, 0.6, 0, 2], felt: [0, 0, 0, 0],
    land: ["#f6f2ff", "#f2eeff", "#faf4ff", "#eef2ff", "#f4f0ff", "#f8f4ff", "#ffffff"], line: [0.1, 0.05, 0.2, 0.95], shadow: { off: [3, -4], col: [0.05, 0, 0.1, 0.5] }, gridA: 0 });
  A.MAPSTYLES.hiperespacio = MS({ mat: 52, animated: true, oceanTop: "#050a22", oceanBot: "#02051a", shallow: "#050a22", mc1: "#6a3aa8", mc2: "#cfe0ff", mp: [1, 0, 0, 2], felt: [0, 0, 0, 0],
    land: ["#2a3a5a", "#324468", "#26364e", "#3a4c74", "#2c3e5e", "#34486c", "#243248"], line: [0.6, 0.8, 1, 0.9], shadow: null, gridA: 0 });
  A.MAPSTYLES.plataformas = { ...A.MAPSTYLES.casino, mat: 54, animated: true, crt: false, swirl: ["#0e2a7a", "#2c63d8", "#8fb8ff"], shallow: "#3f78e0", postGrain: 0.02, vignette: 0.45,
    land: ["#c84c0c", "#d8641c", "#b84410", "#e07a2a", "#c05818", "#d06a20", "#e8a050"], line: [0.25, 0.08, 0.02, 0.95], grid: "#8fb8ff", gridA: 0.08, tropic: "#ffd98a" };

  /* el catalogo, en orden. own(P): cuando es tuya (del perfil: los logros y, por si el perfil es anterior a algun logro, lo que guardan las
     Ascensiones). Los textos, en los 12 idiomas: es|en|fr|pt|de|it|es-419|zh|ko|ja|ru|pl */
  const ASC_HOW = "Gana la Aventura en Ascensión {n}.|Win the Adventure at Ascension {n}.|Gagne l'Aventure en Ascension {n}.|Vença a Aventura na Ascensão {n}.|Gewinne das Abenteuer auf Aufstieg {n}.|Vinci l'Avventura all'Ascensione {n}.||在进阶 {n} 赢下冒险。|어센션 {n}에서 모험을 승리하세요.|アセンション{n}でアドベンチャーに勝利する。|Выиграй Приключение на Восхождении {n}.|Wygraj Przygodę na Wniebowstąpieniu {n}.";
  const ASC_WON = "Has ganado la Aventura en Ascensión {n}.|You've won the Adventure at Ascension {n}.|Tu as gagné l'Aventure en Ascension {n}.|Você venceu a Aventura na Ascensão {n}.|Du hast das Abenteuer auf Aufstieg {n} gewonnen.|Hai vinto l'Avventura all'Ascensione {n}.||你在进阶 {n} 赢下了冒险。|어센션 {n}에서 모험을 승리했습니다.|アセンション{n}でアドベンチャーに勝利しました。|Приключение на Восхождении {n} выиграно.|Przygoda na Wniebowstąpieniu {n} wygrana.";
  const classic = () => (A.CAMPAIGNS || []).filter(c => c.mode === "classic");
  A.MESAS = [
    { id: "casino", own: () => true,
      n: "Casino|Casino|Casino|Cassino|Casino|Casinò||赌场|카지노|カジノ|Казино|Kasyno",
      d: "El remolino y la pantalla de tubo.|The swirl and the tube screen.|Le tourbillon et l'écran à tube.|O redemoinho e a tela de tubo.|Wirbel und Röhrenbildschirm.|Il vortice e lo schermo a tubo.||漩涡与显像管屏幕。|소용돌이와 브라운관 화면.|渦とブラウン管の画面。|Вихрь и кинескоп.|Wir i ekran kineskopowy.",
      how: "Desde el principio.|From the start.|Dès le début.|Desde o início.|Von Anfang an.|Dall'inizio.||一开始就有。|처음부터.|最初から。|С самого начала.|Od początku.", won: "" },
    { id: "mesa", own: P => !!P.ach.adv_win || P.adv.asc >= 1,
      n: "La mesa|The table|La table|A mesa|Der Tisch|Il tavolo||绿呢牌桌|그린 테이블|グリーンテーブル|Стол|Stół",
      d: "Paño verde y líneas de oro.|Green baize and gold lines.|Tapis vert et lignes d'or.|Pano verde e linhas de ouro.|Grünes Tuch und goldene Linien.|Panno verde e linee d'oro.||绿色台呢与金线。|초록 펠트와 금빛 선.|緑のフェルトと金のライン。|Зелёное сукно и золотые линии.|Zielone sukno i złote linie.",
      how: "Gana tu primera Aventura.|Win your first Adventure.|Gagne ta première Aventure.|Vença sua primeira Aventura.|Gewinne dein erstes Abenteuer.|Vinci la tua prima Avventura.||赢下你的第一次冒险。|첫 모험에서 승리하세요.|最初のアドベンチャーに勝利する。|Выиграй своё первое Приключение.|Wygraj swoją pierwszą Przygodę.",
      won: "Has ganado tu primera Aventura.|You've won your first Adventure.|Tu as gagné ta première Aventure.|Você venceu sua primeira Aventura.|Du hast dein erstes Abenteuer gewonnen.|Hai vinto la tua prima Avventura.||你赢下了第一次冒险。|첫 모험에서 승리했습니다.|最初のアドベンチャーに勝利しました。|Первое Приключение выиграно.|Pierwsza Przygoda wygrana." },
    { id: "granate", asc: 2, own: P => !!P.ach.adv_asc2 || P.adv.asc >= 3,
      n: "Sala privada|Private room|Salon privé|Sala privada|Privatsalon|Sala privata||贵宾厅|프라이빗 룸|プライベートルーム|Приватный зал|Sala prywatna",
      d: "Paño granate, como en el bacará.|Burgundy baize, baccarat style.|Tapis grenat, façon baccara.|Pano grená, estilo bacará.|Weinrotes Tuch wie beim Baccara.|Panno granata, stile baccarà.||酒红色台呢，百家乐风格。|바카라 같은 와인빛 펠트.|バカラ風の深紅のフェルト。|Бордовое сукно, как в баккара.|Bordowe sukno jak w bakarat." },
    { id: "medianoche", asc: 4, own: P => !!P.ach.adv_asc4 || P.adv.asc >= 5,
      n: "Medianoche|Midnight|Minuit|Meia-noite|Mitternacht|Mezzanotte||午夜|미드나이트|ミッドナイト|Полночь|Północ",
      d: "Paño azul noche y piezas de plata.|Midnight-blue baize, silver pieces.|Tapis bleu nuit, pièces d'argent.|Pano azul-noite, peças de prata.|Nachtblaues Tuch, Silbersteine.|Panno blu notte, pezzi d'argento.||午夜蓝台呢与银棋子。|한밤의 푸른 펠트와 은빛 말.|夜の青のフェルトと銀の駒。|Сукно цвета ночи, серебро.|Granatowe sukno i srebro." },
    { id: "banca", asc: 5, own: P => !!P.ach.adv_ascmax,
      n: "La banca|The bank|La banque|A banca|Die Bank|Il banco||庄家|뱅크|胴元|Банк|Bank",
      d: "Paño negro y piezas de oro.|Black baize and gold pieces.|Tapis noir et pièces d'or.|Pano preto e peças de ouro.|Schwarzes Tuch und Goldsteine.|Panno nero e pezzi d'oro.||黑色台呢与金棋子。|검은 펠트와 금빛 말.|黒のフェルトと金の駒。|Чёрное сукно и золото.|Czarne sukno i złoto." },
    { id: "expedicion", own: P => !!P.ach.classic_all || (cl => cl.length > 0 && cl.every(c => !!P.records["classic:" + c.id + ":win"]))(classic()),
      n: "Expedición|Expedition|Expédition|Expedição|Expedition|Spedizione||远征|원정|遠征|Экспедиция|Wyprawa",
      d: "El atlas de papel de siempre.|The old paper atlas.|L'atlas de papier d'origine.|O atlas de papel de sempre.|Der ursprüngliche Papieratlas.|L'atlante di carta di sempre.||最初的纸质地图集。|처음의 종이 지도책.|はじまりの紙の地図帳。|Бумажный атлас с самого начала.|Papierowy atlas od początku.",
      how: "Completa las {n} campañas del Clásico.|Finish all {n} Classic campaigns.|Termine les {n} campagnes du Classique.|Complete as {n} campanhas do Clássico.|Schließe alle {n} Klassik-Kampagnen ab.|Completa le {n} campagne del Classico.||完成经典模式的全部 {n} 场战役。|클래식의 캠페인 {n}개를 모두 완료하세요.|クラシックの{n}個のキャンペーンをすべてクリアする。|Пройди все кампании Классики ({n}).|Ukończ wszystkie kampanie trybu Klasycznego ({n}).",
      won: "Has completado todas las campañas del Clásico.|You've finished every Classic campaign.|Tu as terminé toutes les campagnes du Classique.|Você completou todas as campanhas do Clássico.|Du hast alle Klassik-Kampagnen abgeschlossen.|Hai completato tutte le campagne del Classico.||你完成了经典模式的全部战役。|클래식의 모든 캠페인을 완료했습니다.|クラシックのすべてのキャンペーンをクリアしました。|Все кампании Классики пройдены.|Wszystkie kampanie trybu Klasycznego ukończone." },
    /* v0.3.132: las de la boutique (js/boutique.js): se compran con fichas de oro. shop: r = rara (quieta) o l = legendaria (viva) */
    ...[
      ["ruleta", "r", "Caoba|Mahogany|Acajou|Mogno|Mahagoni|Mogano||桃花心木|마호가니|マホガニー|Красное дерево|Mahoń",
        "Madera de caoba y piezas de marfil.|Mahogany and ivory pieces.|Acajou et pièces d'ivoire.|Mogno e peças de marfim.|Mahagoni und Elfenbeinsteine.|Mogano e pezzi d'avorio.||桃花心木与象牙棋子。|마호가니와 상아 말.|マホガニーと象牙の駒。|Красное дерево и слоновая кость.|Mahoń i kość słoniowa."],
      ["tablero", "r", "Tablero|Game board|Plateau de jeu|Tabuleiro|Spielbrett|Tavoliere||棋盘|게임판|盤面|Игровая доска|Plansza",
        "Madera clara y países lacados.|Light wood and lacquered countries.|Bois clair et pays laqués.|Madeira clara e países laqueados.|Helles Holz, lackierte Länder.|Legno chiaro e paesi laccati.||浅色木板与亮漆国家。|밝은 원목과 칠한 나라들.|明るい木と漆塗りの国々。|Светлое дерево и лакированные страны.|Jasne drewno i lakierowane kraje."],
      ["carrara", "r", "Carrara|Carrara|Carrare|Carrara|Carrara|Carrara||卡拉拉|카라라|カラーラ|Каррара|Carrara",
        "Mármol blanco y piedras de colores.|White marble and coloured stones.|Marbre blanc et pierres colorées.|Mármore branco e pedras coloridas.|Weißer Marmor, bunte Steine.|Marmo bianco e pietre colorate.||白色大理石与彩石。|흰 대리석과 색색의 돌.|白い大理石と色石。|Белый мрамор и цветные камни.|Biały marmur i kolorowe kamienie."],
      ["nero", "r", "Mármol negro|Black marble|Marbre noir|Mármore negro|Schwarzer Marmor|Marmo nero||黑色大理石|흑대리석|黒大理石|Чёрный мрамор|Czarny marmur",
        "Mármol negro y piezas de marfil.|Black marble and ivory pieces.|Marbre noir et pièces d'ivoire.|Mármore negro e peças de marfim.|Schwarzer Marmor, Elfenbeinsteine.|Marmo nero e pezzi d'avorio.||黑大理石与象牙棋子。|흑대리석과 상아 말.|黒大理石と象牙の駒。|Чёрный мрамор и слоновая кость.|Czarny marmur i kość słoniowa."],
      ["pizarra", "r", "Pizarra|Chalkboard|Tableau noir|Lousa|Schiefertafel|Lavagna||黑板|칠판|黒板|Школьная доска|Tablica",
        "Fronteras de tiza sobre la pizarra.|Chalk borders on a chalkboard.|Frontières à la craie sur le tableau.|Fronteiras de giz na lousa.|Kreidegrenzen auf der Tafel.|Confini di gesso sulla lavagna.||黑板上的粉笔边界。|칠판 위 분필 국경선.|黒板にチョークの国境線。|Границы мелом на доске.|Granice kredą na tablicy."],
      ["vegas", "r", "Las Vegas|Las Vegas|Las Vegas|Las Vegas|Las Vegas|Las Vegas||拉斯维加斯|라스베이거스|ラスベガス|Лас-Вегас|Las Vegas",
        "Neón cian y rosa sobre negro.|Cyan and pink neon on black.|Néon cyan et rose sur noir.|Neon ciano e rosa sobre preto.|Cyan und Pink Neon auf Schwarz.|Neon ciano e rosa sul nero.||黑底上的青色与粉色霓虹。|검은 바탕의 청록·분홍 네온.|黒地にシアンとピンクのネオン。|Бирюзовый и розовый неон на чёрном.|Błękitny i różowy neon na czerni."],
      ["nautica", "r", "Carta náutica|Nautical chart|Carte marine|Carta náutica|Seekarte|Carta nautica||航海图|해도|海図|Морская карта|Mapa morska",
        "Pergamino de capitán con rumbos.|A captain's parchment with rhumb lines.|Parchemin de capitaine et routes.|Pergaminho de capitão com rumos.|Kapitänspergament mit Kurslinien.|Pergamena da capitano con rotte.||带航向线的船长羊皮纸。|항로선이 그려진 선장의 양피지.|航路線入りの船長の羊皮紙。|Капитанский пергамент с румбами.|Kapitański pergamin z kursami."],
      ["fondo", "r", "Fondo marino|Seabed|Fonds marins|Fundo do mar|Meeresgrund|Fondale marino||海底|해저|海底|Морское дно|Dno morskie",
        "El mar por capas, de la orilla a la fosa.|The sea in layers, shore to trench.|La mer par couches, du rivage à la fosse.|O mar em camadas, da praia à fossa.|Das Meer in Schichten, vom Ufer zum Graben.|Il mare a strati, dalla riva alla fossa.||从岸边到海沟的分层海洋。|해안에서 해구까지 층을 이룬 바다.|岸から海溝まで層になった海。|Море слоями, от берега до впадины.|Morze warstwami, od brzegu po rów."],
      ["cianotipo", "r", "Plano|Blueprint|Plan d'architecte|Planta|Blaupause|Cianografia||蓝图|청사진|青図|Чертёж|Plan",
        "Cianotipo, como el plano de un arquitecto.|Blueprint paper, an architect's plan.|Cyanotype, plan d'architecte.|Cianotipia, planta de arquiteto.|Blaupause wie ein Architektenplan.|Cianografia, progetto d'architetto.||蓝晒纸，建筑师图纸。|건축가의 청사진 종이.|建築家の青焼き図面。|Синька, чертёж архитектора.|Cyjanotyp, plan architekta."],
      ["laton", "r", "Cámara acorazada|Vault|Chambre forte|Cofre-forte|Tresorraum|Caveau||金库|금고|金庫室|Хранилище|Skarbiec",
        "Latón de caja fuerte y países de ébano.|Safe brass and ebony countries.|Laiton de coffre et pays d'ébène.|Latão de cofre e países de ébano.|Tresormessing, Länder aus Ebenholz.|Ottone da cassaforte, paesi d'ebano.||保险箱黄铜与乌木国家。|금고 황동과 흑단 나라들.|金庫の真鍮と黒檀の国々。|Латунь сейфа и чёрное дерево.|Mosiądz sejfu i heban."],
      ["moqueta", "r", "Moqueta|Casino carpet|Moquette|Carpete|Casinoteppich|Moquette||赌场地毯|카지노 카펫|カジノの絨毯|Ковёр казино|Wykładzina",
        "La moqueta granate de los casinos.|The burgundy casino carpet.|La moquette grenat des casinos.|O carpete grená dos cassinos.|Der weinrote Casinoteppich.|La moquette granata dei casinò.||赌场的酒红色地毯。|카지노의 와인빛 카펫.|カジノの深紅の絨毯。|Бордовый ковёр казино.|Bordowa wykładzina kasyna."],
      ["hielo", "r", "Banquisa|Pack ice|Banquise|Banquisa|Packeis|Banchisa||浮冰|유빙|流氷|Паковый лёд|Pak lodowy",
        "Placas de hielo del Ártico.|Arctic ice floes.|Plaques de glace arctique.|Placas de gelo do Ártico.|Arktische Eisschollen.|Lastre di ghiaccio artico.||北极的浮冰。|북극의 얼음판.|北極の氷盤。|Арктические льдины.|Arktyczne kry."],
      ["tele", "l", "Tele de tubo|Tube TV|Télé cathodique|TV de tubo|Röhrenfernseher|TV a tubo||显像管电视|브라운관 TV|ブラウン管テレビ|Ламповый телевизор|Telewizor kineskopowy",
        "Blanco y negro con pantalla de tubo.|Black and white on a tube screen.|Noir et blanc, écran cathodique.|Preto e branco, tela de tubo.|Schwarzweiß auf Röhrenbildschirm.|Bianco e nero, schermo a tubo.||显像管黑白画面。|브라운관 흑백 화면.|ブラウン管の白黒画面。|Чёрно-белый кинескоп.|Czarno-biały kineskop."],
      ["cine", "l", "Noticiario|Newsreel|Actualités|Cinejornal|Wochenschau|Cinegiornale||新闻片|뉴스릴|ニュース映画|Кинохроника|Kronika filmowa",
        "Película antigua en sepia.|Old sepia film.|Vieux film sépia.|Filme antigo em sépia.|Alter Sepiafilm.|Vecchia pellicola seppia.||老式棕褐色胶片。|오래된 세피아 필름.|古いセピアのフィルム。|Старая плёнка в сепии.|Stary film w sepii."],
      ["laca", "l", "Laca de oro|Gold lacquer|Laque d'or|Laca de ouro|Goldlack|Lacca d'oro||金漆|금칠|金蒔絵|Золотой лак|Złoty lakier",
        "Laca negra con costas de oro.|Black lacquer with gold coasts.|Laque noire aux côtes d'or.|Laca preta com costas de ouro.|Schwarzlack mit Goldküsten.|Lacca nera con coste d'oro.||金色海岸的黑漆。|금빛 해안선의 검은 옻칠.|金の海岸線の黒漆。|Чёрный лак с золотыми берегами.|Czarny lakier ze złotym brzegiem."],
      ["brasas", "l", "Brasas|Embers|Braises|Brasas|Glut|Brace||余烬|잉걸불|熾火|Угли|Żar",
        "Ceniza y brasas bajo cada costa.|Ash and embers under every coast.|Cendres et braises sous chaque côte.|Cinzas e brasas sob cada costa.|Asche und Glut unter jeder Küste.|Cenere e brace sotto ogni costa.||每道海岸下的灰烬与余火。|해안마다 재와 잉걸불.|海岸線の下の灰と熾火。|Пепел и угли под каждым берегом.|Popiół i żar pod wybrzeżami."],
      ["azulejo", "r", "Azulejo|Azulejo tiles|Azulejo|Azulejo|Azulejo|Maiolica||彩绘瓷砖|아줄레주|アズレージョ|Азулежу|Azulejo",
        "Azulejos pintados a mano en azul cobalto.|Hand-painted cobalt-blue tiles.|Carreaux peints à la main, bleu cobalt.|Azulejos pintados à mão em azul-cobalto.|Handbemalte Kacheln in Kobaltblau.|Piastrelle dipinte a mano, blu cobalto.||手绘钴蓝瓷砖。|코발트블루 손그림 타일.|コバルトブルーの手描きタイル。|Изразцы с ручной росписью кобальтом.|Ręcznie malowane kafle w kobalcie."],
      ["cuaderno", "r", "Cuaderno|Notebook|Cahier|Caderno|Schulheft|Quaderno||笔记本|공책|ノート|Тетрадь|Zeszyt",
        "Papel de cuadros con margen rojo.|Squared paper with a red margin.|Papier quadrillé à marge rouge.|Papel quadriculado com margem vermelha.|Kariertes Papier mit rotem Rand.|Carta a quadretti col margine rosso.||带红色页边的方格纸。|빨간 여백의 모눈 종이.|赤い余白の方眼紙。|Клетчатая бумага с красными полями.|Papier w kratkę z czerwonym marginesem."],
      ["bolsillo", "r", "Bolsillo|Handheld|Console portable|Portátil|Handheld|Portatile||掌机|휴대용 게임기|携帯ゲーム機|Карманная консоль|Konsolka",
        "Consola de bolsillo: cuatro verdes y tramado.|Handheld console: four greens and dithering.|Console portable : quatre verts, tramage.|Console portátil: quatro verdes e pontilhado.|Handheld: vier Grüntöne und Raster.|Console portatile: quattro verdi e retino.||掌机：四种绿色与抖动。|휴대용 게임기: 네 가지 초록과 디더링.|携帯ゲーム機。4色の緑とディザ。|Карманная консоль: четыре зелёных и растр.|Konsolka: cztery zielenie i rastrowanie."],
      ["ajedrez", "r", "Ajedrez|Chess|Échecs|Xadrez|Schach|Scacchi||国际象棋|체스|チェス|Шахматы|Szachy",
        "Casillas de nogal y arce.|Walnut and maple squares.|Cases de noyer et d'érable.|Casas de nogueira e bordo.|Felder aus Nussbaum und Ahorn.|Caselle di noce e acero.||胡桃木与枫木的格子。|호두나무와 단풍나무 칸.|クルミとメープルのマス目。|Клетки из ореха и клёна.|Pola z orzecha i klonu."],
      ["despacho", "r", "Despacho|Study|Bureau|Escritório|Arbeitszimmer|Studio||书房|서재|書斎|Кабинет|Gabinet",
        "Cuero verde con greca de oro.|Green leather with a gold fret.|Cuir vert à grecque d'or.|Couro verde com greca de ouro.|Grünes Leder mit goldener Bordüre.|Cuoio verde con greca d'oro.||绿皮革配金色回纹。|금빛 문양의 초록 가죽.|金の雷文入りの緑の革。|Зелёная кожа с золотым узором.|Zielona skóra ze złotym meandrem."],
      ["jade", "r", "Jade|Jade|Jade|Jade|Jade|Giada||翡翠|비취|翡翠|Нефрит|Jadeit",
        "Jade pulido con nubes y reflejo.|Polished jade with clouds and gleam.|Jade poli, nuages et reflet.|Jade polido com nuvens e reflexo.|Polierte Jade mit Wolken und Glanz.|Giada lucida con nuvole e riflesso.||带云纹与光泽的翡翠。|구름무늬와 광택의 비취.|雲模様と光沢の翡翠。|Полированный нефрит с бликом.|Polerowany jadeit z połyskiem."],
      ["seda", "r", "Seda|Silk|Soie|Seda|Seide|Seta||丝绸|실크|シルク|Шёлк|Jedwab",
        "Raso granate de pliegues brillantes.|Burgundy satin with shimmering folds.|Satin grenat aux plis brillants.|Cetim grená de dobras brilhantes.|Weinroter Satin mit schimmernden Falten.|Raso granata dalle pieghe lucenti.||酒红色缎面，褶皱闪光。|반짝이는 주름의 와인빛 새틴.|ひだが光る深紅のサテン。|Бордовый атлас с блестящими складками.|Bordowy atłas z lśniącymi fałdami."],
      ["acuarela", "r", "Acuarela|Watercolour|Aquarelle|Aquarela|Aquarell|Acquerello||水彩|수채화|水彩画|Акварель|Akwarela",
        "Aguadas azules y países a la acuarela.|Blue washes and watercolour countries.|Lavis bleus et pays à l'aquarelle.|Aguadas azuis e países em aquarela.|Blaue Lasuren und Aquarell-Länder.|Lavature azzurre e paesi ad acquerello.||蓝色晕染与水彩国家。|푸른 물감과 수채화 나라들.|青いにじみと水彩の国々。|Голубые заливки и акварельные страны.|Błękitne lawunki i kraje w akwareli."],
      ["aurora", "l", "Aurora|Aurora|Aurore boréale|Aurora|Polarlicht|Aurora||极光|오로라|オーロラ|Северное сияние|Zorza polarna",
        "Aurora verde y violeta sobre noche polar.|Green and violet aurora over a polar night.|Aurore verte et violette sur la nuit polaire.|Aurora verde e violeta sobre a noite polar.|Grün-violettes Polarlicht über der Polarnacht.|Aurora verde e viola sulla notte polare.||极夜中绿紫色的极光。|극야 위의 초록·보라 오로라.|極夜に揺れる緑と紫のオーロラ。|Зелёно-фиолетовое сияние над полярной ночью.|Zielono-fioletowa zorza nad polarną nocą."],
      ["tesoro", "l", "Tesoro|Treasure|Trésor|Tesouro|Schatz|Tesoro||宝藏|보물|宝物|Сокровище|Skarb",
        "Mar de oro fundido, países de ébano.|A sea of molten gold, ebony countries.|Mer d'or en fusion, pays d'ébène.|Mar de ouro fundido, países de ébano.|Meer aus flüssigem Gold, Länder aus Ebenholz.|Mare d'oro fuso, paesi d'ebano.||熔金之海，乌木色国家。|녹은 황금의 바다, 흑단 나라들.|溶けた金の海と黒檀の国々。|Море расплавленного золота, страны из чёрного дерева.|Morze płynnego złota, kraje z hebanu."],
      ["neonvivo", "l", "Neón vivo|Live neon|Néon vivant|Neon vivo|Lebendiges Neon|Neon vivo||活力霓虹|살아있는 네온|生きたネオン|Живой неон|Żywy neon",
        "Las Vegas encendida: el halo late y parpadea.|Las Vegas lit up: the halo pulses and flickers.|Las Vegas allumée : le halo pulse et clignote.|Las Vegas acesa: o halo pulsa e pisca.|Las Vegas an: Der Schein pulsiert und flackert.|Las Vegas accesa: l'alone pulsa e sfarfalla.||点亮的拉斯维加斯：光晕搏动闪烁。|불 켜진 라스베이거스: 후광이 뛰고 깜빡입니다.|灯ったラスベガス。光が脈打ちまたたく。|Лас-Вегас в огнях: ореол пульсирует и мигает.|Rozświetlone Las Vegas: poświata pulsuje i mruga."],
      ["recreativa", "l", "Recreativa|Arcade|Borne d'arcade|Fliperama|Arcade-Automat|Cabinato arcade||街机|아케이드|アーケード|Аркада|Automat arcade",
        "Cristal curvo y olas de 8 bits.|Curved arcade glass and 8-bit waves.|Verre bombé et vagues 8 bits.|Vidro curvo e ondas de 8 bits.|Gewölbtes Glas und 8-Bit-Wellen.|Vetro curvo e onde a 8 bit.||弧面玻璃与8位海浪。|둥근 유리와 8비트 파도.|丸いガラスと8ビットの波。|Выпуклое стекло и 8-битные волны.|Wypukłe szkło i fale 8-bit."],
      ["tormenta", "l", "Tormenta|Storm|Tempête|Tempestade|Gewitter|Tempesta||风暴|폭풍|嵐|Гроза|Burza",
        "Nubes que pasan y relámpagos.|Passing clouds and lightning.|Nuages qui passent et éclairs.|Nuvens que passam e relâmpagos.|Ziehende Wolken und Blitze.|Nuvole che passano e lampi.||飘过的云影与闪电。|지나가는 구름과 번개.|流れる雲と稲妻。|Плывущие тучи и молнии.|Przesuwające się chmury i błyskawice."],
      ["nacar", "l", "Nácar|Mother of pearl|Nacre|Madrepérola|Perlmutt|Madreperla||珍珠母|자개|螺鈿|Перламутр|Perłamutr",
        "Tornasol de concha que cambia despacio.|Shell iridescence that slowly shifts.|Irisation de coquillage qui change.|Iridescência de concha que muda devagar.|Muschelglanz, der langsam wechselt.|Iridescenza di conchiglia che cambia.||缓缓变色的贝壳虹彩。|천천히 변하는 조개의 무지갯빛.|ゆっくり色が変わる貝の光沢。|Переливы раковины, медленно меняющие цвет.|Opalizujący blask muszli."],
      ["corcho", "r", "Corcho|Cork board|Liège|Cortiça|Korkbrett|Sughero||软木板|코르크판|コルクボード|Пробка|Tablica korkowa",
        "Tablón de corcho con notas de colores.|Cork board with coloured notes.|Panneau de liège aux notes colorées.|Mural de cortiça com bilhetes coloridos.|Korkwand mit bunten Zetteln.|Bacheca di sughero con bigliettini colorati.||贴着彩色便签的软木板。|색색 메모지가 붙은 코르크판.|色とりどりのメモのコルクボード。|Пробковая доска с цветными бумажками.|Tablica korkowa z kolorowymi karteczkami."],
      ["zen", "r", "Jardín zen|Zen garden|Jardin zen|Jardim zen|Zen-Garten|Giardino zen||枯山水|젠 정원|枯山水|Сад дзен|Ogród zen",
        "Arena rastrillada alrededor de cada costa.|Raked sand around every coast.|Sable ratissé autour de chaque côte.|Areia rastelada ao redor de cada costa.|Geharkter Sand um jede Küste.|Sabbia rastrellata attorno a ogni costa.||环绕海岸耙出纹路的沙子。|해안마다 갈퀴로 고른 모래.|海岸線ごとに筋を引いた砂。|Разровненный песок вокруг берегов.|Zagrabiony piasek wokół wybrzeży."],
      ["bordado", "r", "Punto de cruz|Cross-stitch|Point de croix|Ponto cruz|Kreuzstich|Punto croce||十字绣|십자수|クロスステッチ|Вышивка|Haft krzyżykowy",
        "El mar bordado a punto de cruz.|The sea in cross-stitch.|La mer brodée au point de croix.|O mar bordado em ponto cruz.|Das Meer in Kreuzstich.|Il mare a punto croce.||十字绣绣成的大海。|십자수로 수놓은 바다.|クロスステッチの海。|Море, вышитое крестиком.|Morze haftowane krzyżykiem."],
      ["teselas", "r", "Mosaico romano|Roman mosaic|Mosaïque romaine|Mosaico romano|Römisches Mosaik|Mosaico romano||罗马马赛克|로마 모자이크|ローマ式モザイク|Мозаика|Rzymska mozaika",
        "Un mar de teselas con su lechada.|A sea of tesserae and grout.|Une mer de tesselles et de joints.|Um mar de tesselas com rejunte.|Ein Meer aus Steinchen und Fugen.|Un mare di tessere e stuccatura.||由小石块和灰缝拼成的海。|타일 조각과 줄눈의 바다.|テッセラと目地の海。|Море из смальты с затиркой.|Morze kosteczek z fugami."],
      ["bloques", "r", "Bloques|Building blocks|Briques|Blocos|Bausteine|Mattoncini||积木|블록|ブロック|Кубики|Klocki",
        "Placa de piezas de construcción.|A building-brick baseplate.|Une plaque de briques à tenons.|Placa de peças de montar.|Eine Bauplatte mit Noppen.|Una base di mattoncini.||积木底板。|블록 바닥판.|ブロックの土台。|Строительная пластина с кубиками.|Płyta z klocków."],
      ["periodico", "r", "Periódico|Newspaper|Journal|Jornal|Zeitung|Giornale||报纸|신문|新聞|Газета|Gazeta",
        "Papel de prensa con texto y trama.|Newsprint with text and halftone.|Papier journal, texte et trame.|Papel-jornal com texto e retícula.|Zeitungspapier mit Text und Raster.|Carta da giornale con testo e retino.||带文字和网点的报纸。|글과 망점이 있는 신문지.|文字と網点の新聞紙。|Газетная бумага с текстом и растром.|Papier gazetowy z tekstem i rastrem."],
      ["tartan", "r", "Tartán|Tartan|Tartan|Tartan|Tartan|Tartan||格子呢|타탄|タータン|Тартан|Tartan",
        "Lana de cuadros verdes y azules.|Green and blue plaid wool.|Laine à carreaux verts et bleus.|Lã xadrez verde e azul.|Karierte Wolle in Grün und Blau.|Lana a quadri verdi e blu.||绿蓝格子呢。|초록·파랑 체크 울.|緑と青のチェックのウール。|Шерсть в зелёно-синюю клетку.|Wełna w zielono-niebieską kratę."],
      ["vitral", "r", "Vitral|Stained glass|Vitrail|Vitral|Buntglasfenster|Vetrata||彩色玻璃|스테인드글라스|ステンドグラス|Витраж|Witraż",
        "Cristales de colores unidos por plomo.|Coloured glass held by lead.|Verres colorés sertis de plomb.|Vidros coloridos unidos por chumbo.|Farbiges Glas in Bleifassung.|Vetri colorati uniti dal piombo.||铅条拼接的彩色玻璃。|납선으로 이은 색유리.|鉛の枠でつないだ色ガラス。|Цветные стёкла в свинцовом переплёте.|Kolorowe szkła w ołowiu."],
      ["radar", "l", "Radar|Radar|Radar|Radar|Radar|Radar||雷达|레이더|レーダー|Радар|Radar",
        "Un barrido enciende cada costa.|A sweep lights up each coast.|Un balayage allume chaque côte.|Uma varredura acende cada costa.|Ein Strahl lässt jede Küste leuchten.|Un sweep accende ogni costa.||扫描线点亮每道海岸。|스윕이 해안선을 밝힙니다.|走査線が海岸線を光らせる。|Луч подсвечивает каждый берег.|Promień rozświetla każde wybrzeże."],
      ["matrix", "l", "Lluvia de código|Code rain|Pluie de code|Chuva de código|Code-Regen|Pioggia di codice||代码雨|코드 비|コードの雨|Дождь кода|Deszcz kodu",
        "Columnas de glifos verdes que caen.|Falling columns of green glyphs.|Colonnes de glyphes verts qui tombent.|Colunas de glifos verdes que caem.|Fallende Spalten grüner Zeichen.|Colonne di glifi verdi che cadono.||落下的绿色字符列。|떨어지는 초록 글자 줄.|降り注ぐ緑の文字列。|Падающие колонки зелёных символов.|Spadające kolumny zielonych znaków."],
      ["lava", "l", "Lámpara de lava|Lava lamp|Lampe à lave|Lâmpada de lava|Lavalampe|Lampada di lava||熔岩灯|라바 램프|ラバランプ|Лава-лампа|Lampa lava",
        "Gotas de cera que huyen del puntero.|Wax blobs that shy from the pointer.|Gouttes de cire qui fuient le pointeur.|Gotas de cera que fogem do ponteiro.|Wachstropfen, die dem Zeiger ausweichen.|Gocce di cera che scappano dal puntatore.||躲开指针的蜡滴。|포인터를 피하는 왁스 방울.|ポインターを避けるワックスの滴。|Капли воска, уходящие от курсора.|Krople wosku unikające kursora."],
      ["piscina", "l", "Piscina|Swimming pool|Piscine|Piscina|Schwimmbad|Piscina||游泳池|수영장|プール|Бассейн|Basen",
        "Reflejos de agua que ondulan al clicar.|Water reflections that ripple on click.|Reflets d'eau qui ondulent au clic.|Reflexos de água que ondulam ao clicar.|Wasserspiegelungen, die beim Klick wellen.|Riflessi d'acqua che ondeggiano al clic.||点击时泛起涟漪的水光。|클릭하면 일렁이는 물빛.|クリックで波打つ水の反射。|Отражения воды с рябью от клика.|Refleksy wody falujące po kliknięciu."],
      ["vhs", "l", "Cinta VHS|VHS tape|Cassette VHS|Fita VHS|VHS-Kassette|Videocassetta VHS||VHS 录像带|VHS 테이프|VHSテープ|Кассета VHS|Kaseta VHS",
        "Pantalla azul de vídeo de los noventa.|A nineties blue video screen.|Un écran vidéo bleu des années 90.|Uma tela de vídeo azul dos anos 90.|Ein blauer Videobildschirm der Neunziger.|Uno schermo video blu anni Novanta.||九十年代的蓝色录像画面。|90년대 파란 비디오 화면.|90年代の青いビデオ画面。|Синий видеоэкран девяностых.|Niebieski ekran wideo z lat 90."],
      ["cubos", "r", "Mundo de cubos|Block world|Monde de cubes|Mundo de cubos|Blockwelt|Mondo a cubi||方块世界|블록 세계|ブロックの世界|Мир кубов|Świat klocków",
        "El mar y la tierra en bloques de píxeles.|Sea and land in pixel blocks.|La mer et la terre en blocs de pixels.|Mar e terra em blocos de pixels.|Meer und Land in Pixelblöcken.|Mare e terra in blocchi di pixel.||像素方块构成的海与陆。|픽셀 블록으로 된 바다와 땅.|ピクセルブロックの海と大地。|Море и земля из пиксельных блоков.|Morze i ląd z pikselowych bloków."],
      ["mazmorra", "r", "Mazmorra|Dungeon|Donjon|Masmorra|Verlies|Dungeon||地下城|던전|ダンジョン|Подземелье|Loch",
        "Muros de piedra con musgo.|Stone walls with moss.|Murs de pierre moussus.|Muros de pedra com musgo.|Steinmauern mit Moos.|Mura di pietra con muschio.||长着苔藓的石墙。|이끼 낀 돌벽.|苔むした石の壁。|Каменные стены с мхом.|Kamienne mury z mchem."],
      ["reverso", "r", "Reverso|Card back|Dos de carte|Verso|Kartenrücken|Dorso||牌背|카드 뒷면|カードの裏|Рубашка|Rewers",
        "El dorso de una baraja.|The back of a card deck.|Le dos d'un jeu de cartes.|O verso de um baralho.|Die Rückseite eines Kartenspiels.|Il dorso di un mazzo di carte.||一副扑克牌的牌背。|카드 덱의 뒷면.|トランプの裏面。|Рубашка колоды карт.|Rewers talii kart."],
      ["minas", "r", "Campo de minas|Minefield|Champ de mines|Campo minado|Minenfeld|Campo minato||扫雷|지뢰밭|地雷原|Сапёр|Pole minowe",
        "Casillas con relieve y números.|Raised tiles with numbers.|Cases en relief avec chiffres.|Casas em relevo com números.|Erhabene Felder mit Zahlen.|Caselle in rilievo con numeri.||带数字的凸起方格。|숫자가 있는 입체 칸.|数字つきの立体マス。|Выпуклые клетки с цифрами.|Wypukłe pola z cyframi."],
      ["policroma", "l", "Policroma|Polychrome|Polychrome|Policroma|Polychrom|Policroma||多彩|폴리크롬|ポリクローム|Полихром|Polichrom",
        "Degradado vivo que se inclina con el puntero.|Vivid gradient that tilts with the pointer.|Dégradé vif qui s'incline avec le pointeur.|Degradê vivo que se inclina com o ponteiro.|Lebendiger Verlauf, der dem Zeiger folgt.|Sfumatura viva che segue il puntatore.||随指针倾斜的鲜艳渐变。|포인터에 따라 기우는 선명한 그라데이션.|ポインターで傾く鮮やかなグラデーション。|Яркий градиент, наклоняющийся за курсором.|Żywy gradient pochylający się za kursorem."],
      ["hiperespacio", "l", "Hiperespacio|Hyperspace|Hyperespace|Hiperespaço|Hyperraum|Iperspazio||超空间|하이퍼스페이스|ハイパースペース|Космос|Kosmos",
        "Estrellas que se mueven con el mapa.|Stars that move with the map.|Étoiles qui bougent avec la carte.|Estrelas que se movem com o mapa.|Sterne, die mit der Karte wandern.|Stelle che si muovono con la mappa.||随地图移动的星星。|지도와 함께 움직이는 별.|マップと一緒に動く星々。|Звёзды, плывущие вместе с картой.|Gwiazdy poruszające się z mapą."],
      ["plataformas", "l", "Plataformas|Platformer|Plateformes|Plataformas|Plattformen|Piattaforme||平台跳跃|플랫포머|プラットフォーマー|Платформы|Platformówka",
        "Humo azul de fondo y países de ladrillo.|Blue smoke and brick countries.|Fumée bleue et pays en briques.|Fumaça azul e países de tijolo.|Blauer Rauch und Ziegel-Länder.|Fumo blu e paesi di mattoni.||蓝色烟雾与砖块国家。|푸른 연기와 벽돌 나라들.|青い煙とレンガの国々。|Синий дым и страны из кирпича.|Niebieski dym i kraje z cegieł."],
    ].map(([id, r, n, d]) => ({ id, shop: r, n, d, own: P => !!(P.mesas && P.mesas.own && P.mesas.own[id]) })),
  ];
  const prof = () => A.profile.get();
  const mem = () => { const P = prof(); if (!P.mesas || typeof P.mesas !== "object" || Array.isArray(P.mesas)) P.mesas = { use: "casino", seen: {} }; if (!P.mesas.seen || typeof P.mesas.seen !== "object") P.mesas.seen = {};
    if (!P.mesas.own || typeof P.mesas.own !== "object") P.mesas.own = {}; return P.mesas; };
  const fill = (s, n) => A.pick6(s).replace("{n}", n);
  /* la boutique: precio en fichas de oro (rara 150, legendaria 400) y la oferta de la casa: una mesa que aun no tienes, -30 %, que cambia cada lunes */
  const PRICE = { r: 150, l: 400 }, OFF = 0.3;
  const SHOP_HOW = "En la tienda del Club: {n} fichas de oro.|In the Club boutique: {n} gold chips.|À la boutique du Club : {n} jetons d'or.|Na boutique do Clube: {n} fichas de ouro.|In der Club-Boutique: {n} Goldchips.|Nella boutique del Club: {n} fiche d'oro.||在俱乐部精品店：{n} 金筹码。|클럽 부티크에서: 골드 칩 {n}개.|クラブのブティックで金のチップ{n}枚。|В бутике клуба: {n} золотых фишек.|W butiku klubu: {n} złotych żetonów.";
  const SHOP_WON = "Comprada en la tienda del Club.|Bought in the Club boutique.|Achetée à la boutique du Club.|Comprada na boutique do Clube.|In der Club-Boutique gekauft.|Comprata nella boutique del Club.||在俱乐部精品店购得。|클럽 부티크에서 구입했어요.|クラブのブティックで購入。|Куплен в бутике клуба.|Kupiony w butiku klubu.";
  const weekNo = (t = Date.now()) => Math.floor((t / 864e5 + 3) / 7);       // semanas que empiezan en lunes (el 1-1-1970 fue jueves)
  A.mesas = {
    list: A.MESAS,
    get: id => A.MESAS.find(m => m.id === id) || A.MESAS[0],
    owned: id => { const m = A.MESAS.find(x => x.id === id); if (!m) return false; try { return !!m.own(prof()); } catch (e) { return m.id === "casino"; } },
    count: () => A.MESAS.filter(m => A.mesas.owned(m.id)).length,
    /* la que llevas puesta (si dejo de ser tuya, por ejemplo al reiniciar el perfil, vuelve la de siempre) */
    current: () => { const u = mem().use; return u && A.MAPSTYLES[u] && A.mesas.owned(u) ? u : "casino"; },
    style: () => A.MAPSTYLES[A.mesas.current()] || A.MAPSTYLES.casino,
    use(id) { if (!A.MAPSTYLES[id] || !A.mesas.owned(id)) return false; mem().use = id; A.profile.save(); const map = A.core && A.core.map; if (map && map.setStyle && !(A.codex && A.codex.isOpen && A.codex.isOpen())) map.setStyle(A.mesas.style()); return true; },
    /* ganadas y aun sin estrenar (js/mesas.js) */
    fresh: () => A.MESAS.filter(m => m.id !== "casino" && !m.shop && A.mesas.owned(m.id) && !mem().seen[m.id]).map(m => m.id),   // el estreno con cartel es solo de las que se ganan jugando: las que compras ya quedan puestas en la tienda
    seen(ids) { const s = mem().seen, t = Date.now(); ids.forEach(id => { s[id] = t; }); A.profile.save(); },
    name: id => A.pick6(A.mesas.get(id).n),
    desc: id => A.pick6(A.mesas.get(id).d),
    how: id => { const m = A.mesas.get(id); return m.shop ? fill(SHOP_HOW, A.fmt ? A.fmt(A.mesas.price(id)) : A.mesas.price(id)) : m.asc ? fill(ASC_HOW, m.asc) : fill(m.how, classic().length); },
    won: id => { const m = A.mesas.get(id); return m.shop ? A.pick6(SHOP_WON) : m.asc ? fill(ASC_WON, m.asc) : A.pick6(m.won || ""); },
    /* ---- la boutique (js/boutique.js) */
    shop: () => A.MESAS.filter(m => m.shop),
    tier: id => A.mesas.get(id).shop || "",
    full: id => PRICE[A.mesas.get(id).shop] || 0,
    /* el precio de hoy: la oferta de la semana (-30 %) o la ganga del escaparate (-40 %, js/escaparate.js), la mayor */
    price: id => { const f = A.mesas.full(id), o = A.mesas.offer(), w = o && o.id === id && !A.mesas.owned(id) ? OFF : 0, e = A.escaparate && A.escaparate.off ? A.escaparate.off("m:" + id) : 0, d = Math.max(w, e); return d ? Math.round(f * (1 - d) / 10) * 10 : f; },
    /* la oferta de la semana: se elige el lunes entre las que aun no tienes y se queda toda la semana (si la compras, la semana sigue con ella) */
    offer() {
      const s = mem(), w = weekNo();
      if (!s.offer || s.offer.w !== w || !A.MAPSTYLES[s.offer.id]) {
        const left = A.mesas.shop().filter(m => !A.mesas.owned(m.id));
        if (!left.length) return null;
        const h = A.rank && A.rank.hash ? A.rank.hash(prof().id + ":oferta:" + w) : w * 7919;
        s.offer = { w, id: left[h % left.length].id }; A.profile.save();
      }
      return { id: s.offer.id, off: OFF, until: (w + 1) * 7 * 864e5 - 3 * 864e5 };
    },
    /* compra: cobra las fichas de oro (A.club.spend) y la mesa es tuya; el estreno lo hace la portada al volver (A.mesas.fresh) */
    buy(id) {
      const m = A.mesas.get(id); if (!m.shop || A.mesas.owned(id) || !A.club || !A.club.spend) return false;
      if (!A.club.spend(A.mesas.price(id))) return false;
      mem().own[id] = Date.now(); A.profile.save(); return true;
    },
    /* darla sin cobrar (el lote del escaparate) */
    give(id) { const m = A.mesas.get(id); if (!m.shop || A.mesas.owned(id)) return false; mem().own[id] = Date.now(); A.profile.save(); return true; },
  };

  const N = (es, en, fr, pt, de, it) => ({ es, en, fr, pt, de, it });
  A.SKINS = {
    casino: { name: N("Casino", "Casino", "Casino", "Cassino", "Casino", "Casinò"), swatch: ["#1f7a63", "#fe5f55", "#f8b449"], theme: "#0f3b3a", music: { bpm: 92, sw: 0.34, shift: 0, mod: 1, idx: 2.6 } },
  };
  A.SKIN_ORDER = ["casino"];
  A.skin = "casino";

  /* aplica un skin a toda la aplicacion */
  A.applySkin = (id, map) => {
    if (!A.SKINS[id]) id = "casino";
    A.skin = id;
    document.documentElement.dataset.skin = id;
    const mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.content = A.SKINS[id].theme;
    if (map && map.setStyle) map.setStyle(A.mesas.style());            // v0.3.62: el mapa lleva la mesa que hayas elegido (Perfil > Mesas)
    if (A.audio && A.audio.setSkin) A.audio.setSkin(A.SKINS[id].music);
  };
})(window.AIQ);
