import { auth, db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");


// =====================
// 1. KIRIM PESAN
// =====================
sendBtn.addEventListener("click", async () => {

    console.log("KLIK KIRIM");

    const text = input.value.trim();
    console.log("TEXT:", text);

    if (!text) return;

    const user = auth.currentUser;
    console.log("USER:", user);

    if (!user) {
        alert("User belum login");
        return;
    }

    try {
        const ref = await addDoc(collection(db, "messages"), {
            text,
            name: user.displayName || user.email.split("@")[0],
            email: user.email,
            photo: user.photoURL,
            createdAt: serverTimestamp()
        });

        console.log("SUKSES SIMPAN:", ref.id);

    } catch (e) {
        console.error("ERROR FIRESTORE:", e);
    }

    input.value = "";
});


// =====================
// 2. REALTIME CHAT
// =====================
const q = query(
    collection(db, "messages"),
    orderBy("createdAt")
);

onSnapshot(q, (snapshot) => {

    messages.innerHTML = "";

    snapshot.forEach((doc) => {

        const data = doc.data();

        const time = data.createdAt
            ? new Date(data.createdAt.seconds * 1000).toLocaleString()
            : "";

        const div = document.createElement("div");

        div.innerHTML = `
            <b>${data.name || data.email}</b><br>
            ${data.text}
            <br>
            <small>${time}</small>
            <hr>
        `;

        messages.appendChild(div);

    });

});
