"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { hasil, kriteria, perhitungan, periode } from "@/db/schema";
import { GalatBisnis, type HasilAksi, jalankan } from "@/lib/aksi";
import { catatAudit } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";
import { type AlternatifInput, hitungSaw } from "@/lib/saw";
import { kunciPeriode } from "../periode/guard";
import { ambilMatriks, type Cakupan, namaKelompok } from "./queries";

const uuid = z.string().uuid();

export async function jalankanPerhitungan(periodeId: string, cakupanInput: string): Promise<HasilAksi> {
  let runId = "";
  const r = await jalankan(async () => {
    const u = await requireRole("ADMIN");
    const pid = uuid.parse(periodeId);
    const cakupan = z.enum(["SEKOLAH", "TINGKAT", "KELAS"]).parse(cakupanInput) as Cakupan;
    await db.transaction(async (tx) => {
      await kunciPeriode(tx, pid, ["PERHITUNGAN"]);
      const t0 = performance.now();
      const [ks, matriks] = await Promise.all([
        tx
          .select()
          .from(kriteria)
          .where(eq(kriteria.periodeId, pid))
          .orderBy(asc(kriteria.urutan), asc(kriteria.kode)),
        ambilMatriks(pid),
      ]);
      const utama = ks[0];
      const alt = new Map<string, AlternatifInput & { kode: string; kelasNama: string }>();
      for (const m of matriks) {
        let a = alt.get(m.siswaId);
        if (!a) {
          a = {
            id: m.siswaId,
            nama: m.nama,
            kelompok: namaKelompok(cakupan, m),
            nilai: {},
            kode: m.kode,
            kelasNama: m.kelasNama,
          };
          alt.set(m.siswaId, a);
        }
        if (m.kriteriaId && m.nilai !== null) {
          a.nilai[m.kriteriaId] = Number(m.nilai);
          if (m.kriteriaId === utama?.id) a.nilaiMentahUtama = Number(m.nilaiMentah ?? m.nilai);
        }
      }
      const kInput = ks.map((k) => ({
        id: k.id,
        kode: k.kode,
        jenis: k.jenis,
        bobotPersen: Number(k.bobot),
      }));
      const daftar = [...alt.values()];
      const hasilSaw = hitungSaw(kInput, daftar);
      const durasiHitung = performance.now() - t0;

      const [run] = await tx
        .insert(perhitungan)
        .values({
          periodeId: pid,
          cakupan,
          dihitungOleh: u.id,
          jumlahSiswa: daftar.length,
          snapshot: {
            kriteria: ks.map((k) => ({
              id: k.id,
              kode: k.kode,
              nama: k.nama,
              jenis: k.jenis,
              bobot: Number(k.bobot),
            })),
            kelompok: Object.fromEntries(
              Object.entries(hasilSaw.perKelompok).map(([g, v]) => [g, { max: v.max, min: v.min }]),
            ),
            durasiMs: Math.round(durasiHitung),
          },
        })
        .returning({ id: perhitungan.id });
      runId = run!.id;
      const rows = Object.values(hasilSaw.perKelompok).flatMap((g) =>
        g.hasil.map((h) => {
          const a = alt.get(h.id)!;
          return {
            perhitunganId: runId,
            siswaId: h.id,
            kelompok: h.kelompok,
            kodeAlternatif: a.kode,
            kelasNama: a.kelasNama,
            nilaiX: a.nilai,
            normalisasi: h.normalisasi,
            nilaiPreferensi: h.preferensi.toFixed(6),
            peringkat: h.peringkat,
          };
        }),
      );
      // Bulk insert berpotongan agar tidak melewati batas parameter PostgreSQL.
      for (let i = 0; i < rows.length; i += 1000) await tx.insert(hasil).values(rows.slice(i, i + 1000));
      const durasiTotal = Math.round(performance.now() - t0);
      console.info(
        `[saw] run ${runId}: ${daftar.length} alternatif, hitung ${durasiHitung.toFixed(1)} ms, total ${durasiTotal} ms`,
      );
      await catatAudit(
        {
          userId: u.id,
          aksi: "PERHITUNGAN_JALAN",
          entitas: "perhitungan",
          entitasId: runId,
          data: { cakupan, jumlah: daftar.length, durasiMs: durasiTotal },
        },
        tx,
      );
    });
    revalidatePath("/perhitungan");
  });
  if (r.ok && runId) redirect(`/perhitungan/${runId}`);
  return r;
}

export async function ajukanRun(runId: string): Promise<HasilAksi> {
  return jalankan(async () => {
    const u = await requireRole("ADMIN");
    const rid = uuid.parse(runId);
    await db.transaction(async (tx) => {
      const [run] = await tx.select().from(perhitungan).where(eq(perhitungan.id, rid));
      if (!run) throw new GalatBisnis("Perhitungan tidak ditemukan");
      await kunciPeriode(tx, run.periodeId, ["PERHITUNGAN"]);
      if (run.status !== "DRAFT" && run.status !== "DITOLAK")
        throw new GalatBisnis("Perhitungan ini sudah pernah diajukan");
      await tx.update(perhitungan).set({ status: "DIAJUKAN" }).where(eq(perhitungan.id, rid));
      await tx.update(periode).set({ status: "VALIDASI" }).where(eq(periode.id, run.periodeId));
      await catatAudit(
        { userId: u.id, aksi: "PERHITUNGAN_AJUKAN", entitas: "perhitungan", entitasId: rid },
        tx,
      );
    });
    revalidatePath("/", "layout");
    return { ok: true, pesan: "Hasil diajukan ke kepala sekolah" };
  });
}

export async function hapusRun(runId: string): Promise<HasilAksi> {
  const r = await jalankan(async () => {
    const u = await requireRole("ADMIN");
    const rid = uuid.parse(runId);
    await db.transaction(async (tx) => {
      const [run] = await tx.select().from(perhitungan).where(eq(perhitungan.id, rid));
      if (!run) throw new GalatBisnis("Perhitungan tidak ditemukan");
      await kunciPeriode(tx, run.periodeId, ["PERHITUNGAN"]);
      if (run.status !== "DRAFT") throw new GalatBisnis("Hanya perhitungan berstatus Draf yang bisa dihapus");
      await tx
        .delete(perhitungan)
        .where(and(eq(perhitungan.id, rid), inArray(perhitungan.status, ["DRAFT"])));
      await catatAudit(
        { userId: u.id, aksi: "PERHITUNGAN_HAPUS", entitas: "perhitungan", entitasId: rid },
        tx,
      );
    });
    revalidatePath("/perhitungan");
  });
  if (r.ok) redirect("/perhitungan");
  return r;
}
