CHAT DDT – Private Search Gmail v10

Perubahan utama:
- Tidak ada lagi daftar seluruh akun atau pilihan Gmail.
- Tambah teman hanya melalui alamat Gmail lengkap lalu tekan tombol Cari.
- Pencarian menggunakan exact document lookup; Firestore menolak list/query collection users dan email_lookup.
- Hasil pencarian hanya menampilkan satu akun yang cocok dan tidak menampilkan alamat emailnya.
- Daftar di modal Teman hanya berisi teman, permintaan masuk, dan permintaan keluar yang memang terkait.
- Sidebar hanya menampilkan nama teman serta status online/offline/last seen.
- Pemilih anggota grup hanya menampilkan teman yang sudah terkait.
- Email tidak lagi disimpan pada dokumen profil users atau pesan baru.
- Semua fitur sebelumnya tetap dipertahankan: private chat khusus teman, session restore, presence, last seen, read receipt, reply, upload gambar, preview, zoom, dan gallery.

WAJIB:
1. Timpa seluruh file website dengan versi v10.
2. Publish firestore.rules v10 di Firebase Console.
3. Upload/publish website lalu tekan Ctrl+F5 satu kali.
4. Setiap akun yang boleh dicari harus membuka atau refresh CHAT DDT setidaknya satu kali setelah v10 dan rules dipasang. Langkah ini membuat exact email lookup milik akun tersebut.

Cara tambah teman:
1. Klik Teman.
2. Masukkan Gmail lengkap.
3. Klik Cari.
4. Tekan Tambah pada satu hasil yang cocok.
5. Penerima membuka Teman lalu menekan Terima.

Catatan keamanan:
- Collection users dan email_lookup tidak dapat ditampilkan sebagai daftar oleh client.
- Pencarian membutuhkan alamat email lengkap; tidak ada pencarian sebagian nama atau saran akun.
- Tanpa backend khusus/Cloud Functions, alamat yang memang sudah diketahui masih dapat dicoba secara exact-match. Versi ini mencegah browsing direktori, bukan rate-limiting pencarian.


V11:
- Tombol Teman di sidebar dihapus.
- Menu Teman & Permintaan dipindahkan ke Pengaturan (ikon gear di sebelah Logout).
- Badge permintaan masuk tampil pada ikon Pengaturan dan di dalam menu Teman.
- Tidak ada perubahan Firestore Rules dari v10.
