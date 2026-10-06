/* Duelo de dados - textos (es / en; en el juego, los 12 idiomas con el formato es|en|fr|pt|de|it||zh|ko|ja|ru|pl) y reacciones del crupier.
   Cada situacion lleva >= 6 frases, una cara (neutral | laugh | angry | shock) y un gesto del retrato (hop | shudder | drop | lean | none). */
window.DD_T = {
  es: {
    card: { n: "Duelo de dados", s: "Tú contra la banca: gana el total más alto.", play: "Tirar", coin: "Moneda al aire", coinS: "Acierta y cobras el doble de lo apostado.", heads: "Cara", tails: "Cruz", red: "Rojo o negro", redS: "Acierta el color. El verde salta el acto.", redB: "Rojo", blackB: "Negro", greenB: "Verde", wheel: "Ruleta de premios", wheelS: "Premios buenos y malos. Gira y arriésgate.", spin: "Girar" },
    pill: "Duelo · ficha", no: "NO VA MÁS", bal: "BOLSA", chip: "FICHA", prize: "PREMIO", banca: "BANCA", tu: "TÚ",
    hint: { start: "Pulsa JUGAR", dealer: "La banca tira primero…", turn: "Mantén para agitar · suelta para lanzar", shake: "¡Agita! Suelta cuando quieras", roll: "Rueda…", retry: "Empate: se repite la tirada" },
    turn: "MANTÉN", win: "Ganas", lose: "Pierdes", tie: "Empate", tie2: "Doble empate", winMsg: s => "+" + s, loseMsg: s => "−" + s, tieMsg: "Se repite", tie2Msg: "Gana la banca", retryNo: "REPITE LA TIRADA", lvl: ["", "Bien", "Muy bien", "¡Jackpot!"],
  },
  en: {
    card: { n: "Dice duel", s: "You vs. the house: the higher total wins.", play: "Roll", coin: "Coin flip", coinS: "Call it right and win double your stake.", heads: "Heads", tails: "Tails", red: "Red or black", redS: "Call the colour. Green skips the act.", redB: "Red", blackB: "Black", greenB: "Green", wheel: "Prize wheel", wheelS: "Good prizes and bad ones. Spin and risk it.", spin: "Spin" },
    pill: "Duel · stake", no: "NO MORE BETS", bal: "PURSE", chip: "STAKE", prize: "PRIZE", banca: "HOUSE", tu: "YOU",
    hint: { start: "Press PLAY", dealer: "The house rolls first…", turn: "Hold to shake · release to throw", shake: "Shake it! Release when ready", roll: "Rolling…", retry: "Tie: roll again" },
    turn: "HOLD", win: "You win", lose: "You lose", tie: "Tie", tie2: "Double tie", winMsg: s => "+" + s, loseMsg: s => "−" + s, tieMsg: "Roll again", tie2Msg: "House wins", retryNo: "ROLL AGAIN", lvl: ["", "Nice", "Great", "Jackpot!"],
  },
};

