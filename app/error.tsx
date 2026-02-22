"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Icon */}
        <div style={styles.iconContainer}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#C4686D"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Content */}
        <h1 style={styles.title}>Something went wrong</h1>
        <p style={styles.message}>
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>

        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={reset} style={styles.primaryButton}>
            Try Again
          </button>
          <a href="/" style={styles.secondaryButton}>
            Go Home
          </a>
        </div>

        {/* Error ID for support */}
        {error.digest && (
          <p style={styles.errorId}>Error ID: {error.digest}</p>
        )}
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
    textAlign: "center",
    maxWidth: 440,
    width: "100%",
    border: "1px solid #F3EDE4",
    boxShadow: "0 4px 16px rgba(26, 23, 21, 0.08)",
  },
  iconContainer: {
    marginBottom: 24,
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
    flexDirection: "column",
    gap: 12,
  },
  primaryButton: {
    padding: "14px 28px",
    backgroundColor: "#1A1715",
    color: "#FBF8F4",
    border: "none",
    borderRadius: 50,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s ease",
  },
  secondaryButton: {
    padding: "14px 28px",
    backgroundColor: "transparent",
    color: "#1A1715",
    border: "1.5px solid #1A1715",
    borderRadius: 50,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.2s ease",
  },
  errorId: {
    marginTop: 24,
    fontSize: 12,
    color: "#8A857E",
  },
};
