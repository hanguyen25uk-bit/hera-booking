"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const DEFAULT_HOURS = [
  { dayOfWeek: 0, dayName: "Chủ nhật", isOpen: false, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 1, dayName: "Thứ hai", isOpen: true, openTime: "09:30", closeTime: "19:00" },
  { dayOfWeek: 2, dayName: "Thứ ba", isOpen: true, openTime: "09:30", closeTime: "19:00" },
  { dayOfWeek: 3, dayName: "Thứ tư", isOpen: true, openTime: "09:30", closeTime: "19:00" },
  { dayOfWeek: 4, dayName: "Thứ năm", isOpen: true, openTime: "09:30", closeTime: "19:00" },
  { dayOfWeek: 5, dayName: "Thứ sáu", isOpen: true, openTime: "09:30", closeTime: "19:00" },
  { dayOfWeek: 6, dayName: "Thứ bảy", isOpen: true, openTime: "09:00", closeTime: "18:00" },
];

export default function AdminWorkingHours() {
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/working-hours").then(r => r.json()).then(data => { if (data.length) setHours(data); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/working-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hours),
    });
    setMessage(res.ok ? "✅ Đã lưu!" : "❌ Lỗi!");
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const timeOptions = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeOptions.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
  }

  const menu = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/services", label: "Dịch vụ", icon: "💅" },
    { href: "/admin/staff", label: "Nhân viên", icon: "👩‍💼" },
    { href: "/admin/working-hours", label: "Giờ làm việc", icon: "🕐", active: true },
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
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 30 }}>
          <h2 style={{ fontSize: 28 }}>Giờ làm việc</h2>
          <button onClick={handleSave} disabled={saving} style={{ padding: "12px 24px", background: saving ? "#ccc" : "#ff69b4", color: "white", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontWeight: 600 }}>
            {saving ? "Đang lưu..." : "💾 Lưu thay đổi"}
          </button>
        </div>
        {message && <div style={{ padding: 16, borderRadius: 8, marginBottom: 20, background: message.includes("✅") ? "#d4edda" : "#f8d7da" }}>{message}</div>}
        <div style={{ background: "white", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8f9fa" }}>
              <th style={{ padding: 16, textAlign: "left" }}>Ngày</th>
              <th style={{ padding: 16, textAlign: "left" }}>Trạng thái</th>
              <th style={{ padding: 16, textAlign: "left" }}>Mở cửa</th>
              <th style={{ padding: 16, textAlign: "left" }}>Đóng cửa</th>
            </tr></thead>
            <tbody>{hours.map((day) => (
              <tr key={day.dayOfWeek} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 16 }}><strong>{day.dayName}</strong></td>
                <td style={{ padding: 16 }}>
                  <button onClick={() => setHours(hours.map(h => h.dayOfWeek === day.dayOfWeek ? { ...h, isOpen: !h.isOpen } : h))} style={{ padding: "8px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 600, background: day.isOpen ? "#d4edda" : "#f8d7da", color: day.isOpen ? "#155724" : "#721c24" }}>
                    {day.isOpen ? "✅ Mở cửa" : "❌ Đóng cửa"}
                  </button>
                </td>
                <td style={{ padding: 16 }}>
                  <select value={day.openTime} onChange={(e) => setHours(hours.map(h => h.dayOfWeek === day.dayOfWeek ? { ...h, openTime: e.target.value } : h))} disabled={!day.isOpen} style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd", opacity: day.isOpen ? 1 : 0.5 }}>
                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td style={{ padding: 16 }}>
                  <select value={day.closeTime} onChange={(e) => setHours(hours.map(h => h.dayOfWeek === day.dayOfWeek ? { ...h, closeTime: e.target.value } : h))} disabled={!day.isOpen} style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd", opacity: day.isOpen ? 1 : 0.5 }}>
                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
