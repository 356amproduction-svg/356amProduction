// admin.js — real-time Firestore dashboard for 3:56am Production
import { app } from "./firebaseConfig.js";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const db  = getFirestore(app);
const COL = "bookingRequests";

// ── State ────────────────────────────────────────────────────────────────────
let bookings      = [];
let currentFilter = "all";
let currentId     = null;
let searchQuery   = "";
let calYear, calMonth, calSelected = null;
let prices = { "Portrait Session": 450, "Family & Couples": 750, "Wedding Day": 3200 };

// ════════════════════════════════════════════════════════════════════════════
// REAL-TIME LISTENER
// ════════════════════════════════════════════════════════════════════════════
const q = query(collection(db, COL), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  bookings = snapshot.docs.map(docToBooking);
  window.bookings = bookings; // expose for calendar/client functions
  refreshUI();
  updateBadges();
}, (err) => {
  console.error("Firestore listener error:", err);
  showToast("Connection error — check Firestore rules");
});

function docToBooking(snap) {
  const d   = snap.data();
  const id  = snap.id;

  // Normalize name fields from both form sources
  let firstName = d.firstName || d.first_name || "";
  let lastName  = d.lastName  || d.last_name  || "";
  if (!firstName && d.name) {
    const parts = d.name.trim().split(" ");
    firstName = parts[0];
    lastName  = parts.slice(1).join(" ");
  }

  // Normalize status
  let status = d.status || "new";
  if (status === "new_request") status = "new";

  // Normalize date
  const createdAt = d.createdAt?.toDate?.() || (d.createdAt ? new Date(d.createdAt) : new Date());

  return {
    id,
    firstName,
    lastName,
    email:          d.email          || "",
    phone:          d.phone          || "",
    service:        d.service        || d.sessionType || d.shoot_type || "",
    sessionLength:  d.sessionLength  || d.session_length  || "",
    locationType:   d.locationType   || d.location_type   || "",
    date:           d.date           || d.preferredDate   || d.preferred_date || "",
    time:           d.time           || d.timePreference  || d.time_preference || "",
    startTime:      d.startTime      || d.start_time      || "",
    endTime:        d.endTime        || d.end_time        || "",
    skinRetouching: d.skinRetouching || d.skin_retouching || "",
    depositDue:     d.depositDue     || d.deposit_due     || "",
    message:        d.message        || "",
    status,
    source:         d.source         || "website",
    notes:          d.notes          || "",
    submittedAt:    createdAt.toISOString(),
    createdAt
  };
}

// ════════════════════════════════════════════════════════════════════════════
// FIRESTORE WRITE OPERATIONS
// ════════════════════════════════════════════════════════════════════════════
window._fbUpdate = async (id, data) => {
  try {
    const clean = { ...data };
    delete clean.id;
    delete clean.createdAt;
    delete clean.submittedAt;
    await updateDoc(doc(db, COL, id), clean);
  } catch (e) { console.error("Update failed:", e); showToast("Update failed"); }
};

window._fbAdd = async (booking) => {
  try {
    const { id, submittedAt, createdAt, ...data } = booking;
    await addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp() });
  } catch (e) { console.error("Add failed:", e); showToast("Save failed"); }
};

window._fbDelete = async (id) => {
  try { await deleteDoc(doc(db, COL, id)); }
  catch (e) { console.error("Delete failed:", e); showToast("Delete failed"); }
};

window._fbClearAll = async () => {
  try {
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref)); // reuse last snapshot
    await batch.commit();
  } catch (e) { console.error("ClearAll failed:", e); }
};

// ════════════════════════════════════════════════════════════════════════════
// UI REFRESH
// ════════════════════════════════════════════════════════════════════════════
function refreshUI() {
  if (typeof window.currentView === "undefined") return;
  const v = window.currentView;
  if (v === "dashboard") { renderDashboard(); return; }
  if (v === "bookings")  { renderAll();       return; }
  if (v === "calendar")  { renderCalendar();  return; }
  if (v === "clients")   { renderClients();   return; }
}

function updateBadges() {
  const pending = bookings.filter(b => b.status === "new" || b.status === "pending").length;
  const badge = document.getElementById("navBadgePending");
  if (badge) { badge.textContent = pending; badge.style.display = pending ? "" : "none"; }

  // Update all-count badge in nav
  const allCount = document.getElementById("allCount");
  if (allCount) allCount.textContent = bookings.length;
  const pendingCount = document.getElementById("pendingCount");
  if (pendingCount) pendingCount.textContent = pending;
}

