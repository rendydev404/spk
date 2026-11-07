const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const angka4 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const tanggal = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});
const tanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});
const waktu = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export const fmtAngka = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === "" ? "-" : angka.format(Number(n));
export const fmt4 = (n: number | string) => angka4.format(Number(n));
export const fmtTanggal = (d: Date | string | null | undefined) => (d ? tanggal.format(new Date(d)) : "-");
export const fmtTanggalPanjang = (d: Date | string) => tanggalPanjang.format(new Date(d));
export const fmtWaktu = (d: Date | string) => waktu.format(new Date(d));

/** Parsing angka gaya Indonesia: "88,5" atau "88.5". Mengembalikan null jika kosong/tidak valid. */
export function parseAngka(s: string | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  const t = s.trim().replace(/\s/g, "");
  if (t === "") return null;
  // "1.234,5" -> 1234.5; "88,5" -> 88.5; "88.5" -> 88.5
  const norm = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  if (!/^-?\d+(\.\d+)?$/.test(norm)) return null;
  return Number(norm);
}
