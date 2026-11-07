"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberField, TextField } from "@/components/ui/field";
import { FormAksi } from "@/components/ui/form-aksi";
import { Select } from "@/components/ui/select";
import { LABEL_CAKUPAN } from "@/lib/status";
import { buatPeriode, ubahPeriode } from "../actions";

type Nilai = {
  tahunAjaran: string;
  semester: "GANJIL" | "GENAP";
  kuota: number | null;
  cakupanDefault: "SEKOLAH" | "TINGKAT" | "KELAS";
};

const opsiCakupan = Object.entries(LABEL_CAKUPAN).map(([value, label]) => ({ value, label }));
const opsiSemester = [
  { value: "GANJIL", label: "Ganjil" },
  { value: "GENAP", label: "Genap" },
];

function FieldUmum({
  nilai,
  galat,
  identitasTerkunci,
}: {
  nilai?: Nilai;
  galat: Record<string, string>;
  identitasTerkunci?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label="Tahun ajaran"
        name="tahunAjaran"
        placeholder="2026/2027"
        defaultValue={nilai?.tahunAjaran}
        error={galat.tahunAjaran}
        readOnly={identitasTerkunci}
        required
      />
      <Select
        label="Semester"
        name="semester"
        options={opsiSemester}
        defaultValue={nilai?.semester ?? "GANJIL"}
        error={galat.semester}
        disabled={identitasTerkunci}
        required
      />
      {identitasTerkunci ? <input type="hidden" name="semester" value={nilai?.semester} /> : null}
      <NumberField
        label="Kuota siswa berprestasi"
        name="kuota"
        defaultValue={nilai?.kuota ?? ""}
        hint="Jumlah siswa yang ditetapkan per kelompok. Kosongkan jika tidak ada."
        error={galat.kuota}
      />
      <Select
        label="Cakupan perhitungan default"
        name="cakupanDefault"
        options={opsiCakupan}
        defaultValue={nilai?.cakupanDefault ?? "SEKOLAH"}
        hint="Bisa dipilih lagi saat menjalankan perhitungan"
      />
    </div>
  );
}

export function BuatPeriodeForm({ periodeLain }: { periodeLain: { id: string; nama: string }[] }) {
  const [sumber, setSumber] = useState(periodeLain[0]?.id ?? "default");
  return (
    <FormAksi action={buatPeriode} className="flex flex-col gap-5">
      {({ pending, galat }) => (
        <>
          <FieldUmum galat={galat} />
          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <Select
              label="Kriteria dan bobot awal"
              name="sumber"
              value={sumber}
              onValueChange={setSumber}
              options={[
                ...periodeLain.map((p) => ({ value: p.id, label: `Salin dari ${p.nama}` })),
                { value: "default", label: "Kriteria default (C1-C5)" },
                { value: "kosong", label: "Kosong" },
              ]}
            />
            {sumber !== "default" && sumber !== "kosong" ? (
              <Select
                label="Salin kelas"
                name="salinKelas"
                defaultValue="struktur"
                options={[
                  { value: "struktur", label: "Struktur kelas dan wali kelas" },
                  { value: "anggota", label: "Struktur kelas beserta anggotanya" },
                  { value: "__tidak", label: "Tidak menyalin kelas" },
                ]}
              />
            ) : null}
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Buat periode
            </Button>
          </div>
        </>
      )}
    </FormAksi>
  );
}

export function UbahPeriodeForm({
  id,
  nilai,
  identitasTerkunci,
}: {
  id: string;
  nilai: Nilai;
  identitasTerkunci: boolean;
}) {
  return (
    <FormAksi action={ubahPeriode.bind(null, id)} className="flex flex-col gap-4">
      {({ pending, galat }) => (
        <>
          <FieldUmum nilai={nilai} galat={galat} identitasTerkunci={identitasTerkunci} />
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={pending}>
              Simpan perubahan
            </Button>
          </div>
        </>
      )}
    </FormAksi>
  );
}
