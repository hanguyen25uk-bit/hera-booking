"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(data.redirectUrl);
        router.refresh();
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>
            <span style={styles.logoH}>H</span>
          </div>
          <span style={styles.logoText}>Hera</span>
        </div>

        {/* Header */}
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your dashboard</p>

        {/* Error */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Form */}
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

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={styles.input}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p style={styles.footerText}>
          Don't have an account?{" "}
          <Link href="/signup" style={styles.link}>
            Create one
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
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 32,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
  },
  logoH: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: 800,
    fontFamily: "'Georgia', serif",
    letterSpacing: "-1px",
  },
  logoText: {
    fontSize: 28,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "-0.5px",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 8px 0",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    margin: "0 0 32px 0",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
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
  inputWrapper: {
    position: "relative",
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
    transition: "border-color 0.2s ease",
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    padding: "14px 24px",
    backgroundColor: "#111827",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    marginTop: 8,
  },
  error: {
    backgroundColor: "#FEF2F2",
    color: "#DC2626",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  footerText: {
    marginTop: 24,
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
  },
  link: {
    color: "#6366F1",
    fontWeight: 600,
    textDecoration: "none",
  },
};
