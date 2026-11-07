import { defineConfig } from "@playwright/test";

// PW_CHROMIUM_PATH: opsional, pakai Chromium yang sudah terpasang bila revisi bawaan belum diunduh.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 300_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    headless: true,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    navigationTimeout: 90_000,
    launchOptions: executablePath ? { executablePath } : {},
    screenshot: "only-on-failure",
  },
  outputDir: "test-results",
});
