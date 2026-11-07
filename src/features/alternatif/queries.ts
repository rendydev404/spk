import "server-only";
import { and, asc, eq, notExists, sql } from "drizzle-orm";
import { db } from "@/db";
import { alternatif, kelas, kelasSiswa, kriteria, penilaian, siswa } from "@/db/schema";
import type { Pengguna } from "@/lib/rbac";

export async function daftarAlternatif(periodeId: string, p: Pengguna, kelasId?: string) {
  return db
    .select({
      siswaId: alternatif.siswaId,
      kode: alternatif.kode,
      nis: siswa.nis,
      nama: siswa.nama,
      kelasId: kelas.id,
      kelasNama: kelas.nama,
      tingkat: kelas.tingkat,
      jumlahNilai: sql<number>`(select count(*)::int from ${penilaian} where ${penilaian.periodeId} = ${alternatif.periodeId} and ${penilaian.siswaId} = ${alternatif.siswaId})`,
    })
    .from(alternatif)
    .innerJoin(siswa, eq(siswa.id, alternatif.siswaId))
    .innerJoin(
      kelasSiswa,
      and(eq(kelasSiswa.periodeId, alternatif.periodeId), eq(kelasSiswa.siswaId, alternatif.siswaId)),
    )
    .innerJoin(kelas, eq(kelas.id, kelasSiswa.kelasId))
    .where(
      and(
        eq(alternatif.periodeId, periodeId),
        p.role === "WALI_KELAS" ? eq(kelas.waliKelasId, p.id) : undefined,
        kelasId ? eq(kelas.id, kelasId) : undefined,
      ),
    )
    .orderBy(sql`nullif(regexp_replace(${alternatif.kode}, '\\D', '', 'g'), '')::int`, asc(siswa.nama));
}

export async function jumlahKriteria(periodeId: string) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(kriteria)
    .where(eq(kriteria.periodeId, periodeId));
  return r?.n ?? 0;
}

/** Siswa aktif yang terdaftar di kelas periode ini tetapi belum menjadi alternatif. */
export async function calonAlternatif(periodeId: string) {
  return db
    .select({ id: siswa.id, nis: siswa.nis, nama: siswa.nama, kelasNama: kelas.nama })
    .from(kelasSiswa)
    .innerJoin(siswa, eq(siswa.id, kelasSiswa.siswaId))
    .innerJoin(kelas, eq(kelas.id, kelasSiswa.kelasId))
    .where(
      and(
        eq(kelasSiswa.periodeId, periodeId),
        eq(siswa.aktif, true),
        notExists(
          db
            .select({ x: sql`1` })
            .from(alternatif)
            .where(and(eq(alternatif.periodeId, periodeId), eq(alternatif.siswaId, siswa.id))),
        ),
      ),
    )
    .orderBy(asc(kelas.nama), asc(sql`lower(${siswa.nama})`));
}
