# SPK Seleksi Siswa (Metode SAW)

Aplikasi web sistem pendukung keputusan untuk menyeleksi siswa (siswa berprestasi, penerima beasiswa, dan seleksi
lain) dengan metode Simple Additive Weighting. Dirancang umum sehingga bisa dipakai sekolah mana pun, jenjang SD/MI
sampai SMA/MA/SMK. Acuan lengkap keputusan teknis ada di [PLAN.md](PLAN.md).

**Daftar isi**

1. [Panduan setup di komputer lain](#panduan-setup-di-komputer-lain)
2. [Mulai pakai: data demo atau sekolah sendiri](#mulai-pakai-data-demo-atau-sekolah-sendiri)
3. [Pemakaian sehari-hari](#pemakaian-sehari-hari)
4. [Mengatasi masalah](#mengatasi-masalah)
5. [Bisa disesuaikan per sekolah](#bisa-disesuaikan-per-sekolah)
6. [10 modul](#10-modul)
7. [Untuk pengembang](#untuk-pengembang)

---

## Panduan setup di komputer lain

Panduan ini berlaku untuk Windows, macOS, dan Linux. Perintah ditulis untuk terminal (Windows: PowerShell atau
Command Prompt; macOS/Linux: Terminal).

### 1. Pasang perangkat yang dibutuhkan

| Perangkat | Versi | Keterangan |
|---|---|---|
| [Git](https://git-scm.com/downloads) | terbaru | Untuk mengunduh kode |
| [Node.js](https://nodejs.org/) | **24 LTS** (minimal 22.18) | Sudah termasuk `npm` |
| Database PostgreSQL | 15 ke atas | Pilih salah satu cara di langkah 4: **Docker** (disarankan) atau PostgreSQL biasa |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | terbaru | Hanya jika memakai cara Docker |

Cek versi setelah dipasang:

```bash
git --version
node --version
npm --version
```

`node --version` harus menampilkan `v22.18` atau lebih baru (disarankan `v24.x`).

### 2. Unduh kode

```bash
git clone https://github.com/rendydev404/spk.git
cd spk
```

### 3. Pasang dependensi

```bash
npm install
```

Butuh koneksi internet dan beberapa menit pada pemasangan pertama.

### 4. Siapkan database PostgreSQL

Pilih **satu** cara.

#### Cara A: Docker (disarankan)

Pastikan Docker Desktop sudah berjalan, lalu:

```bash
docker compose up -d db
```

Perintah ini membuat database `spk` (user `spk`, password `spk`) di port **5433** komputer Anda. Port 5433 dipakai
agar tidak bentrok dengan PostgreSQL lain yang mungkin sudah terpasang di port 5432. Data tersimpan di volume Docker
`spk-pg` dan tetap ada walau komputer dimatikan.

#### Cara B: PostgreSQL biasa (tanpa Docker)

Pasang PostgreSQL 15 ke atas dari [postgresql.org/download](https://www.postgresql.org/download/), lalu buat user
dan database (sesuaikan password):

```bash
psql -U postgres -c "CREATE USER spk WITH PASSWORD 'ganti-password-ini';"
psql -U postgres -c "CREATE DATABASE spk OWNER spk;"
```

Di Windows, `psql` ada di folder instalasi PostgreSQL (misal `C:\Program Files\PostgreSQL\17\bin`), atau gunakan
pgAdmin. Catat port PostgreSQL Anda (biasanya **5432**) untuk langkah berikutnya.

### 5. Buat file konfigurasi `.env`

Salin contoh konfigurasi:

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env

# Windows (Command Prompt)
copy .env.example .env
```

Buat kunci rahasia acak:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Buka `.env` dengan editor teks, lalu isi:

```dotenv
# Cara A (Docker): biarkan seperti ini
DATABASE_URL=postgres://spk:spk@localhost:5433/spk
# Cara B (PostgreSQL biasa): sesuaikan password dan port, contoh:
# DATABASE_URL=postgres://spk:ganti-password-ini@localhost:5432/spk

# Tempel hasil perintah node di atas (minimal 32 karakter)
BETTER_AUTH_SECRET=hasil-perintah-node-di-atas

# Alamat yang dipakai untuk membuka aplikasi di browser
BETTER_AUTH_URL=http://localhost:3100
```

`BETTER_AUTH_SECRET` wajib unik per instalasi. Jangan bagikan file `.env` dan jangan masukkan ke Git (sudah
diabaikan oleh `.gitignore`).

### 6. Buat tabel database

```bash
npm run db:migrate
```

Jika berhasil muncul tulisan `Migrasi selesai`.

### 7. Build dan jalankan

```bash
npm run build
npm start
```

Buka **http://localhost:3100** di browser. Build butuh koneksi internet (untuk mengunduh font) dan beberapa menit
pada percobaan pertama. Untuk mematikan aplikasi, tekan `Ctrl + C` di terminal.

> Alternatif untuk pengembangan: `npm run dev` (tanpa build, tetapi setiap halaman dikompilasi saat pertama dibuka
> sehingga terasa lambat di awal).

---

## Mulai pakai: data demo atau sekolah sendiri

### Pilihan 1: Sekolah sendiri (data kosong)

Langsung buka aplikasi setelah langkah 7. Karena belum ada pengguna, aplikasi menampilkan halaman **Setup awal**:
isi identitas sekolah dan buat akun admin pertama. Halaman ini tertutup otomatis setelah dipakai.

Urutan pengisian berikutnya (semua bisa lewat impor Excel dengan template yang disediakan di tiap halaman):

1. **Pengaturan Sekolah**: lengkapi jenjang, logo, nama seleksi, dan penandatangan laporan.
2. **Pengguna**: impor akun wali kelas dan kepala sekolah. Password sementara ditampilkan sekali; berikan ke
   masing-masing pengguna, mereka wajib menggantinya saat pertama masuk.
3. **Periode**: buat periode baru, pilih kriteria default, kosong, atau salin dari periode lain.
4. **Kelas**: impor nama kelas, tingkat, dan username wali kelas.
5. **Data Siswa**: impor siswa beserta kelasnya.
6. **Kriteria** dan **Bobot Kriteria**: sesuaikan dengan kebutuhan sekolah (total bobot 100%).
7. **Data Alternatif**: tentukan siswa yang ikut seleksi, lalu buka penilaian di halaman periode.
8. Wali kelas mengisi **Penilaian Siswa**, admin menjalankan **Perhitungan SAW** dan mengajukan, kepala sekolah
   memvalidasi, lalu **Laporan** siap dicetak.

### Pilihan 2: Data demo (untuk mencoba)

```bash
npm run db:seed
```

> **Perhatian:** `db:seed` **menghapus semua data** lalu mengisi data contoh. Jangan jalankan di komputer yang
> sudah berisi data sekolah sungguhan.

| Username | Peran |
|---|---|
| `admin` | Admin |
| `kepsek` | Kepala Sekolah |
| `wali1`, `wali2`, `wali3` | Wali Kelas (XI IPA 1, XI IPA 2, X IPS 1) |

Password semua akun demo: `spk-demo-2026`.

Isi data demo: periode 2025/2026 Ganjil (sudah Final, ada hasil) dan 2025/2026 Genap (tahap Penilaian, nilai
lengkap). Kelas XI IPA 1 berisi contoh perhitungan PLAN bagian 3.3: hitung "per kelas" menghasilkan urutan Citra,
Aditya, Dimas, Bunga, Eka (V tertinggi 0,8796).

Untuk kembali ke data kosong (agar muncul Setup awal lagi), lihat [Mengosongkan semua data](#mengosongkan-semua-data).

---

## Pemakaian sehari-hari

```bash
# Cara A: nyalakan database (Docker Desktop harus berjalan)
docker compose up -d db

# Jalankan aplikasi (build cukup sekali, ulangi hanya setelah kode diperbarui)
npm start
```

### Memperbarui ke versi terbaru

```bash
git pull
npm install
npm run db:migrate
npm run build
npm start
```

### Backup dan restore database

```bash
# Backup (Cara A, Docker)
docker compose exec -T db pg_dump -U spk -Fc spk > backup-spk.dump

# Restore (menimpa data yang ada)
docker compose exec -T db pg_restore -U spk -d spk --clean --if-exists < backup-spk.dump
```

Cara B: jalankan `pg_dump` / `pg_restore` langsung dengan `-h localhost -p 5432 -U spk`.

### Dibuka dari komputer lain di jaringan sekolah

Aplikasi bisa diakses dari komputer lain di jaringan yang sama. Cari alamat IP komputer server (misal
`192.168.1.10`), lalu ubah `.env`:

```dotenv
BETTER_AUTH_URL=http://192.168.1.10:3100
```

Jalankan ulang `npm start`, lalu semua pengguna membuka `http://192.168.1.10:3100`. Login hanya bekerja jika
alamat yang dibuka di browser sama dengan `BETTER_AUTH_URL`. Izinkan port 3100 di firewall jika perlu.

### Mengosongkan semua data

```bash
# Cara A (Docker): hapus database beserta volumenya, lalu buat ulang
docker compose down -v
docker compose up -d db
npm run db:migrate
```

Cara B: hapus lalu buat ulang database `spk`, kemudian `npm run db:migrate`.

---

## Mengatasi masalah

| Gejala | Penyebab dan solusi |
|---|---|
| `npm run db:migrate` gagal `ECONNREFUSED` | Database belum menyala. Cara A: jalankan Docker Desktop lalu `docker compose up -d db`. Cara B: pastikan service PostgreSQL berjalan dan port di `DATABASE_URL` benar. |
| `password authentication failed` | User/password di `DATABASE_URL` tidak cocok dengan database. |
| `port is already allocated` saat `docker compose up` | Port 5433 sudah dipakai. Ubah `127.0.0.1:5433:5432` di `docker-compose.yml` (misal ke 5434) dan sesuaikan `DATABASE_URL`. |
| Error `BETTER_AUTH_SECRET minimal 32 karakter` | Isi `BETTER_AUTH_SECRET` di `.env` dengan hasil perintah pembuat kunci di langkah 5. |
| Login selalu gagal atau kembali ke halaman login | Alamat di browser berbeda dengan `BETTER_AUTH_URL` (misal membuka `127.0.0.1` padahal diisi `localhost`). Samakan, lalu jalankan ulang aplikasi. |
| `Terlalu banyak percobaan` saat login | Pengaman login: maksimal 5 percobaan per menit. Tunggu satu menit. |
| `Port 3100 is in use` | Aplikasi lain memakai port itu. Tutup aplikasinya, atau jalankan `npx next start -p 3200` dan ubah `BETTER_AUTH_URL` ke port tersebut. |
| `npm run build` gagal mengunduh font | Build butuh internet untuk font Google. Sambungkan internet lalu ulangi. |
| `Unsupported engine` atau error sintaks saat `db:migrate` | Versi Node terlalu lama. Pasang Node 24 LTS. |
| Lupa password admin | Admin lain bisa reset di menu Pengguna. Jika tidak ada admin lain dan data boleh hilang, kosongkan data lalu Setup awal lagi. |

---

## Bisa disesuaikan per sekolah

- **Profil sekolah**: nama, jenjang, NPSN, alamat, kontak, logo kop laporan.
- **Nama seleksi**: misal "Siswa Berprestasi" atau "Penerima Beasiswa"; tampil di aplikasi dan judul laporan.
- **Penandatangan**: jabatan (Kepala Sekolah/Kepala Madrasah), nama, dan jenis nomor induk (NIP/NIY/NUPTK).
- **Tingkat kelas** mengikuti jenjang (SD 1-6, SMP 7-9, SMA 10-12).
- **Kriteria bebas**: jumlah, nama, jenis benefit/cost, tipe input (angka, rentang yang dikonversi, pilihan),
  skala konversi, dan bobot (persen atau skala kepentingan 1-5). Bisa mulai kosong, dari usulan default, atau
  disalin dari periode sebelumnya.
- **Cakupan peringkat** (sekolah, per tingkat, per kelas) dan **kuota** per periode.
- **Impor Excel** untuk pengguna, kelas, siswa, dan nilai, masing-masing dengan template.

## 10 modul

| No | Modul | Halaman |
|---|---|---|
| 1 | Login dan Autentikasi | `/login`, `/setup`, `/akun`, `/pengguna` |
| 2 | Dashboard | `/dashboard` |
| 3 | Manajemen Data Siswa | `/siswa`, `/kelas`, `/periode` |
| 4 | Manajemen Data Kriteria | `/periode/[id]/kriteria` |
| 5 | Manajemen Bobot Kriteria | `/periode/[id]/bobot` |
| 6 | Manajemen Data Alternatif | `/alternatif` |
| 7 | Penilaian Siswa | `/penilaian` |
| 8 | Perhitungan Metode SAW | `/perhitungan` |
| 9 | Hasil Perangkingan | `/hasil`, `/validasi` |
| 10 | Laporan Hasil Seleksi | `/laporan`, `/audit`, `/pengaturan` |

---

## Untuk pengembang

**Stack**: Next.js 16 (App Router), React 19, TypeScript 7, Tailwind CSS v4, PostgreSQL + Drizzle ORM, Better Auth,
Radix UI, exceljs, Vitest, Playwright, Biome.

| Skrip | Fungsi |
|---|---|
| `npm run dev` | Dev server (Turbopack) di port 3100 |
| `npm run build` / `npm start` | Build dan server production (type-check TS 7 ikut saat build) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Biome |
| `npm test` | Unit test (mesin SAW, konversi skala) |
| `npm run test:e2e` | E2E Playwright (butuh server jalan di port 3100 dan `npm run db:seed` segar) |
| `npm run db:generate` | Buat file migrasi dari perubahan skema di `src/db/schema` |
| `npm run db:migrate` | Terapkan migrasi |
| `npm run db:seed` | Isi data demo (menghapus semua data) |

E2E memakai Chromium Playwright: pasang dengan `npx playwright install chromium`, atau arahkan ke Chromium yang sudah
ada: `PW_CHROMIUM_PATH=/path/ke/chrome-headless-shell npm run test:e2e`.

**Catatan keamanan**

- Hak akses dicek di server (server action, route handler, query), termasuk kepemilikan kelas wali kelas.
- Rate limit login 5 percobaan/menit aktif di production (`npm start`).
- Akun baru dan reset password memakai password sementara yang wajib diganti saat masuk.
- Setup awal hanya bisa dipakai saat database belum punya pengguna.
