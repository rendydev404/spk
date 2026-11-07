/**
 * Seed data demo. Menghapus SEMUA data lalu mengisi ulang. Jangan dijalankan di production.
 * Akun demo dan password-nya dicatat di README.md.
 */
import { hashPassword } from "better-auth/crypto";
import { sql as dsql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type KriteriaKonversi, konversi } from "../../lib/konversi.ts";
import { hitungSaw } from "../../lib/saw/engine.ts";
import * as s from "../schema/index.ts";
import { KRITERIA_DEFAULT } from "./default-kriteria.ts";

if (process.env.NODE_ENV === "production") throw new Error("Seed demo tidak boleh dijalankan di production");

const client = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
const db = drizzle(client, { schema: s, casing: "snake_case" });
const PASSWORD_DEMO = "spk-demo-2026";

type Mentah = { c1: number; c2: number; c3: string; c4: string; c5: string };

// Kelas XI IPA 1 berisi data contoh perhitungan PLAN bagian 3.3 (A1..A5).
const KELAS: { nama: string; tingkat: number; wali: string; siswa: [string, "L" | "P", Mentah][] }[] = [
  {
    nama: "XI IPA 1",
    tingkat: 11,
    wali: "wali1",
    siswa: [
      ["Aditya Pratama", "L", { c1: 88.5, c2: 2, c3: "Sangat Baik", c4: "Provinsi", c5: "A" }],
      ["Bunga Lestari", "P", { c1: 91.2, c2: 0, c3: "Baik", c4: "Sekolah", c5: "B" }],
      ["Citra Maharani", "P", { c1: 85.0, c2: 4, c3: "Sangat Baik", c4: "Nasional/Internasional", c5: "A" }],
      ["Dimas Saputra", "L", { c1: 89.7, c2: 1, c3: "Sangat Baik", c4: "Kabupaten/Kota", c5: "B" }],
      ["Eka Wulandari", "P", { c1: 82.3, c2: 7, c3: "Baik", c4: "Tidak ada", c5: "C" }],
    ],
  },
  {
    nama: "XI IPA 2",
    tingkat: 11,
    wali: "wali2",
    siswa: [
      ["Fajar Nugroho", "L", { c1: 86.4, c2: 3, c3: "Baik", c4: "Kabupaten/Kota", c5: "A" }],
      ["Gita Permata", "P", { c1: 92.1, c2: 1, c3: "Sangat Baik", c4: "Sekolah", c5: "B" }],
      ["Hendra Wijaya", "L", { c1: 79.8, c2: 9, c3: "Cukup", c4: "Tidak ada", c5: "C" }],
      ["Indah Sari", "P", { c1: 87.9, c2: 0, c3: "Sangat Baik", c4: "Provinsi", c5: "A" }],
      ["Joko Santoso", "L", { c1: 83.6, c2: 5, c3: "Baik", c4: "Sekolah", c5: "Tidak ikut" }],
      ["Kartika Dewi", "P", { c1: 90.3, c2: 2, c3: "Baik", c4: "Kabupaten/Kota", c5: "B" }],
      ["Lukman Hakim", "L", { c1: 81.2, c2: 12, c3: "Cukup", c4: "Sekolah", c5: "C" }],
      ["Maya Anggraini", "P", { c1: 88.0, c2: 1, c3: "Sangat Baik", c4: "Nasional/Internasional", c5: "A" }],
    ],
  },
  {
    nama: "X IPS 1",
    tingkat: 10,
    wali: "wali3",
    siswa: [
      ["Nanda Kusuma", "L", { c1: 84.2, c2: 2, c3: "Baik", c4: "Sekolah", c5: "B" }],
      ["Oktaviani Putri", "P", { c1: 89.1, c2: 0, c3: "Sangat Baik", c4: "Kabupaten/Kota", c5: "A" }],
      ["Putra Ramadhan", "L", { c1: 78.5, c2: 6, c3: "Cukup", c4: "Tidak ada", c5: "C" }],
      ["Qori Aulia", "P", { c1: 86.7, c2: 1, c3: "Baik", c4: "Provinsi", c5: "A" }],
      ["Rizky Firmansyah", "L", { c1: 82.9, c2: 3, c3: "Baik", c4: "Sekolah", c5: "B" }],
      ["Salsabila Zahra", "P", { c1: 91.5, c2: 1, c3: "Sangat Baik", c4: "Sekolah", c5: "A" }],
      ["Taufik Hidayat", "L", { c1: 80.4, c2: 4, c3: "Baik", c4: "Tidak ada", c5: "Tidak ikut" }],
    ],
  },
];

async function buatUser(
  username: string,
  name: string,
  role: "ADMIN" | "WALI_KELAS" | "KEPSEK",
  hash: string,
) {
  const id = crypto.randomUUID();
  await db
    .insert(s.user)
    .values({ id, name, username, displayUsername: username, email: `${username}@spk.local`, role });
  await db
    .insert(s.account)
    .values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash });
  return id;
}

