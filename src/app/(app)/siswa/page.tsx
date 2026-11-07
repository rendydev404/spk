import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { FilterSelect, SearchBox } from "@/components/ui/filter";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { Pagination } from "@/components/ui/pagination";
import { daftarKelas } from "@/features/kelas/queries";
import { getPeriodeKerja } from "@/features/periode/kerja";
import { HapusSiswa } from "@/features/siswa/components/hapus-siswa";
import { ImporSiswaDialog } from "@/features/siswa/components/impor-dialog";
import { SiswaDialog } from "@/features/siswa/components/siswa-dialog";
import { cariSiswa, PER_HALAMAN } from "@/features/siswa/queries";
import { fmtTanggal } from "@/lib/format";
import { requireUser } from "@/lib/rbac";

export const metadata: Metadata = { title: "Data siswa" };

const paramSchema = z.object({
  q: z.string().max(100).optional(),
  kelas: z
    .union([z.string().uuid(), z.literal("tanpa")])
    .optional()
    .catch(undefined),
  status: z.enum(["aktif", "nonaktif"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
});

export default async function SiswaPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const u = await requireUser();
  const sp = paramSchema.parse(await searchParams);
  const { kerja } = await getPeriodeKerja();
  const kelasSaya = kerja ? await daftarKelas(kerja.id, u) : [];
  // Wali kelas hanya melihat siswa di kelasnya.
  let kelasFilter = sp.kelas;
  if (u.role === "WALI_KELAS") {
    if (!kelasSaya.some((k) => k.id === kelasFilter)) kelasFilter = kelasSaya[0]?.id;
    if (!kelasFilter) {
      return (
        <>
          <PageHeader title="Data siswa" />
          <div className="panel">
            <EmptyState icon={<Users />} title="Anda belum menjadi wali kelas di periode ini" />
          </div>
        </>
      );
    }
  }
  const { rows, total } = await cariSiswa({
    periodeId: kerja?.id ?? null,
    q: sp.q,
    kelasId: kelasFilter,
    status: sp.status,
    page: sp.page,
  });
  const admin = u.role === "ADMIN";
  const totalPages = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const href = (p: number) => {
    const qs = new URLSearchParams();
    if (sp.q) qs.set("q", sp.q);
    if (sp.kelas) qs.set("kelas", sp.kelas);
    if (sp.status) qs.set("status", sp.status);
    qs.set("page", String(p));
    return `/siswa?${qs}`;
  };

  return (
    <>
      <PageHeader
        title="Data siswa"
        description="Data siswa berlaku lintas periode. Kolom kelas mengikuti periode kerja."
        actions={
          admin ? (
            <>
              <ImporSiswaDialog />
              <SiswaDialog />
            </>
          ) : null
        }
      />
      <div className="panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <SearchBox placeholder="Cari nama atau NIS" />
          <FilterSelect
            param="kelas"
            label="Kelas"
            options={[
              ...kelasSaya.map((k) => ({ value: k.id, label: k.nama })),
              ...(u.role !== "WALI_KELAS" ? [{ value: "tanpa", label: "Tanpa kelas" }] : []),
            ]}
          />
          <FilterSelect
            param="status"
            label="Status"
            options={[
              { value: "aktif", label: "Aktif" },
              { value: "nonaktif", label: "Nonaktif" },
            ]}
          />
        </div>
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="Tidak ada siswa"
              description={sp.q ? "Coba kata kunci lain." : undefined}
            />
          ) : (
            <table className="tabel">
              <thead>
                <tr>
                  <th>NIS</th>
                  <th>NISN</th>
                  <th>Nama</th>
                  <th>JK</th>
                  <th>Tanggal lahir</th>
                  <th>Kelas</th>
                  <th>Status</th>
                  {admin ? (
                    <th className="w-20">
                      <span className="sr-only">Aksi</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td className="tabular">{s.nis}</td>
                    <td className="tabular text-muted">{s.nisn ?? "-"}</td>
                    <td>
                      <Link href={`/siswa/${s.id}`} className="font-medium hover:text-accent hover:underline">
                        {s.nama}
                      </Link>
                    </td>
                    <td>{s.jenisKelamin}</td>
                    <td className="tabular">{fmtTanggal(s.tanggalLahir)}</td>
                    <td>{s.kelasNama ?? <span className="text-muted">-</span>}</td>
                    <td>
                      {s.aktif ? <Badge tone="success">Aktif</Badge> : <Badge tone="warning">Nonaktif</Badge>}
                    </td>
                    {admin ? (
                      <td>
                        <div className="flex justify-end">
                          <SiswaDialog
                            nilai={{
                              id: s.id,
                              nis: s.nis,
                              nisn: s.nisn,
                              nama: s.nama,
                              jenisKelamin: s.jenisKelamin,
                              tanggalLahir: s.tanggalLahir,
                              aktif: s.aktif,
                            }}
                          />
                          <HapusSiswa id={s.id} nama={s.nama} />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="border-t border-border">
          <Pagination page={sp.page} totalPages={totalPages} total={total} href={href} />
        </div>
      </div>
    </>
  );
}
