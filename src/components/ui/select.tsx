"use client";

import * as RS from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { useId } from "react";
import { cn } from "./cn";
import { Field } from "./field";

export interface Opsi {
  value: string;
  label: string;
  keterangan?: string;
}

export function Select({
  label,
  name,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Pilih...",
  error,
  hint,
  disabled,
  required,
  className,
  size = "md",
  "aria-label": ariaLabel,
}: {
  label?: string;
  name?: string;
  options: Opsi[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  placeholder?: string;
  error?: string | undefined;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: "sm" | "md";
  "aria-label"?: string;
}) {
  const id = useId();
  const trigger = (
    <RS.Root
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(onValueChange ? { onValueChange } : {})}
      {...(name ? { name } : {})}
      disabled={disabled}
      required={required}
    >
      <RS.Trigger
        id={id}
        aria-label={label ? undefined : ariaLabel}
        aria-invalid={error ? true : undefined}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 rounded-sm border border-border-strong bg-surface px-2.5 text-left text-fg transition-colors hover:border-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60 data-[placeholder]:text-muted aria-invalid:border-danger",
          size === "sm" ? "h-8 text-[13px]" : "h-9 text-sm",
          !label && className,
        )}
      >
        <span className="truncate">
          <RS.Value placeholder={placeholder} />
        </span>
        <RS.Icon>
          <ChevronDown className="size-4 text-muted" aria-hidden />
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-surface shadow-pop"
        >
          <RS.Viewport className="p-1">
            {options.map((o) => (
              <RS.Item
                key={o.value}
                value={o.value}
                className="relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-7 pr-3 text-sm outline-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-50"
              >
                <RS.ItemIndicator className="absolute left-2">
                  <Check className="size-3.5 text-accent" aria-hidden />
                </RS.ItemIndicator>
                <RS.ItemText>{o.label}</RS.ItemText>
                {o.keterangan ? <span className="ml-2 text-xs text-muted">{o.keterangan}</span> : null}
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
  if (!label) return trigger;
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className={className} required={required}>
      {trigger}
    </Field>
  );
}
