"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logoContainer}>
            <span style={styles.logoText}>hera</span>
          </div>

          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.title}>Check your email</h1>
          <p style={styles.subtitle}>
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <p style={styles.note}>
            Didn't receive the email? Check your spam folder or try again.
          </p>

          <Link href="/login" style={styles.button}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <span style={styles.logoText}>hera</span>
        </div>

        <h1 style={styles.title}>Forgot password?</h1>
        <p style={styles.subtitle}>
          Enter your email and we'll send you a reset link
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
              autoFocus
              required
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p style={styles.footerText}>
          Remember your password?{" "}
          <Link href="/login" style={styles.link}>
            Sign in
          </Link>
        </p>
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
    backgroundColor: "#F9FAFB",
    padding: 20,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 48,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: 400,
    textAlign: "center",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  logoText: {
    fontSize: 26,
    fontWeight: 600,
    color: "#111827",
    letterSpacing: "0.5px",
    fontFamily: "'Söhne', 'Helvetica Neue', Arial, sans-serif",
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    backgroundColor: "#D1FAE5",
    color: "#059669",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    fontWeight: 700,
    margin: "0 auto 24px",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    margin: "0 0 32px 0",
  },
  note: {
    fontSize: 13,
    color: "#9CA3AF",
    margin: "0 0 24px 0",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    textAlign: "left",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: "#111827",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 15,
    outline: "none",
    backgroundColor: "#FFFFFF",
    color: "#111827",
    boxSizing: "border-box",
  },
  button: {
    display: "block",
    width: "100%",
    padding: "14px 24px",
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    textAlign: "center",
    boxSizing: "border-box",
  },
  error: {
    backgroundColor: "#FEF2F2",
    color: "#DC2626",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
  },
  footerText: {
    marginTop: 24,
    color: "#6B7280",
    fontSize: 14,
  },
  link: {
    color: "#6366F1",
    fontWeight: 600,
    textDecoration: "none",
  },
};
