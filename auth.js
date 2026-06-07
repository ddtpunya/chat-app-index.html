import {
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { auth, db } from "./firebase.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const ALLOWED_EMAILS = [
    "anthonyan4556@gmail.com",
    "muhwahyuim261@gmail.com",
    "elmanjayahulu8@gmail.com"
];

const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.log("Login error:", error);
        alert(error.message);
    }
});

onAuthStateChanged(auth, async (user) => {

    if (!user) return;

    // 🔥 SAVE USER KE FIRESTORE (INI YANG KAMU TAMBAH)
    await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
        photo: user.photoURL,
        lastLogin: new Date()
    });

    // 🔒 CHECK ACCESS
    if (!ALLOWED_EMAILS.includes(user.email)) {

        alert("Akses ditolak");

        signOut(auth);

        return;
    }

    document.getElementById("loginPage")
        .style.display = "none";

    document.getElementById("chatPage")
        .style.display = "flex";

});
