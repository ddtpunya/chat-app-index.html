import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc
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
// HAPUS PESAN
// =========================
window.deleteMessage = async function (messageId) {
    const konfirmasi = confirm("Apakah Anda yakin ingin menghapus pesan ini?");
    if (!konfirmasi) return;

    try {
        await deleteDoc(doc(db, "messages", messageId));
        console.log("Pesan berhasil dihapus:", messageId);
    } catch (err) {
        console.error("Gagal menghapus pesan:", err);
        alert("Anda tidak memiliki izin untuk menghapus pesan ini.");
    }
};

// ========================================================
// LOAD MESSAGES (REALTIME & FILTERED - TAMPILAN MODEL FORUM)
// ========================================================
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

        snapshot.forEach((snapshotDoc) => {
            const data = snapshotDoc.data();
            const messageId = snapshotDoc.id;
            const me = auth.currentUser;
            if (!me) return;

            const isMe = data.uid === me.uid;
            const div = document.createElement("div");
            
            // Menggunakan kelas tata letak model forum/Discord
            div.className = "forum-message-row";

            const photoURL = data.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}`;

            // Mengambil format waktu jam:menit
            let timeString = "";
            if (data.createdAt && data.createdAt.toDate) {
                const dateObj = data.createdAt.toDate();
                timeString = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            } else {
                timeString = "Baru saja";
            }

            div.innerHTML = `
                <div class="forum-avatar-area">
                    <img src="${photoURL}" class="forum-avatar" alt="avatar">
                </div>

                <div class="forum-body-area">
                    <div class="forum-header">
                        <span class="forum-sender-name">${isMe ? 'Anda' : data.name}</span>
                        <span class="forum-timestamp">${timeString}</span>
                        
                        ${isMe ? `<i class="fa-solid fa-trash forum-delete-btn" onclick="deleteMessage('${messageId}')" title="Hapus Pesan"></i>` : ''}
                    </div>
                    <div class="forum-text">
                        ${data.text}
                    </div>
                </div>
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
        currentChatId = me.uid < otherUser.uid 
            ? me.uid + "_" + otherUser.uid 
            : otherUser.uid + "_" + me.uid;
        
        document.getElementById("roomName").innerText = otherUser.name;
    }

    console.log("Kamar Chat Aktif:", currentChatId);
    listenToChat(currentChatId); // Jalankan fungsi untuk mendengarkan pesan di kamar ini

    // Sistem Navigasi Responsif Mobile (Sembunyikan sidebar, tampilkan obrolan)
    if (isMobile() && sidebar && chatArea) {
        sidebar.style.display = "none";
        chatArea.style.display = "flex";
        if (backBtn) backBtn.style.display = "block";
    }
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
