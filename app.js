import { auth, db } from "./firebase.js";

// Menambahkan GoogleAuthProvider dan signInWithPopup untuk tombol Login Google Anda
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* =========================
   ELEMENT UI
========================= */
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const roomName = document.getElementById("roomName");

// Elemen Profil untuk update UI nama & foto Anda di sidebar
const myName = document.getElementById("myName");
const myPhoto = document.getElementById("myPhoto");

let currentChatId = "global";

/* =========================
   FUNGSI AUTO SCROLL KEBAWAH
========================= */
function scrollBottom() {
  if (!messages) return;

  // 1. Eksekusi instan saat teks masuk
  messages.scrollTop = messages.scrollHeight;

  // 2. Eksekusi cadangan dengan jeda waktu untuk menunggu gambar avatar selesai dimuat
  setTimeout(() => {
    messages.scrollTop = messages.scrollHeight;
  }, 100);

  setTimeout(() => {
    messages.scrollTop = messages.scrollHeight;
  }, 300);
}

/* =========================
   LOGIN / REGISTER GOOGLE
========================= */
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Simpan atau update data user ke Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        lastLogin: serverTimestamp()
      }, { merge: true });

      alert(`Selamat datang, ${user.displayName}!`);
    } catch (err) {
      alert("Gagal login dengan Google: " + err.message);
    }
  });
}

/* =========================
   LOGOUT
========================= */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });
}

/* ========================================================
   PROTECT ROUTE & TOGGLE TAMPILAN (Satu Halaman Tunggal)
======================================================== */
onAuthStateChanged(auth, async (user) => {
  const loginPage = document.getElementById("loginPage");
  const chatPage = document.getElementById("chatPage");

  if (user) {
    // JIKA USER LOGIN: Tampilkan Halaman Chat, Sembunyikan Login
    if (loginPage) loginPage.style.display = "none";
    if (chatPage) chatPage.style.display = "flex";

    // Update Profile Anda di bagian Sidebar kiri
    if (myName) myName.innerText = user.displayName || user.email.split("@")[0];
    if (myPhoto) myPhoto.src = user.photoURL || "https://ui-avatars.com/api/?name=" + (user.displayName || "DDT");

    // Optional: Ambil data tambahan dari Firestore jika diperlukan
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      console.log("User data dari database:", snap.data());
    }

    // Geser scroll paling bawah saat pertama kali aplikasi memuat chat
    scrollBottom();

  } else {
    // JIKA USER TIDAK LOGIN: Tampilkan Halaman Login, Sembunyikan Chat
    if (loginPage) loginPage.style.display = "flex";
    if (chatPage) chatPage.style.display = "none";
    
    // Reset data nama di UI
    if (myName) myName.innerText = "Loading...";
  }
});

/* =========================
   KIRIM PESAN (ENTER / CLICK)
========================= */
if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });
}

if (sendBtn) {
  sendBtn.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;
