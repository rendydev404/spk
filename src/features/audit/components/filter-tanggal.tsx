"use client";

import { DateRangePicker } from "@/components/ui/date-picker";
import { useSetParam } from "@/components/ui/filter";

export function FilterTanggal() {
  const { set, sp } = useSetParam();
  return (
    <DateRangePicker
      label="Rentang tanggal"
      value={{ dari: sp.get("dari"), sampai: sp.get("sampai") }}
      onChange={(v) => set({ dari: v.dari, sampai: v.sampai, sebelum: null })}
    />
  );
}
