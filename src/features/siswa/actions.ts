"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { kelas, kelasSiswa, siswa } from "@/db/schema";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { bacaXlsx, PESAN_FILE } from "@/lib/excel";
import { requireRole } from "@/lib/rbac";
import { getPeriodeKerja } from "../periode/kerja";
import { siswaSchema } from "./schemas";

const uuid = z.string().uuid();

export async function simpanSiswa(id: string | null, _: unknown, fd: FormData): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const d = siswaSchema.parse(Object.fromEntries(fd));
    const aktif = fd.get("aktif") === "on" || fd.get("aktif") === "true";
    if (id) {
      const sid = uuid.parse(id);
      await db
        .update(siswa)
        .set({ ...d, aktif })
        .where(eq(siswa.id, sid));
      await catatAudit({
        userId: u.id,
        aksi: "SISWA_UBAH",
        entitas: "siswa",
        entitasId: sid,
        data: { nis: d.nis, aktif },
      });
    } else {
      const [s] = await db.insert(siswa).values(d).returning({ id: siswa.id });
      await catatAudit({
        userId: u.id,
        aksi: "SISWA_BUAT",
        entitas: "siswa",
        entitasId: s!.id,
        data: { nis: d.nis },
      });
    }
    revalidatePath("/siswa");
    return { ok: true, pesan: id ? "Data siswa disimpan" : "Siswa ditambahkan" };
  });
}

/** Hapus permanen jika siswa belum punya riwayat; jika sudah, siswa dinonaktifkan. */
export async function hapusSiswa(id: string): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const sid = uuid.parse(id);
    const [ref] = await db.execute<{ ada: boolean }>(sql`
      select exists(select 1 from kelas_siswa where siswa_id = ${sid})
          or exists(select 1 from alternatif where siswa_id = ${sid})
          or exists(select 1 from hasil where siswa_id = ${sid}) as ada`);
    if (ref?.ada) {
      await db.update(siswa).set({ aktif: false }).where(eq(siswa.id, sid));
      await catatAudit({ userId: u.id, aksi: "SISWA_NONAKTIF", entitas: "siswa", entitasId: sid });
      revalidatePath("/siswa");
      return {
        ok: true,
        pesan: "Siswa sudah punya riwayat kelas atau penilaian, jadi dinonaktifkan (tidak dihapus)",
      };
    }
    await db.delete(siswa).where(eq(siswa.id, sid));
    await catatAudit({ userId: u.id, aksi: "SISWA_HAPUS", entitas: "siswa", entitasId: sid });
    revalidatePath("/siswa");
    return { ok: true, pesan: "Siswa dihapus" };
  });
}

export type BarisImpor = {
  baris: number;
  nis: string;
  nisn: string;
  nama: string;
  jenisKelamin: string;
  tanggalLahir: string;
  kelas: string;
  galat: string[];
  baru: boolean;
};

const KOLOM = ["NIS", "NISN", "Nama", "JK", "Tanggal Lahir", "Kelas"];

function normalJk(v: string) {
  const t = v.trim().toUpperCase();
  if (t === "L" || t.startsWith("LAKI")) return "L";
  if (t === "P" || t.startsWith("PEREMPUAN") || t === "W") return "P";
  return t;
}
function normalTanggal(v: string) {
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v.trim());
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return v.trim();
}

