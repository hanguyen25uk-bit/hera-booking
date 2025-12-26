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
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
};

type Step = 1 | 2 | 3 | 4 | 5;

export default function BookingPage() {
  const [step, setStep] = useState<Step>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAppointmentId, setSuccessAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [servicesRes, staffRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/staff"),
        ]);
        setServices(await servicesRes.json());
        const staffData = await staffRes.json();
        setStaff(staffData.filter((s: Staff & { active?: boolean }) => s.active !== false));
      } catch (err) {
        setError("Failed to load data. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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
        const res = await fetch(`/api/working-hours?staffId=${selectedStaffId}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setWorkingHours(data);
        }
      } catch (err) {
        console.error("Failed to load working hours:", err);
      } finally {
        setLoadingHours(false);
      }
    }
    loadWorkingHours();
  }, [selectedStaffId]);

  const currentService = services.find((s) => s.id === selectedServiceId);
  const currentStaff = staff.find((s) => s.id === selectedStaffId);

  const goNext = () => setStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev));
  const goBack = () => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));

  // Get working hours for selected date
  const getWorkingHoursForDate = () => {
    if (!selectedDate || workingHours.length === 0) return null;
    const dayOfWeek = new Date(selectedDate).getDay();
    return workingHours.find((h) => h.dayOfWeek === dayOfWeek);
  };

  // Generate time slots based on working hours
  const generateTimeSlots = () => {
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

  // Check if time slot is in the past
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedServiceId || !selectedStaffId || !selectedDate || !selectedTime) {
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
          staffId: selectedStaffId,
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

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={{ textAlign: "center", padding: 40 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Book an Appointment</h1>
        <p style={styles.subtitle}>Easy booking in 4 simple steps</p>

        {/* Progress Steps */}
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
                    onChange={() => setSelectedServiceId(service.id)}
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
            <div style={styles.optionsList}>
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
                    onChange={() => setSelectedStaffId(member.id)}
                    style={styles.radio}
                  />
                  <div style={styles.optionContent}>
                    <div style={styles.optionTitle}>{member.name}</div>
                    {member.role && <div style={styles.optionMeta}>{member.role}</div>}
                  </div>
                </label>
              ))}
            </div>
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
                Next: Choose Time →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Select Date & Time */}
        {step === 3 && (
          <div>
            <h2 style={styles.stepTitle}>Select Date & Time</h2>
            <div style={styles.summary}>
              <strong>{currentService?.name}</strong> with <strong>{currentStaff?.name}</strong>
            </div>

            <label style={styles.label}>
              Select Date:
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime("");
                }}
                min={new Date().toISOString().split("T")[0]}
                style={styles.input}
              />
            </label>

            {loadingHours ? (
              <p style={{ textAlign: "center", color: "#6B7280" }}>Loading available times...</p>
            ) : !todayHours || !todayHours.isWorking ? (
              <div style={styles.closedMessage}>
                ❌ Sorry, we are closed on this day. Please select another date.
              </div>
            ) : (
              <>
                <label style={styles.label}>
                  Available Times ({todayHours.startTime} - {todayHours.endTime}):
                </label>
                <div style={styles.timeGrid}>
                  {timeSlots.map((time) => {
                    const isPast = isTimeSlotPast(time);
                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={isPast}
                        onClick={() => setSelectedTime(time)}
                        style={{
                          ...styles.timeSlot,
                          backgroundColor: selectedTime === time ? "#EC4899" : isPast ? "#F3F4F6" : "#FFFFFF",
                          color: selectedTime === time ? "#FFFFFF" : isPast ? "#9CA3AF" : "#374151",
                          borderColor: selectedTime === time ? "#EC4899" : "#E5E7EB",
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
                  if (!selectedDate || !selectedTime) {
                    setError("Please choose a date and time.");
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
          <form onSubmit={handleSubmit}>
            <h2 style={styles.stepTitle}>Your Details</h2>
            <div style={styles.summary}>
              <strong>{currentService?.name}</strong> with <strong>{currentStaff?.name}</strong>
              <br />
              {selectedDate && selectedTime && new Date(`${selectedDate}T${selectedTime}`).toLocaleString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <label style={styles.label}>
              Full Name *
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={styles.input}
                placeholder="Selena Nguyen"
                required
              />
            </label>

            <label style={styles.label}>
              Phone Number *
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={styles.input}
                placeholder="07123456789"
                required
              />
            </label>

            <label style={styles.label}>
              Email Address *
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                style={styles.input}
                placeholder="selena@example.com"
                required
              />
            </label>

            <div style={styles.footer}>
              <button type="button" style={styles.btnSecondary} onClick={goBack}>← Back</button>
              <button type="submit" style={styles.btnPrimary} disabled={submitting}>
                {submitting ? "Booking..." : "Confirm Booking ✓"}
              </button>
            </div>
          </form>
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
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
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
