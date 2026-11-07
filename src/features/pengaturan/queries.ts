import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { pengaturanSekolah } from "@/db/schema";

export const getPengaturan = cache(async () => {
  const [row] = await db.select().from(pengaturanSekolah).where(eq(pengaturanSekolah.id, 1));
  return (
    row ?? {
      id: 1,
      namaSekolah: "Nama Sekolah",
      alamat: "",
      kota: "",
      logoUrl: null,
      namaKepsek: "",
      nipKepsek: "",
      updatedAt: new Date(),
    }
  );
});
