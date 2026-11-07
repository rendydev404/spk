"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { FormAksi } from "@/components/ui/form-aksi";
import { gantiPassword, ubahNamaSendiri } from "../actions";

export function GantiPasswordForm({ wajib }: { wajib: boolean }) {
  const router = useRouter();
  return (
    <FormAksi
      action={gantiPassword}
      onOk={() => (wajib ? router.replace("/dashboard") : router.refresh())}
      className="flex max-w-sm flex-col gap-4"
    >
      {({ pending, galat }) => (
        <>
          <TextField
            label="Password saat ini"
            name="lama"
            type="password"
            autoComplete="current-password"
            error={galat.lama}
            required
          />
          <TextField
            label="Password baru"
            name="baru"
            type="password"
            autoComplete="new-password"
            hint="Minimal 8 karakter"
            error={galat.baru}
            required
          />
          <TextField
            label="Ulangi password baru"
            name="ulang"
            type="password"
            autoComplete="new-password"
            error={galat.ulang}
            required
          />
          <div>
            <Button type="submit" loading={pending}>
              Ganti password
            </Button>
          </div>
        </>
      )}
    </FormAksi>
  );
}

export function NamaForm({ nama }: { nama: string }) {
  const router = useRouter();
  return (
    <FormAksi action={ubahNamaSendiri} onOk={router.refresh} className="flex max-w-sm flex-col gap-4">
      {({ pending, galat }) => (
        <>
          <TextField label="Nama lengkap" name="name" defaultValue={nama} error={galat.name} required />
          <div>
            <Button type="submit" variant="secondary" loading={pending}>
              Simpan nama
            </Button>
          </div>
        </>
      )}
    </FormAksi>
  );
}
