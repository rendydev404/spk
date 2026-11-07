"use client";

import { useCallback, useState, useTransition } from "react";
import { useToast } from "./toast";

type Hasil = { ok: true; pesan?: string } | { ok: false; pesan: string; galat?: Record<string, string>; masalah?: string[] };

/** Menjalankan server action dengan status pending dan notifikasi hasil. */
export function useAksi() {
  const { tampil } = useToast();
  const [pending, start] = useTransition();
  const [galat, setGalat] = useState<Record<string, string>>({});
  const jalan = useCallback(
    (fn: () => Promise<Hasil>, opsi?: { onOk?: () => void; diam?: boolean }) =>
      new Promise<boolean>((resolve) => {
        start(async () => {
          const r = await fn();
          if (r.ok) {
            setGalat({});
            if (!opsi?.diam && r.pesan) tampil({ tone: "success", title: r.pesan });
            opsi?.onOk?.();
            resolve(true);
          } else {
            setGalat(r.galat ?? {});
            tampil({ tone: "danger", title: r.pesan, detail: r.masalah });
            resolve(false);
          }
        });
      }),
    [tampil],
  );
  return { jalan, pending, galat, setGalat };
}