// ════════════════════════════════════════════════════════════════════════════
// EXPOSE FUNCTIONS TO GLOBAL SCOPE (called by HTML onclick attributes)
// ════════════════════════════════════════════════════════════════════════════

// Override init() — no localStorage needed
window.init = function () {
  loadPricing();
  loadBizInfo();
  const n = new Date();
  calYear = n.getFullYear();
  calMonth = n.getMonth();
  window.calYear = calYear;
  window.calMonth = calMonth;
  window.calSelected = null;
  showView("dashboard");
  showLoading(true);
  // onSnapshot fires and calls refreshUI automatically
};

// Override save() — no-op, Firestore handles persistence
window.save = function () {};

// Override updateBooking()
window.updateBooking = function (id, data) {
  const i = bookings.findIndex(b => b.id === id);
  if (i > -1) { Object.assign(bookings[i], data); refreshUI(); }
  window._fbUpdate(id, data);
};

// Override addBooking()
window.addBooking = function () {
  const firstName = document.getElementById("af_fname")?.value.trim();
  const lastName  = document.getElementById("af_lname")?.value.trim();
  const email     = document.getElementById("af_email")?.value.trim();
  const service   = document.getElementById("af_session")?.value;
  if (!firstName || !lastName || !email || !service) {
    showToast("Please fill in required fields *");
    return;
  }
  const booking = {
    firstName, lastName,
    name:    `${firstName} ${lastName}`,
    email,
    phone:   document.getElementById("af_phone")?.value.trim()    || "",
    service,
    date:    document.getElementById("af_date")?.value            || "",
    locationType: document.getElementById("af_location")?.value.trim() || "",
    message: document.getElementById("af_message")?.value.trim() || "",
    status:  document.getElementById("af_status")?.value         || "new",
    notes:   "",
    source:  "admin"
  };
  window._fbAdd(booking);
  toggleAddForm();
  ["af_fname","af_lname","af_email","af_phone","af_date","af_location","af_message"]
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  const sess = document.getElementById("af_session"); if (sess) sess.value = "";
  const stat = document.getElementById("af_status"); if (stat) stat.value = "new";
  showToast("Booking saved ✓");
};

// Override deleteBooking()
window.deleteBooking = function () {
  if (!currentId || !confirm("Delete this booking permanently?")) return;
  window._fbDelete(currentId);
  bookings = bookings.filter(b => b.id !== currentId);
  refreshUI();
  closeModal();
  showToast("Booking deleted");
};

// Override clearAll()
window.clearAll = function () {
  if (!confirm("Clear ALL bookings? This cannot be undone.")) return;
  const batch = writeBatch(db);
  bookings.forEach(b => batch.delete(doc(db, COL, b.id)));
  batch.commit().then(() => showToast("All bookings cleared")).catch(console.error);
  bookings = [];
  refreshUI();
};

// ── Search ───────────────────────────────────────────────────────────────────
window.handleSearch = function () {
  searchQuery = (document.getElementById("searchInput")?.value || "").toLowerCase();
  renderTable();
};

// ── Loading indicator ────────────────────────────────────────────────────────
function showLoading(show) {
  const el = document.getElementById("loadingOverlay");
  if (el) el.style.display = show ? "flex" : "none";
}

// ════════════════════════════════════════════════════════════════════════════
// RENDER FUNCTIONS (called by existing admin HTML)
// ════════════════════════════════════════════════════════════════════════════

window.renderAll = function () { updateStats(); renderTable(); };

window.renderDashboard = function () {
  showLoading(false);
  updateStats();
  const now = new Date();
  const upcoming = bookings
    .filter(b => ["new","confirmed","pending"].includes(b.status) && b.date && new Date(b.date + "T00:00:00") >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);
  const recent = bookings.slice(0, 5);

  const upEl = document.getElementById("upcomingList");
  const reEl = document.getElementById("recentList");
  if (upEl) upEl.innerHTML = upcoming.length
    ? upcoming.map(b => listItem(b, true)).join("")
    : '<div class="dash-empty">No upcoming sessions</div>';
  if (reEl) reEl.innerHTML = recent.length
    ? recent.map(b => listItem(b, false)).join("")
    : '<div class="dash-empty">No bookings yet</div>';
};

