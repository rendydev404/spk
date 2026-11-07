import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL belum diatur");

// Satu pool per proses; di dev, simpan di globalThis agar HMR tidak membuat pool baru.
const g = globalThis as unknown as { __spkSql?: postgres.Sql };
export const sql =
  g.__spkSql ??
  postgres(url, {
    max: 10,
    idle_timeout: 20,
    // numeric dikembalikan sebagai string agar tidak kehilangan presisi
  });
if (process.env.NODE_ENV !== "production") g.__spkSql = sql;

export const db = drizzle(sql, { schema, casing: "snake_case" });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
