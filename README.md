# Employee Management System

Aplikasi web pengelolaan data karyawan yang terdiri dari **REST API** (Node.js, Express, TypeScript, Prisma, PostgreSQL) dan **antarmuka React + TypeScript**. Dibuat sebagai tugas rekrutmen PT. Maspion (Programmer).

## Demo Live

| Bagian | Alamat |
|---|---|
| Frontend | https://employee-management-system-five-orcin.vercel.app |
| Backend (API) | https://ems-api-4iot.onrender.com |
| Dokumentasi API (Swagger) | https://ems-api-4iot.onrender.com/api-documentation |
| Health check | https://ems-api-4iot.onrender.com/health |

**Akun demo**

| Role | Email | Password | Hak akses |
|---|---|---|---|
| Admin | `admin@example.com` | `Admin123!` | Penuh (baca, tambah, ubah, hapus, lihat audit log) |
| Viewer | `viewer@example.com` | `Viewer123!` | Hanya baca (daftar, detail, export CSV) |

> **Catatan free tier:** backend berjalan di paket gratis Render, yang menidurkan layanan setelah 15 menit tanpa trafik. Request pertama setelah lama diam bisa memakan waktu sekitar satu menit sampai server bangun. Database Neon juga bisa tertidur dan butuh beberapa detik untuk aktif kembali. Setelah itu aplikasi berjalan normal.

## Fitur

**Backend**
- Autentikasi JWT dengan role `ADMIN` (akses penuh) dan `VIEWER` (hanya baca); password di-hash dengan bcrypt
- CRUD karyawan dan department, dengan relasi `employees` ke `departments`
- Validasi input di server (format email, nomor HP, field wajib) dengan format error yang konsisten
- Search, filter (department, status), sorting, dan pagination, semuanya dieksekusi di query database
- Audit log pada setiap create, update, dan delete (siapa, kapan, aksi apa, data yang berubah)
- Export data karyawan ke CSV, dibuat langsung di backend
- Rate limiting (umum dan khusus login), error handling middleware, dan endpoint `/health` yang mengecek database
- Migration database lewat Prisma Migrate
- Halaman `/api-documentation` (Swagger UI) untuk mencoba seluruh endpoint
- Tes integrasi otomatis (Vitest + Supertest)

**Frontend**
- Halaman login, penyimpanan token, dan route yang dilindungi
- Daftar karyawan dengan search, filter, sorting, dan pagination
- Halaman detail, form tambah dan ubah (dengan pesan error per kolom dari server), dan konfirmasi hapus
- Tombol export CSV (mengikuti filter yang aktif)
- Tombol tambah, ubah, dan hapus hanya tampil untuk admin
- Responsif sampai ukuran ponsel, dengan loading state, empty state, dan error state

## Teknologi

| Lapisan | Teknologi |
|---|---|
| Backend | Node.js, Express 5, TypeScript, Zod, JWT, bcryptjs, express-rate-limit, swagger-ui-express |
| Database | PostgreSQL (Neon), Prisma ORM 7 dan Prisma Migrate |
| Frontend | React, TypeScript, Vite, React Router, Tailwind CSS 4 |
| Tes | Vitest, Supertest |
| Deploy | Render (backend), Vercel (frontend), Neon (database) |

## Struktur Repo

```
employee-management-system/
├── backend/
│   ├── prisma/              # schema.prisma dan folder migrations
│   ├── src/
│   │   ├── routes/          # auth, departments, employees, audit-logs
│   │   ├── middleware/      # auth (JWT dan role), rate limiter, error handler
│   │   ├── docs/            # spesifikasi OpenAPI untuk Swagger
│   │   ├── lib/             # koneksi Prisma
│   │   ├── utils/           # helper (CSV, audit, validasi ID, AppError)
│   │   ├── app.ts           # konfigurasi aplikasi Express
│   │   ├── index.ts         # titik masuk server
│   │   └── seed.ts          # membuat akun admin dan viewer
│   └── tests/               # tes integrasi dan unit
└── frontend/
    └── src/
        ├── auth/            # context, provider, route yang dilindungi
        ├── components/      # layout dan komponen bersama
        ├── lib/             # API client dan hook
        └── pages/           # login, daftar, detail, form
```

## Skema Database (ERD)

