import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Alert, Badge, PageHeader } from "@/components/ui/misc";
import { SubEditor } from "@/features/kriteria/components/sub-editor";
import { getKriteria } from "@/features/kriteria/queries";
import { getPeriode } from "@/features/periode/queries";
import { requireUser } from "@/lib/rbac";
import { LABEL_TIPE } from "@/lib/status";

export const metadata: Metadata = { title: "Sub-kriteria" };

export default async function SubKriteriaPage({ params }: { params: Promise<{ id: string; kid: string }> }) {
  const { id, kid } = await params;
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(kid).success) notFound();
  const u = await requireUser();
  const [p, k] = await Promise.all([getPeriode(id), getKriteria(kid)]);
  if (!p || !k || k.periodeId !== id) notFound();
  const bisaUbah = u.role === "ADMIN" && p.status === "DRAFT";
  return (
    <>
      <PageHeader
        title={`${k.kode} · ${k.nama}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Link href={`/periode/${id}/kriteria`} className="text-accent hover:underline">
              Kriteria periode {p.nama}
            </Link>
            <Badge tone={k.jenis === "BENEFIT" ? "info" : "warning"}>
              {k.jenis === "BENEFIT" ? "Benefit" : "Cost"}
            </Badge>
            <Badge>{LABEL_TIPE[k.tipeInput]}</Badge>
          </span>
        }
      />
      {k.tipeInput === "ANGKA" ? (
        <Alert tone="info">
          Kriteria bertipe Angka tidak memakai sub-kriteria. Nilai yang diinput langsung dipakai.
        </Alert>
      ) : (
        <>
          <p className="mb-4 max-w-3xl text-[13.5px] text-muted">
            {k.tipeInput === "RENTANG"
              ? "Angka mentah dikonversi ke nilai skala berdasarkan rentang di bawah. Batas bawah dan atas bersifat inklusif; kosongkan batas atas untuk rentang terakhir yang tak terbatas."
              : "Penilai memilih salah satu label. Nilai skala yang dipakai di matriks keputusan."}
          </p>
          <SubEditor
            kriteriaId={kid}
            tipe={k.tipeInput}
            jenis={k.jenis}
            bisaUbah={bisaUbah}
            awal={k.sub.map((s) => ({
              id: s.id,
              label: s.label,
              nilai: s.nilai,
              batasBawah: s.batasBawah,
              batasAtas: s.batasAtas,
            }))}
          />
        </>
      )}
    </>
  );
}
