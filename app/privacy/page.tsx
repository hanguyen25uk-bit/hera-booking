import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Hera Booking",
  description: "Hera Booking privacy policy — how we collect, use, and protect your personal data.",
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", color: "#1a1a2e", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: "#6B7280", marginBottom: 32 }}>Last updated: 15 April 2026</p>

      <Section title="1. Who we are">
        Hera Booking ("we", "us", "our") operates the herabooking.com platform. We are a booking management service for salons based in the United Kingdom.
        For data protection enquiries, contact us at <strong>privacy@herabooking.com</strong>.
      </Section>

      <Section title="2. What data we collect">
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Salon owners:</strong> Name, email address, salon name, address, phone number.</li>
          <li><strong>Customers booking appointments:</strong> Name, email address, phone number, appointment details.</li>
          <li><strong>Technical data:</strong> IP address, browser type, and usage data collected automatically for security and analytics.</li>
        </ul>
      </Section>

      <Section title="3. How we use your data">
        <ul style={{ paddingLeft: 20 }}>
          <li>To provide and manage the booking service.</li>
          <li>To send appointment confirmations and reminders via email.</li>
          <li>To authenticate salon owners and protect accounts.</li>
          <li>To prevent fraud, abuse, and enforce rate limits.</li>
          <li>To comply with legal obligations.</li>
        </ul>
      </Section>

      <Section title="4. Legal basis for processing (GDPR)">
        We process personal data under the following legal bases:
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Contract:</strong> Processing necessary to provide the booking service you requested.</li>
          <li><strong>Legitimate interest:</strong> Security measures, fraud prevention, and service improvement.</li>
          <li><strong>Legal obligation:</strong> Where required by UK law.</li>
        </ul>
      </Section>

      <Section title="5. Data sharing">
        We do not sell your personal data. We share data only with:
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Resend:</strong> Email delivery service for confirmations and reminders.</li>
          <li><strong>Vercel:</strong> Hosting infrastructure.</li>
          <li><strong>Neon:</strong> Database hosting (PostgreSQL).</li>
        </ul>
        All processors are bound by data processing agreements and GDPR-compliant safeguards.
      </Section>

      <Section title="6. Data retention">
        Salon owner accounts and related data are retained while the account is active. Appointment data is retained for 12 months after the appointment date. You may request deletion at any time.
      </Section>

      <Section title="7. Your rights">
        Under UK GDPR, you have the right to:
        <ul style={{ paddingLeft: 20 }}>
          <li>Access your personal data.</li>
          <li>Rectify inaccurate data.</li>
          <li>Request erasure ("right to be forgotten").</li>
          <li>Restrict or object to processing.</li>
          <li>Data portability.</li>
          <li>Lodge a complaint with the ICO (ico.org.uk).</li>
        </ul>
        To exercise these rights, email <strong>privacy@herabooking.com</strong>.
      </Section>

      <Section title="8. Cookies">
        We use essential cookies only (authentication session cookies). We do not use tracking or advertising cookies.
      </Section>

      <Section title="9. Security">
        We protect your data with HTTPS encryption, hashed passwords (bcrypt), rate limiting, and httpOnly secure cookies. See our <Link href="/terms" style={{ color: "#6366F1" }}>Terms of Service</Link> for more details.
      </Section>

      <Section title="10. Changes to this policy">
        We may update this policy from time to time. Material changes will be communicated via the platform.
      </Section>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #E5E7EB" }}>
        <Link href="/" style={{ color: "#6366F1", textDecoration: "none" }}>
          &larr; Back to Hera Booking
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{title}</h2>
      <div style={{ color: "#374151" }}>{children}</div>
    </section>
  );
}
