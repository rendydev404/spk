import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  alternatif,
  hasil,
  kelas,
  kelasSiswa,
  kriteria,
  penilaian,
  perhitungan,
  siswa,
  user,
  validasi,
} from "@/db/schema";

export type Cakupan = "SEKOLAH" | "TINGKAT" | "KELAS";

/** Matriks keputusan satu periode dalam satu query (alternatif x kriteria). */
export async function ambilMatriks(periodeId: string) {
  return db
    .select({
      siswaId: alternatif.siswaId,
      kode: alternatif.kode,
      nama: siswa.nama,
      nis: siswa.nis,
      kelasNama: kelas.nama,
      tingkat: kelas.tingkat,
      kriteriaId: penilaian.kriteriaId,
      nilai: penilaian.nilai,
      nilaiMentah: penilaian.nilaiMentah,
    })
    .from(alternatif)
    .innerJoin(siswa, eq(siswa.id, alternatif.siswaId))
    .innerJoin(
      kelasSiswa,
      and(eq(kelasSiswa.periodeId, alternatif.periodeId), eq(kelasSiswa.siswaId, alternatif.siswaId)),
    )
    .innerJoin(kelas, eq(kelas.id, kelasSiswa.kelasId))
    .leftJoin(
      penilaian,
      and(eq(penilaian.periodeId, alternatif.periodeId), eq(penilaian.siswaId, alternatif.siswaId)),
    )
    .where(eq(alternatif.periodeId, periodeId));
}

export const namaKelompok = (c: Cakupan, r: { tingkat: number; kelasNama: string }) =>
  c === "SEKOLAH" ? "SEKOLAH" : c === "TINGKAT" ? `Tingkat ${r.tingkat}` : r.kelasNama;

/** Pra-cek sebelum menghitung: kelengkapan nilai dan bobot. */
export async function praCek(periodeId: string) {
  const [ks, matriks] = await Promise.all([
    db
      .select({ id: kriteria.id, kode: kriteria.kode, bobot: kriteria.bobot })
      .from(kriteria)
      .where(eq(kriteria.periodeId, periodeId))
      .orderBy(asc(kriteria.urutan)),
    ambilMatriks(periodeId),
  ]);
  const perSiswa = new Map<
    string,
    { nama: string; kode: string; kelas: string; tingkat: number; ada: Set<string> }
  >();
  for (const r of matriks) {
    let s = perSiswa.get(r.siswaId);
    if (!s) {
      s = { nama: r.nama, kode: r.kode, kelas: r.kelasNama, tingkat: r.tingkat, ada: new Set() };
      perSiswa.set(r.siswaId, s);
    }
    if (r.kriteriaId) s.ada.add(r.kriteriaId);
  }
  const belumLengkap = [...perSiswa.values()]
    .filter((s) => s.ada.size < ks.length)
    .map((s) => ({ ...s, kurang: ks.filter((k) => !s.ada.has(k.id)).map((k) => k.kode) }));
  const totalSen = ks.reduce((t, k) => t + Math.round(Number(k.bobot) * 100), 0);
  const kelompok = (c: Cakupan) => {
    const m = new Map<string, number>();
    for (const s of perSiswa.values()) {
      const g = namaKelompok(c, { tingkat: s.tingkat, kelasNama: s.kelas });
      m.set(g, (m.get(g) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "id", { numeric: true }));
  };
  return {
    jumlahKriteria: ks.length,
    totalBobot: totalSen / 100,
    bobotPas: totalSen === 10000,
    jumlahAlternatif: perSiswa.size,
    belumLengkap,
    kelompok: { SEKOLAH: kelompok("SEKOLAH"), TINGKAT: kelompok("TINGKAT"), KELAS: kelompok("KELAS") },
  };
}

export async function riwayatRun(periodeId: string) {
  return db
    .select({
      id: perhitungan.id,
      cakupan: perhitungan.cakupan,
      status: perhitungan.status,
      dihitungPada: perhitungan.dihitungPada,
      jumlahSiswa: perhitungan.jumlahSiswa,
      oleh: user.name,
      durasiMs: sql<number>`(${perhitungan.snapshot}->>'durasiMs')::int`,
    })
    .from(perhitungan)
    .leftJoin(user, eq(user.id, perhitungan.dihitungOleh))
    .where(eq(perhitungan.periodeId, periodeId))
    .orderBy(desc(perhitungan.dihitungPada));
}

export async function getRun(id: string) {
  const [r] = await db
    .select({
      id: perhitungan.id,
      periodeId: perhitungan.periodeId,
      cakupan: perhitungan.cakupan,
      status: perhitungan.status,
      dihitungPada: perhitungan.dihitungPada,
      jumlahSiswa: perhitungan.jumlahSiswa,
      snapshot: perhitungan.snapshot,
      oleh: user.name,
    })
    .from(perhitungan)
    .leftJoin(user, eq(user.id, perhitungan.dihitungOleh))
    .where(eq(perhitungan.id, id));
  return r ?? null;
}

export async function daftarKelompokRun(runId: string) {
  const rows = await db
    .select({ kelompok: hasil.kelompok, n: sql<number>`count(*)::int` })
    .from(hasil)
    .where(eq(hasil.perhitunganId, runId))
    .groupBy(hasil.kelompok);
  return rows.sort((a, b) => a.kelompok.localeCompare(b.kelompok, "id", { numeric: true }));
}

/** Hasil satu kelompok, urut peringkat (memakai index perhitungan_id, kelompok, peringkat). */
export async function hasilKelompok(
  runId: string,
  kelompok: string,
  o?: { limit: number; offset: number; kelasNama?: string | undefined },
) {
  const q = db
    .select({
      siswaId: hasil.siswaId,
      kode: hasil.kodeAlternatif,
      kelasNama: hasil.kelasNama,
      nama: siswa.nama,
      nis: siswa.nis,
      nilaiX: hasil.nilaiX,
      normalisasi: hasil.normalisasi,
      v: hasil.nilaiPreferensi,
      peringkat: hasil.peringkat,
      terpilih: hasil.terpilih,
    })
    .from(hasil)
    .innerJoin(siswa, eq(siswa.id, hasil.siswaId))
    .where(
      and(
        eq(hasil.perhitunganId, runId),
        eq(hasil.kelompok, kelompok),
        o?.kelasNama ? eq(hasil.kelasNama, o.kelasNama) : undefined,
      ),
    )
    .orderBy(asc(hasil.peringkat));
  return o ? q.limit(o.limit).offset(o.offset) : q;
}

export async function catatanValidasi(runId: string) {
  return db
    .select({
      keputusan: validasi.keputusan,
      catatan: validasi.catatan,
      createdAt: validasi.createdAt,
      oleh: user.name,
    })
    .from(validasi)
    .leftJoin(user, eq(user.id, validasi.kepsekId))
    .where(eq(validasi.perhitunganId, runId))
    .orderBy(desc(validasi.createdAt));
}

/** N teratas sebuah run lintas kelompok (peringkat lalu nilai V). */
export async function teratasRun(runId: string, n: number) {
  return db
    .select({
      siswaId: hasil.siswaId,
      nama: siswa.nama,
      kelasNama: hasil.kelasNama,
      peringkat: hasil.peringkat,
      v: hasil.nilaiPreferensi,
      kelompok: hasil.kelompok,
    })
    .from(hasil)
    .innerJoin(siswa, eq(siswa.id, hasil.siswaId))
    .where(eq(hasil.perhitunganId, runId))
    .orderBy(asc(hasil.peringkat), desc(hasil.nilaiPreferensi))
    .limit(n);
}
