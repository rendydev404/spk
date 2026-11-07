import { ShieldX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function Terlarang() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="max-w-sm text-center">
        <ShieldX className="mx-auto size-8 text-danger" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold">Akses ditolak</h1>
        <p className="mt-1 text-[13.5px] text-muted">Halaman ini tidak tersedia untuk peran akun Anda.</p>
        <ButtonLink href="/dashboard" className="mt-5">
          Kembali ke dashboard
        </ButtonLink>
      </div>
    </main>
  );
}
