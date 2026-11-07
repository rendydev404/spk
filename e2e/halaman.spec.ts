import { expect, test } from "@playwright/test";
import { sebagai, tanpaErrorHalaman } from "./helpers";

const HALAMAN_ADMIN = [
  "/dashboard",
  "/siswa",
  "/kelas",
  "/periode",
  "/alternatif",
  "/penilaian",
  "/perhitungan",
  "/hasil",
  "/validasi",
  "/laporan",
  "/pengguna",
  "/audit",
  "/pengaturan",
  "/akun",
];

test("admin: semua halaman utama terbuka tanpa error", async ({ browser }) => {
  const { page, errors, tutup } = await sebagai(browser, "admin");
  for (const url of HALAMAN_ADMIN) {
    await page.goto(url);
    await tanpaErrorHalaman(page);
    await expect(page.locator("h1").first()).toBeVisible();
  }
  // Halaman kriteria dan bobot memakai periode kerja dari sidebar.
  await page.getByRole("navigation", { name: "Menu utama" }).getByRole("link", { name: "Kriteria", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kriteria penilaian" })).toBeVisible();
  await page.getByRole("navigation", { name: "Menu utama" }).getByRole("link", { name: "Bobot Kriteria" }).click();
  await expect(page.getByRole("heading", { name: "Bobot kriteria" })).toBeVisible();
  await expect(page.getByText("100,00%")).toBeVisible();
  expect(errors).toEqual([]);
  await tutup();
});

test("wali kelas: hanya kelasnya, halaman admin ditolak", async ({ browser }) => {
  const { page, errors, tutup } = await sebagai(browser, "wali1");
  await page.goto("/penilaian");
  await expect(page.getByRole("heading", { name: "Penilaian XI IPA 1" })).toBeVisible();
  await page.goto("/pengguna");
  await expect(page.getByRole("heading", { name: "Akses ditolak" })).toBeVisible();
  await page.goto("/perhitungan");
  await expect(page.getByRole("heading", { name: "Akses ditolak" })).toBeVisible();
  await page.goto("/kelas");
  await expect(page.getByRole("link", { name: "XI IPA 2" })).toHaveCount(0);
  expect(errors).toEqual([]);
  await tutup();
});

test("kepsek: bisa melihat, tidak bisa input", async ({ browser }) => {
  const { page, tutup } = await sebagai(browser, "kepsek");
  await page.goto("/penilaian");
  await page.getByRole("link", { name: /XI IPA 1/ }).click();
  await expect(page.getByText("Tampilan baca saja.")).toBeVisible();
  await page.goto("/pengguna");
  await expect(page.getByRole("heading", { name: "Akses ditolak" })).toBeVisible();
  await tutup();
});

test("login salah ditolak dengan pesan generik", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.locator('input[name="password"]').fill("salah-sekali");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByText("Username atau password salah")).toBeVisible();
});
