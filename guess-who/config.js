// ============================================================
//  GUESS WHO: FAMILY EDITION, the one file to personalize
// ============================================================
//  Everything your parents see (names, colors, people on the
//  cards, quick questions, trash talk, win messages, special
//  dates) lives here. Edit, commit, and the app updates.
// ============================================================

// ---- Family (always on the board) -----------------------------
// photo: their Memoji in guess-who/memoji/
// tags:  what you can see on their card. These power the one-tap
//        "flip everyone who doesn't fit" button, so keep them true
//        to the Memoji. Options: glasses hat facial bald blonde gray
//        long freckles earrings nosering gap dog
// fact:  revealed at the end of a game when they were the mystery
//        person. A memory or inside joke is perfect.
const FAMILY = [
  { name: 'Valerie',   photo: 'memoji/valerie.webp',   tags: 'glasses blonde long', fact: '' },
  { name: 'Bobby',     photo: 'memoji/bobby.webp',     tags: 'glasses bald facial gray', fact: '' },
  { name: 'Fletcher',  photo: 'memoji/fletcher.webp',  tags: 'blonde', fact: '' },
  { name: 'Sonny',     photo: 'memoji/sonny.webp',     tags: 'blonde', fact: '' },
  { name: 'Emily',     photo: 'memoji/emily.webp',     tags: 'long', fact: '' },
  { name: 'Nick',      photo: 'memoji/nick.webp',      tags: 'facial gap', fact: '' },
  { name: 'Chelsea',   photo: 'memoji/chelsea.webp',   tags: 'hat long', fact: '' },
  { name: 'Bill',      photo: 'memoji/bill.webp',      tags: 'glasses facial', fact: '' },
  { name: 'Aydee',     photo: 'memoji/aydee.webp',     tags: 'glasses long gap', fact: '' },
  { name: 'Seth',      photo: 'memoji/seth.webp',      tags: 'facial', fact: '' },
  { name: 'Sadie',     photo: 'memoji/sadie.webp',     tags: 'freckles long', fact: '' },
  { name: 'Lara',      photo: 'memoji/lara.webp',      tags: 'blonde nosering earrings', fact: '' },
  { name: 'Jennifer',  photo: 'memoji/jennifer.webp',  tags: 'freckles earrings long', fact: '' },
  { name: 'Elizabeth', photo: 'memoji/elizabeth.webp', tags: 'blonde long', fact: '' },
  { name: 'Auntie',    photo: 'memoji/auntie.webp',    tags: 'glasses gray earrings', fact: '' },
  { name: 'Mamaw',     photo: 'memoji/mamaw.webp',     tags: 'earrings', fact: '' },
  { name: 'Uncle Don', photo: 'memoji/uncle-don.webp', tags: 'glasses gray', fact: '' },
  { name: 'Christine', photo: 'memoji/christine.webp', tags: 'glasses long', fact: '' },
  { name: 'Sophie',    photo: 'memoji/sophie.webp',    tags: 'dog', fact: '' },
  { name: 'Baby',      photo: 'memoji/baby.webp',      tags: 'dog', fact: '' },
  { name: 'Joan',      photo: 'memoji/joan.webp',      tags: 'gray', fact: '' },
  { name: 'Suzanne',   photo: 'memoji/suzanne.webp',   tags: 'glasses long', fact: '' },
  { name: 'Ron',       photo: 'memoji/ron.webp',       tags: '', fact: '' },
  { name: 'Jim',       photo: 'memoji/jim.webp',       tags: '', fact: '' },
];

