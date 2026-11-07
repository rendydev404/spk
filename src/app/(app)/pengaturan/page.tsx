import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { PengaturanForm } from "@/features/pengaturan/components/pengaturan-form";
import { getPengaturan } from "@/features/pengaturan/queries";
import { requireRole } from "@/lib/rbac";

export const metadata: Metadata = { title: "Pengaturan sekolah" };

export default async function PengaturanPage() {
  await requireRole("ADMIN");
  const p = await getPengaturan();
  return (
    <>
      <PageHeader
        title="Pengaturan sekolah"
        description="Profil sekolah, nama seleksi, dan penandatangan laporan. Semua bisa disesuaikan dengan kebutuhan sekolah."
      />
      <div className="panel max-w-3xl p-5">
        <PengaturanForm
          nilai={{
            namaSekolah: p.namaSekolah,
            alamat: p.alamat,
            kota: p.kota,
            namaKepsek: p.namaKepsek,
            nipKepsek: p.nipKepsek,
            logoUrl: p.logoUrl,
            jenjang: p.jenjang,
            npsn: p.npsn,
            telepon: p.telepon,
            email: p.email,
            website: p.website,
            jabatanPenandatangan: p.jabatanPenandatangan,
            labelNomorInduk: p.labelNomorInduk,
            judulSeleksi: p.judulSeleksi,
          }}
        />
      </div>
    </>
  );
}
