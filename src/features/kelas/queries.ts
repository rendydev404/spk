import "server-only";
import { and, asc, eq, notExists, sql } from "drizzle-orm";
import { db } from "@/db";
import { alternatif, kelas, kelasSiswa, siswa, user } from "@/db/schema";
import type { Pengguna } from "@/lib/rbac";

export async function daftarKelas(periodeId: string, p: Pengguna) {
  return db
    .select({
      id: kelas.id,
      nama: kelas.nama,
      tingkat: kelas.tingkat,
      waliKelasId: kelas.waliKelasId,
      waliNama: user.name,
      jumlahSiswa: sql<number>`(select count(*)::int from ${kelasSiswa} where ${kelasSiswa.kelasId} = ${kelas.id})`,
    })
    .from(kelas)
    .leftJoin(user, eq(user.id, kelas.waliKelasId))
    .where(and(eq(kelas.periodeId, periodeId), p.role === "WALI_KELAS" ? eq(kelas.waliKelasId, p.id) : undefined))
    .orderBy(asc(kelas.tingkat), asc(kelas.nama));
}

export async function getKelas(id: string) {
  const [k] = await db
    .select({
      id: kelas.id,
      nama: kelas.nama,
      tingkat: kelas.tingkat,
      periodeId: kelas.periodeId,
      waliKelasId: kelas.waliKelasId,
      waliNama: user.name,
    })
    .from(kelas)
    .leftJoin(user, eq(user.id, kelas.waliKelasId))
    .where(eq(kelas.id, id));
  return k ?? null;
}

export async function anggotaKelas(kelasId: string) {
  return db
    .select({
      id: siswa.id,
      nis: siswa.nis,
      nama: siswa.nama,
      jenisKelamin: siswa.jenisKelamin,
      aktif: siswa.aktif,
      kodeAlternatif: alternatif.kode,
    })
    .from(kelasSiswa)
    .innerJoin(siswa, eq(siswa.id, kelasSiswa.siswaId))
    .leftJoin(alternatif, and(eq(alternatif.periodeId, kelasSiswa.periodeId), eq(alternatif.siswaId, kelasSiswa.siswaId)))
    .where(eq(kelasSiswa.kelasId, kelasId))
    .orderBy(asc(sql`lower(${siswa.nama})`));
}

/** Siswa aktif yang belum masuk kelas mana pun pada periode ini. */
export async function siswaTanpaKelas(periodeId: string) {
  return db
    .select({ id: siswa.id, nis: siswa.nis, nama: siswa.nama })
    .from(siswa)
    .where(
      and(
        eq(siswa.aktif, true),
        notExists(
          db
            .select({ x: sql`1` })
            .from(kelasSiswa)
            .where(and(eq(kelasSiswa.siswaId, siswa.id), eq(kelasSiswa.periodeId, periodeId))),
        ),
      ),
    )
    .orderBy(asc(sql`lower(${siswa.nama})`));
}

