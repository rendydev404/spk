import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "./cn";

export const kelasInput =
  "h-9 w-full rounded-sm border border-border-strong bg-surface px-2.5 text-sm text-fg placeholder:text-muted/70 transition-colors hover:border-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-danger/15";

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className,
  required,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | undefined;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-err` : undefined} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<ComponentProps<"input">, "type"> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | undefined;
  type?: "text" | "password" | "search" | "email";
};

export function TextField({
  label,
  hint,
  error,
  id,
  className,
  required,
  type = "text",
  ...rest
}: TextFieldProps) {
  const gen = useId();
  const fid = id ?? gen;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} className={className} required={required}>
      <input
        id={fid}
        type={type}
        className={kelasInput}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        required={required}
        {...rest}
      />
    </Field>
  );
}

/** Input angka berbasis teks agar koma desimal dan validasi kustom konsisten. */
export function NumberField(props: Omit<TextFieldProps, "type" | "inputMode">) {
  return <TextField {...props} inputMode="decimal" autoComplete="off" />;
}

export function TextArea({
  label,
  hint,
  error,
  id,
  className,
  required,
  ...rest
}: ComponentProps<"textarea"> & { label: ReactNode; hint?: ReactNode; error?: string | undefined }) {
  const gen = useId();
  const fid = id ?? gen;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={fid} className={className} required={required}>
      <textarea
        id={fid}
        className={cn(kelasInput, "h-auto min-h-20 py-2")}
        aria-invalid={error ? true : undefined}
        required={required}
        {...rest}
      />
    </Field>
  );
}
