# Plan: SPK Pemilihan Siswa Berprestasi (Metode SAW), berbasis web

Dokumen ini adalah acuan utama pengerjaan. Semua keputusan teknis, skema database, alur, dan urutan kerja ada di sini. Kalau ada perubahan keputusan, ubah dokumen ini dulu baru kodenya.

**Keputusan yang sudah diambil**

| Hal | Keputusan |
|---|---|
| Stack | Next.js 16 (App Router) + TypeScript 7 (native) + PostgreSQL |
| Pengguna | Admin, Wali Kelas, Kepala Sekolah |
| Kriteria | Pakai usulan default (bagian 4), bisa diubah admin per periode |
| Metode | Simple Additive Weighting (SAW) |

---

## Daftar isi

1. Tujuan dan ruang lingkup
2. Aktor dan hak akses
3. Metode SAW: rumus, aturan, contoh hitung
4. Kriteria default dan skala konversi
5. Alur bisnis per periode
6. Stack dan arsitektur
7. Skema database
8. Modul dan fitur (dengan kriteria selesai)
9. Peta halaman (routes)
10. Desain mesin SAW (kode)
11. Aturan validasi dan bisnis
12. UI/UX dan design system
13. Keamanan dan privasi data
14. Performa: target dan cara ukur
15. Laporan dan ekspor
16. Strategi pengujian
17. Struktur folder
18. Lingkungan, deploy, backup
19. Roadmap dan checklist per fase
20. Dokumen pendukung skripsi
21. Risiko dan mitigasi
22. Hal yang masih perlu dikonfirmasi

---

## 1. Tujuan dan ruang lingkup

### Masalah
Pemilihan siswa berprestasi di sekolah sering dilakukan manual (rekap Excel, diskusi guru), sehingga lambat, sulit diaudit, dan rawan subjektif. Sistem ini membantu sekolah memberi peringkat siswa secara objektif berdasarkan beberapa kriteria berbobot, dengan proses yang bisa ditelusuri langkah demi langkah.

### Tujuan
- Mengelola data siswa, kelas, periode penilaian, kriteria, bobot, dan alternatif (siswa yang diikutkan seleksi).
- Wali kelas menginput nilai siswa di kelasnya.
- Sistem menghitung peringkat dengan metode SAW dan menampilkan setiap langkahnya (matriks keputusan, normalisasi, nilai preferensi).
- Kepala sekolah memvalidasi dan menetapkan hasil.
- Hasil bisa dicetak (PDF) dan diekspor (Excel).

### Termasuk (in scope)
- Autentikasi dan otorisasi berbasis role.
- CRUD master data: periode/tahun ajaran, kelas, siswa, pengguna.
- Kriteria dan sub-kriteria (skala konversi) per periode, bobot dalam persen (atau skala kepentingan 1-5 yang dinormalisasi).
- Data alternatif per periode (kode A1..An).
- Input penilaian: form grid per kelas dan impor Excel.
- Perhitungan SAW dengan cakupan sekolah, per tingkat, atau per kelas.
- Riwayat perhitungan (snapshot), validasi kepala sekolah, kunci periode.
- Laporan cetak dan ekspor Excel.
- Dashboard ringkasan dan audit log.

Semua fitur di atas dikelompokkan ke dalam **10 modul sistem dari klien** (bagian 8).

### Tidak termasuk (out of scope, bisa jadi pengembangan lanjut)
- Integrasi otomatis dengan Dapodik atau e-Rapor.
- Aplikasi mobile native.
- Login siswa/orang tua.
- Metode lain (AHP, TOPSIS) selain sebagai catatan pengembangan.
- Notifikasi email/WhatsApp.

---

## 2. Aktor dan hak akses

### Deskripsi role
- **Admin** (operator/TU): kelola semua master data, pengguna, periode, kriteria, bobot; menjalankan perhitungan; bisa membuka kembali periode yang sudah final (wajib alasan, tercatat di audit log).
- **Wali Kelas**: melihat siswa di kelas yang diampu pada periode aktif; menginput dan mengubah nilai siswa kelasnya selama periode berstatus `PENILAIAN`; melihat hasil kelasnya setelah final.
- **Kepala Sekolah**: melihat semua data (baca saja), melihat detail perhitungan, memvalidasi (menyetujui/menolak dengan catatan) hasil, mencetak laporan.

### Matriks hak akses

| Fitur | Admin | Wali Kelas | Kepsek |
|---|---|---|---|
| Dashboard | Semua | Kelasnya | Semua |
| Kelola pengguna | CRUD | - | - |
| Kelola periode | CRUD, ubah status | Lihat | Lihat |
| Kelola kelas | CRUD | Lihat kelasnya | Lihat |
| Kelola siswa | CRUD, impor | Lihat kelasnya | Lihat |
| Kriteria dan sub-kriteria | CRUD (saat DRAFT) | Lihat | Lihat |
| Bobot kriteria | Ubah (saat DRAFT) | Lihat | Lihat |
| Data alternatif | CRUD (saat DRAFT) | Lihat kelasnya | Lihat |
| Input penilaian | Semua kelas | Kelasnya, saat PENILAIAN | Lihat |
| Jalankan perhitungan | Ya | - | - |
| Lihat detail perhitungan | Ya | Kelasnya (setelah FINAL) | Ya |
| Validasi hasil | - | - | Ya |
| Buka ulang periode FINAL | Ya (dengan alasan) | - | - |
| Laporan PDF/Excel | Ya | Kelasnya | Ya |
| Audit log | Lihat | - | Lihat |

Aturan penting: **hak akses dicek di server** (server action, route handler, query), bukan hanya disembunyikan di UI. Wali kelas juga dicek kepemilikan kelasnya (`kelas.wali_kelas_id = user.id`) di setiap query dan mutasi.

---

## 3. Metode SAW

### 3.1 Konsep
SAW (Simple Additive Weighting) mencari jumlah terbobot dari rating kinerja setiap alternatif (siswa) pada semua kriteria. Langkahnya:

1. Tentukan kriteria `C_j` beserta jenisnya (benefit atau cost) dan bobot `W_j`, dengan `ΣW_j = 1`.
2. Bentuk matriks keputusan `X` (m siswa × n kriteria), isinya nilai `x_ij` (setelah konversi skala bila ada).
3. Normalisasi matriks menjadi `R`:
   - Benefit (makin besar makin baik): `r_ij = x_ij / max_i(x_ij)`
   - Cost (makin kecil makin baik): `r_ij = min_i(x_ij) / x_ij`
4. Hitung nilai preferensi: `V_i = Σ_j (W_j × r_ij)`
5. Urutkan `V_i` dari terbesar. Peringkat 1 adalah siswa paling berprestasi.

### 3.2 Hal yang sering salah dan cara sistem menanganinya

| Kasus | Penanganan |
|---|---|
| Kriteria cost dengan nilai 0 (misal 0 hari absen) menyebabkan pembagian dengan nol | Kriteria cost wajib memakai skala konversi dengan nilai minimum 1 (lihat C2). Validasi menolak nilai 0 pada kriteria cost. Mesin SAW melempar error jika menemukan 0. |
| Semua siswa bernilai 0 pada kriteria benefit (max = 0) | Seluruh `r_ij` di kolom itu = 0, tidak NaN. |
| Hanya ada 1 siswa | Semua `r_ij` = 1, peringkat 1. Tetap valid. |
| Total bobot tidak 100% | Perhitungan ditolak. Bobot diinput dalam persen (angka desimal 2 digit) agar penjumlahan tepat 100,00. |
| Ada nilai yang belum diisi | Perhitungan ditolak dan sistem menampilkan daftar siswa/kriteria yang belum lengkap. |
| Nilai preferensi sama (seri) | Tie-break berurutan: (1) `r` pada kriteria berbobot terbesar, (2) nilai mentah C1, (3) nama siswa A-Z. Aturan ini ditampilkan di halaman hasil. |
| Ranking per kelas berbeda dengan ranking sekolah | Normalisasi SAW bergantung pada himpunan alternatif (nilai max/min dihitung dari kelompok yang dibandingkan). Jadi ranking per kelas **harus dihitung ulang** dalam kelompok kelas itu, bukan sekadar memfilter ranking sekolah. Sistem menyediakan pilihan cakupan: sekolah, per tingkat, per kelas. |
| Pembulatan | Hitung dengan presisi penuh, simpan `numeric(10,6)`, tampilkan 4 desimal. Bandingkan seri dengan toleransi `1e-9`. |

### 3.3 Contoh perhitungan (dipakai juga sebagai golden test)

Bobot: C1 30%, C2 15%, C3 20%, C4 20%, C5 15%. Jenis: C2 cost, sisanya benefit. Definisi kriteria di bagian 4.

**Data mentah**

| Siswa | C1 Rata-rata rapor | Absen (hari) | Sikap | Prestasi | Ekskul |
|---|---|---|---|---|---|
| A1 | 88,5 | 2 | Sangat Baik | Provinsi | A |
| A2 | 91,2 | 0 | Baik | Sekolah | B |
| A3 | 85,0 | 4 | Sangat Baik | Nasional | A |
| A4 | 89,7 | 1 | Sangat Baik | Kab/Kota | B |
| A5 | 82,3 | 7 | Baik | Tidak ada | C |

**Matriks keputusan X (setelah konversi skala)**

