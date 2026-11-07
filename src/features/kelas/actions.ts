"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { kelas, kelasSiswa, siswa, user } from "@/db/schema";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { bacaXlsx, PESAN_FILE } from "@/lib/excel";
import { daftarTingkat } from "@/lib/jenjang";
import { requireRole } from "@/lib/rbac";
import { getPengaturan } from "../pengaturan/queries";
import { kunciPeriode } from "../periode/guard";
import { getPeriodeKerja } from "../periode/kerja";

const uuid = z.string().uuid();
const kelasSchema = z.object({
  nama: z.string().trim().min(1, "Nama kelas wajib diisi").max(40),
  tingkat: z.coerce.number({ message: "Pilih tingkat" }).int().min(1).max(12),
  waliKelasId: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v)),
});

async function pastikanWali(id: string | null) {
  if (!id) return;
  const [w] = await db.select({ role: user.role, aktif: user.aktif }).from(user).where(eq(user.id, id));
  if (!w || w.role !== "WALI_KELAS" || !w.aktif) throw new GalatBisnis("Wali kelas tidak valid");
}

export async function simpanKelas(
  periodeId: string,
  kelasId: string | null,
  _: unknown,
  fd: FormData,
): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const pid = uuid.parse(periodeId);
    const d = kelasSchema.parse(Object.fromEntries(fd));
    await pastikanWali(d.waliKelasId);
    await db.transaction(async (tx) => {
      if (kelasId) {
        const p = await kunciPeriode(tx, pid, ["DRAFT", "PENILAIAN", "PERHITUNGAN"]);
        const [lama] = await tx
          .select()
          .from(kelas)
          .where(and(eq(kelas.id, uuid.parse(kelasId)), eq(kelas.periodeId, pid)));
        if (!lama) throw new GalatBisnis("Kelas tidak ditemukan");
        if (p.status !== "DRAFT" && (lama.nama !== d.nama || lama.tingkat !== d.tingkat)) {
          throw new GalatBisnis("Setelah penilaian dibuka, hanya wali kelas yang bisa diganti");
        }
        await tx.update(kelas).set(d).where(eq(kelas.id, lama.id));
        await catatAudit(
          { userId: u.id, aksi: "KELAS_UBAH", entitas: "kelas", entitasId: lama.id, data: d },
          tx,
        );
      } else {
        await kunciPeriode(tx, pid, ["DRAFT"]);
        const [k] = await tx
          .insert(kelas)
          .values({ ...d, periodeId: pid })
          .returning({ id: kelas.id });
        await catatAudit(
          { userId: u.id, aksi: "KELAS_BUAT", entitas: "kelas", entitasId: k!.id, data: d },
          tx,
        );
      }
    });
    revalidatePath("/kelas");
    return { ok: true, pesan: kelasId ? "Kelas disimpan" : "Kelas ditambahkan" };
  });
}

export async function hapusKelas(kelasId: string): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const kid = uuid.parse(kelasId);
    await db.transaction(async (tx) => {
      const [k] = await tx.select().from(kelas).where(eq(kelas.id, kid));
      if (!k) throw new GalatBisnis("Kelas tidak ditemukan");
      await kunciPeriode(tx, k.periodeId, ["DRAFT"]);
      // Anggota ikut terhapus (cascade); ditolak DB bila masih ada alternatif.
      await tx.delete(kelas).where(eq(kelas.id, kid));
      await catatAudit(
        { userId: u.id, aksi: "KELAS_HAPUS", entitas: "kelas", entitasId: kid, data: { nama: k.nama } },
        tx,
      );
    });
    revalidatePath("/kelas");
    return { ok: true, pesan: "Kelas dihapus" };
  });
}

export async function tambahAnggota(kelasId: string, siswaIds: string[]): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const kid = uuid.parse(kelasId);
    const ids = z.array(uuid).min(1, "Pilih minimal satu siswa").max(500).parse(siswaIds);
    await db.transaction(async (tx) => {
      const [k] = await tx.select().from(kelas).where(eq(kelas.id, kid));
      if (!k) throw new GalatBisnis("Kelas tidak ditemukan");
      await kunciPeriode(tx, k.periodeId, ["DRAFT"]);
      const aktif = await tx
        .select({ id: siswa.id })
        .from(siswa)
        .where(and(inArray(siswa.id, ids), eq(siswa.aktif, true)));
      if (aktif.length !== ids.length)
        throw new GalatBisnis("Ada siswa yang tidak aktif atau tidak ditemukan");
      await tx
        .insert(kelasSiswa)
        .values(ids.map((sid) => ({ kelasId: kid, siswaId: sid, periodeId: k.periodeId })));
      await catatAudit(
        {
          userId: u.id,
          aksi: "KELAS_ANGGOTA_TAMBAH",
          entitas: "kelas",
          entitasId: kid,
          data: { jumlah: ids.length },
        },
        tx,
      );
    });
    revalidatePath(`/kelas/${kid}`);
    return { ok: true, pesan: `${ids.length} siswa ditambahkan` };
  });
}

