import { auth, db, storage } from "./firebase.js?v=20260723-friends-only-private-v9";
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    onSnapshot,
    getDocs,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    arrayUnion
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
const friendsBtn = document.getElementById("friendsBtn");
const friendRequestBadge = document.getElementById("friendRequestBadge");
const friendsModal = document.getElementById("friendsModal");
const friendSearchInput = document.getElementById("friendSearchInput");
const friendSummary = document.getElementById("friendSummary");
const friendManagementList = document.getElementById("friendManagementList");
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
const imagePreviewModal = document.getElementById("imagePreviewModal");
const imagePreviewFull = document.getElementById("imagePreviewFull");
const imagePreviewMeta = document.getElementById("imagePreviewMeta");
const imagePreviewStage = document.getElementById("imagePreviewStage");
const imagePreviewPanArea = document.getElementById("imagePreviewPanArea");
const imagePreviewCanvas = document.getElementById("imagePreviewCanvas");
const imagePreviewPrevBtn = document.getElementById("imagePreviewPrevBtn");
const imagePreviewNextBtn = document.getElementById("imagePreviewNextBtn");
const imagePreviewZoomOutBtn = document.getElementById("imagePreviewZoomOutBtn");
const imagePreviewZoomInBtn = document.getElementById("imagePreviewZoomInBtn");
const imagePreviewResetBtn = document.getElementById("imagePreviewResetBtn");
const imagePreviewScaleLabel = document.getElementById("imagePreviewScaleLabel");
const imagePreviewCounter = document.getElementById("imagePreviewCounter");

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
let uploadHideTimer = null;
let latestMessageDocs = [];
let readReceiptBatchBusy = false;

let previewGallery = [];
let previewIndex = -1;
let previewScale = 1;
let previewBaseWidth = 1;
let previewBaseHeight = 1;
let previewSwipeStartX = null;
let previewSwipeStartY = null;
let previewSwipePointerId = null;

const PREVIEW_SCALE_MIN = 0.5;
const PREVIEW_SCALE_MAX = 4;
const PREVIEW_SCALE_STEP = 0.25;
const ONLINE_FRESHNESS_MS = 4 * 60 * 1000;

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


function timestampToDate(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    if (value instanceof Date) return value;

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPresenceDate(user = {}) {
    return timestampToDate(user.presenceUpdatedAt)
        || timestampToDate(user.lastSeen)
        || timestampToDate(user.lastLogin);
}

function isUserOnline(user = {}) {
    if (user.presenceState !== "online") return false;
    const date = getPresenceDate(user);
    return Boolean(date && (Date.now() - date.getTime()) <= ONLINE_FRESHNESS_MS);
}

function formatPresenceLabel(user = {}) {
    if (isUserOnline(user)) return "Online";

    const date = getPresenceDate(user);
    if (!date) return "Offline";

    const diffMs = Math.max(0, Date.now() - date.getTime());
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < minute) return "Terakhir dilihat baru saja";
    if (diffMs < hour) return `Terakhir dilihat ${Math.floor(diffMs / minute)} menit lalu`;

    const time = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
    if (diffMs < day && date.getDate() === new Date().getDate()) {
        return `Terakhir dilihat hari ini ${time}`;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return `Terakhir dilihat kemarin ${time}`;
    }

    const dateText = date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    return `Terakhir dilihat ${dateText}, ${time}`;
}

function setRoomMemberLabel(label, online = null) {
    currentRoom.memberLabel = label;
    if (!roomMembers) return;

    roomMembers.textContent = label;
    roomMembers.classList.toggle("presence-online", online === true);
    roomMembers.classList.toggle("presence-offline", online === false);
}

