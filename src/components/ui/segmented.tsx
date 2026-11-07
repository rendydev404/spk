"use client";

import * as RG from "@radix-ui/react-radio-group";

/** Pilihan tunggal berbentuk tombol bersebelahan (RadioGroup aksesibel, panah untuk berpindah). */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  name,
  "aria-label": ariaLabel,
}: {
  value: T;
  onValueChange: (v: T) => void;
  options: { value: T; label: string }[];
  name?: string;
  "aria-label": string;
}) {
  return (
    <RG.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      {...(name ? { name } : {})}
      aria-label={ariaLabel}
      orientation="horizontal"
      className="inline-flex rounded-sm border border-border-strong bg-surface-2 p-0.5"
    >
      {options.map((o) => (
        <RG.Item
          key={o.value}
          value={o.value}
          className="h-7 rounded-[5px] px-3 text-[13px] font-medium text-muted transition-colors data-[state=checked]:bg-surface data-[state=checked]:text-fg data-[state=checked]:shadow-sm"
        >
          {o.label}
        </RG.Item>
      ))}
    </RG.Root>
  );
}
