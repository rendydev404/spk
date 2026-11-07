import "server-only";
import ExcelJS from "exceljs";

export const MAKS_BARIS_IMPOR = 5000;
export const MAKS_UKURAN_IMPOR = 2 * 1024 * 1024;

/** Mengubah nilai sel exceljs menjadi teks rapi. Tanggal dikembalikan sebagai yyyy-mm-dd. */
export function teksSel(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    // exceljs membaca tanggal sebagai UTC
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, "0")}-${String(v.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof v === "object") {
    if ("richText" in v)
      return v.richText
        .map((r) => r.text)
        .join("")
        .trim();
    if ("result" in v) return teksSel(v.result as ExcelJS.CellValue);
    if ("text" in v) return String(v.text).trim();
    return "";
  }
  return String(v).trim();
}

/** Memeriksa file unggahan dan membaca sheet pertama sebagai baris teks (tanpa header). */
export async function bacaXlsx(
  file: File | null,
  jumlahKolom: number,
): Promise<{ baris: string[][]; header: string[] }> {
  if (!file || file.size === 0) throw new Error("FILE_KOSONG");
  if (file.size > MAKS_UKURAN_IMPOR) throw new Error("FILE_BESAR");
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("FILE_FORMAT");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("FILE_FORMAT");
  const header: string[] = [];
  const baris: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row, i) => {
    const sel = Array.from({ length: jumlahKolom }, (_, c) => teksSel(row.getCell(c + 1).value));
    if (i === 1) header.push(...sel);
    else if (sel.some((s) => s !== "")) baris.push(sel);
  });
  if (baris.length > MAKS_BARIS_IMPOR) throw new Error("FILE_BARIS");
  return { baris, header };
}

export const PESAN_FILE: Record<string, string> = {
  FILE_KOSONG: "Pilih file .xlsx terlebih dahulu",
  FILE_BESAR: "Ukuran file maksimal 2 MB",
  FILE_FORMAT: "File harus berformat .xlsx dari template",
  FILE_BARIS: `Maksimal ${MAKS_BARIS_IMPOR} baris per impor`,
};

/** Gaya header seragam untuk semua file ekspor. */
export function gayaHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  row.alignment = { vertical: "middle" };
  row.height = 20;
}

export async function keResponse(wb: ExcelJS.Workbook, namaFile: string) {
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile.replace(/[^\w.-]+/g, "_")}"`,
      "Cache-Control": "no-store",
    },
  });
}
