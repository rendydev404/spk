"use client";

import { UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/misc";
import { useAksi } from "@/components/ui/use-aksi";
import { keluarkanAlternatif } from "../actions";

type Baris = {
  siswaId: string;
  kode: string;
  nis: string;
  nama: string;
  kelasNama: string;
  jumlahNilai: number;
};

export function TabelAlternatif({
  periodeId,
  data,
  jumlahKriteria,
  bisaHapus,
}: {
  periodeId: string;
  data: Baris[];
  jumlahKriteria: number;
  bisaHapus: boolean;
}) {
  const router = useRouter();
  const { jalan, pending } = useAksi();
  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [konfirmasi, setKonfirmasi] = useState(false);
  const nilaiHilang = useMemo(
    () => data.filter((d) => pilih.has(d.siswaId)).reduce((s, d) => s + d.jumlahNilai, 0),
    [data, pilih],
  );
  const semua = data.length > 0 && pilih.size === data.length;

  return (
    <>
      {bisaHapus && pilih.size > 0 ? (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-accent-soft/50 px-4 py-2 text-[13px]">
          <span>{pilih.size} alternatif dipilih</span>
          <Button size="sm" variant="danger" onClick={() => setKonfirmasi(true)}>
            <UserMinus className="size-4" aria-hidden /> Keluarkan
          </Button>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr>
              {bisaHapus ? (
                <th className="w-10">
                  <Checkbox
                    aria-label="Pilih semua"
                    checked={semua ? true : pilih.size > 0 ? "indeterminate" : false}
                    onCheckedChange={(c) => setPilih(c ? new Set(data.map((d) => d.siswaId)) : new Set())}
                  />
                </th>
              ) : null}
              <th className="w-20">Kode</th>
              <th>NIS</th>
              <th>Nama siswa</th>
              <th>Kelas</th>
              <th>Kelengkapan nilai</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.siswaId}>
                {bisaHapus ? (
                  <td>
                    <Checkbox
                      aria-label={`Pilih ${a.nama}`}
                      checked={pilih.has(a.siswaId)}
                      onCheckedChange={(c) =>
                        setPilih((s) => {
                          const n = new Set(s);
                          if (c) n.add(a.siswaId);
                          else n.delete(a.siswaId);
                          return n;
                        })
                      }
                    />
                  </td>
                ) : null}
                <td>
                  <Badge tone="accent">{a.kode}</Badge>
                </td>
                <td className="tabular">{a.nis}</td>
                <td className="font-medium">{a.nama}</td>
                <td>{a.kelasNama}</td>
                <td>
                  {jumlahKriteria > 0 && a.jumlahNilai >= jumlahKriteria ? (
                    <Badge tone="success">Lengkap</Badge>
                  ) : (
                    <span className="text-[13px] text-muted tabular">
                      {a.jumlahNilai}/{jumlahKriteria} kriteria
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={konfirmasi}
        onOpenChange={setKonfirmasi}
        title={`Keluarkan ${pilih.size} alternatif?`}
        description={
          nilaiHilang > 0
            ? `${nilaiHilang} nilai penilaian milik siswa ini ikut terhapus permanen.`
            : "Siswa tidak lagi diikutkan dalam perhitungan. Data siswa tidak dihapus."
        }
        confirmLabel="Keluarkan"
        danger
        loading={pending}
        onConfirm={() =>
          jalan(() => keluarkanAlternatif(periodeId, [...pilih]), {
            onOk: () => {
              setKonfirmasi(false);
              setPilih(new Set());
              router.refresh();
            },
          })
        }
      />
    </>
  );
}
