// ============================================================
//  Us · Jokers  —  app controller
// ============================================================
import store from "./store.js";

const USERS = ["Rob", "Astrid"];
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// in-memory mirror of live data
const data = { jokers: [], dates: [], bucket: [] };
let me = localStorage.getItem("us_me") || null;

// ============================================================
//  LOGIN GATE
// ============================================================
$$(".pick").forEach((btn) =>
  btn.addEventListener("click", () => login(btn.dataset.user))
);

function login(user) {
  me = user;
  localStorage.setItem("us_me", user);
  const gate = $("#gate");
  gate.classList.add("leaving");
  setTimeout(() => {
    gate.classList.add("hidden");
    $("#app").classList.remove("hidden");
    boot();
  }, 480);
}

$("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("us_me");
  location.reload();
});

// auto-resume session
if (me && USERS.includes(me)) {
  $("#gate").classList.add("hidden");
  $("#app").classList.remove("hidden");
  boot();
}

// ============================================================
//  BOOT — wire live subscriptions
// ============================================================
let booted = false;
function boot() {
  $("#hello").textContent = `Hi, ${me}`;
  if (booted) return;
  booted = true;

  store.subscribe("jokers", (rows) => { data.jokers = rows; renderJokers(); renderHistory(); });
  store.subscribe("dates", (rows) => { data.dates = rows; renderList("dates"); renderHistory(); });
  store.subscribe("bucket", (rows) => { data.bucket = rows; renderList("bucket"); renderHistory(); });

  if (store.mode === "local") {
    toast("Demo mode · saving on this device only");
  }
}

// ============================================================
//  TAB NAVIGATION
// ============================================================
$$(".tab").forEach((tab) =>
  tab.addEventListener("click", () => switchView(tab.dataset.view))
);
function switchView(name) {
  $$(".tab").forEach((t) => t.classList.toggle("tab-active", t.dataset.view === name));
  $$(".view").forEach((v) => v.classList.toggle("view-active", v.id === `view-${name}`));
}

// ============================================================
//  JOKERS
// ============================================================
function partner() { return me === "Rob" ? "Astrid" : "Rob"; }

function renderJokers() {
  const carousel = $("#carousel");
  const active = data.jokers.filter((j) => j.status !== "redeemed");

  // count (active jokers)
  const countEl = $("#jokerCount");
  const prev = +countEl.textContent;
  countEl.textContent = active.length;
  if (active.length !== prev) {
    countEl.classList.add("bump");
    setTimeout(() => countEl.classList.remove("bump"), 500);
  }

  // split line: how many each owes
  const forMe = active.filter((j) => j.to === me).length;
  const forThem = active.filter((j) => j.to === partner()).length;
  $("#jokerSplit").textContent = `${forMe} for you · ${forThem} for ${partner()}`;

  // cards
  carousel.innerHTML = "";
  if (active.length === 0) {
    carousel.innerHTML = `
      <div class="empty-deck">
        <div class="big">🃏</div>
        <div>No jokers in play.</div>
        <div style="font-size:13px;color:var(--text-faint)">Tap + to deal one to ${partner()}.</div>
      </div>`;
    renderDots(0);
    return;
  }

  active.forEach((j) => carousel.appendChild(jokerCard(j)));
  renderDots(active.length);
  trackCarousel(active.length);
}

