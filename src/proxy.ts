import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

/** Pengecekan cepat: hanya keberadaan cookie sesi. Validasi sesi dan role dilakukan di server. */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const publik = pathname === "/login" || pathname.startsWith("/api/auth");
  if (!publik && !getSessionCookie(req)) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("ke", pathname);
    return NextResponse.redirect(url);
  }
  const h = new Headers(req.headers);
  h.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: h } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico|webp)$).*)"],
};
