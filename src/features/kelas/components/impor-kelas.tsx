"use client";

import { ImporExcel } from "@/components/ui/impor-excel";
import { imporKelas } from "../actions";

export function ImporKelas() {
  return (
    <ImporExcel
      judul="Impor kelas dari Excel"
      keterangan="Kelas dibuat di periode kerja. Kelas dengan nama yang sama diperbarui tingkat dan wali kelasnya. Wali kelas diisi dengan username akun wali kelas."
      templateHref="/api/ekspor/template/kelas"
      action={imporKelas}
    />
  );
}
