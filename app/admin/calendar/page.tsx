"use client";

import { useEffect, useState, useCallback } from "react";

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  service: { id: string; name: string; durationMinutes: number; price: number };
  staff: { id: string; name: string };
  status: string;
};

type Staff = { id: string; name: string; role?: string | null; active: boolean };

export default function AdminCalendarPage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await fetch("/api/staff");
        const data = await res.json();
        setStaff(data.filter((s: Staff) => s.active && s.name));
      } catch (error) { console.error("Failed to load staff:", error); }
    }
    loadStaff();
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    async function loadAppointments() {
      setLoading(true);
      try {
        const res = await fetch(`/api/appointments?date=${selectedDate}`);
        setAppointments(await res.json());
      } catch (error) { console.error("Failed to load appointments:", error); }
      finally { setLoading(false); }
    }
    loadAppointments();
  }, [selectedDate]);

  const timeSlots: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
    if (hour < 20) timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
  }

  const getStaffAppointments = useCallback((staffId: string) => appointments.filter((apt) => apt.staff.id === staffId), [appointments]);

  const getAppointmentStyle = (appointment: Appointment) => {
    const startTime = new Date(appointment.startTime);
    const topMinutes = (startTime.getHours() - 8) * 60 + startTime.getMinutes();
    return { top: (topMinutes / 30) * 48, height: (appointment.service.durationMinutes / 30) * 48 };
  };

  const getColor = (status: string) => {
    if (status === "booked") return { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF" };
    if (status === "completed") return { bg: "#D1FAE5", border: "#10B981", text: "#065F46" };
    if (status === "cancelled") return { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B" };
    return { bg: "#F3E8FF", border: "#A855F7", text: "#6B21A8" };
  };

  const formatDate = (dateStr: string) => new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const navigateDate = (days: number) => { const d = new Date(selectedDate); d.setDate(d.getDate() + days); setSelectedDate(d.toISOString().split("T")[0]); };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/appointments/manage?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (res.ok) { setAppointments((prev) => prev.map((apt) => (apt.id === id ? { ...apt, status } : apt))); setSelectedAppointment(null); }
    } catch (error) { console.error("Failed to update:", error); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#F9FAFB" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", backgroundColor: "#FFFFFF", borderBottom: "1px solid #E5E7EB" }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "#111827", margin: 0 }}>All team calendars</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigateDate(-1)} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", border: "1px solid #D1D5DB", borderRadius: 6, cursor: "pointer", fontSize: 18 }}>‹</button>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#111827", minWidth: 180, textAlign: "center" }}>{formatDate(selectedDate)}</span>
          <button onClick={() => navigateDate(1)} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", border: "1px solid #D1D5DB", borderRadius: 6, cursor: "pointer", fontSize: 18 }}>›</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])} style={{ padding: "8px 16px", backgroundColor: "#EC4899", color: "#FFFFFF", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Today</button>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 14 }} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, color: "#6B7280" }}><p>Loading calendar...</p></div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", backgroundColor: "#FFFFFF", borderBottom: "1px solid #E5E7EB", flexShrink: 0 }}>
            <div style={{ width: 60, minWidth: 60, padding: "12px 8px", fontSize: 12, color: "#6B7280", fontWeight: 500, textAlign: "center", borderRight: "1px solid #E5E7EB" }}>GMT</div>
            {staff.map((member) => (
              <div key={member.id} style={{ flex: 1, minWidth: 150, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, borderRight: "1px solid #E5E7EB" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#EC4899", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600 }}>{member.name.charAt(0).toUpperCase()}</div>
                <div><div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{member.name}</div>{member.role && <div style={{ fontSize: 12, color: "#6B7280" }}>{member.role}</div>}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flex: 1, overflow: "auto" }}>
            <div style={{ width: 60, minWidth: 60, backgroundColor: "#F9FAFB", borderRight: "1px solid #E5E7EB", flexShrink: 0 }}>
              {timeSlots.map((time) => (<div key={time} style={{ height: 48, padding: "4px 8px", fontSize: 11, color: "#6B7280", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>{time}</div>))}
            </div>
            {staff.map((member) => (
              <div key={member.id} style={{ flex: 1, minWidth: 150, position: "relative", borderRight: "1px solid #E5E7EB" }}>
                {timeSlots.map((time, i) => (<div key={time} style={{ height: 48, borderBottom: "1px solid #E5E7EB", backgroundColor: time.endsWith(":00") ? "#FFFFFF" : "#FAFAFA" }} />))}
                {getStaffAppointments(member.id).map((apt) => {
                  const { top, height } = getAppointmentStyle(apt);
                  const colors = getColor(apt.status);
                  return (
                    <div key={apt.id} onClick={() => setSelectedAppointment(apt)} style={{ position: "absolute", top: top + 1, height: height - 2, left: 4, right: 4, backgroundColor: colors.bg, borderLeft: `3px solid ${colors.border}`, borderRadius: 6, padding: "6px 8px", cursor: "pointer", overflow: "hidden", zIndex: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: colors.text, marginBottom: 2 }}>{new Date(apt.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{apt.service.name}</div>
                      <div style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{apt.customerName}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 32, padding: "16px 24px", backgroundColor: "#FFFFFF", borderTop: "1px solid #E5E7EB" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 20, fontWeight: 700, color: "#EC4899" }}>{appointments.length}</span><span style={{ fontSize: 13, color: "#6B7280" }}>Total</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 20, fontWeight: 700, color: "#EC4899" }}>{appointments.filter((a) => a.status === "booked").length}</span><span style={{ fontSize: 13, color: "#6B7280" }}>Confirmed</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 20, fontWeight: 700, color: "#EC4899" }}>{staff.length}</span><span style={{ fontSize: 13, color: "#6B7280" }}>Staff</span></div>
      </div>

      {selectedAppointment && (
        <div onClick={() => setSelectedAppointment(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#FFFFFF", borderRadius: 12, width: "90%", maxWidth: 480, maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #E5E7EB" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>Appointment Details</h3>
              <button onClick={() => setSelectedAppointment(null)} style={{ background: "none", border: "none", fontSize: 20, color: "#6B7280", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}><h4 style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", margin: "0 0 8px 0" }}>Service</h4><p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>{selectedAppointment.service.name}</p><p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0 0" }}>{selectedAppointment.service.durationMinutes} mins • £{selectedAppointment.service.price}</p></div>
              <div style={{ marginBottom: 20 }}><h4 style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", margin: "0 0 8px 0" }}>Date & Time</h4><p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>{new Date(selectedAppointment.startTime).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p><p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0 0" }}>{new Date(selectedAppointment.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} - {new Date(selectedAppointment.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p></div>
              <div style={{ marginBottom: 20 }}><h4 style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", margin: "0 0 8px 0" }}>Staff</h4><p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>{selectedAppointment.staff.name}</p></div>
              <div style={{ marginBottom: 20 }}><h4 style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", margin: "0 0 8px 0" }}>Customer</h4><p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>{selectedAppointment.customerName}</p><p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0 0" }}>{selectedAppointment.customerPhone}</p><p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0 0" }}>{selectedAppointment.customerEmail}</p></div>
              <div><h4 style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", margin: "0 0 8px 0" }}>Status</h4><span style={{ display: "inline-block", padding: "6px 12px", borderRadius: 16, fontSize: 13, fontWeight: 600, textTransform: "capitalize", backgroundColor: getColor(selectedAppointment.status).bg, color: getColor(selectedAppointment.status).text }}>{selectedAppointment.status}</span></div>
            </div>
            <div style={{ display: "flex", gap: 12, padding: "16px 24px", borderTop: "1px solid #E5E7EB" }}>
              {selectedAppointment.status === "booked" && (<><button onClick={() => updateStatus(selectedAppointment.id, "completed")} style={{ flex: 1, padding: "10px 16px", backgroundColor: "#10B981", color: "#FFFFFF", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>✓ Complete</button><button onClick={() => updateStatus(selectedAppointment.id, "cancelled")} style={{ flex: 1, padding: "10px 16px", backgroundColor: "#EF4444", color: "#FFFFFF", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>✕ Cancel</button></>)}
              <button onClick={() => setSelectedAppointment(null)} style={{ flex: 1, padding: "10px 16px", backgroundColor: "#F3F4F6", color: "#374151", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
