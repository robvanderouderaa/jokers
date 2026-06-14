// ============================================================
//  Jokers — app controller
// ============================================================
import store from "./store.js?v=9";

const USERS = ["Rob", "Astrid"];
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const data = { jokers: [], dates: [], bucket: [], log: [] };
let me = localStorage.getItem("us_me") || null;
let booted = false;
let activeCard = null;
const partner = () => (me === "Rob" ? "Astrid" : "Rob");

// ============================================================
//  LOGIN
// ============================================================
$$(".pick").forEach((b) => b.addEventListener("click", () => login(b.dataset.user)));
function login(user) {
  me = user; localStorage.setItem("us_me", user);
  const gate = $("#gate"); gate.classList.add("leaving");
  setTimeout(() => { gate.classList.add("hidden"); $("#app").classList.remove("hidden"); boot(); }, 520);
}
$("#logoutBtn").addEventListener("click", () => { localStorage.removeItem("us_me"); location.reload(); });

// ============================================================
//  BOOT
// ============================================================
function boot() {
  $("#hello").textContent = `Good to see you, ${me}`;
  $("#partnerName").textContent = partner();
  if (booted) return; booted = true;

  store.subscribe("jokers", (r) => { data.jokers = r; renderJokers(); });
  store.subscribe("dates", (r) => { data.dates = r; renderList("dates"); renderHistory(); });
  store.subscribe("bucket", (r) => { data.bucket = r; renderList("bucket"); renderHistory(); });
  store.subscribe("log", (r) => { data.log = r; renderHistory(); });

  if (store.mode === "local") toast("Demo mode · saves on this device only");
}

// ============================================================
//  TABS
// ============================================================
$$(".tab").forEach((t) => t.addEventListener("click", () => switchView(t.dataset.view)));
function switchView(name) {
  $$(".tab").forEach((t) => t.classList.toggle("tab-active", t.dataset.view === name));
  $$(".view").forEach((v) => v.classList.toggle("view-active", v.id === `view-${name}`));
}

// ============================================================
//  JOKERS
// ============================================================
function renderJokers() {
  const mine = data.jokers.filter((j) => j.to === me);
  const theirs = data.jokers.filter((j) => j.to === partner());

  bump($("#myCount"), mine.length);
  bump($("#theirCount"), theirs.length);

  const deck = $("#deck");
  activeCard = null;
  deck.classList.remove("fan", "has-active");
  deck.innerHTML = "";
  $("#dots").innerHTML = "";

  if (mine.length === 0) {
    deck.innerHTML = `<div class="empty-deck">
      <div class="glyph">J</div>
      <div>No jokers in your hand yet.</div>
      <div class="hint">When ${partner()} deals you one, it lands here.</div>
    </div>`;
    return;
  }

  deck.classList.add("fan");
  const n = mine.length;
  const perCard = n > 1 ? Math.min(15, 74 / (n - 1)) : 0;
  const start = -perCard * (n - 1) / 2;

  const cards = mine.map((j, i) => {
    const el = buildCard(j);
    el.style.setProperty("--a", `${start + i * perCard}deg`);
    el.style.zIndex = i + 1;
    el.classList.add("pre");
    deck.appendChild(el);
    return el;
  });

  // spread-open animation (staggered)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    cards.forEach((el, i) => {
      el.style.transitionDelay = `${i * 70}ms`;
      el.classList.remove("pre");
      el.classList.add("fanned");
    });
    setTimeout(() => cards.forEach((el) => (el.style.transitionDelay = "")), n * 70 + 700);
  }));
}

function setActive(deck, el) {
  if (activeCard && activeCard !== el) activeCard.classList.remove("active");
  activeCard = el;
  el.classList.add("active");
  deck.classList.add("has-active");
}
function clearActive(deck) {
  if (!activeCard) return;
  activeCard.classList.remove("active");
  activeCard = null;
  deck.classList.remove("has-active");
}

