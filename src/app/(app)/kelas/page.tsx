import { School } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TanpaPeriode } from "@/components/layout/tanpa-periode";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { HapusKelas } from "@/features/kelas/components/hapus-kelas";
import { KelasDialog } from "@/features/kelas/components/kelas-dialog";
import { daftarKelas } from "@/features/kelas/queries";
import { getPeriodeKerja } from "@/features/periode/kerja";
import { opsiWaliKelas } from "@/features/pengguna/queries";
import { requireUser } from "@/lib/rbac";

export const metadata: Metadata = { title: "Kelas" };

export default async function KelasPage() {
  const u = await requireUser();
  const { kerja } = await getPeriodeKerja();
  if (!kerja) return <TanpaPeriode />;
  const admin = u.role === "ADMIN";
  const [data, wali] = await Promise.all([daftarKelas(kerja.id, u), admin ? opsiWaliKelas() : Promise.resolve([])]);
  const bisaTambah = admin && kerja.status === "DRAFT";
  const bisaUbahWali = admin && ["DRAFT", "PENILAIAN", "PERHITUNGAN"].includes(kerja.status);
  return (
    <>
      <PageHeader
        title="Kelas"
        description={`Rombongan belajar periode ${kerja.nama}. Setiap kelas wajib punya wali kelas sebelum penilaian dibuka.`}
        actions={bisaTambah ? <KelasDialog periodeId={kerja.id} wali={wali} /> : null}
      />
      <div className="panel overflow-x-auto">
        {data.length === 0 ? (
          <EmptyState icon={<School />} title="Belum ada kelas" description={u.role === "WALI_KELAS" ? "Anda belum ditugaskan sebagai wali kelas di periode ini." : undefined} />
        ) : (
          <table className="tabel">
            <thead>
              <tr>
                <th>Kelas</th>
                <th>Tingkat</th>
                <th>Wali kelas</th>
                <th className="num">Siswa</th>
                {admin ? <th className="w-24"><span className="sr-only">Aksi</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {data.map((k) => (
                <tr key={k.id}>
                  <td>
                    <Link href={`/kelas/${k.id}`} className="font-medium hover:text-accent hover:underline">
                      {k.nama}
                    </Link>
                  </td>
                  <td className="tabular">{k.tingkat}</td>
                  <td>{k.waliNama ?? <Badge tone="warning">Belum ada</Badge>}</td>
                  <td className="num">{k.jumlahSiswa}</td>
                  {admin ? (
                    <td>
                      <div className="flex justify-end">
                        {bisaUbahWali ? (
                          <KelasDialog
                            periodeId={kerja.id}
                            wali={wali}
                            hanyaWali={kerja.status !== "DRAFT"}
                            nilai={{ id: k.id, nama: k.nama, tingkat: k.tingkat, waliKelasId: k.waliKelasId }}
                          />
                        ) : null}
                        {bisaTambah ? <HapusKelas id={k.id} nama={k.nama} jumlah={k.jumlahSiswa} /> : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
