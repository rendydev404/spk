import ExcelJS from "exceljs";
import { z } from "zod";
import { dataLaporan } from "@/features/laporan/data";
import { rowsRun } from "@/features/laporan/rows";
import { getRun } from "@/features/perhitungan/queries";
import { gayaHeader, keResponse } from "@/lib/excel";
import { getPengguna } from "@/lib/rbac";

/** Workbook hasil: Kriteria, Matriks X, Normalisasi R, Hasil. Dibuat di server. */
export async function GET(_: Request, { params }: { params: Promise<{ runId: string }> }) {
  const u = await getPengguna();
  if (!u) return new Response("Tidak terautentikasi", { status: 401 });
  const { runId } = await params;
  if (!z.string().uuid().safeParse(runId).success) return new Response("Tidak ditemukan", { status: 404 });
  const run = await getRun(runId);
  if (!run) return new Response("Tidak ditemukan", { status: 404 });
  // Wali kelas hanya boleh mengekspor hasil yang disahkan, terbatas pada kelasnya (lewat dataLaporan).
  let daftar: Awaited<ReturnType<typeof rowsRun>>;
  if (u.role === "WALI_KELAS") {
    const data = await dataLaporan(run.periodeId, u);
    if (!data?.run || data.run.id !== runId) return new Response("Akses ditolak", { status: 403 });
    daftar = data.rows;
  } else {
    daftar = await rowsRun(runId);
  }
  const ks = run.snapshot.kriteria;

  const wb = new ExcelJS.Workbook();
  wb.creator = "SPK Siswa Berprestasi";
  wb.created = new Date();

  const s1 = wb.addWorksheet("Kriteria");
  s1.columns = [
    { header: "Kode", width: 8 },
    { header: "Kriteria", width: 40 },
    { header: "Jenis", width: 10 },
    { header: "Bobot (%)", width: 11 },
    { header: "W", width: 9 },
  ];
  gayaHeader(s1.getRow(1));
  for (const k of ks)
    s1.addRow([k.kode, k.nama, k.jenis === "BENEFIT" ? "Benefit" : "Cost", k.bobot, k.bobot / 100]);
  s1.getColumn(5).numFmt = "0.0000";

  const urut = [...daftar].sort(
    (a, b) =>
      a.kelompok.localeCompare(b.kelompok, "id", { numeric: true }) ||
      a.kode.localeCompare(b.kode, "id", { numeric: true }),
  );
  const s2 = wb.addWorksheet("Matriks X");
  s2.columns = [
    { header: "Kelompok", width: 16 },
    { header: "Kode", width: 8 },
    { header: "Nama", width: 30 },
    ...ks.map((k) => ({ header: k.kode, width: 10 })),
  ];
  gayaHeader(s2.getRow(1));
  for (const r of urut) s2.addRow([r.kelompok, r.kode, r.nama, ...ks.map((k) => r.nilaiX[k.id] ?? null)]);

  const s3 = wb.addWorksheet("Normalisasi R");
  s3.columns = s2.columns.map((c) => ({ header: c.header as string, width: c.width ?? 10 }));
  gayaHeader(s3.getRow(1));
  for (const r of urut)
    s3.addRow([r.kelompok, r.kode, r.nama, ...ks.map((k) => r.normalisasi[k.id] ?? null)]);
  for (let i = 4; i < 4 + ks.length; i++) s3.getColumn(i).numFmt = "0.0000";

  const s4 = wb.addWorksheet("Hasil");
  s4.columns = [
    { header: "Kelompok", width: 16 },
    { header: "Peringkat", width: 10 },
    { header: "Kode", width: 8 },
    { header: "NIS", width: 12 },
    { header: "Nama", width: 30 },
    { header: "Kelas", width: 12 },
    { header: "Nilai V", width: 11 },
    { header: "Keterangan", width: 20 },
  ];
  gayaHeader(s4.getRow(1));
  for (const r of daftar) {
    s4.addRow([
      r.kelompok,
      r.peringkat,
      r.kode,
      r.nis,
      r.nama,
      r.kelasNama,
      Number(r.v),
      r.terpilih ? "Terpilih" : "",
    ]);
  }
  s4.getColumn(7).numFmt = "0.0000";
  for (const s of [s1, s2, s3, s4]) s.views = [{ state: "frozen", ySplit: 1 }];

  return keResponse(wb, `hasil-spk-${run.periodeId.slice(0, 8)}-${runId.slice(0, 8)}.xlsx`);
}
