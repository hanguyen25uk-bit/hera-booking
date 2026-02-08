"use client";

import { useEffect, useState } from "react";

type Staff = {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
  serviceIds?: string[];
};

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
};

const AVATAR_COLORS = ["var(--rose)", "var(--sage)", "var(--gold)", "var(--ink)"];

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffServices, setStaffServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [staffRes, servicesRes] = await Promise.all([
        fetch("/api/admin/staff", { credentials: "include" }),
        fetch("/api/admin/services", { credentials: "include" }),
      ]);
      setStaff(await staffRes.json());
      setServices(await servicesRes.json());
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStaffServices(staffId: string) {
    try {
      const res = await fetch(`/api/admin/staff-services?staffId=${staffId}`, { credentials: "include" });
      const data = await res.json();
      setStaffServices(data.map((s: { serviceId: string }) => s.serviceId));
    } catch (err) {
      setStaffServices([]);
    }
  }

  async function handleSaveServices() {
    if (!selectedStaff) return;
    setSaving(true);
    try {
      await fetch("/api/admin/staff-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ staffId: selectedStaff.id, serviceIds: staffServices }),
      });
      setShowServiceModal(false);
      loadData();
    } catch (err) {
      alert("Error saving services");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveStaff() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const url = editingStaff ? `/api/admin/staff/${editingStaff.id}` : "/api/admin/staff";
      const method = editingStaff ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: formName, role: formRole || "Nail Technician" }),
      });
      setShowModal(false);
      setFormName(""); setFormRole(""); setEditingStaff(null);
      loadData();
    } catch (err) {
      alert("Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(s: Staff) {
    try {
      await fetch(`/api/admin/staff/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ active: !s.active }),
      });
      loadData();
    } catch (err) {
      alert("Error updating status");
    }
  }

  async function handleDelete(s: Staff) {
    if (!confirm(`Delete ${s.name}?`)) return;
    try {
      await fetch(`/api/admin/staff/${s.id}`, { method: "DELETE", credentials: "include" });
      loadData();
    } catch (err) {
      alert("Error deleting");
    }
  }

  function openServiceModal(s: Staff) {
    setSelectedStaff(s);
    loadStaffServices(s.id);
    setShowServiceModal(true);
  }

  function openEditModal(s: Staff) {
    setEditingStaff(s);
    setFormName(s.name);
    setFormRole(s.role || "");
    setShowModal(true);
  }

  function openAddModal() {
    setEditingStaff(null);
    setFormName(""); setFormRole("");
    setShowModal(true);
  }

  function toggleService(serviceId: string) {
    setStaffServices(prev => prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
            Staff
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 6, fontFamily: "var(--font-body)" }}>
            Manage your team members and their services
          </p>
        </div>
        <button onClick={openAddModal} style={{ padding: "12px 24px", backgroundColor: "var(--rose)", color: "var(--white)", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", boxShadow: "var(--shadow-sm)" }}>
          + Add Staff
        </button>
      </div>

      {/* Staff Table */}
      <div style={{ backgroundColor: "var(--white)", borderRadius: 16, border: "1px solid var(--cream-dark)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--cream-dark)", backgroundColor: "var(--cream)" }}>
              <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Name</th>
              <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Role</th>
              <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Status</th>
              <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Services</th>
              <th style={{ textAlign: "right", padding: "16px 20px", fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s, idx) => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--cream-dark)" }}>
                <td style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                      color: "var(--white)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: 16,
                      fontFamily: "var(--font-body)"
                    }}>
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15, fontFamily: "var(--font-body)" }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ padding: "18px 20px", color: "var(--ink-muted)", fontSize: 14, fontFamily: "var(--font-body)" }}>
                  {s.role || "Nail Technician"}
                </td>
                <td style={{ padding: "18px 20px" }}>
                  <span style={{
                    padding: "5px 12px",
                    borderRadius: 50,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "var(--font-body)",
                    backgroundColor: s.active ? "var(--sage-light)" : "var(--rose-pale)",
                    color: s.active ? "var(--sage)" : "var(--rose)"
                  }}>
                    {s.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {s.serviceIds && s.serviceIds.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {s.serviceIds.slice(0, 3).map(serviceId => {
                          const service = services.find(svc => svc.id === serviceId);
                          return service ? (
                            <span key={serviceId} style={{
                              padding: "4px 10px",
                              backgroundColor: "var(--cream)",
                              color: "var(--ink-light)",
                              borderRadius: 50,
                              fontSize: 12,
                              fontWeight: 500,
                              fontFamily: "var(--font-body)"
                            }}>
                              {service.name}
                            </span>
                          ) : null;
                        })}
                        {s.serviceIds.length > 3 && (
                          <span style={{ padding: "4px 10px", backgroundColor: "var(--cream-dark)", color: "var(--ink-muted)", borderRadius: 50, fontSize: 12, fontWeight: 500 }}>
                            +{s.serviceIds.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: "var(--ink-muted)", fontSize: 13, fontFamily: "var(--font-body)" }}>No services assigned</span>
                    )}
                    <button onClick={() => openServiceModal(s)} style={{
                      padding: "6px 14px",
                      backgroundColor: "var(--cream)",
                      border: "1px solid var(--cream-dark)",
                      borderRadius: 50,
                      fontSize: 13,
                      color: "var(--ink-light)",
                      cursor: "pointer",
                      fontWeight: 500,
                      fontFamily: "var(--font-body)",
                      width: "fit-content"
                    }}>
                      Manage Services
                    </button>
                  </div>
                </td>
                <td style={{ padding: "18px 20px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => openEditModal(s)} style={{ width: 34, height: 34, border: "none", backgroundColor: "var(--cream)", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }} title="Edit">
                      ✏️
                    </button>
                    <button onClick={() => handleToggleActive(s)} style={{ width: 34, height: 34, border: "none", backgroundColor: s.active ? "var(--gold-light)" : "var(--sage-light)", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }} title={s.active ? "Deactivate" : "Activate"}>
                      {s.active ? "⏸" : "▶️"}
                    </button>
                    <button onClick={() => handleDelete(s)} style={{ width: 34, height: 34, border: "none", backgroundColor: "var(--rose-pale)", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }} title="Delete">
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {staff.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
            <p style={{ marginBottom: 16 }}>No staff members yet</p>
            <button onClick={openAddModal} style={{ padding: "12px 24px", backgroundColor: "var(--rose)", color: "var(--white)", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
              Add your first staff
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(26,23,21,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ backgroundColor: "var(--white)", borderRadius: 16, width: "100%", maxWidth: 420, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--cream-dark)" }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)" }}>
                {editingStaff ? "Edit Staff" : "Add Staff"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, border: "none", backgroundColor: "var(--cream)", borderRadius: 8, fontSize: 18, cursor: "pointer", color: "var(--ink-muted)" }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <label style={{ display: "block", marginBottom: 18 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Name</span>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Enter name" style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }} />
              </label>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Role</span>
                <input value={formRole} onChange={(e) => setFormRole(e.target.value)} placeholder="Nail Technician" style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid var(--cream-dark)", backgroundColor: "var(--cream)" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "12px 24px", backgroundColor: "var(--white)", color: "var(--ink-light)", border: "1px solid var(--cream-dark)", borderRadius: 50, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
              <button onClick={handleSaveStaff} disabled={saving} style={{ padding: "12px 24px", backgroundColor: "var(--ink)", color: "var(--cream)", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Services Modal */}
      {showServiceModal && selectedStaff && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(26,23,21,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ backgroundColor: "var(--white)", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "85vh", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--cream-dark)" }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)" }}>
                Services for {selectedStaff.name}
              </h2>
              <button onClick={() => setShowServiceModal(false)} style={{ width: 32, height: 32, border: "none", backgroundColor: "var(--cream)", borderRadius: 8, fontSize: 18, cursor: "pointer", color: "var(--ink-muted)" }}>×</button>
            </div>
            <div style={{ padding: 24, maxHeight: "60vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: "var(--ink-muted)", margin: 0, fontFamily: "var(--font-body)" }}>Select services this staff can perform:</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setStaffServices(services.map(s => s.id))} style={{ padding: "6px 12px", backgroundColor: "var(--rose)", color: "var(--white)", border: "none", borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                    Select All
                  </button>
                  <button onClick={() => setStaffServices([])} style={{ padding: "6px 12px", backgroundColor: "var(--cream)", color: "var(--ink-light)", border: "1px solid var(--cream-dark)", borderRadius: 50, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                    Clear
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {services.map((service) => {
                  const isSelected = staffServices.includes(service.id);
                  return (
                    <label key={service.id} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: 16,
                      border: isSelected ? "2px solid var(--rose)" : "1px solid var(--cream-dark)",
                      borderRadius: 12,
                      cursor: "pointer",
                      backgroundColor: isSelected ? "var(--rose-pale)" : "var(--white)",
                      transition: "all 0.15s ease"
                    }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleService(service.id)}
                        style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--rose)" }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14, fontFamily: "var(--font-body)" }}>{service.name}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2, fontFamily: "var(--font-body)" }}>{service.durationMinutes}min • £{service.price}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid var(--cream-dark)", backgroundColor: "var(--cream)" }}>
              <button onClick={() => setShowServiceModal(false)} style={{ padding: "12px 24px", backgroundColor: "var(--white)", color: "var(--ink-light)", border: "1px solid var(--cream-dark)", borderRadius: 50, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
              <button onClick={handleSaveServices} disabled={saving} style={{ padding: "12px 24px", backgroundColor: "var(--ink)", color: "var(--cream)", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                {saving ? "Saving..." : "Save Services"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
