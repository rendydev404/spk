"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { hasil, perhitungan, periode, validasi } from "@/db/schema";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";
import { kunciPeriode } from "../periode/guard";

export async function putuskanValidasi(
  runId: string,
  keputusan: string,
  catatan: string,
): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("KEPSEK");
    const rid = z.string().uuid().parse(runId);
    const k = z.enum(["DISETUJUI", "DITOLAK"]).parse(keputusan);
    const teks = catatan.trim().slice(0, 2000);
    if (k === "DITOLAK" && teks.length < 5) throw new GalatBisnis("Catatan penolakan wajib diisi");
    await db.transaction(async (tx) => {
      const [run] = await tx.select().from(perhitungan).where(eq(perhitungan.id, rid));
      if (!run) throw new GalatBisnis("Perhitungan tidak ditemukan");
      const p = await kunciPeriode(tx, run.periodeId, ["VALIDASI"]);
      if (run.status !== "DIAJUKAN") throw new GalatBisnis("Perhitungan ini tidak sedang diajukan");
      await tx
        .insert(validasi)
        .values({ perhitunganId: rid, kepsekId: u.id, keputusan: k, catatan: teks || null });
      if (k === "DISETUJUI") {
        await tx.update(perhitungan).set({ status: "DISETUJUI" }).where(eq(perhitungan.id, rid));
        if (p.kuota) {
          await tx
            .update(hasil)
            .set({ terpilih: sql`${hasil.peringkat} <= ${p.kuota}` })
            .where(eq(hasil.perhitunganId, rid));
        }
        await tx.update(periode).set({ status: "FINAL" }).where(eq(periode.id, run.periodeId));
      } else {
        await tx
          .update(perhitungan)
          .set({ status: "DITOLAK" })
          .where(and(eq(perhitungan.id, rid)));
        await tx.update(periode).set({ status: "PERHITUNGAN" }).where(eq(periode.id, run.periodeId));
      }
      await catatAudit(
        {
          userId: u.id,
          aksi: k === "DISETUJUI" ? "VALIDASI_SETUJU" : "VALIDASI_TOLAK",
          entitas: "perhitungan",
          entitasId: rid,
          data: { catatan: teks },
        },
        tx,
      );
    });
    revalidatePath("/", "layout");
    return {
      ok: true,
      pesan:
        k === "DISETUJUI"
          ? "Hasil disahkan. Periode menjadi Final."
          : "Hasil ditolak dan dikembalikan ke admin.",
    };
  });
}
