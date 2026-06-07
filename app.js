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

const sidebar = document.getElementById("sidebar");
const openSidebar = document.getElementById("openSidebar");
const closeSidebar = document.getElementById("closeSidebar");

let currentChatId = "global";
const roomName = document.getElementById("roomName");

/* ======================
   MOBILE SIDEBAR TOGGLE
====================== */
if (openSidebar) {
  openSidebar.onclick = () => {
    sidebar.classList.add("active");
  };
}

if (closeSidebar) {
  closeSidebar.onclick = () => {
    sidebar.classList.remove("active");
  };
}

/* ======================
   AUTO SCROLL
====================== */
function scrollBottom() {
  setTimeout(() => {
    messages.scrollTop = messages.scrollHeight;
  }, 50);
}

/* ======================
   ENTER SEND MESSAGE
====================== */
if (input) {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });
}

/* ======================
   SEND MESSAGE
====================== */
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
    photo: user.photoURL || "https://ui-avatars.com/api/?name=DDT",
    chatId: currentChatId,
    createdAt: serverTimestamp()
  });

  input.value = "";
  scrollBottom();
});

/* ======================
   PRIVATE CHAT
====================== */
window.openChat = function (otherUser) {

  const me = auth.currentUser;
  if (!me) return;

  currentChatId =
    me.uid < otherUser.uid
      ? me.uid + "_" + otherUser.uid
      : otherUser.uid + "_" + me.uid;

  if (roomName) {
    roomName.innerText = otherUser.name || "Private Chat";
  }
};

/* ======================
   REALTIME MESSAGES
====================== */
const q = query(collection(db, "messages"), orderBy("createdAt"));

onSnapshot(q, (snapshot) => {

  messages.innerHTML = "";

  const me = auth.currentUser;

  snapshot.forEach((doc) => {

    const data = doc.data();

    if (data.chatId !== currentChatId && data.chatId !== "global") return;

    const isMe = me && data.uid === me.uid;

    const row = document.createElement("div");
row.className = "msg-item";

row.innerHTML = `
  <div class="avatar">
    <img src="${photo}" />
  </div>

  <div class="msg-content">

    <div class="msg-header">
      <div class="name">${data.name}</div>
      <div class="time">${formatTime(data.createdAt)}</div>
      <div class="badge">1 pesan</div>
    </div>

    <div class="msg-text">
      ${data.text}
    </div>

  </div>
`;

    messages.appendChild(row);

  });

  scrollBottom();
});
