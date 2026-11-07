import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";

export async function opsiWaliKelas() {
  return db
    .select({ id: user.id, name: user.name, username: user.username })
    .from(user)
    .where(and(eq(user.role, "WALI_KELAS"), eq(user.aktif, true)))
    .orderBy(asc(user.name));
}
