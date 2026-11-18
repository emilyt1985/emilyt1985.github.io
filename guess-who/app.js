import { CONFIG } from './config.js';
import { faceSVG } from './faces.js';
import { connectStore, mediaStore } from './store.js';

// ---------- holiday theme ----------
const HOL = CONFIG.holiday;
const holidayOn = (() => {
  if (!HOL || !HOL.on) return false;
  if (HOL.on !== 'auto') return true;
  const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
  return (m === 11 && day >= 20) || m === 12 || (m === 1 && day <= 6);
})();
if (holidayOn) {
  for (const k of ['subtitle', 'stakesIdeas', 'taunts', 'winMessages']) if (HOL[k]) CONFIG[k] = HOL[k];
  document.documentElement.classList.add('theme-' + (HOL.theme || 'holiday'));
}
// ---------- setup & helpers ----------
const app = document.getElementById('app');
const PLAYERS = CONFIG.players;
const P = (id) => PLAYERS.find((p) => p.id === id);
const opp = (id) => PLAYERS.find((p) => p.id !== id).id;
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ls = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ---------- sound (BRAND.md §9, off by default) + haptics ----------
const Sound = (() => {
  let ctx = null;
  const on = () => ls.get('gw.sound', false) === true;
  const tone = (f, t0, dur, type = 'sine', vol = 0.12, f2) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, ctx.currentTime + t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, ctx.currentTime + t0 + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime + t0); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
    o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + 0.02);
  };
  const noise = (dur, vol, hp) => {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol; src.buffer = buf; src.connect(f).connect(g).connect(ctx.destination); src.start();
  };
  const SOUNDS = {
    tap: () => noise(0.04, 0.25, 3000),                                   // soft paper tick
    back: () => noise(0.12, 0.18, 1200),                                  // page turning back
    confirm: () => { noise(0.03, 0.5, 2500); setTimeout(() => noise(0.06, 0.35, 1500), 60); }, // shutter click
    flip: () => noise(0.09, 0.3, 600),                                    // print set down
    error: () => tone(140, 0, 0.16, 'triangle', 0.2, 90),                 // wooden knock
    reward: () => { tone(1046, 0, 0.5, 'sine', 0.08); tone(1318, 0.15, 0.5, 'sine', 0.08); tone(1568, 0.3, 0.6, 'sine', 0.08); }, // music box
  };
  return {
    on,
    toggle() { ls.set('gw.sound', !on()); if (on()) this.play('confirm'); },
    play(name) {
      if (!on() || !SOUNDS[name]) return;
      try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); SOUNDS[name](); } catch {}
    },
  };
})();
// Haptic map (BRAND.md §9). Android only: iPhone web apps can't vibrate.
const HAPTIC = { light: 10, medium: 25, success: [20, 60, 30], error: [60, 40, 60] };
const haptic = (k) => { try { navigator.vibrate?.(HAPTIC[k]); } catch {} };
const feel = (sound, h) => { Sound.play(sound); haptic(h); };

CONFIG.decks.forEach((d) => d.people.forEach((p) => { p.id = p.id || slug(p.name); }));
const deckOf = (id) => CONFIG.decks.find((d) => d.id === id) || CONFIG.decks[0];
const person = (game, pid) => deckOf(game.deckId).people.find((p) => p.id === pid) || { id: pid, name: pid };
const portrait = (p) => (p.photo ? `<img src="${esc(p.photo)}" alt="" loading="lazy">` : faceSVG(p));

// who is holding this phone? (?me=bobby in the link sets it)
const urlMe = new URLSearchParams(location.search).get('me');
let me = P(urlMe) ? urlMe : ls.get('gw.me');
if (P(urlMe)) ls.set('gw.me', urlMe);
if (!P(me)) me = null;

let state = null;      // shared room state
let store = null;
let view = 'home';     // home | game | couch | leaders | settings
let guessMode = false;
let showSecret = false;
let modal = null;      // { html }
let connErr = null;
let lastNeedsMe = null;
let opening = null;    // 'game' | 'couch': just started one online, waiting for it to arrive
function startOpening(kind) {
  opening = kind;
  setTimeout(() => { if (opening === kind) { opening = null; toast('Couldn’t reach the album. Check your Wi-Fi or signal, then try again.', 'is-danger'); render(); } }, 15000);
}
let fam = { notes: [] };   // family notes (separate document)
let noteIdx = 0;
let mstore = null;
const media = {};          // id -> data URL ('…' while loading, 'missing' if gone)
const player = new Audio();
let playing = null;
player.onended = () => { playing = null; render(); };
const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
function mediaSrc(id) {
  if (media[id] && media[id] !== '…') return media[id];
  if (!media[id] && mstore) {
    media[id] = '…';
    mstore.get(id).then((d) => { media[id] = d || 'missing'; render(); }).catch(() => { media[id] = 'missing'; render(); });
  }
  return null;
}
let patchOnly = false; // my own flip: update card classes instead of a full re-render

// ---------- card tags (for one-tap flipping) ----------
const TAGS = ['glasses', 'hat', 'facial', 'bald', 'blonde', 'gray', 'long', 'freckles', 'earrings', 'nosering', 'gap', 'dog'];
function tagsOf(p) {
  if (typeof p.tags === 'string') return new Set(p.tags.split(/\s+/).filter(Boolean));
  const t = new Set();                       // cartoon people: read their drawing traits
  if (p.glasses) t.add('glasses');
  if (p.hat) t.add('hat');
  if (p.facial && p.facial !== 'stubble') t.add('facial');
  if (p.style === 'bald') t.add('bald');
  if (p.hair === 'blonde') t.add('blonde');
  if (p.hair === 'gray' || p.hair === 'white') t.add('gray');
  if (['long', 'wavy', 'curly'].includes(p.style)) t.add('long');
  if (p.freckles) t.add('freckles');
  if (p.earrings) t.add('earrings');
  if (p.noseRing) t.add('nosering');
  return t;
}
const norm = (q) => String(q).toLowerCase().replace(/[^a-z ]/g, '').trim();
const QUICK = CONFIG.quickQuestions.map((x) => (typeof x === 'string' ? { q: x, tag: null } : x));
const tagFor = (text) => QUICK.find((x) => norm(x.q) === norm(text))?.tag || null;

// Cards on `board` that don't fit an answer, given flips already made.
function misfits(g, board, flippedList, tag, answer) {
  if (!tag || !TAGS.includes(tag) || (answer !== 'yes' && answer !== 'no')) return null;
  const want = answer === 'yes', down = new Set(flippedList);
  return board.filter((pid) => !down.has(pid) && tagsOf(person(g, pid)).has(tag) !== want);
}

// ---------- game rules (mutations run inside store.update) ----------
// Both players move at the same time: each has at most one question
// waiting for the other to answer. Opening the app = answer theirs,
// review your answer, flip, ask your next one.
function deal() {
  const deck = CONFIG.decks[0];
  // every family member is always dealt; placeholder people fill the rest
  const real = shuffle(deck.people.filter((p) => p.family).map((p) => p.id)).slice(0, 24);
  const rest = shuffle(deck.people.filter((p) => !p.family).map((p) => p.id));
  const ids = shuffle([...real, ...rest.slice(0, 24 - real.length)]);
  const [a, b] = PLAYERS.map((p) => p.id);
  const secretA = pick(ids);
  const secretB = pick(ids.filter((x) => x !== secretA));
  return {
    v: 2, id: Date.now().toString(36), deckId: deck.id, board: ids,
    secret: { [a]: secretA, [b]: secretB },
    flipped: { [a]: [], [b]: [] },
    asked: { [a]: 0, [b]: 0 },
    startedAt: Date.now(), winner: null,
  };
}

function startGame(stakes) {
  return store.update((s) => {
    const [a, b] = PLAYERS.map((p) => p.id);
    s.game = Object.assign(deal(), {
      phase: 'play',
      q: { [a]: null, [b]: null },        // my question waiting for an answer
      unseen: { [a]: null, [b]: null },   // log index of an answer I haven't reviewed
      lock: { [a]: false, [b]: false },   // gentle rules: no guessing again until your next answer
      log: [], stakes: stakes || '', startedBy: me,
    });
  });
}

