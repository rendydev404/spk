"use server";

import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { kriteria, penilaian, subKriteria } from "@/db/schema";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { cekRentang } from "@/lib/konversi";
import { requireRole } from "@/lib/rbac";
import { kunciPeriode } from "../periode/guard";

const uuid = z.string().uuid();
const angkaOpsional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
  .pipe(z.number({ message: "Harus angka" }).finite().min(-999999).max(999999).nullable());

const kriteriaSchema = z
  .object({
    kode: z.string().trim().toUpperCase().regex(/^C\d{1,2}$/, "Format kode C1, C2, ..."),
    nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
    jenis: z.enum(["BENEFIT", "COST"], { message: "Pilih jenis" }),
    tipeInput: z.enum(["ANGKA", "RENTANG", "PILIHAN"], { message: "Pilih tipe input" }),
    nilaiMin: angkaOpsional,
    nilaiMax: angkaOpsional,
  })
  .superRefine((d, ctx) => {
    if (d.tipeInput !== "PILIHAN") {
      if (d.nilaiMin === null) ctx.addIssue({ code: "custom", path: ["nilaiMin"], message: "Nilai minimum wajib diisi" });
      if (d.nilaiMax === null) ctx.addIssue({ code: "custom", path: ["nilaiMax"], message: "Nilai maksimum wajib diisi" });
      if (d.nilaiMin !== null && d.nilaiMax !== null && d.nilaiMax <= d.nilaiMin) {
        ctx.addIssue({ code: "custom", path: ["nilaiMax"], message: "Maksimum harus lebih besar dari minimum" });
      }
      if (d.tipeInput === "ANGKA" && d.jenis === "COST" && d.nilaiMin !== null && d.nilaiMin <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["nilaiMin"],
          message: "Kriteria cost bertipe angka harus bernilai minimal lebih dari 0. Gunakan tipe Rentang untuk data yang bisa 0",
        });
      }
    }
  });

async function periodeDariKriteria(kid: string) {
  const [k] = await db.select({ periodeId: kriteria.periodeId }).from(kriteria).where(eq(kriteria.id, kid));
  if (!k) throw new GalatBisnis("Kriteria tidak ditemukan");
  return k.periodeId;
}

export async function simpanKriteria(periodeId: string, kriteriaId: string | null, _: unknown, fd: FormData): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const pid = uuid.parse(periodeId);
    const d = kriteriaSchema.parse(Object.fromEntries(fd));
    const nilai = {
      ...d,
      nilaiMin: d.tipeInput === "PILIHAN" ? null : String(d.nilaiMin),
      nilaiMax: d.tipeInput === "PILIHAN" ? null : String(d.nilaiMax),
    };
    await db.transaction(async (tx) => {
      await kunciPeriode(tx, pid, ["DRAFT"]);
      if (kriteriaId) {
        const kid = uuid.parse(kriteriaId);
        const [lama] = await tx.select().from(kriteria).where(and(eq(kriteria.id, kid), eq(kriteria.periodeId, pid)));
        if (!lama) throw new GalatBisnis("Kriteria tidak ditemukan");
        await tx.update(kriteria).set(nilai).where(eq(kriteria.id, kid));
        // Tipe ANGKA tidak memakai sub-kriteria; PILIHAN tidak memakai batas rentang.
        if (d.tipeInput === "ANGKA") await tx.delete(subKriteria).where(eq(subKriteria.kriteriaId, kid));
        if (d.tipeInput === "PILIHAN") {
          await tx.update(subKriteria).set({ batasBawah: null, batasAtas: null }).where(eq(subKriteria.kriteriaId, kid));
        }
        await catatAudit({ userId: u.id, aksi: "KRITERIA_UBAH", entitas: "kriteria", entitasId: kid, data: { sebelum: lama, sesudah: nilai } }, tx);
      } else {
        const [{ urutan } = { urutan: 0 }] = await tx
          .select({ urutan: sql<number>`coalesce(max(${kriteria.urutan}) + 1, 0)::int` })
          .from(kriteria)
          .where(eq(kriteria.periodeId, pid));
        const [k] = await tx.insert(kriteria).values({ ...nilai, periodeId: pid, bobot: "0", urutan }).returning({ id: kriteria.id });
        await catatAudit({ userId: u.id, aksi: "KRITERIA_BUAT", entitas: "kriteria", entitasId: k!.id, data: nilai }, tx);
      }
    });
    revalidatePath(`/periode/${pid}`, "layout");
    return { ok: true, pesan: kriteriaId ? "Kriteria disimpan" : "Kriteria ditambahkan. Atur bobotnya di halaman Bobot." };
  });
}

