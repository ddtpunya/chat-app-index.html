import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =========================
   ELEMENT UI
========================= */
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* =========================
   HELPER PAGE CHECK
========================= */
const isLoginPage = () => window.location.pathname.endsWith("index.html") || window.location.pathname === "/";
const isChatPage = () => window.location.pathname.includes("chat.html");

/* =========================
   REGISTER
========================= */
registerBtn?.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) return alert("Email / Password kosong!");

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCred.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp()
    });

    alert("Register berhasil!");

    // FIX: pakai replace biar tidak bisa back ke login
    window.location.replace("chat.html");

  } catch (err) {
    alert(err.message);
  }
});

/* =========================
   LOGIN
========================= */
loginBtn?.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) return alert("Email / Password kosong!");

  try {
    await signInWithEmailAndPassword(auth, email, password);

    alert("Login berhasil!");

    // FIX: replace lebih aman di GitHub Pages
    window.location.replace("chat.html");

  } catch (err) {
    alert(err.message);
  }
});

/* =========================
   LOGOUT
========================= */
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("index.html");
});

/* =========================
   PROTECT ROUTE (FIXED)
========================= */
onAuthStateChanged(auth, async (user) => {

  const path = window.location.pathname;

  const onLoginPage =
    path.endsWith("index.html") ||
    path === "/" ||
    path.includes("login");

  const onChatPage = path.includes("chat.html");

  // ❌ kalau belum login tapi di chat → balik login
  if (!user && onChatPage) {
    window.location.replace("index.html");
    return;
  }

  // ❌ kalau sudah login tapi di login page → ke chat
  if (user && onLoginPage) {
    window.location.replace("chat.html");
    return;
  }

  // optional debug user
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      console.log("User data:", snap.data());
    }
  }
});
