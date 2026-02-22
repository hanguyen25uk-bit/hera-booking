import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { generateSalonToken } from "@/lib/admin-auth";
import { applyRateLimit } from "@/lib/rate-limit";
import { validateBody, SignupSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-handler";
import { checkBotSubmission, getFakeSuccessResponse } from "@/lib/bot-protection";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const rateLimit = applyRateLimit(req, "auth");
  if (!rateLimit.success) return rateLimit.response;

  const body = await req.json();

  // Bot protection check
  const botCheck = checkBotSubmission({
    website: body.website,
    _formLoadedAt: body._formLoadedAt,
  });
  if (botCheck.isBot) {
    // Return fake success to trick bots
    return NextResponse.json(getFakeSuccessResponse('signup'));
  }

  const validation = validateBody(SignupSchema, body);
  if (!validation.success) return validation.response;

    const { email, password, name, salonName } = validation.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = generateSlug(salonName);
    let slugSuffix = 0;
    let uniqueSlug = slug;

    while (true) {
      const existingSalon = await prisma.salon.findUnique({
        where: { slug: uniqueSlug },
      });
      if (!existingSalon) break;
      slugSuffix++;
      uniqueSlug = `${slug}-${slugSuffix}`;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create salon and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create salon
      const salon = await tx.salon.create({
        data: {
          slug: uniqueSlug,
          name: salonName,
          email,
        },
      });

      // Create user linked to salon
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          salonId: salon.id,
        },
      });

      // Create default booking policy
      await tx.bookingPolicy.create({
        data: {
          salonId: salon.id,
          title: "Our Booking Policy",
          policies: JSON.stringify([
            { icon: "💳", title: "Payment", description: "Payment is due at the end of your appointment." },
            { icon: "⏰", title: "Cancellation", description: "Please give at least 24 hours notice for cancellations." },
            { icon: "🚫", title: "No-Show Policy", description: "After 3 no-shows, booking will be restricted." },
          ]),
        },
      });

      return { salon, user };
    });

    // Generate auth token
    const token = generateSalonToken({
      salonId: result.salon.id,
      salonSlug: result.salon.slug,
      userId: result.user.id,
    });

    const response = NextResponse.json({
      success: true,
      salon: {
        id: result.salon.id,
        slug: result.salon.slug,
        name: result.salon.name,
      },
      redirectUrl: `/${result.salon.slug}/admin`,
    });

    // Set auth cookie
    response.cookies.set("salon_auth", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

  return response;
});
