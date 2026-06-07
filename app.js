import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const sendBtn =
document.getElementById("sendBtn");

const input =
document.getElementById("messageInput");

const messages =
document.getElementById("messages");


// =====================
// 1. KIRIM PESAN
// =====================
import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

sendBtn.addEventListener("click", async () => {

    const text = input.value.trim();
    if (!text) return;

    await addDoc(collection(db, "messages"), {

        text: text,

        name: auth.currentUser.displayName,
        email: auth.currentUser.email,
        photo: auth.currentUser.photoURL,

        createdAt: serverTimestamp()

    });

    input.value = "";
});


// =====================
// 2. REALTIME LISTENER
// =====================
onSnapshot(q, (snapshot) => {

    messages.innerHTML = "";

    snapshot.forEach((doc) => {

        const data = doc.data();

        const div = document.createElement("div");

        div.textContent = data.text;

        messages.appendChild(div);

    });

});
