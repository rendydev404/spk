"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, type Tx } from "@/db";
import { alternatif } from "@/db/schema";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";
import { kunciPeriode, urutkanKodeAlternatif } from "../periode/guard";

const uuid = z.string().uuid();

const tambahSchema = z.discriminatedUnion("cara", [
  z.object({ cara: z.literal("siswa"), siswaIds: z.array(uuid).min(1, "Pilih minimal satu siswa").max(2000) }),
  z.object({ cara: z.literal("kelas"), kelasId: uuid }),
  z.object({ cara: z.literal("tingkat"), tingkat: z.number().int().min(1).max(12) }),
  z.object({ cara: z.literal("sekolah") }),
]);

/**
 * Menambah alternatif dengan satu INSERT ... SELECT. Hanya siswa aktif yang terdaftar di kelas periode ini;
 * yang sudah menjadi alternatif dilewati (ON CONFLICT DO NOTHING).
 */
async function sisipkan(tx: Tx, periodeId: string, userId: string, d: z.infer<typeof tambahSchema>) {
  const filter =
    d.cara === "siswa"
      ? sql`and ks.siswa_id in (${sql.join(d.siswaIds.map((i) => sql`${i}::uuid`), sql`, `)})`
      : d.cara === "kelas"
        ? sql`and ks.kelas_id = ${d.kelasId}`
        : d.cara === "tingkat"
          ? sql`and k.tingkat = ${d.tingkat}`
          : sql``;
  const r = await tx.execute(sql`
    insert into alternatif (periode_id, siswa_id, kode, ditambahkan_oleh)
    select ks.periode_id, ks.siswa_id,
      'A' || (coalesce((select max(nullif(regexp_replace(kode, '\\D', '', 'g'), '')::int) from alternatif where periode_id = ${periodeId}), 0)
              + row_number() over (order by k.tingkat, k.nama, lower(s.nama), s.nis)),
      ${userId}
    from kelas_siswa ks
    join kelas k on k.id = ks.kelas_id
    join siswa s on s.id = ks.siswa_id and s.aktif
    where ks.periode_id = ${periodeId} ${filter}
      and not exists (select 1 from alternatif a where a.periode_id = ks.periode_id and a.siswa_id = ks.siswa_id)
    on conflict do nothing`);
  return r.count ?? 0;
}

export async function tambahAlternatif(periodeId: string, input: unknown): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const pid = uuid.parse(periodeId);
    const d = tambahSchema.parse(input);
    let n = 0;
    await db.transaction(async (tx) => {
      const p = await kunciPeriode(tx, pid, ["DRAFT", "PENILAIAN"]);
      n = await sisipkan(tx, pid, u.id, d);
      if (p.status === "DRAFT") await urutkanKodeAlternatif(tx, pid);
      await catatAudit(
        { userId: u.id, aksi: "ALTERNATIF_TAMBAH", entitas: "periode", entitasId: pid, data: { cara: d.cara, jumlah: n, susulan: p.status !== "DRAFT" } },
        tx,
      );
    });
    revalidatePath("/alternatif");
    if (n === 0) return { ok: true, pesan: "Tidak ada siswa baru yang ditambahkan (semua sudah menjadi alternatif)" };
    return { ok: true, pesan: `${n} siswa ditambahkan sebagai alternatif` };
  });
}

export async function keluarkanAlternatif(periodeId: string, siswaIds: string[]): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const pid = uuid.parse(periodeId);
    const ids = z.array(uuid).min(1).max(2000).parse(siswaIds);
    let n = 0;
    await db.transaction(async (tx) => {
      await kunciPeriode(tx, pid, ["DRAFT"]);
      const r = await tx
        .delete(alternatif)
        .where(and(eq(alternatif.periodeId, pid), inArray(alternatif.siswaId, ids)))
        .returning({ id: alternatif.siswaId });
      n = r.length;
      if (n === 0) throw new GalatBisnis("Alternatif tidak ditemukan");
      await urutkanKodeAlternatif(tx, pid);
      await catatAudit({ userId: u.id, aksi: "ALTERNATIF_KELUAR", entitas: "periode", entitasId: pid, data: { jumlah: n } }, tx);
    });
    revalidatePath("/alternatif");
    return { ok: true, pesan: `${n} alternatif dikeluarkan` };
  });
}
