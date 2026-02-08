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

type Extra = {
  id: string;
  name: string;
  price: number;
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
  const [extras, setExtras] = useState<Extra[]>([]);
  const [salonInfo, setSalonInfo] = useState<{ name: string; address?: string; phone?: string } | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [servicesRes, staffRes, settingsRes, extrasRes] = await Promise.all([
        fetch("/api/services"),
        fetch("/api/staff"),
        fetch("/api/settings", { credentials: "include" }),
        fetch("/api/extras"),
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

      if (extrasRes.ok) {
        const data = await extrasRes.json();
        setExtras(Array.isArray(data) ? data : []);
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
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 600, color: "var(--ink)", margin: 0, fontFamily: "var(--font-heading)" }}>
          Receipts
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 6, fontFamily: "var(--font-body)" }}>
          Create receipts for walk-in customers
        </p>
      </div>

      {message && (
        <div style={{
          padding: 16,
          borderRadius: 12,
          marginBottom: 24,
          backgroundColor: message.type === "success" ? "var(--sage-light)" : "var(--rose-pale)",
          color: message.type === "success" ? "var(--sage)" : "var(--rose)",
          fontSize: 14,
          fontWeight: 500,
          fontFamily: "var(--font-body)",
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Left Column - Form */}
        <div style={{
          backgroundColor: "var(--white)",
          borderRadius: 16,
          padding: 28,
          border: "1px solid var(--cream-dark)",
          boxShadow: "var(--shadow-sm)"
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--ink)",
            marginTop: 0,
            marginBottom: 24,
            fontFamily: "var(--font-heading)"
          }}>
            Customer Details
          </h2>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block",
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 8,
              color: "var(--ink-light)",
              fontFamily: "var(--font-body)"
            }}>
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer"
              style={{
                width: "100%",
                padding: "14px 16px",
                backgroundColor: "var(--cream)",
                border: "1px solid var(--cream-dark)",
                borderRadius: 12,
                fontSize: 15,
                boxSizing: "border-box",
                color: "var(--ink)",
                fontFamily: "var(--font-body)",
                outline: "none",
                transition: "border-color 0.2s ease"
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: "block",
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 8,
              color: "var(--ink-light)",
              fontFamily: "var(--font-body)"
            }}>
              Customer Email (optional)
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@email.com"
              style={{
                width: "100%",
                padding: "14px 16px",
                backgroundColor: "var(--cream)",
                border: "1px solid var(--cream-dark)",
                borderRadius: 12,
                fontSize: 15,
                boxSizing: "border-box",
                color: "var(--ink)",
                fontFamily: "var(--font-body)",
                outline: "none"
              }}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: "block",
              fontSize: 14,
              fontWeight: 500,
              marginBottom: 8,
              color: "var(--ink-light)",
              fontFamily: "var(--font-body)"
            }}>
              Staff
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                backgroundColor: "var(--cream)",
                border: "1px solid var(--cream-dark)",
                borderRadius: 12,
                fontSize: 15,
                boxSizing: "border-box",
                color: "var(--ink)",
                fontFamily: "var(--font-body)",
                cursor: "pointer"
              }}
            >
              {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: 16,
            fontFamily: "var(--font-heading)"
          }}>
            Add Services
          </h3>

          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              style={{
                flex: 1,
                padding: "14px 16px",
                backgroundColor: "var(--cream)",
                border: "1px solid var(--cream-dark)",
                borderRadius: 12,
                fontSize: 15,
                color: "var(--ink)",
                fontFamily: "var(--font-body)"
              }}
            >
              <option value="">Select a service...</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} - £{s.price}</option>)}
            </select>
            <button
              onClick={addServiceAsItem}
              disabled={!selectedServiceId}
              style={{
                padding: "14px 24px",
                border: "none",
                borderRadius: 50,
                backgroundColor: selectedServiceId ? "var(--rose)" : "var(--cream-dark)",
                color: selectedServiceId ? "var(--white)" : "var(--ink-muted)",
                fontWeight: 600,
                fontSize: 14,
                cursor: selectedServiceId ? "pointer" : "not-allowed",
                fontFamily: "var(--font-body)",
                transition: "all 0.2s ease"
              }}
            >
              Add
            </button>
          </div>

          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: 16,
            fontFamily: "var(--font-heading)"
          }}>
            Add Extra / Custom Item
          </h3>

          {/* Quick Add Extras from Database */}
          {extras.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block",
                fontSize: 13,
                color: "var(--ink-muted)",
                marginBottom: 8,
                fontFamily: "var(--font-body)"
              }}>
                Quick Add Extras
              </label>
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
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  backgroundColor: "var(--cream)",
                  border: "1px solid var(--cream-dark)",
                  borderRadius: 12,
                  fontSize: 15,
                  color: "var(--ink)",
                  fontFamily: "var(--font-body)"
                }}
              >
                <option value="">Select an extra...</option>
                {extras.map(extra => (
                  <option key={extra.id} value={`${extra.name}|${extra.price}`}>
                    {extra.name} - £{extra.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Item Input */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block",
              fontSize: 13,
              color: "var(--ink-muted)",
              marginBottom: 8,
              fontFamily: "var(--font-body)"
            }}>
              Or Add Custom Item
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                placeholder="Item name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  backgroundColor: "var(--cream)",
                  border: "1px solid var(--cream-dark)",
                  borderRadius: 12,
                  fontSize: 15,
                  color: "var(--ink)",
                  fontFamily: "var(--font-body)"
                }}
              />
              <input
                type="number"
                placeholder="Price"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
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
                min="0"
                step="0.01"
              />
              <button
                onClick={addCustomItem}
                disabled={!newItemName.trim() || !newItemPrice}
                style={{
                  padding: "14px 24px",
                  border: "none",
                  borderRadius: 50,
                  backgroundColor: newItemName.trim() && newItemPrice ? "var(--sage)" : "var(--cream-dark)",
                  color: newItemName.trim() && newItemPrice ? "var(--white)" : "var(--ink-muted)",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: newItemName.trim() && newItemPrice ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-body)",
                  transition: "all 0.2s ease"
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Receipt Preview */}
        <div style={{
          backgroundColor: "var(--white)",
          borderRadius: 16,
          padding: 28,
          border: "1px solid var(--cream-dark)",
          boxShadow: "var(--shadow-sm)"
        }}>
          <h2 style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--ink)",
            marginTop: 0,
            marginBottom: 24,
            fontFamily: "var(--font-heading)"
          }}>
            Receipt Preview
          </h2>

          {/* Receipt Card */}
          <div style={{
            backgroundColor: "var(--cream)",
            borderRadius: 12,
            padding: 24,
            border: "1px solid var(--cream-dark)",
            minHeight: 300,
          }}>
            {/* Header */}
            <div style={{
              textAlign: "center",
              marginBottom: 20,
              paddingBottom: 20,
              borderBottom: "1px dashed var(--cream-dark)"
            }}>
              <div style={{
                fontSize: 20,
                fontWeight: 600,
                color: "var(--ink)",
                fontFamily: "var(--font-heading)"
              }}>
                {salonInfo?.name || "Salon"}
              </div>
              {salonInfo?.address && (
                <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 6, fontFamily: "var(--font-body)" }}>
                  {salonInfo.address}
                </div>
              )}
              {salonInfo?.phone && (
                <div style={{ fontSize: 13, color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                  Tel: {salonInfo.phone}
                </div>
              )}
            </div>

            {/* Customer Info */}
            <div style={{ marginBottom: 20, fontSize: 13, color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
              <div>Date: {new Date().toLocaleDateString("en-GB")}</div>
              {customerName && <div>Customer: {customerName}</div>}
              <div>Staff: {staffList.find(s => s.id === staffId)?.name || "-"}</div>
            </div>

            {/* Items */}
            {receiptItems.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "48px 0",
                color: "var(--ink-muted)",
                fontSize: 14,
                fontFamily: "var(--font-body)"
              }}>
                No items added yet
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                {receiptItems.map((item) => (
                  <div key={item.id} style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid var(--cream-dark)",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--ink)",
                        fontFamily: "var(--font-body)"
                      }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", fontFamily: "var(--font-body)" }}>
                        £{item.price.toFixed(2)} x {item.quantity}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        style={{
                          width: 28,
                          height: 28,
                          border: "1px solid var(--cream-dark)",
                          borderRadius: 8,
                          background: "var(--white)",
                          cursor: item.quantity > 1 ? "pointer" : "not-allowed",
                          fontSize: 14,
                          color: "var(--ink)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >-</button>
                      <span style={{
                        fontSize: 14,
                        fontWeight: 600,
                        minWidth: 24,
                        textAlign: "center",
                        color: "var(--ink)",
                        fontFamily: "var(--font-body)"
                      }}>{item.quantity}</span>
                      <button
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                        style={{
                          width: 28,
                          height: 28,
                          border: "1px solid var(--cream-dark)",
                          borderRadius: 8,
                          background: "var(--white)",
                          cursor: "pointer",
                          fontSize: 14,
                          color: "var(--ink)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >+</button>
                      <span style={{
                        fontSize: 14,
                        fontWeight: 600,
                        minWidth: 64,
                        textAlign: "right",
                        color: "var(--ink)",
                        fontFamily: "var(--font-body)"
                      }}>
                        £{(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        style={{
                          width: 28,
                          height: 28,
                          border: "none",
                          borderRadius: 8,
                          background: "var(--rose-pale)",
                          cursor: "pointer",
                          fontSize: 12,
                          color: "var(--rose)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
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
                padding: "20px 0 0",
                borderTop: "2px solid var(--ink)",
                marginTop: 12,
              }}>
                <span style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--ink)",
                  fontFamily: "var(--font-heading)"
                }}>TOTAL</span>
                <span style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--ink)",
                  fontFamily: "var(--font-heading)"
                }}>
                  £{calculateTotal().toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={previewReceipt}
                disabled={loading || receiptItems.length === 0}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  border: "1.5px solid var(--ink)",
                  borderRadius: 50,
                  backgroundColor: "var(--white)",
                  color: receiptItems.length > 0 ? "var(--ink)" : "var(--ink-muted)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: receiptItems.length > 0 ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-body)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: receiptItems.length === 0 ? 0.5 : 1,
                  transition: "all 0.2s ease"
                }}
              >
                Preview PDF
              </button>
              <button
                onClick={sendReceiptEmail}
                disabled={loading || receiptItems.length === 0 || !customerEmail}
                style={{
                  flex: 1,
                  padding: "14px 20px",
                  border: "none",
                  borderRadius: 50,
                  backgroundColor: receiptItems.length > 0 && customerEmail ? "var(--rose)" : "var(--cream-dark)",
                  color: receiptItems.length > 0 && customerEmail ? "var(--white)" : "var(--ink-muted)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: receiptItems.length > 0 && customerEmail ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-body)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.2s ease"
                }}
              >
                {loading ? "Sending..." : "Send Email"}
              </button>
            </div>
            {!customerEmail && receiptItems.length > 0 && (
              <p style={{
                fontSize: 13,
                color: "var(--ink-muted)",
                textAlign: "center",
                margin: "4px 0 0",
                fontFamily: "var(--font-body)"
              }}>
                Enter customer email to send receipt
              </p>
            )}
            <button
              onClick={clearForm}
              style={{
                padding: "12px 20px",
                border: "1.5px solid var(--ink)",
                borderRadius: 50,
                backgroundColor: "var(--white)",
                color: "var(--ink-light)",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                transition: "all 0.2s ease"
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
