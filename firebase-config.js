import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAFBc7UMpq-2uuiZ8r-TToKvX-IpQ594Do",
  authDomain: "am-production-3c826.firebaseapp.com",
  projectId: "am-production-3c826",
  storageBucket: "am-production-3c826.firebasestorage.app",
  messagingSenderId: "153860144380",
  appId: "1:153860144380:web:41174498c368419445eb79",
  measurementId: "G-X0L0Y4DVBG"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// ── Booking form → Firestore ──
const bookingForm = document.getElementById('booking-form');
const formSuccess = document.getElementById('form-success');

if (bookingForm) {
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate required fields
    let valid = true;
    bookingForm.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        valid = false;
        field.style.borderBottomColor = '#b94a48';
        setTimeout(() => { field.style.borderBottomColor = ''; }, 2500);
      }
    });
    if (!valid) return;

    const submitBtn = bookingForm.querySelector('.btn-submit');
    submitBtn.textContent = 'Sending…';
    submitBtn.disabled = true;

    try {
      await addDoc(collection(db, 'bookings'), {
        name:          bookingForm.f_name?.value.trim()     || bookingForm.querySelector('#f-name')?.value.trim(),
        email:         bookingForm.f_email?.value.trim()    || bookingForm.querySelector('#f-email')?.value.trim(),
        phone:         bookingForm.f_phone?.value.trim()    || bookingForm.querySelector('#f-phone')?.value.trim(),
        sessionType:   bookingForm.querySelector('#f-session')?.value,
        preferredDate: bookingForm.querySelector('#f-date')?.value,
        location:      bookingForm.querySelector('#f-location')?.value.trim(),
        message:       bookingForm.querySelector('#f-message')?.value.trim(),
        submittedAt:   serverTimestamp(),
        status:        'new'
      });

      // Show success state
      bookingForm.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      bookingForm.style.opacity    = '0';
      bookingForm.style.transform  = 'translateY(16px)';
      setTimeout(() => {
        bookingForm.style.display = 'none';
        formSuccess.classList.add('show');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            formSuccess.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            formSuccess.style.opacity    = '1';
            formSuccess.style.transform  = 'translateY(0)';
          });
        });
      }, 420);

    } catch (err) {
      console.error('Booking submission error:', err);
      submitBtn.textContent = 'Try Again';
      submitBtn.disabled = false;
    }
  });
}

export { app, analytics, db };
