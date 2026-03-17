// form.js — handles all booking form submissions → Firestore bookingRequests
import { app } from "./firebaseConfig.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const db = getFirestore(app);

// ── Helper: get trimmed value by element ID ──────────────────────────────────
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

// ── Helper: show field error ─────────────────────────────────────────────────
function fieldError(el) {
  el.style.borderBottomColor = "#c0614a";
  el.addEventListener("input", () => { el.style.borderBottomColor = ""; }, { once: true });
}

// ── Helper: show success state ───────────────────────────────────────────────
function showSuccess(form, successEl) {
  form.style.transition = "opacity 0.4s ease, transform 0.4s ease";
  form.style.opacity    = "0";
  form.style.transform  = "translateY(-16px)";
  setTimeout(() => {
    form.style.display = "none";
    successEl.style.display = "flex";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        successEl.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        successEl.style.opacity    = "1";
        successEl.style.transform  = "translateY(0)";
      });
    });
  }, 420);
}

// ════════════════════════════════════════════════════════════════════════════
// SERVICES PAGE — full booking configurator form (#contactForm)
// ════════════════════════════════════════════════════════════════════════════
const contactForm = document.getElementById("contactForm");
const formSuccess = document.getElementById("formSuccess");

if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Validate required fields
    let valid = true;
    contactForm.querySelectorAll("[required]").forEach(f => {
      if (!f.value.trim()) { valid = false; fieldError(f); }
    });

    // Terms checkbox
    const checkbox   = document.getElementById("termsCheckbox");
    const termsError = document.getElementById("termsError");
    const termsLabel = document.getElementById("termsLabel");
    if (checkbox && !checkbox.checked) {
      valid = false;
      termsLabel?.classList.add("error");
      termsError?.classList.add("show");
      checkbox.addEventListener("change", () => {
        termsLabel?.classList.remove("error");
        termsError?.classList.remove("show");
      }, { once: true });
    }
    if (!valid) return;

    // Build the full document
    const firstName = val("fname");
    const lastName  = val("lname");

    const booking = {
      // ── Client info ──
      name:          `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      email:         val("femail"),
      phone:         val("fphone"),

      // ── Session config (from configurator hidden fields) ──
      service:       val("h_type")    || "Not specified",
      sessionLength: val("h_length"),
      locationType:  val("h_location"),
      date:          val("h_date"),
      time:          val("h_time"),
      startTime:     val("h_start"),
      endTime:       val("h_end"),
      skinRetouching:val("h_retouch"),
      depositDue:    val("h_deposit"),

      // ── Message ──
      message:       val("fmessage"),
      termsAgreed:   checkbox?.checked ? true : false,

      // ── Metadata ──
      status:        "new",
      source:        "services",
      createdAt:     serverTimestamp()
    };

    // Show loading state
    const submitBtn = contactForm.querySelector("[type=submit], .summary-cta, .btn-submit");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }

    try {
      await addDoc(collection(db, "bookingRequests"), booking);
      showSuccess(contactForm, formSuccess);
    } catch (err) {
      console.error("Booking submit failed:", err);
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Try Again"; }
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// HOMEPAGE — quick booking form (#booking-form)
// ════════════════════════════════════════════════════════════════════════════
const bookingForm  = document.getElementById("booking-form");
const bookingSuccessEl = document.getElementById("form-success");

if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Validate required fields
    let valid = true;
    bookingForm.querySelectorAll("[required]").forEach(f => {
      if (!f.value.trim()) { valid = false; fieldError(f); }
    });
    if (!valid) return;

    const fullName = val("f-name");
    const nameParts = fullName.split(" ");

    const booking = {
      name:          fullName,
      firstName:     nameParts[0] || "",
      lastName:      nameParts.slice(1).join(" ") || "",
      email:         val("f-email"),
      phone:         val("f-phone"),
      service:       val("f-session"),
      date:          val("f-date"),
      locationType:  val("f-location"),
      message:       val("f-message"),
      status:        "new",
      source:        "homepage",
      createdAt:     serverTimestamp()
    };

    const submitBtn = bookingForm.querySelector(".btn-submit");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }

    try {
      await addDoc(collection(db, "bookingRequests"), booking);
      showSuccess(bookingForm, bookingSuccessEl);
    } catch (err) {
      console.error("Booking submit failed:", err);
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Try Again"; }
    }
  });
}
