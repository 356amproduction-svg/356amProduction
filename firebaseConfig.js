// firebaseConfig.js — shared Firebase initializer
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAFBc7UMpq-2uuiZ8r-TToKvX-IpQ594Do",
  authDomain:        "am-production-3c826.firebaseapp.com",
  projectId:         "am-production-3c826",
  storageBucket:     "am-production-3c826.firebasestorage.app",
  messagingSenderId: "153860144380",
  appId:             "1:153860144380:web:41174498c368419445eb79"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export { app };
