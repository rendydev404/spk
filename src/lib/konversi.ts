export type TipeInput = "ANGKA" | "RENTANG" | "PILIHAN";

export interface SubKriteriaKonversi {
  id: string;
  label: string;
  nilai: number;
  batasBawah: number | null;
  batasAtas: number | null;
}

export interface KriteriaKonversi {
  kode: string;
  tipeInput: TipeInput;
  jenis: "BENEFIT" | "COST";
  nilaiMin: number | null;
  nilaiMax: number | null;
  sub: SubKriteriaKonversi[];
}

export type HasilKonversi =
  | { ok: true; nilai: number; nilaiMentah: number | null; subKriteriaId: string | null }
  | { ok: false; pesan: string };

const duaDesimal = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;

/** Mencari sub-kriteria rentang yang memuat x. Batas bawah inklusif, batas atas inklusif (null = tak terbatas). */
export function cariRentang(sub: readonly SubKriteriaKonversi[], x: number): SubKriteriaKonversi | null {
  return (
    sub.find((s) => (s.batasBawah === null || x >= s.batasBawah) && (s.batasAtas === null || x <= s.batasAtas)) ?? null
  );
}

/**
 * Mengubah input penilaian menjadi nilai matriks X.
 * ANGKA dan RENTANG memakai `mentah`; PILIHAN memakai `subKriteriaId`.
 */
export function konversi(
  k: KriteriaKonversi,
  input: { mentah?: number | null; subKriteriaId?: string | null },
): HasilKonversi {
  if (k.tipeInput === "PILIHAN") {
    const s = k.sub.find((x) => x.id === input.subKriteriaId);
    if (!s) return { ok: false, pesan: `${k.kode}: pilihan tidak valid` };
    return { ok: true, nilai: s.nilai, nilaiMentah: null, subKriteriaId: s.id };
  }
  const x = input.mentah;
  if (x === null || x === undefined || !Number.isFinite(x)) return { ok: false, pesan: `${k.kode}: nilai wajib angka` };
  if (!duaDesimal(x)) return { ok: false, pesan: `${k.kode}: maksimal 2 angka desimal` };
  if (k.nilaiMin !== null && x < k.nilaiMin) return { ok: false, pesan: `${k.kode}: minimal ${k.nilaiMin}` };
  if (k.nilaiMax !== null && x > k.nilaiMax) return { ok: false, pesan: `${k.kode}: maksimal ${k.nilaiMax}` };
  if (k.tipeInput === "ANGKA") {
    if (k.jenis === "COST" && x <= 0) return { ok: false, pesan: `${k.kode}: kriteria cost harus lebih dari 0` };
    return { ok: true, nilai: x, nilaiMentah: x, subKriteriaId: null };
  }
  if (x < 0) return { ok: false, pesan: `${k.kode}: tidak boleh negatif` };
  const s = cariRentang(k.sub, x);
  if (!s) return { ok: false, pesan: `${k.kode}: ${x} tidak masuk rentang mana pun` };
  return { ok: true, nilai: s.nilai, nilaiMentah: x, subKriteriaId: s.id };
}

/**
 * Dua rentang dianggap bersambung jika jaraknya 0,01 (data 2 desimal), atau 1 bila kedua batas bilangan bulat
 * (misal 0 lalu 1-2 hari: data hari selalu bulat).
 */
function bersambung(atas: number, bawah: number): boolean {
  const selisih = Math.round((bawah - atas) * 100);
  if (selisih <= 1) return true;
  return Number.isInteger(atas) && Number.isInteger(bawah) && selisih === 100;
}

/** Memeriksa rentang sub-kriteria: tidak tumpang tindih dan tidak berlubang (untuk nilai 2 desimal). */
export function cekRentang(sub: readonly { label: string; batasBawah: number | null; batasAtas: number | null }[]): string[] {
  const masalah: string[] = [];
  const urut = [...sub].sort((a, b) => (a.batasBawah ?? Number.NEGATIVE_INFINITY) - (b.batasBawah ?? Number.NEGATIVE_INFINITY));
  for (const s of urut) {
    if (s.batasBawah !== null && s.batasAtas !== null && s.batasAtas < s.batasBawah) {
      masalah.push(`${s.label}: batas atas lebih kecil dari batas bawah`);
    }
  }
  for (let i = 1; i < urut.length; i++) {
    const a = urut[i - 1]!;
    const b = urut[i]!;
    if (a.batasAtas === null) {
      masalah.push(`${a.label}: rentang tak terbatas harus berada paling akhir`);
      continue;
    }
    if (b.batasBawah === null) continue;
    if (b.batasBawah <= a.batasAtas) masalah.push(`${a.label} dan ${b.label} tumpang tindih`);
    else if (!bersambung(a.batasAtas, b.batasBawah)) {
      masalah.push(`Ada celah antara ${a.label} dan ${b.label}`);
    }
  }
  return masalah;
}
