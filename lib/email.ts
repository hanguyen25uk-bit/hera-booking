import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_URL = "https://hera-booking.vercel.app";

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

  const formattedDate = startTime.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  
  const formattedTime = startTime.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  const manageUrl = BASE_URL + "/manage-booking?token=" + manageToken;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 500px; margin: 0 auto; padding: 20px;">
        
        <div style="background: #EC4899; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Booking Confirmed</h1>
        </div>

        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          
          <p style="font-size: 15px; margin: 0 0 20px 0;">Hi <strong>${customerName}</strong>, your appointment is confirmed!</p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666; width: 100px;">Service</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 600;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Staff</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${staffName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Date</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #666;">Time</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: 600; color: #EC4899;">${formattedTime} (${duration} min)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Ref</td>
              <td style="padding: 8px 0; font-family: monospace;">${bookingId.slice(0, 8).toUpperCase()}</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${manageUrl}" 
               style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              Manage Booking
            </a>
          </div>

          <p style="font-size: 13px; color: #666; margin: 20px 0 0 0; padding-top: 16px; border-top: 1px solid #eee;">
            Hera Nail Spa - 020 1234 5678
          </p>

        </div>
      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to: customerEmail,
      subject: "Booking Confirmed - " + serviceName,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error };
    }

    console.log("Email sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}

export async function sendRescheduleConfirmation(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  oldTime: Date;
  newTime: Date;
  manageToken: string;
}) {
  const { customerEmail, customerName, serviceName, staffName, oldTime, newTime, manageToken } = data;

  const formatDate = (date: Date) => date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const manageUrl = BASE_URL + "/manage-booking?token=" + manageToken;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        
        <div style="background: #10B981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Appointment Rescheduled</h1>
        </div>

        <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          
          <p>Hi <strong>${customerName}</strong>, your appointment has been rescheduled.</p>

          <p style="color: #DC2626; text-decoration: line-through;">Old: ${formatDate(oldTime)}</p>
          <p style="color: #10B981; font-weight: 600; font-size: 16px;">New: ${formatDate(newTime)}</p>

          <p><strong>${serviceName}</strong> with ${staffName}</p>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${manageUrl}" 
               style="display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Booking
            </a>
          </div>

          <p style="font-size: 13px; color: #666;">Hera Nail Spa - 020 1234 5678</p>
        </div>
      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to: customerEmail,
      subject: "Rescheduled - " + serviceName,
      html: emailHtml,
    });

    if (error) return { success: false, error };
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

export async function sendCancellationConfirmation(data: {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  appointmentTime: Date;
}) {
  const { customerEmail, customerName, serviceName, staffName, appointmentTime } = data;

  const formatDate = (date: Date) => date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const bookingUrl = BASE_URL + "/booking";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        
        <div style="background: #DC2626; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Booking Cancelled</h1>
        </div>

        <div style="background: #fff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          
          <p>Hi <strong>${customerName}</strong>, your appointment has been cancelled.</p>

          <p style="color: #666; text-decoration: line-through;">
            ${serviceName} with ${staffName}<br>
            ${formatDate(appointmentTime)}
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${bookingUrl}" 
               style="display: inline-block; background: #EC4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Book Again
            </a>
          </div>

          <p style="font-size: 13px; color: #666;">Hera Nail Spa - 020 1234 5678</p>
        </div>
      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "onboarding@resend.dev",
      to: customerEmail,
      subject: "Cancelled - " + serviceName,
      html: emailHtml,
    });

    if (error) return { success: false, error };
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}
