import type { ReactNode } from "react";
import { cn } from "./cn";

type Nada = "netral" | "accent" | "success" | "warning" | "danger" | "info";
const nada: Record<Nada, string> = {
  netral: "bg-surface-2 text-muted border-border",
  accent: "bg-accent-soft text-accent border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-info-soft text-info border-transparent",
};

export function Badge({
  children,
  tone = "netral",
  className,
}: {
  children: ReactNode;
  tone?: Nada;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 text-[11.5px] font-medium",
        nada[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-[13.5px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-muted [&_svg]:size-6">{icon}</div> : null}
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div
        className={cn("h-full rounded-full", pct === 100 ? "bg-success" : "bg-accent")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  icon,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  const c = {
    info: "border-info/30 bg-info-soft text-fg",
    warning: "border-warning/30 bg-warning-soft text-fg",
    danger: "border-danger/30 bg-danger-soft text-fg",
    success: "border-success/30 bg-success-soft text-fg",
  }[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-2.5 rounded-md border px-3.5 py-3 text-[13px]", c)}
    >
      {icon ? <div className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</div> : null}
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? (
          <div className={cn(title && "mt-0.5", "text-[13px] [&_ul]:mt-1 [&_ul]:list-disc [&_ul]:pl-4")}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="panel px-4 py-3.5">
      <p className="text-[12.5px] text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}
