import { describe, expect, it } from "vitest";
import {
  type AlternatifInput,
  hitungSaw,
  type KriteriaInput,
  kepentinganKePersen,
  SawValidationError,
} from "./index.ts";

const K: KriteriaInput[] = [
  { id: "c1", kode: "C1", jenis: "BENEFIT", bobotPersen: 30 },
  { id: "c2", kode: "C2", jenis: "COST", bobotPersen: 15 },
  { id: "c3", kode: "C3", jenis: "BENEFIT", bobotPersen: 20 },
  { id: "c4", kode: "C4", jenis: "BENEFIT", bobotPersen: 20 },
  { id: "c5", kode: "C5", jenis: "BENEFIT", bobotPersen: 15 },
];
const alt = (id: string, nilai: number[], kelompok = "SEKOLAH"): AlternatifInput => ({
  id,
  nama: id,
  kelompok,
  nilai: Object.fromEntries(nilai.map((v, i) => [`c${i + 1}`, v])),
});
const CONTOH = [
  alt("A1", [88.5, 2, 4, 4, 4]),
  alt("A2", [91.2, 1, 3, 2, 3]),
  alt("A3", [85.0, 3, 4, 5, 4]),
  alt("A4", [89.7, 2, 4, 3, 3]),
  alt("A5", [82.3, 4, 3, 1, 2]),
];

