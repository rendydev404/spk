import { UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { z } from "zod";
import { StatusBadge } from "@/components/layout/sidebar";
import { TanpaPeriode } from "@/components/layout/tanpa-periode";
import { FilterSelect } from "@/components/ui/filter";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { TabelAlternatif } from "@/features/alternatif/components/tabel-alternatif";
import { TambahAlternatif } from "@/features/alternatif/components/tambah-alternatif";
import { calonAlternatif, daftarAlternatif, jumlahKriteria } from "@/features/alternatif/queries";
import { daftarKelas } from "@/features/kelas/queries";
import { getPeriodeKerja } from "@/features/periode/kerja";
import { requireUser } from "@/lib/rbac";

export const metadata: Metadata = { title: "Data alternatif" };

export default async function AlternatifPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string }>;
}) {
  const u = await requireUser();
  const { kerja } = await getPeriodeKerja();
  if (!kerja) return <TanpaPeriode />;
  const kelasParam = z
    .string()
    .uuid()
    .safeParse((await searchParams).kelas);
  const admin = u.role === "ADMIN";
  const bisaTambah = admin && (kerja.status === "DRAFT" || kerja.status === "PENILAIAN");
  const [data, nKriteria, kelas, calon] = await Promise.all([
    daftarAlternatif(kerja.id, u, kelasParam.success ? kelasParam.data : undefined),
    jumlahKriteria(kerja.id),
    daftarKelas(kerja.id, u),
    bisaTambah ? calonAlternatif(kerja.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Data alternatif"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Siswa yang diikutkan dalam perhitungan SPK periode {kerja.nama}.{" "}
            <StatusBadge status={kerja.status} />
          </span>
        }
        actions={
          bisaTambah ? (
            <TambahAlternatif
              periodeId={kerja.id}
              calon={calon}
              kelas={kelas}
              susulan={kerja.status !== "DRAFT"}
            />
          ) : null
        }
      />
      <div className="panel">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
          <FilterSelect
            param="kelas"
            label="Kelas"
            options={kelas.map((k) => ({ value: k.id, label: k.nama }))}
          />
          <p className="text-[13px] text-muted">
            {data.length} alternatif
            {bisaTambah && calon.length ? ` · ${calon.length} siswa belum diikutkan` : ""}
          </p>
        </div>
        {data.length === 0 ? (
          <EmptyState
            icon={<UsersRound />}
            title="Belum ada alternatif"
            description={admin ? "Tambahkan siswa yang akan diikutkan dalam seleksi." : undefined}
          />
        ) : (
          <TabelAlternatif
            periodeId={kerja.id}
            data={data}
            jumlahKriteria={nKriteria}
            bisaHapus={admin && kerja.status === "DRAFT"}
          />
        )}
      </div>
    </>
  );
}
