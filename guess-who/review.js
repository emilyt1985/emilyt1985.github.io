// Review page for the family question box (for you, not your parents:
// it shows the answers). Hide anything you don't want in the quiz.
import { CONFIG } from './config.js';
import { connectStore } from './store.js';

const app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const FAM = CONFIG.decks[0].people.filter((p) => p.family).map((p) => ({ ...p, id: p.id || slug(p.name) }));
const P = CONFIG.players;
const nameOf = (id) => FAM.find((p) => p.id === id)?.name || P.find((p) => p.id === id)?.name || (id === 'either' ? 'either of them' : id);
const photoOf = (id) => FAM.find((p) => p.id === id)?.photo;
const TYPE = { me: '🙋 About me', family: '👨‍👩‍👧‍👦 About the family', couple: '💞 About each other' };

let store, data = { questions: [] }, filter = 'all';

function render() {
  const qs = (data.questions || []).slice().reverse();
  const shown = qs.filter((q) => filter === 'all' ? !q.hidden : filter === 'hidden' ? q.hidden : q.type === filter && !q.hidden);
  const live = qs.filter((q) => !q.hidden);
  const people = {};
  live.forEach((q) => { people[q.fromName] = (people[q.fromName] || 0) + 1; });
  app.innerHTML = `<div class="screen ask">
    <header class="large-title"><div><p class="eyebrow">Family Quiz · Review</p><h1>Questions</h1></div></header>
    <div class="callout note"><b>Just for you.</b> This page shows the answers, so don’t share it with ${esc(P[0].name)} or ${esc(P[1].name)}.</div>
    <section class="scorecard stats3">
      ${['me', 'family', 'couple'].map((t) => `<div><b>${live.filter((q) => q.type === t).length}</b><small>${TYPE[t].slice(2).trim()}</small></div>`).join('')}
    </section>
    ${Object.keys(people).length ? `<p class="group-f">From ${Object.entries(people).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${esc(n)} (${c})`).join(', ')}</p>` : ''}
    <div class="seg seg5">${[['all', 'All'], ['me', 'Me'], ['family', 'Family'], ['couple', 'Couple'], ['hidden', 'Hidden']].map(([k, l]) =>
      `<button class="${filter === k ? 'on' : ''}" data-act="filter" data-v="${k}">${l}</button>`).join('')}</div>
    ${shown.length ? shown.map((q) => `
      <section class="group q-card ${q.hidden ? 'is-hidden' : ''}">
        <div class="q-top">${photoOf(q.from) ? `<span class="ask-av xs"><img src="${esc(photoOf(q.from))}" alt=""></span>` : ''}
          <small><b>${esc(q.fromName)}</b> · ${TYPE[q.type]}${q.cat ? ` · ${esc(q.cat)}` : ''}${q.type !== 'me' && q.about ? ` · about ${esc(nameOf(q.about))}` : ''}</small></div>
        <p class="q-text">${esc(q.q)}</p>
        ${q.type === 'couple' ? '<p class="sub">They answer about each other. No answer key.</p>' : `
          <ul class="q-opts"><li class="right">✓ ${esc(q.answer)}</li>${q.wrong.map((w) => `<li>✗ ${esc(w)}</li>`).join('')}</ul>`}
        ${q.note ? `<p class="sub">Reveal note: “${esc(q.note)}”</p>` : ''}
        <div class="row">${q.hidden
          ? `<button class="btn tinted" data-act="show" data-v="${q.id}">Put Back</button><button class="btn tinted danger" data-act="del" data-v="${q.id}">Delete</button>`
          : `<button class="btn tinted" data-act="hide" data-v="${q.id}">Hide</button>`}</div>
      </section>`).join('') : `<p class="sub center-text empty">${filter === 'hidden' ? 'Nothing hidden.' : 'No questions yet. Share the family link to get started!'}</p>`}
  </div>`;
}

app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, v = el.dataset.v;
  if (a === 'filter') { filter = v; return render(); }
  if (a === 'del' && !confirm('Delete this question for good?')) return;
  await store.update((s) => {
    const i = (s.questions || []).findIndex((q) => q.id === v); if (i < 0) return false;
    if (a === 'hide') s.questions[i].hidden = true;
    if (a === 'show') s.questions[i].hidden = false;
    if (a === 'del') s.questions.splice(i, 1);
  });
});

(async () => {
  render();
  store = await connectStore(CONFIG, (d) => { data = d || { questions: [] }; render(); }, CONFIG.questionsCode, () => ({ v: 1, questions: [] }));
})();
