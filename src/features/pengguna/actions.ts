"use server";

import { hashPassword } from "better-auth/crypto";
import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { account, session, user } from "@/db/schema";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { requireRole, requireUser } from "@/lib/rbac";

const penggunaSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username minimal 3 karakter")
    .max(32)
    .regex(/^[a-z0-9._]+$/, "Username hanya huruf kecil, angka, titik, garis bawah"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().email("Email tidak valid").nullable()),
  role: z.enum(["ADMIN", "WALI_KELAS", "KEPSEK"], { message: "Pilih peran" }),
});

/** Password sementara yang mudah dibacakan: 3 kelompok huruf/angka tanpa karakter mirip. */
function passwordSementara() {
  const abjad = "abcdefghjkmnpqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(12));
  const s = [...b].map((x) => abjad[x % abjad.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

async function jumlahAdminAktifLain(kecuali: string) {
  const [r] = await db
    .select({ n: count() })
    .from(user)
    .where(and(eq(user.role, "ADMIN"), eq(user.aktif, true), ne(user.id, kecuali)));
  return r?.n ?? 0;
}

export async function simpanPengguna(
  id: string | null,
  _: unknown,
  fd: FormData,
): Promise<HasilAksi<{ password?: string }>> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const d = penggunaSchema.parse(Object.fromEntries(fd));
    if (id) {
      if (id === u.id && d.role !== "ADMIN")
        throw new GalatBisnis("Anda tidak bisa mengubah peran akun sendiri");
      await db
        .update(user)
        .set({
          name: d.name,
          username: d.username,
          displayUsername: d.username,
          email: d.email ?? `${d.username}@spk.local`,
          role: d.role,
        })
        .where(eq(user.id, id));
      await catatAudit({
        userId: u.id,
        aksi: "PENGGUNA_UBAH",
        entitas: "user",
        entitasId: id,
        data: { username: d.username, role: d.role },
      });
      revalidatePath("/pengguna");
      return { ok: true, pesan: "Pengguna disimpan" };
    }
    const password = passwordSementara();
    const hash = await hashPassword(password);
    const uid = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: uid,
        name: d.name,
        username: d.username,
        displayUsername: d.username,
        email: d.email ?? `${d.username}@spk.local`,
        role: d.role,
        wajibGantiPassword: true,
      });
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: uid,
        providerId: "credential",
        userId: uid,
        password: hash,
      });
      await catatAudit(
        {
          userId: u.id,
          aksi: "PENGGUNA_BUAT",
          entitas: "user",
          entitasId: uid,
          data: { username: d.username, role: d.role },
        },
        tx,
      );
    });
    revalidatePath("/pengguna");
    return { ok: true, pesan: "Pengguna dibuat", data: { password } };
  });
}

export async function aturAktif(id: string, aktif: boolean): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    if (id === u.id) throw new GalatBisnis("Anda tidak bisa menonaktifkan akun sendiri");
    const [t] = await db.select({ role: user.role }).from(user).where(eq(user.id, id));
    if (!t) throw new GalatBisnis("Pengguna tidak ditemukan");
    if (!aktif && t.role === "ADMIN" && (await jumlahAdminAktifLain(id)) === 0)
      throw new GalatBisnis("Tidak bisa menonaktifkan admin terakhir");
    await db.transaction(async (tx) => {
      await tx.update(user).set({ aktif }).where(eq(user.id, id));
      // Sesi dicabut agar akun nonaktif langsung keluar.
      if (!aktif) await tx.delete(session).where(eq(session.userId, id));
      await catatAudit(
        {
          userId: u.id,
          aksi: aktif ? "PENGGUNA_AKTIF" : "PENGGUNA_NONAKTIF",
          entitas: "user",
          entitasId: id,
        },
        tx,
      );
    });
    revalidatePath("/pengguna");
    return { ok: true, pesan: aktif ? "Pengguna diaktifkan" : "Pengguna dinonaktifkan dan sesinya dicabut" };
  });
}

export async function resetPassword(id: string): Promise<HasilAksi<{ password: string }>> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const password = passwordSementara();
    const hash = await hashPassword(password);
    await db.transaction(async (tx) => {
      const r = await tx
        .update(account)
        .set({ password: hash, updatedAt: new Date() })
        .where(and(eq(account.userId, id), eq(account.providerId, "credential")))
        .returning({ id: account.id });
      if (r.length === 0) throw new GalatBisnis("Akun tidak ditemukan");
      await tx.update(user).set({ wajibGantiPassword: true }).where(eq(user.id, id));
      await tx.delete(session).where(eq(session.userId, id));
      await catatAudit({ userId: u.id, aksi: "PENGGUNA_RESET_PASSWORD", entitas: "user", entitasId: id }, tx);
    });
    revalidatePath("/pengguna");
    return { ok: true, pesan: "Password direset", data: { password } };
  });
}

const gantiSchema = z
  .object({
    lama: z.string().min(1, "Isi password saat ini"),
    baru: z.string().min(8, "Password baru minimal 8 karakter").max(128),
    ulang: z.string(),
  })
  .refine((d) => d.baru === d.ulang, { path: ["ulang"], message: "Konfirmasi password tidak sama" })
  .refine((d) => d.baru !== d.lama, { path: ["baru"], message: "Password baru harus berbeda" });

export async function gantiPassword(_: unknown, fd: FormData): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireUser();
    const d = gantiSchema.parse(Object.fromEntries(fd));
    try {
      await auth.api.changePassword({
        body: { currentPassword: d.lama, newPassword: d.baru, revokeOtherSessions: true },
        headers: await headers(),
      });
    } catch {
      return { ok: false, pesan: "Password saat ini salah", galat: { lama: "Password saat ini salah" } };
    }
    await db.update(user).set({ wajibGantiPassword: false }).where(eq(user.id, u.id));
    await catatAudit({ userId: u.id, aksi: "AKUN_GANTI_PASSWORD", entitas: "user", entitasId: u.id });
    revalidatePath("/", "layout");
    return { ok: true, pesan: "Password diganti" };
  });
}

export async function ubahNamaSendiri(_: unknown, fd: FormData): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireUser();
    const name = z.string().trim().min(2, "Nama minimal 2 karakter").max(100).parse(fd.get("name"));
    await db.update(user).set({ name }).where(eq(user.id, u.id));
    revalidatePath("/", "layout");
    return { ok: true, pesan: "Nama disimpan" };
  });
}
