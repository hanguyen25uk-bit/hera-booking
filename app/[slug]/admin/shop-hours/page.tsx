"use client";

import { useEffect, useState } from "react";

type SalonHours = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOpen: boolean;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ShopHoursPage() {
  const [hours, setHours] = useState<SalonHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => { loadHours(); }, []);

  async function loadHours() {
    try {
      const res = await fetch("/api/admin/salon-hours", { credentials: "include" });
      const data = await res.json();

      const hoursMap: Record<number, SalonHours> = {};
      data.forEach((h: SalonHours) => { hoursMap[h.dayOfWeek] = h; });

      const allHours: SalonHours[] = [];
      for (let i = 0; i < 7; i++) {
        if (hoursMap[i]) {
          allHours.push(hoursMap[i]);
        } else {
          allHours.push({ dayOfWeek: i, startTime: "09:00", endTime: "18:00", isOpen: i !== 0 });
        }
      }
      setHours(allHours);
    } catch (err) {
      console.error("Failed to load hours:", err);
    } finally {
      setLoading(false);
    }
  }

  function updateHour(dayOfWeek: number, field: keyof SalonHours, value: string | boolean) {
    setHours(prev => prev.map(h => h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/salon-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ hours }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMessage({ type: "success", text: "Shop hours saved successfully!" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save hours" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
            Shop Hours
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 6, fontFamily: "var(--font-body)" }}>
            Set when your salon is open for business
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "12px 28px",
            backgroundColor: "var(--rose)",
            color: "var(--white)",
            border: "none",
            borderRadius: 50,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "var(--font-body)",
            boxShadow: "var(--shadow-sm)",
            opacity: saving ? 0.7 : 1,
            transition: "all 0.2s ease"
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message && (
        <div style={{
          padding: 16,
          borderRadius: 12,
          marginBottom: 24,
          backgroundColor: message.type === "success" ? "var(--sage-light)" : "var(--rose-pale)",
          color: message.type === "success" ? "var(--sage)" : "var(--rose)",
          fontSize: 14,
          fontWeight: 500,
          fontFamily: "var(--font-body)"
        }}>
          {message.text}
        </div>
      )}

      <div style={{
        backgroundColor: "var(--white)",
        borderRadius: 16,
        border: "1px solid var(--cream-dark)",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "var(--cream)" }}>
              <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Day</th>
              <th style={{ textAlign: "center", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Status</th>
              <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Open</th>
              <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Close</th>
            </tr>
          </thead>
          <tbody>
            {hours.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((h) => (
              <tr key={h.dayOfWeek} style={{ borderBottom: "1px solid var(--cream-dark)" }}>
                <td style={{ padding: "18px 20px" }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15, fontFamily: "var(--font-body)" }}>{DAYS[h.dayOfWeek]}</span>
                </td>
                <td style={{ padding: "18px 20px", textAlign: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={h.isOpen}
                      onChange={(e) => updateHour(h.dayOfWeek, "isOpen", e.target.checked)}
                      style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--rose)" }}
                    />
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: 50,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "var(--font-body)",
                      backgroundColor: h.isOpen ? "var(--sage-light)" : "var(--rose-pale)",
                      color: h.isOpen ? "var(--sage)" : "var(--rose)"
                    }}>
                      {h.isOpen ? "Open" : "Closed"}
                    </span>
                  </label>
                </td>
                <td style={{ padding: "18px 20px" }}>
                  <input
                    type="time"
                    value={h.startTime}
                    onChange={(e) => updateHour(h.dayOfWeek, "startTime", e.target.value)}
                    disabled={!h.isOpen}
                    style={{
                      padding: "10px 14px",
                      border: "1px solid var(--cream-dark)",
                      borderRadius: 12,
                      fontSize: 14,
                      backgroundColor: h.isOpen ? "var(--cream)" : "var(--cream-dark)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-body)",
                      opacity: h.isOpen ? 1 : 0.5,
                      cursor: h.isOpen ? "pointer" : "not-allowed"
                    }}
                  />
                </td>
                <td style={{ padding: "18px 20px" }}>
                  <input
                    type="time"
                    value={h.endTime}
                    onChange={(e) => updateHour(h.dayOfWeek, "endTime", e.target.value)}
                    disabled={!h.isOpen}
                    style={{
                      padding: "10px 14px",
                      border: "1px solid var(--cream-dark)",
                      borderRadius: 12,
                      fontSize: 14,
                      backgroundColor: h.isOpen ? "var(--cream)" : "var(--cream-dark)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-body)",
                      opacity: h.isOpen ? 1 : 0.5,
                      cursor: h.isOpen ? "pointer" : "not-allowed"
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: 24,
        padding: 20,
        backgroundColor: "var(--cream)",
        borderRadius: 16,
        border: "1px solid var(--cream-dark)"
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: "0 0 12px", fontFamily: "var(--font-body)" }}>How it works</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--ink-muted)", fontSize: 13, lineHeight: 1.8, fontFamily: "var(--font-body)" }}>
          <li>Shop hours define when your salon is open for business</li>
          <li>Staff can only be scheduled within shop hours</li>
          <li>Customers can only book during open hours</li>
        </ul>
      </div>
    </div>
  );
}
