"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Staff { id: string; name: string; role: string | null; active: boolean; }

export default function AdminStaff() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState({ name: "", role: "", active: true });

  useEffect(() => { fetchStaff(); }, []);
  const fetchStaff = () => fetch("/api/staff").then(r => r.json()).then(setStaffList);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(editing ? `/api/admin/staff/${editing.id}` : "/api/admin/staff", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    fetchStaff(); setShowModal(false); setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa nhân viên này?")) return;
    await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
    fetchStaff();
  };

  const toggleActive = async (s: Staff) => {
    await fetch(`/api/admin/staff/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, active: !s.active }),
    });
    fetchStaff();
  };

  const menu = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/services", label: "Dịch vụ", icon: "💅" },
    { href: "/admin/staff", label: "Nhân viên", icon: "👩‍💼", active: true },
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
          <h2 style={{ fontSize: 28 }}>Quản lý nhân viên</h2>
          <button onClick={() => { setEditing(null); setForm({ name: "", role: "", active: true }); setShowModal(true); }} style={{ padding: "12px 24px", background: "#ff69b4", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>➕ Thêm nhân viên</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {staffList.map((s) => (
            <div key={s.id} style={{ background: "white", borderRadius: 12, padding: 24, opacity: s.active ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: 20, marginBottom: 8 }}>{s.name}</h3>
                  <p style={{ color: "#666", marginBottom: 12 }}>{s.role || "Chưa có chức vụ"}</p>
                  <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.active ? "#d4edda" : "#f8d7da", color: s.active ? "#155724" : "#721c24" }}>
                    {s.active ? "Đang làm việc" : "Tạm nghỉ"}
                  </span>
                </div>
                <span style={{ fontSize: 40 }}>👩‍💼</span>
              </div>
              <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
                <button onClick={() => { setEditing(s); setForm({ name: s.name, role: s.role || "", active: s.active }); setShowModal(true); }} style={{ padding: "8px 12px", background: "#3498db", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>✏️</button>
                <button onClick={() => toggleActive(s)} style={{ padding: "8px 12px", background: "#f39c12", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>{s.active ? "⏸️" : "▶️"}</button>
                <button onClick={() => handleDelete(s.id)} style={{ padding: "8px 12px", background: "#e74c3c", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "white", padding: 32, borderRadius: 12, width: 400 }}>
              <h3 style={{ marginBottom: 20 }}>{editing ? "Sửa nhân viên" : "Thêm nhân viên"}</h3>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>Tên *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>Chức vụ</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6 }}>
                    <option value="">-- Chọn --</option>
                    <option value="Nail Technician">Nail Technician</option>
                    <option value="Head Spa Specialist">Head Spa Specialist</option>
                    <option value="Eyelash Technician">Eyelash Technician</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                    <span>Đang làm việc</span>
                  </label>
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
