// Family question box: relatives send questions (and answers) for
// Valerie and Bobby's quiz. Writes to its own document (questionsCode),
// separate from the game.
import { CONFIG } from './config.js';
import { connectStore, mediaStore } from './store.js';

const app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ls = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const [A, B] = CONFIG.players;
const COUPLE = `${A.name} & ${B.name}`;
const FAM = CONFIG.decks[0].people.filter((p) => p.family && !/\bdog\b/.test(p.tags || '')).map((p) => ({ ...p, id: p.id || slug(p.name) }));
const famById = (id) => FAM.find((p) => p.id === id);
const pic = (p, cls = '') => `<span class="ask-av ${cls}">${p?.photo ? `<img src="${esc(p.photo)}" alt="">` : '🙂'}</span>`;
const CATS = ['Grandkids', 'Way Back When', 'Food', 'Holidays', 'Travel', 'Pets', 'Just for Fun'];

const HOL = CONFIG.holiday;
if (HOL?.on === true || (HOL?.on === 'auto' && [11, 12, 1].includes(new Date().getMonth() + 1))) document.documentElement.classList.add('theme-' + (HOL.theme || 'holiday'));

let me = ls.get('gwq.me');            // { id, name }
let step = me ? 'type' : 'who';
let type = null;                       // me | family | couple
let mine = ls.get('gwq.mine', []);     // ids I've sent
let store = null, data = null;
let lastSent = null;
let mstore = null;
let photoData = null;                  // resized JPEG data URL
let voice = null;                      // { data, dur, url }
let rec = null;                        // { mr, stream, start, timer }
const MAX_SEC = 60;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// ---- photos: shrink to fit comfortably in one database entry ----
async function shrinkPhoto(file) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
  let max = 1280, q = 0.82, out = '';
  for (let tries = 0; tries < 6; tries++) {
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    out = c.toDataURL('image/jpeg', q);
    if (out.length < 520000) break;
    max = Math.round(max * 0.8); q = Math.max(0.6, q - 0.06);
  }
  URL.revokeObjectURL(url);
  return out;
}

// ---- voice: record up to a minute ----
async function startRec() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return alert('This phone’s browser can’t record audio. Try Safari or Chrome.');
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { return alert('To record, allow microphone access when your phone asks.'); }
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
  const mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
  const chunks = [];
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  mr.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    const dur = Math.min(MAX_SEC, (Date.now() - rec.start) / 1000);
    clearInterval(rec.timer); rec = null;
    const blob = new Blob(chunks, { type: mr.mimeType || type || 'audio/mp4' });
    if (blob.size > 560000) { alert('That recording is too long. Please keep it under a minute.'); return updateMedia(); }
    const fr = new FileReader();
    fr.onload = () => { voice = { data: fr.result, dur, url: URL.createObjectURL(blob) }; updateMedia(); };
    fr.readAsDataURL(blob);
  };
  rec = { mr, stream, start: Date.now(), timer: setInterval(() => {
    const t = (Date.now() - rec.start) / 1000;
    const el = document.getElementById('rec-time'); if (el) el.textContent = fmtDur(t);
    if (t >= MAX_SEC) rec.mr.stop();
  }, 250) };
  mr.start();
  updateMedia();
}

function mediaPreview() {
  return `${photoData ? `<div class="prev-photo"><img src="${photoData}" alt="Your photo"><button type="button" class="rm" data-act="rm-photo" aria-label="Remove photo">✕</button></div>` : ''}
    ${rec ? `<div class="rec-live"><span class="rec-dot"></span>Recording <span id="rec-time">0:00</span><button type="button" class="btn tinted" data-act="rec">Stop</button></div>` : ''}
    ${voice ? `<div class="prev-voice"><audio controls src="${voice.url}"></audio><button type="button" class="rm inline" data-act="rm-voice" aria-label="Remove voice note">✕</button></div>` : ''}`;
}
function updateMedia() {
  const box = document.getElementById('media-prev'); if (box) box.innerHTML = mediaPreview();
  const r = document.querySelector('[data-act=rec].rec-btn'); if (r) { r.textContent = rec ? '⏹ Stop' : voice ? '🎙️ Re-record' : '🎙️ Voice'; r.classList.toggle('on', !!rec); }
  const ph = document.querySelector('.photo-btn span'); if (ph) ph.textContent = photoData ? 'Change' : 'Photo';
}

