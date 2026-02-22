import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "auth");
  if (!rateLimit.success) return rateLimit.response;

  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Find the password reset record
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Check if token has been used
    if (resetRecord.used) {
      return NextResponse.json(
        { error: "This reset link has already been used" },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date() > resetRecord.expiresAt) {
      return NextResponse.json(
        { error: "This reset link has expired" },
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update user's password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
