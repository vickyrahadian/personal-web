# System Documentation — Personal Web Portfolio

> Dokumen ini adalah peta utama project. Baca file ini terlebih dahulu untuk memahami struktur, fitur, alur data, API, dan tanggung jawab setiap file tanpa harus memindai seluruh repository dari awal.
>
> Terakhir diverifikasi terhadap source code: **28 Agustus 2026**.

## 1. Ringkasan Sistem

Project ini adalah website portfolio personal dengan dua antarmuka:

- **Public portfolio** di `/` untuk menampilkan profil, pengalaman, project, skill, galeri, dan form kontak.
- **Admin dashboard** di `/admin.html` untuk melihat analytics, membaca/menghapus pesan, serta mengelola galeri.

Backend menggunakan **Node.js + Express**, frontend menggunakan **HTML/CSS/JavaScript vanilla + Bootstrap CDN**, dan persistensi memakai file **CSV lokal**. Tidak ada database, framework frontend, bundler, atau build step.

```text
Browser publik (/)
  ├─ GET /api/gallery ───────────────> data/photo.csv + frontend/images/galery/
  ├─ GET /api/contact/challenge ─────> CAPTCHA dalam memory backend
  ├─ POST /api/contact ──────────────> data/contacts.csv
  └─ POST /api/analytics/track ──────> data/analytics/*.csv

Browser admin (/admin.html)
  ├─ GET/DELETE /api/messages ───────> data/contacts.csv
  ├─ GET/POST/PUT/DELETE /api/gallery > data/photo.csv + file gambar
  └─ GET /api/analytics/overview ────> analytics CSV + contacts CSV + process Node

Semua route API dan static frontend
  └─ backend/server.js (Express, default port 3000)
```

## 2. Teknologi dan Runtime

| Komponen | Teknologi | Fungsi |
| --- | --- | --- |
| Runtime | Node.js 18+ | Menjalankan server CommonJS |
| HTTP server | Express 4.19 | Static hosting, JSON parser, dan API routes |
| Upload | Multer 2.0 | Mendukung upload gambar multipart di backend |
| Development | Nodemon 3.1 | Restart server saat source berubah |
| UI | HTML5, CSS, JavaScript vanilla | Halaman publik dan admin |
| UI library | Bootstrap 5.3.3 + Bootstrap Icons 1.11.3 via CDN | Layout, komponen, ikon |
| Storage | CSV + file gambar lokal | Pesan, metadata galeri, analytics, dan aset gambar |

Perintah utama:

```bash
npm install
npm start       # node backend/server.js
npm run dev     # nodemon, mengabaikan perubahan galeri dan photo.csv
```

Tidak ada test suite, lint script, build script, migrasi database, atau CI configuration di repository saat dokumentasi ini dibuat.

## 3. Struktur Directory

```text
personal-web/
├── backend/
│   ├── server.js
│   ├── shared/
│   │   └── csv.js
│   └── features/
│       ├── analytics/analytics.routes.js
│       ├── contact/contact.routes.js
│       ├── gallery/gallery.routes.js
│       └── messages/messages.routes.js
├── data/
│   ├── contacts.csv
│   ├── photo.csv
│   └── analytics/
│       ├── visitors.csv
│       ├── traffic.csv
│       └── performance.csv
├── frontend/
│   ├── index.html
│   ├── admin.html
│   ├── script.js
│   ├── styles.css
│   ├── features/
│   │   ├── analytics/analytics.js
│   │   └── gallery/gallery.js
│   ├── admin/features/
│   │   ├── overview.js
│   │   ├── messages.js
│   │   └── gallery.js
│   ├── images/
│   │   ├── bg.jpeg
│   │   ├── profile/my-pictures.jpeg
│   │   └── galery/*.jpeg
│   └── .idea/*
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── nodemon
├── personal-web@1.0.0
└── system-documentation.md
```

Catatan: nama folder source memang ditulis `galery` (satu huruf **l**), bukan `gallery`. Jangan menggantinya di satu tempat saja karena path tersebut dipakai backend, frontend, CSV, dan file fisik.

## 4. Daftar File dan Fungsinya