```mermaid
erDiagram
    DEPARTMENTS ||--o{ EMPLOYEES : "memiliki"
    USERS ||--o{ AUDIT_LOGS : "melakukan"

    DEPARTMENTS {
        int id PK
        string name UK
        datetime createdAt
        datetime updatedAt
    }

    EMPLOYEES {
        int id PK
        string name
        string email UK
        string phone
        string position
        string status "ACTIVE atau INACTIVE"
        datetime hireDate
        int departmentId FK
        datetime createdAt
        datetime updatedAt
    }

    USERS {
        int id PK
        string name
        string email UK
        string passwordHash "hasil bcrypt"
        string role "ADMIN atau VIEWER"
        datetime createdAt
        datetime updatedAt
    }

    AUDIT_LOGS {
        int id PK
        int userId FK
        string action "CREATE, UPDATE, atau DELETE"
        string entity "employee atau department"
        int entityId "ID data yang berubah"
        json changes "data baru, atau before dan after"
        datetime createdAt
    }
```

Catatan desain:
- `audit_logs.entityId` sengaja bukan foreign key. Satu tabel log mencatat beberapa jenis data, dan log harus tetap ada walaupun data aslinya sudah dihapus.
- Department yang masih memiliki karyawan tidak bisa dihapus (status 409).
- Skema dibuat dan diubah sepenuhnya lewat migration di `backend/prisma/migrations`.

## Daftar Endpoint

Semua endpoint selain `/health`, `/api-documentation`, dan `POST /auth/login` membutuhkan header `Authorization: Bearer <token>`.

| Method | URL | Akses | Keterangan |
|---|---|---|---|
| GET | `/health` | Publik | Status server dan koneksi database |
| GET | `/api-documentation` | Publik | Swagger UI |
| POST | `/auth/login` | Publik | Login, mengembalikan token JWT |
| GET | `/auth/me` | Login | Identitas pengguna dari token |
| GET | `/departments` | Login | Daftar department beserta jumlah karyawan |
| POST | `/departments` | Admin | Tambah department |
| PUT | `/departments/:id` | Admin | Ubah department |
| DELETE | `/departments/:id` | Admin | Hapus department (jika tidak punya karyawan) |
| GET | `/employees` | Login | Daftar karyawan dengan search, filter, sorting, pagination |
| GET | `/employees/export` | Login | Unduh CSV (filter dan sorting sama dengan daftar, tanpa pagination) |
| GET | `/employees/:id` | Login | Detail karyawan |
| POST | `/employees` | Admin | Tambah karyawan |
| PUT | `/employees/:id` | Admin | Ubah karyawan |
| DELETE | `/employees/:id` | Admin | Hapus karyawan |
| GET | `/audit-logs` | Admin | Riwayat perubahan data |

**Query untuk `GET /employees`**

| Parameter | Keterangan | Default |
|---|---|---|
| `page` | Nomor halaman | `1` |
| `limit` | Jumlah data per halaman (maksimal 100) | `10` |
| `search` | Cari di nama, email, dan jabatan (tidak peduli huruf besar-kecil) | - |
| `departmentId` | Filter department | - |
| `status` | `ACTIVE` atau `INACTIVE` | - |
| `sortBy` | `name`, `email`, `position`, `hireDate`, `createdAt` | `createdAt` |
| `order` | `asc` atau `desc` | `desc` |

**Query untuk `GET /audit-logs`:** `page`, `limit` (maksimal 100, default 20), `entity`, `action` (`CREATE`, `UPDATE`, `DELETE`), `userId`.

**Format respons**

```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 } }
```

```json
{ "success": false, "message": "Validasi gagal", "errors": [{ "field": "email", "message": "Format email tidak valid" }] }
```

| Status | Arti |
|---|---|
| 200, 201 | Berhasil |
| 400 | Input tidak valid |
| 401 | Token tidak ada, tidak valid, atau kedaluwarsa |
| 403 | Role tidak punya akses |
| 404 | Data atau endpoint tidak ditemukan |
| 409 | Data bentrok (misalnya email sudah dipakai) |
| 429 | Terlalu banyak request |
| 503 | Database tidak terjangkau (`/health`) |

Contoh lengkap beserta tombol **Try it out** tersedia di halaman `/api-documentation`.

## Menjalankan di Komputer Lokal

