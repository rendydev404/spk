import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { AksesDitolak } from "./rbac";
import { SawValidationError } from "./saw";

export type HasilAksi<T = undefined> =
  | { ok: true; pesan?: string; data?: T }
  | { ok: false; pesan: string; galat?: Record<string, string>; masalah?: string[] };

/** Kesalahan bisnis yang aman ditampilkan ke pengguna. */
export class GalatBisnis extends Error {
  readonly masalah: string[] | undefined;
  constructor(pesan: string, masalah?: string[]) {
    super(pesan);
    this.name = "GalatBisnis";
    this.masalah = masalah;
  }
}

const PESAN_CONSTRAINT: Record<string, string> = {
  periode_tahun_ajaran_semester_unique: "Periode dengan tahun ajaran dan semester ini sudah ada",
  periode_satu_aktif: "Sudah ada periode lain yang sedang aktif. Selesaikan atau kembalikan ke DRAFT dulu",
  kelas_periode_id_nama_unique: "Nama kelas sudah dipakai di periode ini",
  kelas_siswa_satu_kelas_per_periode: "Siswa sudah terdaftar di kelas lain pada periode ini",
  siswa_nis_unique: "NIS sudah dipakai siswa lain",
  siswa_nisn_unique: "NISN sudah dipakai siswa lain",
  kriteria_periode_id_kode_unique: "Kode kriteria sudah dipakai di periode ini",
  sub_kriteria_kriteria_id_label_unique: "Label sub-kriteria sudah ada",
  user_username_unique: "Username sudah dipakai",
  user_email_unique: "Email sudah dipakai",
  alternatif_terdaftar_di_kelas: "Siswa masih menjadi alternatif. Keluarkan dari alternatif dulu",
};

function pgError(e: unknown): { code: string; constraint?: string } | null {
  let cur: unknown = e;
  for (let i = 0; i < 4 && cur; i++) {
    if (typeof cur === "object" && cur !== null && "code" in cur && typeof cur.code === "string") {
      const c = cur as { code: string; constraint_name?: string; constraint?: string };
      return { code: c.code, constraint: c.constraint_name ?? c.constraint };
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return null;
}

/** Membungkus server action: validasi, error mapping, tanpa membocorkan detail internal. */
export async function jalankan<T = undefined>(
  fn: () => Promise<HasilAksi<T> | undefined>,
): Promise<HasilAksi<T>> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof GalatBisnis)
      return { ok: false, pesan: e.message, ...(e.masalah ? { masalah: e.masalah } : {}) };
    if (e instanceof AksesDitolak) return { ok: false, pesan: e.message };
    if (e instanceof SawValidationError)
      return { ok: false, pesan: "Data belum siap dihitung", masalah: e.masalah };
    if (e instanceof z.ZodError) {
      const galat: Record<string, string> = {};
      for (const i of e.issues) {
        const k = i.path.join(".");
        if (!galat[k]) galat[k] = i.message;
      }
      return { ok: false, pesan: e.issues[0]?.message ?? "Input tidak valid", galat };
    }
    const pg = pgError(e);
    if (pg?.code === "23505" || pg?.code === "23503" || pg?.code === "23514") {
      const pesan =
        (pg.constraint && PESAN_CONSTRAINT[pg.constraint]) ??
        (pg.code === "23503"
          ? "Data masih dipakai oleh data lain sehingga tidak bisa dihapus"
          : "Data bentrok dengan data yang sudah ada");
      return { ok: false, pesan };
    }
    console.error("[aksi]", e);
    return { ok: false, pesan: "Terjadi kesalahan pada server. Coba lagi." };
  }
}
