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
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
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

  // Calendar helper functions
  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Get the day of week for the first day (0 = Sunday, we want Monday = 0)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6; // Sunday becomes 6

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatDateForState = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isDatePast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const isDateSelected = (date: Date) => {
    return selectedDate === formatDateForState(date);
  };

  const isDateToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const goToPrevMonth = () => {
    const now = new Date();
    const prevMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    // Don't go before current month
    if (prevMonth.getFullYear() > now.getFullYear() ||
        (prevMonth.getFullYear() === now.getFullYear() && prevMonth.getMonth() >= now.getMonth())) {
      setCalendarMonth(prevMonth);
    }
  };

  const goToNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const canGoPrevMonth = () => {
    const now = new Date();
    return calendarMonth.getFullYear() > now.getFullYear() ||
           (calendarMonth.getFullYear() === now.getFullYear() && calendarMonth.getMonth() > now.getMonth());
  };

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

  // Load initial data - single API call for all booking data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`${apiBase}/booking-data`);

        if (!res.ok) {
          setNotFound(true);
          return;
        }

        const data = await res.json();

        setServices(data.services || []);
        setCategories(data.categories || []);
        setPolicyTitle(data.policy?.title || "Our Booking Policy");
        setPolicyItems(data.policy?.policies || []);
        setSalonName(data.salon?.name || slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
        setDiscounts(data.discounts || []);
        // Auto-expand first category
        if (data.categories?.length > 0) {
          setSelectedCategoryId(data.categories[0].id);
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

  const isTimeSlotPast = (time: string) => {
    const now = new Date(), today = now.toISOString().split("T")[0];
    if (selectedDate > today) return false;
    if (selectedDate < today) return true;
    const [h, m] = time.split(":").map(Number);
    const slot = new Date(); slot.setHours(h, m, 0, 0);
    return slot <= now;
  };

  const timeSlots = generateTimeSlots();
  // Filter out past time slots when today is selected
  const availableTimeSlots = timeSlots.filter(time => !isTimeSlotPast(time));
  const selectedStaffAvailability = selectedStaffId && selectedStaffId !== "any" ? allStaffAvailability[selectedStaffId] : null;
  const isSelectedStaffOff = selectedStaffAvailability && !selectedStaffAvailability.available;
  const noStaffAvailable = selectedStaffId === "any" && Object.values(allStaffAvailability).every(a => !a.available);

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

  // Step labels for mobile indicator
  const stepLabels = ["Service", "Specialist", "Date & Time", "Your Info", "Confirmed"];

  // Check if current step can proceed
  const canProceed = () => {
    if (step === 1) return !!selectedServiceId;
    if (step === 2) return !!selectedStaffId;
    if (step === 3) return !!selectedTime;
    if (step === 4) return !!customerName && !!customerPhone && !!customerEmail && policyAgreed && reservationTimer > 0;
    return false;
  };

  // Get sticky bar text
  const getStickyBarText = () => {
    if (step === 1) {
      if (!selectedServiceId) return "Select a service";
      return `${currentService?.name} · £${currentService?.price}`;
    }
    if (step === 2) {
      if (!selectedStaffId) return "Select a specialist";
      return selectedStaffId === "any" ? "Any Available" : staff.find(s => s.id === selectedStaffId)?.name || "";
    }
    if (step === 3) {
      if (!selectedTime) return "Select a time";
      return `${selectedTime} · ${currentService?.name}`;
    }
    if (step === 4) {
      if (!customerName || !customerPhone || !customerEmail) return "Fill in your details";
      if (!policyAgreed) return "Agree to policy to confirm";
      return "Confirm your booking";
    }
    return "";
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--ink)", fontFamily: "var(--font-body)" }}>
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .main-content {
            margin-left: 0 !important;
            border-radius: 0 !important;
            padding: 20px 16px 100px 16px !important;
            min-height: calc(100vh - 56px) !important;
          }
          .mobile-header { display: block !important; }
          .mobile-sticky-bar { display: flex !important; }
          .desktop-buttons { display: none !important; }
          .category-tabs {
            overflow-x: auto !important;
            flex-wrap: nowrap !important;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .category-tabs::-webkit-scrollbar { display: none; }
          .category-tab { flex-shrink: 0 !important; }
        }
        @media (min-width: 769px) {
          .mobile-header { display: none !important; }
          .mobile-sticky-bar { display: none !important; }
        }
      `}</style>

      {/* Mobile Header - Horizontal Step Indicator */}
      <div className="mobile-header" style={{ display: "none", background: "var(--ink)", padding: "12px 16px", position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid rgba(251,248,244,0.1)" }}>
        {/* Salon name row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--rose)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12 }}>{salonName.charAt(0)}</div>
            <span style={{ color: "var(--cream)", fontSize: 14, fontWeight: 600, fontFamily: "var(--font-heading)" }}>{salonName}</span>
          </div>
          {reservationTimer > 0 && (
            <div style={{ color: "var(--gold)", fontSize: 12, fontWeight: 600 }}>⏱ {formatTimer(reservationTimer)}</div>
          )}
        </div>
        {/* Step indicator dots */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: step === n ? 28 : 10,
                height: 10,
                borderRadius: 5,
                background: step > n ? "var(--sage)" : step === n ? "var(--rose)" : "rgba(251,248,244,0.2)",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {step > n && <span style={{ fontSize: 8, color: "#fff" }}>✓</span>}
              </div>
            </div>
          ))}
        </div>
        {/* Current step label */}
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <span style={{ color: "var(--cream)", fontSize: 12, fontWeight: 500 }}>{stepLabels[step - 1]}</span>
        </div>
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
                <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 600, marginBottom: 6, fontFamily: "var(--font-heading)", color: "var(--ink)", letterSpacing: "-0.02em" }}>Choose a Service</h1>
                <p style={{ color: "var(--ink-muted)", marginBottom: isMobile ? 20 : 32, fontSize: 14 }}>Select the service you would like to book</p>

                {/* Category Accordions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: isMobile ? 120 : 0 }}>
                  {categories.map((cat) => {
                    const categoryServices = services.filter(s => s.categoryId === cat.id);
                    const isExpanded = selectedCategoryId === cat.id;
                    const hasSelectedService = categoryServices.some(s => s.id === selectedServiceId);

                    return (
                      <div key={cat.id} style={{
                        borderRadius: 16,
                        border: hasSelectedService ? "2px solid var(--rose)" : "1px solid var(--cream-dark)",
                        background: "var(--white)",
                        overflow: "hidden",
                        transition: "all 0.2s ease"
                      }}>
                        {/* Category Header - Accordion Toggle */}
                        <button
                          onClick={() => setSelectedCategoryId(isExpanded ? null : cat.id)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: isMobile ? "14px 16px" : "16px 20px",
                            background: isExpanded ? "var(--ink)" : "transparent",
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{
                              fontWeight: 600,
                              fontSize: isMobile ? 15 : 16,
                              color: isExpanded ? "var(--cream)" : "var(--ink)",
                              fontFamily: "var(--font-heading)"
                            }}>
                              {cat.name}
                            </span>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: 50,
                              fontSize: 12,
                              fontWeight: 500,
                              background: isExpanded ? "rgba(251,248,244,0.2)" : "var(--cream-dark)",
                              color: isExpanded ? "var(--cream)" : "var(--ink-muted)"
                            }}>
                              {categoryServices.length}
                            </span>
                            {hasSelectedService && !isExpanded && (
                              <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "var(--rose)"
                              }} />
                            )}
                          </div>
                          <span style={{
                            fontSize: 18,
                            color: isExpanded ? "var(--cream)" : "var(--ink-muted)",
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s ease"
                          }}>
                            ▼
                          </span>
                        </button>

                        {/* Services List - Collapsible */}
                        {isExpanded && (
                          <div style={{ padding: isMobile ? "8px 12px 12px" : "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                            {categoryServices.map((service) => {
                              // Find the best CURRENTLY VALID discount available for this service
                              const today = new Date().toISOString().split('T')[0];
                              const serviceDiscounts = discounts.filter(d => {
                                if (!d.serviceIds.includes(service.id)) return false;
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
                                  padding: isMobile ? 14 : 16,
                                  borderRadius: 12,
                                  border: selectedServiceId === service.id ? "2px solid var(--rose)" : "1px solid var(--cream-dark)",
                                  background: selectedServiceId === service.id ? "var(--rose-pale)" : "var(--cream)",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease"
                                }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                        <span style={{ fontWeight: 600, fontSize: isMobile ? 14 : 15, color: "var(--ink)" }}>{service.name}</span>
                                        {bestDiscount && (
                                          <span style={{
                                            padding: "3px 8px",
                                            borderRadius: 50,
                                            fontSize: 10,
                                            fontWeight: 600,
                                            background: "var(--gold-light)",
                                            color: "var(--gold)",
                                          }}>
                                            {bestDiscount.discountPercent}% OFF
                                          </span>
                                        )}
                                      </div>
                                      {service.description && (
                                        <div style={{ color: "var(--ink-light)", fontSize: 13, marginBottom: 6, lineHeight: 1.4 }}>
                                          {selectedServiceId === service.id
                                            ? service.description
                                            : service.description.length > 50
                                              ? service.description.slice(0, 50) + '...'
                                              : service.description}
                                        </div>
                                      )}
                                      <div style={{
                                        display: "inline-flex",
                                        padding: "3px 10px",
                                        background: selectedServiceId === service.id ? "var(--white)" : "var(--white)",
                                        borderRadius: 50,
                                        color: "var(--ink-muted)",
                                        fontSize: 12
                                      }}>{service.durationMinutes} min</div>
                                    </div>
                                    <div style={{ textAlign: "right", marginLeft: 12, flexShrink: 0 }}>
                                      {bestDiscount ? (
                                        <>
                                          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: isMobile ? 15 : 16, color: "var(--ink)" }}>
                                            £{discountedPrice.toFixed(2)}
                                          </div>
                                          <div style={{
                                            fontSize: 12,
                                            color: "var(--ink-muted)",
                                            textDecoration: "line-through"
                                          }}>
                                            £{service.price}
                                          </div>
                                        </>
                                      ) : (
                                        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: isMobile ? 15 : 16, color: "var(--ink)" }}>£{service.price}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="desktop-buttons" style={{ marginTop: 32 }}>
                  <button onClick={() => selectedServiceId ? (setError(null), goNext()) : setError("Please select a service")} style={{
                    width: "100%",
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
                </div>
              </>
            )}

            {/* Step 2: Staff */}
            {step === 2 && (
              <>
                <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 600, marginBottom: 6, fontFamily: "var(--font-heading)", color: "var(--ink)", letterSpacing: "-0.02em" }}>Choose a Specialist</h1>
                <p style={{ color: "var(--ink-muted)", marginBottom: isMobile ? 20 : 32, fontSize: 14 }}>Select your preferred technician or let us assign one</p>
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
                <div className="desktop-buttons" style={{ display: "flex", gap: 12, marginTop: 32 }}>
                  <button onClick={goBack} style={{ padding: "14px 24px", background: "var(--white)", color: "var(--ink)", border: "1.5px solid var(--ink)", borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}>Back</button>
                  <button onClick={() => selectedStaffId ? (setError(null), goNext()) : setError("Please select a specialist")} style={{ flex: 1, padding: 16, background: "var(--ink)", color: "var(--cream)", border: "none", borderRadius: 50, fontSize: 16, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}>Continue</button>
                </div>
              </>
            )}

            {/* Step 3: Date & Time */}
            {step === 3 && (
              <>
                <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 600, marginBottom: 6, fontFamily: "var(--font-heading)", color: "var(--ink)", letterSpacing: "-0.02em" }}>Pick Date & Time</h1>
                <p style={{ color: "var(--ink-muted)", marginBottom: isMobile ? 20 : 32, fontSize: 14 }}>Choose when you would like to visit</p>
                {/* Calendar View */}
                <div style={{ marginBottom: 24, background: "var(--white)", borderRadius: 16, border: "1px solid var(--cream-dark)", overflow: "hidden" }}>
                  {/* Calendar Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "12px 12px" : "14px 16px", background: "var(--ink)", color: "var(--cream)" }}>
                    <button
                      onClick={goToPrevMonth}
                      disabled={!canGoPrevMonth()}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        border: "none",
                        background: canGoPrevMonth() ? "rgba(251,248,244,0.15)" : "transparent",
                        color: canGoPrevMonth() ? "var(--cream)" : "rgba(251,248,244,0.3)",
                        fontSize: 18,
                        cursor: canGoPrevMonth() ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      ‹
                    </button>
                    <span style={{ fontWeight: 600, fontSize: isMobile ? 15 : 16, fontFamily: "var(--font-heading)" }}>
                      {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                    </span>
                    <button
                      onClick={goToNextMonth}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(251,248,244,0.15)",
                        color: "var(--cream)",
                        fontSize: 18,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      ›
                    </button>
                  </div>

                  {/* Day Names Header */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--cream-dark)" }}>
                    {dayNames.map((day) => (
                      <div key={day} style={{
                        padding: isMobile ? "8px 0" : "10px 0",
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ink-muted)",
                        textTransform: "uppercase"
                      }}>
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: isMobile ? 6 : 8, gap: isMobile ? 4 : 6 }}>
                    {getCalendarDays().map((date, index) => {
                      if (!date) {
                        return <div key={`empty-${index}`} style={{ aspectRatio: "1", minHeight: isMobile ? 40 : 44 }} />;
                      }

                      const isPast = isDatePast(date);
                      const isSelected = isDateSelected(date);
                      const isToday = isDateToday(date);

                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => {
                            if (!isPast) {
                              setSelectedDate(formatDateForState(date));
                              setSelectedTime("");
                              setReservationExpiry(null);
                            }
                          }}
                          disabled={isPast}
                          style={{
                            aspectRatio: "1",
                            minHeight: isMobile ? 40 : 44,
                            border: isSelected ? "2px solid var(--rose)" : isToday ? "2px solid var(--ink)" : "1px solid transparent",
                            borderRadius: isMobile ? 10 : 12,
                            background: isSelected ? "var(--rose)" : isPast ? "transparent" : "var(--cream)",
                            color: isSelected ? "var(--white)" : isPast ? "var(--ink-muted)" : "var(--ink)",
                            fontSize: isMobile ? 14 : 15,
                            fontWeight: isSelected || isToday ? 600 : 500,
                            cursor: isPast ? "not-allowed" : "pointer",
                            opacity: isPast ? 0.4 : 1,
                            transition: "all 0.15s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-body)"
                          }}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Date Display */}
                {selectedDate && (
                  <div style={{ marginBottom: 20, padding: "12px 16px", background: "var(--rose-pale)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>📅</span>
                    <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
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
                ) : availableTimeSlots.length === 0 ? (
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
                      {availableTimeSlots.map((time) => {
                        const slotDiscount = currentService ? getApplicableDiscount(currentService.id, selectedDate, time, isAnyStaff ? undefined : selectedStaffId) : null;
                        const originalPrice = currentService?.price || 0;
                        const discountedPrice = slotDiscount ? getDiscountedPrice(originalPrice, slotDiscount) : originalPrice;
                        const isOffPeak = slotDiscount !== null;
                        const isSelected = selectedTime === time;

                        return (
                          <button
                            type="button"
                            key={time}
                            disabled={reserving}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!reserving) {
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
                              background: isSelected ? "var(--rose)" : isOffPeak ? "var(--gold-light)" : "var(--white)",
                              cursor: reserving ? "not-allowed" : "pointer",
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
                <div className="desktop-buttons" style={{ display: "flex", gap: 12 }}>
                  <button onClick={goBack} style={{ padding: "14px 24px", background: "var(--white)", color: "var(--ink)", border: "1.5px solid var(--ink)", borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}>Back</button>
                  <button onClick={() => { if (!selectedTime) { setError("Please select a time"); return; } setError(null); goNext(); }} style={{ flex: 1, padding: 16, background: selectedTime ? "var(--ink)" : "var(--cream-dark)", color: selectedTime ? "var(--cream)" : "var(--ink-muted)", border: "none", borderRadius: 50, fontSize: 16, fontWeight: 600, cursor: selectedTime ? "pointer" : "not-allowed", transition: "all 0.2s ease" }}>Continue</button>
                </div>
              </>
            )}

            {/* Step 4: Customer Info */}
            {step === 4 && (
              <>
                <h1 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 600, marginBottom: 8, fontFamily: "var(--font-heading)", color: "var(--ink)", letterSpacing: "-0.02em" }}>Your Details</h1>
                <p style={{ color: "var(--ink-muted)", marginBottom: isMobile ? 20 : 32, fontSize: 15 }}>We will send your confirmation here</p>
                {reservationTimer > 0 && (
                  <div style={{ padding: 14, background: "var(--gold-light)", borderRadius: 12, color: "var(--ink)", textAlign: "center", marginBottom: 20, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span>⏱</span>
                    <span>Complete within <strong>{formatTimer(reservationTimer)}</strong></span>
                  </div>
                )}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20, paddingBottom: isMobile ? 180 : 0 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "var(--ink-light)" }}>Full Name</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      onFocus={(e) => { if (isMobile) setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }}
                      placeholder="Enter your name"
                      required
                      autoComplete="name"
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        minHeight: 52,
                        border: "1px solid var(--cream-dark)",
                        borderRadius: 12,
                        fontSize: 16,
                        background: "var(--white)",
                        color: "var(--ink)",
                        fontFamily: "var(--font-body)",
                        boxSizing: "border-box",
                        WebkitAppearance: "none"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "var(--ink-light)" }}>Phone</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      onFocus={(e) => { if (isMobile) setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }}
                      placeholder="07xxx xxxxxx"
                      required
                      autoComplete="tel"
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        minHeight: 52,
                        border: "1px solid var(--cream-dark)",
                        borderRadius: 12,
                        fontSize: 16,
                        background: "var(--white)",
                        color: "var(--ink)",
                        fontFamily: "var(--font-body)",
                        boxSizing: "border-box",
                        WebkitAppearance: "none"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "var(--ink-light)" }}>Email</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      onFocus={(e) => { if (isMobile) setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300); }}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        minHeight: 52,
                        border: "1px solid var(--cream-dark)",
                        borderRadius: 12,
                        fontSize: 16,
                        background: "var(--white)",
                        color: "var(--ink)",
                        fontFamily: "var(--font-body)",
                        boxSizing: "border-box",
                        WebkitAppearance: "none"
                      }}
                    />
                  </div>

                  {/* Policy Summary */}
                  <div style={{ background: "var(--cream)", borderRadius: 16, padding: isMobile ? 16 : 20, marginTop: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>Booking Policy</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>💷</span>
                        <span style={{ fontSize: 13, color: "var(--ink-light)", lineHeight: 1.4 }}><strong style={{ color: "var(--ink)" }}>Cash only</strong> — Payment is due at the salon</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>⏰</span>
                        <span style={{ fontSize: 13, color: "var(--ink-light)", lineHeight: 1.4 }}><strong style={{ color: "var(--ink)" }}>2hr cancellation</strong> — Please cancel at least 2 hours before your appointment</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>🚫</span>
                        <span style={{ fontSize: 13, color: "var(--ink-light)", lineHeight: 1.4 }}><strong style={{ color: "var(--ink)" }}>3 no-shows</strong> — Accounts with 3+ no-shows may be restricted</span>
                      </div>
                    </div>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", padding: "12px 0 0", borderTop: "1px solid var(--cream-dark)" }}>
                      <input type="checkbox" checked={policyAgreed} onChange={(e) => setPolicyAgreed(e.target.checked)} style={{ width: 22, height: 22, minWidth: 22, marginTop: 2, accentColor: "var(--rose)", cursor: "pointer" }} />
                      <span style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>I agree to the booking policy</span>
                    </label>
                  </div>

                  <div className="desktop-buttons" style={{ display: "flex", gap: 12, marginTop: 16 }}>
                    <button type="button" onClick={goBack} style={{ padding: "14px 24px", background: "var(--white)", color: "var(--ink)", border: "1.5px solid var(--ink)", borderRadius: 50, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease" }}>Back</button>
                    <button type="submit" disabled={submitting || reservationTimer === 0 || !policyAgreed} style={{ flex: 1, padding: 16, background: policyAgreed ? "var(--ink)" : "var(--cream-dark)", color: policyAgreed ? "var(--cream)" : "var(--ink-muted)", border: "none", borderRadius: 50, fontSize: 16, fontWeight: 600, cursor: policyAgreed ? "pointer" : "not-allowed", opacity: submitting || reservationTimer === 0 ? 0.5 : 1, transition: "all 0.2s ease" }}>{submitting ? "Booking..." : "Confirm Booking"}</button>
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

      {/* Mobile Sticky Bottom Bar */}
      {step < 5 && (
        <div className="mobile-sticky-bar" style={{
          display: "none",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--white)",
          borderTop: "1px solid var(--cream-dark)",
          padding: "12px 16px",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          zIndex: 200,
          flexDirection: "column",
          gap: 8,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.1)"
        }}>
          {/* Selection summary */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 2 }}>
                {step === 1 && "Selected service"}
                {step === 2 && "Selected specialist"}
                {step === 3 && "Selected time"}
                {step === 4 && "Complete booking"}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {getStickyBarText()}
              </div>
            </div>
            {currentService && step >= 1 && (
              <div style={{ textAlign: "right", marginLeft: 12 }}>
                {currentDiscount ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, color: "var(--ink-muted)", textDecoration: "line-through" }}>£{currentService.price}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-heading)" }}>£{finalPrice.toFixed(2)}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-heading)" }}>£{currentService.price}</span>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            {step > 1 && (
              <button
                onClick={goBack}
                style={{
                  padding: "14px 20px",
                  background: "var(--white)",
                  color: "var(--ink)",
                  border: "1.5px solid var(--ink)",
                  borderRadius: 50,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (step === 1) {
                  if (!selectedServiceId) { setError("Please select a service"); return; }
                  setError(null); goNext();
                } else if (step === 2) {
                  if (!selectedStaffId) { setError("Please select a specialist"); return; }
                  setError(null); goNext();
                } else if (step === 3) {
                  if (!selectedTime) { setError("Please select a time"); return; }
                  setError(null); goNext();
                } else if (step === 4) {
                  // Trigger form submit
                  const form = document.querySelector("form");
                  if (form) form.requestSubmit();
                }
              }}
              disabled={!canProceed() || (step === 4 && submitting)}
              style={{
                flex: 1,
                padding: "14px 24px",
                background: canProceed() ? "var(--ink)" : "var(--cream-dark)",
                color: canProceed() ? "var(--cream)" : "var(--ink-muted)",
                border: "none",
                borderRadius: 50,
                fontSize: 16,
                fontWeight: 600,
                cursor: canProceed() ? "pointer" : "not-allowed",
                minHeight: 52,
                transition: "all 0.2s ease"
              }}
            >
              {step === 4 ? (submitting ? "Booking..." : "Confirm Booking") : "Continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
