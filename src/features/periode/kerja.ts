import "server-only";
import { desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { periode } from "@/db/schema";
import type { StatusPeriode } from "@/lib/status";

export const COOKIE_PERIODE = "spk_periode";
const STATUS_AKTIF: StatusPeriode[] = ["PENILAIAN", "PERHITUNGAN", "VALIDASI"];

export type PeriodeRingkas = {
  id: string;
  nama: string;
  status: StatusPeriode;
  kuota: number | null;
  cakupanDefault: "SEKOLAH" | "TINGKAT" | "KELAS";
  modeBobot: "PERSEN" | "KEPENTINGAN";
};

/**
 * Periode yang sedang dikerjakan: pilihan pengguna (cookie), lalu periode aktif, lalu yang terbaru.
 * Tabel periode kecil (beberapa baris per tahun), jadi diambil sekali per request.
 */
export const getPeriodeKerja = cache(async () => {
  const semua: PeriodeRingkas[] = await db
    .select({
      id: periode.id,
      nama: periode.nama,
      status: periode.status,
      kuota: periode.kuota,
      cakupanDefault: periode.cakupanDefault,
      modeBobot: periode.modeBobot,
    })
    .from(periode)
    .orderBy(desc(periode.tahunAjaran), desc(periode.semester));
  const pilihan = (await cookies()).get(COOKIE_PERIODE)?.value;
  const kerja =
    semua.find((p) => p.id === pilihan) ??
    semua.find((p) => STATUS_AKTIF.includes(p.status)) ??
    semua[0] ??
    null;
  return { kerja, semua };
});
