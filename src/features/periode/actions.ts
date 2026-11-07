"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  alternatif,
  hasil,
  kelas,
  kriteria,
  penilaian,
  perhitungan,
  periode,
  subKriteria,
} from "@/db/schema";
import { KRITERIA_DEFAULT } from "@/db/seed/default-kriteria";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";
import type { StatusPeriode } from "@/lib/status";
import { cekSyaratPenilaian, kunciPeriode, urutkanKodeAlternatif } from "./guard";
import { buatPeriodeSchema, periodeSchema } from "./schemas";

const uuid = z.string().uuid();

export async function buatPeriode(_: unknown, fd: FormData): Promise<HasilAksi> {
  let idBaru = "";
  const hasilAksi = await jalankan(async () => {
    const u = await requireRole("ADMIN");
    const d = buatPeriodeSchema.parse(Object.fromEntries(fd));
    const nama = `${d.tahunAjaran} ${d.semester === "GANJIL" ? "Ganjil" : "Genap"}`;
    await db.transaction(async (tx) => {
      const [p] = await tx
        .insert(periode)
        .values({
          nama,
          tahunAjaran: d.tahunAjaran,
          semester: d.semester,
          kuota: d.kuota,
          cakupanDefault: d.cakupanDefault,
        })
        .returning({ id: periode.id });
      const pid = p!.id;
      idBaru = pid;

      if (d.sumber === "default" || d.sumber === "") {
        for (const [i, k] of KRITERIA_DEFAULT.entries()) {
          const [row] = await tx
            .insert(kriteria)
            .values({
              periodeId: pid,
              kode: k.kode,
              nama: k.nama,
              jenis: k.jenis,
              bobot: k.bobot,
              tipeInput: k.tipeInput,
              nilaiMin: k.nilaiMin,
              nilaiMax: k.nilaiMax,
              urutan: i,
            })
            .returning({ id: kriteria.id });
          if (k.sub.length) {
            await tx.insert(subKriteria).values(
              k.sub.map((s, j) => ({
                kriteriaId: row!.id,
                label: s.label,
                nilai: s.nilai,
                batasBawah: s.batasBawah ?? null,
                batasAtas: s.batasAtas ?? null,
                urutan: j,
              })),
            );
          }
        }
      } else if (d.sumber !== "kosong") {
        const asal = uuid.parse(d.sumber);
        // Salin kriteria + sub-kriteria dengan INSERT ... SELECT (tanpa bolak-balik ke aplikasi).
        await tx.execute(sql`
          with baru as (
            insert into kriteria (periode_id, kode, nama, jenis, bobot, kepentingan, tipe_input, nilai_min, nilai_max, urutan)
            select ${pid}, kode, nama, jenis, bobot, kepentingan, tipe_input, nilai_min, nilai_max, urutan
            from kriteria where periode_id = ${asal}
            returning id, kode
          )
          insert into sub_kriteria (kriteria_id, label, nilai, batas_bawah, batas_atas, urutan)
          select baru.id, s.label, s.nilai, s.batas_bawah, s.batas_atas, s.urutan
          from sub_kriteria s
          join kriteria k on k.id = s.kriteria_id and k.periode_id = ${asal}
          join baru on baru.kode = k.kode`);
        await tx.execute(sql`
          update periode set mode_bobot = (select mode_bobot from periode where id = ${asal}) where id = ${pid}`);
        if (d.salinKelas === "struktur" || d.salinKelas === "anggota") {
          await tx.execute(sql`
            insert into kelas (periode_id, nama, tingkat, wali_kelas_id)
            select ${pid}, nama, tingkat, wali_kelas_id from kelas where periode_id = ${asal}`);
          if (d.salinKelas === "anggota") {
            await tx.execute(sql`
              insert into kelas_siswa (kelas_id, siswa_id, periode_id)
              select kb.id, ks.siswa_id, ${pid}
              from kelas_siswa ks
              join kelas ka on ka.id = ks.kelas_id
              join kelas kb on kb.periode_id = ${pid} and kb.nama = ka.nama
              join siswa s on s.id = ks.siswa_id and s.aktif
              where ks.periode_id = ${asal}`);
          }
        }
      }
      await catatAudit(
        {
          userId: u.id,
          aksi: "PERIODE_BUAT",
          entitas: "periode",
          entitasId: pid,
          data: { nama, sumber: d.sumber },
        },
        tx,
      );
    });
    revalidatePath("/", "layout");
    return { ok: true, pesan: `Periode ${nama} dibuat` };
  });
  if (hasilAksi.ok && idBaru) redirect(`/periode/${idBaru}`);
  return hasilAksi;
}

