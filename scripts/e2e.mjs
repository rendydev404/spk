/**
 * Menjalankan E2E di database dan server TERPISAH agar data utama tidak tersentuh:
 * 1. buat database <nama>_e2e jika belum ada, 2. migrasi + seed demo, 3. jalankan `next start` di port 3200,
 * 4. jalankan Playwright, 5. matikan server. Butuh `npm run build` lebih dulu.
 * Pemakaian: node --env-file=.env scripts/e2e.mjs [argumen playwright]
 */
import { spawn, spawnSync } from "node:child_process";
import postgres from "postgres";

const utama = new URL(process.env.DATABASE_URL ?? "");
const namaDb = `${utama.pathname.slice(1)}_e2e`;
const urlE2e = new URL(utama);
urlE2e.pathname = `/${namaDb}`;
const PORT = 3200;

const admin = postgres(utama.toString(), { max: 1, onnotice: () => {} });
const [ada] = await admin`select 1 from pg_database where datname = ${namaDb}`;
if (!ada) await admin.unsafe(`create database "${namaDb}"`);
await admin.end();

const env = {
  ...process.env,
  DATABASE_URL: urlE2e.toString(),
  BETTER_AUTH_URL: `http://localhost:${PORT}`,
  AUTH_RATE_LIMIT: "off",
  E2E_BASE_URL: `http://localhost:${PORT}`,
};
for (const skrip of ["src/db/migrate.ts", "src/db/seed/dev.ts"]) {
  const r = spawnSync(process.execPath, [skrip], { env, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env, stdio: ["ignore", "ignore", "inherit"] });
const batas = Date.now() + 60_000;
for (;;) {
  try {
    await fetch(`http://localhost:${PORT}/login`);
    break;
  } catch {
    if (Date.now() > batas) {
      server.kill();
      throw new Error("Server tes tidak menyala dalam 60 detik. Sudah menjalankan npm run build?");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

const tes = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], { env, stdio: "inherit" });
server.kill();
process.exit(tes.status ?? 1);
