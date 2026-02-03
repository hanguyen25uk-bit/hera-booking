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
  const [visibleStaff, setVisibleStaff] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());
  
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

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

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
      if (!staffRes.ok || !servicesRes.ok) return;
      const staffData = await staffRes.json();
      const servicesData = await servicesRes.json();
      setStaffList(Array.isArray(staffData) ? staffData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      // Initialize all staff as visible
      setVisibleStaff(new Set(staffData.map((s: Staff) => s.id)));
    } catch (err) { console.error(err); }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [aptsRes, staffRes] = await Promise.all([
        fetch("/api/appointments?date=" + selectedDate),
        fetch("/api/staff"),
      ]);
      if (!aptsRes.ok || !staffRes.ok) return;
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
            availabilityMap[staff.id] = { available: true, startTime: "10:00", endTime: "19:00" };
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
        setEditAvailability({ available: true, startTime: "10:00", endTime: "19:00" });
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
        setAddAvailability({ available: true, startTime: "10:00", endTime: "19:00" });
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
    
    const startTime = availability.startTime || "10:00";
    const endTime = availability.endTime || "19:00";
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    
    const selectedService = services.find(function(s) { return s.id === serviceId; });
    const duration = selectedService?.durationMinutes || 60;
    const closingTimeMinutes = endH * 60 + endM;
    
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const slots: string[] = [];
    for (let h = startH, m = startM; h < endH || (h === endH && m < endM); ) {
      const timeStr = h.toString().padStart(2, "0") + ":" + m.toString().padStart(2, "0");
      
      const slotStart = new Date(date + "T" + timeStr + ":00");
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      
      const slotEndHour = slotEnd.getHours();
      const slotEndMinute = slotEnd.getMinutes();
      const slotEndMinutes = slotEndHour * 60 + slotEndMinute;
      
      const exceedsClosingTime = slotEndMinutes > closingTimeMinutes;
      
      let isPastTime = false;
      if (checkPastTime && date === today) {
        const slotMinutes = h * 60 + m;
        const currentMinutes = currentHour * 60 + currentMinute;
        isPastTime = slotMinutes <= currentMinutes;
      }
      
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

    const startTime = avail.startTime || "10:00";
    const endTime = avail.endTime || "19:00";
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const slotMinutes = hour * 60 + minute;
    const workStart = startH * 60 + startM;
    const workEnd = endH * 60 + endM;

    if (slotMinutes < workStart || slotMinutes >= workEnd) return;

    const today = new Date().toISOString().split("T")[0];
    if (selectedDate === today) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (slotMinutes <= currentMinutes) return;
    }

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
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
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

  const toggleStaffVisibility = (staffId: string) => {
    setVisibleStaff(prev => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  };

  const toggleAllStaff = () => {
    if (visibleStaff.size === staffList.length) {
      setVisibleStaff(new Set());
    } else {
      setVisibleStaff(new Set(staffList.map(s => s.id)));
    }
  };

  const hours = Array.from({ length: 12 }, function(_, i) { return i + 8; }); // 8 AM to 7 PM

  function getAppointmentStyle(apt: Appointment) {
    const start = new Date(apt.startTime);
    const end = new Date(apt.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const top = (startHour - 8) * 80; // 80px per hour
    const height = Math.max(duration * 80, 40);
    
    // Fresha-style warm coral/salmon color for appointments
    let bgColor = "#7C6BF0"; // Purple/violet for regular appointments (like in reference)
    let borderColor = "#6B5CE0";
    let textColor = "#FFFFFF";
    
    if (apt.status === "cancelled") { bgColor = "#E8E8E8"; borderColor = "#CCCCCC"; textColor = "#888888"; }
    if (apt.status === "no-show") { bgColor = "#FFCDD2"; borderColor = "#EF9A9A"; textColor = "#C62828"; }
    if (apt.status === "completed") { bgColor = "#C8E6C9"; borderColor = "#A5D6A7"; textColor = "#2E7D32"; }
    
    return { top, height, bgColor, borderColor, textColor };
  }

  function isHourInWorkingTime(hour: number, staffId: string): boolean {
    const avail = staffAvailability[staffId];
    if (!avail || !avail.available) return false;
    
    const startTime = avail.startTime || "10:00";
    const endTime = avail.endTime || "19:00";
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

  const visibleStaffList = staffList.filter(s => visibleStaff.has(s.id));
  const activeAppointments = appointments.filter(function(a) { return a.status !== "cancelled"; });
  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  
  const editTimeSlots = generateTimeSlots(editAvailability, editBookedSlots, editData.serviceId, editData.date, !isPastDate(editData.date));
  const addTimeSlots = generateTimeSlots(addAvailability, addBookedSlots, addData.serviceId, addData.date, true);

  // Current time position for the indicator
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimePosition = (currentHour - 8) * 80 + (currentMinute / 60) * 80;
  const showTimeIndicator = isToday && currentHour >= 8 && currentHour < 20;

  // Count confirmed appointments
  const confirmedCount = appointments.filter(a => a.status === "confirmed" || a.status === "booked").length;
  const totalCount = appointments.length;

  // Staff avatar colors (warm pink/coral like Fresha)
  const staffColors = ["#F8A5A5", "#F5B7B1", "#F9CACA", "#FAD4D4", "#FBE0E0"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#F5F7FA", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "20px 32px", backgroundColor: "#FFFFFF", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "#111827", margin: 0 }}>
            {formatDateDisplay(selectedDate)}
          </h1>
          <button 
            onClick={() => openAddModal()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#10B981",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Add Booking
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={goToPreviousDay} style={{
              width: 36,
              height: 36,
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              background: "#FFFFFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button onClick={goToNextDay} style={{
              width: 36,
              height: 36,
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              background: "#FFFFFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          <button onClick={goToToday} style={{
            padding: "8px 16px",
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            background: "#FFFFFF",
            color: "#374151",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}>
            Today
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              fontSize: 14,
              color: "#374151",
            }}
          />
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <div style={{
            padding: "8px 16px",
            backgroundColor: "#ECFDF5",
            borderRadius: 20,
            border: "1px solid #A7F3D0",
          }}>
            <span style={{ color: "#059669", fontWeight: 600, fontSize: 14 }}>Confirmed: {confirmedCount}</span>
          </div>
          <div style={{
            padding: "8px 16px",
            backgroundColor: "#F3F4F6",
            borderRadius: 20,
          }}>
            <span style={{ color: "#6B7280", fontWeight: 500, fontSize: 14 }}>Total: {totalCount}</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 24px 24px" }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: `80px repeat(${visibleStaffList.length}, minmax(180px, 1fr))`,
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          border: "1px solid #E5E7EB",
          marginTop: 24,
          overflow: "hidden",
        }}>
          {/* Header Row - Time + Staff */}
          <div style={{ 
            padding: "16px 12px", 
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9CA3AF",
            fontSize: 12,
            fontWeight: 500,
          }}>
            Time
          </div>
          {visibleStaffList.map((staff, idx) => {
            const avail = staffAvailability[staff.id];
            const isOff = avail && !avail.available;
            const bgColor = staffColors[idx % staffColors.length];
            
            return (
              <div key={staff.id} style={{
                padding: "16px",
                borderBottom: "1px solid #E5E7EB",
                borderLeft: "1px solid #E5E7EB",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  backgroundColor: bgColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#BE3A3A",
                  fontWeight: 600,
                  fontSize: 18,
                  textTransform: "lowercase",
                }}>
                  {staff.name.charAt(0).toLowerCase()}
                </div>
                <span style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: isOff ? "#EF4444" : "#BE3A3A",
                }}>
                  {staff.name}
                </span>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                  {staff.role || "Nail Technician"}
                </span>
                {isOff && (
                  <span style={{
                    padding: "4px 12px",
                    backgroundColor: "#FEE2E2",
                    color: "#DC2626",
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 12,
                    textTransform: "uppercase",
                  }}>
                    OFF
                  </span>
                )}
              </div>
            );
          })}

          {/* Time Rows */}
          {hours.map(hour => (
            <>
              {/* Time Label */}
              <div key={`time-${hour}`} style={{
                padding: "8px 12px",
                borderBottom: "1px solid #F3F4F6",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "flex-end",
                color: "#6B7280",
                fontSize: 13,
                fontWeight: 500,
                height: 80,
                boxSizing: "border-box",
              }}>
                {hour.toString().padStart(2, "0")}:00
              </div>
              
              {/* Staff Columns */}
              {visibleStaffList.map(staff => {
                const avail = staffAvailability[staff.id];
                const isOff = avail && !avail.available;
                const inWorkingHours = isHourInWorkingTime(hour, staff.id);
                
                // Get appointments for this staff member that overlap with this hour
                const hourAppointments = activeAppointments.filter(apt => {
                  if (apt.staff.id !== staff.id) return false;
                  const start = new Date(apt.startTime);
                  const end = new Date(apt.endTime);
                  const hourStart = new Date(selectedDate + `T${hour.toString().padStart(2, "0")}:00:00`);
                  const hourEnd = new Date(selectedDate + `T${(hour + 1).toString().padStart(2, "0")}:00:00`);
                  return start < hourEnd && end > hourStart;
                });
                
                return (
                  <div
                    key={`${staff.id}-${hour}`}
                    style={{
                      height: 80,
                      borderBottom: "1px solid #F3F4F6",
                      borderLeft: "1px solid #E5E7EB",
                      backgroundColor: isOff ? "#FEF2F2" : inWorkingHours ? "#FFFFFF" : "#FAFAFA",
                      position: "relative",
                    }}
                  >
                    {!isOff && inWorkingHours && !isPastDate(selectedDate) && (
                      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        {[0, 15, 30, 45].map(minute => (
                          <div
                            key={minute}
                            onClick={() => handleTimeSlotClick(staff.id, hour, minute)}
                            style={{
                              flex: 1,
                              cursor: "pointer",
                              borderBottom: minute < 45 ? "1px dashed #F3F4F6" : "none",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.05)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                          />
                        ))}
                      </div>
                    )}
                    
                    {isOff && hour === 12 && (
                      <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        color: "#F87171",
                        fontSize: 12,
                        fontWeight: 500,
                      }}>
                        OFF
                      </div>
                    )}
                    
                    {/* Appointments */}
                    {hour === 8 && activeAppointments.filter(apt => apt.staff.id === staff.id).map(apt => {
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
                            borderRadius: 8,
                            padding: "8px 12px",
                            cursor: "pointer",
                            overflow: "hidden",
                            zIndex: 10,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600, color: style.textColor, marginBottom: 2 }}>
                            {apt.customerName}
                          </div>
                          <div style={{ fontSize: 12, color: style.textColor, opacity: 0.9 }}>
                            {apt.service.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Add Booking Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, width: 440, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827" }}>Add Walk-in Booking</h2>
              <button onClick={closeAddModal} style={{ width: 32, height: 32, border: "none", background: "#F3F4F6", borderRadius: 8, cursor: "pointer", fontSize: 18, color: "#6B7280" }}>×</button>
            </div>

            {message && (
              <div style={{ margin: "16px 24px 0", padding: 12, borderRadius: 8, backgroundColor: message.type === "success" ? "#ECFDF5" : "#FEF2F2", color: message.type === "success" ? "#059669" : "#DC2626", fontSize: 14 }}>
                {message.text}
              </div>
            )}

            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#374151" }}>Customer Name *</label>
                <input
                  type="text"
                  value={addData.customerName}
                  onChange={(e) => setAddData({ ...addData, customerName: e.target.value })}
                  placeholder="Enter name"
                  style={{ width: "100%", padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#374151" }}>Phone *</label>
                <input
                  type="tel"
                  value={addData.customerPhone}
                  onChange={(e) => setAddData({ ...addData, customerPhone: e.target.value })}
                  placeholder="Phone number"
                  style={{ width: "100%", padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#374151" }}>Service</label>
                <select
                  value={addData.serviceId}
                  onChange={(e) => setAddData({ ...addData, serviceId: e.target.value, time: "" })}
                  style={{ width: "100%", padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
                >
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min - £{s.price})</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#374151" }}>Staff</label>
                <select
                  value={addData.staffId}
                  onChange={(e) => setAddData({ ...addData, staffId: e.target.value, time: "" })}
                  style={{ width: "100%", padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
                >
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#374151" }}>Date</label>
                <input
                  type="date"
                  value={addData.date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setAddData({ ...addData, date: e.target.value, time: "" })}
                  style={{ width: "100%", padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#374151" }}>Time</label>
                {loadingAddAvailability ? (
                  <p style={{ color: "#6B7280" }}>Loading...</p>
                ) : !addAvailability?.available ? (
                  <div style={{ padding: 16, background: "#FEF2F2", borderRadius: 8, color: "#DC2626", fontSize: 14 }}>
                    Staff not available on this date
                  </div>
                ) : addTimeSlots.length === 0 ? (
                  <div style={{ padding: 16, background: "#FEF3C7", borderRadius: 8, color: "#D97706", fontSize: 14 }}>
                    No available times
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {addTimeSlots.map(t => (
                      <button
                        key={t}
                        onClick={() => setAddData({ ...addData, time: t })}
                        style={{
                          padding: 10,
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: "pointer",
                          border: addData.time === t ? "2px solid #10B981" : "1px solid #E5E7EB",
                          background: addData.time === t ? "#ECFDF5" : "#FFFFFF",
                          color: addData.time === t ? "#059669" : "#374151",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={closeAddModal} style={{ flex: 1, padding: 14, border: "1px solid #E5E7EB", borderRadius: 8, background: "#FFFFFF", color: "#6B7280", fontSize: 15, cursor: "pointer" }}>
                  Cancel
                </button>
                <button
                  onClick={handleAddBooking}
                  disabled={saving || !addData.time || !addData.customerName || !addData.customerPhone}
                  style={{
                    flex: 1,
                    padding: 14,
                    border: "none",
                    borderRadius: 8,
                    background: addData.time && addData.customerName && addData.customerPhone ? "#10B981" : "#E5E7EB",
                    color: addData.time && addData.customerName && addData.customerPhone ? "#FFFFFF" : "#9CA3AF",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: addData.time ? "pointer" : "not-allowed",
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
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, width: 440, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827" }}>
                {modalMode === "edit" ? "Edit Appointment" : "Appointment Details"}
              </h2>
              <button onClick={closeModal} style={{ width: 32, height: 32, border: "none", background: "#F3F4F6", borderRadius: 8, cursor: "pointer", fontSize: 18, color: "#6B7280" }}>×</button>
            </div>

            {message && (
              <div style={{ margin: "16px 24px 0", padding: 12, borderRadius: 8, backgroundColor: message.type === "success" ? "#ECFDF5" : "#FEF2F2", color: message.type === "success" ? "#059669" : "#DC2626", fontSize: 14 }}>
                {message.text}
              </div>
            )}

            {confirmAction && (
              <div style={{ margin: "16px 24px", padding: 16, backgroundColor: "#FEF3C7", borderRadius: 12, border: "1px solid #FCD34D" }}>
                <p style={{ margin: "0 0 12px", fontWeight: 600, color: "#D97706" }}>
                  {confirmAction === "cancel" ? "Cancel this appointment?" : confirmAction === "noshow" ? "Mark as No-Show?" : "Permanently delete?"}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirmAction(null)} style={{ flex: 1, padding: 10, border: "1px solid #E5E7EB", borderRadius: 8, background: "#FFFFFF", cursor: "pointer" }}>Back</button>
                  <button
                    onClick={() => { if (confirmAction === "cancel") handleCancel(); if (confirmAction === "noshow") handleNoShow(); if (confirmAction === "delete") handleDelete(); }}
                    disabled={saving}
                    style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, background: confirmAction === "delete" ? "#DC2626" : "#D97706", color: "#FFFFFF", fontWeight: 600, cursor: "pointer" }}
                  >
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
                      padding: "6px 14px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 600,
                      backgroundColor: selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked" ? "#ECFDF5" : selectedAppointment.status === "cancelled" ? "#F3F4F6" : "#FEF2F2",
                      color: selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked" ? "#059669" : selectedAppointment.status === "cancelled" ? "#6B7280" : "#DC2626",
                    }}>
                      {selectedAppointment.status === "booked" ? "Confirmed" : selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </span>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Service</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{selectedAppointment.service.name}</div>
                    <div style={{ fontSize: 14, color: "#6B7280" }}>{selectedAppointment.service.durationMinutes} mins - £{selectedAppointment.service.price}</div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Date & Time</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{formatDateLong(selectedAppointment.startTime)}</div>
                    <div style={{ fontSize: 14, color: "#6B7280" }}>{formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}</div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Staff</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{selectedAppointment.staff.name}</div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Customer</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>{selectedAppointment.customerName}</div>
                    <div style={{ fontSize: 14, color: "#6B7280" }}>{selectedAppointment.customerPhone}</div>
                    <div style={{ fontSize: 14, color: "#6B7280" }}>{selectedAppointment.customerEmail}</div>
                  </div>

                  {!confirmAction && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked") && (
                        <>
                          <button onClick={startEdit} style={{ padding: 14, border: "none", borderRadius: 8, background: "#111827", color: "#FFFFFF", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Edit Appointment</button>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setConfirmAction("cancel")} style={{ flex: 1, padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, background: "#FFFFFF", color: "#6B7280", fontSize: 14, cursor: "pointer" }}>Cancel</button>
                            <button onClick={() => setConfirmAction("noshow")} style={{ flex: 1, padding: 12, border: "1px solid #FEE2E2", borderRadius: 8, background: "#FEF2F2", color: "#DC2626", fontSize: 14, cursor: "pointer" }}>No-Show</button>
                          </div>
                        </>
                      )}
                      
                      {(selectedAppointment.status === "cancelled" || selectedAppointment.status === "no-show") && (
                        <>
                          <button onClick={handleRestore} disabled={saving} style={{ padding: 14, border: "none", borderRadius: 8, background: "#059669", color: "#FFFFFF", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Restore</button>
                          <button onClick={() => setConfirmAction("delete")} style={{ padding: 12, border: "1px solid #FEE2E2", borderRadius: 8, background: "#FFFFFF", color: "#DC2626", fontSize: 14, cursor: "pointer" }}>Delete Permanently</button>
                        </>
                      )}

                      <button onClick={closeModal} style={{ padding: 14, border: "1px solid #E5E7EB", borderRadius: 8, background: "#FFFFFF", color: "#6B7280", fontSize: 15, cursor: "pointer", marginTop: 8 }}>Close</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#374151" }}>Service</label>
                    <select value={editData.serviceId} onChange={(e) => setEditData({ ...editData, serviceId: e.target.value, time: "" })} style={{ width: "100%", padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}>
                      {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min - £{s.price})</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#374151" }}>Staff</label>
                    <select value={editData.staffId} onChange={(e) => setEditData({ ...editData, staffId: e.target.value, time: "" })} style={{ width: "100%", padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}>
                      {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#374151" }}>Date</label>
                    <input type="date" value={editData.date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setEditData({ ...editData, date: e.target.value, time: "" })} style={{ width: "100%", padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }} />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#374151" }}>Time</label>
                    {loadingAvailability ? (
                      <p style={{ color: "#6B7280" }}>Loading...</p>
                    ) : !editAvailability?.available ? (
                      <div style={{ padding: 16, background: "#FEF2F2", borderRadius: 8, color: "#DC2626", fontSize: 14 }}>
                        Staff not available on this date
                      </div>
                    ) : editTimeSlots.length === 0 ? (
                      <div style={{ padding: 16, background: "#FEF3C7", borderRadius: 8, color: "#D97706", fontSize: 14 }}>
                        No available times
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                        {editTimeSlots.map(t => (
                          <button
                            key={t}
                            onClick={() => setEditData({ ...editData, time: t })}
                            style={{
                              padding: 10,
                              borderRadius: 8,
                              fontSize: 14,
                              fontWeight: 500,
                              cursor: "pointer",
                              border: editData.time === t ? "2px solid #10B981" : "1px solid #E5E7EB",
                              background: editData.time === t ? "#ECFDF5" : "#FFFFFF",
                              color: editData.time === t ? "#059669" : "#374151",
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={() => setModalMode("view")} style={{ flex: 1, padding: 14, border: "1px solid #E5E7EB", borderRadius: 8, background: "#FFFFFF", color: "#6B7280", fontSize: 15, cursor: "pointer" }}>Cancel</button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving || !editData.time || !editAvailability?.available}
                      style={{
                        flex: 1,
                        padding: 14,
                        border: "none",
                        borderRadius: 8,
                        background: editData.time && editAvailability?.available ? "#10B981" : "#E5E7EB",
                        color: editData.time && editAvailability?.available ? "#FFFFFF" : "#9CA3AF",
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: editData.time ? "pointer" : "not-allowed",
                      }}
                    >
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
