export type JenisKriteria = "BENEFIT" | "COST";

export interface KriteriaInput {
  id: string;
  kode: string;
  jenis: JenisKriteria;
  /** Bobot dalam persen, misal 30 untuk 30%. */
  bobotPersen: number;
}

export interface AlternatifInput {
  id: string;
  nama: string;
  /** "SEKOLAH" | "Tingkat 11" | nama kelas */
  kelompok: string;
  /** kriteriaId -> nilai pada matriks keputusan X */
  nilai: Record<string, number>;
  /** nilai mentah kriteria pertama (C1), untuk tie-break kedua */
  nilaiMentahUtama?: number;
}

export interface HasilAlternatif {
  id: string;
  nama: string;
  kelompok: string;
  normalisasi: Record<string, number>;
  terbobot: Record<string, number>;
  preferensi: number;
  peringkat: number;
}

export interface HasilKelompok {
  max: Record<string, number>;
  min: Record<string, number>;
  /** sudah urut peringkat */
  hasil: HasilAlternatif[];
}

export interface HasilSaw {
  perKelompok: Record<string, HasilKelompok>;
}
