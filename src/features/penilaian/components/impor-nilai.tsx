"use client";

import { ImporExcel } from "@/components/ui/impor-excel";
import { imporNilai } from "../actions";

export function ImporNilai({ kelasId }: { kelasId: string }) {
  return (
    <ImporExcel
      label="Impor nilai"
      judul="Impor nilai dari Excel"
      keterangan="Gunakan template kelas ini. Sel kosong diabaikan. Jika ada satu nilai tidak valid, tidak ada yang disimpan."
      templateHref={`/api/ekspor/template/nilai?kelas=${kelasId}`}
      action={imporNilai.bind(null, kelasId)}
    />
  );
}