describe("hitungSaw", () => {
  it("golden test contoh bagian 3.3", () => {
    const { perKelompok } = hitungSaw(K, CONTOH);
    const g = perKelompok.SEKOLAH!;
    expect(g.hasil.map((h) => h.id)).toEqual(["A3", "A1", "A4", "A2", "A5"]);
    const v = Object.fromEntries(g.hasil.map((h) => [h.id, Number(h.preferensi.toFixed(4))]));
    expect(v).toEqual({ A3: 0.8796, A1: 0.8761, A4: 0.8026, A2: 0.7925, A5: 0.5732 });
    const a1 = g.hasil.find((h) => h.id === "A1")!;
    expect(a1.normalisasi.c1).toBeCloseTo(0.9704, 4);
    expect(a1.normalisasi.c2).toBeCloseTo(0.5, 9);
    expect(g.max.c1).toBe(91.2);
    expect(g.min.c2).toBe(1);
  });

  it("benefit dengan max 0 menghasilkan r = 0, bukan NaN", () => {
    const k: KriteriaInput[] = [
      { id: "c1", kode: "C1", jenis: "BENEFIT", bobotPersen: 50 },
      { id: "c2", kode: "C2", jenis: "BENEFIT", bobotPersen: 50 },
    ];
    const { perKelompok } = hitungSaw(k, [alt("A", [0, 5]), alt("B", [0, 10])]);
    for (const h of perKelompok.SEKOLAH!.hasil) {
      expect(h.normalisasi.c1).toBe(0);
      expect(Number.isNaN(h.preferensi)).toBe(false);
    }
  });

  it("satu alternatif: semua r = 1, peringkat 1", () => {
    const { perKelompok } = hitungSaw(K, [CONTOH[0]!]);
    const h = perKelompok.SEKOLAH!.hasil[0]!;
    expect(Object.values(h.normalisasi).every((r) => r === 1)).toBe(true);
    expect(h.peringkat).toBe(1);
    expect(h.preferensi).toBeCloseTo(1, 12);
  });

  it("menolak nilai 0 pada kriteria cost", () => {
    expect(() => hitungSaw(K, [alt("X", [80, 0, 4, 4, 4])])).toThrow(SawValidationError);
  });

  it("menolak nilai yang belum lengkap", () => {
    const a: AlternatifInput = { id: "X", nama: "X", kelompok: "SEKOLAH", nilai: { c1: 80 } };
    try {
      hitungSaw(K, [a]);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(SawValidationError);
      expect((e as SawValidationError).masalah.length).toBe(4);
    }
  });

  it("bobot 99,99% ditolak, 33,33 + 33,33 + 33,34 diterima", () => {
    const tiga = (b: number[]): KriteriaInput[] =>
      b.map((bobotPersen, i) => ({ id: `c${i + 1}`, kode: `C${i + 1}`, jenis: "BENEFIT", bobotPersen }));
    const a = [alt("A", [1, 2, 3])];
    expect(() => hitungSaw(tiga([33.33, 33.33, 33.33]), a)).toThrow(/99.99/);
    expect(() => hitungSaw(tiga([33.33, 33.33, 33.34]), a)).not.toThrow();
  });

  it("seri diputus dengan r kriteria berbobot terbesar lalu nama", () => {
    const k: KriteriaInput[] = [
      { id: "c1", kode: "C1", jenis: "BENEFIT", bobotPersen: 50 },
      { id: "c2", kode: "C2", jenis: "BENEFIT", bobotPersen: 50 },
    ];
    // V sama (0,75) tetapi B unggul di C1? Bobot sama, kriteria utama = C1 (urutan awal).
    const { perKelompok } = hitungSaw(k, [alt("A", [5, 10]), alt("B", [10, 5])]);
    expect(perKelompok.SEKOLAH!.hasil.map((h) => h.id)).toEqual(["B", "A"]);
    const { perKelompok: p2 } = hitungSaw(k, [alt("Zaki", [10, 10]), alt("Ani", [10, 10])]);
    expect(p2.SEKOLAH!.hasil.map((h) => h.id)).toEqual(["Ani", "Zaki"]);
  });

  it("cakupan per kelompok dinormalisasi terpisah", () => {
    const data = [
      alt("A1", [88.5, 2, 4, 4, 4], "X1"),
      alt("A2", [91.2, 1, 3, 2, 3], "X2"),
      alt("A3", [85.0, 3, 4, 5, 4], "X1"),
    ];
    const per = hitungSaw(K, data).perKelompok;
    const sekolah = hitungSaw(
      K,
      data.map((d) => ({ ...d, kelompok: "SEKOLAH" })),
    ).perKelompok;
    const a1Kelompok = per.X1!.hasil.find((h) => h.id === "A1")!;
    const a1Sekolah = sekolah.SEKOLAH!.hasil.find((h) => h.id === "A1")!;
    expect(a1Kelompok.normalisasi.c1).toBe(1);
    expect(a1Sekolah.normalisasi.c1).toBeLessThan(1);
    expect(per.X2!.hasil[0]!.peringkat).toBe(1);
  });

  it("properti: r dan V di [0,1], menaikkan nilai benefit tidak menurunkan V", () => {
    let seed = 42;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let iter = 0; iter < 200; iter++) {
      const data = Array.from({ length: 8 }, (_, i) =>
        alt(`S${i}`, [
          rnd() * 100,
          1 + Math.floor(rnd() * 5),
          1 + Math.floor(rnd() * 4),
          1 + Math.floor(rnd() * 5),
          1 + Math.floor(rnd() * 4),
        ]),
      );
      const before = hitungSaw(K, data).perKelompok.SEKOLAH!.hasil;
      for (const h of before) {
        expect(h.preferensi).toBeGreaterThanOrEqual(0);
        expect(h.preferensi).toBeLessThanOrEqual(1 + 1e-12);
        for (const r of Object.values(h.normalisasi)) {
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(1 + 1e-12);
        }
      }
      const naik = data.map((d, i) =>
        i === 0 ? { ...d, nilai: { ...d.nilai, c4: (d.nilai.c4 ?? 0) + 1 } } : d,
      );
      const after = hitungSaw(K, naik).perKelompok.SEKOLAH!.hasil;
      const vb = before.find((h) => h.id === "S0")!.preferensi;
      const va = after.find((h) => h.id === "S0")!.preferensi;
      expect(va).toBeGreaterThanOrEqual(vb - 1e-12);
    }
  });

  it("1.000 alternatif dihitung cepat", () => {
    const data = Array.from({ length: 1000 }, (_, i) =>
      alt(`S${i}`, [60 + (i % 40), 1 + (i % 5), 1 + (i % 4), 1 + (i % 5), 1 + (i % 4)]),
    );
    const t = performance.now();
    hitungSaw(K, data);
    expect(performance.now() - t).toBeLessThan(50);
  });
});

describe("kepentinganKePersen", () => {
  it("total selalu tepat 100", () => {
    for (const k of [[5, 4, 4, 3, 3], [1, 1, 1], [3, 3, 3, 3, 3, 3, 3], [5]]) {
      const p = kepentinganKePersen(k);
      expect(Math.round(p.reduce((s, x) => s + x, 0) * 100)).toBe(10000);
    }
    expect(kepentinganKePersen([1, 1, 1])).toEqual([33.34, 33.33, 33.33]);
  });
});
