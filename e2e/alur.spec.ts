import { expect, test } from "@playwright/test";
import { type Peran, sebagai } from "./helpers";

// Alur end-to-end PLAN 16: input nilai, tutup penilaian, hitung, ajukan, tolak, hitung ulang, setujui, cetak.
// Membutuhkan seed demo segar (npm run db:seed): periode 2025/2026 Genap berstatus Penilaian.
test.describe.configure({ mode: "serial" });

test("alur lengkap seleksi", async ({ browser }) => {
  const errors: string[] = [];
  let sesi: Awaited<ReturnType<typeof sebagai>> | null = null;
  const masuk = async (peran: Peran) => {
    await sesi?.tutup();
    sesi = await sebagai(browser, peran);
    sesi.page.on("pageerror", (e) => errors.push(e.message));
    await sesi.page.goto("/dashboard");
    return sesi.page;
  };
  let page = await masuk("wali1");

  // Wali kelas mengubah satu nilai lalu mengembalikannya (grid + simpan massal).
  await page.goto("/penilaian");
  const sel = page.getByLabel("C1 Aditya Pratama");
  await expect(sel).toHaveValue("88,5");
  await sel.fill("105");
  await expect(page.getByText("Maks. 100")).toBeVisible();
  await sel.fill("88,5");
  await sel.fill("88,6");
  await expect(page.getByText("1 sel berubah, belum disimpan")).toBeVisible();
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText("1 nilai disimpan")).toBeVisible();
  await page.getByLabel("C1 Aditya Pratama").fill("88,5");
  await page.keyboard.press("Control+s");
  await expect(page.getByText("1 nilai disimpan")).toBeVisible();

  // Admin menutup penilaian dan menghitung per kelas.
  page = await masuk("admin");
  await page.goto("/periode");
  await page.getByRole("link", { name: "2025/2026 Genap" }).click();
  await page.getByRole("button", { name: "Tutup penilaian" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Tutup penilaian" }).click();
  await expect(page.getByText("Status periode diperbarui")).toBeVisible();

  await page.goto("/perhitungan");
  await page.getByRole("radio", { name: "Per kelas" }).click();
  await page.getByRole("button", { name: "Hitung dengan SAW" }).click();
  await page.waitForURL(/\/perhitungan\/[0-9a-f-]{36}/);
  // Golden test PLAN 3.3: kelas XI IPA 1 berisi data contoh, urutan A3, A1, A4, A2, A5.
  await page.getByRole("combobox", { name: "Kelompok" }).click();
  await page.getByRole("option", { name: /XI IPA 1/ }).click();
  await page.waitForURL(/kelompok=XI/);
  const baris = page.getByRole("tabpanel").locator("tbody tr");
  await expect(baris).toHaveCount(5);
  const nama = await baris.locator("td:nth-child(2)").allInnerTexts();
  expect(nama.map((n) => n.split(" ").slice(1).join(" "))).toEqual([
    "Citra Maharani",
    "Aditya Pratama",
    "Dimas Saputra",
    "Bunga Lestari",
    "Eka Wulandari",
  ]);
  await expect(baris.first().locator("td").last()).toHaveText("0,8796");

  await page.getByRole("button", { name: "Ajukan ke kepala sekolah" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ajukan" }).click();
  await expect(page.getByText("Hasil diajukan ke kepala sekolah")).toBeVisible();
  const runUrl = page.url().split("?")[0]!;

  // Kepsek menolak dengan catatan.
  page = await masuk("kepsek");
  await expect(page.getByText("1 hasil menunggu validasi Anda")).toBeVisible();
  await page.goto("/validasi");
  await page.getByRole("button", { name: "Tolak" }).click();
  await page.getByLabel(/Catatan untuk admin/).fill("Mohon hitung untuk seluruh sekolah.");
  await page.getByRole("dialog").getByRole("button", { name: "Tolak" }).click();
  await expect(page.getByText("Hasil ditolak dan dikembalikan ke admin.")).toBeVisible();

  // Admin menghitung ulang (seluruh sekolah) dan mengajukan lagi.
  page = await masuk("admin");
  await page.goto(runUrl);
  await expect(page.getByText("Mohon hitung untuk seluruh sekolah.")).toBeVisible();
  await page.goto("/perhitungan");
  await page.getByRole("radio", { name: "Seluruh sekolah" }).click();
  await page.getByRole("button", { name: "Hitung dengan SAW" }).click();
  await page.waitForURL(/\/perhitungan\/[0-9a-f-]{36}/);
  await expect(page.getByRole("tabpanel").locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Ajukan ke kepala sekolah" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ajukan" }).click();
  await expect(page.getByText("Hasil diajukan ke kepala sekolah")).toBeVisible();

  // Kepsek menyetujui: periode FINAL.
  page = await masuk("kepsek");
  await page.goto("/validasi");
  await page.getByRole("button", { name: "Setujui" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Setujui" }).click();
  await expect(page.getByText("Hasil disahkan. Periode menjadi Final.")).toBeVisible();
  await page.goto("/hasil");
  await expect(page.getByText("Siswa berprestasi").first()).toBeVisible();
  await page.goto("/laporan");
  await page.getByRole("link", { name: "Pratinjau" }).first().click();
  await expect(page.getByText("Disahkan", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Hasil Seleksi Siswa Berprestasi")).toBeVisible();

  // Wali kelas melihat hasil kelasnya; nilai sudah terkunci.
  page = await masuk("wali1");
  await page.goto("/hasil");
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.goto("/penilaian");
  await expect(page.getByText("Nilai hanya bisa diubah saat periode berstatus Penilaian.")).toBeVisible();

  expect(errors).toEqual([]);
  await (sesi as Awaited<ReturnType<typeof sebagai>> | null)?.tutup();
});
