"use client";

import { useEffect, useState, FormEvent } from "react";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  category?: string | null;
};

type Staff = {
  id: string;
  name: string;
  role?: string | null;
};

type WorkingHour = {
  staffId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
};

type Appointment = {
  id: string;
  staffId: string;
  startTime: string;
  endTime: string;
  status: string;
};

type Step = 1 | 2 | 3 | 4 | 5;

export default function BookingPage() {
  const [step, setStep] = useState<Step>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [allWorkingHours, setAllWorkingHours] = useState<WorkingHour[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);
  const [assignedStaffId, setAssignedStaffId] = useState<string>("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAppointmentId, setSuccessAppointmentId] = useState<string | null>(null);

  const isAnyStaff = selectedStaffId === "any";

  // Load services on mount
  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch("/api/services");
        const data = await res.json();
        setServices(data);
        setDataReady(true);
      } catch (err) {
        setError("Failed to load services. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  // Load staff when service is selected
  useEffect(() => {
    if (!selectedServiceId) return;
    
    async function loadStaff() {
      setLoadingStaff(true);
      try {
        const res = await fetch(`/api/staff?serviceId=${selectedServiceId}`);
        const data = await res.json();
        setStaff(data);
      } catch (err) {
        console.error("Failed to load staff:", err);
      } finally {
        setLoadingStaff(false);
      }
    }
    loadStaff();
  }, [selectedServiceId]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  // Load working hours when staff is selected
  useEffect(() => {
    if (!selectedStaffId) return;

    async function loadWorkingHours() {
      setLoadingHours(true);
      try {
        if (selectedStaffId === "any") {
          const res = await fetch(`/api/working-hours`);
          const data = await res.json();
          if (Array.isArray(data)) {
            setAllWorkingHours(data);
          }
        } else {
          const res = await fetch(`/api/working-hours?staffId=${selectedStaffId}`);
          const data = await res.json();
          if (Array.isArray(data)) {
            setWorkingHours(data);
          }
        }
      } catch (err) {
        console.error("Failed to load working hours:", err);
      } finally {
        setLoadingHours(false);
      }
    }
    loadWorkingHours();
  }, [selectedStaffId]);

  // Load existing appointments for the selected date
  useEffect(() => {
    if (!selectedDate || !isAnyStaff) return;

    async function loadAppointments() {
      try {
        const res = await fetch(`/api/appointments?date=${selectedDate}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setExistingAppointments(data);
        }
      } catch (err) {
        console.error("Failed to load appointments:", err);
      }
    }
    loadAppointments();
  }, [selectedDate, isAnyStaff]);

  const currentService = services.find((s) => s.id === selectedServiceId);
  const currentStaff = staff.find((s) => s.id === (assignedStaffId || selectedStaffId));

  const goNext = () => setStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev));
  const goBack = () => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));

  const getWorkingHoursForDate = () => {
    if (!selectedDate || workingHours.length === 0) return null;
    const dayOfWeek = new Date(selectedDate).getDay();
    return workingHours.find((h) => h.dayOfWeek === dayOfWeek);
  };

  const isStaffAvailable = (staffId: string, time: string): boolean => {
    const serviceDuration = currentService?.durationMinutes || 60;
    const slotStart = new Date(`${selectedDate}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

    const hasConflict = existingAppointments.some((apt) => {
      if (apt.staffId !== staffId || apt.status === "cancelled") return false;
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      return (slotStart < aptEnd && slotEnd > aptStart);
    });

    return !hasConflict;
  };

  const findAvailableStaff = (time: string): string | null => {
    const dayOfWeek = new Date(selectedDate).getDay();
    
    for (const member of staff) {
      const staffHours = allWorkingHours.find(
        (h) => h.staffId === member.id && h.dayOfWeek === dayOfWeek && h.isWorking
      );
      if (!staffHours) continue;

      const [timeH, timeM] = time.split(":").map(Number);
      const [startH, startM] = staffHours.startTime.split(":").map(Number);
      const [endH, endM] = staffHours.endTime.split(":").map(Number);
      
      const timeMinutes = timeH * 60 + timeM;
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      if (timeMinutes < startMinutes || timeMinutes >= endMinutes) continue;

      if (isStaffAvailable(member.id, time)) {
        return member.id;
      }
    }
    return null;
  };

  const generateAnySlotsTimeSlots = () => {
    if (!selectedDate || allWorkingHours.length === 0) return [];
    
    const dayOfWeek = new Date(selectedDate).getDay();
    const slots: string[] = [];
    const addedSlots = new Set<string>();

    let earliestStart = 24 * 60;
    let latestEnd = 0;

    for (const member of staff) {
      const hours = allWorkingHours.find(
        (h) => h.staffId === member.id && h.dayOfWeek === dayOfWeek && h.isWorking
      );
      if (!hours) continue;

      const [startH, startM] = hours.startTime.split(":").map(Number);
      const [endH, endM] = hours.endTime.split(":").map(Number);
      
      earliestStart = Math.min(earliestStart, startH * 60 + startM);
      latestEnd = Math.max(latestEnd, endH * 60 + endM);
    }

    if (earliestStart >= latestEnd) return [];

    for (let minutes = earliestStart; minutes < latestEnd; minutes += 30) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      
      if (findAvailableStaff(time)) {
        if (!addedSlots.has(time)) {
          slots.push(time);
          addedSlots.add(time);
        }
      }
    }

    return slots;
  };

  const generateTimeSlots = () => {
    if (isAnyStaff) {
      return generateAnySlotsTimeSlots();
    }

    const todayHours = getWorkingHoursForDate();
    if (!todayHours || !todayHours.isWorking) return [];

    const slots: string[] = [];
    const [startH, startM] = todayHours.startTime.split(":").map(Number);
    const [endH, endM] = todayHours.endTime.split(":").map(Number);

    let currentH = startH;
    let currentM = startM;

    while (currentH < endH || (currentH === endH && currentM < endM)) {
      slots.push(`${currentH.toString().padStart(2, "0")}:${currentM.toString().padStart(2, "0")}`);
      currentM += 30;
      if (currentM >= 60) {
        currentM = 0;
        currentH += 1;
      }
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();
  const todayHours = getWorkingHoursForDate();

  const isTimeSlotPast = (time: string) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    if (selectedDate > today) return false;
    if (selectedDate < today) return true;

    const [hours, minutes] = time.split(":").map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return slotTime <= now;
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (isAnyStaff) {
      const availableStaffId = findAvailableStaff(time);
      setAssignedStaffId(availableStaffId || "");
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const finalStaffId = isAnyStaff ? assignedStaffId : selectedStaffId;

    if (!selectedServiceId || !finalStaffId || !selectedDate || !selectedTime) {
      setError("Please complete all selections.");
      return;
    }

    if (!customerName || !customerPhone || !customerEmail) {
      setError("Please fill in your details.");
      return;
    }

    setSubmitting(true);

    try {
      const startTimeIso = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          staffId: finalStaffId,
          customerName,
          customerPhone,
          customerEmail,
          startTime: startTimeIso,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create appointment");
      }

      const appointment = await res.json();
      setSuccessAppointmentId(appointment.id);
      setStep(5);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !dataReady) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading services...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Book an Appointment</h1>
        <p style={styles.subtitle}>Easy booking in 4 simple steps</p>

        <div style={styles.progress}>
          {["Service", "Staff", "Time", "Details", "Done"].map((label, i) => (
            <div key={label} style={styles.stepItem}>
              <div style={{
                ...styles.stepCircle,
                backgroundColor: step > i ? "#10B981" : step === i + 1 ? "#EC4899" : "#E5E7EB",
                color: step >= i + 1 ? "#FFFFFF" : "#6B7280",
              }}>
                {step > i ? "✓" : i + 1}
              </div>
              <span style={styles.stepLabel}>{label}</span>
            </div>
          ))}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* STEP 1: Select Service */}
        {step === 1 && (
          <div>
            <h2 style={styles.stepTitle}>Select a Service</h2>
            <div style={styles.optionsList}>
              {services.map((service) => (
                <label key={service.id} style={{
                  ...styles.optionCard,
                  borderColor: selectedServiceId === service.id ? "#EC4899" : "#E5E7EB",
                  backgroundColor: selectedServiceId === service.id ? "#FCE7F3" : "#FFFFFF",
                }}>
                  <input
                    type="radio"
                    name="service"
                    value={service.id}
                    checked={selectedServiceId === service.id}
                    onChange={() => {
                      setSelectedServiceId(service.id);
                      setSelectedStaffId("");
                      setAssignedStaffId("");
                    }}
                    style={styles.radio}
                  />
                  <div style={styles.optionContent}>
                    <div style={styles.optionTitle}>{service.name}</div>
                    <div style={styles.optionMeta}>
                      {service.durationMinutes} mins • £{service.price}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div style={styles.footer}>
              <button style={styles.btnSecondary} disabled>Back</button>
              <button
                style={styles.btnPrimary}
                onClick={() => {
                  if (!selectedServiceId) {
                    setError("Please select a service first.");
                    return;
                  }
                  setError(null);
                  goNext();
                }}
              >
                Next: Choose Staff →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Select Staff */}
        {step === 2 && (
          <div>
            <h2 style={styles.stepTitle}>Select Staff Member</h2>
            <div style={styles.summary}>Service: <strong>{currentService?.name}</strong></div>
            
            {loadingStaff ? (
              <p>Loading staff...</p>
            ) : staff.length === 0 ? (
              <div style={styles.closedMessage}>
                No staff available for this service.
              </div>
            ) : (
              <div style={styles.optionsList}>
                {/* Any Available Staff Option */}
                <label style={{
                  ...styles.optionCard,
                  borderColor: selectedStaffId === "any" ? "#EC4899" : "#E5E7EB",
                  backgroundColor: selectedStaffId === "any" ? "#FCE7F3" : "#FFFFFF",
                }}>
                  <input
                    type="radio"
                    name="staff"
                    value="any"
                    checked={selectedStaffId === "any"}
                    onChange={() => {
                      setSelectedStaffId("any");
                      setAssignedStaffId("");
                      setSelectedTime("");
                    }}
                    style={styles.radio}
                  />
                  <div style={styles.optionContent}>
                    <div style={styles.optionTitle}>⭐ Any Available Staff</div>
                    <div style={styles.optionMeta}>First available technician</div>
                  </div>
                </label>

                {staff.map((member) => (
                  <label key={member.id} style={{
                    ...styles.optionCard,
                    borderColor: selectedStaffId === member.id ? "#EC4899" : "#E5E7EB",
                    backgroundColor: selectedStaffId === member.id ? "#FCE7F3" : "#FFFFFF",
                  }}>
                    <input
                      type="radio"
                      name="staff"
                      value={member.id}
                      checked={selectedStaffId === member.id}
                      onChange={() => {
                        setSelectedStaffId(member.id);
                        setAssignedStaffId("");
                        setSelectedTime("");
                      }}
                      style={styles.radio}
                    />
                    <div style={styles.optionContent}>
                      <div style={styles.optionTitle}>{member.name}</div>
                      <div style={styles.optionMeta}>{member.role || "Nail Technician"}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <div style={styles.footer}>
              <button style={styles.btnSecondary} onClick={goBack}>← Back</button>
              <button
                style={styles.btnPrimary}
                onClick={() => {
                  if (!selectedStaffId) {
                    setError("Please select a staff member.");
                    return;
                  }
                  setError(null);
                  goNext();
                }}
              >
                Next: Pick Time →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Select Date & Time */}
        {step === 3 && (
          <div>
            <h2 style={styles.stepTitle}>Select Date & Time</h2>
            <div style={styles.summary}>
              {currentService?.name} with <strong>{isAnyStaff ? "Any Available Staff" : currentStaff?.name}</strong>
              {isAnyStaff && assignedStaffId && selectedTime && (
                <div style={{ marginTop: 8, color: "#10B981" }}>
                  ✓ {staff.find(s => s.id === assignedStaffId)?.name} is available
                </div>
              )}
            </div>
            <label style={styles.label}>
              Date
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime("");
                  setAssignedStaffId("");
                }}
                min={new Date().toISOString().split("T")[0]}
                style={styles.input}
              />
            </label>
            {loadingHours ? (
              <p>Loading available times...</p>
            ) : !isAnyStaff && todayHours && !todayHours.isWorking ? (
              <div style={styles.closedMessage}>
                {currentStaff?.name} is not working on this day. Please select another date.
              </div>
            ) : timeSlots.length === 0 ? (
              <div style={styles.closedMessage}>
                No available times for this date.
              </div>
            ) : (
              <>
                <p style={{ marginBottom: 12, color: "#6B7280", fontSize: 14 }}>Available times:</p>
                <div style={styles.timeGrid}>
                  {timeSlots.map((time) => {
                    const isPast = isTimeSlotPast(time);
                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={isPast}
                        onClick={() => !isPast && handleTimeSelect(time)}
                        style={{
                          ...styles.timeSlot,
                          borderColor: selectedTime === time ? "#EC4899" : "#E5E7EB",
                          backgroundColor: isPast ? "#F3F4F6" : selectedTime === time ? "#FCE7F3" : "#FFFFFF",
                          color: isPast ? "#9CA3AF" : selectedTime === time ? "#EC4899" : "#374151",
                          cursor: isPast ? "not-allowed" : "pointer",
                        }}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <div style={styles.footer}>
              <button style={styles.btnSecondary} onClick={goBack}>← Back</button>
              <button
                style={styles.btnPrimary}
                onClick={() => {
                  if (!selectedTime) {
                    setError("Please select a time slot.");
                    return;
                  }
                  if (isAnyStaff && !assignedStaffId) {
                    setError("No staff available at this time.");
                    return;
                  }
                  setError(null);
                  goNext();
                }}
              >
                Next: Your Details →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Customer Details */}
        {step === 4 && (
          <div>
            <h2 style={styles.stepTitle}>Your Details</h2>
            <div style={styles.summary}>
              {currentService?.name} with {currentStaff?.name}<br />
              {selectedDate && selectedTime && new Date(`${selectedDate}T${selectedTime}`).toLocaleString("en-GB", {
                weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"
              })}
            </div>
            <form onSubmit={handleSubmit}>
              <label style={styles.label}>
                Full Name *
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="Enter your name"
                />
              </label>
              <label style={styles.label}>
                Phone Number *
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="07xxx xxxxxx"
                />
              </label>
              <label style={styles.label}>
                Email Address *
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="your@email.com"
                />
              </label>
              <div style={styles.footer}>
                <button type="button" style={styles.btnSecondary} onClick={goBack}>← Back</button>
                <button type="submit" style={styles.btnPrimary} disabled={submitting}>
                  {submitting ? "Booking..." : "Confirm Booking ✓"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 5: Success */}
        {step === 5 && (
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.successTitle}>Booking Confirmed!</h2>
            <p style={styles.successText}>
              Thank you, <strong>{customerName}</strong>! Your appointment has been booked.
            </p>
            <div style={styles.successDetails}>
              <div style={styles.successRow}>
                <span style={styles.successLabel}>Service:</span>
                <span style={styles.successValue}>{currentService?.name}</span>
              </div>
              <div style={styles.successRow}>
                <span style={styles.successLabel}>Staff:</span>
                <span style={styles.successValue}>{currentStaff?.name}</span>
              </div>
              <div style={styles.successRow}>
                <span style={styles.successLabel}>Time:</span>
                <span style={styles.successValue}>
                  {selectedDate && selectedTime && new Date(`${selectedDate}T${selectedTime}`).toLocaleString("en-GB", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              <div style={styles.successRow}>
                <span style={styles.successLabel}>Booking ID:</span>
                <span style={styles.successValue}>{successAppointmentId?.slice(0, 8)}</span>
              </div>
            </div>
            <p style={styles.successNote}>
              📧 A confirmation email has been sent to <strong>{customerEmail}</strong>
            </p>
            <button
              style={styles.btnPrimary}
              onClick={() => {
                setStep(1);
                setSelectedServiceId("");
                setSelectedStaffId("");
                setSelectedDate(new Date().toISOString().split("T")[0]);
                setSelectedTime("");
                setAssignedStaffId("");
                setCustomerName("");
                setCustomerPhone("");
                setCustomerEmail("");
                setSuccessAppointmentId(null);
              }}
            >
              Book Another Appointment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#F9FAFB",
    padding: "24px 16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  card: {
    maxWidth: 600,
    margin: "0 auto",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #E5E7EB",
    borderTop: "4px solid #EC4899",
    borderRadius: "50%",
  },
  loadingText: {
    marginTop: 16,
    color: "#6B7280",
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#111827",
    textAlign: "center",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    margin: "0 0 24px 0",
  },
  progress: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  stepItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "#111827",
    marginBottom: 16,
  },
  summary: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    display: "flex",
    alignItems: "center",
    padding: 16,
    border: "2px solid",
    borderRadius: 12,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  radio: {
    display: "none",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
  },
  optionMeta: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 16,
  },
  input: {
    display: "block",
    width: "100%",
    padding: "12px 16px",
    marginTop: 8,
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    fontSize: 16,
    boxSizing: "border-box",
  },
  timeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    marginBottom: 24,
  },
  timeSlot: {
    padding: "12px 8px",
    border: "2px solid",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    textAlign: "center",
  },
  closedMessage: {
    padding: 20,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    color: "#991B1B",
    textAlign: "center",
    marginBottom: 24,
  },
  footer: {
    display: "flex",
    gap: 12,
    marginTop: 24,
  },
  btnPrimary: {
    flex: 1,
    padding: "14px 24px",
    backgroundColor: "#EC4899",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "14px 24px",
    backgroundColor: "#FFFFFF",
    color: "#374151",
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 500,
    cursor: "pointer",
  },
  error: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    padding: "12px 16px",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  successContainer: {
    textAlign: "center",
    padding: "24px 0",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    backgroundColor: "#D1FAE5",
    color: "#059669",
    fontSize: 40,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 12px 0",
  },
  successText: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 24,
  },
  successDetails: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    textAlign: "left",
  },
  successRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #E5E7EB",
  },
  successLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  successValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: 600,
  },
  successNote: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
};
