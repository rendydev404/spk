"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { NumberField, TextField } from "@/components/ui/field";
import { FormAksi } from "@/components/ui/form-aksi";
import { Select } from "@/components/ui/select";
import { LABEL_TIPE } from "@/lib/status";
import { simpanKriteria } from "../actions";

type Nilai = {
  id: string;
  kode: string;
  nama: string;
  jenis: "BENEFIT" | "COST";
  tipeInput: "ANGKA" | "RENTANG" | "PILIHAN";
  nilaiMin: string | null;
  nilaiMax: string | null;
};

export function KriteriaDialog({
  periodeId,
  nilai,
  kodeBerikut,
}: {
  periodeId: string;
  nilai?: Nilai;
  kodeBerikut?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipe, setTipe] = useState<string>(nilai?.tipeInput ?? "ANGKA");
  return (
    <>
      {nilai ? (
        <IconButton label={`Ubah ${nilai.kode}`} onClick={() => setOpen(true)}>
          <Pencil className="size-4" aria-hidden />
        </IconButton>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden /> Kriteria baru
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={nilai ? `Ubah kriteria ${nilai.kode}` : "Kriteria baru"}
      >
        <FormAksi
          action={simpanKriteria.bind(null, periodeId, nilai?.id ?? null)}
          onOk={() => {
            setOpen(false);
            router.refresh();
          }}
          className="grid gap-4 sm:grid-cols-[120px_1fr]"
        >
          {({ pending, galat }) => (
            <>
              <TextField
                label="Kode"
                name="kode"
                defaultValue={nilai?.kode ?? kodeBerikut}
                error={galat.kode}
                required
              />
              <TextField
                label="Nama kriteria"
                name="nama"
                defaultValue={nilai?.nama}
                error={galat.nama}
                required
              />
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <Select
                  label="Jenis"
                  name="jenis"
                  defaultValue={nilai?.jenis ?? "BENEFIT"}
                  options={[
                    { value: "BENEFIT", label: "Benefit", keterangan: "makin besar makin baik" },
                    { value: "COST", label: "Cost", keterangan: "makin kecil makin baik" },
                  ]}
                  error={galat.jenis}
                />
                <Select
                  label="Tipe input"
                  name="tipeInput"
                  value={tipe}
                  onValueChange={setTipe}
                  options={Object.entries(LABEL_TIPE).map(([value, label]) => ({ value, label }))}
                  error={galat.tipeInput}
                />
                {tipe !== "PILIHAN" ? (
                  <>
                    <NumberField
                      label="Nilai minimum"
                      name="nilaiMin"
                      defaultValue={nilai?.nilaiMin ?? "0"}
                      error={galat.nilaiMin}
                    />
                    <NumberField
                      label="Nilai maksimum"
                      name="nilaiMax"
                      defaultValue={nilai?.nilaiMax ?? "100"}
                      error={galat.nilaiMax}
                    />
                  </>
                ) : (
                  <>
                    <input type="hidden" name="nilaiMin" value="" />
                    <input type="hidden" name="nilaiMax" value="" />
                  </>
                )}
              </div>
              <p className="text-xs text-muted sm:col-span-2">
                {tipe === "ANGKA"
                  ? "Nilai yang diinput langsung masuk ke matriks keputusan."
                  : tipe === "RENTANG"
                    ? "Angka mentah (misal jumlah hari) dikonversi ke skala lewat tabel rentang di sub-kriteria."
                    : "Penilai memilih salah satu label sub-kriteria; nilai skalanya yang dipakai."}
              </p>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" loading={pending}>
                  Simpan
                </Button>
              </div>
            </>
          )}
        </FormAksi>
      </Dialog>
    </>
  );
}
