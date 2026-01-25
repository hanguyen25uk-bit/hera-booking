"use client";

import { useEffect, useState } from "react";

type Staff = {
  id: string;
  name: string;
};

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

export default function SchedulePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingOverride, setEditingOverride] = useState<Override | null>(null);

  // Form state
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formIsMultipleDays, setFormIsMultipleDays] = useState(false);
  const [formIsDayOff, setFormIsDayOff] = useState(true);
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("17:00");
  const [formNote, setFormNote] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [staffRes, overridesRes] = await Promise.all([
        fetch("/api/admin/staff"),
        fetch("/api/admin/schedule-override"),
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
      // Calculate dates to create
      const dates: string[] = [];
      
      if (formIsMultipleDays && formEndDate) {
        // Multiple days
        const start = new Date(formStartDate);
        const end = new Date(formEndDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split("T")[0]);
        }
      } else {
        // Single day
        dates.push(formStartDate);
      }

      // Create override for each date
      await Promise.all(
        dates.map((date) =>
          fetch("/api/admin/schedule-override", {
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
    setFormStartDate("");
    setFormEndDate("");
    setFormIsMultipleDays(false);
    setFormIsDayOff(true);
    setFormStartTime("09:00");
    setFormEndTime("17:00");
    setFormNote("");
    setSelectedStaffId("");
    setEditingOverride(null);
  }

  function openAddModal(staffId: string) {
    setSelectedStaffId(staffId);
    const today = new Date().toISOString().split("T")[0];
    setFormStartDate(today);
    setFormEndDate(today);
    setFormIsMultipleDays(false);
    setFormIsDayOff(true);
    setFormStartTime("09:00");
    setFormEndTime("17:00");
    setFormNote("");
    setEditingOverride(null);
    setShowModal(true);
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
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // Calculate number of days selected
  function getDaysCount() {
    if (!formIsMultipleDays || !formStartDate || !formEndDate) return 1;
    const start = new Date(formStartDate);
    const end = new Date(formEndDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }

  // Generate time options
  const timeOptions: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeOptions.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
  }

  if (loading) {
    return <div style={styles.page}><p>Loading...</p></div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Schedule Overrides</h1>
          <p style={styles.subtitle}>Manage day offs and custom working hours</p>
        </div>
      </div>

      {/* Staff Cards */}
      <div style={styles.staffGrid}>
        {staff.map((s) => (
          <div key={s.id} style={styles.staffCard}>
            <div style={styles.staffInfo}>
              <div style={styles.avatar}>{s.name.charAt(0)}</div>
              <span style={styles.staffName}>{s.name}</span>
            </div>
            <button style={styles.btnAdd} onClick={() => openAddModal(s.id)}>
              + Add Day Off / Custom Hours
            </button>
          </div>
        ))}
      </div>

      {/* Overrides List */}
      <h2 style={styles.sectionTitle}>Upcoming Overrides</h2>
      <div style={styles.tableCard}>
        {overrides.length === 0 ? (
          <div style={styles.empty}>No schedule overrides yet</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Staff</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Hours</th>
                <th style={styles.th}>Note</th>
                <th style={{...styles.th, textAlign: "right"}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id} style={styles.tr}>
                  <td style={styles.td}>{o.staff.name}</td>
                  <td style={styles.td}>{formatDate(o.date)}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: o.isDayOff ? "#fef2f2" : "#ecfdf5",
                      color: o.isDayOff ? "#dc2626" : "#059669",
                    }}>
                      {o.isDayOff ? "Day Off" : "Custom Hours"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {o.isDayOff ? "—" : `${o.startTime} - ${o.endTime}`}
                  </td>
                  <td style={styles.td}>{o.note || "—"}</td>
                  <td style={{...styles.td, textAlign: "right"}}>
                    <div style={styles.actionButtons}>
                      <button style={styles.btnEdit} onClick={() => openEditModal(o)}>
                        ✏️
                      </button>
                      <button style={styles.btnDelete} onClick={() => handleDelete(o.id)}>
                        🗑
                      </button>
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
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingOverride ? "Edit Schedule Override" : "Add Schedule Override"}
              </h2>
              <button style={styles.closeBtn} onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.staffLabel}>
                For: <strong>{staff.find(s => s.id === selectedStaffId)?.name}</strong>
              </p>

              {/* Multiple Days Toggle - only for new entries */}
              {!editingOverride && (
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formIsMultipleDays}
                    onChange={(e) => setFormIsMultipleDays(e.target.checked)}
                    style={styles.checkbox}
                  />
                  Multiple days (Nghỉ nhiều ngày)
                </label>
              )}

              <div style={formIsMultipleDays ? styles.dateRow : {}}>
                <label style={{...styles.label, flex: 1}}>
                  {formIsMultipleDays ? "From Date" : "Date"}
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (!formIsMultipleDays) setFormEndDate(e.target.value);
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    style={styles.input}
                  />
                </label>

                {formIsMultipleDays && (
                  <label style={{...styles.label, flex: 1}}>
                    To Date
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      min={formStartDate || new Date().toISOString().split("T")[0]}
                      style={styles.input}
                    />
                  </label>
                )}
              </div>

              {formIsMultipleDays && formStartDate && formEndDate && (
                <div style={styles.daysInfo}>
                  📅 {getDaysCount()} day(s) selected
                </div>
              )}

              <label style={styles.label}>
                Type
                <select
                  value={formIsDayOff ? "dayoff" : "custom"}
                  onChange={(e) => setFormIsDayOff(e.target.value === "dayoff")}
                  style={styles.input}
                >
                  <option value="dayoff">Day Off (Nghỉ cả ngày)</option>
                  <option value="custom">Custom Hours (Giờ khác)</option>
                </select>
              </label>

              {!formIsDayOff && (
                <div style={styles.timeRow}>
                  <label style={{...styles.label, flex: 1}}>
                    Start Time
                    <select
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      style={styles.input}
                    >
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{...styles.label, flex: 1}}>
                    End Time
                    <select
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      style={styles.input}
                    >
                      {timeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <label style={styles.label}>
                Note (Optional)
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. Holiday, Doctor appointment, Vacation"
                  style={styles.input}
                />
              </label>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnSecondary} onClick={() => { setShowModal(false); resetForm(); }}>
                Cancel
              </button>
              <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : (editingOverride ? "Update" : `Save${formIsMultipleDays ? ` (${getDaysCount()} days)` : ""}`)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: { maxWidth: 1200 },
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
  staffGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
    marginBottom: 40,
  },
  staffCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  staffInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
  },
  staffName: {
    fontWeight: 600,
    color: "#0f172a",
  },
  btnAdd: {
    padding: "8px 16px",
    backgroundColor: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 13,
    color: "#475569",
    cursor: "pointer",
    fontWeight: 500,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: 16,
  },
  tableCard: {
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
    fontSize: 14,
    color: "#334155",
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
  },
  actionButtons: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },
  btnEdit: {
    width: 32,
    height: 32,
    border: "none",
    backgroundColor: "#e0f2fe",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDelete: {
    width: 32,
    height: 32,
    border: "none",
    backgroundColor: "#fef2f2",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    padding: 40,
    textAlign: "center",
    color: "#64748b",
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxWidth: 500,
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
  },
  closeBtn: {
    width: 32,
    height: 32,
    border: "none",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    fontSize: 20,
    cursor: "pointer",
    color: "#64748b",
  },
  modalBody: {
    padding: 24,
  },
  modalFooter: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
  },
  staffLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    color: "#374151",
    marginBottom: 20,
    padding: "12px 16px",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    cursor: "pointer",
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: "pointer",
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 16,
  },
  input: {
    display: "block",
    width: "100%",
    padding: "10px 14px",
    marginTop: 6,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
  },
  dateRow: {
    display: "flex",
    gap: 16,
  },
  timeRow: {
    display: "flex",
    gap: 16,
  },
  daysInfo: {
    padding: "10px 14px",
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    color: "#059669",
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 16,
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
  btnSecondary: {
    padding: "10px 20px",
    backgroundColor: "#fff",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
};
