import {
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { auth } from "./firebase.js";

const ALLOWED_EMAILS = [

    "admin@gmail.com",

    "owner@gmail.com"

];

const loginBtn =
document.getElementById("loginBtn");

loginBtn.addEventListener("click", async ()=>{

    const provider =
    new GoogleAuthProvider();

    await signInWithPopup(
        auth,
        provider
    );

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
