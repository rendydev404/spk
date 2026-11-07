import "server-only";
import { db, type Tx } from "@/db";
import { auditLog } from "@/db/schema";

export interface EntriAudit {
  userId: string | null;
  aksi: string;
  entitas: string;
  entitasId?: string | null;
  data?: unknown;
}

export async function catatAudit(e: EntriAudit, tx: Tx | typeof db = db) {
  await tx.insert(auditLog).values({
    userId: e.userId,
    aksi: e.aksi,
    entitas: e.entitas,
    entitasId: e.entitasId ?? null,
    data: e.data ?? null,
  });
}
