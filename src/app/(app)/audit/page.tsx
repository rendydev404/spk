import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { FilterSelect } from "@/components/ui/filter";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { FilterTanggal } from "@/features/audit/components/filter-tanggal";
import { daftarAudit, opsiFilterAudit } from "@/features/audit/queries";
import { fmtWaktu } from "@/lib/format";
import { requireRole } from "@/lib/rbac";

export const metadata: Metadata = { title: "Audit log" };

const tgl = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);
const schema = z.object({
  sebelum: z.coerce.number().int().positive().optional().catch(undefined),
  user: z.string().max(64).optional(),
  aksi: z.string().max(64).optional(),
  dari: tgl,
  sampai: tgl,
});

function ringkas(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const s = JSON.stringify(data);
  return s.length > 140 ? `${s.slice(0, 140)}...` : s;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireRole("ADMIN", "KEPSEK");
  const sp = schema.parse(await searchParams);
  const [{ rows, adaLagi }, opsi] = await Promise.all([
    daftarAudit({ sebelum: sp.sebelum, userId: sp.user, aksi: sp.aksi, dari: sp.dari, sampai: sp.sampai }),
    opsiFilterAudit(),
  ]);
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({
      user: sp.user,
      aksi: sp.aksi,
      dari: sp.dari,
      sampai: sp.sampai,
      ...extra,
    }))
      if (v) p.set(k, v);
    return `/audit?${p}`;
  };
  return (
    <>
      <PageHeader
        title="Audit log"
        description="Jejak perubahan data penting: nilai, bobot, status periode, pengguna, dan validasi."
      />
      <div className="panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <FilterSelect
            param="user"
            label="Pengguna"
            options={opsi.pengguna.map((p) => ({ value: p.id, label: p.name }))}
          />
          <FilterSelect
            param="aksi"
            label="Aksi"
            options={opsi.aksi.map((a) => ({ value: a, label: a }))}
            className="sm:w-64"
          />
          <FilterTanggal />
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={<History />} title="Tidak ada catatan" />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Pengguna</th>
                  <th>Aksi</th>
                  <th>Entitas</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap tabular">{fmtWaktu(r.createdAt)}</td>
                    <td>{r.oleh ?? <span className="text-muted">sistem</span>}</td>
                    <td>
                      <code className="text-[12px]">{r.aksi}</code>
                    </td>
                    <td className="text-muted">{r.entitas}</td>
                    <td
                      className="max-w-md truncate font-mono text-[11.5px] text-muted"
                      title={JSON.stringify(r.data)}
                    >
                      {ringkas(r.data)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <nav
          aria-label="Halaman"
          className="flex justify-between gap-2 border-t border-border px-4 py-3 text-[13px]"
        >
          {sp.sebelum ? (
            <Link href={qs({})} className="font-medium text-accent hover:underline">
              Ke terbaru
            </Link>
          ) : (
            <span />
          )}
          {adaLagi ? (
            <Link
              href={qs({ sebelum: String(rows[rows.length - 1]?.id) })}
              className="font-medium text-accent hover:underline"
            >
              Lebih lama
            </Link>
          ) : null}
        </nav>
      </div>
    </>
  );
}
