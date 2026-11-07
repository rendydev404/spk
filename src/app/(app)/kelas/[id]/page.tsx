import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/ui/misc";
import { AnggotaPanel } from "@/features/kelas/components/anggota-panel";
import { anggotaKelas, daftarKelas, getKelas, siswaTanpaKelas } from "@/features/kelas/queries";
import { getPeriode } from "@/features/periode/queries";
import { requireKelasAccess } from "@/lib/rbac";

export const metadata: Metadata = { title: "Anggota kelas" };

export default async function KelasDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const u = await requireKelasAccess(id).catch(() => notFound());
  const k = await getKelas(id);
  if (!k) notFound();
  const periode = await getPeriode(k.periodeId);
  const bisaUbah = u.role === "ADMIN" && periode?.status === "DRAFT";
  const [anggota, calon, semuaKelas] = await Promise.all([
    anggotaKelas(id),
    bisaUbah ? siswaTanpaKelas(k.periodeId) : Promise.resolve([]),
    bisaUbah ? daftarKelas(k.periodeId, u) : Promise.resolve([]),
  ]);
  return (
    <>
      <PageHeader
        title={`Kelas ${k.nama}`}
        description={`Tingkat ${k.tingkat} · Wali kelas: ${k.waliNama ?? "belum ada"} · Periode ${periode?.nama ?? ""} · ${anggota.length} siswa`}
      />
      <AnggotaPanel
        kelasId={id}
        anggota={anggota}
        calon={calon}
        kelasLain={semuaKelas.filter((x) => x.id !== id).map((x) => ({ id: x.id, nama: x.nama }))}
        bisaUbah={bisaUbah}
      />
    </>
  );
}
