import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-5">
      <div className="max-w-sm text-center">
        <p className="text-sm font-semibold text-accent">404</p>
        <h1 className="mt-1 text-lg font-semibold">Data tidak ditemukan</h1>
        <p className="mt-1 text-[13.5px] text-muted">Data mungkin sudah dihapus atau alamatnya salah.</p>
        <ButtonLink href="/dashboard" className="mt-5">
          Ke dashboard
        </ButtonLink>
      </div>
    </main>
  );
}
