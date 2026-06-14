// ============================================================
//  Jokers — app controller
// ============================================================
import store from "./store.js?v=6";

const USERS = ["Rob", "Astrid"];
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const data = { jokers: [], dates: [], bucket: [], log: [] };
let me = localStorage.getItem("us_me") || null;
let booted = false;
const partner = () => (me === "Rob" ? "Astrid" : "Rob");

// ============================================================
//  REALISTIC JOKER CARD FACE (SVG)
// ============================================================
function jokerSVG() {
  return `
  <svg viewBox="0 0 300 455" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="ring" cx="50%" cy="50%" r="50%">
        <stop offset="70%" stop-color="transparent"/>
        <stop offset="100%" stop-color="rgba(203,161,74,.10)"/>
      </radialGradient>
    </defs>

    <!-- corner indices -->
    <g fill="#b3122b" font-family="Cinzel Decorative, serif" font-weight="700">
      <text x="20" y="44" font-size="30">J</text>
      <text x="20" y="66" font-size="15">♚</text>
      <g transform="rotate(180 150 227.5)">
        <text x="20" y="44" font-size="30">J</text>
        <text x="20" y="66" font-size="15">♚</text>
      </g>
    </g>

    <!-- JOKER wordmarks -->
    <text x="150" y="78" text-anchor="middle" fill="#26262a" font-family="Cinzel Decorative, serif" font-weight="900" font-size="26" letter-spacing="3">JOKER</text>
    <g transform="rotate(180 150 227.5)">
      <text x="150" y="78" text-anchor="middle" fill="#26262a" font-family="Cinzel Decorative, serif" font-weight="900" font-size="26" letter-spacing="3">JOKER</text>
    </g>

    <!-- medallion -->
    <circle cx="150" cy="232" r="92" fill="url(#ring)"/>
    <circle cx="150" cy="232" r="90" fill="none" stroke="#cba14a" stroke-width="1.5"/>
    <circle cx="150" cy="232" r="83" fill="none" stroke="#b3122b" stroke-width="1" stroke-dasharray="2 4"/>

    <!-- jester -->
    <g>
      <!-- bells -->
      <circle cx="92"  cy="196" r="9" fill="#cba14a" stroke="#9c7a2f" stroke-width="1"/>
      <circle cx="150" cy="176" r="9" fill="#cba14a" stroke="#9c7a2f" stroke-width="1"/>
      <circle cx="208" cy="196" r="9" fill="#cba14a" stroke="#9c7a2f" stroke-width="1"/>
      <!-- cap lobes -->
      <path d="M124 236 C100 232 86 214 92 198 C108 206 120 220 132 232 Z" fill="#b3122b"/>
      <path d="M132 232 C138 210 144 192 150 180 C156 192 162 210 168 232 Z" fill="#26262a"/>
      <path d="M168 232 C180 220 192 206 208 198 C214 214 200 232 176 236 Z" fill="#b3122b"/>
      <!-- face -->
      <circle cx="150" cy="250" r="31" fill="#f7f2e6" stroke="#26262a" stroke-width="1.4"/>
      <circle cx="139" cy="246" r="3.4" fill="#26262a"/>
      <circle cx="161" cy="246" r="3.4" fill="#26262a"/>
      <path d="M138 260 Q150 272 162 260" fill="none" stroke="#26262a" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="131" cy="256" r="4" fill="#b3122b" opacity=".5"/>
      <circle cx="169" cy="256" r="4" fill="#b3122b" opacity=".5"/>
      <!-- ruff -->
      <g fill="#cba14a" stroke="#9c7a2f" stroke-width=".8">
        <circle cx="124" cy="284" r="7"/><circle cx="138" cy="289" r="7"/>
        <circle cx="150" cy="291" r="7"/><circle cx="162" cy="289" r="7"/>
        <circle cx="176" cy="284" r="7"/>
      </g>
    </g>
  </svg>`;
}

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
if (me && USERS.includes(me)) { $("#gate").classList.add("hidden"); $("#app").classList.remove("hidden"); boot(); }

// ============================================================
//  BOOT
// ============================================================
function boot() {
  $("#hello").textContent = `Good to see you, ${me}`;
  $("#partnerName").textContent = partner();
  $("#sheetPartner").textContent = `${partner()}'s`;
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
  deck.innerHTML = "";
  if (mine.length === 0) {
    deck.innerHTML = `<div class="empty-deck">
      <div class="glyph">J</div>
      <div>No jokers in your hand yet.</div>
      <div class="hint">When ${partner()} deals you one, it lands here.</div>
    </div>`;
    renderDots(0); return;
  }
  mine.forEach((j) => deck.appendChild(buildCard(j)));
  renderDots(mine.length);
  trackDeck();
}