| Siswa | C1 | C2 | C3 | C4 | C5 |
|---|---|---|---|---|---|
| A1 | 88,5 | 2 | 4 | 4 | 4 |
| A2 | 91,2 | 1 | 3 | 2 | 3 |
| A3 | 85,0 | 3 | 4 | 5 | 4 |
| A4 | 89,7 | 2 | 4 | 3 | 3 |
| A5 | 82,3 | 4 | 3 | 1 | 2 |
| **max/min** | max 91,2 | min 1 | max 4 | max 5 | max 4 |

**Matriks normalisasi R**

| Siswa | C1 | C2 | C3 | C4 | C5 |
|---|---|---|---|---|---|
| A1 | 0,9704 | 0,5000 | 1,0000 | 0,8000 | 1,0000 |
| A2 | 1,0000 | 1,0000 | 0,7500 | 0,4000 | 0,7500 |
| A3 | 0,9320 | 0,3333 | 1,0000 | 1,0000 | 1,0000 |
| A4 | 0,9836 | 0,5000 | 1,0000 | 0,6000 | 0,7500 |
| A5 | 0,9024 | 0,2500 | 0,7500 | 0,2000 | 0,5000 |

**Nilai preferensi V dan peringkat**

`V_A1 = 0,30(0,9704) + 0,15(0,5) + 0,20(1) + 0,20(0,8) + 0,15(1) = 0,8761`

| Peringkat | Siswa | V |
|---|---|---|
| 1 | A3 | 0,8796 |
| 2 | A1 | 0,8761 |
| 3 | A4 | 0,8026 |
| 4 | A2 | 0,7925 |
| 5 | A5 | 0,5732 |

Angka di atas sudah diverifikasi dengan skrip. Contoh ini menarik untuk sidang: A2 punya rapor tertinggi tapi berada di peringkat 4, karena prestasi non-akademik dan sikapnya lebih rendah. Ini menunjukkan penilaian multikriteria bekerja.

---

## 4. Kriteria default dan skala konversi

Admin bisa mengubah semua ini per periode. Default dipakai di seed dan saat membuat periode baru (atau salin dari periode sebelumnya).

| Kode | Kriteria | Jenis | Bobot | Tipe input | Sumber data |
|---|---|---|---|---|---|
| C1 | Rata-rata nilai rapor | Benefit | 30% | Angka 0-100, 2 desimal | Rapor semester |
| C2 | Ketidakhadiran (sakit + izin + alpa) | Cost | 15% | Angka hari, dikonversi ke skala | Rekap absensi |
| C3 | Sikap/perilaku | Benefit | 20% | Pilihan predikat | Penilaian wali kelas/BK |
| C4 | Prestasi non-akademik tertinggi | Benefit | 20% | Pilihan tingkat | Sertifikat lomba |
| C5 | Keaktifan ekstrakurikuler | Benefit | 15% | Pilihan predikat | Nilai ekskul di rapor |

**Sub-kriteria (skala konversi)**

C2 Ketidakhadiran (cost, rentang angka ke skala):

| Rentang hari | Nilai |
|---|---|
| 0 | 1 |
| 1-2 | 2 |
| 3-5 | 3 |
| 6-10 | 4 |
| > 10 | 5 |

C3 Sikap: Sangat Baik = 4, Baik = 3, Cukup = 2, Kurang = 1

C4 Prestasi: Tidak ada = 1, Sekolah = 2, Kabupaten/Kota = 3, Provinsi = 4, Nasional/Internasional = 5

C5 Ekskul: A = 4, B = 3, C = 2, Tidak ikut = 1

Tipe input kriteria ada tiga:
- `ANGKA`: nilai langsung dipakai (C1). Punya batas `min` dan `max`.
- `RENTANG`: angka mentah dikonversi otomatis lewat tabel rentang (C2). Nilai mentah tetap disimpan untuk audit.
- `PILIHAN`: user memilih label, sistem menyimpan nilai skalanya (C3, C4, C5).

---

## 5. Alur bisnis per periode

### 5.1 Status periode (state machine)

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENILAIAN: Admin buka penilaian (bobot = 100%, kriteria valid, alternatif >= 2)
    PENILAIAN --> DRAFT: Admin kembalikan (hanya jika belum ada nilai)
    PENILAIAN --> PERHITUNGAN: Admin tutup penilaian
    PERHITUNGAN --> PENILAIAN: Admin buka lagi input
    PERHITUNGAN --> VALIDASI: Admin ajukan hasil ke Kepsek
    VALIDASI --> PERHITUNGAN: Kepsek tolak (dengan catatan)
    VALIDASI --> FINAL: Kepsek setujui
    FINAL --> PERHITUNGAN: Admin buka ulang (wajib alasan)
    FINAL --> [*]
```

| Status | Yang boleh dilakukan |
|---|---|
| DRAFT | Atur kelas, siswa, kriteria, sub-kriteria, bobot, alternatif |
| PENILAIAN | Wali kelas dan admin input nilai. Kriteria terkunci |
| PERHITUNGAN | Input nilai terkunci. Admin menjalankan perhitungan (boleh berkali-kali, tiap run disimpan) |
| VALIDASI | Semua terkunci. Kepsek meninjau satu hasil yang diajukan |
| FINAL | Read-only. Hasil resmi, laporan bisa dicetak dengan status "Disahkan" |

Hanya satu periode yang boleh berstatus selain DRAFT/FINAL pada satu waktu (periode aktif). Ini dijaga dengan partial unique index (bagian 7).

### 5.2 Alur kerja end-to-end

```mermaid
flowchart TD
    A[Admin buat periode] --> B[Atur kelas dan wali kelas]
    B --> C[Impor/daftarkan siswa ke kelas]
    C --> D[Salin atau atur kriteria dan sub-kriteria]
    D --> D2[Atur bobot kriteria]
    D2 --> E{Bobot = 100%?}
    E -- Tidak --> D2
    E -- Ya --> E2[Tetapkan alternatif]
    E2 --> F[Buka penilaian]
    F --> G[Wali kelas input nilai alternatif kelasnya]
    G --> H{Semua nilai lengkap?}
    H -- Belum --> G
    H -- Ya --> I[Admin tutup penilaian]
    I --> J[Admin pilih cakupan dan jalankan SAW]
    J --> K[Tinjau detail perhitungan]
    K --> L[Ajukan ke Kepsek]
    L --> M{Kepsek setuju?}
    M -- Tolak --> J
    M -- Setuju --> N[FINAL: cetak laporan dan SK]