function buildCard(j) {
  const el = document.createElement("div");
  el.className = "fan-card";
  el.innerHTML = `
    <div class="card-tilt">
      <div class="face face-front">
        <img class="card-art" src="assets/card-heart.jpg?v=8" alt="Joker" draggable="false" />
        <div class="foil"></div>
        <div class="glint"></div>
        <div class="card-use">
          <span class="card-from"></span>
          <button class="use-btn">Use joker</button>
        </div>
      </div>
    </div>`;

  el.querySelector(".card-from").textContent = `from ${j.from} · ${timeAgo(j.createdAt)}`;

  const deck = $("#deck");
  const tilt = el.querySelector(".card-tilt");
  const front = el.querySelector(".face-front");

  el.addEventListener("click", (e) => {
    e.stopPropagation();
    if (activeCard !== el) setActive(deck, el);
  });

  // tilt + foil follow pointer (only while lifted)
  tilt.addEventListener("pointermove", (e) => {
    if (activeCard !== el) return;
    const r = tilt.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    tilt.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 12}deg)`;
    front.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
    front.style.setProperty("--my", `${(py + 0.5) * 100}%`);
  });
  tilt.addEventListener("pointerleave", () => { tilt.style.transform = ""; });

  el.querySelector(".use-btn").addEventListener("click", (e) => { e.stopPropagation(); openUse(j); });
  return el;
}

// tap empty stage to put the lifted card back in the fan
$("#view-jokers").addEventListener("click", () => clearActive($("#deck")));

// ---- give joker (instant — one tap, no message) ----
$("#addJokerBtn").addEventListener("click", giveJoker);
async function giveJoker() {
  await store.add("jokers", { from: me, to: partner(), createdBy: me });
  await store.add("log", { kind: "given", from: me, to: partner() });
  toast(`Joker dealt to ${partner()} ♥`);
}

// ---- use joker (removes it) ----
let useTarget = null;
function openUse(j) {
  useTarget = j;
  $("#useText").textContent = `A joker from ${j.from}. Using it removes the card from your hand — anything goes.`;
  openSheet("#useScrim");
}
$("#uCancel").addEventListener("click", () => closeSheet("#useScrim"));
$("#uConfirm").addEventListener("click", async () => {
  if (!useTarget) return;
  const j = useTarget;
  await store.add("log", { kind: "used", from: j.from, by: me });
  await store.remove("jokers", j.id);
  closeSheet("#useScrim"); confetti(); toast("Joker used! 🎉");
  useTarget = null;
});

// ============================================================
//  LISTS
// ============================================================
const LIST_META = {
  dates: { input: "#dateInput", btn: "#dateAddBtn", list: "#datesList", count: "#datesCount", empty: "No date ideas yet." },
  bucket: { input: "#bucketInput", btn: "#bucketAddBtn", list: "#bucketList", count: "#bucketCount", empty: "Bucket list is empty." },
};
Object.entries(LIST_META).forEach(([name, m]) => {
  $(m.btn).addEventListener("click", () => addListItem(name));
  $(m.input).addEventListener("keydown", (e) => { if (e.key === "Enter") addListItem(name); });
});
async function addListItem(name) {
  const m = LIST_META[name]; const text = $(m.input).value.trim();
  if (!text) return;
  await store.add(name, { text, addedBy: me, done: false });
  $(m.input).value = "";
}
function renderList(name) {
  const m = LIST_META[name]; const rows = data[name]; const list = $(m.list);
  $(m.count).textContent = rows.length; list.innerHTML = "";
  if (!rows.length) { list.innerHTML = `<div class="list-empty">${m.empty}</div>`; return; }
  rows.forEach((r, i) => {
    const el = document.createElement("div");
    el.className = "lcard" + (r.done ? " done" : "");
    el.style.animationDelay = `${Math.min(i * 40, 300)}ms`;
    el.innerHTML = `
      <div class="lcard-check">✓</div>
      <div class="lcard-body">
        <div class="lcard-text">${esc(r.text)}</div>
        <div class="lcard-sub"><span class="dot-author ${r.addedBy}"></span>${r.addedBy} · ${timeAgo(r.createdAt)}</div>
      </div>
      <button class="lcard-del">×</button>`;
    el.querySelector(".lcard-check").addEventListener("click", () => store.update(name, r.id, { done: !r.done }));
    el.querySelector(".lcard-del").addEventListener("click", () => { el.classList.add("removing"); setTimeout(() => store.remove(name, r.id), 260); });
    list.appendChild(el);
  });
}

// ============================================================
//  HISTORY
// ============================================================
function renderHistory() {
  const ev = [];
  data.log.forEach((l) => {
    if (l.kind === "given") ev.push({ t: l.createdAt, who: l.from, html: `<b>${l.from}</b> dealt a joker to <b>${l.to}</b> ♥` });
    else if (l.kind === "used") ev.push({ t: l.createdAt, who: l.by, html: `<b>${l.by}</b> used a joker from <b>${l.from}</b> 🎉` });
  });
  data.dates.forEach((d) => ev.push({ t: d.createdAt, who: d.addedBy, html: `<b>${d.addedBy}</b> added a date idea: “${esc(d.text)}”` }));
  data.bucket.forEach((b) => ev.push({ t: b.createdAt, who: b.addedBy, html: `<b>${b.addedBy}</b> added to the bucket list: “${esc(b.text)}”` }));
  ev.sort((a, b) => b.t - a.t);

  const tl = $("#timeline");
  if (!ev.length) { tl.innerHTML = `<div class="list-empty">Nothing yet. Go make a memory.</div>`; return; }
  tl.innerHTML = "";
  ev.forEach((e, i) => {
    const item = document.createElement("div");
    item.className = "tl-item"; item.style.animationDelay = `${Math.min(i * 30, 300)}ms`;
    item.innerHTML = `
      <div class="tl-rail"><div class="tl-dot ${e.who}"></div>${i < ev.length - 1 ? '<div class="tl-line"></div>' : ""}</div>
      <div class="tl-body"><div class="tl-text">${e.html}</div><div class="tl-time">${fullTime(e.t)}</div></div>`;
    tl.appendChild(item);
  });
}

// ============================================================
//  SHEETS / TOAST / CONFETTI / UTILS
// ============================================================
function openSheet(sel) { $(sel).classList.remove("hidden", "closing"); }
function closeSheet(sel) { const el = $(sel); el.classList.add("closing"); setTimeout(() => el.classList.add("hidden"), 300); }
$$(".sheet-scrim").forEach((s) => s.addEventListener("click", (e) => { if (e.target === s) closeSheet("#" + s.id); }));

function bump(el, val) {
  const prev = +el.textContent;
  el.textContent = val;
  if (val !== prev) { el.style.transform = "scale(1.25)"; setTimeout(() => (el.style.transform = ""), 320); }
}

let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.classList.add("hidden"), 400); }, 2400);
}

function confetti() {
  const canvas = $("#confetti"); const ctx = canvas.getContext("2d");
  canvas.width = innerWidth; canvas.height = innerHeight;
  const colors = ["#cba14a", "#e6cd8e", "#b3122b", "#f4efe2", "#6f8bd6", "#c97d97"];
  const parts = Array.from({ length: 150 }, () => ({
    x: innerWidth / 2, y: innerHeight / 2,
    vx: (Math.random() - 0.5) * 16, vy: Math.random() * -16 - 4,
    size: Math.random() * 8 + 4, color: colors[(Math.random() * colors.length) | 0],
    rot: Math.random() * 360, vr: (Math.random() - 0.5) * 20, life: 1,
  }));
  let frame = 0;
  (function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach((p) => {
      p.vy += 0.5; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.012;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = Math.max(p.life, 0); ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6); ctx.restore();
    });
    if (++frame < 160) requestAnimationFrame(loop); else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}
function fullTime(ts) { return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }

addEventListener("resize", () => { const c = $("#confetti"); c.width = innerWidth; c.height = innerHeight; });

// ============================================================
//  No auto-resume: always ask who's here on open/refresh.
// ============================================================
