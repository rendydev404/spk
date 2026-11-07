export type StatusPeriode = "DRAFT" | "PENILAIAN" | "PERHITUNGAN" | "VALIDASI" | "FINAL";

export const LABEL_STATUS: Record<StatusPeriode, string> = {
  DRAFT: "Draf",
  PENILAIAN: "Penilaian",
  PERHITUNGAN: "Perhitungan",
  VALIDASI: "Validasi",
  FINAL: "Final",
};

export const LABEL_ROLE = { ADMIN: "Admin", WALI_KELAS: "Wali Kelas", KEPSEK: "Kepala Sekolah" } as const;

export const LABEL_CAKUPAN = {
  SEKOLAH: "Seluruh sekolah",
  TINGKAT: "Per tingkat",
  KELAS: "Per kelas",
} as const;

export const LABEL_TIPE = { ANGKA: "Angka", RENTANG: "Rentang (dikonversi)", PILIHAN: "Pilihan" } as const;
