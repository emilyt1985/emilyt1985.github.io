// ============================================================
//  GUESS WHO: FAMILY EDITION, the one file to personalize
// ============================================================
//  Everything your parents see (names, colors, people on the
//  cards, quick questions, trash talk, win messages, special
//  dates) lives here. Edit, commit, and the app updates.
// ============================================================

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
  players: [
    { id: 'mom', name: 'Mom', nickname: 'The Detective', emoji: '🌸', color: '#d9467a', phone: '' },
    { id: 'dad', name: 'Dad', nickname: 'The Closer',    emoji: '🎣', color: '#2f74c9', phone: '' },
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
  ],

  // One-tap trash talk / cheering the other player sees.
  taunts: ['😏', '🤔', '😂', '🔥', '❤️', '🙈', 'Getting warmer…', 'Nice try!', 'You’re going down 😤', 'Lucky guess…'],

  // Ideas shown when starting a game ("loser does the dishes").
  stakesIdeas: ['Loser does the dishes', 'Winner picks the movie', 'Loser makes coffee', 'Bragging rights only', 'Loser buys ice cream'],

  // Random message shown when each player wins. Write them in their voice!
  winMessages: {
    mom: ['Mom cracks the case again! 🕵️‍♀️', 'Elementary, my dear Dad.', 'Never doubt Mom.'],
    dad: ['Dad reels in another win! 🎣', 'The Closer strikes again.', 'Dad: 1, Mystery: 0'],
  },

  // Banners on the home screen on special days (MM-DD).
  specialDates: [
    { date: '06-14', message: 'Happy Anniversary! 💍 Loser owes the winner dinner.' },
    { date: '12-25', message: 'Merry Christmas! 🎄 Holiday rematch?' },
  ],

  // ---- Decks --------------------------------------------------
  // Each deck needs at least 24 people. If a deck has more than 24,
  // every game draws a fresh random 24, so it stays interesting.
  //
  // To use real photos: put them in guess-who/photos/ and add
  //   photo: 'photos/aunt-linda.jpg'
  // A "fact" is revealed at the end of the game when that person
  // was the mystery person. Great place for a memory or inside joke.
  //
  // Placeholder people below are drawn by the app from their traits.
  decks: [
    {
      id: 'placeholder',
      name: 'Placeholder Crew',
      people: [
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
      ],
    },
  ],
};
