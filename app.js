import { auth, db, storage } from "./firebase.js?v=20260711-image-upload-fallback-1";
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
    ref,
    uploadBytesResumable,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const roomName = document.getElementById("roomName");
const roomMembers = document.getElementById("roomMembers");
const scrollBottomBtn = document.getElementById("scrollBottomBtn");

const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");
const imageBtn = document.getElementById("imageBtn");
const fileBtn = document.getElementById("fileBtn");
const imageInput = document.getElementById("imageInput");
const fileInput = document.getElementById("fileInput");

const replyPreview = document.getElementById("replyPreview");
const replyPreviewName = document.getElementById("replyPreviewName");
const replyPreviewText = document.getElementById("replyPreviewText");
const cancelReplyBtn = document.getElementById("cancelReplyBtn");

const uploadStatus = document.getElementById("uploadStatus");
const uploadStatusText = document.getElementById("uploadStatusText");
const uploadProgressBar = document.getElementById("uploadProgressBar");

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const EMOJIS = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣",
    "😊", "😇", "🙂", "🙃", "😉", "😍", "🥰", "😘",
    "😋", "😎", "🤩", "🥳", "😏", "😔", "😢", "😭",
    "😡", "🤬", "😱", "🤔", "🤭", "🫡", "👍", "👎",
    "👌", "✌️", "🤞", "🙏", "👏", "💪", "❤️", "💙",
    "💚", "💛", "💜", "🔥", "✨", "🎉", "✅", "💯"
];

let currentChatId = "global";
let unsubscribeChat = null;
let activeReply = null;
let isUploading = false;