function buildCard(j) {
  const slot = document.createElement("div");
  slot.className = "card-slot";
  const msg = j.message || j.title || "A little favor.";
  slot.innerHTML = `
    <div class="card-tilt">
      <div class="jcard">
        <div class="face face-front">
          ${jokerSVG()}
          <div class="gold-frame"></div>
          <div class="foil"></div>
          <div class="glint"></div>
          <div class="flip-hint">tap to reveal</div>
        </div>
        <div class="face face-back">
          <div class="back-suit">&#9819;</div>
          <div class="back-msg"></div>
          <div class="back-from"></div>
          <button class="use-btn">Use joker</button>
        </div>
      </div>
    </div>`;

  slot.querySelector(".back-msg").textContent = msg;
  slot.querySelector(".back-from").textContent = `from ${j.from} · ${timeAgo(j.createdAt)}`;

  const tilt = slot.querySelector(".card-tilt");
  const card = slot.querySelector(".jcard");
  const front = slot.querySelector(".face-front");

  // flip on tap
  card.addEventListener("click", () => {
    card.classList.toggle("flipped");
    if (!card.classList.contains("flipped")) {
      card.classList.add("shine");
      setTimeout(() => card.classList.remove("shine"), 1000);
    }
  });
  card.classList.add("shine");
  setTimeout(() => card.classList.remove("shine"), 1000);

  // tilt + foil follow pointer (only when showing front)
  tilt.addEventListener("pointermove", (e) => {
    if (card.classList.contains("flipped")) return;
    const r = tilt.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    tilt.style.transform = `rotateY(${px * 14}deg) rotateX(${-py * 14}deg)`;
    front.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
    front.style.setProperty("--my", `${(py + 0.5) * 100}%`);
  });
  tilt.addEventListener("pointerleave", () => { tilt.style.transform = ""; });

  // use joker
  const use = slot.querySelector(".use-btn");
  use.addEventListener("click", (e) => { e.stopPropagation(); openUse(j); });
  return slot;
}

function renderDots(n) {
  const dots = $("#dots"); dots.innerHTML = "";
  for (let i = 0; i < n; i++) { const d = document.createElement("div"); d.className = "dot" + (i ? "" : " active"); dots.appendChild(d); }
}
function trackDeck() {
  const deck = $("#deck"); let raf;
  deck.onscroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
    const idx = Math.round(deck.scrollLeft / deck.clientWidth);
    $$("#dots .dot").forEach((d, i) => d.classList.toggle("active", i === idx));
  }); };
}

// ---- give joker ----
$("#addJokerBtn").addEventListener("click", () => { openSheet("#jokerScrim"); setTimeout(() => $("#jMsg").focus(), 350); });
$("#jCancel").addEventListener("click", () => closeSheet("#jokerScrim"));
$("#jMsg").addEventListener("input", () => { $("#jCount").textContent = $("#jMsg").value.length; });
$("#jSave").addEventListener("click", giveJoker);
async function giveJoker() {
  const message = $("#jMsg").value.trim();
  if (!message) { toast("Write the favor first ♠"); return; }
  await store.add("jokers", { message, from: me, to: partner(), createdBy: me });
  await store.add("log", { kind: "given", from: me, to: partner(), message });
  $("#jMsg").value = ""; $("#jCount").textContent = "0";
  closeSheet("#jokerScrim");
  toast(`Joker dealt to ${partner()} ♠`);
}

// ---- use joker (removes it) ----
let useTarget = null;
function openUse(j) {
  useTarget = j;
  $("#useText").textContent = `"${j.message || j.title}" — from ${j.from}. Using it removes the card from your hand.`;
  openSheet("#useScrim");
}
$("#uCancel").addEventListener("click", () => closeSheet("#useScrim"));
$("#uConfirm").addEventListener("click", async () => {
  if (!useTarget) return;
  const j = useTarget;
  await store.add("log", { kind: "used", from: j.from, by: me, message: j.message || j.title });
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
    if (l.kind === "given") ev.push({ t: l.createdAt, who: l.from, html: `<b>${l.from}</b> dealt a joker to <b>${l.to}</b>: “${esc(l.message)}”` });
    else if (l.kind === "used") ev.push({ t: l.createdAt, who: l.by, html: `<b>${l.by}</b> used a joker from <b>${l.from}</b>: “${esc(l.message)}” 🎉` });
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
