// Shared game state. The whole room (current game + history) is one
// small document. Online it lives in Firebase Firestore and syncs live
// between phones; without Firebase config it lives in this browser's
// localStorage (handy for testing: two tabs stay in sync).

export const emptyState = () => ({ v: 1, game: null, history: [] });

const clean = (o) => JSON.parse(JSON.stringify(o)); // drops undefined (Firestore rejects it)

// docId/empty let other pages (the family question box) use their own document.
export async function connectStore(cfg, onChange, docId = cfg.roomCode, empty = emptyState) {
  if (cfg.firebase && cfg.firebase.apiKey) {
    try { return await firebaseStore(cfg, onChange, docId, empty); }
    catch (e) { console.error('Firebase failed, falling back to local mode', e); }
  }
  return localStore(cfg, onChange, docId, empty);
}

async function firebaseStore(cfg, onChange, docId, empty) {
  const V = '10.12.2';
  const { initializeApp, getApps } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const app = getApps()[0] || initializeApp(cfg.firebase); // one app, several documents
  const db = fs.getFirestore(app);
  const ref = fs.doc(db, 'guesswho', docId);

  let status = 'connecting';
  fs.onSnapshot(ref, { includeMetadataChanges: false },
    (snap) => { status = 'online'; onChange(snap.exists() ? snap.data() : empty()); },
    (err) => { status = 'error'; console.error(err); onChange(null, err); });

  return {
    mode: 'online',
    get status() { return status; },
    // fn receives a mutable copy of the state; return false to cancel.
    async update(fn) {
      return fs.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const cur = snap.exists() ? snap.data() : empty();
        const draft = clean(cur);
        if (fn(draft) === false) return false;
        tx.set(ref, clean(draft));
        return true;
      });
    },
  };
}

function localStore(cfg, onChange, docId, empty) {
  const KEY = 'gw.room.' + docId;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || empty(); } catch { return empty(); } };
  window.addEventListener('storage', (e) => { if (e.key === KEY) onChange(read()); });
  setTimeout(() => onChange(read()), 0);
  return {
    mode: 'local',
    status: 'local',
    async update(fn) {
      const draft = read();
      if (fn(draft) === false) return false;
      try { localStorage.setItem(KEY, JSON.stringify(draft)); } catch {}
      onChange(clean(draft));
      return true;
    },
  };
}

// Photos and voice notes for family notes. Each is its own small document
// (`<questionsCode>-m-<id>`, under the same security rule), kept under
// Firestore's 1 MB per-document limit by shrinking photos and capping
// recordings. Without Firebase they live in this browser's localStorage.
export async function mediaStore(cfg) {
  const key = (id) => `${cfg.questionsCode}-m-${id}`;
  if (cfg.firebase && cfg.firebase.apiKey) {
    try {
      const V = '10.12.2';
      const { initializeApp, getApps } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
      const fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
      const db = fs.getFirestore(getApps()[0] || initializeApp(cfg.firebase));
      return {
        async put(id, data) { await fs.setDoc(fs.doc(db, 'guesswho', key(id)), { data, at: Date.now() }); },
        async get(id) { const s = await fs.getDoc(fs.doc(db, 'guesswho', key(id))); return s.exists() ? s.data().data : null; },
      };
    } catch (e) { console.error('Media storage unavailable, using this device only', e); }
  }
  return {
    async put(id, data) { localStorage.setItem('gw.media.' + key(id), data); },
    async get(id) { return localStorage.getItem('gw.media.' + key(id)); },
  };
}
