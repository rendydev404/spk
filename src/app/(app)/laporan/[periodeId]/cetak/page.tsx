import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { EmptyState } from "@/components/ui/misc";
import { TombolCetak } from "@/features/laporan/components/tombol-cetak";
import { dataLaporan } from "@/features/laporan/data";
import { getPengaturan } from "@/features/pengaturan/queries";
import { fmt4, fmtAngka, fmtTanggalPanjang } from "@/lib/format";
import { requireUser } from "@/lib/rbac";
import { LABEL_CAKUPAN } from "@/lib/status";

export const metadata: Metadata = { title: "Cetak laporan" };

const label = (g: string) => (g === "SEKOLAH" ? "Seluruh sekolah" : g);

export default async function CetakPage({
  params,
  searchParams,
}: {
  params: Promise<{ periodeId: string }>;
  searchParams: Promise<{ lampiran?: string }>;
}) {
  const { periodeId } = await params;
  if (!z.string().uuid().safeParse(periodeId).success) notFound();
  const u = await requireUser();
  const lampiran = (await searchParams).lampiran === "1";
  const [data, sekolah] = await Promise.all([dataLaporan(periodeId, u), getPengaturan()]);
  if (!data) notFound();
  if (!data.run) {
    return (
      <div className="panel">
        <EmptyState
          title="Laporan belum tersedia"
          description="Belum ada hasil perhitungan yang bisa dilaporkan untuk periode ini."
        />
      </div>
    );
  }
  const { periode, run, rows, disahkan } = data;
  const ks = run.snapshot.kriteria;
  const kelompok = [...new Set(rows.map((r) => r.kelompok))].sort((a, b) =>
    a.localeCompare(b, "id", { numeric: true }),
  );
  const tanggal = fmtTanggalPanjang(new Date());

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-[13.5px] text-muted">
          Pratinjau A4. Gunakan Cetak lalu pilih "Simpan sebagai PDF" untuk membuat file PDF.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href={`?lampiran=${lampiran ? "0" : "1"}`}
            className="text-[13px] font-medium text-accent hover:underline"
            replace
            scroll={false}
          >
            {lampiran ? "Tanpa lampiran matriks" : "Sertakan lampiran matriks X dan R"}
          </Link>
          <TombolCetak />
        </div>
      </div>

      <article className="laporan mx-auto max-w-[210mm] bg-white px-[16mm] py-[14mm] text-[11.5pt] leading-snug text-black shadow-pop print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-center gap-4 border-b-[3px] border-double border-black pb-3">
          {sekolah.logoUrl ? (
            // biome-ignore lint/performance/noImgElement: logo berupa data URL dari pengaturan, ukuran kecil
            <img src={sekolah.logoUrl} alt="" className="size-[22mm] object-contain" />
          ) : null}
          <div className="flex-1 text-center">
            <p className="text-[15pt] font-bold uppercase tracking-wide">{sekolah.namaSekolah}</p>
            <p className="text-[10.5pt]">
              {sekolah.alamat}
              {sekolah.kota ? `, ${sekolah.kota}` : ""}
            </p>
          </div>
          {sekolah.logoUrl ? <div className="size-[22mm]" /> : null}
        </header>

        <div className="mt-5 text-center">
          <h1 className="text-[13pt] font-bold uppercase">Hasil Seleksi Siswa Berprestasi</h1>
          <p>
            Periode {periode.nama} · Metode Simple Additive Weighting (SAW) · {LABEL_CAKUPAN[run.cakupan]}
          </p>
          <p className="mt-1 inline-block border border-black px-2 text-[10pt] font-semibold uppercase">
            {disahkan ? "Disahkan" : "Draf, belum disahkan"}
          </p>
        </div>

        <section className="mt-5">
          <h2 className="mb-1.5 font-bold">A. Kriteria dan bobot</h2>
          <table className="cetak-tabel">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Kriteria</th>
                <th>Jenis</th>
                <th className="r">Bobot</th>
              </tr>
            </thead>
            <tbody>
              {ks.map((k) => (
                <tr key={k.id}>
                  <td>{k.kode}</td>
                  <td>{k.nama}</td>
                  <td>{k.jenis === "BENEFIT" ? "Benefit" : "Cost"}</td>
                  <td className="r">{fmtAngka(k.bobot)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {kelompok.map((g, gi) => (
          <section key={g} className={gi > 0 ? "mt-6 break-before-page" : "mt-6"}>
            <h2 className="mb-1.5 font-bold">
              {gi === 0 ? "B. " : ""}Peringkat {label(g)}
            </h2>
            <table className="cetak-tabel">
              <thead>
                <tr>
                  <th className="r">No</th>
                  <th>NIS</th>
                  <th>Nama</th>
                  <th>Kelas</th>
                  <th className="r">Nilai V</th>
                  <th className="r">Peringkat</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) => r.kelompok === g)
                  .map((r, i) => (
                    <tr key={r.siswaId} className={r.terpilih ? "font-semibold" : undefined}>
                      <td className="r">{i + 1}</td>
                      <td>{r.nis}</td>
                      <td>{r.nama}</td>
                      <td>{r.kelasNama}</td>
                      <td className="r">{fmt4(r.v)}</td>
                      <td className="r">{r.peringkat}</td>
                      <td>{r.terpilih ? (disahkan ? "Siswa berprestasi" : "Calon") : ""}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        ))}

        {lampiran ? (
          <section className="mt-6 break-before-page">
            <h2 className="mb-1.5 font-bold">Lampiran: matriks keputusan X dan normalisasi R</h2>
            {kelompok.map((g) => (
              <div key={g} className="mb-4">
                <p className="mb-1 text-[10.5pt] font-semibold">{label(g)}</p>
                <table className="cetak-tabel text-[9.5pt]">
                  <thead>
                    <tr>
                      <th>Alt.</th>
                      {ks.map((k) => (
                        <th key={`x${k.id}`} className="r">
                          X {k.kode}
                        </th>
                      ))}
                      {ks.map((k) => (
                        <th key={`r${k.id}`} className="r">
                          R {k.kode}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .filter((r) => r.kelompok === g)
                      .sort((a, b) => a.kode.localeCompare(b.kode, "id", { numeric: true }))
                      .map((r) => (
                        <tr key={r.siswaId}>
                          <td>{r.kode}</td>
                          {ks.map((k) => (
                            <td key={`x${k.id}`} className="r">
                              {fmtAngka(r.nilaiX[k.id])}
                            </td>
                          ))}
                          {ks.map((k) => (
                            <td key={`r${k.id}`} className="r">
                              {fmt4(r.normalisasi[k.id] ?? 0)}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        ) : null}

        <footer className="mt-10 flex justify-end break-inside-avoid">
          <div className="w-[70mm] text-center">
            <p>
              {sekolah.kota || "........"}, {tanggal}
            </p>
            <p>Kepala Sekolah</p>
            <div className="h-[22mm]" />
            <p className="font-semibold underline">
              {sekolah.namaKepsek || "...................................."}
            </p>
            <p>NIP {sekolah.nipKepsek || "..................."}</p>
          </div>
        </footer>
      </article>
    </>
  );
}
