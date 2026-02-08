"use client";

import { useState, useEffect } from "react";

type Staff = {
  id: string;
  name: string;
  role?: string | null;
  active: boolean;
};

type WorkingHour = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const AVATAR_COLORS = ["var(--rose)", "var(--sage)", "var(--gold)", "var(--ink)"];

const getDefaultHours = (): WorkingHour[] => [
  { dayOfWeek: 0, startTime: "10:00", endTime: "17:00", isWorking: true },
  { dayOfWeek: 1, startTime: "10:00", endTime: "19:00", isWorking: true },
  { dayOfWeek: 2, startTime: "10:00", endTime: "19:00", isWorking: true },
  { dayOfWeek: 3, startTime: "10:00", endTime: "19:00", isWorking: true },
  { dayOfWeek: 4, startTime: "10:00", endTime: "19:00", isWorking: true },
  { dayOfWeek: 5, startTime: "10:00", endTime: "19:00", isWorking: true },
  { dayOfWeek: 6, startTime: "10:00", endTime: "19:00", isWorking: true },
];

export default function WorkingHoursPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(getDefaultHours());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await fetch("/api/staff", { credentials: "include" });
        const data = await res.json();
        const activeStaff = data.filter((s: Staff) => s.active);
        setStaff(activeStaff);
        if (activeStaff.length > 0) {
          setSelectedStaff(activeStaff[0].id);
        }
      } catch (error) {
        console.error("Failed to load staff:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStaff();
  }, []);

  useEffect(() => {
    if (!selectedStaff) return;

    async function loadWorkingHours() {
      try {
        const res = await fetch(`/api/working-hours?staffId=${selectedStaff}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length === 7) {
          setWorkingHours(data);
        } else {
          setWorkingHours(getDefaultHours());
        }
      } catch (error) {
        console.error("Failed to load working hours:", error);
        setWorkingHours(getDefaultHours());
      }
    }
    loadWorkingHours();
  }, [selectedStaff]);

  const timeOptions: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeOptions.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
  }

  const updateHour = (dayOfWeek: number, field: keyof WorkingHour, value: string | boolean) => {
    setWorkingHours((prev) => prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h)));
  };

  const applyToAllDays = () => {
    const sunday = workingHours.find((h) => h.dayOfWeek === 0);
    if (!sunday) return;

    setWorkingHours((prev) =>
      prev.map((h) => ({ ...h, startTime: sunday.startTime, endTime: sunday.endTime, isWorking: sunday.isWorking }))
    );
    setMessage({ type: "success", text: "Applied Sunday hours to all days" });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/working-hours", {
        credentials: "include",
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selectedStaff, hours: workingHours }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Working hours saved successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save working hours" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save working hours" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
            Staff Working Hours
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 6, fontFamily: "var(--font-body)" }}>
            Set working hours for each staff member
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

      {/* Staff Pills */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {staff.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setSelectedStaff(s.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              borderRadius: 50,
              border: selectedStaff === s.id ? "2px solid var(--rose)" : "1px solid var(--cream-dark)",
              backgroundColor: selectedStaff === s.id ? "var(--rose-pale)" : "var(--white)",
              color: selectedStaff === s.id ? "var(--rose)" : "var(--ink)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: selectedStaff === s.id ? "var(--rose)" : AVATAR_COLORS[idx % AVATAR_COLORS.length],
              color: "var(--white)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: 12,
            }}>
              {s.name.charAt(0).toUpperCase()}
            </div>
            {s.name}
          </button>
        ))}
      </div>

      {/* Schedule Table */}
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
              <th style={{ textAlign: "center", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Working</th>
              <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Start</th>
              <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>End</th>
              <th style={{ textAlign: "center", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}></th>
            </tr>
          </thead>
          <tbody>
            {workingHours.map((hour) => (
              <tr key={hour.dayOfWeek} style={{ borderBottom: "1px solid var(--cream-dark)" }}>
                <td style={{ padding: "18px 20px" }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15, fontFamily: "var(--font-body)" }}>
                    {DAYS[hour.dayOfWeek]}
                  </span>
                </td>
                <td style={{ padding: "18px 20px", textAlign: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={hour.isWorking}
                      onChange={(e) => updateHour(hour.dayOfWeek, "isWorking", e.target.checked)}
                      style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--rose)" }}
                    />
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: 50,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontFamily: "var(--font-body)",
                      backgroundColor: hour.isWorking ? "var(--sage-light)" : "var(--rose-pale)",
                      color: hour.isWorking ? "var(--sage)" : "var(--rose)"
                    }}>
                      {hour.isWorking ? "On" : "Off"}
                    </span>
                  </label>
                </td>
                <td style={{ padding: "18px 20px" }}>
                  <select
                    value={hour.startTime}
                    onChange={(e) => updateHour(hour.dayOfWeek, "startTime", e.target.value)}
                    disabled={!hour.isWorking}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid var(--cream-dark)",
                      fontSize: 14,
                      backgroundColor: hour.isWorking ? "var(--cream)" : "var(--cream-dark)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-body)",
                      cursor: hour.isWorking ? "pointer" : "not-allowed",
                      opacity: hour.isWorking ? 1 : 0.5
                    }}
                  >
                    {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td style={{ padding: "18px 20px" }}>
                  <select
                    value={hour.endTime}
                    onChange={(e) => updateHour(hour.dayOfWeek, "endTime", e.target.value)}
                    disabled={!hour.isWorking}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid var(--cream-dark)",
                      fontSize: 14,
                      backgroundColor: hour.isWorking ? "var(--cream)" : "var(--cream-dark)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-body)",
                      cursor: hour.isWorking ? "pointer" : "not-allowed",
                      opacity: hour.isWorking ? 1 : 0.5
                    }}
                  >
                    {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td style={{ padding: "18px 20px", textAlign: "center" }}>
                  {hour.dayOfWeek === 0 && (
                    <button
                      onClick={applyToAllDays}
                      style={{
                        padding: "8px 14px",
                        backgroundColor: "var(--ink)",
                        color: "var(--cream)",
                        border: "none",
                        borderRadius: 50,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        fontFamily: "var(--font-body)"
                      }}
                    >
                      Apply to All
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
