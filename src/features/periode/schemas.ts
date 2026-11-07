import { z } from "zod";

export const periodeSchema = z.object({
  tahunAjaran: z
    .string()
    .trim()
    .regex(/^\d{4}\/\d{4}$/, "Format tahun ajaran 2025/2026")
    .refine((v) => {
      const [a, b] = v.split("/").map(Number);
      return b === (a ?? 0) + 1;
    }, "Tahun kedua harus tahun pertama + 1"),
  semester: z.enum(["GANJIL", "GENAP"], { message: "Pilih semester" }),
  kuota: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int("Kuota bilangan bulat").min(1, "Kuota minimal 1").max(1000).nullable()),
  cakupanDefault: z.enum(["SEKOLAH", "TINGKAT", "KELAS"]),
});

export const buatPeriodeSchema = periodeSchema.extend({
  sumber: z.string().trim(),
  salinKelas: z.enum(["", "struktur", "anggota", "__tidak"]).default(""),
});
