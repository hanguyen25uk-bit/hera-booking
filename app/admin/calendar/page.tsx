"use client";

import { useEffect, useState } from "react";

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  service: { id: string; name: string; durationMinutes: number; price: number };
  staff: { id: string; name: string };
};

type Staff = { id: string; name: string; role?: string };
type Service = { id: string; name: string; durationMinutes: number; price: number };

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [editData, setEditData] = useState({ serviceId: "", staffId: "", date: "", time: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"cancel" | "noshow" | "delete" | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    loadStaffAndServices();
  }, []);

  async function loadStaffAndServices() {
    try {
      const [staffRes, servicesRes] = await Promise.all([
        fetch("/api/staff"),
        fetch("/api/services"),
      ]);
      setStaffList(await staffRes.json());
      setServices(await servicesRes.json());
    } catch (err) {
      console.error(err);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?date=${selectedDate}`);
      setAppointments(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openAppointment(apt: Appointment) {
    setSelectedAppointment(apt);
    setModalMode("view");
    setMessage(null);
    setConfirmAction(null);
  }

  function closeModal() {
    setSelectedAppointment(null);
    setModalMode("view");
    setMessage(null);
    setConfirmAction(null);
  }

  function startEdit() {
    if (!selectedAppointment) return;
    const startDate = new Date(selectedAppointment.startTime);
    setEditData({
      serviceId: selectedAppointment.service.id,
      staffId: selectedAppointment.staff.id,
      date: startDate.toISOString().split("T")[0],
      time: startDate.toTimeString().slice(0, 5),
    });
    setModalMode("edit");
  }

  async function handleSaveEdit() {
    if (!selectedAppointment) return;
    setSaving(true);
    setMessage(null);
    try {
      const startTime = new Date(`${editData.date}T${editData.time}:00`).toISOString();
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: editData.serviceId,
          staffId: editData.staffId,
          startTime,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      setMessage({ type: "success", text: "Appointment updated!" });
      loadData();
      setTimeout(() => closeModal(), 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!selectedAppointment) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      setMessage({ type: "success", text: "Appointment cancelled. Slot is now available." });
      loadData();
      setTimeout(() => closeModal(), 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  }

  async function handleNoShow() {
    if (!selectedAppointment) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "no-show" }),
      });
      if (!res.ok) throw new Error("Failed to mark no-show");
      const data = await res.json();
      
      let msg = "Marked as no-show.";
      if (data.customerBlocked) {
        msg += ` Customer has been BLOCKED (${data.customerNoShowCount} no-shows).`;
      } else if (data.customerNoShowCount) {
        msg += ` Customer has ${data.customerNoShowCount}/3 no-shows.`;
      }
      
      setMessage({ type: "success", text: msg });
      loadData();
      setTimeout(() => closeModal(), 2500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  }

  async function handleDelete() {
    if (!selectedAppointment) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setMessage({ type: "success", text: "Appointment deleted." });
      loadData();
      setTimeout(() => closeModal(), 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  }

  async function handleRestore() {
    if (!selectedAppointment) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      if (!res.ok) throw new Error("Failed to restore");
      setMessage({ type: "success", text: "Appointment restored!" });
      loadData();
      setTimeout(() => closeModal(), 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  // Generate time slots for calendar
  const hours = Array.from({ length: 12 }, (_, i) => i + 9); // 9:00 - 20:00

  function getAppointmentStyle(apt: Appointment) {
    const start = new Date(apt.startTime);
    const end = new Date(apt.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const top = (startHour - 9) * 60;
    const height = duration * 60;
    
    let bgColor = "#6366f1";
    let borderColor = "#4f46e5";
    if (apt.status === "cancelled") { bgColor = "#94a3b8"; borderColor = "#64748b"; }
    if (apt.status === "no-show") { bgColor = "#ef4444"; borderColor = "#dc2626"; }
    if (apt.status === "completed") { bgColor = "#10b981"; borderColor = "#059669"; }
    
    return { top, height, bgColor, borderColor };
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  }

  const activeAppointments = appointments.filter(a => a.status !== "cancelled");
  const confirmedCount = appointments.filter(a => a.status === "confirmed" || a.status === "booked").length;

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", margin: 0 }}>Calendar</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0" }}>Manage appointments</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ padding: "10px 16px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14 }}
        />
      </div>

      {/* Calendar Grid */}
      <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {/* Staff Headers */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
          <div style={{ width: 60, padding: 16, borderRight: "1px solid #e2e8f0" }}></div>
          {staffList.filter(s => s.name).map((staff) => (
            <div key={staff.id} style={{ flex: 1, padding: 16, textAlign: "center", borderRight: "1px solid #e2e8f0" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontWeight: 600 }}>
                {staff.name.charAt(0)}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{staff.name}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{staff.role || "Staff"}</div>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div style={{ display: "flex", position: "relative" }}>
          {/* Time Labels */}
          <div style={{ width: 60, borderRight: "1px solid #e2e8f0" }}>
            {hours.map((hour) => (
              <div key={hour} style={{ height: 60, padding: "4px 8px", fontSize: 12, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                {hour}:00
              </div>
            ))}
          </div>

          {/* Staff Columns */}
          {staffList.filter(s => s.name).map((staff) => (
            <div key={staff.id} style={{ flex: 1, position: "relative", borderRight: "1px solid #e2e8f0" }}>
              {hours.map((hour) => (
                <div key={hour} style={{ height: 60, borderBottom: "1px solid #f1f5f9" }}></div>
              ))}
              
              {/* Appointments */}
              {activeAppointments
                .filter((apt) => apt.staff.id === staff.id)
                .map((apt) => {
                  const style = getAppointmentStyle(apt);
                  return (
                    <div
                      key={apt.id}
                      onClick={() => openAppointment(apt)}
                      style={{
                        position: "absolute",
                        top: style.top,
                        left: 4,
                        right: 4,
                        height: style.height - 4,
                        backgroundColor: style.bgColor,
                        borderLeft: `3px solid ${style.borderColor}`,
                        borderRadius: 6,
                        padding: "6px 8px",
                        cursor: "pointer",
                        overflow: "hidden",
                        opacity: apt.status === "cancelled" ? 0.5 : 1,
                      }}
                    >
                      <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{formatTime(apt.startTime)}</div>
                      <div style={{ color: "#fff", fontSize: 11, opacity: 0.9 }}>{apt.service.name}</div>
                      <div style={{ color: "#fff", fontSize: 11, opacity: 0.8 }}>{apt.customerName}</div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Stats */}
      <div style={{ marginTop: 16, display: "flex", gap: 24, fontSize: 14, color: "#64748b" }}>
        <span>Total <strong style={{ color: "#0f172a" }}>{activeAppointments.length}</strong></span>
        <span>Confirmed <strong style={{ color: "#10b981" }}>{confirmedCount}</strong></span>
        <span>Staff <strong style={{ color: "#6366f1" }}>{staffList.length}</strong></span>
      </div>

      {/* Appointment Modal */}
      {selectedAppointment && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                {modalMode === "edit" ? "Edit Appointment" : "Appointment Details"}
              </h2>
              <button onClick={closeModal} style={{ width: 32, height: 32, border: "none", background: "#f3f4f6", borderRadius: 8, fontSize: 18, cursor: "pointer" }}>×</button>
            </div>

            {/* Message */}
            {message && (
              <div style={{ margin: "16px 24px 0", padding: 12, borderRadius: 8, backgroundColor: message.type === "success" ? "#d1fae5" : "#fee2e2", color: message.type === "success" ? "#065f46" : "#991b1b", fontSize: 14 }}>
                {message.text}
              </div>
            )}

            {/* Confirm Action Dialog */}
            {confirmAction && (
              <div style={{ margin: "16px 24px", padding: 16, backgroundColor: "#fef3c7", borderRadius: 12, border: "1px solid #fcd34d" }}>
                <p style={{ margin: "0 0 12px", fontWeight: 600, color: "#92400e" }}>
                  {confirmAction === "cancel" && "Cancel this appointment?"}
                  {confirmAction === "noshow" && "Mark as No-Show?"}
                  {confirmAction === "delete" && "Permanently delete?"}
                </p>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "#a16207" }}>
                  {confirmAction === "cancel" && "The time slot will become available again."}
                  {confirmAction === "noshow" && "This will count toward the customer's no-show record. 3 no-shows = blocked."}
                  {confirmAction === "delete" && "This action cannot be undone."}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirmAction(null)} style={{ flex: 1, padding: 10, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer" }}>Cancel</button>
                  <button
                    onClick={() => {
                      if (confirmAction === "cancel") handleCancel();
                      if (confirmAction === "noshow") handleNoShow();
                      if (confirmAction === "delete") handleDelete();
                    }}
                    disabled={saving}
                    style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: confirmAction === "delete" ? "#dc2626" : "#f59e0b", color: "#fff", fontWeight: 600, cursor: "pointer" }}
                  >
                    {saving ? "..." : "Confirm"}
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            <div style={{ padding: 24 }}>
              {modalMode === "view" ? (
                <>
                  {/* Status Badge */}
                  <div style={{ marginBottom: 20 }}>
                    <span style={{
                      padding: "6px 12px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 600,
                      backgroundColor:
                        selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked" ? "#d1fae5" :
                        selectedAppointment.status === "cancelled" ? "#f3f4f6" :
                        selectedAppointment.status === "no-show" ? "#fee2e2" : "#e0e7ff",
                      color:
                        selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked" ? "#065f46" :
                        selectedAppointment.status === "cancelled" ? "#64748b" :
                        selectedAppointment.status === "no-show" ? "#991b1b" : "#3730a3",
                    }}>
                      {selectedAppointment.status === "booked" ? "Confirmed" : selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Service</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedAppointment.service.name}</div>
                    <div style={{ fontSize: 14, color: "#64748b" }}>{selectedAppointment.service.durationMinutes} mins • £{selectedAppointment.service.price}</div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Date & Time</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{formatDate(selectedAppointment.startTime)}</div>
                    <div style={{ fontSize: 14, color: "#64748b" }}>{formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}</div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Staff</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedAppointment.staff.name}</div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Customer</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedAppointment.customerName}</div>
                    <div style={{ fontSize: 14, color: "#64748b" }}>{selectedAppointment.customerPhone}</div>
                    <div style={{ fontSize: 14, color: "#64748b" }}>{selectedAppointment.customerEmail}</div>
                  </div>

                  {/* Action Buttons */}
                  {!confirmAction && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked") && (
                        <>
                          <button onClick={startEdit} style={{ padding: 14, border: "none", borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                            ✏️ Edit Appointment
                          </button>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setConfirmAction("cancel")} style={{ flex: 1, padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", color: "#64748b", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                              Cancel
                            </button>
                            <button onClick={() => setConfirmAction("noshow")} style={{ flex: 1, padding: 12, border: "1px solid #fecaca", borderRadius: 10, background: "#fef2f2", color: "#dc2626", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                              No-Show
                            </button>
                          </div>
                        </>
                      )}
                      
                      {(selectedAppointment.status === "cancelled" || selectedAppointment.status === "no-show") && (
                        <>
                          <button onClick={handleRestore} disabled={saving} style={{ padding: 14, border: "none", borderRadius: 10, background: "#10b981", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                            ↩️ Restore Appointment
                          </button>
                          <button onClick={() => setConfirmAction("delete")} style={{ padding: 12, border: "1px solid #fecaca", borderRadius: 10, background: "#fff", color: "#dc2626", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                            🗑 Delete Permanently
                          </button>
                        </>
                      )}

                      <button onClick={closeModal} style={{ padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", color: "#64748b", fontSize: 15, cursor: "pointer", marginTop: 8 }}>
                        Close
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Edit Mode */
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Service</label>
                    <select
                      value={editData.serviceId}
                      onChange={(e) => setEditData({ ...editData, serviceId: e.target.value })}
                      style={{ width: "100%", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 15 }}
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min - £{s.price})</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Staff</label>
                    <select
                      value={editData.staffId}
                      onChange={(e) => setEditData({ ...editData, staffId: e.target.value })}
                      style={{ width: "100%", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 15 }}
                    >
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Date</label>
                      <input
                        type="date"
                        value={editData.date}
                        onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                        style={{ width: "100%", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 15 }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Time</label>
                      <input
                        type="time"
                        value={editData.time}
                        onChange={(e) => setEditData({ ...editData, time: e.target.value })}
                        style={{ width: "100%", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 15 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setModalMode("view")} style={{ flex: 1, padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", color: "#64748b", fontSize: 15, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button onClick={handleSaveEdit} disabled={saving} style={{ flex: 1, padding: 14, border: "none", borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