### Root

| File | Fungsi |
| --- | --- |
| `system-documentation.md` | Dokumen kanonis untuk orientasi project, fitur, API, file, dan alur data. Perbarui saat struktur/kontrak berubah. |
| `README.md` | Panduan singkat instalasi, pemakaian, API, deployment, dan troubleshooting. Beberapa uraian lebih ringkas daripada implementasi aktual; source dan dokumen ini menjadi referensi teknis yang lebih lengkap. |
| `package.json` | Metadata package, entry point `backend/server.js`, script `start`/`dev`, dependency Express dan Multer, dev dependency Nodemon. |
| `package-lock.json` | Lockfile dependency npm agar instalasi reproducible. Dihasilkan npm; jangan diedit manual. |
| `.gitignore` | Mengabaikan dependency, log, environment secret, cache, coverage, dan output build umum. |
| `nodemon` | File kosong (0 byte), bukan konfigurasi aktif. Script development memakai executable dari `node_modules/.bin`. |
| `personal-web@1.0.0` | File kosong (0 byte), tidak direferensikan aplikasi dan tidak punya fungsi runtime. |

### Backend

| File | Fungsi dan detail penting |
| --- | --- |
| `backend/server.js` | Entry point Express. Membaca environment, memasang JSON parser limit 15 MB, menyajikan seluruh `frontend/` sebagai static files, memasang empat router API, menyediakan global 500 error handler, listen saat dieksekusi langsung, dan mengekspor `app` untuk penggunaan eksternal/test. |
| `backend/shared/csv.js` | Utility CSV bersama: `quote()` meng-escape quote/newline, `parse()` membaca CSV quoted sederhana, `read()` memetakan row, dan `write()` menulis ulang header + rows serta membuat parent directory. Parser mengasumsikan satu record per baris. |
| `backend/features/contact/contact.routes.js` | Route challenge dan submit kontak. Membuat CAPTCHA penjumlahan bertanda tangan HMAC, TTL 10 menit, mencegah token dipakai ulang, honeypot `website`, rate limit in-memory 5 request/IP/15 menit, validasi required/email/panjang, lalu append ke `contacts.csv`. |
| `backend/features/messages/messages.routes.js` | API admin untuk membaca pesan terbaru dan menghapus pesan berdasarkan index tampilan. Seluruh route dilindungi `isAdmin`. Delete membaca list reversed, menghapus index, lalu menulis kembali urutan kronologis CSV. |
| `backend/features/gallery/gallery.routes.js` | CRUD galeri. Inisialisasi `photo.csv` dari file gambar bila CSV belum ada; public list hanya foto aktif dan file yang masih ada; admin list semua metadata; upload JSON base64 atau multipart; validasi extension/MIME/10 MB; nama file baru UUID; edit metadata/status; delete metadata sekaligus file fisik. |
| `backend/features/analytics/analytics.routes.js` | Menerima event analytics, upsert profil visitor, hash IP dengan SHA-256 + salt, append traffic/performance, dan menyusun overview admin (traffic hari ini/7 hari, device, referrer, load time, data terbaru, uptime/memory/Node version). |

### Frontend publik

| File | Fungsi dan detail penting |
| --- | --- |
| `frontend/index.html` | Halaman portfolio utama. Memuat navbar dan section `hero`, `about`, `experience`, `projects`, `skills`, `gallery`, `contact`, serta footer/social links. Memuat Bootstrap CDN lalu analytics, gallery, dan script utama dalam urutan tersebut. |
| `frontend/styles.css` | Seluruh styling halaman publik: variable warna, navbar/hero, profile, section, timeline pengalaman, project card, skill badge, carousel, form kontak, footer, animasi fade-in, dan responsive rule mobile. |
| `frontend/script.js` | Interaksi umum: navbar berubah saat scroll, smooth scroll + menutup menu Bootstrap mobile, mengambil CAPTCHA, submit form kontak, state loading/feedback, tracking event `contact_submit`, refresh CAPTCHA pada error 400, dan IntersectionObserver untuk fade-in section. |
| `frontend/features/gallery/gallery.js` | Mengambil `/api/gallery`, membangun carousel tiga foto terlihat, menghitung lebar slide, dots/counter, tombol previous/next, resize handling, dan navigasi keyboard panah kiri/kanan. |
| `frontend/features/analytics/analytics.js` | Membuat/persist `visitorId` di `localStorage` dan `sessionId` di `sessionStorage`; mendeteksi device/browser/OS; mengekspos `window.trackAnalyticsEvent`; mengirim pageview serta load time saat window load menggunakan `fetch(..., keepalive: true)`. |

