"use client";

import { CircleAlert, Download, FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FileDrop } from "@/components/ui/file-drop";
import { Alert, Badge } from "@/components/ui/misc";
import { useAksi } from "@/components/ui/use-aksi";
import { type BarisImpor, konfirmasiImporSiswa, pratinjauImporSiswa } from "../actions";

export function ImporSiswaDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(pratinjauImporSiswa, null);
  const [baris, setBaris] = useState<BarisImpor[] | null>(null);
  const { jalan, pending: menyimpan } = useAksi();

  useEffect(() => {
    if (state?.ok && state.data) setBaris(state.data.baris);
  }, [state]);

  const valid = baris?.filter((b) => b.galat.length === 0) ?? [];
  const invalid = baris?.filter((b) => b.galat.length > 0) ?? [];

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <FileUp className="size-4" aria-hidden /> Impor Excel
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setBaris(null);
        }}
        title="Impor data siswa"
        description="Siswa dengan NIS yang sudah ada akan diperbarui. Kolom Kelas mengacu ke kelas pada periode kerja."
        size="lg"
        footer={
          baris ? (
            <>
              <Button variant="secondary" onClick={() => setBaris(null)}>
                Ganti file
              </Button>
              <Button
                disabled={valid.length === 0}
                loading={menyimpan}
                onClick={() =>
                  jalan(
                    () =>
                      konfirmasiImporSiswa(valid.map((v) => [v.nis, v.nisn, v.nama, v.jenisKelamin, v.tanggalLahir, v.kelas])),
                    {
                      onOk: () => {
                        setOpen(false);
                        setBaris(null);
                        router.refresh();
                      },
                    },
                  )
                }
              >
                Simpan {valid.length} siswa
              </Button>
            </>
          ) : null
        }
      >
        {!baris ? (
          <form action={action} className="flex flex-col gap-4">
            <FileDrop name="file" />
            {state && !state.ok ? (
              <Alert tone="danger" icon={<CircleAlert />}>
                {state.pesan}
              </Alert>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ButtonLink href="/api/ekspor/template/siswa" variant="ghost" size="sm" prefetch={false}>
                <Download className="size-4" aria-hidden /> Unduh template
              </ButtonLink>
              <Button type="submit" loading={pending}>
                Periksa file
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 text-[13px]">
              <Badge tone="success">{valid.length} valid</Badge>
              {invalid.length ? <Badge tone="danger">{invalid.length} bermasalah, tidak disimpan</Badge> : null}
              <Badge>{valid.filter((v) => v.baru).length} siswa baru</Badge>
              <Badge>{valid.filter((v) => !v.baru).length} diperbarui</Badge>
            </div>
            <div className="max-h-[50vh] overflow-auto rounded-md border border-border">
              <table className="tabel">
                <thead className="sticky top-0">
                  <tr>
                    <th>Baris</th>
                    <th>NIS</th>
                    <th>Nama</th>
                    <th>JK</th>
                    <th>Kelas</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {[...invalid, ...valid].map((b) => (
                    <tr key={b.baris} className={b.galat.length ? "bg-danger-soft/40" : undefined}>
                      <td className="tabular text-muted">{b.baris}</td>
                      <td className="tabular">{b.nis}</td>
                      <td>{b.nama}</td>
                      <td>{b.jenisKelamin}</td>
                      <td>{b.kelas || "-"}</td>
                      <td className="text-[12.5px]">
                        {b.galat.length ? (
                          <span className="text-danger">{b.galat.join("; ")}</span>
                        ) : (
                          <span className="text-muted">{b.baru ? "Baru" : "Perbarui"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
