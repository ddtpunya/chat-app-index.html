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
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { auth, db } from "./firebase.js";

// =========================
// EMAIL YANG BOLEH LOGIN
// =========================
// Isi email kamu nanti di sini.
const ALLOWED_EMAILS = [
    "verensmb@gmail.com",
    "anthonyan4556@gmail.com",
    "verenlim49@gmail.com",
    "anthonywian4@gmail.com",
];

// =========================
// ELEMENT
// =========================
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userList = document.getElementById("userList");
const myName = document.getElementById("myName");
const myPhoto = document.getElementById("myPhoto");
const loginPage = document.getElementById("loginPage");
const chatPage = document.getElementById("chatPage");

// =========================
// PROVIDER GOOGLE
// =========================
const provider = new GoogleAuthProvider();

provider.setCustomParameters({
    prompt: "select_account"
});

// =========================
// CEK EMAIL WHITELIST
// =========================
function isEmailAllowed(email) {
    if (!email) return false;

    return ALLOWED_EMAILS
        .map(item => item.toLowerCase().trim())
        .includes(email.toLowerCase().trim());
}

// =========================
// SET LOGIN PERSISTENCE
// =========================
async function prepareAuthPersistence() {
    await setPersistence(auth, browserLocalPersistence);
}

// =========================
// HANDLE REDIRECT RESULT
// =========================
prepareAuthPersistence()
    .then(() => getRedirectResult(auth))
    .catch((e) => {
        console.error("Redirect login error:", e.code, e.message);
    });

// =========================
// LOGIN GOOGLE
// =========================
if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
        try {
            loginBtn.disabled = true;
            loginBtn.innerHTML = `<i class="fa-brands fa-google"></i> Membuka Google...`;

            await prepareAuthPersistence();

            await signInWithPopup(auth, provider);

        } catch (e) {
            console.error("Login Google gagal:", e.code, e.message);

            // Jangan tampilkan alert kalau user cuma menutup popup.
            if (e.code === "auth/popup-closed-by-user") {
                console.log("Popup login ditutup user.");
                return;
            }

            // Kalau popup diblokir browser, pakai redirect.
            if (
                e.code === "auth/popup-blocked" ||
                e.code === "auth/cancelled-popup-request"
            ) {
                await signInWithRedirect(auth, provider);
                return;
            }

            alert("Login gagal: " + e.message);

        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `<i class="fa-brands fa-google"></i> Login Google`;
        }
    });
}

// =========================
// LOGOUT
// =========================
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            location.reload();
        } catch (e) {
            console.error("Logout gagal:", e);
            alert("Logout gagal: " + e.message);
        }
    });
}

// =========================
// RENDER USER LIST
// =========================
function renderUsers(me) {
    if (!userList) return;

    onSnapshot(collection(db, "users"), (snapshot) => {
        userList.innerHTML = "";

        const globalDiv = document.createElement("div");
        globalDiv.className = "group-item";
        globalDiv.innerHTML = `
            <div class="icon-btn" style="display:flex;align-items:center;justify-content:center;border-radius:50%;">
                <i class="fa-solid fa-earth-americas"></i>
            </div>

            <div class="group-info">
                <div class="group-name">Global Chat</div>
                <div class="group-desc">Obrolan Publik</div>
            </div>
        `;

        globalDiv.onclick = () => {
            if (window.openChat) {
                window.openChat("global");
            }
        };

        userList.appendChild(globalDiv);

        snapshot.forEach((d) => {
            const data = d.data();
            if (!data || data.uid === me.uid) return;

            const div = document.createElement("div");
            div.className = "group-item";

            const name = data.name || "User";
            const photo =
                data.photo ||
                "https://ui-avatars.com/api/?name=" + encodeURIComponent(name);

            div.innerHTML = `
                <img src="${photo}" alt="avatar">

                <div class="group-info">
                    <div class="group-name">${name}</div>
                    <div class="group-desc">Private Chat</div>
                </div>

                <div class="group-time" style="color:#22c55e;">●</div>
            `;

            div.onclick = () => {
                if (window.openChat) {
                    window.openChat(data);
                }
            };

            userList.appendChild(div);
        });
    }, (error) => {
        console.error("Gagal mengambil daftar user:", error);
    });
}

// =========================
// AUTH STATE
// =========================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
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

    try {
        await setDoc(
            doc(db, "users", user.uid),
            {
                uid: user.uid,
                name: user.displayName || user.email.split("@")[0],
                email: user.email,
                photo: user.photoURL,
                lastLogin: new Date()
            },
            { merge: true }
        );
    } catch (e) {
        console.error("Gagal menyimpan user:", e);
        alert("Gagal menyimpan data user: " + e.message);
        return;
    }

    if (loginPage) loginPage.style.display = "none";
    if (chatPage) chatPage.style.display = "flex";

    if (myName) {
        myName.innerText = user.displayName || user.email.split("@")[0];
    }

    if (myPhoto) {
        myPhoto.src =
            user.photoURL ||
            "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.email);
    }

    renderUsers(user);
});
