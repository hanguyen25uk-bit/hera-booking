"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
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
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
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
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>H</div>
        <h1 style={styles.title}>Hera Admin</h1>
        <p style={styles.subtitle}>Enter password to continue</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.inputWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={styles.input}
              autoFocus
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a", padding: 20 },
  card: { backgroundColor: "#1e293b", borderRadius: 20, padding: 40, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", width: "100%", maxWidth: 400, textAlign: "center" },
  logo: { width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28, fontWeight: 700, color: "#fff" },
  title: { fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 8px 0" },
  subtitle: { fontSize: 14, color: "#94a3b8", margin: "0 0 32px 0" },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  inputWrapper: { position: "relative" },
  input: { width: "100%", padding: "16px 50px 16px 16px", border: "2px solid #334155", borderRadius: 12, fontSize: 16, outline: "none", backgroundColor: "#f8fafc", color: "#0f172a", boxSizing: "border-box" },
  eyeButton: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18 },
  button: { padding: "16px 24px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: "pointer" },
  error: { backgroundColor: "#fef2f2", color: "#991b1b", padding: 12, borderRadius: 8, fontSize: 14 },
};
