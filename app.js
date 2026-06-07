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
   REGISTER
========================= */
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) return alert("Email / Password kosong!");

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);

      const user = userCred.user;

      // simpan data user ke Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp()
      });

      alert("Register berhasil!");
      window.location.href = "chat.html";

    } catch (err) {
      alert(err.message);
    }
  });
}

/* =========================
   LOGIN
========================= */
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) return alert("Email / Password kosong!");

    try {
      await signInWithEmailAndPassword(auth, email, password);

      alert("Login berhasil!");
      window.location.href = "chat.html";

    } catch (err) {
      alert(err.message);
    }
  });
}

/* =========================
   LOGOUT
========================= */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

/* =========================
   PROTECT ROUTE
========================= */
onAuthStateChanged(auth, async (user) => {
  const isLoginPage = window.location.pathname.includes("index.html");
  const isChatPage = window.location.pathname.includes("chat.html");

  if (!user && isChatPage) {
    window.location.href = "index.html";
  }

  if (user && isLoginPage) {
    window.location.href = "chat.html";
  }

  // optional: ambil data user
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      console.log("User data:", snap.data());
    }
  }
});