### Frontend admin

| File | Fungsi dan detail penting |
| --- | --- |
| `frontend/admin.html` | Satu halaman admin berisi seluruh CSS admin inline, login screen, sidebar, panel Overview/Messages/Gallery, serta placeholder menu yang belum aktif. Script inline menyimpan password hanya di variable memory, menguji login lewat `GET /api/messages`, melakukan sign out, escape HTML, dan berpindah panel. |
| `frontend/admin/features/overview.js` | Memanggil overview analytics dengan header admin, mengisi statistik traffic/performance/health, tabel detail 10 visitor terbaru, dan recent contacts. Status 401 memicu sign out. |
| `frontend/admin/features/messages.js` | Mengambil pesan, menampilkan tabel newest-first dengan output escaped, membuat link email, memperbarui badge/count, dan menghapus pesan berdasarkan index setelah konfirmasi. |
| `frontend/admin/features/gallery.js` | Menampilkan card seluruh foto, edit metadata melalui prompt/confirm, delete permanen, serta upload. UI saat ini membaca file sebagai base64 lalu mengirim JSON (bukan multipart) agar masuk ke `POST /api/gallery`. Validasi client: extension dan maksimum 10 MB. |

### Data dan aset

| File/path | Fungsi |
| --- | --- |
| `data/contacts.csv` | Pesan dari form kontak. Saat ini berisi header dan akan di-append backend. |
| `data/photo.csv` | Metadata galeri: ID, filename, teks, urutan, status aktif, waktu dibuat. Menjadi sumber daftar galeri, sedangkan binary berada di folder gambar. |
| `data/analytics/visitors.csv` | Satu profil per visitor ID anonim; record di-upsert saat event diterima. |
| `data/analytics/traffic.csv` | Log append-only event/pageview per timestamp, visitor, dan session. |
| `data/analytics/performance.csv` | Log sample performa. Implementasi frontend saat ini mengirim `load_time_ms`; kolom LCP/CLS/INP tersedia tetapi belum dihitung frontend. |
| `frontend/images/bg.jpeg` | Background hero. |
| `frontend/images/profile/my-pictures.jpeg` | Foto profil di hero. |
| `frontend/images/galery/*.jpeg` | File gambar galeri yang direferensikan `data/photo.csv`. Empat gambar UUID tersedia saat dokumentasi dibuat. |
| `frontend/.idea/*` | Metadata project JetBrains/IDE (`frontend.iml`, modules, VCS, workspace). Tidak memengaruhi runtime aplikasi. |

Directory/file yang tidak didokumentasikan satu per satu: `.git/` (database version control), `node_modules/` (dependency hasil npm install), serta `.idea/`, `.ai/`, dan `.claude/` tingkat root yang merupakan metadata/tooling lokal dan bukan source runtime aplikasi.

## 5. Fitur Sistem

### 5.1 Portfolio publik

- Navigasi fixed dan smooth scroll ke setiap section.
- Hero dengan foto profil dan call-to-action.
- Konten About, Experience, Projects, Skills, Gallery, Contact.
- Animasi section ketika masuk viewport.
- Layout responsive untuk desktop dan mobile.
- Social link Instagram, LinkedIn, GitHub, dan YouTube tersedia di Hero dan footer; kliknya direkam sebagai event analytics `social_click` beserta platform dan lokasi link.

### 5.2 Galeri

