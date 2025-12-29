import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "booking@heranailspa.uk";
const SALON_NAME = "Hera Nail Spa";
const SALON_PHONE = "020 1234 5678";
const SALON_ADDRESS = "123 Example Street, London, SW11 1AA";

type EmailData = {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  bookingRef: string;
  manageUrl: string;
};

export async function sendBookingConfirmation(data: EmailData) {
  const {
    customerEmail,
    customerName,
    serviceName,
    staffName,
    appointmentDate,
    appointmentTime,
    duration,
    bookingRef,
    manageUrl,
  } = data;

  const formattedDate = new Date(appointmentDate).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); width: 48px; height: 48px; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="color: #ffffff; font-size: 24px; font-weight: 700;">H</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: 600;">${SALON_NAME}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                
                <!-- Success Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
                    <div style="width: 56px; height: 56px; background-color: rgba(255,255,255,0.2); border-radius: 14px; margin: 0 auto 16px; line-height: 56px;">
                      <span style="color: #ffffff; font-size: 28px;">✓</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">Booking Confirmed</h1>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding: 32px 32px 24px;">
                    <p style="color: #334155; font-size: 16px; margin: 0;">
                      Hi <strong>${customerName}</strong>, your appointment is confirmed!
                    </p>
                  </td>
                </tr>

                <!-- Booking Details -->
                <tr>
                  <td style="padding: 0 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; overflow: hidden;">
                      
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Service</td>
                              <td align="right" style="color: #0f172a; font-size: 15px; font-weight: 600;">${serviceName}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Specialist</td>
                              <td align="right" style="color: #0f172a; font-size: 15px; font-weight: 600;">${staffName}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Date</td>
                              <td align="right" style="color: #0f172a; font-size: 15px; font-weight: 600;">${formattedDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Time</td>
                              <td align="right" style="color: #6366f1; font-size: 15px; font-weight: 700;">${appointmentTime} (${duration} min)</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 16px 20px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #64748b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Reference</td>
                              <td align="right" style="color: #0f172a; font-size: 15px; font-weight: 600; font-family: monospace;">${bookingRef}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                    </table>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td style="padding: 32px; text-align: center;">
                    <a href="${manageUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 10px; font-size: 15px; font-weight: 600;">
                      Manage Booking
                    </a>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 32px;">
                    <div style="height: 1px; background-color: #e2e8f0;"></div>
                  </td>
                </tr>

                <!-- Footer Info -->
                <tr>
                  <td style="padding: 24px 32px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #64748b; font-size: 13px; line-height: 1.6;">
                          <strong style="color: #334155;">${SALON_NAME}</strong><br>
                          ${SALON_ADDRESS}<br>
                          ${SALON_PHONE}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Bottom Note -->
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Need to reschedule? Click "Manage Booking" above or contact us directly.
              </p>
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
    await resend.emails.send({
      from: `${SALON_NAME} <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Booking Confirmed - ${serviceName}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Email error:", error);
    return { success: false, error };
  }
}
