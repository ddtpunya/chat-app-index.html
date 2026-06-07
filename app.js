import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const sendBtn =
document.getElementById("sendBtn");

const input =
document.getElementById("messageInput");

sendBtn.addEventListener("click", async () => {

    const text = input.value.trim();

    if (!text) return;

    try {

        await addDoc(
            collection(db, "messages"),
            {
                text: text,
                createdAt: serverTimestamp()
            }
        );

        console.log("Pesan tersimpan");

        input.value = "";

    } catch(err) {

        console.error(err);

    }

});
