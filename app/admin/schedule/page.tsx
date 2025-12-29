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

  // Form state
  const [formDate, setFormDate] = useState("");
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
    if (!selectedStaffId || !formDate) return;
    setSaving(true);

    try {
      await fetch("/api/admin/schedule-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedStaffId,
          date: formDate,
          isDayOff: formIsDayOff,
          startTime: formIsDayOff ? null : formStartTime,
          endTime: formIsDayOff ? null : formEndTime,
          note: formNote || null,
        }),
      });
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
    setFormDate("");
    setFormIsDayOff(true);
    setFormStartTime("09:00");
    setFormEndTime("17:00");
    setFormNote("");
    setSelectedStaffId("");
  }

  function openModal(staffId: string) {
    setSelectedStaffId(staffId);
    setFormDate(new Date().toISOString().split("T")[0]);
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
            <button style={styles.btnAdd} onClick={() => openModal(s.id)}>
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
                <th style={{...styles.th, textAlign: "right"}}>Action</th>
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
                    <button style={styles.btnDelete} onClick={() => handleDelete(o.id)}>
                      🗑
                    </button>
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
                Add Schedule Override
              </h2>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.staffLabel}>
                For: <strong>{staff.find(s => s.id === selectedStaffId)?.name}</strong>
              </p>

              <label style={styles.label}>
                Date
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  style={styles.input}
                />
              </label>

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
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      style={styles.input}
                    />
                  </label>
                  <label style={{...styles.label, flex: 1}}>
                    End Time
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      style={styles.input}
                    />
                  </label>
                </div>
              )}

              <label style={styles.label}>
                Note (Optional)
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. Doctor appointment, Holiday"
                  style={styles.input}
                />
              </label>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnSecondary} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
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
  btnDelete: {
    width: 32,
    height: 32,
    border: "none",
    backgroundColor: "#fef2f2",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
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
    maxWidth: 480,
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
    marginBottom: 20,
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
  timeRow: {
    display: "flex",
    gap: 16,
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
