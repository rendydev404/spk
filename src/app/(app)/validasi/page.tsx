import { desc, eq } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { db } from "@/db";
import { perhitungan, periode, user, validasi } from "@/db/schema";
import { ValidasiAksi } from "@/features/hasil/components/validasi-aksi";
import { teratasRun } from "@/features/perhitungan/queries";
import { fmt4, fmtWaktu } from "@/lib/format";
import { requireRole } from "@/lib/rbac";
import { LABEL_CAKUPAN } from "@/lib/status";

export const metadata: Metadata = { title: "Validasi hasil" };

export default async function ValidasiPage() {
  const u = await requireRole("KEPSEK", "ADMIN");
  const [pengajuan, riwayat] = await Promise.all([
    db
      .select({
        id: perhitungan.id,
        periodeNama: periode.nama,
        kuota: periode.kuota,
        cakupan: perhitungan.cakupan,
        jumlah: perhitungan.jumlahSiswa,
        dihitungPada: perhitungan.dihitungPada,
        oleh: user.name,
      })
      .from(perhitungan)
      .innerJoin(periode, eq(periode.id, perhitungan.periodeId))
      .leftJoin(user, eq(user.id, perhitungan.dihitungOleh))
      .where(eq(perhitungan.status, "DIAJUKAN"))
      .orderBy(desc(perhitungan.dihitungPada)),
    db
      .select({
        id: validasi.id,
        runId: validasi.perhitunganId,
        keputusan: validasi.keputusan,
        catatan: validasi.catatan,
        createdAt: validasi.createdAt,
        oleh: user.name,
        periodeNama: periode.nama,
      })
      .from(validasi)
      .innerJoin(perhitungan, eq(perhitungan.id, validasi.perhitunganId))
      .innerJoin(periode, eq(periode.id, perhitungan.periodeId))
      .leftJoin(user, eq(user.id, validasi.kepsekId))
      .orderBy(desc(validasi.createdAt))
      .limit(20),
  ]);
  const teratas = await Promise.all(pengajuan.map((p) => teratasRun(p.id, 5)));

  return (
    <>
      <PageHeader
        title="Validasi hasil"
        description="Kepala sekolah meninjau hasil perhitungan yang diajukan admin, lalu menyetujui atau menolak dengan catatan."
      />
      <section className="flex flex-col gap-4">
        {pengajuan.length === 0 ? (
          <div className="panel">
            <EmptyState
              icon={<ShieldCheck />}
              title="Tidak ada pengajuan"
              description="Belum ada hasil yang menunggu validasi."
            />
          </div>
        ) : (
          pengajuan.map((p, i) => (
            <article key={p.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold">Periode {p.periodeNama}</h2>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {LABEL_CAKUPAN[p.cakupan]} · {p.jumlah} alternatif · dihitung {fmtWaktu(p.dihitungPada)}{" "}
                    oleh {p.oleh ?? "-"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {u.role === "KEPSEK" ? <ValidasiAksi runId={p.id} kuota={p.kuota} /> : null}
                </div>
              </div>
              {teratas[i]?.length ? (
                <ol className="mt-4 grid gap-1 text-[13.5px] sm:grid-cols-2 lg:grid-cols-5">
                  {teratas[i]!.map((r) => (
                    <li key={r.siswaId} className="rounded-sm border border-border px-3 py-2">
                      <span className="font-semibold">#{r.peringkat}</span> {r.nama}
                      <span className="block text-xs text-muted tabular">
                        {r.kelasNama} · V {fmt4(r.v)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
              <Link
                href={`/perhitungan/${p.id}`}
                className="mt-4 inline-block text-[13px] font-medium text-accent hover:underline"
              >
                Tinjau langkah perhitungan lengkap
              </Link>
            </article>
          ))
        )}
      </section>

      <section className="panel mt-6">
        <h2 className="px-5 pb-3 pt-5 text-[15px] font-semibold">Riwayat keputusan</h2>
        {riwayat.length === 0 ? (
          <EmptyState title="Belum ada keputusan" />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Periode</th>
                  <th>Keputusan</th>
                  <th>Catatan</th>
                  <th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">
                      <Link href={`/perhitungan/${r.runId}`} className="hover:text-accent hover:underline">
                        {fmtWaktu(r.createdAt)}
                      </Link>
                    </td>
                    <td>{r.periodeNama}</td>
                    <td>
                      {r.keputusan === "DISETUJUI" ? (
                        <span className="font-medium text-success">Disetujui</span>
                      ) : (
                        <span className="font-medium text-danger">Ditolak</span>
                      )}
                    </td>
                    <td className="max-w-md text-muted">{r.catatan ?? "-"}</td>
                    <td>{r.oleh ?? "-"}</td>
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
