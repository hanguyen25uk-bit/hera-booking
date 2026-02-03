import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReceiptPdf } from "@/lib/email";
import { getAuthPayload } from "@/lib/admin-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verify admin is logged in
    const auth = await getAuthPayload();
    if (!auth?.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get appointment with all details
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        staff: true,
        salon: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Verify appointment belongs to the admin's salon
    if (appointment.salonId !== auth.salonId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if customer has an email
    if (!appointment.customerEmail || appointment.customerEmail === "walkin@salon.com") {
      return NextResponse.json(
        { error: "Customer does not have a valid email address" },
        { status: 400 }
      );
    }

    // Parse request body for PDF
    const body = await req.json();

    if (!body.pdfBase64 || !body.receiptNumber) {
      return NextResponse.json(
        { error: "PDF data and receipt number are required" },
        { status: 400 }
      );
    }

    // Send the receipt email with PDF attachment
    const result = await sendReceiptPdf({
      customerEmail: appointment.customerEmail,
      customerName: appointment.customerName,
      pdfBase64: body.pdfBase64,
      receiptNumber: body.receiptNumber,
      salonName: appointment.salon.name,
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
      receiptNumber: body.receiptNumber,
    });
  } catch (error) {
    console.error("Send receipt error:", error);
    return NextResponse.json(
      { error: "Failed to send receipt" },
      { status: 500 }
    );
  }
}
