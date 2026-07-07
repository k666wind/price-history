import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your web app's Firebase configuration
// 注意：呢個 key 公開係正常 (Firebase 設計如此)，真正保護要靠 Firestore Security Rules。
const firebaseConfig = {
  apiKey: "AIzaSyCBPGl4rIqtvNN2jEdZag80kNhut-GTOaU",
  authDomain: "shopping-pwa-db.firebaseapp.com",
  projectId: "shopping-pwa-db",
  storageBucket: "shopping-pwa-db.firebasestorage.app",
  messagingSenderId: "887874978345",
  appId: "1:887874978345:web:8b6acb414b4c30178b5238"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// --------------------
// Anonymous Auth
// --------------------
// 呢度提供一個 Promise，等 app.js 可以 await 用戶已經登入
// (配合 firestore.rules 嘅 `allow read, write: if request.auth != null;`)
export const authReady = new Promise((resolve, reject) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      resolve(user);
    }
  });

  signInAnonymously(auth).catch((err) => {
    console.error("[Auth] Anonymous sign-in failed:", err);
    reject(err);
  });
});