### Prasyarat
- Node.js 22 atau lebih baru
- Git
- Database PostgreSQL. Cara termudah: akun gratis di [Neon](https://neon.tech)

### 1. Ambil kode

```bash
git clone https://github.com/yoeljulianto/employee-management-system.git
cd employee-management-system
```

### 2. Backend

```bash
cd backend
npm install
```

Salin `.env.example` menjadi `.env`, lalu isi:

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL. Di Neon, pakai koneksi langsung (matikan *Connection pooling*), contoh: `postgresql://user:password@host/dbname?sslmode=verify-full` |
| `JWT_SECRET` | Teks acak yang panjang. Buat dengan: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CORS_ORIGIN` | (Opsional) Alamat frontend yang diizinkan, pisahkan dengan koma. Kosong berarti semua alamat diizinkan |
| `PORT` | (Opsional) Port server, default `3000` |

Terapkan migration, buat Prisma Client, isi akun awal, lalu jalankan:

```bash
npx prisma migrate deploy
npx prisma generate
npm run seed
npm run dev
```

Server berjalan di `http://localhost:3000`. Cek `http://localhost:3000/health` dan `http://localhost:3000/api-documentation`.

`npm run seed` membuat akun admin dan viewer (lihat bagian Akun demo) dan aman dijalankan berulang kali.

> Setiap kali `prisma/schema.prisma` diubah, jalankan `npx prisma migrate dev --name nama_perubahan` lalu `npx prisma generate`.

### 3. Frontend

Buka terminal baru:

```bash
cd frontend
npm install
npm run dev
```

Buka alamat yang tertera di terminal (biasanya `http://localhost:5173`). Frontend memakai backend di `http://localhost:3000` (diatur di `frontend/.env.development`).

## Menjalankan Tes

Tes backend adalah tes integrasi: memanggil API sungguhan dan menyimpan data ke database. Karena itu tes **wajib memakai database terpisah**, bukan database utama.

1. Buat database khusus tes. Di Neon: **Branches** → **Create branch** dengan nama `test`, lalu salin connection string-nya (koneksi langsung, tanpa pooling)
2. Buat file `backend/.env.test`:

   ```
   DATABASE_URL="postgresql://...connection_string_database_tes..."
   ```

3. Jalankan:

   ```bash
   cd backend
   npm test
   ```

Hasil yang diharapkan: **7 file dan 52 tes lulus**. Cakupannya meliputi login dan hak akses admin atau viewer, validasi, CRUD karyawan dan department, search, filter, sorting, pagination, export CSV, audit log (termasuk memastikan request yang gagal tidak meninggalkan log), dan rate limiting.

Catatan:
- Tes menolak berjalan kalau `DATABASE_URL` di `.env.test` sama dengan di `.env`, supaya data utama tidak tersentuh
- Data yang dibuat tes diberi awalan `test-` atau `Test ` dan dibersihkan otomatis
- Sebelum tes dimulai, database tes "dibangunkan" lebih dulu. Kalau database sedang tertidur, run pertama bisa memakan waktu agak lama
- `npm run test:watch` menjalankan tes dalam mode pantau

Untuk frontend, pengecekan dilakukan lewat `npm run build` (termasuk pemeriksaan TypeScript) dan `npm run lint`.

## Deployment

| Bagian | Platform | Pengaturan |
|---|---|---|
| Database | Neon (free tier) | Branch `production` |
| Backend | Render (free tier) | Root Directory `backend`; Build: `npm install --include=dev && npx prisma generate && npm run build && npx prisma migrate deploy`; Start: `npm start`; Health check: `/health` |
| Frontend | Vercel (free tier) | Root Directory `frontend`; framework Vite; `frontend/vercel.json` mengarahkan semua alamat ke `index.html` agar refresh di halaman dalam tidak 404 |

Environment variable di Render: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (alamat frontend), dan `NODE_VERSION`. Alamat API untuk frontend production disimpan di `frontend/.env.production` (`VITE_API_URL`).

Migration diterapkan otomatis setiap deploy backend lewat `prisma migrate deploy`.

## Keputusan Teknis

- **Prisma Migrate** untuk seluruh perubahan skema, tidak ada `CREATE TABLE` manual
- **Zod** untuk validasi input di server, dengan format error per field
- **Audit log di dalam transaksi database**: perubahan data dan pencatatan log berhasil atau gagal bersama-sama, sehingga tidak ada data berubah tanpa jejak
- **Pesan login yang sama** untuk "email tidak terdaftar" dan "password salah", agar tidak membocorkan email mana yang terdaftar
- **Rate limiting dua lapis**: 300 request per 15 menit per IP untuk seluruh API, dan 10 percobaan login gagal per 15 menit per IP (login yang berhasil tidak dihitung)
- **Pencegahan CSV injection** pada export: nilai yang diawali `=`, `+`, `-`, atau `@` diberi awalan `'`
- **Whitelist kolom sorting** agar client tidak bisa mengurutkan berdasarkan kolom sembarangan
- **CORS dibatasi** ke alamat frontend lewat environment variable
- Penjagaan role dilakukan di backend (403). Penyembunyian tombol di frontend hanya untuk tampilan