function updateStats() {
  const pending   = bookings.filter(b => b.status === "new" || b.status === "pending").length;
  const confirmed = bookings.filter(b => b.status === "confirmed").length;
  const completed = bookings.filter(b => b.status === "completed").length;
  const rev       = bookings.filter(b => ["confirmed","completed"].includes(b.status))
                             .reduce((s, b) => s + getPrice(b.service), 0);

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("statPending",   pending);
  set("statConfirmed", confirmed);
  set("statCompleted", completed);
  set("statRevenue",   "$" + rev.toLocaleString());
  set("allCount",      bookings.length);
  set("pendingCount",  pending);
}

function renderTable() {
  showLoading(false);
  let list = bookings.slice();

  // Filter by status
  if (currentFilter !== "all") {
    list = list.filter(b =>
      currentFilter === "pending"
        ? (b.status === "new" || b.status === "pending")
        : b.status === currentFilter
    );
  }

  // Search
  if (searchQuery) {
    list = list.filter(b =>
      `${b.firstName} ${b.lastName} ${b.email} ${b.service} ${b.locationType} ${b.phone}`
        .toLowerCase()
        .includes(searchQuery)
    );
  }

  const countEl = document.getElementById("resultCount");
  if (countEl) countEl.textContent = `${list.length} result${list.length !== 1 ? "s" : ""}`;

  const tbody = document.getElementById("bookingsBody");
  const empty = document.getElementById("emptyState");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  tbody.innerHTML = list.map(b => {
    const name = fullName(b);
    const ini  = initials(b);
    const sub  = b.submittedAt ? new Date(b.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
    const pref = b.date ? new Date(b.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
    const st   = b.status || "new";
    const stLabel = st === "new" ? "New" : cap(st);
    const badgeClass = st === "new" ? "badge-pending" : `badge-${st}`;
    return `<tr onclick="openModal('${b.id}')">
      <td><div class="client-cell">
        <div class="client-avatar" style="background:${avatarColor(name)}">${ini}</div>
        <div><div class="client-name">${name}</div><div class="client-email">${b.email || "—"}</div></div>
      </div></td>
      <td>${b.service ? b.service.split("—")[0].trim() : "—"}</td>
      <td>${pref}</td>
      <td>${b.locationType || "—"}</td>
      <td><span class="badge ${badgeClass}">${stLabel}</span></td>
      <td>${sub}</td>
      <td><div class="action-btns" onclick="event.stopPropagation()">
        <button class="action-btn" onclick="openModal('${b.id}')" title="View">👁</button>
        <button class="action-btn" onclick="quickAction('${b.id}','confirmed')" title="Confirm">✓</button>
        <button class="action-btn danger" onclick="quickAction('${b.id}','cancelled')" title="Cancel">✕</button>
      </div></td>
    </tr>`;
  }).join("");
}

window.renderCalendar = function () {
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  calYear  = window.calYear  || new Date().getFullYear();
  calMonth = window.calMonth || new Date().getMonth();

  const el = document.getElementById("calMonthTitle");
  if (el) el.textContent = `${MONTHS[calMonth]} ${calYear}`;

  const today    = new Date();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInM  = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInP  = new Date(calYear, calMonth, 0).getDate();

  const dateMap = {};
  bookings.forEach(b => {
    if (b.date) {
      if (!dateMap[b.date]) dateMap[b.date] = [];
      dateMap[b.date].push(b);
    }
  });

  let cells = "";
  for (let i = firstDay - 1; i >= 0; i--)
    cells += `<div class="cal-cell other-month"><div class="cal-date">${daysInP - i}</div></div>`;
  for (let d = 1; d <= daysInM; d++) {
    const ds  = `${calYear}-${String(calMonth + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const isT = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === d;
    const isSel = window.calSelected === ds;
    const dayBs = dateMap[ds] || [];
    const dots  = dayBs.map(b => `<span class="d-${b.status === "new" ? "pending" : (b.status || "pending")}"></span>`).join("");
    cells += `<div class="cal-cell${isT?" today":""}${isSel?" selected":""}" onclick="selectCalDay('${ds}')">
      <div class="cal-date">${d}</div>${dots ? `<div class="cal-dots">${dots}</div>` : ""}
    </div>`;
  }
  const rem = (firstDay + daysInM) % 7;
  for (let d = 1; d <= (rem ? 7 - rem : 0); d++)
    cells += `<div class="cal-cell other-month"><div class="cal-date">${d}</div></div>`;

  const grid = document.getElementById("calGrid");
  if (grid) grid.innerHTML = cells;
  if (window.calSelected) showCalDetail(window.calSelected);
};

window.selectCalDay = function (ds) {
  window.calSelected = ds;
  renderCalendar();
  showCalDetail(ds);
};

window.showCalDetail = function (ds) {
  const [y, m, d] = ds.split("-");
  const titleEl = document.getElementById("calDetailTitle");
  if (titleEl) titleEl.textContent = new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const dayBs = bookings.filter(b => b.date === ds);
  const bodyEl = document.getElementById("calDetailBody");
  if (bodyEl) bodyEl.innerHTML = dayBs.length
    ? dayBs.map(b => `<div class="cal-booking-item" onclick="openModal('${b.id}')">
        <div class="cal-booking-name">${fullName(b)}</div>
        <div class="cal-booking-type">${b.service ? b.service.split("—")[0].trim() : "—"} · ${b.locationType || "—"}</div>
        <span class="badge badge-${b.status === "new" ? "pending" : (b.status || "pending")}">${cap(b.status)}</span>
      </div>`).join("")
    : '<div class="cal-no-bookings">No bookings on this date</div>';
};

window.renderClients = function () {
  const q = (document.getElementById("clientSearch")?.value || "").toLowerCase();
  const map = {};
  bookings.forEach(b => {
    const key = (b.email || "unknown").toLowerCase();
    if (!map[key]) map[key] = { name: fullName(b), email: b.email || "—", bookings: [] };
    map[key].bookings.push(b);
  });
  let clients = Object.values(map);
  if (q) clients = clients.filter(c => `${c.name} ${c.email}`.toLowerCase().includes(q));

  const countEl = document.getElementById("clientsCount");
  if (countEl) countEl.textContent = `${clients.length} client${clients.length !== 1 ? "s" : ""}`;

  const grid  = document.getElementById("clientsGrid");
  const empty = document.getElementById("clientsEmpty");
  if (!grid) return;

  if (!clients.length) { grid.innerHTML = ""; if (empty) empty.style.display = "block"; return; }
  if (empty) empty.style.display = "none";

  grid.innerHTML = clients.map(c => {
    const ini   = `${(c.name.split(" ")[0] || "")[0] || ""}${(c.name.split(" ")[1] || "")[0] || ""}`;
    const total = c.bookings.reduce((s, b) => s + getPrice(b.service), 0);
    const last  = c.bookings.filter(b => b.date).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const lastStr = last ? new Date(last.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—";
    const rid   = c.bookings[0].id;
    return `<div class="client-card" onclick="openModal('${rid}')">
      <div class="client-card-top">
        <div class="client-card-avatar" style="background:${avatarColor(c.name)}">${ini}</div>
        <div><div class="client-card-name">${c.name || "Unknown"}</div><div class="client-card-email">${c.email}</div></div>
      </div>
      <div class="client-card-stats">
        <div class="client-stat"><div class="client-stat-val">${c.bookings.length}</div><div class="client-stat-label">Session${c.bookings.length !== 1 ? "s" : ""}</div></div>
        <div class="client-stat"><div class="client-stat-val">$${total.toLocaleString()}</div><div class="client-stat-label">Est. Value</div></div>
        <div class="client-stat"><div class="client-stat-val" style="font-size:.82rem">${lastStr}</div><div class="client-stat-label">Last Date</div></div>
      </div>
    </div>`;
  }).join("");
};

// ════════════════════════════════════════════════════════════════════════════
// MODAL
// ════════════════════════════════════════════════════════════════════════════
window.openModal = function (id) {
  const b = bookings.find(x => x.id === id);
  if (!b) return;
  currentId = id;
  window.currentId = id;

  const sub  = b.submittedAt ? new Date(b.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";
  const pref = b.date ? new Date(b.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";
  const price = getPrice(b.service);

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

  set("mName",      fullName(b));
  set("mSubmitted", `Submitted ${sub}`);
  set("mEmail",     b.email     || "—");
  set("mPhone",     b.phone     || "—");
  set("mSession",   b.service   || "—");
  set("mDate",      pref);
  set("mLocation",  b.locationType || "—");
  set("mSource",    b.source    || "website");
  set("mMessage",   b.message   || "No message provided.");
  set("mValue",     price ? "$" + price.toLocaleString() : "—");

  // Extra session details
  const detailsEl = document.getElementById("mExtraDetails");
  if (detailsEl) {
    const extras = [
      b.sessionLength  ? `<span><strong>Length:</strong> ${b.sessionLength}</span>` : "",
      b.time           ? `<span><strong>Time:</strong> ${b.time}</span>` : "",
      b.startTime      ? `<span><strong>Start:</strong> ${b.startTime}</span>` : "",
      b.endTime        ? `<span><strong>End:</strong> ${b.endTime}</span>` : "",
      b.skinRetouching ? `<span><strong>Retouching:</strong> ${b.skinRetouching}</span>` : "",
      b.depositDue     ? `<span><strong>Deposit:</strong> ${b.depositDue}</span>` : "",
    ].filter(Boolean).join(" · ");
    detailsEl.innerHTML = extras || "";
    detailsEl.style.display = extras ? "block" : "none";
  }

  setVal("mStatus", b.status === "new" ? "pending" : (b.status || "pending"));
  setVal("mNotes",  b.notes || "");

  document.getElementById("modalOverlay")?.classList.add("open");
};

window.closeModal = function () {
  document.getElementById("modalOverlay")?.classList.remove("open");
  currentId = null;
  window.currentId = null;
};

window.updateStatusModal = function () {
  if (!currentId) return;
  updateBooking(currentId, { status: document.getElementById("mStatus")?.value });
  showToast("Status updated");
};

window.saveNotes = function () {
  if (!currentId) return;
  updateBooking(currentId, { notes: document.getElementById("mNotes")?.value });
  showToast("Notes saved ✓");
};

window.quickStatus = function (status) {
  if (!currentId) return;
  updateBooking(currentId, { status });
  closeModal();
  showToast(`Booking ${status} ✓`);
};

window.quickAction = function (id, status) {
  updateBooking(id, { status });
  showToast(status === "confirmed" ? "Confirmed ✓" : "Cancelled");
};

// ════════════════════════════════════════════════════════════════════════════
// FILTER
// ════════════════════════════════════════════════════════════════════════════
window.setFilter = function (filter, btn) {
  currentFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(el => el.classList.remove("active"));
  if (btn) btn.classList.add("active");
  else { const fb = document.getElementById("fb-" + filter); if (fb) fb.classList.add("active"); }
  if (window.currentView !== "bookings") showView("bookings");
  else renderTable();
};

// ════════════════════════════════════════════════════════════════════════════
// ADD FORM TOGGLE
// ════════════════════════════════════════════════════════════════════════════
window.toggleAddForm = function () {
  const w = document.getElementById("addFormWrap");
  if (!w) return;
  w.classList.toggle("open");
  if (w.classList.contains("open")) document.getElementById("af_fname")?.focus();
};

// ════════════════════════════════════════════════════════════════════════════
// CALENDAR NAVIGATION
// ════════════════════════════════════════════════════════════════════════════
window.changeMonth = function (dir) {
  calYear  = window.calYear  || new Date().getFullYear();
  calMonth = window.calMonth || new Date().getMonth();
  if (dir === 0) { const n = new Date(); calYear = n.getFullYear(); calMonth = n.getMonth(); }
  else {
    calMonth += dir;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    if (calMonth < 0)  { calMonth = 11; calYear--; }
  }
  window.calYear  = calYear;
  window.calMonth = calMonth;
  window.calSelected = null;
  renderCalendar();
};

// ════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════════════════════
const SK = "356am_bookings", PK = "356am_pw", PRK = "356am_pricing", BK = "356am_biz", DPW = "356am2015";

window.loadPricing = function () {
  const p = localStorage.getItem(PRK);
  if (p) prices = { ...prices, ...JSON.parse(p) };
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set("set_portrait", prices["Portrait Session"]);
  set("set_family",   prices["Family & Couples"]);
  set("set_wedding",  prices["Wedding Day"]);
};

window.loadBizInfo = function () {
  const b = localStorage.getItem(BK);
  if (!b) return;
  const i = JSON.parse(b);
  const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
  set("set_bizname",  i.bizname);
  set("set_yourname", i.yourname);
  set("set_email",    i.email);
};

window.changePassword = function () {
  const cur     = document.getElementById("set_curpw")?.value;
  const nw      = document.getElementById("set_newpw")?.value;
  const conf    = document.getElementById("set_confpw")?.value;
  const correct = localStorage.getItem(PK) || DPW;
  if (cur !== correct)    { showToast("Current password is incorrect"); return; }
  if (nw.length < 6)      { showToast("Password must be at least 6 characters"); return; }
  if (nw !== conf)        { showToast("Passwords do not match"); return; }
  localStorage.setItem(PK, nw);
  ["set_curpw","set_newpw","set_confpw"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  showToast("Password updated ✓");
};

window.savePricing = function () {
  prices = {
    "Portrait Session": parseInt(document.getElementById("set_portrait")?.value) || 450,
    "Family & Couples": parseInt(document.getElementById("set_family")?.value)   || 750,
    "Wedding Day":      parseInt(document.getElementById("set_wedding")?.value)  || 3200
  };
  localStorage.setItem(PRK, JSON.stringify(prices));
  updateStats();
  showToast("Pricing saved ✓");
};

window.saveBizInfo = function () {
  localStorage.setItem(BK, JSON.stringify({
    bizname:  document.getElementById("set_bizname")?.value,
    yourname: document.getElementById("set_yourname")?.value,
    email:    document.getElementById("set_email")?.value
  }));
  showToast("Business info saved ✓");
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORT / IMPORT
// ════════════════════════════════════════════════════════════════════════════
window.exportCSV = function () {
  const h = ["First Name","Last Name","Email","Phone","Service","Date","Time","Location","Status","Submitted","Notes"];
  const rows = bookings.map(b => [
    b.firstName, b.lastName, b.email, b.phone, b.service,
    b.date, b.time, b.locationType, b.status,
    b.submittedAt ? new Date(b.submittedAt).toLocaleDateString() : "",
    b.notes
  ].map(v => `"${(v || "").replace(/"/g, '""')}"`));
  dl(`356am-bookings-${td()}.csv`, [h, ...rows].map(r => r.join(",")).join("\n"), "text/csv");
  showToast("CSV exported ✓");
};

window.exportJSON = function () {
  dl(`356am-backup-${td()}.json`, JSON.stringify(bookings, null, 2), "application/json");
  showToast("Backup exported ✓");
};

window.importJSON = function () { document.getElementById("importFile")?.click(); };

window.handleImport = function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error("Not an array");
      if (!confirm(`Import ${data.length} bookings? This adds them to Firestore.`)) return;
      for (const b of data) {
        const { id, ...rest } = b;
        await addDoc(collection(db, COL), { ...rest, createdAt: serverTimestamp(), source: "import" });
      }
      showToast(`Imported ${data.length} bookings ✓`);
    } catch { showToast("Invalid backup file"); }
  };
  reader.readAsText(file);
  e.target.value = "";
};

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════
function fullName(b)    { return `${b.firstName || ""} ${b.lastName || ""}`.trim() || "Unknown"; }
function initials(b)    { return `${(b.firstName || "?")[0]}${(b.lastName || "")[0] || ""}`.toUpperCase(); }
function getPrice(s)    { for (const [k, v] of Object.entries(prices)) if (s && s.includes(k)) return v; return 0; }
function avatarColor(n) { const c = ["#a8896a","#7a5c42","#9aaa8c","#6b7a60","#c4b49a"]; let h = 0; for (const x of (n || "X")) h = x.charCodeAt(0) + h; return c[h % c.length]; }
function cap(s)         { return s ? s[0].toUpperCase() + s.slice(1) : ""; }
function td()           { return new Date().toISOString().slice(0, 10); }
function dl(filename, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
}

function listItem(b, showDate) {
  const name = fullName(b), ini = initials(b);
  const sub  = showDate && b.date
    ? new Date(b.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : b.service ? b.service.split("—")[0].trim() : "—";
  const st   = b.status === "new" ? "pending" : (b.status || "pending");
  return `<div class="dash-list-item" onclick="openModal('${b.id}')">
    <div class="dash-item-av" style="background:${avatarColor(name)}">${ini}</div>
    <div class="dash-item-info">
      <div class="dash-item-name">${name}</div>
      <div class="dash-item-sub">${sub}</div>
    </div>
    <span class="badge badge-${st}">${cap(b.status)}</span>
  </div>`;
}

// ── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
window.showToast = function (msg) {
  const toast = document.getElementById("toast");
  const text  = document.getElementById("toastMsg");
  if (!toast || !text) return;
  text.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
};

// Alias for internal use
function showToast(msg) { window.showToast(msg); }
