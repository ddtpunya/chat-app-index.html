import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    setDoc,
    collection,
    onSnapshot,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { auth, db } from "./firebase.js?v=20260723-image-upload-firestore-v2";

// Tambahkan email lain ke daftar ini agar mereka dapat login dan muncul
// sebagai pilihan private chat / anggota grup.
const ALLOWED_EMAILS = [
    "antho56@gmail.com"
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
let directoryMode = "all";
let activeChatId = "global";
let unsubscribeUsers = null;
let unsubscribeGroups = null;

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

function directChatId(uidA, uidB) {
    return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
}

function isEmailAllowed(email) {
    if (!email) return false;
    const normalized = email.toLowerCase().trim();
    return ALLOWED_EMAILS.some((item) => item.toLowerCase().trim() === normalized);
}

async function prepareAuthPersistence() {
    await setPersistence(auth, browserLocalPersistence);
}

prepareAuthPersistence()
    .then(() => getRedirectResult(auth))
    .catch((error) => {
        console.error("Redirect login error:", error.code, error.message);
    });

loginBtn?.addEventListener("click", async () => {
    try {
        loginBtn.disabled = true;
        loginBtn.innerHTML = `<i class="fa-brands fa-google"></i> Membuka Google...`;
        await prepareAuthPersistence();
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

    item.innerHTML = `
        <img src="${escapeHTML(photo)}" alt="avatar">
        <span class="group-info">
            <span class="group-name">${escapeHTML(name)}</span>
            <span class="group-desc">${escapeHTML(user.email || "Private Chat")}</span>
        </span>
        <span class="group-time online-indicator" title="Tersedia">●</span>
    `;

    item.addEventListener("click", () => {
        window.openChat?.({
            kind: "private",
            uid: user.uid,
            name,
            email: user.email || "",
            photo
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
        directoryUsers
            .filter((user) => user.uid !== currentUser.uid)
            .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "id"))
            .forEach((user) => {
                if (!matchesSearch(user.name || "", user.email || "", "private chat")) return;
                userList.appendChild(createUserItem(user));
                visibleCount += 1;
            });
    }

    if (!visibleCount) {
        const empty = document.createElement("div");
        empty.className = "directory-empty";
        empty.innerHTML = `<i class="fa-regular fa-folder-open"></i><span>Tidak ada hasil.</span>`;
        userList.appendChild(empty);
    }

    userList.querySelector(`[data-chat-id="${CSS.escape(activeChatId)}"]`)?.classList.add("active");

    window.chatDirectoryUsers = directoryUsers.slice();
    window.chatDirectoryGroups = directoryGroups.slice();
    window.chatDirectoryUserCount = directoryUsers.length;
    window.dispatchEvent(new CustomEvent("chat-directory-updated"));
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

function startDirectoryListeners(user) {
    unsubscribeUsers?.();
    unsubscribeGroups?.();

    unsubscribeUsers = onSnapshot(
        collection(db, "users"),
        (snapshot) => {
            directoryUsers = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
            renderDirectory();
        },
        (error) => {
            console.error("Gagal mengambil daftar user:", error);
            directoryUsers = [{
                uid: user.uid,
                name: user.displayName || user.email?.split("@")[0] || "User",
                email: user.email || "",
                photo: user.photoURL || ""
            }];
            renderDirectory();
        }
    );

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
}

onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (!user) {
        unsubscribeUsers?.();
        unsubscribeGroups?.();
        loginPage && (loginPage.style.display = "flex");
        chatPage && (chatPage.style.display = "none");
        return;
    }

    if (!isEmailAllowed(user.email)) {
        alert("Akses ditolak: Email Anda tidak terdaftar!");
        await signOut(auth);
        loginPage && (loginPage.style.display = "flex");
        chatPage && (chatPage.style.display = "none");
        return;
    }

    try {
        await setDoc(
            doc(db, "users", user.uid),
            {
                uid: user.uid,
                name: user.displayName || user.email?.split("@")[0] || "User",
                email: user.email || "",
                photo: user.photoURL || "",
                lastLogin: new Date()
            },
            { merge: true }
        );
    } catch (error) {
        console.error("Gagal menyimpan user:", error);
        alert(`Gagal menyimpan data user: ${error.message}`);
        return;
    }

    loginPage && (loginPage.style.display = "none");
    chatPage && (chatPage.style.display = "flex");

    if (myName) myName.textContent = user.displayName || user.email?.split("@")[0] || "User";
    if (myPhoto) myPhoto.src = safeImageURL(user.photoURL, user.displayName || user.email || "User");

    startDirectoryListeners(user);
});
