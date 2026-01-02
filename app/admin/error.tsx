"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div style={{
      padding: 40,
      textAlign: "center",
    }}>
      <div style={{
        width: 60,
        height: 60,
        borderRadius: 12,
        background: "#fef2f2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 20px",
        fontSize: 28,
      }}>
        ⚠️
      </div>
      <h1 style={{
        fontSize: 20,
        fontWeight: 600,
        color: "#0f172a",
        marginBottom: 8,
      }}>
        Something went wrong
      </h1>
      <p style={{
        color: "#64748b",
        fontSize: 14,
        marginBottom: 20,
      }}>
        An error occurred in the admin panel.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "10px 20px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Try Again
      </button>
    </div>
  );
}
