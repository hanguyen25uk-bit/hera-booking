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

    const startTime = avail.startTime || "09:00";
    const endTime = avail.endTime || "18:00";
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
    const date = new Date(dateStr);
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

  const hours = Array.from({ length: 12 }, function(_, i) { return i + 9; }); // 9 AM to 8 PM

  function getAppointmentStyle(apt: Appointment) {
    const start = new Date(apt.startTime);
    const end = new Date(apt.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const top = (startHour - 9) * 60;
    const height = Math.max(duration * 60, 30);
    
    // Warm coral/peach color for appointments
    let bgColor = "#F8D7C4";
    let borderColor = "#E8A889";
    let textColor = "#5D4037";
    
    if (apt.status === "cancelled") { bgColor = "#E8E8E8"; borderColor = "#CCCCCC"; textColor = "#888888"; }
    if (apt.status === "no-show") { bgColor = "#FFCDD2"; borderColor = "#EF9A9A"; textColor = "#C62828"; }
    if (apt.status === "completed") { bgColor = "#C8E6C9"; borderColor = "#A5D6A7"; textColor = "#2E7D32"; }
    
    return { top, height, bgColor, borderColor, textColor };
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

  const visibleStaffList = staffList.filter(s => visibleStaff.has(s.id));
  const activeAppointments = appointments.filter(function(a) { return a.status !== "cancelled"; });
  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  
  const editTimeSlots = generateTimeSlots(editAvailability, editBookedSlots, editData.serviceId, editData.date, !isPastDate(editData.date));
  const addTimeSlots = generateTimeSlots(addAvailability, addBookedSlots, addData.serviceId, addData.date, true);

  // Current time position for the indicator
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimePosition = (currentHour - 9) * 60 + currentMinute;
  const showTimeIndicator = isToday && currentHour >= 9 && currentHour < 21;

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#FAFAFA" }}>
      {/* Left Sidebar - Team Filter */}
      <div style={{
        width: 280,
        backgroundColor: "#FFFFFF",
        borderRight: "1px solid #E8E8E8",
        display: "flex",
        flexDirection: "column",
        padding: "20px 0",
      }}>
        <div style={{ padding: "0 20px 20px", borderBottom: "1px solid #E8E8E8" }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1A1A1A", marginBottom: 8 }}>Your calendars</h3>
          <button style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            backgroundColor: "transparent",
            border: "none",
            color: "#666",
            fontSize: 14,
            cursor: "pointer",
          }}>
            <span style={{ fontSize: 18 }}>+</span> Connect calendar
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>Team</h3>
          
          {/* Search */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            backgroundColor: "#F5F5F5",
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search"
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 14,
                color: "#1A1A1A",
                width: "100%",
              }}
            />
          </div>

          {/* All Team Checkbox */}
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 0",
            cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={visibleStaff.size === staffList.length}
              onChange={toggleAllStaff}
              style={{ width: 18, height: 18, accentColor: "#1A1A1A" }}
            />
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "#E8E8E8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span style={{ fontSize: 14, color: "#1A1A1A" }}>All team ({staffList.length})</span>
          </label>

          {/* Individual Staff */}
          {staffList.map(staff => (
            <label
              key={staff.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={visibleStaff.has(staff.id)}
                onChange={() => toggleStaffVisibility(staff.id)}
                style={{ width: 18, height: 18, accentColor: "#1A1A1A" }}
              />
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #D4B896 0%, #C4A77D 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: 12,
              }}>
                {staff.name.charAt(0)}
              </div>
              <span style={{ fontSize: 14, color: "#1A1A1A" }}>{staff.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Main Calendar Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E8E8E8",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#666" }}>All team calendars</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={goToPreviousDay} style={{
              width: 32,
              height: 32,
              border: "1px solid #E8E8E8",
              borderRadius: 8,
              background: "#FFFFFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            
            <span style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A", minWidth: 180, textAlign: "center" }}>
              {formatDateDisplay(selectedDate)}
            </span>
            
            <button onClick={goToNextDay} style={{
              width: 32,
              height: 32,
              border: "1px solid #E8E8E8",
              borderRadius: 8,
              background: "#FFFFFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            {!isToday && (
              <button onClick={goToToday} style={{
                padding: "6px 16px",
                border: "1px solid #E8E8E8",
                borderRadius: 20,
                background: "#FFFFFF",
                color: "#1A1A1A",
                fontSize: 14,
                cursor: "pointer",
              }}>
                Today
              </button>
            )}

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: "6px 12px",
                border: "1px solid #E8E8E8",
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => openAddModal()} style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#1A1A1A",
              color: "#FFFFFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}>
              +
            </button>
            
            <button style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              border: "1px solid #E8E8E8",
              borderRadius: 20,
              background: "#FFFFFF",
              cursor: "pointer",
              fontSize: 14,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              Share
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <div style={{ display: "flex", minWidth: "100%" }}>
            {/* Time Column */}
            <div style={{ width: 60, flexShrink: 0, backgroundColor: "#FFFFFF", borderRight: "1px solid #E8E8E8" }}>
              <div style={{ height: 60, borderBottom: "1px solid #E8E8E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: "#999" }}>GMT</span>
              </div>
              {hours.map(hour => (
                <div key={hour} style={{
                  height: 60,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                  paddingRight: 8,
                  paddingTop: 4,
                  borderBottom: "1px solid #F0F0F0",
                }}>
                  <span style={{ fontSize: 12, color: "#999" }}>
                    {hour > 12 ? `${hour - 12}PM` : hour === 12 ? "12PM" : `${hour}AM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Staff Columns */}
            {visibleStaffList.map(staff => {
              const avail = staffAvailability[staff.id];
              const isOff = avail && !avail.available;

              return (
                <div key={staff.id} style={{ flex: 1, minWidth: 180, borderRight: "1px solid #E8E8E8" }}>
                  {/* Staff Header */}
                  <div style={{
                    height: 60,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0 16px",
                    borderBottom: "1px solid #E8E8E8",
                    backgroundColor: isOff ? "#FFF5F5" : "#FFFFFF",
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: isOff ? "#FFCDD2" : "linear-gradient(135deg, #D4B896 0%, #C4A77D 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isOff ? "#C62828" : "#FFFFFF",
                      fontWeight: 600,
                      fontSize: 14,
                    }}>
                      {staff.name.charAt(0)}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: isOff ? "#C62828" : "#1A1A1A" }}>
                      {staff.name}
                    </span>
                  </div>

                  {/* Time Slots */}
                  <div style={{ position: "relative" }}>
                    {hours.map(hour => {
                      const inWorkingHours = isHourInWorkingTime(hour, staff.id);
                      return (
                        <div
                          key={hour}
                          style={{
                            height: 60,
                            borderBottom: "1px solid #F0F0F0",
                            backgroundColor: isOff ? "#FFF5F5" : inWorkingHours ? "#FFFFFF" : "#F8F8F8",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          {!isOff && inWorkingHours && !isPastDate(selectedDate) && [0, 15, 30, 45].map(minute => (
                            <div
                              key={minute}
                              onClick={() => handleTimeSlotClick(staff.id, hour, minute)}
                              style={{
                                flex: 1,
                                cursor: "pointer",
                                borderBottom: minute < 45 ? "1px dashed #F0F0F0" : "none",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(212, 184, 150, 0.1)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                            />
                          ))}
                        </div>
                      );
                    })}

                    {/* Current Time Indicator */}
                    {showTimeIndicator && (
                      <div style={{
                        position: "absolute",
                        top: currentTimePosition,
                        left: 0,
                        right: 0,
                        display: "flex",
                        alignItems: "center",
                        zIndex: 5,
                        pointerEvents: "none",
                      }}>
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: "#1A1A1A",
                          marginLeft: -4,
                        }} />
                        <div style={{
                          flex: 1,
                          height: 2,
                          backgroundColor: "#1A1A1A",
                        }} />
                      </div>
                    )}

                    {/* Appointments */}
                    {activeAppointments.filter(apt => apt.staff.id === staff.id).map(apt => {
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
                            borderLeft: `4px solid ${style.borderColor}`,
                            borderRadius: 6,
                            padding: "6px 10px",
                            cursor: "pointer",
                            overflow: "hidden",
                            zIndex: 10,
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600, color: style.textColor }}>{apt.customerName}</div>
                          <div style={{ fontSize: 12, color: style.textColor, opacity: 0.8 }}>{apt.service.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Time Display */}
      {showTimeIndicator && (
        <div style={{
          position: "fixed",
          left: 280 + 260 + 20,
          top: 60 + 16 + currentTimePosition + 60,
          backgroundColor: "#1A1A1A",
          color: "#FFFFFF",
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 500,
          zIndex: 100,
        }}>
          {currentTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}

      {/* Add Booking Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, width: 440, maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E8E8E8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#1A1A1A" }}>Add Walk-in Booking</h2>
              <button onClick={closeAddModal} style={{ width: 32, height: 32, border: "none", background: "#F5F5F5", borderRadius: 8, cursor: "pointer", fontSize: 18 }}>×</button>
            </div>

            {message && (
              <div style={{ margin: "16px 24px 0", padding: 12, borderRadius: 8, backgroundColor: message.type === "success" ? "#E8F5E9" : "#FFEBEE", color: message.type === "success" ? "#2E7D32" : "#C62828", fontSize: 14 }}>
                {message.text}
              </div>
            )}

            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Customer Name *</label>
                <input
                  type="text"
                  value={addData.customerName}
                  onChange={(e) => setAddData({ ...addData, customerName: e.target.value })}
                  placeholder="Enter name"
                  style={{ width: "100%", padding: 12, border: "1px solid #E8E8E8", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Phone *</label>
                <input
                  type="tel"
                  value={addData.customerPhone}
                  onChange={(e) => setAddData({ ...addData, customerPhone: e.target.value })}
                  placeholder="Phone number"
                  style={{ width: "100%", padding: 12, border: "1px solid #E8E8E8", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Service</label>
                <select
                  value={addData.serviceId}
                  onChange={(e) => setAddData({ ...addData, serviceId: e.target.value, time: "" })}
                  style={{ width: "100%", padding: 12, border: "1px solid #E8E8E8", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
                >
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min - £{s.price})</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Staff</label>
                <select
                  value={addData.staffId}
                  onChange={(e) => setAddData({ ...addData, staffId: e.target.value, time: "" })}
                  style={{ width: "100%", padding: 12, border: "1px solid #E8E8E8", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
                >
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Date</label>
                <input
                  type="date"
                  value={addData.date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setAddData({ ...addData, date: e.target.value, time: "" })}
                  style={{ width: "100%", padding: 12, border: "1px solid #E8E8E8", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Time</label>
                {loadingAddAvailability ? (
                  <p style={{ color: "#666" }}>Loading...</p>
                ) : !addAvailability?.available ? (
                  <div style={{ padding: 16, background: "#FFF5F5", borderRadius: 8, color: "#C62828", fontSize: 14 }}>
                    Staff not available on this date
                  </div>
                ) : addTimeSlots.length === 0 ? (
                  <div style={{ padding: 16, background: "#FFF8E1", borderRadius: 8, color: "#F57C00", fontSize: 14 }}>
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
                          border: addData.time === t ? "2px solid #1A1A1A" : "1px solid #E8E8E8",
                          background: addData.time === t ? "#1A1A1A" : "#FFFFFF",
                          color: addData.time === t ? "#FFFFFF" : "#1A1A1A",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={closeAddModal} style={{ flex: 1, padding: 14, border: "1px solid #E8E8E8", borderRadius: 25, background: "#FFFFFF", color: "#666", fontSize: 15, cursor: "pointer" }}>
                  Cancel
                </button>
                <button
                  onClick={handleAddBooking}
                  disabled={saving || !addData.time || !addData.customerName || !addData.customerPhone}
                  style={{
                    flex: 1,
                    padding: 14,
                    border: "none",
                    borderRadius: 25,
                    background: addData.time && addData.customerName && addData.customerPhone ? "#1A1A1A" : "#E8E8E8",
                    color: addData.time && addData.customerName && addData.customerPhone ? "#FFFFFF" : "#999",
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
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, width: 440, maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E8E8E8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#1A1A1A" }}>
                {modalMode === "edit" ? "Edit Appointment" : "Appointment Details"}
              </h2>
              <button onClick={closeModal} style={{ width: 32, height: 32, border: "none", background: "#F5F5F5", borderRadius: 8, cursor: "pointer", fontSize: 18 }}>×</button>
            </div>

            {message && (
              <div style={{ margin: "16px 24px 0", padding: 12, borderRadius: 8, backgroundColor: message.type === "success" ? "#E8F5E9" : "#FFEBEE", color: message.type === "success" ? "#2E7D32" : "#C62828", fontSize: 14 }}>
                {message.text}
              </div>
            )}

            {confirmAction && (
              <div style={{ margin: "16px 24px", padding: 16, backgroundColor: "#FFF8E1", borderRadius: 12, border: "1px solid #FFE082" }}>
                <p style={{ margin: "0 0 12px", fontWeight: 600, color: "#F57C00" }}>
                  {confirmAction === "cancel" ? "Cancel this appointment?" : confirmAction === "noshow" ? "Mark as No-Show?" : "Permanently delete?"}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirmAction(null)} style={{ flex: 1, padding: 10, border: "1px solid #E8E8E8", borderRadius: 20, background: "#FFFFFF", cursor: "pointer" }}>Back</button>
                  <button
                    onClick={() => { if (confirmAction === "cancel") handleCancel(); if (confirmAction === "noshow") handleNoShow(); if (confirmAction === "delete") handleDelete(); }}
                    disabled={saving}
                    style={{ flex: 1, padding: 10, border: "none", borderRadius: 20, background: confirmAction === "delete" ? "#C62828" : "#F57C00", color: "#FFFFFF", fontWeight: 600, cursor: "pointer" }}
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
                      backgroundColor: selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked" ? "#E8F5E9" : selectedAppointment.status === "cancelled" ? "#F5F5F5" : "#FFEBEE",
                      color: selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked" ? "#2E7D32" : selectedAppointment.status === "cancelled" ? "#666" : "#C62828",
                    }}>
                      {selectedAppointment.status === "booked" ? "Confirmed" : selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </span>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", marginBottom: 4 }}>Service</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>{selectedAppointment.service.name}</div>
                    <div style={{ fontSize: 14, color: "#666" }}>{selectedAppointment.service.durationMinutes} mins - £{selectedAppointment.service.price}</div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", marginBottom: 4 }}>Date & Time</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>{formatDateLong(selectedAppointment.startTime)}</div>
                    <div style={{ fontSize: 14, color: "#666" }}>{formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}</div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", marginBottom: 4 }}>Staff</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>{selectedAppointment.staff.name}</div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", marginBottom: 4 }}>Customer</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>{selectedAppointment.customerName}</div>
                    <div style={{ fontSize: 14, color: "#666" }}>{selectedAppointment.customerPhone}</div>
                    <div style={{ fontSize: 14, color: "#666" }}>{selectedAppointment.customerEmail}</div>
                  </div>

                  {!confirmAction && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked") && (
                        <>
                          <button onClick={startEdit} style={{ padding: 14, border: "none", borderRadius: 25, background: "#1A1A1A", color: "#FFFFFF", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Edit Appointment</button>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setConfirmAction("cancel")} style={{ flex: 1, padding: 12, border: "1px solid #E8E8E8", borderRadius: 25, background: "#FFFFFF", color: "#666", fontSize: 14, cursor: "pointer" }}>Cancel</button>
                            <button onClick={() => setConfirmAction("noshow")} style={{ flex: 1, padding: 12, border: "1px solid #FFCDD2", borderRadius: 25, background: "#FFF5F5", color: "#C62828", fontSize: 14, cursor: "pointer" }}>No-Show</button>
                          </div>
                        </>
                      )}
                      
                      {(selectedAppointment.status === "cancelled" || selectedAppointment.status === "no-show") && (
                        <>
                          <button onClick={handleRestore} disabled={saving} style={{ padding: 14, border: "none", borderRadius: 25, background: "#2E7D32", color: "#FFFFFF", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Restore</button>
                          <button onClick={() => setConfirmAction("delete")} style={{ padding: 12, border: "1px solid #FFCDD2", borderRadius: 25, background: "#FFFFFF", color: "#C62828", fontSize: 14, cursor: "pointer" }}>Delete Permanently</button>
                        </>
                      )}

                      <button onClick={closeModal} style={{ padding: 14, border: "1px solid #E8E8E8", borderRadius: 25, background: "#FFFFFF", color: "#666", fontSize: 15, cursor: "pointer", marginTop: 8 }}>Close</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Service</label>
                    <select value={editData.serviceId} onChange={(e) => setEditData({ ...editData, serviceId: e.target.value, time: "" })} style={{ width: "100%", padding: 12, border: "1px solid #E8E8E8", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}>
                      {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min - £{s.price})</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Staff</label>
                    <select value={editData.staffId} onChange={(e) => setEditData({ ...editData, staffId: e.target.value, time: "" })} style={{ width: "100%", padding: 12, border: "1px solid #E8E8E8", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}>
                      {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Date</label>
                    <input type="date" value={editData.date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setEditData({ ...editData, date: e.target.value, time: "" })} style={{ width: "100%", padding: 12, border: "1px solid #E8E8E8", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }} />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Time</label>
                    {loadingAvailability ? (
                      <p style={{ color: "#666" }}>Loading...</p>
                    ) : !editAvailability?.available ? (
                      <div style={{ padding: 16, background: "#FFF5F5", borderRadius: 8, color: "#C62828", fontSize: 14 }}>
                        Staff not available on this date
                      </div>
                    ) : editTimeSlots.length === 0 ? (
                      <div style={{ padding: 16, background: "#FFF8E1", borderRadius: 8, color: "#F57C00", fontSize: 14 }}>
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
                              border: editData.time === t ? "2px solid #1A1A1A" : "1px solid #E8E8E8",
                              background: editData.time === t ? "#1A1A1A" : "#FFFFFF",
                              color: editData.time === t ? "#FFFFFF" : "#1A1A1A",
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={() => setModalMode("view")} style={{ flex: 1, padding: 14, border: "1px solid #E8E8E8", borderRadius: 25, background: "#FFFFFF", color: "#666", fontSize: 15, cursor: "pointer" }}>Cancel</button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving || !editData.time || !editAvailability?.available}
                      style={{
                        flex: 1,
                        padding: 14,
                        border: "none",
                        borderRadius: 25,
                        background: editData.time && editAvailability?.available ? "#1A1A1A" : "#E8E8E8",
                        color: editData.time && editAvailability?.available ? "#FFFFFF" : "#999",
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