export async function keluarkanAnggota(kelasId: string, siswaId: string): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const kid = uuid.parse(kelasId);
    const sid = uuid.parse(siswaId);
    await db.transaction(async (tx) => {
      const [k] = await tx.select().from(kelas).where(eq(kelas.id, kid));
      if (!k) throw new GalatBisnis("Kelas tidak ditemukan");
      await kunciPeriode(tx, k.periodeId, ["DRAFT"]);
      await tx.delete(kelasSiswa).where(and(eq(kelasSiswa.kelasId, kid), eq(kelasSiswa.siswaId, sid)));
      await catatAudit(
        {
          userId: u.id,
          aksi: "KELAS_ANGGOTA_KELUAR",
          entitas: "kelas",
          entitasId: kid,
          data: { siswaId: sid },
        },
        tx,
      );
    });
    revalidatePath(`/kelas/${kid}`);
    return { ok: true, pesan: "Siswa dikeluarkan dari kelas" };
  });
}

export async function pindahkanAnggota(
  kelasId: string,
  siswaId: string,
  kelasTujuanId: string,
): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const [kid, sid, tid] = [uuid.parse(kelasId), uuid.parse(siswaId), uuid.parse(kelasTujuanId)];
    await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(kelas)
        .where(inArray(kelas.id, [kid, tid]));
      const asal = rows.find((r) => r.id === kid);
      const tujuan = rows.find((r) => r.id === tid);
      if (!asal || !tujuan || asal.periodeId !== tujuan.periodeId)
        throw new GalatBisnis("Kelas tujuan tidak valid");
      await kunciPeriode(tx, asal.periodeId, ["DRAFT"]);
      // UPDATE (bukan hapus+tambah) agar status alternatif siswa tetap terjaga.
      await tx
        .update(kelasSiswa)
        .set({ kelasId: tid })
        .where(and(eq(kelasSiswa.kelasId, kid), eq(kelasSiswa.siswaId, sid)));
      await catatAudit(
        {
          userId: u.id,
          aksi: "KELAS_ANGGOTA_PINDAH",
          entitas: "kelas",
          entitasId: kid,
          data: { siswaId: sid, ke: tid },
        },
        tx,
      );
    });
    revalidatePath(`/kelas/${kid}`);
    return { ok: true, pesan: "Siswa dipindahkan" };
  });
}

/** Impor kelas ke periode kerja (Draf). Semua baris harus valid (all-or-nothing). */
export async function imporKelas(_: unknown, fd: FormData): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const { kerja } = await getPeriodeKerja();
    if (!kerja) throw new GalatBisnis("Belum ada periode");
    let baris: string[][];
    try {
      const r = await bacaXlsx(fd.get("file") as File | null, 3);
      if (!/kelas/i.test(r.header[0] ?? "")) throw new Error("FILE_FORMAT");
      baris = r.baris;
    } catch (e) {
      throw new GalatBisnis(
        PESAN_FILE[(e as Error).message] ?? "File tidak bisa dibaca. Pastikan memakai template.",
      );
    }
    if (baris.length === 0) throw new GalatBisnis("File tidak berisi data kelas");
    if (baris.length > 300) throw new GalatBisnis("Maksimal 300 kelas per impor");
    const sekolah = await getPengaturan();
    const tingkatSah = new Set(daftarTingkat(sekolah.jenjang));
    const wali = await db
      .select({ id: user.id, username: user.username })
      .from(user)
      .where(and(eq(user.role, "WALI_KELAS"), eq(user.aktif, true)));
    const waliByUsername = new Map(wali.map((w) => [w.username.toLowerCase(), w.id]));
    const masalah: string[] = [];
    const lihat = new Set<string>();
    const data = baris.map(([nama = "", tingkat = "", username = ""], i) => {
      const no = i + 2;
      const n = nama.trim();
      const t = Number(tingkat);
      if (!n || n.length > 40) masalah.push(`Baris ${no}: nama kelas wajib, maksimal 40 karakter`);
      if (lihat.has(n.toLowerCase())) masalah.push(`Baris ${no}: kelas "${n}" ganda`);
      lihat.add(n.toLowerCase());
      if (!tingkatSah.has(t))
        masalah.push(
          `Baris ${no}: tingkat "${tingkat}" tidak sesuai jenjang (${[...tingkatSah].join(", ")})`,
        );
      let waliKelasId: string | null = null;
      if (username.trim()) {
        waliKelasId = waliByUsername.get(username.trim().toLowerCase()) ?? null;
        if (!waliKelasId) masalah.push(`Baris ${no}: wali "${username}" bukan akun wali kelas aktif`);
      }
      return { nama: n, tingkat: t, waliKelasId };
    });
    if (masalah.length)
      throw new GalatBisnis(
        "File berisi data yang tidak valid. Tidak ada yang disimpan.",
        masalah.slice(0, 20),
      );
    await db.transaction(async (tx) => {
      await kunciPeriode(tx, kerja.id, ["DRAFT"]);
      await tx
        .insert(kelas)
        .values(data.map((d) => ({ ...d, periodeId: kerja.id })))
        .onConflictDoUpdate({
          target: [kelas.periodeId, kelas.nama],
          set: { tingkat: sql`excluded.tingkat`, waliKelasId: sql`excluded.wali_kelas_id` },
        });
      await catatAudit(
        {
          userId: u.id,
          aksi: "KELAS_IMPOR",
          entitas: "periode",
          entitasId: kerja.id,
          data: { jumlah: data.length },
        },
        tx,
      );
    });
    revalidatePath("/kelas");
    return { ok: true, pesan: `${data.length} kelas diimpor` };
  });
}
