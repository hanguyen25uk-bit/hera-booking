"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  manageToken: string;
  status: string;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
  };
  staff: {
    id: string;
    name: string;
  };
};

type Settings = {
  cancelMinutesAdvance: number;
  salonPhone: string;
};

type ViewMode = "view" | "reschedule" | "cancelled" | "success";

function ManageBookingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [settings, setSettings] = useState<Settings>({ cancelMinutesAdvance: 1440, salonPhone: "020 1234 5678" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("view");

  const [newDateTime, setNewDateTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load appointment and settings
  useEffect(() => {
    if (!token) {
      setError("No booking token provided. Please use the link from your confirmation email.");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const [appointmentRes, settingsRes] = await Promise.all([
          fetch(`/api/appointments?token=${token}`),
          fetch("/api/settings"),
        ]);

        if (!appointmentRes.ok) {
          if (appointmentRes.status === 404) {
            setError("Booking not found. It may have been deleted.");
          } else {
            setError("Failed to load booking details.");
          }
          return;
        }

        const appointmentData = await appointmentRes.json();
        setAppointment(appointmentData);

        if (appointmentData.status === "cancelled") {
          setViewMode("cancelled");
        }

        const settingsData = await settingsRes.json();
        if (settingsData && !settingsData.error) {
          setSettings(settingsData);
        }
      } catch (err) {
        console.error(err);
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  // Handle reschedule
  async function handleReschedule() {
    if (!newDateTime || !token) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/appointments/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          startTime: new Date(newDateTime).toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reschedule. Please try again.");
        return;
      }

      setAppointment(data);
      setViewMode("success");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle cancel
  async function handleCancel() {
    if (!token) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment? This action cannot be undone."
    );

    if (!confirmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/appointments/manage?token=${token}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to cancel. Please try again.");
        return;
      }

      setAppointment(data);
      setViewMode("cancelled");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canModify = () => {
    if (!appointment) return false;
    const appointmentTime = new Date(appointment.startTime);
    const now = new Date();
    const minutesUntil = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);
    return minutesUntil > settings.cancelMinutesAdvance;
  };

  const formatCancelTime = () => {
    const hours = Math.floor(settings.cancelMinutesAdvance / 60);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? "s" : ""}`;
    }
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loading}>Loading your booking...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !appointment) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>⚠️</div>
            <h2 style={styles.errorTitle}>Oops!</h2>
            <p style={styles.errorText}>{error}</p>
            <a href="/booking" style={styles.btnPrimary}>
              Make a New Booking
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) return null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Manage Your Booking</h1>
        <p style={styles.subtitle}>View, reschedule, or cancel your appointment</p>
      </div>

      {error && <div style={styles.errorBox}>⚠️ {error}</div>}

      <div style={styles.card}>
        {/* CANCELLED VIEW */}
        {viewMode === "cancelled" && (
          <div style={styles.statusContainer}>
            <div style={styles.cancelledIcon}>✕</div>
            <h2 style={styles.statusTitle}>Booking Cancelled</h2>
            <p style={styles.statusText}>Your appointment has been cancelled.</p>
            <a href="/booking" style={styles.btnPrimary}>
              Book a New Appointment
            </a>
          </div>
        )}

        {/* SUCCESS VIEW */}
        {viewMode === "success" && (
          <div style={styles.statusContainer}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.statusTitle}>Rescheduled Successfully!</h2>
            <p style={styles.statusText}>Your appointment has been updated.</p>
            <div style={styles.detailsBox}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Service:</span>
                <span style={styles.detailValue}>{appointment.service.name}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>New Time:</span>
                <span style={styles.detailValueHighlight}>
                  {formatDateTime(appointment.startTime)}
                </span>
              </div>
            </div>
            <button style={styles.btnSecondary} onClick={() => setViewMode("view")}>
              View Booking Details
            </button>
          </div>
        )}

        {/* VIEW MODE */}
        {viewMode === "view" && (
          <div>
            <div style={styles.statusBadgeContainer}>
              <span
                style={{
                  ...styles.statusBadge,
                  backgroundColor: appointment.status === "booked" ? "#D1FAE5" : "#FEE2E2",
                  color: appointment.status === "booked" ? "#065F46" : "#991B1B",
                }}
              >
                {appointment.status === "booked" ? "✓ Confirmed" : appointment.status}
              </span>
            </div>

            <div style={styles.bookingHeader}>
              <h2 style={styles.serviceName}>{appointment.service.name}</h2>
              <p style={styles.staffName}>with {appointment.staff.name}</p>
            </div>

            <div style={styles.dateTimeBox}>
              <div style={styles.dateIcon}>📅</div>
              <div>
                <div style={styles.dateText}>
                  {new Date(appointment.startTime).toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div style={styles.timeText}>
                  {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                </div>
              </div>
            </div>

            <div style={styles.detailsGrid}>
              <div style={styles.detailCard}>
                <div style={styles.detailCardLabel}>Duration</div>
                <div style={styles.detailCardValue}>{appointment.service.durationMinutes} min</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailCardLabel}>Price</div>
                <div style={styles.detailCardValue}>£{appointment.service.price}</div>
              </div>
            </div>

            <div style={styles.customerInfo}>
              <h3 style={styles.sectionTitle}>Your Details</h3>
              <div style={styles.customerRow}>
                <span>👤</span>
                <span>{appointment.customerName}</span>
              </div>
              <div style={styles.customerRow}>
                <span>📱</span>
                <span>{appointment.customerPhone}</span>
              </div>
              <div style={styles.customerRow}>
                <span>✉️</span>
                <span>{appointment.customerEmail}</span>
              </div>
            </div>

            {canModify() ? (
              <div style={styles.actionsContainer}>
                <button style={styles.btnReschedule} onClick={() => setViewMode("reschedule")}>
                  📅 Reschedule
                </button>
                <button style={styles.btnCancel} onClick={handleCancel} disabled={submitting}>
                  {submitting ? "Cancelling..." : "✕ Cancel Booking"}
                </button>
              </div>
            ) : (
              <div style={styles.warningBox}>
                <strong>⚠️ Cannot modify</strong>
                <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>
                  Appointments can only be changed more than {formatCancelTime()} in advance.
                </p>
              </div>
            )}
          </div>
        )}

        {/* RESCHEDULE MODE */}
        {viewMode === "reschedule" && (
          <div>
            <h2 style={styles.rescheduleTitle}>Reschedule Appointment</h2>

            <div style={styles.currentBooking}>
              <div style={styles.currentLabel}>Current booking:</div>
              <div style={styles.currentValue}>
                {appointment.service.name} with {appointment.staff.name}
              </div>
              <div style={styles.currentTime}>{formatDateTime(appointment.startTime)}</div>
            </div>

            <div style={styles.rescheduleForm}>
              <label style={styles.formLabel}>
                Select new date & time:
                <input
                  type="datetime-local"
                  value={newDateTime}
                  onChange={(e) => setNewDateTime(e.target.value)}
                  style={styles.dateTimeInput}
                  min={new Date(Date.now() + settings.cancelMinutesAdvance * 60 * 1000).toISOString().slice(0, 16)}
                />
              </label>

              <p style={styles.rescheduleNote}>
                Note: You can only reschedule to a time more than {formatCancelTime()} from now.
              </p>

              <div style={styles.rescheduleActions}>
                <button
                  style={styles.btnSecondary}
                  onClick={() => {
                    setViewMode("view");
                    setNewDateTime("");
                    setError(null);
                  }}
                >
                  ← Back
                </button>
                <button
                  style={styles.btnPrimary}
                  onClick={handleReschedule}
                  disabled={!newDateTime || submitting}
                >
                  {submitting ? "Updating..." : "Confirm New Time"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div style={styles.helpSection}>
        <h3 style={styles.helpTitle}>Need Help?</h3>
        <p style={styles.helpText}>
          Contact us if you need to make changes within {formatCancelTime()}.
        </p>
        <div style={styles.helpContact}>
          <span>📞 {settings.salonPhone}</span>
        </div>
      </div>
    </div>
  );
}

// STYLES
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
  },
  loading: { textAlign: "center", padding: 48, color: "#6B7280" },
  errorContainer: { textAlign: "center", padding: 24 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 24, fontWeight: 700, color: "#111827", margin: "0 0 12px 0" },
  errorText: { fontSize: 16, color: "#6B7280", marginBottom: 24 },
  errorBox: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  statusBadgeContainer: { marginBottom: 20 },
  statusBadge: {
    display: "inline-block",
    padding: "6px 16px",
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600,
  },
  bookingHeader: { marginBottom: 24 },
  serviceName: { fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 },
  staffName: { fontSize: 16, color: "#6B7280", marginTop: 4 },
  dateTimeBox: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#FDF2F8",
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  dateIcon: { fontSize: 32 },
  dateText: { fontSize: 18, fontWeight: 600, color: "#111827" },
  timeText: { fontSize: 16, color: "#EC4899", fontWeight: 600, marginTop: 4 },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 24,
  },
  detailCard: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    textAlign: "center",
  },
  detailCardLabel: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailCardValue: { fontSize: 24, fontWeight: 700, color: "#111827" },
  customerInfo: { borderTop: "1px solid #E5E7EB", paddingTop: 24, marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 16,
  },
  customerRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    fontSize: 16,
    color: "#374151",
  },
  actionsContainer: { display: "flex", gap: 12 },
  btnPrimary: {
    flex: 1,
    backgroundColor: "#EC4899",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    padding: "14px 24px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    textAlign: "center",
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    color: "#374151",
    border: "2px solid #E5E7EB",
    borderRadius: 8,
    padding: "14px 24px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnReschedule: {
    flex: 1,
    backgroundColor: "#10B981",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    padding: "14px 24px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnCancel: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    color: "#DC2626",
    border: "2px solid #DC2626",
    borderRadius: 8,
    padding: "14px 24px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
  },
  warningBox: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    padding: 16,
    borderRadius: 8,
    borderLeft: "4px solid #F59E0B",
  },
  statusContainer: { textAlign: "center", padding: "24px 0" },
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
  cancelledIcon: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
    fontSize: 48,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
  },
  statusTitle: { fontSize: 24, fontWeight: 700, color: "#111827", margin: "0 0 12px 0" },
  statusText: { fontSize: 16, color: "#6B7280", marginBottom: 24 },
  detailsBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    textAlign: "left",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #E5E7EB",
  },
  detailLabel: { fontSize: 14, color: "#6B7280" },
  detailValue: { fontSize: 14, color: "#111827", fontWeight: 600 },
  detailValueHighlight: { fontSize: 14, color: "#059669", fontWeight: 700 },
  rescheduleTitle: { fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 24 },
  currentBooking: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  currentLabel: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  currentValue: { fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 4 },
  currentTime: { fontSize: 14, color: "#EC4899" },
  rescheduleForm: { marginTop: 24 },
  formLabel: { display: "block", fontSize: 14, fontWeight: 500, color: "#374151" },
  dateTimeInput: {
    width: "100%",
    padding: "12px 16px",
    border: "2px solid #E5E7EB",
    borderRadius: 8,
    fontSize: 16,
    marginTop: 8,
    boxSizing: "border-box",
  },
  rescheduleNote: { fontSize: 13, color: "#6B7280", marginTop: 12, fontStyle: "italic" },
  rescheduleActions: { display: "flex", gap: 12, marginTop: 24 },
  helpSection: {
    textAlign: "center",
    marginTop: 32,
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  helpTitle: { fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 8px 0" },
  helpText: { fontSize: 14, color: "#6B7280", margin: "0 0 16px 0" },
  helpContact: { fontSize: 14, color: "#374151", fontWeight: 500 },
};

export default function ManageBookingPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: 48 }}>Loading...</div>}>
      <ManageBookingContent />
    </Suspense>
  );
}
