"use client";

import { FileSpreadsheet, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import { cn } from "./cn";

export function FileDrop({
  name,
  accept = ".xlsx",
  maxMb = 2,
  onFile,
}: {
  name: string;
  accept?: string;
  maxMb?: number;
  onFile?: (f: File | null) => void;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pilih(f: File | null) {
    setErr(null);
    if (f && f.size > maxMb * 1024 * 1024) {
      setErr(`Ukuran file maksimal ${maxMb} MB`);
      f = null;
    }
    if (f && !f.name.toLowerCase().endsWith(".xlsx")) {
      setErr("File harus berformat .xlsx");
      f = null;
    }
    setFile(f);
    onFile?.(f);
    if (ref.current) {
      const dt = new DataTransfer();
      if (f) dt.items.add(f);
      ref.current.files = dt.files;
    }
  }

  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pilih(e.dataTransfer.files[0] ?? null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            ref.current?.click();
          }
        }}
        tabIndex={0}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border-strong px-4 py-7 text-center transition-colors hover:bg-surface-2 focus-visible:outline-2",
          over && "border-accent bg-accent-soft",
        )}
      >
        {file ? (
          <>
            <FileSpreadsheet className="size-6 text-accent" aria-hidden />
            <span className="text-sm font-medium">{file.name}</span>
            <span className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB. Klik untuk mengganti.</span>
          </>
        ) : (
          <>
            <Upload className="size-6 text-muted" aria-hidden />
            <span className="text-sm font-medium">Seret file ke sini atau klik untuk memilih</span>
            <span className="text-xs text-muted">Format .xlsx, maksimal {maxMb} MB</span>
          </>
        )}
      </label>
      <input
        ref={ref}
        id={id}
        name={name}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => pilih(e.target.files?.[0] ?? null)}
      />
      {err ? <p className="mt-1.5 text-xs text-danger">{err}</p> : null}
    </div>
  );
}
