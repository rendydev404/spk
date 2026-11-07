"use client";

import { Download, FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FileDrop } from "@/components/ui/file-drop";
import { FormAksi } from "@/components/ui/form-aksi";
import { imporNilai } from "../actions";

export function ImporNilai({ kelasId }: { kelasId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <FileUp className="size-4" aria-hidden /> Impor nilai
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Impor nilai dari Excel"
        description="Gunakan template kelas ini. Sel kosong diabaikan. Jika ada satu nilai tidak valid, tidak ada yang disimpan."
      >
        <FormAksi
          action={imporNilai.bind(null, kelasId)}
          onOk={() => {
            setOpen(false);
            router.refresh();
          }}
          className="flex flex-col gap-4"
        >
          {({ pending }) => (
            <>
              <FileDrop name="file" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ButtonLink
                  href={`/api/ekspor/template/nilai?kelas=${kelasId}`}
                  variant="ghost"
                  size="sm"
                  prefetch={false}
                >
                  <Download className="size-4" aria-hidden /> Unduh template kelas
                </ButtonLink>
                <Button type="submit" loading={pending}>
                  Impor
                </Button>
              </div>
            </>
          )}
        </FormAksi>
      </Dialog>
    </>
  );
}
