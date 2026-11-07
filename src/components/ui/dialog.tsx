"use client";

import * as RD from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-[fade_150ms_ease-out]" />
        <RD.Content
          className={cn(
            "fixed left-1/2 top-[8vh] z-50 flex max-h-[84vh] w-[calc(100vw-32px)] -translate-x-1/2 flex-col rounded-md border border-border bg-surface shadow-pop focus:outline-none data-[state=open]:animate-[pop_160ms_ease-out]",
            size === "sm" ? "max-w-md" : size === "md" ? "max-w-xl" : "max-w-3xl",
          )}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <RD.Title className="text-base font-semibold">{title}</RD.Title>
              {description ? (
                <RD.Description className="mt-1 text-[13px] text-muted">{description}</RD.Description>
              ) : null}
            </div>
            <RD.Close className="-mr-1 grid size-7 place-items-center rounded-sm text-muted hover:bg-surface-2" aria-label="Tutup">
              <X className="size-4" aria-hidden />
            </RD.Close>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Lanjutkan",
  danger,
  loading,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
