import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authEnabled, sessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // No password configured → app is open (LAN-only mode).
  if (!authEnabled()) return NextResponse.next();

  // Only the messenger app and its data APIs are gated. The landing page,
  // login page, and login API are public (and crawlable for SEO).
  const isProtected =
    pathname.startsWith("/app") ||
    (pathname.startsWith("/api/") && pathname !== "/api/login");
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const valid = token && token === (await sessionToken());
  if (valid) return NextResponse.next();

  // Unauthenticated: 401 for APIs, redirect to /login for pages.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
