import { auth, db, storage } from "./firebase.js?v=20260723-image-upload-firestore-v2";
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    onSnapshot,
    getDocs,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
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

const chatGroupAvatar = document.getElementById("chatGroupAvatar");
const toggleMessageSearchBtn = document.getElementById("toggleMessageSearchBtn");
const messageSearchWrap = document.getElementById("messageSearchWrap");
const messageSearchInput = document.getElementById("messageSearchInput");
const messageSearchStatus = document.getElementById("messageSearchStatus");
const clearMessageSearchBtn = document.getElementById("clearMessageSearchBtn");
const profileSettingsBtn = document.getElementById("profileSettingsBtn");
const chatSettingsBtn = document.getElementById("chatSettingsBtn");
const createGroupBtn = document.getElementById("createGroupBtn");
const collapseSidebarBtn = document.getElementById("collapseSidebarBtn");
const createGroupModal = document.getElementById("createGroupModal");
const createGroupForm = document.getElementById("createGroupForm");
const newGroupName = document.getElementById("newGroupName");
const groupMemberList = document.getElementById("groupMemberList");
const selectAllMembersBtn = document.getElementById("selectAllMembersBtn");
const saveGroupBtn = document.getElementById("saveGroupBtn");
const profileSettingsModal = document.getElementById("profileSettingsModal");
const profileSettingsForm = document.getElementById("profileSettingsForm");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileEmail = document.getElementById("profileEmail");
const compactMessagesToggle = document.getElementById("compactMessagesToggle");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const chatSettingsModal = document.getElementById("chatSettingsModal");
const settingsRoomName = document.getElementById("settingsRoomName");
const settingsRoomMembers = document.getElementById("settingsRoomMembers");
const settingsRoomId = document.getElementById("settingsRoomId");
const copyRoomIdBtn = document.getElementById("copyRoomIdBtn");
const clearRoomSearchBtn = document.getElementById("clearRoomSearchBtn");
const modalBackdrop = document.getElementById("modalBackdrop");
const toastContainer = document.getElementById("toastContainer");

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
let currentRoom = {
    kind: "global",
    chatId: "global",
    name: "Global Chat",
    memberLabel: "Obrolan Publik",
    photo: "https://ui-avatars.com/api/?name=Global+Chat&background=2563eb&color=ffffff",
    memberUids: []
};
let currentMessageSearch = "";
let currentOpenModal = null;

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
const INLINE_IMAGE_MAX_BLOB_SIZE = 420 * 1024;
const INLINE_IMAGE_MAX_DIMENSION = 1200;

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

    try {
        setComposerDisabled(true);

        // Gambar langsung dikompres dan disimpan ke Firestore.
        // Cara ini tidak bergantung pada Firebase Storage/Blaze.
        if (imageOnly) {
            await sendImageThroughFirestore(file, user, targetChatId, replyData);
            clearReply();
            if (targetChatId === currentChatId) scrollToBottom();
            showToast("Gambar berhasil dikirim.", "success");
            return;
        }

        // File non-gambar tetap memakai Firebase Storage.
        const safeName = sanitizeFileName(file.name);
        const storagePath = `chat-files/${targetChatId}/${user.uid}/${Date.now()}_${safeName}`;
        const storageRef = ref(storage, storagePath);

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
        updateUploadProgress(100, "Menyimpan pesan...");

        await addDoc(collection(db, "messages"), {
            ...createMessageBase(user, targetChatId, replyData),
            text: "",
            attachment: {
                url,
                name: file.name,
                type: file.type || "application/octet-stream",
                size: file.size,
                isImage: false,
                storagePath
            }
        });

        clearReply();
        if (targetChatId === currentChatId) scrollToBottom();
        showToast("File berhasil dikirim.", "success");
    } catch (error) {
        console.error(imageOnly ? "Upload gambar gagal:" : "Upload file gagal:", error);

        const code = String(error?.code || "");
        const message = String(error?.message || "");

        if (imageOnly) {
            let detail = "Periksa Firestore Rules dan koneksi internet.";

            if (code.includes("permission-denied")) {
                detail = "Firestore menolak akses. Publish file firestore.rules yang disertakan.";
            } else if (code.includes("resource-exhausted") || message.toLowerCase().includes("too large")) {
                detail = "Gambar masih terlalu besar setelah dikompres. Pilih gambar lain atau perkecil resolusinya.";
            }

            alert(`Gambar gagal dikirim.\n\n${detail}\n${code || message}`);
        } else {
            alert(
                `Upload file gagal${code ? ` (${code})` : ""}. ` +
                `Upload file non-gambar masih memerlukan Firebase Storage dan paket Blaze.`
            );
        }
    } finally {
        setComposerDisabled(false);
        window.setTimeout(hideUploadProgress, 700);
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
        where("chatId", "==", chatId)
    );

    unsubscribeChat = onSnapshot(messagesQuery, (snapshot) => {
        if (!messages) return;

        const shouldAutoScroll = isNearBottom();
        messages.innerHTML = "";

        const sortedDocs = snapshot.docs.slice().sort((a, b) => {
            const aTime = a.data().createdAt?.toMillis?.() || 0;
            const bTime = b.data().createdAt?.toMillis?.() || 0;
            return aTime - bTime;
        });

        sortedDocs.forEach((messageDoc) => {
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
            row.dataset.searchText = [
                name,
                data.text || "",
                data.attachment?.name || "",
                data.replyTo?.name || "",
                data.replyTo?.preview || ""
            ].join(" ").toLowerCase();

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

        applyMessageSearch();
        if (shouldAutoScroll && !currentMessageSearch) scrollToBottom();
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
// TOAST & MODAL HELPERS
// =========================
function showToast(message, type = "success") {
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `app-toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === "error" ? "fa-circle-exclamation" : "fa-circle-check"}"></i>
        <span>${escapeHTML(message)}</span>
    `;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));
    window.setTimeout(() => {
        toast.classList.remove("show");
        window.setTimeout(() => toast.remove(), 220);
    }, 2800);
}

function openModal(modal) {
    if (!modal) return;
    closeModal();
    currentOpenModal = modal;
    modal.hidden = false;
    modalBackdrop && (modalBackdrop.hidden = false);
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => {
        modal.classList.add("open");
        modalBackdrop?.classList.add("open");
        modal.querySelector("input:not([readonly]), button")?.focus();
    });
}

function closeModal() {
    if (!currentOpenModal) return;
    const modal = currentOpenModal;
    modal.classList.remove("open");
    modalBackdrop?.classList.remove("open");
    document.body.classList.remove("modal-open");
    currentOpenModal = null;

    window.setTimeout(() => {
        modal.hidden = true;
        if (modalBackdrop) modalBackdrop.hidden = true;
    }, 180);
}

modalBackdrop?.addEventListener("click", closeModal);
document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && currentOpenModal) {
        event.preventDefault();
        closeModal();
    }
});

