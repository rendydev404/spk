"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useAksi } from "@/components/ui/use-aksi";
import { hapusKelas } from "../actions";

export function HapusKelas({ id, nama, jumlah }: { id: string; nama: string; jumlah: number }) {
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
        title={`Hapus kelas ${nama}?`}
        description={
          jumlah > 0
            ? `${jumlah} siswa akan dikeluarkan dari kelas ini. Kelas yang anggotanya sudah menjadi alternatif tidak bisa dihapus.`
            : "Kelas kosong ini akan dihapus."
        }
        confirmLabel="Hapus"
        danger
        loading={pending}
        onConfirm={() => jalan(() => hapusKelas(id), { onOk: () => (setOpen(false), router.refresh()) })}
      />
    </>
  );
}
