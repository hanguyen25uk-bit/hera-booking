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

  useEffect(() => {
    if (!selectedStaffId) return;
    async function loadWorkingHours() {
      setLoadingHours(true);
      try {
        if (selectedStaffId === "any") {
          const res = await fetch(`/api/working-hours`);
          const data = await res.json();
          if (Array.isArray(data)) setAllWorkingHours(data);
        } else {
          const res = await fetch(`/api/working-hours?staffId=${selectedStaffId}`);
          const data = await res.json();
          if (Array.isArray(data)) setWorkingHours(data);
        }
      } catch (err) {
        console.error("Failed to load working hours:", err);
      } finally {
        setLoadingHours(false);
      }
    }
    loadWorkingHours();
  }, [selectedStaffId]);

  useEffect(() => {
    if (!selectedDate || !isAnyStaff) return;
    async function loadAppointments() {
      try {
        const res = await fetch(`/api/appointments?date=${selectedDate}`);
        const data = await res.json();
        if (Array.isArray(data)) setExistingAppointments(data);
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
      return slotStart < aptEnd && slotEnd > aptStart;
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
      if (isStaffAvailable(member.id, time)) return member.id;
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
      if (findAvailableStaff(time) && !addedSlots.has(time)) {
        slots.push(time);
        addedSlots.add(time);
      }
    }
    return slots;
  };

  const generateTimeSlots = () => {
    if (isAnyStaff) return generateAnySlotsTimeSlots();
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
      if (currentM >= 60) { currentM = 0; currentH += 1; }
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
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !dataReady) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Left Panel - Progress */}
        <div style={styles.leftPanel}>
          <div style={styles.brand}>
            <div style={styles.logo}>H</div>
            <span style={styles.brandName}>Hera Booking</span>
          </div>
          
          <div style={styles.progressList}>
            {[
              { num: 1, label: "Service", desc: "Choose your treatment" },
              { num: 2, label: "Specialist", desc: "Pick your technician" },
              { num: 3, label: "Date & Time", desc: "Select available slot" },
              { num: 4, label: "Your Info", desc: "Contact details" },
              { num: 5, label: "Confirmed", desc: "Booking complete" },
            ].map((item) => (
              <div key={item.num} style={{
                ...styles.progressItem,
                opacity: step >= item.num ? 1 : 0.4,
              }}>
                <div style={{
                  ...styles.progressNum,
                  background: step > item.num ? "#10b981" : step === item.num ? "#6366f1" : "rgba(255,255,255,0.2)",
                }}>
                  {step > item.num ? "✓" : item.num}
                </div>
                <div>
                  <div style={styles.progressLabel}>{item.label}</div>
                  <div style={styles.progressDesc}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {currentService && (
            <div style={styles.summary}>
              <div style={styles.summaryTitle}>Your Selection</div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryIcon}>✨</span>
                <span>{currentService.name}</span>
              </div>
              {currentStaff && (
                <div style={styles.summaryItem}>
                  <span style={styles.summaryIcon}>👤</span>
                  <span>{currentStaff.name}</span>
                </div>
              )}
              {selectedDate && selectedTime && (
                <div style={styles.summaryItem}>
                  <span style={styles.summaryIcon}>📅</span>
                  <span>{new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} at {selectedTime}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Content */}
        <div style={styles.rightPanel}>
          {error && <div style={styles.error}>{error}</div>}

          {/* Step 1: Service */}
          {step === 1 && (
            <div style={styles.stepContent}>
              <h1 style={styles.stepTitle}>Select a Service</h1>
              <p style={styles.stepSubtitle}>Choose the treatment you'd like to book</p>
              <div style={styles.serviceGrid}>
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    style={{
                      ...styles.serviceCard,
                      borderColor: selectedServiceId === service.id ? "#6366f1" : "#e2e8f0",
                      backgroundColor: selectedServiceId === service.id ? "#f5f3ff" : "#fff",
                    }}
                  >
                    <div style={styles.serviceHeader}>
                      <h3 style={styles.serviceName}>{service.name}</h3>
                      {selectedServiceId === service.id && <span style={styles.checkmark}>✓</span>}
                    </div>
                    <div style={styles.serviceMeta}>
                      <span style={styles.duration}>{service.durationMinutes} min</span>
                      <span style={styles.price}>£{service.price}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.actions}>
                <button style={styles.btnPrimary} onClick={() => { if (selectedServiceId) { setError(null); goNext(); } else setError("Please select a service"); }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Staff */}
          {step === 2 && (
            <div style={styles.stepContent}>
              <h1 style={styles.stepTitle}>Choose a Specialist</h1>
              <p style={styles.stepSubtitle}>Select your preferred technician</p>
              {loadingStaff ? (
                <p>Loading specialists...</p>
              ) : (
                <div style={styles.staffGrid}>
                  <div
                    onClick={() => { setSelectedStaffId("any"); setAssignedStaffId(""); setSelectedTime(""); }}
                    style={{
                      ...styles.staffCard,
                      borderColor: selectedStaffId === "any" ? "#6366f1" : "#e2e8f0",
                      backgroundColor: selectedStaffId === "any" ? "#f5f3ff" : "#fff",
                    }}
                  >
                    <div style={styles.staffAvatar}>⭐</div>
                    <div style={styles.staffInfo}>
                      <div style={styles.staffName}>Any Available</div>
                      <div style={styles.staffRole}>First available specialist</div>
                    </div>
                    {selectedStaffId === "any" && <span style={styles.checkmark}>✓</span>}
                  </div>
                  {staff.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => { setSelectedStaffId(member.id); setAssignedStaffId(""); setSelectedTime(""); }}
                      style={{
                        ...styles.staffCard,
                        borderColor: selectedStaffId === member.id ? "#6366f1" : "#e2e8f0",
                        backgroundColor: selectedStaffId === member.id ? "#f5f3ff" : "#fff",
                      }}
                    >
                      <div style={styles.staffAvatar}>{member.name.charAt(0)}</div>
                      <div style={styles.staffInfo}>
                        <div style={styles.staffName}>{member.name}</div>
                        <div style={styles.staffRole}>{member.role || "Nail Technician"}</div>
                      </div>
                      {selectedStaffId === member.id && <span style={styles.checkmark}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
              <div style={styles.actions}>
                <button style={styles.btnSecondary} onClick={goBack}>Back</button>
                <button style={styles.btnPrimary} onClick={() => { if (selectedStaffId) { setError(null); goNext(); } else setError("Please select a specialist"); }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Date & Time */}
          {step === 3 && (
            <div style={styles.stepContent}>
              <h1 style={styles.stepTitle}>Pick Date & Time</h1>
              <p style={styles.stepSubtitle}>Choose when you'd like to visit</p>
              
              <div style={styles.dateSection}>
                <label style={styles.label}>Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); setAssignedStaffId(""); }}
                  min={new Date().toISOString().split("T")[0]}
                  style={styles.dateInput}
                />
              </div>

              {loadingHours ? (
                <p>Loading times...</p>
              ) : timeSlots.length === 0 ? (
                <div style={styles.noSlots}>No available times on this date</div>
              ) : (
                <div style={styles.timeSection}>
                  <label style={styles.label}>Available Times</label>
                  <div style={styles.timeGrid}>
                    {timeSlots.map((time) => {
                      const isPast = isTimeSlotPast(time);
                      return (
                        <button
                          key={time}
                          disabled={isPast}
                          onClick={() => !isPast && handleTimeSelect(time)}
                          style={{
                            ...styles.timeSlot,
                            borderColor: selectedTime === time ? "#6366f1" : "#e2e8f0",
                            backgroundColor: isPast ? "#f1f5f9" : selectedTime === time ? "#6366f1" : "#fff",
                            color: isPast ? "#94a3b8" : selectedTime === time ? "#fff" : "#1e293b",
                            cursor: isPast ? "not-allowed" : "pointer",
                          }}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {isAnyStaff && assignedStaffId && selectedTime && (
                <div style={styles.assignedNote}>
                  ✓ {staff.find(s => s.id === assignedStaffId)?.name} will be your specialist
                </div>
              )}

              <div style={styles.actions}>
                <button style={styles.btnSecondary} onClick={goBack}>Back</button>
                <button style={styles.btnPrimary} onClick={() => { if (selectedTime) { setError(null); goNext(); } else setError("Please select a time"); }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Details */}
          {step === 4 && (
            <div style={styles.stepContent}>
              <h1 style={styles.stepTitle}>Your Details</h1>
              <p style={styles.stepSubtitle}>We'll send your confirmation here</p>
              
              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="07xxx xxxxxx"
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.actions}>
                  <button type="button" style={styles.btnSecondary} onClick={goBack}>Back</button>
                  <button type="submit" style={styles.btnPrimary} disabled={submitting}>
                    {submitting ? "Booking..." : "Confirm Booking"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <div style={styles.stepContent}>
              <div style={styles.successBox}>
                <div style={styles.successIcon}>✓</div>
                <h1 style={styles.successTitle}>You're all set!</h1>
                <p style={styles.successText}>Your appointment has been confirmed</p>
                
                <div style={styles.confirmCard}>
                  <div style={styles.confirmRow}>
                    <span style={styles.confirmLabel}>Service</span>
                    <span style={styles.confirmValue}>{currentService?.name}</span>
                  </div>
                  <div style={styles.confirmRow}>
                    <span style={styles.confirmLabel}>Specialist</span>
                    <span style={styles.confirmValue}>{currentStaff?.name}</span>
                  </div>
                  <div style={styles.confirmRow}>
                    <span style={styles.confirmLabel}>Date & Time</span>
                    <span style={styles.confirmValue}>
                      {selectedDate && selectedTime && new Date(`${selectedDate}T${selectedTime}`).toLocaleString("en-GB", {
                        weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div style={styles.confirmRow}>
                    <span style={styles.confirmLabel}>Booking ID</span>
                    <span style={styles.confirmValue}>{successAppointmentId?.slice(0, 8).toUpperCase()}</span>
                  </div>
                </div>

                <p style={styles.emailNote}>📧 Confirmation sent to {customerEmail}</p>

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
                  Book Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  container: {
    display: "flex",
    minHeight: "100vh",
  },
  leftPanel: {
    width: 320,
    backgroundColor: "#1e293b",
    padding: 32,
    display: "flex",
    flexDirection: "column",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 48,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 18,
  },
  brandName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: 600,
  },
  progressList: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  progressItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    transition: "opacity 0.3s ease",
  },
  progressNum: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },
  progressLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
  },
  progressDesc: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
  },
  summary: {
    marginTop: "auto",
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)",
  },
  summaryTitle: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 16,
  },
  summaryItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#fff",
    fontSize: 14,
    marginBottom: 12,
  },
  summaryIcon: {
    fontSize: 16,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: "24px 0 0 24px",
    padding: 48,
    overflowY: "auto",
  },
  stepContent: {
    maxWidth: 560,
    margin: "0 auto",
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 8px",
    letterSpacing: "-0.5px",
  },
  stepSubtitle: {
    fontSize: 16,
    color: "#64748b",
    margin: "0 0 32px",
  },
  serviceGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  serviceCard: {
    padding: 20,
    borderRadius: 12,
    border: "2px solid",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  serviceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#6366f1",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
  },
  serviceMeta: {
    display: "flex",
    gap: 16,
  },
  duration: {
    fontSize: 14,
    color: "#64748b",
  },
  price: {
    fontSize: 16,
    fontWeight: 700,
    color: "#059669",
  },
  staffGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  staffCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 12,
    border: "2px solid",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 600,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: 600,
    color: "#0f172a",
  },
  staffRole: {
    fontSize: 14,
    color: "#64748b",
  },
  dateSection: {
    marginBottom: 24,
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 8,
  },
  dateInput: {
    width: "100%",
    padding: "14px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
  },
  timeSection: {
    marginBottom: 24,
  },
  timeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  },
  timeSlot: {
    padding: "12px 8px",
    borderRadius: 8,
    border: "2px solid",
    fontSize: 14,
    fontWeight: 600,
    textAlign: "center",
    transition: "all 0.15s ease",
  },
  noSlots: {
    padding: 24,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    color: "#dc2626",
    textAlign: "center",
  },
  assignedNote: {
    padding: 16,
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
    color: "#059669",
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 24,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  formGroup: {},
  input: {
    width: "100%",
    padding: "14px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s ease",
  },
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 32,
  },
  btnPrimary: {
    flex: 1,
    padding: "16px 24px",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 0.15s ease",
  },
  btnSecondary: {
    padding: "16px 24px",
    backgroundColor: "#fff",
    color: "#475569",
    border: "2px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 500,
    cursor: "pointer",
  },
  error: {
    padding: 16,
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    color: "#dc2626",
    fontSize: 14,
    marginBottom: 24,
  },
  successBox: {
    textAlign: "center",
    padding: "40px 0",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    fontSize: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 8px",
  },
  successText: {
    fontSize: 16,
    color: "#64748b",
    margin: "0 0 32px",
  },
  confirmCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 24,
    textAlign: "left",
    marginBottom: 24,
  },
  confirmRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #e2e8f0",
  },
  confirmLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
  },
  emailNote: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 24,
  },
  loadingCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid rgba(255,255,255,0.2)",
    borderTop: "4px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    color: "#94a3b8",
    marginTop: 16,
  },
};
