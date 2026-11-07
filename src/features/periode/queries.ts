import "server-only";
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { alternatif, kelas, kriteria, penilaian, periode, perhitungan } from "@/db/schema";

export async function daftarPeriode() {
  // Satu query dengan subquery agregat (tanpa N+1).
  return db
    .select({
      id: periode.id,
      nama: periode.nama,
      tahunAjaran: periode.tahunAjaran,
      semester: periode.semester,
      status: periode.status,
      kuota: periode.kuota,
      createdAt: periode.createdAt,
      jumlahKelas: sql<number>`(select count(*)::int from ${kelas} where ${kelas.periodeId} = ${periode.id})`,
      jumlahKriteria: sql<number>`(select count(*)::int from ${kriteria} where ${kriteria.periodeId} = ${periode.id})`,
      jumlahAlternatif: sql<number>`(select count(*)::int from ${alternatif} where ${alternatif.periodeId} = ${periode.id})`,
    })
    .from(periode)
    .orderBy(desc(periode.tahunAjaran), desc(periode.semester));
}

export async function getPeriode(id: string) {
  const [p] = await db.select().from(periode).where(eq(periode.id, id));
  return p ?? null;
}

export async function ringkasPeriode(id: string) {
  const [[nilai], [run]] = await Promise.all([
    db.select({ n: count() }).from(penilaian).where(eq(penilaian.periodeId, id)),
    db.select({ n: count() }).from(perhitungan).where(eq(perhitungan.periodeId, id)),
  ]);
  return { jumlahNilai: nilai?.n ?? 0, jumlahRun: run?.n ?? 0 };
}