// =========================
// MESSAGE SEARCH
// =========================
function applyMessageSearch() {
    const term = currentMessageSearch.trim().toLowerCase();
    const rows = Array.from(messages?.querySelectorAll(".message-row") || []);
    let found = 0;

    rows.forEach((row) => {
        const matched = !term || String(row.dataset.searchText || "").includes(term);
        row.hidden = !matched;
        row.classList.toggle("search-match", Boolean(term && matched));
        if (matched) found += 1;
    });

    if (messageSearchStatus) {
        messageSearchStatus.textContent = term ? `${found}/${rows.length}` : "";
    }
    if (clearMessageSearchBtn) clearMessageSearchBtn.hidden = !term;
}

function clearMessageSearch() {
    currentMessageSearch = "";
    if (messageSearchInput) messageSearchInput.value = "";
    applyMessageSearch();
}

messageSearchInput?.addEventListener("input", () => {
    currentMessageSearch = messageSearchInput.value;
    applyMessageSearch();
});

clearMessageSearchBtn?.addEventListener("click", () => {
    clearMessageSearch();
    messageSearchInput?.focus();
});

toggleMessageSearchBtn?.addEventListener("click", () => {
    const open = !messageSearchWrap?.classList.contains("mobile-open");
    messageSearchWrap?.classList.toggle("mobile-open", open);
    toggleMessageSearchBtn.setAttribute("aria-expanded", String(open));
    if (open) messageSearchInput?.focus();
});

// =========================
// SIDEBAR COLLAPSE
// =========================
const SIDEBAR_COLLAPSE_KEY = "chat-ddt-sidebar-collapsed";
const sidebar = document.querySelector(".sidebar");
const chatArea = document.querySelector(".chat");
const backBtn = document.getElementById("backToSidebarBtn");

function isMobile() {
    return window.innerWidth <= 768;
}

function applySidebarCollapse(collapsed) {
    const shouldCollapse = Boolean(collapsed) && !isMobile();
    document.getElementById("chatPage")?.classList.toggle("sidebar-collapsed", shouldCollapse);
    collapseSidebarBtn?.setAttribute("aria-expanded", String(!shouldCollapse));
    collapseSidebarBtn?.setAttribute("title", shouldCollapse ? "Buka sidebar" : "Ringkas sidebar");
}

const savedSidebarState = localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1";
applySidebarCollapse(savedSidebarState);

