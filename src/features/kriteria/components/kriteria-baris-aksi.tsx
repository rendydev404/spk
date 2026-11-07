"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useAksi } from "@/components/ui/use-aksi";
import { geserKriteria, hapusKriteria } from "../actions";

export function KriteriaBarisAksi({
  id,
  kode,
  pertama,
  terakhir,
}: {
  id: string;
  kode: string;
  pertama: boolean;
  terakhir: boolean;
}) {
  const router = useRouter();
  const { jalan, pending } = useAksi();
  const [hapus, setHapus] = useState(false);
  return (
    <>
      <IconButton
        label={`Naikkan ${kode}`}
        disabled={pertama || pending}
        onClick={() => jalan(() => geserKriteria(id, "naik"), { onOk: router.refresh, diam: true })}
      >
        <ArrowUp className="size-4" aria-hidden />
      </IconButton>
      <IconButton
        label={`Turunkan ${kode}`}
        disabled={terakhir || pending}
        onClick={() => jalan(() => geserKriteria(id, "turun"), { onOk: router.refresh, diam: true })}
      >
        <ArrowDown className="size-4" aria-hidden />
      </IconButton>
      <IconButton label={`Hapus ${kode}`} onClick={() => setHapus(true)} className="hover:text-danger">
        <Trash2 className="size-4" aria-hidden />
      </IconButton>
      <ConfirmDialog
        open={hapus}
        onOpenChange={setHapus}
        title={`Hapus kriteria ${kode}?`}
        description="Sub-kriteria ikut terhapus. Total bobot akan berkurang sehingga perlu diatur ulang."
        confirmLabel="Hapus"
        danger
        loading={pending}
        onConfirm={() => jalan(() => hapusKriteria(id), { onOk: () => (setHapus(false), router.refresh()) })}
      />
    </>
  );
}