window.DD_SIT = {   // clave: { nombre, cara, gesto, es: [...], en: [...] }
  shake: { n: ["Su frase al agitar", "His line when shaking"], face: "neutral", g: "hop",
    es: ["Los dados necesitan calentarse. Como mi paciencia.", "Agito con elegancia. Se nota, ¿verdad?", "Si suena a dinero, es que va bien.", "Un poco de ritmo, que esto es un casino, no una biblioteca.", "Esto lo hago con la muñeca. Lo otro, con la conciencia limpia.", "Mis dados vienen con garantía. La de la casa."],
    en: ["The dice need warming up. Like my patience.", "Shaking with elegance. You can tell, right?", "If it sounds like money, it's going well.", "A bit of rhythm: this is a casino, not a library.", "That's all in the wrist. The rest is a clear conscience.", "My dice come with a guarantee. The house's."] },
  lose: { n: ["Te gana", "He beats you"], face: "laugh", g: "hop",
    es: ["La banca gana. Es lo que tiene ser la banca.", "Mala suerte. O buena para mí, según se mire.", "Los dados no son míos, pero me tienen cariño.", "Gracias por la donación. Se destinará a mi bigote.", "No es personal. Es estadística con mala educación.", "Ha sido un placer. Para uno de los dos."],
    en: ["The house wins. It comes with being the house.", "Bad luck. Or good luck for me, depending on the view.", "The dice aren't mine, but they like me.", "Thanks for the donation. It goes to my moustache.", "Nothing personal. Just statistics with bad manners.", "A pleasure. For one of us."] },
  winSmall: { n: ["Le ganas por poco", "You win narrowly"], face: "shock", g: "shudder",
    es: ["¡Por un pelo! Y mi bigote ya no es lo que era.", "Esto es un robo. Un robo muy educado, pero un robo.", "Un punto. Un solo punto. Cuéntalo, que se te ve en la cara.", "Casi. Ese «casi» va a quitarme el sueño.", "Pasa. Pasa. No hace falta que te lo creas tanto.", "Te dejo ganar. Te dejo, ¿vale? Que conste."],
    en: ["By a hair! And my moustache isn't what it was.", "This is robbery. Very polite robbery, but robbery.", "One point. A single point. Count it, I can see it on your face.", "So close. That 'so close' will cost me sleep.", "Fine. Fine. No need to believe it so much.", "I let you win. I LET you, all right? For the record."] },
  winBig: { n: ["Le ganas por mucho", "You win big"], face: "angry", g: "drop",
    es: ["¿Esa diferencia? Esto no estaba en el guion.", "Mis dados me han traicionado. Los despediré.", "Eso no es suerte. Es un atraco con pips.", "Me has dejado sin palabras. Y sin fichas.", "Voy a pedir una auditoría a mis dados.", "Vale. Vale. Aplausos. No muchos."],
    en: ["A gap like that? This wasn't in the script.", "My dice betrayed me. I'll fire them.", "That's not luck. That's a robbery with pips.", "You left me speechless. And chipless.", "I'm calling for an audit of my dice.", "Fine. Fine. Applause. Not too much."] },
  tie: { n: ["Empate", "Tie"], face: "shock", g: "shudder",
    es: ["¡Empate! Qué tensión. Qué falta de decisión.", "Los dados no se ponen de acuerdo. Como mi contable.", "Otra vez. Y esta vez, con sentimiento.", "Empatados. Es lo más cerca que estaremos de ser amigos.", "La tirada se repite. Mis nervios, no: esos ya están tirados.", "Ni tú ni yo. Los dados dicen: de nuevo."],
    en: ["A tie! What tension. What indecision.", "The dice can't agree. Like my accountant.", "Again. And this time, with feeling.", "Tied. It's as close as we'll ever be to friends.", "The roll repeats. My nerves don't: they're already thrown.", "Neither of us. The dice say: once more."] },
  tie2: { n: ["Segundo empate (gana la banca)", "Second tie (the house wins)"], face: "laugh", g: "hop",
    es: ["Segundo empate. La banca gana. No me mires así, lo pone en las reglas.", "Dos empates seguidos... y la ley es la ley: gano yo.", "Lo siento. Bueno, no lo siento. Pero gano.", "Empate doble: el desempate es mío. Reglas de la casa.", "La probabilidad era del uno por ciento. Y justo hoy.", "Qué mala pata. Para ti. Para mí, qué buena pata."],
    en: ["Second tie. The house wins. Don't look at me like that, it's in the rules.", "Two ties in a row... and the law is the law: I win.", "Sorry. Well, not sorry. But I win.", "Double tie: the tiebreak is mine. House rules.", "The odds were one percent. And today of all days.", "Such bad luck. For you. For me, such good luck."] },
  snake: { n: ["Ojos de serpiente (1+1)", "Snake eyes (1+1)"], face: "shock", g: "lean",
    es: ["¡Ojos de serpiente! Mira cómo te miran.", "Dos unos. La serpiente nos observa y no parpadea.", "Un uno y otro uno. Sumar es fácil; aguantarlo, no.", "Ojos de serpiente: el dado se ríe de ti.", "Con dos unos no se va a ninguna parte. Pero qué bonito queda.", "La serpiente ha hablado. Dice: ssssuerte."],
    en: ["Snake eyes! Look how they stare.", "Two ones. The snake is watching and doesn't blink.", "A one and another one. Adding is easy; enduring it isn't.", "Snake eyes: the die is laughing at you.", "Two ones get you nowhere. But how pretty they look.", "The snake has spoken. It says: ssssluck."] },
  boxcars: { n: ["Doble seis (6+6) tuyo", "Double six (6+6), yours"], face: "shock", g: "drop",
    es: ["¡Doble seis! ¿Seguro que no son tus dados?", "Dos seises. Voy a revisar tus bolsillos.", "El máximo. El techo. El cielo. Y mi bigote por los suelos.", "Doce de golpe. Esto huele a milagro o a trampa.", "Doble seis: la suerte te ha dado un abrazo.", "¡Doce! Ya puedes dejar de presumir. O no."],
    en: ["Double six! Are you sure those aren't your dice?", "Two sixes. I'll check your pockets.", "The max. The ceiling. The sky. And my moustache on the floor.", "Twelve at once. Smells like a miracle or a scam.", "Double six: luck just gave you a hug.", "Twelve! You may stop showing off. Or not."] },
  dealer12: { n: ["Él saca 12", "He rolls 12"], face: "laugh", g: "hop",
    es: ["¡Doce! Hay que ser muy bueno, o muy de la casa.", "Doble seis para el crupier. Qué casualidad tan bien ensayada.", "Doce. No digo nada. Solo sonrío.", "Mira qué dados tan obedientes tengo.", "Doce para mí. Intenta igualarlo. Es broma, no puedes mejorarlo.", "Los dados me adoran. Es un hecho médico."],
    en: ["Twelve! You have to be very good, or very much the house.", "Double six for the dealer. A suspiciously well-rehearsed coincidence.", "Twelve. I'm not saying anything. Just smiling.", "Look how obedient my dice are.", "Twelve for me. Try to match it. Just kidding, you can't beat it.", "The dice adore me. It's a medical fact."] },
  seven: { n: ["Un siete", "A seven"], face: "neutral", g: "lean",
    es: ["Un siete. El número más honrado del casino.", "Siete: el que más sale y el que menos se agradece.", "Un siete. Ni fu ni fa. Pero siempre sale.", "Siete, el número de la suerte de la gente que no tiene otra.", "Un siete. Los matemáticos lo llaman moda. Yo, moda barata.", "El siete llega cuando menos lo esperas. Y cuando más."],
    en: ["A seven. The most honest number in the casino.", "Seven: the one that comes up most and gets thanked least.", "A seven. Meh. But it always shows up.", "Seven, the lucky number of people with no other.", "A seven. Mathematicians call it the mode. I call it cheap fashion.", "Seven arrives when you least expect it. And when you most do."] },
  intro: { n: ["Apertura de la mano", "Opening"], face: "neutral", g: "none",
    es: ["Dos dados cada uno. Gana el total más alto. ¿Qué podría salir mal?", "Yo tiro primero. Es un privilegio de la casa.", "Mantén el cubilete, agita y suelta cuando te sientas valiente."],
    en: ["Two dice each. Highest total wins. What could go wrong?", "I roll first. A privilege of the house.", "Hold the cup, shake it and let go when you feel brave."] },
  turn: { n: ["Tu turno", "Your turn"], face: "neutral", g: "none",
    es: ["Tu turno. Agita con ganas, que el cubilete no muerde.", "Ahora tú. Intenta que parezca que sabes lo que haces.", "Los dados te esperan. Yo también, aunque con menos paciencia."],
    en: ["Your turn. Shake it properly, the cup doesn't bite.", "Now you. Try to look like you know what you're doing.", "The dice are waiting. So am I, with less patience."] },
};

