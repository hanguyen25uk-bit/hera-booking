import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/email";
import { applyRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "auth");
  if (!rateLimit.success) return rateLimit.response;

  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Create password reset record
    await prisma.passwordReset.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Send password reset email
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetToken: token,
    });

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
