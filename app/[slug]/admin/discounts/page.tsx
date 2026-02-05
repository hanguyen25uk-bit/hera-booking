"use client";

import { useState, useEffect } from "react";

type Discount = {
  id: string;
  name: string;
  discountPercent: number;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  serviceIds: string[];
  staffIds: string[];
  isActive: boolean;
};

type Service = { id: string; name: string; price: number };
type Staff = { id: string; name: string; serviceIds?: string[] };

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    discountPercent: "20",
    startTime: "10:00",
    endTime: "16:00",
    daysOfWeek: [1, 2, 3] as number[],
    serviceIds: [] as string[],
    staffIds: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [discountsRes, servicesRes, staffRes] = await Promise.all([
        fetch("/api/admin/discounts", { credentials: "include" }),
        fetch("/api/services"),
        fetch("/api/staff"),
      ]);

      if (discountsRes.ok) {
        setDiscounts(await discountsRes.json());
      }
      if (servicesRes.ok) {
        setServices(await servicesRes.json());
      }
      if (staffRes.ok) {
        setStaffList(await staffRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingId(null);
    setFormData({
      name: "",
      discountPercent: "20",
      startTime: "10:00",
      endTime: "16:00",
      daysOfWeek: [1, 2, 3],
      serviceIds: [],
      staffIds: [],
      isActive: true,
    });
    setMessage(null);
    setShowModal(true);
  }

  function openEditModal(discount: Discount) {
    setEditingId(discount.id);
    setFormData({
      name: discount.name,
      discountPercent: discount.discountPercent.toString(),
      startTime: discount.startTime,
      endTime: discount.endTime,
      daysOfWeek: discount.daysOfWeek,
      serviceIds: discount.serviceIds,
      staffIds: discount.staffIds,
      isActive: discount.isActive,
    });
    setMessage(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setMessage(null);
  }

  function toggleDay(day: number) {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }));
  }

  function toggleService(serviceId: string) {
    setFormData(prev => {
      const newServiceIds = prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter(id => id !== serviceId)
        : [...prev.serviceIds, serviceId];

      // Filter out staff who can't perform any of the selected services
      const validStaffIds = prev.staffIds.filter(staffId => {
        const staff = staffList.find(s => s.id === staffId);
        if (!staff?.serviceIds) return false;
        return newServiceIds.some(sId => staff.serviceIds?.includes(sId));
      });

      return {
        ...prev,
        serviceIds: newServiceIds,
        staffIds: validStaffIds,
      };
    });
  }

  // Get staff who can perform at least one of the selected services
  const filteredStaff = formData.serviceIds.length > 0
    ? staffList.filter(staff =>
        staff.serviceIds?.some(sId => formData.serviceIds.includes(sId))
      )
    : staffList;

  function toggleStaff(staffId: string) {
    setFormData(prev => ({
      ...prev,
      staffIds: prev.staffIds.includes(staffId)
        ? prev.staffIds.filter(id => id !== staffId)
        : [...prev.staffIds, staffId],
    }));
  }

  function selectAllServices() {
    setFormData(prev => ({
      ...prev,
      serviceIds: services.map(s => s.id),
    }));
  }

  function clearAllServices() {
    setFormData(prev => ({
      ...prev,
      serviceIds: [],
    }));
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setMessage({ type: "error", text: "Please enter a discount name" });
      return;
    }
    if (formData.daysOfWeek.length === 0) {
      setMessage({ type: "error", text: "Please select at least one day" });
      return;
    }
    if (formData.serviceIds.length === 0) {
      setMessage({ type: "error", text: "Please select at least one service" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const url = editingId ? `/api/admin/discounts/${editingId}` : "/api/admin/discounts";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save discount");
      }

      setMessage({ type: "success", text: editingId ? "Discount updated!" : "Discount created!" });
      loadData();
      setTimeout(closeModal, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this discount?")) return;

    try {
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete");

      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleActive(discount: Discount) {
    try {
      await fetch(`/api/admin/discounts/${discount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !discount.isActive }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  function getServiceNames(serviceIds: string[]) {
    return serviceIds
      .map(id => services.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  }

  function getStaffNames(staffIds: string[]) {
    if (staffIds.length === 0) return "All Staff";
    return staffIds
      .map(id => staffList.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  }

  function getDayNames(days: number[]) {
    return days.map(d => DAY_NAMES[d]).join(", ");
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>Discounts</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>Create quiet time discounts for specific services and days</p>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            padding: "12px 24px",
            backgroundColor: "#10B981",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add Discount
        </button>
      </div>

      {discounts.length === 0 ? (
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: 60,
          textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏷️</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>No discounts yet</h3>
          <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>Create your first quiet time discount to attract customers during slower periods.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {discounts.map(discount => (
            <div
              key={discount.id}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 24,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                opacity: discount.isActive ? 1 : 0.6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", margin: 0 }}>{discount.name}</h3>
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 14,
                      fontWeight: 700,
                      backgroundColor: "#ECFDF5",
                      color: "#059669",
                    }}>
                      {discount.discountPercent}% OFF
                    </span>
                    {!discount.isActive && (
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 500,
                        backgroundColor: "#F3F4F6",
                        color: "#6B7280",
                      }}>
                        Inactive
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 14, color: "#64748B" }}>
                    <div>
                      <strong>Time:</strong> {discount.startTime} - {discount.endTime}
                    </div>
                    <div>
                      <strong>Days:</strong> {getDayNames(discount.daysOfWeek)}
                    </div>
                    <div>
                      <strong>Staff:</strong> {getStaffNames(discount.staffIds)}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 13, color: "#94A3B8" }}>
                    <strong>Services:</strong> {getServiceNames(discount.serviceIds)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => toggleActive(discount)}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      background: "#FFFFFF",
                      color: discount.isActive ? "#DC2626" : "#059669",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {discount.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => openEditModal(discount)}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      background: "#FFFFFF",
                      color: "#374151",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(discount.id)}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #FEE2E2",
                      borderRadius: 8,
                      background: "#FEF2F2",
                      color: "#DC2626",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            width: "100%",
            maxWidth: 600,
            maxHeight: "90vh",
            overflow: "auto",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
          }}>
            <div style={{
              padding: "20px 24px",
              borderBottom: "1px solid #E5E7EB",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827" }}>
                {editingId ? "Edit Discount" : "Create Discount"}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  width: 32,
                  height: 32,
                  border: "none",
                  background: "#F3F4F6",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 18,
                  color: "#6B7280",
                }}
              >
                ×
              </button>
            </div>

            {message && (
              <div style={{
                margin: "16px 24px 0",
                padding: 12,
                borderRadius: 8,
                backgroundColor: message.type === "success" ? "#ECFDF5" : "#FEF2F2",
                color: message.type === "success" ? "#059669" : "#DC2626",
                fontSize: 14,
              }}>
                {message.text}
              </div>
            )}

            <div style={{ padding: 24 }}>
              {/* Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>
                  Discount Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Quiet Time Special"
                  style={{
                    width: "100%",
                    padding: 12,
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Discount Percent */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>
                  Discount Percentage
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    min="1"
                    max="100"
                    style={{
                      width: 100,
                      padding: 12,
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  />
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>%</span>
                </div>
              </div>

              {/* Time Range */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>
                  Time Range (Discount applies during this period)
                </label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    style={{
                      padding: 12,
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  />
                  <span style={{ color: "#64748B" }}>to</span>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    style={{
                      padding: 12,
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>

              {/* Days of Week */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>
                  Days of Week
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {DAY_NAMES.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => toggleDay(index)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: formData.daysOfWeek.includes(index) ? "2px solid #10B981" : "1px solid #E5E7EB",
                        background: formData.daysOfWeek.includes(index) ? "#ECFDF5" : "#FFFFFF",
                        color: formData.daysOfWeek.includes(index) ? "#059669" : "#64748B",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Services */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
                    Services (select which services get discount)
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={selectAllServices}
                      style={{ fontSize: 12, color: "#6366F1", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAllServices}
                      style={{ fontSize: 12, color: "#64748B", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div style={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  maxHeight: 200,
                  overflow: "auto",
                }}>
                  {services.map(service => (
                    <label
                      key={service.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderBottom: "1px solid #F3F4F6",
                        cursor: "pointer",
                        backgroundColor: formData.serviceIds.includes(service.id) ? "#F0FDF4" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.serviceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        style={{ width: 16, height: 16 }}
                      />
                      <span style={{ flex: 1, fontSize: 14, color: "#374151" }}>{service.name}</span>
                      <span style={{ fontSize: 13, color: "#64748B" }}>£{service.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Staff (Optional) - filtered by selected services */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>
                  Staff (leave empty for all staff who can do selected services)
                </label>
                {formData.serviceIds.length === 0 ? (
                  <div style={{
                    padding: 16,
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    backgroundColor: "#F9FAFB",
                    color: "#64748B",
                    fontSize: 14,
                    textAlign: "center",
                  }}>
                    Please select services first to see available staff
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div style={{
                    padding: 16,
                    border: "1px solid #FEE2E2",
                    borderRadius: 8,
                    backgroundColor: "#FEF2F2",
                    color: "#DC2626",
                    fontSize: 14,
                    textAlign: "center",
                  }}>
                    No staff can perform the selected services
                  </div>
                ) : (
                  <div style={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    maxHeight: 150,
                    overflow: "auto",
                  }}>
                    {filteredStaff.map(staff => (
                      <label
                        key={staff.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          borderBottom: "1px solid #F3F4F6",
                          cursor: "pointer",
                          backgroundColor: formData.staffIds.includes(staff.id) ? "#F0FDF4" : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.staffIds.includes(staff.id)}
                          onChange={() => toggleStaff(staff.id)}
                          style={{ width: 16, height: 16 }}
                        />
                        <span style={{ fontSize: 14, color: "#374151" }}>{staff.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
                  Only showing staff who can perform the selected services. Leave empty for all eligible staff.
                </p>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={closeModal}
                  style={{
                    flex: 1,
                    padding: 14,
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    background: "#FFFFFF",
                    color: "#6B7280",
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: 14,
                    border: "none",
                    borderRadius: 8,
                    background: "#10B981",
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Saving..." : editingId ? "Update Discount" : "Create Discount"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
