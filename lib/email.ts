import { Resend } from "resend";

const getResend = () => new Resend(process.env.RESEND_API_KEY || "");
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://hera-booking.vercel.app";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

type BookingEmailData = {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  bookingId: string;
  manageToken: string;
  salonName?: string;
  salonPhone?: string;
  salonAddress?: string;
  salonSlug?: string;
  originalPrice?: number;
  discountedPrice?: number;
  discountName?: string;
};

export async function sendBookingConfirmation(data: BookingEmailData) {
  const {
    customerEmail,
    customerName,
    serviceName,
    staffName,
    startTime,
    endTime,
    bookingId,
    manageToken,
    salonName = "Hera Booking",
    salonPhone = "",
    salonAddress = "",
    salonSlug = "",
    originalPrice,
    discountedPrice,
    discountName,
  } = data;

  const hasDiscount = originalPrice !== undefined && discountedPrice !== undefined && discountedPrice < originalPrice;

  const formattedDate = startTime.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedStartTime = startTime.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedEndTime = endTime.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const manageUrl = `${BASE_URL}/manage-booking?token=${manageToken}`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${salonName}</h1>
            </td>
          </tr>
          
          <!-- Success Icon -->
          <tr>
            <td style="padding: 32px 24px 16px; text-align: center;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #ffffff; font-size: 32px; line-height: 64px;">✓</span>
              </div>
              <h2 style="color: #1e293b; margin: 0 0 8px; font-size: 22px; font-weight: 600;">Booking Confirmed!</h2>
              <p style="color: #64748b; margin: 0; font-size: 14px;">Hi ${customerName}, your appointment is confirmed</p>
            </td>
          </tr>
          
          <!-- Booking Details -->
          <tr>
            <td style="padding: 16px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; padding: 20px;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 13px;">Service</span><br>
                    <strong style="color: #1e293b; font-size: 15px;">${serviceName}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 13px;">Specialist</span><br>
                    <strong style="color: #1e293b; font-size: 15px;">${staffName}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 13px;">Date</span><br>
                    <strong style="color: #1e293b; font-size: 15px;">${formattedDate}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px;${originalPrice !== undefined ? ' border-bottom: 1px solid #e2e8f0;' : ''}">
                    <span style="color: #64748b; font-size: 13px;">Time</span><br>
                    <strong style="color: #1e293b; font-size: 15px;">${formattedStartTime} - ${formattedEndTime}</strong>
                  </td>
                </tr>
                ${originalPrice !== undefined ? `
                <tr>
                  <td style="padding: 12px 16px;">
                    <span style="color: #64748b; font-size: 13px;">Price</span><br>
                    ${hasDiscount ? `
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="background: #22c55e; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">OFF-PEAK</span>
                      <span style="color: #94a3b8; text-decoration: line-through; font-size: 13px;">£${originalPrice.toFixed(2)}</span>
                      <strong style="color: #16a34a; font-size: 15px;">£${discountedPrice?.toFixed(2)}</strong>
                    </div>
                    ` : `
                    <strong style="color: #1e293b; font-size: 15px;">£${originalPrice.toFixed(2)}</strong>
                    `}
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
          
          <!-- Manage Button -->
          <tr>
            <td style="padding: 16px 24px; text-align: center;">
              <a href="${manageUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 14px;">Manage Booking</a>
            </td>
          </tr>
          
          <!-- Booking ID -->
          <tr>
            <td style="padding: 8px 24px 24px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">Booking Reference: <strong>${bookingId.slice(0, 8).toUpperCase()}</strong></p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 8px;"><strong>${salonName}</strong></p>
              ${salonPhone ? `<p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px;">${salonPhone}</p>` : ''}
              ${salonAddress ? `<p style="color: #94a3b8; font-size: 12px; margin: 0;">${salonAddress}</p>` : ''}
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const result = await getResend().emails.send({
      from: `${salonName} <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Booking Confirmed - ${serviceName} on ${formattedDate}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", result);
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}

export async function sendCancellationConfirmation(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  salonName?: string;
}) {
  const {
    customerEmail,
    customerName,
    serviceName,
    staffName,
    startTime,
    salonName = "Hera Booking",
  } = data;

  const formattedDate = startTime.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = startTime.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Booking Cancelled</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${salonName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px; text-align: center;">
              <h2 style="color: #1e293b; margin: 0 0 16px;">Booking Cancelled</h2>
              <p style="color: #64748b; margin: 0 0 24px;">Hi ${customerName}, your appointment has been cancelled.</p>
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; text-align: left;">
                <p style="margin: 8px 0; color: #64748b;"><strong>Service:</strong> ${serviceName}</p>
                <p style="margin: 8px 0; color: #64748b;"><strong>With:</strong> ${staffName}</p>
                <p style="margin: 8px 0; color: #64748b;"><strong>Was scheduled:</strong> ${formattedDate} at ${formattedTime}</p>
              </div>
              <p style="color: #64748b; margin: 24px 0 0;">We hope to see you again soon!</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const result = await getResend().emails.send({
      from: `${salonName} <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Booking Cancelled - ${serviceName}`,
      html: emailHtml,
    });
    console.log("Cancellation email sent:", result);
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send cancellation email:", error);
    return { success: false, error };
  }
}

export async function sendReceipt(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  staffName: string;
  appointmentDate: Date;
  receiptNumber: string;
  salonName?: string;
  salonPhone?: string;
  salonAddress?: string;
}) {
  const {
    customerEmail,
    customerName,
    serviceName,
    servicePrice,
    serviceDuration,
    staffName,
    appointmentDate,
    receiptNumber,
    salonName = "Salon",
    salonPhone = "",
    salonAddress = "",
  } = data;

  const formattedDate = appointmentDate.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = appointmentDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${receiptNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${salonName}</h1>
              ${salonAddress ? `<p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 13px;">${salonAddress}</p>` : ''}
              ${salonPhone ? `<p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 13px;">Tel: ${salonPhone}</p>` : ''}
            </td>
          </tr>

          <!-- Receipt Title -->
          <tr>
            <td style="padding: 32px 24px 16px; text-align: center;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                <span style="color: #ffffff; font-size: 28px; line-height: 64px;">🧾</span>
              </div>
              <h2 style="color: #1e293b; margin: 0 0 8px; font-size: 22px; font-weight: 600;">Your Receipt</h2>
              <p style="color: #64748b; margin: 0; font-size: 14px;">Receipt No: <strong>${receiptNumber}</strong></p>
            </td>
          </tr>

          <!-- Customer Info -->
          <tr>
            <td style="padding: 0 24px 16px;">
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px;">
                <p style="color: #64748b; font-size: 12px; margin: 0 0 4px; text-transform: uppercase;">Customer</p>
                <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0;">${customerName}</p>
              </div>
            </td>
          </tr>

          <!-- Service Details -->
          <tr>
            <td style="padding: 0 24px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px;">
                <tr>
                  <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Service</span><br>
                    <strong style="color: #1e293b; font-size: 16px;">${serviceName}</strong>
                    <span style="color: #64748b; font-size: 13px;"> (${serviceDuration} mins)</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Staff</span><br>
                    <strong style="color: #1e293b; font-size: 15px;">${staffName}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Date</span><br>
                    <strong style="color: #1e293b; font-size: 15px;">${formattedDate}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Time</span><br>
                    <strong style="color: #1e293b; font-size: 15px;">${formattedTime}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Total -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 12px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%">
                      <tr>
                        <td style="color: rgba(255,255,255,0.8); font-size: 14px;">Total Amount</td>
                        <td style="color: #ffffff; font-size: 28px; font-weight: 700; text-align: right;">£${servicePrice.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 8px;">Thank you for your visit!</p>
              <p style="color: #64748b; font-size: 13px; margin: 0;">We hope to see you again soon.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const result = await getResend().emails.send({
      from: `${salonName} <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Receipt from ${salonName} - ${receiptNumber}`,
      html: emailHtml,
    });

    console.log("Receipt email sent successfully:", result);
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send receipt email:", error);
    return { success: false, error };
  }
}

export async function sendReceiptPdf(data: {
  customerEmail: string;
  customerName: string;
  pdfBase64: string;
  receiptNumber: string;
  salonName?: string;
}) {
  const {
    customerEmail,
    customerName,
    pdfBase64,
    receiptNumber,
    salonName = "Salon",
  } = data;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${salonName}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px; text-align: center;">
              <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px; font-weight: 600;">Your Receipt</h2>
              <p style="color: #64748b; margin: 0 0 8px; font-size: 14px;">Hi ${customerName},</p>
              <p style="color: #64748b; margin: 0 0 24px; font-size: 14px;">Please find your receipt attached to this email.</p>
              <p style="color: #94a3b8; margin: 0; font-size: 12px;">Receipt No: <strong>${receiptNumber}</strong></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 8px;">Thank you for your visit!</p>
              <p style="color: #64748b; font-size: 13px; margin: 0;">We hope to see you again soon.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const result = await getResend().emails.send({
      from: `${salonName} <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Receipt from ${salonName} - ${receiptNumber}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Receipt-${receiptNumber}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    console.log("Receipt PDF email sent successfully:", result);
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send receipt PDF email:", error);
    return { success: false, error };
  }
}
