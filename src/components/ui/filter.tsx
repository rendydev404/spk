"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "./cn";
import { type Opsi, Select } from "./select";
import { Spinner } from "./spinner";

function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = (kv: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(kv)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    }
    p.delete("page");
    p.delete("sebelum");
    const qs = p.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  return { set, pending, sp };
}

/** Kotak pencarian yang menyimpan kata kunci di URL (?q=), dengan debounce. */
export function SearchBox({
  placeholder = "Cari...",
  param = "q",
}: {
  placeholder?: string;
  param?: string;
}) {
  const { set, pending, sp } = useSetParam();
  const [v, setV] = useState(sp.get(param) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted" aria-hidden />
      <input
        type="search"
        aria-label={placeholder}
        value={v}
        placeholder={placeholder}
        onChange={(e) => {
          const nv = e.target.value;
          setV(nv);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => set({ [param]: nv.trim() || null }), 300);
        }}
        className="h-8 w-full rounded-sm border border-border-strong bg-surface pl-8 pr-8 text-[13px] placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="absolute right-2 top-2">
        {pending ? (
          <Spinner className="size-4 text-muted" />
        ) : v ? (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => {
              setV("");
              set({ [param]: null });
            }}
            className="text-muted hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </span>
    </div>
  );
}

export function FilterSelect({
  param,
  options,
  label,
  semuaLabel = "Semua",
  className,
}: {
  param: string;
  options: Opsi[];
  label: string;
  semuaLabel?: string;
  className?: string;
}) {
  const { set, sp } = useSetParam();
  return (
    <div className={cn("w-full sm:w-48", className)}>
      <Select
        size="sm"
        aria-label={label}
        value={sp.get(param) ?? "__semua"}
        onValueChange={(v) => set({ [param]: v === "__semua" ? null : v })}
        options={[
          { value: "__semua", label: `${label}: ${semuaLabel}` },
          ...options.map((o) => ({ ...o, label: `${label}: ${o.label}` })),
        ]}
      />
    </div>
  );
}

export { useSetParam };
