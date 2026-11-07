import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { PASSWORD_DEMO, sebagai } from "./helpers";

// Alur yang sebelumnya hanya lolos type-check. Data awal: seed demo segar (dibuat oleh scripts/e2e.mjs).
test.describe.configure({ mode: "serial" });

const tmp = mkdtempSync(join(tmpdir(), "spk-e2e-"));

async function xlsx(rows: (string | number | null)[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Data");
  for (const r of rows) ws.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function unggah(page: Page, nama: string, buffer: Buffer) {
  await page
    .getByRole("dialog")
    .locator('input[type="file"]')
    .setInputFiles({
      name: nama,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    });
}

const toast = (page: Page, teks: string | RegExp) =>
  expect(page.getByRole("region", { name: "Notifikasi" }).getByText(teks).first()).toBeVisible();

test("impor siswa: pratinjau, baris salah dilewati, upsert berdasarkan NIS", async ({ browser }) => {
  const { page, errors, tutup } = await sebagai(browser, "admin");
  await page.goto("/siswa");
  await page.getByRole("button", { name: "Impor Excel" }).click();
  await unggah(
    page,
    "siswa.xlsx",
    await xlsx([
      ["NIS", "NISN", "Nama", "JK", "Tanggal Lahir", "Kelas"],
      ["25001", "0099887766", "Rahmat Hidayat", "L", "05/03/2009", ""],
      ["25002", "", "Nurul Fadhilah", "Perempuan", "", ""],
      ["24014", "", "Nanda Kusuma Wijaya", "L", "", ""], // NIS sudah ada: diperbarui
      ["", "123", "X", "Z", "31/02/2009", ""], // banyak kesalahan
      ["25001", "", "Duplikat", "L", "", ""], // NIS ganda di file
    ]),
  );
  await page.getByRole("button", { name: "Periksa file" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("3 valid")).toBeVisible();
  await expect(dialog.getByText("2 bermasalah, tidak disimpan")).toBeVisible();
  await expect(dialog.getByText("2 siswa baru")).toBeVisible();
  await expect(dialog.getByText("1 diperbarui")).toBeVisible();
  await expect(dialog.getByText("NIS sama dengan baris 2")).toBeVisible();
  await expect(dialog.getByText(/NISN harus 10 digit/)).toBeVisible();
  await dialog.getByRole("button", { name: "Simpan 3 siswa" }).click();
  await toast(page, /^3 siswa disimpan/);

  await page.getByRole("searchbox", { name: "Cari nama atau NIS" }).fill("Rahmat");
  await expect(page.getByRole("link", { name: "Rahmat Hidayat" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "5 Mar 2009" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Cari nama atau NIS" }).fill("24014");
  await expect(page.getByRole("link", { name: "Nanda Kusuma Wijaya" })).toBeVisible();

  // File bukan template ditolak.
  await page.getByRole("button", { name: "Impor Excel" }).click();
  await unggah(page, "salah.xlsx", await xlsx([["Bukan", "Template"], ["a", "b"]]));
  await page.getByRole("button", { name: "Periksa file" }).click();
  await expect(page.getByRole("dialog").getByText(/Pastikan memakai template|berformat .xlsx dari template/)).toBeVisible();
  expect(errors).toEqual([]);
  await tutup();
});

test("impor nilai dari template kelas: file salah ditolak utuh, file benar tersimpan", async ({ browser }) => {
  const { page, errors, tutup } = await sebagai(browser, "wali1");
  await page.goto("/penilaian");
  await page.waitForURL(/\/penilaian\/[0-9a-f-]{36}/);
  const kelasId = page.url().split("/").pop()!;
  const res = await page.request.get(`/api/ekspor/template/nilai?kelas=${kelasId}`);
  expect(res.status()).toBe(200);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await res.body()) as unknown as ArrayBuffer);
  const ws = wb.worksheets[0]!;
  expect(String(ws.getRow(1).getCell(4).value)).toMatch(/^C1 /);
  expect(ws.rowCount).toBe(6); // header + 5 alternatif
  const barisAditya = [...Array(ws.rowCount).keys()].map((i) => ws.getRow(i + 1)).find((r) => r.getCell(2).value === "24001")!;
  expect(barisAditya.getCell(4).value).toBe(88.5); // nilai yang sudah ada ikut terisi di template

  // Satu nilai di luar batas: tidak ada yang disimpan.
  barisAditya.getCell(4).value = 105;
  barisAditya.getCell(6).value = "Luar Biasa"; // pilihan C3 tidak dikenal
  await page.getByRole("button", { name: "Impor nilai" }).click();
  await unggah(page, "nilai.xlsx", Buffer.from(await wb.xlsx.writeBuffer()));
  await page.getByRole("button", { name: "Impor", exact: true }).click();
  await toast(page, "File berisi data yang tidak valid. Tidak ada yang disimpan.");
  await expect(page.getByText("C1: maksimal 100")).toBeVisible();
  await expect(page.getByText(/C3: pilihan "Luar Biasa" tidak dikenal/)).toBeVisible();

  barisAditya.getCell(4).value = 90.25;
  barisAditya.getCell(6).value = "Baik";
  await unggah(page, "nilai.xlsx", Buffer.from(await wb.xlsx.writeBuffer()));
  await page.getByRole("button", { name: "Impor", exact: true }).click();
  await toast(page, "25 nilai diimpor");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("C1 Aditya Pratama")).toHaveValue("90,25");
  await expect(page.getByRole("combobox", { name: "C3 Aditya Pratama" })).toHaveText(/^Baik/);

  // Impor ulang nilai semula (juga menguji impor berulang menimpa nilai, bukan menggandakan).
  barisAditya.getCell(4).value = 88.5;
  barisAditya.getCell(6).value = "Sangat Baik";
  await page.getByRole("button", { name: "Impor nilai" }).click();
  await unggah(page, "nilai.xlsx", Buffer.from(await wb.xlsx.writeBuffer()));
  await page.getByRole("button", { name: "Impor", exact: true }).click();
  await toast(page, "25 nilai diimpor");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("C1 Aditya Pratama")).toHaveValue("88,5");
  expect(errors).toEqual([]);
  await tutup();
});

test("periode baru: kriteria, sub-kriteria, bobot, alternatif, syarat, hapus", async ({ browser }) => {
  const { page, errors, tutup } = await sebagai(browser, "admin");

  await page.goto("/periode/baru");
  await page.getByLabel("Tahun ajaran").fill("2026/2027");
  await page.getByRole("combobox", { name: "Salin kelas" }).click();
  await page.getByRole("option", { name: "Struktur kelas beserta anggotanya" }).click();
  await page.getByRole("button", { name: "Buat periode" }).click();
  await page.waitForURL(/\/periode\/[0-9a-f-]{36}$/);
  const periodeUrl = page.url();
  await expect(page.getByRole("heading", { name: "Periode 2026/2027 Ganjil" })).toBeVisible();
  await expect(page.getByText("Alternatif minimal 2 siswa")).toBeVisible();

  // Kriteria baru C6 bertipe rentang (cost).
  await page.goto(`${periodeUrl}/kriteria`);
  await expect(page.locator("tbody tr")).toHaveCount(5); // tersalin dari periode sebelumnya
  await page.getByRole("button", { name: "Kriteria baru" }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.getByLabel("Kode")).toHaveValue("C6");
  await dlg.getByLabel("Nama kriteria").fill("Keterlambatan");
  await dlg.getByRole("combobox", { name: "Jenis" }).click();
  await page.getByRole("option", { name: /^Cost/ }).click();
  await dlg.getByRole("combobox", { name: "Tipe input" }).click();
  await page.getByRole("option", { name: "Rentang (dikonversi)" }).click();
  await dlg.getByLabel("Nilai maksimum").fill("200");
  await dlg.getByRole("button", { name: "Simpan" }).click();
  await toast(page, /Kriteria ditambahkan/);
  await expect(page.locator("tbody tr")).toHaveCount(6);

  // Sub-kriteria: rentang tumpang tindih ditolak, lalu diperbaiki.
  await page.getByRole("row", { name: /C6/ }).getByRole("link", { name: "0 sub-kriteria" }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Tambah baris" }).click();
  const isi = async (n: number, label: string, bawah: string, atas: string, nilai: string) => {
    await page.getByLabel(`Label baris ${n}`).fill(label);
    await page.getByLabel(`Batas bawah baris ${n}`).fill(bawah);
    await page.getByLabel(`Batas atas baris ${n}`).fill(atas);
    await page.getByLabel(`Nilai skala baris ${n}`).fill(nilai);
  };
  await isi(1, "Tidak pernah", "0", "0", "1");
  await isi(2, "1-5 kali", "1", "5", "2");
  await isi(3, "Lebih dari 5", "4", "", "3");
  await expect(page.getByText("1-5 kali dan Lebih dari 5 tumpang tindih")).toBeVisible();
  await expect(page.getByRole("button", { name: "Simpan sub-kriteria" })).toBeDisabled();
  await page.getByLabel("Batas bawah baris 3").fill("6");
  await page.getByLabel("Nilai skala baris 2").fill("0");
  await expect(page.getByText("1-5 kali: nilai skala harus lebih dari 0")).toBeVisible();
  await page.getByLabel("Nilai skala baris 2").fill("2");
  await page.getByRole("button", { name: "Simpan sub-kriteria" }).click();
  await toast(page, "Sub-kriteria disimpan");
  await page.reload();
  await expect(page.getByLabel("Label baris 3")).toHaveValue("Lebih dari 5");

  // Bobot: persen dengan total bukan 100 tidak bisa disimpan; skala kepentingan menghasilkan tepat 100.
  await page.goto(`${periodeUrl}/bobot`);
  await expect(page.getByRole("button", { name: "Simpan bobot" })).toBeDisabled(); // C6 masih 0
  await page.getByLabel("Bobot C6 dalam persen").fill("5");
  await expect(page.getByText("lebih 5,00%")).toBeVisible();
  await expect(page.getByRole("button", { name: "Simpan bobot" })).toBeDisabled();
  await page.getByRole("radio", { name: "Skala kepentingan 1-5" }).click();
  await page.getByRole("radiogroup", { name: "Kepentingan C1" }).getByRole("radio", { name: "5" }).click();
  await page.getByRole("radiogroup", { name: "Kepentingan C6" }).getByRole("radio", { name: "1" }).click();
  await expect(page.getByText("100,00%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Simpan bobot" }).click();
  await toast(page, "Bobot kriteria disimpan");
  await page.reload();
  // 5,3,3,3,3,1 dari total 18 (pembulatan sisa terbesar): C1 = 27,78%, C6 = 5,55%, total tepat 100%.
  await expect(page.getByRole("row", { name: /C1/ }).getByText("27,78%")).toBeVisible();
  await expect(page.getByRole("row", { name: /C6/ }).getByText("5,55%")).toBeVisible();
  await expect(page.getByText("100,00%", { exact: true })).toBeVisible();

  // Alternatif: pindah periode kerja, tambah seluruh sekolah, keluarkan satu.
  await page.getByRole("combobox", { name: "Pilih periode kerja" }).click();
  await page.getByRole("option", { name: /2026\/2027 Ganjil/ }).click();
  await page.goto("/alternatif");
  await expect(page.getByText("Belum ada alternatif")).toBeVisible();
  await page.getByRole("button", { name: "Tambah alternatif" }).click();
  await page.getByRole("radio", { name: "Seluruh sekolah" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Tambahkan" }).click();
  await toast(page, "20 siswa ditambahkan sebagai alternatif");
  await expect(page.getByText(/^20 alternatif/)).toBeVisible();
  await page.getByRole("checkbox", { name: "Pilih Eka Wulandari" }).click();
  await page.getByRole("button", { name: "Keluarkan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Keluarkan" }).click();
  await toast(page, "1 alternatif dikeluarkan");
  await expect(page.getByText(/^19 alternatif/)).toBeVisible();
  // Kode diurutkan ulang tanpa celah: A1..A19.
  await expect(page.getByText("A19", { exact: true })).toBeVisible();
  await expect(page.getByText("A20", { exact: true })).toHaveCount(0);

  // Syarat terpenuhi, tetapi periode lain masih aktif: ditolak oleh database.
  await page.goto(periodeUrl);
  await expect(page.getByText("Semua syarat terpenuhi. Penilaian siap dibuka.")).toBeVisible();
  await page.getByRole("button", { name: "Buka penilaian" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Buka penilaian" }).click();
  await toast(page, /Sudah ada periode lain yang sedang aktif/);

  // Bersihkan: hapus periode Draf (alternatif dan kelasnya ikut terhapus).
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Hapus periode" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus" }).click();
  await page.waitForURL(/\/periode$/);
  await expect(page.getByRole("link", { name: "2026/2027 Ganjil" })).toHaveCount(0);
  expect(errors).toEqual([]);
  await tutup();
});

test("reset password: password sementara wajib diganti saat masuk", async ({ browser }) => {
  const { page, errors, tutup } = await sebagai(browser, "admin");
  await page.goto("/pengguna");
  await page.getByRole("button", { name: "Aksi untuk Agus Setiawan, S.Pd." }).click();
  await page.getByRole("menuitem", { name: "Reset password" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reset" }).click();
  const kode = page.getByRole("dialog").locator("code");
  await expect(kode).toHaveText(/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);
  const sementara = (await kode.textContent())!;
  await page.getByRole("button", { name: "Selesai" }).click();
  await expect(page.getByRole("row", { name: /Agus Setiawan/ }).getByText("Wajib ganti password")).toBeVisible();

  // Password lama tidak berlaku lagi.
  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  await p2.goto("/login");
  await p2.getByLabel("Username").fill("wali2");
  await p2.locator('input[name="password"]').fill(PASSWORD_DEMO);
  await p2.getByRole("button", { name: "Masuk" }).click();
  await expect(p2.getByText("Username atau password salah")).toBeVisible();

  // Masuk dengan password sementara: dipaksa ke halaman akun.
  await p2.locator('input[name="password"]').fill(sementara);
  await p2.getByRole("button", { name: "Masuk" }).click();
  await p2.waitForURL(/\/akun\?wajib=1/);
  await p2.goto("/penilaian");
  await p2.waitForURL(/\/akun/);
  await p2.getByLabel("Password saat ini").fill(sementara);
  await p2.getByLabel(/^Password baru/).fill("guru-baru-123");
  await p2.getByLabel("Ulangi password baru").fill("guru-beda-123");
  await p2.getByRole("button", { name: "Ganti password" }).click();
  await expect(p2.getByText("Konfirmasi password tidak sama").first()).toBeVisible();
  // Isian tidak hilang setelah validasi gagal.
  await expect(p2.getByLabel("Password saat ini")).toHaveValue(sementara);
  await expect(p2.getByLabel(/^Password baru/)).toHaveValue("guru-baru-123");
  await p2.getByLabel("Ulangi password baru").fill("guru-baru-123");
  await p2.getByRole("button", { name: "Ganti password" }).click();
  await p2.waitForURL(/\/dashboard/);
  await p2.goto("/penilaian");
  await expect(p2.getByRole("heading", { name: "Penilaian XI IPA 2" })).toBeVisible();
  await ctx.close();
  expect(errors).toEqual([]);
  await tutup();
});

test("audit log: filter aksi dan rentang tanggal", async ({ browser }) => {
  const { page, errors, tutup } = await sebagai(browser, "admin");
  await page.goto("/audit");
  await page.getByRole("combobox", { name: "Aksi" }).click();
  await page.getByRole("option", { name: "Aksi: PENGGUNA_RESET_PASSWORD" }).click();
  await page.waitForURL(/aksi=PENGGUNA_RESET_PASSWORD/);
  const aksi = await page.locator("tbody tr td:nth-child(3)").allInnerTexts();
  expect(aksi.length).toBeGreaterThan(0);
  expect(new Set(aksi)).toEqual(new Set(["PENGGUNA_RESET_PASSWORD"]));

  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  await page.goto(`/audit?dari=${hariIni}&sampai=${hariIni}`);
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.goto("/audit?dari=2000-01-01&sampai=2000-01-02");
  await expect(page.getByText("Tidak ada catatan")).toBeVisible();
  expect(errors).toEqual([]);
  await tutup();
});

test("laporan: PDF cetak berisi kop, peringkat, tanda tangan, tanpa menu aplikasi", async ({ browser }) => {
  const { page, errors, tutup } = await sebagai(browser, "admin");
  await page.goto("/laporan");
  const baris = page.getByRole("row", { name: /2025\/2026 Ganjil/ });
  await expect(baris.getByText("Disahkan")).toBeVisible();
  await baris.getByRole("link", { name: "Pratinjau" }).click();
  await page.waitForURL(/\/cetak/);
  await page.goto(`${page.url()}?lampiran=1`);
  // Laporan dikirim bertahap (streaming); cetak setelah isinya lengkap.
  await expect(page.getByText("Lampiran: matriks keputusan X dan normalisasi R")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  const pdf = join(tmp, "laporan.pdf");
  writeFileSync(pdf, await page.pdf({ format: "A4", printBackground: true }));
  const halaman = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())?.[1]);
  const teks = execFileSync("pdftotext", ["-layout", pdf, "-"]).toString();
  expect(halaman).toBeGreaterThanOrEqual(2); // peringkat + lampiran matriks
  for (const t of ["SMA NEGERI 1 NUSANTARA", "HASIL SELEKSI SISWA BERPRESTASI", "DISAHKAN", "Kepala Sekolah", "NIP 196805121994031005", "Lampiran"]) {
    expect(teks).toContain(t);
  }
  for (const nama of ["Citra Maharani", "Taufik Hidayat", "Maya Anggraini"]) expect(teks).toContain(nama);
  expect(teks.match(/Terpilih/g)?.length).toBe(3); // kuota 3
  for (const menu of ["Menu utama", "Data Siswa", "Perhitungan SAW", "Cetak / simpan PDF"]) expect(teks).not.toContain(menu);
  expect(errors).toEqual([]);
  await tutup();
});

test("ekspor Excel hasil: 4 sheet, angka sama dengan halaman hasil; wali hanya kelasnya", async ({ browser }) => {
  const { page, errors, tutup } = await sebagai(browser, "admin");
  await page.goto("/laporan");
  const href = await page.getByRole("row", { name: /2025\/2026 Ganjil/ }).getByRole("link", { name: "Excel" }).getAttribute("href");
  const res = await page.request.get(href!);
  expect(res.headers()["content-type"]).toContain("spreadsheetml");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await res.body()) as unknown as ArrayBuffer);
  expect(wb.worksheets.map((w) => w.name)).toEqual(["Kriteria", "Matriks X", "Normalisasi R", "Hasil"]);
  const kriteria = wb.getWorksheet("Kriteria")!;
  let totalBobot = 0;
  kriteria.eachRow((r, i) => {
    if (i > 1) totalBobot += Number(r.getCell(4).value);
  });
  expect(totalBobot).toBe(100);
  const hasil = wb.getWorksheet("Hasil")!;
  expect(hasil.rowCount).toBe(21);
  const juara = hasil.getRow(2);
  expect(juara.getCell(2).value).toBe(1);
  // Nilai V di Excel sama dengan yang tampil di halaman hasil periode itu.
  await page.getByRole("combobox", { name: "Pilih periode kerja" }).click();
  await page.getByRole("option", { name: /2025\/2026 Ganjil/ }).click();
  await page.goto("/hasil");
  const vHalaman = await page.locator("tbody tr").first().locator("td").nth(4).innerText();
  expect(Number(juara.getCell(7).value).toFixed(4).replace(".", ",")).toBe(vHalaman);
  await tutup();

  // Wali kelas: hanya siswa kelasnya; template siswa (khusus admin) ditolak.
  const w = await sebagai(browser, "wali1");
  const resW = await w.page.request.get(href!);
  const wbW = new ExcelJS.Workbook();
  await wbW.xlsx.load((await resW.body()) as unknown as ArrayBuffer);
  const kelasW = new Set<string>();
  wbW.getWorksheet("Hasil")!.eachRow((r, i) => {
    if (i > 1) kelasW.add(String(r.getCell(6).value));
  });
  expect([...kelasW]).toEqual(["XI IPA 1"]);
  expect((await w.page.request.get("/api/ekspor/template/siswa")).status()).toBe(403);
  await w.tutup();
  expect(errors).toEqual([]);
});
