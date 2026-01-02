"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

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
          width: 80,
          height: 80,
          borderRadius: 20,
          background: "linear-gradient(135deg, #ef4444, #dc2626)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 36,
        }}>
          ⚠️
        </div>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 12,
        }}>
          Something went wrong
        </h1>
        <p style={{
          color: "#64748b",
          fontSize: 14,
          marginBottom: 24,
          lineHeight: 1.6,
        }}>
          We are sorry, an unexpected error occurred. Please try again.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
          <Link
            href="/"
            style={{
              padding: "12px 24px",
              background: "#fff",
              color: "#475569",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
