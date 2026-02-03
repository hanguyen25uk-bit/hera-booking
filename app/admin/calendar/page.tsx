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
type StaffAvailability = { 
  available: boolean; 
  reason?: string; 
  startTime?: string; 
  endTime?: string;
};

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffAvailability, setStaffAvailability] = useState<Record<string, StaffAvailability>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [editData, setEditData] = useState({ serviceId: "", staffId: "", date: "", time: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"cancel" | "noshow" | "delete" | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addData, setAddData] = useState({
    serviceId: "",
    staffId: "",
    date: "",
    time: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
  });
  const [addAvailability, setAddAvailability] = useState<StaffAvailability | null>(null);
  const [addBookedSlots, setAddBookedSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [loadingAddAvailability, setLoadingAddAvailability] = useState(false);

  const [editAvailability, setEditAvailability] = useState<StaffAvailability | null>(null);
  const [editBookedSlots, setEditBookedSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  useEffect(function() { loadData(); }, [selectedDate]);
  useEffect(function() { loadStaffAndServices(); }, []);

  useEffect(function() {
    if (modalMode === "edit" && editData.staffId && editData.date) {
      loadEditAvailability();
    }
  }, [editData.staffId, editData.date, modalMode]);

  useEffect(function() {
    if (showAddModal && addData.staffId && addData.date) {
      loadAddAvailability();
    }
  }, [addData.staffId, addData.date, showAddModal]);

  async function loadStaffAndServices() {
    try {
      const [staffRes, servicesRes] = await Promise.all([fetch("/api/staff"), fetch("/api/services")]);
      if (!staffRes.ok || !servicesRes.ok) {
        console.error("Failed to load staff or services");
        return;
      }
      const staffData = await staffRes.json();
      const servicesData = await servicesRes.json();
      setStaffList(Array.isArray(staffData) ? staffData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
    } catch (err) { console.error(err); }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [aptsRes, staffRes] = await Promise.all([
        fetch("/api/appointments?date=" + selectedDate),
        fetch("/api/staff"),
      ]);
      if (!aptsRes.ok || !staffRes.ok) {
        console.error("Failed to load appointments or staff");
        return;
      }
      const apts = await aptsRes.json();
      const staffData = await staffRes.json();
      setAppointments(Array.isArray(apts) ? apts : []);
      setStaffList(Array.isArray(staffData) ? staffData : []);

      const availabilityMap: Record<string, StaffAvailability> = {};
      await Promise.all(
        staffData.map(async function(staff: Staff) {
          try {
            const res = await fetch("/api/staff-availability?staffId=" + staff.id + "&date=" + selectedDate);
            availabilityMap[staff.id] = await res.json();
          } catch (err) {
            availabilityMap[staff.id] = { available: true, startTime: "09:00", endTime: "18:00" };
          }
        })
      );
      setStaffAvailability(availabilityMap);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadEditAvailability() {
    setLoadingAvailability(true);
    try {
      const availRes = await fetch("/api/staff-availability?staffId=" + editData.staffId + "&date=" + editData.date);
      if (!availRes.ok) {
        setEditAvailability({ available: true, startTime: "09:00", endTime: "18:00" });
      } else {
        const avail = await availRes.json();
        setEditAvailability(avail);
      }

      const aptsRes = await fetch("/api/appointments?date=" + editData.date);
      const apts: Appointment[] = aptsRes.ok ? await aptsRes.json() : [];
      const booked = apts
        .filter(function(a) { return a.staff.id === editData.staffId && a.status !== "cancelled" && a.status !== "no-show" && a.id !== selectedAppointment?.id; })
        .map(function(a) { return { startTime: a.startTime, endTime: a.endTime }; });
      setEditBookedSlots(booked);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAvailability(false);
    }
  }

  async function loadAddAvailability() {
    setLoadingAddAvailability(true);
    try {
      const availRes = await fetch("/api/staff-availability?staffId=" + addData.staffId + "&date=" + addData.date);
      if (!availRes.ok) {
        setAddAvailability({ available: true, startTime: "09:00", endTime: "18:00" });
      } else {
        const avail = await availRes.json();
        setAddAvailability(avail);
      }

      const aptsRes = await fetch("/api/appointments?date=" + addData.date);
      const apts: Appointment[] = aptsRes.ok ? await aptsRes.json() : [];
      const booked = apts
        .filter(function(a) { return a.staff.id === addData.staffId && a.status !== "cancelled" && a.status !== "no-show"; })
        .map(function(a) { return { startTime: a.startTime, endTime: a.endTime }; });
      setAddBookedSlots(booked);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAddAvailability(false);
    }
  }

  function generateTimeSlots(
    availability: StaffAvailability | null, 
    bookedSlots: { startTime: string; endTime: string }[], 
    serviceId: string, 
    date: string,
    checkPastTime: boolean = true
  ): string[] {
    if (!availability?.available) return [];
    
    const startTime = availability.startTime || "09:00";
    const endTime = availability.endTime || "17:00";
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    
    const selectedService = services.find(function(s) { return s.id === serviceId; });
    const duration = selectedService?.durationMinutes || 60;
    
    // Calculate end time in minutes from midnight
    const closingTimeMinutes = endH * 60 + endM;
    
    // Get current time for checking past slots
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const slots: string[] = [];
    for (let h = startH, m = startM; h < endH || (h === endH && m < endM); ) {
      const timeStr = h.toString().padStart(2, "0") + ":" + m.toString().padStart(2, "0");
      
      const slotStart = new Date(date + "T" + timeStr + ":00");
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      
      // Calculate slot end time in minutes from midnight
      const slotEndHour = slotEnd.getHours();
      const slotEndMinute = slotEnd.getMinutes();
      const slotEndMinutes = slotEndHour * 60 + slotEndMinute;
      
      // Check 1: Slot end must not exceed closing time
      const exceedsClosingTime = slotEndMinutes > closingTimeMinutes;
      
      // Check 2: For today, slot must be in the future (only if checkPastTime is true)
      let isPastTime = false;
      if (checkPastTime && date === today) {
        const slotMinutes = h * 60 + m;
        const currentMinutes = currentHour * 60 + currentMinute;
        isPastTime = slotMinutes <= currentMinutes;
      }
      
      // Check 3: No conflict with existing bookings
      const hasConflict = bookedSlots.some(function(booked) {
        const bookedStart = new Date(booked.startTime);
        const bookedEnd = new Date(booked.endTime);
        return slotStart < bookedEnd && slotEnd > bookedStart;
      });
      
      if (!exceedsClosingTime && !isPastTime && !hasConflict) {
        slots.push(timeStr);
      }
      
      m += 15;
      if (m >= 60) { m = 0; h++; }
    }
    
    return slots;
  }

  function isPastDate(dateStr: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  }

  function openAddModal(prefilledStaffId?: string, prefilledTime?: string) {
    const todayStr = new Date().toISOString().split("T")[0];
    setAddData({
      serviceId: services.length > 0 ? services[0].id : "",
      staffId: prefilledStaffId || (staffList.length > 0 ? staffList[0].id : ""),
      date: selectedDate >= todayStr ? selectedDate : todayStr,
      time: prefilledTime || "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
    });
    setAddAvailability(null);
    setAddBookedSlots([]);
    setMessage(null);
    setShowAddModal(true);
  }

  function handleTimeSlotClick(staffId: string, hour: number, minute: number) {
    const avail = staffAvailability[staffId];
    if (!avail?.available) return;

    const timeStr = hour.toString().padStart(2, "0") + ":" + minute.toString().padStart(2, "0");

    // Check if slot is in working hours
    const startTime = avail.startTime || "09:00";
    const endTime = avail.endTime || "18:00";
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const slotMinutes = hour * 60 + minute;
    const workStart = startH * 60 + startM;
    const workEnd = endH * 60 + endM;

    if (slotMinutes < workStart || slotMinutes >= workEnd) return;

    // Check if time is in the past (for today)
    const today = new Date().toISOString().split("T")[0];
    if (selectedDate === today) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (slotMinutes <= currentMinutes) return;
    }

    // Check if slot is already booked
    const hasBooking = appointments.some(function(apt) {
      if (apt.staff.id !== staffId || apt.status === "cancelled" || apt.status === "no-show") return false;
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      const slotTime = new Date(selectedDate + "T" + timeStr + ":00");
      return slotTime >= aptStart && slotTime < aptEnd;
    });

    if (hasBooking) return;

    openAddModal(staffId, timeStr);
  }

  function closeAddModal() {
    setShowAddModal(false);
    setAddData({ serviceId: "", staffId: "", date: "", time: "", customerName: "", customerPhone: "", customerEmail: "" });
    setAddAvailability(null);
    setAddBookedSlots([]);
    setMessage(null);
  }

  async function handleAddBooking() {
    if (!addData.customerName || !addData.customerPhone || !addData.time) {
      setMessage({ type: "error", text: "Please fill in all required fields" });
      return;
    }

    if (isPastDate(addData.date)) {
      setMessage({ type: "error", text: "Cannot book for past dates" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const startTime = new Date(addData.date + "T" + addData.time + ":00").toISOString();
      
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: addData.serviceId,
          staffId: addData.staffId,
          customerName: addData.customerName,
          customerPhone: addData.customerPhone,
          customerEmail: addData.customerEmail || "walkin@salon.com",
          startTime: startTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create booking");
      }

      setMessage({ type: "success", text: "Booking created successfully!" });
      loadData();
      setTimeout(function() { closeAddModal(); }, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  function goToPreviousDay() {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  }

  function goToNextDay() {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split("T")[0]);
  }

  function goToToday() {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  }

  function formatDateDisplay(dateStr: string) {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split("T")[0]) return "Today";
    if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
    if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
    
    return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
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
    setEditAvailability(null);
    setEditBookedSlots([]);
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
    if (!editData.time) {
      setMessage({ type: "error", text: "Please select a time" });
      return;
    }
    
    if (isPastDate(editData.date)) {
      setMessage({ type: "error", text: "Cannot reschedule to past dates" });
      return;
    }
    
    setSaving(true);
    setMessage(null);
    try {
      const startTime = new Date(editData.date + "T" + editData.time + ":00").toISOString();
      const res = await fetch("/api/appointments/" + selectedAppointment.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: editData.serviceId, staffId: editData.staffId, startTime: startTime }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      setMessage({ type: "success", text: "Appointment updated!" });
      loadData();
      setTimeout(function() { closeModal(); }, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!selectedAppointment) return;
    setSaving(true);
    try {
      const res = await fetch("/api/appointments/" + selectedAppointment.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      setMessage({ type: "success", text: "Appointment cancelled." });
      loadData();
      setTimeout(function() { closeModal(); }, 1500);
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
    try {
      const res = await fetch("/api/appointments/" + selectedAppointment.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "no-show" }),
      });
      if (!res.ok) throw new Error("Failed to mark no-show");
      const data = await res.json();
      let msg = "Marked as no-show.";
      if (data.customerBlocked) {
        msg += " Customer BLOCKED (" + data.customerNoShowCount + " no-shows).";
      } else if (data.customerNoShowCount) {
        msg += " (" + data.customerNoShowCount + "/3 no-shows)";
      }
      setMessage({ type: "success", text: msg });
      loadData();
      setTimeout(function() { closeModal(); }, 2500);
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
      const res = await fetch("/api/appointments/" + selectedAppointment.id, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setMessage({ type: "success", text: "Deleted." });
      loadData();
      setTimeout(function() { closeModal(); }, 1500);
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
      const res = await fetch("/api/appointments/" + selectedAppointment.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      if (!res.ok) throw new Error("Failed to restore");
      setMessage({ type: "success", text: "Restored!" });
      loadData();
      setTimeout(function() { closeModal(); }, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const hours = Array.from({ length: 13 }, function(_, i) { return i + 8; });

  function getAppointmentStyle(apt: Appointment) {
    const start = new Date(apt.startTime);
    const end = new Date(apt.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const top = (startHour - 8) * 60;
    const height = Math.max(duration * 60, 30);
    
    let bgColor = "#6366f1";
    let borderColor = "#4f46e5";
    if (apt.status === "cancelled") { bgColor = "#94a3b8"; borderColor = "#64748b"; }
    if (apt.status === "no-show") { bgColor = "#ef4444"; borderColor = "#dc2626"; }
    if (apt.status === "completed") { bgColor = "#10b981"; borderColor = "#059669"; }
    
    return { top: top, height: height, bgColor: bgColor, borderColor: borderColor };
  }

  function isHourInWorkingTime(hour: number, staffId: string): boolean {
    const avail = staffAvailability[staffId];
    if (!avail || !avail.available) return false;
    
    const startTime = avail.startTime || "09:00";
    const endTime = avail.endTime || "18:00";
    const [startH] = startTime.split(":").map(Number);
    const [endH] = endTime.split(":").map(Number);
    
    return hour >= startH && hour < endH;
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDateLong(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  }

  const activeAppointments = appointments.filter(function(a) { return a.status !== "cancelled"; });
  const confirmedCount = appointments.filter(function(a) { return a.status === "confirmed" || a.status === "booked"; }).length;
  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  
  // For edit: don't check past time (allow editing existing appointments)
  const editTimeSlots = generateTimeSlots(editAvailability, editBookedSlots, editData.serviceId, editData.date, !isPastDate(editData.date));
  // For add: always check past time
  const addTimeSlots = generateTimeSlots(addAvailability, addBookedSlots, addData.serviceId, addData.date, true);

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", margin: 0 }}>Calendar</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0" }}>Manage appointments</p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={function() { openAddModal(); }}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(135deg, #10b981, #059669)", 
              color: "#fff", 
              border: "none", 
              borderRadius: 8, 
              fontSize: 14, 
              fontWeight: 600, 
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            + Add Booking
          </button>

          <div style={{ width: 1, height: 30, background: "#e2e8f0", margin: "0 8px" }}></div>

          <button onClick={goToPreviousDay} style={{ width: 40, height: 40, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "#f8fafc", borderRadius: 8, minWidth: 200, justifyContent: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{formatDateDisplay(selectedDate)}</span>
          </div>
          
          <button onClick={goToNextDay} style={{ width: 40, height: 40, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
          
          {!isToday && (
            <button onClick={goToToday} style={{ padding: "8px 16px", border: "1px solid #6366f1", borderRadius: 8, background: "#fff", color: "#6366f1", fontSize: 14, fontWeight: 500, cursor: "pointer", marginLeft: 8 }}>Today</button>
          )}
          
          <input type="date" value={selectedDate} onChange={function(e) { setSelectedDate(e.target.value); }} style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, marginLeft: 8 }} />
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ padding: "12px 20px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
          <span style={{ color: "#15803d", fontSize: 14 }}>Confirmed: <strong>{confirmedCount}</strong></span>
        </div>
        <div style={{ padding: "12px 20px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <span style={{ color: "#64748b", fontSize: 14 }}>Total: <strong>{activeAppointments.length}</strong></span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {/* Staff Headers */}
        <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
          <div style={{ width: 70, padding: 16, borderRight: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Time</span>
          </div>
          {staffList.filter(function(s) { return s.name; }).map(function(staff) {
            const avail = staffAvailability[staff.id];
            const isOff = avail && !avail.available;
            return (
              <div key={staff.id} style={{ flex: 1, padding: 16, textAlign: "center", borderRight: "1px solid #e2e8f0", background: isOff ? "#fef2f2" : "transparent" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: isOff ? "#fca5a5" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", fontWeight: 600, fontSize: 18 }}>
                  {staff.name.charAt(0)}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: isOff ? "#dc2626" : "#0f172a" }}>{staff.name}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>{staff.role || "Staff"}</div>
                {isOff && (
                  <div style={{ marginTop: 4, padding: "2px 8px", background: "#dc2626", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 600, display: "inline-block" }}>
                    {avail.reason === "day-off" ? "DAY OFF" : avail.reason === "holiday" ? "HOLIDAY" : "OFF"}
                  </div>
                )}
                {!isOff && avail && (
                  <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
                    {avail.startTime} - {avail.endTime}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time Grid */}
        <div style={{ display: "flex", position: "relative" }}>
          <div style={{ width: 70, borderRight: "1px solid #e2e8f0", background: "#fafafa" }}>
            {hours.map(function(hour) {
              return (
                <div key={hour} style={{ height: 60, padding: "4px 12px", fontSize: 13, color: "#64748b", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", fontWeight: 500 }}>
                  {hour}:00
                </div>
              );
            })}
          </div>

          {staffList.filter(function(s) { return s.name; }).map(function(staff) {
            const avail = staffAvailability[staff.id];
            const isOff = avail && !avail.available;
            
            return (
              <div key={staff.id} style={{ flex: 1, position: "relative", borderRight: "1px solid #e2e8f0" }}>
                {hours.map(function(hour) {
                  const inWorkingHours = isHourInWorkingTime(hour, staff.id);
                  let bgColor = "#fff";

                  if (isOff) {
                    bgColor = "#fef2f2";
                  } else if (!inWorkingHours) {
                    bgColor = "#f1f5f9";
                  } else if (hour % 2 !== 0) {
                    bgColor = "#fafafa";
                  }

                  const canClick = !isOff && inWorkingHours && !isPastDate(selectedDate);

                  return (
                    <div
                      key={hour}
                      style={{
                        height: 60,
                        borderBottom: "1px solid #f1f5f9",
                        background: bgColor,
                        position: "relative",
                        display: "flex",
                        flexDirection: "column"
                      }}
                    >
                      {isOff && hour === 12 && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                          <span style={{ color: "#fca5a5", fontSize: 11, fontWeight: 600 }}>OFF</span>
                        </div>
                      )}
                      {/* Clickable 15-min slots */}
                      {canClick && [0, 15, 30, 45].map(function(minute) {
                        return (
                          <div
                            key={minute}
                            onClick={function() { handleTimeSlotClick(staff.id, hour, minute); }}
                            style={{
                              flex: 1,
                              cursor: "pointer",
                              borderBottom: minute < 45 ? "1px dashed #e2e8f0" : "none",
                              transition: "background-color 0.15s"
                            }}
                            onMouseEnter={function(e) { e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.1)"; }}
                            onMouseLeave={function(e) { e.currentTarget.style.backgroundColor = "transparent"; }}
                            title={"Click to book " + hour.toString().padStart(2, "0") + ":" + minute.toString().padStart(2, "0")}
                          />
                        );
                      })}
                    </div>
                  );
                })}
                
                {!isOff && avail && avail.startTime && avail.endTime && (
                  <div style={{
                    position: "absolute",
                    top: (parseInt(avail.startTime.split(":")[0]) - 8) * 60,
                    left: 0,
                    right: 0,
                    height: (parseInt(avail.endTime.split(":")[0]) - parseInt(avail.startTime.split(":")[0])) * 60,
                    border: "2px solid #10b981",
                    borderRadius: 4,
                    pointerEvents: "none",
                    opacity: 0.3
                  }} />
                )}
                
                {activeAppointments.filter(function(apt) { return apt.staff.id === staff.id; }).map(function(apt) {
                  const style = getAppointmentStyle(apt);
                  return (
                    <div
                      key={apt.id}
                      onClick={function() { openAppointment(apt); }}
                      style={{
                        position: "absolute", top: style.top, left: 4, right: 4, height: style.height - 4,
                        backgroundColor: style.bgColor, borderLeft: "4px solid " + style.borderColor,
                        borderRadius: 8, padding: "8px 10px", cursor: "pointer", overflow: "hidden",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)", transition: "transform 0.1s", zIndex: 10
                      }}
                      onMouseEnter={function(e) { e.currentTarget.style.transform = "scale(1.02)"; }}
                      onMouseLeave={function(e) { e.currentTarget.style.transform = "scale(1)"; }}
                    >
                      <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{formatTime(apt.startTime)}</div>
                      <div style={{ color: "#fff", fontSize: 12, opacity: 0.95, fontWeight: 500, marginTop: 2 }}>{apt.service.name}</div>
                      <div style={{ color: "#fff", fontSize: 11, opacity: 0.85, marginTop: 2 }}>{apt.customerName}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, display: "flex", gap: 20, fontSize: 13, color: "#64748b", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: "#6366f1" }}></div> Confirmed</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: "#ef4444" }}></div> No-Show</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: "#94a3b8" }}></div> Cancelled</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: "#fef2f2", border: "1px solid #fca5a5" }}></div> Day Off</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: "#f1f5f9", border: "1px solid #e2e8f0" }}></div> Outside Hours</div>
      </div>

      {/* Add Booking Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e5e7eb", background: "linear-gradient(135deg, #10b981, #059669)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#fff" }}>+ Add Walk-in Booking</h2>
              <button onClick={closeAddModal} style={{ width: 32, height: 32, border: "none", background: "rgba(255,255,255,0.2)", borderRadius: 8, fontSize: 18, cursor: "pointer", color: "#fff" }}>×</button>
            </div>

            {message && (
              <div style={{ margin: "16px 24px 0", padding: 12, borderRadius: 8, backgroundColor: message.type === "success" ? "#d1fae5" : "#fee2e2", color: message.type === "success" ? "#065f46" : "#991b1b", fontSize: 14 }}>
                {message.text}
              </div>
            )}

            <div style={{ padding: 24 }}>
              {/* Customer Info */}
              <div style={{ marginBottom: 20, padding: 16, background: "#f8fafc", borderRadius: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 12px" }}>Customer Information</h3>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4, color: "#374151" }}>Name *</label>
                  <input 
                    type="text" 
                    value={addData.customerName} 
                    onChange={function(e) { setAddData({ ...addData, customerName: e.target.value }); }}
                    placeholder="Customer name"
                    style={{ width: "100%", padding: 10, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4, color: "#374151" }}>Phone *</label>
                  <input 
                    type="tel" 
                    value={addData.customerPhone} 
                    onChange={function(e) { setAddData({ ...addData, customerPhone: e.target.value }); }}
                    placeholder="Phone number"
                    style={{ width: "100%", padding: 10, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4, color: "#374151" }}>Email (optional)</label>
                  <input 
                    type="email" 
                    value={addData.customerEmail} 
                    onChange={function(e) { setAddData({ ...addData, customerEmail: e.target.value }); }}
                    placeholder="Email address"
                    style={{ width: "100%", padding: 10, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14 }}
                  />
                </div>
              </div>

              {/* Service */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Service</label>
                <select 
                  value={addData.serviceId} 
                  onChange={function(e) { setAddData({ ...addData, serviceId: e.target.value, time: "" }); }} 
                  style={{ width: "100%", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 15 }}
                >
                  {services.map(function(s) { 
                    return <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min - £{s.price})</option>; 
                  })}
                </select>
              </div>

              {/* Staff */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Staff</label>
                <select 
                  value={addData.staffId} 
                  onChange={function(e) { setAddData({ ...addData, staffId: e.target.value, time: "" }); }} 
                  style={{ width: "100%", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 15 }}
                >
                  {staffList.map(function(s) { 
                    return <option key={s.id} value={s.id}>{s.name}</option>; 
                  })}
                </select>
              </div>

              {/* Date */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Date</label>
                <input 
                  type="date" 
                  value={addData.date} 
                  min={new Date().toISOString().split("T")[0]}
                  onChange={function(e) { setAddData({ ...addData, date: e.target.value, time: "" }); }} 
                  style={{ width: "100%", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 15 }} 
                />
                {isPastDate(addData.date) && (
                  <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>Cannot book for past dates</p>
                )}
              </div>

              {/* Time */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Time</label>
                {isPastDate(addData.date) ? (
                  <div style={{ padding: 16, background: "#fef2f2", borderRadius: 10, color: "#dc2626", fontSize: 14 }}>
                    Cannot book for past dates. Please select today or a future date.
                  </div>
                ) : loadingAddAvailability ? (
                  <p style={{ color: "#64748b", fontSize: 14 }}>Loading available times...</p>
                ) : !addAvailability?.available ? (
                  <div style={{ padding: 16, background: "#fef2f2", borderRadius: 10, color: "#dc2626", fontSize: 14 }}>
                    Staff is not available on this date {addAvailability?.reason ? "(" + addAvailability.reason + ")" : ""}
                  </div>
                ) : addTimeSlots.length === 0 ? (
                  <div style={{ padding: 16, background: "#fef3c7", borderRadius: 10, color: "#92400e", fontSize: 14 }}>
                    No available time slots. All times are booked or have passed.
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {addTimeSlots.map(function(t) {
                        return (
                          <button
                            key={t}
                            onClick={function() { setAddData({ ...addData, time: t }); }}
                            style={{
                              padding: 10, borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer",
                              border: addData.time === t ? "2px solid #10b981" : "1px solid #e2e8f0",
                              background: addData.time === t ? "#10b981" : "#fff",
                              color: addData.time === t ? "#fff" : "#374151",
                            }}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                      Working: {addAvailability.startTime} - {addAvailability.endTime}
                    </p>
                  </>
                )}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  onClick={closeAddModal} 
                  style={{ flex: 1, padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", color: "#64748b", fontSize: 15, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddBooking} 
                  disabled={saving || !addData.time || !addData.customerName || !addData.customerPhone || !addAvailability?.available || isPastDate(addData.date)} 
                  style={{ 
                    flex: 1, padding: 14, border: "none", borderRadius: 10, 
                    background: addData.time && addData.customerName && addData.customerPhone && addAvailability?.available && !isPastDate(addData.date) ? "linear-gradient(135deg, #10b981, #059669)" : "#e2e8f0", 
                    color: addData.time && addData.customerName && addData.customerPhone && !isPastDate(addData.date) ? "#fff" : "#94a3b8", 
                    fontSize: 15, fontWeight: 600, cursor: addData.time && !isPastDate(addData.date) ? "pointer" : "not-allowed" 
                  }}
                >
                  {saving ? "Creating..." : "Create Booking"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View/Edit Appointment Modal */}
      {selectedAppointment && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{modalMode === "edit" ? "Edit Appointment" : "Appointment Details"}</h2>
              <button onClick={closeModal} style={{ width: 32, height: 32, border: "none", background: "#f3f4f6", borderRadius: 8, fontSize: 18, cursor: "pointer" }}>×</button>
            </div>

            {message && (
              <div style={{ margin: "16px 24px 0", padding: 12, borderRadius: 8, backgroundColor: message.type === "success" ? "#d1fae5" : "#fee2e2", color: message.type === "success" ? "#065f46" : "#991b1b", fontSize: 14 }}>
                {message.text}
              </div>
            )}

            {confirmAction && (
              <div style={{ margin: "16px 24px", padding: 16, backgroundColor: "#fef3c7", borderRadius: 12, border: "1px solid #fcd34d" }}>
                <p style={{ margin: "0 0 12px", fontWeight: 600, color: "#92400e" }}>
                  {confirmAction === "cancel" ? "Cancel this appointment?" : confirmAction === "noshow" ? "Mark as No-Show?" : "Permanently delete?"}
                </p>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "#a16207" }}>
                  {confirmAction === "cancel" ? "The time slot will become available." : confirmAction === "noshow" ? "This counts toward no-show record. 3 = blocked." : "This cannot be undone."}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={function() { setConfirmAction(null); }} style={{ flex: 1, padding: 10, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer" }}>Back</button>
                  <button onClick={function() { if (confirmAction === "cancel") handleCancel(); if (confirmAction === "noshow") handleNoShow(); if (confirmAction === "delete") handleDelete(); }} disabled={saving} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: confirmAction === "delete" ? "#dc2626" : "#f59e0b", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                    {saving ? "..." : "Confirm"}
                  </button>
                </div>
              </div>
            )}

            <div style={{ padding: 24 }}>
              {modalMode === "view" ? (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <span style={{
                      padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                      backgroundColor: selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked" ? "#d1fae5" : selectedAppointment.status === "cancelled" ? "#f3f4f6" : selectedAppointment.status === "no-show" ? "#fee2e2" : "#e0e7ff",
                      color: selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked" ? "#065f46" : selectedAppointment.status === "cancelled" ? "#64748b" : selectedAppointment.status === "no-show" ? "#991b1b" : "#3730a3",
                    }}>
                      {selectedAppointment.status === "booked" ? "Confirmed" : selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </span>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Service</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedAppointment.service.name}</div>
                    <div style={{ fontSize: 14, color: "#64748b" }}>{selectedAppointment.service.durationMinutes} mins - £{selectedAppointment.service.price}</div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Date & Time</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{formatDateLong(selectedAppointment.startTime)}</div>
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

                  {!confirmAction && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked") && (
                        <>
                          <button onClick={startEdit} style={{ padding: 14, border: "none", borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Edit Appointment</button>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={function() { setConfirmAction("cancel"); }} style={{ flex: 1, padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", color: "#64748b", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
                            <button onClick={function() { setConfirmAction("noshow"); }} style={{ flex: 1, padding: 12, border: "1px solid #fecaca", borderRadius: 10, background: "#fef2f2", color: "#dc2626", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>No-Show</button>
                          </div>
                        </>
                      )}
                      
                      {(selectedAppointment.status === "cancelled" || selectedAppointment.status === "no-show") && (
                        <>
                          <button onClick={handleRestore} disabled={saving} style={{ padding: 14, border: "none", borderRadius: 10, background: "#10b981", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Restore</button>
                          <button onClick={function() { setConfirmAction("delete"); }} style={{ padding: 12, border: "1px solid #fecaca", borderRadius: 10, background: "#fff", color: "#dc2626", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Delete</button>
                        </>
                      )}

                      <button onClick={closeModal} style={{ padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", color: "#64748b", fontSize: 15, cursor: "pointer", marginTop: 8 }}>Close</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Service</label>
                    <select value={editData.serviceId} onChange={function(e) { setEditData({ ...editData, serviceId: e.target.value, time: "" }); }} style={{ width: "100%", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 15 }}>
                      {services.map(function(s) { return <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min - £{s.price})</option>; })}
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Staff</label>
                    <select value={editData.staffId} onChange={function(e) { setEditData({ ...editData, staffId: e.target.value, time: "" }); }} style={{ width: "100%", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 15 }}>
                      {staffList.map(function(s) { return <option key={s.id} value={s.id}>{s.name}</option>; })}
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Date</label>
                    <input 
                      type="date" 
                      value={editData.date} 
                      min={new Date().toISOString().split("T")[0]}
                      onChange={function(e) { setEditData({ ...editData, date: e.target.value, time: "" }); }} 
                      style={{ width: "100%", padding: 12, border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 15 }} 
                    />
                    {isPastDate(editData.date) && (
                      <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>Cannot reschedule to past dates</p>
                    )}
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Time</label>
                    {isPastDate(editData.date) ? (
                      <div style={{ padding: 16, background: "#fef2f2", borderRadius: 10, color: "#dc2626", fontSize: 14 }}>
                        Cannot reschedule to past dates. Please select today or a future date.
                      </div>
                    ) : loadingAvailability ? (
                      <p style={{ color: "#64748b", fontSize: 14 }}>Loading...</p>
                    ) : !editAvailability?.available ? (
                      <div style={{ padding: 16, background: "#fef2f2", borderRadius: 10, color: "#dc2626", fontSize: 14 }}>
                        Staff is not available on this date {editAvailability?.reason ? "(" + editAvailability.reason + ")" : ""}
                      </div>
                    ) : editTimeSlots.length === 0 ? (
                      <div style={{ padding: 16, background: "#fef3c7", borderRadius: 10, color: "#92400e", fontSize: 14 }}>
                        No available time slots
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                          {editTimeSlots.map(function(t) {
                            return (
                              <button
                                key={t}
                                onClick={function() { setEditData({ ...editData, time: t }); }}
                                style={{
                                  padding: 10, borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer",
                                  border: editData.time === t ? "2px solid #6366f1" : "1px solid #e2e8f0",
                                  background: editData.time === t ? "#6366f1" : "#fff",
                                  color: editData.time === t ? "#fff" : "#374151",
                                }}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                        <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                          Working: {editAvailability.startTime} - {editAvailability.endTime}
                        </p>
                      </>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={function() { setModalMode("view"); }} style={{ flex: 1, padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", color: "#64748b", fontSize: 15, cursor: "pointer" }}>Cancel</button>
                    <button 
                      onClick={handleSaveEdit} 
                      disabled={saving || !editData.time || !editAvailability?.available || isPastDate(editData.date)} 
                      style={{ 
                        flex: 1, padding: 14, border: "none", borderRadius: 10, 
                        background: editData.time && editAvailability?.available && !isPastDate(editData.date) ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#e2e8f0", 
                        color: editData.time && editAvailability?.available && !isPastDate(editData.date) ? "#fff" : "#94a3b8", 
                        fontSize: 15, fontWeight: 600, cursor: editData.time && !isPastDate(editData.date) ? "pointer" : "not-allowed" 
                      }}
                    >
                      {saving ? "Saving..." : "Save"}
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
