import { auth, db } from "./firebase.js";

import {
collection,
addDoc,
serverTimestamp,
query,
orderBy,
onSnapshot
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const sendBtn=document.getElementById("sendBtn");
const input=document.getElementById("messageInput");
const messages=document.getElementById("messages");

let currentChatId="global";

const roomName=document.getElementById("roomName");

function scrollBottom(){

setTimeout(()=>{

messages.scrollTop=messages.scrollHeight;

},50);

}

if(input){

input.addEventListener("keydown",(e)=>{

if(e.key==="Enter"&&!e.shiftKey){

e.preventDefault();

sendBtn.click();

}

});

}

sendBtn.addEventListener("click",async()=>{

const text=input.value.trim();

if(!text)return;

const user=auth.currentUser;

if(!user){

alert("Belum login");

return;

}

try{

await addDoc(
collection(db,"messages"),
{

text:text,

uid:user.uid,

name:
user.displayName||
user.email.split("@")[0],

email:user.email,

photo:
user.photoURL||
"https://ui-avatars.com/api/?name="+
(user.displayName||"DDT"),

chatId:currentChatId,

createdAt:serverTimestamp()

}
);

input.value="";

scrollBottom();

}
catch(e){

console.log(e);

}

});

window.openChat=function(otherUser){

const me=auth.currentUser;

if(!me)return;

currentChatId=

me.uid<otherUser.uid

?

me.uid+"_"+otherUser.uid

:

otherUser.uid+"_"+me.uid;

if(roomName){

roomName.innerText=
otherUser.name||"Private Chat";

}

};

const q=query(

collection(db,"messages"),

orderBy("createdAt")

);

onSnapshot(q,(snapshot)=>{

messages.innerHTML="";

const me=auth.currentUser;

snapshot.forEach((doc)=>{

const data=doc.data();

if(

data.chatId!==currentChatId&&
data.chatId!=="global"

)return;

const isMe=

me&&

data.uid===me.uid;

const row=document.createElement("div");

row.className="message";

row.style.justifyContent=

isMe

?

"flex-end"

:

"flex-start";

const photo=

data.photo||

"https://ui-avatars.com/api/?name="+
encodeURIComponent(data.name);

const bubble=document.createElement("div");

bubble.className="bubble";

bubble.style.background=

isMe

?

"#2563eb"

:

"#ffffff";

bubble.style.color=

isMe

?

"#ffffff"

:

"#111827";

bubble.innerHTML=`

<div class="sender"
style="
color:${isMe?"#ffffff":"#2563eb"};
">

${data.name}

</div>

<div>

${data.text}

</div>

`;

if(isMe){

row.innerHTML=`

${bubble.outerHTML}

<img
src="${photo}"
style="
width:40px;
height:40px;
border-radius:50%;
margin-left:10px;
"
>

`;

}else{

row.innerHTML=`

<img
src="${photo}"
style="
width:40px;
height:40px;
border-radius:50%;
margin-right:10px;
"
>

${bubble.outerHTML}

`;

}

messages.appendChild(row);

});

scrollBottom();

});