function updatePrivateRoomPresence() {
    if (currentRoom.kind !== "private" || !currentRoom.otherUserUid) return;

    const users = Array.isArray(window.chatDirectoryUsers) ? window.chatDirectoryUsers : [];
    const user = users.find((item) => item.uid === currentRoom.otherUserUid);
    if (!user) return;

    currentRoom.presenceState = user.presenceState || "offline";
    currentRoom.presenceUpdatedAt = user.presenceUpdatedAt || null;
    currentRoom.lastSeen = user.lastSeen || null;
    currentRoom.lastLogin = user.lastLogin || null;

    setRoomMemberLabel(formatPresenceLabel(user), isUserOnline(user));
    refreshChatSettings();
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
        roomKind: currentRoom.kind || "global",
        ...(currentRoom.kind === "group" && currentRoom.id ? { groupId: currentRoom.id } : {}),
        createdAt: serverTimestamp(),
        readBy: [user.uid],
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
function setReplyPreviewVisible(visible) {
    if (!replyPreview) return;

    replyPreview.hidden = !visible;
    replyPreview.setAttribute("aria-hidden", String(!visible));

    // Inline fallback untuk browser/cache CSS lama.
    if (visible) {
        replyPreview.style.removeProperty("display");
    } else {
        replyPreview.style.setProperty("display", "none", "important");
    }
}

function setReply(messageId, data = {}) {
    if (!messageId) return;

    activeReply = {
        id: messageId,
        uid: data.uid || "",
        name: getDisplayName(data),
        preview: getMessagePreview(data)
    };

    if (replyPreviewName) replyPreviewName.textContent = activeReply.name;
    if (replyPreviewText) replyPreviewText.textContent = activeReply.preview;
    setReplyPreviewVisible(true);

    input?.focus();
}

function clearReply(options = {}) {
    activeReply = null;
    if (replyPreviewName) replyPreviewName.textContent = "User";
    if (replyPreviewText) replyPreviewText.textContent = "";
    setReplyPreviewVisible(false);

    if (options.focusInput) input?.focus();
}

cancelReplyBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearReply({ focusInput: true });
});

// Keadaan awal harus benar-benar tersembunyi, termasuk saat CSS lama masih tercache.
clearReply();

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
function setUploadStatusVisible(visible) {
    if (!uploadStatus) return;

    uploadStatus.hidden = !visible;
    uploadStatus.setAttribute("aria-hidden", String(!visible));

    // Inline fallback agar status tetap dapat hilang walau CSS lama masih tercache.
    if (visible) {
        uploadStatus.style.removeProperty("display");
    } else {
        uploadStatus.style.setProperty("display", "none", "important");
    }
}

function updateUploadProgress(percent, label) {
    if (uploadHideTimer) {
        window.clearTimeout(uploadHideTimer);
        uploadHideTimer = null;
    }

    setUploadStatusVisible(true);
    if (uploadStatusText) uploadStatusText.textContent = label;
    if (uploadProgressBar) uploadProgressBar.style.width = `${Math.max(0, Math.min(percent, 100))}%`;
}

function hideUploadProgress() {
    setUploadStatusVisible(false);
    if (uploadStatusText) uploadStatusText.textContent = "Mengupload...";
    if (uploadProgressBar) uploadProgressBar.style.width = "0%";
    uploadHideTimer = null;
}

function scheduleHideUploadProgress(delay = 900) {
    if (uploadHideTimer) window.clearTimeout(uploadHideTimer);
    uploadHideTimer = window.setTimeout(hideUploadProgress, delay);
}

