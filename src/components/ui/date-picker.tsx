"use client";

import * as RP from "@radix-ui/react-popover";
import { CalendarDays } from "lucide-react";
import { useId, useState } from "react";
import { type DateRange, DayPicker } from "react-day-picker";
import { id as localeId } from "react-day-picker/locale";
import { cn } from "./cn";
import { Field, kelasInput } from "./field";

const pad = (n: number) => String(n).padStart(2, "0");
/** Date -> "yyyy-mm-dd" (tanggal lokal, tanpa geser zona waktu) */
export const keIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const keTampil = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const dariIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y as number, (m as number) - 1, d as number);
};
function parseKetik(s: string): string | null {
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (d.getDate() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1) return null;
  return keIso(d);
}

/** Pilih tanggal: bisa diketik dd/mm/yyyy atau dipilih dari kalender. Nilai form: yyyy-mm-dd. */
export function DatePicker({
  label,
  name,
  defaultValue,
  error,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  error?: string | undefined;
  hint?: string;
}) {
  const id = useId();
  const [iso, setIso] = useState<string>(defaultValue ?? "");
  const [teks, setTeks] = useState(defaultValue ? keTampil(defaultValue) : "");
  const [open, setOpen] = useState(false);
  const [salahKetik, setSalahKetik] = useState(false);
  return (
    <Field label={label} htmlFor={id} error={error ?? (salahKetik ? "Format tanggal dd/mm/yyyy" : undefined)} hint={hint ?? "dd/mm/yyyy"}>
      <RP.Root open={open} onOpenChange={setOpen}>
        <div className="relative">
          <input
            id={id}
            value={teks}
            placeholder="dd/mm/yyyy"
            inputMode="numeric"
            aria-invalid={error || salahKetik ? true : undefined}
            onChange={(e) => setTeks(e.target.value)}
            onBlur={() => {
              if (teks.trim() === "") {
                setIso("");
                setSalahKetik(false);
                return;
              }
              const p = parseKetik(teks);
              setSalahKetik(!p);
              if (p) {
                setIso(p);
                setTeks(keTampil(p));
              }
            }}
            className={cn(kelasInput, "pr-9")}
          />
          <RP.Trigger
            className="absolute right-1 top-1 grid size-7 place-items-center rounded-sm text-muted hover:bg-surface-2"
            aria-label="Buka kalender"
          >
            <CalendarDays className="size-4" aria-hidden />
          </RP.Trigger>
        </div>
        <RP.Portal>
          <RP.Content align="end" sideOffset={4} className="z-50 rounded-md border border-border bg-surface p-3 shadow-pop">
            <DayPicker
              mode="single"
              locale={localeId}
              selected={iso ? dariIso(iso) : undefined}
              {...(iso ? { defaultMonth: dariIso(iso) } : {})}
              onSelect={(d) => {
                if (!d) return;
                const v = keIso(d);
                setIso(v);
                setTeks(keTampil(v));
                setSalahKetik(false);
                setOpen(false);
              }}
            />
          </RP.Content>
        </RP.Portal>
      </RP.Root>
      <input type="hidden" name={name} value={iso} />
    </Field>
  );
}

export function DateRangePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { dari: string | null; sampai: string | null };
  onChange: (v: { dari: string | null; sampai: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const range: DateRange | undefined = value.dari
    ? { from: dariIso(value.dari), to: value.sampai ? dariIso(value.sampai) : undefined }
    : undefined;
  const teks = value.dari
    ? `${keTampil(value.dari)}${value.sampai ? ` - ${keTampil(value.sampai)}` : ""}`
    : "Semua tanggal";
  return (
    <RP.Root open={open} onOpenChange={setOpen}>
      <RP.Trigger
        aria-label={`${label}: ${teks}`}
        className="inline-flex h-8 items-center gap-2 rounded-sm border border-border-strong bg-surface px-2.5 text-[13px] hover:bg-surface-2"
      >
        <CalendarDays className="size-4 text-muted" aria-hidden />
        <span className={cn(!value.dari && "text-muted")}>{teks}</span>
      </RP.Trigger>
      <RP.Portal>
        <RP.Content align="start" sideOffset={4} className="z-50 rounded-md border border-border bg-surface p-3 shadow-pop">
          <DayPicker
            mode="range"
            locale={localeId}
            selected={range}
            onSelect={(r) =>
              onChange({ dari: r?.from ? keIso(r.from) : null, sampai: r?.to ? keIso(r.to) : null })
            }
          />
          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <button
              type="button"
              className="text-xs font-medium text-muted hover:text-fg"
              onClick={() => {
                onChange({ dari: null, sampai: null });
                setOpen(false);
              }}
            >
              Hapus filter
            </button>
            <button type="button" className="text-xs font-medium text-accent" onClick={() => setOpen(false)}>
              Selesai
            </button>
          </div>
        </RP.Content>
      </RP.Portal>
    </RP.Root>
  );
}
