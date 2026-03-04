export default function BookingLoading() {
  return (
    <div style={styles.container}>
      {/* Desktop Layout */}
      <div style={styles.desktopWrapper}>
        {/* Left sidebar skeleton */}
        <div style={styles.sidebar}>
          {/* Logo/Salon name skeleton */}
          <div style={styles.salonHeader}>
            <div style={{ ...styles.skeleton, width: 48, height: 48, borderRadius: 12 }} />
            <div style={{ ...styles.skeleton, width: 140, height: 24 }} />
          </div>

          {/* Policy section skeleton */}
          <div style={styles.policySection}>
            <div style={{ ...styles.skeleton, width: 120, height: 18, marginBottom: 16 }} />
            {[1, 2, 3].map((i) => (
              <div key={i} style={styles.policyItem}>
                <div style={{ ...styles.skeleton, width: 32, height: 32, borderRadius: 8 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ ...styles.skeleton, width: "80%", height: 14, marginBottom: 6 }} />
                  <div style={{ ...styles.skeleton, width: "60%", height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main content skeleton */}
        <div style={styles.mainContent}>
          {/* Step indicator skeleton */}
          <div style={styles.stepIndicator}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={styles.stepDot} />
            ))}
          </div>

          {/* Title skeleton */}
          <div style={{ ...styles.skeleton, width: 200, height: 28, margin: "0 auto 8px" }} />
          <div style={{ ...styles.skeleton, width: 280, height: 16, margin: "0 auto 32px" }} />

          {/* Service cards skeleton */}
          <div style={styles.servicesGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={styles.serviceCard}>
                <div style={{ ...styles.skeleton, width: "70%", height: 18, marginBottom: 8 }} />
                <div style={{ ...styles.skeleton, width: "50%", height: 14, marginBottom: 12 }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ ...styles.skeleton, width: 60, height: 16 }} />
                  <div style={{ ...styles.skeleton, width: 50, height: 16 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .desktop-wrapper { flex-direction: column !important; }
          .main-content { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#FBF8F4",
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  desktopWrapper: {
    display: "flex",
    minHeight: "100vh",
  },
  sidebar: {
    width: 340,
    backgroundColor: "#1A1715",
    padding: 32,
    display: "flex",
    flexDirection: "column",
  },
  salonHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  policySection: {
    marginTop: 24,
  },
  policyItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  mainContent: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: "24px 0 0 24px",
    padding: "32px 24px",
  },
  stepIndicator: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    backgroundColor: "#E2E8F0",
  },
  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
    maxWidth: 800,
    margin: "0 auto",
  },
  serviceCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 20,
    border: "1px solid #E2E8F0",
  },
  skeleton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    background: "linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 50%, #E2E8F0 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  },
};
