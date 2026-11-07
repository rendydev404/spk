import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { kriteria, subKriteria } from "@/db/schema";

export async function daftarKriteria(periodeId: string) {
  return db
    .select({
      id: kriteria.id,
      kode: kriteria.kode,
      nama: kriteria.nama,
      jenis: kriteria.jenis,
      bobot: kriteria.bobot,
      kepentingan: kriteria.kepentingan,
      tipeInput: kriteria.tipeInput,
      nilaiMin: kriteria.nilaiMin,
      nilaiMax: kriteria.nilaiMax,
      urutan: kriteria.urutan,
      jumlahSub: sql<number>`(select count(*)::int from ${subKriteria} where ${subKriteria.kriteriaId} = ${kriteria.id})`,
    })
    .from(kriteria)
    .where(eq(kriteria.periodeId, periodeId))
    .orderBy(asc(kriteria.urutan), asc(kriteria.kode));
}

/** Kriteria beserta sub-kriteria (2 query, tanpa N+1). Dipakai penilaian dan perhitungan. */
export async function kriteriaLengkap(periodeId: string) {
  const [ks, subs] = await Promise.all([
    daftarKriteria(periodeId),
    db
      .select()
      .from(subKriteria)
      .innerJoin(kriteria, eq(kriteria.id, subKriteria.kriteriaId))
      .where(eq(kriteria.periodeId, periodeId))
      .orderBy(asc(subKriteria.urutan), asc(subKriteria.nilai)),
  ]);
  return ks.map((k) => ({
    ...k,
    sub: subs
      .filter((s) => s.sub_kriteria.kriteriaId === k.id)
      .map((s) => ({
        id: s.sub_kriteria.id,
        label: s.sub_kriteria.label,
        nilai: Number(s.sub_kriteria.nilai),
        batasBawah: s.sub_kriteria.batasBawah === null ? null : Number(s.sub_kriteria.batasBawah),
        batasAtas: s.sub_kriteria.batasAtas === null ? null : Number(s.sub_kriteria.batasAtas),
      })),
  }));
}

export async function getKriteria(id: string) {
  const [k] = await db.select().from(kriteria).where(eq(kriteria.id, id));
  if (!k) return null;
  const sub = await db
    .select()
    .from(subKriteria)
    .where(eq(subKriteria.kriteriaId, id))
    .orderBy(asc(subKriteria.urutan));
  return { ...k, sub };
}
