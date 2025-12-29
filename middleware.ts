import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect admin routes
  if (path.startsWith("/admin")) {
    const sessionToken = request.cookies.get("admin_session")?.value;

    // Check if session exists and is valid format (64 hex chars)
    const isValidFormat = sessionToken && /^[a-f0-9]{64}$/.test(sessionToken);

    if (!isValidFormat) {
      // Redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect admin API routes (except auth)
  if (path.startsWith("/api/admin") && !path.startsWith("/api/auth")) {
    const sessionToken = request.cookies.get("admin_session")?.value;
    const isValidFormat = sessionToken && /^[a-f0-9]{64}$/.test(sessionToken);

    if (!isValidFormat) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
