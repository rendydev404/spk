"use client";

import { Pencil, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/field";
import { FormAksi } from "@/components/ui/form-aksi";
import { Select } from "@/components/ui/select";
import { LABEL_ROLE } from "@/lib/status";
import { simpanPengguna } from "../actions";
import { PasswordSementara } from "./password-sementara";

type Nilai = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "ADMIN" | "WALI_KELAS" | "KEPSEK";
};

export function PenggunaDialog({ nilai }: { nilai?: Nilai }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const aksi = async (prev: unknown, fd: FormData) => {
    const r = await simpanPengguna(nilai?.id ?? null, prev, fd);
    if (r.ok && r.data?.password) setPassword(r.data.password);
    return r;
  };
  return (
    <>
      {nilai ? (
        <IconButton label={`Ubah ${nilai.name}`} onClick={() => setOpen(true)}>
          <Pencil className="size-4" aria-hidden />
        </IconButton>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="size-4" aria-hidden /> Pengguna baru
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setPassword(null);
        }}
        title={nilai ? "Ubah pengguna" : "Pengguna baru"}
        size="sm"
      >
        {password ? (
          <PasswordSementara password={password} onSelesai={() => (setOpen(false), setPassword(null))} />
        ) : (
          <FormAksi
            action={aksi}
            onOk={() => {
              router.refresh();
              if (nilai) setOpen(false);
            }}
            className="flex flex-col gap-4"
          >
            {({ pending, galat }) => (
              <>
                <TextField
                  label="Nama lengkap"
                  name="name"
                  defaultValue={nilai?.name}
                  error={galat.name}
                  required
                />
                <TextField
                  label="Username"
                  name="username"
                  defaultValue={nilai?.username}
                  autoComplete="off"
                  error={galat.username}
                  required
                />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={nilai?.email.endsWith("@spk.local") ? "" : nilai?.email}
                  hint="Opsional"
                  error={galat.email}
                />
                <Select
                  label="Peran"
                  name="role"
                  defaultValue={nilai?.role ?? "WALI_KELAS"}
                  options={Object.entries(LABEL_ROLE).map(([value, label]) => ({ value, label }))}
                  error={galat.role}
                />
                {!nilai ? (
                  <p className="text-xs text-muted">
                    Password sementara dibuat otomatis dan wajib diganti saat pertama kali masuk.
                  </p>
                ) : null}
                <div className="flex justify-end gap-2">
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
        )}
      </Dialog>
    </>
  );
}
