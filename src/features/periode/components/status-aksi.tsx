"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { TextArea } from "@/components/ui/field";
import { useAksi } from "@/components/ui/use-aksi";
import type { StatusPeriode } from "@/lib/status";
import { hapusPeriode, ubahStatusPeriode } from "../actions";

type Aksi = {
  jenis: string;
  label: string;
  judul: string;
  penjelasan: string;
  varian: "primary" | "secondary" | "danger";
  alasan?: boolean;
};

const PER_STATUS: Record<StatusPeriode, Aksi[]> = {
  DRAFT: [
    {
      jenis: "bukaPenilaian",
      label: "Buka penilaian",
      judul: "Buka penilaian?",
      penjelasan:
        "Wali kelas bisa mulai menginput nilai. Kriteria, bobot, dan alternatif akan terkunci, dan kode alternatif diurutkan ulang (A1..An).",
      varian: "primary",
    },
  ],
  PENILAIAN: [
    {
      jenis: "tutupPenilaian",
      label: "Tutup penilaian",
      judul: "Tutup penilaian?",
      penjelasan: "Input nilai dikunci dan admin bisa menjalankan perhitungan SAW.",
      varian: "primary",
    },
    {
      jenis: "kembaliDraf",
      label: "Kembalikan ke Draf",
      judul: "Kembalikan ke Draf?",
      penjelasan: "Hanya bisa jika belum ada nilai yang diinput. Kriteria dan bobot bisa diubah lagi.",
      varian: "secondary",
    },
  ],
  PERHITUNGAN: [
    {
      jenis: "bukaLagiPenilaian",
      label: "Buka lagi input nilai",
      judul: "Buka lagi input nilai?",
      penjelasan: "Wali kelas bisa mengubah nilai lagi. Riwayat perhitungan yang sudah ada tetap tersimpan.",
      varian: "secondary",
    },
  ],
  VALIDASI: [],
  FINAL: [
    {
      jenis: "bukaUlangFinal",
      label: "Buka ulang periode",
      judul: "Buka ulang periode yang sudah final?",
      penjelasan:
        "Hasil yang sudah disahkan dibatalkan dan periode kembali ke tahap Perhitungan. Aksi ini dicatat di audit log beserta alasannya.",
      varian: "danger",
      alasan: true,
    },
  ],
};

export function StatusAksi({
  id,
  status,
  bisaHapus,
}: {
  id: string;
  status: StatusPeriode;
  bisaHapus: boolean;
}) {
  const router = useRouter();
  const { jalan, pending } = useAksi();
  const [aktif, setAktif] = useState<Aksi | null>(null);
  const [alasan, setAlasan] = useState("");
  const [hapus, setHapus] = useState(false);
  const daftar = PER_STATUS[status];

  return (
    <>
      {daftar.map((a) => (
        <Button key={a.jenis} variant={a.varian} onClick={() => setAktif(a)}>
          {a.label}
        </Button>
      ))}
      {bisaHapus ? (
        <Button variant="ghost" className="text-danger" onClick={() => setHapus(true)}>
          Hapus periode
        </Button>
      ) : null}
      <ConfirmDialog
        open={aktif !== null}
        onOpenChange={(o) => !o && setAktif(null)}
        title={aktif?.judul ?? ""}
        description={aktif?.penjelasan}
        confirmLabel={aktif?.label ?? ""}
        danger={aktif?.varian === "danger"}
        loading={pending}
        onConfirm={() =>
          aktif &&
          jalan(() => ubahStatusPeriode(id, aktif.jenis, alasan), {
            onOk: () => {
              setAktif(null);
              setAlasan("");
              router.refresh();
            },
          })
        }
      >
        {aktif?.alasan ? (
          <TextArea
            label="Alasan"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            required
            hint="Minimal 10 karakter"
          />
        ) : null}
      </ConfirmDialog>
      <ConfirmDialog
        open={hapus}
        onOpenChange={setHapus}
        title="Hapus periode?"
        description="Periode beserta kelas, kriteria, dan daftar alternatifnya dihapus permanen. Data siswa tidak ikut terhapus."
        confirmLabel="Hapus"
        danger
        loading={pending}
        onConfirm={() => jalan(() => hapusPeriode(id))}
      />
    </>
  );
}
