import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { StatusBadge } from "@/components/layout/sidebar";
import { TanpaPeriode } from "@/components/layout/tanpa-periode";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { KriteriaBarisAksi } from "@/features/kriteria/components/kriteria-baris-aksi";
import { KriteriaDialog } from "@/features/kriteria/components/kriteria-dialog";
import { daftarKriteria } from "@/features/kriteria/queries";
import { getPeriode } from "@/features/periode/queries";
import { fmtAngka } from "@/lib/format";
import { requireUser } from "@/lib/rbac";
import { LABEL_TIPE } from "@/lib/status";

export const metadata: Metadata = { title: "Kriteria" };

export default async function KriteriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "_") return <TanpaPeriode />;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const u = await requireUser();
  const p = await getPeriode(id);
  if (!p) notFound();
  const data = await daftarKriteria(id);
  const bisaUbah = u.role === "ADMIN" && p.status === "DRAFT";
  const nomor = data.map((k) => Number(k.kode.slice(1))).filter(Number.isFinite);
  const kodeBerikut = `C${(nomor.length ? Math.max(...nomor) : 0) + 1}`;

  return (
    <>
      <PageHeader
        title="Kriteria penilaian"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Periode {p.nama} <StatusBadge status={p.status} />
          </span>
        }
        actions={bisaUbah ? <KriteriaDialog periodeId={id} kodeBerikut={kodeBerikut} /> : null}
      />
      {!bisaUbah && u.role === "ADMIN" ? (
        <div className="mb-4">
          <Alert tone="info">Kriteria hanya bisa diubah saat periode berstatus Draf.</Alert>
        </div>
      ) : null}
      <div className="panel overflow-x-auto">
        {data.length === 0 ? (
          <EmptyState icon={<ListChecks />} title="Belum ada kriteria" />
        ) : (
          <table className="tabel">
            <thead>
              <tr>
                <th className="w-16">Kode</th>
                <th>Nama kriteria</th>
                <th>Jenis</th>
                <th>Tipe input</th>
                <th>Rentang nilai</th>
                <th>Sub-kriteria</th>
                <th className="num">Bobot</th>
                {bisaUbah ? <th className="w-40"><span className="sr-only">Aksi</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {data.map((k, i) => (
                <tr key={k.id}>
                  <td className="font-semibold">{k.kode}</td>
                  <td>{k.nama}</td>
                  <td>{k.jenis === "BENEFIT" ? <Badge tone="info">Benefit</Badge> : <Badge tone="warning">Cost</Badge>}</td>
                  <td>{LABEL_TIPE[k.tipeInput]}</td>
                  <td className="tabular">{k.tipeInput === "PILIHAN" ? "-" : `${fmtAngka(k.nilaiMin)} - ${fmtAngka(k.nilaiMax)}`}</td>
                  <td>
                    {k.tipeInput === "ANGKA" ? (
                      <span className="text-muted">Tidak dipakai</span>
                    ) : (
                      <Link href={`/periode/${id}/kriteria/${k.id}`} className="font-medium text-accent hover:underline">
                        {k.jumlahSub} sub-kriteria
                      </Link>
                    )}
                  </td>
                  <td className="num">{fmtAngka(k.bobot)}%</td>
                  {bisaUbah ? (
                    <td>
                      <div className="flex justify-end">
                        <KriteriaDialog
                          periodeId={id}
                          nilai={{ id: k.id, kode: k.kode, nama: k.nama, jenis: k.jenis, tipeInput: k.tipeInput, nilaiMin: k.nilaiMin, nilaiMax: k.nilaiMax }}
                        />
                        <KriteriaBarisAksi id={k.id} kode={k.kode} pertama={i === 0} terakhir={i === data.length - 1} />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">
        Bobot diatur di halaman{" "}
        <Link href={`/periode/${id}/bobot`} className="text-accent hover:underline">
          Bobot Kriteria
        </Link>
        .
      </p>
    </>
  );
}