function finish(g, s, winner, how) {
  g.phase = 'over';
  g.winner = winner;
  g.endedAt = Date.now();
  const loser = opp(winner);
  s.history.unshift({
    id: g.id, winner, loser, how, couch: !!g.couch,
    questions: g.asked[winner], totalQuestions: g.asked[winner] + g.asked[loser],
    mystery: g.secret[loser], deckId: g.deckId, stakes: g.stakes,
    startedAt: g.startedAt, endedAt: g.endedAt,
  });
  s.history = s.history.slice(0, 300);
}

const live = (s) => (s.game && s.game.v === 2 && s.game.phase === 'play' ? s.game : null);

const act = {
  ask: (text) => store.update((s) => {
    const g = live(s); if (!g || g.q[me]) return false;
    g.q[me] = { text, tag: tagFor(text), at: Date.now() };
    g.unseen[me] = null;
  }),
  answer: (ans) => store.update((s) => {
    const g = live(s), o = opp(me); if (!g || !g.q[o]) return false;
    g.log.push({ kind: 'q', by: o, text: g.q[o].text, tag: g.q[o].tag, answer: ans, at: Date.now(), askedAt: g.q[o].at });
    g.asked[o]++;
    g.q[o] = null;
    g.unseen[o] = g.log.length - 1;
    g.lock[o] = false;
  }),
  seen: () => store.update((s) => { const g = live(s); if (!g || g.unseen[me] == null) return false; g.unseen[me] = null; }),
  flip: (pid) => store.update((s) => {
    const g = live(s); if (!g) return false;
    const f = g.flipped[me]; const i = f.indexOf(pid);
    i >= 0 ? f.splice(i, 1) : f.push(pid);
  }),
  flipMany: (ids) => store.update((s) => {
    const g = live(s); if (!g) return false;
    for (const pid of ids) if (!g.flipped[me].includes(pid)) g.flipped[me].push(pid);
    g.unseen[me] = null;
  }),
  guess: (pid) => store.update((s) => {
    const g = live(s); if (!g || g.lock[me]) return false;
    const right = g.secret[opp(me)] === pid;
    g.log.push({ kind: 'guess', by: me, pid, correct: right, at: Date.now() });
    if (right) return finish(g, s, me, 'guess');
    if (CONFIG.rules.wrongGuess === 'lose') return finish(g, s, opp(me), 'wrong-guess');
    if (!g.flipped[me].includes(pid)) g.flipped[me].push(pid);
    g.lock[me] = true;
  }),
  taunt: (text) => store.update((s) => {
    const g = s.game; if (!g) return false;
    g.log.push({ kind: 'taunt', by: me, text, at: Date.now() });
  }),
  forfeit: () => store.update((s) => {
    const g = live(s); if (!g) return false;
    g.log.push({ kind: 'forfeit', by: me, at: Date.now() });
    finish(g, s, opp(me), 'forfeit');
  }),
};

// ---------- same-couch game (one phone, pass it back and forth) ----------
const couchLive = (s) => (s.couch && s.couch.phase !== 'over' ? s.couch : null);
const couchAct = {
  start: (stakes) => store.update((s) => {
    s.couch = Object.assign(deal(), { couch: true, turn: pick(PLAYERS).id, phase: 'pass', stakes: stakes || '' });
  }),
  ready: () => store.update((s) => { const c = couchLive(s); if (!c || c.phase !== 'pass') return false; c.phase = 'play'; }),
  flip: (pid) => store.update((s) => {
    const c = couchLive(s); if (!c || c.phase !== 'play') return false;
    const f = c.flipped[c.turn]; const i = f.indexOf(pid);
    i >= 0 ? f.splice(i, 1) : f.push(pid);
  }),
  pass: () => store.update((s) => {
    const c = couchLive(s); if (!c || c.phase !== 'play') return false;
    c.asked[c.turn]++; c.turn = opp(c.turn); c.phase = 'pass';
  }),
  guess: (pid) => store.update((s) => {
    const c = couchLive(s); if (!c || c.phase !== 'play') return false;
    const who = c.turn, right = c.secret[opp(who)] === pid;
    c.asked[who]++;
    if (right) return finish(c, s, who, 'guess');
    if (CONFIG.rules.wrongGuess === 'lose') return finish(c, s, opp(who), 'wrong-guess');
    if (!c.flipped[who].includes(pid)) c.flipped[who].push(pid);
    c.turn = opp(who); c.phase = 'pass';
  }),
  quit: () => store.update((s) => { if (!s.couch) return false; s.couch = null; }),
};

// ---------- thinking of you ----------
const pingSeenKey = () => 'gw.pingSeen.' + me;
function sendPing(text) {
  return store.update((s) => { s.pings = (s.pings || []).concat({ from: me, text, at: Date.now() }).slice(-60); });
}
// Show any hearts that arrived since this phone last looked.
let loveSince = null; // while the heart pop-up is open: show everything since it opened
function checkPings() {
  if (!me || !state || (modal && loveSince == null)) return;
  const o = opp(me), seen = loveSince ?? ls.get(pingSeenKey(), 0);
  const fresh = (state.pings || []).filter((p) => p.from === o && p.at > seen);
  if (!fresh.length) return;
  if (fresh[fresh.length - 1].at <= ls.get(pingSeenKey(), 0) && loveSince != null) return; // nothing newer
  if (loveSince == null) loveSince = seen;
  ls.set(pingSeenKey(), fresh[fresh.length - 1].at);
  const last = fresh[fresh.length - 1];
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    try { new Notification(`${P(o).name} is thinking of you ❤️`, { body: last.text === '❤️' ? '' : last.text, icon: 'icon-192.png', tag: 'gw-ping' }); } catch {}
  }
  const words = [...new Set(fresh.map((p) => p.text).filter((t) => t !== '❤️'))].slice(-3);
  feel('reward', 'success');
  modal = `<div class="love">
      <div class="love-av">${avatar(o, 'xl')}<span class="love-heart">${I.heart}</span></div>
      <h2 class="title">${esc(P(o).name)} is thinking of you</h2>
      ${words.map((w) => `<p class="love-msg heading">“${esc(w)}”</p>`).join('')}
      <p class="caption">${fresh.length > 1 ? `${fresh.length} hearts · latest ` : ''}${ago(last.at)}</p>
      <button class="btn primary wide" data-act="ping-back">${I.heart}Send Love Back</button>
      <button class="btn quiet wide" data-act="close">Close</button>
    </div>`;
}

// ---------- family notes ----------
const famPerson = (id) => CONFIG.decks[0].people.find((p) => p.id === id);
const noteSeenKey = () => 'gw.noteSeen.' + me;
const myNotes = () => (fam.notes || []).filter((n) => !n.hidden && (n.to === 'both' || n.to === me)).sort((a, b) => b.at - a.at);
function markNotesSeen() {
  const list = myNotes(); if (!list.length) return;
  const i = ((noteIdx % list.length) + list.length) % list.length;
  if (list[i].at > ls.get(noteSeenKey(), 0)) setTimeout(() => { ls.set(noteSeenKey(), Math.max(ls.get(noteSeenKey(), 0), list[i].at)); }, 1500);
}

// What does the game need from *me* right now?
function needsMe(g) {
  if (!g || !me || g.v !== 2 || g.phase !== 'play') return false;
  return !!g.q[opp(me)] || !g.q[me];
}
function statusLine(g) {
  if (!g) return 'No game in progress';
  const o = P(opp(me)).name;
  if (g.phase === 'over') return g.winner === me ? 'You named them' : `${P(g.winner).name} won`;
  if (g.q[opp(me)]) return `${o} asked you a question`;
  if (!g.q[me]) return g.unseen[me] != null ? `${o} answered your question` : 'Your turn to ask a question';
  return `Waiting for ${o} to answer`;
}
function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

