// ============================================================
//  GUESS WHO: FAMILY EDITION, the one file to personalize
// ============================================================
//  Everything your parents see (names, colors, people on the
//  cards, quick questions, trash talk, win messages, special
//  dates) lives here. Edit, commit, and the app updates.
// ============================================================

// ---- Family (always on the board) -----------------------------
// Each person is a Memoji: save their sticker as a PNG/WebP in
// guess-who/memoji/ and add (or uncomment) their line here.
// "fact" is revealed at the end of the game when that person was
// the mystery person: a great spot for a memory or inside joke.
const FAMILY = [
  { name: 'Valerie',  photo: 'memoji/valerie.webp',  fact: '' },
  { name: 'Bobby',    photo: 'memoji/bobby.webp',    fact: '' },
  // { name: 'Fletcher', photo: 'memoji/fletcher.webp', fact: '' },
  // { name: 'Sonny',    photo: 'memoji/sonny.webp',    fact: '' },
  // { name: 'Emily',    photo: 'memoji/emily.webp',    fact: '' },
  // { name: 'Nick',     photo: 'memoji/nick.webp',     fact: '' },
  // { name: 'Chelsea',  photo: 'memoji/chelsea.webp',  fact: '' },
  // { name: 'Bill',     photo: 'memoji/bill.webp',     fact: '' },
  // { name: 'Aydee',    photo: 'memoji/aydee.webp',    fact: '' },
  // { name: 'Seth',     photo: 'memoji/seth.webp',     fact: '' },
  // { name: 'Sadie',    photo: 'memoji/sadie.webp',    fact: '' },
  // { name: 'Lara',     photo: 'memoji/lara.webp',     fact: '' },
  // { name: 'Jennifer', photo: 'memoji/jennifer.webp', fact: '' },
];

// ---- Cartoon placeholders (fill the empty spots) ---------------
const PLACEHOLDERS = [
  { name: 'Alex',    skin: 1, hair: 'brown',  style: 'short', glasses: true,  shirt: 'blue',   fact: 'Collects vintage postcards.' },
  { name: 'Bea',     skin: 0, hair: 'blonde', style: 'long',  earrings: true, shirt: 'red',    fact: 'Can whistle any song backwards.' },
  { name: 'Carlos',  skin: 3, hair: 'black',  style: 'short', facial: 'mustache', shirt: 'green', fact: 'Makes legendary pancakes.' },
  { name: 'Dina',    skin: 4, hair: 'black',  style: 'curly', earrings: true, shirt: 'yellow', fact: 'Ran a marathon in a banana suit.' },
  { name: 'Eli',     skin: 2, hair: 'red',    style: 'spiky', shirt: 'purple',                   fact: 'Has never lost at checkers.' },
  { name: 'Fran',    skin: 1, hair: 'gray',   style: 'bun',   glasses: true,  shirt: 'teal',     fact: 'Knits sweaters for her cats.' },
  { name: 'Gus',     skin: 0, hair: 'gray',   style: 'bald',  facial: 'beard', shirt: 'red',     fact: 'Retired lighthouse keeper.' },
  { name: 'Hana',    skin: 2, hair: 'black',  style: 'bob',   hat: 'beanie',  shirt: 'blue',     fact: 'Speaks four languages.' },
  { name: 'Ivan',    skin: 1, hair: 'blonde', style: 'short', hat: 'cap',     shirt: 'green',    fact: 'Fixes old motorcycles.' },
  { name: 'Jade',    skin: 3, hair: 'brown',  style: 'long',  glasses: true,  shirt: 'purple',   fact: 'Grows giant tomatoes.' },
  { name: 'Kofi',    skin: 5, hair: 'black',  style: 'short', facial: 'beard', shirt: 'yellow',  fact: 'Plays the saxophone.' },
  { name: 'Lena',    skin: 0, hair: 'red',    style: 'curly', shirt: 'teal',                     fact: 'Once met a famous astronaut.' },
  { name: 'Milo',    skin: 2, hair: 'brown',  style: 'spiky', glasses: true, hat: 'cap', shirt: 'red', fact: 'Builds birdhouses.' },
  { name: 'Nora',    skin: 4, hair: 'brown',  style: 'bun',   earrings: true, shirt: 'green',    fact: 'Bakes bread every Sunday.' },
  { name: 'Otto',    skin: 1, hair: 'gray',   style: 'short', glasses: true, facial: 'mustache', shirt: 'blue', fact: 'Tells the worst dad jokes.' },
  { name: 'Pia',     skin: 3, hair: 'blonde', style: 'bob',   shirt: 'yellow',                   fact: 'Champion bowler.' },
  { name: 'Quinn',   skin: 2, hair: 'red',    style: 'long',  hat: 'fedora',  shirt: 'purple',   fact: 'Writes mystery novels.' },
  { name: 'Raj',     skin: 4, hair: 'black',  style: 'short', glasses: true,  shirt: 'teal',     fact: 'Can solve a Rubik’s cube in a minute.' },
  { name: 'Sofia',   skin: 1, hair: 'brown',  style: 'curly', glasses: true, earrings: true, shirt: 'red', fact: 'Sings in a choir.' },
  { name: 'Tom',     skin: 0, hair: 'blonde', style: 'short', facial: 'beard', hat: 'beanie', shirt: 'green', fact: 'Goes ice fishing every winter.' },
  { name: 'Uma',     skin: 5, hair: 'black',  style: 'long',  earrings: true, shirt: 'blue',     fact: 'Paints watercolor landscapes.' },
  { name: 'Vic',     skin: 3, hair: 'gray',   style: 'bald',  glasses: true, shirt: 'yellow',    fact: 'Knows every state capital.' },
  { name: 'Wren',    skin: 2, hair: 'brown',  style: 'bob',   hat: 'cap',    shirt: 'teal',      fact: 'Volunteers at the animal shelter.' },
  { name: 'Xavier',  skin: 5, hair: 'black',  style: 'spiky', facial: 'mustache', shirt: 'purple', fact: 'Dances salsa on Fridays.' },
];

