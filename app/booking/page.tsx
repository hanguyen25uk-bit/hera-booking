"use client";

import { useEffect, useState } from "react";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
};

type Staff = {
  id: string;
  name: string;
};

type WorkingHours = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
};

type ExistingAppointment = {
  startTime: string;
  endTime: string;
  staffId: string;
};

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<ExistingAppointment[]>([]);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingComplete, setBookingComplete] = useState(false);

  // Load services
  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then(setServices)
      .catch(console.error);
  }, []);

  // Load staff
  useEffect(() => {
    fetch("/api/staff")
      .then((res) => res.json())
      .then(setStaff)
      .catch(console.error);
  }, []);

  // Load working hours when staff selected
  useEffect(() => {
    if (selectedStaff) {
      fetch(`/api/working-hours?staffId=${selectedStaff.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setWorkingHours(data);
          }
        })
        .catch(console.error);
    }
  }, [selectedStaff]);

  // Load existing appointments when date and staff selected
  useEffect(() => {
    if (selectedDate && selectedStaff) {
      fetch(`/api/appointments?date=${selectedDate}&staffId=${selectedStaff.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setExistingAppointments(data.filter((apt: any) => 
              apt.status !== "cancelled" && apt.staffId === selectedStaff.id
            ));
          }
        })
        .catch(console.error);
    }
  }, [selectedDate, selectedStaff]);

  // Get working hours for selected date
  const getWorkingHoursForDate = () => {
    if (!selectedDate || workingHours.length === 0) return null;
    const date = new Date(selectedDate);
    const dayOfWeek = date.getDay();
    return workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
  };

  // Check if time slot is already booked
  const isSlotBooked = (timeSlot: string) => {
    if (!selectedDate || !selectedService) return false;
    
    const slotStart = new Date(`${selectedDate}T${timeSlot}:00`);
    const slotEnd = new Date(slotStart.getTime() + selectedService.durationMinutes * 60000);

    return existingAppointments.some((apt) => {
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      // Check for overlap
      return slotStart < aptEnd && slotEnd > aptStart;
    });
  };

  // Generate available time slots
  const generateTimeSlots = () => {
    const wh = getWorkingHoursForDate();
    if (!wh || !wh.isWorking) return [];

    const slots: string[] = [];
    const [startH, startM] = wh.startTime.split(":").map(Number);
    const [endH, endM] = wh.endTime.split(":").map(Number);

    let current = startH * 60 + startM;
    const end = endH * 60 + endM;

    // Account for service duration - don't show slots that would end after closing
    const serviceDuration = selectedService?.durationMinutes || 30;

    while (current + serviceDuration <= end) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      
      // Only add if not booked
      if (!isSlotBooked(timeStr)) {
        slots.push(timeStr);
      }
      
      current += 30;
    }

    return slots;
  };

  // Check if slot is in the past
  const isSlotInPast = (time: string) => {
    const now = new Date();
    const slotDate = new Date(`${selectedDate}T${time}:00`);
    return slotDate <= now;
  };

  // Handle booking submission
  async function handleSubmit() {
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return;

    setLoading(true);
    setError("");

    try {
      const startTime = new Date(`${selectedDate}T${selectedTime}:00`);

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          staffId: selectedStaff.id,
          customerName,
          customerPhone,
          customerEmail,
          startTime: startTime.toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to book appointment");
        return;
      }

      setBookingComplete(true);
      setStep(5);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Booking complete view
  if (bookingComplete) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.successTitle}>Booking Confirmed!</h1>
          <p style={styles.successText}>
            We've sent a confirmation email to <strong>{customerEmail}</strong>
          </p>

          <div style={styles.summaryBox}>
            <div style={styles.summaryRow}>
              <span>Service:</span>
              <strong>{selectedService?.name}</strong>
            </div>
            <div style={styles.summaryRow}>
              <span>Staff:</span>
              <strong>{selectedStaff?.name}</strong>
            </div>
            <div style={styles.summaryRow}>
              <span>Date:</span>
              <strong>{new Date(selectedDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</strong>
            </div>
            <div style={styles.summaryRow}>
              <span>Time:</span>
              <strong>{selectedTime}</strong>
            </div>
          </div>

          <button style={styles.btnPrimary} onClick={() => window.location.reload()}>
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Book an Appointment</h1>
        <p style={styles.subtitle}>Easy booking in 4 simple steps</p>
      </div>

      {/* Progress Steps */}
      <div style={styles.progress}>
        {["Service", "Staff", "Time", "Details", "Done"].map((label, i) => (
          <div key={i} style={styles.progressStep}>
            <div style={{
              ...styles.progressCircle,
              backgroundColor: step > i ? "#10B981" : step === i + 1 ? "#EC4899" : "#E5E7EB",
              color: step > i || step === i + 1 ? "#FFFFFF" : "#6B7280",
            }}>
              {step > i ? "✓" : i + 1}
            </div>
            <span style={styles.progressLabel}>{label}</span>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div>
            <h2 style={styles.stepTitle}>Select a Service</h2>
            <div style={styles.optionList}>
              {services.map((service) => (
                <button
                  key={service.id}
                  style={{
                    ...styles.optionCard,
                    borderColor: selectedService?.id === service.id ? "#EC4899" : "#E5E7EB",
                    backgroundColor: selectedService?.id === service.id ? "#FDF2F8" : "#FFFFFF",
                  }}
                  onClick={() => setSelectedService(service)}
                >
                  <div style={styles.optionName}>{service.name}</div>
                  <div style={styles.optionDetails}>
                    {service.durationMinutes} min • £{service.price}
                  </div>
                </button>
              ))}
            </div>
            <button
              style={{ ...styles.btnPrimary, opacity: selectedService ? 1 : 0.5 }}
              onClick={() => selectedService && setStep(2)}
              disabled={!selectedService}
            >
              Next: Choose Staff →
            </button>
          </div>
        )}

        {/* Step 2: Select Staff */}
        {step === 2 && (
          <div>
            <h2 style={styles.stepTitle}>Choose Your Technician</h2>
            <div style={styles.selectedInfo}>
              <strong>{selectedService?.name}</strong> • {selectedService?.durationMinutes} min • £{selectedService?.price}
            </div>
            <div style={styles.optionList}>
              {staff.map((s) => (
                <button
                  key={s.id}
                  style={{
                    ...styles.optionCard,
                    borderColor: selectedStaff?.id === s.id ? "#EC4899" : "#E5E7EB",
                    backgroundColor: selectedStaff?.id === s.id ? "#FDF2F8" : "#FFFFFF",
                  }}
                  onClick={() => setSelectedStaff(s)}
                >
                  <div style={styles.optionName}>{s.name}</div>
                </button>
              ))}
            </div>
            <div style={styles.btnGroup}>
              <button style={styles.btnSecondary} onClick={() => setStep(1)}>← Back</button>
              <button
                style={{ ...styles.btnPrimary, opacity: selectedStaff ? 1 : 0.5 }}
                onClick={() => selectedStaff && setStep(3)}
                disabled={!selectedStaff}
              >
                Next: Select Time →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && (
          <div>
            <h2 style={styles.stepTitle}>Select Date & Time</h2>
            <div style={styles.selectedInfo}>
              <strong>{selectedService?.name}</strong> with <strong>{selectedStaff?.name}</strong>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime("");
                }}
                min={getMinDate()}
                style={styles.input}
              />
            </div>

            {selectedDate && (
              <div style={styles.formGroup}>
                {getWorkingHoursForDate()?.isWorking === false ? (
                  <div style={styles.closedMessage}>
                    ❌ Sorry, we are closed on this day. Please select another date.
                  </div>
                ) : (
                  <>
                    <label style={styles.label}>
                      Available Times ({getWorkingHoursForDate()?.startTime} - {getWorkingHoursForDate()?.endTime}):
                    </label>
                    <div style={styles.timeGrid}>
                      {generateTimeSlots().length === 0 ? (
                        <div style={styles.noSlotsMessage}>
                          😔 No available slots for this day. Please select another date.
                        </div>
                      ) : (
                        generateTimeSlots().map((time) => {
                          const isPast = isSlotInPast(time);
                          return (
                            <button
                              key={time}
                              style={{
                                ...styles.timeSlot,
                                borderColor: selectedTime === time ? "#EC4899" : "#E5E7EB",
                                backgroundColor: isPast ? "#F3F4F6" : selectedTime === time ? "#EC4899" : "#FFFFFF",
                                color: isPast ? "#9CA3AF" : selectedTime === time ? "#FFFFFF" : "#374151",
                                cursor: isPast ? "not-allowed" : "pointer",
                              }}
                              onClick={() => !isPast && setSelectedTime(time)}
                              disabled={isPast}
                            >
                              {time}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={styles.btnGroup}>
              <button style={styles.btnSecondary} onClick={() => setStep(2)}>← Back</button>
              <button
                style={{ ...styles.btnPrimary, opacity: selectedTime ? 1 : 0.5 }}
                onClick={() => selectedTime && setStep(4)}
                disabled={!selectedTime}
              >
                Next: Your Details →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Customer Details */}
        {step === 4 && (
          <div>
            <h2 style={styles.stepTitle}>Your Details</h2>
            <div style={styles.selectedInfo}>
              <strong>{selectedService?.name}</strong> with <strong>{selectedStaff?.name}</strong>
              <br />
              {new Date(selectedDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, {selectedTime}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={styles.input}
                placeholder="Your name"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Phone Number *</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={styles.input}
                placeholder="07123456789"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address *</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                style={styles.input}
                placeholder="your@email.com"
              />
            </div>

            <div style={styles.btnGroup}>
              <button style={styles.btnSecondary} onClick={() => setStep(3)}>← Back</button>
              <button
                style={{ ...styles.btnPrimary, opacity: customerName && customerPhone && customerEmail ? 1 : 0.5 }}
                onClick={handleSubmit}
                disabled={!customerName || !customerPhone || !customerEmail || loading}
              >
                {loading ? "Booking..." : "Confirm Booking ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: 600,
    margin: "0 auto",
    padding: "24px 16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    minHeight: "100vh",
    backgroundColor: "#F9FAFB",
  },
  header: { textAlign: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, color: "#111827", margin: 0 },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 8 },
  progress: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  progressStep: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
  },
  progressCircle: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  progressLabel: { fontSize: 12, color: "#6B7280" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  stepTitle: { fontSize: 20, fontWeight: 600, color: "#111827", marginBottom: 16 },
  selectedInfo: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
    color: "#374151",
  },
  optionList: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 },
  optionCard: {
    padding: 16,
    border: "2px solid",
    borderRadius: 12,
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  optionName: { fontSize: 16, fontWeight: 600, color: "#111827" },
  optionDetails: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  formGroup: { marginBottom: 20 },
  label: { display: "block", fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 8 },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: "2px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 16,
    boxSizing: "border-box",
  },
  timeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
  },
  timeSlot: {
    padding: "12px 8px",
    border: "2px solid",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  closedMessage: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    padding: 16,
    borderRadius: 8,
    textAlign: "center",
  },
  noSlotsMessage: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    padding: 16,
    borderRadius: 8,
    textAlign: "center",
    gridColumn: "1 / -1",
  },
  btnGroup: { display: "flex", gap: 12 },
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
    border: "2px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    backgroundColor: "#D1FAE5",
    color: "#059669",
    fontSize: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
  },
  successTitle: { fontSize: 24, fontWeight: 700, color: "#111827", textAlign: "center", margin: "0 0 8px 0" },
  successText: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24 },
  summaryBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #E5E7EB",
    fontSize: 14,
  },
};
