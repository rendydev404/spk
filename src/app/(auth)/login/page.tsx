import { count } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getPengaturan } from "@/features/pengaturan/queries";
import { getPengguna } from "@/lib/rbac";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ ke?: string; setup?: string }>;
}) {
  if (await getPengguna()) redirect("/dashboard");
  // Instalasi baru (belum ada pengguna sama sekali): arahkan ke setup awal.
  const [jumlah] = await db.select({ n: count() }).from(user);
  if ((jumlah?.n ?? 0) === 0) redirect("/setup");
  const sekolah = await getPengaturan();
  const { ke, setup } = await searchParams;
  // hanya path internal untuk mencegah open redirect
  const tujuan = ke?.startsWith("/") && !ke.startsWith("//") ? ke : "/dashboard";
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_minmax(440px,40%)]">
      <section className="hidden flex-col justify-between bg-accent p-10 text-accent-fg lg:flex">
        <div className="flex items-center gap-2.5 text-[15px] font-semibold">
          <span className="grid size-8 place-items-center rounded-md bg-white/15">
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden
            >
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />
            </svg>
          </span>
          {sekolah.namaSekolah}
        </div>
        <div className="max-w-md">
          <p className="text-[28px] font-semibold leading-tight tracking-tight">
            Seleksi {sekolah.judulSeleksi.toLowerCase()} yang bisa ditelusuri, dari nilai mentah sampai
            keputusan akhir.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed opacity-80">
            Penilaian multikriteria dengan metode Simple Additive Weighting. Setiap langkah perhitungan
            tersimpan dan divalidasi kepala sekolah.
          </p>
        </div>
        <p className="text-xs opacity-60">Hanya untuk pengguna terdaftar di sekolah.</p>
      </section>
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight">Masuk</h1>
          <p className="mt-1 text-[13.5px] text-muted">Gunakan akun yang dibuat oleh admin sekolah.</p>
          {setup ? (
            <p
              role="status"
              className="mt-4 rounded-md border border-success/30 bg-success-soft px-3 py-2.5 text-[13px]"
            >
              Setup selesai. Masuk dengan akun admin yang baru dibuat.
            </p>
          ) : null}
          <LoginForm tujuan={tujuan} />
        </div>
      </section>
    </main>
  );
}
