"use client";

import { useEffect, useState } from "react";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  category: string | null;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [formName, setFormName] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/services");
      setServices(await res.json());
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!formName.trim() || !formPrice) return;
    setSaving(true);
    try {
      const url = editingService ? `/api/admin/services/${editingService.id}` : "/api/admin/services";
      const method = editingService ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          durationMinutes: parseInt(formDuration),
          price: parseFloat(formPrice),
          category: formCategory || "General",
        }),
      });
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      alert("Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(service: Service) {
    if (!confirm(`Delete "${service.name}"?`)) return;
    try {
      await fetch(`/api/admin/services/${service.id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      alert("Error deleting");
    }
  }

  function resetForm() {
    setFormName("");
    setFormDuration("60");
    setFormPrice("");
    setFormCategory("");
    setEditingService(null);
  }

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(service: Service) {
    setEditingService(service);
    setFormName(service.name);
    setFormDuration(service.durationMinutes.toString());
    setFormPrice(service.price.toString());
    setFormCategory(service.category || "");
    setShowModal(true);
  }

  if (loading) {
    return <div style={styles.page}><div style={styles.loading}>Loading...</div></div>;
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Services</h1>
          <p style={styles.subtitle}>Manage your service menu and pricing</p>
        </div>
        <button style={styles.btnPrimary} onClick={openAddModal}>
          + Add Service
        </button>
      </div>

      {/* Services Grid */}
      <div style={styles.grid}>
        {services.map((service) => (
          <div key={service.id} style={styles.card}>
            <div style={styles.cardTop}>
              <span style={styles.category}>{service.category || "General"}</span>
              <div style={styles.cardActions}>
                <button style={styles.btnIcon} onClick={() => openEditModal(service)}>✏️</button>
                <button style={{...styles.btnIcon, color: "#dc2626"}} onClick={() => handleDelete(service)}>🗑</button>
              </div>
            </div>
            <h3 style={styles.serviceName}>{service.name}</h3>
            <div style={styles.cardMeta}>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Duration</span>
                <span style={styles.metaValue}>{service.durationMinutes} min</span>
              </div>
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Price</span>
                <span style={styles.price}>£{service.price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>✨</div>
          <p>No services yet</p>
          <button style={styles.btnPrimary} onClick={openAddModal}>Add your first service</button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingService ? "Edit Service" : "Add Service"}</h2>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.label}>
                Service Name
                <input
                  style={styles.input}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Gel Manicure"
                />
              </label>
              <div style={styles.row}>
                <label style={{...styles.label, flex: 1}}>
                  Duration (minutes)
                  <input
                    style={styles.input}
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    placeholder="60"
                  />
                </label>
                <label style={{...styles.label, flex: 1}}>
                  Price (£)
                  <input
                    style={styles.input}
                    type="number"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="35.00"
                  />
                </label>
              </div>
              <label style={styles.label}>
                Category
                <input
                  style={styles.input}
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g. Nails, Waxing, Lashes"
                />
              </label>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Service"}
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 20,
    transition: "all 0.15s ease",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  category: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6366f1",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    backgroundColor: "#eef2ff",
    padding: "4px 8px",
    borderRadius: 4,
  },
  cardActions: {
    display: "flex",
    gap: 6,
  },
  btnIcon: {
    width: 28,
    height: 28,
    border: "none",
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 600,
    color: "#0f172a",
    margin: "0 0 16px",
  },
  cardMeta: {
    display: "flex",
    gap: 24,
  },
  metaItem: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  metaValue: {
    fontSize: 15,
    fontWeight: 600,
    color: "#334155",
  },
  price: {
    fontSize: 18,
    fontWeight: 700,
    color: "#059669",
  },
  empty: {
    padding: 80,
    textAlign: "center",
    color: "#64748b",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
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
  row: {
    display: "flex",
    gap: 16,
  },
};
