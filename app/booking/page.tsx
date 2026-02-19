"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";

type ServiceCategory = { id: string; name: string; description: string | null };
type Service = { id: string; name: string; description: string | null; durationMinutes: number; price: number; category?: string | null; categoryId?: string | null; serviceCategory?: ServiceCategory | null };
type Staff = { id: string; name: string; role?: string | null };
type StaffAvailability = { available: boolean; reason?: string; startTime?: string; endTime?: string; isCustom?: boolean; note?: string };
type ReservedSlot = { startTime: string; endTime: string };
type PolicyItem = { icon: string; title: string; description: string };
type Step = 1 | 2 | 3 | 4 | 5;

function generateSessionId() {
  return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function BookingPage() {
  const router = useRouter();
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('booking_session_id');
      if (!id) { id = generateSessionId(); sessionStorage.setItem('booking_session_id', id); }
      return id;
    }
    return generateSessionId();
  });

  const [step, setStep] = useState<Step>(1);
  const [policyTitle, setPolicyTitle] = useState("Our Booking Policy");
  const [policyDescription, setPolicyDescription] = useState("");
  const [policyItems, setPolicyItems] = useState<PolicyItem[]>([]);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [salonName, setSalonName] = useState("Hera Nail Spa");

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
        // First check settings for salon slug and redirect to tenant-specific booking page
        const settingsRes = await fetch("/api/settings");
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData.salonSlug) {
            // Redirect to proper tenant booking page
            router.replace(`/${settingsData.salonSlug}/booking`);
            return;
          }
          if (settingsData.salonName) setSalonName(settingsData.salonName);
        }

        // Only load data if no redirect (fallback for when no slug is configured)
        const [servicesRes, categoriesRes, policyRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/categories"),
          fetch("/api/booking-policy"),
        ]);
        setServices(await servicesRes.json());
        setCategories(await categoriesRes.json());
        const policyData = await policyRes.json();
        setPolicyTitle(policyData.title || "Our Booking Policy");
        setPolicyDescription(policyData.description || "");
        setPolicyItems(policyData.policies || []);
      } catch (err) { setError("Failed to load. Please refresh."); }
      finally { setLoading(false); }
    }
    loadData();
  }, [router]);

  useEffect(() => {
    if (!selectedServiceId) return;
    async function loadStaff() {
      setLoadingStaff(true);
      try { const res = await fetch(`/api/staff?serviceId=${selectedServiceId}`); setStaff(await res.json()); }
      catch (err) { console.error(err); setError("Failed to load staff. Please try again."); }
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
      } catch (err) { console.error(err); setError("Failed to load availability. Please try again."); }
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

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setError(null);
    goNext();
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

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Group services by category
  const servicesByCategory: Record<string, Service[]> = {};
  const uncategorizedServices: Service[] = [];
  
  services.forEach(service => {
    if (service.categoryId) {
      if (!servicesByCategory[service.categoryId]) {
        servicesByCategory[service.categoryId] = [];
      }
      servicesByCategory[service.categoryId].push(service);
    } else {
      uncategorizedServices.push(service);
    }
  });

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FAFAFA" }}>
        <p style={{ color: "#666" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAFAFA", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header style={{
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E8E8E8",
        padding: "16px 24px",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #D4B896 0%, #C4A77D 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 18,
          }}>
            {salonName.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            {step === 1 && (
              <div style={{ display: "flex", gap: 24 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", borderBottom: "2px solid #1A1A1A", paddingBottom: 4 }}>Services</span>
                <span style={{ fontSize: 15, color: "#999", paddingBottom: 4 }}>Reviews</span>
              </div>
            )}
            {step > 1 && step < 5 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <span style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A" }}>
                  {step === 2 && "Choose Specialist"}
                  {step === 3 && "Pick Date & Time"}
                  {step === 4 && "Your Details"}
                </span>
              </div>
            )}
          </div>
          {step > 1 && step < 5 && reservationTimer > 0 && (
            <div style={{
              backgroundColor: "#FFF8E1",
              color: "#F57C00",
              padding: "6px 12px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
            }}>
              {formatTimer(reservationTimer)}
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        {error && (
          <div style={{
            padding: 16,
            backgroundColor: "#FFEBEE",
            borderRadius: 12,
            color: "#C62828",
            fontSize: 14,
            marginBottom: 24,
          }}>
            {error}
          </div>
        )}

        {/* Step 1: Service Selection */}
        {step === 1 && (
          <>
            {/* Booking Policy Card */}
            {policyItems.length > 0 && (
              <div style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 24,
                marginBottom: 32,
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>{policyTitle}</h3>
                <p style={{ margin: "0 0 16px", fontSize: 14, color: "#666", lineHeight: 1.6 }}>
                  {policyDescription || policyItems.map(p => p.description).join(' ')}
                </p>
                <button
                  onClick={() => {}}
                  style={{
                    display: "block",
                    marginLeft: "auto",
                    padding: "10px 24px",
                    border: "1px solid #1A1A1A",
                    borderRadius: 25,
                    backgroundColor: "#FFFFFF",
                    color: "#1A1A1A",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Okay
                </button>
              </div>
            )}

            {/* Services Section */}
            <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 600, color: "#1A1A1A" }}>Services</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {categories.map(category => {
                const categoryServices = servicesByCategory[category.id] || [];
                if (categoryServices.length === 0) return null;
                const isExpanded = expandedCategories.has(category.id);

                return (
                  <div key={category.id} style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid #E8E8E8",
                  }}>
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.id)}
                      style={{
                        width: "100%",
                        padding: "18px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "#FFFFFF",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 15,
                        fontWeight: 500,
                        color: "#1A1A1A",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      <span>{category.name}</span>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#999"
                        strokeWidth="2"
                        style={{
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                        }}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {/* Services List */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid #E8E8E8" }}>
                        {categoryServices.map((service, idx) => (
                          <div
                            key={service.id}
                            onClick={() => handleServiceSelect(service.id)}
                            style={{
                              padding: "16px 20px",
                              borderBottom: idx < categoryServices.length - 1 ? "1px solid #F0F0F0" : "none",
                              cursor: "pointer",
                              transition: "background-color 0.15s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#FAFAFA"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#FFFFFF"; }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A", marginBottom: 4 }}>{service.name}</div>
                                {service.description && (
                                  <div style={{ fontSize: 13, color: "#666", marginBottom: 4, lineHeight: 1.4 }}>{service.description}</div>
                                )}
                                <div style={{ fontSize: 13, color: "#999" }}>{service.durationMinutes}min</div>
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>£{service.price}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Uncategorized Services */}
              {uncategorizedServices.length > 0 && (
                <div style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid #E8E8E8",
                }}>
                  <button
                    onClick={() => toggleCategory("uncategorized")}
                    style={{
                      width: "100%",
                      padding: "18px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: "#FFFFFF",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: 500,
                      color: "#1A1A1A",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    <span>OTHER SERVICES</span>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#999"
                      strokeWidth="2"
                      style={{
                        transform: expandedCategories.has("uncategorized") ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {expandedCategories.has("uncategorized") && (
                    <div style={{ borderTop: "1px solid #E8E8E8" }}>
                      {uncategorizedServices.map((service, idx) => (
                        <div
                          key={service.id}
                          onClick={() => handleServiceSelect(service.id)}
                          style={{
                            padding: "16px 20px",
                            borderBottom: idx < uncategorizedServices.length - 1 ? "1px solid #F0F0F0" : "none",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#FAFAFA"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#FFFFFF"; }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A", marginBottom: 4 }}>{service.name}</div>
                              <div style={{ fontSize: 13, color: "#999" }}>{service.durationMinutes}min</div>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>£{service.price}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Good to know Section */}
            <div style={{ marginTop: 40 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>Good to know</h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  border: "1px solid #E8E8E8",
                  cursor: "pointer",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style={{ fontSize: 14, color: "#1A1A1A", textDecoration: "underline" }}>Booking policy</span>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Staff Selection */}
        {step === 2 && (
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600, color: "#1A1A1A" }}>Choose a Specialist</h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#666" }}>Select your preferred technician</p>
            
            {loadingStaff ? <p style={{ color: "#666" }}>Loading...</p> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Any Available Option */}
                <div
                  onClick={() => { setSelectedStaffId("any"); setAssignedStaffId(""); setSelectedTime(""); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: 16,
                    borderRadius: 12,
                    border: `2px solid ${selectedStaffId === "any" ? "#1A1A1A" : "#E8E8E8"}`,
                    backgroundColor: selectedStaffId === "any" ? "#F5F5F5" : "#FFFFFF",
                    cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    backgroundColor: "#E8E8E8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>Any Available</div>
                    <div style={{ fontSize: 13, color: "#666" }}>First available specialist</div>
                  </div>
                  {selectedStaffId === "any" && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#1A1A1A" stroke="#FFFFFF" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="8 12 11 15 16 9"/>
                    </svg>
                  )}
                </div>

                {/* Individual Staff */}
                {staff.map(m => (
                  <div
                    key={m.id}
                    onClick={() => { setSelectedStaffId(m.id); setAssignedStaffId(""); setSelectedTime(""); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: 16,
                      borderRadius: 12,
                      border: `2px solid ${selectedStaffId === m.id ? "#1A1A1A" : "#E8E8E8"}`,
                      backgroundColor: selectedStaffId === m.id ? "#F5F5F5" : "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #D4B896 0%, #C4A77D 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FFFFFF",
                      fontWeight: 600,
                      fontSize: 18,
                    }}>
                      {m.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A" }}>{m.name}</div>
                      <div style={{ fontSize: 13, color: "#666" }}>{m.role || "Nail Technician"}</div>
                    </div>
                    {selectedStaffId === m.id && (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#1A1A1A" stroke="#FFFFFF" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="8 12 11 15 16 9"/>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => selectedStaffId ? (setError(null), goNext()) : setError("Please select a specialist")}
              style={{
                width: "100%",
                marginTop: 24,
                padding: 16,
                border: "none",
                borderRadius: 25,
                backgroundColor: "#1A1A1A",
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600, color: "#1A1A1A" }}>Pick Date & Time</h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#666" }}>Choose when you'd like to visit</p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); setReservationExpiry(null); }}
                min={new Date().toISOString().split("T")[0]}
                style={{
                  width: "100%",
                  padding: 14,
                  border: "1px solid #E8E8E8",
                  borderRadius: 12,
                  fontSize: 16,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {loadingAvailability ? (
              <p style={{ color: "#666" }}>Checking availability...</p>
            ) : isStaffOnDayOff ? (
              <div style={{ padding: 20, backgroundColor: "#FFF8E1", borderRadius: 12, marginBottom: 20 }}>
                <strong style={{ color: "#F57C00" }}>{currentStaff?.name} is not available on this date</strong>
                <p style={{ color: "#F57C00", margin: "8px 0 0", fontSize: 14 }}>Please select another date.</p>
              </div>
            ) : timeSlots.length === 0 ? (
              <div style={{ padding: 20, backgroundColor: "#FFEBEE", borderRadius: 12, color: "#C62828", textAlign: "center", marginBottom: 20 }}>
                No available times. Please select another date.
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 12, color: "#1A1A1A" }}>Available Times</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {timeSlots.map(time => {
                    const past = isTimeSlotPast(time);
                    const reserved = !isAnyStaff && isSlotReserved(time);
                    const booked = !isAnyStaff && isSlotBooked(time);
                    const unavailable = past || reserved || booked;
                    return (
                      <button
                        key={time}
                        disabled={unavailable || reserving}
                        onClick={() => handleTimeSelect(time)}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          border: selectedTime === time ? "2px solid #1A1A1A" : "1px solid #E8E8E8",
                          backgroundColor: selectedTime === time ? "#1A1A1A" : unavailable ? "#F5F5F5" : "#FFFFFF",
                          color: selectedTime === time ? "#FFFFFF" : unavailable ? "#999" : "#1A1A1A",
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: unavailable ? "not-allowed" : "pointer",
                        }}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
                {reserving && <p style={{ color: "#D4B896", marginTop: 12, fontSize: 14 }}>Reserving...</p>}
              </div>
            )}

            {isAnyStaff && assignedStaffId && selectedTime && (
              <div style={{ padding: 14, backgroundColor: "#E8F5E9", borderRadius: 12, color: "#2E7D32", marginBottom: 20, fontSize: 14 }}>
                ✓ {staff.find(s => s.id === assignedStaffId)?.name} will be your specialist
              </div>
            )}

            {reservationTimer > 0 && (
              <div style={{ padding: 14, backgroundColor: "#FFF8E1", borderRadius: 12, color: "#F57C00", textAlign: "center", marginBottom: 20, fontSize: 14 }}>
                Slot reserved for <strong>{formatTimer(reservationTimer)}</strong>
              </div>
            )}

            {/* Policy Agreement */}
            <div style={{ padding: 16, backgroundColor: "#F5F5F5", borderRadius: 12, marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={policyAgreed}
                  onChange={(e) => setPolicyAgreed(e.target.checked)}
                  style={{ width: 20, height: 20, marginTop: 2, accentColor: "#1A1A1A" }}
                />
                <span style={{ fontSize: 13, color: "#1A1A1A", lineHeight: 1.5 }}>
                  I have read and agree to the <strong>Booking Policy</strong>. I understand the payment terms and cancellation policy.
                </span>
              </label>
            </div>

            <button
              onClick={() => {
                if (!selectedTime) { setError("Please select a time"); return; }
                if (!policyAgreed) { setError("Please agree to the booking policy"); return; }
                setError(null);
                goNext();
              }}
              disabled={!selectedTime || !policyAgreed}
              style={{
                width: "100%",
                padding: 16,
                border: "none",
                borderRadius: 25,
                backgroundColor: selectedTime && policyAgreed ? "#1A1A1A" : "#E8E8E8",
                color: selectedTime && policyAgreed ? "#FFFFFF" : "#999",
                fontSize: 16,
                fontWeight: 600,
                cursor: selectedTime && policyAgreed ? "pointer" : "not-allowed",
              }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 4: Customer Details */}
        {step === 4 && (
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600, color: "#1A1A1A" }}>Your Details</h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#666" }}>We'll send your confirmation here</p>

            {reservationTimer > 0 && (
              <div style={{ padding: 14, backgroundColor: "#FFF8E1", borderRadius: 12, color: "#F57C00", textAlign: "center", marginBottom: 20, fontSize: 14 }}>
                Complete within <strong>{formatTimer(reservationTimer)}</strong>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Full Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  style={{
                    width: "100%",
                    padding: 14,
                    border: "1px solid #E8E8E8",
                    borderRadius: 12,
                    fontSize: 16,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="07xxx xxxxxx"
                  required
                  style={{
                    width: "100%",
                    padding: 14,
                    border: "1px solid #E8E8E8",
                    borderRadius: 12,
                    fontSize: 16,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#1A1A1A" }}>Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: "100%",
                    padding: 14,
                    border: "1px solid #E8E8E8",
                    borderRadius: 12,
                    fontSize: 16,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || reservationTimer === 0}
                style={{
                  width: "100%",
                  padding: 16,
                  border: "none",
                  borderRadius: 25,
                  backgroundColor: submitting || reservationTimer === 0 ? "#E8E8E8" : "#1A1A1A",
                  color: submitting || reservationTimer === 0 ? "#999" : "#FFFFFF",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: submitting || reservationTimer === 0 ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Booking..." : "Confirm Booking"}
              </button>
            </form>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 32, textAlign: "center" }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              backgroundColor: "#E8F5E9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: "#1A1A1A" }}>You're all set!</h2>
            <p style={{ margin: "0 0 32px", fontSize: 14, color: "#666" }}>Your appointment has been confirmed</p>

            <div style={{ backgroundColor: "#F5F5F5", borderRadius: 12, padding: 20, textAlign: "left", marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #E8E8E8" }}>
                <span style={{ fontSize: 14, color: "#666" }}>Service</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{currentService?.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #E8E8E8" }}>
                <span style={{ fontSize: 14, color: "#666" }}>Specialist</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{currentStaff?.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #E8E8E8" }}>
                <span style={{ fontSize: 14, color: "#666" }}>Date & Time</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{selectedDate} at {selectedTime}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
                <span style={{ fontSize: 14, color: "#666" }}>Booking ID</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{successAppointmentId?.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>

            <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Confirmation sent to {customerEmail}</p>

            <button
              onClick={() => {
                sessionStorage.setItem('booking_session_id', generateSessionId());
                window.location.reload();
              }}
              style={{
                padding: "14px 32px",
                border: "none",
                borderRadius: 25,
                backgroundColor: "#1A1A1A",
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Book Another
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
