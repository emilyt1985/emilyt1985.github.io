import { CONFIG } from './config.js';
import { faceSVG } from './faces.js';
import { connectStore } from './store.js';

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
const LOGO = (holidayOn && HOL.logo) || '❓';
const CONFETTI = (holidayOn && HOL.confetti) || ['🎉', '🎊', '⭐️', '🏆', '🎉', '🎊', '⭐️', '🎉'];

function letItSnow() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'snow'; box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 28; i++) {
    const f = document.createElement('i');
    f.textContent = i % 3 ? '•' : '❄';
    f.style.cssText = `left:${Math.random() * 100}%;font-size:${8 + Math.random() * 12}px;animation-duration:${9 + Math.random() * 12}s;animation-delay:-${Math.random() * 20}s;opacity:${0.35 + Math.random() * 0.5}`;
    box.appendChild(f);
  }
  document.body.appendChild(box);
}
if (holidayOn && HOL.theme === 'christmas') letItSnow();

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
let patchOnly = false; // my own flip: update card classes instead of a full re-render

// ---------- card tags (for one-tap flipping) ----------
const TAGS = ['glasses', 'hat', 'facial', 'bald', 'blonde', 'gray', 'long', 'freckles', 'earrings', 'nosering', 'dog'];
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

// What does the game need from *me* right now?
function needsMe(g) {
  if (!g || !me || g.v !== 2 || g.phase !== 'play') return false;
  return !!g.q[opp(me)] || !g.q[me];
}
function statusLine(g) {
  if (!g) return 'No game in progress';
  const o = P(opp(me)).name;
  if (g.phase === 'over') return g.winner === me ? 'You won! 🏆' : `${P(g.winner).name} won`;
  if (g.q[opp(me)]) return `${o} asked you a question`;
  if (!g.q[me]) return g.unseen[me] != null ? `${o} answered your question` : 'Your turn to ask';
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
      if (e.kind === 'q' && e.by === me) toast(`${who} answered: ${e.answer.toUpperCase()}`);
      if (e.by !== o) continue;
      if (e.kind === 'taunt') toast(`${who}: ${e.text}`);
      if (e.kind === 'guess' && !e.correct) toast(`${who} guessed ${person(g, e.pid).name}. Wrong! 😅`);
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
const avatar = (id, cls = '') => `<span class="av ${cls}" style="--pc:${P(id).color}">${P(id).photo ? `<img src="${esc(P(id).photo)}" alt="">` : P(id).emoji}</span>`;

// SF Symbols-style icons
const ic = (d, extra = '') => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"${extra}>${d}</svg>`;
const I = {
  home: ic('<path fill="currentColor" d="M12.7 2.9a1 1 0 0 0-1.4 0L2.6 10.8a1 1 0 0 0 1.3 1.5l.6-.5V20a1.5 1.5 0 0 0 1.5 1.5h3.8V15a1 1 0 0 1 1-1h2.4a1 1 0 0 1 1 1v6.5H18A1.5 1.5 0 0 0 19.5 20v-8.2l.6.5a1 1 0 0 0 1.3-1.5Z"/>'),
  trophy: ic('<path fill="currentColor" d="M7 2.5h10a1 1 0 0 1 1 1V5h2.5a1 1 0 0 1 1 1v1.5a4.5 4.5 0 0 1-4.3 4.5A6 6 0 0 1 13 15.4V18h2.5a1.5 1.5 0 0 1 1.5 1.5v2H7v-2A1.5 1.5 0 0 1 8.5 18H11v-2.6A6 6 0 0 1 6.8 12 4.5 4.5 0 0 1 2.5 7.5V6a1 1 0 0 1 1-1H6V3.5a1 1 0 0 1 1-1ZM18 7v3a2.5 2.5 0 0 0 1.5-2.3V7ZM4.5 7v.7A2.5 2.5 0 0 0 6 10V7Z"/>'),
  gear: ic('<circle cx="12" cy="12" r="8.3" fill="none" stroke="currentColor" stroke-width="3.6" stroke-dasharray="3.25 3.27"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="currentColor" stroke-width="3.4"/>'),
  back: ic('<path d="M15 4.5 7.5 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  chev: ic('<path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  lock: ic('<path fill="currentColor" d="M12 2.5A4.5 4.5 0 0 0 7.5 7v3H7a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2h-.5V7A4.5 4.5 0 0 0 12 2.5Zm-2.5 7.5V7a2.5 2.5 0 0 1 5 0v3Z"/>'),
  eye: ic('<path fill="currentColor" d="M12 5C6.5 5 2.7 9.6 1.8 11.4a1.3 1.3 0 0 0 0 1.2C2.7 14.4 6.5 19 12 19s9.3-4.6 10.2-6.4a1.3 1.3 0 0 0 0-1.2C21.3 9.6 17.5 5 12 5Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z"/>'),
  bell: ic('<path fill="currentColor" d="M12 2.5a6 6 0 0 0-6 6v4.2l-1.6 2.7a1 1 0 0 0 .9 1.6h13.4a1 1 0 0 0 .9-1.6L18 12.7V8.5a6 6 0 0 0-6-6Zm-2.6 15.5a2.7 2.7 0 0 0 5.2 0Z"/>'),
  target: ic('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>'),
  shuffle: ic('<path d="M3 7h3.5c2 0 3 1 4 2.5l3 5c1 1.5 2 2.5 4 2.5H21M3 17h3.5c2 0 3-1 4-2.5M13.5 9.5c1-1.5 2-2.5 4-2.5H21m-2.5-2.5L21 7l-2.5 2.5m0 5L21 17l-2.5 2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  couch: ic('<path fill="currentColor" d="M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v1.2A2.5 2.5 0 0 1 21.5 12.6V17a1.5 1.5 0 0 1-1.5 1.5h-.5V20h-2v-1.5h-11V20h-2v-1.5H4A1.5 1.5 0 0 1 2.5 17v-4.4A2.5 2.5 0 0 1 5 10.2Zm2 2.1a2.5 2.5 0 0 1 .5 1.5V14h9v-1.4a2.5 2.5 0 0 1 .5-1.5V9a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1Z"/>'),
  wand: ic('<path d="m4 20 11-11m2-5v3m3 1h-3m-2-2 1.5 1.5M20 4l-1.5 1.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  link: ic('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
};

function renderWho() {
  return `<div class="screen center who">
    <div class="app-icon">${LOGO}</div>
    <p class="eyebrow">${esc(CONFIG.subtitle)}</p>
    <h1 class="title-xl">${esc(CONFIG.appTitle)}</h1>
    <p class="muted who-q">Who’s playing on this phone?</p>
    <div class="who-btns">${PLAYERS.map((p) => `
      <button class="who-btn" data-act="be" data-id="${p.id}" style="--pc:${p.color}">
        ${avatar(p.id, 'xl')}<b>${esc(p.name)}</b><small>${esc(p.nickname)}</small></button>`).join('')}
    </div></div>`;
}

function record() {
  const h = state?.history || [];
  const r = {};
  PLAYERS.forEach((p) => { r[p.id] = { wins: 0, best: 0, streak: 0, fewest: null, qSum: 0, month: 0 }; });
  const now = new Date();
  // oldest -> newest for streaks
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

const largeTitle = (title, right = '') => `<header class="large-title">
    <div><p class="eyebrow">${esc(CONFIG.subtitle)}</p><h1>${esc(title)}</h1></div>${right}</header>`;

function renderHome() {
  const g = state?.game;
  const { r } = record();
  const [a, b] = PLAYERS;
  const today = new Date();
  const mmdd = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const special = CONFIG.specialDates.find((s) => s.date === mmdd);
  const nm = needsMe(g);
  const o = opp(me);
  return `<div class="screen">
    ${largeTitle(CONFIG.appTitle, `<button class="me-btn" data-act="go" data-view="settings" aria-label="Settings">${avatar(me, 'md')}</button>`)}
    ${special ? `<div class="callout special">${esc(special.message)}</div>` : ''}
    ${store?.mode === 'local' ? `<div class="callout note"><b>Test mode.</b> Games only live on this device until Firebase is added in <code>config.js</code>.</div>` : ''}
    ${connErr ? `<div class="callout err"><b>Offline.</b> Can’t reach the game server. Check your connection.</div>` : ''}

    <section class="scorecard">
      <div class="side">${avatar(a.id, 'lg')}<span>${esc(a.name)}</span></div>
      <div class="score"><b style="color:${a.color}">${r[a.id].wins}</b><i>:</i><b style="color:${b.color}">${r[b.id].wins}</b></div>
      <div class="side">${avatar(b.id, 'lg')}<span>${esc(b.name)}</span></div>
    </section>

    ${g && g.phase === 'play' ? `
      <p class="group-h">Game with ${esc(P(o).name)}</p>
      <section class="group">
        <button class="row-btn game-card ${nm ? 'your-move' : ''}" data-act="go" data-view="game">
          ${avatar(o, 'md')}
          <span class="row-text"><b>${esc(statusLine(g))}</b>
            <small>${24 - g.flipped[me].length} left for you · ${24 - g.flipped[o].length} for ${esc(P(o).name)}${g.stakes ? ` · ${esc(g.stakes)}` : ''}</small></span>
          ${nm ? '<span class="badge">Your move</span>' : ''}${I.chev}
        </button>
        ${nm ? '' : `<button class="row-btn tint" data-act="nudge">${I.bell}<span class="row-text"><b>Nudge ${esc(P(o).name)}</b></span></button>`}
      </section>` : newGamePanel(g)}

    <p class="group-h">Together in person</p>
    <section class="group">
      <button class="row-btn" data-act="couch">${I.couch}<span class="row-text"><b>${state.couch && state.couch.phase !== 'over' ? 'Resume Same-Couch Game' : 'Play on One Phone'}</b>
        <small>Pass the phone back and forth, ask out loud</small></span>${I.chev}</button>
    </section>
  </div>`;
}

function newGamePanel(g) {
  return `
    ${g?.phase === 'over' ? `<button class="callout last-game" data-act="go" data-view="game">Last game: <b>${esc(P(g.winner).name)}</b> won · <span class="link">See reveal</span></button>` : ''}
    <p class="group-h">New game</p>
    <section class="group pad">
      <label class="lbl" for="stakes">What’s riding on it?</label>
      <input id="stakes" class="field" maxlength="60" placeholder="Optional, e.g. loser does the dishes">
      <div class="chips">${CONFIG.stakesIdeas.map((s) => `<button class="chip" data-act="stake" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <button class="btn primary wide" data-act="new">${I.shuffle} Deal the Cards</button>
    </section>`;
}

function boardHTML(g, flippedList) {
  const flipped = new Set(flippedList);
  return `<div class="board" role="grid" aria-label="Your board">
      ${g.board.map((pid) => {
        const p = person(g, pid);
        return `<button class="card ${flipped.has(pid) ? 'down' : ''}" data-act="card" data-id="${pid}" aria-pressed="${flipped.has(pid)}" aria-label="${esc(p.name)}">
          <span class="pic">${portrait(p)}</span><span class="nm">${esc(p.name)}</span></button>`;
      }).join('')}
    </div>
    <p class="footnote center-text">${guessMode ? 'Tap the person you think it is.' : 'Tap a card to flip it down. Tap again to flip it back up.'}</p>`;
}

function renderGame() {
  const g = state?.game;
  if (!g || g.v !== 2) { view = 'home'; return renderHome(); }
  const o = opp(me);
  const mySecret = person(g, g.secret[me]);
  const over = g.phase === 'over';

  return `<header class="navbar">
      <button class="nav-back" data-act="go" data-view="home">${I.back}<span>Home</span></button>
      <div class="vs"><span>${avatar(me, 'xs')}<b>${24 - g.flipped[me].length}</b></span><span>${avatar(o, 'xs')}<b>${24 - g.flipped[o].length}</b></span></div>
      <button class="secret-btn ${showSecret ? 'open' : ''}" data-act="secret" aria-label="Show my secret person">
        ${showSecret ? `<span class="mini">${portrait(mySecret)}</span><b>${esc(mySecret.name)}</b>` : `${I.lock}<b>My Person</b>`}
      </button>
    </header>
    <div class="screen game ${guessMode ? 'guessing' : ''}">
      <div class="g-banner">${over ? renderOver(g) : renderBanners(g)}</div>
      <div class="g-board">${boardHTML(g, g.flipped[me])}</div>
      <div class="g-extras">
        ${renderLog(g)}
        ${!over ? `<p class="group-h">Send ${esc(P(o).name)} a little something</p>
          <section class="group pad taunts"><div class="chips">${CONFIG.taunts.map((t) => `<button class="chip" data-act="taunt" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div></section>
          <section class="group"><button class="row-btn destructive" data-act="forfeit"><span class="row-text"><b>Give Up This Game</b></span></button></section>` : ''}
      </div>
    </div>`;
}

function guessBtn(g) {
  if (g.lock?.[me]) return `<p class="sub center-text">You can guess again after your next answer.</p>`;
  return `<button class="btn tinted wide" data-act="guessmode">${I.target} I Know Who It Is</button>`;
}

function renderBanners(g) {
  const o = P(opp(me));
  if (guessMode) return `<section class="banner guess">
      <p class="kicker">${I.target} Make your guess</p>
      <h2>Who is ${esc(o.name)}’s person?</h2>
      <p class="sub">Tap their card.${CONFIG.rules.wrongGuess === 'lose' ? ' A wrong guess loses the game.' : ''}</p>
      <button class="btn tinted wide" data-act="guessmode">Cancel</button></section>`;

  const out = [];
  // 1. their question for me
  if (g.q[o.id]) {
    const sec = person(g, g.secret[me]);
    out.push(`<section class="banner ask-you">
      <p class="kicker">${avatar(o.id, 'xs')} ${esc(o.name)} asks <span class="when">${ago(g.q[o.id].at)}</span></p>
      <h2 class="q">${esc(g.q[o.id].text)}</h2>
      <div class="answer-row">
        <span class="mini lg">${portrait(sec)}</span>
        <div><small>Your person</small><b>${esc(sec.name)}</b></div>
      </div>
      <div class="yn"><button class="btn yes" data-act="answer" data-v="yes">Yes</button><button class="btn no" data-act="answer" data-v="no">No</button></div>
      <button class="btn plain wide" data-act="answer" data-v="not sure">Not Sure</button>
    </section>`);
  }
  // 2. the answer to my last question
  if (g.unseen[me] != null) {
    const e = g.log[g.unseen[me]];
    const miss = misfits(g, g.board, g.flipped[me], e.tag, e.answer);
    out.push(`<section class="banner flip">
      <p class="kicker">${esc(o.name)} answered <span class="when">${ago(e.at)}</span></p>
      <h2><span class="ans big ${e.answer.replace(' ', '')}">${esc(e.answer)}</span></h2>
      <p class="sub">“${esc(e.text)}”</p>
      ${miss === null ? `<p class="sub">Flip down everyone who doesn’t fit.</p><button class="btn tinted wide" data-act="seen">Done Flipping</button>`
        : miss.length ? `<button class="btn primary wide" data-act="autoflip" data-v="${miss.join(',')}">${I.wand} Flip the ${miss.length} Who Don’t Fit</button>
          <button class="btn plain wide" data-act="seen">I’ll Flip Them Myself</button>`
        : `<p class="sub">Your board already matches. Nothing to flip.</p><button class="btn tinted wide" data-act="seen">Got It</button>`}
    </section>`);
  }
  // 3. ask my next question, or wait for the answer
  if (!g.q[me]) {
    out.push(`<section class="banner your">
      <p class="kicker">Your question</p>
      <h2>Ask ${esc(o.name)} a yes-or-no question</h2>
      <form class="ask" data-form="ask"><input id="q" class="field" maxlength="120" placeholder="Does your person…" autocomplete="off" enterkeyhint="send"><button class="btn primary">Ask</button></form>
      <div class="chips">${QUICK.map((x) => `<button class="chip" data-act="quick" data-v="${esc(x.q)}">${esc(x.q)}</button>`).join('')}</div>
      ${guessBtn(g)}</section>`);
  } else {
    out.push(`<section class="banner wait">
      <p class="kicker">You asked ${ago(g.q[me].at)}</p>
      <h2 class="q">${esc(g.q[me].text)}</h2>
      <p class="sub">Waiting for ${esc(o.name)} to answer.</p>
      <div class="row"><button class="btn tinted" data-act="nudge">${I.bell} Nudge</button>${g.lock[me] ? '' : `<button class="btn tinted" data-act="guessmode">${I.target} Guess</button>`}</div></section>`);
  }
  return out.join('');
}

function renderOver(g) {
  const viewer = g.couch ? g.winner : me;
  const o = opp(viewer);
  const won = !g.couch && g.winner === me;
  const w = P(g.winner);
  const msg = pick(CONFIG.winMessages[g.winner] || [`${w.name} wins!`]);
  const how = state.history.find((h) => h.id === g.id)?.how;
  const card = (id) => { const p = person(g, g.secret[id]); return `<div class="reveal-card" style="--pc:${P(id).color}">
      <small>${esc(P(id).name)}’s person</small><span class="pic">${portrait(p)}</span><b>${esc(p.name)}</b>${p.fact ? `<p>${esc(p.fact)}</p>` : ''}</div>`; };
  return `<section class="banner over ${won ? 'won' : 'lost'}">
    ${won ? '<div class="confetti" aria-hidden="true">' + CONFETTI.map((c, i) => `<i style="--i:${i}">${c}</i>`).join('') + '</div>' : ''}
    ${avatar(g.winner, 'lg')}
    <h2>${won ? 'You Win!' : `${esc(w.name)} Wins!`}</h2>
    <p class="msg">${esc(msg)}</p>
    ${how === 'wrong-guess' ? `<p class="sub">${esc(P(opp(g.winner)).name)} made a wrong guess.</p>` : ''}
    ${how === 'forfeit' ? `<p class="sub">${esc(P(opp(g.winner)).name)} gave up.</p>` : ''}
    ${g.stakes ? `<p class="stakes">${esc(g.stakes)} · <b>${esc(P(opp(g.winner)).name)}</b> pays up</p>` : ''}
    <div class="reveals">${card(viewer)}${card(o)}</div>
    <div class="row"><button class="btn primary" data-act="${g.couch ? 'couch-new' : 'rematch'}">Rematch</button><button class="btn tinted" data-act="go" data-view="leaders">Scores</button></div>
  </section>`;
}

function renderCouch() {
  const c = state?.couch;
  if (!c) { view = 'home'; return renderHome(); }
  const who = c.turn, o = opp(who);
  const quit = `<button class="nav-back" data-act="go" data-view="home">${I.back}<span>Home</span></button>`;
  if (c.phase === 'pass') return `<div class="screen center pass" style="--pc:${P(who).color}">
      <p class="eyebrow">Same-couch game</p>
      ${avatar(who, 'xl')}
      <h1 class="title-xl">Pass to ${esc(P(who).name)}</h1>
      <p class="sub">${esc(P(o).name)}, no peeking! 🙈</p>
      <button class="btn primary wide pass-btn" data-act="couch-ready">I’m ${esc(P(who).name)}. Show My Board</button>
      <button class="btn plain" data-act="go" data-view="home">Back to Home</button>
    </div>`;
  const sec = person(c, c.secret[who]);
  return `<header class="navbar">${quit}
      <div class="vs"><span>${avatar(who, 'xs')}<b>${esc(P(who).name)}’s turn</b></span></div>
      <button class="secret-btn ${showSecret ? 'open' : ''}" data-act="secret">${showSecret ? `<span class="mini">${portrait(sec)}</span><b>${esc(sec.name)}</b>` : `${I.lock}<b>My Person</b>`}</button>
    </header>
    <div class="screen game ${guessMode ? 'guessing' : ''}">
      <div class="g-banner">${c.phase === 'over' ? renderOver(c) : guessMode ? `<section class="banner guess">
          <p class="kicker">${I.target} Make your guess</p><h2>Who is ${esc(P(o).name)}’s person?</h2>
          <p class="sub">Tap their card.${CONFIG.rules.wrongGuess === 'lose' ? ' A wrong guess loses the game.' : ''}</p>
          <button class="btn tinted wide" data-act="guessmode">Cancel</button></section>`
        : `<section class="banner your">
          <p class="kicker">${esc(P(who).name)}’s turn</p>
          <h2>Ask ${esc(P(o).name)} a question out loud</h2>
          <p class="sub">Flip down everyone who doesn’t fit the answer, then pass the phone.</p>
          <button class="btn primary wide" data-act="couch-pass">Done. Pass to ${esc(P(o).name)}</button>
          <button class="btn tinted wide" data-act="guessmode">${I.target} I Know Who It Is</button></section>`}</div>
      <div class="g-board">${boardHTML(c, c.flipped[who])}</div>
      <div class="g-extras">${c.phase === 'over' ? '' : `<section class="group"><button class="row-btn destructive" data-act="couch-quit"><span class="row-text"><b>End This Game</b></span></button></section>`}</div>
    </div>`;
}

function renderLog(g) {
  const qs = g.log.filter((e) => e.kind === 'q' || e.kind === 'guess');
  if (!qs.length) return '';
  return `<p class="group-h">History</p><details class="group log"><summary>${qs.length} question${qs.length === 1 ? '' : 's'} so far</summary><ol>
    ${qs.map((e) => e.kind === 'q'
      ? `<li>${avatar(e.by, 'xs')}<span>${esc(e.text)}</span><b class="ans ${e.answer.replace(' ', '')}">${esc(e.answer)}</b></li>`
      : `<li>${avatar(e.by, 'xs')}<span>Guessed ${esc(person(g, e.pid).name)}</span><b class="ans ${e.correct ? 'yes' : 'no'}">${e.correct ? 'right' : 'wrong'}</b></li>`).join('')}
  </ol></details>`;
}

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
    ${largeTitle('Leaderboard')}
    <section class="group champ center-text">
      ${total ? (tie ? `<div class="crown">🤝</div><h2>All Square</h2><p class="sub">${r[a.id].wins} wins each. Next game decides it.</p>`
        : `<div class="champ-av">${avatar(champ.id, 'xl')}<span class="crown">👑</span></div><h2>${esc(champ.name)}</h2><p class="sub">${esc(champ.nickname)} · Reigning Champion</p>`)
        : `<div class="crown">🃏</div><h2>No Games Yet</h2><p class="sub">Play a game to get on the board.</p>`}
      ${total ? `<div class="bar" aria-label="Win share"><span style="width:${pct(a.id)}%;background:${a.color}"></span><span style="width:${100 - pct(a.id)}%;background:${b.color}"></span></div>
        <div class="bar-legend"><span>${esc(a.name)} ${pct(a.id)}%</span><span>${100 - pct(a.id)}% ${esc(b.name)}</span></div>` : ''}
    </section>

    <p class="group-h">Stats</p>
    <section class="group stats">
      <div class="st-row st-head"><span></span>${PLAYERS.map((p) => `<span>${avatar(p.id, 'xs')}${esc(p.name)}</span>`).join('')}</div>
      ${[
        ['Wins', (id) => r[id].wins],
        ['This month', (id) => r[id].month],
        ['Current streak', (id) => (r[id].streak ? `🔥 ${r[id].streak}` : '0')],
        ['Best streak', (id) => r[id].best],
        ['Fewest questions to win', (id) => r[id].fewest ?? '–'],
        ['Avg. questions per win', (id) => (r[id].wins ? (r[id].qSum / r[id].wins).toFixed(1) : '–')],
      ].map(([label, f]) => `<div class="st-row"><span class="st-l">${label}</span>${PLAYERS.map((p) => `<b>${f(p.id)}</b>`).join('')}</div>`).join('')}
    </section>

    ${h.length ? `<p class="group-h">Recent games</p><section class="group"><ul class="recent">
      ${h.slice(0, 15).map((x) => {
        const d = deckOf(x.deckId); const m = d.people.find((p) => p.id === x.mystery);
        return `<li>${avatar(x.winner, 'sm')}<div><b>${esc(P(x.winner).name)} won${x.how === 'guess' ? ` in ${x.questions} question${x.questions === 1 ? '' : 's'}` : x.how === 'forfeit' ? ' by forfeit' : ' on a wrong guess'}</b>
          <small>${m ? `Mystery person: ${esc(m.name)}` : ''}${x.couch ? ' · same couch' : ''}${x.stakes ? ` · ${esc(x.stakes)}` : ''}</small></div><time>${fmt(x.endedAt)}</time></li>`;
      }).join('')}</ul></section>` : ''}
  </div>`;
}

function renderSettings() {
  const base = location.origin + location.pathname;
  return `<div class="screen">
    ${largeTitle('Settings')}
    <p class="group-h">This phone belongs to</p>
    <section class="group pad"><div class="seg">${PLAYERS.map((p) => `<button class="${p.id === me ? 'on' : ''}" data-act="be" data-id="${p.id}" style="--pc:${p.color}">${avatar(p.id, 'xs')} ${esc(p.name)}</button>`).join('')}</div></section>

    <p class="group-h">Personal links</p>
    <section class="group">
      ${PLAYERS.map((p) => `<button class="row-btn" data-act="copy" data-v="${esc(base + '?me=' + p.id)}">${avatar(p.id, 'sm')}<span class="row-text"><b>${esc(p.name)}’s link</b><small>Opens the game signed in as ${esc(p.name)}</small></span><span class="row-action">${I.link} Copy</span></button>`).join('')}
    </section>

    <p class="group-h">Notifications</p>
    <section class="group">
      <button class="row-btn" data-act="notify">${I.bell}<span class="row-text"><b>Turn Alerts</b><small>A pop-up when it’s your turn while the game is open</small></span>${I.chev}</button>
    </section>
    <p class="group-f">When the app is closed, use Nudge to text each other.</p>

    <p class="group-h">Add to Home Screen</p>
    <section class="group pad"><p class="body"><b>iPhone:</b> open in Safari, tap Share, then “Add to Home Screen”.</p><p class="body"><b>Android:</b> Chrome menu, then “Add to Home screen”.</p></section>

    <p class="group-h">About</p>
    <section class="group">
      <div class="kv"><span>Mode</span><b>${store?.mode === 'online' ? 'Online' : 'Test (this device)'}</b></div>
      <div class="kv"><span>Wrong guess</span><b>${CONFIG.rules.wrongGuess === 'lose' ? 'Loses the game' : 'Ends your turn'}</b></div>
      <div class="kv"><span>Room</span><b class="mono">${esc(CONFIG.roomCode)}</b></div>
    </section>
  </div>`;
}

function nav() {
  const tab = (v, icon, label) => `<button class="${view === v || (v === 'home' && view === 'game') ? 'on' : ''}" data-act="go" data-view="${v}">${icon}<span>${label}</span></button>`;
  return `<nav class="tabs">${tab('home', I.home, 'Play')}${tab('leaders', I.trophy, 'Leaderboard')}${tab('settings', I.gear, 'Settings')}</nav>`;
}

function render() {
  const focus = document.activeElement?.id;
  const val = focus ? document.activeElement.value : null;
  const stakesVal = document.getElementById('stakes')?.value;
  const qVal = document.getElementById('q')?.value;
  const openLog = document.querySelector('details.log')?.open;

  // theme the whole app in the phone owner's color
  const tint = view === 'couch' && state?.couch ? state.couch.turn : me;
  if (tint) document.documentElement.style.setProperty('--primary', P(tint).color);
  if (!me) { app.innerHTML = renderWho(); return; }
  if (!state) { app.innerHTML = `<div class="screen center"><div class="app-icon spin">${LOGO}</div><p class="muted">Shuffling the cards…</p></div>`; return; }
  // one-time holiday gift card on each phone
  const gm = holidayOn && HOL.giftMessage;
  if (gm && !modal && !ls.get('gw.gift.' + me)) {
    ls.set('gw.gift.' + me, true);
    modal = `<div class="gift"><div class="gift-icon">🎁</div><h2>${esc(gm.title)}</h2>
      <p class="gift-to">${esc(P(me).name)},</p><p>${esc(gm.body)}</p><p class="gift-from">${esc(gm.from)}</p>
      <button class="btn primary wide" data-act="close">Let’s play! 🎄</button></div>`;
  }
  const body = { home: renderHome, game: renderGame, couch: renderCouch, leaders: renderLeaders, settings: renderSettings }[view]();
  app.innerHTML = body + (view === 'couch' && state.couch?.phase === 'pass' ? '' : nav()) + (modal ? `<div class="modal-bg" data-act="close"><div class="modal" role="dialog" aria-modal="true">${modal}</div></div>` : '');

  // keep typed text across live re-renders
  if (stakesVal && document.getElementById('stakes')) document.getElementById('stakes').value = stakesVal;
  if (qVal && document.getElementById('q')) document.getElementById('q').value = qVal;
  if (openLog && document.querySelector('details.log')) document.querySelector('details.log').open = true;
  if (focus && document.getElementById(focus)) { const el = document.getElementById(focus); el.focus(); if (val != null) el.value = val; }
}

// ---------- UI events ----------
function toast(msg) {
  document.querySelectorAll('.toast').forEach((x) => x.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3100);
}

function confirmModal(html) {
  modal = html; render();
}

async function nudge() {
  const o = P(opp(me));
  const url = location.origin + location.pathname + '?me=' + o.id;
  const text = `${P(me).emoji} ${P(me).name}: ${needsMe(state.game) ? 'come play' : 'it’s your turn'} in Guess Who! ${url}`;
  if (o.phone) { location.href = `sms:${o.phone}${/iPhone|iPad/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(text)}`; return; }
  if (navigator.share) { try { await navigator.share({ text }); } catch {} return; }
  try { await navigator.clipboard.writeText(text); toast('Message copied, paste it in a text!'); } catch { toast(text); }
}

app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act, v = el.dataset.v;
  if (a === 'close' && e.target !== el) return; // clicks inside modal
  if (el.tagName === 'A') e.preventDefault();

  switch (a) {
    case 'be': me = el.dataset.id; ls.set('gw.me', me); lastNeedsMe = null; render(); break;
    case 'go': view = el.dataset.view; guessMode = false; render(); window.scrollTo(0, 0); break;
    case 'stake': document.getElementById('stakes').value = v; break;
    case 'new': {
      const stakes = document.getElementById('stakes')?.value.trim();
      const g = state.game;
      if (g && g.v === 2 && g.phase === 'play') return confirmModal(`<h3>Start over?</h3><p>The current game will be thrown out (not counted).</p>
        <div class="row"><button class="btn primary" data-act="new-yes" data-v="${esc(stakes)}">Deal Again</button><button class="btn tinted" data-act="close">Cancel</button></div>`);
      await startGame(stakes); view = 'game'; showSecret = false; render(); window.scrollTo(0, 0);
      toast('Cards dealt! Tap 🔒 to peek at your person.');
      break;
    }
    case 'new-yes': modal = null; await startGame(v); view = 'game'; render(); break;
    case 'rematch': await startGame(state.game?.stakes); showSecret = false; render(); window.scrollTo(0, 0); toast('New cards dealt!'); break;
    case 'secret': showSecret = !showSecret; render(); break;
    case 'quick': await act.ask(v); break;
    case 'answer': await act.answer(v); toast('Answer sent ✓'); break;
    case 'seen': await act.seen(); break;
    case 'autoflip': {
      const ids = v.split(',');
      document.querySelectorAll('.card').forEach((c) => { if (ids.includes(c.dataset.id)) c.classList.add('down'); });
      await act.flipMany(ids);
      toast(`Flipped ${ids.length} card${ids.length === 1 ? '' : 's'}. Tap any to undo.`);
      break;
    }
    case 'couch': {
      if (!state.couch || state.couch.phase === 'over') await couchAct.start(document.getElementById('stakes')?.value.trim());
      view = 'couch'; showSecret = false; guessMode = false; render(); window.scrollTo(0, 0); break;
    }
    case 'couch-new': await couchAct.start(state.couch?.stakes); showSecret = false; render(); window.scrollTo(0, 0); break;
    case 'couch-ready': showSecret = false; await couchAct.ready(); window.scrollTo(0, 0); break;
    case 'couch-pass': showSecret = false; guessMode = false; await couchAct.pass(); window.scrollTo(0, 0); break;
    case 'couch-quit': return confirmModal(`<h3>End this game?</h3><p>It won’t count on the leaderboard.</p>
      <div class="row"><button class="btn primary" data-act="couch-quit-yes">End Game</button><button class="btn tinted" data-act="close">Keep Playing</button></div>`);
    case 'couch-quit-yes': modal = null; await couchAct.quit(); view = 'home'; render(); break;
    case 'guessmode': guessMode = !guessMode; render(); if (guessMode) document.querySelector('.board')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
    case 'card': {
      const pid = el.dataset.id;
      const couch = view === 'couch';
      const G = couch ? state.couch : state.game;
      if (guessMode) {
        const p = person(G, pid);
        return confirmModal(`<div class="mini xl">${portrait(p)}</div><h3>Is it ${esc(p.name)}?</h3>
          <p class="muted">${CONFIG.rules.wrongGuess === 'lose' ? 'If you’re wrong, you lose the game!' : 'If you’re wrong, you can’t guess again until your next answer.'}</p>
          <div class="row"><button class="btn primary" data-act="${couch ? 'couch-guess' : 'guess-yes'}" data-v="${pid}">Final Answer</button><button class="btn tinted" data-act="close">Hmm, No</button></div>`);
      }
      if (G.phase === 'over' || (couch && G.phase !== 'play')) return;
      el.classList.toggle('down'); // instant feedback (animates); sync follows
      el.setAttribute('aria-pressed', el.classList.contains('down'));
      patchOnly = true;
      await (couch ? couchAct.flip(pid) : act.flip(pid));
      break;
    }
    case 'couch-guess': modal = null; guessMode = false; showSecret = false; await couchAct.guess(v); window.scrollTo(0, 0); break;
    case 'guess-yes': modal = null; guessMode = false; await act.guess(v); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    case 'taunt': await act.taunt(v); toast('Sent!'); break;
    case 'forfeit': return confirmModal(`<h3>Give up?</h3><p>${esc(P(opp(me)).name)} gets the win.</p>
      <div class="row"><button class="btn primary" data-act="forfeit-yes">Give Up</button><button class="btn tinted" data-act="close">Keep playing</button></div>`);
    case 'forfeit-yes': modal = null; await act.forfeit(); break;
    case 'close': modal = null; render(); break;
    case 'nudge': nudge(); break;
    case 'copy': try { await navigator.clipboard.writeText(v); toast('Link copied!'); } catch { prompt('Copy this link:', v); } break;
    case 'notify':
      if (!('Notification' in window)) { toast('This browser doesn’t support alerts. Try adding to Home Screen first.'); break; }
      toast((await Notification.requestPermission()) === 'granted' ? 'Alerts on 🔔' : 'Alerts are off');
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
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