- Public carousel membaca metadata aktif dari API, bukan membaca directory langsung dari browser.
- Tiga item terlihat sekaligus; navigasi via arrows, dots, dan keyboard.
- Admin dapat upload JPG/JPEG/PNG/WEBP/GIF maksimal 10 MB.
- Admin dapat mengubah title, description, alt text, sort order, dan visibility.
- Delete bersifat permanen: row CSV dan file gambar dihapus.
- Jika `data/photo.csv` belum ada, backend membuatnya dari isi directory galeri saat router diinisialisasi.

### 5.3 Form kontak dan anti-spam

- Validasi client dan server untuk field wajib.
- Batas server: nama 100, email 254, pesan 3000 karakter.
- Validasi format email sederhana.
- CAPTCHA matematika dengan HMAC, berlaku 10 menit dan hanya sekali pakai.
- Honeypot tersembunyi bernama `website`.
- Rate limit in-memory per IP: maksimum 5 percobaan dalam 15 menit.
- Pesan sukses disimpan ke `data/contacts.csv` dan event analytics `contact_submit` dikirim.

### 5.4 Admin Messages

- Login diuji dengan password pada header `x-admin-password`.
- Pesan ditampilkan dari terbaru ke terlama.
- Output user di-escape sebelum masuk HTML.
- Admin dapat menghapus pesan berdasarkan posisi/index list saat itu.
- Password tidak disimpan ke browser storage; hilang setelah reload/sign out.

### 5.5 Admin Gallery

- Menampilkan foto aktif maupun hidden.
- Upload file dan metadata.
- Edit metadata/status aktif.
- Delete permanen dengan konfirmasi.

### 5.6 Analytics dan Overview

- Visitor ID bertahan lintas session melalui `localStorage`.
- Session ID baru per tab/session melalui `sessionStorage`.
- Data client: path, referrer, device, browser, OS, bahasa, timezone, screen size, load time.
- Backend tidak menyimpan IP mentah; hanya hash 24 karakter hex yang diberi salt.
- Dashboard: unique visitors hari ini, pageviews hari ini, unique visitors 7 hari, top referrer, device breakdown, rata-rata page load, tabel 10 visitor terbaru, kontak terbaru, dan health process Node.
- Tabel Latest Visitor Details menggabungkan profil `visitors.csv` dengan traffic terakhir visitor untuk menampilkan last seen/first seen, ID singkat, device, browser/OS, lokasi atau timezone, path terakhir, referrer, language, screen size, anonymous IP hash, session, dan event terakhir.

## 6. Kontrak API

Semua response API berbentuk JSON. Endpoint admin membutuhkan:

```http
x-admin-password: <nilai ADMIN_PASSWORD>
```

| Method dan path | Auth | Request | Hasil utama |
| --- | --- | --- | --- |
| `GET /api/gallery` | Public | — | Array foto aktif yang file-nya tersedia, urut `sort_order`; setiap object memiliki `src`. |
| `GET /api/gallery/admin` | Admin | — | Semua foto termasuk hidden. |
| `POST /api/gallery` | Admin | JSON base64 atau multipart | Membuat file UUID + metadata, status `201`. |
| `PUT /api/gallery/:id` | Admin | JSON metadata | Memperbarui metadata/status; `404` jika ID tidak ada. |
| `DELETE /api/gallery/:id` | Admin | — | Menghapus metadata dan file fisik; `404` jika ID tidak ada. |
| `GET /api/contact/challenge` | Public | — | `{ question, token }`. |
| `POST /api/contact` | Public | JSON | Validasi CAPTCHA/form lalu append pesan. |
| `GET /api/messages` | Admin | — | Array pesan newest-first. |
| `DELETE /api/messages/:index` | Admin | Index dari array newest-first | Menghapus pesan pada index; `400` jika index invalid. |
| `POST /api/analytics/track` | Public | JSON event | Upsert visitor dan append traffic/performance. |
| `GET /api/analytics/overview` | Admin | — | Ringkasan traffic, performance, 10 visitor terbaru yang diperkaya traffic terakhir, recent contacts, dan process health. |

### Payload penting

`POST /api/contact`:

```json
{
  "name": "Visitor Name",
  "email": "visitor@example.com",
  "message": "Hello",
  "captchaToken": "signed-token-from-challenge",
  "captchaAnswer": "7",
  "website": ""
}
```

