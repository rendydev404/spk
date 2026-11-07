import { chromium, type FullConfig } from "@playwright/test";
import { PASSWORD_DEMO, ROLES } from "./helpers";

/** Login sekali per peran dan simpan sesinya, agar tes tidak terkena rate limit login. */
export default async function globalSetup(config: FullConfig) {
  const { baseURL, launchOptions } = config.projects[0]!.use;
  const browser = await chromium.launch(launchOptions);
  for (const role of ROLES) {
    const page = await browser.newPage({ baseURL });
    await page.goto("/login");
    await page.getByLabel("Username").fill(role);
    await page.locator('input[name="password"]').fill(PASSWORD_DEMO);
    await page.getByRole("button", { name: "Masuk" }).click();
    await page.waitForURL(/\/(dashboard|penilaian)/);
    await page.context().storageState({ path: `test-results/.auth-${role}.json` });
    await page.close();
  }
  await browser.close();
}
