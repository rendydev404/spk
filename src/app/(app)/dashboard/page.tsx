import { ArrowRight, BarChart3, ClipboardList, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/layout/sidebar";
import { ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, PageHeader, ProgressBar, Stat } from "@/components/ui/misc";
import { BarChart } from "@/features/dashboard/bar-chart";
import { ringkasan } from "@/features/dashboard/queries";
import { runUtama } from "@/features/hasil/queries";
import { progresKelas } from "@/features/penilaian/queries";
import { teratasRun } from "@/features/perhitungan/queries";
import { getPeriodeKerja } from "@/features/periode/kerja";
import { fmtAngka } from "@/lib/format";
import { requireUser } from "@/lib/rbac";
import { LABEL_STATUS } from "@/lib/status";

export const metadata: Metadata = { title: "Dashboard" };

const LANGKAH: Record<string, { teks: string; href: string; label: string }> = {
  DRAFT: {
    teks: "Lengkapi kelas, kriteria, bobot, dan alternatif, lalu buka penilaian.",
    href: "/periode",
    label: "Atur periode",
  },
  PENILAIAN: {
    teks: "Wali kelas sedang menginput nilai. Tutup penilaian setelah semua lengkap.",
    href: "/penilaian",
    label: "Lihat progres",
  },
  PERHITUNGAN: {
    teks: "Jalankan perhitungan SAW, tinjau hasilnya, lalu ajukan ke kepala sekolah.",
    href: "/perhitungan",
    label: "Ke perhitungan",
  },
  VALIDASI: {
    teks: "Hasil menunggu persetujuan kepala sekolah.",
    href: "/validasi",
    label: "Lihat pengajuan",
  },
  FINAL: { teks: "Hasil sudah disahkan. Laporan siap dicetak.", href: "/laporan", label: "Ke laporan" },
};

export default async function Dashboard() {
  const u = await requireUser();
  const { kerja } = await getPeriodeKerja();
  const wali = u.role === "WALI_KELAS";
  const [r, progres, run] = await Promise.all([
    ringkasan(kerja?.id ?? null),
    kerja ? progresKelas(kerja.id, u) : Promise.resolve([]),
    kerja && (!wali || kerja.status === "FINAL") ? runUtama(kerja.id, !wali) : Promise.resolve(null),
  ]);
  const teratas = run ? await teratasRun(run.id, 10) : [];
  const namaKelasSaya = new Set(progres.map((p) => p.nama));
  const top = wali ? teratas.filter((t) => namaKelasSaya.has(t.kelasNama)) : teratas;
  const totalAlt = progres.reduce((s, p) => s + p.jumlahAlternatif, 0);
  const lengkap = progres.reduce((s, p) => s + p.jumlahLengkap, 0);
  const langkah = kerja ? LANGKAH[kerja.status] : null;

  return (
    <>
      <PageHeader
        title={`Halo, ${u.name.split(",")[0]}`}
        description={
          kerja ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              Periode kerja {kerja.nama} <StatusBadge status={kerja.status} />
            </span>
          ) : (
            "Belum ada periode."
          )
        }
      />

      {u.role === "KEPSEK" && r.pengajuan > 0 ? (
        <div className="mb-5">
          <Alert tone="info" icon={<ShieldCheck />} title={`${r.pengajuan} hasil menunggu validasi Anda`}>
            <Link href="/validasi" className="font-medium text-accent hover:underline">
              Tinjau sekarang
            </Link>
          </Alert>
        </div>
      ) : null}

      {!wali && langkah ? (
        <div className="panel mb-5 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-muted">
              Tahap {LABEL_STATUS[kerja!.status]}
            </p>
            <p className="mt-0.5 text-[14px]">{langkah.teks}</p>
          </div>
          <ButtonLink href={langkah.href} variant="secondary">
            {langkah.label} <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {wali ? (
          <>
            <Stat
              label="Kelas yang diampu"
              value={progres.length}
              sub={progres.map((p) => p.nama).join(", ") || "-"}
            />
            <Stat label="Alternatif di kelas" value={totalAlt} />
            <Stat label="Nilai lengkap" value={`${lengkap}/${totalAlt}`} sub="siswa" />
            <Stat label="Kriteria" value={r.kriteria} />
          </>
        ) : (
          <>
            <Stat label="Siswa aktif" value={fmtAngka(r.siswa_aktif)} />
            <Stat label="Alternatif periode ini" value={fmtAngka(r.alternatif)} sub={`${r.kelas} kelas`} />
            <Stat label="Kriteria" value={r.kriteria} sub={`Total bobot ${fmtAngka(r.total_bobot)}%`} />
            <Stat
              label="Nilai lengkap"
              value={`${lengkap}/${totalAlt}`}
              sub={`${fmtAngka(r.nilai_terisi)} nilai terisi`}
            />
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Progres penilaian per kelas</h2>
            <Link href="/penilaian" className="text-[13px] font-medium text-accent hover:underline">
              {wali && kerja?.status === "PENILAIAN" ? "Input nilai" : "Detail"}
            </Link>
          </div>
          {progres.length === 0 ? (
            <EmptyState
              icon={<ClipboardList />}
              title={wali ? "Anda belum menjadi wali kelas" : "Belum ada kelas"}
            />
          ) : (
            <ul className="flex flex-col gap-3.5">
              {progres.map((p) => (
                <li key={p.id}>
                  <Link href={`/penilaian/${p.id}`} className="group block">
                    <div className="mb-1.5 flex justify-between text-[13px]">
                      <span className="font-medium group-hover:text-accent">{p.nama}</span>
                      <span className="text-muted tabular">
                        {p.jumlahLengkap}/{p.jumlahAlternatif}
                      </span>
                    </div>
                    <ProgressBar
                      value={p.jumlahLengkap}
                      max={p.jumlahAlternatif}
                      label={`Progres ${p.nama}`}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">
              {wali ? "Peringkat siswa kelas Anda" : "10 besar hasil terakhir"}
              {run && run.status !== "DISETUJUI" ? (
                <span className="ml-2 text-xs font-normal text-warning">draf</span>
              ) : null}
            </h2>
            {run ? (
              <Link href="/hasil" className="text-[13px] font-medium text-accent hover:underline">
                Semua hasil
              </Link>
            ) : null}
          </div>
          {top.length === 0 ? (
            <EmptyState
              icon={<BarChart3 />}
              title="Belum ada hasil"
              description={
                wali
                  ? "Hasil tampil setelah disahkan kepala sekolah."
                  : "Hasil muncul setelah perhitungan SAW dijalankan."
              }
            />
          ) : (
            <BarChart
              data={top.map((t) => ({
                label: t.nama,
                sub: `${t.kelasNama}${t.kelompok !== "SEKOLAH" ? ` · ${t.kelompok}` : ""} · peringkat ${t.peringkat}`,
                nilai: Number(t.v),
                sorot: !!kerja?.kuota && t.peringkat <= kerja.kuota,
              }))}
            />
          )}
        </section>
      </div>
    </>
  );
}
