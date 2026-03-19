import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Import the functions you need from the SDKs you need
//import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBPGl4rIqtvNN2jEdZag80kNhut-GTOaU",
  authDomain: "shopping-pwa-db.firebaseapp.com",
  projectId: "shopping-pwa-db",
  storageBucket: "shopping-pwa-db.firebasestorage.app",
  messagingSenderId: "887874978345",
  appId: "1:887874978345:web:8b6acb414b4c30178b5238"
};

// Initialize Firebase
//const app = initializeApp(firebaseConfig);

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