// ---- Cartoon placeholders (fill the empty spots) ---------------
const PLACEHOLDERS = [
  { name: 'Alex',    skin: 1, hair: 'brown',  style: 'short', glasses: true,  shirt: 'blue',   fact: 'Collects vintage postcards.' },
  { name: 'Bea',     skin: 0, hair: 'blonde', style: 'long',  earrings: true, shirt: 'red',    fact: 'Can whistle any song backwards.' },
  { name: 'Carlos',  skin: 3, hair: 'black',  style: 'short', facial: 'mustache', shirt: 'green', fact: 'Makes legendary pancakes.' },
  { name: 'Dina',    skin: 4, hair: 'black',  style: 'curly', earrings: true, shirt: 'yellow', fact: 'Ran a marathon in a banana suit.' },
  { name: 'Eli',     skin: 2, hair: 'red',    style: 'spiky', shirt: 'purple',                   fact: 'Has never lost at checkers.' },
  { name: 'Fran', age: 'older',    skin: 1, hair: 'gray',   style: 'bun',   glasses: true,  shirt: 'teal',     fact: 'Knits sweaters for her cats.' },
  { name: 'Gus', age: 'older',     skin: 0, hair: 'gray',   style: 'bald',  facial: 'beard', shirt: 'red',     fact: 'Retired lighthouse keeper.' },
  { name: 'Hana',    skin: 2, hair: 'black',  style: 'bob',   hat: 'beanie',  shirt: 'blue',     fact: 'Speaks four languages.' },
  { name: 'Ivan',    skin: 1, hair: 'blonde', style: 'short', hat: 'cap',     shirt: 'green',    fact: 'Fixes old motorcycles.' },
  { name: 'Jade',    skin: 3, hair: 'brown',  style: 'long',  glasses: true,  shirt: 'purple',   fact: 'Grows giant tomatoes.' },
  { name: 'Kofi',    skin: 5, hair: 'black',  style: 'short', facial: 'beard', shirt: 'yellow',  fact: 'Plays the saxophone.' },
  { name: 'Lena',    skin: 0, hair: 'red',    style: 'curly', shirt: 'teal',                     fact: 'Once met a famous astronaut.' },
  { name: 'Milo',    skin: 2, hair: 'brown',  style: 'spiky', glasses: true, hat: 'cap', shirt: 'red', fact: 'Builds birdhouses.' },
  { name: 'Nora',    skin: 4, hair: 'brown',  style: 'bun',   earrings: true, shirt: 'green',    fact: 'Bakes bread every Sunday.' },
  { name: 'Otto', age: 'older',    skin: 1, hair: 'gray',   style: 'short', glasses: true, facial: 'mustache', shirt: 'blue', fact: 'Tells the worst dad jokes.' },
  { name: 'Pia',     skin: 3, hair: 'blonde', style: 'bob',   shirt: 'yellow',                   fact: 'Champion bowler.' },
  { name: 'Quinn',   skin: 2, hair: 'red',    style: 'long',  hat: 'fedora',  shirt: 'purple',   fact: 'Writes mystery novels.' },
  { name: 'Raj',     skin: 4, hair: 'black',  style: 'short', glasses: true,  shirt: 'teal',     fact: 'Can solve a Rubik’s cube in a minute.' },
  { name: 'Sofia',   skin: 1, hair: 'brown',  style: 'curly', glasses: true, earrings: true, shirt: 'red', fact: 'Sings in a choir.' },
  { name: 'Tom',     skin: 0, hair: 'blonde', style: 'short', facial: 'beard', hat: 'beanie', shirt: 'green', fact: 'Goes ice fishing every winter.' },
  { name: 'Uma',     skin: 5, hair: 'black',  style: 'long',  earrings: true, shirt: 'blue',     fact: 'Paints watercolor landscapes.' },
  { name: 'Vic', age: 'older',     skin: 3, hair: 'gray',   style: 'bald',  glasses: true, shirt: 'yellow',    fact: 'Knows every state capital.' },
  { name: 'Wren',    skin: 2, hair: 'brown',  style: 'bob',   hat: 'cap',    shirt: 'teal',      fact: 'Volunteers at the animal shelter.' },
  { name: 'Xavier',  skin: 5, hair: 'black',  style: 'spiky', facial: 'mustache', shirt: 'purple', fact: 'Dances salsa on Fridays.' },
];