/* El carrete de presentaciones: nombre y descripcion (la logica esta en maqueta.js) */
window.DD_PRES = [
  { id: "clasica", n: ["Clásica", "Classic"], d: ["Salen en arco y botan tres veces antes de rodar hasta su sitio.", "A high arc, three bounces, then a roll to a stop."] },
  { id: "deslizada", n: ["Deslizada", "Long slide"], d: ["Un solo bote bajo y una larga deslizada girando cada vez más despacio.", "One low bounce and a long, slowing slide."] },
  { id: "baranda", n: ["Rebote en la baranda", "Rail ricochet"], d: ["Se estrellan contra la baranda del fondo y vuelven rodando hacia ti.", "They smash into the back rail and roll back."] },
  { id: "choque", n: ["Los dos chocan", "Collision"], d: ["Los dos dados se encuentran en medio, chocan y salen despedidos.", "The two dice meet mid-table and knock each other away."] },
  { id: "desigual", n: ["Uno para y el otro tarda", "One stops, one lingers"], d: ["Un dado se para enseguida; el otro sigue rodando un buen rato.", "One die stops early; the other keeps tumbling."] },
  { id: "canto", n: ["De canto", "On edge"], d: ["Un dado se queda de canto, tambalea… y por fin cae.", "One die balances on its edge, wobbles… and finally falls."] },
  { id: "arriba", n: ["Desde arriba", "From above"], d: ["El cubilete sube y los dados caen desde lo alto con dos botes.", "The cup rises and the dice drop from high above."] },
  { id: "volcado", n: ["Cubilete volcado", "Slammed cup"], d: ["El cubilete se estampa boca abajo, suena el repiqueteo y los dos aparecen a la vez.", "The cup slams down, rattles, and reveals both dice at once."] },
  { id: "peonza", n: ["Peonza", "Spinning top"], d: ["Aterrizan girando sobre sí mismos como peonzas antes de caer planos.", "They land spinning like tops before settling flat."] },
  { id: "rodado", n: ["Rodado", "Rolled"], d: ["Ruedan pegados a la mesa, en diagonal, como bolas de bolera.", "They roll along the felt, diagonally, like bowling balls."] },
];