async function validasiImpor(baris: string[][]) {
  const { kerja } = await getPeriodeKerja();
  const daftarKelas = kerja
    ? await db.select({ id: kelas.id, nama: kelas.nama }).from(kelas).where(eq(kelas.periodeId, kerja.id))
    : [];
  const petaKelas = new Map(daftarKelas.map((k) => [k.nama.toLowerCase(), k.id]));
  const nisList = baris.map((b) => b[0]?.trim() ?? "").filter(Boolean);
  const ada = nisList.length
    ? await db.select({ nis: siswa.nis, nisn: siswa.nisn }).from(siswa).where(inArray(siswa.nis, nisList))
    : [];
  const nisAda = new Set(ada.map((a) => a.nis));
  const lihatNis = new Map<string, number>();
  const lihatNisn = new Map<string, number>();

  const hasil: BarisImpor[] = baris.map((b, i) => {
    const [nis = "", nisn = "", nama = "", jk = "", tgl = "", kls = ""] = b;
    const no = i + 2;
    const galat: string[] = [];
    const r = siswaSchema.safeParse({
      nis,
      nisn,
      nama,
      jenisKelamin: normalJk(jk),
      tanggalLahir: normalTanggal(tgl),
    });
    if (!r.success) for (const iss of r.error.issues) galat.push(iss.message);
    if (nis) {
      if (lihatNis.has(nis)) galat.push(`NIS sama dengan baris ${lihatNis.get(nis)}`);
      else lihatNis.set(nis, no);
    }
    if (nisn) {
      if (lihatNisn.has(nisn)) galat.push(`NISN sama dengan baris ${lihatNisn.get(nisn)}`);
      else lihatNisn.set(nisn, no);
    }
    if (kls) {
      if (!kerja) galat.push("Belum ada periode untuk kelas");
      else if (kerja.status !== "DRAFT")
        galat.push(`Kelas hanya bisa diisi saat periode ${kerja.nama} berstatus Draf`);
      else if (!petaKelas.has(kls.toLowerCase()))
        galat.push(`Kelas "${kls}" tidak ada di periode ${kerja.nama}`);
    }
    return {
      baris: no,
      nis,
      nisn,
      nama,
      jenisKelamin: normalJk(jk),
      tanggalLahir: normalTanggal(tgl),
      kelas: kls,
      galat,
      baru: !nisAda.has(nis),
    };
  });
  return { hasil, kerja, petaKelas };
}

export async function pratinjauImporSiswa(
  _: unknown,
  fd: FormData,
): Promise<HasilAksi<{ baris: BarisImpor[] }>> {
  return jalankan(async () => {
    await requireRole("ADMIN");
    let baris: string[][];
    try {
      const r = await bacaXlsx(fd.get("file") as File | null, KOLOM.length);
      if (r.header[0]?.toUpperCase() !== "NIS") throw new Error("FILE_FORMAT");
      baris = r.baris;
    } catch (e) {
      throw new GalatBisnis(
        PESAN_FILE[(e as Error).message] ?? "File tidak bisa dibaca. Pastikan memakai template.",
      );
    }
    if (baris.length === 0) throw new GalatBisnis("File tidak berisi data siswa");
    const { hasil } = await validasiImpor(baris);
    return { ok: true, data: { baris: hasil } };
  });
}

/** Menyimpan baris valid dalam satu transaksi (upsert berdasarkan NIS). Data divalidasi ulang di server. */
export async function konfirmasiImporSiswa(baris: string[][]): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const input = z
      .array(z.array(z.string().max(200)).length(KOLOM.length))
      .max(5000)
      .parse(baris);
    const { hasil, kerja, petaKelas } = await validasiImpor(input);
    const valid = hasil.filter((h) => h.galat.length === 0);
    if (valid.length === 0) throw new GalatBisnis("Tidak ada baris valid untuk disimpan");
    await db.transaction(async (tx) => {
      const tersimpan = await tx
        .insert(siswa)
        .values(
          valid.map((v) => ({
            nis: v.nis,
            nisn: v.nisn || null,
            nama: v.nama.trim(),
            jenisKelamin: v.jenisKelamin as "L" | "P",
            tanggalLahir: v.tanggalLahir || null,
          })),
        )
        .onConflictDoUpdate({
          target: siswa.nis,
          set: {
            nisn: sql`excluded.nisn`,
            nama: sql`excluded.nama`,
            jenisKelamin: sql`excluded.jenis_kelamin`,
            tanggalLahir: sql`excluded.tanggal_lahir`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: siswa.id, nis: siswa.nis });
      const idByNis = new Map(tersimpan.map((t) => [t.nis, t.id]));
      const anggota = valid
        .filter((v) => v.kelas && kerja)
        .map((v) => ({
          kelasId: petaKelas.get(v.kelas.toLowerCase())!,
          siswaId: idByNis.get(v.nis)!,
          periodeId: kerja!.id,
        }));
      if (anggota.length) {
        await tx
          .insert(kelasSiswa)
          .values(anggota)
          .onConflictDoUpdate({
            target: [kelasSiswa.periodeId, kelasSiswa.siswaId],
            set: { kelasId: sql`excluded.kelas_id` },
          });
      }
      await catatAudit(
        {
          userId: u.id,
          aksi: "SISWA_IMPOR",
          entitas: "siswa",
          data: { jumlah: valid.length, kelas: anggota.length, ditolak: hasil.length - valid.length },
        },
        tx,
      );
    });
    revalidatePath("/siswa");
    return {
      ok: true,
      pesan: `${valid.length} siswa disimpan${hasil.length - valid.length ? `, ${hasil.length - valid.length} baris dilewati` : ""}`,
    };
  });
}
