import { count } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Setup awal" };

export default async function SetupPage() {
  // Wajib dinamis: status "sudah ada pengguna" harus dibaca saat request, bukan saat build.
  await connection();
  const [ada] = await db.select({ n: count() }).from(user);
  if ((ada?.n ?? 0) > 0) redirect("/login");
  return (
    <main className="flex min-h-dvh items-start justify-center px-5 py-10 sm:items-center">
      <div className="w-full max-w-2xl">
        <p className="text-[13px] font-semibold text-accent">Setup awal</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Siapkan aplikasi untuk sekolah Anda</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          Isi identitas sekolah dan buat akun admin pertama. Semua bisa diubah lagi nanti di menu Pengaturan
          Sekolah. Halaman ini hanya muncul sekali, saat aplikasi belum punya pengguna.
        </p>
        <div className="panel mt-6 p-5 sm:p-6">
          <SetupForm />
        </div>
      </div>
    </main>
  );
}
