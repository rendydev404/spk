import { customType } from "drizzle-orm/pg-core";

/** Teks case-insensitive (butuh ekstensi citext). */
export const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});
