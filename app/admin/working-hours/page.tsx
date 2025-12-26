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
        const res = await fetch("/api/staff");
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
    setWorkingHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/working-hours", {
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
      <div style={{ padding: 24, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: 0 }}>Working Hours</h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>Set working hours for each staff member</p>
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

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {staff.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStaff(s.id)}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid #E5E7EB",
              backgroundColor: selectedStaff === s.id ? "#EC4899" : "#FFFFFF",
              color: selectedStaff === s.id ? "#FFFFFF" : "#374151",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#F9FAFB" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#374151" }}>Day</th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600, color: "#374151" }}>Working</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#374151" }}>Start Time</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#374151" }}>End Time</th>
            </tr>
          </thead>
          <tbody>
            {workingHours.map((hour) => (
              <tr key={hour.dayOfWeek} style={{ borderTop: "1px solid #E5E7EB" }}>
                <td style={{ padding: "12px 16px", fontSize: 14, color: "#111827", fontWeight: 500 }}>
                  {DAYS[hour.dayOfWeek]}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={hour.isWorking}
                    onChange={(e) => updateHour(hour.dayOfWeek, "isWorking", e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <select
                    value={hour.startTime}
                    onChange={(e) => updateHour(hour.dayOfWeek, "startTime", e.target.value)}
                    disabled={!hour.isWorking}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #D1D5DB",
                      fontSize: 14,
                      backgroundColor: hour.isWorking ? "#FFFFFF" : "#F3F4F6",
                      cursor: hour.isWorking ? "pointer" : "not-allowed",
                    }}
                  >
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <select
                    value={hour.endTime}
                    onChange={(e) => updateHour(hour.dayOfWeek, "endTime", e.target.value)}
                    disabled={!hour.isWorking}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #D1D5DB",
                      fontSize: 14,
                      backgroundColor: hour.isWorking ? "#FFFFFF" : "#F3F4F6",
                      cursor: hour.isWorking ? "pointer" : "not-allowed",
                    }}
                  >
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "12px 24px",
            backgroundColor: saving ? "#9CA3AF" : "#EC4899",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
