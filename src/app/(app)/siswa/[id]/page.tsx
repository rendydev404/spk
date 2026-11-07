import { and, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { db } from "@/db";
import { kelasSiswa } from "@/db/schema";
import { daftarKelas } from "@/features/kelas/queries";
import { getPeriodeKerja } from "@/features/periode/kerja";
import { getSiswa, riwayatSiswa } from "@/features/siswa/queries";
import { fmt4, fmtTanggalPanjang } from "@/lib/format";
import { requireUser } from "@/lib/rbac";

export const metadata: Metadata = { title: "Detail siswa" };

export default async function SiswaDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const u = await requireUser();
  const s = await getSiswa(id);
  if (!s) notFound();
  if (u.role === "WALI_KELAS") {
    // Wali kelas hanya boleh melihat siswa di kelasnya pada periode kerja.
    const { kerja } = await getPeriodeKerja();
    const kelasSaya = kerja ? await daftarKelas(kerja.id, u) : [];
    const ids = kelasSaya.map((k) => k.id);
    const [ok] = ids.length
      ? await db
          .select({ x: kelasSiswa.siswaId })
          .from(kelasSiswa)
          .where(and(eq(kelasSiswa.siswaId, id), inArray(kelasSiswa.kelasId, ids)))
      : [];
    if (!ok) notFound();
  }
  const { kelasRiwayat, hasilRiwayat } = await riwayatSiswa(id);
  return (
    <>
      <PageHeader title={s.nama} description={`NIS ${s.nis}${s.nisn ? ` · NISN ${s.nisn}` : ""}`} />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="panel p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Biodata</h2>
          <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13.5px]">
            <dt className="text-muted">Jenis kelamin</dt>
            <dd>{s.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</dd>
            <dt className="text-muted">Tanggal lahir</dt>
            <dd>{s.tanggalLahir ? fmtTanggalPanjang(s.tanggalLahir) : "-"}</dd>
            <dt className="text-muted">Status</dt>
            <dd>{s.aktif ? <Badge tone="success">Aktif</Badge> : <Badge tone="warning">Nonaktif</Badge>}</dd>
          </dl>
          <h3 className="mb-2 mt-5 text-[13px] font-semibold">Riwayat kelas</h3>
          {kelasRiwayat.length ? (
            <ul className="text-[13.5px]">
              {kelasRiwayat.map((k) => (
                <li
                  key={k.periodeId}
                  className="flex justify-between border-b border-border py-1.5 last:border-0"
                >
                  <span className="text-muted">{k.periode}</span>
                  <span>{k.kelas}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">Belum pernah masuk kelas.</p>
          )}
        </section>
        <section className="panel">
          <h2 className="px-5 pb-3 pt-5 text-[15px] font-semibold">Riwayat hasil seleksi (disahkan)</h2>
          {hasilRiwayat.length === 0 ? (
            <EmptyState title="Belum ada hasil yang disahkan" />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabel">
                <thead>
                  <tr>
                    <th>Periode</th>
                    <th>Kelompok</th>
                    <th className="num">Nilai V</th>
                    <th className="num">Peringkat</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {hasilRiwayat.map((h) => (
                    <tr key={h.runId}>
                      <td>{h.periode}</td>
                      <td>{h.kelompok === "SEKOLAH" ? "Sekolah" : h.kelompok}</td>
                      <td className="num">{fmt4(h.nilai)}</td>
                      <td className="num">{h.peringkat}</td>
                      <td>
                        {h.terpilih ? (
                          <Badge tone="success">Terpilih</Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
