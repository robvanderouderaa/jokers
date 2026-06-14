// ============================================================
//  STORE  —  unified data layer
//  Uses Firestore if firebase-config is filled + ENABLED,
//  otherwise falls back to localStorage (per-device demo mode).
//
//  Public API (same shape for both backends):
//    store.mode                -> "cloud" | "local"
//    store.subscribe(name, cb) -> cb(arrayOfDocs)  (live)
//    store.add(name, data)     -> Promise
//    store.update(name, id, p) -> Promise
//    store.remove(name, id)    -> Promise
//  Docs always carry: id, createdAt (ms number), + their fields.
// ============================================================

import { ENABLED, firebaseConfig } from "./firebase-config.js?v=7";

const COLLECTIONS = ["jokers", "dates", "bucket", "log"];
const looksConfigured = ENABLED && firebaseConfig.apiKey && firebaseConfig.apiKey !== "PASTE_HERE";

let store;

if (looksConfigured) {
  store = await makeCloudStore();
} else {
  store = makeLocalStore();
}

export default store;

// ---------------------------------------------------------------
//  CLOUD (Firestore)
// ---------------------------------------------------------------
async function makeCloudStore() {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const fs = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

  const app = initializeApp(firebaseConfig);
  const db = fs.getFirestore(app);

  return {
    mode: "cloud",
    subscribe(name, cb) {
      const q = fs.query(fs.collection(db, name), fs.orderBy("createdAt", "asc"));
      return fs.onSnapshot(q, (snap) => {
        const rows = snap.docs.map((d) => normalize(d.id, d.data()));
        cb(rows);
      });
    },
    add(name, data) {
      return fs.addDoc(fs.collection(db, name), { ...data, createdAt: Date.now() });
    },
    update(name, id, patch) {
      return fs.updateDoc(fs.doc(db, name, id), patch);
    },
    remove(name, id) {
      return fs.deleteDoc(fs.doc(db, name, id));
    },
  };
}

// ---------------------------------------------------------------
//  LOCAL (localStorage) — also syncs across tabs on same device
// ---------------------------------------------------------------
function makeLocalStore() {
  const KEY = (name) => `us_${name}`;
  const listeners = {};

  const read = (name) => {
    try { return JSON.parse(localStorage.getItem(KEY(name))) || []; }
    catch { return []; }
  };
  const write = (name, rows) => {
    localStorage.setItem(KEY(name), JSON.stringify(rows));
    emit(name);
  };
  const emit = (name) => {
    const rows = read(name).slice().sort((a, b) => a.createdAt - b.createdAt);
    (listeners[name] || []).forEach((cb) => cb(rows));
  };

  // cross-tab sync
  window.addEventListener("storage", (e) => {
    const name = COLLECTIONS.find((n) => KEY(n) === e.key);
    if (name) emit(name);
  });

  return {
    mode: "local",
    subscribe(name, cb) {
      (listeners[name] = listeners[name] || []).push(cb);
      emit(name); // immediate first render
      return () => { listeners[name] = listeners[name].filter((f) => f !== cb); };
    },
    add(name, data) {
      const rows = read(name);
      rows.push(normalize(crypto.randomUUID(), { ...data, createdAt: Date.now() }));
      write(name, rows);
      return Promise.resolve();
    },
    update(name, id, patch) {
      const rows = read(name).map((r) => (r.id === id ? { ...r, ...patch } : r));
      write(name, rows);
      return Promise.resolve();
    },
    remove(name, id) {
      write(name, read(name).filter((r) => r.id !== id));
      return Promise.resolve();
    },
  };
}

// ---------------------------------------------------------------
function normalize(id, data) {
  let createdAt = data.createdAt;
  if (createdAt && typeof createdAt.toMillis === "function") createdAt = createdAt.toMillis();
  if (typeof createdAt !== "number") createdAt = Date.now();
  return { ...data, id, createdAt };
}
