import { BarChart3, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/layout/sidebar";
import { TanpaPeriode } from "@/components/layout/tanpa-periode";
import { ButtonLink } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter";
import { Alert, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { DetailSiswa } from "@/features/hasil/components/detail-siswa";
import { runUtama } from "@/features/hasil/queries";
import { daftarKelas } from "@/features/kelas/queries";
import { StatusRun } from "@/features/perhitungan/components/status-run";
import { daftarKelompokRun, getRun, hasilKelompok } from "@/features/perhitungan/queries";
import { getPeriodeKerja } from "@/features/periode/kerja";
import { fmt4, fmtWaktu } from "@/lib/format";
import { requireUser } from "@/lib/rbac";
import { LABEL_CAKUPAN } from "@/lib/status";

export const metadata: Metadata = { title: "Hasil perangkingan" };

const label = (g: string) => (g === "SEKOLAH" ? "Seluruh sekolah" : g);

export default async function HasilPage({
  searchParams,
}: {
  searchParams: Promise<{ kelompok?: string; kelas?: string }>;
}) {
  const u = await requireUser();
  const { kerja } = await getPeriodeKerja();
  if (!kerja) return <TanpaPeriode />;
  const wali = u.role === "WALI_KELAS";
  // Wali kelas hanya melihat hasil yang sudah disahkan (FINAL).
  const ringkas = wali && kerja.status !== "FINAL" ? null : await runUtama(kerja.id, !wali);
  const header = (
    <PageHeader
      title="Hasil perangkingan"
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          Periode {kerja.nama} <StatusBadge status={kerja.status} />
        </span>
      }
      actions={
        ringkas ? (
          <ButtonLink href={`/laporan/${kerja.id}/cetak`} variant="secondary" prefetch={false}>
            <Printer className="size-4" aria-hidden /> Cetak laporan
          </ButtonLink>
        ) : null
      }
    />
  );
  if (!ringkas) {
    return (
      <>
        {header}
        <div className="panel">
          <EmptyState
            icon={<BarChart3 />}
            title="Hasil belum tersedia"
            description={
              wali
                ? "Hasil tampil setelah disahkan kepala sekolah."
                : "Jalankan perhitungan SAW terlebih dahulu."
            }
            action={
              !wali && u.role === "ADMIN" ? (
                <ButtonLink href="/perhitungan">Ke perhitungan</ButtonLink>
              ) : undefined
            }
          />
        </div>
      </>
    );
  }

  const sp = await searchParams;
  const [run, kelompokList, kelasSaya] = await Promise.all([
    getRun(ringkas.id),
    daftarKelompokRun(ringkas.id),
    wali ? daftarKelas(kerja.id, u) : Promise.resolve([]),
  ]);
  if (!run) return header;
  const namaKelasSaya = new Set(kelasSaya.map((k) => k.nama));
  const kelompok =
    kelompokList.find((k) => k.kelompok === sp.kelompok)?.kelompok ?? kelompokList[0]?.kelompok ?? "SEKOLAH";
  let rows = await hasilKelompok(run.id, kelompok);
  if (wali) rows = rows.filter((r) => namaKelasSaya.has(r.kelasNama));
  const daftarKelasHasil = [...new Set(rows.map((r) => r.kelasNama))].sort((a, b) =>
    a.localeCompare(b, "id", { numeric: true }),
  );
  if (sp.kelas) rows = rows.filter((r) => r.kelasNama === sp.kelas);
  const kuota = kerja.kuota;
  const final = run.status === "DISETUJUI";
  const ks = run.snapshot.kriteria;

  return (
    <>
      {header}
      {!final ? (
        <div className="mb-4">
          <Alert tone="warning" title="Draf, belum disahkan">
            Ini hasil perhitungan {fmtWaktu(run.dihitungPada)} berstatus <StatusRun status={run.status} />.
            Peringkat bisa berubah sampai kepala sekolah menyetujui.
          </Alert>
        </div>
      ) : null}
      <div className="panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          {kelompokList.length > 1 ? (
            <FilterSelect
              param="kelompok"
              label="Kelompok"
              semuaLabel={label(kelompokList[0]!.kelompok)}
              options={kelompokList.slice(1).map((k) => ({ value: k.kelompok, label: label(k.kelompok) }))}
              className="sm:w-64"
            />
          ) : null}
          {daftarKelasHasil.length > 1 ? (
            <FilterSelect
              param="kelas"
              label="Kelas"
              options={daftarKelasHasil.map((k) => ({ value: k, label: k }))}
            />
          ) : null}
          <p className="ml-auto text-[12.5px] text-muted">
            {LABEL_CAKUPAN[run.cakupan]} · {kuota ? `kuota ${kuota} besar per kelompok` : "tanpa kuota"} ·{" "}
            <Link href={`/perhitungan/${run.id}`} className="text-accent hover:underline">
              {u.role === "WALI_KELAS" ? "" : "lihat langkah perhitungan"}
            </Link>
          </p>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="Tidak ada data" />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabel">
              <caption className="sr-only">Peringkat siswa {label(kelompok)}</caption>
              <thead>
                <tr>
                  <th className="num w-24">Peringkat</th>
                  <th className="w-16">Kode</th>
                  <th>Nama siswa</th>
                  <th>Kelas</th>
                  <th className="num">Nilai V</th>
                  <th className="w-[22%]">
                    <span className="sr-only">Grafik nilai</span>
                  </th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const masuk = final ? r.terpilih : !!kuota && r.peringkat <= kuota;
                  return (
                    <tr key={r.siswaId} className={masuk ? "bg-success-soft/40" : undefined}>
                      <td className="num text-[15px] font-semibold">{r.peringkat}</td>
                      <td>
                        <Badge tone="accent">{r.kode}</Badge>
                      </td>
                      <td>
                        <DetailSiswa
                          kriteria={ks}
                          r={{
                            kode: r.kode,
                            nama: r.nama,
                            nis: r.nis,
                            kelasNama: r.kelasNama,
                            peringkat: r.peringkat,
                            v: r.v,
                            terpilih: r.terpilih,
                            nilaiX: r.nilaiX,
                            normalisasi: r.normalisasi,
                          }}
                        />
                      </td>
                      <td>{r.kelasNama}</td>
                      <td className="num font-medium">{fmt4(r.v)}</td>
                      <td>
                        <svg
                          viewBox="0 0 100 8"
                          className="h-2 w-full"
                          preserveAspectRatio="none"
                          aria-hidden
                        >
                          <rect width="100" height="8" rx="2" className="fill-surface-2" />
                          <rect
                            width={Number(r.v) * 100}
                            height="8"
                            rx="2"
                            className={masuk ? "fill-success" : "fill-accent/60"}
                          />
                        </svg>
                      </td>
                      <td>
                        {masuk ? (
                          <Badge tone="success">{final ? "Siswa berprestasi" : "Calon (masuk kuota)"}</Badge>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-border px-4 py-3 text-xs text-muted">
          Nilai seri diurutkan berdasarkan r kriteria berbobot terbesar, lalu nilai mentah{" "}
          {ks[0]?.kode ?? "C1"}, lalu nama (A-Z). Klik nama siswa untuk melihat rincian kontribusi tiap
          kriteria.
        </p>
      </div>
    </>
  );
}
