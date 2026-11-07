import { z } from "zod";

export const siswaSchema = z.object({
  nis: z
    .string()
    .trim()
    .min(1, "NIS wajib diisi")
    .max(20, "NIS maksimal 20 karakter")
    .regex(/^[A-Za-z0-9]+$/, "NIS hanya huruf dan angka"),
  nisn: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().regex(/^\d{10}$/, "NISN harus 10 digit").nullable()),
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(100, "Nama maksimal 100 karakter"),
  jenisKelamin: z.enum(["L", "P"], { message: "Pilih jenis kelamin" }),
  tanggalLahir: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid")
        .refine((v) => {
          const t = new Date(`${v}T00:00:00Z`).getTime();
          return t > Date.UTC(1990, 0, 1) && t < Date.now();
        }, "Tanggal lahir tidak wajar")
        .nullable(),
    ),
});

export type SiswaInput = z.infer<typeof siswaSchema>;
