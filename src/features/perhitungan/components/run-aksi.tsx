"use client";

import { Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useAksi } from "@/components/ui/use-aksi";
import { ajukanRun, hapusRun } from "../actions";

export function RunAksi({
  runId,
  bisaAjukan,
  bisaHapus,
}: {
  runId: string;
  bisaAjukan: boolean;
  bisaHapus: boolean;
}) {
  const router = useRouter();
  const { jalan, pending } = useAksi();
  const [ajukan, setAjukan] = useState(false);
  const [hapus, setHapus] = useState(false);
  return (
    <>
      {bisaHapus ? (
        <Button variant="ghost" className="text-danger" onClick={() => setHapus(true)}>
          <Trash2 className="size-4" aria-hidden /> Hapus
        </Button>
      ) : null}
      {bisaAjukan ? (
        <Button onClick={() => setAjukan(true)}>
          <Send className="size-4" aria-hidden /> Ajukan ke kepala sekolah
        </Button>
      ) : null}
      <ConfirmDialog
        open={ajukan}
        onOpenChange={setAjukan}
        title="Ajukan hasil ini?"
        description="Periode berpindah ke tahap Validasi dan semua data terkunci sampai kepala sekolah menyetujui atau menolak."
        confirmLabel="Ajukan"
        loading={pending}
        onConfirm={() => jalan(() => ajukanRun(runId), { onOk: () => (setAjukan(false), router.refresh()) })}
      />
      <ConfirmDialog
        open={hapus}
        onOpenChange={setHapus}
        title="Hapus perhitungan ini?"
        description="Riwayat perhitungan ini dihapus permanen. Nilai penilaian tidak terpengaruh."
        confirmLabel="Hapus"
        danger
        loading={pending}
        onConfirm={() => jalan(() => hapusRun(runId))}
      />
    </>
  );
}
