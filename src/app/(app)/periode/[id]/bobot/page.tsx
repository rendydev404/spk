import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { StatusBadge } from "@/components/layout/sidebar";
import { TanpaPeriode } from "@/components/layout/tanpa-periode";
import { Alert, EmptyState, PageHeader } from "@/components/ui/misc";
import { BobotEditor } from "@/features/bobot/components/bobot-editor";
import { daftarKriteria } from "@/features/kriteria/queries";
import { getPeriode } from "@/features/periode/queries";
import { requireUser } from "@/lib/rbac";

export const metadata: Metadata = { title: "Bobot kriteria" };

export default async function BobotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "_") return <TanpaPeriode />;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const u = await requireUser();
  const p = await getPeriode(id);
  if (!p) notFound();
  const kriteria = await daftarKriteria(id);
  const bisaUbah = u.role === "ADMIN" && p.status === "DRAFT";
  return (
    <>
      <PageHeader
        title="Bobot kriteria"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Periode {p.nama} <StatusBadge status={p.status} /> Total bobot harus tepat 100% sebelum penilaian
            dibuka.
          </span>
        }
      />
      {!bisaUbah && u.role === "ADMIN" ? (
        <div className="mb-4">
          <Alert tone="info">Bobot hanya bisa diubah saat periode berstatus Draf.</Alert>
        </div>
      ) : null}
      {kriteria.length === 0 ? (
        <div className="panel">
          <EmptyState title="Belum ada kriteria" description="Tambahkan kriteria terlebih dahulu." />
        </div>
      ) : (
        <BobotEditor
          periodeId={id}
          modeAwal={p.modeBobot}
          bisaUbah={bisaUbah}
          kriteria={kriteria.map((k) => ({
            id: k.id,
            kode: k.kode,
            nama: k.nama,
            jenis: k.jenis,
            bobot: k.bobot,
            kepentingan: k.kepentingan,
          }))}
        />
      )}
    </>
  );
}
