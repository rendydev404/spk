import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { perhitungan } from "@/db/schema";

/** Run yang ditampilkan sebagai hasil periode: yang disetujui, lalu yang diajukan, lalu yang terbaru. */
export async function runUtama(periodeId: string, termasukDraf: boolean) {
  const runs = await db
    .select({
      id: perhitungan.id,
      status: perhitungan.status,
      dihitungPada: perhitungan.dihitungPada,
      cakupan: perhitungan.cakupan,
    })
    .from(perhitungan)
    .where(
      and(
        eq(perhitungan.periodeId, periodeId),
        termasukDraf ? undefined : inArray(perhitungan.status, ["DISETUJUI"]),
      ),
    )
    .orderBy(desc(perhitungan.dihitungPada));
  return (
    runs.find((r) => r.status === "DISETUJUI") ?? runs.find((r) => r.status === "DIAJUKAN") ?? runs[0] ?? null
  );
}
