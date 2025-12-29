"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin");
      } else {
        setError("Invalid password");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.logoSection}>
        <div style={styles.logo}>H</div>
        <h1 style={styles.title}>Hera Admin</h1>
      </div>
      
      <p style={styles.subtitle}>Enter password to continue</p>

      <form onSubmit={handleSubmit}>
        {error && <div style={styles.error}>{error}</div>}
        
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={styles.input}
          autoFocus
        />
        
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={styles.page}>
      <Suspense fallback={<div style={styles.loading}>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  loading: {
    color: "#94a3b8",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 40,
    width: "100%",
    maxWidth: 400,
    textAlign: "center",
  },
  logoSection: {
    marginBottom: 24,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 24,
    fontWeight: 700,
    margin: "0 auto 16px",
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 24,
  },
  error: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#ef4444",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    backgroundColor: "#0f172a",
    border: "2px solid #334155",
    borderRadius: 10,
    color: "#fff",
    fontSize: 16,
    outline: "none",
    marginBottom: 16,
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "14px 24px",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
};
