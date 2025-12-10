"use client";

import { useEffect, useState } from "react";

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
  };
  staff: {
    id: string;
    name: string;
  };
  status: string;
};

type Staff = {
  id: string;
  name: string;
  role?: string | null;
};

export default function AdminCalendarPage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Set today as default
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  // Load staff list
  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await fetch("/api/staff");
        const data = await res.json();
        setStaff(data.filter((s: Staff) => s.name)); // Only staff with names
      } catch (error) {
        console.error("Failed to load staff:", error);
      }
    }
    loadStaff();
  }, []);

  // Load appointments when date changes
  useEffect(() => {
    if (!selectedDate) return;

    async function loadAppointments() {
      setLoading(true);
      try {
        const res = await fetch(`/api/appointments?date=${selectedDate}`);
        const data = await res.json();
        setAppointments(data);
      } catch (error) {
        console.error("Failed to load appointments:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, [selectedDate]);

  // Generate time slots (9:00 - 20:00, every 30 mins)
  const timeSlots: string[] = [];
  for (let hour = 9; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
    if (hour < 20) {
      timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }

  // Get appointments for specific staff and time
  const getAppointmentAtSlot = (staffId: string, time: string) => {
    return appointments.find((apt) => {
      const aptTime = new Date(apt.startTime);
      const slotTime = `${aptTime.getHours().toString().padStart(2, "0")}:${aptTime
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      return apt.staff.id === staffId && slotTime === time;
    });
  };

  // Calculate appointment height based on duration
  const getAppointmentHeight = (appointment: Appointment) => {
    const duration = appointment.service.durationMinutes;
    const slots = Math.ceil(duration / 30);
    return slots * 60; // 60px per slot
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Calendar View</h1>
          <p style={styles.subtitle}>Staff schedule for {formatDate(selectedDate)}</p>
        </div>

        {/* Date Picker */}
        <div style={styles.datePicker}>
          <button
            style={styles.navButton}
            onClick={() => {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() - 1);
              setSelectedDate(date.toISOString().split("T")[0]);
            }}
          >
            ← Prev
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={styles.dateInput}
          />

          <button
            style={styles.navButton}
            onClick={() => {
              const date = new Date(selectedDate);
              date.setDate(date.getDate() + 1);
              setSelectedDate(date.toISOString().split("T")[0]);
            }}
          >
            Next →
          </button>

          <button
            style={styles.todayButton}
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              setSelectedDate(today);
            }}
          >
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading calendar...</div>
      ) : (
        <>
          {/* Calendar Grid */}
          <div style={styles.calendarWrapper}>
            <div style={styles.calendar}>
              {/* Header Row - Staff Names */}
              <div style={styles.headerRow}>
                <div style={styles.timeColumn}>Time</div>
                {staff.map((member) => (
                  <div key={member.id} style={styles.staffColumn}>
                    <div style={styles.staffName}>{member.name}</div>
                    {member.role && <div style={styles.staffRole}>{member.role}</div>}
                  </div>
                ))}
              </div>

              {/* Time Slots Grid */}
              <div style={styles.gridContainer}>
                {timeSlots.map((time, index) => (
                  <div key={time} style={styles.row}>
                    {/* Time Label */}
                    <div style={styles.timeCell}>{time}</div>

                    {/* Staff Columns */}
                    {staff.map((member) => {
                      const appointment = getAppointmentAtSlot(member.id, time);
                      const prevSlotHasAppointment =
                        index > 0 && getAppointmentAtSlot(member.id, timeSlots[index - 1]);

                      // Skip rendering if this slot is part of a multi-slot appointment from previous slot
                      if (prevSlotHasAppointment) {
                        const prevTime = new Date(prevSlotHasAppointment.startTime);
                        const currentSlot = new Date(
                          selectedDate + "T" + time + ":00"
                        );
                        const prevEnd = new Date(prevSlotHasAppointment.endTime);

                        if (currentSlot < prevEnd) {
                          return <div key={member.id} style={styles.emptyCell} />;
                        }
                      }

                      return (
                        <div
                          key={member.id}
                          style={{
                            ...styles.staffCell,
                            position: "relative",
                          }}
                        >
                          {appointment && (
                            <div
                              style={{
                                ...styles.appointmentBlock,
                                height: getAppointmentHeight(appointment),
                              }}
                              onClick={() => setSelectedAppointment(appointment)}
                            >
                              <div style={styles.appointmentTime}>
                                {new Date(appointment.startTime).toLocaleTimeString("en-GB", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                              <div style={styles.appointmentService}>
                                {appointment.service.name}
                              </div>
                              <div style={styles.appointmentCustomer}>
                                {appointment.customerName}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={styles.stats}>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{appointments.length}</div>
              <div style={styles.statLabel}>Appointments Today</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>{staff.length}</div>
              <div style={styles.statLabel}>Staff Members</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statNumber}>
                {appointments.filter((a) => a.status === "booked").length}
              </div>
              <div style={styles.statLabel}>Confirmed</div>
            </div>
          </div>
        </>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div style={styles.modalOverlay} onClick={() => setSelectedAppointment(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Appointment Details</h3>
              <button
                style={styles.closeButton}
                onClick={() => setSelectedAppointment(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Service:</span>
                <span style={styles.detailValue}>
                  {selectedAppointment.service.name}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Staff:</span>
                <span style={styles.detailValue}>
                  {selectedAppointment.staff.name}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Customer:</span>
                <span style={styles.detailValue}>
                  {selectedAppointment.customerName}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Phone:</span>
                <span style={styles.detailValue}>
                  {selectedAppointment.customerPhone}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Time:</span>
                <span style={styles.detailValue}>
                  {new Date(selectedAppointment.startTime).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(selectedAppointment.endTime).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Duration:</span>
                <span style={styles.detailValue}>
                  {selectedAppointment.service.durationMinutes} minutes
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Status:</span>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor:
                      selectedAppointment.status === "booked" ? "#D1FAE5" : "#FEE2E2",
                    color:
                      selectedAppointment.status === "booked" ? "#065F46" : "#991B1B",
                  }}
                >
                  {selectedAppointment.status}
                </span>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.btnSecondary}
                onClick={() => setSelectedAppointment(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// STYLES
// ========================================

const styles = {
  container: {
    padding: "24px",
    backgroundColor: "#F9FAFB",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    flexWrap: "wrap" as const,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  datePicker: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  dateInput: {
    padding: "8px 12px",
    border: "1px solid #D1D5DB",
    borderRadius: 6,
    fontSize: 14,
  },
  navButton: {
    padding: "8px 16px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #D1D5DB",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
  todayButton: {
    padding: "8px 16px",
    backgroundColor: "#EC4899",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  loading: {
    textAlign: "center" as const,
    padding: 48,
    fontSize: 16,
    color: "#6B7280",
  },
  calendarWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: 24,
    overflowX: "auto" as const,
  },
  calendar: {
    minWidth: 800,
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "80px repeat(auto-fit, minmax(150px, 1fr))",
    gap: 1,
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeColumn: {
    fontWeight: 600,
    fontSize: 14,
    color: "#374151",
  },
  staffColumn: {
    textAlign: "center" as const,
  },
  staffName: {
    fontWeight: 600,
    fontSize: 14,
    color: "#111827",
  },
  staffRole: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  gridContainer: {
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "80px repeat(auto-fit, minmax(150px, 1fr))",
    gap: 1,
    backgroundColor: "#E5E7EB",
  },
  timeCell: {
    padding: "8px",
    backgroundColor: "#F9FAFB",
    fontSize: 13,
    color: "#6B7280",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    height: 60,
  },
  staffCell: {
    backgroundColor: "#FFFFFF",
    minHeight: 60,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  emptyCell: {
    backgroundColor: "#FFFFFF",
  },
  appointmentBlock: {
    position: "absolute" as const,
    top: 2,
    left: 2,
    right: 2,
    backgroundColor: "#FEE2E2",
    border: "2px solid #DC2626",
    borderRadius: 6,
    padding: 8,
    cursor: "pointer",
    overflow: "hidden",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  appointmentTime: {
    fontSize: 11,
    fontWeight: 700,
    color: "#991B1B",
    marginBottom: 4,
  },
  appointmentService: {
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
    marginBottom: 2,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  appointmentCustomer: {
    fontSize: 11,
    color: "#6B7280",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    textAlign: "center" as const,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 700,
    color: "#EC4899",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  modalOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "90%",
    maxWidth: 500,
    maxHeight: "90vh",
    overflow: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottom: "1px solid #E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  closeButton: {
    backgroundColor: "transparent",
    border: "none",
    fontSize: 24,
    color: "#6B7280",
    cursor: "pointer",
    padding: 0,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #F3F4F6",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: 500,
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: 600,
    textAlign: "right" as const,
  },
  statusBadge: {
    padding: "4px 12px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  modalFooter: {
    padding: 20,
    borderTop: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  btnSecondary: {
    padding: "10px 20px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #D1D5DB",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
};