// ---------- notifications for the opponent's moves ----------
function announce(prev, next) {
  const pg = prev?.game, g = next?.game;
  if (!g || !me || g.v !== 2) return;
  const o = opp(me), who = P(o).name;
  if (pg && pg.id === g.id) {
    for (const e of g.log.slice(pg.log.length)) {
      if (e.kind === 'q' && e.by === me) toast(`${who} answered: ${e.answer === 'not sure' ? 'Not sure' : e.answer === 'yes' ? 'Yes' : 'No'}`);
      if (e.by !== o) continue;
      if (e.kind === 'taunt') toast(`${who}: ${e.text}`);
      if (e.kind === 'guess' && !e.correct) toast(`${who} named ${person(g, e.pid).name}. Wrong face.`);
    }
    if (!pg.q?.[o] && g.q?.[o]) toast(`${who} asked you a question`);
  }
  const nm = needsMe(g);
  if (nm && lastNeedsMe === false) {
    navigator.vibrate?.(120);
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(CONFIG.appTitle, { body: statusLine(g), icon: 'icon-192.png', tag: 'gw-turn' }); } catch {}
    }
  }
  lastNeedsMe = nm;
  document.title = (nm ? '(1) ' : '') + CONFIG.appTitle;
  if (navigator.setAppBadge) (nm ? navigator.setAppBadge(1) : navigator.clearAppBadge()).catch(() => {});
}

// ---------- views ----------
// Every class and value used here is defined in style.css from tokens.css (BRAND.md).

