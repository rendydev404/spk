"use client";

import * as RD from "@radix-ui/react-dropdown-menu";
import { ArrowRightLeft, MoreHorizontal, UserMinus, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/combobox";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { useAksi } from "@/components/ui/use-aksi";
import { keluarkanAnggota, pindahkanAnggota, tambahAnggota } from "../actions";

type Anggota = { id: string; nis: string; nama: string; jenisKelamin: "L" | "P"; aktif: boolean; kodeAlternatif: string | null };

export function AnggotaPanel({
  kelasId,
  anggota,
  calon,
  kelasLain,
  bisaUbah,
}: {
  kelasId: string;
  anggota: Anggota[];
  calon: { id: string; nis: string; nama: string }[];
  kelasLain: { id: string; nama: string }[];
  bisaUbah: boolean;
}) {
  const router = useRouter();
  const { jalan, pending } = useAksi();
  const [pilih, setPilih] = useState<string[]>([]);
  const [keluar, setKeluar] = useState<Anggota | null>(null);
  const [pindah, setPindah] = useState<Anggota | null>(null);
  const [tujuan, setTujuan] = useState<string>("");
  const refresh = () => router.refresh();

  return (
    <div className="flex flex-col gap-4">
      {bisaUbah ? (
        <div className="panel flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-64 flex-1">
            <MultiSelect
              label="Tambah siswa ke kelas"
              options={calon.map((c) => ({ value: c.id, label: c.nama, keterangan: c.nis }))}
              values={pilih}
              onValuesChange={setPilih}
              placeholder={calon.length ? "Cari nama atau NIS" : "Semua siswa aktif sudah punya kelas"}
              hint="Hanya siswa aktif yang belum masuk kelas lain di periode ini"
            />
          </div>
          <Button
            disabled={pilih.length === 0}
            loading={pending}
            onClick={() => jalan(() => tambahAnggota(kelasId, pilih), { onOk: () => (setPilih([]), refresh()) })}
            className="mb-[22px]"
          >
            <UserPlus className="size-4" aria-hidden /> Tambahkan {pilih.length > 0 ? pilih.length : ""}
          </Button>
        </div>
      ) : null}

      <div className="panel overflow-x-auto">
        {anggota.length === 0 ? (
          <EmptyState icon={<Users />} title="Kelas belum punya anggota" />
        ) : (
          <table className="tabel">
            <caption className="sr-only">Anggota kelas</caption>
            <thead>
              <tr>
                <th className="w-12">No</th>
                <th>NIS</th>
                <th>Nama</th>
                <th>JK</th>
                <th>Alternatif</th>
                {bisaUbah ? <th className="w-12"><span className="sr-only">Aksi</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {anggota.map((a, i) => (
                <tr key={a.id}>
                  <td className="tabular text-muted">{i + 1}</td>
                  <td className="tabular">{a.nis}</td>
                  <td>
                    {a.nama} {!a.aktif ? <Badge tone="warning">Nonaktif</Badge> : null}
                  </td>
                  <td>{a.jenisKelamin}</td>
                  <td>{a.kodeAlternatif ? <Badge tone="accent">{a.kodeAlternatif}</Badge> : <span className="text-muted">-</span>}</td>
                  {bisaUbah ? (
                    <td>
                      <RD.Root>
                        <RD.Trigger
                          className="grid size-8 place-items-center rounded-sm text-muted hover:bg-surface-2"
                          aria-label={`Aksi untuk ${a.nama}`}
                        >
                          <MoreHorizontal className="size-4" aria-hidden />
                        </RD.Trigger>
                        <RD.Portal>
                          <RD.Content align="end" className="z-50 min-w-48 rounded-md border border-border bg-surface p-1 shadow-pop">
                            <RD.Item
                              disabled={kelasLain.length === 0}
                              onSelect={() => setPindah(a)}
                              className="flex h-8 items-center gap-2 rounded-sm px-2 text-[13px] outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-2"
                            >
                              <ArrowRightLeft className="size-4 text-muted" aria-hidden /> Pindahkan kelas
                            </RD.Item>
                            <RD.Item
                              onSelect={() => setKeluar(a)}
                              className="flex h-8 items-center gap-2 rounded-sm px-2 text-[13px] text-danger outline-none data-[highlighted]:bg-danger-soft"
                            >
                              <UserMinus className="size-4" aria-hidden /> Keluarkan
                            </RD.Item>
                          </RD.Content>
                        </RD.Portal>
                      </RD.Root>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={keluar !== null}
        onOpenChange={(o) => !o && setKeluar(null)}
        title={`Keluarkan ${keluar?.nama ?? ""}?`}
        description={
          keluar?.kodeAlternatif
            ? "Siswa ini masih menjadi alternatif. Keluarkan dari daftar alternatif dulu."
            : "Siswa dikeluarkan dari kelas ini. Data siswa tidak dihapus."
        }
        confirmLabel="Keluarkan"
        danger
        loading={pending}
        onConfirm={() =>
          keluar && jalan(() => keluarkanAnggota(kelasId, keluar.id), { onOk: () => (setKeluar(null), refresh()) })
        }
      />
      <Dialog
        open={pindah !== null}
        onOpenChange={(o) => !o && setPindah(null)}
        title={`Pindahkan ${pindah?.nama ?? ""}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPindah(null)}>
              Batal
            </Button>
            <Button
              disabled={!tujuan}
              loading={pending}
              onClick={() =>
                pindah && jalan(() => pindahkanAnggota(kelasId, pindah.id, tujuan), { onOk: () => (setPindah(null), setTujuan(""), refresh()) })
              }
            >
              Pindahkan
            </Button>
          </>
        }
      >
        <Select label="Kelas tujuan" value={tujuan} onValueChange={setTujuan} options={kelasLain.map((k) => ({ value: k.id, label: k.nama }))} />
      </Dialog>
    </div>
  );
}
