import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/email";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, ForgotPasswordSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";
import crypto from "crypto";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "auth");
  if (!rateLimit.success) return rateLimit.response;

  const body = await req.json();
    const validation = validateBody(ForgotPasswordSchema, body);
    if (!validation.success) return validation.response;

    const { email } = validation.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
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
});
