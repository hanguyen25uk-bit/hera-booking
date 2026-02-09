import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";
import { generateSalonToken } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { salon: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.salon) {
      return NextResponse.json(
        { error: "No salon associated with this account" },
        { status: 400 }
      );
    }

    // Generate auth token
    const token = generateSalonToken({
      salonId: user.salon.id,
      salonSlug: user.salon.slug,
      userId: user.id,
    });

    const response = NextResponse.json({
      success: true,
      salon: {
        id: user.salon.id,
        slug: user.salon.slug,
        name: user.salon.name,
      },
      redirectUrl: `/${user.salon.slug}/admin`,
    });

    // Set auth cookie
    response.cookies.set("salon_auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
