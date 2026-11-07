import { describe, expect, it } from "vitest";
import { cekRentang, konversi, type KriteriaKonversi } from "./konversi";

const C2: KriteriaKonversi = {
  kode: "C2",
  tipeInput: "RENTANG",
  jenis: "COST",
  nilaiMin: 0,
  nilaiMax: null,
  sub: [
    { id: "a", label: "0", nilai: 1, batasBawah: 0, batasAtas: 0 },
    { id: "b", label: "1-2", nilai: 2, batasBawah: 1, batasAtas: 2 },
    { id: "c", label: "3-5", nilai: 3, batasBawah: 3, batasAtas: 5 },
    { id: "d", label: "6-10", nilai: 4, batasBawah: 6, batasAtas: 10 },
    { id: "e", label: "> 10", nilai: 5, batasBawah: 11, batasAtas: null },
  ],
};

describe("konversi", () => {
  it("rentang hari absen ke skala", () => {
    expect(konversi(C2, { mentah: 0 })).toMatchObject({ ok: true, nilai: 1 });
    expect(konversi(C2, { mentah: 2 })).toMatchObject({ ok: true, nilai: 2, nilaiMentah: 2 });
    expect(konversi(C2, { mentah: 7 })).toMatchObject({ ok: true, nilai: 4 });
    expect(konversi(C2, { mentah: 30 })).toMatchObject({ ok: true, nilai: 5 });
    expect(konversi(C2, { mentah: -1 }).ok).toBe(false);
  });
  it("angka dengan batas min/max", () => {
    const C1: KriteriaKonversi = { kode: "C1", tipeInput: "ANGKA", jenis: "BENEFIT", nilaiMin: 0, nilaiMax: 100, sub: [] };
    expect(konversi(C1, { mentah: 88.5 })).toMatchObject({ ok: true, nilai: 88.5 });
    expect(konversi(C1, { mentah: 105 }).ok).toBe(false);
    expect(konversi(C1, { mentah: 88.555 }).ok).toBe(false);
  });
  it("cekRentang mendeteksi tumpang tindih dan celah", () => {
    expect(cekRentang(C2.sub)).toEqual([]);
    expect(cekRentang([{ label: "a", batasBawah: 0, batasAtas: 3 }, { label: "b", batasBawah: 2, batasAtas: 5 }])).toHaveLength(1);
    expect(cekRentang([{ label: "a", batasBawah: 0, batasAtas: 3 }, { label: "b", batasBawah: 6, batasAtas: 9 }])).toHaveLength(1);
  });
});
