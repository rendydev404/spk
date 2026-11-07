"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/rbac";
import { COOKIE_PERIODE } from "./kerja";

export async function pilihPeriodeKerja(id: string) {
  await requireUser();
  const pid = z.string().uuid().parse(id);
  (await cookies()).set(COOKIE_PERIODE, pid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  revalidatePath("/", "layout");
}
