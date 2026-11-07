import { SawValidationError } from "./errors.ts";
import type { AlternatifInput, HasilAlternatif, HasilKelompok, HasilSaw, KriteriaInput } from "./types.ts";

export const TOLERANSI = 1e-9;

/** Total bobot dibandingkan dalam satuan sen (2 desimal) agar bebas galat float. */
export function totalBobotSen(kriteria: readonly { bobotPersen: number }[]): number {
  let total = 0;
  for (const k of kriteria) total += Math.round(k.bobotPersen * 100);
  return total;
}

function validasi(kriteria: readonly KriteriaInput[], alternatif: readonly AlternatifInput[]) {
  const masalah: string[] = [];
  if (kriteria.length === 0) masalah.push("Belum ada kriteria");
  if (alternatif.length === 0) masalah.push("Belum ada alternatif");
  const total = totalBobotSen(kriteria);
  if (kriteria.length > 0 && total !== 10000) {
    masalah.push(`Total bobot ${(total / 100).toFixed(2)}%, harus 100%`);
  }
  for (const k of kriteria) {
    if (!(k.bobotPersen > 0)) masalah.push(`Bobot ${k.kode} harus lebih dari 0`);
  }
  for (const a of alternatif) {
    for (const k of kriteria) {
      const v = a.nilai[k.id];
      if (v === undefined) {
        masalah.push(`${a.nama}: nilai ${k.kode} belum diisi`);
      } else if (!Number.isFinite(v)) {
        masalah.push(`${a.nama}: nilai ${k.kode} tidak valid`);
      } else if (k.jenis === "COST" && v <= 0) {
        masalah.push(`${a.nama}: nilai ${k.kode} (cost) harus lebih dari 0`);
      } else if (v < 0) {
        masalah.push(`${a.nama}: nilai ${k.kode} tidak boleh negatif`);
      }
    }
  }
  if (masalah.length > 0) throw new SawValidationError(masalah);
}

function hitungKelompok(
  kriteria: readonly KriteriaInput[],
  anggota: readonly AlternatifInput[],
  kriteriaUtama: KriteriaInput,
): HasilKelompok {
  const max: Record<string, number> = {};
  const min: Record<string, number> = {};
  for (const k of kriteria) {
    let mx = Number.NEGATIVE_INFINITY;
    let mn = Number.POSITIVE_INFINITY;
    for (const a of anggota) {
      const v = a.nilai[k.id] as number;
      if (v > mx) mx = v;
      if (v < mn) mn = v;
    }
    max[k.id] = mx;
    min[k.id] = mn;
  }

  const hasil: HasilAlternatif[] = anggota.map((a) => {
    const normalisasi: Record<string, number> = {};
    const terbobot: Record<string, number> = {};
    let preferensi = 0;
    for (const k of kriteria) {
      const x = a.nilai[k.id] as number;
      let r: number;
      if (k.jenis === "BENEFIT") {
        const m = max[k.id] as number;
        r = m === 0 ? 0 : x / m;
      } else {
        r = (min[k.id] as number) / x;
      }
      const w = (k.bobotPersen / 100) * r;
      normalisasi[k.id] = r;
      terbobot[k.id] = w;
      preferensi += w;
    }
    return { id: a.id, nama: a.nama, kelompok: a.kelompok, normalisasi, terbobot, preferensi, peringkat: 0 };
  });

  const mentahUtama = new Map(
    anggota.map((a) => [a.id, a.nilaiMentahUtama ?? a.nilai[kriteria[0]?.id ?? ""] ?? 0]),
  );
  const kolator = new Intl.Collator("id", { sensitivity: "base" });

  // Urutan: V desc, lalu r kriteria berbobot terbesar, lalu nilai mentah C1, lalu nama A-Z.
  hasil.sort((a, b) => {
    const dv = b.preferensi - a.preferensi;
    if (Math.abs(dv) > TOLERANSI) return dv;
    const dr = (b.normalisasi[kriteriaUtama.id] ?? 0) - (a.normalisasi[kriteriaUtama.id] ?? 0);
    if (Math.abs(dr) > TOLERANSI) return dr;
    const dm = (mentahUtama.get(b.id) ?? 0) - (mentahUtama.get(a.id) ?? 0);
    if (Math.abs(dm) > TOLERANSI) return dm;
    return kolator.compare(a.nama, b.nama);
  });
  hasil.forEach((h, i) => {
    h.peringkat = i + 1;
  });

  return { max, min, hasil };
}

/**
 * Menghitung peringkat dengan Simple Additive Weighting.
 * Normalisasi dilakukan per kelompok karena max/min bergantung pada himpunan alternatif.
 */
export function hitungSaw(
  kriteria: readonly KriteriaInput[],
  alternatif: readonly AlternatifInput[],
): HasilSaw {
  validasi(kriteria, alternatif);

  // Kriteria berbobot terbesar untuk tie-break; seri bobot diambil yang urutannya lebih awal.
  let kriteriaUtama = kriteria[0] as KriteriaInput;
  for (const k of kriteria) if (k.bobotPersen > kriteriaUtama.bobotPersen) kriteriaUtama = k;

  const kelompok = new Map<string, AlternatifInput[]>();
  for (const a of alternatif) {
    const daftar = kelompok.get(a.kelompok);
    if (daftar) daftar.push(a);
    else kelompok.set(a.kelompok, [a]);
  }

  const perKelompok: Record<string, HasilKelompok> = {};
  for (const [nama, anggota] of kelompok) {
    perKelompok[nama] = hitungKelompok(kriteria, anggota, kriteriaUtama);
  }
  return { perKelompok };
}

/**
 * Mengubah skala kepentingan (1-5) menjadi bobot persen 2 desimal yang totalnya tepat 100,00.
 * Sisa pembulatan diberikan ke kriteria dengan pecahan terbesar (largest remainder).
 */
export function kepentinganKePersen(kepentingan: readonly number[]): number[] {
  const total = kepentingan.reduce((s, k) => s + k, 0);
  if (total <= 0) return kepentingan.map(() => 0);
  const mentah = kepentingan.map((k) => (k / total) * 10000);
  const dasar = mentah.map((m) => Math.floor(m));
  let sisa = 10000 - dasar.reduce((s, d) => s + d, 0);
  const urut = mentah.map((m, i) => ({ i, f: m - Math.floor(m) })).sort((a, b) => b.f - a.f);
  for (const { i } of urut) {
    if (sisa <= 0) break;
    dasar[i] = (dasar[i] as number) + 1;
    sisa--;
  }
  return dasar.map((d) => d / 100);
}
