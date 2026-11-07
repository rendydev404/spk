import { CircleAlert, CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/layout/sidebar";
import { TanpaPeriode } from "@/components/layout/tanpa-periode";
import { Alert, EmptyState, PageHeader } from "@/components/ui/misc";
import { JalankanPanel } from "@/features/perhitungan/components/jalankan-panel";
import { StatusRun } from "@/features/perhitungan/components/status-run";
import { praCek, riwayatRun } from "@/features/perhitungan/queries";
import { getPeriodeKerja } from "@/features/periode/kerja";
import { fmtAngka, fmtWaktu } from "@/lib/format";
import { requireRole } from "@/lib/rbac";
import { LABEL_CAKUPAN } from "@/lib/status";

export const metadata: Metadata = { title: "Perhitungan SAW" };

function Cek({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[13.5px]">
      {ok ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
      ) : (
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      )}
      <span>{children}</span>
    </li>
  );
}

export default async function PerhitunganPage() {
  const u = await requireRole("ADMIN", "KEPSEK");
  const { kerja } = await getPeriodeKerja();
  if (!kerja) return <TanpaPeriode />;
  const [cek, runs] = await Promise.all([praCek(kerja.id), riwayatRun(kerja.id)]);
  const lengkap = cek.belumLengkap.length === 0 && cek.jumlahAlternatif > 0;
  const siap = kerja.status === "PERHITUNGAN" && cek.bobotPas && lengkap && cek.jumlahKriteria > 0;

  return (
    <>
      <PageHeader
        title="Perhitungan metode SAW"
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Periode {kerja.nama} <StatusBadge status={kerja.status} />
          </span>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="panel p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Pra-cek data</h2>
          <ul className="flex flex-col gap-2">
            <Cek ok={kerja.status === "PERHITUNGAN"}>
              Status periode Perhitungan
              {kerja.status !== "PERHITUNGAN"
                ? ` (sekarang ${kerja.status.toLowerCase()}; tutup penilaian di halaman periode)`
                : ""}
            </Cek>
            <Cek ok={cek.jumlahKriteria > 0}>{cek.jumlahKriteria} kriteria</Cek>
            <Cek ok={cek.bobotPas}>Total bobot {fmtAngka(cek.totalBobot)}%</Cek>
            <Cek ok={lengkap}>
              {cek.jumlahAlternatif - cek.belumLengkap.length}/{cek.jumlahAlternatif} alternatif nilainya
              lengkap
            </Cek>
          </ul>
          {cek.belumLengkap.length ? (
            <div className="mt-4">
              <Alert tone="warning" title="Nilai belum lengkap">
                <ul>
                  {cek.belumLengkap.slice(0, 15).map((s) => (
                    <li key={s.kode}>
                      {s.kode} {s.nama} ({s.kelas}): belum ada {s.kurang.join(", ")}
                    </li>
                  ))}
                  {cek.belumLengkap.length > 15 ? <li>dan {cek.belumLengkap.length - 15} lainnya</li> : null}
                </ul>
              </Alert>
            </div>
          ) : null}
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Jalankan perhitungan</h2>
          {u.role === "ADMIN" ? (
            <JalankanPanel
              periodeId={kerja.id}
              cakupanDefault={kerja.cakupanDefault}
              kelompok={cek.kelompok}
              siap={siap}
            />
          ) : (
            <p className="text-[13.5px] text-muted">
              Perhitungan dijalankan oleh admin. Kepala sekolah dapat meninjau setiap riwayat di bawah.
            </p>
          )}
        </section>
      </div>

      <section className="panel mt-5">
        <h2 className="px-5 pb-3 pt-5 text-[15px] font-semibold">Riwayat perhitungan</h2>
        {runs.length === 0 ? (
          <EmptyState
            title="Belum ada perhitungan"
            description="Setiap kali dihitung, hasil dan snapshot kriteria disimpan di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Cakupan</th>
                  <th className="num">Alternatif</th>
                  <th className="num">Durasi hitung</th>
                  <th>Oleh</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link
                        href={`/perhitungan/${r.id}`}
                        className="font-medium hover:text-accent hover:underline"
                      >
                        {fmtWaktu(r.dihitungPada)}
                      </Link>
                    </td>
                    <td>{LABEL_CAKUPAN[r.cakupan]}</td>
                    <td className="num">{r.jumlahSiswa}</td>
                    <td className="num">{r.durasiMs ?? 0} ms</td>
                    <td>{r.oleh ?? "-"}</td>
                    <td>
                      <StatusRun status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
