import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/layout/sidebar";
import { TanpaPeriode } from "@/components/layout/tanpa-periode";
import { Alert, EmptyState, PageHeader, ProgressBar } from "@/components/ui/misc";
import { progresKelas } from "@/features/penilaian/queries";
import { getPeriodeKerja } from "@/features/periode/kerja";
import { requireUser } from "@/lib/rbac";

export const metadata: Metadata = { title: "Penilaian siswa" };

export default async function PenilaianPage() {
  const u = await requireUser();
  const { kerja } = await getPeriodeKerja();
  if (!kerja) return <TanpaPeriode />;
  const data = await progresKelas(kerja.id, u);
  // Wali kelas dengan satu kelas langsung diarahkan ke grid.
  if (u.role === "WALI_KELAS" && data.length === 1) redirect(`/penilaian/${data[0]!.id}`);
  const total = data.reduce((s, k) => s + k.jumlahAlternatif, 0);
  const lengkap = data.reduce((s, k) => s + k.jumlahLengkap, 0);
  return (
    <>
      <PageHeader
        title="Penilaian siswa"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Periode {kerja.nama} <StatusBadge status={kerja.status} /> {lengkap}/{total} alternatif sudah
            lengkap nilainya.
          </span>
        }
      />
      {kerja.status !== "PENILAIAN" ? (
        <div className="mb-4">
          <Alert tone="info">
            {kerja.status === "DRAFT"
              ? "Penilaian belum dibuka. Admin perlu membuka penilaian di halaman periode."
              : "Penilaian sudah ditutup. Nilai hanya bisa dilihat."}
          </Alert>
        </div>
      ) : null}
      {data.length === 0 ? (
        <div className="panel">
          <EmptyState icon={<ClipboardList />} title="Tidak ada kelas" />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((k) => (
            <li key={k.id}>
              <Link
                href={`/penilaian/${k.id}`}
                className="panel block p-4 transition-colors hover:border-accent"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">{k.nama}</p>
                  <p className="text-[13px] text-muted tabular">
                    {k.jumlahLengkap}/{k.jumlahAlternatif} lengkap
                  </p>
                </div>
                <p className="mb-3 mt-0.5 text-xs text-muted">{k.waliNama ?? "Belum ada wali kelas"}</p>
                <ProgressBar value={k.jumlahLengkap} max={k.jumlahAlternatif} label={`Progres ${k.nama}`} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
