CHAT DDT — Presence & Read Receipts v4
Versi cache: 20260723-presence-read-receipts-v4

FITUR BARU
1. Status user Online / Offline pada daftar user.
2. Last seen / Terakhir dilihat pada sidebar dan header private chat.
3. Email tidak lagi ditampilkan di daftar user sidebar.
4. Status pesan:
   - mengirim...
   - terkirim
   - dibaca (private chat)
   - dibaca N (group/global chat)
5. Status dibaca juga bekerja untuk pesan lama setelah penerima membuka ruang chat.

CARA PASANG
1. Upload dan timpa seluruh file website dengan file dalam folder ini.
2. Firebase Console > Firestore Database > Rules.
3. Tempel isi firestore.rules lalu klik Publish.
4. Upload/publish website.
5. Buka website lalu tekan Ctrl + F5.
6. Login dengan dua akun yang sudah dimasukkan ke ALLOWED_EMAILS di auth.js.

CATATAN PRESENCE
- Status online memakai heartbeat Firestore setiap sekitar 60 detik.
- Jika browser ditutup mendadak dan update offline tidak sempat terkirim,
  user otomatis dianggap offline setelah heartbeat terakhir kedaluwarsa.
- Last seen menggunakan waktu terakhir presence yang tersimpan di Firestore.
