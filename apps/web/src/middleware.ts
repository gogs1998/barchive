import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware: protect routes that require authentication.
 *
 * Protected routes: /my-bar, /my-bar/*, /profile, /profile/*
 *
 * The backend (BAR-35) sets an httpOnly `access_token` cookie on login.
 * Next.js Edge middleware can read httpOnly cookies, so we gate on its
 * presence. A missing or expired token causes a redirect to /?auth=login
 * (which the AuthModal picks up to auto-open the login view).
 *
 * Note: the client-side auth context does a getMe() on mount as the
 * authoritative check. This middleware is a first-pass redirect that
 * avoids a flash of protected content for clearly-unauthenticated users.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const PROTECTED = ["/my-bar", "/profile"];
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token");
  if (!token) {
    const loginUrl = new URL("/?auth=login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/my-bar/:path*", "/profile/:path*"],
};
