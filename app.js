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
sendBtn.addEventListener("click", async () => {

    const text = input.value.trim();
    if (!text) return;

    await addDoc(collection(db, "messages"), {
        text: text,
        createdAt: serverTimestamp()
    });

    input.value = "";
});
