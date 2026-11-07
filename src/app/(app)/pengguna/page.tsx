import { UserCog } from "lucide-react";
import type { Metadata } from "next";
import { FilterSelect, SearchBox } from "@/components/ui/filter";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { ImporPengguna } from "@/features/pengguna/components/impor-pengguna";
import { PenggunaAksi } from "@/features/pengguna/components/pengguna-aksi";
import { PenggunaDialog } from "@/features/pengguna/components/pengguna-dialog";
import { daftarPengguna } from "@/features/pengguna/queries";
import { fmtTanggal } from "@/lib/format";
import { requireRole } from "@/lib/rbac";
import { LABEL_ROLE } from "@/lib/status";

export const metadata: Metadata = { title: "Pengguna" };

export default async function PenggunaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const u = await requireRole("ADMIN");
  const sp = await searchParams;
  const data = await daftarPengguna({ q: sp.q?.slice(0, 100), role: sp.role });
  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Akun dibuat oleh admin; tidak ada pendaftaran mandiri."
        actions={
          <>
            <ImporPengguna />
            <PenggunaDialog />
          </>
        }
      />
      <div className="panel">
        <div className="flex flex-wrap gap-2 border-b border-border p-3">
          <SearchBox placeholder="Cari nama atau username" />
          <FilterSelect
            param="role"
            label="Peran"
            options={Object.entries(LABEL_ROLE).map(([value, label]) => ({ value, label }))}
          />
        </div>
        {data.length === 0 ? (
          <EmptyState icon={<UserCog />} title="Tidak ada pengguna" />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabel">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Username</th>
                  <th>Peran</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th className="w-24">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">
                      {p.name} {p.id === u.id ? <Badge>Anda</Badge> : null}
                    </td>
                    <td className="text-muted">{p.username}</td>
                    <td>{LABEL_ROLE[p.role]}</td>
                    <td className="space-x-1">
                      {p.aktif ? <Badge tone="success">Aktif</Badge> : <Badge tone="warning">Nonaktif</Badge>}
                      {p.wajibGantiPassword ? <Badge tone="info">Wajib ganti password</Badge> : null}
                    </td>
                    <td className="tabular">{fmtTanggal(p.createdAt)}</td>
                    <td>
                      <div className="flex justify-end">
                        <PenggunaDialog
                          nilai={{
                            id: p.id,
                            name: p.name,
                            username: p.username,
                            email: p.email,
                            role: p.role,
                          }}
                        />
                        <PenggunaAksi id={p.id} nama={p.name} aktif={p.aktif} diriSendiri={p.id === u.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
