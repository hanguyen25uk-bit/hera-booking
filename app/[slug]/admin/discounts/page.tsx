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
      <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 600,
            color: "var(--ink)",
            margin: 0,
            fontFamily: "var(--font-heading)"
          }}>
            Discounts
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 6, fontFamily: "var(--font-body)" }}>
            Create quiet time discounts for specific services and days
          </p>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            padding: "14px 28px",
            backgroundColor: "var(--rose)",
            color: "var(--white)",
            border: "none",
            borderRadius: 50,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            transition: "all 0.2s ease"
          }}
        >
          + Add Discount
        </button>
      </div>

      {discounts.length === 0 ? (
        <div style={{
          backgroundColor: "var(--white)",
          borderRadius: 16,
          padding: 60,
          textAlign: "center",
          border: "1px solid var(--cream-dark)",
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            backgroundColor: "var(--gold-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 28
          }}>
            %
          </div>
          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--ink)",
            margin: "0 0 8px",
            fontFamily: "var(--font-heading)"
          }}>
            No discounts yet
          </h3>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", margin: 0, fontFamily: "var(--font-body)" }}>
            Create your first quiet time discount to attract customers during slower periods.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {discounts.map(discount => (
            <div
              key={discount.id}
              style={{
                backgroundColor: "var(--white)",
                borderRadius: 16,
                padding: 24,
                border: "1px solid var(--cream-dark)",
                boxShadow: "var(--shadow-sm)",
                opacity: discount.isActive ? 1 : 0.6,
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <h3 style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: "var(--ink)",
                      margin: 0,
                      fontFamily: "var(--font-heading)"
                    }}>
                      {discount.name}
                    </h3>
                    <span style={{
                      padding: "6px 14px",
                      borderRadius: 50,
                      fontSize: 13,
                      fontWeight: 600,
                      backgroundColor: "var(--sage-light)",
                      color: "var(--sage)",
                      fontFamily: "var(--font-body)"
                    }}>
                      {discount.discountPercent}% OFF
                    </span>
                    {!discount.isActive && (
                      <span style={{
                        padding: "6px 14px",
                        borderRadius: 50,
                        fontSize: 12,
                        fontWeight: 500,
                        backgroundColor: "var(--cream)",
                        color: "var(--ink-muted)",
                        fontFamily: "var(--font-body)"
                      }}>
                        Inactive
                      </span>
                    )}
                  </div>

                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 20,
                    fontSize: 14,
                    color: "var(--ink-light)",
                    fontFamily: "var(--font-body)"
                  }}>
                    <div>
                      <span style={{ fontWeight: 500, color: "var(--ink)" }}>Time:</span> {discount.startTime} - {discount.endTime}
                    </div>
                    <div>
                      <span style={{ fontWeight: 500, color: "var(--ink)" }}>Days:</span> {getDayNames(discount.daysOfWeek)}
                    </div>
                    <div>
                      <span style={{ fontWeight: 500, color: "var(--ink)" }}>Staff:</span> {getStaffNames(discount.staffIds)}
                    </div>
                  </div>

                  <div style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: "var(--ink-muted)",
                    fontFamily: "var(--font-body)"
                  }}>
                    <span style={{ fontWeight: 500, color: "var(--ink-light)" }}>Services:</span> {getServiceNames(discount.serviceIds)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => toggleActive(discount)}
                    style={{
                      padding: "10px 18px",
                      border: "1.5px solid var(--ink)",
                      borderRadius: 50,
                      background: "var(--white)",
                      color: discount.isActive ? "var(--rose)" : "var(--sage)",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {discount.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => openEditModal(discount)}
                    style={{
                      padding: "10px 18px",
                      border: "1.5px solid var(--ink)",
                      borderRadius: 50,
                      background: "var(--white)",
                      color: "var(--ink)",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(discount.id)}
                    style={{
                      padding: "10px 18px",
                      border: "none",
                      borderRadius: 50,
                      background: "var(--rose-pale)",
                      color: "var(--rose)",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      transition: "all 0.2s ease"
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
          backgroundColor: "rgba(26,23,21,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            backgroundColor: "var(--white)",
            borderRadius: 16,
            width: "100%",
            maxWidth: 600,
            maxHeight: "90vh",
            overflow: "auto",
            boxShadow: "var(--shadow-lg)",
          }}>
            <div style={{
              padding: "24px 28px",
              borderBottom: "1px solid var(--cream-dark)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <h2 style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 600,
                color: "var(--ink)",
                fontFamily: "var(--font-heading)"
              }}>
                {editingId ? "Edit Discount" : "Create Discount"}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  width: 36,
                  height: 36,
                  border: "none",
                  background: "var(--cream)",
                  borderRadius: 50,
                  cursor: "pointer",
                  fontSize: 18,
                  color: "var(--ink-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                x
              </button>
            </div>

            {message && (
              <div style={{
                margin: "20px 28px 0",
                padding: 14,
                borderRadius: 12,
                backgroundColor: message.type === "success" ? "var(--sage-light)" : "var(--rose-pale)",
                color: message.type === "success" ? "var(--sage)" : "var(--rose)",
                fontSize: 14,
                fontFamily: "var(--font-body)"
              }}>
                {message.text}
              </div>
            )}

            <div style={{ padding: 28 }}>
              {/* Name */}
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 8,
                  color: "var(--ink-light)",
                  fontFamily: "var(--font-body)"
                }}>
                  Discount Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Quiet Time Special"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    backgroundColor: "var(--cream)",
                    border: "1px solid var(--cream-dark)",
                    borderRadius: 12,
                    fontSize: 15,
                    boxSizing: "border-box",
                    color: "var(--ink)",
                    fontFamily: "var(--font-body)"
                  }}
                />
              </div>

              {/* Discount Percent */}
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 8,
                  color: "var(--ink-light)",
                  fontFamily: "var(--font-body)"
                }}>
                  Discount Percentage
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="number"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    min="1"
                    max="100"
                    style={{
                      width: 100,
                      padding: "14px 16px",
                      backgroundColor: "var(--cream)",
                      border: "1px solid var(--cream-dark)",
                      borderRadius: 12,
                      fontSize: 15,
                      color: "var(--ink)",
                      fontFamily: "var(--font-body)"
                    }}
                  />
                  <span style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--ink)",
                    fontFamily: "var(--font-body)"
                  }}>%</span>
                </div>
              </div>

              {/* Time Range */}
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 8,
                  color: "var(--ink-light)",
                  fontFamily: "var(--font-body)"
                }}>
                  Time Range (Discount applies during this period)
                </label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    style={{
                      padding: "14px 16px",
                      backgroundColor: "var(--cream)",
                      border: "1px solid var(--cream-dark)",
                      borderRadius: 12,
                      fontSize: 15,
                      color: "var(--ink)",
                      fontFamily: "var(--font-body)"
                    }}
                  />
                  <span style={{ color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>to</span>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    style={{
                      padding: "14px 16px",
                      backgroundColor: "var(--cream)",
                      border: "1px solid var(--cream-dark)",
                      borderRadius: 12,
                      fontSize: 15,
                      color: "var(--ink)",
                      fontFamily: "var(--font-body)"
                    }}
                  />
                </div>
              </div>

              {/* Days of Week */}
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 8,
                  color: "var(--ink-light)",
                  fontFamily: "var(--font-body)"
                }}>
                  Days of Week
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {DAY_NAMES.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => toggleDay(index)}
                      style={{
                        padding: "12px 16px",
                        borderRadius: 50,
                        border: formData.daysOfWeek.includes(index)
                          ? "2px solid var(--rose)"
                          : "1px solid var(--cream-dark)",
                        background: formData.daysOfWeek.includes(index)
                          ? "var(--rose-pale)"
                          : "var(--white)",
                        color: formData.daysOfWeek.includes(index)
                          ? "var(--rose)"
                          : "var(--ink-muted)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "var(--font-body)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Services */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--ink-light)",
                    fontFamily: "var(--font-body)"
                  }}>
                    Services (select which services get discount)
                  </label>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      onClick={selectAllServices}
                      style={{
                        fontSize: 13,
                        color: "var(--rose)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 500,
                        fontFamily: "var(--font-body)"
                      }}
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAllServices}
                      style={{
                        fontSize: 13,
                        color: "var(--ink-muted)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "var(--font-body)"
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div style={{
                  border: "1px solid var(--cream-dark)",
                  borderRadius: 12,
                  maxHeight: 200,
                  overflow: "auto",
                  backgroundColor: "var(--cream)"
                }}>
                  {services.map(service => (
                    <label
                      key={service.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--cream-dark)",
                        cursor: "pointer",
                        backgroundColor: formData.serviceIds.includes(service.id)
                          ? "var(--rose-pale)"
                          : "transparent",
                        transition: "background-color 0.2s ease"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.serviceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        style={{ width: 18, height: 18, accentColor: "var(--rose)" }}
                      />
                      <span style={{
                        flex: 1,
                        fontSize: 14,
                        color: "var(--ink)",
                        fontFamily: "var(--font-body)"
                      }}>{service.name}</span>
                      <span style={{
                        fontSize: 13,
                        color: "var(--ink-muted)",
                        fontFamily: "var(--font-body)"
                      }}>£{service.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Staff (Optional) - filtered by selected services */}
              <div style={{ marginBottom: 28 }}>
                <label style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 8,
                  color: "var(--ink-light)",
                  fontFamily: "var(--font-body)"
                }}>
                  Staff (leave empty for all staff who can do selected services)
                </label>
                {formData.serviceIds.length === 0 ? (
                  <div style={{
                    padding: 20,
                    border: "1px solid var(--cream-dark)",
                    borderRadius: 12,
                    backgroundColor: "var(--cream)",
                    color: "var(--ink-muted)",
                    fontSize: 14,
                    textAlign: "center",
                    fontFamily: "var(--font-body)"
                  }}>
                    Please select services first to see available staff
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <div style={{
                    padding: 20,
                    border: "1px solid var(--rose-pale)",
                    borderRadius: 12,
                    backgroundColor: "var(--rose-pale)",
                    color: "var(--rose)",
                    fontSize: 14,
                    textAlign: "center",
                    fontFamily: "var(--font-body)"
                  }}>
                    No staff can perform the selected services
                  </div>
                ) : (
                  <div style={{
                    border: "1px solid var(--cream-dark)",
                    borderRadius: 12,
                    maxHeight: 150,
                    overflow: "auto",
                    backgroundColor: "var(--cream)"
                  }}>
                    {filteredStaff.map(staff => (
                      <label
                        key={staff.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--cream-dark)",
                          cursor: "pointer",
                          backgroundColor: formData.staffIds.includes(staff.id)
                            ? "var(--rose-pale)"
                            : "transparent",
                          transition: "background-color 0.2s ease"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.staffIds.includes(staff.id)}
                          onChange={() => toggleStaff(staff.id)}
                          style={{ width: 18, height: 18, accentColor: "var(--rose)" }}
                        />
                        <span style={{
                          fontSize: 14,
                          color: "var(--ink)",
                          fontFamily: "var(--font-body)"
                        }}>{staff.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p style={{
                  fontSize: 13,
                  color: "var(--ink-muted)",
                  marginTop: 6,
                  fontFamily: "var(--font-body)"
                }}>
                  Only showing staff who can perform the selected services. Leave empty for all eligible staff.
                </p>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={closeModal}
                  style={{
                    flex: 1,
                    padding: "14px 24px",
                    border: "1.5px solid var(--ink)",
                    borderRadius: 50,
                    background: "var(--white)",
                    color: "var(--ink-light)",
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    transition: "all 0.2s ease"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "14px 24px",
                    border: "none",
                    borderRadius: 50,
                    background: "var(--rose)",
                    color: "var(--white)",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1,
                    fontFamily: "var(--font-body)",
                    transition: "all 0.2s ease"
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
