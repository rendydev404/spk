# SPK Pemilihan Siswa Berprestasi (Metode SAW)

Aplikasi web sistem pendukung keputusan untuk memilih siswa berprestasi dengan metode Simple Additive Weighting.
Acuan lengkap keputusan teknis ada di [PLAN.md](PLAN.md).

## 10 modul

| No | Modul | Halaman |
|---|---|---|
| 1 | Login dan Autentikasi | `/login`, `/akun`, `/pengguna` |
| 2 | Dashboard | `/dashboard` |
| 3 | Manajemen Data Siswa | `/siswa`, `/kelas`, `/periode` |
| 4 | Manajemen Data Kriteria | `/periode/[id]/kriteria` |
| 5 | Manajemen Bobot Kriteria | `/periode/[id]/bobot` |
| 6 | Manajemen Data Alternatif | `/alternatif` |
| 7 | Penilaian Siswa | `/penilaian` |
| 8 | Perhitungan Metode SAW | `/perhitungan` |
| 9 | Hasil Perangkingan | `/hasil`, `/validasi` |
| 10 | Laporan Hasil Seleksi | `/laporan`, `/audit`, `/pengaturan` |

## Stack

Next.js 16 (App Router), React 19, TypeScript 7, Tailwind CSS v4, PostgreSQL + Drizzle ORM, Better Auth, Radix UI,
exceljs, Vitest, Playwright, Biome.

## Menjalankan di lokal

Butuh Node 24+ dan Docker.

```bash
cp .env.example .env          # isi BETTER_AUTH_SECRET dengan string acak panjang
docker compose up -d db       # PostgreSQL di port 5433
npm install
npm run db:migrate
npm run db:seed               # data demo (menghapus semua data!)
npm run dev                   # http://localhost:3100
```

### Akun demo

| Username | Peran |
|---|---|
| `admin` | Admin |
| `kepsek` | Kepala Sekolah |
| `wali1`, `wali2`, `wali3` | Wali Kelas (XI IPA 1, XI IPA 2, X IPS 1) |

Password semua akun demo: `spk-demo-2026`. Hanya untuk lokal; jangan jalankan seed di production.

Data demo: periode 2025/2026 Ganjil (Final, sudah ada hasil) dan 2025/2026 Genap (tahap Penilaian, nilai lengkap).
Kelas XI IPA 1 berisi data contoh perhitungan PLAN bagian 3.3 sehingga hitung "per kelas" menghasilkan urutan
Citra, Aditya, Dimas, Bunga, Eka (V tertinggi 0,8796).

## Skrip

| Skrip | Fungsi |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Build dan server production (type-check TS 7 ikut saat build) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Biome |
| `npm test` | Unit test (mesin SAW, konversi skala) |
| `npm run test:e2e` | E2E Playwright (butuh server jalan di port 3100 dan seed segar) |
| `npm run db:generate` / `db:migrate` / `db:seed` | Migrasi dan seed |

E2E memakai Chromium bawaan Playwright. Jika revisinya belum terunduh, arahkan ke Chromium yang ada:
`PW_CHROMIUM_PATH=/path/ke/chrome-headless-shell npm run test:e2e`.

## Catatan keamanan

- Hak akses dicek di server (server action, route handler, query), termasuk kepemilikan kelas wali kelas.
- Rate limit login 5 percobaan/menit aktif di production.
- Akun baru dan reset password memakai password sementara yang wajib diganti saat masuk.
