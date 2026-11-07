"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { FormAksi } from "@/components/ui/form-aksi";
import { Select } from "@/components/ui/select";
import { LABEL_JENJANG } from "@/lib/jenjang";
import { simpanPengaturan } from "../actions";

type Nilai = {
  namaSekolah: string;
  alamat: string;
  kota: string;
  namaKepsek: string;
  nipKepsek: string;
  logoUrl: string | null;
  jenjang: "SD" | "SMP" | "SMA" | "LAINNYA";
  npsn: string;
  telepon: string;
  email: string;
  website: string;
  jabatanPenandatangan: string;
  labelNomorInduk: string;
  judulSeleksi: string;
};

function Bagian({ judul, ket, children }: { judul: string; ket?: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-border pt-5 first:border-0 first:pt-0 sm:grid-cols-2">
      <legend className="sr-only">{judul}</legend>
      <div className="sm:col-span-2">
        <p className="text-[14px] font-semibold">{judul}</p>
        {ket ? <p className="text-xs text-muted">{ket}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}

export function PengaturanForm({ nilai }: { nilai: Nilai }) {
  const router = useRouter();
  const id = useId();
  const [pratinjau, setPratinjau] = useState<string | null>(nilai.logoUrl);
  const [hapus, setHapus] = useState(false);
  return (
    <FormAksi action={simpanPengaturan} onOk={router.refresh} className="flex flex-col gap-5">
      {({ pending, galat }) => (
        <>
          <Bagian judul="Identitas sekolah" ket="Tampil di kop laporan dan di aplikasi.">
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
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-border-strong px-2.5 text-[13px] font-medium focus-within:outline-2 hover:bg-surface-2"
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
                <p className="text-xs text-muted">PNG, JPG, atau WEBP, maksimal 200 KB.</p>
              </div>
              <input type="hidden" name="hapusLogo" value={hapus ? "1" : ""} />
            </div>
            <TextField
              label="Nama sekolah"
              name="namaSekolah"
              defaultValue={nilai.namaSekolah}
              error={galat.namaSekolah}
              required
            />
            <Select
              label="Jenjang"
              name="jenjang"
              defaultValue={nilai.jenjang}
              options={Object.entries(LABEL_JENJANG).map(([value, label]) => ({ value, label }))}
              hint="Menentukan pilihan tingkat kelas"
            />
            <TextField
              label="NPSN"
              name="npsn"
              defaultValue={nilai.npsn}
              inputMode="numeric"
              error={galat.npsn}
              hint="8 digit, opsional"
            />
            <TextField
              label="Kota/kabupaten"
              name="kota"
              defaultValue={nilai.kota}
              hint="Dipakai di tempat tanda tangan"
              error={galat.kota}
            />
            <TextField
              label="Alamat"
              name="alamat"
              defaultValue={nilai.alamat}
              error={galat.alamat}
              className="sm:col-span-2"
            />
            <TextField label="Telepon" name="telepon" defaultValue={nilai.telepon} error={galat.telepon} />
            <TextField
              label="Email"
              name="email"
              type="email"
              defaultValue={nilai.email}
              error={galat.email}
            />
            <TextField
              label="Website"
              name="website"
              defaultValue={nilai.website}
              error={galat.website}
              className="sm:col-span-2"
            />
          </Bagian>

          <Bagian judul="Seleksi dan laporan" ket="Sesuaikan dengan kebutuhan sekolah.">
            <TextField
              label="Nama seleksi"
              name="judulSeleksi"
              defaultValue={nilai.judulSeleksi}
              error={galat.judulSeleksi}
              hint='Contoh: "Siswa Berprestasi", "Penerima Beasiswa", "Duta Sekolah"'
              className="sm:col-span-2"
              required
            />
            <TextField
              label="Jabatan penandatangan"
              name="jabatanPenandatangan"
              defaultValue={nilai.jabatanPenandatangan}
              error={galat.jabatanPenandatangan}
              hint='Contoh: "Kepala Sekolah", "Kepala Madrasah"'
              required
            />
            <TextField
              label="Nama penandatangan"
              name="namaKepsek"
              defaultValue={nilai.namaKepsek}
              error={galat.namaKepsek}
            />
            <TextField
              label="Jenis nomor induk"
              name="labelNomorInduk"
              defaultValue={nilai.labelNomorInduk}
              error={galat.labelNomorInduk}
              hint="NIP, NIY, NUPTK, atau lainnya"
              required
            />
            <TextField
              label="Nomor induk penandatangan"
              name="nipKepsek"
              defaultValue={nilai.nipKepsek}
              error={galat.nipKepsek}
            />
          </Bagian>

          <div>
            <Button type="submit" loading={pending}>
              Simpan pengaturan
            </Button>
          </div>
        </>
      )}
    </FormAksi>
  );
}
