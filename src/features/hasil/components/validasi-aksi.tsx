"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { TextArea } from "@/components/ui/field";
import { useAksi } from "@/components/ui/use-aksi";
import { putuskanValidasi } from "../actions";

export function ValidasiAksi({ runId, kuota }: { runId: string; kuota: number | null }) {
  const router = useRouter();
  const { jalan, pending } = useAksi();
  const [mode, setMode] = useState<"DISETUJUI" | "DITOLAK" | null>(null);
  const [catatan, setCatatan] = useState("");
  return (
    <>
      <Button variant="secondary" onClick={() => setMode("DITOLAK")}>
        <X className="size-4" aria-hidden /> Tolak
      </Button>
      <Button onClick={() => setMode("DISETUJUI")}>
        <Check className="size-4" aria-hidden /> Setujui
      </Button>
      <ConfirmDialog
        open={mode !== null}
        onOpenChange={(o) => !o && setMode(null)}
        title={mode === "DISETUJUI" ? "Setujui dan sahkan hasil?" : "Tolak hasil perhitungan?"}
        description={
          mode === "DISETUJUI"
            ? `Periode menjadi Final dan semua data terkunci.${kuota ? ` ${kuota} siswa teratas tiap kelompok ditetapkan sebagai siswa berprestasi.` : ""}`
            : "Periode dikembalikan ke tahap Perhitungan agar admin bisa memperbaiki dan menghitung ulang."
        }
        confirmLabel={mode === "DISETUJUI" ? "Setujui" : "Tolak"}
        danger={mode === "DITOLAK"}
        loading={pending}
        onConfirm={() =>
          mode &&
          jalan(() => putuskanValidasi(runId, mode, catatan), {
            onOk: () => {
              setMode(null);
              setCatatan("");
              router.refresh();
            },
          })
        }
      >
        <TextArea
          label={mode === "DITOLAK" ? "Catatan untuk admin" : "Catatan (opsional)"}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          required={mode === "DITOLAK"}
          hint={mode === "DITOLAK" ? "Jelaskan apa yang perlu diperbaiki" : undefined}
        />
      </ConfirmDialog>
    </>
  );
}
