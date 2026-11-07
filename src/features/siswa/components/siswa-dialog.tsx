"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/field";
import { FormAksi } from "@/components/ui/form-aksi";
import { Select } from "@/components/ui/select";
import { simpanSiswa } from "../actions";

export type NilaiSiswa = {
  id: string;
  nis: string;
  nisn: string | null;
  nama: string;
  jenisKelamin: "L" | "P";
  tanggalLahir: string | null;
  aktif: boolean;
};

export function SiswaDialog({ nilai }: { nilai?: NilaiSiswa }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [aktif, setAktif] = useState(nilai?.aktif ?? true);
  return (
    <>
      {nilai ? (
        <IconButton label={`Ubah ${nilai.nama}`} onClick={() => setOpen(true)}>
          <Pencil className="size-4" aria-hidden />
        </IconButton>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden /> Tambah siswa
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen} title={nilai ? "Ubah data siswa" : "Tambah siswa"}>
        <FormAksi
          action={simpanSiswa.bind(null, nilai?.id ?? null)}
          onOk={() => {
            setOpen(false);
            router.refresh();
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {({ pending, galat }) => (
            <>
              <TextField label="NIS" name="nis" defaultValue={nilai?.nis} error={galat.nis} required />
              <TextField
                label="NISN"
                name="nisn"
                defaultValue={nilai?.nisn ?? ""}
                inputMode="numeric"
                error={galat.nisn}
                hint="10 digit, opsional"
              />
              <TextField
                label="Nama lengkap"
                name="nama"
                defaultValue={nilai?.nama}
                error={galat.nama}
                className="sm:col-span-2"
                required
              />
              <Select
                label="Jenis kelamin"
                name="jenisKelamin"
                defaultValue={nilai?.jenisKelamin}
                options={[
                  { value: "L", label: "Laki-laki" },
                  { value: "P", label: "Perempuan" },
                ]}
                error={galat.jenisKelamin}
                required
              />
              <DatePicker
                label="Tanggal lahir"
                name="tanggalLahir"
                defaultValue={nilai?.tanggalLahir ?? null}
                error={galat.tanggalLahir}
              />
              {nilai ? (
                <div className="sm:col-span-2">
                  <Checkbox label="Siswa aktif" checked={aktif} onCheckedChange={setAktif} />
                  <input type="hidden" name="aktif" value={String(aktif)} />
                </div>
              ) : (
                <input type="hidden" name="aktif" value="true" />
              )}
              <div className="flex justify-end gap-2 sm:col-span-2">
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
