"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Service { id: string; name: string; durationMinutes: number; price: number; category: string | null; }

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: "", durationMinutes: 30, price: 0, category: "" });

  useEffect(() => { fetchServices(); }, []);
  const fetchServices = () => fetch("/api/services").then(r => r.json()).then(setServices);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(editing ? `/api/admin/services/${editing.id}` : "/api/admin/services", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    fetchServices(); setShowModal(false); setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa dịch vụ này?")) return;
    await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    fetchServices();
  };

  const menu = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/services", label: "Dịch vụ", icon: "💅", active: true },
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
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 30 }}>
          <h2 style={{ fontSize: 28 }}>Quản lý dịch vụ</h2>
          <button onClick={() => { setEditing(null); setForm({ name: "", durationMinutes: 30, price: 0, category: "" }); setShowModal(true); }} style={{ padding: "12px 24px", background: "#ff69b4", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>➕ Thêm dịch vụ</button>
        </div>
        <div style={{ background: "white", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8f9fa" }}>
              <th style={{ padding: 16, textAlign: "left" }}>Tên</th>
              <th style={{ padding: 16, textAlign: "left" }}>Thời gian</th>
              <th style={{ padding: 16, textAlign: "left" }}>Giá</th>
              <th style={{ padding: 16, textAlign: "left" }}>Danh mục</th>
              <th style={{ padding: 16, textAlign: "left" }}>Thao tác</th>
            </tr></thead>
            <tbody>{services.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 16 }}>{s.name}</td>
                <td style={{ padding: 16 }}>{s.durationMinutes} phút</td>
                <td style={{ padding: 16 }}>£{s.price}</td>
                <td style={{ padding: 16 }}>{s.category || "-"}</td>
                <td style={{ padding: 16 }}>
                  <button onClick={() => { setEditing(s); setForm({ name: s.name, durationMinutes: s.durationMinutes, price: s.price, category: s.category || "" }); setShowModal(true); }} style={{ padding: "6px 12px", background: "#3498db", color: "white", border: "none", borderRadius: 4, marginRight: 8, cursor: "pointer" }}>✏️</button>
                  <button onClick={() => handleDelete(s.id)} style={{ padding: "6px 12px", background: "#e74c3c", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>🗑️</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "white", padding: 32, borderRadius: 12, width: 400 }}>
              <h3 style={{ marginBottom: 20 }}>{editing ? "Sửa dịch vụ" : "Thêm dịch vụ"}</h3>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>Tên *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>Thời gian (phút) *</label>
                  <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: +e.target.value })} required style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>Giá (£) *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} required style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }} />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>Danh mục</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}>
                    <option value="">-- Chọn --</option>
                    <option value="Nails">Nails</option>
                    <option value="Head Spa">Head Spa</option>
                    <option value="Eyelash">Eyelash</option>
                    <option value="Waxing">Waxing</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ padding: "10px 20px", background: "#f0f0f0", border: "none", borderRadius: 6, cursor: "pointer" }}>Hủy</button>
                  <button type="submit" style={{ padding: "10px 20px", background: "#ff69b4", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>{editing ? "Lưu" : "Thêm"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
