"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { kelas } from "@/db/schema";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { bacaXlsx, PESAN_FILE } from "@/lib/excel";
import { parseAngka } from "@/lib/format";
import { requireUser } from "@/lib/rbac";
import { kriteriaLengkap } from "../kriteria/queries";
import { dataGrid } from "./queries";
import { type EntriNilai, simpanNilaiKelas } from "./simpan";

const entriSchema = z
  .array(
    z.object({
      siswaId: z.string().uuid(),
      kriteriaId: z.string().uuid(),
      mentah: z.number().finite().nullable(),
      subKriteriaId: z.string().uuid().nullable(),
      hapus: z.boolean(),
    }),
  )
  .min(1, "Tidak ada perubahan")
  .max(10000);

export async function simpanPenilaian(kelasId: string, input: unknown): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireUser();
    const kid = z.string().uuid().parse(kelasId);
    const entri = entriSchema.parse(input);
    const r = await simpanNilaiKelas(u, kid, entri);
    revalidatePath("/penilaian", "layout");
    return { ok: true, pesan: `${r.disimpan + r.dihapus} nilai disimpan` };
  });
}

/** Impor nilai dari template Excel per kelas. Semua baris harus valid (all-or-nothing). */
export async function imporNilai(kelasId: string, _: unknown, fd: FormData): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireUser();
    const kid = z.string().uuid().parse(kelasId);
    const [k] = await db.select().from(kelas).where(eq(kelas.id, kid));
    if (!k) throw new GalatBisnis("Kelas tidak ditemukan");
    const daftarK = await kriteriaLengkap(k.periodeId);
    let baris: string[][];
    let header: string[];
    try {
      ({ baris, header } = await bacaXlsx(fd.get("file") as File | null, 3 + daftarK.length));
    } catch (e) {
      throw new GalatBisnis(
        PESAN_FILE[(e as Error).message] ?? "File tidak bisa dibaca. Pastikan memakai template.",
      );
    }
    // Kolom kriteria dicocokkan lewat kode di awal judul kolom ("C1 ...").
    const kolom = daftarK.map((kr) => header.findIndex((h) => h.split(/\s/)[0]?.toUpperCase() === kr.kode));
    if (header[1]?.toUpperCase() !== "NIS" || kolom.some((c) => c < 0)) {
      throw new GalatBisnis("Kolom file tidak sesuai template. Unduh ulang template kelas ini.");
    }
    const { baris: anggota } = await dataGrid(kid, k.periodeId);
    const byNis = new Map(anggota.map((a) => [a.nis, a.siswaId]));
    const masalah: string[] = [];
    const entri: EntriNilai[] = [];
    baris.forEach((b, i) => {
      const siswaId = byNis.get(b[1] ?? "");
      if (!siswaId) {
        masalah.push(`Baris ${i + 2}: NIS ${b[1]} bukan alternatif di kelas ini`);
        return;
      }
      daftarK.forEach((kr, j) => {
        const sel = (b[kolom[j] as number] ?? "").trim();
        if (sel === "") return;
        if (kr.tipeInput === "PILIHAN") {
          const s = kr.sub.find((x) => x.label.toLowerCase() === sel.toLowerCase());
          if (!s) masalah.push(`Baris ${i + 2} ${kr.kode}: pilihan "${sel}" tidak dikenal`);
          else entri.push({ siswaId, kriteriaId: kr.id, mentah: null, subKriteriaId: s.id, hapus: false });
        } else {
          const n = parseAngka(sel);
          if (n === null) masalah.push(`Baris ${i + 2} ${kr.kode}: "${sel}" bukan angka`);
          else entri.push({ siswaId, kriteriaId: kr.id, mentah: n, subKriteriaId: null, hapus: false });
        }
      });
    });
    if (masalah.length)
      throw new GalatBisnis(
        "File berisi data yang tidak valid. Tidak ada yang disimpan.",
        masalah.slice(0, 20),
      );
    if (entri.length === 0) throw new GalatBisnis("File tidak berisi nilai");
    const r = await simpanNilaiKelas(u, kid, entri);
    revalidatePath("/penilaian", "layout");
    return { ok: true, pesan: `${r.disimpan} nilai diimpor` };
  });
}
