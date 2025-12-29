"use client";

import { useEffect, useState, FormEvent } from "react";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  category?: string | null;
};

type Staff = {
  id: string;
  name: string;
  role?: string | null;
};

type WorkingHour = {
  staffId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
};

type Appointment = {
  id: string;
  staffId: string;
  startTime: string;
  endTime: string;
  status: string;
};

type Step = 1 | 2 | 3 | 4 | 5;

export default function BookingPage() {
  const [step, setStep] = useState<Step>(1);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [allWorkingHours, setAllWorkingHours] = useState<WorkingHour[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);
  const [assignedStaffId, setAssignedStaffId] = useState<string>("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successAppointmentId, setSuccessAppointmentId] = useState<string | null>(null);

  const isAnyStaff = selectedStaffId === "any";

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch("/api/services");
        const data = await res.json();
        setServices(data);
        setDataReady(true);
      } catch (err) {
        setError("Failed to load services. Please refresh.");
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  useEffect(() => {
    if (!selectedServiceId) return;
    async function loadStaff() {
      setLoadingStaff(true);
      try {
        const res = await fetch(`/api/staff?serviceId=${selectedServiceId}`);
        const data = await res.json();
        setStaff(data);
      } catch (err) {
        console.error("Failed to load staff:", err);
      } finally {
        setLoadingStaff(false);
      }
    }
    loadStaff();
  }, [selectedServiceId]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  useEffect(() => {
    if (!selectedStaffId) return;
    async function loadWorkingHours() {
      setLoadingHours(true);
      try {
        if (selectedStaffId === "any") {
          const res = await fetch(`/api/working-hours`);
          const data = await res.json();
          if (Array.isArray(data)) setAllWorkingHours(data);
        } else {
          const res = await fetch(`/api/working-hours?staffId=${selectedStaffId}`);
          const data = await res.json();
          if (Array.isArray(data)) setWorkingHours(data);
        }
      } catch (err) {
        console.error("Failed to load working hours:", err);
      } finally {
        setLoadingHours(false);
      }
    }
    loadWorkingHours();
  }, [selectedStaffId]);

  useEffect(() => {
    if (!selectedDate || !isAnyStaff) return;
    async function loadAppointments() {
      try {
        const res = await fetch(`/api/appointments?date=${selectedDate}`);
        const data = await res.json();
        if (Array.isArray(data)) setExistingAppointments(data);
      } catch (err) {
        console.error("Failed to load appointments:", err);
      }
    }
    loadAppointments();
  }, [selectedDate, isAnyStaff]);

  const currentService = services.find((s) => s.id === selectedServiceId);
  const currentStaff = staff.find((s) => s.id === (assignedStaffId || selectedStaffId));

  const goNext = () => setStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev));
  const goBack = () => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));

  const getWorkingHoursForDate = () => {
    if (!selectedDate || workingHours.length === 0) return null;
    const dayOfWeek = new Date(selectedDate).getDay();
    return workingHours.find((h) => h.dayOfWeek === dayOfWeek);
  };

  const isStaffAvailable = (staffId: string, time: string): boolean => {
    const serviceDuration = currentService?.durationMinutes || 60;
    const slotStart = new Date(`${selectedDate}T${time}:00`);
    const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);
    const hasConflict = existingAppointments.some((apt) => {
      if (apt.staffId !== staffId || apt.status === "cancelled") return false;
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      return slotStart < aptEnd && slotEnd > aptStart;
    });
    return !hasConflict;
  };

  const findAvailableStaff = (time: string): string | null => {
    const dayOfWeek = new Date(selectedDate).getDay();
    for (const member of staff) {
      const staffHours = allWorkingHours.find(
        (h) => h.staffId === member.id && h.dayOfWeek === dayOfWeek && h.isWorking
      );
      if (!staffHours) continue;
      const [timeH, timeM] = time.split(":").map(Number);
      const [startH, startM] = staffHours.startTime.split(":").map(Number);
      const [endH, endM] = staffHours.endTime.split(":").map(Number);
      const timeMinutes = timeH * 60 + timeM;
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      if (timeMinutes < startMinutes || timeMinutes >= endMinutes) continue;
      if (isStaffAvailable(member.id, time)) return member.id;
    }
    return null;
  };

  const generateAnySlotsTimeSlots = () => {
    if (!selectedDate || allWorkingHours.length === 0) return [];
    const dayOfWeek = new Date(selectedDate).getDay();
    const slots: string[] = [];
    const addedSlots = new Set<string>();
    let earliestStart = 24 * 60;
    let latestEnd = 0;
    for (const member of staff) {
      const hours = allWorkingHours.find(
        (h) => h.staffId === member.id && h.dayOfWeek === dayOfWeek && h.isWorking
      );
      if (!hours) continue;
      const [startH, startM] = hours.startTime.split(":").map(Number);
      const [endH, endM] = hours.endTime.split(":").map(Number);
      earliestStart = Math.min(earliestStart, startH * 60 + startM);
      latestEnd = Math.max(latestEnd, endH * 60 + endM);
    }
    if (earliestStart >= latestEnd) return [];
    for (let minutes = earliestStart; minutes < latestEnd; minutes += 30) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const time = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      if (findAvailableStaff(time) && !addedSlots.has(time)) {
        slots.push(time);
        addedSlots.add(time);
      }
    }
    return slots;
  };

  const generateTimeSlots = () => {
    if (isAnyStaff) return generateAnySlotsTimeSlots();
    const todayHours = getWorkingHoursForDate();
    if (!todayHours || !todayHours.isWorking) return [];
    const slots: string[] = [];
    const [startH, startM] = todayHours.startTime.split(":").map(Number);
    const [endH, endM] = todayHours.endTime.split(":").map(Number);
    let currentH = startH;
    let currentM = startM;
    while (currentH < endH || (currentH === endH && currentM < endM)) {
      slots.push(`${currentH.toString().padStart(2, "0")}:${currentM.toString().padStart(2, "0")}`);
      currentM += 30;
      if (currentM >= 60) { currentM = 0; currentH += 1; }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  const todayHours = getWorkingHoursForDate();

  const isTimeSlotPast = (time: string) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    if (selectedDate > today) return false;
    if (selectedDate < today) return true;
    const [hours, minutes] = time.split(":").map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return slotTime <= now;
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (isAnyStaff) {
      const availableStaffId = findAvailableStaff(time);
      setAssignedStaffId(availableStaffId || "");
    }
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const finalStaffId = isAnyStaff ? assignedStaffId : selectedStaffId;
    if (!selectedServiceId || !finalStaffId || !selectedDate || !selectedTime) {
      setError("Please complete all selections.");
      return;
    }
    if (!customerName || !customerPhone || !customerEmail) {
      setError("Please fill in your details.");
      return;
    }
    setSubmitting(true);
    try {
      const startTimeIso = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          staffId: finalStaffId,
          customerName,
          customerPhone,
          customerEmail,
          startTime: startTimeIso,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create appointment");
      }
      const appointment = await res.json();
      setSuccessAppointmentId(appointment.id);
      setStep(5);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !dataReady) {
    return (
      <div className="booking-page">
        <style>{responsiveStyles}</style>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <style>{responsiveStyles}</style>
      
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="mobile-logo">
          <span className="logo-icon">H</span>
          <span className="logo-text">Hera Booking</span>
        </div>
        <div className="mobile-steps">
          Step {step} of 5
        </div>
      </div>

      <div className="container">
        {/* Left Panel - Hidden on Mobile */}
        <div className="left-panel">
          <div className="brand">
            <div className="logo">H</div>
            <span className="brand-name">Hera Booking</span>
          </div>
          
          <div className="progress-list">
            {[
              { num: 1, label: "Service", desc: "Choose your treatment" },
              { num: 2, label: "Specialist", desc: "Pick your technician" },
              { num: 3, label: "Date & Time", desc: "Select available slot" },
              { num: 4, label: "Your Info", desc: "Contact details" },
              { num: 5, label: "Confirmed", desc: "Booking complete" },
            ].map((item) => (
              <div key={item.num} className={`progress-item ${step >= item.num ? "active" : ""}`}>
                <div className={`progress-num ${step > item.num ? "done" : step === item.num ? "current" : ""}`}>
                  {step > item.num ? "✓" : item.num}
                </div>
                <div>
                  <div className="progress-label">{item.label}</div>
                  <div className="progress-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {currentService && (
            <div className="summary">
              <div className="summary-title">Your Selection</div>
              <div className="summary-item">✨ {currentService.name}</div>
              {currentStaff && <div className="summary-item">👤 {currentStaff.name}</div>}
              {selectedDate && selectedTime && (
                <div className="summary-item">
                  📅 {new Date(`${selectedDate}T${selectedTime}`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} at {selectedTime}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          {error && <div className="error">{error}</div>}

          {/* Step 1: Service */}
          {step === 1 && (
            <div className="step-content">
              <h1 className="step-title">Select a Service</h1>
              <p className="step-subtitle">Choose the treatment you'd like to book</p>
              <div className="service-grid">
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`service-card ${selectedServiceId === service.id ? "selected" : ""}`}
                  >
                    <div className="service-header">
                      <h3 className="service-name">{service.name}</h3>
                      {selectedServiceId === service.id && <span className="checkmark">✓</span>}
                    </div>
                    <div className="service-meta">
                      <span className="duration">{service.durationMinutes} min</span>
                      <span className="price">£{service.price}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="actions">
                <button className="btn-primary" onClick={() => { if (selectedServiceId) { setError(null); goNext(); } else setError("Please select a service"); }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Staff */}
          {step === 2 && (
            <div className="step-content">
              <h1 className="step-title">Choose a Specialist</h1>
              <p className="step-subtitle">Select your preferred technician</p>
              {loadingStaff ? (
                <p>Loading specialists...</p>
              ) : (
                <div className="staff-grid">
                  <div
                    onClick={() => { setSelectedStaffId("any"); setAssignedStaffId(""); setSelectedTime(""); }}
                    className={`staff-card ${selectedStaffId === "any" ? "selected" : ""}`}
                  >
                    <div className="staff-avatar">⭐</div>
                    <div className="staff-info">
                      <div className="staff-name">Any Available</div>
                      <div className="staff-role">First available specialist</div>
                    </div>
                    {selectedStaffId === "any" && <span className="checkmark">✓</span>}
                  </div>
                  {staff.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => { setSelectedStaffId(member.id); setAssignedStaffId(""); setSelectedTime(""); }}
                      className={`staff-card ${selectedStaffId === member.id ? "selected" : ""}`}
                    >
                      <div className="staff-avatar">{member.name.charAt(0)}</div>
                      <div className="staff-info">
                        <div className="staff-name">{member.name}</div>
                        <div className="staff-role">{member.role || "Nail Technician"}</div>
                      </div>
                      {selectedStaffId === member.id && <span className="checkmark">✓</span>}
                    </div>
                  ))}
                </div>
              )}
              <div className="actions">
                <button className="btn-secondary" onClick={goBack}>Back</button>
                <button className="btn-primary" onClick={() => { if (selectedStaffId) { setError(null); goNext(); } else setError("Please select a specialist"); }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Date & Time */}
          {step === 3 && (
            <div className="step-content">
              <h1 className="step-title">Pick Date & Time</h1>
              <p className="step-subtitle">Choose when you'd like to visit</p>
              
              <div className="date-section">
                <label className="label">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); setAssignedStaffId(""); }}
                  min={new Date().toISOString().split("T")[0]}
                  className="date-input"
                />
              </div>

              {loadingHours ? (
                <p>Loading times...</p>
              ) : timeSlots.length === 0 ? (
                <div className="no-slots">No available times on this date</div>
              ) : (
                <div className="time-section">
                  <label className="label">Available Times</label>
                  <div className="time-grid">
                    {timeSlots.map((time) => {
                      const isPast = isTimeSlotPast(time);
                      return (
                        <button
                          key={time}
                          disabled={isPast}
                          onClick={() => !isPast && handleTimeSelect(time)}
                          className={`time-slot ${selectedTime === time ? "selected" : ""} ${isPast ? "past" : ""}`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {isAnyStaff && assignedStaffId && selectedTime && (
                <div className="assigned-note">
                  ✓ {staff.find(s => s.id === assignedStaffId)?.name} will be your specialist
                </div>
              )}

              <div className="actions">
                <button className="btn-secondary" onClick={goBack}>Back</button>
                <button className="btn-primary" onClick={() => { if (selectedTime) { setError(null); goNext(); } else setError("Please select a time"); }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Details */}
          {step === 4 && (
            <div className="step-content">
              <h1 className="step-title">Your Details</h1>
              <p className="step-subtitle">We'll send your confirmation here</p>
              
              <form onSubmit={handleSubmit} className="form">
                <div className="form-group">
                  <label className="label">Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                    className="input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Phone Number</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="07xxx xxxxxx"
                    className="input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input"
                    required
                  />
                </div>
                <div className="actions">
                  <button type="button" className="btn-secondary" onClick={goBack}>Back</button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? "Booking..." : "Confirm Booking"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <div className="step-content">
              <div className="success-box">
                <div className="success-icon">✓</div>
                <h1 className="success-title">You're all set!</h1>
                <p className="success-text">Your appointment has been confirmed</p>
                
                <div className="confirm-card">
                  <div className="confirm-row">
                    <span className="confirm-label">Service</span>
                    <span className="confirm-value">{currentService?.name}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="confirm-label">Specialist</span>
                    <span className="confirm-value">{currentStaff?.name}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="confirm-label">Date & Time</span>
                    <span className="confirm-value">
                      {selectedDate && selectedTime && new Date(`${selectedDate}T${selectedTime}`).toLocaleString("en-GB", {
                        weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div className="confirm-row">
                    <span className="confirm-label">Booking ID</span>
                    <span className="confirm-value">{successAppointmentId?.slice(0, 8).toUpperCase()}</span>
                  </div>
                </div>

                <p className="email-note">�� Confirmation sent to {customerEmail}</p>

                <button
                  className="btn-primary"
                  onClick={() => {
                    setStep(1);
                    setSelectedServiceId("");
                    setSelectedStaffId("");
                    setSelectedDate(new Date().toISOString().split("T")[0]);
                    setSelectedTime("");
                    setAssignedStaffId("");
                    setCustomerName("");
                    setCustomerPhone("");
                    setCustomerEmail("");
                    setSuccessAppointmentId(null);
                  }}
                >
                  Book Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const responsiveStyles = `
  * { box-sizing: border-box; }
  
  .booking-page {
    min-height: 100vh;
    background-color: #0f172a;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: #94a3b8;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255,255,255,0.2);
    border-top: 4px solid #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .mobile-header {
    display: none;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    padding: 16px 20px;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .mobile-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  
  .mobile-logo .logo-icon {
    width: 32px;
    height: 32px;
    background: rgba(255,255,255,0.2);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 16px;
  }
  
  .mobile-logo .logo-text {
    color: #fff;
    font-size: 18px;
    font-weight: 600;
  }
  
  .mobile-steps {
    color: rgba(255,255,255,0.8);
    font-size: 13px;
  }
  
  .container {
    display: flex;
    min-height: 100vh;
  }
  
  .left-panel {
    width: 320px;
    background-color: #1e293b;
    padding: 32px;
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    overflow-y: auto;
  }
  
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 48px;
  }
  
  .logo {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 18px;
  }
  
  .brand-name {
    color: #fff;
    font-size: 18px;
    font-weight: 600;
  }
  
  .progress-list {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  
  .progress-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    opacity: 0.4;
    transition: opacity 0.3s ease;
  }
  
  .progress-item.active { opacity: 1; }
  
  .progress-num {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
  }
  
  .progress-num.done { background: #10b981; }
  .progress-num.current { background: #6366f1; }
  
  .progress-label {
    color: #fff;
    font-size: 14px;
    font-weight: 600;
  }
  
  .progress-desc {
    color: #94a3b8;
    font-size: 12px;
    margin-top: 2px;
  }
  
  .summary {
    margin-top: auto;
    padding: 20px;
    background: rgba(255,255,255,0.05);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
  }
  
  .summary-title {
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 16px;
  }
  
  .summary-item {
    color: #fff;
    font-size: 14px;
    margin-bottom: 12px;
  }
  
  .right-panel {
    flex: 1;
    margin-left: 320px;
    background-color: #fff;
    border-radius: 24px 0 0 24px;
    padding: 48px;
    min-height: 100vh;
  }
  
  .step-content {
    max-width: 560px;
    margin: 0 auto;
  }
  
  .step-title {
    font-size: 28px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8px;
    letter-spacing: -0.5px;
  }
  
  .step-subtitle {
    font-size: 15px;
    color: #64748b;
    margin: 0 0 32px;
  }
  
  .service-grid, .staff-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .service-card, .staff-card {
    padding: 20px;
    border-radius: 12px;
    border: 2px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.15s ease;
    background: #fff;
  }
  
  .service-card.selected, .staff-card.selected {
    border-color: #6366f1;
    background: #f5f3ff;
  }
  
  .service-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .service-name {
    font-size: 17px;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
  }
  
  .checkmark {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: #6366f1;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }
  
  .service-meta {
    display: flex;
    gap: 16px;
  }
  
  .duration { font-size: 14px; color: #64748b; }
  .price { font-size: 16px; font-weight: 700; color: #059669; }
  
  .staff-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
  }
  
  .staff-avatar {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 600;
    flex-shrink: 0;
  }
  
  .staff-info { flex: 1; }
  .staff-name { font-size: 16px; font-weight: 600; color: #0f172a; }
  .staff-role { font-size: 14px; color: #64748b; }
  
  .date-section { margin-bottom: 24px; }
  
  .label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }
  
  .date-input, .input {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    font-size: 16px;
    outline: none;
    transition: border-color 0.15s ease;
  }
  
  .date-input:focus, .input:focus {
    border-color: #6366f1;
  }
  
  .time-section { margin-bottom: 24px; }
  
  .time-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  
  .time-slot {
    padding: 12px 8px;
    border-radius: 8px;
    border: 2px solid #e2e8f0;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s ease;
    background: #fff;
    color: #1e293b;
  }
  
  .time-slot.selected {
    border-color: #6366f1;
    background: #6366f1;
    color: #fff;
  }
  
  .time-slot.past {
    background: #f1f5f9;
    color: #94a3b8;
    cursor: not-allowed;
  }
  
  .no-slots {
    padding: 24px;
    background: #fef2f2;
    border-radius: 10px;
    color: #dc2626;
    text-align: center;
  }
  
  .assigned-note {
    padding: 16px;
    background: #ecfdf5;
    border-radius: 10px;
    color: #059669;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 24px;
  }
  
  .form { display: flex; flex-direction: column; gap: 20px; }
  .form-group { }
  
  .actions {
    display: flex;
    gap: 12px;
    margin-top: 32px;
  }
  
  .btn-primary {
    flex: 1;
    padding: 16px 24px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
  }
  
  .btn-secondary {
    padding: 16px 24px;
    background: #fff;
    color: #475569;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
  }
  
  .error {
    padding: 16px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    color: #dc2626;
    font-size: 14px;
    margin-bottom: 24px;
  }
  
  .success-box { text-align: center; padding: 20px 0; }
  
  .success-icon {
    width: 80px;
    height: 80px;
    border-radius: 20px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #fff;
    font-size: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
  }
  
  .success-title {
    font-size: 26px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8px;
  }
  
  .success-text {
    font-size: 15px;
    color: #64748b;
    margin: 0 0 32px;
  }
  
  .confirm-card {
    background: #f8fafc;
    border-radius: 12px;
    padding: 20px;
    text-align: left;
    margin-bottom: 24px;
  }
  
  .confirm-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .confirm-row:last-child { border-bottom: none; }
  
  .confirm-label { font-size: 14px; color: #64748b; }
  .confirm-value { font-size: 14px; font-weight: 600; color: #0f172a; }
  
  .email-note {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 24px;
  }
  
  /* MOBILE RESPONSIVE */
  @media (max-width: 768px) {
    .mobile-header {
      display: block;
    }
    
    .left-panel {
      display: none;
    }
    
    .right-panel {
      margin-left: 0;
      border-radius: 0;
      padding: 24px 20px;
      min-height: calc(100vh - 80px);
    }
    
    .step-title {
      font-size: 24px;
    }
    
    .step-subtitle {
      font-size: 14px;
      margin-bottom: 24px;
    }
    
    .time-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    
    .actions {
      flex-direction: column-reverse;
    }
    
    .btn-secondary {
      width: 100%;
    }
    
    .service-name {
      font-size: 16px;
    }
    
    .staff-avatar {
      width: 40px;
      height: 40px;
      font-size: 16px;
    }
    
    .success-icon {
      width: 64px;
      height: 64px;
      font-size: 32px;
    }
    
    .success-title {
      font-size: 22px;
    }
  }
`;