```

---

## 6. Stack dan arsitektur

### 6.1 Pilihan teknologi

#### Versi inti (dicek di registry npm pada 6 Nov 2026)

| Paket | Versi | Catatan |
|---|---|---|
| `next` | 16.4.5 (latest) | Butuh Node >= 20.9. Mesin ini Node 26, aman |
| `react`, `react-dom` | 19.3.1 | Sesuai peer dependency Next 16 |
| `typescript` | 7.0.2 (latest, rilis Juli 2026) | Compiler native (Go, "Project Corsa"), type-check jauh lebih cepat dari TS 5/6 |
| Node.js | 24 LTS atau 26 | Pakai yang sama di lokal dan deploy |

Versi dipasang persis (`npm i -E`, tanpa `^`) untuk dependensi inti, dan tidak di-upgrade di tengah proyek kecuali patch keamanan.

#### Catatan kompatibilitas TypeScript 7

TypeScript 7 belum punya JavaScript API yang stabil. Paket `typescript@7` hanya mengekspor `tsc` dan modul `unstable/*`, sehingga tool yang memanggil API TypeScript lama bisa bermasalah. Dampaknya ke proyek ini:

| Tool | Status | Keputusan |
|---|---|---|
| `tsc --noEmit` (type-check) | Jalan, inilah keuntungan utama TS 7 | Jadi gerbang type-check di skrip `typecheck` dan CI |
| typescript-eslint 8.72 | Peer dependency `typescript <6.1.0`, tidak mendukung TS 7 | **Tidak pakai ESLint.** Lint dan format memakai **Biome** (tidak bergantung pada API TypeScript, juga jauh lebih cepat) |
| Type-check bawaan `next build` | Belum dipastikan jalan dengan TS 7 | Diverifikasi di Fase 0. Jika gagal, matikan type-check bawaan build (`typescript.ignoreBuildErrors: true`) dan type-check tetap wajib lewat `tsc --noEmit` sebelum build, sehingga keamanan tipe tidak berkurang |
| Next.js (SWC/Turbopack), Vitest, Playwright, drizzle-kit | Transpile sendiri tanpa API TypeScript | Tidak terpengaruh |
| Editor (VS Code) | Pakai ekstensi TypeScript native preview atau `typescript.tsdk` ke `node_modules/typescript` | Diatur di `.vscode/settings.json` |

Opsi `tsconfig.json` yang dipakai: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `moduleResolution: "bundler"`, `verbatimModuleSyntax`, `isolatedModules`, path alias `@/*` ke `src/*`. Opsi yang sudah dihapus di TS 7 (misal `baseUrl` lama, `moduleResolution: "node10"`, target ES5) tidak dipakai.

#### Pilihan per lapisan

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript 7 strict | Server Components mengurangi JS di browser, Server Actions untuk mutasi tanpa bikin API terpisah, Turbopack untuk dev dan build yang cepat |
| Database | PostgreSQL | Tipe `numeric` presisi untuk nilai, constraint dan partial index kuat, JSONB untuk snapshot |
| ORM | Drizzle ORM + drizzle-kit | Ringan, SQL-nya transparan (mudah di-EXPLAIN), migrasi berbasis file |
| Driver | `postgres` (postgres.js) | Cepat, mendukung pooling |
| Auth | Better Auth (username/email + password) | Hash password aman, session di DB, rate limit login bawaan, integrasi Drizzle |
| Validasi | Zod | Satu skema dipakai di client dan server |
| Styling | Tailwind CSS v4 + design tokens (CSS variables) | Tanpa runtime CSS-in-JS, ukuran CSS kecil |
| Komponen aksesibel | Radix UI primitives (hanya paket yang dipakai: Select, Dialog, Popover, Checkbox, RadioGroup, DropdownMenu, Tabs, Toast, Tooltip) | Headless, keyboard dan ARIA sudah benar, kita yang styling. Memenuhi aturan "tanpa kontrol native" |
| Date picker | react-day-picker di dalam Popover Radix | Kecil, aksesibel, bisa di-style penuh |
| Ikon | lucide-react (import per ikon) | SVG konsisten, tree-shakeable. Tanpa emoji |
| Grafik dashboard | SVG custom (bar chart sederhana) | Tidak perlu library chart berat untuk 1-2 grafik |
| Excel impor/ekspor | exceljs (hanya di server) | Tidak membebani bundle client |
| PDF | Halaman cetak HTML + CSS `@media print` (Save as PDF di browser) | Nol dependensi, hasil tajam, mudah diatur kop surat |
| Test unit | Vitest | Cepat, untuk mesin SAW dan validasi |
| Test E2E | Playwright | Alur per role |
| Lint/format | Biome | Satu tool untuk lint dan format, tanpa ketergantungan pada API TypeScript (lihat catatan TS 7) |
| Type-check | `tsc --noEmit` dari TypeScript 7 | Cepat, dijalankan di CI dan sebelum build |

Yang sengaja **tidak** dipakai: library tabel besar (TanStack Table tidak perlu karena pagination di server), library chart, state manager global (Redux/Zustand), UI kit lengkap yang dipasang utuh.

### 6.2 Arsitektur

```mermaid
flowchart LR
    Browser -->|RSC, Server Actions| Next[Next.js App Router]
    Next --> Auth[Better Auth]
    Next --> RBAC[Guard role + kepemilikan kelas]
    RBAC --> Q[Queries / Actions per fitur]
    Q --> SAW[lib/saw: mesin SAW murni]
    Q --> DB[(PostgreSQL)]
    Auth --> DB
```

Prinsip:
- **Server Components sebagai default.** Client Component hanya untuk bagian interaktif (grid input nilai, dialog, select, date picker).
- **Lapisan per fitur**: `queries.ts` (baca), `actions.ts` (mutasi, selalu: cek sesi, cek role, validasi Zod, transaksi DB, tulis audit, `revalidatePath/Tag`), `schemas.ts` (Zod).
- **Mesin SAW adalah fungsi murni** (tanpa akses DB) agar mudah diuji dan dijelaskan di skripsi.
- Mutasi yang menyentuh banyak baris (simpan nilai satu kelas, simpan hasil perhitungan) dilakukan dalam **satu transaksi dan satu pernyataan bulk** (`INSERT ... ON CONFLICT DO UPDATE`), bukan loop per baris.

---

## 7. Skema database

### 7.1 ERD

```mermaid
erDiagram
    users ||--o{ kelas : "wali kelas"
    periode ||--o{ kelas : memiliki
    periode ||--o{ kriteria : memiliki
    kelas ||--o{ kelas_siswa : berisi
    siswa ||--o{ kelas_siswa : terdaftar
    kriteria ||--o{ sub_kriteria : punya
    periode ||--o{ alternatif : memiliki
    siswa ||--o{ alternatif : "diikutkan"
    alternatif ||--o{ penilaian : dinilai
    kriteria ||--o{ penilaian : ""
    periode ||--o{ perhitungan : ""
    perhitungan ||--o{ hasil : menghasilkan
    siswa ||--o{ hasil : ""
    perhitungan ||--o{ validasi : ""
    users ||--o{ audit_log : melakukan
```

### 7.2 Tabel

Tabel `user`, `session`, `account`, `verification` dibuat oleh Better Auth. Kolom tambahan di `user`: `role`, `username`, `aktif`.

**users (tambahan dari Better Auth)**

| Kolom | Tipe | Catatan |
|---|---|---|
| id | text PK | dari Better Auth |
| name | text not null | |
| username | citext unique not null | login |
| email | citext unique null | opsional |
| role | enum `role` (`ADMIN`, `WALI_KELAS`, `KEPSEK`) not null | |
| aktif | boolean default true | nonaktif = tidak bisa login, tidak dihapus |
| created_at, updated_at | timestamptz | |

**periode**

| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| nama | text not null | contoh "2025/2026 Genap" |
| tahun_ajaran | text not null | "2025/2026", check format `^\d{4}/\d{4}$` |
| semester | enum (`GANJIL`, `GENAP`) | |
| status | enum `status_periode` default `DRAFT` | |
| cakupan_default | enum (`SEKOLAH`, `TINGKAT`, `KELAS`) default `SEKOLAH` | |
| kuota | int null | jumlah siswa yang ditetapkan berprestasi per kelompok |
| created_at, updated_at | timestamptz | |

Constraint: unique (`tahun_ajaran`, `semester`). Partial unique index agar hanya satu periode aktif:
`CREATE UNIQUE INDEX periode_satu_aktif ON periode ((true)) WHERE status IN ('PENILAIAN','PERHITUNGAN','VALIDASI');`

**kelas**

| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| periode_id | uuid FK -> periode on delete restrict | kelas melekat ke periode (rombel tiap tahun berubah) |
| nama | text not null | "XI IPA 1" |
| tingkat | smallint not null | check 1..12 |
| wali_kelas_id | text FK -> user null | |

Constraint: unique (`periode_id`, `nama`). Index: (`wali_kelas_id`, `periode_id`).

**siswa**

| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| nis | text unique not null | |
| nisn | char(10) unique null | check 10 digit |
| nama | text not null | |
| jenis_kelamin | enum (`L`, `P`) | |
| tanggal_lahir | date null | |
| aktif | boolean default true | |
| created_at, updated_at | timestamptz | |

Siswa adalah data lintas periode. Pencarian nama: mulai dengan index btree pada `lower(nama)` untuk prefix search. Tambahkan GIN `pg_trgm` hanya jika EXPLAIN ANALYZE pada data realistis menunjukkan scan lambat.

**kelas_siswa** (keanggotaan siswa di kelas pada periode tertentu)

| Kolom | Tipe | Catatan |
|---|---|---|
| kelas_id | uuid FK -> kelas on delete cascade | |
| siswa_id | uuid FK -> siswa on delete restrict | |
| periode_id | uuid FK -> periode | duplikat dari kelas untuk constraint |

PK (`kelas_id`, `siswa_id`). Unique (`periode_id`, `siswa_id`): satu siswa hanya di satu kelas per periode. Index (`siswa_id`).

**kriteria**

| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| periode_id | uuid FK -> periode on delete cascade | kriteria per periode agar riwayat tetap konsisten |
| kode | text not null | "C1" |
| nama | text not null | |
| jenis | enum (`BENEFIT`, `COST`) | |
| bobot | numeric(5,2) not null | persen, check `> 0 and <= 100` |
| tipe_input | enum (`ANGKA`, `RENTANG`, `PILIHAN`) | |
| nilai_min, nilai_max | numeric(8,2) null | untuk ANGKA/RENTANG |
| urutan | smallint | |

Unique (`periode_id`, `kode`). Total bobot = 100 dicek di server action saat menyimpan dan saat pindah status ke PENILAIAN (constraint lintas baris tidak dipaksakan via trigger agar edit bertahap tetap bisa).

**sub_kriteria**

| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| kriteria_id | uuid FK -> kriteria on delete cascade | |
| label | text not null | "Provinsi", "1-2 hari" |
| nilai | numeric(6,2) not null | skala, check `> 0` |
| batas_bawah, batas_atas | numeric(8,2) null | untuk RENTANG (batas_atas null = tak terbatas) |
| urutan | smallint | |

Unique (`kriteria_id`, `label`). Validasi server: rentang tidak tumpang tindih dan tidak berlubang.

**alternatif** (siswa yang diikutkan dalam SPK pada satu periode)

| Kolom | Tipe | Catatan |
|---|---|---|
| periode_id | uuid FK -> periode on delete cascade | |
| siswa_id | uuid FK -> siswa on delete restrict | |
| kode | text not null | "A1", "A2", ... |
| ditambahkan_oleh | text FK -> user | |
| created_at | timestamptz default now() | |

PK (`periode_id`, `siswa_id`). Unique (`periode_id`, `kode`). FK komposit (`periode_id`, `siswa_id`) -> `kelas_siswa` (`periode_id`, `siswa_id`) agar hanya siswa yang terdaftar di kelas periode itu yang bisa jadi alternatif (memakai unique `kelas_siswa(periode_id, siswa_id)` yang sudah ada). Index (`siswa_id`) untuk riwayat siswa.

**penilaian**

| Kolom | Tipe | Catatan |
|---|---|---|
| periode_id | uuid FK | |
| siswa_id | uuid FK | |
| kriteria_id | uuid FK on delete cascade | |
| nilai_mentah | numeric(8,2) null | angka asli (rapor, jumlah hari) |
| sub_kriteria_id | uuid FK null | untuk PILIHAN dan hasil konversi RENTANG |
| nilai | numeric(8,2) not null | nilai akhir yang masuk matriks X |
| diinput_oleh | text FK -> user | |
| updated_at | timestamptz | |

PK (`periode_id`, `siswa_id`, `kriteria_id`) sekaligus index untuk upsert. FK komposit (`periode_id`, `siswa_id`) -> `alternatif` on delete cascade: hanya alternatif yang bisa dinilai, dan mengeluarkan alternatif ikut menghapus nilainya. Index tambahan (`periode_id`, `kriteria_id`) untuk mengambil satu kolom matriks.

**perhitungan** (satu kali "run" SAW)

| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| periode_id | uuid FK | |
| cakupan | enum (`SEKOLAH`, `TINGKAT`, `KELAS`) | |
| dihitung_oleh | text FK -> user | |
| dihitung_pada | timestamptz default now() | |
| snapshot | jsonb not null | kriteria, bobot, sub-kriteria, max/min per kelompok saat dihitung |
| status | enum (`DRAFT`, `DIAJUKAN`, `DISETUJUI`, `DITOLAK`) | |
| jumlah_siswa | int | |

Index (`periode_id`, `dihitung_pada desc`). Partial unique: hanya satu `DISETUJUI` per periode.

**hasil**

| Kolom | Tipe | Catatan |
|---|---|---|
| perhitungan_id | uuid FK on delete cascade | |
| siswa_id | uuid FK | |
| kelompok | text | "SEKOLAH", "Tingkat 11", atau nama kelas |
| normalisasi | jsonb | `{ "C1": 0.9704, ... }` untuk ditampilkan |
| nilai_preferensi | numeric(10,6) | |
| peringkat | int | peringkat dalam kelompok |
| terpilih | boolean | masuk kuota |

PK (`perhitungan_id`, `siswa_id`). Index (`perhitungan_id`, `kelompok`, `peringkat`) untuk tabel ranking berurutan tanpa sort tambahan.

**validasi**

| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| perhitungan_id | uuid FK | |
| kepsek_id | text FK -> user | |
| keputusan | enum (`DISETUJUI`, `DITOLAK`) | |
| catatan | text | wajib jika ditolak |
| created_at | timestamptz | |

**audit_log**

| Kolom | Tipe | Catatan |
|---|---|---|
| id | bigint identity PK | |
| user_id | text FK null | |
| aksi | text | "PENILAIAN_SIMPAN", "BOBOT_UBAH", "PERIODE_STATUS", ... |
| entitas, entitas_id | text | |
| data | jsonb | ringkas: before/after yang relevan saja |
| created_at | timestamptz default now() | |

Index (`created_at desc`), (`entitas`, `entitas_id`). Data audit tidak menyimpan password atau token.

### 7.3 Aturan migrasi
- Semua perubahan skema lewat file migrasi drizzle-kit yang di-commit. Tidak ada `push` di production.
- Aktifkan ekstensi `citext` dan `pgcrypto` (untuk `gen_random_uuid()` jika versi PostgreSQL membutuhkannya).
- Foreign key selalu diberi index di sisi anak jika dipakai untuk join atau delete.
- Hapus data master dibuat `restrict` jika sudah dipakai penilaian; gunakan flag `aktif` sebagai soft-disable.

---

## 8. Modul dan fitur

Struktur modul mengikuti **10 modul sistem dari klien**. Fitur pendukung yang dibutuhkan agar 10 modul itu berjalan benar (pengguna, periode, kelas, validasi kepsek, audit log) ditaruh di bawah modul induknya, bukan sebagai modul terpisah, supaya daftar modul di aplikasi, laporan, dan skripsi tetap 10.

Setiap modul dianggap selesai jika semua kriteria selesai di bawahnya terpenuhi, termasuk test.

| No | Modul (klien) | Fungsi | Isi teknis di plan ini |
|---|---|---|---|
| 1 | Login dan Autentikasi | Mengatur akses pengguna ke sistem | Login, sesi, RBAC, ganti/reset password, **kelola pengguna** |
| 2 | Dashboard | Ringkasan data siswa, kriteria, hasil penilaian | Ringkasan per role, progres, 10 besar |
| 3 | Manajemen Data Siswa | Tambah, ubah, hapus, lihat data siswa | Siswa, impor Excel, **periode dan kelas** (rombel) |
| 4 | Manajemen Data Kriteria | Kelola kriteria penilaian siswa berprestasi | Kriteria (kode, jenis, tipe input) + sub-kriteria/skala konversi |
| 5 | Manajemen Bobot Kriteria | Atur bobot setiap kriteria | Editor bobot (persen atau skala kepentingan 1-5) |
| 6 | Manajemen Data Alternatif | Kelola siswa yang menjadi alternatif SPK | Tabel `alternatif` per periode, kode A1..An |
| 7 | Penilaian Siswa | Input nilai siswa per kriteria | Grid penilaian per kelas, impor nilai Excel |
| 8 | Perhitungan Metode SAW | Normalisasi dan nilai preferensi | Mesin SAW, pra-cek, run + snapshot, langkah demi langkah |
| 9 | Hasil Perangkingan | Urutan peringkat berdasarkan nilai akhir | Ranking per kelompok, **validasi kepsek**, penguncian FINAL |
| 10 | Laporan Hasil Seleksi | Tampilkan dan cetak laporan | Cetak PDF, ekspor Excel, **audit log** |

### Modul 1. Login dan Autentikasi
- Login dengan username + password. Tidak ada registrasi publik; akun dibuat admin.
- Rate limit login (misal 5 percobaan/menit per IP+username), pesan error generik.
- Logout, sesi kedaluwarsa (misal 8 jam idle).
- Hak akses per role (Admin, Wali Kelas, Kepsek) dicek di server lewat `requireRole()` dan `requireKelasAccess()` (bagian 2).
- Ganti password sendiri; admin bisa reset password user (password sementara, wajib ganti saat login).
- **Kelola pengguna (Admin)**: tabel pengguna dengan filter role dan pencarian, pagination server. Tambah/ubah/nonaktifkan pengguna. Tidak bisa menonaktifkan diri sendiri atau admin terakhir.
- **Selesai jika**: user nonaktif tidak bisa login; akses halaman tanpa sesi diarahkan ke `/login`; akses halaman role lain mengembalikan 403/redirect; username unik; aksi kelola pengguna tercatat di audit log.

### Modul 2. Dashboard
- Kartu ringkasan: jumlah siswa, jumlah alternatif periode aktif, jumlah kriteria + status total bobot, status periode aktif.
- Admin/Kepsek: progres penilaian per kelas, 10 besar hasil perangkingan terakhir (bar chart SVG).
- Wali kelas: progres input kelasnya, tautan cepat ke grid penilaian, hasil kelasnya jika FINAL.
- **Selesai jika**: dashboard dimuat dengan maksimal 3-4 query agregat (tanpa N+1), dicek lewat log query.

### Modul 3. Manajemen Data Siswa
- CRUD siswa (tambah, ubah, hapus, lihat detail), pencarian NIS/nama, filter kelas dan status, pagination.
- Hapus: hard delete hanya jika siswa belum pernah menjadi alternatif atau dinilai; selain itu dinonaktifkan (`aktif = false`) dan UI menjelaskan alasannya.
- Impor Excel dari template (NIS, NISN, nama, JK, tanggal lahir, kelas): unggah, **pratinjau dengan error per baris**, lalu konfirmasi. Upsert berdasarkan NIS dalam satu transaksi. Unduh template Excel.
- Detail siswa: biodata, riwayat kelas, riwayat hasil perangkingan.
- **Pendukung: periode dan kelas.**
  - Periode: CRUD periode, ubah status sesuai state machine (tombol aksi hanya muncul jika transisi valid, server tetap memvalidasi). "Salin dari periode sebelumnya": kriteria, sub-kriteria, bobot, opsional struktur kelas.
  - Kelas: CRUD kelas per periode, pilih wali kelas (custom combobox dengan pencarian). Kelola anggota kelas: tambah siswa (multi-select dengan pencarian), pindahkan, keluarkan.
- **Selesai jika**: impor 500 baris selesai < 3 detik di lokal; baris tidak valid tidak ikut tersimpan dan dilaporkan; satu siswa tidak bisa masuk dua kelas di periode yang sama (constraint DB + pesan jelas); transisi status periode ilegal ditolak server dan syaratnya dicek (bobot 100%, minimal 1 kriteria, sub-kriteria lengkap, semua kelas punya wali, minimal 2 alternatif).

### Modul 4. Manajemen Data Kriteria
- Daftar kriteria per periode: kode (C1..Cn), nama, jenis (BENEFIT/COST), tipe input (ANGKA/RENTANG/PILIHAN), nilai min/max. Urutan bisa diatur.
- Editor sub-kriteria (skala konversi): untuk PILIHAN (label + nilai), untuk RENTANG (batas bawah, batas atas, nilai) dengan pengecekan tumpang tindih dan celah.
- Hanya bisa diubah saat periode DRAFT; di status lain tampil read-only dengan keterangan.
- **Selesai jika**: kriteria COST tidak bisa punya sub-kriteria bernilai ≤ 0; kode kriteria unik per periode; kriteria yang dihapus ikut menghapus bobot dan sub-kriterianya (cascade) hanya saat DRAFT.

### Modul 5. Manajemen Bobot Kriteria
- Halaman khusus bobot: satu tabel semua kriteria periode dengan input bobot per baris.
- Dua mode input (sesuai keputusan bagian 22 no. 4): **persen langsung**, atau **skala kepentingan 1-5** yang dinormalisasi otomatis menjadi `W_j = k_j / Σk`. Bobot disimpan tetap dalam persen di kolom `kriteria.bobot`.
- Indikator total berjalan ("Total 95% dari 100%"), tombol simpan nonaktif sampai tepat 100%. Tampilkan juga bobot ternormalisasi (0-1) yang dipakai mesin SAW.
- Simpan semua bobot dalam satu transaksi (bulk update), tercatat di audit log (`BOBOT_UBAH`, before/after).
- Hanya bisa diubah saat DRAFT.
- **Selesai jika**: total bobot dihitung dengan aritmetika desimal (bukan float); server menolak simpan jika total ≠ 100; bobot 0 atau negatif ditolak.

### Modul 6. Manajemen Data Alternatif
Alternatif adalah siswa yang **diikutkan** dalam proses SPK pada satu periode. Tidak semua siswa otomatis ikut (misal siswa pindahan, siswa nonaktif, atau sekolah hanya mengusulkan kandidat tertentu).
- Daftar alternatif per periode dengan kode otomatis (A1..An), nama, NIS, kelas, status kelengkapan nilai.
- Tambah alternatif: pilih per siswa (multi-select dengan pencarian), atau "Tambahkan semua siswa aktif di kelas X / tingkat Y / seluruh sekolah" dalam satu query `INSERT ... SELECT ... ON CONFLICT DO NOTHING`.
- Keluarkan alternatif (nilai penilaiannya ikut terhapus, dengan konfirmasi yang menyebut jumlah nilai yang hilang).
- Kode alternatif dibuat ulang berurutan saat periode pindah ke PENILAIAN agar rapi di laporan (A1..An berurutan menurut kelas lalu nama).
- Wali kelas: lihat alternatif kelasnya saja. Admin: kelola. Hanya bisa diubah saat DRAFT (penambahan susulan saat PENILAIAN boleh oleh admin, tercatat di audit log).
- **Selesai jika**: hanya siswa aktif yang terdaftar di kelas pada periode itu yang bisa jadi alternatif (dicek server); satu siswa hanya sekali per periode (PK); minimal 2 alternatif sebelum boleh pindah ke PENILAIAN.

### Modul 7. Penilaian Siswa
- Pilih kelas (wali kelas otomatis kelasnya). Grid: baris = alternatif di kelas itu, kolom = kriteria.
  - ANGKA: input angka custom dengan validasi min/max.
  - RENTANG: input angka mentah, tampilkan skala hasil konversi di sebelahnya.
  - PILIHAN: custom select dengan label sub-kriteria.
- Navigasi keyboard di grid (Tab/Enter ke sel berikutnya, panah atas/bawah).
- Indikator sel belum diisi dan sel berubah (belum tersimpan). Simpan satu kali untuk seluruh kelas (bulk upsert). Peringatan saat meninggalkan halaman dengan perubahan belum tersimpan.
- Progres kelengkapan per kelas ("28/32 alternatif lengkap").
- Impor nilai dari Excel per kelas (template berisi daftar alternatif kelas itu).
- **Selesai jika**: wali kelas tidak bisa menyimpan nilai untuk siswa di luar kelasnya atau siswa yang bukan alternatif walaupun memanipulasi request; nilai tidak bisa diubah di luar status PENILAIAN; simpan 40 siswa × 5 kriteria dilakukan dalam 1 query upsert.

### Modul 8. Perhitungan Metode SAW
- Halaman pra-cek: kelengkapan nilai semua alternatif, total bobot, jumlah alternatif per kelompok. Tombol "Hitung" aktif jika lolos; jika tidak, daftar penyebabnya tampil.
- Pilih cakupan: sekolah / per tingkat / per kelas.
- Jalankan: ambil semua data dalam satu query, hitung di mesin SAW (bagian 10), simpan `perhitungan` + `hasil` dalam satu transaksi.
- Tampilan langkah demi langkah (tab): 1) Kriteria dan bobot, 2) Matriks keputusan X, 3) Nilai max/min per kriteria, 4) Matriks normalisasi R, 5) Nilai preferensi V. Tabel besar dipaginasi; rumus ditampilkan di atas tiap tab.
- Riwayat run per periode; bisa membandingkan dua run (opsional).
- **Opsional (nilai tambah di sidang)**: simulasi bobot (what-if) tanpa menyimpan, untuk analisis sensitivitas.
- **Selesai jika**: hasil contoh bagian 3.3 sama persis; perhitungan 1.000 alternatif < 300 ms di server (diukur).

### Modul 9. Hasil Perangkingan
- Tabel peringkat per kelompok, urut berdasarkan nilai preferensi V (tie-break sesuai bagian 3.2), filter kelas/tingkat, sorot siswa yang masuk kuota.
- Detail per siswa: nilai mentah, skala, normalisasi, kontribusi tiap kriteria ke V (bar horizontal SVG).
- **Pendukung: validasi kepala sekolah.** Admin mengajukan satu run. Kepsek melihat daftar pengajuan dan detail perhitungan, lalu Setujui atau Tolak (catatan wajib saat menolak).
  - Setujui: periode jadi FINAL, run jadi DISETUJUI, siswa dalam kuota ditandai terpilih.
  - Tolak: periode kembali ke PERHITUNGAN, catatan tampil ke admin.
- Sebelum FINAL hasil ditandai "Draf"; wali kelas baru bisa melihat hasil kelasnya setelah FINAL.
- **Selesai jika**: urutan peringkat stabil dan sama dengan contoh 3.3; tidak ada perubahan data yang mungkin setelah FINAL kecuali admin membuka ulang (wajib alasan, tercatat).

### Modul 10. Laporan Hasil Seleksi
- Halaman pratinjau laporan, cetak PDF lewat print browser, dan ekspor Excel. Detail di bagian 15.
- Pengaturan sekolah untuk kop laporan (nama, alamat, logo, nama dan NIP kepsek).
- **Pendukung: audit log.** Tabel audit dengan filter user, aksi, rentang tanggal (custom date range picker), pagination keyset (berdasarkan `id`). Bisa dilampirkan sebagai bukti jejak proses seleksi.
- **Selesai jika**: laporan FINAL berstatus "Disahkan" dan laporan non-FINAL berstatus "Draf"; cetak A4 rapi (header tabel berulang, tidak ada baris terpotong); ekspor Excel memuat sheet Kriteria, Matriks X, Normalisasi R, Hasil.

---

## 9. Peta halaman (routes)

```
/login
/(app)/dashboard
/(app)/periode                      daftar, buat
/(app)/periode/[id]                 detail, ubah status, salin
/(app)/periode/[id]/kriteria        kriteria (modul 4)
/(app)/periode/[id]/kriteria/[kid]  sub-kriteria
/(app)/periode/[id]/bobot           bobot kriteria (modul 5)
/(app)/alternatif                   data alternatif periode aktif (modul 6)
/(app)/kelas                        per periode aktif (filter periode)
/(app)/kelas/[id]                   anggota kelas
/(app)/siswa                        daftar, impor
/(app)/siswa/[id]                   detail + riwayat hasil
/(app)/penilaian                    pilih kelas + progres
/(app)/penilaian/[kelasId]          grid input
/(app)/perhitungan                  pra-cek + riwayat run
/(app)/perhitungan/[runId]          langkah demi langkah
/(app)/validasi                     (Kepsek) daftar pengajuan
/(app)/hasil                        hasil perangkingan per periode (modul 9)
/(app)/laporan                      pratinjau laporan + ekspor (modul 10)
/(app)/laporan/[periodeId]/cetak    halaman cetak (print CSS)
/(app)/pengaturan                   (Admin) pengaturan sekolah untuk kop
/(app)/pengguna                     (Admin)
/(app)/audit                        (Admin, Kepsek)
/(app)/akun                         profil, ganti password
/api/auth/[...all]                  Better Auth
/api/ekspor/hasil/[runId]           unduh Excel
/api/ekspor/template/[jenis]        unduh template impor
```

Filter, pencarian, dan halaman disimpan di URL (`?q=&kelas=&page=`) agar bisa di-share dan dirender di server.

Middleware hanya mengecek keberadaan cookie sesi (cepat). Pengecekan role dan kepemilikan dilakukan di layout/page/action lewat helper `requireRole()` dan `requireKelasAccess()`.

---

## 10. Desain mesin SAW (kode)

Lokasi: `src/lib/saw/`. Tidak mengimpor apa pun dari DB atau Next.js.

```ts
// types.ts
export type JenisKriteria = "BENEFIT" | "COST";

export interface KriteriaInput {
  id: string;
  kode: string;            // "C1"
  jenis: JenisKriteria;
  bobotPersen: number;     // 30 (dari numeric(5,2))
}

export interface AlternatifInput {
  id: string;              // siswa_id
  nama: string;
  kelompok: string;        // "SEKOLAH" | "Tingkat 11" | "XI IPA 1"
  nilai: Record<string, number>; // kriteriaId -> nilai X
}

export interface HasilAlternatif {
  id: string;
  kelompok: string;
  normalisasi: Record<string, number>;
  terbobot: Record<string, number>;
  preferensi: number;
  peringkat: number;
}

export interface HasilSaw {
  perKelompok: Record<string, {
    max: Record<string, number>;
    min: Record<string, number>;
    hasil: HasilAlternatif[]; // sudah urut peringkat
  }>;
}
```

```ts
// engine.ts (garis besar)
export function hitungSaw(kriteria: KriteriaInput[], alternatif: AlternatifInput[]): HasilSaw
```

Langkah di dalam `hitungSaw`:
1. Validasi: kriteria tidak kosong, total bobot = 100 (dibandingkan dalam satuan sen: `Math.round(b * 100)` dijumlah harus 10000), setiap alternatif punya nilai untuk semua kriteria, nilai finite, kriteria COST tidak punya nilai ≤ 0. Gagal = lempar `SawValidationError` dengan daftar masalah.
2. Kelompokkan alternatif berdasarkan `kelompok`.
3. Per kelompok, per kriteria: hitung `max` dan `min` dalam satu lintasan.
4. Normalisasi sesuai jenis; benefit dengan max 0 menghasilkan 0.
5. `preferensi = Σ (bobotPersen / 100) × r`.
6. Urutkan: preferensi desc (toleransi `1e-9`), lalu tie-break (bagian 3.2). Peringkat dimulai dari 1.

Kompleksitas O(m × n) waktu dan memori, plus O(m log m) untuk sort. Untuk 1.000 siswa × 5 kriteria ini di bawah 1 ms; bottleneck sebenarnya adalah I/O database, karena itu data diambil dalam satu query dan hasil disimpan dalam satu bulk insert.

Test wajib (`engine.test.ts`):
- Golden test contoh bagian 3.3 (nilai V dan urutan).
- Benefit max = 0, satu alternatif, semua nilai sama.
- Cost dengan nilai 0 ditolak.
- Bobot 99,99% ditolak; bobot 33,33 + 33,33 + 33,34 diterima.
- Seri dengan tie-break.
- Cakupan per kelas menghasilkan normalisasi berbeda dari cakupan sekolah.
- Property test sederhana: semua `r` di [0, 1], `V` di [0, 1], menaikkan nilai benefit satu siswa tidak menurunkan V-nya.

---

## 11. Aturan validasi dan bisnis

| Area | Aturan |
|---|---|
| NIS | wajib, unik, 1-20 karakter alfanumerik |
| NISN | opsional, tepat 10 digit, unik |
| Nama | wajib, 2-100 karakter, di-trim |
| Bobot | 0,01-100, 2 desimal, total per periode tepat 100,00 sebelum PENILAIAN |
| Kode kriteria | unik per periode, format `C\d+` |
| Nilai ANGKA | dalam [nilai_min, nilai_max] kriteria, maks 2 desimal |
| Nilai RENTANG | angka ≥ 0, harus masuk tepat satu rentang sub-kriteria |
| Nilai PILIHAN | sub_kriteria_id harus milik kriteria tersebut |
| Kriteria COST | semua nilai skala > 0 |
| Status periode | mutasi data dicek terhadap status (tabel bagian 5.1) di server |
| Wali kelas | hanya kelas dengan `wali_kelas_id = user.id` di periode aktif |
| Hapus | kriteria/kelas/siswa yang sudah punya penilaian tidak bisa dihapus, hanya dinonaktifkan |
| Kuota | ≥ 1 dan ≤ jumlah siswa kelompok terkecil, atau kosong (tidak ada penandaan terpilih) |

Semua skema Zod ada di `features/<modul>/schemas.ts`, dipakai di form client (feedback cepat) dan di server action (sumber kebenaran).

---

## 12. UI/UX dan design system

### 12.1 Arah visual
Tampilan alat kerja sekolah yang tenang dan jelas, bukan landing page. Latar netral, satu warna aksen, tipografi rapi, kepadatan informasi sedang. Tanpa gradien dekoratif, tanpa kartu generik bertumpuk, tanpa teks klise. Data (tabel, angka) adalah fokus.

### 12.2 Design tokens (CSS variables di `globals.css`, dipetakan ke Tailwind v4 `@theme`)
- Warna: `--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-fg`, `--success`, `--warning`, `--danger`, `--focus-ring`. Disiapkan juga mode gelap.
- Tipografi: satu keluarga sans (misal Inter atau Plus Jakarta Sans via `next/font`, self-hosted, subset latin), angka tabel memakai `font-variant-numeric: tabular-nums`.
- Skala spasi 4px, radius 6/8px, bayangan minimal (hanya untuk popover/dialog).
- Kontras warna minimal WCAG AA (4,5:1 untuk teks).

### 12.3 Komponen custom (di `src/components/ui/`)
Semua komponen di bawah dibuat sendiri (di atas Radix primitives bila perlu) dan **tidak memakai elemen native** `<select>`, `<input type="checkbox|radio|date">`:

| Komponen | Basis | Catatan aksesibilitas |
|---|---|---|
| Button, IconButton | `<button>` | label ARIA untuk tombol ikon, state loading |
| TextField, NumberField | `<input type="text" inputMode="decimal">` + parsing lokal (koma desimal) | label terhubung, pesan error via `aria-describedby` |
| Select | Radix Select | keyboard, typeahead |
| Combobox (pencarian) | Radix Popover + listbox custom | pola ARIA combobox |
| MultiSelect | Combobox + chip | |
| Checkbox | Radix Checkbox | state indeterminate untuk "pilih semua" |
| RadioGroup | Radix RadioGroup | panah untuk berpindah |
| DatePicker, DateRangePicker | react-day-picker + Popover | input teks dd/mm/yyyy juga bisa diketik |
| Dialog, ConfirmDialog | Radix Dialog | fokus terjebak di dialog, Esc menutup |
| DropdownMenu | Radix DropdownMenu | |
| Tabs | Radix Tabs | |
| Toast | Radix Toast | `aria-live` |
| Tooltip | Radix Tooltip | hanya informasi tambahan, bukan satu-satunya label |
| DataTable | `<table>` semantik + header sortable via URL | `aria-sort`, caption |
| Pagination | link | `aria-current` |
| EmptyState, Skeleton, Badge status, ProgressBar | | |
| FileDrop (impor) | `<input type="file">` tersembunyi + area drop | bisa diaktifkan keyboard |

Ikon: lucide-react, ukuran 16/20px, stroke konsisten. Tidak ada emoji di mana pun.

### 12.4 Pola interaksi
- Aksi berisiko (hapus, ubah status, setujui) memakai ConfirmDialog yang menjelaskan akibatnya.
- Optimistic UI hanya untuk aksi ringan; simpan nilai menampilkan status "Menyimpan..." lalu "Tersimpan pukul 10.42".
- Skeleton untuk loading via `loading.tsx` per route; `Suspense` untuk bagian lambat.
- Animasi hanya transisi CSS 150-200ms (opacity/transform), hormati `prefers-reduced-motion`.
- Responsif: sidebar menjadi drawer di layar kecil; grid penilaian bisa scroll horizontal dengan kolom nama siswa sticky.
- Format Indonesia: tanggal "6 Nov 2026", desimal koma pada tampilan (`Intl.NumberFormat('id-ID')`).

### 12.5 Layout
- Sidebar kiri: menu sesuai role, penanda periode aktif dan statusnya di atas.
- Header: breadcrumb, nama user, menu akun.
- Konten: judul halaman + aksi utama di kanan, lalu filter, lalu tabel.

---

## 13. Keamanan dan privasi data

Data siswa adalah data pribadi anak di bawah umur (UU No. 27/2022 tentang Pelindungan Data Pribadi). Prinsip: kumpulkan seperlunya, batasi akses, catat akses perubahan.

- **Autentikasi**: Better Auth, hash password (scrypt/argon2 sesuai default library), cookie `HttpOnly`, `Secure`, `SameSite=Lax`. Rate limit login. Minimal 8 karakter password.
- **Otorisasi**: setiap server action dan route handler memanggil `requireRole()`; wali kelas juga `requireKelasAccess(kelasId)`. Query untuk wali kelas selalu difilter dengan `wali_kelas_id` di SQL, bukan di JS setelah fetch.
- **Validasi input**: Zod di server untuk semua input; ID diperiksa formatnya (uuid).
- **SQL injection**: hanya query terparameter lewat Drizzle; tidak ada string SQL dirangkai dari input.
- **CSRF**: Server Actions Next.js memeriksa origin; route handler mutasi (jika ada) juga cek origin.
- **XSS**: React escape default; tidak memakai `dangerouslySetInnerHTML`.
- **Upload Excel**: batas ukuran (misal 2 MB), cek ekstensi dan MIME, parse di server, tidak disimpan ke disk permanen, batas jumlah baris (misal 5.000).
- **Header keamanan** di `next.config`: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Frame-Options: DENY`, `Permissions-Policy`.
- **Secrets**: di `.env` (tidak di-commit), contoh di `.env.example`. Validasi env saat start dengan Zod.
- **Audit log** untuk perubahan nilai, bobot, status, pengguna, validasi.
- **Error**: pesan ke user generik; detail hanya di log server.
- `npm audit` dan pembaruan dependensi sebelum rilis.

---

## 14. Performa: target dan cara ukur

Prinsip: ukur dengan data realistis, bukan asumsi. Seed "besar" untuk uji: 1.200 siswa, 36 kelas, 5 kriteria, 2 periode (sekitar 12.000 baris penilaian).

### Target

| Metrik | Target | Cara ukur |
|---|---|---|
| JS first load per route | ≤ 120 KB gzip untuk halaman tabel, ≤ 160 KB untuk grid penilaian | output `next build`, `@next/bundle-analyzer` |
| LCP (halaman daftar, produksi, 4G) | < 2,0 s | Lighthouse / Web Vitals |
| INP grid penilaian | < 200 ms | Chrome DevTools Performance |
| Query daftar siswa (page 20, filter) | < 10 ms | `EXPLAIN (ANALYZE, BUFFERS)` |
| Ambil matriks satu periode | < 30 ms untuk 12.000 baris | `EXPLAIN ANALYZE` |
| Hitung + simpan SAW 1.200 siswa | < 300 ms total | log durasi di server action |
| Simpan nilai satu kelas | 1 query upsert, < 50 ms | log query Drizzle |

### Teknik yang dipakai
- Server Components dan streaming; komponen client sekecil mungkin.
- Pagination di server (offset untuk tabel kecil, keyset untuk audit log).
- Index sesuai pola query (bagian 7), diverifikasi dengan EXPLAIN. Tidak menambah index yang tidak dipakai.
- Hindari N+1: join atau `inArray` untuk ambil relasi sekaligus; dashboard memakai agregat SQL (`count`, `group by`).
- Bulk upsert dan bulk insert dalam transaksi.
- Cache: data yang jarang berubah (kriteria periode, daftar kelas) memakai cache Next dengan tag, di-invalidate di action yang mengubahnya. Data penilaian tidak di-cache.
- Connection pool kecil dan wajar (misal `max: 10`); pada serverless pakai pooled connection string.
- Font self-hosted dengan subset, gambar (logo sekolah) lewat `next/image`.
- Grid penilaian: state lokal per sel, memo per baris, tanpa re-render seluruh grid saat satu sel berubah. Virtualisasi hanya jika satu kelas > 100 siswa (biasanya tidak perlu).

Setiap fase yang menyentuh query baru menyertakan catatan EXPLAIN ANALYZE di PR/commit message atau di `docs/perf.md`.

---

## 15. Laporan dan ekspor

### 15.1 Laporan cetak (PDF via print browser)
Halaman `/laporan/[periodeId]/cetak` dengan CSS khusus cetak (A4, margin, `page-break` antar kelompok, header tabel berulang).

Isi:
1. Kop sekolah (logo, nama, alamat; diatur di pengaturan sekolah).
2. Judul: "Hasil Seleksi Siswa Berprestasi Periode ...", status "Disahkan" atau "Draf".
3. Tabel kriteria dan bobot.
4. Tabel peringkat per kelompok (No, NIS, Nama, Kelas, V, Peringkat, Keterangan terpilih).
5. Lampiran opsional: matriks X dan R (centang saat cetak).
6. Tempat, tanggal, tanda tangan kepala sekolah (nama + NIP).

Tambahan kecil: tabel `pengaturan_sekolah` (nama sekolah, alamat, logo, nama dan NIP kepsek), satu baris.

### 15.2 Ekspor Excel
`/api/ekspor/hasil/[runId]` menghasilkan workbook dengan sheet: Kriteria, Matriks X, Normalisasi R, Hasil. Dibuat di server dengan exceljs secara streaming. Berguna untuk uji validitas manual di Excel (bagian 16).

### 15.3 Template impor
Template siswa dan template nilai per kelas, dengan header terkunci dan contoh baris.

---

## 16. Strategi pengujian

| Jenis | Alat | Cakupan |
|---|---|---|
| Unit | Vitest | Mesin SAW (bagian 10), konversi RENTANG, skema Zod, helper format angka |
| Integrasi | Vitest + PostgreSQL test (Docker) | Server actions: RBAC, transisi status, upsert penilaian, simpan hasil |
| E2E | Playwright | Alur lengkap per role (bawah) |
| Uji validitas | Excel manual | Hitung ulang data seed di Excel dan bandingkan dengan hasil sistem (selisih 0 sampai 4 desimal) |
| Black-box | Tabel uji | Untuk BAB IV skripsi |
| Performa | seed besar + EXPLAIN + Lighthouse | Target bagian 14 |
| Aksesibilitas | axe (via Playwright) + uji keyboard manual | Semua halaman utama |

### Skenario E2E utama
1. Admin: login, buat periode, salin kriteria, atur kelas dan wali, impor siswa, buka penilaian.
2. Wali kelas: login, isi grid nilai kelasnya, simpan, coba akses kelas lain (harus ditolak).
3. Admin: tutup penilaian, jalankan perhitungan, ajukan.
4. Kepsek: tolak dengan catatan, admin hitung ulang dan ajukan lagi, kepsek setujui.
5. Semua: data terkunci setelah FINAL; cetak laporan.

### Template black-box testing

| No | Fitur | Skenario | Input | Hasil yang diharapkan | Hasil | Status |
|---|---|---|---|---|---|---|
| 1 | Login | Password salah | user benar, password salah | Muncul pesan "Username atau password salah" | | |
| 2 | Bobot | Total bukan 100% | C1-C5 total 95% | Tombol simpan nonaktif, info kurang 5% | | |
| 3 | Penilaian | Nilai di luar rentang | C1 = 105 | Pesan error di sel, tidak tersimpan | | |
| 4 | Penilaian | Wali kelas akses kelas lain | URL kelas lain | Akses ditolak | | |
| 5 | Perhitungan | Nilai belum lengkap | 3 siswa kosong | Tombol hitung nonaktif, daftar siswa kosong tampil | | |
| 6 | Perhitungan | Data contoh 3.3 | 5 siswa | Peringkat A3, A1, A4, A2, A5 | | |
| ... | | | | | | |

### UAT
Kuesioner singkat untuk admin, wali kelas, dan kepsek (skala Likert 1-5: kemudahan, kecepatan, kejelasan hasil, kesesuaian kebutuhan). Hasil diolah persentase untuk skripsi.

---

## 17. Struktur folder

```
SPK-Joki/
├─ PLAN.md
├─ README.md                    cara setup, menjalankan, akun demo
├─ .env.example
├─ .vscode/settings.json        TypeScript 7 native di editor
├─ biome.json                   lint + format
├─ tsconfig.json                strict (bagian 6.1)
├─ docker-compose.yml           postgres lokal (+ app untuk deploy VPS)
├─ drizzle.config.ts
├─ next.config.ts
├─ playwright.config.ts
├─ vitest.config.ts
├─ docs/
│  ├─ perf.md                   catatan EXPLAIN dan benchmark
│  ├─ manual-book.md            panduan pengguna per role
│  └─ diagram/                  use case, activity, sequence, ERD (mermaid/PNG)
├─ e2e/                         test Playwright
└─ src/
   ├─ app/
   │  ├─ (auth)/login/page.tsx
   │  ├─ (app)/layout.tsx       sidebar, guard sesi
   │  ├─ (app)/dashboard/
   │  ├─ (app)/periode/...
   │  ├─ (app)/kelas/...
   │  ├─ (app)/alternatif/
   │  ├─ (app)/siswa/...
   │  ├─ (app)/penilaian/...
   │  ├─ (app)/perhitungan/...
   │  ├─ (app)/validasi/
   │  ├─ (app)/hasil/...
   │  ├─ (app)/laporan/...
   │  ├─ (app)/pengaturan/
   │  ├─ (app)/pengguna/
   │  ├─ (app)/audit/
   │  ├─ (app)/akun/
   │  ├─ api/auth/[...all]/route.ts
   │  ├─ api/ekspor/...
   │  ├─ globals.css            tokens + tailwind
   │  └─ layout.tsx
   ├─ components/
   │  ├─ ui/                    komponen design system (bagian 12.3)
   │  └─ layout/                Sidebar, Header, PageHeader
   ├─ features/
   │  ├─ periode/{queries,actions,schemas}.ts + components/
   │  ├─ kelas/ ...
   │  ├─ siswa/ ...
   │  ├─ kriteria/ ...           termasuk sub-kriteria
   │  ├─ bobot/ ...
   │  ├─ alternatif/ ...
   │  ├─ penilaian/ ...
   │  ├─ perhitungan/ ...
   │  ├─ hasil/ ...              termasuk validasi
   │  ├─ laporan/ ...
   │  ├─ pengguna/ ...
   │  └─ audit/ ...
   ├─ lib/
   │  ├─ saw/{types,engine,errors}.ts + engine.test.ts
   │  ├─ auth.ts                konfigurasi Better Auth
   │  ├─ rbac.ts                requireRole, requireKelasAccess
   │  ├─ env.ts                 validasi env
   │  ├─ format.ts              angka/tanggal id-ID
   │  └─ excel.ts               baca/tulis exceljs
   ├─ db/
   │  ├─ schema/                file per tabel
   │  ├─ index.ts               koneksi + pool
   │  ├─ migrations/
   │  └─ seed/{dev,besar}.ts
   └─ middleware.ts             cek cookie sesi
```

---

## 18. Lingkungan, deploy, backup

### Lokal
- Node 24 LTS atau 26 (mesin ini Node 26) dan PostgreSQL lewat `docker compose up -d db`.
- Skrip npm: `dev` (next dev, Turbopack), `build` (`tsc --noEmit` lalu `next build`), `start`, `lint` (`biome check`), `format` (`biome format --write`), `typecheck` (`tsc --noEmit`), `test`, `test:e2e`, `db:generate`, `db:migrate`, `db:seed`, `db:seed:besar`.
- Akun demo di seed: admin, 2 wali kelas, kepsek (password demo dicatat di `README.md`, bukan di chat).

### Variabel lingkungan (`.env.example`)
```
DATABASE_URL=postgres://spk:spk@localhost:5432/spk
BETTER_AUTH_SECRET=        # string acak panjang
BETTER_AUTH_URL=http://localhost:3000
```

### Opsi deploy (pilih salah satu)
1. **Vercel + Neon/Supabase Postgres (tier gratis)**: paling murah dan cepat untuk demo sidang. Pakai pooled connection string, region database sama dengan region fungsi (Singapura).
2. **VPS + Docker Compose**: `output: "standalone"` di Next.js, container app + postgres, reverse proxy Caddy (HTTPS otomatis). Cocok jika sekolah ingin server sendiri.

### Backup
- Opsi 1: backup otomatis bawaan penyedia (cek retensi tier gratis).
- Opsi 2: cron `pg_dump` harian terkompresi, simpan 7 hari, uji restore minimal sekali.

### CI (GitHub Actions, opsional tapi disarankan)
lint (Biome), typecheck (`tsc` TS 7), unit test, build pada setiap push. E2E pada branch utama.

---

## 19. Roadmap dan checklist per fase

Estimasi untuk satu developer, total sekitar 4 minggu kerja efektif. Setiap fase diakhiri commit yang bisa dijalankan.

### Fase 0: Fondasi (1 hari)
- [ ] `git init`, Next.js 16.4.x + React 19.3 + TypeScript 7.0.x (versi persis), Tailwind v4, Biome
- [ ] Verifikasi `tsc --noEmit` dan `next build` jalan dengan TS 7; jika type-check bawaan build gagal, terapkan fallback di bagian 6.1
- [ ] `tsconfig.json` strict sesuai bagian 6.1, `.vscode/settings.json` untuk TS native
- [ ] Docker Compose PostgreSQL, Drizzle, validasi env
- [ ] Vitest dan Playwright terpasang, skrip npm
- [ ] README awal

### Fase 1: Database (1-2 hari)
- [ ] Skema semua tabel (bagian 7) + enum + constraint + index
- [ ] Migrasi pertama, seed dev (data contoh 3.3 ikut di-seed sebagai satu kelas kecil)
- [ ] Seed besar untuk uji performa
- [ ] EXPLAIN ANALYZE query utama dicatat di `docs/perf.md`

### Fase 2: Auth, RBAC, layout, design system (3 hari, modul 1)
- [ ] Better Auth (username + password, tanpa signup publik), rate limit
- [ ] `requireRole`, `requireKelasAccess`, middleware sesi
- [ ] Tokens, font, layout sidebar/header responsif
- [ ] Komponen UI inti: Button, TextField, NumberField, Select, Combobox, Checkbox, RadioGroup, Dialog, ConfirmDialog, Toast, DataTable, Pagination, DatePicker, Badge, Skeleton, EmptyState
- [ ] Halaman login, akun (ganti password)

### Fase 3: Master data (3-4 hari)
- [ ] Kelola pengguna (modul 1)
- [ ] Periode + state machine + salin periode (modul 3, pendukung)
- [ ] Kelas + anggota (modul 3, pendukung)
- [ ] Siswa CRUD + impor Excel dengan pratinjau (modul 3)
- [ ] Audit log tercatat dari semua action

### Fase 4: Kriteria, bobot, alternatif (2-3 hari)
- [ ] CRUD kriteria + editor sub-kriteria PILIHAN dan RENTANG + validasi tumpang tindih (modul 4)
- [ ] Halaman bobot: mode persen dan skala 1-5, total berjalan (modul 5)
- [ ] Data alternatif: tambah per siswa/kelas/tingkat/sekolah, kode A1..An (modul 6)
- [ ] Syarat transisi ke PENILAIAN

### Fase 5: Penilaian siswa (3 hari, modul 7)
- [ ] Grid input per kelas (keyboard, dirty state, konversi RENTANG live)
- [ ] Bulk upsert + guard status dan kepemilikan
- [ ] Progres kelengkapan, impor nilai Excel

### Fase 6: Mesin SAW dan perhitungan (3 hari, modul 8)
- [ ] `lib/saw` dengan TDD (semua test bagian 10)
- [ ] Pra-cek, pilih cakupan, run, simpan snapshot + hasil dalam transaksi
- [ ] Halaman langkah demi langkah (5 tab), riwayat run
- [ ] Ukur durasi dengan seed besar
- [ ] (Opsional) simulasi bobot

### Fase 7: Hasil perangkingan dan laporan (3 hari, modul 9-10)
- [ ] Halaman hasil perangkingan + detail kontribusi per siswa (modul 9)
- [ ] Ajukan, setujui/tolak, FINAL dan penguncian (modul 9, pendukung)
- [ ] Halaman laporan, cetak (kop, tanda tangan), ekspor Excel, pengaturan sekolah (modul 10)

### Fase 8: Dashboard dan audit (1-2 hari, modul 2 dan 10)
- [ ] Dashboard per role dengan agregat SQL dan bar chart SVG
- [ ] Halaman audit log (keyset pagination, filter tanggal)

### Fase 9: Pengujian dan pengerasan (3 hari)
- [ ] E2E semua skenario, uji akses lintas role
- [ ] Uji validitas vs Excel, isi tabel black-box
- [ ] Lighthouse, bundle analyzer, axe, uji keyboard
- [ ] Header keamanan, `npm audit`, review error handling

### Fase 10: Deploy dan dokumentasi (1-2 hari)
- [ ] Deploy (opsi pilihan), seed demo di production
- [ ] Manual book per role dengan tangkapan layar
- [ ] Diagram final di `docs/diagram`

---

## 20. Dokumen pendukung skripsi (opsional tapi biasanya diminta)

Bisa digenerate dari plan dan kode ini:
- Use case diagram (3 aktor, bagian 2, use case = 10 modul bagian 8) dan deskripsi use case.
- Activity diagram: login, input penilaian, perhitungan SAW, validasi.
- Sequence diagram: proses perhitungan (UI -> action -> DB -> mesin SAW -> DB).
- Class diagram/ERD (bagian 7).
- Flowchart metode SAW (bagian 3.1).
- Perhitungan manual (bagian 3.3) untuk BAB III/IV.
- Tabel black-box testing dan hasil UAT (bagian 16).
- Manual book.

---

## 21. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Kriteria/bobot dari sekolah berubah di tengah jalan | Rework | Kriteria per periode dan bisa diatur admin, tidak hardcode |
| Pembagian nol pada kriteria cost | Hasil NaN | Skala konversi min 1, validasi dan error di mesin SAW |
| Dosen menanyakan dasar bobot | Pertanyaan sidang | Sediakan opsi input bobot dari skala kepentingan (1-5) yang dinormalisasi otomatis, dan dokumentasikan sumber bobot (wawancara sekolah) |
| Ranking per kelas disalahpahami | Hasil keliru | Cakupan perhitungan eksplisit dan dijelaskan di UI |
| Data siswa bocor | Pelanggaran privasi | RBAC di server, audit log, HTTPS, data minimal |
| Versi library baru (Next.js, Better Auth) punya breaking change | Waktu terbuang | Pin versi, baca catatan rilis saat setup, jangan upgrade di tengah proyek |
| Tool yang belum mendukung TypeScript 7 (butuh API TS lama) | Lint/build gagal | Biome untuk lint, `tsc` TS 7 untuk type-check, verifikasi di Fase 0. Jika ada library penting yang wajib TS API, pasang `typescript@6` hanya sebagai dependensi tool itu, bukan untuk type-check proyek |
| Tier gratis database tidur/lambat saat demo | Demo gagal | Hangatkan sebelum sidang, siapkan versi lokal sebagai cadangan |
| Grid penilaian lambat di laptop lemah | UX buruk | Ukur INP, memo per baris, hindari re-render global |

---

## 22. Hal yang masih perlu dikonfirmasi ke klien

1. Jenjang sekolah (SD/SMP/SMA/SMK) dan nama sekolah untuk kop laporan.
2. Apakah kriteria dan bobot default di bagian 4 disetujui, atau ada kriteria dari sekolah (misal hafalan, kepemimpinan, nilai mapel tertentu).
3. Cakupan ranking yang diharapkan: satu juara sekolah, per tingkat, atau per kelas. Dan berapa kuotanya.
4. Bobot langsung dalam persen, atau dari skala kepentingan 1-5 yang dinormalisasi (lebih umum di jurnal SAW).
5. Perlu login siswa/orang tua untuk melihat hasil? (Saat ini tidak.)
6. Deploy: Vercel + Neon gratis untuk demo, atau server sekolah.
7. Apakah butuh dokumen skripsi (diagram, manual book) dari pihak kita, atau hanya aplikasinya.
8. Data alternatif (modul 6): apakah semua siswa aktif otomatis jadi alternatif, atau hanya kandidat yang diusulkan wali kelas. Plan mendukung keduanya (tambah per siswa atau sekaligus per kelas/tingkat/sekolah).
8. Tenggat demo/sidang, agar urutan fase bisa diprioritaskan (fitur opsional seperti simulasi bobot bisa ditunda).
