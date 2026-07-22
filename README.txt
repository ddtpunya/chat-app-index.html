CHAT DDT - Image Upload Fix v2

Perubahan utama:
- Upload gambar tidak lagi bergantung pada Firebase Storage.
- Gambar dikompres otomatis lalu disimpan ke Firestore sebagai data inline.
- Maksimum file sumber 20 MB; hasil kompresi dibatasi sekitar 420 KB.
- Tombol upload file non-gambar masih menggunakan Firebase Storage dan memerlukan paket Blaze.

Cara pasang:
1. Upload/replace index.html, chat.html, app.js, auth.js, firebase.js, dan style.css.
2. Publish firestore.rules dari paket ini.
3. Hard refresh browser (Ctrl+F5).
4. Coba upload JPG/PNG/WebP.
