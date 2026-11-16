/*
 * Catalogue of the demo listener. Real artists and songs so the dashboards read
 * like a real history, but the listener and every play are made up (see generate.ts).
 *
 * An album only gets played while one of its "eras" is alive: an era starts on a
 * date (release, discovery, a trip…), peaks at `weight`, halves every `halfLife`
 * months and never drops below `keep` × weight (the songs that stay with you).
 * Tracks are listed most played first.
 */

export type Mood = "pop" | "fiesta" | "noche" | "focus" | "guilty";

/** [from YYYY-MM-DD, peak weight, half-life in months, share kept for good] */
export type Era = [string, number, number, number];

export interface AlbumSpec {
  artist: string;
  album: string;
  moods: Mood[];
  eras: Era[];
  tracks: [title: string, seconds: number][];
}

const A = (artist: string, album: string, moods: string, eras: Era[], tracks: [string, number][]): AlbumSpec => ({
  artist,
  album,
  moods: moods.split(" ") as Mood[],
  eras,
  tracks,
});

const START = "2016-10-01";

/** The artists the story is built on. */
export const MAIN: AlbumSpec[] = [
  // ── 2016-2018: high school and first year of uni, indie and stadium pop
  A("Arctic Monkeys", "AM", "pop noche", [[START, 6, 10, 0.25], ["2023-01-15", 3, 3, 0]], [
    ["Do I Wanna Know?", 272], ["R U Mine?", 201], ["I Wanna Be Yours", 184],
    ["Why'd You Only Call Me When You're High?", 161], ["Arabella", 207], ["No. 1 Party Anthem", 243],
  ]),
  A("Arctic Monkeys", "Favourite Worst Nightmare", "pop", [[START, 2.5, 12, 0.2]], [
    ["505", 253], ["Fluorescent Adolescent", 177], ["Brianstorm", 170], ["Do Me a Favour", 207],
  ]),
  A("Coldplay", "A Head Full of Dreams", "pop", [[START, 4, 6, 0.12]], [
    ["Adventure of a Lifetime", 263], ["Hymn for the Weekend", 258], ["Up&Up", 405], ["Everglow", 282],
  ]),
  A("Coldplay", "Viva La Vida or Death and All His Friends", "pop", [[START, 2, 12, 0.2]], [
    ["Viva La Vida", 242], ["Lovers in Japan", 411], ["Violet Hill", 222],
  ]),
  A("Coldplay", "A Rush of Blood to the Head", "pop noche", [["2017-05-10", 2, 8, 0.2]], [
    ["The Scientist", 309], ["Clocks", 307], ["In My Place", 228],
  ]),
  A("Imagine Dragons", "Evolve", "pop", [["2017-06-23", 5, 4, 0.06]], [
    ["Believer", 204], ["Thunder", 187], ["Whatever It Takes", 201], ["Walking the Wire", 232],
  ]),
  A("Imagine Dragons", "Night Visions", "pop", [[START, 3, 5, 0.05]], [
    ["Radioactive", 186], ["Demons", 177], ["It's Time", 240],
  ]),
  A("Vetusta Morla", "Mapas", "pop noche", [[START, 3, 14, 0.2]], [
    ["Golpe maestro", 251], ["Mapas", 262], ["En el río", 266], ["Cuarteles de invierno", 283],
  ]),
  A("Vetusta Morla", "La Deriva", "pop noche", [["2016-11-10", 2.5, 14, 0.2]], [
    ["Fuego", 242], ["La deriva", 291], ["Maldita dulzura", 281],
  ]),
  A("Vetusta Morla", "Un Día en el Mundo", "pop noche", [["2017-03-01", 2, 14, 0.25]], [
    ["Copenhague", 268], ["Sálvese quien pueda", 245], ["Valiente", 285],
  ]),
  A("Love of Lesbian", "1999 (o cómo generar incendios de nieve con una lupa enfocando la luna)", "pop noche", [[START, 3, 10, 0.2]], [
    ["Club de fans de John Boy", 262], ["Allí donde solíamos gritar", 301], ["Incendios de nieve", 275],
  ]),
  A("Carolina Durante", "Cayetano", "pop fiesta", [["2017-11-20", 2, 8, 0.2]], [["Cayetano", 179]]),
  A("Carolina Durante", "Carolina Durante", "pop fiesta", [["2019-02-15", 2.5, 8, 0.2]], [
    ["Perdona (Ahora Sí Que Sí)", 208],
  ]),
  A("Tame Impala", "Currents", "pop noche", [["2017-09-01", 4, 10, 0.25]], [
    ["The Less I Know The Better", 216], ["Let It Happen", 467], ["Eventually", 318],
    ["New Person, Same Old Mistakes", 362], ["Yes I'm Changing", 271],
  ]),
  A("Tame Impala", "Lonerism", "pop noche", [["2018-02-01", 2, 8, 0.15]], [
    ["Feels Like We Only Go Backwards", 193], ["Elephant", 211], ["Mind Mischief", 271],
  ]),
  A("Tame Impala", "The Slow Rush", "pop noche focus", [["2020-02-14", 6, 5, 0.2]], [
    ["Borderline", 237], ["Lost in Yesterday", 249], ["Breathe Deeper", 372], ["Is It True", 239], ["One More Year", 324],
  ]),
  A("The Weeknd", "Starboy", "pop fiesta", [["2016-11-25", 3, 6, 0.1]], [
    ["Starboy", 230], ["I Feel It Coming", 269], ["Party Monster", 249],
  ]),
  A("The Weeknd", "After Hours", "pop fiesta noche", [["2019-12-01", 7, 6, 0.2]], [
    ["Blinding Lights", 200], ["Save Your Tears", 215], ["In Your Eyes", 237], ["After Hours", 361], ["Heartless", 198],
  ]),
  A("Frank Ocean", "Blonde", "noche", [["2017-02-01", 4, 18, 0.35]], [
    ["Nights", 307], ["Pink + White", 184], ["Ivy", 249], ["Self Control", 249], ["White Ferrari", 248], ["Solo", 257],
  ]),
  A("Kendrick Lamar", "DAMN.", "pop fiesta", [["2017-04-14", 4, 6, 0.1]], [
    ["HUMBLE.", 177], ["DNA.", 185], ["LOYALTY. FEAT. RIHANNA.", 227], ["LOVE. FEAT. ZACARI.", 213],
  ]),

  // ── 2018-2019: Rosalía, C. Tangana and the first Bad Bunny
  A("ROSALÍA", "EL MAL QUERER", "pop fiesta noche", [["2018-11-02", 7, 8, 0.25]], [
    ["MALAMENTE - Cap.1: Augurio", 150], ["PIENSO EN TU MIRÁ - Cap.3: Celos", 193], ["DI MI NOMBRE - Cap.8: Éxtasis", 152],
    ["BAGDAD - Cap.7: Liturgia", 182], ["QUE NO SALGA LA LUNA - Cap.2: Boda", 230], ["DE AQUÍ NO SALES - Cap.4: Disputa", 142],
  ]),
  A("ROSALÍA", "Con Altura", "fiesta pop", [["2019-03-28", 4, 4, 0.1]], [["Con Altura", 162]]),
  A("C. Tangana", "Avida Dollars", "pop fiesta", [["2018-06-01", 3, 5, 0.15]], [
    ["Mala Mujer", 182], ["Bien Duro", 186], ["Pronto llegará", 181],
  ]),
  A("Bad Bunny", "X 100PRE", "fiesta pop", [["2018-12-24", 4, 6, 0.15]], [
    ["Estamos Bien", 208], ["Solo de Mi", 197], ["Otra Noche en Miami", 233], ["Ni Bien Ni Mal", 236], ["La Romana", 300],
  ]),
  A("Amaia", "Pero No Pasa Nada", "pop noche", [["2019-09-27", 3, 6, 0.15]], [
    ["El Relámpago", 214], ["Quedará en Nuestra Mente", 253], ["Nadie Podrá Parar", 192],
  ]),
  A("Billie Eilish", "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?", "pop noche", [["2019-03-29", 4, 5, 0.1]], [
    ["bad guy", 194], ["when the party's over", 196], ["bury a friend", 193], ["you should see me in a crown", 181],
  ]),
  A("Harry Styles", "Fine Line", "pop", [["2019-12-13", 3, 6, 0.05]], [
    ["Watermelon Sugar", 174], ["Adore You", 207], ["Golden", 209],
  ]),

  // ── 2020: lockdown, a lot more music at home
  A("Bad Bunny", "YHLQMDLG", "fiesta pop", [["2020-02-29", 7, 4, 0.15]], [
    ["Yo Perreo Sola", 172], ["Safaera", 295], ["Si Veo a Tu Mamá", 170], ["La Difícil", 163], ["Vete", 192], ["Ignorantes", 210],
  ]),
  A("Dua Lipa", "Future Nostalgia", "pop fiesta", [["2020-03-27", 6, 4, 0.15]], [
    ["Levitating", 203], ["Don't Start Now", 183], ["Physical", 194], ["Break My Heart", 222], ["Hallucinate", 208],
  ]),
  A("Nujabes", "Modal Soul", "focus", [["2020-03-20", 3, 8, 0.35]], [
    ["Feather", 175], ["Luv(sic) Part 3", 380], ["Reflection Eternal", 238], ["Modal Soul", 254],
  ]),
  A("Men I Trust", "Oncle Jazz", "focus noche", [["2020-06-01", 2, 8, 0.25]], [
    ["Show Me How", 213], ["Numb", 226], ["Tailwhip", 190],
  ]),
  A("Bill Evans Trio", "Waltz for Debby", "focus", [["2020-10-01", 2, 12, 0.5]], [
    ["My Foolish Heart", 296], ["Waltz for Debby", 418], ["Detour Ahead", 457],
  ]),

  // ── 2021: El Madrileño, then Erasmus in Bologna
  A("C. Tangana", "El Madrileño", "pop fiesta", [["2021-02-26", 7, 5, 0.25]], [
    ["Tú Me Dejaste De Querer", 228], ["Comerte Entera", 225], ["Nominao", 228], ["Ingobernable", 210], ["Demasiadas Mujeres", 204],
  ]),
  A("Khruangbin", "Con Todo El Mundo", "focus noche", [["2021-03-01", 2.5, 8, 0.3]], [
    ["Maria También", 189], ["Evan Finds the Third Room", 254], ["Friday Morning", 232],
  ]),
  A("Olivia Rodrigo", "SOUR", "pop", [["2021-05-21", 6, 3, 0.1]], [
    ["good 4 u", 178], ["drivers license", 242], ["deja vu", 215], ["traitor", 229], ["happier", 175],
  ]),
  A("Måneskin", "Teatro d'ira - Vol. I", "pop fiesta", [["2021-09-20", 5, 3, 0.05]], [
    ["ZITTI E BUONI", 194], ["I WANNA BE YOUR SLAVE", 173], ["CORALINE", 300],
  ]),
  A("Måneskin", "Chosen", "pop fiesta", [["2021-07-10", 3, 3, 0.04]], [["Beggin'", 211]]),
  A("Mahmood", "Gioventù bruciata", "pop", [["2021-10-01", 2, 4, 0.05]], [["Soldi", 195]]),
  A("Mahmood", "Brividi", "pop", [["2022-02-05", 3, 3, 0.05]], [["Brividi", 199]]),
  A("Franco Battiato", "La voce del padrone", "pop noche", [["2021-11-01", 2, 6, 0.15]], [
    ["Centro di gravità permanente", 222], ["Bandiera bianca", 184],
  ]),
  A("Franco Battiato", "L'imboscata", "noche", [["2021-11-20", 1.5, 6, 0.15]], [["La cura", 219]]),

  // ── 2022: Motomami, Un Verano Sin Ti, the Bizarrap sessions
  A("ROSALÍA", "MOTOMAMI", "pop fiesta", [["2022-03-18", 8, 5, 0.25]], [
    ["SAOKO", 137], ["LA FAMA", 188], ["CANDY", 194], ["BIZCOCHITO", 109], ["HENTAI", 158], ["CHICKEN TERIYAKI", 126], ["DIABLO", 156],
  ]),
  A("ROSALÍA", "MOTOMAMI +", "fiesta pop", [["2022-07-28", 5, 4, 0.1]], [["DESPECHÁ", 157]]),
  A("Harry Styles", "Harry's House", "pop", [["2022-04-01", 4, 4, 0.05]], [
    ["As It Was", 167], ["Late Night Talking", 178], ["Music For a Sushi Restaurant", 194],
  ]),
  A("Bad Bunny", "Un Verano Sin Ti", "fiesta pop", [["2022-05-06", 10, 4, 0.2], ["2022-07-01", 4, 2, 0]], [
    ["Tití Me Preguntó", 243], ["Me Porto Bonito", 178], ["Moscow Mule", 245], ["Ojitos Lindos", 258],
    ["Después de la Playa", 230], ["Efecto", 213], ["Neverita", 173], ["Party", 227], ["Un Ratito", 177],
  ]),
  A("Bizarrap", "Quevedo: Bzrp Music Sessions, Vol. 52", "fiesta pop", [["2022-07-06", 6, 3, 0.05]], [
    ["Quevedo: Bzrp Music Sessions, Vol. 52", 198],
  ]),
  A("Amaia", "Cuando No Sé Quién Soy", "pop noche", [["2022-09-02", 3, 5, 0.1]], [
    ["Yamaguchi", 169],
  ]),
  A("Taylor Swift", "Midnights", "pop", [["2022-10-21", 3, 3, 0.05]], [
    ["Anti-Hero", 200], ["Lavender Haze", 202], ["Karma", 204], ["Midnight Rain", 174],
  ]),
  A("Fred again..", "Actual Life 3 (January 1 - September 9 2022)", "focus fiesta", [["2022-11-01", 3, 6, 0.2]], [
    ["Delilah (pull me out of this)", 274], ["Kammy (like i do)", 214], ["Bleu (better with time)", 216],
  ]),
  A("SZA", "SOS", "pop noche", [["2022-12-09", 5, 6, 0.2]], [
    ["Kill Bill", 153], ["Snooze", 201], ["Nobody Gets Me", 180], ["Good Days", 279], ["Shirt", 181],
  ]),

  // ── 2023: first job, Japan in April
  A("Bizarrap", "Shakira: Bzrp Music Sessions, Vol. 53", "fiesta pop", [["2023-01-11", 5, 1.5, 0.02]], [
    ["Shakira: Bzrp Music Sessions, Vol. 53", 218],
  ]),
  A("KAROL G", "MAÑANA SERÁ BONITO", "fiesta pop", [["2023-02-24", 4, 4, 0.1]], [
    ["TQG", 197], ["PROVENZA", 210], ["MIENTRAS ME CURO DEL CORA", 210], ["AMARGURA", 177],
  ]),
  A("Mariya Takeuchi", "Variety", "pop noche", [["2023-03-25", 3, 4, 0.15]], [["Plastic Love", 293]]),
  A("Fujii Kaze", "HELP EVER HURT NEVER", "pop noche", [["2023-04-02", 4, 3, 0.1]], [
    ["Shinunoga E-Wa", 185], ["Nan-Nan", 237], ["Mo-Eh-Yo", 244],
  ]),
  A("Getz/Gilberto", "Getz/Gilberto", "focus", [["2023-06-01", 1.5, 10, 0.4]], [
    ["The Girl from Ipanema", 324], ["Corcovado", 255], ["Desafinado", 254],
  ]),
  A("Quevedo", "Columbia", "fiesta pop", [["2023-07-14", 4, 3, 0.05]], [["Columbia", 186]]),
  A("Olivia Rodrigo", "GUTS", "pop", [["2023-09-08", 3, 2, 0.05]], [
    ["vampire", 219], ["bad idea right?", 184], ["get him back!", 211],
  ]),
  A("Bad Bunny", "nadie sabe lo que va a pasar mañana", "fiesta pop", [["2023-10-13", 3, 3, 0.05]], [
    ["MONACO", 267], ["PERRO NEGRO", 162], ["FINA", 217],
  ]),
  A("Dua Lipa", "Radical Optimism", "pop fiesta", [["2023-11-09", 3, 3, 0.05]], [
    ["Houdini", 185], ["Training Season", 209], ["Illusion", 188],
  ]),

  // ── 2024: a pop summer, Mexico for Christmas
  A("Sabrina Carpenter", "Short n' Sweet", "pop fiesta", [["2024-04-15", 5, 4, 0.1]], [
    ["Espresso", 175], ["Please Please Please", 186], ["Taste", 157], ["Bed Chem", 171],
  ]),
  A("Kendrick Lamar", "Not Like Us", "fiesta pop", [["2024-05-04", 4, 2, 0.05]], [["Not Like Us", 274]]),
  A("Billie Eilish", "HIT ME HARD AND SOFT", "pop noche", [["2024-05-17", 8, 6, 0.25]], [
    ["BIRDS OF A FEATHER", 210], ["LUNCH", 179], ["CHIHIRO", 303], ["WILDFLOWER", 261], ["L'AMOUR DE MA VIE", 333], ["BLUE", 343],
  ]),
  A("Charli xcx", "BRAT", "fiesta pop", [["2024-06-07", 5, 3, 0.1]], [
    ["360", 133], ["Von dutch", 151], ["Apple", 151], ["365", 203], ["Sympathy is a knife", 152],
  ]),
  A("KAROL G", "Si Antes Te Hubiera Conocido", "fiesta pop", [["2024-06-21", 3, 3, 0.05]], [["Si Antes Te Hubiera Conocido", 196]]),
  A("Kendrick Lamar", "GNX", "pop fiesta", [["2024-11-22", 4, 3, 0.1]], [
    ["luther", 177], ["squabble up", 157], ["tv off", 220],
  ]),

  // ── 2025-2026: DtMF, LUX and some old favourites coming back
  A("Bad Bunny", "DeBÍ TiRAR MáS FOToS", "fiesta pop noche", [["2025-01-05", 11, 4, 0.25]], [
    ["DtMF", 237], ["BAILE INoLVIDABLE", 368], ["NUEVAYoL", 183], ["VOY A LLeVARTE PA PR", 156],
    ["EoO", 204], ["PIToRRO DE COCO", 196], ["LA MuDANZA", 213], ["TURiSTA", 190],
  ]),
  A("ROSALÍA", "LUX", "pop noche", [["2025-11-07", 7, 4, 0.2]], [
    ["Berghain", 178], ["La Perla", 196], ["Reliquia", 210],
  ]),
  A("Fleetwood Mac", "Rumours", "pop noche", [["2018-07-01", 1.2, 8, 0.2], ["2026-02-20", 4, 4, 0.1]], [
    ["Dreams", 257], ["The Chain", 270], ["Go Your Own Way", 223],
  ]),
  A("Radiohead", "In Rainbows", "noche focus", [["2019-01-15", 1.5, 8, 0.2], ["2026-04-10", 3.5, 4, 0.15]], [
    ["Weird Fishes/ Arpeggi", 318], ["Reckoner", 290], ["Nude", 255], ["House of Cards", 328],
  ]),

  // ── always there: study and work music
  A("Hans Zimmer", "Interstellar (Original Motion Picture Soundtrack)", "focus", [["2016-10-15", 2, 8, 0.3]], [
    ["Cornfield Chase", 126], ["No Time for Caution", 246], ["Day One", 199], ["Stay", 412],
  ]),
  A("Ludovico Einaudi", "Una Mattina", "focus", [["2018-01-15", 2, 8, 0.4]], [["Nuvole bianche", 357], ["Una mattina", 202]]),
  A("Ludovico Einaudi", "In A Time Lapse", "focus", [["2018-02-15", 1.5, 8, 0.4]], [["Experience", 315]]),
  A("Miles Davis", "Kind Of Blue", "focus noche", [["2019-10-01", 1.5, 12, 0.5]], [["So What", 562], ["Blue in Green", 337]]),
  A("The Dave Brubeck Quartet", "Time Out", "focus", [["2019-10-15", 1, 12, 0.5]], [["Take Five", 324], ["Blue Rondo à la Turk", 404]]),

  // ── Spanish classics for parties and road trips
  A("Estopa", "Estopa", "fiesta", [[START, 1.2, 36, 0.4]], [["Como Camarón", 207], ["La Raja de Tu Falda", 197], ["Tu Calorro", 221]]),
  A("Fito y Fitipaldis", "Lo Más Lejos A Tu Lado", "fiesta pop", [[START, 1, 36, 0.4]], [["Soldadito marinero", 269], ["Whisky barato", 240]]),
  A("La Oreja de Van Gogh", "El Viaje de Copperpot", "fiesta", [[START, 0.8, 36, 0.5]], [["Cuéntame al Oído", 230], ["La Playa", 230], ["París", 225]]),
  A("El Canto del Loco", "Zapatillas", "fiesta", [[START, 0.8, 36, 0.5]], [["Zapatillas", 196], ["Peter Pan", 212]]),
  A("Pereza", "Animales", "fiesta", [[START, 0.6, 36, 0.5]], [["Princesas", 230]]),
  A("Hombres G", "Hombres G", "fiesta", [[START, 0.6, 36, 0.5]], [["Devuélveme a mi chica", 194]]),
  A("Alejandro Sanz", "Más", "fiesta", [[START, 0.6, 36, 0.5]], [["Corazón Partío", 347]]),
  A("Extremoduro", "Agila", "fiesta", [[START, 0.6, 36, 0.5]], [["So payaso", 248]]),

  // ── what only plays in a private session
  A("Las Ketchup", "Hijas del Tomate", "guilty", [[START, 1, 1000, 1]], [["Aserejé", 205]]),
  A("Los Del Rio", "A mí me gusta", "guilty", [[START, 1, 1000, 1]], [["Macarena", 251]]),
  A("David Bisbal", "Corazón Latino", "guilty", [[START, 1, 1000, 1]], [["Ave María", 203]]),
  A("Chayanne", "Sincero", "guilty", [[START, 0.8, 1000, 1]], [["Torero", 222]]),
  A("Paulina Rubio", "Paulina", "guilty", [[START, 0.8, 1000, 1]], [["Y Yo Sigo Aquí", 216]]),
];

