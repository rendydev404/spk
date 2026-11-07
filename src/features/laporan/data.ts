import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { hasil, kelas, siswa } from "@/db/schema";
import type { Pengguna } from "@/lib/rbac";
import { runUtama } from "../hasil/queries";
import { getRun } from "../perhitungan/queries";
import { getPeriode } from "../periode/queries";

/**
 * Data laporan satu periode, sudah dibatasi sesuai peran:
 * wali kelas hanya hasil yang disahkan dan hanya siswa di kelasnya.
 */
export async function dataLaporan(periodeId: string, u: Pengguna) {
  const periode = await getPeriode(periodeId);
  if (!periode) return null;
  const wali = u.role === "WALI_KELAS";
  const ringkas = await runUtama(periodeId, !wali);
  if (!ringkas || (wali && ringkas.status !== "DISETUJUI")) return { periode, run: null, rows: [] };
  const run = await getRun(ringkas.id);
  if (!run) return { periode, run: null, rows: [] };
  let rows = await db
    .select({
      siswaId: hasil.siswaId,
      kode: hasil.kodeAlternatif,
      kelompok: hasil.kelompok,
      kelasNama: hasil.kelasNama,
      nama: siswa.nama,
      nis: siswa.nis,
      nilaiX: hasil.nilaiX,
      normalisasi: hasil.normalisasi,
      v: hasil.nilaiPreferensi,
      peringkat: hasil.peringkat,
      terpilih: hasil.terpilih,
    })
    .from(hasil)
    .innerJoin(siswa, eq(siswa.id, hasil.siswaId))
    .where(eq(hasil.perhitunganId, run.id))
    .orderBy(asc(hasil.kelompok), asc(hasil.peringkat));
  if (wali) {
    const milik = await db
      .select({ nama: kelas.nama })
      .from(kelas)
      .where(and(eq(kelas.periodeId, periodeId), eq(kelas.waliKelasId, u.id)));
    const punya = new Set(milik.map((k) => k.nama));
    rows = rows.filter((r) => punya.has(r.kelasNama));
  }
  const disahkan = run.status === "DISETUJUI";
  // Untuk hasil yang belum disahkan, tandai calon berdasarkan kuota.
  if (!disahkan && periode.kuota)
    rows = rows.map((r) => ({ ...r, terpilih: r.peringkat <= (periode.kuota ?? 0) }));
  return { periode, run, rows, disahkan };
}
