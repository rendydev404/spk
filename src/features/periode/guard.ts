import "server-only";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { alternatif, kelas, kriteria, periode, subKriteria } from "@/db/schema";
import { GalatBisnis } from "@/lib/aksi";
import { cekRentang } from "@/lib/konversi";
import { LABEL_STATUS, type StatusPeriode } from "@/lib/status";

/** Mengunci baris periode (FOR UPDATE) dan memastikan statusnya mengizinkan aksi. */
export async function kunciPeriode(tx: Tx, periodeId: string, izin: StatusPeriode[]) {
  const [p] = await tx.select().from(periode).where(eq(periode.id, periodeId)).for("update");
  if (!p) throw new GalatBisnis("Periode tidak ditemukan");
  if (!izin.includes(p.status)) {
    throw new GalatBisnis(
      `Aksi ini hanya bisa dilakukan saat periode berstatus ${izin.map((s) => LABEL_STATUS[s]).join(" atau ")}. Status sekarang: ${LABEL_STATUS[p.status]}.`,
    );
  }
  return p;
}

/** Syarat pindah DRAFT -> PENILAIAN (PLAN 5.1 dan modul 3). Mengembalikan daftar masalah; kosong = lolos. */
export async function cekSyaratPenilaian(periodeId: string, tx: Tx | typeof db = db): Promise<string[]> {
  const masalah: string[] = [];
  const [daftarKriteria, subs, [kelasTanpaWali], [jumlahKelas], [jumlahAlt]] = await Promise.all([
    tx
      .select({
        id: kriteria.id,
        kode: kriteria.kode,
        bobot: kriteria.bobot,
        tipeInput: kriteria.tipeInput,
        jenis: kriteria.jenis,
      })
      .from(kriteria)
      .where(eq(kriteria.periodeId, periodeId)),
    tx
      .select({
        kriteriaId: subKriteria.kriteriaId,
        label: subKriteria.label,
        nilai: subKriteria.nilai,
        batasBawah: subKriteria.batasBawah,
        batasAtas: subKriteria.batasAtas,
      })
      .from(subKriteria)
      .innerJoin(kriteria, eq(kriteria.id, subKriteria.kriteriaId))
      .where(eq(kriteria.periodeId, periodeId)),
    tx
      .select({ n: count() })
      .from(kelas)
      .where(and(eq(kelas.periodeId, periodeId), isNull(kelas.waliKelasId))),
    tx.select({ n: count() }).from(kelas).where(eq(kelas.periodeId, periodeId)),
    tx.select({ n: count() }).from(alternatif).where(eq(alternatif.periodeId, periodeId)),
  ]);

  if (daftarKriteria.length === 0) masalah.push("Belum ada kriteria");
  const totalSen = daftarKriteria.reduce((s, k) => s + Math.round(Number(k.bobot) * 100), 0);
  if (daftarKriteria.length > 0 && totalSen !== 10000)
    masalah.push(`Total bobot ${(totalSen / 100).toFixed(2)}%, harus 100%`);
  for (const k of daftarKriteria) {
    if (Number(k.bobot) <= 0) masalah.push(`Bobot ${k.kode} masih 0`);
    if (k.tipeInput === "ANGKA") continue;
    const s = subs.filter((x) => x.kriteriaId === k.id);
    if (s.length === 0) masalah.push(`${k.kode} belum punya sub-kriteria`);
    if (k.tipeInput === "RENTANG") {
      for (const m of cekRentang(
        s.map((x) => ({
          label: x.label,
          batasBawah: x.batasBawah === null ? null : Number(x.batasBawah),
          batasAtas: x.batasAtas === null ? null : Number(x.batasAtas),
        })),
      )) {
        masalah.push(`${k.kode}: ${m}`);
      }
    }
  }
  if ((jumlahKelas?.n ?? 0) === 0) masalah.push("Belum ada kelas");
  if ((kelasTanpaWali?.n ?? 0) > 0) masalah.push(`${kelasTanpaWali?.n} kelas belum punya wali kelas`);
  if ((jumlahAlt?.n ?? 0) < 2) masalah.push("Alternatif minimal 2 siswa");
  return masalah;
}

/** Mengurutkan ulang kode alternatif A1..An berdasarkan kelas lalu nama siswa. */
export async function urutkanKodeAlternatif(tx: Tx, periodeId: string) {
  // Dua langkah agar tidak bentrok dengan unique (periode_id, kode).
  await tx.execute(sql`update alternatif set kode = 'T' || kode where periode_id = ${periodeId}`);
  await tx.execute(sql`
    with urut as (
      select a.siswa_id, 'A' || row_number() over (order by k.tingkat, k.nama, lower(s.nama), s.nis) as kode
      from alternatif a
      join kelas_siswa ks on ks.periode_id = a.periode_id and ks.siswa_id = a.siswa_id
      join kelas k on k.id = ks.kelas_id
      join siswa s on s.id = a.siswa_id
      where a.periode_id = ${periodeId}
    )
    update alternatif a set kode = urut.kode from urut
    where a.periode_id = ${periodeId} and a.siswa_id = urut.siswa_id`);
}
