import "server-only";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { kelas } from "@/db/schema";
import { auth } from "./auth";

export type Role = "ADMIN" | "WALI_KELAS" | "KEPSEK";

export interface Pengguna {
  id: string;
  name: string;
  username: string;
  role: Role;
  wajibGantiPassword: boolean;
}

export class AksesDitolak extends Error {
  constructor(pesan = "Anda tidak memiliki akses untuk aksi ini") {
    super(pesan);
    this.name = "AksesDitolak";
  }
}

/** Sesi saat ini, di-dedupe per request. */
export const getPengguna = cache(async (): Promise<Pengguna | null> => {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as typeof s.user & {
    role?: Role;
    aktif?: boolean;
    username?: string;
    wajibGantiPassword?: boolean;
  };
  if (u.aktif === false) return null;
  return {
    id: u.id,
    name: u.name,
    username: u.username ?? "",
    role: u.role ?? "WALI_KELAS",
    wajibGantiPassword: u.wajibGantiPassword === true,
  };
});

export async function requireUser(): Promise<Pengguna> {
  const p = await getPengguna();
  if (!p) redirect("/login");
  return p;
}

/** Untuk halaman dan aksi: pengguna di luar role diarahkan ke halaman akses ditolak. */
export async function requireRole(...roles: Role[]): Promise<Pengguna> {
  const p = await requireUser();
  if (!roles.includes(p.role)) redirect("/terlarang");
  return p;
}

/**
 * Admin dan Kepsek boleh mengakses semua kelas (Kepsek hanya baca, dicek oleh pemanggil).
 * Wali kelas hanya kelas yang diampunya; dicek di SQL.
 */
export async function requireKelasAccess(kelasId: string): Promise<Pengguna> {
  const p = await requireUser();
  if (p.role !== "WALI_KELAS") return p;
  const [row] = await db
    .select({ id: kelas.id })
    .from(kelas)
    .where(and(eq(kelas.id, kelasId), eq(kelas.waliKelasId, p.id)));
  if (!row) throw new AksesDitolak("Kelas ini bukan kelas yang Anda ampu");
  return p;
}
