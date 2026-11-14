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
let view = 'home';     // home | game | leaders | settings
let guessMode = false;
let showSecret = false;
let modal = null;      // { html }
let connErr = null;
let lastNeedsMe = null;
let patchOnly = false; // my own flip: update card classes instead of a full re-render

// ---------- game rules (pure-ish mutations run inside store.update) ----------
function startGame(stakes) {
  return store.update((s) => {
    const deck = CONFIG.decks[0];
    // every family member is always dealt; placeholder people fill the rest
    const real = shuffle(deck.people.filter((p) => p.family).map((p) => p.id)).slice(0, 24);
    const rest = shuffle(deck.people.filter((p) => !p.family).map((p) => p.id));
    const ids = shuffle([...real, ...rest.slice(0, 24 - real.length)]);
    const [a, b] = PLAYERS.map((p) => p.id);
    const secretA = pick(ids);
    const secretB = pick(ids.filter((x) => x !== secretA));
    const last = s.history[0];
    s.game = {
      id: Date.now().toString(36),
      deckId: deck.id,
      board: ids,
      secret: { [a]: secretA, [b]: secretB },
      flipped: { [a]: [], [b]: [] },
      turn: last ? last.loser : pick([a, b]), // last game's loser goes first
      phase: 'ask',
      pending: null,
      log: [],
      asked: { [a]: 0, [b]: 0 },
      stakes: stakes || '',
      startedAt: Date.now(),
      startedBy: me,
      winner: null,
    };
  });
}

function finish(g, s, winner, how) {
  g.phase = 'over';
  g.winner = winner;
  g.endedAt = Date.now();
  const loser = opp(winner);
  s.history.unshift({
    id: g.id, winner, loser, how,
    questions: g.asked[winner], totalQuestions: g.asked[winner] + g.asked[loser],
    mystery: g.secret[loser], deckId: g.deckId, stakes: g.stakes,
    startedAt: g.startedAt, endedAt: g.endedAt,
  });
  s.history = s.history.slice(0, 300);
}

const act = {
  ask: (text) => store.update((s) => {
    const g = s.game; if (!g || g.turn !== me || g.phase !== 'ask') return false;
    g.pending = { by: me, text, at: Date.now() };
    g.phase = 'answer';
  }),
  answer: (ans) => store.update((s) => {
    const g = s.game; if (!g || g.turn !== opp(me) || g.phase !== 'answer' || !g.pending) return false;
    g.log.push({ kind: 'q', by: g.turn, text: g.pending.text, answer: ans, at: Date.now() });
    g.asked[g.turn]++;
    g.pending = null;
    g.phase = 'flip';
  }),
  flip: (pid) => store.update((s) => {
    const g = s.game; if (!g || g.phase === 'over') return false;
    const f = g.flipped[me];
    const i = f.indexOf(pid);
    i >= 0 ? f.splice(i, 1) : f.push(pid);
  }),
  endTurn: () => store.update((s) => {
    const g = s.game; if (!g || g.turn !== me || g.phase !== 'flip') return false;
    g.turn = opp(me); g.phase = 'ask';
  }),
  guess: (pid) => store.update((s) => {
    const g = s.game; if (!g || g.turn !== me || !['ask', 'flip'].includes(g.phase)) return false;
    const right = g.secret[opp(me)] === pid;
    g.log.push({ kind: 'guess', by: me, pid, correct: right, at: Date.now() });
    if (right) return finish(g, s, me, 'guess');
    if (CONFIG.rules.wrongGuess === 'lose') return finish(g, s, opp(me), 'wrong-guess');
    if (!g.flipped[me].includes(pid)) g.flipped[me].push(pid);
    g.turn = opp(me); g.phase = 'ask';
  }),
  taunt: (text) => store.update((s) => {
    const g = s.game; if (!g) return false;
    g.log.push({ kind: 'taunt', by: me, text, at: Date.now() });
  }),
  forfeit: () => store.update((s) => {
    const g = s.game; if (!g || g.phase === 'over') return false;
    g.log.push({ kind: 'forfeit', by: me, at: Date.now() });
    finish(g, s, opp(me), 'forfeit');
  }),
};

