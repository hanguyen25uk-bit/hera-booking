import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
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
  } = data;

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
                  <td style="padding: 12px 16px;">
                    <span style="color: #64748b; font-size: 13px;">Time</span><br>
                    <strong style="color: #1e293b; font-size: 15px;">${formattedStartTime} - ${formattedEndTime}</strong>
                  </td>
                </tr>
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
    const result = await resend.emails.send({
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
    const result = await resend.emails.send({
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
