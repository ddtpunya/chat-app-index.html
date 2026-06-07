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

sendBtn.addEventListener("click", async () => {

    const text = input.value.trim();
    if (!text) return;

    const user = auth.currentUser;

    if (!user) {
        alert("Belum login");
        return;
    }

    await addDoc(collection(db, "messages"), {
        text,
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
        photo: user.photoURL,
        createdAt: serverTimestamp()
    });

    input.value = "";
});

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
            ${data.text}<br>
            <small>${time}</small>
            <hr>
        `;

        messages.appendChild(div);

    });

});
