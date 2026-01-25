import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

const AUTH_SECRET = process.env.AUTH_SECRET || "";

function verifyAuthToken(token: string): boolean {
  if (!token || !token.includes(".") || !AUTH_SECRET) return false;
  const [timestamp, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", AUTH_SECRET).update(timestamp).digest("hex");
  if (signature !== expectedSignature) return false;
  const tokenAge = Date.now() - parseInt(timestamp);
  return tokenAge < 8 * 60 * 60 * 1000; // 8 hours
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get("admin_auth");
  const isAuthenticated = authCookie?.value ? verifyAuthToken(authCookie.value) : false;

  // Add security headers
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return response;
  }

  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
