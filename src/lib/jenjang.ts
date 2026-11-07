export type Jenjang = "SD" | "SMP" | "SMA" | "LAINNYA";

export const LABEL_JENJANG: Record<Jenjang, string> = {
  SD: "SD / MI",
  SMP: "SMP / MTs",
  SMA: "SMA / MA / SMK",
  LAINNYA: "Lainnya",
};

const RENTANG: Record<Jenjang, [number, number]> = {
  SD: [1, 6],
  SMP: [7, 9],
  SMA: [10, 12],
  LAINNYA: [1, 12],
};

/** Pilihan tingkat kelas sesuai jenjang sekolah. */
export function daftarTingkat(j: Jenjang): number[] {
  const [a, b] = RENTANG[j];
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}
