import {
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { auth } from "./firebase.js";

const ALLOWED_EMAILS = [

    "anthonyan4556@gmail.com",

    "muhwahyuim261@gmail.com"

];

const loginBtn =
document.getElementById("loginBtn");

loginBtn.addEventListener("click", async ()=>{

    const provider =
    new GoogleAuthProvider();

    loginBtn.addEventListener("click", async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.log("Login error:", error);
        alert(error.message);
    }
});

});

onAuthStateChanged(auth,(user)=>{

    if(!user) return;

    if(!ALLOWED_EMAILS.includes(user.email)){

        alert("Akses ditolak");

        signOut(auth);

        return;
    }

    document.getElementById("loginPage")
        .style.display = "none";

    document.getElementById("chatPage")
        .style.display = "flex";

});