// =========================
// HELPER
// =========================
function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function safeURL(value = "") {
    try {
        const url = new URL(String(value));
        return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function safeAttachmentURL(value = "") {
    const source = String(value || "");

    // Fallback images stored directly in Firestore are restricted to raster image formats.
    if (/^data:image\/(?:jpeg|jpg|png|webp);base64,/i.test(source)) {
        return source;
    }

    return safeURL(source);
}

function avatarURL(data = {}) {
    const photo = safeURL(data.photo);
    if (photo) return photo;

    const name = encodeURIComponent(data.name || data.email || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=1f2a44&color=ffffff`;
}

function formatTime(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== "function") return "";

    return timestamp.toDate().toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).replace(".", ":");
}

function formatFileSize(bytes = 0) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = bytes / (1024 ** index);
    return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function isNearBottom() {
    if (!messages) return true;
    return messages.scrollHeight - messages.scrollTop - messages.clientHeight < 160;
}

function getDisplayName(data = {}) {
    return data.name || data.email?.split("@")[0] || "User";
}

function getMessagePreview(data = {}) {
    const text = String(data.text || "").trim();
    if (text) return text.length > 120 ? `${text.slice(0, 120)}…` : text;

    if (data.attachment?.isImage) {
        return `📷 ${data.attachment.name || "Gambar"}`;
    }

    if (data.attachment) {
        return `📎 ${data.attachment.name || "File"}`;
    }

    return "Pesan";
}

function sanitizeFileName(name = "file") {
    return String(name)
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_")
        .slice(-120) || "file";
}

function isImageFile(file) {
    if (!file) return false;

    if (String(file.type || "").toLowerCase().startsWith("image/")) {
        return true;
    }

    return /\.(?:jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(String(file.name || ""));
}

function createMessageBase(user, chatId, replyData = activeReply) {
    return {
        uid: user.uid,
        name: user.displayName || user.email?.split("@")[0] || "User",
        email: user.email || "",
        photo: user.photoURL || "",
        chatId,
        createdAt: serverTimestamp(),
        replyTo: replyData ? {
            id: replyData.id,
            uid: replyData.uid,
            name: replyData.name,
            preview: replyData.preview
        } : null
    };
}

function setComposerDisabled(disabled) {
    isUploading = disabled;
    [sendBtn, imageBtn, fileBtn].forEach((button) => {
        if (button) button.disabled = disabled;
    });
}

// =========================
// REPLY
// =========================
function setReply(messageId, data) {
    activeReply = {
        id: messageId,
        uid: data.uid || "",
        name: getDisplayName(data),
        preview: getMessagePreview(data)
    };

    if (replyPreviewName) replyPreviewName.textContent = activeReply.name;
    if (replyPreviewText) replyPreviewText.textContent = activeReply.preview;
    if (replyPreview) replyPreview.hidden = false;

    input?.focus();
}

function clearReply() {
    activeReply = null;
    if (replyPreview) replyPreview.hidden = true;
    if (replyPreviewName) replyPreviewName.textContent = "User";
    if (replyPreviewText) replyPreviewText.textContent = "";
}

cancelReplyBtn?.addEventListener("click", clearReply);

// =========================
// EMOJI PICKER
// =========================
function insertAtCursor(field, value) {
    if (!field) return;

    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? field.value.length;
    field.value = `${field.value.slice(0, start)}${value}${field.value.slice(end)}`;
    const cursor = start + value.length;
    field.setSelectionRange(cursor, cursor);
    field.focus();
}

if (emojiPicker) {
    EMOJIS.forEach((emoji) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "emoji-option";
        button.textContent = emoji;
        button.setAttribute("aria-label", `Emotikon ${emoji}`);
        button.addEventListener("click", () => {
            insertAtCursor(input, emoji);
            closeEmojiPicker();
        });
        emojiPicker.appendChild(button);
    });
}

function setEmojiPickerOpen(open) {
    if (!emojiPicker) return;

    emojiPicker.hidden = !open;
    emojiPicker.classList.toggle("is-open", open);
    emojiBtn?.setAttribute("aria-expanded", String(open));
}

function closeEmojiPicker() {
    setEmojiPickerOpen(false);
}

function toggleEmojiPicker() {
    setEmojiPickerOpen(Boolean(emojiPicker?.hidden));
}

emojiBtn?.setAttribute("aria-expanded", "false");
emojiBtn?.setAttribute("aria-controls", "emojiPicker");

emojiBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleEmojiPicker();
});

// Menutup panel saat menyentuh/klik area mana pun di luar tombol dan panel.
document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;

    const clickedButton = emojiBtn?.contains(target);
    const clickedPicker = emojiPicker?.contains(target);

    if (!clickedButton && !clickedPicker) {
        closeEmojiPicker();
    }
}, true);

// Fallback untuk browser lama yang belum konsisten mendukung pointer events.
document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;

    if (!emojiBtn?.contains(target) && !emojiPicker?.contains(target)) {
        closeEmojiPicker();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && emojiPicker && !emojiPicker.hidden) {
        event.preventDefault();
        closeEmojiPicker();
        input?.focus();
    }
});

// =========================
// ENTER = SEND
// =========================
input?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeReply) {
        clearReply();
        return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendBtn?.click();
    }
});

// =========================
// AUTO SCROLL
// =========================
function scrollToBottom() {
    if (!messages) return;
    requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight;
    });
}

scrollBottomBtn?.addEventListener("click", scrollToBottom);
messages?.addEventListener("scroll", () => {
    scrollBottomBtn?.classList.toggle("show", !isNearBottom());
});

// =========================
// SEND TEXT MESSAGE
// =========================
sendBtn?.addEventListener("click", async () => {
    if (isUploading) return;

    const text = input?.value.trim() || "";
    if (!text) return;

    const user = auth.currentUser;
    if (!user) return;

    const targetChatId = currentChatId;
    const replyData = activeReply ? { ...activeReply } : null;

    try {
        sendBtn.disabled = true;
        await addDoc(collection(db, "messages"), {
            ...createMessageBase(user, targetChatId, replyData),
            text
        });

        input.value = "";
        clearReply();
        scrollToBottom();
    } catch (error) {
        console.error("Gagal mengirim pesan:", error);
        alert("Pesan gagal dikirim. Periksa koneksi atau aturan Firestore.");
    } finally {
        sendBtn.disabled = false;
    }
});

// =========================
// IMAGE FALLBACK (FIRESTORE)
// =========================
const INLINE_IMAGE_MAX_BLOB_SIZE = 520 * 1024;
const INLINE_IMAGE_MAX_DIMENSION = 1280;

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Gagal membaca gambar."));
        reader.readAsDataURL(blob);
    });
}

function loadImageElement(file) {
    return new Promise((resolve, reject) => {
        const objectURL = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectURL);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectURL);
            reject(new Error("Format gambar tidak didukung browser."));
        };

        image.src = objectURL;
    });
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error("Gagal mengoptimalkan gambar.")),
            type,
            quality
        );
    });
}

async function compressImageForFirestore(file) {
    const image = await loadImageElement(file);
    let width = image.naturalWidth || image.width;
    let height = image.naturalHeight || image.height;

    if (!width || !height) {
        throw new Error("Ukuran gambar tidak dapat dibaca.");
    }

    const scale = Math.min(1, INLINE_IMAGE_MAX_DIMENSION / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
        throw new Error("Browser tidak mendukung pemrosesan gambar.");
    }

    let outputBlob = null;
    let quality = 0.82;

    for (let attempt = 0; attempt < 8; attempt += 1) {
        canvas.width = width;
        canvas.height = height;

        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        // WebP usually gives smaller files while keeping transparency.
        try {
            outputBlob = await canvasToBlob(canvas, "image/webp", quality);
        } catch {
            outputBlob = await canvasToBlob(canvas, "image/jpeg", quality);
        }

        if (outputBlob.size <= INLINE_IMAGE_MAX_BLOB_SIZE) break;

        quality = Math.max(0.46, quality - 0.08);

        if (quality <= 0.5) {
            width = Math.max(320, Math.round(width * 0.84));
            height = Math.max(320, Math.round(height * 0.84));
        }
    }

    if (!outputBlob || outputBlob.size > INLINE_IMAGE_MAX_BLOB_SIZE) {
        throw new Error("Gambar masih terlalu besar setelah dikompres.");
    }

    return {
        dataURL: await blobToDataURL(outputBlob),
        size: outputBlob.size,
        type: outputBlob.type || "image/webp",
        width,
        height
    };
}

function shouldUseImageFallback(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "").toLowerCase();

    return [
        "storage/quota-exceeded",
        "storage/unauthorized",
        "storage/bucket-not-found",
        "storage/project-not-found",
        "storage/unknown",
        "storage/retry-limit-exceeded"
    ].includes(code) ||
        message.includes("402") ||
        message.includes("blaze") ||
        message.includes("billing") ||
        message.includes("storage");
}

async function sendImageThroughFirestore(file, user, targetChatId, replyData) {
    updateUploadProgress(5, "Storage tidak tersedia, mengoptimalkan gambar...");

    const optimized = await compressImageForFirestore(file);
    updateUploadProgress(75, "Menyimpan gambar ke chat...");

    await addDoc(collection(db, "messages"), {
        ...createMessageBase(user, targetChatId, replyData),
        text: "",
        attachment: {
            url: optimized.dataURL,
            name: file.name || "gambar",
            type: optimized.type,
            size: optimized.size,
            isImage: true,
            inlineFirestore: true,
            width: optimized.width,
            height: optimized.height
        }
    });

    updateUploadProgress(100, "Gambar berhasil dikirim.");
}

// =========================
// UPLOAD IMAGE / FILE
// =========================
function updateUploadProgress(percent, label) {
    if (uploadStatus) uploadStatus.hidden = false;
    if (uploadStatusText) uploadStatusText.textContent = label;
    if (uploadProgressBar) uploadProgressBar.style.width = `${Math.max(0, Math.min(percent, 100))}%`;
}

function hideUploadProgress() {
    if (uploadStatus) uploadStatus.hidden = true;
    if (uploadProgressBar) uploadProgressBar.style.width = "0%";
}

async function uploadAndSend(file, imageOnly = false) {
    if (!file || isUploading) return;

    const user = auth.currentUser;
    if (!user) {
        alert("Silakan login terlebih dahulu.");
        return;
    }

    if (imageOnly && !isImageFile(file)) {
        alert("Tombol gambar hanya menerima file gambar.");
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        alert("Ukuran file maksimal 20 MB.");
        return;
    }

    const targetChatId = currentChatId;
    const replyData = activeReply ? { ...activeReply } : null;
    const safeName = sanitizeFileName(file.name);
    const storagePath = `chat-files/${targetChatId}/${user.uid}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);
    try {
        setComposerDisabled(true);
        updateUploadProgress(0, `Menyiapkan ${file.name}...`);

        const uploadTask = uploadBytesResumable(storageRef, file, {
            contentType: file.type || "application/octet-stream",
            customMetadata: {
                originalName: file.name,
                chatId: targetChatId,
                uploaderUid: user.uid
            }
        });

        await new Promise((resolve, reject) => {
            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const percent = snapshot.totalBytes
                        ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                        : 0;
                    updateUploadProgress(percent, `Mengupload ${file.name} — ${percent}%`);
                },
                reject,
                resolve
            );
        });

        const url = await getDownloadURL(uploadTask.snapshot.ref);
        const isImage = isImageFile(file);

        updateUploadProgress(100, "Menyimpan pesan...");

        await addDoc(collection(db, "messages"), {
            ...createMessageBase(user, targetChatId, replyData),
            text: "",
            attachment: {
                url,
                name: file.name,
                type: file.type || "application/octet-stream",
                size: file.size,
                isImage,
                storagePath
            }
        });

        clearReply();
        if (targetChatId === currentChatId) scrollToBottom();
    } catch (error) {
        console.error("Upload Storage gagal:", error);

        if (imageOnly && shouldUseImageFallback(error)) {
            try {
                await sendImageThroughFirestore(file, user, targetChatId, replyData);
                clearReply();
                if (targetChatId === currentChatId) scrollToBottom();
                return;
            } catch (fallbackError) {
                console.error("Fallback gambar ke Firestore gagal:", fallbackError);
                alert(
                    `Gambar gagal dikirim.\n\n` +
                    `Storage: ${error.code || error.message || "tidak tersedia"}\n` +
                    `Fallback: ${fallbackError.message || "gagal menyimpan gambar"}`
                );
                return;
            }
        }

        const code = error?.code ? ` (${error.code})` : "";
        alert(
            `Upload file gagal${code}. ` +
            `Pastikan Firebase Storage aktif, Rules sudah dipublish, dan project menggunakan paket Blaze.`
        );
    } finally {
        setComposerDisabled(false);
        window.setTimeout(hideUploadProgress, 500);
        if (imageInput) imageInput.value = "";
        if (fileInput) fileInput.value = "";
    }
}

