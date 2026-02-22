import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, LegacyAuthSchema } from "@/lib/validations";
import crypto from "crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const AUTH_SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString("hex");

function generateAuthToken(): string {
  const timestamp = Date.now().toString();
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(timestamp).digest("hex");
  return `${timestamp}.${signature}`;
}

export function verifyAuthToken(token: string): boolean {
  if (!token || !token.includes(".")) return false;
  const [timestamp, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", AUTH_SECRET).update(timestamp).digest("hex");
  if (signature !== expectedSignature) return false;
  // Token expires after 8 hours
  const tokenAge = Date.now() - parseInt(timestamp);
  return tokenAge < 8 * 60 * 60 * 1000;
}

export async function POST(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "auth");
  if (!rateLimit.success) return rateLimit.response;

  try {
    if (!ADMIN_PASSWORD) {
      console.error("ADMIN_PASSWORD environment variable not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = await req.json();
    const validation = validateBody(LegacyAuthSchema, body);
    if (!validation.success) return validation.response;

    const { password } = validation.data;

    if (password === ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true });
      const authToken = generateAuthToken();

      response.cookies.set("admin_auth", authToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 8, // 8 hours
        path: "/",
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    console.error("Auth error");
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_auth", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}
