"use client";

import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { kelasInput } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { parseAngka } from "@/lib/format";
import { hitungSaw, totalBobotSen } from "@/lib/saw/engine";
import type { JenisKriteria } from "@/lib/saw/types";

type K = { id: string; kode: string; nama: string; jenis: JenisKriteria; bobot: number };
type A = { id: string; kode: string; nama: string; nilaiX: Record<string, number>; peringkat: number };

const f4 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

/** Analisis sensitivitas: hitung ulang di browser dengan bobot berbeda, tanpa menyimpan apa pun. */
export function SimulasiBobot({ kriteria, alternatif }: { kriteria: K[]; alternatif: A[] }) {
  const awal = useMemo(
    () => Object.fromEntries(kriteria.map((k) => [k.id, String(k.bobot).replace(".", ",")])),
    [kriteria],
  );
  const [bobot, setBobot] = useState<Record<string, string>>(awal);
  const kInput = kriteria.map((k) => ({
    id: k.id,
    kode: k.kode,
    jenis: k.jenis,
    bobotPersen: parseAngka(bobot[k.id]) ?? 0,
  }));
  const total = totalBobotSen(kInput);
  // Untuk <= 500 alternatif perhitungan < 1 ms, jadi dihitung langsung tiap render.
  let hasil: ReturnType<typeof hitungSaw>["perKelompok"][string]["hasil"] | null = null;
  if (total === 10000 && kInput.every((k) => k.bobotPersen > 0)) {
    try {
      hasil =
        hitungSaw(
          kInput,
          alternatif.map((a) => ({ id: a.id, nama: a.nama, kelompok: "X", nilai: a.nilaiX })),
        ).perKelompok.X?.hasil ?? null;
    } catch {
      hasil = null;
    }
  }
  const peringkatAwal = new Map(alternatif.map((a) => [a.id, a.peringkat]));
  const kode = new Map(alternatif.map((a) => [a.id, a.kode]));

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">Simulasi hanya untuk analisis sensitivitas. Tidak ada data yang disimpan.</Alert>
      <div className="flex flex-wrap items-end gap-3">
        {kriteria.map((k) => (
          <label key={k.id} className="flex flex-col gap-1 text-[12.5px]">
            <span className="font-medium" title={k.nama}>
              {k.kode} (%)
            </span>
            <input
              inputMode="decimal"
              value={bobot[k.id] ?? ""}
              onChange={(e) => setBobot((b) => ({ ...b, [k.id]: e.target.value }))}
              className={cn(kelasInput, "h-8 w-20 text-right tabular")}
            />
          </label>
        ))}
        <p className={cn("pb-1.5 text-[13px] tabular", total === 10000 ? "text-success" : "text-warning")}>
          Total {(total / 100).toFixed(2)}%
        </p>
        <Button variant="ghost" size="sm" onClick={() => setBobot(awal)}>
          <RotateCcw className="size-4" aria-hidden /> Kembalikan
        </Button>
      </div>
      {hasil ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="tabel">
            <thead>
              <tr>
                <th className="num w-24">Peringkat</th>
                <th>Alternatif</th>
                <th className="num">V simulasi</th>
                <th className="num">Perubahan</th>
              </tr>
            </thead>
            <tbody>
              {hasil.slice(0, 50).map((h) => {
                const d = (peringkatAwal.get(h.id) ?? h.peringkat) - h.peringkat;
                return (
                  <tr key={h.id}>
                    <td className="num font-semibold">{h.peringkat}</td>
                    <td>
                      <span className="text-muted">{kode.get(h.id)}</span> {h.nama}
                    </td>
                    <td className="num">{f4.format(h.preferensi)}</td>
                    <td className="num">
                      {d === 0 ? (
                        <span className="text-muted">tetap</span>
                      ) : d > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-success">
                          <ArrowUp className="size-3.5" aria-hidden /> naik {d}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-danger">
                          <ArrowDown className="size-3.5" aria-hidden /> turun {-d}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[13px] text-warning">
          Total bobot harus tepat 100% dan setiap bobot lebih dari 0.
        </p>
      )}
    </div>
  );
}