function jokerCard(j) {
  const slot = document.createElement("div");
  slot.className = "jcard-slot";
  const mine = j.to === me;
  slot.innerHTML = `
    <div class="jcard from-${j.from}" data-id="${j.id}">
      <div class="jcard-corner tl">JOKER<span class="suit">★</span></div>
      <div class="jcard-center">
        <div class="jcard-face">🃏</div>
        <div class="jcard-title">${esc(j.title)}</div>
        ${j.desc ? `<div class="jcard-desc">${esc(j.desc)}</div>` : ""}
      </div>
      <div class="jcard-meta">
        <div class="jcard-from">From <b>${j.from}</b> → <b>${j.to}</b> · ${timeAgo(j.createdAt)}</div>
        ${mine
          ? `<button class="jcard-redeem">Redeem this favor</button>`
          : `<div class="jcard-from" style="opacity:.6">${j.to} can redeem this</div>`}
      </div>
      <div class="jcard-corner br">JOKER<span class="suit">★</span></div>
    </div>`;

  const card = slot.querySelector(".jcard");
  // 3D tilt + shine on touch/hover
  card.addEventListener("pointermove", (e) => tilt(card, e));
  card.addEventListener("pointerleave", () => resetTilt(card));
  card.addEventListener("pointerdown", () => card.classList.add("shine"));
  card.addEventListener("animationend", () => card.classList.remove("shine"));

  const redeem = slot.querySelector(".jcard-redeem");
  if (redeem) redeem.addEventListener("click", () => openRedeem(j));
  return slot;
}

function tilt(card, e) {
  const r = card.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width - 0.5;
  const py = (e.clientY - r.top) / r.height - 0.5;
  card.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 12}deg) scale(1.02)`;
}
function resetTilt(card) { card.style.transform = ""; }

// dots + active-card tracking
function renderDots(n) {
  const dots = $("#dots");
  dots.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const d = document.createElement("div");
    d.className = "dot" + (i === 0 ? " active" : "");
    dots.appendChild(d);
  }
}
function trackCarousel(n) {
  const carousel = $("#carousel");
  let raf;
  carousel.onscroll = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const idx = Math.round(carousel.scrollLeft / carousel.clientWidth);
      $$("#dots .dot").forEach((d, i) => d.classList.toggle("active", i === idx));
    });
  };
}

// ---- add joker sheet ----
$("#addJokerBtn").addEventListener("click", () => openSheet("#jokerScrim"));
$("#jCancel").addEventListener("click", () => closeSheet("#jokerScrim"));
$("#jSave").addEventListener("click", saveJoker);

async function saveJoker() {
  const title = $("#jTitle").value.trim();
  if (!title) { toast("Give it a title 🙂"); return; }
  const desc = $("#jDesc").value.trim();
  await store.add("jokers", {
    title, desc, from: me, to: partner(), status: "active", createdBy: me,
  });
  $("#jTitle").value = ""; $("#jDesc").value = "";
  closeSheet("#jokerScrim");
  toast(`Joker dealt to ${partner()} 🃏`);
}

// ---- redeem ----
let redeemTarget = null;
function openRedeem(j) {
  redeemTarget = j;
  $("#redeemText").textContent = `"${j.title}" — from ${j.from}. Once redeemed it's marked used.`;
  openSheet("#redeemScrim");
}
$("#rCancel").addEventListener("click", () => closeSheet("#redeemScrim"));
$("#rConfirm").addEventListener("click", async () => {
  if (!redeemTarget) return;
  await store.update("jokers", redeemTarget.id, {
    status: "redeemed", redeemedAt: Date.now(), redeemedBy: me,
  });
  closeSheet("#redeemScrim");
  confetti();
  toast("Redeemed! 🎉");
  redeemTarget = null;
});

// ============================================================
//  LISTS (dates / bucket)
// ============================================================
const LIST_META = {
  dates: { input: "#dateInput", btn: "#dateAddBtn", list: "#datesList", count: "#datesCount", empty: "No date ideas yet ✦" },
  bucket: { input: "#bucketInput", btn: "#bucketAddBtn", list: "#bucketList", count: "#bucketCount", empty: "Bucket list is empty ◎" },
};

Object.entries(LIST_META).forEach(([name, m]) => {
  $(m.btn).addEventListener("click", () => addListItem(name));
  $(m.input).addEventListener("keydown", (e) => { if (e.key === "Enter") addListItem(name); });
});

