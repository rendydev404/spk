"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "./cn";

type Toast = { id: number; tone: "success" | "danger"; title: string; detail?: string[] | undefined };
type Ctx = { tampil: (t: Omit<Toast, "id">) => void };

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const tutup = useCallback((id: number) => setItems((s) => s.filter((t) => t.id !== id)), []);
  const tampil = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++seq.current;
      setItems((s) => [...s.slice(-3), { ...t, id }]);
      setTimeout(() => tutup(id), t.tone === "danger" ? 8000 : 4000);
    },
    [tutup],
  );
  const value = useMemo(() => ({ tampil }), [tampil]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <section
        aria-live="polite"
        aria-label="Notifikasi"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "danger" ? "alert" : "status"}
            className="pointer-events-auto flex animate-[slide-in_160ms_ease-out] gap-2.5 rounded-md border border-border bg-surface px-3.5 py-3 shadow-pop"
          >
            {t.tone === "success" ? (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            ) : (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
            )}
            <div className="min-w-0 flex-1 text-[13px]">
              <p className="font-medium">{t.title}</p>
              {t.detail?.length ? (
                <ul
                  className={cn(
                    "mt-1 list-disc pl-4 text-muted",
                    t.detail.length > 4 && "max-h-28 overflow-y-auto",
                  )}
                >
                  {t.detail.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => tutup(t.id)}
              className="-mr-1 grid size-6 place-items-center rounded-sm text-muted hover:bg-surface-2"
              aria-label="Tutup notifikasi"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </section>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast harus di dalam ToastProvider");
  return c;
}
