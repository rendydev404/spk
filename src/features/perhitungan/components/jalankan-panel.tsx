"use client";

import { Calculator } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useAksi } from "@/components/ui/use-aksi";
import { LABEL_CAKUPAN } from "@/lib/status";
import { jalankanPerhitungan } from "../actions";

type Cakupan = "SEKOLAH" | "TINGKAT" | "KELAS";

export function JalankanPanel({
  periodeId,
  cakupanDefault,
  kelompok,
  siap,
}: {
  periodeId: string;
  cakupanDefault: Cakupan;
  kelompok: Record<Cakupan, [string, number][]>;
  siap: boolean;
}) {
  const [cakupan, setCakupan] = useState<Cakupan>(cakupanDefault);
  const { jalan, pending } = useAksi();
  const g = kelompok[cakupan];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-[13px] font-medium">Cakupan perhitungan</p>
        <Segmented
          aria-label="Cakupan perhitungan"
          value={cakupan}
          onValueChange={setCakupan}
          options={(Object.keys(LABEL_CAKUPAN) as Cakupan[]).map((c) => ({
            value: c,
            label: LABEL_CAKUPAN[c],
          }))}
        />
        <p className="mt-2 text-xs text-muted">
          Normalisasi dihitung terpisah per kelompok karena nilai max/min bergantung pada siswa yang
          dibandingkan.
        </p>
      </div>
      <ul className="flex flex-wrap gap-1.5 text-[12.5px]">
        {g.map(([nama, n]) => (
          <li key={nama} className="rounded-sm border border-border bg-surface-2 px-2 py-1">
            {nama === "SEKOLAH" ? "Seluruh sekolah" : nama}{" "}
            <span className="text-muted tabular">· {n} siswa</span>
          </li>
        ))}
      </ul>
      <div>
        <Button
          disabled={!siap}
          loading={pending}
          onClick={() => jalan(() => jalankanPerhitungan(periodeId, cakupan))}
        >
          <Calculator className="size-4" aria-hidden /> Hitung dengan SAW
        </Button>
      </div>
    </div>
  );
}
