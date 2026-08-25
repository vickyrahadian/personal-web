# Personal Web Portfolio

Website portfolio personal Vicky Rahadian Firmansyah dengan halaman portfolio publik, gallery foto, form kontak, dan dashboard admin untuk mengelola pesan masuk.

## Fitur

- Landing page responsif dengan section About, Experience, Projects, Skills, Gallery, dan Contact.
- Gallery carousel yang membaca file gambar secara otomatis dari `frontend/images/galery`.
- Form kontak dengan validasi nama, email, dan pesan.
- Penyimpanan pesan kontak ke file CSV lokal di `data/contacts.csv`.
- Halaman admin di `/admin.html` untuk login, melihat daftar pesan terbaru, dan menghapus pesan.
- Animasi navigasi, smooth scroll, carousel keyboard navigation, dan fade-in section.

## Teknologi

- Node.js
- Express 4
- HTML, CSS, dan JavaScript vanilla
- Bootstrap 5.3.3 dan Bootstrap Icons melalui CDN
- CSV sebagai penyimpanan data sederhana
- Multer untuk upload foto gallery

## Prasyarat

- Node.js 18 atau versi yang lebih baru
- npm

## Instalasi dan Menjalankan

1. Masuk ke folder project dan install dependency:

   ```bash
   cd personal-web
   npm install
   ```

2. Jalankan server:

   ```bash
   npm start
   ```

3. Buka halaman berikut:

   - Portfolio: <http://localhost:3000>
   - Admin: <http://localhost:3000/admin.html>

Server menggunakan port `3000` secara default. Port dapat diubah dengan environment variable `PORT`:

```bash
PORT=8080 npm start
```

## Konfigurasi Environment

| Variable | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `3000` | Port HTTP server Express |
| `ADMIN_PASSWORD` | `admin2026` | Password untuk endpoint dan halaman admin |
| `ANALYTICS_SALT` | `change-this-analytics-salt` | Secret untuk membuat hash IP anonymous |

Untuk deployment, selalu tentukan password sendiri:

```bash
ADMIN_PASSWORD='ganti-dengan-password-kuat' npm start
```

Jangan menggunakan password default pada environment production.

## Struktur Folder

```text
personal-web/
├── backend/
│   ├── server.js              # Bootstrap Express dan registrasi route
│   ├── features/
│   │   ├── contact/contact.routes.js
│   │   ├── gallery/gallery.routes.js
│   │   └── messages/messages.routes.js
│   └── shared/csv.js          # Utility baca/tulis CSV bersama
├── data/
│   └── contacts.csv           # Data pesan kontak
│   └── photo.csv              # Metadata foto gallery
├── frontend/
│   ├── index.html             # Halaman portfolio publik
│   ├── admin.html             # Dashboard admin pesan
│   ├── script.js              # Interaksi portfolio dan form kontak
│   ├── styles.css             # Styling portfolio
│   ├── features/gallery/
│   │   └── gallery.js         # Carousel gallery halaman publik
│   └── admin/features/
│       ├── gallery.js         # UI admin Gallery
│       └── messages.js         # UI admin Messages
│   └── images/
│       ├── bg.jpeg            # Background hero
│       ├── profile/            # Foto profil
│       └── galery/             # Foto gallery
├── package.json
├── package-lock.json
└── README.md
```

## API

### `GET /api/gallery`

Mengembalikan daftar path gambar dengan ekstensi `.jpg`, `.jpeg`, `.png`, `.webp`, atau `.gif` dari folder gallery.

Contoh response:

```json
["images/galery/photo-1.jpeg", "images/galery/photo-2.jpeg"]
```

### `POST /api/contact`

Menyimpan pesan baru ke `data/contacts.csv`.

Request body:

```json
{
  "name": "Nama Pengunjung",
  "email": "visitor@example.com",
  "message": "Halo, saya ingin berdiskusi."
}
```

Response sukses:

```json
{ "success": true }
```

Endpoint mengembalikan status `400` jika field tidak lengkap atau format email tidak valid.

### `GET /api/messages`

Mengambil semua pesan dalam urutan terbaru. Endpoint ini memerlukan header:

```text
x-admin-password: <ADMIN_PASSWORD>
```

