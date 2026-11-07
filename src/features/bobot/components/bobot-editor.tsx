"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { kelasInput } from "@/components/ui/field";
import { Badge } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { useAksi } from "@/components/ui/use-aksi";
import { parseAngka } from "@/lib/format";
import { kepentinganKePersen } from "@/lib/saw/engine";
import { simpanBobot } from "../actions";

type K = {
  id: string;
  kode: string;
  nama: string;
  jenis: "BENEFIT" | "COST";
  bobot: string;
  kepentingan: number | null;
};
type Mode = "PERSEN" | "KEPENTINGAN";

const SKALA = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];
const KET_SKALA = ["", "Tidak penting", "Kurang penting", "Cukup penting", "Penting", "Sangat penting"];
const fmt = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function BobotEditor({
  periodeId,
  kriteria,
  modeAwal,
  bisaUbah,
}: {
  periodeId: string;
  kriteria: K[];
  modeAwal: Mode;
  bisaUbah: boolean;
}) {
  const router = useRouter();
  const { jalan, pending } = useAksi();
  const [mode, setMode] = useState<Mode>(modeAwal);
  const [persen, setPersen] = useState<Record<string, string>>(() =>
    Object.fromEntries(kriteria.map((k) => [k.id, Number(k.bobot) ? fmt.format(Number(k.bobot)) : ""])),
  );
  const [penting, setPenting] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(kriteria.map((k) => [k.id, k.kepentingan ?? 3])),
  );

  const bobotAkhir = useMemo(() => {
    if (mode === "KEPENTINGAN") {
      const p = kepentinganKePersen(kriteria.map((k) => penting[k.id] ?? 0));
      return Object.fromEntries(kriteria.map((k, i) => [k.id, p[i] ?? 0]));
    }
    return Object.fromEntries(kriteria.map((k) => [k.id, parseAngka(persen[k.id]) ?? 0]));
  }, [mode, kriteria, persen, penting]);

  const totalSen = kriteria.reduce((s, k) => s + Math.round((bobotAkhir[k.id] ?? 0) * 100), 0);
  const pas = totalSen === 10000;
  const adaKosong = kriteria.some((k) => (bobotAkhir[k.id] ?? 0) <= 0);
  const selisih = (10000 - totalSen) / 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          aria-label="Cara mengisi bobot"
          value={mode}
          onValueChange={(v) => bisaUbah && setMode(v)}
          options={[
            { value: "PERSEN", label: "Persen langsung" },
            { value: "KEPENTINGAN", label: "Skala kepentingan 1-5" },
          ]}
        />
        <div aria-live="polite" className="flex items-center gap-2 text-[13.5px]">
          <span className="text-muted">Total</span>
          <span className={cn("text-lg font-semibold tabular", pas ? "text-success" : "text-warning")}>
            {fmt.format(totalSen / 100)}%
          </span>
          <span className="text-muted">dari 100%</span>
          {!pas ? (
            <Badge tone="warning">
              {selisih > 0 ? `kurang ${fmt.format(selisih)}%` : `lebih ${fmt.format(-selisih)}%`}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr>
              <th className="w-16">Kode</th>
              <th>Kriteria</th>
              <th>Jenis</th>
              <th className={mode === "KEPENTINGAN" ? "w-72" : "w-40"}>
                {mode === "KEPENTINGAN" ? "Tingkat kepentingan" : "Bobot (%)"}
              </th>
              <th className="num w-28">Bobot akhir</th>
              <th className="num w-24">W (0-1)</th>
            </tr>
          </thead>
          <tbody>
            {kriteria.map((k) => (
              <tr key={k.id}>
                <td className="font-medium">{k.kode}</td>
                <td>{k.nama}</td>
                <td>
                  {k.jenis === "BENEFIT" ? (
                    <Badge tone="info">Benefit</Badge>
                  ) : (
                    <Badge tone="warning">Cost</Badge>
                  )}
                </td>
                <td>
                  {mode === "KEPENTINGAN" ? (
                    <div className="flex items-center gap-2">
                      <Segmented
                        aria-label={`Kepentingan ${k.kode}`}
                        value={String(penting[k.id] ?? 3)}
                        onValueChange={(v) => bisaUbah && setPenting((p) => ({ ...p, [k.id]: Number(v) }))}
                        options={SKALA}
                      />
                      <span className="hidden text-xs text-muted xl:inline">
                        {KET_SKALA[penting[k.id] ?? 3]}
                      </span>
                    </div>
                  ) : (
                    <input
                      aria-label={`Bobot ${k.kode} dalam persen`}
                      inputMode="decimal"
                      disabled={!bisaUbah}
                      value={persen[k.id] ?? ""}
                      onChange={(e) => setPersen((p) => ({ ...p, [k.id]: e.target.value }))}
                      className={cn(kelasInput, "h-8 w-28 text-right tabular")}
                    />
                  )}
                </td>
                <td className="num">{fmt.format(bobotAkhir[k.id] ?? 0)}%</td>
                <td className="num text-muted">{((bobotAkhir[k.id] ?? 0) / 100).toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mode === "KEPENTINGAN" ? (
        <p className="text-xs text-muted">
          Bobot dihitung W<sub>j</sub> = k<sub>j</sub> / Σk, dibulatkan 2 desimal dengan sisa pembulatan
          diberikan ke kriteria berpecahan terbesar sehingga total tepat 100%.
        </p>
      ) : null}

      {bisaUbah ? (
        <div className="flex justify-end">
          <Button
            disabled={!pas || adaKosong}
            loading={pending}
            onClick={() =>
              jalan(
                () =>
                  simpanBobot(periodeId, {
                    mode,
                    items: kriteria.map((k) => ({
                      id: k.id,
                      bobot: mode === "PERSEN" ? (parseAngka(persen[k.id]) ?? null) : null,
                      kepentingan: mode === "KEPENTINGAN" ? (penting[k.id] ?? null) : null,
                    })),
                  }),
                { onOk: router.refresh },
              )
            }
          >
            Simpan bobot
          </Button>
        </div>
      ) : null}
    </div>
  );
}
