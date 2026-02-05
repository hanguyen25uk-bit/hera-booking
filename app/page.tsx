import Link from "next/link";

export default function Home() {
  return (
    <div style={styles.page}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContainer}>
          <div style={styles.logoContainer}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="#D97706"/>
              <path d="M12 10V26M24 10V26M12 18H24" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
            </svg>
            <span style={styles.logoText}>hera</span>
          </div>
          <div style={styles.navLinks}>
            <Link href="/login" style={styles.navLink}>Login</Link>
            <Link href="/signup" style={styles.navButton}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            The modern way to manage<br />salon bookings
          </h1>
          <p style={styles.heroSubtitle}>
            Streamline appointments, delight customers, and grow your business with Hera's powerful booking platform.
          </p>
          <div style={styles.heroButtons}>
            <Link href="/signup" style={styles.primaryButton}>
              Get Started Free
            </Link>
            <Link href="#features" style={styles.secondaryButton}>
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={styles.features}>
        <div style={styles.featuresContainer}>
          <h2 style={styles.featuresTitle}>Everything you need to run your salon</h2>
          <p style={styles.featuresSubtitle}>Simple, powerful tools designed for modern salons</p>

          <div style={styles.featuresGrid}>
            {/* Feature 1 */}
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <h3 style={styles.featureTitle}>24/7 Online Booking</h3>
              <p style={styles.featureDescription}>
                Let clients book appointments anytime, anywhere. Your booking page works around the clock.
              </p>
            </div>

            {/* Feature 2 */}
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
              </div>
              <h3 style={styles.featureTitle}>Smart Discounts</h3>
              <p style={styles.featureDescription}>
                Fill quiet hours automatically with off-peak pricing. Increase revenue during slow periods.
              </p>
            </div>

            {/* Feature 3 */}
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h3 style={styles.featureTitle}>Email Confirmations</h3>
              <p style={styles.featureDescription}>
                Automatic booking confirmations keep clients informed and reduce no-shows.
              </p>
            </div>

            {/* Feature 4 */}
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <h3 style={styles.featureTitle}>Staff Management</h3>
              <p style={styles.featureDescription}>
                Manage multiple staff members with individual schedules and service assignments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={styles.cta}>
        <div style={styles.ctaContent}>
          <h2 style={styles.ctaTitle}>Ready to transform your salon?</h2>
          <p style={styles.ctaSubtitle}>
            Join thousands of salons using Hera to manage their bookings
          </p>
          <Link href="/signup" style={styles.ctaButton}>
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerLogo}>
            <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="#9CA3AF"/>
              <path d="M12 10V26M24 10V26M12 18H24" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
            </svg>
            <span style={styles.footerLogoText}>hera</span>
          </div>
          <p style={styles.footerCopy}>© 2026 Hera Booking. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#FFFFFF",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  // Navigation
  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid #E5E7EB",
    zIndex: 100,
  },
  navContainer: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 600,
    color: "#111827",
    letterSpacing: "-0.5px",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  navLink: {
    color: "#6B7280",
    textDecoration: "none",
    fontSize: 15,
    fontWeight: 500,
    transition: "color 0.2s ease",
  },
  navButton: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    padding: "10px 20px",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
    transition: "background-color 0.2s ease",
  },

  // Hero
  hero: {
    paddingTop: 140,
    paddingBottom: 80,
    textAlign: "center",
    backgroundColor: "#F9FAFB",
  },
  heroContent: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "0 24px",
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.2,
    margin: "0 0 24px 0",
  },
  heroSubtitle: {
    fontSize: 18,
    color: "#6B7280",
    lineHeight: 1.6,
    margin: "0 0 40px 0",
    maxWidth: 600,
    marginLeft: "auto",
    marginRight: "auto",
  },
  heroButtons: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#111827",
    color: "#FFFFFF",
    padding: "14px 32px",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 16,
    fontWeight: 600,
    transition: "background-color 0.2s ease",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    color: "#111827",
    padding: "14px 32px",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 16,
    fontWeight: 600,
    border: "1px solid #E5E7EB",
    transition: "border-color 0.2s ease",
  },

  // Features
  features: {
    padding: "80px 24px",
  },
  featuresContainer: {
    maxWidth: 1200,
    margin: "0 auto",
  },
  featuresTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: "#111827",
    textAlign: "center",
    margin: "0 0 12px 0",
  },
  featuresSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    margin: "0 0 48px 0",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 24,
  },
  featureCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 32,
    textAlign: "center",
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 12px 0",
  },
  featureDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 1.6,
    margin: 0,
  },

  // CTA
  cta: {
    backgroundColor: "#111827",
    padding: "80px 24px",
    textAlign: "center",
  },
  ctaContent: {
    maxWidth: 600,
    margin: "0 auto",
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: "#FFFFFF",
    margin: "0 0 16px 0",
  },
  ctaSubtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    margin: "0 0 32px 0",
  },
  ctaButton: {
    display: "inline-block",
    backgroundColor: "#FFFFFF",
    color: "#111827",
    padding: "14px 32px",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 16,
    fontWeight: 600,
    transition: "background-color 0.2s ease",
  },

  // Footer
  footer: {
    borderTop: "1px solid #E5E7EB",
    padding: "32px 24px",
  },
  footerContent: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  footerLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  footerLogoText: {
    fontSize: 16,
    fontWeight: 600,
    color: "#6B7280",
    letterSpacing: "-0.3px",
  },
  footerCopy: {
    fontSize: 14,
    color: "#9CA3AF",
    margin: 0,
  },
};
