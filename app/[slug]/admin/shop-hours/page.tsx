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

  useEffect(() => {
    loadHours();
  }, []);

  async function loadHours() {
    try {
      const res = await fetch("/api/admin/salon-hours", { credentials: "include" });
      const data = await res.json();

      // Create default hours for all days if not set
      const hoursMap: Record<number, SalonHours> = {};
      data.forEach((h: SalonHours) => {
        hoursMap[h.dayOfWeek] = h;
      });

      const allHours: SalonHours[] = [];
      for (let i = 0; i < 7; i++) {
        if (hoursMap[i]) {
          allHours.push(hoursMap[i]);
        } else {
          allHours.push({
            dayOfWeek: i,
            startTime: "09:00",
            endTime: "18:00",
            isOpen: i !== 0, // Closed on Sunday by default
          });
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
    setHours(prev =>
      prev.map(h =>
        h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
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
    return <div style={styles.page}><div style={styles.loading}>Loading...</div></div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Shop Hours</h1>
          <p style={styles.subtitle}>Set when your salon is open for business</p>
        </div>
        <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          backgroundColor: message.type === "success" ? "#ecfdf5" : "#fef2f2",
          color: message.type === "success" ? "#059669" : "#dc2626",
        }}>
          {message.text}
        </div>
      )}

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Day</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Open</th>
              <th style={styles.th}>Close</th>
            </tr>
          </thead>
          <tbody>
            {hours.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((h) => (
              <tr key={h.dayOfWeek} style={styles.tr}>
                <td style={styles.td}>
                  <span style={styles.dayName}>{DAYS[h.dayOfWeek]}</span>
                </td>
                <td style={styles.td}>
                  <label style={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={h.isOpen}
                      onChange={(e) => updateHour(h.dayOfWeek, "isOpen", e.target.checked)}
                      style={styles.checkbox}
                    />
                    <span style={{
                      ...styles.toggleLabel,
                      color: h.isOpen ? "#059669" : "#dc2626",
                    }}>
                      {h.isOpen ? "Open" : "Closed"}
                    </span>
                  </label>
                </td>
                <td style={styles.td}>
                  <input
                    type="time"
                    value={h.startTime}
                    onChange={(e) => updateHour(h.dayOfWeek, "startTime", e.target.value)}
                    disabled={!h.isOpen}
                    style={{
                      ...styles.timeInput,
                      opacity: h.isOpen ? 1 : 0.5,
                    }}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="time"
                    value={h.endTime}
                    onChange={(e) => updateHour(h.dayOfWeek, "endTime", e.target.value)}
                    disabled={!h.isOpen}
                    style={{
                      ...styles.timeInput,
                      opacity: h.isOpen ? 1 : 0.5,
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>How it works</h3>
        <ul style={styles.infoList}>
          <li>Shop hours define when your salon is open for business</li>
          <li>Staff can only be scheduled within shop hours</li>
          <li>Customers can only book during open hours</li>
        </ul>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: { maxWidth: 800 },
  loading: { padding: 40, textAlign: "center", color: "#64748b" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    margin: "4px 0 0",
  },
  btnPrimary: {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  message: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 14,
    fontWeight: 500,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "14px 20px",
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "16px 20px",
  },
  dayName: {
    fontWeight: 600,
    color: "#0f172a",
    fontSize: 15,
  },
  toggle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  },
  checkbox: {
    width: 20,
    height: 20,
    cursor: "pointer",
  },
  toggleLabel: {
    fontWeight: 500,
    fontSize: 14,
  },
  timeInput: {
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    fontSize: 14,
    width: 120,
  },
  infoBox: {
    marginTop: 24,
    padding: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    margin: "0 0 12px",
  },
  infoList: {
    margin: 0,
    paddingLeft: 20,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.8,
  },
};
