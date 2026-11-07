import { desc, sql } from "drizzle-orm";
import { Download, FileText, Printer } from "lucide-react";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/layout/sidebar";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { db } from "@/db";
import { perhitungan, periode } from "@/db/schema";
import { fmtWaktu } from "@/lib/format";
import { requireUser } from "@/lib/rbac";

export const metadata: Metadata = { title: "Laporan hasil seleksi" };

export default async function LaporanPage() {
  const u = await requireUser();
  const wali = u.role === "WALI_KELAS";
  // Run utama per periode (disetujui > diajukan > terbaru) dalam satu query.
  const rows = await db
    .select({
      id: periode.id,
      nama: periode.nama,
      status: periode.status,
      runId: sql<string | null>`r.id`,
      runStatus: sql<"DRAFT" | "DIAJUKAN" | "DISETUJUI" | "DITOLAK" | null>`r.status`,
      runPada: sql<Date | null>`r.dihitung_pada`,
      jumlah: sql<number | null>`r.jumlah_siswa`,
    })
    .from(periode)
    .leftJoin(
      sql`lateral (
        select p.id, p.status, p.dihitung_pada, p.jumlah_siswa from ${perhitungan} p
        where p.periode_id = ${periode.id} ${wali ? sql`and p.status = 'DISETUJUI'` : sql``}
        order by (p.status = 'DISETUJUI') desc, (p.status = 'DIAJUKAN') desc, p.dihitung_pada desc
        limit 1
      ) r`,
      sql`true`,
    )
    .orderBy(desc(periode.tahunAjaran), desc(periode.semester));
  const tampil = rows.filter((r) => r.runId);

  return (
    <>
      <PageHeader
        title="Laporan hasil seleksi"
        description="Laporan berisi kop sekolah, kriteria dan bobot, peringkat per kelompok, dan tanda tangan kepala sekolah. Status Disahkan hanya untuk hasil yang sudah disetujui."
      />
      <div className="panel overflow-x-auto">
        {tampil.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="Belum ada laporan"
            description={
              wali
                ? "Laporan tersedia setelah hasil disahkan."
                : "Jalankan perhitungan untuk menghasilkan laporan."
            }
          />
        ) : (
          <table className="tabel">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Status periode</th>
                <th>Laporan</th>
                <th>Perhitungan</th>
                <th className="w-64">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.nama}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    {r.runStatus === "DISETUJUI" ? (
                      <Badge tone="success">Disahkan</Badge>
                    ) : (
                      <Badge tone="warning">Draf</Badge>
                    )}
                  </td>
                  <td className="text-[13px] text-muted">
                    {r.runPada ? fmtWaktu(r.runPada) : "-"} · {r.jumlah} alternatif
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <ButtonLink href={`/laporan/${r.id}/cetak`} size="sm" variant="secondary">
                        <Printer className="size-4" aria-hidden /> Pratinjau
                      </ButtonLink>
                      <ButtonLink
                        href={`/api/ekspor/hasil/${r.runId}`}
                        size="sm"
                        variant="secondary"
                        prefetch={false}
                      >
                        <Download className="size-4" aria-hidden /> Excel
                      </ButtonLink>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
