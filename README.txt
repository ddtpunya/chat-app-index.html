CHAT DDT — Image Gallery & Zoom v7

Perubahan:
- Klik gambar membuka preview besar.
- Zoom 50% sampai 400% dengan tombol + dan -.
- Tombol 100% untuk reset zoom.
- Tombol Sebelumnya/Berikutnya untuk semua gambar di ruang chat aktif.
- Swipe kiri/kanan pada layar sentuh saat zoom 100%.
- Keyboard: panah kiri/kanan, +, -, 0, dan Escape.
- Double-click gambar untuk beralih 100% / 200%.
- Tidak memerlukan perubahan Firestore Rules.

Versi cache: 20260723-session-restore-fix-v8


=== SESSION RESTORE FIX v8 ===
- Auth observer dipasang sebelum getRedirectResult.
- getRedirectResult dan authStateReady tidak lagi memblokir UI.
- Layar Memulihkan sesi memiliki timeout 6,5 detik.
- LocalStorage diprioritaskan agar sesi setelah F5 lebih cepat dipulihkan.
- Tidak memerlukan perubahan Firestore Rules atau Storage Rules.
