"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveAuthCredentials, getSavedAuth } from "@/lib/capacitor-auth";
import { apiFetch } from "@/lib/api";

// Hera Design Colors
const HERA_GOLD = "#c9a96e";
const HERA_DARK = "#1a1a2e";
const WARM_WHITE = "#fafaf8";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Check for saved auth on mount
  useEffect(() => {
    async function checkSavedAuth() {
      try {
        const savedAuth = await getSavedAuth();
        if (savedAuth) {
          // Pre-fill email
          setEmail(savedAuth.email);
          // Try to auto-login if we have a valid session
          router.push(`/${savedAuth.salonSlug}/admin/calendar`);
          return;
        }
      } catch {}
      setCheckingAuth(false);
    }
    checkSavedAuth();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Save credentials for auto-login
        await saveAuthCredentials({
          email,
          token: "session",
          salonSlug: data.salon.slug,
          salonName: data.salon.name,
        });

        // Use router for navigation in static export
        router.push(`/${data.salon.slug}/admin/calendar`);
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingLogo}>H</div>
          <span style={styles.loadingText}>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>
            <span style={styles.logoH}>H</span>
          </div>
          <span style={styles.logoText}>hera</span>
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
            <div style={styles.labelRow}>
              <label style={styles.label}>Password</label>
              <Link href="/forgot-password" style={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2">
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
    backgroundColor: WARM_WHITE,
    padding: 20,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  loadingLogo: {
    width: 60,
    height: 60,
    borderRadius: 16,
    background: `linear-gradient(135deg, ${HERA_GOLD} 0%, #b8956a 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    fontWeight: 700,
    color: HERA_DARK,
    fontFamily: "Georgia, serif",
  },
  loadingText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 40,
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    width: "100%",
    maxWidth: 380,
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
    background: `linear-gradient(135deg, ${HERA_GOLD} 0%, #b8956a 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 4px 12px rgba(201, 169, 110, 0.3)`,
  },
  logoH: {
    color: HERA_DARK,
    fontSize: 24,
    fontWeight: 800,
    fontFamily: "Georgia, serif",
    letterSpacing: "-1px",
  },
  logoText: {
    fontSize: 28,
    fontWeight: 300,
    color: HERA_DARK,
    letterSpacing: "2px",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: HERA_DARK,
    margin: "0 0 8px 0",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#8E8E93",
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
    gap: 8,
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: HERA_DARK,
  },
  forgotLink: {
    fontSize: 13,
    color: HERA_GOLD,
    textDecoration: "none",
    fontWeight: 500,
  },
  inputWrapper: {
    position: "relative",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    border: "1.5px solid #E5E5EA",
    borderRadius: 12,
    fontSize: 16,
    outline: "none",
    backgroundColor: "#FFFFFF",
    color: HERA_DARK,
    boxSizing: "border-box",
    transition: "border-color 0.2s ease",
  },
  eyeButton: {
    position: "absolute",
    right: 14,
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
    padding: "16px 24px",
    backgroundColor: HERA_DARK,
    color: "#FFFFFF",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: 8,
  },
  error: {
    backgroundColor: "#FEF2F2",
    color: "#DC2626",
    padding: 14,
    borderRadius: 12,
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  footerText: {
    marginTop: 28,
    color: "#8E8E93",
    fontSize: 14,
    textAlign: "center",
  },
  link: {
    color: HERA_GOLD,
    fontWeight: 600,
    textDecoration: "none",
  },
};
