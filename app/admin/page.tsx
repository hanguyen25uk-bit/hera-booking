"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalServices: 0, totalStaff: 0, todayBookings: 0, upcomingBookings: 0 });

  useEffect(() => {
    Promise.all([fetch("/api/services"), fetch("/api/staff"), fetch("/api/appointments")])
      .then(async ([s, st, a]) => {
        const services = await s.json();
        const staff = await st.json();
        const appointments = await a.json();
        const today = new Date().toDateString();
        setStats({
          totalServices: services.length,
          totalStaff: staff.length,
          todayBookings: appointments.filter((a: any) => new Date(a.startTime).toDateString() === today).length,
          upcomingBookings: appointments.filter((a: any) => new Date(a.startTime) > new Date() && a.status === "booked").length,
        });
      });
  }, []);

  const menu = [
    { href: "/admin", label: "Dashboard", icon: "📊", active: true },
    { href: "/admin/services", label: "Dịch vụ", icon: "💅" },
    { href: "/admin/staff", label: "Nhân viên", icon: "👩‍💼" },
    { href: "/admin/working-hours", label: "Giờ làm việc", icon: "🕐" },
    { href: "/admin/calendar", label: "Lịch đặt", icon: "📅" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f5" }}>
      <aside style={{ width: 250, background: "#1a1a2e", color: "white", padding: 20 }}>
        <h1 style={{ fontSize: 24, marginBottom: 30, color: "#ff69b4" }}>🌸 Hera Admin</h1>
        <nav>{menu.map((m) => (
          <Link key={m.href} href={m.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 8, marginBottom: 8, background: m.active ? "#ff69b4" : "transparent", color: "white", textDecoration: "none" }}>
            <span>{m.icon}</span><span>{m.label}</span>
          </Link>
        ))}</nav>
      </aside>
      <main style={{ flex: 1, padding: 30 }}>
        <h2 style={{ fontSize: 28, marginBottom: 30 }}>Dashboard</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 30 }}>
          {[
            { title: "Dịch vụ", value: stats.totalServices, icon: "💅", color: "#ff69b4" },
            { title: "Nhân viên", value: stats.totalStaff, icon: "👩‍💼", color: "#9b59b6" },
            { title: "Hôm nay", value: stats.todayBookings, icon: "📅", color: "#3498db" },
            { title: "Sắp tới", value: stats.upcomingBookings, icon: "⏰", color: "#2ecc71" },
          ].map((c) => (
            <div key={c.title} style={{ background: "white", padding: 24, borderRadius: 12, borderLeft: `4px solid ${c.color}` }}>
              <p style={{ color: "#666", fontSize: 14 }}>{c.title}</p>
              <p style={{ fontSize: 32, fontWeight: "bold" }}>{c.value}</p>
            </div>
          ))}
        </div>
        <div style={{ background: "white", padding: 24, borderRadius: 12 }}>
          <h3 style={{ marginBottom: 20 }}>Thao tác nhanh</h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { href: "/admin/services", label: "➕ Thêm dịch vụ" },
              { href: "/admin/staff", label: "➕ Thêm nhân viên" },
              { href: "/admin/calendar", label: "📅 Xem lịch" },
              { href: "/booking", label: "🔗 Trang booking" },
            ].map((b) => (
              <Link key={b.href} href={b.href} style={{ padding: "12px 24px", background: "#ff69b4", color: "white", borderRadius: 8, textDecoration: "none" }}>{b.label}</Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
