"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/field";
import { FormAksi } from "@/components/ui/form-aksi";
import { Select } from "@/components/ui/select";
import { simpanKelas } from "../actions";

type Wali = { id: string; name: string; username: string };
type Nilai = { id: string; nama: string; tingkat: number; waliKelasId: string | null };

const TINGKAT = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tingkat ${i + 1}` }));

export function KelasDialog({
  periodeId,
  wali,
  nilai,
  hanyaWali,
}: {
  periodeId: string;
  wali: Wali[];
  nilai?: Nilai;
  hanyaWali?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [waliId, setWaliId] = useState<string | null>(nilai?.waliKelasId ?? null);
  return (
    <>
      {nilai ? (
        <IconButton label={`Ubah ${nilai.nama}`} onClick={() => setOpen(true)}>
          <Pencil className="size-4" aria-hidden />
        </IconButton>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden /> Kelas baru
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={nilai ? `Ubah ${nilai.nama}` : "Kelas baru"}
        size="sm"
      >
        <FormAksi
          action={simpanKelas.bind(null, periodeId, nilai?.id ?? null)}
          onOk={() => {
            setOpen(false);
            router.refresh();
          }}
          className="flex flex-col gap-4"
        >
          {({ pending, galat }) => (
            <>
              <TextField
                label="Nama kelas"
                name="nama"
                defaultValue={nilai?.nama}
                placeholder="XI IPA 1"
                readOnly={hanyaWali}
                error={galat.nama}
                required
              />
              <Select
                label="Tingkat"
                name="tingkat"
                options={TINGKAT}
                defaultValue={nilai ? String(nilai.tingkat) : undefined}
                disabled={hanyaWali}
                error={galat.tingkat}
                required
              />
              {hanyaWali && nilai ? <input type="hidden" name="tingkat" value={nilai.tingkat} /> : null}
              <Combobox
                label="Wali kelas"
                name="waliKelasId"
                value={waliId}
                onValueChange={setWaliId}
                allowClear
                options={wali.map((w) => ({ value: w.id, label: w.name, keterangan: w.username }))}
                hint={wali.length === 0 ? "Belum ada akun wali kelas. Buat di menu Pengguna." : undefined}
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" loading={pending}>
                  Simpan
                </Button>
              </div>
            </>
          )}
        </FormAksi>
      </Dialog>
    </>
  );
}
