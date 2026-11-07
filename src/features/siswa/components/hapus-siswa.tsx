"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useAksi } from "@/components/ui/use-aksi";
import { hapusSiswa } from "../actions";

export function HapusSiswa({ id, nama }: { id: string; nama: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { jalan, pending } = useAksi();
  return (
    <>
      <IconButton label={`Hapus ${nama}`} onClick={() => setOpen(true)} className="hover:text-danger">
        <Trash2 className="size-4" aria-hidden />
      </IconButton>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Hapus ${nama}?`}
        description="Jika siswa sudah punya riwayat kelas, alternatif, atau hasil penilaian, siswa hanya dinonaktifkan agar riwayat tetap utuh."
        confirmLabel="Hapus"
        danger
        loading={pending}
        onConfirm={() => jalan(() => hapusSiswa(id), { onOk: () => (setOpen(false), router.refresh()) })}
      />
    </>
  );
}