// What does the game need from *me* right now?
function needsMe(g) {
  if (!g || !me) return false;
  if (g.phase === 'over') return false;
  if (g.phase === 'answer') return g.turn !== me;
  return g.turn === me;
}
function statusLine(g) {
  if (!g) return 'No game in progress';
  const o = P(opp(me)).name;
  if (g.phase === 'over') return g.winner === me ? 'You won! 🏆' : `${P(g.winner).name} won`;
  if (g.phase === 'answer') return g.turn === me ? `Waiting for ${o} to answer` : `${o} asked you a question!`;
  if (g.turn === me) return g.phase === 'flip' ? 'Flip cards & end your turn' : 'Your turn to ask!';
  return `${o}’s turn`;
}

// ---------- notifications for the opponent's moves ----------
function announce(prev, next) {
  const pg = prev?.game, g = next?.game;
  if (!g || !me) return;
  if (pg && pg.id === g.id) {
    for (const e of g.log.slice(pg.log.length)) {
      if (e.by === me) continue;
      const who = P(e.by).name;
      if (e.kind === 'taunt') toast(`${who}: ${e.text}`);
      if (e.kind === 'q') toast(`${who} answered: ${e.answer.toUpperCase()}`);
      if (e.kind === 'guess' && !e.correct) toast(`${who} guessed ${person(g, e.pid).name}, wrong! 😅`);
    }
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

function renderWho() {
  return `<div class="screen center who">
    <div class="logo">${LOGO}</div>
    <h1>${esc(CONFIG.appTitle)}</h1><p class="muted">${esc(CONFIG.subtitle)}</p>
    <h2>Who’s playing on this phone?</h2>
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

function renderHome() {
  const g = state?.game;
  const { r } = record();
  const [a, b] = PLAYERS;
  const today = new Date();
  const mmdd = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const special = CONFIG.specialDates.find((s) => s.date === mmdd);
  const nm = needsMe(g);
  return `<div class="screen">
    <header class="hero">
      <div class="hero-title"><span class="logo sm">${LOGO}</span><div><h1>${esc(CONFIG.appTitle)}</h1><p>${esc(CONFIG.subtitle)}</p></div></div>
      <p class="hi">Hi ${esc(P(me).name)} ${P(me).emoji}</p>
    </header>
    ${special ? `<div class="special">${esc(special.message)}</div>` : ''}
    ${store?.mode === 'local' ? `<div class="note">🧪 Local test mode: games only live on this device. Add Firebase in <code>config.js</code> to play from two phones.</div>` : ''}
    ${connErr ? `<div class="note err">⚠️ Can’t reach the game server. Check your connection.</div>` : ''}

    <section class="scoreline">
      <div class="side">${avatar(a.id, 'lg')}<b>${esc(a.name)}</b></div>
      <div class="score"><span style="color:${a.color}">${r[a.id].wins}</span><i>–</i><span style="color:${b.color}">${r[b.id].wins}</span></div>
      <div class="side">${avatar(b.id, 'lg')}<b>${esc(b.name)}</b></div>
    </section>

    ${g && g.phase !== 'over' ? `
      <section class="panel game-card ${nm ? 'pulse' : ''}" data-act="go" data-view="game">
        <div><small class="muted">Current game${g.stakes ? ` · ${esc(g.stakes)}` : ''}</small>
        <h3>${esc(statusLine(g))}</h3>
        <small class="muted">${24 - g.flipped[me].length} cards left for you · ${24 - g.flipped[opp(me)].length} for ${esc(P(opp(me)).name)}</small></div>
        <button class="btn primary">${nm ? 'Play' : 'Open'}</button>
      </section>` : newGamePanel(g)}

    ${nm || !g || g.phase === 'over' ? '' : `<button class="btn ghost wide" data-act="nudge">📣 Nudge ${esc(P(opp(me)).name)}</button>`}
  </div>`;
}

function newGamePanel(g) {
  return `<section class="panel">
    ${g?.phase === 'over' ? `<p class="muted center-text">Last game: <b>${esc(P(g.winner).name)}</b> won. <a href="#" data-act="go" data-view="game">See reveal</a></p>` : ''}
    <h3>Start a new game</h3>
    <label class="lbl" for="stakes">What’s riding on it? (optional)</label>
    <input id="stakes" maxlength="60" placeholder="e.g. Loser does the dishes">
    <div class="chips">${CONFIG.stakesIdeas.map((s) => `<button class="chip" data-act="stake" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <button class="btn primary wide" data-act="new">🎲 Deal the cards</button>
  </section>`;
}

function renderGame() {
  const g = state?.game;
  if (!g) { view = 'home'; return renderHome(); }
  const o = opp(me);
  const mySecret = person(g, g.secret[me]);
  const flipped = new Set(g.flipped[me]);
  const over = g.phase === 'over';

  return `<div class="screen game ${guessMode ? 'guessing' : ''}">
    <header class="topbar">
      <button class="icon" data-act="go" data-view="home" aria-label="Back">‹</button>
      <div class="vs">${avatar(me)} <small>${24 - flipped.size}</small> <i>vs</i> ${avatar(o)} <small>${24 - g.flipped[o].length}</small></div>
      <button class="secret-btn" data-act="secret" aria-label="Show my secret person">
        ${showSecret ? `<span class="mini">${portrait(mySecret)}</span><b>${esc(mySecret.name)}</b>` : '🔒 My person'}
      </button>
    </header>

    ${over ? renderOver(g) : renderBanner(g)}

    <div class="board" role="grid" aria-label="Your board">
      ${g.board.map((pid) => {
        const p = person(g, pid);
        return `<button class="card ${flipped.has(pid) ? 'down' : ''}" data-act="card" data-id="${pid}" aria-pressed="${flipped.has(pid)}" aria-label="${esc(p.name)}">
          <span class="pic">${portrait(p)}</span><span class="nm">${esc(p.name)}</span></button>`;
      }).join('')}
    </div>
    <p class="hint muted">${guessMode ? 'Tap the person you think it is.' : 'Tap a card to flip it down (or back up).'}</p>

    ${renderLog(g)}

    ${!over ? `<section class="panel taunts"><small class="muted">Send ${esc(P(o).name)} a little something</small>
      <div class="chips">${CONFIG.taunts.map((t) => `<button class="chip" data-act="taunt" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div></section>
      <button class="btn link" data-act="forfeit">Give up this game</button>` : ''}
  </div>`;
}

function renderBanner(g) {
  const o = P(opp(me));
  const last = [...g.log].reverse().find((e) => e.kind === 'q');
  if (guessMode) return `<section class="banner guess">
      <b>🎯 Make your guess</b><p>Tap who you think ${esc(o.name)}’s person is.${CONFIG.rules.wrongGuess === 'lose' ? ' Careful, a wrong guess loses!' : ''}</p>
      <button class="btn ghost" data-act="guessmode">Cancel</button></section>`;

  if (g.phase === 'answer' && g.turn !== me) {
    const sec = person(g, g.secret[me]);
    return `<section class="banner ask-you">
      <small>${avatar(o.id)} ${esc(o.name)} asks:</small>
      <p class="q">“${esc(g.pending.text)}”</p>
      <div class="answer-row">
        <span class="mini lg">${portrait(sec)}</span>
        <div><small class="muted">Your person</small><b>${esc(sec.name)}</b></div>
      </div>
      <div class="yn"><button class="btn yes" data-act="answer" data-v="yes">Yes</button><button class="btn no" data-act="answer" data-v="no">No</button></div>
      <button class="btn link" data-act="answer" data-v="not sure">Not sure</button>
    </section>`;
  }
  if (g.phase === 'answer') return `<section class="banner wait">
      <p>Waiting for ${esc(o.name)} to answer:</p><p class="q">“${esc(g.pending.text)}”</p>
      <button class="btn ghost" data-act="nudge">📣 Nudge ${esc(o.name)}</button></section>`;

  if (g.turn === me && g.phase === 'flip') return `<section class="banner flip">
      <p>${esc(o.name)} said <b class="ans ${last.answer.replace(' ', '')}">${esc(last.answer.toUpperCase())}</b> to “${esc(last.text)}”</p>
      <p class="muted">Flip down everyone who doesn’t fit, then end your turn.</p>
      <div class="row"><button class="btn primary" data-act="end">End turn ✓</button><button class="btn ghost" data-act="guessmode">🎯 Guess</button></div></section>`;

  if (g.turn === me) return `<section class="banner your">
      <b>Your turn!</b> Ask ${esc(o.name)} a yes/no question.
      <form class="ask" data-form="ask"><input id="q" maxlength="120" placeholder="Does your person…?" autocomplete="off" enterkeyhint="send"><button class="btn primary">Ask</button></form>
      <div class="chips">${CONFIG.quickQuestions.map((q) => `<button class="chip" data-act="quick" data-v="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <button class="btn ghost wide" data-act="guessmode">🎯 I know who it is. Make a guess</button></section>`;

  return `<section class="banner wait"><p>${esc(o.name)}’s turn. They’re thinking… 🤔</p>
      <button class="btn ghost" data-act="nudge">📣 Nudge ${esc(o.name)}</button></section>`;
}

function renderOver(g) {
  const o = opp(me);
  const won = g.winner === me;
  const w = P(g.winner);
  const msg = pick(CONFIG.winMessages[g.winner] || [`${w.name} wins!`]);
  const how = state.history.find((h) => h.id === g.id)?.how;
  const card = (id) => { const p = person(g, g.secret[id]); return `<div class="reveal-card" style="--pc:${P(id).color}">
      <small>${esc(P(id).name)}’s person</small><span class="pic">${portrait(p)}</span><b>${esc(p.name)}</b>${p.fact ? `<p>${esc(p.fact)}</p>` : ''}</div>`; };
  return `<section class="banner over ${won ? 'won' : 'lost'}">
    ${won ? '<div class="confetti" aria-hidden="true">' + CONFETTI.map((c, i) => `<i style="--i:${i}">${c}</i>`).join('') + '</div>' : ''}
    <h2>${won ? 'You win! 🏆' : `${esc(w.name)} wins!`}</h2>
    <p class="msg">${esc(msg)}</p>
    ${how === 'wrong-guess' ? `<p class="muted">(${esc(P(opp(g.winner)).name)} made a wrong guess)</p>` : ''}
    ${how === 'forfeit' ? `<p class="muted">(${esc(P(opp(g.winner)).name)} gave up)</p>` : ''}
    ${g.stakes ? `<p class="stakes">💸 ${esc(g.stakes)}: <b>${esc(P(opp(g.winner)).name)}</b> pays up!</p>` : ''}
    <div class="reveals">${card(me)}${card(o)}</div>
    <div class="row"><button class="btn primary" data-act="rematch">🔁 Rematch</button><button class="btn ghost" data-act="go" data-view="leaders">🏆 Scores</button></div>
  </section>`;
}

function renderLog(g) {
  const qs = g.log.filter((e) => e.kind === 'q' || e.kind === 'guess');
  if (!qs.length) return '';
  return `<details class="panel log"><summary>Questions so far (${qs.length})</summary><ol>
    ${qs.map((e) => e.kind === 'q'
      ? `<li>${avatar(e.by, 'xs')} ${esc(e.text)} <b class="ans ${e.answer.replace(' ', '')}">${esc(e.answer)}</b></li>`
      : `<li>${avatar(e.by, 'xs')} Guessed ${esc(person(g, e.pid).name)} <b class="ans ${e.correct ? 'yes' : 'no'}">${e.correct ? 'correct!' : 'wrong'}</b></li>`).join('')}
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
    <header class="page-h"><h1>🏆 Leaderboard</h1></header>
    <section class="panel champ center-text">
      ${total ? (tie ? `<div class="crown">🤝</div><h2>All square!</h2><p class="muted">${r[a.id].wins} wins each. Next game decides it.</p>`
        : `<div class="crown">👑</div>${avatar(champ.id, 'xl')}<h2>${esc(champ.name)}</h2><p class="muted">“${esc(champ.nickname)}” · reigning champion</p>`)
        : `<div class="crown">🃏</div><h2>No games yet</h2><p class="muted">Play a game to get on the board!</p>`}
    </section>

    ${total ? `<div class="bar" aria-label="Win share"><span style="width:${pct(a.id)}%;background:${a.color}">${pct(a.id)}%</span><span style="width:${100 - pct(a.id)}%;background:${b.color}">${100 - pct(a.id)}%</span></div>` : ''}

    <section class="stats">
      <div class="th"></div>${PLAYERS.map((p) => `<div class="th">${avatar(p.id)} ${esc(p.name)}</div>`).join('')}
      ${[
        ['Wins', (id) => r[id].wins],
        ['This month', (id) => r[id].month],
        ['Current streak', (id) => (r[id].streak ? `🔥 ${r[id].streak}` : '0')],
        ['Best streak', (id) => r[id].best],
        ['Fewest questions to win', (id) => r[id].fewest ?? '–'],
        ['Avg questions per win', (id) => (r[id].wins ? (r[id].qSum / r[id].wins).toFixed(1) : '–')],
      ].map(([label, f]) => `<div class="td l">${label}</div>${PLAYERS.map((p) => `<div class="td">${f(p.id)}</div>`).join('')}`).join('')}
    </section>

    ${h.length ? `<section class="panel"><h3>Recent games</h3><ul class="recent">
      ${h.slice(0, 15).map((x) => {
        const d = deckOf(x.deckId); const m = d.people.find((p) => p.id === x.mystery);
        return `<li>${avatar(x.winner, 'sm')}<div><b>${esc(P(x.winner).name)}</b> won${x.how === 'guess' ? ` in ${x.questions} question${x.questions === 1 ? '' : 's'}` : x.how === 'forfeit' ? ' (forfeit)' : ' (wrong guess)'}
          <small class="muted">${fmt(x.endedAt)}${m ? ` · mystery person: ${esc(m.name)}` : ''}${x.stakes ? ` · ${esc(x.stakes)}` : ''}</small></div></li>`;
      }).join('')}</ul></section>` : ''}
  </div>`;
}

function renderSettings() {
  const base = location.origin + location.pathname;
  return `<div class="screen">
    <header class="page-h"><h1>⚙️ Settings</h1></header>
    <section class="panel">
      <h3>This phone belongs to</h3>
      <div class="seg">${PLAYERS.map((p) => `<button class="${p.id === me ? 'on' : ''}" data-act="be" data-id="${p.id}" style="--pc:${p.color}">${p.emoji} ${esc(p.name)}</button>`).join('')}</div>
    </section>
    <section class="panel">
      <h3>Personal links</h3>
      <p class="muted">Send each person their own link. It opens the game already signed in as them.</p>
      ${PLAYERS.map((p) => `<div class="linkrow"><span>${p.emoji} ${esc(p.name)}</span><button class="btn ghost sm" data-act="copy" data-v="${esc(base + '?me=' + p.id)}">Copy link</button></div>`).join('')}
    </section>
    <section class="panel">
      <h3>Turn alerts</h3>
      <p class="muted">Get a pop-up when it’s your turn while the game is open in the background. When the app is fully closed, use the 📣 Nudge button to text each other.</p>
      <button class="btn ghost" data-act="notify">🔔 Allow alerts</button>
    </section>
    <section class="panel">
      <h3>Add to Home Screen</h3>
      <p class="muted"><b>iPhone:</b> open in Safari → Share ⬆️ → “Add to Home Screen”.<br><b>Android:</b> Chrome menu ⋮ → “Add to Home screen”.</p>
    </section>
    <section class="panel muted small">
      <p>Mode: <b>${store?.mode === 'online' ? '🟢 Online (Firebase)' : '🧪 Local test mode'}</b></p>
      <p>Room: <code>${esc(CONFIG.roomCode)}</code></p>
      <p>Wrong guess: <b>${CONFIG.rules.wrongGuess === 'lose' ? 'loses the game' : 'ends your turn'}</b></p>
    </section>
  </div>`;
}

function nav() {
  const tab = (v, icon, label) => `<button class="${view === v || (v === 'home' && view === 'game') ? 'on' : ''}" data-act="go" data-view="${v}"><span>${icon}</span>${label}</button>`;
  return `<nav class="tabs">${tab('home', '🏠', 'Play')}${tab('leaders', '🏆', 'Leaderboard')}${tab('settings', '⚙️', 'Settings')}</nav>`;
}

function render() {
  const focus = document.activeElement?.id;
  const val = focus ? document.activeElement.value : null;
  const stakesVal = document.getElementById('stakes')?.value;
  const qVal = document.getElementById('q')?.value;
  const openLog = document.querySelector('details.log')?.open;

  // theme the whole app in the phone owner's color
  if (me) document.documentElement.style.setProperty('--primary', P(me).color);
  if (!me) { app.innerHTML = renderWho(); return; }
  if (!state) { app.innerHTML = `<div class="screen center"><div class="logo spin">${LOGO}</div><p class="muted">Shuffling the cards…</p></div>`; return; }
  // one-time holiday gift card on each phone
  const gm = holidayOn && HOL.giftMessage;
  if (gm && !modal && !ls.get('gw.gift.' + me)) {
    ls.set('gw.gift.' + me, true);
    modal = `<div class="gift"><div class="gift-icon">🎁</div><h2>${esc(gm.title)}</h2>
      <p class="gift-to">${esc(P(me).name)},</p><p>${esc(gm.body)}</p><p class="gift-from">${esc(gm.from)}</p>
      <button class="btn primary wide" data-act="close">Let’s play! 🎄</button></div>`;
  }
  const body = { home: renderHome, game: renderGame, leaders: renderLeaders, settings: renderSettings }[view]();
  app.innerHTML = body + nav() + (modal ? `<div class="modal-bg" data-act="close"><div class="modal" role="dialog" aria-modal="true">${modal}</div></div>` : '');

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
      if (g && g.phase !== 'over') return confirmModal(`<h3>Start over?</h3><p>The current game will be thrown out (not counted).</p>
        <div class="row"><button class="btn primary" data-act="new-yes" data-v="${esc(stakes)}">Yes, deal again</button><button class="btn ghost" data-act="close">Cancel</button></div>`);
      await startGame(stakes); view = 'game'; showSecret = false; render(); window.scrollTo(0, 0);
      toast('Cards dealt! Tap 🔒 to peek at your person.');
      break;
    }
    case 'new-yes': modal = null; await startGame(v); view = 'game'; render(); break;
    case 'rematch': await startGame(state.game?.stakes); showSecret = false; render(); window.scrollTo(0, 0); toast('New cards dealt!'); break;
    case 'secret': showSecret = !showSecret; render(); break;
    case 'quick': await act.ask(v); break;
    case 'answer': await act.answer(v); toast('Answer sent ✓'); break;
    case 'end': await act.endTurn(); toast(`Your turn is over. Over to ${P(opp(me)).name}.`); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    case 'guessmode': guessMode = !guessMode; render(); if (guessMode) document.querySelector('.board')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
    case 'card': {
      const pid = el.dataset.id;
      if (guessMode) {
        const p = person(state.game, pid);
        return confirmModal(`<div class="mini xl">${portrait(p)}</div><h3>Is it ${esc(p.name)}?</h3>
          <p class="muted">${CONFIG.rules.wrongGuess === 'lose' ? 'If you’re wrong, you lose the game!' : 'If you’re wrong, your turn ends.'}</p>
          <div class="row"><button class="btn primary" data-act="guess-yes" data-v="${pid}">Final answer!</button><button class="btn ghost" data-act="close">Hmm, no</button></div>`);
      }
      if (state.game.phase === 'over') return;
      el.classList.toggle('down'); // instant feedback (animates); sync follows
      el.setAttribute('aria-pressed', el.classList.contains('down'));
      patchOnly = true;
      await act.flip(pid);
      break;
    }
    case 'guess-yes': modal = null; guessMode = false; await act.guess(v); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    case 'taunt': await act.taunt(v); toast('Sent!'); break;
    case 'forfeit': return confirmModal(`<h3>Give up?</h3><p>${esc(P(opp(me)).name)} gets the win.</p>
      <div class="row"><button class="btn primary" data-act="forfeit-yes">Yes, I give up</button><button class="btn ghost" data-act="close">Keep playing</button></div>`);
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
    if (patchOnly && view === 'game' && next.game) {
      patchOnly = false;
      const down = new Set(next.game.flipped[me]);
      document.querySelectorAll('.card').forEach((c) => c.classList.toggle('down', down.has(c.dataset.id)));
      const n = document.querySelector('.vs small'); if (n) n.textContent = 24 - down.size;
      return;
    }
    render();
  });
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
