"use client";

import { useEffect, useState, FormEvent, useCallback, use } from "react";

type ServiceCategory = { id: string; name: string; description: string | null };
type Service = { id: string; name: string; description: string | null; durationMinutes: number; price: number; categoryId?: string | null; serviceCategory?: ServiceCategory | null };
type Staff = { id: string; name: string; role?: string | null };
type StaffAvailability = { available: boolean; reason?: string; startTime?: string; endTime?: string; isCustom?: boolean; note?: string };
type ReservedSlot = { startTime: string; endTime: string };
type PolicyItem = { icon: string; title: string; description: string };
type Step = 1 | 2 | 3 | 4 | 5;
type Discount = { id: string; name: string; discountPercent: number; startTime: string; endTime: string; daysOfWeek: number[]; serviceIds: string[]; staffIds: string[] };

function generateSessionId() {
  return 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const apiBase = `/api/public/${slug}`;

  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('booking_session_id');
      if (!id) { id = generateSessionId(); sessionStorage.setItem('booking_session_id', id); }
      return id;
    }
    return generateSessionId();
  });

  const [step, setStep] = useState<Step>(1);
  const [salonName, setSalonName] = useState("");
  const [policyTitle, setPolicyTitle] = useState("Our Booking Policy");
  const [policyItems, setPolicyItems] = useState<PolicyItem[]>([]);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [mobilePolicyRead, setMobilePolicyRead] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [allStaffAvailability, setAllStaffAvailability] = useState<Record<string, StaffAvailability>>({});
  const [reservedSlots, setReservedSlots] = useState<ReservedSlot[]>([]);
  const [bookedSlots, setBookedSlots] = useState<ReservedSlot[]>([]);
  const [staffBookedSlots, setStaffBookedSlots] = useState<Record<string, ReservedSlot[]>>({});
  const [staffReservedSlots, setStaffReservedSlots] = useState<Record<string, ReservedSlot[]>>({});
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

  const currentService = services.find((s) => s.id === selectedServiceId);
  const isAnyStaff = selectedStaffId === "any";
  const currentStaff = staff.find((s) => s.id === (isAnyStaff ? assignedStaffId : selectedStaffId));
  const filteredServices = selectedCategoryId ? services.filter(s => s.categoryId === selectedCategoryId) : services;

  // Helper to convert time string to minutes for proper comparison
  function timeToMinutes(time: string): number {
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
  }

  // Check if time is within range (proper numeric comparison)
  function isTimeInRange(time: string, startTime: string, endTime: string): boolean {
    const timeMinutes = timeToMinutes(time);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  }

  // Get applicable discount for a service (returns BEST discount, not just first)
  function getApplicableDiscount(serviceId: string, date?: string, time?: string, staffId?: string): Discount | null {
    if (!discounts.length) return null;

    // If no date/time selected, check if any discount could potentially apply
    const checkDate = date ? new Date(date) : new Date();
    const dayOfWeek = checkDate.getDay();
    const checkTime = time || new Date().toTimeString().slice(0, 5);

    let bestDiscount: Discount | null = null;

    for (const discount of discounts) {
      // Check if service is included
      if (!discount.serviceIds.includes(serviceId)) continue;

      // Check if day is included
      if (!discount.daysOfWeek.includes(dayOfWeek)) continue;

      // Check if time is within range (use proper numeric comparison)
      if (!isTimeInRange(checkTime, discount.startTime, discount.endTime)) continue;

      // Check if staff matches (empty staffIds means all staff)
      if (staffId && discount.staffIds.length > 0 && !discount.staffIds.includes(staffId)) continue;

      // Keep the best (highest) discount
      if (!bestDiscount || discount.discountPercent > bestDiscount.discountPercent) {
        bestDiscount = discount;
      }
    }
    return bestDiscount;
  }

  // Calculate discounted price with validation
  function getDiscountedPrice(originalPrice: number, discount: Discount | null): number {
    if (!discount) return originalPrice;
    // Validate discount percent is between 0 and 100
    if (discount.discountPercent < 0 || discount.discountPercent > 100) {
      return originalPrice;
    }
    return originalPrice * (1 - discount.discountPercent / 100);
  }

  // Get the current applicable discount for selected service
  const currentDiscount = selectedServiceId ? getApplicableDiscount(
    selectedServiceId,
    selectedDate,
    selectedTime,
    isAnyStaff ? assignedStaffId : selectedStaffId
  ) : null;
  const finalPrice = currentService ? getDiscountedPrice(currentService.price, currentDiscount) : 0;

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [servicesRes, categoriesRes, policyRes, discountsRes, salonRes] = await Promise.all([
          fetch(`${apiBase}/services`),
          fetch(`${apiBase}/categories`),
          fetch(`${apiBase}/booking-policy`),
          fetch(`${apiBase}/discounts`),
          fetch(`${apiBase}/salon`)
        ]);

        if (!servicesRes.ok) {
          setNotFound(true);
          return;
        }

        setServices(await servicesRes.json());
        setCategories(await categoriesRes.json());
        const policyData = await policyRes.json();
        setPolicyTitle(policyData.title || "Our Booking Policy");
        setPolicyItems(policyData.policies || []);

        // Get salon name from API, fallback to slug-based name
        if (salonRes.ok) {
          const salonData = await salonRes.json();
          setSalonName(salonData.name || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
        } else {
          setSalonName(slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
        }

        if (discountsRes.ok) {
          setDiscounts(await discountsRes.json());
        }
      } catch (err) {
        setError("Failed to load. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [apiBase, slug]);

  // Load staff who can perform the selected service (filtered by discount eligibility)
  useEffect(() => {
    if (!selectedServiceId) return;
    // Reset staff and selections when service changes
    setStaff([]);
    setSelectedStaffId("");
    setSelectedTime("");
    setAssignedStaffId("");
    async function loadStaff() {
      try {
        const res = await fetch(`${apiBase}/staff?serviceId=${selectedServiceId}`);
        let staffList: Staff[] = await res.json();

        // Check if there's a discount for this service with specific staff
        const serviceDiscounts = discounts.filter(d => d.serviceIds.includes(selectedServiceId));
        if (serviceDiscounts.length > 0) {
          // Get all staff IDs that are eligible for any discount on this service
          const discountStaffIds = new Set<string>();
          let hasStaffRestriction = false;

          for (const discount of serviceDiscounts) {
            if (discount.staffIds.length > 0) {
              hasStaffRestriction = true;
              discount.staffIds.forEach(id => discountStaffIds.add(id));
            }
          }

          // If any discount has staff restrictions, filter to only those staff
          if (hasStaffRestriction && discountStaffIds.size > 0) {
            staffList = staffList.filter(s => discountStaffIds.has(s.id));
          }
        }

        setStaff(staffList);
      } catch (err) { console.error(err); }
    }
    loadStaff();
  }, [selectedServiceId, apiBase, discounts]);

  // Set default date
  useEffect(() => { setSelectedDate(new Date().toISOString().split("T")[0]); }, []);

  // Detect mobile and show policy popup
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load availability - always load ALL staff availability to show combined slots
  useEffect(() => {
    if (!selectedDate || staff.length === 0) return;
    async function loadAvailability() {
      setLoadingAvailability(true);
      setSelectedTime(""); setAssignedStaffId(""); setReservationExpiry(null);
      try {
        // Always load all staff availability to show combined time slots
        const availabilityMap: Record<string, StaffAvailability> = {};
        await Promise.all(staff.map(async (s) => {
          const res = await fetch(`${apiBase}/staff-availability?staffId=${s.id}&date=${selectedDate}`);
          availabilityMap[s.id] = await res.json();
        }));
        setAllStaffAvailability(availabilityMap);

        // Load reservations and bookings for all staff (track per-staff)
        let allReserved: ReservedSlot[] = [], allBooked: ReservedSlot[] = [];
        const perStaffBooked: Record<string, ReservedSlot[]> = {};
        const perStaffReserved: Record<string, ReservedSlot[]> = {};
        await Promise.all(staff.map(async (s) => {
          const res = await fetch(`${apiBase}/slot-reservation?staffId=${s.id}&date=${selectedDate}&sessionId=${sessionId}`);
          const data = await res.json();
          perStaffBooked[s.id] = data.appointments || [];
          perStaffReserved[s.id] = data.reservations || [];
          if (data.reservations) allReserved = [...allReserved, ...data.reservations];
          if (data.appointments) allBooked = [...allBooked, ...data.appointments];
        }));
        setReservedSlots(allReserved); setBookedSlots(allBooked);
        setStaffBookedSlots(perStaffBooked); setStaffReservedSlots(perStaffReserved);
      } catch (err) { console.error(err); }
      finally { setLoadingAvailability(false); }
    }
    loadAvailability();
  }, [selectedDate, staff, sessionId, apiBase]);

  // Reservation timer
  useEffect(() => {
    if (!reservationExpiry) { setReservationTimer(0); return; }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((reservationExpiry.getTime() - Date.now()) / 1000));
      setReservationTimer(remaining);
      if (remaining === 0) { setReservationExpiry(null); setSelectedTime(""); setError("Reservation expired. Please select a time again."); }
    }, 1000);
    return () => clearInterval(interval);
  }, [reservationExpiry]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (sessionId) fetch(`${apiBase}/slot-reservation?sessionId=${sessionId}`, { method: 'DELETE' }).catch(() => {}); };
  }, [sessionId, apiBase]);

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
    const serviceDuration = currentService?.durationMinutes || 60;
    const slotStart = new Date(`${selectedDate}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

    for (const member of staff) {
      const availability = allStaffAvailability[member.id];
      if (!availability?.available) continue;

      // Check if within working hours
      const [timeH, timeM] = time.split(":").map(Number);
      const slotStartMin = timeH * 60 + timeM;
      const slotEndMin = slotStartMin + serviceDuration;
      const [startH, startM] = (availability.startTime || "09:00").split(":").map(Number);
      const [endH, endM] = (availability.endTime || "17:00").split(":").map(Number);
      const availStart = startH * 60 + startM;
      const availEnd = endH * 60 + endM;
      if (slotStartMin < availStart || slotEndMin > availEnd) continue;

      // Check if this staff has the slot booked
      const staffBooked = staffBookedSlots[member.id] || [];
      const hasBooking = staffBooked.some(a => slotStart < new Date(a.endTime) && slotEnd > new Date(a.startTime));
      if (hasBooking) continue;

      // Check if this staff has the slot reserved
      const staffReserved = staffReservedSlots[member.id] || [];
      const hasReservation = staffReserved.some(r => slotStart < new Date(r.endTime) && slotEnd > new Date(r.startTime));
      if (hasReservation) continue;

      return member.id;
    }
    return null;
  };

  const generateTimeSlots = () => {
    const serviceDuration = currentService?.durationMinutes || 60;
    const isAnyStaff = selectedStaffId === "any";

    if (isAnyStaff) {
      // Combined availability from all staff
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
      const lastSlotTime = latestEnd - serviceDuration;
      const slots: string[] = [];
      for (let m = earliestStart; m <= lastSlotTime; m += 15) {
        const time = `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
        if (findAvailableStaff(time)) slots.push(time);
      }
      return slots;
    } else {
      // Specific staff selected - show only their availability
      const availability = allStaffAvailability[selectedStaffId];
      if (!availability?.available) return [];
      const [startH, startM] = (availability.startTime || "09:00").split(":").map(Number);
      const [endH, endM] = (availability.endTime || "17:00").split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const lastSlotTime = endMinutes - serviceDuration;
      const slots: string[] = [];
      for (let m = startMinutes; m <= lastSlotTime; m += 15) {
        const time = `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
        // Check if slot is available for this specific staff
        if (isSlotAvailableForStaff(time, selectedStaffId)) slots.push(time);
      }
      return slots;
    }
  };

  const isSlotAvailableForStaff = (time: string, staffId: string): boolean => {
    const serviceDuration = currentService?.durationMinutes || 60;
    const slotStart = new Date(`${selectedDate}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

    // Check if slot conflicts with booked appointments for THIS staff
    const staffBooked = staffBookedSlots[staffId] || [];
    const hasConflict = staffBooked.some(a => slotStart < new Date(a.endTime) && slotEnd > new Date(a.startTime));

    // Check reserved slots for THIS staff
    const staffReserved = staffReservedSlots[staffId] || [];
    const isReserved = staffReserved.some(r => slotStart < new Date(r.endTime) && slotEnd > new Date(r.startTime));

    return !hasConflict && !isReserved;
  };

  const timeSlots = generateTimeSlots();
  const selectedStaffAvailability = selectedStaffId && selectedStaffId !== "any" ? allStaffAvailability[selectedStaffId] : null;
  const isSelectedStaffOff = selectedStaffAvailability && !selectedStaffAvailability.available;
  const noStaffAvailable = selectedStaffId === "any" && Object.values(allStaffAvailability).every(a => !a.available);

  const isTimeSlotPast = (time: string) => {
    const now = new Date(), today = now.toISOString().split("T")[0];
    if (selectedDate > today) return false;
    if (selectedDate < today) return true;
    const [h, m] = time.split(":").map(Number);
    const slot = new Date(); slot.setHours(h, m, 0, 0);
    return slot <= now;
  };

  const handleTimeSelect = async (time: string) => {
    const isAnyStaff = selectedStaffId === "any";
    // Use selected staff or find an available one
    const finalStaffId = isAnyStaff ? findAvailableStaff(time) : selectedStaffId;
    if (!finalStaffId) return;
    setReserving(true); setError(null);
    try {
      const start = new Date(`${selectedDate}T${time}:00`);
      const end = new Date(start.getTime() + (currentService?.durationMinutes || 60) * 60000);
      const res = await fetch(`${apiBase}/slot-reservation`, {
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
    const isAnyStaff = selectedStaffId === "any";
    const finalStaffId = isAnyStaff ? assignedStaffId : selectedStaffId;
    if (!selectedServiceId || !finalStaffId || !selectedDate || !selectedTime) { setError("Please complete all selections."); return; }
    if (!customerName || !customerPhone || !customerEmail) { setError("Please fill in your details."); return; }
    if (!reservationExpiry || reservationExpiry < new Date()) { setError("Reservation expired. Go back and select a time."); return; }
    setSubmitting(true);
    try {
      // Get current discount for the selected slot
      const slotDiscount = getApplicableDiscount(selectedServiceId, selectedDate, selectedTime, finalStaffId);
      const originalPrice = currentService?.price || 0;
      const discountedPrice = slotDiscount ? getDiscountedPrice(originalPrice, slotDiscount) : undefined;

      const res = await fetch(`${apiBase}/appointments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          staffId: finalStaffId,
          customerName,
          customerPhone,
          customerEmail,
          startTime: new Date(`${selectedDate}T${selectedTime}:00`).toISOString(),
          originalPrice,
          discountedPrice: slotDiscount ? discountedPrice : undefined,
          discountName: slotDiscount?.name || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const apt = await res.json();
      await fetch(`${apiBase}/slot-reservation?sessionId=${sessionId}`, { method: 'DELETE' }).catch(() => {});
      setSuccessAppointmentId(apt.id); setStep(5);
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a", color: "#94a3b8" }}><p>Loading...</p></div>;

  if (notFound) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a", color: "#fff", flexDirection: "column", gap: 16 }}>
      <h1 style={{ fontSize: 24 }}>Salon not found</h1>
      <p style={{ color: "#94a3b8" }}>The booking page you are looking for does not exist.</p>
    </div>
  );

  // Show initial policy popup on mobile
  if (isMobile && !mobilePolicyRead && policyItems.length > 0) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", padding: "20px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 20, margin: "0 auto 12px" }}>{salonName.charAt(0)}</div>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 600, margin: 0 }}>Welcome to {salonName}</h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, margin: "8px 0 0" }}>Please read our booking policy before continuing</p>
        </div>

        {/* Policy Content */}
        <div style={{ flex: 1, backgroundColor: "#fff", padding: 20, overflowY: "auto" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: "#1e293b" }}>{policyTitle}</h2>

          {policyItems.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 14, marginBottom: 20, padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 28 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>{item.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <div style={{ padding: 20, backgroundColor: "#fff", borderTop: "1px solid #e2e8f0" }}>
          <button
            onClick={() => setMobilePolicyRead(true)}
            style={{
              width: "100%",
              padding: 16,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            I've Read the Policy - Continue to Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .main-content { margin-left: 0 !important; border-radius: 0 !important; }
          .mobile-header { display: flex !important; }
          .time-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (min-width: 769px) { .mobile-header { display: none !important; } }
      `}</style>

      {/* Mobile Header */}
      <div className="mobile-header" style={{ display: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", padding: "16px 20px", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>{salonName.charAt(0)}</div>
          <span style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>{salonName}</span>
        </div>
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13 }}>Step {step} of 5</div>
      </div>

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Desktop Sidebar */}
        <div className="desktop-sidebar" style={{ width: 360, backgroundColor: "#1e293b", padding: 32, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18 }}>{salonName.charAt(0)}</div>
            <span style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>{salonName}</span>
          </div>

          {/* Progress */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
            {[{ n: 1, l: "Service" }, { n: 2, l: "Specialist" }, { n: 3, l: "Date & Time" }, { n: 4, l: "Your Info" }, { n: 5, l: "Confirmed" }].map((item) => (
              <div key={item.n} style={{ display: "flex", alignItems: "center", gap: 12, opacity: step >= item.n ? 1 : 0.4 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: step > item.n ? "#10b981" : step === item.n ? "#6366f1" : "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600 }}>{step > item.n ? "✓" : item.n}</div>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: step === item.n ? 600 : 400 }}>{item.l}</span>
              </div>
            ))}
          </div>

          {/* Policy */}
          {policyItems.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h3 style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{policyTitle}</h3>
              {policyItems.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <span>{item.icon}</span>
                  <div>
                    <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{item.title}</div>
                    <div style={{ color: "#94a3b8", fontSize: 11 }}>{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selection Summary */}
          {currentService && (
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", marginBottom: 12 }}>Your Selection</div>
              <div style={{ color: "#fff", fontSize: 13, marginBottom: 8 }}>✨ {currentService.name}</div>
              {currentStaff && <div style={{ color: "#fff", fontSize: 13, marginBottom: 8 }}>👤 {currentStaff.name}</div>}
              {selectedDate && selectedTime && <div style={{ color: "#fff", fontSize: 13, marginBottom: 8 }}>📅 {selectedDate} at {selectedTime}</div>}
              <div style={{ color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                💰 {currentDiscount ? (
                  <>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>£{finalPrice.toFixed(2)}</span>
                    <span style={{ color: "#64748b", textDecoration: "line-through", fontSize: 12 }}>£{currentService.price}</span>
                    <span style={{ background: "#22c55e", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{currentDiscount.discountPercent}% OFF</span>
                  </>
                ) : (
                  <span>£{currentService.price}</span>
                )}
              </div>
              {reservationTimer > 0 && <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>⏱️ Reserved for {formatTimer(reservationTimer)}</div>}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="main-content" style={{ flex: 1, marginLeft: 360, backgroundColor: "#fff", borderRadius: "24px 0 0 24px", padding: "32px 24px", minHeight: "100vh" }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {error && <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: 14, marginBottom: 24 }}>{error}</div>}

            {/* Step 1: Service */}
            {step === 1 && (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Choose a Service</h1>
                <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>Select the service you would like to book</p>

                {/* Category Tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                  <button onClick={() => setSelectedCategoryId(null)} style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: !selectedCategoryId ? "#6366f1" : "#f1f5f9", color: !selectedCategoryId ? "#fff" : "#64748b", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>All Services</button>
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: selectedCategoryId === cat.id ? "#6366f1" : "#f1f5f9", color: selectedCategoryId === cat.id ? "#fff" : "#64748b", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{cat.name}</button>
                  ))}
                </div>

                {/* Services */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredServices.map((service) => {
                    // Find the best discount available for this service
                    const serviceDiscounts = discounts.filter(d => d.serviceIds.includes(service.id));
                    const bestDiscount = serviceDiscounts.length > 0
                      ? serviceDiscounts.reduce((max, d) => d.discountPercent > max.discountPercent ? d : max)
                      : null;
                    const discountedPrice = bestDiscount
                      ? service.price * (1 - bestDiscount.discountPercent / 100)
                      : service.price;

                    return (
                      <div key={service.id} onClick={() => setSelectedServiceId(service.id)} style={{
                        padding: 16,
                        borderRadius: 12,
                        border: `2px solid ${selectedServiceId === service.id ? "#6366f1" : "#e2e8f0"}`,
                        background: selectedServiceId === service.id ? "#f5f3ff" : "#fff",
                        cursor: "pointer",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 15 }}>{service.name}</span>
                              {bestDiscount && (
                                <span style={{
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  background: "#22c55e",
                                  color: "#fff",
                                }}>
                                  {bestDiscount.discountPercent}% OFF
                                </span>
                              )}
                            </div>
                            {service.description && (
                              <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>
                                {selectedServiceId === service.id
                                  ? service.description
                                  : service.description.length > 60
                                    ? service.description.slice(0, 60) + '...'
                                    : service.description}
                              </div>
                            )}
                            <div style={{ color: "#64748b", fontSize: 13 }}>{service.durationMinutes} min</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {bestDiscount ? (
                              <>
                                <div style={{ fontWeight: 700, fontSize: 16, color: "#16a34a" }}>
                                  from £{discountedPrice.toFixed(2)}
                                </div>
                                <div style={{
                                  fontSize: 12,
                                  color: "#94a3b8",
                                  textDecoration: "line-through",
                                  marginTop: 2
                                }}>
                                  £{service.price}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>£{service.price}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => selectedServiceId ? (setError(null), goNext()) : setError("Please select a service")} style={{ width: "100%", marginTop: 24, padding: 14, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Continue</button>
              </>
            )}

            {/* Step 2: Staff */}
            {step === 2 && (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Choose a Specialist</h1>
                <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>Select your preferred technician or let us assign one</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div onClick={() => { setSelectedStaffId("any"); setAssignedStaffId(""); setSelectedTime(""); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 12, border: `2px solid ${selectedStaffId === "any" ? "#6366f1" : "#e2e8f0"}`, background: selectedStaffId === "any" ? "#f5f3ff" : "#fff", cursor: "pointer" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⭐</div>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 15 }}>Any Available</div><div style={{ color: "#64748b", fontSize: 13 }}>First available specialist</div></div>
                    {selectedStaffId === "any" && <span style={{ width: 22, height: 22, borderRadius: 6, background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</span>}
                  </div>
                  {staff.map((m) => (
                    <div key={m.id} onClick={() => { setSelectedStaffId(m.id); setAssignedStaffId(""); setSelectedTime(""); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 12, border: `2px solid ${selectedStaffId === m.id ? "#6366f1" : "#e2e8f0"}`, background: selectedStaffId === m.id ? "#f5f3ff" : "#fff", cursor: "pointer" }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{m.name.charAt(0)}</div>
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div><div style={{ color: "#64748b", fontSize: 13 }}>{m.role || "Nail Technician"}</div></div>
                      {selectedStaffId === m.id && <span style={{ width: 22, height: 22, borderRadius: 6, background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</span>}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                  <button onClick={goBack} style={{ padding: "14px 20px", background: "#fff", color: "#475569", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 15, cursor: "pointer" }}>Back</button>
                  <button onClick={() => selectedStaffId ? (setError(null), goNext()) : setError("Please select a specialist")} style={{ flex: 1, padding: 14, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Continue</button>
                </div>
              </>
            )}

            {/* Step 3: Date & Time */}
            {step === 3 && (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Pick Date & Time</h1>
                <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>Choose when you would like to visit</p>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Date</label>
                  <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); setReservationExpiry(null); }} min={new Date().toISOString().split("T")[0]} style={{ width: "100%", padding: 14, border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 16 }} />
                </div>
                {loadingAvailability ? <p>Checking availability...</p> : isSelectedStaffOff ? (
                  <div style={{ padding: 16, background: "#fef3c7", borderRadius: 12, marginBottom: 20 }}>
                    <strong style={{ color: "#92400e" }}>{currentStaff?.name || "This specialist"} is not available on this date</strong>
                    <p style={{ color: "#a16207", margin: "4px 0 0", fontSize: 13 }}>Please select another date or choose a different specialist.</p>
                  </div>
                ) : noStaffAvailable ? (
                  <div style={{ padding: 16, background: "#fef3c7", borderRadius: 12, marginBottom: 20 }}>
                    <strong style={{ color: "#92400e" }}>No staff available on this date</strong>
                    <p style={{ color: "#a16207", margin: "4px 0 0", fontSize: 13 }}>Please select another date.</p>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div style={{ padding: 20, background: "#fef2f2", borderRadius: 10, color: "#dc2626", textAlign: "center", fontSize: 14 }}>No available times. Please select another date.</div>
                ) : (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Available Times</label>

                    {/* Off-Peak Info Banner */}
                    {discounts.length > 0 && currentService && discounts.some(d => d.serviceIds.includes(currentService.id)) && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 14px",
                        background: "#f0fdf4",
                        borderRadius: 8,
                        marginBottom: 16,
                        border: "1px solid #bbf7d0"
                      }}>
                        <span style={{ fontSize: 16 }}>💚</span>
                        <span style={{ fontSize: 13, color: "#15803d" }}>
                          <strong>Off-Peak prices</strong> available - look for green slots to save!
                        </span>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {timeSlots.map((time) => {
                        const past = isTimeSlotPast(time);
                        const slotDiscount = currentService ? getApplicableDiscount(currentService.id, selectedDate, time, isAnyStaff ? undefined : selectedStaffId) : null;
                        const originalPrice = currentService?.price || 0;
                        const discountedPrice = slotDiscount ? getDiscountedPrice(originalPrice, slotDiscount) : originalPrice;
                        const isOffPeak = slotDiscount !== null;
                        const isSelected = selectedTime === time;

                        return (
                          <button
                            type="button"
                            key={time}
                            disabled={past || reserving}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!past && !reserving) {
                                handleTimeSelect(time);
                              }
                            }}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "14px 16px",
                              borderRadius: 10,
                              border: isSelected ? "2px solid #6366f1" : isOffPeak ? "2px solid #22c55e" : "2px solid #e2e8f0",
                              background: isSelected ? "#6366f1" : past ? "#f8fafc" : isOffPeak ? "#f0fdf4" : "#fff",
                              cursor: past || reserving ? "not-allowed" : "pointer",
                              opacity: past ? 0.5 : 1,
                              transition: "all 0.15s ease",
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12, pointerEvents: "none" }}>
                              <span style={{
                                fontSize: 15,
                                fontWeight: 600,
                                color: isSelected ? "#fff" : "#1e293b"
                              }}>
                                {time}
                              </span>
                              {isOffPeak && !isSelected && slotDiscount && (
                                <span style={{
                                  padding: "3px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: "#22c55e",
                                  color: "#fff",
                                }}>
                                  {slotDiscount.discountPercent}% OFF
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "none" }}>
                              {isOffPeak ? (
                                <>
                                  <span style={{
                                    fontSize: 13,
                                    color: isSelected ? "rgba(255,255,255,0.7)" : "#94a3b8",
                                    textDecoration: "line-through"
                                  }}>
                                    £{originalPrice}
                                  </span>
                                  <span style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: isSelected ? "#fff" : "#16a34a"
                                  }}>
                                    £{discountedPrice.toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span style={{
                                  fontSize: 15,
                                  fontWeight: 600,
                                  color: isSelected ? "#fff" : "#64748b"
                                }}>
                                  £{originalPrice}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {reserving && <p style={{ color: "#6366f1", marginTop: 12, fontSize: 14 }}>Reserving...</p>}
                  </div>
                )}
                {isAnyStaff && assignedStaffId && selectedTime && <div style={{ padding: 14, background: "#ecfdf5", borderRadius: 10, color: "#059669", marginBottom: 20, fontSize: 14 }}>✓ {staff.find(s => s.id === assignedStaffId)?.name} will be your specialist</div>}
                {reservationTimer > 0 && <div style={{ padding: 14, background: "#fef3c7", borderRadius: 10, color: "#92400e", textAlign: "center", marginBottom: 20, fontSize: 14 }}>⏱️ Slot reserved for <strong>{formatTimer(reservationTimer)}</strong></div>}
                <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 20 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={policyAgreed} onChange={(e) => setPolicyAgreed(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2, accentColor: "#6366f1" }} />
                    <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>I have read and agree to the <strong>Booking Policy</strong>. I understand the payment terms and cancellation policy.</span>
                  </label>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={goBack} style={{ padding: "14px 20px", background: "#fff", color: "#475569", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 15, cursor: "pointer" }}>Back</button>
                  <button onClick={() => { if (!selectedTime) { setError("Please select a time"); return; } if (!policyAgreed) { setError("Please agree to the booking policy"); return; } setError(null); goNext(); }} style={{ flex: 1, padding: 14, background: policyAgreed ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#e2e8f0", color: policyAgreed ? "#fff" : "#94a3b8", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: policyAgreed ? "pointer" : "not-allowed" }}>Continue</button>
                </div>
              </>
            )}

            {/* Step 4: Customer Info */}
            {step === 4 && (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Your Details</h1>
                <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>We will send your confirmation here</p>
                {reservationTimer > 0 && <div style={{ padding: 14, background: "#fef3c7", borderRadius: 10, color: "#92400e", textAlign: "center", marginBottom: 20, fontSize: 14 }}>⏱️ Complete within <strong>{formatTimer(reservationTimer)}</strong></div>}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div><label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Full Name</label><input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter your name" required style={{ width: "100%", padding: 14, border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 16 }} /></div>
                  <div><label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Phone</label><input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07xxx xxxxxx" required style={{ width: "100%", padding: 14, border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 16 }} /></div>
                  <div><label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Email</label><input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="you@example.com" required style={{ width: "100%", padding: 14, border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 16 }} /></div>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <button type="button" onClick={goBack} style={{ padding: "14px 20px", background: "#fff", color: "#475569", border: "2px solid #e2e8f0", borderRadius: 10, fontSize: 15, cursor: "pointer" }}>Back</button>
                    <button type="submit" disabled={submitting || reservationTimer === 0} style={{ flex: 1, padding: 14, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: submitting || reservationTimer === 0 ? 0.5 : 1 }}>{submitting ? "Booking..." : "Confirm Booking"}</button>
                  </div>
                </form>
              </>
            )}

            {/* Step 5: Confirmation */}
            {step === 5 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 70, height: 70, borderRadius: 16, background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>✓</div>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>You are all set!</h1>
                <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>Your appointment has been confirmed</p>
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, textAlign: "left", marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}><span style={{ color: "#64748b" }}>Service</span><span style={{ fontWeight: 600 }}>{currentService?.name}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}><span style={{ color: "#64748b" }}>Specialist</span><span style={{ fontWeight: 600 }}>{currentStaff?.name}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}><span style={{ color: "#64748b" }}>Date & Time</span><span style={{ fontWeight: 600 }}>{selectedDate} at {selectedTime}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #e2e8f0", fontSize: 14 }}>
                    <span style={{ color: "#64748b" }}>Price</span>
                    <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                      {currentDiscount ? (
                        <>
                          <span style={{ background: "#22c55e", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{currentDiscount.discountPercent}% OFF</span>
                          <span style={{ color: "#94a3b8", textDecoration: "line-through", fontSize: 12 }}>£{currentService?.price}</span>
                          <span style={{ color: "#16a34a" }}>£{finalPrice.toFixed(2)}</span>
                        </>
                      ) : (
                        <span>£{currentService?.price}</span>
                      )}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 14 }}><span style={{ color: "#64748b" }}>Booking ID</span><span style={{ fontWeight: 600 }}>{successAppointmentId?.slice(0, 8).toUpperCase()}</span></div>
                </div>
                <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14 }}>📧 Confirmation sent to {customerEmail}</p>
                <button onClick={() => { sessionStorage.setItem('booking_session_id', generateSessionId()); window.location.reload(); }} style={{ padding: "14px 24px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Book Another</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
