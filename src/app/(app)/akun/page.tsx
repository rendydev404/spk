import type { Metadata } from "next";
import { Alert, PageHeader } from "@/components/ui/misc";
import { GantiPasswordForm, NamaForm } from "@/features/pengguna/components/akun-form";
import { requireUser } from "@/lib/rbac";
import { LABEL_ROLE } from "@/lib/status";

export const metadata: Metadata = { title: "Akun saya" };

export default async function AkunPage() {
  const u = await requireUser();
  return (
    <>
      <PageHeader title="Akun saya" description={`${u.username} · ${LABEL_ROLE[u.role]}`} />
      {u.wajibGantiPassword ? (
        <div className="mb-5">
          <Alert tone="warning" title="Ganti password terlebih dahulu">
            Akun Anda memakai password sementara. Ganti password untuk melanjutkan.
          </Alert>
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Ganti password</h2>
          <GantiPasswordForm wajib={u.wajibGantiPassword} />
        </section>
        {!u.wajibGantiPassword ? (
          <section className="panel p-5">
            <h2 className="mb-4 text-[15px] font-semibold">Profil</h2>
            <NamaForm nama={u.name} />
          </section>
        ) : null}
      </div>
    </>
  );
}
