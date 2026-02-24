"use client";

import { useEffect, useState, Fragment } from "react";

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  servicesJson?: string | null;
  service: { id: string; name: string; durationMinutes: number; price: number };
  staff: { id: string; name: string };
};

type ServiceInfo = { id: string; name: string; durationMinutes: number; price: number };

type Staff = { id: string; name: string; role?: string };
type Service = { id: string; name: string; durationMinutes: number; price: number };
type StaffAvailability = {
  available: boolean;
  reason?: string;
  startTime?: string;
  endTime?: string;
};
type ReceiptItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

// Color Palette - Hera Design System
const COLORS = {
  background: "var(--white)",
  backgroundAlt: "var(--cream)",
  text: "var(--ink)",
  textSecondary: "var(--ink-light)",
  textPlaceholder: "var(--ink-muted)",
  accent: "var(--rose)",
  accentHover: "var(--rose-light)",
  bookedSlot: "var(--rose-pale)",
  bookedSlotHover: "var(--rose-light)",
  confirmedSlot: "var(--sage-light)",
  availableSlot: "var(--cream)",
  divider: "#F3F4F6",
  dividerLight: "#F9FAFB",
  navInactive: "var(--cream-dark)",
  navActive: "var(--ink)",
  iconColor: "var(--ink-muted)",
  cancelledSlot: "var(--cream-dark)",
  noShowSlot: "var(--rose-pale)",
};