imageBtn?.addEventListener("click", () => {
    closeEmojiPicker();
    imageInput?.click();
});
fileBtn?.addEventListener("click", () => {
    closeEmojiPicker();
    fileInput?.click();
});
imageInput?.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    imageInput.value = "";
    uploadAndSend(file, true);
});

fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    uploadAndSend(file, false);
});

input?.addEventListener("paste", (event) => {
    const pastedFiles = Array.from(event.clipboardData?.files || []);
    const image = pastedFiles.find((file) => isImageFile(file));
    if (!image) return;

    event.preventDefault();
    uploadAndSend(image, true);
});

// =========================
// MESSAGE RENDERER
// =========================
function renderReplyQuote(replyTo) {
    if (!replyTo) return "";

    return `
        <button class="message-reply-quote" type="button" data-reply-target="${escapeHTML(replyTo.id || "")}">
            <span class="reply-quote-name">${escapeHTML(replyTo.name || "User")}</span>
            <span class="reply-quote-text">${escapeHTML(replyTo.preview || "Pesan")}</span>
        </button>
    `;
}

function renderAttachment(attachment) {
    if (!attachment) return "";

    const url = safeAttachmentURL(attachment.url);
    if (!url) return `<div class="attachment-error">Attachment tidak tersedia</div>`;

    const name = escapeHTML(attachment.name || "File");
    const size = escapeHTML(formatFileSize(Number(attachment.size) || 0));

    if (attachment.isImage || String(attachment.type || "").startsWith("image/")) {
        const imageMarkup = `
            <img class="message-image" src="${escapeHTML(url)}" alt="${name}" loading="lazy">
        `;

        return `
            ${attachment.inlineFirestore
                ? `<div class="message-image-link inline-image">${imageMarkup}</div>`
                : `<a class="message-image-link" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${imageMarkup}</a>`
            }
            <div class="attachment-caption">
                <span>${name}</span>
                ${size ? `<span>${size}</span>` : ""}
            </div>
        `;
    }

    return `
        <a class="message-file" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">
            <span class="message-file-icon"><i class="fa-solid fa-file-arrow-down"></i></span>
            <span class="message-file-info">
                <strong>${name}</strong>
                <small>${escapeHTML(attachment.type || "File")}${size ? ` · ${size}` : ""}</small>
            </span>
            <i class="fa-solid fa-download message-file-download"></i>
        </a>
    `;
}