// "Inked in the margin" icons: 24pt grid, 2.25 stroke, round caps, one flat fill.
const ic = (body, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const I = {
  album: ic('<path class="f-paper" d="M5 4.5h12.5A1.5 1.5 0 0 1 19 6v13.5H6.5A1.5 1.5 0 0 1 5 18Z"/><path d="M5 17.5A1.5 1.5 0 0 1 6.5 16H19"/><rect class="f-print" x="9" y="7.5" width="6.5" height="5" stroke-width="1.6"/>'),
  rosette: ic('<path class="f-primary" stroke-width="1.9" d="M8.5 13.5 6.5 21l3-1.6 1.6 2.4 1-6.3M15.5 13.5l2 7.5-3-1.6-1.6 2.4-1-6.3"/><circle class="f-reward" cx="12" cy="9.5" r="6"/><circle class="f-paper" cx="12" cy="9.5" r="2.6" stroke-width="1.6"/>'),
  pencil: ic('<path class="f-paper" d="M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.7 18.5Z"/><path d="M14 6.8l3.2 3.2"/>'),
  back: ic('<path d="M14.5 5.5 8 12l6.5 6.5"/>'),
  chev: ic('<path d="m9.5 6 6 6-6 6"/>'),
  lock: ic('<rect class="f-paper" x="5.5" y="10.5" width="13" height="9.5" rx="1.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/><path d="M12 14.5v2" stroke-width="2.5"/>'),
  bell: ic('<path class="f-paper" d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5Z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>'),
  target: ic('<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
  turn: ic('<rect class="f-print" x="4" y="5" width="10" height="13" rx="1" transform="rotate(-8 9 11.5)"/><path class="f-paper" d="M11 7.5h7.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H11a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z"/><path d="M12.5 11h4.5M12.5 14h4.5M12.5 17h3" stroke-width="1.6"/>'),
  couch: ic('<path class="f-paper" d="M4 11.5a2 2 0 0 1 2 2V15h12v-1.5a2 2 0 1 1 3 1.7V19H3v-3.8a2 2 0 0 1 1-3.7Z"/><path d="M6 11.5V9a2.5 2.5 0 0 1 2.5-2.5h7A2.5 2.5 0 0 1 18 9v2.5M5 19v1.5M19 19v1.5"/>'),
  link: ic('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  heart: ic('<path class="f-primary" d="M12 20.5s-7.5-4.6-7.5-10.1A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1Z"/><path class="hl" d="M8.2 9.4c.6-.9 1.4-1.2 2.2-1.1" stroke-width="1.6"/>', 'hero-heart'),
  check: ic('<path d="M5 12.6l4.2 4.1L19 7.2" stroke-width="2.75"/>'),
  cross: ic('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke-width="2.75"/>'),
  maybe: ic('<path d="M9.2 9.2a2.9 2.9 0 1 1 3.9 2.7c-.7.3-1.1.9-1.1 1.6v.5" stroke-width="2.5"/><circle cx="12" cy="17.6" r=".6" fill="currentColor" stroke-width="1.6"/>'),
  warn: ic('<path class="f-paper" d="M12 4 21 19.5H3Z"/><path d="M12 10v4.5" stroke-width="2.5"/><circle cx="12" cy="17" r=".5" fill="currentColor"/>'),
  gift: ic('<rect class="f-primary" x="4" y="10" width="16" height="10" rx="1"/><rect class="f-paper" x="3" y="7" width="18" height="4" rx="1"/><path d="M12 7v13M12 7c-1.5-3.5-5.5-3.5-5-1 .3 1.2 2.5 1 5 1Zm0 0c1.5-3.5 5.5-3.5 5-1-.3 1.2-2.5 1-5 1Z"/>'),
  play: ic('<path class="f-print" d="M8.5 6v12l9.5-6Z"/>'),
  pause: ic('<path d="M9 6.5v11M15 6.5v11" stroke-width="3"/>'),
  camera: ic('<path class="f-paper" d="M4 8.5h3.5L9 6h6l1.5 2.5H20v10.5H4Z"/><circle class="f-print" cx="12" cy="13.5" r="3.4"/>'),
  sound: ic('<path class="f-paper" d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  close: ic('<path d="M7 7l10 10M17 7 7 17"/>'),
};

const avatar = (id, cls = '') => `<span class="av ${cls}" style="--pc:var(--c-${id})">${P(id).photo ? `<img src="${esc(P(id).photo)}" alt="">` : esc(P(id).name[0])}</span>`;
const tape = (text, cls = '') => `<span class="dymo ${cls}">${esc(text)}</span>`;
// "Who’s That?" with the apostrophe and question mark in Hutch Orange
const wordmark = (cls = '') => `<span class="wordmark ${cls}">${esc(CONFIG.appTitle).replace(/([’'?])/g, '<i>$1</i>')}</span>`;
const loading = (msg = 'Opening the album…') => `<div class="screen center splash">
    <div class="mark spin"><span class="print print-surface"><span class="q">?</span></span></div>
    <p class="caption">${esc(msg)}</p></div>`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

function renderWho() {
  return `<div class="screen center who">
    <div class="lockup">
      <span class="print print-surface lockup-print">${wordmark()}</span>
      ${tape(CONFIG.subtitle, 'lockup-tape')}
    </div>
    <h2 class="heading who-q">Whose phone is this?</h2>
    <div class="who-btns">${PLAYERS.map((p) => `
      <button class="who-btn print print-surface" data-act="be" data-id="${p.id}">
        ${avatar(p.id, 'xl')}<b class="heading">${esc(p.name)}</b><small class="caption">${esc(p.nickname)}</small></button>`).join('')}
    </div></div>`;
}

function record() {
  const h = state?.history || [];
  const r = {};
  PLAYERS.forEach((p) => { r[p.id] = { wins: 0, best: 0, streak: 0, fewest: null, qSum: 0, month: 0 }; });
  const now = new Date();
  let run = { id: null, n: 0 };
  [...h].reverse().forEach((g) => {
    const w = r[g.winner]; if (!w) return;
    w.wins++; w.qSum += g.questions;
    if (w.fewest == null || g.questions < w.fewest) w.fewest = g.questions;
    const d = new Date(g.endedAt);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) w.month++;
    run = run.id === g.winner ? { id: g.winner, n: run.n + 1 } : { id: g.winner, n: 1 };
    w.best = Math.max(w.best, run.n);
  });
  if (run.id) r[run.id].streak = run.n;
  return { r, total: h.length };
}

const pageTitle = (title) => `<header class="page-title"><h1 class="title">${esc(title)}</h1>${tape(CONFIG.subtitle)}</header>`;

function callouts() {
  const today = new Date();
  const mmdd = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const special = CONFIG.specialDates.find((s) => s.date === mmdd);
  return `${special ? `<div class="note-slip print-surface">${I.heart}<p>${esc(special.message)}</p></div>` : ''}
    ${store?.mode === 'local' ? `<div class="note-slip print-surface is-warning">${I.warn}<p><b>Practice album.</b> Games stay on this phone until the online album is connected.</p></div>` : ''}
    ${connErr ? `<div class="note-slip print-surface is-danger">${I.warn}<p><b>Can’t reach the album.</b> Check your Wi-Fi or signal. Your moves will show up once you’re back online.</p></div>` : ''}`;
}

// ---- Home (main menu): one job, get to your move ----
function renderHome() {
  const g = state?.game;
  const { r } = record();
  const [a, b] = PLAYERS;
  const nm = needsMe(g);
  const o = opp(me);
  const live = g && g.phase === 'play';
  const last = (state.pings || []).filter((p) => p.from === o).pop();
  return `<div class="screen home has-dock">
    <header class="home-top">
      <div class="lockup small">
        <span class="print print-surface lockup-print">${wordmark()}</span>
        ${tape(CONFIG.subtitle, 'lockup-tape')}
      </div>
      <button class="me-btn" data-act="go" data-view="settings" aria-label="The Back Pages">${avatar(me, 'md')}</button>
    </header>
    ${callouts()}

    <section class="scorecard print print-surface" aria-label="Score">
      <div class="side">${avatar(a.id, 'lg')}<span class="body-strong">${esc(a.name)}</span></div>
      <div class="score"><b class="num" style="color:var(--c-${a.id})">${r[a.id].wins}</b>${I.rosette}<b class="num" style="color:var(--c-${b.id})">${r[b.id].wins}</b></div>
      <div class="side">${avatar(b.id, 'lg')}<span class="body-strong">${esc(b.name)}</span></div>
    </section>

    ${live ? `
      ${tape('This album')}
      <button class="game-card print print-surface ${nm ? 'your-move' : ''}" data-act="go" data-view="game">
        ${avatar(o, 'md')}
        <span class="game-card-text"><b class="heading">${esc(statusLine(g))}</b>
          <small class="caption">${plural(24 - g.flipped[me].length, 'photo')} left for you · ${24 - g.flipped[o].length} for ${esc(P(o).name)}${g.stakes ? ` · ${esc(g.stakes)}` : ''}</small></span>
        ${nm ? tape('Your move', 'tag') : ''}${I.chev}
      </button>
      ${nm ? '' : `<button class="btn secondary wide" data-act="nudge">${I.bell}Nudge ${esc(P(o).name)}</button>`}`
    : newGamePanel(g)}

    ${tape('Send love')}
    <section class="panel love-panel">
      <button class="love-btn" data-act="ping" data-v="❤️">${avatar(o, 'md')}<span class="body-strong">Send ${esc(P(o).name)} your love</span>${I.heart}</button>
      <div class="chips">${(CONFIG.thinkingOfYou || []).map((t) => `<button class="chip" data-act="ping" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      ${last ? `<p class="caption">Last from ${esc(P(o).name)}: ${last.text === '❤️' ? 'a heart' : `“${esc(last.text)}”`} · ${ago(last.at)}</p>` : ''}
    </section>

    ${notesCard()}

    ${tape('Same room today?')}
    <button class="row-btn print print-surface" data-act="couch">${I.couch}<span class="row-text"><b class="body-strong">${state.couch && state.couch.phase !== 'over' ? 'Pick Up the Couch Game' : 'Play on One Phone'}</b>
      <small class="caption">Pass the phone back and forth and ask out loud</small></span>${I.chev}</button>
  </div>
  <div class="dock print-surface">${live
    ? `<button class="btn primary wide" data-act="go" data-view="game">${nm ? 'Take Your Turn' : 'Look at the Album'}</button>`
    : `<button class="btn primary wide" data-act="new">${I.album}Open the Album</button>`}</div>`;
}

function newGamePanel(g) {
  return `
    ${g?.phase === 'over' ? `<button class="row-btn print print-surface" data-act="go" data-view="game">${avatar(g.winner, 'md')}<span class="row-text"><b class="body-strong">${esc(P(g.winner).name)} won the last album</b><small class="caption">See both mystery faces</small></span>${I.chev}</button>` : ''}
    ${tape('A new album')}
    <section class="panel">
      <label class="caption" for="stakes">What’s riding on it? (optional)</label>
      <input id="stakes" class="field" maxlength="60" placeholder="Loser does the dishes">
      <div class="chips">${CONFIG.stakesIdeas.map((s) => `<button class="chip" data-act="stake" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    </section>`;
}

// ---- family notes card (home) ----
function famAvatar(n) {
  const p = famPerson(n.from);
  return `<span class="av md" style="--pc:var(--c-rule)">${p?.photo ? `<img src="${esc(p.photo)}" alt="">` : esc((n.fromName || '?').slice(0, 1))}</span>`;
}
function notesCard() {
  const list = myNotes();
  if (!list.length) return `${tape('From the family')}
    <section class="panel empty-state">${I.camera}<p class="caption">No notes yet. When the family sends one, it lands here.</p></section>`;
  const seen = ls.get(noteSeenKey(), 0);
  const unread = list.filter((n) => n.at > seen).length;
  const i = ((noteIdx % list.length) + list.length) % list.length;
  const n = list[i];
  return `<div class="label-row">${tape('From the family')}${unread ? tape(`${unread} new`, 'tag') : ''}</div>
    <section class="note-card print print-surface">
      <div class="note-from">${famAvatar(n)}<div><b class="body-strong">${esc(n.fromName)}</b><small class="caption">${ago(n.at)}${n.to === 'both' ? '' : ' · just for you'}</small></div>${n.at > seen ? tape('New', 'tag') : ''}</div>
      ${n.text ? `<p class="note-text">${esc(n.text)}</p>` : ''}
      ${n.photo ? ((src) => src && src !== 'missing'
        ? `<button class="note-photo" data-act="photo-full" data-v="${n.photo}" aria-label="Photo from ${esc(n.fromName)}. Tap to see it bigger."><img src="${src}" alt=""></button>`
        : `<div class="note-photo loading caption">${src === 'missing' ? 'This photo didn’t make it. Ask them to send it again.' : 'Developing the photo…'}</div>`)(mediaSrc(n.photo)) : ''}
      ${n.voice ? `<button class="voice-btn ${playing === n.voice.id ? 'on' : ''}" data-act="play-voice" data-v="${n.voice.id}">
          <span class="vplay">${playing === n.voice.id ? I.pause : I.play}</span><span class="vlabel body-strong">${playing === n.voice.id ? 'Playing' : 'Play'} ${esc(n.fromName)}’s voice note</span><span class="vdur num-sm">${fmtDur(n.voice.dur || 0)}</span></button>` : ''}
      ${list.length > 1 ? `<div class="note-nav"><button class="btn secondary icon-btn" data-act="note-prev" aria-label="Previous note">${I.back}</button><span class="caption num-sm">${i + 1} of ${list.length}</span><button class="btn secondary icon-btn" data-act="note-next" aria-label="Next note">${I.chev}</button></div>` : ''}
    </section>`;
}

// ---- the album (board) ----
function boardHTML(g, flippedList) {
  const flipped = new Set(flippedList);
  return `<div class="board ${guessMode ? 'guessing' : ''}" role="grid" aria-label="Your album">
      ${g.board.map((pid) => {
        const p = person(g, pid);
        return `<button class="card print print-surface ${flipped.has(pid) ? 'down' : ''}" data-act="card" data-id="${pid}" aria-pressed="${flipped.has(pid)}" aria-label="${esc(p.name)}${flipped.has(pid) ? ', turned over' : ''}">
          <span class="pic">${portrait(p)}</span><span class="nm">${esc(p.name)}</span></button>`;
      }).join('')}
    </div>
    <p class="caption board-hint">${guessMode ? 'Tap the face you think it is.' : 'Tap a photo to turn it over. Tap again to turn it back.'}</p>`;
}

function hud(left, center, secretPerson) {
  return `<header class="hud">
      ${left}
      <div class="hud-center">${center}</div>
      <button class="secret-btn ${showSecret ? 'open' : ''}" data-act="secret" aria-label="${showSecret ? 'Hide' : 'Show'} your mystery face">
        ${showSecret ? `<span class="mini print print-surface">${portrait(secretPerson)}</span><b class="body-strong">${esc(secretPerson.name)}</b>` : `${I.lock}<b class="body-strong">Mystery Face</b>`}
      </button>
    </header>`;
}

// ---- in-game HUD + dock ----
function renderGame() {
  const g = state?.game;
  if (!g || g.v !== 2 || (opening === 'game' && g.phase !== 'play')) { if (opening === 'game') return loading(); view = 'home'; return renderHome(); }
  if (opening === 'game') opening = null;
  const o = opp(me);
  const over = g.phase === 'over';
  const counts = `<span class="count">${avatar(me, 'xs')}<b class="num-sm">${24 - g.flipped[me].length}</b></span><span class="count">${avatar(o, 'xs')}<b class="num-sm">${24 - g.flipped[o].length}</b></span>`;
  return `${hud(`<button class="hud-back" data-act="go" data-view="home" aria-label="Back to home">${I.back}<span class="body-strong hud-back-label">Home</span></button>`, counts, person(g, g.secret[me]))}
    <div class="screen game has-dock ${guessMode ? 'guessing' : ''}">
      <div class="g-banner">${over ? renderOver(g) : ''}</div>
      <div class="g-board">${boardHTML(g, g.flipped[me])}</div>
      <div class="g-extras">
        ${renderLog(g)}
        ${!over ? `${tape(`Tease ${P(o).name}`)}
          <section class="panel taunts"><div class="chips">${CONFIG.taunts.map((t) => `<button class="chip" data-act="taunt" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div></section>
          <button class="btn quiet danger wide" data-act="forfeit">Close This Album</button>` : ''}
      </div>
      <div class="dock print-surface">${over ? overDock(g) : dock(g)}</div>
    </div>`;
}

const nameThem = (g) => (g.lock?.[me] ? `<p class="caption center-text">You can name someone again after your next answer.</p>`
  : `<button class="btn secondary wide" data-act="guessmode">${I.target}Name Them</button>`);

// One job at a time: answer theirs → see your answer → ask yours.
function dock(g) {
  const o = P(opp(me));
  if (guessMode) return `<section class="banner guess">
      ${tape('Name them')}
      <h2 class="heading">Who is ${esc(o.name)}’s mystery face?</h2>
      <p class="caption">Tap their photo.${CONFIG.rules.wrongGuess === 'lose' ? ' A wrong name ends the album.' : ''}</p>
      <button class="btn secondary wide" data-act="guessmode">Not Yet</button></section>`;
  if (g.q[o.id]) {
    const sec = person(g, g.secret[me]);
    return `<section class="banner ask-you">
      <div class="dock-head">${tape(`${o.name} asks`)}<span class="caption">${ago(g.q[o.id].at)}</span></div>
      <h2 class="heading q">${esc(g.q[o.id].text)}</h2>
      <div class="answer-row"><span class="mini print print-surface">${portrait(sec)}</span><span class="caption">Your mystery face is <b class="body-strong">${esc(sec.name)}</b></span></div>
      <div class="yn"><button class="btn yes" data-act="answer" data-v="yes">${I.check}Yes</button><button class="btn no" data-act="answer" data-v="no">${I.cross}No</button></div>
      <button class="btn quiet wide" data-act="answer" data-v="not sure">${I.maybe}Not Sure</button>
    </section>`;
  }
  if (g.unseen[me] != null) {
    const e = g.log[g.unseen[me]];
    const miss = misfits(g, g.board, g.flipped[me], e.tag, e.answer);
    const stamp = e.answer === 'yes' ? `<span class="stamp yes">${I.check}Yes</span>` : e.answer === 'no' ? `<span class="stamp no">${I.cross}No</span>` : `<span class="stamp maybe">${I.maybe}Not sure</span>`;
    return `<section class="banner flip">
      <div class="dock-head">${tape(`${o.name} answered`)}<span class="caption">${ago(e.at)}</span></div>
      <div class="answer-line">${stamp}<p class="body">“${esc(e.text)}”</p></div>
      ${miss === null ? `<p class="caption">Turn over everyone who doesn’t fit.</p><button class="btn secondary wide" data-act="seen">${I.check}Done Turning Over</button>`
        : miss.length ? `<button class="btn primary wide" data-act="autoflip" data-v="${miss.join(',')}">${I.turn}Turn Over the ${miss.length} Who Don’t Fit</button>
          <button class="btn quiet wide" data-act="seen">I’ll Do It Myself</button>`
        : `<p class="caption">Your album already matches. Nothing to turn over.</p><button class="btn secondary wide" data-act="seen">${I.check}Got It</button>`}
    </section>`;
  }
  if (!g.q[me]) return `<section class="banner your">
      <div class="dock-head">${tape('Your question')}</div>
      <form class="ask" data-form="ask"><input id="q" class="field" maxlength="120" placeholder="Does your person…" autocomplete="off" enterkeyhint="send" aria-label="Your yes-or-no question for ${esc(o.name)}"><button class="btn primary">Ask</button></form>
      <div class="chips">${QUICK.map((x) => `<button class="chip" data-act="quick" data-v="${esc(x.q)}">${esc(x.q)}</button>`).join('')}</div>
      ${nameThem(g)}</section>`;
  return `<section class="banner wait">
      <div class="dock-head">${tape('You asked')}<span class="caption">${ago(g.q[me].at)}</span></div>
      <h2 class="heading q">${esc(g.q[me].text)}</h2>
      <p class="caption">${esc(o.name)} will answer next time they open the album.</p>
      <div class="row"><button class="btn secondary" data-act="nudge">${I.bell}Nudge</button>${g.lock[me] ? '' : `<button class="btn secondary" data-act="guessmode">${I.target}Name Them</button>`}</div></section>`;
}

// ---- results / reward ----
function renderOver(g) {
  const viewer = g.couch ? g.winner : me;
  const o = opp(viewer);
  const won = !g.couch && g.winner === me;
  const w = P(g.winner);
  const msg = pick(CONFIG.winMessages[g.winner] || [`${w.name} wins.`]);
  const how = state.history.find((h) => h.id === g.id)?.how;
  const card = (id) => { const p = person(g, g.secret[id]); return `<div class="reveal-card print print-surface" style="--pc:var(--c-${id})">
      ${tape(`${P(id).name}’s mystery face`)}<span class="pic">${portrait(p)}</span><b class="heading">${esc(p.name)}</b>${p.fact ? `<p class="caption">${esc(p.fact)}</p>` : ''}</div>`; };
  return `<section class="banner over ${won ? 'won' : 'lost'}">
    ${won ? `<div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>` : ''}
    <div class="winner">${avatar(g.winner, 'xl')}<span class="winner-rosette">${I.rosette}</span></div>
    <h2 class="hero">${won ? 'You named them!' : `${esc(w.name)} wins`}</h2>
    <p class="body-strong msg">${esc(msg)}</p>
    ${how === 'wrong-guess' ? `<p class="caption">${esc(P(opp(g.winner)).name)} named the wrong face.</p>` : ''}
    ${how === 'forfeit' ? `<p class="caption">${esc(P(opp(g.winner)).name)} closed the album early.</p>` : ''}
    ${g.stakes ? `<p class="stakes caption">${esc(g.stakes)}: <b class="body-strong">${esc(P(opp(g.winner)).name)}</b> pays up</p>` : ''}
    <div class="reveals">${card(viewer)}${card(o)}</div>
  </section>`;
}
const overDock = (g) => `<div class="row"><button class="btn primary" data-act="${g.couch ? 'couch-new' : 'rematch'}">${I.album}Open a New Album</button><button class="btn secondary" data-act="go" data-view="leaders">${I.rosette}Scores</button></div>`;

// ---- same couch: the "pause" cover + couch turn ----
function renderCouch() {
  const c = state?.couch;
  if (!c || (opening === 'couch' && c.phase !== 'pass')) { if (opening === 'couch') return loading(); view = 'home'; return renderHome(); }
  if (opening === 'couch') opening = null;
  const who = c.turn, o = opp(who);
  if (c.phase === 'pass') return `<div class="screen center pass has-dock">
      ${tape('Same-couch album')}
      <div class="pass-print print print-surface">${avatar(who, 'hero')}</div>
      <h1 class="title">Pass the phone to ${esc(P(who).name)}</h1>
      <p class="body">${esc(P(o).name)}, eyes on the ceiling.</p>
      <button class="btn quiet" data-act="go" data-view="home">Back to Home</button>
      <div class="dock print-surface"><button class="btn primary wide pass-btn" data-act="couch-ready">I’m ${esc(P(who).name)}. Show My Album</button></div>
    </div>`;
  const sec = person(c, c.secret[who]);
  return `${hud(`<button class="hud-back" data-act="go" data-view="home" aria-label="Back to home">${I.back}<span class="body-strong hud-back-label">Home</span></button>`,
      `<span class="count">${avatar(who, 'xs')}<b class="body-strong">${esc(P(who).name)}’s turn</b></span>`, sec)}
    <div class="screen game has-dock ${guessMode ? 'guessing' : ''}">
      <div class="g-banner">${c.phase === 'over' ? renderOver(c) : ''}</div>
      <div class="g-board">${boardHTML(c, c.flipped[who])}</div>
      <div class="g-extras">${c.phase === 'over' ? '' : `<button class="btn quiet danger wide" data-act="couch-quit">Close This Album</button>`}</div>
      <div class="dock print-surface">${c.phase === 'over' ? overDock(c) : guessMode ? `<section class="banner guess">
          ${tape('Name them')}<h2 class="heading">Who is ${esc(P(o).name)}’s mystery face?</h2>
          <p class="caption">Tap their photo.${CONFIG.rules.wrongGuess === 'lose' ? ' A wrong name ends the album.' : ''}</p>
          <button class="btn secondary wide" data-act="guessmode">Not Yet</button></section>`
        : `<section class="banner your">
          <div class="dock-head">${tape(`${P(who).name}’s turn`)}</div>
          <h2 class="heading">Ask ${esc(P(o).name)} a question out loud</h2>
          <p class="caption">Turn over everyone who doesn’t fit, then pass the phone.</p>
          <button class="btn primary wide" data-act="couch-pass">Done. Pass to ${esc(P(o).name)}</button>
          <button class="btn secondary wide" data-act="guessmode">${I.target}Name Them</button></section>`}</div>
    </div>`;
}

function renderLog(g) {
  const qs = g.log.filter((e) => e.kind === 'q' || e.kind === 'guess');
  if (!qs.length) return '';
  const a = (ans) => ans === 'yes' ? `<b class="ans yes">${I.check}Yes</b>` : ans === 'no' ? `<b class="ans no">${I.cross}No</b>` : `<b class="ans maybe">${I.maybe}Not sure</b>`;
  return `${tape('Margin notes')}<details class="log print print-surface"><summary class="body-strong">${plural(qs.length, 'question')} so far</summary><ol>
    ${qs.map((e) => e.kind === 'q'
      ? `<li>${avatar(e.by, 'xs')}<span class="body">${esc(e.text)}</span>${a(e.answer)}</li>`
      : `<li>${avatar(e.by, 'xs')}<span class="body">Named ${esc(person(g, e.pid).name)}</span>${e.correct ? `<b class="ans yes">${I.check}Right</b>` : `<b class="ans no">${I.cross}Wrong</b>`}</li>`).join('')}
  </ol></details>`;
}

// ---- results history: Bragging Rights ----
function renderLeaders() {
  const { r, total } = record();
  const h = state?.history || [];
  const sorted = [...PLAYERS].sort((x, y) => r[y.id].wins - r[x.id].wins);
  const tie = r[PLAYERS[0].id].wins === r[PLAYERS[1].id].wins;
  const champ = sorted[0];
  const pct = (id) => (total ? Math.round((r[id].wins / total) * 100) : 0);
  const [a, b] = PLAYERS;
  const fmt = (t) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `<div class="screen">
    ${pageTitle('Bragging Rights')}
    <section class="champ print print-surface">
      ${total ? (tie ? `<div class="champ-pair">${avatar(a.id, 'lg')}${avatar(b.id, 'lg')}</div><h2 class="title">All square</h2><p class="caption">${plural(r[a.id].wins, 'win')} each. The next album decides it.</p>`
        : `<div class="winner">${avatar(champ.id, 'xl')}<span class="winner-rosette">${I.rosette}</span></div><h2 class="title">${esc(champ.name)}</h2><p class="caption">${esc(champ.nickname)} · holding the bragging rights</p>`)
        : `<div class="empty-state">${I.album}</div><h2 class="title">No albums yet</h2><p class="caption">Open the album from Home to start the first game.</p>`}
      ${total ? `<div class="bar" role="img" aria-label="${esc(a.name)} ${pct(a.id)} percent, ${esc(b.name)} ${100 - pct(a.id)} percent"><span style="width:${pct(a.id)}%;background:var(--c-${a.id})"></span><span style="width:${100 - pct(a.id)}%;background:var(--c-${b.id})"></span></div>
        <div class="bar-legend caption num-sm"><span>${esc(a.name)} ${pct(a.id)}%</span><span>${100 - pct(a.id)}% ${esc(b.name)}</span></div>` : ''}
    </section>

    ${total ? `${tape('The numbers')}
    <section class="stats print print-surface">
      <div class="st-row st-head"><span></span>${PLAYERS.map((p) => `<span>${avatar(p.id, 'xs')}<b class="body-strong">${esc(p.name)}</b></span>`).join('')}</div>
      ${[
        ['Wins', (id) => r[id].wins],
        ['This month', (id) => r[id].month],
        ['Current streak', (id) => r[id].streak],
        ['Best streak', (id) => r[id].best],
        ['Fewest questions to win', (id) => r[id].fewest ?? '–'],
        ['Average questions per win', (id) => (r[id].wins ? (r[id].qSum / r[id].wins).toFixed(1) : '–')],
      ].map(([label, f]) => `<div class="st-row"><span class="body">${label}</span>${PLAYERS.map((p) => `<b class="num-sm">${f(p.id)}</b>`).join('')}</div>`).join('')}
    </section>` : ''}

    ${h.length ? `${tape('Past albums')}<ul class="recent print print-surface">
      ${h.slice(0, 15).map((x) => {
        const d = deckOf(x.deckId); const m = d.people.find((p) => p.id === x.mystery);
        return `<li>${avatar(x.winner, 'sm')}<div><b class="body-strong">${esc(P(x.winner).name)} won${x.how === 'guess' ? ` in ${plural(x.questions, 'question')}` : x.how === 'forfeit' ? ' (album closed early)' : ' (wrong name)'}</b>
          <small class="caption">${m ? `Mystery face: ${esc(m.name)}` : ''}${x.couch ? ' · same couch' : ''}${x.stakes ? ` · ${esc(x.stakes)}` : ''}</small></div><time class="caption num-sm">${fmt(x.endedAt)}</time></li>`;
      }).join('')}</ul>` : ''}
  </div>`;
}

// ---- settings: The Back Pages ----
function renderSettings() {
  const base = location.origin + location.pathname;
  const soundOn = Sound.on();
  return `<div class="screen">
    ${pageTitle('The Back Pages')}
    ${tape('This phone belongs to')}
    <section class="panel"><div class="seg" role="radiogroup">${PLAYERS.map((p) => `<button role="radio" aria-checked="${p.id === me}" class="${p.id === me ? 'on' : ''}" data-act="be" data-id="${p.id}">${avatar(p.id, 'xs')}<span class="body-strong">${esc(p.name)}</span>${p.id === me ? I.check : ''}</button>`).join('')}</div></section>

    ${tape('Sound')}
    <button class="row-btn print print-surface" data-act="sound" role="switch" aria-checked="${soundOn}">${I.sound}<span class="row-text"><b class="body-strong">Album sounds</b><small class="caption">Paper ticks, a shutter click, a music-box chime for wins</small></span><span class="switch ${soundOn ? 'on' : ''}"><span class="caption">${soundOn ? 'On' : 'Off'}</span></span></button>

    ${tape('Personal links')}
    <div class="list print print-surface">
      ${PLAYERS.map((p) => `<button class="row-btn" data-act="copy" data-v="${esc(base + '?me=' + p.id)}">${avatar(p.id, 'sm')}<span class="row-text"><b class="body-strong">${esc(p.name)}’s link</b><small class="caption">Opens the album as ${esc(p.name)}</small></span><span class="row-action body-strong">${I.link}Copy</span></button>`).join('')}
    </div>

    ${tape('The family')}
    <button class="row-btn print print-surface" data-act="copy" data-v="${esc(base.replace(/[^/]*$/, '') + 'ask.html')}">${I.camera}<span class="row-text"><b class="body-strong">Invite the family</b><small class="caption">Copy the link for notes, photos and quiz questions</small></span><span class="row-action body-strong">${I.link}Copy</span></button>

    ${tape('Turn alerts')}
    <button class="row-btn print print-surface" data-act="notify">${I.bell}<span class="row-text"><b class="body-strong">Allow alerts</b><small class="caption">A pop-up when it’s your move while the album is open. When it’s closed, use Nudge.</small></span>${I.chev}</button>

    ${tape('Keep it on your Home Screen')}
    <section class="panel"><p class="body"><b class="body-strong">iPhone:</b> open in Safari, tap Share, then “Add to Home Screen”.</p><p class="body"><b class="body-strong">Android:</b> open the Chrome menu, then “Add to Home screen”.</p></section>

    ${tape('About this album')}
    <div class="list print print-surface">
      <div class="kv"><span class="body">Where games live</span><b class="body-strong">${store?.mode === 'online' ? 'Online' : 'This phone only'}</b></div>
      <div class="kv"><span class="body">A wrong name</span><b class="body-strong">${CONFIG.rules.wrongGuess === 'lose' ? 'Ends the album' : 'Ends your turn'}</b></div>
    </div>
  </div>`;
}

function nav() {
  const tab = (v, icon, label) => { const on = view === v; return `<button class="${on ? 'on' : ''}" data-act="go" data-view="${v}" aria-current="${on ? 'page' : 'false'}">${icon}<span>${label}</span></button>`; };
  return `<nav class="tabs" aria-label="Sections">${tab('home', I.album, 'Album')}${tab('leaders', I.rosette, 'Bragging Rights')}${tab('settings', I.pencil, 'Back Pages')}</nav>`;
}

function render() {
  const focus = document.activeElement?.id;
  const val = focus ? document.activeElement.value : null;
  const stakesVal = document.getElementById('stakes')?.value;
  const qVal = document.getElementById('q')?.value;
  const openLog = document.querySelector('details.log')?.open;

  if (!me) { app.innerHTML = renderWho(); return; }
  if (!state) { app.innerHTML = loading(); return; }
  // one-time holiday gift note on each phone
  const gm = holidayOn && HOL.giftMessage;
  if (gm && !modal && !ls.get('gw.gift.' + me)) {
    ls.set('gw.gift.' + me, true);
    modal = `<div class="gift">${I.gift}<h2 class="title">${esc(gm.title)}</h2>
      <p class="body gift-to">${esc(P(me).name)},</p><p class="body">${esc(gm.body)}</p><p class="body gift-from">${esc(gm.from)}</p>
      <button class="btn primary wide" data-act="close">${I.album}Open the Album</button></div>`;
  }
  checkPings();
  if (view === 'home') markNotesSeen();
  const body = { home: renderHome, game: renderGame, couch: renderCouch, leaders: renderLeaders, settings: renderSettings }[view]();
  const showTabs = view === 'home' || view === 'leaders' || view === 'settings';
  document.documentElement.dataset.view = view;
  app.innerHTML = body + (showTabs ? nav() : '') + (modal ? `<div class="modal-bg" data-act="close"><div class="modal print-surface" role="dialog" aria-modal="true">${modal}</div></div>` : '');

  // keep typed text across live re-renders
  if (stakesVal && document.getElementById('stakes')) document.getElementById('stakes').value = stakesVal;
  if (qVal && document.getElementById('q')) document.getElementById('q').value = qVal;
  if (openLog && document.querySelector('details.log')) document.querySelector('details.log').open = true;
  if (focus && document.getElementById(focus)) { const el = document.getElementById(focus); el.focus(); if (val != null) el.value = val; }
  // reserve room under the album for the bottom turn panel, however tall it is right now
  const dk = (view === 'game' || view === 'couch') && document.querySelector('.dock');
  document.documentElement.style.setProperty('--dock-space', dk ? `${dk.offsetHeight + 24}px` : '0px');
}

// ---------- UI events ----------
function toast(msg, kind = '') {
  document.querySelectorAll('.toast').forEach((x) => x.remove());
  const t = document.createElement('div');
  t.className = 'toast print-surface ' + kind; t.setAttribute('role', 'status');
  t.innerHTML = (kind === 'is-danger' ? I.warn : kind === 'is-love' ? I.heart : I.check) + `<span>${esc(msg)}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3100);
}

function confirmModal(html) {
  modal = html; render();
}
// Confirmation card: heading, body, then the action and a way out.
const ask = (title, body, yes, no, danger = false) => `<h2 class="title">${title}</h2><p class="body">${body}</p>
  <div class="stack">${danger ? yes.replace('btn primary', 'btn danger-fill') : yes}<button class="btn secondary wide" data-act="close">${no}</button></div>`;

async function nudge() {
  const o = P(opp(me));
  const url = location.origin + location.pathname + '?me=' + o.id;
  const text = `${P(me).name}: ${needsMe(state.game) ? 'come look at the album' : 'it’s your move'} in ${CONFIG.appTitle} ${url}`;
  feel('confirm', 'medium');
  if (o.phone) { location.href = `sms:${o.phone}${/iPhone|iPad/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(text)}`; return; }
  if (navigator.share) { try { await navigator.share({ text }); } catch {} return; }
  try { await navigator.clipboard.writeText(text); toast('Nudge copied. Paste it into a text.'); } catch { toast(text); }
}

const afterGuess = (G) => { if (G?.phase === 'over' && (G.couch || G.winner === me)) feel('reward', 'success'); else feel('error', 'error'); };

app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act, v = el.dataset.v;
  if (a === 'close' && e.target !== el) return; // clicks inside modal
  if (el.tagName === 'A') e.preventDefault();
  if (!['card', 'ping', 'answer', 'quick', 'autoflip', 'new', 'rematch', 'couch-new', 'guess-yes', 'couch-guess', 'go', 'close', 'sound'].includes(a)) feel('tap', 'light');

  switch (a) {
    case 'be': me = el.dataset.id; ls.set('gw.me', me); lastNeedsMe = null; render(); break;
    case 'go': feel(el.dataset.view === 'home' ? 'back' : 'tap', 'light'); view = el.dataset.view; guessMode = false; render(); window.scrollTo(0, 0); break;
    case 'stake': document.getElementById('stakes').value = v; break;
    case 'new': {
      const stakes = document.getElementById('stakes')?.value.trim();
      const g = state.game;
      if (g && g.v === 2 && g.phase === 'play') return confirmModal(ask('Start a fresh album?', 'The album you’re in now gets put away and won’t count.',
        `<button class="btn primary wide" data-act="new-yes" data-v="${esc(stakes)}">${I.album}Start Fresh</button>`, 'Keep This Album'));
      feel('confirm', 'medium');
      startOpening('game'); view = 'game'; showSecret = false; render(); await startGame(stakes); render(); window.scrollTo(0, 0);
      toast('The album is open. Tap Mystery Face to see who you are.');
      break;
    }
    case 'new-yes': feel('confirm', 'medium'); modal = null; startOpening('game'); view = 'game'; render(); await startGame(v); render(); break;
    case 'rematch': feel('confirm', 'medium'); startOpening('game'); showSecret = false; render(); await startGame(state.game?.stakes); render(); window.scrollTo(0, 0); toast('A fresh album is open.'); break;
    case 'secret': showSecret = !showSecret; render(); break;
    case 'quick': feel('confirm', 'medium'); await act.ask(v); break;
    case 'answer': feel('confirm', 'medium'); await act.answer(v); toast(`Answer sent to ${P(opp(me)).name}`); break;
    case 'seen': await act.seen(); break;
    case 'ping': {
      el.classList.add('sent'); setTimeout(() => el.classList.remove('sent'), 700);
      feel('confirm', 'medium');
      await sendPing(v); toast(`Love sent to ${P(opp(me)).name}`, 'is-love'); break;
    }
    case 'ping-back': feel('confirm', 'medium'); modal = null; loveSince = null; render(); await sendPing('❤️'); toast(`Love sent to ${P(opp(me)).name}`, 'is-love'); break;
    case 'play-voice': {
      if (playing === v) { player.pause(); playing = null; render(); break; }
      let src = media[v] && media[v] !== '…' ? media[v] : null;
      if (!src && mstore) { el.querySelector('.vlabel').textContent = 'Loading the voice note…'; src = await mstore.get(v).catch(() => null); media[v] = src || 'missing'; }
      if (!src || src === 'missing') { toast('That voice note didn’t load. Check your signal and tap Play again.', 'is-danger'); render(); break; }
      player.src = src;
      try { await player.play(); playing = v; } catch { toast('That voice note won’t play on this phone. Ask them to record it again.', 'is-danger'); }
      render(); break;
    }
    case 'photo-full': {
      const src = media[v]; if (!src || src === '…' || src === 'missing') break;
      return confirmModal(`<img class="full-photo" src="${src}" alt=""><button class="btn secondary wide" data-act="close">Close</button>`);
    }
    case 'note-next': noteIdx++; render(); break;
    case 'note-prev': noteIdx--; render(); break;
    case 'autoflip': {
      feel('flip', 'medium');
      const ids = v.split(',');
      document.querySelectorAll('.card').forEach((c) => { if (ids.includes(c.dataset.id)) c.classList.add('down'); });
      await act.flipMany(ids);
      toast(`Turned over ${ids.length} photo${ids.length === 1 ? '' : 's'}. Tap any one to turn it back.`);
      break;
    }
    case 'couch': {
      view = 'couch';
      if (!state.couch || state.couch.phase === 'over') { startOpening('couch'); render(); await couchAct.start(document.getElementById('stakes')?.value.trim()); } showSecret = false; guessMode = false; render(); window.scrollTo(0, 0); break;
    }
    case 'couch-new': feel('confirm', 'medium'); startOpening('couch'); render(); await couchAct.start(state.couch?.stakes); showSecret = false; render(); window.scrollTo(0, 0); break;
    case 'couch-ready': showSecret = false; await couchAct.ready(); window.scrollTo(0, 0); break;
    case 'couch-pass': showSecret = false; guessMode = false; await couchAct.pass(); window.scrollTo(0, 0); break;
    case 'couch-quit': return confirmModal(ask('Close this album?', 'This couch game won’t count on Bragging Rights.',
      `<button class="btn primary wide" data-act="couch-quit-yes">${I.cross}Close the Album</button>`, 'Keep Playing', true));
    case 'couch-quit-yes': modal = null; await couchAct.quit(); view = 'home'; render(); break;
    case 'guessmode': guessMode = !guessMode; render(); if (guessMode) document.querySelector('.board')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
    case 'card': {
      const pid = el.dataset.id;
      const couch = view === 'couch';
      const G = couch ? state.couch : state.game;
      if (guessMode) {
        const p = person(G, pid);
        feel('tap', 'light');
        return confirmModal(`<span class="guess-print print print-surface"><span class="pic">${portrait(p)}</span></span><h2 class="title">Is it ${esc(p.name)}?</h2>
          <p class="body">${CONFIG.rules.wrongGuess === 'lose' ? 'If that’s not their mystery face, the album ends and they win.' : 'If that’s wrong, you can’t name anyone again until your next answer.'}</p>
          <div class="stack"><button class="btn primary wide" data-act="${couch ? 'couch-guess' : 'guess-yes'}" data-v="${pid}">${I.target}It’s ${esc(p.name)}</button><button class="btn secondary wide" data-act="close">Not Sure Yet</button></div>`);
      }
      if (G.phase === 'over' || (couch && G.phase !== 'play')) return;
      feel('flip', 'light');
      el.classList.toggle('down'); // instant feedback (animates); sync follows
      el.setAttribute('aria-pressed', el.classList.contains('down'));
      patchOnly = true;
      await (couch ? couchAct.flip(pid) : act.flip(pid));
      break;
    }
    case 'couch-guess': modal = null; guessMode = false; showSecret = false; await couchAct.guess(v); afterGuess(state.couch); window.scrollTo(0, 0); break;
    case 'guess-yes': modal = null; guessMode = false; await act.guess(v); afterGuess(state.game); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    case 'taunt': await act.taunt(v); toast(`Sent to ${P(opp(me)).name}`); break;
    case 'forfeit': return confirmModal(ask('Close this album?', `${esc(P(opp(me)).name)} gets the win, and both mystery faces are shown.`,
      `<button class="btn primary wide" data-act="forfeit-yes">${I.cross}Close the Album</button>`, 'Keep Playing', true));
    case 'forfeit-yes': modal = null; await act.forfeit(); break;
    case 'close': feel('back', 'light'); modal = null; loveSince = null; render(); break;
    case 'nudge': nudge(); break;
    case 'sound': Sound.toggle(); haptic('light'); render(); break;
    case 'copy': try { await navigator.clipboard.writeText(v); toast('Link copied. Paste it into a text or email.'); } catch { prompt('Copy this link:', v); } break;
    case 'notify':
      if (!('Notification' in window)) { toast('This browser can’t show alerts. Add the album to your Home Screen first, then try again.', 'is-danger'); break; }
      toast((await Notification.requestPermission()) === 'granted' ? 'Alerts are on.' : 'Alerts are off. You can change this in your phone’s Settings.');
      break;
  }
});

app.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (e.target.dataset.form === 'ask') {
    const input = document.getElementById('q');
    const t = input.value.trim();
    if (!t) return input.focus();
    input.value = ''; input.blur();
    await act.ask(t.endsWith('?') ? t : t + '?');
  }
});

// ---------- boot ----------
(async () => {
  render();
  store = await connectStore(CONFIG, (next, err) => {
    if (err) { connErr = err; render(); return; }
    connErr = null;
    const prev = state;
    state = next;
    announce(prev, next);
    const G = view === 'couch' ? next.couch : next.game;
    if (patchOnly && (view === 'game' || view === 'couch') && G && !modal) {
      patchOnly = false;
      const down = new Set(view === 'couch' ? G.flipped[G.turn] : G.flipped[me]);
      document.querySelectorAll('.card').forEach((c) => { c.classList.toggle('down', down.has(c.dataset.id)); c.setAttribute('aria-pressed', down.has(c.dataset.id)); });
      const n = view === 'game' && document.querySelector('.vs b'); if (n) n.textContent = 24 - down.size;
      // the one-tap flip count may have changed
      if (view === 'game' && next.game.unseen?.[me] != null) render();
      return;
    }
    patchOnly = false;
    render();
  });
  render();
  mediaStore(CONFIG).then((m) => { mstore = m; render(); });
  connectStore(CONFIG, (d) => {
    if (!d) return;
    const before = new Set((fam.notes || []).map((n) => n.id));
    const hadData = fam.loaded;
    fam = Object.assign(d, { loaded: true });
    if (hadData && me) for (const n of myNotes()) if (!before.has(n.id)) toast(`New note from ${n.fromName}`, 'is-love');
    if (!patchOnly) render();
  }, CONFIG.questionsCode, () => ({ v: 1, questions: [], notes: [] }));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
})();