async function addListItem(name) {
  const m = LIST_META[name];
  const text = $(m.input).value.trim();
  if (!text) return;
  await store.add(name, { text, addedBy: me, done: false });
  $(m.input).value = "";
}

function renderList(name) {
  const m = LIST_META[name];
  const rows = data[name];
  const list = $(m.list);
  $(m.count).textContent = rows.length;
  list.innerHTML = "";
  if (rows.length === 0) {
    list.innerHTML = `<div class="list-empty">${m.empty}</div>`;
    return;
  }
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
    el.querySelector(".lcard-check").addEventListener("click", () =>
      store.update(name, r.id, { done: !r.done })
    );
    el.querySelector(".lcard-del").addEventListener("click", () => {
      el.classList.add("removing");
      setTimeout(() => store.remove(name, r.id), 260);
    });
    list.appendChild(el);
  });
}

// ============================================================
//  HISTORY (activity feed across everything)
// ============================================================
function renderHistory() {
  const events = [];
  data.jokers.forEach((j) => {
    events.push({ t: j.createdAt, who: j.from, html: `<b>${j.from}</b> dealt a joker to <b>${j.to}</b>: "${esc(j.title)}"` });
    if (j.status === "redeemed" && j.redeemedAt)
      events.push({ t: j.redeemedAt, who: j.redeemedBy || j.to, html: `<b>${j.redeemedBy || j.to}</b> redeemed "${esc(j.title)}" 🎉` });
  });
  data.dates.forEach((d) => events.push({ t: d.createdAt, who: d.addedBy, html: `<b>${d.addedBy}</b> added a date idea: "${esc(d.text)}"` }));
  data.bucket.forEach((b) => events.push({ t: b.createdAt, who: b.addedBy, html: `<b>${b.addedBy}</b> added to the bucket list: "${esc(b.text)}"` }));

  events.sort((a, b) => b.t - a.t);

  const tl = $("#timeline");
  if (events.length === 0) { tl.innerHTML = `<div class="list-empty">Nothing yet. Go make a memory ↻</div>`; return; }
  tl.innerHTML = "";
  events.forEach((e, i) => {
    const item = document.createElement("div");
    item.className = "tl-item";
    item.style.animationDelay = `${Math.min(i * 30, 300)}ms`;
    item.innerHTML = `
      <div class="tl-rail">
        <div class="tl-dot ${e.who}"></div>
        ${i < events.length - 1 ? '<div class="tl-line"></div>' : ""}
      </div>
      <div class="tl-body">
        <div class="tl-text">${e.html}</div>
        <div class="tl-time">${fullTime(e.t)}</div>
      </div>`;
    tl.appendChild(item);
  });
}

// ============================================================
//  SHEETS
// ============================================================
function openSheet(sel) { $(sel).classList.remove("hidden", "closing"); }
function closeSheet(sel) {
  const el = $(sel);
  el.classList.add("closing");
  setTimeout(() => el.classList.add("hidden"), 300);
}
$$(".sheet-scrim").forEach((scrim) =>
  scrim.addEventListener("click", (e) => { if (e.target === scrim) closeSheet("#" + scrim.id); })
);

// ============================================================
//  TOAST
// ============================================================
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.classList.add("hidden"), 400);
  }, 2400);
}

// ============================================================
//  CONFETTI
// ============================================================
function confetti() {
  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth; canvas.height = innerHeight;
  const colors = ["#ffd479", "#ff6ba3", "#5e9bff", "#7c5cff", "#ff9d5c", "#ffffff"];
  const parts = Array.from({ length: 140 }, () => ({
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
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate((p.rot * Math.PI) / 180);
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    frame++;
    if (frame < 160) requestAnimationFrame(loop);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}

// ============================================================
//  UTILS
// ============================================================
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function timeAgo(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}
function fullTime(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// keep confetti canvas sized
addEventListener("resize", () => {
  const c = $("#confetti");
  c.width = innerWidth; c.height = innerHeight;
});