export async function hapusKriteria(kriteriaId: string): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const kid = uuid.parse(kriteriaId);
    const pid = await periodeDariKriteria(kid);
    await db.transaction(async (tx) => {
      await kunciPeriode(tx, pid, ["DRAFT"]);
      const [ada] = await tx.select({ n: sql<number>`count(*)::int` }).from(penilaian).where(eq(penilaian.kriteriaId, kid));
      if ((ada?.n ?? 0) > 0) throw new GalatBisnis("Kriteria sudah dipakai di penilaian sehingga tidak bisa dihapus");
      const [k] = await tx.delete(kriteria).where(eq(kriteria.id, kid)).returning();
      await catatAudit({ userId: u.id, aksi: "KRITERIA_HAPUS", entitas: "kriteria", entitasId: kid, data: { kode: k?.kode, nama: k?.nama } }, tx);
    });
    revalidatePath(`/periode/${pid}`, "layout");
    return { ok: true, pesan: "Kriteria dihapus" };
  });
}

export async function geserKriteria(kriteriaId: string, arah: "naik" | "turun"): Promise<HasilAksi> {
  return jalankan(async () => {
    await requireRole("ADMIN");
    const kid = uuid.parse(kriteriaId);
    const pid = await periodeDariKriteria(kid);
    await db.transaction(async (tx) => {
      await kunciPeriode(tx, pid, ["DRAFT"]);
      const semua = await tx.select({ id: kriteria.id }).from(kriteria).where(eq(kriteria.periodeId, pid)).orderBy(kriteria.urutan, kriteria.kode);
      const i = semua.findIndex((k) => k.id === kid);
      const j = arah === "naik" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= semua.length) return;
      [semua[i], semua[j]] = [semua[j]!, semua[i]!];
      await tx.execute(sql`update kriteria set urutan = v.urutan from (values ${sql.join(
        semua.map((k, n) => sql`(${k.id}::uuid, ${n}::smallint)`),
        sql`, `,
      )}) as v(id, urutan) where kriteria.id = v.id`);
    });
    revalidatePath(`/periode/${pid}`, "layout");
  });
}

const subSchema = z.object({
  id: z.string().uuid().nullable(),
  label: z.string().trim().min(1, "Label wajib diisi").max(60),
  nilai: z.number({ message: "Nilai harus angka" }).finite().positive("Nilai skala harus lebih dari 0").max(9999),
  batasBawah: z.number().finite().nullable(),
  batasAtas: z.number().finite().nullable(),
});

export async function simpanSubKriteria(kriteriaId: string, input: unknown): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const kid = uuid.parse(kriteriaId);
    const rows = z.array(subSchema).min(1, "Minimal satu sub-kriteria").max(30).parse(input);
    const pid = await periodeDariKriteria(kid);
    await db.transaction(async (tx) => {
      await kunciPeriode(tx, pid, ["DRAFT"]);
      const [k] = await tx.select().from(kriteria).where(eq(kriteria.id, kid));
      if (!k || k.tipeInput === "ANGKA") throw new GalatBisnis("Kriteria bertipe Angka tidak memakai sub-kriteria");
      const label = new Set<string>();
      for (const r of rows) {
        const key = r.label.toLowerCase();
        if (label.has(key)) throw new GalatBisnis(`Label "${r.label}" dipakai lebih dari sekali`);
        label.add(key);
      }
      if (k.tipeInput === "RENTANG") {
        for (const r of rows) if (r.batasBawah === null) throw new GalatBisnis(`${r.label}: batas bawah wajib diisi`);
        const masalah = cekRentang(rows);
        if (masalah.length) throw new GalatBisnis("Rentang belum valid", masalah);
      }
      const idLama = rows.map((r) => r.id).filter((x): x is string => x !== null);
      // Hapus sub yang tidak ada lagi; ditolak DB jika sudah dipakai penilaian.
      await tx
        .delete(subKriteria)
        .where(and(eq(subKriteria.kriteriaId, kid), idLama.length ? notInArray(subKriteria.id, idLama) : undefined));
      // Label sementara agar pertukaran label antar baris tidak bentrok unique.
      if (idLama.length) {
        await tx
          .update(subKriteria)
          .set({ label: sql`'~' || ${subKriteria.id}::text` })
          .where(inArray(subKriteria.id, idLama));
      }
      for (const [i, r] of rows.entries()) {
        const v = {
          label: r.label,
          nilai: String(r.nilai),
          batasBawah: k.tipeInput === "RENTANG" && r.batasBawah !== null ? String(r.batasBawah) : null,
          batasAtas: k.tipeInput === "RENTANG" && r.batasAtas !== null ? String(r.batasAtas) : null,
          urutan: i,
        };
        if (r.id) await tx.update(subKriteria).set(v).where(and(eq(subKriteria.id, r.id), eq(subKriteria.kriteriaId, kid)));
        else await tx.insert(subKriteria).values({ ...v, kriteriaId: kid });
      }
      await catatAudit({ userId: u.id, aksi: "SUB_KRITERIA_SIMPAN", entitas: "kriteria", entitasId: kid, data: { jumlah: rows.length } }, tx);
    });
    revalidatePath(`/periode/${pid}`, "layout");
    return { ok: true, pesan: "Sub-kriteria disimpan" };
  });
}
