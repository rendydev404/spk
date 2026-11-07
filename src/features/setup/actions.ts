"use server";

import { hashPassword } from "better-auth/crypto";
import { count, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { account, pengaturanSekolah, user } from "@/db/schema";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";

const schema = z
  .object({
    namaSekolah: z.string().trim().min(3, "Nama sekolah minimal 3 karakter").max(120),
    jenjang: z.enum(["SD", "SMP", "SMA", "LAINNYA"]),
    kota: z.string().trim().max(60),
    judulSeleksi: z.string().trim().min(3, "Nama seleksi wajib diisi").max(80),
    nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Username minimal 3 karakter")
      .max(32)
      .regex(/^[a-z0-9._]+$/, "Hanya huruf kecil, angka, titik, garis bawah"),
    password: z.string().min(8, "Password minimal 8 karakter").max(128),
    ulang: z.string(),
  })
  .refine((d) => d.password === d.ulang, { path: ["ulang"], message: "Konfirmasi password tidak sama" });

/** Setup awal: hanya berjalan saat belum ada pengguna sama sekali. */
export async function setupAwal(_: unknown, fd: FormData): Promise<HasilAksi> {
  const r = await jalankan(async () => {
    const d = schema.parse(Object.fromEntries(fd));
    const hash = await hashPassword(d.password);
    await db.transaction(async (tx) => {
      // Kunci agar dua permintaan setup bersamaan tidak sama-sama lolos.
      await tx.execute(sql`select pg_advisory_xact_lock(424242)`);
      const [ada] = await tx.select({ n: count() }).from(user);
      if ((ada?.n ?? 0) > 0) throw new GalatBisnis("Aplikasi sudah disiapkan. Silakan masuk.");
      const uid = crypto.randomUUID();
      await tx.insert(user).values({
        id: uid,
        name: d.nama,
        username: d.username,
        displayUsername: d.username,
        email: `${d.username}@spk.local`,
        role: "ADMIN",
      });
      await tx
        .insert(account)
        .values({
          id: crypto.randomUUID(),
          accountId: uid,
          providerId: "credential",
          userId: uid,
          password: hash,
        });
      const profil = {
        namaSekolah: d.namaSekolah,
        jenjang: d.jenjang,
        kota: d.kota,
        judulSeleksi: d.judulSeleksi,
      };
      await tx
        .insert(pengaturanSekolah)
        .values({ id: 1, ...profil })
        .onConflictDoUpdate({ target: pengaturanSekolah.id, set: profil });
      await catatAudit(
        { userId: uid, aksi: "SETUP_AWAL", entitas: "pengaturan_sekolah", entitasId: "1", data: profil },
        tx,
      );
    });
  });
  if (r.ok) redirect("/login?setup=1");
  return r;
}
