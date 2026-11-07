import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { StatusBadge } from "@/components/layout/sidebar";
import { Alert, EmptyState, PageHeader } from "@/components/ui/misc";
import { getKelas } from "@/features/kelas/queries";
import { kriteriaLengkap } from "@/features/kriteria/queries";
import { GridPenilaian } from "@/features/penilaian/components/grid";
import { ImporNilai } from "@/features/penilaian/components/impor-nilai";
import { dataGrid } from "@/features/penilaian/queries";
import { getPeriode } from "@/features/periode/queries";
import { requireKelasAccess } from "@/lib/rbac";

export const metadata: Metadata = { title: "Input nilai" };

export default async function GridPage({ params }: { params: Promise<{ kelasId: string }> }) {
  const { kelasId } = await params;
  if (!z.string().uuid().safeParse(kelasId).success) notFound();
  const u = await requireKelasAccess(kelasId).catch(() => notFound());
  const k = await getKelas(kelasId);
  if (!k) notFound();
  const [p, kriteria, { baris, nilai }] = await Promise.all([
    getPeriode(k.periodeId),
    kriteriaLengkap(k.periodeId),
    dataGrid(kelasId, k.periodeId),
  ]);
  if (!p) notFound();
  const bisaUbah = p.status === "PENILAIAN" && u.role !== "KEPSEK";
  const awal = Object.fromEntries(
    nilai.map((n) => [
      `${n.siswaId}:${n.kriteriaId}`,
      {
        mentah: n.nilaiMentah === null ? "" : String(Number(n.nilaiMentah)).replace(".", ","),
        sub: n.subKriteriaId,
      },
    ]),
  );
  // Kunci berdasarkan isi data: setelah simpan + refresh, grid dipasang ulang dengan nilai terbaru.
  let h = 2166136261;
  for (const n of nilai) {
    for (const ch of `${n.siswaId}${n.kriteriaId}${n.nilaiMentah}${n.subKriteriaId}|`)
      h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  }
  const versi = `${nilai.length}-${h >>> 0}`;
  return (
    <>
      <PageHeader
        title={`Penilaian ${k.nama}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Periode {p.nama} <StatusBadge status={p.status} /> {baris.length} alternatif · {kriteria.length}{" "}
            kriteria
          </span>
        }
        actions={bisaUbah && baris.length ? <ImporNilai kelasId={kelasId} /> : null}
      />
      {!bisaUbah ? (
        <div className="mb-4">
          <Alert tone="info">
            {u.role === "KEPSEK"
              ? "Tampilan baca saja."
              : "Nilai hanya bisa diubah saat periode berstatus Penilaian."}
          </Alert>
        </div>
      ) : null}
      {baris.length === 0 ? (
        <div className="panel">
          <EmptyState
            title="Belum ada alternatif di kelas ini"
            description="Admin perlu menambahkan siswa kelas ini sebagai alternatif."
          />
        </div>
      ) : (
        <GridPenilaian
          key={versi}
          kelasId={kelasId}
          bisaUbah={bisaUbah}
          baris={baris}
          awal={awal}
          kriteria={kriteria.map((x) => ({
            id: x.id,
            kode: x.kode,
            nama: x.nama,
            jenis: x.jenis,
            tipeInput: x.tipeInput,
            nilaiMin: x.nilaiMin === null ? null : Number(x.nilaiMin),
            nilaiMax: x.nilaiMax === null ? null : Number(x.nilaiMax),
            sub: x.sub,
          }))}
        />
      )}
    </>
  );
}