`POST /api/gallery` dari UI admin (JSON base64):

```json
{
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "data": "<base64 tanpa data-URL prefix>",
  "title": "Title",
  "description": "Description",
  "alt_text": "Accessible text",
  "sort_order": "1"
}
```

Alternatif multipart memakai field file `photo` dan text fields yang sama. Untuk JSON, `is_active` default aktif; untuk multipart, string `"0"` membuat foto tidak aktif.

`POST /api/analytics/track` memerlukan `visitor_id` dan `session_id`; field lain opsional. `load_time_ms` yang truthy juga membuat row di performance CSV.

## 7. Skema CSV

```csv
# data/contacts.csv
"timestamp","name","email","message"

# data/photo.csv
"id","filename","title","description","alt_text","sort_order","is_active","created_at"

# data/analytics/visitors.csv
"visitor_id","first_seen","last_seen","ip_hash","country","city","device","browser","os","language","timezone","screen_size"

# data/analytics/traffic.csv
"timestamp","visitor_id","session_id","event","path","referrer","duration_ms"

# data/analytics/performance.csv
"timestamp","visitor_id","path","load_time_ms","lcp_ms","cls","inp_ms"
```

Nilai boolean `photo.is_active` disimpan sebagai `1` atau `0`. Timestamp menggunakan ISO 8601 UTC. Semua writer mengganti newline dalam field menjadi spasi dan menggandakan quote sesuai escaping CSV.

## 8. Environment Variable

| Variable | Default | Dipakai untuk |
| --- | --- | --- |
| `PORT` | `3000` | Port Express. |
| `ADMIN_PASSWORD` | `admin2026` | Perbandingan langsung dengan header admin. Wajib diganti di production. |
| `ANALYTICS_SALT` | `change-this-analytics-salt` | Salt hash IP analytics. Wajib dibuat secret unik di production. |
| `CONTACT_CAPTCHA_SECRET` | Random 32-byte hex setiap server start | HMAC CAPTCHA. Bila diisi, signature stabil selama deployment/restart; token lama tetap dibatasi TTL. |

Frontend static directory dan data paths dihitung relatif terhadap `backend/server.js`, sehingga server tidak bergantung pada current working directory untuk menemukan aset/data.

## 9. Alur Utama

### Submit kontak

1. `frontend/script.js` meminta `GET /api/contact/challenge`.
2. Backend membuat pertanyaan dan token HMAC berisi waktu + jawaban.
3. Visitor mengirim form, token, jawaban, dan honeypot.
4. Backend mengecek honeypot, rate limit, field/panjang/email, signature, TTL, reuse token, dan jawaban.
5. Backend append row ke `data/contacts.csv`.
6. Frontend menampilkan sukses dan mengirim event analytics `contact_submit`.

### Login dan pengelolaan admin

1. Admin memasukkan password di `admin.html`.
2. Browser menguji password melalui `GET /api/messages`.
3. Jika sukses, password disimpan di variable `adminPassword` selama halaman hidup.
4. Setiap request admin mengirim password tersebut sebagai header.
5. Sidebar memuat modul Messages, Gallery, atau Overview sesuai panel terpilih.

### Tracking analytics

1. Browser membuat/mengambil visitor ID dan session ID.
2. Saat window selesai load, frontend menghitung navigation load time.
3. `POST /api/analytics/track` meng-update visitor dan append event.
4. Overview membaca seluruh CSV saat diminta, menghitung agregat secara in-process, lalu mengembalikan JSON.

## 10. Coupling dan Dampak Perubahan

| Jika mengubah | Periksa juga |
| --- | --- |
| Nama/path `frontend/images/galery` | `backend/server.js`, `gallery.routes.js`, `src` response, metadata CSV, dan dokumentasi. |
| Schema `contacts.csv` | Contact writer, Messages reader/writer, Analytics recent contacts. |
| Schema `photo.csv` | Gallery `readPhotos`, `writePhotos`, public/admin frontend. |
| Schema analytics CSV | Analytics track writer dan overview reader/agregasi. |
| Header/password admin | `server.js`, seluruh fetch dalam file admin, deployment config. |
| ID element di `index.html` | `script.js` dan/atau `features/gallery/gallery.js`. |
| ID element/panel di `admin.html` | Ketiga file `frontend/admin/features/*.js` dan script inline admin. |
| Response `/api/gallery` | Public gallery dan admin gallery renderer. |
| Contact CAPTCHA contract | `frontend/script.js` dan `contact.routes.js`. |

