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
  originalPrice?: number;
  discountedPrice?: number;
  discountName?: string;
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
  salon?: {
    slug: string;
  };
};

type Settings = {
  cancelMinutesAdvance: number;
  salonPhone: string;
};

function ManageBookingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [settings, setSettings] = useState<Settings>({ cancelMinutesAdvance: 1440, salonPhone: "020 1234 5678" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
          setError(appointmentRes.status === 404 
            ? "Booking not found. It may have been deleted." 
            : "Failed to load booking details.");
          return;
        }

        const appointmentData = await appointmentRes.json();
        setAppointment(appointmentData);

        if (appointmentData.status === "cancelled") {
          setCancelled(true);
        }

        const settingsData = await settingsRes.json();
        if (settingsData && !settingsData.error) {
          setSettings({
            cancelMinutesAdvance: settingsData.cancelMinutesAdvance ?? 120, // Default 2 hours
            salonPhone: settingsData.salonPhone || "020 1234 5678",
          });
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

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to cancel. Please try again.");
        return;
      }

      setCancelled(true);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canCancel = () => {
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

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loading}>Loading your booking...</div>
        </div>
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>⚠️</div>
            <h2 style={styles.errorTitle}>Oops!</h2>
            <p style={styles.errorText}>{error}</p>
            <a href="/booking" style={styles.btnPrimary}>Make a New Booking</a>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) return null;

  // Get booking URL with salon slug
  const bookingUrl = appointment.salon?.slug ? `/${appointment.salon.slug}/booking` : "/booking";

  // Cancelled view
  if (cancelled) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Booking Cancelled</h1>
        </div>
        <div style={styles.card}>
          <div style={styles.statusContainer}>
            <div style={styles.cancelledIcon}>✕</div>
            <h2 style={styles.statusTitle}>Appointment Cancelled</h2>
            <p style={styles.statusText}>Your appointment has been successfully cancelled.</p>
            <a href={bookingUrl} style={styles.btnPrimary}>Book a New Appointment</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Manage Your Booking</h1>
        <p style={styles.subtitle}>View or cancel your appointment</p>
      </div>

      {error && <div style={styles.errorBox}>⚠️ {error}</div>}

      <div style={styles.card}>
        <div style={styles.statusBadgeContainer}>
          <span style={{
            ...styles.statusBadge,
            backgroundColor: "#D1FAE5",
            color: "#065F46",
          }}>
            ✓ Confirmed
          </span>
        </div>

        <div style={styles.bookingHeader}>
          <h2 style={styles.serviceName}>{appointment.service.name}</h2>
          <p style={styles.staffName}>with {appointment.staff.name}</p>
        </div>

        <div style={styles.dateTimeBox}>
          <div style={styles.dateIcon}>📅</div>
          <div>
            <div style={styles.dateText}>{formatDate(appointment.startTime)}</div>
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
            {appointment.discountedPrice && appointment.originalPrice && appointment.discountedPrice < appointment.originalPrice ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{
                    background: "#22c55e",
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                  }}>OFF-PEAK</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ color: "#94a3b8", textDecoration: "line-through", fontSize: 14 }}>
                    £{appointment.originalPrice.toFixed(2)}
                  </span>
                  <span style={{ ...styles.detailCardValue, color: "#16a34a" }}>
                    £{appointment.discountedPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div style={styles.detailCardValue}>
                £{appointment.originalPrice?.toFixed(2) || appointment.service.price.toFixed(2)}
              </div>
            )}
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

        {canCancel() ? (
          <button 
            style={styles.btnCancel} 
            onClick={handleCancel} 
            disabled={submitting}
          >
            {submitting ? "Cancelling..." : "✕ Cancel Appointment"}
          </button>
        ) : (
          <div style={styles.warningBox}>
            <strong>⚠️ Cannot cancel</strong>
            <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>
              Appointments can only be cancelled more than {formatCancelTime()} in advance.
              Please call us if you need to make changes.
            </p>
          </div>
        )}
      </div>

      <div style={styles.helpSection}>
        <h3 style={styles.helpTitle}>Need to reschedule?</h3>
        <p style={styles.helpText}>
          Please cancel this booking and make a new one, or call us for assistance.
        </p>
        <div style={styles.helpContact}>
          <span>📞 {settings.salonPhone}</span>
        </div>
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
  btnPrimary: {
    display: "block",
    width: "100%",
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
  btnCancel: {
    display: "block",
    width: "100%",
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
