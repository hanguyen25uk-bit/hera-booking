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
type ReceiptItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
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
  const [isMobile, setIsMobile] = useState(false);
  const [mobileFilterStaff, setMobileFilterStaff] = useState<string>("all");
  
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
  const [showReceipt, setShowReceipt] = useState(false);
  const [salonInfo, setSalonInfo] = useState<{ name: string; address?: string; phone?: string } | null>(null);
  const [sendingReceipt, setSendingReceipt] = useState(false);

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

  async function loadSalonInfo() {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSalonInfo({ name: data.name || "Salon", address: data.address, phone: data.phone });
      }
    } catch (err) { console.error(err); }
  }

  useEffect(function() { loadSalonInfo(); }, []);

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

  function printReceipt() {
    if (!selectedAppointment) return;

    const receiptNumber = generateReceiptNumber(selectedAppointment.id);
    const printDate = new Date().toLocaleString("en-GB");
    const appointmentDate = new Date(selectedAppointment.startTime).toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
    const appointmentTime = new Date(selectedAppointment.startTime).toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit"
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receiptNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
          .receipt { border: 1px dashed #000; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px dashed #000; }
          .salon-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
          .salon-info { font-size: 11px; color: #333; }
          .receipt-title { font-size: 16px; font-weight: bold; margin: 15px 0 10px; text-align: center; }
          .receipt-number { font-size: 12px; text-align: center; margin-bottom: 15px; }
          .section { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #ccc; }
          .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
          .label { color: #666; }
          .value { font-weight: bold; text-align: right; }
          .service-name { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
          .total-section { margin-top: 15px; padding-top: 15px; border-top: 2px solid #000; }
          .total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
          .thank-you { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
          @media print {
            body { padding: 0; }
            .receipt { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="salon-name">${salonInfo?.name || "Salon"}</div>
            ${salonInfo?.address ? `<div class="salon-info">${salonInfo.address}</div>` : ""}
            ${salonInfo?.phone ? `<div class="salon-info">Tel: ${salonInfo.phone}</div>` : ""}
          </div>

          <div class="receipt-title">RECEIPT</div>
          <div class="receipt-number">${receiptNumber}</div>

          <div class="section">
            <div class="row">
              <span class="label">Date:</span>
              <span class="value">${appointmentDate}</span>
            </div>
            <div class="row">
              <span class="label">Time:</span>
              <span class="value">${appointmentTime}</span>
            </div>
            <div class="row">
              <span class="label">Staff:</span>
              <span class="value">${selectedAppointment.staff.name}</span>
            </div>
          </div>

          <div class="section">
            <div class="row">
              <span class="label">Customer:</span>
              <span class="value">${selectedAppointment.customerName}</span>
            </div>
          </div>

          <div class="section">
            <div class="service-name">${selectedAppointment.service.name}</div>
            <div class="row">
              <span class="label">Duration:</span>
              <span class="value">${selectedAppointment.service.durationMinutes} mins</span>
            </div>
            <div class="row">
              <span class="label">Price:</span>
              <span class="value">£${selectedAppointment.service.price.toFixed(2)}</span>
            </div>
          </div>

          <div class="total-section">
            <div class="total-row">
              <span>TOTAL</span>
              <span>£${selectedAppointment.service.price.toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <div class="thank-you">Thank you for your visit!</div>
            <div>Printed: ${printDate}</div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  async function sendReceiptEmail() {
    if (!selectedAppointment) return;

    // Check if customer has a valid email
    if (!selectedAppointment.customerEmail || selectedAppointment.customerEmail === "walkin@salon.com") {
      setMessage({ type: "error", text: "Customer does not have a valid email address" });
      return;
    }

    setSendingReceipt(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}/receipt`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send receipt");
      }

      setMessage({ type: "success", text: `Receipt sent to ${selectedAppointment.customerEmail}` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSendingReceipt(false);
    }
  }

  // Receipt Editor Functions
  function openReceiptEditor() {
    if (!selectedAppointment) return;
    // Initialize with the main service
    setReceiptItems([{
      id: "main-service",
      name: selectedAppointment.service.name,
      price: selectedAppointment.service.price,
      quantity: 1,
    }]);
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
      const doc = new jsPDF({ unit: "mm", format: [80, 200] }); // Receipt size

      const receiptNumber = generateReceiptNumber(selectedAppointment.id);
      const appointmentDate = new Date(selectedAppointment.startTime);
      let y = 10;

      // Header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(salonInfo?.name || "Salon", 40, y, { align: "center" });
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

      // Divider
      y += 3;
      doc.setLineWidth(0.1);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, y, 75, y);
      y += 6;

      // Receipt title
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RECEIPT", 40, y, { align: "center" });
      y += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(receiptNumber, 40, y, { align: "center" });
      y += 6;

      // Date & Customer
      doc.setFontSize(8);
      doc.text(`Date: ${appointmentDate.toLocaleDateString("en-GB")}`, 5, y);
      y += 4;
      doc.text(`Time: ${appointmentDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`, 5, y);
      y += 4;
      doc.text(`Customer: ${selectedAppointment.customerName}`, 5, y);
      y += 4;
      doc.text(`Staff: ${selectedAppointment.staff.name}`, 5, y);
      y += 6;

      // Divider
      doc.line(5, y, 75, y);
      y += 4;

      // Items
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

      // Total
      y += 2;
      doc.line(5, y, 75, y);
      y += 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", 5, y);
      doc.text(`£${calculateTotal().toFixed(2)}`, 75, y, { align: "right" });
      y += 8;

      // Footer
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Thank you for your visit!", 40, y, { align: "center" });
      y += 5;
      doc.setFontSize(7);
      doc.text(`Printed: ${new Date().toLocaleString("en-GB")}`, 40, y, { align: "center" });

      // Open in new window for preview
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
      // Generate PDF first
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: [80, 200] });

      const receiptNumber = generateReceiptNumber(selectedAppointment.id);
      const appointmentDate = new Date(selectedAppointment.startTime);
      let y = 10;

      // Header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(salonInfo?.name || "Salon", 40, y, { align: "center" });
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

      // Divider
      y += 3;
      doc.setLineWidth(0.1);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, y, 75, y);
      y += 6;

      // Receipt title
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RECEIPT", 40, y, { align: "center" });
      y += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(receiptNumber, 40, y, { align: "center" });
      y += 6;

      // Date & Customer
      doc.setFontSize(8);
      doc.text(`Date: ${appointmentDate.toLocaleDateString("en-GB")}`, 5, y);
      y += 4;
      doc.text(`Time: ${appointmentDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`, 5, y);
      y += 4;
      doc.text(`Customer: ${selectedAppointment.customerName}`, 5, y);
      y += 4;
      doc.text(`Staff: ${selectedAppointment.staff.name}`, 5, y);
      y += 6;

      // Divider
      doc.line(5, y, 75, y);
      y += 4;

      // Items
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

      // Total
      y += 2;
      doc.line(5, y, 75, y);
      y += 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", 5, y);
      doc.text(`£${calculateTotal().toFixed(2)}`, 75, y, { align: "right" });
      y += 8;

      // Footer
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Thank you for your visit!", 40, y, { align: "center" });
      y += 5;
      doc.setFontSize(7);
      doc.text(`Printed: ${new Date().toLocaleString("en-GB")}`, 40, y, { align: "center" });

      // Get PDF as base64
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      // Send to API
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

  function getAppointmentStyle(apt: Appointment, cellHeight: number = 80) {
    const start = new Date(apt.startTime);
    const end = new Date(apt.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const top = (startHour - 8) * cellHeight;
    const height = Math.max(duration * cellHeight, cellHeight / 2);

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

  // Filter appointments for mobile view
  const mobileFilteredAppointments = mobileFilterStaff === "all"
    ? activeAppointments
    : activeAppointments.filter(a => a.staff.id === mobileFilterStaff);

  // Sort appointments by time for mobile list view
  const sortedMobileAppointments = [...mobileFilteredAppointments].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#F5F7FA", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Header - Responsive */}
      <div style={{ padding: isMobile ? "16px" : "20px 32px", backgroundColor: "#FFFFFF", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h1 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 600, color: "#111827", margin: 0 }}>
            {formatDateDisplay(selectedDate)}
          </h1>
          <button
            onClick={() => openAddModal()}
            style={{
              padding: isMobile ? "8px 12px" : "10px 20px",
              backgroundColor: "#10B981",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              fontSize: isMobile ? 13 : 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + {isMobile ? "Add" : "Add Booking"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16, flexWrap: "wrap" }}>
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

          {!isMobile && (
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
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <div style={{
            padding: "6px 12px",
            backgroundColor: "#ECFDF5",
            borderRadius: 20,
            border: "1px solid #A7F3D0",
          }}>
            <span style={{ color: "#059669", fontWeight: 600, fontSize: 13 }}>Confirmed: {confirmedCount}</span>
          </div>
          <div style={{
            padding: "6px 12px",
            backgroundColor: "#F3F4F6",
            borderRadius: 20,
          }}>
            <span style={{ color: "#6B7280", fontWeight: 500, fontSize: 13 }}>Total: {totalCount}</span>
          </div>
        </div>

        {/* Mobile scroll hint */}
        {isMobile && staffList.length > 3 && (
          <div style={{
            marginTop: 8,
            fontSize: 11,
            color: "#9CA3AF",
            textAlign: "center",
          }}>
            Swipe left/right to see all {staffList.length} staff
          </div>
        )}
      </div>

      {/* Calendar Grid - Responsive */}
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "8px" : "0 24px 24px", WebkitOverflowScrolling: "touch" }}>
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: isMobile ? 12 : 16,
          border: "1px solid #E5E7EB",
          marginTop: isMobile ? 8 : 24,
          minWidth: isMobile ? `${50 + visibleStaffList.length * 100}px` : "auto",
        }}>
          {/* Sticky Header Row - Time + Staff Names */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? `50px repeat(${visibleStaffList.length}, 100px)`
              : `80px repeat(${visibleStaffList.length}, minmax(180px, 1fr))`,
            position: "sticky",
            top: 0,
            backgroundColor: "#FFFFFF",
            zIndex: 30,
            borderBottom: "2px solid #E5E7EB",
          }}>
            {/* Time Header */}
            <div style={{
              padding: isMobile ? "8px 4px" : "16px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9CA3AF",
              fontSize: isMobile ? 10 : 12,
              fontWeight: 500,
              position: "sticky",
              left: 0,
              backgroundColor: "#FFFFFF",
              zIndex: 40,
            }}>
              Time
            </div>
            {/* Staff Headers */}
            {visibleStaffList.map((staff, idx) => {
              const avail = staffAvailability[staff.id];
              const isOff = avail && !avail.available;
              const bgColor = staffColors[idx % staffColors.length];

              return (
                <div key={staff.id} style={{
                  padding: isMobile ? "8px 4px" : "16px",
                  borderLeft: "1px solid #E5E7EB",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: isMobile ? 4 : 8,
                  backgroundColor: "#FFFFFF",
                }}>
                  <div style={{
                    width: isMobile ? 32 : 48,
                    height: isMobile ? 32 : 48,
                    borderRadius: "50%",
                    backgroundColor: bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: isMobile ? 12 : 18,
                    textTransform: "uppercase",
                  }}>
                    {staff.name.charAt(0)}
                  </div>
                  <span style={{
                    fontSize: isMobile ? 11 : 14,
                    fontWeight: 700,
                    color: isOff ? "#EF4444" : "#111827",
                    textAlign: "center",
                    lineHeight: 1.2,
                    maxWidth: isMobile ? 90 : "auto",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: isMobile ? "nowrap" : "normal",
                  }}>
                    {staff.name}
                  </span>
                  {!isMobile && (
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>
                      {staff.role || "Nail Technician"}
                    </span>
                  )}
                  {isOff && (
                    <span style={{
                      padding: isMobile ? "2px 6px" : "4px 12px",
                      backgroundColor: "#FEE2E2",
                      color: "#DC2626",
                      fontSize: isMobile ? 8 : 11,
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
          </div>

          {/* Time Grid Body */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? `50px repeat(${visibleStaffList.length}, 100px)`
              : `80px repeat(${visibleStaffList.length}, minmax(180px, 1fr))`,
          }}>

          {/* Time Rows */}
          {hours.map(hour => (
            <>
              {/* Time Label */}
              <div key={`time-${hour}`} style={{
                padding: isMobile ? "4px" : "8px 12px",
                borderBottom: "2px solid #D1D5DB",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: isMobile ? "center" : "flex-end",
                color: "#374151",
                fontSize: isMobile ? 10 : 13,
                fontWeight: 600,
                height: isMobile ? 60 : 80,
                boxSizing: "border-box",
                position: "sticky",
                left: 0,
                backgroundColor: "#F9FAFB",
                zIndex: 10,
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
                      height: isMobile ? 60 : 80,
                      borderBottom: "2px solid #D1D5DB",
                      borderLeft: "1px solid #E5E7EB",
                      backgroundColor: isOff ? "#FECACA" : inWorkingHours ? "#ECFDF5" : "#F3F4F6",
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
                              borderBottom: minute < 45 ? "1px dashed #A7F3D0" : "none",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.15)"; }}
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
                      const cellHeight = isMobile ? 60 : 80;
                      const style = getAppointmentStyle(apt, cellHeight);
                      return (
                        <div
                          key={apt.id}
                          onClick={() => openAppointment(apt)}
                          style={{
                            position: "absolute",
                            top: style.top,
                            left: isMobile ? 2 : 4,
                            right: isMobile ? 2 : 4,
                            height: style.height - 4,
                            backgroundColor: style.bgColor,
                            borderRadius: isMobile ? 4 : 8,
                            padding: isMobile ? "4px 6px" : "8px 12px",
                            cursor: "pointer",
                            overflow: "hidden",
                            zIndex: 10,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          }}
                        >
                          <div style={{
                            fontSize: isMobile ? 9 : 13,
                            fontWeight: 600,
                            color: style.textColor,
                            marginBottom: isMobile ? 1 : 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {apt.customerName}
                          </div>
                          {!isMobile && (
                            <div style={{ fontSize: 12, color: style.textColor, opacity: 0.9 }}>
                              {apt.service.name}
                            </div>
                          )}
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

                      <button
                        onClick={openReceiptEditor}
                        style={{ padding: 14, border: "none", borderRadius: 8, background: "#6366F1", color: "#FFFFFF", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                      >
                        <span>🧾</span> Create Receipt
                      </button>
                      <button onClick={closeModal} style={{ padding: 14, border: "1px solid #E5E7EB", borderRadius: 8, background: "#FFFFFF", color: "#6B7280", fontSize: 15, cursor: "pointer" }}>Close</button>
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

      {/* Receipt Editor Modal */}
      {showReceiptEditor && selectedAppointment && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 20 }}>
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#FFFFFF" }}>Create Receipt</h2>
              <button onClick={() => setShowReceiptEditor(false)} style={{ width: 32, height: 32, border: "none", background: "rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer", fontSize: 18, color: "#FFFFFF" }}>×</button>
            </div>

            <div style={{ padding: 24 }}>
              {/* Customer Info */}
              <div style={{ marginBottom: 20, padding: 16, background: "#F8FAFC", borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>Customer</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#1E293B" }}>{selectedAppointment.customerName}</div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                  {new Date(selectedAppointment.startTime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  {" - "}
                  {selectedAppointment.staff.name}
                </div>
              </div>

              {/* Items List */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Items</div>
                {receiptItems.map((item, index) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: index < receiptItems.length - 1 ? "1px solid #E5E7EB" : "none" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{item.name}</div>
                      <div style={{ fontSize: 13, color: "#64748B" }}>£{item.price.toFixed(2)} each</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        style={{ width: 28, height: 28, border: "1px solid #E5E7EB", borderRadius: 6, background: "#FFFFFF", cursor: item.quantity > 1 ? "pointer" : "not-allowed", fontSize: 16, color: item.quantity > 1 ? "#374151" : "#D1D5DB" }}
                      >-</button>
                      <span style={{ width: 24, textAlign: "center", fontSize: 14, fontWeight: 600 }}>{item.quantity}</span>
                      <button
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                        style={{ width: 28, height: 28, border: "1px solid #E5E7EB", borderRadius: 6, background: "#FFFFFF", cursor: "pointer", fontSize: 16, color: "#374151" }}
                      >+</button>
                    </div>
                    <div style={{ width: 70, textAlign: "right", fontSize: 14, fontWeight: 600, color: "#1E293B" }}>
                      £{(item.price * item.quantity).toFixed(2)}
                    </div>
                    {item.id !== "main-service" && (
                      <button
                        onClick={() => removeReceiptItem(item.id)}
                        style={{ width: 28, height: 28, border: "none", borderRadius: 6, background: "#FEE2E2", cursor: "pointer", fontSize: 14, color: "#DC2626" }}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Item Form */}
              <div style={{ marginBottom: 20, padding: 16, background: "#F0FDF4", borderRadius: 12, border: "1px dashed #10B981" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#059669", marginBottom: 12 }}>+ Add Extra Item</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Item name (e.g., Nail Art)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    style={{ flex: 1, padding: 10, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    style={{ width: 80, padding: 10, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={addReceiptItem}
                    disabled={!newItemName.trim() || !newItemPrice}
                    style={{ padding: "10px 16px", border: "none", borderRadius: 8, background: newItemName.trim() && newItemPrice ? "#10B981" : "#E5E7EB", color: newItemName.trim() && newItemPrice ? "#FFFFFF" : "#9CA3AF", fontWeight: 600, cursor: newItemName.trim() && newItemPrice ? "pointer" : "not-allowed" }}
                  >Add</button>
                </div>
              </div>

              {/* Total */}
              <div style={{ padding: 16, background: "linear-gradient(135deg, #1E293B, #334155)", borderRadius: 12, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>Total Amount</span>
                  <span style={{ color: "#FFFFFF", fontSize: 28, fontWeight: 700 }}>£{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={previewReceiptPdf}
                    disabled={generatingPdf}
                    style={{ flex: 1, padding: 14, border: "none", borderRadius: 8, background: "#6366F1", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: generatingPdf ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: generatingPdf ? 0.7 : 1 }}
                  >
                    <span>👁</span> {generatingPdf ? "Loading..." : "Preview Receipt"}
                  </button>
                  <button
                    onClick={sendReceiptPdfEmail}
                    disabled={generatingPdf || !selectedAppointment.customerEmail || selectedAppointment.customerEmail === "walkin@salon.com"}
                    style={{ flex: 1, padding: 14, border: "none", borderRadius: 8, background: "#10B981", color: "#FFFFFF", fontSize: 14, fontWeight: 600, cursor: (generatingPdf || !selectedAppointment.customerEmail || selectedAppointment.customerEmail === "walkin@salon.com") ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: (generatingPdf || !selectedAppointment.customerEmail || selectedAppointment.customerEmail === "walkin@salon.com") ? 0.7 : 1 }}
                  >
                    <span>📧</span> {generatingPdf ? "Sending..." : "Email to Customer"}
                  </button>
                </div>
                {(!selectedAppointment.customerEmail || selectedAppointment.customerEmail === "walkin@salon.com") && (
                  <p style={{ fontSize: 12, color: "#DC2626", textAlign: "center", margin: "4px 0 0" }}>Customer has no email - download PDF instead</p>
                )}
                <button
                  onClick={() => setShowReceiptEditor(false)}
                  style={{ padding: 14, border: "1px solid #E5E7EB", borderRadius: 8, background: "#FFFFFF", color: "#6B7280", fontSize: 15, cursor: "pointer" }}
                >Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
