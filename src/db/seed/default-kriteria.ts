/** Kriteria default (PLAN bagian 4). Dipakai di seed dan saat membuat periode baru. */
export interface SubDefault {
  label: string;
  nilai: string;
  batasBawah?: string | null;
  batasAtas?: string | null;
}
export interface KriteriaDefault {
  kode: string;
  nama: string;
  jenis: "BENEFIT" | "COST";
  bobot: string;
  tipeInput: "ANGKA" | "RENTANG" | "PILIHAN";
  nilaiMin: string | null;
  nilaiMax: string | null;
  sub: SubDefault[];
}

export const KRITERIA_DEFAULT: KriteriaDefault[] = [
  { kode: "C1", nama: "Rata-rata nilai rapor", jenis: "BENEFIT", bobot: "30", tipeInput: "ANGKA", nilaiMin: "0", nilaiMax: "100", sub: [] },
  {
    kode: "C2",
    nama: "Ketidakhadiran (sakit + izin + alpa)",
    jenis: "COST",
    bobot: "15",
    tipeInput: "RENTANG",
    nilaiMin: "0",
    nilaiMax: "365",
    sub: [
      { label: "0 hari", nilai: "1", batasBawah: "0", batasAtas: "0" },
      { label: "1-2 hari", nilai: "2", batasBawah: "1", batasAtas: "2" },
      { label: "3-5 hari", nilai: "3", batasBawah: "3", batasAtas: "5" },
      { label: "6-10 hari", nilai: "4", batasBawah: "6", batasAtas: "10" },
      { label: "Lebih dari 10 hari", nilai: "5", batasBawah: "11", batasAtas: null },
    ],
  },
  {
    kode: "C3",
    nama: "Sikap/perilaku",
    jenis: "BENEFIT",
    bobot: "20",
    tipeInput: "PILIHAN",
    nilaiMin: null,
    nilaiMax: null,
    sub: [
      { label: "Sangat Baik", nilai: "4" },
      { label: "Baik", nilai: "3" },
      { label: "Cukup", nilai: "2" },
      { label: "Kurang", nilai: "1" },
    ],
  },
  {
    kode: "C4",
    nama: "Prestasi non-akademik tertinggi",
    jenis: "BENEFIT",
    bobot: "20",
    tipeInput: "PILIHAN",
    nilaiMin: null,
    nilaiMax: null,
    sub: [
      { label: "Nasional/Internasional", nilai: "5" },
      { label: "Provinsi", nilai: "4" },
      { label: "Kabupaten/Kota", nilai: "3" },
      { label: "Sekolah", nilai: "2" },
      { label: "Tidak ada", nilai: "1" },
    ],
  },
  {
    kode: "C5",
    nama: "Keaktifan ekstrakurikuler",
    jenis: "BENEFIT",
    bobot: "15",
    tipeInput: "PILIHAN",
    nilaiMin: null,
    nilaiMax: null,
    sub: [
      { label: "A", nilai: "4" },
      { label: "B", nilai: "3" },
      { label: "C", nilai: "2" },
      { label: "Tidak ikut", nilai: "1" },
    ],
  },
];
