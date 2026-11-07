import "server-only";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";

export async function opsiWaliKelas() {
  return db
    .select({ id: user.id, name: user.name, username: user.username })
    .from(user)
    .where(and(eq(user.role, "WALI_KELAS"), eq(user.aktif, true)))
    .orderBy(asc(user.name));
}

export async function daftarPengguna(o: { q?: string | undefined; role?: string | undefined }) {
  const q = o.q?.trim().replace(/[%_\\]/g, "\\$&");
  return db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      aktif: user.aktif,
      wajibGantiPassword: user.wajibGantiPassword,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(
      and(
        q ? or(ilike(user.name, `%${q}%`), ilike(user.username, `%${q}%`)) : undefined,
        o.role === "ADMIN" || o.role === "WALI_KELAS" || o.role === "KEPSEK"
          ? eq(user.role, o.role)
          : undefined,
      ),
    )
    .orderBy(asc(user.role), asc(user.name))
    .limit(500);
}
