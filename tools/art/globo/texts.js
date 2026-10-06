/* El globo - textos de la maqueta (es / en). En el juego final: 12 idiomas con el formato es|en|fr|pt|de|it||zh|ko|ja|ru|pl. */
window.GB_T = (() => {
  const SKIES = [
    { id: "mediodia", es: "Mediodía despejado", en: "Clear noon", t0: 0.26, dt: 0.62, w: "", clouds: 1 },
    { id: "amanecer", es: "Amanecer", en: "Sunrise", t0: 0.0, dt: 0.55, w: "", clouds: 0.8 },
    { id: "atardecer", es: "Atardecer dorado", en: "Golden sunset", t0: 0.48, dt: 0.42, w: "", clouds: 1 },
    { id: "horaazul", es: "Hora azul", en: "Blue hour", t0: 0.74, dt: 0.24, w: "", clouds: 0.8 },
    { id: "tormenta", es: "Tormenta", en: "Storm", t0: 0.30, dt: 0.62, w: "storm", clouds: 1.5 },
    { id: "aurora", es: "Aurora boreal", en: "Northern lights", t0: 0.93, dt: 0.07, w: "", aurora: 1, clouds: 0.3 },
    { id: "luna", es: "Luna llena", en: "Full moon", t0: 0.90, dt: 0.10, w: "", clouds: 0.4 },
    { id: "niebla", es: "Niebla de montaña", en: "Mountain fog", t0: 0.16, dt: 0.55, w: "fog", clouds: 1.4 },
    { id: "cumulos", es: "Cielo de cúmulos", en: "Cumulus sky", t0: 0.30, dt: 0.60, w: "", clouds: 2.0 },
    { id: "crepusculo", es: "Crepúsculo violeta", en: "Violet dusk", t0: 0.66, dt: 0.30, w: "", clouds: 0.9 },
  ];
  const BURSTS = [
    { id: "pajaro", es: "Pinchazo de pájaro", en: "Bird strike", lead: 0.14 }, { id: "rayo", es: "Rayo", en: "Lightning", lead: 0 },
    { id: "granizo", es: "Granizo", en: "Hail", lead: 0.14 }, { id: "meteorito", es: "Meteorito", en: "Meteorite", lead: 0.12 },
    { id: "costura", es: "Costura abierta", en: "Seam rip", lead: 0 }, { id: "fuga", es: "Fuga lenta", en: "Slow leak", lead: 0 },
    { id: "quemador", es: "Se apaga el quemador", en: "Burner out", lead: 0 }, { id: "ovni", es: "Abducción OVNI", en: "UFO abduction", lead: 0.14 },
  ];
  const ALARMS = [   // falsas alarmas: el mismo repertorio visual que los reventones, pero SIN consecuencias
    { id: "pajaro", es: "Pájaro que roza y se va", en: "Bird that grazes and leaves" }, { id: "rayo", es: "Rayo lejano", en: "Distant lightning" },
    { id: "granizo", es: "Granizo suelto", en: "Stray hail" }, { id: "meteorito", es: "Meteoro de paso", en: "Passing meteor" },
    { id: "costura", es: "Crujido de la tela", en: "Fabric creak" }, { id: "fuga", es: "Siseo breve", en: "Short hiss" },
    { id: "quemador", es: "Tos del quemador", en: "Burner cough" }, { id: "ovni", es: "OVNI que pasa de largo", en: "UFO flyby" },
  ];
  const EVENTS = [
    { id: "bandada", es: "Bandada de pájaros", en: "Flock of birds" }, { id: "avion", es: "Avión con estela", en: "Plane with contrail" },
    { id: "globos", es: "Otros globos", en: "Other balloons" }, { id: "ovni", es: "OVNI de paso", en: "Passing UFO" },
    { id: "zeppelin", es: "Zepelín", en: "Zeppelin" }, { id: "meteoros", es: "Lluvia de meteoros", en: "Meteor shower" },
  ];
  const es = {
    card: { n: "El globo", s: "Cobra antes de que reviente. Cuanto más alto, más cobras.", play: "Volar", coin: "Moneda al aire", coinS: "Acierta y cobras el doble de lo apostado.", heads: "Cara", tails: "Cruz", red: "Rojo o negro", redS: "Acierta el color. El verde salta el acto.", redB: "Rojo", blackB: "Negro", greenB: "Verde", wheel: "Ruleta de premios", wheelS: "Premios buenos y malos. Gira y arriésgate.", spin: "Girar" },
    pill: "El globo · ficha", auto: "AUTO", off: "no", go: "DESPEGAR", cashBtn: "COBRAR", cashed: "COBRADO", burst: "REVENTÓ", offBtn: "…", space: "al espacio", ghost: "habrías llegado a", vuelo: "VUELO", of: "DE", bal: "BOLSA", km: "ALT", ready: "Pulsa DESPEGAR · Espacio", fly: "Cobra antes de que reviente",
    plate: { cash: "Cobrado", lose: "Reventó", ceil: "¡Al espacio!", boom1: "Reventó al despegar" }, count: ["3", "2", "1", "¡YA!"],
    say: {
      intro: ["Sube, sube. La gravedad es negociable; yo, no.", "Un globo, una ficha y cero paracaídas. Perfecto.", "Despega con confianza. La tuya, que la mía ya me la gasté.", "Todo listo. El quemador es nuevo. Casi.", "Recuerda: lo que sube, cobra. O revienta.", "No me mires a mí: el reventón ya está decidido."],
      fly: ["¿Notas el vértigo? Es plusvalía.", "Más alto, más caro, más tonto. Cobrar es de sabios.", "El multiplicador sube. Los nervios, también.", "Yo con la mano en el quemador. No toques nada.", "Dicen que desde aquí arriba se ve Geolite entero.", "No mires abajo. Mira el número."],
      cash0: ["¿Cobras tan pronto? Qué prudencia. Qué aburrimiento.", "Tus nervios te lo agradecen. Mi caja, menos.", "Un cobro pequeño. Como las propinas.", "Así se empieza. O así se termina.", "Cobrar pronto no es de cobardes. Es de listos aburridos.", "Poca cosa, pero a la bolsa."],
      cash1: ["Un cobro de manual. Del manual del cobarde decente.", "Bien jugado. Me caes peor.", "Ni mucho ni poco. Justo lo que no me hace llorar.", "Ahí está el equilibrio. Pesa poco, pero se cobra.", "Casi el doble de tu ficha. Aceptable.", "Esto no es ganar, es ir empatando con estilo."],
      cash2: ["¡Eso sí que es subir con estilo!", "Tú no tienes nervios, tienes cable de acero.", "Qué cobro. Voy a tener que cambiar el quemador de sitio.", "Esto empieza a ser peligroso para mi nómina.", "Buen cobro. Guárdalo antes de que me arrepienta.", "A esa altura ya hay oxígeno de pago."],
      cash3: ["¡NO! ¡Eso no! ¡Mi caja!", "Esto es un atraco con globo.", "¡Madre mía! Me tiembla el bigote.", "Voy a pedir que revisen las costuras del universo.", "Cobras más alto de lo que sube mi tensión.", "Anota la hora. Esto no volverá a pasar. Probablemente."],
      burst: ["Pffff. El globo ha dimitido.", "La gravedad siempre cobra. Y a ti te cobró entero.", "Estaba ahí, a un clic... Casi.", "No es culpa mía. Es de la física.", "Gracias por tu donación al aire.", "Eso se llama aterrizaje de emergencia. Sin globo."],
      burst100: ["¡Ni ha despegado! Eso es talento.", "Reventó en la rampa. Qué ahorro de combustible.", "A ×1,00. Estadísticamente inevitable. Humanamente, doloroso.", "El globo ha preferido quedarse en casa.", "Un pinchazo en el suelo. Mi récord de eficiencia.", "No me mires: yo solo hincho."],
      burstHigh: ["¡¡Y no cobraste!! Esto va a la sección de leyendas tristes.", "A esa altura ya era de las nubes... y de las mías.", "Soñar es gratis. Reventar no.", "Podías haber comprado una casa. Pequeña. En una nube.", "Ouch. Eso dolerá cuando lo cuentes.", "Mi caja respira. Tu bolsa llora."],
      closeCall: ["¡¡Por un pelo!! Me has dejado sin espectáculo.", "Cobraste en el último suspiro del globo. Qué asco de reflejos.", "Vaya, qué sangre fría. O qué suerte.", "¡Ay! Eso era mío.", "Cobrar y que reviente al segundo... sospechoso. Muy sospechoso.", "Me lo has quitado de las manos. Literalmente."],
      regret: ["Fíjate a dónde llegaba tu globo. Ay.", "Eso es lo que se llama «y si...».", "Habrías llegado lejos. Pero cobraste. Admirable. Estúpido, pero admirable.", "El fantasma te mira. Con lástima.", "A veces cobrar pronto es sabio. Esta no fue una de ellas.", "No lo mires. Mira la bolsa. La bolsa está bien."],
      relief: ["Bien visto: se rompió justo después. Qué ojo.", "Eso se llama retirarse a tiempo.", "Tu globo fantasma ha tenido un final dramático. El tuyo no.", "Cobrar es un arte. Tú, un artista... barato.", "Pues sí, reventó. Qué alivio. Para ti.", "Lo viste venir. Yo no sé cómo."],
      auto: ["El piloto automático cobra por ti. Casi me despiden.", "Cobro automático: el arte de no mirar.", "Lo has programado y se cumple. Qué poco morbo.", "Mecanizado y aburrido. Como mi sueldo.", "Un robot ha cobrado tu ficha. Yo habría esperado más.", "Disciplina de hierro. O pereza organizada."],
      ceiling: ["¡¡EL TECHO!! ¡Esto no está en el contrato!", "Has llegado al espacio. Hay tasa de aterrizaje.", "×100. Voy a la caja fuerte. A llorar.", "El globo ya no sube más. Ni mi tensión.", "Alguien llame a la NASA. O a mi banco.", "Esto es, oficialmente, un milagro. Dígaselo a mi contable."],
    },
  };
  const en = {
    card: { n: "The balloon", s: "Cash out before it bursts. The higher, the more you win.", play: "Fly", coin: "Coin flip", coinS: "Call it right and win double your stake.", heads: "Heads", tails: "Tails", red: "Red or black", redS: "Call the colour. Green skips the act.", redB: "Red", blackB: "Black", greenB: "Green", wheel: "Prize wheel", wheelS: "Good prizes and bad ones. Spin and risk it.", spin: "Spin" },
    pill: "The balloon · stake", auto: "AUTO", off: "off", go: "TAKE OFF", cashBtn: "CASH OUT", cashed: "CASHED", burst: "BURST", offBtn: "…", space: "to space", ghost: "you would have reached", vuelo: "FLIGHT", of: "OF", bal: "PURSE", km: "ALT", ready: "Press TAKE OFF · Space", fly: "Cash out before it bursts",
    plate: { cash: "Cashed out", lose: "Burst", ceil: "To space!", boom1: "Burst on take-off" }, count: ["3", "2", "1", "GO!"],
    say: {
      intro: ["Up, up. Gravity is negotiable; I'm not.", "One balloon, one chip and zero parachutes. Perfect.", "Take off with confidence. Yours; I've spent mine.", "All set. The burner is new. Nearly.", "Remember: what goes up, cashes out. Or bursts.", "Don't look at me: the burst is already decided."],
      fly: ["Feeling dizzy? That's capital gains.", "Higher, pricier, sillier. Cashing out is for the wise.", "The multiplier goes up. So do the nerves.", "My hand is on the burner. Don't touch anything.", "They say you can see all of Geolite from up here.", "Don't look down. Look at the number."],
      cash0: ["Cashing out that early? How prudent. How dull.", "Your nerves thank you. My till, less so.", "A small payout. Like a tip.", "That's how it starts. Or how it ends.", "Cashing early isn't cowardice. It's boring cleverness.", "Not much, but into the purse."],
      cash1: ["A textbook payout. From the decent coward's textbook.", "Well played. I like you less.", "Not much, not little. Just what doesn't make me cry.", "There's the balance. Light, but cashed.", "Nearly double your chip. Acceptable.", "That's not winning, that's breaking even with style."],
      cash2: ["Now that's climbing in style!", "You don't have nerves, you have steel cables.", "What a payout. I'll have to move the burner.", "This is getting dangerous for my payroll.", "Nice payout. Hide it before I regret it.", "At that height the oxygen is pay-per-use."],
      cash3: ["NO! Not that! My till!", "This is a robbery by balloon.", "Good grief! My moustache is trembling.", "I'm asking for the universe's seams to be checked.", "You cash out higher than my blood pressure.", "Note the time. This will not happen again. Probably."],
      burst: ["Pffff. The balloon has resigned.", "Gravity always collects. And it collected all of yours.", "It was right there, one click away... Almost.", "Not my fault. Blame physics.", "Thanks for your donation to the air.", "That's what I call an emergency landing. Without the balloon."],
      burst100: ["It never even took off! That's talent.", "Burst on the launch pad. What a fuel saving.", "At ×1.00. Statistically inevitable. Humanly painful.", "The balloon preferred to stay home.", "A puncture on the ground. My efficiency record.", "Don't look at me: I only inflate."],
      burstHigh: ["And you didn't cash out!! Straight to the sad legends section.", "At that height it was cloud property... and mine.", "Dreaming is free. Bursting isn't.", "You could have bought a house. A small one. On a cloud.", "Ouch. That'll hurt when you tell it.", "My till breathes. Your purse weeps."],
      closeCall: ["By a hair!! You've robbed me of the show.", "You cashed out on the balloon's last breath. Awful reflexes.", "My, such cold blood. Or luck.", "Ouch! That was mine.", "Cash out and it bursts a second later... suspicious. Very suspicious.", "You took it right out of my hands. Literally."],
      regret: ["Look how far your balloon went. Ouch.", "That's what they call «what if...».", "You'd have gone far. But you cashed out. Admirable. Stupid, but admirable.", "The ghost looks at you. With pity.", "Sometimes cashing early is wise. This wasn't one of them.", "Don't look at it. Look at the purse. The purse is fine."],
      relief: ["Well spotted: it popped right after. Sharp eye.", "That's called leaving in time.", "Your ghost balloon had a dramatic ending. Yours didn't.", "Cashing out is an art. You, a cheap artist.", "Yes, it burst. What a relief. For you.", "You saw it coming. I've no idea how."],
      auto: ["The autopilot cashes out for you. I almost got fired.", "Automatic cash-out: the art of not looking.", "You set it and it happens. How unthrilling.", "Mechanised and dull. Like my salary.", "A robot cashed your chip. I'd have waited longer.", "Iron discipline. Or organised laziness."],
      ceiling: ["THE CEILING!! This isn't in the contract!", "You've reached space. There's a landing fee.", "×100. I'm off to the safe. To cry.", "The balloon can't go higher. Neither can my blood pressure.", "Somebody call NASA. Or my bank.", "This is, officially, a miracle. Tell my accountant."],
    },
  };
  return { SKIES, BURSTS, ALARMS, EVENTS, es, en,
    RX: { intro: { f: ["neutral"], g: ["nod"] }, fly: { f: ["neutral", "laugh"], g: ["nod", "lean"] }, cash0: { f: ["neutral"], g: ["nod"] }, cash1: { f: ["laugh", "neutral"], g: ["nod", "hop"] }, cash2: { f: ["laugh", "shock"], g: ["hop", "bounce"] }, cash3: { f: ["shock", "angry"], g: ["shake", "zoom"] },
      burst: { f: ["laugh"], g: ["hop", "lean"] }, burst100: { f: ["laugh", "shock"], g: ["bounce", "zoom"] }, burstHigh: { f: ["laugh", "angry"], g: ["lean", "shake"] }, closeCall: { f: ["angry", "shock"], g: ["shake", "zoom"] },
      regret: { f: ["laugh"], g: ["lean", "nod"] }, relief: { f: ["neutral", "shock"], g: ["nod", "lean"] }, auto: { f: ["neutral", "laugh"], g: ["nod"] }, ceiling: { f: ["shock"], g: ["zoom", "shake"] } },
    RXNAME: { intro: "Despegue", fly: "Charla en vuelo (azar, independiente)", cash0: "Cobro < ×1,5", cash1: "Cobro ×1,5 – ×3", cash2: "Cobro ×3 – ×10", cash3: "Cobro > ×10", burst: "Revienta sin cobrar", burst100: "Revienta a ×1,00", burstHigh: "Revienta > ×10 sin cobrar", closeCall: "Cobro justo antes de reventar (< 0,6 s)", regret: "El fantasma llega ≥ 3× lo cobrado (y ≥ ×5)", relief: "El fantasma revienta enseguida (≤ ×1,25 lo cobrado)", auto: "Cobro automático", ceiling: "Techo ×100" } };
})();
