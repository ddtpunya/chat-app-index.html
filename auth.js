import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    setDoc,
    collection,
    onSnapshot,
    query,
    where,
    serverTimestamp,
    deleteField
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { auth, db } from "./firebase.js?v=20260723-friends-inside-settings-v11";

// Tambahkan email lain ke daftar ini agar mereka dapat login.
// Akun tidak ditampilkan sebagai direktori publik; penambahan teman memakai pencarian Gmail exact-match.
const ALLOWED_EMAILS = [
    "verensmb@gmail.com",
    "anthonyan4556@gmail.com",
    "verenlim49@gmail.com",
    "anthonywian4@gmail.com",
];

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userList = document.getElementById("userList");
const myName = document.getElementById("myName");
const myPhoto = document.getElementById("myPhoto");
const loginPage = document.getElementById("loginPage");
const chatPage = document.getElementById("chatPage");
const sidebarSearchInput = document.getElementById("sidebarSearchInput");
const groupsBtn = document.getElementById("groupsBtn");

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

let currentUser = null;
let directoryUsers = [];
let directoryGroups = [];
let directoryFriendships = [];
let directoryMode = "all";
let activeChatId = "global";
let unsubscribeUserProfiles = new Map();
let unsubscribeGroups = null;
let unsubscribeFriendships = null;
let presenceHeartbeatTimer = null;
let directoryClockTimer = null;

