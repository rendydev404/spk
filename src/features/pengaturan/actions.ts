"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { pengaturanSekolah } from "@/db/schema";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";

const schema = z.object({
  namaSekolah: z.string().trim().min(3, "Nama sekolah minimal 3 karakter").max(120),
  alamat: z.string().trim().max(200),
  kota: z.string().trim().max(60),
  namaKepsek: z.string().trim().max(100),
  nipKepsek: z
    .string()
    .trim()
    .regex(/^(\d{18})?$/, "NIP 18 digit atau kosongkan"),
  hapusLogo: z.string().optional(),
});

const MAKS_LOGO = 200 * 1024;
const TIPE_LOGO = ["image/png", "image/jpeg", "image/webp"];

export async function simpanPengaturan(_: unknown, fd: FormData): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const d = schema.parse(Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")));
    let logoUrl: string | null | undefined;
    const file = fd.get("logo");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAKS_LOGO) throw new GalatBisnis("Ukuran logo maksimal 200 KB");
      if (!TIPE_LOGO.includes(file.type)) throw new GalatBisnis("Logo harus PNG, JPG, atau WEBP");
      // Disimpan sebagai data URL: kecil, satu baris, tanpa penyimpanan file terpisah.
      logoUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
    } else if (d.hapusLogo === "1") {
      logoUrl = null;
    }
    const { hapusLogo: _h, ...nilai } = d;
    const set = { ...nilai, ...(logoUrl !== undefined ? { logoUrl } : {}) };
    await db
      .insert(pengaturanSekolah)
      .values({ id: 1, ...set })
      .onConflictDoUpdate({ target: pengaturanSekolah.id, set });
    await catatAudit({
      userId: u.id,
      aksi: "PENGATURAN_UBAH",
      entitas: "pengaturan_sekolah",
      entitasId: "1",
      data: nilai,
    });
    revalidatePath("/", "layout");
    return { ok: true, pesan: "Pengaturan sekolah disimpan" };
  });
}
