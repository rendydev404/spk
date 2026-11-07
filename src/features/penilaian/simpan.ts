import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { alternatif, kelas, kelasSiswa, penilaian } from "@/db/schema";
import { GalatBisnis } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { konversi } from "@/lib/konversi";
import type { Pengguna } from "@/lib/rbac";
import { kriteriaLengkap } from "../kriteria/queries";
import { kunciPeriode } from "../periode/guard";

export type EntriNilai = {
  siswaId: string;
  kriteriaId: string;
  mentah: number | null;
  subKriteriaId: string | null;
  hapus: boolean;
};

/**
 * Validasi dan simpan nilai satu kelas: guard status, kepemilikan kelas, keanggotaan alternatif,
 * konversi skala, lalu SATU upsert massal (dan satu delete untuk sel yang dikosongkan).
 */
export async function simpanNilaiKelas(u: Pengguna, kelasId: string, entri: EntriNilai[]) {
  const [k] = await db.select().from(kelas).where(eq(kelas.id, kelasId));
  if (!k) throw new GalatBisnis("Kelas tidak ditemukan");
  if (u.role === "WALI_KELAS" && k.waliKelasId !== u.id)
    throw new GalatBisnis("Kelas ini bukan kelas yang Anda ampu");
  if (u.role === "KEPSEK") throw new GalatBisnis("Kepala sekolah hanya bisa melihat nilai");

  const daftarK = await kriteriaLengkap(k.periodeId);
  const petaK = new Map(daftarK.map((x) => [x.id, x]));
  const anggota = await db
    .select({ siswaId: kelasSiswa.siswaId })
    .from(kelasSiswa)
    .innerJoin(
      alternatif,
      and(eq(alternatif.periodeId, kelasSiswa.periodeId), eq(alternatif.siswaId, kelasSiswa.siswaId)),
    )
    .where(eq(kelasSiswa.kelasId, kelasId));
  const sah = new Set(anggota.map((a) => a.siswaId));

  const masalah: string[] = [];
  const upsert: (typeof penilaian.$inferInsert)[] = [];
  const hapus: { siswaId: string; kriteriaId: string }[] = [];
  for (const e of entri) {
    const kr = petaK.get(e.kriteriaId);
    if (!sah.has(e.siswaId) || !kr) {
      masalah.push("Ada siswa atau kriteria yang bukan milik kelas/periode ini");
      continue;
    }
    if (e.hapus) {
      hapus.push({ siswaId: e.siswaId, kriteriaId: e.kriteriaId });
      continue;
    }
    const h = konversi(
      {
        kode: kr.kode,
        tipeInput: kr.tipeInput,
        jenis: kr.jenis,
        nilaiMin: kr.nilaiMin === null ? null : Number(kr.nilaiMin),
        nilaiMax: kr.nilaiMax === null ? null : Number(kr.nilaiMax),
        sub: kr.sub,
      },
      { mentah: e.mentah, subKriteriaId: e.subKriteriaId },
    );
    if (!h.ok) {
      masalah.push(h.pesan);
      continue;
    }
    upsert.push({
      periodeId: k.periodeId,
      siswaId: e.siswaId,
      kriteriaId: e.kriteriaId,
      nilaiMentah: h.nilaiMentah === null ? null : String(h.nilaiMentah),
      subKriteriaId: h.subKriteriaId,
      nilai: String(h.nilai),
      diinputOleh: u.id,
    });
  }
  if (masalah.length)
    throw new GalatBisnis(
      "Ada nilai yang tidak valid. Tidak ada yang disimpan.",
      [...new Set(masalah)].slice(0, 20),
    );

  await db.transaction(async (tx) => {
    await kunciPeriode(tx, k.periodeId, ["PENILAIAN"]);
    if (upsert.length) {
      await tx
        .insert(penilaian)
        .values(upsert)
        .onConflictDoUpdate({
          target: [penilaian.periodeId, penilaian.siswaId, penilaian.kriteriaId],
          set: {
            nilaiMentah: sql`excluded.nilai_mentah`,
            subKriteriaId: sql`excluded.sub_kriteria_id`,
            nilai: sql`excluded.nilai`,
            diinputOleh: sql`excluded.diinput_oleh`,
            updatedAt: sql`now()`,
          },
        });
    }
    if (hapus.length) {
      await tx.delete(penilaian).where(
        and(
          eq(penilaian.periodeId, k.periodeId),
          sql`(${penilaian.siswaId}, ${penilaian.kriteriaId}) in (${sql.join(
            hapus.map((h) => sql`(${h.siswaId}::uuid, ${h.kriteriaId}::uuid)`),
            sql`, `,
          )})`,
        ),
      );
    }
    await catatAudit(
      {
        userId: u.id,
        aksi: "PENILAIAN_SIMPAN",
        entitas: "kelas",
        entitasId: kelasId,
        data: { disimpan: upsert.length, dihapus: hapus.length },
      },
      tx,
    );
  });
  return { disimpan: upsert.length, dihapus: hapus.length };
}