## 11. Keamanan, Batasan, dan Risiko Teknis

- Auth admin adalah shared password statis tanpa session, role, expiry, brute-force protection, atau CSRF protection. Gunakan HTTPS dan password kuat.
- Default `ADMIN_PASSWORD` dan `ANALYTICS_SALT` tidak aman untuk production.
- Rate limit dan daftar CAPTCHA terpakai hanya berada di memory; semuanya reset saat server restart dan tidak sinkron antar-instance.
- `x-forwarded-for` dipercaya langsung. Di deployment, konfigurasi trusted proxy perlu dipikirkan agar IP/rate limit tidak mudah dipalsukan.
- CSV dan operasi file synchronous dapat memblokir event loop serta berisiko lost update pada request bersamaan. Cocok untuk traffic kecil/satu instance, bukan skala tinggi.
- Delete pesan berdasarkan index rentan menghapus row berbeda bila daftar berubah di antara load dan delete. ID stabil per pesan akan lebih aman.
- Upload memvalidasi extension dan MIME yang diklaim client, tetapi tidak memeriksa magic bytes/kandungan gambar.
- Global JSON limit 15 MB dan file limit 10 MB mengakomodasi overhead base64, tetapi file base64 tetap memakai memory browser dan server.
- Analytics endpoint public belum memiliki rate limit dan dapat menumbuhkan CSV tanpa batas.
- Country/city tersedia pada schema tetapi frontend tidak mengisinya dan backend tidak melakukan GeoIP lookup.
- Nilai LCP/CLS/INP tersedia pada schema tetapi belum dikumpulkan oleh frontend.
- Bootstrap dan Bootstrap Icons berasal dari CDN; UI membutuhkan akses internet dan saat ini tidak terlihat memakai Subresource Integrity.
- Data kontak mengandung informasi personal. Terapkan permission, backup, retention, dan perlindungan file yang sesuai.

## 12. Panduan Menambah Fitur

- **Backend feature baru:** buat router di `backend/features/<feature>/`, export factory function dengan dependency path/auth yang diperlukan, lalu mount di `backend/server.js`.
- **Frontend public feature:** letakkan JavaScript modular di `frontend/features/<feature>/`, tambahkan DOM di `index.html`, lalu load script setelah dependency yang diperlukan.
- **Admin feature:** buat `frontend/admin/features/<feature>.js`, tambahkan panel/sidebar di `admin.html`, load script sebelum script inline yang memanggil fungsinya.
- **Storage baru:** bila tetap CSV, definisikan header eksplisit dan mapper read/write; ingat concurrency dan kompatibilitas schema lama.
- **Setelah perubahan:** update bagian struktur, daftar file, API, schema, coupling, dan tanggal verifikasi di dokumen ini.

## 13. Quick Orientation untuk Agent/Developer

Urutan baca tercepat berdasarkan jenis pekerjaan:

- Startup/routing/config: `backend/server.js` → router fitur terkait.
- Portfolio UI: `frontend/index.html` → `frontend/styles.css` → `frontend/script.js`.
- Gallery public: `frontend/features/gallery/gallery.js` → `backend/features/gallery/gallery.routes.js` → `data/photo.csv`.
- Contact/messages: `frontend/script.js` → contact router → messages router → `data/contacts.csv` → admin messages JS.
- Analytics: public analytics JS → analytics router → tiga analytics CSV → admin overview JS.
- Admin shell/auth/navigation: `frontend/admin.html`, kemudian file feature admin terkait.

`node_modules/` tidak perlu dipindai untuk memahami business logic. Mulai dari dokumen ini, lalu buka hanya file pada alur fitur yang sedang dikerjakan.
