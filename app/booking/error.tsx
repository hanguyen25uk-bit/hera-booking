"use client";

export default function BookingError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0f172a",
      padding: 20,
    }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{
          width: 70,
          height: 70,
          borderRadius: 16,
          background: "linear-gradient(135deg, #ef4444, #dc2626)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: 32,
        }}>
          ⚠️
        </div>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 12,
        }}>
          Booking Error
        </h1>
        <p style={{
          color: "#94a3b8",
          fontSize: 14,
          marginBottom: 24,
        }}>
          Sorry, something went wrong with the booking system. Please try again.
        </p>
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
      </div>
    </div>
  );
}