export const CONFIG = {
  appTitle: 'Guess Who?',
  subtitle: 'Family Edition',

  // Both phones must use the same room code. Make it hard to guess.
  roomCode: 'family-room-change-me-7k2q',

  // ---- Online play (two phones, two places) -----------------
  // Paste your Firebase web config here (see guess-who/README.md).
  // Leave as null to run in "local test mode" (one device only).
  firebase: null,
  // firebase: {
  //   apiKey: '...',
  //   authDomain: '...firebaseapp.com',
  //   projectId: '...',
  //   appId: '...',
  // },

  // ---- The two players --------------------------------------
  // phone is optional: if set, "Nudge" opens a text to that number.
  // photo is optional: shown instead of the emoji (a square face crop).
  players: [
    { id: 'valerie', name: 'Valerie', nickname: 'The Detective', emoji: '🌸', color: '#d9467a', phone: '', photo: 'avatars/valerie.png' },
    { id: 'bobby',   name: 'Bobby',   nickname: 'The Closer',    emoji: '🎣', color: '#2f74c9', phone: '', photo: 'avatars/bobby.png' },
  ],

  rules: {
    // 'lose' = classic rules, a wrong guess loses the game.
    // 'skip' = gentler, a wrong guess just ends your turn.
    wrongGuess: 'lose',
  },

  // Tap-to-ask questions. Add family inside jokes here!
  quickQuestions: [
    'Do they wear glasses?',
    'Are they wearing a hat?',
    'Do they have facial hair?',
    'Do they have long hair?',
    'Is their hair blonde?',
    'Is their hair dark brown or black?',
    'Are they bald?',
    'Do they have curly hair?',
    'Are they wearing earrings?',
    'Is their shirt red?',
    'Is it a kid?',
    'Is it a real family member?',
  ],

  // One-tap trash talk / cheering the other player sees.
  taunts: ['😏', '🤔', '😂', '🔥', '❤️', '🙈', 'Getting warmer…', 'Nice try!', 'You’re going down 😤', 'Lucky guess…'],

  // Ideas shown when starting a game ("loser does the dishes").
  stakesIdeas: ['Loser does the dishes', 'Winner picks the movie', 'Loser makes coffee', 'Bragging rights only', 'Loser buys ice cream'],

  // Random message shown when each player wins. Write them in their voice!
  winMessages: {
    valerie: ['Valerie cracks the case again! 🕵️‍♀️', 'Elementary, my dear Bobby.', 'Never doubt Valerie.'],
    bobby: ['Bobby reels in another win! 🎣', 'The Closer strikes again.', 'Bobby: 1, Mystery: 0'],
  },

  // Banners on the home screen on special days (MM-DD).
  specialDates: [
    { date: '06-14', message: 'Happy Anniversary! 💍 Loser owes the winner dinner.' },
    { date: '12-25', message: 'Merry Christmas! 🎄 Holiday rematch?' },
  ],

  // ---- Decks --------------------------------------------------
  // Every game deals 24 cards. Everyone in FAMILY is ALWAYS dealt;
  // the remaining spots are filled at random with cartoon people.
  decks: [
    { id: 'family', name: 'Family', people: [...FAMILY, ...PLACEHOLDERS] },
  ],
};