Jika password salah, response berstatus `401 Unauthorized`.

### `DELETE /api/messages/:index`

Menghapus pesan berdasarkan index yang dikirim dashboard admin. Endpoint ini juga memerlukan header `x-admin-password`.

### Gallery API

- `GET /api/gallery` mengembalikan foto aktif yang tampil di halaman depan, terurut berdasarkan `sort_order`.
- `GET /api/gallery/admin` mengembalikan seluruh foto untuk dashboard admin.
- `POST /api/gallery` menerima multipart field `photo`, `title`, `description`, `alt_text`, dan `sort_order`. Upload dibatasi 10 MB dan filename dibuat otomatis menggunakan UUID v4.
- `PUT /api/gallery/:id` mengubah metadata dan status aktif foto.
- `DELETE /api/gallery/:id` menghapus metadata sekaligus file foto secara permanen.

Format yang didukung: `.jpg`, `.jpeg`, `.png`, `.webp`, dan `.gif`.

### Analytics API

- `POST /api/analytics/track` menerima anonymous visitor/session ID, pageview, device, browser, referrer, dan performance dasar dari halaman publik.
- `GET /api/analytics/overview` mengembalikan ringkasan analytics untuk admin dan memerlukan header `x-admin-password`.

Data analytics disimpan di `data/analytics/`:

```text
data/analytics/
├── visitors.csv       # Profil visitor anonymous dan last seen
├── traffic.csv        # Histori pageview dan event
└── performance.csv    # Waktu load halaman
```

Visitor ID dibuat di browser menggunakan `localStorage`, sedangkan session ID menggunakan `sessionStorage`. IP tidak disimpan secara mentah; backend hanya menyimpan hash pendek menggunakan `ANALYTICS_SALT`. Untuk deployment, ganti nilai salt default dengan secret yang kuat.

## Menambah atau Mengganti Foto Gallery

Salin file gambar ke `frontend/images/galery/`. Tidak ada perubahan kode yang diperlukan; daftar gambar dibaca ulang ketika halaman portfolio dimuat.

## Alur Data Form Kontak

```text
Pengunjung
   │
   └── POST /api/contact
          │
          ├── Validasi field dan email
          └── Append ke data/contacts.csv

Admin ── login di /admin.html
   │
   ├── GET /api/messages
   └── DELETE /api/messages/:index
```

File CSV dibuat otomatis jika belum tersedia, termasuk header:

```csv
"timestamp","name","email","message"
```

## Pengembangan

Project belum memiliki bundler atau build step. Perubahan frontend dapat langsung diuji setelah server dijalankan; refresh browser setelah mengubah HTML, CSS, JavaScript, atau gambar.

Untuk memeriksa syntax backend:

```bash
node --check backend/server.js
```

## Catatan Deployment dan Keamanan

- Data pesan disimpan sebagai file lokal. Pastikan folder `data/` memiliki izin tulis pada server.
- CSV lokal tidak cocok untuk skala tinggi atau deployment multi-instance karena berisiko mengalami konflik penulisan dan tidak memiliki backup otomatis.
- Proteksi admin saat ini menggunakan password statis melalui header `x-admin-password`; gunakan HTTPS dan password kuat saat deployment.
- Untuk production, pertimbangkan rate limiting, CSRF protection, session/authentication yang lebih kuat, serta validasi panjang input.
- Backup `data/contacts.csv` secara berkala karena berisi data kontak pengunjung.
- Bootstrap dan Bootstrap Icons dimuat dari CDN, sehingga browser deployment memerlukan akses internet.

## Troubleshooting

**Portfolio tidak dapat dibuka** — Pastikan server aktif dengan `npm start` dan port tidak sedang dipakai aplikasi lain.

**Gallery kosong** — Pastikan file gambar berada di `frontend/images/galery/` dan menggunakan ekstensi yang didukung.

**Pesan tidak tersimpan** — Pastikan process Node memiliki izin menulis ke folder `data/`.

**Tidak dapat login sebagai admin** — Gunakan nilai `ADMIN_PASSWORD` yang sama dengan saat server dijalankan. Jika tidak ditentukan, password default adalah `admin2026`.
