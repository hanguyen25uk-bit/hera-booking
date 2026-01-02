import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f8fafc",
      padding: 20,
    }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{
          fontSize: 80,
          fontWeight: 700,
          color: "#e2e8f0",
          marginBottom: 16,
        }}>
          404
        </div>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 12,
        }}>
          Page not found
        </h1>
        <p style={{
          color: "#64748b",
          fontSize: 14,
          marginBottom: 24,
          lineHeight: 1.6,
        }}>
          Sorry, we couldn't find the page you're looking for.
        </p>
        <Link
          href="/"
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
