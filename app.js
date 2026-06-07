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
const userList = document.getElementById("userList");


input.addEventListener("keydown", (e) => {

    if (e.key === "Enter") {
        e.preventDefault();
        sendBtn.click();
    }

});
// =========================
// CURRENT CHAT STATE
// =========================
let currentChatId = "global";

// =========================
// SEND MESSAGE
// =========================
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
        chatId: currentChatId,
        createdAt: serverTimestamp()
    });

    input.value = "";
});

// =========================
// OPEN CHAT FUNCTION
// =========================
window.openChat = function (otherUser) {

    const me = auth.currentUser;

    if (!me) return;

    currentChatId =
        me.uid < otherUser.uid
        ? me.uid + "_" + otherUser.uid
        : otherUser.uid + "_" + me.uid;

    console.log("OPEN CHAT:", currentChatId);
};

// =========================
// REALTIME CHAT
// =========================
const q = query(
    collection(db, "messages"),
    orderBy("createdAt")
);

onSnapshot(q, (snapshot) => {

    messages.innerHTML = "";

    snapshot.forEach((doc) => {

        const data = doc.data();

        if (data.chatId !== currentChatId && data.chatId !== "global") return;

        const isMe = auth.currentUser && data.uid === auth.currentUser.uid;

        const div = document.createElement("div");

        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.gap = "10px";
        div.style.margin = "10px 0";
        div.style.justifyContent = isMe ? "flex-end" : "flex-start";

        div.innerHTML = `
            ${!isMe ? `<img src="${data.photo}" style="width:35px;height:35px;border-radius:50%;">` : ""}
            <div style="
                background:${isMe ? "#DCF8C6" : "#f1f1f1"};
                padding:8px 12px;
                border-radius:10px;
                max-width:60%;
            ">
                <b>${data.name}</b><br>
                ${data.text}
            </div>
            ${isMe ? `<img src="${data.photo}" style="width:35px;height:35px;border-radius:50%;">` : ""}
        `;

        messages.appendChild(div);
    });

});
