import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { hasil, siswa } from "@/db/schema";

/** Semua baris hasil sebuah run (untuk ekspor run selain run utama, hanya admin/kepsek). */
export async function rowsRun(runId: string) {
  return db
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
    .where(eq(hasil.perhitunganId, runId))
    .orderBy(asc(hasil.kelompok), asc(hasil.peringkat));
}