// Staff accent colors for left border and background (Setmore-style solid pastels)
const STAFF_COLORS = [
  { border: "#4CAF50", bg: "#E8F5E9" }, // Soft Green
  { border: "#2196F3", bg: "#E3F2FD" }, // Soft Blue
  { border: "#FF9800", bg: "#FFF3E0" }, // Soft Orange
  { border: "#9C27B0", bg: "#F3E5F5" }, // Soft Purple
  { border: "#00BCD4", bg: "#E0F7FA" }, // Soft Cyan
  { border: "#E91E63", bg: "#FCE4EC" }, // Soft Pink
];

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffAvailability, setStaffAvailability] = useState<Record<string, StaffAvailability>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [visibleStaff, setVisibleStaff] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);

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

  // Receipt state
  const [salonInfo, setSalonInfo] = useState<{ name: string; address?: string; phone?: string } | null>(null);

  // Receipt editor state
  const [showReceiptEditor, setShowReceiptEditor] = useState(false);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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
      const [staffRes, servicesRes] = await Promise.all([fetch("/api/staff?activeOnly=true"), fetch("/api/services")]);
      if (!staffRes.ok || !servicesRes.ok) return;
      const staffData = await staffRes.json();
      const servicesData = await servicesRes.json();
      setStaffList(Array.isArray(staffData) ? staffData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setVisibleStaff(new Set(staffData.map((s: Staff) => s.id)));
    } catch (err) { console.error(err); }
  }

  async function loadSalonInfo() {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSalonInfo({
          name: data.salonName || "Salon",
          address: data.salonAddress,
          phone: data.salonPhone
        });
      }
    } catch (err) { console.error(err); }
  }

  useEffect(function() { loadSalonInfo(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [aptsRes, staffRes] = await Promise.all([
        fetch("/api/appointments?date=" + selectedDate),
        fetch("/api/staff?activeOnly=true"),
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
            const res = await fetch("/api/staff-availability?staffId=" + staff.id + "&date=" + selectedDate, { credentials: "include" });
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
      const availRes = await fetch("/api/staff-availability?staffId=" + editData.staffId + "&date=" + editData.date, { credentials: "include" });
      if (!availRes.ok) {
        setEditAvailability({ available: true, startTime: "10:00", endTime: "19:00" });
      } else {
        const avail = await availRes.json();
        setEditAvailability(avail);
      }

      const aptsRes = await fetch("/api/appointments?date=" + editData.date, { credentials: "include" });
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
      const availRes = await fetch("/api/staff-availability?staffId=" + addData.staffId + "&date=" + addData.date, { credentials: "include" });
      if (!availRes.ok) {
        setAddAvailability({ available: true, startTime: "10:00", endTime: "19:00" });
      } else {
        const avail = await availRes.json();
        setAddAvailability(avail);
      }

      const aptsRes = await fetch("/api/appointments?date=" + addData.date, { credentials: "include" });
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

  function generateReceiptNumber(appointmentId: string) {
    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, "");
    const shortId = appointmentId.slice(-6).toUpperCase();
    return `RCP-${dateStr}-${shortId}`;
  }

  // Receipt Editor Functions
  function openReceiptEditor() {
    if (!selectedAppointment) return;
    const allServices: ServiceInfo[] = selectedAppointment.servicesJson
      ? JSON.parse(selectedAppointment.servicesJson)
      : [selectedAppointment.service];
    setReceiptItems(allServices.map((svc, idx) => ({
      id: `service-${idx}`,
      name: svc.name,
      price: svc.price,
      quantity: 1,
    })));
    setNewItemName("");
    setNewItemPrice("");
    setShowReceiptEditor(true);
  }

  function addReceiptItem() {
    if (!newItemName.trim() || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price < 0) return;

    setReceiptItems(prev => [...prev, {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      price: price,
      quantity: 1,
    }]);
    setNewItemName("");
    setNewItemPrice("");
  }

  function removeReceiptItem(itemId: string) {
    setReceiptItems(prev => prev.filter(item => item.id !== itemId));
  }

  function updateItemQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    setReceiptItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ));
  }

  function calculateTotal() {
    return receiptItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  async function previewReceiptPdf() {
    if (!selectedAppointment) return;
    setGeneratingPdf(true);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: [80, 200] });

      const receiptNumber = generateReceiptNumber(selectedAppointment.id);
      const appointmentDate = new Date(selectedAppointment.startTime);
      let y = 10;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(salonInfo?.name || "Hera Nail Spa", 40, y, { align: "center" });
      y += 5;

      if (salonInfo?.address) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(salonInfo.address, 40, y, { align: "center" });
        y += 4;
      }
      if (salonInfo?.phone) {
        doc.setFontSize(8);
        doc.text(`Tel: ${salonInfo.phone}`, 40, y, { align: "center" });
        y += 4;
      }

      y += 3;
      doc.setLineWidth(0.1);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, y, 75, y);
      y += 6;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RECEIPT", 40, y, { align: "center" });
      y += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(receiptNumber, 40, y, { align: "center" });
      y += 6;

      doc.setFontSize(8);
      doc.text(`Date: ${appointmentDate.toLocaleDateString("en-GB")}`, 5, y);
      y += 4;
      doc.text(`Time: ${appointmentDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`, 5, y);
      y += 4;
      doc.text(`Customer: ${selectedAppointment.customerName}`, 5, y);
      y += 4;
      doc.text(`Staff: ${selectedAppointment.staff.name}`, 5, y);
      y += 6;

      doc.line(5, y, 75, y);
      y += 4;

      doc.setFont("helvetica", "bold");
      doc.text("Item", 5, y);
      doc.text("Qty", 45, y);
      doc.text("Price", 75, y, { align: "right" });
      y += 4;
      doc.setFont("helvetica", "normal");

      receiptItems.forEach(item => {
        const itemName = item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name;
        doc.text(itemName, 5, y);
        doc.text(item.quantity.toString(), 48, y);
        doc.text(`£${(item.price * item.quantity).toFixed(2)}`, 75, y, { align: "right" });
        y += 4;
      });

      y += 2;
      doc.line(5, y, 75, y);
      y += 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", 5, y);
      doc.text(`£${calculateTotal().toFixed(2)}`, 75, y, { align: "right" });
      y += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Thank you for your visit!", 40, y, { align: "center" });
      y += 5;
      doc.setFontSize(7);
      doc.text(`Printed: ${new Date().toLocaleString("en-GB")}`, 40, y, { align: "center" });

      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
    } catch (error) {
      console.error("PDF generation error:", error);
      setMessage({ type: "error", text: "Failed to generate PDF" });
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function sendReceiptPdfEmail() {
    if (!selectedAppointment) return;

    if (!selectedAppointment.customerEmail || selectedAppointment.customerEmail === "walkin@salon.com") {
      setMessage({ type: "error", text: "Customer does not have a valid email address" });
      return;
    }

    setGeneratingPdf(true);
    setMessage(null);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: [80, 200] });

      const receiptNumber = generateReceiptNumber(selectedAppointment.id);
      const appointmentDate = new Date(selectedAppointment.startTime);
      let y = 10;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(salonInfo?.name || "Hera Nail Spa", 40, y, { align: "center" });
      y += 5;

      if (salonInfo?.address) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(salonInfo.address, 40, y, { align: "center" });
        y += 4;
      }
      if (salonInfo?.phone) {
        doc.setFontSize(8);
        doc.text(`Tel: ${salonInfo.phone}`, 40, y, { align: "center" });
        y += 4;
      }

      y += 3;
      doc.setLineWidth(0.1);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, y, 75, y);
      y += 6;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RECEIPT", 40, y, { align: "center" });
      y += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(receiptNumber, 40, y, { align: "center" });
      y += 6;

      doc.setFontSize(8);
      doc.text(`Date: ${appointmentDate.toLocaleDateString("en-GB")}`, 5, y);
      y += 4;
      doc.text(`Time: ${appointmentDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`, 5, y);
      y += 4;
      doc.text(`Customer: ${selectedAppointment.customerName}`, 5, y);
      y += 4;
      doc.text(`Staff: ${selectedAppointment.staff.name}`, 5, y);
      y += 6;

      doc.line(5, y, 75, y);
      y += 4;

      doc.setFont("helvetica", "bold");
      doc.text("Item", 5, y);
      doc.text("Qty", 45, y);
      doc.text("Price", 75, y, { align: "right" });
      y += 4;
      doc.setFont("helvetica", "normal");

      receiptItems.forEach(item => {
        const itemName = item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name;
        doc.text(itemName, 5, y);
        doc.text(item.quantity.toString(), 48, y);
        doc.text(`£${(item.price * item.quantity).toFixed(2)}`, 75, y, { align: "right" });
        y += 4;
      });

      y += 2;
      doc.line(5, y, 75, y);
      y += 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", 5, y);
      doc.text(`£${calculateTotal().toFixed(2)}`, 75, y, { align: "right" });
      y += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Thank you for your visit!", 40, y, { align: "center" });
      y += 5;
      doc.setFontSize(7);
      doc.text(`Printed: ${new Date().toLocaleString("en-GB")}`, 40, y, { align: "center" });

      const pdfBase64 = doc.output("datauristring").split(",")[1];

      const res = await fetch(`/api/appointments/${selectedAppointment.id}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pdfBase64,
          receiptNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send receipt");
      }

      setMessage({ type: "success", text: `Receipt PDF sent to ${selectedAppointment.customerEmail}` });
      setShowReceiptEditor(false);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setGeneratingPdf(false);
    }
  }


  const hours = Array.from({ length: 12 }, function(_, i) { return i + 8; });

  function getAppointmentStyle(apt: Appointment, cellHeight: number = 80) {
    const start = new Date(apt.startTime);
    const end = new Date(apt.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const top = (startHour - 8) * cellHeight;
    const height = Math.max(duration * cellHeight, cellHeight / 2);

    // Default text color for normal appointments
    let bgColor = "#EFF6FF";
    let borderColor = "#3B82F6";
    let textColor = "#1F2937";

    if (apt.status === "cancelled") {
      bgColor = "#F3F4F6";
      borderColor = "#9CA3AF";
      textColor = "#6B7280";
    }
    if (apt.status === "no-show") {
      bgColor = "#FEF2F2";
      borderColor = "#EF4444";
      textColor = "#DC2626";
    }
    if (apt.status === "completed") {
      bgColor = "#ECFDF5";
      borderColor = "#10B981";
      textColor = "#059669";
    }

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

  // Current time indicator
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimePosition = (currentHour - 8) * 80 + (currentMinute / 60) * 80;
  const showTimeIndicator = isToday && currentHour >= 8 && currentHour < 20;


  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: COLORS.background, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: isMobile ? "12px 16px" : "16px 24px", backgroundColor: COLORS.background, borderBottom: `1px solid ${COLORS.divider}` }}>
        {/* Navigation Row - Centered */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Left side - Date display */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, color: COLORS.text, margin: 0 }}>
              {formatDateDisplay(selectedDate)}
            </h1>
            {isToday && (
              <span style={{
                padding: "3px 8px",
                backgroundColor: COLORS.accent,
                color: "#FFFFFF",
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 10,
              }}>
                TODAY
              </span>
            )}
          </div>

          {/* Center - Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={goToPreviousDay} style={{
              width: 32,
              height: 32,
              border: `1px solid ${COLORS.divider}`,
              borderRadius: 6,
              background: COLORS.background,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.iconColor} strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            <button onClick={goToToday} style={{
              padding: "6px 12px",
              border: `1px solid ${COLORS.divider}`,
              borderRadius: 6,
              background: COLORS.background,
              color: COLORS.text,
              fontSize: 13,
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
                padding: "6px 10px",
                border: `1px solid ${COLORS.divider}`,
                borderRadius: 6,
                fontSize: 13,
                color: COLORS.text,
                cursor: "pointer",
              }}
            />

            <button onClick={goToNextDay} style={{
              width: 32,
              height: 32,
              border: `1px solid ${COLORS.divider}`,
              borderRadius: 6,
              background: COLORS.background,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.iconColor} strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* Right side - Add button only */}
          <button
            onClick={() => openAddModal()}
            style={{
              padding: isMobile ? "8px 12px" : "8px 16px",
              backgroundColor: COLORS.accent,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            Add
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "8px" : "16px 24px", WebkitOverflowScrolling: "touch" }}>
        <div style={{
          backgroundColor: COLORS.background,
          borderRadius: 12,
          border: `1px solid ${COLORS.divider}`,
          minWidth: isMobile ? `${60 + visibleStaffList.length * 110}px` : "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
          {/* Sticky Header Row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? `60px repeat(${visibleStaffList.length}, 110px)`
              : `80px repeat(${visibleStaffList.length}, minmax(160px, 1fr))`,
            position: "sticky",
            top: 0,
            backgroundColor: COLORS.background,
            zIndex: 30,
            borderBottom: `2px solid #D1D5DB`,
            borderRadius: "12px 12px 0 0",
          }}>
            {/* Empty Time Header */}
            <div style={{
              padding: isMobile ? "10px 4px" : "12px 12px",
              position: "sticky",
              left: 0,
              backgroundColor: COLORS.background,
              zIndex: 40,
              borderRight: "1px solid #E5E7EB",
            }} />
            {/* Staff Headers - Compact inline layout */}
            {visibleStaffList.map((staff, idx) => {
              const avail = staffAvailability[staff.id];
              const isOff = avail && !avail.available;

              return (
                <div key={staff.id} style={{
                  padding: isMobile ? "10px 8px" : "12px 16px",
                  borderLeft: `1px solid #E5E7EB`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: COLORS.background,
                }}>
                  {/* Small Staff Avatar */}
                  <div style={{
                    width: 24,
                    height: 24,
                    minWidth: 24,
                    borderRadius: "50%",
                    backgroundColor: isOff ? "#D1D5DB" : "#1a1a1a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}>
                    {staff.name.charAt(0)}
                  </div>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isOff ? COLORS.textPlaceholder : COLORS.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {staff.name}
                  </span>
                  {isOff && (
                    <span style={{
                      padding: "2px 8px",
                      backgroundColor: "#9CA3AF",
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: 500,
                      borderRadius: 10,
                      marginLeft: "auto",
                    }}>
                      OFF
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time Grid Body */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? `60px repeat(${visibleStaffList.length}, 110px)`
              : `80px repeat(${visibleStaffList.length}, minmax(160px, 1fr))`,
            position: "relative",
          }}>
            {/* Current Time Indicator */}
            {showTimeIndicator && (
              <div style={{
                position: "absolute",
                top: currentTimePosition,
                left: 0,
                right: 0,
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                pointerEvents: "none",
              }}>
                {/* Time pill */}
                <div style={{
                  backgroundColor: "#1a1a1a",
                  color: "#FFFFFF",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 10,
                  marginLeft: 4,
                  minWidth: isMobile ? 40 : 50,
                  textAlign: "center",
                }}>
                  {currentTime.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" })}
                </div>
                {/* Line */}
                <div style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: "#1a1a1a",
                  marginLeft: 4,
                }} />
              </div>
            )}

            {/* Time Rows */}
            {hours.map(hour => (
              <Fragment key={hour}>
                {/* Time Label */}
                <div key={`time-${hour}`} style={{
                  padding: isMobile ? "4px" : "8px 12px",
                  borderBottom: "1px solid #E5E7EB",
                  borderRight: "1px solid #E5E7EB",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: isMobile ? "center" : "flex-end",
                  color: COLORS.textSecondary,
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: 500,
                  height: isMobile ? 60 : 80,
                  boxSizing: "border-box",
                  position: "sticky",
                  left: 0,
                  backgroundColor: COLORS.background,
                  zIndex: 10,
                }}>
                  {hour <= 12 ? hour : hour - 12}{hour < 12 ? "AM" : "PM"}
                </div>

                {/* Staff Columns */}
                {visibleStaffList.map((staff, idx) => {
                  const avail = staffAvailability[staff.id];
                  const isOff = avail && !avail.available;
                  const inWorkingHours = isHourInWorkingTime(hour, staff.id);
                  const staffColor = STAFF_COLORS[idx % STAFF_COLORS.length];

                  // Background styles - clean solid colors, no patterns
                  let cellBackground: string;
                  if (isOff) {
                    // Day off: solid light gray
                    cellBackground = "#E5E7EB";
                  } else if (!inWorkingHours) {
                    // Non-working hours: barely-there gray
                    cellBackground = "#F9FAFB";
                  } else {
                    // Working hours: pure white
                    cellBackground = "#FFFFFF";
                  }

                  return (
                    <div
                      key={`${staff.id}-${hour}`}
                      style={{
                        height: isMobile ? 60 : 80,
                        borderBottom: "1px solid #E5E7EB",
                        borderRight: "1px solid #E5E7EB",
                        backgroundColor: cellBackground,
                        position: "relative",
                      }}
                    >
                      {/* Half-hour dashed line */}
                      {!isOff && (
                        <div style={{
                          position: "absolute",
                          top: "50%",
                          left: 0,
                          right: 0,
                          borderBottom: "1px dashed #F3F4F6",
                          pointerEvents: "none",
                        }} />
                      )}

                      {!isOff && inWorkingHours && !isPastDate(selectedDate) && (
                        <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative", zIndex: 1 }}>
                          {[0, 15, 30, 45].map(minute => (
                            <div
                              key={minute}
                              onClick={() => handleTimeSlotClick(staff.id, hour, minute)}
                              style={{
                                flex: 1,
                                cursor: "pointer",
                                transition: "background-color 0.15s",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.03)"; }}
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
                          color: "#9CA3AF",
                          fontSize: 12,
                          fontWeight: 500,
                          zIndex: 5,
                        }}>
                          DAY OFF
                        </div>
                      )}

                      {/* Appointments */}
                      {hour === 8 && activeAppointments.filter(apt => apt.staff.id === staff.id).map(apt => {
                        const cellHeight = isMobile ? 60 : 80;
                        const style = getAppointmentStyle(apt, cellHeight);
                        // Use staff-specific colors for normal appointments
                        const isSpecialStatus = apt.status === "cancelled" || apt.status === "no-show" || apt.status === "completed";
                        const aptBorderColor = isSpecialStatus ? style.borderColor : staffColor.border;
                        const aptBgColor = isSpecialStatus ? "#F9FAFB" : staffColor.bg;

                        return (
                          <div
                            key={apt.id}
                            onClick={() => openAppointment(apt)}
                            style={{
                              position: "absolute",
                              top: style.top,
                              left: 3,
                              right: 3,
                              height: style.height - 2,
                              backgroundColor: aptBgColor,
                              borderLeft: `4px solid ${aptBorderColor}`,
                              borderRadius: 6,
                              padding: isMobile ? "4px 6px" : "6px 10px",
                              cursor: "pointer",
                              overflow: "hidden",
                              zIndex: 15,
                              transition: "all 0.15s ease",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.18)";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            {(() => {
                              const allServices: ServiceInfo[] = apt.servicesJson
                                ? JSON.parse(apt.servicesJson)
                                : [apt.service];
                              const isMultiService = allServices.length > 1;
                              const totalDuration = allServices.reduce((sum, s) => sum + s.durationMinutes, 0);
                              const totalPrice = allServices.reduce((sum, s) => sum + s.price, 0);
                              const blockHeight = style.height - 2;
                              const isCompact = blockHeight < 70;

                              return (
                                <>
                                  {/* Customer name */}
                                  <div style={{
                                    fontSize: isMobile ? 11 : 13,
                                    fontWeight: 600,
                                    color: "#1F2937",
                                    marginBottom: isCompact ? 1 : 3,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    lineHeight: 1.3,
                                  }}>
                                    {apt.customerName}
                                  </div>

                                  {/* Services list */}
                                  {isCompact ? (
                                    // Compact view: single line with all services
                                    <div style={{
                                      fontSize: isMobile ? 9 : 10,
                                      color: "#6B7280",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      lineHeight: 1.2,
                                    }}>
                                      {allServices.map(s => s.name).join(', ')}
                                    </div>
                                  ) : (
                                    // Full view: each service on separate line
                                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                      {allServices.map((svc, idx) => (
                                        <div key={idx} style={{
                                          fontSize: isMobile ? 9 : 10,
                                          color: "#6B7280",
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          lineHeight: 1.3,
                                        }}>
                                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                                            {isMultiService && "• "}{svc.name}
                                          </span>
                                          <span style={{ marginLeft: 4, flexShrink: 0, fontSize: isMobile ? 8 : 9, color: "#9CA3AF" }}>
                                            {svc.durationMinutes}m
                                          </span>
                                        </div>
                                      ))}
                                      {/* Total line for multi-service */}
                                      {isMultiService && (
                                        <div style={{
                                          fontSize: isMobile ? 8 : 9,
                                          color: "#9CA3AF",
                                          marginTop: 2,
                                          paddingTop: 2,
                                          borderTop: "1px solid #E5E7EB",
                                          fontWeight: 500,
                                        }}>
                                          Total: {totalDuration}m · £{totalPrice}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Add Booking Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ backgroundColor: COLORS.background, borderRadius: 12, width: "100%", maxWidth: 420, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: COLORS.text }}>Add Walk-in Booking</h2>
              <button onClick={closeAddModal} style={{ width: 30, height: 30, border: "none", background: COLORS.backgroundAlt, borderRadius: 6, cursor: "pointer", fontSize: 16, color: COLORS.textSecondary }}>×</button>
            </div>

            {message && (
              <div style={{ margin: "12px 20px 0", padding: 10, borderRadius: 6, backgroundColor: message.type === "success" ? COLORS.confirmedSlot : "#FFEBEE", color: message.type === "success" ? "#2E7D32" : "#C62828", fontSize: 13 }}>
                {message.text}
              </div>
            )}

            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: COLORS.text }}>Customer Name *</label>
                <input
                  type="text"
                  value={addData.customerName}
                  onChange={(e) => setAddData({ ...addData, customerName: e.target.value })}
                  placeholder="Enter name"
                  style={{ width: "100%", padding: 10, border: `1px solid ${COLORS.divider}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: COLORS.text }}>Phone *</label>
                <input
                  type="tel"
                  value={addData.customerPhone}
                  onChange={(e) => setAddData({ ...addData, customerPhone: e.target.value })}
                  placeholder="Phone number"
                  style={{ width: "100%", padding: 10, border: `1px solid ${COLORS.divider}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: COLORS.text }}>Service</label>
                <select
                  value={addData.serviceId}
                  onChange={(e) => setAddData({ ...addData, serviceId: e.target.value, time: "" })}
                  style={{ width: "100%", padding: 10, border: `1px solid ${COLORS.divider}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                >
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min - £{s.price})</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: COLORS.text }}>Staff</label>
                <select
                  value={addData.staffId}
                  onChange={(e) => setAddData({ ...addData, staffId: e.target.value, time: "" })}
                  style={{ width: "100%", padding: 10, border: `1px solid ${COLORS.divider}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                >
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: COLORS.text }}>Date</label>
                <input
                  type="date"
                  value={addData.date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setAddData({ ...addData, date: e.target.value, time: "" })}
                  style={{ width: "100%", padding: 10, border: `1px solid ${COLORS.divider}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: COLORS.text }}>Time</label>
                {loadingAddAvailability ? (
                  <p style={{ color: COLORS.textSecondary }}>Loading...</p>
                ) : !addAvailability?.available ? (
                  <div style={{ padding: 12, background: "#FFEBEE", borderRadius: 6, color: "#C62828", fontSize: 13 }}>
                    Staff not available on this date
                  </div>
                ) : addTimeSlots.length === 0 ? (
                  <div style={{ padding: 12, background: "#FFF3E0", borderRadius: 6, color: "#E65100", fontSize: 13 }}>
                    No available times
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {addTimeSlots.map(t => (
                      <button
                        key={t}
                        onClick={() => setAddData({ ...addData, time: t })}
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          border: addData.time === t ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.divider}`,
                          background: addData.time === t ? "#FFF0ED" : COLORS.background,
                          color: addData.time === t ? COLORS.accent : COLORS.text,
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={closeAddModal} style={{ flex: 1, padding: 12, border: `1px solid ${COLORS.divider}`, borderRadius: 6, background: COLORS.background, color: COLORS.textSecondary, fontSize: 14, cursor: "pointer" }}>
                  Cancel
                </button>
                <button
                  onClick={handleAddBooking}
                  disabled={saving || !addData.time || !addData.customerName || !addData.customerPhone}
                  style={{
                    flex: 1,
                    padding: 12,
                    border: "none",
                    borderRadius: 6,
                    background: addData.time && addData.customerName && addData.customerPhone ? COLORS.accent : COLORS.divider,
                    color: addData.time && addData.customerName && addData.customerPhone ? "#FFFFFF" : COLORS.textPlaceholder,
                    fontSize: 14,
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
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ backgroundColor: COLORS.background, borderRadius: 12, width: "100%", maxWidth: 420, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: COLORS.text }}>
                {modalMode === "edit" ? "Edit Appointment" : "Appointment Details"}
              </h2>
              <button onClick={closeModal} style={{ width: 30, height: 30, border: "none", background: COLORS.backgroundAlt, borderRadius: 6, cursor: "pointer", fontSize: 16, color: COLORS.textSecondary }}>×</button>
            </div>

            {message && (
              <div style={{ margin: "12px 20px 0", padding: 10, borderRadius: 6, backgroundColor: message.type === "success" ? COLORS.confirmedSlot : "#FFEBEE", color: message.type === "success" ? "#2E7D32" : "#C62828", fontSize: 13 }}>
                {message.text}
              </div>
            )}

            {confirmAction && (
              <div style={{ margin: "12px 20px", padding: 14, backgroundColor: "#FFF3E0", borderRadius: 8, border: "1px solid #FFE0B2" }}>
                <p style={{ margin: "0 0 10px", fontWeight: 600, color: "#E65100", fontSize: 14 }}>
                  {confirmAction === "cancel" ? "Cancel this appointment?" : confirmAction === "noshow" ? "Mark as No-Show?" : "Permanently delete?"}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfirmAction(null)} style={{ flex: 1, padding: 8, border: `1px solid ${COLORS.divider}`, borderRadius: 6, background: COLORS.background, cursor: "pointer", fontSize: 13 }}>Back</button>
                  <button
                    onClick={() => { if (confirmAction === "cancel") handleCancel(); if (confirmAction === "noshow") handleNoShow(); if (confirmAction === "delete") handleDelete(); }}
                    disabled={saving}
                    style={{ flex: 1, padding: 8, border: "none", borderRadius: 6, background: confirmAction === "delete" ? "#C62828" : "#E65100", color: "#FFFFFF", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                  >
                    {saving ? "..." : "Confirm"}
                  </button>
                </div>
              </div>
            )}

            <div style={{ padding: 20 }}>
              {modalMode === "view" ? (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <span style={{
                      padding: "5px 12px",
                      borderRadius: 16,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked" ? COLORS.confirmedSlot : selectedAppointment.status === "cancelled" ? COLORS.backgroundAlt : "#FFEBEE",
                      color: selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked" ? "#2E7D32" : selectedAppointment.status === "cancelled" ? COLORS.textSecondary : "#C62828",
                    }}>
                      {selectedAppointment.status === "booked" ? "Confirmed" : selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </span>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase", marginBottom: 3 }}>
                      Service{selectedAppointment.servicesJson ? 's' : ''}
                    </div>
                    {(() => {
                      const allServices: ServiceInfo[] = selectedAppointment.servicesJson
                        ? JSON.parse(selectedAppointment.servicesJson)
                        : [selectedAppointment.service];
                      const totalDuration = allServices.reduce((sum, s) => sum + s.durationMinutes, 0);
                      const totalPrice = allServices.reduce((sum, s) => sum + s.price, 0);
                      return (
                        <>
                          {allServices.map((svc, idx) => (
                            <div key={svc.id} style={{ marginBottom: idx < allServices.length - 1 ? 6 : 0 }}>
                              <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{svc.name}</div>
                              <div style={{ fontSize: 13, color: COLORS.textSecondary }}>{svc.durationMinutes} mins - £{svc.price}</div>
                            </div>
                          ))}
                          {allServices.length > 1 && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${COLORS.divider}` }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>Total: {totalDuration} mins - £{totalPrice}</div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase", marginBottom: 3 }}>Date & Time</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{formatDateLong(selectedAppointment.startTime)}</div>
                    <div style={{ fontSize: 13, color: COLORS.textSecondary }}>{formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}</div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase", marginBottom: 3 }}>Staff</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{selectedAppointment.staff.name}</div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase", marginBottom: 3 }}>Customer</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{selectedAppointment.customerName}</div>
                    <div style={{ fontSize: 13, color: COLORS.textSecondary }}>{selectedAppointment.customerPhone}</div>
                    <div style={{ fontSize: 13, color: COLORS.textSecondary }}>{selectedAppointment.customerEmail}</div>
                  </div>

                  {!confirmAction && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(selectedAppointment.status === "confirmed" || selectedAppointment.status === "booked") && (
                        <>
                          <button onClick={startEdit} style={{ padding: 12, border: "none", borderRadius: 6, background: COLORS.text, color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Edit Appointment</button>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => setConfirmAction("cancel")} style={{ flex: 1, padding: 10, border: `1px solid ${COLORS.divider}`, borderRadius: 6, background: COLORS.background, color: COLORS.textSecondary, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                            <button onClick={() => setConfirmAction("noshow")} style={{ flex: 1, padding: 10, border: "1px solid #FFCDD2", borderRadius: 6, background: "#FFEBEE", color: "#C62828", fontSize: 13, cursor: "pointer" }}>No-Show</button>
                          </div>
                        </>
                      )}

                      {(selectedAppointment.status === "cancelled" || selectedAppointment.status === "no-show") && (
                        <>
                          <button onClick={handleRestore} disabled={saving} style={{ padding: 12, border: "none", borderRadius: 6, background: "#2E7D32", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Restore</button>
                          <button onClick={() => setConfirmAction("delete")} style={{ padding: 10, border: "1px solid #FFCDD2", borderRadius: 6, background: COLORS.background, color: "#C62828", fontSize: 13, cursor: "pointer" }}>Delete Permanently</button>
                        </>
                      )}

                      <button
                        onClick={openReceiptEditor}
                        style={{ padding: 12, border: "none", borderRadius: 6, background: COLORS.accent, color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4 }}
                      >
                        Create Receipt
                      </button>
                      <button onClick={closeModal} style={{ padding: 12, border: `1px solid ${COLORS.divider}`, borderRadius: 6, background: COLORS.background, color: COLORS.textSecondary, fontSize: 14, cursor: "pointer" }}>Close</button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: COLORS.text }}>Service</label>
                    <select value={editData.serviceId} onChange={(e) => setEditData({ ...editData, serviceId: e.target.value, time: "" })} style={{ width: "100%", padding: 10, border: `1px solid ${COLORS.divider}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}>
                      {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min - £{s.price})</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: COLORS.text }}>Staff</label>
                    <select value={editData.staffId} onChange={(e) => setEditData({ ...editData, staffId: e.target.value, time: "" })} style={{ width: "100%", padding: 10, border: `1px solid ${COLORS.divider}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}>
                      {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: COLORS.text }}>Date</label>
                    <input type="date" value={editData.date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setEditData({ ...editData, date: e.target.value, time: "" })} style={{ width: "100%", padding: 10, border: `1px solid ${COLORS.divider}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: COLORS.text }}>Time</label>
                    {loadingAvailability ? (
                      <p style={{ color: COLORS.textSecondary }}>Loading...</p>
                    ) : !editAvailability?.available ? (
                      <div style={{ padding: 12, background: "#FFEBEE", borderRadius: 6, color: "#C62828", fontSize: 13 }}>
                        Staff not available on this date
                      </div>
                    ) : editTimeSlots.length === 0 ? (
                      <div style={{ padding: 12, background: "#FFF3E0", borderRadius: 6, color: "#E65100", fontSize: 13 }}>
                        No available times
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                        {editTimeSlots.map(t => (
                          <button
                            key={t}
                            onClick={() => setEditData({ ...editData, time: t })}
                            style={{
                              padding: 8,
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 500,
                              cursor: "pointer",
                              border: editData.time === t ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.divider}`,
                              background: editData.time === t ? "#FFF0ED" : COLORS.background,
                              color: editData.time === t ? COLORS.accent : COLORS.text,
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setModalMode("view")} style={{ flex: 1, padding: 12, border: `1px solid ${COLORS.divider}`, borderRadius: 6, background: COLORS.background, color: COLORS.textSecondary, fontSize: 14, cursor: "pointer" }}>Cancel</button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving || !editData.time || !editAvailability?.available}
                      style={{
                        flex: 1,
                        padding: 12,
                        border: "none",
                        borderRadius: 6,
                        background: editData.time && editAvailability?.available ? COLORS.accent : COLORS.divider,
                        color: editData.time && editAvailability?.available ? "#FFFFFF" : COLORS.textPlaceholder,
                        fontSize: 14,
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

      {/* Receipt Editor Modal */}
      {showReceiptEditor && selectedAppointment && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16 }}>
          <div style={{ backgroundColor: COLORS.background, borderRadius: 12, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.accent }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#FFFFFF" }}>Create Receipt</h2>
              <button onClick={() => setShowReceiptEditor(false)} style={{ width: 30, height: 30, border: "none", background: "rgba(255,255,255,0.2)", borderRadius: 6, cursor: "pointer", fontSize: 16, color: "#FFFFFF" }}>×</button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16, padding: 14, background: COLORS.backgroundAlt, borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textSecondary, textTransform: "uppercase", marginBottom: 3 }}>Customer</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{selectedAppointment.customerName}</div>
                <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                  {new Date(selectedAppointment.startTime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} - {selectedAppointment.staff.name}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 10 }}>Items</div>
                {receiptItems.map((item, index) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: index < receiptItems.length - 1 ? `1px solid ${COLORS.divider}` : "none" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.text }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.textSecondary }}>£{item.price.toFixed(2)} each</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        style={{ width: 26, height: 26, border: `1px solid ${COLORS.divider}`, borderRadius: 4, background: COLORS.background, cursor: item.quantity > 1 ? "pointer" : "not-allowed", fontSize: 14, color: item.quantity > 1 ? COLORS.text : COLORS.divider }}
                      >-</button>
                      <span style={{ width: 20, textAlign: "center", fontSize: 13, fontWeight: 600 }}>{item.quantity}</span>
                      <button
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                        style={{ width: 26, height: 26, border: `1px solid ${COLORS.divider}`, borderRadius: 4, background: COLORS.background, cursor: "pointer", fontSize: 14, color: COLORS.text }}
                      >+</button>
                    </div>
                    <div style={{ width: 60, textAlign: "right", fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                      £{(item.price * item.quantity).toFixed(2)}
                    </div>
                    {item.id !== "main-service" && (
                      <button
                        onClick={() => removeReceiptItem(item.id)}
                        style={{ width: 26, height: 26, border: "none", borderRadius: 4, background: "#FFEBEE", cursor: "pointer", fontSize: 12, color: "#C62828" }}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 16, padding: 14, background: COLORS.confirmedSlot, borderRadius: 8, border: `1px dashed #2E7D32` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2E7D32", marginBottom: 10 }}>+ Add Extra Item</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Item name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    style={{ flex: 1, padding: 8, border: `1px solid ${COLORS.divider}`, borderRadius: 6, fontSize: 13 }}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    style={{ width: 70, padding: 8, border: `1px solid ${COLORS.divider}`, borderRadius: 6, fontSize: 13 }}
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={addReceiptItem}
                    disabled={!newItemName.trim() || !newItemPrice}
                    style={{ padding: "8px 14px", border: "none", borderRadius: 6, background: newItemName.trim() && newItemPrice ? "#2E7D32" : COLORS.divider, color: newItemName.trim() && newItemPrice ? "#FFFFFF" : COLORS.textPlaceholder, fontWeight: 600, cursor: newItemName.trim() && newItemPrice ? "pointer" : "not-allowed", fontSize: 13 }}
                  >Add</button>
                </div>
              </div>

              <div style={{ padding: 14, background: COLORS.text, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>Total Amount</span>
                  <span style={{ color: "#FFFFFF", fontSize: 24, fontWeight: 700 }}>£{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={previewReceiptPdf}
                    disabled={generatingPdf}
                    style={{ flex: 1, padding: 12, border: "none", borderRadius: 6, background: COLORS.accent, color: "#FFFFFF", fontSize: 13, fontWeight: 600, cursor: generatingPdf ? "not-allowed" : "pointer", opacity: generatingPdf ? 0.7 : 1 }}
                  >
                    {generatingPdf ? "Loading..." : "Preview Receipt"}
                  </button>
                  <button
                    onClick={sendReceiptPdfEmail}
                    disabled={generatingPdf || !selectedAppointment.customerEmail || selectedAppointment.customerEmail === "walkin@salon.com"}
                    style={{ flex: 1, padding: 12, border: "none", borderRadius: 6, background: "#2E7D32", color: "#FFFFFF", fontSize: 13, fontWeight: 600, cursor: (generatingPdf || !selectedAppointment.customerEmail || selectedAppointment.customerEmail === "walkin@salon.com") ? "not-allowed" : "pointer", opacity: (generatingPdf || !selectedAppointment.customerEmail || selectedAppointment.customerEmail === "walkin@salon.com") ? 0.7 : 1 }}
                  >
                    {generatingPdf ? "Sending..." : "Email Receipt"}
                  </button>
                </div>
                {(!selectedAppointment.customerEmail || selectedAppointment.customerEmail === "walkin@salon.com") && (
                  <p style={{ fontSize: 11, color: "#C62828", textAlign: "center", margin: "2px 0 0" }}>Customer has no email - use preview instead</p>
                )}
                <button
                  onClick={() => setShowReceiptEditor(false)}
                  style={{ padding: 12, border: `1px solid ${COLORS.divider}`, borderRadius: 6, background: COLORS.background, color: COLORS.textSecondary, fontSize: 14, cursor: "pointer" }}
                >Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