const TYPES = {
  note: { icon: '💌', title: 'A note', sub: `Words of love and encouragement. It pops up on their home screen.` },
  me: { icon: '🙋', title: 'About me', sub: `Quiz ${COUPLE} on something about you. You give the right answer.` },
  family: { icon: '👨‍👩‍👧‍👦', title: 'About the family', sub: 'A question about someone else, a trip, a house, a tradition…' },
  couple: { icon: '💞', title: 'About each other', sub: `${COUPLE} each answer about the other. Points if they match. No right answer needed.` },
};

function render() {
  app.innerHTML = `<div class="screen ask">${{ who, type: pickType, form, done }[step]()}</div>`;
  if (step === 'form') document.getElementById('q')?.focus();
}

function header(title, sub, back) {
  return `${back ? `<button class="nav-back" data-act="${back}">‹ <span>Back</span></button>` : ''}
    <header class="large-title"><div><p class="eyebrow">${esc(CONFIG.appTitle)} · Family Quiz</p><h1>${title}</h1></div></header>
    ${sub ? `<p class="body intro">${sub}</p>` : ''}`;
}

function who() {
  return `${header('Who’s this from?', `Send <b>${esc(COUPLE)}</b> a note of love and encouragement, or a question for their family quiz. Notes show up on their home screen in the game.`)}
    <div class="who-grid">${FAM.filter((p) => p.name !== A.name && p.name !== B.name).map((p) => `
      <button class="who-tile" data-act="me" data-id="${p.id}">${pic(p)}<span>${esc(p.name)}</span></button>`).join('')}
      <button class="who-tile" data-act="me-other"><span class="ask-av other">＋</span><span>Someone else</span></button>
    </div>`;
}

function pickType() {
  const sent = mine.length;
  const row = ([k, t]) => `
      <button class="row-btn type-row" data-act="type" data-v="${k}"><span class="type-ico">${t.icon}</span>
        <span class="row-text"><b>${t.title}</b><small class="wrap">${t.sub}</small></span><span class="chev">›</span></button>`;
  return `${header(`Hi ${esc(me.name)}!`, `What would you like to send?${sent ? ` <span class="muted">You’ve sent ${sent} so far. Thank you!</span>` : ''}`)}
    <p class="group-h">Send some love</p>
    <section class="group">${row(['note', TYPES.note])}</section>
    <p class="group-h">Family quiz questions</p>
    <section class="group">${Object.entries(TYPES).filter(([k]) => k !== 'note').map(([k, t]) => `
      <button class="row-btn type-row" data-act="type" data-v="${k}"><span class="type-ico">${t.icon}</span>
        <span class="row-text"><b>${t.title}</b><small class="wrap">${t.sub}</small></span><span class="chev">›</span></button>`).join('')}
    </section>
    <p class="group-f">Not ${esc(me.name)}? <a href="#" data-act="switch">Switch person</a></p>`;
}

function noteForm() {
  return `${header('💌 A note', '', 'back')}
    <form data-form="q">
      <p class="group-h">Who is it for?</p>
      <section class="group pad"><div class="seg seg3">
        <button type="button" class="on" data-act="pick-about" data-v="both">Both</button>
        <button type="button" data-act="pick-about" data-v="${A.id}">${esc(A.name)}</button>
        <button type="button" data-act="pick-about" data-v="${B.id}">${esc(B.name)}</button></div></section>
      <p class="group-h">Your note</p>
      <section class="group pad"><textarea id="q" class="field" rows="5" maxlength="400" placeholder="Thinking of you both. Can’t wait to see you…"></textarea></section>
      <p class="group-f">A memory, an inside joke, a prayer, or just “love you”. Short and sweet is perfect.</p>
      <p class="group-h">Add a photo or voice note (optional)</p>
      <section class="group pad">
        <div class="media-btns">
          <label class="btn tinted photo-btn">📷 <span>${photoData ? 'Change' : 'Photo'}</span><input type="file" id="photo" accept="image/*" hidden></label>
          <button type="button" class="btn tinted rec-btn" data-act="rec">${voice ? '🎙️ Re-record' : '🎙️ Voice'}</button>
        </div>
        <div id="media-prev">${mediaPreview()}</div>
      </section>
      <p class="group-f">Voice notes can be up to a minute.</p>
      <button class="btn primary wide send">Send Note</button>
    </form>`;
}

