import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  browserPopupRedirectResolver
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB4VyaB_iWqnQvAdkk3rp_duVSIWTLROL8",
  authDomain: "chat-app-cc947.firebaseapp.com",
  projectId: "chat-app-cc947",
  storageBucket: "chat-app-cc947.firebasestorage.app",
  messagingSenderId: "666295111847",
  appId: "1:666295111847:web:e23574eabaddf84eab8b82"
};

const app = initializeApp(firebaseConfig);
console.log("Firebase Connected");

export const auth = initializeAuth(app, {
  // Firebase will use the first storage method supported by the browser.
  // IndexedDB is preferred, then localStorage, then sessionStorage.
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence
  ],
  popupRedirectResolver: browserPopupRedirectResolver
});
export const db = getFirestore(app);
export const storage = getStorage(app);
