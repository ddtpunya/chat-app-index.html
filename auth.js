import {
GoogleAuthProvider,
signInWithPopup,
onAuthStateChanged,
signOut
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
doc,
setDoc,
collection,
onSnapshot
}
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { auth, db } from "./firebase.js";

const ALLOWED_EMAILS=[

"anthonyan4556@gmail.com",
"muhwahyuim261@gmail.com",
"elmanjayahulu8@gmail.com"

];

const loginBtn=document.getElementById("loginBtn");

const logoutBtn=document.getElementById("logoutBtn");

const userList=document.getElementById("userList");

const myName=document.getElementById("myName");

const myPhoto=document.getElementById("myPhoto");

if(loginBtn){

loginBtn.addEventListener("click",async()=>{

try{

const provider=new GoogleAuthProvider();

await signInWithPopup(
auth,
provider
);

}
catch(e){

alert(e.message);

}

});

}

if(logoutBtn){

logoutBtn.addEventListener("click",()=>{

signOut(auth);

location.reload();

});

}

function renderUsers(me){

if(!userList)return;

onSnapshot(

collection(db,"users"),

(snapshot)=>{

userList.innerHTML="";

snapshot.forEach((d)=>{

const data=d.data();

if(data.uid===me.uid)return;

const div=document.createElement("div");

div.className="group-item";

const photo=

data.photo||

"https://ui-avatars.com/api/?name="+
encodeURIComponent(data.name);

div.innerHTML=`

<img src="${photo}">

<div class="group-info">

<div class="group-name">

${data.name}

</div>

<div class="group-desc">

Private Chat

</div>

</div>

<div class="group-time">

●

</div>

`;

div.onclick=()=>{

window.openChat(data);

};

userList.appendChild(div);

});

}

);

}

onAuthStateChanged(

auth,

async(user)=>{

if(!user){

return;

}

await setDoc(

doc(db,"users",user.uid),

{

uid:user.uid,

name:
user.displayName||
user.email.split("@")[0],

email:user.email,

photo:user.photoURL,

lastLogin:new Date()

},

{

merge:true

}

);

if(

!ALLOWED_EMAILS.includes(

user.email

)

){

alert("Akses ditolak");

signOut(auth);

return;

}

document
.getElementById("loginPage")
.style.display="none";

document
.getElementById("chatPage")
.style.display="flex";

if(myName){

myName.innerText=

user.displayName||

user.email.split("@")[0];

}

if(myPhoto){

myPhoto.src=

user.photoURL||

"https://ui-avatars.com/api/?name="+
encodeURIComponent(

user.displayName||

user.email

);

}

renderUsers(user);

}

);
