# Panduan: Inventori K3 dengan Firebase di GitHub Pages

## Jawaban singkat
- **Tanpa backend bisa.** GitHub Pages hanya menyajikan file, jadi data tidak bisa disimpan di sana.
  Yang dipakai adalah Firebase: layanan database dan login siap pakai. Anda tidak membuat atau
  menjalankan server sendiri.
- **Database yang paling mudah untuk web seperti ini: Firebase (Firestore).** Gratis untuk skala ini
  dan tidak perlu kartu kredit. Alternatif yang mirip adalah Supabase.
- Tanpa database sama sekali (localStorage) data hanya ada di satu browser, hilang kalau cache
  dibersihkan, dan tidak terlihat oleh orang lain. Karena itu tidak dipakai.

## 1. Buat project Firebase
1. Buka https://console.firebase.google.com lalu **Add project** (Analytics boleh dimatikan).
2. **Build > Authentication > Get started > Sign-in method**: aktifkan **Email/Password**.
3. **Build > Firestore Database > Create database**: pilih lokasi terdekat dan mode **production**.
4. **Project settings** (roda gigi) > **Your apps** > ikon web `</>` > daftarkan aplikasi.
   Salin `firebaseConfig` ke bagian `FIREBASE_CONFIG` di paling atas `app.js`.
5. **Authentication > Settings > Authorized domains > Add domain**:
   `ruangenergikita-tech.github.io`

## 2. Buat akun yang boleh login
1. **Authentication > Users > Add user**: isi email dan kata sandi.
2. Buka `firestore.rules`, ganti email contoh dengan email yang baru dibuat (huruf kecil semua).
   Tambahkan satu baris per pengguna:
   ```
   'admin@perusahaan.com',
   'petugas@perusahaan.com'
   ```
3. Tempel seluruh isi `firestore.rules` ke **Firestore Database > Rules**, lalu **Publish**.

Langkah 2 diperlukan karena Firebase mengizinkan siapa pun mendaftar lewat API. Daftar email di aturan
inilah yang memastikan hanya akun Anda yang bisa membaca dan menulis data.

## 3. Unggah ke GitHub
Salin semua file dari folder ini ke folder repo `WEBINVENTORYK3L` (timpa yang lama), lalu:

1. **Hapus file lama yang sudah tidak dipakai**: `Apar.js`, `Common.js`, `Dashboard.js`, `P3k.js`
   dan `.github/workflows/jekyll-gh-pages.yml` (dua workflow Pages berjalan bersamaan dan bisa
   saling bertabrakan; cukup pakai `static.yml`).
2. Jalankan:
   ```
   git add -A
   git commit -m "Firebase, grafik, login"
   git push
   ```
3. Tunggu workflow selesai, lalu buka `https://ruangenergikita-tech.github.io/WEBINVENTORYK3L/`.

Nama file harus persis sama, termasuk huruf besar dan kecil: `P3k.html` dan `Apar.html`.
GitHub Pages membedakan `P3K.html` dengan `P3k.html`.

## Catatan keamanan
- Versi lama menyimpan `admin` dan `admin123` di `app.js`. File itu terbuka untuk umum dan tetap ada
  di riwayat git. Jangan pakai kata sandi itu lagi di mana pun.
- Isi `FIREBASE_CONFIG` memang tidak rahasia. Yang melindungi data adalah aturan di `firestore.rules`.
  Jangan ubah menjadi `allow read, write: if true`.
- Kalau repo Anda publik, siapa pun bisa melihat kode, tetapi tanpa akun di daftar email mereka tidak
  bisa membaca atau mengubah data.
