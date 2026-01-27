"use client";

import { useState, useEffect } from "react";

type Settings = {
  salonName: string;
  salonPhone: string;
  salonAddress: string;
  cancelMinutesAdvance: number;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    salonName: "Hera Nail Spa",
    salonPhone: "020 1234 5678",
    salonAddress: "123 Example Street, London, SW11 1AA",
    cancelMinutesAdvance: 1440,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        if (data && !data.error) {
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", { credentials: "include",
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const cancelOptions = [
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
    { value: 180, label: "3 hours" },
    { value: 360, label: "6 hours" },
    { value: 720, label: "12 hours" },
    { value: 1440, label: "24 hours" },
    { value: 2880, label: "48 hours" },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>Manage your salon settings</p>
      </div>

      {message && (
        <div style={{
          padding: "12px 16px",
          borderRadius: 8,
          marginBottom: 16,
          backgroundColor: message.type === "success" ? "#D1FAE5" : "#FEE2E2",
          color: message.type === "success" ? "#065F46" : "#991B1B",
        }}>
          {message.text}
        </div>
      )}

      <div style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        
        {/* Salon Info Section */}
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 20 }}>
          Salon Information
        </h2>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 8 }}>
            Salon Name
          </label>
          <input
            type="text"
            value={settings.salonName}
            onChange={(e) => setSettings({ ...settings, salonName: e.target.value })}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid #D1D5DB",
              borderRadius: 8,
              fontSize: 16,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 8 }}>
            Phone Number
          </label>
          <input
            type="tel"
            value={settings.salonPhone}
            onChange={(e) => setSettings({ ...settings, salonPhone: e.target.value })}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid #D1D5DB",
              borderRadius: 8,
              fontSize: 16,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 32 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 8 }}>
            Address
          </label>
          <textarea
            value={settings.salonAddress}
            onChange={(e) => setSettings({ ...settings, salonAddress: e.target.value })}
            rows={2}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid #D1D5DB",
              borderRadius: 8,
              fontSize: 16,
              boxSizing: "border-box",
              resize: "vertical",
            }}
          />
        </div>

        {/* Booking Rules Section */}
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 20, paddingTop: 20, borderTop: "1px solid #E5E7EB" }}>
          Booking Rules
        </h2>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 8 }}>
            Minimum time to cancel/reschedule before appointment
          </label>
          <select
            value={settings.cancelMinutesAdvance}
            onChange={(e) => setSettings({ ...settings, cancelMinutesAdvance: Number(e.target.value) })}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid #D1D5DB",
              borderRadius: 8,
              fontSize: 16,
              backgroundColor: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            {cancelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 8 }}>
            Customers cannot cancel or reschedule within this time before their appointment.
          </p>
        </div>

      </div>

      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "12px 32px",
            backgroundColor: saving ? "#9CA3AF" : "#EC4899",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