function focusOriginalMessage(messageId) {
    if (!messageId) return;
    const target = document.getElementById(`message-${messageId}`);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.remove("message-highlight");
    void target.offsetWidth;
    target.classList.add("message-highlight");
    window.setTimeout(() => target.classList.remove("message-highlight"), 1600);
}

function listenToChat(chatId) {
    if (unsubscribeChat) unsubscribeChat();

    const messagesQuery = query(
        collection(db, "messages"),
        where("chatId", "==", chatId),
        orderBy("createdAt")
    );

    unsubscribeChat = onSnapshot(messagesQuery, (snapshot) => {
        if (!messages) return;

        const shouldAutoScroll = isNearBottom();
        messages.innerHTML = "";

        snapshot.forEach((messageDoc) => {
            const data = messageDoc.data();
            const me = auth.currentUser;
            if (!me) return;

            const isMe = data.uid === me.uid;
            const name = getDisplayName(data);
            const time = formatTime(data.createdAt);
            const safeText = escapeHTML(data.text || "").replace(/\n/g, "<br>");

            const row = document.createElement("div");
            row.id = `message-${messageDoc.id}`;
            row.className = `message-row ${isMe ? "message-me" : "message-other"}`;

            row.innerHTML = `
                <img class="message-avatar" src="${escapeHTML(avatarURL(data))}" alt="avatar">

                <div class="message-content">
                    <div class="message-meta">
                        <span class="message-name">${escapeHTML(name)}</span>
                        ${time ? `<span class="message-time">${escapeHTML(time)}</span>` : ""}
                    </div>

                    ${renderReplyQuote(data.replyTo)}
                    ${safeText ? `<div class="message-text">${safeText}</div>` : ""}
                    ${renderAttachment(data.attachment)}

                    ${isMe ? `
                        <div class="message-seen">
                            <i class="fa-solid fa-check"></i>
                            terkirim
                        </div>
                    ` : ""}
                </div>

                <div class="message-actions">
                    <button class="reply-message-btn" type="button" title="Balas pesan">
                        <i class="fa-solid fa-reply"></i>
                        <span>Balas</span>
                    </button>
                </div>
            `;

            row.querySelector(".reply-message-btn")?.addEventListener("click", () => {
                setReply(messageDoc.id, data);
            });

            row.querySelector(".message-reply-quote")?.addEventListener("click", () => {
                focusOriginalMessage(data.replyTo?.id);
            });

            messages.appendChild(row);
        });

        if (shouldAutoScroll) scrollToBottom();
        scrollBottomBtn?.classList.toggle("show", !isNearBottom());
    }, (error) => {
        console.error("Gagal memuat chat:", error);
        messages.innerHTML = `
            <div class="chat-error">
                Gagal memuat pesan. Periksa Firestore Rules atau index query.
            </div>
        `;
    });
}

