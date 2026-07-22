CHAT DDT – Friends Only Private Chat v9

Perubahan utama:
- Private chat hanya tampil untuk user yang status pertemanannya "accepted".
- Tombol Teman untuk mengirim, menerima, menolak, membatalkan, dan menghapus pertemanan.
- Badge merah menunjukkan jumlah permintaan masuk.
- Group member picker hanya menampilkan teman.
- Firestore Rules melindungi private message berdasarkan dokumen friendships.
- Semua fitur v8 tetap dipertahankan: session restore, presence, last seen, read receipt, reply, upload gambar, preview/zoom/gallery.

WAJIB:
1. Timpa seluruh file website dengan versi v9.
2. Publish firestore.rules v9 di Firebase Console.
3. Ctrl+F5 satu kali.
4. Kedua user harus login, lalu salah satu mengirim permintaan dan user lain menekan Terima.

Catatan:
- Pesan private lama tetap tersimpan, tetapi baru dapat dibaca setelah kedua akun berteman.
- Saat pertemanan dihapus, private chat langsung hilang dan akses pesan private ditutup oleh rules.
