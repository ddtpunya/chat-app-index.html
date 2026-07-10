CHAT DDT - Image Upload Fixed

Perbaikan:
- Upload gambar tetap mencoba Firebase Storage terlebih dahulu.
- Jika Storage ditolak karena Spark/Blaze, rules, bucket, quota, atau error Storage,
  gambar otomatis dikompres dan disimpan langsung ke Firestore.
- Maksimum gambar awal: 20 MB.
- Gambar fallback diperkecil maksimal 1280 px dan sekitar 520 KB agar aman terhadap
  batas ukuran dokumen Firestore.
- Upload file biasa tetap membutuhkan Firebase Storage aktif dan paket Blaze.
- Cache-buster: 20260711-image-upload-fallback-1

Cara deploy:
1. Upload semua file dalam ZIP langsung ke root repository GitHub.
2. Tunggu GitHub Pages selesai deploy.
3. Hard refresh (Ctrl+Shift+R) atau hapus cache situs di HP.

Untuk upload file tanpa fallback:
- Firebase Console > Storage harus sudah dibuat.
- Project Firebase harus menggunakan paket Blaze.
- Publish isi storage.rules pada tab Storage > Rules.
