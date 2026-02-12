"use client";

import { useEffect, useState } from "react";
import { SERVICE_TEMPLATES } from "@/lib/service-templates";

type ServiceCategory = {
  id: string;
  name: string;
  description: string | null;
};

type StaffMember = {
  id: string;
  name: string;
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
  isActive: boolean;
  staffServices: { staff: StaffMember }[];
};

type Discount = {
  id: string;
  name: string;
  discountPercent: number;
  serviceIds: string[];
  isActive: boolean;
  validFrom: string | null;
  validUntil: string | null;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [formPrice, setFormPrice] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");

  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");

  // Drag and drop state
  const [draggedService, setDraggedService] = useState<Service | null>(null);
  const [dragOverServiceId, setDragOverServiceId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [servicesRes, categoriesRes, discountsRes] = await Promise.all([
        fetch("/api/admin/services", { credentials: "include" }),
        fetch("/api/categories", { credentials: "include" }),
        fetch("/api/admin/discounts", { credentials: "include" }),
      ]);
      setServices(await servicesRes.json());
      setCategories(await categoriesRes.json());
      const allDiscounts = await discountsRes.json();
      // Filter to only active and currently valid discounts
      const now = new Date();
      const activeDiscounts = allDiscounts.filter((d: Discount) => {
        if (!d.isActive) return false;
        if (d.validFrom && new Date(d.validFrom) > now) return false;
        if (d.validUntil && new Date(d.validUntil) < now) return false;
        return true;
      });
      setDiscounts(activeDiscounts);
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
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formName,
          description: formDescription || null,
          durationMinutes: parseInt(formDuration),
          price: parseFloat(formPrice),
          categoryId: formCategoryId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
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
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: catName, description: catDescription || null }),
      });
      if (!res.ok) throw new Error("Failed to save category");
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
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await fetch(`/api/categories/${cat.id}`, { method: "DELETE", credentials: "include" });
      loadData();
    } catch (err) {
      alert("Error deleting");
    }
  }

  async function handleDelete(service: Service) {
    if (!confirm(`Delete "${service.name}"?`)) return;
    try {
      await fetch(`/api/admin/services/${service.id}`, { method: "DELETE", credentials: "include" });
      loadData();
    } catch (err) {
      alert("Error deleting");
    }
  }

  async function handleToggleActive(service: Service) {
    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setServices(services.map(s => s.id === service.id ? { ...s, isActive: !s.isActive } : s));
    } catch (err) {
      alert("Error updating service");
    }
  }

  // Drag and drop handlers
  function handleDragStart(service: Service) {
    setDraggedService(service);
  }

  function handleDragOver(e: React.DragEvent, targetService: Service) {
    e.preventDefault();
    // Only allow drop within the same category
    if (draggedService && draggedService.categoryId === targetService.categoryId && draggedService.id !== targetService.id) {
      setDragOverServiceId(targetService.id);
    }
  }

  function handleDragLeave() {
    setDragOverServiceId(null);
  }

  function handleDragEnd() {
    setDraggedService(null);
    setDragOverServiceId(null);
  }

  async function handleDrop(e: React.DragEvent, targetService: Service) {
    e.preventDefault();
    setDragOverServiceId(null);

    if (!draggedService || draggedService.id === targetService.id) return;
    if (draggedService.categoryId !== targetService.categoryId) return;

    // Get services in this category
    const categoryId = targetService.categoryId;
    const catServices = categoryId ? (servicesByCategory[categoryId] || []) : uncategorized;

    // Reorder
    const dragIndex = catServices.findIndex(s => s.id === draggedService.id);
    const dropIndex = catServices.findIndex(s => s.id === targetService.id);

    const reordered = [...catServices];
    reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, draggedService);

    // Update state immediately for smooth UX
    const updatedServices = services.filter(s => s.categoryId !== categoryId);
    setServices([...updatedServices, ...reordered]);

    // Save to API
    try {
      const res = await fetch("/api/admin/services/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ serviceIds: reordered.map(s => s.id) }),
      });
      if (!res.ok) throw new Error("Failed to save order");
    } catch (err) {
      console.error("Error saving order:", err);
      loadData(); // Reload on error
    }

    setDraggedService(null);
  }

  function resetForm() {
    setFormName(""); setFormDescription(""); setFormDuration("60"); setFormPrice(""); setFormCategoryId(""); setEditingService(null);
  }

  function resetCategoryForm() {
    setCatName(""); setCatDescription(""); setEditingCategory(null);
  }

  function openAddModal() { resetForm(); setShowModal(true); }
  function openEditModal(s: Service) {
    setEditingService(s);
    setFormName(s.name);
    setFormDescription(s.description || "");
    setFormDuration(s.durationMinutes.toString());
    setFormPrice(s.price.toString());
    setFormCategoryId(s.categoryId || "");
    setShowModal(true);
  }
  function openAddCategoryModal() { resetCategoryForm(); setShowCategoryModal(true); }
  function openEditCategoryModal(cat: ServiceCategory) {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDescription(cat.description || "");
    setShowCategoryModal(true);
  }

  async function applyTemplate() {
    setApplyingTemplate(true);
    try {
      const res = await fetch("/api/admin/services/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templateId: "nail-salon" }),
      });
      if (!res.ok) throw new Error("Failed to apply template");
      const result = await res.json();
      setShowTemplateModal(false);
      setSuccessMessage(`Added ${result.created.services} services across ${result.created.categories} categories`);
      setTimeout(() => setSuccessMessage(null), 5000);
      loadData();
    } catch (err) {
      alert("Error applying template");
    } finally {
      setApplyingTemplate(false);
    }
  }

  const totalTemplateServices = SERVICE_TEMPLATES.categories.reduce((sum, cat) => sum + cat.services.length, 0);

  // Get the best (highest) discount for a service
  function getDiscountForService(serviceId: string): Discount | null {
    const applicable = discounts.filter(d => d.serviceIds.includes(serviceId));
    if (applicable.length === 0) return null;
    return applicable.reduce((best, d) => d.discountPercent > best.discountPercent ? d : best);
  }

  const servicesByCategory: { [key: string]: Service[] } = {};
  const uncategorized: Service[] = [];
  services.forEach((service) => {
    if (service.categoryId && service.serviceCategory) {
      if (!servicesByCategory[service.categoryId]) servicesByCategory[service.categoryId] = [];
      servicesByCategory[service.categoryId].push(service);
    } else {
      uncategorized.push(service);
    }
  });

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Success Toast */}
      {successMessage && (
        <div style={{
          position: "fixed",
          top: 24,
          right: 24,
          backgroundColor: "#059669",
          color: "white",
          padding: "14px 20px",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 500,
          fontFamily: "var(--font-body)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 2000,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>✓</span>
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}>
            Services
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 6, fontFamily: "var(--font-body)" }}>
            Manage your service menu and pricing
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {services.length > 0 && (
            <button
              onClick={() => setShowTemplateModal(true)}
              style={{
                padding: "10px 16px",
                backgroundColor: "transparent",
                color: "var(--ink-muted)",
                border: "none",
                borderRadius: 50,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => e.currentTarget.style.color = "var(--ink)"}
              onMouseOut={(e) => e.currentTarget.style.color = "var(--ink-muted)"}
            >
              📋 Browse templates
            </button>
          )}
          <button onClick={openAddCategoryModal} style={{ padding: "12px 24px", backgroundColor: "var(--white)", color: "var(--ink)", border: "1.5px solid var(--ink)", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", transition: "all 0.2s ease" }}>
            + Category
          </button>
          <button onClick={openAddModal} style={{ padding: "12px 24px", backgroundColor: "var(--rose)", color: "var(--white)", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)", boxShadow: "var(--shadow-sm)", transition: "all 0.2s ease" }}>
            + Add Service
          </button>
        </div>
      </div>

      {/* Categories Tags */}
      {categories.length > 0 && (
        <div style={{ marginBottom: 32, padding: 20, backgroundColor: "var(--white)", borderRadius: 16, border: "1px solid var(--cream-dark)" }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-body)" }}>
            Categories
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {categories.map((cat) => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 50 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", fontFamily: "var(--font-body)" }}>{cat.name}</span>
                <button onClick={() => openEditCategoryModal(cat)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 12, padding: 2, color: "var(--ink-muted)" }}>✏️</button>
                <button onClick={() => handleDeleteCategory(cat)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, padding: 2, color: "var(--ink-muted)" }}>×</button>
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
          <div key={cat.id} style={{ marginBottom: 40 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)" }}>{cat.name}</h2>
              {cat.description && <p style={{ fontSize: 14, color: "var(--ink-muted)", margin: "4px 0 0", fontFamily: "var(--font-body)" }}>{cat.description}</p>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {catServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  discount={getDiscountForService(service.id)}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onToggle={handleToggleActive}
                  isDragOver={dragOverServiceId === service.id}
                  onDragStart={() => handleDragStart(service)}
                  onDragOver={(e) => handleDragOver(e, service)}
                  onDragLeave={handleDragLeave}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, service)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Uncategorized */}
      {uncategorized.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", margin: "0 0 16px", fontFamily: "var(--font-heading)" }}>Other Services</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {uncategorized.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                discount={getDiscountForService(service.id)}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onToggle={handleToggleActive}
                isDragOver={dragOverServiceId === service.id}
                onDragStart={() => handleDragStart(service)}
                onDragOver={(e) => handleDragOver(e, service)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, service)}
              />
            ))}
          </div>
        </div>
      )}

      {services.length === 0 && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px",
          minHeight: "50vh",
        }}>
          <div style={{
            backgroundColor: "var(--white)",
            borderRadius: 24,
            padding: "48px 40px",
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            border: "1px solid var(--cream-dark)",
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}>
              🚀
            </div>
            <h2 style={{
              fontSize: 24,
              fontWeight: 600,
              color: "var(--ink)",
              margin: "0 0 12px",
              fontFamily: "var(--font-heading)",
            }}>
              Get started quickly
            </h2>
            <p style={{
              fontSize: 15,
              color: "var(--ink-muted)",
              margin: "0 0 28px",
              lineHeight: 1.6,
              fontFamily: "var(--font-body)",
            }}>
              Start with our recommended nail salon services. You can customise names, prices, and durations later.
            </p>
            <button
              onClick={applyTemplate}
              disabled={applyingTemplate}
              style={{
                width: "100%",
                padding: "16px 32px",
                backgroundColor: "var(--ink)",
                color: "var(--cream)",
                border: "none",
                borderRadius: 50,
                fontSize: 16,
                fontWeight: 600,
                cursor: applyingTemplate ? "wait" : "pointer",
                fontFamily: "var(--font-body)",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {applyingTemplate ? (
                <>
                  <span style={{
                    width: 18,
                    height: 18,
                    border: "2px solid var(--cream)",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  Creating services...
                </>
              ) : (
                "Use Nail Salon Template"
              )}
            </button>
            <p style={{
              fontSize: 13,
              color: "var(--ink-muted)",
              marginTop: 20,
              fontFamily: "var(--font-body)",
            }}>
              Or start from scratch with{" "}
              <button
                onClick={openAddModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--rose)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                + Add Service
              </button>
            </p>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Service Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(26,23,21,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ backgroundColor: "var(--white)", borderRadius: 16, width: "100%", maxWidth: 480, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--cream-dark)" }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)" }}>
                {editingService ? "Edit Service" : "Add Service"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, border: "none", backgroundColor: "var(--cream)", borderRadius: 8, fontSize: 18, cursor: "pointer", color: "var(--ink-muted)" }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <label style={{ display: "block", marginBottom: 18 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Service Name</span>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Gel Manicure" style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }} />
              </label>
              <label style={{ display: "block", marginBottom: 18 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Description</span>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Describe the service..." rows={3} style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box", resize: "vertical" }} />
              </label>
              <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
                <label style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Duration (min)</span>
                  <input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }} />
                </label>
                <label style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Price (£)</span>
                  <input type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="35.00" style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }} />
                </label>
              </div>
              <label style={{ display: "block", marginBottom: 24 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Category</span>
                <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)} style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }}>
                  <option value="">-- No Category --</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid var(--cream-dark)", backgroundColor: "var(--cream)" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "12px 24px", backgroundColor: "var(--white)", color: "var(--ink-light)", border: "1px solid var(--cream-dark)", borderRadius: 50, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "12px 24px", backgroundColor: "var(--ink)", color: "var(--cream)", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                {saving ? "Saving..." : "Save Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(26,23,21,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ backgroundColor: "var(--white)", borderRadius: 16, width: "100%", maxWidth: 420, overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--cream-dark)" }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)" }}>
                {editingCategory ? "Edit Category" : "Add Category"}
              </h2>
              <button onClick={() => setShowCategoryModal(false)} style={{ width: 32, height: 32, border: "none", backgroundColor: "var(--cream)", borderRadius: 8, fontSize: 18, cursor: "pointer", color: "var(--ink-muted)" }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <label style={{ display: "block", marginBottom: 18 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Category Name</span>
                <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Acrylic" style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box" }} />
              </label>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--ink-light)", marginBottom: 6, fontFamily: "var(--font-body)" }}>Description (optional)</span>
                <textarea value={catDescription} onChange={(e) => setCatDescription(e.target.value)} placeholder="Brief description..." rows={2} style={{ width: "100%", padding: "12px 16px", backgroundColor: "var(--cream)", border: "1px solid var(--cream-dark)", borderRadius: 12, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)", boxSizing: "border-box", resize: "vertical" }} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid var(--cream-dark)", backgroundColor: "var(--cream)" }}>
              <button onClick={() => setShowCategoryModal(false)} style={{ padding: "12px 24px", backgroundColor: "var(--white)", color: "var(--ink-light)", border: "1px solid var(--cream-dark)", borderRadius: 50, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
              <button onClick={handleSaveCategory} disabled={saving} style={{ padding: "12px 24px", backgroundColor: "var(--ink)", color: "var(--cream)", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                {saving ? "Saving..." : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(26,23,21,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ backgroundColor: "var(--white)", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", overflow: "hidden", boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--cream-dark)", flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)" }}>
                  {SERVICE_TEMPLATES.name}
                </h2>
                <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: "4px 0 0", fontFamily: "var(--font-body)" }}>
                  {SERVICE_TEMPLATES.description}
                </p>
              </div>
              <button onClick={() => setShowTemplateModal(false)} style={{ width: 32, height: 32, border: "none", backgroundColor: "var(--cream)", borderRadius: 8, fontSize: 18, cursor: "pointer", color: "var(--ink-muted)" }}>×</button>
            </div>
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              {SERVICE_TEMPLATES.categories.map((cat, catIdx) => (
                <div key={catIdx} style={{ marginBottom: catIdx < SERVICE_TEMPLATES.categories.length - 1 ? 24 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-body)" }}>
                      {cat.name}
                    </h3>
                    <span style={{ fontSize: 12, color: "var(--ink-muted)", backgroundColor: "var(--cream)", padding: "2px 8px", borderRadius: 50, fontFamily: "var(--font-body)" }}>
                      {cat.services.length} services
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {cat.services.map((svc, svcIdx) => (
                      <div key={svcIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "var(--cream)", borderRadius: 10 }}>
                        <span style={{ fontSize: 13, color: "var(--ink)", fontFamily: "var(--font-body)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {svc.name}
                        </span>
                        <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0, marginLeft: 12 }}>
                          <span style={{ fontSize: 12, color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>{svc.duration}min</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--sage)", fontFamily: "var(--font-body)" }}>£{svc.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--cream-dark)", backgroundColor: "var(--cream)", flexShrink: 0 }}>
              <p style={{ fontSize: 12, color: "var(--ink-muted)", margin: "0 0 16px", fontFamily: "var(--font-body)", textAlign: "center" }}>
                This will add {totalTemplateServices} services. Existing services will not be affected.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button onClick={() => setShowTemplateModal(false)} style={{ padding: "12px 24px", backgroundColor: "var(--white)", color: "var(--ink-light)", border: "1px solid var(--cream-dark)", borderRadius: 50, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)" }}>Cancel</button>
                <button
                  onClick={applyTemplate}
                  disabled={applyingTemplate}
                  style={{ padding: "12px 24px", backgroundColor: "var(--ink)", color: "var(--cream)", border: "none", borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: applyingTemplate ? "wait" : "pointer", fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 8 }}
                >
                  {applyingTemplate ? (
                    <>
                      <span style={{
                        width: 14,
                        height: 14,
                        border: "2px solid var(--cream)",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }} />
                      Applying...
                    </>
                  ) : (
                    "Apply template"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  discount,
  onEdit,
  onDelete,
  onToggle,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
}: {
  service: Service;
  discount: Discount | null;
  onEdit: (s: Service) => void;
  onDelete: (s: Service) => void;
  onToggle: (s: Service) => void;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const discountedPrice = discount ? service.price * (1 - discount.discountPercent / 100) : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      style={{
        backgroundColor: "var(--white)",
        borderRadius: 16,
        border: isDragOver ? "2px solid #3b82f6" : "1px solid var(--cream-dark)",
        padding: 20,
        transition: "border 0.15s ease",
        boxShadow: "var(--shadow-sm)",
        opacity: service.isActive ? 1 : 0.5,
        display: "flex",
        gap: 12,
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          cursor: "grab",
          color: "var(--ink-muted)",
          fontSize: 16,
          display: "flex",
          alignItems: "flex-start",
          paddingTop: 2,
          userSelect: "none",
        }}
        title="Drag to reorder"
      >
        ⠿
      </div>
      {/* Card content */}
      <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--rose)", textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: "var(--rose-pale)", padding: "4px 10px", borderRadius: 50, fontFamily: "var(--font-body)" }}>
            {service.serviceCategory?.name || service.category || "General"}
          </span>
          {discount && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "#92400e", backgroundColor: "#fef3c7", padding: "4px 8px", borderRadius: 50, fontFamily: "var(--font-body)" }}>
              {discount.discountPercent}% OFF
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={() => onToggle(service)}
            title={service.isActive ? "Active - click to deactivate" : "Inactive - click to activate"}
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              border: "none",
              backgroundColor: service.isActive ? "#22c55e" : "#d1d5db",
              cursor: "pointer",
              position: "relative",
              transition: "background-color 0.2s ease",
            }}
          >
            <span style={{
              position: "absolute",
              top: 2,
              left: service.isActive ? 22 : 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              transition: "left 0.2s ease",
            }} />
          </button>
          <button onClick={() => onEdit(service)} style={{ width: 30, height: 30, border: "none", backgroundColor: "var(--cream)", borderRadius: 8, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
          <button onClick={() => onDelete(service)} style={{ width: 30, height: 30, border: "none", backgroundColor: "var(--rose-pale)", borderRadius: 8, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
        </div>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "0 0 8px", fontFamily: "var(--font-body)" }}>{service.name}</h3>
      {service.description && (
        <p style={{
          fontSize: 13,
          color: "var(--ink-muted)",
          margin: "0 0 16px",
          lineHeight: 1.5,
          fontFamily: "var(--font-body)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>{service.description}</p>
      )}
      <div style={{ display: "flex", gap: 24 }}>
        <div>
          <span style={{ display: "block", fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2, fontFamily: "var(--font-body)" }}>Duration</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-light)", fontFamily: "var(--font-body)" }}>{service.durationMinutes} min</span>
        </div>
        <div>
          <span style={{ display: "block", fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2, fontFamily: "var(--font-body)" }}>Price</span>
          {discountedPrice !== null ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-muted)", textDecoration: "line-through", fontFamily: "var(--font-body)" }}>£{service.price}</span>
              <span style={{ fontSize: 18, fontWeight: 600, color: "#16a34a", fontFamily: "var(--font-heading)" }}>£{discountedPrice.toFixed(0)}</span>
            </div>
          ) : (
            <span style={{ fontSize: 18, fontWeight: 600, color: "var(--sage)", fontFamily: "var(--font-heading)" }}>£{service.price}</span>
          )}
        </div>
      </div>
      {/* Staff avatars */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
        {service.staffServices.length === 0 ? (
          <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "var(--font-body)" }}>No staff assigned</span>
        ) : (
          <>
            {service.staffServices.slice(0, 3).map(({ staff }) => {
              const initials = staff.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <div
                  key={staff.id}
                  title={staff.name}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    backgroundColor: "var(--ink)",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {initials}
                </div>
              );
            })}
            {service.staffServices.length > 3 && (
              <span style={{ fontSize: 11, color: "var(--ink-muted)", fontFamily: "var(--font-body)", marginLeft: 4 }}>
                +{service.staffServices.length - 3}
              </span>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
