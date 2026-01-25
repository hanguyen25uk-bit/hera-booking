import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

const AUTH_SECRET = process.env.AUTH_SECRET || "";

export type TokenPayload = {
  salonId: string;
  salonSlug: string;
  userId: string;
  timestamp: number;
};

export function generateSalonToken(payload: Omit<TokenPayload, "timestamp">): string {
  const data = {
    ...payload,
    timestamp: Date.now(),
  };
  const dataStr = JSON.stringify(data);
  const encoded = Buffer.from(dataStr).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(encoded).digest("hex");
  return `${encoded}.${signature}`;
}

export function verifySalonToken(token: string): TokenPayload | null {
  if (!token || !token.includes(".") || !AUTH_SECRET) return null;

  const [encoded, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", AUTH_SECRET).update(encoded).digest("hex");

  if (signature !== expectedSignature) return null;

  try {
    const dataStr = Buffer.from(encoded, "base64url").toString();
    const data: TokenPayload = JSON.parse(dataStr);

    // Token expires after 8 hours
    const tokenAge = Date.now() - data.timestamp;
    if (tokenAge > 8 * 60 * 60 * 1000) return null;

    return data;
  } catch {
    return null;
  }
}

export async function getAuthPayload(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("salon_auth");
  if (!authCookie?.value) return null;
  return verifySalonToken(authCookie.value);
}

export async function checkSalonAuth(requiredSlug?: string): Promise<TokenPayload | null> {
  const payload = await getAuthPayload();
  if (!payload) return null;

  // If a specific slug is required, verify it matches
  if (requiredSlug && payload.salonSlug !== requiredSlug) return null;

  return payload;
}

// Legacy function for backwards compatibility during migration
export async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();

  // Check new salon_auth cookie first
  const salonAuthCookie = cookieStore.get("salon_auth");
  if (salonAuthCookie?.value) {
    const payload = verifySalonToken(salonAuthCookie.value);
    if (payload) return true;
  }

  // Fall back to old admin_auth cookie
  const adminAuthCookie = cookieStore.get("admin_auth");
  if (adminAuthCookie?.value) {
    return verifyLegacyToken(adminAuthCookie.value);
  }

  return false;
}

function verifyLegacyToken(token: string): boolean {
  if (!token || !token.includes(".") || !AUTH_SECRET) return false;
  const [timestamp, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", AUTH_SECRET).update(timestamp).digest("hex");
  if (signature !== expectedSignature) return false;
  const tokenAge = Date.now() - parseInt(timestamp);
  return tokenAge < 8 * 60 * 60 * 1000;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}
