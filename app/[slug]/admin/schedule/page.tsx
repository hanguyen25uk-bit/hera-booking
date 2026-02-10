"use client";

import { useEffect, useState } from "react";

type Staff = { id: string; name: string; role?: string | null };
type WorkingHours = { dayOfWeek: number; isWorking: boolean; startTime: string; endTime: string };

type Override = {
  id: string;
  staffId: string;
  date: string;
  isDayOff: boolean;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
  staff: Staff;
};

type Tab = "time-off" | "custom-hours" | "working-hours";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SchedulePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [workingHours, setWorkingHours] = useState<Record<string, WorkingHours[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<Tab>("time-off");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingOverride, setEditingOverride] = useState<Override | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndDate, setFormEndDate] = useState("");
  const [formEndTime, setFormEndTime] = useState("17:00");
  const [formAllDay, setFormAllDay] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [staffRes, overridesRes] = await Promise.all([
        fetch("/api/admin/staff", { credentials: "include" }),
        fetch("/api/admin/schedule-override", { credentials: "include" }),
      ]);
      const staffData = await staffRes.json();
      setStaff(staffData);
      setOverrides(await overridesRes.json());

      // Select first staff member by default
      if (staffData.length > 0 && !selectedStaffId) {
        setSelectedStaffId(staffData[0].id);
        loadWorkingHours(staffData[0].id);
      }
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkingHours(staffId: string) {
    try {
      const res = await fetch(`/api/admin/working-hours?staffId=${staffId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setWorkingHours(prev => ({ ...prev, [staffId]: data }));
      }
    } catch (err) {
      console.error("Failed to load working hours:", err);
    }
  }

  function selectStaff(staffId: string) {
    setSelectedStaffId(staffId);
    if (!workingHours[staffId]) {
      loadWorkingHours(staffId);
    }
  }

  async function handleSave() {
    console.log("=== HANDLESAVE CALLED ===");
    console.log("Form state:", { selectedStaffId, formStartDate, formEndDate, formAllDay, formStartTime, formEndTime, formTitle });

    if (!selectedStaffId || !formStartDate) {
      console.log("=== VALIDATION FAILED ===", { selectedStaffId, formStartDate });
      alert("Missing staff or date");
      return;
    }

    setSaving(true);
    console.log("=== SAVING SET TO TRUE ===");

    try {
      if (editingOverride) {
        console.log("=== UPDATING EXISTING ===", editingOverride.id);
        const requestBody = {
          id: editingOverride.id,
          date: formStartDate,
          isDayOff: formAllDay,
          startTime: formAllDay ? null : formStartTime,
          endTime: formAllDay ? null : formEndTime,
          note: formTitle || null,
        };
        console.log("PUT request body:", requestBody);

        const res = await fetch("/api/admin/schedule-override", {
          credentials: "include",
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        console.log("PUT response status:", res.status);

        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: "Unknown error" }));
          console.log("PUT error:", error);
          throw new Error(error.error || "Failed to update");
        }
      } else {
        // Create new - support date range
        const dates: string[] = [];
        if (formEndDate && formEndDate !== formStartDate) {
          const start = new Date(formStartDate);
          const end = new Date(formEndDate);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split("T")[0]);
          }
        } else {
          dates.push(formStartDate);
        }
        console.log("=== CREATING NEW ===", { dates, count: dates.length });

        for (const date of dates) {
          const requestBody = {
            staffId: selectedStaffId,
            date,
            isDayOff: formAllDay,
            startTime: formAllDay ? null : formStartTime,
            endTime: formAllDay ? null : formEndTime,
            note: formTitle || null,
          };
          console.log("POST request body:", requestBody);

          const res = await fetch("/api/admin/schedule-override", {
            credentials: "include",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });
          console.log("POST response status:", res.status);

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
            console.log("POST error:", errorData);
            throw new Error(errorData.error || "Failed to save");
          }
          const result = await res.json();
          console.log("POST success:", result.id);
        }
      }

      console.log("=== SAVE COMPLETE, CLOSING MODAL ===");
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      console.error("=== SAVE ERROR ===", err);
      alert("Error saving: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
      console.log("=== SAVING SET TO FALSE ===");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    try {
      await fetch(`/api/admin/schedule-override?id=${id}`, { method: "DELETE", credentials: "include" });
      loadData();
    } catch (err) {
      alert("Error deleting");
    }
  }

  function resetForm() {
    setFormTitle("");
    setFormStartDate("");
    setFormStartTime("09:00");
    setFormEndDate("");
    setFormEndTime("17:00");
    setFormAllDay(true);
    setEditingOverride(null);
  }

  function openAddModal(type: "time-off" | "custom-hours") {
    const today = new Date().toISOString().split("T")[0];
    console.log("openAddModal - today:", today, "selectedStaffId:", selectedStaffId);
    setFormTitle("");
    setFormStartDate(today);
    setFormStartTime("09:00");
    setFormEndDate(today);
    setFormEndTime("17:00");
    setFormAllDay(type === "time-off"); // Default to all-day for time-off, unchecked for custom-hours
    setEditingOverride(null);
    setShowModal(true);
  }

  function openEditModal(override: Override) {
    setFormTitle(override.note || "");
    setFormStartDate(override.date.split("T")[0]);
    setFormStartTime(override.startTime || "09:00");
    setFormEndDate(override.date.split("T")[0]);
    setFormEndTime(override.endTime || "17:00");
    setFormAllDay(override.isDayOff);
    setEditingOverride(override);
    setShowModal(true);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function formatDateLong(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  function getDaysCount() {
    if (!formStartDate || !formEndDate || formStartDate === formEndDate) return 1;
    const start = new Date(formStartDate);
    const end = new Date(formEndDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }

  // Generate time options with 12-hour format display
  const timeOptions: { value: string; label: string }[] = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
      timeOptions.push({ value, label });
    }
  }

  function formatTime12h(time: string) {
    const [h, m] = time.split(":").map(Number);
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? "AM" : "PM";
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  const selectedStaff = staff.find(s => s.id === selectedStaffId);
  const staffOverrides = overrides.filter(o => o.staffId === selectedStaffId);
  const timeOffEntries = staffOverrides.filter(o => o.isDayOff).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const customHoursEntries = staffOverrides.filter(o => !o.isDayOff).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const staffWorkingHours = workingHours[selectedStaffId] || [];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#9CA3AF" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", backgroundColor: "#FFFFFF" }}>
      {/* Left Panel - Staff List */}
      <div style={{
        width: 260,
        minWidth: 260,
        borderRight: "1px solid #E5E7EB",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
      }}>
        <div style={{
          padding: "20px 16px",
          borderBottom: "1px solid #E5E7EB",
        }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#374151" }}>
            Your team <span style={{ color: "#9CA3AF", fontWeight: 400 }}>({staff.length})</span>
          </h2>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {staff.map((s) => (
            <div
              key={s.id}
              onClick={() => selectStaff(s.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                cursor: "pointer",
                backgroundColor: selectedStaffId === s.id ? "#F9FAFB" : "transparent",
                borderLeft: selectedStaffId === s.id ? "3px solid #1F2937" : "3px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: "#1F2937",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 13,
              }}>
                {s.name.charAt(0).toUpperCase()}
              </div>
              <span style={{
                fontSize: 14,
                fontWeight: selectedStaffId === s.id ? 600 : 400,
                color: "#1F2937",
              }}>
                {s.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Staff Details */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedStaff ? (
          <>
            {/* Staff Header */}
            <div style={{
              padding: "24px 32px",
              borderBottom: "1px solid #E5E7EB",
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                backgroundColor: "#1F2937",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 24,
              }}>
                {selectedStaff.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1F2937" }}>
                  {selectedStaff.name}
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6B7280" }}>
                  {selectedStaff.role || "Nail Technician"}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex",
              gap: 32,
              padding: "0 32px",
              borderBottom: "1px solid #E5E7EB",
            }}>
              {[
                { id: "working-hours" as Tab, label: "Working hours" },
                { id: "time-off" as Tab, label: "Time off" },
                { id: "custom-hours" as Tab, label: "Custom hours" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "16px 0",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: activeTab === tab.id ? 500 : 400,
                    color: activeTab === tab.id ? "#1F2937" : "#6B7280",
                    borderBottom: activeTab === tab.id ? "2px solid #1F2937" : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
              {/* Working Hours Tab */}
              {activeTab === "working-hours" && (
                <div>
                  <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>
                    Regular weekly schedule for {selectedStaff.name}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {[1, 2, 3, 4, 5, 6, 0].map(day => {
                      const hours = staffWorkingHours.find(h => h.dayOfWeek === day);
                      return (
                        <div
                          key={day}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "14px 0",
                            borderBottom: "1px solid #F3F4F6",
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
                            {DAY_NAMES[day]}
                          </span>
                          <span style={{ fontSize: 14, color: hours?.isWorking ? "#374151" : "#9CA3AF" }}>
                            {hours?.isWorking ? `${hours.startTime} - ${hours.endTime}` : "Off"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {staffWorkingHours.length === 0 && (
                    <p style={{ fontSize: 14, color: "#9CA3AF", marginTop: 20 }}>
                      No working hours configured. Configure in Staff Hours page.
                    </p>
                  )}
                </div>
              )}

              {/* Time Off Tab */}
              {activeTab === "time-off" && (
                <div>
                  <button
                    onClick={() => openAddModal("time-off")}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      fontSize: 14,
                      color: "#1F2937",
                      textDecoration: "underline",
                      cursor: "pointer",
                      marginBottom: 24,
                    }}
                  >
                    + Add time off
                  </button>

                  {timeOffEntries.length === 0 ? (
                    <p style={{ fontSize: 14, color: "#9CA3AF" }}>No time off scheduled</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {timeOffEntries.map(entry => (
                        <div
                          key={entry.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "16px 0",
                            borderBottom: "1px solid #F3F4F6",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#1F2937" }}>
                              {entry.note || "Day Off"}
                            </div>
                            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                              {formatDate(entry.date)}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{ fontSize: 13, color: "#6B7280" }}>1 day</span>
                            <button
                              onClick={() => openEditModal(entry)}
                              style={{
                                width: 32,
                                height: 32,
                                border: "1px solid #E5E7EB",
                                borderRadius: 6,
                                background: "#FFFFFF",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              style={{
                                width: 32,
                                height: 32,
                                border: "1px solid #FEE2E2",
                                borderRadius: 6,
                                background: "#FEF2F2",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Custom Hours Tab */}
              {activeTab === "custom-hours" && (
                <div>
                  <button
                    onClick={() => openAddModal("custom-hours")}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      fontSize: 14,
                      color: "#1F2937",
                      textDecoration: "underline",
                      cursor: "pointer",
                      marginBottom: 24,
                    }}
                  >
                    + Add custom hours
                  </button>

                  {customHoursEntries.length === 0 ? (
                    <p style={{ fontSize: 14, color: "#9CA3AF" }}>No custom hours scheduled</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {customHoursEntries.map(entry => (
                        <div
                          key={entry.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "16px 0",
                            borderBottom: "1px solid #F3F4F6",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "#1F2937" }}>
                              {formatDateLong(entry.date)}
                            </div>
                            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                              {entry.startTime && entry.endTime ? `${formatTime12h(entry.startTime)} - ${formatTime12h(entry.endTime)}` : "Custom hours"}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            {entry.note && (
                              <span style={{ fontSize: 13, color: "#6B7280" }}>{entry.note}</span>
                            )}
                            <button
                              onClick={() => openEditModal(entry)}
                              style={{
                                width: 32,
                                height: 32,
                                border: "1px solid #E5E7EB",
                                borderRadius: 6,
                                background: "#FFFFFF",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              style={{
                                width: 32,
                                height: 32,
                                border: "1px solid #FEE2E2",
                                borderRadius: 6,
                                background: "#FEF2F2",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA3AF" }}>
            Select a staff member
          </div>
        )}
      </div>

      {/* Modal - Setmore Style */}
      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 16,
        }}>
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            width: "100%",
            maxWidth: formAllDay ? 480 : 680,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            position: "relative",
            transition: "max-width 0.2s ease",
          }}>
            {/* Close button */}
            <button
              onClick={() => { setShowModal(false); resetForm(); }}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                border: "none",
                background: "transparent",
                fontSize: 20,
                cursor: "pointer",
                color: "#9CA3AF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#6B7280"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#9CA3AF"}
            >
              ×
            </button>

            {/* Header */}
            <div style={{ padding: "24px 24px 0" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1F2937" }}>
                {editingOverride ? "Edit time off" : "Add time off"}
              </h2>
            </div>

            {/* Form Content */}
            <div style={{ padding: 24 }}>
              {/* Title Field */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 8 }}>
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Vacation, Doctor's appointment"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1px solid #D1D5DB",
                    borderRadius: 8,
                    fontSize: 14,
                    color: "#1F2937",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1F2937"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#D1D5DB"}
                />
              </div>

              {/* Date & Time Row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: formAllDay ? "1fr 1fr" : "1fr minmax(130px, 1fr) 1fr minmax(130px, 1fr)",
                gap: 12,
                marginBottom: 16,
              }}>
                {/* Start Date */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 8, whiteSpace: "nowrap" }}>
                    Start date
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (!formEndDate || e.target.value > formEndDate) {
                        setFormEndDate(e.target.value);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #D1D5DB",
                      borderRadius: 8,
                      fontSize: 14,
                      color: "#1F2937",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#1F2937"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#D1D5DB"}
                  />
                </div>

                {/* Start Time - only show if not all day */}
                {!formAllDay && (
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 8, whiteSpace: "nowrap" }}>
                      Start time
                    </label>
                    <select
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      style={{
                        width: "100%",
                        minWidth: 130,
                        padding: "10px 12px",
                        border: "1px solid #D1D5DB",
                        borderRadius: 8,
                        fontSize: 14,
                        color: "#1F2937",
                        boxSizing: "border-box",
                        backgroundColor: "#FFFFFF",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                )}

                {/* End Date */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 8, whiteSpace: "nowrap" }}>
                    End date
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    min={formStartDate}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #D1D5DB",
                      borderRadius: 8,
                      fontSize: 14,
                      color: "#1F2937",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#1F2937"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#D1D5DB"}
                  />
                </div>

                {/* End Time - only show if not all day */}
                {!formAllDay && (
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 8, whiteSpace: "nowrap" }}>
                      End time
                    </label>
                    <select
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      style={{
                        width: "100%",
                        minWidth: 130,
                        padding: "10px 12px",
                        border: "1px solid #D1D5DB",
                        borderRadius: 8,
                        fontSize: 14,
                        color: "#1F2937",
                        boxSizing: "border-box",
                        backgroundColor: "#FFFFFF",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* All Day Checkbox & Repeat */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <div
                    onClick={() => setFormAllDay(!formAllDay)}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      border: formAllDay ? "none" : "2px solid #D1D5DB",
                      backgroundColor: formAllDay ? "#1F2937" : "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {formAllDay && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 14, color: "#374151" }}>All day</span>
                </label>

                <span style={{ fontSize: 13, color: "#9CA3AF" }}>Does not repeat</span>
              </div>

              {/* Days count indicator */}
              {getDaysCount() > 1 && (
                <div style={{
                  padding: "12px 14px",
                  backgroundColor: "#F0FDF4",
                  borderRadius: 8,
                  color: "#15803D",
                  fontSize: 14,
                  fontWeight: 500,
                }}>
                  {getDaysCount()} days selected
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div style={{
              display: "flex",
              gap: 12,
              justifyContent: "space-between",
              padding: "16px 24px 24px",
            }}>
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "transparent",
                  color: "#374151",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#F3F4F6"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log("Add button clicked!", { saving, formStartDate, selectedStaffId });
                  handleSave();
                }}
                disabled={saving || !formStartDate}
                style={{
                  padding: "12px 28px",
                  backgroundColor: "#1a1a1a",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving || !formStartDate ? 0.6 : 1,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!saving && formStartDate) e.currentTarget.style.backgroundColor = "#333"; }}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#1a1a1a"}
              >
                {saving ? "Saving..." : editingOverride ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
