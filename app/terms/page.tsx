import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Hera Booking",
  description: "Hera Booking terms of service — rules and conditions for using our platform.",
};

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", color: "#1a1a2e", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ color: "#6B7280", marginBottom: 32 }}>Last updated: 15 April 2026</p>

      <Section title="1. Introduction">
        These terms govern your use of herabooking.com ("the Platform"), operated by Hera Booking ("we", "us"). By using the Platform, you agree to these terms.
      </Section>

      <Section title="2. Service description">
        Hera Booking provides an online appointment booking platform for salons. Salon owners can manage their services, staff schedules, and customer bookings. Customers can book, reschedule, and cancel appointments.
      </Section>

      <Section title="3. Account registration">
        <ul style={{ paddingLeft: 20 }}>
          <li>Salon owners must provide accurate information when creating an account.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must be at least 18 years old to create a salon owner account.</li>
          <li>We reserve the right to suspend accounts that violate these terms.</li>
        </ul>
      </Section>

      <Section title="4. Booking terms">
        <ul style={{ paddingLeft: 20 }}>
          <li>Appointments are between the customer and the salon. Hera Booking is a platform facilitator only.</li>
          <li>Cancellation policies are set by individual salons.</li>
          <li>Customers who repeatedly fail to attend bookings (no-show) may be restricted from making future bookings at the salon's discretion.</li>
        </ul>
      </Section>

      <Section title="5. Acceptable use">
        You agree not to:
        <ul style={{ paddingLeft: 20 }}>
          <li>Use the Platform for any unlawful purpose.</li>
          <li>Attempt to access other users' accounts or data.</li>
          <li>Submit false or misleading booking information.</li>
          <li>Use automated tools to scrape or abuse the Platform.</li>
          <li>Interfere with the Platform's security or functionality.</li>
        </ul>
      </Section>

      <Section title="6. Intellectual property">
        The Platform, including its design, code, and branding, is owned by Hera Booking. Salon owners retain ownership of their business data and content uploaded to the Platform.
      </Section>

      <Section title="7. Limitation of liability">
        To the maximum extent permitted by UK law:
        <ul style={{ paddingLeft: 20 }}>
          <li>We provide the Platform "as is" without warranties of any kind.</li>
          <li>We are not liable for disputes between salons and their customers.</li>
          <li>Our total liability shall not exceed the fees paid by you in the preceding 12 months.</li>
        </ul>
      </Section>

      <Section title="8. Data protection">
        We process personal data in accordance with our <Link href="/privacy" style={{ color: "#6366F1" }}>Privacy Policy</Link> and applicable UK data protection laws.
      </Section>

      <Section title="9. Termination">
        Either party may terminate the relationship at any time. Salon owners may delete their account by contacting support. We may suspend or terminate accounts that breach these terms.
      </Section>

      <Section title="10. Governing law">
        These terms are governed by the laws of England and Wales. Disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
      </Section>

      <Section title="11. Changes to terms">
        We may update these terms from time to time. Continued use of the Platform after changes constitutes acceptance of the updated terms.
      </Section>

      <Section title="12. Contact">
        For questions about these terms, contact us at <strong>support@herabooking.com</strong>.
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
