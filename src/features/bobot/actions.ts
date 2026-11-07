"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { kriteria, periode } from "@/db/schema";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";
import { kepentinganKePersen } from "@/lib/saw";
import { kunciPeriode } from "../periode/guard";

const schema = z.object({
  mode: z.enum(["PERSEN", "KEPENTINGAN"]),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        bobot: z.number().finite().nullable(),
        kepentingan: z.number().int().min(1).max(5).nullable(),
      }),
    )
    .min(1),
});

export async function simpanBobot(periodeId: string, input: unknown): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const pid = z.string().uuid().parse(periodeId);
    const d = schema.parse(input);
    let baru: { id: string; bobot: number; kepentingan: number | null }[];
    if (d.mode === "KEPENTINGAN") {
      if (d.items.some((i) => i.kepentingan === null))
        throw new GalatBisnis("Semua kriteria wajib diberi tingkat kepentingan");
      const persen = kepentinganKePersen(d.items.map((i) => i.kepentingan as number));
      baru = d.items.map((i, n) => ({ id: i.id, bobot: persen[n] as number, kepentingan: i.kepentingan }));
    } else {
      for (const i of d.items) {
        if (i.bobot === null || i.bobot <= 0 || i.bobot > 100)
          throw new GalatBisnis("Setiap bobot harus antara 0,01 dan 100");
        if (Math.abs(i.bobot * 100 - Math.round(i.bobot * 100)) > 1e-9)
          throw new GalatBisnis("Bobot maksimal 2 angka desimal");
      }
      baru = d.items.map((i) => ({ id: i.id, bobot: i.bobot as number, kepentingan: null }));
    }
    // Total dibandingkan dalam satuan sen (integer) agar bebas galat float.
    const totalSen = baru.reduce((s, b) => s + Math.round(b.bobot * 100), 0);
    if (totalSen !== 10000)
      throw new GalatBisnis(`Total bobot ${(totalSen / 100).toFixed(2)}%, harus tepat 100%`);

    await db.transaction(async (tx) => {
      await kunciPeriode(tx, pid, ["DRAFT"]);
      const lama = await tx
        .select({ id: kriteria.id, kode: kriteria.kode, bobot: kriteria.bobot })
        .from(kriteria)
        .where(eq(kriteria.periodeId, pid));
      if (lama.length !== baru.length || !baru.every((b) => lama.some((l) => l.id === b.id))) {
        throw new GalatBisnis("Daftar kriteria berubah. Muat ulang halaman lalu coba lagi.");
      }
      // Satu UPDATE untuk semua kriteria.
      await tx.execute(sql`update kriteria set bobot = v.bobot, kepentingan = v.kepentingan
        from (values ${sql.join(
          baru.map((b) => sql`(${b.id}::uuid, ${b.bobot.toFixed(2)}::numeric, ${b.kepentingan}::smallint)`),
          sql`, `,
        )}) as v(id, bobot, kepentingan)
        where kriteria.id = v.id and kriteria.periode_id = ${pid}`);
      await tx.update(periode).set({ modeBobot: d.mode }).where(eq(periode.id, pid));
      await catatAudit(
        {
          userId: u.id,
          aksi: "BOBOT_UBAH",
          entitas: "periode",
          entitasId: pid,
          data: {
            mode: d.mode,
            sebelum: Object.fromEntries(lama.map((l) => [l.kode, Number(l.bobot)])),
            sesudah: Object.fromEntries(baru.map((b) => [lama.find((l) => l.id === b.id)?.kode, b.bobot])),
          },
        },
        tx,
      );
    });
    revalidatePath(`/periode/${pid}`, "layout");
    return { ok: true, pesan: "Bobot kriteria disimpan" };
  });
}
