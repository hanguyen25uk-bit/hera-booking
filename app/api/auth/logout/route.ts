import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "api");
  if (!rateLimit.success) return rateLimit.response;
  const response = NextResponse.json({ success: true });

  // Clear the salon_auth cookie
  response.cookies.set("salon_auth", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  // Also clear legacy admin_auth cookie
  response.cookies.set("admin_auth", "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return response;
}
