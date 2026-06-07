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
    uid: user.uid,
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

        const div = document.createElement("div");

        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.gap = "10px";
        div.style.margin = "10px 0";

        div.innerHTML = `
            <img src="${data.photo}" 
                 style="width:35px;height:35px;border-radius:50%;">
            <div>
                <b>${data.name}</b><br>
                ${data.text}
            </div>
        `;

        messages.appendChild(div);
    });

});
