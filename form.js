// form.js — handles booking form submission → Firestore bookingRequests
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

// ── Helper: show inline submission error ─────────────────────────────────────
function showError(form, message) {
  let errEl = form.querySelector(".form-submit-error");
  if (!errEl) {
    errEl = document.createElement("p");
    errEl.className = "form-submit-error";
    errEl.style.cssText = "color:#c0614a;font-size:.8rem;margin-top:12px;text-align:center;";
    form.appendChild(errEl);
  }
  errEl.textContent = message;
}

// ════════════════════════════════════════════════════════════════════════════
// SERVICES PAGE — full booking configurator form (#contactForm)
// ════════════════════════════════════════════════════════════════════════════
const contactForm = document.getElementById("contactForm");
const formSuccess = document.getElementById("formSuccess");

if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // ── Validate required text fields ──
    let valid = true;
    contactForm.querySelectorAll("[required]").forEach(f => {
      if (!f.value.trim()) { valid = false; fieldError(f); }
    });

    // ── Validate terms checkbox ──
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

    // ── Build Firestore document — every field from the form ──
    const firstName = val("fname");
    const lastName  = val("lname");

    const booking = {
      // Contact info
      name:            `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      email:           val("femail"),
      phone:           val("fphone"),

      // Session configurator selections (hidden fields set by the JS configurator)
      service:         val("h_type")    || "Not specified",
      sessionLength:   val("h_length"),
      locationType:    val("h_location"),
      date:            val("h_date"),
      time:            val("h_time"),
      startTime:       val("h_start"),
      endTime:         val("h_end"),
      skinRetouching:  val("h_retouch"),
      estimatedTotal:  val("h_total"),
      depositDue:      val("h_deposit"),

      // Client message / vision
      message:         val("fmessage"),
      termsAgreed:     checkbox?.checked ?? false,

      // Metadata
      status:          "new",
      source:          "services",
      createdAt:       serverTimestamp()
    };

    // ── Show loading state ──
    const submitBtn = contactForm.querySelector(".summary-cta, [type=submit], .btn-submit");
    const origText  = submitBtn?.textContent;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }

    try {
      await addDoc(collection(db, "bookingRequests"), booking);
      showSuccess(contactForm, formSuccess);
    } catch (err) {
      console.error("Booking submit failed:", err);
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText || "Try Again"; }
      showError(contactForm, "Submission failed — please try again or email us directly.");
    }
  });
}
