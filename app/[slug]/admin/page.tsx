"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Stats = {
  totalServices: number;
  totalStaff: number;
  todayBookings: number;
  upcomingBookings: number;
  totalCustomers: number;
  revenue: number;
};

type Appointment = {
  id: string;
  customerName: string;
  customerPhone: string;
  startTime: string;
  endTime: string;
  status: string;
  service: { name: string; price: number };
  staff: { name: string };
};

export default function SalonAdminDashboard() {
  const params = useParams();
  const slug = params.slug as string;
  const basePath = `/${slug}/admin`;

  const [stats, setStats] = useState<Stats>({
    totalServices: 0, totalStaff: 0, todayBookings: 0,
    upcomingBookings: 0, totalCustomers: 0, revenue: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [servicesRes, staffRes, appointmentsRes] = await Promise.all([
          fetch("/api/services"), fetch("/api/staff"), fetch("/api/appointments"),
        ]);
        const services = await servicesRes.json();
        const staff = await staffRes.json();
        const appointments: Appointment[] = await appointmentsRes.json();
        const today = new Date().toDateString();
        const todayAppts = appointments.filter((a) => new Date(a.startTime).toDateString() === today);
        const upcomingAppts = appointments.filter((a) => new Date(a.startTime) > new Date() && a.status === "booked");
        const uniqueCustomers = new Set(appointments.map((a) => a.customerPhone));
        const revenue = appointments.filter((a) => a.status === "completed").reduce((sum, a) => sum + (a.service?.price || 0), 0);
        setStats({
          totalServices: Array.isArray(services) ? services.length : 0,
          totalStaff: Array.isArray(staff) ? staff.filter((s: any) => s.active).length : 0,
          todayBookings: todayAppts.length,
          upcomingBookings: upcomingAppts.length,
          totalCustomers: uniqueCustomers.size,
          revenue: revenue,
        });
        setTodayAppointments(todayAppts.slice(0, 5));
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--ink-muted)" }}>
        <p style={{ fontFamily: "var(--font-body)" }}>Loading dashboard...</p>
      </div>
    );
  }

  const statCards = [
    { label: "Today's Bookings", value: stats.todayBookings, color: "var(--rose)", bgColor: "var(--rose-pale)" },
    { label: "Upcoming", value: stats.upcomingBookings, color: "var(--gold)", bgColor: "var(--gold-light)" },
    { label: "Total Customers", value: stats.totalCustomers, color: "var(--sage)", bgColor: "var(--sage-light)" },
    { label: "Revenue", value: formatCurrency(stats.revenue), color: "var(--ink)", bgColor: "var(--cream-dark)" },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 600,
            color: "var(--ink)",
            margin: 0,
            fontFamily: "var(--font-heading)",
            letterSpacing: "-0.02em"
          }}>
            Dashboard
          </h1>
          <p style={{
            fontSize: 15,
            color: "var(--ink-muted)",
            marginTop: 6,
            fontFamily: "var(--font-body)"
          }}>
            Welcome back! Here is what is happening today.
          </p>
        </div>
        <Link
          href={`${basePath}/calendar`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 24px",
            backgroundColor: "var(--rose)",
            color: "var(--white)",
            borderRadius: 50,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-body)",
            transition: "all 0.2s ease",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <span>View Calendar</span>
          <span style={{ fontSize: 16 }}>→</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        {statCards.map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: "var(--white)",
              borderRadius: 16,
              padding: 24,
              border: "1px solid var(--cream-dark)",
              boxShadow: "var(--shadow-sm)",
              transition: "all 0.2s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: stat.bgColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: stat.color
                }} />
              </div>
              <div>
                <p style={{
                  fontSize: 13,
                  color: "var(--ink-muted)",
                  margin: 0,
                  marginBottom: 4,
                  fontFamily: "var(--font-body)",
                  fontWeight: 500
                }}>
                  {stat.label}
                </p>
                <p style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: "var(--ink)",
                  margin: 0,
                  fontFamily: "var(--font-heading)",
                  letterSpacing: "-0.02em"
                }}>
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 24 }}>
        {/* Today's Appointments */}
        <div style={{
          backgroundColor: "var(--white)",
          borderRadius: 16,
          border: "1px solid var(--cream-dark)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: "1px solid var(--cream-dark)"
          }}>
            <h2 style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ink)",
              margin: 0,
              fontFamily: "var(--font-heading)"
            }}>
              Today's Appointments
            </h2>
            <Link
              href={`${basePath}/calendar`}
              style={{
                fontSize: 13,
                color: "var(--rose)",
                textDecoration: "none",
                fontWeight: 600,
                fontFamily: "var(--font-body)"
              }}
            >
              View all →
            </Link>
          </div>
          <div style={{ padding: 20 }}>
            {todayAppointments.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "40px 0",
                color: "var(--ink-muted)",
                fontFamily: "var(--font-body)"
              }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  backgroundColor: "var(--cream-dark)",
                  margin: "0 auto 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <span style={{ fontSize: 24 }}>📅</span>
                </div>
                <p style={{ margin: 0 }}>No appointments today</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: 16,
                      backgroundColor: "var(--cream)",
                      borderRadius: 12,
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--ink)",
                      minWidth: 50,
                      fontFamily: "var(--font-body)"
                    }}>
                      {formatTime(apt.startTime)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ink)",
                        margin: 0,
                        fontFamily: "var(--font-body)"
                      }}>
                        {apt.service.name}
                      </p>
                      <p style={{
                        fontSize: 13,
                        color: "var(--ink-muted)",
                        margin: 0,
                        marginTop: 3,
                        fontFamily: "var(--font-body)"
                      }}>
                        {apt.customerName} • {apt.staff.name}
                      </p>
                    </div>
                    <div style={{
                      padding: "5px 12px",
                      borderRadius: 50,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.02em",
                      fontFamily: "var(--font-body)",
                      backgroundColor: apt.status === "booked" || apt.status === "confirmed" ? "var(--sage-light)" : "var(--rose-pale)",
                      color: apt.status === "booked" || apt.status === "confirmed" ? "var(--sage)" : "var(--rose)"
                    }}>
                      {apt.status === "booked" ? "Confirmed" : apt.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: "var(--white)",
          borderRadius: 16,
          border: "1px solid var(--cream-dark)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden"
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--cream-dark)" }}>
            <h2 style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ink)",
              margin: 0,
              fontFamily: "var(--font-heading)"
            }}>
              Quick Actions
            </h2>
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { href: `${basePath}/services`, label: "Manage Services", badge: stats.totalServices, color: "var(--rose)" },
              { href: `${basePath}/staff`, label: "Manage Staff", badge: stats.totalStaff, color: "var(--sage)" },
              { href: `${basePath}/working-hours`, label: "Staff Working Hours", color: "var(--gold)" },
              { href: `/${slug}/booking`, label: "View Booking Page", external: true, color: "var(--ink)" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                target={action.external ? "_blank" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 18px",
                  backgroundColor: "var(--cream)",
                  borderRadius: 12,
                  textDecoration: "none",
                  color: "var(--ink)",
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "var(--font-body)",
                  transition: "all 0.2s ease",
                  border: "1px solid transparent"
                }}
              >
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: action.color
                }} />
                <span style={{ flex: 1 }}>{action.label}</span>
                {action.badge !== undefined && (
                  <span style={{
                    backgroundColor: "var(--cream-dark)",
                    padding: "4px 12px",
                    borderRadius: 50,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-light)"
                  }}>
                    {action.badge}
                  </span>
                )}
                <span style={{ color: "var(--ink-muted)", fontSize: 16 }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
