"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";

type Service = { id: string; name: string; durationMinutes: number; price: number; category?: string | null };
type Staff = { id: string; name: string; role?: string | null };
type StaffAvailability = { available: boolean; reason?: string; startTime?: string; endTime?: string; isCustom?: boolean; note?: string };
type ReservedSlot = { startTime: string; endTime: string };
type PolicyItem = { icon: string; title: string; description: string };
type Step = 1 | 2 | 3 | 4 | 5;

function generateSessionId() {
  return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function BookingPage() {
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('booking_session_id');
      if (!id) { id = generateSessionId(); sessionStorage.setItem('booking_session_id', id); }
      return id;
    }
    return generateSessionId();
  });

  const [step, setStep] = useState<Step>(1);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyTitle, setPolicyTitle] = useState("Our Booking Policy");
  const [policyItems, setPolicyItems] = useState<PolicyItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [staffAvailability, setStaffAvailability] = useState<StaffAvailability | null>(null);
  const [allStaffAvailability, setAllStaffAvailability] = useState<Record<string, StaffAvailability>>({});
  const [reservedSlots, setReservedSlots] = useState<ReservedSlot[]>([]);
  const [bookedSlots, setBookedSlots] = useState<ReservedSlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [reservationExpiry, setReservationExpiry] = useState<Date | null>(null);
  const [reservationTimer, setReservationTimer] = useState(0);
  const [reserving, setReserving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAppointmentId, setSuccessAppointmentId] = useState<string | null>(null);

  const isAnyStaff = selectedStaffId === "any";
  const currentService = services.find((s) => s.id === selectedServiceId);
  const currentStaff = staff.find((s) => s.id === (assignedStaffId || selectedStaffId));

  useEffect(() => {
    async function loadData() {
      try {
        const [servicesRes, policyRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/booking-policy"),
        ]);
        setServices(await servicesRes.json());
        const policyData = await policyRes.json();
        setPolicyTitle(policyData.title || "Our Booking Policy");
        setPolicyItems(policyData.policies || []);
      } catch (err) { setError("Failed to load. Please refresh."); }
      finally { setLoading(false); }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedServiceId) return;
    async function loadStaff() {
      setLoadingStaff(true);
      try { const res = await fetch(`/api/staff?serviceId=${selectedServiceId}`); setStaff(await res.json()); }
      catch (err) { console.error(err); }
      finally { setLoadingStaff(false); }
    }
    loadStaff();
  }, [selectedServiceId]);

  useEffect(() => { setSelectedDate(new Date().toISOString().split("T")[0]); }, []);

  useEffect(() => {
    if (!selectedStaffId || !selectedDate) return;
    async function loadAvailability() {
      setLoadingAvailability(true);
      setSelectedTime(""); setAssignedStaffId(""); setReservationExpiry(null);
      try {
        if (selectedStaffId === "any") {
          const availabilityMap: Record<string, StaffAvailability> = {};
          await Promise.all(staff.map(async (s) => { const res = await fetch(`/api/staff-availability?staffId=${s.id}&date=${selectedDate}`); availabilityMap[s.id] = await res.json(); }));
          setAllStaffAvailability(availabilityMap);
          let allReserved: ReservedSlot[] = [], allBooked: ReservedSlot[] = [];
          await Promise.all(staff.map(async (s) => { const res = await fetch(`/api/slot-reservation?staffId=${s.id}&date=${selectedDate}&sessionId=${sessionId}`); const data = await res.json(); if (data.reservations) allReserved = [...allReserved, ...data.reservations]; if (data.appointments) allBooked = [...allBooked, ...data.appointments]; }));
          setReservedSlots(allReserved); setBookedSlots(allBooked);
        } else {
          const res = await fetch(`/api/staff-availability?staffId=${selectedStaffId}&date=${selectedDate}`);
          setStaffAvailability(await res.json());
          const resRes = await fetch(`/api/slot-reservation?staffId=${selectedStaffId}&date=${selectedDate}&sessionId=${sessionId}`);
          const resData = await resRes.json();
          setReservedSlots(resData.reservations || []); setBookedSlots(resData.appointments || []);
        }
      } catch (err) { console.error(err); }
      finally { setLoadingAvailability(false); }
    }
    loadAvailability();
  }, [selectedStaffId, selectedDate, staff, sessionId]);

  useEffect(() => {
    if (!reservationExpiry) { setReservationTimer(0); return; }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((reservationExpiry.getTime() - Date.now()) / 1000));
      setReservationTimer(remaining);
      if (remaining === 0) { setReservationExpiry(null); setSelectedTime(""); setError("Reservation expired. Please select a time again."); }
    }, 1000);
    return () => clearInterval(interval);
  }, [reservationExpiry]);

  useEffect(() => { return () => { if (sessionId) fetch(`/api/slot-reservation?sessionId=${sessionId}`, { method: 'DELETE' }).catch(() => {}); }; }, [sessionId]);

  const goNext = () => setStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev));
  const goBack = () => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  const handleContinueToDetails = () => { if (selectedTime) { setError(null); setShowPolicyModal(true); } else setError("Please select a time"); };
  const handleAcceptPolicy = () => { setShowPolicyModal(false); setStep(4); };

  const isSlotReserved = useCallback((time: string) => {
    const slotStart = new Date(`${selectedDate}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + (currentService?.durationMinutes || 60) * 60000);
    return reservedSlots.some(r => slotStart < new Date(r.endTime) && slotEnd > new Date(r.startTime));
  }, [selectedDate, currentService, reservedSlots]);

  const isSlotBooked = useCallback((time: string) => {
    const slotStart = new Date(`${selectedDate}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + (currentService?.durationMinutes || 60) * 60000);
    return bookedSlots.some(a => slotStart < new Date(a.endTime) && slotEnd > new Date(a.startTime));
  }, [selectedDate, currentService, bookedSlots]);

  const findAvailableStaff = (time: string): string | null => {
    for (const member of staff) {
      const availability = allStaffAvailability[member.id];
      if (!availability?.available) continue;
      const [timeH, timeM] = time.split(":").map(Number);
      const [startH, startM] = (availability.startTime || "09:00").split(":").map(Number);
      const [endH, endM] = (availability.endTime || "17:00").split(":").map(Number);
      if (timeH * 60 + timeM < startH * 60 + startM || timeH * 60 + timeM >= endH * 60 + endM) continue;
      if (!isSlotBooked(time) && !isSlotReserved(time)) return member.id;
    }
    return null;
  };

  const generateTimeSlots = () => {
    if (isAnyStaff) {
      let earliestStart = 24 * 60, latestEnd = 0, hasAvailable = false;
      for (const member of staff) {
        const availability = allStaffAvailability[member.id];
        if (!availability?.available) continue;
        hasAvailable = true;
        const [startH, startM] = (availability.startTime || "09:00").split(":").map(Number);
        const [endH, endM] = (availability.endTime || "17:00").split(":").map(Number);
        earliestStart = Math.min(earliestStart, startH * 60 + startM);
        latestEnd = Math.max(latestEnd, endH * 60 + endM);
      }
      if (!hasAvailable) return [];
      const slots: string[] = [];
      for (let m = earliestStart; m < latestEnd; m += 30) {
        const time = `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
        if (findAvailableStaff(time)) slots.push(time);
      }
      return slots;
    } else {
      if (!staffAvailability?.available) return [];
      const [startH, startM] = (staffAvailability.startTime || "09:00").split(":").map(Number);
      const [endH, endM] = (staffAvailability.endTime || "17:00").split(":").map(Number);
      const slots: string[] = [];
      for (let h = startH, m = startM; h < endH || (h === endH && m < endM); m += 30) {
        if (m >= 60) { m = 0; h++; }
        slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
      }
      return slots;
    }
  };

  const timeSlots = generateTimeSlots();
  const isStaffOnDayOff = !isAnyStaff && staffAvailability && !staffAvailability.available;
  const isTimeSlotPast = (time: string) => {
    const now = new Date(), today = now.toISOString().split("T")[0];
    if (selectedDate > today) return false;
    if (selectedDate < today) return true;
    const [h, m] = time.split(":").map(Number);
    const slot = new Date(); slot.setHours(h, m, 0, 0);
    return slot <= now;
  };

  const handleTimeSelect = async (time: string) => {
    const finalStaffId = isAnyStaff ? findAvailableStaff(time) : selectedStaffId;
    if (!finalStaffId) return;
    setReserving(true); setError(null);
    try {
      const start = new Date(`${selectedDate}T${time}:00`);
      const end = new Date(start.getTime() + (currentService?.durationMinutes || 60) * 60000);
      const res = await fetch("/api/slot-reservation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: finalStaffId, startTime: start.toISOString(), endTime: end.toISOString(), sessionId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to reserve"); return; }
      setSelectedTime(time);
      setAssignedStaffId(isAnyStaff ? finalStaffId : "");
      setReservationExpiry(new Date(data.expiresAt));
    } catch { setError("Failed to reserve slot."); }
    finally { setReserving(false); }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(null);
    const finalStaffId = isAnyStaff ? assignedStaffId : selectedStaffId;
    if (!selectedServiceId || !finalStaffId || !selectedDate || !selectedTime) { setError("Please complete all selections."); return; }
    if (!customerName || !customerPhone || !customerEmail) { setError("Please fill in your details."); return; }
    if (!reservationExpiry || reservationExpiry < new Date()) { setError("Reservation expired. Go back and select a time."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: selectedServiceId, staffId: finalStaffId, customerName, customerPhone, customerEmail, startTime: new Date(`${selectedDate}T${selectedTime}:00`).toISOString() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const apt = await res.json();
      await fetch(`/api/slot-reservation?sessionId=${sessionId}`, { method: 'DELETE' }).catch(() => {});
      setSuccessAppointmentId(apt.id); setStep(5);
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a", color: "#94a3b8" }}><p>Loading...</p></div>;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", fontFamily: "system-ui, sans-serif" }}>
      {showPolicyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{policyTitle}</h2>
              <button onClick={() => setShowPolicyModal(false)} style={{ width: 32, height: 32, border: "none", background: "#f3f4f6", borderRadius: 8, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: 24, overflowY: "auto", maxHeight: "60vh" }}>
              {policyItems.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                  <div style={{ width: 40, height: 40, background: "#f3f4f6", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{item.icon}</div>
                  <div><strong style={{ display: "block", marginBottom: 4 }}>{item.title}</strong><p style={{ color: "#6b7280", margin: 0, fontSize: 14, lineHeight: 1.5 }}>{item.description}</p></div>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <button onClick={handleAcceptPolicy} style={{ width: "100%", padding: 14, background: "#fff", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Okay</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", minHeight: "100vh" }}>
        <div style={{ width: 320, backgroundColor: "#1e293b", padding: 32, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18 }}>H</div>
            <span style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>Hera Booking</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {[{ n: 1, l: "Service" }, { n: 2, l: "Specialist" }, { n: 3, l: "Date & Time" }, { n: 4, l: "Your Info" }, { n: 5, l: "Confirmed" }].map((item) => (
              <div key={item.n} style={{ display: "flex", alignItems: "center", gap: 16, opacity: step >= item.n ? 1 : 0.4 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: step > item.n ? "#10b981" : step === item.n ? "#6366f1" : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 600 }}>{step > item.n ? "✓" : item.n}</div>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: step === item.n ? 600 : 400 }}>{item.l}</span>
              </div>
            ))}
          </div>
          {currentService && (
            <div style={{ marginTop: "auto", padding: 20, background: "rgba(255,255,255,0.05)", borderRadius: 12 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", marginBottom: 16 }}>Your Selection</div>
              <div style={{ color: "#fff", fontSize: 14, marginBottom: 12 }}>✨ {currentService.name}</div>
              {currentStaff && <div style={{ color: "#fff", fontSize: 14, marginBottom: 12 }}>👤 {currentStaff.name}</div>}
              {selectedDate && selectedTime && <div style={{ color: "#fff", fontSize: 14 }}>📅 {selectedDate} at {selectedTime}</div>}
              {reservationTimer > 0 && <div style={{ color: "#fbbf24", fontSize: 14, fontWeight: 600, marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>⏱️ Reserved for {formatTimer(reservationTimer)}</div>}
            </div>
          )}
        </div>

        <div style={{ flex: 1, marginLeft: 320, backgroundColor: "#fff", borderRadius: "24px 0 0 24px", padding: 48, minHeight: "100vh" }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {error && <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: 14, marginBottom: 24 }}>{error}</div>}

            {step === 1 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Select a Service</h1>
                <p style={{ color: "#64748b", marginBottom: 32 }}>Choose the treatment you'd like to book</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {services.map((s) => (
                    <div key={s.id} onClick={() => setSelectedServiceId(s.id)} style={{ padding: 20, borderRadius: 12, border: `2px solid ${selectedServiceId === s.id ? "#6366f1" : "#e2e8f0"}`, background: selectedServiceId === s.id ? "#f5f3ff" : "#fff", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{s.name}</h3>
                        {selectedServiceId === s.id && <span style={{ width: 24, height: 24, borderRadius: 6, background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>}
                      </div>
                      <div style={{ display: "flex", gap: 16 }}><span style={{ color: "#64748b" }}>{s.durationMinutes} min</span><span style={{ fontWeight: 700, color: "#059669" }}>£{s.price}</span></div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 32 }}><button onClick={() => selectedServiceId ? (setError(null), goNext()) : setError("Please select a service")} style={{ width: "100%", padding: 16, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Continue</button></div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Choose a Specialist</h1>
                <p style={{ color: "#64748b", marginBottom: 32 }}>Select your preferred technician</p>
                {loadingStaff ? <p>Loading...</p> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div onClick={() => { setSelectedStaffId("any"); setAssignedStaffId(""); setSelectedTime(""); }} style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, borderRadius: 12, border: `2px solid ${selectedStaffId === "any" ? "#6366f1" : "#e2e8f0"}`, background: selectedStaffId === "any" ? "#f5f3ff" : "#fff", cursor: "pointer" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⭐</div>
                      <div><div style={{ fontWeight: 600 }}>Any Available</div><div style={{ color: "#64748b", fontSize: 14 }}>First available specialist</div></div>
                      {selectedStaffId === "any" && <span style={{ marginLeft: "auto", width: 24, height: 24, borderRadius: 6, background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>}
                    </div>
                    {staff.map((m) => (
                      <div key={m.id} onClick={() => { setSelectedStaffId(m.id); setAssignedStaffId(""); setSelectedTime(""); }} style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, borderRadius: 12, border: `2px solid ${selectedStaffId === m.id ? "#6366f1" : "#e2e8f0"}`, background: selectedStaffId === m.id ? "#f5f3ff" : "#fff", cursor: "pointer" }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{m.name.charAt(0)}</div>
                        <div><div style={{ fontWeight: 600 }}>{m.name}</div><div style={{ color: "#64748b", fontSize: 14 }}>{m.role || "Nail Technician"}</div></div>
                        {selectedStaffId === m.id && <span style={{ marginLeft: "auto", width: 24, height: 24, borderRadius: 6, background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                  <button onClick={goBack} style={{ padding: 16, background: "#fff", color: "#475569", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 16, cursor: "pointer" }}>Back</button>
                  <button onClick={() => selectedStaffId ? (setError(null), goNext()) : setError("Please select a specialist")} style={{ flex: 1, padding: 16, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Continue</button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Pick Date & Time</h1>
                <p style={{ color: "#64748b", marginBottom: 32 }}>Choose when you'd like to visit</p>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Date</label>
                  <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); setReservationExpiry(null); }} min={new Date().toISOString().split("T")[0]} style={{ width: "100%", padding: 14, border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 16 }} />
                </div>
                {loadingAvailability ? <p>Checking availability...</p> : isStaffOnDayOff ? (
                  <div style={{ display: "flex", gap: 16, padding: 24, background: "#fef3c7", borderRadius: 12, marginBottom: 24 }}>
                    <span style={{ fontSize: 32 }}>��</span>
                    <div><strong style={{ color: "#92400e" }}>{currentStaff?.name} is not available</strong><p style={{ color: "#a16207", margin: "4px 0 0", fontSize: 14 }}>Please select another date or specialist.</p></div>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div style={{ padding: 24, background: "#fef2f2", borderRadius: 10, color: "#dc2626", textAlign: "center" }}>No available times. Please select another date.</div>
                ) : (
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Available Times</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                      {timeSlots.map((time) => {
                        const past = isTimeSlotPast(time), reserved = !isAnyStaff && isSlotReserved(time), booked = !isAnyStaff && isSlotBooked(time), unavailable = past || reserved || booked;
                        return <button key={time} disabled={unavailable || reserving} onClick={() => handleTimeSelect(time)} style={{ padding: 12, borderRadius: 8, border: `2px solid ${selectedTime === time ? "#6366f1" : "#e2e8f0"}`, background: selectedTime === time ? "#6366f1" : unavailable ? "#f1f5f9" : "#fff", color: selectedTime === time ? "#fff" : unavailable ? "#94a3b8" : "#1e293b", fontSize: 14, fontWeight: 600, cursor: unavailable ? "not-allowed" : "pointer" }}>{time}</button>;
                      })}
                    </div>
                    {reserving && <p style={{ color: "#6366f1", marginTop: 12 }}>Reserving...</p>}
                  </div>
                )}
                {isAnyStaff && assignedStaffId && selectedTime && <div style={{ padding: 16, background: "#ecfdf5", borderRadius: 10, color: "#059669", marginBottom: 24 }}>✓ {staff.find(s => s.id === assignedStaffId)?.name} will be your specialist</div>}
                {reservationTimer > 0 && <div style={{ padding: 16, background: "#fef3c7", borderRadius: 10, color: "#92400e", textAlign: "center", marginBottom: 24 }}>⏱️ Slot reserved for <strong>{formatTimer(reservationTimer)}</strong></div>}
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={goBack} style={{ padding: 16, background: "#fff", color: "#475569", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 16, cursor: "pointer" }}>Back</button>
                  <button onClick={handleContinueToDetails} style={{ flex: 1, padding: 16, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Continue</button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Your Details</h1>
                <p style={{ color: "#64748b", marginBottom: 32 }}>We'll send your confirmation here</p>
                {reservationTimer > 0 && <div style={{ padding: 16, background: "#fef3c7", borderRadius: 10, color: "#92400e", textAlign: "center", marginBottom: 24 }}>⏱️ Complete within <strong>{formatTimer(reservationTimer)}</strong></div>}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div><label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Full Name</label><input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter your name" required style={{ width: "100%", padding: 14, border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 16 }} /></div>
                  <div><label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Phone</label><input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07xxx xxxxxx" required style={{ width: "100%", padding: 14, border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 16 }} /></div>
                  <div><label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Email</label><input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="you@example.com" required style={{ width: "100%", padding: 14, border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 16 }} /></div>
                  <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                    <button type="button" onClick={goBack} style={{ padding: 16, background: "#fff", color: "#475569", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 16, cursor: "pointer" }}>Back</button>
                    <button type="submit" disabled={submitting || reservationTimer === 0} style={{ flex: 1, padding: 16, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: submitting || reservationTimer === 0 ? 0.5 : 1 }}>{submitting ? "Booking..." : "Confirm Booking"}</button>
                  </div>
                </form>
              </>
            )}

            {step === 5 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>✓</div>
                <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>You're all set!</h1>
                <p style={{ color: "#64748b", marginBottom: 32 }}>Your appointment has been confirmed</p>
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: 20, textAlign: "left", marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}><span style={{ color: "#64748b" }}>Service</span><span style={{ fontWeight: 600 }}>{currentService?.name}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}><span style={{ color: "#64748b" }}>Specialist</span><span style={{ fontWeight: 600 }}>{currentStaff?.name}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}><span style={{ color: "#64748b" }}>Date & Time</span><span style={{ fontWeight: 600 }}>{selectedDate} at {selectedTime}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}><span style={{ color: "#64748b" }}>Booking ID</span><span style={{ fontWeight: 600 }}>{successAppointmentId?.slice(0, 8).toUpperCase()}</span></div>
                </div>
                <p style={{ color: "#64748b", marginBottom: 24 }}>📧 Confirmation sent to {customerEmail}</p>
                <button onClick={() => { sessionStorage.setItem('booking_session_id', generateSessionId()); window.location.reload(); }} style={{ padding: "16px 24px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Book Another</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
