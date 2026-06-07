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
function listenToChat(chatId) {
    // Matikan listener sebelumnya jika ada agar tidak tumpang tindih
    if (unsubscribeChat) unsubscribeChat();

    // Gunakan query WHERE langsung ke Firestore agar aman dan efisien
    const q = query(
        collection(db, "messages"),
        where("chatId", "==", chatId),
        orderBy("createdAt")
    );

    unsubscribeChat = onSnapshot(q, (snapshot) => {
        messages.innerHTML = "";

        snapshot.forEach((doc) => {
            const data = doc.data();
            const me = auth.currentUser;
            if (!me) return;

            // Tentukan apakah ini pesan kita atau orang lain
            const isMe = data.uid === me.uid;

            const div = document.createElement("div");
            div.className = "message";
            
            // Atur posisi: Jika pesan kita, taruh di kanan. Jika orang lain, di kiri.
            div.style.justifyContent = isMe ? "flex-end" : "flex-start";

            // Gunakan struktur CSS class yang sudah Anda buat di style.css
            div.innerHTML = `
                ${!isMe ? `<img src="${data.photo || 'https://ui-avatars.com/api/?name='+data.name}" alt="avatar">` : ''}
                <div class="bubble" style="background: ${isMe ? '#d9fdd3' : 'white'}; border-radius: ${isMe ? '12px 12px 0 12px' : '12px 12px 12px 0'};">
                    <div class="sender" style="color: ${isMe ? '#059669' : '#1d4ed8'}">${isMe ? 'Anda' : data.name}</div>
                    <div>${data.text}</div>
                </div>
                ${isMe ? `<img src="${data.photo || 'https://ui-avatars.com/api/?name='+data.name}" alt="avatar" style="margin-left: 10px;">` : ''}
            `;

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
