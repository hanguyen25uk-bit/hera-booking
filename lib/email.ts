import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type BookingEmailData = {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  bookingId: string;
  manageToken: string;
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
  } = data;

  // Format time
  const timeOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  const formattedTime = startTime.toLocaleString("en-GB", timeOptions);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  // Email HTML
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✓ Booking Confirmed</h1>
        </div>

        <!-- Body -->
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          
          <p style="font-size: 16px; color: #374151;">Hi <strong>${customerName}</strong>,</p>
          
          <p style="font-size: 16px; color: #374151;">
            Your appointment has been confirmed! We look forward to seeing you.
          </p>

          <!-- Booking Details Card -->
          <div style="background: #f9fafb; border: 2px solid #EC4899; border-radius: 12px; padding: 24px; margin: 24px 0;">
            
            <div style="margin-bottom: 16px;">
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">Service</div>
              <div style="color: #111827; font-size: 18px; font-weight: 600;">${serviceName}</div>
            </div>

            <div style="margin-bottom: 16px;">
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">Staff Member</div>
              <div style="color: #111827; font-size: 16px; font-weight: 500;">${staffName}</div>
            </div>

            <div style="margin-bottom: 16px;">
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">Date & Time</div>
              <div style="color: #111827; font-size: 16px; font-weight: 500;">${formattedTime}</div>
              <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">Duration: ${duration} minutes</div>
            </div>

            <div>
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">Booking Reference</div>
              <div style="color: #111827; font-size: 14px; font-family: monospace; background: #fff; padding: 8px; border-radius: 6px; display: inline-block;">
                ${bookingId.slice(0, 8).toUpperCase()}
              </div>
            </div>

          </div>

          <!-- Location Info -->
          <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <div style="font-size: 14px; color: #1e40af; font-weight: 600; margin-bottom: 8px;">📍 Location</div>
            <div style="font-size: 14px; color: #1e40af;">
              Hera Nail & Head Spa<br>
              123 Example Street<br>
              London, SW11 1AA
            </div>
          </div>

          <!-- Important Notes -->
          <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <div style="font-size: 14px; color: #92400e; font-weight: 600; margin-bottom: 8px;">⚠️ Important</div>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #92400e;">
              <li>Please arrive 5 minutes early</li>
              <li>Cancellations must be made 24 hours in advance</li>
              <li>Bring your booking reference if asked</li>
            </ul>
          </div>

          <!-- CTA Button -->
          <!-- CTA Buttons -->
<div style="text-align: center; margin: 30px 0;">
  <a href="http://localhost:3000/manage-booking?token=${manageToken}" 
     style="display: inline-block; background: #10B981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 8px 8px 8px;">
    Manage Booking
  </a>
  <a href="http://localhost:3000/booking" 
     style="display: inline-block; background: #EC4899; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 0 8px 8px 8px;">
    Book Another Appointment
  </a>
</div>

          <!-- Footer -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="font-size: 14px; color: #6b7280; margin: 0;">
              Questions? Reply to this email or call us at <strong>020 1234 5678</strong>
            </p>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 16px;">
              © 2024 Hera Nail & Head Spa. All rights reserved.
            </p>
          </div>

        </div>

      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to: customerEmail,
      subject: `✓ Booking Confirmed - ${serviceName}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    console.log("✅ Email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
  }
// Email khi RESCHEDULE
export async function sendRescheduleConfirmation(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  oldTime: Date;
  newTime: Date;
  manageToken: string;
}) {
  const {
    customerEmail,
    customerName,
    serviceName,
    staffName,
    oldTime,
    newTime,
    manageToken,
  } = data;

  const formatTime = (date: Date) =>
    date.toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📅 Appointment Rescheduled</h1>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
          
          <p style="font-size: 16px; color: #374151;">Hi <strong>${customerName}</strong>,</p>
          
          <p style="font-size: 16px; color: #374151;">
            Your appointment has been successfully rescheduled.
          </p>

          <div style="background: #FEE2E2; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <div style="font-size: 14px; color: #991B1B; font-weight: 600;">❌ Old Time (Cancelled)</div>
            <div style="font-size: 14px; color: #991B1B; text-decoration: line-through; margin-top: 8px;">
              ${formatTime(oldTime)}
            </div>
          </div>

          <div style="background: #D1FAE5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <div style="font-size: 14px; color: #065F46; font-weight: 600;">✓ New Time (Confirmed)</div>
            <div style="font-size: 18px; color: #065F46; font-weight: 700; margin-top: 8px;">
              ${formatTime(newTime)}
            </div>
          </div>

          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="margin-bottom: 12px;">
              <span style="color: #6b7280;">Service:</span>
              <strong style="color: #111827; margin-left: 8px;">${serviceName}</strong>
            </div>
            <div>
              <span style="color: #6b7280;">Staff:</span>
              <strong style="color: #111827; margin-left: 8px;">${staffName}</strong>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/manage-booking?token=${manageToken}" 
               style="display: inline-block; background: #10B981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              View Booking
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="font-size: 14px; color: #6b7280;">
              Questions? Reply to this email or call <strong>020 1234 5678</strong>
            </p>
          </div>

        </div>
      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to: customerEmail,
      subject: `📅 Appointment Rescheduled - ${serviceName}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    console.log("✅ Reschedule email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send reschedule email:", error);
    return { success: false, error };
  }
}

// Email khi CANCEL
export async function sendCancellationConfirmation(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  appointmentTime: Date;
}) {
  const {
    customerEmail,
    customerName,
    serviceName,
    staffName,
    appointmentTime,
  } = data;

  const formatTime = (date: Date) =>
    date.toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✕ Booking Cancelled</h1>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
          
          <p style="font-size: 16px; color: #374151;">Hi <strong>${customerName}</strong>,</p>
          
          <p style="font-size: 16px; color: #374151;">
            Your appointment has been cancelled as requested.
          </p>

          <div style="background: #FEE2E2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626;">
            <div style="font-size: 14px; color: #991B1B; font-weight: 600; margin-bottom: 12px;">Cancelled Appointment:</div>
            <div style="font-size: 14px; color: #991B1B;">
              <strong>${serviceName}</strong> with ${staffName}<br>
              ${formatTime(appointmentTime)}
            </div>
          </div>

          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            We're sorry to see you go! If you'd like to book again, click below.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/booking" 
               style="display: inline-block; background: #EC4899; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Book New Appointment
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="font-size: 14px; color: #6b7280;">
              Questions? Reply to this email or call <strong>020 1234 5678</strong>
            </p>
          </div>

        </div>
      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to: customerEmail,
      subject: `✕ Booking Cancelled - ${serviceName}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    console.log("✅ Cancellation email sent:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send cancellation email:", error);
    return { success: false, error };
  }
}

