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
    row.style.justifyContent = "flex-start"; 

    const photo = data.photo || "https://ui-avatars.com/api/?name=" + encodeURIComponent(data.name);

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    // Membedakan warna nama pengirim agar mudah dibaca (Diri sendiri merah muda, orang lain biru)
    const senderColor = isMe ? "#e11d48" : "#1d4ed8";

    // Menyusun nama pengirim dan isi teks berdampingan sebaris
    bubble.innerHTML = `
      <span class="sender" style="color: ${senderColor}; font-weight: 700; margin-right: 6px;">${data.name}:</span>
      <span style="color: #111827;">${data.text}</span>
    `;

    row.innerHTML = `
      <img src="${photo}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; margin-right: 10px; flex-shrink: 0;">
      ${bubble.outerHTML}
    `;

    messages.appendChild(row);
  });

  // Otomatis gulung scrollbar ke posisi paling bawah setelah render selesai
  scrollBottom();
});
