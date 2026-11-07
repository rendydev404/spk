"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { kelasInput } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { useAksi } from "@/components/ui/use-aksi";
import { cekRentang } from "@/lib/konversi";
import { parseAngka } from "@/lib/format";
import { cn } from "@/components/ui/cn";
import { simpanSubKriteria } from "../actions";

type Baris = { key: string; id: string | null; label: string; nilai: string; batasBawah: string; batasAtas: string };

let seq = 0;
const kunci = () => `b${++seq}`;

export function SubEditor({
  kriteriaId,
  tipe,
  jenis,
  awal,
  bisaUbah,
}: {
  kriteriaId: string;
  tipe: "RENTANG" | "PILIHAN";
  jenis: "BENEFIT" | "COST";
  awal: { id: string; label: string; nilai: string; batasBawah: string | null; batasAtas: string | null }[];
  bisaUbah: boolean;
}) {
  const router = useRouter();
  const { jalan, pending } = useAksi();
  const [rows, setRows] = useState<Baris[]>(() =>
    awal.map((a) => ({
      key: kunci(),
      id: a.id,
      label: a.label,
      nilai: String(Number(a.nilai)),
      batasBawah: a.batasBawah === null ? "" : String(Number(a.batasBawah)),
      batasAtas: a.batasAtas === null ? "" : String(Number(a.batasAtas)),
    })),
  );
  const ubah = (key: string, f: keyof Baris, v: string) => setRows((r) => r.map((x) => (x.key === key ? { ...x, [f]: v } : x)));

  // Validasi langsung di client untuk umpan balik cepat (server tetap memvalidasi).
  const masalah: string[] = [];
  for (const r of rows) {
    const n = parseAngka(r.nilai);
    if (!r.label.trim()) masalah.push("Ada label yang kosong");
    if (n === null || n <= 0) masalah.push(`${r.label || "Baris"}: nilai skala harus lebih dari 0`);
  }
  if (tipe === "RENTANG") {
    masalah.push(
      ...cekRentang(rows.map((r) => ({ label: r.label || "?", batasBawah: parseAngka(r.batasBawah), batasAtas: parseAngka(r.batasAtas) }))),
    );
  }
  const unik = [...new Set(masalah)];

  function simpan() {
    jalan(
      () =>
        simpanSubKriteria(
          kriteriaId,
          rows.map((r) => ({
            id: r.id,
            label: r.label.trim(),
            nilai: parseAngka(r.nilai),
            batasBawah: tipe === "RENTANG" ? parseAngka(r.batasBawah) : null,
            batasAtas: tipe === "RENTANG" ? parseAngka(r.batasAtas) : null,
          })),
        ),
      { onOk: router.refresh },
    );
  }

  const sel = cn(kelasInput, "h-8");
  return (
    <div className="flex flex-col gap-4">
      {jenis === "COST" ? (
        <Alert tone="info" title="Kriteria cost">
          Skala terkecil berarti kondisi terbaik. Semua nilai skala harus lebih dari 0 agar normalisasi min/x tidak membagi dengan nol.
        </Alert>
      ) : null}
      <div className="panel overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr>
              <th>Label</th>
              {tipe === "RENTANG" ? (
                <>
                  <th className="w-36">Batas bawah</th>
                  <th className="w-36">Batas atas</th>
                </>
              ) : null}
              <th className="w-32">Nilai skala</th>
              {bisaUbah ? <th className="w-12"><span className="sr-only">Hapus</span></th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key}>
                <td>
                  <input aria-label={`Label baris ${i + 1}`} className={sel} value={r.label} disabled={!bisaUbah} onChange={(e) => ubah(r.key, "label", e.target.value)} />
                </td>
                {tipe === "RENTANG" ? (
                  <>
                    <td>
                      <input aria-label={`Batas bawah baris ${i + 1}`} inputMode="decimal" className={cn(sel, "tabular")} value={r.batasBawah} disabled={!bisaUbah} onChange={(e) => ubah(r.key, "batasBawah", e.target.value)} />
                    </td>
                    <td>
                      <input
                        aria-label={`Batas atas baris ${i + 1}`}
                        inputMode="decimal"
                        placeholder="tak terbatas"
                        className={cn(sel, "tabular")}
                        value={r.batasAtas}
                        disabled={!bisaUbah}
                        onChange={(e) => ubah(r.key, "batasAtas", e.target.value)}
                      />
                    </td>
                  </>
                ) : null}
                <td>
                  <input aria-label={`Nilai skala baris ${i + 1}`} inputMode="decimal" className={cn(sel, "tabular")} value={r.nilai} disabled={!bisaUbah} onChange={(e) => ubah(r.key, "nilai", e.target.value)} />
                </td>
                {bisaUbah ? (
                  <td>
                    <IconButton label={`Hapus baris ${i + 1}`} onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} className="hover:text-danger">
                      <Trash2 className="size-4" aria-hidden />
                    </IconButton>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bisaUbah ? (
        <>
          {unik.length ? (
            <Alert tone="warning" title="Periksa lagi">
              <ul>
                {unik.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setRows((r) => [...r, { key: kunci(), id: null, label: "", nilai: "", batasBawah: "", batasAtas: "" }])}>
              <Plus className="size-4" aria-hidden /> Tambah baris
            </Button>
            <Button onClick={simpan} loading={pending} disabled={rows.length === 0 || unik.length > 0}>
              Simpan sub-kriteria
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