export const CONFIG = {
  appTitle: 'Guess Who?',
  subtitle: 'Family Edition',

  // Both phones must use the same room code. Make it hard to guess.
  roomCode: 'room-m3z6ue4cyzngrdm32z9e',

  // The family question box (ask.html) uses its own code, so relatives
  // who get that link can't reach your parents' game. Make it long too.
  questionsCode: 'questions-9nl1n20jf80duowkd0b5',

  // ---- Holiday theme -----------------------------------------
  // on: true (always), 'auto' (Nov 20 - Jan 6 only) or false (off).
  // Anything set here replaces the normal value while it's on.
  holiday: {
    on: true,
    theme: 'christmas',
    subtitle: 'Christmas Edition',
    logo: '🎄',
    confetti: ['❄️', '🎁', '⭐️', '🎄', '❄️', '🔔', '🎁', '⭐️'],
    // Shown once on each phone the first time it's opened.
    giftMessage: {
      title: 'Merry Christmas!',
      body: 'A game made just for you two, starring the whole family. Play from anywhere, any time. Loser wraps the presents.',
      from: 'Love, your family',
    },
    stakesIdeas: ['Loser wraps the presents', 'Winner gets the first cookie', 'Loser makes the hot cocoa', 'Winner picks the Christmas movie', 'Loser does the dishes after dinner'],
    taunts: ['🎄', '🎅', '❄️', '😏', '🤔', '😂', 'Ho ho NO 🎅', 'Someone’s on the naughty list…', 'Getting warmer… like cocoa ☕️', 'Lucky guess, Scrooge'],
    winMessages: {
      valerie: ['Valerie sleighs it again! 🛷', 'All I want for Christmas is… another win. 🎄', 'Valerie: 1, Bobby: coal.'],
      bobby: ['Bobby sleighs it! 🛷', 'Ho ho ho, the Closer strikes again! 🎅', 'Bobby unwraps another win. 🎁'],
    },
  },

  // ---- Online play (two phones, two places) -----------------
  // Paste your Firebase web config here (see guess-who/README.md).
  // Leave as null to run in "local test mode" (one device only).
  firebase: {
    apiKey: 'AIzaSyDbRVE44PflvarRjYjW47nd-pjvcr3VzUw',
    authDomain: 'family-guess-who.firebaseapp.com',
    projectId: 'family-guess-who',
    storageBucket: 'family-guess-who.firebasestorage.app',
    messagingSenderId: '243812175885',
    appId: '1:243812175885:web:303e3461aa8e2b86690544',
  },

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
    // tag links a question to the card tags above, for one-tap flipping
    { q: 'Do they wear glasses?', tag: 'glasses' },
    { q: 'Are they wearing a hat?', tag: 'hat' },
    { q: 'Do they have a beard or mustache?', tag: 'facial' },
    { q: 'Are they bald?', tag: 'bald' },
    { q: 'Is their hair blonde?', tag: 'blonde' },
    { q: 'Is their hair gray or white?', tag: 'gray' },
    { q: 'Do they have long hair?', tag: 'long' },
    { q: 'Do they have freckles?', tag: 'freckles' },
    { q: 'Are they wearing earrings?', tag: 'earrings' },
    { q: 'Do they have a nose ring?', tag: 'nosering' },
    { q: 'Do they have a gap in their teeth?', tag: 'gap' },
    { q: 'Is it a dog?', tag: 'dog' },
  ],

  // "Thinking of you" quick messages (the big button sends a heart).
  thinkingOfYou: ['Will you marry me?', 'Love you more', 'Love you better', 'Love you best'],

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
  // the remaining spots are filled at random with placeholder people.
  decks: [
    { id: 'family', name: 'Family', people: [...FAMILY.map((p) => ({ ...p, family: true })), ...PLACEHOLDERS] },
  ],
};
