"use server";

import { hashPassword } from "better-auth/crypto";
import { and, count, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { account, session, user } from "@/db/schema";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { bacaXlsx, PESAN_FILE } from "@/lib/excel";
import { requireRole, requireUser } from "@/lib/rbac";
import { LABEL_ROLE } from "@/lib/status";

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

export type AkunBaru = { nama: string; username: string; peran: string; password: string };

const PERAN_EXCEL: Record<string, "ADMIN" | "WALI_KELAS" | "KEPSEK"> = {
  admin: "ADMIN",
  "wali kelas": "WALI_KELAS",
  wali: "WALI_KELAS",
  "kepala sekolah": "KEPSEK",
  kepsek: "KEPSEK",
  "kepala madrasah": "KEPSEK",
};

/** Impor banyak akun sekaligus. Semua baris harus valid; password sementara ditampilkan sekali. */
export async function imporPengguna(_: unknown, fd: FormData): Promise<HasilAksi<AkunBaru[]>> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    let baris: string[][];
    try {
      const r = await bacaXlsx(fd.get("file") as File | null, 4);
      if (!/nama/i.test(r.header[0] ?? "")) throw new Error("FILE_FORMAT");
      baris = r.baris;
    } catch (e) {
      throw new GalatBisnis(
        PESAN_FILE[(e as Error).message] ?? "File tidak bisa dibaca. Pastikan memakai template.",
      );
    }
    if (baris.length === 0) throw new GalatBisnis("File tidak berisi data pengguna");
    if (baris.length > 500) throw new GalatBisnis("Maksimal 500 pengguna per impor");
    const masalah: string[] = [];
    const lihat = new Set<string>();
    const data = baris.map(([name = "", username = "", peran = "", email = ""], i) => {
      const no = i + 2;
      const role = PERAN_EXCEL[peran.trim().toLowerCase()];
      if (!role)
        masalah.push(`Baris ${no}: peran "${peran}" tidak dikenal (Admin, Wali Kelas, Kepala Sekolah)`);
      const r = penggunaSchema.safeParse({ name, username, email, role: role ?? "WALI_KELAS" });
      if (!r.success) {
        for (const iss of r.error.issues) masalah.push(`Baris ${no}: ${iss.message}`);
        return null;
      }
      if (lihat.has(r.data.username)) masalah.push(`Baris ${no}: username "${r.data.username}" ganda`);
      lihat.add(r.data.username);
      return r.data;
    });
    const valid = data.filter((d): d is z.infer<typeof penggunaSchema> => d !== null);
    if (valid.length) {
      const ada = await db
        .select({ username: user.username })
        .from(user)
        .where(
          inArray(
            user.username,
            valid.map((v) => v.username),
          ),
        );
      for (const a of ada) masalah.push(`Username "${a.username}" sudah dipakai`);
    }
    if (masalah.length)
      throw new GalatBisnis(
        "File berisi data yang tidak valid. Tidak ada yang disimpan.",
        masalah.slice(0, 20),
      );

    const akun = await Promise.all(
      valid.map(async (v) => {
        const password = passwordSementara();
        return { v, password, hash: await hashPassword(password), id: crypto.randomUUID() };
      }),
    );
    await db.transaction(async (tx) => {
      await tx.insert(user).values(
        akun.map(({ v, id }) => ({
          id,
          name: v.name,
          username: v.username,
          displayUsername: v.username,
          email: v.email ?? `${v.username}@spk.local`,
          role: v.role,
          wajibGantiPassword: true,
        })),
      );
      await tx
        .insert(account)
        .values(
          akun.map(({ id, hash }) => ({
            id: crypto.randomUUID(),
            accountId: id,
            providerId: "credential",
            userId: id,
            password: hash,
          })),
        );
      await catatAudit(
        { userId: u.id, aksi: "PENGGUNA_IMPOR", entitas: "user", data: { jumlah: akun.length } },
        tx,
      );
    });
    revalidatePath("/pengguna");
    return {
      ok: true,
      pesan: `${akun.length} akun dibuat`,
      data: akun.map(({ v, password }) => ({
        nama: v.name,
        username: v.username,
        peran: LABEL_ROLE[v.role],
        password,
      })),
    };
  });
}
