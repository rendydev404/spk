"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { FormAksi } from "@/components/ui/form-aksi";
import { simpanPengaturan } from "../actions";

type Nilai = {
  namaSekolah: string;
  alamat: string;
  kota: string;
  namaKepsek: string;
  nipKepsek: string;
  logoUrl: string | null;
};

export function PengaturanForm({ nilai }: { nilai: Nilai }) {
  const router = useRouter();
  const id = useId();
  const [pratinjau, setPratinjau] = useState<string | null>(nilai.logoUrl);
  const [hapus, setHapus] = useState(false);
  return (
    <FormAksi action={simpanPengaturan} onOk={router.refresh} className="grid gap-4 sm:grid-cols-2">
      {({ pending, galat }) => (
        <>
          <div className="flex items-center gap-4 sm:col-span-2">
            <div className="grid size-20 place-items-center overflow-hidden rounded-md border border-border bg-surface-2">
              {pratinjau ? (
                // biome-ignore lint/performance/noImgElement: pratinjau data URL lokal
                <img src={pratinjau} alt="Logo sekolah" className="size-full object-contain" />
              ) : (
                <ImageUp className="size-6 text-muted" aria-hidden />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <label
                  htmlFor={id}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-border-strong px-2.5 text-[13px] font-medium hover:bg-surface-2 focus-within:outline-2"
                >
                  <ImageUp className="size-4" aria-hidden /> Pilih logo
                  <input
                    id={id}
                    type="file"
                    name="logo"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setPratinjau(URL.createObjectURL(f));
                        setHapus(false);
                      }
                    }}
                  />
                </label>
                {pratinjau ? (
                  <Button size="sm" variant="ghost" onClick={() => (setPratinjau(null), setHapus(true))}>
                    <Trash2 className="size-4" aria-hidden /> Hapus
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted">
                PNG, JPG, atau WEBP, maksimal 200 KB. Tampil di kop laporan.
              </p>
            </div>
            <input type="hidden" name="hapusLogo" value={hapus ? "1" : ""} />
          </div>
          <TextField
            label="Nama sekolah"
            name="namaSekolah"
            defaultValue={nilai.namaSekolah}
            error={galat.namaSekolah}
            className="sm:col-span-2"
            required
          />
          <TextField label="Alamat" name="alamat" defaultValue={nilai.alamat} error={galat.alamat} />
          <TextField
            label="Kota"
            name="kota"
            defaultValue={nilai.kota}
            hint="Dipakai di tempat tanda tangan laporan"
            error={galat.kota}
          />
          <TextField
            label="Nama kepala sekolah"
            name="namaKepsek"
            defaultValue={nilai.namaKepsek}
            error={galat.namaKepsek}
          />
          <TextField
            label="NIP kepala sekolah"
            name="nipKepsek"
            defaultValue={nilai.nipKepsek}
            inputMode="numeric"
            error={galat.nipKepsek}
          />
          <div className="sm:col-span-2">
            <Button type="submit" loading={pending}>
              Simpan pengaturan
            </Button>
          </div>
        </>
      )}
    </FormAksi>
  );
}
