import { NextRequest, NextResponse } from "next/server";
import { sendReceiptPdf } from "@/lib/email";
import { getAuthPayload, checkAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rateLimit = applyRateLimit(req, "admin");
  if (!rateLimit.success) return rateLimit.response;

  try {
    // Verify admin is logged in (support both new and legacy auth)
    const auth = await getAuthPayload();
    const isLegacyAuth = await checkAdminAuth();

    if (!auth?.salonId && !isLegacyAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get salon - either from auth token or default salon for legacy auth
    let salon;
    if (auth?.salonId) {
      salon = await prisma.salon.findUnique({
        where: { id: auth.salonId },
        select: { name: true },
      });
    } else {
      // Legacy auth - get default salon
      salon = await prisma.salon.findFirst({
        select: { name: true },
      });
    }

    const body = await req.json();
    const { customerEmail, customerName, pdfBase64, receiptNumber } = body;

    if (!customerEmail || !pdfBase64 || !receiptNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Send the receipt email with PDF attachment
    const result = await sendReceiptPdf({
      customerEmail,
      customerName: customerName || "Customer",
      pdfBase64,
      receiptNumber,
      salonName: salon?.name || "Salon",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send receipt email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Receipt sent successfully",
      receiptNumber,
    });
  } catch (error) {
    console.error("Send receipt error:", error);
    return NextResponse.json(
      { error: "Failed to send receipt" },
      { status: 500 }
    );
  }
}
