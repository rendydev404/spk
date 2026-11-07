import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { getPeriodeKerja } from "@/features/periode/kerja";
import { getPengaturan } from "@/features/pengaturan/queries";
import { requireUser } from "@/lib/rbac";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const pengguna = await requireUser();
  if (pengguna.wajibGantiPassword) {
    const path = (await headers()).get("x-pathname");
    if (path !== "/akun") redirect("/akun?wajib=1");
  }
  const [{ kerja, semua }, pengaturan] = await Promise.all([getPeriodeKerja(), getPengaturan()]);
  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col lg:flex-row">
        <Sidebar
          pengguna={pengguna}
          periode={semua.map((p) => ({ id: p.id, nama: p.nama, status: p.status }))}
          periodeKerja={kerja ? { id: kerja.id, nama: kerja.nama, status: kerja.status } : null}
          namaSekolah={pengaturan.namaSekolah}
        />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 print:p-0">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
