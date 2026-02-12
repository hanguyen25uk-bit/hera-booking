"use client";

import { useEffect, useState, FormEvent, useCallback, use } from "react";

type ServiceCategory = { id: string; name: string; description: string | null };
type Service = { id: string; name: string; description: string | null; durationMinutes: number; price: number; categoryId?: string | null; serviceCategory?: ServiceCategory | null };
type Staff = { id: string; name: string; role?: string | null };
type StaffAvailability = { available: boolean; reason?: string; startTime?: string; endTime?: string; isCustom?: boolean; note?: string; excludeRanges?: { startTime: string; endTime: string }[] };
type ReservedSlot = { startTime: string; endTime: string };
type PolicyItem = { icon: string; title: string; description: string };
type Step = 1 | 2 | 3 | 4 | 5;
type Discount = { id: string; name: string; discountPercent: number; startTime: string; endTime: string; daysOfWeek: number[]; serviceIds: string[]; staffIds: string[]; validFrom: string | null; validUntil: string | null };

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

    // Create date-only string for comparison (YYYY-MM-DD format)
    const bookingDateStr = date || checkDate.toISOString().split('T')[0];

    let bestDiscount: Discount | null = null;

    for (const discount of discounts) {
      // Check if service is included
      if (!discount.serviceIds.includes(serviceId)) continue;

      // Check if booking date is within validity period (date-only comparison)
      if (discount.validFrom) {
        const validFromDate = discount.validFrom.split('T')[0];
        if (bookingDateStr < validFromDate) continue;
      }
      if (discount.validUntil) {
        const validUntilDate = discount.validUntil.split('T')[0];
        if (bookingDateStr > validUntilDate) continue;
      }

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

      // Check if slot falls within excluded time ranges (partial time off)
      const excludeRanges = availability.excludeRanges || [];
      const isExcluded = excludeRanges.some(range => {
        const [exStartH, exStartM] = range.startTime.split(":").map(Number);
        const [exEndH, exEndM] = range.endTime.split(":").map(Number);
        const excludeStart = new Date(`${selectedDate}T00:00:00`);
        excludeStart.setHours(exStartH, exStartM, 0, 0);
        const excludeEnd = new Date(`${selectedDate}T00:00:00`);
        excludeEnd.setHours(exEndH, exEndM, 0, 0);
        return slotStart < excludeEnd && slotEnd > excludeStart;
      });
      if (isExcluded) continue;

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

    // Check if slot falls within excluded time ranges (partial time off)
    const availability = allStaffAvailability[staffId];
    const excludeRanges = availability?.excludeRanges || [];
    const isExcluded = excludeRanges.some(range => {
      const [exStartH, exStartM] = range.startTime.split(":").map(Number);
      const [exEndH, exEndM] = range.endTime.split(":").map(Number);
      const excludeStart = new Date(`${selectedDate}T00:00:00`);
      excludeStart.setHours(exStartH, exStartM, 0, 0);
      const excludeEnd = new Date(`${selectedDate}T00:00:00`);
      excludeEnd.setHours(exEndH, exEndM, 0, 0);
      // Slot conflicts with exclude range if slot starts before exclude ends AND slot ends after exclude starts
      return slotStart < excludeEnd && slotEnd > excludeStart;
    });

    return !hasConflict && !isReserved && !isExcluded;
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

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--cream)", color: "var(--ink-muted)" }}><p>Loading...</p></div>;

  if (notFound) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--cream)", color: "var(--ink)", flexDirection: "column", gap: 16, padding: 24 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--cream-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "var(--ink-muted)" }}>?</div>
      <h1 style={{ fontSize: 24, fontFamily: "var(--font-heading)", fontWeight: 600 }}>Salon not found</h1>
      <p style={{ color: "var(--ink-muted)", textAlign: "center" }}>The booking page you are looking for does not exist.</p>
    </div>
  );

  // Show initial policy popup on mobile
  if (isMobile && !mobilePolicyRead && policyItems.length > 0) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--cream)", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ background: "var(--cream-dark)", padding: "24px 20px", textAlign: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cream)", fontWeight: 700, fontSize: 16, margin: "0 auto 16px", fontFamily: "var(--font-heading)" }}>H</div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", color: "var(--ink-muted)", marginBottom: 8, textTransform: "uppercase" }}>{salonName}</div>
          <h1 style={{ color: "var(--ink)", fontSize: 24, fontWeight: 600, margin: 0, fontFamily: "var(--font-heading)" }}>Welcome</h1>
          <p style={{ color: "var(--ink-muted)", fontSize: 14, margin: "8px 0 0" }}>Please read our booking policy before continuing</p>
        </div>

        {/* Policy Content */}
        <div style={{ flex: 1, backgroundColor: "var(--cream)", padding: 20, overflowY: "auto" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "var(--ink)", fontFamily: "var(--font-heading)" }}>{policyTitle}</h2>

          {policyItems.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 14, marginBottom: 16, padding: 16, background: "var(--white)", borderRadius: 12, border: "1px solid var(--cream-dark)" }}>
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.5 }}>{item.description}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <div style={{ padding: 20, backgroundColor: "var(--cream)", borderTop: "1px solid var(--cream-dark)" }}>
          <button
            onClick={() => setMobilePolicyRead(true)}
            style={{
              width: "100%",
              padding: 16,
              background: "var(--ink)",
              color: "var(--cream)",
              border: "none",
              borderRadius: 50,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-body)"
            }}
          >
            Continue to Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--ink)", fontFamily: "var(--font-body)" }}>
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
      <div className="mobile-header" style={{ display: "none", background: "var(--ink)", padding: "16px 20px", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid rgba(251,248,244,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--rose)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>{salonName.charAt(0)}</div>
          <span style={{ color: "var(--cream)", fontSize: 16, fontWeight: 600, fontFamily: "var(--font-heading)" }}>{salonName}</span>
        </div>
        <div style={{ color: "var(--cream)", opacity: 0.7, fontSize: 13 }}>Step {step} of 5</div>
      </div>

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Desktop Sidebar */}
        <div className="desktop-sidebar" style={{
          width: 360,
          background: "linear-gradient(180deg, var(--ink) 0%, #2A2520 100%)",
          padding: 32,
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          overflowY: "auto"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--rose)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18, fontFamily: "var(--font-heading)" }}>{salonName.charAt(0)}</div>
            <span style={{ color: "var(--cream)", fontSize: 20, fontWeight: 600, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>{salonName}</span>
          </div>

          {/* Progress */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 }}>
            {[{ n: 1, l: "Service" }, { n: 2, l: "Specialist" }, { n: 3, l: "Date & Time" }, { n: 4, l: "Your Info" }, { n: 5, l: "Confirmed" }].map((item) => (
              <div key={item.n} style={{ display: "flex", alignItems: "center", gap: 14, opacity: step >= item.n ? 1 : 0.4 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: step > item.n ? "var(--sage)" : step === item.n ? "var(--rose)" : "rgba(251,248,244,0.1)",
                  border: step === item.n ? "2px solid var(--rose-light)" : "2px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: step >= item.n ? "#fff" : "var(--cream)",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "var(--font-heading)"
                }}>{step > item.n ? "✓" : item.n}</div>
                <span style={{ color: "var(--cream)", fontSize: 14, fontWeight: step === item.n ? 600 : 400 }}>{item.l}</span>
              </div>
            ))}
          </div>

          {/* Policy */}
          {policyItems.length > 0 && (
            <div style={{ background: "rgba(251,248,244,0.05)", borderRadius: 16, padding: 20, marginBottom: 24, border: "1px solid rgba(251,248,244,0.08)" }}>
              <h3 style={{ color: "var(--cream)", fontSize: 14, fontWeight: 600, marginBottom: 16, fontFamily: "var(--font-heading)" }}>{policyTitle}</h3>
              {policyItems.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <div>
                    <div style={{ color: "var(--cream)", fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                    <div style={{ color: "var(--cream)", opacity: 0.6, fontSize: 12, lineHeight: 1.4 }}>{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selection Summary */}
          {currentService && (
            <div style={{ background: "rgba(251,248,244,0.05)", borderRadius: 16, padding: 20, border: "1px solid rgba(251,248,244,0.08)" }}>
              <div style={{ color: "var(--gold)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16 }}>Your Selection</div>
              <div style={{ color: "var(--cream)", fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--rose-light)" }}>✦</span> {currentService.name}
              </div>
              {currentStaff && <div style={{ color: "var(--cream)", fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "var(--sage-light)" }}>◉</span> {currentStaff.name}</div>}
              {selectedDate && selectedTime && <div style={{ color: "var(--cream)", fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "var(--gold-light)" }}>◆</span> {selectedDate} at {selectedTime}</div>}
              <div style={{ color: "var(--cream)", fontSize: 14, display: "flex", alignItems: "center", gap: 8, paddingTop: 12, borderTop: "1px solid rgba(251,248,244,0.1)", marginTop: 4 }}>
                {currentDiscount ? (
                  <>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600 }}>£{finalPrice.toFixed(2)}</span>
                    <span style={{ color: "var(--cream)", opacity: 0.5, textDecoration: "line-through", fontSize: 13 }}>£{currentService.price}</span>
                    <span style={{ background: "var(--gold)", color: "var(--ink)", padding: "3px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600 }}>{currentDiscount.discountPercent}% OFF</span>
                  </>
                ) : (
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600 }}>£{currentService.price}</span>
                )}
              </div>
              {reservationTimer > 0 && <div style={{ color: "var(--gold)", fontSize: 13, fontWeight: 600, marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(251,248,244,0.1)" }}>⏱ Reserved for {formatTimer(reservationTimer)}</div>}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="main-content" style={{ flex: 1, marginLeft: 360, backgroundColor: "var(--cream)", borderRadius: "24px 0 0 24px", padding: "40px 32px", minHeight: "100vh" }}>
          <div style={{ maxWidth: 580, margin: "0 auto" }}>
            {error && <div style={{ padding: 16, background: "var(--rose-pale)", border: "1px solid var(--rose-light)", borderRadius: 12, color: "var(--rose)", fontSize: 14, marginBottom: 24 }}>{error}</div>}

            {/* Step 1: Service */}
            {step === 1 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8, fontFamily: "var(--font-heading)", color: "var(--ink)", letterSpacing: "-0.02em" }}>Choose a Service</h1>
                <p style={{ color: "var(--ink-muted)", marginBottom: 32, fontSize: 15 }}>Select the service you would like to book</p>

                {/* Category Tabs */}
                <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
                  <button onClick={() => setSelectedCategoryId(null)} style={{
                    padding: "10px 20px",
                    borderRadius: 50,
                    border: "none",
                    background: !selectedCategoryId ? "var(--ink)" : "var(--cream-dark)",
                    color: !selectedCategoryId ? "var(--cream)" : "var(--ink-light)",
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}>All Services</button>
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} style={{
                      padding: "10px 20px",
                      borderRadius: 50,
                      border: "none",
                      background: selectedCategoryId === cat.id ? "var(--ink)" : "var(--cream-dark)",
                      color: selectedCategoryId === cat.id ? "var(--cream)" : "var(--ink-light)",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}>{cat.name}</button>
                  ))}
                </div>

                {/* Services */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {filteredServices.map((service) => {
                    // Find the best CURRENTLY VALID discount available for this service
                    const today = new Date().toISOString().split('T')[0];
                    const serviceDiscounts = discounts.filter(d => {
                      if (!d.serviceIds.includes(service.id)) return false;
                      // Check validity period
                      if (d.validFrom && today < d.validFrom.split('T')[0]) return false;
                      if (d.validUntil && today > d.validUntil.split('T')[0]) return false;
                      return true;
                    });
                    const bestDiscount = serviceDiscounts.length > 0
                      ? serviceDiscounts.reduce((max, d) => d.discountPercent > max.discountPercent ? d : max)
                      : null;
                    const discountedPrice = bestDiscount
                      ? service.price * (1 - bestDiscount.discountPercent / 100)
                      : service.price;

                    return (
                      <div key={service.id} onClick={() => setSelectedServiceId(service.id)} style={{
                        padding: 20,
                        borderRadius: 16,
                        border: selectedServiceId === service.id ? "2px solid var(--rose)" : "1px solid var(--cream-dark)",
                        background: selectedServiceId === service.id ? "var(--rose-pale)" : "var(--white)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: selectedServiceId === service.id ? "var(--shadow-md)" : "none"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                              <span style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>{service.name}</span>
                              {bestDiscount && (
                                <span style={{
                                  padding: "4px 10px",
                                  borderRadius: 50,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: "var(--gold-light)",
                                  color: "var(--gold)",
                                }}>
                                  {bestDiscount.discountPercent}% OFF
                                </span>
                              )}
                            </div>
                            {service.description && (
                              <div style={{ color: "var(--ink-light)", fontSize: 14, marginBottom: 8, lineHeight: 1.5 }}>
                                {selectedServiceId === service.id
                                  ? service.description
                                  : service.description.length > 60
                                    ? service.description.slice(0, 60) + '...'
                                    : service.description}
                              </div>
                            )}
                            <div style={{
                              display: "inline-flex",
                              padding: "4px 12px",
                              background: "var(--cream)",
                              borderRadius: 50,
                              color: "var(--ink-muted)",
                              fontSize: 13
                            }}>{service.durationMinutes} min</div>
                          </div>
                          <div style={{ textAlign: "right", marginLeft: 16 }}>
                            {bestDiscount ? (
                              <>
                                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 18, color: "var(--ink)" }}>
                                  from £{discountedPrice.toFixed(2)}
                                </div>
                                <div style={{
                                  fontSize: 13,
                                  color: "var(--ink-muted)",
                                  textDecoration: "line-through",
                                  marginTop: 2
                                }}>
                                  £{service.price}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 18, color: "var(--ink)" }}>£{service.price}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => selectedServiceId ? (setError(null), goNext()) : setError("Please select a service")} style={{
                  width: "100%",
                  marginTop: 32,
                  padding: 16,
                  background: "var(--ink)",
                  color: "var(--cream)",
                  border: "none",
                  borderRadius: 50,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}>Continue</button>
              </>
            )}

            {/* Step 2: Staff */}
            {step === 2 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8, fontFamily: "var(--font-heading)", color: "var(--ink)", letterSpacing: "-0.02em" }}>Choose a Specialist</h1>
                <p style={{ color: "var(--ink-muted)", marginBottom: 32, fontSize: 15 }}>Select your preferred technician or let us assign one</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div onClick={() => { setSelectedStaffId("any"); setAssignedStaffId(""); setSelectedTime(""); }} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: 18,
                    borderRadius: 16,
                    border: selectedStaffId === "any" ? "2px solid var(--rose)" : "1px solid var(--cream-dark)",
                    background: selectedStaffId === "any" ? "var(--rose-pale)" : "var(--white)",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}>
                    <div style={{ width: 50, height: 50, borderRadius: "50%", background: "var(--gold)", color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>✦</div>
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>Any Available</div><div style={{ color: "var(--ink-muted)", fontSize: 14 }}>First available specialist</div></div>
                    {selectedStaffId === "any" && <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--rose)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✓</span>}
                  </div>
                  {staff.map((m, index) => {
                    const avatarColors = ["var(--rose)", "var(--sage)", "var(--gold)", "var(--ink)"];
                    const avatarColor = avatarColors[index % avatarColors.length];
                    return (
                      <div key={m.id} onClick={() => { setSelectedStaffId(m.id); setAssignedStaffId(""); setSelectedTime(""); }} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: 18,
                        borderRadius: 16,
                        border: selectedStaffId === m.id ? "2px solid var(--rose)" : "1px solid var(--cream-dark)",
                        background: selectedStaffId === m.id ? "var(--rose-pale)" : "var(--white)",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}>
                        <div style={{ width: 50, height: 50, borderRadius: "50%", background: avatarColor, color: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 600, fontFamily: "var(--font-heading)" }}>{m.name.charAt(0)}</div>
                        <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>{m.name}</div><div style={{ color: "var(--ink-muted)", fontSize: 14 }}>{m.role || "Nail Technician"}</div></div>
                        {selectedStaffId === m.id && <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--rose)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
                  <button onClick={goBack} style={{ padding: "14px 24px", background: "var(--white)", color: "var(--ink)", border: "1.5px solid var(--ink)", borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}>Back</button>
                  <button onClick={() => selectedStaffId ? (setError(null), goNext()) : setError("Please select a specialist")} style={{ flex: 1, padding: 16, background: "var(--ink)", color: "var(--cream)", border: "none", borderRadius: 50, fontSize: 16, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}>Continue</button>
                </div>
              </>
            )}

            {/* Step 3: Date & Time */}
            {step === 3 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8, fontFamily: "var(--font-heading)", color: "var(--ink)", letterSpacing: "-0.02em" }}>Pick Date & Time</h1>
                <p style={{ color: "var(--ink-muted)", marginBottom: 32, fontSize: 15 }}>Choose when you would like to visit</p>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 10, color: "var(--ink-light)" }}>Date</label>
                  <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); setReservationExpiry(null); }} min={new Date().toISOString().split("T")[0]} style={{
                    width: "100%",
                    padding: 14,
                    border: "1px solid var(--cream-dark)",
                    borderRadius: 12,
                    fontSize: 16,
                    background: "var(--white)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-body)"
                  }} />
                </div>
                {loadingAvailability ? <p style={{ color: "var(--ink-muted)" }}>Checking availability...</p> : isSelectedStaffOff ? (
                  <div style={{ padding: 18, background: "var(--gold-light)", borderRadius: 16, marginBottom: 24 }}>
                    <strong style={{ color: "var(--ink)" }}>{currentStaff?.name || "This specialist"} is not available on this date</strong>
                    <p style={{ color: "var(--ink-light)", margin: "6px 0 0", fontSize: 14 }}>Please select another date or choose a different specialist.</p>
                  </div>
                ) : noStaffAvailable ? (
                  <div style={{ padding: 18, background: "var(--gold-light)", borderRadius: 16, marginBottom: 24 }}>
                    <strong style={{ color: "var(--ink)" }}>No staff available on this date</strong>
                    <p style={{ color: "var(--ink-light)", margin: "6px 0 0", fontSize: 14 }}>Please select another date.</p>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div style={{ padding: 20, background: "var(--rose-pale)", borderRadius: 16, color: "var(--rose)", textAlign: "center", fontSize: 14 }}>No available times. Please select another date.</div>
                ) : (
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 14, color: "var(--ink-light)" }}>Available Times</label>

                    {/* Off-Peak Info Banner */}
                    {discounts.length > 0 && currentService && discounts.some(d => d.serviceIds.includes(currentService.id)) && (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 16px",
                        background: "var(--gold-light)",
                        borderRadius: 12,
                        marginBottom: 20,
                        border: "1px solid var(--gold)"
                      }}>
                        <span style={{ fontSize: 16 }}>✦</span>
                        <span style={{ fontSize: 14, color: "var(--ink)" }}>
                          <strong>Off-Peak prices</strong> available — look for gold slots to save!
                        </span>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                              padding: "16px 18px",
                              borderRadius: 12,
                              border: isSelected ? "2px solid var(--rose)" : isOffPeak ? "1px solid var(--gold)" : "1px solid var(--cream-dark)",
                              background: isSelected ? "var(--rose)" : past ? "var(--cream)" : isOffPeak ? "var(--gold-light)" : "var(--white)",
                              cursor: past || reserving ? "not-allowed" : "pointer",
                              opacity: past ? 0.5 : 1,
                              transition: "all 0.2s ease",
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 12, pointerEvents: "none" }}>
                              <span style={{
                                fontSize: 16,
                                fontWeight: 600,
                                color: isSelected ? "var(--white)" : "var(--ink)"
                              }}>
                                {time}
                              </span>
                              {isOffPeak && !isSelected && slotDiscount && (
                                <span style={{
                                  padding: "4px 10px",
                                  borderRadius: 50,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: "var(--gold)",
                                  color: "var(--white)",
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
                                    color: isSelected ? "rgba(255,255,255,0.7)" : "var(--ink-muted)",
                                    textDecoration: "line-through"
                                  }}>
                                    £{originalPrice}
                                  </span>
                                  <span style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    fontFamily: "var(--font-heading)",
                                    color: isSelected ? "var(--white)" : "var(--ink)"
                                  }}>
                                    £{discountedPrice.toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span style={{
                                  fontSize: 16,
                                  fontWeight: 600,
                                  fontFamily: "var(--font-heading)",
                                  color: isSelected ? "var(--white)" : "var(--ink-light)"
                                }}>
                                  £{originalPrice}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {reserving && <p style={{ color: "var(--rose)", marginTop: 14, fontSize: 14 }}>Reserving...</p>}
                  </div>
                )}
                {isAnyStaff && assignedStaffId && selectedTime && <div style={{ padding: 16, background: "var(--sage-light)", borderRadius: 12, color: "var(--ink)", marginBottom: 24, fontSize: 14, display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: "var(--sage)" }}>✓</span> {staff.find(s => s.id === assignedStaffId)?.name} will be your specialist</div>}
                {reservationTimer > 0 && <div style={{ padding: 16, background: "var(--gold-light)", borderRadius: 12, color: "var(--ink)", textAlign: "center", marginBottom: 24, fontSize: 14 }}>⏱ Slot reserved for <strong>{formatTimer(reservationTimer)}</strong></div>}
                <div style={{ padding: 20, background: "var(--white)", borderRadius: 16, border: "1px solid var(--cream-dark)", marginBottom: 24 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 14, cursor: "pointer" }}>
                    <input type="checkbox" checked={policyAgreed} onChange={(e) => setPolicyAgreed(e.target.checked)} style={{ width: 22, height: 22, marginTop: 2, accentColor: "var(--rose)" }} />
                    <span style={{ fontSize: 14, color: "var(--ink-light)", lineHeight: 1.6 }}>I have read and agree to the <strong style={{ color: "var(--ink)" }}>Booking Policy</strong>. I understand the payment terms and cancellation policy.</span>
                  </label>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={goBack} style={{ padding: "14px 24px", background: "var(--white)", color: "var(--ink)", border: "1.5px solid var(--ink)", borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}>Back</button>
                  <button onClick={() => { if (!selectedTime) { setError("Please select a time"); return; } if (!policyAgreed) { setError("Please agree to the booking policy"); return; } setError(null); goNext(); }} style={{ flex: 1, padding: 16, background: policyAgreed ? "var(--ink)" : "var(--cream-dark)", color: policyAgreed ? "var(--cream)" : "var(--ink-muted)", border: "none", borderRadius: 50, fontSize: 16, fontWeight: 600, cursor: policyAgreed ? "pointer" : "not-allowed", transition: "all 0.2s ease" }}>Continue</button>
                </div>
              </>
            )}

            {/* Step 4: Customer Info */}
            {step === 4 && (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8, fontFamily: "var(--font-heading)", color: "var(--ink)", letterSpacing: "-0.02em" }}>Your Details</h1>
                <p style={{ color: "var(--ink-muted)", marginBottom: 32, fontSize: 15 }}>We will send your confirmation here</p>
                {reservationTimer > 0 && <div style={{ padding: 16, background: "var(--gold-light)", borderRadius: 12, color: "var(--ink)", textAlign: "center", marginBottom: 24, fontSize: 14 }}>⏱ Complete within <strong>{formatTimer(reservationTimer)}</strong></div>}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 10, color: "var(--ink-light)" }}>Full Name</label>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter your name" required style={{
                      width: "100%",
                      padding: 16,
                      border: "1px solid var(--cream-dark)",
                      borderRadius: 12,
                      fontSize: 16,
                      background: "var(--white)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-body)"
                    }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 10, color: "var(--ink-light)" }}>Phone</label>
                    <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07xxx xxxxxx" required style={{
                      width: "100%",
                      padding: 16,
                      border: "1px solid var(--cream-dark)",
                      borderRadius: 12,
                      fontSize: 16,
                      background: "var(--white)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-body)"
                    }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 10, color: "var(--ink-light)" }}>Email</label>
                    <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="you@example.com" required style={{
                      width: "100%",
                      padding: 16,
                      border: "1px solid var(--cream-dark)",
                      borderRadius: 12,
                      fontSize: 16,
                      background: "var(--white)",
                      color: "var(--ink)",
                      fontFamily: "var(--font-body)"
                    }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                    <button type="button" onClick={goBack} style={{ padding: "14px 24px", background: "var(--white)", color: "var(--ink)", border: "1.5px solid var(--ink)", borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}>Back</button>
                    <button type="submit" disabled={submitting || reservationTimer === 0} style={{ flex: 1, padding: 16, background: "var(--ink)", color: "var(--cream)", border: "none", borderRadius: 50, fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: submitting || reservationTimer === 0 ? 0.5 : 1, transition: "all 0.2s ease" }}>{submitting ? "Booking..." : "Confirm Booking"}</button>
                  </div>
                </form>
              </>
            )}

            {/* Step 5: Confirmation */}
            {step === 5 && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--sage)", color: "var(--white)", fontSize: 36, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>✓</div>
                <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 10, fontFamily: "var(--font-heading)", color: "var(--ink)", letterSpacing: "-0.02em" }}>You are all set!</h1>
                <p style={{ color: "var(--ink-muted)", marginBottom: 32, fontSize: 16 }}>Your appointment has been confirmed</p>
                <div style={{ background: "var(--white)", borderRadius: 20, padding: 24, textAlign: "left", marginBottom: 24, border: "1px solid var(--cream-dark)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--cream-dark)", fontSize: 15 }}><span style={{ color: "var(--ink-muted)" }}>Service</span><span style={{ fontWeight: 600, color: "var(--ink)" }}>{currentService?.name}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--cream-dark)", fontSize: 15 }}><span style={{ color: "var(--ink-muted)" }}>Specialist</span><span style={{ fontWeight: 600, color: "var(--ink)" }}>{currentStaff?.name}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--cream-dark)", fontSize: 15 }}><span style={{ color: "var(--ink-muted)" }}>Date & Time</span><span style={{ fontWeight: 600, color: "var(--ink)" }}>{selectedDate} at {selectedTime}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--cream-dark)", fontSize: 15 }}>
                    <span style={{ color: "var(--ink-muted)" }}>Price</span>
                    <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
                      {currentDiscount ? (
                        <>
                          <span style={{ background: "var(--gold)", color: "var(--white)", padding: "4px 10px", borderRadius: 50, fontSize: 11, fontWeight: 600 }}>{currentDiscount.discountPercent}% OFF</span>
                          <span style={{ color: "var(--ink-muted)", textDecoration: "line-through", fontSize: 13 }}>£{currentService?.price}</span>
                          <span style={{ color: "var(--ink)", fontFamily: "var(--font-heading)", fontSize: 18 }}>£{finalPrice.toFixed(2)}</span>
                        </>
                      ) : (
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "var(--ink)" }}>£{currentService?.price}</span>
                      )}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", fontSize: 15 }}><span style={{ color: "var(--ink-muted)" }}>Booking ID</span><span style={{ fontWeight: 600, color: "var(--ink)", fontFamily: "monospace" }}>{successAppointmentId?.slice(0, 8).toUpperCase()}</span></div>
                </div>
                <p style={{ color: "var(--ink-muted)", marginBottom: 28, fontSize: 15 }}>✉️ Confirmation sent to {customerEmail}</p>
                <button onClick={() => { sessionStorage.setItem('booking_session_id', generateSessionId()); window.location.reload(); }} style={{ padding: "16px 32px", background: "var(--ink)", color: "var(--cream)", border: "none", borderRadius: 50, fontSize: 16, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}>Book Another</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
