"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  service: { name: string; price: number } | null;
  staff: { name: string } | null;
};

export default function AdminDashboard() {
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
          totalServices: services.length,
          totalStaff: staff.filter((s: { active: boolean }) => s.active).length,
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#666" }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: "#1A1A1A", margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: "#666", marginTop: 4 }}>Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 32 }}>
        {[
          { label: "Today's Bookings", value: stats.todayBookings, icon: "📅" },
          { label: "Upcoming", value: stats.upcomingBookings, icon: "⏰" },
          { label: "Total Customers", value: stats.totalCustomers, icon: "👥" },
          { label: "Revenue", value: formatCurrency(stats.revenue), icon: "💰" },
        ].map((stat) => (
          <div key={stat.label} style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: 24,
            border: "1px solid #E8E8E8",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>{stat.icon}</span>
              <span style={{ fontSize: 13, color: "#666" }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 600, color: "#1A1A1A" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Today's Appointments */}
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          border: "1px solid #E8E8E8",
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: "1px solid #E8E8E8",
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A", margin: 0 }}>Today's Appointments</h2>
            <Link href="/admin/calendar" style={{ fontSize: 13, color: "#D4B896", textDecoration: "none", fontWeight: 500 }}>
              View all →
            </Link>
          </div>
          <div style={{ padding: 24 }}>
            {todayAppointments.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: "#666" }}>
                <p style={{ margin: 0 }}>No appointments today</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {todayAppointments.map((apt) => (
                  <div key={apt.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: 16,
                    backgroundColor: "#FAFAFA",
                    borderRadius: 12,
                  }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#1A1A1A",
                      minWidth: 50,
                    }}>
                      {formatTime(apt.startTime)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A", margin: 0 }}>
                        {apt.service?.name || "Unknown Service"}
                      </p>
                      <p style={{ fontSize: 12, color: "#666", margin: "4px 0 0" }}>
                        {apt.customerName} • {apt.staff?.name || "Unassigned"}
                      </p>
                    </div>
                    <div style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "capitalize",
                      backgroundColor: apt.status === "booked" || apt.status === "confirmed" ? "#E8F5E9" : "#FFEBEE",
                      color: apt.status === "booked" || apt.status === "confirmed" ? "#2E7D32" : "#C62828",
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
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          border: "1px solid #E8E8E8",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E8E8E8",
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1A1A1A", margin: 0 }}>Quick Actions</h2>
          </div>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { href: "/admin/calendar", label: "View Calendar", icon: "📅" },
              { href: "/admin/services", label: "Manage Services", icon: "✨", badge: stats.totalServices },
              { href: "/admin/staff", label: "Manage Staff", icon: "👤", badge: stats.totalStaff },
              { href: "/admin/working-hours", label: "Working Hours", icon: "🕐" },
              { href: "/booking", label: "View Booking Page", icon: "🔗", external: true },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                target={action.external ? "_blank" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  backgroundColor: "#FAFAFA",
                  borderRadius: 12,
                  textDecoration: "none",
                  color: "#1A1A1A",
                  fontSize: 14,
                  fontWeight: 500,
                  transition: "background-color 0.15s",
                }}
              >
                <span style={{ fontSize: 20 }}>{action.icon}</span>
                <span style={{ flex: 1 }}>{action.label}</span>
                {action.badge !== undefined && (
                  <span style={{
                    backgroundColor: "#E8E8E8",
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#666",
                  }}>
                    {action.badge}
                  </span>
                )}
                {action.external && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
