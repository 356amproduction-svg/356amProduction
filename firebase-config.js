import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js";

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

export { app, analytics };
