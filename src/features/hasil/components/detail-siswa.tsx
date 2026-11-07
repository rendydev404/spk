"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/misc";

type K = { id: string; kode: string; nama: string; jenis: "BENEFIT" | "COST"; bobot: number };
type R = {
  kode: string;
  nama: string;
  nis: string;
  kelasNama: string;
  peringkat: number;
  v: string;
  terpilih: boolean;
  nilaiX: Record<string, number>;
  normalisasi: Record<string, number>;
};

const f4 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fa = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

/** Rincian nilai satu siswa: nilai X, normalisasi, dan kontribusi tiap kriteria terhadap V. */
export function DetailSiswa({ r, kriteria }: { r: R; kriteria: K[] }) {
  const [open, setOpen] = useState(false);
  const kontribusi = kriteria.map((k) => ({ k, w: ((r.normalisasi[k.id] ?? 0) * k.bobot) / 100 }));
  const v = Number(r.v);
  const wMaks = Math.max(...kriteria.map((x) => x.bobot)) / 100;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left font-medium hover:text-accent hover:underline"
      >
        {r.nama}
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`${r.kode} · ${r.nama}`}
        description={`NIS ${r.nis} · ${r.kelasNama} · Peringkat ${r.peringkat}`}
        size="lg"
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-2xl font-semibold tabular">{f4.format(v)}</p>
          <span className="text-[13px] text-muted">nilai preferensi V</span>
          {r.terpilih ? <Badge tone="success">Siswa berprestasi</Badge> : null}
        </div>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="tabel">
            <thead>
              <tr>
                <th>Kriteria</th>
                <th className="num">x</th>
                <th className="num">r</th>
                <th className="num">W × r</th>
                <th className="w-[38%]">Kontribusi ke V</th>
              </tr>
            </thead>
            <tbody>
              {kontribusi.map(({ k, w }) => (
                <tr key={k.id}>
                  <td>
                    <span className="font-medium">{k.kode}</span> <span className="text-muted">{k.nama}</span>
                  </td>
                  <td className="num">{fa.format(r.nilaiX[k.id] ?? 0)}</td>
                  <td className="num">{f4.format(r.normalisasi[k.id] ?? 0)}</td>
                  <td className="num font-medium">{f4.format(w)}</td>
                  <td>
                    <svg
                      viewBox="0 0 100 10"
                      className="h-3 w-full"
                      role="img"
                      aria-label={`${k.kode} menyumbang ${f4.format(w)}`}
                      preserveAspectRatio="none"
                    >
                      <rect x="0" y="0" width="100" height="10" rx="2" className="fill-surface-2" />
                      <rect
                        x="0"
                        y="0"
                        width={wMaks > 0 ? (w / wMaks) * 100 : 0}
                        height="10"
                        rx="2"
                        className="fill-accent"
                      />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Panjang batang relatif terhadap bobot kriteria terbesar (kontribusi maksimum yang mungkin).
        </p>
      </Dialog>
    </>
  );
}
