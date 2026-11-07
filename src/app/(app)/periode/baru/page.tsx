import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { BuatPeriodeForm } from "@/features/periode/components/periode-form";
import { daftarPeriode } from "@/features/periode/queries";
import { requireRole } from "@/lib/rbac";

export const metadata: Metadata = { title: "Periode baru" };

export default async function PeriodeBaru() {
  await requireRole("ADMIN");
  const lain = await daftarPeriode();
  return (
    <>
      <PageHeader title="Periode baru" description="Periode baru dimulai dengan status Draf." />
      <div className="panel max-w-3xl p-5">
        <BuatPeriodeForm periodeLain={lain.map((p) => ({ id: p.id, nama: p.nama }))} />
      </div>
    </>
  );
}
