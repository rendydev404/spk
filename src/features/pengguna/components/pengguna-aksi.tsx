"use client";

import * as RD from "@radix-ui/react-dropdown-menu";
import { KeyRound, MoreHorizontal, UserCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { useAksi } from "@/components/ui/use-aksi";
import { aturAktif, resetPassword } from "../actions";
import { PasswordSementara } from "./password-sementara";

export function PenggunaAksi({
  id,
  nama,
  aktif,
  diriSendiri,
}: {
  id: string;
  nama: string;
  aktif: boolean;
  diriSendiri: boolean;
}) {
  const router = useRouter();
  const { jalan, pending } = useAksi();
  const [konfirm, setKonfirm] = useState<"aktif" | "reset" | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const item =
    "flex h-8 items-center gap-2 rounded-sm px-2 text-[13px] outline-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-50";
  return (
    <>
      <RD.Root>
        <RD.Trigger
          className="grid size-8 place-items-center rounded-sm text-muted hover:bg-surface-2"
          aria-label={`Aksi untuk ${nama}`}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </RD.Trigger>
        <RD.Portal>
          <RD.Content
            align="end"
            className="z-50 min-w-52 rounded-md border border-border bg-surface p-1 shadow-pop"
          >
            <RD.Item className={item} onSelect={() => setKonfirm("reset")}>
              <KeyRound className="size-4 text-muted" aria-hidden /> Reset password
            </RD.Item>
            <RD.Item className={item} disabled={diriSendiri} onSelect={() => setKonfirm("aktif")}>
              {aktif ? (
                <UserX className="size-4 text-muted" aria-hidden />
              ) : (
                <UserCheck className="size-4 text-muted" aria-hidden />
              )}
              {aktif ? "Nonaktifkan" : "Aktifkan"}
            </RD.Item>
          </RD.Content>
        </RD.Portal>
      </RD.Root>
      <ConfirmDialog
        open={konfirm === "aktif"}
        onOpenChange={(o) => !o && setKonfirm(null)}
        title={aktif ? `Nonaktifkan ${nama}?` : `Aktifkan ${nama}?`}
        description={
          aktif
            ? "Pengguna tidak bisa masuk dan sesinya yang sedang berjalan dicabut. Data tidak dihapus."
            : "Pengguna bisa masuk kembali."
        }
        confirmLabel={aktif ? "Nonaktifkan" : "Aktifkan"}
        danger={aktif}
        loading={pending}
        onConfirm={() =>
          jalan(() => aturAktif(id, !aktif), { onOk: () => (setKonfirm(null), router.refresh()) })
        }
      />
      <ConfirmDialog
        open={konfirm === "reset"}
        onOpenChange={(o) => !o && setKonfirm(null)}
        title={`Reset password ${nama}?`}
        description="Password lama tidak berlaku lagi. Password sementara baru ditampilkan sekali dan wajib diganti saat masuk."
        confirmLabel="Reset"
        loading={pending}
        onConfirm={() =>
          jalan(
            async () => {
              const r = await resetPassword(id);
              if (r.ok && r.data) setPassword(r.data.password);
              return r;
            },
            { onOk: () => setKonfirm(null), diam: true },
          )
        }
      />
      <Dialog
        open={password !== null}
        onOpenChange={(o) => !o && setPassword(null)}
        title="Password sementara"
        size="sm"
      >
        {password ? <PasswordSementara password={password} onSelesai={() => setPassword(null)} /> : null}
      </Dialog>
    </>
  );
}
