import { type Browser, expect, type Page } from "@playwright/test";

// Akun demo dari seed (src/db/seed/dev.ts).
export const PASSWORD_DEMO = "spk-demo-2026";
export const ROLES = ["admin", "kepsek", "wali1"] as const;
export type Peran = (typeof ROLES)[number];

/** Halaman baru dengan sesi peran tertentu (dibuat di global-setup). */
export async function sebagai(browser: Browser, peran: Peran) {
  const ctx = await browser.newContext({ storageState: `test-results/.auth-${peran}.json` });
  const page = await ctx.newPage();
  const errors = pantauError(page);
  return { page, errors, tutup: () => ctx.close() };
}

/** Kumpulkan error konsol dan error halaman selama tes. */
export function pantauError(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return errors;
}

export async function tanpaErrorHalaman(page: Page) {
  await expect(page.getByText("Halaman gagal dimuat")).toHaveCount(0);
  await expect(page.getByText("Data tidak ditemukan")).toHaveCount(0);
}
