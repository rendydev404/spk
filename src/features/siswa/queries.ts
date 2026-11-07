import "server-only";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { hasil, kelas, kelasSiswa, periode, perhitungan, siswa } from "@/db/schema";

export const PER_HALAMAN = 20;

export async function cariSiswa(o: {
  periodeId: string | null;
  q?: string | undefined;
  kelasId?: string | undefined;
  status?: string | undefined;
  page: number;
}) {
  const q = o.q?.trim();
  const syarat = and(
    q ? or(ilike(siswa.nama, `%${q.replace(/[%_\\]/g, "\\$&")}%`), ilike(siswa.nis, `${q.replace(/[%_\\]/g, "\\$&")}%`)) : undefined,
    o.status === "aktif" ? eq(siswa.aktif, true) : o.status === "nonaktif" ? eq(siswa.aktif, false) : undefined,
    o.kelasId === "tanpa" ? sql`${kelas.id} is null` : o.kelasId ? eq(kelas.id, o.kelasId) : undefined,
  );
  const rows = await db
    .select({
      id: siswa.id,
      nis: siswa.nis,
      nisn: siswa.nisn,
      nama: siswa.nama,
      jenisKelamin: siswa.jenisKelamin,
      tanggalLahir: siswa.tanggalLahir,
      aktif: siswa.aktif,
      kelasNama: kelas.nama,
      total: sql<number>`count(*) over()::int`,
    })
    .from(siswa)
    .leftJoin(kelasSiswa, and(eq(kelasSiswa.siswaId, siswa.id), eq(kelasSiswa.periodeId, o.periodeId ?? sql`null`)))
    .leftJoin(kelas, eq(kelas.id, kelasSiswa.kelasId))
    .where(syarat)
    .orderBy(asc(sql`lower(${siswa.nama})`), asc(siswa.nis))
    .limit(PER_HALAMAN)
    .offset((o.page - 1) * PER_HALAMAN);
  return { rows, total: rows[0]?.total ?? 0 };
}

export async function getSiswa(id: string) {
  const [s] = await db.select().from(siswa).where(eq(siswa.id, id));
  return s ?? null;
}

export async function riwayatSiswa(id: string) {
  const [kelasRiwayat, hasilRiwayat] = await Promise.all([
    db
      .select({ periode: periode.nama, kelas: kelas.nama, periodeId: periode.id })
      .from(kelasSiswa)
      .innerJoin(kelas, eq(kelas.id, kelasSiswa.kelasId))
      .innerJoin(periode, eq(periode.id, kelasSiswa.periodeId))
      .where(eq(kelasSiswa.siswaId, id))
      .orderBy(desc(periode.tahunAjaran), desc(periode.semester)),
    db
      .select({
        periode: periode.nama,
        kelompok: hasil.kelompok,
        peringkat: hasil.peringkat,
        nilai: hasil.nilaiPreferensi,
        terpilih: hasil.terpilih,
        jumlah: perhitungan.jumlahSiswa,
        runId: perhitungan.id,
      })
      .from(hasil)
      .innerJoin(perhitungan, eq(perhitungan.id, hasil.perhitunganId))
      .innerJoin(periode, eq(periode.id, perhitungan.periodeId))
      .where(and(eq(hasil.siswaId, id), eq(perhitungan.status, "DISETUJUI")))
      .orderBy(desc(periode.tahunAjaran), desc(periode.semester)),
  ]);
  return { kelasRiwayat, hasilRiwayat };
}
