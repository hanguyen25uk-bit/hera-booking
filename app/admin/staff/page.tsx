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

  // Form states
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
      console.error("Failed to load staff services:", err);
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
        body: JSON.stringify({
          staffId: selectedStaff.id,
          serviceIds: staffServices,
        }),
      });
      setShowServiceModal(false);
      alert("Đã lưu dịch vụ cho " + selectedStaff.name);
    } catch (err) {
      alert("Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveStaff() {
    if (!formName.trim()) {
      alert("Vui lòng nhập tên");
      return;
    }
    setSaving(true);
    try {
      const url = editingStaff
        ? `/api/admin/staff/${editingStaff.id}`
        : "/api/admin/staff";
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
      alert("Lỗi khi lưu");
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
      alert("Lỗi");
    }
  }

  async function handleDelete(s: Staff) {
    if (!confirm(`Xóa ${s.name}?`)) return;
    try {
      await fetch(`/api/admin/staff/${s.id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      alert("Lỗi khi xóa");
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
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  }

  if (loading) {
    return <div style={styles.container}><p>Đang tải...</p></div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Quản lý nhân viên</h1>
        <button style={styles.btnPrimary} onClick={openAddModal}>
          + Thêm nhân viên
        </button>
      </div>

      <div style={styles.grid}>
        {staff.map((s) => (
          <div key={s.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.avatar}>
                {s.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={styles.staffName}>{s.name}</h3>
                <p style={styles.staffRole}>{s.role || "Nail Technician"}</p>
              </div>
            </div>
            
            <div style={{
              ...styles.statusBadge,
              backgroundColor: s.active ? "#D1FAE5" : "#FEE2E2",
              color: s.active ? "#059669" : "#DC2626",
            }}>
              {s.active ? "Đang làm việc" : "Nghỉ"}
            </div>

            <div style={styles.cardActions}>
              <button
                style={styles.btnService}
                onClick={() => openServiceModal(s)}
                title="Gán dịch vụ"
              >
                💅 Dịch vụ
              </button>
              <button
                style={styles.btnEdit}
                onClick={() => openEditModal(s)}
                title="Sửa"
              >
                ✏️
              </button>
              <button
                style={styles.btnToggle}
                onClick={() => handleToggleActive(s)}
                title={s.active ? "Tạm nghỉ" : "Kích hoạt"}
              >
                {s.active ? "⏸️" : "▶️"}
              </button>
              <button
                style={styles.btnDelete}
                onClick={() => handleDelete(s)}
                title="Xóa"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal thêm/sửa nhân viên */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>
              {editingStaff ? "Sửa nhân viên" : "Thêm nhân viên"}
            </h2>
            <label style={styles.label}>
              Tên
              <input
                style={styles.input}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nhập tên nhân viên"
              />
            </label>
            <label style={styles.label}>
              Vai trò
              <input
                style={styles.input}
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                placeholder="Nail Technician"
              />
            </label>
            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setShowModal(false)}>
                Hủy
              </button>
              <button style={styles.btnPrimary} onClick={handleSaveStaff} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gán dịch vụ */}
      {showServiceModal && selectedStaff && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>
              Dịch vụ của {selectedStaff.name}
            </h2>
            <p style={styles.modalSubtitle}>Chọn các dịch vụ nhân viên này có thể làm:</p>
            
            <div style={styles.serviceList}>
              {services.map((service) => (
                <label key={service.id} style={styles.serviceItem}>
                  <input
                    type="checkbox"
                    checked={staffServices.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                    style={styles.checkbox}
                  />
                  <span style={styles.serviceName}>{service.name}</span>
                  <span style={styles.serviceMeta}>
                    {service.durationMinutes} phút • £{service.price}
                  </span>
                </label>
              ))}
            </div>

            <div style={styles.modalActions}>
              <button style={styles.btnSecondary} onClick={() => setShowServiceModal(false)}>
                Hủy
              </button>
              <button style={styles.btnPrimary} onClick={handleSaveServices} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu dịch vụ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: 24,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: "#EC4899",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 600,
  },
  staffName: {
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
    margin: 0,
  },
  staffRole: {
    fontSize: 13,
    color: "#6B7280",
    margin: 0,
  },
  statusBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 12,
  },
  cardActions: {
    display: "flex",
    gap: 8,
  },
  btnService: {
    flex: 1,
    padding: "8px 12px",
    backgroundColor: "#F0FDF4",
    border: "1px solid #86EFAC",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
  },
  btnEdit: {
    padding: "8px 12px",
    backgroundColor: "#FEF3C7",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnToggle: {
    padding: "8px 12px",
    backgroundColor: "#E0E7FF",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnDelete: {
    padding: "8px 12px",
    backgroundColor: "#FEE2E2",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnPrimary: {
    padding: "10px 20px",
    backgroundColor: "#EC4899",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "10px 20px",
    backgroundColor: "#FFFFFF",
    color: "#374151",
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
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
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80vh",
    overflow: "auto",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "#111827",
    margin: "0 0 8px 0",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    margin: "0 0 16px 0",
  },
  modalActions: {
    display: "flex",
    gap: 12,
    marginTop: 24,
    justifyContent: "flex-end",
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
    padding: "10px 12px",
    marginTop: 6,
    border: "1px solid #D1D5DB",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
  },
  serviceList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  serviceItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    cursor: "pointer",
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: "pointer",
  },
  serviceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: 500,
    color: "#111827",
  },
  serviceMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
};
