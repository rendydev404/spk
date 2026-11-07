"use client";

import * as RP from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { type KeyboardEvent, useId, useMemo, useRef, useState } from "react";
import { cn } from "./cn";
import { Field } from "./field";

export interface OpsiCari {
  value: string;
  label: string;
  keterangan?: string;
}

const MAKS_TAMPIL = 100;

function useDaftar(options: OpsiCari[], q: string) {
  return useMemo(() => {
    const t = q.trim().toLowerCase();
    const hasil = t
      ? options.filter((o) => o.label.toLowerCase().includes(t) || o.keterangan?.toLowerCase().includes(t))
      : options;
    return { tampil: hasil.slice(0, MAKS_TAMPIL), total: hasil.length };
  }, [options, q]);
}

function Listbox({
  id,
  options,
  q,
  setQ,
  isSelected,
  onPick,
  multi,
}: {
  id: string;
  options: OpsiCari[];
  q: string;
  setQ: (s: string) => void;
  isSelected: (v: string) => boolean;
  onPick: (v: string) => void;
  multi?: boolean;
}) {
  const { tampil, total } = useDaftar(options, q);
  const [aktif, setAktif] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAktif((a) => Math.min(a + 1, tampil.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktif((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = tampil[aktif];
      if (o) onPick(o.value);
    }
    requestAnimationFrame(() => {
      listRef.current?.querySelector('[data-aktif="true"]')?.scrollIntoView({ block: "nearest" });
    });
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-2.5">
        <Search className="size-4 text-muted" aria-hidden />
        <input
          role="combobox"
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-activedescendant={tampil[aktif] ? `${id}-o-${aktif}` : undefined}
          aria-autocomplete="list"
          // biome-ignore lint/a11y/noAutofocus: fokus dipindah ke kotak cari saat popover dibuka
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAktif(0);
          }}
          onKeyDown={onKey}
          placeholder="Cari..."
          className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
        />
      </div>
      <div
        ref={listRef}
        id={`${id}-list`}
        role="listbox"
        aria-multiselectable={multi || undefined}
        className="max-h-64 overflow-y-auto p-1"
      >
        {tampil.length === 0 ? (
          <div className="px-3 py-6 text-center text-[13px] text-muted">Tidak ditemukan</div>
        ) : null}
        {tampil.map((o, i) => {
          const sel = isSelected(o.value);
          return (
            // Pola aria-activedescendant: fokus tetap di input, opsi dipilih lewat panah/Enter di input.
            // biome-ignore lint/a11y/useFocusableInteractive: fokus dikelola oleh combobox
            // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard ditangani di input combobox
            <div
              key={o.value}
              id={`${id}-o-${i}`}
              role="option"
              aria-selected={sel}
              data-aktif={i === aktif}
              onMouseEnter={() => setAktif(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(o.value)}
              className={cn(
                "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                i === aktif && "bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center",
                  multi && "rounded-[4px] border border-border-strong",
                  multi && sel && "border-accent bg-accent text-accent-fg",
                )}
              >
                {sel ? (
                  <Check className={cn("size-3", !multi && "text-accent")} strokeWidth={3} aria-hidden />
                ) : null}
              </span>
              <span className="truncate">{o.label}</span>
              {o.keterangan ? (
                <span className="ml-auto shrink-0 text-xs text-muted">{o.keterangan}</span>
              ) : null}
            </div>
          );
        })}
        {total > tampil.length ? (
          <div className="px-2 py-1.5 text-xs text-muted">
            {total - tampil.length} lainnya. Ketik untuk mempersempit.
          </div>
        ) : null}
      </div>
    </>
  );
}

const pemicu =
  "inline-flex h-9 w-full items-center justify-between gap-2 rounded-sm border border-border-strong bg-surface px-2.5 text-left text-sm transition-colors hover:border-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60";

export function Combobox({
  label,
  name,
  options,
  value,
  onValueChange,
  placeholder = "Pilih...",
  error,
  hint,
  allowClear,
  disabled,
  className,
}: {
  label: string;
  name?: string;
  options: OpsiCari[];
  value: string | null;
  onValueChange: (v: string | null) => void;
  placeholder?: string;
  error?: string | undefined;
  hint?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const terpilih = options.find((o) => o.value === value);
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <RP.Root
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQ("");
        }}
      >
        <RP.Trigger id={id} disabled={disabled} className={pemicu} aria-haspopup="listbox">
          <span className={cn("truncate", !terpilih && "text-muted")}>{terpilih?.label ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted" aria-hidden />
        </RP.Trigger>
        <RP.Portal>
          <RP.Content
            align="start"
            sideOffset={4}
            className="z-50 w-[var(--radix-popover-trigger-width)] min-w-64 rounded-md border border-border bg-surface shadow-pop"
          >
            <Listbox
              id={id}
              options={allowClear ? [{ value: "", label: "Tidak ada" }, ...options] : options}
              q={q}
              setQ={setQ}
              isSelected={(v) => (value ?? "") === v}
              onPick={(v) => {
                onValueChange(v === "" ? null : v);
                setOpen(false);
                setQ("");
              }}
            />
          </RP.Content>
        </RP.Portal>
      </RP.Root>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
    </Field>
  );
}

export function MultiSelect({
  label,
  options,
  values,
  onValuesChange,
  placeholder = "Pilih...",
  hint,
}: {
  label: string;
  options: OpsiCari[];
  values: string[];
  onValuesChange: (v: string[]) => void;
  placeholder?: string;
  hint?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const set = useMemo(() => new Set(values), [values]);
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <RP.Root open={open} onOpenChange={setOpen}>
        <RP.Trigger id={id} className={pemicu} aria-haspopup="listbox">
          <span className={cn("truncate", values.length === 0 && "text-muted")}>
            {values.length === 0 ? placeholder : `${values.length} dipilih`}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted" aria-hidden />
        </RP.Trigger>
        <RP.Portal>
          <RP.Content
            align="start"
            sideOffset={4}
            className="z-50 w-[var(--radix-popover-trigger-width)] min-w-72 rounded-md border border-border bg-surface shadow-pop"
          >
            <Listbox
              id={id}
              multi
              options={options}
              q={q}
              setQ={setQ}
              isSelected={(v) => set.has(v)}
              onPick={(v) => onValuesChange(set.has(v) ? values.filter((x) => x !== v) : [...values, v])}
            />
            <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted">
              <span>{values.length} dipilih</span>
              {values.length > 0 ? (
                <button
                  type="button"
                  className="font-medium text-accent hover:underline"
                  onClick={() => onValuesChange([])}
                >
                  Kosongkan
                </button>
              ) : null}
            </div>
          </RP.Content>
        </RP.Portal>
      </RP.Root>
    </Field>
  );
}
