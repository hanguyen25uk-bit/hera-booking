import Link from "next/link";

export default function NotFound() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* 404 Number */}
        <div style={styles.numberContainer}>
          <span style={styles.number}>404</span>
        </div>

        {/* Content */}
        <h1 style={styles.title}>Page not found</h1>
        <p style={styles.message}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div style={styles.actions}>
          <Link href="/" style={styles.primaryButton}>
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBF8F4",
    padding: 24,
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 48,
    textAlign: "center" as const,
    maxWidth: 440,
    width: "100%",
    border: "1px solid #F3EDE4",
    boxShadow: "0 4px 16px rgba(26, 23, 21, 0.08)",
  },
  numberContainer: {
    marginBottom: 16,
  },
  number: {
    fontSize: 80,
    fontWeight: 700,
    color: "#C4686D",
    fontFamily: "'Playfair Display', Georgia, serif",
    lineHeight: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1A1715",
    margin: "0 0 12px 0",
    fontFamily: "'Playfair Display', Georgia, serif",
  },
  message: {
    fontSize: 15,
    color: "#4A4640",
    margin: "0 0 32px 0",
    lineHeight: 1.6,
  },
  actions: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  primaryButton: {
    display: "inline-block",
    padding: "14px 28px",
    backgroundColor: "#1A1715",
    color: "#FBF8F4",
    border: "none",
    borderRadius: 50,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s ease",
  },
};
