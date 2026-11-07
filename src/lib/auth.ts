import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins/username";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "./env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
    },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    // Sesi berakhir setelah 8 jam tanpa aktivitas; diperpanjang paling sering tiap 15 menit.
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 15,
  },
  user: {
    additionalFields: {
      role: { type: "string", input: false, required: false },
      aktif: { type: "boolean", input: false, required: false },
      wajibGantiPassword: { type: "boolean", input: false, required: false },
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/username": { window: 60, max: 5 },
      "/sign-in/email": { window: 60, max: 5 },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (s) => {
          const [u] = await db
            .select({ aktif: schema.user.aktif })
            .from(schema.user)
            .where(eq(schema.user.id, s.userId));
          if (!u?.aktif) return false;
          return { data: s };
        },
      },
    },
  },
  plugins: [username({ minUsernameLength: 3, maxUsernameLength: 32 }), nextCookies()],
});
