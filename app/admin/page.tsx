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
  service: { name: string; price: number };
  staff: { name: string };
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
          totalStaff: staff.filter((s: any) => s.active).length,
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#6B7280" }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>Welcome back! Here is what is happening today.</p>
        </div>
        <Link href="/admin/calendar" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", backgroundColor: "#EC4899", color: "#FFFFFF", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
          📅 View Calendar
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 32 }}>
        {[
          { label: "Today's Bookings", value: stats.todayBookings, icon: "📅", color: "#EC4899" },
          { label: "Upcoming", value: stats.upcomingBookings, icon: "⏰", color: "#8B5CF6" },
          { label: "Total Customers", value: stats.totalCustomers, icon: "👥", color: "#10B981" },
          { label: "Revenue", value: formatCurrency(stats.revenue), icon: "💰", color: "#F59E0B" },
        ].map((stat) => (
          <div key={stat.label} style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: `4px solid ${stat.color}` }}>
            <div style={{ fontSize: 32 }}>{stat.icon}</div>
            <div>
              <p style={{ fontSize: 13, color: "#6B7280", margin: 0, marginBottom: 4 }}>{stat.label}</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: 0 }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24, marginBottom: 32 }}>
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #E5E7EB" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>Today's Appointments</h2>
            <Link href="/admin/calendar" style={{ fontSize: 13, color: "#EC4899", textDecoration: "none", fontWeight: 500 }}>View all →</Link>
          </div>
          <div style={{ padding: 20 }}>
            {todayAppointments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#6B7280" }}>
                <p>No appointments today</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {todayAppointments.map((apt) => (
                  <div key={apt.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: 12, backgroundColor: "#F9FAFB", borderRadius: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", minWidth: 50 }}>{formatTime(apt.startTime)}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", margin: 0 }}>{apt.service?.name || "Unknown Service"}</p>
                      <p style={{ fontSize: 12, color: "#6B7280", margin: 0, marginTop: 2 }}>{apt.customerName} • {apt.staff?.name || "Unassigned"}</p>
                    </div>
                    <div style={{ padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, textTransform: "capitalize", backgroundColor: apt.status === "booked" ? "#DCFCE7" : "#FEE2E2", color: apt.status === "booked" ? "#166534" : "#991B1B" }}>
                      {apt.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: "#FFFFFF", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #E5E7EB" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>Quick Actions</h2>
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { href: "/admin/services", label: "Manage Services", icon: "💅", badge: stats.totalServices },
              { href: "/admin/staff", label: "Manage Staff", icon: "👩‍💼", badge: stats.totalStaff },
              { href: "/admin/working-hours", label: "Working Hours", icon: "🕐" },
              { href: "/booking", label: "View Booking Page", icon: "🔗", external: true },
            ].map((action) => (
              <Link key={action.href} href={action.href} target={action.external ? "_blank" : undefined} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", backgroundColor: "#F9FAFB", borderRadius: 8, textDecoration: "none", color: "#374151", fontSize: 14, fontWeight: 500 }}>
                <span style={{ fontSize: 20 }}>{action.icon}</span>
                <span>{action.label}</span>
                {action.badge !== undefined && (
                  <span style={{ marginLeft: "auto", backgroundColor: "#E5E7EB", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "#374151" }}>{action.badge}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
