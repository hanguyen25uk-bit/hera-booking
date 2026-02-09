import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

const AUTH_SECRET = process.env.AUTH_SECRET || "";

type TokenPayload = {
  salonId: string;
  salonSlug: string;
  userId: string;
  timestamp: number;
};

// Verify new salon_auth token (with salonId)
function verifySalonToken(token: string): TokenPayload | null {
  if (!token || !token.includes(".") || !AUTH_SECRET) return null;
  const [encoded, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", AUTH_SECRET).update(encoded).digest("hex");
  if (signature !== expectedSignature) return null;
  try {
    const dataStr = Buffer.from(encoded, "base64url").toString();
    const data: TokenPayload = JSON.parse(dataStr);
    const tokenAge = Date.now() - data.timestamp;
    if (tokenAge > 8 * 60 * 60 * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes - they handle their own auth
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Development bypass - skip auth check on localhost
  const host = request.headers.get("host") || "";
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    const response = NextResponse.next();
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return response;
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Get auth token
  const salonAuthCookie = request.cookies.get("salon_auth");
  const salonAuth = salonAuthCookie?.value ? verifySalonToken(salonAuthCookie.value) : null;

  // Handle global login page
  if (pathname === "/login") {
    if (salonAuth) {
      // Already logged in, redirect to their salon admin
      return NextResponse.redirect(new URL(`/${salonAuth.salonSlug}/admin`, request.url));
    }
    return response;
  }

  // Handle signup page - always accessible
  if (pathname === "/signup") {
    return response;
  }

  // Handle per-salon admin routes: /[slug]/admin/*
  const slugAdminMatch = pathname.match(/^\/([^\/]+)\/admin(\/.*)?$/);
  if (slugAdminMatch) {
    const urlSlug = slugAdminMatch[1];

    // Check if authenticated for this salon
    if (salonAuth && salonAuth.salonSlug === urlSlug) {
      return response;
    }

    // Not authenticated for this salon, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/login", "/signup", "/:slug/admin/:path*"],
};
