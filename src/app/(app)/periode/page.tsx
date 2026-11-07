import { CalendarRange, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/layout/sidebar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { daftarPeriode } from "@/features/periode/queries";
import { requireUser } from "@/lib/rbac";

export const metadata: Metadata = { title: "Periode" };

export default async function PeriodePage() {
  const u = await requireUser();
  const data = await daftarPeriode();
  return (
    <>
      <PageHeader
        title="Periode penilaian"
        description="Setiap periode punya kelas, kriteria, bobot, dan alternatif sendiri sehingga riwayat hasil tetap konsisten."
        actions={
          u.role === "ADMIN" ? (
            <ButtonLink href="/periode/baru">
              <Plus className="size-4" aria-hidden /> Periode baru
            </ButtonLink>
          ) : null
        }
      />
      <div className="panel overflow-x-auto">
        {data.length === 0 ? (
          <EmptyState icon={<CalendarRange />} title="Belum ada periode" description="Buat periode untuk mulai proses seleksi." />
        ) : (
          <table className="tabel">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Status</th>
                <th className="num">Kelas</th>
                <th className="num">Kriteria</th>
                <th className="num">Alternatif</th>
                <th className="num">Kuota</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/periode/${p.id}`} className="font-medium hover:text-accent hover:underline">
                      {p.nama}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="num">{p.jumlahKelas}</td>
                  <td className="num">{p.jumlahKriteria}</td>
                  <td className="num">{p.jumlahAlternatif}</td>
                  <td className="num">{p.kuota ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
