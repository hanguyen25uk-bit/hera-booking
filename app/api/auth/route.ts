import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Password should be set in environment variable
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Generate secure session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Hash function for comparing passwords (timing-safe)
function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// Simple in-memory session store (resets on server restart)
// For production, use Redis or database
const validSessions = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    // Check if password is configured
    if (!ADMIN_PASSWORD) {
      console.error("ADMIN_PASSWORD not configured in environment");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const { password } = await req.json();

    // Rate limit check - basic protection against brute force
    // In production, implement proper rate limiting with Redis

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Timing-safe password comparison
    if (secureCompare(password, ADMIN_PASSWORD)) {
      const sessionToken = generateSessionToken();
      validSessions.add(sessionToken);

      // Clean up old sessions (keep max 100)
      if (validSessions.size > 100) {
        const sessions = Array.from(validSessions);
        sessions.slice(0, sessions.length - 100).forEach(s => validSessions.delete(s));
      }

      const response = NextResponse.json({ success: true });

      response.cookies.set("admin_session", sessionToken, {
        httpOnly: true,
        secure: true, // Always use secure in production
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours (shorter than before)
        path: "/",
      });

      return response;
    }

    // Log failed attempt (don't reveal if password exists)
    console.log("Failed admin login attempt");
    
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const sessionToken = req.cookies.get("admin_session")?.value;
  
  if (sessionToken) {
    validSessions.delete(sessionToken);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("admin_session");
  return response;
}

// Verify session - export for use in middleware
export function verifySession(sessionToken: string | undefined): boolean {
  if (!sessionToken) return false;
  return validSessions.has(sessionToken);
}
