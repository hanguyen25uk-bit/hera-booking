"use client";

import { useEffect, useState } from "react";

type ServiceCategory = {
  id: string;
  name: string;
  description: string | null;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  category: string | null;
  categoryId: string | null;
  serviceCategory: ServiceCategory | null;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  // Service form
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [formPrice, setFormPrice] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");

  // Category form
  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch("/api/services"),
        fetch("/api/categories"),
      ]);
      setServices(await servicesRes.json());
      setCategories(await categoriesRes.json());
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
          description: formDescription || null,
          durationMinutes: parseInt(formDuration),
          price: parseFloat(formPrice),
          categoryId: formCategoryId || null,
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

  async function handleSaveCategory() {
    if (!catName.trim()) return;
    setSaving(true);
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName,
          description: catDescription || null,
        }),
      });
      setShowCategoryModal(false);
      resetCategoryForm();
      loadData();
    } catch (err) {
      alert("Error saving category");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(cat: ServiceCategory) {
    if (!confirm(`Delete category "${cat.name}"? Services in this category will become uncategorized.`)) return;
    try {
      await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      alert("Error deleting");
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
    setFormDescription("");
    setFormDuration("60");
    setFormPrice("");
    setFormCategoryId("");
    setEditingService(null);
  }

  function resetCategoryForm() {
    setCatName("");
    setCatDescription("");
    setEditingCategory(null);
  }

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(service: Service) {
    setEditingService(service);
    setFormName(service.name);
    setFormDescription(service.description || "");
    setFormDuration(service.durationMinutes.toString());
    setFormPrice(service.price.toString());
    setFormCategoryId(service.categoryId || "");
    setShowModal(true);
  }

  function openAddCategoryModal() {
    resetCategoryForm();
    setShowCategoryModal(true);
  }

  function openEditCategoryModal(cat: ServiceCategory) {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDescription(cat.description || "");
    setShowCategoryModal(true);
  }

  // Group services by category
  const servicesByCategory: { [key: string]: Service[] } = {};
  const uncategorized: Service[] = [];
  
  services.forEach((service) => {
    if (service.categoryId && service.serviceCategory) {
      const catId = service.categoryId;
      if (!servicesByCategory[catId]) {
        servicesByCategory[catId] = [];
      }
      servicesByCategory[catId].push(service);
    } else {
      uncategorized.push(service);
    }
  });

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
        <div style={{ display: "flex", gap: 12 }}>
          <button style={styles.btnSecondary} onClick={openAddCategoryModal}>
            + Add Category
          </button>
          <button style={styles.btnPrimary} onClick={openAddModal}>
            + Add Service
          </button>
        </div>
      </div>

      {/* Categories Section */}
      {categories.length > 0 && (
        <div style={styles.categoriesSection}>
          <h2 style={styles.sectionTitle}>Categories</h2>
          <div style={styles.categoryTags}>
            {categories.map((cat) => (
              <div key={cat.id} style={styles.categoryTag}>
                <span style={styles.categoryTagName}>{cat.name}</span>
                <button style={styles.categoryEditBtn} onClick={() => openEditCategoryModal(cat)}>✏️</button>
                <button style={styles.categoryDeleteBtn} onClick={() => handleDeleteCategory(cat)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services by Category */}
      {categories.map((cat) => {
        const catServices = servicesByCategory[cat.id] || [];
        if (catServices.length === 0) return null;
        return (
          <div key={cat.id} style={styles.categorySection}>
            <div style={styles.categoryHeader}>
              <h2 style={styles.categoryTitle}>{cat.name}</h2>
              {cat.description && <p style={styles.categoryDesc}>{cat.description}</p>}
            </div>
            <div style={styles.grid}>
              {catServices.map((service) => (
                <ServiceCard key={service.id} service={service} onEdit={openEditModal} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Uncategorized Services */}
      {uncategorized.length > 0 && (
        <div style={styles.categorySection}>
          <div style={styles.categoryHeader}>
            <h2 style={styles.categoryTitle}>Other Services</h2>
          </div>
          <div style={styles.grid}>
            {uncategorized.map((service) => (
              <ServiceCard key={service.id} service={service} onEdit={openEditModal} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {services.length === 0 && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>✨</div>
          <p>No services yet</p>
          <button style={styles.btnPrimary} onClick={openAddModal}>Add your first service</button>
        </div>
      )}

      {/* Service Modal */}
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
              <label style={styles.label}>
                Description
                <textarea
                  style={styles.textarea}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe what's included in this service..."
                  rows={3}
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
                <select
                  style={styles.select}
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                >
                  <option value="">-- No Category --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
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

      {/* Category Modal */}
      {showCategoryModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingCategory ? "Edit Category" : "Add Category"}</h2>
              <button style={styles.closeBtn} onClick={() => setShowCategoryModal(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.label}>
                Category Name
                <input
                  style={styles.input}
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Acrylic, BIAB, Gel"
                />
              </label>
              <label style={styles.label}>
                Description (optional)
                <textarea
                  style={styles.textarea}
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="Brief description of this category..."
                  rows={2}
                />
              </label>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnSecondary} onClick={() => setShowCategoryModal(false)}>Cancel</button>
              <button style={styles.btnPrimary} onClick={handleSaveCategory} disabled={saving}>
                {saving ? "Saving..." : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service, onEdit, onDelete }: { service: Service; onEdit: (s: Service) => void; onDelete: (s: Service) => void }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <span style={styles.categoryBadge}>{service.serviceCategory?.name || service.category || "General"}</span>
        <div style={styles.cardActions}>
          <button style={styles.btnIcon} onClick={() => onEdit(service)}>✏️</button>
          <button style={{...styles.btnIcon, color: "#dc2626"}} onClick={() => onDelete(service)}>🗑</button>
        </div>
      </div>
      <h3 style={styles.serviceName}>{service.name}</h3>
      {service.description && (
        <p style={styles.serviceDesc}>{service.description}</p>
      )}
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
  categoriesSection: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#64748b",
    margin: "0 0 12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  categoryTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryTag: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    backgroundColor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
  },
  categoryTagName: {
    fontSize: 14,
    fontWeight: 500,
    color: "#334155",
  },
  categoryEditBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 12,
    padding: 2,
  },
  categoryDeleteBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 16,
    color: "#94a3b8",
    padding: 2,
  },
  categorySection: {
    marginBottom: 40,
  },
  categoryHeader: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
  },
  categoryDesc: {
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
  categoryBadge: {
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
    margin: "0 0 8px",
  },
  serviceDesc: {
    fontSize: 13,
    color: "#64748b",
    margin: "0 0 16px",
    lineHeight: 1.5,
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
  textarea: {
    display: "block",
    width: "100%",
    padding: "10px 14px",
    marginTop: 6,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  select: {
    display: "block",
    width: "100%",
    padding: "10px 14px",
    marginTop: 6,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    backgroundColor: "#fff",
  },
  row: {
    display: "flex",
    gap: 16,
  },
};
