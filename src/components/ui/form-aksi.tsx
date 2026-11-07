"use client";

import { type ReactNode, useActionState, useEffect, useRef } from "react";
import { useToast } from "./toast";

type Hasil =
  | { ok: true; pesan?: string }
  | { ok: false; pesan: string; galat?: Record<string, string>; masalah?: string[] };

/**
 * Form yang memanggil server action (progressive enhancement), menampilkan notifikasi,
 * dan memberikan galat per field ke children.
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
    <form action={formAction} className={className} noValidate>
      {children({ pending, galat })}
    </form>
  );
}