async function buatKriteria(periodeId: string) {
  const hasil: { id: string; kode: string; k: KriteriaKonversi; subByLabel: Map<string, string> }[] = [];
  for (const [i, d] of KRITERIA_DEFAULT.entries()) {
    const [k] = await db
      .insert(s.kriteria)
      .values({
        periodeId,
        kode: d.kode,
        nama: d.nama,
        jenis: d.jenis,
        bobot: d.bobot,
        tipeInput: d.tipeInput,
        nilaiMin: d.nilaiMin,
        nilaiMax: d.nilaiMax,
        urutan: i,
      })
      .returning({ id: s.kriteria.id });
    const kid = k!.id;
    const subs = d.sub.length
      ? await db
          .insert(s.subKriteria)
          .values(
            d.sub.map((x, j) => ({
              kriteriaId: kid,
              label: x.label,
              nilai: x.nilai,
              batasBawah: x.batasBawah ?? null,
              batasAtas: x.batasAtas ?? null,
              urutan: j,
            })),
          )
          .returning()
      : [];
    hasil.push({
      id: kid,
      kode: d.kode,
      subByLabel: new Map(subs.map((x) => [x.label, x.id])),
      k: {
        kode: d.kode,
        tipeInput: d.tipeInput,
        jenis: d.jenis,
        nilaiMin: d.nilaiMin === null ? null : Number(d.nilaiMin),
        nilaiMax: d.nilaiMax === null ? null : Number(d.nilaiMax),
        sub: subs.map((x) => ({
          id: x.id,
          label: x.label,
          nilai: Number(x.nilai),
          batasBawah: x.batasBawah === null ? null : Number(x.batasBawah),
          batasAtas: x.batasAtas === null ? null : Number(x.batasAtas),
        })),
      },
    });
  }
  return hasil;
}