// =========================
// OPEN CHAT
// =========================
window.openChat = function (otherUser) {
    const me = auth.currentUser;
    if (!me) return;

    clearReply();
    closeEmojiPicker();

    if (otherUser === "global") {
        currentChatId = "global";
        if (roomName) roomName.innerText = "GANTI G";
        if (roomMembers) roomMembers.innerText = "65 anggota";
    } else {
        currentChatId = me.uid < otherUser.uid
            ? `${me.uid}_${otherUser.uid}`
            : `${otherUser.uid}_${me.uid}`;

        if (roomName) roomName.innerText = otherUser.name || "Private Chat";
        if (roomMembers) roomMembers.innerText = otherUser.email || "Private chat";
    }

    console.log("Kamar Chat Aktif:", currentChatId);
    listenToChat(currentChatId);
};

auth.onAuthStateChanged((user) => {
    if (user) window.openChat("global");
});

// ==========================================
// RESPONSIVE MOBILE
// ==========================================
const sidebar = document.querySelector(".sidebar");
const chatArea = document.querySelector(".chat");
const backBtn = document.getElementById("backToSidebarBtn");

function isMobile() {
    return window.innerWidth <= 768;
}

const originalOpenChat = window.openChat;
window.openChat = function (otherUser) {
    originalOpenChat(otherUser);

    if (isMobile() && sidebar && chatArea) {
        sidebar.style.display = "none";
        chatArea.style.display = "flex";
        if (backBtn) backBtn.style.display = "grid";
    }
};

backBtn?.addEventListener("click", () => {
    if (isMobile() && sidebar && chatArea) {
        sidebar.style.display = "flex";
        sidebar.style.width = "100%";
        chatArea.style.display = "none";
    }
});

window.addEventListener("resize", () => {
    if (!isMobile()) {
        if (sidebar) {
            sidebar.style.display = "flex";
            sidebar.style.width = "360px";
        }
        if (chatArea) chatArea.style.display = "flex";
        if (backBtn) backBtn.style.display = "none";
    } else if (sidebar && chatArea && chatArea.style.display !== "flex") {
        sidebar.style.display = "flex";
        sidebar.style.width = "100%";
        chatArea.style.display = "none";
    }
});
