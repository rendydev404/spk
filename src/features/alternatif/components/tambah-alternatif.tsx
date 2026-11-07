"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/combobox";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { useAksi } from "@/components/ui/use-aksi";
import { tambahAlternatif } from "../actions";

type Cara = "siswa" | "kelas" | "tingkat" | "sekolah";

export function TambahAlternatif({
  periodeId,
  calon,
  kelas,
  susulan,
}: {
  periodeId: string;
  calon: { id: string; nis: string; nama: string; kelasNama: string }[];
  kelas: { id: string; nama: string; tingkat: number }[];
  susulan: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cara, setCara] = useState<Cara>("siswa");
  const [siswaIds, setSiswaIds] = useState<string[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [tingkat, setTingkat] = useState("");
  const { jalan, pending } = useAksi();
  const tingkatList = [...new Set(kelas.map((k) => k.tingkat))].sort((a, b) => a - b);

  const siap = cara === "siswa" ? siswaIds.length > 0 : cara === "kelas" ? !!kelasId : cara === "tingkat" ? !!tingkat : true;
  const input =
    cara === "siswa"
      ? { cara, siswaIds }
      : cara === "kelas"
        ? { cara, kelasId }
        : cara === "tingkat"
          ? { cara, tingkat: Number(tingkat) }
          : { cara };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" aria-hidden /> Tambah alternatif
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Tambah alternatif"
        description="Hanya siswa aktif yang sudah terdaftar di kelas pada periode ini. Siswa yang sudah menjadi alternatif dilewati."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!siap}
              loading={pending}
              onClick={() =>
                jalan(() => tambahAlternatif(periodeId, input), {
                  onOk: () => {
                    setOpen(false);
                    setSiswaIds([]);
                    router.refresh();
                  },
                })
              }
            >
              Tambahkan
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {susulan ? (
            <Alert tone="warning" title="Penambahan susulan">
              Penilaian sudah dibuka. Alternatif baru mendapat kode lanjutan dan perlu dinilai oleh wali kelasnya.
            </Alert>
          ) : null}
          <Segmented
            aria-label="Cara menambah"
            value={cara}
            onValueChange={setCara}
            options={[
              { value: "siswa", label: "Pilih siswa" },
              { value: "kelas", label: "Satu kelas" },
              { value: "tingkat", label: "Satu tingkat" },
              { value: "sekolah", label: "Seluruh sekolah" },
            ]}
          />
          {cara === "siswa" ? (
            <MultiSelect
              label="Siswa"
              values={siswaIds}
              onValuesChange={setSiswaIds}
              options={calon.map((c) => ({ value: c.id, label: c.nama, keterangan: `${c.kelasNama} · ${c.nis}` }))}
              placeholder={calon.length ? "Cari nama, NIS, atau kelas" : "Semua siswa sudah menjadi alternatif"}
            />
          ) : cara === "kelas" ? (
            <Select label="Kelas" value={kelasId} onValueChange={setKelasId} options={kelas.map((k) => ({ value: k.id, label: k.nama }))} />
          ) : cara === "tingkat" ? (
            <Select
              label="Tingkat"
              value={tingkat}
              onValueChange={setTingkat}
              options={tingkatList.map((t) => ({ value: String(t), label: `Tingkat ${t}` }))}
            />
          ) : (
            <p className="text-[13.5px] text-muted">{calon.length} siswa aktif di semua kelas akan ditambahkan.</p>
          )}
        </div>
      </Dialog>
    </>
  );
}
