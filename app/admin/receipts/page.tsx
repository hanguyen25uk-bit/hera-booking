"use client";

import { useState, useEffect } from "react";

type ReceiptItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Service = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
};

type Staff = {
  id: string;
  name: string;
};

export default function ReceiptsPage() {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [staffId, setStaffId] = useState("");
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [salonInfo, setSalonInfo] = useState<{ name: string; address?: string; phone?: string } | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [servicesRes, staffRes, settingsRes] = await Promise.all([
        fetch("/api/services"),
        fetch("/api/staff"),
        fetch("/api/settings", { credentials: "include" }),
      ]);

      if (servicesRes.ok) {
        const data = await servicesRes.json();
        setServices(Array.isArray(data) ? data : []);
      }

      if (staffRes.ok) {
        const data = await staffRes.json();
        setStaffList(Array.isArray(data) ? data : []);
        if (data.length > 0) setStaffId(data[0].id);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSalonInfo({
          name: data.salonName || "Salon",
          address: data.salonAddress,
          phone: data.salonPhone
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  function generateReceiptNumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RCP-${dateStr}-${random}`;
  }

  function addServiceAsItem() {
    if (!selectedServiceId) return;
    const service = services.find(s => s.id === selectedServiceId);
    if (!service) return;

    // Check if already added
    const existing = receiptItems.find(item => item.id === `service-${service.id}`);
    if (existing) {
      updateItemQuantity(existing.id, existing.quantity + 1);
      return;
    }

    setReceiptItems(prev => [...prev, {
      id: `service-${service.id}`,
      name: service.name,
      price: service.price,
      quantity: 1,
    }]);
    setSelectedServiceId("");
  }

  function addCustomItem() {
    if (!newItemName.trim() || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    if (isNaN(price) || price < 0) return;

    setReceiptItems(prev => [...prev, {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      price: price,
      quantity: 1,
    }]);
    setNewItemName("");
    setNewItemPrice("");
  }

  function removeItem(itemId: string) {
    setReceiptItems(prev => prev.filter(item => item.id !== itemId));
  }

  function updateItemQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    setReceiptItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ));
  }

  function calculateTotal() {
    return receiptItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  function clearForm() {
    setCustomerName("");
    setCustomerEmail("");
    setReceiptItems([]);
    setNewItemName("");
    setNewItemPrice("");
    setSelectedServiceId("");
    setMessage(null);
  }

  async function previewReceipt() {
    if (receiptItems.length === 0) {
      setMessage({ type: "error", text: "Please add at least one item" });
      return;
    }

    setLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: [80, 200] });

      const receiptNumber = generateReceiptNumber();
      const staffName = staffList.find(s => s.id === staffId)?.name || "Staff";
      let y = 10;

      // Header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(salonInfo?.name || "Salon", 40, y, { align: "center" });
      y += 5;

      if (salonInfo?.address) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(salonInfo.address, 40, y, { align: "center" });
        y += 4;
      }
      if (salonInfo?.phone) {
        doc.setFontSize(8);
        doc.text(`Tel: ${salonInfo.phone}`, 40, y, { align: "center" });
        y += 4;
      }

      // Divider
      y += 3;
      doc.setLineWidth(0.1);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, y, 75, y);
      y += 6;

      // Receipt title
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RECEIPT", 40, y, { align: "center" });
      y += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(receiptNumber, 40, y, { align: "center" });
      y += 6;

      // Date & Customer
      doc.setFontSize(8);
      doc.text(`Date: ${new Date().toLocaleDateString("en-GB")}`, 5, y);
      y += 4;
      doc.text(`Time: ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`, 5, y);
      y += 4;
      if (customerName) {
        doc.text(`Customer: ${customerName}`, 5, y);
        y += 4;
      }
      doc.text(`Staff: ${staffName}`, 5, y);
      y += 6;

      // Divider
      doc.line(5, y, 75, y);
      y += 4;

      // Items
      doc.setFont("helvetica", "bold");
      doc.text("Item", 5, y);
      doc.text("Qty", 45, y);
      doc.text("Price", 75, y, { align: "right" });
      y += 4;
      doc.setFont("helvetica", "normal");

      receiptItems.forEach(item => {
        const itemName = item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name;
        doc.text(itemName, 5, y);
        doc.text(item.quantity.toString(), 48, y);
        doc.text(`£${(item.price * item.quantity).toFixed(2)}`, 75, y, { align: "right" });
        y += 4;
      });

      // Total
      y += 2;
      doc.line(5, y, 75, y);
      y += 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", 5, y);
      doc.text(`£${calculateTotal().toFixed(2)}`, 75, y, { align: "right" });
      y += 8;

      // Footer
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Thank you for your visit!", 40, y, { align: "center" });
      y += 5;
      doc.setFontSize(7);
      doc.text(`Printed: ${new Date().toLocaleString("en-GB")}`, 40, y, { align: "center" });

      // Open in new window for preview
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
    } catch (error) {
      console.error("PDF generation error:", error);
      setMessage({ type: "error", text: "Failed to generate PDF" });
    } finally {
      setLoading(false);
    }
  }

  async function sendReceiptEmail() {
    if (!customerEmail) {
      setMessage({ type: "error", text: "Please enter customer email" });
      return;
    }
    if (receiptItems.length === 0) {
      setMessage({ type: "error", text: "Please add at least one item" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: [80, 200] });

      const receiptNumber = generateReceiptNumber();
      const staffName = staffList.find(s => s.id === staffId)?.name || "Staff";
      let y = 10;

      // Header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(salonInfo?.name || "Salon", 40, y, { align: "center" });
      y += 5;

      if (salonInfo?.address) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(salonInfo.address, 40, y, { align: "center" });
        y += 4;
      }
      if (salonInfo?.phone) {
        doc.setFontSize(8);
        doc.text(`Tel: ${salonInfo.phone}`, 40, y, { align: "center" });
        y += 4;
      }

      // Divider
      y += 3;
      doc.setLineWidth(0.1);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, y, 75, y);
      y += 6;

      // Receipt title
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RECEIPT", 40, y, { align: "center" });
      y += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(receiptNumber, 40, y, { align: "center" });
      y += 6;

      // Date & Customer
      doc.setFontSize(8);
      doc.text(`Date: ${new Date().toLocaleDateString("en-GB")}`, 5, y);
      y += 4;
      doc.text(`Time: ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`, 5, y);
      y += 4;
      if (customerName) {
        doc.text(`Customer: ${customerName}`, 5, y);
        y += 4;
      }
      doc.text(`Staff: ${staffName}`, 5, y);
      y += 6;

      // Divider
      doc.line(5, y, 75, y);
      y += 4;

      // Items
      doc.setFont("helvetica", "bold");
      doc.text("Item", 5, y);
      doc.text("Qty", 45, y);
      doc.text("Price", 75, y, { align: "right" });
      y += 4;
      doc.setFont("helvetica", "normal");

      receiptItems.forEach(item => {
        const itemName = item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name;
        doc.text(itemName, 5, y);
        doc.text(item.quantity.toString(), 48, y);
        doc.text(`£${(item.price * item.quantity).toFixed(2)}`, 75, y, { align: "right" });
        y += 4;
      });

      // Total
      y += 2;
      doc.line(5, y, 75, y);
      y += 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", 5, y);
      doc.text(`£${calculateTotal().toFixed(2)}`, 75, y, { align: "right" });
      y += 8;

      // Footer
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Thank you for your visit!", 40, y, { align: "center" });
      y += 5;
      doc.setFontSize(7);
      doc.text(`Printed: ${new Date().toLocaleString("en-GB")}`, 40, y, { align: "center" });

      // Get PDF as base64
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      // Send to API
      const res = await fetch("/api/receipts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customerEmail,
          customerName: customerName || "Customer",
          pdfBase64,
          receiptNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send receipt");
      }

      setMessage({ type: "success", text: `Receipt sent to ${customerEmail}` });
      // Clear form after successful send
      setTimeout(() => clearForm(), 2000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>Receipts</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>Create receipts for walk-in customers</p>
      </div>

      {message && (
        <div style={{
          padding: 16,
          borderRadius: 12,
          marginBottom: 24,
          backgroundColor: message.type === "success" ? "#ECFDF5" : "#FEF2F2",
          color: message.type === "success" ? "#059669" : "#DC2626",
          fontSize: 14,
          fontWeight: 500,
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Left Column - Form */}
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginTop: 0, marginBottom: 20 }}>Customer Details</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer"
              style={{ width: "100%", padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>Customer Email (optional)</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@email.com"
              style={{ width: "100%", padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6, color: "#374151" }}>Staff</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              style={{ width: "100%", padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
            >
              {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", marginBottom: 12 }}>Add Services</h3>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              style={{ flex: 1, padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}
            >
              <option value="">Select a service...</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} - £{s.price}</option>)}
            </select>
            <button
              onClick={addServiceAsItem}
              disabled={!selectedServiceId}
              style={{
                padding: "12px 20px",
                border: "none",
                borderRadius: 8,
                background: selectedServiceId ? "#6366F1" : "#E5E7EB",
                color: selectedServiceId ? "#FFFFFF" : "#9CA3AF",
                fontWeight: 600,
                cursor: selectedServiceId ? "pointer" : "not-allowed",
              }}
            >
              Add
            </button>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", marginBottom: 12 }}>Add Extra / Custom Item</h3>

          {/* Quick Add Recommended Items */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "#6B7280", marginBottom: 6 }}>Quick Add Extras</label>
            <select
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                const [name, price] = value.split("|");
                setReceiptItems(prev => {
                  const existing = prev.find(item => item.name === name);
                  if (existing) {
                    return prev.map(item => item.name === name ? { ...item, quantity: item.quantity + 1 } : item);
                  }
                  return [...prev, { id: `extra-${Date.now()}`, name, price: parseFloat(price), quantity: 1 }];
                });
                e.target.value = "";
              }}
              style={{ width: "100%", padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}
            >
              <option value="">Select an extra...</option>
              <option value="Chrome|8">Chrome - £8</option>
              <option value="Cat Eyes|10">Cat Eyes - £10</option>
              <option value="Nail Art (per nail)|5">Nail Art (per nail) - £5</option>
              <option value="Ombre / Spray|12">Ombre / Spray - £12</option>
              <option value="French Tips|8">French Tips - £8</option>
              <option value="Glitter|5">Glitter - £5</option>
              <option value="Gems / Stones|3">Gems / Stones - £3</option>
              <option value="Nail Repair|5">Nail Repair - £5</option>
              <option value="Nail Extension (per nail)|3">Nail Extension (per nail) - £3</option>
              <option value="Soak Off|5">Soak Off - £5</option>
            </select>
          </div>

          {/* Custom Item Input */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, color: "#6B7280", marginBottom: 6 }}>Or Add Custom Item</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Item name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                style={{ flex: 1, padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}
              />
              <input
                type="number"
                placeholder="Price"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                style={{ width: 100, padding: 12, border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}
                min="0"
                step="0.01"
              />
              <button
                onClick={addCustomItem}
                disabled={!newItemName.trim() || !newItemPrice}
                style={{
                  padding: "12px 20px",
                  border: "none",
                  borderRadius: 8,
                  background: newItemName.trim() && newItemPrice ? "#10B981" : "#E5E7EB",
                  color: newItemName.trim() && newItemPrice ? "#FFFFFF" : "#9CA3AF",
                  fontWeight: 600,
                  cursor: newItemName.trim() && newItemPrice ? "pointer" : "not-allowed",
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Receipt Preview */}
        <div style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginTop: 0, marginBottom: 20 }}>Receipt Preview</h2>

          {/* Receipt Card */}
          <div style={{
            backgroundColor: "#F8FAFC",
            borderRadius: 12,
            padding: 20,
            border: "1px solid #E2E8F0",
            minHeight: 300,
          }}>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 16, paddingBottom: 16, borderBottom: "1px dashed #CBD5E1" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>{salonInfo?.name || "Salon"}</div>
              {salonInfo?.address && <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{salonInfo.address}</div>}
              {salonInfo?.phone && <div style={{ fontSize: 12, color: "#64748B" }}>Tel: {salonInfo.phone}</div>}
            </div>

            {/* Customer Info */}
            <div style={{ marginBottom: 16, fontSize: 13, color: "#64748B" }}>
              <div>Date: {new Date().toLocaleDateString("en-GB")}</div>
              {customerName && <div>Customer: {customerName}</div>}
              <div>Staff: {staffList.find(s => s.id === staffId)?.name || "-"}</div>
            </div>

            {/* Items */}
            {receiptItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8", fontSize: 14 }}>
                No items added yet
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                {receiptItems.map((item) => (
                  <div key={item.id} style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid #E2E8F0",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>£{item.price.toFixed(2)} x {item.quantity}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        style={{ width: 24, height: 24, border: "1px solid #E5E7EB", borderRadius: 4, background: "#FFF", cursor: item.quantity > 1 ? "pointer" : "not-allowed", fontSize: 14 }}
                      >-</button>
                      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                      <button
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                        style={{ width: 24, height: 24, border: "1px solid #E5E7EB", borderRadius: 4, background: "#FFF", cursor: "pointer", fontSize: 14 }}
                      >+</button>
                      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 60, textAlign: "right" }}>£{(item.price * item.quantity).toFixed(2)}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        style={{ width: 24, height: 24, border: "none", borderRadius: 4, background: "#FEE2E2", cursor: "pointer", fontSize: 12, color: "#DC2626" }}
                      >x</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            {receiptItems.length > 0 && (
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "16px 0",
                borderTop: "2px solid #1E293B",
                marginTop: 8,
              }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>TOTAL</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#1E293B" }}>£{calculateTotal().toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={previewReceipt}
                disabled={loading || receiptItems.length === 0}
                style={{
                  flex: 1,
                  padding: 14,
                  border: "none",
                  borderRadius: 8,
                  background: receiptItems.length > 0 ? "#6366F1" : "#E5E7EB",
                  color: receiptItems.length > 0 ? "#FFFFFF" : "#9CA3AF",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: receiptItems.length > 0 ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>👁</span> Preview PDF
              </button>
              <button
                onClick={sendReceiptEmail}
                disabled={loading || receiptItems.length === 0 || !customerEmail}
                style={{
                  flex: 1,
                  padding: 14,
                  border: "none",
                  borderRadius: 8,
                  background: receiptItems.length > 0 && customerEmail ? "#10B981" : "#E5E7EB",
                  color: receiptItems.length > 0 && customerEmail ? "#FFFFFF" : "#9CA3AF",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: receiptItems.length > 0 && customerEmail ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>📧</span> {loading ? "Sending..." : "Send Email"}
              </button>
            </div>
            {!customerEmail && receiptItems.length > 0 && (
              <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", margin: "4px 0 0" }}>
                Enter customer email to send receipt
              </p>
            )}
            <button
              onClick={clearForm}
              style={{
                padding: 12,
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                background: "#FFFFFF",
                color: "#6B7280",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Clear & Start New
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