async function main() {
  await db.execute(dsql`truncate table audit_log, validasi, hasil, perhitungan, penilaian, alternatif, sub_kriteria, kriteria,
    kelas_siswa, kelas, periode, siswa, pengaturan_sekolah, rate_limit, verification, session, account, "user" restart identity cascade`);

  const hash = await hashPassword(PASSWORD_DEMO);
  const admin = await buatUser("admin", "Rina Operator", "ADMIN", hash);
  const kepsek = await buatUser("kepsek", "Drs. Bambang Sutrisno, M.Pd.", "KEPSEK", hash);
  const wali: Record<string, string> = {
    wali1: await buatUser("wali1", "Sri Handayani, S.Pd.", "WALI_KELAS", hash),
    wali2: await buatUser("wali2", "Agus Setiawan, S.Pd.", "WALI_KELAS", hash),
    wali3: await buatUser("wali3", "Dewi Kurniasih, S.Pd.", "WALI_KELAS", hash),
  };

  await db.insert(s.pengaturanSekolah).values({
    id: 1,
    namaSekolah: "SMA Negeri 1 Nusantara",
    alamat: "Jl. Pendidikan No. 1",
    kota: "Bandung",
    namaKepsek: "Drs. Bambang Sutrisno, M.Pd.",
    nipKepsek: "196805121994031005",
  });

  // Siswa (data lintas periode)
  let nis = 24001;
  const siswaId = new Map<string, string>();
  for (const k of KELAS) {
    for (const [nama, jk] of k.siswa) {
      const [row] = await db
        .insert(s.siswa)
        .values({
          nis: String(nis),
          nisn: `00${String(nis).padStart(8, "0")}`.slice(-10),
          nama,
          jenisKelamin: jk,
          tanggalLahir: `2008-${String((nis % 12) + 1).padStart(2, "0")}-${String((nis % 27) + 1).padStart(2, "0")}`,
        })
        .returning({ id: s.siswa.id });
      siswaId.set(nama, row!.id);
      nis++;
    }
  }

  const periodeDef = [
    { nama: "2025/2026 Ganjil", tahunAjaran: "2025/2026", semester: "GANJIL" as const, final: true },
    { nama: "2025/2026 Genap", tahunAjaran: "2025/2026", semester: "GENAP" as const, final: false },
  ];

  for (const pd of periodeDef) {
    const [p] = await db
      .insert(s.periode)
      .values({
        nama: pd.nama,
        tahunAjaran: pd.tahunAjaran,
        semester: pd.semester,
        kuota: 3,
        status: "DRAFT",
      })
      .returning({ id: s.periode.id });
    const periodeId = p!.id;
    const kriteria = await buatKriteria(periodeId);

    const anggota: { siswaId: string; nama: string; kelas: string; tingkat: number; mentah: Mentah }[] = [];
    for (const k of KELAS) {
      const [kl] = await db
        .insert(s.kelas)
        .values({ periodeId, nama: k.nama, tingkat: k.tingkat, waliKelasId: wali[k.wali] ?? null })
        .returning({ id: s.kelas.id });
      for (const [nama, , mentah] of k.siswa) {
        const sid = siswaId.get(nama)!;
        await db.insert(s.kelasSiswa).values({ kelasId: kl!.id, siswaId: sid, periodeId });
        // Periode sebelumnya: nilai sedikit berbeda agar riwayat terlihat wajar.
        const m = pd.final ? { ...mentah, c1: Math.max(0, Math.round((mentah.c1 - 1.3) * 10) / 10) } : mentah;
        anggota.push({ siswaId: sid, nama, kelas: k.nama, tingkat: k.tingkat, mentah: m });
      }
    }
    anggota.sort((a, b) => a.kelas.localeCompare(b.kelas, "id") || a.nama.localeCompare(b.nama, "id"));
    await db
      .insert(s.alternatif)
      .values(
        anggota.map((a, i) => ({ periodeId, siswaId: a.siswaId, kode: `A${i + 1}`, ditambahkanOleh: admin })),
      );

    const nilaiX = new Map<string, Record<string, number>>();
    const rows: (typeof s.penilaian.$inferInsert)[] = [];
    for (const a of anggota) {
      const x: Record<string, number> = {};
      for (const kr of kriteria) {
        const raw = a.mentah[kr.kode.toLowerCase() as keyof Mentah];
        const h =
          typeof raw === "number"
            ? konversi(kr.k, { mentah: raw })
            : konversi(kr.k, { subKriteriaId: kr.subByLabel.get(raw) ?? null });
        if (!h.ok) throw new Error(`${a.nama}: ${h.pesan}`);
        x[kr.id] = h.nilai;
        rows.push({
          periodeId,
          siswaId: a.siswaId,
          kriteriaId: kr.id,
          nilaiMentah: h.nilaiMentah === null ? null : String(h.nilaiMentah),
          subKriteriaId: h.subKriteriaId,
          nilai: String(h.nilai),
          diinputOleh: wali[KELAS.find((k) => k.nama === a.kelas)!.wali] ?? admin,
        });
      }
      nilaiX.set(a.siswaId, x);
    }
    await db.insert(s.penilaian).values(rows);

    if (!pd.final) {
      await db.update(s.periode).set({ status: "PENILAIAN" }).where(dsql`${s.periode.id} = ${periodeId}`);
      continue;
    }

    // Periode sebelumnya: hitung, ajukan, setujui (FINAL).
    const t0 = performance.now();
    const kInput = kriteria.map((k, i) => ({
      id: k.id,
      kode: k.kode,
      jenis: KRITERIA_DEFAULT[i]!.jenis,
      bobotPersen: Number(KRITERIA_DEFAULT[i]!.bobot),
    }));
    const altInput = anggota.map((a) => ({
      id: a.siswaId,
      nama: a.nama,
      kelompok: "SEKOLAH",
      nilai: nilaiX.get(a.siswaId)!,
      nilaiMentahUtama: a.mentah.c1,
    }));
    const hasilSaw = hitungSaw(kInput, altInput);
    const g = hasilSaw.perKelompok.SEKOLAH!;
    const [run] = await db
      .insert(s.perhitungan)
      .values({
        periodeId,
        cakupan: "SEKOLAH",
        dihitungOleh: admin,
        status: "DISETUJUI",
        jumlahSiswa: anggota.length,
        snapshot: {
          kriteria: kInput.map((k, i) => ({
            id: k.id,
            kode: k.kode,
            nama: KRITERIA_DEFAULT[i]!.nama,
            jenis: k.jenis,
            bobot: k.bobotPersen,
          })),
          kelompok: { SEKOLAH: { max: g.max, min: g.min } },
          durasiMs: Math.round(performance.now() - t0),
        },
      })
      .returning({ id: s.perhitungan.id });
    const kodeAlt = new Map(anggota.map((a, i) => [a.siswaId, `A${i + 1}`]));
    const kelasAlt = new Map(anggota.map((a) => [a.siswaId, a.kelas]));
    await db.insert(s.hasil).values(
      g.hasil.map((h) => ({
        perhitunganId: run!.id,
        siswaId: h.id,
        kelompok: "SEKOLAH",
        kodeAlternatif: kodeAlt.get(h.id)!,
        kelasNama: kelasAlt.get(h.id)!,
        nilaiX: nilaiX.get(h.id)!,
        normalisasi: h.normalisasi,
        nilaiPreferensi: h.preferensi.toFixed(6),
        peringkat: h.peringkat,
        terpilih: h.peringkat <= 3,
      })),
    );
    await db
      .insert(s.validasi)
      .values({ perhitunganId: run!.id, kepsekId: kepsek, keputusan: "DISETUJUI", catatan: "Disetujui." });
    await db.update(s.periode).set({ status: "FINAL" }).where(dsql`${s.periode.id} = ${periodeId}`);
  }

  console.log("Seed demo selesai. Akun: admin, kepsek, wali1, wali2, wali3 (password di README.md)");
  await client.end();
}

await main();
