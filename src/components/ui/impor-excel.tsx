"use client";

import { Download, FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Button, ButtonLink } from "./button";
import { Dialog } from "./dialog";
import { FileDrop } from "./file-drop";
import { FormAksi } from "./form-aksi";

type Hasil<T> =
  | { ok: true; pesan?: string; data?: T }
  | { ok: false; pesan: string; galat?: Record<string, string>; masalah?: string[] };

/** Dialog impor Excel generik: unduh template, unggah file, tampilkan hasil opsional. */
export function ImporExcel<T>({
  judul,
  keterangan,
  templateHref,
  action,
  label = "Impor Excel",
  hasil,
}: {
  judul: string;
  keterangan: ReactNode;
  templateHref: string;
  action: (prev: unknown, fd: FormData) => Promise<Hasil<T>>;
  label?: string;
  /** Jika diisi, data hasil impor ditampilkan di dialog (misal password sementara). */
  hasil?: (data: T, tutup: () => void) => ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const tutup = () => {
    setOpen(false);
    setData(null);
  };
  const aksi = async (prev: unknown, fd: FormData) => {
    const r = await action(prev, fd);
    if (r.ok && r.data !== undefined && hasil) setData(r.data);
    return r;
  };
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <FileUp className="size-4" aria-hidden /> {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : tutup())}
        title={judul}
        description={keterangan}
        size={data ? "lg" : "md"}
      >
        {data !== null && hasil ? (
          hasil(data, tutup)
        ) : (
          <FormAksi
            action={aksi}
            onOk={() => {
              router.refresh();
              if (!hasil) tutup();
            }}
            className="flex flex-col gap-4"
          >
            {({ pending }) => (
              <>
                <FileDrop name="file" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ButtonLink href={templateHref} variant="ghost" size="sm" prefetch={false}>
                    <Download className="size-4" aria-hidden /> Unduh template
                  </ButtonLink>
                  <Button type="submit" loading={pending}>
                    Impor
                  </Button>
                </div>
              </>
            )}
          </FormAksi>
        )}
      </Dialog>
    </>
  );
}
