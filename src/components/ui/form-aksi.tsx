"use client";

import { type ReactNode, startTransition, useActionState, useEffect, useRef } from "react";
import { useToast } from "./toast";

type Hasil =
  | { ok: true; pesan?: string }
  | { ok: false; pesan: string; galat?: Record<string, string>; masalah?: string[] };

/**
 * Form yang memanggil server action, menampilkan notifikasi, dan memberikan galat per field ke children.
 * Dikirim lewat onSubmit (bukan prop `action`) karena React 19 mengosongkan form setelah action selesai;
 * dengan cara ini isian pengguna tetap ada saat validasi gagal.
 */
export function FormAksi({
  action,
  children,
  onOk,
  className,
}: {
  action: (prev: unknown, fd: FormData) => Promise<Hasil>;
  children: (s: { pending: boolean; galat: Record<string, string> }) => ReactNode;
  onOk?: () => void;
  className?: string;
}) {
  const { tampil } = useToast();
  const [state, formAction, pending] = useActionState(action, null);
  const terakhir = useRef<unknown>(null);
  useEffect(() => {
    if (!state || state === terakhir.current) return;
    terakhir.current = state;
    if (state.ok) {
      if (state.pesan) tampil({ tone: "success", title: state.pesan });
      onOk?.();
    } else {
      tampil({ tone: "danger", title: state.pesan, detail: state.masalah });
    }
  }, [state, tampil, onOk]);
  const galat = state && !state.ok ? (state.galat ?? {}) : {};
  return (
    <form
      className={className}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      {children({ pending, galat })}
    </form>
  );
}