const PRESENCE_HEARTBEAT_MS = 60 * 1000;
const ONLINE_FRESHNESS_MS = 4 * 60 * 1000;

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function safeImageURL(value, fallbackName = "User") {
    try {
        const url = new URL(String(value || ""));
        if (["https:", "http:"].includes(url.protocol)) return url.href;
    } catch {
        // Use fallback below.
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=1f2a44&color=ffffff`;
}

function normalizeEmail(value = "") {
    return String(value).trim().toLowerCase();
}

function directChatId(uidA, uidB) {
    return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
}

function getAcceptedFriendUidSet() {
    const accepted = new Set();
    if (!currentUser) return accepted;

    directoryFriendships.forEach((friendship) => {
        if (friendship.status !== "accepted") return;
        const members = Array.isArray(friendship.userUids) ? friendship.userUids : [];
        const otherUid = members.find((uid) => uid && uid !== currentUser.uid);
        if (otherUid) accepted.add(otherUid);
    });

    return accepted;
}

function timestampToDate(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (value instanceof Date) return value;

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPresenceDate(user = {}) {
    return timestampToDate(user.presenceUpdatedAt)
        || timestampToDate(user.lastSeen)
        || timestampToDate(user.lastLogin);
}

function isUserOnline(user = {}) {
    if (user.presenceState !== "online") return false;
    const updatedAt = getPresenceDate(user);
    return Boolean(updatedAt && (Date.now() - updatedAt.getTime()) <= ONLINE_FRESHNESS_MS);
}

function formatLastSeen(user = {}) {
    if (isUserOnline(user)) return "Online";

    const date = getPresenceDate(user);
    if (!date) return "Offline";

    const diffMs = Math.max(0, Date.now() - date.getTime());
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < minute) return "Terakhir dilihat baru saja";
    if (diffMs < hour) return `Terakhir dilihat ${Math.floor(diffMs / minute)} menit lalu`;

    const time = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
    if (diffMs < day && date.getDate() === new Date().getDate()) {
        return `Terakhir dilihat hari ini ${time}`;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return `Terakhir dilihat kemarin ${time}`;
    }

    const dateText = date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    return `Terakhir dilihat ${dateText}, ${time}`;
}

async function syncEmailLookup(user) {
    const normalizedEmail = normalizeEmail(user?.email || "");
    if (!user?.uid || !normalizedEmail) return;

    await setDoc(
        doc(db, "email_lookup", normalizedEmail),
        {
            uid: user.uid,
            email: normalizedEmail,
            name: user.displayName || normalizedEmail.split("@")[0] || "User",
            photo: user.photoURL || "",
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );
}

async function writePresence(state = "online") {
    const user = currentUser;
    if (!user || !isEmailAllowed(user.email)) return;

    const data = {
        presenceState: state,
        presenceUpdatedAt: serverTimestamp()
    };

    if (state === "offline") data.lastSeen = serverTimestamp();

    try {
        await setDoc(doc(db, "users", user.uid), data, { merge: true });
    } catch (error) {
        console.warn("Gagal memperbarui status kehadiran:", error);
    }
}

function stopPresenceTracking() {
    if (presenceHeartbeatTimer) window.clearInterval(presenceHeartbeatTimer);
    if (directoryClockTimer) window.clearInterval(directoryClockTimer);
    presenceHeartbeatTimer = null;
    directoryClockTimer = null;
}

function startPresenceTracking() {
    stopPresenceTracking();
    writePresence("online");

    presenceHeartbeatTimer = window.setInterval(() => {
        if (navigator.onLine) writePresence("online");
    }, PRESENCE_HEARTBEAT_MS);

    directoryClockTimer = window.setInterval(renderDirectory, 60 * 1000);
}

window.addEventListener("online", () => writePresence("online"));
window.addEventListener("offline", () => writePresence("offline"));
window.addEventListener("focus", () => writePresence("online"));
window.addEventListener("pageshow", () => writePresence("online"));
window.addEventListener("pagehide", () => {
    void writePresence("offline");
});
window.addEventListener("beforeunload", () => {
    void writePresence("offline");
});
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") writePresence("online");
});

function isEmailAllowed(email) {
    if (!email) return false;
    const normalized = email.toLowerCase().trim();
    return ALLOWED_EMAILS.some((item) => item.toLowerCase().trim() === normalized);
}

const authLoadingPage = document.getElementById("authLoadingPage");
let authObserverStarted = false;
let authInitialStateReceived = false;
let authRestoreFallbackTimer = null;

const AUTH_RESTORE_TIMEOUT_MS = 6500;

function showAuthLoading() {
    if (authLoadingPage) authLoadingPage.style.display = "flex";
    if (loginPage) loginPage.style.display = "none";
    if (chatPage) chatPage.style.display = "none";
}

function hideAuthLoading() {
    if (authLoadingPage) authLoadingPage.style.display = "none";
}

function clearAuthRestoreFallback() {
    if (!authRestoreFallbackTimer) return;
    window.clearTimeout(authRestoreFallbackTimer);
    authRestoreFallbackTimer = null;
}

function showLoginFallback() {
    hideAuthLoading();
    if (loginPage) loginPage.style.display = "flex";
    if (chatPage) chatPage.style.display = "none";
}

function initializeAuthentication() {
    if (authObserverStarted) return;
    authObserverStarted = true;
    showAuthLoading();

    // Pasang observer lebih dahulu. Jangan menunggu getRedirectResult(), karena
    // proses redirect dapat menggantung pada browser/hosting tertentu.
    onAuthStateChanged(
        auth,
        async (user) => {
            authInitialStateReceived = true;
            clearAuthRestoreFallback();
            await handleAuthStateChange(user);
        },
        (error) => {
            console.error("Auth state observer error:", error);
            authInitialStateReceived = true;
            clearAuthRestoreFallback();
            showLoginFallback();
        }
    );

    // Redirect result diproses di belakang layar dan tidak boleh menahan UI.
    void getRedirectResult(auth).catch((error) => {
        console.error("Redirect login error:", error.code, error.message);
    });

    // authStateReady juga dijalankan tanpa memblokir tampilan.
    if (typeof auth.authStateReady === "function") {
        void auth.authStateReady().catch((error) => {
            console.error("Auth initialization error:", error);
        });
    }

    // Pengaman: layar pemulihan tidak boleh tampil selamanya.
    authRestoreFallbackTimer = window.setTimeout(() => {
        if (authInitialStateReceived) return;

        console.warn("Pemulihan sesi melewati batas waktu. Menampilkan halaman login.");
        showLoginFallback();

        // Jika Firebase sudah memiliki user tetapi observer terlambat, buka chat.
        if (auth.currentUser) {
            void handleAuthStateChange(auth.currentUser);
        }
    }, AUTH_RESTORE_TIMEOUT_MS);
}

loginBtn?.addEventListener("click", async () => {
    try {
        loginBtn.disabled = true;
        loginBtn.innerHTML = `<i class="fa-brands fa-google"></i> Membuka Google...`;
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login Google gagal:", error.code, error.message);

        if (error.code === "auth/popup-closed-by-user") return;

        if (
            error.code === "auth/popup-blocked" ||
            error.code === "auth/cancelled-popup-request"
        ) {
            await signInWithRedirect(auth, provider);
            return;
        }

        alert(`Login gagal: ${error.message}`);
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = `<i class="fa-brands fa-google"></i> Login Google`;
    }
});

logoutBtn?.addEventListener("click", async () => {
    try {
        await writePresence("offline");
        await signOut(auth);
        location.reload();
    } catch (error) {
        console.error("Logout gagal:", error);
        alert(`Logout gagal: ${error.message}`);
    }
});

function createGlobalItem() {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "group-item";
    item.dataset.chatId = "global";
    item.dataset.kind = "global";
    item.innerHTML = `
        <span class="directory-avatar directory-avatar-global">
            <i class="fa-solid fa-earth-americas"></i>
        </span>
        <span class="group-info">
            <span class="group-name">Global Chat</span>
            <span class="group-desc">Obrolan Publik</span>
        </span>
        <span class="group-time"><i class="fa-solid fa-users"></i></span>
    `;
    item.addEventListener("click", () => window.openChat?.("global"));
    return item;
}

function createGroupItem(group) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "group-item";
    item.dataset.chatId = `group_${group.id}`;
    item.dataset.kind = "group";

    const name = group.name || "Grup Tanpa Nama";
    const total = Array.isArray(group.memberUids) ? group.memberUids.length : 1;
    const photo = safeImageURL(group.photo, name);

    item.innerHTML = `
        <img src="${escapeHTML(photo)}" alt="avatar grup">
        <span class="group-info">
            <span class="group-name">${escapeHTML(name)}</span>
            <span class="group-desc">${total} anggota</span>
        </span>
        <span class="group-time"><i class="fa-solid fa-user-group"></i></span>
    `;

    item.addEventListener("click", () => {
        window.openChat?.({
            kind: "group",
            id: group.id,
            name,
            photo,
            memberUids: group.memberUids || [],
            createdBy: group.createdBy || ""
        });
    });

    return item;
}

function createUserItem(user) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "group-item";
    item.dataset.chatId = directChatId(currentUser.uid, user.uid);
    item.dataset.kind = "private";

    const name = user.name || user.email?.split("@")[0] || "User";
    const photo = safeImageURL(user.photo, name);
    const online = isUserOnline(user);
    const presenceLabel = formatLastSeen(user);

    item.innerHTML = `
        <img src="${escapeHTML(photo)}" alt="avatar">
        <span class="group-info">
            <span class="group-name">${escapeHTML(name)}</span>
            <span class="group-desc user-presence-text ${online ? "is-online" : "is-offline"}">${escapeHTML(presenceLabel)}</span>
        </span>
        <span class="group-time online-indicator ${online ? "is-online" : "is-offline"}" title="${escapeHTML(presenceLabel)}">●</span>
    `;

    item.addEventListener("click", () => {
        window.openChat?.({
            kind: "private",
            uid: user.uid,
            name,
            photo,
            presenceState: user.presenceState || "offline",
            presenceUpdatedAt: user.presenceUpdatedAt || null,
            lastSeen: user.lastSeen || null,
            lastLogin: user.lastLogin || null
        });
    });

    return item;
}

function matchesSearch(...parts) {
    const queryText = sidebarSearchInput?.value.trim().toLowerCase() || "";
    if (!queryText) return true;
    return parts.join(" ").toLowerCase().includes(queryText);
}

function renderDirectory() {
    if (!userList || !currentUser) return;

    userList.innerHTML = "";
    let visibleCount = 0;

    if (directoryMode === "all" || directoryMode === "groups") {
        if (matchesSearch("Global Chat", "Obrolan Publik")) {
            userList.appendChild(createGlobalItem());
            visibleCount += 1;
        }

        directoryGroups
            .slice()
            .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "id"))
            .forEach((group) => {
                if (!matchesSearch(group.name || "", "grup", "group")) return;
                userList.appendChild(createGroupItem(group));
                visibleCount += 1;
            });
    }

    if (directoryMode === "all") {
        const acceptedFriendUids = getAcceptedFriendUidSet();

        directoryUsers
            .filter((user) => user.uid !== currentUser.uid && acceptedFriendUids.has(user.uid))
            .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "id"))
            .forEach((user) => {
                if (!matchesSearch(user.name || "", "teman", "private chat")) return;
                userList.appendChild(createUserItem(user));
                visibleCount += 1;
            });
    }

    if (!visibleCount) {
        const empty = document.createElement("div");
        empty.className = "directory-empty";
        empty.innerHTML = `<i class="fa-regular fa-folder-open"></i><span>Tidak ada hasil. Tambahkan teman melalui tombol Teman.</span>`;
        userList.appendChild(empty);
    }

    userList.querySelector(`[data-chat-id="${CSS.escape(activeChatId)}"]`)?.classList.add("active");

    const acceptedFriendUids = getAcceptedFriendUidSet();
    window.chatDirectoryUsers = directoryUsers.slice();
    window.chatDirectoryGroups = directoryGroups.slice();
    window.chatDirectoryFriendships = directoryFriendships.slice();
    window.chatFriendUidSet = acceptedFriendUids;
    window.chatDirectoryUserCount = directoryUsers.length;
    window.chatFriendCount = acceptedFriendUids.size;
    window.dispatchEvent(new CustomEvent("chat-directory-updated"));
    window.dispatchEvent(new CustomEvent("chat-friendships-updated"));
}

sidebarSearchInput?.addEventListener("input", renderDirectory);

groupsBtn?.addEventListener("click", () => {
    directoryMode = directoryMode === "groups" ? "all" : "groups";
    groupsBtn.classList.toggle("active", directoryMode === "groups");
    groupsBtn.setAttribute("aria-pressed", String(directoryMode === "groups"));
    renderDirectory();
});

window.setActiveSidebarChat = (chatId) => {
    activeChatId = chatId || "global";
    userList?.querySelectorAll(".group-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.chatId === activeChatId);
    });
};

function clearUserProfileListeners() {
    unsubscribeUserProfiles.forEach((unsubscribe) => {
        try { unsubscribe?.(); } catch { /* no-op */ }
    });
    unsubscribeUserProfiles.clear();
}

function syncRelatedUserProfileListeners(user) {
    const relatedUids = new Set();
    directoryFriendships.forEach((friendship) => {
        (friendship.userUids || []).forEach((uid) => {
            if (uid && uid !== user.uid) relatedUids.add(uid);
        });
    });

    unsubscribeUserProfiles.forEach((unsubscribe, uid) => {
        if (!relatedUids.has(uid)) {
            try { unsubscribe?.(); } catch { /* no-op */ }
            unsubscribeUserProfiles.delete(uid);
            directoryUsers = directoryUsers.filter((item) => item.uid !== uid);
        }
    });

    relatedUids.forEach((uid) => {
        if (unsubscribeUserProfiles.has(uid)) return;

        const unsubscribe = onSnapshot(
            doc(db, "users", uid),
            (snapshot) => {
                const data = snapshot.exists()
                    ? { id: snapshot.id, uid: snapshot.id, ...snapshot.data() }
                    : { uid, name: "User", photo: "" };

                directoryUsers = [
                    ...directoryUsers.filter((item) => item.uid !== uid),
                    data
                ];
                renderDirectory();
            },
            (error) => {
                console.warn("Gagal membaca profil teman:", error);
            }
        );

        unsubscribeUserProfiles.set(uid, unsubscribe);
    });

    renderDirectory();
}

function startDirectoryListeners(user) {
    clearUserProfileListeners();
    unsubscribeGroups?.();
    unsubscribeFriendships?.();
    directoryUsers = [];

    const groupsQuery = query(
        collection(db, "groups"),
        where("memberUids", "array-contains", user.uid)
    );

    unsubscribeGroups = onSnapshot(
        groupsQuery,
        (snapshot) => {
            directoryGroups = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
            renderDirectory();
        },
        (error) => {
            console.error("Gagal mengambil daftar grup:", error);
            directoryGroups = [];
            renderDirectory();
        }
    );

    const friendshipsQuery = query(
        collection(db, "friendships"),
        where("userUids", "array-contains", user.uid)
    );

    unsubscribeFriendships = onSnapshot(
        friendshipsQuery,
        (snapshot) => {
            directoryFriendships = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
            syncRelatedUserProfileListeners(user);
            renderDirectory();
        },
        (error) => {
            console.error("Gagal mengambil daftar pertemanan:", error);
            directoryFriendships = [];
            syncRelatedUserProfileListeners(user);
            renderDirectory();
        }
    );
}

async function handleAuthStateChange(user) {
    currentUser = user;
    hideAuthLoading();

    if (!user) {
        stopPresenceTracking();
        clearUserProfileListeners();
        unsubscribeGroups?.();
        unsubscribeFriendships?.();
        directoryFriendships = [];
        if (loginPage) loginPage.style.display = "flex";
        if (chatPage) chatPage.style.display = "none";
        return;
    }

    if (!isEmailAllowed(user.email)) {
        alert("Akses ditolak: Email Anda tidak terdaftar!");
        await signOut(auth);
        if (loginPage) loginPage.style.display = "flex";
        if (chatPage) chatPage.style.display = "none";
        return;
    }

    // The authenticated UI is shown immediately after Firebase restores the
    // session. A temporary Firestore write problem must not look like logout.
    if (loginPage) loginPage.style.display = "none";
    if (chatPage) chatPage.style.display = "flex";

    if (myName) myName.textContent = user.displayName || user.email?.split("@")[0] || "User";
    if (myPhoto) myPhoto.src = safeImageURL(user.photoURL, user.displayName || user.email || "User");

    startPresenceTracking();
    startDirectoryListeners(user);

    try {
        await Promise.all([
            setDoc(
                doc(db, "users", user.uid),
                {
                    uid: user.uid,
                    name: user.displayName || user.email?.split("@")[0] || "User",
                    email: deleteField(),
                    photo: user.photoURL || "",
                    lastLogin: serverTimestamp(),
                    presenceState: "online",
                    presenceUpdatedAt: serverTimestamp()
                },
                { merge: true }
            ),
            syncEmailLookup(user)
        ]);
    } catch (error) {
        // Keep the existing Firebase Auth session. Presence can retry on the
        // next heartbeat instead of forcing the user back to the login page.
        console.error("Gagal menyinkronkan data user:", error);
    }
}

initializeAuthentication();
