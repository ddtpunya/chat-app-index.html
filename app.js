const sendBtn =
document.getElementById("sendBtn");

const input =
document.getElementById("messageInput");

const messages =
document.getElementById("messages");

sendBtn.addEventListener("click",()=>{

    const text = input.value.trim();

    if(!text) return;

    const div =
    document.createElement("div");

    div.textContent = text;

    messages.appendChild(div);

    input.value = "";

});
