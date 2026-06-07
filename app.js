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
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const roomName = document.getElementById("roomName");

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
  }, 300); // Penjagaan ekstra jika koneksi internet agak lambat saat memuat gambar
}

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
   LOGOUT & PROTECT ROUTE
========================= */
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

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

    const user = auth.currentUser;
    if (!user) {
      alert("Belum login");
      return;
    }

    try {
      await addDoc(collection(db, "messages"), {
        text: text,
        uid: user.uid,
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
        photo: user.photoURL || "https://ui-avatars.com/api/?name=" + (user.displayName || "DDT"),
        chatId: currentChatId,
        createdAt: serverTimestamp()
      });

      input.value = "";
      scrollBottom();
    } catch (e) {
      console.log(e);
    }
  });
}

/* =========================
   BUKA ROOM PRIVATE CHAT
========================= */
window.openChat = function (otherUser) {
  const me = auth.currentUser;
  if (!me) return;

  currentChatId = me.uid < otherUser.uid
    ? me.uid + "_" + otherUser.uid
    : otherUser.uid + "_" + me.uid;

  if (roomName) {
    roomName.innerText = otherUser.name || "Private Chat";
  }
};

/* ==========================================
   REALTIME LISTEN CHAT & RENDER (SEBARIS)
========================================== */
const q = query(collection(db, "messages"), orderBy("createdAt"));

onSnapshot(q, (snapshot) => {
  if (!messages) return;
  messages.innerHTML = "";

  const me = auth.currentUser;

  snapshot.forEach((doc) => {
    const data = doc.data();

    if (data.chatId !== currentChatId && data.chatId !== "global") return;

    const isMe = me && data.uid === me.uid;

    const row = document.createElement("div");
    row.className = "message";
    row.style.justifyContent = "flex-start"; // Rata kiri semua seperti layout grup discord/slack

    const photo = data.photo || "https://ui-avatars.com/api/?name=" + encodeURIComponent(data.name);

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    // Membedakan warna nama pengirim agar mudah dibaca
    const senderColor = isMe ? "#e11d48" : "#1d4ed8";

    // Menyusun nama pengirim dan isi teks berdampingan (sebaris)
    bubble.innerHTML = `
      <span class="sender" style="color: ${senderColor}; font-weight: 700; margin-right: 6px;">${data.name}:</span>
      <span style="color: #111827;">${data.text}</span>
    `;

    // Merender susunan horizontal: Foto dulu, baru teks bubble di kanannya
    row.innerHTML = `
      <img src="${photo}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; margin-right: 10px; flex-shrink: 0;">
      ${bubble.outerHTML}
    `;

    messages.appendChild(row);
  });

  // Jalankan geser scrollbar otomatis mentok ke bawah
  scrollBottom();
});
