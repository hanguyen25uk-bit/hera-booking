"use client";

import { useEffect, useState } from "react";

type Staff = { id: string; name: string };

type Override = {
  id: string;
  staffId: string;
  date: string;
  isDayOff: boolean;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
  staff: Staff;
};

const AVATAR_COLORS = ["var(--rose)", "var(--sage)", "var(--gold)", "var(--ink)"];

export default function SchedulePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingOverride, setEditingOverride] = useState<Override | null>(null);

  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formIsMultipleDays, setFormIsMultipleDays] = useState(false);
  const [formIsDayOff, setFormIsDayOff] = useState(true);
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("17:00");
  const [formNote, setFormNote] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [staffRes, overridesRes] = await Promise.all([
        fetch("/api/admin/staff", { credentials: "include" }),
        fetch("/api/admin/schedule-override", { credentials: "include" }),
      ]);
      setStaff(await staffRes.json());
      setOverrides(await overridesRes.json());
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedStaffId || !formStartDate) return;
    setSaving(true);

    try {
      const dates: string[] = [];
      if (formIsMultipleDays && formEndDate) {
        const start = new Date(formStartDate);
        const end = new Date(formEndDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split("T")[0]);
        }
      } else {
        dates.push(formStartDate);
      }

      await Promise.all(
        dates.map((date) =>
          fetch("/api/admin/schedule-override", {
            credentials: "include",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              staffId: selectedStaffId,
              date,
              isDayOff: formIsDayOff,
              startTime: formIsDayOff ? null : formStartTime,
              endTime: formIsDayOff ? null : formEndTime,
              note: formNote || null,
            }),
          })
        )
      );

      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      alert("Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this schedule override?")) return;
    try {
      await fetch(`/api/admin/schedule-override?id=${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      alert("Error deleting");
    }
  }

  function resetForm() {
    setFormStartDate(""); setFormEndDate(""); setFormIsMultipleDays(false);
    setFormIsDayOff(true); setFormStartTime("09:00"); setFormEndTime("17:00");
    setFormNote(""); setSelectedStaffId(""); setEditingOverride(null);
  }

  function openAddModal(staffId: string) {
    setSelectedStaffId(staffId);
    const today = new Date().toISOString().split("T")[0];
    setFormStartDate(today); setFormEndDate(today); setFormIsMultipleDays(false);
    setFormIsDayOff(true); setFormStartTime("09:00"); setFormEndTime("17:00");
    setFormNote(""); setEditingOverride(null); setShowModal(true);
  }

  function openEditModal(override: Override) {
    setSelectedStaffId(override.staffId);
    setFormStartDate(override.date.split("T")[0]);
    setFormEndDate(override.date.split("T")[0]);
    setFormIsMultipleDays(false);
    setFormIsDayOff(override.isDayOff);
    setFormStartTime(override.startTime || "09:00");
    setFormEndTime(override.endTime || "17:00");
    setFormNote(override.note || "");
    setEditingOverride(override);
    setShowModal(true);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  function getDaysCount() {
    if (!formIsMultipleDays || !formStartDate || !formEndDate) return 1;
    const start = new Date(formStartDate);
    const end = new Date(formEndDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }

  const timeOptions: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeOptions.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
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
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
          Schedule Overrides
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 6, fontFamily: "var(--font-body)" }}>
          Manage day offs and custom working hours
        </p>
      </div>

      {/* Staff Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20, marginBottom: 40 }}>
        {staff.map((s, idx) => (
          <div key={s.id} style={{
            backgroundColor: "var(--white)",
            borderRadius: 16,
            border: "1px solid var(--cream-dark)",
            padding: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "var(--shadow-sm)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                color: "var(--white)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 18,
                fontFamily: "var(--font-body)"
              }}>
                {s.name.charAt(0)}
              </div>
              <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15, fontFamily: "var(--font-body)" }}>{s.name}</span>
            </div>
            <button onClick={() => openAddModal(s.id)} style={{
              padding: "10px 16px",
              backgroundColor: "var(--cream)",
              border: "1px solid var(--cream-dark)",
              borderRadius: 50,
              fontSize: 13,
              color: "var(--ink-light)",
              cursor: "pointer",
              fontWeight: 500,
              fontFamily: "var(--font-body)"
            }}>
              + Add Override
            </button>
          </div>
        ))}
      </div>

      {/* Overrides List */}
      <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", marginBottom: 16, fontFamily: "var(--font-heading)" }}>Upcoming Overrides</h2>
      <div style={{
        backgroundColor: "var(--white)",
        borderRadius: 16,
        border: "1px solid var(--cream-dark)",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)"
      }}>
        {overrides.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
            No schedule overrides yet
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--cream)" }}>
                <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Staff</th>
                <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Date</th>
                <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Type</th>
                <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Hours</th>
                <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Note</th>
                <th style={{ textAlign: "right", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid var(--cream-dark)" }}>
                  <td style={{ padding: "18px 20px", fontSize: 14, color: "var(--ink)", fontWeight: 500, fontFamily: "var(--font-body)" }}>{o.staff.name}</td>
                  <td style={{ padding: "18px 20px", fontSize: 14, color: "var(--ink-light)", fontFamily: "var(--font-body)" }}>{formatDate(o.date)}</td>
                  <td style={{ padding: "18px 20px" }}>
                    <span style={{
                      padding: "5px 12px",
                      borderRadius: 50,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: o.isDayOff ? "var(--rose-pale)" : "var(--sage-light)",
                      color: o.isDayOff ? "var(--rose)" : "var(--sage)",
                      fontFamily: "var(--font-body)"
                    }}>
                      {o.isDayOff ? "Day Off" : "Custom Hours"}
                    </span>
                  </td>
                  <td style={{ padding: "18px 20px", fontSize: 14, color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                    {o.isDayOff ? "—" : `${o.startTime} - ${o.endTime}`}
                  </td>
                  <td style={{ padding: "18px 20px", fontSize: 14, color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>{o.note || "—"}</td>
                  <td style={{ padding: "18px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => openEditModal(o)} style={{ width: 34, height: 34, border: "none", backgroundColor: "var(--cream)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>✏️</button>
                      <button onClick={() => handleDelete(o.id)} style={{ width: 34, height: 34, border: "none", backgroundColor: "var(--rose-pale)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(26,23,21,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ backgroundColor: "var(--white)", borderRadius: 16, width: "100%", maxWidth: 500, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--cream-dark)" }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)" }}>
                {editingOverride ? "Edit Override" : "Add Override"}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ width: 32, height: 32, border: "none", backgroundColor: "var(--cream)", borderRadius: 8, fontSize: 18, cursor: "pointer", color: "var(--ink-muted)" }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ fontSize: 14, color: "var(--ink-muted)", marginBottom: 20, fontFamily: "var(--font-body)" }}>
                For: <strong style={{ color: "var(--ink)" }}>{staff.find(s => s.id === selectedStaffId)?.name}</strong>
              </p>

              {!editingOverride && (
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--ink-light)", marginBottom: 20, padding: "14px 16px", backgroundColor: "var(--cream)", borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                  <input type="checkbox" checked={formIsMultipleDays} onChange={(e) => setFormIsMultipleDays(e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--rose)" }} />
                  Multiple days
                </label>
              )}

              <div style={{ display: formIsMultipleDays ? "flex" : "block", gap: 16, marginBottom: 18 }}>
                <label style={{ display: "block", flex: 1 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>{formIsMultipleDays ? "From Date" : "Date"}</span>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => { setFormStartDate(e.target.value); if (!formIsMultipleDays) setFormEndDate(e.target.value); }}
                    min={new Date().toISOString().split("T")[0]}
                    style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }}
                  />
                </label>
                {formIsMultipleDays && (
                  <label style={{ display: "block", flex: 1 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>To Date</span>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      min={formStartDate || new Date().toISOString().split("T")[0]}
                      style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }}
                    />
                  </label>
                )}
              </div>

              {formIsMultipleDays && formStartDate && formEndDate && (
                <div style={{ padding: "12px 14px", backgroundColor: "var(--sage-light)", borderRadius: 10, color: "var(--sage)", fontSize: 14, fontWeight: 500, marginBottom: 18, fontFamily: "var(--font-body)" }}>
                  {getDaysCount()} day(s) selected
                </div>
              )}

              <label style={{ display: "block", marginBottom: 18 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Type</span>
                <select
                  value={formIsDayOff ? "dayoff" : "custom"}
                  onChange={(e) => setFormIsDayOff(e.target.value === "dayoff")}
                  style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }}
                >
                  <option value="dayoff">Day Off</option>
                  <option value="custom">Custom Hours</option>
                </select>
              </label>

              {!formIsDayOff && (
                <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
                  <label style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Start</span>
                    <select value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }}>
                      {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>End</span>
                    <select value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }}>
                      {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                </div>
              )}

              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Note (Optional)</span>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. Holiday, Doctor appointment"
                  style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid var(--cream-dark)", backgroundColor: "var(--cream)" }}>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ padding: "12px 24px", backgroundColor: "var(--white)", color: "var(--ink-light)", border: "1px solid var(--cream-dark)", borderRadius: 50, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "12px 24px", backgroundColor: "var(--ink)", color: "var(--cream)", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                {saving ? "Saving..." : (editingOverride ? "Update" : `Save${formIsMultipleDays ? ` (${getDaysCount()} days)` : ""}`)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
