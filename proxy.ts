import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

const AUTH_SECRET = process.env.AUTH_SECRET || "";

// Allowed origins for CSRF protection
const ALLOWED_ORIGINS = [
  "https://herabooking.com",
  "https://www.herabooking.com",
  process.env.NEXT_PUBLIC_BASE_URL,
].filter(Boolean) as string[];

// Security headers
const securityHeaders: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.resend.com https://*.vercel.app",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

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

// Add security headers to response
function addSecurityHeaders(response: NextResponse, isProduction: boolean): void {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  if (isProduction) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
}

// Check CSRF for API routes
function checkCSRF(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || "";

  // Skip CSRF check for localhost
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return null;
  }

  // If origin header is present, validate it
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed));
    if (!isAllowed) {
      return new NextResponse(
        JSON.stringify({ error: "Forbidden - Invalid origin" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return null; // CSRF check passed
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const host = request.headers.get("host") || "";
  const isProduction = !host.includes("localhost") && !host.includes("127.0.0.1");

  // Handle API routes - add CSRF protection for mutating methods
  if (pathname.startsWith("/api")) {
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      const csrfError = checkCSRF(request);
      if (csrfError) {
        addSecurityHeaders(csrfError, isProduction);
        return csrfError;
      }
    }
    const response = NextResponse.next();
    addSecurityHeaders(response, isProduction);
    return response;
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  addSecurityHeaders(response, isProduction);

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
  matcher: [
    // Auth pages
    "/login",
    "/signup",
    // Admin routes
    "/:slug/admin/:path*",
    // API routes (for CSRF protection and security headers)
    "/api/:path*",
  ],
};
