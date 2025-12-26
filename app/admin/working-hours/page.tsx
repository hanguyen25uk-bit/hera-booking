"use client";

import { useState, useEffect } from "react";

type Staff = {
  id: string;
  name: string;
  role?: string | null;
  active: boolean;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WorkingHoursPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await fetch("/api/staff");
        const data = await res.json();
        const activeStaff = data.filter((s: Staff) => s.active);
        setStaff(activeStaff);
        if (activeStaff.length > 0) setSelectedStaff(activeStaff[0].id);
      } catch (error) {
        console.error("Failed to load staff:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStaff();
  }, []);

  const timeOptions: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeOptions.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
  }

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

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
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
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#374151" }}>Working</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#374151" }}>Start Time</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14, fontWeight: 600, color: "#374151" }}>End Time</th>
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, index) => (
              <tr key={day} style={{ borderTop: "1px solid #E5E7EB" }}>
                <td style={{ padding: "12px 16px", fontSize: 14, color: "#111827" }}>{day}</td>
                <td style={{ padding: "12px 16px" }}>
                  <input type="checkbox" defaultChecked={index >= 1 && index <= 6} style={{ width: 18, height: 18 }} />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <select defaultValue="09:00" style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 14 }}>
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <select defaultValue="18:00" style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #D1D5DB", fontSize: 14 }}>
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
        <button style={{ padding: "12px 24px", backgroundColor: "#EC4899", color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Save Changes
        </button>
      </div>
    </div>
  );
}