collapseSidebarBtn?.addEventListener("click", () => {
    if (isMobile()) return;
    const next = !document.getElementById("chatPage")?.classList.contains("sidebar-collapsed");
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? "1" : "0");
    applySidebarCollapse(next);
});

// =========================
// CREATE GROUP
// =========================
function renderMemberPicker(users) {
    if (!groupMemberList) return;
    groupMemberList.innerHTML = "";

    const me = auth.currentUser;
    const candidates = users.filter((user) => user.uid && user.uid !== me?.uid);

    if (!candidates.length) {
        groupMemberList.innerHTML = `
            <div class="member-picker-empty">
                <i class="fa-solid fa-user-plus"></i>
                <span>Belum ada user lain. Grup tetap dapat dibuat untuk akun Anda.</span>
            </div>
        `;
        return;
    }

    candidates
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "id"))
        .forEach((user) => {
            const name = user.name || user.email?.split("@")[0] || "User";
            const label = document.createElement("label");
            label.className = "member-option";
            label.innerHTML = `
                <input type="checkbox" name="groupMember" value="${escapeHTML(user.uid)}">
                <img src="${escapeHTML(avatarURL(user))}" alt="avatar">
                <span>
                    <strong>${escapeHTML(name)}</strong>
                    <small>${escapeHTML(user.email || "")}</small>
                </span>
                <i class="fa-solid fa-check member-check"></i>
            `;
            groupMemberList.appendChild(label);
        });
}

async function openCreateGroupDialog() {
    const me = auth.currentUser;
    if (!me) {
        showToast("Silakan login terlebih dahulu.", "error");
        return;
    }

    newGroupName && (newGroupName.value = "");
    if (groupMemberList) {
        groupMemberList.innerHTML = `<div class="member-picker-loading"><i class="fa-solid fa-spinner fa-spin"></i> Memuat user...</div>`;
    }
    openModal(createGroupModal);

    try {
        const snapshot = await getDocs(collection(db, "users"));
        const users = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        renderMemberPicker(users);
    } catch (error) {
        console.error("Gagal mengambil user untuk grup:", error);
        renderMemberPicker(window.chatDirectoryUsers || []);
        showToast("Daftar user memakai data lokal terakhir.", "error");
    }
}

createGroupBtn?.addEventListener("click", openCreateGroupDialog);

selectAllMembersBtn?.addEventListener("click", () => {
    const boxes = Array.from(groupMemberList?.querySelectorAll('input[name="groupMember"]') || []);
    if (!boxes.length) return;
    const shouldSelect = boxes.some((box) => !box.checked);
    boxes.forEach((box) => { box.checked = shouldSelect; });
    selectAllMembersBtn.textContent = shouldSelect ? "Batalkan semua" : "Pilih semua";
});

createGroupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const me = auth.currentUser;
    const name = newGroupName?.value.trim() || "";
    if (!me || !name) return;

    const selected = Array.from(groupMemberList?.querySelectorAll('input[name="groupMember"]:checked') || [])
        .map((inputElement) => inputElement.value)
        .filter(Boolean);
    const memberUids = Array.from(new Set([me.uid, ...selected]));

    try {
        saveGroupBtn && (saveGroupBtn.disabled = true);
        const groupRef = await addDoc(collection(db, "groups"), {
            name,
            nameLower: name.toLowerCase(),
            memberUids,
            createdBy: me.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        closeModal();
        showToast(`Grup “${name}” berhasil dibuat.`);
        window.openChat?.({
            kind: "group",
            id: groupRef.id,
            name,
            memberUids,
            createdBy: me.uid
        });
    } catch (error) {
        console.error("Gagal membuat grup:", error);
        showToast("Grup gagal dibuat. Periksa Firestore Rules.", "error");
    } finally {
        saveGroupBtn && (saveGroupBtn.disabled = false);
    }
});

// =========================
// PROFILE SETTINGS
// =========================
const COMPACT_MESSAGES_KEY = "chat-ddt-compact-messages";

function applyCompactMessages(enabled) {
    document.body.classList.toggle("compact-messages", Boolean(enabled));
    localStorage.setItem(COMPACT_MESSAGES_KEY, enabled ? "1" : "0");
}

applyCompactMessages(localStorage.getItem(COMPACT_MESSAGES_KEY) === "1");

profileSettingsBtn?.addEventListener("click", () => {
    const user = auth.currentUser;
    if (!user) return;
    if (profileDisplayName) profileDisplayName.value = user.displayName || user.email?.split("@")[0] || "";
    if (profileEmail) profileEmail.value = user.email || "";
    if (compactMessagesToggle) compactMessagesToggle.checked = document.body.classList.contains("compact-messages");
    openModal(profileSettingsModal);
});

profileSettingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    const name = profileDisplayName?.value.trim() || "";
    if (!user || !name) return;

    try {
        saveProfileBtn && (saveProfileBtn.disabled = true);
        await updateProfile(user, { displayName: name });
        await setDoc(doc(db, "users", user.uid), { name, updatedAt: serverTimestamp() }, { merge: true });
        applyCompactMessages(Boolean(compactMessagesToggle?.checked));

        const myName = document.getElementById("myName");
        if (myName) myName.textContent = name;

        closeModal();
        showToast("Pengaturan profil berhasil disimpan.");
    } catch (error) {
        console.error("Gagal menyimpan profil:", error);
        showToast("Profil gagal disimpan.", "error");
    } finally {
        saveProfileBtn && (saveProfileBtn.disabled = false);
    }
});

// =========================
// CHAT SETTINGS
// =========================
function refreshChatSettings() {
    if (settingsRoomName) settingsRoomName.textContent = currentRoom.name;
    if (settingsRoomMembers) settingsRoomMembers.textContent = currentRoom.memberLabel;
    if (settingsRoomId) settingsRoomId.value = currentRoom.chatId;
}

chatSettingsBtn?.addEventListener("click", () => {
    refreshChatSettings();
    openModal(chatSettingsModal);
});

copyRoomIdBtn?.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(currentRoom.chatId);
        showToast("ID ruang berhasil disalin.");
    } catch {
        settingsRoomId?.select();
        document.execCommand("copy");
        showToast("ID ruang berhasil disalin.");
    }
});

clearRoomSearchBtn?.addEventListener("click", () => {
    clearMessageSearch();
    closeModal();
    showToast("Pencarian pesan dibersihkan.");
});

// =========================
// OPEN CHAT
// =========================
function roomAvatar(name, background = "2563eb") {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${background}&color=ffffff`;
}

window.openChat = function (target) {
    const me = auth.currentUser;
    if (!me) return;

    clearReply();
    closeEmojiPicker();
    clearMessageSearch();

    if (target === "global") {
        const userCount = Number(window.chatDirectoryUserCount || 0);
        currentRoom = {
            kind: "global",
            chatId: "global",
            name: "Global Chat",
            memberLabel: userCount ? `${userCount} anggota terdaftar` : "Obrolan Publik",
            photo: roomAvatar("Global Chat"),
            memberUids: []
        };
    } else if (target?.kind === "group" || target?.id) {
        const name = target.name || "Grup Chat";
        const memberUids = Array.isArray(target.memberUids) ? target.memberUids : [];
        currentRoom = {
            kind: "group",
            chatId: `group_${target.id}`,
            id: target.id,
            name,
            memberLabel: `${Math.max(memberUids.length, 1)} anggota`,
            photo: safeURL(target.photo) || roomAvatar(name, "7c3aed"),
            memberUids,
            createdBy: target.createdBy || ""
        };
    } else {
        const otherUser = target || {};
        const name = otherUser.name || otherUser.email?.split("@")[0] || "Private Chat";
        const chatId = me.uid < otherUser.uid
            ? `${me.uid}_${otherUser.uid}`
            : `${otherUser.uid}_${me.uid}`;

        currentRoom = {
            kind: "private",
            chatId,
            name,
            memberLabel: otherUser.email || "Private chat",
            photo: avatarURL(otherUser),
            memberUids: [me.uid, otherUser.uid].filter(Boolean)
        };
    }

    currentChatId = currentRoom.chatId;
    if (roomName) roomName.textContent = currentRoom.name;
    if (roomMembers) roomMembers.textContent = currentRoom.memberLabel;
    if (chatGroupAvatar) chatGroupAvatar.src = currentRoom.photo;

    refreshChatSettings();
    window.setActiveSidebarChat?.(currentChatId);
    listenToChat(currentChatId);

    if (isMobile()) {
        document.getElementById("chatPage")?.classList.add("mobile-chat-open");
        if (backBtn) backBtn.style.display = "grid";
    }
};

auth.onAuthStateChanged((user) => {
    if (user) window.openChat("global");
});

backBtn?.addEventListener("click", () => {
    if (!isMobile()) return;
    document.getElementById("chatPage")?.classList.remove("mobile-chat-open");
    if (backBtn) backBtn.style.display = "none";
});

window.addEventListener("resize", () => {
    if (!isMobile()) {
        document.getElementById("chatPage")?.classList.remove("mobile-chat-open");
        if (backBtn) backBtn.style.display = "none";
        applySidebarCollapse(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "1");
        messageSearchWrap?.classList.remove("mobile-open");
        toggleMessageSearchBtn?.setAttribute("aria-expanded", "false");
    } else {
        applySidebarCollapse(false);
    }
});
