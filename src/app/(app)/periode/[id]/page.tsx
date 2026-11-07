import { CircleCheck, CircleDashed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { StatusBadge } from "@/components/layout/sidebar";
import { Alert, PageHeader } from "@/components/ui/misc";
import { UbahPeriodeForm } from "@/features/periode/components/periode-form";
import { StatusAksi } from "@/features/periode/components/status-aksi";
import { cekSyaratPenilaian } from "@/features/periode/guard";
import { getPeriode, ringkasPeriode } from "@/features/periode/queries";
import { requireUser } from "@/lib/rbac";
import { LABEL_STATUS, type StatusPeriode } from "@/lib/status";

export const metadata: Metadata = { title: "Detail periode" };

const ALUR: StatusPeriode[] = ["DRAFT", "PENILAIAN", "PERHITUNGAN", "VALIDASI", "FINAL"];
const KET: Record<StatusPeriode, string> = {
  DRAFT: "Atur kelas, kriteria, bobot, alternatif",
  PENILAIAN: "Wali kelas menginput nilai",
  PERHITUNGAN: "Admin menjalankan SAW",
  VALIDASI: "Kepala sekolah meninjau",
  FINAL: "Hasil resmi, laporan disahkan",
};

export default async function DetailPeriode({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const u = await requireUser();
  const p = await getPeriode(id);
  if (!p) notFound();
  const [ringkas, masalah] = await Promise.all([
    ringkasPeriode(id),
    p.status === "DRAFT" ? cekSyaratPenilaian(id) : Promise.resolve([]),
  ]);
  const idx = ALUR.indexOf(p.status);
  const admin = u.role === "ADMIN";

  return (
    <>
      <PageHeader
        title={`Periode ${p.nama}`}
        description={<StatusBadge status={p.status} />}
        actions={
          admin ? (
            <StatusAksi
              id={p.id}
              status={p.status}
              bisaHapus={p.status === "DRAFT" && ringkas.jumlahNilai === 0}
            />
          ) : null
        }
      />

      <ol
        className="panel mb-5 grid gap-px overflow-hidden bg-border sm:grid-cols-5"
        aria-label="Tahapan periode"
      >
        {ALUR.map((s, i) => (
          <li key={s} className="bg-surface px-4 py-3" aria-current={i === idx ? "step" : undefined}>
            <div className="flex items-center gap-1.5 text-[13px] font-medium">
              {i < idx ? (
                <CircleCheck className="size-4 text-success" aria-hidden />
              ) : (
                <CircleDashed
                  className={i === idx ? "size-4 text-accent" : "size-4 text-muted"}
                  aria-hidden
                />
              )}
              <span className={i === idx ? "text-accent" : i > idx ? "text-muted" : ""}>
                {LABEL_STATUS[s]}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">{KET[s]}</p>
          </li>
        ))}
      </ol>

      {p.status === "DRAFT" ? (
        <div className="mb-5">
          {masalah.length ? (
            <Alert tone="warning" title="Syarat membuka penilaian belum lengkap">
              <ul>
                {masalah.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </Alert>
          ) : (
            <Alert tone="success" title="Semua syarat terpenuhi. Penilaian siap dibuka." />
          )}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="panel p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Pengaturan periode</h2>
          {admin && p.status !== "FINAL" && p.status !== "VALIDASI" ? (
            <UbahPeriodeForm
              id={p.id}
              identitasTerkunci={p.status !== "DRAFT"}
              nilai={{
                tahunAjaran: p.tahunAjaran,
                semester: p.semester,
                kuota: p.kuota,
                cakupanDefault: p.cakupanDefault,
              }}
            />
          ) : (
            <dl className="grid grid-cols-2 gap-3 text-[13.5px]">
              <dt className="text-muted">Tahun ajaran</dt>
              <dd>{p.tahunAjaran}</dd>
              <dt className="text-muted">Semester</dt>
              <dd>{p.semester === "GANJIL" ? "Ganjil" : "Genap"}</dd>
              <dt className="text-muted">Kuota</dt>
              <dd>{p.kuota ?? "-"}</dd>
            </dl>
          )}
        </section>
        <aside className="panel p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Pintasan</h2>
          <ul className="flex flex-col gap-1 text-[13.5px]">
            {[
              [`/periode/${p.id}/kriteria`, "Kriteria dan sub-kriteria"],
              [`/periode/${p.id}/bobot`, "Bobot kriteria"],
              ["/kelas", "Kelas dan wali kelas"],
              ["/alternatif", "Data alternatif"],
              ["/penilaian", `Penilaian (${ringkas.jumlahNilai} nilai)`],
              ["/perhitungan", `Perhitungan (${ringkas.jumlahRun} run)`],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href as string} className="block rounded-sm px-2 py-1.5 hover:bg-surface-2">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Halaman kelas, alternatif, dan penilaian memakai periode kerja di sidebar.
          </p>
        </aside>
      </div>
    </>
  );
}
