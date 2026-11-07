import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Semua angka ringkasan dashboard dalam SATU query agregat. */
export async function ringkasan(periodeId: string | null) {
  const [r] = await db.execute<{
    siswa_aktif: number;
    alternatif: number;
    kriteria: number;
    total_bobot: string;
    kelas: number;
    nilai_terisi: number;
    pengajuan: number;
  }>(sql`
    select
      (select count(*)::int from siswa where aktif) as siswa_aktif,
      (select count(*)::int from alternatif where periode_id = ${periodeId}) as alternatif,
      (select count(*)::int from kriteria where periode_id = ${periodeId}) as kriteria,
      (select coalesce(sum(bobot), 0)::text from kriteria where periode_id = ${periodeId}) as total_bobot,
      (select count(*)::int from kelas where periode_id = ${periodeId}) as kelas,
      (select count(*)::int from penilaian where periode_id = ${periodeId}) as nilai_terisi,
      (select count(*)::int from perhitungan where status = 'DIAJUKAN') as pengajuan`);
  return r!;
}
