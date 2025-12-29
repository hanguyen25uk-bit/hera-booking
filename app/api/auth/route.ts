import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "hera2025";

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (password === ADMIN_PASSWORD) {
      const sessionToken = generateSessionToken();

      const response = NextResponse.json({ success: true });

      response.cookies.set("admin_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("admin_session");
  return response;
}