function form() {
  if (type === 'note') return noteForm();
  const t = TYPES[type];
  const isCouple = type === 'couple';
  return `${header(`${t.icon} ${t.title}`, '', 'back')}
    <form data-form="q">
      <p class="group-h">The question</p>
      <section class="group pad">
        <textarea id="q" class="field" rows="2" maxlength="160" required placeholder="${isCouple ? `e.g. What would ${esc(B.name)} order at a diner?` : type === 'me' ? 'e.g. What did I want to be when I grew up?' : 'e.g. Where did the family go on vacation in 1998?'}"></textarea>
        ${type === 'family' ? `<label class="lbl top">Who or what is it about? (optional)</label>
          <div class="chips wrap-chips">${FAM.map((p) => `<button type="button" class="chip about" data-act="about" data-v="${p.id}">${pic(p, 'xs')}${esc(p.name)}</button>`).join('')}</div>` : ''}
        ${isCouple ? `<label class="lbl top">Who is it about?</label>
          <div class="seg seg3">
            <button type="button" class="on" data-act="pick-about" data-v="either">Either</button>
            <button type="button" data-act="pick-about" data-v="${A.id}">${esc(A.name)}</button>
            <button type="button" data-act="pick-about" data-v="${B.id}">${esc(B.name)}</button></div>` : ''}
      </section>
      ${isCouple ? `<p class="group-f">They each answer on their own phone, then see if they match.</p>` : `
      <p class="group-h">The right answer</p>
      <section class="group pad"><input id="ans" class="field" maxlength="80" required placeholder="The correct answer"></section>
      <p class="group-h">Wrong answers to choose from</p>
      <section class="group pad stack">
        <input class="field wrong" maxlength="80" required placeholder="Wrong answer 1">
        <input class="field wrong" maxlength="80" placeholder="Wrong answer 2 (optional)">
        <input class="field wrong" maxlength="80" placeholder="Wrong answer 3 (optional)">
      </section>
      <p class="group-f">They’ll pick from all of these, shuffled. Make the wrong ones believable!</p>`}
      <p class="group-h">Category</p>
      <section class="group pad"><div class="chips wrap-chips">${CATS.map((c, i) => `<button type="button" class="chip cat ${i === 0 && type !== 'couple' ? '' : ''}" data-act="cat" data-v="${c}">${c}</button>`).join('')}</div></section>
      <p class="group-h">A note for the reveal (optional)</p>
      <section class="group pad"><input id="note" class="field" maxlength="140" placeholder="Shown after they answer, e.g. a memory or “Love you!”"></section>
      <button class="btn primary wide send">Send Question</button>
    </form>`;
}

function done() {
  return `<div class="center done">
      <div class="done-check">✓</div>
      <h1 class="title-xl">Sent!</h1>
      <p class="body sent-text">“${esc(lastSent?.q)}”</p>
      <p class="sub">${lastSent?.note ? 'It’ll pop up on their home screen in the game.' : `${esc(COUPLE)} will see it in their family quiz.`} Thank you!</p>
      <button class="btn primary wide" data-act="again">Send Another</button>
    </div>`;
}

