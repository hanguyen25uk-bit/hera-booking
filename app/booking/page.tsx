"use client";

import { useEffect, useState, FormEvent } from "react";

// Types
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

type Step = 1 | 2 | 3 | 4 | 5;

export default function BookingPage() {
  // State management
  const [step, setStep] = useState<Step>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected data
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [startTimeLocal, setStartTimeLocal] = useState<string>("");

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAppointmentId, setSuccessAppointmentId] = useState<string | null>(null);

  // Fetch services + staff on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [servicesRes, staffRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/staff"),
        ]);
        const servicesData = await servicesRes.json();
        const staffData = await staffRes.json();
        setServices(servicesData);
        setStaff(staffData);
      } catch (err) {
        console.error(err);
        setError("Failed to load data. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Helper to get current selections
  const currentService = services.find((s) => s.id === selectedServiceId);
  const currentStaff = staff.find((s) => s.id === selectedStaffId);

  // Navigation
  const goNext = () => setStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev));
  const goBack = () => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));

  // Submit booking
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedServiceId || !selectedStaffId || !startTimeLocal) {
      setError("Please complete all selections.");
      return;
    }

    if (!customerName || !customerPhone || !customerEmail) {
      setError("Please fill in your details.");
      return;
    }

    setSubmitting(true);

    try {
      const startTimeIso = new Date(startTimeLocal).toISOString();

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

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading booking system...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Hera Nail & Head Spa Booking</h1>
        <img src="/logo.png" alt="Hera" style={{ width: 120, marginBottom: 16 }} />
        <p style={styles.subtitle}>Easy booking in 4 simple steps</p>
      </div>

      {/* Step Indicator */}
      <div style={styles.stepsContainer}>
        {["Service", "Staff", "Time", "Details", "Done"].map((label, index) => {
          const stepNumber = (index + 1) as Step;
          const isActive = step === stepNumber;
          const isCompleted = step > stepNumber;

          return (
            <div key={label} style={styles.stepItem}>
              <div
                style={{
                  ...styles.stepCircle,
                  ...(isCompleted
                    ? styles.stepCircleCompleted
                    : isActive
                    ? styles.stepCircleActive
                    : {}),
                }}
              >
                {stepNumber}
              </div>
              <span
                style={{
                  ...styles.stepLabel,
                  color: isActive || isCompleted ? "#111827" : "#9CA3AF",
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorBox}>
          ⚠️ {error}
        </div>
      )}

      {/* Main Card */}
      <div style={styles.card}>
        {/* STEP 1: Select Service */}
        {step === 1 && (
          <div>
            <h2 style={styles.stepTitle}>Select a Service</h2>
            {services.length === 0 && (
              <p style={styles.emptyState}>No services available. Please add services in Prisma Studio.</p>
            )}
            <div style={styles.optionsList}>
              {services.map((service) => (
                <label
                  key={service.id}
                  style={{
                    ...styles.optionCard,
                    borderColor: selectedServiceId === service.id ? "#EC4899" : "#E5E7EB",
                    backgroundColor: selectedServiceId === service.id ? "#FCE7F3" : "#FFFFFF",
                  }}
                >
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
                      {service.category && ` • ${service.category}`}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div style={styles.footer}>
              <button style={styles.btnSecondary} disabled>
                Back
              </button>
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
            <div style={styles.summary}>
              Service: <strong>{currentService?.name}</strong>
            </div>
            <div style={styles.optionsList}>
              {staff.map((member) => (
                <label
                  key={member.id}
                  style={{
                    ...styles.optionCard,
                    borderColor: selectedStaffId === member.id ? "#EC4899" : "#E5E7EB",
                    backgroundColor: selectedStaffId === member.id ? "#FCE7F3" : "#FFFFFF",
                  }}
                >
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
              <button style={styles.btnSecondary} onClick={goBack}>
                ← Back
              </button>
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

        {/* STEP 3: Select Time */}
        {step === 3 && (
          <div>
            <h2 style={styles.stepTitle}>Select Date & Time</h2>
            <div style={styles.summary}>
              <strong>{currentService?.name}</strong> with <strong>{currentStaff?.name}</strong>
            </div>
            <label style={styles.label}>
              Choose appointment time:
              <input
                type="datetime-local"
                value={startTimeLocal}
                onChange={(e) => setStartTimeLocal(e.target.value)}
                style={styles.input}
                min={new Date().toISOString().slice(0, 16)}
              />
            </label>
            <div style={styles.footer}>
              <button style={styles.btnSecondary} onClick={goBack}>
                ← Back
              </button>
              <button
                style={styles.btnPrimary}
                onClick={() => {
                  if (!startTimeLocal) {
                    setError("Please choose a date & time.");
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
              {new Date(startTimeLocal).toLocaleString("en-GB", {
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
              <button type="button" style={styles.btnSecondary} onClick={goBack}>
                ← Back
              </button>
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
                  {new Date(startTimeLocal).toLocaleString("en-GB", {
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
                <span style={{ ...styles.successValue, fontSize: 12, color: "#6B7280" }}>
                  {successAppointmentId?.slice(0, 8)}
                </span>
              </div>
            </div>
            <p style={styles.successNote}>
              📧 A confirmation email has been sent to <strong>{customerEmail}</strong>
            </p>
            <button
              style={{ ...styles.btnPrimary, width: "100%" }}
              onClick={() => {
                // Reset form
                setStep(1);
                setSelectedServiceId("");
                setSelectedStaffId("");
                setStartTimeLocal("");
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

// ========================================
// STYLES
// ========================================

const styles = {
  container: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "24px 16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  loading: {
    textAlign: "center" as const,
    padding: 48,
    fontSize: 18,
    color: "#6B7280",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 8,
  },
  stepsContainer: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 32,
    padding: "0 16px",
  },
  stepItem: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "2px solid #E5E7EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: 16,
    color: "#9CA3AF",
    backgroundColor: "#FFFFFF",
  },
  stepCircleActive: {
    borderColor: "#EC4899",
    backgroundColor: "#EC4899",
    color: "#FFFFFF",
  },
  stepCircleCompleted: {
    borderColor: "#10B981",
    backgroundColor: "#10B981",
    color: "#FFFFFF",
  },
  stepLabel: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: 500,
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 600,
    color: "#111827",
    marginTop: 0,
    marginBottom: 16,
  },
  summary: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
    color: "#374151",
  },
  emptyState: {
    textAlign: "center" as const,
    color: "#9CA3AF",
    padding: 32,
  },
  optionsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    display: "flex",
    alignItems: "center",
    border: "2px solid",
    borderRadius: 8,
    padding: 16,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  radio: {
    marginRight: 12,
    width: 18,
    height: 18,
    cursor: "pointer",
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
    marginBottom: 4,
  },
  optionMeta: {
    fontSize: 14,
    color: "#6B7280",
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #D1D5DB",
    borderRadius: 6,
    fontSize: 16,
    marginTop: 6,
    boxSizing: "border-box" as const,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
  },
  btnPrimary: {
    backgroundColor: "#EC4899",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    padding: "12px 24px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
  btnSecondary: {
    backgroundColor: "#FFFFFF",
    color: "#374151",
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    padding: "12px 24px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
  },
  successContainer: {
    textAlign: "center" as const,
    padding: "24px 0",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    backgroundColor: "#D1FAE5",
    color: "#059669",
    fontSize: 48,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
  },
  successTitle: {
    fontSize: 28,
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
    textAlign: "left" as const,
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
    fontWeight: 500,
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