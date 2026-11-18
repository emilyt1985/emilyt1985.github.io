// Review page for the family question box (for you, not your parents:
// it shows the answers). Hide anything you don't want in the quiz.
import { CONFIG } from './config.js';
import { connectStore, mediaStore } from './store.js';
import { I } from './icons.js';

const app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const FAM = CONFIG.decks[0].people.filter((p) => p.family).map((p) => ({ ...p, id: p.id || slug(p.name) }));
const P = CONFIG.players;
const nameOf = (id) => FAM.find((p) => p.id === id)?.name || P.find((p) => p.id === id)?.name || (id === 'either' ? 'either of them' : id);
const photoOf = (id) => FAM.find((p) => p.id === id)?.photo;
const TYPE = { me: 'About me', family: 'About the family', couple: 'About each other' };
const TICO = { me: I.me, family: I.family, couple: I.couple };

let mstore = null;
const media = {};
function mediaSrc(id) {
  if (media[id] && media[id] !== '…') return media[id];
  if (!media[id] && mstore) { media[id] = '…'; mstore.get(id).then((d) => { media[id] = d || 'missing'; render(); }).catch(() => { media[id] = 'missing'; render(); }); }
  return null;
}
let store, data = { questions: [] }, filter = 'all';

function render() {
  const notes = (data.notes || []).slice().reverse();
  if (filter === 'notes' || (filter === 'hidden-notes')) return renderNotes(notes);
  const qs = (data.questions || []).slice().reverse();
  const shown = qs.filter((q) => filter === 'all' ? !q.hidden : filter === 'hidden' ? q.hidden : q.type === filter && !q.hidden);
  const live = qs.filter((q) => !q.hidden);
  const people = {};
  live.forEach((q) => { people[q.fromName] = (people[q.fromName] || 0) + 1; });
  app.innerHTML = `<div class="screen fam">
    <header class="large-title"><div><p class="eyebrow">Family Quiz · Review</p><h1>Questions</h1></div></header>
    <div class="note-slip print-surface is-warning">${I.lock}<p><b>Just for you.</b> This page shows the answers, so don’t share it with ${esc(P[0].name)} or ${esc(P[1].name)}.</p></div>
    <section class="group stats3">
      ${['me', 'family', 'couple'].map((t) => `<div>${TICO[t]}<b>${live.filter((q) => q.type === t).length}</b><small>${TYPE[t]}</small></div>`).join('')}
    </section>
    ${Object.keys(people).length ? `<p class="group-f">From ${Object.entries(people).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${esc(n)} (${c})`).join(', ')}</p>` : ''}
    ${tabs()}
    <div class="seg seg5">${[['all', 'All'], ['me', 'Me'], ['family', 'Family'], ['couple', 'Couple'], ['hidden', 'Hidden']].map(([k, l]) =>
      `<button class="${filter === k ? 'on' : ''}" data-act="filter" data-v="${k}">${l}</button>`).join('')}</div>
    ${shown.length ? shown.map((q) => `
      <section class="group q-card ${q.hidden ? 'is-hidden' : ''}">
        <div class="q-top">${photoOf(q.from) ? `<span class="ask-av xs"><img src="${esc(photoOf(q.from))}" alt=""></span>` : ''}
          <small><b>${esc(q.fromName)}</b> · ${TYPE[q.type]}${q.cat ? ` · ${esc(q.cat)}` : ''}${q.type !== 'me' && q.about ? ` · about ${esc(nameOf(q.about))}` : ''}</small></div>
        <p class="q-text">${esc(q.q)}</p>
        ${q.type === 'couple' ? '<p class="sub">They answer about each other. No answer key.</p>' : `
          <ul class="q-opts"><li class="right">${I.check}${esc(q.answer)}</li>${q.wrong.map((w) => `<li>${I.cross}${esc(w)}</li>`).join('')}</ul>`}
        ${q.note ? `<p class="sub">Reveal note: “${esc(q.note)}”</p>` : ''}
        <div class="row">${q.hidden
          ? `<button class="btn secondary" data-act="show" data-v="${q.id}">${I.eye}Put Back</button><button class="btn secondary danger" data-act="del" data-v="${q.id}">${I.trash}Delete</button>`
          : `<button class="btn secondary" data-act="hide" data-v="${q.id}">${I.eyeOff}Hide</button>`}</div>
      </section>`).join('') : `<div class="empty-state empty">${I.album}<p class="body">${filter === 'hidden' ? 'Nothing hidden.' : 'No questions yet. Share the family link and they’ll show up here.'}</p></div>`}
  </div>`;
}

function tabs() {
  const n = (data.notes || []).filter((x) => !x.hidden).length, q = (data.questions || []).filter((x) => !x.hidden).length;
  const onNotes = filter === 'notes' || filter === 'hidden-notes';
  return `<div class="seg big-tabs"><button class="${onNotes ? '' : 'on'}" data-act="filter" data-v="all">Quiz Questions (${q})</button><button class="${onNotes ? 'on' : ''}" data-act="filter" data-v="notes">Notes (${n})</button></div>`;
}

function renderNotes(notes) {
  const hiddenView = filter === 'hidden-notes';
  const shown = notes.filter((x) => (hiddenView ? x.hidden : !x.hidden));
  const forWho = (t) => (t === 'both' ? `${P[0].name} & ${P[1].name}` : nameOf(t));
  app.innerHTML = `<div class="screen fam">
    <header class="large-title"><div><p class="eyebrow">Family Notes · Review</p><h1>Notes</h1></div></header>
    ${tabs()}
    <p class="group-f">Notes show up on ${esc(P[0].name)} and ${esc(P[1].name)}’s home screen. Hide anything you’d rather they didn’t see.</p>
    <div class="seg seg3 notes-filter"><button class="${hiddenView ? '' : 'on'}" data-act="filter" data-v="notes">Showing</button><button class="${hiddenView ? 'on' : ''}" data-act="filter" data-v="hidden-notes">Hidden</button><span></span></div>
    ${shown.length ? shown.map((n) => `
      <section class="group q-card ${n.hidden ? 'is-hidden' : ''}">
        <div class="q-top">${photoOf(n.from) ? `<span class="ask-av xs"><img src="${esc(photoOf(n.from))}" alt=""></span>` : ''}<small><b>${esc(n.fromName)}</b> · for ${esc(forWho(n.to))} · ${new Date(n.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></div>
        ${n.text ? `<p class="q-text note-body">${esc(n.text)}</p>` : ''}
        ${n.photo ? ((src) => src && src !== 'missing' ? `<img class="rv-photo" src="${src}" alt="">` : `<p class="sub">${src === 'missing' ? 'Photo unavailable' : 'Loading photo…'}</p>`)(mediaSrc(n.photo)) : ''}
        ${n.voice ? ((src) => src && src !== 'missing' ? `<audio class="rv-audio" controls preload="none" src="${src}"></audio>` : `<p class="sub">${src === 'missing' ? 'Voice note unavailable' : 'Loading voice note…'}</p>`)(mediaSrc(n.voice.id)) : ''}
        <div class="row">${n.hidden
          ? `<button class="btn secondary" data-act="nshow" data-v="${n.id}">${I.eye}Put Back</button><button class="btn secondary danger" data-act="ndel" data-v="${n.id}">${I.trash}Delete</button>`
          : `<button class="btn secondary" data-act="nhide" data-v="${n.id}">${I.eyeOff}Hide</button>`}</div>
      </section>`).join('') : `<div class="empty-state empty">${I.note}<p class="body">${hiddenView ? 'Nothing hidden.' : 'No notes yet. Share the family link and they’ll show up here.'}</p></div>`}
  </div>`;
}

app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, v = el.dataset.v;
  if (a === 'filter') { filter = v; return render(); }
  if (a === 'del' && !confirm('Delete this question for good?')) return;
  if (a === 'ndel' && !confirm('Delete this note for good?')) return;
  if (a.startsWith('n') && a !== 'filter') return store.update((s) => {
    const i = (s.notes || []).findIndex((x) => x.id === v); if (i < 0) return false;
    if (a === 'nhide') s.notes[i].hidden = true;
    if (a === 'nshow') s.notes[i].hidden = false;
    if (a === 'ndel') s.notes.splice(i, 1);
  });
  await store.update((s) => {
    const i = (s.questions || []).findIndex((q) => q.id === v); if (i < 0) return false;
    if (a === 'hide') s.questions[i].hidden = true;
    if (a === 'show') s.questions[i].hidden = false;
    if (a === 'del') s.questions.splice(i, 1);
  });
});

(async () => {
  render();
  mediaStore(CONFIG).then((m) => { mstore = m; render(); });
  store = await connectStore(CONFIG, (d) => { data = d || { questions: [], notes: [] }; render(); }, CONFIG.questionsCode, () => ({ v: 1, questions: [], notes: [] }));
})();

// Same offline helper as the game, so this page also picks up updates right away.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
