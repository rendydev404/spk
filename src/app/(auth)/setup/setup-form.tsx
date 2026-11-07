"use client";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { FormAksi } from "@/components/ui/form-aksi";
import { Select } from "@/components/ui/select";
import { ToastProvider } from "@/components/ui/toast";
import { setupAwal } from "@/features/setup/actions";
import { LABEL_JENJANG } from "@/lib/jenjang";

export function SetupForm() {
  return (
    <ToastProvider>
      <FormAksi action={setupAwal} className="flex flex-col gap-6">
        {({ pending, galat }) => (
          <>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-3 text-[14px] font-semibold">1. Sekolah</legend>
              <TextField
                label="Nama sekolah"
                name="namaSekolah"
                error={galat.namaSekolah}
                className="sm:col-span-2"
                required
              />
              <Select
                label="Jenjang"
                name="jenjang"
                defaultValue="SMA"
                options={Object.entries(LABEL_JENJANG).map(([value, label]) => ({ value, label }))}
              />
              <TextField label="Kota/kabupaten" name="kota" error={galat.kota} />
              <TextField
                label="Nama seleksi"
                name="judulSeleksi"
                defaultValue="Siswa Berprestasi"
                hint='Contoh: "Siswa Berprestasi", "Penerima Beasiswa"'
                error={galat.judulSeleksi}
                className="sm:col-span-2"
                required
              />
            </fieldset>
            <fieldset className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
              <legend className="mb-3 pt-5 text-[14px] font-semibold">2. Akun admin</legend>
              <TextField label="Nama lengkap" name="nama" error={galat.nama} required />
              <TextField
                label="Username"
                name="username"
                autoComplete="username"
                error={galat.username}
                required
              />
              <TextField
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
                hint="Minimal 8 karakter"
                error={galat.password}
                required
              />
              <TextField
                label="Ulangi password"
                name="ulang"
                type="password"
                autoComplete="new-password"
                error={galat.ulang}
                required
              />
            </fieldset>
            <div className="flex justify-end">
              <Button type="submit" loading={pending}>
                Simpan dan lanjut masuk
              </Button>
            </div>
          </>
        )}
      </FormAksi>
    </ToastProvider>
  );
}
