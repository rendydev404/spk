import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";
import { Spinner } from "./spinner";

type Varian = "primary" | "secondary" | "ghost" | "danger";
type Ukuran = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-sm font-medium whitespace-nowrap transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none select-none";
const varian: Record<Varian, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "bg-surface text-fg border border-border-strong hover:bg-surface-2",
  ghost: "text-fg hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90",
};
const ukuran: Record<Ukuran, string> = {
  sm: "h-8 px-2.5 text-[13px]",
  md: "h-9 px-3.5 text-sm",
};

export function kelasTombol(v: Varian = "primary", u: Ukuran = "md", extra?: string) {
  return cn(base, varian[v], ukuran[u], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ComponentProps<"button"> & { variant?: Varian; size?: Ukuran; loading?: boolean }) {
  return (
    <button
      type={type}
      className={kelasTombol(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Varian; size?: Ukuran }) {
  return <Link className={kelasTombol(variant, size, className)} {...rest} />;
}

export function IconButton({
  label,
  children,
  className,
  type = "button",
  ...rest
}: ComponentProps<"button"> & { label: string; children: ReactNode }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid size-8 place-items-center rounded-sm text-muted hover:bg-surface-2 hover:text-fg transition-colors disabled:opacity-40 disabled:pointer-events-none",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