/**
 * The long tail: songs that turn up for a few weeks and then mostly go away.
 * [artist, album, release year, moods, tracks, discovered on?]. Without a date
 * the generator picks one some time after the release.
 */
export type TailSpec = [string, string, number, string, [string, number][], string?];

export const TAIL: TailSpec[] = [
  ["Queen", "A Night At The Opera", 1975, "pop fiesta", [["Bohemian Rhapsody", 354]]],
  ["The Killers", "Hot Fuss", 2004, "pop fiesta", [["Mr. Brightside", 222]]],
  ["Oasis", "(What's The Story) Morning Glory?", 1995, "pop fiesta", [["Wonderwall", 258], ["Don't Look Back In Anger", 289]]],
  ["The Strokes", "Is This It", 2001, "pop", [["Last Nite", 197], ["Someday", 187]]],
  ["The Strokes", "Room On Fire", 2003, "pop", [["Reptilia", 221]]],
  ["Franz Ferdinand", "Franz Ferdinand", 2004, "pop fiesta", [["Take Me Out", 237]]],
  ["Gorillaz", "Demon Days", 2005, "pop", [["Feel Good Inc.", 221], ["DARE", 245]]],
  ["Gorillaz", "Plastic Beach", 2010, "pop noche", [["On Melancholy Hill", 233]]],
  ["MGMT", "Oracular Spectacular", 2007, "pop", [["Electric Feel", 229], ["Kids", 302]]],
  ["Foster The People", "Torches", 2011, "pop", [["Pumped Up Kicks", 239]]],
  ["Two Door Cinema Club", "Tourist History", 2010, "pop", [["What You Know", 191]]],
  ["Glass Animals", "Dreamland", 2020, "pop", [["Heat Waves", 238]]],
  ["Hozier", "Hozier", 2014, "pop noche", [["Take Me to Church", 241]]],
  ["Hozier", "Unheard", 2024, "pop", [["Too Sweet", 251]]],
  ["Lana Del Rey", "Born To Die", 2012, "noche pop", [["Summertime Sadness", 265], ["Video Games", 282]]],
  ["Lorde", "Melodrama", 2017, "pop", [["Green Light", 234], ["Liability", 172]]],
  ["Lorde", "Pure Heroine", 2013, "pop", [["Royals", 190]]],
  ["Florence + The Machine", "Lungs", 2009, "pop", [["Dog Days Are Over", 252]]],
  ["Post Malone", "Hollywood's Bleeding", 2019, "pop", [["Circles", 215], ["Sunflower - Spider-Man: Into the Spider-Verse", 158]]],
  ["Doja Cat", "Planet Her", 2021, "pop fiesta", [["Kiss Me More (feat. SZA)", 208]]],
  ["Bruno Mars", "24K Magic", 2016, "pop fiesta", [["24K Magic", 226], ["That's What I Like", 206]]],
  ["Silk Sonic", "An Evening With Silk Sonic", 2021, "pop noche", [["Leave The Door Open", 242]]],
  ["Mark Ronson", "Uptown Special", 2015, "fiesta", [["Uptown Funk (feat. Bruno Mars)", 270]]],
  ["Calvin Harris", "Funk Wav Bounces Vol.1", 2017, "fiesta pop", [["Slide", 230], ["Feels", 223]]],
  ["Avicii", "True", 2013, "fiesta pop", [["Wake Me Up", 247], ["Hey Brother", 255]]],
  ["Daddy Yankee", "Barrio Fino", 2004, "fiesta", [["Gasolina", 192]]],
  ["Luis Fonsi", "VIDA", 2019, "fiesta", [["Despacito", 229]]],
  ["J Balvin", "Vibras", 2018, "fiesta", [["Mi Gente", 189]]],
  ["Rauw Alejandro", "VICE VERSA", 2021, "fiesta", [["Todo De Ti", 199]]],
  ["Myke Towers", "LA VIDA ES UNA", 2023, "fiesta", [["LALA", 197]]],
  ["Manuel Turizo", "2000", 2022, "fiesta", [["La Bachata", 162]]],
  ["Eslabon Armado", "DESVELADO", 2023, "fiesta pop", [["Ella Baila Sola", 165]], "2024-12-16"],
  ["Grupo Frontera", "un x100to", 2023, "fiesta pop", [["un x100to", 194]], "2024-12-20"],
  ["Zoé", "Memo Rex Commander y el Corazón Atómico de la Vía Láctea", 2006, "pop noche", [["Labios Rotos", 247]], "2024-12-18"],
  ["Café Tacvba", "Cuatro Caminos", 2003, "pop", [["Eres", 265]], "2024-12-22"],
  ["Los Ángeles Azules", "Esto Sí Es Cumbia", 2018, "fiesta", [["Nunca Es Suficiente", 274]], "2024-12-26"],
  ["Natalia Lafourcade", "Hasta la Raíz", 2015, "pop noche", [["Hasta la Raíz", 222]], "2024-12-29"],
  ["Shakira", "Laundry Service", 2001, "fiesta", [["Whenever, Wherever", 196]]],
  ["Juanes", "Mi Sangre", 2004, "fiesta", [["La Camisa Negra", 216]]],
  ["Mecano", "Entre El Cielo Y El Suelo", 1986, "fiesta noche", [["Hijo de la Luna", 258]]],
  ["Nathy Peluso", "Nathy Peluso: Bzrp Music Sessions, Vol. 36", 2020, "fiesta", [["Nathy Peluso: Bzrp Music Sessions, Vol. 36", 202]], "2020-12-12"],
  ["Nathy Peluso", "CALAMBRE", 2020, "pop fiesta", [["BUENOS AIRES", 205], ["SANA SANA", 190]]],
  ["Chanel", "SloMo", 2022, "fiesta pop", [["SloMo", 182]], "2022-05-15"],
  ["Blanca Paloma", "Eaea", 2023, "pop", [["Eaea", 180]], "2023-05-14"],
  ["Melody", "Esa Diva", 2025, "fiesta pop", [["Esa Diva", 183]], "2025-05-18"],
  ["Stromae", "Racine Carrée", 2013, "pop fiesta", [["Papaoutai", 232], ["Formidable", 214]]],
  ["Stromae", "Multitude", 2022, "pop", [["L'enfer", 189], ["Santé", 186]]],
  ["Angèle", "Brol", 2018, "pop", [["Balance ton quoi", 188]], "2021-10-20"],
  ["Bomba Estéreo", "Amanecer", 2015, "fiesta", [["To My Love", 227]]],
  ["Tyler, The Creator", "IGOR", 2019, "pop noche", [["EARFQUAKE", 190]]],
  ["Tyler, The Creator", "Flower Boy", 2017, "pop noche", [["See You Again", 180]]],
  ["Childish Gambino", "\"Awaken, My Love!\"", 2016, "noche", [["Redbone", 327]]],
  ["Steve Lacy", "Gemini Rights", 2022, "pop noche", [["Bad Habit", 232]]],
  ["Daniel Caesar", "Freudian", 2017, "noche", [["Best Part (feat. H.E.R.)", 209], ["Get You (feat. Kali Uchis)", 278]]],
  ["Kali Uchis", "Sin Miedo (del Amor y Otros Demonios)", 2020, "noche pop", [["telepatía", 160]]],
  ["Beach House", "Depression Cherry", 2015, "noche focus", [["Space Song", 320]]],
  ["Cigarettes After Sex", "Cigarettes After Sex", 2017, "noche focus", [["Apocalypse", 290], ["K.", 319]]],
  ["The Neighbourhood", "I Love You.", 2013, "noche pop", [["Sweater Weather", 240]]],
  ["Joji", "SMITHEREENS", 2022, "noche", [["Glimpse of Us", 233]]],
  ["Bon Iver", "For Emma, Forever Ago", 2008, "noche focus", [["Skinny Love", 238], ["Flume", 219]]],
  ["The xx", "xx", 2009, "noche focus", [["Intro", 127], ["Crystalised", 201]]],
  ["Mac DeMarco", "Salad Days", 2014, "noche pop", [["Chamber Of Reflection", 231]]],
  ["Mac DeMarco", "2", 2012, "pop", [["My Kind Of Woman", 190], ["Freaking Out the Neighborhood", 173]]],
  ["Clairo", "Immunity", 2019, "noche", [["Bags", 260], ["Sofia", 188]]],
  ["Phoebe Bridgers", "Punisher", 2020, "noche", [["Kyoto", 184], ["Garden Song", 221]]],
  ["Daft Punk", "Random Access Memories", 2013, "pop fiesta", [["Get Lucky (feat. Pharrell Williams and Nile Rodgers)", 369], ["Instant Crush (feat. Julian Casablancas)", 337]]],
  ["Daft Punk", "Discovery", 2001, "fiesta focus", [["One More Time", 320], ["Digital Love", 301]]],
  ["Justice", "Cross", 2007, "fiesta", [["D.A.N.C.E.", 242]]],
  ["Disclosure", "Settle", 2013, "fiesta", [["Latch", 255]]],
  ["Bicep", "Bicep", 2017, "focus fiesta", [["Glue", 269]]],
  ["RÜFÜS DU SOL", "Bloom", 2016, "focus fiesta", [["Innerbloom", 578]]],
  ["Peggy Gou", "(It Goes Like) Nanana", 2023, "fiesta", [["(It Goes Like) Nanana", 249]]],
  ["Fred again..", "Actual Life (April 14 - December 17 2020)", 2021, "focus", [["Marea (we've lost dancing)", 284]]],
  ["ABBA", "Arrival", 1976, "fiesta", [["Dancing Queen", 230]]],
  ["Michael Jackson", "Thriller", 1982, "fiesta pop", [["Billie Jean", 294], ["Beat It", 258]]],
  ["a-ha", "Hunting High and Low", 1985, "fiesta pop", [["Take On Me", 225]]],
  ["Eagles", "Hotel California", 1976, "pop noche", [["Hotel California", 391]]],
  ["Kate Bush", "Hounds Of Love", 1985, "pop noche", [["Running Up That Hill (A Deal With God)", 298]], "2022-06-01"],
  ["Metallica", "Master Of Puppets", 1986, "pop", [["Master of Puppets", 515]], "2022-07-02"],
  ["Tatsuro Yamashita", "FOR YOU", 1982, "pop", [["SPARKLE", 434]], "2023-04-05"],
  ["Joe Hisaishi", "Spirited Away (Original Soundtrack)", 2001, "focus", [["One Summer's Day", 180]], "2023-04-08"],
  ["Chet Baker", "Chet Baker Sings", 1954, "focus noche", [["My Funny Valentine", 140], ["I Fall In Love Too Easily", 199]]],
  ["Drake", "Views", 2016, "pop fiesta", [["One Dance", 173]]],
  ["Drake", "Scorpion", 2018, "pop fiesta", [["God's Plan", 199], ["In My Feelings", 217]]],
  ["Travis Scott", "ASTROWORLD", 2018, "fiesta", [["SICKO MODE", 312]]],
  ["Doechii", "Anxiety", 2025, "pop fiesta", [["Anxiety", 249]], "2026-01-20"],
  ["Chappell Roan", "The Rise and Fall of a Midwest Princess", 2023, "pop fiesta", [["Pink Pony Club", 258], ["Good Luck, Babe!", 218]], "2026-03-05"],
  ["Benson Boone", "Fireworks & Rollerblades", 2024, "pop", [["Beautiful Things", 180]]],
  ["Lady Gaga", "Die With A Smile", 2024, "pop", [["Die With A Smile", 251]]],
  ["ROSÉ", "APT.", 2024, "pop fiesta", [["APT.", 170]]],
  ["Tate McRae", "THINK LATER", 2023, "pop fiesta", [["greedy", 131]]],
  ["Gracie Abrams", "The Secret of Us", 2024, "pop", [["That's So True", 166]]],
  ["Noah Kahan", "Stick Season", 2022, "pop", [["Stick Season", 182]]],
  ["Jorge Drexler", "Bailar en la Cueva", 2014, "pop noche", [["Bailar en la Cueva", 222]]],
  ["Juan Luis Guerra 4.40", "Bachata Rosa", 1990, "fiesta", [["Burbujas de Amor", 245], ["Bachata Rosa", 182]]],
];
