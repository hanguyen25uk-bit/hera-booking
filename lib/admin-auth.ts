import { cookies } from "next/headers";
import { NextResponse } from "next/server";
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

export async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("admin_auth");
  if (!authCookie?.value) return false;
  return verifyAuthToken(authCookie.value);
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}
