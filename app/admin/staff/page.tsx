"use client";

import { useEffect, useState } from "react";

type Staff = {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
};

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
};

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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [staffRes, servicesRes] = await Promise.all([
        fetch("/api/admin/staff"),
        fetch("/api/services"),
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
      const res = await fetch(`/api/admin/staff-services?staffId=${staffId}`);
      const data = await res.json();
      setStaffServices(data.map((s: Service) => s.id));
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
        body: JSON.stringify({ staffId: selectedStaff.id, serviceIds: staffServices }),
      });
      setShowServiceModal(false);
    } catch (err) {
      alert("Error saving");
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
        body: JSON.stringify({ name: formName, role: formRole || "Nail Technician" }),
      });
      setShowModal(false);
      setFormName("");
      setFormRole("");
      setEditingStaff(null);
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
        body: JSON.stringify({ active: !s.active }),
      });
      loadData();
    } catch (err) {
      alert("Error");
    }
  }

  async function handleDelete(s: Staff) {
    if (!confirm(`Delete ${s.name}?`)) return;
    try {
      await fetch(`/api/admin/staff/${s.id}`, { method: "DELETE" });
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
    setFormName("");
    setFormRole("");
    setShowModal(true);
  }

  function toggleService(serviceId: string) {
    setStaffServices(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Staff</h1>
          <p style={styles.subtitle}>Manage your team members and their services</p>
        </div>
        <button style={styles.btnPrimary} onClick={openAddModal}>
          + Add Staff
        </button>
      </div>

      {/* Staff Table */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Services</th>
              <th style={{...styles.th, textAlign: "right"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={styles.nameCell}>
                    <div style={styles.avatar}>{s.name.charAt(0)}</div>
                    <span style={styles.name}>{s.name}</span>
                  </div>
                </td>
                <td style={styles.td}>
                  <span style={styles.role}>{s.role || "Nail Technician"}</span>
                </td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: s.active ? "#ecfdf5" : "#fef2f2",
                    color: s.active ? "#059669" : "#dc2626",
                  }}>
                    {s.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={styles.td}>
                  <button style={styles.btnServices} onClick={() => openServiceModal(s)}>
                    Manage Services
                  </button>
                </td>
                <td style={{...styles.td, textAlign: "right"}}>
                  <div style={styles.actions}>
                    <button style={styles.btnIcon} onClick={() => openEditModal(s)} title="Edit">
                      ✏️
                    </button>
                    <button style={styles.btnIcon} onClick={() => handleToggleActive(s)} title={s.active ? "Deactivate" : "Activate"}>
                      {s.active ? "⏸" : "▶️"}
                    </button>
                    <button style={{...styles.btnIcon, color: "#dc2626"}} onClick={() => handleDelete(s)} title="Delete">
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {staff.length === 0 && (
          <div style={styles.empty}>
            <p>No staff members yet</p>
            <button style={styles.btnPrimary} onClick={openAddModal}>Add your first staff</button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingStaff ? "Edit Staff" : "Add Staff"}</h2>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.label}>
                Name
                <input
                  style={styles.input}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter name"
                />
              </label>
              <label style={styles.label}>
                Role
                <input
                  style={styles.input}
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  placeholder="Nail Technician"
                />
              </label>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={handleSaveStaff} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Services Modal */}
      {showServiceModal && selectedStaff && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Services for {selectedStaff.name}</h2>
              <button style={styles.closeBtn} onClick={() => setShowServiceModal(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.modalSubtitle}>Select services this staff member can perform:</p>
              <div style={styles.serviceGrid}>
                {services.map((service) => (
                  <label key={service.id} style={{
                    ...styles.serviceCard,
                    borderColor: staffServices.includes(service.id) ? "#6366f1" : "#e2e8f0",
                    backgroundColor: staffServices.includes(service.id) ? "#eef2ff" : "#fff",
                  }}>
                    <input
                      type="checkbox"
                      checked={staffServices.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                      style={styles.checkbox}
                    />
                    <div>
                      <div style={styles.serviceName}>{service.name}</div>
                      <div style={styles.serviceMeta}>{service.durationMinutes}min • £{service.price}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnSecondary} onClick={() => setShowServiceModal(false)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={handleSaveServices} disabled={saving}>
                {saving ? "Saving..." : "Save Services"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    maxWidth: 1200,
  },
  loading: {
    padding: 40,
    textAlign: "center",
    color: "#64748b",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    margin: "4px 0 0",
  },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "14px 20px",
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "16px 20px",
    fontSize: 14,
    color: "#334155",
  },
  nameCell: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: 14,
  },
  name: {
    fontWeight: 600,
    color: "#0f172a",
  },
  role: {
    color: "#64748b",
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
  },
  actions: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },
  btnIcon: {
    width: 32,
    height: 32,
    border: "none",
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnServices: {
    padding: "6px 12px",
    backgroundColor: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    fontSize: 13,
    color: "#475569",
    cursor: "pointer",
    fontWeight: 500,
  },
  btnPrimary: {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "10px 20px",
    backgroundColor: "#fff",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  empty: {
    padding: 60,
    textAlign: "center",
    color: "#64748b",
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxWidth: 480,
    maxHeight: "85vh",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    margin: "0 0 16px",
  },
  closeBtn: {
    width: 32,
    height: 32,
    border: "none",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    fontSize: 20,
    cursor: "pointer",
    color: "#64748b",
  },
  modalBody: {
    padding: 24,
    overflowY: "auto",
    maxHeight: "60vh",
  },
  modalFooter: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 16,
  },
  input: {
    display: "block",
    width: "100%",
    padding: "10px 14px",
    marginTop: 6,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  },
  serviceGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  serviceCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 14,
    border: "2px solid",
    borderRadius: 10,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: "pointer",
  },
  serviceName: {
    fontWeight: 600,
    color: "#0f172a",
    fontSize: 14,
  },
  serviceMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
};
