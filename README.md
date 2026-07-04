# Procurement Tracker

Aplikasi tracking progress pengadaan barang/jasa. Stack: **React + Tailwind** (frontend), **Node.js/Express** (backend), **PostgreSQL** (database).

## 1. Struktur Folder & Alasan

```
procurement-tracker/
├── backend/
│   ├── src/
│   │   ├── config/db.js        # koneksi pool ke PostgreSQL
│   │   ├── db/
│   │   │   ├── schema.sql      # definisi tabel + trigger
│   │   │   ├── migrate.js      # runner untuk eksekusi schema.sql
│   │   │   └── seed.js         # bikin user admin awal
│   │   ├── middleware/auth.js  # verifikasi JWT & role
│   │   ├── controllers/        # logic tiap fitur (1 file = 1 domain)
│   │   ├── routes/             # pemetaan URL -> controller
│   │   ├── utils/export.js     # generate Excel & PDF
│   │   └── server.js           # entry point Express
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/axios.js         # instance axios + auto-attach token
    │   ├── context/AuthContext.jsx  # state login global
    │   ├── components/          # bagian UI yang dipakai berulang
    │   ├── pages/                # 1 file = 1 halaman/route
    │   └── App.jsx                # routing
    └── package.json
```

**Kenapa dipisah backend/frontend?** Supaya bisa di-deploy terpisah (frontend ke Vercel, backend ke Railway/Render) dan tim bisa kerja paralel tanpa saling tabrakan.

**Kenapa controllers/routes dipisah?** `routes` cuma "peta" (URL apa manggil fungsi apa), `controllers` isi logic-nya. Kalau nanti mau tambah endpoint atau ganti urutan middleware, kamu tidak perlu bongkar logic bisnis.

**Penjelasan skema database** ada lengkap sebagai komentar di `backend/src/db/schema.sql` — inti pentingnya: `pengadaan_tahapan` adalah *junction table* yang menghubungkan `pengadaan` dan `tahapan_master` sekaligus menyimpan status/tanggal/catatan. ​Trigger `fn_generate_tahapan` otomatis membuatkan 9 baris tahapan setiap kali ada pengadaan baru, jadi kamu tidak perlu insert manual satu-satu.

## 2. Menjalankan di Local (Urutan Wajib: DB → Backend → Frontend)

### A. Setup Database

```bash
# pastikan PostgreSQL sudah terinstall & jalan, lalu buat database:
createdb procurement_db
```

### B. Setup Backend

```bash
cd backend
cp .env.example .env
# edit .env, isi DATABASE_URL sesuai koneksi PostgreSQL kamu, dan JWT_SECRET bebas string acak

npm install
npm run migrate   # membuat semua tabel + trigger dari schema.sql
npm run seed       # membuat akun admin awal (admin@procurement.local / admin123)
npm run dev         # jalan di http://localhost:4000
```

**Test backend sebelum lanjut ke frontend:**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@procurement.local","password":"admin123"}'
```
Kalau dapat response berisi `token`, backend sudah jalan benar. Simpan token itu untuk test endpoint lain, misalnya:
```bash
curl http://localhost:4000/api/pengadaan -H "Authorization: Bearer <token>"
```

### C. Setup Frontend

```bash
cd frontend
cp .env.example .env   # isi VITE_API_URL kalau backend tidak di localhost:4000
npm install
npm run dev             # jalan di http://localhost:5173
```

Buka `http://localhost:5173`, login dengan akun admin dari hasil seed, lalu **segera buat akun baru untuk dirimu sendiri** lewat endpoint register (belum ada UI-nya sengaja, biar admin yang kontrol lewat API/Postman):

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Authorization: Bearer <token_admin>" \
  -H "Content-Type: application/json" \
  -d '{"nama":"Nama Kamu","email":"kamu@email.com","password":"passwordkuat","role":"staff"}'
```

## 3. Alur Pemakaian

1. Login → Dashboard menampilkan ringkasan stuck & progress.
2. Klik "+ Baru" untuk membuat pengadaan → 9 tahapan otomatis dibuat berstatus "Belum Mulai".
3. Buka detail pengadaan → ubah status tiap tahap lewat dropdown. Sistem **menolak** kalau kamu coba lompat tahap (misal set "Proses" padahal tahap sebelumnya belum "Selesai").
4. Halaman "Daftar Pengadaan" untuk filter/search dan export Excel/PDF.

## 4. Panduan Deploy

### Backend + Database → Railway (atau Render)

1. Buat project baru di Railway, tambahkan **PostgreSQL plugin** (otomatis dapat `DATABASE_URL`).
2. Push folder `backend/` ke GitHub repo terpisah (atau monorepo dengan root directory diarahkan ke `backend`).
3. Di Railway, deploy dari repo tsb, set environment variables: `DATABASE_URL` (pakai punya Railway), `JWT_SECRET`, `CORS_ORIGIN` (isi URL Vercel frontend nanti).
4. Setelah deploy pertama sukses, jalankan sekali via Railway shell/console:
   ```bash
   npm run migrate
   npm run seed
   ```
5. Catat URL backend, misal `https://procurement-backend.up.railway.app`.

### Frontend → Vercel

1. Push folder `frontend/` ke GitHub.
2. Import project di Vercel, set **Root Directory** ke `frontend`.
3. Set environment variable `VITE_API_URL` = `https://procurement-backend.up.railway.app/api`.
4. Deploy. Setelah dapat URL Vercel, balik ke Railway dan update `CORS_ORIGIN` supaya backend mengizinkan request dari domain Vercel tsb, lalu redeploy backend.

## 5. Yang Perlu Kamu Sesuaikan Sendiri

- Ganti password admin default setelah login pertama.
- Kalau butuh tahapan tambahan/beda urutan, cukup edit tabel `tahapan_master` (tidak perlu ubah kode).
- UI register user baru belum ada (sengaja endpoint-only untuk kontrol admin) — bisa ditambah sebagai halaman Vue admin kalau perlu.
