/*
 * Geolite - NOTAS DEL PARCHE: los datos (js/parche.js los pinta; css/parche.css los viste).
 *
 * El numero del parche es el de la version del juego (0.3.0, 0.3.1...). El jugador los ve desde el icono del cuaderno, en la esquina
 * inferior izquierda de la portada, y navega por los anteriores en la lista de la izquierda.
 *
 * REGLA: un parche PUBLICADO queda CERRADO. Todo cambio posterior (aunque sea pequeno) va a un parche NUEVO, nunca como edicion de uno anterior.
 *
 * COMO ANADIR UN PARCHE NUEVO
 *   1. Si lleva capturas del juego real (webp, ~1100 px de ancho), ponlas en assets/parche/ y anade su tamano real a `SZ` (ancho, alto).
 *   2. Anade UN objeto al PRINCIPIO de `A.PATCHES` (el mas nuevo va primero; la lista y el punto rojo de "nuevo" salen solos):
 *        { id: "0.3.1", name: ["Nombre", "Name"], date: "2026-11-01",
 *          summary: ["Resumen de un parrafo.", "One-paragraph summary."],
 *          chapters: [ { id: "x", kicker: [..], title: [..], intro: [..],
 *                        cards:   [ { name: [..], text: [..] } ],                 // opcional: tarjetas de "Lo mas destacado"
 *                        entries: [ E(nombre, etiqueta, "version del juego", [lineas], [imagenes]) ] } ] }
 *   3. La version del juego se sube aparte (CLAUDE.md).
 *
 * FORMATO DE LOS TEXTOS: ["espanol", "english"]. Los otros 10 idiomas caen al ingles; si algun dia se traduce uno, se pasa un objeto
 * { es, en, fr, pt, de, it, "es-419", zh, ko, ja, ru, pl } en lugar del par. Una cadena suelta vale para todos los idiomas.
 * Dentro de un texto, **asi** pone negrita (nada de HTML: se escapa todo).
 * ETIQUETAS: new (Nuevo) change (Cambio) buff (Mejora) nerf (Ajuste) fix (Arreglo) out (Sale) merge (Fusion).
 * IMAGENES: I("archivo-sin-extension", ["pie es", "caption en"], "wide" | "half" | "third" | "tall").
 */
window.AIQ = window.AIQ || {};
(function (A) {
  /* ancho y alto reales de cada imagen de assets/parche/ */
  const SZ = {};
  const I = (src, cap, size) => ({ src, cap, size: size || "wide", w: (SZ[src] || [1100, 618])[0], h: (SZ[src] || [1100, 618])[1] });
  const E = (name, tag, ver, items, imgs) => ({ name, tag, ver, items, imgs: imgs || [] });

  A.PATCHES = [
    {
      id: "0.3.0",
      name: ["Build limpia", "A clean build"],
      date: "2026-10-07",
      summary: ["Geolite se queda solo con lo que es hoy. Cada tarjeta de la Enciclopedia enseña la foto de su lugar, el aviso de tarjeta nueva trae foto grande e información, y la numeración pasa a 0.3.N.",
        "Geolite keeps only what it is today. Every Encyclopedia card shows the photo of its place, the new-card notice comes with a large photo and information, and numbering moves to 0.3.N."],
      chapters: [
        { id: "enciclopedia", kicker: ["Enciclopedia", "Encyclopedia"], title: ["Una foto en cada tarjeta", "A photo on every card"],
          intro: ["Cada lugar es una carta con tres niveles (bronce, plata y oro) y los tres comparten su foto.",
            "Each place is one card with three levels (bronze, silver and gold) and all three share its photo."],
          entries: [
            E(["Aviso de tarjeta nueva", "New card notice"], "change", "0.3.0", [
              ["Al acertar un lugar, el aviso enseña su **foto** en grande con el nombre, el país y una línea de descripción. Espera a que la foto cargue en vez de enseñar un icono.", "When you nail a place, the notice shows its **photo** large, with its name, country and a one-line description. It waits for the photo to load instead of showing an icon."]
            ]),
            E(["Catorce lugares con foto nueva", "Fourteen places with a new photo"], "fix", "0.3.0", [
              ["Batalla de Zama, Chrysler Building, Cuevas de Ellora, Asedio de Sarajevo, Tratado de Roma, Desastre aéreo de Múnich, Sejong el Grande, Apartheid, Reforma, Bollywood, K-pop, Holi, Qumrán y Níger no tenían foto. Todas son libres para uso comercial y llevan su autor y licencia en los créditos.", "Battle of Zama, Chrysler Building, Ellora Caves, Siege of Sarajevo, Treaty of Rome, Munich air disaster, Sejong the Great, Apartheid, Reformation, Bollywood, K-pop, Holi, Qumran and Niger had no photo. All are free for commercial use and credit their author and licence."]
            ]),
            E(["Sin ilustración de relleno", "No filler artwork"], "out", "0.3.0", [
              ["La ficha de cada tarjeta ya no se tapa con una ilustración por tipo: manda la foto.", "A card's page no longer sits under a filler illustration: the photo comes first."]
            ])
          ] },
        { id: "limpieza", kicker: ["Limpieza", "Clean-up"], title: ["Solo lo que hay hoy", "Only what is here today"],
          intro: ["Esta versión retira lo heredado para que el juego sea exactamente lo que se ve.",
            "This version removes what was left over so the game is exactly what you see."],
          entries: [
            E(["Menos peso muerto", "Less dead weight"], "out", "0.3.0", [
              ["Salen **48 iconos** y **24 escenas** que ningún juego usaba, las notas de parches anteriores y el código que adaptaba partidas guardadas de versiones antiguas.", "Out go **48 icons** and **24 scenes** nothing used, the notes from earlier patches and the code that adapted saves from older versions."]
            ]),
            E(["Nueva numeración", "New numbering"], "change", "0.3.0", [
              ["La versión es **0.3.0**: el 0 inicial es de preproducción, el 3 es el hito en el que estamos y la tercera cifra sube con cada entrega.", "The version is **0.3.0**: the leading 0 means pre-release, 3 is the current milestone and the third digit goes up with every release."]
            ])
          ] }
      ]
    }
  ];
})(window.AIQ);
