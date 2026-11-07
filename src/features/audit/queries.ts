import "server-only";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, user } from "@/db/schema";

export const PER_HALAMAN_AUDIT = 50;

/** Keyset pagination berdasarkan id (memakai PK), tetap cepat walau data besar. */
export async function daftarAudit(o: {
  sebelum?: number | undefined;
  userId?: string | undefined;
  aksi?: string | undefined;
  dari?: string | undefined;
  sampai?: string | undefined;
}) {
  const rows = await db
    .select({
      id: auditLog.id,
      aksi: auditLog.aksi,
      entitas: auditLog.entitas,
      entitasId: auditLog.entitasId,
      data: auditLog.data,
      createdAt: auditLog.createdAt,
      oleh: user.name,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.userId))
    .where(
      and(
        o.sebelum ? lt(auditLog.id, o.sebelum) : undefined,
        o.userId ? eq(auditLog.userId, o.userId) : undefined,
        o.aksi ? eq(auditLog.aksi, o.aksi) : undefined,
        o.dari ? gte(auditLog.createdAt, sql`${o.dari}::date at time zone 'Asia/Jakarta'`) : undefined,
        o.sampai
          ? lt(auditLog.createdAt, sql`(${o.sampai}::date + 1) at time zone 'Asia/Jakarta'`)
          : undefined,
      ),
    )
    .orderBy(desc(auditLog.id))
    .limit(PER_HALAMAN_AUDIT + 1);
  return { rows: rows.slice(0, PER_HALAMAN_AUDIT), adaLagi: rows.length > PER_HALAMAN_AUDIT };
}

export async function opsiFilterAudit() {
  const [aksi, pengguna] = await Promise.all([
    db.selectDistinct({ aksi: auditLog.aksi }).from(auditLog).orderBy(auditLog.aksi),
    db.select({ id: user.id, name: user.name }).from(user).orderBy(user.name),
  ]);
  return { aksi: aksi.map((a) => a.aksi), pengguna };
}
