CHAT DDT — BUILD 20260723 ALL BUTTONS V1

FILE UTAMA
- index.html
- chat.html
- style.css
- firebase.js
- auth.js
- app.js
- firestore.rules
- storage.rules

CARA PASANG
1. Upload index.html, chat.html, style.css, firebase.js, auth.js, dan app.js ke folder website yang sama.
2. Firebase Console > Firestore Database > Rules:
   salin isi firestore.rules lalu klik Publish.
3. Firebase Console > Storage > Rules:
   salin isi storage.rules lalu klik Publish.
4. Pastikan Authentication > Sign-in method > Google aktif.
5. Pastikan domain website sudah ada di Authentication > Settings > Authorized domains.
6. Tambahkan email yang boleh login pada ALLOWED_EMAILS di auth.js.

TOMBOL/FITUR YANG SUDAH DIAKTIFKAN
- Login Google dan logout.
- Setting profil: ubah nama tampilan dan mode pesan ringkas.
- Cari user atau grup.
- Tombol Groups untuk filter daftar grup.
- Buat Grup Baru dan pilih anggota dari Firestore.
- Collapse/expand sidebar dengan penyimpanan localStorage.
- Buka Global Chat, Private Chat, dan Group Chat.
- Pencarian pesan pada ruang aktif dan tombol hapus pencarian.
- Setting chat: lihat dan salin ID ruang.
- Tombol kembali pada mobile.
- Tombol ke bawah.
- Emoji, kirim pesan, reply pesan, upload gambar, upload file, dan paste gambar.
- Tombol upload gambar/file tetap tampil di mobile.

CATATAN
- Firebase Storage mungkin membutuhkan paket Blaze. Jika Storage tidak tersedia, gambar memakai fallback Firestore yang sudah ada. File non-gambar tetap membutuhkan Firebase Storage.
- Private chat memerlukan minimal dua email yang terdaftar pada ALLOWED_EMAILS dan sudah pernah login.