let about = null, cat = null;
app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, v = el.dataset.v;
  if (el.tagName === 'A') e.preventDefault();
  if (a === 'me') { const p = famById(el.dataset.id); me = { id: p.id, name: p.name }; ls.set('gwq.me', me); step = 'type'; render(); }
  if (a === 'me-other') { const n = (prompt('What’s your name?') || '').trim(); if (n) { me = { id: 'guest-' + slug(n), name: n }; ls.set('gwq.me', me); step = 'type'; render(); } }
  if (a === 'switch') { me = null; ls.set('gwq.me', null); step = 'who'; render(); }
  if (a === 'type') { type = v; about = type === 'couple' ? 'either' : type === 'note' ? 'both' : null; cat = null; step = 'form'; render(); scrollTo(0, 0); }
  if (a === 'back') { step = 'type'; render(); }
  if (a === 'again') { step = 'type'; render(); scrollTo(0, 0); }
  if (a === 'about') { const on = el.classList.toggle('on'); document.querySelectorAll('.chip.about').forEach((c) => c !== el && c.classList.remove('on')); about = on ? v : null; }
  if (a === 'pick-about') { document.querySelectorAll('[data-act=pick-about]').forEach((c) => c.classList.toggle('on', c === el)); about = v; }
  if (a === 'rec') { if (rec) rec.mr.stop(); else startRec(); }
  if (a === 'rm-photo') { photoData = null; const f = document.getElementById('photo'); if (f) f.value = ''; updateMedia(); }
  if (a === 'rm-voice') { voice = null; updateMedia(); }
  if (a === 'back' || a === 'again') { if (rec) rec.mr.stop(); }
  if (a === 'cat') { const on = el.classList.toggle('on'); document.querySelectorAll('.chip.cat').forEach((c) => c !== el && c.classList.remove('on')); cat = on ? v : null; }
});

app.addEventListener('change', async (e) => {
  if (e.target.id !== 'photo' || !e.target.files[0]) return;
  const btn = document.querySelector('.photo-btn span'); if (btn) btn.textContent = 'Loading…';
  try { photoData = await shrinkPhoto(e.target.files[0]); }
  catch { alert('Couldn’t open that photo. Try a different one.'); }
  updateMedia();
});

app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = document.getElementById('q').value.trim();
  if (type === 'note') {
    if (rec) return alert('Tap Stop to finish your recording first.');
    if (!q && !photoData && !voice) return alert('Write a note, or add a photo or voice note.');
    const note = { id: newId(), from: me.id, fromName: me.name, to: about || 'both', text: q, at: Date.now(), hidden: false };
    const btn = e.target.querySelector('.send'); btn.disabled = true; btn.textContent = 'Sending…';
    try {
      if (photoData) { const id = newId(); await mstore.put(id, photoData); note.photo = id; }
      if (voice) { const id = newId(); await mstore.put(id, voice.data); note.voice = { id, dur: Math.round(voice.dur) }; }
      await store.update((s) => { s.notes = s.notes || []; s.notes.push(note); });
      mine.push(note.id); ls.set('gwq.mine', mine);
      lastSent = { q: note.text || [note.photo && '📷 A photo', note.voice && '🎙️ A voice note'].filter(Boolean).join(' and '), note: true };
      photoData = null; voice = null;
      step = 'done'; render(); scrollTo(0, 0);
    } catch (err) { console.error(err); btn.disabled = false; btn.textContent = 'Send Note'; alert('Couldn’t send. Check your connection and try again.'); }
    return;
  }
  if (!q) return;
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type, q: /[?.!]$/.test(q) ? q : q + '?',
    from: me.id, fromName: me.name,
    about: type === 'me' ? me.id : about,
    answer: type === 'couple' ? null : document.getElementById('ans').value.trim(),
    wrong: type === 'couple' ? [] : [...document.querySelectorAll('.wrong')].map((i) => i.value.trim()).filter(Boolean),
    cat, note: document.getElementById('note').value.trim() || null,
    at: Date.now(), hidden: false,
  };
  const btn = e.target.querySelector('.send'); btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await store.update((s) => { s.questions = s.questions || []; s.questions.push(item); });
    mine.push(item.id); ls.set('gwq.mine', mine);
    lastSent = item; step = 'done'; render(); scrollTo(0, 0);
  } catch (err) {
    console.error(err); btn.disabled = false; btn.textContent = 'Send Question';
    alert('Couldn’t send. Check your connection and try again.');
  }
});

(async () => {
  render();
  mediaStore(CONFIG).then((m) => { mstore = m; });
  store = await connectStore(CONFIG, (d) => { data = d; }, CONFIG.questionsCode, () => ({ v: 1, questions: [], notes: [] }));
})();

// Same offline helper as the game, so this page also picks up updates right away.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
