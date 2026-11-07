import ExcelJS from "exceljs";
import { z } from "zod";
import { getKelas } from "@/features/kelas/queries";
import { kriteriaLengkap } from "@/features/kriteria/queries";
import { getPengaturan } from "@/features/pengaturan/queries";
import { dataGrid } from "@/features/penilaian/queries";
import { gayaHeader, keResponse } from "@/lib/excel";
import { daftarTingkat } from "@/lib/jenjang";
import { AksesDitolak, getPengguna, requireKelasAccess } from "@/lib/rbac";

export async function GET(req: Request, { params }: { params: Promise<{ jenis: string }> }) {
  const u = await getPengguna();
  if (!u) return new Response("Tidak terautentikasi", { status: 401 });
  const { jenis } = await params;
  const wb = new ExcelJS.Workbook();

  if (jenis === "siswa") {
    if (u.role !== "ADMIN") return new Response("Akses ditolak", { status: 403 });
    const ws = wb.addWorksheet("Siswa");
    ws.columns = [
      { header: "NIS", width: 12 },
      { header: "NISN", width: 14 },
      { header: "Nama", width: 32 },
      { header: "JK", width: 6 },
      { header: "Tanggal Lahir", width: 15 },
      { header: "Kelas", width: 12 },
    ];
    gayaHeader(ws.getRow(1));
    ws.addRow(["24999", "0012345678", "Contoh Nama Siswa", "L", "17/08/2008", "XI IPA 1"]).font = {
      italic: true,
      color: { argb: "FF888888" },
    };
    ws.getColumn(1).numFmt = "@";
    ws.getColumn(2).numFmt = "@";
    ws.getColumn(5).numFmt = "@";
    for (let r = 2; r <= 1000; r++) {
      ws.getCell(`D${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"L,P"'] };
    }
    const info = wb.addWorksheet("Petunjuk");
    info.getColumn(1).width = 100;
    for (const t of [
      "Hapus baris contoh (baris 2) sebelum mengimpor.",
      "NIS wajib dan unik. Siswa dengan NIS yang sudah ada akan diperbarui.",
      "NISN opsional, tepat 10 digit.",
      "JK: L atau P. Tanggal lahir: dd/mm/yyyy.",
      "Kelas opsional: nama kelas pada periode kerja yang berstatus Draf.",
    ]) {
      info.addRow([t]);
    }
    return keResponse(wb, "template-siswa.xlsx");
  }

  if (jenis === "kelas") {
    if (u.role !== "ADMIN") return new Response("Akses ditolak", { status: 403 });
    const sekolah = await getPengaturan();
    const tingkat = daftarTingkat(sekolah.jenjang);
    const ws = wb.addWorksheet("Kelas");
    ws.columns = [
      { header: "Nama Kelas", width: 18 },
      { header: "Tingkat", width: 10 },
      { header: "Username Wali Kelas", width: 24 },
    ];
    gayaHeader(ws.getRow(1));
    ws.addRow([`Contoh ${tingkat[0]}A`, tingkat[0], "username.wali"]).font = {
      italic: true,
      color: { argb: "FF888888" },
    };
    for (let r = 2; r <= 300; r++) {
      ws.getCell(`B${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${tingkat.join(",")}"`],
      };
    }
    const info = wb.addWorksheet("Petunjuk");
    info.getColumn(1).width = 100;
    for (const t of [
      "Hapus baris contoh sebelum mengimpor.",
      `Tingkat sesuai jenjang sekolah: ${tingkat.join(", ")}.`,
      "Username wali kelas harus sudah terdaftar sebagai akun Wali Kelas. Boleh dikosongkan dulu.",
      "Kelas dengan nama yang sudah ada di periode kerja akan diperbarui.",
    ]) {
      info.addRow([t]);
    }
    return keResponse(wb, "template-kelas.xlsx");
  }

  if (jenis === "pengguna") {
    if (u.role !== "ADMIN") return new Response("Akses ditolak", { status: 403 });
    const ws = wb.addWorksheet("Pengguna");
    ws.columns = [
      { header: "Nama Lengkap", width: 32 },
      { header: "Username", width: 20 },
      { header: "Peran", width: 18 },
      { header: "Email (opsional)", width: 28 },
    ];
    gayaHeader(ws.getRow(1));
    ws.addRow(["Contoh Nama Guru, S.Pd.", "contoh.guru", "Wali Kelas", ""]).font = {
      italic: true,
      color: { argb: "FF888888" },
    };
    for (let r = 2; r <= 500; r++) {
      ws.getCell(`C${r}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: ['"Wali Kelas,Kepala Sekolah,Admin"'],
      };
    }
    const info = wb.addWorksheet("Petunjuk");
    info.getColumn(1).width = 100;
    for (const t of [
      "Hapus baris contoh sebelum mengimpor.",
      "Username: huruf kecil, angka, titik, atau garis bawah; minimal 3 karakter; harus unik.",
      "Password sementara dibuat otomatis dan ditampilkan sekali setelah impor.",
    ]) {
      info.addRow([t]);
    }
    return keResponse(wb, "template-pengguna.xlsx");
  }

  if (jenis === "nilai") {
    const kelasId = new URL(req.url).searchParams.get("kelas") ?? "";
    if (!z.string().uuid().safeParse(kelasId).success)
      return new Response("Kelas tidak valid", { status: 400 });
    try {
      await requireKelasAccess(kelasId);
    } catch (e) {
      if (e instanceof AksesDitolak) return new Response("Akses ditolak", { status: 403 });
      throw e;
    }
    const k = await getKelas(kelasId);
    if (!k) return new Response("Tidak ditemukan", { status: 404 });
    const [ks, { baris, nilai }] = await Promise.all([
      kriteriaLengkap(k.periodeId),
      dataGrid(kelasId, k.periodeId),
    ]);
    const ws = wb.addWorksheet(k.nama.slice(0, 31));
    ws.columns = [
      { header: "Kode", width: 8 },
      { header: "NIS", width: 12 },
      { header: "Nama", width: 30 },
      ...ks.map((x) => ({ header: `${x.kode} ${x.nama}`, width: x.tipeInput === "PILIHAN" ? 24 : 16 })),
    ];
    gayaHeader(ws.getRow(1));
    ws.getRow(1).alignment = { wrapText: true, vertical: "middle" };
    ws.getRow(1).height = 32;
    const peta = new Map(nilai.map((n) => [`${n.siswaId}:${n.kriteriaId}`, n]));
    for (const b of baris) {
      ws.addRow([
        b.kode,
        b.nis,
        b.nama,
        ...ks.map((x) => {
          const n = peta.get(`${b.siswaId}:${x.id}`);
          if (!n) return null;
          if (x.tipeInput === "PILIHAN") return x.sub.find((s) => s.id === n.subKriteriaId)?.label ?? null;
          return n.nilaiMentah === null ? null : Number(n.nilaiMentah);
        }),
      ]);
    }
    ws.getColumn(2).numFmt = "@";
    // Validasi data Excel: daftar pilihan untuk PILIHAN, batas angka untuk ANGKA/RENTANG.
    ks.forEach((x, i) => {
      const col = ws.getColumn(4 + i).letter;
      for (let r = 2; r <= baris.length + 1; r++) {
        ws.getCell(`${col}${r}`).dataValidation =
          x.tipeInput === "PILIHAN"
            ? {
                type: "list",
                allowBlank: true,
                formulae: [`"${x.sub.map((s) => s.label.replace(/"/g, "")).join(",")}"`],
              }
            : {
                type: "decimal",
                operator: "between",
                allowBlank: true,
                formulae: [Number(x.nilaiMin ?? 0), Number(x.nilaiMax ?? 999999)],
                showErrorMessage: true,
                errorTitle: "Nilai di luar batas",
                error: `${x.kode} harus antara ${x.nilaiMin} dan ${x.nilaiMax}`,
              };
      }
    });
    for (const c of [1, 2, 3]) ws.getColumn(c).protection = { locked: true };
    ws.views = [{ state: "frozen", xSplit: 3, ySplit: 1 }];
    return keResponse(wb, `template-nilai-${k.nama}.xlsx`);
  }

  return new Response("Tidak ditemukan", { status: 404 });
}
