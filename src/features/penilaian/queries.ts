import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { alternatif, kelas, kelasSiswa, kriteria, penilaian, siswa, user } from "@/db/schema";
import type { Pengguna } from "@/lib/rbac";

/** Progres per kelas dalam satu query agregat. */
export async function progresKelas(periodeId: string, p: Pengguna) {
  return db
    .select({
      id: kelas.id,
      nama: kelas.nama,
      tingkat: kelas.tingkat,
      waliNama: user.name,
      jumlahAlternatif: sql<number>`count(distinct ${alternatif.siswaId})::int`,
      jumlahLengkap: sql<number>`count(distinct ${alternatif.siswaId}) filter (where (
        select count(*) from ${penilaian} pn where pn.periode_id = ${alternatif.periodeId} and pn.siswa_id = ${alternatif.siswaId}
      ) >= (select count(*) from ${kriteria} where ${kriteria.periodeId} = ${periodeId}))::int`,
    })
    .from(kelas)
    .leftJoin(user, eq(user.id, kelas.waliKelasId))
    .leftJoin(kelasSiswa, eq(kelasSiswa.kelasId, kelas.id))
    .leftJoin(
      alternatif,
      and(eq(alternatif.periodeId, kelasSiswa.periodeId), eq(alternatif.siswaId, kelasSiswa.siswaId)),
    )
    .where(
      and(eq(kelas.periodeId, periodeId), p.role === "WALI_KELAS" ? eq(kelas.waliKelasId, p.id) : undefined),
    )
    .groupBy(kelas.id, user.name)
    .orderBy(asc(kelas.tingkat), asc(kelas.nama));
}

/** Alternatif di satu kelas beserta semua nilainya (2 query). */
export async function dataGrid(kelasId: string, periodeId: string) {
  const [baris, nilai] = await Promise.all([
    db
      .select({ siswaId: siswa.id, kode: alternatif.kode, nis: siswa.nis, nama: siswa.nama })
      .from(kelasSiswa)
      .innerJoin(
        alternatif,
        and(eq(alternatif.periodeId, kelasSiswa.periodeId), eq(alternatif.siswaId, kelasSiswa.siswaId)),
      )
      .innerJoin(siswa, eq(siswa.id, kelasSiswa.siswaId))
      .where(eq(kelasSiswa.kelasId, kelasId))
      .orderBy(sql`nullif(regexp_replace(${alternatif.kode}, '\\D', '', 'g'), '')::int`),
    db
      .select({
        siswaId: penilaian.siswaId,
        kriteriaId: penilaian.kriteriaId,
        nilaiMentah: penilaian.nilaiMentah,
        subKriteriaId: penilaian.subKriteriaId,
        nilai: penilaian.nilai,
      })
      .from(penilaian)
      .innerJoin(
        kelasSiswa,
        and(eq(kelasSiswa.periodeId, penilaian.periodeId), eq(kelasSiswa.siswaId, penilaian.siswaId)),
      )
      .where(and(eq(kelasSiswa.kelasId, kelasId), eq(penilaian.periodeId, periodeId))),
  ]);
  return { baris, nilai };
}
