import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const roomName = document.getElementById("roomName");

let currentChatId = "global";
let unsubscribeChat = null; // Menyimpan fungsi untuk mematikan listener lama

// =========================
// ENTER = SEND
// =========================
if (input && sendBtn) {
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });
}

// =========================
// AUTO SCROLL
// =========================
function scrollToBottom() {
    if (!messages) return;
    requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight;
    });
}

// =========================
// SEND MESSAGE
// =========================
sendBtn.addEventListener("click", async () => {
    const text = input.value.trim();
    if (!text) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
        await addDoc(collection(db, "messages"), {
            text,
            uid: user.uid,
            name: user.displayName || user.email.split("@")[0],
            email: user.email,
            photo: user.photoURL,
            chatId: currentChatId, // Berisi 'global' atau 'UID_A_UID_B'
            createdAt: serverTimestamp()
        });

        input.value = "";
        scrollToBottom();
    } catch (err) {
        console.error("Gagal mengirim pesan:", err);
    }
});

// =========================
// LOAD MESSAGES (REALTIME & FILTERED)
// =========================
function snapshot.forEach((doc) => {
    const data = doc.data();
    const me = auth.currentUser;
    if (!me) return;

    const isMe = data.uid === me.uid;
    const name = isMe ? "🎙️ ANTHONY 🎙️" : (data.name || "User");
    const time = formatTime(data.createdAt);
    const photo = data.photo || "https://ui-avatars.com/api/?name=" + encodeURIComponent(data.name || "User");

    const div = document.createElement("div");
    div.className = isMe ? "message-row me" : "message-row";

    if (isMe) {
        div.innerHTML = `
            <div class="message-card my-card">
                <div class="my-left">
                    <img src="${photo}" class="message-avatar" alt="avatar">

                    <div class="message-main">
                        <div class="message-meta">
                            <span class="message-name">${name}</span>
                            <span class="message-time">${time}</span>
                        </div>

                        <div class="message-text">${data.text}</div>

                        <div class="message-footer">
                            <span class="message-seen">
                                ✓ kevinchan0233@gmail.com dan 15 lainnya sekitar 2 jam yang lalu
                            </span>
                        </div>
                    </div>
                </div>

                <div class="message-actions">
                    <button title="Tambah"><i class="fa-solid fa-plus"></i></button>
                    <button title="Balas"><i class="fa-solid fa-reply"></i></button>
                    <button title="Edit"><i class="fa-regular fa-pen-to-square"></i></button>
                    <button title="Hapus"><i class="fa-regular fa-trash-can"></i></button>
                    <button title="Pin"><i class="fa-solid fa-thumbtack"></i></button>
                </div>
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="other-message">
                <img src="${photo}" class="message-avatar" alt="avatar">

                <div class="message-main">
                    <div class="message-meta">
                        <span class="message-name">${data.name || "User"}</span>
                        <span class="message-time">${time}</span>
                    </div>

                    <div class="message-text">${data.text}</div>
                </div>
            </div>
        `;
    }

    messages.appendChild(div);
});
        scrollToBottom();
    });
}

// =========================
// OPEN CHAT (PRIVATE CHAT)
// =========================
window.openChat = function (otherUser) {
    const me = auth.currentUser;
    if (!me) return;

    if (otherUser === "global") {
        currentChatId = "global";
        document.getElementById("roomName").innerText = "Room Chat Global";
    } else {
        // Gabungkan UID Anda dan UID tujuan secara alfabetis/terurut
        // Misal UID Anda 'abc' dan tujuan 'xyz', ID-nya jadi 'abc_xyz'
        // Ini memastikan kedua user masuk ke kamar ID yang sama persis
        currentChatId = me.uid < otherUser.uid 
            ? me.uid + "_" + otherUser.uid 
            : otherUser.uid + "_" + me.uid;
        
        document.getElementById("roomName").innerText = otherUser.name;
    }

    console.log("Kamar Chat Aktif:", currentChatId);
    listenToChat(currentChatId); // Jalankan fungsi untuk mendengarkan pesan di kamar ini
};

// Inisialisasi awal saat pertama kali dimuat
auth.onAuthStateChanged((user) => {
    if (user) {
        window.openChat("global");
    }
});
// ==========================================
// KONTROL RESPONSIVE MOBILE (NAVIGASI SCREEN)
// ==========================================
const sidebar = document.querySelector(".sidebar");
const chatArea = document.querySelector(".chat");
const backBtn = document.getElementById("backToSidebarBtn");

// Deteksi apakah resolusi layar saat ini adalah mobile (lebar <= 768px)
function isMobile() {
    return window.innerWidth <= 768;
}

// Modifikasi fungsi openChat yang sudah ada agar mendukung perpindahan halaman di HP
const originalOpenChat = window.openChat;
window.openChat = function (otherUser) {
    // Jalankan fungsi open chat asli bawaan firebase kita sebelumnya
    originalOpenChat(otherUser);

    // Jika di HP, sembunyikan sidebar dan tunjukkan area chat saat kontak diklik
    if (isMobile() && sidebar && chatArea) {
        sidebar.style.display = "none";
        chatArea.style.display = "flex";
        if (backBtn) backBtn.style.display = "block"; // Tampilkan tombol kembali
    }
};

// Logika ketika tombol "Kembali" di klik di HP
if (backBtn) {
    backBtn.addEventListener("click", () => {
        if (isMobile() && sidebar && chatArea) {
            sidebar.style.display = "flex";
            sidebar.style.width = "100%"; // Buat daftar kontak memenuhi layar
            chatArea.style.display = "none";
        }
    });
}

// Pastikan layout kembali normal jika user sengaja me-resize window browser dari kecil ke besar
window.addEventListener("resize", () => {
    if (!isMobile()) {
        if (sidebar) sidebar.style.display = "flex";
        if (sidebar) sidebar.style.width = "360px";
        if (chatArea) chatArea.style.display = "flex";
        if (backBtn) backBtn.style.display = "none";
    } else {
        // Jika sedang di posisi mobile dan belum pilih chat, utamakan tunjukkan sidebar
        if (sidebar && chatArea && chatArea.style.display !== "flex") {
            sidebar.style.display = "flex";
            sidebar.style.width = "100%";
            chatArea.style.display = "none";
        }
    }
});