// Keadaan awal harus tersembunyi.
hideUploadProgress();

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
        scheduleHideUploadProgress(imageOnly ? 1100 : 900);
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
        return `
            <button
                class="message-image-link image-preview-trigger ${attachment.inlineFirestore ? "inline-image" : ""}"
                type="button"
                data-preview-url="${escapeHTML(url)}"
                data-preview-name="${name}"
                data-preview-size="${size}"
                title="Klik untuk preview gambar"
            >
                <img class="message-image" src="${escapeHTML(url)}" alt="${name}" loading="lazy">
                <span class="image-preview-hint">Klik untuk perbesar</span>
            </button>
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

function collectPreviewGallery() {
    return Array.from(messages?.querySelectorAll(".image-preview-trigger") || [])
        .map((button) => ({
            button,
            url: button.dataset.previewUrl || "",
            name: button.dataset.previewName || "Gambar",
            size: button.dataset.previewSize || ""
        }))
        .filter((item) => Boolean(item.url));
}

function clampPreviewScale(value) {
    return Math.min(PREVIEW_SCALE_MAX, Math.max(PREVIEW_SCALE_MIN, value));
}

function centerPreviewStage() {
    if (!imagePreviewStage) return;

    requestAnimationFrame(() => {
        imagePreviewStage.scrollTo({
            left: Math.max(0, (imagePreviewStage.scrollWidth - imagePreviewStage.clientWidth) / 2),
            top: Math.max(0, (imagePreviewStage.scrollHeight - imagePreviewStage.clientHeight) / 2),
            behavior: "auto"
        });
    });
}

function applyPreviewScale({ center = true } = {}) {
    if (!imagePreviewStage || !imagePreviewPanArea || !imagePreviewCanvas || !imagePreviewFull) return;

    previewScale = clampPreviewScale(previewScale);
    const width = Math.max(1, Math.round(previewBaseWidth * previewScale));
    const height = Math.max(1, Math.round(previewBaseHeight * previewScale));
    const padding = 32;

    imagePreviewCanvas.style.width = `${width}px`;
    imagePreviewCanvas.style.height = `${height}px`;
    imagePreviewPanArea.style.width = `${Math.max(imagePreviewStage.clientWidth, width + padding)}px`;
    imagePreviewPanArea.style.height = `${Math.max(imagePreviewStage.clientHeight, height + padding)}px`;

    if (imagePreviewScaleLabel) {
        imagePreviewScaleLabel.textContent = `${Math.round(previewScale * 100)}%`;
    }
    if (imagePreviewZoomOutBtn) {
        imagePreviewZoomOutBtn.disabled = previewScale <= PREVIEW_SCALE_MIN + 0.001;
    }
    if (imagePreviewZoomInBtn) {
        imagePreviewZoomInBtn.disabled = previewScale >= PREVIEW_SCALE_MAX - 0.001;
    }

    if (center) centerPreviewStage();
}

function fitPreviewImage() {
    if (!imagePreviewStage || !imagePreviewFull) return;

    const naturalWidth = imagePreviewFull.naturalWidth || 1;
    const naturalHeight = imagePreviewFull.naturalHeight || 1;
    const availableWidth = Math.max(240, imagePreviewStage.clientWidth - 36);
    const availableHeight = Math.max(220, imagePreviewStage.clientHeight - 36);
    const fitRatio = Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight);

    previewBaseWidth = Math.max(1, Math.round(naturalWidth * fitRatio));
    previewBaseHeight = Math.max(1, Math.round(naturalHeight * fitRatio));
    previewScale = 1;
    applyPreviewScale();
}

function setPreviewScale(nextScale, options = {}) {
    previewScale = clampPreviewScale(nextScale);
    applyPreviewScale(options);
}

function updatePreviewNavigation() {
    const total = previewGallery.length;
    const multiple = total > 1;

    if (imagePreviewCounter) {
        imagePreviewCounter.textContent = total ? `${previewIndex + 1} / ${total}` : "0 / 0";
    }
    if (imagePreviewPrevBtn) imagePreviewPrevBtn.disabled = !multiple;
    if (imagePreviewNextBtn) imagePreviewNextBtn.disabled = !multiple;
}

function showPreviewImage(index) {
    if (!imagePreviewFull || !previewGallery.length) return;

    previewIndex = (index + previewGallery.length) % previewGallery.length;
    const item = previewGallery[previewIndex];

    previewScale = 1;
    previewBaseWidth = 1;
    previewBaseHeight = 1;
    imagePreviewFull.alt = item.name || "Preview gambar";
    imagePreviewFull.onload = fitPreviewImage;
    imagePreviewFull.src = item.url;

    if (imagePreviewMeta) {
        imagePreviewMeta.textContent = [item.name, item.size].filter(Boolean).join(" · ") || "Klik di luar untuk menutup.";
    }

    updatePreviewNavigation();
}

function openImagePreview(url = "", name = "Gambar", size = "", triggerButton = null) {
    if (!imagePreviewModal || !imagePreviewFull) return;

    previewGallery = collectPreviewGallery();
    previewIndex = previewGallery.findIndex((item) => item.button === triggerButton);

    if (previewIndex < 0) {
        previewIndex = previewGallery.findIndex((item) => item.url === url && item.name === name);
    }

    if (previewIndex < 0) {
        previewGallery.push({ button: triggerButton, url, name, size });
        previewIndex = previewGallery.length - 1;
    }

    openModal(imagePreviewModal);
    showPreviewImage(previewIndex);
}

function showPreviousPreviewImage() {
    if (previewGallery.length > 1) showPreviewImage(previewIndex - 1);
}

function showNextPreviewImage() {
    if (previewGallery.length > 1) showPreviewImage(previewIndex + 1);
}

function clearImagePreview() {
    if (imagePreviewFull) {
        imagePreviewFull.onload = null;
        imagePreviewFull.src = "";
        imagePreviewFull.alt = "Preview gambar";
    }
    if (imagePreviewMeta) {
        imagePreviewMeta.textContent = "Klik di luar untuk menutup.";
    }
    if (imagePreviewCanvas) {
        imagePreviewCanvas.style.width = "1px";
        imagePreviewCanvas.style.height = "1px";
    }
    if (imagePreviewPanArea) {
        imagePreviewPanArea.style.width = "100%";
        imagePreviewPanArea.style.height = "100%";
    }

    previewGallery = [];
    previewIndex = -1;
    previewScale = 1;
    previewBaseWidth = 1;
    previewBaseHeight = 1;
    updatePreviewNavigation();
    if (imagePreviewScaleLabel) imagePreviewScaleLabel.textContent = "100%";
}

imagePreviewPrevBtn?.addEventListener("click", showPreviousPreviewImage);
imagePreviewNextBtn?.addEventListener("click", showNextPreviewImage);
imagePreviewZoomOutBtn?.addEventListener("click", () => setPreviewScale(previewScale - PREVIEW_SCALE_STEP));
imagePreviewZoomInBtn?.addEventListener("click", () => setPreviewScale(previewScale + PREVIEW_SCALE_STEP));
imagePreviewResetBtn?.addEventListener("click", () => setPreviewScale(1));

imagePreviewFull?.addEventListener("dblclick", () => {
    setPreviewScale(previewScale > 1 ? 1 : 2);
});

imagePreviewStage?.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || previewScale > 1.05) return;
    previewSwipePointerId = event.pointerId;
    previewSwipeStartX = event.clientX;
    previewSwipeStartY = event.clientY;
});

imagePreviewStage?.addEventListener("pointerup", (event) => {
    if (event.pointerId !== previewSwipePointerId || previewSwipeStartX === null || previewSwipeStartY === null) return;

    const deltaX = event.clientX - previewSwipeStartX;
    const deltaY = event.clientY - previewSwipeStartY;
    previewSwipeStartX = null;
    previewSwipeStartY = null;
    previewSwipePointerId = null;

    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
    if (deltaX < 0) showNextPreviewImage();
    else showPreviousPreviewImage();
});

imagePreviewStage?.addEventListener("pointercancel", () => {
    previewSwipeStartX = null;
    previewSwipeStartY = null;
    previewSwipePointerId = null;
});

window.addEventListener("resize", () => {
    if (currentOpenModal === imagePreviewModal && imagePreviewFull?.complete && imagePreviewFull.naturalWidth) {
        fitPreviewImage();
    }
});

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

function getReadBy(data = {}) {
    const readers = Array.isArray(data.readBy) ? data.readBy.filter(Boolean) : [];
    if (data.uid && !readers.includes(data.uid)) readers.push(data.uid);
    return readers;
}

function renderDeliveryStatus(data = {}, hasPendingWrites = false) {
    if (hasPendingWrites) {
        return `
            <div class="message-seen is-pending">
                <i class="fa-regular fa-clock"></i>
                mengirim...
            </div>
        `;
    }

    const readers = getReadBy(data).filter((uid) => uid !== data.uid);
    let readCount = readers.length;

    if (currentRoom.kind === "private" && currentRoom.otherUserUid) {
        readCount = readers.includes(currentRoom.otherUserUid) ? 1 : 0;
    }

    if (readCount > 0) {
        const label = currentRoom.kind === "private" ? "dibaca" : `dibaca ${readCount}`;
        return `
            <div class="message-seen is-read">
                <i class="fa-solid fa-check-double"></i>
                ${label}
            </div>
        `;
    }

    return `
        <div class="message-seen is-sent">
            <i class="fa-solid fa-check"></i>
            terkirim
        </div>
    `;
}

function isChatVisibleForReadReceipt() {
    if (document.visibilityState !== "visible") return false;
    if (!isMobile()) return true;
    return Boolean(document.getElementById("chatPage")?.classList.contains("mobile-chat-open"));
}

async function markMessagesAsRead(messageDocs = latestMessageDocs) {
    const me = auth.currentUser;
    if (!me || readReceiptBatchBusy || !isChatVisibleForReadReceipt()) return;

    const unread = messageDocs.filter((messageDoc) => {
        const data = messageDoc.data();
        return data.uid !== me.uid && !getReadBy(data).includes(me.uid);
    }).slice(0, 450);

    if (!unread.length) return;

    readReceiptBatchBusy = true;
    try {
        const batch = writeBatch(db);
        unread.forEach((messageDoc) => {
            batch.update(doc(db, "messages", messageDoc.id), {
                readBy: arrayUnion(me.uid)
            });
        });
        await batch.commit();
    } catch (error) {
        console.warn("Gagal memperbarui status dibaca:", error);
    } finally {
        readReceiptBatchBusy = false;
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        void markMessagesAsRead();
        updatePrivateRoomPresence();
    }
});

window.addEventListener("chat-directory-updated", updatePrivateRoomPresence);

function listenToChat(chatId) {
    if (unsubscribeChat) unsubscribeChat();

    const messagesQuery = query(
        collection(db, "messages"),
        where("chatId", "==", chatId)
    );

    unsubscribeChat = onSnapshot(messagesQuery, { includeMetadataChanges: true }, (snapshot) => {
        if (!messages) return;

        const shouldAutoScroll = isNearBottom();
        messages.innerHTML = "";

        const sortedDocs = snapshot.docs.slice().sort((a, b) => {
            const aTime = a.data().createdAt?.toMillis?.() || 0;
            const bTime = b.data().createdAt?.toMillis?.() || 0;
            return aTime - bTime;
        });

        latestMessageDocs = sortedDocs;

        sortedDocs.forEach((messageDoc) => {
            const data = messageDoc.data();
            const me = auth.currentUser;
            if (!me) return;

            const isMe = data.uid === me.uid;
            const name = getDisplayName(data);
            const time = formatTime(data.createdAt);
            const safeText = escapeHTML(data.text || "").replace(/\n/g, "<br>");
            const hasPendingWrites = Boolean(messageDoc.metadata?.hasPendingWrites);

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

                    ${isMe ? renderDeliveryStatus(data, hasPendingWrites) : ""}
                </div>

                <div class="message-actions">
                    <button class="reply-message-btn" type="button" title="Balas pesan">
                        <i class="fa-solid fa-reply"></i>
                        <span>Balas</span>
                    </button>
                </div>
            `;

            row.querySelector(".reply-message-btn")?.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                setReply(messageDoc.id, data);
            });

            row.querySelector(".message-reply-quote")?.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                focusOriginalMessage(data.replyTo?.id);
            });

            row.querySelector(".image-preview-trigger")?.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                const button = event.currentTarget;
                openImagePreview(
                    button?.dataset.previewUrl || "",
                    button?.dataset.previewName || "Gambar",
                    button?.dataset.previewSize || "",
                    button
                );
            });

            messages.appendChild(row);
        });

        applyMessageSearch();
        void markMessagesAsRead(sortedDocs);
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

    if (modal === imagePreviewModal) {
        window.setTimeout(clearImagePreview, 180);
    }

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
    if (!currentOpenModal) return;

    if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
    }

    if (currentOpenModal !== imagePreviewModal) return;

    if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPreviousPreviewImage();
    } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextPreviewImage();
    } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setPreviewScale(previewScale + PREVIEW_SCALE_STEP);
    } else if (event.key === "-") {
        event.preventDefault();
        setPreviewScale(previewScale - PREVIEW_SCALE_STEP);
    } else if (event.key === "0") {
        event.preventDefault();
        setPreviewScale(1);
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
// FRIENDS / PRIVATE CHAT ACCESS
// =========================
function directChatId(uidA = "", uidB = "") {
    return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
}

function getFriendshipForUid(otherUid) {
    const me = auth.currentUser;
    if (!me || !otherUid) return null;
    const relationshipId = directChatId(me.uid, otherUid);
    return (window.chatDirectoryFriendships || []).find((item) => item.id === relationshipId) || null;
}

function getFriendRelation(otherUid) {
    const me = auth.currentUser;
    const friendship = getFriendshipForUid(otherUid);
    if (!me || !friendship) return { state: "none", friendship: null };

    if (friendship.status === "accepted") {
        return { state: "accepted", friendship };
    }

    if (friendship.status === "pending" && friendship.requesterUid === me.uid) {
        return { state: "outgoing", friendship };
    }

    if (friendship.status === "pending" && friendship.addresseeUid === me.uid) {
        return { state: "incoming", friendship };
    }

    return { state: "none", friendship };
}

function updateFriendRequestBadge() {
    const me = auth.currentUser;
    if (!friendRequestBadge || !me) return;

    const total = (window.chatDirectoryFriendships || []).filter((item) => (
        item.status === "pending" && item.addresseeUid === me.uid
    )).length;

    friendRequestBadge.textContent = String(total);
    friendRequestBadge.hidden = total === 0;
    friendsBtn?.classList.toggle("has-request", total > 0);
}

function friendStatusMarkup(state) {
    if (state === "incoming") return `<span class="friend-state incoming">Permintaan masuk</span>`;
    if (state === "outgoing") return `<span class="friend-state outgoing">Menunggu diterima</span>`;
    if (state === "accepted") return `<span class="friend-state accepted"><i class="fa-solid fa-check"></i> Teman</span>`;
    return `<span class="friend-state none">Belum berteman</span>`;
}

function friendActionMarkup(state, uid) {
    const safeUid = escapeHTML(uid);

    if (state === "incoming") {
        return `
            <button class="friend-action-btn accept" type="button" data-friend-action="accept" data-user-uid="${safeUid}">Terima</button>
            <button class="friend-action-btn reject" type="button" data-friend-action="reject" data-user-uid="${safeUid}">Tolak</button>
        `;
    }

    if (state === "outgoing") {
        return `<button class="friend-action-btn neutral" type="button" data-friend-action="cancel" data-user-uid="${safeUid}">Batalkan</button>`;
    }

    if (state === "accepted") {
        return `<button class="friend-action-btn danger" type="button" data-friend-action="remove" data-user-uid="${safeUid}">Hapus</button>`;
    }

    return `<button class="friend-action-btn add" type="button" data-friend-action="add" data-user-uid="${safeUid}"><i class="fa-solid fa-user-plus"></i> Tambah</button>`;
}

function renderFriendManager() {
    if (!friendManagementList) return;

    const me = auth.currentUser;
    const users = Array.isArray(window.chatDirectoryUsers) ? window.chatDirectoryUsers : [];
    const search = friendSearchInput?.value.trim().toLowerCase() || "";

    if (!me) {
        friendManagementList.innerHTML = `<div class="friend-manager-empty">Silakan login terlebih dahulu.</div>`;
        return;
    }

    const rows = users
        .filter((user) => user.uid && user.uid !== me.uid)
        .map((user) => {
            const relation = getFriendRelation(user.uid);
            return { user, relation };
        })
        .filter(({ user }) => {
            if (!search) return true;
            const name = String(user.name || user.email?.split("@")[0] || "User").toLowerCase();
            return name.includes(search);
        })
        .sort((a, b) => {
            const rank = { incoming: 0, accepted: 1, outgoing: 2, none: 3 };
            const stateDiff = rank[a.relation.state] - rank[b.relation.state];
            if (stateDiff) return stateDiff;
            return String(a.user.name || "").localeCompare(String(b.user.name || ""), "id");
        });

    const relationships = window.chatDirectoryFriendships || [];
    const incoming = relationships.filter((item) => item.status === "pending" && item.addresseeUid === me.uid).length;
    const accepted = relationships.filter((item) => item.status === "accepted").length;
    if (friendSummary) {
        friendSummary.textContent = `${accepted} teman · ${incoming} permintaan masuk`;
    }

    if (!rows.length) {
        friendManagementList.innerHTML = `
            <div class="friend-manager-empty">
                <i class="fa-regular fa-user"></i>
                <span>Tidak ada user yang cocok.</span>
            </div>
        `;
        return;
    }

    friendManagementList.innerHTML = rows.map(({ user, relation }) => {
        const name = user.name || user.email?.split("@")[0] || "User";
        return `
            <div class="friend-manager-row" data-friend-user="${escapeHTML(user.uid)}">
                <img src="${escapeHTML(avatarURL(user))}" alt="avatar">
                <div class="friend-manager-copy">
                    <strong>${escapeHTML(name)}</strong>
                    ${friendStatusMarkup(relation.state)}
                </div>
                <div class="friend-manager-actions">
                    ${friendActionMarkup(relation.state, user.uid)}
                </div>
            </div>
        `;
    }).join("");
}

async function performFriendAction(action, otherUid, button) {
    const me = auth.currentUser;
    if (!me || !otherUid || otherUid === me.uid) return;

    const relationshipId = directChatId(me.uid, otherUid);
    const relationshipRef = doc(db, "friendships", relationshipId);
    const user = (window.chatDirectoryUsers || []).find((item) => item.uid === otherUid) || {};
    const name = user.name || user.email?.split("@")[0] || "User";

    try {
        if (button) button.disabled = true;

        if (action === "add") {
            const userUids = [me.uid, otherUid].sort();
            await setDoc(relationshipRef, {
                userUids,
                requesterUid: me.uid,
                addresseeUid: otherUid,
                status: "pending",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            showToast(`Permintaan pertemanan dikirim ke ${name}.`);
        } else if (action === "accept") {
            await updateDoc(relationshipRef, {
                status: "accepted",
                acceptedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            showToast(`Sekarang Anda berteman dengan ${name}.`);
        } else if (action === "reject") {
            await deleteDoc(relationshipRef);
            showToast(`Permintaan dari ${name} ditolak.`);
        } else if (action === "cancel") {
            await deleteDoc(relationshipRef);
            showToast(`Permintaan ke ${name} dibatalkan.`);
        } else if (action === "remove") {
            await deleteDoc(relationshipRef);
            if (currentRoom.kind === "private" && currentRoom.otherUserUid === otherUid) {
                window.openChat?.("global");
            }
            showToast(`${name} dihapus dari daftar teman.`);
        }
    } catch (error) {
        console.error("Aksi pertemanan gagal:", error);
        showToast("Aksi pertemanan gagal. Publish Firestore Rules v9.", "error");
    } finally {
        if (button) button.disabled = false;
    }
}

friendsBtn?.addEventListener("click", () => {
    if (friendSearchInput) friendSearchInput.value = "";
    renderFriendManager();
    openModal(friendsModal);
});

friendSearchInput?.addEventListener("input", renderFriendManager);

friendManagementList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-friend-action]");
    if (!button) return;
    event.preventDefault();
    void performFriendAction(button.dataset.friendAction || "", button.dataset.userUid || "", button);
});

window.addEventListener("chat-directory-updated", () => {
    updateFriendRequestBadge();
    if (currentOpenModal === friendsModal) renderFriendManager();
});

window.addEventListener("chat-friendships-updated", () => {
    updateFriendRequestBadge();
    if (currentOpenModal === friendsModal) renderFriendManager();

    if (
        currentRoom.kind === "private" &&
        currentRoom.otherUserUid &&
        !window.chatFriendUidSet?.has(currentRoom.otherUserUid)
    ) {
        window.openChat?.("global");
        showToast("Private chat ditutup karena hubungan pertemanan sudah tidak aktif.", "error");
    }
});

// =========================
// CREATE GROUP
// =========================
function renderMemberPicker(users) {
    if (!groupMemberList) return;
    groupMemberList.innerHTML = "";

    const me = auth.currentUser;
    const friendUids = window.chatFriendUidSet instanceof Set ? window.chatFriendUidSet : new Set();
    const candidates = users.filter((user) => user.uid && user.uid !== me?.uid && friendUids.has(user.uid));

    if (!candidates.length) {
        groupMemberList.innerHTML = `
            <div class="member-picker-empty">
                <i class="fa-solid fa-user-plus"></i>
                <span>Belum ada teman. Terima pertemanan terlebih dahulu untuk menambahkan anggota grup.</span>
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
                    <small>Teman</small>
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
            memberUids: [],
            otherUserUid: null
        };
    } else if (target?.kind === "group") {
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
            createdBy: target.createdBy || "",
            otherUserUid: null
        };
    } else {
        const otherUser = target || {};
        const otherUid = otherUser.uid || "";

        if (!otherUid || !window.chatFriendUidSet?.has(otherUid)) {
            showToast("Private chat hanya dapat dibuka dengan user yang sudah berteman.", "error");
            return;
        }

        const name = otherUser.name || otherUser.email?.split("@")[0] || "Private Chat";
        const chatId = directChatId(me.uid, otherUid);

        currentRoom = {
            kind: "private",
            chatId,
            name,
            memberLabel: formatPresenceLabel(otherUser),
            photo: avatarURL(otherUser),
            memberUids: [me.uid, otherUid].filter(Boolean),
            otherUserUid: otherUid,
            presenceState: otherUser.presenceState || "offline",
            presenceUpdatedAt: otherUser.presenceUpdatedAt || null,
            lastSeen: otherUser.lastSeen || null,
            lastLogin: otherUser.lastLogin || null
        };
    }

    currentChatId = currentRoom.chatId;
    latestMessageDocs = [];
    if (roomName) roomName.textContent = currentRoom.name;
    if (currentRoom.kind === "private") {
        setRoomMemberLabel(currentRoom.memberLabel, isUserOnline(currentRoom));
    } else {
        setRoomMemberLabel(currentRoom.memberLabel, null);
    }
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
