"use client";

import * as RC from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { type ReactNode, useId } from "react";

export function Checkbox({
  label,
  checked,
  defaultChecked,
  onCheckedChange,
  name,
  value,
  disabled,
  "aria-label": ariaLabel,
}: {
  label?: ReactNode;
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (c: boolean) => void;
  name?: string;
  value?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const id = useId();
  return (
    <span className="inline-flex items-center gap-2">
      <RC.Root
        id={id}
        {...(checked !== undefined ? { checked } : {})}
        {...(defaultChecked !== undefined ? { defaultChecked } : {})}
        {...(onCheckedChange ? { onCheckedChange: (c) => onCheckedChange(c === true) } : {})}
        {...(name ? { name } : {})}
        {...(value ? { value } : {})}
        disabled={disabled}
        aria-label={label ? undefined : ariaLabel}
        className="grid size-4 shrink-0 place-items-center rounded-[4px] border border-border-strong bg-surface transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent disabled:opacity-50"
      >
        <RC.Indicator className="text-accent-fg">
          {checked === "indeterminate" ? (
            <Minus className="size-3" strokeWidth={3} aria-hidden />
          ) : (
            <Check className="size-3" strokeWidth={3} aria-hidden />
          )}
        </RC.Indicator>
      </RC.Root>
      {label ? (
        <label htmlFor={id} className="text-sm">
          {label}
        </label>
      ) : null}
    </span>
  );
}
