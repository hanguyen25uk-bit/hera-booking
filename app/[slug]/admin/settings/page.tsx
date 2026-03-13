"use client";

import { useState, useEffect } from "react";

type Settings = {
  salonName: string;
  salonSlug: string;
  salonPhone: string;
  salonAddress: string;
  cancelMinutesAdvance: number;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    salonName: "Hera Nail Spa",
    salonSlug: "",
    salonPhone: "020 1234 5678",
    salonAddress: "123 Example Street, London, SW11 1AA",
    cancelMinutesAdvance: 1440,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [originalSlug, setOriginalSlug] = useState<string>("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        if (data && !data.error) {
          setSettings(data);
          setOriginalSlug(data.salonSlug || "");
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

      const data = await res.json();

      if (res.ok) {
        // If slug changed, redirect to the new URL
        if (data.salonSlug && data.salonSlug !== originalSlug) {
          setMessage({ type: "success", text: `Saved! New URL: herabooking.com/${data.salonSlug}/booking - Redirecting...` });
          setTimeout(() => {
            window.location.href = `/${data.salonSlug}/admin/settings`;
          }, 2000);
          return;
        }
        setMessage({ type: "success", text: `Settings saved! Booking URL: herabooking.com/${data.salonSlug}/booking` });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save settings" });
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
      <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 600,
          color: "var(--ink)",
          margin: 0,
          fontFamily: "var(--font-heading)"
        }}>
          Settings
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 6, fontFamily: "var(--font-body)" }}>
          Manage your salon settings
        </p>
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
        padding: 32,
        border: "1px solid var(--cream-dark)",
        boxShadow: "var(--shadow-sm)"
      }}>

        {/* Salon Info Section */}
        <h2 style={{
          fontSize: 18,
          fontWeight: 600,
          color: "var(--ink)",
          marginTop: 0,
          marginBottom: 24,
          fontFamily: "var(--font-heading)"
        }}>
          Salon Information
        </h2>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: "block",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--ink-light)",
            marginBottom: 8,
            fontFamily: "var(--font-body)"
          }}>
            Salon Name
          </label>
          <input
            type="text"
            value={settings.salonName}
            onChange={(e) => setSettings({ ...settings, salonName: e.target.value })}
            style={{
              width: "100%",
              padding: "14px 16px",
              backgroundColor: "var(--cream)",
              border: "1px solid var(--cream-dark)",
              borderRadius: 12,
              fontSize: 15,
              boxSizing: "border-box",
              color: "var(--ink)",
              fontFamily: "var(--font-body)",
              outline: "none"
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: "block",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--ink-light)",
            marginBottom: 8,
            fontFamily: "var(--font-body)"
          }}>
            Booking URL
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span style={{
              padding: "14px 16px",
              backgroundColor: "var(--cream)",
              border: "1px solid var(--cream-dark)",
              borderRight: "none",
              borderRadius: "12px 0 0 12px",
              fontSize: 14,
              color: "var(--ink-muted)",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-body)"
            }}>
              herabooking.com/
            </span>
            <input
              type="text"
              value={settings.salonSlug}
              onChange={(e) => {
                // Convert to URL-safe slug format and strip leading/trailing hyphens
                const slug = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '-')
                  .replace(/-+/g, '-')
                  .replace(/^-+|-+$/g, '');
                setSettings({ ...settings, salonSlug: slug });
              }}
              placeholder="your-salon-name"
              style={{
                flex: 1,
                padding: "14px 16px",
                backgroundColor: "var(--cream)",
                border: "1px solid var(--cream-dark)",
                borderRadius: "0 12px 12px 0",
                fontSize: 15,
                boxSizing: "border-box",
                color: "var(--ink)",
                fontFamily: "var(--font-body)",
                outline: "none"
              }}
            />
          </div>
          <p style={{
            fontSize: 13,
            color: "var(--ink-muted)",
            marginTop: 10,
            fontFamily: "var(--font-body)"
          }}>
            This is your booking page URL. Use only lowercase letters, numbers, and hyphens.
          </p>
          {settings.salonSlug && (
            <p style={{
              fontSize: 13,
              color: "var(--rose)",
              marginTop: 6,
              fontFamily: "var(--font-body)"
            }}>
              Preview: herabooking.com/<strong>{settings.salonSlug}</strong>/booking
            </p>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: "block",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--ink-light)",
            marginBottom: 8,
            fontFamily: "var(--font-body)"
          }}>
            Phone Number
          </label>
          <input
            type="tel"
            value={settings.salonPhone}
            onChange={(e) => setSettings({ ...settings, salonPhone: e.target.value })}
            style={{
              width: "100%",
              padding: "14px 16px",
              backgroundColor: "var(--cream)",
              border: "1px solid var(--cream-dark)",
              borderRadius: 12,
              fontSize: 15,
              boxSizing: "border-box",
              color: "var(--ink)",
              fontFamily: "var(--font-body)",
              outline: "none"
            }}
          />
        </div>

        <div style={{ marginBottom: 36 }}>
          <label style={{
            display: "block",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--ink-light)",
            marginBottom: 8,
            fontFamily: "var(--font-body)"
          }}>
            Address
          </label>
          <textarea
            value={settings.salonAddress}
            onChange={(e) => setSettings({ ...settings, salonAddress: e.target.value })}
            rows={2}
            style={{
              width: "100%",
              padding: "14px 16px",
              backgroundColor: "var(--cream)",
              border: "1px solid var(--cream-dark)",
              borderRadius: 12,
              fontSize: 15,
              boxSizing: "border-box",
              resize: "vertical",
              color: "var(--ink)",
              fontFamily: "var(--font-body)",
              outline: "none"
            }}
          />
        </div>

        {/* Booking Rules Section */}
        <div style={{
          paddingTop: 28,
          borderTop: "1px solid var(--cream-dark)"
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--ink)",
            marginTop: 0,
            marginBottom: 24,
            fontFamily: "var(--font-heading)"
          }}>
            Booking Rules
          </h2>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: "block",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ink-light)",
              marginBottom: 8,
              fontFamily: "var(--font-body)"
            }}>
              Minimum time to cancel/reschedule before appointment
            </label>
            <select
              value={settings.cancelMinutesAdvance}
              onChange={(e) => setSettings({ ...settings, cancelMinutesAdvance: Number(e.target.value) })}
              style={{
                width: "100%",
                padding: "14px 16px",
                backgroundColor: "var(--cream)",
                border: "1px solid var(--cream-dark)",
                borderRadius: 12,
                fontSize: 15,
                cursor: "pointer",
                color: "var(--ink)",
                fontFamily: "var(--font-body)"
              }}
            >
              {cancelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p style={{
              fontSize: 13,
              color: "var(--ink-muted)",
              marginTop: 10,
              fontFamily: "var(--font-body)"
            }}>
              Customers cannot cancel or reschedule within this time before their appointment.
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "14px 36px",
            backgroundColor: saving ? "var(--ink-muted)" : "var(--rose)",
            color: "var(--white)",
            border: "none",
            borderRadius: 50,
            fontSize: 15,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "var(--font-body)",
            transition: "all 0.2s ease"
          }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