export async function ubahPeriode(id: string, _: unknown, fd: FormData): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const pid = uuid.parse(id);
    const d = periodeSchema.parse(Object.fromEntries(fd));
    await db.transaction(async (tx) => {
      const p = await kunciPeriode(tx, pid, ["DRAFT", "PENILAIAN", "PERHITUNGAN"]);
      const ubahIdentitas = p.tahunAjaran !== d.tahunAjaran || p.semester !== d.semester;
      if (ubahIdentitas && p.status !== "DRAFT")
        throw new GalatBisnis("Tahun ajaran dan semester hanya bisa diubah saat Draf");
      const nama = `${d.tahunAjaran} ${d.semester === "GANJIL" ? "Ganjil" : "Genap"}`;
      await tx
        .update(periode)
        .set({
          nama,
          tahunAjaran: d.tahunAjaran,
          semester: d.semester,
          kuota: d.kuota,
          cakupanDefault: d.cakupanDefault,
        })
        .where(eq(periode.id, pid));
      await catatAudit(
        { userId: u.id, aksi: "PERIODE_UBAH", entitas: "periode", entitasId: pid, data: d },
        tx,
      );
    });
    revalidatePath("/", "layout");
    return { ok: true, pesan: "Periode disimpan" };
  });
}

export async function hapusPeriode(id: string): Promise<HasilAksi> {
  const r = await jalankan(async () => {
    const u = await requireRole("ADMIN");
    const pid = uuid.parse(id);
    await db.transaction(async (tx) => {
      const p = await kunciPeriode(tx, pid, ["DRAFT"]);
      const [ada] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(penilaian)
        .where(eq(penilaian.periodeId, pid));
      if ((ada?.n ?? 0) > 0)
        throw new GalatBisnis("Periode sudah punya data penilaian sehingga tidak bisa dihapus");
      await tx.delete(alternatif).where(eq(alternatif.periodeId, pid));
      await tx.delete(perhitungan).where(eq(perhitungan.periodeId, pid));
      await tx.delete(kelas).where(eq(kelas.periodeId, pid));
      await tx.delete(periode).where(eq(periode.id, pid));
      await catatAudit(
        { userId: u.id, aksi: "PERIODE_HAPUS", entitas: "periode", entitasId: pid, data: { nama: p.nama } },
        tx,
      );
    });
    revalidatePath("/", "layout");
  });
  if (r.ok) redirect("/periode");
  return r;
}

const TRANSISI: Record<string, { dari: StatusPeriode; ke: StatusPeriode }> = {
  bukaPenilaian: { dari: "DRAFT", ke: "PENILAIAN" },
  kembaliDraf: { dari: "PENILAIAN", ke: "DRAFT" },
  tutupPenilaian: { dari: "PENILAIAN", ke: "PERHITUNGAN" },
  bukaLagiPenilaian: { dari: "PERHITUNGAN", ke: "PENILAIAN" },
  bukaUlangFinal: { dari: "FINAL", ke: "PERHITUNGAN" },
};

export type JenisTransisi = keyof typeof TRANSISI;

/** Transisi status oleh admin. Transisi VALIDASI/FINAL lewat modul perhitungan dan validasi. */
export async function ubahStatusPeriode(id: string, jenis: string, alasan?: string): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const pid = uuid.parse(id);
    const t = TRANSISI[jenis];
    if (!t) throw new GalatBisnis("Transisi tidak dikenal");
    await db.transaction(async (tx) => {
      await kunciPeriode(tx, pid, [t.dari]);
      if (jenis === "bukaPenilaian") {
        const masalah = await cekSyaratPenilaian(pid, tx);
        if (masalah.length) throw new GalatBisnis("Periode belum memenuhi syarat untuk dibuka", masalah);
        await urutkanKodeAlternatif(tx, pid);
      }
      if (jenis === "kembaliDraf") {
        const [ada] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(penilaian)
          .where(eq(penilaian.periodeId, pid));
        if ((ada?.n ?? 0) > 0)
          throw new GalatBisnis("Sudah ada nilai yang diinput. Periode tidak bisa dikembalikan ke Draf");
      }
      if (jenis === "bukaUlangFinal") {
        const teks = (alasan ?? "").trim();
        if (teks.length < 10) throw new GalatBisnis("Alasan membuka ulang wajib diisi (minimal 10 karakter)");
        const runs = await tx
          .select({ id: perhitungan.id })
          .from(perhitungan)
          .where(and(eq(perhitungan.periodeId, pid), eq(perhitungan.status, "DISETUJUI")));
        const ids = runs.map((r) => r.id);
        if (ids.length) {
          await tx.update(perhitungan).set({ status: "DRAFT" }).where(inArray(perhitungan.id, ids));
          await tx.update(hasil).set({ terpilih: false }).where(inArray(hasil.perhitunganId, ids));
        }
      }
      await tx.update(periode).set({ status: t.ke }).where(eq(periode.id, pid));
      await catatAudit(
        {
          userId: u.id,
          aksi: "PERIODE_STATUS",
          entitas: "periode",
          entitasId: pid,
          data: { dari: t.dari, ke: t.ke, ...(alasan ? { alasan: alasan.trim() } : {}) },
        },
        tx,
      );
    });
    revalidatePath("/", "layout");
    return { ok: true, pesan: "Status periode diperbarui" };
  });
}
